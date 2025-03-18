import { auth, currentUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import NavigationDock from "@/components/dock";

export default async function AccountPage() {
  const { userId } = auth();
  const user = await currentUser();

  if (!userId || !user) {
    redirect("/sign-in");
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-[#121212] text-white">
      <div className="max-w-3xl w-full px-4 py-8 flex-grow">
        <h1 className="text-3xl font-bold text-center mb-8">Account Settings</h1>
        
        <div className="bg-[#1E1E1E] border border-neutral-800 rounded-xl p-8 mb-8 flex flex-col items-center">
          <div className="mb-6 relative w-24 h-24 overflow-hidden rounded-full bg-neutral-800 border-2 border-neutral-700">
            {user.imageUrl ? (
              <Image
                src={user.imageUrl}
                alt={user.firstName || 'User'}
                fill
                className="object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-3xl font-bold text-neutral-400">
                {user.firstName?.charAt(0) || user.username?.charAt(0) || '?'}
              </div>
            )}
          </div>
          
          <h2 className="text-2xl font-semibold mb-2">
            {user.firstName} {user.lastName}
          </h2>
          
          <p className="text-neutral-400 mb-6">{user.emailAddresses[0]?.emailAddress}</p>
          
          <div className="bg-[#252525] rounded-lg p-4 w-full max-w-md mb-6">
            <h3 className="text-lg font-medium mb-4 text-center">Choose Your Plan</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="border border-blue-500 bg-[#1A1A1A] rounded-lg p-4 flex flex-col items-center relative">
                <span className="absolute top-2 right-2 bg-blue-500 text-white px-2 py-0.5 rounded-full text-xs font-semibold">
                  Current Plan
                </span>
                <h4 className="font-bold mb-2">Free</h4>
                <ul className="text-sm text-neutral-400 space-y-1 mb-4">
                  <li>• 5 Projects</li>
                  <li>• 500 MB Storage</li>
                  <li>• Basic Features</li>
                </ul>
                <Button variant="outline" className="w-full mt-auto" disabled>
                  Current Plan
                </Button>
              </div>
              
              <div className="border border-neutral-700 hover:border-blue-500 bg-[#1A1A1A] rounded-lg p-4 flex flex-col items-center transition-colors duration-200">
                <h4 className="font-bold mb-2">Pro</h4>
                <ul className="text-sm text-neutral-400 space-y-1 mb-4">
                  <li>• Unlimited Projects</li>
                  <li>• 50 GB Storage</li>
                  <li>• Premium Features</li>
                </ul>
                <Button variant="outline" className="w-full mt-auto border-blue-500 hover:bg-blue-500 text-blue-500 hover:text-white transition-colors">
                  Upgrade
                </Button>
              </div>
            </div>
          </div>
          
          <div className="flex gap-4 mt-4">
            <Button variant="outline" asChild className="bg-[#252525] border-neutral-700 text-white hover:bg-[#333333]">
              <Link href="/sign-out">Sign Out</Link>
            </Button>
          </div>
        </div>
      </div>
      
      <div className="w-full fixed bottom-5 flex justify-center">
        <NavigationDock />
      </div>
    </div>
  );
} 