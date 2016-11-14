import {AssetBase}					from "@awayjs/core/lib/library/AssetBase";

export class ImageBase extends AssetBase
{
	public _pFormat:string = "bgra";

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
}