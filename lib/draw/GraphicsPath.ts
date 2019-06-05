import {Point, MathConsts, Matrix3D, Box, Matrix} from "@awayjs/core";

import {GraphicsPathWinding} from "../draw/GraphicsPathWinding";
import {GraphicsPathCommand} from "../draw/GraphicsPathCommand";
import {IGraphicsData} from "../draw/IGraphicsData";
import {GraphicsFillStyle} from "../draw/GraphicsFillStyle";
import {GraphicsStrokeStyle} from "../draw/GraphicsStrokeStyle";
import {GraphicsFactoryHelper} from "../draw/GraphicsFactoryHelper";
import { SegmentedPath } from '../data/SegmentedPath';
import { clamp, assert } from '../data/utilities';
import { LineScaleMode } from './LineScaleMode';
import { CapsStyle } from './CapsStyle';
import { FillType } from '../data/FillType';
import { GradientFillStyle } from './GradientFillStyle';
import { GradientType } from './GradientType';
import { BitmapFillStyle } from './BitmapFillStyle';

/**

 * Defines the values to use for specifying path-drawing commands.
 * The values in this class are used by the Graphics.drawPath() method,
 *or stored in the commands vector of a GraphicsPath object.
 */
export class GraphicsPath implements IGraphicsData
{
    private _numQueuedPaths:number = 0;
    private _queuedSegmentedPaths:SegmentedPath[] = [];
    private _queuedMorphShapes:GraphicsPath[] = [];

    private _orientedBoxBounds:Box;
    private _orientedBoxBoundsDirty:boolean = true;
    
    public static data_type:string = "[graphicsdata path]";
    /**
     * The Vector of drawing commands as integers representing the path.
     */
    public _commands:number[][];

    private _cache:any;
    private _cacheSharedSegments:any;
    
    /**
     * The Vector of Numbers containing the parameters used with the drawing commands.
     */
	public _data:number[][];
    public _positions:number[][];

    /**
     * The Vector of Numbers containing the parameters used with the drawing commands.
     */
    public verts:number[];
    /**
     * Specifies the winding rule using a value defined in the GraphicsPathWinding class.
     */
    private _winding_rule:string;

    /**
     * The Vector of Numbers containing the parameters used with the drawing commands.
     */
    private _winding_directions:Array<number>;

    private _startPoint:Point;
    private _cur_point:Point;
    private _style:IGraphicsData;

    constructor(commands:Array<number> = null, data:Array<number> = null, winding_rule:string = GraphicsPathWinding.EVEN_ODD)
    {
        this._cache={};
        this._cacheSharedSegments={};
        this._data=[];
        this._commands=[];
        this._style = null;
        this.verts=[];
        this._positions=[];

        if(commands!=null && data!=null){
            this._data[0]=data;
            this._commands[0]=commands;
        }
        else{
            this._data[0]=[];
            this._commands[0]=[];
        }
        this._startPoint=new Point();
        this._cur_point=new Point();
        this._winding_rule=winding_rule;
        this._winding_directions=[];
    }

    public get data_type():string
    {
        return GraphicsPath.data_type;
    }

    public get style():IGraphicsData
    {
        return this._style;
    }
    public set style(value:IGraphicsData)
    {
        this._style = value;
    }

    public get fill():IGraphicsData
    {
        if (this._style==null)
            return null;
        if (this._style.data_type==GraphicsFillStyle.data_type)
            return this._style;
        return null;
    }
    public get stroke():GraphicsStrokeStyle
    {
        if (this._style==null)
            return null;
        if (this._style.data_type==GraphicsStrokeStyle.data_type)
            return <GraphicsStrokeStyle>this._style;
        return null;
    }

    public get commands():Array<Array<number>>
    {
        return this._commands;
    }

    public get data():Array<Array<number>>
    {
        return this._data;
    }

