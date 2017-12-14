import {Rectangle, Box, Sphere, Matrix3D, Vector3D} from "@awayjs/core";

import {TraverserBase, ElementsUtils} from "@awayjs/renderer";

import {AttributesBuffer, AttributesView, Float4Attributes, Float3Attributes, Float2Attributes, Short3Attributes} from "@awayjs/stage";

import {TriangleElementsUtils} from "../utils/TriangleElementsUtils";

import {ElementsBase} from "./ElementsBase";
/**
 * @class away.base.TriangleElements
 */
export class TriangleElements extends ElementsBase
{
	private static isIE:boolean=!!navigator.userAgent.match(/Trident/g) || !!navigator.userAgent.match(/MSIE/g);

	public static traverseName:string = TraverserBase.addRenderableName("applyTriangleShape");
	public static assetType:string = "[asset TriangleElements]";
	
	private _faceNormalsDirty:boolean = true;
	private _faceTangentsDirty:boolean = true;

	private _positions:AttributesView;
	private _normals:Float3Attributes;
	private _tangents:Float3Attributes;
	private _uvs:AttributesView;
	private _jointIndices:AttributesView;
	private _jointWeights:AttributesView;

	private _jointsPerVertex:number;

	private _faceNormals:Float4Attributes;
	private _faceTangents:Float3Attributes;

	//used for hittesting geometry
	public hitTestCache:Object = new Object();


	public halfStrokeThickness:number=0;

	public originalSlice9Size:Rectangle;
	public slice9offsets:Rectangle;
	public slice9Indices:number[];
	public initialSlice9Positions:number[];
	public lastStrokeScale:number;

	public updateSlice9(width:number, height:number){

	}
	
	public get assetType():string
	{
		return TriangleElements.assetType;
	}

	public get traverseName():string
	{
		return TriangleElements.traverseName;
	}

	/**
	 *
	 */
	public get jointsPerVertex():number
	{
		return this._jointsPerVertex;
	}

	public set jointsPerVertex(value:number)
	{
		if (this._jointsPerVertex == value)
			return;

		this._jointsPerVertex = value;

		if (this._jointIndices)
			this._jointIndices.dimensions = this._jointsPerVertex;

		if (this._jointWeights)
			this._jointWeights.dimensions = this._jointsPerVertex;
	}

	/**
	 *
	 */
	public get positions():AttributesView
	{
		if (!this._positions)
			this.setPositions(new Float3Attributes(this._concatenatedBuffer));

		return this._positions;
	}

	/**
	 *
	 */
	public get normals():Float3Attributes
	{
		if (!this._normals || this._verticesDirty[this._normals.id])
			this.setNormals(this._normals);

		return this._normals;
	}

	/**
	 *
	 */
	public get tangents():Float3Attributes
	{
		if (!this._tangents || this._verticesDirty[this._tangents.id])
			this.setTangents(this._tangents);

		return this._tangents;
	}

	/**
	 * The raw data of the face normals, in the same order as the faces are listed in the index list.
	 */
	public get faceNormals():Float4Attributes
	{
		if (this._faceNormalsDirty)
			this.updateFaceNormals();

		return this._faceNormals;
	}

	/**
	 * The raw data of the face tangets, in the same order as the faces are listed in the index list.
	 */
	public get faceTangents():Float3Attributes
	{
		if (this._faceTangentsDirty)
			this.updateFaceTangents();

		return this._faceTangents;
	}

	/**
	 *
	 */
	public get uvs():AttributesView
	{
		if(!this._uvs && TriangleElements.isIE){
			var attributesView2:AttributesView = new AttributesView(Float32Array, 2);
			attributesView2.set(this._positions.get(this._positions.count));
			var attributesBuffer2:AttributesBuffer = attributesView2.attributesBuffer;
			attributesView2.dispose();
			this._uvs=new Float2Attributes(attributesBuffer2);
		}

		return this._uvs;
	}

