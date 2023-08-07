import { Bus } from "../Bus";
import { Sprite, Tile } from "./PPUBlock";

const AllSpriteCount = 64;
/**一行最多显示精灵数，-1为无限制 */
// const LineMaxSprite = 8;
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
	allSprite: Sprite[] = [];
	showSprite = new Int8Array(AllSpriteCount);

	/**扫描线 */
	scanLine = 0;
	/**PPU周期 */
	cycle = 0;
	mirrorType = MirrorType.FourScreen;

	nameTableMap = [0, 0, 0, 0];
	nameTableData: Uint8Array[] = [];

	paletteTable = new Uint8Array(0x20);

	//#region 2000属性
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
	}
	//#endregion 2000属性

	//#region 2001属性
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
	//#endregion 2001属性

	//#region 2002属性
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
	//#endregion 2002属性

	private ppuReadBuffer = 0;
	/**PPU internal registers */
	/**https://www.nesdev.org/wiki/PPU_scrolling */
	private register = {
		/**Current VRAM address (15 bits) 当前VRAM 地址，15位 */
		v: 0,
		/**Temporary VRAM address (15 bits); can also be thought of as the address of the top left onscreen tile. */
		t: 0,
		/**Fine X scroll (3 bits) X坐标卷轴 */
		x: 0,
		/**First or second write toggle (1 bit) 写入第一次或者是第二次的触发器*/
		w: 0
	};

	private nmiDelay = -1;

	private readonly bus: Bus;

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.ppu = this;

		for (let i = 0; i < this.nameTableData.length; i++) {
			this.nameTableData[i] = new Uint8Array(0x400);
		}
	}

	Reset() {
		this.Write_2000(0);
		this.Write_2001(0);
		this.showSprite.fill(-1);
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
				this.oamAddress = value;
				this.oamMemory[this.oamAddress & 0xFF] = value;
				this.oamAddress++;
				break;
			case 0x2004:
				break;
			case 0x2005:
				this.Write_2005(value);
				break;
			case 0x2006:
				this.Write_2006(value);
				break;
			case 0x2007:
				this.Write_2007(value);
				break;
			case 0x4014:
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
				data = this.Read_2002();
				break;
			case 0x2004:
				data = this.oamMemory[this.oamAddress];
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

	//#region PPU执行一个周期
	Clock() {
		// For odd frames, the cycle at the end of the scanline is skipped (this is done internally by jumping directly from (339,261) to (0,0)
		// However, this behavior can be bypassed by keeping rendering disabled until after this scanline has passed
		// if (this.scanLine === 261 && this.cycle === 339 && this.frame & 0x01 && (this.ppuMask.showBG || this.ppuMask.showSprite)) {
		// 	this.Cycle();
		// }

		this.Cycle();

		if (!this.ppuMask.showBG && !this.ppuMask.showSprite) {
			return;
		}

		// Scanline 0 - 239: visible lines
		if (0 <= this.scanLine && this.scanLine <= 239) {
			// Cycle 0: do nothing

			// Cycle 1 - 64: Clear secondary OAM
			if (1 === this.cycle) {
				// this.clearSecondaryOam();
			}

			// Cycle 65 - 256: Sprite evaluation for next scanline
			if (65 === this.cycle) {
				// this.evalSprite();
			}

			// Cycle 1 - 256: fetch NT, AT, tile
			if (1 <= this.cycle && this.cycle <= 256) {
				// this.shiftBackground();
				// this.renderPixel();
				// this.fetchTileRelatedData();
			}

			// Cycle 256
			if (this.cycle === 256) {
				// this.incrementVerticalPosition();
			}

			// Cycle 257
			if (this.cycle === 257) {
				// this.copyHorizontalBits();
			}

			// Cycle 257 - 320: Sprite fetches
			if (this.cycle === 257) {
				// this.fetchSprite();
			}

			// Cycle 321 - 336: fetch NT, AT, tile
			if (321 <= this.cycle && this.cycle <= 336) {
				// this.shiftBackground();
				// this.fetchTileRelatedData();
			}

			// Cycle 337 - 340: unused NT fetches
		}

		// Scanline 240 - 260: Do nothing

		// Scanline 261: pre render line
		if (this.scanLine === 261) {
			// Cycle 0: do nothing

			// Cycle 1 - 256: fetch NT, AT, tile
			if (1 <= this.cycle && this.cycle <= 256) {
				// this.shiftBackground();
				// this.fetchTileRelatedData();
			}

			// Cycle 256
			if (this.cycle === 256) {
				// this.incrementVerticalPosition();
			}

			// Cycle 257
			if (this.cycle === 257) {
				// this.copyHorizontalBits();
			}

			// Cycle 257 - 320: do nothing

			// Cycle 280
			if (this.cycle === 280) {
				// this.copyVerticalBits();
			}

			// Cycle 321 - 336: fetch NT, AT, tile
			if (321 <= this.cycle && this.cycle <= 336) {
				// this.shiftBackground();
				// this.fetchTileRelatedData();
			}
		}
	}
	//#endregion PPU执行一个周期

	/***** private *****/

	//#region 写入各个接口
	private Write_2000(value: number) {
		let temp = value & 3;
		this.ppuCTRL.baseNametable = BaseNametableAddress[temp];
		this.ppuCTRL.vramAddIncrement = (value & 0x4) === 0 ? 1 : 32;
		this.ppuCTRL.spritePattern = (value & 0x8) === 0 ? 0 : 0x1000;
		this.ppuCTRL.bgPattern = (value & 0x10) === 0 ? 0 : 0x1000;
		this.ppuCTRL.spriteSize = (value & 0x20) === 0 ? 8 : 0x10;
		this.ppuCTRL.ppuMSSelect = (value & 0x40) !== 0;
		this.ppuCTRL.nmiOpen = (value & 0x80) !== 0;

		this.register.t = (this.register.t & 0xF3FF) | (temp << 10);
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

	private Write_2005(value: number) {
		if (this.register.w) {
			this.register.t = (this.register.t & 0xFFE0) | (value >> 3);
			this.register.x = value & 0x07;
		} else {
			this.register.t = (this.register.t & 0x0C1F) | (value & 0x07) << 12 | (value & 0xF8) << 2;
		}

		this.register.w ^= 1;
	}

	private Write_2006(value: number) {
		if (this.register.w === 0) {
			this.register.t = (this.register.t & 0x80FF) | (value & 0x3F) << 8;
		} else {
			this.register.t = (this.register.t & 0xFF00) | value;
			this.register.v = this.register.t;
		}
		this.register.w ^= 1;
	}

	private Write_2007(value: number) {
		this.WriteByte(this.register.v, value);
		this.register.v += this.ppuCTRL.vramAddIncrement;
	}

	private Write_4014(value: number) {

	}
	//#endregion 写入各个接口

	//#region 读取各个接口
	private Read_2002() {
		this.register.w = 0;
		this.ppuStatus.verticalBlankStarted = false;
		return this.ppuStatusValue | (this.ppuReadBuffer & 0x1F);
	}

	private Read_2007() {
		let data = this.ReadByte(this.register.v)!;
		if (this.register.v < 0x3EFF) {
			let temp = this.ppuReadBuffer;
			this.ppuReadBuffer = data;
			data = temp;
		} else {
			this.ppuReadBuffer = this.ReadByte(this.register.v)!;
		}

		this.register.v += this.ppuCTRL.vramAddIncrement;
		this.register.v &= 0x7FFF;
		return data;
	}
	//#endregion 读取各个接口

	//#region 执行一个Cycle
	private Cycle() {
		if (this.ppuStatus.verticalBlankStarted && this.ppuCTRL.nmiOpen && this.nmiDelay-- === 0) {
			this.bus.cpu.NMI();
		}

		this.cycle++;
		if (this.cycle > 340) {
			this.cycle = 0;
			this.scanLine++;
			if (this.scanLine > 261) {
				this.scanLine = 0;
			}
		}

		if (this.scanLine === 241 && this.cycle === 1) {
			this.ppuStatus.verticalBlankStarted = true;

			if (this.ppuCTRL.nmiOpen) {
				this.nmiDelay = 15;
			}
		}

		if (this.scanLine === 261 && this.cycle === 1) {
			this.ppuStatus.verticalBlankStarted = false;
			this.ppuStatus.spriteZeroHit = false;
			this.ppuStatus.spriteOverflow = false;
		}

		if (this.ppuMask.showBG || this.ppuMask.showSprite) {
			this.bus.mapper.PPUClockEvent?.(this.scanLine, this.cycle);
		}
	}
	//#endregion 执行一个Cycle

	private DMACopy() {
		let index;
		for (let i = 0; i < 256; i++) {
			this.oamMemory[i] = this.bus.cpu.ram[i + this.oamAddress];
			if ((i & 3) === 0) {
				index = i / 4;
				let sprite = this.allSprite[i / 4];
				sprite.y = this.oamMemory[i];
			}
		}
	}

	private GetSprites() {
		if (!this.ppuMask.showSprite)
			return;

		let spriteCount = 0;
		for (let i = 0; i < AllSpriteCount; i++) {
			let sprite = this.allSprite[i];
			let yOffset = sprite.y + this.ppuCTRL.spriteSize;
			if (sprite.rendered || sprite.y > this.scanLine || yOffset <= this.scanLine)
				continue;

			if (spriteCount === 8) {
				this.ppuStatus.spriteOverflow = true;
				// break;
			}

			this.showSprite[spriteCount++] = i;
			if (yOffset === this.scanLine - 1)
				sprite.rendered = true;
		}
		if (spriteCount !== AllSpriteCount + 1)
			this.showSprite[spriteCount] = -1;
	}

	private RenderSprite() {
		if (!this.ppuMask.showSprite)
			return;


	}

	private ClearSecondaryOam() {

	}

	private RenderPixel() {
		const x = this.cycle - 1;
		const y = this.scanLine;

	}

	//#region 读取写入
	private ReadByte(address: number) {
		address &= 0x3FFF;
		if (address < 0x2000) {
			return this.bus.cartridge.mapper.ReadCHR(address);
		} else if (address < 0x3000) {

		} else if (address < 0x3F00) {

		} else {
			address &= 0x1F
			return this.paletteTable[address];
		}
	}

	private WriteByte(address: number, value: number) {
		address &= 0x3FFF;
		if (address < 0x2000) {
			this.bus.mapper.WriteCHR(address, value);
		} else if (address < 0x3000) {

		} else if (address < 0x3F00) {

		} else {
			address &= 0x1F;
			if ((address & 3) === 0)
				this.paletteTable[0x00] = value;
			else
				this.paletteTable[address] = value;
		}
	}
	//#endregion 读取写入
}