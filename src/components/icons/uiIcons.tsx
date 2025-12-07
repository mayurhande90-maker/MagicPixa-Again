
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

export const DashboardIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6a7.5 7.5 0 100 15 7.5 7.5 0 000-15zM21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />} />
);

// Custom Landscape Picture Icon
export const ProjectsIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m3 16 5-7 6 6.5m6.5 2.5L16 13l-4.286 6M14 10h.01M4 19h16a1 1 0 0 0 1-1V6a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1Z"/>
    </svg>
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

export const UserIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />} />
);

export const CreditCardIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 8.25h19.5M2.25 9h19.5m-16.5 5.25h6m-6 2.25h3m-3.75 3h15a2.25 2.25 0 002.25-2.25V6.75A2.25 2.25 0 0019.5 4.5h-15A2.25 2.25 0 002.25 6.75v10.5A2.25 2.25 0 004.5 19.5z" />} />
);

export const InformationCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const HelpIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const MoonIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21.752 15.002A9.718 9.718 0 0118 15.75c-5.385 0-9.75-4.365-9.75-9.75 0-1.33.266-2.597.748-3.752A9.753 9.753 0 003 11.25c0 5.385 4.365 9.75 9.75 9.75 2.833 0 5.398-1.21 7.252-3.248z" />} />
);

export const SunIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3v2.25m6.364.386l-1.591 1.591M21 12h-2.25m-.386 6.364l-1.591-1.591M12 18.75V21m-4.773-4.227l-1.591 1.591M5.25 12H3m4.227-4.773L5.636 5.636M15.75 12a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" />} />
);

export const SystemIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9 17.25v1.007a3 3 0 01-.879 2.122L7.5 21h9l-1.621-.621A3 3 0 0115 18.257V17.25m-6 0V15M9 6.75v1.007a3 3 0 00.879 2.122l1.621.621h3.002l1.621-.621a3 3 0 00.879-2.122V6.75m-6 0V5.25m6 0v1.5m-6 0h6" />} />
);

export const GoogleIcon: React.FC<IconProps> = ({ className }) => (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48"><path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8c-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4C12.955 4 4 12.955 4 24s8.955 20 20 20s20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"></path><path fill="#FF3D00" d="M6.306 14.691l6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"></path><path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238C29.211 35.091 26.715 36 24 36c-5.223 0-9.641-3.657-11.303-8.625l-6.571 4.819C9.656 39.663 16.318 44 24 44z"></path><path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303c-.792 2.237-2.231 4.166-4.087 5.571l6.19 5.238C41.099 34.631 44 29.692 44 24c0-1.341-.138-2.65-.389-3.917z"></path></svg>
);

// Custom MagicPixa Logo
export const MagicPixaLogo: React.FC<{ className?: string }> = ({ className = '' }) => (
    <div className={`flex items-center ${className}`}>
        <span className="text-2xl inline-flex items-center" style={{ fontFamily: "'Parkinsans', sans-serif", fontWeight: 700 }}>
            <span className="text-[#1A1A1E]">Magic</span>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-purple-600">Pixa</span>
        </span>
    </div>
);

export const TicketIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M16.5 6v.75m0 3v.75m0 3v.75m0 3V18m-9-1.5h5.25m-5.25 0h3m-3 0h-1.5m3 0h-1.5m-6 0h1.5m5.25 0h3m-3 0h-1.5m3 0h-1.5m-3 0h1.5m-6 0h1.5m7.5-12l-.75.638m0 0l-1.5-1.275m1.5 1.275L12 3m0 0l-1.5 1.275M12 3l.75.638M12 3l-.75.638m1.5-1.275L12 3m0 0l1.5 1.275M12 3l-.75.638m-3 6.38l.75.638m0 0l1.5-1.275m-1.5 1.275L9 9.38m0 0l1.5 1.275m-1.5-1.275L9 9.38m0 0l-.75.638m3-6.38l-.75.638m0 0l-1.5-1.275m1.5 1.275L12 3m0 0l-1.5 1.275M12 3l.75.638m-3 6.38l.75.638" />} />
);

export const LightbulbIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.311a14.994 14.994 0 01-4.5 0M9 10.5a3 3 0 116 0 3 3 0 01-6 0zm3.75 4.875c0-1.036.095-2.07.27-3.075M9.25 10.5c.175 1.005.27 2.04.27 3.075M12 3v1.5m0 15V21" />} />
);

