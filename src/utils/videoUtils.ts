
/**
 * Extracts a sequence of frames from a local video file.
 * @param videoFile The video file to process.
 * @param frameCount Number of frames to extract (default 6).
 * @returns Promise resolving to an array of base64 image strings (without prefix).
 */
export const extractFramesFromVideo = async (videoFile: File, frameCount: number = 6): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.muted = true;
    video.playsInline = true;
    const objectUrl = URL.createObjectURL(videoFile);
    video.src = objectUrl;

    const frames: string[] = [];
    
    video.onloadedmetadata = async () => {
      const duration = video.duration;
      if (duration === Infinity || isNaN(duration)) {
        video.currentTime = 1e101; // Hack to force duration load for some containers
        await new Promise(r => setTimeout(r, 200));
        video.currentTime = 0;
      }

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      
      // Calculate timestamps (skip the very beginning and end to avoid black frames)
      const interval = duration / (frameCount + 1);

      for (let i = 1; i <= frameCount; i++) {
        const currentTime = interval * i;
        video.currentTime = currentTime;
        
        // Wait for the seek to complete
        await new Promise<void>((r) => {
            const onSeek = () => {
                video.removeEventListener('seeked', onSeek);
                r();
            };
            video.addEventListener('seeked', onSeek);
        });

        if (ctx) {
            // Scale down to max 720p width to save bandwidth/tokens while maintaining aspect ratio
            const scale = Math.min(1, 1280 / video.videoWidth);
            canvas.width = video.videoWidth * scale;
            canvas.height = video.videoHeight * scale;
            
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Export as JPEG with 0.8 quality
            const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
            const base64 = dataUrl.split(',')[1];
            if (base64) frames.push(base64);
        }
      }
      
      URL.revokeObjectURL(objectUrl);
      resolve(frames);
    };

    video.onerror = () => {
       URL.revokeObjectURL(objectUrl);
       reject(new Error("Failed to load video file. Format might not be supported."));
    };
  });
};
