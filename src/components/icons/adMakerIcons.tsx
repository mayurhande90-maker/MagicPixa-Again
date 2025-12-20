
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
        <path fill="currentColor" d="M37.24 50.284h12.255c1.076 0 1.93-.35 2.56-1.05c.63-.702.945-1.64.945-2.815V19.316c0-1.175-.315-2.113-.945-2.814c-.63-.701-1.484-1.052-2.56-1.052H38.28v30.97c0 .722-.088 1.405-.265 2.05a7.24 7.24 0 0 1-.776 1.815m5.862-24.086V22.8c0-.495.248-.743.743-.743h3.526c.496 0 .743.248.743.743v3.399c0 .51-.247.765-.743.765h-3.526c-.495 0-.743-.255-.743-.765m0 8.369v-3.399c0-.495.248-.743.743-.743h3.526c.496 0 .743.248.743.743v3.399c0 .495-.247.743-.743.743h-3.526c-.495 0-.743-.248-.743-.743m0 8.368v-3.398c0-.51.248-.765.743-.765h3.526c.496 0 .743.255.743.765v3.398c0 .496-.247.744-.743.744h-3.526c-.495 0-.743-.248-.743-.744M3 46.42c0 1.175.315 2.113.945 2.814c.63.701 1.49 1.051 2.58 1.051h25.32c1.09 0 1.95-.35 2.58-1.05c.63-.702.945-1.64.945-2.815V8.866c0-1.19-.315-2.131-.945-2.825c-.63-.694-1.49-1.041-2.58-1.041H6.524c-1.09 0-1.95.347-2.58 1.04C3.315 6.736 3 7.677 3 8.867zm8.836.446v-6.903c0-.496.149-.889.446-1.18c.297-.29.687-.435 1.168-.435h11.661c.496 0 .889.146 1.179.436c.29.29.435.683.435 1.179v6.903zm-.701-30.459v-4.12c0-.61.29-.914.87-.914h4.249c.609 0 .913.305.913.913v4.121c0 .609-.304.913-.913.913h-4.248c-.58 0-.871-.304-.871-.913m10.26 0v-4.12c0-.61.297-.914.891-.914h4.227c.609 0 .913.305.913.913v4.12c0 .609-.304.913-.913.913h-4.227c-.594 0-.892-.304-.892-.913m-10.26 8.666v-4.12c0-.61.29-.914.87-.914h4.249c.609 0 .913.305.913.914v4.12c0 .61-.304.914-.913.914h-4.248c-.58 0-.871-.305-.871-.914m10.26 0v-4.12c0-.61.297-.914.891-.914h4.227c.609 0 .913.305.913.914v4.12c0 .61-.304.914-.913.914h-4.227c-.594 0-.892-.305-.892-.914"/></svg>
);

export const EducationAdIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g fill="currentColor">
            <path d="M12.447 4.106a1 1 0 0 0-.894 0L2.77 8.497l9.22 4.39L21 8.382z"/>
            <path d="M5 17.222v-5.448l6.57 3.129a1 1 0 0 0 .877-.009L19 11.618v5.604c0 .286-.123.558-.336.748l-.003.003l-.004.003l-.01.01l-.012.01l-.018.014l-.097.078q-.12.096-.34.244a8.6 8.6 0 0 1-1.274.693C15.791 19.52 14.153 20 12 20s-3.79-.48-4.906-.975a8.6 8.6 0 0 1-1.274-.693a6 6 0 0 1-.467-.347l-.01-.009l-.004-.004l-.002-.001l.01-.012v-.001l-.011.012A1 1 0 0 1 5 17.222m-3-6.876l2 .952V17a1 1 0 1 1-2 0z"/>
        </g>
    </svg>
);

export const ServicesAdIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <path fill="none" stroke="currentColor" strokeWidth="2" d="M6 9a3 3 0 1 0 0-6a3 3 0 0 0 0 6Zm0-6V0m0 12V9M0 6h3m6 0h3M2 2l2 2m4 4l2 2m0-8L8 4M4 8l-2 2m16 2a3 3 0 1 0 0-6a3 3 0 0 0 0 6Zm0-6V3m0 12v-3m-6-3h3m6 0h3M14 5l2 2m4 4l2 2m0-8l-2 2m-4 4l-2 2m-5 8a3 3 0 1 0 0-6a3 3 0 0 0 0 6Zm0-6v-3m0 12v-3m-6-3h3m6 0h3M5 14l2 2m4 4l2 2m0-8l-2 2m-4 4l-2 2"/>
    </svg>
);

export const BlueprintStarIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <g fill="none">
            <path fill="url(#fluentColorStar480)" d="M21.803 6.086c.899-1.821 3.495-1.821 4.394 0l4.852 9.832l10.85 1.576c2.01.293 2.813 2.762 1.358 4.18l-7.85 7.653l1.853 10.806c.343 2.001-1.758 3.528-3.555 2.583L24 37.614l-9.705 5.102c-1.797.945-3.898-.582-3.555-2.583l1.854-10.806l-7.851-7.654c-1.455-1.417-.652-3.886 1.357-4.178l10.85-1.577z"/>
            <defs>
                <linearGradient id="fluentColorStar480" x1="43.995" x2="2.879" y1="43.856" y2="5.054" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FF6F47"/>
                    <stop offset="1" stopColor="#FFCD0F"/>
                </linearGradient>
            </defs>
        </g>
    </svg>
);
