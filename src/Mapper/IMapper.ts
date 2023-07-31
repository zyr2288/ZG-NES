import { Bus } from "../Bus";
import { Mapper0 } from "./Mapper0";
import { Mapper2 } from "./Mapper2";

export interface IMapper {
	readonly bus: Bus;
	prgSize: number;
	prgOffset: number[];
	chrSize: number;
	chrOffset: number[];
	Initialization(option: { maxPrg: number }): void;
	Write(address: number, value: number): void;
}

export class MapperLoader {
	static LoadMapper(mapperIndex: number) {
		switch (mapperIndex) {
			case 0: return Mapper0;
			case 2: return Mapper2;
		}
	}
}