	/**
	 *
	 */
	public get jointIndices():AttributesView
	{
		return this._jointIndices;
	}

	/**
	 *
	 */
	public get jointWeights():AttributesView
	{
		return this._jointWeights;
	}

	public getBoxBounds(target:Box = null, count:number = 0, offset:number = 0):Box
	{
		return TriangleElementsUtils.getTriangleGraphicsBoxBounds(this.positions, this.indices, target, count || this._numElements || this._numVertices, offset, this.halfStrokeThickness);
	}

	public getSphereBounds(center:Vector3D, target:Sphere = null, count:number = 0, offset:number = 0):Sphere
	{
		return TriangleElementsUtils.getTriangleGraphicsSphereBounds(this.positions, center, target, count || this._numVertices, offset);
	}

	public hitTestPoint(x:number, y:number, z:number, box:Box, count:number = 0, offset:number = 0, idx_count:number = 0, idx_offset:number = 0):boolean
	{
		return TriangleElementsUtils.hitTestTriangleElements(x, y, 0, box, this, count || this._numElements || this._numVertices, offset);
	}

	/**
	 *
	 */
	public setPositions(array:Array<number>, offset?:number);
	public setPositions(arrayBufferView:ArrayBufferView, offset?:number);
	public setPositions(attributesView:AttributesView, offset?:number);
	public setPositions(values:any, offset:number = 0):void
	{
		if (values == this._positions)
			return;

		if (values instanceof AttributesView) {
			this.clearVertices(this._positions);
			this._positions = <AttributesView> values;
		} else if (values) {
			if (!this._positions)
				this._positions = new Float3Attributes(this._concatenatedBuffer);

			this._positions.set(values, offset);
		} else {
			this.clearVertices(this._positions);
			this._positions = new Float3Attributes(this._concatenatedBuffer); //positions cannot be null
		}

		this._numVertices = this._positions.count;

		if (this._autoDeriveNormals)
			this.invalidateVertices(this._normals);

		if (this._autoDeriveTangents)
			this.invalidateVertices(this._tangents);

		this.invalidateVertices(this._positions);

		this._verticesDirty[this._positions.id] = false;
	}

	/**
	 * Updates the vertex normals based on the geometry.
	 */
	public setNormals(array:Array<number>, offset?:number);
	public setNormals(float32Array:Float32Array, offset?:number);
	public setNormals(float3Attributes:Float3Attributes, offset?:number);
	public setNormals(values:any, offset:number = 0):void
	{
		if (!this._autoDeriveNormals) {
			if (values == this._normals)
				return;

			if (values instanceof Float3Attributes) {
				this.clearVertices(this._normals);
				this._normals = <Float3Attributes> values;
			} else if (values) {
				if (!this._normals)
					this._normals = new Float3Attributes(this._concatenatedBuffer);

				this._normals.set(values, offset);
			} else if (this._normals) {
				this.clearVertices(this._normals);
				this._normals = null;
				return;
			}
		} else {
			this._normals = ElementsUtils.generateNormals(this.indices, this.faceNormals, this._normals, this._concatenatedBuffer);
		}

		this.invalidateVertices(this._normals);

		this._verticesDirty[this._normals.id] = false;
	}

	/**
	 * Updates the vertex tangents based on the geometry.
	 */
	public setTangents(array:Array<number>, offset?:number);
	public setTangents(float32Array:Float32Array, offset?:number);
	public setTangents(float3Attributes:Float3Attributes, offset?:number);
	public setTangents(values:any, offset:number = 0):void
	{
		if (!this._autoDeriveTangents) {
			if (values == this._tangents)
				return;

			if (values instanceof Float3Attributes) {
				this.clearVertices(this._tangents);
				this._tangents = values;
			} else if (values) {
				if (!this._tangents)
					this._tangents = new Float3Attributes(this._concatenatedBuffer);

				this._tangents.set(values, offset);
			} else if (this._tangents) {
				this.clearVertices(this._tangents);
				this._tangents = null;
				return;
			}
		} else {
			this._tangents = ElementsUtils.generateTangents(this.indices, this.faceTangents, this.faceNormals, this._tangents, this._concatenatedBuffer);
		}

		this.invalidateVertices(this._tangents);

		this._verticesDirty[this._tangents.id] = false;
	}

