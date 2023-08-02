import { Bus } from "../Bus";
import { AddressingMode, Instruction, OperationTable } from "./OperationTable";

interface AddressData {
	address: number; // Set value to NaN if immediate mode
	data: number; // Set value to NaN if not immediate mode
	CrossPage: boolean;
}

const NMI = 0xFFFA;
const RESET = 0xFFFC;
const IRQ = 0xFFFE;

enum Flags {
	/**Bit:7 Negative/Sign (0=Positive, 1=Negative) */
	FlagN = 7,
	/**Bit:6 Overflow (0=No Overflow, 1=Overflow) */
	FlagV = 6,
	/**Bit:5 Not used (Always 1) */
	FlagU = 5,
	/**Bit:4 Break Flag (0=IRQ/NMI, 1=RESET or BRK/PHP opcode) */
	FlagB = 4,
	/**Bit:3 Decimal Mode (0=Normal, 1=BCD Mode for ADC/SBC opcodes) */
	FlagD = 3,
	/**Bit:2 IRQ Disable (0=IRQ Enable, 1=IRQ Disable) */
	FlagI = 2,
	/**Bit:1 Zero (0=Nonzero, 1=Zero) */
	FlagZ = 1,
	/**Bit:0 Carry (0=No Carry, 1=Carry) */
	FlagC = 0
}

class Register {
	/**寄存器A */
	a = 0;
	/**寄存器X */
	x = 0;
	/**寄存器Y */
	y = 0;
	/**寄存器SP */
	sp = 0;
	/**寄存器P */
	p = 0;
	/**寄存器PC */
	pc = 0;
}



export class CPU {

	readonly CPUFrameClock: number = 0;
	readonly CPUClockRate: number = 0;
	registers = new Register();

	cpuClock: number = 0;

	flags: boolean[] = [false, false, false, false, false, false, false, false];

	ram = new Uint8Array(0x800);
	sram = new Uint8Array(0x2000);

	private addrData = { temp: 0, address: -1, data: -1, crossPage: false };
	private instructionMap!: Map<Instruction, Function>;
	private addressModeMap!: Map<AddressingMode, Function>;
	private readonly bus: Bus;

	constructor(bus: Bus) {
		this.bus = bus;
		this.bus.cpu = this;
		this.SetMap();
	}

	Reset() {
		this.flags[Flags.FlagN] = false;
		this.flags[Flags.FlagV] = false;
		this.flags[Flags.FlagU] = true;
		this.flags[Flags.FlagB] = false;
		this.flags[Flags.FlagD] = false;
		this.flags[Flags.FlagI] = true;
		this.flags[Flags.FlagZ] = false;
		this.flags[Flags.FlagC] = false;

		this.registers.p = 0x24;

		// this.interruptType = 0;
		this.cpuClock = 0;

		// this.irqAddress = this.GetMemoryData(0xFFFE, 2);
		// this.nmiAddress = this.GetMemoryData(0xFFFA, 2);
		// this.registers.pc = this.GetMemoryData(0xFFFC, 2);

		this.registers.a = this.registers.x = this.registers.y = 0;
		this.registers.sp = 0xFF;
	}

