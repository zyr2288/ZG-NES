import { Bus } from "./Bus";
import { CPU } from "./CPU/CPU";
import { Cartridge } from "./CPU/Cartridge";
import { DebugUtils } from "./Debug/DebugUtils";
import { PPU } from "./PPU/PPU";

export class NES {

	bus: Bus;

	constructor() {
		this.bus = new Bus();
		new CPU(this.bus);
		new Cartridge(this.bus);
		new PPU(this.bus);
		new DebugUtils(this.bus);
	}

	Reset() {
		this.bus.cpu.Reset();
	}

	/**执行一帧 */
	OneFrame() {
		while (true) {
			this.bus.Clock();
			if (this.bus.cpu.clock >= this.bus.frameCpuClock) {
				this.bus.cpu.clock -= this.bus.frameCpuClock;
				break;
			}
		}
	}

	LoadFile(data: ArrayBuffer) {
		let temp = new Uint8Array(data);
		this.bus.cartridge.LoadRom(temp);
		this.bus.cpu.Reset();
	}

	/**更新调色板信息 */
	SetDebug(option: { canvas: HTMLCanvasElement, disasm: HTMLDivElement, register: HTMLDivElement, flagDiv: HTMLDivElement }) {
		this.bus.debug.SetPatternCanvas(option.canvas);
		this.bus.debug.SetDisassemblerDiv(option);
	}

}