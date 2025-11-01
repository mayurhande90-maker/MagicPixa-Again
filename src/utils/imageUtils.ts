
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
// Minor change for commit.