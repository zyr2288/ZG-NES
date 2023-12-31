import { OPLL_PATCH } from "./OPLL_PATCH";

export enum OPLL_EG_STATE { ATTACK, DECAY, SUSTAIN, RELEASE, DAMP, UNKNOWN };
export enum SLOT_UPDATE_FLAG {
	UPDATE_WS = 1,
	UPDATE_TLL = 2,
	UPDATE_RKS = 4,
	UPDATE_EG = 8,
	UPDATE_ALL = 255,
};

export const _PI_ = 3.14159265358979323846264338327950288;

export const OPLL_TONE_NUM = 3;

export const default_inst = [
	[
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 0: User
		0x71, 0x61, 0x1e, 0x17, 0xd0, 0x78, 0x00, 0x17, // 1: Violin
		0x13, 0x41, 0x1a, 0x0d, 0xd8, 0xf7, 0x23, 0x13, // 2: Guitar
		0x13, 0x01, 0x99, 0x00, 0xf2, 0xc4, 0x21, 0x23, // 3: Piano
		0x11, 0x61, 0x0e, 0x07, 0x8d, 0x64, 0x70, 0x27, // 4: Flute
		0x32, 0x21, 0x1e, 0x06, 0xe1, 0x76, 0x01, 0x28, // 5: Clarinet
		0x31, 0x22, 0x16, 0x05, 0xe0, 0x71, 0x00, 0x18, // 6: Oboe
		0x21, 0x61, 0x1d, 0x07, 0x82, 0x81, 0x11, 0x07, // 7: Trumpet
		0x33, 0x21, 0x2d, 0x13, 0xb0, 0x70, 0x00, 0x07, // 8: Organ
		0x61, 0x61, 0x1b, 0x06, 0x64, 0x65, 0x10, 0x17, // 9: Horn
		0x41, 0x61, 0x0b, 0x18, 0x85, 0xf0, 0x81, 0x07, // A: Synthesizer
		0x33, 0x01, 0x83, 0x11, 0xea, 0xef, 0x10, 0x04, // B: Harpsichord
		0x17, 0xc1, 0x24, 0x07, 0xf8, 0xf8, 0x22, 0x12, // C: Vibraphone
		0x61, 0x50, 0x0c, 0x05, 0xd2, 0xf5, 0x40, 0x42, // D: Synthsizer Bass
		0x01, 0x01, 0x55, 0x03, 0xe9, 0x90, 0x03, 0x02, // E: Acoustic Bass
		0x41, 0x41, 0x89, 0x03, 0xf1, 0xe4, 0xc0, 0x13, // F: Electric Guitar
		0x01, 0x01, 0x18, 0x0f, 0xdf, 0xf8, 0x6a, 0x6d, // R: Bass Drum (from VRC7)
		0x01, 0x01, 0x00, 0x00, 0xc8, 0xd8, 0xa7, 0x68, // R: High-Hat(M) / Snare Drum(C) (from VRC7)
		0x05, 0x01, 0x00, 0x00, 0xf8, 0xaa, 0x59, 0x55, // R: Tom-tom(M) / Top Cymbal(C) (from VRC7)
	], [
		/* VRC7 presets from Nuke.YKT */
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00,
		0x03, 0x21, 0x05, 0x06, 0xe8, 0x81, 0x42, 0x27,
		0x13, 0x41, 0x14, 0x0d, 0xd8, 0xf6, 0x23, 0x12,
		0x11, 0x11, 0x08, 0x08, 0xfa, 0xb2, 0x20, 0x12,
		0x31, 0x61, 0x0c, 0x07, 0xa8, 0x64, 0x61, 0x27,
		0x32, 0x21, 0x1e, 0x06, 0xe1, 0x76, 0x01, 0x28,
		0x02, 0x01, 0x06, 0x00, 0xa3, 0xe2, 0xf4, 0xf4,
		0x21, 0x61, 0x1d, 0x07, 0x82, 0x81, 0x11, 0x07,
		0x23, 0x21, 0x22, 0x17, 0xa2, 0x72, 0x01, 0x17,
		0x35, 0x11, 0x25, 0x00, 0x40, 0x73, 0x72, 0x01,
		0xb5, 0x01, 0x0f, 0x0F, 0xa8, 0xa5, 0x51, 0x02,
		0x17, 0xc1, 0x24, 0x07, 0xf8, 0xf8, 0x22, 0x12,
		0x71, 0x23, 0x11, 0x06, 0x65, 0x74, 0x18, 0x16,
		0x01, 0x02, 0xd3, 0x05, 0xc9, 0x95, 0x03, 0x02,
		0x61, 0x63, 0x0c, 0x00, 0x94, 0xC0, 0x33, 0xf6,
		0x21, 0x72, 0x0d, 0x00, 0xc1, 0xd5, 0x56, 0x06,
		0x01, 0x01, 0x18, 0x0f, 0xdf, 0xf8, 0x6a, 0x6d,
		0x01, 0x01, 0x00, 0x00, 0xc8, 0xd8, 0xa7, 0x68,
		0x05, 0x01, 0x00, 0x00, 0xf8, 0xaa, 0x59, 0x55,
	], [
		/* YMF281B presets */
		0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, // 0: User
		0x62, 0x21, 0x1a, 0x07, 0xf0, 0x6f, 0x00, 0x16, // 1: Electric Strings (form Chabin's patch)
		0x40, 0x10, 0x45, 0x00, 0xf6, 0x83, 0x73, 0x63, // 2: Bow Wow (based on plgDavid's patch, KSL fixed)
		0x13, 0x01, 0x99, 0x00, 0xf2, 0xc3, 0x21, 0x23, // 3: Electric Guitar (similar to YM2413 but different DR(C))
		0x01, 0x61, 0x0b, 0x0f, 0xf9, 0x64, 0x70, 0x17, // 4: Organ (based on Chabin, TL/DR fixed)
		0x32, 0x21, 0x1e, 0x06, 0xe1, 0x76, 0x01, 0x28, // 5: Clarinet (identical to YM2413)
		0x60, 0x01, 0x82, 0x0e, 0xf9, 0x61, 0x20, 0x27, // 6: Saxophone (based on plgDavid, PM/EG fixed)
		0x21, 0x61, 0x1c, 0x07, 0x84, 0x81, 0x11, 0x07, // 7: Trumpet (similar to YM2413 but different TL/DR(M))
		0x37, 0x32, 0xc9, 0x01, 0x66, 0x64, 0x40, 0x28, // 8: Street Organ (from Chabin)
		0x01, 0x21, 0x07, 0x03, 0xa5, 0x71, 0x51, 0x07, // 9: Synth Brass (based on Chabin, TL fixed)
		0x06, 0x01, 0x5e, 0x07, 0xf3, 0xf3, 0xf6, 0x13, // A: Electric Piano (based on Chabin, DR/RR/KR fixed)
		0x00, 0x00, 0x18, 0x06, 0xf5, 0xf3, 0x20, 0x23, // B: Bass (based on Chabin, EG fixed) 
		0x17, 0xc1, 0x24, 0x07, 0xf8, 0xf8, 0x22, 0x12, // C: Vibraphone (identical to YM2413)
		0x35, 0x64, 0x00, 0x00, 0xff, 0xf3, 0x77, 0xf5, // D: Chimes (from plgDavid)
		0x11, 0x31, 0x00, 0x07, 0xdd, 0xf3, 0xff, 0xfb, // E: Tom Tom II (from plgDavid)
		0x3a, 0x21, 0x00, 0x07, 0x80, 0x84, 0x0f, 0xf5, // F: Noise (based on plgDavid, AR fixed)
		0x01, 0x01, 0x18, 0x0f, 0xdf, 0xf8, 0x6a, 0x6d, // R: Bass Drum (identical to YM2413)
		0x01, 0x01, 0x00, 0x00, 0xc8, 0xd8, 0xa7, 0x68, // R: High-Hat(M) / Snare Drum(C) (identical to YM2413)
		0x05, 0x01, 0x00, 0x00, 0xf8, 0xaa, 0x59, 0x55, // R: Tom-tom(M) / Top Cymbal(C) (identical to YM2413)
	]
];

