
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
            <path stroke="#191919" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="m12.002 8.498l-5.81-2.42m2.803-1.366L15.19 7.17M12 19v4m-5.5 0h11M1 2a1 1 0 0 1 1-1h20a1 1 0 0 1 1 1v16a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1z"/>
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

export const HomeIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.012 10.981 3 11h2v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9h2a1 1 0 0 0 .555-1.832l-9-6a1 1 0 0 0-1.11 0l-9 6a1 1 0 0 0-.277 1.387.98.98 0 0 0 .844.426zM10 14a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5h-4z"/>
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
      <rect x="3" y="3" width="7" height="7" />
      <rect x="14" y="3" width="7" height="7" />
      <rect x="14" y="14" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" />
    </svg>
);

export const MagicAdsIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.25 21.75l-.648-1.178a2.625 2.625 0 00-1.84-1.84L12.5 18l1.178-.648a2.625 2.625 0 001.84-1.84L16.25 14.25l.648 1.178a2.625 2.625 0 001.84 1.84L20 18l-1.178.648a2.625 2.625 0 00-1.84 1.84z" />
    </svg>
);

export const PixaTogetherIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
    </svg>
);

// All other icons below are assumed available as per user's prompt listing existing files
export const ShieldCheckIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 01-1.043 3.296 3.745 3.745 0 01-3.296 1.043A3.745 3.745 0 0112 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 01-3.296-1.043 3.745 3.745 0 01-1.043-3.296A3.745 3.745 0 013 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 011.043-3.296 3.746 3.746 0 013.296-1.043A3.746 3.746 0 0112 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 013.296 1.043 3.746 3.746 0 011.043 3.296A3.745 3.745 0 0121 12z" />} />
);

export const MagicPixaLogo: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`flex items-center gap-2 font-bold text-2xl tracking-tight text-[#1A1A1E] ${className}`}>
        <div className="relative w-8 h-8 flex items-center justify-center bg-gradient-to-br from-[#4D7CFF] to-[#0055D4] rounded-lg shadow-lg shadow-blue-500/20 text-white">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M9.315 7.584C12.195 3.883 16.695 1.5 21.75 1.5a.75.75 0 01.75.75c0 5.056-2.383 9.555-6.084 12.436A6.753 6.753 0 0121.75 21.75a.75.75 0 01-.75.75c-5.056 0-9.555-2.383-12.436-6.084C4.722 19.383 2.25 14.883 2.25 9.75a.75.75 0 01.75-.75c5.056 0 9.555 2.383 6.315-1.416zM12 9.75a3 3 0 100 6 3 3 0 000-6z" clipRule="evenodd" />
            </svg>
        </div>
        <span>MagicPixa</span>
    </div>
);

export const EyeIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />} />
);

export const InformationCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />} />
);

export const XIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />} />
);

export const MenuIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />} />
);

export const ArrowLeftIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />} />
);

export const SunIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />} />
);

export const MoonIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />} />
);

export const SystemIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />} />
);

export const GoogleIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
        <path fill="#FFC107" d="M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z" />
        <path fill="#FF3D00" d="M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z" />
        <path fill="#4CAF50" d="M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.202,0-9.619-3.317-11.283-7.946l-6.522,5.025C9.505,39.556,16.227,44,24,44z" />
        <path fill="#1976D2" d="M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571c0.001-0.001,0.002-0.001,0.003-0.002l6.19,5.238C36.971,39.205,44,34,44,24C44,22.659,43.862,21.35,43.611,20.083z" />
    </svg>
);

export const LogoutIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />} />
);

export const CreditCardIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 21z" />} />
);

export const BadgeNoviceIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
);

export const BadgeCopperIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
    </svg>
);

export const BadgeSilverIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
        <path d="M12 17.77L6.5 20.5L8 14.5L3.5 10.5L9.5 9.5L12 4L14.5 9.5L20.5 10.5L16 14.5L17.5 20.5L12 17.77Z" fill="white" fillOpacity="0.3"/>
    </svg>
);

export const BadgeGoldIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg">
        <defs>
            <linearGradient id="goldGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#FCD34D" />
                <stop offset="50%" stopColor="#F59E0B" />
                <stop offset="100%" stopColor="#D97706" />
            </linearGradient>
        </defs>
        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" fill="url(#goldGradient)" />
        <path d="M12 17.77L6.5 20.5L8 14.5L3.5 10.5L9.5 9.5L12 4L14.5 9.5L20.5 10.5L16 14.5L17.5 20.5L12 17.77Z" fill="white" fillOpacity="0.4"/>
    </svg>
);

