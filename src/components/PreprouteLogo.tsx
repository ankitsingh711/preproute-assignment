import React from 'react';

interface LogoProps {
  size?: number;
  showText?: boolean;
}

export const PreprouteLogo: React.FC<LogoProps> = ({ size = 32, showText = true }) => {
  const scale = size / 32;
  const width = showText ? 150 * scale : 40 * scale;
  const height = 40 * scale;

  return (
    <div style={{ display: 'flex', alignItems: 'center', userSelect: 'none' }}>
      <svg
        width={width}
        height={height}
        viewBox={showText ? "0 0 150 40" : "0 0 40 40"}
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ flexShrink: 0 }}
      >
        {/* Graduation cap on top of 'P' */}
        <path d="M12 7 L21 3 L30 7 L21 11 Z" fill="#004fe6" />
        <path d="M16 9 L16 13 C16 15, 26 15, 26 13 L26 9" stroke="#004fe6" strokeWidth="1.2" fill="none" />
        {/* Tassel */}
        <path d="M30 7 L33 12 L32 13" stroke="#004fe6" strokeWidth="0.8" fill="none" />
        
        {/* Dashed path curve */}
        <path
          d="M10 24 C 18 8, 48 8, 62 20 C 68 24, 73 21, 78 14"
          stroke="#1e293b"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="1 3.5"
        />
        {/* Starting dot on the P loop */}
        <circle cx="10" cy="24" r="3.5" fill="#004fe6" />

        {showText && (
          /* Text "Preproute" */
          <text
            x="5"
            y="33"
            fill="#004fe6"
            style={{
              fontFamily: "'Inter', sans-serif",
              fontSize: '24px',
              fontWeight: 800,
              letterSpacing: '-0.03em',
            }}
          >
            Prep
            <tspan fontWeight={500} fill="#2563eb">
              route
            </tspan>
          </text>
        )}
      </svg>
    </div>
  );
};

export default PreprouteLogo;
