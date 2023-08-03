import { Bus } from "../Bus";
import { AddressingMode, Instruction, OperationTable } from "../CPU/OperationTable";

const LeftLength = 10;

export class Disassembler {

	private readonly bus: Bus;
	private readonly div: HTMLDivElement;

	constructor(option: { div: HTMLDivElement, bus: Bus }) {
		this.bus = option.bus;
		this.div = option.div;
	}

	private * DisAsm(address: number, length: number) {
		let line = "";
		let data = 0;
		while (true) {
			const opcode = this.bus.ReadByte(address++);
			address++;
			address &= 0xFFFF;
			const entry = OperationTable[opcode];
			line = opcode.toString(16).padStart(2, "0");
			if (!entry) {
				yield `${line.padEnd(LeftLength, " ")}Unknow\n`;
				continue;
			}

			switch (entry.bytes) {
				case 1:
					line = line.padEnd(10, " ") + Instruction[entry.instruction] + "\n";
				case 2:
					data = this.bus.ReadByte(address);
					line = `${line} ${this.GetByteHex(data)}`.padEnd(LeftLength, " ");
				case 3:
					data = this.bus.ReadByte(address);
					address++;
					address &= 0xFFFF;
					let byte2 = this.bus.ReadByte(address);
					line = `${line} ${this.GetByteHex(data)} ${this.GetByteHex(byte2)}`.padEnd(LeftLength, " ");
					data |= byte2 << 8;
			}
			yield line + Instruction[entry.instruction] + this.GetAddress(entry.addressingMode, address, data) + "\n";
		}
	}

	private GetAddress(addMode: AddressingMode, pc: number, value: number) {
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

				if ((value & 0x80) !== 0)
					value -= 0x100;

				pc += value;
				return this.StringFormat("${0}", this.GetWordHex(pc));;
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