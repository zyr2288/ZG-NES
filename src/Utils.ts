export class Utils {
	//#region 拷贝数组
	/**
	 * 拷贝数组
	 * @param source 要拷贝的源
	 * @param sourceIndex 拷贝源的起始位置
	 * @param destination 目标
	 * @param destinationIndex 目标起始位置
	 */
	public static CopyArray(source: Uint8Array, sourceIndex: number, destination: Uint8Array, destinationIndex: number) {
		for (let i = 0; i + sourceIndex < source.length && i + destinationIndex < destination.length; i++) {
			destination[destinationIndex + i] = source[sourceIndex + i];
		}
	}
	//#endregion 拷贝数组
}