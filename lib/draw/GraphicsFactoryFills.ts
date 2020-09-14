import { Point, MathConsts, Rectangle, Matrix } from "@awayjs/core";

import {
	ImageSampler,
	BitmapImage2D,
	AttributesBuffer,
	AttributesView,
	Float3Attributes,
	Float2Attributes,
	ImageUtils,
} from "@awayjs/stage";

import { ITexture, MappingMode, IMaterial, Style } from "@awayjs/renderer";

import { TriangleElements } from "../elements/TriangleElements";
import { Shape } from "../renderables/Shape";

import { GraphicsFillStyle } from "./GraphicsFillStyle";
import { GradientFillStyle } from "./GradientFillStyle";
import { BitmapFillStyle } from "./BitmapFillStyle";
import { GradientType } from "./GradientType";
import { GraphicsFactoryHelper } from "./GraphicsFactoryHelper";
import { GraphicsPath } from "./GraphicsPath";
import { GraphicsPathCommand } from "./GraphicsPathCommand";

import { Graphics } from "../Graphics";

import Tess2 from "tess2";
import { MaterialManager } from '../managers/MaterialManager';

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

const FIXED_BASE = 1000;

export class GraphicsFactoryFills {

	public static TESS_SCALE = 20;
	public static USE_TESS_FIX = true;

	public static EPS = 1.0 / FIXED_BASE;

	public static toFixed(val: number) {
		return (val * FIXED_BASE | 0) / FIXED_BASE
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
		var len = targetGraphics.queued_fill_pathes.length;
		var cp = 0;
		for (cp = 0; cp < len; cp++) {
			var newBuffer: AttributesBuffer = GraphicsFactoryFills.pathToAttributesBuffer(
				targetGraphics.queued_fill_pathes[cp],
			);
			if (newBuffer && newBuffer.length > 0) {
				var elements: TriangleElements = new TriangleElements(newBuffer);
				elements.setPositions(new Float2Attributes(newBuffer));
				//elements.setCustomAttributes("curves", new Float3Attributes(attributesBuffer));
				//elements.setUVs(new Float2Attributes(attributesBuffer));

				var sampler: ImageSampler;
				var style: Style;
				var material: IMaterial;
				if (targetGraphics.queued_fill_pathes[cp].style.data_type == GraphicsFillStyle.data_type) {
					var obj = MaterialManager.get_material_for_color(
						(<GraphicsFillStyle>targetGraphics.queued_fill_pathes[cp].style).color,
						(<GraphicsFillStyle>targetGraphics.queued_fill_pathes[cp].style).alpha,
					);
					material = obj.material;
					var shape: Shape = <Shape>targetGraphics.addShape(Shape.getShape(elements, material));
					if (obj.colorPos) {
						shape.style = new Style();
						sampler = new ImageSampler();
						material.animateUVs = true;
						shape.style.addSamplerAt(sampler, material.getTextureAt(0));

						shape.style.uvMatrix = new Matrix(0, 0, 0, 0, obj.colorPos.x, obj.colorPos.y);
					}
				} else if (targetGraphics.queued_fill_pathes[cp].style.data_type == GradientFillStyle.data_type) {
					var gradientStyle: GradientFillStyle = <GradientFillStyle>(
						targetGraphics.queued_fill_pathes[cp].style
					);
					var obj = MaterialManager.get_material_for_gradient(gradientStyle);
					material = obj.material;

					var shape: Shape = <Shape>targetGraphics.addShape(Shape.getShape(elements, material));

					shape.style = new Style();
					sampler = new ImageSampler();
					shape.style.addSamplerAt(sampler, material.getTextureAt(0));
					material.animateUVs = true;
					shape.style.uvMatrix = gradientStyle.getUVMatrix();

					if (gradientStyle.type == GradientType.LINEAR)
						material.getTextureAt(0).mappingMode = MappingMode.LINEAR;
					else if (gradientStyle.type == GradientType.RADIAL) {
						sampler.imageRect = gradientStyle.uvRectangle;
						material.imageRect = true;
						material.getTextureAt(0).mappingMode = MappingMode.RADIAL;
					}
				} else if (targetGraphics.queued_fill_pathes[cp].style.data_type == BitmapFillStyle.data_type) {
					var bitmapStyle: BitmapFillStyle = <BitmapFillStyle>targetGraphics.queued_fill_pathes[cp].style;

					var material = bitmapStyle.material; //new ITexture(ImageUtils.getDefaultImage2D());//bitmapStyle.texture;
					var shape: Shape = <Shape>targetGraphics.addShape(Shape.getShape(elements, material));

					shape.style = new Style();
					sampler = new ImageSampler();
					//sampler.smooth = true;
					sampler.repeat = bitmapStyle.repeat;
					shape.style.addSamplerAt(sampler, material.getTextureAt(0));
					material.style.sampler=sampler;
					material.animateUVs = true;
					shape.style.uvMatrix = bitmapStyle.getUVMatrix();
				}
			}
		}
		//targetGraphics.queued_fill_pathes.length = 0;
	}

