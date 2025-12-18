import React from 'react';
import { IconProps, BaseIcon } from './types';

export const ChevronDownIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />} />
);

export const ChevronUpIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 15.75l7.5-7.5 7.5 7.5" />} />
);

export const ChevronRightIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />} />
);

export const ChevronLeftIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />} />
);

export const ChevronLeftRightIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 15L12 18.75 15.75 15m-7.5-6L12 5.25 15.75 9" />} />
);

export const ArrowLeftIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5L3 12m0 0l7.5-7.5M3 12h18" />} />
);

export const ArrowRightIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />} />
);

export const ArrowUpIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 10.5L12 3m0 0l7.5 7.5M12 3v18" />} />
);

export const ArrowDownIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 13.5L12 21m0 0l-7.5-7.5M12 21V3" />} />
);

export const ArrowUpCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15 11.25l-3-3m0 0l-3 3m3-3v7.5M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const MenuIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />} />
);

export const XIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />} />
);

export const HomeIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor">
        <path d="M3.012 10.981 3 11h2v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9h2a1 1 0 0 0 .555-1.832l-9-6a1 1 0 0 0-1.11 0l-9 6a1 1 0 0 0-.277 1.387.98.98 0 0 0 .844.426zM10 14a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v5h-4z"/>
    </svg>
);

export const DashboardIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
        <g fill="none">
            <path fill="#ff808c" d="M9.709 16.125H2.375a.917.917 0 0 0-.916.917v4.583c0 .506.41.917.916.917H9.71c.506 0 .916-.41.916-.917v-4.583a.917.917 0 0 0-.916-.917"/>
            <path fill="#ffbfc5" d="M6.042 16.125H2.375a.917.917 0 0 0-.916.917v4.583a.917.917 0 0 0 .916.917h3.667z"/>
            <path fill="#78eb7b" d="M14.292 22.542h7.333c.506 0 .917-.41.917-.917V11.542a.917.917 0 0 0-.917-.917h-7.333a.917.917 0 0 0-.917.917v10.083c0 .506.41.917.917.917"/>
            <path fill="#c9f7ca" d="M17.958 10.625h-3.666a.917.917 0 0 0-.917.917v10.083a.917.917 0 0 0 .917.917h3.666z"/>
            <path fill="#ffef5e" d="M14.292 7.875h7.333c.506 0 .917-.41.917-.917V2.375a.917.917 0 0 0-.917-.917h-7.333a.917.917 0 0 0-.917.917v4.583c0 .507.41.917.917.917"/>
            <path fill="#fff7ae" d="M17.958 1.458h-3.666a.917.917 0 0 0-.917.917v4.583a.917.917 0 0 0 .917.917h3.666z"/>
            <path fill="#78eb7b" d="M9.709 1.458H2.375a.917.917 0 0 0-.916.917v10.083c0 .507.41.917.916.917H9.71c.506 0 .916-.41.916-.917V2.375a.917.917 0 0 0-.916-.917"/>
            <path fill="#c9f7ca" d="M6.042 1.458H2.375a.917.917 0 0 0-.916.917v10.083a.917.917 0 0 0 .916.917h3.666z"/>
            <path stroke="#191919" strokeLinecap="round" strokeLinejoin="round" d="M9.709 16.125H2.375a.917.917 0 0 0-.916.917v4.583c0 .506.41.917.916.917H9.71c.506 0 .916-.41.916-.917v-4.583a.917.917 0 0 0-.916-.917m4.582 6.417h7.333c.506 0 .917-.41.917-.917V11.542a.917.917 0 0 0-.917-.917h-7.333a.917.917 0 0 0-.917.917v10.083c0 .506.41.917.917.917m0-14.667h7.333c.506 0 .917-.41.917-.917V2.375a.917.917 0 0 0-.917-.917h-7.333a.917.917 0 0 0-.917.917v4.583c0 .507.41.917.917.917M9.709 1.458H2.375a.917.917 0 0 0-.916.917v10.083c0 .507.41.917.916.917H9.71c.506 0 .916-.41.916-.917V2.375a.917.917 0 0 0-.916-.917"/>
        </g>
    </svg>
);

