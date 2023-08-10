var nes = new NES();

async function OpenFile() {
	// @ts-ignore
	let file = await OpenFileDialog(".nes");
	nes.LoadFile(file);
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
	let canvas = document.getElementById("pattern");
	let disasm = document.getElementById("disasm");
	let register = document.getElementById("register");
	let flagDiv = document.getElementById("flagDiv");
	nes.SetDebug({ canvas, disasm, register, flagDiv });
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