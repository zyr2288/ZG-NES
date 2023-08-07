import { CPU } from "./CPU/CPU";
import { Cartridge } from "./CPU/Cartridge";
import { DebugUtils } from "./Debug/DebugUtils";
import { IMapper } from "./Mapper/IMapper";
import { PPU } from "./PPU/PPU";

export class Bus {

	cpu!: CPU;
	cartridge!: Cartridge;
	ppu!: PPU;
	mapper!: IMapper;

	debug!: DebugUtils;

	private systemClockCount = 0;

	Reset() {
		this.cpu.Reset();
		this.systemClockCount = 0;
	}

	Clock() {
		while (true) {
			this.ppu.Clock();
			if (this.systemClockCount % 3 === 0) {
				if (this.cpu.Clock())
					break;
			}

			this.systemClockCount++;
		}
	}

	ReadByte(address: number) {
		if (address < 0x2000)
			return this.cpu.ram[address & 0x7FF];

		if (address < 0x8000)
			return this.cartridge.useSRAM ? 0 : this.cpu.sram[address & 0x1FFF];

		return this.cartridge.mapper.ReadPRG(address);
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

		if (address < 0x8000 && this.cartridge.useSRAM) {
			this.cpu.sram[address & 0x1FFF] = value;
			return;
		}

		this.mapper.WritePRG(address, value);
	}
}