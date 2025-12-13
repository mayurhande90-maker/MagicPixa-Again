
import React from 'react';
import { IconProps, BaseIcon } from './types';

// Custom Photo Studio Icon (Camera with Layers)
export const PhotoStudioIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g fill="none">
            <path fill="url(#fluentColorCamera240)" d="M2 8.25A3.25 3.25 0 0 1 5.25 5H7l1.332-1.998A2.25 2.25 0 0 1 10.204 2h3.592a2.25 2.25 0 0 1 1.872 1.002L17 5h1.75A3.25 3.25 0 0 1 22 8.25v9.5A3.25 3.25 0 0 1 18.75 21H5.25A3.25 3.25 0 0 1 2 17.75z"/>
            <path fill="url(#fluentColorCamera241)" fillOpacity=".5" d="M2 8.25A3.25 3.25 0 0 1 5.25 5H7l1.332-1.998A2.25 2.25 0 0 1 10.204 2h3.592a2.25 2.25 0 0 1 1.872 1.002L17 5h1.75A3.25 3.25 0 0 1 22 8.25v9.5A3.25 3.25 0 0 1 18.75 21H5.25A3.25 3.25 0 0 1 2 17.75z"/>
            <path fill="url(#fluentColorCamera243)" fillRule="evenodd" d="M12 17a4.5 4.5 0 1 0 0-9a4.5 4.5 0 0 0 0 9" clipRule="evenodd"/>
            <path fill="url(#fluentColorCamera242)" d="M15 12.5a3 3 0 1 1-6 0a3 3 0 0 1 6 0"/>
            <path fill="url(#fluentColorCamera244)" d="M18.5 10a1.5 1.5 0 1 0 0-3a1.5 1.5 0 0 0 0 3"/>
            <defs>
                <radialGradient id="fluentColorCamera240" cx="0" cy="0" r="1" gradientTransform="rotate(41.108 -4.919 .133)scale(29.8616 62.1235)" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F08AF4"/>
                    <stop offset=".535" stopColor="#9C6CFE"/>
                    <stop offset="1" stopColor="#4E44DB"/>
                </radialGradient>
                <radialGradient id="fluentColorCamera241" cx="0" cy="0" r="1" gradientTransform="matrix(.5 6.9091 -7.19332 .52057 14.5 14.09)" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#312A9A"/>
                    <stop offset="1" stopColor="#312A9A" stopOpacity="0"/>
                </radialGradient>
                <radialGradient id="fluentColorCamera242" cx="0" cy="0" r="1" gradientTransform="matrix(5.5 6.5 -6.5 5.5 8 8)" gradientUnits="userSpaceOnUse">
                    <stop offset=".243" stopColor="#3BD5FF"/>
                    <stop offset="1" stopColor="#2052CB"/>
                </radialGradient>
                <linearGradient id="fluentColorCamera243" x1="9.193" x2="13.693" y1="8" y2="18.688" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#fff"/>
                    <stop offset="1" stopColor="#DECBFF"/>
                </linearGradient>
                <linearGradient id="fluentColorCamera244" x1="17" x2="20" y1="7.75" y2="10" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#F08AF4"/>
                    <stop offset="1" stopColor="#F462AB"/>
                </linearGradient>
            </defs>
        </g>
    </svg>
);

// Pixa Product Icon (Alias to PhotoStudioIcon for consistency)
export const PixaProductIcon = PhotoStudioIcon;

// Custom Pixa Ecommerce Kit Icon
export const PixaEcommerceIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g fill="none">
            <path fill="#66e1ff" d="M1 2a1 1 0 0 1 1-1h20a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z"/>
            <path fill="#c2f3ff" d="M2 1a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h1.187l18-18z"/>
            <path fill="#c77f67" d="M18 6.668v6.16a1.02 1.02 0 0 1-.62.93l-5 2.08a1 1 0 0 1-.38.07V8.5l5.81-2.42c.123.171.19.377.19.588"/>
            <path fill="#ffbc44" d="M17.813 6.078L12 8.5v7.41a1.1 1.1 0 0 1-.39-.07l-5-2.12A.99.99 0 0 1 6 12.8V6.668a.99.99 0 0 1 .61-.92l5-2.09c.246-.1.522-.1.77 0l5 2.09c.17.069.32.183.431.33"/>
            <path stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="m12.002 8.498l-5.81-2.42m2.803-1.366L15.19 7.17M12 19v4m-5.5 0h11M1 2a1 1 0 0 1 1-1h20a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z"/>
            <path stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M18 6.668v6.16a1.02 1.02 0 0 1-.62.93l-5 2.08a1 1 0 0 1-.38.07V8.5l5.81-2.42c.123.171.19.377.19.588"/>
            <path stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M17.813 6.078L12 8.5v7.41a1.1 1.1 0 0 1-.39-.07l-5-2.12A.99.99 0 0 1 6 12.8V6.668a.99.99 0 0 1 .61-.92l5-2.09c.246-.1.522-.1.77 0l5 2.09c.17.069.32.183.431.33"/>
        </g>
    </svg>
);

// Custom Apparel Icon
export const ApparelIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M5.833 5a5 5 0 0 1 3-1h6.334a5 5 0 0 1 3 1L21.1 7.2a1 1 0 0 1 .268 1.296l-2 3.5a1 1 0 0 1-1.382.361l-.986-.59V19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-7.234l-.985.591a1 1 0 0 1-1.383-.36l-2-3.5A1.9 1.9 0 0 1 2.9 7.2L5.833 5ZM14 5h-4c0 .425.223.933.645 1.355.422.423.93.645 1.355.645.425 0 .933-.222 1.355-.645.423-.422.645-.93.645-1.355Z" clipRule="evenodd"/>
    </svg>
);

// Custom Pixa TryOn Icon
export const PixaTryOnIcon: React.FC<IconProps> = ({ className }) => (
<svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
    <path fill="#fcc21b" d="M123.58 37.18c-1.11-3.67.13-7.56-.56-11.29c-.57-3.14-1.98-6.09-3.66-8.78c-3.04-4.87-9.2-7.07-14.64-7.75c-3.68-.46-7.57.03-10.93-1.87c-2.45-1.38-5.05-2.84-7.73-3.88C79.33 1.02 71.61.67 64.46.46L64 .45l-.46.01c-7.14.21-14.86.56-21.59 3.15c-2.68 1.03-5.28 2.49-7.73 3.88c-3.36 1.9-7.25 1.41-10.94 1.87c-5.43.67-11.59 2.87-14.63 7.75c-1.68 2.69-3.08 5.64-3.66 8.78c-.69 3.73.55 7.62-.56 11.29c-.25.83-1.3 2.06-.89 2.99c.42.97 2.73 1.68 3.6 2.18c2.91 1.71 6.11 2.92 9.35 3.88c2.17.65 4.43 1.99 6.78 1.66c1.01-.14 1.79-.55 1.94-1.59c.45-3.18 1.57-6.42 2.61-9.44c.28-.82.7-2.28 1.88-2.18c.8.07 1.25 1.79 1.2 2.42c-.19 2.39-.75 4.76-.84 7.16c-.1 2.52.62 4.57 1.42 6.9c.9 2.59 2 5.12 2.78 7.75c.83 2.87.33 5.9-.51 8.71c-2.02 6.7-4.76 12.83-7.44 19.27c-1.01 2.41-1.89 4.87-2.88 7.29a62.87 62.87 0 0 1-1.44 3.25c-1.39 2.92-4.37 5.11-3.99 8.75c.6 5.72 5.96 9.04 10.41 11.79c10.57 6.54 23.17 9.64 35.6 9.58c12.44.06 25.04-3.03 35.62-9.58c4.44-2.75 9.81-6.07 10.41-11.79c.38-3.63-2.61-5.83-3.99-8.75c-.5-1.06-.99-2.16-1.43-3.25c-.98-2.42-1.87-4.88-2.88-7.29c-2.69-6.44-5.43-12.57-7.44-19.27c-.84-2.81-1.35-5.84-.51-8.71c.77-2.64 1.88-5.16 2.77-7.75c.81-2.33 1.52-4.38 1.43-6.9c-.08-2.41-.65-4.77-.84-7.16c-.04-.62.4-2.35 1.19-2.42c1.19-.09 1.61 1.36 1.89 2.18c1.04 3.03 2.16 6.27 2.61 9.44c.15 1.04.93 1.45 1.94 1.59c2.36.33 4.6-1.01 6.78-1.66c3.24-.96 6.43-2.17 9.35-3.88c.86-.5 3.17-1.21 3.6-2.18c.37-.93-.67-2.16-.93-2.99z"/>
    <path fill="#fff" d="M53.84 26.77c-2.6 1.15-5.59.96-8.22-.01l-.17-.06c-1.49-.57-3.07-1.55-4.29-2.59c-3.9-3.39-4.29-9.3-2.75-13.92c.4-1.21 1.78-2.84 3.22-2.54c.21.05.43.13.65.24c1.44.75 2.52 1.96 3.83 2.89c2.28 1.62 4.64 2.33 7.21 3.33c1.8.69 3.65 1.26 5.52 1.66c.5.1 1.06.27 1.52.44c.72.27.76 1.07.79 1.73c.09 1.69-1.67 3.83-2.66 5.07c-1.25 1.55-2.78 2.94-4.65 3.76zm32.3-2.67c-1.21 1.05-2.79 2.02-4.29 2.59l-.16.06c-2.62.97-5.62 1.16-8.22.01c-1.87-.82-3.4-2.2-4.66-3.78c-.99-1.23-2.75-3.38-2.66-5.07c.04-.66.08-1.46.8-1.73c.47-.18 1.03-.34 1.52-.44c1.88-.4 3.73-.97 5.53-1.66c2.57-.99 4.93-1.71 7.21-3.33c1.31-.93 2.4-2.15 3.83-2.89c.22-.11.44-.2.65-.24c1.44-.3 2.81 1.34 3.21 2.54c1.54 4.64 1.15 10.55-2.76 13.94z"/>
    <circle cx="63.69" cy="103.05" r="4.68" fill="#f79329"/>
    <circle cx="63.69" cy="79" r="4.68" fill="#f79329"/>
    <circle cx="63.69" cy="54.96" r="4.68" fill="#f79329"/>
    <circle cx="63.69" cy="30.91" r="4.68" fill="#f79329"/>
</svg>
);

