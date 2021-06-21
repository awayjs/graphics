
import { Point, MathConsts,  Matrix } from '@awayjs/core';

import { ImageSampler, AttributesBuffer, AttributesView, Float2Attributes } from '@awayjs/stage';

import { IMaterial, Style, TriangleElements } from '@awayjs/renderer';

import { Shape } from '../renderables/Shape';
import { GraphicsPath } from '../draw/GraphicsPath';
import { CapsStyle } from '../draw/CapsStyle';
import { MaterialManager } from '../managers/MaterialManager';
import { Settings } from '../Settings';

export class GraphicsFactoryHelper {
	public static _tess_obj: any;

	public static drawRectangles (inputRectangles: number[], color: number, alpha: number): Shape {

		if (inputRectangles.length % 4 > 0) {
			console.log(
				'GraphicsFactoryHelper.drawRectangles: inputRectangles.length is not a multiple of 4', inputRectangles);
			return;
		}

		const final_vert_list: number[] = [];
		final_vert_list.length = (inputRectangles.length / 4) * 12;
		let i: number = 0;
		let outCnt: number = 0;
		const len: number = inputRectangles.length;
		let x: number = 0;
		let y: number = 0;
		let w: number = 0;
		let h: number = 0;

		for (i = 0; i < len; i += 4) {
			x = inputRectangles[i];
			y = inputRectangles[i + 1];
			w = inputRectangles[i + 2];
			h = inputRectangles[i + 3];
			final_vert_list[outCnt++] = x;
			final_vert_list[outCnt++] = y;
			final_vert_list[outCnt++] = x + w;
			final_vert_list[outCnt++] = y;
			final_vert_list[outCnt++] = x + w;
			final_vert_list[outCnt++] = y + h;
			final_vert_list[outCnt++] = x;
			final_vert_list[outCnt++] = y;
			final_vert_list[outCnt++] = x;
			final_vert_list[outCnt++] = y + h;
			final_vert_list[outCnt++] = x + w;
			final_vert_list[outCnt++] = y + h;
		}
		const obj: any = MaterialManager.getMaterialForColor(color, alpha);
		const material: IMaterial = obj.material;
		const attributesView: AttributesView = new AttributesView(Float32Array, material.curves ? 3 : 2);
		attributesView.set(final_vert_list);
		const attributesBuffer: AttributesBuffer = attributesView.attributesBuffer.cloneBufferView();
		attributesView.dispose();
		const elements: TriangleElements = new TriangleElements(attributesBuffer);
		elements.setPositions(new Float2Attributes(attributesBuffer));

		const shape: Shape = Shape.getShape(elements, material);
		if (obj.colorPos) {
			shape.style = new Style();
			const sampler: ImageSampler = new ImageSampler();
			material.animateUVs = true;
			shape.style.color = color;
			shape.style.addSamplerAt(sampler, material.getTextureAt(0));
			shape.style.uvMatrix = new Matrix(0, 0, 0, 0, obj.colorPos.x, obj.colorPos.y);
		}
		return shape;
	}

	public static updateRectanglesShape(shape: Shape, inputRectangles: number[]) {

		const final_vert_list: number[] = [];
		final_vert_list.length = (inputRectangles.length / 4) * 12;
		let i: number = 0;
		let outCnt: number = 0;
		const len: number = inputRectangles.length;
		let x: number = 0;
		let y: number = 0;
		let w: number = 0;
		let h: number = 0;

		for (i = 0; i < len; i += 4) {
			x = inputRectangles[i];
			y = inputRectangles[i + 1];
			w = inputRectangles[i + 2];
			h = inputRectangles[i + 3];
			final_vert_list[outCnt++] = x;
			final_vert_list[outCnt++] = y;
			final_vert_list[outCnt++] = x + w;
			final_vert_list[outCnt++] = y;
			final_vert_list[outCnt++] = x + w;
			final_vert_list[outCnt++] = y + h;
			final_vert_list[outCnt++] = x;
			final_vert_list[outCnt++] = y;
			final_vert_list[outCnt++] = x;
			final_vert_list[outCnt++] = y + h;
			final_vert_list[outCnt++] = x + w;
			final_vert_list[outCnt++] = y + h;
		}
		const elements: TriangleElements = <TriangleElements> shape.elements;
		elements.concatenatedBuffer.count = final_vert_list.length / 2;
		elements.setPositions(final_vert_list);
		elements.invalidate();
	}

