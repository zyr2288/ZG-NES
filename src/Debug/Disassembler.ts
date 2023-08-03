import { Bus } from "../Bus";
import { AddressingMode, OperationTable } from "../CPU/OperationTable";

export class Disassembler {

	private readonly bus: Bus;
	private readonly div: HTMLDivElement;

	constructor(option: { div: HTMLDivElement, bus: Bus }) {
		this.bus = option.bus;
		this.div = option.div;
	}

	private DisAsm(address: number, length: number) {
		for (let i = 0; i < length; i++) {
			const opcode = this.bus.ReadByte(address);
			const entry = OperationTable[opcode];
			if (!entry)
				return `${opcode.toString(16).padStart(2, "0").padEnd(10, " ")}Unknow`;

			entry.addressingMode
		}
	}

	private GetAddress(addMode: AddressingMode, value: number) {
		switch (addMode) {
			case AddressingMode.ABSOLUTE:
				return this.StringFormat("${0}", this.GetWordHex(value));
			case AddressingMode.ABSOLUTE_X:
				return this.StringFormat("${0},X", this.GetWordHex(value));
			case AddressingMode.ABSOLUTE_Y:
				return this.StringFormat("${0},Y", this.GetWordHex(value));
			case AddressingMode.ACCUMULATOR:
				return "A";
			case AddressingMode.IMMEDIATE:
				return this.StringFormat("#${0}", this.GetByteHex(value));
			case AddressingMode.IMPLICIT:
				return "";
			case AddressingMode.INDIRECT:
				return this.StringFormat("(${0})", this.GetWordHex(value));
			case AddressingMode.INDIRECT_Y_INDEXED:
				return this.StringFormat("(${0}),Y", this.GetWordHex(value));
			case AddressingMode.RELATIVE:
				return "";
			case AddressingMode.X_INDEXED_INDIRECT:
				return this.StringFormat("(${0},X)", this.GetWordHex(value));
			case AddressingMode.ZERO_PAGE:
				return this.StringFormat("${0}", this.GetByteHex(value));
			case AddressingMode.ZERO_PAGE_X:
				return this.StringFormat("${0},X", this.GetByteHex(value));
			case AddressingMode.ZERO_PAGE_Y:
				return this.StringFormat("${0},Y", this.GetByteHex(value));
		}
	}

	private StringFormat(text: string, ...params: string[]) {
		for (let i = 0; i < params.length; ++i)
			text = text.replace(`{${i}}`, params[i]);

		return text;
	}

	private GetByteHex(code: number) {
		return code.toString(16).padStart(2, "0");
	}

	private GetWordHex(code: number) {
		return code.toString(16).padStart(4, "0");
	}
}