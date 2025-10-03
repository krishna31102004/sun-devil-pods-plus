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
  return (
    <div
      className={`relative group aspect-square rounded-full flex items-center justify-center border transition ${
        unlocked
          ? 'border-asuMaroon bg-gradient-to-br from-asuMaroon/10 via-transparent to-asuGold/10 text-asuMaroon'
          : 'border-asuGray bg-white text-gray-400 opacity-70'
      }`}
      title={`${badge.name}: ${badge.criteria}`}
    >
      <span className={`text-2xl ${unlocked ? '' : 'grayscale'}`}>{display}</span>
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-500">
        {badge.name.split(' ').slice(0, 2).join(' ')}
      </div>
      <div className="pointer-events-none absolute inset-x-0 -bottom-12 hidden group-hover:flex flex-col items-center text-[11px] text-white">
        <div className="rounded-lg bg-black/80 px-2 py-1 text-center shadow-lg">
          <p className="font-semibold">{badge.name}</p>
          <p className="opacity-80">{badge.criteria}</p>
        </div>
      </div>
    </div>
  );
};

export default BadgeAvatar;
