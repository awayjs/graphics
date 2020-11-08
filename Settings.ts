type tShapeEntry = {FILLS: boolean, STROKES: boolean};

export interface IGraphicsSettings {
	ALLOW_INTERNAL_POOL: tShapeEntry,
	CLEARS_BEFORE_POOLING: number,
	ALLOW_COMBINER: tShapeEntry
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
		STROKES: false,
	}
};