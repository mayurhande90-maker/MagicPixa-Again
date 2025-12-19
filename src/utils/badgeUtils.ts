import React from 'react';
import { BadgeNoviceIcon, BadgeCopperIcon, BadgeSilverIcon, BadgeGoldIcon } from '../components/icons';

export type BadgeRank = 'Rising Creator' | 'Professional Creator' | 'Silver Creator' | 'Gold Creator';

export interface BadgeInfo {
    rank: BadgeRank;
    color: string;
    bgColor: string;
    borderColor: string;
    iconColor: string;
    Icon: React.FC<{ className?: string }>;
    nextMilestone: number;
}

export const getBadgeInfo = (generations: number = 0): BadgeInfo => {
    if (generations >= 100) {
        return { 
            rank: 'Gold Creator', 
            color: 'text-yellow-700', 
            bgColor: 'bg-yellow-50', 
            borderColor: 'border-yellow-200',
            iconColor: 'text-yellow-500',
            Icon: BadgeGoldIcon,
            nextMilestone: 0 // Max level
        };
    }
    if (generations >= 30) {
        return { 
            rank: 'Silver Creator', 
            color: 'text-slate-600', 
            bgColor: 'bg-slate-50', 
            borderColor: 'border-slate-200',
            iconColor: 'text-slate-400',
            Icon: BadgeSilverIcon,
            nextMilestone: 100
        };
    }
    if (generations >= 10) {
        return { 
            rank: 'Professional Creator', 
            color: 'text-orange-700', 
            bgColor: 'bg-orange-50', 
            borderColor: 'border-orange-200',
            iconColor: 'text-orange-500',
            Icon: BadgeCopperIcon,
            nextMilestone: 30
        };
    }
    return { 
        rank: 'Rising Creator', 
        color: 'text-gray-500', 
        bgColor: 'bg-gray-50', 
        borderColor: 'border-gray-200',
        iconColor: 'text-gray-400',
        Icon: BadgeNoviceIcon,
        nextMilestone: 10
    };
};