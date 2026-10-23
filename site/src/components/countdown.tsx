"use client";
import { useEffect, useState } from "react";
export function Countdown({
  target,
  now: initialNow,
}: {
  target: string;
  now: number;
}) {
  const [now, setNow] = useState(initialNow);
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) setNow(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.floor((Date.parse(target) - now) / 1000));
  const days = Math.floor(seconds / 86400);
  return (
    <span>
      {days > 0 && `${days}z `}
      {String(Math.floor(seconds / 3600) % 24).padStart(2, "0")}:
      {String(Math.floor(seconds / 60) % 60).padStart(2, "0")}:
      {String(seconds % 60).padStart(2, "0")}
    </span>
  );
}
