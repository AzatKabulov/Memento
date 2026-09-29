export type LegacyFrame = "top" | "center" | "bottom";

export type FocalPoint = { x: number; y: number };

export function clampFocal(value: number): number {
  if (!Number.isFinite(value)) return 50;
  return Math.max(0, Math.min(100, Math.round(value)));
}

export function focalPoint(moment: {
  focalX?: number;
  focalY?: number;
  frame?: LegacyFrame;
}): FocalPoint {
  return {
    x: clampFocal(moment.focalX ?? 50),
    y: clampFocal(
      moment.focalY ??
        (moment.frame === "top" ? 0 : moment.frame === "bottom" ? 100 : 50),
    ),
  };
}

export function photoContentPosition(moment: {
  focalX?: number;
  focalY?: number;
  frame?: LegacyFrame;
}) {
  const { x, y } = focalPoint(moment);
  return { left: `${x}%`, top: `${y}%` } as const;
}

export function frameForFocalY(y: number): LegacyFrame {
  return y < 25 ? "top" : y > 75 ? "bottom" : "center";
}

export function focalAfterDrag(
  start: FocalPoint,
  dx: number,
  dy: number,
  viewport: number,
  imageWidth: number,
  imageHeight: number,
): FocalPoint {
  if (viewport <= 0 || imageWidth <= 0 || imageHeight <= 0) return start;
  const scale = Math.max(viewport / imageWidth, viewport / imageHeight);
  const overflowX = Math.max(0, imageWidth * scale - viewport);
  const overflowY = Math.max(0, imageHeight * scale - viewport);
  return {
    x: overflowX ? clampFocal(start.x - (dx / overflowX) * 100) : 50,
    y: overflowY ? clampFocal(start.y - (dy / overflowY) * 100) : 50,
  };
}
