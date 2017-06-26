import {GraphicsFillStyle} from "../draw/GraphicsFillStyle";
import {GradientType} from "../draw/GradientType";
import {ColorUtils, Matrix, Rectangle} from "@awayjs/core";

export class GradientFillStyle extends GraphicsFillStyle
{
    public static data_type:string = "[graphicsdata GradientFillStyle]";
    /**
     * The Vector of drawing commands as integers representing the path.
     */
    public colors:number[];
    public colors_r:number[];
    public colors_g:number[];
    public colors_b:number[];
    public alphas:number[];
    public ratios:number[];
    public ratio_min:number;
    public ratio_max:number;
    public type:string;
    public matrix:Matrix;
    public spreadMethod:string;
    public interpolationMethod:string;
    public focalPointRatio:number;
    public uvRectangle:Rectangle;

    constructor(type:GradientType, colors:number[], alphas:number[], ratios:number[], matrix:Matrix, spreadMethod:string, interpolationMethod:string, focalPointRatio:number)
    {
        super();
        if(colors.length != alphas.length || colors.length != ratios.length){
            throw("GradientFillStyle: Error - colors, alphas and ratios must be of same length");
        }
        this.colors=colors;
        this.colors_r=[];
        this.colors_g=[];
        this.colors_b=[];
        this.colors_r.length=this.colors_g.length=this.colors_g.length=this.colors.length;
        this.alphas=alphas;
        this.ratios=ratios;
        this.matrix=matrix;

        this.uvRectangle=new Rectangle();

        this.ratio_min=this.ratios[0];
        this.ratio_max=this.ratios[this.ratios.length-1];
        var r:number=this.ratios.length;
        while(r>1){
            r--;
            if(this.ratios[r]<this.ratios[r-1]){
                throw("GradientFillStyle: Error - ratios are not valid");
            }
        }

        var c:number=colors.length;
        var argb:number[];
        while(c>0){
            c--;
            argb = ColorUtils.float32ColorToARGB(colors[c]);
            this.colors_r[c]=argb[1];
            this.colors_g[c]=argb[2];
            this.colors_b[c]=argb[3];
        }
    }

    public getUVMatrix():Matrix
    {
        // todo manipulate this.matrix so it works correct for the uvRectangle
        return this.matrix;
    }
    public getColorAtPosition(value:number):number
    {
        var r1:number=-1;
        var r2:number=-1;
        if(value<=this.ratio_min){
            r1=this.ratio_min;
            r2=this.ratio_min;
        }
        else if(value>=this.ratio_max){
            r1=this.ratio_max;
            r2=this.ratio_max;
        }
        else{
            var r:number=0;
            for(var r:number=0; r<this.ratios.length-1;r++) {
                if(value==this.ratios[r]) {
                    r1=this.ratios[r];
                    r2=this.ratios[r];
                }
                else if(value==this.ratios[r+1]) {
                    r1=this.ratios[r+1];
                    r2=this.ratios[r+1];
                }
                else if(value>=this.ratios[r] && value<=this.ratios[r+1]) {
                    r1=this.ratios[r];
                    r2=this.ratios[r+1];
                }
            }
        }
        if(r1==r2) {
            return ColorUtils.ARGBtoFloat32(this.alphas[r1], this.colors_r[r1], this.colors_g[r1], this.colors_b[r1]);
        }
        var mix:number=(value-this.ratios[r1]) / (this.ratios[r2]-this.ratios[r1]);
        var mix_neg:number=1-mix;
        var color_a:number=this.alphas[r1]*mix + this.alphas[r2]*mix_neg;
        var color_r:number=this.colors_r[r1]*mix + this.colors_r[r2]*mix_neg;
        var color_g:number=this.colors_g[r1]*mix + this.colors_g[r2]*mix_neg;
        var color_b:number=this.colors_b[r1]*mix + this.colors_b[r2]*mix_neg;
        return ColorUtils.ARGBtoFloat32(color_a, color_r, color_g, color_b);
    }

    public get data_type():string
    {
        return GraphicsFillStyle.data_type;
    }
}