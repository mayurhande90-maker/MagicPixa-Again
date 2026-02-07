import React from 'react';
import { IconProps, BaseIcon } from './types';

// Custom Photo Studio Icon (Camera with Layers)
export const PhotoStudioIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <g fill="none">
            <path fill="url(#fluentColorCamera240)" d="M2 8.25A3.25 3.25 0 0 1 5.25 5H7l1.332-1.998A2.25 2.25 0 0 1 10.204 2h3.592a2.25 2.25 0 0 1 1.872 1.002L17 5h1.75A3.25 3.25 0 0 1 18.75 21H5.25A3.25 3.25 0 0 1 2 17.75z"/>
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

// Cube Icon
export const CubeIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />} />
);

// CampaignStudioIcon with high-fidelity provided SVG
export const CampaignStudioIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 16 16" xmlns="http://www.w3.org/2000/svg">
        <g fill="none">
            <path fill="url(#fluentColorCalendar160)" d="M14 11.5v-6l-6-1l-6 1v6A2.5 2.5 0 0 0 4.5 14h7a2.5 2.5 0 0 0 2.5-2.5"/>
            <path fill="url(#fluentColorCalendar161)" d="M14 11.5v-6l-6-1l-6 1v6A2.5 2.5 0 0 0 4.5 14h7a2.5 2.5 0 0 0 2.5-2.5"/>
            <g filter="url(#fluentColorCalendar164)">
                <path fill="url(#fluentColorCalendar162)" d="M5.248 8.997a.748.748 0 1 0 0-1.497a.748.748 0 0 0 0 1.497m.749 1.752a.748.748 0 1 1-1.497 0a.748.748 0 0 1 1.497 0M8 8.997A.748.748 0 1 0 8 7.5a.748.748 0 0 0 0 1.497m.749 1.752a.748.748 0 1 1-1.497 0a.748.748 0 0 1 1.497 0m2-1.752a.748.748 0 1 0 0-1.497a.748.748 0 0 0 0 1.497"/>
            </g>
            <path fill="url(#fluentColorCalendar163)" d="M14 4.5A2.5 2.5 0 0 0 11.5 2h-7A2.5 2.5 0 0 0 2 4.5V6h12z"/>
            <defs>
                <linearGradient id="fluentColorCalendar160" x1="10.167" x2="6.667" y1="15.167" y2="5" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#B3E0FF"/><stop offset="1" stopColor="#B3E0FF"/>
                </linearGradient>
                <linearGradient id="fluentColorCalendar161" x1="9.286" x2="11.025" y1="8.386" y2="16.154" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#DCF8FF" stopOpacity="0"/><stop offset="1" stopColor="#FF6CE8" stopOpacity=".7"/>
                </linearGradient>
                <linearGradient id="fluentColorCalendar162" x1="7.362" x2="8.566" y1="7.039" y2="15.043" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0078D4"/><stop offset="1" stopColor="#0067BF"/>
                </linearGradient>
                <linearGradient id="fluentColorCalendar163" x1="2" x2="12.552" y1="2" y2="-.839" gradientUnits="userSpaceOnUse">
                    <stop stopColor="#0094F0"/><stop offset="1" stopColor="#2764E7"/>
                </linearGradient>
                <filter id="fluentColorCalendar164" width="9.664" height="6.664" x="3.167" y="6.833" colorInterpolationFilters="sRGB" filterUnits="userSpaceOnUse">
                    <feFlood floodOpacity="0" result="BackgroundImageFix"/>
                    <feColorMatrix in="SourceAlpha" result="hardAlpha" values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"/>
                    <feOffset dy=".667"/>
                    <feGaussianBlur stdDeviation=".667"/>
                    <feColorMatrix values="0 0 0 0 0.1242 0 0 0 0 0.323337 0 0 0 0 0.7958 0 0 0 0.32 0"/>
                    <feBlend in2="BackgroundImageFix" result="effect1_dropShadow_378174_9782"/>
                    <feBlend in="SourceGraphic" in2="effect1_dropShadow_378174_9782" result="shape"/>
                </filter>
            </defs>
        </g>
    </svg>
);
