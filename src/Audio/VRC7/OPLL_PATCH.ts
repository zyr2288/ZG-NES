import { OPLL } from "./OPLL";
import { default_inst } from "./OPLL_CONST";

export class OPLL_PATCH {
	TL = 0
	FB = 0;
	EG = 0;
	ML = 0;
	AR = 0;
	DR = 0;
	SL = 0;
	RR = 0;
	KR = 0;
	KL = 0;
	AM = 0;
	PM = 0;
	WS = 0;

	CopyValue(target: OPLL_PATCH) {
		target.TL = this.TL;
		target.FB = this.FB;
		target.EG = this.EG;
		target.ML = this.ML;
		target.AR = this.AR;
		target.DR = this.DR;
		target.SL = this.SL;
		target.RR = this.RR;
		target.KR = this.KR;
		target.KL = this.KL;
		target.AM = this.AM;
		target.PM = this.PM;
		target.WS = this.WS;
	}

	static OPLL_dumpToPatch(index: number, dump: number[], patch: OPLL_PATCH[]) {
		patch[0].AM = (dump[index + 0] >> 7) & 1;
		patch[1].AM = (dump[index + 1] >> 7) & 1;
		patch[0].PM = (dump[index + 0] >> 6) & 1;
		patch[1].PM = (dump[index + 1] >> 6) & 1;
		patch[0].EG = (dump[index + 0] >> 5) & 1;
		patch[1].EG = (dump[index + 1] >> 5) & 1;
		patch[0].KR = (dump[index + 0] >> 4) & 1;
		patch[1].KR = (dump[index + 1] >> 4) & 1;
		patch[0].ML = (dump[index + 0]) & 15;
		patch[1].ML = (dump[index + 1]) & 15;
		patch[0].KL = (dump[index + 2] >> 6) & 3;
		patch[1].KL = (dump[index + 3] >> 6) & 3;
		patch[0].TL = (dump[index + 2]) & 63;
		patch[1].TL = 0;
		patch[0].FB = (dump[index + 3]) & 7;
		patch[1].FB = 0;
		patch[0].WS = (dump[index + 3] >> 3) & 1;
		patch[1].WS = (dump[index + 3] >> 4) & 1;
		patch[0].AR = (dump[index + 4] >> 4) & 15;
		patch[1].AR = (dump[index + 5] >> 4) & 15;
		patch[0].DR = (dump[index + 4]) & 15;
		patch[1].DR = (dump[index + 5]) & 15;
		patch[0].SL = (dump[index + 6] >> 4) & 15;
		patch[1].SL = (dump[index + 7] >> 4) & 15;
		patch[0].RR = (dump[index + 6]) & 15;
		patch[1].RR = (dump[index + 7]) & 15;
	}

	static OPLL_getDefaultPatch(type: number, num: number, patch: OPLL_PATCH[]) {
		OPLL_PATCH.OPLL_dumpToPatch(num * 8, default_inst[type], patch);
	}

	static OPLL_setPatch(opll: OPLL, dump: number[]) {
		let i;
		for (i = 0; i < 19; i++) {
			let patch: OPLL_PATCH[] = [new OPLL_PATCH(), new OPLL_PATCH()];
			OPLL_PATCH.OPLL_dumpToPatch(i * 8, dump, patch);
			// memcpy(& opll -> patch[i * 2 + 0], & patch[0], sizeof(OPLL_PATCH));
			// memcpy(& opll -> patch[i * 2 + 1], & patch[1], sizeof(OPLL_PATCH));
			patch[0].CopyValue(opll.patch[i * 2 + 0]);
			patch[1].CopyValue(opll.patch[i * 2 + 1]);
		}
	}

	static OPLL_patchToDump(patch: OPLL_PATCH[], dump: number[]) {
		dump[0] = (patch[0].AM << 7) + (patch[0].PM << 6) + (patch[0].EG << 5) + (patch[0].KR << 4) + patch[0].ML;
		dump[1] = (patch[1].AM << 7) + (patch[1].PM << 6) + (patch[1].EG << 5) + (patch[1].KR << 4) + patch[1].ML;
		dump[2] = (patch[0].KL << 6) + patch[0].TL;
		dump[3] = (patch[1].KL << 6) + (patch[1].WS << 4) + (patch[0].WS << 3) + patch[0].FB;
		dump[4] = (patch[0].AR << 4) + patch[0].DR;
		dump[5] = (patch[1].AR << 4) + patch[1].DR;
		dump[6] = (patch[0].SL << 4) + patch[0].RR;
		dump[7] = (patch[1].SL << 4) + patch[1].RR;
	}

	static OPLL_copyPatch(opll: OPLL, num: number, patch: OPLL_PATCH) {
		patch.CopyValue(opll.patch[num]);
		// memcpy(&opll->patch[num], patch, sizeof(OPLL_PATCH));
	}


}