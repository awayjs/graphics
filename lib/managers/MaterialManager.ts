import { GradientFillStyle } from '../draw/fills/GradientFillStyle';
import { SolidFillStyle } from '../draw/fills/SolidFillStyle';
import { IMaterial } from '@awayjs/renderer';
import { ImageUtils } from '@awayjs/stage';

type ISpecialMaterial = IMaterial & {
	alphaBlending: boolean;
	useColorTransform: boolean;
	ambientMethod?: any;
	animateUVs?: boolean;
}

type IMaterialCtr = { new(...args: any[]): ISpecialMaterial};

export class MaterialManager {

	private static _bitmapMaterial: ISpecialMaterial;
	private static _bitmapMaterialTransform: ISpecialMaterial;
	private static _colorMaterial: ISpecialMaterial;
	/** Atlas solid fills with alpha>=1 — depth-writable / opaque path (E14). */
	private static _colorMaterialOpaque: ISpecialMaterial;

	private static _colorMaterials: any = {};
	private static _textureMaterials: any = {};
	private static _useTextureAtlasForColors: boolean = true;

	/**
	 * When true, solid atlas colors with alpha>=1 use alphaBlending=false so the
	 * renderer can depth-test and material-sort them (E14). Kill-switch for SWF bugs.
	 */
	public static ALLOW_OPAQUE_SOLID_ATLAS: boolean = true;

	public static materialClass: IMaterialCtr;

	public static getMaterialForColor (style: SolidFillStyle): IMaterial {
		if (!MaterialManager.materialClass) {
			throw ('no materialClass registered on MaterialManager!');
		}

		let newmat;

		if (MaterialManager._useTextureAtlasForColors) {
			const wantOpaque = MaterialManager.ALLOW_OPAQUE_SOLID_ATLAS && style.alpha >= 1;
			if (wantOpaque) {
				if (MaterialManager._colorMaterialOpaque)
					return MaterialManager._colorMaterialOpaque;
				newmat = MaterialManager._colorMaterialOpaque = new MaterialManager.materialClass(ImageUtils.getDefaultImage2D());
				newmat.animateUVs = true;
				newmat.alphaBlending = false;
			} else {
				if (MaterialManager._colorMaterial)
					return MaterialManager._colorMaterial;
				newmat = MaterialManager._colorMaterial = new MaterialManager.materialClass(ImageUtils.getDefaultImage2D());
				newmat.animateUVs = true;
				newmat.alphaBlending = true;
			}
		} else {
			const color = style.color;
			const alpha = style.alpha;

			const colorstr: string = color + '_' + Math.round(alpha * 100).toString();
			if (MaterialManager._colorMaterials[colorstr])
				return MaterialManager._colorMaterials[colorstr];

			newmat = MaterialManager._colorMaterials[colorstr] = new MaterialManager.materialClass(color, alpha);
			newmat.alphaBlending = !(MaterialManager.ALLOW_OPAQUE_SOLID_ATLAS && alpha >= 1);
		}

		newmat.useColorTransform = true;
		newmat.bothSides = true;

		return newmat;
	}

	public static getMaterialForGradient (gradient: GradientFillStyle): IMaterial {
		if (!MaterialManager.materialClass) {
			throw ('no materialClass registered on MaterialManager!');
		}

		const lookupstr: string = gradient.type.toString();
		if (MaterialManager._textureMaterials[lookupstr])
			return MaterialManager._textureMaterials[lookupstr];

		const newmat = MaterialManager._textureMaterials[lookupstr] = new MaterialManager.materialClass(ImageUtils.getDefaultImage2D());
		newmat.useColorTransform = true;
		newmat.alphaBlending = true;
		newmat.bothSides = true;
		newmat.animateUVs = true;

		return newmat;
	}

	public static getMaterialForBitmap (transform: boolean = false): IMaterial {
		if (!MaterialManager.materialClass) {
			throw ('no materialClass registered on MaterialManager!');
		}

		let newmat: ISpecialMaterial;

		// Material holds shared shader state only; the bitmap lives on style.image.
		if (transform) {
			if (MaterialManager._bitmapMaterialTransform)
				return MaterialManager._bitmapMaterialTransform;

			newmat = MaterialManager._bitmapMaterialTransform = new MaterialManager.materialClass(ImageUtils.getDefaultImage2D());
			newmat.animateUVs = true;
		} else {
			if (MaterialManager._bitmapMaterial)
				return MaterialManager._bitmapMaterial;

			newmat = MaterialManager._bitmapMaterial = new MaterialManager.materialClass(ImageUtils.getDefaultImage2D());
		}

		newmat.alphaBlending = true;
		newmat.useColorTransform = true;
		newmat.bothSides = true;

		return newmat;
	}
}