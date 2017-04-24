import {AssetBase} from "@awayjs/core";

import {MappingMode} from "./MappingMode";
import {ImageBase} from "../image/ImageBase";
import {SamplerBase} from "../image/SamplerBase";

/**
 *
 */
export class TextureBase extends AssetBase
{
	protected _mappingMode:MappingMode;

	public _numImages:number = 0;
	public _images:Array<ImageBase> = new Array<ImageBase>();
	public _samplers:Array<SamplerBase> = new Array<SamplerBase>();

	public get mappingMode():MappingMode
	{
		return this._mappingMode;
	}

	public set mappingMode(value:MappingMode)
	{
		if (this._mappingMode == value)
			return;

		this._mappingMode = value;
	}

	/**
	 *
	 */
	constructor()
	{
		super();
	}

	public getNumImages():number
	{
		return this._numImages;
	}

	public setNumImages(value:number):void
	{
		if (this._numImages == value)
			return;

		this._numImages = value;

		this._images.length = value;
		this._samplers.length = value;

		this.invalidate();
	}

	public getImageAt(index:number):ImageBase
	{
		return this._images[index];
	}

	public setImageAt(image:ImageBase, index:number):void
	{
		this._images[index] = image;

		this.invalidate();
	}

	public getSamplerAt(index:number):SamplerBase
	{
		return this._samplers[index];
	}

	public setSamplerAt(sampler:SamplerBase, index:number):void
	{
		this._samplers[index] = sampler;

		this.invalidate();
	}
}