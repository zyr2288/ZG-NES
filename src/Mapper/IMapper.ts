import { Bus } from "../Bus";
import { Mapper0 } from "./Mapper0";

export interface IMapper {
	readonly bus: Bus;
	prgSize: number;
	chrSize: number;
	SwitchBank(address: number, value: number): void;
	Initialization(): void;
}

export class MapperLoader {
	static LoadMapper(mapperIndex:number) {
		switch(mapperIndex) {
			case 0: return Mapper0;
		}
	}
}