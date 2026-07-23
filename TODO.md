# Image Upload Fix - Cloudinary Integration

## Progress

- [x] Analyze root cause: Render's ephemeral filesystem wipes local uploads on dyno restart
- [x] Install Cloudinary SDK (`cloudinary@^2.10.0`)
- [x] Create `artifacts/api-server/src/lib/cloudinary.ts` - Cloudinary utility module with upload, delete, and URL parsing functions
- [x] Update `artifacts/api-server/src/routes/portal/media.ts` - Upload to Cloudinary after local disk save, with local fallback
- [ ] Deploy: Add Cloudinary env vars to Render dashboard
  - `CLOUDINARY_CLOUD_NAME` - Your Cloudinary cloud name
  - `CLOUDINARY_API_KEY` - Your Cloudinary API key
  - `CLOUDINARY_API_SECRET` - Your Cloudinary API secret
- [ ] Rebuild and deploy to Render



