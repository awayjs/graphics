import { Point, Matrix3D, Box } from '@awayjs/core';

import { GraphicsPathWinding } from '../draw/GraphicsPathWinding';
import { GraphicsPathCommand } from '../draw/GraphicsPathCommand';
import { IGraphicsData, IStyleData } from '../draw/IGraphicsData';
import { GraphicsFillStyle } from '../draw/GraphicsFillStyle';
import { GraphicsStrokeStyle } from '../draw/GraphicsStrokeStyle';
import { GraphicsFactoryHelper } from '../draw/GraphicsFactoryHelper';
import { Settings } from '../Settings';

/**

 * Defines the values to use for specifying path-drawing commands.
 * The values in this class are used by the Graphics.drawPath() method,
 *or stored in the commands vector of a GraphicsPath object.
 */
export class GraphicsPath implements IGraphicsData {
	private _orientedBoxBounds: Box;
	private _orientedBoxBoundsDirty: boolean = true;

	public static data_type: string = '[graphicsdata path]';

	private _lastPrepareScale: number = -1;

	/**
	 * When path is morph, we can't filtrate commands
	 */
	public morphSource: boolean = false;

	/**
	 * The Vector of Numbers containing the parameters used with the drawing commands.
	 */
	public _positions: number[][] = [];

	private _verts: number[] = [];

	/**
	 * The Vector of Numbers containing the parameters used with the drawing commands.
	 */
	public get verts() {
		return this._verts;
	}

	public set verts(v: number[]) {
		this._verts = v;
	}

	private _style: IStyleData;

	private _lastDirtyID = 0;
	private _dirtyID = -1;

	public get dirty() {
		return this._lastDirtyID !== this._dirtyID;
	}

	constructor(
		/**
		 * The Vector of drawing commands as integers representing the path.
		 */
		public commands: GraphicsPathCommand[] = [],

		/**
		 * The Vector of numbers containing the parameters used with the drawing commands.
		 */
		public data: number[] = [],

		/**
		 * Specifies the winding rule using a value defined in the GraphicsPathWinding class.
		 */
		public winding: string = GraphicsPathWinding.EVEN_ODD,
	) {
	}

	public get data_type(): string {
		return GraphicsPath.data_type;
	}

	public get style(): IStyleData {
		return this._style;
	}

	public set style(value: IStyleData) {
		this._style = value;
		this._dirtyID++;
	}

	public get fill(): IGraphicsData {
		if (this._style == null) return null;
		if (this._style.data_type == GraphicsFillStyle.data_type) return this._style;
		return null;
	}

	public get stroke(): GraphicsStrokeStyle<any> {
		if (this._style == null) return null;
		if (this._style.data_type == GraphicsStrokeStyle.data_type) {
			return <GraphicsStrokeStyle<any>> this._style;
		}

		return null;
	}

	public curveTo(controlX: number, controlY: number, anchorX: number, anchorY: number) {
		this.commands.push(GraphicsPathCommand.CURVE_TO);
		this.data.push(controlX, controlY, anchorX, anchorY);

		this._dirtyID++;
	}

	public cubicCurveTo(
		controlX: number,
		controlY: number,
		control2X: number,
		control2Y: number,
		anchorX: number,
		anchorY: number,
	) {
		this.commands.push(GraphicsPathCommand.CUBIC_CURVE);
		this.data.push(controlX, controlY, control2X, control2Y, anchorX, anchorY);

		this._dirtyID++;
	}

	public lineTo(x: number, y: number) {

		this.commands.push(GraphicsPathCommand.LINE_TO);
		this.data.push(x, y);

		this._dirtyID++;
	}

	public moveTo(x: number, y: number) {
		this.commands.push(GraphicsPathCommand.MOVE_TO);
		this.data.push(x, y);

		this._dirtyID++;
	}

	public wideLineTo(_x: number, _y: number) { }

	public wideMoveTo(_x: number, _y: number) { }

	public forceClose: boolean = false;