export const UsersIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />} />
);

export const PaletteIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128z M14.47 16.122a3 3 0 015.78 1.128 2.25 2.25 0 002.4 2.245 4.5 4.5 0 01-8.4-2.245c0-.399.078-.78.22-1.128m0 0l-1.47-2.205m-1.47 2.205a2.25 2.25 0 01-1.928 1.056 2.25 2.25 0 01-2.4-2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128m0 0l-1.47-2.205m1.47 2.205a2.25 2.25 0 001.928 1.056 2.25 2.25 0 002.4-2.245 4.5 4.5 0 01-8.4-2.245c0-.399.078-.78.22-1.128m0 0l-1.47-2.205" />} />
);

export const CubeIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M21 7.5l-9-5.25L3 7.5m18 0l-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />} />
);

export const DiamondIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M14.25 6l-3.75 3.75-3.75-3.75M14.25 6L21 12.75l-3.75 3.75M14.25 6L7.5 12.75l3.75 3.75M3 12.75l3.75-3.75L10.5 12l-3.75 3.75-3.75-3.75z" />} />
);

export const LeafIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128z" />} />
);

export const MinimalistIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M3.75 9h16.5m-16.5 6.75h16.5" />} />
);

export const CompareIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 19.5v-15m0 0l-6.75 6.75M12 4.5l6.75 6.75" />} />
);

export const DocumentTextIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />} />
);

export const HandRaisedIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M10.05 4.575a1.575 1.575 0 10-3.15 0v3m3.15-3v-1.5a1.575 1.575 0 013.15 0v1.5m-3.15 0l.075 5.925m3.075.75V4.575m0 0a1.575 1.575 0 013.15 0V15M6.9 7.575V12a1.5 1.5 0 003 0v-4.171a.625.625 0 011.25 0V16.5h.375m-5.75 4.5h10.5a2.25 2.25 0 002.25-2.25V16.5a9 9 0 00-9-9" />} />
);

export const GarmentTopIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.375A2.25 2.25 0 1112.75 6v.375m-3.75 0V3.75m0 3.75h3.75m-3.75 0V3.75m0 3.75H4.5m3.75 0v6.375c0 .621-.504 1.125-1.125 1.125H4.5" />} />
);

export const GarmentTrousersIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.53 16.122a3 3 0 00-5.78 1.128 2.25 2.25 0 01-2.4 2.245 4.5 4.5 0 008.4-2.245c0-.399-.078-.78-.22-1.128zM14.47 16.122a3 3 0 015.78 1.128 2.25 2.25 0 002.4 2.245 4.5 4.5 0 01-8.4-2.245c0-.399.078-.78.22-1.128zM9.53 16.122l1.47-2.205m-1.47 2.205a2.25 2.25 0 01-1.928 1.056 2.25 2.25 0 01-2.4-2.245 4.5 4.5 0 008.4-2.245c0-.399.078-.78.22-1.128m0 0l-1.47-2.205m1.47 2.205a2.25 2.25 0 001.928 1.056 2.25 2.25 0 002.4-2.245 4.5 4.5 0 01-8.4-2.245c0-.399.078-.78.22-1.128m0 0l-1.47-2.205" />} />
);

export const AudioWaveIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M8.25 6.75h7.5M8.25 12h7.5m-7.5 5.25h7.5M3 3h18v18H3V3z" />} />
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

export const CurrencyDollarIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const FilterIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 3c2.755 0 5.455.232 8.083.678.533.09.917.556.917 1.096v1.044a2.25 2.25 0 01-.659 1.591l-5.432 5.432a2.25 2.25 0 00-.659 1.591v2.927a2.25 2.25 0 01-1.244 2.013L9.75 21v-6.568a2.25 2.25 0 00-.659-1.591L3.659 7.409A2.25 2.25 0 013 5.818V4.774c0-.54.384-1.006.917-1.096A48.32 48.32 0 0112 3z" />} />
);

export const PlusIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />} />
);

export const PlusCircleIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 11-18 0 9 9 0 0118 0z" />} />
);

export const StopIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M5.25 7.5A2.25 2.25 0 017.5 5.25h9a2.25 2.25 0 012.25 2.25v9a2.25 2.25 0 01-2.25 2.25h-9a2.25 2.25 0 01-2.25-2.25v-9z" />} />
);

