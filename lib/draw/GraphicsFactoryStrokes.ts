import { Point, MathConsts, Matrix } from '@awayjs/core';

import { ImageSampler, AttributesBuffer, AttributesView, Float2Attributes } from '@awayjs/stage';

import { IMaterial, Style } from '@awayjs/renderer';

import { Shape } from '../renderables/Shape';
import { TriangleElements } from '../elements/TriangleElements';
import { JointStyle }	 from '../draw/JointStyle';
import { GraphicsPath } from '../draw/GraphicsPath';
import { GraphicsPathCommand } from '../draw/GraphicsPathCommand';
import { GraphicsFactoryHelper } from '../draw/GraphicsFactoryHelper';
import { GraphicsStrokeStyle } from '../draw/GraphicsStrokeStyle';
import { LineScaleMode } from '../draw/LineScaleMode';
import { Graphics } from '../Graphics';
import { LineElements } from '../elements/LineElements';
import { MaterialManager } from '../managers/MaterialManager';
import { GraphicsFactoryFills } from './GraphicsFactoryFills';

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
export class GraphicsFactoryStrokes {
	public static draw_pathes(targetGraphics: Graphics) {
		//return;
		const paths = targetGraphics.queued_stroke_pathes;
		const len = paths.length;

		for (let i = 0; i < len; i++) {
			const path = paths[i];
			const pathStyle = (<GraphicsStrokeStyle>path.style);
			const obj: any = MaterialManager.getMaterialForColor(pathStyle.color, pathStyle.alpha);
			const material: IMaterial = obj.material;

			let shape = targetGraphics.popEmptyStrokeShape();
			let style: Style;
			let sampler: ImageSampler;

			path.prepare();
			// if (targetGraphics.scaleStrokes != null) { //use LineElements
			const elements = this.fillLineElements(
				[path],
				material.curves,
				path.stroke.scaleMode, <LineElements>shape?.elements);
			// } else { // use TriangleELements
			// 	elements = GraphicsFactoryStrokes.getTriangleElements([strokePath], material.curves);
			// }

			if (!elements)
				continue;

			elements.stroke = path.stroke;

			if (obj.colorPos) {
				style = new Style();
				sampler = new ImageSampler();

				material.animateUVs = true;
				material.style.sampler = sampler;

				style.addSamplerAt(sampler, material.getTextureAt(0));
				style.uvMatrix = new Matrix(0, 0, 0, 0, obj.colorPos.x, obj.colorPos.y);
			}

			if (shape) {
				shape.material = material;
				shape.style = style;
			} else {
				shape = Shape.getShape(elements, material, style);
			}

			targetGraphics.addShapeInternal(shape);

		}
		//targetGraphics.queued_stroke_pathes.length=0;
	}

	// public static updateStrokesForShape(shape:Shape, scale:Vector3D, scaleMode:string ){
	// 	//return;

	// 	var elements:TriangleElements = <TriangleElements> shape.elements;

	// 	var final_vert_list:Array<number>=[];
	// 	GraphicsFactoryStrokes.draw_path([graphicsPath], final_vert_list, false, scale, scaleMode);

	// 	elements.concatenatedBuffer.count = final_vert_list.length/2;
	// 	elements.setPositions(final_vert_list);
	// 	elements.invalidate();

	// }

	public static fillLineElements(
		graphic_pathes: Array<GraphicsPath>,
		curves: boolean,
		scaleMode: LineScaleMode = LineScaleMode.NORMAL,
		target: LineElements = null): LineElements {
		const finalVerts: number[] = [];
		const final_thickness_list: number[] = [];
		let data: number[];

		let end_x: number = 0;
		let end_y: number = 0;
		let prev_x: number = 0;
		let prev_y: number = 0;

		let pos_count: number = 0;
		let thickness_count: number = 0;

		for (let cp = 0, l0 = graphic_pathes.length; cp < l0; cp++) {

			const path = graphic_pathes[cp];

			path.prepare();

			const positions = path._positions;
			const strokeStyle = path.stroke;
			const half_thickness = (scaleMode != LineScaleMode.HAIRLINE) ? strokeStyle.half_thickness : 0.5;

			for (let k = 0, l1 = positions.length; k < l1; k++) {
				//commands = contour_commands[k];
				data = positions[k];

				prev_x = data[0];
				prev_y = data[1];

				for (let i = 2, l2 = data.length; i < l2; i += 2) {

					end_x = data[i + 0];
					end_y = data[i + 1];

					const near = GraphicsFactoryFills.nearest(end_x, end_y, prev_x, prev_y);
					// if the points are the same, we dont need to do anything.
					if (!near) {
						finalVerts[pos_count++] = prev_x;
						finalVerts[pos_count++] = prev_y;
						finalVerts[pos_count++] = 0;
						finalVerts[pos_count++] = end_x;
						finalVerts[pos_count++] = end_y;
						finalVerts[pos_count++] = 0;
						final_thickness_list[thickness_count++] = half_thickness;
					}

					prev_x = end_x;
					prev_y = end_y;
				}
			}
		}

		if (finalVerts.length == 0)
			return null;

		const elements = target || new LineElements(new AttributesBuffer());
		elements.setPositions(finalVerts);
		elements.setThickness(final_thickness_list);

		return elements;
	}

