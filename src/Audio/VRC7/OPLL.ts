import { BIT, InitializeTables, OPLL_EG_STATE, OPLL_TONE_NUM, PG_BITS, PG_WIDTH, SLOT_BD1, SLOT_CYM, SLOT_HH, SLOT_SD, SLOT_TOM, SLOT_UPDATE_FLAG, am_table, default_patch } from "./OPLL_CONST";
import { OPLL_PATCH } from "./OPLL_PATCH";
import { OPLL_RateConv } from "./OPLL_RateConv";
import { OPLL_SLOT } from "./OPLL_SLOT";

export class OPLL {
	clk: number;
	rate: number;

	chip_type: number = 0;

	adr: number = 0;

	inp_step: number = 0;
	out_step: number = 0;
	out_time: number = 0;

	reg = new Uint8Array(0x40);
	test_flag: number = 0;
	slot_key_status: number = 0;
	rhythm_mode: number = 0;

	eg_counter: number = 0;

	pm_phase: number = 0;
	am_phase: number = 0;

	lfo_am: number = 0;

	noise: number = 0;
	short_noise: number = 0;

	patch_number = new Int32Array(9);
	/**18 */
	slot: OPLL_SLOT[] = [];
	/**19 * 2 */
	patch: OPLL_PATCH[] = [];
	pan = new Uint8Array(16);
	/**[16][2] */
	pan_fine: number[][] = [];

	mask: number;

	/* channel output */
	/* 0..8:tone 9:bd 10:hh 11:sd 12:tom 13:cym */
	ch_out = new Int16Array(14);

	mix_out = new Int16Array(2);

	conv: OPLL_RateConv | null;

	constructor(clk: number, rate: number) {

		console.log(rate);
		
		let i;
		InitializeTables();

		for (i = 0; i < 19 * 2; i++)
			this.patch[i] = new OPLL_PATCH();

		this.clk = clk;
		this.rate = rate;
		this.mask = 0;
		this.conv = null;
		this.mix_out[0] = 0;
		this.mix_out[1] = 0;

		this.OPLL_reset();
		this.OPLL_setChipType(0);
		this.OPLL_resetPatch(0);
	}

	private slotOn(i: number) {
		let slot = this.slot[i];
		slot.key_flag = 1;
		slot.eg_state = OPLL_EG_STATE.DAMP;
		slot.request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
	}

	private slotOff(i: number) {
		let slot = this.slot[i];
		slot.key_flag = 0;
		if (slot.type & 1) {
			slot.eg_state = OPLL_EG_STATE.RELEASE;
			slot.request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
		}
	}

	private update_key_status() {
		let r14 = this.reg[0x0e];
		let rhythm_mode = BIT(r14, 5);
		let new_slot_key_status = 0;
		let updated_status;
		let ch;

		for (ch = 0; ch < 9; ch++)
			if (this.reg[0x20 + ch] & 0x10)
				new_slot_key_status |= 3 << (ch * 2);

		if (rhythm_mode) {
			if (r14 & 0x10)
				new_slot_key_status |= 3 << SLOT_BD1;

			if (r14 & 0x01)
				new_slot_key_status |= 1 << SLOT_HH;

			if (r14 & 0x08)
				new_slot_key_status |= 1 << SLOT_SD;

			if (r14 & 0x04)
				new_slot_key_status |= 1 << SLOT_TOM;

			if (r14 & 0x02)
				new_slot_key_status |= 1 << SLOT_CYM;
		}

		updated_status = this.slot_key_status ^ new_slot_key_status;

		if (updated_status) {
			let i;
			for (i = 0; i < 18; i++)
				if (BIT(updated_status, i)) {
					if (BIT(new_slot_key_status, i)) {
						this.slotOn(i);
					} else {
						this.slotOff(i);
					}
				}
		}

		this.slot_key_status = new_slot_key_status;
	}

	private set_patch(ch: number, num: number) {
		this.patch_number[ch] = num;

		let slot1 = this.MOD(ch);
		slot1.patch = this.patch[num * 2 + 0];

		let slot2 = this.CAR(ch);
		slot2.patch = this.patch[num * 2 + 1];

		slot1.request_update(SLOT_UPDATE_FLAG.UPDATE_ALL);
		slot2.request_update(SLOT_UPDATE_FLAG.UPDATE_ALL);
	}

