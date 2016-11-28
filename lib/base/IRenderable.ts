import {IAsset} from "@awayjs/core";

import {IMaterial} from "../base/IMaterial";
import {Style} from "../base/Style";

/**
 * IRenderable provides an interface for objects that can use materials.
 *
 * @interface away.base.IRenderable
 */
export interface IRenderable extends IAsset
{
	material:IMaterial;

	/**
	 *
	 */
	style:Style;

	invalidateMaterial();

	invalidateElements();
}