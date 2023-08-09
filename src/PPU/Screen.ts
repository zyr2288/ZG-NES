export class Screen {

	content: CanvasRenderingContext2D;
	imageData: ImageData;

	constructor(canvas: HTMLCanvasElement) {
		this.content = canvas.getContext("2d")!;
		this.imageData = new ImageData(256, 240);
	}

	SetPixels(data: Uint8Array) {
		for (let i = 0; i < data.length; i++)
			this.imageData.data[i] = data[i];

		this.content.putImageData(this.imageData, 0, 0);
	}
}