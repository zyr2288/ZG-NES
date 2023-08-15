import { OutBuffer } from "./Audio/APU";

export interface NESOption {
	screen?: HTMLCanvasElement;
	pattern?: HTMLCanvasElement;
	disasm?: HTMLDivElement;
	register?: HTMLDivElement;
	flagDiv?: HTMLDivElement;
	info?: HTMLDivElement;

	sampleRate?: number;
	sampleLength?: number;

	OnFrame?: (data: Uint8Array) => void;
	OnAudio?: (data: OutBuffer) => void;
}