import {ProjectionBase} from "@awayjs/core";

import {Stage} from "@awayjs/stage";

import {IElements, ShaderBase, _Render_RenderableBase, AnimationRegisterData} from "@awayjs/renderer";

import {_Render_Shape} from "../renderables/Shape";

import {AnimationElements} from "./data/AnimationElements";
import {ParticleCollection} from "./data/ParticleCollection";
import {ParticlePropertiesMode} from "./data/ParticlePropertiesMode";
import {ParticleNodeBase} from "./nodes/ParticleNodeBase";
import {ParticleStateBase} from "./states/ParticleStateBase";

import {ParticleAnimationSet} from "./ParticleAnimationSet";
import {AnimatorBase} from "./AnimatorBase";



/**
 * Provides an interface for assigning paricle-based animation data sets to sprite-based entity objects
 * and controlling the various available states of animation through an interative playhead that can be
 * automatically updated or manually triggered.
 *
 * Requires that the containing geometry of the parent sprite is particle geometry
 *
 * @see away.base.ParticleAnimator
 */
export class ParticleAnimator extends AnimatorBase
{

	private _particleAnimationSet:ParticleAnimationSet;
	private _animationParticleStates:Array<ParticleStateBase> = new Array<ParticleStateBase>();
	private _animatorParticleStates:Array<ParticleStateBase> = new Array<ParticleStateBase>();
	private _timeParticleStates:Array<ParticleStateBase> = new Array<ParticleStateBase>();
	private _totalLenOfOneVertex:number = 0;
	private _animatorSubGeometries:Object = new Object();

	/**
	 * Creates a new <code>ParticleAnimator</code> object.
	 *
	 * @param particleAnimationSet The animation data set containing the particle animations used by the animator.
	 */
	constructor(particleAnimationSet:ParticleAnimationSet)
	{
		super(particleAnimationSet);
		this._particleAnimationSet = particleAnimationSet;

		var state:ParticleStateBase;
		var node:ParticleNodeBase;

		for (var i:number = 0; i < this._particleAnimationSet.particleNodes.length; i++) {
			node = this._particleAnimationSet.particleNodes[i];
			state = <ParticleStateBase> this.getAnimationState(node);
			if (node.mode == ParticlePropertiesMode.LOCAL_DYNAMIC) {
				this._animatorParticleStates.push(state);
				node._iDataOffset = this._totalLenOfOneVertex;
				this._totalLenOfOneVertex += node.dataLength;
			} else {
				this._animationParticleStates.push(state);
			}
			if (state.needUpdateTime)
				this._timeParticleStates.push(state);
		}
	}

	/**
	 * @inheritDoc
	 */
	public clone():AnimatorBase
	{
		return new ParticleAnimator(this._particleAnimationSet);
	}

	/**
	 * @inheritDoc
	 */
	public setRenderState(shader:ShaderBase, renderable:_Render_Shape, stage:Stage, projection:ProjectionBase):void
	{
		var animationRegisterData:AnimationRegisterData = this._particleAnimationSet._iAnimationRegisterData;

		var particleCollection:ParticleCollection = renderable.shape.particleCollection;

		var elements:IElements = renderable.shape.elements;

		//process animation sub geometries
		var animationElements:AnimationElements = this._particleAnimationSet.getAnimationElements(particleCollection, elements);
		var i:number;
		
		for (i = 0; i < this._animationParticleStates.length; i++)
			this._animationParticleStates[i].setRenderState(shader, renderable, animationElements, animationRegisterData, projection, stage);

		//process animator subgeometries
		var animatorElements:AnimationElements = this.getAnimatorElements(particleCollection, elements);

		for (i = 0; i < this._animatorParticleStates.length; i++)
			this._animatorParticleStates[i].setRenderState(shader, renderable, animatorElements, animationRegisterData, projection, stage);
	}

	/**
	 * @inheritDoc
	 */
	public testGPUCompatibility(shader:ShaderBase):void
	{

	}

	/**
	 * @inheritDoc
	 */
	public start():void
	{
		super.start();

		for (var i:number = 0; i < this._timeParticleStates.length; i++)
			this._timeParticleStates[i].offset(this._pAbsoluteTime);
	}

	/**
	 * @inheritDoc
	 */
	public _pUpdateDeltaTime(dt:number):void
	{
		this._pAbsoluteTime += dt;

		for (var i:number = 0; i < this._timeParticleStates.length; i++)
			this._timeParticleStates[i].update(this._pAbsoluteTime);
	}

	/**
	 * @inheritDoc
	 */
	public resetTime(offset:number = 0):void
	{
		for (var i:number = 0; i < this._timeParticleStates.length; i++)
			this._timeParticleStates[i].offset(this._pAbsoluteTime + offset);
		this.update(this.time);
	}

	public dispose():void
	{
		for (var key in this._animatorSubGeometries)
			(<AnimationElements> this._animatorSubGeometries[key]).dispose();
	}

	private getAnimatorElements(particleCollection:ParticleCollection, elements:IElements):AnimationElements
	{
		if (!this._animatorParticleStates.length)
			return;

		var animatorElements:AnimationElements = this._animatorSubGeometries[elements.id] = new AnimationElements();

		//create the vertexData vector that will be used for local state data
		animatorElements.createVertexData(elements.numVertices, this._totalLenOfOneVertex);

		//pass the particles data to the animator elements
		animatorElements.animationParticles = this._particleAnimationSet.getAnimationElements(particleCollection, elements).animationParticles;
	}
}