	private set_sus_flag(ch: number, flag: number) {
		let slot1 = this.CAR(ch);
		let slot2 = this.MOD(ch);

		slot1.sus_flag = flag;
		slot1.request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
		if (slot2.type & 1) {
			slot2.sus_flag = flag;
			slot2.request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
		}
	}

	private set_volume(ch: number, volume: number) {
		let slot1 = this.CAR(ch);
		slot1.volume = volume;
		slot1.request_update(SLOT_UPDATE_FLAG.UPDATE_TLL);
	}

	private set_fnumber(ch: number, fnum: number) {
		let car = this.CAR(ch);
		let mod = this.MOD(ch);

		car.fnum = fnum;
		car.blk_fnum = (car.blk_fnum & 0xe00) | (fnum & 0x1ff);
		mod.fnum = fnum;
		mod.blk_fnum = (mod.blk_fnum & 0xe00) | (fnum & 0x1ff);
		car.request_update(SLOT_UPDATE_FLAG.UPDATE_EG | SLOT_UPDATE_FLAG.UPDATE_RKS | SLOT_UPDATE_FLAG.UPDATE_TLL);
		mod.request_update(SLOT_UPDATE_FLAG.UPDATE_EG | SLOT_UPDATE_FLAG.UPDATE_RKS | SLOT_UPDATE_FLAG.UPDATE_TLL);
	}

	private set_block(ch: number, blk: number) {
		let car = this.CAR(ch);
		let mod = this.MOD(ch);
		car.blk = blk;
		car.blk_fnum = ((blk & 7) << 9) | (car.blk_fnum & 0x1ff);
		mod.blk = blk;
		mod.blk_fnum = ((blk & 7) << 9) | (mod.blk_fnum & 0x1ff);
		car.request_update(SLOT_UPDATE_FLAG.UPDATE_EG | SLOT_UPDATE_FLAG.UPDATE_RKS | SLOT_UPDATE_FLAG.UPDATE_TLL);
		mod.request_update(SLOT_UPDATE_FLAG.UPDATE_EG | SLOT_UPDATE_FLAG.UPDATE_RKS | SLOT_UPDATE_FLAG.UPDATE_TLL);
	}

	private update_rhythm_mode() {
		const new_rhythm_mode = (this.reg[0x0e] >> 5) & 1;
		if (this.rhythm_mode !== new_rhythm_mode) {
			if (new_rhythm_mode) {
				this.slot[SLOT_HH].type = 3;
				this.slot[SLOT_HH].pg_keep = 1;
				this.slot[SLOT_SD].type = 3;
				this.slot[SLOT_TOM].type = 3;
				this.slot[SLOT_CYM].type = 3;
				this.slot[SLOT_CYM].pg_keep = 1;
				this.set_patch(6, 16);
				this.set_patch(7, 17);
				this.set_patch(8, 18);
				this.slot[SLOT_HH].set_slot_volume(((this.reg[0x37] >> 4) & 15) << 2);
				this.slot[SLOT_TOM].set_slot_volume(((this.reg[0x38] >> 4) & 15) << 2);
			} else {
				this.slot[SLOT_HH].type = 0;
				this.slot[SLOT_HH].pg_keep = 0;
				this.slot[SLOT_SD].type = 1;
				this.slot[SLOT_TOM].type = 0;
				this.slot[SLOT_CYM].type = 1;
				this.slot[SLOT_CYM].pg_keep = 0;
				this.set_patch(6, this.reg[0x36] >> 4);
				this.set_patch(7, this.reg[0x37] >> 4);
				this.set_patch(8, this.reg[0x38] >> 4);
			}
		}

		this.rhythm_mode = new_rhythm_mode;
	}

	private update_ampm() {
		if (this.test_flag & 2) {
			this.pm_phase = 0;
			this.am_phase = 0;
		} else {
			this.pm_phase += (this.test_flag & 8) ? 1024 : 1;
			this.am_phase += (this.test_flag & 8) ? 64 : 1;
		}
		this.lfo_am = am_table[(this.am_phase >> 6) % am_table.length];
	}

