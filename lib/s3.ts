import { S3Client, PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Initialize S3 client
const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
  },
});

/**
 * Sanitize filename to remove special characters
 */
export function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[^a-zA-Z0-9.-]/g, "-")
    .replace(/-+/g, "-")
    .toLowerCase();
}

/**
 * Generate a unique S3 key for the file
 */
export function generateS3Key(originalFilename: string, userName: string): string {
  const timestamp = Date.now();
  const sanitizedName = sanitizeFilename(userName);
  const ext = originalFilename.split(".").pop();
  return `ces-demo-audio/${timestamp}-${sanitizedName}.${ext}`;
}

/**
 * Upload file to S3
 */
export async function uploadToS3(
  file: Buffer,
  key: string,
  contentType: string,
  originalFilename: string
): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || "",
    Key: key,
    Body: file,
    ContentType: contentType,
    ContentDisposition: `attachment; filename="${originalFilename}"`,
  });

  await s3Client.send(command);
}

/**
 * Generate presigned URL for downloading the file
 */
export async function generatePresignedUrl(key: string, filename: string): Promise<string> {
  const expirySeconds = parseInt(process.env.PRESIGNED_URL_EXPIRY || "604800"); // 7 days default

  const command = new GetObjectCommand({
    Bucket: process.env.AWS_S3_BUCKET || "",
    Key: key,
    ResponseContentDisposition: `attachment; filename="${filename}"`,
  });

  const url = await getSignedUrl(s3Client, command, {
    expiresIn: expirySeconds,
  });

  return url;
}

/**
 * Get file size in MB
 */
export function getFileSizeInMB(bytes: number): string {
  return (bytes / (1024 * 1024)).toFixed(2);
}
