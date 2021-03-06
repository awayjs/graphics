import { Vector3D } from '@awayjs/core';

import { ShaderBase, _Render_RenderableBase, AnimationRegisterData } from '@awayjs/renderer';

import { AnimationElements } from '../data/AnimationElements';
import { ParticleAnimationData } from '../data/ParticleAnimationData';
import { ParticleNodeBase } from '../nodes/ParticleNodeBase';

import { ParticleAnimator } from '../ParticleAnimator';

import { AnimationStateBase } from './AnimationStateBase';

/**
 * ...
 */
export class ParticleStateBase extends AnimationStateBase {
	private _particleNode: ParticleNodeBase;
	public _pParticleAnimator: ParticleAnimator;

	public _pDynamicProperties: Array<Vector3D> = new Array<Vector3D>();
	public _pDynamicPropertiesDirty: Object = new Object();

	public _pNeedUpdateTime: boolean;

	constructor(animator: ParticleAnimator, particleNode: ParticleNodeBase, needUpdateTime: boolean = false) {
		super(animator, particleNode);

		this._pParticleAnimator = animator;
		this._particleNode = particleNode;
		this._pNeedUpdateTime = needUpdateTime;
	}

	public get needUpdateTime(): boolean {
		return this._pNeedUpdateTime;
	}

	public setRenderState(shader: ShaderBase, renderable: _Render_RenderableBase, animationElements: AnimationElements, animationRegisterData: AnimationRegisterData): void {

	}

	public _pUpdateDynamicProperties(animationElements: AnimationElements): void {
		this._pDynamicPropertiesDirty[animationElements._iUniqueId] = true;

		const animationParticles: Array<ParticleAnimationData> = animationElements.animationParticles;
		const vertexData: Float32Array = animationElements.vertexData;
		const totalLenOfOneVertex: number = animationElements.totalLenOfOneVertex;
		const dataLength: number = this._particleNode.dataLength;
		const dataOffset: number = this._particleNode._iDataOffset;
		let vertexLength: number;
		//			var particleOffset:number;
		let startingOffset: number;
		let vertexOffset: number;
		let data: Vector3D;
		let animationParticle: ParticleAnimationData;

		//			var numParticles:number = _positions.length/dataLength;
		const numParticles: number = this._pDynamicProperties.length;
		let i: number = 0;
		let j: number = 0;
		let k: number = 0;

		//loop through all particles
		while (i < numParticles) {
			//loop through each particle data for the current particle
			while (j < numParticles && (animationParticle = animationParticles[j]).index == i) {
				data = this._pDynamicProperties[i];
				vertexLength = animationParticle.numVertices * totalLenOfOneVertex;
				startingOffset = animationParticle.startVertexIndex * totalLenOfOneVertex + dataOffset;
				//loop through each vertex in the particle data
				for (k = 0; k < vertexLength; k += totalLenOfOneVertex) {
					vertexOffset = startingOffset + k;
					//						particleOffset = i * dataLength;
					//loop through all vertex data for the current particle data
					for (k = 0; k < vertexLength; k += totalLenOfOneVertex) {
						vertexOffset = startingOffset + k;
						vertexData[vertexOffset++] = data.x;
						vertexData[vertexOffset++] = data.y;
						vertexData[vertexOffset++] = data.z;

						if (dataLength == 4)
							vertexData[vertexOffset++] = data.w;
					}
					//loop through each value in the particle vertex
					//						switch(dataLength) {
					//							case 4:
					//								vertexData[vertexOffset++] = _positions[particleOffset++];
					//							case 3:
					//								vertexData[vertexOffset++] = _positions[particleOffset++];
					//							case 2:
					//								vertexData[vertexOffset++] = _positions[particleOffset++];
					//							case 1:
					//								vertexData[vertexOffset++] = _positions[particleOffset++];
					//						}
				}
				j++;
			}
			i++;
		}

		animationElements.invalidateBuffer();
	}

}