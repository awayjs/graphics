import { Point, ColorUtils, Rectangle, Matrix } from '@awayjs/core';

import { BitmapImage2D } from '@awayjs/stage';

import { GradientFillStyle } from '../draw/fills/GradientFillStyle';
import { SolidFillStyle } from '../draw/fills/SolidFillStyle';

export interface ITextureAtlasEntry{
	bitmap?: BitmapImage2D;
	uvMatrix?: Matrix;
	uvRectangle?: Rectangle;
}

export class TextureAtlas {
	private static _allTextureAtlas: TextureAtlas[]=[];
	private static _allGradients: StringMap<ITextureAtlasEntry> = {};
	private static _allColors: StringMap<ITextureAtlasEntry> = {};

	public static getTextureForColor(solid: SolidFillStyle): BitmapImage2D {
		const hash: string = solid.toString();

		if (hash in this._allColors) {
			solid.uvMatrix = this._allColors[hash].uvMatrix;
			return this._allColors[hash].bitmap;
		}

		// find textureAtlas that has empty space:
		const len = this._allTextureAtlas.length;

		let textureAtlas: TextureAtlas;
		for (let t = 0; t < len; t++) {
			if (this._allTextureAtlas[t].fitColor()) {
				textureAtlas = this._allTextureAtlas[t];
				break;
			}
		}

		if (!textureAtlas) {
			textureAtlas = new TextureAtlas();
			this._allTextureAtlas.push(textureAtlas);
		}

		const colorPos: Point = textureAtlas.addSolid(solid);

		solid.uvMatrix = new Matrix(0, 0, 0, 0, colorPos.x, colorPos.y);

		this._allColors[hash] = {
			uvMatrix: solid.uvMatrix,
			bitmap: textureAtlas.bitmap,
			uvRectangle: null
		};

		return textureAtlas.bitmap;
	}

	public static getTextureForGradient(gradient: GradientFillStyle): BitmapImage2D {
		const hash: string = gradient.toString();

		if (hash in this._allGradients) {
			gradient.uvRectangle = this._allGradients[hash].uvRectangle;
			return this._allGradients[hash].bitmap;
		}

		let textureAtlas: TextureAtlas;

		const len = this._allTextureAtlas.length;
		for (let t = 0; t < len; t++) {
			if (this._allTextureAtlas[t].fitGradient()) {
				textureAtlas = this._allTextureAtlas[t];
				break;
			}
		}

		if (!textureAtlas) {
			textureAtlas = new TextureAtlas();
			this._allTextureAtlas.push(textureAtlas);
		}

		textureAtlas.addGradient(gradient);

		this._allGradients[hash] = {
			bitmap: textureAtlas.bitmap,
			uvRectangle: gradient.uvRectangle
		};

		return textureAtlas.bitmap;
	}

	public availableRows: number = 256;
	public gradientRow: number = -1;

	// begin outside valid region, because will be invalid `availableRows`
	public colorRow: number = 256;
	public colorPosition: number = 0;

	public bitmap: BitmapImage2D;

	constructor() {
		this.bitmap = new BitmapImage2D(256, 256, true, null);
		this.availableRows = 256;
	}

	public fitGradient(): boolean {
		return (this.availableRows > 0);
	}

	public fitColor(): boolean {
		return this.availableRows > 0 || this.colorPosition > 0;
	}

	public addGradient(gradient: GradientFillStyle): number {

		if (this.availableRows <= 0) {
			console.error('[TextureAtlass] There are not free space for gradient:', gradient);
			return;
		}

		this.gradientRow++;
		this.availableRows--;

		for (let px = 0; px < 256; px++) {
			this.bitmap.setPixelFromArray(px, this.gradientRow, gradient.getColorAtPosition(px));
		}

		gradient.uvRectangle.x = 1 / 512;
		gradient.uvRectangle.y = 1 / 512 + (this.gradientRow / 256);//+1/512;
		gradient.uvRectangle.width = 1 - 1 / 512;
		gradient.uvRectangle.height = gradient.uvRectangle.y;

		return this.availableRows;
	}

	public addSolid(solid: SolidFillStyle): Point {
		this.colorPosition--;

		if (this.colorPosition < 0) {
			this.colorRow--;
			this.availableRows--;
			this.colorPosition = 255;

			if (this.availableRows < 0) {
				this.availableRows = 0;

				console.error('[TextureAtlass] There are not free space for color:', solid.color.toString(16));
				return null;
			}
		}

		const argb = ColorUtils.float32ColorToARGB(solid.color);

		argb[0] = solid.alpha;

		this.bitmap.setPixelFromArray(this.colorPosition, this.colorRow, argb);

		return new Point(1 / 512 + this.colorPosition / 256, 1 / 512 + this.colorRow / 256);
	}

}