// New Pixa AdMaker Icon (Renamed from Magic Ads / Brand Stylist)
export const MagicAdsIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path fill="#F2A74E" d="m184.433 484.431l-12.195 8.072c-11.469 7.592-26.92 4.449-34.512-7.02l-48.892-73.86c-7.592-11.469-4.449-26.92 7.02-34.512l12.195-8.072c11.469-7.592 26.92-4.449 34.512 7.02l48.892 73.86c7.591 11.469 4.449 26.921-7.02 34.512z"/>
        <path fill="#FFB636" d="M353.886 165.453C309.487 98.379 248.064 47.88 224.052 63.775c-2.905 1.923-5.123 4.737-6.711 8.304c-.117.19-.231.383-.336.591c-16.442 32.736-165.25 189.545-199.864 223.009A27.674 27.674 0 0 0 9.3 309.792c-3.141 14.703-6.169 45.422 13.231 74.728c19.539 29.518 49.978 38.597 65.006 41.348a27.81 27.81 0 0 0 15.856-1.729c43.952-18.591 246.136-93.953 282.547-96.289c1.1-.071 2.156-.212 3.175-.406c2.846-.368 5.411-1.271 7.65-2.754a16.765 16.765 0 0 0 3.226-2.806a19.592 19.592 0 0 0 4.593-7.18a9.788 9.788 0 0 1-.947 1.334c11.177-26.161-10.9-91.893-49.751-150.585z"/>
        <path fill="#CC883E" d="M341.246 173.821c38.761 58.556 59.99 124.085 40.994 136.66c-18.997 12.575-71.026-32.566-109.787-91.122s-59.99-124.085-40.994-136.66s71.025 32.565 109.787 91.122z"/>
        <path fill="#FFD469" d="M66.676 328.848a18.42 18.42 0 0 1-13.264-5.614c-7.101-7.324-6.92-19.019.405-26.119l43.134-41.818c7.325-7.101 19.019-6.92 26.119.405c7.101 7.324 6.92 19.018-.405 26.119l-43.134 41.818a18.414 18.414 0 0 1-12.855 5.209z"/>
        <path fill="#59CAFC" d="M393.301 130.912L467.319 57.6c3.143-3.113 8.341-2.601 10.816 1.064l17.075 25.279c2.352 3.482 1.16 8.235-2.557 10.195L401.56 142.17a7.06 7.06 0 0 1-8.259-11.258zm12.241 62.958a5.617 5.617 0 0 0 6.025 4.466l81.588-7.616a5.616 5.616 0 0 0 4.98-6.719l-4.868-23.78c-.706-3.448-4.372-5.405-7.63-4.072l-76.72 31.397a5.615 5.615 0 0 0-3.375 6.324zm-60.917-86.577a5.617 5.617 0 0 0 7.418-1.102l52.306-63.077a5.616 5.616 0 0 0-1.229-8.272l-20.257-13.373c-2.937-1.939-6.914-.73-8.274 2.516l-32.048 76.45a5.613 5.613 0 0 0 2.084 6.858z"/>
    </svg>
);

// Alias for backward compatibility
export const BrandStylistIcon = MagicAdsIcon;

// Custom Pixa Together Icon
export const PixaTogetherIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128">
        <path fill="#EF5592" d="M78.41 3.74C67.87 3.74 64 14.5 64 14.5S60.18 3.74 49.57 3.74c-7.97 0-17.07 6.32-13.71 20.68c3.36 14.36 28.16 32.26 28.16 32.26s24.72-17.9 28.08-32.26c3.36-14.36-5.08-20.68-13.69-20.68z"/>
        <path fill="#DA2E75" d="M47.94 4.81c8.27 0 12.38 8.89 13.71 12.5c.19.51.91.53 1.12.03l1.21-2.83c-1.71-5.45-6.4-10.77-14.41-10.77c-3.32 0-6.82 1.1-9.55 3.41c2.4-1.59 5.23-2.34 7.92-2.34zm30.47-1.07c-2.55 0-4.7.74-6.51 1.85c1.27-.49 2.68-.78 4.23-.78c7.8 0 14.77 5.91 11.62 19.58c-2.7 11.73-18.5 25.96-23.32 31.39c-.31.35-.41.91-.41.91s24.72-17.9 28.08-32.26c3.36-14.37-5.72-20.69-13.69-20.69z"/>
        <path fill="#F386AB" d="M41.4 11.36c1.8-2.25 5.03-4.11 7.76-1.97c1.48 1.16.83 3.54-.49 4.54c-1.93 1.46-3.6 2.34-4.77 4.63c-.7 1.38-1.13 2.88-1.34 4.42c-.08.61-.88.75-1.18.22c-2.04-3.6-2.61-8.55.02-11.84zm28.91 4.73c-.85 0-1.44-.82-1.13-1.61a19.31 19.31 0 0 1 2.2-4.11c1.32-1.85 3.82-2.92 5.41-1.81c1.63 1.15 1.42 3.43.27 4.54c-2.45 2.39-5.53 2.99-6.75 2.99z"/>
        <path fill="#AB872F" d="M5.43 74.62c.06-.26 4.95-29.34 30.8-27.08c15.04 1.31 25.48 11.52 25.6 26.61c.04 5.32.22 14.51-.22 18.69c-1.83 17.58-7.74 28.43-8.53 28.63c-4.16 1.02-41.34 3.35-44.09-2.23c-6.34-12.8-5-35.68-3.56-44.62z"/>
        <linearGradient id="notoCoupleWithHeartWomanManMediumLightSkinToneLightSkinTone0" x1="1210.798" x2="1210.798" y1="123.518" y2="110.865" gradientTransform="matrix(-1 0 0 1 1241.643 0)" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#530EEB"/>
            <stop offset="1" stopColor="#651FFF"/>
        </linearGradient>
        <path fill="url(#notoCoupleWithHeartWomanManMediumLightSkinToneLightSkinTone0)" d="M27.08 111.11h7.52c8.69-.66 21.56 3.24 24.47 12.89H2.61c2.91-9.64 15.78-13.55 24.47-12.89z"/>
        <path fill="#C48E6A" d="M30.61 117.83a6.8 6.8 0 0 1-6.8-6.8v-4.54h13.61v4.54a6.816 6.816 0 0 1-6.81 6.8z"/>
        <path fill="#E0BB95" d="M37.51 55.63C25.36 54.14 13 61.79 10.64 80.95c-1.89 15.39 6.52 25.66 14.46 29.61c1.89.94 3.76 1.53 5.45 1.74c1.68.21 3.62.09 5.67-.36c8.66-1.9 19.33-9.84 21.23-25.25c2.35-19.16-7.79-29.57-19.94-31.06z"/>
        <path fill="#C48E6A" d="M36.63 94.22a.584.584 0 0 0-.22-.08l-4.94-.61c-.08 0-.15.01-.23.03c-.47.13-.77.56-.62 1.08c.15.52.96 2.03 2.94 2.27c1.98.24 3.1-1.02 3.41-1.49c.28-.47.09-.96-.34-1.2z"/>
        <path fill="#AB872F" d="M29.03 80.21c-.55-.95-1.91-2.4-4.85-2.76s-4.61.71-5.37 1.5a.9.9 0 0 0-.15 1.09c.16.27.68.57 1.31.44c.63-.13 1.89-.6 3.88-.37c1.99.26 3.1 1.02 3.68 1.3c.58.28 1.16.12 1.38-.11a.91.91 0 0 0 .12-1.09zm23.2 2.85c-.55-.95-1.91-2.4-4.85-2.76s-4.61.71-5.37 1.5a.9.9 0 0 0-.15 1.09c.16.27.68.57 1.31.44c.63-.13 1.89-.6 3.88-.37c1.99.26 3.1 1.02 3.68 1.3c.58.28 1.16.12 1.38-.11c.24-.24.37-.67.12-1.09z"/>
        <g fill="#5D4037">
            <ellipse cx="46.34" cy="88.83" rx="3.59" ry="3.46" transform="rotate(-82.998 46.345 88.832)"/>
            <ellipse cx="23.13" cy="85.98" rx="3.59" ry="3.46" transform="rotate(-82.998 23.135 85.983)"/>
        </g>
        <path fill="#6D4C41" d="M39.11 100.32c-2.39 1.05-9.67.15-11.73-1.44c-1.18-.92-2.63.08-2.24 1.31c.38 1.2 4.03 4.34 7.47 4.76c3.44.42 7.69-1.74 8.35-2.82c.67-1.09-.48-2.41-1.85-1.81z"/>
        <path fill="#AB872F" d="M36.22 47.55C10.37 45.29 5.49 74.36 5.43 74.62c-.67 4.18-1.32 11.4-1.18 19.21l7.24.51c-.22-3.96 2.88-19.14 9.42-19.61c16.27-1.19 23.71-8.59 23.71-8.59c1.7 5.36 8.36 11.2 10.74 13.41c1.95 1.81.84 11.69.47 14.4h5.66l.12-1.09c.43-4.18.26-13.37.22-18.69c-.13-15.11-10.57-25.31-25.61-26.62z"/>
        <radialGradient id="notoCoupleWithHeartWomanManMediumLightSkinToneLightSkinTone1" cx="33.662" cy="88.578" r="30.737" gradientTransform="matrix(.9988 .0497 -.0666 1.3393 5.94 -31.722)" gradientUnits="userSpaceOnUse">
            <stop offset=".765" stopColor="#BFA055" stopOpacity="0"/>
            <stop offset=".966" stopColor="#BFA055"/>
        </radialGradient>
        <path fill="url(#notoCoupleWithHeartWomanManMediumLightSkinToneLightSkinTone1)" d="M61.82 74.15c-.12-15.09-10.56-25.29-25.6-26.61C10.37 45.29 5.49 74.36 5.43 74.62c-1.34 8.35-2.6 28.87 2.4 41.97c5.33-4.24 13.28-5.94 19.25-5.48h7.52c6.52-.5 15.39 1.57 20.64 6.71c2.12-4.59 5.14-13.29 6.35-24.98c.45-4.17.27-13.37.23-18.69z"/>
        <linearGradient id="notoCoupleWithHeartWomanManMediumLightSkinToneLightSkinTone2" x1="97.236" x2="97.236" y1="123.518" y2="110.865" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#009E89"/>
            <stop offset="1" stopColor="#00BFA5"/>
        </linearGradient>
        <path fill="url(#notoCoupleWithHeartWomanManMediumLightSkinToneLightSkinTone2)" d="M101 111.11h-7.52c-8.7-.66-21.57 3.25-24.48 12.89h56.46c-2.89-9.64-15.77-13.55-24.46-12.89z"/>
        <path fill="#EDC391" d="M97 117.83a6.8 6.8 0 0 1-6.8-6.8v-4.54h13.61v4.54a6.816 6.816 0 0 1-6.81 6.8zm15-38.17l-5.18.64l-28.03 3.44l-5.18.64c-4.14.51-7.08 4.53-6.54 8.94c.54 4.41 4.37 7.6 8.51 7.09l5.18-.64l28.03-3.44l5.18-.64c4.14-.51 7.08-4.53 6.54-8.94c-.54-4.4-4.37-7.59-8.51-7.09z"/>
        <path fill="#F9DDBD" d="M89.33 53.67c-12.22 1.5-21.94 15.96-19.63 34.77c2.3 18.71 15.09 26.52 26.97 25.07c11.88-1.46 22.4-12.14 20.11-30.85c-2.31-18.81-15.23-30.49-27.45-28.99z"/>
        <path fill="#454140" d="M74.86 84.31c1.85-3.44 7.08-4.19 10.05-1.82c.51.41 1.07.96.81 1.68c-.29.8-1.08.77-1.75.59c-1.79-.48-3.59-.57-5.38.03c-.77.26-1.41.67-2.13 1.03c-.97.48-2.13-.45-1.6-1.51zM107.69 82c-1.65-.49-3.28-.69-4.99-.28a9.4 9.4 0 0 0-2.22.87c-.55.3-1.14.75-1.79.42c-1.86-.97.95-3.28 1.8-3.78c1.84-1.08 4.16-1.28 6.15-.53c.79.3 1.67.76 2.2 1.44c.67.84-.01 2.16-1.15 1.86z"/>
        <g fill="#312D2D">
            <ellipse cx="80.86" cy="89.34" rx="3.49" ry="3.61" transform="rotate(-7.002 80.837 89.317)"/>
            <ellipse cx="104.22" cy="86.47" rx="3.49" ry="3.61" transform="rotate(-7.002 104.188 86.45)"/>
        </g>
        <path fill="#DBA689" d="M96.04 94.06a.97.97 0 0 0-.23-.03l-4.97.61c-.07.02-.15.05-.22.09c-.43.24-.62.73-.34 1.21c.27.47 1.43 1.74 3.43 1.5c1.99-.24 2.81-1.76 2.96-2.28c.15-.53-.15-.97-.63-1.1z"/>
        <path fill="#444" d="M99.94 99.35c-2.07 1.61-9.41 2.51-11.81 1.45c-1.38-.61-2.55.72-1.87 1.83c.66 1.08 4.99 3.25 8.45 2.83c3.46-.42 7.69-3.57 7.47-4.78c.39-1.24-1.05-2.25-2.24-1.33z"/>
        <path fill="#312D2D" d="M88.81 49.43h-.02c-31.89 4.1-20.88 39.74-20.88 39.74s1.89 3.58 2.75 5.16c.12.23.47.16.49-.1c.31-3.13.44-14.24 1.27-17.67c.49-2.03 2.36-3.39 4.44-3.28c5.19.28 13.86-.41 13.88-.42c5.5-.67 11.38-1.99 14.44-2.94c1.99-.62 4.14.26 5.1 2.11c1.63 3.12 5.39 13.57 6.46 16.57c.09.25.44.23.5-.03l1.43-5.64c.01 0 2.07-37.24-29.86-33.5z"/>
        <radialGradient id="notoCoupleWithHeartWomanManMediumLightSkinToneLightSkinTone3" cx="117.789" cy="8.938" r="26.951" gradientTransform="matrix(.9925 -.1219 .1375 1.1198 -25.63 84.027)" gradientUnits="userSpaceOnUse">
            <stop offset=".794" stopColor="#454140" stopOpacity="0"/>
            <stop offset="1" stopColor="#454140"/>
        </radialGradient>
        <path fill="url(#notoCoupleWithHeartWomanManMediumLightSkinToneLightSkinTone3)" d="M118.68 82.93s2.06-37.25-29.87-33.5h-.02c-.5.06-.98.13-1.46.21a34.325 34.325 0 0 0-2.75.57c-.06.02-.12.03-.18.05c-26.45 6.68-16.49 38.91-16.49 38.91l2.75 5.13c.12.23.46.16.49-.1c.31-3.16.44-14.22 1.27-17.65a4.3 4.3 0 0 1 4.44-3.28c3.2.18 8.26.27 13.76-.4l1.05-.01c.02 0 .04 0 .06-.01c5.5-.67 10.39-1.99 13.45-2.94c1.99-.62 4.14.26 5.1 2.11c1.64 3.14 5.42 13.66 6.47 16.61c.09.24.43.23.5-.02c.45-1.73 1.43-5.68 1.43-5.68z"/>
    </svg>
);

