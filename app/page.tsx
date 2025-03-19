import Link from 'next/link';

// Force use of Node.js runtime to avoid Edge Runtime issues with Clerk
export const runtime = "nodejs";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col items-center justify-center">
      <h1 className="text-4xl font-semibold mb-8">Notes App</h1>
      <div className="space-y-4">
        <Link 
          href="/login" 
          className="block px-6 py-3 bg-blue-600 text-white rounded hover:bg-blue-700"
        >
          Login
        </Link>
        <Link 
          href="/signup" 
          className="block px-6 py-3 bg-neutral-800 text-white rounded hover:bg-neutral-700"
        >
          Sign Up
        </Link>
      </div>
    </div>
  );
} 