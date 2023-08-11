import { NesColorRGB } from "../NESConst";

const ScreenWidth = 256;
const ScreenHeight = 240;
const Scale = 3;

export class Screen {

	content: CanvasRenderingContext2D;
	imageData: ImageData;
	private canvas: HTMLCanvasElement;

	constructor(canvas: HTMLCanvasElement) {
		this.canvas = canvas;
		canvas.width = ScreenWidth * Scale;
		canvas.height = ScreenHeight * Scale;
		this.content = canvas.getContext("2d")!;
		this.content.scale(Scale, Scale);

		this.imageData = new ImageData(ScreenWidth, ScreenHeight);
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

		this.content.putImageData(this.imageData, 0, 0);
		this.content.drawImage(this.canvas, 0, 0);
	}
}