    public cacheSegment(contourIdx:number, segmentIdx:number, type:number, startx:number, starty:number, endx:number, endy:number, ctrlx:number=null, ctrly:number=null)
    {
        var idStr:string=type.toString()+"#";
        idStr+=(startx>endx)?(startx.toString()+"#"+endx.toString()):(endx.toString()+"#"+startx.toString());
        idStr+=(starty>endy)?(starty.toString()+"#"+endy.toString()):(endy.toString()+"#"+starty.toString());
        if(ctrlx!=null && ctrly!=null)
            idStr+=ctrlx.toString()+"#"+ctrly.toString();
        var curCacheItem=this._cache[idStr];
        if(curCacheItem==null){
            this._cache[idStr]=curCacheItem=[];
        }
        curCacheItem.push(contourIdx);
        curCacheItem.push(segmentIdx);
        if(curCacheItem.length>2){
            this._cacheSharedSegments[idStr]=curCacheItem;

        }
    }
    public curveTo(controlX:number, controlY:number, anchorX:number, anchorY:number)
    {
        // if controlpoint and anchor are same, we add lineTo command
        if((controlX==anchorX)&&(controlY==anchorY)){
            this.lineTo(controlX, controlY);
            //this.moveTo(anchorX, anchorY);
            return;
        }
        // if anchor is current point, but controlpoint is different, we lineto controlpoint
        if(((this._cur_point.x==anchorX)&&(this._cur_point.y==anchorY))&&((this._cur_point.x!=controlX)||(this._cur_point.y!=controlY))){
            this.lineTo(controlX, controlY);
            this.moveTo(anchorX, anchorY);
            return;
        }
        // if controlpoint is current point, but anchor is different, we lineto anchor
        if(((this._cur_point.x!=anchorX)||(this._cur_point.y!=anchorY))&&((this._cur_point.x==controlX)&&(this._cur_point.y==controlY))){
            this.lineTo(anchorX, anchorY);
            return;
        }
        // if controlpoint and anchor are same as current point
        if(((this._cur_point.x==anchorX)&&(this._cur_point.y==anchorY))&&((this._cur_point.x==controlX)&&(this._cur_point.y==controlY))){
            //console.log("curveTo command not added because startpoint and endpoint are the same.");
            this.lineTo(anchorX, anchorY);
            return;
        }

        if(this._commands[this._commands.length-1].length==0){
            // every contour must start with a moveTo command, so we make sure we have correct startpoint
            this._commands[this._commands.length-1].push(GraphicsPathCommand.MOVE_TO);
            this._data[this._data.length-1].push(this._cur_point.x);
            this._data[this._data.length-1].push(this._cur_point.y);
        }
        this._commands[this._commands.length-1].push(GraphicsPathCommand.CURVE_TO);
        this._data[this._data.length-1].push(controlX);
        this._data[this._data.length-1].push(controlY);
        this._data[this._data.length-1].push(anchorX);
        this._data[this._data.length-1].push(anchorY);
        this._cur_point.x=anchorX;
        this._cur_point.y=anchorY;

    }

    public cubicCurveTo(controlX:number, controlY:number, control2X:number, control2Y:number, anchorX:number, anchorY:number)
    {
        console.log("cubicCurveTo not yet fully supported.");
        if((this._cur_point.x==anchorX)&&(this._cur_point.y==anchorY)){
            //console.log("curveTo command not added because startpoint and endpoint are the same.");
            return;
        }
        if(this._commands[this._commands.length-1].length==0){
            // every contour must start with a moveTo command, so we make sure we have correct startpoint
            this._commands[this._commands.length-1].push(GraphicsPathCommand.MOVE_TO);
            this._data[this._data.length-1].push(this._cur_point.x);
            this._data[this._data.length-1].push(this._cur_point.y);
        }
        this._commands[this._commands.length-1].push(GraphicsPathCommand.CURVE_TO);
        this._data[this._data.length-1].push(controlX);
        this._data[this._data.length-1].push(controlY);
        this._data[this._data.length-1].push(anchorX);
        this._data[this._data.length-1].push(anchorY);
        this._cur_point.x=anchorX;
        this._cur_point.y=anchorY;

    }
    public lineTo(x:number, y:number)
    {
        if((this._cur_point.x==x)&&(this._cur_point.y==y)){
            //console.log("lineTo command not added because startpoint and endpoint are the same.");
            return;
        }
        if(this._commands[this._commands.length-1].length==0){
            // every contour must start with a moveTo command, so we make sure we have correct startpoint
            this._commands[this._commands.length-1].push(GraphicsPathCommand.MOVE_TO);
            this._data[this._data.length-1].push(this._cur_point.x);
            this._data[this._data.length-1].push(this._cur_point.y);
        }
        this._commands[this._commands.length-1].push(GraphicsPathCommand.LINE_TO);
        this._data[this._data.length-1].push(x);
        this._data[this._data.length-1].push(y);


        this._cur_point.x=x;
        this._cur_point.y=y;
    }

