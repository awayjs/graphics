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
	 * When path is morp, we can't filtrate commands
	 */
	public morphSource: boolean = false;

	/**
	 * The Vector of drawing commands as integers representing the path.
	 */
	public _commands: number[][] = [];
	public pretesselatedBuffer?: Float32Array;

	/**
	 * The Vector of Numbers containing the parameters used with the drawing commands.
	 */
	public _data: number[][] = [];
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

	private _startPoint: Point = new Point();
	private _cur_point: Point = new Point();
	private _style: IStyleData;

	private _lastDirtyID = 0;
	private _dirtyID = -1;

	public get dirty() {
		return this._lastDirtyID !== this._dirtyID;
	}

	constructor(
		commands: number[] = null,
		data: number[] = null,

		/**
		 * Specifies the winding rule using a value defined in the GraphicsPathWinding class.
		 */
		public winding: string = GraphicsPathWinding.EVEN_ODD,
	) {
		this._style = null;
		this._positions = [];

		if (commands != null && data != null) {
			this._data[0] = data;
			this._commands[0] = commands;
		} else {
			this._data[0] = [];
			this._commands[0] = [];
		}
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

	public get commands(): Array<Array<number>> {
		return this._commands;
	}

	public get data(): Array<Array<number>> {
		return this._data;
	}

	public curveTo(controlX: number, controlY: number, anchorX: number, anchorY: number) {

		// if controlpoint and anchor are same, we add lineTo command
		if (controlX == anchorX && controlY == anchorY) {
			this.lineTo(controlX, controlY);
			//this.moveTo(anchorX, anchorY);
			return;
		}
		// if anchor is current point, but controlpoint is different, we lineto controlpoint
		if (
			this._cur_point.x == anchorX &&
			this._cur_point.y == anchorY &&
			(this._cur_point.x != controlX || this._cur_point.y != controlY)
		) {
			this.lineTo(controlX, controlY);
			this.moveTo(anchorX, anchorY);
			return;
		}
		// if controlpoint is current point, but anchor is different, we lineto anchor
		if (
			(this._cur_point.x != anchorX || this._cur_point.y != anchorY) &&
			this._cur_point.x == controlX &&
			this._cur_point.y == controlY
		) {
			this.lineTo(anchorX, anchorY);
			return;
		}
		// if controlpoint and anchor are same as current point
		if (
			this._cur_point.x == anchorX &&
			this._cur_point.y == anchorY &&
			this._cur_point.x == controlX &&
			this._cur_point.y == controlY
		) {
			//console.log("curveTo command not added because startpoint and endpoint are the same.");
			this.lineTo(anchorX, anchorY);
			return;
		}

		const command = this._commands[this._commands.length - 1];
		const data = this._data[this._data.length - 1];

		if (command.length == 0) {
			// every contour must start with a moveTo command, so we make sure we have correct startpoint
			command.push(GraphicsPathCommand.MOVE_TO);
			data.push(this._cur_point.x, this._cur_point.y);
		}

		if (!this.morphSource) {
			const lenx = anchorX - this._cur_point.x;
			const leny = anchorY - this._cur_point.y;
			const len = Math.sqrt(lenx * lenx + leny * leny);
			if (len <= Settings.MINIMUM_DRAWING_DISTANCE) {
				data[data.length - 2] = anchorX;
				data[data.length - 1] = anchorY;
				return;
			}
		}

		command.push(GraphicsPathCommand.CURVE_TO);
		data.push(controlX, controlY, anchorX, anchorY);
		this._cur_point.x = anchorX;
		this._cur_point.y = anchorY;

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


		// if controlpoint and anchor are same, we add lineTo command
		if (controlX == anchorX && controlY == anchorY) {
			this.lineTo(controlX, controlY);
			//this.moveTo(anchorX, anchorY);
			return;
		}
		// if anchor is current point, but controlpoint is different, we lineto controlpoint
		if (
			this._cur_point.x == anchorX &&
			this._cur_point.y == anchorY &&
			(this._cur_point.x != controlX || this._cur_point.y != controlY)
		) {
			this.lineTo(controlX, controlY);
			this.moveTo(anchorX, anchorY);
			return;
		}
		// if controlpoint is current point, but anchor is different, we lineto anchor
		if (
			(this._cur_point.x != anchorX || this._cur_point.y != anchorY) &&
			this._cur_point.x == controlX &&
			this._cur_point.y == controlY
		) {
			this.lineTo(anchorX, anchorY);
			return;
		}
		// if controlpoint and anchor are same as current point
		if (
			this._cur_point.x == anchorX &&
			this._cur_point.y == anchorY &&
			this._cur_point.x == controlX &&
			this._cur_point.y == controlY
		) {
			//console.log("curveTo command not added because startpoint and endpoint are the same.");
			this.lineTo(anchorX, anchorY);
			return;
		}

		const command = this._commands[this._commands.length - 1];
		const data = this._data[this._data.length - 1];

		if (command.length == 0) {
			// every contour must start with a moveTo command, so we make sure we have correct startpoint
			command.push(GraphicsPathCommand.MOVE_TO);
			data.push(this._cur_point.x, this._cur_point.y);
		}

		if (!this.morphSource) {
			const lenx = anchorX - this._cur_point.x;
			const leny = anchorY - this._cur_point.y;
			const lensq = lenx * lenx + leny * leny;

			if (lensq <= Settings.MINIMUM_DRAWING_DISTANCE * Settings.MINIMUM_DRAWING_DISTANCE) {
				data[data.length - 2] = anchorX;
				data[data.length - 1] = anchorY;
				return;
			}
		}

		command.push(GraphicsPathCommand.CUBIC_CURVE);
		data.push(controlX, controlY, control2X, control2Y, anchorX, anchorY);
		this._cur_point.x = anchorX;
		this._cur_point.y = anchorY;

		this._dirtyID++;
	}

	public lineTo(x: number, y: number) {
		const command = this._commands[this._commands.length - 1];
		const data = this._data[this._data.length - 1];

		if (command.length == 0) {
			// every contour must start with a moveTo command, so we make sure we have correct startpoint
			command.push(GraphicsPathCommand.MOVE_TO);
			data.push(this._cur_point.x, this._cur_point.y);
		}

		if (!this.morphSource) {
			const lenx = x - this._cur_point.x;
			const leny = y - this._cur_point.y;
			const lensq = lenx * lenx + leny * leny;

			if (lensq <= Settings.MINIMUM_DRAWING_DISTANCE * Settings.MINIMUM_DRAWING_DISTANCE) {
				data[data.length - 2] = x;
				data[data.length - 1] = y;
				return;
			}
		}

		command.push(GraphicsPathCommand.LINE_TO);
		data.push(x, y);

		this._cur_point.x = x;
		this._cur_point.y = y;

		this._dirtyID++;
	}

	public moveTo(x: number, y: number) {
		// whenever a moveTo command appears, we start a new contour
		if (this._commands[this._commands.length - 1].length > 0) {
			this._commands.push([GraphicsPathCommand.MOVE_TO]);
			this._data.push([x, y]);
		}
		this._startPoint.x = x;
		this._startPoint.y = y;
		this._cur_point.x = x;
		this._cur_point.y = y;

		this._dirtyID++;
	}

	public wideLineTo(_x: number, _y: number) { }

	public wideMoveTo(_x: number, _y: number) { }

	private _connectedIdx: number[][] = [];
	private _positionOffset: number[][] = [];
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

		const isValidCommand: number[][] = [];
		const contour_merged: boolean[] = [];
		const k: number = 0;

		let data_cnt: number = 0;
		let prev_x,
			prev_y,
			end_x,
			end_y,
			ctrl_x,
			ctrl_y,
			ctrl_x2,
			ctrl_y2: number = 0;
		let curve_verts: number[];
		let cmd_len = this.commands.length;

		// commands may be empty
		if (cmd_len === 1 && !this.commands[0]) {
			return false;
		}

		const eps = 1 / (100 * qualityScale);

		for (let c = 0; c < cmd_len; c++) {
			const commands = this.commands[c];
			const data = this.data[c];

			this._positions[c] = [];
			this._connectedIdx[c] = [];
			this._positionOffset[c] = [];

			contour_merged[c] = false;

			isValidCommand[c] = [];

			if (c == commands.length - 1 && this.forceClose) {
				// check if the last path is closed.
				// if its not closed, we optionally close it by adding the extra lineTo-cmd
				if (Math.abs(data[0] - data[data.length - 2]) + Math.abs(data[1] - data[data.length - 1]) > eps) {
					commands[commands.length] = GraphicsPathCommand.LINE_TO;
					data[data.length] = data[0];
					data[data.length] = data[1];
				}
			}
		}

		cmd_len = this.commands.length;
		for (let c = 0; c < cmd_len; c++) {
			const commands = this.commands[c];
			const data = this.data[c];

			data_cnt = 0;
			prev_x = data[data_cnt++];
			prev_y = data[data_cnt++];
			end_x = 0;
			end_y = 0;
			ctrl_x = 0;
			ctrl_y = 0;

			this._positions[c].push(prev_x);
			this._positions[c].push(prev_y);

			// now we collect the final position data
			// a command list is no longer needed for this position data,
			// we resolve all curves to line segments here

			data_cnt = 0;
			prev_x = data[data_cnt++];
			prev_y = data[data_cnt++];

			for (let i = 1; i < commands.length; i++) {
				switch (commands[i]) {
					case GraphicsPathCommand.MOVE_TO:
						console.log(
							'ERROR ! ONLY THE FIRST COMMAND FOR A CONTOUR IS ALLOWED TO BE A \'MOVE_TO\' COMMAND',
						);
						break;
					case GraphicsPathCommand.LINE_TO:
						end_x = data[data_cnt++];
						end_y = data[data_cnt++];
						//console.log("LINE_TO ", i, end_x, end_y);
						this._positions[c].push(end_x);
						this._positions[c].push(end_y);
						prev_x = end_x;
						prev_y = end_y;
						break;
					case GraphicsPathCommand.CURVE_TO:
						ctrl_x = data[data_cnt++];
						ctrl_y = data[data_cnt++];
						end_x = data[data_cnt++];
						end_y = data[data_cnt++];

						//console.log("CURVE_TO ", i, ctrl_x, ctrl_y, end_x, end_y);
						GraphicsFactoryHelper.tesselateCurve(
							prev_x, prev_y,
							ctrl_x, ctrl_y,
							end_x, end_y,
							this._positions[c], false,
							0, qualityScale
						);

						prev_x = end_x;
						prev_y = end_y;
						break;
					case GraphicsPathCommand.CUBIC_CURVE:
						ctrl_x = data[data_cnt++];
						ctrl_y = data[data_cnt++];
						ctrl_x2 = data[data_cnt++];
						ctrl_y2 = data[data_cnt++];
						end_x = data[data_cnt++];
						end_y = data[data_cnt++];

						//console.log("CURVE_TO ", i, ctrl_x, ctrl_y, end_x, end_y);
						GraphicsFactoryHelper.tesselateCubicCurve(
							prev_x, prev_y,
							ctrl_x, ctrl_y,
							ctrl_x2, ctrl_y2,
							end_x, end_y,
							this._positions[c],
							0, qualityScale
						);

						prev_x = end_x;
						prev_y = end_y;
						break;
				}
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
}
