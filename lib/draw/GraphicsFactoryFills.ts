import {Point, AttributesBuffer, AttributesView, Float3Attributes, Float2Attributes, MathConsts, Rectangle, Matrix} from "@awayjs/core";

import {GraphicsFillStyle} from "./GraphicsFillStyle";
import {GradientFillStyle} from "./GradientFillStyle";
import {BitmapFillStyle} from "./BitmapFillStyle";
import {Single2DTexture} from "../textures/Single2DTexture";
import {BitmapImage2D} from "../image/BitmapImage2D";
import {GradientType} from "./GradientType";
import {GraphicsFactoryHelper} from "./GraphicsFactoryHelper";
import {TriangleElements} from "../elements/TriangleElements";
import {MaterialBase} from "../materials/MaterialBase";
import {Shape} from "../base/Shape";
import {GraphicsPath} from "../draw/GraphicsPath";
import {GraphicsPathCommand} from "./GraphicsPathCommand";
import {DefaultMaterialManager}	from "../managers/DefaultMaterialManager";

import {Style} from "../base/Style";
import {Sampler2D} from "../image/Sampler2D";

import {Graphics} from "../Graphics";
import {MappingMode} from "../textures/MappingMode";

declare var require: any
var Tess2 = require('tess2');
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

export class GraphicsFactoryFills
{

	public static draw_pathes(targetGraphics:Graphics) {

		var len=targetGraphics.queued_fill_pathes.length;
		var cp=0;
		for(cp=0; cp<len; cp++){
			var newBuffer:AttributesBuffer=GraphicsFactoryFills.pathToAttributesBuffer(targetGraphics.queued_fill_pathes[cp]);
			if(newBuffer){
				var elements:TriangleElements = new TriangleElements(newBuffer);
				elements.setPositions(new Float2Attributes(newBuffer));
				//elements.setCustomAttributes("curves", new Float3Attributes(attributesBuffer));
				//elements.setUVs(new Float2Attributes(attributesBuffer));

				var sampler:Sampler2D;
				var style:Style;
				var material:MaterialBase;
				if(targetGraphics.queued_fill_pathes[cp].style.data_type==GraphicsFillStyle.data_type){
					var obj= Graphics.get_material_for_color((<GraphicsFillStyle>targetGraphics.queued_fill_pathes[cp].style).color,(<GraphicsFillStyle>targetGraphics.queued_fill_pathes[cp].style).alpha);
					material=obj.material;
					var shape:Shape=targetGraphics.addShape(Shape.getShape(elements, material));
					if(obj.colorPos){
						shape.style = new Style();
						sampler = new Sampler2D();
						material.animateUVs=true;
						shape.style.addSamplerAt(sampler, material.getTextureAt(0));

						shape.style.uvMatrix = new Matrix(0, 0, 0, 0, obj.colorPos.x, obj.colorPos.y);

					}
				}
				else if(targetGraphics.queued_fill_pathes[cp].style.data_type==GradientFillStyle.data_type){
					var gradientStyle:GradientFillStyle=(<GradientFillStyle>targetGraphics.queued_fill_pathes[cp].style);
					var obj= Graphics.get_material_for_gradient(gradientStyle);
					material = obj.material;

					var shape:Shape=targetGraphics.addShape(Shape.getShape(elements, material));

					shape.style = new Style();
					sampler = new Sampler2D();
					shape.style.addSamplerAt(sampler, material.getTextureAt(0));
					material.animateUVs=true;
					shape.style.uvMatrix = gradientStyle.getUVMatrix();
					//sampler.repeat=true;

					// todo: always use mappingmode = Radial ?
					if(gradientStyle.type==GradientType.LINEAR)
						material.getTextureAt(0).mappingMode = MappingMode.LINEAR;
					else if(gradientStyle.type==GradientType.RADIAL){
						sampler.imageRect = gradientStyle.uvRectangle;
						material.imageRect = true;
						material.getTextureAt(0).mappingMode = MappingMode.RADIAL;
					}


				}
				else if(targetGraphics.queued_fill_pathes[cp].style.data_type==BitmapFillStyle.data_type){
					var bitmapStyle:BitmapFillStyle=(<BitmapFillStyle>targetGraphics.queued_fill_pathes[cp].style);


					var material  = bitmapStyle.material;//new Single2DTexture(DefaultMaterialManager.getDefaultImage2D());//bitmapStyle.texture;
					var shape:Shape=targetGraphics.addShape(Shape.getShape(elements, material));

					shape.style = new Style();
					sampler = new Sampler2D();
					shape.style.addSamplerAt(sampler, material.getTextureAt(0));
					material.animateUVs=true;
					shape.style.uvMatrix = bitmapStyle.getUVMatrix();

					// todo: always use mappingmode = Radial ?
					//sampler.imageRect = bitmapStyle.uvRectangle;
					//material.imageRect = true;
					//material.getTextureAt(0).mappingMode = MappingMode.RADIAL;


				}

			}
		}
		targetGraphics.queued_fill_pathes.length=0;
	}


