import {Matrix3D, ErrorBase} from "@awayjs/core";

import {TraverserBase} from "../base/TraverserBase";
import {IEntity} from "../base/IEntity";
import {ImageCube} from "../image/ImageCube";
import {SamplerCube} from "../image/SamplerCube";

import {LightBase} from "./LightBase";

export class LightProbe extends LightBase
{
	public static assetType:string = "[light LightProbe]";

	public diffuseMap:ImageCube;

	public diffuseSampler:SamplerCube = new SamplerCube();

	public specularMap:ImageCube;

	public specularSampler:SamplerCube = new SamplerCube();


    public get assetType():string
    {
        return LightProbe.assetType;
    }

	constructor(diffuseMap:ImageCube, specularMap:ImageCube = null)
	{
		super();

		this.diffuseMap = diffuseMap;
		this.specularMap = specularMap;
	}

	//@override
	public _getEntityProjectionMatrix(entity:IEntity, cameraTransform:Matrix3D, target:Matrix3D = null):Matrix3D
	{
		throw new ErrorBase("Object projection matrices are not supported for LightProbe objects!");
	}
}