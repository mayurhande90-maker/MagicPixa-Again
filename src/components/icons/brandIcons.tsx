
import React from 'react';
import { IconProps } from './types';

// Renamed from ProductStudioIcon to BrandKitIcon
export const BrandKitIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#424242" d="M27 7h-6c-1.7 0-3 1.3-3 3v3h2v-3c0-.6.4-1 1-1h6c.6 0 1 .4 1 1v3h2v-3c0-1.7-1.3-3-3-3z"/>
        <path fill="#E65100" d="M40 43H8c-2.2 0-4-1.8-4-4V15c0-2.2 1.8-4 4-4h32c2.2 0 4 1.8 4 4v24c0 2.2-1.8 4-4 4z"/>
        <path fill="#FF6E40" d="M40 28H8c-2.2 0-4-1.8-4-4v-9c0-2.2 1.8-4 4-4h32c2.2 0 4 1.8 4 4v9c0 2.2-1.8 4-4 4z"/>
        <path fill="#FFF3E0" d="M26 26h-4c-.6 0-1-.4-1-1v-2c0-.6.4-1 1-1h4c.6 0 1 .4 1 1v2c0 .6-.4 1-1 1z"/>
    </svg>
);

export const ProfileSettingsIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <path fill="#5a3be2" d="M16 1.466C7.973 1.466 1.466 7.973 1.466 16c0 8.027 6.507 14.534 14.534 14.534c8.027 0 14.534-6.507 14.534-14.534c0-8.027-6.507-14.534-14.534-14.534zm8.386 13.502a5.36 5.36 0 0 1-5.685 1.586l-7.187 8.266a2.113 2.113 0 0 1-3.187-2.775l7.198-8.274a5.348 5.348 0 0 1 6.137-7.497l-2.755 3.212l.9 2.62l2.723.53l2.76-3.22a5.339 5.339 0 0 1-.902 5.553z"/>
    </svg>
);
