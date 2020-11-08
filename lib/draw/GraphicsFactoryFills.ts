import { Matrix } from '@awayjs/core';

import {
	ImageSampler,
	AttributesBuffer,
	Float2Attributes,
} from '@awayjs/stage';

import { MappingMode, IMaterial, Style } from '@awayjs/renderer';

import { TriangleElements } from '../elements/TriangleElements';
import { Shape } from '../renderables/Shape';

import { GraphicsFillStyle } from './GraphicsFillStyle';
import { GradientFillStyle } from './GradientFillStyle';
import { BitmapFillStyle } from './BitmapFillStyle';
import { GradientType } from './GradientType';
import { GraphicsFactoryHelper } from './GraphicsFactoryHelper';
import { GraphicsPath } from './GraphicsPath';

import { Graphics } from '../Graphics';

import Tess2 from 'tess2';
import { MaterialManager } from '../managers/MaterialManager';
import { Settings } from '../../Settings';

/**
 * The Graphics class contains a set of methods that you can use to create a
 * vector shape. Display objects that support drawing include Sprite and Shape
 * objects. Each of these classes includes a <code>graphics</code> property
 * that is a Graphics object. The following are among those helper functions
 * provided for ease of use: <code>drawRect()</code>,
 * <code>drawRoundRect()</code>, <code>drawCircle()</code>, and
 * <code>drawEllipse()</code>.
 *
 * <p>You cannot create a Graphics object directly from ActionScript code. If
 * you call <code>new Graphics()</code>, an exception is thrown.</p>
 *
 * <p>The Graphics class is final; it cannot be subclassed.</p>
 */

interface IStyleEntry {
	material: IMaterial;
	style: Style;
	pos?: {x: number, y: number}
}

interface IAttributePair {
	position?: AttributesBuffer,
	uv?: AttributesBuffer
}

export interface ITessResult {
	vertices: Array<number>;
	vertexIndices: Array<number>;
	vertexCount: number;
	elements: Array<number>;
	elementCount: number;
	mesh: any;
}

const FIXED_BASE = 1000;

export class GraphicsFactoryFills {

	public static TESS_SCALE = 20;
	public static USE_TESS_FIX = true;

	public static EPS = 1.0 / FIXED_BASE;

	public static toFixed(val: number) {
		return (val * FIXED_BASE | 0) / FIXED_BASE;
	}

	public static collectFillSyles(paths: GraphicsPath[]) {
		const styles: Array<IStyleEntry> = [];
		const len = paths.length;
		let batchable = true;

		for (let i = 0; i < len; i++) {
			const path = paths[i];
			const pathStyle = path.style;

			let material: IMaterial;
			let sampler: ImageSampler = new ImageSampler();
			let style: Style = new Style();
			let pos: {x: number, y: number};

			batchable = batchable && !path.verts?.length;

			switch (pathStyle.data_type) {
				case GraphicsFillStyle.data_type:
				{
					const obj = MaterialManager.get_material_for_color(
						(<GraphicsFillStyle>pathStyle).color,
						(<GraphicsFillStyle>pathStyle).alpha
					);

					material = obj.material;

					if (obj.colorPos) {
						material.animateUVs = true;
						pos = obj.colorPos;
						style.addSamplerAt(sampler, material.getTextureAt(0));
						style.uvMatrix = new Matrix(0, 0, 0, 0, obj.colorPos.x, obj.colorPos.y);
						//style.uvMatrix = new Matrix(0, 1, 1, 0, 0, 0);

					} else {
						style = sampler = null;
					}
					break;
				}
				case GradientFillStyle.data_type:
				{
					batchable = false;

					const gradientStyle = <GradientFillStyle>(pathStyle);
					const obj = MaterialManager.get_material_for_gradient(gradientStyle);

					material = obj.material;
					material.animateUVs = true;

					style.addSamplerAt(sampler, material.getTextureAt(0));
					style.uvMatrix = gradientStyle.getUVMatrix();

					if (gradientStyle.type == GradientType.LINEAR) {
						material.getTextureAt(0).mappingMode = MappingMode.LINEAR;
					} else if (gradientStyle.type == GradientType.RADIAL) {
						sampler.imageRect = gradientStyle.uvRectangle;
						material.imageRect = true;
						material.getTextureAt(0).mappingMode = MappingMode.RADIAL;
					}
					break;
				}
				case BitmapFillStyle.data_type:
				{
					batchable = false;

					const bitmapStyle = <BitmapFillStyle>pathStyle;

					//new ITexture(ImageUtils.getDefaultImage2D());//bitmapStyle.texture;
					material = bitmapStyle.material;
					//sampler.smooth = true;
					sampler.repeat = bitmapStyle.repeat;
					material.style.sampler = sampler;
					material.animateUVs = true;

					style.addSamplerAt(sampler, material.getTextureAt(0));
					style.uvMatrix = bitmapStyle.getUVMatrix();
					break;
				}
			}

			styles.push({
				material, style, pos
			});
		}

		return {
			styles, batchable
		};
	}

