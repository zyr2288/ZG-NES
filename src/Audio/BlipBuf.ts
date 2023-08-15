/**
 * 基于 Blip_buf v1.1.0 开发 http://www.slack.net/~ant/
 */

const BlStep = [
	[43, -115, 350, -488, 1136, -914, 5861, 21022],
	[44, -118, 348, -473, 1076, -799, 5274, 21001],
	[45, -121, 344, -454, 1011, -677, 4706, 20936],
	[46, -122, 336, -431, 942, -549, 4156, 20829],
	[47, -123, 327, -404, 868, -418, 3629, 20679],
	[47, -122, 316, -375, 792, -285, 3124, 20488],
	[47, -120, 303, -344, 714, -151, 2644, 20256],
	[46, -117, 289, -310, 634, -17, 2188, 19985],
	[46, -114, 273, -275, 553, 117, 1758, 19675],
	[44, -108, 255, -237, 471, 247, 1356, 19327],
	[43, -103, 237, -199, 390, 373, 981, 18944],
	[42, -98, 218, -160, 310, 495, 633, 18527],
	[40, -91, 198, -121, 231, 611, 314, 18078],
	[38, -84, 178, -81, 153, 722, 22, 17599],
	[36, -76, 157, -43, 80, 824, -241, 17092],
	[34, -68, 135, -3, 8, 919, -476, 16558],
	[32, -61, 115, 34, -60, 1006, -683, 16001],
	[29, -52, 94, 70, -123, 1083, -862, 15422],
	[27, -44, 73, 106, -184, 1152, -1015, 14824],
	[25, -36, 53, 139, -239, 1211, -1142, 14210],
	[22, -27, 34, 170, -290, 1261, -1244, 13582],
	[20, -20, 16, 199, -335, 1301, -1322, 12942],
	[18, -12, -3, 226, -375, 1331, -1376, 12293],
	[15, -4, -19, 250, -410, 1351, -1408, 11638],
	[13, 3, -35, 272, -439, 1361, -1419, 10979],
	[11, 9, -49, 292, -464, 1362, -1410, 10319],
	[9, 16, -63, 309, -483, 1354, -1383, 9660],
	[7, 22, -75, 322, -496, 1337, -1339, 9005],
	[6, 26, -85, 333, -504, 1312, -1280, 8355],
	[4, 31, -94, 341, -507, 1278, -1205, 7713],
	[3, 35, -102, 347, -506, 1238, -1119, 7082],
	[1, 40, -110, 350, -499, 1190, -1021, 6464],
	[0, 43, -115, 350, -488, 1136, -914, 5861]
];

const PreShift = 32;
// const PreShift = 0;
// const TimeBits = PreShift + 20;
const TimeBits = PreShift + 20;

const TimeUnit = 1 << TimeBits;

// const BassShift = 5;
const BassShift = 5;

const EndFrameExtra = 2;
const HalfWidth = 8;
/**缓冲区扩充长度 */
const BufExtra = HalfWidth * 2 + EndFrameExtra;

// const PhaseBits = 5;
const PhaseBits = 5;
const PhaseCount = 1 << PhaseBits;
// const PhaseShift = 15;

// const DeltaBits = 15;
const DeltaBits = 15;
const DeltaUnit = 1 << DeltaBits;

const FracBits = TimeBits - PreShift;
const BlipMaxRatio = 1 << 20;
const BlipMaxFrame = 4000;

class BlipT {
	factor = 0;
	offset = 0;
	avail = 0;
	size = 0;
	integator = 0;
	buffer!: Int32Array;		// Array<int32>
}

export class BlipBuf {

	get BufAvail() { return this.blipT.avail; }

	outBuffer: Int16Array;
	private blipT = new BlipT();

	constructor(sampleRate: number) {

		let sampleSize = sampleRate / 10;
		this.outBuffer = new Int16Array(sampleSize);

		this.blipT.factor = TimeUnit / BlipMaxRatio;
		this.blipT.offset = this.blipT.factor / 2;
		this.blipT.avail = 0;
		this.blipT.integator = 0;
		this.blipT.size = sampleSize;

		this.blipT.buffer = new Int32Array(sampleSize + BufExtra);
	}

	// CreateNewBuffer(bufferSize: number) {
	// 	this.allBlipT = [];
	// 	this.allBlipT.length = bufferSize;
	// 	for (let i = 0; i < this.allBlipT.length; i++)
	// 		this.allBlipT[i] = new BlipT();

	// 	this.nowBlipT = this.allBlipT[0];
	// 	this.BlipClear();
	// }

	SetSampleRate(clockRate: number, sampleRate: number) {
		const commonValue = [11025, 22050, 24000, 44100, 48000];
		if (!commonValue.includes(sampleRate)) {
			throw Error("采样率不对");
		}

		let factor = Math.floor(TimeUnit * sampleRate / clockRate);
		this.blipT.factor = factor;
		// if (this.nowBlipT.factor < factor)
		// 	this.nowBlipT.factor++;
		// this.blipT.factor = TimeUnit * sampleRate / clockRate;

	}

