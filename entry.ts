import type { NES } from "./src/NES";

// @ts-ignore
var nes = new NES();

var OpenFile = async () => {
	// @ts-ignore
	let file = await OpenFileDialog(".nes");
	nes.LoadFile(file);
}

var OpenFileDialog = (accept: string): Promise<Uint8Array> => {
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
				let temp = ev.target!.result;
				let buffer = new Uint8Array(temp as ArrayBuffer);
				resolve(buffer);
			}
			reader.readAsArrayBuffer(input.files[0]);
		}
		input.click();
	});
}