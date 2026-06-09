import {
  PrismaClient,
  PreviewView,
  ProductType,
} from "@prisma/client";
import { PREVIEW_TYPE_BY_PRODUCT } from "../src/lib/catalog-types";
import { ALLOWED_FABRICS } from "../src/lib/catalog-rules";

const prisma = new PrismaClient();
const apply = process.argv.includes("--apply");

function classify(name: string): ProductType | null {
  const value = name.toLowerCase();
  if (/(shalwar kameez|shalwar qameez|kameez)/.test(value)) {
    return ProductType.SHALWAR_KAMEEZ;
  }
  if (/(formal shirt|dress shirt|office shirt)/.test(value)) {
    return ProductType.FORMAL_SHIRT;
  }
  if (/(t-shirt|t shirt|\btee\b)/.test(value)) return ProductType.T_SHIRT;
  if (/(pant|pants|trouser)/.test(value)) return ProductType.PANTS;
  return null;
}

async function main() {
  const fabrics = await prisma.fabric.findMany({ orderBy: { id: "asc" } });
  for (const fabric of fabrics) {
    const types = Object.entries(ALLOWED_FABRICS)
      .filter(([, names]) => names.includes(fabric.name))
      .map(([productType]) => productType as ProductType);
    console.log(
      `${apply ? "APPLY" : "DRY RUN"} fabric ${fabric.id}: ${types.join(", ") || "manual review"}`
    );
    if (apply) {
      for (const productType of types) {
        await prisma.fabricCompatibility.upsert({
          where: {
            fabricId_productType: { fabricId: fabric.id, productType },
          },
          update: {},
          create: { fabricId: fabric.id, productType },
        });
      }
    }
  }

  const products = await prisma.product.findMany({
    include: { fabrics: { select: { id: true } } },
    orderBy: { id: "asc" },
  });
  const manualReview: Array<{ id: number; code: string; name: string }> = [];

  for (const product of products) {
    const type = product.productType ?? classify(`${product.name} ${product.code}`);
    if (!type) {
      manualReview.push({ id: product.id, code: product.code, name: product.name });
      continue;
    }
    const previewType = PREVIEW_TYPE_BY_PRODUCT[type];
    const front = `assets/previews/${previewType}/base/front.png`;
    const back = `assets/previews/${previewType}/base/back.png`;

    console.log(
      `${apply ? "APPLY" : "DRY RUN"} product ${product.id}: ${type} (${product.fabrics.length} legacy fabrics)`
    );
    if (!apply) continue;

    await prisma.$transaction([
      prisma.product.update({
        where: { id: product.id },
        data: {
          productType: type,
          previewType,
          frontPreviewAsset: product.frontPreviewAsset ?? front,
          backPreviewAsset: product.backPreviewAsset ?? back,
          measurementProfile: product.measurementProfile ?? previewType,
        },
      }),
      ...product.fabrics.map((fabric) =>
        prisma.productFabric.upsert({
          where: {
            productId_fabricId: {
              productId: product.id,
              fabricId: fabric.id,
            },
          },
          update: {},
          create: { productId: product.id, fabricId: fabric.id },
        })
      ),
      prisma.productPreviewAsset.upsert({
        where: {
          productId_view_assetKey: {
            productId: product.id,
            view: PreviewView.FRONT,
            assetKey: "base_front",
          },
        },
        update: { assetUrl: front, isActive: true },
        create: {
          productId: product.id,
          view: PreviewView.FRONT,
          assetKey: "base_front",
          assetUrl: front,
        },
      }),
      prisma.productPreviewAsset.upsert({
        where: {
          productId_view_assetKey: {
            productId: product.id,
            view: PreviewView.BACK,
            assetKey: "base_back",
          },
        },
        update: { assetUrl: back, isActive: true },
        create: {
          productId: product.id,
          view: PreviewView.BACK,
          assetKey: "base_back",
          assetUrl: back,
        },
      }),
    ]);
  }

  console.log(`Manual review required for ${manualReview.length} product(s):`);
  console.table(manualReview);
  if (!apply) console.log("No records changed. Re-run with --apply after reviewing this report.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
