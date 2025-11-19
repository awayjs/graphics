import { IFillStyle } from '../IGraphicsData';
import { Matrix } from '@awayjs/core';

export class SolidFillStyle implements IFillStyle {
	public static readonly data_type = '[graphicsdata SolidFillStyle]';

	public uvMatrix: Matrix;

	constructor(
		public color: ui32 = 0xffffff,
		public alpha: number = 1
	) {}

	public getUVMatrix() {
		return this.uvMatrix;
	}

	public get data_type () {
		return SolidFillStyle.data_type;
	}

	public toString(): string {
		return (this.color | 0).toString(16) + '#' + ((this.alpha * 255) | 0).toString(16);;
	}
}