	public static isClockWiseXY(
		point1x: number, point1y: number, point2x: number,
		point2y: number, point3x: number, point3y: number): boolean {

		const num: number = (point1x - point2x) * (point3y - point2y) - (point1y - point2y) * (point3x - point2x);
		if (num < 0)
			return false;
		return true;
	}

	public static getSign(ax: number, ay: number, cx: number, cy: number, bx: number, by: number): number {
		return (ax - bx) * (cy - by) - (ay - by) * (cx - bx);
	}

	public static pointInTri(
		ax: number, ay: number,
		bx: number, by: number,
		cx: number, cy: number,
		xx: number, xy: number): boolean {

		const b1: boolean = this.getSign(ax, ay, xx, xy, bx, by) > 0;
		const b2: boolean = this.getSign(bx, by, xx, xy, cx, cy) > 0;
		const b3: boolean = this.getSign(cx, cy, xx, xy, ax, ay) > 0;
		return ((b1 == b2) && (b2 == b3));
	}

	public static getControlXForCurveX(_a: number, c: number, _b: number): number {
		return c;
	}

	public static getControlYForCurveY(_a: number, c: number, _b: number): number {
		return c;
	}

	public static drawPoint(startX: number,startY: number, vertices: Array<number>, curves: boolean): void {
		this.addTriangle(startX - 2, startY - 2, startX + 2, startY - 2, startX + 2, startY + 2, 0, vertices, curves);
		this.addTriangle(startX - 2, startY - 2, startX - 2, startY + 2, startX + 2, startY + 2, 0, vertices, curves);
	}

	public static drawElipse(
		x: number,y: number,
		width: number, height: number,
		vertices: Array<number>,
		startAngle: number, endAngle: number, stepAngle: number,
		curves: boolean): void {

		// todo: validate input / check edge cases
		const degreeTotal: number = endAngle - startAngle;
		const steps: number = degreeTotal / stepAngle;
		let x_last = x + width * Math.cos(startAngle * (Math.PI / 180));
		let y_last = y + height * Math.sin(startAngle * (Math.PI / 180));
		for (let i = 1; i <= steps;i++) {
			const x_tmp = x + width * Math.cos((startAngle + i * stepAngle) * (Math.PI / 180));
			const y_tmp = y + height * Math.sin((startAngle + i * stepAngle) * (Math.PI / 180));
			this.addTriangle(x,y,x_tmp,y_tmp, x_last, y_last, 0, vertices, curves);
			x_last = x_tmp;
			y_last = y_tmp;
		}
	}

	public static drawElipseStrokes(x: number,y: number,width: number, height: number,
		strokePath: GraphicsPath, startAngle: number,
		endAngle: number, stepAngle: number): void {

		// todo: validate input / check edge cases
		const degreeTotal: number = endAngle - startAngle;
		const steps: number = degreeTotal / stepAngle;
		const x_last = x + (width) * Math.cos(startAngle * (Math.PI / 180));
		const y_last = y + (height) * Math.sin(startAngle * (Math.PI / 180));
		strokePath.moveTo(x_last, y_last);
		for (let i = 1; i <= steps;i++) {
			const x_tmp = x + (width) * Math.cos((startAngle + i * stepAngle) * (Math.PI / 180));
			const y_tmp = y + (height) * Math.sin((startAngle + i * stepAngle) * (Math.PI / 180));
			strokePath.lineTo(x_tmp, y_tmp);
		}
	}

