
import { BRANDING } from '../config/branding';

export interface Base64File {
  base64: string;
  mimeType: string;
}

/**
 * Validates a file before processing.
 * Checks for:
 * 1. File existence
 * 2. File type (must be image)
 * 3. File size (max 50MB to prevent crashes, resized later)
 */
const validateFile = (file: File): void => {
    if (!file) throw new Error("No file provided.");
    
    // Check File Type
    if (!file.type.startsWith('image/')) {
        throw new Error("Invalid file type. Please upload an image (JPG, PNG, WEBP).");
    }

    // Check File Size (Max 50MB)
    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload an image under ${MAX_SIZE_MB}MB.`);
    }
};

/**
 * Converts any File to Base64 without image-specific processing.
 * Useful for documents (PDF, CSV).
 */
export const rawFileToBase64 = (file: File): Promise<Base64File> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const base64 = (reader.result as string).split(',')[1];
      resolve({ base64, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
    reader.readAsDataURL(file);
  });
};

/**
 * Converts a File to Base64 string.
 * If the image dimension exceeds `maxDimension` (default 1920px), it is resized client-side.
 */
export const fileToBase64 = (file: File, maxDimension: number = 1920): Promise<Base64File> => {
  return new Promise((resolve, reject) => {
    try {
        validateFile(file);
    } catch (validationError: any) {
        alert(validationError.message);
        reject(validationError);
        return;
    }

    const reader = new FileReader();
    reader.readAsDataURL(file);
    
    reader.onload = (e) => {
        const img = new Image();
        img.src = e.target?.result as string;
        
        img.onload = () => {
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
                const base64 = (img.src.split(',')[1]) || "";
                resolve({ base64, mimeType: file.type });
            } else {
                const canvas = document.createElement('canvas');
                canvas.width = width;
                canvas.height = height;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.drawImage(img, 0, 0, width, height);
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
    reader.onerror = (error) => reject(error);
  });
};

export const base64ToBlobUrl = async (base64: string, mimeType: string): Promise<string> => {
    const res = await fetch(`data:${mimeType};base64,${base64}`);
    const blob = await res.blob();
    return URL.createObjectURL(blob);
};

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
            const resizedDataUri = canvas.toDataURL('image/jpeg', quality);
            resolve(resizedDataUri);
        };
        img.onerror = (err) => reject(err);
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
        window.open(url, '_blank');
    }
};

export const makeTransparent = (base64Data: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Data);
                return;
            }
            ctx.drawImage(img, 0, 0);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                if (data[i] > 240 && data[i + 1] > 240 && data[i + 2] > 240) {
                    data[i + 3] = 0;
                }
            }
            ctx.putImageData(imageData, 0, 0);
            resolve(canvas.toDataURL('image/png').split(',')[1]);
        };
        img.onerror = () => resolve(base64Data);
        img.src = `data:image/png;base64,${base64Data}`;
    });
};

/**
 * Applies a watermark to a base64 image.
 * The watermark is placed at the bottom right corner with 50% opacity.
 */
export const applyWatermark = (base64Data: string, mimeType: string): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.crossOrigin = "Anonymous";
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
                resolve(base64Data);
                return;
            }

            // Draw original image
            ctx.drawImage(img, 0, 0);

            // Watermark text settings from centralized config
            const { watermark } = BRANDING;
            const fontSize = Math.max(watermark.minFontSize, Math.floor(img.width * watermark.fontSizeRatio));
            ctx.font = `bold ${fontSize}px sans-serif`;
            ctx.fillStyle = watermark.color;
            
            // Add shadow for better visibility
            ctx.shadowColor = watermark.shadow.color;
            ctx.shadowBlur = watermark.shadow.blur;
            ctx.shadowOffsetX = watermark.shadow.offsetX;
            ctx.shadowOffsetY = watermark.shadow.offsetY;

            // Padding from edges
            const padding = fontSize * watermark.paddingRatio;
            
            // Position logic
            let x = img.width - padding;
            let y = img.height - padding;
            ctx.textAlign = "right";
            ctx.textBaseline = "bottom";

            if (watermark.position === "bottom-left") {
                x = padding;
                ctx.textAlign = "left";
            } else if (watermark.position === "top-right") {
                y = padding + fontSize;
                ctx.textBaseline = "top";
            } else if (watermark.position === "top-left") {
                x = padding;
                y = padding + fontSize;
                ctx.textAlign = "left";
                ctx.textBaseline = "top";
            } else if (watermark.position === "center") {
                x = img.width / 2;
                y = img.height / 2;
                ctx.textAlign = "center";
                ctx.textBaseline = "middle";
            }
            
            // Draw text
            ctx.fillText(watermark.text, x, y);

            // Return as base64
            resolve(canvas.toDataURL(mimeType, 0.95).split(',')[1]);
        };
        img.onerror = () => resolve(base64Data);
        img.src = `data:${mimeType};base64,${base64Data}`;
    });
};
