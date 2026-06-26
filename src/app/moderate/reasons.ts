// Default rejection reasons a mod can pick. The chosen one (plus an optional
// note) is stored on the uploader's notification so they learn why a piece was
// turned down or removed. Shared by the pending queue and the reported queue.
export const REJECT_REASONS = [
  "Spoiler — tagged to the wrong chapter",
  "Doesn't match this book or chapter",
  "Low image quality or too small",
  "Missing source or artist credit",
  "Duplicate of art already posted",
  "Inappropriate or off-topic",
  "Other (see note)",
];
