import type {
  AssetStorageType,
  Gender,
  PreviewView,
  ProductType,
  StyleGroupType,
} from "@prisma/client";

export const PREVIEW_TYPE_BY_PRODUCT: Record<ProductType, string> = {
  SHALWAR_KAMEEZ: "shalwar_qameez",
  T_SHIRT: "tshirt",
  PANTS: "pants",
  FORMAL_SHIRT: "formal_shirt",
};

export const PRODUCT_TYPE_LABELS: Record<ProductType, string> = {
  SHALWAR_KAMEEZ: "Men's Shalwar Kameez",
  T_SHIRT: "Men's T-Shirt",
  PANTS: "Men's Pants",
  FORMAL_SHIRT: "Men's Formal Shirt",
};

export interface ProductInput {
  name: string;
  code: string;
  categoryId: number;
  imageUrl: string;
  basePrice: string;
  description?: string | null;
  productType?: ProductType | null;
  gender?: Gender;
  previewType?: string | null;
  frontPreviewAsset?: string | null;
  backPreviewAsset?: string | null;
  previewStorageType?: AssetStorageType;
  estimatedDays?: number | null;
  measurementProfile?: string | null;
  isAvailable?: boolean;
  isFeatured?: boolean;
  displayOrder?: number;
  userId?: number | null;
}

export interface ProductFabricInput {
  fabricId: number;
  isDefault?: boolean;
  priceAdjustment?: string;
}

export interface ProductColorInput {
  colorId: number;
  isDefault?: boolean;
}

export interface ProductStyleInput {
  styleOptionId: number;
  isDefault?: boolean;
}

export interface PreviewAssetInput {
  view: PreviewView;
  assetKey: string;
  assetUrl: string;
  storageType?: AssetStorageType;
  width?: number | null;
  height?: number | null;
  isActive?: boolean;
}

export interface CustomizationStyleGroup {
  id: number;
  name: string;
  groupType: StyleGroupType | null;
  isRequired: boolean;
  allowMultiple: boolean;
  options: unknown[];
}
