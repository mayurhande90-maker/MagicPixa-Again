
import { useState, useEffect } from 'react';

export const useDevice = () => {
    const [isMobile, setIsMobile] = useState(false);

    useEffect(() => {
        const checkDevice = () => {
            const width = window.innerWidth;
            const userAgent = navigator.userAgent.toLowerCase();
            const isMobileUA = /iphone|ipad|ipod|android|blackberry|windows phone/g.test(userAgent);
            
            // We treat anything under 1024px as mobile/tablet for the "App" experience
            setIsMobile(width < 1024 || isMobileUA);
        };

        checkDevice();
        window.addEventListener('resize', checkDevice);
        return () => window.removeEventListener('resize', checkDevice);
    }, []);

    return { isMobile };
};
