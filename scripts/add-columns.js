#!/usr/bin/env node
require('dotenv').config({ path: '.env.local' });
const postgres = require('postgres');

async function addColumns() {
  console.log('Adding description and tags columns to files table...');
  
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error('DATABASE_URL is not defined in .env.local');
    process.exit(1);
  }
  
  const sql = postgres(connectionString, { max: 1 });
  
  try {
    // Check if the columns already exist
    const columns = await sql`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'files' 
        AND (column_name = 'description' OR column_name = 'tags');
    `;
    
    const existingColumns = columns.map(col => col.column_name);
    
    // Add description column if it doesn't exist
    if (!existingColumns.includes('description')) {
      console.log('Adding description column...');
      await sql`ALTER TABLE "files" ADD COLUMN "description" text;`;
      console.log('Description column added successfully.');
    } else {
      console.log('Description column already exists.');
    }
    
    // Add tags column if it doesn't exist
    if (!existingColumns.includes('tags')) {
      console.log('Adding tags column...');
      await sql`ALTER TABLE "files" ADD COLUMN "tags" text;`;
      console.log('Tags column added successfully.');
    } else {
      console.log('Tags column already exists.');
    }
    
    console.log('All column modifications completed successfully.');
  } catch (error) {
    console.error('Error adding columns:', error);
    process.exit(1);
  } finally {
    await sql.end();
  }
}

addColumns(); 