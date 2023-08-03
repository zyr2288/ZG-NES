import { Bus } from "../Bus";
import { Sprite, Tile } from "./PPUBlock";

const SpriteCount = 64;
/**一行最多显示精灵数，-1为无限制 */
const LineMaxSprite = 8;
const BaseNametableAddress = [0x2000, 0x2400, 0x2800, 0x2C00];

export enum MirrorType {
	Horizontal, Vertical, NT0, NT1, NT2, NT3, FourScreen
}

/**
 * 1个CPU周期 = 3个PPU周期
 * 一行扫描线有341个周期
 */
export class PPU {

	oamAddress = 0;
	oamMemory = new Uint8Array(256);

	/**是否显示精灵 */
	showSprite = false;
	/**扫描线 */
	scanLine = 0;
	/**PPU周期 */
	cycle = 0;
	mirrorType = MirrorType.FourScreen;


	nameTableMap = [0, 0, 0, 0];
	nameTableData: Uint8Array[] = [];

	useChrRam = false;
	colorTable = new Uint8Array(0x20);
	/**256 * 2个 Tile */
	chrRam: Tile[] = [];

	/**Controller ($2000) > write */
	private ppuCTRL = {
		/**Bit 0-1   Base nametable address (0 = $2000; 1 = $2400; 2 = $2800; 3 = $2C00) */
		baseNametable: 0x2000,
		/**Bit 2   VRAM address increment per CPU read/write of PPUDATA (0: add 1, going across; 1: add 32, going down) */
		vramAddIncrement: 1,
		/**Bit 3   Sprite pattern table address for 8x8 sprites (0: $0000; 1: $1000; ignored in 8x16 mode) */
		spritePattern: 0,
		/**Background pattern table address (0: $0000; 1: $1000) */
		bgPattern: 0,
		/**Sprite size (0: 8x8 pixels; 1: 8x16 pixels – see PPU [OAM#Byte](https://www.nesdev.org/wiki/PPU_OAM#Byte_1) 1) */
		spriteSize: 8,
		/**PU master/slave select (0: read backdrop from EXT pins; 1: output color on EXT pins) */
		ppuMSSelect: false,
		/**Generate an NMI at the start of the vertical blanking interval (0: off; 1: on) */
		nmiOpen: false,

		/**BIT 0   Add 256 to the X scroll position */
		x: 0,
		/**BIT 1   Add 240 to the Y scroll position*/
		y: 0
	}

	/**Mask ($2001) > write */
	private ppuMask = {
		/**Bit 0   Greyscale (0: normal color, 1: produce a greyscale display) */
		greyscale: false,
		/**Bit 1   1: Show background in leftmost 8 pixels of screen, 0: Hide */
		showBGInLeft: false,
		/**Bit 2   1: Show sprites in leftmost 8 pixels of screen, 0: Hide */
		showSpriteInLeft: false,
		/**Bit 3   1: Show background */
		showBG: false,
		/**Bit 4   1: Show sprites */
		showSprite: false,
		/**Emphasize red (green on PAL/Dendy) */
		emphasizeRed: false,
		/**Emphasize green (red on PAL/Dendy) */
		emphasizeGreen: false,
		/**Emphasize blue */
		emphasizeBlue: false,
	}

	/**Status ($2002) < read */
	private ppuStatus = {
		verticalBlankStarted: false,
		spriteZeroHit: false,
		spriteOverflow: false,
	}
	private get ppuStatusValue() {
		let result = 0;
		if (this.ppuStatus.verticalBlankStarted) result |= 0x80;
		if (this.ppuStatus.spriteZeroHit) result |= 0x40;
		if (this.ppuStatus.spriteOverflow) result |= 0x20;
		return result;
	}

	private ppuAddress = 0;
	private ppuWriteAddressHight = true;
	private ppuReadBuffer = 0;
	private readonly bus: Bus;

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.ppu = this;

