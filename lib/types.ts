export type Photo = { id: string; src: string; label: string; year: string };
export type Story = {
  age: number;
  name: string;
  relationshipDate: string;
  relationshipDisplay: string;
  childhood: Photo[];
  sharedPhotos: Photo[];
  dateClues: { title: string; text: string; piece: string }[];
  dayObjects: { title: string; detail: string }[];
  qualities: string[];
  feelings: string[];
  voiceTranscript: string[];
  voiceMessage: string;
  ambientTrack: string;
  birthdayTrack: string;
  finalLetter: string[];
};
export type SceneName =
  | "hub"
  | "childhood"
  | "date"
  | "darkroom"
  | "mirror"
  | "transmission"
  | "final";
export type ResponseKind = "letter" | "voice" | "private";
export type WorldState = {
  scene: SceneName;
  completed: number;
  progress: number;
  projector: boolean;
  lit: boolean;
  selected: number[];
  video: HTMLVideoElement | null;
  response: ResponseKind | null;
  reducedMotion: boolean;
};
export const memoryNames = [
  "Before I knew you",
  "The day there became an “us”",
  "One day I never want to lose",
  "How I see you",
  "The things we never say properly",
];
