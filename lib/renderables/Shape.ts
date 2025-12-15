import { Box, Matrix3D, Sphere, Vector3D, AssetBase, Rectangle, Matrix } from '@awayjs/core';

import { PickingCollision, PickEntity, _Pick_PickableBase, IContainer, PickGroup, IPickable } from '@awayjs/view';

import {
	IMaterial,
	StyleEvent,
	Style,
	ElementsEvent,
	IRenderContainer,
	ElementsBase,
	TriangleElements,
	IRenderable
} from '@awayjs/renderer';

import { IFillStyle } from '../draw/IGraphicsData';

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
export class Shape<T extends ElementsBase = ElementsBase> extends AssetBase implements IPickable, IRenderable {
	public _renderObjects: Record<number, _Render_RenderableBase> = {};
	public _pickObjects: Record<number, _Pick_PickableBase> = {};

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

	public originalFillStyle: IFillStyle = null;

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
		for (const key in this._pickObjects)
			this._pickObjects[key]._onInvalidateElements();

		for (const key in this._renderObjects)
			this._renderObjects[key]._onInvalidateElements();
	}

	public invalidateMaterial(): void {
		for (const key in this._renderObjects)
			this._renderObjects[key]._onInvalidateMaterial();
	}

	public invalidateStyle(): void {
		for (const key in this._renderObjects)
			this._renderObjects[key]._onInvalidateStyle();
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
import { BitmapFillStyle } from '../draw/fills/BitmapFillStyle';

/**
 * @class away.pool._Render_Shape
 */
export class _Render_Shape extends _Render_RenderableBase {

	private _scaleX: number;
	private _scaleY: number;
	private _scale9Elements: ElementsBase;

	/**
	 * //TODO
	 *
	 * @param renderEntity
	 * @param shape
	 * @param level
	 * @param indexOffset
	 */
	public init(shape: Shape, renderEntity: RenderEntity): void {
		super.init(shape, renderEntity);
	}

	public onClear(): void {
		super.onClear();

		this._scaleX = null;
		this._scaleY = null;
		this._scale9Elements = null;
	}

	/**
	 *
	 * @returns {ElementsBase}
	 * @protected
	 */
	protected _getStageElements(): _Stage_ElementsBase {
		const shape: Shape = (<Shape> this.renderable);
		this._offset = shape.offset;
		this._count = shape.count;

		const _scale9Container: IContainer = this.entity.node.getScale9Container();
		if (_scale9Container) {

			return this._stage.abstractions
				.getAbstraction<_Stage_ElementsBase>(this.updateScale9(
				_scale9Container.scale9Grid,
				_scale9Container.transform.scale.x,
				_scale9Container.transform.scale.y)
			);
		}

		const container = (<IRenderContainer> this.entity.node.container);
		const elements = container.animator
			? (<AnimatorBase> container.animator).getRenderableElements(this, shape.elements)
			: shape.elements;

		return this._stage.abstractions.getAbstraction<_Stage_ElementsBase>(elements);
	}

	protected _getRenderMaterial(): _Render_MaterialBase {
		const shape: Shape = <Shape> this.renderable;

		return this.entity.renderer
			.getRenderElements(shape.elements).abstractions
			.getAbstraction<_Render_MaterialBase>(
			shape.material
				|| (<IRenderContainer> this.entity.node.container).material
				|| this.getDefaultMaterial()
		);
	}

	protected _getStyle(): Style {
		return this.renderable.style || (<IRenderContainer> this.entity.node.container).style;
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
			const shape = <Shape> this.renderable;

			if (shape.originalFillStyle instanceof BitmapFillStyle)
				uvMatrix = shape.originalFillStyle.getUVMatrix();

			if (shape.elements instanceof TriangleElements) {
				generateUV = !shape.elements.uvs && !!uvMatrix;
			}

			// kill UV matrix if we will generate UV
			if (generateUV) {
				shape.style.uvMatrix = null;
			}

			const bounds = PickGroup.getInstance()
				.getBoundsPicker(this.entity.node)
				.getBoxBounds(this.entity.node, true, true);

			this._scale9Elements = shape.elements.prepareScale9(
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

	public hitTestPoint(x: number, y: number, z: number): boolean {
		const box: Box = this.getBoxBounds();
		const shape = <Shape> this.pickable;

		//early out for box test
		if (box == null || !box.contains(x, y, z)) return false;

		return shape.elements.hitTestPoint(
			(<PickEntity> this._pool).node,
			x, y, z,
			box,
			shape.count,
			shape.offset,
		);
	}

	public getBoxBounds(
		matrix3D: Matrix3D = null,
		strokeFlag: boolean = true,
		cache: Box = null,
		target: Box = null,
	): Box {
		const shape = <Shape> this.pickable;

		if (matrix3D)
			return shape.elements.getBoxBounds(
				(<PickEntity> this._pool).node,
				strokeFlag,
				matrix3D,
				cache,
				target,
				shape.count,
				shape.offset,
			);

		if (this._orientedBoxBoundsDirty) {
			this._orientedBoxBoundsDirty = false;

			this._orientedBoxBounds = shape.elements.getBoxBounds(
				(<PickEntity> this._pool).node,
				strokeFlag,
				null,
				this._orientedBoxBounds,
				null,
				shape.count,
				shape.offset,
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
		const shape = <Shape> this.pickable;

		if (matrix3D)
			return shape.elements.getSphereBounds(
				center,
				matrix3D,
				strokeFlag,
				cache,
				target,
				shape.count,
				shape.offset,
			);

		if (this._orientedSphereBoundsDirty) {
			this._orientedSphereBoundsDirty = false;

			this._orientedSphereBounds = shape.elements.getSphereBounds(
				center,
				null,
				strokeFlag,
				this._orientedSphereBounds,
				null,
				shape.count,
				shape.offset,
			);
		}

		if (this._orientedSphereBounds != null) target = this._orientedSphereBounds.union(target, target || cache);

		return target;
	}

	public testCollision(collision: PickingCollision, findClosestCollision: boolean): boolean {
		const box = this.getBoxBounds();
		const shape = <Shape> this.pickable;

		//early out for box test
		if (box == null || !box.rayIntersection(collision.rayPosition, collision.rayDirection))
			return false;

		if (!shape.deepHitCheck) {
			return true;
		}

		return shape.elements.testCollision(
			collision,
			box,
			findClosestCollision,
			shape.material || (<IRenderContainer>collision.containerNode.container).material,
			shape.count || shape.elements.numVertices,
			shape.offset,
		);
	}
}

RenderEntity.registerRenderable(_Render_Shape, Shape);
PickEntity.registerPickable(_Pick_Shape, Shape);
