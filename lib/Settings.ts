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
	POINTS_COUNT_FOR_CONVEX: number;
}

export const Settings: IGraphicsSettings = {
	/**
	 * @description Enable internal shape pooling for Graphics.
	 * Used for reduce shape rebuilding after clear - filling phases.
	 */
	ALLOW_INTERNAL_POOL: {
		// Fills not support yet
		FILLS: false,
		STROKES: true,
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
	ENABLE_CONVEX_BOUNDS: true,

	/**
	 * @description Threshold for points count, that enable a hull generator
	 */
	POINTS_COUNT_FOR_CONVEX: 10,
};