// Use Node.js runtime for this API route
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { verifyBucketAccess, getWasabiClient } from "@/lib/wasabi-client";

// Use CORS headers to allow access from your frontend
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

export async function GET(req: NextRequest) {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return NextResponse.json({}, { headers: corsHeaders });
  }

  try {
    const { userId } = auth();
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: "Authentication required" },
        { status: 401, headers: corsHeaders }
      );
    }
    
    // Verify all required environment variables are set
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

    // Test client creation
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
    
    // If all environment variables are present, test bucket access
    const bucketResult = await verifyBucketAccess();
    
    if (!bucketResult.success) {
      return NextResponse.json({
        success: false,
        status: {
          bucketAccessError: true
        },
        message: bucketResult.message,
        error: bucketResult.error
      }, { headers: corsHeaders });
    }
    
    // All checks passed, return success
    return NextResponse.json({
      success: true,
      status: {
        envVarsPresent: true,
        clientCreationSuccess: true,
        bucketAccessSuccess: true
      },
      message: "Wasabi storage is properly configured",
      env: {
        bucketName: process.env.WASABI_BUCKET_NAME,
        region: process.env.WASABI_REGION,
        endpoint: process.env.WASABI_ENDPOINT,
        accessKeyId: process.env.WASABI_ACCESS_KEY_ID?.substring(0, 5) + '...',
      }
    }, { headers: corsHeaders });
  } catch (error) {
    console.error("Error verifying Wasabi configuration:", error);
    
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