import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { getProjectById } from "@/db/queries/projects-queries";
import TipTapBriefEditor from "@/components/tiptap-brief-editor";
import DatePicker from "@/components/date-picker";
import { formatDate } from "@/lib/utils";

export default async function BriefPage({
  params,
}: {
  params: { projectId: string };
}) {
  const { userId } = auth();

  if (!userId) {
    return redirect("/login");
  }

  const project = await getProjectById(params.projectId);

  if (!project) {
    return redirect("/");
  }

  // Check if user has access to this project
  if (project.ownerId !== userId) {
    return redirect("/");
  }

  // Format deadline for display if it exists
  const formattedDeadline = project.deadline 
    ? formatDate(project.deadline)
    : null;

  return (
    <div className="h-full flex flex-col">
      <h1 className="text-4xl font-semibold mb-6">Brief</h1>
      
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium mb-2">Project Deadline:</h2>
          <DatePicker 
            projectId={project.id}
            currentDeadline={project.deadline}
          />
        </div>
        <div className="border-b border-white/20 pb-1">
          {formattedDeadline && (
            <p className="text-sm text-white/70 pb-2">{formattedDeadline}</p>
          )}
        </div>
      </div>
      
      <div className="flex-1 rounded-md overflow-hidden">
        <TipTapBriefEditor projectId={params.projectId} initialContent={project.briefContent} />
      </div>
    </div>
  );
} 