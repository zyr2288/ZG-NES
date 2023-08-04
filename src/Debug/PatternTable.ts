import { Bus } from "../Bus";
import { NesColorsStr } from "../NESConst";
import { Tile } from "../PPU/PPUBlock";

const PixWidth = 2;
const ColorTableWidth = 32;

export class PatternTable {

	private context: CanvasRenderingContext2D;
	private readonly bus: Bus;

	constructor(option: { canvas: HTMLCanvasElement, bus: Bus }) {
		this.context = option.canvas.getContext("2d")!;

		option.canvas.width = PixWidth * 8 * 16 * PixWidth;
		option.canvas.height = PixWidth * 8 * 16 + ColorTableWidth * 2;

		this.bus = option.bus;
	}

	Update() {
		let x = 0;
		let y = 0;

		let colors: string[] = [];
		for (let i = 0; i < this.bus.ppu.colorTable.length; i++) {
			let index = this.bus.ppu.colorTable[i];
			colors[i] = NesColorsStr[index];
		}

		for (let i = 0; i < 0x100; i++) {
			let tile = this.bus.rom.ReadChrRom(i, true);
			this.DrawTiles(x, y, PixWidth, tile, colors);
			x += PixWidth * 8;
			if ((i & 0xF) === 0xF) {
				x = 0;
				y += PixWidth * 8;
			}
		}

		const DefaultX = PixWidth * 8 * 16;
		x = DefaultX;
		y = 0;
		for (let i = 0; i < 0x100; i++) {
			let tile = this.bus.rom.ReadChrRom(i, false);
			this.DrawTiles(x, y, PixWidth, tile, colors);
			x += PixWidth * 8;
			if ((i & 0xF) === 0xF) {
				x = DefaultX;
				y += PixWidth * 8;
			}
		}

		x = 0;
		y = PixWidth * 8 * 16;
		for (let i = 0; i < this.bus.ppu.colorTable.length; i++) {
			let index = this.bus.ppu.colorTable[i];
			this.DrawColor(x, y, ColorTableWidth, NesColorsStr[index]);
			x += ColorTableWidth;
			if ((i & 0xF) === 0xF) {
				x = 0;
				y += ColorTableWidth;
			}
		}
	}

	private DrawTiles(x: number, y: number, width: number, tile: Tile, colors: string[]) {
		if (!tile)
			throw "Tile 不存在";

		for (let pixY = 0; pixY < 8; pixY++) {
			for (let pixX = 0; pixX < 8; pixX++) {
				let colorIndex = tile.GetData(pixX, pixY);
				this.context.fillStyle = colors[colorIndex];
				this.context.fillRect(x + pixX * width, y + pixY * width, width, width);
			}
		}
	}

	private DrawColor(x: number, y: number, width: number, color: string) {
		this.context.fillStyle = color;
		this.context.fillRect(x, y, width, width);
	}
}