    public moveTo(x:number, y:number)
    {
        if((this._cur_point.x==x)&&(this._cur_point.y==y)){
            //console.log("moveTo command not added because startpoint and endpoint are the same.");
            return;
        }
        // whenever a moveTo command apears, we start a new contour
        if(this._commands[this._commands.length-1].length>0){
            this._commands.push([GraphicsPathCommand.MOVE_TO]);
            this._data.push([x, y]);
        }
        this._startPoint.x = x;
        this._startPoint.y = y;
        this._cur_point.x = x;
        this._cur_point.y = y;
    }

    public wideLineTo(x:number, y:number)
    {
    }

    public wideMoveTo(x:number, y:number)
    {
    }

    private _startMerge:number=-1;
    private _endMerge:number=-1;
    private _mergeSource:number=-1;
    private _mergetarget:number=-1;
    /* merges 2 contours together that share segments. the shared segments get removed*/
    private mergeContours(){
        //console.log("merge", this._mergeSource, this._mergetarget, this._startMerge, this._endMerge);
        //console.log("merge", this.data[this._mergetarget]);
        //console.log("merge", this.data[this._mergeSource]);
        var direction:number=-1;
        if(this._startMerge==this._endMerge){
            // only 1 segment to process. 
            // we need to look at the points to know in what direction the second path must be added to the first path
            var mergeIdx=this._connectedIdx[this._mergetarget][this._startMerge];
            var startx:number=this.data[this._mergetarget][this._positionOffset[this._mergetarget][this._startMerge]-2];
            var starty:number=this.data[this._mergetarget][this._positionOffset[this._mergetarget][this._startMerge]-1];
            var endx:number=this.data[this._mergetarget][this._positionOffset[this._mergetarget][this._startMerge]];
            var endy:number=this.data[this._mergetarget][this._positionOffset[this._mergetarget][this._startMerge]+1];
            
            var startx2:number=this.data[this._mergeSource][this._positionOffset[this._mergeSource][mergeIdx]];
            var starty2:number=this.data[this._mergeSource][this._positionOffset[this._mergeSource][mergeIdx]+1];
            var endx2:number=this.data[this._mergeSource][this._positionOffset[this._mergeSource][mergeIdx]+2];
            var endy2:number=this.data[this._mergeSource][this._positionOffset[this._mergeSource][mergeIdx]+3];

            if(startx==startx2 && starty==starty2 && endx==endx2 && endy==endy2){
                direction=1;
    
            }

        }
        var startMergeIdx=this._connectedIdx[this._mergetarget][this._startMerge];
        var endMergeIdx=this._connectedIdx[this._mergetarget][this._endMerge];
        var numConnectedSegments=Math.abs(this._startMerge-this._endMerge)+1;
        var segmentsToProcess=this._commands[this._mergeSource].length-numConnectedSegments;
        var direction:number=-1;
        if(startMergeIdx>endMergeIdx){
            direction=1;
            //console.log("segment goes in opposite direction");
        }
        var cur:number=startMergeIdx;
        var end_x:number=0;
        var end_y:number=0;
        var prev_x:number=0;
        var prev_y:number=0;
        var ctrl_x:number=0;
        var ctrl_y:number=0;
        var curve_verts:number[];
        var k:number=0;
        var k_len:number=0;
        var data_cnt:number=this._positionOffset[this._mergeSource][startMergeIdx];
        for(var i=0;i<segmentsToProcess;i++){
            cur+=direction;
            if(cur>=this._commands[this._mergeSource].length){
                cur-=this._commands[this._mergeSource].length;
            }
            if(cur<0){
                cur+=this._commands[this._mergeSource].length;
            }
            switch(this._commands[this._mergeSource][cur]){
                case GraphicsPathCommand.LINE_TO:
                    end_x = this.data[this._mergeSource][this._positionOffset[this._mergeSource][cur]];
                    end_y = this.data[this._mergeSource][this._positionOffset[this._mergeSource][cur]+1];
                    //console.log("LINE_TO ", i, end_x, end_y);
                    this._positions[this._mergetarget].push(end_x);
                    this._positions[this._mergetarget].push(end_y);
                    prev_x=end_x;
                    prev_y=end_y;
                    break;
                case GraphicsPathCommand.CURVE_TO:
                    ctrl_x = this.data[this._mergeSource][this._positionOffset[this._mergeSource][cur]];
                    ctrl_y = this.data[this._mergeSource][this._positionOffset[this._mergeSource][cur]+1];
                    end_x = this.data[this._mergeSource][this._positionOffset[this._mergeSource][cur]+2];
                    end_y = this.data[this._mergeSource][this._positionOffset[this._mergeSource][cur]+3];
                    //console.log("CURVE_TO ", i, ctrl_x, ctrl_y, end_x, end_y);
                    curve_verts=[];
                    GraphicsFactoryHelper.tesselateCurve(prev_x, prev_y, ctrl_x, ctrl_y, end_x, end_y, curve_verts);
                    k_len=curve_verts.length;
                    for (k=0; k<k_len; k+=2){
                        this._positions[this._mergetarget].push(curve_verts[k]);
                        this._positions[this._mergetarget].push(curve_verts[k+1]);
                    }
                    prev_x=end_x;
                    prev_y=end_y;
                    break;
            }
        }
        this._startMerge=-1;
        this._endMerge=-1;
        this._mergetarget=-1;
        this._mergeSource=-1;
    }

