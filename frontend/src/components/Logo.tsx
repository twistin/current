import React from 'react';

interface LogoProps {
  variant?: 'horizontal' | 'stacked' | 'symbol-only';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  onClick?: () => void;
  showText?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  variant = 'horizontal',
  size = 'md',
  className = '',
  onClick,
  showText = true,
}) => {
  // Dimensiones según tamaño
  const symbolWidth = size === 'sm' ? 24 : size === 'lg' ? 44 : 32;
  const symbolHeight = size === 'sm' ? 18 : size === 'lg' ? 33 : 24;
  const fontSize = size === 'sm' ? '17px' : size === 'lg' ? '32px' : '21px';
  const strokeWidth = size === 'sm' ? 2 : size === 'lg' ? 3.2 : 2.5;

  const symbol = (
    <svg
      width={symbolWidth}
      height={symbolHeight}
      viewBox="0 0 60 38"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={{ display: 'block', flexShrink: 0 }}
      aria-hidden="true"
    >
      {/* Gota / Punto verde solitario */}
      <circle cx="30" cy="5" r="4" fill="var(--logo-dot)" />

      {/* Ola 1 (superior) */}
      <path
        d="M 2 16 C 9 10, 21 10, 30 16 C 39 22, 51 22, 58 16"
        stroke="var(--logo-wave-1)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Ola 2 (central) */}
      <path
        d="M 2 25 C 9 19, 21 19, 30 25 C 39 31, 51 31, 58 25"
        stroke="var(--logo-wave-2)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />

      {/* Ola 3 (inferior) */}
      <path
        d="M 2 34 C 9 28, 21 28, 30 34 C 39 40, 51 40, 58 34"
        stroke="var(--logo-wave-3)"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
      />
    </svg>
  );

  if (variant === 'symbol-only' || !showText) {
    return (
      <div
        onClick={onClick}
        className={className}
        style={{ display: 'inline-flex', cursor: onClick ? 'pointer' : 'default' }}
      >
        {symbol}
      </div>
    );
  }

  if (variant === 'stacked') {
    return (
      <div
        onClick={onClick}
        className={className}
        style={{
          display: 'inline-flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: size === 'lg' ? '12px' : '8px',
          cursor: onClick ? 'pointer' : 'default',
          userSelect: 'none',
        }}
      >
        {symbol}
        <span
          className="serif"
          style={{
            fontSize,
            fontWeight: 600,
            color: 'var(--logo-wordmark)',
            lineHeight: 1,
            letterSpacing: '-0.01em',
          }}
        >
          Current<span style={{ color: 'var(--logo-period)' }}>.</span>
        </span>
      </div>
    );
  }

  // Horizontal por defecto
  return (
    <div
      onClick={onClick}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: size === 'sm' ? '8px' : '10px',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
      }}
    >
      {symbol}
      <span
        className="serif"
        style={{
          fontSize,
          fontWeight: 600,
          color: 'var(--logo-wordmark)',
          lineHeight: 1,
          letterSpacing: '-0.01em',
        }}
      >
        Current<span style={{ color: 'var(--logo-period)' }}>.</span>
      </span>
    </div>
  );
};
