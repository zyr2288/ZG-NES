import { Audio } from "../Interface/Audio";
import { Screen } from "../Interface/Screen";
import { NES } from "../NES";

// let nesWorker = new Worker("nes-worker.js");
// nesWorker.onmessage = OnMessage;
// let messages: ((response: Message) => void)[] = [];

// function PostMessage(command: CommandNames, data: any) {
// 	return new Promise((resolve, reject) => {
// 		let messageId = Math.random();
// 		nesWorker.postMessage({ messageId, command, data });
// 		messages[messageId] = (response: Message) => {
// 			resolve(response);
// 		};
// 	});
// }

// function OnMessage(e: any) {
// 	const { messageId, data } = e.data;
// 	if (!messages[messageId])
// 		return;

// 	messages[messageId].call(this, data);
// 	delete (messages[messageId]);
// }


function GetHTMLElementById<T extends keyof HTMLElementTagNameMap>(id: string, type: T) {
	let element = document.getElementById(id) as HTMLElementTagNameMap[T];
	return element;
}

function BindingButtonAction(buttonId: string, func: (ev: MouseEvent) => any) {
	let button = GetHTMLElementById(buttonId, "button");
	button.onclick = func;
}

function OpenFileDialog(accept: string): Promise<Uint8Array> {
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
				let temp = ev.target!.result as ArrayBuffer;
				let buffer = new Uint8Array(temp);
				resolve(buffer);
			}
			reader.readAsArrayBuffer(input.files[0]);
		}
		input.click();
	});
}



let screen = GetHTMLElementById("screen", "canvas");

let pattern = GetHTMLElementById("pattern", "canvas");
let disasm = GetHTMLElementById("disasm", "div");
let register = GetHTMLElementById("register", "div");
let flagDiv = GetHTMLElementById("flagDiv", "div");
let info = GetHTMLElementById("info", "div");

let option = {
	start: false,
	threadId: null as NodeJS.Timer | null,
}

let nesScreen = new Screen(screen);
let nesAudio = new Audio();

let nes = new NES({
	sampleRate: nesAudio.sampleRate,
	sampleLength: nesAudio.sampleLength,
	OnFrame: (data) => {
		nesScreen.SetPixels(data);
	},
	OnAudio: (data) => {
		nesAudio.GetBuffer(data);
	}
});

BindingButtonAction("btn-openFile", async (ev) => {
	let file = await OpenFileDialog(".nes");
	nes.LoadFile(file);
});

BindingButtonAction("btn-test", (ev) => {
	nesAudio.Start();
});

BindingButtonAction("btn-step", (ev) => {
	// nes.bus.debug.diassembler?.Update();
	// nes.bus.debug.patternTable?.Update();
	// nes.bus.Clock();
});

BindingButtonAction("btn-oneFrame", (ev) => {
	// nes.bus.debug.diassembler?.Update();
	// nes.bus.debug.patternTable?.Update();
	// nes.OneFrame();
});


BindingButtonAction("btn-run", (ev) => {
	const fps = 60;
	let now;
	let then = Date.now();
	const interval = 1000 / fps;
	let delta;
	window.requestAnimationFrame(function Frame() {
		window.requestAnimationFrame(Frame);
		now = Date.now();
		delta = now - then;
		if (delta > interval) {
			nes.OneFrame();
			then = now - (delta % interval);
		}
	});
});