import React from 'react';

interface AuthorChipProps {
  pseudonym: string;
}

const MEMBER_META: Record<string, { color: string; rigor: number }> = {
  nix: { color: '#8FB4F0', rigor: 142 },
  sol: { color: '#5FB88A', rigor: 98 },
  mara: { color: '#E8705A', rigor: 210 },
  kai: { color: '#E0A64D', rigor: 57 },
};

export const AuthorChip: React.FC<AuthorChipProps> = ({ pseudonym }) => {
  const meta = MEMBER_META[pseudonym.toLowerCase()] || { color: '#7C8290', rigor: 50 };
  const avatarInitials = pseudonym.slice(0, 2).toLowerCase();

  return (
    <span
      className="who"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--mono)',
        fontSize: '11px',
      }}
    >
      <span
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: meta.color,
          fontSize: '9px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#0c0d10',
          textTransform: 'lowercase',
        }}
      >
        {avatarInitials}
      </span>
      <span style={{ color: 'var(--text-soft)', fontWeight: 500 }}>@{pseudonym}</span>
      <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
        rigor <b style={{ color: 'var(--support)', fontWeight: 600 }}>{meta.rigor}</b>
      </span>
    </span>
  );
};