	private update_noise(cycle: number) {
		for (let i = 0; i < cycle; i++) {
			if (this.noise & 1) {
				this.noise ^= 0x800200;
			}
			this.noise >>= 1;
		}
	}

	private update_short_noise() {
		const pg_hh = this.slot[SLOT_HH].pg_out;
		const pg_cym = this.slot[SLOT_CYM].pg_out;

		const h_bit2 = BIT(pg_hh, PG_BITS - 8);
		const h_bit7 = BIT(pg_hh, PG_BITS - 3);
		const h_bit3 = BIT(pg_hh, PG_BITS - 7);

		const c_bit3 = BIT(pg_cym, PG_BITS - 7);
		const c_bit5 = BIT(pg_cym, PG_BITS - 5);

		this.short_noise = (h_bit2 ^ h_bit7) | (h_bit3 ^ c_bit5) | (c_bit3 ^ c_bit5);
	}

	private update_slots() {
		this.eg_counter++;

		for (let i = 0; i < 18; i++) {
			let slot = this.slot[i];
			let buddy = null;
			if (slot.type == 0) {
				buddy = this.slot[i + 1];
			}
			if (slot.type == 1) {
				buddy = this.slot[i - 1];
			}
			if (slot.update_requests) {
				slot.commit_slot_update();
			}
			slot.calc_envelope(buddy, this.eg_counter, this.test_flag & 1);
			slot.calc_phase(this.pm_phase, this.test_flag & 4);
		}
	}

	private calc_slot_car(ch: number, fm: number) {
		let slot = this.CAR(ch);

		let am = slot.patch.AM ? this.lfo_am : 0;

		slot.output[1] = slot.output[0];
		slot.output[0] = slot.to_linear(slot.wave_table[(slot.pg_out + 2 * (fm >> 1)) & (PG_WIDTH - 1)], am);

		return slot.output[0];
	}

	private calc_slot_mod(ch: number) {
		let slot = this.MOD(ch);

		let fm = slot.patch.FB > 0 ? (slot.output[1] + slot.output[0]) >> (9 - slot.patch.FB) : 0;
		let am = slot.patch.AM ? this.lfo_am : 0;

		slot.output[1] = slot.output[0];
		slot.output[0] = slot.to_linear(slot.wave_table[(slot.pg_out + fm) & (PG_WIDTH - 1)], am);

		return slot.output[0];
	}

	private calc_slot_tom() {
		let slot = this.MOD(8);

		return slot.to_linear(slot.wave_table[slot.pg_out], 0);
	}

	private calc_slot_snare() {
		let slot = this.CAR(7);

		let phase;

		if (BIT(slot.pg_out, PG_BITS - 2))
			phase = (this.noise & 1) ? _PD(0x300) : _PD(0x200);
		else
			phase = (this.noise & 1) ? _PD(0x0) : _PD(0x100);

		return slot.to_linear(slot.wave_table[phase], 0);
	}

	private calc_slot_cym() {
		let slot = this.CAR(8);

		let phase = this.short_noise ? _PD(0x300) : _PD(0x100);

		return slot.to_linear(slot.wave_table[phase], 0);
	}

	private calc_slot_hat() {
		let slot = this.MOD(7);

		let phase;

		if (this.short_noise)
			phase = (this.noise & 1) ? _PD(0x2d0) : _PD(0x234);
		else
			phase = (this.noise & 1) ? _PD(0x34) : _PD(0xd0);

		return slot.to_linear(slot.wave_table[phase], 0);
	}

