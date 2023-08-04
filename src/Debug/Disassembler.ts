import { Bus } from "../Bus";
import { Flags } from "../CPU/CPU";
import { AddressingMode, Instruction, OperationTable } from "../CPU/OperationTable";

const LeftLength = 20;
const DebugLines = 20;

export class Disassembler {

	private readonly bus: Bus;
	private readonly disasmDiv: HTMLDivElement;
	private readonly registersDiv: HTMLDivElement;
	private readonly checkBox: HTMLInputElement[];

	private preAddress = -1;
	private disAddStart = 0;

	private disResult = { line: "", address: 0 };

	constructor(option: { disasm: HTMLDivElement, register: HTMLDivElement, flagDiv: HTMLDivElement, bus: Bus }) {
		this.bus = option.bus;
		this.disasmDiv = option.disasm;
		this.registersDiv = option.register;
		this.checkBox = [];
		for (let i = 0; i < 8; i++) {
			this.checkBox[i] = document.createElement("input");
			let check = this.checkBox[i];
			check.type = "checkbox";
			option.flagDiv.appendChild(check);
			
			let span = document.createElement("span");
			span.innerText = Flags[i].substring(4);
			option.flagDiv.appendChild(span);

			let br = document.createElement("br");
			option.flagDiv.appendChild(br);
		}
	}

	//#region 更新
	Update() {
		let index = DebugLines;
		this.disResult.address = this.bus.cpu.registers.pc;
		let first = true;
		while (true) {
			if (first) {
				if (this.preAddress === this.disResult.address) {
					let temp = this.disasmDiv.childNodes.item(0);
					this.disasmDiv.removeChild(temp);
					index = 1;
					this.disResult.address = this.disAddStart;
				} else {
					this.disasmDiv.innerHTML = "";
				}
			}

			let tempDiv = document.createElement("div");
			this.DisAsm(this.disResult.address).next();

			if (first) {
				this.preAddress = this.disResult.address;
				first = false;
			}

			tempDiv.innerHTML = this.disResult.line;
			this.disasmDiv.appendChild(tempDiv);

			if (--index <= 0) {
				this.disAddStart = this.disResult.address;
				break;
			}
		}
		this.UpdateRegisters();
		this.UpdateFlags();
	}
	//#endregion 更新

	/***** private *****/

	//#region 反汇编一行内容
	private *DisAsm(address: number) {
		let data = 0;
		let line = "";
		while (true) {
			const opcode = this.bus.ReadByte(address);
			const entry = OperationTable[opcode];
			line = `${this.GetWordHex(address)}: ${opcode.toString(16).padStart(2, "0")}`;

			address++;
			address &= 0xFFFF;

			if (!entry) {
				this.disResult.line = `${line.padEnd(LeftLength, " ")}Unknow`.toUpperCase();
				this.disResult.address = address;
				yield;
				continue;
			}

			switch (entry.bytes) {
				case 1:
					line = line.padEnd(LeftLength, " ");
					break;
				case 2:
					data = this.bus.ReadByte(address);
					line = `${line} ${this.GetByteHex(data)}`.padEnd(LeftLength, " ");
					address++;
					address &= 0xFFFF;
					break;
				case 3:
					data = this.bus.ReadByte(address);
					address++;
					address &= 0xFFFF;
					let byte2 = this.bus.ReadByte(address);
					address++;
					address &= 0xFFFF;
					line = `${line} ${this.GetByteHex(data)} ${this.GetByteHex(byte2)}`.padEnd(LeftLength, " ");
					data |= byte2 << 8;
					break;
			}
			this.disResult.line = `${line}${Instruction[entry.instruction]} ${this.GetAddress(entry.addressingMode, address, data)}`;
			this.disResult.line = this.disResult.line.toUpperCase();
			this.disResult.address = address;
			yield;
		}
	}
	//#endregion 反汇编一行内容

	//#region 获取寻址方式
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
	//#endregion 获取寻址方式

	//#region 更新寄存器
	private UpdateRegisters() {
		let result = "A: " + this.GetByteHex(this.bus.cpu.registers.a) + "\n";
		result += "X: " + this.GetByteHex(this.bus.cpu.registers.x) + "\n";
		result += "Y: " + this.GetByteHex(this.bus.cpu.registers.y) + "\n";
		result += "PC: " + this.GetWordHex(this.bus.cpu.registers.pc) + "\n";

		this.registersDiv.innerText = result;
	}
	//#endregion 更新寄存器

	//#region 更新标识位
	private UpdateFlags() {
		for (let i = 0; i < 8; i++) {
			this.checkBox[i].checked = this.bus.cpu.flags[i];
		}
	}
	//#endregion 更新标识位

	private StringFormat(text: string, ...params: string[]) {
		for (let i = 0; i < params.length; ++i)
			text = text.replace(`{${i}}`, params[i]);

		return text;
	}

	private GetByteHex(code: number) {
		return code.toString(16).toUpperCase().padStart(2, "0");
	}

	private GetWordHex(code: number) {
		return code.toString(16).toUpperCase().padStart(4, "0");
	}
}