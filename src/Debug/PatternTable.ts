export class PatternTable {
	context: CanvasRenderingContext2D;

	constructor(canvas: HTMLCanvasElement) {
		this.context = canvas.getContext("2d")!;
	}
}