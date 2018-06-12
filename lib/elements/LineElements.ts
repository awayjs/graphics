import {Box, Sphere, Vector3D, Transform} from "@awayjs/core";

import {AttributesBuffer, AttributesView, Byte4Attributes, Float1Attributes} from "@awayjs/stage";

import {TraverserBase, ElementsUtils} from "@awayjs/renderer";;

import {ElementsBase} from "./ElementsBase";

/**
 * @class LineElements
 */
export class LineElements extends ElementsBase
{
	public static traverseName:string = TraverserBase.addRenderableName("applyLineShape");
		
	public static assetType:string = "[asset LineElements]";

	private _positions:AttributesView;
	private _thickness:Float1Attributes;
	private _colors:Byte4Attributes;

	/**
	 *
	 * @returns {string}
	 */
	public get assetType():string
	{
		return LineElements.assetType;
	}
	
	public get traverseName():string
	{
		return LineElements.traverseName;
	}

	/**
	 *
	 */
	public get positions():AttributesView
	{
		return this._positions;
	}

	/**
	 *
	 */
	public get thickness():Float1Attributes
	{
		return this._thickness;
	}

	/**
	 *
	 */
	public get colors():Byte4Attributes
	{
		if (!this._colors)
			this.setColors(this._colors);

		return this._colors;
	}

	/**
	 *
	 */
	constructor(concatenatedBuffer:AttributesBuffer = null)
	{
		super(concatenatedBuffer);
		
		this._positions = new AttributesView(Float32Array, 6, concatenatedBuffer);
	}

	public getBoxBounds(matrix3D:Matrix3D = null, cache:Box = null, target:Box = null, count:number = 0, offset:number = 0):Box
	{
		//TODO bounding calculations for lines
		return target;
	}

	public getSphereBounds(center:Vector3D, matrix3D:Matrix3D = null, cache:Sphere = null, target:Sphere = null):Sphere
	{
		//TODO bounding calculations for lines
		return target;
	}

	/**
	 *
	 */
	public setPositions(array:Array<number>, offset?:number);
	public setPositions(arrayBufferView:ArrayBufferView, offset?:number);
	public setPositions(attributesView:AttributesView, offset?:number);
	public setPositions(values:any, offset:number = 0):void
	{
		if (values instanceof AttributesView) {
			this.clearVertices(this._positions);
			this._positions = <AttributesView> values;
		} else if (values) {
			var i:number = 0;
			var j:number = 0;
			var index:number = 0;
			var positions:Float32Array = new Float32Array(values.length*4);
			var indices:Uint16Array = new Uint16Array(values.length);

			while (i < values.length) {
				if (index/6 & 1) {
					positions[index] = values[i + 3];
					positions[index + 1] = values[i + 4];
					positions[index + 2] = values[i + 5];
					positions[index + 3] = values[i];
					positions[index + 4] = values[i + 1];
					positions[index + 5] = values[i + 2];
				} else {
					positions[index] = values[i];
					positions[index + 1] = values[i + 1];
					positions[index + 2] = values[i + 2];
					positions[index + 3] = values[i + 3];
					positions[index + 4] = values[i + 4];
					positions[index + 5] = values[i + 5];
				}

				index += 6;

				if (++j == 4) {
					var o:number = index/6 - 4;
					indices.set([o, o + 1, o + 2, o + 3, o + 2, o + 1], i);
					j = 0;
					i += 6;
				}
			}
			
			this._positions.set(positions, offset*4);

			this.setIndices(indices, offset);
		} else {
			this.clearVertices(this._positions);
			this._positions = new AttributesView(Float32Array, 6, this._concatenatedBuffer);
		}

		this._numVertices = this._positions.count;

		this.invalidateVertices(this._positions);

		this._verticesDirty[this._positions.id] = false;
	}

	/**
	 * Updates the thickness.
	 */
	public setThickness(array:Array<number>, offset?:number);
	public setThickness(float32Array:Float32Array, offset?:number);
	public setThickness(float1Attributes:Float1Attributes, offset?:number);
	public setThickness(values:any, offset:number = 0):void
	{
		if (values instanceof Float1Attributes) {
			this._thickness = <Float1Attributes> values;
		} else if (values) {
			if (!this._thickness)
				this._thickness = new Float1Attributes(this._concatenatedBuffer);

			var i:number = 0;
			var j:number = 0;
			var index:number = 0;
			var thickness:Float32Array = new Float32Array(values.length*4);

			while (i < values.length) {
				thickness[index] = (Math.floor(0.5*index + 0.5) & 1)? -values[i] : values[i];

				if (++j == 4) {
					j = 0;
					i++;
				}

				index++;
			}

			this._thickness.set(thickness, offset*4);
		} else if (this._thickness) {
			this._thickness.dispose();
			this._thickness = null;
		}

		this.invalidateVertices(this._thickness);

		this._verticesDirty[this._thickness.id] = false;
	}