	/**
	 *
	 * @param qualityScale change a pretesselation quality, > 1 decrease limits
	 * shape will have more vertices,  < 1 >0, reduce vertices - bad scale ratio
	 */
	public prepare(qualityScale: number = 1): boolean {

		// was not mutated internaly
		if (this._dirtyID === this._lastDirtyID && qualityScale === this._lastPrepareScale) {
			return;
		}

		this._lastPrepareScale = qualityScale;
		this._lastDirtyID = this._dirtyID;

		const len = this.commands.length;

		// commands may be empty
		if (len === 1 && !this.commands[0])
			return false;

		const eps = 1 / (100 * qualityScale);

		const commands = this.commands;
		const data = this.data;
		const positions = this._positions = [];

		// now we collect the final position data
		// a command list is no longer needed for this position data,
		// we resolve all curves to line segments here
		let contour, prev_x, prev_y, ctrl_x, ctrl_y, ctrl_x2, ctrl_y2, end_x, end_y;
		let d = 0, p = 0;

		// If we don't start with a moveTo command, ensure origin is added to positions
		if (commands[0] != GraphicsPathCommand.MOVE_TO) {
			positions[0] = contour = [prev_x = 0, prev_y = 0];
		}

		for (let c = 0; c < len; c++) {
			switch (commands[c]) {
				case GraphicsPathCommand.MOVE_TO:
					if (c) {
						//overwrite last command if it was a moveTo
						if (contour.length == 1) {
							positions[p] = contour = [prev_x = data[d++], prev_y = data[d++]];
							break;
						}

						// check if the last contour is closed.
						// if its not closed, we optionally close it by adding the first point to the end of the contour
						if (this.forceClose
							&& Math.abs(contour[0] - contour[contour.length - 2])
							+ Math.abs(contour[1] - contour[contour.length - 1]) > eps)
							contour.push(contour[0], contour[1]);
					}

					positions[p++] = contour = [prev_x = data[d++], prev_y = data[d++]];

					break;
				case GraphicsPathCommand.LINE_TO:
					end_x = data[d++];
					end_y = data[d++];

					if (this._minimumCheck(prev_x - end_x, prev_y - end_y))
						break;

					contour.push(prev_x = end_x, prev_y = end_y);
					break;
				case GraphicsPathCommand.CURVE_TO:
					ctrl_x = data[d++];
					ctrl_y = data[d++];
					end_x = data[d++];
					end_y = data[d++];

					if (this._minimumCheck(ctrl_x - end_x, ctrl_y - end_y)) {
						// if all points are less than miniumum draw distance, ignore
						if (this._minimumCheck(prev_x - end_x, prev_y - end_y))
							break;

						//if control is end, substitute lineTo command
						contour.push(prev_x = end_x, prev_y = end_y);
						break;
					} else if (this._minimumCheck(prev_x - ctrl_x, prev_y - ctrl_y)) {
						//if prev point is control, substitute lineTo command
						contour.push(prev_x = end_x, prev_y = end_y);
						break;
					}

					GraphicsFactoryHelper.tesselateCurve(
						prev_x, prev_y,
						ctrl_x, ctrl_y,
						prev_x = end_x, prev_y = end_y,
						contour, false,
						0, qualityScale
					);

					break;
				case GraphicsPathCommand.CUBIC_CURVE:
					ctrl_x = data[d++];
					ctrl_y = data[d++];
					ctrl_x2 = data[d++];
					ctrl_y2 = data[d++];
					end_x = data[d++];
					end_y = data[d++];

					if (this._minimumCheck(ctrl_x2 - end_x, ctrl_y2 - end_y)) {
						if (this._minimumCheck(ctrl_x - end_x, ctrl_y - end_y)) {
							// if all points are less than miniumum draw distance, ignore
							if (this._minimumCheck(prev_x - end_x, prev_y - end_y))
								break;

							//if control and control2 are end, substitute lineTo command
							contour.push(prev_x = end_x, prev_y = end_y);
							break;
						} else if (this._minimumCheck(prev_x - ctrl_x, prev_y - ctrl_y)) {
							//if prev point is control and control2 is end, substitute lineTo command
							contour.push(prev_x = end_x, prev_y = end_y);
							break;
						}

						//if control2 is end substitute curveTo command
						GraphicsFactoryHelper.tesselateCurve(
							prev_x, prev_y,
							ctrl_x, ctrl_y,
							prev_x = end_x, prev_y = end_y,
							contour, false,
							0, qualityScale
						);
						break;
					} else if (this._minimumCheck(ctrl_x - ctrl_x2, ctrl_y - ctrl_y2)) {
						if (this._minimumCheck(prev_x - ctrl_x2, prev_y - ctrl_y2)) {
							//if prev point and control are control2, substitute lineTo command
							contour.push(prev_x = end_x, prev_y = end_y);
							break;
						}

						//if control is control2 substitute curveTo command
						GraphicsFactoryHelper.tesselateCurve(
							prev_x, prev_y,
							ctrl_x, ctrl_y,
							prev_x = end_x, prev_y = end_y,
							contour, false,
							0, qualityScale
						);

						contour.push(prev_x = end_x, prev_y = end_y);
						break;
					} else if (this._minimumCheck(prev_x - ctrl_x, prev_y - ctrl_y)) {
						//if prev point is control, substitute curveTo command
						GraphicsFactoryHelper.tesselateCurve(
							prev_x, prev_y,
							ctrl_x2, ctrl_y2,
							prev_x = end_x, prev_y = end_y,
							contour, false,
							0, qualityScale
						);
						break;
					}

					//console.log("CURVE_TO ", i, ctrl_x, ctrl_y, end_x, end_y);
					GraphicsFactoryHelper.tesselateCubicCurve(
						prev_x, prev_y,
						ctrl_x, ctrl_y,
						ctrl_x2, ctrl_y2,
						prev_x = end_x, prev_y = end_y,
						contour,
						0, qualityScale
					);
					break;
			}
		}
	}

