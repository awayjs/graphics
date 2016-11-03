import {IAsset}					from "@awayjs/core/lib/library/IAsset";

import {IAnimationSet}			from "../animators/IAnimationSet";
import {Graphics}					from "../Graphics";

/**
 * Provides an interface for animator classes that control animation output from a data set subtype of <code>AnimationSetBase</code>.
 *
 * @see away.animators.IAnimationSet
 */
export interface IAnimator extends IAsset
{
	/**
	 *
	 */
	animationSet:IAnimationSet;

	/**
	 *
	 */
	clone():IAnimator;

	/**
	 *
	 */
	dispose();

	/**
	 * Used by the graphics object to which the animator is applied, registers the owner for internal use.
	 *
	 * @private
	 */
	addOwner(graphics:Graphics);

	/**
	 * Used by the graphics object from which the animator is removed, unregisters the owner for internal use.
	 *
	 * @private
	 */
	removeOwner(graphics:Graphics);
}