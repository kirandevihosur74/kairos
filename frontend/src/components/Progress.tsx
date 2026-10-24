import type { HTMLAttributes } from "react";

function cn(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

export interface MiniProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  max?: number;
  height?: number;
}

export function MiniProgress({
  value,
  max = 1,
  height = 6,
  className,
  style,
  ...rest
}: MiniProgressProps) {
  const pct = Math.max(0, Math.min(1, max > 0 ? value / max : 0));
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(pct * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
      className={cn(
        "w-full overflow-hidden rounded-full bg-subtle",
        className,
      )}
      style={{ height, ...style }}
      {...rest}
    >
      <div
        className="h-full rounded-full bg-spectrum"
        style={{ width: `${pct * 100}%` }}
      />
    </div>
  );
}

export interface GoalProgressProps extends HTMLAttributes<HTMLDivElement> {
  value: number;
  goal: number;
  gap?: number;
}

export function GoalProgress({
  value,
  goal,
  gap = 4,
  className,
  ...rest
}: GoalProgressProps) {
  const filled = Math.max(0, Math.min(goal, Math.round(value)));
  return (
    <div
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={goal}
      className={cn("flex w-full", className)}
      style={{ gap }}
      {...rest}
    >
      {Array.from({ length: goal }).map((_, i) => (
        <span
          key={i}
          className={cn(
            "h-2 flex-1 rounded-full",
            i < filled ? "bg-spectrum" : "bg-subtle",
          )}
        />
      ))}
    </div>
  );
}

export interface WaveformProgressProps extends HTMLAttributes<HTMLDivElement> {
  progress: number;
  bars?: number;
  heights?: number[];
}

const DEFAULT_HEIGHTS = [
  10, 14, 20, 16, 24, 28, 20, 18, 24, 30, 22, 16, 20, 26, 22, 14, 18, 22, 26,
  18, 14, 20, 24,
];

export function WaveformProgress({
  progress,
  bars = DEFAULT_HEIGHTS.length,
  heights = DEFAULT_HEIGHTS,
  className,
  ...rest
}: WaveformProgressProps) {
  const pct = Math.max(0, Math.min(1, progress));
  const elapsed = Math.round(pct * bars);
  return (
    <div
      className={cn("flex h-8 items-center gap-[3px]", className)}
      {...rest}
    >
      {Array.from({ length: bars }).map((_, i) => {
        const h = heights[i % heights.length] ?? 16;
        return (
          <span
            key={i}
            className={cn(
              "w-[3px] rounded-full",
              i < elapsed ? "bg-spectrum" : "bg-line",
            )}
            style={{ height: h }}
          />
        );
      })}
    </div>
  );
}
