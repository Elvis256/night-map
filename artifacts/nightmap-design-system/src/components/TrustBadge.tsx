import { ShieldCheck } from 'lucide-react';

interface TrustBadgeProps {
  score: number;
  size?: 'sm' | 'md';
}

export function TrustBadge({ score, size = 'md' }: TrustBadgeProps) {
  const isSmall = size === 'sm';

  return (
    <span
      className={`nightmap-trust-badge nightmap-trust-badge--${isSmall ? 'sm' : 'md'}`}
      role="img"
      aria-label={`Trust score ${score}%`}
    >
      <ShieldCheck aria-hidden="true" />
      <span>{score}%</span>
    </span>
  );
}
