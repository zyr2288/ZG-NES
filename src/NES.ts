import { Bus } from "./Bus";
import { CPU } from "./CPU/CPU";
import { Rom } from "./CPU/Rom";
import { DebugUtils } from "./Debug/DebugUtils";
import { PPU } from "./PPU/PPU";

export class NES {

	bus: Bus;

	// private cpu: CPU;
	// private rom: Rom;
	// private ppu: PPU;
	// private debug: DebugUtils;

	constructor() {
		this.bus = new Bus();
		new CPU(this.bus);
		new Rom(this.bus);
		new PPU(this.bus);
		new DebugUtils(this.bus);
	}

	Reset() {
		this.bus.cpu.Reset();
	}

	/**执行一帧 */
	OneFrame() {

	}

	LoadFile(data: ArrayBuffer) {
		let temp = new Uint8Array(data);
		this.bus.rom.LoadRom(temp);
		this.bus.cpu.Reset();
	}

	/**更新调色板信息 */
	SetDebug(option: { canvas: HTMLCanvasElement, disasm: HTMLDivElement, register: HTMLDivElement, flagDiv: HTMLDivElement }) {
		this.bus.debug.SetPatternCanvas(option.canvas);
		this.bus.debug.SetDisassemblerDiv(option);
	}

}