    public queuePath(segmentedPath: SegmentedPath, morphShape: GraphicsPath):void
    {
        if (!segmentedPath.head()) {
			// Path is empty.
			return;
        }
        
        if (segmentedPath.fillStyle) {
			var style = segmentedPath.fillStyle;
			var morph = style.morph;
			switch (style.type) {
				case FillType.Solid:
					style.alpha=segmentedPath.getAlpha(style.color)/255;
					style.color=segmentedPath.rgbaToArgb(style.color);
					this.style=new GraphicsFillStyle(style.color, style.alpha);

					var r=Math.random()*255;
					var g=Math.random()*255;
					var b=Math.random()*255;
				//	style.color=ColorUtils.ARGBtoFloat32(255, r, g, b);
				//	shape.style=new GraphicsStrokeStyle(style.color, 5, 1);

					if (morph) {
						morph.alpha=segmentedPath.getAlpha(morph.color)/255;
						morph.color=segmentedPath.rgbaToArgb(morph.color);
						morphShape.style=new GraphicsFillStyle(morph.color, morph.alpha);
					}


					break;
				case FillType.LinearGradient:
				case FillType.RadialGradient:
				case FillType.FocalRadialGradient:
					var gradientType:GradientType = style.type === FillType.LinearGradient ?
						GradientType.LINEAR :
						GradientType.RADIAL;
					var alphas:number[]=[];
					for(var i:number=0; i<style.colors.length; i++) {
						alphas[i]=segmentedPath.getAlpha(style.colors[i])/255;
						style.colors[i]=segmentedPath.rgbaToArgb(style.colors[i]);
					}
					var awayMatrix:Matrix=new Matrix(style.transform.a, style.transform.b, style.transform.c, style.transform.d, style.transform.tx, style.transform.ty);
					this.style=new GradientFillStyle(gradientType, style.colors, alphas, style.ratios,  awayMatrix, style.spreadMethod, style.interpolationMode, style.focalPoint / 2 | 0);

					//console.log("style.spreadMethod, style.interpolationMode", style.spreadMethod, style.interpolationMode);
					if (morph) {
						var gradientType:GradientType = morph.type === FillType.LinearGradient ?
							GradientType.LINEAR :
							GradientType.RADIAL;
						var alphas:number[]=[];
						for(var i:number=0; i<morph.colors.length; i++) {
							alphas[i]=segmentedPath.getAlpha(morph.colors[i])/255;
							morph.colors[i]=segmentedPath.rgbaToArgb(morph.colors[i]);
						}
						var awayMatrix:Matrix=new Matrix(morph.transform.a, morph.transform.b, morph.transform.c, morph.transform.d, morph.transform.tx, morph.transform.ty);
						morphShape.style=new GradientFillStyle(gradientType, morph.colors, alphas, morph.ratios,  awayMatrix, morph.spreadMethod, morph.interpolationMode, morph.focalPoint / 2 | 0);

						//console.log("writeMorphGradient not handled yet");
						//writeMorphGradient(morph, shape);
					}
					break;
				case FillType.ClippedBitmap:
				case FillType.RepeatingBitmap:
				case FillType.NonsmoothedClippedBitmap:
				case FillType.NonsmoothedRepeatingBitmap:

					//console.log("bitmapIndex", style.bitmapIndex, "transform", style.transform,  "repeat", style.repeat,  "smooth", style.smooth);
					var awayMatrix:Matrix=new Matrix(style.transform.a, style.transform.b, style.transform.c, style.transform.d, style.transform.tx, style.transform.ty);

					this.style=new BitmapFillStyle(segmentedPath.parser.getMaterial(style.bitmapIndex), awayMatrix, style.repeat, style.smooth);
					//shape.beginBitmap(command, style.bitmapIndex, style.transform, style.repeat, style.smooth);
					if (morph) {
						console.log("writeMorphBitmap not handled yet");
						//writeMorphBitmap(morph, shape);
					}

					break;
				default:
					console.log('Invalid fill style type: ' + style.type);
			}
		} else {
			var style = segmentedPath.lineStyle;
			var morph = style.morph;
			assert(style);
			switch (style.type) {
				case FillType.Solid:
					var scaleMode = style.noHscale ?
						(style.noVscale ? 0 : 2) :
						style.noVscale ? 3 : 1;
					// TODO: Figure out how to handle startCapsStyle
					var thickness = (clamp(style.width, 0, 0xff * 20)|0)/20;
					style.alpha=segmentedPath.getAlpha(style.color)/255;
					style.color=segmentedPath.rgbaToArgb(style.color);
					var scaleModeAWJ=LineScaleMode.NORMAL;
					//if(style.noVscale==null && style.noHscale==null){
					//	scaleModeAWJ="HAIRLINE";
					//}
					if(thickness==0.05){
						scaleModeAWJ=LineScaleMode.HAIRLINE;
					}
					if(style.startCapsStyle!=style.endCapsStyle){
						throw("different end vs start capstyöe");
					}
					style.startCapsStyle=CapsStyle.ROUND;
					style.jointStyle=0;
					//console.log("style.startCapsStyle", style.startCapsStyle, style.endCapsStyle, style );
					this.style=new GraphicsStrokeStyle(style.color, style.alpha, thickness, style.jointStyle, style.startCapsStyle, style.miterLimit, scaleModeAWJ);

					//console.log("scaleMode", scaleModeAWJ, style.noHscale, style.noVscale, scaleMode, thickness, style.jointStyle, style.startCapsStyle, style.endCapsStyle, style.miterLimit);
					if (morph) {
						var thickness = (clamp(morph.width, 0, 0xff * 20)|0)/20;
						morph.alpha=segmentedPath.getAlpha(morph.color)/255;
						morph.color=segmentedPath.rgbaToArgb(morph.color);
						morphShape.style=new GraphicsStrokeStyle(morph.color, morph.alpha, thickness, style.jointStyle, style.startCapsStyle, style.miterLimit, scaleModeAWJ);
						//console.log("writeMorphLineStyle not handled yet");
						//writeMorphLineStyle(morph, shape);
					}
					break;
				case FillType.LinearGradient:
				case FillType.RadialGradient:
				case FillType.FocalRadialGradient:
					var scaleMode = style.noHscale ?
						(style.noVscale ? 0 : 2) :
						style.noVscale ? 3 : 1;
					// TODO: Figure out how to handle startCapsStyle
					//console.log("style.startCapsStyle", style.startCapsStyle, style.endCapsStyle, style );
					var thickness = (clamp(style.width, 0, 0xff * 20)|0)/20;
					style.alpha=segmentedPath.getAlpha(style.color)/255;
					style.color=segmentedPath.rgbaToArgb(style.color)
					this.style=new GraphicsStrokeStyle(style.color, style.alpha, thickness, style.jointStyle, style.endCapsStyle, style.miterLimit);
					var gradientType:GradientType = style.type === FillType.LinearGradient ?
						GradientType.LINEAR :
						GradientType.RADIAL;
					for(var i:number=0; i<style.colors.length; i++) {
						style.colors[i]=segmentedPath.rgbaToArgb(style.colors[i]);
						alphas[i]=1;
					}
					for(var i:number=0; i<style.colors.length; i++) alphas[i]=1;
					this.style=new GradientFillStyle(gradientType, style.colors, alphas, style.ratios,  style.transform, style.spreadMethod,style.interpolationMode, style.focalPoint / 2 | 0);

					//console.log("scaleMode", style.noHscale, style.noVscale, scaleMode, thickness, style.jointStyle, style.endCapsStyle, style.miterLimit);
					if (morph) {
						//console.log("writeMorphLineStyle not handled yet");
						//console.log("writeMorphGradient not handled yet");
						//writeMorphLineStyle(morph, shape);
						//writeMorphGradient(morph, shape);
					}
					break;
				case FillType.ClippedBitmap:
				case FillType.RepeatingBitmap:
				case FillType.NonsmoothedClippedBitmap:
				case FillType.NonsmoothedRepeatingBitmap:
					var scaleMode = style.noHscale ?
						(style.noVscale ? 0 : 2) :
						style.noVscale ? 3 : 1;
					// TODO: Figure out how to handle startCapsStyle
					//console.log("style.startCapsStyle", style.startCapsStyle, style.endCapsStyle, style );
					var thickness = clamp(style.width, 0, 0xff * 20)|0;
					this.style=new GraphicsStrokeStyle(style.color, 1, thickness, style.jointStyle, style.endCapsStyle, style.miterLimit);
					//console.log("scaleMode", scaleMode, thickness, style.jointStyle, style.endCapsStyle, style.miterLimit);



					//console.log("writeBitmap not handled yet");
					//writeBitmap(PathCommand.LineStyleBitmap, style, shape);
					if (morph) {
						//console.log("writeMorphLineStyle not handled yet");
						//console.log("writeMorphBitmap not handled yet");
						//writeMorphLineStyle(morph, shape);
						//writeMorphBitmap(morph, shape);
					}
					break;
				default:
				//console.error('Line style type not yet supported: ' + style.type);
			}
		
        }
        
        this._queuedSegmentedPaths[this._numQueuedPaths] = segmentedPath;
        this._queuedMorphShapes[this._numQueuedPaths] = morphShape;

        this._numQueuedPaths++;
    }

