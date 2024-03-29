import { Matrix } from '@awayjs/core';

import { IFillStyle } from '../IGraphicsData';
import { IMaterial } from '@awayjs/renderer';
import { BitmapImage2D, ImageUtils } from '@awayjs/stage';

export class BitmapFillStyle implements IFillStyle {
	public static data_type: string = '[graphicsdata BitmapFillStyle]';
	/**
     * The Vector of drawing commands as integers representing the path.
     */
	public material: IMaterial;
	public imgWidth: number;
	public imgHeight: number;
	public matrix: Matrix;
	public repeat: boolean;
	public smooth: boolean;
	private _uvMatrix: Matrix;

	constructor(material: IMaterial, matrix: Matrix, repeat: boolean,  smooth: boolean) {
		this.material = material;
		this.matrix = matrix;
		this.repeat = repeat;
		this.smooth = smooth;
	}

	public get data_type(): string {
		return BitmapFillStyle.data_type;
	}

	public getUVMatrix(): Matrix {

		if (!this.matrix)
			this.matrix = new Matrix();

		if (!this._uvMatrix)
			this._uvMatrix = new Matrix();

		const texture = this.material.getTextureAt(0);
		const style = this.material.style;

		const image = <BitmapImage2D> (texture.getImageAt(0) || style?.getImageAt(texture, 0) || ImageUtils.getDefaultImage2D());

		let projection_width_half: number;
		let projection_height_half: number;

		if (!image) {
			console.warn('[BitmapFillStyle] - getUVMatrix - no texture found');
			projection_width_half = 512;
			projection_height_half = 512;
		} else {
			projection_width_half = image.width;
			projection_height_half = image.height;
		}

		//	Get and invert the uv transform:
		const a: number =  this.matrix.a;
		const b: number =  this.matrix.b;
		const c: number =  this.matrix.c;
		const d: number =  this.matrix.d;
		const tx: number =  this.matrix.tx;
		const ty: number =  this.matrix.ty;

		const a_inv: number =  d / (a * d - b * c);
		const b_inv: number =  -b / (a * d - b * c);
		const c_inv: number =  -c / (a * d - b * c);
		const d_inv: number =  a / (a * d - b * c);
		const tx_inv: number =  (c * ty - d * tx) / (a * d - b * c);
		const ty_inv: number =  -(a * ty - b * tx) / (a * d - b * c);

		this._uvMatrix.a = a_inv / projection_width_half;
		this._uvMatrix.b = b_inv / projection_height_half;
		this._uvMatrix.c = c_inv / projection_width_half;
		this._uvMatrix.d = d_inv / projection_height_half;
		this._uvMatrix.tx = tx_inv / projection_width_half;
		this._uvMatrix.ty = ty_inv / projection_height_half;

		return this._uvMatrix;
	}
}