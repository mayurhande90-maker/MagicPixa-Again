import { Base64File } from './imageUtils';

export const extractFramesFromVideo = async (videoFile: File, numberOfFrames: number = 6): Promise<{ url: string; base64: Base64File }[]> => {
    return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        const frames: { url: string; base64: Base64File }[] = [];
        
        if (!context) {
            reject(new Error("Could not create canvas context"));
            return;
        }

        const videoUrl = URL.createObjectURL(videoFile);
        video.src = videoUrl;
        video.crossOrigin = "anonymous";
        video.muted = true;
        video.playsInline = true;

        video.onloadedmetadata = async () => {
            const duration = video.duration;
            // Calculate safe capture points excluding the very start and very end
            const interval = duration / (numberOfFrames + 1); 
            const capturePoints = Array.from({ length: numberOfFrames }, (_, i) => (i + 1) * interval);

            // Use a reasonable max dimension to keep payload size manageable for AI
            const MAX_DIMENSION = 1280;
            let width = video.videoWidth;
            let height = video.videoHeight;

            if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
                if (width > height) {
                    height = (height / width) * MAX_DIMENSION;
                    width = MAX_DIMENSION;
                } else {
                    width = (width / height) * MAX_DIMENSION;
                    height = MAX_DIMENSION;
                }
            }

            canvas.width = width;
            canvas.height = height;

            try {
                for (const time of capturePoints) {
                    await new Promise<void>((seekResolve) => {
                        const onSeek = () => {
                            video.removeEventListener('seeked', onSeek);
                            // Draw to canvas
                            context.drawImage(video, 0, 0, canvas.width, canvas.height);
                            
                            // Export as JPEG
                            const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
                            const base64 = dataUrl.split(',')[1];
                            
                            frames.push({
                                url: dataUrl,
                                base64: {
                                    base64: base64,
                                    mimeType: 'image/jpeg'
                                }
                            });
                            seekResolve();
                        };
                        
                        // Trigger seek
                        video.currentTime = time;
                        video.addEventListener('seeked', onSeek);
                    });
                }
                URL.revokeObjectURL(videoUrl);
                resolve(frames);
            } catch (e) {
                URL.revokeObjectURL(videoUrl);
                reject(e);
            }
        };

        video.onerror = () => {
            URL.revokeObjectURL(videoUrl);
            reject(new Error("Error loading video file"));
        };
    });
};