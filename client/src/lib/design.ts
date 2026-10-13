// Decorative, non-content assets of the visual design. Set either variable to an empty string
// (VITE_HERO_VIDEO_URL=) to turn a video off; the CSS `.bg-cinematic` gradient is shown instead.
// If you host the videos elsewhere, also set MEDIA_ORIGIN on the server (it feeds the CSP).
const CDN = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P';

export const HERO_VIDEO_URL =
  import.meta.env.VITE_HERO_VIDEO_URL ?? `${CDN}/hf_20260405_170732_8a9ccda6-5cff-4628-b164-059c500a2b41.mp4`;
export const ACCENT_VIDEO_URL =
  import.meta.env.VITE_ACCENT_VIDEO_URL ?? `${CDN}/hf_20260406_133058_0504132a-0cf3-4450-a370-8ea3b05c95d4.mp4`;

export const EASE_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_CARD = [0.22, 1, 0.36, 1] as const;

export const cn = (...parts: Array<string | false | null | undefined>) => parts.filter(Boolean).join(' ');
