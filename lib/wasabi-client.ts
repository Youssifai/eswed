import { S3Client, PutObjectCommand, GetObjectCommand, HeadBucketCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Initialize S3 client for Wasabi with environment credentials
 */
export function getWasabiClient() {
  // Verify all required environment variables are set
  if (!process.env.WASABI_BUCKET_NAME || 
      !process.env.WASABI_REGION || 
      !process.env.WASABI_ENDPOINT || 
      !process.env.WASABI_ACCESS_KEY_ID || 
      !process.env.WASABI_SECRET_ACCESS_KEY) {
    throw new Error("Missing required Wasabi environment variables");
  }

  // Ensure the endpoint has a protocol
  let endpoint = process.env.WASABI_ENDPOINT;
  if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
    endpoint = `https://${endpoint}`;
  }
  
  console.log("Creating S3 client with endpoint:", endpoint);
  
  // Create the S3 client with full options
  const client = new S3Client({
    endpoint: endpoint,
    region: process.env.WASABI_REGION,
    credentials: {
      accessKeyId: process.env.WASABI_ACCESS_KEY_ID,
      secretAccessKey: process.env.WASABI_SECRET_ACCESS_KEY,
    },
    forcePathStyle: true, // Required for Wasabi
  });
  
  return client;
}

/**
 * Generate a consistent path for storing files in Wasabi
 * Using a structured path format based on metadata
 */
export function generateWasabiPath(
  userId: string,
  projectId: string,
  fileName: string,
  parentId?: string | null
): string {
  // Normalize file name to avoid spaces and special characters
  const safeFileName = fileName
    .replace(/[^a-zA-Z0-9.-]/g, '_') // Replace special chars with underscore
    .toLowerCase();
    
  // Create a standard path format for all files: userId/projectId/[folderId/]filename
  let path = `${userId}/${projectId}`;
  
  // If parent folder ID is provided, include it in the path
  if (parentId) {
    path += `/${parentId}`;
  }
  
  // Extract file extension
  let fileExtension = "";
  if (safeFileName.includes('.')) {
    fileExtension = safeFileName.split('.').pop() || "";
  }
  
  // File is a brief, inspiration, or similar document
  const specialDocuments = ['brief', 'inspiration', 'moodboard', 'proposal', 'contract'];
  const isSpecialDocument = specialDocuments.some(keyword => safeFileName.includes(keyword));
  
  // Ensure special document files have high storage priority
  if (isSpecialDocument) {
    // Add a special priority marker to the path for important documents
    path += `/priority_docs`;
  }
  
  // Add timestamp to avoid collisions and ensure uniqueness
  const timestamp = Date.now();
  
  // Complete the path with filename and timestamp
  path += `/${timestamp}_${safeFileName}`;
  
  return path;
}

/**
 * Generate a pre-signed URL for uploading a file to Wasabi
 */
export async function getUploadUrl(
  wasabiPath: string, 
  contentType: string,
  expiresIn = 3600
): Promise<string> {
  try {
    const s3Client = getWasabiClient();
    
    console.log(`Generating upload URL for ${wasabiPath} with content type ${contentType}`);
    
    const url = await getSignedUrl(
      s3Client,
      new PutObjectCommand({
        Bucket: process.env.WASABI_BUCKET_NAME,
        Key: wasabiPath,
        ContentType: contentType,
      }),
      { expiresIn }
    );
    
    console.log("Successfully generated upload URL");
    return url;
  } catch (error) {
    console.error("Error generating upload URL:", error);
    throw error;
  }
}

/**
 * Verify if the Wasabi bucket exists and is accessible
 */
export async function verifyBucketAccess() {
  try {
    const s3Client = getWasabiClient();
    
    // Test bucket access with HeadBucket command
    await s3Client.send(
      new HeadBucketCommand({
        Bucket: process.env.WASABI_BUCKET_NAME,
      })
    );
    
    return { success: true, message: "Bucket is accessible" };
  } catch (error) {
    console.error("Error verifying bucket access:", error);
    return { 
      success: false, 
      message: "Unable to access bucket", 
      error: error instanceof Error ? error.message : "Unknown error" 
    };
  }
}

/**
 * Creates data URLs for various placeholder file types in development mode
 */
