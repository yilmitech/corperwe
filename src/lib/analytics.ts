import posthog from 'posthog-js';

/**
 * Privacy-first PostHog setup for CorperWe.
 * - No autocapture, no session recording, no person profiles.
 * - Message text, names and slugs are never sent.
 * - Does nothing if VITE_POSTHOG_KEY is not set.
 */
const KEY = import.meta.env.VITE_POSTHOG_KEY as string | undefined;
const HOST = (import.meta.env.VITE_POSTHOG_HOST as string | undefined) || 'https://us.i.posthog.com';

// Replace /pop/<slug> (which contains the corper's name) with a generic path
const scrub = (value: unknown): unknown =>
  typeof value === 'string' ? value.replace(/\/pop\/[^/?#\s]+/g, '/pop/:slug') : value;

let ready = false;

export function initAnalytics() {
  if (!KEY || ready) return;
  posthog.init(KEY, {
    api_host: HOST,
    autocapture: false,
    disable_session_recording: true,
    person_profiles: 'identified_only',
    capture_pageview: 'history_change',
    before_send: (event) => {
      if (event?.properties) {
        for (const k of Object.keys(event.properties)) {
          event.properties[k] = scrub(event.properties[k]);
        }
      }
      return event;
    },
  });
  ready = true;
}

type EventName =
  | 'link_created'
  | 'card_downloaded'
  | 'message_sent';

export function track(event: EventName, props?: Record<string, string | number | boolean>) {
  if (!ready) return;
  posthog.capture(event, props);
}
