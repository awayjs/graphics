import { IFillStyle, IStyleData } from './IGraphicsData';

export class GraphicsFillStyle <T extends IFillStyle> implements IStyleData {
	public static data_type: string = '[graphicsdata FillStyle]';

	constructor(
		public fillStyle: T
	) {}

	public get data_type(): string {
		return GraphicsFillStyle.data_type;
	}
}