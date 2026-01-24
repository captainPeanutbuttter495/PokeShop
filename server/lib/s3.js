// server/lib/s3.js
import { S3Client, PutObjectCommand, DeleteObjectCommand } from "@aws-sdk/client-s3";

const s3Client = new S3Client({
  region: process.env.AWS_REGION || "us-east-1",
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const BUCKET_NAME = process.env.AWS_S3_BUCKET || "pokeshop-card-images";

/**
 * Upload a file buffer to S3
 * @param {Buffer} fileBuffer - The file buffer to upload
 * @param {string} key - The S3 object key (path)
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<string>} The public URL of the uploaded file
 */
export async function uploadToS3(fileBuffer, key, contentType) {
  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
    Body: fileBuffer,
    ContentType: contentType,
  });

  await s3Client.send(command);

  // Return the public URL
  return `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION || "us-east-1"}.amazonaws.com/${key}`;
}

/**
 * Delete a file from S3
 * @param {string} key - The S3 object key to delete
 */
export async function deleteFromS3(key) {
  const command = new DeleteObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  await s3Client.send(command);
}

/**
 * Extract the S3 key from a full S3 URL
 * @param {string} url - The full S3 URL
 * @returns {string|null} The S3 key or null if not a valid S3 URL
 */
export function extractS3Key(url) {
  if (!url) return null;

  try {
    const urlObj = new URL(url);
    // Extract key from path (remove leading slash)
    return urlObj.pathname.slice(1);
  } catch {
    return null;
  }
}
