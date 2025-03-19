import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProjectById } from "@/db/queries/projects-queries";
import { getAllFilesByProjectId } from "@/db/queries/files-queries";
import { getWasabiClient, downloadObject } from "@/lib/wasabi-client";
import { GetObjectCommand } from "@aws-sdk/client-s3";
import archiver from "archiver";
import path from "path";
import fs from "fs";
import { tmpdir } from "os";
import { randomUUID } from "crypto";
import { Readable, PassThrough } from "stream";

// Use Node.js runtime for this API route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Set maxDuration to 60 seconds to comply with Vercel free tier
export const maxDuration = 60;

// Maximum number of files per zip - reduced for better performance within time constraints
const MAX_FILES_PER_ZIP = 15;

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

    // Create temporary file path for the zip
    const zipFileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}-${page}.zip`;
    const tmpFilePath = path.join(tmpdir(), `${randomUUID()}-${zipFileName}`);
    console.log(`[Download Project] Temporary file path: ${tmpFilePath}`);

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
    const totalPages = Math.ceil(totalFiles / MAX_FILES_PER_ZIP);
    
    // Enforce pagination limits
    const start = (page - 1) * MAX_FILES_PER_ZIP;
    const end = Math.min(start + MAX_FILES_PER_ZIP, totalFiles);
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

    // Create a write stream to the temporary file
    const output = fs.createWriteStream(tmpFilePath);
    
    // Create a new archive with moderate compression
    const archive = archiver('zip', {
      zlib: { level: 3 } // Lower compression level for faster processing
    });
    
    console.log("[Download Project] Archive created");
    
    // Track count of successfully added files and total processed size
    let successCount = 0;
    let errorCount = 0;
    let totalSizeProcessed = 0;
    
    // Listen for all archiver events to debug any issues
    archive.on('entry', (entry) => {
      console.log(`[Download Project] Entry added to archive: ${entry.name}`);
      successCount++;
    });
    
    // Listen for archive warnings
    archive.on('warning', (err) => {
      console.warn('[Download Project] Archiver warning:', err);
    });
    
    // Listen for archive errors
    archive.on('error', (err) => {
      console.error('[Download Project] Archiver error:', err);
      throw err;
    });
    
    // Pipe the archive data to the file
    archive.pipe(output);

    // Process files with size limits
    for (const file of filesToProcess) {
      // Check if we've already hit our processing limit
      if (totalSizeProcessed >= MAX_TOTAL_SIZE_BYTES) {
        console.log(`[Download Project] Hit size limit of ${MAX_TOTAL_SIZE_MB}MB, stopping processing`);
        break;
      }
      
      if (!file.wasabiObjectPath) {
        console.log(`[Download Project] Skipping file with no storage path: ${file.name}`);
        continue;
      }

      try {
        console.log(`[Download Project] Processing file: ${file.name} (${file.wasabiObjectPath})`);
        
        // Get file size if available (from our database), or estimate based on file type
        const fileSize = file.size ? parseInt(file.size, 10) : 0;
        
        // Skip very large files if we're close to the limit
        if (fileSize > 0 && (totalSizeProcessed + fileSize) > MAX_TOTAL_SIZE_BYTES) {
          console.log(`[Download Project] Skipping large file ${file.name} (${fileSize} bytes) to stay within size limit`);
          continue;
        }
        
        // Use the enhanced download function to get the file
        const fileBuffer = await downloadObject(file.wasabiObjectPath);
        
        if (!fileBuffer) {
          console.warn(`[Download Project] Failed to download file: ${file.name}`);
          errorCount++;
          continue;
        }
        
        console.log(`[Download Project] Downloaded ${fileBuffer.length} bytes for: ${file.name}`);
        totalSizeProcessed += fileBuffer.length;
        
        if (fileBuffer.length === 0) {
          console.warn(`[Download Project] Warning: Empty file content for ${file.name}`);
          errorCount++;
          continue;
        }

        // Determine folder path by traversing up the folder structure
        let folderPath = '';
        if (file.parentId) {
          let currentParentId: string | null = file.parentId;
          const folderParts = [];
          
          // Prevent deep recursion by limiting folder depth
          let depth = 0;
          const MAX_DEPTH = 5;
          
          while (currentParentId && depth < MAX_DEPTH) {
            depth++;
            const parentFolder = allFiles.find(f => f.id === currentParentId);
            if (!parentFolder) {
              console.log(`[Download Project] Parent folder not found for ID: ${currentParentId}`);
              break;
            }
            
            folderParts.unshift(parentFolder.name);
            currentParentId = parentFolder.parentId || null;
          }
          
          folderPath = folderParts.join('/');
        }
        
        // Create the full path for the file in the zip
        const zipFilePath = folderPath ? `${folderPath}/${file.name}` : file.name;
        console.log(`[Download Project] Adding to archive with path: ${zipFilePath}`);
        
        // Add the buffer to the archive
        archive.append(fileBuffer, { name: zipFilePath });
        console.log(`[Download Project] Added buffer for ${zipFilePath} to archive (${fileBuffer.length} bytes)`);
      } catch (error) {
        console.error(`[Download Project] Error processing file ${file.name}:`, error);
        errorCount++;
        // Continue with other files if one fails
      }
    }

    console.log(`[Download Project] Processed files: ${successCount} successful, ${errorCount} errors`);
    
    if (successCount === 0) {
      console.error('[Download Project] No files were successfully added to the archive');
      return NextResponse.json(
        { 
          error: "Failed to add any files to the archive",
          pagination: { page, totalPages, totalFiles }
        },
        { status: 500 }
      );
    }

    // Finalize the archive
    console.log('[Download Project] Finalizing archive...');
    await archive.finalize();
    
    console.log('[Download Project] Archive finalized, waiting for output stream to close...');
    
    // Wait for the output stream to finish
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        console.log(`[Download Project] Archive created: ${tmpFilePath}`);
        console.log(`[Download Project] Archive size: ${archive.pointer()} bytes`);
        resolve();
      });
      output.on('error', (err) => {
        console.error('[Download Project] Output stream error:', err);
        reject(err);
      });
    });

    // Check if the file exists and has content
    const stats = fs.statSync(tmpFilePath);
    console.log(`[Download Project] File stats: size=${stats.size}, isFile=${stats.isFile()}`);
    
    if (stats.size === 0) {
      console.error('[Download Project] Error: ZIP file is empty');
      return NextResponse.json(
        { 
          error: "Generated ZIP file is empty",
          pagination: { page, totalPages, totalFiles } 
        },
        { status: 500 }
      );
    }

    // Read the zip file into memory
    const zipBuffer = fs.readFileSync(tmpFilePath);
    console.log(`[Download Project] ZIP file loaded into memory: ${zipBuffer.length} bytes`);
    
    // Clean up the temporary file
    try {
      fs.unlinkSync(tmpFilePath);
      console.log(`[Download Project] Temporary file deleted: ${tmpFilePath}`);
    } catch (error) {
      console.warn(`[Download Project] Failed to delete temporary file: ${tmpFilePath}`, error);
      // Non-critical error, continue
    }

    // Return the zip file as a response
    const response = new NextResponse(zipBuffer);
    
    // Set appropriate headers
    const suggestedFilename = totalPages > 1 
      ? `${project.name.replace(/[^a-z0-9]/gi, '_')}_part${page}_of_${totalPages}.zip` 
      : `${project.name.replace(/[^a-z0-9]/gi, '_')}.zip`;
      
    response.headers.set('Content-Type', 'application/zip');
    response.headers.set('Content-Disposition', `attachment; filename="${suggestedFilename}"`);
    response.headers.set('Content-Length', zipBuffer.length.toString());
    
    // Add pagination info in headers
    response.headers.set('X-Pagination-Page', page.toString());
    response.headers.set('X-Pagination-Total-Pages', totalPages.toString());
    response.headers.set('X-Pagination-Total-Files', totalFiles.toString());
    
    console.log(`[Download Project] Returning ZIP file (${zipBuffer.length} bytes)`);
    return response;
  } catch (error) {
    console.error("[Download Project] Error:", error);
    return NextResponse.json(
      { error: "Failed to create ZIP file: " + (error instanceof Error ? error.message : "Unknown error") },
      { status: 500 }
    );
  }
} 