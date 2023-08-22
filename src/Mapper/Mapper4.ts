import { Bus } from "../Bus";
import { Tile } from "../PPU/PPUBlock";
import { IMapper, MapperInitOption } from "./IMapper";

const prgMaxAnd = 0x1FFF;

/**
 * https://www.nesdev.org/wiki/MMC3
 * 
 * 以下表格已针对代码做了修改，原文请参考链接
 * |CHR map mode →|$8000.D7 = 0|$8000.D7 = 1|
 * |:---:|:---:|:---:|
 * |PPU Bank|Value of MMC3 register|
 * |$0000-$03FF|R0|R4|
 * |$0400-$07FF|R1|R5|
 * |$0800-$0BFF|R2|R6|
 * |$0C00-$0FFF|R3|R7|
 * |$1000-$13FF|R4|R0|
 * |$1400-$17FF|R5|R1|
 * |$1800-$1BFF|R6|R2|
 * |$1C00-$1FFF|R7|R3|
 */
export class Mapper4 implements IMapper {
	bus: Bus;
	prgSize: number = prgMaxAnd + 1;
	chrSize: number = 0x400;

	private bankDataRegister = 0;
	/**CHR-ROM 交换 */
	private chrInversion = false;
	/**PRG-ROM 模式，false为 0xC000-0xDFFF为最后第二Bank，否则是0x8000-0x9FFF */
	private bankMode = false;
	private writeProtection = false;
	private prgRAMEnable = false;

	private maxPrg = 0;
	private maxChr = 0;

	private irq = {
		enable: false,
		latchValue: 0,
		counter: 0,
	}

	constructor(bus: Bus) {
		this.bus = bus;
	}

	Initialization(option: MapperInitOption): void {
		this.bus.cartridge.prgIndex = [0, 0, option.maxPrg - 1, option.maxPrg];
		this.bus.cartridge.chrIndex = [0, 0, 0, 0, 0, 0, 0, 0];
		this.maxPrg = option.maxPrg;
		this.maxChr = option.maxChr;
	}

	ReadPRG(address: number): number {
		const index = this.bus.cartridge.prgIndex[(address - 0x8000) >> 13];
		const add = address & prgMaxAnd;
		return this.bus.cartridge.prgBanks[index][add];
	}

	WritePRG(address: number, value: number): void {
		switch (address) {
			case 0x8000:
				this.bankDataRegister = value & 0x7;
				this.chrInversion = (value & 0x80) !== 0;
				break;
			case 0x8001:
				this.SwitchBank(value);
				break;
			case 0xA000:
				value = (value & 1) ^ 1;
				this.bus.ppu.SetMirrorType(value);
				break;
			case 0xA001:
				this.writeProtection = (value & 0x40) !== 0;
				this.prgRAMEnable = (value & 0x80) !== 0;
				break;
			case 0xC000:
				this.irq.latchValue = value;
				break;
			case 0xC001:
				this.irq.counter = value;
				break;
			case 0xE000:
				this.irq.enable = false;
				break;
			case 0xE001:
				this.irq.enable = true;
				break;
		}
	}

	ReadCHR(address: number): number {
		const tile = this.GetCHRTile(address >> 4);
		return tile.data[address & 0xF];
	}

	GetCHRTile(tileIndex: number): Tile {
		const index = this.bus.cartridge.chrIndex[tileIndex >> 6];
		tileIndex &= 0x3F;
		return this.bus.cartridge.chrBanks[index][tileIndex];
	}

	WriteCHR(address: number, value: number): void { }

	PPUClockEvent?(scanLine: number, ppuCycle: number): void {
		if (ppuCycle !== 260 || (scanLine > 239 && scanLine < 261)) {
			return;
		}

		if (this.irq.counter === 0) {
			this.irq.counter = this.irq.latchValue;
		} else {
			this.irq.counter--;
			if (this.irq.counter === 0 && this.irq.enable) {
				this.bus.cpu.IRQ();
			}
		}
	}

	private SwitchBank(value: number) {
		if (this.bankDataRegister < 6) {
			this.SwitchChrRom(value);
		} else {
			this.SwitchPrgRom(value);
		}
	}

	private SwitchChrRom(value: number) {
		value &= this.maxChr;
		let large = false;
		let index = this.bankDataRegister;
		if (index < 2) {
			index *= 2;
			large = true;
			if (this.chrInversion)
				index += 4;
		} else {
			index += 2;
			if (this.chrInversion)
				index -= 4;
		}

		this.bus.cartridge.chrIndex[index++] = value;
		if (large)
			this.bus.cartridge.chrIndex[index] = value + 1;
	}

	private SwitchPrgRom(value: number) {
		value &= this.maxPrg;
		if (this.bankDataRegister === 7) {
			this.bus.cartridge.prgIndex[1] = value;
			return;
		}

		if (this.bankMode) {
			this.bus.cartridge.prgIndex[0] = this.maxPrg - 1;
			this.bus.cartridge.prgIndex[2] = value;
		} else {
			this.bus.cartridge.prgIndex[0] = value;
			this.bus.cartridge.prgIndex[2] = this.maxPrg - 1;
		}
	}
}