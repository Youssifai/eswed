import { getProfileByUserIdAction } from "@/actions/profiles-actions";
import { Toaster } from "@/components/ui/toaster";
import { Providers } from "@/components/utilities/providers";
import { createProfile } from "@/db/queries/profiles-queries";
import { ClerkProvider } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

// Force use of Node.js runtime to avoid Edge Runtime issues with Clerk
export const runtime = "nodejs";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Notes App",
  description: "A full-stack template for a notes app."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId } = auth();

  if (userId) {
    const res = await getProfileByUserIdAction(userId);
    if (!res.data) {
      const now = new Date();
      await createProfile({
        userId,
        updatedAt: now,
        createdAt: now
      });
    }
  }

  return (
    <ClerkProvider>
      <html lang="en">
        <body className={inter.className}>
          <Providers
            attribute="class"
            defaultTheme="dark"
            disableTransitionOnChange
          >
            {children}
            <Toaster />
          </Providers>
        </body>
      </html>
    </ClerkProvider>
  );
}
