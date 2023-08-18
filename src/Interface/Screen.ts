import { NesColorRGB } from "../NESConst";

const Width = 256;
const Height = 240;
const Scale = 1;

export class Screen {

	private canvas: HTMLCanvasElement;
	private context: CanvasRenderingContext2D;
	private imageData: ImageData;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		canvas.width = Width * Scale;
		canvas.height = Height * Scale;
		this.context = canvas.getContext("2d")!;
		this.context.scale(Scale, Scale);
		this.imageData = new ImageData(Width, Height);
	}

	SetPixels(data: Uint8Array) {
		let index = 0, imageDataIndex = 0, length = data.length, colorIndex;
		while (index < length) {
			colorIndex = data[index];
			this.imageData.data[imageDataIndex++] = NesColorRGB[colorIndex][0];
			this.imageData.data[imageDataIndex++] = NesColorRGB[colorIndex][1];
			this.imageData.data[imageDataIndex++] = NesColorRGB[colorIndex][2];
			this.imageData.data[imageDataIndex++] = 0xFF;
			index++;
		}

		this.context.putImageData(this.imageData, 0, 0);
		this.context.drawImage(this.canvas, 0, 0);
	}
}