import {Matrix} from "@awayjs/core";

import {IGraphicsData} from "./IGraphicsData";

import {IMaterial} from "@awayjs/renderer";
import { BitmapImage2D } from '@awayjs/stage';

export class BitmapFillStyle implements IGraphicsData
{
    public static data_type:string = "[graphicsdata BitmapFillStyle]";
    /**
     * The Vector of drawing commands as integers representing the path.
     */
    public material:IMaterial;
	public imgWidth:number;
	public imgHeight:number;
	public matrix:Matrix;
	public repeat:boolean;
	public smooth:boolean;

    constructor(material:IMaterial, matrix:Matrix, repeat:boolean,  smooth:boolean)
    {
        this.material=material;
		this.matrix=matrix;
		this.repeat=repeat;
		this.smooth = smooth;
    }

    public get data_type():string
    {
        return BitmapFillStyle.data_type;
    }

	public getUVMatrix():Matrix
	{

		if(!this.matrix)
			this.matrix=new Matrix();
			
		

		let image:BitmapImage2D=(<any>this.material).ambientMethod.texture._images[0];
		if(!image)
			throw("BitmapFillStyle.getUVMatrix - no texture found");
		
		let projection_width_half:number= image.width;
		let projection_height_half:number= image.height;

		//	Get and invert the uv transform:
		let a:number =  this.matrix.a;
		let b:number =  this.matrix.b;
		let c:number =  this.matrix.c;
		let d:number =  this.matrix.d;
		let tx:number =  this.matrix.tx;
		let ty:number =  this.matrix.ty;

		let a_inv:number =  d / (a*d - b*c);
		let b_inv:number =  -b / (a*d - b*c);
		let c_inv:number =  -c / (a*d - b*c);
		let d_inv:number =  a / (a*d - b*c);
		let tx_inv:number =  (c*ty - d*tx)/(a*d - b*c);
		let ty_inv:number =  -(a*ty - b*tx)/(a*d - b*c);

		this.matrix.a=a_inv / projection_width_half;
		this.matrix.b=b_inv / projection_height_half;
		this.matrix.c= c_inv / projection_width_half;
		this.matrix.d=d_inv / projection_height_half;
		this.matrix.tx=tx_inv / projection_width_half;
		this.matrix.ty=ty_inv / projection_height_half;

		return this.matrix;
	}
}