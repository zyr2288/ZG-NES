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
	nes.UpdatePattern(canvas);
}

function Step() {
	nes.bus.cpu.Step();
}