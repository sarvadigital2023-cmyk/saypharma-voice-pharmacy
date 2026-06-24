// Safe, one-shot microphone permission request used ONLY by the CallGateModal,
// BEFORE the voice call starts.
//
// Important: this acquires the microphone only to obtain the permission, then
// immediately stops every track so the device is fully released. It is never
// used on the call path itself — the Retell SDK opens its own capture inside
// startCall(), and holding a stream here would conflict with it. Keep these two
// concerns separate.

export async function requestMicrophoneOnce(): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
    return false;
  }
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    stream.getTracks().forEach((track) => track.stop());
    return true;
  } catch {
    return false;
  }
}
