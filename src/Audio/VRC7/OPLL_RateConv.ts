import { _PI_ } from "./OPLL_CONST";

const LW = 16;

const SINC_RESO = 256
const SINC_AMP_BITS = 12;

function blackman(x: number) { return 0.42 - 0.5 * Math.cos(2 * _PI_ * x) + 0.08 * Math.cos(4 * _PI_ * x); }
function sinc(x: number) { return (x == 0.0 ? 1.0 : Math.sin(_PI_ * x) / (_PI_ * x)); }
function windowed_sinc(x: number) { return blackman(0.5 + 0.5 * x / (LW / 2)) * sinc(x); }

export class OPLL_RateConv {
	ch = 0;
	timer = 0;
	f_ratio = 0;
	sinc_table: Int16Array;
	buf: Int16Array[] = [];

	constructor(f_inp: number, f_out: number, ch: number) {
		this.ch = ch;
		this.f_ratio = f_inp / f_out;
		for (let i = 0; i < ch; i++) {
			this.buf[i] = new Int16Array(LW);
		}

		this.sinc_table = new Int16Array(SINC_RESO * LW);
		for (let i = 0; i < SINC_RESO * LW; i++) {
			const x = i / SINC_RESO;
			if (f_out < f_inp) {
				this.sinc_table[i] = Math.floor((1 << SINC_AMP_BITS) * windowed_sinc(x / this.f_ratio) / this.f_ratio);
			} else {
				this.sinc_table[i] = Math.floor((1 << SINC_AMP_BITS) * windowed_sinc(x));
			}
		}
	}

	OPLL_RateConv_reset() {
		this.timer = 0;
		for (let i = 0; i < this.ch; i++) {
			// memset(conv->buf[i], 0, sizeof(conv->buf[i][0]) * LW);
			this.buf[i] = new Int16Array(16);
		}
	}

	OPLL_RateConv_putData(ch: number, data: number) {
		let buf = this.buf[ch];
		for (let i = 0; i < LW - 1; i++) {
			buf[i] = buf[i + 1];
		}
		buf[LW - 1] = data;
	}

	OPLL_RateConv_getData(ch: number) {
		let buf = this.buf[ch];
		let sum = 0;
		let k;
		let dn;
		this.timer += this.f_ratio;
		dn = this.timer - Math.floor(this.timer);
		this.timer = dn;

		for (k = 0; k < LW; k++) {
			let x = (k - (LW / 2 - 1)) - dn;
			sum += buf[k] * lookup_sinc_table(this.sinc_table, x);
		}
		return sum >> SINC_AMP_BITS;
	}
}

export function lookup_sinc_table(table: Int16Array, x: number) {
	let index = Math.floor(x * SINC_RESO);
	if (index < 0)
		index = -index;
	return table[Math.min(SINC_RESO * LW / 2 - 1, index)];
}