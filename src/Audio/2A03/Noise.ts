import { LengthTable, NOISE_PEROID_TABLE as NoiseTable } from "./2A03Const";

export class Noise {

	private readonly NoiseWaveLengthLookup_NTSC = [4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068];
	private readonly NoiseWaveLengthLookup_PAL = [4, 8, 14, 30, 60, 88, 118, 148, 188, 236, 354, 472, 708, 944, 1890, 3778];

	enable = false;
	public volume = 0; // 4bit
	public lengthCounter = 0;

	private isLengthCounterHalt = false;
	private isConstantVolume = false;
	private envelopeValue = 0;
	private envelopeVolume = 0;
	private envelopeCounter = 0;

	private isLoopNoise = false;
	private noisePeriod = 0;

	private shiftReg = 1;
	private randomMode = false;

	private timer = 0;
	private timerMax = 0;
	private noiseTable = this.NoiseWaveLengthLookup_NTSC;


	Clock() {
		if (!this.enable)
			return;

		if (this.timer === 0) {
			this.timer = this.timerMax;
			this.Step();
		} else {

		}
	}

	public WriteIO(address: number, value: number) {
		address &= 3;
		switch (address) {
			case 0:
				this.isLengthCounterHalt = !!(value & 0x20);
				this.isConstantVolume = !!(value & 0x10);
				this.envelopeValue = value & 0x0F;

				this.envelopeVolume = 15;
				this.envelopeCounter = 0;
				break;
			case 2:
				this.isLoopNoise = !!(value & 0x80);
				this.noisePeriod = this.noiseTable[value & 0x0F];
				this.timer = 0;
				break;
			case 3:
				this.lengthCounter = LengthTable[value >> 3];
				break;
		}
	}

	private Step(): void {
		if (!this.enable || this.lengthCounter === 0) {
			this.volume = 0;
		}

		const temp = ((this.shiftReg << (this.randomMode ? 1 : 3)) ^ this.shiftReg) & 0x4000;
		if (temp != 0) {
			this.shiftReg |= 0x01;
			this.volume = 0;
		} else {
			this.volume = 1 * this.envelopeVolume;
		}
	}
}
