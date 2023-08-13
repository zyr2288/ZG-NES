/**操作指令 */
export enum Instruction {
	ADC, AND, ASL, BCC, BCS, BEQ, BIT, BMI,
	BNE, BPL, BRK, BVC, BVS, CLC, CLD, CLI,
	CLV, CMP, CPX, CPY, DEC, DEX, DEY, EOR,
	INC, INX, INY, JMP, JSR, LDA, LDX, LDY,
	LSR, NOP, ORA, PHA, PHP, PLA, PLP, ROL,
	ROR, RTI, RTS, SBC, SEC, SED, SEI, STA,
	STX, STY, TAX, TAY, TSX, TXA, TXS, TYA,

	// Illegal opcode
	DCP, ISC, LAX, RLA, RRA, SAX, SLO, SRE,

	INVALID,
}

/**寻址方式 */
export enum AddressingMode {
	/**隐含寻址 CLC | RTS */
	IMPLICIT,
	/**寄存器A LSR A */
	ACCUMULATOR,
	/**立即寻址 LDA #10 */
	IMMEDIATE,
	/**零页寻址 LDA $00 */
	ZERO_PAGE,
	/**零页寻址偏转X STY $10,X */
	ZERO_PAGE_X,
	/**零页寻址偏转Y LDX $10,Y */
	ZERO_PAGE_Y,
	/**相对寻址 BEQ label | BNE *+4 */
	RELATIVE,
	/**绝对寻址 JMP $1234 */
	ABSOLUTE,
	/** 绝对寻址偏转X STA $3000,X */
	ABSOLUTE_X,
	/** 绝对寻址偏转Y AND $4000,Y */
	ABSOLUTE_Y,
	/** 相对寻址 JMP ($FFFC) */
	INDIRECT,
	/** 相对寻址，偏转X LDA ($40,X) */
	X_INDEXED_INDIRECT,
	/** 相对寻址，偏转Y LDA ($40),Y */
	INDIRECT_Y_INDEXED,
}

export interface IOpcodeEntry {
	/**操作指令 */
	instruction: Instruction;
	/**寻址方式 */
	addressingMode: AddressingMode;
	/**包括操作指令的总长度 */
	bytes: number;
	/**消耗CPU周期 */
	cycles: number;
	/**越页多消耗的CPU周期 */
	pageCycles: number;
}

