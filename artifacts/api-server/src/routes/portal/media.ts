import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { promises as fsp } from "fs";
import { requireAdminAuth } from "../../middlewares/adminAuth";
import { logger } from "../../lib/logger";
import { uploadImage } from "../../lib/cloudinary";

const router: IRouter = Router();

// Use process.cwd() — reliable regardless of bundling/source-map transforms.
// our npm scripts `cd` into the package directory before running,
// so cwd = artifacts/api-server/ in both dev and prod.
const uploadsDir = path.join(process.cwd(), "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif"]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    // Use the original file name stem as the public ID so the Cloudinary URL is human-readable
    const stem = path.basename(file.originalname, ext)
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .toLowerCase()
      .slice(0, 60);
    const timestamp = Date.now();
    cb(null, `${stem}-${timestamp}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error("Only image files (JPEG, PNG, WebP, GIF) are allowed"));
      return;
    }
    // Also validate declared MIME type
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("File must be an image"));
      return;
    }
    cb(null, true);
  },
});

/**
 * Validate a file's true type by inspecting its magic bytes.
 * This prevents MIME-spoofing attacks where a malicious file
 * has a .jpg extension but contains script or binary payloads.
 */
async function validateMagicBytes(filePath: string): Promise<boolean> {
  const fd = await fsp.open(filePath, "r");
  const buffer = Buffer.alloc(12);
  try {
    await fd.read(buffer, 0, 12, 0);
  } finally {
    await fd.close();
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return true;
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return true;
  // GIF: 47 49 46 38 (GIF8)
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x38) return true;
  // WebP: RIFF....WEBP
  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x46 && buffer[11] === 0x50
  ) return true;

  return false;
}

router.post(
  "/bb-portal/media/upload",
  requireAdminAuth,
  upload.single("file"),
  async (req, res): Promise<void> => {
    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const filePath = req.file.path;

    // Verify the file's actual content matches the declared image type
    const isValidImage = await validateMagicBytes(filePath).catch(() => false);
    if (!isValidImage) {
      // Remove the invalid file immediately
      await fsp.unlink(filePath).catch((err) => {
        logger.error({ err, filePath }, "Failed to delete invalid upload");
      });
      res.status(400).json({ error: "Uploaded file does not appear to be a valid image" });
      return;
    }

    try {
      // Upload to Cloudinary for permanent storage
      const publicId = path.basename(filePath, path.extname(filePath));
      const cloudinaryUrl = await uploadImage(filePath, publicId);

      // Local file has already been saved by multer — keep it as a local cache

      // Return the Cloudinary URL which persists forever
      res.json({ url: cloudinaryUrl, filename: req.file.filename });
    } catch (error) {
      logger.error({ error, filePath }, "Failed to upload image to Cloudinary");

      // On Render the local filesystem is ephemeral — files disappear on restart.
      // Using a local fallback would cause 404s later, so we return an error instead.
      if (process.env.NODE_ENV === "production") {
        res.status(502).json({
          error: "Image upload failed. Cloudinary is unavailable.",
          detail: "Please try again later or contact support.",
        });
        return;
      }

      // Fallback for local dev: serve from disk
      const localUrl = `/api/uploads/${req.file.filename}`;
      res.json({ url: localUrl, filename: req.file.filename });
    }
  },
);

export { uploadsDir };
export default router;
