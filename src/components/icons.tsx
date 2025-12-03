import React from 'react';

// Common SVG Props interface
interface IconProps {
    className?: string;
}

const BaseIcon: React.FC<IconProps & { path: React.ReactNode }> = ({ className, path }) => (
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

// --- HEROICONS (v2 Outline) & Custom SVGs ---

export const UploadIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />} />
);

export const UploadTrayIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M12 3a1 1 0 0 1 .78.375l4 5a1 1 0 1 1-1.56 1.25L13 6.85V14a1 1 0 1 1-2 0V6.85L8.78 9.626a1 1 0 1 1-1.56-1.25l4-5A1 1 0 0 1 12 3ZM9 14v-1H5a2 2 0 0 0-2 2v4a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-4a2 2 0 0 0-2-2h-4v1a3 3 0 1 1-6 0Zm8 2a1 1 0 1 0 0 2h.01a1 1 0 1 0 0-2H17Z" clipRule="evenodd"/>
    </svg>
);

export const SparklesIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.25 21.75l-.648-1.178a2.625 2.625 0 00-1.84-1.84L12.5 18l1.178-.648a2.625 2.625 0 001.84-1.84L16.25 14.25l.648 1.178a2.625 2.625 0 001.84 1.84L20 18l-1.178.648a2.625 2.625 0 00-1.84 1.84z" />} />
);

export const ImageIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm1.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />} />
);

export const DownloadIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />} />
);

export const RetryIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0011.664 0l3.181-3.183m-4.991-2.696a8.25 8.25 0 00-11.664 0l-3.181 3.183" />} />
);

export const RegenerateIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24">
      <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.651 7.65a7.131 7.131 0 0 0-12.68 3.15M18.001 4v4h-4m-7.652 8.35a7.13 7.13 0 0 0 12.68-3.15M6 20v-4h4"/>
    </svg>
);

export const ArrowUpCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const UserIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />} />
);

export const ArrowRightIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />} />
);

export const CheckIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />} />
);

// Filled Icon (Use fill="currentColor")
export const StarIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
    </svg>
);

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />} />
);

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
            <path stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="m12.002 8.498l-5.81-2.42m2.803-1.366L15.19 7.17M12 19v4m-5.5 0h11M1 2a1 1 0 0 1 1-1h20a1 1 0 0 1 1 1v16a1 1 0 0 1-1-1z"/>
            <path stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M18 6.668v6.16a1.02 1.02 0 0 1-.62.93l-5 2.08a1 1 0 0 1-.38.07V8.5l5.81-2.42c.123.171.19.377.19.588"/>
            <path stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M17.813 6.078L12 8.5v7.41a1.1 1.1 0 0 1-.39-.07l-5-2.12A.99.99 0 0 1 6 12.8V6.668a.99.99 0 0 1 .61-.92l5-2.09c.246-.1.522-.1.77 0l5 2.09c.17.069.32.183.431.33"/>
        </g>
    </svg>
);

// Custom Apparel Icon
export const ApparelIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" d="M5.833 5a5 5 0 0 1 3-1h6.334a5 5 0 0 1 3 1L21.1 7.2a1 1 0 0 1 .268 1.296l-2 3.5a1 1 0 0 1-1.382.361l-.986-.59V19a1 1 0 0 1-1 1H8a1 1 0 0 1-1-1v-7.234l-.985.591a1 1 0 0 1-1.383-.36l-2-3.5A1 1 0 0 1 2.9 7.2L5.833 5ZM14 5h-4c0 .425.223.933.645 1.355.422.423.93.645 1.355.645.425 0 .933-.222 1.355-.645.423-.422.645-.93.645-1.355Z" clipRule="evenodd"/>
    </svg>
);

export const UsersIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />} />
);

export const PaletteIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128z M14.47 16.122a3 3 0 015.78 1.128 2.25 2.25 0 002.4 2.245 4.5 4.5 0 01-8.4-2.245c0-.399.078-.78.22-1.128m0 0l-1.47-2.205m-1.47 2.205a2.25 2.25 0 01-1.928 1.056 2.25 2.25 0 01-2.4-2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128m0 0l-1.47-2.205m1.47 2.205a2.25 2.25 0 001.928 1.056 2.25 2.25 0 002.4-2.245 4.5 4.5 0 01-8.4-2.245c0-.399.078-.78.22-1.128m0 0l-1.47-2.205" />} />
);

