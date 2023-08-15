export const LengthTable = [
	10, 254, 20, 2, 40, 4, 80, 6, 160, 8, 60, 10, 14, 12, 26, 14,
	12, 16, 24, 18, 48, 20, 96, 22, 192, 24, 72, 26, 16, 28, 32, 30
];

export const DutyTable = [
	[0, 0, 0, 0, 0, 0, 0, 1],
	[0, 0, 0, 0, 0, 0, 1, 1],
	[0, 0, 0, 0, 1, 1, 1, 1],
	[1, 1, 1, 1, 1, 1, 0, 0],
];

export const NOISE_PEROID_TABLE = [
	4, 8, 16, 32, 64, 96, 128, 160, 202, 254, 380, 508, 762, 1016, 2034, 4068,
];

export const TriangleVolumeTable = [
	15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1, 0,
	0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15,
];

export const DMCTable = [
	428, 380, 340, 320, 286, 254, 226, 214, 190, 160, 142, 128, 106, 84, 72, 54,
];

export const PulseTable: number[] = [];
export const TndTable: number[] = [];

const Zoom = 10000;

let length = 16 * 2;
for (let i = 0; i < length; i++) {
	PulseTable[i] = Math.floor((95.52 / (8128.0 / i + 100)) * Zoom);
}

length = 16 + 16 + 128;
for (let i = 0; i < length; i++) {
	TndTable[i] = Math.floor((163.67 / (24329.0 / i + 100)) * Zoom);
}