import { Bus } from "../Bus";
import { BitValue, BitValueRev } from "../NESConst";
import { RenderSprite, Sprite, Tile } from "./PPUBlock";

const AllSpriteCount = 64;
/**一行最多显示精灵数，-1为无限制 */
const LineMaxSprite = 64;
const BaseNametableAddress = [0x2000, 0x2400, 0x2800, 0x2C00];

/**镜像类型 */
export enum MirrorType {
	/**横向 */
	Horizontal,
	/**纵向 */
	Vertical,
	/**单屏0 */
	NT0,
	/**单屏1 */
	NT1,
	/**单屏2 */
	NT2,
	/**单屏3 */
	NT3,
	/**四分屏 */
	FourScreen
}

/**
 * 1个CPU周期 = 3个PPU周期
 * 一行扫描线有341个周期
 */
export class PPU {

	oamAddress = 0;
	/**Object Attribute Memory */
	oam = new Uint8Array(256);

	/**secondaryOam，简化算法 */
	// secondaryOam: Sprite[] = [];
	secondarySpriteCount = 0;

	lineSpritePixels: RenderSprite[] = [];
	allSprite: Sprite[] = [];
	secondaryOamIndex = new Int8Array(AllSpriteCount);

	screenPixels = new Uint8Array(256 * 240);
	/**扫描线 */
	scanLine = 0;
	/**PPU周期 */
	cycle = 0;
	frame = 0;
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
		nmiEnable: false,
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
	private latchs = {
		nameTable: 0,
		attributeTable: 0, // 2bit
		lowBackgorundTailByte: 0,
		highBackgorundTailByte: 0
	};
	private shiftRegister = {
		lowBackgorundTailBytes: 0, // Includes tow tail byte
		highBackgorundTailBytes: 0, // Includes tow tail byte
		lowBackgroundAttributeByes: 0,
		highBackgroundAttributeByes: 0,
	}
	private nmiDelay = -1;

	private readonly bus: Bus;

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.ppu = this;

		for (let i = 0; i < 4; i++)
			this.nameTableData[i] = new Uint8Array(0x400);

		for (let i = 0; i < AllSpriteCount; i++)
			this.allSprite[i] = new Sprite();

		// for (let i = 0; i < AllSpriteCount; i++)
		// 	this.secondaryOam[i] = new Sprite();