export const MicrophoneIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M12 18.75a6 6 0 006-6v-1.5m-6 7.5a6 6 0 01-6-6v-1.5m12-9l-2.639 2.639a.5.5 0 01-.707 0l-2.64-2.64a.5.5 0 010-.707l2.64-2.64a.5.5 0 01.707 0L15 3.75M12 18.75v-1.5m0-15V5.25" />} />
);

export const AdjustmentsVerticalIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M10.5 6h3m-3 6h3m-3 6h3M6 6v12M18 6v12" />} />
);

export const LogoutIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />} />
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

export const SparklesIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.898 20.572L16.25 21.75l-.648-1.178a2.625 2.625 0 00-1.84-1.84L12.5 18l1.178-.648a2.625 2.625 0 001.84-1.84L16.25 14.25l.648 1.178a2.625 2.625 0 001.84 1.84L20 18l-1.178.648a2.625 2.625 0 00-1.84 1.84z" />} />
);

export const ImageIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />} />
);

// New Calendar Icon
export const CalendarIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />} />
);

export const CameraIcon: React.FC<IconProps> = (props) => (
    <BaseIcon {...props} path={<><path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" /><path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" /></>} />
);

export const ThumbUpIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className}>
        <path fill="#fac036" d="M79.46 54.2c6.15-1.74 17.05-1.51 20.24-1.28c5.58.4 11.16.28 12.12 7.05c.64 4.56-.89 8.71-7.65 9.45c-2.38.26-5.29.4-7.69.78l-1.88 2.07c2.22-.3 7.31-.2 8.84-.39c6.46-.79 11.92 1.8 12.74 8.01c.72 5.44-3.38 9.64-9.2 9.32c-1.99-.11-7.61.66-13.19.81l-.43 1.13l-.2.34c3.54.1 6.93.24 9.34.36c6.45.32 9.97 3.78 9.88 8.38c-.11 5.59-5.34 7.69-9.08 8c-2.8.23-12.82-.06-19.55-.61l-1.06 1.81c.48.01 13.37.63 13.86.66c5.91.44 8.43 2.58 8.28 6.8c-.21 5.92-6.53 7.49-9.95 8.03c-5.55.88-12.95.62-18.34.77c-11.66.32-35.52.84-46.66-8.92c-3.8-3.33-7.63-7.86-10.89-9.16c-6.83-2.72-7.42-11.62-7.11-22.87c.15-5.44-1.72-20.71 4.88-24.41c9.26-5.19 24.96-9.11 30.18-13.21c8.56-6.73 13.56-17.68 15.84-24.09C67.12 10.82 68.44 2 76.03 2c13.3 0 12.95 11.88 13.2 17.82c.49 11.63-13.86 33.15-9.77 34.38z"/>
        <path fill="#e48c15" d="M68.02 80.94c.13 5.99 4.75 8.56 4.96 8.67c-2.65-.06-8.39 2.63-8.39 8.34c0 4.71 2.56 8.38 5.13 9.63c-1.69.36-4.88 2.66-4.88 7.68c0 7.36 5.46 10.05 9.59 10.56c4.13.51 15.61-.18 19.4-.76c2.03-.31-10.06-.45-18.91-1.61c-2.54-.33-5.57-2.72-6.06-5.94c0 0-.72-4.25 3.16-6.7c0 0 1.64-1.41 9.25-1.35l2.3.03c.72.05 9.91.37 12.97.59c1.35.1 2.51.29 3.51.57c-.16-.23-.34-.61-.28-1.16c.13-1.16.89-1.21 1.09-1.21l-1.82-.1l-6.48-.37c-6.46-.39-15.56-1.01-16.61-1.43c0 0-6.34-1.6-6.34-8.1c0 0-.33-5.53 8.13-5.79c0 0 19.99-1.15 28.45-.03c0 0-1.21-2.25.79-3.26c0 0-14.27.35-23.21.59s-10.85-4.51-11.08-7.1c-.03-.39-.11-1.01-.11-1.74c0-5.15 4.52-5.83 10.99-6.67c13.96-1.83 19.87-2.4 19.87-2.4c.77-.09 1.5-.14 2.21-.13c-.39-.22-.92-.63-.99-1.31c-.04-.44.18-1.11.18-1.11s-6.02.49-15.31 1.73c-9.28 1.24-16.7.67-17.37-4.76c-.49-3.98.18-6.51 1.9-8.48c2.12-2.43 5.53-3.64 5.53-3.64s-.39-.08-.61-.37c-.22-.3-.23-.77-.23-.77C71.18 54 66 58.81 66.43 64.99c.3 4.23 1.42 7.05 4.23 8.42c.01-.01-2.77 1.55-2.64 7.53z"/>
        <path fill="#e48c15" d="m71.11 67.52l-3.32.96s4.92 18.11-13.24 30.59c0 0-2.33 1.56-1.2 2.73c0 0 .79 1.36 4.13-1.19c0-.01 17.72-11.57 13.63-33.09z"/>
    </svg>
);

