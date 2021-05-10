import { Matrix } from '@awayjs/core';
import {
	ImageSampler,
	AttributesBuffer,
	Float2Attributes,
} from '@awayjs/stage';

import { MappingMode, IMaterial, Style, TriangleElements } from '@awayjs/renderer';

import { Shape } from '../renderables/Shape';

import { GraphicsFillStyle } from './GraphicsFillStyle';
import { GradientFillStyle } from './GradientFillStyle';
import { BitmapFillStyle } from './BitmapFillStyle';
import { GradientType } from './GradientType';
import { GraphicsFactoryHelper } from './GraphicsFactoryHelper';
import { GraphicsPath } from './GraphicsPath';

import { Graphics } from '../Graphics';

import * as Tess2 from 'tess2-ts';
import createTess2Wasm, { ITess as ITessWasm } from 'tess2-wasm';

import { MaterialManager } from '../managers/MaterialManager';

import { IResult } from './WorkerTesselatorBody';

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

export class GraphicsFactoryFills {

	public static Tess2Wasm: ITessWasm;
	private static wasmIsOk = true;

	public static prepareWasm() {
		if (!window.WebAssembly) {
			console.warn('[GraphicsFactoryFills] WASM not supported');
			this.wasmIsOk = false;
		}

		createTess2Wasm().then(({ Tess })=>{
			GraphicsFactoryFills.Tess2Wasm = Tess;
		}).catch((e) => {
			console.warn('[GraphicsFactoryFills] WASM initialisation fail:', e);
			this.wasmIsOk = false;
		});
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

			//elements.setCustomAttributes("curves", new Float3Attributes(attributesBuffer));
			//elements.setUVs(new Float2Attributes(attributesBuffer));

			let material: IMaterial;
			let sampler: ImageSampler = new ImageSampler();
			let style: Style = new Style();

			switch (pathStyle.data_type) {
				case GraphicsFillStyle.data_type:
				{
					const obj = MaterialManager.getMaterialForColor(
						(<GraphicsFillStyle>pathStyle).color,
						(<GraphicsFillStyle>pathStyle).alpha
					);

					material = obj.material;

					if (obj.colorPos) {
						material.animateUVs = true;

						style.addSamplerAt(sampler, material.getTextureAt(0));
						style.uvMatrix = new Matrix(0, 0, 0, 0, obj.colorPos.x, obj.colorPos.y);
					} else {
						style = sampler = null;
					}
					break;
				}
				case GradientFillStyle.data_type:
				{
					const gradientStyle = <GradientFillStyle>(pathStyle);
					const obj = MaterialManager.getMaterialForGradient(gradientStyle);

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
					const bitmapStyle = <BitmapFillStyle>pathStyle;

					//new ITexture(ImageUtils.getDefaultImage2D());//bitmapStyle.texture;
					material = bitmapStyle.material;

					sampler.repeat = bitmapStyle.repeat;
					sampler.smooth = bitmapStyle.smooth;
					sampler.mipmap = bitmapStyle.smooth;

					material.style.sampler = sampler;
					material.animateUVs = true;

					style.addSamplerAt(sampler, material.getTextureAt(0));
					style.uvMatrix = bitmapStyle.getUVMatrix();
					break;
				}
			}

			shape = shape || Shape.getShape(elements);

			shape.style = style;
			shape.material = material;
			shape.originalFillStyle = pathStyle;
			shape.isSimpleRect = path.isSimpleRect;

			targetGraphics.addShapeInternal(shape);
		}
		//targetGraphics.queued_fill_pathes.length = 0;
	}

	public static prepareContours(graphicsPath: GraphicsPath, applyFix: boolean = false): number[][] {
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

	private static _lastTess: ITessWasm;
	public static runTesselator(graphicsPath: GraphicsPath): IResult {
		const finalContours = this.prepareContours(graphicsPath, this.USE_TESS_FIX);

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

		let res: IResult = null;

		let tessWasm: ITessWasm;

		if (finalContours.length > 0) {
			let useJSVersion = !this.Tess2Wasm || !this.wasmIsOk;

			const start = performance.now();

			if (!useJSVersion) {
				try {
					this._lastTess = tessWasm = new this.Tess2Wasm();

					tessWasm.addContours(finalContours);

					res = <IResult> <any> tessWasm.tesselate();

					SHAPE_INFO.tess_time += performance.now() - start;

					return res;

				} catch (e) {
					this.wasmIsOk = false;
					useJSVersion = true;

					console.warn('[GraphicsFactoryFills] Tess2Wasm crash, dowside to JS', e.message, finalContours);
				}
			}

			if (useJSVersion) {
				if (this.wasmIsOk) {
					console.debug('[GraphicsFactoryFills] WASM Tess not loaded, JS will used.');
				}

				try {
					res = Tess2.tesselate({
						contours: finalContours,
						windingRule: Tess2.WINDING_ODD,
						elementType: Tess2.POLYGONS,
						polySize: 3,
						vertexSize: 2,
						debug: true
					});

					SHAPE_INFO.tess_time += performance.now() - start;

					return res;
				} catch (e) {
					console.debug('[GraphicsFactoryFills] Error when trying to tesselate', finalContours);

					return res = null;
				}
			}
		}
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
		target: AttributesBuffer = null): AttributesBuffer {

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
			res = this.runTesselator(graphicsPath);

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

			if (this._lastTess) {
				this._lastTess.dispose();
				this._lastTess = null;
			}
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
