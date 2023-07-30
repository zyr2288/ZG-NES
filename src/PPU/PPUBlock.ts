export class Sprite {
	x = 0;
	y = 0;
	hFlip = false;
	vFlip = false;
	hideInBg = false;
	colorIndex = 0;
}

export class Tile {
	data = new Uint8Array(0x10);

	constructor(data: Uint8Array) {
		this.data = data;
	}

	GetData(x: number, y: number) {

	}

	SetData(x: number, y: number, value: number) {

	}
}