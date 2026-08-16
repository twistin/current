import React from 'react';

interface AuthorChipProps {
  pseudonym: string;
  rigorScore?: number;
  onSelectMember?: (pseudonym: string) => void;
  showRigor?: boolean;
}

const MEMBER_KNOWN: Record<string, { color: string; rigor: number }> = {
  nix: { color: 'var(--accent)', rigor: 142 },
  sol: { color: 'var(--support)', rigor: 98 },
  mara: { color: 'var(--refute)', rigor: 210 },
  kai: { color: 'var(--contested)', rigor: 57 },
};

const PALETTE = [
  'var(--accent)',
  'var(--support)',
  'var(--refute)',
  'var(--contested)',
  '#8B5CF6',
  '#06B6D4',
  '#EC4899',
  '#10B981',
];

export function getMemberAvatarColor(pseudonym: string): string {
  const lower = pseudonym.toLowerCase();
  if (MEMBER_KNOWN[lower]) {
    return MEMBER_KNOWN[lower].color;
  }
  let hash = 0;
  for (let i = 0; i < pseudonym.length; i++) {
    hash = pseudonym.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % PALETTE.length;
  return PALETTE[index];
}

export const AuthorChip: React.FC<AuthorChipProps> = ({
  pseudonym,
  rigorScore,
  onSelectMember,
  showRigor = true,
}) => {
  const lower = pseudonym.toLowerCase();
  const known = MEMBER_KNOWN[lower];
  const color = getMemberAvatarColor(pseudonym);
  const displayRigor = rigorScore !== undefined ? rigorScore : known ? known.rigor : 50;
  const avatarInitials = pseudonym.slice(0, 2).toLowerCase();

  const isClickable = !!onSelectMember;

  return (
    <span
      className="who"
      onClick={(e) => {
        if (isClickable) {
          e.stopPropagation();
          onSelectMember(pseudonym);
        }
      }}
      title={isClickable ? `Ver perfil de @${pseudonym}` : `@${pseudonym}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: '6px',
        fontFamily: 'var(--mono)',
        fontSize: '11px',
        cursor: isClickable ? 'pointer' : 'default',
        padding: '2px 6px',
        borderRadius: '6px',
        background: isClickable ? 'var(--surface-3)' : 'transparent',
        border: isClickable ? '1px solid var(--border-soft)' : '1px solid transparent',
        transition: 'all 0.15s ease',
        userSelect: 'none',
      }}
    >
      <span
        style={{
          width: '18px',
          height: '18px',
          borderRadius: '50%',
          backgroundColor: color,
          fontSize: '9px',
          fontWeight: 700,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#ffffff',
          textTransform: 'lowercase',
          flexShrink: 0,
        }}
      >
        {avatarInitials}
      </span>
      <span
        style={{
          color: isClickable ? 'var(--text)' : 'var(--text-soft)',
          fontWeight: 600,
          textDecoration: isClickable ? 'underline' : 'none',
          textUnderlineOffset: '2px',
        }}
      >
        @{pseudonym}
      </span>
      {showRigor && (
        <span style={{ color: 'var(--text-faint)', fontSize: '10px' }}>
          rigor <b style={{ color: 'var(--support)', fontWeight: 600 }}>{displayRigor}</b>
        </span>
      )}
    </span>
  );
};
