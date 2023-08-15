import { Bus } from "../../Bus";
import { PulseTable } from "./2A03Const";
import { DPCM } from "./DPCM";
import { Pulse } from "./Pulse";

const NTSCStep = [3728.5, 7456.5, 11185.5, 14914.5, 18640.5];
const PALStep = [4156.5, 8313.5, 12469.5, 16626.5, 20782.5];

export class C2A03 {

	frameCounter = 0;
	mode = 4;
	irqEnable = true;
	interruptFlag = false;

	private clock = 0;
	private pulse1: Pulse;
	private pulse2: Pulse;
	private dpcm: DPCM;

	constructor(bus: Bus) {
		this.pulse1 = new Pulse(0);
		this.pulse2 = new Pulse(1);
		this.dpcm = new DPCM(bus);
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
			case 0x4015:
				this.pulse1.enable = (value & 1) !== 0;
				this.pulse2.enable = (value & 2) !== 0;

				this.interruptFlag = false;
				break;
			case 0x4017:
				this.mode = value >> 7;
				this.irqEnable = (value & 0x40) !== 0;
				break;
		}
	}

	Clock() {
		this.clock++;
		if (this.clock & 0x01) {
			this.pulse1.Clock();
			this.pulse2.Clock();
		}

		this.clock &= 0xFF;
	}

	GetOutput() {
		let value = PulseTable[this.pulse1.volume + this.pulse2.volume];
		return value;
	}

	private processFrameCounter(): void {
		if (this.mode === 0) { // 4 Step mode
			switch (this.frameCounter % 4) {
				case 0:
					this.processEnvelopeAndLinearCounter();
					break;
				case 1:
					// this.processLengthCounterAndSweep();
					this.processEnvelopeAndLinearCounter();
					break;
				case 2:
					this.processEnvelopeAndLinearCounter();
					break;
				case 3:
					this.triggerIRQ();
					this.processEnvelopeAndLinearCounter();
					break;
			}
		} else { // 5 Step mode
			switch (this.frameCounter % 5) {
				case 0:
					this.processEnvelopeAndLinearCounter();
					break;
				case 1:
					this.processEnvelopeAndLinearCounter();
					break;
				case 2:
					this.processEnvelopeAndLinearCounter();
					break;
				case 3:
					break;
				case 4:
					this.processEnvelopeAndLinearCounter();
					break;
			}
		}
	}

	private processEnvelopeAndLinearCounter(): void {
		this.pulse1.ProcessEnvelope();
		this.pulse2.ProcessEnvelope();

	}

	private triggerIRQ(): void {
		if (!this.irqEnable) {
			return;
		}

		this.interruptFlag = true;
		// this.interruptLine.irq();
	}
}