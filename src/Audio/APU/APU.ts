import { Bus } from "../../Bus";
import { CPU_NTSC } from "../../NESConst";
import { C2A03 } from "./2A03/C2A03";
import { BlipBuf } from "./BlipBuf";

/**APU的选项 */
export interface APUOption {
	/**采样率 */
	sampleRate?: number;
}

export class APU {

	readonly blipBuf: BlipBuf;
	private lastAmp = 0;

	private c2A03: C2A03;
	private readonly bus: Bus;
	private clock = 0;
	private sampleRate: number;

	constructor(bus: Bus, option: APUOption) {
		this.bus = bus;
		this.bus.apu = this;

		this.sampleRate = option.sampleRate ?? 48000;

		this.blipBuf = new BlipBuf(this.sampleRate);
		this.c2A03 = new C2A03(bus);
	}

	Reset() {
		this.blipBuf.SetSampleRate(CPU_NTSC, this.sampleRate);
	}

	Clock() {
		this.clock++;

		this.c2A03.Clock();

		let value = this.c2A03.GetOutput();
		const delta = this.lastAmp - value;
		this.blipBuf.BlipAddDelta(this.clock, delta * 1000);
		this.lastAmp = value;

		if (this.bus.endFrame) {
			this.blipBuf.BlipEndFrame(CPU_NTSC);
		}
	}

	WriteIO(address: number, value: number) {
		if (address >= 0x4000 && address <= 0x4017) {
			this.c2A03.WriteIO(address, value);
			return;
		}
	}
}