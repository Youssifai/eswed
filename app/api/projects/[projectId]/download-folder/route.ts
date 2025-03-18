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

// Tell Next.js to use dynamic rendering for this route
export const dynamic = "force-dynamic";

// Use Node.js runtime for file operations
export const runtime = "nodejs";

// Force a longer timeout
export const maxDuration = 300; // Increase to 5 minutes for larger projects

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
    const zipFileName = `${project.name.replace(/[^a-z0-9]/gi, '_')}-${Date.now()}.zip`;
    const tmpFilePath = path.join(tmpdir(), `${randomUUID()}-${zipFileName}`);
    console.log(`[Download Project] Temporary file path: ${tmpFilePath}`);

    // Get all files for the project
    const allFiles = await getAllFilesByProjectId(params.projectId);
    console.log(`[Download Project] Retrieved ${allFiles ? allFiles.length : 0} files`);
    
    if (!allFiles || allFiles.length === 0) {
      console.log("[Download Project] No files found in project");
      return NextResponse.json({ error: "No files found in project" }, { status: 404 });
    }

    // Filter out folders, we only need files with valid Wasabi paths
    const files = allFiles.filter(file => file.type === "file" && file.wasabiObjectPath);
    console.log(`[Download Project] Filtered to ${files.length} actual files with Wasabi paths`);
    
    if (files.length === 0) {
      console.log("[Download Project] No valid files with storage paths found");
      return NextResponse.json({ error: "No valid files found with storage paths" }, { status: 404 });
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
    
    // Create a new archive with better debugging
    const archive = archiver('zip', {
      zlib: { level: 5 } // Compression level
    });
    
    console.log("[Download Project] Archive created");
    
    // Track count of successfully added files
    let successCount = 0;
    let errorCount = 0;
    
    // Listen for all archiver events to debug any issues
    archive.on('entry', (entry) => {
      console.log(`[Download Project] Entry added to archive: ${entry.name}`);
      successCount++;
    });
    
    archive.on('progress', (progress) => {
      console.log(`[Download Project] Archive progress: ${progress.entries.processed}/${progress.entries.total} entries`);
    });
    
    // Listen for archive warnings
    archive.on('warning', (err) => {
      if (err.code === 'ENOENT') {
        console.warn('[Download Project] Archiver warning:', err);
      } else {
        console.error('[Download Project] Archiver error:', err);
        throw err;
      }
    });
    
    // Listen for archive errors
    archive.on('error', (err) => {
      console.error('[Download Project] Archiver error:', err);
      throw err;
    });
    
    // Pipe the archive data to the file
    archive.pipe(output);

    // Process each file sequentially to avoid memory issues
    for (const file of files) {
      if (!file.wasabiObjectPath) {
        console.log(`[Download Project] Skipping file with no storage path: ${file.name}`);
        continue;
      }

      try {
        console.log(`[Download Project] Processing file: ${file.name} (${file.wasabiObjectPath})`);
        
        // Use the enhanced download function to get the file
        const fileBuffer = await downloadObject(file.wasabiObjectPath);
        
        if (!fileBuffer) {
          console.warn(`[Download Project] Failed to download file: ${file.name}`);
          errorCount++;
          continue;
        }
        
        console.log(`[Download Project] Downloaded ${fileBuffer.length} bytes for: ${file.name}`);
        
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
          
          while (currentParentId) {
            const parentFolder = allFiles.find(f => f.id === currentParentId);
            if (!parentFolder) {
              console.log(`[Download Project] Parent folder not found for ID: ${currentParentId}`);
              break;
            }
            
            folderParts.unshift(parentFolder.name);
            console.log(`[Download Project] Added parent folder to path: ${parentFolder.name}`);
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

    console.log(`[Download Project] Processed ${files.length} files: ${successCount} successful, ${errorCount} errors`);
    
    if (successCount === 0) {
      console.error('[Download Project] No files were successfully added to the archive');
      return NextResponse.json(
        { error: "Failed to add any files to the archive" },
        { status: 500 }
      );
    }

    // Finalize the archive and wait for it to complete
    console.log('[Download Project] Finalizing archive...');
    await archive.finalize();
    
    console.log('[Download Project] Archive finalized, waiting for output stream to close...');
    
    // Wait for the output stream to finish
    await new Promise<void>((resolve, reject) => {
      output.on('close', () => {
        console.log(`[Download Project] Archive created: ${tmpFilePath}`);
        console.log(`[Download Project] Archive size: ${archive.pointer()} bytes`);
        // Additional check: if archive size is 0 or very small, this indicates a problem
        if (archive.pointer() < 100) {
          console.error('[Download Project] Warning: Archive size is suspiciously small');
        }
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
        { error: "Generated ZIP file is empty" },
        { status: 500 }
      );
    }

    // Read the zip file into memory
    console.log('[Download Project] Reading ZIP file into memory...');
    const zipBuffer = fs.readFileSync(tmpFilePath);
    console.log(`[Download Project] ZIP file loaded into memory: ${zipBuffer.length} bytes`);
    
    // Create a proper content disposition header
    const contentDisposition = `attachment; filename="${encodeURIComponent(zipFileName)}"`;

    // Clean up the temporary file
    try {
      fs.unlinkSync(tmpFilePath);
      console.log(`[Download Project] Temporary file deleted: ${tmpFilePath}`);
    } catch (err) {
      console.error('[Download Project] Error deleting temporary file:', err);
    }

    console.log('[Download Project] Returning ZIP file to client...');
    // Return the zip file
    return new NextResponse(zipBuffer, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': contentDisposition,
        'Content-Length': zipBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[Download Project] Error processing download request:", error);
    return NextResponse.json(
      { error: "Failed to process download request", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 