	ReadSample(length: number, stereo: boolean) {
		let count = length > this.blipT.avail ? this.blipT.avail : length;
		if (count) {
			const step = stereo ? 2 : 1;
			let sum = this.blipT.integator;
			let outStep = 0;
			for (let i = 0; i < count; i++) {
				let s = sum >> DeltaBits;
				sum += this.blipT.buffer[i];
				if (s < 0) {
					s &= 0x7FFF;
					s ^= 0x7FFF;
					s = -s;
				} else {
					s &= 0x7FFF;
				}

				// if ((s & 0x7FFF) !== s) {
				// 	s >>= 16;
				// 	s ^= 0x7FFF;
				// }
				this.outBuffer[outStep] = s;
				outStep += step;
				sum -= s << (DeltaBits - BassShift);
			}
			this.blipT.integator = sum;
		}
		this.BlipRemoveSamples(count);
	}

	// RemoveSamples(count: number) {
	// 	let remain = this.blipT.avail + BufExtra - count;
	// 	this.blipT.avail -= count;
	// }

	BlipAddDelta(time: number, delta: number) {
		let fixed = (time * this.blipT.factor + this.blipT.offset) >> PreShift;
		let bufferStart = (this.blipT.avail + (fixed >> FracBits));
		// buf_t* out = SAMPLES( m ) + m->avail + (fixed >> frac_bits);
		//let phase = fixed >> PhaseShift & (PhaseCount - 1);
		const PhaseShift = FracBits - PhaseBits;
		const phase = fixed >> PhaseShift & (PhaseCount - 1);

		const currect = BlStep[phase];
		const nexSteps = BlStep[phase + 1];

		const revPrt = BlStep[PhaseCount - phase];
		const preRevPrt = BlStep[PhaseCount - phase - 1];

		//let interp = fixed >> (PhaseShift - DeltaBits) & (DeltaUnit - 1);
		const interp = fixed >> (PhaseShift - DeltaBits) & (DeltaUnit - 1);
		const delta2 = (delta * interp) >> DeltaBits;
		delta -= delta2;

		for (let i = 0; i < HalfWidth; i++)
			this.blipT.buffer[i + bufferStart] += currect[i] * delta + nexSteps[i] * delta2;

		bufferStart += HalfWidth;
		for (let i = 0; i < HalfWidth; i++)
			this.blipT.buffer[i + bufferStart] += revPrt[7 - i] * delta + preRevPrt[7 - i] * delta2;


		// 下面不对
		// this.blipT.buffer[0] += currect[0] * delta + nexSteps[0] * delta2;
		// this.blipT.buffer[1] += currect[1] * delta + nexSteps[1] * delta2;
		// this.blipT.buffer[2] += currect[2] * delta + nexSteps[2] * delta2;
		// this.blipT.buffer[3] += currect[3] * delta + nexSteps[3] * delta2;
		// this.blipT.buffer[4] += currect[4] * delta + nexSteps[4] * delta2;
		// this.blipT.buffer[5] += currect[5] * delta + nexSteps[5] * delta2;
		// this.blipT.buffer[6] += currect[6] * delta + nexSteps[6] * delta2;
		// this.blipT.buffer[7] += currect[7] * delta + nexSteps[7] * delta2;

		// this.blipT.buffer[8] += revPrt[7] * delta + preRevPrt[7] * delta2;
		// this.blipT.buffer[9] += revPrt[6] * delta + preRevPrt[6] * delta2;
		// this.blipT.buffer[10] += revPrt[5] * delta + preRevPrt[5] * delta2;
		// this.blipT.buffer[11] += revPrt[4] * delta + preRevPrt[4] * delta2;
		// this.blipT.buffer[12] += revPrt[3] * delta + preRevPrt[3] * delta2;
		// this.blipT.buffer[13] += revPrt[2] * delta + preRevPrt[2] * delta2;
		// this.blipT.buffer[14] += revPrt[1] * delta + preRevPrt[1] * delta2;
		// this.blipT.buffer[15] += revPrt[0] * delta + preRevPrt[0] * delta2;
	}

	BlipAddDeltaFast(time: number, delta: number) {
		let fixed = (time * this.blipT.factor + this.blipT.offset) >> PreShift;
		let bufferStart = (this.blipT.avail + (fixed >> FracBits));

		// let interp = fixed >> (FracBits - DeltaBits) & (DeltaUnit - 1);
		let interp = fixed >> 5 & (DeltaUnit - 1);
		let delta2 = delta * interp;

		this.blipT.buffer[bufferStart + 7] += delta * -delta2;
		this.blipT.buffer[bufferStart + 8] += delta2;
	}

	BlipEndFrame(time: number) {
		let off = time * this.blipT.factor + this.blipT.offset;
		this.blipT.avail += off >> TimeBits;
		this.blipT.offset = off & (TimeUnit - 1);
	}

	private BlipRemoveSamples(count: number) {
		let remain = this.blipT.avail + BufExtra - count;
		this.blipT.avail -= count;

		for (let i = 0; i < remain; i++)
			this.blipT.buffer[i] = this.blipT.buffer[count + i];

		for (let i = 0; i < count; i++)
			this.blipT.buffer[remain + i] = 0;

	}

	private BlipClear() {
		this.blipT.offset = this.blipT.factor / 2;
		this.blipT.avail = 0;
		this.blipT.integator = 0;
		this.blipT.buffer.fill(0);
	}
}