	//#region 设定指令映射
	private SetMap() {
		this.instructionMap = new Map([
			[Instruction.ADC, this.ADC],
			[Instruction.AND, this.AND],
			[Instruction.ASL, this.ASL],
			[Instruction.BCC, this.BCC],
			[Instruction.BCS, this.BCS],
			[Instruction.BEQ, this.BEQ],
			[Instruction.BIT, this.BIT],
			[Instruction.BMI, this.BMI],
			[Instruction.BNE, this.BNE],
			[Instruction.BPL, this.BPL],
			[Instruction.BRK, this.BRK],
			[Instruction.BVC, this.BVC],
			[Instruction.BVS, this.BVS],
			[Instruction.CLC, this.CLC],
			[Instruction.CLD, this.CLD],
			[Instruction.CLI, this.CLI],
			[Instruction.CLV, this.CLV],
			[Instruction.CMP, this.CMP],
			[Instruction.CPX, this.CPX],
			[Instruction.CPY, this.CPY],
			[Instruction.DEC, this.DEC],
			[Instruction.DEX, this.DEX],
			[Instruction.DEY, this.DEY],
			[Instruction.EOR, this.EOR],
			[Instruction.INC, this.INC],
			[Instruction.INX, this.INX],
			[Instruction.INY, this.INY],
			[Instruction.JMP, this.JMP],
			[Instruction.JSR, this.JSR],
			[Instruction.LDA, this.LDA],
			[Instruction.LDX, this.LDX],
			[Instruction.LDY, this.LDY],
			[Instruction.LSR, this.LSR],
			[Instruction.NOP, this.NOP],
			[Instruction.ORA, this.ORA],
			[Instruction.PHA, this.PHA],
			[Instruction.PHP, this.PHP],
			[Instruction.PLA, this.PLA],
			[Instruction.PLP, this.PLP],
			[Instruction.ROL, this.ROL],
			[Instruction.ROR, this.ROR],
			[Instruction.RTI, this.RTI],
			[Instruction.RTS, this.RTS],
			[Instruction.SBC, this.SBC],
			[Instruction.SEC, this.SEC],
			[Instruction.SED, this.SED],
			[Instruction.SEI, this.SEI],
			[Instruction.STA, this.STA],
			[Instruction.STX, this.STX],
			[Instruction.STY, this.STY],
			[Instruction.TAX, this.TAX],
			[Instruction.TAY, this.TAY],
			[Instruction.TSX, this.TSX],
			[Instruction.TXA, this.TXA],
			[Instruction.TXS, this.TXS],
			[Instruction.TYA, this.TYA],

			// Illegal instruction
			[Instruction.DCP, this.DCP],
			[Instruction.ISC, this.ISC],
			[Instruction.LAX, this.LAX],
			[Instruction.RLA, this.RLA],
			[Instruction.RRA, this.RRA],
			[Instruction.SAX, this.SAX],
			[Instruction.SLO, this.SLO],
			[Instruction.SRE, this.SRE],
		]);

		this.addressModeMap = new Map([
			[AddressingMode.ABSOLUTE, this.Absolute],
			[AddressingMode.ABSOLUTE_X, this.AbsoluteX],
			[AddressingMode.ABSOLUTE_Y, this.AbsoluteY],
			[AddressingMode.ACCUMULATOR, this.Accumulator],
			[AddressingMode.IMMEDIATE, this.Immediate],
			[AddressingMode.IMPLICIT, this.Implicit],
			[AddressingMode.INDIRECT, this.Indirect],
			[AddressingMode.INDIRECT_Y_INDEXED, this.IndirectYIndexed],
			[AddressingMode.RELATIVE, this.Relative],
			[AddressingMode.X_INDEXED_INDIRECT, this.XIndexedIndirect],
			[AddressingMode.ZERO_PAGE, this.ZeroPage],
			[AddressingMode.ZERO_PAGE_X, this.ZeroPageX],
			[AddressingMode.ZERO_PAGE_Y, this.ZeroPageY],
		]);
	}
	//#endregion 设定指令映射

	//#region 单步
	Step() {
		const opcode = this.bus.ReadByte(this.registers.pc++);
		if (opcode === 0)
			debugger;

		const entry = OperationTable[opcode];
		if (!entry) {
			throw new Error(`Invalid opcode '${opcode}(0x${opcode.toString(16)})', pc: 0x${(this.registers.pc - 1).toString(16)}`);
		}

		if (entry.instruction === Instruction.INVALID) {
			return;
		}

		const addrModeFunc = this.addressModeMap.get(entry.addressingMode);
		if (!addrModeFunc) {
			throw new Error(`Unsuppored addressing mode: ${AddressingMode[entry.addressingMode]}`);
		}

		const ret: AddressData = addrModeFunc.call(this);
		if (ret.CrossPage) {
			this.cpuClock += entry.pageCycles;
		}

		const instrFunc = this.instructionMap.get(entry.instruction);
		if (!instrFunc) {
			throw new Error(`Unsupported instruction: ${Instruction[entry.instruction]}`);
		}

		instrFunc.call(this, ret, entry.addressingMode);
		this.cpuClock += entry.cycles;
	}
	//#endregion 单步