	/**
	 * Updates the uvs based on the geometry.
	 */
	public setUVs(array:Array<number>, offset?:number);
	public setUVs(arrayBufferView:ArrayBufferView, offset?:number);
	public setUVs(attributesView:AttributesView, offset?:number);
	public setUVs(values:any, offset:number = 0):void
	{
		if (values == this._uvs)
			return;

		if (values instanceof AttributesView) {
			this.clearVertices(this._uvs);
			this._uvs = values;
		} else if (values) {
			if (!this._uvs)
				this._uvs = new Float2Attributes(this._concatenatedBuffer);

			this._uvs.set(values, offset);
		} else if (this._uvs) {
			this.clearVertices(this._uvs);
			this._uvs = null;
			return;
		}

		this.invalidateVertices(this._uvs);

		this._verticesDirty[this._uvs.id] = false;
	}

	/**
	 * Updates the joint indices
	 */
	public setJointIndices(array:Array<number>, offset?:number);
	public setJointIndices(float32Array:Float32Array, offset?:number);
	public setJointIndices(attributesView:AttributesView, offset?:number);
	public setJointIndices(values:any, offset:number = 0):void
	{
		if (values == this._jointIndices)
			return;

		if (values instanceof AttributesView) {
			this.clearVertices(this._jointIndices);
			this._jointIndices = values;
		} else if (values) {
			if (!this._jointIndices)
				this._jointIndices = new AttributesView(Float32Array, this._jointsPerVertex, this._concatenatedBuffer);

			if (this._useCondensedIndices) {
				var i:number = 0;
				var oldIndex:number;
				var newIndex:number = 0;
				var dic:Object = new Object();

				this._condensedIndexLookUp = new Array<number>();

				while (i < values.length) {
					oldIndex = values[i];

					// if we encounter a new index, assign it a new condensed index
					if (dic[oldIndex] == undefined) {
						dic[oldIndex] = newIndex;
						this._condensedIndexLookUp[newIndex++] = oldIndex;
					}

					//reset value to dictionary lookup
					values[i++] = dic[oldIndex];
				}
			}

			this._jointIndices.set(values, offset);

		} else if (this._jointIndices) {
			this.clearVertices(this._jointIndices);
			this._jointIndices = null;
			return;
		}

		this.invalidateVertices(this._jointIndices);

		this._verticesDirty[this._jointIndices.id] = false;
	}

	/**
	 * Updates the joint weights.
	 */
	public setJointWeights(array:Array<number>, offset?:number);
	public setJointWeights(float32Array:Float32Array, offset?:number);
	public setJointWeights(attributesView:AttributesView, offset?:number);
	public setJointWeights(values:any, offset:number = 0):void
	{
		if (values == this._jointWeights)
			return;

		if (values instanceof AttributesView) {
			this.clearVertices(this._jointWeights);
			this._jointWeights = values;
		} else if (values) {
			if (!this._jointWeights)
				this._jointWeights = new AttributesView(Float32Array, this._jointsPerVertex, this._concatenatedBuffer);

			this._jointWeights.set(values, offset);

		} else if (this._jointWeights) {
			this.clearVertices(this._jointWeights);
			this._jointWeights = null;
			return;
		}

		this.invalidateVertices(this._jointWeights);

		this._verticesDirty[this._jointWeights.id] = false;
	}

