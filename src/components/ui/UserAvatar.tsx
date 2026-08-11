'use client';

import { getUserColor } from '@/lib/getUserColor';

export default function UserAvatar({
  uid,
  photoURL,
  displayName,
  size = 40,
}: {
  uid: string;
  photoURL?: string | null;
  displayName?: string;
  size?: number;
}) {
  const color = getUserColor(uid);

  if (photoURL) {
    return (
      <img
        src={photoURL}
        alt={displayName || ''}
        className="rounded-full object-cover block"
        style={{ width: size, height: size, minWidth: size, minHeight: size, maxWidth: size, maxHeight: size }}
      />
    );
  }

  return (
    <div
      className="rounded-full flex-shrink-0 overflow-hidden"
      style={{ width: size, height: size, minWidth: size, minHeight: size, background: color }}
    >
      <svg
        viewBox="0 0 80 80"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ display: 'block' }}
      >
        <circle cx="40" cy="28" r="14" fill="white" fillOpacity="0.9" />
        <ellipse cx="40" cy="66" rx="22" ry="16" fill="white" fillOpacity="0.9" />
      </svg>
    </div>
  );
}