export const PixaRestoreIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#673AB7" d="M10 9c-2.2 0-4 1.8-4 4v26c0 2.2 1.8 4 4 4h16c2.2 0 4-1.8 4-4V13c0-2.2-1.8-4-4-4"/>
        <path fill="#311B92" d="M14 13h2v26h-2zm10-4V7c0-1.2-.8-2-2-2h-8c-1.2 0-2 .8-2 2v2h12z"/>
        <path fill="#D84315" d="M30 13H16v26h14V13zm-9 24h-3v-4h3v4zm0-18h-3v-4h3v4zm6 18h-3v-4h3v4zm-3-18v-4h3v4h-3z"/>
        <path fill="#FF5722" d="M30 13v2h3v4h-3v14h3v4h-3v2h12V13H30zm9 24h-3v-4h3v4zm0-18h-3v-4h3v4z"/>
    </svg>
);

export const CaptionIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6.616l-2.88 2.592C8.537 20.461 7 19.776 7 18.477V17H5a2 2 0 0 1-2-2V6Zm4 2a1 1 0 0 0 0 2h5a1 1 0 1 0 0-2H7Zm8 0a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2h-2Zm-8 3a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H7Zm5 0a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2h-5Z" clipRule="evenodd"/>
    </svg>
);

export const PixaCaptionIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 14">
        <g fill="none">
            <path fill="#8fbffa" fillRule="evenodd" d="M1.867.094C.923.094.203.879.203 1.79v10.418c0 .912.72 1.697 1.664 1.697h8.225c.944 0 1.664-.785 1.664-1.697V1.844a1.75 1.75 0 0 0-1.75-1.75z" clipRule="evenodd"/>
            <path fill="#2859c5" fillRule="evenodd" d="M.953 10.25h-.75v1.96c0 .911.72 1.696 1.664 1.696h8.225c.944 0 1.664-.785 1.664-1.697V10.25zm1.875-7.243a.625.625 0 0 0 0 1.25h2.495a.625.625 0 1 0 0-1.25zm0 2.868a.625.625 0 0 0 0 1.25h1.248a.625.625 0 1 0 0-1.25z" clipRule="evenodd"/>
            <path fill="#2859c5" d="M9.402 7.394a.5.5 0 0 1-.266.14l-2.148.386a.5.5 0 0 1-.582-.573l.359-2.182a.5.5 0 0 1 .14-.273L11.021.796a1 1 0 0 1 1.42 0l1.06 1.06a1 1 0 0 1 0 1.42z"/>
        </g>
    </svg>
);

export const PixaInteriorIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
        <path fill="#CCD6DD" d="M31 29.5a1.5 1.5 0 0 1-3 0v-24a1.5 1.5 0 1 1 3 0v24z"/>
        <path fill="#CCD6DD" d="M34.882 32c.037-.164.062-.33.062-.5c0-1.933-2.463-3.5-5.5-3.5s-5.5 1.567-5.5 3.5c0 .17.025.336.062.5h10.876z"/>
        <path fill="#FCAB40" d="M35.944 9c.334 1.125-.896 2-2 2h-9c-1.104 0-2.291-1-2-2l2-7c.25-1.084.896-2 2-2h5c1.105 0 1.75 1.125 2 2l2 7z"/>
        <path fill="#5D9040" d="M29.006 29.101c0 1.215-1.017 2.199-2.271 2.199H6.296c-1.254 0-2.271-.984-2.271-2.199v-9.9c0-1.215 1.017-2.2 2.271-2.2h20.439c1.254 0 2.271.985 2.271 2.2v9.9z"/>
        <path fill="#3F7123" d="M27.5 31.3a2.2 2.2 0 0 1-2.2 2.2H6.6a2.2 2.2 0 0 1-2.2-2.2v-1.1A2.2 2.2 0 0 1 6.6 28h18.7a2.2 2.2 0 0 1 2.2 2.2v1.1z"/>
        <ellipse cx="16.516" cy="19.125" fill="#5D9040" rx="12.484" ry="6.125"/>
        <path fill="#78B159" d="M6.6 23.601A3.3 3.3 0 1 1-.001 23.6a3.3 3.3 0 0 1 6.601 0z"/>
        <path fill="#78B159" d="M6.6 33.5a2.2 2.2 0 0 1-4.4 0v-9.899a2.2 2.2 0 0 1 4.4 0V33.5zm19.8-9.899a3.3 3.3 0 1 0 6.6 0a3.3 3.3 0 0 0-6.6 0z"/>
        <path fill="#78B159" d="M26.4 33.5a2.2 2.2 0 1 0 4.399 0v-9.899a2.2 2.2 0 0 0-4.399 0V33.5zM16.5 28a2.2 2.2 0 0 1-2.2 2.2H8.8a2.2 2.2 0 0 1 0-4.4h5.5a2.2 2.2 0 0 1 2.2 2.2zm9.9 0a2.2 2.2 0 0 1-2.2 2.2h-5.5a2.2 2.2 0 0 1 0-4.4h5.5a2.2 2.2 0 0 1 2.2 2.2z"/>
        <path fill="#78B159" d="M6 28h21v3H6z"/>
    </svg>
);

// Updated BuildingIcon with new SVG
export const BuildingIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g fill="none">
            <path fill="url(#fluentColorBuildingMultiple240)" fillRule="evenodd" d="M14 4.25V22H3.75a.75.75 0 0 1-.75-.75v-17A2.25 2.25 0 0 1 5.25 2h6.5A2.25 2.25 0 0 1 14 4.25" clipRule="evenodd"/>
            <path fill="url(#fluentColorBuildingMultiple241)" fillOpacity=".2" fillRule="evenodd" d="M14 4.25V22H3.75a.75.75 0 0 1-.75-.75v-17A2.25 2.25 0 0 1 5.25 2h6.5A2.25 2.25 0 0 1 14 4.25" clipRule="evenodd"/>
            <path fill="url(#fluentColorBuildingMultiple242)" fillRule="evenodd" d="M14 4.25V22H3.75a.75.75 0 0 1-.75-.75v-17A2.25 2.25 0 0 1 5.25 2h6.5A2.25 2.25 0 0 1 14 4.25" clipRule="evenodd"/>
            <path fill="url(#fluentColorBuildingMultiple243)" d="M8 6a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple244)" d="M8 12a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple245)" d="M8 9a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple246)" d="M8 15a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple247)" d="M8 18a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple248)" d="M18.75 5A2.25 2.25 0 0 1 21 7.25v14a.75.75 0 0 1-.75.75h-9.247A1 1 0 0 1 10 21V7.25A2.25 2.25 0 0 1 12.25 5z"/>
            <path fill="url(#fluentColorBuildingMultiple249)" d="M13 19a1 1 0 0 1 1-1h3a1 1 0 0 1 1 1v3h-5z"/>
            <path fill="url(#fluentColorBuildingMultiple24a)" d="M15 9a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple24b)" d="M15 12a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple24c)" d="M15 15a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple24d)" d="M18 9a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple24e)" d="M18 12a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <path fill="url(#fluentColorBuildingMultiple24f)" d="M18 15a1 1 0 1 1-2 0a1 1 0 0 1 2 0"/>
            <defs>
                <linearGradient id="fluentColorBuildingMultiple240" x1="3.393" x2="15.293" y1="5.75" y2="12.55" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A3A3FF"/>
                    <stop offset="1" stopColor="#5750E2"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple241" x1="6.85" x2="10.7" y1="4.5" y2="4.5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#30116E" stopOpacity="0"/>
                    <stop offset="1" stopColor="#30116E"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple242" x1="10.838" x2="10.66" y1="8.094" y2="2.001" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#A3A3FF" stopOpacity="0"/>
                    <stop offset="1" stopColor="#A3A3FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple243" x1="5.333" x2="8" y1="4.333" y2="19.667" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#D1D1FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple244" x1="5.333" x2="8" y1="4.333" y2="19.667" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#D1D1FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple245" x1="5.333" x2="8" y1="4.333" y2="19.667" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#D1D1FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple246" x1="5.333" x2="8" y1="4.333" y2="19.667" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#D1D1FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple247" x1="5.333" x2="8" y1="4.333" y2="19.667" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#D1D1FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple248" x1="10" x2="25.941" y1="5.531" y2="18.736" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#3BD5FF"/>
                    <stop offset="1" stopColor="#2764E7"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple249" x1="13.804" x2="16.474" y1="18.75" y2="22.218" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0067BF"/>
                    <stop offset="1" stopColor="#003580"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple24a" x1="14.5" x2="18.706" y1="7.111" y2="16.575" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#B3E0FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple24b" x1="14.5" x2="18.706" y1="7.111" y2="16.575" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#B3E0FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple24c" x1="14.5" x2="18.706" y1="7.111" y2="16.575" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#B3E0FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple24d" x1="14.5" x2="18.706" y1="7.111" y2="16.575" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#B3E0FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple24e" x1="14.5" x2="18.706" y1="7.111" y2="16.575" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#B3E0FF"/>
                </linearGradient>
                <linearGradient id="fluentColorBuildingMultiple24f" x1="14.5" x2="18.706" y1="7.111" y2="16.575" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#FDFDFD"/>
                    <stop offset="1" stopColor="#B3E0FF"/>
                </linearGradient>
            </defs>
        </g>
    </svg>
);

export const MockupIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />} />
);

