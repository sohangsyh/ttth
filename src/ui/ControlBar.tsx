/**
 * ControlBar.tsx
 * ---------------------------------------------------------------------------
 * The bottom cinematic control bar: play/pause, an 8-segment chapter
 * scrubber, a playback-speed selector, and the current chapter indicator.
 *
 * Performance note: the scrubber's fill animation is driven by directly
 * mutating a DOM node's `style.width` inside a requestAnimationFrame loop
 * (see ChapterFillBar below) rather than through React state — this needs
 * to update smoothly at 60fps, and skipping React's render cycle entirely
 * for that is both simpler and cheaper than forcing a per-frame re-render.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useRef } from "react";
import { Play, Pause, ChevronLeft, ChevronRight } from "lucide-react";
import { useStoryStore, PLAYBACK_SPEEDS, type PlaybackSpeed } from "../store/store";
import { useTimelineStore } from "../store/timelineStore";
import { CHAPTERS, TOTAL_CHAPTERS } from "../data/chapters";

// ----------------------------------------------------------------------------
// Per-chapter progress segment
// ----------------------------------------------------------------------------

function ChapterFillBar({ chapterId, duration }: { chapterId: number; duration: number }) {
  const currentChapter = useStoryStore((state) => state.currentChapter);
  const fillRef = useRef<HTMLDivElement>(null);
  const isActive = chapterId === currentChapter;
  const isComplete = chapterId < currentChapter;

  useEffect(() => {
    if (!isActive) return;
    let frameId: number;
    const tick = () => {
      const { elapsed } = useTimelineStore.getState();
      const pct = Math.min(1, duration > 0 ? elapsed / duration : 0) * 100;
      if (fillRef.current) fillRef.current.style.width = `${pct}%`;
      frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [isActive, duration]);

  return (
    <div className="h-full w-full overflow-hidden rounded-[1px] bg-stone-100/10">
      <div
        ref={fillRef}
        className="h-full bg-amber-300/90"
        style={{ width: isComplete ? "100%" : isActive ? "0%" : "0%" }}
      />
    </div>
  );
}

function ChapterScrubber() {
  const setChapter = useStoryStore((state) => state.setChapter);

  return (
    <div className="flex w-full items-center gap-1">
      {CHAPTERS.map((chapter) => (
        <button
          key={chapter.id}
          type="button"
          onClick={() => setChapter(chapter.id)}
          title={chapter.title}
          aria-label={`Jump to ${chapter.title}`}
          className="group h-2.5 flex-1 cursor-pointer"
        >
          <div className="h-1 w-full transition-[height] duration-150 group-hover:h-1.5">
            <ChapterFillBar chapterId={chapter.id} duration={chapter.duration} />
          </div>
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Playback speed selector
// ----------------------------------------------------------------------------

function SpeedSelector() {
  const playbackSpeed = useStoryStore((state) => state.playbackSpeed);
  const setPlaybackSpeed = useStoryStore((state) => state.setPlaybackSpeed);

  return (
    <div className="flex items-center gap-0.5 rounded-sm border border-stone-100/10 bg-black/30 p-0.5">
      {PLAYBACK_SPEEDS.map((speed: PlaybackSpeed) => (
        <button
          key={speed}
          type="button"
          onClick={() => setPlaybackSpeed(speed)}
          className={`rounded-[2px] px-1.5 py-1 text-[11px] tabular-nums transition-colors sm:px-2 sm:text-xs ${
            playbackSpeed === speed
              ? "bg-amber-300/90 text-black"
              : "text-stone-300/70 hover:bg-stone-100/10 hover:text-stone-100"
          }`}
        >
          {speed}×
        </button>
      ))}
    </div>
  );
}

// ----------------------------------------------------------------------------
// Assembled control bar
// ----------------------------------------------------------------------------

export function ControlBar() {
  const isPlaying = useStoryStore((state) => state.isPlaying);
  const togglePlay = useStoryStore((state) => state.togglePlay);
  const currentChapter = useStoryStore((state) => state.currentChapter);
  const nextChapter = useStoryStore((state) => state.nextChapter);
  const previousChapter = useStoryStore((state) => state.previousChapter);

  const chapter = CHAPTERS[currentChapter - 1];

  return (
    <div className="pointer-events-auto fixed inset-x-0 bottom-0 z-40 border-t border-amber-100/10 bg-black/60 backdrop-blur-md">
      <div className="mx-auto max-w-5xl px-4 pt-3 sm:px-8">
        <ChapterScrubber />

        <div className="flex items-center justify-between gap-2 py-3 sm:gap-4">
          {/* Chapter indicator + prev/next */}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <button
              type="button"
              onClick={previousChapter}
              disabled={currentChapter <= 1}
              aria-label="Previous chapter"
              className="rounded-sm p-1 text-stone-400 transition-colors hover:text-amber-200 disabled:opacity-30 disabled:hover:text-stone-400"
            >
              <ChevronLeft size={16} />
            </button>
            <div className="min-w-0 leading-tight">
              <div className="text-[11px] uppercase tracking-[0.14em] text-stone-400/80">
                Chapter {currentChapter} of {TOTAL_CHAPTERS}
              </div>
              <div className="truncate font-serif text-sm italic text-stone-100/90">{chapter.title}</div>
            </div>
            <button
              type="button"
              onClick={nextChapter}
              disabled={currentChapter >= TOTAL_CHAPTERS}
              aria-label="Next chapter"
              className="rounded-sm p-1 text-stone-400 transition-colors hover:text-amber-200 disabled:opacity-30 disabled:hover:text-stone-400"
            >
              <ChevronRight size={16} />
            </button>
          </div>

          {/* Play / pause */}
          <button
            type="button"
            onClick={togglePlay}
            aria-label={isPlaying ? "Pause" : "Play"}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-amber-200/30 bg-amber-300/10 text-amber-100 transition-colors hover:bg-amber-300/20 sm:h-11 sm:w-11"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" className="ml-0.5" />}
          </button>

          {/* Speed selector */}
          <div className="flex flex-1 justify-end">
            <SpeedSelector />
          </div>
        </div>
      </div>
    </div>
  );
}
