
export interface Base64File {
  base64: string;
  mimeType: string;
}

/**
 * Validates a file before processing.
 * Checks for:
 * 1. File existence
 * 2. File type (must be image)
 * 3. File size (max 15MB to prevent crashes)
 */
const validateFile = (file: File): void => {
    if (!file) throw new Error("No file provided.");
    
    // Check File Type
    if (!file.type.startsWith('image/')) {
        throw new Error("Invalid file type. Please upload an image (JPG, PNG, WEBP).");
    }

    // Check File Size (Max 15MB)
    const MAX_SIZE_MB = 15;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload an image under ${MAX_SIZE_MB}MB.`);
    }
};

export const fileToBase64 = (file: File): Promise<Base64File> => {
  return new Promise((resolve, reject) => {
    try {
        validateFile(file);
    } catch (validationError: any) {
        alert(validationError.message); // Immediate User Feedback
        reject(validationError);
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = () => {
      const result = reader.result as string;
      // Safety check for empty result
      if (!result || result === 'data:') {
          const err = new Error("Failed to read file data.");
          alert(err.message);
          reject(err);
          return;
      }
      
      const base64 = result.split(',')[1];
      if (base64) {
        resolve({ base64, mimeType: file.type });
      } else {
        const err = new Error("Failed to extract base64 data from file.");
        alert(err.message);
        reject(err);
      }
    };
    
    reader.onerror = (error) => {
      console.error("File reading error:", error);
      alert("Error reading file. It might be corrupted.");
      reject(error);
    };
  });
};

/**
 * Resizes a base64 image string to a specific max width, returning a new base64 string.
 * Used for creating lightweight thumbnails.
 */
export const resizeImage = (dataUri: string, maxWidth: number = 300, quality: number = 0.7): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = dataUri;
        
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }

            canvas.width = width;
            canvas.height = height;
            
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                reject(new Error("Could not get canvas context"));
                return;
            }
            
            ctx.drawImage(img, 0, 0, width, height);
            
            // Export as JPEG for smaller file size, regardless of input
            const resizedDataUri = canvas.toDataURL('image/jpeg', quality);
            resolve(resizedDataUri);
        };
        
        img.onerror = (err) => {
            reject(err);
        };
    });
};

export const downloadImage = async (url: string, filename: string) => {
    try {
        const response = await fetch(url);
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
        console.warn("Download failed, opening in new tab", error);
        window.open(url, '_blank');
    }
};