export const CaptionIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
        <path fillRule="evenodd" d="M3 6a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-6.616l-2.88 2.592C8.537 20.461 7 19.776 7 18.477V17H5a2 2 0 0 1-2-2V6Zm4 2a1 1 0 0 0 0 2h5a1 1 0 1 0 0-2H7Zm8 0a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2h-2Zm-8 3a1 1 0 1 0 0 2h2a1 1 0 1 0 0-2H7Zm5 0a1 1 0 1 0 0 2h5a1 1 0 1 0 0-2h-5Z" clipRule="evenodd"/>
    </svg>
);

export const HomeIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.012 10.981 3 11h2v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9h2a1 1 0 0 0 .555-1.832l-9-6a1 1 0 0 0-1.11 0l-9 6a1 1 0 0 0-.277 1.387.98.98 0 0 0 .844.426zM10 14a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5h-4z"/>
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

export const ScannerIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.5A2.25 2.25 0 016 2.25h12A2.25 2.25 0 0120.25 4.5v15A2.25 2.25 0 0118 21.75H6A2.25 2.25 0 013.75 19.5v-15zM12 18.75a.375.375 0 100-.75.375.375 0 000 .75z" />} />
);

export const NotesIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />} />
);

// Custom Landscape Picture Icon
export const ProjectsIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m3 16 5-7 6 6.5m6.5 2.5L16 13l-4.286 6M14 10h.01M4 19h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
    </svg>
);

export const DashboardIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />} />
);

// Custom Grid Icon
export const LayoutGridIcon: React.FC<IconProps> = ({ className }) => (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      width="24"
      height="24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <rect x="3" y="3" width="7" height="7" rx="1" />
      <rect x="14" y="3" width="7" height="7" rx="1" />
      <rect x="3" y="14" width="7" height="7" rx="1" />
      <rect x="14" y="14" width="7" height="7" rx="1" />
    </svg>
);

// Renamed from ProductStudioIcon
export const BrandKitIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M3 11.25h18M3 11.25l2.25-6h13.5l2.25 6m-18 0h18m-9-3v12m-6-9h12" />} />
);

// Kept for backward compatibility if needed, but now aliased
export const ProductStudioIcon = BrandKitIcon;

export const LightbulbIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311a14.994 14.994 0 01-4.5 0M9 10.5a3 3 0 116 0 3 3 0 01-6 0zm3.75 4.875c0-1.036.095-2.07.27-3.075M9.25 10.5c.175 1.005.27 2.04.27 3.075M12 3v1.5m0 15V21" />} />
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

export const PencilIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />} />
);

export const CreditCardIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />} />
);

export const MicrophoneIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m12-9l-2.639 2.639a.5.5 0 01-.707 0l-2.64-2.64a.5.5 0 010-.707l2.64-2.64a.5.5 0 01.707 0L15 3.75M12 18.75v-1.5m0-15V5.25" />} />
);

export const StopIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />} />
);

export const XIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />} />
);

export const GarmentTopIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.375A2.25 2.25 0 1112.75 6v.375m-3.75 0V3.75m0 3.75h3.75m-3.75 0V3.75m0 3.75H4.5m3.75 0v6.375c0 .621-.504 1.125-1.125 1.125H4.5" />} />
);

export const GarmentTrousersIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zM14.47 16.122a3 3 0 015.78 1.128 2.25 2.25 0 002.4 2.245 4.5 4.5 0 01-8.4-2.245c0-.399.078-.78.22-1.128zM9.53 16.122l1.47-2.205m-1.47 2.205a2.25 2.25 0 01-1.928 1.056 2.25 2.25 0 01-2.4-2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128m0 0l-1.47-2.205m1.47 2.205a2.25 2.25 0 001.928 1.056 2.25 2.25 0 002.4-2.245 4.5 4.5 0 01-8.4-2.245c0-.399.078-.78.22-1.128m0 0l-1.47-2.205" />} />
);

