import { ColorUtils, Matrix, Rectangle } from '@awayjs/core';

import { GraphicsFillStyle } from './GraphicsFillStyle';
import { GradientType } from './GradientType';
import { GraphicsStrokeStyle } from './GraphicsStrokeStyle';
import { IStyleData } from './IGraphicsData';

export class GradientFillStyle implements IStyleData {
	public static data_type: string = '[graphicsdata GradientFillStyle]';
	/**
     * The Vector of drawing commands as integers representing the path.
     */
	public colors: number[];
	public colors_r: number[];
	public colors_g: number[];
	public colors_b: number[];
	public alphas: number[];
	public ratios: number[];
	public ratio_min: number;
	public ratio_max: number;
	public type: GradientType;
	public matrix: Matrix;
	public spreadMethod: string;
	public interpolationMethod: string;
	public focalPointRatio: number;
	public uvRectangle: Rectangle;

	public baseStyle: GraphicsFillStyle | GraphicsStrokeStyle;
	private _uvMatrix: Matrix;

	constructor(
		type: GradientType,
		colors: number[],
		alphas: number[],
		ratios: number[],
		matrix: Matrix,
		spreadMethod: string,
		interpolationMethod: string,
		focalPointRatio: number
	) {
		if (colors.length != alphas.length || colors.length != ratios.length) {
			throw ('GradientFillStyle: Error - colors, alphas and ratios must be of same length');
		}

		this.colors = colors;
		this.colors_r = [];
		this.colors_g = [];
		this.colors_b = [];
		this.colors_r.length = this.colors_g.length = this.colors_g.length = this.colors.length;
		this.alphas = alphas;
		this.ratios = ratios;
		this.matrix = matrix;
		this.type = type;

		this.uvRectangle = new Rectangle();
		this.ratios.sort((a, b) => a - b);
		this.ratio_min = this.ratios[0];
		this.ratio_max = this.ratios[this.ratios.length - 1];

		//  todo: in case the ratios.sort has changed the order of ratios,
		//  do we need to sync the order of color too ?

		let c: number = colors.length;
		let argb: number[];
		while (c > 0) {
			c--;
			argb = ColorUtils.float32ColorToARGB(colors[c]);
			this.colors_r[c] = argb[1];
			this.colors_g[c] = argb[2];
			this.colors_b[c] = argb[3];
		}
	}

	public getUVMatrix(): Matrix {
		if (this._uvMatrix) {
			return this._uvMatrix;
		}

		if (!this.matrix) {
			this.matrix = new Matrix();
		}

		const projection_width: number = 1638.4;

		const projection_width_half: number = projection_width * 0.5;

		// Get and invert the uv transform:
		// not TRANSFORM already transformed matrix
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

		let resultMatrix: Matrix;

		if (this.type == GradientType.LINEAR) {
			resultMatrix = new Matrix(
				(a_inv / projection_width) * (1 - (1 / 256)),
				0,
				(c_inv / projection_width) * (1 - (1 / 256)),
				0,
				(this.uvRectangle.x) + ((tx_inv + projection_width_half) / projection_width) * (1 - (1 / 256)),
				this.uvRectangle.y);
		} else if (this.type == GradientType.RADIAL) {
			resultMatrix = new Matrix(
				a_inv / projection_width_half,
				b_inv / projection_width_half,
				c_inv / projection_width_half,
				d_inv / projection_width_half,
				((tx_inv + projection_width_half) / projection_width_half) - 1,
				((ty_inv + projection_width_half) / projection_width_half) - 1);
		} else {
			this._uvMatrix = this.matrix;
		}

		return this._uvMatrix = resultMatrix;
	}

	public getColorAtPosition(value: number): number[] {
		let r1: number = -1;
		let r2: number = -1;
		if (value <= this.ratio_min) {
			r1 = 0;
			r2 = 0;
		} else if (value >= this.ratio_max) {
			r1 = this.ratios.length - 1;
			r2 = this.ratios.length - 1;
		} else {
			for (let r: number = 0; r < this.ratios.length - 1;r++) {
				if (value == this.ratios[r]) {
					r1 = r;
					r2 = r;
					break;
				} else if (value == this.ratios[r + 1]) {
					r1 = r + 1;
					r2 = r + 1;
					break;
				} else if (value >= this.ratios[r] && value <= this.ratios[r + 1]) {
					r1 = r;
					r2 = r + 1;
					break;
				}
			}
		}
		if (r1 == r2) {
			return [this.alphas[r1], this.colors_r[r1], this.colors_g[r1], this.colors_b[r1]];
		}
		const mix: number = (value - this.ratios[r1]) / (this.ratios[r2] - this.ratios[r1]);
		const mix_neg: number = 1 - mix;
		const color_a: number = this.alphas[r2] * mix + this.alphas[r1] * mix_neg;
		const color_r: number = this.colors_r[r2] * mix + this.colors_r[r1] * mix_neg;
		const color_g: number = this.colors_g[r2] * mix + this.colors_g[r1] * mix_neg;
		const color_b: number = this.colors_b[r2] * mix + this.colors_b[r1] * mix_neg;
		return [color_a, color_r, color_g, color_b];
	}

	public toString(): string {
		let str: string = '';
		let c: number = this.colors.length;
		while (c > 0) {
			c--;
			str += this.colors[c] + '#' + this.alphas[c] + '#' + this.ratios[c] + '#';
		}
		return str;
	}

	public get data_type(): string {
		return GradientFillStyle.data_type;
	}
}