	private update_output() {
		let i;

		this.update_ampm();
		this.update_short_noise();
		this.update_slots();

		let out = this.ch_out;

		/* CH1-6 */
		for (i = 0; i < 6; i++) {
			if (!(this.mask & OPLL_MASK_CH(i))) {
				out[i] = _MO(this.calc_slot_car(i, this.calc_slot_mod(i)));
			}
		}

		/* CH7 */
		if (!this.rhythm_mode) {
			if (!(this.mask & OPLL_MASK_CH(6))) {
				out[6] = _MO(this.calc_slot_car(6, this.calc_slot_mod(6)));
			}
		} else {
			if (!(this.mask & OPLL_MASK_BD)) {
				out[9] = _RO(this.calc_slot_car(6, this.calc_slot_mod(6)));
			}
		}
		this.update_noise(14);

		/* CH8 */
		if (!this.rhythm_mode) {
			if (!(this.mask & OPLL_MASK_CH(7))) {
				out[7] = _MO(this.calc_slot_car(7, this.calc_slot_mod(7)));
			}
		} else {
			if (!(this.mask & OPLL_MASK_HH)) {
				out[10] = _RO(this.calc_slot_hat());
			}
			if (!(this.mask & OPLL_MASK_SD)) {
				out[11] = _RO(this.calc_slot_snare());
			}
		}
		this.update_noise(2);

		/* CH9 */
		if (!this.rhythm_mode) {
			if (!(this.mask & OPLL_MASK_CH(8))) {
				out[8] = _MO(this.calc_slot_car(8, this.calc_slot_mod(8)));
			}
		} else {
			if (!(this.mask & OPLL_MASK_TOM)) {
				out[12] = _RO(this.calc_slot_tom());
			}
			if (!(this.mask & OPLL_MASK_CYM)) {
				out[13] = _RO(this.calc_slot_cym());
			}
		}
		this.update_noise(2);
	}

	private mix_output() {
		let out = 0;
		let i;
		for (i = 0; i < 14; i++) {
			out += this.ch_out[i];
		}
		if (this.conv) {
			this.conv.OPLL_RateConv_putData(0, out);
		} else {
			this.mix_out[0] = out;
		}
	}

	private mix_output_stereo() {
		let out = this.mix_out;
		let i;
		out[0] = out[1] = 0;
		for (i = 0; i < 14; i++) {
			if (this.pan[i] & 2)
				out[0] += this.ch_out[i] * this.pan_fine[i][0];
			if (this.pan[i] & 1)
				out[1] += this.ch_out[i] * this.pan_fine[i][1];
		}
		if (this.conv) {
			this.conv.OPLL_RateConv_putData(0, out[0]);
			this.conv.OPLL_RateConv_putData(1, out[1]);
		}
	}

	private MOD(ch: number) {
		return this.slot[ch << 1];
	}

	private CAR(ch: number) {
		return this.slot[(ch << 1) | 1];
	}

	/***********************************************************

				   External Interfaces

	***********************************************************/

	reset_rate_conversion_params() {
		const f_out = this.rate;
		const f_inp = this.clk / 72.0;

		this.out_time = 0;
		this.out_step = f_inp;
		this.inp_step = f_out;

		if (this.conv) {
			this.conv = null;
		}

		if (Math.floor(f_inp) != f_out && Math.floor(f_inp + 0.5) != f_out) {
			this.conv = new OPLL_RateConv(f_inp, f_out, 2);
		}

		if (this.conv) {
			this.conv.OPLL_RateConv_reset();
		}
	}

	OPLL_reset() {
		let i;

		this.adr = 0;

		this.pm_phase = 0;
		this.am_phase = 0;

		this.noise = 0x1;
		this.mask = 0;

		this.rhythm_mode = 0;
		this.slot_key_status = 0;
		this.eg_counter = 0;

		this.reset_rate_conversion_params();

		for (i = 0; i < 18; i++)
			this.slot[i] = new OPLL_SLOT(i);

		for (i = 0; i < 9; i++) {
			this.set_patch(i, 0);
		}

		for (i = 0; i < 0x40; i++)
			this.OPLL_writeReg(i, 0);

		for (i = 0; i < 15; i++) {
			this.pan[i] = 3;
			if (!this.pan_fine[i])
				this.pan_fine[i] = [];

			this.pan_fine[i][1] = this.pan_fine[i][0] = 1;
		}

		for (i = 0; i < 14; i++) {
			this.ch_out[i] = 0;
		}
	}

	OPLL_forceRefresh() {
		let i;

		for (i = 0; i < 9; i++) {
			this.set_patch(i, this.patch_number[i]);
		}

		for (i = 0; i < 18; i++) {
			this.slot[i].request_update(SLOT_UPDATE_FLAG.UPDATE_ALL);
		}
	}

	OPLL_setRate(rate: number) {
		this.rate = rate;
		this.reset_rate_conversion_params();
	}



	OPLL_setQuality(q: number) { }

