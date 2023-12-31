import { Bus } from "../Bus";
import { Tile } from "../PPU/PPUBlock";
import { IMapper, MapperInitOption } from "./IMapper";

/**一般是 PRGSize - 1 */
const PrgSizeAND = 0x3FFF;

export class Mapper2 implements IMapper {

	readonly bus!: Bus;
	prgSize: number = PrgSizeAND + 1;
	chrSize: number = 0;
	chrRamTiles: Tile[] = [];

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.cartridge.mapper = this;
	}

	Initialization(option: MapperInitOption): void {
		this.bus.cartridge.prgIndex = [0, option.maxPrg];
		this.bus.cartridge.chrIndex = [-1];
		this.bus.cartridge.chrRam = true;

		for (let i = 0; i < 512; i++)
			this.chrRamTiles[i] = new Tile(new Uint8Array(16));
	}

	ReadPRG(address: number): number {
		address -= 0x8000;
		let index = address < 0x4000 ? this.bus.cartridge.prgIndex[0] : this.bus.cartridge.prgIndex[1];
		return this.bus.cartridge.prgBanks[index][address & PrgSizeAND];
	}

	WritePRG(address: number, value: number): void {
		if (address < 0x8000)
			return;

		this.bus.cartridge.prgIndex[0] = value & 0x7;
	}

	ReadCHR(address: number): number {
		let dataIndex = address & 0xF;
		address >>= 4;
		return this.chrRamTiles[address].data[dataIndex];
	}

	GetCHRTile(address: number) {
		return this.chrRamTiles[address];
	}

	WriteCHR(address: number, value: number): void {
		let dataIndex = address & 0xF;
		address >>= 4;
		this.chrRamTiles[address].SetData(dataIndex, value);
	}

}