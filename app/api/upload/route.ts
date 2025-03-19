import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { createFile } from '@/db/queries/files-queries';
import { getProjectById } from '@/db/queries/projects-queries';
import { determineAutoSortFolder } from '@/actions/file-actions';


// Use Node.js runtime for this API route
export const runtime = "nodejs";

// Tell Next.js to use dynamic rendering for this route
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { userId } = auth();

    if (!userId) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Parse the request body
    const formData = await req.formData();
    const projectId = formData.get('projectId');
    const file = formData.get('file');

    if (!projectId || !file || typeof projectId !== 'string' || !(file instanceof File)) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Handle optional fields with proper type checking
    const parentIdValue = formData.get('parentId');
    const parentId = parentIdValue ? String(parentIdValue) : null;
    
    const descriptionValue = formData.get('description');
    const description = descriptionValue ? String(descriptionValue) : null;
    
    const tagsValue = formData.get('tags');
    const tags = tagsValue ? String(tagsValue) : null;

    // Check if user has access to this project
    const project = await getProjectById(projectId);
    if (!project) {
      return NextResponse.json(
        { error: 'Project not found' },
        { status: 404 }
      );
    }

    if (project.ownerId !== userId) {
      return NextResponse.json(
        { error: 'Unauthorized access to project' },
        { status: 403 }
      );
    }

    // If no specific parentId is provided, determine the best folder
    let targetParentId = parentId;
    if (!parentId) {
      targetParentId = await determineAutoSortFolder(projectId, file.name, file.type);
    }

    // Generate the wasabi path
    const wasabiPath = `${projectId}/${file.name}`;

    // Create a file record in the database
    const newFile = await createFile({
      projectId,
      name: file.name,
      type: 'file',
      parentId: targetParentId,
      mimeType: file.type,
      size: file.size.toString(),
      wasabiObjectPath: wasabiPath,
      description,
      tags
    });

    return NextResponse.json({
      success: true,
      file: newFile
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
} 