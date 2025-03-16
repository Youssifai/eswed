import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getFileById } from "@/db/queries/files-queries";
import { getProjectById } from "@/db/queries/projects-queries";

export async function GET(
  req: NextRequest,
  { params }: { params: { projectId: string; fileId: string } }
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

    // Get the file
    const file = await getFileById(params.fileId);
    
    if (!file) {
      return NextResponse.json(
        { error: "File not found" },
        { status: 404 }
      );
    }
    
    if (file.projectId !== params.projectId) {
      return NextResponse.json(
        { error: "File does not belong to this project" },
        { status: 403 }
      );
    }
    
    if (file.type !== "file" || !file.wasabiObjectPath) {
      return NextResponse.json(
        { error: "This item cannot be downloaded" },
        { status: 400 }
      );
    }
    
    // In a real implementation, we would generate a pre-signed URL from Wasabi here
    // For demonstration purposes, we'll return a mock URL
    
    // Example of how you'd generate a pre-signed URL using AWS SDK:
    // const s3 = new AWS.S3({
    //   accessKeyId: process.env.WASABI_ACCESS_KEY,
    //   secretAccessKey: process.env.WASABI_SECRET_KEY,
    //   endpoint: process.env.WASABI_ENDPOINT,
    //   s3ForcePathStyle: true,
    //   signatureVersion: 'v4'
    // });
    //
    // const params = {
    //   Bucket: process.env.WASABI_BUCKET_NAME,
    //   Key: file.wasabiObjectPath,
    //   Expires: 60 * 5 // URL expires in 5 minutes
    // };
    //
    // const downloadUrl = await s3.getSignedUrlPromise('getObject', params);

    // Mock response
    const downloadUrl = `https://example-wasabi-storage.com/${file.wasabiObjectPath}?mock-presigned-url`;

    return NextResponse.json({ downloadUrl, fileName: file.name });
  } catch (error) {
    console.error("Error generating download URL:", error);
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
} 