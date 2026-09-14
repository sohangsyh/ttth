/**
 * chapters.ts
 * ---------------------------------------------------------------------------
 * Static narrative data for "The Tell-Tale Heart" interactive film.
 *
 * Poe's story (1843) is in the public domain, so subtitle lines below quote
 * and adapt the original text directly for authenticity.
 *
 * This file is pure data — no React/Three.js imports — so it can be reused
 * by the renderer, the subtitle track, the timeline scrubber, and any
 * server-side tooling (e.g. a chapter-export script) without pulling in
 * rendering dependencies.
 * ---------------------------------------------------------------------------
 */

/** Minimal Vector3-like shape. Compatible with `new THREE.Vector3(x, y, z)`. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/** A single subtitle line with its active time window, in seconds from chapter start. */
export interface SubtitleCue {
  id: string;
  /** Time (seconds) at which this line appears. */
  start: number;
  /** Time (seconds) at which this line is removed. */
  end: number;
  text: string;
}

/**
 * A named point in the cinematic camera path. The renderer should
 * interpolate (e.g. via a Catmull-Rom spline or simple lerp/slerp) between
 * consecutive keyframes using their `time` values across the chapter's
 * duration. In 'free' camera mode these are ignored entirely.
 */
export interface CameraKeyframe {
  id: string;
  /** Time (seconds) from chapter start at which the camera should reach this pose. */
  time: number;
  /** World-space camera position. */
  position: Vec3;
  /** World-space point the camera looks toward. */
  lookAt: Vec3;
  /** Optional field of view override (degrees) for dramatic push-ins. */
  fov?: number;
  /** Optional easing hint for the renderer's interpolation curve. */
  easing?: "linear" | "easeInOut" | "easeIn" | "easeOut";
}

export interface Chapter {
  /** 1-indexed chapter number. */
  id: number;
  title: string;
  /** Short description used in the chapter-select menu. */
  synopsis: string;
  /** Total chapter duration in seconds (drives the timeline scrubber). */
  duration: number;
  /** Resting/baseline heart rate (bpm) this chapter settles toward. */
  baselineHeartRate: number;
  /** Peak heart rate (bpm) reachable via tension spikes within the chapter. */
  peakHeartRate: number;
  /** Ambient/SFX audio track key, resolved by the audio manager. */
  audioTrack: string;
  subtitles: SubtitleCue[];
  cameraKeyframes: CameraKeyframe[];
}

// ----------------------------------------------------------------------------
// Chapter data
// ----------------------------------------------------------------------------

