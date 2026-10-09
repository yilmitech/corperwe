/**
 * Visitor Page Component (/pop/[slug])
 * Specifications:
 * - Heading: "CorperWe"
 * - Subtitle: "Send Corper [name] an anonymous message"
 * - Textarea (max 300 characters, with real-time character counter)
 * - Send button
 * - Post-submission confirmation with "Send another" option
 * - Friendly message if the slug doesn't exist
 * - Light client-side limit of 1 message per 30 seconds per browser (no login required)
 * - Strict privacy: zero tracking, no IP/device storage, no login
 */
import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Send, CheckCircle2, AlertCircle, Clock, PlusCircle } from 'lucide-react';
import { getPopBySlug, sendAnonymousMessage } from '../lib/firebase';
import { formatCorperName, checkVisitorCooldown, recordVisitorSend } from '../lib/utils';
import { PopProfile } from '../types';

interface VisitorPageProps {
  slug: string;
  onNavigateHome?: () => void;
}

export const VisitorPage: React.FC<VisitorPageProps> = ({ slug, onNavigateHome }) => {
  const [pop, setPop] = useState<PopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Rate Limiting Cooldown State
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);

  // Load Corper Pop Profile
  useEffect(() => {
    let isMounted = true;
    async function fetchPop() {
      try {
        setLoading(true);
        const data = await getPopBySlug(slug);
        if (!isMounted) return;
        if (!data) {
          setNotFound(true);
        } else {
          setPop({
            slug,
            name: data.name,
            ownerId: data.ownerId,
            createdAt: data.createdAt,
            question: data.question || "What's your best memory of me?",
          });
        }
      } catch (err) {
        console.error('Error fetching pop document:', err);
        if (isMounted) setNotFound(true);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    if (slug) {
      fetchPop();
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Rate Limiting Cooldown Clock
  useEffect(() => {
    const checkCooldown = () => {
      const { allowed, remainingSecs } = checkVisitorCooldown(slug);
      if (!allowed) {
        setCooldownRemaining(remainingSecs);
      } else {
        setCooldownRemaining(0);
      }
    };

    checkCooldown();
    const interval = setInterval(checkCooldown, 1000);
    return () => clearInterval(interval);
  }, [slug, sentSuccess]);

  const corperDisplayName = pop ? formatCorperName(pop.name) : 'Corper';
  const charCount = messageText.length;
  const maxChars = 300;

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim() || sending) return;

    // Check rate limit
    const { allowed, remainingSecs } = checkVisitorCooldown(slug);
    if (!allowed) {
      setErrorMsg(`Please wait ${remainingSecs}s before sending another message.`);
      return;
    }

    try {
      setSending(true);
      setErrorMsg(null);
      await sendAnonymousMessage(slug, messageText.trim());
      recordVisitorSend(slug);
      setSentSuccess(true);
      setMessageText('');

      // Confetti celebration
      confetti({
        particleCount: 70,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0b5d3b', '#d9a520', '#f6f1e0'],
      });
    } catch (err: any) {
      console.error('Failed to send anonymous message:', err);
      setErrorMsg('Failed to send message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // 1. Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-[#073d27] text-[#f6f1e0] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#d9a520] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Opening Corper's 12/12 Link...</h2>
        <p className="text-sm text-[#f6f1e0]/70 mt-1">Fetching Passing Out Parade page</p>
      </div>
    );
  }

  // 2. Not Found State
  if (notFound || !pop) {
    return (
      <div className="min-h-screen bg-[#073d27] text-[#f6f1e0] flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-[#0b5d3b] rounded-3xl p-8 border-2 border-[#d9a520]/40 shadow-2xl flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#d9a520]/20 flex items-center justify-center mb-4 text-[#d9a520]">
            <AlertCircle className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-black mb-2">Corper Not Found</h1>
          <p className="text-sm text-[#f6f1e0]/80 mb-6 leading-relaxed">
            This 12/12 link <span className="font-mono bg-black/30 px-2 py-0.5 rounded text-[#d9a520]">/pop/{slug}</span> does not exist or has already completed their POP celebration.
          </p>
          <button
            onClick={() => {
              if (onNavigateHome) onNavigateHome();
              window.location.href = '/?view=landing';
            }}
            className="w-full bg-[#d9a520] hover:bg-[#c49219] text-[#073d27] font-black py-3.5 px-6 rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer flex items-center justify-center gap-2"
          >
            <PlusCircle className="w-5 h-5" />
            Create Your Own 12/12 Link
          </button>
        </div>
      </div>
    );
  }

  // 3. Post-Send Confirmation State
  if (sentSuccess) {
    return (
      <div className="min-h-screen bg-[#073d27] text-[#f6f1e0] flex flex-col items-center justify-center p-4">
        <div className="max-w-sm w-full bg-[#0b5d3b] rounded-3xl p-6 sm:p-8 border-2 border-[#d9a520] shadow-2xl text-center flex flex-col items-center">
          <div className="w-16 h-16 rounded-full bg-[#d9a520] flex items-center justify-center text-[#073d27] mb-4 shadow-lg animate-bounce">
            <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
          </div>
          
          <h2 className="text-2xl font-black tracking-tight text-[#f6f1e0] mb-2">
            Message Sent!
          </h2>
          <p className="text-sm text-[#f6f1e0]/90 mb-6 leading-relaxed">
            Your anonymous message was delivered directly to <span className="font-bold text-[#d9a520]">{corperDisplayName}'s</span> private 12/12 inbox.
          </p>

          <div className="w-full flex flex-col gap-3">
            <button
              onClick={() => setSentSuccess(false)}
              className="w-full bg-[#d9a520] hover:bg-[#c9951b] text-[#073d27] font-black py-3.5 px-5 rounded-2xl shadow-lg transition-transform active:scale-95 cursor-pointer text-base"
            >
              Send Another Message
            </button>

            <button
              onClick={() => {
                if (onNavigateHome) onNavigateHome();
                window.location.href = '/?view=landing';
              }}
              className="w-full bg-black/30 hover:bg-black/50 text-[#f6f1e0] font-bold py-3 px-5 rounded-2xl border border-white/20 transition-all cursor-pointer text-sm"
            >
              Are you a Corper? Get Your Own 12/12 Link
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 4. Main Visitor Form
  return (
    <div className="min-h-screen bg-[#073d27] text-white flex flex-col items-center justify-start p-4 sm:p-6 pb-12 selection:bg-[#d9a520] selection:text-[#0b5d3b]">
      {/* Top Branding */}
      <div className="w-full max-w-sm flex items-center justify-between pt-2 pb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#d9a520] flex items-center justify-center font-black text-[#073d27] text-sm shadow">
            12
          </div>
          <span className="text-2xl font-black tracking-tight text-[#f6f1e0]">
            CorperWe
          </span>
        </div>
        <div className="text-[11px] font-bold text-[#d9a520] bg-black/30 px-2.5 py-1 rounded-full uppercase tracking-wider">
          100% Anonymous
        </div>
      </div>

      {/* Main Container */}
      <div className="w-full max-w-sm flex flex-col gap-4">
        {/* Split Prompt Card (Preview of the Corper's card) */}
        <div className="rounded-3xl overflow-hidden shadow-2xl border-2 border-[#d9a520]/40">
          <div className="bg-[#d9a520] text-[#073d27] p-5 text-center flex flex-col items-center">
            <div className="text-xs font-black uppercase tracking-wider bg-white/40 px-3 py-0.5 rounded-full mb-1">
              NYSC 12/12 POP
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">
              Send {corperDisplayName} an anonymous message
            </h1>
          </div>
          <div className="bg-white text-gray-900 p-5 text-center">
            <p className="font-extrabold text-base sm:text-lg leading-snug">
              "{pop.question}"
            </p>
          </div>
        </div>

        {/* Message Input Form */}
        <form
          onSubmit={handleSendMessage}
          className="bg-[#0b5d3b] rounded-3xl p-5 shadow-2xl border border-white/10 flex flex-col gap-4"
        >
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs text-[#f6f1e0]/80 font-medium px-1">
              <span>Write something honest, funny or kind...</span>
              <span className={`font-mono font-bold ${charCount >= 280 ? 'text-red-300' : 'text-[#d9a520]'}`}>
                {charCount}/{maxChars}
              </span>
            </div>

            <textarea
              value={messageText}
              onChange={(e) => setMessageText(e.target.value.slice(0, maxChars))}
              placeholder={`Send your best memory, confession, or POP prayer to ${corperDisplayName}...`}
              rows={5}
              disabled={sending}
              className="w-full bg-white text-gray-900 placeholder-gray-400 font-medium text-base rounded-2xl p-4 focus:outline-none focus:ring-4 focus:ring-[#d9a520] resize-none shadow-inner"
            />
          </div>

          {/* Cooldown Warning Notice */}
          {cooldownRemaining > 0 && (
            <div className="bg-amber-950/60 border border-amber-500/40 rounded-xl px-3.5 py-2 flex items-center gap-2 text-xs text-amber-200">
              <Clock className="w-4 h-4 text-[#d9a520] shrink-0" />
              <span>
                Please wait <strong className="text-[#d9a520]">{cooldownRemaining}s</strong> before sending another message.
              </span>
            </div>
          )}

          {/* Error Message */}
          {errorMsg && (
            <div className="bg-red-950/60 border border-red-500/50 rounded-xl px-3.5 py-2 text-xs text-red-200 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Send Button */}
          <button
            type="submit"
            disabled={!messageText.trim() || sending || cooldownRemaining > 0}
            className="w-full bg-[#d9a520] hover:bg-[#c49219] active:scale-[0.98] text-[#073d27] font-black py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-2.5 text-base transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <div className="w-5 h-5 border-2 border-[#073d27] border-t-transparent rounded-full animate-spin" />
            ) : (
              <Send className="w-5 h-5 stroke-[2.5]" />
            )}
            {sending ? 'Delivering...' : 'Send Anonymous Message'}
          </button>

        </form>

        {/* Home Link if Corper */}
        <div className="pt-2 w-full">
          <a
            href="/?view=landing"
            onClick={(e) => {
              e.preventDefault();
              if (onNavigateHome) {
                onNavigateHome();
              }
              window.location.href = '/?view=landing';
            }}
            className="w-full bg-red-600 hover:bg-red-700 active:scale-[0.98] text-white font-extrabold text-base sm:text-lg py-3.5 px-5 rounded-2xl shadow-xl border-2 border-red-400 transition-all cursor-pointer flex items-center justify-center gap-2 text-center no-underline select-none"
          >
            <span>Are you an NYSC Corper? Create your own 12/12 link →</span>
          </a>
        </div>
      </div>
    </div>
  );
};
