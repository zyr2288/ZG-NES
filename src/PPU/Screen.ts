export class Screen {
	pixels: Uint8Array;

	constructor() {
		this.pixels = new Uint8Array(256 * 240);
	}
}