	//#region 操作
	private PushWord(data: number) {
		this.PushByte(data >> 8);
		this.PushByte(data);
	}

	private PushByte(data: number) {
		this.bus.WriteByte(0x100 + this.registers.sp, data);
		this.registers.sp--;
		this.registers.sp &= 0xFF;
	}

	private PopWord() {
		return this.PopByte() | this.PopByte() << 8;
	}

	private PopByte() {
		this.registers.sp++;
		this.registers.sp &= 0xFF;
		return this.bus.ReadByte(0x100 + this.registers.sp);
	}

	private SetNZFlag(data: number) {
		this.SetFlag(Flags.FlagZ, (data & 0xFF) === 0);
		this.SetFlag(Flags.FlagN, !!(data & 0x80));
	}

	private GetData() {
		return this.addrData.data > -1 ? this.addrData.data : this.bus.ReadByte(this.addrData.address);
	}

	private SetFlag(flag: Flags, value: boolean): void {
		this.flags[flag] = value;

		// if (value) {
		// 	this.registers.p |= flag;
		// } else {
		// 	this.registers.p &= ~flag;
		// }
	}

	private IsFlagSet(flag: Flags): boolean {
		return this.flags[flag];
		// return !!(this.registers.p & flag);
	}

	//#region 寻址方式
	private Absolute() {
		this.addrData.address = this.bus.ReadWord(this.registers.pc) & 0xFFFF;
		this.registers.pc += 2;
	}

	private AbsoluteX() {
		this.addrData.temp = this.bus.ReadWord(this.registers.pc);
		this.registers.pc += 2;
		this.addrData.address = this.addrData.temp + this.registers.x;
		this.CrossPage();
	}

	private AbsoluteY() {
		this.addrData.temp = this.bus.ReadWord(this.registers.pc) & 0xFFFF;
		this.registers.pc += 2;
		this.addrData.address = this.addrData.temp + this.registers.y;
		this.CrossPage();
	}

	private Accumulator() {
		this.addrData.data = this.registers.a;
	}

	private Immediate() {
		this.addrData.data = this.bus.ReadByte(this.registers.pc);
		this.registers.pc++;
	}

	private Implicit() {
	}

	private Indirect() {
		this.addrData.address = this.bus.ReadWord(this.registers.pc);
		this.registers.pc += 2;
		if ((this.addrData.address & 0xFF) === 0xFF) { // Hardware bug
			this.addrData.address = this.bus.ReadByte(this.addrData.address & 0xFF00) << 8 | this.bus.ReadByte(this.addrData.address);
		} else {
			this.addrData.address = this.bus.ReadWord(this.addrData.address);
		}
	}

	private IndirectYIndexed() {
		this.addrData.temp = this.bus.ReadByte(this.registers.pc++);
		this.addrData.temp = this.bus.ReadWord(this.addrData.temp);
		this.addrData.address = this.addrData.temp + this.registers.y;
		this.CrossPage();
	}

	private Relative() {
		// Range is -128 ~ 127
		this.addrData.temp = this.bus.ReadByte(this.registers.pc++);
		if (this.addrData.temp & 0x80)
			this.addrData.temp -= 0x100;

		this.addrData.address = (this.registers.pc + this.addrData.temp) & 0xFFFFF;
	}

	private XIndexedIndirect() {
		this.addrData.temp = this.bus.ReadByte(this.registers.pc++);
		this.addrData.temp += this.registers.x;
		this.addrData.address = this.bus.ReadWord(this.addrData.temp);
	}

	private ZeroPage() {
		this.addrData.address = this.bus.ReadByte(this.registers.pc);
		this.registers.pc++;
	}

	private ZeroPageX() {
		this.addrData.address = (this.bus.ReadByte(this.registers.pc) + this.registers.x) & 0xFF;
		this.registers.pc++;
	}

	private ZeroPageY() {
		this.addrData.address = (this.bus.ReadByte(this.registers.pc++) + this.registers.y) & 0xFF;
	}
	//#endregion 寻址方式

