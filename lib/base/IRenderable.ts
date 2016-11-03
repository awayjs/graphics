import {IAsset}						from "@awayjs/core/lib/library/IAsset";

import {IAnimator}					from "../animators/IAnimator";
import {Style}						from "../base/Style";

/**
 * IRenderable provides an interface for objects that can use materials.
 *
 * @interface away.base.IRenderable
 */
export interface IRenderable extends IAsset
{
	/**
	 * The animation used by the material owner to assemble the vertex code.
	 */
	animator:IAnimator;

	/**
	 *
	 */
	style:Style;

	invalidateSurface();

	invalidateElements();

	/**
	 * //TODO
	 *
	 * @param shortestCollisionDistance
	 * @param findClosest
	 * @returns {boolean}
	 *
	 * @internal
	 */
	//_iTestCollision(pickingCollision:PickingCollision, pickingCollider:IPickingCollider):boolean;
}