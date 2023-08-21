import { FrameCountLength } from "./2A03Const";
import { C2A03 } from "./C2A03";

const DutyTable = [
	[0, 0, 0, 0, 0, 0, 0, 1],
	[0, 0, 0, 0, 0, 0, 1, 1],
	[0, 0, 0, 0, 1, 1, 1, 1],
	[1, 1, 1, 1, 1, 1, 0, 0],
];

export class Pulse {

	enable = false;
	outValue = 0;

	private duty = 0;
	private timer = 0;
	private timerMax = 0;

	/**频道0、频道1 */
	private channel;
	private counter = 0;
	private lengthCounter = 0;

	private envelope = {
		/**恒定音量 (true): 使用包络的音量 (false): 使用恒定音量 */
		enable: false,
		/**
		 * 当恒定音量(false)时，此为true时，length counter将被锁定
		 * 是否循环
		 * false: Disable Looping, stay at 0 on end of decay [ \_____ ]
		 * true: Enable Looping, restart decay at F          [ \\\\\\ ]
		 * 当loop时，不使用 length counter 
		 */
		loop: false,
		/**衰减率 */
		decayRate: 0,
		/**衰减计数器 */
		decayCounter: 0,
		/**包络音量 */
		volume: 0,
		value: 0,
	};

	/**变音器 */
	private sweep = {
		/**是否启用 */
		enable: false,
		/**更新频率 */
		counterMax: 0,
		/** (false): 增加 (true): 减少 */
		direction: false,
		shift: 0,
		counter: 0
	};

	private readonly c2A03: C2A03;

	constructor(c2A03: C2A03, channel: number) {
		this.c2A03 = c2A03;
		this.channel = channel;
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
			case 0:
				this.duty = value >> 6;
				this.envelope.loop = (value & 0x20) !== 0;
				this.envelope.enable = (value & 0x10) === 0;
				this.envelope.volume = 0xF;
				this.envelope.value = value & 0xF;
				this.envelope.decayRate = this.envelope.value;
				this.envelope.decayCounter = 0;
				break;
			case 1:
				this.sweep.enable = (value & 0x80) !== 0;
				this.sweep.counterMax = (value >> 4) & 7;
				this.sweep.direction = (value & 0x8) !== 0;
				this.sweep.shift = value & 7;
				this.sweep.counter = 0;
				break;
			case 2:
				this.timerMax = (this.timerMax & 0xFF00) | value;
				break;
			case 3:
				this.timerMax = ((this.timerMax & 0xFF) | (value << 8)) & 0x7FF;
				this.lengthCounter = FrameCountLength[value >> 3];
				this.timer = 0;
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

	/**处理变音器 */
	ProcessSweep(): void {
		if (!this.sweep.enable || this.sweep.shift === 0) {
			return;
		}

		if (--this.sweep.counter < 0) {
			this.sweep.counter = this.sweep.counterMax;
			// 1. A barrel shifter shifts the channel's 11-bit raw timer period right by the shift count, producing the change amount.
			// 2. If the negate flag is true, the change amount is made negative.
			// 3. The target period is the sum of the current period and the change amount.
			let change = this.timerMax >> this.sweep.shift;
			if (this.sweep.direction)
				change = -change;

			this.timerMax += change;

			// The two pulse channels have their adders' carry inputs wired differently,
			// which produces different results when each channel's change amount is made negative:
			//   - Pulse 1 adds the ones' complement (−c − 1). Making 20 negative produces a change amount of −21.
			//   - Pulse 2 adds the two's complement (−c). Making 20 negative produces a change amount of −20.
			if (this.channel === 1 && change <= 0) {
				this.timerMax--;
			}

		}
	}

	private Step() {
		// if (!this.enable || this.lengthCounter === 0 || this.timer < 8 || this.timer > 0x7FF) {
		if (this.lengthCounter === 0 || this.timer < 8 || DutyTable[this.duty][this.counter] === 0) {
			this.outValue = 0;
		} else {
			this.outValue = this.envelope.enable ? this.envelope.volume : this.envelope.value;
		}
		this.counter++;
		this.counter &= 0x7;
		this.c2A03.UpdateAmp(this.outValue, this.channel);
	}
}