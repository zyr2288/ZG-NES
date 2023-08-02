import { Bus } from "../Bus";
import { NesColors } from "../NESConst";
import { Tile } from "../PPU/PPUBlock";

const PixWidth = 2;

export class PatternTable {

	private context: CanvasRenderingContext2D;
	private readonly bus: Bus;

	constructor(option: { canvas: HTMLCanvasElement, bus: Bus }) {
		this.context = option.canvas.getContext("2d")!;
		option.canvas.width = PixWidth * 8 * 16 * 2;
		option.canvas.height = PixWidth * 8 * 16;

		this.bus = option.bus;
	}

	UpdatePattern() {
		let x = 0;
		let y = 0;

		let chrIndex = 0;
		let colors: string[] = [];
		for (let i = 0; i < this.bus.ppu.colorTable.length; i++) {
			let index = this.bus.ppu.colorTable[i];
			colors[i] = "#" + NesColors[index].toString(16).padStart(6, "0");
		}

		for (let i = 0; i < 0x200; i++) {
			let tile = this.bus.rom.ReadChrRom(chrIndex & 0xFF, chrIndex > 0xFF);
		}
	}

	private DrawTiles(x: number, y: number, width: number, tiles: Tile, colors: string[]) {
		for (let pixY = 0; pixY < 8; pixY++) {
			for (let pixX = 0; pixX < 8; pixX++) {
				let colorIndex = tiles.GetData(pixX, pixY);
				this.context.fillStyle = colors[colorIndex];
				this.context.fillRect(x + pixX * width, y + pixY * width, width, width);
			}
		}
	}
}