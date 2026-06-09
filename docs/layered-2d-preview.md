# Layered 2D previews

Apply the database changes with:

```powershell
npx prisma validate
npx prisma migrate deploy
npx prisma generate
```

Required environment variables:

- `DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `FIREBASE_CLIENT_EMAIL`
- `FIREBASE_PRIVATE_KEY`

Optional:

- `ALLOWED_ASSET_DOMAINS`: comma-separated HTTPS hostnames accepted by remote legacy preview asset validation.

The current client-side Firebase configuration is defined in `src/lib/firebase.ts`; no additional upload-specific environment variable was introduced by this migration.

Product thumbnails may be JPG or PNG. Model and clothing/style overlays must be PNG at 1080x1440. Overlay uploads must include transparent pixels. Existing `imageUrl` values are copied only to `thumbnailUrl`; model and overlay columns remain null until dedicated assets are uploaded.
