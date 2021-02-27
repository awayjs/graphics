import { Rectangle } from '@awayjs/core';
import { Style } from '@awayjs/renderer';
import { AttributesView, BitmapImage2D, ImageSampler } from '@awayjs/stage';
import { TriangleElements } from '../elements/TriangleElements';
import { MaterialManager } from '../managers/MaterialManager';
import { Settings } from '../Settings';
import { Shape } from './Shape';

/*
 * Shape structure
 *      A                          B
 *    +---+----------------------+---+
 *  C | 1 |          2           | 3 |
 *    +---+----------------------+---+
 *    |   |                      |   |
 *    | 4 |          5           | 6 |
 *    |   |                      |   |
 *    +---+----------------------+---+
 *  D | 7 |          8           | 9 |
 *    +---+----------------------+---+
*/
/**
 * Vertices order
 * 0---2
 *  \  |
 *   \ |
 *  3 1
 * | \
 * |  \
 * 4---5

 */
export class Shape9Slice extends Shape<TriangleElements> {
	private _initialRect: Rectangle;
	private _slice: Rectangle;
	private _scaleX: number = 1;
	private _scaleY: number = 1;

	constructor (frame: Rectangle, bitmap: BitmapImage2D) {
		super (
			Shape.quadElement(frame, 3, true),
			MaterialManager.getMaterialForBitmap(
				bitmap,
				// this will generate special material based on RAW GLSL
				Settings.EXPEREMENTAL_MATERIAL_FOR_IMAGE
			),
			new Style()
		);

		this.style.addSamplerAt(
			new ImageSampler(false, true, false),
			this.material.getTextureAt(0)
		);
		this.material.style = this.style;

		this._initialRect = frame;
		this._slice = frame.clone();
	}

	public get scaleX () {
		return this._scaleX;
	}

	public set scaleX (v: number) {
		if (v === this._scaleX) {
			return;
		}

		this._scaleX = v;
		this._updatePos();
	}

	public get scaleY () {
		return this._scaleY;
	}

	public set scaleY (v: number) {
		if (v === this._scaleY) {
			return;
		}

		this._scaleY = v;
		this._updatePos();
	}

	private _changeBufferData(attr: AttributesView, data: ArrayLike<number>[]) {
		const buff = attr.get(0, this.elements._numVertices);
		const stride = attr.stride;
		const dim = attr.dimensions;
		const count = attr.count;

		for (let i = 0; i < count; i++) {

			const sub = data[i / 4 | 0];
			const subIndex = (i % 4) * dim;

			for (let j = 0; j < dim; j++) {
				buff[i * stride + j] = sub[subIndex + j];
			}
		}

		attr.invalidate();
	}

	private _updateUV() {
		const attribute = this.elements.uvs;
		const uvs = attribute.get(this.elements._numVertices, 0);
		const o = attribute.offset;
		const s = attribute.stride;

		const init = this._initialRect;
		const slice = this._slice;

		const uvw = 1.0 / init.width;
		const uvh = 1.0 / init.height;

		const left = uvw * (slice.x - init.x);
		const right = 1 - uvw * (init.right - slice.right);
		const top = uvh * (slice.y - init.y);
		const bottom = 1 - uvh * (init.bottom - slice.bottom);

		for (let i = 0; i < 9; i += 3) {
			// qo - quad offset, offset remap global offset to subQuad
			// qo1 - quad offset, offset remap global offset to subQuad (2 for 1 section)
			const qo = 6 * i * s + o;
			const qo1 = 6 * (i + 1) * s + o;

			// quads 1, 4, 7, right edge vertices
			uvs[qo + 1 * s]
				= uvs[qo + 2 * s]
				= uvs[qo + 5 * s] = left;

			// quads 2, 5, 8, left edge vertices
			uvs[qo1 + 3 * s]
				= uvs[qo1 + 4 * s]
				= uvs[qo1 + 0 * s] = left;

		}

		for (let i = 1; i < 10; i += 3) {
			const qo = 6 * i * s + o;
			const qo1 = 6 * (i + 1) * s + o;

			// quads 2, 5, 8, rigt edge vertices
			uvs[qo1 + 3 * s]
				= uvs[qo1 + 4 * s]
				= uvs[qo1 + 0 * s] = right;

			// quads 3, 6, 9, left edge vertices
			uvs[qo + 1 * s]
				= uvs[qo + 2 * s]
				= uvs[qo + 5 * s] = right;
		}

		for (let i = 0; i < 3; i++) {
			const qo = 6 * i * s + o;

			// quads 1, 2, 3, bottom edge vertices
			uvs[qo + 1 * s + 1]
				= uvs[qo + 4 * s + 1]
				= uvs[qo + 5 * s + 1] = top;
		}

		for (let i = 3; i < 6; i++) {
			const qo = 6 * i * s + o;

			// quads 4, 5, 6, bottom edge vertices
			uvs[qo + 0 * s + 1]
				= uvs[qo + 2 * s + 1]
				= uvs[qo + 3 * s + 1] = top;

			// quads 4, 5, 6, bottom edge vertices
			uvs[qo + 1 * s + 1]
				= uvs[qo + 4 * s + 1]
				= uvs[qo + 5 * s + 1] = bottom;
		}

		for (let i = 6; i < 9; i++) {
			const qo = 6 * i * s + o;

			// quads 1, 2, 3, bottom edge vertices
			uvs[qo + 0 * s + 1]
				= uvs[qo + 2 * s + 1]
				= uvs[qo + 3 * s + 1] = bottom;
		}

		// for indices
		/*
		// quads 4, right edge vertices
		uvs[o + 1 * s] = uvs[o + 2 * s] = uvw * slice.x;

		// quads 1, right edge vertices*
		uvs[o + 3 * s] = uvs[o + 4 * s] = uvw * slice.x;

		// quads 3, 6, 9, left edge
		uvs[4 * s]
			= uvs[12 * s]
			= uvs[20 * s]
			= uvs[28 * s] = 1 - uvw * slice.right;

		// quads 1, 2, 3, bottom edge
		uvs[8 * s + 1]
			= uvs[10 * s + 1]
			= uvs[12 * s + 1]
			= uvs[14 * s + 1] = uvh * slice.y;

		// quads 7, 8, 9, top edge
		uvs[16 * s + 1]
			= uvs[18 * s + 1]
			= uvs[20 * s + 1]
			= uvs[22 * s + 1] = 1 - uvh * slice.bottom;
		*/
		attribute.invalidate();
	}

