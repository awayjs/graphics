import {
	ArgumentError,
	RangeError,
	PartialImplementationError,
	Point,
	Matrix,
	Matrix3D,
	AssetBase,
	Rectangle,
	AssetEvent,
} from '@awayjs/core';

import { BitmapImage2D, ImageSampler } from '@awayjs/stage';

import { IEntityTraverser, PickEntity } from '@awayjs/view';

import {
	IMaterial,
	Style,
	RenderableEvent,
	TriangleElements,
	LineElements,
	LineScaleMode,
} from '@awayjs/renderer';

import { GraphicsPath } from './draw/GraphicsPath';
import { GraphicsFactoryFills } from './draw/GraphicsFactoryFills';
import { GraphicsFactoryStrokes } from './draw/GraphicsFactoryStrokes';
import { GraphicsFactoryHelper } from './draw/GraphicsFactoryHelper';
import { InterpolationMethod } from './draw/InterpolationMethod';
import { JointStyle } from './draw/JointStyle';
import { TriangleCulling } from './draw/TriangleCulling';
import { SpreadMethod } from './draw/SpreadMethod';
import { CapsStyle } from './draw/CapsStyle';
import { GradientType } from './draw/GradientType';
import { BitmapFillStyle } from './draw/BitmapFillStyle';
import { GraphicsPathWinding } from './draw/GraphicsPathWinding';
import { IGraphicsData } from './draw/IGraphicsData';
import { GraphicsStrokeStyle } from './draw/GraphicsStrokeStyle';
import { GraphicsFillStyle } from './draw/GraphicsFillStyle';
import { GradientFillStyle } from './draw/GradientFillStyle';
import { Shape } from './renderables/Shape';
import { SegmentedPath } from './data/SegmentedPath';
import { FillType } from './data/FillType';
import { PathSegment } from './data/PathSegment';
import { assert } from './data/utilities';
import { MaterialManager } from './managers/MaterialManager';
import { ManagedPool } from './ManagedPool';
import { Settings } from './Settings';
import { FillStyle, LineStyle, ShapeStyle } from './flash/ShapeStyle';
import { BBox, ShapeRecord, ShapeRecordFlags, ShapeTag } from './flash/ShapeTag';
import { StyleUtils } from './flash/StyleUtils';

GraphicsFactoryFills.prepareWasm();

const Array_push = Array.prototype.push;
const fromTwips = (val: number) => Math.round(val / 20);

/**
 *
 * Graphics is a collection of Shapes, each of which contain the actual geometrical data such as vertices,
 * normals, uvs, etc. It also contains a reference to an animation class, which defines how the geometry moves.
 * A Graphics object is assigned to a Sprite, a scene graph occurence of the geometry, which in turn assigns
 * the SubGeometries to its respective TriangleGraphic objects.
 *
 *
 *
 *
 * @class Graphics
 */

export class Graphics extends AssetBase {
	private static _pool: Array<Graphics> = new Array<Graphics>();

	public static getShapeForBitmap (
		bitmap: BitmapImage2D,
		rect: Rectangle,
	): Shape<TriangleElements> {

		const mat = MaterialManager.getMaterialForBitmap(bitmap, Settings.EXPEREMENTAL_MATERIAL_FOR_IMAGE);
		const style = mat.style;

		style.sampler = new ImageSampler(false, true, false);
		style.addSamplerAt(style.sampler, mat.getTextureAt(0));

		return Shape.getShape<TriangleElements> (Shape.getTriangleElement(rect, false, true), mat, style);
	}

	public static getShapeForBitmapStyle (shapeStyle: ShapeStyle, flashBox: BBox): Shape<TriangleElements> {

		const style = new Style();
		const rect = new Rectangle(
			fromTwips(flashBox.xMin),
			fromTwips(flashBox.yMin),
			fromTwips(flashBox.xMax - flashBox.xMin),
			fromTwips(flashBox.yMax - flashBox.yMin),
		);

		const element = Shape.getTriangleElement(rect);

		element.usages++;

		const { a, b, c, d, tx, ty } = shapeStyle.transform;
		const texture = shapeStyle.material.getTextureAt(0);
		const mat = MaterialManager.getMaterialForBitmap(
			<BitmapImage2D>texture.getImageAt(0),
			// this will generate special material based on RAW GLSL
			Settings.EXPEREMENTAL_MATERIAL_FOR_IMAGE
		);

		const bitmapFillStyle = new BitmapFillStyle(
			mat,
			new Matrix(a, b, c ,d, tx, ty),
			shapeStyle.repeat,
			shapeStyle.smooth
		);

		const material = bitmapFillStyle.material;
		//enforce image smooth style
		const sampler = new ImageSampler(
			bitmapFillStyle.repeat, bitmapFillStyle.smooth, shapeStyle.smooth);

		material.style.sampler = sampler;
		material.animateUVs = true;

		style.addSamplerAt(sampler, texture);
		style.uvMatrix = bitmapFillStyle.getUVMatrix();

		return Shape.getShape(element, material, style);
	}

	public static getGraphics(): Graphics {
		if (Graphics._pool.length)
			return Graphics._pool.pop();

		return new Graphics();
	}

	public static clearPool() {
		Graphics._pool = [];
	}

	public static assetType: string = '[asset Graphics]';

	private _onInvalidateDelegate: (event: AssetEvent) => void;

	private _bitmapFillPool: NumberMap<BitmapFillStyle> = {};

	private _queuedShapeTags: ShapeTag[] = [];
	private _shapes: Array<Shape> = [];
	private _style: Style;

	private _queued_fill_pathes: Array<GraphicsPath>;
	private _queued_stroke_pathes: Array<GraphicsPath>;
	private _active_fill_path: GraphicsPath;
	private _active_stroke_path: GraphicsPath;
	private _lineStyle: GraphicsFillStyle;
	private _fillStyle: IGraphicsData;

	private _current_position: Point=new Point();

	public tryOptimiseSigleImage: boolean = false;

	private _lastPrebuildedShapes: Shape[] = [];
	private _drawingDirty: boolean = false;

	public usages: number = 0;

	public _start: GraphicsPath[];
	public _end: GraphicsPath[];

	/*private*/ _clearCount: number = 0;
	private _internalShapesId: number[] = [];
	private _rFillPool: ManagedPool<Shape> = new ManagedPool<Shape>(Shape, 100, false);
	private _rStrokePool: ManagedPool<Shape> = new ManagedPool<Shape>(Shape, 100, false);

	private _poolingConfig = {
		fill: Settings.ALLOW_INTERNAL_POOL.FILLS,
		stroke: Settings.ALLOW_INTERNAL_POOL.STROKES,
		clearsCount: Settings.CLEARS_BEFORE_POOLING
	}

	// graphics, from it was copied
	public sourceGraphics: Graphics;

	get start(): GraphicsPath[] {
		if (!this._start && this.sourceGraphics) {
			return this.sourceGraphics.start;
		}

		return this._start;
	}

	get end(): GraphicsPath[] {
		if (!this._end && this.sourceGraphics) {
			return this.sourceGraphics.end;
		}

		return this._end;
	}

	set start(v: GraphicsPath[]) {
		this._start = v;
	}

	set end(v: GraphicsPath[]) {
		this._end = v;
	}

	public get assetType(): string {
		return Graphics.assetType;
	}

	public get count(): number {
		return (
			this._shapes.length +
			this._queued_stroke_pathes.length +
			this._queued_fill_pathes.length +
			this._queuedShapeTags.length);
	}

	public get queued_stroke_pathes(): Array<GraphicsPath> {
		return this._queued_stroke_pathes;
	}

	public set queued_stroke_pathes(value: Array<GraphicsPath>) {
		this._queued_stroke_pathes = value;
	}

	public get queued_fill_pathes(): Array<GraphicsPath> {
		return this._queued_fill_pathes;
	}

	public set queued_fill_pathes(value: Array<GraphicsPath>) {
		this._queued_fill_pathes = value;
	}

	public add_queued_path(value: GraphicsPath, supressFill = false) {
		if (value.style) {
			if (value.style.data_type == GraphicsFillStyle.data_type
				|| value.style.data_type == GradientFillStyle.data_type
				|| value.style.data_type == BitmapFillStyle.data_type) {
				this._drawingDirty = true;
				this._queued_fill_pathes.push(value);
			}
			if (value.style.data_type == GraphicsStrokeStyle.data_type) {
				this._queued_stroke_pathes.push(value);

				if (!supressFill) {
					this.endFill();
				}
			}
		}
	}

	/**
	 * Creates a new Graphics object.
	 */
	constructor() {
		super();

		//store associated entity object, otherwise assign itself as entity

		this._drawingDirty = false;
		this._current_position = new Point();
		this._queued_fill_pathes = [];
		this._queued_stroke_pathes = [];
		this._active_fill_path = null;
		this._active_stroke_path = null;
		this._fillStyle = null;
		this._lineStyle = null;

		this._onInvalidateDelegate = (event: AssetEvent | RenderableEvent) => this._onInvalidate(event);

	}

	/* internal */
	set internalPoolConfig (v: {stroke: boolean, fill: boolean} | boolean) {
		this._poolingConfig.fill = typeof v === 'boolean' ? v : v.fill;
		this._poolingConfig.stroke = typeof v === 'boolean' ? v : v.stroke;

		if (!v) {
			this._rFillPool.enabled && this._rFillPool.clear();
			this._rStrokePool.enabled && this._rStrokePool.clear();

			this._rStrokePool.enabled = false;
			this._rStrokePool.enabled = false;
		}

		this._clearCount = 0;
	}

	get internalPoolConfig () {
		return this._poolingConfig;
	}

	public popEmptyFillShape() {
		return this._rFillPool.pop();
	}

	public popEmptyStrokeShape() {
		return this._rStrokePool.pop();
	}

	/* internal */ addShapeInternal(shape: Shape<any>) {
		this.addShape(shape);
		this._internalShapesId.push(shape.id);
	}

	/**
	 * Adds a GraphicBase wrapping a Elements.
	 *
	 * @param elements
	 */
	public addShape(shape: Shape<any>): Shape {
		shape.usages++;

		const shapeIndex: number = this.getShapeIndex(shape);

		if (shapeIndex != -1)
			this.removeShapeAt(shapeIndex);

		this._shapes.push(shape);

		shape.addEventListener(RenderableEvent.INVALIDATE_ELEMENTS, this._onInvalidateDelegate);
		shape.addEventListener(RenderableEvent.INVALIDATE_MATERIAL, this._onInvalidateDelegate);
		shape.addEventListener(RenderableEvent.INVALIDATE_STYLE, this._onInvalidateDelegate);
		shape.addEventListener(AssetEvent.INVALIDATE, this._onInvalidateDelegate);

		this.invalidate();

		return shape;
	}

