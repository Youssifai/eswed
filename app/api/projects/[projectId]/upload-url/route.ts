import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getProjectById } from "@/db/queries/projects-queries";
import { createFile } from "@/db/queries/files-queries";
import { determineAutoSortFolder } from "@/actions/file-actions";
import { generateWasabiPath, getUploadUrl } from "@/lib/wasabi-client";


// Use Node.js runtime for this API route
export const runtime = "nodejs";

// Tell Next.js to use dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { projectId: string } }
) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const project = await getProjectById(params.projectId);

    if (!project) {
      return NextResponse.json(
        { error: "Project not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this project
    if (project.ownerId !== userId) {
      return NextResponse.json(
        { error: "Unauthorized access to project" },
        { status: 403 }
      );
    }

    // Parse request body
    const body = await req.json();
    const { fileName, fileType, parentId, description, tags } = body;

    if (!fileName || !fileType) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // If no specific parentId is provided, determine the best folder to put the file in
    let targetParentId: string | null = parentId;
    if (!parentId) {
      console.log(`No parent ID provided, auto-sorting ${fileName}`);
      const autoSortFolder = await determineAutoSortFolder(params.projectId, fileName, fileType);
      targetParentId = autoSortFolder || null;
      console.log(`Auto-sorted to folder with ID: ${targetParentId || 'root'}`);
    }

    // Generate a Wasabi path for the file
    const wasabiObjectPath = generateWasabiPath(
      userId, 
      params.projectId, 
      fileName, 
      targetParentId
    );

    // Generate a pre-signed upload URL using the utility function
    try {
      const presignedUrl = await getUploadUrl(wasabiObjectPath, fileType);

      // Create a file record in the database - METADATA ONLY
      const file = await createFile({
        projectId: params.projectId,
        name: fileName,
        type: "file",
        parentId: targetParentId || null,
        mimeType: fileType,
        size: "0", // Will be updated after upload
        wasabiObjectPath: wasabiObjectPath,
        description: description || null,
        tags: tags || null,
      });

      return NextResponse.json({
        fileId: file.id,
        uploadUrl: presignedUrl,
        wasabiObjectPath: wasabiObjectPath,
        targetFolder: targetParentId || "root"
      });
    } catch (wasabiError) {
      console.error("Error generating pre-signed URL:", wasabiError);
      return NextResponse.json(
        { error: "Failed to generate upload URL" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing upload request:", error);
    return NextResponse.json(
      { error: "Failed to process upload request" },
      { status: 500 }
    );
  }
} 