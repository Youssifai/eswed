import { redirect } from "next/navigation";

export default function ProjectPage({
  params,
}: {
  params: { projectId: string };
}) {
  // Redirect to the brief page
  redirect(`/projects/${params.projectId}/brief`);
} 