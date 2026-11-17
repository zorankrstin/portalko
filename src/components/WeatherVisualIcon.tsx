import React, { useId } from 'react';

export type WeatherConditionType =
  | 'clear'
  | 'mostly-clear'
  | 'partly-cloudy'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

export interface WeatherVisualMeta {
  type: WeatherConditionType;
  description: string;
  backdropClass: string;
  accentClass: string;
}

export function getWeatherVisualMeta(code: number, isDay = true): WeatherVisualMeta {
  if (code === 0) {
    return {
      type: 'clear',
      description: isDay ? 'Jasno in sončno' : 'Jasna noč',
      backdropClass: isDay
        ? 'bg-amber-500/12 border-amber-500/25'
        : 'bg-indigo-500/12 border-indigo-400/25',
      accentClass: isDay ? 'text-amber-500' : 'text-indigo-400',
    };
  }
  if (code === 1) {
    return {
      type: 'mostly-clear',
      description: 'Pretežno jasno',
      backdropClass: isDay
        ? 'bg-amber-400/10 border-amber-400/25'
        : 'bg-indigo-500/10 border-indigo-400/20',
      accentClass: isDay ? 'text-amber-500' : 'text-indigo-400',
    };
  }
  if (code === 2) {
    return {
      type: 'partly-cloudy',
      description: 'Delno oblačno',
      backdropClass: 'bg-sky-500/10 border-sky-500/20',
      accentClass: 'text-sky-500',
    };
  }
  if (code === 3) {
    return {
      type: 'cloudy',
      description: 'Pretežno oblačno',
      backdropClass: 'bg-slate-400/12 border-slate-400/25',
      accentClass: 'text-slate-500',
    };
  }
  if (code === 45 || code === 48) {
    return {
      type: 'fog',
      description: 'Megla',
      backdropClass: 'bg-slate-400/15 border-slate-400/25',
      accentClass: 'text-slate-400',
    };
  }
  if (code >= 51 && code <= 57) {
    return {
      type: 'drizzle',
      description: 'Rahlo rosenje',
      backdropClass: 'bg-sky-500/12 border-sky-500/25',
      accentClass: 'text-sky-500',
    };
  }
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return {
      type: 'rain',
      description: 'Dež / Plohe',
      backdropClass: 'bg-blue-500/12 border-blue-500/25',
      accentClass: 'text-blue-500',
    };
  }
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return {
      type: 'snow',
      description: 'Sneženje',
      backdropClass: 'bg-cyan-400/12 border-cyan-400/25',
      accentClass: 'text-cyan-500',
    };
  }
  if (code >= 95 && code <= 99) {
    return {
      type: 'storm',
      description: 'Nevihta z grmenjem',
      backdropClass: 'bg-amber-600/12 border-amber-500/30',
      accentClass: 'text-amber-500',
    };
  }
  return {
    type: 'cloudy',
    description: 'Zmerno oblačno',
    backdropClass: 'bg-slate-400/10 border-slate-400/20',
    accentClass: 'text-slate-400',
  };
}

interface WeatherVisualIconProps {
  code: number;
  isDay?: boolean;
  size?: 'hero' | 'compact';
  animated?: boolean;
  className?: string;
}

