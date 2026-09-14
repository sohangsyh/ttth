/**
 * useActiveSubtitle.ts
 * ---------------------------------------------------------------------------
 * Returns the SubtitleCue active right now, combining `currentChapter`
 * (useStoryStore) with `elapsed` (useTimelineStore).
 *
 * Both of those stores are read via `.getState()` inside a requestAnimationFrame
 * poll loop rather than as reactive hook subscriptions — `elapsed` changes
 * 60x/second, but the *active subtitle* only changes every few seconds, so
 * subscribing directly would re-render this component 60x/second for no
 * visual benefit. The setState call below uses a functional updater that
 * returns the previous cue object by reference when nothing changed, which
 * lets React bail out of re-rendering entirely on ticks where the subtitle
 * is unchanged.
 * ---------------------------------------------------------------------------
 */

import { useEffect, useState } from "react";
import { useStoryStore } from "../store/store";
import { useTimelineStore } from "../store/timelineStore";
import { getActiveSubtitle, type SubtitleCue } from "../data/chapters";

function readActiveCue(): SubtitleCue | undefined {
  const { currentChapter } = useStoryStore.getState();
  const { elapsed } = useTimelineStore.getState();
  return getActiveSubtitle(currentChapter, elapsed);
}

export function useActiveSubtitle(): SubtitleCue | undefined {
  const [cue, setCue] = useState<SubtitleCue | undefined>(readActiveCue);

  useEffect(() => {
    let frameId: number;

    const poll = () => {
      const next = readActiveCue();
      setCue((prev) => (prev?.id === next?.id ? prev : next)); // bails out if identical
      frameId = requestAnimationFrame(poll);
    };

    frameId = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frameId);
  }, []);

  return cue;
}
