import { Vector3D } from '@awayjs/core';

import { ShaderRegisterCache, ShaderRegisterElement } from '@awayjs/stage';

import { ShaderBase, AnimationRegisterData } from '@awayjs/renderer';

import { ParticlePropertiesMode } from '../data/ParticlePropertiesMode';
import { ParticleBillboardState } from '../states/ParticleBillboardState';

import { ParticleAnimationSet } from '../ParticleAnimationSet';
import { AnimatorBase } from '../AnimatorBase';

import { ParticleNodeBase } from './ParticleNodeBase';

/**
 * A particle animation node that controls the rotation of a particle to always face the camera.
 */
export class ParticleBillboardNode extends ParticleNodeBase {
	/** @private */
	public _iBillboardAxis: Vector3D;

	/**
	 * Creates a new <code>ParticleBillboardNode</code>
	 */
	constructor(billboardAxis: Vector3D = null) {
		super('ParticleBillboard', ParticlePropertiesMode.GLOBAL, 0, 4);

		this._pStateClass = ParticleBillboardState;

		this._iBillboardAxis = billboardAxis;
	}

	/**
	 * @inheritDoc
	 */
	public getAGALVertexCode(shader: ShaderBase, animationSet: ParticleAnimationSet, registerCache: ShaderRegisterCache, animationRegisterData: AnimationRegisterData): string {
		const rotationMatrixRegister: ShaderRegisterElement = registerCache.getFreeVertexConstant();
		animationRegisterData.setRegisterIndex(this, ParticleBillboardState.MATRIX_INDEX, rotationMatrixRegister.index);
		registerCache.getFreeVertexConstant();
		registerCache.getFreeVertexConstant();
		registerCache.getFreeVertexConstant();

		const temp: ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();

		let code: string = 'm33 ' + temp + '.xyz,' + animationRegisterData.scaleAndRotateTarget + ',' + rotationMatrixRegister + '\n' +
							'mov ' + animationRegisterData.scaleAndRotateTarget + '.xyz,' + temp + '\n';

		let shaderRegisterElement: ShaderRegisterElement;
		for (let i: number = 0; i < animationRegisterData.rotationRegisters.length; i++) {
			shaderRegisterElement = animationRegisterData.rotationRegisters[i];
			code += 'm33 ' + temp + '.xyz,' + shaderRegisterElement + ',' + rotationMatrixRegister + '\n' +
					'mov ' + shaderRegisterElement + '.xyz,' + shaderRegisterElement + '\n';
		}

		return code;
	}

	/**
	 * @inheritDoc
	 */
	public getAnimationState(animator: AnimatorBase): ParticleBillboardState {
		return <ParticleBillboardState> animator.getAnimationState(this);
	}

	/**
	 * @inheritDoc
	 */
	public _iProcessAnimationSetting(particleAnimationSet: ParticleAnimationSet): void {
		particleAnimationSet.hasBillboard = true;
	}
}