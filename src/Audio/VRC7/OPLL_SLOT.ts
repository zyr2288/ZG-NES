import {
	DP_BASE_BITS, DP_WIDTH,
	EG_MAX, EG_MUTE, OPLL_EG_STATE, SLOT_UPDATE_FLAG,
	eg_step_tables, exp_table, ml_table, pm_table, rks_table, tll_table, wave_table_map
} from "./OPLL_CONST";
import { OPLL_PATCH } from "./OPLL_PATCH";

/* damper speed before key-on. key-scale affects. */
const DAMPER_RATE = 12;

export class OPLL_SLOT {
	number: number = 0;

	/* type flags:
	 * 000000SM
	 *       |+-- M: 0:modulator 1:carrier
	 *       +--- S: 0:normal 1:single slot mode (sd, tom, hh or cym)
	 */
	type: number = 0;

	patch: OPLL_PATCH = new OPLL_PATCH(); /* voice parameter */

	/* slot output */
	output: number[] = []; /* output value, latest and previous. */

	/* phase generator (pg) */
	wave_table: number[] = []; /* wave table */
	pg_phase = 0;    /* pg phase */
	pg_out = 0;      /* pg output, as index of wave table */
	pg_keep = 0;      /* if 1, pg_phase is preserved when key-on */
	blk_fnum = 0;    /* (block << 9) | f-number */
	fnum = 0;        /* f-number (9 bits) */
	blk = 0;          /* block (3 bits) */

	/* envelope generator (eg) */
	eg_state = 0;  /* current state */
	volume = 0;    /* current volume */
	key_flag = 0;  /* key-on flag 1:on 0:off */
	sus_flag = 0;  /* key-sus option 1:on 0:off */
	tll = 0;      /* total level + key scale level*/
	rks = 0;       /* key scale offset (rks) for eg speed */
	eg_rate_h = 0; /* eg speed rate high 4bits */
	eg_rate_l = 0; /* eg speed rate low 2bits */
	eg_shift = 0; /* shift for eg global counter, controls envelope speed */
	eg_out = 0;   /* eg output */

	update_requests = 0; /* flags to debounce update */

	constructor(number: number) {
		this.number = number;
		this.type = number % 2;
		this.pg_keep = 0;
		this.wave_table = wave_table_map[0];
		this.pg_phase = 0;
		this.output[0] = 0;
		this.output[1] = 0;
		this.eg_state = OPLL_EG_STATE.RELEASE;
		this.eg_shift = 0;
		this.rks = 0;
		this.tll = 0;
		this.key_flag = 0;
		this.sus_flag = 0;
		this.blk_fnum = 0;
		this.blk = 0;
		this.fnum = 0;
		this.volume = 0;
		this.pg_out = 0;
		this.eg_out = EG_MUTE;
		this.patch = new OPLL_PATCH();
	}

	get_parameter_rate() {
		if ((this.type & 1) === 0 && this.key_flag === 0)
			return 0;

		switch (this.eg_state) {
			case OPLL_EG_STATE.ATTACK:
				return this.patch.AR;
			case OPLL_EG_STATE.DECAY:
				return this.patch.DR;
			case OPLL_EG_STATE.SUSTAIN:
				return this.patch.EG ? 0 : this.patch.RR;
			case OPLL_EG_STATE.RELEASE:
				if (this.sus_flag) {
					return 5;
				} else if (this.patch.EG) {
					return this.patch.RR;
				} else {
					return 7;
				}
			case OPLL_EG_STATE.DAMP:
				return DAMPER_RATE;
			default:
				return 0;
		}
	}

	request_update(flag: SLOT_UPDATE_FLAG) { this.update_requests |= flag; }

	commit_slot_update() {
		if (this.update_requests & SLOT_UPDATE_FLAG.UPDATE_WS) {
			this.wave_table = wave_table_map[this.patch.WS];
		}

		if (this.update_requests & SLOT_UPDATE_FLAG.UPDATE_TLL) {
			if ((this.type & 1) == 0) {
				this.tll = tll_table[this.blk_fnum >> 5][this.patch.TL][this.patch.KL];
			} else {
				this.tll = tll_table[this.blk_fnum >> 5][this.volume][this.patch.KL];
			}
		}

		if (this.update_requests & SLOT_UPDATE_FLAG.UPDATE_RKS) {
			this.rks = rks_table[this.blk_fnum >> 8][this.patch.KR];
		}

		if (this.update_requests & (SLOT_UPDATE_FLAG.UPDATE_RKS | SLOT_UPDATE_FLAG.UPDATE_EG)) {
			let p_rate = this.get_parameter_rate();

			if (p_rate == 0) {
				this.eg_shift = 0;
				this.eg_rate_h = 0;
				this.eg_rate_l = 0;
				return;
			}

			this.eg_rate_h = Math.min(15, p_rate + (this.rks >> 2));
			this.eg_rate_l = this.rks & 3;
			if (this.eg_state === OPLL_EG_STATE.ATTACK) {
				this.eg_shift = (0 < this.eg_rate_h && this.eg_rate_h < 12) ? (13 - this.eg_rate_h) : 0;
			} else {
				this.eg_shift = (this.eg_rate_h < 13) ? (13 - this.eg_rate_h) : 0;
			}
		}

		this.update_requests = 0;
	}

