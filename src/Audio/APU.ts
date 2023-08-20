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
	clock = 0;

	private lastAmp = 0;
	private c2A03: C2A03;
	private readonly bus: Bus;

	private sampleRate: number;
	private sampleLength: number;


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
		this.c2A03.Reset();
	}

	Clock() {
		this.clock++;
		this.c2A03.Clock();

		// let value = this.c2A03.Render();
		// const delta = this.lastAmp - value;
		// if (delta !== 0) {
		// 	this.blipBuf.BlipAddDelta(this.clock, delta);
		// 	this.lastAmp = value;
		// }

		if (this.bus.endFrame) {
			this.EndFrame();
		}
	}

	WriteIO(address: number, value: number) {
		this.c2A03.WriteIO(address, value);
	}

	ReadBuffer() {
		this.out.length = this.blipBuf.BufAvail;
		const length = this.blipBuf.BufAvail;

		this.blipBuf.ReadSample(this.sampleLength, false);
		for (let i = 0; i < length; i++)
			this.out.buffer[i] = this.blipBuf.outBuffer[i];

	}

	EndFrame() {
		this.blipBuf.BlipEndFrame(this.bus.apu.clock);
		this.ReadBuffer();
		this.c2A03.EndFrame();
		this.bus.api.OnAudio?.(this.out);
		this.bus.apu.clock = 0;
	}
}