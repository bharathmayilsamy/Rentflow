// V-DO Logo Component
// Uses the actual logo.png from src/assets if available,
// falls back to an inline SVG that matches the V-DO brand style.

import { useState } from 'react';

interface Props {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// Inline SVG that matches V-DO logo style (dark slate + gold accent)
function VdoSvgLogo({ size, className }: { size: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
    >
      <rect width="100" height="100" rx="16" fill="#1e293b" />
      {/* V shape */}
      <polygon points="8,20 20,20 50,70 80,20 92,20 50,88" fill="#f1f5f9" />
      {/* Gold accent lines */}
      <line x1="24" y1="20" x2="50" y2="60" stroke="#c9a227" strokeWidth="2" />
      <line x1="76" y1="20" x2="50" y2="60" stroke="#c9a227" strokeWidth="2" />
      {/* House/building symbol */}
      <rect x="35" y="28" width="30" height="28" rx="2" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
      <polygon points="35,30 50,18 65,30" fill="none" stroke="#94a3b8" strokeWidth="1.2" />
      {/* Number 6 in center */}
      <text x="50" y="48" textAnchor="middle" fill="#1e293b" fontSize="16" fontWeight="bold" fontFamily="serif">6</text>
    </svg>
  );
}

export default function VdoLogo({ size = 'md', className = '' }: Props) {
  const [imgError, setImgError] = useState(false);
  const sizeMap = { sm: 40, md: 64, lg: 96 };
  const px = sizeMap[size];
  const sizeClass = size === 'sm' ? 'w-10 h-10' : size === 'md' ? 'w-16 h-16' : 'w-24 h-24';

  if (imgError) {
    return <VdoSvgLogo size={px} className={`${sizeClass} rounded-xl ${className}`} />;
  }

  return (
    <img
      src="/logo.png"
      alt="V-DO"
      className={`${sizeClass} rounded-xl object-cover ${className}`}
      onError={() => setImgError(true)}
    />
  );
}

// Small icon version for sidebar
export function VdoLogoIcon({ className = '' }: { className?: string }) {
  const [imgError, setImgError] = useState(false);
  if (imgError) {
    return (
      <svg width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg" className={`w-10 h-10 rounded-xl ${className}`}>
        <rect width="100" height="100" rx="16" fill="#1e293b" />
        <polygon points="8,20 20,20 50,70 80,20 92,20 50,88" fill="#f1f5f9" />
        <line x1="24" y1="20" x2="50" y2="60" stroke="#c9a227" strokeWidth="2" />
        <line x1="76" y1="20" x2="50" y2="60" stroke="#c9a227" strokeWidth="2" />
        <text x="50" y="52" textAnchor="middle" fill="#94a3b8" fontSize="18" fontWeight="bold" fontFamily="serif">6</text>
      </svg>
    );
  }
  return (
    <img
      src="/logo.png"
      alt="V-DO"
      className={`w-10 h-10 rounded-xl object-cover ${className}`}
      onError={() => setImgError(true)}
    />
  );
}
