/**
 * Feature flags. Switch one on by setting an environment variable when
 * building (locally in a `.env.local` file, or in the Cloudflare project's
 * build settings → Variables), e.g. VITE_FEATURE_ADS=true.
 */
export const features = {
  /** Advert slot below the editor (DESIGN.md §8). OFF for version 1. */
  ads: import.meta.env.VITE_FEATURE_ADS === 'true',
};