	public static addTriangle(
		startX: number, startY: number,
		controlX: number, controlY: number,
		endX: number, endY: number,
		tri_type: number,
		vertices: Array<number>, curves: boolean): void {

		const x1 = startX;
		const y1 = startY;
		const x2 = controlX;
		const y2 = controlY;
		const x3 = endX;
		const y3 = endY;
		if (GraphicsFactoryHelper.isClockWiseXY(x1, y1, x2, y2, x3, y3)) {
			startX = x3;
			startY = y3;
			controlX = x2;
			controlY = y2;
			endX = x1;
			endY = y1;
		}
		let final_vert_cnt: number = vertices.length;
		if (tri_type == 0) {
			vertices[final_vert_cnt++] = startX;
			vertices[final_vert_cnt++] = startY;
			if (curves)
				vertices[final_vert_cnt++] = 4.5736980577097704e-41;// ((127<<24)+(127<<16)+0+0)
			vertices[final_vert_cnt++] = controlX;
			vertices[final_vert_cnt++] = controlY;
			if (curves)
				vertices[final_vert_cnt++] = 4.5736980577097704e-41;// ((127<<24)+(127<<16)+0+0)
			vertices[final_vert_cnt++] = endX;
			vertices[final_vert_cnt++] = endY;
			if (curves)
				vertices[final_vert_cnt++] = 4.5736980577097704e-41;// ((127<<24)+(127<<16)+0+0)
		} else if (tri_type < 0) {
			vertices[final_vert_cnt++] = startX;
			vertices[final_vert_cnt++] = startY;
			if (curves)
				vertices[final_vert_cnt++] = 1.1708844992641982e-38;// ((127<<24)+(127<<16)+0+0)
			vertices[final_vert_cnt++] = controlX;
			vertices[final_vert_cnt++] = controlY;
			if (curves)
				vertices[final_vert_cnt++] = 2.2778106537599901e-41;// ((127<<24)+(63<<16)+0+0)
			vertices[final_vert_cnt++] = endX;
			vertices[final_vert_cnt++] = endY;
			if (curves)
				vertices[final_vert_cnt++] = 1.7796490496925177e-43;// ((127<<24)+0+0+0)
		} else if (tri_type > 0) {
			vertices[final_vert_cnt++] = startX;
			vertices[final_vert_cnt++] = startY;
			if (curves)
				vertices[final_vert_cnt++] = 1.1708846393940446e-38;// ((-128<<24)+(127<<16)+0+0)
			vertices[final_vert_cnt++] = controlX;
			vertices[final_vert_cnt++] = controlY;
			if (curves)
				vertices[final_vert_cnt++] = 2.2779507836064226e-41;// ((-128<<24)+(63<<16)+0+0)
			vertices[final_vert_cnt++] = endX;
			vertices[final_vert_cnt++] = endY;
			if (curves)
				vertices[final_vert_cnt++] = 1.793662034335766e-43;// ((-128<<24)+0+0+0)
		}
	}

	public static createCap(
		startX: number, startY: number,
		start_le_x: number, start_le_y: number,
		start_ri_x: number, start_ri_y: number,
		direction_x: number, direction_y: number,
		capstyle: number,
		cap_position: number,
		thicknessX: number, thicknessY: number,
		vertices: Array<number>, curves: boolean): void {

		direction_x *= cap_position;
		direction_y *= cap_position;
		if (capstyle == CapsStyle.ROUND) {
			//console.log("add round cap");
			const end_x: number = startX + ((direction_x * thicknessX));
			const end_y: number = startY + ((direction_y * thicknessY));
			//end_x = end_x * 2 - start_le.x/2 - start_ri.x/2;
			//end_y = end_y * 2 - start_le.y/2 - start_ri.y/2;
			const tmp1_x: number = start_le_x + ((direction_x * thicknessX));
			const tmp1_y: number = start_le_y + ((direction_y * thicknessY));
			const tmp2_x: number = start_ri_x + ((direction_x * thicknessX));
			const tmp2_y: number = start_ri_y + ((direction_y * thicknessY));

			this.tesselateCurve(start_le_x, start_le_y, tmp1_x, tmp1_y, end_x, end_y, vertices, true);
			this.tesselateCurve(end_x, end_y, tmp2_x, tmp2_y, start_ri_x, start_ri_y, vertices, true);
			this.addTriangle(start_le_x, start_le_y, end_x, end_y, start_ri_x, start_ri_y, -1, vertices, curves);
		} else if (capstyle == CapsStyle.SQUARE) {
			//console.log("add square cap");
			const tmp1_x: number = start_le_x + ((direction_x * thicknessX));
			const tmp1_y: number = start_le_y + ((direction_y * thicknessY));
			const tmp2_x: number = start_ri_x + ((direction_x * thicknessX));
			const tmp2_y: number = start_ri_y + ((direction_y * thicknessY));

			this.addTriangle(tmp2_x,tmp2_y, tmp1_x, tmp1_y, start_le_x, start_le_y, 0, vertices, curves);
			this.addTriangle(tmp2_x,tmp2_y, start_le_x, start_le_y, start_ri_x, start_ri_y, 0, vertices, curves);
		}
	}