export const AdjustmentsVerticalIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h3m-3 6h3m-3 6h3M6 6v12M18 6v12" />} />
);

export const ChevronUpIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />} />
);

export const LogoutIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />} />
);

export const PlusIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />} />
);

export const CopyIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m9.75 11.625v-4.875a3.375 3.375 0 00-3.375-3.375H9.375a3.375 3.375 0 00-3.375 3.375v4.875" />} />
);

export const InformationCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const TicketIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h3m-3 0h-1.5m3 0h-1.5m-6 0h1.5m5.25 0h3m-3 0h-1.5m3 0h-1.5m-3 0h1.5m-6 0h1.5m7.5-12l-.75.638m0 0l-1.5-1.275m1.5 1.275L12 3m0 0l-1.5 1.275M12 3l.75.638M12 3l-.75.638m1.5-1.275L12 3m0 0l1.5 1.275M12 3l-.75.638m-3 6.38l.75.638m0 0l1.5-1.275m-1.5 1.275L9 9.38m0 0l1.5 1.275m-1.5-1.275L9 9.38m0 0l-.75.638m3-6.38l-.75.638m0 0l-1.5-1.275m1.5 1.275L12 3m0 0l-1.5 1.275M12 3l.75.638m-3 6.38l.75.638" />} />
);

export const ChevronRightIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />} />
);

export const HelpIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const MinimalistIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />} />
);

export const LeafIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128z" />} />
);

export const CubeIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />} />
);

export const DiamondIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6l-3.75 3.75-3.75-3.75M14.25 6L21 12.75l-3.75 3.75M14.25 6L7.5 12.75l3.75 3.75M3 12.75l3.75-3.75L10.5 12l-3.75 3.75-3.75-3.75z" />} />
);

export const SunIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />} />
);

export const PlusCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const CompareIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />} />
);

export const ChevronLeftRightIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />} />
);

export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.286zm0 13.036h.008v.008h-.008v-.008z" />} />
);

export const DocumentTextIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />} />
);

export const FlagIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />} />
);

export const ZoomInIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />} />
);

export const ZoomOutIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM13.5 10.5h-6" />} />
);

export const HandRaisedIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575V12a1.5 1.5 0 003 0v-4.171a.625.625 0 011.25 0V16.5h.375m-5.75 4.5h10.5a2.25 2.25 0 002.25-2.25V16.5a9 9 0 00-9-9" />} />
);

export const FilmIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6 20.25h12m-7.5-3.75v3.75m-3.75 0V15m12 1.5V15M5.25 4.5h13.5A2.25 2.25 0 0121 6.75v8.5A2.25 2.25 0 0118.75 17.25H5.25A2.25 2.25 0 013 15.25v-8.5A2.25 2.25 0 015.25 4.5z" />} />
);

export const VideoCameraIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 10.5l4.72-4.72a.75.75 0 011.28.53v11.38a.75.75 0 01-1.28.53l-4.72-4.72M4.5 18.75h9a2.25 2.25 0 002.25-2.25v-9A2.25 2.25 0 0013.5 5.25h-9A2.25 2.25 0 002.25 7.5v9A2.25 2.25 0 004.5 18.75z" />} />
);

export const ColorSwatchIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6.75a5.25 5.25 0 015.25 5.25c0 1.942-1.076 3.65-2.697 4.545l-.427.245-.582.333a1.492 1.492 0 00-.582.333l-.427.245A5.25 5.25 0 0112 18.75a5.25 5.25 0 01-5.25-5.25c0-1.942 1.076-3.65 2.697-4.545l.427-.245.582-.333a1.492 1.492 0 00.582-.333l.427-.245A5.25 5.25 0 0112 6.75z" />} />
);

export const TrashIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.134-2.09-2.134H8.09a2.09 2.09 0 00-2.09 2.134v.916m7.5 0a48.667 48.667 0 00-7.5 0" />} />
);

export const AudioWaveIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3 3h18v18H3V3z" />} />
);

export const MenuIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />} />
);

