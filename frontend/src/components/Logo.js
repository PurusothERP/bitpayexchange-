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
                    <stop offset="0%" stopColor="#00D2D2" />
                    <stop offset="100%" stopColor="#009393" />
                </linearGradient>
                <filter id="diamond-glow">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
            </defs>
            {/* Diamond Cut T */}
            <path 
                d="M30 20 H70 V35 H58 V80 H42 V35 H30 Z" 
                fill="url(#logo-gradient)"
                filter="url(#diamond-glow)"
            />
            {/* Facet Cuts */}
            <path d="M30 20 L50 35 L70 20" stroke="white" strokeWidth="0.5" opacity="0.5" />
            <path d="M42 35 L50 80 L58 35" stroke="white" strokeWidth="0.5" opacity="0.3" />
            <path d="M50 20 L50 80" stroke="white" strokeWidth="0.5" opacity="0.2" />
            {/* Diamond Frame */}
            <path d="M50 5 L95 50 L50 95 L5 50 Z" stroke="url(#logo-gradient)" strokeWidth="1" opacity="0.4" />
        </svg>
    );
};

export default Logo;
