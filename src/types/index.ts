/**
 * Core types for CorperWe
 */

export interface PopProfile {
  slug: string;
  name: string;
  ownerId: string;
  createdAt: any;
  question?: string;
}

export interface PopMessageItem {
  id: string;
  text: string;
  createdAt?: any;
  isFromCorperWe?: boolean;
}

export interface ShareCardProps {
  displayName: string;
  question: string;
  slug: string;
  onDownloadStart?: () => void;
  onDownloadEnd?: () => void;
}
