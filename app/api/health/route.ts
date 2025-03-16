import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/db/db";

export async function GET() {
  try {
    // Check database connection
    const dbStatus = await checkDatabaseConnection();
    
    if (!dbStatus.connected) {
      return NextResponse.json(
        { 
          status: "error", 
          database: { connected: false, error: dbStatus.error },
          timestamp: new Date().toISOString()
        }, 
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { 
        status: "healthy", 
        database: { connected: true },
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Health check error:", error);
    
    return NextResponse.json(
      { 
        status: "error", 
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 