	/**
	 *
	 */
	public dispose():void
	{
		super.dispose();

		if (this._positions) {
			this._positions.dispose();
			this._positions = null;
		}

		if (this._normals) {
			this._normals.dispose();
			this._normals = null;
		}

		if (this._tangents) {
			this._tangents.dispose();
			this._tangents = null;
		}

		if (this._uvs) {
			this._uvs.dispose();
			this._uvs = null;
		}

		if (this._jointIndices) {
			this._jointIndices.dispose();
			this._jointIndices = null;
		}

		if (this._jointWeights) {
			this._jointWeights.dispose();
			this._jointWeights = null;
		}

		if (this._faceNormals) {
			this._faceNormals.dispose();
			this._faceNormals = null;
		}

		if (this._faceTangents) {
			this._faceTangents.dispose();
			this._faceTangents = null;
		}
	}

	/**
	 * Updates the face indices of the TriangleElements.
	 *
	 * @param indices The face indices to upload.
	 */
	public setIndices(array:Array<number>, offset?:number);
	public setIndices(uint16Array:Uint16Array, offset?:number);
	public setIndices(short3Attributes:Short3Attributes, offset?:number);
	public setIndices(values:any, offset:number = 0):void
	{
		super.setIndices(values, offset);

		this._faceNormalsDirty = true;
		this._faceTangentsDirty = true;

		if (this._autoDeriveNormals)
			this.invalidateVertices(this._normals);

		if (this._autoDeriveTangents)
			this.invalidateVertices(this._tangents);
	}

	public copyTo(elements:TriangleElements):void
	{
		super.copyTo(elements);

		//temp disable auto derives
		var autoDeriveNormals:boolean = this._autoDeriveNormals;
		var autoDeriveTangents:boolean = this._autoDeriveTangents;
		elements.autoDeriveNormals = this._autoDeriveNormals = false;
		elements.autoDeriveTangents = this._autoDeriveTangents = false;

		elements.setPositions(this.positions.clone());

		if (this.normals)
			elements.setNormals(this.normals.clone());

		if (this.tangents)
			elements.setTangents(this.tangents.clone());

		if (this.uvs)
			elements.setUVs(this.uvs.clone());

		elements.jointsPerVertex = this._jointsPerVertex;

		if (this.jointIndices)
			elements.setJointIndices(this.jointIndices.clone());

		if (this.jointWeights)
			elements.setJointWeights(this.jointWeights.clone());

		//return auto derives to cloned values
		elements.autoDeriveNormals = this._autoDeriveNormals = autoDeriveNormals;
		elements.autoDeriveTangents = this._autoDeriveTangents = autoDeriveTangents;

		if(this.slice9Indices){
			elements.originalSlice9Size = this.originalSlice9Size;
			elements.slice9offsets = this.slice9offsets;
			elements.slice9Indices = this.slice9Indices;
			elements.initialSlice9Positions = this.initialSlice9Positions;
		}
	}

	/**
	 * Clones the current object
	 * @return An exact duplicate of the current object.
	 */
	public clone():TriangleElements
	{
		var clone:TriangleElements = new TriangleElements(this._concatenatedBuffer? this._concatenatedBuffer.clone() : null);

		this.copyTo(clone);

		return clone;
	}

	public scaleUV(scaleU:number = 1, scaleV:number = 1, count:number = 0, offset:number = 0):void
	{
		if (this.uvs) // only scale if uvs exist
			ElementsUtils.scale(scaleU, scaleV, 0, this.uvs, count || this._numVertices, offset);
	}

	/**
	 * Scales the geometry.
	 * @param scale The amount by which to scale.
	 */
	public scale(scale:number, count:number = 0, offset:number = 0):void
	{
		ElementsUtils.scale(scale, scale, scale, this.positions, count || this._numVertices, offset);
	}

	public applyTransformation(transform:Matrix3D, count:number = 0, offset:number = 0):void
	{
		ElementsUtils.applyTransformation(transform, this.positions, this.normals, this.tangents, count || this._numVertices, offset);
	}