export const ProjectsIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <g fill="none">
            <path fill="#8fbffa" d="M28.5 10.5c-5.166 0-8.966.172-11.56.357c-3.3.236-5.847 2.782-6.083 6.084c-.185 2.593-.357 6.393-.357 11.559s.172 8.966.357 11.56c.236 3.3 2.782 5.847 6.084 6.083c2.593.185 6.393.357 11.559.357s8.966-.172 11.56-.357c3.3-.236 5.847-2.782 6.083-6.084c.185-2.593.357-6.393.357-11.559s-.172-8.966-.357-11.56c-.236-3.3-2.782-5.847-6.084-6.083-2.593-.185-6.393-.357-11.559-.357"/>
            <path fill="#2859c5" d="M7.94 1.857c2.594-.185 6.394-.357 11.56-.357s8.966.172 11.56.357c3.214.23 5.713 2.65 6.06 5.825A188 188 0 0 0 28.5 7.5c-5.233 0-9.104.174-11.773.365c-4.79.342-8.52 4.072-8.862 8.862c-.19 2.669-.365 6.54-.365 11.773c0 3.45.076 6.307.182 8.62c-3.175-.347-5.595-2.846-5.825-6.06c-.185-2.594-.357-6.394-.357-11.56s.172-8.966.357-11.56c.236-3.3 2.782-5.847 6.084-6.083ZM43.417 34.39a85 85 0 0 0-3.263-2.832c-1.493-1.222-3.497-1.415-5.136-.322c-1.064.71-2.492 1.765-4.329 3.321c-2.791-2.657-4.74-4.354-6.04-5.418c-1.494-1.221-3.498-1.415-5.137-.322c-1.358.906-3.313 2.377-5.952 4.736c.066 2.612.176 4.696.29 6.293c.13 1.813 1.492 3.175 3.305 3.304c2.517.18 6.245.35 11.345.35s8.828-.17 11.346-.35c1.813-.13 3.175-1.491 3.304-3.304c.102-1.423.2-3.232.267-5.456M32.5 20.5a4 4 0 1 1 8 0a4 4 0 0 1-8 0"/>
            <path fill="#2859c5" d="M46.316 37.091c-2.857-2.724-4.842-4.454-6.162-5.533c-1.493-1.222-3.498-1.415-5.136-.322c-1.064.71-2.493 1.765-4.329 3.321c-2.791-2.657-4.74-4.354-6.04-5.418c-1.494-1.221-3.498-1.415-5.137-.322c-1.358.906-3.313 2.377-5.952 4.736c.066 2.612.176 4.696.29 6.293c.13 1.813 1.492 3.175 3.305 3.304c2.517.18 6.245.35 11.345.35s8.828-.17 11.346-.35c3.3-.236 5.847-2.782 6.082-6.084q.093-1.282.174-2.968"/>
        </g>
    </svg>
);

// --- ADDED MISSING ICONS ---

// Fix: Add CalendarIcon
export const CalendarIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5m-9-6h.008v.008H12v-.008zM12 15h.008v.008H12V15zm0 3h.008v.008H12V18zm-3-3h.008v.008H9V15zm0 3h.008v.008H9V18zM15 15h.008v.008H15V15zm0 3h.008v.008H15V18z" />} />
);

// Fix: Add SparklesIcon
export const SparklesIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.25 21.75l-.648-1.178a2.625 2.625 0 00-1.84-1.84L12.5 18l1.178-.648a2.625 2.625 0 001.84-1.84L16.25 14.25l.648 1.178a2.625 2.625 0 001.84 1.84L20 18l-1.178.648a2.625 2.625 0 00-1.84 1.84z" />} />
);

// Fix: Add UsersIcon
export const UsersIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />} />
);

// Fix: Add PaletteIcon
export const PaletteIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-3.012 3.011c0 .83.67 1.503 1.503 1.503h.01c.453 0 .894-.179 1.222-.507l.001-.001c.677-.677 1.586-1.075 2.532-1.075h.352a.75.75 0 00.75-.75V15a3 3 0 00-3-3H9.75a3 3 0 00-3 3v.375a.75.75 0 00.75.75h2.03zM15 6.75a3 3 0 116 0 3 3 0 01-6 0zm-3 1.5a.75.75 0 100-1.5.75.75 0 000 1.5zm3.75 4.5a.75.75 0 100-1.5.75.75 0 000 1.5zm3 3a.75.75 0 100-1.5.75.75 0 000 1.5zm-6.75 3a.75.75 0 100-1.5.75.75 0 000 1.5z" />} />
);

// Fix: Add UserIcon
export const UserIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />} />
);

