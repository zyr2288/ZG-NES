import { Bus } from "../Bus";
import { CPU_NTSC } from "../NESConst";
import { NESOption } from "../NESOption";
import { C2A03 } from "./2A03/C2A03";
import { BlipBuf } from "./BlipBuf";

export interface OutBuffer {
	buffer: Int16Array;
	length: number;
}

export class APU {

	readonly blipBuf: BlipBuf;

	out: OutBuffer;

	private lastAmp = 0;
	private c2A03: C2A03;
	private readonly bus: Bus;
	private clock = 0;

	private sampleRate: number;
	private sampleLength: number;

	private temp = 0;

	constructor(bus: Bus, option?: NESOption) {
		this.bus = bus;
		this.bus.apu = this;

		this.sampleRate = option?.sampleRate ?? 48000;
		this.sampleLength = option?.sampleLength ?? 1024;

		this.blipBuf = new BlipBuf(this.sampleRate);
		this.c2A03 = new C2A03(bus);

		// 应该没那么大，因为一帧取应该是 SampleRate / FPS
		this.out = { buffer: new Int16Array(this.sampleRate / 10), length: 0 };
	}

	Reset() {
		this.blipBuf.SetSampleRate(CPU_NTSC, this.sampleRate);
	}

	Clock() {
		this.clock++;

		this.c2A03.Clock();

		let value = this.c2A03.GetOutput();
		const delta = this.lastAmp - value;
		if (delta !== 0) {
			this.blipBuf.BlipAddDelta(this.clock, delta);
			this.lastAmp = value;
		}

		if (this.bus.endFrame) {
			this.blipBuf.BlipEndFrame(this.clock);
			this.ReadBuffer();
			this.bus.api.OnAudio?.(this.out);
			this.clock = 0;
		}
	}

	WriteIO(address: number, value: number) {
		if (address >= 0x4000 && address <= 0x4017) {
			this.c2A03.WriteIO(address, value);
			return;
		}
	}




	ReadBuffer() {
		this.out.length = this.blipBuf.BufAvail;
		const length = this.blipBuf.BufAvail;

		this.blipBuf.ReadSample(this.sampleLength, false);
		for (let i = 0; i < length; i++)
			this.out.buffer[i] = this.blipBuf.outBuffer[i];

	}
}