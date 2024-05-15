import { Matrix } from '@awayjs/core';
import {
	ImageSampler,
	AttributesBuffer,
	Float2Attributes,
} from '@awayjs/stage';

import { MappingMode, IMaterial, Style, TriangleElements } from '@awayjs/renderer';

import { Shape } from '../renderables/Shape';

import { GradientFillStyle } from './fills/GradientFillStyle';
import { BitmapFillStyle } from './fills/BitmapFillStyle';
import { SolidFillStyle } from './fills/SolidFillStyle';

import { GradientType } from './GradientType';
import { GraphicsFactoryHelper } from './GraphicsFactoryHelper';
import { GraphicsPath } from './GraphicsPath';

import { Graphics } from '../Graphics';

import { MaterialManager } from '../managers/MaterialManager';
import { Tess2Provider, TessAsyncService } from '../utils/TessAsyncService';
import { IResult } from './WorkerTesselatorBody';
import { IFillStyle } from './IGraphicsData';

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

//@ts-ignore
const SHAPE_INFO = window.SHAPE_INFO = {
	total_time: 0,
	tess_time: 0,
	multy_contours: 0,
	single_contours: 0,
};

const FIXED_BASE = 1000;

export interface IStyleElements {
	material: IMaterial,
	style: Style,
	sampler: ImageSampler
}

type tStyleMapper = (style: IFillStyle,data: IStyleElements) => IStyleElements;

export const UnpackFillStyle: Record<string, tStyleMapper> = {
	[GradientFillStyle.data_type] (style: GradientFillStyle,data: IStyleElements): IStyleElements {
		const obj = MaterialManager.getMaterialForGradient(style);
		const material = obj.material;

		data.material = obj.material;
		data.material.animateUVs = true;

		data.style.addSamplerAt(data.sampler, material.getTextureAt(0));
		data.style.uvMatrix = style.getUVMatrix();

		if (style.type == GradientType.LINEAR) {
			material.getTextureAt(0).mappingMode = MappingMode.LINEAR;
		} else if (style.type == GradientType.RADIAL) {
			data.sampler.imageRect = style.uvRectangle;
			material.imageRect = true;
			material.getTextureAt(0).mappingMode = MappingMode.RADIAL;
		}

		return data;
	},

	// handle solid, we store inside GraphicsFactoryFill
	[SolidFillStyle.data_type] (style: SolidFillStyle, data: IStyleElements): IStyleElements {
		const obj = MaterialManager.getMaterialForColor(
			style.color,
			style.alpha
		);

		const material = obj.material;
		data.material = material;

		if (obj.colorPos) {
			material.animateUVs = true;

			data.style.addSamplerAt(data.sampler, material.getTextureAt(0));
			data.style.uvMatrix = new Matrix(0, 0, 0, 0, obj.colorPos.x, obj.colorPos.y);
			style.uvMatrix = data.style.uvMatrix;

		} else {
			data.style = data.sampler = null;
		}

		return data;
	},

	[BitmapFillStyle.data_type] (style: BitmapFillStyle, data: IStyleElements): IStyleElements {

		//new ITexture(ImageUtils.getDefaultImage2D());//bitmapStyle.texture;
		const material = style.material;
		data.material = material;

		data.sampler.repeat = style.repeat;
		data.sampler.smooth = style.smooth;
		data.sampler.mipmap = style.smooth;

		material.style.sampler = data.sampler;
		material.animateUVs = true;

		data.style.addSamplerAt(data.sampler, material.getTextureAt(0));
		data.style.uvMatrix = style.getUVMatrix();

		return data;
	}
};

export class GraphicsFactoryFills {

	public static get Tess2Wasm() {
		return TessAsyncService.instance.module;
	}

	public static prepareWasm() {
		if (TessAsyncService.instance.status === 'done') {
			return;
		}

		TessAsyncService.instance.init();
	}

	public static TESS_SCALE = 20;
	public static USE_TESS_FIX = true;

	public static EPS = 1.0 / FIXED_BASE;

	public static toFixed(val: number) {
		return (val * FIXED_BASE | 0) / FIXED_BASE;
	}

	public static nearest(x0: number, y0: number, x1: number, y1: number) {
		let dx = (x0 - x1);
		(dx < 0) && (dx = -dx);

		let dy = (y0 - y1);
		(dy < 0) && (dy = -dy);

		return (dx + dy) < this.EPS;
	}

