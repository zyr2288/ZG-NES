import { Bus } from "../Bus";
import { IMapper } from "./IMapper";

export class Mapper2 implements IMapper {
	readonly bus!: Bus;
	prgSize: number = 0x4000;
	chrSize: number = 0;

	prgOffset: number[] = [0x8000, 0x8000, 0xC000, 0xC000];
	chrOffset: number[] = [];

	Initialization(option: { maxPrg: number }): void {
		this.bus.cartridge.prgIndex = [0, 0, option.maxPrg, option.maxPrg];
		this.bus.ppu.useChrRam = true;
	}

	WritePRG(address: number, value: number): void {
		if (address < 0x8000)
			return;

		this.bus.cartridge.prgIndex[0] = this.bus.cartridge.prgIndex[1] = value;
	}

	WriteCHR(address: number, value: number): void {
		
	}

}