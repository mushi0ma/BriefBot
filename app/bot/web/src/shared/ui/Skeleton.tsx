"use client";
import React from 'react';

interface SkeletonProps {
  className?: string;
}

/** Reusable shimmer skeleton block. Uses `.skeleton` class from globals.css. */
export function Skeleton({ className = "" }: SkeletonProps) {
  return <div className={`skeleton ${className}`} />;
}

/** Skeleton for a list row (icon + two lines). */
export function SkeletonRow() {
  return (
    <div className="tg-list-item">
      <div className="skeleton w-[30px] h-[30px] rounded-xl shrink-0" />
      <div className="flex-1 space-y-2">
        <div className="skeleton h-3.5 w-3/5" />
        <div className="skeleton h-3 w-2/5" />
      </div>
    </div>
  );
}

/** Skeleton for a full section card with multiple rows. */
export function SkeletonSection({ rows = 3 }: { rows?: number }) {
  return (
    <div className="mx-4 tg-section rounded-xl animate-in">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className={i > 0 ? "border-t border-[var(--tg-separator)]" : ""}>
          <SkeletonRow />
        </div>
      ))}
    </div>
  );
}

/** Skeleton for a color palette grid (settings). */
export function SkeletonColorGrid() {
  return (
    <div className="mx-4 tg-section rounded-xl p-4 animate-in">
      <div className="flex flex-wrap gap-3 justify-center">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="skeleton w-11 h-11 rounded-full" />
        ))}
      </div>
    </div>
  );
}
