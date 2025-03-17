/**
 * Handles file uploads by chunking large files into smaller pieces that can be
 * sent without hitting the server action body size limit.
 */
export async function uploadLargeFileInChunks(
  file: File,
  uploadAction: (chunk: ArrayBuffer, chunkIndex: number, totalChunks: number) => Promise<any>,
  onProgress?: (progress: number) => void,
  chunkSize: number = 1024 * 1024 // 1MB chunks by default
): Promise<void> {
  const totalChunks = Math.ceil(file.size / chunkSize);
  
  for (let chunkIndex = 0; chunkIndex < totalChunks; chunkIndex++) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    
    // Slice the file to create a chunk
    const chunk = file.slice(start, end);
    const arrayBuffer = await chunk.arrayBuffer();
    
    // Upload the chunk
    await uploadAction(arrayBuffer, chunkIndex, totalChunks);
    
    // Update progress if callback provided
    if (onProgress) {
      const progress = Math.round(((chunkIndex + 1) / totalChunks) * 100);
      onProgress(progress);
    }
  }
}

/**
 * Converts a small file to base64 format for easy transmission
 */
export async function fileToBase64(file: File): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = (error) => {
      console.error('Error converting file to base64:', error);
      reject(error);
    };
  });
}

/**
 * Maximum file size for base64 encoding (in bytes)
 * Larger files should be uploaded via chunking or direct API routes
 */
export const MAX_BASE64_SIZE = 5 * 1024 * 1024; // 5MB 