    private _connectedIdx:number[][]=[];
    private _positionOffset:number[][]=[];
    public forceClose:boolean=false;
    
    public prepare():void
    {
        //serialise queued paths
        if (this._queuedSegmentedPaths.length) {
            for (var j:number = 0; j < this._numQueuedPaths; j++)
                this._queuedSegmentedPaths[j].serializeAJS(this, this._queuedMorphShapes[j]);
            
                this._queuedSegmentedPaths.length = 0;
                this._queuedMorphShapes.length = 0;
        }

        var closed:boolean;
        var commands:number[];
        var isValidCommand:number[][]=[];
        var contour_merged:boolean[]=[];
        var data:number[];
        var c, i, k, k_len:number=0;

        var posOffset, data_cnt:number=0;
        var prev_x, prev_y, end_x, end_y, ctrl_x, ctrl_y:number=0;
        var curve_verts:number[];
        var myCacheItem:any[];
        var cmd_len=this.commands.length;
        for(c=0; c<cmd_len; c++) {
            commands = this.commands[c];
            contour_merged[c]=false;
            data = this.data[c];
            this._positions[c]=[];
            isValidCommand[c]=[];
            this._connectedIdx[c]=[];
            this._positionOffset[c]=[];
            // check if the path is closed. 
            // if its not closed, we optionally close it by adding the extra lineTo-cmd
            closed = true;
            if((data[0] != data[data.length-2]) || (data[1] != data[data.length-1])){
                if(this.forceClose){
                    commands[commands.length]=GraphicsPathCommand.LINE_TO;
                    data[data.length]=data[0];
                    data[data.length]=data[1];
                }
                else{
                    closed = false;                    
                }
            }
            
        }
            

        var cmd_len=this.commands.length;
        for(c=0; c<cmd_len; c++) {
            commands = this.commands[c];
            data = this.data[c];
           
            data_cnt=0;
            prev_x=data[data_cnt++];
            prev_y=data[data_cnt++];
            end_x=0;
            end_y=0;
            ctrl_x=0;
            ctrl_y=0;
            this._positions[c].push(prev_x);
            this._positions[c].push(prev_y);


            // now we collect the final position data
            // a command list is no longer needed for this position data,
            // we resolve all curves to line segments here

            this._startMerge=-1;
            this._endMerge=-1;
            this._mergetarget=-1;
            this._mergeSource=-1;
                data_cnt=0;
                prev_x=data[data_cnt++];
                prev_y=data[data_cnt++];
                for (i = 1; i < commands.length; i++) {
                        switch(commands[i]){
                            case GraphicsPathCommand.MOVE_TO:
                                console.log("ERROR ! ONLY THE FIRST COMMAND FOR A CONTOUR IS ALLOWED TO BE A 'MOVE_TO' COMMAND");
                                break;
                            case GraphicsPathCommand.LINE_TO:
                                end_x = data[data_cnt++];
                                end_y = data[data_cnt++];
                                //console.log("LINE_TO ", i, end_x, end_y);
                                this._positions[c].push(end_x);
                                this._positions[c].push(end_y);
                                prev_x=end_x;
                                prev_y=end_y;
                                break;
                            case GraphicsPathCommand.CURVE_TO:
                                ctrl_x = data[data_cnt++];
                                ctrl_y = data[data_cnt++];
                                end_x = data[data_cnt++];
                                end_y = data[data_cnt++];
                                //console.log("CURVE_TO ", i, ctrl_x, ctrl_y, end_x, end_y);
                                curve_verts=[];
                                GraphicsFactoryHelper.tesselateCurve(prev_x, prev_y, ctrl_x, ctrl_y, end_x, end_y, curve_verts);
                                k_len=curve_verts.length;
                                for (k=0; k<k_len; k+=2){
                                    this._positions[c].push(curve_verts[k]);
                                    this._positions[c].push(curve_verts[k+1]);
                                }
                                prev_x=end_x;
                                prev_y=end_y;
                                break;
                        }      
                }
        }
    }

