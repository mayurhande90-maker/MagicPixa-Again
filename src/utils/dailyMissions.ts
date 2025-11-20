
import { View } from '../types';

export interface MissionConfig {
    studioMode?: 'product' | 'model';
    selectedPrompt?: string;
    category?: string;
    brandStyle?: string;
    visualType?: string;
    // Model specific
    modelComposition?: string;
    modelType?: string;
    modelRegion?: string;
    skinTone?: string;
    bodyType?: string;
    modelFraming?: string;
}

export interface Mission {
    id: string;
    toolId: View;
    title: string;
    description: string;
    reward: number;
    config: MissionConfig;
}

const MISSIONS: Mission[] = [
    {
        id: 'neon_cyberpunk',
        toolId: 'studio',
        title: 'Neon Cyberpunk',
        description: 'Upload ANY product photo. Our AI will transform it into a futuristic neon city scene.',
        reward: 5,
        config: {
            studioMode: 'product',
            selectedPrompt: 'Cyberpunk neon city product shot with glowing blue and pink rim lights, wet street reflection'
        }
    },
    {
        id: 'minimal_marble',
        toolId: 'studio',
        title: 'Minimalist Luxury',
        description: 'Upload your product. We will place it on a clean white marble podium with soft lighting.',
        reward: 5,
        config: {
            studioMode: 'product',
            selectedPrompt: 'Minimalist luxury skincare bottle on white marble podium with soft daylight shadows'
        }
    },
    {
        id: 'nature_zen',
        toolId: 'studio',
        title: 'Zen Nature',
        description: 'Upload any item. AI will generate a lush green forest background with sunlight.',
        reward: 5,
        config: {
            studioMode: 'product',
            selectedPrompt: 'Product placed on a mossy stone in a zen garden, dappled sunlight through leaves'
        }
    },
    {
        id: 'golden_hour',
        toolId: 'studio',
        title: 'Golden Hour',
        description: 'Upload a product photo. We will re-light it with a magical warm sunset glow.',
        reward: 5,
        config: {
            studioMode: 'product',
            selectedPrompt: 'Warm golden hour sunset lighting, product on a wooden deck, lens flare'
        }
    },
    {
        id: 'floating_water',
        toolId: 'studio',
        title: 'Fresh Splash',
        description: 'Upload a product. AI will make it float in mid-air with fresh water splashes.',
        reward: 5,
        config: {
            studioMode: 'product',
            selectedPrompt: 'Product floating in mid-air with fresh crystal clear water splashes, high speed photography'
        }
    },
    {
        id: 'dark_moody',
        toolId: 'studio',
        title: 'Dark & Moody',
        description: 'Upload your product. We will create an elegant, low-key shot on black glass.',
        reward: 5,
        config: {
            studioMode: 'product',
            selectedPrompt: 'Elegant product on black reflective glass, spotlight, dark moody atmosphere'
        }
    },
    {
         id: 'lifestyle_cafe',
         toolId: 'studio',
         title: 'Coffee Shop Vibe',
         description: 'Upload a product. AI will place it on a cozy cafe table for a lifestyle look.',
         reward: 5,
         config: {
             studioMode: 'product',
             selectedPrompt: 'Lifestyle shot on a wooden cafe table next to a latte and open notebook, cozy lighting'
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
