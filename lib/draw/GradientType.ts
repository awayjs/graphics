/**
 * The GradientType class provides values for the <code>type</code> parameter
 * in the <code>beginGradientFill()</code> and
 * <code>lineGradientStyle()</code> methods of the flash.display.Graphics
 * class.
 */
export enum GradientType
	{
	/**
	 * Value used to specify a linear gradient fill.
	 */
	LINEAR = 'linear',

	/**
	 * Value used to specify a radial gradient fill.
	 */
	RADIAL = 'radial'
}