export const ThumbDownIcon: React.FC<IconProps> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" className={className}>
        <path fill="#fac036" d="M79.46 73.8c6.15 1.74 17.05 1.51 20.24 1.28c5.58-.4 11.16-.28 12.12-7.05c.64-4.56-.89-8.71-7.65-9.45c-2.38-.26-5.29-.4-7.69-.78l-1.88-2.07c2.22.3 7.31.2 8.84.39c6.46.79 11.92-1.8 12.74-8.01c.72-5.44-3.38-9.64-9.2-9.32c-1.99.11-7.61-.66-13.19-.81l-.43-1.13l-.2-.34c3.54-.1 6.93-.24 9.34-.36c6.45-.32 9.97-3.78 9.88-8.38c-.11-5.59-5.34-7.69-9.08-8c-2.8-.23-12.82.06-19.55.61l-1.06-1.81c.48-.01 13.37-.63 13.86-.66c5.91-.44 8.43-2.58 8.28-6.8c-.21-5.92-6.53-7.49-9.95-8.03c-5.55-.88-12.95-.62-18.34-.77c-11.66-.32-35.52-.84-46.66 8.92c-3.8 3.33-7.63 7.86-10.89 9.16c-6.83 2.72-7.42 11.62-7.11 22.87c.15 5.44-1.72 20.71 4.88 24.41c9.26 5.19 24.96 9.11 30.18 13.21c8.56 6.73 13.56 17.68 15.84 24.09C67.12 117.18 68.44 126 76.03 126c13.3 0 12.95-11.88 13.2-17.82c.49-11.63-13.86-33.15-9.77-34.38z"/>
        <path fill="#e48c15" d="M68.02 47.06c.13-5.99 4.75-8.56 4.96-8.67c-2.65.06-8.39-2.63-8.39-8.34c0-4.71 2.56-8.38 5.13-9.63c-1.69-.36-4.88-2.66-4.88-7.68c0-7.36 5.46-10.05 9.59-10.56c4.13-.51 15.61.18 19.4.76c2.03.31-10.06.45-18.91 1.61c-2.54.33-5.57 2.72-6.06 5.94c0 0-.72 4.25 3.16 6.7c0 0 1.64 1.41 9.25 1.35l2.3-.03c.72-.05 9.91-.37 12.97-.59c1.35-.1 2.51-.29 3.51-.57c-.16.23-.34.61-.28 1.16c.13 1.16.89 1.21 1.09 1.21l-1.82.1l-6.48.37c-6.46.39-15.56 1.01-16.61 1.43c0 0-6.34 1.6-6.34 8.1c0 0-.33 5.53 8.13 5.79c0 0 19.99 1.15 28.45.03c0 0-1.21 2.25.79 3.26c0 0-14.27-.35-23.21-.59s-10.85 4.51-11.08 7.1c-.03.39-.11 1.01-.11 1.74c0 5.15 4.52 5.83 10.99 6.67c13.96 1.83 19.87 2.4 19.87 2.4c.77.09 1.5.14 2.21.13c-.39.22-.92.63-.99 1.31c-.04.44.18 1.11.18-1.11s-6.02-.49-15.31-1.73c-9.28-1.24-16.7-.67-17.37 4.76c-.49 3.98.18 6.51 1.9 8.48c2.12 2.43 5.53 3.64 5.53 3.64s-.39.08-.61.37c-.22.3-.23.77-.23.77C71.18 74 66 69.19 66.43 63.01c.3-4.23 1.42-7.05 4.23-8.42c.01.01-2.77-1.55-2.64-7.53z"/>
        <path fill="#e48c15" d="m71.11 60.48l-3.32-.96s4.92-18.11-13.24-30.59c0 0-2.33-1.56-1.2-2.73c0 0 .79-1.36 4.13 1.19c0 .01 17.72 11.57 13.63 33.09z"/>
    </svg>
);
