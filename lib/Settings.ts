type tShapeEntry = {
	FILLS: boolean,
	STROKES: boolean,
};

export interface IGraphicsSettings {
	ALLOW_INTERNAL_POOL: tShapeEntry;
	CLEARS_BEFORE_POOLING: number;
	ALLOW_COMBINER: tShapeEntry;
	ALLOW_VAO: boolean;

	ENABLE_CONVEX_BOUNDS: boolean;
	CONVEX_MIN_REQUIEST_FOR_BUILD: number;
	POINTS_COUNT_FOR_CONVEX: number;
	USE_NATIVE_DEFLATE: boolean;
	MINIMUM_DRAWING_DISTANCE: number;

	EXPEREMENTAL_MATERIAL_FOR_IMAGE: boolean;
}

export const Settings: IGraphicsSettings = {
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
	 * @description Allow vao for elements
	 */
	ALLOW_VAO: true,

	/**
	 * @description Enable construct a approximation convex for triangle element.
	 */
	ENABLE_CONVEX_BOUNDS: false,

	/**
	 * @description Run convex filling after bounds N requiest, 0 - immedate when any bounds requested
	 */
	CONVEX_MIN_REQUIEST_FOR_BUILD: 10,
	/**
	 * @description Threshold for points count, that enable a hull generator
	 */
	POINTS_COUNT_FOR_CONVEX: 10,

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
	 * @description Use experemental material for Shapes based from ImageBitmap2D
	 */
	EXPEREMENTAL_MATERIAL_FOR_IMAGE: true
};