	/**
	 * Updates the tangents for each face.
	 */
	private updateFaceTangents():void
	{
		this._faceTangents = ElementsUtils.generateFaceTangents(this.indices, this.positions, this.uvs || this.positions, this._faceTangents, this.numElements);

		this._faceTangentsDirty = false;
	}

	/**
	 * Updates the normals for each face.
	 */
	private updateFaceNormals():void
	{
		this._faceNormals = ElementsUtils.generateFaceNormals(this.indices, this.positions, this._faceNormals, this.numElements);

		this._faceNormalsDirty = false;
	}

	// public _iTestCollision(pickingCollider:IPickingCollider, material:MaterialBase, pickingCollision:PickingCollision, count:number = 0, offset:number = 0):boolean
	// {
	// 	return pickingCollider.testTriangleCollision(this, material, pickingCollision, count || this._numVertices, offset);
	// }
}

import {AssetEvent, ProjectionBase} from "@awayjs/core";

import {Stage, ContextGLDrawMode, ContextGLProgramType, IContextGL, ShaderRegisterCache, ShaderRegisterData, ShaderRegisterElement} from "@awayjs/stage";

import {RenderGroup, ShaderBase, _Stage_ElementsBase, _Render_RenderableBase, _Render_ElementsBase} from "@awayjs/renderer";

/**
 *
 * @class away.pool._Stage_TriangleElements
 */
export class _Stage_TriangleElements extends _Stage_ElementsBase
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

    public _setRenderState(renderRenderable:_Render_RenderableBase, shader:ShaderBase, projection:ProjectionBase):void
    {
        super._setRenderState(renderRenderable, shader, projection);

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

    public draw(renderRenderable:_Render_RenderableBase, shader:ShaderBase, projection:ProjectionBase, count:number, offset:number):void
    {
        //set constants
        if (shader.sceneMatrixIndex >= 0) {
            shader.sceneMatrix.copyFrom(renderRenderable.renderSceneTransform, true);
            shader.viewMatrix.copyFrom(projection.viewMatrix3D, true);
        } else {
            var matrix3D:Matrix3D = Matrix3D.CALCULATION_MATRIX;
            matrix3D.copyFrom(renderRenderable.renderSceneTransform);
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
    public _pGetOverflowElements():_Stage_ElementsBase
    {
        return new _Stage_TriangleElements(this._triangleElements, this._stage);
    }
}

/**
 * @class away.pool.LineMaterialPool
 */
export class _Render_TriangleElements extends _Render_ElementsBase
{
    public _includeDependencies(shader:ShaderBase):void
    {
    }

    public _getVertexCode(shader:ShaderBase, registerCache:ShaderRegisterCache, sharedRegisters:ShaderRegisterData):string
    {
        var code:string = "";

        //get the projection coordinates
        var position:ShaderRegisterElement = (shader.globalPosDependencies > 0)? sharedRegisters.globalPositionVertex : sharedRegisters.animatedPosition;

        //reserving vertex constants for projection matrix
        var viewMatrixReg:ShaderRegisterElement = registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        shader.viewMatrixIndex = viewMatrixReg.index*4;

        if (shader.projectionDependencies > 0) {
            sharedRegisters.projectionFragment = registerCache.getFreeVarying();
            var temp:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
            code += "m44 " + temp + ", " + position + ", " + viewMatrixReg + "\n" +
                "mov " + sharedRegisters.projectionFragment + ", " + temp + "\n" +
                "mov op, " + temp + "\n";
        } else {
            code += "m44 op, " + position + ", " + viewMatrixReg + "\n";
        }

        return code;
    }

    public _getFragmentCode(shader:ShaderBase, registerCache:ShaderRegisterCache, sharedRegisters:ShaderRegisterData):string
    {
        return "";
    }
}

RenderGroup.registerElements(_Render_TriangleElements, TriangleElements);
Stage.registerAbstraction(_Stage_TriangleElements, TriangleElements);
