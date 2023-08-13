import { APU } from "./Audio/APU/APU";
import { Bus } from "./Bus";
import { CPU } from "./CPU/CPU";
import { Cartridge } from "./CPU/Cartridge";
import { DebugUtils } from "./Debug/DebugUtils";
import { Controller } from "./Input/Controller";
import { InputAPI } from "./Input/InputAPI";
import { NESOption } from "./NESOption";
import { PPU } from "./PPU/PPU";
import { Screen } from "./PPU/Screen";

export class NES {

	bus: Bus;
	inputAPI: InputAPI;
	screen?: Screen;

	private info?: HTMLDivElement;

	constructor(option: NESOption) {
		this.bus = new Bus();
		new CPU(this.bus);
		new PPU(this.bus);
		new APU(this.bus, option);
		new Cartridge(this.bus);
		new DebugUtils(this.bus);
		new Controller(this.bus);

		this.screen = new Screen(option.screen);
		this.inputAPI = new InputAPI(this.bus, option);
		this.SetDebug(option);

		this.info = option.info;
	}

	Reset() {
		this.bus.cpu.Reset();
		this.bus.ppu.Reset();
		this.bus.apu.Reset();
	}

	/**执行一帧 */
	OneFrame() {
		this.bus.StartFrame();
		while (true) {
			this.bus.Clock();
			if (this.bus.endFrame)
				break;
		}
		this.screen?.SetPixels(this.bus.ppu.screenPixels);
		if (this.info)
			this.info.innerText = this.bus.cpu.clock.toString();
		// console.log(this.bus.cpu.ram[0x04], this.bus.cpu.ram[0xF1]);
	}

	LoadFile(data: ArrayBuffer) {
		let temp = new Uint8Array(data);
		this.bus.cartridge.LoadRom(temp);
		this.Reset();
	}

	/**更新调色板信息 */
	SetDebug(option: NESOption) {
		this.bus.debug.SetPatternCanvas(option);
		this.bus.debug.SetDisassemblerDiv(option);
	}

	OutputAudio(out: Float32Array) {
		this.bus.apu.blipBuf.ReadSample(out.length, false);
		for (let i = 0; i < out.length; i++) {
			out[i] = this.bus.apu.blipBuf.outBuffer[i] / 32768;
		}

		return this.bus.apu.blipBuf.BufAvail < out.length;
	}
}