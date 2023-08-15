import { DutyTable, LengthTable } from "./2A03Const";

export class Pulse {

	volume = 0;
	duty = 0;
	timer = 0;
	timerMax = 0;
	enable = false;

	private channel;
	private counter = 0;
	private lengthCounter = 0;

	private constantVolume = false;
	private envelope = { loop: false, value: 0, volume: 0, counter: 0 };
	private sweep = { enable: false, period: 0, negated: false, shift: 0, counter: 0 };


	constructor(channel: number) {
		this.channel = channel;
	}

	Clock() {
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
				this.constantVolume = (value & 0x10) !== 0;
				this.envelope.loop = (value & 0x20) !== 0;
				this.envelope.value = value & 0xF;
				this.envelope.volume = 0xF;
				this.envelope.counter = 0;
				break;
			case 1:
				this.sweep.enable = (value & 0x80) !== 0;
				this.sweep.period = (value >> 4) & 7;
				this.sweep.negated = (value & 0x8) !== 0;
				this.sweep.shift = value & 7;
				this.sweep.counter = 0;
				break;
			case 2:
				this.timerMax = (this.timerMax & 0xFF00) | value;
				break;
			case 3:
				this.timerMax = ((this.timerMax & 0xFF) | (value << 8)) & 0x7FF;
				this.lengthCounter = LengthTable[value >> 3];
				this.timer = 0;
				break;
		}
	}

	ProcessEnvelope() {
		if (this.constantVolume)
			return;

		if (this.envelope.counter % (this.envelope.value + 1) === 0) {
			if (this.envelope.volume === 0) {
				this.envelope.volume = this.envelope.loop ? 0xF : 0x0;
			} else {
				this.envelope.volume--;
			}
		}

		this.envelope.counter++;
	}

	ProcessLengthCounter(): void {
		if (!this.envelope.loop && this.lengthCounter > 0) {
			this.lengthCounter--;
		}
	}

	ProcessSweep(): void {
		if (!this.sweep.enable) {
			return;
		}

		if (this.sweep.counter % (this.sweep.period + 1) === 0) {
			// 1. A barrel shifter shifts the channel's 11-bit raw timer period right by the shift count, producing the change amount.
			// 2. If the negate flag is true, the change amount is made negative.
			// 3. The target period is the sum of the current period and the change amount.
			const changeAmount = this.sweep.negated ? -(this.timer >> this.sweep.shift) : this.timer >> this.sweep.shift;
			this.timer += changeAmount;

			// The two pulse channels have their adders' carry inputs wired differently,
			// which produces different results when each channel's change amount is made negative:
			//   - Pulse 1 adds the ones' complement (−c − 1). Making 20 negative produces a change amount of −21.
			//   - Pulse 2 adds the two's complement (−c). Making 20 negative produces a change amount of −20.
			if (this.channel === 1 && changeAmount <= 0) {
				this.timer--;
			}
		}

		this.sweep.counter++;
	}

	private Step() {
		this.counter++;
		// if (!this.enable || this.lengthCounter === 0 || this.timer < 8 || this.timer > 0x7FF) {
		if (!this.enable || this.lengthCounter === 0 || this.timer < 8) {
			this.volume = 0;
		} else if (this.constantVolume) {
			this.volume = this.envelope.value * DutyTable[this.duty][this.counter & 0x07];
		} else {
			this.volume = this.envelope.volume * DutyTable[this.duty][this.counter & 0x07];
		}
	}
}