	public static nearest(x0: number, y0: number, x1: number, y1: number) {
		let dx = (x0 - x1);
		(dx < 0) && (dx = -dx);

		let dy = (y0 - y1);
		(dy < 0) && (dy = -dy);

		return (dx + dy) < this.EPS;
	}

	private static _genUV(
		pos: {x: number, y: number},
		target: Float32Array,
		offset: number = 0,
		count: number = target.length) {

		for (let i = 0; i < count; i++) {
			target[i + offset] = i % 2 ? pos.x : pos.y;
		}

		return target;
	}

	public static draw_pathes(targetGraphics: Graphics) {
		//return;

		const pathes = targetGraphics.queued_fill_pathes;
		const { styles, batchable } = this.collectFillSyles(pathes);

		const combined = Settings.ALLOW_COMBINER.FILLS
				&& batchable
				&& targetGraphics.bathchable
				&& pathes.length > 1;

		const len = combined ? 1 : styles.length;
		const uvPonts = combined ? styles.map((e) => e.pos) : [];

		let shape = targetGraphics.popEmptyFillShape();
		let elements = shape?.elements as TriangleElements;

		const target: IAttributePair = {
			position: null, uv: null
		};

		for (let cp = 0; cp < len; cp++) {
			const path = pathes[cp];
			const entry: IStyleEntry = styles[cp];

			shape = shape || targetGraphics.popEmptyFillShape();
			elements = elements || <TriangleElements> shape?.elements;

			target.position = target.position || elements?.concatenatedBuffer;

			if (combined) {
				if (!this.pathToAttributesBufferMult(pathes, target, true, uvPonts)) {
					continue;
				}
			} else {
				target.position = this.pathToAttributesBuffer(path, false, target.position);
			}

			if (!target.position || !target.position.length) {
				continue;
			}

			if (!combined || cp === len - 1) {
				if (!elements) {
					elements = new TriangleElements();
					elements.setPositions(new Float2Attributes(target.position));

					if (target.uv) {
						elements.setUVs(new Float2Attributes(target.uv));
					}

				} else {
					elements.invalidate();
					elements._numVertices = target.position.count;
				}

				shape = shape || Shape.getShape(elements);

				if (combined) entry.style.uvMatrix.setTo(0,1,1,0,0,0);
				shape.style = entry.style;
				shape.material = entry.material;

				const b = targetGraphics.bathchable;
				targetGraphics.addShapeInternal(shape);
				targetGraphics.bathchable = b;

				shape = null;
				elements = null;

				target.position = null;
				target.uv = null;
			}
		}
		//targetGraphics.queued_fill_pathes.length = 0;
	}

	private static _prepareContours(graphicsPath: GraphicsPath, applyFix: boolean = false): number[][] {
		graphicsPath.prepare();
		const contours: number[][] = graphicsPath._positions;
		const finalContours: number[][] = [];

		for (let k = 0; k < contours.length; k++) {

			const contour = contours[k];

			// same as map, but without allocation

			const closed = this.nearest(
				contour[0], contour[1],
				contour[contour.length - 2], contour[contour.length - 1]);

			// make sure start and end point of a contour are not the same
			if (closed) {
				contour.pop();
				contour.pop();
			}

			// all contours should already be prepared by GraphicsPath.prepare()
			// we only want to make sure that each contour contains at least 3 pairs of x/y positions
			// otherwise there is no way they can form a shape

			if (contour.length >= 6) {

				if (applyFix) {
					// tess2 fix
					// there are problems with small shapes
					// encrease a size
					const fixed = new Array(contour.length);

					for (let i = 0, l = contour.length; i < l; i++) {
						fixed[i] = this.toFixed(contour[i] * this.TESS_SCALE);
					}

					finalContours.push(fixed);
				} else {
					finalContours.push(contour);
				}
			}
		}

		return finalContours;
	}

	private static _tesselate(graphicsPath: GraphicsPath): ITessResult {
		const contours = this._prepareContours(graphicsPath, this.USE_TESS_FIX);

		if (contours.length === 0) {
			return null;
		}

		try {
			return Tess2.tesselate({
				contours,
				windingRule: Tess2.WINDING_ODD,
				elementType: Tess2.POLYGONS,
				polySize: 3,
				vertexSize: 2,
				debug: false
			});

		} catch (e) {
			console.log('error when trying to tesselate', contours);
			return null;
		}

	}

