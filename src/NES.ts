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

	/**执行一帧 */
	OneFrame() {

	}

	LoadFile(data: ArrayBuffer) {
		let temp = new Uint8Array(data);
		this.bus.rom.LoadRom(temp);
	}

	TestFunction(canvas:HTMLCanvasElement) {
		this.bus.debug.SetPatternCanvas(canvas);
	}
}