export const OperationTable: Array<IOpcodeEntry | undefined> = [
	RegisterOpcode(Instruction.BRK, AddressingMode.ZERO_PAGE, 2, 7, 0),				// 0
	RegisterOpcode(Instruction.ORA, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 1, 1h
	undefined,																		// 2
	RegisterOpcode(Instruction.SLO, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0),	// 3, 3h
	RegisterOpcode(Instruction.NOP, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 4, 4h
	RegisterOpcode(Instruction.ORA, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 5, 5h
	RegisterOpcode(Instruction.ASL, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 6, 6h
	RegisterOpcode(Instruction.SLO, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 7, 7h
	RegisterOpcode(Instruction.PHP, AddressingMode.IMPLICIT, 1, 3, 0),				// 8, 8h
	RegisterOpcode(Instruction.ORA, AddressingMode.IMMEDIATE, 2, 2, 0),				// 9, 9h
	RegisterOpcode(Instruction.ASL, AddressingMode.ACCUMULATOR, 1, 2, 0),			// 10, Ah
	undefined,																		// 11
	RegisterOpcode(Instruction.NOP, AddressingMode.ABSOLUTE, 3, 4, 0),				// 12, Ch
	RegisterOpcode(Instruction.ORA, AddressingMode.ABSOLUTE, 3, 4, 0),				// 13, Dh
	RegisterOpcode(Instruction.ASL, AddressingMode.ABSOLUTE, 3, 6, 0),				// 14, Eh
	RegisterOpcode(Instruction.SLO, AddressingMode.ABSOLUTE, 3, 6, 0),				// 15, Fh
	RegisterOpcode(Instruction.BPL, AddressingMode.RELATIVE, 2, 2, 1),				// 16, 10h
	RegisterOpcode(Instruction.ORA, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1),	// 17, 11h
	undefined,																		// 18
	RegisterOpcode(Instruction.SLO, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0),	// 19, 13h
	RegisterOpcode(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 20, 14h
	RegisterOpcode(Instruction.ORA, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 21, 15h
	RegisterOpcode(Instruction.ASL, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 22, 16h
	RegisterOpcode(Instruction.SLO, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 23, 17h
	RegisterOpcode(Instruction.CLC, AddressingMode.IMPLICIT, 1, 2, 0),				// 24, 18h
	RegisterOpcode(Instruction.ORA, AddressingMode.ABSOLUTE_Y, 3, 4, 1),			// 25, 19h
	RegisterOpcode(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0),				// 26, 1Ah
	RegisterOpcode(Instruction.SLO, AddressingMode.ABSOLUTE_Y, 3, 7, 0),			// 27, 1Bh
	RegisterOpcode(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 28, 1Ch
	RegisterOpcode(Instruction.ORA, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 29, 1Dh
	RegisterOpcode(Instruction.ASL, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 30, 1Eh
	RegisterOpcode(Instruction.SLO, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 31, 1Fh
	RegisterOpcode(Instruction.JSR, AddressingMode.ABSOLUTE, 3, 6, 0),				// 32, 20h
	RegisterOpcode(Instruction.AND, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 33, 21h
	undefined,																		// 34
	RegisterOpcode(Instruction.RLA, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0),	// 35, 23h
	RegisterOpcode(Instruction.BIT, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 36, 24h
	RegisterOpcode(Instruction.AND, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 37, 25h
	RegisterOpcode(Instruction.ROL, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 38, 26h
	RegisterOpcode(Instruction.RLA, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 39, 27h
	RegisterOpcode(Instruction.PLP, AddressingMode.IMPLICIT, 1, 4, 0),				// 40, 28h
	RegisterOpcode(Instruction.AND, AddressingMode.IMMEDIATE, 2, 2, 0),				// 41, 29h
	RegisterOpcode(Instruction.ROL, AddressingMode.ACCUMULATOR, 1, 2, 0),			// 42, 2Ah
	undefined,																		// 43
	RegisterOpcode(Instruction.BIT, AddressingMode.ABSOLUTE, 3, 4, 0),				// 44, 2Ch
	RegisterOpcode(Instruction.AND, AddressingMode.ABSOLUTE, 3, 4, 0),				// 45, 2Dh
	RegisterOpcode(Instruction.ROL, AddressingMode.ABSOLUTE, 3, 6, 0),				// 46, 2Eh
	RegisterOpcode(Instruction.RLA, AddressingMode.ABSOLUTE, 3, 6, 0),				// 47, 2Fh
	RegisterOpcode(Instruction.BMI, AddressingMode.RELATIVE, 2, 2, 1),				// 48, 30h
	RegisterOpcode(Instruction.AND, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1),	// 49, 31h
	undefined,																		// 50
	RegisterOpcode(Instruction.RLA, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0),	// 51, 33h
	RegisterOpcode(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 52, 34h
	RegisterOpcode(Instruction.AND, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 53, 35h
	RegisterOpcode(Instruction.ROL, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 54, 36h
	RegisterOpcode(Instruction.RLA, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 55, 37h
	RegisterOpcode(Instruction.SEC, AddressingMode.IMPLICIT, 1, 2, 0),				// 56, 38h
	RegisterOpcode(Instruction.AND, AddressingMode.ABSOLUTE_Y, 3, 4, 1),			// 57, 39h
	RegisterOpcode(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0),				// 58, 3Ah
	RegisterOpcode(Instruction.RLA, AddressingMode.ABSOLUTE_Y, 3, 7, 0),			// 59, 3Bh
	RegisterOpcode(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 60, 3Ch
	RegisterOpcode(Instruction.AND, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 61, 3Dh
	RegisterOpcode(Instruction.ROL, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 62, 3Eh
	RegisterOpcode(Instruction.RLA, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 63, 3Fh
	RegisterOpcode(Instruction.RTI, AddressingMode.IMPLICIT, 1, 6, 0),				// 64, 40h
	RegisterOpcode(Instruction.EOR, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 65, 41h
	undefined, 																		// 66
	RegisterOpcode(Instruction.SRE, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0),	// 67, 43h
	RegisterOpcode(Instruction.NOP, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 68, 44h
	RegisterOpcode(Instruction.EOR, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 69, 45h
	RegisterOpcode(Instruction.LSR, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 70, 46h
	RegisterOpcode(Instruction.SRE, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 71, 47h
	RegisterOpcode(Instruction.PHA, AddressingMode.IMPLICIT, 1, 3, 0),				// 72, 48H
	RegisterOpcode(Instruction.EOR, AddressingMode.IMMEDIATE, 2, 2, 0),				// 73, 49H
	RegisterOpcode(Instruction.LSR, AddressingMode.ACCUMULATOR, 1, 2, 0),			// 74, 4Ah
	undefined,																		// 75
	RegisterOpcode(Instruction.JMP, AddressingMode.ABSOLUTE, 3, 3, 0),				// 76, 4Ch
	RegisterOpcode(Instruction.EOR, AddressingMode.ABSOLUTE, 3, 4, 0),				// 77, 4Dh
	RegisterOpcode(Instruction.LSR, AddressingMode.ABSOLUTE, 3, 6, 0),				// 78, 4Eh
	RegisterOpcode(Instruction.SRE, AddressingMode.ABSOLUTE, 3, 6, 0),				// 79, 4Fh
	RegisterOpcode(Instruction.BVC, AddressingMode.RELATIVE, 2, 2, 1),				// 80, 50h
	RegisterOpcode(Instruction.EOR, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1),	// 81, 51h
	undefined,																		// 82
	RegisterOpcode(Instruction.SRE, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0),	// 83, 53h
	RegisterOpcode(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 84, 54h
	RegisterOpcode(Instruction.EOR, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 85, 55h
	RegisterOpcode(Instruction.LSR, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 86, 56h
	RegisterOpcode(Instruction.SRE, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 87, 57h
	RegisterOpcode(Instruction.CLI, AddressingMode.IMPLICIT, 1, 2, 0),				// 88, 58h
	RegisterOpcode(Instruction.EOR, AddressingMode.ABSOLUTE_Y, 3, 4, 1),			// 89, 59h
	RegisterOpcode(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0),				// 90, 5Ah
	RegisterOpcode(Instruction.SRE, AddressingMode.ABSOLUTE_Y, 3, 7, 0),			// 91, 5Bh
	RegisterOpcode(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 92, 5Ch
	RegisterOpcode(Instruction.EOR, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 93, 5Dh
	RegisterOpcode(Instruction.LSR, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 94, 5Eh
	RegisterOpcode(Instruction.SRE, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 95, 5Fh
	RegisterOpcode(Instruction.RTS, AddressingMode.IMPLICIT, 1, 6, 0),				// 96, 60h
	RegisterOpcode(Instruction.ADC, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 97, 61h
	undefined,																		// 98
	RegisterOpcode(Instruction.RRA, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0),	// 99, 63h
	RegisterOpcode(Instruction.NOP, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 100, 64h
	RegisterOpcode(Instruction.ADC, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 101, 65h
	RegisterOpcode(Instruction.ROR, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 102, 66h
	RegisterOpcode(Instruction.RRA, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 103, 67h
	RegisterOpcode(Instruction.PLA, AddressingMode.IMPLICIT, 1, 4, 0),				// 104, 68h
	RegisterOpcode(Instruction.ADC, AddressingMode.IMMEDIATE, 2, 2, 0),				// 105, 69h
	RegisterOpcode(Instruction.ROR, AddressingMode.ACCUMULATOR, 1, 2, 0),			// 106, 6Ah
	undefined,																		// 107
	RegisterOpcode(Instruction.JMP, AddressingMode.INDIRECT, 3, 5, 0),				// 108, 6Ch
	RegisterOpcode(Instruction.ADC, AddressingMode.ABSOLUTE, 3, 4, 0),				// 109, 6Dh
	RegisterOpcode(Instruction.ROR, AddressingMode.ABSOLUTE, 3, 6, 0),				// 110, 6Eh
	RegisterOpcode(Instruction.RRA, AddressingMode.ABSOLUTE, 3, 6, 0),				// 111, 6Fh
	RegisterOpcode(Instruction.BVS, AddressingMode.RELATIVE, 2, 2, 1),				// 112, 70h
	RegisterOpcode(Instruction.ADC, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1),	// 113, 71h
	undefined,																		// 114
	RegisterOpcode(Instruction.RRA, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0),	// 115, 73h
	RegisterOpcode(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 116, 74h
	RegisterOpcode(Instruction.ADC, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 117, 75h
	RegisterOpcode(Instruction.ROR, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 118, 76h
	RegisterOpcode(Instruction.RRA, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 119, 77h
	RegisterOpcode(Instruction.SEI, AddressingMode.IMPLICIT, 1, 2, 0),				// 120, 78h
	RegisterOpcode(Instruction.ADC, AddressingMode.ABSOLUTE_Y, 3, 4, 1),			// 121, 79h
	RegisterOpcode(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0),				// 122, 7Ah
	RegisterOpcode(Instruction.RRA, AddressingMode.ABSOLUTE_Y, 3, 7, 0),			// 123, 7Bh
	RegisterOpcode(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 124, 7Ch
	RegisterOpcode(Instruction.ADC, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 125, 7Dh
	RegisterOpcode(Instruction.ROR, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 126, 7Eh
	RegisterOpcode(Instruction.RRA, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 127, 7Fh
	RegisterOpcode(Instruction.NOP, AddressingMode.IMMEDIATE, 2, 2, 0),				// 128, 80h
	RegisterOpcode(Instruction.STA, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 129, 81h
	RegisterOpcode(Instruction.NOP, AddressingMode.IMMEDIATE, 2, 2, 0),				// 130, 82h
	RegisterOpcode(Instruction.SAX, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 131, 83h
	RegisterOpcode(Instruction.STY, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 132, 84h
	RegisterOpcode(Instruction.STA, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 133, 85h
	RegisterOpcode(Instruction.STX, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 134, 86h
	RegisterOpcode(Instruction.SAX, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 135, 87h
	RegisterOpcode(Instruction.DEY, AddressingMode.IMPLICIT, 1, 2, 0),				// 136, 88h
	undefined,																		// 137
	RegisterOpcode(Instruction.TXA, AddressingMode.IMPLICIT, 1, 2, 0),				// 138, 8Ah
	undefined,																		// 139
	RegisterOpcode(Instruction.STY, AddressingMode.ABSOLUTE, 3, 4, 0),				// 140, 8Ch
	RegisterOpcode(Instruction.STA, AddressingMode.ABSOLUTE, 3, 4, 0),				// 141, 8Dh
	RegisterOpcode(Instruction.STX, AddressingMode.ABSOLUTE, 3, 4, 0),				// 142, 8Eh
	RegisterOpcode(Instruction.SAX, AddressingMode.ABSOLUTE, 3, 4, 0),				// 143, 8Fh
	RegisterOpcode(Instruction.BCC, AddressingMode.RELATIVE, 2, 2, 1),				// 144, 90h
	RegisterOpcode(Instruction.STA, AddressingMode.INDIRECT_Y_INDEXED, 2, 6, 0),	// 145, 91h
	undefined,																		// 146
	undefined,																		// 147
	RegisterOpcode(Instruction.STY, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 148, 94h
	RegisterOpcode(Instruction.STA, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 149, 95h
	RegisterOpcode(Instruction.STX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0),			// 150, 96h
	RegisterOpcode(Instruction.SAX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0),			// 151, 97h
	RegisterOpcode(Instruction.TYA, AddressingMode.IMPLICIT, 1, 2, 0),				// 152, 98h
	RegisterOpcode(Instruction.STA, AddressingMode.ABSOLUTE_Y, 3, 5, 0),			// 153, 99h
	RegisterOpcode(Instruction.TXS, AddressingMode.IMPLICIT, 1, 2, 0),				// 154, 9Ah
	undefined,																		// 155
	undefined,																		// 156
	RegisterOpcode(Instruction.STA, AddressingMode.ABSOLUTE_X, 3, 5, 0),			// 157, 9Dh
	undefined,																		// 158
	undefined,																		// 159
	RegisterOpcode(Instruction.LDY, AddressingMode.IMMEDIATE, 2, 2, 0),				// 160, A0h
	RegisterOpcode(Instruction.LDA, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 161, A1h
	RegisterOpcode(Instruction.LDX, AddressingMode.IMMEDIATE, 2, 2, 0),				// 162, A2h
	RegisterOpcode(Instruction.LAX, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 163, A3h
	RegisterOpcode(Instruction.LDY, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 164, A4h
	RegisterOpcode(Instruction.LDA, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 165, A5h
	RegisterOpcode(Instruction.LDX, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 166, A6h
	RegisterOpcode(Instruction.LAX, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 167, A7h
	RegisterOpcode(Instruction.TAY, AddressingMode.IMPLICIT, 1, 2, 0),				// 168, A8h
	RegisterOpcode(Instruction.LDA, AddressingMode.IMMEDIATE, 2, 2, 0),				// 169, A9h
	RegisterOpcode(Instruction.TAX, AddressingMode.IMPLICIT, 1, 2, 0),				// 170, AAh
	undefined,																		// 171
	RegisterOpcode(Instruction.LDY, AddressingMode.ABSOLUTE, 3, 4, 0),				// 172, ACh
	RegisterOpcode(Instruction.LDA, AddressingMode.ABSOLUTE, 3, 4, 0),				// 173, ADh
	RegisterOpcode(Instruction.LDX, AddressingMode.ABSOLUTE, 3, 4, 0),				// 174, AEh
	RegisterOpcode(Instruction.LAX, AddressingMode.ABSOLUTE, 3, 4, 0),				// 175, AFh
	RegisterOpcode(Instruction.BCS, AddressingMode.RELATIVE, 2, 2, 1),				// 176, B0h
	RegisterOpcode(Instruction.LDA, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1),	// 177, B1h
	undefined,																		// 178
	RegisterOpcode(Instruction.LAX, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1),	// 179, B3h
	RegisterOpcode(Instruction.LDY, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 180, B4h
	RegisterOpcode(Instruction.LDA, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 181, B5h
	RegisterOpcode(Instruction.LDX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0),			// 182, B6h
	RegisterOpcode(Instruction.LAX, AddressingMode.ZERO_PAGE_Y, 2, 4, 0),			// 183, B7h
	RegisterOpcode(Instruction.CLV, AddressingMode.IMPLICIT, 1, 2, 0),				// 184, B8h
	RegisterOpcode(Instruction.LDA, AddressingMode.ABSOLUTE_Y, 3, 4, 1),			// 185, B9h
	RegisterOpcode(Instruction.TSX, AddressingMode.IMPLICIT, 1, 2, 0),				// 186, BAh
	undefined,																		// 187
	RegisterOpcode(Instruction.LDY, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 188, BCh
	RegisterOpcode(Instruction.LDA, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 189, BDh
	RegisterOpcode(Instruction.LDX, AddressingMode.ABSOLUTE_Y, 3, 4, 1),			// 190, BEh
	RegisterOpcode(Instruction.LAX, AddressingMode.ABSOLUTE_Y, 3, 4, 1),			// 191, BFh
	RegisterOpcode(Instruction.CPY, AddressingMode.IMMEDIATE, 2, 2, 0),				// 192, C0h
	RegisterOpcode(Instruction.CMP, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 193, C1h
	undefined,																		// 194
	RegisterOpcode(Instruction.DCP, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0),	// 195, C3h
	RegisterOpcode(Instruction.CPY, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 196, C4h
	RegisterOpcode(Instruction.CMP, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 197, C5h
	RegisterOpcode(Instruction.DEC, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 198, C6h
	RegisterOpcode(Instruction.DCP, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 199, C7h
	RegisterOpcode(Instruction.INY, AddressingMode.IMPLICIT, 1, 2, 0),				// 200, C8h
	RegisterOpcode(Instruction.CMP, AddressingMode.IMMEDIATE, 2, 2, 0),				// 201, C9h
	RegisterOpcode(Instruction.DEX, AddressingMode.IMPLICIT, 1, 2, 0),				// 202, CAh
	undefined, 																		// 203
	RegisterOpcode(Instruction.CPY, AddressingMode.ABSOLUTE, 3, 4, 0),				// 204, CCh
	RegisterOpcode(Instruction.CMP, AddressingMode.ABSOLUTE, 3, 4, 0),				// 205, CDh
	RegisterOpcode(Instruction.DEC, AddressingMode.ABSOLUTE, 3, 6, 0),				// 206, CEh
	RegisterOpcode(Instruction.DCP, AddressingMode.ABSOLUTE, 3, 6, 0),				// 207, CFh
	RegisterOpcode(Instruction.BNE, AddressingMode.RELATIVE, 2, 2, 1),				// 208, D0h
	RegisterOpcode(Instruction.CMP, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1),	// 209, D1h
	undefined, 																		// 210
	RegisterOpcode(Instruction.DCP, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0),	// 211, D3h
	RegisterOpcode(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 212, D4h
	RegisterOpcode(Instruction.CMP, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 213, D5h
	RegisterOpcode(Instruction.DEC, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 214, D6h
	RegisterOpcode(Instruction.DCP, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 215, D7h
	RegisterOpcode(Instruction.CLD, AddressingMode.IMPLICIT, 1, 2, 0),				// 216, D8h
	RegisterOpcode(Instruction.CMP, AddressingMode.ABSOLUTE_Y, 3, 4, 1),			// 217, D9h
	RegisterOpcode(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0),				// 218, DAh
	RegisterOpcode(Instruction.DCP, AddressingMode.ABSOLUTE_Y, 3, 7, 0),			// 219, DBh
	RegisterOpcode(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 220, DCh
	RegisterOpcode(Instruction.CMP, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 221, DDh
	RegisterOpcode(Instruction.DEC, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 222, DEh
	RegisterOpcode(Instruction.DCP, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 223, DFh
	RegisterOpcode(Instruction.CPX, AddressingMode.IMMEDIATE, 2, 2, 0),				// 224, E0h
	RegisterOpcode(Instruction.SBC, AddressingMode.X_INDEXED_INDIRECT, 2, 6, 0),	// 225, E1h
	undefined,																		// 226
	RegisterOpcode(Instruction.ISC, AddressingMode.X_INDEXED_INDIRECT, 2, 8, 0),	// 227, E3h
	RegisterOpcode(Instruction.CPX, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 228, E4h
	RegisterOpcode(Instruction.SBC, AddressingMode.ZERO_PAGE, 2, 3, 0),				// 229, E5h
	RegisterOpcode(Instruction.INC, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 230, E6h
	RegisterOpcode(Instruction.ISC, AddressingMode.ZERO_PAGE, 2, 5, 0),				// 231, E7h
	RegisterOpcode(Instruction.INX, AddressingMode.IMPLICIT, 1, 2, 0),				// 232, E8h
	RegisterOpcode(Instruction.SBC, AddressingMode.IMMEDIATE, 2, 2, 0),				// 233, E9h
	RegisterOpcode(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0),				// 234, EAh
	RegisterOpcode(Instruction.SBC, AddressingMode.IMMEDIATE, 2, 2, 0),				// 235, EBh
	RegisterOpcode(Instruction.CPX, AddressingMode.ABSOLUTE, 3, 4, 0),				// 236, ECh
	RegisterOpcode(Instruction.SBC, AddressingMode.ABSOLUTE, 3, 4, 0),				// 237, EDh
	RegisterOpcode(Instruction.INC, AddressingMode.ABSOLUTE, 3, 6, 0),				// 238, EEh
	RegisterOpcode(Instruction.ISC, AddressingMode.ABSOLUTE, 3, 6, 0),				// 239, EFh
	RegisterOpcode(Instruction.BEQ, AddressingMode.RELATIVE, 2, 2, 1),				// 240, F0h
	RegisterOpcode(Instruction.SBC, AddressingMode.INDIRECT_Y_INDEXED, 2, 5, 1),	// 241, F1h
	undefined,																		// 242
	RegisterOpcode(Instruction.ISC, AddressingMode.INDIRECT_Y_INDEXED, 2, 8, 0),	// 243, F3h
	RegisterOpcode(Instruction.NOP, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 244, F4h
	RegisterOpcode(Instruction.SBC, AddressingMode.ZERO_PAGE_X, 2, 4, 0),			// 245, F5h
	RegisterOpcode(Instruction.INC, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 246, F6h
	RegisterOpcode(Instruction.ISC, AddressingMode.ZERO_PAGE_X, 2, 6, 0),			// 247, F7h
	RegisterOpcode(Instruction.SED, AddressingMode.IMPLICIT, 1, 2, 0),				// 248, F8h
	RegisterOpcode(Instruction.SBC, AddressingMode.ABSOLUTE_Y, 3, 4, 1),			// 249, F9h
	RegisterOpcode(Instruction.NOP, AddressingMode.IMPLICIT, 1, 2, 0),				// 250, FAh
	RegisterOpcode(Instruction.ISC, AddressingMode.ABSOLUTE_Y, 3, 7, 0),			// 251, FBh
	RegisterOpcode(Instruction.NOP, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 252, FCh
	RegisterOpcode(Instruction.SBC, AddressingMode.ABSOLUTE_X, 3, 4, 1),			// 253, FDh
	RegisterOpcode(Instruction.INC, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 254, FEh
	RegisterOpcode(Instruction.ISC, AddressingMode.ABSOLUTE_X, 3, 7, 0),			// 255, FFh
];

/**
 * 
 * @param instruction 操作指令
 * @param addressingMode 寻址方式
 * @param bytes 总长度
 * @param cycles CPU 周期
 * @param pageCycles 越页 CPU 周期
 * @returns 
 */
function RegisterOpcode(instruction: Instruction, addressingMode: AddressingMode, bytes: number, cycles: number, pageCycles: number) {
	return {
		instruction,
		addressingMode,
		bytes,
		cycles,
		pageCycles
	}
}