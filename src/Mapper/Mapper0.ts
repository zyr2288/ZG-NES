import { Bus } from "../Bus";
import { IMapper } from "./IMapper";

export class Mapper0 implements IMapper {

	readonly bus: Bus;
	prgSize: number;
	chrSize: number;

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.mapper = this;
	}

	Initialization(): void {
		
	}

	SwitchBank(address: number, value: number) {
		
	}
}