export const CogIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />} />
);

export const ChartBarIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />} />
);

export const PlusIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />} />
);

export const PlusCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const TrashIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />} />
);

export const FlagIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3 3v1.5M3 21v-6m0 0l2.77-.693a9 9 0 016.208.682l.108.054a9 9 0 006.086.71l3.114-.732a48.524 48.524 0 01-.005-10.499l-3.11.732a9 9 0 01-6.085-.711l-.108-.054a9 9 0 00-6.208-.682L3 4.5M3 15V4.5" />} />
);

export const AudioWaveIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />} />
);

export const FilterIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.417 5.416a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />} />
);

export const CalendarIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />} />
);

export const GiftIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 11.25v8.25a1.5 1.5 0 01-1.5 1.5H4.5a1.5 1.5 0 01-1.5-1.5v-8.25M12 4.875A2.625 2.625 0 109.375 7.5H12m0-2.625V7.5m0-2.625A2.625 2.625 0 1114.625 7.5H12m0 0V21m-8.625-9.75h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z" />} />
);

export const CopyIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 17.25v3.375c0 .621-.504 1.125-1.125 1.125h-9.75a1.125 1.125 0 01-1.125-1.125V7.875c0-.621.504-1.125 1.125-1.125H6.75a9.06 9.06 0 011.5.124m7.5 10.376h3.375c.621 0 1.125-.504 1.125-1.125V11.25c0-4.46-3.243-8.161-7.5-8.876a9.06 9.06 0 00-1.5-.124H9.375c-.621 0-1.125.504-1.125 1.125v3.5m7.5 10.375H9.375a1.125 1.125 0 01-1.125-1.125v-9.25m12 6.625v-1.875a3.375 3.375 0 00-3.375-3.375h-1.5a1.125 1.125 0 01-1.125-1.125v-1.5a3.375 3.375 0 00-3.375-3.375H9.75" />} />
);

export const AdjustmentsVerticalIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m12-3V3.75m0 9.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 3.75V16.5m-6-9V3.75m0 3.75a1.5 1.5 0 010 3m0-3a1.5 1.5 0 000 3m0 9.75V10.5" />} />
);

export const BrandKitIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 21v-8.25M15.75 21v-8.25M8.25 21v-8.25M3 9l9-6 9 6m-1.5 12V10.332A48.36 48.36 0 0012 9.75c-2.551 0-5.056.2-7.5.582V21M3 21h18M12 6.75h.008v.008H12V6.75z" />} />
);

export const LightbulbIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-4.5 4.5 4.5 0 00-9 0 6.01 6.01 0 001.5 4.5m0 0a4.5 4.5 0 109 0zM3.751 20.105a8.25 8.25 0 0116.498 0 .75.75 0 01-.437.695A18.683 18.683 0 0112 22.5c-2.786 0-5.433-.608-7.812-1.7a.75.75 0 01-.437-.695z" />} />
);

export const ThumbnailIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.348a1.125 1.125 0 010 1.971l-11.54 6.347a1.125 1.125 0 01-1.667-.985V5.653z" />} />
);

export const MagicWandIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.25 21.75l-.648-1.178a2.625 2.625 0 00-1.84-1.84L12.5 18l1.178-.648a2.625 2.625 0 001.84-1.84L16.25 14.25l.648 1.178a2.625 2.625 0 001.84 1.84L20 18l-1.178.648a2.625 2.625 0 00-1.84 1.84z" />} />
);

export const CubeIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />} />
);

export const PencilIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />} />
);

export const UndoIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 15L3 9m0 0l6-6M3 9h12a6 6 0 010 12h-3" />} />
);

export const ZoomInIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM10.5 7.5v6m3-3h-6" />} />
);

export const ZoomOutIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607zM7.5 10.5h6" />} />
);

export const ChevronLeftRightIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />} />
);

export const ChevronRightIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />} />
);

export const ChevronUpIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />} />
);

// Ticket Icon for Billing
export const TicketIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h5.25M7.5 15h3M3.375 5.25c-.621 0-1.125.504-1.125 1.125v3.026a2.999 2.999 0 010 5.198v3.026c0 .621.504 1.125 1.125 1.125h17.25c.621 0 1.125-.504 1.125-1.125v-3.026a2.999 2.999 0 010-5.198V6.375c0-.621-.504-1.125-1.125-1.125H3.375z" />} />
);
