// One-time microphone permission handling for the PWA.
//
// Goal: the customer should see the browser's "allow microphone" prompt at most
// once — ideally right when they install the app to their home screen — and
// never again on each "Talk to SafePharma" press.
//
// Strategy:
//   * On the `appinstalled` event we proactively request microphone access and,
//     on success, remember it in localStorage (microphone_permission_granted).
//   * Before starting a call we check that flag: if it is set we start straight
//     away (the browser already has the grant, so no prompt appears); if it is
//     not set we request access once, which sets the flag for next time.
//
// Note: iOS Safari does not fire `appinstalled`, so on iOS the single prompt
// happens on the first call press instead — and is then remembered the same way.

const MIC_FLAG = "microphone_permission_granted";

function safeLocalStorage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Has the user already granted microphone access in a previous session? */
export function isMicrophoneGranted(): boolean {
  return safeLocalStorage()?.getItem(MIC_FLAG) === "true";
}

/** Persist (or clear) the "granted" flag. */
export function setMicrophoneGranted(granted: boolean): void {
  const store = safeLocalStorage();
  if (!store) return;
  try {
    if (granted) store.setItem(MIC_FLAG, "true");
    else store.removeItem(MIC_FLAG);
  } catch {
    /* ignore quota / private-mode errors */
  }
}

/**
 * Ask the browser for microphone access. Resolves true if granted.
 * The audio tracks are stopped immediately — we only want the permission here,
 * not to hold an open stream. Records the grant on success.
 */
export async function requestMicrophoneAccess(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    setMicrophoneGranted(true);
    return true;
  } catch {
    return false;
  }
}

/**
 * Called right before a call starts. If a grant was already recorded we do NOT
 * prompt again (the SDK will reuse the existing permission); otherwise we
 * request it once now.
 */
export async function ensureMicrophoneAccess(): Promise<boolean> {
  if (isMicrophoneGranted()) return true;
  return requestMicrophoneAccess();
}

/**
 * Start listening for the PWA `appinstalled` event and prewarm the microphone
 * permission the moment the app is installed. Returns an unsubscribe function.
 */
export function prewarmMicrophoneOnInstall(): () => void {
  if (typeof window === "undefined") return () => {};
  const handler = () => {
    // fire-and-forget: success stores the flag, failure stays silent
    void requestMicrophoneAccess();
  };
  window.addEventListener("appinstalled", handler);
  return () => window.removeEventListener("appinstalled", handler);
}
