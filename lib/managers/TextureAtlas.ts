import { Point, ColorUtils, Rectangle } from '@awayjs/core';

import { BitmapImage2D } from '@awayjs/stage';

import { GradientFillStyle } from '../draw/GradientFillStyle';
import { IMaterial } from '@awayjs/renderer';

export interface ITextureAtlasEntry{
	material?: IMaterial;
	bitmap?: BitmapImage2D;
	colorPos?: Point;
	uvRectangle?: Rectangle;
}

export class TextureAtlas {
	private static _allTextureAtlas: TextureAtlas[]=[];
	private static _allGradients: StringMap<ITextureAtlasEntry> = {};
	private static _allColors: StringMap<ITextureAtlasEntry> = {};

	public static clearAllMaterials() {
		for (const key in TextureAtlas._allColors) {
			TextureAtlas._allColors[key].material = null;
		}

		for (const key in TextureAtlas._allGradients) {
			TextureAtlas._allGradients[key].material = null;
		}
	}

	public static getTextureForColor(color: number, alpha: number): ITextureAtlasEntry {
		const hash = (color | 0).toString(16) + '#' + ((alpha * 255) | 0).toString(16);

		if (hash in this._allColors) {
			return this._allColors[hash];
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

		const newColorObj: ITextureAtlasEntry = {
			colorPos: textureAtlas.addColor(color, alpha),
			bitmap: textureAtlas.bitmap,
			material: null,
			uvRectangle: null
		};

		this._allColors[hash] = newColorObj;
		return newColorObj;
	}

	public static getTextureForGradient(gradient: GradientFillStyle): any {
		const hash: string = gradient.toString();

		if (hash in this._allGradients) {
			gradient.uvRectangle = this._allGradients[hash].uvRectangle;
			return this._allGradients[hash];
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

		const newGradEntry: ITextureAtlasEntry = {
			colorPos: null,
			bitmap: textureAtlas.bitmap,
			material: null,
			uvRectangle: gradient.uvRectangle.clone()
		};

		this._allGradients[hash] = newGradEntry;

		return newGradEntry;
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

		this.bitmap.invalidate();

		gradient.uvRectangle.x = 1 / 512;
		gradient.uvRectangle.y = 1 / 512 + (this.gradientRow / 256);//+1/512;
		gradient.uvRectangle.width = 1 - 1 / 512;
		gradient.uvRectangle.height = gradient.uvRectangle.y;

		return this.availableRows;
	}

	public addColor(color: number, alpha: number = 1): Point {
		this.colorPosition--;

		if (this.colorPosition < 0) {
			this.colorRow--;
			this.availableRows--;
			this.colorPosition = 255;

			if (this.availableRows < 0) {
				this.availableRows = 0;

				console.error('[TextureAtlass] There are not free space for color:', color.toString(16));
				return null;
			}
		}

		const argb = ColorUtils.float32ColorToARGB(color);

		argb[0] = alpha;

		this.bitmap.setPixelFromArray(this.colorPosition, this.colorRow, argb);
		this.bitmap.invalidate();

		return new Point(1 / 512 + this.colorPosition / 256, 1 / 512 + this.colorRow / 256);
	}

}