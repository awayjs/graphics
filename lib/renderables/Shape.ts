import { Box, Matrix3D, Sphere, Vector3D, AssetBase, Rectangle, Matrix } from '@awayjs/core';

import { PickingCollision, PickEntity, _Pick_PickableBase, IPartitionContainer } from '@awayjs/view';

import {
	IMaterial,
	RenderableEvent,
	StyleEvent,
	Style,
	ElementsEvent,
	IRenderContainer,
	ElementsBase,
	TriangleElements
} from '@awayjs/renderer';

import { IGraphicsData } from '../draw/IGraphicsData';

import { ParticleCollection } from '../animators/data/ParticleCollection';

/**
 * Graphic wraps a Elements as a scene graph instantiation. A Graphic is owned by a Sprite object.
 *
 *
 * @see away.base.ElementsBase
 * @see away.entities.Sprite
 *
 * @class away.base.Graphic
 */
export class Shape<T extends ElementsBase = ElementsBase> extends AssetBase {
	private static _pool: Array<Shape> = new Array<Shape>();

	public static getShape<T extends ElementsBase>(
		elements: T,
		material: IMaterial = null,
		style: Style = null,
		count: number = 0,
		offset: number = 0,
	): Shape<T> // eslint-disable-next-line brace-style
	{
		if (Shape._pool.length) {
			const shape: Shape = Shape._pool.pop();

			shape.elements = elements;
			shape.material = material;
			shape.style = style;
			shape.count = count;
			shape.offset = offset;

			return shape as Shape<T>;
		}

		return new Shape<T>(elements, material, style, count, offset);
	}

	public static clearPool() {
		Shape._pool = [];
	}

	public static assetType: string = '[asset Shape]';

	public static quadElement (rect: Rectangle, slices: number = 1, genUv: boolean = false): TriangleElements {

		const verts = [];
		const uvs = [];

		const w = rect.width / slices;
		const h = rect.height / slices;

		const ix = rect.x;
		const iy = rect.y;

		for (let i = 0; i < slices; i++) {
			for (let j = 0; j < slices; j++) {

				const x = ix + j * w;
				const y = iy + i * h;
				const right = x + w;
				const bottom = y + h;

				verts.push(
					x, y , 0,
					right, bottom, 0,
					right, y, 0,

					x, y, 0,
					x, bottom, 0,
					right, bottom, 0,
				);

				if (uvs) {
					uvs.push(
						j / slices, i / slices,
						(j + 1) / slices, (i + 1) / slices,
						(j + 1) / slices, i / slices,

						j / slices, i / slices,
						j / slices, (i + 1) / slices,
						(j + 1) / slices, (i + 1) / slices,
					);
				}

			}
		}

		const elements = new TriangleElements();
		elements.setPositions(verts);
		genUv && elements.setUVs(uvs);

		return elements;
	}

	// legacy
	public static getElement(rectangle: Rectangle): TriangleElements {
		const { x, y, right, bottom } = rectangle;

		const elements = new TriangleElements();

		elements.setPositions(
			[
				x, y, 0,
				right, y, 0,
				right, bottom, 0,

				x, y, 0,
				x, bottom, 0,
				right, bottom, 0,
			]);

		return elements;
	}

	private static _imageShapeElements: Record<string, TriangleElements> = {};
	public static getTriangleElement(rectangle: Rectangle, cache = true, uv = false, slices = 1): TriangleElements {
		const id = rectangle.toString();

		let elements = cache ? this._imageShapeElements[id] : null;

		if (!elements) {
			elements = Shape.quadElement(rectangle, slices, uv);

			if (cache) {
				this._imageShapeElements[id] = elements;
				// remove it from pool, when forget about shared usage
				elements.addEventListener(AssetEvent.CLEAR, () => {
					delete this._imageShapeElements[id];
					elements.usages = 0;
				});
				elements.usages++;
			}
		}

		return elements;
	}

	private _onInvalidatePropertiesDelegate: (event: StyleEvent) => void;
	private _onInvalidateVerticesDelegate: (event: ElementsEvent) => void;

	private _elements: T;
	private _material: IMaterial;
	private _style: Style;

