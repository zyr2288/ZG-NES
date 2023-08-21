import { Bus } from "../../Bus";
import { FrameCountLength } from "./2A03Const";
import { C2A03, ChannelName } from "./C2A03";

const NoiseWaveLengthLookup_NTSC = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
const NoiseWaveLengthLookup_PAL = [4, 8, 14, 30, 60, 88, 118, 148, 188, 236, 354, 472, 708, 944, 1890, 3778];

export class Noise {

	enable = false;
	outValue = 0; // 4bit

	private envelope = {
		/**恒定音量 (true): 使用包络的音量 (false): 使用恒定音量 */
		enable: false,
		/**是否循环 */
		loop: false,
		/**衰减率 */
		decayRate: 0,
		/**衰减计数器 */
		decayCounter: 0,
		/**包络音量 */
		volume: 0,
		/**音量值 */
		value: 0,
	};

	public lengthCounter = 0;

	private timer = 0;
	private timerMax = 0;
	private noiseTable = NoiseWaveLengthLookup_NTSC.map(value => value >> 1);
	/**随机数类型 (0=32767 bits, 1=93 bits) */
	private randomMode = 1;
	private shiftReg = 1;
	private readonly c2A03: C2A03;

	testValue = 0;

	constructor(c2A03: C2A03) {
		this.c2A03 = c2A03;
	}

	Reset() {
		this.shiftReg = 1;
	}

	ClockRate() {
		if (!this.enable)
			return;

		if (this.timer === 0) {
			this.timer = this.timerMax;
			this.Step();
		} else {
			this.timer--;
		}
	}

	WriteIO(address: number, value: number) {
		address &= 3;
		switch (address) {
			case 0:		// 0x400C
				this.envelope.loop = (value & 0x20) !== 0;
				this.envelope.enable = (value & 0x10) === 0;
				this.envelope.volume = 0xF;
				this.envelope.value = value & 0xF;
				this.envelope.decayRate = this.envelope.value;
				this.envelope.decayCounter = 0;
				this.testValue = value;
				break;
			case 2:		// 0x400E
				this.randomMode = (value & 8) === 0 ? 1 : 7;
				this.timerMax = this.noiseTable[value & 0x0F];
				this.timer = 0;
				break;
			case 3:
				this.lengthCounter = FrameCountLength[value >> 3];
				break;
		}
	}

	/**处理包络 */
	ProcessEnvelope() {
		if (!this.envelope.enable)
			return;

		if (--this.envelope.decayCounter < 0) {
			if (this.envelope.volume === 0) {
				if (this.envelope.loop)
					this.envelope.volume = 0xF;
			} else {
				this.envelope.volume--;
			}
			this.envelope.decayCounter = this.envelope.decayRate;
		}

	}

	/**处理长度计数器 */
	ProcessLengthCounter(): void {
		if (!this.envelope.loop && this.lengthCounter > 0) {
			this.lengthCounter--;
		}
	}


	private Step(): void {
		if (this.lengthCounter === 0)
			return;

		const temp = ((this.shiftReg >> this.randomMode) ^ this.shiftReg) & 0x1;
		this.shiftReg >>= 1;
		if (temp !== 0) {
			this.shiftReg |= 0x4000;
			this.outValue = 0;
		} else {
			this.outValue = this.envelope.enable ? this.envelope.volume : this.envelope.value;
		}
		this.c2A03.UpdateAmp(this.outValue, ChannelName.Noise);
	}
}
