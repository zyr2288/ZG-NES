import { Bus } from "../Bus";
import { IMapper } from "./IMapper";

export class Mapper0 implements IMapper {

	readonly bus: Bus;
	prgSize: number = 0x4000;
	chrSize: number = 0x1000;

	prgOffset: number[] = [0x8000, 0x8000, 0xC000, 0xC000];
	chrOffset: number[] = [0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000, 0x0000];

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.mapper = this;
	}

	Initialization(option: { maxPrg: number }): void {
		this.bus.cartridge.prgIndex = [0, 0, 1, 1];
		this.bus.cartridge.chrIndex = [0, 0, 0, 0, 1, 1, 1, 1];
	}

	WritePRG(address: number, value: number) { }

	WriteCHR(address: number, value: number): void { }
}