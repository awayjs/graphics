import {AssetEvent, Matrix3D, ProjectionBase} from "@awayjs/core";

import {ContextGLDrawMode, IContextGL, ContextGLProgramType, Stage, ShaderRegisterCache, ShaderRegisterElement, ShaderRegisterData} from "@awayjs/stage";

import {ShaderBase, ElementsStateBase, RenderStateBase} from "@awayjs/renderer";

import {LineElements} from "./LineElements";

/**
 *
 * @class away.pool.GL_LineElements
 */
export class GL_LineElements extends ElementsStateBase
{
	private _calcMatrix:Matrix3D = new Matrix3D();
	private _thickness:number = 1.25;

	private _lineElements:LineElements;

	constructor(lineElements:LineElements, stage:Stage)
	{
		super(lineElements, stage);

		this._lineElements = lineElements;
	}

	public onClear(event:AssetEvent):void
	{
		super.onClear(event);

		this._lineElements = null;
	}

	public _setRenderState(renderable:RenderStateBase, shader:ShaderBase, projection:ProjectionBase):void
	{
		super._setRenderState(renderable, shader, projection);
		
		if (shader.colorBufferIndex >= 0)
			this.activateVertexBufferVO(shader.colorBufferIndex, this._lineElements.colors);

		this.activateVertexBufferVO(0, this._lineElements.positions, 3);
		this.activateVertexBufferVO(2, this._lineElements.positions, 3, 12);
		this.activateVertexBufferVO(3, this._lineElements.thickness);

		shader.vertexConstantData[4+16] = 1;
		shader.vertexConstantData[5+16] = 1;
		shader.vertexConstantData[6+16] = 1;
		shader.vertexConstantData[7+16] = 1;

		shader.vertexConstantData[10+16] = -1;

		shader.vertexConstantData[12+16] = this._thickness/((this._stage.scissorRect)? Math.min(this._stage.scissorRect.width, this._stage.scissorRect.height) : Math.min(this._stage.width, this._stage.height));
		shader.vertexConstantData[13+16] = 1/255;
		shader.vertexConstantData[14+16] = projection.near;

		var context:IContextGL = this._stage.context;
	}

	public draw(renderable:RenderStateBase, shader:ShaderBase, projection:ProjectionBase, count:number, offset:number):void
	{
		var context:IContextGL = this._stage.context;
		
		// projection matrix
		shader.viewMatrix.copyFrom(projection.frustumMatrix3D, true);

		var matrix3D:Matrix3D = Matrix3D.CALCULATION_MATRIX;
		matrix3D.copyFrom(renderable.sourceEntity.transform.concatenatedMatrix3D);
		matrix3D.append(projection.transform.inverseConcatenatedMatrix3D);
		shader.sceneMatrix.copyFrom(matrix3D, true);

		context.setProgramConstantsFromArray(ContextGLProgramType.VERTEX, shader.vertexConstantData);
		
		if (this._indices)
			this.getIndexBufferGL().draw(ContextGLDrawMode.TRIANGLES, offset*3, count*3 || this.numIndices);
		else
			this._stage.context.drawVertices(ContextGLDrawMode.TRIANGLES, offset, count || this.numVertices);
	}

	/**
	 * //TODO
	 *
	 * @param pool
	 * @param renderable
	 * @param level
	 * @param indexOffset
	 * @returns {away.pool.LineSubSpriteRenderable}
	 * @protected
	 */
	public _pGetOverflowElements():ElementsStateBase
	{
		return new GL_LineElements(this._lineElements, this._stage);
	}
}