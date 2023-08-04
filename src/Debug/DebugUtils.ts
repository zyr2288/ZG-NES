import { Bus } from "../Bus";
import { Disassembler } from "./Disassembler";
import { PatternTable } from "./PatternTable";

export class DebugUtils {

	patternTable?: PatternTable;
	diassembler?: Disassembler;

	private readonly bus: Bus;

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.debug = this;
	}

	/**设定贴图表的Canvas */
	SetPatternCanvas(canvas: HTMLCanvasElement) {
		this.patternTable = new PatternTable({ canvas, bus: this.bus });
	}

	SetDisassemblerDiv(option: { disasm: HTMLDivElement, register: HTMLDivElement, flagDiv: HTMLDivElement }) {
		// @ts-ignore
		let temp: typeof option & { bus: Bus } = option;
		temp.bus = this.bus;
		this.diassembler = new Disassembler(temp);
	}
}