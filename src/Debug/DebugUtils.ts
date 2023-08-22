import { Bus } from "../Bus";
import { NESOption } from "../NESOption";
import { Disassembler } from "./Disassembler";
import { PatternTable } from "./PatternTable";

export class DebugUtils {

	patternTable?: PatternTable;
	diassembler?: Disassembler;

	private readonly bus: Bus;

	constructor(bus: Bus, option: NESOption) {
		this.bus = bus;
		this.bus.debug = this;
		if (option.pattern)
			this.patternTable = new PatternTable(this.bus, option);

		this.diassembler = new Disassembler(this.bus, option);
	}
}