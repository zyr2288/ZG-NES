import { CPU } from "./CPU/CPU";
import { PPU } from "./PPU/PPU";
import { APU } from "./Audio/APU";
import { Cartridge } from "./CPU/Cartridge";
import { DebugUtils } from "./Debug/DebugUtils";
import { Controller } from "./Input/Controller";
import { ClockRate, MachineType } from "./NESConst";
import { API } from "./Interface/API";

export class Bus {

	cpu!: CPU;
	ppu!: PPU;
	apu!: APU;
	cartridge!: Cartridge;
	controller!: Controller;

	debug?: DebugUtils;
	api!: API;

	endFrame = true;

	private cpuClockRate: number = ClockRate.NTSC;
	private machineType: MachineType = MachineType.NSTC;
	private systemClockCount = 0;

	Reset() {
		this.cpu.Reset();
		this.systemClockCount = 0;
	}

	Clock() {
		while (true) {
			this.systemClockCount++;
			this.ppu.Clock();
			if (this.systemClockCount >= this.cpuClockRate) {
				this.systemClockCount -= this.cpuClockRate;
				this.apu.Clock();
				if (this.cpu.Clock()) {
					break;
				}
			}
		}
	}

	StartFrame() { this.endFrame = false; }
	EndFrame() { this.endFrame = true; }

	ReadByte(address: number) {
		if (address < 0x2000)
			return this.cpu.ram[address & 0x7FF];

		if (address >= 0x2000 && address <= 0x2007)
			return this.ppu.ReadIO(address);

		if (address === 0x4016 || address === 0x4017)
			return this.controller.ReadIO(address);

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

		if (address >= 0x2000 && address <= 0x2007 || address === 0x4014) {
			this.ppu.WriteIO(address, value);
			return;
		}

		if (address >= 0x4000 && address <= 0x4015) {
			this.apu.WriteIO(address, value);
			return;
		}

		if (address === 0x4016) {
			this.controller.WriteIO(address, value);
			return;
		}

		if (address < 0x8000 && this.cartridge.useSRAM) {
			this.cpu.sram[address & 0x1FFF] = value;
			return;
		}

		this.cartridge.mapper.WritePRG(address, value);
	}
}