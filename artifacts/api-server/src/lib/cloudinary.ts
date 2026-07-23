import { v2 as cloudinary } from "cloudinary";
import { logger } from "./logger";

/**
 * Cloudinary utility module.
 *
 * Requires these environment variables:
 *   CLOUDINARY_CLOUD_NAME
 *   CLOUDINARY_API_KEY
 *   CLOUDINARY_API_SECRET
 *
 * All image uploads go through here so they persist permanently in the cloud
 * instead of Render's ephemeral filesystem.
 */

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const CLOUDINARY_FOLDER = "beckbest-bridal/products";

/**
 * Upload a local image file to Cloudinary.
 *
 * @param filePath  Absolute path to the file on disk.
 * @param publicId  Optional public ID (without folder prefix).  If omitted,
 *                  Cloudinary generates a random one.
 * @returns         The full HTTPS URL of the uploaded asset.
 */
export async function uploadImage(
  filePath: string,
  publicId?: string,
): Promise<string> {
  const result = await cloudinary.uploader.upload(filePath, {
    folder: CLOUDINARY_FOLDER,
    public_id: publicId,
    resource_type: "image",
    // Automatically convert to WebP for smaller sizes
    format: "webp",
    // Strip metadata and apply sensible defaults
    fetch_format: "auto",
    quality: "auto:best",
  });

  logger.info(
    { publicId: result.public_id, url: result.secure_url },
    "Uploaded image to Cloudinary",
  );

  return result.secure_url;
}

/**
 * Upload a buffer directly to Cloudinary (useful for streams).
 * Falls back to `uploadImage` if you have a file path.
 */
export async function uploadImageBuffer(
  buffer: Buffer,
  options?: { publicId?: string; filename?: string },
): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: CLOUDINARY_FOLDER,
        public_id: options?.publicId,
        resource_type: "image",
        format: "webp",
        fetch_format: "auto",
        quality: "auto:best",
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload returned no result"));
          return;
        }
        logger.info(
          { publicId: result.public_id, url: result.secure_url },
          "Uploaded image buffer to Cloudinary",
        );
        resolve(result.secure_url);
      },
    );
    uploadStream.end(buffer);
  });
}

/**
 * Delete an image from Cloudinary by its full HTTPS URL.
 * Extracts the public ID from the URL automatically.
 */
export async function deleteImageByUrl(imageUrl: string): Promise<void> {
  const publicId = publicIdFromUrl(imageUrl);
  if (!publicId) {
    logger.warn({ imageUrl }, "Could not extract public ID from URL — skipping deletion");
    return;
  }
  await deleteImage(publicId);
}

/**
 * Delete an image by its public ID (e.g. "beckbest-bridal/products/abc-123").
 */
export async function deleteImage(publicId: string): Promise<void> {
  const result = await cloudinary.uploader.destroy(publicId);
  logger.info({ publicId, result }, "Deleted image from Cloudinary");
}

/**
 * Extract the Cloudinary public ID from a secure_url.
 * Example:
 *   https://res.cloudinary.com/demo/image/upload/v1234/beckbest-bridal/products/abc123.webp
 *   → beckbest-bridal/products/abc123
 */
export function publicIdFromUrl(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    // Cloudinary URLs have the format:
    // /<cloud_name>/image/upload/v<version>/<folder>/<public_id>.<ext>
    const segments = url.pathname.split("/");
    // Find the "upload" segment
    const uploadIndex = segments.indexOf("upload");
    if (uploadIndex === -1 || uploadIndex + 2 >= segments.length) return null;
    // Everything after "upload/v<version>/" is the public ID with extension
    const publicIdWithExt = segments.slice(uploadIndex + 2).join("/");
    // Strip the file extension
    return publicIdWithExt.replace(/\.\w+$/, "");
  } catch {
    return null;
  }
}

