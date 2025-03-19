import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFilesByProjectId, getFileById } from "@/db/queries/files-queries";
import { getProjectById } from "@/db/queries/projects-queries";


// Use Node.js runtime for this API route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
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

    // Get query parameters
    const url = new URL(req.url);
    const fileId = url.searchParams.get("fileId");

    if (fileId) {
      // Get specific file
      const file = await getFileById(fileId);
      
      if (!file || file.projectId !== params.projectId) {
        return NextResponse.json(
          { error: "File not found" },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ file });
    } else {
      // Get all files for the project
      const files = await getFilesByProjectId(params.projectId);
      return NextResponse.json({ files });
    }
  } catch (error) {
    console.error("Error fetching files:", error);
    return NextResponse.json(
      { error: "Failed to fetch files" },
      { status: 500 }
    );
  }
} 