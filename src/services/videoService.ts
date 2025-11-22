
import { getAiClient } from "./geminiClient";

export const generateVideo = async (prompt: string) => {
    const ai = getAiClient();
    return await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        }
    });
};

export const getVideoOperationStatus = async (operation: any) => {
     const ai = getAiClient();
     return await ai.operations.getVideosOperation({ operation });
};
