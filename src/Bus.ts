import { CPU } from "./CPU/CPU";
import { Rom } from "./CPU/Rom";
import { IMapper } from "./Mapper/IMapper";
import { PPU } from "./PPU/PPU";

export class Bus {

	cpu: CPU;
	rom: Rom;
	ppu: PPU;
	mapper: IMapper;

	ReadByte(address: number) {
		if (address < 0x2000)
			return this.cpu.ram[address & 0x7FF];

		if (address < 0x8000)
			return this.rom.useSRAM ? 0 : this.cpu.sram[address & 0x1FFF];

		let tempAdd = (address & 0x7000) >> 12;
		let index = this.rom.prgIndex[tempAdd];
		let result = this.rom.prgBanks[index][address & 0xFFF];
		return result;
	}

	ReadWord(address: number) {
		let result = this.ReadByte(address);
		result |= this.ReadByte(address + 1) << 8;
		return result;
	}

	WriteByte(address: number, value: number) {
		if (address < 0x2000) {
			this.cpu.ram[address & 0x7FF] = value;
			return;
		}

		if (address < 0x8000 && this.rom.useSRAM) {
			this.cpu.sram[address & 0x1FFF] = value;
			return;
		}

		this.mapper.Write(address, value);
	}
}