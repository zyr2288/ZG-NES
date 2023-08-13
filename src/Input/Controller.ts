import { Bus } from "../Bus";

export enum ButtonType { A, B, Select, Start, Up, Down, Left, Right }

export class Controller {

	/**按钮状态 */
	buttonStatue: boolean[][] = [];

	private bit = [0, 0];
	private bitRoll = false;
	private readonly bus: Bus;

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.controller = this;
		for (let i = 0; i < 2; i++) {
			this.buttonStatue[i] = [];
			this.buttonStatue[i].length = 8;
			this.buttonStatue[i].fill(false);
		}
	}

	WriteIO(address: number, value: number) {
		switch (address) {
			case 0x4016:
				this.bitRoll = (value & 1) === 0
				if (!this.bitRoll)
					this.bit[0] = this.bit[1] = 0;
				break;
		}
	}

	ReadIO(address: number) {
		let controllerIndex = 0;
		switch (address) {
			case 0x4016:
				break;
			case 0x4017:
				controllerIndex = 1;
				break;
			default:
				return 0;
		}

		const bit = this.bit[controllerIndex];
		if (this.bitRoll) {
			this.bit[controllerIndex]++;
			this.bit[controllerIndex] &= 7;
		} else {
			this.bit[0] = this.bit[1] = 0;
		}

		return this.buttonStatue[controllerIndex][bit] ? 0x41 : 0x40;
	}
}