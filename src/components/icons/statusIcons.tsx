import React from 'react';
import { IconProps, BaseIcon } from './types';

export const CheckIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />} />
);

// Filled Icon (Use fill="currentColor")
export const StarIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
);

export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" />} />
);

export const FlagIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />} />
);

export const GiftIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g fill="none">
            <path fill="url(#fluentColorGift240)" d="M20 12.5v6.25a3.25 3.25 0 0 1-3.066 3.245L16.75 22h-9.5a3.25 3.25 0 0 1-3.245-3.066L4 18.75V12.5z"/>
            <path fill="url(#fluentColorGift244)" d="M19.75 7c.69 0 1.25.56 1.25 1.25v3.5a1.25 1.25 0 0 1-1 1.225H4c-.57-.116-1-.62-1-1.225v-3.5C3 7.56 3.56 7 4.25 7z"/>
            <path fill="url(#fluentColorGift241)" fillRule="evenodd" d="M11.25 22V12h1.5v10z" clipRule="evenodd"/>
            <path fill="url(#fluentColorGift242)" fillRule="evenodd" d="M11.25 13V8h1.5v5z" clipRule="evenodd"/>
            <path fill="url(#fluentColorGift243)" fillRule="evenodd" d="M9.5 8.5A3.25 3.25 0 1 1 12 3.173A3.25 3.25 0 1 1 14.5 8.5zM7.75 5.25a1.75 1.75 0 1 1 3.5 0V7H9.5a1.75 1.75 0 0 1-1.75-1.75m5 1.75h1.75a1.75 1.75 0 1 0-1.75-1.75z" clipRule="evenodd"/>
            <defs>
                <linearGradient id="fluentColorGift240" x1="10.98" x2="10.98" y1="25.733" y2="8.8" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#BB45EA"/>
                    <stop offset=".348" stopColor="#8B57ED"/>
                    <stop offset="1" stopColor="#5B2AB5"/>
                </linearGradient>
                <linearGradient id="fluentColorGift241" x1="12" x2="12" y1="6.375" y2="20.261" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FB5937"/>
                    <stop offset="1" stopColor="#FFCD0F"/>
                </linearGradient>
                <linearGradient id="fluentColorGift242" x1="12" x2="12" y1="-13.429" y2="21.571" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FB5937"/>
                    <stop offset="1" stopColor="#FFCD0F"/>
                </linearGradient>
                <linearGradient id="fluentColorGift243" x1="15.194" x2="11.905" y1="8.498" y2="-4.901" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF6F47"/>
                    <stop offset="1" stopColor="#FFCD0F"/>
                </linearGradient>
                <radialGradient id="fluentColorGift244" cx="0" cy="0" r="1" gradientTransform="matrix(23.183 0 0 9.33595 12 4.76)" gradientUnits="userSpaceOnUse">
                    <stop offset=".196" stopColor="#5B2AB5"/>
                    <stop offset=".763" stopColor="#8B57ED"/>
                    <stop offset="1" stopColor="#BB45EA"/>
                </radialGradient>
            </defs>
        </g>
    </svg>
);

// --- GAMIFICATION BADGES ---
export const BadgeNoviceIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <circle cx="12" cy="12" r="10" fillOpacity="0.2" stroke="currentColor" strokeWidth="1.5"/>
        <circle cx="12" cy="12" r="4" />
    </svg>
);

export const BadgeCopperIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
);

export const BadgeSilverIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M12.516 2.17a.75.75 0 00-1.032 0 11.209 11.209 0 01-7.877 3.08.75.75 0 00-.722.515A12.74 12.74 0 002.25 9.75c0 5.942 4.064 10.933 9.563 12.348a.749.749 0 00.374 0c5.499-1.415 9.563-6.406 9.563-12.348 0-1.352-.272-2.636-.759-3.808a.75.75 0 00-.722-.515 11.208 11.208 0 01-7.877-3.08zM12 4.691c2.202 1.326 4.826 2.074 7.592 2.074.067.583.103 1.177.103 1.778 0 4.953-3.488 9.213-8.18 10.703C6.889 17.757 3.4 13.497 3.4 8.543c0-.601.036-1.195.103-1.778 2.766 0 5.39-.748 7.592-2.074z" clipRule="evenodd" />
        <path d="M12 7a1 1 0 110 2 1 1 0 010-2zm-2 3a1 1 0 110 2 1 1 0 010-2zm4 0a1 1 0 110 2 1 1 0 010-2zm-2 3a1 1 0 110 2 1 1 0 010-2z" />
    </svg>
);

