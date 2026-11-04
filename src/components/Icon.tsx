// 앱에서 쓰는 선 아이콘 몇 개 (24px 격자, 1.8 굵기)
const PATHS = {
  home: <path d="M4 10.5 12 4l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5.5h-5V20H5a1 1 0 0 1-1-1z" />,
  pen: (
    <>
      <path d="M5 19h3.5L18.5 9 15 5.5 5 15.5z" />
      <path d="M13 7.5 16.5 11" />
    </>
  ),
  list: (
    <>
      <path d="M9 7h11M9 12h11M9 17h11" />
      <path d="M4.5 7h.01M4.5 12h.01M4.5 17h.01" strokeWidth="2.6" />
    </>
  ),
  sliders: (
    <>
      <path d="M4 8h9M17 8h3M4 16h3M11 16h9" />
      <circle cx="15" cy="8" r="2" />
      <circle cx="9" cy="16" r="2" />
    </>
  ),
  hanger: (
    <>
      <path d="M10 6.5a2 2 0 1 1 2.6 1.9c-.4.1-.6.5-.6.9V10" />
      <path d="M12 10 3.8 15.6A1.4 1.4 0 0 0 4.6 18h14.8a1.4 1.4 0 0 0 .8-2.4z" />
    </>
  ),
  check: <path d="M5 12.5 10 17l9-10" strokeWidth="2.6" />,
  left: <path d="M14.5 6 8.5 12l6 6" />,
  right: <path d="M9.5 6l6 6-6 6" />,
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name }: { name: IconName }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}
