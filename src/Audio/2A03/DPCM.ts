import { Bus } from "../../Bus";
import { C2A03, ChannelName } from "./C2A03";

const RateIndex_NTSC = [428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54];
const RateIndex_PAL = [398, 354, 316, 298, 276, 236, 210, 198, 176, 148, 132, 118, 98, 78, 66, 50];

export class DPCM {

	irqEnable = false;

	private _enable = false;
	private deltaData = 0;
	private timer = 0;
	private timerMax = 0;
	private dataBit = 0;
	private loop = false;
	private lookupTable = RateIndex_NTSC.map(value => value << 1);

	private nowLength = 0;
	private nowAddress = 0;

	private sampleLength = 0;
	private sampleAddress = 0;

	private currectData = 0;

	private readonly bus: Bus;
	private readonly c2A03: C2A03;

	constructor(bus: Bus, c2A03: C2A03) {
		this.c2A03 = c2A03;
		this.bus = bus;
	}

	set enable(value: boolean) {
		this._enable = value;
		if (value){
			this.dataBit = 0;
			this.c2A03.ResetDPCMAmp(0x3F);
		}
	}

	WriteIO(address: number, value: number) {
		address &= 3;
		switch (address) {
			case 0:		// 0x4010
				this.irqEnable = (value & 0x80) !== 0;
				this.loop = (value & 0x40) !== 0;
				this.timerMax = this.lookupTable[value & 0xF] >> 1;
				break;
			case 1:
				this.deltaData = value & 0x7F;
				this.c2A03.ResetDPCMAmp(0x3F);
				break;
			case 2:
				this.sampleAddress = (value << 6) + 0xC000;
				this.nowAddress = this.sampleAddress;
				break;
			case 3:
				this.sampleLength = (value << 4) + 1;
				this.nowLength = this.sampleLength;
				break;
		}
	}

	ClockRate() {
		if (!this._enable)
			return;

		if (--this.timer <= 0) {
			this.timer = this.timerMax;
			const amp = (this.currectData & 1) === 1 ? 2 : -2;
			this.deltaData += amp;
			if (this.deltaData < 0)
				this.deltaData = 0;
			else if (this.deltaData > 0x7F)
				this.deltaData = 0x7F;

			this.c2A03.UpdateAmp(this.deltaData, ChannelName.DPCM);
			this.currectData >>= 1;
			this.ReadData();
		}
	}


	/**返回True则不再读取数据 */
	private ReadData() {
		if (this.dataBit <= 0) {
			this.dataBit = 8;
			if (this.nowLength === 0 && this.loop) {
				this.nowAddress = this.sampleAddress;
				this.nowLength = this.sampleLength;
			} else if (this.nowLength > 0) {
				this.currectData = this.bus.ReadByte(this.nowAddress);
				this.bus.cpu.cycle += 2;
				this.nowLength--;
				if (++this.nowAddress > 0xFFFF)
					this.nowAddress = 0xC000;
			}
		}

		this.dataBit--;
	}
}