export const PixaMockupIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} width="200" height="200" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g fill="none">
            <path fill="#fff" d="M22.044 3.391H1.957A.957.957 0 0 0 1 4.348v15.304c0 .528.428.957.957.957h20.087a.956.956 0 0 0 .956-.957V4.348a.956.956 0 0 0-.956-.957"/>
            <path fill="#c2f3ff" d="M21.087 5.308v7.652h-2.392v5.74H2.913V5.308z"/>
            <path fill="#66e1ff" d="M6.54 18.7h12.156v-5.74h2.39V5.308H19.93z"/>
            <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M23 8.652v11a.956.956 0 0 1-.957.957H1.957A.956.956 0 0 1 1 19.652V4.348a.957.957 0 0 1 .957-.957h16.739"/>
            <path fill="#ff808c" d="M21.087 15.83h-2.392v2.87h2.392z"/>
            <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M16.782 5.308H2.912V18.7h15.783"/>
            <path fill="#ffef5e" d="M21.087 12.96h-2.392v2.87h2.392z"/>
            <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M21.087 12.96v-2.39"/>
            <path fill="#e3e3e3" d="M8.174 14.87a3.348 3.348 0 1 0 0-6.696a3.348 3.348 0 0 0 0 6.696"/>
            <path fill="#fff" d="M8.174 12.957a1.434 1.434 0 1 0 0-2.87a1.434 1.434 0 0 0 0 2.87"/>
            <path fill="gray" d="m22.605 6.656l-4.866 4.866l-2.391.478l.478-2.391l4.866-4.866a1.35 1.35 0 0 1 1.907 0l.006.006a1.35 1.35 0 0 1 0 1.907"/>
            <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M21.087 15.83h-2.392v2.87h2.392z"/>
            <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M21.087 12.96h-2.392v2.87h2.392zM8.174 14.87a3.348 3.348 0 1 0 0-6.696a3.348 3.348 0 0 0 0 6.696"/>
            <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M8.174 12.957a1.434 1.434 0 1 0 0-2.87a1.434 1.434 0 0 0 0 2.87m14.431-6.301l-4.866 4.866l-2.391.478l.478-2.391l4.866-4.866a1.35 1.35 0 0 1 1.907 0l.006.006a1.35 1.35 0 0 1 0 1.907"/>
        </g>
    </svg>
);

export const ScannerIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5A2.25 2.25 0 016 2.25h12A2.25 2.25 0 0120.25 4.5v15A2.25 2.25 0 0118 21.75H6A2.25 2.25 0 013.75 19.5v-15zM12 18.75a.375.375 0 100-.75.375.375 0 000 .75z" />} />
);

export const NotesIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />} />
);

// Renamed from ProductStudioIcon
export const BrandKitIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M3 11.25h18M3 11.25l2.25-6h13.5l2.25 6m-18 0h18m-9-3v12m-6-9h12" />} />
);

// Kept for backward compatibility if needed, but now aliased
export const ProductStudioIcon = BrandKitIcon;

// Custom Thumbnail Studio Icon (Gallery/Grid)
export const ThumbnailIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 128 128">
        <path fill="#F77E00" d="M116.46 3.96h-104c-4.42 0-8 3.58-8 8v104c0 4.42 3.58 8 8 8h104c4.42 0 8-3.58 8-8v-104c0-4.42-3.58-8-8-8z"/>
        <path fill="#FF9800" d="M110.16 3.96h-98.2a7.555 7.555 0 0 0-7.5 7.5v97.9c-.01 4.14 3.34 7.49 7.48 7.5h98.12c4.14.01 7.49-3.34 7.5-7.48V11.46c.09-4.05-3.13-7.41-7.18-7.5h-.22z"/>
        <path fill="#FFBD52" d="M40.16 12.86c0-2.3-1.6-3-10.8-2.7c-7.7.3-11.5 1.2-13.8 4s-2.9 8.5-3 15.3c0 4.8 0 9.3 2.5 9.3c3.4 0 3.4-7.9 6.2-12.3c5.4-8.7 18.9-10.6 18.9-13.6z" opacity=".75"/>
        <path fill="#FAFAFA" d="M43.7 62.21v-25.7a2.258 2.258 0 0 1 3.4-2l43.5 25.7c1.13.72 1.47 2.22.75 3.35c-.19.3-.45.55-.75.75l-43.5 25.6c-1.08.63-2.46.27-3.09-.81c-.21-.36-.32-.77-.31-1.19v-25.7z"/>
    </svg>
);

export const ReplicaIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
        <path fill="currentColor" d="M408 480H184a72 72 0 0 1-72-72V184a72 72 0 0 1 72-72h224a72 72 0 0 1 72 72v224a72 72 0 0 1-72 72Z"/>
        <path fill="currentColor" d="M160 80h235.88A72.12 72.12 0 0 0 328 32H104a72 72 0 0 0-72 72v224a72.12 72.12 0 0 0 48 67.88V160a80 80 0 0 1 80-80Z"/>
    </svg>
);

export const ReimagineIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g fill="none" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2">
            <path d="M0 0h24v24H0z" stroke="none"/>
            <path fill="currentColor" stroke="none" d="M4 11a1 1 0 0 1 .117 1.993L4 13H3a1 1 0 0 1-.117-1.993L3 11h1zm8-9a1 1 0 0 1 .993.883L13 3v1a1 1 0 0 1-1.993.117L11 4V3a1 1 0 0 1 1-1zm9 9a1 1 0 0 1 .117 1.993L21 13h-1a1 1 0 0 1-.117-1.993L20 11h1zM4.893 4.893a1 1 0 0 1 1.32-.083l.094.083l.7.7a1 1 0 0 1-1.32 1.497l-.094-.083l-.7-.7a1 1 0 0 1 0-1.414zm12.8 0a1 1 0 0 1 1.497 1.32l-.083.094l-.7.7a1 1 0 0 1-1.497-1.32l.083-.094l.7-.7zM14 18a1 1 0 0 1 1 1a3 3 0 0 1-6 0a1 1 0 0 1 .883-.993L10 18h4zM12 6a6 6 0 0 1 3.6 10.8a1 1 0 0 1-.471.192L15 17H9a1 1 0 0 1-.6-.2A6 6 0 0 1 12 6z"/>
        </g>
    </svg>
);

// Custom Pixa Support Icon
export const PixaSupportIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g fill="none">
            <path fill="#8fbffa" d="M12 1C5.925 1 1 5.925 1 12c0 2.392.765 4.608 2.062 6.413L.196 23H12c6.075 0 11-4.925 11-11S18.075 1 12 1"/>
            <path fill="#2859c5" fillRule="evenodd" d="M9.938 9.5a2 2 0 1 1 4 0v.106l-2.665 2.369l-.335.298V14.5h2v-1.329l2.664-2.368l.335-.298V9.5a4 4 0 0 0-8 0v.556h2V9.5Zm1 6.5v2h2v-2z" clipRule="evenodd"/>
        </g>
    </svg>
);

// Custom Pixa Billing Icon
export const PixaBillingIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 36">
        <path fill="#FFAC33" d="M4 5a4 4 0 0 0-4 4v18a4 4 0 0 0 4 4h28a4 4 0 0 0 4-4V9s0-4-4-4H4z"/>
        <path fill="#292F33" d="M0 10h36v5H0z"/>
        <path fill="#F4F7F9" d="M4 19h28v6H4z"/>
        <path fill="#8899A6" d="M19 24c-1.703 0-2.341-1.21-2.469-1.801c-.547.041-1.08.303-1.805.764C13.961 23.449 13.094 24 12 24c-1.197 0-1.924-.675-2-2c-.003-.056.038-.188.021-.188c-1.858 0-3.202 1.761-3.215 1.779a.997.997 0 0 1-1.397.215a1 1 0 0 1-.215-1.398C5.271 22.303 7.11 20 10 20c1.937 0 2.048 1.375 2.078 1.888l.007.109c.486-.034.991-.354 1.57-.723c.961-.61 2.153-1.371 3.75-.962c.871.223 1.007 1.031 1.059 1.336c.013.076.032.19.049.226c.007 0 .146.091.577.13c.82.075 1.721-.279 2.675-.653c.988-.388 2.01-.788 3.111-.788c3.389 0 4.767 1.635 4.913 1.821a1 1 0 1 1-1.575 1.232c-.024-.027-.93-1.054-3.337-1.054c-.723 0-1.528.315-2.381.649c-1.009.396-2.434.789-3.496.789z"/>
    </svg>
);