/* sine table */
export const PG_BITS = 10; /* 2^10 = 1024 length sine table */
export const PG_WIDTH = (1 << PG_BITS);

/* phase increment counter */
const DP_BITS = 19;
export const DP_WIDTH = (1 << DP_BITS);
export const DP_BASE_BITS = (DP_BITS - PG_BITS);

/* dynamic range of envelope output */
const EG_STEP = 0.375;
const EG_BITS = 7;
export const EG_MUTE = ((1 << EG_BITS) - 1);
export const EG_MAX = (EG_MUTE - 4);

/* dynamic range of total level */
const TL_STEP = 0.75;
const TL_BITS = 6;

/* dynamic range of sustine level */
const SL_STEP = 3.0;
const SL_BITS = 4;

/* clang-format off */
/* exp_table[x] = round((exp2((double)x / 256.0) - 1) * 1024) */
export const exp_table = [
	0, 3, 6, 8, 11, 14, 17, 20, 22, 25, 28, 31, 34, 37, 40, 42,
	45, 48, 51, 54, 57, 60, 63, 66, 69, 72, 75, 78, 81, 84, 87, 90,
	93, 96, 99, 102, 105, 108, 111, 114, 117, 120, 123, 126, 130, 133, 136, 139,
	142, 145, 148, 152, 155, 158, 161, 164, 168, 171, 174, 177, 181, 184, 187, 190,
	194, 197, 200, 204, 207, 210, 214, 217, 220, 224, 227, 231, 234, 237, 241, 244,
	248, 251, 255, 258, 262, 265, 268, 272, 276, 279, 283, 286, 290, 293, 297, 300,
	304, 308, 311, 315, 318, 322, 326, 329, 333, 337, 340, 344, 348, 352, 355, 359,
	363, 367, 370, 374, 378, 382, 385, 389, 393, 397, 401, 405, 409, 412, 416, 420,
	424, 428, 432, 436, 440, 444, 448, 452, 456, 460, 464, 468, 472, 476, 480, 484,
	488, 492, 496, 501, 505, 509, 513, 517, 521, 526, 530, 534, 538, 542, 547, 551,
	555, 560, 564, 568, 572, 577, 581, 585, 590, 594, 599, 603, 607, 612, 616, 621,
	625, 630, 634, 639, 643, 648, 652, 657, 661, 666, 670, 675, 680, 684, 689, 693,
	698, 703, 708, 712, 717, 722, 726, 731, 736, 741, 745, 750, 755, 760, 765, 770,
	774, 779, 784, 789, 794, 799, 804, 809, 814, 819, 824, 829, 834, 839, 844, 849,
	854, 859, 864, 869, 874, 880, 885, 890, 895, 900, 906, 911, 916, 921, 927, 932,
	937, 942, 948, 953, 959, 964, 969, 975, 980, 986, 991, 996, 1002, 1007, 1013, 1018
];

