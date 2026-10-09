/**
 * 12/12 Share Card Component
 * Conforms strictly to specifications:
 * - 1080x1920 dimension export for WhatsApp & Instagram Stories
 * - NYSC green (#0b5d3b) background with faint /public/nysc-logo.png watermark at ~10% opacity
 * - "CorperWe" at top in bold cream (#f6f1e0)
 * - Centered rounded split card:
 *     Top half: Gold (#d9a520) with dark green text: huge "12/12", display name, "send me anonymous messages!"
 *     Bottom half: White with bold question ("What's your best memory of me?")
 * - Cream pill with link near the bottom
 * - Direct image file sharing to WhatsApp / native share sheet via Web Share API (File object)
 * - Automatic image download + link copy with step-by-step WhatsApp Status modal
 */
import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';
import { track } from '../lib/analytics';
import confetti from 'canvas-confetti';
import {
  Download,
  Copy,
  Check,
  Share2,
  X,
  Image as ImageIcon,
  ExternalLink,
  Smartphone,
  Edit3,
} from 'lucide-react';
import { formatCorperName, getShareUrl } from '../lib/utils';

interface ShareCardProps {
  name: string;
  question?: string;
  slug: string;
  className?: string;
  onQuestionChange?: (newQuestion: string) => void;
  onEditQuestion?: () => void;
}

