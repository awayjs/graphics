import {Vector3D, ProjectionBase} from "@awayjs/core";

import {Stage} from "@awayjs/stage";

import {ShaderBase, _Render_RenderableBase, AnimationRegisterData} from "@awayjs/renderer";

import {AnimationElements} from "../data/AnimationElements";
import {ParticleUVNode} from "../nodes/ParticleUVNode";

import {ParticleAnimator} from "../ParticleAnimator";

import {ParticleStateBase} from "./ParticleStateBase";

/**
 * ...
 */
export class ParticleUVState extends ParticleStateBase
{
	/** @private */
	public static UV_INDEX:number = 0;

	private _particleUVNode:ParticleUVNode;

	constructor(animator:ParticleAnimator, particleUVNode:ParticleUVNode)
	{
		super(animator, particleUVNode);

		this._particleUVNode = particleUVNode;
	}

	public setRenderState(shader:ShaderBase, renderable:_Render_RenderableBase, animationElements:AnimationElements, animationRegisterData:AnimationRegisterData, projection:ProjectionBase, stage:Stage):void
	{
		if (!shader.usesUVTransform) {
			var index:number = animationRegisterData.getRegisterIndex(this._pAnimationNode, ParticleUVState.UV_INDEX);
			var data:Vector3D = this._particleUVNode._iUvData;
			shader.setVertexConst(index, data.x, data.y);
		}
	}

}