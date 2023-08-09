import { Bus } from "../Bus";
import { BitValue, BitValueRev } from "../NESConst";
import { Sprite, Tile } from "./PPUBlock";

const AllSpriteCount = 64;
/**一行最多显示精灵数，-1为无限制 */
const LineMaxSprite = 64;
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
	/**Object Attribute Memory */
	oam = new Uint8Array(256);

	/**secondaryOam，简化算法 */
	secondaryOam: Sprite[] = [];
	secondarySpriteCount = 0;

	lineSpritePixels = new Int8Array(256);
	allSprite: Sprite[] = [];
	showSprite = new Int8Array(AllSpriteCount);

	screenPixels = new Uint8Array();
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

		for (let i = 0; i < this.nameTableData.length; i++) {
			this.nameTableData[i] = new Uint8Array(0x400);
		}
	}

	Reset() {
		this.Write_2000(0);
		this.Write_2001(0);
		this.showSprite.fill(-1);
		for (let i = 0; i < AllSpriteCount; i++)
			this.secondaryOam[i] = new Sprite();
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
				this.oam[this.oamAddress & 0xFF] = value;
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
				data = this.oam[this.oamAddress];
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
		if (this.scanLine === 261 && this.cycle === 339 && this.frame & 0x01 && (this.ppuMask.showBG || this.ppuMask.showSprite)) {
			this.Cycle();
		}

		this.Cycle();

		if (!this.ppuMask.showBG && !this.ppuMask.showSprite) {
			return;
		}

		// Scanline 0 - 239: visible lines
		if (0 <= this.scanLine && this.scanLine <= 239) {
			// Cycle 0: do nothing

			// Cycle 1 - 64: Clear secondary OAM
			if (1 === this.cycle) {
				this.ClearSecondaryOam();
			}

			// Cycle 65 - 256: Sprite evaluation for next scanline
			if (65 === this.cycle) {
				this.evalSprite();
			}

			// Cycle 1 - 256: fetch NT, AT, tile
			if (1 <= this.cycle && this.cycle <= 256) {
				this.ShiftBackground();
				this.RenderPixel();
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

			// Cycle 257 - 320: Sprite fetches
			if (this.cycle === 257) {
				this.FetchSprite();
			}

			// Cycle 321 - 336: fetch NT, AT, tile
			if (321 <= this.cycle && this.cycle <= 336) {
				this.shiftBackground();
				this.fetchTileRelatedData();
			}

			// Cycle 337 - 340: unused NT fetches
		}

		// Scanline 240 - 260: Do nothing

		// Scanline 261: pre render line
		if (this.scanLine === 261) {
			// Cycle 0: do nothing

			// Cycle 1 - 256: fetch NT, AT, tile
			if (1 <= this.cycle && this.cycle <= 256) {
				this.shiftBackground();
				this.fetchTileRelatedData();
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
				this.shiftBackground();
				this.fetchTileRelatedData();
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

	//#region DMA复制
	private DMACopy() {
		let index;
		for (let i = 0; i < 256; i++) {
			this.oam[i] = this.bus.cpu.ram[i + this.oamAddress];
			if ((i & 3) === 0) {
				index = i / 4;
				let sprite = this.allSprite[i / 4];
				sprite.y = this.oam[i];
			}
		}
	}
	//#endregion DMA复制

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

	//#region 读取写入
	private ReadByte(address: number) {
		address &= 0x3FFF;
		if (address < 0x2000) {
			return this.bus.cartridge.mapper.ReadCHR(address);
		} else if (address < 0x3F00) {
			address &= 0x2FFF
			const index = this.nameTableMap[(address >> 10) & 3];
			return this.nameTableData[index][address];
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

	private fetchTileRelatedData() {
		if (!this.ppuMask.showBG) {
			return;
		}

		switch (this.cycle & 0x07) {
			case 1:
				this.LoadBackground();
				this.fetchNameTable();
				break;
			case 3:
				this.fetchAttributeTable();
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

	private fetchNameTable() {
		const address = 0x2000 | (this.register.v & 0x0FFF);

		this.latchs.nameTable = this.ReadByte(address);
	}

	private fetchAttributeTable() {
		const address = 0x23C0 | (this.register.v & 0x0C00) | ((this.register.v >> 4) & 0x38) | ((this.register.v >> 2) & 0x07);

		const isRight = !!(this.register.v & 0x02);
		const isBottom = !!(this.register.v & 0x40);

		const offset = (isBottom ? 0x02 : 0) | (isRight ? 0x01 : 0);

		this.latchs.attributeTable = this.ReadByte(address) >> (offset << 1) & 0x03;
	}

	private FetchLowBackgroundTileByte() {
		const address = this.ppuCTRL.bgPattern + (this.latchs.nameTable << 4) + (this.register.v >> 12 & 0x07);
		this.latchs.lowBackgorundTailByte = this.ReadByte(address);
	}

	private FetchHighBackgroundTileByte() {
		const address = this.ppuCTRL.bgPattern + (this.latchs.nameTable << 4) + (this.register.v >> 12 & 0x07) + 8;
		this.latchs.highBackgorundTailByte = this.ReadByte(address);
	}

	private LoadBackground() {
		this.shiftRegister.lowBackgorundTailBytes |= this.latchs.lowBackgorundTailByte;
		this.shiftRegister.highBackgorundTailBytes |= this.latchs.highBackgorundTailByte;
		this.shiftRegister.lowBackgroundAttributeByes |= (this.latchs.attributeTable & 0x01) ? 0xFF : 0;
		this.shiftRegister.highBackgroundAttributeByes |= (this.latchs.attributeTable & 0x02) ? 0xFF : 0;
	}

	private ShiftBackground() {
		if (!this.ppuMask.showBG) {
			return;
		}

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
			if (y === 29) {
				y = 0;
				this.register.v ^= 0x0800;
			} else if (y === 31) {
				y = 0;
			} else {
				y += 1;
			}
			this.register.v = (this.register.v & ~0x03E0) | (y << 5);
		}
	}

	// At cycle 257 of each scanline
	private CopyHorizontalBits(): void {
		// v: ....F.. ...EDCBA = t: ....F.. ...EDCBA
		this.register.v = (this.register.v & 0b1111101111100000) | (this.register.t & ~0b1111101111100000) & 0x7FFF;
	}

	// During cycles 280 to 304 of the pre-render scanline (end of vblank)
	private copyVerticalBits(): void {
		// v: IHGF.ED CBA..... = t: IHGF.ED CBA.....
		this.register.v = (this.register.v & 0b1000010000011111) | (this.register.t & ~0b1000010000011111) & 0x7FFF;
	}

	//#region 渲染像素
	private RenderPixel(): void {
		const x = this.cycle - 1;
		const y = this.scanLine;

		const offset = 0x8000 >> this.register.x;
		const bit0 = this.shiftRegister.lowBackgorundTailBytes & offset ? 8 : 0;
		const bit1 = this.shiftRegister.highBackgorundTailBytes & offset ? 4 : 0;
		const bit2 = this.shiftRegister.lowBackgroundAttributeByes & offset ? 2 : 0;
		const bit3 = this.shiftRegister.highBackgroundAttributeByes & offset ? 1 : 0;

		const paletteIndex = bit3 | bit2 | bit1 | bit0;
		const spritePaletteIndex = this.lineSpritePixels[x] & SpritePixel.PALETTE;

		const isTransparentSprite = spritePaletteIndex % 4 === 0 || !this.ppuMask.showSprite;
		const isTransparentBackground = paletteIndex % 4 === 0 || !this.ppuMask.showBG;

		let address = 0x3F00;
		if (isTransparentBackground) {
			if (isTransparentSprite) {
				// Do nothing
			} else {
				address = 0x3F10 + spritePaletteIndex;
			}
		} else {
			if (isTransparentSprite) {
				address = 0x3F00 + paletteIndex;
			} else {
				// Sprite 0 hit does not happen:
				//   - If background or sprite rendering is disabled in PPUMASK ($2001)
				//   - At x=0 to x=7 if the left-side clipping window is enabled (if bit 2 or bit 1 of PPUMASK is 0).
				//   - At x=255, for an obscure reason related to the pixel pipeline.
				//   - At any pixel where the background or sprite pixel is transparent (2-bit color index from the CHR pattern is %00).
				//   - If sprite 0 hit has already occurred this frame. Bit 6 of PPUSTATUS ($2002) is cleared to 0 at dot 1 of the pre-render line.
				//     This means only the first sprite 0 hit in a frame can be detected.
				if (this.spritePixels[x] & SpritePixel.ZERO) {
					if (
						(!this.mask.isShowBackground || !this.mask.isShowSprite) ||
						(0 <= x && x <= 7 && (!this.mask.isShowSpriteLeft8px || !this.mask.isShowBackgroundLeft8px)) ||
						x === 255
						// TODO: Only the first sprite 0 hit in a frame can be detected.
					) {
						// Sprite 0 hit does not happen
					} else {
						this.ppuStatus.spriteZeroHit = true;
					}
				}
				address = this.spritePixels[x] & SpritePixel.BEHIND_BG ? 0x3F00 + paletteIndex : 0x3F10 + spritePaletteIndex;
			}
		}

		this.screenPixels[x + y * 256] = this.ReadByte(address);
	}
	//#endregion 渲染像素

	private ClearSecondaryOam() {
		// if (!this.ppuMask.showSprite) {
		// 	return;
		// }

		// this.secondaryOam.forEach(oam => {
		// 	oam.attributes = 0xFF;
		// 	oam.tileIndex = 0xFF;
		// 	oam.x = 0xFF;
		// 	oam.y = 0xFF;
		// });
		this.secondarySpriteCount = 0;
	}

	//#region 计算精灵
	private evalSprite() {
		if (!this.ppuMask.showSprite) {
			return;
		}

		// Find eligible sprites
		for (let i = 0; i < 0x100; i += 4) {
			const y = this.oam[i];
			if (this.scanLine < y || (this.scanLine >= y + this.ppuCTRL.spriteSize))
				continue;

			// Overflow?
			if (this.secondarySpriteCount === 8) {
				this.ppuStatus.spriteOverflow = true;
				// break;
			}

			this.secondaryOam[this.secondarySpriteCount].SetData(this.oam, i, i === 0);
			this.secondarySpriteCount++;
		}

		if (this.secondarySpriteCount < AllSpriteCount)
			this.secondaryOam[this.secondarySpriteCount].useble = false;
	}
	//#endregion 计算精灵

	//#region 渲染精灵
	/**渲染精灵 */
	private FetchSprite() {
		if (!this.ppuMask.showSprite) {
			return;
		}

		this.lineSpritePixels.fill(-1);
		for (let i = this.secondarySpriteCount - 1; i >= 0; i--) {
			let sprite = this.secondaryOam[i];
			if (sprite.y >= 0xEF)
				continue;

			let address: number;
			if (this.ppuCTRL.spriteSize === 8) {
				const baseAddress = this.ppuCTRL.spritePattern + (sprite.tileIndex << 4);
				const offset = sprite.vFlip ? (7 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
				address = baseAddress + offset;
			} else {
				const baseAddress = ((sprite.tileIndex & 0x01) ? 0x1000 : 0x0000) + ((sprite.tileIndex & 0xFE) << 4);
				const offset = sprite.vFlip ? (15 - this.scanLine + sprite.y) : (this.scanLine - sprite.y);
				address = baseAddress + (offset & 0x7) + (offset >> 4) << 5;
			}

			// Fetch tile data
			const tileL = this.ReadByte(address);
			const tileH = this.ReadByte(address + 8);

			// Generate sprite pixels
			for (let i = 0; i < LineMaxSprite; i++) {
				const b = sprite.hFlip ? BitValue[i] : BitValueRev[i];

				const bit0 = tileL & b ? 1 : 0;
				const bit1 = tileH & b ? 2 : 0;
				const bit2_3 = sprite.paletteIndex << 2;
				const index = bit2_3 | bit1 | bit0;

				if (index % 4 === 0 && ((this.spritePixels[sprite.x + i] & SpritePixel.PALETTE) & 3) !== 0) {
					continue;
				}

				this.lineSpritePixels[sprite.x + i] = index | (sprite.hideInBg ? SpritePixel.BEHIND_BG : 0) | (isZero ? SpritePixel.ZERO : 0);
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