	/**
	 *
	 */
	public setColors(array:Array<number>, offset?:number);
	public setColors(float32Array:Float32Array, offset?:number);
	public setColors(uint8Array:Uint8Array, offset?:number);
	public setColors(byte4Attributes:Byte4Attributes, offset?:number);
	public setColors(values:any, offset:number = 0):void
	{
		if (values) {
			if (values == this._colors)
				return;

			if (values instanceof Byte4Attributes) {
				this.clearVertices(this._colors);
				this._colors = <Byte4Attributes> values;
			} else {
				if (!this._colors)
					this._colors = new Byte4Attributes(this._concatenatedBuffer);


				var i:number = 0;
				var j:number = 0;
				var index:number = 0;
				var colors:Uint8Array = new Uint8Array(values.length*4);

				while (i < values.length) {
					if (index/4 & 1) {
						colors[index] = values[i + 4];
						colors[index + 1] = values[i + 5];
						colors[index + 2] = values[i + 6];
						colors[index + 3] = values[i + 7];
					} else {
						colors[index] = values[i];
						colors[index + 1] = values[i + 1];
						colors[index + 2] = values[i + 2];
						colors[index + 3] = values[i + 3];
					}


					if (++j == 4) {
						j = 0;
						i += 8;
					}

					index += 4;
				}

				this._colors.set(colors, offset*4);
			}
		} else {
			//auto-derive colors
			this._colors = ElementsUtils.generateColors(this.indices, this._colors, this._concatenatedBuffer, this._numVertices);
		}

		this.invalidateVertices(this._colors);

		this._verticesDirty[this._colors.id] = false;
	}

	/**
	 *
	 */
	public dispose():void
	{
		super.dispose();

		this._positions.dispose();
		this._positions = null;

		this._thickness.dispose();
		this._thickness = null;

		this._colors.dispose();
		this._colors = null;
	}

	/**
	 * Clones the current object
	 * @return An exact duplicate of the current object.
	 */
	public clone():LineElements
	{
		var clone:LineElements = new LineElements(this._concatenatedBuffer? this._concatenatedBuffer.clone() : null);

		clone.setIndices(this.indices.clone());

		clone.setPositions(this._positions.clone());
		clone.setThickness(this._thickness.clone());
		clone.setColors(this._colors.clone());

		return clone;
	}

	// public _iTestCollision(pickingCollider:IPickingCollider, material:MaterialBase, pickingCollision:PickingCollision, count:number = 0, offset:number = 0):boolean
	// {
	// 	return pickingCollider.testLineCollision(this, material, pickingCollision, count || this._numVertices, offset);
	// }
}

import {AssetEvent, Matrix3D, ProjectionBase} from "@awayjs/core";

import {ContextGLDrawMode, IContextGL, ContextGLProgramType, Stage, ShaderRegisterCache, ShaderRegisterElement, ShaderRegisterData} from "@awayjs/stage";

import {RenderGroup, ShaderBase, _Stage_ElementsBase, _Render_ElementsBase, _Render_RenderableBase} from "@awayjs/renderer";

/**
 *
 * @class away.pool._Stage_LineElements
 */