	private static _fillBuffer(result: ITessResult, buff: Float32Array, offset: number = 0): number {

		const numElems = result.elements.length;
		const scale = this.USE_TESS_FIX ? (1 / this.TESS_SCALE) : 1;
		const finalVerts = offset === 0 ? buff : new Float32Array(buff.buffer, offset * Float32Array.BYTES_PER_ELEMENT);

		let vindex = 0;
		let p1x = 0;
		let p1y = 0;
		let p2x = 0;
		let p2y = 0;
		let p3x = 0;
		let p3y = 0;

		for (let i = 0; i < numElems; i += 3) {
			p1x = scale * result.vertices[result.elements[i + 0] * 2 + 0];
			p1y = scale * result.vertices[result.elements[i + 0] * 2 + 1];
			p2x = scale * result.vertices[result.elements[i + 1] * 2 + 0];
			p2y = scale * result.vertices[result.elements[i + 1] * 2 + 1];
			p3x = scale * result.vertices[result.elements[i + 2] * 2 + 0];
			p3y = scale * result.vertices[result.elements[i + 2] * 2 + 1];

			if (GraphicsFactoryHelper.isClockWiseXY(p1x, p1y, p2x, p2y, p3x, p3y)) {
				finalVerts[vindex++] = p3x;
				finalVerts[vindex++] = p3y;
				finalVerts[vindex++] = p2x;
				finalVerts[vindex++] = p2y;
				finalVerts[vindex++] = p1x;
				finalVerts[vindex++] = p1y;
			} else {
				finalVerts[vindex++] = p1x;
				finalVerts[vindex++] = p1y;
				finalVerts[vindex++] = p2x;
				finalVerts[vindex++] = p2y;
				finalVerts[vindex++] = p3x;
				finalVerts[vindex++] = p3y;
			}
		}

		return numElems * 2;
	}

	public static pathToAttributesBufferMult(
		pathes: GraphicsPath[],
		target: IAttributePair,
		genUV: boolean = false,
		uvPoints:  Array<{x: number, y: number}> = null
	): boolean {

		let resultVertexSize = 0;

		const results = [];

		for (const p of pathes) {
			const res = this._tesselate(p);

			if (res) {
				resultVertexSize += res.elements.length * 2;
			}

			results.push(res);
		}

		if (resultVertexSize === 0) {
			return false;
		}

		const V_SIZE = 2;
		if (!target.position) {
			target.position = new AttributesBuffer(
				Float32Array.BYTES_PER_ELEMENT * V_SIZE,
				(resultVertexSize / V_SIZE) | 0);
		}

		// resize is safe, it not rebuild buffer when count is same.
		// count - count of 2 dimension vertex, divide on 2
		target.position.count = (resultVertexSize / V_SIZE) | 0;

		// fill direct to Float32Array
		const finalVerts = new Float32Array(target.position.buffer);
		let finalUv: Float32Array;

		if (genUV) {
			if (!target.uv) {
				target.uv = new AttributesBuffer(
					Float32Array.BYTES_PER_ELEMENT * V_SIZE,
					(resultVertexSize / V_SIZE) | 0);
			}

			target.uv.count = (resultVertexSize / V_SIZE) | 0;
			finalUv = new Float32Array(target.uv.buffer);
		}

		// append tesselated data
		let offset = 0;

		for (let i = 0; i < results.length; i++) {

			if (!results[i]) {
				continue;
			}

			const filled = this._fillBuffer(results[i], finalVerts, offset);

			if (genUV) {
				const p = uvPoints[i];

				for (let j = 0; j < filled; j++) {
					finalUv[j + offset] = p ? (j % 2 ? p.x : p.y) : 0;
				}
			}

			offset += filled;
		}

		return true;
	}

	public static pathToAttributesBuffer(
		graphicsPath: GraphicsPath,
		closePath: boolean = true,
		target: AttributesBuffer = null): AttributesBuffer {

		let resultVertexSize = graphicsPath.verts.length;
		let tesselatedVertexSize = 0;
		const res = this._tesselate(graphicsPath);

		if (res) {
			resultVertexSize += (tesselatedVertexSize = res.elements.length * 2);
		}

		// drop when nothing exist
		if (resultVertexSize === 0) {
			return null;
		}

		const vertexSize = 2;

		if (!target) {
			target = new AttributesBuffer(
				Float32Array.BYTES_PER_ELEMENT * vertexSize, (resultVertexSize / vertexSize) | 0);
		}

		// resize is safe, it not rebuild buffer when count is same.
		// count - count of 2 dimension vertex, divide on 2
		target.count = (resultVertexSize / vertexSize) | 0;

		// fill direct to Float32Array
		const finalVerts = new Float32Array(target.buffer);

		// append tesselated data
		if (res && tesselatedVertexSize) {
			this._fillBuffer(res, finalVerts, 0);
		}

		// append poly vertex
		const vs = graphicsPath.verts.length;

		for (let i = 0; i < vs; i++) {
			finalVerts [tesselatedVertexSize + i] = graphicsPath.verts[i];
		}

		return target;
	}
}
