// // import { APUMixerZoom } from "../APUMixer";
// // import { BlipBuf } from "../BlipBuf";
// import { OPLL } from "./OPLL";

// const Clock = 3579545;
// const SampleRate = 3579545 / 72;
// const Period = 36;

// // const instrument = [
// // 	/* VRC7 presets from Nuke.YKT */
// // 	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
// // 	0x33, 0x01, 0x09, 0x0e, 0x94, 0x90, 0x40, 0x01,
// // 	0x13, 0x41, 0x0f, 0x0d, 0xce, 0xd3, 0x43, 0x13,
// // 	0x01, 0x12, 0x1b, 0x06, 0xff, 0xd2, 0x00, 0x32,
// // 	0x61, 0x61, 0x1b, 0x07, 0xaf, 0x63, 0x20, 0x28,
// // 	0x22, 0x21, 0x1e, 0x06, 0xf0, 0x76, 0x08, 0x28,
// // 	0x66, 0x21, 0x15, 0x00, 0x93, 0x94, 0x20, 0xf8,
// // 	0x21, 0x61, 0x1c, 0x07, 0x82, 0x81, 0x10, 0x17,
// // 	0x23, 0x21, 0x20, 0x1f, 0xc0, 0x71, 0x07, 0x47,
// // 	0x25, 0x31, 0x26, 0x05, 0x64, 0x41, 0x18, 0xf8,
// // 	0x17, 0x21, 0x28, 0x07, 0xff, 0x83, 0x02, 0xf8,
// // 	0x97, 0x81, 0x25, 0x07, 0xcf, 0xc8, 0x02, 0x14,
// // 	0x21, 0x21, 0x54, 0x0f, 0x80, 0x7f, 0x07, 0x07,
// // 	0x01, 0x01, 0x56, 0x03, 0xd3, 0xb2, 0x43, 0x58,
// // 	0x31, 0x21, 0x0c, 0x03, 0x82, 0xc0, 0x40, 0x07,
// // 	0x21, 0x01, 0x0c, 0x03, 0xd4, 0xd3, 0x40, 0x84,
// // 	0x04, 0x21, 0x28, 0x00, 0xdf, 0xf8, 0xff, 0xf8,
// // 	0x23, 0x22, 0x00, 0x00, 0xa8, 0xf8, 0xf8, 0xf8,
// // 	0x25, 0x18, 0x00, 0x00, 0xf8, 0xa9, 0xf8, 0x55
// // ];

// const instrument = [
// 	/* VRC7 presets from Nuke.YKT Base ON nsfplay */
// 	0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
// 	0x03, 0x21, 0x05, 0x06, 0xE8, 0x81, 0x42, 0x27,
// 	0x13, 0x41, 0x14, 0x0D, 0xD8, 0xF6, 0x23, 0x12,
// 	0x11, 0x11, 0x08, 0x08, 0xFA, 0xB2, 0x20, 0x12,
// 	0x31, 0x61, 0x0C, 0x07, 0xA8, 0x64, 0x61, 0x27,
// 	0x32, 0x21, 0x1E, 0x06, 0xE1, 0x76, 0x01, 0x28,
// 	0x02, 0x01, 0x06, 0x00, 0xA3, 0xE2, 0xF4, 0xF4,
// 	0x21, 0x61, 0x1D, 0x07, 0x82, 0x81, 0x11, 0x07,
// 	0x23, 0x21, 0x22, 0x17, 0xA2, 0x72, 0x01, 0x17,
// 	0x35, 0x11, 0x25, 0x00, 0x40, 0x73, 0x72, 0x01,
// 	0xB5, 0x01, 0x0F, 0x0F, 0xA8, 0xA5, 0x51, 0x02,
// 	0x17, 0xC1, 0x24, 0x07, 0xF8, 0xF8, 0x22, 0x12,
// 	0x71, 0x23, 0x11, 0x06, 0x65, 0x74, 0x18, 0x16,
// 	0x01, 0x02, 0xD3, 0x05, 0xC9, 0x95, 0x03, 0x02,
// 	0x61, 0x63, 0x0C, 0x00, 0x94, 0xC0, 0x33, 0xF6,
// 	0x21, 0x72, 0x0D, 0x00, 0xC1, 0xD5, 0x56, 0x06,
// 	0x01, 0x01, 0x18, 0x0F, 0xDF, 0xF8, 0x6A, 0x6D,
// 	0x01, 0x01, 0x00, 0x00, 0xC8, 0xD8, 0xA7, 0x68,
// 	0x05, 0x01, 0x00, 0x00, 0xF8, 0xAA, 0x59, 0x55,
// ];

// export class VRC7Mixer {

// 	private readonly blipBuf: BlipBuf;
// 	private readonly opll: OPLL;

// 	private timer = 0;
// 	private lastAmp = 0;

// 	constructor(blipBuf: BlipBuf, sampleRate: number) {
// 		this.blipBuf = blipBuf;
// 		this.opll = new OPLL(Clock, SampleRate);
// 		this.opll.OPLL_setChipType(1);
// 		this.opll.OPLL_setPatch(instrument);
// 		this.opll.OPLL_setMask(-0x3F);
// 		this.opll.OPLL_reset();
// 	}

// 	Reset() {
// 		this.opll.OPLL_reset();
// 	}

// 	WriteRegister(cpuClock: number, address: number, value: number) {
// 		switch (address) {
// 			case 0x9010:
// 				this.opll.OPLL_writeIO(0, value);
// 				break;
// 			case 0x9030:
// 				this.opll.OPLL_writeIO(1, value);
// 				break;
// 		}
// 	}

// 	RunUntil(cpuClock: number) {
// 		let amp;
// 		while (this.timer < cpuClock) {
// 			amp = this.opll.OPLL_calc();
// 			amp = this.UpdateAmp(amp);
// 			if (amp) {
// 				this.blipBuf.BlipAddDelta(this.timer, amp * APUMixerZoom.VRC7);
// 			}

// 			this.timer += Period;
// 		}
// 	}

// 	EndFrame(cpuClock: number) {
// 		this.RunUntil(cpuClock);
// 		this.timer %= Period;
// 	}

// 	private UpdateAmp(amp: number) {
// 		let delta = this.lastAmp - amp;
// 		this.lastAmp = amp;
// 		return delta;
// 	}
// }