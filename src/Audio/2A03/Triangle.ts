import { BlipBuf } from "../BlipBuf";
import { FrameCountLength } from "./2A03Const";
import { C2A03, ChannelName } from "./C2A03";

const TriangleVolumeTable = [
	15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

const TriangleVolumeDelta = [
	0, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1, -1,
	0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1,
];

export class Triangle {
	enable = false;
	outValue = 0;

	private timer = 0;
	private timerMax = 0;

	/**设置为True后，长度计数器(lengthCounter)将停止 */
	private controlFlag = false;
	private linear = {
		counter: 0,
		counterMax: 0,
		reloadFlag: false,
	};

	private lengthCounter = 0;
	private stepIndex = 0;
	private lastAmp = 0;
	private readonly c2A03: C2A03;

	constructor(c2A03: C2A03) {
		this.c2A03 = c2A03;
	}

	WriteIO(address: number, value: number) {
		address &= 3;
		switch (address) {
			case 0:		// 0x4008
				this.controlFlag = (value & 0x80) !== 0;
				this.linear.counterMax = value & 0x7F;
				break;
			case 2:		// 0x400A
				this.timerMax = (this.timerMax & 0x700) | value;
				if (this.timerMax < 3)
					this.timerMax = 0;
				break;
			case 3:		// 0x400B
				// $400B	llll.lHHH	Length counter load and timer high (write)
				// bits 2-0	---- -HHH	Timer high 3 bits
				// Side effects	Sets the linear counter reload flag
				this.linear.reloadFlag = true;
				this.timerMax = this.timerMax & 0xFF | ((value & 7) << 8);
				if (this.enable)
					this.lengthCounter = FrameCountLength[value >> 3];
				break;
		}
	}

	ClockRate() {
		if (!this.enable || this.lengthCounter === 0 || this.linear.counter === 0)
			return;

		if (this.timer === 0) {
			this.timer = this.timerMax;
			const value = TriangleVolumeTable[this.stepIndex];
			this.c2A03.UpdateAmp(value, ChannelName.Triangle);
			// this.outValue = TriangleVolumeTable[this.stepIndex];
			this.stepIndex = (this.stepIndex + 1) & 0x1F;
		} else {
			this.timer--;
		}
	}

	DoFrameClock() {
		if (!this.controlFlag && this.lengthCounter > 0) {
			this.lengthCounter--;
		}
	}

	DoLinerClock() {
		if (this.linear.reloadFlag) {
			this.linear.counter = this.linear.counterMax;
		} else if (this.linear.counter > 0) {
			this.linear.counter--;
		}

		if (!this.controlFlag) {
			this.linear.reloadFlag = false;
		}
	}
}