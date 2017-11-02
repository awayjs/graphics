import {AbstractMethodError, AssetBase, ProjectionBase} from "@awayjs/core";

import {IRenderer} from "../base/IRenderer";
import {IView} from "../base/IView";
import {TextureBase} from "../textures/TextureBase";

export class MapperBase extends AssetBase
{
	protected _textureMap:TextureBase;

	public autoUpdate:boolean = true;

	public get textureMap():TextureBase
	{
		return this._textureMap;
	}

	public update(projection:ProjectionBase, view:IView, rootRenderer:IRenderer):void
	{
		this._updateProjection(projection);

		this._renderMap(view, rootRenderer._getSubRenderer(this));
	}

	protected _updateProjection(projection:ProjectionBase):void
	{
		throw new AbstractMethodError();
	}

	protected _renderMap(view:IView, renderer:IRenderer):void
	{
		throw new AbstractMethodError();
	}
}