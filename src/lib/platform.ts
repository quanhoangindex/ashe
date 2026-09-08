/** True on Windows/Linux, where the shortcut modifier is Ctrl rather than ⌘. */
export function isApplePlatform() {
  if (typeof navigator === "undefined") return false;
  return /Mac|iPhone|iPad/i.test(navigator.platform || navigator.userAgent);
}

/** Label for the zoom shortcut modifier, correct on Windows and on Mac. */
export function modifierLabel() {
  return isApplePlatform() ? "⌘ + Option" : "Ctrl + Alt";
}
