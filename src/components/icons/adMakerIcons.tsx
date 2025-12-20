
import React from 'react';
import { IconProps, BaseIcon } from './types';

export const UtensilsIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 3v1.5m3.75 4.5v1.5m-3.75-1.5v1.5m-1.5-1.5h1.5m-1.5 1.5h1.5m-3-1.5v1.5m9-1.5v1.5M12.75 3v1.5m-4.5 0v1.5m0 0v1.5m0-1.5H9.75m0 0h1.5m1.5-1.5v1.5m-1.5 1.5v1.5m0 0v1.5m0 0H9.75m3-3V12m-3 0h3m-3 0v4.5m0-4.5h3m0 0v4.5m0-4.5h-3m3 4.5h3m-3 0v4.5m0-4.5h-3m3 4.5v1.5m0 0h-3m3 0v-1.5m0 1.5h3m-3 0v-1.5" />} /> // Placeholder generic path replaced below
);

// Better icons for specific industries
export const FoodIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
        <path fill="currentColor" d="M5.492 2.79a.881.881 0 0 1 1.758.092v5.867a.75.75 0 1 0 1.5 0V2.75a.75.75 0 0 1 1.5 0v5.999a.75.75 0 0 0 1.5 0V2.882a.882.882 0 0 1 1.758-.092c.076.722.492 4.785.492 6.71c0 1.338-.585 2.54-1.51 3.364c-.334.296-.49.601-.49.857v.727l.001.047c.042.599.499 7.287.499 8.505a3 3 0 1 1-6 0c0-1.218.458-7.906.499-8.505L7 14.448v-.727c0-.255-.156-.56-.49-.857A4.5 4.5 0 0 1 5 9.5c0-1.925.416-5.988.492-6.71M18.955 14l-.032.556c-.047.817-.11 1.92-.172 3.062c-.124 2.267-.251 4.734-.251 5.382a3 3 0 1 0 6 0c0-.721-.158-3.474-.294-5.855l-.004-.066C24.093 15.18 24 13.55 24 13.25V2.75a.75.75 0 0 0-.75-.75h-.5A6.75 6.75 0 0 0 16 8.75v3.5c0 .966.784 1.75 1.75 1.75z"/>
    </svg>
);

export const SaaSRequestIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M20.25 14.15v4.25c0 1.094-.787 2.036-1.872 2.18-2.087.277-4.216.42-6.378.42s-4.291-.143-6.378-.42c-1.085-.144-1.872-1.086-1.872-2.18v-4.25m16.5 0a2.18 2.18 0 00.75-1.661V8.706c0-1.081-.768-2.015-1.837-2.175a48.114 48.114 0 00-3.413-.387m4.5 8.006c-.194.165-.42.295-.673.38A23.978 23.978 0 0112 15.75c-2.648 0-5.195-.429-7.577-1.22a2.016 2.016 0 01-1.086-1.036" />} />
);

export const EcommerceAdIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <mask id="ipSShopping0">
            <g fill="none">
                <path fill="#fff" d="M39 32H13L8 12h36l-5 20Z"/>
                <path stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M3 6h3.5L8 12m0 0l5 20h26l5-20H8Z"/>
                <circle cx="13" cy="39" r="3" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"/>
                <circle cx="39" cy="39" r="3" stroke="#fff" strokeLinecap="round" strokeLinejoin="round" strokeWidth="4"/>
            </g>
        </mask>
        <path fill="currentColor" d="M0 0h48v48H0z" mask="url(#ipSShopping0)"/>
    </svg>
);

export const FMCGIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path fill="currentColor" d="M275.2 512L480 409.6l20.5-307.2l-225.3 61.4V512zM29.5 409.6L234.3 512V163.8L9 102.4l20.5 307.2zM254.8 0L9 61.4l245.8 61.4l245.8-61.4L254.8 0z"/>
    </svg>
);