	public static draw_pathes(targetGraphics: Graphics) {
		//return;
		const pathes = targetGraphics.queued_fill_pathes;
		const len = pathes.length;

		for (let cp = 0; cp < len; cp++) {
			const path = pathes[cp];
			const pathStyle = path.style;

			// there are a bug with shapes
			let shape = targetGraphics.popEmptyFillShape();
			let elements = shape ? <TriangleElements>shape.elements : null;

			const target = elements ? elements.concatenatedBuffer : null;
			const newBuffer = this.pathToAttributesBuffer(path, false, target);

			if (!newBuffer || !newBuffer.length) {
				continue;
			}

			if (!elements) {
				elements = new TriangleElements();
				elements.setPositions(new Float2Attributes(newBuffer));
			} else {
				elements.invalidate();
				elements._numVertices = newBuffer.count;
			}

			elements.isDynamic = targetGraphics._clearCount > 0;

			const data: IStyleElements = {
				sampler: new ImageSampler(),
				style: new Style(),
				material: null
			};

			if (!(pathStyle.fillStyle.data_type in UnpackFillStyle)) {
				console.error('Unknown style:', pathStyle.fillStyle.data_type);
			}

			UnpackFillStyle[pathStyle.fillStyle.data_type](pathStyle.fillStyle, data);

			shape = shape || Shape.getShape(elements);

			shape.style = data.style;
			shape.material = data.material;
			shape.originalFillStyle = pathStyle.fillStyle;

			targetGraphics.addShapeInternal(shape);
		}
		//targetGraphics.queued_fill_pathes.length = 0;
	}

	public static prepareContours(
		graphicsPath: GraphicsPath,
		applyFix: boolean = false,
		qualityScale: number = 1,
	): number[][] {
		graphicsPath.prepare(qualityScale);

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

	public static runTesselator(graphicsPath: GraphicsPath, qualityScale: number = 1): IResult {
		const finalContours = this.prepareContours(graphicsPath, this.USE_TESS_FIX, qualityScale);

		/* workaround for wasm crash
		if (finalContours.length > 0) {
			const firstContour = finalContours[0];
			if (firstContour.length >= 6) {
				if (firstContour[0] == 0 && firstContour[1] == 0
					&& firstContour[2] == 0  && firstContour[3] == 0
					&& firstContour[4] == 0  && firstContour[5] == 0) {
					finalContours = this.prepareContours(graphicsPath, false);
				} else if (firstContour[1] == 0
					&& firstContour[3] == 0
					&& firstContour[5] == 0) {
					finalContours = this.prepareContours(graphicsPath, false);
				} else if (firstContour[0] == 0
					&& firstContour[2] == 0
					&& firstContour[4] == 0) {
					finalContours = this.prepareContours(graphicsPath, false);
				}
			}
		}*/

		if (finalContours.length > 0) {
			SHAPE_INFO.multy_contours += 1;
		} else {
			SHAPE_INFO.single_contours += 1;
		}

		if (finalContours.length === 0) {
			return null;
		}

		return Tess2Provider.tesselate({ contours: finalContours,
			windingRule: 0, //Tess2.WINDING_ODD,
			elementType: 0, //Tess2.POLYGONS,
			polySize: 3,
			vertexSize: 2
		});
	}

	public static fillBuffer(result: IResult, finalVerts: Float32Array): Float32Array {
		const numElems = result.elements.length;
		const scale = this.USE_TESS_FIX ? (1 / this.TESS_SCALE) : 1;

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

		return finalVerts;
	}

	public static pathToAttributesBuffer(
		graphicsPath: GraphicsPath,
		closePath: boolean = true,
		target: AttributesBuffer = null,
		qualityScale: number = 1,
	): AttributesBuffer {

		const start = performance.now();

		let resultVertexSize = graphicsPath.verts
			? graphicsPath.verts.length
			: 0;
		let tesselatedVertexSize = 0;

		let res: IResult;
		const preparedBuffer = graphicsPath.pretesselatedBuffer;

		if (preparedBuffer) {
			resultVertexSize = preparedBuffer.length;
			console.debug('[GraphicsFactoryFills] Use prebuild buffer:', graphicsPath);
		} else {
			res = this.runTesselator(graphicsPath, qualityScale);

			if (res && res.elements.length > 0) {
				tesselatedVertexSize = res.elements.length * 2;
				resultVertexSize += res.elements.length * 2;
			}
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

		if (preparedBuffer) {

			finalVerts.set(preparedBuffer);
		} else if (res) {

			this.fillBuffer(res, finalVerts);

			Tess2Provider.dispose();
		}

		// merge poly vertex
		const vs = graphicsPath.verts.length;

		for (let i = 0; i < vs; i++) {
			finalVerts [tesselatedVertexSize + i] = graphicsPath.verts[i];
		}

		SHAPE_INFO.total_time += performance.now() - start;
		return target;
	}
}
