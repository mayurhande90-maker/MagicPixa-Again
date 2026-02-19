
import { getAiClient, secureGenerateVideos } from "./geminiClient";

export const generateVideo = async (prompt: string) => {
    return await secureGenerateVideos({
        model: 'veo-3.1-generate-preview', // Upgraded to High Quality model
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: '16:9'
        },
        featureName: 'Video Generation'
    });
};

export const getVideoOperationStatus = async (operation: any) => {
     const ai = getAiClient();
     return await ai.operations.getVideosOperation({ operation });
};