	public static pathToAttributesBuffer(graphicsPath: GraphicsPath, closePath: boolean = true): AttributesBuffer {
		graphicsPath.prepare();

		var contour_data: number[][] = graphicsPath._positions;
		var i: number = 0;
		var finalVerts: number[] = [];
		var final_vert_cnt: number = 0;
		var finalContours: number[][] = [];
		var res;

		var numElems: number = 0;
		var p1x: number = 0;
		var p1y: number = 0;
		var p2x: number = 0;
		var p2y: number = 0;
		var p3x: number = 0;
		var p3y: number = 0;

		for (let k = 0; k < contour_data.length; k++) {
			
			const contour = contour_data[k];

			// same as map, but without allocation 

			const closed = GraphicsFactoryFills.nearest(
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

			if (contour.length > 5) {

				if(GraphicsFactoryFills.USE_TESS_FIX) 
				{
					// tess2 fix
					// there are problems with small shapes
					// encrease a size 
					const fixed = new Array(contour.length);

					for(let i = 0, l = contour.length; i < l; i ++ ) 
					{
						fixed[i] = GraphicsFactoryFills.toFixed(contour[i] * GraphicsFactoryFills.TESS_SCALE);
					}

					finalContours.push(fixed);
				} else {
					finalContours.push(contour);
				}
			}
		}

		//console.log("execute Tess2 = ", finalContours);
		try {
			res = Tess2.tesselate({
				contours: finalContours,
				windingRule: Tess2.WINDING_ODD,
				elementType: Tess2.POLYGONS,
				polySize: 3,
				vertexSize: 2,
				debug: true
			});
			//console.timeEnd("time Tess2.tesselate");

			numElems = res.elements.length / 3;
			p1x = 0;
			p1y = 0;
			p2x = 0;
			p2y = 0;
			p3x = 0;
			p3y = 0;
			for (i = 0; i < numElems; ++i) {
				p1x = res.vertices[res.elements[i * 3] * 2];
				p1y = res.vertices[res.elements[i * 3] * 2 + 1];
				p2x = res.vertices[res.elements[i * 3 + 1] * 2];
				p2y = res.vertices[res.elements[i * 3 + 1] * 2 + 1];
				p3x = res.vertices[res.elements[i * 3 + 2] * 2];
				p3y = res.vertices[res.elements[i * 3 + 2] * 2 + 1];

				if (GraphicsFactoryHelper.isClockWiseXY(p1x, p1y, p2x, p2y, p3x, p3y)) {
					finalVerts[final_vert_cnt++] = p3x;
					finalVerts[final_vert_cnt++] = p3y;
					finalVerts[final_vert_cnt++] = p2x;
					finalVerts[final_vert_cnt++] = p2y;
					finalVerts[final_vert_cnt++] = p1x;
					finalVerts[final_vert_cnt++] = p1y;
				} else {
					finalVerts[final_vert_cnt++] = p1x;
					finalVerts[final_vert_cnt++] = p1y;
					finalVerts[final_vert_cnt++] = p2x;
					finalVerts[final_vert_cnt++] = p2y;
					finalVerts[final_vert_cnt++] = p3x;
					finalVerts[final_vert_cnt++] = p3y;
				}
			}
		} catch (e) {
			console.log("error when trying to tesselate", finalContours);
		}
		//}

		if(GraphicsFactoryFills.USE_TESS_FIX){
			// divide to avoid increase shape size
			for(let i = 0, l = final_vert_cnt; i < l; i ++) 
			{
				finalVerts[i] = finalVerts[i] / GraphicsFactoryFills.TESS_SCALE;
			}
		}

		finalVerts = finalVerts.concat(graphicsPath.verts);

		if (finalVerts.length > 0) {
			const attributesView = new AttributesView(Float32Array, 2);
			attributesView.set(finalVerts);
			
			const attributesBuffer = attributesView.attributesBuffer.cloneBufferView();
			attributesView.dispose();
			
			return attributesBuffer;
		}
		return null;
	}
}
