import {Box, Matrix3D, Sphere, Vector3D, AssetBase, Transform} from "@awayjs/core";

import {IMaterial, RenderableEvent, StyleEvent, Style, IRenderable, ElementsEvent} from "@awayjs/renderer";

import {ParticleCollection} from "../animators/data/ParticleCollection";
import {ShapeEvent} from "../events/ShapeEvent";
import {ElementsBase} from "../elements/ElementsBase";
import {TriangleElements} from "../elements/TriangleElements";
import {Graphics} from "../Graphics";
import {GraphicsPath} from "../draw/GraphicsPath";

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
			shape.isStroke = false;
			return shape;
		}

		return new Shape(elements, material, style, count, offset);
	}

	public static storeShape(shape:Shape)
	{
		shape.elements = null;
		shape.material = null;
		shape.style = null;
        shape.particleCollection = null;
		shape.clear();

		Shape._pool.push(shape);
	}

	public static assetType:string = "[asset Shape]";

	private _orientedBoxBounds:Box;
	private _orientedBoxBoundsDirty:boolean = true;
	private _orientedSphereBounds:Sphere;
	private _orientedSphereBoundsDirty = true;
	private _onInvalidatePropertiesDelegate:(event:StyleEvent) => void;
	private _onInvalidateVerticesDelegate:(event:ElementsEvent) => void;

	private _elements:ElementsBase;
	private _material:IMaterial;
	private _style:Style;

	private _isStroke:boolean;
	private _strokePath:GraphicsPath;

	public count:number;

	public offset:number;

	public _owners:Array<Graphics>;

	public particleCollection:ParticleCollection;

	/*
	 * _strokePath provides the original stroke-path that was used to create this shape
	 * when the strokepath is set, it should already be prepared so that its faster to update stroke for new thickness
	 */
	public get strokePath():GraphicsPath
	{
		return this._strokePath;
	}

	public set strokePath(value:GraphicsPath)
	{
		this._strokePath = value;
	}

	/*
		* true if this shape was created for a stroke
	 */
	public get isStroke():boolean
	{
		return this._isStroke;
	}

	public set isStroke(value:boolean)
	{
		this._isStroke = value;
	}

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

		this._orientedBoxBoundsDirty = true;
		this._orientedSphereBoundsDirty = true;
	}
	
	public invalidateElements():void
	{
		this.dispatchEvent(new RenderableEvent(RenderableEvent.INVALIDATE_ELEMENTS, this));

		this._orientedBoxBoundsDirty = true;
		this._orientedSphereBoundsDirty = true;
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
		var box:Box = this.getBoxBounds();

		//early out for box test
		if(box == null || !box.contains(x, y, z))
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

	public getBoxBounds(matrix3D:Matrix3D = null, cache:Box = null, target:Box = null):Box
	{
		if (matrix3D)
			return this._elements.getBoxBounds(matrix3D, cache, target, this.count, this.offset);

		if (this._orientedBoxBoundsDirty) {
			this._orientedBoxBoundsDirty = false;

			this._orientedBoxBounds = this._elements.getBoxBounds(null, this._orientedBoxBounds, null, this.count, this.offset);
		}

		if (this._orientedBoxBounds != null)
			target = this._orientedBoxBounds.union(target, target || cache);

		return target;
	}

	public getSphereBounds(center:Vector3D, matrix3D:Matrix3D = null, cache:Sphere = null, target:Sphere = null):Sphere
	{
		if (matrix3D)
			return this._elements.getSphereBounds(center, matrix3D, cache, target, this.count, this.offset);

		if (this._orientedSphereBoundsDirty) {
			this._orientedSphereBoundsDirty = false;

			this._orientedSphereBounds = this._elements.getSphereBounds(center, null, this._orientedSphereBounds, null, this.count, this.offset);
		}

		if (this._orientedSphereBounds != null) {
			if (target == null) {
				target = cache || new Sphere();
				target.copyFrom(this._orientedSphereBounds);
			} else {
				target = target.union(this._orientedSphereBounds, target);
			}
		}

		return target;
	}
}

import {AssetEvent} from "@awayjs/core";

import {_Render_RenderableBase, RenderEntity, _Stage_ElementsBase, _Render_MaterialBase, MaterialUtils} from "@awayjs/renderer";

import {AnimatorBase} from "../animators/AnimatorBase";
import {LineElements} from "../elements/LineElements";

/**
 * @class away.pool._Render_Shape
 */
export class _Render_Shape extends _Render_RenderableBase
{
    /**
     *
     */
    public shape:Shape;

    /**
     * //TODO
     *
     * @param renderEntity
     * @param shape
     * @param level
     * @param indexOffset
     */
    constructor(shape:Shape, renderEntity:RenderEntity)
    {
        super(shape, renderEntity);

        this.shape = shape;
    }

    public onClear(event:AssetEvent):void
    {
        super.onClear(event);

        this.shape = null;
    }

    /**
     *
     * @returns {ElementsBase}
     * @protected
     */
    protected _getStageElements():_Stage_ElementsBase
    {
        this._offset = this.shape.offset;
        this._count = this.shape.count;

        return <_Stage_ElementsBase> this._stage.getAbstraction((this.sourceEntity.animator)? (<AnimatorBase> this.sourceEntity.animator).getRenderableElements(this, this.shape.elements) : this.shape.elements);
    }

    protected _getRenderMaterial():_Render_MaterialBase
    {
        return this._renderGroup.getRenderElements(this.stageElements.elements).getAbstraction(this.shape.material || this.sourceEntity.material || this.getDefaultMaterial());
    }

    protected getDefaultMaterial():IMaterial
    {
        return (this.stageElements.elements instanceof LineElements)? MaterialUtils.getDefaultColorMaterial() : MaterialUtils.getDefaultTextureMaterial();
    }
}

RenderEntity.registerRenderable(_Render_Shape, Shape);