	private _updatePos() {

		const attribute = this.elements.positions;
		const pos = attribute.get(this.elements._numVertices, 0);
		const o = attribute.offset;
		const s = attribute.stride;

		const init = this._initialRect;
		const slice = this._slice;

		const left = Math.min(0, init.x - slice.x / this._scaleX);
		const right = Math.max(0, init.right - (init.right - slice.right) / this._scaleX);

		const top = Math.min(0, init.y - slice.y / this._scaleY);
		const bottom = Math.max(0, init.bottom - (init.bottom - slice.bottom) / this._scaleY);

		for (let i = 0; i < 9; i += 3) {
			// qo - quad offset, offset remap global offset to subQuad
			// qo1 - quad offset, offset remap global offset to subQuad (2 for 1 section)
			const qo = 6 * i * s + o;
			const qo1 = 6 * (i + 1) * s + o;

			// quads 1, 4, 7, right edge vertices
			pos[qo + 1 * s]
				= pos[qo + 2 * s]
				= pos[qo + 5 * s] = left;

			// quads 2, 5, 8, left edge vertices
			pos[qo1 + 3 * s]
				= pos[qo1 + 4 * s]
				= pos[qo1 + 0 * s] = left;

		}

		for (let i = 1; i < 10; i += 3) {
			const qo = 6 * i * s + o;
			const qo1 = 6 * (i + 1) * s + o;

			// quads 2, 5, 8, rigt edge vertices
			pos[qo1 + 3 * s]
				= pos[qo1 + 4 * s]
				= pos[qo1 + 0 * s] = right;

			// quads 3, 6, 9, left edge vertices
			pos[qo + 1 * s]
				= pos[qo + 2 * s]
				= pos[qo + 5 * s] = right;
		}

		for (let i = 0; i < 3; i++) {
			const qo = 6 * i * s + o;

			// quads 1, 2, 3, bottom edge vertices
			pos[qo + 1 * s + 1]
				= pos[qo + 4 * s + 1]
				= pos[qo + 5 * s + 1] = top;
		}

		for (let i = 3; i < 6; i++) {
			const qo = 6 * i * s + o;

			// quads 4, 5, 6, bottom edge vertices
			pos[qo + 0 * s + 1]
				= pos[qo + 2 * s + 1]
				= pos[qo + 3 * s + 1] = top;

			// quads 4, 5, 6, bottom edge vertices
			pos[qo + 1 * s + 1]
				= pos[qo + 4 * s + 1]
				= pos[qo + 5 * s + 1] = bottom;
		}

		for (let i = 6; i < 9; i++) {
			const qo = 6 * i * s + o;

			// quads 1, 2, 3, bottom edge vertices
			pos[qo + 0 * s + 1]
				= pos[qo + 2 * s + 1]
				= pos[qo + 3 * s + 1] = bottom;
		}

		// for indiced
		/*
		// quads 1, 4, 7, right edge
		pos[1 * 3 * s + 0]
			= pos[5 * 3 * s + 0]
			= pos[9 * 3 * s + 0]
			= pos[13 * 3 * s + 0] = slice.x * scale + init.x;

		pos[2 * 3 * s + 0]
			= pos[6 * 3 * s + 0]
			= pos[10 * 3 * s + 0]
			= pos[14 * 3 * s + 0]
			= init.right - slice.right * scale;

		pos[3 * 3 * s + 0]
			= pos[7 * 3 * s + 0]
			= pos[11 * 3 * s + 0]
			= pos[15 * 3 * s + 0] = init.right;

		// horizontal
		pos[4 * 3 * s + 1]
			= pos[5 * 3 * s + 1]
			= pos[6 * 3 * s + 1]
			= pos[7 * 3 * s + 1] = slice.y * scale;

		pos[8 * 3 * s + 1]
			= pos[9 * 3 * s + 1]
			= pos[10 * 3 * s + 1]
			= pos[11 * 3 * s + 1] = init.bottom - slice.bottom * scale;

		pos[12 * 3 * s + 1]
			= pos[13 * 3 * s + 1]
			= pos[14 * 3 * s + 1]
			= pos[15 * 3 * s + 1] = init.bottom;

		*/

		attribute.invalidate();
	}

	public set slice(rect: Rectangle) {
		const changed = !rect || !this._slice.equals(rect);

		if (!changed) {
			return;
		}

		this._slice = (rect || this._initialRect).clone();

		this._updatePos();
		this._updateUV();

		this.invalidate();
		this.invalidateElements();
	}

	public get slice() {
		return this._slice;
	}
}