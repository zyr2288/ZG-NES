import { Bus } from "../Bus";
import { PatternTable } from "./PatternTable";

export class DebugUtils {
	patternTable!: PatternTable;
	private readonly bus: Bus;

	constructor(bus: Bus) {
		this.bus = bus;
	}

	SetPatternCanvas(canvas: HTMLCanvasElement) {
		this.patternTable = new PatternTable({ canvas, bus: this.bus });
	}


}