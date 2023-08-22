import { APU } from "./Audio/APU";
import { Bus } from "./Bus";
import { CPU } from "./CPU/CPU";
import { Cartridge } from "./Mapper/Cartridge";
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

		if (option)
			new DebugUtils(this.bus, option);

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

	OutputAudio(out: Float32Array) {
		this.bus.apu.blipBuf.ReadSample(out.length, false);
		for (let i = 0; i < out.length; i++)
			out[i] = this.bus.apu.blipBuf.outBuffer[i] / 32768;

		return out.length - this.bus.apu.blipBuf.BufAvail;
	}

	UpdateDebug() {
		this.bus.debug?.patternTable?.Update();
		this.bus.debug?.diassembler?.Update();
	}
}