"use client";

import * as Diff from "diff";
import React from "react";

interface DiffViewerProps {
  oldText: string;
  newText: string;
}

export function DiffViewer({ oldText, newText }: DiffViewerProps) {
  const diffs = Diff.diffWords(oldText, newText);

  return (
    <div className="whitespace-pre-wrap">
      {diffs.map((part: Diff.Change, index: number) => {
        if (part.added) {
          return (
            <span key={index} className="bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200 px-0.5 rounded-sm">
              {part.value}
            </span>
          );
        }
        if (part.removed) {
          return (
            <span key={index} className="bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200 line-through px-0.5 rounded-sm opacity-60">
              {part.value}
            </span>
          );
        }
        return <span key={index}>{part.value}</span>;
      })}
    </div>
  );
}
