
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
        id: 'pro_studio_white',
        title: 'Clean Studio Shot',
        description: 'Upload a product. Our AI will place it on a pristine white seamless background with soft, professional studio lighting. Perfect for online listings.',
        reward: 5,
        config: {
            toolType: 'studio',
            prompt: 'Product on a seamless pure white background, soft professional studio lighting, commercial photography style, high resolution, 85mm lens'
        }
    },
    {
        id: 'luxury_marble',
        title: 'Luxury Aesthetics',
        description: 'Create a high-end social media post. We will place your product on a polished marble surface with elegant daylight shadows.',
        reward: 5,
        config: {
            toolType: 'studio',
            prompt: 'Product placed on a white carrera marble table, hard window shadows, luxury aesthetic, bright natural daylight, high-end minimalist'
        }
    },
    {
        id: 'vintage_restore',
        title: 'Restore & Archive',
        description: 'Preserve your history. Upload an old, damaged, or black & white photo to instantly colorize and restore it.',
        reward: 5,
        config: {
            toolType: 'colour',
            colourMode: 'restore'
        }
    },
    {
        id: 'modern_office',
        title: 'Corporate Context',
        description: 'Contextualize your product. We will place it on a sleek, modern office desk with blurred tech accessories in the background.',
        reward: 5,
        config: {
            toolType: 'studio',
            prompt: 'Product on a modern wooden office desk, next to a laptop and coffee cup, bokeh office background, professional workspace environment'
        }
    },
    {
        id: 'kitchen_lifestyle',
        title: 'Kitchen Lifestyle',
        description: 'Great for food or home goods. Place your item on a clean kitchen counter with fresh ingredients or decor in the background.',
        reward: 5,
        config: {
            toolType: 'studio',
            prompt: 'Product on a granite kitchen counter, morning sunlight, blurred background of a clean modern kitchen, home lifestyle photography'
        }
    },
    {
        id: 'minimalist_podium',
        title: 'Minimalist Podium',
        description: 'Create a trendy ad creative. Your product will appear on a geometric pastel podium with soft, artistic lighting.',
        reward: 5,
        config: {
            toolType: 'studio',
            prompt: 'Product standing on a geometric pastel colored podium, soft studio lighting, minimalist art direction, 3d render style'
        }
    },
    {
        id: 'modern_living',
        title: 'Modern Living Space',
        description: 'Redesign a room photo into a clean, Modern style living space. Perfect for visualizing real estate or interior ideas.',
        reward: 5,
        config: {
            toolType: 'interior',
            interiorStyle: 'Modern',
            interiorRoomType: 'Living Room'
        }
    }
];

export const getDailyMission = (): Mission => {
    const today = new Date();
    // Calculate 12-hour blocks since the start of the year
    const start = new Date(today.getFullYear(), 0, 0);
    const diff = (today.getTime() - start.getTime()) + ((start.getTimezoneOffset() - today.getTimezoneOffset()) * 60 * 1000);
    const oneHour = 1000 * 60 * 60;
    const hoursPassed = Math.floor(diff / oneHour);
    
    // Change mission every 12 hours
    const blockIndex = Math.floor(hoursPassed / 12);
    
    return MISSIONS[blockIndex % MISSIONS.length];
};

export const isMissionCompletedToday = (lastCompletedDate?: any): boolean => {
    if (!lastCompletedDate) return false;
    
    let lastDate: Date;
    
    // Handle Firebase Timestamp object (has seconds/nanoseconds)
    if (lastCompletedDate && typeof lastCompletedDate.toDate === 'function') {
        lastDate = lastCompletedDate.toDate();
    } 
    // Handle standard Date object or timestamp number/string
    else if (lastCompletedDate instanceof Date) {
        lastDate = lastCompletedDate;
    } else {
        lastDate = new Date(lastCompletedDate);
    }
    
    // Check for invalid date
    if (isNaN(lastDate.getTime())) return false;

    const now = new Date();
    
    // STRICT CHECK: Must be same calendar day
    const isSameDate = lastDate.getDate() === now.getDate() &&
                       lastDate.getMonth() === now.getMonth() &&
                       lastDate.getFullYear() === now.getFullYear();
    
    if (!isSameDate) return false;

    // STRICT CHECK: Must be in the same 12-hour block (AM vs PM)
    // 00:00 - 11:59 is AM block
    // 12:00 - 23:59 is PM block
    const lastBlock = lastDate.getHours() < 12 ? 'AM' : 'PM';
    const currentBlock = now.getHours() < 12 ? 'AM' : 'PM';

    return lastBlock === currentBlock;
};
