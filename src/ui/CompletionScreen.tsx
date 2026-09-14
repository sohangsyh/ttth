/**
 * CompletionScreen.tsx
 * ---------------------------------------------------------------------------
 * Shown once, the moment Chapter 8 finishes playing (see TimelineDriver.tsx's
 * dispatchStoryComplete() call — NOT driven by progressStore's persisted
 * `storyCompleted` flag directly, which would otherwise re-trigger this on
 * every page reload once someone's finished it once).
 *
 * Dismissible rather than a hard wall — Chapter 8 is still fully explorable
 * (free camera, floorboard clicking, the works) underneath it.
 * ---------------------------------------------------------------------------
 */

import { useState } from "react";
import { Share2, RotateCcw, X, Heart, Clock, Activity } from "lucide-react";
import { getPlaythroughSummary, resetPlaythroughStats } from "../scene/playthroughStats";
import { useStoryStore } from "../store/store";

function formatDuration(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${String(seconds).padStart(2, "0")}s`;
}

async function shareExperience(): Promise<"shared" | "copied" | "failed"> {
  const shareData = {
    title: "The Tell-Tale Heart",
    text: "I just went through an interactive telling of Poe's \"The Tell-Tale Heart\" — spatial audio, a rising heartbeat, the works.",
    url: typeof window !== "undefined" ? window.location.href : undefined,
  };

  if (typeof navigator !== "undefined" && navigator.share) {
    try {
      await navigator.share(shareData);
      return "shared";
    } catch {
      // User cancelled the share sheet, or it failed — fall through to clipboard.
    }
  }

  if (typeof navigator !== "undefined" && navigator.clipboard && shareData.url) {
    try {
      await navigator.clipboard.writeText(shareData.url);
      return "copied";
    } catch {
      return "failed";
    }
  }

  return "failed";
}

export function CompletionScreen({ onDismiss }: { onDismiss: () => void }) {
  const [shareStatus, setShareStatus] = useState<"idle" | "shared" | "copied" | "failed">("idle");
  const summary = getPlaythroughSummary();

  const handleShare = async () => {
    const result = await shareExperience();
    setShareStatus(result);
    window.setTimeout(() => setShareStatus("idle"), 2500);
  };

  const handleReplay = () => {
    resetPlaythroughStats();
    useStoryStore.getState().setChapter(1);
    onDismiss();
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-8 bg-black/90 px-6 text-center backdrop-blur-sm">
      <button
        type="button"
        onClick={onDismiss}
        aria-label="Close"
        className="absolute right-4 top-4 rounded-sm p-2 text-stone-500 transition-colors hover:text-stone-200 sm:right-6 sm:top-6"
      >
        <X size={18} />
      </button>

      <div className="max-w-md">
        <p className="text-[11px] uppercase tracking-[0.3em] text-stone-500">The confession is finished</p>
        <p className="mt-3 font-serif text-3xl italic tracking-wide text-stone-100/95">
          "villains! — dissemble no more!"
        </p>
        <p className="mt-4 text-sm leading-relaxed text-stone-400">
          The tale ends where it began — with a claim of sanity, undone by a single, unbearable heartbeat.
        </p>
      </div>

      <div className="grid w-full max-w-xs grid-cols-3 gap-3 border-y border-stone-100/10 py-5">
        <div>
          <Clock size={16} className="mx-auto mb-1.5 text-amber-300/80" />
          <p className="font-serif text-lg tabular-nums text-stone-100">{formatDuration(summary.elapsedSeconds)}</p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500">Time</p>
        </div>
        <div>
          <Heart size={16} className="mx-auto mb-1.5 text-amber-300/80" />
          <p className="font-serif text-lg tabular-nums text-stone-100">{summary.averageHeartRate} bpm</p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500">Average</p>
        </div>
        <div>
          <Activity size={16} className="mx-auto mb-1.5 text-amber-300/80" />
          <p className="font-serif text-lg tabular-nums text-stone-100">{summary.peakHeartRate} bpm</p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-stone-500">Peak</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3">
        <button
          type="button"
          onClick={handleShare}
          className="flex items-center gap-2 rounded-sm border border-amber-200/30 bg-amber-300/10 px-6 py-2.5 text-xs uppercase tracking-[0.15em] text-amber-100 transition-colors hover:bg-amber-300/20"
        >
          <Share2 size={14} />
          {shareStatus === "shared" && "Shared"}
          {shareStatus === "copied" && "Link Copied"}
          {shareStatus === "failed" && "Couldn't Share"}
          {shareStatus === "idle" && "Share Experience"}
        </button>

        <button
          type="button"
          onClick={handleReplay}
          className="flex items-center gap-2 text-[11px] uppercase tracking-[0.15em] text-stone-500 hover:text-stone-300"
        >
          <RotateCcw size={12} />
          Read It Again
        </button>
      </div>
    </div>
  );
}
