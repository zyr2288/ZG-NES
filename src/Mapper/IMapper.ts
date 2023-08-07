import { Bus } from "../Bus";
import { Tile } from "../PPU/PPUBlock";
import { Mapper0 } from "./Mapper0";
import { Mapper2 } from "./Mapper2";

export interface IMapper {
	readonly bus: Bus;

	prgSize: number;
	chrSize: number;
	/**使用CHR-RAM的Tile */
	chrRamTiles?: Tile[];

	/**
	 * Mapper初始化
	 * @param option 最大PRG的编号
	 */
	Initialization(option: { maxPrg: number }): void;

	ReadPRG(address: number): number;
	WritePRG(address: number, value: number): void;

	ReadCHR(address: number): number;
	/**
	 * 获取Tile
	 * @param tileIndex Tile的索引，右边请加上0x100
	 */
	GetCHRTile(tileIndex: number): Tile;
	WriteCHR(address: number, value: number): void;

	PPUClockEvent?(scanLine: number, ppuCycle: number): void;
}

export class MapperLoader {

	static LoadMapper(mapperIndex: number) {
		switch (mapperIndex) {
			case 0: return Mapper0;
			case 2: return Mapper2;
		}
	}
}