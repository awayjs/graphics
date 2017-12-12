import {AnimationNodeBase} from "@awayjs/renderer";

import {AnimatorBase} from "../AnimatorBase";

/**
 *
 */
export interface IAnimationTransition
{
	getAnimationNode(animator:AnimatorBase, startNode:AnimationNodeBase, endNode:AnimationNodeBase, startTime:number):AnimationNodeBase
}