		for (let i = 0; i < this.nameTableData.length; i++) {
			this.nameTableData[i] = new Uint8Array(0x400);
		}
	}

	//#region 写入
	/**写入 */
	Write(address: number, value: number) {
		switch (address) {
			case 0x2000:
				this.Write_2000(value);
				break;
			case 0x2001:
				this.Write_2001(value);
				break;
			case 0x2003:
				break;
			case 0x2004:
				break;
			case 0x2006:
				this.Write_2006(value);
				break;
			case 0x2007:
				this.Write_2007(value);
				break;
		}
	}
	//#endregion 写入

	//#region 读取
	/**读取 */
	Read(address: number) {
		let data: number = -1;
		switch (address) {
			case 0x2002:
				data = this.ppuStatusValue | (this.ppuReadBuffer & 0x1F);
				this.ppuStatus.verticalBlankStarted = false;
				this.ppuWriteAddressHight = true;
				break;
			case 0x2007:
				data = this.ppuReadBuffer;
				this.ppuReadBuffer = 0;
				break;
		}
		return data;
	}
	//#endregion 读取

	//#region 设定镜像
	/**设定镜像 */
	SetMirrorType(type: MirrorType) {
		this.mirrorType = type;
		switch (type) {
			case MirrorType.Horizontal:
				this.nameTableMap[0] = this.nameTableMap[1] = 0;
				this.nameTableMap[2] = this.nameTableMap[3] = 2;
				break;
			case MirrorType.Vertical:
				this.nameTableMap[0] = this.nameTableMap[2] = 0;
				this.nameTableMap[1] = this.nameTableMap[3] = 1;
				break;
			case MirrorType.NT0:
			case MirrorType.NT1:
			case MirrorType.NT2:
			case MirrorType.NT3:
				this.nameTableMap[0] = this.nameTableMap[1] = this.nameTableMap[2] = this.nameTableMap[3] = type - MirrorType.NT0;
				break;
			case MirrorType.FourScreen:
				this.nameTableMap[0] = 0;
				this.nameTableMap[1] = 1;
				this.nameTableMap[2] = 2;
				this.nameTableMap[3] = 3;
				break;
		}
	}
	//#endregion 设定镜像

	//#region 写入各个接口
	private Write_2000(value: number) {
		this.ppuCTRL.baseNametable = BaseNametableAddress[value & 3];
		this.ppuCTRL.vramAddIncrement = (value & 0x4) === 0 ? 1 : 32;
		this.ppuCTRL.spritePattern = (value & 0x8) === 0 ? 0 : 0x1000;
		this.ppuCTRL.bgPattern = (value & 0x10) === 0 ? 0 : 0x1000;
		this.ppuCTRL.spriteSize = (value & 0x20) === 0 ? 8 : 0x10;
		this.ppuCTRL.ppuMSSelect = (value & 0x40) !== 0;
		this.ppuCTRL.nmiOpen = (value & 0x80) !== 0;

		this.ppuCTRL.x = (value & 0x1) === 0 ? 0 : 256;
		this.ppuCTRL.y = (value & 0x2) === 0 ? 0 : 240;
	}

	private Write_2001(value: number) {
		this.ppuMask.greyscale = (value & 1) !== 0;
		this.ppuMask.showBGInLeft = (value & 2) !== 0;
		this.ppuMask.showSpriteInLeft = (value & 4) !== 0;
		this.ppuMask.showBG = (value & 8) !== 0;
		this.ppuMask.showSprite = (value & 0x10) !== 0;
		this.ppuMask.emphasizeRed = (value & 0x20) !== 0;
		this.ppuMask.emphasizeGreen = (value & 0x40) !== 0;
		this.ppuMask.emphasizeBlue = (value & 0x80) !== 0;
	}

	private Write_2006(value: number) {
		if (this.ppuWriteAddressHight) {
			this.ppuAddress = (this.ppuAddress & 0xFF) | (value << 8);
		} else {
			this.ppuAddress = (this.ppuAddress & 0xFF00) | value;
		}
	}

	private Write_2007(value: number) {
		if (this.ppuAddress < 0x2000) {
			if (this.chrRam)
				this.chrRam[this.ppuAddress >> 4].SetData(this.ppuAddress & 0xF, value);
		} else if (this.ppuAddress >= 0x3F00) {
			let address = this.ppuAddress & 0x1F;
			if (address === 0)
				this.colorTable[0x00] = this.colorTable[0x04] = this.colorTable[0x08] = this.colorTable[0x0C] = value;
			else if (address == 0x10)
				this.colorTable[0x10] = this.colorTable[0x14] = this.colorTable[0x18] = this.colorTable[0x1C] = value;
			else
				this.colorTable[address] = value;
		} else {
			let address = this.ppuAddress & 0x2FFF;
			let index = this.nameTableMap[(address >> 8) & 3];
			address = this.ppuAddress & 0x3FF;
			this.nameTableData[index][address] = value;
		}
		this.ppuAddress += this.ppuCTRL.vramAddIncrement;
	}
	//#endregion 写入各个接口

	private Clock() {
		if (this.scanLine === -1 && this.cycle === 1) {
			this.ppuStatus.verticalBlankStarted = false;
		}

		if (this.scanLine === 241 && this.cycle === 1) {
			this.ppuStatus.verticalBlankStarted = true;
		}
	}

	private DMACopy() {
		for (let i = 0; i < 256; i++)
			this.oamMemory[i] = this.bus.cpu.ram[i + this.oamAddress];
	}

	private SetSprites() {
		if (!this.showSprite)
			return;


	}

	private ClearSecondaryOam() {

	}
}