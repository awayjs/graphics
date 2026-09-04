import { IGraphicsData } from './IGraphicsData';

/**
 * Indicates the end of a graphics fill. Matching Adobe's GraphicsEndFill,
 * this is submitted to Graphics.drawGraphicsData() and returned from
 * Graphics.readGraphicsData().
 */
export class GraphicsEndFill implements IGraphicsData {
	public static readonly data_type: string = '[graphicsdata EndFill]';

	public get data_type(): string {
		return GraphicsEndFill.data_type;
	}
}
