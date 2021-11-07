import { ConfigManager }  from '@awayjs/core';

type tShapeEntry = {
	FILLS: boolean,
	STROKES: boolean,
};

export interface IGraphicsSettings {
	ALLOW_INTERNAL_POOL: tShapeEntry;
	CLEARS_BEFORE_POOLING: number;
	ALLOW_COMBINER: tShapeEntry;

	USE_NATIVE_DEFLATE: boolean;
	MINIMUM_DRAWING_DISTANCE: number;

	EXPEREMENTAL_MATERIAL_FOR_IMAGE: boolean;

	CURVE_TESSELATION_COUNT: number;

	SMOOTH_BITMAP_FILL_DEFAULT: boolean;
}

export const Settings: IGraphicsSettings = ConfigManager.instance.addStore<any>('graphics',{
	/**
	 * @description Enable internal shape pooling for Graphics.
	 * Used for reduce shape rebuilding after clear - filling phases.
	 */
	ALLOW_INTERNAL_POOL: {
		FILLS: false,
		STROKES: false,
	},
	/**
	 * @description How many clears required for caching a shapes
	 */
	CLEARS_BEFORE_POOLING: 10,

	/**
	 * @description Tryed to combine Pathes to one shape
	 */
	ALLOW_COMBINER: {
		FILLS: true,
		// Strokes not support yet
		STROKES: false,
	},

	/**
	 * @description Try to use native deflate (Chrome and FF, Sufari suckings again)
	 */
	USE_NATIVE_DEFLATE: true,

	/**
	 * @description The minimun distance a lineTo or curveTo must travel to be considered a valid command
	 * if the condition is not matched, the command will be ignored,
	 * and the previous command upated to point to the new position
	 */
	MINIMUM_DRAWING_DISTANCE: 0.01,

	/**
	 * @description How many maximal passes can be used for tesselationg a curves
	 */
	CURVE_TESSELATION_COUNT: 6,

	/**
	 * @description Use experemental material for Shapes based from ImageBitmap2D
	 */
	EXPEREMENTAL_MATERIAL_FOR_IMAGE: true,

	/**
	 * @description Smooth = true for default bitmap style
	 */
	SMOOTH_BITMAP_FILL_DEFAULT: false,

});