	public usages: number = 0;

	public count: number = 0;

	public offset: number = 0;

	public particleCollection: ParticleCollection = null;

	public originalFillStyle: IGraphicsData = null;

	/**
	 * Process per-triangle hit test - superslow for huge elements
	 */
	public deepHitCheck: boolean = true;

	/**
	 * The Elements object which provides the geometry data for this Shape.
	 */
	public get elements(): T {
		return this._elements;
	}

	public set elements(value: T) {
		if (this._elements == value) return;

		if (this._elements) {
			this._elements.removeEventListener(ElementsEvent.INVALIDATE_VERTICES, this._onInvalidateVerticesDelegate);
			this._elements.usages--;

			if (!this._elements.usages) this._elements.dispose();
		}

		this._elements = value;

		if (this._elements) {
			this._elements.addEventListener(ElementsEvent.INVALIDATE_VERTICES, this._onInvalidateVerticesDelegate);
			this._elements.usages++;
		}

		this.invalidateElements();
	}

	/**
	 *
	 */
	public get assetType(): string {
		return Shape.assetType;
	}

	/**
	 * The material used to render the current Shape.
	 * If set to null, the containing Graphics's material will be used instead.
	 */
	public get material(): IMaterial {
		return this._material;
	}

	public set material(value: IMaterial) {
		if (this._material == value) return;

		this._material = value;

		this.invalidateMaterial();
	}

	/**
	 * The style used to render the current Shape. If set to null, its parent Sprite's style will be used instead.
	 */
	public get style(): Style {
		return this._style;
	}

	public set style(value: Style) {
		if (this._style == value) return;

		if (this._style)
			this._style.removeEventListener(StyleEvent.INVALIDATE_PROPERTIES, this._onInvalidatePropertiesDelegate);

		this._style = value;

		if (this._style)
			this._style.addEventListener(StyleEvent.INVALIDATE_PROPERTIES, this._onInvalidatePropertiesDelegate);

		this.invalidateStyle();
	}

