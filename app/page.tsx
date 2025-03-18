import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProfileByUserId } from "@/db/queries/profiles-queries";
import { getProjectsByOwnerId } from "@/db/queries/projects-queries";
import { SelectProject } from "@/db/schema/projects-schema";
import ProjectGallery from "@/components/project-gallery";
import NavigationDock from "@/components/dock";

export default async function HomePage() {
  const { userId } = auth();

  if (!userId) {
    return redirect("/login");
  }

  const profile = await getProfileByUserId(userId);

  if (!profile) {
    return redirect("/signup");
  }

  // Get projects for the user, or use empty array if there's an error
  let projects: SelectProject[] = [];
  try {
    projects = await getProjectsByOwnerId(userId);
  } catch (error) {
    console.error("Failed to fetch projects:", error);
  }

  return (
    <div className="min-h-screen bg-[#121212] text-white flex flex-col">
      {/* Main content */}
      <main className="flex-1 px-[140px] pt-[90px] pb-20">
        <div className="flex items-center mb-12">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="mr-4">
            <path d="M9 21V13.6C9 13.0399 9 12.7599 9.10899 12.546C9.20487 12.3578 9.35785 12.2049 9.54601 12.109C9.75992 12 10.0399 12 10.6 12H13.4C13.9601 12 14.2401 12 14.454 12.109C14.6422 12.2049 14.7951 12.3578 14.891 12.546C15 12.7599 15 13.0399 15 13.6V21M11.0177 2.764L4.23539 8.03912C3.78202 8.39175 3.55534 8.56806 3.39203 8.78886C3.24737 8.98444 3.1396 9.20478 3.07403 9.43905C3 9.70352 3 9.9907 3 10.5651V17.8C3 18.9201 3 19.4801 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4801 21 18.9201 21 17.8V10.5651C21 9.9907 21 9.70352 20.926 9.43905C20.8604 9.20478 20.7526 8.98444 20.608 8.78886C20.4447 8.56806 20.218 8.39175 19.7646 8.03913L12.9823 2.764C12.631 2.49075 12.4553 2.35412 12.2613 2.3016C12.0902 2.25526 11.9098 2.25526 11.7387 2.3016C11.5447 2.35412 11.369 2.49075 11.0177 2.764Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <h1 className="text-4xl font-semibold">Home OS</h1>
        </div>

        <div className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold">Your Projects</h2>
        </div>

        <ProjectGallery projects={projects} />
        
        {projects.length === 0 && (
          <div className="flex-1 flex flex-col items-center justify-center mt-10">
            <p className="text-neutral-300 mb-4">You don't have any projects yet.</p>
            <p className="text-neutral-400 text-sm">Create a project to get started.</p>
          </div>
        )}
      </main>

      {/* Dock navigation */}
      <div className="fixed bottom-8 left-0 right-0 flex justify-center">
        <NavigationDock />
      </div>
    </div>
  );
} 