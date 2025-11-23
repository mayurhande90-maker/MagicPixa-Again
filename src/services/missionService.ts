
import { editImageWithPrompt } from './photoStudioService';
import { generateInteriorDesign } from './interiorService';
import { colourizeImage } from './imageToolsService';
import { MissionConfig } from '../utils/dailyMissions';

export const executeDailyMission = async (
    base64: string, 
    mimeType: string, 
    config: MissionConfig
): Promise<string> => {
    try {
        // Dispatch to the correct service based on mission type
        if (config.toolType === 'studio' && config.prompt) {
            return await editImageWithPrompt(base64, mimeType, config.prompt);
        } 
        
        if (config.toolType === 'interior' && config.interiorStyle && config.interiorRoomType) {
            return await generateInteriorDesign(base64, mimeType, config.interiorStyle, 'home', config.interiorRoomType);
        } 
        
        if (config.toolType === 'colour' && config.colourMode) {
            return await colourizeImage(base64, mimeType, config.colourMode);
        }

        throw new Error("Invalid mission configuration or missing parameters.");
    } catch (error) {
        console.error("Error executing daily mission:", error);
        throw error;
    }
};