// Fix: Add LightbulbIcon
export const LightbulbIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-3m0 0a4.5 4.5 0 10-4.5-4.5M12 15a4.5 4.5 0 014.5-4.5M12 18.75a3.375 3.375 0 006.609-1.035M12 18.75a3.375 3.375 0 01-6.609-1.035m7.682-4.144A2.25 2.25 0 0112 15h0a2.25 2.25 0 01-1.073-.279M12 21V19.5" />} />
);

// Fix: Add MagicPixaLogo
export const MagicPixaLogo: React.FC<IconProps> = ({ className }) => (
    <div className={`flex items-center gap-2 ${className}`}>
        <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center shadow-lg">
            <SparklesIcon className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-black tracking-tighter text-[#1A1A1E]">MagicPixa</span>
    </div>
);

// Fix: Add AudioWaveIcon
export const AudioWaveIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m6 7.5v3.75m-3.75 0h7.5M12 15.75a3 3 0 01-3-3V4.5a3 3 0 116 0v8.25a3 3 0 01-3 3z" />} />
);

// Fix: Add SunIcon
export const SunIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m0 13.5V21m8.967-8.967h-2.25M5.25 12h-2.25m13.5-5.832l-1.592 1.591m-8.967 8.967l-1.591 1.591m13.5 0l-1.591-1.591M6.75 6.75l-1.591-1.591M12 7.5a4.5 4.5 0 100 9 4.5 4.5 0 000-9z" />} />
);

// Fix: Add MoonIcon
export const MoonIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25C3 16.635 7.365 21 12.75 21a9.753 9.753 0 009.002-5.998z" />} />
);

// Fix: Add SystemIcon
export const SystemIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0115 18.257V17.25m6-12V15a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 15V5.25m18 0A2.25 2.25 0 0018.75 3H5.25A2.25 2.25 0 003 5.25m18 0V12a2.25 2.25 0 01-2.25 2.25H5.25A2.25 2.25 0 013 12V5.25" />} />
);

// Fix: Add GoogleIcon
export const GoogleIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
        <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.954 4 4 12.954 4 24s8.954 20 20 20 20-8.954 20-20c0-1.341-.138-2.65-.389-3.917z"/>
        <path fill="#FF3D00" d="m6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4c-6.903 0-13.099 3.499-16.826 8.824l-.868 1.867z"/>
        <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
        <path fill="#1976D2" d="M43.611 20.083A19.93 19.93 0 0 1 44 24c0 4.832-1.707 9.299-4.591 12.808L33.22 31.57A11.94 11.94 0 0 0 35.303 28H24v-8h19.611z"/>
    </svg>
);

// Fix: Add LogoutIcon
export const LogoutIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />} />
);

// Fix: Add TicketIcon
export const TicketIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-5.25h.008v.008H7.5V12.75zm3 0h.008v.008H10.5V12.75zm3 0h.008v.008H13.5V12.75zm3 0h.008v.008H16.5V12.75zM6 6V4.5a1.5 1.5 0 011.5-1.5h9A1.5 1.5 0 0118 4.5V6a2.25 2.25 0 002.25 2.25v7.5A2.25 2.25 0 0018 18v1.5a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 016 19.5V18a2.25 2.25 0 00-2.25-2.25v-7.5A2.25 2.25 0 006 6z" />} />
);

// Fix: Add PlusCircleIcon
export const PlusCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

// Fix: Add CreditCardIcon
export const CreditCardIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25v10.5A2.25 2.25 0 004.5 19.5z" />} />
);

// Fix: Add CogIcon
export const CogIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0h1.5m-9 9V21m0-16.5V3m7.5 13.5l1.06 1.06m-13.5 0L6.44 18.44M6.44 5.56l1.06 1.06m10.5 0l1.06-1.06" />} />
);

// Fix: Add ChartBarIcon
export const ChartBarIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />} />
);

// Fix: Add InformationCircleIcon
export const InformationCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />} />
);

