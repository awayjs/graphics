import {Single2DTexture} from "./Single2DTexture";

export class VideoTexture extends Single2DTexture
{
	public static assetType:string = "[texture VideoTexture]";

	/**
	 *
	 * @returns {string}
	 */
	public get assetType():string
	{
		return Single2DTexture.assetType;
	}



	constructor()
	{
		super();

	}
}