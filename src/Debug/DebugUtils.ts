import { Bus } from "../Bus";
import { NESOption } from "../NESOption";
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
	SetPatternCanvas(option: NESOption) {
		this.patternTable = new PatternTable(this.bus, option);
	}

	SetDisassemblerDiv(option: NESOption) {
		this.diassembler = new Disassembler(this.bus, option);
	}
}