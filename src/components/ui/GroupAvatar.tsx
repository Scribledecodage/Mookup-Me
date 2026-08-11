'use client';

export default function GroupAvatar({ size = 40 }: { size?: number }) {
  return (
    <div
      className="rounded-full overflow-hidden flex-shrink-0"
      style={{ width: size, height: size, background: '#3b82f6' }}
    >
      <svg
        viewBox="0 0 80 80"
        width={size}
        height={size}
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
      >
        <circle cx="40" cy="28" r="14" fill="white" fillOpacity="0.9" />
        <ellipse cx="40" cy="66" rx="22" ry="16" fill="white" fillOpacity="0.9" />
      </svg>
    </div>
  );
}
