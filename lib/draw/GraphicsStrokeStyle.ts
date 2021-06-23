import { LineScaleMode } from '@awayjs/renderer';

import { IFillStyle, IStyleData } from './IGraphicsData';
import { JointStyle } from './JointStyle';
import { CapsStyle } from './CapsStyle';

export class GraphicsStrokeStyle <T extends IFillStyle> implements IStyleData {
	public static readonly data_type: string = '[graphicsdata StrokeStyle]';

	constructor(
		public fillStyle: T,
		public  thickness = 10,
		public  jointstyle = JointStyle.ROUND,
		public  capstyle = CapsStyle.SQUARE,
		public  miterLimit: number = 10,
		public  scaleMode: LineScaleMode = LineScaleMode.NORMAL
	) {}

	public get half_thickness(): number {
		return this.thickness / 2;
	}

	public get data_type(): string {
		return GraphicsStrokeStyle.data_type;
	}
}