
export interface Base64File {
  base64: string;
  mimeType: string;
}

/**
 * Validates a file before processing.
 * Checks for:
 * 1. File existence
 * 2. File type (must be image)
 * 3. File size (max 20MB to prevent crashes, resized later)
 */
const validateFile = (file: File): void => {
    if (!file) throw new Error("No file provided.");
    
    // Check File Type
    if (!file.type.startsWith('image/')) {
        throw new Error("Invalid file type. Please upload an image (JPG, PNG, WEBP).");
    }

    // Check File Size (Max 20MB)
    const MAX_SIZE_MB = 20;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload an image under ${MAX_SIZE_MB}MB.`);
    }
};

/**
 * Converts a File to Base64 string.
 * If the image dimension exceeds `maxDimension` (default 1920px), it is resized client-side.
 * This prevents React State bloat and browser crashes on mobile.
 */
export const fileToBase64 = (file: File, maxDimension: number = 1920): Promise<Base64File> => {
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
    
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        
        img.onload = () => {
            // Check if resize is needed
            let width = img.width;
            let height = img.height;
            let needsResize = false;

            if (width > maxDimension || height > maxDimension) {
                needsResize = true;
                if (width > height) {
                    height = Math.round((height * maxDimension) / width);
                    width = maxDimension;
                } else {
                    width = Math.round((width * maxDimension) / height);
                    height = maxDimension;
                }
            }

            if (!needsResize) {
                // Return original if small enough
                const base64 = (img.src.split(',')[1]) || "";
                resolve({ base64, mimeType: file.type });
            } else {
                // Resize via Canvas
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
                    // Export as JPEG 85% to save space
                    const resizedDataUrl = canvas.toDataURL('image/jpeg', 0.85);
                    const base64 = resizedDataUrl.split(',')[1];
                    resolve({ base64, mimeType: 'image/jpeg' });
                } else {
                    reject(new Error("Canvas context failed"));
                }
            }
        };

        img.onerror = () => reject(new Error("Failed to load image for processing."));
    };
    
    reader.onerror = (error) => {
      console.error("File reading error:", error);
      alert("Error reading file. It might be corrupted.");
      reject(error);
    };
  });
};

/**
 * Helper to convert Base64 string to Blob URL for lightweight display.
 */
export const base64ToBlobUrl = async (base64: string, mimeType: string): Promise<string> => {
    const res = await fetch(`data:${mimeType};base64,${base64}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
};

/**
 * Fetches an image from a URL (e.g., Firebase Storage) and converts it to Base64.
 * Used for Brand Kit integration.
 */
export const urlToBase64 = async (url: string): Promise<Base64File> => {
    try {
        const response = await fetch(url, { mode: 'cors' });
        if (!response.ok) throw new Error(`Failed to fetch image: ${response.statusText}`);
        
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const result = reader.result as string;
                const base64 = result.split(',')[1];
                resolve({ base64, mimeType: blob.type });
            };
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    } catch (error) {
        console.error("urlToBase64 error:", error);
        throw error;
    }
};

/**
 * Resizes a base64 image string to a specific max width, returning a new base64 string.
 * Used for creating lightweight thumbnails or optimizing API payloads.
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
