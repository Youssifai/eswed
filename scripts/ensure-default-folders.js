#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');
const { createId } = require('@paralleldrive/cuid2');

async function ensureDefaultFolders() {
  console.log('Ensuring all projects have default folders...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }
  
  const sql = postgres(connectionString, { max: 1 });
  
  try {
    // Get all projects
    const projects = await sql`SELECT id FROM projects`;
    console.log(`Found ${projects.length} projects to check`);
    
    // Process each project
    for (const project of projects) {
      console.log(`Checking folders for project ${project.id}`);
      
      // Get existing folders
      const existingFolders = await sql`
        SELECT id, name, is_system_folder  
        FROM files 
        WHERE project_id = ${project.id} 
        AND type = 'folder'
      `;
      
      console.log(`Project ${project.id} has ${existingFolders.length} folders`);
      
      // Check for the required system folders
      const requiredFolders = ["Documents", "Assets", "Design", "Print"];
      const existingFolderNames = existingFolders.map(f => f.name.toLowerCase());
      
      // Create any missing folders
      for (const folderName of requiredFolders) {
        if (!existingFolderNames.includes(folderName.toLowerCase())) {
          console.log(`Creating missing folder '${folderName}' for project ${project.id}`);
          
          // Create the folder
          await sql`
            INSERT INTO files (
              id, project_id, name, type, parent_id, is_system_folder, created_at, updated_at
            ) VALUES (
              ${createId()}, ${project.id}, ${folderName}, 'folder', NULL, TRUE, NOW(), NOW()
            )
          `;
        } else {
          console.log(`Project ${project.id} already has '${folderName}' folder`);
          
          // Ensure is_system_folder is set to true
          const folder = existingFolders.find(f => f.name.toLowerCase() === folderName.toLowerCase());
          if (folder && !folder.is_system_folder) {
            console.log(`Setting is_system_folder to TRUE for folder ${folder.id}`);
            await sql`
              UPDATE files SET is_system_folder = TRUE 
              WHERE id = ${folder.id}
            `;
          }
        }
      }
    }
    
    console.log('All projects now have the required default folders');
  } catch (error) {
    console.error('Error ensuring default folders:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

ensureDefaultFolders(); 