/* fullsin_table[x] = round(-log2(sin((x + 0.5) * PI / (PG_WIDTH / 4) / 2)) * 256) */
const fullsin_table = [
	2137, 1731, 1543, 1419, 1326, 1252, 1190, 1137, 1091, 1050, 1013, 979, 949, 920, 894, 869,
	846, 825, 804, 785, 767, 749, 732, 717, 701, 687, 672, 659, 646, 633, 621, 609,
	598, 587, 576, 566, 556, 546, 536, 527, 518, 509, 501, 492, 484, 476, 468, 461,
	453, 446, 439, 432, 425, 418, 411, 405, 399, 392, 386, 380, 375, 369, 363, 358,
	352, 347, 341, 336, 331, 326, 321, 316, 311, 307, 302, 297, 293, 289, 284, 280,
	276, 271, 267, 263, 259, 255, 251, 248, 244, 240, 236, 233, 229, 226, 222, 219,
	215, 212, 209, 205, 202, 199, 196, 193, 190, 187, 184, 181, 178, 175, 172, 169,
	167, 164, 161, 159, 156, 153, 151, 148, 146, 143, 141, 138, 136, 134, 131, 129,
	127, 125, 122, 120, 118, 116, 114, 112, 110, 108, 106, 104, 102, 100, 98, 96,
	94, 92, 91, 89, 87, 85, 83, 82, 80, 78, 77, 75, 74, 72, 70, 69,
	67, 66, 64, 63, 62, 60, 59, 57, 56, 55, 53, 52, 51, 49, 48, 47,
	46, 45, 43, 42, 41, 40, 39, 38, 37, 36, 35, 34, 33, 32, 31, 30,
	29, 28, 27, 26, 25, 24, 23, 23, 22, 21, 20, 20, 19, 18, 17, 17,
	16, 15, 15, 14, 13, 13, 12, 12, 11, 10, 10, 9, 9, 8, 8, 7,
	7, 7, 6, 6, 5, 5, 5, 4, 4, 4, 3, 3, 3, 2, 2, 2,
	2, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0,
];

