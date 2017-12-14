import {EventBase} from "@awayjs/core";

import {Shape} from "../renderables/Shape";

/**
 * Dispatched to notify changes in a sub geometry object's state.
 *
 * @class away.events.ShapeEvent
 * @see away.core.base.Graphics
 */
export class ShapeEvent extends EventBase
{
	/**
	 * Dispatched when a Renderable has been updated.
	 */
	public static ADD_MATERIAL:string = "addMaterial";
	
	/**
	 * Dispatched when a Renderable has been updated.
	 */
	public static REMOVE_MATERIAL:string = "removeMaterial";

	private _shape:Shape;

	/**
	 * Create a new GraphicsEvent
	 * @param type The event type.
	 * @param dataType An optional data type of the vertex data being updated.
	 */
	constructor(type:string, shape:Shape)
	{
		super(type);

		this._shape = shape;
	}

	/**
	 * The renderobject owner of the renderable owner.
	 */
	public get shape():Shape
	{
		return this._shape;
	}

	/**
	 * Clones the event.
	 *
	 * @return An exact duplicate of the current object.
	 */
	public clone():ShapeEvent
	{
		return new ShapeEvent(this.type, this._shape);
	}
}