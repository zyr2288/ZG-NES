import { Bus } from "../Bus";
import { NesColorRGB } from "../NESConst";

export class Screen {

	content: CanvasRenderingContext2D;
	imageData: ImageData;

	constructor(canvas: HTMLCanvasElement) {
		canvas.width = 256;
		canvas.height = 240;
		this.content = canvas.getContext("2d")!;
		this.imageData = new ImageData(256, 240);
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
	}
}