import { BitValueRev } from "../NESConst";

export class Sprite {
	x = 0;
	y = 0;
	tileIndex = 0;
	hFlip = false;
	vFlip = false;
	hideInBg = false;
	colorIndex = 0;
}

export class Tile {

	data = new Uint8Array(0x10);
	colorData: number[][] = [];

	constructor(data: Uint8Array) {
		this.data = data;
		for (let x = 0; x < 8; x++) {
			this.colorData[x] = [];
			for (let y = 0; y < 8; y++) {
				this.colorData[x][y] = 0;
			}
		}
		for (let i = 0; i < this.data.length; i++)
			this.SetData(i, this.data[i]);
	}

	GetData(x: number, y: number) {
		return this.colorData[x][y];
	}

	SetData(index: number, value: number) {
		this.data[index] = value;
		let y = index & 7;
		let bit = 1;
		let antiBit = 2;
		if (index > 7) {
			bit = 2;
			antiBit = 1;
		}

		for (let x = 0; x < 8; x++) {
			if ((value & BitValueRev[x]) !== 0)
				this.colorData[x][y] |= bit;
			else
				this.colorData[x][y] &= antiBit;
		}
	}
}