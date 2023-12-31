import { Bus } from "../Bus";
import { Tile } from "../PPU/PPUBlock";
import { Utils } from "../Utils";
import { IMapper, MapperInitOption } from "./IMapper";

const PrgSizeAND = 0x3FFF;

export class Mapper0 implements IMapper {

	readonly bus: Bus;
	prgSize: number = PrgSizeAND + 1;
	chrSize: number = 0x2000;

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.cartridge.mapper = this;
	}

	/**
	 * Mapper0 直接使用一个PRG-ROM进行管理
	 */
	Initialization(option: MapperInitOption): void {
		let tempBank = new Uint8Array(0x8000);
		Utils.CopyArray(this.bus.cartridge.prgBanks[0], 0, tempBank, 0);
		if (option.maxPrg === 0) {
			Utils.CopyArray(this.bus.cartridge.prgBanks[0], 0, tempBank, 0x4000);
		} else {
			Utils.CopyArray(this.bus.cartridge.prgBanks[1], 0, tempBank, 0x4000);
		}

		this.bus.cartridge.prgBanks = [tempBank];
		this.bus.cartridge.prgIndex = [0];
		this.bus.cartridge.chrIndex = [0];
	}

	ReadCHR(address: number) {
		const tile = this.bus.cartridge.chrBanks[0][address >> 4];
		return tile.data[address & 0xF];
	}
	GetCHRTile(address: number): Tile {
		return this.bus.cartridge.chrBanks[0][address];
	}

	WriteCHR(address: number, value: number): void { }
	WritePRG(address: number, value: number) { }

	ReadPRG(address: number) {
		address -= 0x8000;
		return this.bus.cartridge.prgBanks[0][address];
	}

}