	public static getLineFormularData(a: Point, b: Point): Point {
		const tmp_x = b.x - a.x;
		const tmp_y = b.y - a.y;
		const return_point: Point = new Point();
		if ((tmp_x != 0) && (tmp_y != 0))
			return_point.x = tmp_y / tmp_x;
		return_point.y = -(return_point.x * a.x - a.y);
		return return_point;
	}

	public static getQuadricBezierPosition(t: number, start: number, control: number, end: number): number {
		const xt = 1 - t;
		return xt * xt * start + 2 * xt * t * control + t * t * end;
	}

	public static subdivideCurve(
		startx: number, starty: number,
		cx: number, cy: number,
		endx: number, endy: number,
		startx2: number, starty2: number,
		cx2: number, cy2: number,
		endx2: number, endy2: number,
		array_out: Array<number>, array2_out: Array<number>): void {

		const angle_1: number = Math.atan2(cy - starty, cx - startx) * MathConsts.RADIANS_TO_DEGREES;
		const angle_2: number = Math.atan2(endy - cy, endx - cx) * MathConsts.RADIANS_TO_DEGREES;
		let angle_delta: number = angle_2 - angle_1;
		//console.log("angle_delta "+angle_delta);

		if (angle_delta > 180) {
			angle_delta -= 360;
		}
		if (angle_delta < -180) {
			angle_delta += 360;
		}
		if (Math.abs(angle_delta) >= 175) {
			array_out.push(startx, starty, cx, cy,  endx, endy);
			array2_out.push(startx2, starty2, cx2, cy2, endx2, endy2);
			return;
		}

		let b1: boolean = false;
		//let b2: boolean = false;
		if (angle_delta < 0) {
			// curve is curved to right side. right side is convex
			b1 = GraphicsFactoryHelper.getSign(startx, starty, cx2, cy2, endx, endy) > 0;
			//b2 = GraphicsFactoryHelper.getSign(startx, starty, cx, cy, endx, endy) > 0;

			// eslint-disable-next-line max-len
			b1 = (((starty - endy) * (cx - startx) + (endx - startx) * (cy - starty)) * ((starty - endy) * (cx2 - startx) + (endx - startx) * (cy2 - starty))) < 0;

		} else {
			// curve is curved to left side. left side is convex
			b1 = GraphicsFactoryHelper.getSign(startx2, starty2, cx2, cy2, endx2, endy2) > 0;
			//b2 = GraphicsFactoryHelper.getSign(startx2, starty2, cx, cy, endx2, endy2) > 0;
			// eslint-disable-next-line max-len
			b1 = (((starty2 - endy) * (cx - startx2) + (endx2 - startx2) * (cy - starty2)) * ((starty2 - endy2) * (cx2 - startx2) + (endx2 - startx2) * (cy2 - starty2))) < 0;

		}
		if (b1) {
			array_out.push(startx, starty, cx, cy,  endx, endy);
			array2_out.push(startx2, starty2, cx2, cy2, endx2, endy2);
			return;
		}
		// triangles overlap. we must subdivide:

		const c1x = startx + (cx - startx) * 0.5;// new controlpoint 1.1
		const c1y = starty + (cy - starty) * 0.5;
		const c2x = cx + (endx - cx) * 0.5;// new controlpoint 1.2
		const c2y = cy + (endy - cy) * 0.5;
		const ax = c1x + (c2x - c1x) * 0.5;// new middlepoint 1
		const ay = c1y + (c2y - c1y) * 0.5;

		const c1x2 = startx2 + (cx2 - startx2) * 0.5;// new controlpoint 2.1
		const c1y2 = starty2 + (cy2 - starty2) * 0.5;
		const c2x2 = cx2 + (endx2 - cx2) * 0.5;// new controlpoint 2.2
		const c2y2 = cy2 + (endy2 - cy2) * 0.5;
		const ax2 = c1x2 + (c2x2 - c1x2) * 0.5;// new middlepoint 2
		const ay2 = c1y2 + (c2y2 - c1y2) * 0.5;

		this.subdivideCurve(
			startx, starty, c1x, c1y, ax, ay, startx2, starty2, c1x2, c1y2, ax2, ay2, array_out, array2_out);
		this.subdivideCurve(
			ax, ay, c2x, c2y, endx, endy, ax2, ay2, c2x2, c2y2, endx2, endy2, array_out, array2_out);

	}

