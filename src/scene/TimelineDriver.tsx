/**
 * TimelineDriver.tsx
 * ---------------------------------------------------------------------------
 * Advances `useTimelineStore.elapsed` every frame while the story is
 * playing, resets it whenever the chapter changes, and hands off to the
 * next chapter automatically once the current one's duration is reached.
 *
 * Mount exactly ONCE inside <Canvas> (see SceneCanvas.tsx). Everything else
 * (CameraRig, BedroomScene's plank-lift, a future subtitle overlay, ...)
 * reads the resulting clock non-reactively via useTimelineStore.getState().
 *
 * NOTE: auto-advancing chapters on a timer is a deliberate "cinematic film"
 * choice — remove the `story.nextChapter()` call below if you'd rather the
 * story only ever advance from explicit user/UI navigation.
 * ---------------------------------------------------------------------------
 */

import { useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { useStoryStore } from "../store/store";
import { useTimelineStore } from "../store/timelineStore";
import { useProgressStore } from "../store/progressStore";
import { dispatchStoryComplete } from "./chapterEvents";
import { getChapterById } from "../data/chapters";

export function TimelineDriver() {
  const currentChapter = useStoryStore((state) => state.currentChapter);

  // Reset the clock the instant the chapter changes, from ANY source
  // (menu click, 'arrow key' nav, or this driver's own auto-advance).
  useEffect(() => {
    useTimelineStore.getState().resetElapsed();
  }, [currentChapter]);

  useFrame((_state, delta) => {
    const story = useStoryStore.getState();
    if (!story.isPlaying) return;

    const timeline = useTimelineStore.getState();
    const chapter = getChapterById(story.currentChapter);
    const nextElapsed = timeline.elapsed + delta * story.playbackSpeed;

    if (chapter && nextElapsed >= chapter.duration) {
      if (story.currentChapter < 8) {
        story.nextChapter(); // triggers the useEffect above, which resets elapsed
      } else {
        // Story complete — hold on the final frame rather than looping.
        timeline.setElapsed(chapter.duration);
        story.setIsPlaying(false);
        useProgressStore.getState().markStoryCompleted(); // durable — drives "Read Again" on a later visit
        dispatchStoryComplete(); // one-off — shows CompletionScreen THIS session only
      }
    } else {
      timeline.setElapsed(nextElapsed);
    }
  }, -1); // negative render priority: ticks before default-priority (0) consumers

  return null;
}