export const CHAPTERS: Chapter[] = [
  {
    id: 1,
    title: "01 - The Eye",
    synopsis:
      "The narrator insists on their sanity, then confesses the obsession that consumed them: the old man's pale, vulture-like eye.",
    duration: 60,
    baselineHeartRate: 60,
    peakHeartRate: 75,
    audioTrack: "amb_study_room_quiet",
    subtitles: [
      { id: "1-1", start: 0, end: 5, text: "True! — nervous — very, very dreadfully nervous I had been and am;" },
      { id: "1-2", start: 5, end: 11, text: "but why will you say that I am mad?" },
      { id: "1-3", start: 11, end: 18, text: "The disease had sharpened my senses — not destroyed, not dulled them." },
      { id: "1-4", start: 18, end: 26, text: "Above all was the sense of hearing acute. I heard all things in the heaven and in the earth." },
      { id: "1-5", start: 26, end: 34, text: "I heard many things in hell. How, then, am I mad? Hearken! and observe how healthily — how calmly I can tell you the whole story." },
      { id: "1-6", start: 34, end: 43, text: "It is impossible to say how first the idea entered my brain; but once conceived, it haunted me day and night." },
      { id: "1-7", start: 43, end: 52, text: "Object there was none. Passion there was none. I loved the old man. He had never wronged me." },
      { id: "1-8", start: 52, end: 60, text: "I think it was his eye! Yes, it was this! One of his eyes resembled that of a vulture — a pale blue eye, with a film over it." },
    ],
    cameraKeyframes: [
      { id: "1-k1", time: 0, position: { x: 0, y: 1.6, z: 4 }, lookAt: { x: 0, y: 1.5, z: 0 }, fov: 45, easing: "easeInOut" },
      { id: "1-k2", time: 20, position: { x: 1.2, y: 1.7, z: 2.2 }, lookAt: { x: 0, y: 1.5, z: -1 }, fov: 40, easing: "easeInOut" },
      { id: "1-k3", time: 43, position: { x: -0.5, y: 1.4, z: 1.2 }, lookAt: { x: 0.3, y: 1.5, z: -0.5 }, fov: 35, easing: "easeIn" },
      { id: "1-k4", time: 60, position: { x: 0, y: 1.5, z: 0.6 }, lookAt: { x: 0, y: 1.55, z: -0.2 }, fov: 28, easing: "easeIn" },
    ],
  },
  {
    id: 2,
    title: "02 - The Seven Nights",
    synopsis:
      "For seven nights, the narrator creeps into the old man's room at midnight, opening a lantern's single ray upon the sleeping eye — but it stays shut.",
    duration: 75,
    baselineHeartRate: 65,
    peakHeartRate: 85,
    audioTrack: "amb_house_at_night",
    subtitles: [
      { id: "2-1", start: 0, end: 8, text: "Now this is the point. You fancy me mad. Madmen know nothing." },
      { id: "2-2", start: 8, end: 16, text: "But you should have seen me. You should have seen how wisely I proceeded — with what caution." },
      { id: "2-3", start: 16, end: 25, text: "Every night, about midnight, I turned the latch of his door and opened it — oh so gently!" },
      { id: "2-4", start: 25, end: 34, text: "And then, when I had made an opening sufficient for my head, I put in a dark lantern, all closed, closed, so that no light shone out." },
      { id: "2-5", start: 34, end: 43, text: "I moved it slowly — very, very slowly, so that I might not disturb the old man's sleep." },
      { id: "2-6", start: 43, end: 52, text: "It took me an hour to place my whole head within the opening so far that I could see him as he lay upon his bed." },
      { id: "2-7", start: 52, end: 62, text: "Ha! would a madman have been so wise as this? And then, when my head was well in the room, I undid the lantern cautiously." },
      { id: "2-8", start: 62, end: 75, text: "But I found the eye always closed; and so it was impossible to do the work, for it was not the old man who vexed me, but his Evil Eye." },
    ],
    cameraKeyframes: [
      { id: "2-k1", time: 0, position: { x: -2, y: 1.7, z: 3 }, lookAt: { x: 0, y: 1.5, z: 0 }, fov: 42, easing: "easeInOut" },
      { id: "2-k2", time: 16, position: { x: -0.3, y: 1.6, z: 1.8 }, lookAt: { x: 0, y: 1.2, z: -1 }, fov: 38, easing: "easeInOut" },
      { id: "2-k3", time: 34, position: { x: 0.1, y: 1.3, z: 0.9 }, lookAt: { x: 0, y: 1.0, z: -1.5 }, fov: 30, easing: "linear" },
      { id: "2-k4", time: 62, position: { x: 0, y: 1.1, z: 0.4 }, lookAt: { x: 0, y: 0.9, z: -1.8 }, fov: 24, easing: "easeIn" },
      { id: "2-k5", time: 75, position: { x: -0.4, y: 1.5, z: 2 }, lookAt: { x: 0, y: 1.3, z: 0 }, fov: 40, easing: "easeOut" },
    ],
  },
  {
    id: 3,
    title: "03 - The Eighth Night",
    synopsis:
      "On the eighth night, the narrator is unusually careful and cheerful — more cautious than ever, savoring their own cunning.",
    duration: 65,
    baselineHeartRate: 68,
    peakHeartRate: 90,
    audioTrack: "amb_house_at_night_tense",
    subtitles: [
      { id: "3-1", start: 0, end: 8, text: "Upon the eighth night I was more than usually cautious in opening the door." },
      { id: "3-2", start: 8, end: 16, text: "A watch's minute hand moves more quickly than did mine." },
      { id: "3-3", start: 16, end: 24, text: "Never before that night had I felt the extent of my own powers — of my sagacity." },
      { id: "3-4", start: 24, end: 33, text: "I could scarcely contain my feelings of triumph. To think that there I was, opening the door, little by little," },
      { id: "3-5", start: 33, end: 41, text: "and he not even to dream of my secret deeds or thoughts." },
      { id: "3-6", start: 41, end: 50, text: "I fairly chuckled at the idea; and perhaps he heard me, for he moved on the bed suddenly, as if startled." },
      { id: "3-7", start: 50, end: 58, text: "Now you may think that I drew back — but no. His room was as black as pitch with the thick darkness." },
      { id: "3-8", start: 58, end: 65, text: "I knew that he could not see the opening of the door, and I kept pushing it on steadily, steadily." },
    ],
    cameraKeyframes: [
      { id: "3-k1", time: 0, position: { x: -1.5, y: 1.6, z: 2.5 }, lookAt: { x: 0, y: 1.4, z: -0.5 }, fov: 40, easing: "easeInOut" },
      { id: "3-k2", time: 24, position: { x: -0.5, y: 1.6, z: 1.6 }, lookAt: { x: 0, y: 1.4, z: -0.8 }, fov: 36, easing: "linear" },
      { id: "3-k3", time: 41, position: { x: 0.2, y: 1.3, z: 1.0 }, lookAt: { x: 0.4, y: 1.1, z: -1.2 }, fov: 32, easing: "easeIn" },
      { id: "3-k4", time: 58, position: { x: 0, y: 1.1, z: 0.5 }, lookAt: { x: 0, y: 0.9, z: -2 }, fov: 26, easing: "easeIn" },
    ],
  },
  {
    id: 4,
    title: "04 - The Deed",
    synopsis:
      "The lantern ray finds the open eye at last. A single heartbeat grows into a deafening drum, and the narrator finally acts.",
    duration: 70,
    baselineHeartRate: 100,
    peakHeartRate: 130,
    audioTrack: "sfx_heartbeat_rising",
    subtitles: [
      { id: "4-1", start: 0, end: 7, text: "And it was open — wide, wide open — and I grew furious as I gazed upon it." },
      { id: "4-2", start: 7, end: 14, text: "I saw it with perfect distinctness — all a dull blue, with a hideous veil over it that chilled the very marrow in my bones." },
      { id: "4-3", start: 14, end: 22, text: "I could see nothing else of the old man's face or person: for I had directed the ray as if by instinct, precisely upon the damned spot." },
      { id: "4-4", start: 22, end: 30, text: "And have I not told you that what you mistake for madness is but over-acuteness of the senses?" },
      { id: "4-5", start: 30, end: 38, text: "There came to my ears a low, dull, quick sound, such as a watch makes when enveloped in cotton." },
      { id: "4-6", start: 38, end: 46, text: "I knew that sound well too. It was the beating of the old man's heart." },
      { id: "4-7", start: 46, end: 54, text: "It increased my fury, as the beating of a drum stimulates the soldier into courage." },
      { id: "4-8", start: 54, end: 62, text: "But even yet I refrained and kept still. I scarcely breathed. I held the lantern motionless." },
      { id: "4-9", start: 62, end: 70, text: "The old man's hour had come! With a loud yell, I threw open the lantern and leaped into the room." },
    ],
    cameraKeyframes: [
      { id: "4-k1", time: 0, position: { x: 0, y: 1.1, z: 0.6 }, lookAt: { x: 0, y: 1.0, z: -1.5 }, fov: 30, easing: "linear" },
      { id: "4-k2", time: 22, position: { x: 0.1, y: 1.0, z: 0.3 }, lookAt: { x: 0, y: 0.95, z: -1.2 }, fov: 22, easing: "linear" },
      { id: "4-k3", time: 46, position: { x: -0.2, y: 1.0, z: 0.2 }, lookAt: { x: 0, y: 0.95, z: -1 }, fov: 18, easing: "linear" },
      { id: "4-k4", time: 62, position: { x: 0, y: 1.0, z: 0.15 }, lookAt: { x: 0, y: 0.95, z: -0.8 }, fov: 14, easing: "easeIn" },
      { id: "4-k5", time: 70, position: { x: 0, y: 1.5, z: 3 }, lookAt: { x: 0, y: 1, z: -1 }, fov: 55, easing: "easeOut" },
    ],
  },
  {
    id: 5,
    title: "05 - The Concealment",
    synopsis:
      "The deed done, the narrator methodically dismembers and hides the body beneath the floorboards, calm and precise.",
    duration: 80,
    baselineHeartRate: 80,
    peakHeartRate: 95,
    audioTrack: "amb_floorboards_work",
    subtitles: [
      { id: "5-1", start: 0, end: 8, text: "If still you think me mad, you will think so no longer when I describe the wise precautions I took for the concealment of the body." },
      { id: "5-2", start: 8, end: 16, text: "I then smiled gaily, to find the deed so far done." },
      { id: "5-3", start: 16, end: 24, text: "I then took up three planks from the flooring of the chamber, and deposited all between the scantlings." },
      { id: "5-4", start: 24, end: 33, text: "I then replaced the boards so cleverly, so cunningly, that no human eye — not even his — could have detected anything wrong." },
      { id: "5-5", start: 33, end: 42, text: "There was nothing to wash out — no stain of any kind — no blood-spot whatever. I had been too wary for that." },
      { id: "5-6", start: 42, end: 51, text: "A tub had caught all — ha! ha!" },
      { id: "5-7", start: 51, end: 60, text: "When I had made an end of these labors, it was four o'clock — still dark as midnight." },
      { id: "5-8", start: 60, end: 70, text: "As the bell sounded the hour, there came a knocking at the street door. I went down to open it with a light heart." },
      { id: "5-9", start: 70, end: 80, text: "for what had I now to fear? There entered three men, who introduced themselves, as officers of the police." },
    ],
    cameraKeyframes: [
      { id: "5-k1", time: 0, position: { x: 1.5, y: 1.7, z: 2 }, lookAt: { x: 0, y: 0.4, z: -0.5 }, fov: 45, easing: "easeInOut" },
      { id: "5-k2", time: 24, position: { x: -1, y: 1.2, z: 1 }, lookAt: { x: 0, y: 0.2, z: -0.3 }, fov: 38, easing: "linear" },
      { id: "5-k3", time: 51, position: { x: 0, y: 1.8, z: 0.1 }, lookAt: { x: 0, y: 0, z: -0.1 }, fov: 50, easing: "easeInOut" },
      { id: "5-k4", time: 70, position: { x: -2, y: 1.6, z: 3.5 }, lookAt: { x: -3, y: 1.5, z: 4 }, fov: 42, easing: "easeInOut" },
    ],
  },
  {
    id: 6,
    title: "06 - The Arrival",
    synopsis:
      "Police officers, summoned by a neighbor's report of a shriek, search the house. The narrator invites them in, at ease.",
    duration: 60,
    baselineHeartRate: 85,
    peakHeartRate: 100,
    audioTrack: "amb_night_investigation",
    subtitles: [
      { id: "6-1", start: 0, end: 8, text: "A shriek had been heard by a neighbor during the night; suspicion of foul play had been aroused." },
      { id: "6-2", start: 8, end: 16, text: "Information had been lodged at the police office, and they had been deputed to search the premises." },
      { id: "6-3", start: 16, end: 24, text: "I smiled — for what had I to fear? I bade the gentlemen welcome." },
      { id: "6-4", start: 24, end: 33, text: "The shriek, I said, was my own in a dream. The old man, I mentioned, was absent in the country." },
      { id: "6-5", start: 33, end: 42, text: "I took my visitors all over the house. I bade them search — search well." },
      { id: "6-6", start: 42, end: 51, text: "I led them, at length, to his chamber. I showed them his treasures, secure, undisturbed." },
      { id: "6-7", start: 51, end: 60, text: "In the enthusiasm of my confidence, I brought chairs into the room, and desired them here to rest from their fatigues." },
    ],
    cameraKeyframes: [
      { id: "6-k1", time: 0, position: { x: -2, y: 1.6, z: 3.5 }, lookAt: { x: -3, y: 1.5, z: 4 }, fov: 42, easing: "easeInOut" },
      { id: "6-k2", time: 24, position: { x: 0, y: 1.6, z: 1.5 }, lookAt: { x: 0.5, y: 1.5, z: 0 }, fov: 38, easing: "easeInOut" },
      { id: "6-k3", time: 42, position: { x: 0.5, y: 1.5, z: 0.8 }, lookAt: { x: 0, y: 0.4, z: -0.5 }, fov: 34, easing: "easeInOut" },
      { id: "6-k4", time: 60, position: { x: 0, y: 1.4, z: 0.3 }, lookAt: { x: 0, y: 0.3, z: -0.2 }, fov: 30, easing: "linear" },
    ],
  },
  {
    id: 7,
    title: "07 - The Rising Sound",
    synopsis:
      "As the officers chat comfortably above the hidden body, a faint ringing rises in the narrator's ears — and grows into an unbearable, rhythmic thud.",
    duration: 70,
    baselineHeartRate: 120,
    peakHeartRate: 140,
    audioTrack: "sfx_heartbeat_climax",
    subtitles: [
      { id: "7-1", start: 0, end: 8, text: "The officers were satisfied. My manner had convinced them. I was singularly at ease." },
      { id: "7-2", start: 8, end: 16, text: "They sat, and while I answered cheerily, they chatted of familiar things. But, ere long, I felt myself getting pale." },
      { id: "7-3", start: 16, end: 24, text: "My head ached, and I fancied a ringing in my ears: but still they sat and still chatted." },
      { id: "7-4", start: 24, end: 32, text: "The ringing became more distinct: I talked more freely to get rid of the feeling." },
      { id: "7-5", start: 32, end: 40, text: "It was a low, dull, quick sound — much such a sound as a watch makes when enveloped in cotton." },
      { id: "7-6", start: 40, end: 48, text: "I gasped for breath, and yet the officers heard it not. I talked more quickly, more vehemently." },
      { id: "7-7", start: 48, end: 56, text: "The noise steadily increased. I arose and argued about trifles, in a high key and with violent gesticulations;" },
      { id: "7-8", start: 56, end: 63, text: "but the noise steadily increased. Why would they not be gone? I paced the floor to and fro with heavy strides." },
      { id: "7-9", start: 63, end: 70, text: "Was it possible they heard not? Almighty God! — no, no! They heard! — they suspected! — they knew!" },
    ],
    cameraKeyframes: [
      { id: "7-k1", time: 0, position: { x: 0, y: 1.4, z: 0.3 }, lookAt: { x: 0, y: 0.3, z: -0.2 }, fov: 30, easing: "linear" },
      { id: "7-k2", time: 24, position: { x: 0.3, y: 1.5, z: 0.5 }, lookAt: { x: -0.2, y: 1.4, z: 0.3 }, fov: 34, easing: "linear" },
      { id: "7-k3", time: 40, position: { x: -0.4, y: 1.5, z: 0.4 }, lookAt: { x: 0.3, y: 1.4, z: 0.2 }, fov: 40, easing: "linear" },
      { id: "7-k4", time: 56, position: { x: 0, y: 1.5, z: 0.2 }, lookAt: { x: 0, y: 1.4, z: -0.3 }, fov: 48, easing: "easeIn" },
      { id: "7-k5", time: 70, position: { x: 0, y: 1.4, z: 0.1 }, lookAt: { x: 0, y: 0.2, z: -0.1 }, fov: 60, easing: "easeIn" },
    ],
  },
  {
    id: 8,
    title: "08 - The Confession",
    synopsis:
      "Unable to bear the sound any longer, the narrator breaks — screaming their guilt and tearing up the floorboards before the astonished officers.",
    duration: 50,
    baselineHeartRate: 140,
    peakHeartRate: 140,
    audioTrack: "sfx_heartbeat_breaking",
    subtitles: [
      { id: "8-1", start: 0, end: 7, text: "I felt that I must scream or die! and now — again! — hark! louder! louder! louder! LOUDER!" },
      { id: "8-2", start: 7, end: 14, text: "\"Villains!\" I shrieked, \"dissemble no more! I admit the deed!" },
      { id: "8-3", start: 14, end: 21, text: "— tear up the planks! — here, here! — it is the beating of his hideous heart!\"" },
      { id: "8-4", start: 21, end: 30, text: "The officers stood frozen for a moment, then rushed to the boards the narrator pointed to." },
      { id: "8-5", start: 30, end: 38, text: "The room fell silent at last — the sound that had driven the narrator to confession was gone." },
      { id: "8-6", start: 38, end: 50, text: "And so the tale ends where it began: with a claim of sanity, undone by a single, unbearable heartbeat." },
    ],
    cameraKeyframes: [
      { id: "8-k1", time: 0, position: { x: 0, y: 1.4, z: 0.1 }, lookAt: { x: 0, y: 0.2, z: -0.1 }, fov: 60, easing: "easeIn" },
      { id: "8-k2", time: 14, position: { x: 0.2, y: 1.3, z: 0.3 }, lookAt: { x: 0, y: 0.3, z: -0.2 }, fov: 65, easing: "linear" },
      { id: "8-k3", time: 21, position: { x: -0.5, y: 1.2, z: 0.6 }, lookAt: { x: 0, y: 0.1, z: -0.3 }, fov: 45, easing: "easeOut" },
      { id: "8-k4", time: 38, position: { x: 0, y: 1.8, z: 2.5 }, lookAt: { x: 0, y: 0.2, z: 0 }, fov: 35, easing: "easeInOut" },
      { id: "8-k5", time: 50, position: { x: 0, y: 2.5, z: 5 }, lookAt: { x: 0, y: 0.5, z: 0 }, fov: 50, easing: "easeInOut" },
    ],
  },
];