	// reset_slot(number: number) {
	// 	this.number = number;
	// 	this.type = number % 2;
	// 	this.pg_keep = 0;
	// 	this.wave_table = wave_table_map[0];
	// 	this.pg_phase = 0;
	// 	this.output[0] = 0;
	// 	this.output[1] = 0;
	// 	this.eg_state = OPLL_EG_STATE.RELEASE;
	// 	this.eg_shift = 0;
	// 	this.rks = 0;
	// 	this.tll = 0;
	// 	this.key_flag = 0;
	// 	this.sus_flag = 0;
	// 	this.blk_fnum = 0;
	// 	this.blk = 0;
	// 	this.fnum = 0;
	// 	this.volume = 0;
	// 	this.pg_out = 0;
	// 	this.eg_out = EG_MUTE;
	// 	this.patch = new OPLL_PATCH();
	// }

	set_slot_volume(volume: number) {
		this.volume = volume;
		this.request_update(SLOT_UPDATE_FLAG.UPDATE_TLL);
	}

	calc_phase(pm_phase: number, reset: number) {
		const pm = this.patch.PM ? pm_table[(this.fnum >> 6) & 7][(pm_phase >> 10) & 7] : 0;
		if (reset) {
			this.pg_phase = 0;
		}
		this.pg_phase += (((this.fnum & 0x1ff) * 2 + pm) * ml_table[this.patch.ML]) << this.blk >> 2;
		this.pg_phase &= (DP_WIDTH - 1);
		this.pg_out = this.pg_phase >> DP_BASE_BITS;
	}

	lookup_attack_step(counter: number) {
		let index;
		switch (this.eg_rate_h) {
			case 12:
				index = (counter & 0xc) >> 1;
				return 4 - eg_step_tables[this.eg_rate_l][index];
			case 13:
				index = (counter & 0xc) >> 1;
				return 3 - eg_step_tables[this.eg_rate_l][index];
			case 14:
				index = (counter & 0xc) >> 1;
				return 2 - eg_step_tables[this.eg_rate_l][index];
			case 0:
			case 15:
				return 0;
			default:
				index = counter >> this.eg_shift;
				return eg_step_tables[this.eg_rate_l][index & 7] ? 4 : 0;
		}
	}

	lookup_decay_step(counter: number) {
		let index;
		switch (this.eg_rate_h) {
			case 0:
				return 0;
			case 13:
				index = ((counter & 0xc) >> 1) | (counter & 1);
				return eg_step_tables[this.eg_rate_l][index];
			case 14:
				index = ((counter & 0xc) >> 1);
				return eg_step_tables[this.eg_rate_l][index] + 1;
			case 15:
				return 2;
			default:
				index = counter >> this.eg_shift;
				return eg_step_tables[this.eg_rate_l][index & 7];
		}
	}

	start_envelope() {
		if (Math.min(15, this.patch.AR + (this.rks >> 2)) == 15) {
			this.eg_state = OPLL_EG_STATE.DECAY;
			this.eg_out = 0;
		} else {
			this.eg_state = OPLL_EG_STATE.ATTACK;
		}
		this.request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
	}

	calc_envelope(buddy: OPLL_SLOT | null, eg_counter: number, test: number) {

		let mask = (1 << this.eg_shift) - 1;
		let s;

		if (this.eg_state === OPLL_EG_STATE.ATTACK) {
			if (0 < this.eg_out && 0 < this.eg_rate_h && (eg_counter & mask & ~3) == 0) {
				s = this.lookup_attack_step(eg_counter);
				if (0 < s) {
					this.eg_out = Math.max(0, (Math.floor(this.eg_out) - (this.eg_out >> s) - 1));
				}
			}
		} else {
			if (this.eg_rate_h > 0 && (eg_counter & mask) == 0) {
				this.eg_out = Math.min(EG_MUTE, this.eg_out + this.lookup_decay_step(eg_counter));
			}
		}

		switch (this.eg_state) {
			case OPLL_EG_STATE.DAMP:
				// DAMP to ATTACK transition is occured when the envelope reaches EG_MAX (max attenuation but it's not mute).
				// Do not forget to check (eg_counter & mask) == 0 to synchronize it with the progress of the envelope.
				if (this.eg_out >= EG_MAX && (eg_counter & mask) == 0) {
					this.start_envelope();
					if (this.type & 1) {
						if (!this.pg_keep) {
							this.pg_phase = 0;
						}
						if (buddy && !buddy.pg_keep) {
							buddy.pg_phase = 0;
						}
					}
				}
				break;

			case OPLL_EG_STATE.ATTACK:
				if (this.eg_out == 0) {
					this.eg_state = OPLL_EG_STATE.DECAY;
					this.request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
				}
				break;

			case OPLL_EG_STATE.DECAY:
				// DECAY to SUSTAIN transition must be checked at every cycle regardless of the conditions of the envelope rate and
				// counter. i.e. the transition is not synchronized with the progress of the envelope.
				if ((this.eg_out >> 3) === this.patch.SL) {
					this.eg_state = OPLL_EG_STATE.SUSTAIN;
					this.request_update(SLOT_UPDATE_FLAG.UPDATE_EG);
				}
				break;

			case OPLL_EG_STATE.SUSTAIN:
			case OPLL_EG_STATE.RELEASE:
			default:
				break;
		}

		if (test) {
			this.eg_out = 0;
		}
	}

	to_linear(h: number, am: number) {
		if (this.eg_out > EG_MAX)
			return 0;

		let att = Math.min(EG_MUTE, (this.eg_out + this.tll + am)) << 4;
		return this.lookup_exp_table(h + att);
	}

	lookup_exp_table(i: number) {
		/* from andete's expression */
		let t = exp_table[(i & 0xff) ^ 0xff] + 1024;
		let res = t >> ((i & 0x7f00) >> 8);
		return ((i & 0x8000) ? ~res : res) << 1;
	}
}