import React from "react";
import Svg, { Circle, Path } from "react-native-svg";

export function SettingsIcon({ color }: { color: string }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M10.4 2.7h3.2l.5 2.1c.5.2 1 .4 1.4.6l1.9-1.1 2.3 2.3-1.1 1.9c.2.4.4.9.6 1.4l2.1.5v3.2l-2.1.5c-.2.5-.4 1-.6 1.4l1.1 1.9-2.3 2.3-1.9-1.1c-.4.2-.9.4-1.4.6l-.5 2.1h-3.2l-.5-2.1c-.5-.2-1-.4-1.4-.6l-1.9 1.1-2.3-2.3 1.1-1.9c-.2-.4-.4-.9-.6-1.4l-2.1-.5v-3.2l2.1-.5c.2-.5.4-1 .6-1.4L4.3 6.6l2.3-2.3 1.9 1.1c.4-.2.9-.4 1.4-.6l.5-2.1Z"
        stroke={color}
        strokeWidth={1.45}
        strokeLinejoin="round"
      />
      <Circle cx={12} cy={12} r={3.1} stroke={color} strokeWidth={1.45} />
    </Svg>
  );
}

export function ChevronIcon({
  color,
  direction,
}: {
  color: string;
  direction: "left" | "right";
}) {
  return (
    <Svg width={18} height={18} viewBox="0 0 24 24" fill="none">
      <Path
        d={direction === "left" ? "m14.5 5-7 7 7 7" : "m9.5 5 7 7-7 7"}
        stroke={color}
        strokeWidth={1.6}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}

export function CameraIcon({ color }: { color: string }) {
  return (
    <Svg width={26} height={26} viewBox="0 0 26 26" fill="none">
      <Path
        d="M8.5 5.5h9l1.8 2.2h2.1c1 0 1.8.8 1.8 1.8v10.1c0 1-.8 1.8-1.8 1.8H4.6c-1 0-1.8-.8-1.8-1.8V9.5c0-1 .8-1.8 1.8-1.8h2.1l1.8-2.2Z"
        stroke={color}
        strokeWidth={1.65}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Circle cx={13} cy={14.2} r={3.4} stroke={color} strokeWidth={1.65} />
    </Svg>
  );
}

export function PlayIcon({ color }: { color: string }) {
  return (
    <Svg width={9} height={9} viewBox="0 0 9 9" fill="none">
      <Path d="M3 2.1 7 4.5 3 6.9V2.1Z" fill={color} />
    </Svg>
  );
}

export function SoundIcon({ color, muted }: { color: string; muted: boolean }) {
  return (
    <Svg width={20} height={20} viewBox="0 0 24 24" fill="none">
      <Path
        d="M11 5 6 9H3v6h3l5 4V5Z"
        stroke={color}
        strokeWidth={1.7}
        strokeLinejoin="round"
      />
      <Path
        d={
          muted
            ? "m16 9 6 6m0-6-6 6"
            : "M15 8a6 6 0 0 1 0 8m3-11a10 10 0 0 1 0 14"
        }
        stroke={color}
        strokeWidth={1.7}
        strokeLinecap="round"
      />
    </Svg>
  );
}