	public removeShape(shape: Shape): void {
		const shapeIndex: number = this.getShapeIndex(shape);

		if (shapeIndex == -1)
			throw new ArgumentError('Shape parameter is not a shape of the caller');

		this.removeShapeAt(shapeIndex);
	}

	public removeShapeAt(index: number): void {
		if (index < 0 || index >= this._shapes.length)
			throw new RangeError('Index is out of range');

		const shape: Shape = this._shapes.splice(index, 1)[0];

		shape.removeEventListener(RenderableEvent.INVALIDATE_ELEMENTS, this._onInvalidateDelegate);
		shape.removeEventListener(RenderableEvent.INVALIDATE_MATERIAL, this._onInvalidateDelegate);
		shape.removeEventListener(RenderableEvent.INVALIDATE_STYLE, this._onInvalidateDelegate);
		shape.removeEventListener(AssetEvent.INVALIDATE, this._onInvalidateDelegate);

		shape.usages--;

		if (!shape.usages) {
			if (!this.tryPoolShape(shape)) {
				shape.dispose();
			}
		}

		this.invalidate();
	}

	public getShapeAt(index: number): Shape {
		return this._shapes[index];
	}

	public getShapeIndex(shape: Shape): number {
		return this._shapes.indexOf(<any>shape);
	}

	public applyTransformation(transform: Matrix3D): void {
		const len: number = this._shapes.length;
		for (let i: number = 0; i < len; ++i) {
			this._shapes[i].applyTransformation(transform);

		}
	}

	public copyTo(graphics: Graphics, cloneShapes: boolean = false): void {
		if (this._drawingDirty)
			this.endFill();

		graphics.sourceGraphics = this;

		graphics._addShapes(this._shapes, cloneShapes);
	}

	/**
	 * Scales the geometry.
	 * @param scale The amount by which to scale.
	 */
	public scale(scale: number): void {
		const len: number = this._shapes.length;
		for (let i: number = 0; i < len; ++i)
			this._shapes[i].scale(scale);
	}

	private tryPoolShape(shape: Shape): boolean {
		// not works atm
		// text is bugged
		const canPooledTriangle = shape.elements.assetType === TriangleElements.assetType;
		const canPooledLine = shape.elements.assetType === LineElements.assetType;

		if (!canPooledLine && !canPooledTriangle) {
			return false;
		}

		const index = this._internalShapesId.indexOf(shape.id);

		if (index === -1) {
			return false;
		}

		if (canPooledTriangle) {
			return this._rFillPool.store(shape);
		}

		if (canPooledLine) {
			return this._rStrokePool.store(shape);
		}

		return false;
	}

	public clear(): void {
		this._clearCount++;
		this._lastPrebuildedShapes.length = 0;

		const requireShapePool = (
			this._internalShapesId.length > 0
			&& this._clearCount >= this._poolingConfig.clearsCount);

		if (requireShapePool
			&& (
				this._rStrokePool.enabled !== this._poolingConfig.stroke ||
				this._rFillPool.enabled !== this._poolingConfig.fill
			)) {

			console.warn(
				'[Graphics] To many clears, pooling shapes internally!',
				this.id,
				this._internalShapesId.length);

			this._rFillPool.enabled = this._poolingConfig.fill;
			this._rStrokePool.enabled = this._poolingConfig.stroke;
		}

		let shape: Shape;
		const len: number = this._shapes.length;
		for (let i: number = 0; i < len; i++) {
			shape = this._shapes[i];

			shape.removeEventListener(RenderableEvent.INVALIDATE_ELEMENTS, this._onInvalidateDelegate);
			shape.removeEventListener(RenderableEvent.INVALIDATE_MATERIAL, this._onInvalidateDelegate);
			shape.removeEventListener(RenderableEvent.INVALIDATE_STYLE, this._onInvalidateDelegate);
			shape.removeEventListener(AssetEvent.INVALIDATE, this._onInvalidateDelegate);

			shape.usages--;

			if (!shape.usages) {
				if (!this.tryPoolShape(shape)) {
					shape.dispose();
				}
			}
		}

		this._internalShapesId.length = 0;
		this._shapes.length = 0;

		this.invalidate();

		this._active_fill_path = null;
		this._active_stroke_path = null;
		this._queued_fill_pathes.length = 0;
		this._queued_stroke_pathes.length = 0;
		this._current_position.x = 0;
		this._current_position.y = 0;
		this._drawingDirty = false;
		this._lineStyle = null;
		this._fillStyle = null;
		//this.invalidateElements();
	}

	/**
	 * Clears all resources used by the Graphics object, including SubGeometries.
	 */
	public dispose(): void {
		this.clear();

		if (this._bitmapFillPool) {
			for (const k in this._bitmapFillPool) {
				this._bitmapFillPool[k].material.dispose();
			}

			this._bitmapFillPool = null;
		}

		this._bitmapFillPool = null;

		/* we can not release shapes for this, it was a store elements that can be reused then */

		this._rFillPool.clear();
		this._rStrokePool.clear();
		this._internalShapesId.length = 0;
		this._clearCount = 0;

		Graphics._pool.push(this);
	}

	/**
	 * Scales the uv coordinates (tiling)
	 * @param scaleU The amount by which to scale on the u axis. Default is 1;
	 * @param scaleV The amount by which to scale on the v axis. Default is 1;
	 */
	public scaleUV(scaleU: number = 1, scaleV: number = 1): void {
		const len: number = this._shapes.length;

		for (let i: number = 0; i < len; ++i)
			this._shapes[i].scaleUV(scaleU, scaleV);
	}

	// public invalidateMaterials():void
	// {
	// 	var len:number = this._shapes.length;
	// 	for (var i:number = 0; i < len; ++i)
	// 		this._shapes[i].invalidateMaterial();
	// }

	// public invalidateElements():void
	// {
	// 	var len:number = this._shapes.length;
	// 	for (var i:number = 0; i < len; ++i)
	// 		this._shapes[i].invalidateElements();
	// }

	public _acceptTraverser(traverser: IEntityTraverser): void {
		// this is important
		// not close shape when request bounds
		// otherwise it will corrupt rendering flow
		if (this._drawingDirty) {

			// need to drop shapes that was pre-built but not a closed (_endFillInternal(false))
			// because shape was corrupted when a bounds calculation requested between commands
			for (const s of this._lastPrebuildedShapes) {
				this.removeShape(s);
			}

			if (traverser instanceof PickEntity) {
				// build shape construct shapes but not close graphics
				this._endFillInternal(false);
			} else {
				this.endFill();
			}
		}

		const len = this._shapes.length;
		for (let i: number = len - 1; i >= 0; i--)
			traverser.applyTraversable(this._shapes[i]);

	}

	private _onInvalidate(event: AssetEvent | RenderableEvent): void {
		this.invalidate();
	}

	public draw_fills(clear = true) {
		GraphicsFactoryFills.draw_pathes(this);
		if (clear) {
			this._active_fill_path = null;
			this._queued_fill_pathes.length = 0;
		}
	}

	public draw_strokes(clear = true) {
		GraphicsFactoryStrokes.draw_pathes(this);

		if (clear) {
			this._active_stroke_path = null;
			this._queued_stroke_pathes.length = 0;
		}
	}

	/**
	 * Fills a drawing area with a bitmap image. The bitmap can be repeated or
	 * tiled to fill the area. The fill remains in effect until you call the
	 * <code>beginFill()</code>, <code>beginBitmapFill()</code>,
	 * <code>beginGradientFill()</code>, or <code>beginShaderFill()</code>
	 * method. Calling the <code>clear()</code> method clears the fill.
	 *
	 * <p>The application renders the fill whenever three or more points are
	 * drawn, or when the <code>endFill()</code> method is called. </p>
	 *
	 * @param bitmap A transparent or opaque bitmap image that contains the bits
	 *               to be displayed.
	 * @param matrix A matrix object(of the flash.geom.Matrix class), which you
	 *               can use to define transformations on the bitmap. For
	 *               example, you can use the following matrix to rotate a bitmap
	 *               by 45 degrees(pi/4 radians):
	 * @param repeat If <code>true</code>, the bitmap image repeats in a tiled
	 *               pattern. If <code>false</code>, the bitmap image does not
	 *               repeat, and the edges of the bitmap are used for any fill
	 *               area that extends beyond the bitmap.
	 *
	 *               <p>For example, consider the following bitmap(a 20 x
	 *               20-pixel checkerboard pattern):</p>
	 *
	 *               <p>When <code>repeat</code> is set to <code>true</code>(as
	 *               in the following example), the bitmap fill repeats the
	 *               bitmap:</p>
	 *
	 *               <p>When <code>repeat</code> is set to <code>false</code>,
	 *               the bitmap fill uses the edge pixels for the fill area
	 *               outside the bitmap:</p>
	 * @param smooth If <code>false</code>, upscaled bitmap images are rendered
	 *               by using a nearest-neighbor algorithm and look pixelated. If
	 *               <code>true</code>, upscaled bitmap images are rendered by
	 *               using a bilinear algorithm. Rendering by using the nearest
	 *               neighbor algorithm is faster.
	 */

	public beginBitmapFill(
		bitmap: BitmapImage2D, matrix: Matrix = null,
		repeat: boolean = true, smooth: boolean = false): void {

		this.draw_fills();

		if (!this._bitmapFillPool) {
			this._bitmapFillPool = {};
		}
		let fill = this._bitmapFillPool[bitmap.id];

		if (!fill) {
			fill = this._bitmapFillPool[bitmap.id] = new BitmapFillStyle(
				MaterialManager.getMaterialForBitmap(bitmap),
				matrix,
				repeat,
				smooth);
		} else {
			fill.matrix = matrix;
			fill.repeat = repeat;
			fill.smooth = smooth;
		}

		this._fillStyle = fill;
	}

