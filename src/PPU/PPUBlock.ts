import { BitValueRev } from "../NESConst";

export class Sprite {
	/**Byte 4 */
	x = 0;
	/**Byte 0 */
	y = 0;
	/**Byte 1 */
	tileIndex = 0;
	hFlip = false;
	vFlip = false;
	hideInBg = false;
	paletteIndex = 0;

	isZero = false;
	useble = false;
	rendered = false;

	SetData(data: Uint8Array, index: number, isZero: boolean) {
		this.y = data[index++];
		this.tileIndex = data[index++];

		let value = data[index++];
		this.paletteIndex = value & 3;
		this.hideInBg = (value & 0x20) !== 0;
		this.hFlip = (value & 0x40) !== 0;
		this.vFlip = (value & 0x80) !== 0;

		this.x = data[index++];
		this.isZero = isZero;
		this.useble = true;
	}

	SetAttribute(value: number) {
		this.paletteIndex = value & 3;
		this.hideInBg = (value & 0x20) !== 0;
		this.hFlip = (value & 0x40) !== 0;
		this.vFlip = (value & 0x80) !== 0;
	}

	// constructor(data1_y: number, data2_index: number, data3_attr: number, data4_x: number, isZero = false) {
	// 	this.x = data4_x;
	// 	this.y = data1_y;
	// 	this.tileIndex = data2_index;

	// 	this.paletteIndex = data3_attr & 3;
	// 	this.hideInBg = (data3_attr & 0x20) !== 0;
	// 	this.hFlip = (data3_attr & 0x40) !== 0;
	// 	this.vFlip = (data3_attr & 0x80) !== 0;
	// }
}

export class RenderSprite {
	paletteIndex = 0;
	isZero = false;
	hideInBG = false;
	used = false;
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