export function getPlaceholderDataUrl(fileName: string): string {
  const fileExtension = fileName.toLowerCase().split('.').pop() || '';
  
  // Tiny transparent PNG (1x1 pixel)
  const pngPlaceholder = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=';
  
  // Tiny JPEG (1x1 pixel, white)
  const jpgPlaceholder = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwD8qqKKKAP/2Q==';
  
  // PDF placeholder with a single page
  const pdfPlaceholder = 'data:application/pdf;base64,JVBERi0xLjUKJbXtrvsKMyAwIG9iago8PCAvTGVuZ3RoIDQgMCBSCiAgIC9GaWx0ZXIgL0ZsYXRlRGVjb2RlCj4+CnN0cmVhbQp4nCvkCuQCABLaAc0KZW5kc3RyZWFtCmVuZG9iago0IDAgb2JqCiAgIDEyCmVuZG9iagoyIDAgb2JqCjw8Cj4+CmVuZG9iago1IDAgb2JqCjw8IC9UeXBlIC9QYWdlCiAgIC9QYXJlbnQgMSAwIFIKICAgL01lZGlhQm94IFsgMCAwIDYxMiA3OTIgXQogICAvQ29udGVudHMgMyAwIFIKICAgL0dyb3VwIDw8CiAgICAgIC9UeXBlIC9Hcm91cAogICAgICAvUyAvVHJhbnNwYXJlbmN5CiAgICAgIC9JIHRydWUKICAgICAgL0NTIC9EZXZpY2VSR0IKICAgPj4KICAgL1Jlc291cmNlcyAyIDAgUgo+PgplbmRvYmoKMSAwIG9iago8PCAvVHlwZSAvUGFnZXMKICAgL0tpZHMgWyA1IDAgUiBdCiAgIC9Db3VudCAxCj4+CmVuZG9iago2IDAgb2JqCjw8IC9DcmVhdG9yIChjYWlybyAxLjE1LjEyIChodHRwOi8vY2Fpcm9ncmFwaGljcy5vcmcpKQogICAvUHJvZHVjZXIgKGNhaXJvIDEuMTUuMTIgKGh0dHA6Ly9jYWlyb2dyYXBoaWNzLm9yZykpCj4+CmVuZG9iago3IDAgb2JqCjw8IC9UeXBlIC9DYXRhbG9nCiAgIC9QYWdlcyAxIDAgUgo+PgplbmRvYmoKeHJlZgowIDgKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwNDI4IDAwMDAwIG4gCjAwMDAwMDAxMjcgMDAwMDAgbiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMTA2IDAwMDAwIG4gCjAwMDAwMDAxNDggMDAwMDAgbiAKMDAwMDAwMDQ5MyAwMDAwMCBuIAowMDAwMDAwNjIwIDAwMDAwIG4gCnRyYWlsZXIKPDwgL1NpemUgOAogICAvUm9vdCA3IDAgUgogICAvSW5mbyA2IDAgUgo+PgpzdGFydHhyZWYKNjcyCiUlRU9GCg==';
  
  // Plain text placeholder
  const textPlaceholder = 'data:text/plain;base64,VGhpcyBpcyBhIHBsYWNlaG9sZGVyIGZpbGUgZm9yIGRldmVsb3BtZW50L2RlbW8gcHVycG9zZXMu';
  
  // Generic file placeholder
  const genericPlaceholder = 'data:application/octet-stream;base64,VGhpcyBpcyBhIHBsYWNlaG9sZGVyIGZpbGUgZm9yIGRldmVsb3BtZW50L2RlbW8gcHVycG9zZXMu';
  
  // Return appropriate placeholder based on file extension
  switch (fileExtension) {
    case 'png':
    case 'gif':
    case 'webp':
    case 'svg':
      return pngPlaceholder;
    case 'jpg':
    case 'jpeg':
      return jpgPlaceholder;
    case 'pdf':
      return pdfPlaceholder;
    case 'txt':
    case 'md':
    case 'csv':
      return textPlaceholder;
    default:
      return genericPlaceholder;
  }
}

/**
 * Generate a pre-signed URL for downloading a file from Wasabi
 * @param objectKey The key of the object in the Wasabi bucket
 * @param fileName Optional original filename to use in Content-Disposition
 * @returns Object containing success status, URL if successful, and error if failed
 */
export async function getDownloadUrl(objectKey: string, fileName?: string): Promise<{ success: boolean, url?: string, error?: string }> {
  console.log(`Generating download URL for: ${objectKey}`);
  
  try {
    const client = getWasabiClient();
    const bucketName = process.env.WASABI_BUCKET_NAME;
    
    if (!bucketName) {
      console.error("Missing WASABI_BUCKET_NAME environment variable");
      return {
        success: false,
        error: "Storage configuration incomplete: Missing bucket name"
      };
    }
    
    const command = new GetObjectCommand({
      Bucket: bucketName,
      Key: objectKey,
      ResponseContentDisposition: fileName 
        ? `attachment; filename="${encodeURIComponent(fileName)}"` 
        : 'attachment'
    });
    
    const url = await getSignedUrl(client, command, { expiresIn: 3600 });
    console.log("Download URL generated successfully");
    
    return {
      success: true,
      url
    };
  } catch (error) {
    console.error("Error generating download URL:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error generating download URL"
    };
  }
} 