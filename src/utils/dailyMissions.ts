
import { View } from '../types';

export interface MissionConfig {
    // Unified config to support multiple tools
    toolType: 'studio' | 'interior' | 'colour';
    
    // Studio Params
    prompt?: string;
    
    // Interior Params
    interiorStyle?: string;
    interiorRoomType?: string;
    
    // Colour Params
    colourMode?: 'restore' | 'colourize_only';
}

export interface Mission {
    id: string;
    title: string;
    description: string;
    reward: number;
    config: MissionConfig;
}

const MISSIONS: Mission[] = [
    {
        id: 'zen_garden',
        title: 'Zen Garden Product',
        description: 'Upload ANY product photo. Our AI will place it on a mossy stone in a peaceful zen garden with dappled sunlight.',
        reward: 5,
        config: {
            toolType: 'studio',
            prompt: 'Product placed on a mossy stone in a zen garden, dappled sunlight through leaves, peaceful nature atmosphere'
        }
    },
    {
        id: 'japandi_living',
        title: 'Japandi Living Room',
        description: 'Upload a photo of a room. AI will redesign it into a stylish "Japandi" (Japanese-Scandi) minimalist space.',
        reward: 5,
        config: {
            toolType: 'interior',
            interiorStyle: 'Japanese',
            interiorRoomType: 'Living Room'
        }
    },
    {
        id: 'vintage_restore',
        title: 'Restore History',
        description: 'Upload an old black & white photo. AI will colourize it and remove scratches to bring it back to life.',
        reward: 5,
        config: {
            toolType: 'colour',
            colourMode: 'restore'
        }
    },
    {
        id: 'neon_cyberpunk',
        title: 'Neon Cyberpunk',
        description: 'Upload a product. We will transform the background into a futuristic neon city street at night.',
        reward: 5,
        config: {
            toolType: 'studio',
            prompt: 'Cyberpunk neon city product shot with glowing blue and pink rim lights, wet street reflection, futuristic vibe'
        }
    },
    {
        id: 'industrial_office',
        title: 'Industrial Office',
        description: 'Upload a room photo. Transform it into a raw, trendy Industrial office with exposed brick and metal accents.',
        reward: 5,
        config: {
            toolType: 'interior',
            interiorStyle: 'Industrial',
            interiorRoomType: 'Office'
        }
    },
    {
        id: 'golden_hour',
        title: 'Golden Hour Glow',
        description: 'Upload a product. We will re-light it with a magical warm sunset glow on a wooden deck.',
        reward: 5,
        config: {
            toolType: 'studio',
            prompt: 'Warm golden hour sunset lighting, product on a wooden deck, lens flare, summer vibe'
        }
    },
    {
        id: 'luxury_podium',
        title: 'Dark Luxury',
        description: 'Upload a product. Place it on a sleek black marble podium with dramatic spotlighting.',
        reward: 5,
        config: {
            toolType: 'studio',
            prompt: 'Elegant product on black reflective marble podium, dramatic spotlight, dark luxury atmosphere'
        }
    }
];

export const getDailyMission = (): Mission => {
    const today = new Date();
    // Calculate day of the year (0-365)
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = (today.getTime() - start.getTime()) + ((start.getTimezoneOffset() - today.getTimezoneOffset()) * 60 * 1000);
    const oneDay = 1000 * 60 * 60 * 24;
    const dayOfYear = Math.floor(diff / oneDay);
    
    // Use modulo to cycle through missions
    return MISSIONS[dayOfYear % MISSIONS.length];
};

export const isMissionCompletedToday = (lastCompletedDate?: any): boolean => {
    if (!lastCompletedDate) return false;
    
    const lastDate = lastCompletedDate.toDate ? lastCompletedDate.toDate() : new Date(lastCompletedDate);
    const today = new Date();
    
    return (
        lastDate.getDate() === today.getDate() &&
        lastDate.getMonth() === today.getMonth() &&
        lastDate.getFullYear() === today.getFullYear()
    );
};