export const BadgeGoldIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className={className}>
        <path d="M19 11a7.5 7.5 0 0 1-3.5 5.94L10 20l-5.5-3.06A7.5 7.5 0 0 1 1 11V3c3.38 0 6.5-1.12 9-3c2.5 1.89 5.62 3 9 3v8zm-9 1.08l2.92 2.04l-1.03-3.41l2.84-2.15l-3.56-.08L10 5.12L8.83 8.48l-3.56.08L8.1 10.7l-1.03 3.4L10 12.09z"/>
    </svg>
);

// Custom Credit Coin Icon (Filled, Gold) - UPDATED
export const CreditCoinIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <g id="Dollar_Coin" data-name="Dollar Coin">
            <path fill="#ffbc5a" d="M24 1a23 23 0 1 0 23 23A23.026 23.026 0 0 0 24 1z"/>
            <path d="M24 5a19 19 0 1 0 19 19A19.022 19.022 0 0 0 24 5z" fill="#ef9d3a"/>
            <path fill="#ffbc5a" d="M24 39a15 15 0 1 1 15-15 15.016 15.016 0 0 1-15 15z"/>
            <path fill="#505572" d="M27 32h-6a3.003 3.003 0 0 1-3-3v-1a1 1 0 0 1 2 0v1a1.001 1.001 0 0 0 1 1h6a1.001 1.001 0 0 0 1-1v-3a1.001 1.001 0 0 0-1-1h-6a3.003 3.003 0 0 1-3-3v-3a3.003 3.003 0 0 1 3-3h6a3.003 3.003 0 0 1 3 3v1a1 1 0 0 1-2 0v-1a1.001 1.001 0 0 0-1-1h-6a1.001 1.001 0 0 0-1 1v3a1.001 1.001 0 0 0 1 1h6a3.003 3.003 0 0 1 3 3v3a3.003 3.003 0 0 1-3 3z"/>
            <path fill="#505572" d="M24 18a1 1 0 0 1-1-1v-2a1 1 0 0 1 2 0v2a1 1 0 0 1-1 1zM24 34a1 1 0 0 1-1-1v-2a1 1 0 0 1 2 0v2a1 1 0 0 1-1 1z"/>
            <path fill="#231f20" d="M24 1a23 23 0 1 0 23 23A23.026 23.026 0 0 0 24 1zm0 44a21 21 0 1 1 21-21 21.024 21.024 0 0 1-21 21z"/>
            <path fill="#231f20" d="M24 5a19 19 0 1 0 19 19A19.022 19.022 0 0 0 24 5zm0 36a17 17 0 1 1 17-17 17.019 17.019 0 0 1-17 17z"/>
            <path fill="#231f20" d="M27 16h-2v-1a1 1 0 0 0-2 0v1h-2a3.003 3.003 0 0 0-3 3v3a3.003 3.003 0 0 0 3 3h6a1.001 1.001 0 0 1 1 1v3a1.001 1.001 0 0 1-1 1h-6a1.001 1.001 0 0 1-1-1v-1a1 1 0 0 0-2 0v1a3.003 3.003 0 0 0 3 3h2v1a1 1 0 0 0 2 0v-1h2a3.003 3.003 0 0 0 3-3v-3a3.003 3.003 0 0 0-3-3h-6a1.001 1.001 0 0 1-1-1v-3a1.001 1.001 0 0 1 1 1h6a1.001 1.001 0 0 1 1 1v1a1 1 0 0 0 2 0v-1a3.003 3.003 0 0 0-3-3z"/>
        </g>
    </svg>
);