let screen = document.getElementById("screen");
let pattern = document.getElementById("pattern");
let disasm = document.getElementById("disasm")
let register = document.getElementById("register");
let flagDiv = document.getElementById("flagDiv");
let info = document.getElementById("info");

let audio = new AudioContext();

let option = {
	start: false
}

let nes = new NES({ screen, pattern, disasm, register, flagDiv, info, sampleRate: audio.sampleRate });
let processor = audio.createScriptProcessor(1024, 0, 1);
processor.onaudioprocess = (ev) => {
	if (!option.start)
		return;

	const outputData = ev.outputBuffer.getChannelData(0);
	if (nes.OutputAudio(outputData)) {
		nes.OneFrame();
	}
}

processor.connect(audio.destination);

async function OpenFile() {
	// @ts-ignore
	let file = await OpenFileDialog(".nes");
	nes.LoadFile(file);
	nes.Reset();
}

function OpenFileDialog(accept) {
	return new Promise((resolve, reject) => {
		let input = document.createElement("input");
		input.type = "file";
		input.accept = accept;
		input.onchange = async (ev) => {
			if (!input.files || input.files.length == 0) {
				reject();
				return;
			}

			let reader = new FileReader();
			reader.onload = (ev) => {
				let temp = ev.target.result;
				let buffer = new Uint8Array(temp);
				resolve(buffer);
			}
			reader.readAsArrayBuffer(input.files[0]);
		}
		input.click();
	});
}

function Test() {
	// let canvas = document.getElementById("pattern");
	// let disasm = document.getElementById("disasm");
	// let register = document.getElementById("register");
	// let flagDiv = document.getElementById("flagDiv");
	// nes.SetDebug({ canvas, disasm, register, flagDiv });
	audio.resume();

}

function Step() {
	nes.bus.debug.diassembler?.Update();
	nes.bus.debug.patternTable?.Update();
	nes.bus.Clock();
}

function OneFrame() {
	nes.bus.debug.diassembler?.Update();
	nes.bus.debug.patternTable?.Update();
	nes.OneFrame();
}

function Run() {
	option.start = true;
	// setInterval(() => {
	// 	nes.OneFrame();
	// }, 1000 / 60);
}