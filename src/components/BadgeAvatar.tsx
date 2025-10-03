import React from 'react';

type BadgeAvatarProps = {
  badge: {
    id: string;
    name: string;
    icon?: string;
    criteria: string;
  };
  unlocked: boolean;
};

const BadgeAvatar: React.FC<BadgeAvatarProps> = ({ badge, unlocked }) => {
  const display = badge.icon || badge.name.slice(0, 1).toUpperCase();
  const ringClass = unlocked
    ? 'bg-gradient-to-br from-asuMaroon via-asuGold to-asuMaroon'
    : 'bg-asuGray/40';
  const faceClass = unlocked ? 'text-asuMaroon' : 'text-gray-400 grayscale';

  return (
    <div className="group relative flex flex-col items-center gap-2">
      <div className={`${ringClass} rounded-full p-[2px] shadow`} aria-hidden="true">
        <div className={`flex h-16 w-16 items-center justify-center rounded-full bg-white/95 shadow-inner transition ${faceClass}`}>
          <span className="text-2xl">{display}</span>
        </div>
      </div>
      <p className={`text-center text-[11px] font-semibold leading-tight ${unlocked ? 'text-asuMaroon/80' : 'text-gray-400'}`}>
        {badge.name}
      </p>
      <div className="pointer-events-none absolute inset-x-1/2 -bottom-16 hidden -translate-x-1/2 flex-col items-center group-hover:flex">
        <div className="w-40 rounded-lg bg-black/80 px-3 py-2 text-center text-[11px] text-white shadow-lg">
          <p className="font-semibold">{badge.name}</p>
          <p className="text-white/80">{badge.criteria}</p>
        </div>
      </div>
    </div>
  );
};

export default BadgeAvatar;
