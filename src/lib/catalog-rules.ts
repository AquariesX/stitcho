export type ControlledProductType =
  | "SHALWAR_KAMEEZ"
  | "T_SHIRT"
  | "PANTS"
  | "FORMAL_SHIRT";

export const CONTROLLED_CATEGORIES = [
  { name: "SHALWAR KAMEEZ", code: "SHALWAR_KAMEEZ" },
  { name: "T SHIRT", code: "T_SHIRT" },
  { name: "PANTS", code: "PANTS" },
  { name: "FORMAL SHIRT", code: "FORMAL_SHIRT" },
] as const;

export function controlledCategory(code: string) {
  return CONTROLLED_CATEGORIES.find((category) => category.code === code);
}

export const ALLOWED_FABRICS: Record<ControlledProductType, readonly string[]> = {
  SHALWAR_KAMEEZ: [
    "Premium Cotton",
    "Wash and Wear",
    "Linen",
    "Khaddar",
    "Blended Fabric",
    "Boski",
  ],
  T_SHIRT: [
    "Cotton Jersey",
    "Premium Cotton",
    "Pique Cotton",
    "Cotton-Polyester Blend",
    "Performance Polyester",
  ],
  PANTS: [
    "Cotton Twill",
    "Gabardine",
    "Polyester Blend",
    "Wool Blend",
    "Linen Blend",
  ],
  FORMAL_SHIRT: [
    "Premium Cotton",
    "Poplin",
    "Oxford Cotton",
    "Twill Cotton",
    "Broadcloth",
    "Cotton-Polyester Blend",
    "Linen Blend",
  ],
};

export function isFabricAllowed(
  productType: ControlledProductType,
  fabricName: string
) {
  return ALLOWED_FABRICS[productType].includes(fabricName);
}

export function isStyleTypeCompatible(
  productType: ControlledProductType,
  styleProductType: ControlledProductType | null
) {
  return productType === styleProductType;
}