// Fix: Add ThumbUpIcon
export const ThumbUpIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6.633 10.5c.806 0 1.533-.446 2.031-1.08a9.041 9.041 0 012.861-2.4c.723-.384 1.35-.956 1.653-1.715a4.498 4.498 0 00.322-1.672V3a.75.75 0 01.75-.75A2.25 2.25 0 0116.5 4.5c0 1.152-.26 2.243-.723 3.218-.266.558.107 1.282.725 1.282h3.126c1.026 0 1.945.694 2.054 1.715.045.422.068.85.068 1.285a11.95 11.95 0 01-2.649 7.521c-.388.482-.987.729-1.605.729H13.48c-.483 0-.964-.078-1.423-.23l-3.114-1.04a4.501 4.501 0 00-1.423-.23H5.904M14.25 9h2.25M5.904 18.75c.083.205.173.405.27.602.197.4-.078.898-.523.898h-.508c-1.657 0-3-1.343-3-3V9.75c0-1.657 1.343-3 3-3h.508c.445 0 .72.498.523.898a8.963 8.963 0 01-.27.602" />} />
);

// Fix: Add ThumbDownIcon
export const ThumbDownIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M7.5 15h2.25m3.33-1c-.806 0-1.533.446-2.031 1.08a9.041 9.041 0 01-2.861 2.4c-.723.384-1.35.956-1.653 1.715a4.498 4.498 0 00-.322 1.672V21a.75.75 0 01-.75.75A2.25 2.25 0 013 19.5c0-1.152.26-2.243.723-3.218.266-.558-.107-1.282-.725-1.282H1.5c-1.026 0-1.945-.694-2.054-1.715A12.137 12.137 0 01-.622 12c0-2.836.986-5.441 2.649-7.521c.388-.482.987-.729 1.605-.729H10.52c.483 0 .964.078 1.423.23l3.114 1.04a4.501 4.501 0 001.423.23H18.096c-.083-.205-.173-.405-.27-.602-.197-.4.078-.898.523-.898h.508c1.657 0 3 1.343 3 3V14.25c0 1.657-1.343 3-3 3h-.508c-.445 0-.72-.498-.523-.898a8.963 8.963 0 01.27-.602" />} />
);

// Fix: Add CubeIcon
export const CubeIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />} />
);

// Fix: Add AdjustmentsVerticalIcon
export const AdjustmentsVerticalIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6 13.5V3.75m0 13.5V21m3-11.25h-6M6 10.5l-3 3m3-3l3 3M12 4.875V3m0 13.5V21m3-13.5h-6M12 7.5l-3 3m3-3l3 3M18 10.5V3m0 13.5V21m3-8.25h-6M18 12.75l-3 3m3-3l3 3" />} />
);

// Fix: Add PlusIcon
export const PlusIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />} />
);

// Fix: Add PhoneIcon
export const PhoneIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-.97 1.293c-2.824-1.125-5.125-3.426-6.25-6.25l1.293-.97c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />} />
);

// Fix: Add LockIcon
export const LockIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />} />
);

// Fix: Add CameraIcon
export const CameraIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.758.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15a2.25 2.25 0 002.25-2.25V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.822 1.316zM10.5 12.75a3 3 0 116 0 3 3 0 01-6 0z" />} />
);

// Fix: Add EngineIcon
export const EngineIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12a7.5 7.5 0 0015 0m-15 0a7.5 7.5 0 1115 0m-15 0H3m16.5 0h1.5m-9 9V21m0-16.5V3m7.5 13.5l1.06 1.06m-13.5 0L6.44 18.44M6.44 5.56l1.06 1.06m10.5 0l1.06-1.06" />} />
);

// Fix: Add DocumentTextIcon
export const DocumentTextIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />} />
);

// Fix: Add FilterIcon
export const FilterIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />} />
);

// Fix: Add EyeIcon
export const EyeIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178zM12 15.75a3.75 3.75 0 100-7.5 3.75 3.75 0 000 7.5z" />} />
);

// Fix: Add ImageIcon
export const ImageIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />} />
);

// Fix: Add ScaleIcon
export const ScaleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v17.25m0 0a.75.75 0 01-.75-.75M12 20.25a.75.75 0 00.75-.75M12 3a.75.75 0 01.75.75M12 3a.75.75 0 00-.75.75M19.5 12l-7.5-7.5m0 15l7.5-7.5m-15 0l7.5-7.5m-7.5 15l-7.5-7.5" />} />
);

// Fix: Add MapPinIcon
export const MapPinIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15 10.5a3 3 0 11-6 0 3 3 0 016 0zM19.5 10.5c0 7.142-7.5 11.25-7.5 11.25S4.5 17.642 4.5 10.5a7.5 7.5 0 1115 0z" />} />
);
