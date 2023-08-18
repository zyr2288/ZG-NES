import { Bus } from "../../Bus";
import { CPU_NTSC } from "../../NESConst";
import { BlipBuf } from "../BlipBuf";
import { PulseTable, TndTable } from "./2A03Const";
import { DPCM } from "./DPCM";
import { Noise } from "./Noise";
import { Pulse } from "./Pulse";
import { Triangle } from "./Triangle";

const NTSC_Step = [3728.5, 7456.5, 11185.5, 14914.5, 18640.5];
const PAL_Step = [4156.5, 8313.5, 12469.5, 16626.5, 20782.5];

// const Zoom = [0.00752, 0.00752, 0.00851, 0.00494, 0.00335];
const Zoom = [752, 752, 851, 494, 335];
// for (let i = 0; i < Zoom.length; i++)
// 	Zoom[i] *= 20000;

const FrameCounter = CPU_NTSC / 240;

export enum ChannelName { Pulse1, Pulse2, Triangle, Noise, DPCM }
export class C2A03 {

	irqEnable = true;
	interruptFlag = false;
	frameEnd = false;

	private clock = 0;
	private frameCounter = 0;
	private fourStepMode = 4;
	private stepLookupTable: number[] = [];

	private pulse1: Pulse;
	private pulse2: Pulse;
	private triangle: Triangle;
	private noise: Noise;
	private dpcm: DPCM;

	private bus: Bus;

	private lastAmps: number[] = [];

	constructor(bus: Bus) {
		this.bus = bus;
		this.pulse1 = new Pulse(this, 0);
		this.pulse2 = new Pulse(this, 1);
		this.triangle = new Triangle(this);
		this.noise = new Noise(this);
		this.dpcm = new DPCM(bus, this);
		this.stepLookupTable = NTSC_Step.map(value => value * 2);
	}

	Reset() {
		this.stepLookupTable = NTSC_Step.map(value => value * 2);
	}

	Clock() {
		this.clock++;
		if (this.clock & 0x01) {
			this.pulse1.ClockRate();
			this.pulse2.ClockRate();
			this.noise.ClockRate();
		}
		this.triangle.ClockRate();
		this.dpcm.ClockRate();

		this.ProcessFrameCounter();

	}

	WriteIO(address: number, value: number) {
		switch (address) {
			case 0x4000:
			case 0x4001:
			case 0x4002:
			case 0x4003:
				this.pulse1.WriteIO(address, value);
				break;
			case 0x4004:
			case 0x4005:
			case 0x4006:
			case 0x4007:
				this.pulse2.WriteIO(address, value);
				break;
			case 0x4008:
			// case 0x4009:
			case 0x400A:
			case 0x400B:
				this.triangle.WriteIO(address, value);
				break;
			case 0x400C:
			case 0x400D:
			case 0x400E:
			case 0x400F:
				this.noise.WriteIO(address, value);
				break;
			case 0x4010:
			case 0x4011:
			case 0x4012:
			case 0x4013:
				this.dpcm.WriteIO(address, value);
				break;
			case 0x4015:
				this.pulse1.enable = (value & 1) !== 0;
				this.pulse2.enable = (value & 2) !== 0;
				this.triangle.enable = (value & 4) !== 0;
				this.noise.enable = (value & 8) !== 0;
				this.dpcm.enable = (value & 0x10) !== 0;

				this.interruptFlag = false;
				break;
			case 0x4017:
				this.fourStepMode = (value & 0x80) === 0 ? 4 : 5;
				this.irqEnable = (value & 0x40) !== 0;
				break;
		}
	}

	// GetOutput() {
	// 	let value = PulseTable[this.pulse1.outValue + this.pulse2.outValue];
	// 	value += TndTable[3 * this.triangle.outValue + 2 * this.noise.outValue + this.dpcm.outValue];
	// 	return value;
	// }

	// Render() {
	// 	let value = 0.00752 * (this.pulse1.outValue + this.pulse2.outValue);
	// 	value += 0.00851 * this.triangle.outValue + 0.00494 * this.noise.outValue + 0.00335 * this.dpcm.outValue
	// 	value *= 50000;
	// 	return value;
	// }

	ResetDPCMAmp(value: number) {
		this.lastAmps[ChannelName.DPCM] = value;
	}

	EndFrame() {
		// this.frameCounter = 0;
		// this.clock = 0;
	}

	UpdateAmp(value: number, channel: ChannelName) {
		const delta = this.lastAmps[channel] - value;
		this.lastAmps[channel] = value;
		if (delta === 0)
			return;

		this.bus.apu.blipBuf.BlipAddDelta(this.bus.apu.clock, delta * Zoom[channel]);
	}

	private ProcessFrameCounter() {
		if (this.clock < this.stepLookupTable[this.frameCounter])
			return;

		let end = false;
		if (this.fourStepMode === 4) { // 4 Step mode
			switch (this.frameCounter) {
				case 0:
					this.ProcessEnvelopeAndLinearCounter();
					break;
				case 1:
					this.ProcessLengthCounterAndSweep();
					this.ProcessEnvelopeAndLinearCounter();
					break;
				case 2:
					this.ProcessEnvelopeAndLinearCounter();
					break;
				case 3:
					this.TriggerIRQ();
					this.ProcessLengthCounterAndSweep();
					this.ProcessEnvelopeAndLinearCounter();
					end = true;
					break;
			}
		} else { // 5 Step mode
			switch (this.frameCounter) {
				case 0:
					this.ProcessEnvelopeAndLinearCounter();
					break;
				case 1:
					this.ProcessEnvelopeAndLinearCounter();
					break;
				case 2:
					this.ProcessLengthCounterAndSweep();
					this.ProcessEnvelopeAndLinearCounter();
					break;
				case 3:
					break;
				case 4:
					this.ProcessLengthCounterAndSweep();
					this.ProcessEnvelopeAndLinearCounter();
					end = true;
					break;
			}
		}
		this.frameCounter++;
		if (end) {
			this.clock = 0;
			this.frameCounter = 0;
		}
	}

	private ProcessEnvelopeAndLinearCounter(): void {
		this.pulse1.ProcessEnvelope();
		this.pulse2.ProcessEnvelope();
		this.triangle.DoLinerClock();
		this.noise.ProcessEnvelope();
	}

	private ProcessLengthCounterAndSweep(): void {
		this.pulse1.ProcessLengthCounter();
		this.pulse1.ProcessSweep();

		this.pulse2.ProcessLengthCounter();
		this.pulse2.ProcessSweep();

		this.triangle.DoFrameClock();

		this.noise.ProcessLengthCounter();
	}

	private TriggerIRQ(): void {
		if (!this.irqEnable) {
			return;
		}

		this.interruptFlag = true;
		// this.interruptLine.irq();
	}
}