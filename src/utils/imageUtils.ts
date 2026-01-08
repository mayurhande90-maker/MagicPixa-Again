export interface Base64File {
  base64: string;
  mimeType: string;
}

/**
 * Validates a file before processing.
 */
const validateFile = (file: File): void => {
    if (!file) throw new Error("No file provided.");
    if (!file.type.startsWith('image/')) {
        throw new Error("Invalid file type. Please upload an image (JPG, PNG, WEBP).");
    }
    const MAX_SIZE_MB = 50;
    if (file.size > MAX_SIZE_MB * 1024 * 1024) {
        throw new Error(`Image is too large (${(file.size / 1024 / 1024).toFixed(1)}MB). Please upload an image under ${MAX_SIZE_MB}MB.`);
    }
};

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
 * Stamps a visual watermark into the image pixels.
 */
export const applyWatermarkToBase64 = async (
  base64: string,
  mimeType: string,
  plan?: string
): Promise<string> => {
  // TIER LOGIC VERIFICATION:
  // Watermark is applied ONLY to Free users and lower paid tiers (Starter, Creator).
  // Studio Pack and Agency Pack users get white-labeled (no watermark) images.
  const needsWatermark = !plan || ['Free', 'Starter Pack', 'Creator Pack'].includes(plan);
  if (!needsWatermark) return base64;

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = async () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        resolve(base64);
        return;
      }

      ctx.drawImage(img, 0, 0);

      const text = 'MagicPixa';
      const fontSize = Math.max(24, Math.round(canvas.width * 0.04));
      
      // Ensure font is loaded before drawing
      try {
          await document.fonts.load(`${fontSize}px "Parkinsans"`);
      } catch (e) {
          console.warn("Font loading failed, using fallback", e);
      }
      
      ctx.font = `bold italic ${fontSize}px "Parkinsans", sans-serif`;
      
      const metrics = ctx.measureText(text);
      const textWidth = metrics.width;
      const padding = fontSize * 0.8;
      
      const x = canvas.width - textWidth - padding;
      const y = canvas.height - padding;

      const gradient = ctx.createLinearGradient(x, y - fontSize, x + textWidth, y);
      gradient.addColorStop(0, '#4D7CFF');
      gradient.addColorStop(1, '#9C6CFE');

      // INCREASED PROMINENCE
      ctx.globalAlpha = 0.6; // Increased from 0.3
      
      // ADD STROKE FOR READABILITY ON DARK BACKGROUNDS
      ctx.strokeStyle = 'rgba(255,255,255,0.8)';
      ctx.lineWidth = Math.max(1, fontSize * 0.05);
      ctx.strokeText(text, x, y);
      
      // STRENGTHENED SHADOW
      ctx.shadowColor = 'rgba(0,0,0,0.5)'; // Increased from 0.1
      ctx.shadowBlur = 10;
      ctx.shadowOffsetX = 2;
      ctx.shadowOffsetY = 2;
      
      ctx.fillStyle = gradient;
      ctx.fillText(text, x, y);

      resolve(canvas.toDataURL(mimeType, 0.95).split(',')[1]);
    };
    img.onerror = (e) => reject(e);
    img.src = `data:${mimeType};base64,${base64}`;
  });
};

/**
 * Processes an AI generation result: watermarks (if applicable) and prepares data for state.
 */
export const processAIResult = async (base64: string, mimeType: string, plan?: string): Promise<{ blobUrl: string, dataUri: string, base64: string }> => {
    const finalBase64 = await applyWatermarkToBase64(base64, mimeType, plan);
    const blobUrl = await base64ToBlobUrl(finalBase64, mimeType);
    const dataUri = `data:${mimeType};base64,${finalBase64}`;
    return { blobUrl, dataUri, base64: finalBase64 };
};