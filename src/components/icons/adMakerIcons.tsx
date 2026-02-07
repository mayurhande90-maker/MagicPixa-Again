import React from 'react';
import { IconProps, BaseIcon } from './types';

// FIX: Added missing ReplicaIcon
export const ReplicaIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
    </svg>
);

// FIX: Added missing ReimagineIcon
export const ReimagineIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 2a10 10 0 0 1 10 10 10 10 0 0 1-10 10 10 10 0 0 1-10-10 10 10 0 0 1 10-10zm0 4a6 6 0 1 0 0 12 6 6 0 0 0 0-12z"/><circle cx="12" cy="12" r="2"/>
    </svg>
);

export const UtensilsIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 3v1.5M4.5 3v1.5m3.75 4.5v1.5m-3.75-1.5v1.5m-1.5-1.5h1.5m-1.5 1.5h1.5m-3-1.5v1.5m9-1.5v1.5M12.75 3v1.5m-4.5 0v1.5m0 0v1.5m0-1.5H9.75m0 0h1.5m1.5-1.5v1.5m-1.5 1.5v1.5m0 0v1.5m0 0H9.75m3-3V12m-3 0h3m-3 0v4.5m0-4.5h3m0 0v4.5m0-4.5h-3m3 4.5h3m-3 0v4.5m0-4.5h-3m3 4.5v1.5m0 0h-3m3 0v-1.5m0 1.5h3m-3 0v-1.5" />} />
);

// Better icons for specific industries
export const FoodIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 28 28">
        <path fill="currentColor" d="M5.492 2.79a.881.881 0 0 1 1.758.092v5.867a.75.75 0 1 0 1.5 0V2.75a.75.75 0 0 1 1.5 0v5.999a.75.75 0 0 0 1.5 0V2.882a.882.882 0 0 1 1.758-.092c.076.722.492 4.785.492 6.71c0 1.338-.585 2.54-1.51 3.364c-.334.296-.49.601-.49.857v.727l.001.047c.042.599.499 7.287.499 8.505a3 3 0 1 1-6 0c0-1.218.458-7.906.499-8.505L7 14.448v-.727c0-.255-.156-.56-.49-.857A4.5 4.5 0 0 1 5 9.5c0-1.925.416-5.988.492-6.71M18.955 14l-.032.556c-.047.817-.11 1.92-.172 3.062c-.124 2.267-.251 4.734-.251 5.382a3 3 0 1 0 6 0c0-.721-.158-3.474-.294-5.855l-.004-.066C24.093 15.18 24 13.55 24 13.25V2.75a.75.75 0 0 0-.75-.75h-.5A6.75 6.75 0 0 0 16 8.75v3.5c0 .966.784 1.75 1.75 1.75z"/>
    </svg>
);

export const SaaSRequestIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M22.5 0h-21A1.5 1.5 0 0 0 0 1.5v12.25a.25.25 0 0 0 .25.25h23.5a.25.25 0 0 0 .25-.25V1.5A1.5 1.5 0 0 0 22.5 0m1.25 15.5H.25a.25.25 0 0 0-.25.25V17a1.5 1.5 0 0 0 1.5 1.5h8.25a.25.25 0 0 1 .25.25v2.18a.24.24 0 0 1-.22.25a14.6 14.6 0 0 0-3.66.89A1 1 0 0 0 6.49 24h11a1 1 0 0 0 .38-1.93a14.6 14.6 0 0 0-3.66-.89a.24.24 0 0 1-.22-.24v-2.19a.25.25 0 0 1 .25-.25h8.26A1.5 1.5 0 0 0 24 17v-1.25a.25.25 0 0 0-.25-.25"/>
    </svg>
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

export const RealtyAdIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56">
        <path fill="currentColor" d="M37.24 50.284h12.255c1.076 0 1.93-.35 2.56-1.05c.63-.702.945-1.64.945-2.815V19.316c0-1.175-.315-2.113-.945-2.814c-.63-.701-1.484-1.052-2.56-1.052H38.28v30.97c0 .722-.088 1.405-.265 2.05a7.24 7.24 0 0 1-.776 1.815m5.862-24.086V22.8c0-.495.248-.743.743-.743h3.526c.496 0 .743.248.743.743v3.399c0 .51-.247.765-.743.765h-3.526c-.495 0-.743-.255-.743-.765m0 8.369v-3.399c0-.495.248-.743.743-.743h3.526c.496 0 .743.248.743.743v3.399c0 .495-.247.743-.743.743h-3.526c-.495 0-.743-.248-.743-.743m0 8.368v-3.398c0-.51.248-.765.743-.765h3.526c.496 0 .743.255.743.765v3.398c0 .496-.247.744-.743.744h-3.526c-.495 0-.743-.248-.743-.744M3 46.42c0 1.175.315 2.113.945 2.814c.63.701 1.49 1.051 2.58 1.051h25.32c1.09 0 1.95-.35 2.58-1.05c.63-.702.945-1.64.945-2.815V8.866c0-1.19-.315-2.131-.945-2.825c-.63-.694-1.49-1.041-2.58-1.041H6.524c-1.09 0-1.95.347-2.58 1.04C3.315 6.736 3 7.677 3 8.867zm8.836.446v-6.903c0-.496.149-.889.446-1.18c.297-.29.687-.435 1.168-.435h11.661c.496 0 .889.146 1.179.436c.29.29.435.683.435 1.179v6.903zm-.701-30.459v-4.12c0-.61.29-.914.87-.914h4.249c.609 0 .913.305.913.913v4.121c0 .609-.304.913-.913.913h-4.248c-.58 0-.871-.304-.871-.913m10.26 0v-4.12c0-.61.297-.914.891-.914h4.227c.609 0 .913.305.913.913v4.121c0 .609-.304.913-.913.913h-4.227c-.594 0-.892-.304-.892-.913m-10.26 8.666v-4.12c0-.61.29-.914.87-.914h4.249c.609 0 .913.305.913.914v4.12c0 .609-.304.913-.913.913h-4.248c-.58 0-.871-.304-.871-.913m10.26 0v-4.12c0-.61.297-.914.891-.914h4.227c.609 0 .913.305.913.914v4.12c0 .609-.304.913-.913.913h-4.227c-.594 0-.892-.304-.892-.913m-10.26 8.666v-4.12c0-.61.29-.914.87-.914h4.249c.609 0 .913.305.913.914v4.12c0 .61-.304.914-.913.914h-4.248c-.58 0-.871-.305-.871-.914m10.26 0v-4.12c0-.61.297-.914.891-.914h4.227c.609 0 .913.305.913.914v4.12c0 .61-.304.914-.913.914h-4.227c-.594 0-.892-.305-.892-.914"/>
    </svg>
);

// FIX: Added missing EducationAdIcon
export const EducationAdIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 3L1 9l11 6l9-4.91V17h2V9M5 13.18v4L12 21l7-3.82v-4L12 17l-7-3.82Z"/>
    </svg>
);

// FIX: Added missing ServicesAdIcon
export const ServicesAdIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="currentColor" d="M12 5.5a2.5 2.5 0 0 1 0-5a2.5 2.5 0 0 1 0 5ZM12 11.5a3.5 3.5 0 1 1 0-7a3.5 3.5 0 0 1 0 7ZM12 24c-3.86 0-7-3.14-7-7c0-2.31 1.13-4.35 2.87-5.61l.13-.1V10h8v1.29l.13.1c1.74 1.26 2.87 3.3 2.87 5.61c0 3.86-3.14 7-7 7Z"/>
    </svg>
);
