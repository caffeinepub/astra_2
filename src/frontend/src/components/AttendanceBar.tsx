interface AttendanceBarProps {
  rate: number; // 0-100
  showLabel?: boolean;
  size?: "sm" | "md" | "lg";
}

function getBarColor(rate: number): string {
  if (rate >= 75) return "bg-success";
  if (rate >= 50) return "bg-warning";
  return "bg-destructive";
}

function getRateLabel(rate: number): string {
  if (rate >= 75) return "Good";
  if (rate >= 50) return "Warning";
  return "Critical";
}

export default function AttendanceBar({
  rate,
  showLabel = true,
  size = "md",
}: AttendanceBarProps) {
  const heightClass = size === "sm" ? "h-1.5" : size === "lg" ? "h-3" : "h-2";
  const clampedRate = Math.max(0, Math.min(100, rate));

  return (
    <div className="space-y-1">
      {showLabel && (
        <div className="flex items-center justify-between">
          <span
            className={`text-xs font-medium ${
              clampedRate >= 75
                ? "text-success"
                : clampedRate >= 50
                  ? "text-warning"
                  : "text-destructive"
            }`}
          >
            {clampedRate.toFixed(1)}%
          </span>
          <span className="text-xs text-muted-foreground">
            {getRateLabel(clampedRate)}
          </span>
        </div>
      )}
      <div
        className={`w-full ${heightClass} rounded-full bg-secondary/80 overflow-hidden`}
      >
        <div
          className={`${heightClass} rounded-full transition-all duration-700 ease-out ${getBarColor(clampedRate)}`}
          style={{ width: `${clampedRate}%` }}
        />
      </div>
    </div>
  );
}
