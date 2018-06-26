import {Point, MathConsts, Matrix3D, Box} from "@awayjs/core";

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
        //console.log(controlX, controlY, anchorX, anchorY);
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
        if(this.fill)
            this.cacheSegment(this._data.length-1, this._commands[this._commands.length-1].length, GraphicsPathCommand.CURVE_TO, this._cur_point.x, this._cur_point.y, anchorX, anchorY, controlX, controlY);

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
        if(this.fill)
            this.cacheSegment(this._data.length-1, this._commands[this._commands.length-1].length, GraphicsPathCommand.CURVE_TO, this._cur_point.x, this._cur_point.y, anchorX, anchorY, controlX, controlY);
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
        if(this.fill)
            this.cacheSegment(this._data.length-1, this._commands[this._commands.length-1].length, GraphicsPathCommand.LINE_TO, 
            this._cur_point.x, this._cur_point.y, x, y);
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
        if(this.fill)
            this.cacheSegment(this._data.length-1, this._commands[this._commands.length-1].length, GraphicsPathCommand.MOVE_TO, 
            this._cur_point.x, this._cur_point.y, x, y);
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
    private _connectedIdx:number[][]=[];
    private _positionOffset:number[][]=[];
	public forceClose:boolean=false;
    public prepare(){

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
            
            if(this.fill){
                posOffset=0;
                for (i = 0; i < commands.length; i++) {
                    this._positionOffset[c][i]=posOffset;
                    
                    switch(commands[i]){
                        case GraphicsPathCommand.LINE_TO:
                            posOffset+=2;
                            break;
                        case GraphicsPathCommand.MOVE_TO:
                            posOffset+=2;
                            break;
                        case GraphicsPathCommand.CURVE_TO:
                            posOffset+=4;
                            break;
                    }
                    isValidCommand[c][i]=c;
                    this._connectedIdx[c][i]=-1;
                }
            }
        }
            
        if(this.fill){
            for(var key in this._cacheSharedSegments){
                if(this._cacheSharedSegments.hasOwnProperty(key)){
                    myCacheItem=this._cacheSharedSegments[key];
                    if(myCacheItem.length>2){
                        //if(myCacheItem.length>4){
                        //    console.log("error! edge shared by more than 2 contours: ");
                        //}
                        //else{
                            if(myCacheItem[0]==myCacheItem[2]){
                                // same contour, should be save to remove both segments
                                isValidCommand[myCacheItem[0]][myCacheItem[1]]=-1;
                                isValidCommand[myCacheItem[0]][myCacheItem[3]]=-1;
                            }
                            else{
                                // 2 different contours, should be save to remove both segments
                                isValidCommand[myCacheItem[0]][myCacheItem[1]]=myCacheItem[2];
                                this._connectedIdx[myCacheItem[0]][myCacheItem[1]]=myCacheItem[3];
                                isValidCommand[myCacheItem[2]][myCacheItem[3]]=myCacheItem[0];
                                this._connectedIdx[myCacheItem[2]][myCacheItem[3]]=myCacheItem[1];
                            }
                        //}

                        //console.log("chached double-used segment: "+myCacheItem, key);
                    }
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

            //console.log("data in", data);
            //console.log("data in", commands.length);
            /*
            var k:number=0;
            var k2:number=0;
            var k3:number=0;
            var keepSearching=true;
            // alterantive way to get rid of invalid segments, without using the segment cache.
            // does not work for all cases!
            if(this.fill!=null){
                for (i = 1; i < commands.length; i++) {
                    console.log("command", i, commands[i])
                    isValidCommand[i]=true;
                    switch(commands[i]){
                        case GraphicsPathCommand.LINE_TO:
                            data_cnt+=2;
                            console.log(i, "LINE_TO ", data[data_cnt-2], data[data_cnt-1]);
                            if(i>0 && i<(commands.length) && commands[i-1]==commands[i]){        
                                if(data[data_cnt-2]==data[data_cnt-6] && data[data_cnt-1]==data[data_cnt-5]){
                                    console.log("found line segments that cancel each other", i, i-1);
                                    // this is a step back
                                    isValidCommand[i]=false;
                                    isValidCommand[i-1]=false;                                    
                                    // now keep checking how many more commands can be removed
                                    k=1;
                                    k2=4;
                                    k3=0;
                                    keepSearching=true;
                                    // keep searching as long as we are inside bounds of commands, and we 
                                    while(keepSearching && (i-k-1)>=0 && (i+k<commands.length) && commands[i-k-1]==commands[i+k]){
                                        keepSearching=false;
                                        switch(commands[i+k]){
                                            case GraphicsPathCommand.LINE_TO:
                                                if(data[data_cnt-k2-2]==data[data_cnt+k3] && data[data_cnt-k2-1]==data[data_cnt+k3+1]){
                                                    console.log("found another line segment");
                                                    keepSearching=true;
                                                    k2+=2;
                                                    k3+=2;
                                                    k++;
                                                    isValidCommand[i-k-1]=false;
                                                    isValidCommand[i+k]=false;
                                                }
                                                
                                                break;
                                            case GraphicsPathCommand.CURVE_TO:
                                                if(data[data_cnt-k2-4]==data[data_cnt+k3] && data[data_cnt-k2-3]==data[data_cnt+k3+1]
                                                && data[data_cnt-k2-2]==data[data_cnt+k3+2] && data[data_cnt-k2-1]==data[data_cnt+k3+3]){
                                                    console.log("found another curve segment");
                                                    keepSearching=true;
                                                    k2+=4;
                                                    k3+=4;
                                                    k++;
                                                    isValidCommand[i-k-1]=false;
                                                    isValidCommand[i+k]=false;
                                                }
                                                break;
                                        }
                                    }
                                    i+=k-1;
                                    data_cnt+=k3;

                                }
                            }
                            break;
                        
                        case GraphicsPathCommand.CURVE_TO:
                            data_cnt+=4;
                            console.log(i, "CURVE_TO ", data[data_cnt-4], data[data_cnt-3], data[data_cnt-2], data[data_cnt-1]);
                            if(i>0 && i<(commands.length) && commands[i-1]==commands[i]){
                                if(data[data_cnt-2]==data[data_cnt-10] && data[data_cnt-1]==data[data_cnt-9] &&
                                    data[data_cnt-4]==data[data_cnt-8] && data[data_cnt-3]==data[data_cnt-7]){   
                                        console.log("found curve segments that cancel each other", i, i-1);                                     
                                        // this and the previous command can be removed
                                        isValidCommand[i]=false;
                                        isValidCommand[i-1]=false;

                                        // now keep checking how many more commands can be removed
                                        k=1;
                                        k2=4;
                                        k3=0;
                                        keepSearching=true;
                                        // keep searching as long as we are inside bounds of commands, and we 
                                        while(keepSearching && (i-k-1)>=0 && (i+k<commands.length) && commands[i-k-1]==commands[i+k]){
                                            //console.log("keep searching");
                                            keepSearching=false;
                                            switch(commands[i+k]){
                                                case GraphicsPathCommand.LINE_TO:
                                                    k2+=2;
                                                    if(data[data_cnt-k2-2]==data[data_cnt+k3] && data[data_cnt-k2-1]==data[data_cnt+k3+1]){
                                                        console.log("found another line segment", i+k);
                                                        keepSearching=true;
                                                        k++;
                                                        k3+=2;
                                                        isValidCommand[i-k-1]=false;
                                                        isValidCommand[i+k]=false;
                                                    }                                                    
                                                    break;
                                                case GraphicsPathCommand.CURVE_TO:
                                                    //console.log("ctr_pointprev", data_cnt-k2-6, data_cnt-k2-5);
                                                    //console.log("ctr_point", data_cnt-k2-6, data_cnt-k2-5);
                                                    k2+=4;
                                                    if(data[data_cnt-k2-4]==data[data_cnt+k3] && data[data_cnt-k2-3]==data[data_cnt+k3+1]
                                                    && data[data_cnt-k2-6]==data[data_cnt+k3+2] && data[data_cnt-k2-5]==data[data_cnt+k3+3]){
                                                        console.log("found another curve segment", i+k);
                                                        isValidCommand[i-k-1]=false;
                                                        isValidCommand[i+k]=false;
                                                        keepSearching=true;
                                                        k++;
                                                        k3+=4;
                                                        //console.log("prev", i-k-1);
                                                    }
                                                    break;
                                            }
                                        }
                                        i+=k-1;
                                        data_cnt+=k3;                                        
                                }
                            }
                            break;
                    }
                }
            }
            */

            // now we collect the final position data
            // a command list is no longer needed for this position data,
            // we resolve all curves to line segments here

            this._startMerge=-1;
            this._endMerge=-1;
            this._mergetarget=-1;
            this._mergeSource=-1;
            if(!contour_merged[c]){
                data_cnt=0;
                prev_x=data[data_cnt++];
                prev_y=data[data_cnt++];
                for (i = 1; i < commands.length; i++) {
                    if(this.fill!=null && isValidCommand[c][i]<0){
                        //console.log("is invalid command", i);
                        if(this._startMerge>-1 && this._mergetarget>-1)
                            this.mergeContours();
                        switch(commands[i]){
                            case GraphicsPathCommand.LINE_TO:
                                data_cnt+=2;
                                break;
                            case GraphicsPathCommand.MOVE_TO:
                                data_cnt+=2;
                                break;
                            case GraphicsPathCommand.CURVE_TO:
                                data_cnt+=4;
                                break;
                        }
                        continue;
                    }
                    if(this.fill==null || isValidCommand[c][i]==c){
                        if(this._startMerge>-1 && this._mergetarget>-1)
                            this.mergeContours();
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
                    if(this.fill!=null && isValidCommand[c][i]!=c){
                        // another contour shares this same edge.
                        // we must merge the two contours

                        // before mergeing we must check how many segments are shared.
                        // for this purpose we collect startMerge and endMerge which are indices into the command list

                        // this approach will probably fail, if the same 2 contours share multiple ranges of segments!
                        if(this._startMerge==-1){
                            this._startMerge=i;
                        }
                        if(this._mergeSource!=-1 && this._mergeSource!=isValidCommand[c][i]){
                            this.mergeContours();
                        }
                        this._endMerge=i;
                        this._mergeSource=isValidCommand[c][i];
                        this._mergetarget=c;
                        //console.log("skip this segment, merge in from other path instead");   
                        contour_merged[isValidCommand[c][i]]=true;    
                        switch(commands[i]){
                            case GraphicsPathCommand.LINE_TO:
                                data_cnt+=2;
                                break;
                            case GraphicsPathCommand.MOVE_TO:
                                data_cnt+=2;
                                break;
                            case GraphicsPathCommand.CURVE_TO:
                                data_cnt+=4;
                                break;
                        }
                    }
                }
            }
            //console.log("data out", this._positions[c]);


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
i
		target.width = maxX - (target.x = minX);
		target.height = maxY - (target.y = minY);
		target.depth = 0;

		return target;
    }
}