	//#region 操作指令
	private ADC(): void {
		const data = this.GetData();
		const value = data + this.registers.a + (this.IsFlagSet(Flags.FlagC) ? 1 : 0);

		this.SetFlag(Flags.FlagC, value > 0xFF);
		this.SetFlag(Flags.FlagV, !!((~(this.registers.a ^ data) & (this.registers.a ^ value)) & 0x80));
		this.SetNZFlag(value);

		this.registers.a = value & 0xFF;
	}

	private AND(): void {
		this.registers.a &= this.GetData();
		this.SetNZFlag(this.registers.a);
	}

	private ASL(): void {
		let data = this.GetData() << 1;

		this.SetFlag(Flags.FlagC, !!(data & 0x100));
		data = data & 0xFF;
		this.SetNZFlag(data);

		if (this.addrData.data >= 0) {
			this.registers.a = data;
		} else {
			this.bus.WriteByte(this.addrData.address, data);
		}
	}

	private BCC(): void {
		if (!this.IsFlagSet(Flags.FlagC)) {
			this.cpuClock++;
			if (this.CrossPageMatch(this.registers.pc, this.addrData.address)) {
				this.cpuClock++;
			}

			this.registers.pc = this.addrData.address;
		}
	}

	private BCS(): void {
		if (this.IsFlagSet(Flags.FlagC)) {
			this.cpuClock++;
			if (this.CrossPageMatch(this.registers.pc, this.addrData.address)) {
				this.cpuClock++;
			}

			this.registers.pc = this.addrData.address;
		}
	}

	private BEQ(): void {
		if (this.IsFlagSet(Flags.FlagZ)) {
			this.cpuClock++;
			if (this.CrossPageMatch(this.registers.pc, this.addrData.address)) {
				this.cpuClock++;
			}

			this.registers.pc = this.addrData.address;
		}
	}

	private BIT(): void {
		this.addrData.temp = this.GetData();

		this.SetFlag(Flags.FlagZ, !(this.registers.a & this.addrData.temp));
		this.SetFlag(Flags.FlagN, !!(this.addrData.temp & (1 << 7)));
		this.SetFlag(Flags.FlagV, !!(this.addrData.temp & (1 << 6)));
	}

	private BMI(): void {
		if (this.IsFlagSet(Flags.FlagN)) {
			this.cpuClock++;
			if (this.CrossPageMatch(this.registers.pc, this.addrData.address)) {
				this.cpuClock++;
			}

			this.registers.pc = this.addrData.address;
		}
	}

	private BNE(): void {
		if (!this.IsFlagSet(Flags.FlagZ)) {
			this.cpuClock++;
			if (this.CrossPageMatch(this.registers.pc, this.addrData.address)) {
				this.cpuClock++;
			}

			this.registers.pc = this.addrData.address;
		}
	}

	private BPL(): void {
		if (!this.IsFlagSet(Flags.FlagN)) {
			this.cpuClock++;
			if (this.CrossPageMatch(this.registers.pc, this.addrData.address)) {
				this.cpuClock++;
			}

			this.registers.pc = this.addrData.address;
		}
	}

	private BRK(): void {
		this.PushWord(this.registers.pc);
		this.PushByte(this.registers.p | Flags.FlagB | Flags.FlagU);

		this.SetFlag(Flags.FlagI, true);

		this.registers.pc = this.bus.ReadWord(IRQ);
	}

	private BVC(): void {
		if (!this.IsFlagSet(Flags.FlagV)) {
			this.cpuClock++;
			if (this.CrossPageMatch(this.registers.pc, this.addrData.address)) {
				this.cpuClock++;
			}

			this.registers.pc = this.addrData.address;
		}
	}

	private BVS(): void {
		if (this.IsFlagSet(Flags.FlagV)) {
			this.cpuClock++;
			if (this.CrossPageMatch(this.registers.pc, this.addrData.address)) {
				this.cpuClock++;
			}

			this.registers.pc = this.addrData.address;
		}
	}

	private CLC(): void {
		this.SetFlag(Flags.FlagC, false);
	}

	private CLD(): void {
		this.SetFlag(Flags.FlagD, false);
	}

	private CLI(): void {
		this.SetFlag(Flags.FlagI, false);
	}

	private CLV(): void {
		this.SetFlag(Flags.FlagV, false);
	}

