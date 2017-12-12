import {AssetEvent, Matrix3D, ProjectionBase} from "@awayjs/core";

import {Stage, ContextGLDrawMode, ContextGLProgramType, IContextGL, ShaderRegisterCache, ShaderRegisterData, ShaderRegisterElement} from "@awayjs/stage";

import {ShaderBase, ElementsStateBase, RenderStateBase} from "@awayjs/renderer";

import {TriangleElements} from "./TriangleElements";

/**
 *
 * @class away.pool.GL_TriangleElements
 */
export class GL_TriangleElements extends ElementsStateBase
{
	private _triangleElements:TriangleElements;

	constructor(triangleElements:TriangleElements, stage:Stage)
	{
		super(triangleElements, stage);

		this._triangleElements = triangleElements;
	}

	public onClear(event:AssetEvent):void
	{
		super.onClear(event);

		this._triangleElements = null;
	}

	public _setRenderState(renderable:RenderStateBase, shader:ShaderBase, projection:ProjectionBase):void
	{
		super._setRenderState(renderable, shader, projection);

		//set buffers
		//TODO: find a better way to update a concatenated buffer when autoderiving
		if (shader.normalIndex >= 0 && this._triangleElements.autoDeriveNormals)
			this._triangleElements.normals;

		if (shader.tangentIndex >= 0 && this._triangleElements.autoDeriveTangents)
			this._triangleElements.tangents;

		if (shader.curvesIndex >= 0)
			this.activateVertexBufferVO(shader.curvesIndex, this._triangleElements.getCustomAtributes("curves"));

		if (shader.uvIndex >= 0)
			this.activateVertexBufferVO(shader.uvIndex, this._triangleElements.uvs || this._triangleElements.positions);

		if (shader.secondaryUVIndex >= 0)
			this.activateVertexBufferVO(shader.secondaryUVIndex, this._triangleElements.getCustomAtributes("secondaryUVs") || this._triangleElements.uvs || this._triangleElements.positions);

		if (shader.normalIndex >= 0)
			this.activateVertexBufferVO(shader.normalIndex, this._triangleElements.normals);

		if (shader.tangentIndex >= 0)
			this.activateVertexBufferVO(shader.tangentIndex, this._triangleElements.tangents);

		if (shader.jointIndexIndex >= 0)
			this.activateVertexBufferVO(shader.jointIndexIndex, this._triangleElements.jointIndices);

		if (shader.jointWeightIndex >= 0)
			this.activateVertexBufferVO(shader.jointIndexIndex, this._triangleElements.jointWeights);

		this.activateVertexBufferVO(0, this._triangleElements.positions);
	}

	public draw(renderable:RenderStateBase, shader:ShaderBase, projection:ProjectionBase, count:number, offset:number):void
	{
		//set constants
		if (shader.sceneMatrixIndex >= 0) {
			shader.sceneMatrix.copyFrom(renderable.renderSceneTransform, true);
			shader.viewMatrix.copyFrom(projection.viewMatrix3D, true);
		} else {
			var matrix3D:Matrix3D = Matrix3D.CALCULATION_MATRIX;
			matrix3D.copyFrom(renderable.renderSceneTransform);
			matrix3D.append(projection.viewMatrix3D);
			shader.viewMatrix.copyFrom(matrix3D, true);
		}

		var context:IContextGL = this._stage.context;
		context.setProgramConstantsFromArray(ContextGLProgramType.VERTEX, shader.vertexConstantData);
		context.setProgramConstantsFromArray(ContextGLProgramType.FRAGMENT, shader.fragmentConstantData);

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
	 * @returns {away.pool.GL_ShapeRenderable}
	 * @protected
	 */
	public _pGetOverflowElements():ElementsStateBase
	{
		return new GL_TriangleElements(this._triangleElements, this._stage);
	}
}