import { Bus } from "./Bus";
import { CPU } from "./CPU/CPU";
import { Cartridge } from "./CPU/Cartridge";
import { DebugUtils } from "./Debug/DebugUtils";
import { NESOption } from "./NESOption";
import { PPU } from "./PPU/PPU";
import { Screen } from "./PPU/Screen";

export class NES {

	bus: Bus;
	screen?: Screen;

	constructor(option: NESOption) {
		this.bus = new Bus();
		new CPU(this.bus);
		new Cartridge(this.bus);
		new PPU(this.bus);
		new DebugUtils(this.bus);

		this.screen = new Screen(option.screen);
		this.SetDebug(option);
	}

	Reset() {
		this.bus.cpu.Reset();
		this.bus.ppu.Reset();
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
		this.screen?.SetPixels(this.bus.ppu.screenPixels);
	}

	LoadFile(data: ArrayBuffer) {
		let temp = new Uint8Array(data);
		this.bus.cartridge.LoadRom(temp);
		this.bus.cpu.Reset();
	}

	/**更新调色板信息 */
	SetDebug(option: NESOption) {
		this.bus.debug.SetPatternCanvas(option);
		this.bus.debug.SetDisassemblerDiv(option);
	}

}