	private CMP(): void {
		this.addrData.temp = this.GetData();
		this.SetFlag(Flags.FlagC, this.registers.a >= this.addrData.temp);

		this.addrData.temp = this.registers.a - this.addrData.temp;
		this.SetNZFlag(this.addrData.temp);
	}

	private CPX(): void {
		this.addrData.temp = this.GetData();
		this.SetFlag(Flags.FlagC, this.registers.x >= this.addrData.temp);

		this.addrData.temp = this.registers.x - this.addrData.temp;
		this.SetNZFlag(this.addrData.temp);
	}

	private CPY(): void {
		this.addrData.temp = this.GetData();
		this.SetFlag(Flags.FlagC, this.registers.y >= this.addrData.temp);

		this.addrData.temp = this.registers.y - this.addrData.temp;
		this.SetNZFlag(this.addrData.temp);
	}

	private DEC(): void {
		this.addrData.temp = (this.GetData() - 1) & 0xFF;

		this.bus.WriteByte(this.addrData.address, this.addrData.temp);
		this.SetNZFlag(this.addrData.temp);
	}

	private DEX(): void {
		this.registers.x--;
		this.registers.x &= 0xFF;
		this.SetNZFlag(this.registers.x);
	}

	private DEY(): void {
		this.registers.y--;
		this.registers.y &= 0xFF;
		this.SetNZFlag(this.registers.y);
	}

	private EOR(): void {
		this.registers.a ^= this.GetData();
		this.SetNZFlag(this.registers.a);
	}

	private INC(): void {
		this.addrData.temp = (this.GetData() + 1) & 0xFF;

		this.bus.WriteByte(this.addrData.address, this.addrData.temp);
		this.SetNZFlag(this.addrData.temp);
	}

	private INX(): void {
		this.registers.x++;
		this.registers.x &= 0xFF;
		this.SetNZFlag(this.registers.x);
	}

	private INY(): void {
		this.registers.y++;
		this.registers.y &= 0xFF;
		this.SetNZFlag(this.registers.y);
	}

	private JMP(): void {
		this.registers.pc = this.addrData.address;
	}

	private JSR(): void {
		this.PushWord(this.registers.pc - 1);
		this.registers.pc = this.addrData.address;
	}

	private LDA(): void {
		this.registers.a = this.GetData();
		this.SetNZFlag(this.registers.a);
	}

	private LDX(): void {
		this.registers.x = this.GetData();
		this.SetNZFlag(this.registers.x);
	}

	private LDY(): void {
		this.registers.y = this.GetData();
		this.SetNZFlag(this.registers.y);
	}

	private LSR(): void {
		this.addrData.temp = this.GetData();

		this.SetFlag(Flags.FlagC, !!(this.addrData.temp & 0x01));
		this.addrData.temp >>= 1;
		this.SetNZFlag(this.addrData.temp);

		if (this.addrData.address >= 0) {
			this.registers.a = this.addrData.temp;
		} else {
			this.bus.WriteByte(this.addrData.address, this.addrData.temp);
		}
	}

	private NOP(): void {
		// Do nothing
	}

	private ORA(): void {
		this.registers.a |= this.GetData();
		this.SetNZFlag(this.registers.a);
	}

	private PHA(): void {
		this.PushByte(this.registers.a);
	}

	private PHP(): void {
		this.SetFlag(Flags.FlagB, true);
		this.SetFlag(Flags.FlagU, true);
		let temp = 1;
		for (let i = 0; i < 8; i++) {
			if (this.flags[i])
				this.registers.p |= temp;

			temp <<= 1;
		}
		this.PushByte(this.registers.p);
	}

	private PLA(): void {
		this.registers.a = this.PopByte();
		this.SetNZFlag(this.registers.a);
	}

	private PLP(): void {
		this.registers.p = this.PopByte();
		let temp = 1;
		for (let i = 0; i < 8; i++) {
			this.flags[i] = (this.registers.p & temp) !== 0;
			temp <<= 1;
		}

		this.SetFlag(Flags.FlagB, false);
		this.SetFlag(Flags.FlagU, true);

	}

