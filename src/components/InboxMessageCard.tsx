/**
 * Inbox Message Card Component
 * Formatted as an eye-catching split card designed for screenshots / WhatsApp status:
 * - Gold header strip reading "12/12 · anonymous message" (or Green with cream text labelled "From CorperWe")
 * - White body with the message in bold, centered, large text
 * - Clean Delete button and Save Card button
 */
import React, { useRef, useState } from 'react';
import { Trash2, Download, Check, MessageCircle } from 'lucide-react';
import { toPng } from 'html-to-image';
import { formatTimeAgo } from '../lib/utils';
import { PopMessageItem } from '../types';

interface InboxMessageCardProps {
  message: PopMessageItem;
  onDelete: (id: string) => Promise<void> | void;
  isDeleting?: boolean;
}

export const InboxMessageCard: React.FC<InboxMessageCardProps> = ({
  message,
  onDelete,
  isDeleting = false,
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const isFromCorperWe = Boolean(message.isFromCorperWe);

  const handleDownloadCard = async () => {
    if (!cardRef.current || downloading) return;
    try {
      setDownloading(true);
      await document.fonts?.ready;
      const dataUrl = await toPng(cardRef.current, {
        cacheBust: true,
        pixelRatio: 2,
        quality: 0.95,
      });

      const link = document.createElement('a');
      link.download = `CorperWe-Message-${message.id.slice(0, 8)}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to export message card:', err);
    } finally {
      setDownloading(false);
    }
  };

  const handleDeleteClick = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      setTimeout(() => setConfirmDelete(false), 4000);
    } else {
      onDelete(message.id);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* The Printable / Screenshot Split Card */}
      <div
        ref={cardRef}
        className="w-full rounded-2xl overflow-hidden shadow-xl border border-black/10 bg-white transition-all transform hover:shadow-2xl"
      >
        {/* Header Strip */}
        {isFromCorperWe ? (
          /* Welcome Card Header: Green with Cream Text */
          <div className="bg-[#0b5d3b] text-[#f6f1e0] px-4 py-2.5 flex items-center justify-between border-b border-[#073d27]">
            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
              <span>From CorperWe</span>
            </div>
            <span className="text-[11px] font-semibold text-[#f6f1e0]/80">
              Official Welcome
            </span>
          </div>
        ) : (
          /* Standard Anonymous Message Header: Gold Strip */
          <div className="bg-[#d9a520] text-[#073d27] px-4 py-2.5 flex items-center justify-between border-b border-[#c2921a]">
            <div className="flex items-center gap-1.5 font-black text-xs uppercase tracking-wider">
              <MessageCircle className="w-3.5 h-3.5" />
              <span>12/12 · anonymous message</span>
            </div>
            <span className="text-[11px] font-bold text-[#073d27]/75">
              {formatTimeAgo(message.createdAt)}
            </span>
          </div>
        )}

        {/* Card Body: White background with bold, centered, large text */}
        <div className="p-6 md:p-8 flex items-center justify-center min-h-[140px] text-center bg-white relative">
          <p className="font-extrabold text-lg sm:text-xl md:text-2xl text-gray-900 leading-snug break-words max-w-full">
            "{message.text}"
          </p>
        </div>

        {/* Card Footer Bar for Screenshot Branding */}
        <div className="bg-gray-50 px-4 py-2 border-t border-gray-100 flex items-center justify-between text-[11px] text-gray-400 font-medium">
          <span className="font-bold text-[#0b5d3b]">CorperWe 🇳🇬</span>
          <span>Send anonymous messages</span>
        </div>
      </div>

      {/* Card Controls Bar */}
      <div className="w-full mt-2 flex items-center justify-between px-2 text-xs">
        <button
          onClick={handleDownloadCard}
          disabled={downloading}
          className="text-white/80 hover:text-white bg-black/30 hover:bg-black/50 px-3 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-all cursor-pointer disabled:opacity-50"
          title="Save image to post on WhatsApp Status"
        >
          <Download className="w-3.5 h-3.5" />
          {downloading ? 'Saving...' : 'Save Card'}
        </button>

        <button
          onClick={handleDeleteClick}
          disabled={isDeleting}
          className={`px-3 py-1.5 rounded-lg font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
            confirmDelete
              ? 'bg-red-600 text-white animate-pulse'
              : 'text-red-200 hover:text-red-100 bg-red-950/40 hover:bg-red-950/70'
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
          {confirmDelete ? 'Confirm Delete?' : 'Delete'}
        </button>
      </div>
    </div>
  );
};
