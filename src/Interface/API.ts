import { OutBuffer } from "../Audio/APU";
import { Bus } from "../Bus";
import { NESOption } from "../NESOption";

export class API {
	OnFrame?: (data: Uint8Array) => void;
	OnAudio?: (data: OutBuffer) => void;
	constructor(bus: Bus, option?: NESOption) {
		bus.api = this;
		if (option?.OnFrame)
			this.OnFrame = option.OnFrame;

		if (option?.OnAudio)
			this.OnAudio = option.OnAudio;
	}
}