export function WeatherVisualIcon({
  code,
  isDay = true,
  size = 'compact',
  animated = true,
  className = '',
}: WeatherVisualIconProps) {
  const uid = useId().replace(/:/g, '');
  const meta = getWeatherVisualMeta(code, isDay);
  const dimClass = size === 'hero' ? 'w-11 h-11' : 'w-7 h-7';
  const sunSpinClass = animated ? 'weather-sun-spin' : '';
  const cloudFloatClass = animated ? 'weather-cloud-float' : '';
  const rainDrop1Class = animated ? 'weather-rain-drop-1' : '';
  const rainDrop2Class = animated ? 'weather-rain-drop-2' : '';
  const rainDrop3Class = animated ? 'weather-rain-drop-3' : '';
  const snowFlake1Class = animated ? 'weather-snow-1' : '';
  const snowFlake2Class = animated ? 'weather-snow-2' : '';
  const stormBoltClass = animated ? 'weather-lightning-flash' : '';

  const sunGradId = `sun-grad-${uid}`;
  const sunGlowId = `sun-glow-${uid}`;
  const moonGradId = `moon-grad-${uid}`;
  const cloudLightId = `cloud-light-${uid}`;
  const cloudDarkId = `cloud-dark-${uid}`;
  const dropGradId = `drop-grad-${uid}`;

  const renderSun = (cx: number, cy: number, r: number, rayInner: number, rayOuter: number) => (
    <g transform={`translate(${cx}, ${cy})`}>
      <circle cx={0} cy={0} r={r * 1.45} fill={`url(#${sunGlowId})`} opacity="0.55" />
      <g className={sunSpinClass}>
        {[0, 45, 90, 135, 180, 225, 270, 315].map((angle) => {
          const rad = (angle * Math.PI) / 180;
          const x1 = Math.cos(rad) * rayInner;
          const y1 = Math.sin(rad) * rayInner;
          const x2 = Math.cos(rad) * rayOuter;
          const y2 = Math.sin(rad) * rayOuter;
          return (
            <line
              key={angle}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="#f59e0b"
              strokeWidth="2.4"
              strokeLinecap="round"
            />
          );
        })}
      </g>
      <circle cx={0} cy={0} r={r} fill={`url(#${sunGradId})`} />
    </g>
  );

  const renderMoon = (cx: number, cy: number, scale = 1) => (
    <g transform={`translate(${cx}, ${cy}) scale(${scale})`}>
      <path
        d="M2 -10 C-4.5 -9.5 -9.5 -4.2 -9.5 2.2 C-9.5 8.8 -4.2 14 2.5 14 C6.8 14 10.6 11.7 12.6 8.2 C7.8 9.2 3.2 6.5 2.1 1.7 C1 -2.9 3.2 -7.4 7.3 -9.4 C5.6 -9.9 3.8 -10.1 2 -10 Z"
        fill={`url(#${moonGradId})`}
      />
      <circle cx="-11" cy="-7" r="1.3" fill="#c7d2fe" opacity="0.9" />
      <circle cx="11" cy="-5" r="1.1" fill="#e0e7ff" opacity="0.85" />
      <circle cx="12" cy="4" r="0.9" fill="#c7d2fe" opacity="0.7" />
    </g>
  );

  const renderCloud = (fillId: string, yOffset = 0, scale = 1, xOffset = 0) => (
    <g transform={`translate(${xOffset}, ${yOffset}) scale(${scale})`} className={cloudFloatClass}>
      <path
        d="M18 39 H44 C49.5 39 54 34.8 54 29.5 C54 24.7 50.3 20.8 45.6 20.1 C44.2 13.7 38.5 9 31.7 9 C24.3 9 18.2 14.7 17.5 22 C13.2 22.5 10 26.1 10 30.5 C10 35.2 13.6 39 18 39 Z"
        fill={`url(#${fillId})`}
        stroke="rgba(148, 163, 184, 0.28)"
        strokeWidth="1"
        strokeLinejoin="round"
      />
    </g>
  );

  return (
    <svg
      viewBox="0 0 64 64"
      className={`${dimClass} shrink-0 overflow-visible select-none ${className}`}
      role="img"
      aria-label={meta.description}
    >
      <defs>
        <linearGradient id={sunGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#fde047" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ea580c" />
        </linearGradient>
        <radialGradient id={sunGlowId} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.65" />
          <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={moonGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#e0e7ff" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
        <linearGradient id={cloudLightId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="65%" stopColor="#e2e8f0" />
          <stop offset="100%" stopColor="#cbd5e1" />
        </linearGradient>
        <linearGradient id={cloudDarkId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#94a3b8" />
          <stop offset="55%" stopColor="#64748b" />
          <stop offset="100%" stopColor="#475569" />
        </linearGradient>
        <linearGradient id={dropGradId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#38bdf8" />
          <stop offset="100%" stopColor="#0284c7" />
        </linearGradient>
      </defs>

      {meta.type === 'clear' && (isDay ? renderSun(32, 32, 12, 16.5, 22) : renderMoon(31, 30, 1.35))}

      {meta.type === 'mostly-clear' && (
        <>
          {isDay ? renderSun(25, 24, 9.5, 13, 17.5) : renderMoon(24, 24, 1.05)}
          {renderCloud(cloudLightId, 11, 0.85, 8)}
        </>
      )}

      {meta.type === 'partly-cloudy' && (
        <>
          {isDay ? renderSun(41, 21, 8.5, 11.5, 15.5) : renderMoon(42, 20, 0.95)}
          {renderCloud(cloudLightId, 11, 0.95, -2)}
        </>
      )}

      {meta.type === 'cloudy' && (
        <>
          {renderCloud(cloudDarkId, 2, 0.72, 11)}
          {renderCloud(cloudLightId, 11, 0.96, -2)}
        </>
      )}

      {meta.type === 'fog' && (
        <>
          {renderCloud(cloudLightId, 4, 0.9, 0)}
          <g className={cloudFloatClass}>
            <line x1="12" y1="45" x2="52" y2="45" stroke="#94a3b8" strokeWidth="3" strokeLinecap="round" opacity="0.85" />
            <line x1="17" y1="51" x2="47" y2="51" stroke="#cbd5e1" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
            <line x1="22" y1="57" x2="42" y2="57" stroke="#94a3b8" strokeWidth="2.6" strokeLinecap="round" opacity="0.7" />
          </g>
        </>
      )}

      {meta.type === 'drizzle' && (
        <>
          {renderCloud(cloudLightId, 4, 0.95, 0)}
          <g>
            <line x1="23" y1="44" x2="21" y2="50" stroke={`url(#${dropGradId})`} strokeWidth="2.3" strokeLinecap="round" className={rainDrop1Class} />
            <line x1="33" y1="45" x2="31" y2="51" stroke={`url(#${dropGradId})`} strokeWidth="2.3" strokeLinecap="round" className={rainDrop2Class} />
            <line x1="42" y1="44" x2="40" y2="50" stroke={`url(#${dropGradId})`} strokeWidth="2.3" strokeLinecap="round" className={rainDrop3Class} />
          </g>
        </>
      )}

      {meta.type === 'rain' && (
        <>
          {renderCloud(cloudDarkId, 3, 0.96, 0)}
          <g>
            <line x1="21" y1="43" x2="18" y2="53" stroke={`url(#${dropGradId})`} strokeWidth="2.8" strokeLinecap="round" className={rainDrop1Class} />
            <line x1="31" y1="44" x2="28" y2="55" stroke={`url(#${dropGradId})`} strokeWidth="2.8" strokeLinecap="round" className={rainDrop2Class} />
            <line x1="41" y1="43" x2="38" y2="53" stroke={`url(#${dropGradId})`} strokeWidth="2.8" strokeLinecap="round" className={rainDrop3Class} />
          </g>
        </>
      )}

      {meta.type === 'snow' && (
        <>
          {renderCloud(cloudLightId, 3, 0.95, 0)}
          <g fill="#38bdf8" stroke="#bae6fd" strokeWidth="0.8">
            <g className={snowFlake1Class}>
              <circle cx="22" cy="48" r="2.2" />
              <circle cx="42" cy="47" r="2.2" />
            </g>
            <g className={snowFlake2Class}>
              <circle cx="32" cy="52" r="2.5" />
              <circle cx="27" cy="56" r="1.8" />
            </g>
          </g>
        </>
      )}

      {meta.type === 'storm' && (
        <>
          {renderCloud(cloudDarkId, 2, 0.96, 0)}
          <path
            d="M34 38 L27 49 H33 L29 59 L40 46 H34 L38 38 Z"
            fill="#fbbf24"
            stroke="#f59e0b"
            strokeWidth="0.9"
            strokeLinejoin="round"
            className={stormBoltClass}
          />
          <line x1="20" y1="44" x2="17" y2="52" stroke={`url(#${dropGradId})`} strokeWidth="2.4" strokeLinecap="round" className={rainDrop1Class} />
          <line x1="44" y1="44" x2="41" y2="52" stroke={`url(#${dropGradId})`} strokeWidth="2.4" strokeLinecap="round" className={rainDrop3Class} />
        </>
      )}
    </svg>
  );
}
