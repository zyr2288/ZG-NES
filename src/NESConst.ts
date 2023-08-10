export const CPU_NTSC = 1789772.7272;
export const CPU_PAL = 1662607.03;
export const CPU_Dendy = 1773448.0;

export const BitValue = [1, 2, 4, 8, 0x10, 0x20, 0x40, 0x80];
export const BitValueRev = [0x80, 0x40, 0x20, 0x10, 8, 4, 2, 1];
export enum CPUType { NTSC, PAL, Dendy }

export const AppDebug = true;

/**NES颜色 */
export const NesColors: number[] = [
	//0x00 - 0x07
	0x747474, 0x24188C, 0x0000A8, 0x44009C, 0x8C0074, 0xA80010, 0xA80010, 0xA80010,
	//0x08 - 0x0F
	0x402C00, 0x004400, 0x005000, 0x003C14, 0x183C5C, 0x000000, 0x000000, 0x000000,
	//0x10 - 0x17
	0xBCBCBC, 0x0070EC, 0x2038EC, 0x8000F0, 0xBC00BC, 0xE40058, 0xD82800, 0xC84C0C,
	//0x18 - 0x1F
	0x887000, 0x009400, 0x00A800, 0x009038, 0x008088, 0x000000, 0x000000, 0x000000,
	//0x20 - 0x27
	0xFCFCFC, 0x3CBCFC, 0x5C94FC, 0xCC88FC, 0xF478FC, 0xFC74B4, 0xFC7460, 0xFC9838,
	//0x28 - 0x2F
	0xF0BC3C, 0x80D010, 0x4CDC48, 0x58F898, 0x00E8D8, 0x787878, 0x000000, 0x000000,
	//0x30 - 0x37
	0xFCFCFC, 0xA8E4FC, 0xC4D4FC, 0xD4C8FC, 0xFCC4FC, 0xFCC4D8, 0xFCBCB0, 0xFCD8A8,
	//0x38 - 0x3F
	0xFCE4A0, 0xE0FCA0, 0xA8F0BC, 0xB0FCCC, 0x9CFCF0, 0xC4C4C4, 0x000000, 0x000000
];

export const NesColorsStr: string[] = NesColors.map(value => {
	return "#" + value.toString(16).padStart(6, "0");
});

/**1P按键控制 */
export const enum Keys {
	//1P 按键
	Up = 87,		//W
	Down = 83,		//S
	Left = 65,		//A
	Right = 68,		//D
	Select = 90,	//Z
	Start = 88,		//X
	B = 71,			//G
	A = 72,			//H
	TB = 84,		//T
	TA = 89			//Y
}

/**芯片类型 */
export const enum ChipType {
	VRC6 = 1,
	VRC7 = 2,
	FDS = 4,
	MMC5 = 8,
	Namco163 = 0x10,
	Sunsoft5B = 0x20
}

/**
 * https://www.nesdev.org/wiki/Cycle_reference_chart
 */
export enum ClockRate {
	NTSC = 3, PAL = 3.2, Dendy = 3
}

export enum CPUFrameClock {
	NTSC = 29780.5, PAL = 33247.5, Dendy = 35464
}

export enum MachineType {
	NSTC, PAL, Dendy
}