	/**
	 * Specifies a simple one-color fill that subsequent calls to other Graphics
	 * methods(such as <code>lineTo()</code> or <code>drawCircle()</code>) use
	 * when drawing. The fill remains in effect until you call the
	 * <code>beginFill()</code>, <code>beginBitmapFill()</code>,
	 * <code>beginGradientFill()</code>, or <code>beginShaderFill()</code>
	 * method. Calling the <code>clear()</code> method clears the fill.
	 *
	 * <p>The application renders the fill whenever three or more points are
	 * drawn, or when the <code>endFill()</code> method is called.</p>
	 *
	 * @param color The color of the fill(0xRRGGBB).
	 * @param alpha The alpha value of the fill(0.0 to 1.0).
	 */
	public beginFill(color: number /*int*/, alpha: number = 1): void {
		if (color == 0) {
			color = 0x010101;
		}
		this.draw_fills();
		this._fillStyle = new GraphicsFillStyle(color, alpha);
	}

	/**
	 * Specifies a gradient fill used by subsequent calls to other Graphics
	 * methods(such as <code>lineTo()</code> or <code>drawCircle()</code>) for
	 * the object. The fill remains in effect until you call the
	 * <code>beginFill()</code>, <code>beginBitmapFill()</code>,
	 * <code>beginGradientFill()</code>, or <code>beginShaderFill()</code>
	 * method. Calling the <code>clear()</code> method clears the fill.
	 *
	 * <p>The application renders the fill whenever three or more points are
	 * drawn, or when the <code>endFill()</code> method is called. </p>
	 *
	 * @param type                A value from the GradientType class that
	 *                            specifies which gradient type to use:
	 *                            <code>GradientType.LINEAR</code> or
	 *                            <code>GradientType.RADIAL</code>.
	 * @param colors              An array of RGB hexadecimal color values used
	 *                            in the gradient; for example, red is 0xFF0000,
	 *                            blue is 0x0000FF, and so on. You can specify
	 *                            up to 15 colors. For each color, specify a
	 *                            corresponding value in the alphas and ratios
	 *                            parameters.
	 * @param alphas              An array of alpha values for the corresponding
	 *                            colors in the colors array; valid values are 0
	 *                            to 1. If the value is less than 0, the default
	 *                            is 0. If the value is greater than 1, the
	 *                            default is 1.
	 * @param ratios              An array of color distribution ratios; valid
	 *                            values are 0-255. This value defines the
	 *                            percentage of the width where the color is
	 *                            sampled at 100%. The value 0 represents the
	 *                            left position in the gradient box, and 255
	 *                            represents the right position in the gradient
	 *                            box.
	 * @param matrix              A transformation matrix as defined by the
	 *                            flash.geom.Matrix class. The flash.geom.Matrix
	 *                            class includes a
	 *                            <code>createGradientBox()</code> method, which
	 *                            lets you conveniently set up the matrix for use
	 *                            with the <code>beginGradientFill()</code>
	 *                            method.
	 * @param spreadMethod        A value from the SpreadMethod class that
	 *                            specifies which spread method to use, either:
	 *                            <code>SpreadMethod.PAD</code>,
	 *                            <code>SpreadMethod.REFLECT</code>, or
	 *                            <code>SpreadMethod.REPEAT</code>.
	 *
	 *                            <p>For example, consider a simple linear
	 *                            gradient between two colors:</p>
	 *
	 *                            <p>This example uses
	 *                            <code>SpreadMethod.PAD</code> for the spread
	 *                            method, and the gradient fill looks like the
	 *                            following:</p>
	 *
	 *                            <p>If you use <code>SpreadMethod.REFLECT</code>
	 *                            for the spread method, the gradient fill looks
	 *                            like the following:</p>
	 *
	 *                            <p>If you use <code>SpreadMethod.REPEAT</code>
	 *                            for the spread method, the gradient fill looks
	 *                            like the following:</p>
	 * @param interpolationMethod A value from the InterpolationMethod class that
	 *                            specifies which value to use:
	 *                            <code>InterpolationMethod.LINEAR_RGB</code> or
	 *                            <code>InterpolationMethod.RGB</code>
	 *
	 *                            <p>For example, consider a simple linear
	 *                            gradient between two colors(with the
	 *                            <code>spreadMethod</code> parameter set to
	 *                            <code>SpreadMethod.REFLECT</code>). The
	 *                            different interpolation methods affect the
	 *                            appearance as follows: </p>
	 * @param focalPointRatio     A number that controls the location of the
	 *                            focal point of the gradient. 0 means that the
	 *                            focal point is in the center. 1 means that the
	 *                            focal point is at one border of the gradient
	 *                            circle. -1 means that the focal point is at the
	 *                            other border of the gradient circle. A value
	 *                            less than -1 or greater than 1 is rounded to -1
	 *                            or 1. For example, the following example shows
	 *                            a <code>focalPointRatio</code> set to 0.75:
	 * @throws ArgumentError If the <code>type</code> parameter is not valid.
	 */
	public beginGradientFill(
		type: GradientType, colors: number[],
		alphas: number[], ratios: number[],
		matrix: Matrix = null, spreadMethod: string = 'pad',
		interpolationMethod: string = 'rgb', focalPointRatio: number = 0): void {

		this.draw_fills();
		this._fillStyle = new GradientFillStyle(
			type,
			colors,
			alphas,
			ratios,
			matrix,
			spreadMethod,
			interpolationMethod,
			focalPointRatio);
	}

	/**
	 * Copies all of drawing commands from the source Graphics object into the
	 * calling Graphics object.
	 *
	 * @param sourceGraphics The Graphics object from which to copy the drawing
	 *                       commands.
	 */
	public copyFrom(sourceGraphics: Graphics): void {
		sourceGraphics.copyTo(this);
	}

	/**
	 * Draws a cubic Bezier curve from the current drawing position to the
	 * specified anchor point. Cubic Bezier curves consist of two anchor points
	 * and two control points. The curve interpolates the two anchor points and
	 * curves toward the two control points.
	 *
	 * The four points you use to draw a cubic Bezier curve with the
	 * <code>cubicCurveTo()</code> method are as follows:
	 *
	 * <ul>
	 *   <li>The current drawing position is the first anchor point. </li>
	 *   <li>The anchorX and anchorY parameters specify the second anchor point.
	 *   </li>
	 *   <li>The <code>controlX1</code> and <code>controlY1</code> parameters
	 *   specify the first control point.</li>
	 *   <li>The <code>controlX2</code> and <code>controlY2</code> parameters
	 *   specify the second control point.</li>
	 * </ul>
	 *
	 * If you call the <code>cubicCurveTo()</code> method before calling the
	 * <code>moveTo()</code> method, your curve starts at position (0, 0).
	 *
	 * If the <code>cubicCurveTo()</code> method succeeds, the Flash runtime sets
	 * the current drawing position to (<code>anchorX</code>,
	 * <code>anchorY</code>). If the <code>cubicCurveTo()</code> method fails,
	 * the current drawing position remains unchanged.
	 *
	 * If your movie clip contains content created with the Flash drawing tools,
	 * the results of calls to the <code>cubicCurveTo()</code> method are drawn
	 * underneath that content.
	 *
	 * @param controlX1 Specifies the horizontal position of the first control
	 *                  point relative to the registration point of the parent
	 *                  display object.
	 * @param controlY1 Specifies the vertical position of the first control
	 *                  point relative to the registration point of the parent
	 *                  display object.
	 * @param controlX2 Specifies the horizontal position of the second control
	 *                  point relative to the registration point of the parent
	 *                  display object.
	 * @param controlY2 Specifies the vertical position of the second control
	 *                  point relative to the registration point of the parent
	 *                  display object.
	 * @param anchorX   Specifies the horizontal position of the anchor point
	 *                  relative to the registration point of the parent display
	 *                  object.
	 * @param anchorY   Specifies the vertical position of the anchor point
	 *                  relative to the registration point of the parent display
	 *                  object.
	 */
	public cubicCurveTo(
		controlX1: number, controlY1: number,
		controlX2: number, controlY2: number,
		anchorX: number, anchorY: number): void {

		throw new PartialImplementationError('cubicCurveTo');
		/*
		 t = 0.5; // given example value
		 x = (1 - t) * (1 - t) * p[0].x + 2 * (1 - t) * t * p[1].x + t * t * p[2].x;
		 y = (1 - t) * (1 - t) * p[0].y + 2 * (1 - t) * t * p[1].y + t * t * p[2].y;

		 this.queued_command_types.push(Graphics.CMD_BEZIER);
		 this.queued_command_data.push(controlX1);
		 this.queued_command_data.push(controlY1);
		 this.queued_command_data.push(controlX2);
		 this.queued_command_data.push(controlY2);
		 this.queued_command_data.push(anchorX);
		 this.queued_command_data.push(anchorY);

		 // todo: somehow convert cubic bezier curve into 2 quadric curves...

		 this.draw_direction+=0;
		 */

	}

	/**
	 * Draws a curve using the current line style from the current drawing
	 * position to(anchorX, anchorY) and using the control point that
	 * (<code>controlX</code>, <code>controlY</code>) specifies. The current
	 * drawing position is then set to(<code>anchorX</code>,
	 * <code>anchorY</code>). If the movie clip in which you are drawing contains
	 * content created with the Flash drawing tools, calls to the
	 * <code>curveTo()</code> method are drawn underneath this content. If you
	 * call the <code>curveTo()</code> method before any calls to the
	 * <code>moveTo()</code> method, the default of the current drawing position
	 * is(0, 0). If any of the parameters are missing, this method fails and the
	 * current drawing position is not changed.
	 *
	 * <p>The curve drawn is a quadratic Bezier curve. Quadratic Bezier curves
	 * consist of two anchor points and one control point. The curve interpolates
	 * the two anchor points and curves toward the control point. </p>
	 *
	 * @param controlX A number that specifies the horizontal position of the
	 *                 control point relative to the registration point of the
	 *                 parent display object.
	 * @param controlY A number that specifies the vertical position of the
	 *                 control point relative to the registration point of the
	 *                 parent display object.
	 * @param anchorX  A number that specifies the horizontal position of the
	 *                 next anchor point relative to the registration point of
	 *                 the parent display object.
	 * @param anchorY  A number that specifies the vertical position of the next
	 *                 anchor point relative to the registration point of the
	 *                 parent display object.
	 */
	public curveTo(controlX: number, controlY: number, anchorX: number, anchorY: number): void {

		this._drawingDirty = true;

		this._createGraphicPathes();

		if (this._active_fill_path != null) {
			this._active_fill_path.curveTo(controlX, controlY, anchorX, anchorY);
		}
		if (this._active_stroke_path != null) {
			this._active_stroke_path.curveTo(controlX, controlY, anchorX, anchorY);
		}
		this._current_position.x = anchorX;
		this._current_position.y = anchorY;
		this.invalidate();
	}

