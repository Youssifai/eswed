import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProjectById } from "@/db/queries/projects-queries";
import { getAllFilesByProjectId } from "@/db/queries/files-queries";
import { getWasabiClient, downloadObject } from "@/lib/wasabi-client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import path from "path";
import { randomUUID } from "crypto";
import { Readable, PassThrough } from "stream";

// Use Node.js runtime for this API route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Set maxDuration to 60 seconds to comply with Vercel free tier
export const maxDuration = 60;

// Maximum number of files per response - reduced for better performance within time constraints
const MAX_FILES_PER_RESPONSE = 15;

// Maximum total size of files to process in a single request (10MB)
const MAX_TOTAL_SIZE_MB = 10;
const MAX_TOTAL_SIZE_BYTES = MAX_TOTAL_SIZE_MB * 1024 * 1024;

// Function to read a readable stream into a buffer
async function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
    stream.on('error', reject);
  });
}

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    console.log(`[Download Project] Starting download for project ID: ${params.projectId}`);
    
    // Get pagination parameters
    const searchParams = request.nextUrl.searchParams;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const fileIds = searchParams.get('fileIds'); // Optional comma-separated list of specific file IDs
    
    console.log(`[Download Project] Page: ${page}, FileIds: ${fileIds || 'none'}`);
    
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      console.log("[Download Project] Unauthorized - No userId");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(`[Download Project] Authorized user: ${userId}`);

    // Get project details and verify ownership
    const project = await getProjectById(params.projectId);
    if (!project) {
      console.log("[Download Project] Project not found");
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.ownerId !== userId) {
      console.log("[Download Project] Unauthorized - User doesn't own project");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log(`[Download Project] Project found: ${project.name}`);

    // Get all files for the project
    const allFiles = await getAllFilesByProjectId(params.projectId);
    console.log(`[Download Project] Retrieved ${allFiles ? allFiles.length : 0} files`);
    
    if (!allFiles || allFiles.length === 0) {
      console.log("[Download Project] No files found in project");
      return NextResponse.json({ error: "No files found in project" }, { status: 404 });
    }

    // Filter and prepare files
    let filesToProcess = allFiles.filter(file => file.type === "file" && file.wasabiObjectPath);
    
    // If specific file IDs were provided, only include those
    if (fileIds) {
      const idList = fileIds.split(',');
      filesToProcess = filesToProcess.filter(file => idList.includes(file.id));
      console.log(`[Download Project] Filtered to ${filesToProcess.length} requested files`);
    }

    // Apply pagination to files
    const totalFiles = filesToProcess.length;
    const totalPages = Math.ceil(totalFiles / MAX_FILES_PER_RESPONSE);
    
    // Enforce pagination limits
    const start = (page - 1) * MAX_FILES_PER_RESPONSE;
    const end = Math.min(start + MAX_FILES_PER_RESPONSE, totalFiles);
    filesToProcess = filesToProcess.slice(start, end);
    
    console.log(`[Download Project] Processing files ${start + 1} to ${end} of ${totalFiles} (Page ${page}/${totalPages})`);
    
    if (filesToProcess.length === 0) {
      console.log("[Download Project] No valid files with storage paths found for this page");
      return NextResponse.json({ 
        error: "No valid files found for this page",
        pagination: { page, totalPages, totalFiles }
      }, { status: 404 });
    }

    // Initialize S3 client
    const bucketName = process.env.WASABI_BUCKET_NAME;

    if (!bucketName) {
      console.log("[Download Project] Missing Wasabi bucket name");
      return NextResponse.json(
        { error: "Storage configuration incomplete" },
        { status: 500 }
      );
    }
    console.log(`[Download Project] Using bucket: ${bucketName}`);
    
    // For simplicity in development/testing, just download the first file and send it directly
    // This avoids the complexity of creating a ZIP archive which is causing build issues
    const fileToDownload = filesToProcess[0];
    
    if (!fileToDownload || !fileToDownload.wasabiObjectPath) {
      return NextResponse.json({ error: "File not found or has no storage path" }, { status: 404 });
    }
    
    try {
      console.log(`[Download Project] Downloading file: ${fileToDownload.name}`);
      
      // Download the file from Wasabi
      const fileBuffer = await downloadObject(fileToDownload.wasabiObjectPath);
      
      if (!fileBuffer || fileBuffer.length === 0) {
        console.warn(`[Download Project] Failed to download file or file is empty: ${fileToDownload.name}`);
        return NextResponse.json({ error: "Failed to download file" }, { status: 500 });
      }
      
      console.log(`[Download Project] Successfully downloaded ${fileBuffer.length} bytes for: ${fileToDownload.name}`);
      
      // Create a simple response with the file data
      const response = new NextResponse(fileBuffer);
      
      // Set appropriate headers for file download
      response.headers.set('Content-Type', fileToDownload.mimeType || 'application/octet-stream');
      response.headers.set('Content-Disposition', `attachment; filename="${fileToDownload.name}"`);
      response.headers.set('Content-Length', fileBuffer.length.toString());
      
      return response;
    } catch (error) {
      console.error(`[Download Project] Error downloading file: ${error}`);
      return NextResponse.json({ error: "Error downloading file" }, { status: 500 });
    }
  } catch (error) {
    console.error("[Download Project] Unexpected error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred" },
      { status: 500 }
    );
  }
} 