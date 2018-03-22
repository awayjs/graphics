import {Point, MathConsts, Rectangle, Matrix} from "@awayjs/core";

import {ImageSampler, AttributesBuffer, AttributesView, Float3Attributes, Float2Attributes} from "@awayjs/stage";

import {IMaterial, Style} from "@awayjs/renderer";

import {Shape} from "../renderables/Shape";
import {TriangleElements} from "../elements/TriangleElements";
import {JointStyle}	 from "../draw/JointStyle";
import {GraphicsPath} from "../draw/GraphicsPath";
import {GraphicsPathCommand} from "../draw/GraphicsPathCommand";
import {GraphicsFactoryHelper} from "../draw/GraphicsFactoryHelper";
import {GraphicsStrokeStyle} from "../draw/GraphicsStrokeStyle";
import {LineScaleMode} from "../draw/LineScaleMode";
import {Graphics} from "../Graphics";

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
export class GraphicsFactoryStrokes
{
	public static draw_pathes(targetGraphics:Graphics){

		var len=targetGraphics.queued_stroke_pathes.length;
		var i=0;
		for(i=0; i<len; i++){
			var strokePath:GraphicsPath=targetGraphics.queued_stroke_pathes[i];
			var strokeStyle:GraphicsStrokeStyle=(<GraphicsStrokeStyle>strokePath.style);
			var obj:any = Graphics.get_material_for_color(strokeStyle.color, strokeStyle.alpha);
			var material:IMaterial=obj.material;

			var final_vert_list:Array<number>=[];
			strokePath.prepare(targetGraphics._scaleX);
			GraphicsFactoryStrokes.draw_path([strokePath], final_vert_list, material.curves, targetGraphics.getSpriteScale());
			final_vert_list=final_vert_list.concat(strokePath.verts);
			var attributesView:AttributesView = new AttributesView(Float32Array, material.curves?3:2);
			attributesView.set(final_vert_list);
			var attributesBuffer:AttributesBuffer = attributesView.attributesBuffer.cloneBufferView();
			attributesView.dispose();
			var elements:TriangleElements = new TriangleElements(attributesBuffer);
			elements.setPositions(new Float2Attributes(attributesBuffer));
			elements.halfStrokeThickness=strokeStyle.half_thickness;
			elements.lastStrokeScale=targetGraphics._scaleX;
			//	if(material.curves)
			//		elements.setCustomAttributes("curves", new Byte4Attributes(attributesBuffer, false));
			//	material.alpha=(<GraphicsStrokeStyle>this.queued_stroke_pathes[i].style).alpha;
			var shape:Shape=targetGraphics.addShape(Shape.getShape(elements, material));
			shape.isStroke=true;
			shape.strokePath=strokePath;
			if(obj.colorPos){
				shape.style = new Style();
				var sampler:ImageSampler = new ImageSampler();
				material.animateUVs=true;
				shape.style.addSamplerAt(sampler, material.getTextureAt(0));

				shape.style.uvMatrix = new Matrix(0, 0, 0, 0, obj.colorPos.x, obj.colorPos.y);
			}
		}
		targetGraphics.queued_stroke_pathes.length=0;

/*
		var len=graphic_pathes.length;
		var one_path:GraphicsPath;
		var cp, i=0;
		for(cp=0; cp<len; cp++) {
			one_path = graphic_pathes[cp];
			one_path.prepare();
			for (i = 0; i < one_path._positions[cp].length; i+=2) {
				GraphicsFactoryHelper.drawPoint(one_path._positions[cp][i], one_path._positions[cp][i+1], final_vert_list, false);
			}
		}
		GraphicsFactoryStrokes.draw_pathes_old(graphic_pathes, final_vert_list, false);
		*/

	}
	public static updateStrokesForShape(shape:Shape, scale:number, scaleMode:string ){

		var elements:TriangleElements = <TriangleElements> shape.elements;
		if(elements.lastStrokeScale>(scale*2) || elements.lastStrokeScale<(scale*0.5)){
			//graphicsPath.prepare(scale);
			elements.lastStrokeScale=scale;

		}
		else{
			//elements.lastStrokeScale=scale;
			//return;
		}

		var graphicsPath = shape.strokePath;
		elements.lastStrokeScale=scale;
		var final_vert_list:Array<number>=[];
		GraphicsFactoryStrokes.draw_path([graphicsPath], final_vert_list, false, scale, scaleMode);
		elements.setPositions(final_vert_list);
		elements.invalidate();


	}
	public static draw_path(graphic_pathes:Array<GraphicsPath>, final_vert_list:Array<number>, curves:boolean, scale:number=1, scaleMode:string=LineScaleMode.NORMAL){
		var len=graphic_pathes.length;
		var contour_commands:Array<Array<number> >;
		var contour_data:Array<Array<number> >;
		var strokeStyle:GraphicsStrokeStyle;
		var one_path:GraphicsPath;
		var commands:Array<number>;
		var data:Array<number>;
		var i:number=0;
		var k:number=0;
		var vert_cnt:number=0;
		var data_cnt:number=0;
		var final_vert_cnt:number=0;
		var lastPoint:Point=new Point();
		var start_point:Point=new Point();
		var end_point:Point=new Point();
		var start_left:Point=new Point();
		var start_right:Point=new Point();
		var ctr_left:Point=new Point();
		var ctr_right:Point=new Point();
		var ctr_left2:Point=new Point();
		var ctr_right2:Point=new Point();
		var end_left:Point=new Point();
		var end_right:Point=new Point();
		var tmp_point:Point=new Point();
		var tmp_point2:Point=new Point();
		var tmp_point3:Point=new Point();
		var closed:boolean=false;
		var last_dir_vec:Point=new Point();
		var cp=0;
		for(cp=0; cp<len; cp++){

			one_path = graphic_pathes[cp];
			contour_commands = one_path._newCommands;
			contour_data = one_path._positions;
			strokeStyle = one_path.stroke();

			var half_thickness:number=strokeStyle.half_thickness;
			//console.log("scaleMode", scaleMode);
			if(scaleMode==LineScaleMode.NORMAL){
				if((half_thickness*scale)<=0.5){
					half_thickness=0.5*(1/scale);
				}
			}

			else if(scaleMode==LineScaleMode.NONE){
				half_thickness*=(1/scale);
			}

			if(strokeStyle.scaleMode==LineScaleMode.HAIRLINE){
				half_thickness=0.5*(1/scale);
			}

			for(k=0; k<contour_commands.length; k++) {
				commands = contour_commands[k];
				data = contour_data[k];
				vert_cnt = 0;
				data_cnt = 0;

				var new_dir:number=0;
				var dir_delta:number=0;
				var last_direction:number=0;

				var tmp_dir_point:Point=new Point();

				// check if the path is closed. if yes, than set the last_dir_vec from last segment
				closed = true;
				if((data[0] != data[data.length-2]) || (data[1] != data[data.length-1]))
					closed = false;
				else{
					last_dir_vec.x = data[data.length-2]-data[data.length-4];
					last_dir_vec.y = data[data.length-1]-data[data.length-3];
					last_dir_vec.normalize();
					last_direction = Math.atan2(last_dir_vec.y, last_dir_vec.x) * MathConsts.RADIANS_TO_DEGREES;
					//console.log("Path is closed, we set initial direction: "+last_direction);
				}

				data_cnt=0;
				lastPoint.x=data[data_cnt++]; 
				lastPoint.y=data[data_cnt++];


				var new_cmds:Array<number>=[];
				var new_pnts:Array<Point>=[];
				var new_cmds_cnt=0;
				var new_pnts_cnt=0;
				var prev_normal:Point = new Point();
				var le_point:Point = new Point();
				var curve_end_point:Point = new Point();
				var ri_point:Point = new Point();
				var ctr_point:Point = new Point();

				prev_normal.x = -1*last_dir_vec.y;
				prev_normal.y = last_dir_vec.x;

				//console.log("\nsegment "+i+"lastPoint x = "+lastPoint.x+" y = "+lastPoint.y)
				for (i = 1; i < commands.length; i++) {
					if (commands[i]==GraphicsPathCommand.MOVE_TO) {
						console.log("ERROR ! ONLY THE FIRST COMMAND FOR A CONTOUR IS ALLOWED TO BE A 'MOVE_TO' COMMAND");
						continue;
					}
					//console.log("");
					end_point = new Point(data[data_cnt++], data[data_cnt++]);

					//console.log("segment "+i+"end_point x = "+end_point.x+" y = "+end_point.y)
					if (commands[i]==GraphicsPathCommand.CURVE_TO) {
						curve_end_point = new Point(data[data_cnt++], data[data_cnt++]);
						//console.log("segment "+i+"curve_end_point x = "+curve_end_point.x+" y = "+curve_end_point.y)
					}
					if((end_point.x != lastPoint.x)||(end_point.y != lastPoint.y)){
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
						//console.log("DIRECTION DELTA: "+dir_delta);
						last_direction = new_dir;
						//console.log("segment "+i+" direction: "+dir_delta);
						// rotate direction around 90 degree
						tmp_point.x = -1 * tmp_dir_point.y;
						tmp_point.y = tmp_dir_point.x;

						ri_point = new Point(lastPoint.x + (tmp_point.x * half_thickness), lastPoint.y + (tmp_point.y * half_thickness));
						le_point = new Point(lastPoint.x - (tmp_point.x * half_thickness), lastPoint.y - (tmp_point.y * half_thickness));

						var add_segment:boolean=false;
						// check if this is the first segment, and the path is not closed
						// in this case, we can just set the points to the contour points
						if((i==1)&&(!closed)){
							//console.log("segment "+i+"Path is not closed, we can just add the first segment")
							add_segment=true;
						}
						else{

							// we need to figure out if we need to add a joint or not
							if ((dir_delta==0)||(dir_delta==180)){
								// check if this and the prev segment was a line. if yes, than they can be merged
								if ((i!=1) && (commands[i]== GraphicsPathCommand.LINE_TO) && (new_cmds[new_cmds.length-1]==GraphicsPathCommand.LINE_TO)){
									//console.log("straight line can be merged in prev straight line");
									add_segment=false;
								}
								// if not we can just add the contour points
								else{
									add_segment=true;
								}
							}

							//edgecase - very small angle between segments
							// for now just add the contour points
							if (Math.abs(dir_delta) <= 10 || (Math.abs(dir_delta) >= 170 && Math.abs(dir_delta) <= 190) || Math.abs(dir_delta) >= 350) {
								add_segment=true;
							}
							else if (dir_delta!=0) {
								add_segment=true;
								var half_angle:number=(180-(dir_delta));
								if(dir_delta<0){
									half_angle=(-180-(dir_delta));
								}
								//console.log("half_angle: ",half_angle);
								half_angle= half_angle * -0.5 * MathConsts.DEGREES_TO_RADIANS;
								//console.log("half_angle: ",half_angle);
								var distance:number=half_thickness / Math.sin(half_angle);
								if(distance>half_thickness*2){
									//console.log("ERROR: ",distance, half_thickness);

								}
								//console.log("Math.sin(half_angle): ",Math.sin(half_angle));
								tmp_point2.x = tmp_dir_point.x * Math.cos(half_angle) + tmp_dir_point.y * Math.sin(half_angle);
								tmp_point2.y = tmp_dir_point.y * Math.cos(half_angle) - tmp_dir_point.x * Math.sin(half_angle);
								tmp_point2.normalize();
								//console.log("distance: ",distance);
								//console.log("tmp_point2: ",tmp_point2);
								var merged_pnt_ri:Point = new Point(lastPoint.x - (tmp_point2.x * distance), lastPoint.y - (tmp_point2.y * distance));
								var merged_pnt_le:Point = new Point(lastPoint.x + (tmp_point2.x * distance), lastPoint.y + (tmp_point2.y * distance));
								if (dir_delta > 0){
									ri_point = merged_pnt_ri;
									var contour_le:Point = new Point(lastPoint.x - (tmp_point.x * half_thickness), lastPoint.y - (tmp_point.y * half_thickness));
									var contour_prev_le:Point = new Point(lastPoint.x - (prev_normal.x * half_thickness), lastPoint.y - (prev_normal.y * half_thickness));
									le_point=contour_le;
								}
								else{
									le_point = merged_pnt_le;
									var contour_ri:Point = new Point(lastPoint.x + (tmp_point.x * half_thickness), lastPoint.y + (tmp_point.y * half_thickness));
									var contour_prev_ri:Point = new Point(lastPoint.x + (prev_normal.x * half_thickness), lastPoint.y + (prev_normal.y * half_thickness));
									ri_point=contour_ri;
								}
								var addJoints:boolean=true;

								if (strokeStyle.jointstyle==JointStyle.MITER){
									var distance_miter:number = (Math.sqrt((distance*distance)-(half_thickness*half_thickness))/half_thickness);
									if(distance_miter<=strokeStyle.miter_limit){
										addJoints=false;
										ri_point = merged_pnt_ri;
										le_point = merged_pnt_le;
									}
									else{
										if (dir_delta > 0){
											contour_le.x = contour_le.x-(tmp_dir_point.x*(strokeStyle.miter_limit*half_thickness));
											contour_le.y = contour_le.y-(tmp_dir_point.y*(strokeStyle.miter_limit*half_thickness));
											tmp_point3.x=prev_normal.y*-1;
											tmp_point3.y=prev_normal.x;
											contour_prev_le.x = contour_prev_le.x-(tmp_point3.x*(strokeStyle.miter_limit*half_thickness));
											contour_prev_le.y = contour_prev_le.y-(tmp_point3.y*(strokeStyle.miter_limit*half_thickness));
										}
										else{
											contour_ri.x = contour_ri.x-(tmp_dir_point.x*(strokeStyle.miter_limit*half_thickness));
											contour_ri.y = contour_ri.y-(tmp_dir_point.y*(strokeStyle.miter_limit*half_thickness));
											tmp_point3.x=prev_normal.y*-1;
											tmp_point3.y=prev_normal.x;
											contour_prev_ri.x = contour_prev_ri.x-(tmp_point3.x*(strokeStyle.miter_limit*half_thickness));
											contour_prev_ri.y = contour_prev_ri.y-(tmp_point3.y*(strokeStyle.miter_limit*half_thickness));
										}
									}
								}
								if(addJoints) {

									new_cmds[new_cmds_cnt++]=(strokeStyle.jointstyle!=JointStyle.ROUND)? GraphicsPathCommand.BUILD_JOINT : GraphicsPathCommand.BUILD_ROUND_JOINT;
									if (dir_delta > 0) {
										new_pnts[new_pnts_cnt++] = merged_pnt_ri;
										new_pnts[new_pnts_cnt++] = contour_prev_le;
										new_pnts[new_pnts_cnt++] = contour_le;
									}
									else {
										new_pnts[new_pnts_cnt++] = contour_prev_ri;
										new_pnts[new_pnts_cnt++] = merged_pnt_le;
										new_pnts[new_pnts_cnt++] = contour_ri;
									}

									if(strokeStyle.jointstyle==JointStyle.ROUND){

										new_pnts[new_pnts_cnt++] = new Point(lastPoint.x - (tmp_point2.x * Math.abs(distance)), lastPoint.y - (tmp_point2.y * Math.abs(distance)));

										if (dir_delta > 0) {
											new_pnts[new_pnts_cnt++] = contour_prev_le;
											new_pnts[new_pnts_cnt++] = contour_le;
										}
										else {
											new_pnts[new_pnts_cnt++] = contour_prev_ri;
											new_pnts[new_pnts_cnt++] = contour_ri;
										}
									}

								}

							}
						}
						prev_normal.x = tmp_point.x;
						prev_normal.y = tmp_point.y;
						if(add_segment){
							if (commands[i]== GraphicsPathCommand.LINE_TO) {
								new_cmds[new_cmds_cnt++] = GraphicsPathCommand.LINE_TO;
								new_pnts[new_pnts_cnt++] = ri_point;
								new_pnts[new_pnts_cnt++] = le_point;
							}
							else if (commands[i]== GraphicsPathCommand.CURVE_TO) {
								tmp_dir_point.x = curve_end_point.x - end_point.x;
								tmp_dir_point.y = curve_end_point.y - end_point.y;
								tmp_dir_point.normalize();
								new_dir = Math.atan2(tmp_dir_point.y, tmp_dir_point.x) * MathConsts.RADIANS_TO_DEGREES;
								dir_delta = new_dir - last_direction;

								last_direction = new_dir;

								tmp_point.x = -1 * tmp_dir_point.y;
								tmp_point.y = tmp_dir_point.x;
								if((dir_delta!=0)&&(dir_delta!=180)){
									new_cmds[new_cmds_cnt++] = GraphicsPathCommand.CURVE_TO;
									new_pnts[new_pnts_cnt++] = ri_point;
									new_pnts[new_pnts_cnt++] = le_point;
									new_pnts[new_pnts_cnt++] = new Point(lastPoint.x, lastPoint.y);
									new_pnts[new_pnts_cnt++] = new Point(end_point.x, end_point.y);
									new_pnts[new_pnts_cnt++] = curve_end_point;
								}
								else{
									new_cmds[new_cmds_cnt++] = GraphicsPathCommand.LINE_TO;
									new_pnts[new_pnts_cnt++] = ri_point;
									new_pnts[new_pnts_cnt++] = le_point;
								}
								prev_normal.x = tmp_point.x;
								prev_normal.y = tmp_point.y;
								lastPoint = curve_end_point;
							}
						}
						if (commands[i]== GraphicsPathCommand.LINE_TO) {
							lastPoint = end_point;
						}
						if(i==commands.length-1){
							if (!closed) {
								new_cmds[new_cmds_cnt++] = GraphicsPathCommand.NO_OP;
								new_pnts[new_pnts_cnt++] = new Point(lastPoint.x + (tmp_point.x * half_thickness), lastPoint.y + (tmp_point.y * half_thickness));
								new_pnts[new_pnts_cnt++] = new Point(lastPoint.x - (tmp_point.x * half_thickness), lastPoint.y - (tmp_point.y * half_thickness));
							}
							else{
								new_cmds[new_cmds_cnt++] = GraphicsPathCommand.NO_OP;
								new_pnts[new_pnts_cnt++] = new_pnts[0];
								new_pnts[new_pnts_cnt++] = new_pnts[1];
							}
						}
					}

				}


				// first we draw all the curves:
				new_cmds_cnt=0;
				new_pnts_cnt=0;
				for (i = 0; i < new_cmds.length; i++) {

					if(new_cmds[i]==GraphicsPathCommand.LINE_TO){
						new_pnts_cnt+=2;
					}
					else if(new_cmds[i]==GraphicsPathCommand.CURVE_TO){

						if(curves){

							start_right = new_pnts[new_pnts_cnt++];
							start_left = new_pnts[new_pnts_cnt++];

							start_point = new_pnts[new_pnts_cnt++];
							ctr_point = new_pnts[new_pnts_cnt++];
							end_point = new_pnts[new_pnts_cnt++];

							end_right = new_pnts[new_pnts_cnt];
							end_left = new_pnts[new_pnts_cnt+1];

							// get the directional vector for the first part of the curve
							tmp_dir_point.x = ctr_point.x - start_point.x;
							tmp_dir_point.y = ctr_point.y - start_point.y;
							tmp_point3.x = ctr_point.x - start_point.x;
							tmp_point3.y = ctr_point.y - start_point.y;
							var length1:number =tmp_point3.length;
							tmp_dir_point.normalize();


							// get the directional vector for the second part of the curve
							tmp_point2.x = end_point.x - ctr_point.x;
							tmp_point2.y = end_point.y - ctr_point.y;
							var length2:number =tmp_point2.length;

							tmp_point2.normalize();

							var length_calc:number = 0.5 - ((length2-length1)/length1)*0.5;
							if(length1>length2){
								length_calc = 0.5 + ((length1-length2)/length2)*0.5;
							}

							// get angle to positive x-axis for both dir-vectors, than get the difference between those
							var angle_1:number=Math.atan2(tmp_dir_point.y, tmp_dir_point.x) * MathConsts.RADIANS_TO_DEGREES;
							var angle_2:number=Math.atan2(tmp_point2.y, tmp_point2.x) * MathConsts.RADIANS_TO_DEGREES;
							dir_delta=angle_2-angle_1;
							if(dir_delta>180)	dir_delta-=360;
							if(dir_delta<-180)	dir_delta+=360;


							//var half_angle:number=dir_delta*0.5*MathConsts.DEGREES_TO_RADIANS;

							//var distance:number=half_thickness / Math.sin(half_angle);
							//tmp_point3.x = tmp_point2.x * Math.cos(half_angle) + tmp_point2.y * Math.sin(half_angle);
							//tmp_point3.y = tmp_point2.y * Math.cos(half_angle) - tmp_point2.x * Math.sin(half_angle);
							//tmp_point3.normalize();
							//var merged_pnt_ri:Point = new Point(ctr_point.x - (tmp_point3.x * distance), ctr_point.y - (tmp_point3.y * distance));
							//var merged_pnt_le:Point = new Point(ctr_point.x + (tmp_point3.x * distance), ctr_point.y + (tmp_point3.y * distance));


							var curve_x:number = GraphicsFactoryHelper.getQuadricBezierPosition(0.5, start_point.x, ctr_point.x, end_point.x);
							var curve_y:number = GraphicsFactoryHelper.getQuadricBezierPosition(0.5, start_point.y, ctr_point.y, end_point.y);

							var curve_2x:number = GraphicsFactoryHelper.getQuadricBezierPosition(0.501, start_point.x, ctr_point.x, end_point.x);
							var curve_2y:number = GraphicsFactoryHelper.getQuadricBezierPosition(0.501, start_point.y, ctr_point.y, end_point.y);

							tmp_point3.x =  -1*(curve_y - curve_2y);
							tmp_point3.y =  curve_x - curve_2x;

							tmp_point3.normalize();

							//GraphicsFactoryHelper.drawPoint(curve_x,curve_y, final_vert_list);

							// move the point on the curve to use correct thickness
							ctr_right.x = curve_x - (tmp_point3.x * half_thickness);
							ctr_right.y = curve_y - (tmp_point3.y * half_thickness);
							ctr_left.x = curve_x + (tmp_point3.x * half_thickness);
							ctr_left.y = curve_y + ( tmp_point3.y * half_thickness);

							//GraphicsFactoryHelper.drawPoint(ctr_right.x, ctr_right.y , final_vert_list);
							//GraphicsFactoryHelper.drawPoint(ctr_left.x, ctr_left.y , final_vert_list);

							// calculate the actual controlpoints
							ctr_right.x = ctr_right.x * 2 - start_right.x/2 - end_right.x/2;
							ctr_right.y = ctr_right.y * 2 - start_right.y/2 - end_right.y/2;
							ctr_left.x = ctr_left.x * 2 - start_left.x/2 - end_left.x/2;
							ctr_left.y = ctr_left.y * 2 - start_left.y/2 - end_left.y/2;


							//ctr_right=merged_pnt_ri;
							//ctr_left=merged_pnt_le;

							/*
							 // controlpoints version2:
							 tmp_dir_point.x = start_left.x-start_right.x;
							 tmp_dir_point.y = start_left.y-start_right.y;
							 tmp_point2.x = end_left.x-end_right.x;
							 tmp_point2.y = end_left.y-end_right.y;

							 ctr_right.x = ctr_point.x-(tmp_dir_point.x/2);
							 ctr_right.y = ctr_point.y-(tmp_dir_point.y/2);
							 var new_end_ri:Point = new Point(end_point.x+(tmp_dir_point.x/2), end_point.y+(tmp_dir_point.y/2));

							 ctr_left.x = ctr_point.x+(tmp_dir_point.x/2);
							 ctr_left.y = ctr_point.y+(tmp_dir_point.y/2);
							 var new_end_le:Point = new Point(end_point.x-(tmp_dir_point.x/2), end_point.y-(tmp_dir_point.y/2));

							 */
							/*
							 tmp_point2.x=ctr_point.x-start_point.x;
							 tmp_point2.y=ctr_point.y-start_point.y;
							 var m1:number=tmp_point2.y/tmp_point2.x;
							 tmp_point2.x=end_point.x-ctr_point.x;
							 tmp_point2.y=end_point.y-ctr_point.y;
							 var m2:number=tmp_point2.y/tmp_point2.x;

							 if(m1==m2){
							 console.log("lines for curve are parallel - this should not be possible!")
							 }
							 if((!isFinite(m1))&&(!isFinite(m2))){
							 console.log("both lines are vertical - this should not be possible!")
							 }
							 else if((isFinite(m1))&&(isFinite(m2))) {
							 var b_r1:number = start_right.y - (m1 * start_right.x);
							 var b_l1:number = start_left.y - (m1 * start_left.x);
							 var b_r2:number = end_right.y - (m2 * end_right.x);
							 var b_l2:number = end_left.y - (m2 * end_left.x);
							 ctr_right.x = (b_r2 - b_r1) / (m1 - m2);
							 ctr_right.y = m1 * ctr_right.x + b_r1;
							 ctr_left.x = (b_l2 - b_l1) / (m1 - m2);
							 ctr_left.y = m1 * ctr_left.x + b_l1;
							 }
							 else if((!isFinite(m1))&&(isFinite(m2))) {
							 console.log("second part of curve is vertical line");
							 var b_r2:number = end_right.y - (m2 * end_right.x);
							 var b_l2:number = end_left.y - (m2 * end_left.x);
							 ctr_right.x =  start_right.x;
							 ctr_right.y = m2 * ctr_right.x + b_r2;
							 ctr_left.x =  start_left.x;
							 ctr_left.y = m2 * ctr_left.x + b_l2;
							 }
							 else if((isFinite(m1))&&(!isFinite(m2))) {
							 console.log("first part of curve is vertical line");
							 var b_r1:number = start_right.y - (m1 * start_right.x);
							 var b_l1:number = start_left.y - (m1 * start_left.x);
							 ctr_right.x =  end_right.x;
							 ctr_right.y = m1 * ctr_right.x + b_r1;
							 ctr_left.x =  end_left.x;
							 ctr_left.y = m1 * ctr_left.x + b_l1;
							 }
							 */
							/*
							 tmp_point2.x=ctr_right.x-ctr_left.x;
							 tmp_point2.y=ctr_right.y-ctr_left.y;
							 if(tmp_point2.length!=strokeStyle.thickness){

							 tmp_point.x=ctr_left.x+tmp_point2.x*0.5;
							 tmp_point.y=ctr_left.y+tmp_point2.y*0.5;
							 tmp_point2.normalize();
							 ctr_left.x=tmp_point.x-tmp_point2.x*half_thickness;
							 ctr_left.y=tmp_point.y-tmp_point2.y*half_thickness;
							 ctr_right.x=tmp_point.x+tmp_point2.x*half_thickness;
							 ctr_right.y=tmp_point.y+tmp_point2.y*half_thickness;
							 }
							 */
							//ctr_right=ctr_point;
							//ctr_left=ctr_point;
							//console.log(start_point.x);

							//console.log(start_point.y);
							//console.log(ctr_point.x);
							//console.log(ctr_point.y);
							//console.log(end_point.x);
							//console.log(end_point.y);
							var subdivided:Array<number> = [];
							var subdivided2:Array<number> = [];
							GraphicsFactoryHelper.subdivideCurve(start_right.x, start_right.y, ctr_right.x, ctr_right.y, end_right.x, end_right.y, start_left.x, start_left.y, ctr_left.x, ctr_left.y, end_left.x, end_left.y, subdivided, subdivided2);

							if(dir_delta>0) {
								for (var sc:number = 0; sc < subdivided.length / 6; sc++) {
									// right curved
									// concave curves:
									GraphicsFactoryHelper.addTriangle(subdivided[sc * 6], subdivided[sc * 6 + 1], subdivided[sc * 6 + 2], subdivided[sc * 6 + 3], subdivided[sc * 6 + 4], subdivided[sc * 6 + 5], -128, final_vert_list, curves);

									// fills
									GraphicsFactoryHelper.addTriangle(subdivided2[sc * 6], subdivided2[sc * 6 + 1], subdivided[sc * 6], subdivided[sc * 6 + 1], subdivided[sc * 6 + 2], subdivided[sc * 6 + 3], 0, final_vert_list, curves);
									GraphicsFactoryHelper.addTriangle(subdivided2[sc * 6], subdivided2[sc * 6 + 1], subdivided2[sc * 6 + 4], subdivided2[sc * 6 + 5], subdivided[sc * 6 + 2], subdivided[sc * 6 + 3], 0, final_vert_list, curves);
									GraphicsFactoryHelper.addTriangle(subdivided2[sc * 6 + 4], subdivided2[sc * 6 + 5], subdivided[sc * 6 + 2], subdivided[sc * 6 + 3], subdivided[sc * 6 + 4], subdivided[sc * 6 + 5], 0, final_vert_list, curves);

									// convex curves:
									GraphicsFactoryHelper.addTriangle(subdivided2[sc * 6], subdivided2[sc * 6 + 1], subdivided2[sc * 6 + 2], subdivided2[sc * 6 + 3], subdivided2[sc * 6 + 4], subdivided2[sc * 6 + 5], 127, final_vert_list, curves);
								}
							}
							else {
								for (var sc:number = 0; sc < subdivided.length / 6; sc++) {
									// left curved
									// convex curves:
									GraphicsFactoryHelper.addTriangle(subdivided[sc * 6], subdivided[sc * 6 + 1], subdivided[sc * 6 + 2], subdivided[sc * 6 + 3], subdivided[sc * 6 + 4], subdivided[sc * 6 + 5], 127, final_vert_list, curves);

									// fills
									GraphicsFactoryHelper.addTriangle(subdivided[sc * 6], subdivided[sc * 6 + 1], subdivided2[sc * 6], subdivided2[sc * 6 + 1], subdivided2[sc * 6 + 2], subdivided2[sc * 6 + 3], 0, final_vert_list, curves);
									GraphicsFactoryHelper.addTriangle(subdivided[sc * 6], subdivided[sc * 6 + 1], subdivided[sc * 6 + 4], subdivided[sc * 6 + 5], subdivided2[sc * 6 + 2], subdivided2[sc * 6 + 3], 0, final_vert_list, curves);
									GraphicsFactoryHelper.addTriangle(subdivided[sc * 6 + 4], subdivided[sc * 6 + 5], subdivided2[sc * 6 + 2], subdivided2[sc * 6 + 3], subdivided2[sc * 6 + 4], subdivided2[sc * 6 + 5], 0, final_vert_list, curves);


									// concave curves:
									GraphicsFactoryHelper.addTriangle(subdivided2[sc * 6], subdivided2[sc * 6 + 1], subdivided2[sc * 6 + 2], subdivided2[sc * 6 + 3], subdivided2[sc * 6 + 4], subdivided2[sc * 6 + 5], -128, final_vert_list, curves);
								}
							}
						}
						else{

							start_right = new_pnts[new_pnts_cnt++];
							start_left = new_pnts[new_pnts_cnt++];

							start_point = new_pnts[new_pnts_cnt++];
							ctr_point = new_pnts[new_pnts_cnt++];
							end_point = new_pnts[new_pnts_cnt++];

							end_right = new_pnts[new_pnts_cnt];
							end_left = new_pnts[new_pnts_cnt+1];

							GraphicsFactoryHelper.tesselateCurve(start_point.x, start_point.y, ctr_point.x,ctr_point.y,end_right.x,end_right.y,final_vert_list);
							/*var c_cnt:number=curve_verts.length;
							while (c_cnt>0){
								c_cnt-=2;
								//GraphicsFactoryHelper.drawPoint(curve_verts[c_cnt],curve_verts[c_cnt+1], final_vert_list, false);

							}*/


							// subdivide the middle curve

							// for each new point calculate the left / right points

							// connect the points to build tris...

							 


						}



					}

					else if(new_cmds[i]>=GraphicsPathCommand.BUILD_JOINT) {
						new_pnts_cnt+=3;
						if(new_cmds[i]==GraphicsPathCommand.BUILD_ROUND_JOINT) {
							end_left = new_pnts[new_pnts_cnt++];
							start_right = new_pnts[new_pnts_cnt++];
							start_left = new_pnts[new_pnts_cnt++];
							GraphicsFactoryHelper.tesselateCurve(start_right.x, start_right.y, end_left.x, end_left.y, start_left.x, start_left.y, final_vert_list, 1, true);

						}
					}
				}
				// now we draw all the normal triangles.
				// we do it in 2 steps, to prevent curves cut anything out of underlying normal tris
				new_cmds_cnt=0;
				new_pnts_cnt=0;
				for (i = 0; i < new_cmds.length; i++) {

					if(new_cmds[i]==GraphicsPathCommand.LINE_TO){
						start_right = new_pnts[new_pnts_cnt++];
						start_left = new_pnts[new_pnts_cnt++];
						end_right = new_pnts[new_pnts_cnt];
						end_left = new_pnts[new_pnts_cnt+1];
						//0GraphicsFactoryHelper.drawPoint(start_right.x,start_right.y, final_vert_list, false);
						//GraphicsFactoryHelper.drawPoint(start_left.x,start_left.y, final_vert_list, false);
						//GraphicsFactoryHelper.drawPoint(end_right.x,end_right.y, final_vert_list, false);
						//GraphicsFactoryHelper.drawPoint(end_left.x,end_left.y, final_vert_list, false);
						GraphicsFactoryHelper.addTriangle(start_right.x,  start_right.y,    end_right.x,  end_right.y, start_left.x,  start_left.y, 0, final_vert_list, curves);
						GraphicsFactoryHelper.addTriangle(start_left.x,  start_left.y,  end_right.x,  end_right.y, end_left.x,  end_left.y,  0, final_vert_list, curves);

					}
					else if(new_cmds[i]==GraphicsPathCommand.CURVE_TO){
						new_pnts_cnt+=5;
					}

					else if(new_cmds[i]>=GraphicsPathCommand.BUILD_JOINT) {
						end_right = new_pnts[new_pnts_cnt++];
						start_right = new_pnts[new_pnts_cnt++];
						start_left = new_pnts[new_pnts_cnt++];
						GraphicsFactoryHelper.addTriangle(start_right.x,  start_right.y,  start_left.x,  start_left.y,  end_right.x,  end_right.y, 0, final_vert_list, curves);
						if(new_cmds[i]==GraphicsPathCommand.BUILD_ROUND_JOINT) {
							new_pnts_cnt+=3;
						}
					}
				}
				if (!closed){
					last_dir_vec.x = data[2] - data[0];
					last_dir_vec.y = data[3] - data[1];
					last_dir_vec.normalize();
					GraphicsFactoryHelper.createCap(data[0], data[1], new_pnts[0], new_pnts[1], last_dir_vec, strokeStyle.capstyle, -1, half_thickness, final_vert_list, curves, scale);

					last_dir_vec.x = data[data.length-2] - data[data.length-4];
					last_dir_vec.y = data[data.length-1] - data[data.length-3];
					last_dir_vec.normalize();
					GraphicsFactoryHelper.createCap(data[data.length-2], data[data.length-1], new_pnts[new_pnts.length-2], new_pnts[new_pnts.length-1], last_dir_vec, strokeStyle.capstyle, 1, half_thickness, final_vert_list, curves, scale);

					/*
					 last_dir_vec.x = data[data.length-2] - data[data.length-4];
					 last_dir_vec.y = data[data.length-1] - data[data.length-3];
					 last_dir_vec.normalize();
					 GraphicsFactoryHelper.createCap(data[data.length-2], data[data.length-1], contour_points[contour_points.length-1], contour_points[contour_points.length-2], last_dir_vec, strokeStyle.capstyle, -1, half_thickness, final_vert_list);
					 */
				}

			}
			//console.log("final_vert_cnt "+(final_vert_cnt/5));
			// todo: handle material / submesh settings, and check if a material / submesh already exists for this settings

		}
		//targetGraphic.queued_stroke_pathes.length=0;
	}

}