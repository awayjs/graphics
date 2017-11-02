import {AbstractMethodError, ProjectionBase} from "@awayjs/core";

import {IRenderer} from "../base/IRenderer";
import {IView} from "../base/IView";
import {TextureBase} from "../textures/TextureBase";
import {LightBase} from "../lights/LightBase";

import {MapperBase} from "./MapperBase";

export class ShadowMapperBase extends MapperBase
{
	protected _size:number;
	protected _light:LightBase;

	public get light():LightBase
	{
		return this._light;
	}

	public set light(value:LightBase)
	{
		if (this._light == value)
			return;

		this._light = value;
	}

    public get size():number
    {
        return this._size;
    }

    public set size(value:number)
    {
    	if (this._size == value)
    		return;

        this._size = value;

        this._updateSize();
    }

    protected _updateSize()
	{
		throw new AbstractMethodError();
	}

    public dispose():void
    {
        this._light = null;
    }
}