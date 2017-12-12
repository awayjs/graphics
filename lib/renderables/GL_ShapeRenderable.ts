import {AssetEvent} from "@awayjs/core";

import {RenderStateBase, RenderStatePool, ElementsStateBase, MaterialStateBase, IMaterial, MaterialUtils} from "@awayjs/renderer";

import {Shape} from "../base/Shape";
import {AnimatorBase} from "../animators/AnimatorBase";
import {LineElements} from "../elements/LineElements";

/**
 * @class away.pool.GL_ShapeRenderable
 */
export class GL_ShapeRenderable extends RenderStateBase
{
	/**
	 *
	 */
	public shape:Shape;

	/**
	 * //TODO
	 *
	 * @param renderStatePool
	 * @param shape
	 * @param level
	 * @param indexOffset
	 */
	constructor(shape:Shape, renderStatePool:RenderStatePool)
	{
		super(shape, renderStatePool);

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
	protected _getElements():ElementsStateBase
	{
		this._offset = this.shape.offset;
		this._count = this.shape.count;
		
		return <ElementsStateBase> this._stage.getAbstraction((this.sourceEntity.animator)? (<AnimatorBase> this.sourceEntity.animator).getRenderableElements(this, this.shape.elements) : this.shape.elements);
	}

	protected _getMaterial():MaterialStateBase
	{
		return this._renderGroup.getMaterialStatePool(this.elementsGL.elements).getAbstraction(this.shape.material || this.sourceEntity.material || this.getDefaultMaterial());
	}

	protected getDefaultMaterial():IMaterial
	{
		return (this.elementsGL.elements instanceof LineElements)? MaterialUtils.getDefaultColorMaterial() : MaterialUtils.getDefaultTextureMaterial();
	}
}