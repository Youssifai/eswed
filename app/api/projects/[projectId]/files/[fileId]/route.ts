import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFileById } from "@/db/queries/files-queries";
import { getProjectById } from "@/db/queries/projects-queries";
import { downloadObject } from "@/lib/wasabi-client";

// Tell Next.js to use dynamic rendering for this route
export const dynamic = "force-dynamic";

// Use Node.js runtime for file operations
export const runtime = "nodejs";

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string; fileId: string } }
) {
  try {
    console.log(`[Download File] Request for file: ${params.fileId} in project: ${params.projectId}`);
    
    // Authenticate user
    const { userId } = auth();
    if (!userId) {
      console.log(`[Download File] Unauthorized - No userId`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Validate project exists and user has access
    const project = await getProjectById(params.projectId);
    if (!project) {
      console.log(`[Download File] Project not found: ${params.projectId}`);
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    if (project.ownerId !== userId) {
      console.log(`[Download File] Unauthorized - User doesn't own project`);
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the file details
    const file = await getFileById(params.fileId);
    if (!file) {
      console.log(`[Download File] File not found: ${params.fileId}`);
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Ensure file belongs to the specified project
    if (file.projectId !== params.projectId) {
      console.log(`[Download File] File does not belong to project`);
      return NextResponse.json({ error: "File does not belong to this project" }, { status: 400 });
    }

    // Ensure file has a storage path
    if (!file.wasabiObjectPath) {
      console.log(`[Download File] File has no storage path: ${params.fileId}`);
      return NextResponse.json({ error: "File has no storage path" }, { status: 400 });
    }

    // Download the file from Wasabi
    const fileBuffer = await downloadObject(file.wasabiObjectPath);
    if (!fileBuffer) {
      console.log(`[Download File] Failed to download file from storage: ${params.fileId}`);
      return NextResponse.json(
        { error: "Failed to download file from storage" }, 
        { status: 500 }
      );
    }

    console.log(`[Download File] Successfully downloaded file: ${file.name} (${fileBuffer.length} bytes)`);

    // Determine content type based on file extension
    const extension = file.name.split('.').pop()?.toLowerCase() || '';
    let contentType = 'application/octet-stream'; // Default content type
    
    // Map common extensions to MIME types
    const mimeTypes: Record<string, string> = {
      'txt': 'text/plain',
      'html': 'text/html',
      'css': 'text/css',
      'js': 'text/javascript',
      'json': 'application/json',
      'png': 'image/png',
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'svg': 'image/svg+xml',
      'pdf': 'application/pdf',
      'doc': 'application/msword',
      'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'xls': 'application/vnd.ms-excel',
      'xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'ppt': 'application/vnd.ms-powerpoint',
      'pptx': 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
      'mp3': 'audio/mpeg',
      'mp4': 'video/mp4',
      'zip': 'application/zip',
    };

    if (extension in mimeTypes) {
      contentType = mimeTypes[extension];
    }

    // Create a proper content disposition header
    const contentDisposition = `attachment; filename="${encodeURIComponent(file.name)}"`;

    console.log(`[Download File] Sending file with content type: ${contentType}`);

    // Return the file
    return new NextResponse(fileBuffer, {
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': contentDisposition,
        'Content-Length': fileBuffer.length.toString(),
      },
    });
  } catch (error) {
    console.error("[Download File] Error:", error);
    return NextResponse.json(
      { error: "Failed to download file", details: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
} 