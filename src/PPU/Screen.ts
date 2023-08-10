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
		for (let i = 0; i < data.length; i++)
			this.imageData.data[i] = data[i];

		this.content.putImageData(this.imageData, 0, 0);
	}
}