// Pixa Headshot Icon
export const PixaHeadshotIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
        <g fill="none">
            <path fill="url(#f1470id12)" d="M16 15.504c-6.08 0-11 4.92-11 11v3.5h22v-3.5c0-6.07-4.93-11-11-11Z"/>
            <path fill="url(#f1470id0)" d="M16 15.504c-6.08 0-11 4.92-11 11v3.5h22v-3.5c0-6.07-4.93-11-11-11Z"/>
            <g filter="url(#f1470id1q)">
                <path fill="#41355C" d="M13.419 16.853c-.513 0-1.296-.03-1.77.166l-1.38 2.724c-.09.19.06.41.27.41h1.55c.24 0 .35.29.19.45l-1.78 1.343c-.26.26-.36.65-.23 1l2.912 6.5l1.587-1.116l-1.34-11.477h-.01Z"/>
            </g>
            <g filter="url(#f1470id1r)">
                <path fill="#463D68" d="m20.904 21.186l-1.189-.828a.23.23 0 0 1 .166-.393h.919a.252.252 0 0 0 .227-.359l-1.076-2.29a8.184 8.184 0 0 0-.646-.237h-.595v11.862l2.404-6.872a.846.846 0 0 0-.21-.883Z"/>
            </g>
            <path fill="url(#f1470id1)" d="M18.71 16.125h-5.42v13.89h5.42v-13.89Z"/>
            <path fill="url(#f1470id13)" d="M18.71 16.125h-5.42v13.89h5.42v-13.89Z"/>
            <path fill="url(#f1470id14)" d="M18.71 16.125h-5.42v13.89h5.42v-13.89Z"/>
            <path fill="url(#f1470id2)" d="M23 18.022v11.983h4v-3.5a10.98 10.98 0 0 0-4-8.483Z"/>
            <path fill="url(#f1470id15)" d="M23 18.022v11.983h4v-3.5a10.98 10.98 0 0 0-4-8.483Z"/>
            <g filter="url(#f1470id1s)">
                <path fill="url(#f1470id16)" d="M13.29 16.095h-.85c-.18.06-.36.13-.53.2l-1.27 2.69c-.09.19.06.41.27.41h1.05c.24 0 .35.29.19.45l-1.36 1.33c-.26.26-.36.65-.23 1l2.73 7.82h.01v-13.9h-.01Z"/>
                <path fill="url(#f1470id17)" d="M13.29 16.095h-.85c-.18.06-.36.13-.53.2l-1.27 2.69c-.09.19.06.41.27.41h1.05c.24 0 .35.29.19.45l-1.36 1.33c-.26.26-.36.65-.23 1l2.73 7.82h.01v-13.9h-.01Z"/>
                <path fill="url(#f1470id3)" d="M13.29 16.095h-.85c-.18.06-.36.13-.53.2l-1.27 2.69c-.09.19.06.41.27.41h1.05c.24 0 .35.29.19.45l-1.36 1.33c-.26.26-.36.65-.23 1l2.73 7.82h.01v-13.9h-.01Z"/>
            </g>
            <path fill="url(#f1470id18)" d="M13.29 16.095h-.85c-.18.06-.36.13-.53.2l-1.27 2.69c-.09.19.06.41.27.41h1.05c.24 0 .35.29.19.45l-1.36 1.33c-.26.26-.36.65-.23 1l2.73 7.82h.01v-13.9h-.01Z"/>
            <path fill="url(#f1470id4)" d="M13.29 16.095h-.85c-.18.06-.36.13-.53.2l-1.27 2.69c-.09.19.06.41.27.41h1.05c.24 0 .35.29.19.45l-1.36 1.33c-.26.26-.36.65-.23 1l2.73 7.82h.01v-13.9h-.01Z"/>
            <g filter="url(#f1470id1t)">
                <path fill="url(#f1470id19)" d="m16.01 18.331l-1.24 1.205a.15.15 0 0 0-.033.167l.547 1.26a.25.25 0 0 0 .23.151h.952c.1 0 .19-.06.23-.151l.55-1.28a.15.15 0 0 0-.033-.166l-1.202-1.186Z"/>
            </g>
            <g filter="url(#f1470id1u)">
                <path fill="#605890" d="m21.22 21.124l-1.36-1.33a.262.262 0 0 1 .19-.45h1.05c.21 0 .35-.22.26-.41l-1.23-2.62c-.24-.1-.49-.19-.74-.27h-.68v13.95l2.75-7.86c.12-.36.03-.75-.24-1.01Z"/>
                <path fill="url(#f1470id1a)" d="m21.22 21.124l-1.36-1.33a.262.262 0 0 1 .19-.45h1.05c.21 0 .35-.22.26-.41l-1.23-2.62c-.24-.1-.49-.19-.74-.27h-.68v13.95l2.75-7.86c.12-.36.03-.75-.24-1.01Z"/>
            </g>
            <path fill="url(#f1470id5)" d="M16 15.061h-2.71v4.74c0 .31.36.49.61.29L16 18.7l2.1 1.392c.25.2.61.02.61-.29v-4.74H16Z"/>
            <path fill="url(#f1470id6)" d="M16 15.061h-2.71v4.74c0 .31.36.49.61.29L16 18.7l2.1 1.392c.25.2.61.02.61-.29v-4.74H16Z"/>
            <path fill="url(#f1470id1b)" d="M7.032 30.004H8.97V18.04a10.992 10.992 0 0 0-3.656 5.843a10.943 10.943 0 0 0-.304 2.631l.02 3.49h2.002Z"/>
            <path fill="url(#f1470id7)" d="M15.505 21.114a.25.25 0 0 0-.247.213l-1.328 8.667h4.11l-1.318-8.667a.25.25 0 0 0-.247-.213h-.97Z"/>
            <path fill="url(#f1470id1c)" d="M15.505 21.114a.25.25 0 0 0-.247.213l-1.328 8.667h4.11l-1.318-8.667a.25.25 0 0 0-.247-.213h-.97Z"/>
            <path fill="url(#f1470id1d)" d="M15.505 21.114a.25.25 0 0 0-.247.213l-1.328 8.667h4.11l-1.318-8.667a.25.25 0 0 0-.247-.213h-.97Z"/>
            <path fill="url(#f1470id8)" d="M14.045 16.894c.02.214.205.691.746 1.055c.214.143 1.213.628 1.193.619c.156-.079.807-.299 1.284-.62c.54-.363.725-.84.746-1.054l-1.985-.953l-1.984.953Z"/>
            <path fill="url(#f1470id9)" d="M20.908 12.083c.336-.01.65-.125.905-.309v.931c0 .893-.532 1.69-1.34 2.02a4.09 4.09 0 0 0 .345-1.18l.09-1.462Z"/>
            <path fill="url(#f1470ida)" d="M11.186 12.083a1.64 1.64 0 0 1-.905-.309v.931c0 .893.532 1.69 1.341 2.02a4.086 4.086 0 0 1-.346-1.18l-.09-1.462Z"/>
            <g filter="url(#f1470id1v)">
                <path fill="url(#f1470idb)" d="M11.222 13.598a3.916 3.916 0 0 0 3.886 3.406h1.887a3.916 3.916 0 0 0 3.885-3.406c.118-1.884.237-3.76.324-5.643a1.45 1.45 0 0 0-1.379-1.432h-1.4a2.424 2.424 0 0 1-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.845 0-3.341 1.513-3.341 3.38c0 1.86.116 3.69.238 5.556Z"/>
            </g>
            <path fill="url(#f1470id1e)" d="M11.222 13.598a3.916 3.916 0 0 0 3.886 3.406h1.887a3.916 3.916 0 0 0 3.885-3.406c.118-1.884.237-3.76.324-5.643a1.45 1.45 0 0 0-1.379-1.432h-1.4a2.424 2.424 0 0 1-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.845 0-3.341 1.513-3.341 3.38c0 1.86.116 3.69.238 5.556Z"/>
            <path fill="url(#f1470idc)" d="M11.222 13.598a3.916 3.916 0 0 0 3.886 3.406h1.887a3.916 3.916 0 0 0 3.885-3.406c.118-1.884.237-3.76.324-5.643a1.45 1.45 0 0 0-1.379-1.432h-1.4a2.424 2.424 0 0 1-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.845 0-3.341 1.513-3.341 3.38c0 1.86.116 3.69.238 5.556Z"/>
            <path fill="url(#f1470idd)" d="M11.222 13.598a3.916 3.916 0 0 0 3.886 3.406h1.887a3.916 3.916 0 0 0 3.885-3.406c.118-1.884.237-3.76.324-5.643a1.45 1.45 0 0 0-1.379-1.432h-1.4a2.424 2.424 0 0 1-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.845 0-3.341 1.513-3.341 3.38c0 1.86.116 3.69.238 5.556Z"/>
            <path fill="url(#f1470ide)" d="M11.222 13.598a3.916 3.916 0 0 0 3.886 3.406h1.887a3.916 3.916 0 0 0 3.885-3.406c.118-1.884.237-3.76.324-5.643a1.45 1.45 0 0 0-1.379-1.432h-1.4a2.424 2.424 0 0 1-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.845 0-3.341 1.513-3.341 3.38c0 1.86.116 3.69.238 5.556Z"/>
            <path fill="url(#f1470idf)" d="M11.222 13.598a3.916 3.916 0 0 0 3.886 3.406h1.887a3.916 3.916 0 0 0 3.885-3.406c.118-1.884.237-3.76.324-5.643a1.45 1.45 0 0 0-1.379-1.432h-1.4a2.424 2.424 0 0 1-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.845 0-3.341 1.513-3.341 3.38c0 1.86.116 3.69.238 5.556Z"/>
            <path fill="url(#f1470idg)" d="M11.222 13.598a3.916 3.916 0 0 0 3.886 3.406h1.887a3.916 3.916 0 0 0 3.885-3.406c.118-1.884.237-3.76.324-5.643a1.45 1.45 0 0 0-1.379-1.432h-1.4a2.424 2.424 0 0 1-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.845 0-3.341 1.513-3.341 3.38c0 1.86.116 3.69.238 5.556Z"/>
            <path fill="url(#f1470id1f)" d="M11.222 13.598a3.916 3.916 0 0 0 3.886 3.406h1.887a3.916 3.916 0 0 0 3.885-3.406c.118-1.884.237-3.76.324-5.643a1.45 1.45 0 0 0-1.379-1.432h-1.4a2.424 2.424 0 0 1-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.845 0-3.341 1.513-3.341 3.38c0 1.86.116 3.69.238 5.556Z"/>
            <g filter="url(#f1470id1w)">
                <path fill="#D69790" d="m15.646 10.31l-.591 1.837c-.101.379.141.757.484.757h.732c.343 0 .585-.384.484-.757l-.494-1.838c-.106-.407-.504-.407-.615 0Z"/>
            </g>
            <g filter="url(#f1470id1x)">
                <path fill="#F6BFAB" d="m15.665 10.118l-.532 1.839c-.108.378.152.756.52.756h.787c.369 0 .63-.384.52-.756l-.53-1.839c-.114-.407-.646-.407-.765 0Z"/>
                <path fill="url(#f1470id1g)" d="m15.665 10.118l-.532 1.839c-.108.378.152.756.52.756h.787c.369 0 .63-.384.52-.756l-.53-1.839c-.114-.407-.646-.407-.765 0Z"/>
                <path fill="url(#f1470idh)" d="m15.665 10.118l-.532 1.839c-.108.378.152.756.52.756h.787c.369 0 .63-.384.52-.756l-.53-1.839c-.114-.407-.646-.407-.765 0Z"/>
                <path fill="url(#f1470id1h)" d="m15.665 10.118l-.532 1.839c-.108.378.152.756.52.756h.787c.369 0 .63-.384.52-.756l-.53-1.839c-.114-.407-.646-.407-.765 0Z"/>
                <path fill="url(#f1470idi)" d="m15.665 10.118l-.532 1.839c-.108.378.152.756.52.756h.787c.369 0 .63-.384.52-.756l-.53-1.839c-.114-.407-.646-.407-.765 0Z"/>
                <path fill="url(#f1470id1i)" d="m15.665 10.118l-.532 1.839c-.108.378.152.756.52.756h.787c.369 0 .63-.384.52-.756l-.53-1.839c-.114-.407-.646-.407-.765 0Z"/>
            </g>
            <g filter="url(#f1470id1y)">
                <path stroke="url(#f1470id1j)" strokeWidth=".15" d="M14.696 13.335a.228.228 0 0 0-.271.046a.212.212 0 0 0-.023.271c.348.528.955.879 1.645.879a1.97 1.97 0 0 0 1.646-.88a.214.214 0 0 0-.024-.272a.228.228 0 0 0-.27-.045h-.001c-.39.204-.85.32-1.35.32c-.497 0-.962-.116-1.352-.32Z"/>
            </g>
            <path fill="url(#f1470idj)" d="M16.047 13.73c-.507 0-.985-.12-1.385-.329c-.137-.07-.285.085-.198.209c.335.508.918.846 1.583.846c.665 0 1.248-.338 1.583-.846c.087-.13-.06-.279-.197-.209a2.99 2.99 0 0 1-1.386.329Z"/>
            <g filter="url(#f1470id1z)">
                <path fill="url(#f1470id1k)" d="M20.902 4.19c.514.177.976.536 1.267 1.051a2.37 2.37 0 0 1-.106 2.527a1.56 1.56 0 0 0-.27.874V9.83a1.744 1.744 0 0 0-.667-.268l.078-1.607a1.45 1.45 0 0 0-1.379-1.432h-1.4c-.955 0-1.82-.563-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.846 0-3.341 1.513-3.341 3.38l.03 1.536a1.727 1.727 0 0 0-.72.264v-1.2c0-.311-.095-.617-.27-.874a2.39 2.39 0 0 1-.143-2.446a2.344 2.344 0 0 1 1.299-1.127a2.68 2.68 0 0 0 1.384-1.11a2.326 2.326 0 0 1 2.89-.912a1.49 1.49 0 0 0 1.194 0c.281-.118.589-.187.912-.187c.844 0 1.58.456 1.99 1.131c.307.51.79.88 1.352 1.073Z"/>
                <path fill="url(#f1470idk)" d="M20.902 4.19c.514.177.976.536 1.267 1.051a2.37 2.37 0 0 1-.106 2.527a1.56 1.56 0 0 0-.27.874V9.83a1.744 1.744 0 0 0-.667-.268l.078-1.607a1.45 1.45 0 0 0-1.379-1.432h-1.4c-.955 0-1.82-.563-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.846 0-3.341 1.513-3.341 3.38l.03 1.536a1.727 1.727 0 0 0-.72.264v-1.2c0-.311-.095-.617-.27-.874a2.39 2.39 0 0 1-.143-2.446a2.344 2.344 0 0 1 1.299-1.127a2.68 2.68 0 0 0 1.384-1.11a2.326 2.326 0 0 1 2.89-.912a1.49 1.49 0 0 0 1.194 0c.281-.118.589-.187.912-.187c.844 0 1.58.456 1.99 1.131c.307.51.79.88 1.352 1.073Z"/>
                <path fill="url(#f1470idl)" d="M20.902 4.19c.514.177.976.536 1.267 1.051a2.37 2.37 0 0 1-.106 2.527a1.56 1.56 0 0 0-.27.874V9.83a1.744 1.744 0 0 0-.667-.268l.078-1.607a1.45 1.45 0 0 0-1.379-1.432h-1.4c-.955 0-1.82-.563-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.846 0-3.341 1.513-3.341 3.38l.03 1.536a1.727 1.727 0 0 0-.72.264v-1.2c0-.311-.095-.617-.27-.874a2.39 2.39 0 0 1-.143-2.446a2.344 2.344 0 0 1 1.299-1.127a2.68 2.68 0 0 0 1.384-1.11a2.326 2.326 0 0 1 2.89-.912a1.49 1.49 0 0 0 1.194 0c.281-.118.589-.187.912-.187c.844 0 1.58.456 1.99 1.131c.307.51.79.88 1.352 1.073Z"/>
                <path fill="url(#f1470idm)" d="M20.902 4.19c.514.177.976.536 1.267 1.051a2.37 2.37 0 0 1-.106 2.527a1.56 1.56 0 0 0-.27.874V9.83a1.744 1.744 0 0 0-.667-.268l.078-1.607a1.45 1.45 0 0 0-1.379-1.432h-1.4c-.955 0-1.82-.563-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.846 0-3.341 1.513-3.341 3.38l.03 1.536a1.727 1.727 0 0 0-.72.264v-1.2c0-.311-.095-.617-.27-.874a2.39 2.39 0 0 1-.143-2.446a2.344 2.344 0 0 1 1.299-1.127a2.68 2.68 0 0 0 1.384-1.11a2.326 2.326 0 0 1 2.89-.912a1.49 1.49 0 0 0 1.194 0c.281-.118.589-.187.912-.187c.844 0 1.58.456 1.99 1.131c.307.51.79.88 1.352 1.073Z"/>
                <path fill="url(#f1470idn)" d="M20.902 4.19c.514.177.976.536 1.267 1.051a2.37 2.37 0 0 1-.106 2.527a1.56 1.56 0 0 0-.27.874V9.83a1.744 1.744 0 0 0-.667-.268l.078-1.607a1.45 1.45 0 0 0-1.379-1.432h-1.4c-.955 0-1.82-.563-2.212-1.443a.664.664 0 0 0-.615-.418h-1.273c-1.846 0-3.341 1.513-3.341 3.38l.03 1.536a1.727 1.727 0 0 0-.72.264v-1.2c0-.311-.095-.617-.27-.874a2.39 2.39 0 0 1-.143-2.446a2.344 2.344 0 0 1 1.299-1.127a2.68 2.68 0 0 0 1.384-1.11a2.326 2.326 0 0 1 2.89-.912a1.49 1.49 0 0 0 1.194 0c.281-.118.589-.187.912-.187c.844 0 1.58.456 1.99 1.131c.307.51.79.88 1.352 1.073Z"/>
            </g>
            <g filter="url(#f1470id20)">
                <path fill="#202020" d="M19.78 7.853a1.854 1.854 0 0 0-.688-.411c-.304-.096-.685-.122-1.212-.057a.277.277 0 1 0 .067.55c.481-.058.776-.028.979.036c.198.062.332.164.49.3a.277.277 0 0 0 .364-.418Z"/>
            </g>
            <g filter="url(#f1470id21)">
                <path fill="#202020" d="M12.636 7.744a2.774 2.774 0 0 1 1.739-.36a.277.277 0 1 1-.067.551a2.219 2.219 0 0 0-1.387.285a1.39 1.39 0 0 0-.092.06l-.002.002a.277.277 0 0 1-.34-.439l.15-.099Z"/>
            </g>
            <g filter="url(#f1470id22)">
                <path fill="#23181C" d="M16.28 5.217a2.538 2.538 0 0 1-.067-.136a.664.664 0 0 0-.615-.419h-1.273c-1.845 0-3.341 1.513-3.341 3.38v.275c-.34-.26-.768-.805-.768-1.688c0-1.072.782-1.614 1.28-1.96c.141-.097.26-.179.331-.253l.1-.105c.35-.37.972-1.03 2.06-1.32a5.466 5.466 0 0 1 1.508-.165c.472.012.806.42.806.893v1.485l-.021.013Z"/>
                <path fill="url(#f1470ido)" d="M16.28 5.217a2.538 2.538 0 0 1-.067-.136a.664.664 0 0 0-.615-.419h-1.273c-1.845 0-3.341 1.513-3.341 3.38v.275c-.34-.26-.768-.805-.768-1.688c0-1.072.782-1.614 1.28-1.96c.141-.097.26-.179.331-.253l.1-.105c.35-.37.972-1.03 2.06-1.32a5.466 5.466 0 0 1 1.508-.165c.472.012.806.42.806.893v1.485l-.021.013Z"/>
                <path fill="url(#f1470idp)" d="M16.28 5.217a2.538 2.538 0 0 1-.067-.136a.664.664 0 0 0-.615-.419h-1.273c-1.845 0-3.341 1.513-3.341 3.38v.275c-.34-.26-.768-.805-.768-1.688c0-1.072.782-1.614 1.28-1.96c.141-.097.26-.179.331-.253l.1-.105c.35-.37.972-1.03 2.06-1.32a5.466 5.466 0 0 1 1.508-.165c.472.012.806.42.806.893v1.485l-.021.013Z"/>
            </g>
            <g filter="url(#f1470id23)">
                <path fill="#1F151B" d="m21.26 8.484l-.03-.631c-.01-.763-.64-1.393-1.405-1.426h-1.4c-.889 0-1.7-.485-2.124-1.26c0 0-.058-.135-.12-.367c-.256-.97.671-1.713 1.656-1.522c.973.19 2.082.517 2.902 1.052c1.744 1.138 1.44 3.188.52 4.154Z"/>
                <path fill="url(#f1470idq)" d="m21.26 8.484l-.03-.631c-.01-.763-.64-1.393-1.405-1.426h-1.4c-.889 0-1.7-.485-2.124-1.26c0 0-.058-.135-.12-.367c-.256-.97.671-1.713 1.656-1.522c.973.19 2.082.517 2.902 1.052c1.744 1.138 1.44 3.188.52 4.154Z"/>
                <path fill="url(#f1470idr)" d="m21.26 8.484l-.03-.631c-.01-.763-.64-1.393-1.405-1.426h-1.4c-.889 0-1.7-.485-2.124-1.26c0 0-.058-.135-.12-.367c-.256-.97.671-1.713 1.656-1.522c.973.19 2.082.517 2.902 1.052c1.744 1.138 1.44 3.188.52 4.154Z"/>
                <path fill="url(#f1470ids)" d="m21.26 8.484l-.03-.631c-.01-.763-.64-1.393-1.405-1.426h-1.4c-.889 0-1.7-.485-2.124-1.26c0 0-.058-.135-.12-.367c-.256-.97.671-1.713 1.656-1.522c.973.19 2.082.517 2.902 1.052c1.744 1.138 1.44 3.188.52 4.154Z"/>
            </g>
            <path fill="#fff" d="M18.438 9.168c.653 0 1.205.45 1.355 1.059a.274.274 0 0 1-.268.34h-2.231a.23.23 0 0 1-.227-.271a1.398 1.398 0 0 1 1.371-1.128Z"/>
            <path fill="url(#f1470idt)" d="M18.231 9.44a.892.892 0 0 1 .86 1.127h-1.724a.896.896 0 0 1 .864-1.128Z"/>
            <path fill="#000" d="M17.72 10.332c0-.284.227-.511.511-.511a.509.509 0 0 1 .455.747h-.905a.463.463 0 0 1-.06-.236Z"/>
            <g filter="url(#f1470id24)">
                <path fill="#C7A7A3" d="M18.166 9.628c.063.085-.07.19-.22.302c-.152.113-.264.193-.328.107c-.063-.085.008-.245.159-.358c.15-.113.325-.136.389-.05Z"/>
                <path fill="url(#f1470idu)" d="M18.166 9.628c.063.085-.07.19-.22.302c-.152.113-.264.193-.328.107c-.063-.085.008-.245.159-.358c.15-.113.325-.136.389-.05Z"/>
            </g>
            <g filter="url(#f1470id25)">
                <path fill="url(#f1470id1l)" d="M19.026 10.215a.84.84 0 0 0-.231-.463l-.26.285l.117.228l.374-.05Z"/>
            </g>
            <path fill="#fff" d="M13.656 9.168c-.653 0-1.205.45-1.355 1.059c-.044.174.09.34.268.34H14.8a.23.23 0 0 0 .227-.271a1.401 1.401 0 0 0-1.37-1.128Z"/>
            <path fill="url(#f1470idv)" d="M13.863 9.44a.892.892 0 0 0-.86 1.128h1.724a.919.919 0 0 0 .032-.236a.899.899 0 0 0-.896-.892Z"/>
            <path fill="#000" d="M14.374 10.332a.509.509 0 0 0-.511-.511a.509.509 0 0 0-.454.747h.904a.507.507 0 0 0 .061-.236Z"/>
            <g filter="url(#f1470id26)">
                <path fill="url(#f1470id1m)" d="M14.678 10.227c0-.288-.234-.48-.298-.539l-.288.28l.178.36l.408-.1Z"/>
            </g>
            <g filter="url(#f1470id27)">
                <ellipse cx="13.594" cy="9.821" fill="#C7A7A3" fillOpacity=".9" rx=".39" ry=".197" transform="rotate(-27.914 13.594 9.82)"/>
                <ellipse cx="13.594" cy="9.821" fill="url(#f1470idw)" rx=".39" ry=".197" transform="rotate(-27.914 13.594 9.82)"/>
            </g>
            <path fill="url(#f1470id1n)" d="M20.969 12.174c.066-1.064.13-2.127.185-3.191a1.61 1.61 0 0 1-.185 3.191Z"/>
            <path fill="url(#f1470idx)" d="M20.969 12.174c.066-1.064.13-2.127.185-3.191a1.61 1.61 0 0 1-.185 3.191Z"/>
            <path fill="url(#f1470idy)" d="M20.969 12.174c.066-1.064.13-2.127.185-3.191a1.61 1.61 0 0 1-.185 3.191Z"/>
            <path fill="url(#f1470idz)" d="M20.969 12.174c.066-1.064.13-2.127.185-3.191a1.61 1.61 0 0 1-.185 3.191Z"/>
            <path fill="url(#f1470id1o)" d="M11.003 8.974a1.618 1.618 0 0 0-1.392 1.593c0 .86.673 1.561 1.52 1.607a78.124 78.124 0 0 1-.128-3.2Z"/>
            <path fill="url(#f1470id10)" d="M11.003 8.974a1.618 1.618 0 0 0-1.392 1.593c0 .86.673 1.561 1.52 1.607a78.124 78.124 0 0 1-.128-3.2Z"/>
            <g filter="url(#f1470id28)">
                <path fill="url(#f1470id11)" d="M10.962 9.635a.956.956 0 0 0 .083 1.879a77.671 77.671 0 0 1-.083-1.88Z"/>
            </g>
            <g filter="url(#f1470id29)">
                <path fill="url(#f1470id1p)" d="M21.053 11.53c.038-.635.076-1.269.11-1.904a.956.956 0 0 1-.11 1.904Z"/>
            </g>
            <g filter="url(#f1470id2a)">
                <path stroke="#353535" strokeLinecap="round" strokeWidth=".25" d="M12.674 8.024c.257-.184.897-.509 1.655-.381"/>
            </g>
            <g filter="url(#f1470id2b)">
                <path stroke="#353535" strokeLinecap="round" strokeWidth=".25" d="M19.608 7.978c-.257-.185-.897-.509-1.655-.381"/>
            </g>
            <defs>
                <radialGradient id="f1470id0" cx="0" cy="0" r="1" gradientTransform="matrix(0 -16.4313 6.37009 0 22.995 25.497)" gradientUnits="userSpaceOnUse"><stop offset=".156" stopColor="#7B74A6"/><stop offset="1" stopColor="#5F5490" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470id1" cx="0" cy="0" r="1" gradientTransform="matrix(0 10.1215 -4.59696 0 16 23.07)" gradientUnits="userSpaceOnUse"><stop offset=".397" stopColor="#C6BBD1"/><stop offset="1" stopColor="#A89CB3"/></radialGradient>
                <radialGradient id="f1470id2" cx="0" cy="0" r="1" gradientTransform="matrix(0 -10.3135 1.68433 0 25 30.005)" gradientUnits="userSpaceOnUse"><stop stopColor="#776D9F"/><stop offset="1" stopColor="#6D6193"/></radialGradient>
                <radialGradient id="f1470id3" cx="0" cy="0" r="1" gradientTransform="rotate(126.18 2.701 11.67) scale(2.59394 3.59462)" gradientUnits="userSpaceOnUse"><stop stopColor="#3C2E57"/><stop offset="1" stopColor="#3C2E57" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470id4" cx="0" cy="0" r="1" gradientTransform="matrix(1.09375 -.3125 .15357 .53751 11.395 19.76)" gradientUnits="userSpaceOnUse"><stop offset=".241" stopColor="#4B3B6D"/><stop offset="1" stopColor="#4B3B6D" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470id5" cx="0" cy="0" r="1" gradientTransform="matrix(0 3.75 -4.3769 0 16 18.52)" gradientUnits="userSpaceOnUse"><stop offset=".362" stopColor="#CAC3D3"/><stop offset="1" stopColor="#A093A3"/></radialGradient>
                <radialGradient id="f1470id6" cx="0" cy="0" r="1" gradientTransform="matrix(0 -5.1875 6.81546 0 16 21.016)" gradientUnits="userSpaceOnUse"><stop offset=".533" stopColor="#837A8D" stopOpacity="0"/><stop offset=".876" stopColor="#544A5F"/></radialGradient>
                <radialGradient id="f1470id7" cx="0" cy="0" r="1" gradientTransform="matrix(0 8.8125 -3.45478 0 15.983 21.41)" gradientUnits="userSpaceOnUse"><stop offset=".006" stopColor="#56406D"/><stop offset=".94" stopColor="#3D3247"/></radialGradient>
                <radialGradient id="f1470id8" cx="0" cy="0" r="1" gradientTransform="matrix(-1.42103 -1.24999 2.39752 -2.72558 17.45 17.873)" gradientUnits="userSpaceOnUse"><stop stopColor="#C49391"/><stop offset="1" stopColor="#BC818D"/></radialGradient>
                <radialGradient id="f1470id9" cx="0" cy="0" r="1" gradientTransform="rotate(69.657 1.939 20.835) scale(2.15387 2.55864)" gradientUnits="userSpaceOnUse"><stop offset=".215" stopColor="#313131"/><stop offset="1" stopColor="#1A161E"/></radialGradient>
                <radialGradient id="f1470ida" cx="0" cy="0" r="1" gradientTransform="matrix(1.47646 .46403 -1.43156 4.55498 9.99 12.265)" gradientUnits="userSpaceOnUse"><stop stopColor="#564943"/><stop offset=".746" stopColor="#1E191C"/></radialGradient>
                <radialGradient id="f1470idb" cx="0" cy="0" r="1" gradientTransform="matrix(-5.22784 0 0 -9.248 18.855 10.833)" gradientUnits="userSpaceOnUse"><stop stopColor="#FFDCC0"/><stop offset="1" stopColor="#D6A195"/></radialGradient>
                <radialGradient id="f1470idc" cx="0" cy="0" r="1" gradientTransform="matrix(0 -1.14835 1.42108 0 18.494 9.52)" gradientUnits="userSpaceOnUse"><stop offset=".325" stopColor="#F6B8A8"/><stop offset="1" stopColor="#F6B8A8" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idd" cx="0" cy="0" r="1" gradientTransform="matrix(.00393 -1.09427 1.19083 .00428 13.747 9.567)" gradientUnits="userSpaceOnUse"><stop offset=".378" stopColor="#D39991"/><stop offset="1" stopColor="#D39991" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470ide" cx="0" cy="0" r="1" gradientTransform="matrix(-8.49597 .5363 -1.37 -21.7029 19.48 11.821)" gradientUnits="userSpaceOnUse"><stop offset=".836" stopColor="#E6AD97" stopOpacity="0"/><stop offset="1" stopColor="#E6AD97"/></radialGradient>
                <radialGradient id="f1470idf" cx="0" cy="0" r="1" gradientTransform="matrix(3.0984 -3.27776 1.1999 1.13424 10.58 6.508)" gradientUnits="userSpaceOnUse"><stop offset=".428" stopColor="#9F6D5C"/><stop offset="1" stopColor="#9F6D5C" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idg" cx="0" cy="0" r="1" gradientTransform="matrix(-1.74316 2.88295 -2.3801 -1.43912 18.474 5.854)" gradientUnits="userSpaceOnUse"><stop offset=".078" stopColor="#F6C3B0"/><stop offset="1" stopColor="#F6C3B0" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idh" cx="0" cy="0" r="1" gradientTransform="matrix(0 .2441 -.76718 0 16.513 12.194)" gradientUnits="userSpaceOnUse"><stop stopColor="#FFDDC7"/><stop offset="1" stopColor="#FFDDC7" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idi" cx="0" cy="0" r="1" gradientTransform="matrix(-1.52115 .69743 -1.12083 -2.4446 16.63 11.624)" gradientUnits="userSpaceOnUse"><stop offset=".714" stopColor="#D3968C" stopOpacity="0"/><stop offset="1" stopColor="#D3968C"/></radialGradient>
                <radialGradient id="f1470idj" cx="0" cy="0" r="1" gradientTransform="matrix(0 -.72074 2.8997 0 16.047 14.372)" gradientUnits="userSpaceOnUse"><stop stopColor="#88014E"/><stop offset="1" stopColor="#86004D"/></radialGradient>
                <radialGradient id="f1470idk" cx="0" cy="0" r="1" gradientTransform="matrix(0 -3.50132 8.85443 0 10.817 7.94)" gradientUnits="userSpaceOnUse"><stop offset=".536" stopColor="#3E3433"/><stop offset="1" stopColor="#3E3433" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idl" cx="0" cy="0" r="1" gradientTransform="matrix(.11404 -2.51254 4.45173 .20206 20.908 9.25)" gradientUnits="userSpaceOnUse"><stop stopColor="#4F4D4D"/><stop offset="1" stopColor="#4F4D4D" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idm" cx="0" cy="0" r="1" gradientTransform="rotate(-146.667 10.522 -1.53) scale(2.82328 2.07243)" gradientUnits="userSpaceOnUse"><stop stopColor="#5E5A5B"/><stop offset="1" stopColor="#5E5A5B" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idn" cx="0" cy="0" r="1" gradientTransform="matrix(.90512 1.475 -3.41539 2.09582 15.142 1.382)" gradientUnits="userSpaceOnUse"><stop offset=".287" stopColor="#484646"/><stop offset="1" stopColor="#484646" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470ido" cx="0" cy="0" r="1" gradientTransform="matrix(-2.20112 0 0 -.81692 16.3 3.642)" gradientUnits="userSpaceOnUse"><stop stopColor="#423C3F"/><stop offset="1" stopColor="#423C3F" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idp" cx="0" cy="0" r="1" gradientTransform="matrix(3.21816 -5.09543 5.64521 3.5654 10.616 7.584)" gradientUnits="userSpaceOnUse"><stop offset=".093" stopColor="#0B0306"/><stop offset=".311" stopColor="#1C0C20"/><stop offset="1" stopColor="#1C0C20" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idq" cx="0" cy="0" r="1" gradientTransform="matrix(3.05838 0 0 1.19577 19.461 4.418)" gradientUnits="userSpaceOnUse"><stop stopColor="#4E494B"/><stop offset="1" stopColor="#4E494B" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idr" cx="0" cy="0" r="1" gradientTransform="matrix(2.67872 -2.55217 4.67237 4.90405 18.68 7.456)" gradientUnits="userSpaceOnUse"><stop offset=".857" stopColor="#545051" stopOpacity="0"/><stop offset="1" stopColor="#545051"/></radialGradient>
                <radialGradient id="f1470ids" cx="0" cy="0" r="1" gradientTransform="matrix(3.2482 .37966 -.15896 1.35996 17.795 5.98)" gradientUnits="userSpaceOnUse"><stop stopColor="#200E25"/><stop offset="1" stopColor="#200E25" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idt" cx="0" cy="0" r="1" gradientTransform="matrix(0 .81132 -1.29049 0 18.23 9.917)" gradientUnits="userSpaceOnUse"><stop offset=".802" stopColor="#7D574A"/><stop offset="1" stopColor="#694B43"/><stop offset="1" stopColor="#804D49"/><stop offset="1" stopColor="#664842"/></radialGradient>
                <radialGradient id="f1470idu" cx="0" cy="0" r="1" gradientTransform="matrix(-.23192 -.29886 .41145 -.3193 18 10)" gradientUnits="userSpaceOnUse"><stop offset=".766" stopColor="#FFE6E2" stopOpacity="0"/><stop offset=".966" stopColor="#FFE6E2"/></radialGradient>
                <radialGradient id="f1470idv" cx="0" cy="0" r="1" gradientTransform="matrix(0 .81136 -1.29056 0 13.865 9.917)" gradientUnits="userSpaceOnUse"><stop offset=".802" stopColor="#7D574A"/><stop offset="1" stopColor="#694B43"/><stop offset="1" stopColor="#804D49"/><stop offset="1" stopColor="#664842"/></radialGradient>
                <radialGradient id="f1470idw" cx="0" cy="0" r="1" gradientTransform="matrix(-.00774 -.49408 .59392 -.0093 13.58 10.136)" gradientUnits="userSpaceOnUse"><stop offset=".766" stopColor="#FFE6E2" stopOpacity="0"/><stop offset=".966" stopColor="#FFE6E2"/></radialGradient>
                <radialGradient id="f1470idx" cx="0" cy="0" r="1" gradientTransform="matrix(.62855 2.24327 -2.14025 .59968 20.665 9.93)" gradientUnits="userSpaceOnUse"><stop offset=".856" stopColor="#CE978E" stopOpacity="0"/><stop offset="1" stopColor="#CE978E"/></radialGradient>
                <radialGradient id="f1470idy" cx="0" cy="0" r="1" gradientTransform="matrix(.78778 -1.0811 .90618 .66032 21.025 10.475)" gradientUnits="userSpaceOnUse"><stop offset=".664" stopColor="#F7B99C"/><stop offset="1" stopColor="#F7B99C" stopOpacity="0"/></radialGradient>
                <radialGradient id="f1470idz" cx="0" cy="0" r="1" gradientTransform="matrix(.587 -1.55042 2.07158 .7843 21.14 10.648)" gradientUnits="userSpaceOnUse"><stop offset=".803" stopColor="#EBBB9D" stopOpacity="0"/><stop offset="1" stopColor="#EBBB9D"/></radialGradient>
                <radialGradient id="f1470id10" cx="0" cy="0" r="1" gradientTransform="rotate(-173.034 5.887 4.948) scale(1.62516 1.74453)" gradientUnits="userSpaceOnUse"><stop offset=".775" stopColor="#E8AF99" stopOpacity="0"/><stop offset="1" stopColor="#E8AF99"/></radialGradient>
                <radialGradient id="f1470id11" cx="0" cy="0" r="1" gradientTransform="matrix(-.91648 .15731 -.19303 -1.12456 11.133 10.573)" gradientUnits="userSpaceOnUse"><stop stopColor="#C18472"/><stop offset="1" stopColor="#CA8B7A"/></radialGradient>
                <linearGradient id="f1470id12" x1="16" x2="16" y1="16.316" y2="31.253" gradientUnits="userSpaceOnUse"><stop stopColor="#534973"/><stop offset="1" stopColor="#584982"/></linearGradient>
                <linearGradient id="f1470id13" x1="18.903" x2="17.059" y1="25.316" y2="25.316" gradientUnits="userSpaceOnUse"><stop stopColor="#7A6C85"/><stop offset="1" stopColor="#C7BCD2" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id14" x1="15.591" x2="15.669" y1="17.863" y2="21.753" gradientUnits="userSpaceOnUse"><stop stopColor="#877F93"/><stop offset="1" stopColor="#877F93" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id15" x1="23" x2="23.744" y1="29.491" y2="29.468" gradientUnits="userSpaceOnUse"><stop offset=".276" stopColor="#504176"/><stop offset="1" stopColor="#504176" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id16" x1="11.902" x2="11.902" y1="16.095" y2="29.994" gradientUnits="userSpaceOnUse"><stop stopColor="#544A76"/><stop offset=".524" stopColor="#5F5289"/></linearGradient>
                <linearGradient id="f1470id17" x1="13.671" x2="13.05" y1="22.554" y2="22.554" gradientUnits="userSpaceOnUse"><stop stopColor="#3E305B"/><stop offset="1" stopColor="#553A63" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id18" x1="11.902" x2="12.839" y1="25.971" y2="25.569" gradientUnits="userSpaceOnUse"><stop offset=".196" stopColor="#55477C"/><stop offset="1" stopColor="#594C7D" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id19" x1="15.988" x2="15.988" y1="18.988" y2="20.972" gradientUnits="userSpaceOnUse"><stop offset=".006" stopColor="#4B375E"/><stop offset="1" stopColor="#483B55"/></linearGradient>
                <linearGradient id="f1470id1a" x1="18.71" x2="20.111" y1="21.601" y2="21.601" gradientUnits="userSpaceOnUse"><stop offset=".093" stopColor="#453D68"/><stop offset="1" stopColor="#625A91" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1b" x1="9.452" x2="7.02" y1="24.012" y2="24.012" gradientUnits="userSpaceOnUse"><stop stopColor="#41375C"/><stop offset="1" stopColor="#584A7E" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1c" x1="14.606" x2="14.899" y1="24.875" y2="24.914" gradientUnits="userSpaceOnUse"><stop stopColor="#2B1B3A"/><stop offset="1" stopColor="#2B1B3A" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1d" x1="17.411" x2="17.012" y1="24.691" y2="24.738" gradientUnits="userSpaceOnUse"><stop stopColor="#2B1B3A"/><stop offset="1" stopColor="#2B1B3A" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1e" x1="21.204" x2="16.852" y1="12.518" y2="12.518" gradientUnits="userSpaceOnUse"><stop stopColor="#FFD6BA"/><stop offset="1" stopColor="#FFD6BA" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1f" x1="16.094" x2="16.094" y1="17.222" y2="14.969" gradientUnits="userSpaceOnUse"><stop stopColor="#AE6D91"/><stop offset="1" stopColor="#CF959D" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1g" x1="16.885" x2="16.047" y1="11.508" y2="11.543" gradientUnits="userSpaceOnUse"><stop offset=".36" stopColor="#FFDFC7"/><stop offset="1" stopColor="#FFDFC7" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1h" x1="16.047" x2="16.047" y1="12.647" y2="12.182" gradientUnits="userSpaceOnUse"><stop stopColor="#D89793"/><stop offset="1" stopColor="#D89793" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1i" x1="16.047" x2="16.047" y1="9.813" y2="10.489" gradientUnits="userSpaceOnUse"><stop stopColor="#E8BBA8"/><stop offset="1" stopColor="#E8BBA8" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1j" x1="14.845" x2="15.164" y1="14.218" y2="13.383" gradientUnits="userSpaceOnUse"><stop stopColor="#E1ACA6"/><stop offset="1" stopColor="#E1ACA6" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1k" x1="22.899" x2="11.287" y1="5.17" y2="5.17" gradientUnits="userSpaceOnUse"><stop stopColor="#443D40"/><stop offset="1" stopColor="#272127"/></linearGradient>
                <linearGradient id="f1470id1l" x1="19.007" x2="18.693" y1="9.971" y2="10.164" gradientUnits="userSpaceOnUse"><stop stopColor="#B4948D"/><stop offset="1" stopColor="#B4948D" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1m" x1="14.609" x2="14.295" y1="9.971" y2="10.164" gradientUnits="userSpaceOnUse"><stop stopColor="#B4948D"/><stop offset="1" stopColor="#B4948D" stopOpacity="0"/></linearGradient>
                <linearGradient id="f1470id1n" x1="22.483" x2="21.277" y1="9.998" y2="12.174" gradientUnits="userSpaceOnUse"><stop stopColor="#FFD6BD"/><stop offset="1" stopColor="#F0B8A6"/></linearGradient>
                <linearGradient id="f1470id1o" x1="10.197" x2="11.655" y1="10.701" y2="10.574" gradientUnits="userSpaceOnUse"><stop stopColor="#D19787"/><stop offset="1" stopColor="#C9887D"/></linearGradient>
                <linearGradient id="f1470id1p" x1="21.526" x2="21.526" y1="9.626" y2="11.53" gradientUnits="userSpaceOnUse"><stop stopColor="#F9BB9E"/><stop offset="1" stopColor="#F6BBA0"/></linearGradient>
                <filter id="f1470id1q" width="6.556" height="14.595" x="9.212" y="15.852" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".5"/></filter>
                <filter id="f1470id1r" width="3.95" height="13.362" x="17.96" y="16.329" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".375"/></filter>
                <filter id="f1470id1s" width="2.897" height="14" x="10.503" y="16.095" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dx=".1" dy=".1"/><feGaussianBlur stdDeviation=".1"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.403922 0 0 0 0 0.368627 0 0 0 0 0.494118 0 0 0 1 0"/><feBlend in2="shape" result="effect1_innerShadow_4002_2105"/></filter>
                <filter id="f1470id1t" width="2.734" height="2.883" x="14.624" y="18.232" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dx=".1" dy="-.1"/><feGaussianBlur stdDeviation=".25"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.156863 0 0 0 0 0.0980392 0 0 0 0 0.215686 0 0 0 1 0"/><feBlend in2="shape" result="effect1_innerShadow_4002_2105"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dx="-.1" dy="-.1"/><feGaussianBlur stdDeviation=".25"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.156863 0 0 0 0 0.0980392 0 0 0 0 0.215686 0 0 0 1 0"/><feBlend in2="effect1_innerShadow_4002_2105" result="effect2_innerShadow_4002_2105"/></filter>
                <filter id="f1470id1u" width="2.902" height="14.05" x="18.61" y="16.044" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dx="-.1" dy=".1"/><feGaussianBlur stdDeviation=".1"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.439216 0 0 0 0 0.415686 0 0 0 0 0.584314 0 0 0 1 0"/><feBlend in2="shape" result="effect1_innerShadow_4002_2105"/></filter>
                <filter id="f1470id1v" width="11.22" height="12.542" x="10.984" y="4.662" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dx="1"/><feGaussianBlur stdDeviation=".7"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.913725 0 0 0 0 0.686275 0 0 0 0 0.592157 0 0 0 1 0"/><feBlend in2="shape" result="effect1_innerShadow_4002_2105"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dy=".2"/><feGaussianBlur stdDeviation=".375"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.780392 0 0 0 0 0.568627 0 0 0 0 0.486275 0 0 0 1 0"/><feBlend in2="effect1_innerShadow_4002_2105" result="effect2_innerShadow_4002_2105"/></filter>
                <filter id="f1470id1w" width="3.747" height="4.9" x="14.032" y="9.004" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".5"/></filter>
                <filter id="f1470id1x" width="2.277" height="3.3" x="14.908" y="9.613" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".1"/></filter>
                <filter id="f1470id1y" width="3.718" height="1.573" x="14.188" y="13.133" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".05"/></filter>
                <filter id="f1470id1z" width="12.873" height="8.357" x="9.611" y="1.486" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dy="-.5"/><feGaussianBlur stdDeviation=".625"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.137255 0 0 0 0 0.0901961 0 0 0 0 0.145098 0 0 0 1 0"/><feBlend in2="shape" result="effect1_innerShadow_4002_2105"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dy="-.2"/><feGaussianBlur stdDeviation=".2"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.0784314 0 0 0 0 0.0352941 0 0 0 0 0.0470588 0 0 0 1 0"/><feBlend in2="effect1_innerShadow_4002_2105" result="effect2_innerShadow_4002_2105"/></filter>
                <filter id="f1470id20" width="2.339" height="1.19" x="17.636" y="7.149" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dx=".1" dy="-.2"/><feGaussianBlur stdDeviation=".125"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.0588235 0 0 0 0 0.054902 0 0 0 0 0.0588235 0 0 0 1 0"/><feBlend in2="shape" result="effect1_innerShadow_4002_2105"/></filter>
                <filter id="f1470id21" width="2.339" height="1.176" x="12.38" y="7.164" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dx=".1" dy="-.2"/><feGaussianBlur stdDeviation=".125"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.0588235 0 0 0 0 0.054902 0 0 0 0 0.0588235 0 0 0 1 0"/><feBlend in2="shape" result="effect1_innerShadow_4002_2105"/></filter>
                <filter id="f1470id22" width="6.734" height="5.992" x="9.966" y="2.575" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/><feOffset dx=".4" dy=".2"/><feGaussianBlur stdDeviation=".2"/><feComposite in2="hardAlpha" k2="-1" k3="1" operator="arithmetic"/><feColorMatrix values="0 0 0 0 0.286275 0 0 0 0 0.243137 0 0 0 0 0.227451 0 0 0 1 0"/><feBlend in2="shape" result="effect1_innerShadow_4002_2105"/><feGaussianBlur result="effect2_foregroundBlur_4002_2105" stdDeviation=".125"/></filter>
                <filter id="f1470id23" width="6.361" height="5.736" x="15.888" y="2.998" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".125"/></filter>
                <filter id="f1470id24" width=".787" height=".696" x="17.495" y="9.477" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".05"/></filter>
                <filter id="f1470id25" width=".891" height=".913" x="18.335" y="9.552" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".1"/></filter>
                <filter id="f1470id26" width=".986" height="1.04" x="13.892" y="9.488" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".1"/></filter>
                <filter id="f1470id27" width=".913" height=".705" x="13.137" y="9.469" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".05"/></filter>
                <filter id="f1470id28" width="1.329" height="2.379" x="9.966" y="9.385" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".125"/></filter>
                <filter id="f1470id29" width="1.947" height="2.903" x="20.553" y="9.126" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".25"/></filter>
                <filter id="f1470id2a" width="2.405" height="1.16" x="12.299" y="7.239" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".125"/></filter>
                <filter id="f1470id2b" width="2.405" height="1.16" x="17.578" y="7.193" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse"><feFlood floodOpacity="0" result="BackgroundImageFix"/><feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape"/><feGaussianBlur result="effect1_foregroundBlur_4002_2105" stdDeviation=".125"/></filter>
            </defs>
        </g>
    </svg>
);
