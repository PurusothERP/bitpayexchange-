import React from 'react';

const Logo = ({ className = "w-full h-full" }) => {
    return (
        <svg 
            viewBox="0 0 100 100" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className={className}
        >
            <defs>
                <linearGradient id="logo-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#8B5CF6">
                        <animate 
                            attributeName="stop-color" 
                            values="#8B5CF6; #7C3AED; #8B5CF6" 
                            dur="4s" 
                            repeatCount="indefinite" 
                        />
                    </stop>
                    <stop offset="100%" stopColor="#1E3A8A">
                        <animate 
                            attributeName="stop-color" 
                            values="#1E3A8A; #172554; #1E3A8A" 
                            dur="4s" 
                            repeatCount="indefinite" 
                        />
                    </stop>
                </linearGradient>
                <filter id="logo-glow" x="-20%" y="-20%" width="140%" height="140%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            <path 
                d="M15 85V15H35L50 45L65 15H85V85H70V35L50 75L30 35V85H15Z" 
                fill="url(#logo-gradient)"
                filter="url(#logo-glow)"
                stroke="white"
                strokeWidth="0.5"
                strokeLinejoin="round"
            />
        </svg>
    );
};

export default Logo;
