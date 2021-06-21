import { IStyleData } from './IGraphicsData';

export class GraphicsFillStyle implements IStyleData {
	public static data_type: string = '[graphicsdata FillStyle]';
	public readonly baseStyle = this;

	constructor(
		public color: number = 0xffffff,
		public alpha: number = 1) {}

	public get data_type(): string {
		return GraphicsFillStyle.data_type;
	}
}