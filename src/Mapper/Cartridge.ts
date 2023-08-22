import { Bus } from "../Bus";
import { IMapper, MapperLoader } from "./IMapper";
import { Tile } from "../PPU/PPUBlock";
import { Utils } from "../Utils";

export class Cartridge {
	private readonly bus: Bus;

	useSRAM = false;
	screenMiror = false;

	/**PRG对应的索引， */
	prgIndex: number[] = [];
	/**CHR对应的索引， */
	chrIndex: number[] = [];

	prgCount = 0;
	prgBanks: Uint8Array[] = [];

	chrCount = 0;
	chrRam = false;
	chrBanks: Tile[][] = [];

	mapper!: IMapper;

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.cartridge = this;
	}

	//#region 载入文件
	/**
	 * 载入文件
	 * @param data 文件数据
	 * @returns 是否载入成功
	 */
	LoadRom(data: Uint8Array) {
		if (data[0] != 0x4E || data[1] != 0x45 || data[2] != 0x53 || data[3] != 0x1A)
			return false;

		// mapper
		let tempNum = (data[6] >> 4) + ((data[7] & 0xF) << 4);

		this.prgCount = data[4];
		this.chrCount = data[5];

		this.screenMiror = (data[6] & 0x01) !== 0;
		this.useSRAM = (data[6] & 0x02) !== 0;

		let mapper = MapperLoader.LoadMapper(tempNum);
		if (!mapper)
			throw `不支持 Mapper${tempNum}`;

		this.mapper = new mapper(this.bus);

		//拷贝PRG-ROM次数
		const prgCount = data[4] * 0x4000 / this.mapper.prgSize;

		//拷贝分割好的PRG-ROM
		this.prgBanks = new Array<Uint8Array>(prgCount);
		let tempArray!: Uint8Array;
		for (let i = 0; i < prgCount; i++) {
			tempArray = new Uint8Array(this.mapper.prgSize);
			Utils.CopyArray(data, i * this.mapper.prgSize + 0x10, tempArray, 0);
			this.prgBanks[i] = tempArray;
		}

		//如果PRG-ROM只有一个，则拷贝一个
		if (data[4] == 1)
			this.prgBanks[1] = tempArray;

		const screen = data[6] & 0x01;

		this.bus.ppu.SetMirrorType(screen);

		let chrCount = 1;

		//有CHR-ROM
		if (data[5] !== 0) {
			//拷贝CHR-ROM次数
			chrCount = data[5] * 0x2000 / this.mapper.chrSize;

			//拷贝分割好的CHR-ROM
			this.chrBanks = new Array<Tile[]>(chrCount);

			//一个Bank多少个tile
			let tempNum2 = this.mapper.chrSize / 0x10;

			for (let i = 0; i < chrCount; i++) {
				let tiles: Tile[] = new Array(tempNum2);
				for (let j = 0; j < tempNum2; j++) {
					let temp3: Uint8Array = new Uint8Array(0x10);
					Utils.CopyArray(data,
						0x10 + data[4] * 0x4000 + i * this.mapper.chrSize + j * 0x10,
						temp3,
						0);
					tiles[j] = new Tile(temp3);
				}
				this.chrBanks[i] = tiles;
			}
		}

		this.mapper.Initialization({ maxPrg: prgCount - 1, maxChr: chrCount - 1 });

		return true;
	}
	//#endregion 载入文件

}