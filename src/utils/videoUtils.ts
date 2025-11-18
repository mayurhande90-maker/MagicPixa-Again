
/**
 * Extracts frames from a video file at regular intervals.
 * This is performed entirely client-side using an HTML5 Video element and Canvas.
 * 
 * @param videoFile The video file object from an input element.
 * @param numFrames The number of frames to extract (default: 5).
 * @returns A Promise resolving to an array of base64 data URLs (image/jpeg).
 */
export const extractFramesFromVideo = async (videoFile: File, numFrames: number = 5): Promise<string[]> => {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const frames: string[] = [];
    const url = URL.createObjectURL(videoFile);

    video.src = url;
    video.muted = true;
    video.playsInline = true;
    video.crossOrigin = "anonymous";

    // Wait for metadata to load to get duration and dimensions
    video.onloadedmetadata = () => {
      // Set canvas dimensions to match video, but cap max resolution to 720p for performance/token usage
      const scale = Math.min(1, 1280 / video.videoWidth);
      canvas.width = video.videoWidth * scale;
      canvas.height = video.videoHeight * scale;
      
      const duration = video.duration;
      if (duration === 0 || isNaN(duration)) {
          URL.revokeObjectURL(url);
          resolve([]); // Cannot extract from 0 duration
          return;
      }
      
      // Calculate timestamps. We avoid the very start and very end.
      const step = duration / (numFrames + 1);
      let currentFrameIdx = 0;
      
      const processFrame = () => {
        if (currentFrameIdx >= numFrames) {
            // Done extracting
            URL.revokeObjectURL(url);
            resolve(frames);
            return;
        }
        
        // Seek to next timestamp
        const timestamp = step * (currentFrameIdx + 1);
        video.currentTime = timestamp;
      };

      video.onseeked = () => {
        if (ctx) {
            ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
            // Export as JPEG with 0.8 quality to reduce size
            const base64 = canvas.toDataURL('image/jpeg', 0.8); 
            frames.push(base64);
        }
        currentFrameIdx++;
        processFrame();
      };
      
      video.onerror = (e) => {
          console.error("Video playback error", e);
          URL.revokeObjectURL(url);
          // Return whatever frames we got so far, or reject if none
          if (frames.length > 0) resolve(frames);
          else reject(new Error("Error processing video file."));
      };

      // Start the loop
      processFrame();
    };
    
    video.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error("Failed to load video file."));
    };
  });
};
