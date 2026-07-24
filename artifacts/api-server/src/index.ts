import app from "./app";
import { logger } from "./lib/logger";
import { checkSmtpConfig } from "./lib/email";
import { checkCloudinaryConfig } from "./lib/cloudinary";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");

  // Asynchronously check external service configurations
  // These run after the server starts so they don't block boot.
  checkSmtpConfig().then((ok) => {
    if (!ok) {
      logger.warn("SMTP check failed — users will NOT receive email verification or password reset codes");
    }
  });
  checkCloudinaryConfig().then((ok) => {
    if (!ok) {
      logger.warn("Cloudinary check failed — admin image uploads will NOT work");
    }
  });
});
