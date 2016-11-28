import {Box, Matrix3D, Sphere, Vector3D, AssetBase} from "@awayjs/core";

import {IMaterial} from "../base/IMaterial";
import {RenderableEvent} from "../events/RenderableEvent";
import {StyleEvent} from "../events/StyleEvent";
import {ElementsEvent} from "../events/ElementsEvent";
import {ShapeEvent} from "../events/ShapeEvent";
import {ElementsBase} from "../elements/ElementsBase";
import {TriangleElements} from "../elements/TriangleElements";
import {Graphics} from "../Graphics";

import {Style} from "./Style";
import {IRenderable} from "./IRenderable";

/**
 * Graphic wraps a Elements as a scene graph instantiation. A Graphic is owned by a Sprite object.
 *
 *
 * @see away.base.ElementsBase
 * @see away.entities.Sprite
 *
 * @class away.base.Graphic
 */
export class Shape extends AssetBase implements IRenderable
{
	private static _pool:Array<Shape> = new Array<Shape>();

	public static getShape(elements:ElementsBase, material:IMaterial = null, style:Style = null, count:number = 0, offset:number = 0):Shape
	{
		if (Shape._pool.length) {
			var shape:Shape = Shape._pool.pop();
			shape.elements = elements;
			shape.material = material;
			shape.style = style;
			shape.count = count;
			shape.offset = offset;
			return shape;
		}

		return new Shape(elements, material, style, count, offset);
	}

	public static storeShape(shape:Shape)
	{
		shape.elements = null;
		shape.material = null;
		shape.style = null;
		shape.clear();

		Shape._pool.push(shape);
	}

	public static assetType:string = "[asset Shape]";

	private _boxBounds:Box;
	private _boxBoundsInvalid:boolean = true;
	private _sphereBounds:Sphere;
	private _sphereBoundsInvalid = true;
	private _onInvalidatePropertiesDelegate:(event:StyleEvent) => void;
	private _onInvalidateVerticesDelegate:(event:ElementsEvent) => void;

	private _elements:ElementsBase;
	private _material:IMaterial;
	private _style:Style;

	public count:number;

	public offset:number;

	public _owners:Array<Graphics>;

	/**
	 * The Elements object which provides the geometry data for this Shape.
	 */
	public get  elements():ElementsBase
	{
		return this._elements;
	}

	public set elements(value:ElementsBase)
	{
		if (this._elements == value)
			return;

		this._elements = value;

		this.invalidateElements();
	}

	/**
	 *
	 */
	public get assetType():string
	{
		return Shape.assetType;
	}

	/**
	 * The material used to render the current Shape. If set to null, the containing Graphics's material will be used instead.
	 */
	public get material():IMaterial
	{
		return this._material;
	}

	public set material(value:IMaterial)
	{
		if (this._material == value)
			return;

		if (this._material)
			this.dispatchEvent(new ShapeEvent(ShapeEvent.REMOVE_MATERIAL, this));

		this._material = value;

		if (this._material)
			this.dispatchEvent(new ShapeEvent(ShapeEvent.ADD_MATERIAL, this));

		this.invalidateMaterial();
	}

	/**
	 * The style used to render the current Shape. If set to null, its parent Sprite's style will be used instead.
	 */
	public get style():Style
	{
		return this._style;
	}

	public set style(value:Style)
	{
		if (this._style == value)
			return;

		if (this._style)
			this._style.removeEventListener(StyleEvent.INVALIDATE_PROPERTIES, this._onInvalidatePropertiesDelegate);

		this._style = value;

		if (this._style)
			this._style.addEventListener(StyleEvent.INVALIDATE_PROPERTIES, this._onInvalidatePropertiesDelegate);

		this.invalidateMaterial();
	}


	/**
	 * Creates a new Shape object
	 */
	constructor(elements:ElementsBase, material:IMaterial = null, style:Style = null, count:number = 0, offset:number = 0)
	{
		super();

		this._onInvalidatePropertiesDelegate = (event:StyleEvent) => this._onInvalidateProperties(event);
		this._onInvalidateVerticesDelegate = (event:ElementsEvent) => this._onInvalidateVertices(event);

		this._elements = elements;
		this._material = material;
		this._style = style;

		if (this._style)
			this._style.addEventListener(StyleEvent.INVALIDATE_PROPERTIES, this._onInvalidatePropertiesDelegate);

		this.count = count;
		this.offset = offset;
	}

	/**
	 *
	 */
	public dispose():void
	{
		super.dispose();
	}

	public invalidate():void
	{
		super.invalidate();

		this._boxBoundsInvalid = true;
		this._sphereBoundsInvalid = true;
	}
	
	public invalidateElements():void
	{
		this.dispatchEvent(new RenderableEvent(RenderableEvent.INVALIDATE_ELEMENTS, this));

		this._boxBoundsInvalid = true;
		this._sphereBoundsInvalid = true;
	}

	public invalidateMaterial():void
	{
		this.dispatchEvent(new RenderableEvent(RenderableEvent.INVALIDATE_MATERIAL, this));
	}

	private _onInvalidateProperties(event:StyleEvent):void
	{
		this.invalidateMaterial();
	}

	private _onInvalidateVertices(event:ElementsEvent):void
	{
		if (event.attributesView != (<TriangleElements> event.target).positions)
			return;
		
		this.invalidate();
		
		this.dispatchEvent(event);
	}

	/**
	 * //TODO
	 *
	 * @param shortestCollisionDistance
	 * @param findClosest
	 * @returns {boolean}
	 *
	 * @internal
	 */
	// public _iTestCollision(pickingCollision:PickingCollision, pickingCollider:IPickingCollider):boolean
	// {
	// 	return this._elements._iTestCollision(pickingCollider, this.material, pickingCollision, this.count, this.offset)
	// }


	public applyTransformation(transform:Matrix3D):void
	{
		this._elements.applyTransformation(transform, this.count, this.offset);
	}

	public hitTestPoint(x:number, y:number, z:number):boolean
	{
		var box:Box;

		//early out for box test
		if(!(box = this.getBoxBounds()).contains(x, y, z))
			return false;

		return this._elements.hitTestPoint(x, y, z, box, this.count, this.offset);
	}
	
	public scale(scale:number):void
	{
		this._elements.scale(scale, this.count, this.offset);
	}

	public scaleUV(scaleU:number = 1, scaleV:number = 1):void
	{
		this._elements.scaleUV(scaleU, scaleV, this.count, this.offset);
	}

	public getBoxBounds():Box
	{
		if (this._boxBoundsInvalid) {
			this._boxBoundsInvalid = false;

			this._boxBounds = this._elements.getBoxBounds(this._boxBounds || (this._boxBounds = new Box()), this.count, this.offset);
		}

		return this._boxBounds;
	}

	public getSphereBounds(center:Vector3D, target:Sphere = null):Sphere
	{
		return this._elements.getSphereBounds(center, target, this.count, this.offset);
	}
}