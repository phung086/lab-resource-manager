import { useId } from 'react';

// A lightweight, scalable LAB character shared by the launcher and chat.
export function RobotMascot({ className = '' }: { className?: string }) {
  const id = useId().replace(/:/g, '');
  return <svg className={`lab-robot ${className}`} viewBox="0 0 120 136" fill="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={`${id}-shell`} x1="24" y1="25" x2="100" y2="112" gradientUnits="userSpaceOnUse"><stop stopColor="#fff"/><stop offset="1" stopColor="#e5ddff"/></linearGradient>
      <linearGradient id={`${id}-purple`} x1="30" y1="35" x2="85" y2="110" gradientUnits="userSpaceOnUse"><stop stopColor="#8b6aef"/><stop offset="1" stopColor="#6441d9"/></linearGradient>
    </defs>
    <ellipse cx="60" cy="128" rx="32" ry="5" fill="#49318b" fillOpacity=".13"/>
    <path d="M60 27V15" stroke="#6441d9" strokeWidth="5" strokeLinecap="round"/>
    <circle cx="60" cy="10" r="6" fill="#ab91f3" stroke="#6441d9" strokeWidth="2"/>
    <path d="M35 85C23 85 18 95 17 103" stroke="#6441d9" strokeWidth="13" strokeLinecap="round"/>
    <circle cx="17" cy="105" r="8" fill={`url(#${id}-shell)`} stroke="#b5a2e9" strokeWidth="2"/>
    <path d="M89 83C101 79 102 67 103 61" stroke="#6441d9" strokeWidth="12" strokeLinecap="round"/>
    <path className="lab-robot-hand" d="M101 63L97 54M103 61L106 49M105 64L113 56" stroke="#ab91f3" strokeWidth="6" strokeLinecap="round"/>
    <rect x="39" y="108" width="17" height="15" rx="7" fill="#6441d9"/>
    <rect x="65" y="108" width="17" height="15" rx="7" fill="#6441d9"/>
    <rect x="32" y="77" width="57" height="39" rx="19" fill={`url(#${id}-shell)`} stroke="#b5a2e9" strokeWidth="2"/>
    <path d="M45 91H75" stroke="#cab9fa" strokeWidth="3" strokeLinecap="round"/>
    <path d="M56 96V101L51 107H70L64 101V96" fill={`url(#${id}-purple)`}/>
    <path d="M56 96H64" stroke="#6441d9" strokeWidth="2" strokeLinecap="round"/>
    <rect x="17" y="45" width="11" height="22" rx="5.5" fill="#9f85e8"/>
    <rect x="93" y="45" width="11" height="22" rx="5.5" fill="#9f85e8"/>
    <rect x="23" y="25" width="76" height="59" rx="24" fill={`url(#${id}-shell)`} stroke="#b5a2e9" strokeWidth="2"/>
    <rect x="31" y="36" width="60" height="36" rx="16" fill="#302155"/>
    <g className="lab-robot-eyes" fill="#d8fff3"><rect x="43" y="46" width="8" height="13" rx="4"/><rect x="70" y="46" width="8" height="13" rx="4"/></g>
    <path d="M57 61Q61 65 65 61" stroke="#d8fff3" strokeWidth="2" strokeLinecap="round"/>
    <path d="M36 31C40 28 48 27 52 27" stroke="#fff" strokeWidth="3" strokeLinecap="round"/>
  </svg>;
}
