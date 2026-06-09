# Controlled Men's Catalog and 2D Preview

## Scope

Only these controlled product types are accepted:

- `SHALWAR_KAMEEZ` -> `shalwar_qameez`
- `T_SHIRT` -> `tshirt`
- `PANTS` -> `pants`
- `FORMAL_SHIRT` -> `formal_shirt`

`Product.imageUrl`, `Fabric.imageUrl`, and `StyleOption.imageUrl` remain catalog/selection thumbnails. They are never used as layered preview assets.

## Model Changes

- `Product`: controlled type, men's gender, description, preview configuration, stitching estimate, measurement profile, featured/order controls, explicit compatibility relations, and preview assets. Existing fields and the legacy implicit fabric relation remain.
- `Fabric`: preview texture metadata, default adjustment, unit, seamless-texture flag, and explicit product compatibility. Existing stock and catalog image fields remain.
- `FabricCompatibility`: reusable per-fabric product-type compatibility used before a fabric is assigned to a product.
- `Color`: availability/order controls and explicit product compatibility.
- `Style`: typed product-specific style group with required/multiple/availability/order controls. `imageUrl` is nullable.
- `StyleOption`: overlay identifiers/assets, storage, defaults, availability/order controls, and product compatibility. Existing `imageUrl` remains the picker thumbnail.
- `Measurement`: nullable product/profile/wrist fields. Existing shirt columns become nullable so pants profiles do not need fake shirt values; API validation supplies product-specific requirements.
- `Order`: nullable preview references, generation time, and immutable JSON customization snapshot. `OrderStyle` remains normalized.
- `ProductFabric`, `ProductColor`, `ProductStyle`: explicit compatibility joins.
- `ProductPreviewAsset`: active front/back base assets with optional dimensions.

Customer, user, address, payment, notification, audit-log, order-status-history, and normalized order-style records are not removed.

## File Map

- `prisma/schema.prisma`: additive enums, fields, relations, joins, preview assets, and snapshots.
- `prisma/migrations/.../migration.sql`: reviewed non-destructive SQL.
- `prisma/seed.ts`: idempotent controlled products, fabrics, colors, styles, joins, and assets.
- `scripts/backfill-product-customization.ts`: dry-run/apply classification and legacy-fabric backfill.
- `src/lib/catalog-types.ts`: shared preview mapping and API input interfaces.
- `src/lib/catalog-rules.ts`: controlled fabric and product/style compatibility rules.
- `src/lib/catalog-validation.ts`: Zod schemas, money checks, product mapping, preview requests, and color regex.
- `src/lib/product-customization.ts`: customer configuration, compatibility validation, Decimal pricing, overlays, and snapshots.
- `src/lib/product-route-helpers.ts`: ownership/default/style-assignment guards.
- `src/lib/customer-auth.ts` and `src/lib/auth-helpers.ts`: customer and dashboard Firebase authorization.
- `src/lib/measurement-validation.ts`: product-specific required measurements and wrist validation.
- `src/app/api/products/**`: protected product CRUD, compatibility, configuration, and preview-asset routes.
- `src/app/api/customer/**`: protected customer catalog, detail, configuration, and preview routes.
- `src/app/api/mobile/products/route.ts`: backward-compatible controlled Flutter listing.
- `src/app/api/mobile/orders/**` and `src/app/api/orders/route.ts`: shared preview/order validation, server pricing, snapshots, and legacy aliases.
- `src/lib/catalog-management.ts`: atomic product, compatibility, default, and preview-asset persistence.
- `src/app/actions/product-actions.ts`: dashboard product persistence and availability controls.
- `src/app/actions/fabric-actions.ts`, `color-actions.ts`, and `style-actions.ts`: full dashboard CRUD contracts.
- `src/app/dashboard/products/page.tsx`: six-step product workflow and searchable product table.
- `src/app/dashboard/fabrics/page.tsx`, `colors/page.tsx`, and `styles/page.tsx`: inventory and customization management.
- `D:/FYP/Project/sticho_mobile_app/lib/services/api_service.dart`: authenticated customer catalog contract.
- `D:/FYP/Project/sticho_mobile_app/lib/widgets/dress_preview_widgets.dart`: base/color/overlay Flutter `Stack` renderer.
- `tests/catalog-validation.test.ts`: formal-shirt fabric, style, color, preview mapping, and measurement tests.
- `package.json` / `package-lock.json`: Zod and catalog backfill/test scripts.

## Migration

The named development workflow is:

```bash
npx prisma migrate dev --name add_product_customization_and_preview
npx prisma generate
```

This repository contains reviewed additive SQL in `prisma/migrations/20260607120000_add_product_customization_and_preview/migration.sql`. Apply committed migrations locally with:

```bash
npx prisma migrate dev
```

