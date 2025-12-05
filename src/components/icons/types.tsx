import React from 'react';

export interface IconProps {
    className?: string;
}

export const BaseIcon: React.FC<IconProps & { path: React.ReactNode }> = ({ className, path }) => (
    <svg 
        xmlns="http://www.w3.org/2000/svg" 
        fill="none" 
        viewBox="0 0 24 24" 
        strokeWidth={1.5} 
        stroke="currentColor" 
        className={className}
        aria-hidden="true"
    >
        {path}
    </svg>
);