export interface NESOption {
	screen: HTMLCanvasElement;
	pattern?: HTMLCanvasElement;
	disasm?: HTMLDivElement;
	register?: HTMLDivElement;
	flagDiv?: HTMLDivElement;
	info?: HTMLDivElement;
	sampleRate?: number;
}