	public static getTriangleElements(
		graphic_pathes: Array<GraphicsPath>,
		curves: boolean, scaleMode: LineScaleMode = LineScaleMode.NORMAL): TriangleElements {

		const final_vert_list: number[] = [];
		const len = graphic_pathes.length;
		let positions: number[][];
		let strokeStyle: GraphicsStrokeStyle;
		let data: number[];
		let i: number = 0;
		let k: number = 0;

		const tmp_dir_point: Point = new Point();
		const last_dir_vec: Point = new Point();
		const tmp_point: Point = new Point();
		const tmp_point2: Point = new Point();
		const tmp_point3: Point = new Point();

		let end_x: number = 0;
		let end_y: number = 0;
		let prev_x: number = 0;
		let prev_y: number = 0;
		let right_point_x: number = 0;
		let right_point_y: number = 0;
		let left_point_x: number = 0;
		let left_point_y: number = 0;
		let right_point_merged_x: number = 0;
		let right_point_merged_y: number = 0;
		let left_point_merged_x: number = 0;
		let left_point_merged_y: number = 0;
		let left_point_contour_x: number = 0;
		let left_point_contour_y: number = 0;
		let left_point_contour_prev_x: number = 0;
		let left_point_contour_prev_y: number = 0;
		let right_point_contour_x: number = 0;
		let right_point_contour_y: number = 0;
		let right_point_contour_prev_x: number = 0;
		let right_point_contour_prev_y: number = 0;
		let start_right_x: number = 0;
		let start_right_y: number = 0;
		let start_left_x: number = 0;
		let start_left_y: number = 0;
		let end_right_x: number = 0;
		let end_right_y: number = 0;
		let end_left_x: number = 0;
		let end_left_y: number = 0;
		let prev_normal_x: number;
		let prev_normal_y: number;

		let addJoints: boolean = true;
		let add_segment: boolean = false;
		let closed: boolean = false;

		let new_dir: number = 0;
		let dir_delta: number = 0;
		let last_direction: number = 0;
		let distance_miter: number = 0;
		let half_angle: number = 0;
		let distanceX: number = 0;
		let distanceY: number = 0;
		let half_thicknessX: number = 0;
		let half_thicknessY: number = 0;

		let new_cmds: number[] = [];
		let new_pnts: number[] = [];

		let new_cmds_cnt: number = 0;
		let new_pnts_cnt: number = 0;

		//console.log("process stroke");

		let cp = 0;
		for (cp = 0; cp < len; cp++) {

			positions = graphic_pathes[cp]._positions;
			strokeStyle = graphic_pathes[cp].stroke;
			half_thicknessX = strokeStyle.half_thickness;
			half_thicknessY = strokeStyle.half_thickness;

			//console.log("process contour", positions);
			if (scaleMode == LineScaleMode.NORMAL) {
				/*
				if((half_thicknessX*scale.x)<=0.5)
					half_thicknessX=0.5*(1/scale.x);

				if((half_thicknessY*scale.y)<=0.5)
                    half_thicknessY=0.5*(1/scale.y);
                    */
			}

			// else if(scaleMode==LineScaleMode.NONE){
			// 	half_thicknessX*=(1/scale.x);
			// 	half_thicknessY*=(1/scale.y);
			// }

			// if(strokeStyle.scaleMode==LineScaleMode.HAIRLINE){
			// 	half_thicknessX=0.5*(1/scale.x);
			// 	half_thicknessY=0.5*(1/scale.y);
			// }

			for (k = 0; k < positions.length; k++) {
				//commands = contour_commands[k];
				data = positions[k];

				// check if the path is closed. if yes, than set the last_dir_vec from last segment
				closed = true;

				if ((data[0] != data[data.length - 2]) || (data[1] != data[data.length - 1]))
					closed = false;
				else {
					last_dir_vec.x = data[data.length - 2] - data[data.length - 4];
					last_dir_vec.y = data[data.length - 1] - data[data.length - 3];
					last_dir_vec.normalize();
					last_direction = Math.atan2(last_dir_vec.y, last_dir_vec.x) * MathConsts.RADIANS_TO_DEGREES;
					//console.log("Path is closed, we set initial direction: "+last_direction);
				}

				prev_x = data[0];
				prev_y = data[1];

				new_cmds = [];
				new_pnts = [];
				new_cmds_cnt = 0;
				new_pnts_cnt = 0;

				prev_normal_x = -1 * last_dir_vec.y;
				prev_normal_y = last_dir_vec.x;

				for (i = 2; i < data.length; i += 2) {

					end_x = data[i];
					end_y = data[i + 1];
					//half_thicknessX=bkphalf_thicknessX*(i/data.length);
					//half_thicknessY=bkphalf_thicknessY*(i/data.length);

					// if the points are the same, we dont need to do anything.
					if ((end_x != prev_x) || (end_y != prev_y)) {

						//get the directional vector and the direction for this segment
						tmp_dir_point.x = end_x - prev_x;
						tmp_dir_point.y = end_y - prev_y;
						tmp_dir_point.normalize();
						new_dir = Math.atan2(tmp_dir_point.y, tmp_dir_point.x) * MathConsts.RADIANS_TO_DEGREES;

						// get the difference in angle to the last segment
						dir_delta = new_dir - last_direction;
						if (dir_delta > 180) {
							dir_delta -= 360;
						}
						if (dir_delta < -180) {
							dir_delta += 360;
						}
						last_direction = new_dir;

						// rotate direction around 90 degree
						tmp_point.x = -1 * tmp_dir_point.y;
						tmp_point.y = tmp_dir_point.x;

						// find the 2 points left and right of the segments end-point
						right_point_x = prev_x + (tmp_point.x * half_thicknessX);
						right_point_y = prev_y + (tmp_point.y * half_thicknessY);
						left_point_x = prev_x - (tmp_point.x * half_thicknessX);
						left_point_y = prev_y - (tmp_point.y * half_thicknessY);

						add_segment = false;
						// check if this is the first segment, and the path is not closed
						// in this case, we can just set the points to the contour points
						if ((i == 2) && (!closed)) {
							//console.log("segment "+i+"Path is not closed, we can just add the first segment")
							add_segment = true;
						} else {

							// dir_delta delta is the difference in direction between the segments
							// 2 segments forming a straight line  have a dir_delta of 0
							// a segments that goes straight back would have a dir_delta of 180 or -180
							// we want to convert this into a angle where 0 means going back
							// and 180 means straight forward.
							half_angle = (180 - (dir_delta));
							if (dir_delta < 0) {
								half_angle = (-180 - (dir_delta));
							}

							if ((dir_delta == 0) || (Math.abs(dir_delta) == 180)) {
								// straight line (back or forth)
								// only add segment if this is the first
								add_segment = (i == 2);
							} else if (Math.abs(half_angle) < 5) {
								// line going back with very steep angle
								add_segment = true;
							} else {
								add_segment = true;

								//	half_angle is the angle need to rotate our segments direction with
								//  in order to have a direction vector that points from
								//  original point to the merged contour points
								half_angle = half_angle * -0.5 * MathConsts.DEGREES_TO_RADIANS;

								// get the direction vector that splits the angle between the 2 segments in half.
								// eslint-disable-next-line max-len
								tmp_point2.x = tmp_dir_point.x * Math.cos(half_angle) + tmp_dir_point.y * Math.sin(half_angle);
								// eslint-disable-next-line max-len
								tmp_point2.y = tmp_dir_point.y * Math.cos(half_angle) - tmp_dir_point.x * Math.sin(half_angle);
								tmp_point2.normalize();

								//  calculate the distance that we need to move original point
								//  with direction-vector calculated above
								// 	very steep angles result in impossible values for distance
								//	we need to catch those cases and set sensible fallback for distance
								if (Math.abs(dir_delta) <= 1 || Math.abs(dir_delta) >= 359
									|| (Math.abs(dir_delta) >= 179 && Math.abs(dir_delta) <= 181)) {
									distanceX = (dir_delta < 0) ? half_thicknessX : -half_thicknessX;
									distanceY = (dir_delta < 0) ? half_thicknessY : -half_thicknessY;
								} else {
									distanceX = half_thicknessX / Math.sin(half_angle);
									distanceY = half_thicknessY / Math.sin(half_angle);
								}
								/*console.log("\ndir_delta", dir_delta);
								console.log("half_angle", half_angle);
								console.log("distance", distance);
								console.log("dist", dist);*/
								/*
								var distx:number=end_x-prev_x;
								var disty:number=end_y-prev_y;
								var dist:number=Math.sqrt(distx*distx + disty*disty);

								distx=prev_prev_x-prev_x;
								disty=prev_prev_y-prev_y;
								var dist2:number=Math.sqrt(distx*distx + disty*disty);
								if(dist2<dist){
									dist=dist2;
								}
								//console.log("dist", dist);

								if(Math.abs(distance)>dist){
									//distance=(distance>=0)?dist:-dist;
								}*/

								// 	get the merged points left and right
								//	by moving from original point along the direction vector
								right_point_merged_x = prev_x - (tmp_point2.x * distanceX);
								right_point_merged_y = prev_y - (tmp_point2.y * distanceY);
								left_point_merged_x = prev_x + (tmp_point2.x * distanceX);
								left_point_merged_y = prev_y + (tmp_point2.y * distanceY);

								// use different points dependent if dir_delta is positive or negative
								if (dir_delta > 0) {
									left_point_contour_x = prev_x - (tmp_point.x * half_thicknessX);
									left_point_contour_y = prev_y - (tmp_point.y * half_thicknessY);
									left_point_contour_prev_x = prev_x - (prev_normal_x * half_thicknessX);
									left_point_contour_prev_y = prev_y - (prev_normal_y * half_thicknessY);
									right_point_x = right_point_merged_x;
									right_point_y = right_point_merged_y;
									left_point_x = left_point_contour_x;
									left_point_y = left_point_contour_y;
								} else {
									right_point_contour_x = prev_x + (tmp_point.x * half_thicknessX);
									right_point_contour_y = prev_y + (tmp_point.y * half_thicknessY);
									right_point_contour_prev_x = prev_x + (prev_normal_x * half_thicknessX);
									right_point_contour_prev_y = prev_y + (prev_normal_y * half_thicknessY);
									left_point_x = left_point_merged_x;
									left_point_y = left_point_merged_y;
									right_point_x = right_point_contour_x;
									right_point_y = right_point_contour_y;
								}

								addJoints = true;

								// check if we need to add a joint
								if (strokeStyle.jointstyle == JointStyle.MITER) {
									// 	miter means that we have no bevel effect on the corners,
									// 	as long as the mitter-value is within a given miter_limit
									// eslint-disable-next-line max-len
									distance_miter = Math.sqrt((distanceX * distanceX + distanceY * distanceY) / (half_thicknessX * half_thicknessX + half_thicknessY * half_thicknessY) - 1);
									if (distance_miter <= strokeStyle.miter_limit) {
										// if within miter_limit, miter is applied,
										// and we only need to add the merged points for both sides
										addJoints = false;
										left_point_x = left_point_merged_x;
										left_point_y = left_point_merged_y;
										right_point_x = right_point_merged_x;
										right_point_y = right_point_merged_y;
									} else {
										if (dir_delta > 0) {
											// right side is merged, left side has 2 points
											// eslint-disable-next-line max-len
											left_point_contour_x = left_point_contour_x - (tmp_dir_point.x * (strokeStyle.miter_limit * half_thicknessX));
											// eslint-disable-next-line max-len
											left_point_contour_y = left_point_contour_y - (tmp_dir_point.y * (strokeStyle.miter_limit * half_thicknessY));
											tmp_point3.x = prev_normal_y * -1;
											tmp_point3.y = prev_normal_x;
											// eslint-disable-next-line max-len
											left_point_contour_prev_x = left_point_contour_prev_x - (tmp_point3.x * (strokeStyle.miter_limit * half_thicknessX));
											// eslint-disable-next-line max-len
											left_point_contour_prev_y = left_point_contour_prev_y - (tmp_point3.y * (strokeStyle.miter_limit * half_thicknessY));
										} else {
											// left side is merged, right side has 2 points
											// eslint-disable-next-line max-len
											right_point_contour_x = right_point_contour_x - (tmp_dir_point.x * (strokeStyle.miter_limit * half_thicknessX));
											// eslint-disable-next-line max-len
											right_point_contour_y = right_point_contour_y - (tmp_dir_point.y * (strokeStyle.miter_limit * half_thicknessY));
											tmp_point3.x = prev_normal_y * -1;
											tmp_point3.y = prev_normal_x;
											// eslint-disable-next-line max-len
											right_point_contour_prev_x = right_point_contour_prev_x - (tmp_point3.x * (strokeStyle.miter_limit * half_thicknessX));
											// eslint-disable-next-line max-len
											right_point_contour_prev_y = right_point_contour_prev_y - (tmp_point3.y * (strokeStyle.miter_limit * half_thicknessY));
										}
									}
								}

								if (addJoints) {

									new_cmds[new_cmds_cnt++] = (strokeStyle.jointstyle != JointStyle.ROUND)
										? GraphicsPathCommand.BUILD_JOINT
										: GraphicsPathCommand.BUILD_ROUND_JOINT;

									if (dir_delta > 0) {
										// right side is merged, left side has 2 points
										new_pnts[new_pnts_cnt++] = right_point_merged_x;
										new_pnts[new_pnts_cnt++] = right_point_merged_y;
										new_pnts[new_pnts_cnt++] = left_point_contour_prev_x;
										new_pnts[new_pnts_cnt++] = left_point_contour_prev_y;
										new_pnts[new_pnts_cnt++] = left_point_contour_x;
										new_pnts[new_pnts_cnt++] = left_point_contour_y;
									} else {
										// left side is merged, right side has 2 points
										new_pnts[new_pnts_cnt++] = right_point_contour_prev_x;
										new_pnts[new_pnts_cnt++] = right_point_contour_prev_y;
										new_pnts[new_pnts_cnt++] = left_point_merged_x;
										new_pnts[new_pnts_cnt++] = left_point_merged_y;
										new_pnts[new_pnts_cnt++] = right_point_contour_x;
										new_pnts[new_pnts_cnt++] = right_point_contour_y;
									}

									if (strokeStyle.jointstyle == JointStyle.ROUND) {

										new_pnts[new_pnts_cnt++] = prev_x - (tmp_point2.x * Math.abs(half_thicknessX));
										new_pnts[new_pnts_cnt++] = prev_y - (tmp_point2.y * Math.abs(half_thicknessY));

										if (dir_delta > 0) {
											new_pnts[new_pnts_cnt++] = left_point_contour_prev_x;
											new_pnts[new_pnts_cnt++] = left_point_contour_prev_y;
											new_pnts[new_pnts_cnt++] = left_point_contour_x;
											new_pnts[new_pnts_cnt++] = left_point_contour_y;
										} else {
											new_pnts[new_pnts_cnt++] = right_point_contour_prev_x;
											new_pnts[new_pnts_cnt++] = right_point_contour_prev_y;
											new_pnts[new_pnts_cnt++] = right_point_contour_x;
											new_pnts[new_pnts_cnt++] = right_point_contour_y;
										}
									}

								}

							}
						}
						prev_normal_x = tmp_point.x;
						prev_normal_y = tmp_point.y;
						if (add_segment) {
							new_cmds[new_cmds_cnt++] = GraphicsPathCommand.LINE_TO;
							new_pnts[new_pnts_cnt++] = right_point_x;
							new_pnts[new_pnts_cnt++] = right_point_y;
							new_pnts[new_pnts_cnt++] = left_point_x;
							new_pnts[new_pnts_cnt++] = left_point_y;
						}

						prev_x = end_x;
						prev_y = end_y;
						if (i == data.length - 2) {
							new_cmds[new_cmds_cnt++] = GraphicsPathCommand.NO_OP;
							if (!closed) {
								new_pnts[new_pnts_cnt++] = prev_x + (tmp_point.x * half_thicknessX);
								new_pnts[new_pnts_cnt++] = prev_y + (tmp_point.y * half_thicknessY);
								new_pnts[new_pnts_cnt++] = prev_x - (tmp_point.x * half_thicknessX);
								new_pnts[new_pnts_cnt++] = prev_y - (tmp_point.y * half_thicknessY);
							} else {
								new_pnts[new_pnts_cnt++] = new_pnts[0];
								new_pnts[new_pnts_cnt++] = new_pnts[1];
								new_pnts[new_pnts_cnt++] = new_pnts[2];
								new_pnts[new_pnts_cnt++] = new_pnts[3];
							}
						}
					}

				}

				new_cmds_cnt = 0;
				new_pnts_cnt = 0;
				for (i = 0; i < new_cmds.length; i++) {

					if (new_cmds[i] == GraphicsPathCommand.LINE_TO) {
						start_right_x = new_pnts[new_pnts_cnt++];
						start_right_y = new_pnts[new_pnts_cnt++];
						start_left_x = new_pnts[new_pnts_cnt++];
						start_left_y = new_pnts[new_pnts_cnt++];
						end_right_x = new_pnts[new_pnts_cnt];
						end_right_y = new_pnts[new_pnts_cnt + 1];
						end_left_x = new_pnts[new_pnts_cnt + 2];
						end_left_y = new_pnts[new_pnts_cnt + 3];
						//0GraphicsFactoryHelper.drawPoint(start_right.x,start_right.y, final_vert_list, false);
						//GraphicsFactoryHelper.drawPoint(start_left.x,start_left.y, final_vert_list, false);
						//GraphicsFactoryHelper.drawPoint(end_right.x,end_right.y, final_vert_list, false);
						//GraphicsFactoryHelper.drawPoint(end_left_x,end_left_y, final_vert_list, false);
						GraphicsFactoryHelper.addTriangle(
							start_right_x, start_right_y,
							end_right_x, end_right_y,
							start_left_x, start_left_y,
							0, final_vert_list, curves);
						GraphicsFactoryHelper.addTriangle(
							start_left_x, start_left_y,
							end_right_x, end_right_y,
							end_left_x,  end_left_y,
							0, final_vert_list, curves);

					} else if (new_cmds[i] >= GraphicsPathCommand.BUILD_JOINT) {
						end_right_x = new_pnts[new_pnts_cnt++];
						end_right_y = new_pnts[new_pnts_cnt++];
						start_right_x = new_pnts[new_pnts_cnt++];
						start_right_y = new_pnts[new_pnts_cnt++];
						start_left_x = new_pnts[new_pnts_cnt++];
						start_left_y = new_pnts[new_pnts_cnt++];

						GraphicsFactoryHelper.addTriangle(
							start_right_x, start_right_y,
							start_left_x, start_left_y,
							end_right_x, end_right_y,
							0, final_vert_list, curves);

						if (new_cmds[i] == GraphicsPathCommand.BUILD_ROUND_JOINT) {
							end_left_x = new_pnts[new_pnts_cnt++];
							end_left_y = new_pnts[new_pnts_cnt++];
							start_right_x = new_pnts[new_pnts_cnt++];
							start_right_y = new_pnts[new_pnts_cnt++];
							start_left_x = new_pnts[new_pnts_cnt++];
							start_left_y = new_pnts[new_pnts_cnt++];

							GraphicsFactoryHelper.tesselateCurve(
								start_right_x, start_right_y,
								end_left_x, end_left_y,
								start_left_x, start_left_y,
								final_vert_list, true);
						}
					}
				}
				if (!closed) {
					last_dir_vec.x = data[2] - data[0];
					last_dir_vec.y = data[3] - data[1];
					last_dir_vec.normalize();
					GraphicsFactoryHelper.createCap(
						data[0], data[1],
						new_pnts[0], new_pnts[1],
						new_pnts[2], new_pnts[3],
						last_dir_vec.x, last_dir_vec.y,
						strokeStyle.capstyle, -1,
						half_thicknessX, half_thicknessY,
						final_vert_list, curves);

					last_dir_vec.x = data[data.length - 2] - data[data.length - 4];
					last_dir_vec.y = data[data.length - 1] - data[data.length - 3];
					last_dir_vec.normalize();

					GraphicsFactoryHelper.createCap(
						data[data.length - 2], data[data.length - 1],
						new_pnts[new_pnts.length - 4], new_pnts[new_pnts.length - 3],
						new_pnts[new_pnts.length - 2], new_pnts[new_pnts.length - 1],
						last_dir_vec.x, last_dir_vec.y,
						strokeStyle.capstyle, 1,
						half_thicknessX, half_thicknessY,
						final_vert_list, curves);

				}

			}

		}
		//targetGraphic.queued_stroke_pathes.length=0;

		if (final_vert_list.length == 0)
			return;

		const attributesView: AttributesView = new AttributesView(Float32Array, curves ? 3 : 2);
		attributesView.set(final_vert_list);
		const attributesBuffer: AttributesBuffer = attributesView.attributesBuffer.cloneBufferView();
		attributesView.dispose();
		const elements: TriangleElements = new TriangleElements(attributesBuffer);
		elements.setPositions(new Float2Attributes(attributesBuffer));

		return elements;
	}

}