export const ShareCard: React.FC<ShareCardProps> = ({
  name,
  question = "What's your best memory of me?",
  slug,
  className = '',
  onEditQuestion,
}) => {
  const exportCardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);
  const [sharingWhatsApp, setSharingWhatsApp] = useState(false);
  const [copied, setCopied] = useState(false);
  const [copyToast, setCopyToast] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);

  const corperDisplayName = formatCorperName(name);
  const fullShareUrl = getShareUrl(slug);
  const cleanDisplayUrl = fullShareUrl.replace(/^https?:\/\//, '');

  // Helper to copy link to clipboard reliably
  const copyLinkToClipboard = async (): Promise<boolean> => {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullShareUrl);
      } else {
        const input = document.createElement('input');
        input.value = fullShareUrl;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
      }
      setCopied(true);
      setCopyToast(true);
      setTimeout(() => setCopied(false), 2500);
      setTimeout(() => setCopyToast(false), 3000);
      return true;
    } catch (e) {
      console.warn('Clipboard write failed:', e);
      return false;
    }
  };

  // Generate PNG dataUrl and File object
  const renderCardImage = async (): Promise<{ dataUrl: string; file: File } | null> => {
    if (!exportCardRef.current) return null;
    await document.fonts?.ready;
    const dataUrl = await toPng(exportCardRef.current, {
      cacheBust: true,
      pixelRatio: 1, // Exactly 1080x1920
      width: 1080,
      height: 1920,
      quality: 0.98,
    });

    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], `CorperWe-12-12-${slug}.png`, { type: 'image/png' });
    return { dataUrl, file };
  };

  // Download 1080x1920 PNG to gallery
  const handleDownload = async () => {
    if (downloading) return;
    try {
      setDownloading(true);
      await copyLinkToClipboard();
      const card = await renderCardImage();
      if (!card) return;

      const link = document.createElement('a');
      link.download = `CorperWe-12-12-${slug}.png`;
      link.href = card.dataUrl;
      link.click();
      track('card_downloaded');

      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ['#0b5d3b', '#d9a520', '#f6f1e0'],
      });
    } catch (err) {
      console.error('Failed to generate PNG image card:', err);
    } finally {
      setDownloading(false);
    }
  };

  // Share Card Image directly to WhatsApp / Android native share sheet
  const handleWhatsAppShare = async () => {
    if (sharingWhatsApp) return;
    try {
      setSharingWhatsApp(true);

      // 1. Always copy link first so it's ready in the user's clipboard
      await copyLinkToClipboard();

      // 2. Render high resolution card
      const card = await renderCardImage();
      if (!card) return;

      // 3. Try Web Share API with the actual image File
      // When a file is passed to navigator.share, mobile OS shows WhatsApp / WhatsApp Status directly with the photo attached!
      if (
        navigator.canShare &&
        navigator.canShare({ files: [card.file] })
      ) {
        try {
          await navigator.share({
            files: [card.file],
            title: `CorperWe 12/12 - ${corperDisplayName}`,
            text: `Send ${corperDisplayName} an anonymous message! 👉 ${fullShareUrl}`,
          });

          confetti({
            particleCount: 70,
            spread: 60,
            origin: { y: 0.7 },
            colors: ['#0b5d3b', '#d9a520', '#f6f1e0'],
          });
          return;
        } catch (shareError: any) {
          // If user cancelled share sheet, don't trigger download
          if (shareError?.name === 'AbortError') {
            return;
          }
          console.warn('Web Share file failed or not supported in this frame:', shareError);
        }
      }

      // 4. Fallback if file sharing is restricted (e.g. in iframe, browser security policy, or desktop):
      // Automatically download the 1080x1920 image to device
      const link = document.createElement('a');
      link.download = `CorperWe-12-12-${slug}.png`;
      link.href = card.dataUrl;
      link.click();

      // Show the guide modal instructing user to pick the saved photo and paste their link
      setShowGuideModal(true);
    } catch (err) {
      console.error('WhatsApp share execution error:', err);
    } finally {
      setSharingWhatsApp(false);
    }
  };

  const openWhatsAppDirect = () => {
    const text = `🇳🇬 *12/12 POP is here!* Send ${corperDisplayName} an anonymous message:\n👉 ${fullShareUrl}`;
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
  };

  return (
    <div className={`flex flex-col items-center w-full max-w-sm mx-auto ${className}`}>
      {/* Toast Alert */}
      {copyToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#d9a520] text-[#073d27] font-black px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm border-2 border-white animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          Link copied to clipboard! Paste on your Status!
        </div>
      )}

      {/* Visible Mobile Scaled Card Preview */}
      <div className="relative w-full aspect-[9/16] max-h-[580px] bg-[#0b5d3b] rounded-3xl overflow-hidden shadow-2xl flex flex-col justify-between p-6 border-4 border-[#d9a520]/30 select-none">
        {/* Background Watermark (10% opacity) */}
        <div
          className="absolute inset-0 pointer-events-none flex items-center justify-center overflow-hidden opacity-10"
          style={{
            backgroundImage: `url('/nysc-logo.png')`,
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            backgroundSize: '75%',
          }}
        />

        {/* Top Header */}
        <div className="relative z-10 flex flex-col items-center pt-2">
          <div className="flex items-center gap-1.5 px-3 py-1 bg-black/20 rounded-full mb-1">
            <span className="w-2 h-2 rounded-full bg-[#d9a520] animate-pulse"></span>
            <span className="text-[#f6f1e0] text-xs font-semibold tracking-wider uppercase">
              NYSC 12/12 POP
            </span>
          </div>
          <h1 className="text-3xl font-black tracking-tight text-[#f6f1e0] drop-shadow-md">
            CorperWe
          </h1>
        </div>

        {/* Centered Rounded Split Card (NGL style) */}
        <div className="relative z-10 my-auto w-full max-w-[290px] mx-auto rounded-3xl overflow-hidden shadow-2xl border border-white/20">
          {/* Top Half: Gold (#d9a520) with Dark Green Text */}
          <div className="bg-[#d9a520] text-[#073d27] p-5 flex flex-col items-center text-center">
            <div className="text-5xl font-black tracking-tighter leading-none mb-1">
              12/12
            </div>
            <div className="text-lg font-extrabold tracking-tight truncate max-w-[250px]">
              {corperDisplayName}
            </div>
            <div className="text-xs font-bold uppercase tracking-wider text-[#0b5d3b] mt-1 bg-white/30 px-3 py-0.5 rounded-full">
              send me anonymous messages!
            </div>
          </div>

          {/* Bottom Half: White with bold question */}
          <div
            onClick={onEditQuestion}
            className={`bg-white text-gray-900 p-6 flex flex-col items-center justify-center text-center min-h-[110px] relative transition-colors ${
              onEditQuestion ? 'cursor-pointer hover:bg-amber-50/70 group' : ''
            }`}
          >
            <p className="font-extrabold text-base md:text-lg leading-snug text-gray-900">
              {question}
            </p>
            {onEditQuestion && (
              <span className="text-[10px] text-[#0b5d3b] font-bold bg-[#f6f1e0] border border-[#d9a520]/60 px-2.5 py-0.5 rounded-full mt-2 flex items-center gap-1 shadow-xs group-hover:scale-105 transition-transform">
                <Edit3 className="w-3 h-3 text-[#d9a520]" />
                <span>Tap to change question</span>
              </span>
            )}
          </div>
        </div>

        {/* Bottom Link Pill in Cream */}
        <div className="relative z-10 flex flex-col items-center pb-2">
          <div className="bg-[#f6f1e0] text-[#0b5d3b] text-xs font-bold px-4 py-2 rounded-full shadow-md max-w-[90%] truncate border border-[#d9a520]">
            🔗 {cleanDisplayUrl}
          </div>
          <p className="text-[10px] text-[#f6f1e0]/70 font-medium mt-1">
            Service & Humility 🇳🇬 • Passing Out Parade
          </p>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="w-full mt-4 flex flex-col gap-2.5">
        {/* Main WhatsApp Status Share Button */}
        <button
          onClick={handleWhatsAppShare}
          disabled={sharingWhatsApp}
          className="w-full bg-[#25D366] hover:bg-[#20ba59] active:scale-[0.98] text-white font-black py-4 px-5 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 text-base transition-all cursor-pointer disabled:opacity-60"
        >
          {sharingWhatsApp ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <Share2 className="w-5 h-5 stroke-[2.5]" />
          )}
          <span>
            {sharingWhatsApp ? 'Preparing Story Image...' : 'Share Card to WhatsApp'}
          </span>
        </button>

        <div className="grid grid-cols-2 gap-2 w-full">
          {/* Download Card PNG */}
          <button
            onClick={handleDownload}
            disabled={downloading}
            className="bg-[#d9a520] hover:bg-[#c9951b] active:scale-[0.98] text-[#073d27] font-black py-3 px-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs transition-all cursor-pointer disabled:opacity-60"
          >
            {downloading ? (
              <div className="w-4 h-4 border-2 border-[#073d27] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>{downloading ? 'Saving...' : 'Download PNG'}</span>
          </button>

          {/* Copy Link */}
          <button
            onClick={copyLinkToClipboard}
            className="bg-[#f6f1e0] hover:bg-white active:scale-[0.98] text-[#0b5d3b] font-bold py-3 px-3.5 rounded-xl shadow-md flex items-center justify-center gap-2 text-xs border border-[#0b5d3b]/20 transition-all cursor-pointer"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-700 stroke-[3]" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
            <span>{copied ? 'Copied!' : 'Copy Link'}</span>
          </button>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* WhatsApp Status Guide Modal                                         */}
      {/* ==================================================================== */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b5d3b] border-2 border-[#d9a520] rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl relative flex flex-col gap-4 animate-in fade-in zoom-in duration-200">
            <button
              onClick={() => setShowGuideModal(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-black/30 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-[#25D366] flex items-center justify-center text-white shrink-0 shadow-lg">
                <Share2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#f6f1e0] leading-tight">
                  Post to WhatsApp Status
                </h3>
                <span className="text-xs text-[#d9a520] font-bold">
                  Card saved & Link copied!
                </span>
              </div>
            </div>

            <div className="bg-black/30 rounded-2xl p-4 flex flex-col gap-3 text-xs leading-relaxed border border-white/10">
              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#d9a520] text-[#073d27] font-black flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                  1
                </div>
                <p>
                  <strong>Card photo downloaded:</strong> Look in your phone's Gallery / Downloads for <span className="text-[#d9a520] font-mono">CorperWe-12-12.png</span>.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#d9a520] text-[#073d27] font-black flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                  2
                </div>
                <p>
                  <strong>Link is copied:</strong> Your unique link <span className="text-[#d9a520] font-mono">/pop/{slug}</span> is ready in your clipboard.
                </p>
              </div>

              <div className="flex items-start gap-2.5">
                <div className="w-5 h-5 rounded-full bg-[#d9a520] text-[#073d27] font-black flex items-center justify-center shrink-0 mt-0.5 text-[11px]">
                  3
                </div>
                <p>
                  <strong>Open WhatsApp:</strong> Go to Status, select the downloaded card photo, and paste your link in the caption!
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={openWhatsAppDirect}
                className="w-full bg-[#25D366] hover:bg-[#20ba59] active:scale-95 text-white font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg cursor-pointer"
              >
                <ExternalLink className="w-4 h-4" />
                Open WhatsApp Now
              </button>

              <button
                onClick={() => setShowGuideModal(false)}
                className="w-full bg-white/10 hover:bg-white/20 text-[#f6f1e0] font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* Off-Screen Exact 1080x1920 Container for High-Res Story Export     */}
      {/* ==================================================================== */}
      <div
        className="fixed top-0 left-[-9999px] pointer-events-none"
        style={{ width: '1080px', height: '1920px' }}
      >
        <div
          ref={exportCardRef}
          style={{
            width: '1080px',
            height: '1920px',
            backgroundColor: '#0b5d3b',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '120px 80px',
            boxSizing: 'border-box',
            position: 'relative',
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          {/* NYSC Watermark (10% opacity) */}
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '850px',
              height: '850px',
              backgroundImage: `url('/nysc-logo.png')`,
              backgroundPosition: 'center',
              backgroundRepeat: 'no-repeat',
              backgroundSize: 'contain',
              opacity: 0.1,
              pointerEvents: 'none',
            }}
          />

          {/* Header */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(0,0,0,0.25)',
                color: '#d9a520',
                padding: '12px 32px',
                borderRadius: '999px',
                fontSize: '28px',
                fontWeight: 800,
                letterSpacing: '3px',
                textTransform: 'uppercase',
                marginBottom: '20px',
              }}
            >
              ★ NYSC 12/12 POP MONTH ★
            </div>
            <div
              style={{
                color: '#f6f1e0',
                fontSize: '92px',
                fontWeight: 900,
                letterSpacing: '-2px',
                textShadow: '0 8px 24px rgba(0,0,0,0.3)',
              }}
            >
              CorperWe
            </div>
          </div>

          {/* Centered Split Card (NGL Style) */}
          <div
            style={{
              width: '920px',
              borderRadius: '64px',
              overflow: 'hidden',
              boxShadow: '0 30px 60px rgba(0,0,0,0.4)',
              zIndex: 10,
              border: '6px solid rgba(255,255,255,0.25)',
            }}
          >
            {/* Top Half: Gold #d9a520 with dark green text */}
            <div
              style={{
                backgroundColor: '#d9a520',
                color: '#073d27',
                padding: '70px 50px',
                textAlign: 'center',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '170px',
                  fontWeight: 900,
                  letterSpacing: '-6px',
                  lineHeight: '1',
                  marginBottom: '16px',
                }}
              >
                12/12
              </div>
              <div
                style={{
                  fontSize: '56px',
                  fontWeight: 800,
                  letterSpacing: '-1px',
                  marginBottom: '16px',
                  maxWidth: '820px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {corperDisplayName}
              </div>
              <div
                style={{
                  backgroundColor: 'rgba(255, 255, 255, 0.45)',
                  color: '#073d27',
                  padding: '12px 36px',
                  borderRadius: '999px',
                  fontSize: '28px',
                  fontWeight: 800,
                  letterSpacing: '2px',
                  textTransform: 'uppercase',
                }}
              >
                send me anonymous messages!
              </div>
            </div>

            {/* Bottom Half: White with bold question */}
            <div
              style={{
                backgroundColor: '#ffffff',
                color: '#111827',
                padding: '80px 60px',
                textAlign: 'center',
                minHeight: '340px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <div
                style={{
                  fontSize: '54px',
                  fontWeight: 800,
                  lineHeight: 1.25,
                  letterSpacing: '-1px',
                  color: '#111827',
                }}
              >
                {question}
              </div>
            </div>
          </div>

          {/* Bottom Cream Link Pill */}
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              zIndex: 10,
            }}
          >
            <div
              style={{
                backgroundColor: '#f6f1e0',
                color: '#0b5d3b',
                padding: '24px 64px',
                borderRadius: '999px',
                fontSize: '36px',
                fontWeight: 800,
                boxShadow: '0 12px 30px rgba(0,0,0,0.25)',
                border: '4px solid #d9a520',
                letterSpacing: '-0.5px',
              }}
            >
              🔗 {cleanDisplayUrl}
            </div>
            <div
              style={{
                color: 'rgba(246, 241, 224, 0.8)',
                fontSize: '26px',
                fontWeight: 600,
                marginTop: '20px',
                letterSpacing: '1px',
              }}
            >
              Service and Humility 🇳🇬 • Passing Out Parade
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