	public static tesselateCurve(
		startx: number,
		starty: number,
		cx: number,
		cy: number,
		endx: number,
		endy: number,
		array_out: Array<number>,
		filled: boolean = false,
		iterationCnt: number = 0
	): void {

		const maxIterations: number = Settings.CURVE_TESSELATION_COUNT;
		const minAngle = 1;
		const minLengthSqr = 1;

		// if "filled" is true, we are collecting final vert positions in the array,
		// ready to use for rendering. (6-position values for each tri)
		// if "filled" is false, we are collecting vert positions for a path (we do not need the start-position).

		// stop tesselation on maxIteration level. Set it to 0 for no tesselation at all.
		if (iterationCnt >= maxIterations) {
			if (filled) {
				array_out.push(startx, starty, cx, cy, endx, endy);
				return;
			}
			array_out.push(cx, cy, endx, endy);
			return;
		}

		// calculate length of segment
		// this does not include the crtl-point position
		const diff_x = endx - startx;
		const diff_y = endy - starty;
		const lenSq = diff_x * diff_x + diff_y * diff_y;

		// subdivide the curve
		const c1x = startx + (cx - startx) * 0.5;// new controlpoint 1
		const c1y = starty + (cy - starty) * 0.5;
		const c2x = cx + (endx - cx) * 0.5;// new controlpoint 2
		const c2y = cy + (endy - cy) * 0.5;
		const ax = c1x + (c2x - c1x) * 0.5;// new middlepoint 1
		const ay = c1y + (c2y - c1y) * 0.5;

		// stop subdividing if the angle or the length is to small
		if (lenSq < minLengthSqr) {
			if (filled) {
				array_out.push(startx, starty, ax, ay, endx, endy);
			} else {
				array_out.push(endx, endy);
			}
			return;
		}

		// calculate angle between segments
		const angle_1 = Math.atan2(cy - starty, cx - startx) * MathConsts.RADIANS_TO_DEGREES;
		const angle_2 = Math.atan2(endy - cy, endx - cx) * MathConsts.RADIANS_TO_DEGREES;
		let angle_delta = angle_2 - angle_1;

		// make sure angle is in range -180 - 180
		while (angle_delta > 180) {
			angle_delta -= 360;
		}
		while (angle_delta < -180) {
			angle_delta += 360;
		}

		angle_delta = angle_delta < 0 ? -angle_delta : angle_delta;

		// stop subdividing if the angle or the length is to small
		if (angle_delta <= minAngle) {
			if (filled) {
				array_out.push(startx, starty, ax, ay, endx, endy);
			} else {
				array_out.push(endx, endy);
			}
			return;
		}

		// if the output should be directly in valid tris, we always must create a tri,
		// even when we will keep on subdividing.
		if (filled) {
			array_out.push(startx, starty, ax, ay, endx, endy);
		}

		iterationCnt++;

		GraphicsFactoryHelper.tesselateCurve(startx, starty, c1x, c1y, ax, ay, array_out, filled, iterationCnt);
		GraphicsFactoryHelper.tesselateCurve(ax, ay, c2x, c2y, endx, endy, array_out, filled, iterationCnt);

	}
}