	public invalidate() {
		this._orientedBoxBoundsDirty = true;
		this._dirtyID++;
	}

	public getBoxBounds(matrix3D: Matrix3D = null, cache: Box = null, target: Box = null): Box {
		if (matrix3D) return this._internalGetBoxBounds(matrix3D, cache, target);

		if (this._orientedBoxBoundsDirty) {
			this._orientedBoxBoundsDirty = false;

			this._orientedBoxBounds = this._internalGetBoxBounds(null, this._orientedBoxBounds, null);
		}

		if (this._orientedBoxBounds != null) target = this._orientedBoxBounds.union(target, target || cache);

		return target;
	}

	private _internalGetBoxBounds(matrix3D: Matrix3D = null, cache: Box = null, target: Box = null): Box {
		let minX: number = 0,
			minY: number = 0;
		let maxX: number = 0,
			maxY: number = 0;

		const len: number = this._positions.length;

		if (len == 0) return target;

		let i: number = 0;
		let index: number = 0;
		let positions: number[] = this._positions[index++];
		let pLen: number = positions.length;
		let pos1: number, pos2: number, rawData: Float32Array;

		if (matrix3D) rawData = matrix3D._rawData;

		if (target == null) {
			target = cache || new Box();
			if (matrix3D) {
				pos1 = positions[i] * rawData[0] + positions[i + 1] * rawData[4] + rawData[12];
				pos2 = positions[i] * rawData[1] + positions[i + 1] * rawData[5] + rawData[13];
			} else {
				pos1 = positions[i];
				pos2 = positions[i + 1];
			}

			maxX = minX = pos1;
			maxY = minY = pos2;
			i += 2;
		} else {
			maxX = (minX = target.x) + target.width;
			maxY = (minY = target.y) + target.height;
		}

		for (; i < pLen; i += 2) {
			if (matrix3D) {
				pos1 = positions[i] * rawData[0] + positions[i + 1] * rawData[4] + rawData[12];
				pos2 = positions[i] * rawData[1] + positions[i + 1] * rawData[5] + rawData[13];
			} else {
				pos1 = positions[i];
				pos2 = positions[i + 1];
			}

			if (pos1 < minX) minX = pos1;
			else if (pos1 > maxX) maxX = pos1;

			if (pos2 < minY) minY = pos2;
			else if (pos2 > maxY) maxY = pos2;

			if (i >= pLen - 2 && index < len) {
				i = 0;
				positions = this._positions[index++];
				pLen = positions.length;
			}
		}

		target.width = maxX - (target.x = minX);
		target.height = maxY - (target.y = minY);
		target.depth = 0;

		return target;
	}

	private static lensq = Settings.MINIMUM_DRAWING_DISTANCE * Settings.MINIMUM_DRAWING_DISTANCE;

	private _minimumCheck(lenx: number, leny: number): boolean {
		return (lenx * lenx + leny * leny) < GraphicsPath.lensq;
	}
}
