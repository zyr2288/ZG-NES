import { CPU } from "./CPU/CPU";
import { Cartridge } from "./CPU/Cartridge";
import { DebugUtils } from "./Debug/DebugUtils";
import { CPUFrameClock, ClockRate, MachineType } from "./NESConst";
import { PPU } from "./PPU/PPU";

export class Bus {

	cpu!: CPU;
	cartridge!: Cartridge;
	ppu!: PPU;
	debug!: DebugUtils;

	frameCpuClock: number = CPUFrameClock.NTSC;
	private cpuClockRate: number = ClockRate.NTSC;
	private machineType: MachineType = MachineType.NSTC;

	private systemClockCount = 0;

	Reset() {
		this.cpu.Reset();
		this.systemClockCount = 0;
	}

	Clock() {
		while (true) {
			this.ppu.Clock();
			if (this.systemClockCount >= this.cpuClockRate) {
				this.systemClockCount -= this.cpuClockRate;
				if (this.cpu.Clock())
					break;
			}
			this.systemClockCount++;
		}
	}

	ReadByte(address: number) {
		if (address < 0x2000)
			return this.cpu.ram[address & 0x7FF];

		if (address >= 0x2000 && address <= 0x2007)
			return this.ppu.Read(address);

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

		if (address >= 0x2000 && address <= 0x2007) {
			this.ppu.Write(address, value);
			return;
		}

		if (address < 0x8000 && this.cartridge.useSRAM) {
			this.cpu.sram[address & 0x1FFF] = value;
			return;
		}

		this.cartridge.mapper.WritePRG(address, value);
	}
}