export const TOTAL_CHAPTERS = CHAPTERS.length;

// ----------------------------------------------------------------------------
// Lookup helpers
// ----------------------------------------------------------------------------

/** Get chapter data by its 1-indexed id. Returns undefined if out of range. */
export function getChapterById(id: number): Chapter | undefined {
  return CHAPTERS.find((chapter) => chapter.id === id);
}

/** Get the subtitle cue active at a given time (seconds) within a chapter. */
export function getActiveSubtitle(chapterId: number, timeSeconds: number): SubtitleCue | undefined {
  const chapter = getChapterById(chapterId);
  if (!chapter) return undefined;
  return chapter.subtitles.find((cue) => timeSeconds >= cue.start && timeSeconds < cue.end);
}

/**
 * Linearly interpolate between the two camera keyframes surrounding
 * `timeSeconds`. Renderer can swap this for a spline-based interpolation
 * if smoother motion is desired; this default keeps the data model simple.
 */
export function getCameraPoseAtTime(
  chapterId: number,
  timeSeconds: number,
): { position: Vec3; lookAt: Vec3; fov: number } | undefined {
  const chapter = getChapterById(chapterId);
  if (!chapter || chapter.cameraKeyframes.length === 0) return undefined;

  const keyframes = chapter.cameraKeyframes;

  if (timeSeconds <= keyframes[0].time) {
    const k = keyframes[0];
    return { position: k.position, lookAt: k.lookAt, fov: k.fov ?? 45 };
  }
  const last = keyframes[keyframes.length - 1];
  if (timeSeconds >= last.time) {
    return { position: last.position, lookAt: last.lookAt, fov: last.fov ?? 45 };
  }

  for (let i = 0; i < keyframes.length - 1; i++) {
    const a = keyframes[i];
    const b = keyframes[i + 1];
    if (timeSeconds >= a.time && timeSeconds <= b.time) {
      const t = (timeSeconds - a.time) / (b.time - a.time);
      const lerp = (x: number, y: number) => x + (y - x) * t;
      const lerpVec3 = (v1: Vec3, v2: Vec3): Vec3 => ({
        x: lerp(v1.x, v2.x),
        y: lerp(v1.y, v2.y),
        z: lerp(v1.z, v2.z),
      });
      return {
        position: lerpVec3(a.position, b.position),
        lookAt: lerpVec3(a.lookAt, b.lookAt),
        fov: lerp(a.fov ?? 45, b.fov ?? 45),
      };
    }
  }

  return undefined;
}
