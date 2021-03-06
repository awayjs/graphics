import { IElements, AnimationRegisterData, ShaderBase, _Render_RenderableBase, _Stage_ElementsBase, TriangleElements, ElementsBase } from '@awayjs/renderer';

import { Shape, _Render_Shape } from '../renderables/Shape';

import { VertexAnimationMode } from './data/VertexAnimationMode';
import { IVertexAnimationState } from './states/IVertexAnimationState';
import { IAnimationTransition } from './transitions/IAnimationTransition';

import { AnimatorBase } from './AnimatorBase';
import { VertexAnimationSet } from './VertexAnimationSet';

/**
 * Provides an interface for assigning vertex-based animation data sets to entity-based entity objects
 * and controlling the various available states of animation through an interative playhead that can be
 * automatically updated or manually triggered.
 */
export class VertexAnimator extends AnimatorBase {
	private _vertexAnimationSet: VertexAnimationSet;
	private _poses: Array<ElementsBase> = new Array<ElementsBase>();
	private _weights: Float32Array = new Float32Array([1, 0, 0, 0]);
	private _activeVertexState: IVertexAnimationState;

	/**
	 * Creates a new <code>VertexAnimator</code> object.
	 *
	 * @param vertexAnimationSet The animation data set containing the vertex animations used by the animator.
	 */
	constructor(vertexAnimationSet: VertexAnimationSet) {
		super(vertexAnimationSet);

		this._vertexAnimationSet = vertexAnimationSet;
	}

	/**
	 * @inheritDoc
	 */
	public clone(): AnimatorBase {
		return new VertexAnimator(this._vertexAnimationSet);
	}

	/**
	 * Plays a sequence with a given name. If the sequence is not found, it may not be loaded yet, and it will retry every frame.
	 * @param sequenceName The name of the clip to be played.
	 */
	public play(name: string, transition: IAnimationTransition = null, offset: number = NaN): void {
		if (this._pActiveAnimationName == name)
			return;

		this._pActiveAnimationName = name;

		//TODO: implement transitions in vertex animator

		if (!this._pAnimationSet.hasAnimation(name))
			throw new Error('Animation root node ' + name + ' not found!');

		this._pActiveNode = this._pAnimationSet.getAnimation(name);

		this._pActiveState = this.getAnimationState(this._pActiveNode);

		if (this.updatePosition) {
			//update straight away to reset position deltas
			this._pActiveState.update(this._pAbsoluteTime);
			this._pActiveState.positionDelta;
		}

		this._activeVertexState = <IVertexAnimationState> this._pActiveState;

		this.start();

		//apply a time offset if specified
		if (!isNaN(offset))
			this.reset(name, offset);
	}

	/**
	 * @inheritDoc
	 */
	public _pUpdateDeltaTime(dt: number): void {
		super._pUpdateDeltaTime(dt);

		let geometryFlag: boolean = false;

		if (this._poses[0] != this._activeVertexState.currentElements) {
			this._poses[0] = this._activeVertexState.currentElements;
			geometryFlag = true;
		}

		if (this._poses[1] != this._activeVertexState.nextElements)
			this._poses[1] = this._activeVertexState.nextElements;

		this._weights[0] = 1 - (this._weights[1] = this._activeVertexState.blendWeight);

		if (geometryFlag)
			this.invalidateElements();
	}

	/**
	 * @inheritDoc
	 */
	public setRenderState(shader: ShaderBase, renderable: _Render_Shape): void {
		// todo: add code for when running on cpu
		// this type of animation can only be IRenderable
		const shape: Shape = renderable.shape;
		let elements: TriangleElements = <TriangleElements> renderable.stageElements.elements;

		// if no poses defined, set temp data
		if (!this._poses.length) {
			this.setNullPose(shader, elements);
			return;
		}

		const animationRegisterData: AnimationRegisterData = shader.animationRegisterData;
		let i: number;
		const len: number = this._vertexAnimationSet.numPoses;

		shader.setVertexConstFromArray(animationRegisterData.weightsIndex, this._weights);

		if (this._vertexAnimationSet.blendMode == VertexAnimationMode.ABSOLUTE)
			i = 1;
		else
			i = 0;

		let stageElements: _Stage_ElementsBase;
		let k: number = 0;

		for (; i < len; ++i) {
			elements = <TriangleElements> (this._poses[i] || shape.elements);

			stageElements = <_Stage_ElementsBase> elements.getAbstraction(shader.stage);
			stageElements._indexMappings = shape.elements.getAbstraction<_Stage_ElementsBase>(shader.stage).getIndexMappings();

			stageElements.activateVertexBufferVO(animationRegisterData.poseIndices[k++], elements.positions);

			if (shader.normalDependencies > 0)
				stageElements.activateVertexBufferVO(animationRegisterData.poseIndices[k++], elements.normals);
		}
	}

	private setNullPose(shader: ShaderBase, elements: TriangleElements): void {
		const animationRegisterData: AnimationRegisterData = shader.animationRegisterData;

		shader.setVertexConstFromArray(animationRegisterData.weightsIndex, this._weights);
		const stageElements = elements.getAbstraction<_Stage_ElementsBase>(shader.stage);
		let k: number = 0;

		if (this._vertexAnimationSet.blendMode == VertexAnimationMode.ABSOLUTE) {
			const len: number = this._vertexAnimationSet.numPoses;
			for (let i: number = 1; i < len; ++i) {
				stageElements.activateVertexBufferVO(animationRegisterData.poseIndices[k++], elements.positions);

				if (shader.normalDependencies > 0)
					stageElements.activateVertexBufferVO(animationRegisterData.poseIndices[k++], elements.normals);
			}
		}
		// todo: set temp data for additive?
	}

	/**
	 * Verifies if the animation will be used on cpu. Needs to be true for all passes for a material to be able to use it on gpu.
	 * Needs to be called if gpu code is potentially required.
	 */
	public testGPUCompatibility(shader: ShaderBase): void {
	}

	public getRenderableElements(renderState: _Render_RenderableBase, sourceElements: IElements): IElements {
		if (this._vertexAnimationSet.blendMode == VertexAnimationMode.ABSOLUTE && this._poses.length)
			return this._poses[0] || sourceElements;

		//nothing to do here
		return sourceElements;
	}
}