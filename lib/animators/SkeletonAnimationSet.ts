import { ShaderRegisterElement, ShaderRegisterCache, ShaderRegisterData } from '@awayjs/stage';

import { ShaderBase, IAnimationSet } from '@awayjs/renderer';

import { AnimationSetBase } from './AnimationSetBase';

/**
 * The animation data set used by skeleton-based animators, containing skeleton animation data.
 *
 * @see away.animators.SkeletonAnimator
 */
export class SkeletonAnimationSet extends AnimationSetBase implements IAnimationSet {
	private _jointsPerVertex: number;
	private _matricesIndex: number;

	/**
	 * Returns the amount of skeleton joints that can be linked to a single vertex via skinned weight values. For GPU-base animation, the
	 * maximum allowed value is 4.
	 */
	public get jointsPerVertex(): number {
		return this._jointsPerVertex;
	}

	public get matricesIndex(): number {
		return this._matricesIndex;
	}

	/**
	 * Creates a new <code>SkeletonAnimationSet</code> object.
	 *
	 * @param jointsPerVertex Sets the amount of skeleton joints that can be linked to a single vertex via skinned weight values. For GPU-base animation, the maximum allowed value is 4. Defaults to 4.
	 */
	constructor(jointsPerVertex: number = 4) {
		super();

		this._jointsPerVertex = jointsPerVertex;
	}

	/**
	 * @inheritDoc
	 */
	public getAGALVertexCode(shader: ShaderBase, registerCache: ShaderRegisterCache, sharedRegisters: ShaderRegisterData): string {
		this._matricesIndex = registerCache.numUsedVertexConstants;
		const indexOffset0: number = this._matricesIndex;
		const indexOffset1: number = this._matricesIndex + 1;
		const indexOffset2: number = this._matricesIndex + 2;

		const indexStream: ShaderRegisterElement = registerCache.getFreeVertexAttribute();
		shader.jointIndexIndex = indexStream.index;

		const weightStream: ShaderRegisterElement = registerCache.getFreeVertexAttribute();
		shader.jointWeightIndex = weightStream.index;

		const indices: Array<string> = [indexStream + '.x', indexStream + '.y', indexStream + '.z', indexStream + '.w'];
		const weights: Array<string> = [weightStream + '.x', weightStream + '.y', weightStream + '.z', weightStream + '.w'];
		const temp1: ShaderRegisterElement = registerCache.getFreeVertexVectorTemp();
		let dot: string = 'dp4';
		let code: string = '';

		const len: number = sharedRegisters.animatableAttributes.length;
		for (let i: number = 0; i < len; ++i) {

			const source: ShaderRegisterElement = sharedRegisters.animatableAttributes[i];
			const target: ShaderRegisterElement = sharedRegisters.animationTargetRegisters[i];

			for (let j: number = 0; j < this._jointsPerVertex; ++j) {
				registerCache.getFreeVertexConstant();
				registerCache.getFreeVertexConstant();
				registerCache.getFreeVertexConstant();
				code += dot + ' ' + temp1 + '.x, ' + source + ', vc[' + indices[j] + '+' + indexOffset0 + ']\n' +
					dot + ' ' + temp1 + '.y, ' + source + ', vc[' + indices[j] + '+' + indexOffset1 + ']\n' +
					dot + ' ' + temp1 + '.z, ' + source + ', vc[' + indices[j] + '+' + indexOffset2 + ']\n' +
					'mov ' + temp1 + '.w, ' + source + '.w\n' +
					'mul ' + temp1 + ', ' + temp1 + ', ' + weights[j] + '\n'; // apply weight

				// add or mov to target. Need to write to a temp reg first, because an output can be a target
				if (j == 0)
					code += 'mov ' + target + ', ' + temp1 + '\n';
				else
					code += 'add ' + target + ', ' + target + ', ' + temp1 + '\n';
			}

			// switch to dp3 once positions have been transformed, from now on, it should only be vectors instead of points
			dot = 'dp3';
		}

		return code;
	}

	/**
	 * @inheritDoc
	 */
	public getAGALFragmentCode(shader: ShaderBase, registerCache: ShaderRegisterCache, shadedTarget: ShaderRegisterElement): string {
		return '';
	}

	/**
	 * @inheritDoc
	 */
	public getAGALUVCode(shader: ShaderBase, registerCache: ShaderRegisterCache, sharedRegisters: ShaderRegisterData): string {
		return 'mov ' + sharedRegisters.animatedUV + ',' + sharedRegisters.uvInput + '\n';
	}

	/**
	 * @inheritDoc
	 */
	public doneAGALCode(shader: ShaderBase): void {

	}
}