export const ArrowLeftIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />} />
);

export const MoonIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25c0 5.385 4.365 9.75 9.75 9.75 2.833 0 5.398-1.21 7.252-3.248z" />} />
);

export const SystemIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0115 18.257V17.25m-6 0V15M9 6.75v1.007a3 3 0 00.879 2.122l1.621.621h3.002l1.621-.621a3 3 0 00.879-2.122V6.75m-6 0V5.25m6 0v1.5m-6 0h6" />} />
);

export const GoogleIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.641-3.657-11.303-8.625l-6.571 4.819C9.656 39.663 16.318 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C41.099 34.631 44 29.692 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>
);

export const CurrencyDollarIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const ChartBarIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />} />
);

export const CogIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5m-15 0a7.5 7.5 0 1115 0m-15 0H3m18 0h-1.5" />} />
);

export const EyeIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<><path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" /><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" /></>} />
);

// Custom Thumbnail Studio Icon (Gallery/Grid)
export const ThumbnailIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 128 128">
        <path fill="#F77E00" d="M116.46 3.96h-104c-4.42 0-8 3.58-8 8v104c0 4.42 3.58 8 8 8h104c4.42 0 8-3.58 8-8v-104c0-4.42-3.58-8-8-8z"/>
        <path fill="#FF9800" d="M110.16 3.96h-98.2a7.555 7.555 0 0 0-7.5 7.5v97.9c-.01 4.14 3.34 7.49 7.48 7.5h98.12c4.14.01 7.49-3.34 7.5-7.48V11.46c.09-4.05-3.13-7.41-7.18-7.5h-.22z"/>
        <path fill="#FFBD52" d="M40.16 12.86c0-2.3-1.6-3-10.8-2.7c-7.7.3-11.5 1.2-13.8 4s-2.9 8.5-3 15.3c0 4.8 0 9.3 2.5 9.3c3.4 0 3.4-7.9 6.2-12.3c5.4-8.7 18.9-10.6 18.9-13.6z" opacity=".75"/>
        <path fill="#FAFAFA" d="M43.7 62.21v-25.7a2.258 2.258 0 0 1 3.4-2l43.5 25.7c1.13.72 1.47 2.22.75 3.35c-.19.3-.45.55-.75.75l-43.5 25.6c-1.08.63-2.46.27-3.09-.81c-.21-.36-.32-.77-.31-1.19v-25.7z"/>
    </svg>
);

export const GiftIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M3 11.25h18M3 11.25l2.25-6h13.5l2.25 6m-18 0h18m-9-3v12m-6-9h12" />} />
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
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813a3.75 3.75 0 002.576-2.576L8.279 5.044A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 01-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
    </svg>
);

export const MagicWandIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.25 21.75l-.648-1.178a2.625 2.625 0 00-1.84-1.84L12.5 18l1.178-.648a2.625 2.625 0 001.84-1.84L16.25 14.25l.648 1.178a2.625 2.625 0 001.84 1.84L20 18l-1.178.648a2.625 2.625 0 00-1.84 1.84z" />} />
);

export const UndoIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />} />
);

// Custom Credit Coin Icon (Filled, Gold)
export const CreditCoinIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
      <circle cx="12" cy="12" r="10" className="text-yellow-400" fill="currentColor" />
      <circle cx="12" cy="12" r="8" className="text-yellow-500" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <path d="M11.5 8.5C10.5 8.5 9.5 9.5 9.5 12C9.5 14.5 10.5 15.5 11.5 15.5" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 8.5C14.5 8.5 15 9.5 15 9.5" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
      <path d="M13 15.5C14.5 15.5 15 14.5 15 14.5" fill="none" stroke="#B45309" strokeWidth="2" strokeLinecap="round" />
    </svg>
);

// Custom MagicPixa Logo
export const MagicPixaLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`flex items-center ${className}`}>
        <span className="text-2xl font-bold">
            <span className="!text-black dark:text-gray-200">Magic</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Pixa</span>
        </span>
    </div>
);

// New Filter Icon
export const FilterIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />} />
);

// New Calendar Icon
export const CalendarIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />} />
);