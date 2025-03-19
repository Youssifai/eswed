import { auth, currentUser } from "@clerk/nextjs";
import { NextResponse } from "next/server";

// Use Node.js runtime for this API route
export const runtime = "nodejs";

export async function GET() {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId) {
    return new NextResponse(null, {
      status: 401,
    });
  }

  return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
}

export async function POST() {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId) {
    return new NextResponse(null, {
      status: 401,
    });
  }

  return NextResponse.redirect(new URL("/sign-in", process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"));
} 