	OPLL_setChipType(type: number) { this.chip_type = type; }

	OPLL_writeReg(reg: number, data: number) {
		let ch, i;

		if (reg >= 0x40)
			return;

		/* mirror registers */
		if ((0x19 <= reg && reg <= 0x1f) || (0x29 <= reg && reg <= 0x2f) || (0x39 <= reg && reg <= 0x3f)) {
			reg -= 9;
		}

		this.reg[reg] = data;

		switch (reg) {
			case 0x00:
				this.patch[0].AM = (data >> 7) & 1;
				this.patch[0].PM = (data >> 6) & 1;
				this.patch[0].EG = (data >> 5) & 1;
				this.patch[0].KR = (data >> 4) & 1;
				this.patch[0].ML = (data) & 15;
				for (i = 0; i < 9; i++) {
					if (this.patch_number[i] === 0) {
						this.MOD(i).request_update(SLOT_UPDATE_FLAG.UPDATE_RKS | SLOT_UPDATE_FLAG.UPDATE_EG);
					}
				}
				break;

			case 0x01:
				this.patch[1].AM = (data >> 7) & 1;
				this.patch[1].PM = (data >> 6) & 1;
				this.patch[1].EG = (data >> 5) & 1;
				this.patch[1].KR = (data >> 4) & 1;
				this.patch[1].ML = (data) & 15;
				for (i = 0; i < 9; i++) {
					if (this.patch_number[i] === 0) {
						this.CAR(i).request_update(SLOT_UPDATE_FLAG.UPDATE_RKS | SLOT_UPDATE_FLAG.UPDATE_EG);
					}
				}
				break;

			case 0x02:
				this.patch[0].KL = (data >> 6) & 3;
				this.patch[0].TL = (data) & 63;
				for (i = 0; i < 9; i++) {
					if (this.patch_number[i] == 0) {
						this.MOD(i).request_update(SLOT_UPDATE_FLAG.UPDATE_TLL);
					}
				}
				break;

			case 0x03:
				this.patch[1].KL = (data >> 6) & 3;
				this.patch[1].WS = (data >> 4) & 1;
				this.patch[0].WS = (data >> 3) & 1;
				this.patch[0].FB = (data) & 7;
				for (i = 0; i < 9; i++) {
					if (this.patch_number[i] === 0) {
						this.MOD(i).request_update(SLOT_UPDATE_FLAG.UPDATE_WS);
						this.CAR(i).request_update(SLOT_UPDATE_FLAG.UPDATE_WS | SLOT_UPDATE_FLAG.UPDATE_TLL);
					}
				}
				break;

			case 0x04:
				this.patch[0].AR = (data >> 4) & 15;
				this.patch[0].DR = (data) & 15;
				for (i = 0; i < 9; i++) {
					if (this.patch_number[i] === 0) {
						this.MOD(i).request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
					}
				}
				break;

			case 0x05:
				this.patch[1].AR = (data >> 4) & 15;
				this.patch[1].DR = (data) & 15;
				for (i = 0; i < 9; i++) {
					if (this.patch_number[i] === 0) {
						this.CAR(i).request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
					}
				}
				break;

			case 0x06:
				this.patch[0].SL = (data >> 4) & 15;
				this.patch[0].RR = (data) & 15;
				for (i = 0; i < 9; i++) {
					if (this.patch_number[i] === 0) {
						this.MOD(i).request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
					}
				}
				break;

			case 0x07:
				this.patch[1].SL = (data >> 4) & 15;
				this.patch[1].RR = (data) & 15;
				for (i = 0; i < 9; i++) {
					if (this.patch_number[i] === 0) {
						this.CAR(i).request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
					}
				}
				break;

			case 0x0e:
				if (this.chip_type === 1)
					break;
				this.update_rhythm_mode();
				this.update_key_status();
				break;

			case 0x0f:
				this.test_flag = data;
				break;

			case 0x10:
			case 0x11:
			case 0x12:
			case 0x13:
			case 0x14:
			case 0x15:
			case 0x16:
			case 0x17:
			case 0x18:
				ch = reg - 0x10;
				this.set_fnumber(ch, data + ((this.reg[0x20 + ch] & 1) << 8));
				break;

			case 0x20:
			case 0x21:
			case 0x22:
			case 0x23:
			case 0x24:
			case 0x25:
			case 0x26:
			case 0x27:
			case 0x28:
				ch = reg - 0x20;
				this.set_fnumber(ch, ((data & 1) << 8) + this.reg[0x10 + ch]);
				this.set_block(ch, (data >> 1) & 7);
				this.set_sus_flag(ch, (data >> 5) & 1);
				this.update_key_status();
				break;

			case 0x30:
			case 0x31:
			case 0x32:
			case 0x33:
			case 0x34:
			case 0x35:
			case 0x36:
			case 0x37:
			case 0x38:
				if ((this.reg[0x0e] & 32) && (reg >= 0x36)) {
					switch (reg) {
						case 0x37:
							this.MOD(7).set_slot_volume(((data >> 4) & 15) << 2);
							break;
						case 0x38:
							this.MOD(8).set_slot_volume(((data >> 4) & 15) << 2);
							break;
						default:
							break;
					}
				} else {
					this.set_patch(reg - 0x30, (data >> 4) & 15);
				}
				this.set_volume(reg - 0x30, (data & 15) << 2);
				break;

			default:
				break;
		}
	}