	/**
	 * Draws a circle. Set the line style, fill, or both before you call the
	 * <code>drawCircle()</code> method, by calling the <code>linestyle()</code>,
	 * <code>lineGradientStyle()</code>, <code>beginFill()</code>,
	 * <code>beginGradientFill()</code>, or <code>beginBitmapFill()</code>
	 * method.
	 *
	 * @param x      The <i>x</i> location of the center of the circle relative
	 *               to the registration point of the parent display object(in
	 *               pixels).
	 * @param y      The <i>y</i> location of the center of the circle relative
	 *               to the registration point of the parent display object(in
	 *               pixels).
	 * @param radius The radius of the circle(in pixels).
	 */
	public drawCircle(x: number, y: number, radius: number): void {
		this._drawingDirty = true;
		this._createGraphicPathes();
		//var radius2=radius*1.065;
		if (this._active_fill_path != null) {
			this._active_fill_path.moveTo(x, y);

			let r = radius;
			if (this._active_stroke_path != null) {
				r -= (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness / 2;
			}
			GraphicsFactoryHelper.drawElipse(x, y, r, r, this._active_fill_path.verts, 0, 360, 5, false);

		}
		if (this._active_stroke_path != null) {

			GraphicsFactoryHelper.drawElipseStrokes(x, y, radius, radius, this._active_stroke_path , 0, 360, 2);

		}
		this.invalidate();
	}

	/**
	 * Draws an ellipse. Set the line style, fill, or both before you call the
	 * <code>drawEllipse()</code> method, by calling the
	 * <code>linestyle()</code>, <code>lineGradientStyle()</code>,
	 * <code>beginFill()</code>, <code>beginGradientFill()</code>, or
	 * <code>beginBitmapFill()</code> method.
	 *
	 * @param x      The <i>x</i> location of the top-left of the bounding-box of
	 *               the ellipse relative to the registration point of the parent
	 *               display object(in pixels).
	 * @param y      The <i>y</i> location of the top left of the bounding-box of
	 *               the ellipse relative to the registration point of the parent
	 *               display object(in pixels).
	 * @param width  The width of the ellipse(in pixels).
	 * @param height The height of the ellipse(in pixels).
	 */
	public drawEllipse(x: number, y: number, width: number, height: number): void {
		this._drawingDirty = true;
		this._createGraphicPathes();

		width /= 2;
		height /= 2;
		x += width;
		y += height;

		if (this._active_fill_path != null) {
			this._active_fill_path.moveTo(x, y);

			let w = width;
			let h = height;

			if (this._active_stroke_path != null) {
				w -= (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness / 2;
				h -= (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness / 2;
			}

			GraphicsFactoryHelper.drawElipse(x, y, w, h, this._active_fill_path.verts, 0, 360, 6, false);

		}

		if (this._active_stroke_path != null) {
			GraphicsFactoryHelper.drawElipseStrokes(x, y, width, height, this._active_stroke_path , 0, 360, 2);
		}

		this.invalidate();

	}

	/**
	 * Submits a series of IGraphicsData instances for drawing. This method
	 * accepts a Vector containing objects including paths, fills, and strokes
	 * that implement the IGraphicsData interface. A Vector of IGraphicsData
	 * instances can refer to a part of a shape, or a complex fully defined set
	 * of data for rendering a complete shape.
	 *
	 * <p> Graphics paths can contain other graphics paths. If the
	 * <code>graphicsData</code> Vector includes a path, that path and all its
	 * sub-paths are rendered during this operation. </p>
	 *
	 */
	public drawGraphicsData(graphicsData: Array<IGraphicsData>): void {
		//this.draw_fills();
		/*
		 for (var i:number=0; i<graphicsData.length; i++){
		 //todo
		 if(graphicsData[i].dataType=="beginFill"){

		 }
		 else if(graphicsData[i].dataType=="endFill"){

		 }
		 else if(graphicsData[i].dataType=="endFill"){

		 }
		 else if(graphicsData[i].dataType=="Path"){

		 }

		 }
		 */

	}

	/**
	 * Submits a series of commands for drawing. The <code>drawPath()</code>
	 * method uses vector arrays to consolidate individual <code>moveTo()</code>,
	 * <code>lineTo()</code>, and <code>curveTo()</code> drawing commands into a
	 * single call. The <code>drawPath()</code> method parameters combine drawing
	 * commands with x- and y-coordinate value pairs and a drawing direction. The
	 * drawing commands are values from the GraphicsPathCommand class. The x- and
	 * y-coordinate value pairs are Numbers in an array where each pair defines a
	 * coordinate location. The drawing direction is a value from the
	 * GraphicsPathWinding class.
	 *
	 * <p> Generally, drawings render faster with <code>drawPath()</code> than
	 * with a series of individual <code>lineTo()</code> and
	 * <code>curveTo()</code> methods. </p>
	 *
	 * <p> The <code>drawPath()</code> method uses a uses a floating computation
	 * so rotation and scaling of shapes is more accurate and gives better
	 * results. However, curves submitted using the <code>drawPath()</code>
	 * method can have small sub-pixel alignment errors when used in conjunction
	 * with the <code>lineTo()</code> and <code>curveTo()</code> methods. </p>
	 *
	 * <p> The <code>drawPath()</code> method also uses slightly different rules
	 * for filling and drawing lines. They are: </p>
	 *
	 * <ul>
	 *   <li>When a fill is applied to rendering a path:
	 * <ul>
	 *   <li>A sub-path of less than 3 points is not rendered.(But note that the
	 * stroke rendering will still occur, consistent with the rules for strokes
	 * below.)</li>
	 *   <li>A sub-path that isn't closed(the end point is not equal to the
	 * begin point) is implicitly closed.</li>
	 * </ul>
	 * </li>
	 *   <li>When a stroke is applied to rendering a path:
	 * <ul>
	 *   <li>The sub-paths can be composed of any number of points.</li>
	 *   <li>The sub-path is never implicitly closed.</li>
	 * </ul>
	 * </li>
	 * </ul>
	 *
	 * @param winding Specifies the winding rule using a value defined in the
	 *                GraphicsPathWinding class.
	 */
	public drawPath(commands: Array<number /*int*/>, data: Array<number>, winding: GraphicsPathWinding): void {
		//todo
		/*
		 if(this._active_fill_path!=null){
		 this._active_fill_path.curveTo(controlX, controlY, anchorX, anchorY);
		 }
		 if(this._active_stroke_path!=null){
		 this._active_stroke_path.curveTo(controlX, controlY, anchorX, anchorY);
		 }
		 this._current_position.x=anchorX;
		 this._current_position.y=anchorY;
		 */

	}

	/**
	 * Draws a rectangle. Set the line style, fill, or both before you call the
	 * <code>drawRect()</code> method, by calling the <code>linestyle()</code>,
	 * <code>lineGradientStyle()</code>, <code>beginFill()</code>,
	 * <code>beginGradientFill()</code>, or <code>beginBitmapFill()</code>
	 * method.
	 *
	 * @param x      A number indicating the horizontal position relative to the
	 *               registration point of the parent display object(in pixels).
	 * @param y      A number indicating the vertical position relative to the
	 *               registration point of the parent display object(in pixels).
	 * @param width  The width of the rectangle(in pixels).
	 * @param height The height of the rectangle(in pixels).
	 * @throws ArgumentError If the <code>width</code> or <code>height</code>
	 *                       parameters are not a number
	 *                      (<code>Number.NaN</code>).
	 */
	public drawRect(x: number, y: number, width: number, height: number): void {
		this._drawingDirty = true;
		this._createGraphicPathes();
		if (this._active_fill_path != null) {
			this._active_fill_path.moveTo(x, y);
			/*
			this._active_fill_path.lineTo(x+width, y);
			this._active_fill_path.lineTo(x+width, y+height);
			this._active_fill_path.lineTo(x, y+height);
			this._active_fill_path.lineTo(x, y);
			*/
			let w: number = width;
			let h: number = height;
			let t: number = 0;

			if (this._active_stroke_path != null) {
				t = (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness / 2;
				w -= (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness;
				h -= (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness;
			}

			GraphicsFactoryHelper.addTriangle(
				x + t, y + h + t,
				x + t, y + t,
				x + w + t, y + t,
				0,
				this._active_fill_path.verts,
				false);

			GraphicsFactoryHelper.addTriangle(
				x + t, y + h + t,
				x + t + w, y + t,
				x + w + t, y + h + t,
				0,
				this._active_fill_path.verts,
				false);

			// mark that is simple rect, other internal changes will reset it
			this._active_fill_path.isSimpleRect = true;
		}
		if (this._active_stroke_path != null) {
			this._active_stroke_path.moveTo(x, y);
			//var t:number=(<GraphicsStrokeStyle>this._active_stroke_path.style).thickness/2;

			/* eslint-disable */

			// todo: respect Jointstyle here (?)
			/*
			GraphicsFactoryHelper.addTriangle(x-t, y+height+t, x-t, y-t, x+t, y+t, 0, this._active_stroke_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x-t, y+height+t, x+t, y+height-t, x+t, y+t, 0, this._active_stroke_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x-t, y-t, x+width+t, y-t, x+t, y+t, 0, this._active_stroke_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x+t, y+t, x+width+t, y-t, x+width-t, y+t, 0, this._active_stroke_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x+width-t, y+height-t, x+width-t, y+t, x+width+t, y+height+t, 0, this._active_stroke_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x+width+t, y+height+t, x+width+t, y-t, x+width-t, y+t, 0, this._active_stroke_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x-t, y+height+t, x+width+t, y+height+t, x+t, y+height-t, 0, this._active_stroke_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x+t, y+height-t, x+width+t, y+height+t, x+width-t, y+height-t, 0, this._active_stroke_path.verts, false);
			*/

			/* eslint-enable */

			this._active_stroke_path.lineTo(x + width, y);
			this._active_stroke_path.lineTo(x + width, y + height);
			this._active_stroke_path.lineTo(x, y + height);
			this._active_stroke_path.lineTo(x, y);

		}
		this.invalidate();
	}

	/**
	 * Draws a rounded rectangle. Set the line style, fill, or both before you
	 * call the <code>drawRoundRect()</code> method, by calling the
	 * <code>linestyle()</code>, <code>lineGradientStyle()</code>,
	 * <code>beginFill()</code>, <code>beginGradientFill()</code>, or
	 * <code>beginBitmapFill()</code> method.
	 *
	 * @param x             A number indicating the horizontal position relative
	 *                      to the registration point of the parent display
	 *                      object(in pixels).
	 * @param y             A number indicating the vertical position relative to
	 *                      the registration point of the parent display object
	 *                     (in pixels).
	 * @param width         The width of the round rectangle(in pixels).
	 * @param height        The height of the round rectangle(in pixels).
	 * @param ellipseWidth  The width of the ellipse used to draw the rounded
	 *                      corners(in pixels).
	 * @param ellipseHeight The height of the ellipse used to draw the rounded
	 *                      corners(in pixels). Optional; if no value is
	 *                      specified, the default value matches that provided
	 *                      for the <code>ellipseWidth</code> parameter.
	 * @throws ArgumentError If the <code>width</code>, <code>height</code>,
	 *                       <code>ellipseWidth</code> or
	 *                       <code>ellipseHeight</code> parameters are not a
	 *                       number(<code>Number.NaN</code>).
	 */
	public drawRoundRect(
		x: number, y: number,
		width: number, height: number,
		ellipseWidth: number, ellipseHeight: number = NaN): void {

		this._drawingDirty = true;
		this._createGraphicPathes();

		if (isNaN(ellipseHeight)) {
			ellipseHeight = ellipseWidth;
		}

		let w: number = width;
		let h: number = height;
		const ew: number = ellipseWidth / 2;
		const eh: number = ellipseHeight / 2;
		let t: number = 0;

		if (this._active_fill_path != null) {
			this._active_fill_path.moveTo(x, y);
			if (this._active_stroke_path != null) {
				t = (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness / 2;
				w -= (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness;
				h -= (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness;
			}

			/* eslint-disable */
			GraphicsFactoryHelper.addTriangle(x + t,y + h - eh, x + t,y + eh, x + w - t, y + eh,0, this._active_fill_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + t,y + h - eh,  x + w - t,y + eh,x + w - t, y + h - eh, 0, this._active_fill_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x + ew,y + t, x + w - ew, y + eh,x + ew,y + eh, 0, this._active_fill_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + ew,y + t, x + w - ew, y + t, x + w - ew,y + eh,0, this._active_fill_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + ew,y + h - eh, x + w - ew, y + h - t,x + ew,y + h - t, 0, this._active_fill_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + ew,y + h - eh, x + w - ew, y + h - eh, x + w - ew,y + h - t,0, this._active_fill_path.verts, false);

			GraphicsFactoryHelper.drawElipse(x + ew,y + eh, ew - t, eh - t, this._active_fill_path.verts, 180, 270, 5, false);
			GraphicsFactoryHelper.drawElipse(x + w - ew,y + eh, ew - t, eh - t, this._active_fill_path.verts, 270, 360, 5, false);
			GraphicsFactoryHelper.drawElipse(x + w - ew,y + h - eh, ew - t, eh - t, this._active_fill_path.verts, 0, 90, 5, false);
			GraphicsFactoryHelper.drawElipse(x + ew,y + h - eh, ew - t, eh - t, this._active_fill_path.verts, 90, 180, 5, false);
			/* eslint-enable */
		}
		if (this._active_stroke_path != null) {
			this._active_stroke_path.moveTo(x + ew, y);

			/* eslint-disable */
			
			this._active_stroke_path.lineTo(x + w - ew, y);
			GraphicsFactoryHelper.drawElipseStrokes(x + w - ew, y + eh, ew, eh, this._active_stroke_path, 270, 360, 2);
			this._active_stroke_path.lineTo(x + w, y + h - eh);
			GraphicsFactoryHelper.drawElipseStrokes(x + w - ew, y + h - eh, ew, eh, this._active_stroke_path, 0, 90, 2);
			this._active_stroke_path.lineTo(x + ew, y + h);
			GraphicsFactoryHelper.drawElipseStrokes(x + ew, y + h - eh, ew, eh, this._active_stroke_path, 90, 180, 2);
			this._active_stroke_path.lineTo(x, y + eh);
			GraphicsFactoryHelper.drawElipseStrokes(x + ew, y + eh, ew, eh, this._active_stroke_path, 180, 270, 2);
			/* eslint-enable */

		}

		this.invalidate();
	}

	public drawRoundRectComplex(
		x: number, y: number,
		width: number, height: number,
		topLeftRadius: number, topRightRadius: number,
		bottomLeftRadius: number, bottomRightRadius: number) {

		let w: number = width;
		let h: number = height;
		const tl: number = topLeftRadius;
		const tr: number = topRightRadius;
		const bl: number = bottomLeftRadius;
		const br: number = bottomRightRadius;
		this._drawingDirty = true;
		this._createGraphicPathes();
		let t: number = 0;
		if (this._active_fill_path != null) {
			this._active_fill_path.moveTo(x, y);

			if (this._active_stroke_path != null) {
				t = (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness / 2;
				w -= (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness;
				h -= (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness;
			}

			/* eslint-disable */
			GraphicsFactoryHelper.addTriangle(x + tl,y + tl, x + w - tr, y + tr, x + w - br, y + h - br, 0, this._active_fill_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + tl,y + tl,  x + w - br, y + h - br, x + bl, y + h - bl, 0, this._active_fill_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x + t,y + tl,x + tl,y + tl, x + t,y + h - bl, 0, this._active_fill_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + tl,y + tl, x + t,y + h - bl,  x + bl,y + h - bl, 0, this._active_fill_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x + tl,y + t,x + tl,y + tl, x + w - tr,y + t, 0, this._active_fill_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + tl,y + tl, x + w - tr,y + tr,  x + w - tr,y + t, 0, this._active_fill_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x + w - t,y + tr,x + w - tr,y + tr, x + w - t,y + h - br, 0, this._active_fill_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + w - tr,y + tr,  x + w - br,y + h - br, x + w - t,y + h - br, 0, this._active_fill_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x + bl,y + h - t, x + w - br,y + h - t,x + bl,y + h - bl, 0, this._active_fill_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + bl,y + h - bl,  x + w - br,y + h - t, x + w - br,y + h - br, 0, this._active_fill_path.verts, false);

			GraphicsFactoryHelper.drawElipse(x + tl,y + tl, tl - t, tl - t, this._active_fill_path.verts, 180, 270, 5, false);
			GraphicsFactoryHelper.drawElipse(x + w - tr,y + tr, tr - t, tr - t, this._active_fill_path.verts, 270, 360, 5, false);
			GraphicsFactoryHelper.drawElipse(x + w - br,y + h - br, br - t, br - t, this._active_fill_path.verts, 0, 90, 5, false);
			GraphicsFactoryHelper.drawElipse(x + bl,y + h - bl, bl - t, bl - t, this._active_fill_path.verts, 90, 180, 5, false);
			/* eslint-enable */
		}

		if (this._active_stroke_path != null) {
			this._active_stroke_path.moveTo(x, y);
			t = (<GraphicsStrokeStyle> this._active_stroke_path.style).thickness / 2;

			console.warn('[Graphics] - drawRoundRectComplex for strokes currently disabled');

			/* eslint-disable */
			/*
			GraphicsFactoryHelper.addTriangle(x - t, y + h - bl, x - t, y + tl, x + t, y + tl, 0, this._active_stroke_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x - t, y + h - bl, x + t, y + h - bl, x + t, y + tl, 0, this._active_stroke_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x + tl, y - t, x + w - tr, y - t, x + tr, y + t, 0, this._active_stroke_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + tl, y + t, x + w - tr, y - t, x + w - tr, y + t, 0, this._active_stroke_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x + w - t, y + h - br, x + w - t, y + tr, x + w + t, y + h - br, 0, this._active_stroke_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + w + t, y + h - br, x + w + t, y + tr, x + w - t, y + tr, 0, this._active_stroke_path.verts, false);

			GraphicsFactoryHelper.addTriangle(x + bl, y + h + t, x + w - br, y + h + t, x + bl, y + h - t, 0, this._active_stroke_path.verts, false);
			GraphicsFactoryHelper.addTriangle(x + bl, y + h - t, x + w - br, y + h + t, x + w - br, y + h - t, 0, this._active_stroke_path.verts, false);

			GraphicsFactoryHelper.drawElipseStrokes(x + tl,y + tl, tl, tl, this._active_stroke_path.verts, 180, 270, 5, t, false);
			GraphicsFactoryHelper.drawElipseStrokes(x + w - tr,y + tr, tr, tr, this._active_stroke_path.verts, 270, 360, 5, t, false);
			GraphicsFactoryHelper.drawElipseStrokes(x + w - br,y + h - br, br, br, this._active_stroke_path.verts, 0, 90, 5, t, false);
			GraphicsFactoryHelper.drawElipseStrokes(x + bl,y + h - bl, bl, bl, this._active_stroke_path.verts, 90, 180, 5, t, false);
			*/
			/* eslint-enable */
		}

		this.invalidate();
	}

	/**
	 * Renders a set of triangles, typically to distort bitmaps and give them a
	 * three-dimensional appearance. The <code>drawTriangles()</code> method maps
	 * either the current fill, or a bitmap fill, to the triangle faces using a
	 * set of(u,v) coordinates.
	 *
	 * <p> Any type of fill can be used, but if the fill has a transform matrix
	 * that transform matrix is ignored. </p>
	 *
	 * <p> A <code>uvtData</code> parameter improves texture mapping when a
	 * bitmap fill is used. </p>
	 *
	 * @param culling Specifies whether to render triangles that face in a
	 *                specified direction. This parameter prevents the rendering
	 *                of triangles that cannot be seen in the current view. This
	 *                parameter can be set to any value defined by the
	 *                TriangleCulling class.
	 */
	public drawTriangles(
		vertices: Array<number>,
		indices: Array<number /*int*/> = null,
		uvtData: Array<number> = null, culling: TriangleCulling = null): void {

		this._drawingDirty = true;
		if (this._active_fill_path != null) {
			//todo
		}
		if (this._active_stroke_path != null) {
			//todo
		}

	}

	/**
	 * Applies a fill to the lines and curves that were added since the last call
	 * to the <code>beginFill()</code>, <code>beginGradientFill()</code>, or
	 * <code>beginBitmapFill()</code> method. Flash uses the fill that was
	 * specified in the previous call to the <code>beginFill()</code>,
	 * <code>beginGradientFill()</code>, or <code>beginBitmapFill()</code>
	 * method. If the current drawing position does not equal the previous
	 * position specified in a <code>moveTo()</code> method and a fill is
	 * defined, the path is closed with a line and then filled.
	 *
	 */
	public endFill(): void {

		/**
		 * @todo this is a hack for getting stroke pathes closed if a fill_path exists.
		 * Needs refactor to make this work correctly
		 */

		if (this._active_stroke_path && this._active_fill_path) {
			this._active_stroke_path.forceClose = true;
		}

		this._endFillInternal(true);

		this._active_fill_path = null;
		this._active_stroke_path = null;
		//this._lineStyle=null;
		this._fillStyle = null;
		//this.invalidate();
		//this.invalidateElements();
	}

	private _endFillInternal(clear = false) {
		//execute any queued shapetags
		if (this._queuedShapeTags.length) {

			const localQueue = this._queuedShapeTags;
			const len = localQueue.length;

			this._queuedShapeTags = [];

			for (let i: number = 0; i < len; i++)
				this.convertRecordsToShapeData(localQueue[i]);

			localQueue.length = 0;
		}

		const lastShapes = this._shapes.length;

		this.draw_fills(clear);
		this.draw_strokes(clear);

		if (!clear) {
			for (let i = lastShapes; i < this._shapes.length; i++) {
				this._lastPrebuildedShapes[i - lastShapes] = this._shapes[i];
			}
			this._lastPrebuildedShapes.length = this._shapes.length - lastShapes;
		} else {
			this._lastPrebuildedShapes.length = 0;
		}

		this._drawingDirty = false;
	}

	/**
	 * Specifies a bitmap to use for the line stroke when drawing lines.
	 *
	 * <p>The bitmap line style is used for subsequent calls to Graphics methods
	 * such as the <code>lineTo()</code> method or the <code>drawCircle()</code>
	 * method. The line style remains in effect until you call the
	 * <code>lineStyle()</code> or <code>lineGradientStyle()</code> methods, or
	 * the <code>lineBitmapStyle()</code> method again with different parameters.
	 * </p>
	 *
	 * <p>You can call the <code>lineBitmapStyle()</code> method in the middle of
	 * drawing a path to specify different styles for different line segments
	 * within a path. </p>
	 *
	 * <p>Call the <code>lineStyle()</code> method before you call the
	 * <code>lineBitmapStyle()</code> method to enable a stroke, or else the
	 * value of the line style is <code>undefined</code>.</p>
	 *
	 * <p>Calls to the <code>clear()</code> method set the line style back to
	 * <code>undefined</code>. </p>
	 *
	 * @param bitmap The bitmap to use for the line stroke.
	 * @param matrix An optional transformation matrix as defined by the
	 *               flash.geom.Matrix class. The matrix can be used to scale or
	 *               otherwise manipulate the bitmap before applying it to the
	 *               line style.
	 * @param repeat Whether to repeat the bitmap in a tiled fashion.
	 * @param smooth Whether smoothing should be applied to the bitmap.
	 */
	public lineBitmapStyle(
		bitmap: BitmapImage2D, matrix: Matrix = null,
		repeat: boolean = true, smooth: boolean = false): void {

		//this._drawingDirty=true;
		//this._lineStyle=new  GraphicsStrokeStyle(colors[0], alphas[0], 1);
		// start a new stroke path
	}

	/**
	 * Specifies a gradient to use for the stroke when drawing lines.
	 *
	 * <p>The gradient line style is used for subsequent calls to Graphics
	 * methods such as the <code>lineTo()</code> methods or the
	 * <code>drawCircle()</code> method. The line style remains in effect until
	 * you call the <code>lineStyle()</code> or <code>lineBitmapStyle()</code>
	 * methods, or the <code>lineGradientStyle()</code> method again with
	 * different parameters. </p>
	 *
	 * <p>You can call the <code>lineGradientStyle()</code> method in the middle
	 * of drawing a path to specify different styles for different line segments
	 * within a path. </p>
	 *
	 * <p>Call the <code>lineStyle()</code> method before you call the
	 * <code>lineGradientStyle()</code> method to enable a stroke, or else the
	 * value of the line style is <code>undefined</code>.</p>
	 *
	 * <p>Calls to the <code>clear()</code> method set the line style back to
	 * <code>undefined</code>. </p>
	 *
	 * @param type                A value from the GradientType class that
	 *                            specifies which gradient type to use, either
	 *                            GradientType.LINEAR or GradientType.RADIAL.
	 * @param colors              An array of RGB hexadecimal color values used
	 *                            in the gradient; for example, red is 0xFF0000,
	 *                            blue is 0x0000FF, and so on. You can specify
	 *                            up to 15 colors. For each color, specify a
	 *                            corresponding value in the alphas and ratios
	 *                            parameters.
	 * @param alphas              An array of alpha values for the corresponding
	 *                            colors in the colors array; valid values are 0
	 *                            to 1. If the value is less than 0, the default
	 *                            is 0. If the value is greater than 1, the
	 *                            default is 1.
	 * @param ratios              An array of color distribution ratios; valid
	 *                            values are 0-255. This value defines the
	 *                            percentage of the width where the color is
	 *                            sampled at 100%. The value 0 represents the
	 *                            left position in the gradient box, and 255
	 *                            represents the right position in the gradient
	 *                            box.
	 * @param matrix              A transformation matrix as defined by the
	 *                            flash.geom.Matrix class. The flash.geom.Matrix
	 *                            class includes a
	 *                            <code>createGradientBox()</code> method, which
	 *                            lets you conveniently set up the matrix for use
	 *                            with the <code>lineGradientStyle()</code>
	 *                            method.
	 * @param spreadMethod        A value from the SpreadMethod class that
	 *                            specifies which spread method to use:
	 * @param interpolationMethod A value from the InterpolationMethod class that
	 *                            specifies which value to use. For example,
	 *                            consider a simple linear gradient between two
	 *                            colors(with the <code>spreadMethod</code>
	 *                            parameter set to
	 *                            <code>SpreadMethod.REFLECT</code>). The
	 *                            different interpolation methods affect the
	 *                            appearance as follows:
	 * @param focalPointRatio     A number that controls the location of the
	 *                            focal point of the gradient. The value 0 means
	 *                            the focal point is in the center. The value 1
	 *                            means the focal point is at one border of the
	 *                            gradient circle. The value -1 means that the
	 *                            focal point is at the other border of the
	 *                            gradient circle. Values less than -1 or greater
	 *                            than 1 are rounded to -1 or 1. The following
	 *                            image shows a gradient with a
	 *                            <code>focalPointRatio</code> of -0.75:
	 */
	public lineGradientStyle(
		type: GradientType, colors: Array<number /*int*/>,
		alphas: Array<number>, ratios: Array<number>,
		matrix: Matrix = null, spreadMethod: SpreadMethod = null,
		interpolationMethod: InterpolationMethod = null, focalPointRatio: number = 0): void {

		this._drawingDirty = true;
		this._lineStyle = new  GraphicsStrokeStyle(colors[0], alphas[0], 1);
	}

	/**
	 * Specifies a shader to use for the line stroke when drawing lines.
	 *
	 * <p>The shader line style is used for subsequent calls to Graphics methods
	 * such as the <code>lineTo()</code> method or the <code>drawCircle()</code>
	 * method. The line style remains in effect until you call the
	 * <code>lineStyle()</code> or <code>lineGradientStyle()</code> methods, or
	 * the <code>lineBitmapStyle()</code> method again with different parameters.
	 * </p>
	 *
	 * <p>You can call the <code>lineShaderStyle()</code> method in the middle of
	 * drawing a path to specify different styles for different line segments
	 * within a path. </p>
	 *
	 * <p>Call the <code>lineStyle()</code> method before you call the
	 * <code>lineShaderStyle()</code> method to enable a stroke, or else the
	 * value of the line style is <code>undefined</code>.</p>
	 *
	 * <p>Calls to the <code>clear()</code> method set the line style back to
	 * <code>undefined</code>. </p>
	 *
	 * @param shader The shader to use for the line stroke.
	 * @param matrix An optional transformation matrix as defined by the
	 *               flash.geom.Matrix class. The matrix can be used to scale or
	 *               otherwise manipulate the bitmap before applying it to the
	 *               line style.
	 */
	//		public lineShaderStyle(shader:Shader, matrix:Matrix = null)
	//		{
	//
	//		}

	/**
	 * Specifies a line style used for subsequent calls to Graphics methods such
	 * as the <code>lineTo()</code> method or the <code>drawCircle()</code>
	 * method. The line style remains in effect until you call the
	 * <code>lineGradientStyle()</code> method, the
	 * <code>lineBitmapStyle()</code> method, or the <code>lineStyle()</code>
	 * method with different parameters.
	 *
	 * <p>You can call the <code>lineStyle()</code> method in the middle of
	 * drawing a path to specify different styles for different line segments
	 * within the path.</p>
	 *
	 * <p><b>Note: </b>Calls to the <code>clear()</code> method set the line
	 * style back to <code>undefined</code>.</p>
	 *
	 * <p><b>Note: </b>Flash Lite 4 supports only the first three parameters
	 * (<code>thickness</code>, <code>color</code>, and <code>alpha</code>).</p>
	 *
	 * @param thickness    An integer that indicates the thickness of the line in
	 *                     points; valid values are 0-255. If a number is not
	 *                     specified, or if the parameter is undefined, a line is
	 *                     not drawn. If a value of less than 0 is passed, the
	 *                     default is 0. The value 0 indicates hairline
	 *                     thickness; the maximum thickness is 255. If a value
	 *                     greater than 255 is passed, the default is 255.
	 * @param color        A hexadecimal color value of the line; for example,
	 *                     red is 0xFF0000, blue is 0x0000FF, and so on. If a
	 *                     value is not indicated, the default is 0x000000
	 *                    (black). Optional.
	 * @param alpha        A number that indicates the alpha value of the color
	 *                     of the line; valid values are 0 to 1. If a value is
	 *                     not indicated, the default is 1(solid). If the value
	 *                     is less than 0, the default is 0. If the value is
	 *                     greater than 1, the default is 1.
	 * @param pixelHinting(Not supported in Flash Lite 4) A Boolean value that
	 *                     specifies whether to hint strokes to full pixels. This
	 *                     affects both the position of anchors of a curve and
	 *                     the line stroke size itself. With
	 *                     <code>pixelHinting</code> set to <code>true</code>,
	 *                     line widths are adjusted to full pixel widths. With
	 *                     <code>pixelHinting</code> set to <code>false</code>,
	 *                     disjoints can appear for curves and straight lines.
	 *                     For example, the following illustrations show how
	 *                     Flash Player or Adobe AIR renders two rounded
	 *                     rectangles that are identical, except that the
	 *                     <code>pixelHinting</code> parameter used in the
	 *                     <code>lineStyle()</code> method is set differently
	 *                    (the images are scaled by 200%, to emphasize the
	 *                     difference):
	 *
	 *                     <p>If a value is not supplied, the line does not use
	 *                     pixel hinting.</p>
	 * @param scaleMode   (Not supported in Flash Lite 4) A value from the
	 *                     LineScaleMode class that specifies which scale mode to
	 *                     use:
	 *                     <ul>
	 *                       <li> <code>LineScaleMode.NORMAL</code> - Always
	 *                     scale the line thickness when the object is scaled
	 *                    (the default). </li>
	 *                       <li> <code>LineScaleMode.NONE</code> - Never scale
	 *                     the line thickness. </li>
	 *                       <li> <code>LineScaleMode.VERTICAL</code> - Do not
	 *                     scale the line thickness if the object is scaled
	 *                     vertically <i>only</i>. For example, consider the
	 *                     following circles, drawn with a one-pixel line, and
	 *                     each with the <code>scaleMode</code> parameter set to
	 *                     <code>LineScaleMode.VERTICAL</code>. The circle on the
	 *                     left is scaled vertically only, and the circle on the
	 *                     right is scaled both vertically and horizontally:
	 *                     </li>
	 *                       <li> <code>LineScaleMode.HORIZONTAL</code> - Do not
	 *                     scale the line thickness if the object is scaled
	 *                     horizontally <i>only</i>. For example, consider the
	 *                     following circles, drawn with a one-pixel line, and
	 *                     each with the <code>scaleMode</code> parameter set to
	 *                     <code>LineScaleMode.HORIZONTAL</code>. The circle on
	 *                     the left is scaled horizontally only, and the circle
	 *                     on the right is scaled both vertically and
	 *                     horizontally:   </li>
	 *                     </ul>
	 * @param caps        (Not supported in Flash Lite 4) A value from the
	 *                     CapsStyle class that specifies the type of caps at the
	 *                     end of lines. Valid values are:
	 *                     <code>CapsStyle.NONE</code>,
	 *                     <code>CapsStyle.ROUND</code>, and
	 *                     <code>CapsStyle.SQUARE</code>. If a value is not
	 *                     indicated, Flash uses round caps.
	 *
	 *                     <p>For example, the following illustrations show the
	 *                     different <code>capsStyle</code> settings. For each
	 *                     setting, the illustration shows a blue line with a
	 *                     thickness of 30(for which the <code>capsStyle</code>
	 *                     applies), and a superimposed black line with a
	 *                     thickness of 1(for which no <code>capsStyle</code>
	 *                     applies): </p>
	 * @param joints      (Not supported in Flash Lite 4) A value from the
	 *                     JointStyle class that specifies the type of joint
	 *                     appearance used at angles. Valid values are:
	 *                     <code>JointStyle.BEVEL</code>,
	 *                     <code>JointStyle.MITER</code>, and
	 *                     <code>JointStyle.ROUND</code>. If a value is not
	 *                     indicated, Flash uses round joints.
	 *
	 *                     <p>For example, the following illustrations show the
	 *                     different <code>joints</code> settings. For each
	 *                     setting, the illustration shows an angled blue line
	 *                     with a thickness of 30(for which the
	 *                     <code>jointStyle</code> applies), and a superimposed
	 *                     angled black line with a thickness of 1(for which no
	 *                     <code>jointStyle</code> applies): </p>
	 *
	 *                     <p><b>Note:</b> For <code>joints</code> set to
	 *                     <code>JointStyle.MITER</code>, you can use the
	 *                     <code>miterLimit</code> parameter to limit the length
	 *                     of the miter.</p>
	 * @param miterLimit  (Not supported in Flash Lite 4) A number that
	 *                     indicates the limit at which a miter is cut off. Valid
	 *                     values range from 1 to 255(and values outside that
	 *                     range are rounded to 1 or 255). This value is only
	 *                     used if the <code>jointStyle</code> is set to
	 *                     <code>"miter"</code>. The <code>miterLimit</code>
	 *                     value represents the length that a miter can extend
	 *                     beyond the point at which the lines meet to form a
	 *                     joint. The value expresses a factor of the line
	 *                     <code>thickness</code>. For example, with a
	 *                     <code>miterLimit</code> factor of 2.5 and a
	 *                     <code>thickness</code> of 10 pixels, the miter is cut
	 *                     off at 25 pixels.
	 *
	 *                     <p>For example, consider the following angled lines,
	 *                     each drawn with a <code>thickness</code> of 20, but
	 *                     with <code>miterLimit</code> set to 1, 2, and 4.
	 *                     Superimposed are black reference lines showing the
	 *                     meeting points of the joints:</p>
	 *
	 *                     <p>Notice that a given <code>miterLimit</code> value
	 *                     has a specific maximum angle for which the miter is
	 *                     cut off. The following table lists some examples:</p>
	 */
	public lineStyle(
		thickness: number = 0, color: number /*int*/ = 0, alpha: number = 1,
		pixelHinting: boolean = false, scaleMode: LineScaleMode = null,
		capstyle: number = CapsStyle.NONE, jointstyle: number = JointStyle.MITER,
		miterLimit: number = 100): void {

		if (thickness == 0) {
			thickness = 0.05;
			scaleMode = LineScaleMode.HAIRLINE;
		}

		const valid = thickness > 0 && alpha > 0;

		this._drawingDirty = true;
		this._lineStyle = valid
			? new  GraphicsStrokeStyle(color, alpha, thickness, jointstyle, capstyle, miterLimit)
			: null;
	}

	/**
	 * Draws a line using the current line style from the current drawing
	 * position to(<code>x</code>, <code>y</code>); the current drawing position
	 * is then set to(<code>x</code>, <code>y</code>). If the display object in
	 * which you are drawing contains content that was created with the Flash
	 * drawing tools, calls to the <code>lineTo()</code> method are drawn
	 * underneath the content. If you call <code>lineTo()</code> before any calls
	 * to the <code>moveTo()</code> method, the default position for the current
	 * drawing is(<i>0, 0</i>). If any of the parameters are missing, this
	 * method fails and the current drawing position is not changed.
	 *
	 * @param x A number that indicates the horizontal position relative to the
	 *          registration point of the parent display object(in pixels).
	 * @param y A number that indicates the vertical position relative to the
	 *          registration point of the parent display object(in pixels).
	 */
	public lineTo(x: number, y: number): void {
		this._drawingDirty = true;
		this._createGraphicPathes();
		if (this._active_fill_path != null) {
			this._active_fill_path.lineTo(x, y);
		}
		if (this._active_stroke_path != null) {
			this._active_stroke_path.lineTo(x, y);
		}
		this._current_position.x = x;
		this._current_position.y = y;
		this.invalidate();

	}

	/**
	 * Moves the current drawing position to(<code>x</code>, <code>y</code>). If
	 * any of the parameters are missing, this method fails and the current
	 * drawing position is not changed.
	 *
	 * @param x A number that indicates the horizontal position relative to the
	 *          registration point of the parent display object(in pixels).
	 * @param y A number that indicates the vertical position relative to the
	 *          registration point of the parent display object(in pixels).
	 */
	public moveTo(x: number, y: number): void {
		this._drawingDirty = true;
		this._createGraphicPathes();

		if (this._active_fill_path != null) {
			this._active_fill_path.moveTo(x, y);
		}
		if (this._active_stroke_path != null) {
			this._active_stroke_path.moveTo(x, y);
		}
		this._current_position.x = x;
		this._current_position.y = y;
		this.invalidate();
	}

	private processLazyTesselation (shapeTag: ShapeTag): void {
		shapeTag.lazyTaskDone = null;
		shapeTag.needParse = false;

		// if parsing time more that a 2 ms, how many convert will runs?? =)
		if (shapeTag.parsingTime < 30) {
			//return;
			const index = this._queuedShapeTags.indexOf(shapeTag);
			if (index > -1) {
				this._queuedShapeTags.splice(index, 1);
			}

			this.convertRecordsToShapeData(shapeTag, shapeTag.parsingTime > 1);
		} else {
			console.debug('[Graphics] Supress lazy shape convertion:',shapeTag);
		}
	}

	public queueShapeTag(shapeTag: ShapeTag): void {
		this._queuedShapeTags.push(shapeTag);
		this._drawingDirty = true;

		return;
		if (shapeTag.needParse) {
			shapeTag.lazyTaskDone = this.processLazyTesselation.bind(this);
		}

		return;
	}

	private _createGraphicPathes() {

		if (this._fillStyle != null &&
			(this._active_fill_path == null ||
				this._active_fill_path.style != this._fillStyle)) {

			this._active_fill_path = new GraphicsPath();
			this._active_fill_path.style = this._fillStyle;
			if (this._current_position.x != 0 || this._current_position.y != 0)
				this._active_fill_path.moveTo(this._current_position.x, this._current_position.y);
			this._queued_fill_pathes.push(this._active_fill_path);
		}

		if (this._lineStyle != null &&
			(this._active_stroke_path == null ||
				this._active_stroke_path.style != this._lineStyle)) {

			this._active_stroke_path = new GraphicsPath();
			this._active_stroke_path.style = this._lineStyle;
			if (this._current_position.x != 0 || this._current_position.y != 0)
				this._active_stroke_path.moveTo(this._current_position.x, this._current_position.y);
			this._queued_stroke_pathes.push(this._active_stroke_path);
		}
	}

	private _addShapes(shapes: Array<Shape<any>>, cloneShapes: boolean = false): void {
		let shape: Shape<TriangleElements | LineElements>;
		const len: number = shapes.length;
		for (let i: number = 0; i < len; i++) {
			shape = shapes[i];

			if (cloneShapes) {
				shape = Shape.getShape(
					shape.elements,
					shape.material,
					shape.style,
					shape.count,
					shape.offset);
			}

			shape.particleCollection = shapes[i].particleCollection;

			shape.addEventListener(RenderableEvent.INVALIDATE_ELEMENTS, this._onInvalidateDelegate);
			shape.addEventListener(RenderableEvent.INVALIDATE_MATERIAL, this._onInvalidateDelegate);
			shape.addEventListener(RenderableEvent.INVALIDATE_STYLE, this._onInvalidateDelegate);
			shape.addEventListener(AssetEvent.INVALIDATE, this._onInvalidateDelegate);

			this._shapes.push(shape);

			shape.usages++;
		}

		this.invalidate();
	}

	public _isShapeMaterial(material: IMaterial): boolean {
		const len: number = this._shapes.length;
		for (let i: number = 0; i < len; i++)
			if (material == this._shapes[i].material)
				return true;

		return false;
	}

	/*
	* Converts records from the space-optimized format they're stored in to a
	* format that's more amenable to fast rendering.
	*
	* See http://blogs.msdn.com/b/mswanson/archive/2006/02/27/539749.aspx and
	* http://wahlers.com.br/claus/blog/hacking-swf-1-shapes-in-flash/ for details.
	*/
	public convertRecordsToShapeData(tag: ShapeTag, supressFill = false): void {
		// run parser
		if (tag.needParse) {
			//console.log("Run lazy Graphics parser", tag.id);
			//console.time('Run lazy Graphics parser:' + tag.id);
			tag.lazyParser();
			//console.timeEnd('Run lazy Graphics parser:' + tag.id);
		}

		const records: ShapeRecord[] = tag.records;
		const fillStyles: FillStyle[] = tag.fillStyles;
		const lineStyles: LineStyle[] = tag.lineStyles;
		const recordsMorph: ShapeRecord[] = tag.recordsMorph || null;
		const isMorph: boolean = recordsMorph !== null;
		const parser: any = tag.parser;

		if (this.tryOptimiseSigleImage
				&& records.length === 5
				&& fillStyles.length === 2
				&& (fillStyles[0].type >= FillType.ClippedBitmap)
		) {
			//1 style is trash, second is needed
			const style = StyleUtils.processStyle(tag.fillStyles[1], false, false, tag.parser);
			const bounds = tag.fillBounds || tag.lineBounds;

			this.addShapeInternal(Graphics.getShapeForBitmapStyle(style, bounds));
			return;
		}

		let fillPaths = StyleUtils.createPathsList(fillStyles, false, !!recordsMorph, parser);
		let linePaths = StyleUtils.createPathsList(lineStyles, true, !!recordsMorph, parser);
		let styles = { fill0: 0, fill1: 0, line: 0 };

		interface IPathElement {
			segment?: PathSegment | undefined,
			path: SegmentedPath | undefined,
		}

		const psPool: Array<IPathElement | undefined> = [];

		// Fill- and line styles can be added by style change records in the middle of
		// a shape records list. This also causes the previous paths to be treated as
		// a group, so the lines don't get moved on top of any following fills.
		// To support this, we just append all current fill and line paths to a list
		// when new styles are introduced.
		let allPaths: SegmentedPath[] = [];

		const numRecords = records.length;
		let x: number = 0;
		let y: number = 0;

		let mX: number = 0;
		let mY: number = 0;

		let morphRecord: ShapeRecord;

		//console.log("numRecords", numRecords);
		for (let i = 0, j = 0; i < numRecords; i++) {
			const record: ShapeRecord = records[i];
			//console.log("record", i, record.type);

			if (isMorph) {
				morphRecord = recordsMorph[j++];
			}

			// type 0 is a StyleChange record
			if (record.type === 0) {

				// reset segment pool
				for (let i = 0; i <  3; i++) {
					psPool[i] = undefined;
				}

				if (record.flags & ShapeRecordFlags.HasNewStyles) {
					if (!allPaths) {
						allPaths = [];
					}

					Array_push.apply(allPaths, fillPaths);
					fillPaths = StyleUtils.createPathsList(record.fillStyles, false, isMorph, parser);

					Array_push.apply(allPaths, linePaths);

					linePaths = StyleUtils.createPathsList(record.lineStyles, true, isMorph, parser);

					styles = { fill0: 0, fill1: 0, line: 0 };
				}

				if (record.flags & ShapeRecordFlags.HasFillStyle0) {
					styles.fill0 = record.fillStyle0;
				}
				if (record.flags & ShapeRecordFlags.HasFillStyle1) {
					styles.fill1 = record.fillStyle1;
				}
				if (record.flags & ShapeRecordFlags.HasLineStyle) {
					styles.line = record.lineStyle;
				}
				// reset all segments and pathes to null, and than reset them based on new styles
				// path1 = path2 = pathL=null;
				// segment1 = segment2 = segmentL=null;

				if (styles.fill0) {
					psPool[0] = {
						path: fillPaths[styles.fill0 - 1],
					};
					//path1 = fillPaths[styles.fill0 - 1];
				}

				if (styles.fill1) {
					psPool[1] = {
						path: fillPaths[styles.fill1 - 1],
					};
					//path2 = fillPaths[styles.fill1 - 1];
				}

				if (styles.line) {
					psPool[2] = {
						path: linePaths[styles.line - 1],
					};
					//pathL = linePaths[styles.line - 1];
				}

				if (record.flags & ShapeRecordFlags.Move) {
					x = record.moveX | 0;
					y = record.moveY | 0;
					// When morphed, StyleChangeRecords/MoveTo might not have a
					// corresponding record in the start or end shape --
					// processing morphRecord below before converting type 1 records.
				}

				// if a segment1 has same fill on both sides, we want to ignore this segment1 for fills
				if (styles.fill1 && styles.fill0 && styles.fill0 == styles.fill1) {
					psPool[0] = psPool[1] = undefined;
				}

				if (isMorph) {

					if (morphRecord.type === 0) {
						mX = morphRecord.moveX | 0;
						mY = morphRecord.moveY | 0;
					} else {
						//mX = x;
						//mY = y;

						j--;
					}
				}

				for (let i = 0; i < 3; i++) {
					const entry = psPool[i];

					if (!entry) {
						continue;
					}

					entry.segment = PathSegment.FromDefaults(isMorph);
					entry.path.addSegment(entry.segment);

					if (!isMorph) {
						entry.segment.moveTo(x, y);
						//console.log("segment1.moveTo" ,x/20, y/20);
					} else {
						entry.segment.morphMoveTo(x, y, mX, mY);
					}
				}
			// eslint-disable-next-line brace-style
			}

			// type 1 is a StraightEdge or CurvedEdge record
			else {
				assert(record.type === 1);

				if (isMorph) {
					// An invalid SWF might contain a move in the EndEdges list where the
					// StartEdges list contains an edge. The Flash Player seems to skip it,
					// so we do, too.
					while (morphRecord && morphRecord.type === 0) {
						morphRecord = recordsMorph[j++];
					}
					// The EndEdges list might be shorter than the StartEdges list. Reuse
					// start edges as end edges in that case.
					if (!morphRecord) {
						morphRecord = record;
					}
				}

				if (record.flags & ShapeRecordFlags.IsStraight &&
					(!isMorph || (morphRecord.flags & ShapeRecordFlags.IsStraight))) {

					x += record.deltaX | 0;
					y += record.deltaY | 0;

					if (isMorph) {
						mX += morphRecord.deltaX | 0;
						mY += morphRecord.deltaY | 0;
					}

					for (let i = 0; i < 3; i++) {
						const entry = psPool[i];

						if (!entry) {
							continue;
						}

						if (!isMorph) {
							entry.segment.lineTo(x,y);
						} else {

							entry.segment.morphLineTo(x, y, mX, mY);
						}
					}
				} else {
					const data = this.transformCurve(record, x, y);

					x = data.x;
					y = data.y;

					let mData: {cx: number, cy: number, x: number, y: number};
					if (isMorph) {
						mData = this.transformCurve(morphRecord, mX, mY);

						mX = mData.x;
						mY = mData.y;
					}

					for (let i = 0; i < 3; i++) {
						const e = psPool[i];

						if (!e) {
							continue;
						}

						const s = e.segment;

						if (!isMorph) {
							s.curveTo(data.cx, data.cy, x, y);
						} else {
							s.morphCurveTo(data.cx, data.cy, x, y, mData.cx, mData.cy, mX, mY);
						}
					}
				}
			}
		}
		//	applySegmentToStyles(segment1, styles, linePaths, fillPaths);

		// All current paths get appended to the allPaths list at the end. First fill,
		// then line paths.

		// allPaths = (allPaths || []).concat(fillPaths || [], linePaths || [], defaultPath || []);

		const sources = [allPaths, fillPaths, linePaths];

		let shapeAJS: GraphicsPath;
		let morphShapeAJS: GraphicsPath;

		let current = 0;

		if (isMorph) {
			//shape.morphCoordinates = new Int32Array(shape.coordinates.length);
			//shape.morphStyles = new DataBuffer(16);
			this._start = [];
			this._end = [];

			for (let i = 0; current < sources.length ; i++) {
				if (!sources[current] || sources[current].length <= i) {
					current++;
					i = -1;
					continue;
				}

				//allPaths[i].serialize(shape);
				shapeAJS = new GraphicsPath();
				morphShapeAJS = new GraphicsPath();

				// should disable internal optimisation for regular shapes
				shapeAJS.morphSource = morphShapeAJS.morphSource = true;

				//shapeAJS.queuePath(allPaths[i], morphShapeAJS)
				sources[current][i].serializeAJS(shapeAJS, morphShapeAJS);

				this._start.push(shapeAJS);
				this._end.push(morphShapeAJS);
			}

		} else {
			for (let i = 0; current < sources.length; i++) {
				if (!sources[current] || sources[current].length <= i) {
					current++;
					i = -1;
					continue;
				}

				//console.log("allPaths", i, allPaths[i]);
				//allPaths[i].serialize(shape);
				shapeAJS = new GraphicsPath();

				//shapeAJS.queuePath(allPaths[i], null);
				sources[current][i].serializeAJS(shapeAJS, null);

				//console.log("shapeAJS", shapeAJS);
				this.add_queued_path(shapeAJS, supressFill);
			}
		}
	}

	private transformCurve(record: ShapeRecord, x: number, y: number) {
		let cx: number, cy: number;
		if (!(record.flags & ShapeRecordFlags.IsStraight)) {
			cx = x + record.controlDeltaX | 0;
			cy = y + record.controlDeltaY | 0;
			x = cx + record.anchorDeltaX | 0;
			y = cy + record.anchorDeltaY | 0;
		} else {
			const deltaX = record.deltaX | 0;
			const deltaY = record.deltaY | 0;
			cx = x + (deltaX >> 1);
			cy = y + (deltaY >> 1);
			x += deltaX;
			y += deltaY;
		}

		return { cx, cy, x, y };
	}
}
