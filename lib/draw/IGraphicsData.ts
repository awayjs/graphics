import { Matrix } from '@awayjs/core';
/**
 * This interface is used to define objects that can be used as parameters in the
 * <code>away.base.Graphics</code> methods, including fills, strokes, and paths. Use
 * the implementor classes of this interface to create and manage drawing property
 * data, and to reuse the same data for different instances. Then, use the methods of
 * the Graphics class to render the drawing objects.
 *
 * @see away.base.Graphics.drawGraphicsData()
 * @see away.base.Graphics.readGraphicsData()
 */
export interface IGraphicsData
{
	data_type: string;
}

export interface IFillStyle extends IGraphicsData {
	getUVMatrix(): Matrix;
}

export interface IStyleData extends IGraphicsData {
	fillStyle: IFillStyle;
}
