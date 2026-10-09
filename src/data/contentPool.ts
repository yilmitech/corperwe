/**
 * CorperWe welcome message.
 * Shown in the inbox 2 minutes after the link is created, clearly labelled "From CorperWe".
 * It is rendered on the client only and is never styled as a message from a friend.
 */

export const WELCOME_MESSAGE_TEXT =
  'Congrats on finishing your service year! Share your card to start getting messages from friends and family.';

export interface WelcomeMessage {
  id: string;
  text: string;
  isFromCorperWe: true;
  createdAt: number; // millisecond timestamp
}

export function getWelcomeInboxMessages(
  createdAtMs: number,
  deletedIds: string[] = [],
  currentTimeMs: number = Date.now()
): WelcomeMessage[] {
  const TWO_MINUTES_MS = 2 * 60 * 1000;
  const welcomeId = 'welcome-corperwe-official';
  if (currentTimeMs - createdAtMs < TWO_MINUTES_MS || deletedIds.includes(welcomeId)) {
    return [];
  }
  return [
    {
      id: welcomeId,
      text: WELCOME_MESSAGE_TEXT,
      isFromCorperWe: true,
      createdAt: createdAtMs + TWO_MINUTES_MS,
    },
  ];
}
