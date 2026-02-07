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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" className={className}>
        <path fill="#737373" d="M19 11a7.5 7.5 0 0 1-3.5 5.94L10 20l-5.5-3.06A7.5 7.5 0 0 1 1 11V3c3.38 0 6.5-1.12 9-3c2.5 1.89 5.62 3 9 3v8zm-9 1.08l2.92 2.04l-1.03-3.41l2.84-2.15l-3.56-.08L10 5.12L8.83 8.48l-3.56.08L8.1 10.7l-1.03 3.4L10 12.09z"/>
    </svg>
);

export const BadgeGoldIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32" className={className}>
        <g fill="none">
            <path fill="#D3883E" d="M10.52 7.521a3.435 3.435 0 0 0-4.213-2.369a2.28 2.28 0 0 0-.163.046c-2.493.831-2.691 4.214-.455 5.45l4.97 2.75a.866.866 0 1 0 .838-1.516l-4.97-2.75c-.982-.543-.823-1.956.16-2.288l.005-.002a3.258 3.258 0 0 1 .07-.018c.899-.25 1.834.27 2.093 1.175a.866.866 0 1 0 1.666-.478Zm11.94.478a1.702 1.702 0 0 1 2.118-1.168l.045.011l.007.002c.981.332 1.14 1.745.158 2.288l-4.97 2.75a.866.866 0 1 0 .84 1.516l4.97-2.75c2.235-1.236 2.037-4.619-.456-5.45a2.284 2.284 0 0 0-.164-.046a3.435 3.435 0 0 0-4.213 2.37a.866.866 0 1 0 1.666.477Zm-5.132 9.511v-4.22h-3.34v4.22c0 .74-.33 1.45-.9 1.92l-1.92 1.6h8.98l-1.92-1.6a2.51 2.51 0 0 1-.9-1.92Z"/>
            <path fill="#FFB02E" d="M15.658 16.54a6.97 6.97 0 0 1-6.97-6.97V2.71c0-.39.32-.71.71-.71h12.53c.39 0 .71.32.71.71v6.86c0 3.85-3.12 6.97-6.98 6.97Z"/>
            <path fill="#6D4534" d="M22.792 21.03H8.197c-.77 0-1.423.51-1.571 1.22l-1.614 7.09c-.073.33.19.64.549.64h19.878c.359 0 .622-.31.549-.64l-1.614-7.09c-.158-.71-.812-1.22-1.582-1.22Z"/>
            <path fill="#FFB02E" d="M18.383 23.96h-5.766a.625.625 0 0 0-.613.64v1.81c0 .35.268.64.613.64h5.766c.335 0 .613-.28.613-.64V24.6c0-.35-.268-.64-.613-.64Z"/>
        </g>
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