const halfsin_table: number[] = [];
export const wave_table_map = [fullsin_table, halfsin_table];

/* pitch modulator */
/* offset to fnum, rough approximation of 14 cents depth. */
export const pm_table: number[][] = [
	[0, 0, 0, 0, 0, 0, 0, 0],    // fnum = 000xxxxxx
	[0, 0, 1, 0, 0, 0, -1, 0],   // fnum = 001xxxxxx
	[0, 1, 2, 1, 0, -1, -2, -1], // fnum = 010xxxxxx
	[0, 1, 3, 1, 0, -1, -3, -1], // fnum = 011xxxxxx
	[0, 2, 4, 2, 0, -2, -4, -2], // fnum = 100xxxxxx
	[0, 2, 5, 2, 0, -2, -5, -2], // fnum = 101xxxxxx
	[0, 3, 6, 3, 0, -3, -6, -3], // fnum = 110xxxxxx
	[0, 3, 7, 3, 0, -3, -7, -3], // fnum = 111xxxxxx
];

/* amplitude lfo table */
/* The following envelop pattern is verified on real YM2413. */
/* each element repeates 64 cycles */
export const am_table = [
	0, 0, 0, 0, 0, 0, 0, 0, 1, 1, 1, 1, 1, 1, 1, 1,  //
	2, 2, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 3, 3, 3,  //
	4, 4, 4, 4, 4, 4, 4, 4, 5, 5, 5, 5, 5, 5, 5, 5,  //
	6, 6, 6, 6, 6, 6, 6, 6, 7, 7, 7, 7, 7, 7, 7, 7,  //
	8, 8, 8, 8, 8, 8, 8, 8, 9, 9, 9, 9, 9, 9, 9, 9,  //
	10, 10, 10, 10, 10, 10, 10, 10, 11, 11, 11, 11, 11, 11, 11, 11, //
	12, 12, 12, 12, 12, 12, 12, 12,                                 //
	13, 13, 13,                                                     //
	12, 12, 12, 12, 12, 12, 12, 12,                                 //
	11, 11, 11, 11, 11, 11, 11, 11, 10, 10, 10, 10, 10, 10, 10, 10, //
	9, 9, 9, 9, 9, 9, 9, 9, 8, 8, 8, 8, 8, 8, 8, 8,  //
	7, 7, 7, 7, 7, 7, 7, 7, 6, 6, 6, 6, 6, 6, 6, 6,  //
	5, 5, 5, 5, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4, 4,  //
	3, 3, 3, 3, 3, 3, 3, 3, 2, 2, 2, 2, 2, 2, 2, 2,  //
	1, 1, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0
];

/* envelope decay increment step table */
/* based on andete's research */
export const eg_step_tables = [
	[0, 1, 0, 1, 0, 1, 0, 1],
	[0, 1, 0, 1, 1, 1, 0, 1],
	[0, 1, 1, 1, 0, 1, 1, 1],
	[0, 1, 1, 1, 1, 1, 1, 1],
];

enum __OPLL_EG_STATE { ATTACK, DECAY, SUSTAIN, RELEASE, DAMP, UNKNOWN };

export const ml_table = [
	1, 1 * 2, 2 * 2, 3 * 2, 4 * 2, 5 * 2, 6 * 2, 7 * 2,
	8 * 2, 9 * 2, 10 * 2, 10 * 2, 12 * 2, 12 * 2, 15 * 2, 15 * 2
];

