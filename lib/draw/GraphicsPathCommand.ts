/**
 * Defines the values to use for specifying path-drawing commands.
 * The values in this class are used by the Graphics.drawPath() method,
 *or stored in the commands vector of a GraphicsPath object.
 */
export enum GraphicsPathCommand {
	/**
	 * Represents the default "do nothing" command.
	 */
	NO_OP = 0,
	/**
	 * Specifies a drawing command that moves the current drawing position
	 * to the x- and y-coordinates specified in the data vector.
	 */
	MOVE_TO = 1,

	/**
	 * Specifies a drawing command that draws a line from the current drawing position
	 * to the x- and y-coordinates specified in the data vector.
	 */
	LINE_TO = 2,

	/**
	 *  Specifies a drawing command that draws a curve from the current drawing position
	 *  to the x- and y-coordinates specified in the data vector, using a control point.
	 */
	CURVE_TO = 3,
	/**
	 *  Specifies a drawing command that draws a curve from the current drawing position
	 *  to the x- and y-coordinates specified in the data vector, using a control point.
	 */
	BUILD_JOINT 		= 13,
	BUILD_ROUND_JOINT 	= 14,

	/**
	 * Specifies a "line to" drawing command,
	 * but uses two sets of coordinates (four values) instead of one set.
	 */
	WIDE_LINE_TO = 4,

	/**
	 *   Specifies a "move to" drawing command,
	 *   but uses two sets of coordinates (four values) instead of one set.
	 */
	WIDE_MOVE_TO = 5,

	/**
	 * Specifies a drawing command that draws a curve from the current drawing position
	 * to the x- and y-coordinates specified in the data vector, using 2 control points.
	 */
	CUBIC_CURVE = 6,
}