		for (let i = 0; i < 256; i++)
			this.lineSpritePixels[i] = new RenderSprite();
	}

	Reset() {
		this.Write_2000(0);
		this.Write_2001(0);
		this.secondaryOamIndex.fill(-1);
		// for (let i = 0; i < AllSpriteCount; i++)
		// 	this.secondaryOam[i] = new Sprite();

		for (let i = 0; i < 256; i++)
			this.lineSpritePixels[i] = new RenderSprite();
	}

	//#region 写入
	/**写入 */
	WriteIO(address: number, value: number) {
		switch (address) {
			case 0x2000:
				this.Write_2000(value);
				break;
			case 0x2001:
				this.Write_2001(value);
				break;
			case 0x2003:
				this.oamAddress = value;
				break;
			case 0x2004:
				this.Write_2004(value);
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
				this.Write_4014(value);
				break;
		}
	}
	//#endregion 写入

	//#region 读取
	/**读取 */
	ReadIO(address: number) {
		let data: number = -1;
		switch (address) {
			case 0x2002:
				data = this.Read_2002();
				break;
			case 0x2004:
				data = this.oam[this.oamAddress];
				break;
			case 0x2007:
				data = this.Read_2007();
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
		if (this.scanLine === 261 && this.cycle === 339 && this.frame & 0x01 && (this.ppuMask.showBG || this.ppuMask.showSprite)) {
			this.Cycle();
		}

		this.Cycle();

		// Scanline 0 - 239: visible lines
		if (0 <= this.scanLine && this.scanLine <= 239) {
			// Cycle 0: do nothing

			if (this.ppuMask.showSprite) {
				switch (this.cycle) {
					case 1:
						this.ClearSecondaryOam();
						break;
					case 65:
						this.GetSprites();
						break;
					case 257:
						this.RenderSprite();
						break;
				}
			}
			// Cycle 1 - 64: Clear secondary OAM

			// Cycle 1 - 256: fetch NT, AT, tile
			if (1 <= this.cycle && this.cycle <= 256) {
				if (this.ppuMask.showBG) this.ShiftBackground();
				this.RenderPixel();
				if (this.ppuMask.showBG) this.FetchTileRelatedData();
			}


			if (this.ppuMask.showBG) {
				// Cycle 256
				if (this.cycle === 256) {
					this.IncrementVerticalPosition();
				}

				// Cycle 257
				if (this.cycle === 257) {
					this.CopyHorizontalBits();
				}
				// Cycle 321 - 336: fetch NT, AT, tile
				if (321 <= this.cycle && this.cycle <= 336) {
					this.ShiftBackground();
					this.FetchTileRelatedData();
				}
			}
		}

		// Scanline 240 - 260: Do nothing

		// Scanline 261: pre render line
		if (this.ppuMask.showBG && this.scanLine === 261) {
			// Cycle 0: do nothing

			// Cycle 1 - 256: fetch NT, AT, tile
			if (1 <= this.cycle && this.cycle <= 256) {
				this.ShiftBackground();
				this.FetchTileRelatedData();
			}

			// Cycle 256
			if (this.cycle === 256) {
				this.IncrementVerticalPosition();
			}

			// Cycle 257
			if (this.cycle === 257) {
				this.CopyHorizontalBits();
			}

			// Cycle 257 - 320: do nothing

			// Cycle 280
			if (this.cycle === 280) {
				this.CopyVerticalBits();
			}

			// Cycle 321 - 336: fetch NT, AT, tile
			if (321 <= this.cycle && this.cycle <= 336) {
				this.ShiftBackground();
				this.FetchTileRelatedData();
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
		this.ppuCTRL.nmiEnable = (value & 0x80) !== 0;

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

	private Write_2004(value: number) {
		const index = this.oamAddress & 0xFF;
		this.oam[index] = value;
		this.oamAddress++;
		this.SetSprite(index);
	}

	private Write_2005(value: number) {
		if (this.register.w === 0) {
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

	/**DMA Copy */
	private Write_4014(value: number) {
		this.oamAddress = value << 8;
		let i: number;
		for (i = 0; i < 256; i++) {
			this.oam[i] = this.bus.ReadByte(i + this.oamAddress);
			this.SetSprite(i);
		}

		this.bus.cpu.cycle += this.bus.cpu.cycle & 0x1 ? 513 : 514;
	}

	private SetSprite(oamIndex: number) {
		const sprite = this.allSprite[oamIndex >> 2];
		switch (oamIndex & 3) {
			case 0:
				sprite.y = this.oam[oamIndex];
				sprite.isZero = oamIndex === 0;
				break;
			case 1:
				sprite.tileIndex = this.oam[oamIndex];
				break;
			case 2:
				sprite.SetAttribute(this.oam[oamIndex]);
				break;
			case 3:
				sprite.x = this.oam[oamIndex];
				break;
		}
		sprite.rendered = false;
	}
	//#endregion 写入各个接口

	//#region 读取各个接口
	private Read_2002() {
		let result = this.ppuStatusValue | (this.ppuReadBuffer & 0x1F);
		this.register.w = 0;
		this.ppuStatus.verticalBlankStarted = false;
		return result;
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
		if (this.ppuStatus.verticalBlankStarted && this.ppuCTRL.nmiEnable && this.nmiDelay-- === 0) {
			this.bus.cpu.NMI();
		}

		this.cycle++;
		if (this.cycle > 340) {
			this.cycle = 0;
			this.scanLine++;
			if (this.scanLine > 261) {
				this.scanLine = 0;
				this.frame++;
				this.bus.api.OnFrame?.(this.screenPixels);
				this.bus.EndFrame();
			}
		}

		if (this.scanLine === 241 && this.cycle === 1) {
			this.ppuStatus.verticalBlankStarted = true;

			if (this.ppuCTRL.nmiEnable) {
				this.nmiDelay = 15;
			}
		}

		if (this.scanLine === 261 && this.cycle === 1) {
			this.ppuStatus.verticalBlankStarted = false;
			this.ppuStatus.spriteZeroHit = false;
			this.ppuStatus.spriteOverflow = false;
		}

		if (this.ppuMask.showBG || this.ppuMask.showSprite) {
			this.bus.cartridge.mapper.PPUClockEvent?.(this.scanLine, this.cycle);
		}
	}
	//#endregion 执行一个Cycle

	//#region 读取写入
	private ReadByte(address: number) {
		address &= 0x3FFF;
		if (address < 0x2000) {
			return this.bus.cartridge.mapper.ReadCHR(address);
		} else if (address < 0x3F00) {
			const index = this.nameTableMap[(address >> 10) & 3];
			address &= 0x3FF;
			return this.nameTableData[index][address];
		} else {
			address &= 0x1F
			return this.paletteTable[address];
		}
	}

	private WriteByte(address: number, value: number) {
		address &= 0x3FFF;
		if (address < 0x2000) {
			this.bus.cartridge.mapper.WriteCHR(address, value);
		} else if (address < 0x3F00) {
			const index = this.nameTableMap[(address >> 10) & 3];
			address &= 0x3FF;
			this.nameTableData[index][address] = value;
		} else {
			address &= 0x1F;
			if ((address & 3) === 0)
				this.paletteTable[0x00] = this.paletteTable[0x04] = this.paletteTable[0x08] = this.paletteTable[0x0C] =
					this.paletteTable[0x10] = this.paletteTable[0x14] = this.paletteTable[0x18] = this.paletteTable[0x1C] = value;
			else
				this.paletteTable[address] = value;
		}
	}
	//#endregion 读取写入

	//#region 获取背景位置
	private FetchTileRelatedData() {
		switch (this.cycle & 0x07) {
			case 1:
				this.LoadBackground();
				this.FetchNameTable();
				break;
			case 3:
				this.FetchAttributeTable();
				break;
			case 5:
				this.FetchLowBackgroundTileByte();
				break;
			case 7:
				this.FetchHighBackgroundTileByte();
				break;
			case 0:
				this.IncrementHorizontalPosition();
				break;
		}
	}

	private FetchNameTable() {
		const address = 0x2000 | (this.register.v & 0x0FFF);

		this.latchs.nameTable = this.ReadByte(address);
	}

	private FetchAttributeTable() {
		const address = 0x23C0 | (this.register.v & 0x0C00) | ((this.register.v >> 4) & 0x38) | ((this.register.v >> 2) & 0x07);

		const isRight = !!(this.register.v & 0x02);
		const isBottom = !!(this.register.v & 0x40);

		const offset = (isBottom ? 0x02 : 0) | (isRight ? 0x01 : 0);

		this.latchs.attributeTable = this.ReadByte(address) >> (offset << 1) & 0x03;
	}

	private FetchLowBackgroundTileByte() {
		const address = this.ppuCTRL.bgPattern + (this.latchs.nameTable * 16) + (this.register.v >> 12 & 0x07);
		this.latchs.lowBackgorundTailByte = this.ReadByte(address);
	}

	private FetchHighBackgroundTileByte() {
		const address = this.ppuCTRL.bgPattern + (this.latchs.nameTable * 16) + (this.register.v >> 12 & 0x07) + 8;
		this.latchs.highBackgorundTailByte = this.ReadByte(address);
	}

	private LoadBackground() {
		this.shiftRegister.lowBackgorundTailBytes |= this.latchs.lowBackgorundTailByte;
		this.shiftRegister.highBackgorundTailBytes |= this.latchs.highBackgorundTailByte;
		this.shiftRegister.lowBackgroundAttributeByes |= (this.latchs.attributeTable & 0x01) ? 0xFF : 0;
		this.shiftRegister.highBackgroundAttributeByes |= (this.latchs.attributeTable & 0x02) ? 0xFF : 0;
	}

	private ShiftBackground() {
		this.shiftRegister.lowBackgorundTailBytes <<= 1;
		this.shiftRegister.highBackgorundTailBytes <<= 1;
		this.shiftRegister.lowBackgroundAttributeByes <<= 1;
		this.shiftRegister.highBackgroundAttributeByes <<= 1;
	}

	// Between cycle 328 of a scanline, and 256 of the next scanline
	private IncrementHorizontalPosition(): void {
		if ((this.register.v & 0x1F) === 0x1F) {
			this.register.v &= ~0x1F;
			this.register.v ^= 0x0400;
		} else {
			this.register.v += 1;
		}
	}

	// At cycle 256 of each scanline
	private IncrementVerticalPosition(): void {
		if ((this.register.v & 0x7000) !== 0x7000) {
			this.register.v += 0x1000;
		} else {
			this.register.v &= ~0x7000;
			let y = (this.register.v & 0x03E0) >> 5;
			switch (y) {
				case 29:
					y = 0;
					this.register.v ^= 0x800;
					break;
				case 31:
					y = 0;
					break;
				default:
					y++;
					break;
			}
			this.register.v = (this.register.v & ~0x03E0) | (y << 5);
		}
	}

	// At cycle 257 of each scanline
	private CopyHorizontalBits(): void {
		if (!this.ppuMask.showBG)
			return;

		// v: ....F.. ...EDCBA = t: ....F.. ...EDCBA
		this.register.v = (this.register.v & 0b1111101111100000) | (this.register.t & ~0b1111101111100000) & 0x7FFF;
	}

	// During cycles 280 to 304 of the pre-render scanline (end of vblank)
	private CopyVerticalBits(): void {
		// v: IHGF.ED CBA..... = t: IHGF.ED CBA.....
		this.register.v = (this.register.v & 0b1000010000011111) | (this.register.t & ~0b1000010000011111) & 0x7FFF;
	}
	//#endregion 获取背景位置

	//#region 渲染像素
	private RenderPixel(): void {
		const x = this.cycle - 1;
		const y = this.scanLine;

		const offset = 0x8000 >> this.register.x;
		const bit0 = this.shiftRegister.lowBackgorundTailBytes & offset ? 1 : 0;
		const bit1 = this.shiftRegister.highBackgorundTailBytes & offset ? 2 : 0;
		const bit2 = this.shiftRegister.lowBackgroundAttributeByes & offset ? 4 : 0;
		const bit3 = this.shiftRegister.highBackgroundAttributeByes & offset ? 8 : 0;

		const paletteIndex = bit3 | bit2 | bit1 | bit0;
		const spritePaletteIndex = this.lineSpritePixels[x].paletteIndex;
		// let spritePaletteIndex = 0;
		// if (this.lineSpritePixels[x].used)
		// 	spritePaletteIndex = this.lineSpritePixels[x].paletteIndex;

		const isTransparentSprite = (spritePaletteIndex & 3) === 0 || !this.ppuMask.showSprite;
		const isTransparentBackground = (paletteIndex & 3) === 0 || !this.ppuMask.showBG;

		let patternIndex = 0;
		if (isTransparentBackground) {
			if (isTransparentSprite) {
				// Do nothing
			} else {
				patternIndex = 0x10 + spritePaletteIndex;
			}
		} else {
			if (isTransparentSprite) {
				patternIndex = paletteIndex;
			} else {
				// Sprite 0 hit does not happen:
				//   - If background or sprite rendering is disabled in PPUMASK ($2001)
				//   - At x=0 to x=7 if the left-side clipping window is enabled (if bit 2 or bit 1 of PPUMASK is 0).
				//   - At x=255, for an obscure reason related to the pixel pipeline.
				//   - At any pixel where the background or sprite pixel is transparent (2-bit color index from the CHR pattern is %00).
				//   - If sprite 0 hit has already occurred this frame. Bit 6 of PPUSTATUS ($2002) is cleared to 0 at dot 1 of the pre-render line.
				//     This means only the first sprite 0 hit in a frame can be detected.
				if (this.lineSpritePixels[x].isZero) {
					if (
						(!this.ppuMask.showBG || !this.ppuMask.showSprite) ||
						(0 <= x && x <= 7 && (!this.ppuMask.showSpriteInLeft || !this.ppuMask.showBGInLeft)) ||
						x === 255
						// TODO: Only the first sprite 0 hit in a frame can be detected.
					) {
						// Sprite 0 hit does not happen
					} else {
						this.ppuStatus.spriteZeroHit = true;
					}
				}
				patternIndex = this.lineSpritePixels[x].hideInBG ? paletteIndex : spritePaletteIndex + 0x10;
			}
		}

		this.screenPixels[x + y * 256] = this.paletteTable[patternIndex];
	}
	//#endregion 渲染像素

	//#region 获取精灵
	/**
	 * 获取精灵
	 */
	private GetSprites() {
		if (!this.ppuMask.showSprite)
			return;

		this.secondarySpriteCount = 0;
		for (let i = 0; i < AllSpriteCount; i++) {
			let sprite = this.allSprite[i];
			let yOffset = sprite.y + this.ppuCTRL.spriteSize;
			if (sprite.rendered || sprite.y > this.scanLine || yOffset <= this.scanLine)
				continue;

			if (this.secondarySpriteCount === 8) {
				this.ppuStatus.spriteOverflow = true;
				// break;
			}

			this.secondaryOamIndex[this.secondarySpriteCount++] = i;
			if (yOffset === this.scanLine - 1)
				sprite.rendered = true;
		}
		this.secondarySpriteCount--;
	}
	//#endregion 获取精灵

	//#region 清空第二OAM
	private ClearSecondaryOam() {
		this.secondarySpriteCount = 0;
	}
	//#endregion 清空第二OAM

	//#region 渲染精灵
	/**渲染精灵 */
	private RenderSprite() {
		for (let i = 0, length = this.lineSpritePixels.length; i < length; i++)
			this.lineSpritePixels[i].paletteIndex = 0;

		for (let i = this.secondarySpriteCount; i >= 0; i--) {
			let sprite = this.allSprite[this.secondaryOamIndex[i]];
			if (sprite.y >= 0xEF)
				continue;

			let tileIndex: number, tileY: number;
			if (this.ppuCTRL.spriteSize === 8) {
				tileIndex = (this.ppuCTRL.spritePattern >> 4) + sprite.tileIndex;
				tileY = sprite.vFlip ? (7 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
			} else {
				tileIndex = ((sprite.tileIndex & 0x01) ? 0x100 : 0x000) + (sprite.tileIndex & 0xFE);
				tileY = sprite.vFlip ? (15 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
				if (tileY > 7)
					tileIndex++;
			}

			const tile = this.bus.cartridge.mapper.GetCHRTile(tileIndex);

			// Fetch tile data
			// const tileL = this.ReadByte(address);
			// const tileH = this.ReadByte(address + 8);

			// Generate sprite pixels
			let pixel, pixelX, x;
			for (let i = 0; i < 8; i++) {
				pixelX = sprite.x + i;
				if (pixelX >= this.lineSpritePixels.length)
					break;

				pixel = this.lineSpritePixels[sprite.x + i];
				x = sprite.hFlip ? 7 - i : i;

				if ((pixel.paletteIndex & 3) !== 0)
					continue;

				pixel.hideInBG = sprite.hideInBg;
				pixel.isZero = sprite.isZero;
				pixel.paletteIndex = tile.GetData(x, tileY & 7) | sprite.paletteIndex << 2;
			}
		}
		// for (const sprite of this.secondaryOam.reverse()) {
		// 	// Hidden sprite?
		// 	if (sprite.y >= 0xEF) {
		// 		continue;
		// 	}

		// 	const isBehind = !!(sprite.attributes & SpriteAttribute.PRIORITY);
		// 	const isZero = sprite.isZero;
		// 	const isFlipH = !!(sprite.attributes & SpriteAttribute.FLIP_H);
		// 	const isFlipV = !!(sprite.attributes & SpriteAttribute.FLIP_V);

		// 	// Caculate tile address
		// 	let address: number;
		// 	if (this.ppuCTRL.spriteSize === 8) {
		// 		const baseAddress = this.ppuCTRL.spritePattern + (sprite.tileIndex << 4);
		// 		const offset = isFlipV ? (7 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
		// 		address = baseAddress + offset;
		// 	} else {
		// 		const baseAddress = ((sprite.tileIndex & 0x01) ? 0x1000 : 0x0000) + ((sprite.tileIndex & 0xFE) << 4);
		// 		const offset = isFlipV ? (15 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
		// 		address = baseAddress + offset % 8 + Math.floor(offset / 8) * 16;
		// 	}

		// 	// Fetch tile data
		// 	const tileL = this.ReadByte(address);
		// 	const tileH = this.ReadByte(address + 8);

		// 	// Generate sprite pixels
		// 	for (let i = 0; i < 8; i++) {
		// 		const b = isFlipH ? 0x01 << i : 0x80 >> i;

		// 		const bit0 = tileL & b ? 1 : 0;
		// 		const bit1 = tileH & b ? 1 : 0;
		// 		const bit2 = sprite.attributes & SpriteAttribute.PALETTE_L ? 1 : 0;
		// 		const bit3 = sprite.attributes & SpriteAttribute.PALETTE_H ? 1 : 0;
		// 		const index = bit3 << 3 | bit2 << 2 | bit1 << 1 | bit0;

		// 		if (index % 4 === 0 && (this.spritePixels[sprite.x + i] & SpritePixel.PALETTE) % 4 !== 0) {
		// 			continue;
		// 		}

		// 		this.spritePixels[sprite.x + i] = index |
		// 			(isBehind ? SpritePixel.BEHIND_BG : 0) |
		// 			(isZero ? SpritePixel.ZERO : 0);
		// 	}
		// }
	}
	//#endregion 渲染精灵

}