function dB2(x: number) { return ((x) * 2) }
const kl_table = [
	dB2(0.000), dB2(9.000), dB2(12.000), dB2(13.875), dB2(15.000), dB2(16.125),
	dB2(16.875), dB2(17.625), dB2(18.000), dB2(18.750), dB2(19.125), dB2(19.500),
	dB2(19.875), dB2(20.250), dB2(20.625), dB2(21.000)
];

export const null_patch = new OPLL_PATCH();
/**[OPLL_TONE_NUM][(16 + 3) * 2] */
export const default_patch: OPLL_PATCH[][] = [];
for (let i = 0; i < OPLL_TONE_NUM; i++) {
	default_patch[i] = [];
	for (let j = 0; j < (16 + 3) * 2; j++)
		default_patch[i][j] = new OPLL_PATCH();
}

/**[8 * 16][1 << TL_BITS][4] */
export const tll_table: number[][][] = [];
/**[8 * 2][2] */
export const rks_table: number[][] = [];

/***************************************************

				  Create tables

****************************************************/

//#region 初始化表格
function MakeSinTable() {
	let x;
	for (x = 0; x < PG_WIDTH / 4; x++)
		fullsin_table[PG_WIDTH / 4 + x] = fullsin_table[PG_WIDTH / 4 - x - 1];

	for (x = 0; x < PG_WIDTH / 2; x++)
		fullsin_table[PG_WIDTH / 2 + x] = 0x8000 | fullsin_table[x];

	for (x = 0; x < PG_WIDTH / 2; x++)
		halfsin_table[x] = fullsin_table[x];

	for (x = PG_WIDTH / 2; x < PG_WIDTH; x++)
		halfsin_table[x] = 0xfff;
}


function TL2EG(x: number) { return x << 1 }
function MakeTllTable() {
	let tmp, fnum, block, TL, KL;
	for (fnum = 0; fnum < 16; fnum++) {
		for (block = 0; block < 8; block++) {
			tll_table[(block << 4) | fnum] = [];
			for (TL = 0; TL < 64; TL++) {
				tll_table[(block << 4) | fnum][TL] = [];
				for (KL = 0; KL < 4; KL++) {
					if (KL == 0) {
						tll_table[(block << 4) | fnum][TL][KL] = TL2EG(TL);
					} else {
						tmp = Math.floor(kl_table[fnum] - dB2(3.000) * (7 - block));
						if (tmp <= 0)
							tll_table[(block << 4) | fnum][TL][KL] = TL2EG(TL);
						else
							tll_table[(block << 4) | fnum][TL][KL] = Math.floor((tmp >> (3 - KL)) / EG_STEP) + TL2EG(TL);
					}
				}
			}
		}
	}
}

function MakeRksTable() {
	let fnum8, block;
	for (fnum8 = 0; fnum8 < 2; fnum8++) {
		for (block = 0; block < 8; block++) {
			if (!rks_table[(block << 1) | fnum8])
				rks_table[(block << 1) | fnum8] = [];

			rks_table[(block << 1) | fnum8][1] = (block << 1) + fnum8;
			rks_table[(block << 1) | fnum8][0] = block >> 1;
		}
	}
}

function MakeDefaultPatch() {
	let i, j;
	for (i = 0; i < OPLL_TONE_NUM; i++)
		for (j = 0; j < 19; j++) {
			// OPLL_PATCH.OPLL_getDefaultPatch(i, j, default_patch[i][j * 2]);
		}
}

let tableInitialized = false;
export function InitializeTables() {
	if (tableInitialized)
		return;

	MakeTllTable();
	MakeRksTable();
	MakeSinTable();
	MakeDefaultPatch();
	tableInitialized = true;
}
//#endregion 初始化表格

export function BIT(s: number, b: number) { return (s >> b) & 1; }

export const SLOT_BD1 = 12;
export const SLOT_BD2 = 13;
export const SLOT_HH = 14;
export const SLOT_SD = 15;
export const SLOT_TOM = 16;
export const SLOT_CYM = 17;
