import { NextResponse } from "next/server";
import { checkDatabaseConnection } from "@/db/db";
import { db } from "@/db/db";
import { filesTable } from "@/db/schema/files-schema";
import { sql } from "drizzle-orm";

export async function GET() {
  try {
    // Check database connection
    const connectionStatus = await checkDatabaseConnection();
    
    // Additional debug info
    let debugInfo = {};
    
    // If connected, try a simple query on files table
    if (connectionStatus.connected) {
      try {
        // Try to count total files
        const [{ count }] = await db.select({
          count: sql<number>`count(*)`
        }).from(filesTable);
        
        debugInfo = {
          ...debugInfo,
          filesCount: count,
          filesTableAccessible: true
        };
      } catch (tableError) {
        console.error("Error accessing files table:", tableError);
        debugInfo = {
          ...debugInfo,
          filesTableAccessible: false,
          filesTableError: tableError instanceof Error ? tableError.message : String(tableError)
        };
      }
    }
    
    return NextResponse.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      database: connectionStatus,
      debug: debugInfo
    });
  } catch (error) {
    console.error("Health check error:", error);
    return NextResponse.json(
      {
        status: "error",
        message: error instanceof Error ? error.message : "Unknown error during health check",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
} 