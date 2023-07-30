import { Bus } from "../Bus";
import type { Tile } from "./PPUBlock";

export class PPU {
	tiles: Tile[];

	private readonly bus:Bus;

	constructor(bus:Bus) {
		this.bus = bus;
		this.bus.ppu = this;
	}
}