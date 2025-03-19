import { NextResponse, NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFileById } from "@/db/queries/files-queries";
import { getProjectById } from "@/db/queries/projects-queries";
import { getDownloadUrl } from "@/lib/wasabi-client";


// Use Node.js runtime for this API route
export const runtime = "nodejs";

// Tell Next.js to use dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  { params }: { params: { projectId: string, fileId: string } }
) {
  try {
    const { userId } = auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get file details
    const file = await getFileById(params.fileId);
    if (!file) {
      return NextResponse.json({ error: "File not found" }, { status: 404 });
    }

    // Verify project exists
    const project = await getProjectById(file.projectId);
    if (!project) {
      return NextResponse.json({ error: "Project not found" }, { status: 404 });
    }

    // Verify project ownership
    if (project.ownerId !== userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Generate a pre-signed download URL for the file in Wasabi
    try {
      if (!file.wasabiObjectPath) {
        throw new Error("File has no storage path");
      }
      
      const presignedUrl = await getDownloadUrl(file.wasabiObjectPath);

      return NextResponse.json({
        downloadUrl: presignedUrl,
        fileName: file.name,
        mimeType: file.mimeType,
      });
    } catch (wasabiError) {
      console.error("Error generating download URL:", wasabiError);
      return NextResponse.json(
        { error: "Failed to generate download URL" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error processing download request:", error);
    return NextResponse.json(
      { error: "Failed to process download request" },
      { status: 500 }
    );
  }
} 