	public static pathToAttributesBuffer(graphicsPath:GraphicsPath, closePath:boolean=false):AttributesBuffer {

		graphicsPath.prepare();
		//one_path.finalizeContour();
		var contour_commands:Array<Array<number> > = graphicsPath._newCommands;
		var contour_data:Array<Array<number> > = graphicsPath._positions;
		var commands:Array<number>;
		var data:Array<number>;
		var i:number = 0;
		var k:number = 0;
		var vert_cnt:number = 0;
		var data_cnt:number = 0;
		var draw_direction:number = 0;
		var contours_vertices:Array<Array<number>> = [[]];
		var final_vert_list:Array<number> = [];
		var final_vert_cnt:number = 0;
		var lastPoint:Point = new Point();
		var last_dir_vec:Point=new Point();
		var end_point:Point=new Point();
		//console.log("fills:", contour_commands.length)
		if(contour_commands.length>0 && contour_commands[0].length>0){

			for (k = 0; k < contour_commands.length; k++) {
				contours_vertices.push([]);
				vert_cnt = 0;
				data_cnt = 0;
				commands = contour_commands[k];
				data = contour_data[k];
				draw_direction = 0;
				//console.log("fills:", commands, data)

				var new_dir:number=0;
				var new_dir_1:number=0;
				var new_dir_2:number=0;
				var dir_delta:number=0;
				var last_direction:number=0;

				var tmp_dir_point:Point=new Point();
				//console.log("unclosed path ? ", data[0], data[1], data[data.length-2], data[data.length-1]);
				if((data[0] != data[data.length-2]) || (data[1] != data[data.length-1])){
					//console.log("skip unclosed path");
					if(closePath){
						data[data.length]=data[0];
						data[data.length]=data[1];
					}
					else{
						continue;
					}
				}

				lastPoint.x = data[0];
				lastPoint.y = data[1];
				if(commands[1]==GraphicsPathCommand.LINE_TO){
					last_dir_vec.x = data[2]-lastPoint.x;
					last_dir_vec.y = data[3]-lastPoint.y;
				}
				else if(commands[1]==GraphicsPathCommand.CURVE_TO){
					last_dir_vec.x = data[4]-lastPoint.x;
					last_dir_vec.y = data[5]-lastPoint.y;
				}
				data_cnt=2;
				last_dir_vec.normalize();
				last_direction = Math.atan2(last_dir_vec.y, last_dir_vec.x) * MathConsts.RADIANS_TO_DEGREES;
				for (i = 1; i < commands.length; i++) {
					end_point = new Point(data[data_cnt++], data[data_cnt++]);
					if (commands[i]==GraphicsPathCommand.MOVE_TO) {
						console.log("ERROR ! ONLY THE FIRST COMMAND FOR A CONTOUR IS ALLOWED TO BE A 'MOVE_TO' COMMAND");
					}
					else if (commands[i]==GraphicsPathCommand.CURVE_TO) {
						end_point = new Point(data[data_cnt++], data[data_cnt++]);

					}
					//get the directional vector and the direction for this segment
					tmp_dir_point.x = end_point.x - lastPoint.x;
					tmp_dir_point.y = end_point.y - lastPoint.y;
					tmp_dir_point.normalize();
					new_dir = Math.atan2(tmp_dir_point.y, tmp_dir_point.x) * MathConsts.RADIANS_TO_DEGREES;
					// get the difference in angle to the last segment
					dir_delta = new_dir - last_direction;
					if(dir_delta>180){
						dir_delta-=360;
					}
					if(dir_delta<-180){
						dir_delta+=360;
					}
					draw_direction += dir_delta;
					last_direction = new_dir;
					lastPoint.x = end_point.x;
					lastPoint.y = end_point.y;
				}
				lastPoint.x = data[0];
				lastPoint.y = data[1];
				data_cnt=2;
				contours_vertices[contours_vertices.length - 1][vert_cnt++] = lastPoint.x;
				contours_vertices[contours_vertices.length - 1][vert_cnt++] = lastPoint.y;
				//console.log("Draw directions complete: "+draw_direction);
				for (i = 1; i < commands.length; i++) {
					switch (commands[i]) {
						case GraphicsPathCommand.MOVE_TO:
							console.log("ERROR ! ONLY THE FIRST COMMAND FOR A CONTOUR IS ALLOWED TO BE A 'MOVE_TO' COMMAND");
							break;
						case GraphicsPathCommand.LINE_TO:
							lastPoint.x = data[data_cnt++];
							lastPoint.y = data[data_cnt++];
							contours_vertices[contours_vertices.length - 1][vert_cnt++] = lastPoint.x;
							contours_vertices[contours_vertices.length - 1][vert_cnt++] = lastPoint.y;
							break;
						case GraphicsPathCommand.CURVE_TO:
							var control_x:number = data[data_cnt++];
							var control_y:number = data[data_cnt++];
							var end_x:number = data[data_cnt++];
							var end_y:number = data[data_cnt++];

							tmp_dir_point.x = control_x - lastPoint.x;
							tmp_dir_point.y = control_y - lastPoint.y;
							tmp_dir_point.normalize();
							new_dir_1 = Math.atan2(tmp_dir_point.y, tmp_dir_point.x) * MathConsts.RADIANS_TO_DEGREES;
							tmp_dir_point.x = end_x - lastPoint.x;
							tmp_dir_point.y = end_y - lastPoint.y;
							tmp_dir_point.normalize();
							new_dir_2 = Math.atan2(tmp_dir_point.y, tmp_dir_point.x) * MathConsts.RADIANS_TO_DEGREES;
							// get the difference in angle to the last segment
							var curve_direction:number = new_dir_2 - new_dir_1;
							if(curve_direction>180){
								curve_direction-=360;
							}
							if(curve_direction<-180){
								curve_direction+=360;
							}
							if((curve_direction==<number>0)&&(curve_direction==<number>180)&&(curve_direction==<number>-180)){
								lastPoint.x = end_x;
								lastPoint.y = end_y;
								contours_vertices[contours_vertices.length - 1][vert_cnt++] = lastPoint.x;
								contours_vertices[contours_vertices.length - 1][vert_cnt++] = lastPoint.y;
								break;
							}
							var curve_attr_1 = -1;
							if (draw_direction < 0) {
								if (curve_direction > 0) {
									//convex
									//console.log("convex");
									curve_attr_1 = 1;
									contours_vertices[contours_vertices.length - 1][vert_cnt++] = control_x;
									contours_vertices[contours_vertices.length - 1][vert_cnt++] = control_y;
								}
								contours_vertices[contours_vertices.length - 1][vert_cnt++] = end_x;
								contours_vertices[contours_vertices.length - 1][vert_cnt++] = end_y;
							}
							else {
								if (curve_direction < 0) {
									//convex
									//console.log("convex");
									curve_attr_1 = 1;
									contours_vertices[contours_vertices.length - 1][vert_cnt++] = control_x;
									contours_vertices[contours_vertices.length - 1][vert_cnt++] = control_y;
								}
								contours_vertices[contours_vertices.length - 1][vert_cnt++] = end_x;
								contours_vertices[contours_vertices.length - 1][vert_cnt++] = end_y;
							}

							if (GraphicsFactoryHelper.isClockWiseXY(end_x, end_y, control_x, control_y, lastPoint.x, lastPoint.y)) {
								final_vert_list[final_vert_cnt++] = end_x;
								final_vert_list[final_vert_cnt++] = end_y;
								/*
								 final_vert_list[final_vert_cnt++] = curve_attr_1;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 */
								final_vert_list[final_vert_cnt++] = control_x;
								final_vert_list[final_vert_cnt++] = control_y;

								/*
								 final_vert_list[final_vert_cnt++] = curve_attr_1;
								 final_vert_list[final_vert_cnt++] = 0.5;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 */
								final_vert_list[final_vert_cnt++] = lastPoint.x;
								final_vert_list[final_vert_cnt++] = lastPoint.y;
								/*
								 final_vert_list[final_vert_cnt++] = curve_attr_1;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 */
							}
							else {
								final_vert_list[final_vert_cnt++] = lastPoint.x;
								final_vert_list[final_vert_cnt++] = lastPoint.y;
								/*
								 final_vert_list[final_vert_cnt++] = curve_attr_1;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 */
								final_vert_list[final_vert_cnt++] = control_x;
								final_vert_list[final_vert_cnt++] = control_y;
								/*
								 final_vert_list[final_vert_cnt++] = curve_attr_1;
								 final_vert_list[final_vert_cnt++] = 0.5;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 */
								final_vert_list[final_vert_cnt++] = end_x;
								final_vert_list[final_vert_cnt++] = end_y;
								/*
								 final_vert_list[final_vert_cnt++] = curve_attr_1;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 final_vert_list[final_vert_cnt++] = 1.0;
								 final_vert_list[final_vert_cnt++] = 0.0;
								 */

							}
							lastPoint.x = end_x;
							lastPoint.y = end_y;

							break;
						case GraphicsPathCommand.CUBIC_CURVE:
							//todo
							break;
					}
				}
			}
			var verts:Array<number> = [];
			var all_verts:Array<Point> = [];
			var elems:Array<number> = [];

			//console.log("execute Tess2.tesselate = ", allverstcnt);
			//console.time("time Tess2.tesselate");
			var endContours=[];

			for (i = 0; i < contours_vertices.length; ++i) {
				if(contours_vertices[i].length>5)
					endContours[endContours.length]=contours_vertices[i];
			}
			try{

				var res = Tess2.tesselate({
					contours: endContours,
					windingRule: Tess2.WINDING_ODD,
					elementType: Tess2.POLYGONS,
					polySize: 3,
					vertexSize: 2
				});
				//console.timeEnd("time Tess2.tesselate");

				var numElems:number =  res.elements.length / 3;
				var p1:number=0;
				var p2:number=0;
				var p3:number=0;
				for (i = 0; i < numElems; ++i) {
					p1 = res.elements[i * 3];
					p2 = res.elements[i * 3 + 1];
					p3 = res.elements[i * 3 + 2];

					final_vert_list[final_vert_cnt++] = res.vertices[p3*2];
					final_vert_list[final_vert_cnt++] = res.vertices[p3*2+1];
					/*
					 final_vert_list[final_vert_cnt++] = 1;
					 final_vert_list[final_vert_cnt++] = 2.0;
					 final_vert_list[final_vert_cnt++] = 0.0;
					 final_vert_list[final_vert_cnt++] = 1.0;
					 final_vert_list[final_vert_cnt++] = 0.0;
					 */
					final_vert_list[final_vert_cnt++] = res.vertices[p2*2];
					final_vert_list[final_vert_cnt++] = res.vertices[p2*2+1];
					/*
					 final_vert_list[final_vert_cnt++] = 1;
					 final_vert_list[final_vert_cnt++] = 2.0;
					 final_vert_list[final_vert_cnt++] = 0.0;
					 final_vert_list[final_vert_cnt++] = 1.0;
					 final_vert_list[final_vert_cnt++] = 0.0;
					 */
					final_vert_list[final_vert_cnt++] = res.vertices[p1*2];
					final_vert_list[final_vert_cnt++] = res.vertices[p1*2+1];
					/*
					 final_vert_list[final_vert_cnt++] = 1;
					 final_vert_list[final_vert_cnt++] = 2.0;
					 final_vert_list[final_vert_cnt++] = 0.0;
					 final_vert_list[final_vert_cnt++] = 1.0;
					 final_vert_list[final_vert_cnt++] = 0.0;
					 */

				}
			}
			catch(e){
				console.log("error when trying to tesselate", "countours:", endContours);
			}

		}
		final_vert_list=final_vert_list.concat(graphicsPath.verts);
		if(final_vert_list.length>0) {
			//for (i = 0; i < final_vert_list.length/7; ++i)
			//	console.log("final verts "+i+" = "+final_vert_list[i*7]+" / "+final_vert_list[i*7+1]);
			var attributesView:AttributesView = new AttributesView(Float32Array, 2);
			attributesView.set(final_vert_list);
			var attributesBuffer:AttributesBuffer = attributesView.attributesBuffer;
			attributesView.dispose();
			return attributesBuffer;

		}
		return null;
	}
}