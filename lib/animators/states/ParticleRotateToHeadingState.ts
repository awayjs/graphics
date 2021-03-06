import { Matrix3D } from '@awayjs/core';

import { ShaderBase, _Render_RenderableBase, AnimationRegisterData } from '@awayjs/renderer';

import { AnimationElements } from '../data/AnimationElements';
import { ParticleRotateToHeadingNode } from '../nodes/ParticleRotateToHeadingNode';

import { ParticleAnimator } from '../ParticleAnimator';
import { ParticleAnimationSet } from '../ParticleAnimationSet';

import { ParticleStateBase } from './ParticleStateBase';

/**
 * ...
 */
export class ParticleRotateToHeadingState extends ParticleStateBase {
	/** @private */
	public static MATRIX_INDEX: number = 0;

	private _matrix: Matrix3D = new Matrix3D();

	constructor(animator: ParticleAnimator, particleNode: ParticleRotateToHeadingNode) {
		super(animator, particleNode);
	}

	public setRenderState(shader: ShaderBase, renderable: _Render_RenderableBase, animationElements: AnimationElements, animationRegisterData: AnimationRegisterData): void {
		if ((<ParticleAnimationSet> this._pParticleAnimator.animationSet).hasBillboard) {
			this._matrix.copyFrom(renderable.node.getMatrix3D());
			this._matrix.append(shader.view.projection.transform.inverseMatrix3D);
			shader.setVertexConstFromMatrix(animationRegisterData.getRegisterIndex(this._pAnimationNode, ParticleRotateToHeadingState.MATRIX_INDEX), this._matrix);
		}
	}

}