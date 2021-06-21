import { LineScaleMode } from '@awayjs/renderer';

import { IStyleData } from './IGraphicsData';
import { JointStyle } from './JointStyle';
import { CapsStyle } from './CapsStyle';

export class GraphicsStrokeStyle implements IStyleData {
	public static readonly data_type: string = '[graphicsdata StrokeStyle]';
	public readonly baseStyle = this;

	constructor(
		private _color = 0xffffff,
		private _alpha = 1,
		private _thickness = 10,
		private _jointstyle = JointStyle.ROUND,
		private _capstyle = CapsStyle.SQUARE,
		private _miter_limit: number = 10,
		public  scaleMode: LineScaleMode = LineScaleMode.NORMAL
	) {}

	public get data_type(): string {
		return GraphicsStrokeStyle.data_type;
	}

	public get color(): number {
		return this._color;
	}

	public set color(value: number) {
		this._color = value;
	}

	public get alpha(): number {
		return this._alpha;
	}

	public set alpha(value: number) {
		this._alpha = value;
	}

	public get half_thickness(): number {
		return this._thickness / 2;
	}

	public get thickness(): number {
		return this._thickness;
	}

	public set thickness(value: number) {
		this._thickness = value;
	}

	public get jointstyle(): number {
		return this._jointstyle;
	}

	public set jointstyle(value: number) {
		this._jointstyle = value;
	}

	public get miter_limit(): number {
		return this._miter_limit;
	}

	public set miter_limit(value: number) {

		this._miter_limit = value;
	}

	public get capstyle(): number {
		return this._capstyle;
	}

	public set capstyle(value: number) {
		this._capstyle = value;
	}
}