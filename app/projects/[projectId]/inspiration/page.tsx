import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProjectById } from "@/db/queries/projects-queries";
import InspirationCanvas from "@/components/inspiration-canvas";

export default async function InspirationPage({ params }: { params: { projectId: string } }) {
  const { userId } = auth();

  if (!userId) {
    redirect("/login");
  }

  const project = await getProjectById(params.projectId);

  if (!project) {
    redirect("/");
  }

  // Check if the user is the project owner
  if (project.ownerId !== userId) {
    redirect("/");
  }

  return (
    <div className="flex flex-col h-full w-full overflow-hidden">
      <div className="p-4">
        <h1 className="text-2xl font-bold">Inspiration</h1>
      </div>
      <div className="flex-1 relative overflow-hidden">
        <InspirationCanvas 
          projectId={params.projectId} 
          initialData={project.inspirationData || ""}
        />
      </div>
    </div>
  );
} 