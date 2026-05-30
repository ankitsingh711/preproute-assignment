import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export const PreprouteLogo: React.FC<LogoProps> = ({ size = 32, showText = true }) => {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', userSelect: 'none' }}>
      <svg
        width={size * 1.2}
        height={size}
        viewBox="0 0 40 32"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* curved path */}
        <path
          d="M4 22 C 10 8, 22 8, 30 18 C 34 22, 36 22, 38 18"
          stroke="#1e293b"
          strokeWidth="3.5"
          strokeLinecap="round"
          strokeDasharray="0.5 4"
        />
        {/* start blue node */}
        <circle cx="4" cy="22" r="4.5" fill="#004fe6" />
        {/* graduation/mortarboard shape inside the logo */}
        <path
          d="M16 12 L 24 8 L 32 12 L 24 16 Z"
          fill="#3b82f6"
        />
        <path
          d="M20 14.5 L 20 20 C 20 22, 28 22, 28 20 L 28 14.5"
          stroke="#3b82f6"
          strokeWidth="1.5"
          fill="none"
          strokeLinecap="round"
        />
        <path
          d="M32 12 L 32 18 L 31 19"
          stroke="#3b82f6"
          strokeWidth="1"
          fill="none"
        />
      </svg>
      {showText && (
        <span
          style={{
            fontFamily: 'Inter, sans-serif',
            fontWeight: 800,
            fontSize: `${size * 0.65}px`,
            letterSpacing: '-0.03em',
            display: 'flex',
            alignItems: 'center',
            lineHeight: 1,
            userSelect: 'none',
          }}
        >
          <span style={{ color: '#004fe6' }}>Prep</span>
          <span style={{ color: '#3b82f6', fontWeight: 600 }}>route</span>
        </span>
      )}
    </div>
  );
};

export default PreprouteLogo;
