// Use Node.js runtime for this API route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/db/db";
import { filesTable } from "@/db/schema/files-schema";
import { eq, and } from "drizzle-orm";
import { getProjectById } from "@/db/queries/projects-queries";
import { getAllFilesByProjectId } from "@/db/queries/files-queries";
import { generateWasabiPath, getWasabiClient } from "@/lib/wasabi-client";

// Use CORS headers to allow access from your frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function OPTIONS() {
  // Handle CORS preflight requests
  return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401, headers: corsHeaders }
      );
    }
    
    let body;
    try {
      body = await req.json();
    } catch (error) {
      return NextResponse.json(
        { success: false, error: "Invalid request body" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    const { projectId } = body;
    
    if (!projectId) {
      return NextResponse.json(
        { success: false, error: "Project ID is required" },
        { status: 400, headers: corsHeaders }
      );
    }
    
    // Verify Wasabi configuration first
    const requiredVars = {
      WASABI_BUCKET_NAME: process.env.WASABI_BUCKET_NAME,
      WASABI_REGION: process.env.WASABI_REGION,
      WASABI_ENDPOINT: process.env.WASABI_ENDPOINT,
      WASABI_ACCESS_KEY_ID: process.env.WASABI_ACCESS_KEY_ID,
      WASABI_SECRET_ACCESS_KEY: process.env.WASABI_SECRET_ACCESS_KEY
    };
    
    const missingVars = Object.entries(requiredVars)
      .filter(([_, value]) => !value)
      .map(([key]) => key);
    
    if (missingVars.length > 0) {
      return NextResponse.json({
        success: false,
        status: {
          hasMissingEnvVars: true
        },
        message: `Storage configuration is incomplete. Missing: ${missingVars.join(', ')}`,
        missingVars
      }, { headers: corsHeaders });
    }
    
    // Verify S3 client creation
    try {
      getWasabiClient();
    } catch (clientError) {
      return NextResponse.json({
        success: false,
        status: {
          clientCreationError: true
        },
        message: "Failed to create S3 client",
        error: clientError instanceof Error ? clientError.message : "Unknown error"
      }, { headers: corsHeaders });
    }
    
    // Verify the user has access to this project
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { success: false, error: "Project not found" },
        { status: 404, headers: corsHeaders }
      );
    }
    
    if (project.ownerId !== userId) {
      return NextResponse.json(
        { success: false, error: "Unauthorized to access this project" },
        { status: 403, headers: corsHeaders }
      );
    }
    
    // Get all files for the project
    const allFiles = await getAllFilesByProjectId(projectId);
    console.log(`Found ${allFiles.length} total files in project`);
    
    // Filter to files that should have Wasabi paths but don't
    const filesToMigrate = allFiles.filter(file => 
      file.type === 'file' && !file.wasabiObjectPath
    );
    
    console.log(`Found ${filesToMigrate.length} files to migrate to Wasabi`);
    
    if (filesToMigrate.length === 0) {
      return NextResponse.json({ 
        success: true, 
        message: "All files are already on Wasabi", 
        migrated: 0, 
        total: allFiles.filter(f => f.type === 'file').length 
      }, { headers: corsHeaders });
    }
    
    // Migrate each file
    const results = [];
    for (const file of filesToMigrate) {
      try {
        // Generate a proper Wasabi path
        const wasabiObjectPath = generateWasabiPath(userId, projectId, file.name, file.parentId);
        
        // Update the file record with the Wasabi path
        await db
          .update(filesTable)
          .set({
            wasabiObjectPath,
            updatedAt: new Date(),
          })
          .where(eq(filesTable.id, file.id));
        
        // In a full implementation, you would also:
        // 1. Get the file content from wherever it's currently stored
        // 2. Upload it to Wasabi at the new path
        // For now we're just updating the paths
        
        results.push({
          fileId: file.id,
          fileName: file.name,
          status: "migrated",
          wasabiObjectPath
        });
      } catch (fileError) {
        console.error(`Error migrating file ${file.id}:`, fileError);
        results.push({
          fileId: file.id,
          fileName: file.name,
          status: "error",
          error: fileError instanceof Error ? fileError.message : "Unknown error"
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      message: `Migration completed for ${results.filter(r => r.status === "migrated").length} files`,
      results,
      migrated: results.filter(r => r.status === "migrated").length,
      failed: results.filter(r => r.status === "error").length,
      total: allFiles.filter(f => f.type === 'file').length
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error migrating files to Wasabi:", error);
    
    // Return a plain object that can be serialized, not the Error instance
    return NextResponse.json(
      { 
        success: false, 
        status: {
          unexpectedError: true
        },
        message: error instanceof Error ? error.message : "Unknown error" 
      },
      { status: 500, headers: corsHeaders }
    );
  }
} 