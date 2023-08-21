import { Bus } from "../Bus";
import { Tile } from "../PPU/PPUBlock";
import { IMapper } from "./IMapper";

const prgMaxAnd = 0x1FFF;

export class Mapper4 implements IMapper {
	bus: Bus;
	prgSize: number = prgMaxAnd + 1;
	chrSize: number = 0x400;

	private bankDataRegister = 0;
	/**
	 * |CHR map mode →|$8000.D7 = 0|$8000.D7 = 1|
	 * |:---:|:---:|:---:|
	 * |PPU Bank|Value of MMC3 register|
	 * |$0000-$03FF|R0|R2|
	 * |$0400-$07FF|R0|R3|
	 * |$0800-$0BFF|R1|R4|
	 * |$0C00-$0FFF|R1|R5|
	 * |$1000-$13FF|R2|R0|
	 * |$1400-$17FF|R3|R0|
	 * |$1800-$1BFF|R4|R1|
	 * |$1C00-$1FFF|R5|R1|
	 */
	private chrInversion = false;
	private bankMode = false;
	private writeProtection = false;
	private prgRAMEnable = false;

	private irq = {
		enable: false,
		latchValue: 0,
		nowValue: 0,
	}

	constructor(bus: Bus) {
		this.bus = bus;
	}

	Initialization(option: { maxPrg: number; }): void {
		this.bus.cartridge.prgIndex = [0, 0, option.maxPrg - 1, option.maxPrg];
		this.bus.cartridge.chrIndex = [0, 0, 0, 0, 0, 0, 0, 0];
	}

	ReadPRG(address: number): number {
		let index = (address - 0x8000) >> 13;
		address &= prgMaxAnd;
		return this.bus.cartridge.prgBanks[index][address];
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
				this.irq.nowValue = value;
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
		throw new Error("Method not implemented.");
	}

	GetCHRTile(tileIndex: number): Tile {
		throw new Error("Method not implemented.");
	}

	WriteCHR(address: number, value: number): void {
		throw new Error("Method not implemented.");
	}

	PPUClockEvent?(scanLine: number, ppuCycle: number): void {
		throw new Error("Method not implemented.");
	}

	private SwitchBank(value: number) {
		let index = 0;
		let more = false;
		switch (this.bankDataRegister) {
			case 0:
				more = true;
				break;
			case 1:
				index = 2;
				more = true;
				break;
			case 2:
				index = 4;
				break;
			case 3:
				index = 5;
				break;
			case 4:
				index = 6;
				break;
			case 5:
				break;
			case 6:
				break;
			case 7:
				break;
		}

		if (this.chrInversion) {
			this.bus.cartridge.chrIndex[index + 4] = value;
			if (more) this.bus.cartridge.chrIndex[index + 5] = value + 1;
		} else {
			this.bus.cartridge.chrIndex[index] = value;
			if (more) this.bus.cartridge.chrIndex[index + 5] = value + 1;
		}
	}
}