	private ROL(): void {
		this.addrData.temp = this.GetData();
		this.SetFlag(Flags.FlagC, !!(this.addrData.temp & 0x80));

		this.addrData.temp = (this.addrData.temp << 1 | (this.IsFlagSet(Flags.FlagC) ? 1 : 0)) & 0xFF;
		this.SetNZFlag(this.addrData.temp);

		if (this.addrData.address >= 0) {
			this.registers.a = this.addrData.temp;
		} else {
			this.bus.WriteByte(this.addrData.address, this.addrData.temp);
		}
	}

	private ROR(): void {
		let data = this.GetData();

		const isCarry = this.IsFlagSet(Flags.FlagC);
		this.SetFlag(Flags.FlagC, !!(data & 1));
		data = data >> 1 | (isCarry ? 1 << 7 : 0);
		this.SetNZFlag(data);

		if (this.addrData.address < 0) {
			this.registers.a = data;
		} else {
			this.bus.WriteByte(this.addrData.address, data);
		}
	}

	private RTI(): void {
		this.registers.p = this.PopByte();
		this.SetFlag(Flags.FlagB, false);
		this.SetFlag(Flags.FlagU, true);

		this.registers.pc = this.PopWord();
	}

	private RTS(): void {
		this.registers.pc = this.PopWord() + 1;
	}

	private SBC(): void {
		const data = this.GetData();
		const res = this.registers.a - data - (this.IsFlagSet(Flags.FlagC) ? 0 : 1);

		this.SetNZFlag(res);
		this.SetFlag(Flags.FlagC, res >= 0);
		this.SetFlag(Flags.FlagV, !!((res ^ this.registers.a) & (res ^ data ^ 0xFF) & 0x0080));

		this.registers.a = res & 0xFF;
	}

	private SEC(): void {
		this.SetFlag(Flags.FlagC, true);
	}

	private SED(): void {
		this.SetFlag(Flags.FlagD, true);
	}

	private SEI(): void {
		this.SetFlag(Flags.FlagI, true);
	}

	private STA(): void {
		this.bus.WriteByte(this.addrData.address, this.registers.a);
	}

	private STX(): void {
		this.bus.WriteByte(this.addrData.address, this.registers.x);
	}

	private STY(): void {
		this.bus.WriteByte(this.addrData.address, this.registers.y);
	}

	private TAX(): void {
		this.registers.x = this.registers.a;
		this.SetNZFlag(this.registers.x);
	}

	private TAY(): void {
		this.registers.y = this.registers.a;
		this.SetNZFlag(this.registers.y);
	}

	private TSX(): void {
		this.registers.x = this.registers.sp;
		this.SetNZFlag(this.registers.x);
	}

	private TXA(): void {
		this.registers.a = this.registers.x;
		this.SetNZFlag(this.registers.a);
	}

	private TXS(): void {
		this.registers.sp = this.registers.x;
	}

	private TYA(): void {
		this.registers.a = this.registers.y;
		this.SetNZFlag(this.registers.a);
	}

	//#region 非法指令
	private DCP(): void {
		this.DEC();
		this.CMP();
	}

	private ISC(): void {
		this.INC();
		this.SBC();
	}

	private LAX(): void {
		this.LDA();
		this.LDX();
	}

	private RLA(): void {
		this.ROL();
		this.AND();
	}

	private RRA(): void {
		this.ROR();
		this.ADC();
	}

	private SAX(): void {
		const value = this.registers.a & this.registers.x;
		this.bus.WriteByte(this.addrData.address, value);
	}

	private SLO(): void {
		this.ASL();
		this.ORA();
	}

	private SRE(): void {
		this.LSR();
		this.EOR();
	}
	//#endregion 非法指令

	//#endregion 操作指令


	//#endregion 操作

	//#region 是否越页
	/**
	 * 是否越页，判断 addrData 的 temp 和 address
	 */
	private CrossPage() {
		this.addrData.crossPage = (this.addrData.temp & 0xFF00) !== (this.addrData.address & 0xFF00);
	}

	private CrossPageMatch(addr1: number, addr2: number) {
		return (addr1 & 0xFF00) !== (addr2 & 0xFF00);
	}
	//#endregion 是否越页

}