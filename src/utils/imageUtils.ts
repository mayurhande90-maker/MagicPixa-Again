
export interface Base64File {
  base64: string;
  mimeType: string;
}

export const fileToBase64 = (file: File): Promise<Base64File> => {
  return new Promise((resolve, reject) => {
    if (!file) {
      reject(new Error("File is null or undefined."));
      return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      if (base64) {
        resolve({ base64, mimeType: file.type });
      } else {
        reject(new Error("Failed to extract base64 data from file."));
      }
    };
    
    reader.onerror = (error) => {
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

            // Calculate new dimensions based on longest side to preserve detail in portrait shots
            if (width > height) {
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }
            } else {
                if (height > maxWidth) {
                    width = Math.round((width * maxWidth) / height);
                    height = maxWidth;
                }
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
        // Fetch the image as a blob to force download
        const response = await fetch(url, {
            mode: 'cors',
            cache: 'no-cache', // Prevent caching issues
        });
        
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
        
        const blob = await response.blob();
        const blobUrl = window.URL.createObjectURL(blob);
        
        const link = document.createElement('a');
        link.href = blobUrl;
        link.download = filename;
        
        // Append to body to ensure click works in all browsers (Firefox requirement)
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Revoke the URL to free up memory
        setTimeout(() => window.URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
        console.warn("Direct download failed, opening in new tab as fallback.", error);
        // Fallback: open in new tab if CORS prevents blob access
        window.open(url, '_blank');
    }
};
