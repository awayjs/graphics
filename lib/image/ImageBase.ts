import {AssetBase} from "@awayjs/core";

import {ImageEvent} from "../events/ImageEvent";
import {MapperBase} from "../mappers/MapperBase";

export class ImageBase extends AssetBase
{
	private _mapper:MapperBase;

	public _pFormat:string = "bgra";

	public set mapper(value:MapperBase)
	{
		if (this._mapper == value)
			return;

        this._mapper = value;

        this.invalidateMapper();
	}

	public get mapper():MapperBase
	{
		return this._mapper;
	}

	/**
	 *
	 */
	constructor()
	{
		super();
	}

	/**
	 *
	 * @returns {string}
	 */
	public get format():string
	{
		return this._pFormat;
	}

	/**
	 *
	 */
	public invalidateMipmaps():void
	{
		this.dispatchEvent(new ImageEvent(ImageEvent.INVALIDATE_MIPMAPS, this));
	}

    /**
     *
     */
    public invalidateMapper():void
    {
        this.dispatchEvent(new ImageEvent(ImageEvent.INVALIDATE_MAPPER, this));
    }
}