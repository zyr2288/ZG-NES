import { OutBuffer } from "../Audio/APU";

const AudioBufferSize = 1024;
const BufferLength = 3;

interface AudioBuffer {
	buffer: Float32Array;
	ready: boolean;
}

export class Audio {

	audio: AudioContext;

	readonly sampleRate: number;
	readonly sampleLength: number;

	private readBuffer = { currect: 0, index: 0 };
	private renderIndex = 1;
	private buffers: AudioBuffer[] = [];
	private waiting = false;

	constructor() {
		this.audio = new AudioContext();
		let script = this.audio.createScriptProcessor(AudioBufferSize, 0, 1);
		script.onaudioprocess = this.Process.bind(this);

		this.sampleRate = this.audio.sampleRate;
		this.sampleLength = AudioBufferSize;

		script.connect(this.audio.destination);
		this.audio.resume();

		for (let i = 0; i < BufferLength; i++)
			this.buffers[i] = { buffer: new Float32Array(AudioBufferSize), ready: i !== 0 };
	}

	Start() {
		this.audio.resume();
	}

	GetBuffer(buffer: OutBuffer) {
		let buf = this.buffers[this.readBuffer.currect];
		let bufferIndex = 0;
		while (bufferIndex < buffer.length) {
			buf.buffer[this.readBuffer.index] = buffer.buffer[bufferIndex] / 32768;
			bufferIndex++;

			if (++this.readBuffer.index === AudioBufferSize) {
				this.readBuffer.index = 0;
				if (++this.readBuffer.currect >= BufferLength)
					this.readBuffer.currect = 0;

				buf.ready = true;
				buf = this.buffers[this.readBuffer.currect];
			}
		}
	}

	private Process(ev: AudioProcessingEvent) {
		const tempBuffer = ev.outputBuffer.getChannelData(0);
		const renderBuffer = this.buffers[this.renderIndex];
		if (!renderBuffer.ready)
			return;

		for (let i = 0; i < AudioBufferSize; i++) {
			tempBuffer[i] = renderBuffer.buffer[i];
		}

		renderBuffer.ready = false;
		if (++this.renderIndex >= BufferLength)
			this.renderIndex = 0;
	}
}