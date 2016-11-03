import {IAsset}						from "@awayjs/core/lib/library/IAsset";

import {IAnimationSet}				from "../animators/IAnimationSet";
import {TextureBase}					from "../textures/TextureBase";

import {IRenderable}					from "./IRenderable";
import {Style}						from "./Style";

/**
 * ISurface provides an interface for objects that define the properties of a renderable's surface.
 *
 * @interface away.base.ISurface
 */
export interface IMaterial extends IAsset
{
	alphaThreshold:number;

	style:Style;

	curves:boolean;

	imageRect:boolean;

	blendMode:string;

	animationSet:IAnimationSet;

	iOwners:Array<IRenderable>;

	getNumTextures():number;

	getTextureAt(index:number):TextureBase;

	addTexture(texture:TextureBase);

	removeTexture(texture:TextureBase);
}