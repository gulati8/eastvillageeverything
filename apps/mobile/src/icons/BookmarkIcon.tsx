import React from 'react';
import Svg, { Path } from 'react-native-svg';

type BookmarkIconProps = {
  color: string;
  size?: number;
  filled?: boolean;
};

export function BookmarkIcon({ color, size = 22, filled = false }: BookmarkIconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M7 4.75C7 4.33579 7.33579 4 7.75 4H16.25C16.6642 4 17 4.33579 17 4.75V19L12 15.75L7 19V4.75Z"
        fill={filled ? color : 'none'}
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
