import { Bus } from "../Bus";
import { ButtonType } from "./Controller";

/**1P按键控制 */
export const enum Keys {
	//1P 按键
	Up = "KeyW",		//W
	Down = "KeyS",		//S
	Left = "KeyA",		//A
	Right = "KeyD",		//D
	Select = "KeyZ",	//Z
	Start = "KeyX",		//X
	B = "KeyG",			//G
	A = "KeyH",			//H
	TB = "KeyT",		//T
	TA = "KeyY"			//Y
}

export enum InputType {
	StandardController = 1
}

export class InputAPI {

	private inputType: InputType = InputType.StandardController;
	private readonly bus: Bus;

	constructor(bus: Bus) {
		this.bus = bus;
		window.addEventListener("keydown", (ev) => {
			this.CheckStandardController(ev, true);
		});

		window.addEventListener("keyup", (ev) => {
			this.CheckStandardController(ev, false);
		});
	}

	CheckStandardController(ev: KeyboardEvent, isKeyDown: boolean) {
		const player = 0;
		switch (ev.code) {
			case Keys.A:
				this.bus.controller.buttonStatue[player][ButtonType.A] = isKeyDown;
				break;
			case Keys.B:
				this.bus.controller.buttonStatue[player][ButtonType.B] = isKeyDown;
				break;
			case Keys.Select:
				this.bus.controller.buttonStatue[player][ButtonType.Select] = isKeyDown;
				break;
			case Keys.Start:
				this.bus.controller.buttonStatue[player][ButtonType.Start] = isKeyDown;
				break;
			case Keys.Up:
				this.bus.controller.buttonStatue[player][ButtonType.Up] = isKeyDown;
				break;
			case Keys.Down:
				this.bus.controller.buttonStatue[player][ButtonType.Down] = isKeyDown;
				break;
			case Keys.Left:
				this.bus.controller.buttonStatue[player][ButtonType.Left] = isKeyDown;
				break;
			case Keys.Right:
				this.bus.controller.buttonStatue[player][ButtonType.Right] = isKeyDown;
				break;
		}
	}
}