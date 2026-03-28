import React from 'react';

export interface IconProps {
    className?: string;
    strokeWidth?: number;
}

export const BaseIcon: React.FC<IconProps & { path: React.ReactNode }> = ({ className, path, strokeWidth = 1.5 }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={strokeWidth} 
        stroke="currentColor" 
        className={className}
        aria-hidden="true"
    >
        {path}
    </svg>
);