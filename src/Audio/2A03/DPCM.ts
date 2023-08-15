import { Bus } from "../../Bus";

export class DPCM {

	enable = false;

	private readonly bus: Bus;
	constructor(bus: Bus) {
		this.bus = bus;
	}

	Clock() {

	}
}