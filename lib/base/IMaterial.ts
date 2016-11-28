import {IAsset} from "@awayjs/core";

import {IAnimationSet} from "../animators/IAnimationSet";
import {TextureBase} from "../textures/TextureBase";

import {IEntity} from "./IEntity";
import {Style} from "./Style";

/**
 * ISurface provides an interface for objects that define the properties of a renderable's surface.
 *
 * @interface away.base.ISurface
 */
export interface IMaterial extends IAsset
{
	bothSides:boolean;

	alphaThreshold:number;

	style:Style;

	curves:boolean;

	imageRect:boolean;

	animateUVs:boolean;

	blendMode:string;

	animationSet:IAnimationSet;

	iOwners:Array<IEntity>;

	getNumTextures():number;

	getTextureAt(index:number):TextureBase;

	addTexture(texture:TextureBase);

	removeTexture(texture:TextureBase);

	iAddOwner(owner:IEntity);

	iRemoveOwner(owner:IEntity);
}