	OPLL_writeIO(adr: number, val: number) {
		if (adr & 1)
			this.OPLL_writeReg(this.adr, val);
		else
			this.adr = val;
	}

	OPLL_setPan(ch: number, pan: number) { this.pan[ch & 15] = pan; }

	OPLL_setPanFine(ch: number, pan: number[]) {
		this.pan_fine[ch & 15][0] = pan[0];
		this.pan_fine[ch & 15][1] = pan[1];
	}

	OPLL_setPatch(instrument: number[]) {
		let i;
		for (i = 0; i < 19; i++) {
			let patch: OPLL_PATCH[] = [new OPLL_PATCH(), new OPLL_PATCH()];
			OPLL_PATCH.OPLL_dumpToPatch(i * 8, instrument, patch);
			patch[0].CopyValue(this.patch[i * 2 + 0]);
			patch[1].CopyValue(this.patch[i * 2 + 1]);
		}
	}

	OPLL_resetPatch(type: number) {
		for (let i = 0; i < 19 * 2; i++)
			OPLL_PATCH.OPLL_copyPatch(this, i, default_patch[type % OPLL_TONE_NUM][i]);
	}

	OPLL_calc() {
		while (this.out_step > this.out_time) {
			this.out_time += this.inp_step;
			this.update_output();
			this.mix_output();
		}
		this.out_time -= this.out_step;
		if (this.conv) {
			this.mix_out[0] = this.conv.OPLL_RateConv_getData(0);
		}
		return this.mix_out[0];
	}

	OPLL_calcStereo(out: number[]) {
		while (this.out_step > this.out_time) {
			this.out_time += this.inp_step;
			this.update_output();
			this.mix_output_stereo();
		}
		this.out_time -= this.out_step;
		if (this.conv) {
			out[0] = this.conv.OPLL_RateConv_getData(0);
			out[1] = this.conv.OPLL_RateConv_getData(1);
		} else {
			out[0] = this.mix_out[0];
			out[1] = this.mix_out[1];
		}
	}

	OPLL_setMask(mask: number) {
		let ret = this.mask;
		this.mask = mask;
		return ret;
	}

	OPLL_toggleMask(mask: number) {
		let ret = this.mask;
		this.mask ^= mask;
		return ret;
	}
}

function OPLL_MASK_CH(x: number) { return 1 << x; }
const OPLL_MASK_HH = 1 << 9;
const OPLL_MASK_CYM = 1 << 10
const OPLL_MASK_TOM = 1 << 11;
const OPLL_MASK_SD = 1 << 12;
const OPLL_MASK_BD = 1 << 13;
const OPLL_MASK_RHYTHM = OPLL_MASK_HH | OPLL_MASK_CYM | OPLL_MASK_TOM | OPLL_MASK_SD | OPLL_MASK_BD;

function _PD(phase: number) { return (PG_BITS < 10) ? (phase >> (10 - PG_BITS)) : (phase << (PG_BITS - 10)); }
function _MO(x: number) { return -(x) >> 1; }
function _RO(x: number) { return x; }