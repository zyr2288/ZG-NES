import { Bus } from "./Bus";
import { CPU } from "./CPU/CPU";
import { Rom } from "./CPU/Rom";
import { PPU } from "./PPU/PPU";

export class NES {

	bus: Bus;

	private cpu: CPU;
	private rom: Rom;
	private ppu: PPU;

	constructor() {
		this.bus = new Bus();
		this.cpu = new CPU(this.bus);
		this.rom = new Rom(this.bus);
		this.ppu = new PPU(this.bus);
	}

	/**执行一帧 */
	OneFrame() {

	}

	LoadFile(data: ArrayBuffer) {
		let temp = new Uint8Array(data);
		this.rom.LoadRom(temp);
	}
}

// @ts-ignore
globalThis || (globalThis = this);

// @ts-ignore
globalThis.NES = NES;