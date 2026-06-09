import { ProductType } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { CustomizationError } from "@/lib/product-customization";

export async function assertProductOwnership(
  productId: number,
  user: { id: number; role: string }
) {
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      ...(user.role === "TAILOR" ? { userId: user.id } : {}),
    },
  });
  if (!product) throw new CustomizationError("Product not found", 404);
  return product;
}

export function validateSingleDefault<T extends { isDefault?: boolean }>(
  items: T[],
  label: string
) {
  if (items.filter((item) => item.isDefault).length > 1) {
    throw new CustomizationError(`Only one default ${label} is allowed`);
  }
}

export async function assertStylesMatchProduct(
  productType: ProductType | null,
  styleOptionIds: number[]
) {
  if (!productType && styleOptionIds.length) {
    throw new CustomizationError("Classify the product before assigning styles");
  }
  const options = await prisma.styleOption.findMany({
    where: { id: { in: styleOptionIds } },
    include: { style: true },
  });
  if (
    options.length !== new Set(styleOptionIds).size ||
    options.some((option) => option.style.productType !== productType)
  ) {
    throw new CustomizationError("One or more style options do not match the product type");
  }
  return options;
}
