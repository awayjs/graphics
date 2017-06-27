/*import {IRenderable} from "../base/IRenderable";
import {LineElements} from "../elements/LineElements";
import {Sampler2D} from "../image/Sampler2D";
import {BitmapImageCube} from "../image/BitmapImageCube";
import {MaterialBase} from "../materials/MaterialBase";
import {BasicMaterial} from "../materials/BasicMaterial";
import {Single2DTexture} from "../textures/Single2DTexture";
import {SingleCubeTexture} from "../textures/SingleCubeTexture";
import {Shape} from "../base/Shape";
*/
import {Point, Rectangle} from "@awayjs/core";
import {GradientFillStyle} from "../draw/GradientFillStyle";
import {BitmapImage2D} from "../image/BitmapImage2D";
import {TextureBase} from "../textures/TextureBase";
import {Single2DTexture} from "../textures/Single2DTexture";

export class TextureAtlas
{
	private static _allTextureAtlas:TextureAtlas[]=[];
	private static _allGradients:any={};
	private static _allColors:any={};


	public static getTextureForColor(color:number, alpha):any
	{
		if(TextureAtlas._allColors.hasOwnProperty(color.toString())){
			var textObj=TextureAtlas._allColors[color.toString()];
			return textObj.texture;
			 
		}

		// find textureAtlas that has empty space:
		var t_len:number=TextureAtlas._allTextureAtlas.length;
		var t:number=0;
		var textureAtlas:TextureAtlas;
		var argb:number[];
		for(t=0; t<t_len; t++){
			if(TextureAtlas._allTextureAtlas[t].fit_color()){
				textureAtlas=TextureAtlas._allTextureAtlas[t];
				break;
			}
		}
		if(!textureAtlas){
			textureAtlas=new TextureAtlas();
			TextureAtlas._allTextureAtlas.push(textureAtlas);
		}
		var newColorObj:any={};
		newColorObj.colorPos=textureAtlas.draw_color(color, alpha);
		newColorObj.texture=textureAtlas.texture;

		TextureAtlas._allColors[color.toString()]=newColorObj;
		return newColorObj;
	}

	public static getTextureForGradient(gradient:GradientFillStyle):any
	{
		var gradientStr:string=gradient.toString();
		if(TextureAtlas._allGradients.hasOwnProperty(gradientStr)){
			gradient.uvRectangle=TextureAtlas._allGradients[gradientStr].uvRectangle;
			return TextureAtlas._allGradients[gradientStr];
		}
		var t_len:number=TextureAtlas._allTextureAtlas.length;
		var t:number=0;
		var textureAtlas:TextureAtlas;
		var argb:number[];
		for(t=0; t<t_len; t++){
			if(TextureAtlas._allTextureAtlas[t].fit_gradient()){
				textureAtlas=TextureAtlas._allTextureAtlas[t];
				break;
			}
		}
		if(!textureAtlas){
			textureAtlas=new TextureAtlas();
			TextureAtlas._allTextureAtlas.push(textureAtlas);
		}
		var newColorObj:any={};

		textureAtlas.draw_gradient(gradient);
		newColorObj.uvRectangle=new Rectangle();
		
		newColorObj.uvRectangle.copyFrom(gradient.uvRectangle);

		newColorObj.texture=textureAtlas.texture;

		TextureAtlas._allGradients[gradientStr]=newColorObj;
		return newColorObj;

	}
	
	constructor(){
		this.bitmap = new BitmapImage2D(256, 256, false, 0xff0000);
		this.texture = new Single2DTexture(this.bitmap);
		this.availableRows=256;
		this.availableColors=0;
	}

	public availableRows:number=256;
	public gradient_row:number=-1;
	public color_row:number=255;
	public color_position:number=256;
	public availableGradients:number=256;
	public availableColors:number=0;
	public bitmap:BitmapImage2D;
	public texture:Single2DTexture;

	public fit_gradient():boolean{
		return (this.availableRows>0);		
	}
	public fit_color():boolean{
		if(this.availableColors>0)
			return true;
		return (this.availableRows>0);
	}
	public draw_gradient(gradient:GradientFillStyle):number{

		if(this.availableRows<0){
			console.log("error in TextureAtlasManager.draw_color");
			return;
		}
		this.gradient_row++;
		this.availableRows--;
		var px:number;
		for(px=0; px<256; px++){
			this.bitmap.setPixelFromArray(px, this.gradient_row, gradient.getColorAtPosition(px));
		}
		this.bitmap.invalidate();

		gradient.uvRectangle.x=1/512;
		gradient.uvRectangle.y=1/512 + (this.gradient_row/256);//+1/512;
		gradient.uvRectangle.width=1-1/512;
		gradient.uvRectangle.height=gradient.uvRectangle.y;
		return this.availableRows;
	}
	public draw_color(color:number, alpha:number = 1):Point{
		this.color_position--;
		if(this.color_position<0){
			if(this.availableRows>0){
				this.color_row--;
				this.availableRows--;
				this.color_position=255;
			}
			else{
				console.log("error in TextureAtlasManager.draw_color");
			}			
		}
		this.bitmap.setPixel(this.color_position, this.color_row, color);
		
		return new Point(this.color_position/256, this.color_row/256);
	}
	

}