    public invalidate()
    {
        this._orientedBoxBoundsDirty = true;
    }


	public getBoxBounds(matrix3D:Matrix3D = null, cache:Box = null, target:Box = null):Box
	{
		if (matrix3D)
			return this._internalGetBoxBounds(matrix3D, cache, target);

		if (this._orientedBoxBoundsDirty) {
			this._orientedBoxBoundsDirty = false;

			this._orientedBoxBounds = this._internalGetBoxBounds(null, this._orientedBoxBounds, null);
		}

		if (this._orientedBoxBounds != null)
			target = this._orientedBoxBounds.union(target, target || cache);

		return target;
    }
    
    private _internalGetBoxBounds(matrix3D:Matrix3D = null, cache:Box = null, target:Box = null):Box
	{

		var minX:number = 0, minY:number = 0;
		var maxX:number = 0, maxY:number = 0;

		var len:number = this._positions.length;

		if (len == 0)
			return target;

		var i:number = 0
        var index:number = 0;
        var positions:number[] = this._positions[index++];
        var pLen:number = positions.length;
		var pos1:number, pos2:number, pos3:number, rawData:Float32Array;
		
		if (matrix3D)
			rawData = matrix3D._rawData;

		if (target == null) {
            target = cache || new Box();
			if (matrix3D) {
                pos1 = positions[i]*rawData[0] + positions[i + 1]*rawData[4] + rawData[12];
                pos2 = positions[i]*rawData[1] + positions[i + 1]*rawData[5] + rawData[13];
            } else {
				pos1 = positions[i];
				pos2 = positions[i + 1];
			}
			
			maxX = minX = pos1;
			maxY = minY = pos2;
			i+=2;
		} else {
			maxX = (minX = target.x) + target.width;
			maxY = (minY = target.y) + target.height;
		}

		for (; i < pLen; i+=2) {
			if (matrix3D) {
                pos1 = positions[i]*rawData[0] + positions[i + 1]*rawData[4] + rawData[12];
                pos2 = positions[i]*rawData[1] + positions[i + 1]*rawData[5] + rawData[13];
            } else {
				pos1 = positions[i];
				pos2 = positions[i + 1];
			}

			if (pos1 < minX)
				minX = pos1;
			else if (pos1 > maxX)
				maxX = pos1;

			if (pos2 < minY)
				minY = pos2;
			else if (pos2 > maxY)
                maxY = pos2;
                
            if (i >= pLen - 2 && index < len) {
                i = 0;
                positions = this._positions[index++];
                pLen = positions.length;
            }
		}

		target.width = maxX - (target.x = minX);
		target.height = maxY - (target.y = minY);
		target.depth = 0;

		return target;
    }
}