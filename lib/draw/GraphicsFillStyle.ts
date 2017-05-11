import {IGraphicsData} from "../draw/IGraphicsData";


export class GraphicsFillStyle implements IGraphicsData
{
    public static data_type:string = "[graphicsdata FillStyle]";
    /**
     * The Vector of drawing commands as integers representing the path.
     */
    public color:number;
    public alpha:number;

    constructor(color:number = 0xffffff, alpha:number = 1)
    {
        this.color=color;
        this.alpha=alpha;
    }

    public get data_type():string
    {
        return GraphicsFillStyle.data_type;
    }
}