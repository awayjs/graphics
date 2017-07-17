import {Point, MathConsts} from "@awayjs/core";

import {GraphicsPathWinding} from "../draw/GraphicsPathWinding";
import {GraphicsPathCommand} from "../draw/GraphicsPathCommand";
import {IGraphicsData} from "../draw/IGraphicsData";
import {GraphicsFillStyle} from "../draw/GraphicsFillStyle";
import {GraphicsStrokeStyle} from "../draw/GraphicsStrokeStyle";
import {GraphicsFactoryHelper} from "../draw/GraphicsFactoryHelper";

/**

 * Defines the values to use for specifying path-drawing commands.
 * The values in this class are used by the Graphics.drawPath() method,
 *or stored in the commands vector of a GraphicsPath object.
 */
export class GraphicsPath implements IGraphicsData
{
    public static data_type:string = "[graphicsdata path]";
    /**
     * The Vector of drawing commands as integers representing the path.
     */
    private _commands:Array<Array<number>>;
    /**
     * The Vector of Numbers containing the parameters used with the drawing commands.
     */
    private _data:Array<Array<number>>;
    public _positions:Array<Array<number>>;
    public _newCommands:Array<Array<number>>;

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
        this._data=[];
        this._commands=[];
        this._style = null;
        this.verts=[];
        this._positions=[];
        this._newCommands=[];

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

    public fill():IGraphicsData
    {
        if (this._style==null)
            return null;
        if (this._style.data_type==GraphicsFillStyle.data_type)
            return this._style;
        return null;
    }
    public stroke():GraphicsStrokeStyle
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

    public curveTo(controlX:number, controlY:number, anchorX:number, anchorY:number)
    {
        // if controlpoint and anchor are same, we add lineTo command
        if((controlX==anchorX)&&(controlY==anchorY)){
            this.lineTo(controlX, controlY);
            this.moveTo(anchorX, anchorY);
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
        // not used
        /*
         this._commands.push(GraphicsPathCommand.WIDE_LINE_TO);
         this._data.push(0);
         this._data.push(0);
         this._data.push(x);
         this._data.push(y);
         */
    }

    public wideMoveTo(x:number, y:number)
    {
        // not used
        /*
         this._commands.push(GraphicsPathCommand.WIDE_MOVE_TO);
         this._data.push(0);
         this._data.push(0);
         this._data.push(x);
         this._data.push(y);
         */
    }

    public forceClose:boolean=false;
    public prepare(){

        var new_dir:number;
        var dir_delta:number;
        var last_direction:number;
        var closed:boolean;
        var tmp_dir_point:Point=new Point();
        var prev_dir_vec:Point=new Point();
        var prev_point:Point=new Point();
        var end_point:Point=new Point();
        var commands:number[];
        var data:number[];
        var c, i:number=0;
        var cmd_len=this.commands.length;
        for(c=0; c<cmd_len; c++) {
            commands = this.commands[c];
            data = this.data[c];

            new_dir=0;
            dir_delta=0;
            last_direction=0;
            tmp_dir_point.x=0;
            tmp_dir_point.y=0;
            prev_dir_vec.x=0;
            prev_dir_vec.y=0;


            this._positions[c]=[];
            this._newCommands[c]=[];
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
            
            // if the path is closed, we init the prevDirection with the last segments direction
            if(closed){
                //console.log("path is closed");
                prev_dir_vec.x = data[data.length-2]-data[data.length-4];
                prev_dir_vec.y = data[data.length-1]-data[data.length-3];
                prev_dir_vec.normalize();
                last_direction = Math.atan2(prev_dir_vec.y, prev_dir_vec.x) * MathConsts.RADIANS_TO_DEGREES;
            }
            else{

                //console.log("path is not closed");
            }
            var data_cnt:number=0;
            prev_point.x=data[data_cnt++];
            prev_point.y=data[data_cnt++];
            var prev_x:number=prev_point.x;
            var prev_y:number=prev_point.y;
            this._positions[c].push(prev_point.x);
            this._positions[c].push(prev_point.y);
            this._newCommands[c].push(GraphicsPathCommand.MOVE_TO);
            var ctr_point:Point = new Point();
            for (i = 1; i < commands.length; i++) {
                switch(commands[i]){
                    case GraphicsPathCommand.MOVE_TO:
                        console.log("ERROR ! ONLY THE FIRST COMMAND FOR A CONTOUR IS ALLOWED TO BE A 'MOVE_TO' COMMAND");
                        break;
                    case GraphicsPathCommand.LINE_TO:
                        end_point = new Point(data[data_cnt++], data[data_cnt++]);
                       // console.log("LINE_TO ", i, end_point.x, end_point.y);
                        this._positions[c].push(end_point.x);
                        this._positions[c].push(end_point.y);
                        this._newCommands[c].push(GraphicsPathCommand.LINE_TO);
                        prev_x=end_point.x;
                        prev_y=end_point.y;
                        break;
                    case GraphicsPathCommand.CURVE_TO:
                        end_point = new Point(data[data_cnt++], data[data_cnt++]);
                        ctr_point = new Point(data[data_cnt++], data[data_cnt++]);
                        console.log("CURVE_TO ", i, ctr_point.x, ctr_point.y, end_point.x, end_point.y);
                        var curve_verts:number[]=[];
                        GraphicsFactoryHelper.tesselateCurve(prev_x, prev_y, ctr_point.x,ctr_point.y,end_point.x,end_point.y,curve_verts);
                        var k_len:number=curve_verts.length;
                        var k=0;
                        for (k=0; k<k_len; k+=2){
                            var newPoint = new Point(curve_verts[k], curve_verts[k+1]);
                           // console.log("tesselated curve to ", k, newPoint.x, newPoint.y);
                            this._newCommands[c].push(GraphicsPathCommand.LINE_TO);
                            this._positions[c].push(newPoint.x);
                            this._positions[c].push(newPoint.y);
                        }
                        prev_x=end_point.x;
                        prev_y=end_point.y;
                        break;
                }

            }


        }
    }
}