export class _Stage_LineElements extends _Stage_ElementsBase
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

    public _setRenderState(renderRenderable:_Render_RenderableBase, shader:ShaderBase, projection:ProjectionBase):void
    {
        super._setRenderState(renderRenderable, shader, projection);

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

    public draw(renderRenderable:_Render_RenderableBase, shader:ShaderBase, projection:ProjectionBase, count:number, offset:number):void
    {
        var context:IContextGL = this._stage.context;

        // projection matrix
        shader.viewMatrix.copyFrom(projection.frustumMatrix3D, true);

        var matrix3D:Matrix3D = Matrix3D.CALCULATION_MATRIX;
        matrix3D.copyFrom(renderRenderable.sourceEntity.transform.concatenatedMatrix3D);
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
     * @param renderRenderable
     * @param level
     * @param indexOffset
     * @returns {away.pool.LineSubSpriteRenderable}
     * @protected
     */
    public _pGetOverflowElements():_Stage_ElementsBase
    {
        return new _Stage_LineElements(this._lineElements, this._stage);
    }
}

/**
 * @class away.pool._Render_LineElements
 */
export class _Render_LineElements extends _Render_ElementsBase
{
    public _includeDependencies(shader:ShaderBase):void
    {
        shader.colorDependencies++;
    }

    public _getVertexCode(shader:ShaderBase, registerCache:ShaderRegisterCache, sharedRegisters:ShaderRegisterData):string
    {
        //get the projection coordinates
        var position0:ShaderRegisterElement = (shader.globalPosDependencies > 0)? sharedRegisters.globalPositionVertex : sharedRegisters.animatedPosition;
        var position1:ShaderRegisterElement = registerCache.getFreeVertexAttribute();
        var thickness:ShaderRegisterElement = registerCache.getFreeVertexAttribute();

        //reserving vertex constants for projection matrix
        var viewMatrixReg:ShaderRegisterElement = registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        shader.viewMatrixIndex = viewMatrixReg.index*4;

        registerCache.getFreeVertexConstant(); // not used
        var constOne:ShaderRegisterElement = registerCache.getFreeVertexConstant();
        var constNegOne:ShaderRegisterElement = registerCache.getFreeVertexConstant();
        var misc:ShaderRegisterElement = registerCache.getFreeVertexConstant();

        var sceneMatrixReg:ShaderRegisterElement = registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        registerCache.getFreeVertexConstant();
        shader.sceneMatrixIndex = sceneMatrixReg.index*4;

        var q0:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(q0, 1);
        var q1:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(q1, 1);

        var l:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(l, 1);
        var behind:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(behind, 1);
        var qclipped:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(qclipped, 1);
        var offset:ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
        registerCache.addVertexTempUsages(offset, 1);

        return "m44 " + q0 + ", " + position0 + ", " + sceneMatrixReg + "			\n" + // transform Q0 to eye space
            "m44 " + q1 + ", " + position1 + ", " + sceneMatrixReg + "			\n" + // transform Q1 to eye space
            "sub " + l + ", " + q1 + ", " + q0 + " 			\n" + // L = Q1 - Q0

            // test if behind camera near plane
            // if 0 - Q0.z < Camera.near then the point needs to be clipped
            "slt " + behind + ".x, " + q0 + ".z, " + misc + ".z			\n" + // behind = ( 0 - Q0.z < -Camera.near ) ? 1 : 0
            "sub " + behind + ".y, " + constOne + ".x, " + behind + ".x			\n" + // !behind = 1 - behind

            // p = point on the plane (0,0,-near)
            // n = plane normal (0,0,-1)
            // D = Q1 - Q0
            // t = ( dot( n, ( p - Q0 ) ) / ( dot( n, d )

            // solve for t where line crosses Camera.near
            "add " + offset + ".x, " + q0 + ".z, " + misc + ".z			\n" + // Q0.z + ( -Camera.near )
            "sub " + offset + ".y, " + q0 + ".z, " + q1 + ".z			\n" + // Q0.z - Q1.z

            // fix divide by zero for horizontal lines
            "seq " + offset + ".z, " + offset + ".y " + constNegOne + ".x			\n" + // offset = (Q0.z - Q1.z)==0 ? 1 : 0
            "add " + offset + ".y, " + offset + ".y, " + offset + ".z			\n" + // ( Q0.z - Q1.z ) + offset

            "div " + offset + ".z, " + offset + ".x, " + offset + ".y			\n" + // t = ( Q0.z - near ) / ( Q0.z - Q1.z )

            "mul " + offset + ".xyz, " + offset + ".zzz, " + l + ".xyz	\n" + // t(L)
            "add " + qclipped + ".xyz, " + q0 + ".xyz, " + offset + ".xyz	\n" + // Qclipped = Q0 + t(L)
            "mov " + qclipped + ".w, " + constOne + ".x			\n" + // Qclipped.w = 1

            // If necessary, replace Q0 with new Qclipped
            "mul " + q0 + ", " + q0 + ", " + behind + ".yyyy			\n" + // !behind * Q0
            "mul " + qclipped + ", " + qclipped + ", " + behind + ".xxxx			\n" + // behind * Qclipped
            "add " + q0 + ", " + q0 + ", " + qclipped + "				\n" + // newQ0 = Q0 + Qclipped

            // calculate side vector for line
            "nrm " + l + ".xyz, " + l + ".xyz			\n" + // normalize( L )
            "nrm " + behind + ".xyz, " + q0 + ".xyz			\n" + // D = normalize( Q1 )
            "mov " + behind + ".w, " + constOne + ".x				\n" + // D.w = 1
            "crs " + qclipped + ".xyz, " + l + ", " + behind + "			\n" + // S = L x D
            "nrm " + qclipped + ".xyz, " + qclipped + ".xyz			\n" + // normalize( S )

            // face the side vector properly for the given point
            "mul " + qclipped + ".xyz, " + qclipped + ".xyz, " + thickness + ".xxx	\n" + // S *= weight
            "mov " + qclipped + ".w, " + constOne + ".x			\n" + // S.w = 1

            // calculate the amount required to move at the point's distance to correspond to the line's pixel width
            // scale the side vector by that amount
            "dp3 " + offset + ".x, " + q0 + ", " + constNegOne + "			\n" + // distance = dot( view )
            "mul " + offset + ".x, " + offset + ".x, " + misc + ".x			\n" + // distance *= vpsod
            "mul " + qclipped + ".xyz, " + qclipped + ".xyz, " + offset + ".xxx	\n" + // S.xyz *= pixelScaleFactor

            // add scaled side vector to Q0 and transform to clip space
            "add " + q0 + ".xyz, " + q0 + ".xyz, " + qclipped + ".xyz	\n" + // Q0 + S

            "m44 op, " + q0 + ", " + viewMatrixReg + "			\n"  // transform Q0 to clip space
    }

    public _getFragmentCode(shader:ShaderBase, registerCache:ShaderRegisterCache, sharedRegisters:ShaderRegisterData):string
    {
        return "";
    }
}

RenderGroup.registerElements(_Render_LineElements, LineElements);
Stage.registerAbstraction(_Stage_LineElements, LineElements);