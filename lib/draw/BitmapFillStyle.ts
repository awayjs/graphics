import {Matrix} from "@awayjs/core";

import {IGraphicsData} from "./IGraphicsData";

import {IMaterial} from "@awayjs/renderer";

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

    constructor(material:IMaterial, matrix:Matrix, repeat:boolean,  smooth:boolean)
    {
        this.material=material;
        this.matrix=matrix;
    }

    public get data_type():string
    {
        return BitmapFillStyle.data_type;
    }

	public getUVMatrix():Matrix
	{

		if(!this.matrix){
			this.matrix=new Matrix();
		}
		// console.log(this.uvRectangle);
		// console.log(this.matrix);
		// todo: this is ported from exporter-cpp code
		// probably a lot to optimize here

		var projection_width:number= (<any>this.material).ambientMethod.texture._images[0].width*2;
		var projection_height:number=(<any>this.material).ambientMethod.texture._images[0].height*2;

		var projection_width_half:number= projection_width * 0.5;
		var projection_height_half:number= projection_height * 0.5;

		//	Get and invert the uv transform:
		var a:number =  this.matrix.a/20;
		var b:number =  this.matrix.b/20;
		var c:number =  this.matrix.c/20;
		var d:number =  this.matrix.d/20;
		var tx:number =  this.matrix.tx;
		var ty:number =  this.matrix.ty;

		var a_inv:number =  d / (a*d - b*c);
		var b_inv:number =  -b / (a*d - b*c);
		var c_inv:number =  -c / (a*d - b*c);
		var d_inv:number =  a / (a*d - b*c);
		var tx_inv:number =  (c*ty - d*tx)/(a*d - b*c);
		var ty_inv:number =  -(a*ty - b*tx)/(a*d - b*c);

		this.matrix.a=a_inv / projection_width_half;
		this.matrix.b=c_inv / projection_width_half;
		this.matrix.c=b_inv / projection_height_half;
		this.matrix.d=d_inv / projection_height_half;
		this.matrix.tx=tx_inv / projection_width_half;
		this.matrix.ty=ty_inv / projection_height_half;

		return this.matrix;
	}
}