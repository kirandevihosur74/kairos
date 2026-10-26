/** Set once the "How Kairos works" screen has been seen on this device. */
export const WELCOME_KEY = "kairos.welcome.seen";

export function hasSeenWelcome(): boolean {
  try {
    return window.localStorage.getItem(WELCOME_KEY) === "1";
  } catch {
    return true; // storage unavailable: don't block onboarding
  }
}
