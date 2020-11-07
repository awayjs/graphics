export interface IGraphicsSettings {
	ALLOW_INTERNAL_POOL: {
		FILLS: boolean,
		STROKES: boolean;
	},
	CLEARS_BEFORE_POOLING: number
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
};