	/**
	 * Creates a new Shape object
	 */
	constructor(
		elements: T,
		material: IMaterial = null,
		style: Style = null,
		count: number = 0,
		offset: number = 0,
	) {
		super();

		this._onInvalidatePropertiesDelegate = (event: StyleEvent) => this._onInvalidateProperties(event);
		this._onInvalidateVerticesDelegate = (event: ElementsEvent) => this._onInvalidateVertices(event);

		this._elements = elements;
		this._elements.addEventListener(ElementsEvent.INVALIDATE_VERTICES, this._onInvalidateVerticesDelegate);
		this._elements.usages++;

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
	public dispose(): void {
		super.clear();

		this.usages = 0;
		this.elements = null;
		this.material = null;
		this.style = null;
		this.particleCollection = null;

		Shape._pool.push(this);
	}

	public invalidateElements(): void {
		this.dispatchEvent(new RenderableEvent(RenderableEvent.INVALIDATE_ELEMENTS, this));
	}

	public invalidateMaterial(): void {
		this.dispatchEvent(new RenderableEvent(RenderableEvent.INVALIDATE_MATERIAL, this));
	}

	public invalidateStyle(): void {
		this.dispatchEvent(new RenderableEvent(RenderableEvent.INVALIDATE_STYLE, this));
	}

	private _onInvalidateProperties(event: StyleEvent): void {
		this.invalidateStyle();
	}

	private _onInvalidateVertices(event: ElementsEvent): void {
		if (event.attributesView != (<TriangleElements>event.target).positions) return;

		this.invalidate();
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

	public applyTransformation(transform: Matrix3D): void {
		this._elements.applyTransformation(transform, this.count, this.offset);
	}

	public scale(scale: number): void {
		this._elements.scale(scale, this.count, this.offset);
	}

	public scaleUV(scaleU: number = 1, scaleV: number = 1): void {
		this._elements.scaleUV(scaleU, scaleV, this.count, this.offset);
	}
}

import { AssetEvent } from '@awayjs/core';

import {
	_Render_RenderableBase,
	RenderEntity,
	_Stage_ElementsBase,
	_Render_MaterialBase,
	MaterialUtils,
	LineElements
} from '@awayjs/renderer';

import { AnimatorBase } from '../animators/AnimatorBase';
import { BitmapFillStyle } from '../draw/BitmapFillStyle';

/**
 * @class away.pool._Render_Shape
 */
export class _Render_Shape extends _Render_RenderableBase {

	private _scaleX: number;
	private _scaleY: number;
	private _scale9Elements: ElementsBase;
	/**
	 *
	 */
	public shape: Shape;

	/**
	 * //TODO
	 *
	 * @param renderEntity
	 * @param shape
	 * @param level
	 * @param indexOffset
	 */
	constructor(shape: Shape, renderEntity: RenderEntity) {
		super(shape, renderEntity);

		this.shape = shape;
	}

	public onClear(event: AssetEvent): void {
		super.onClear(event);

		this.shape = null;
	}

	/**
	 *
	 * @returns {ElementsBase}
	 * @protected
	 */
	protected _getStageElements(): _Stage_ElementsBase {
		this._offset = this.shape.offset;
		this._count = this.shape.count;

		const _scale9Container: IPartitionContainer = this.node.getScale9Container();
		if (_scale9Container) {

			return this.updateScale9(
				_scale9Container.scale9Grid,
				_scale9Container.transform.scale.x,
				_scale9Container.transform.scale.y)
				.getAbstraction<_Stage_ElementsBase>(this._stage);
		}

		const container = (<IRenderContainer> this.node.container);
		const elements = container.animator
			? (<AnimatorBase> container.animator).getRenderableElements(this, this.shape.elements)
			: this.shape.elements;

		return elements.getAbstraction<_Stage_ElementsBase>(this._stage);
	}

	protected _getRenderMaterial(): _Render_MaterialBase {
		const material: IMaterial =
			(<Shape> this._asset).material ||
			(<IRenderContainer> this.node.container).material ||
			this.getDefaultMaterial();

		return material.getAbstraction<_Render_MaterialBase>(this.renderGroup.getRenderElements(this.shape.elements));
	}

	protected _getStyle(): Style {
		return (<Shape> this._asset).style || (<IRenderContainer> this.node.container).style;
	}

	protected getDefaultMaterial(): IMaterial {
		return this.stageElements.elements instanceof LineElements
			? MaterialUtils.getDefaultColorMaterial()
			: MaterialUtils.getDefaultTextureMaterial();
	}

	public updateScale9 (scale9Grid: Rectangle, scaleX: number, scaleY: number): ElementsBase {

		if (!this._scale9Elements) {
			let uvMatrix: Matrix = null;
			let generateUV: boolean = false;

			if (this.shape.originalFillStyle instanceof BitmapFillStyle)
				uvMatrix = this.shape.originalFillStyle.getUVMatrix();

			if (this.shape.elements instanceof TriangleElements) {
				generateUV = !this.shape.elements.uvs && !!uvMatrix;
			}

			// kill UV matrix if we will generate UV
			if (generateUV) {
				this.shape.style.uvMatrix = null;
			}

			const bounds = this.renderGroup.pickGroup
				.getBoundsPicker(this.node.partition)
				.getBoxBounds(this.node, true, true);

			this._scale9Elements = this.shape.elements.prepareScale9(
					<any>bounds, scale9Grid, true, generateUV, uvMatrix);
		}

		if (this._scaleX != scaleX || this._scaleY != scaleY) {
			this._scaleX = scaleX;
			this._scaleY = scaleY;
			this._scale9Elements.updateScale9(scaleX, scaleY);
		}

		return this._scale9Elements;
	}
}

/**
 * @class away.pool._Render_Shape
 */
export class _Pick_Shape extends _Pick_PickableBase {
	private _orientedBoxBounds: Box;
	private _orientedBoxBoundsDirty: boolean = true;
	private _orientedSphereBounds: Sphere;
	private _orientedSphereBoundsDirty = true;

	private _onInvalidateElementsDelegate: (event: RenderableEvent) => void;

	/**
	 * //TODO
	 *
	 * @param renderEntity
	 * @param shape
	 * @param level
	 * @param indexOffset
	 */
	constructor(shape: Shape, pickEntity: PickEntity) {
		super(shape, pickEntity);

		this._onInvalidateElementsDelegate = (event: RenderableEvent) => this._onInvalidateElements(event);

		this._asset.addEventListener(RenderableEvent.INVALIDATE_ELEMENTS, this._onInvalidateElementsDelegate);
	}

	public onInvalidate(event: AssetEvent): void {
		super.onInvalidate(event);

		this._orientedBoxBoundsDirty = true;
		this._orientedSphereBoundsDirty = true;
	}

	private _onInvalidateElements(_event: RenderableEvent): void {
		this._orientedBoxBoundsDirty = true;
		this._orientedSphereBoundsDirty = true;
	}

	public onClear(event: AssetEvent): void {
		this._asset.removeEventListener(RenderableEvent.INVALIDATE_ELEMENTS, this._onInvalidateElementsDelegate);

		super.onClear(event);
	}

	public hitTestPoint(x: number, y: number, z: number): boolean {
		const box: Box = this.getBoxBounds();

		//early out for box test
		if (box == null || !box.contains(x, y, z)) return false;

		return (<Shape> this._asset).elements.hitTestPoint(
			this._view,
			this._node,
			x, y, z,
			box,
			(<Shape> this._asset).count,
			(<Shape> this._asset).offset,
		);
	}

	public getBoxBounds(
		matrix3D: Matrix3D = null,
		strokeFlag: boolean = true,
		cache: Box = null,
		target: Box = null,
	): Box {
		if (matrix3D)
			return (<Shape> this._asset).elements.getBoxBounds(
				this._view,
				this._node,
				strokeFlag,
				matrix3D,
				cache,
				target,
				(<Shape> this._asset).count,
				(<Shape> this._asset).offset,
			);

		if (this._orientedBoxBoundsDirty) {
			this._orientedBoxBoundsDirty = false;

			this._orientedBoxBounds = (<Shape> this._asset).elements.getBoxBounds(
				this._view,
				this._node,
				strokeFlag,
				null,
				this._orientedBoxBounds,
				null,
				(<Shape> this._asset).count,
				(<Shape> this._asset).offset,
			);
		}

		if (this._orientedBoxBounds != null) target = this._orientedBoxBounds.union(target, target || cache);

		return target;
	}

	public getSphereBounds(
		center: Vector3D,
		matrix3D: Matrix3D = null,
		strokeFlag: boolean = true,
		cache: Sphere = null,
		target: Sphere = null,
	): Sphere {
		if (matrix3D)
			return (<Shape> this._asset).elements.getSphereBounds(
				this._view,
				center,
				matrix3D,
				strokeFlag,
				cache,
				target,
				(<Shape> this._asset).count,
				(<Shape> this._asset).offset,
			);

		if (this._orientedSphereBoundsDirty) {
			this._orientedSphereBoundsDirty = false;

			this._orientedSphereBounds = (<Shape> this._asset).elements.getSphereBounds(
				this._view,
				center,
				null,
				strokeFlag,
				this._orientedSphereBounds,
				null,
				(<Shape> this._asset).count,
				(<Shape> this._asset).offset,
			);
		}

		if (this._orientedSphereBounds != null) target = this._orientedSphereBounds.union(target, target || cache);

		return target;
	}

	public testCollision(collision: PickingCollision, findClosestCollision: boolean): boolean {
		const box = this.getBoxBounds();
		const shape = <Shape> this._asset;

		//early out for box test
		if (box == null || !box.rayIntersection(collision.rayPosition, collision.rayDirection))
			return false;

		if (!shape.deepHitCheck) {
			return true;
		}

		return shape.elements.testCollision(
			this._view,
			collision,
			box,
			findClosestCollision,
			(<Shape> this._asset).material || (<IRenderContainer>collision.entityNode.entity).material,
			(<Shape> this._asset).count || (<Shape> this._asset).elements.numVertices,
			(<Shape> this._asset).offset,
		);
	}
}

RenderEntity.registerRenderable(_Render_Shape, Shape);
PickEntity.registerPickable(_Pick_Shape, Shape);