Apply in production only after backup/review:

```bash
npx prisma migrate deploy
```

Never use `prisma migrate reset`, truncate catalog/order tables, or use `prisma db push` against production.

## Backfill

Dry-run and report unknown products:

```bash
npm run backfill:catalog
```

After manual review:

```bash
npm run backfill:catalog:apply
```

Priority is Shalwar Kameez, Formal Shirt, T-Shirt, Pants, then manual review. Legacy implicit Product-Fabric links are copied. Unknown names remain `productType = null` and are hidden from customer endpoints.

## Seed

```bash
npx prisma db seed
```

The idempotent seed creates four controlled products, compatible fabric subsets, requested colors, product-specific style groups/options, and front/back base assets.

## Postman

Protected requests need `Authorization: Bearer <firebase-id-token>` and `Content-Type: application/json`.

Create product, `POST /api/products`:

```json
{
  "name": "Men's Classic Formal Shirt",
  "code": "FS-002",
  "categoryId": 4,
  "imageUrl": "https://server.example/uploads/products/formal-shirt-blue.jpg",
  "basePrice": "2200.00",
  "description": "Made-to-measure formal shirt.",
  "productType": "FORMAL_SHIRT",
  "frontPreviewAsset": "assets/previews/formal_shirt/base/front.png",
  "backPreviewAsset": "assets/previews/formal_shirt/base/back.png",
  "estimatedDays": 7,
  "measurementProfile": "formal_shirt",
  "isAvailable": true,
  "isFeatured": true,
  "displayOrder": 1,
  "fabricSelections": [
    { "fabricId": 2, "isDefault": true, "priceAdjustment": "400.00" }
  ],
  "colorSelections": [
    { "colorId": 1, "isDefault": true }
  ],
  "styleOptionSelections": [
    { "styleOptionId": 9, "isDefault": true },
    { "styleOptionId": 11, "isDefault": true }
  ]
}
```

The product create/update operation validates all selections and writes product joins plus preview assets in one Prisma transaction.

Create fabric, `POST /api/fabrics`:

```json
{
  "name": "Oxford Cotton",
  "categoryId": 4,
  "description": "Crisp formal shirting.",
  "imageUrl": "https://server.example/catalog/oxford.jpg",
  "textureUrl": "https://server.example/textures/oxford.png",
  "textureStorageType": "REMOTE",
  "price": "1200.00",
  "priceAdjustment": "300.00",
  "stockQuantity": 80,
  "lowStockLimit": 10,
  "unit": "METER",
  "productTypes": ["FORMAL_SHIRT"],
  "isAvailable": true
}
```

Create color, `POST /api/colors`:

```json
{ "name": "Navy", "hexCode": "#1F2A44", "isAvailable": true, "displayOrder": 1 }
```

Create style group, `POST /api/styles`:

```json
{
  "name": "Collar",
  "productType": "FORMAL_SHIRT",
  "groupType": "COLLAR",
  "isRequired": true,
  "allowMultiple": false,
  "displayOrder": 1,
  "isAvailable": true
}
```

Assign fabrics, `PUT /api/products/1/fabrics`:

```json
[
  { "fabricId": 2, "isDefault": true, "priceAdjustment": "400.00" },
  { "fabricId": 3, "isDefault": false, "priceAdjustment": "250.00" }
]
```

Assign colors, `PUT /api/products/1/colors`:

```json
[
  { "colorId": 1, "isDefault": true },
  { "colorId": 4, "isDefault": false }
]
```

Assign styles, `PUT /api/products/1/styles`:

```json
[
  { "styleOptionId": 9, "isDefault": true },
  { "styleOptionId": 11, "isDefault": true }
]
```

Generate preview, `POST /api/customer/orders/preview` (also `/api/mobile/orders/preview`):

```json
{
  "productId": 1,
  "fabricId": 2,
  "colorId": 4,
  "styleOptionIds": [9, 11],
  "view": "FRONT"
}
```

Create order, `POST /api/mobile/orders` (also legacy `/api/orders`):

```json
{
  "productId": 1,
  "fabricId": 2,
  "colorId": 4,
  "measurementId": 8,
  "tailorId": 3,
  "addressId": 5,
  "styleOptionIds": [9, 11],
  "paymentMethod": "STRIPE",
  "notes": "Use matching buttons."
}
```

The server ignores client prices, revalidates compatibility/stock/required groups, calculates with Prisma `Decimal`, and stores `OrderStyle` rows plus `customizationSnapshot`.

## Verification

```bash
npx prisma validate
npx prisma generate
npx tsc --noEmit
npm run lint
npm run test:catalog
npm run build
```

Before making `productType` required in a later migration, confirm every customer-visible product is classified, every product has active front/back assets, required single-select groups have one default, and the backfill manual-review report is resolved.
