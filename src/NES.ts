import { APU } from "./Audio/APU";
import { Bus } from "./Bus";
import { CPU } from "./CPU/CPU";
import { Cartridge } from "./CPU/Cartridge";
import { DebugUtils } from "./Debug/DebugUtils";
import { Controller } from "./Input/Controller";
import { InputAPI } from "./Input/InputAPI";
import { API } from "./Interface/API";
import { NESOption } from "./NESOption";
import { PPU } from "./PPU/PPU";

export class NES {

	bus: Bus;
	inputAPI: InputAPI;

	private info?: HTMLDivElement;

	constructor(option?: NESOption) {
		this.bus = new Bus();
		new CPU(this.bus);
		new PPU(this.bus);
		new APU(this.bus, option);
		new Cartridge(this.bus);
		new Controller(this.bus);
		new API(this.bus, option);

		// new DebugUtils(this.bus);

		this.inputAPI = new InputAPI(this.bus);
	}

	Reset() {
		this.bus.cpu.Reset();
		this.bus.ppu.Reset();
		this.bus.apu.Reset();
	}

	/**执行一帧 */
	OneFrame() {
		if (!this.bus.endFrame)
			return;

		this.bus.StartFrame();
		while (true) {
			this.bus.Clock();
			if (this.bus.endFrame)
				break;
		}
	}

	LoadFile(data: ArrayBuffer) {
		let temp = new Uint8Array(data);
		this.bus.cartridge.LoadRom(temp);
		this.Reset();
	}

	/**更新调色板信息 */
	SetDebug(option: NESOption) {
		this.bus.debug?.SetPatternCanvas(option);
		this.bus.debug?.SetDisassemblerDiv(option);
	}

	OutputAudio(out: Float32Array) {
		this.bus.apu.blipBuf.ReadSample(out.length, false);
		for (let i = 0; i < out.length; i++)
			out[i] = this.bus.apu.blipBuf.outBuffer[i] / 32768;
		
		return out.length - this.bus.apu.blipBuf.BufAvail;
	}
}