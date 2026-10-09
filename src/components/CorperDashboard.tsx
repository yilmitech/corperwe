/**
 * Corper Dashboard Component
 * Manages:
 * - 12/12 Link Generation & Setup
 * - 12/12 Story Card preview & 1080x1920 PNG download
 * - Private inbox with real-time Firestore messages
 * - Clearly labelled "From CorperWe" welcome message (2 mins after link creation)
 * - Message deletion & state management
 */
import React, { useState, useEffect } from 'react';
import { User } from 'firebase/auth';
import {
  Link2,
  Inbox,
  Share2,
  Copy,
  ExternalLink,
  Trash2,
  RefreshCw,
  LogOut,
  Edit3,
  HelpCircle,
  Eye,
  Check,
  ShieldCheck,
  Send,
  X,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  createPopDoc,
  getPopBySlug,
  findPopByOwner,
  subscribeToPopMessages,
  deletePopMessage,
  updatePopQuestion,
  deletePopDoc,
  logOut,
} from '../lib/firebase';
import {
  formatCorperName,
  generateSlug,
  getShareUrl,
  formatTimeAgo,
} from '../lib/utils';
import { ShareCard } from './ShareCard';
import { InboxMessageCard } from './InboxMessageCard';
import { PopProfile, PopMessageItem } from '../types';
import {
  getWelcomeInboxMessages,
  WelcomeMessage,
  WELCOME_MESSAGE_TEXT,
} from '../data/contentPool';

interface CorperDashboardProps {
  user: User;
  onViewVisitorPage: (slug: string) => void;
}

const QUESTION_PRESETS = [
  "What's your best memory of me?",
  "What will you miss most about me after POP?",
  "Drop an honest confession before I pass out! 🤐",
  "Rate my NYSC khaki drip from 1 to 10 🎖️",
  "What should be my next move after NYSC? 🚀",
  "Say one prayer for me as I complete 12/12! 🇳🇬",
];

export const CorperDashboard: React.FC<CorperDashboardProps> = ({
  user,
  onViewVisitorPage,
}) => {
  const [pop, setPop] = useState<PopProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'card' | 'inbox'>('card');

  // Creation form state
  const [inputName, setInputName] = useState('');
  const [selectedQuestion, setSelectedQuestion] = useState(QUESTION_PRESETS[0]);
  const [customQuestion, setCustomQuestion] = useState('');
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Inbox & Messages state
  const [firestoreMessages, setFirestoreMessages] = useState<PopMessageItem[]>([]);
  const [dismissedWelcomeIds, setDismissedWelcomeIds] = useState<string[]>([]);
  const [currentTime, setCurrentTime] = useState(Date.now());
  const [copiedLink, setCopiedLink] = useState(false);

  // Question Editing state
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [editingQuestionChoice, setEditingQuestionChoice] = useState('');
  const [customEditingQuestion, setCustomEditingQuestion] = useState('');
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [questionUpdatedToast, setQuestionUpdatedToast] = useState(false);

  // Load existing Pop for user
  useEffect(() => {
    let isMounted = true;
    async function loadUserPop() {
      try {
        setLoading(true);
        // Look up saved slug in localStorage for this user
        const savedSlug = localStorage.getItem(`corperwe_slug_${user.uid}`);
        let found = savedSlug
          ? { slug: savedSlug, data: await getPopBySlug(savedSlug) }
          : null;
        if (!found?.data) {
          // Fallback: works after clearing browser data or switching phones
          found = await findPopByOwner(user.uid);
        }
        if (isMounted && found?.data) {
          localStorage.setItem(`corperwe_slug_${user.uid}`, found.slug);
          setPop({
            slug: found.slug,
            name: found.data.name,
            ownerId: found.data.ownerId,
            createdAt: found.data.createdAt,
            question: found.data.question || QUESTION_PRESETS[0],
          });
          setLoading(false);
          return;
        }
      } catch (err) {
        console.error('Error finding user pop:', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadUserPop();
    return () => {
      isMounted = false;
    };
  }, [user.uid]);

  // Load dismissed welcome-card IDs from localStorage
  useEffect(() => {
    if (!pop) return;
    try {
      const stored = localStorage.getItem(`corperwe_dismissed_welcome_${pop.slug}`);
      if (stored) {
        setDismissedWelcomeIds(JSON.parse(stored));
      }
    } catch {
      // Ignore
    }
  }, [pop]);

  // Periodic timer to show the welcome card after 2 minutes
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now());
    }, 10000);
    return () => clearInterval(timer);
  }, []);

  // Real-time Firestore Listener for received messages
  useEffect(() => {
    if (!pop?.slug) return;

    const unsubscribe = subscribeToPopMessages(
      pop.slug,
      (messages) => {
        setFirestoreMessages(
          messages.map((m) => ({
            id: m.id || Math.random().toString(),
            text: m.text,
            createdAt: m.createdAt,
          }))
        );
      },
      (error) => {
        console.error('Subscription error in dashboard:', error);
      }
    );

    return () => unsubscribe();
  }, [pop?.slug]);

  // Create new Pop Link
  const handleCreatePop = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputName.trim()) {
      setFormError('Please enter your name or nickname');
      return;
    }
    if (inputName.trim().length > 30) {
      setFormError('Name must be 30 characters or fewer');
      return;
    }

    try {
      setCreating(true);
      setFormError(null);
      const chosenSlug = generateSlug(inputName.trim());
      const questionToUse = customQuestion.trim() || selectedQuestion;

      await createPopDoc(chosenSlug, inputName.trim(), user.uid, questionToUse);

      const newPop: PopProfile = {
        slug: chosenSlug,
        name: inputName.trim(),
        ownerId: user.uid,
        createdAt: new Date(),
        question: questionToUse,
      };

      localStorage.setItem(`corperwe_slug_${user.uid}`, chosenSlug);
      setPop(newPop);
    } catch (err) {
      console.error('Failed to create Pop document:', err);
      setFormError('Could not create your 12/12 link. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  // Delete message (real Firestore message or the local welcome card)
  const handleDeleteMessage = async (messageId: string) => {
    if (!pop) return;

    if (messageId.startsWith('welcome-')) {
      const nextDeleted = [...dismissedWelcomeIds, messageId];
      setDismissedWelcomeIds(nextDeleted);
      localStorage.setItem(`corperwe_dismissed_welcome_${pop.slug}`, JSON.stringify(nextDeleted));
    } else {
      try {
        await deletePopMessage(pop.slug, messageId);
      } catch (err) {
        console.error('Failed to delete message:', err);
      }
    }
  };

  const handleOpenEditQuestion = () => {
    setEditingQuestionChoice(pop?.question || QUESTION_PRESETS[0]);
    setCustomEditingQuestion('');
    setShowQuestionModal(true);
  };

  const handleSaveQuestion = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!pop) return;
    const finalQuestion = customEditingQuestion.trim() || editingQuestionChoice.trim();
    if (!finalQuestion || savingQuestion) return;

    try {
      setSavingQuestion(true);
      await updatePopQuestion(pop.slug, finalQuestion);
      setPop({
        ...pop,
        question: finalQuestion,
      });
      setShowQuestionModal(false);
      setQuestionUpdatedToast(true);
      setTimeout(() => setQuestionUpdatedToast(false), 3000);
      confetti({
        particleCount: 60,
        spread: 60,
        origin: { y: 0.6 },
        colors: ['#0b5d3b', '#d9a520', '#f6f1e0'],
      });
    } catch (err) {
      console.error('Failed to update card question:', err);
    } finally {
      setSavingQuestion(false);
    }
  };

  // Merged list: real messages + the labelled welcome card
  const popCreatedAtMs = pop?.createdAt?.toDate
    ? pop.createdAt.toDate().getTime()
    : pop?.createdAt instanceof Date
    ? pop.createdAt.getTime()
    : pop
    ? Date.now() - 5000
    : Date.now();

  const welcomeMessages = pop
    ? getWelcomeInboxMessages(
        popCreatedAtMs,
        dismissedWelcomeIds,
        currentTime
      )
    : [];

  const allMessages: PopMessageItem[] = [...firestoreMessages, ...welcomeMessages].sort(
    (a, b) => {
      const timeA = a.createdAt?.toMillis
        ? a.createdAt.toMillis()
        : a.createdAt instanceof Date
        ? a.createdAt.getTime()
        : typeof a.createdAt === 'number'
        ? a.createdAt
        : 0;
      const timeB = b.createdAt?.toMillis
        ? b.createdAt.toMillis()
        : b.createdAt instanceof Date
        ? b.createdAt.getTime()
        : typeof b.createdAt === 'number'
        ? b.createdAt
        : 0;
      return timeB - timeA;
    }
  );

  const totalMessageCount = firestoreMessages.length;

  const handleCopyLink = () => {
    if (!pop) return;
    const url = getShareUrl(pop.slug);
    navigator.clipboard?.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-[#073d27] text-white flex flex-col items-center justify-center p-6 text-center">
        <div className="w-12 h-12 border-4 border-[#d9a520] border-t-transparent rounded-full animate-spin mb-4" />
        <h2 className="text-xl font-bold">Loading CorperWe...</h2>
      </div>
    );
  }

  // If user hasn't created their link yet, show creation view
  if (!pop) {
    return (
      <div className="min-h-screen bg-[#073d27] text-[#f6f1e0] flex flex-col items-center justify-start p-4 sm:p-6 pb-12 selection:bg-[#d9a520] selection:text-[#0b5d3b]">
        {/* Top Header */}
        <div className="w-full max-w-sm flex items-center justify-between pt-2 pb-6">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-[#d9a520] flex items-center justify-center font-black text-[#073d27] text-sm shadow">
              12
            </div>
            <span className="text-2xl font-black tracking-tight text-[#f6f1e0]">
              CorperWe
            </span>
          </div>
          <button
            onClick={() => logOut()}
            className="text-xs text-[#f6f1e0]/80 hover:text-white flex items-center gap-1 font-semibold bg-black/20 px-3 py-1.5 rounded-full"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>

        {/* Welcome Card & Form */}
        <div className="w-full max-w-sm bg-[#0b5d3b] rounded-3xl p-6 sm:p-7 shadow-2xl border-2 border-[#d9a520]/40 flex flex-col gap-5">
          <div className="text-center">
            <div className="inline-flex items-center gap-1.5 bg-[#d9a520]/20 text-[#d9a520] px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider mb-2">
              12/12 Passing Out Parade
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Create Your 12/12 Link
            </h1>
            
          </div>

          <form onSubmit={handleCreatePop} className="flex flex-col gap-4">
            {/* Display Name Input */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#d9a520] mb-1.5">
                Your Name or Nickname (Max 30)
              </label>
              <input
                type="text"
                value={inputName}
                onChange={(e) => setInputName(e.target.value.slice(0, 30))}
                placeholder="e.g. Ada, Chidi, or Tunde"
                className="w-full bg-white text-gray-900 font-bold px-4 py-3.5 rounded-2xl focus:outline-none focus:ring-4 focus:ring-[#d9a520] text-base placeholder-gray-400"
                maxLength={30}
                required
              />
           
            </div>

            {/* Question Preset Selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-[#d9a520] mb-1.5">
                Choose a Question
              </label>
              <div className="flex flex-col gap-2">
                {QUESTION_PRESETS.slice(0, 3).map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setSelectedQuestion(q);
                      setCustomQuestion('');
                    }}
                    className={`text-left text-xs font-bold p-3 rounded-xl border transition-all cursor-pointer ${
                      selectedQuestion === q && !customQuestion
                        ? 'bg-[#d9a520] text-[#073d27] border-white shadow-md'
                        : 'bg-black/20 text-[#f6f1e0] border-white/10 hover:bg-black/30'
                    }`}
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Question Option */}
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-[#d9a520]">
                Or Write Custom Question:
              </label>
              <input
                type="text"
                value={customQuestion}
                onChange={(e) => setCustomQuestion(e.target.value.slice(0, 100))}
                placeholder="Type your own custom question here..."
                className="w-full bg-white text-gray-900 placeholder-gray-400 text-xs font-bold px-3.5 py-3 rounded-xl border-2 border-[#d9a520] focus:outline-none focus:ring-2 focus:ring-[#d9a520]"
                maxLength={100}
              />
            </div>

            {formError && (
              <div className="bg-red-950/60 border border-red-500/50 rounded-xl p-3 text-xs text-red-200">
                {formError}
              </div>
            )}

            <button
              type="submit"
              disabled={creating || !inputName.trim()}
              className="w-full bg-[#d9a520] hover:bg-[#c9951b] active:scale-[0.98] text-[#073d27] font-black py-4 px-6 rounded-2xl shadow-xl flex items-center justify-center gap-2 text-base transition-all cursor-pointer disabled:opacity-50"
            >
              {creating ? (
                <div className="w-5 h-5 border-2 border-[#073d27] border-t-transparent rounded-full animate-spin" />
              ) : (
                <Link2 className="w-5 h-5" />
              )}
              {creating ? 'Generating Link...' : 'Generate My 12/12 Link'}
            </button>
          </form>

          {/* Privacy Footnote */}
          <div className="bg-black/20 rounded-2xl p-3 text-center text-[11px] text-[#f6f1e0]/70 flex items-center justify-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#d9a520] shrink-0" />
            <span>Privacy first: Only your display name is collected.</span>
          </div>
        </div>
      </div>
    );
  }

  // Corper has active link: Show Dashboard
  const fullLink = getShareUrl(pop.slug);
  const corperDisplayName = formatCorperName(pop.name);

  return (
    <div className="min-h-screen bg-[#073d27] text-white flex flex-col items-center justify-start p-3 sm:p-5 pb-16 selection:bg-[#d9a520] selection:text-[#0b5d3b]">
      {/* Top Navbar */}
      <header className="w-full max-w-sm flex items-center justify-between pt-1 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-[#d9a520] flex items-center justify-center font-black text-[#073d27] text-sm shadow">
            12
          </div>
          <div>
            <span className="text-xl font-black tracking-tight text-[#f6f1e0] block leading-tight">
              CorperWe
            </span>
           
          </div>
        </div>

        <div className="flex items-center gap-2">
        
          <button
            onClick={() => logOut()}
            className="text-white/60 hover:text-white p-1.5 rounded-lg hover:bg-black/20 transition-all cursor-pointer"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Tabs Bar */}
      <div className="w-full max-w-sm bg-black/30 p-1 rounded-2xl flex items-center gap-1 mb-4 border border-white/10">
        <button
          onClick={() => setActiveTab('card')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
            activeTab === 'card'
              ? 'bg-[#d9a520] text-[#073d27] shadow-md'
              : 'text-[#f6f1e0]/70 hover:text-white'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          12/12 Story Card
        </button>

        <button
          onClick={() => setActiveTab('inbox')}
          className={`flex-1 py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer relative ${
            activeTab === 'inbox'
              ? 'bg-[#d9a520] text-[#073d27] shadow-md'
              : 'text-[#f6f1e0]/70 hover:text-white'
          }`}
        >
          <Inbox className="w-3.5 h-3.5" />
          <span>Inbox</span>
          {totalMessageCount > 0 && (
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-black leading-none ${
                activeTab === 'inbox'
                  ? 'bg-[#073d27] text-[#d9a520]'
                  : 'bg-[#d9a520] text-[#073d27]'
              }`}
            >
              {totalMessageCount}
            </span>
          )}
        </button>
      </div>

      {/* Tab 1: 12/12 Share Card & Sharing */}
      {activeTab === 'card' && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          {/* Card Preview Component */}
          <ShareCard
            name={pop.name}
            question={pop.question || QUESTION_PRESETS[0]}
            slug={pop.slug}
            onEditQuestion={handleOpenEditQuestion}
          />

          {/* Change Question Banner */}
          <div className="w-full bg-[#0b5d3b] rounded-2xl p-4 border border-white/10 flex items-center justify-between shadow-lg">
            <div className="flex-1 pr-3">
              <div className="text-[10px] font-black uppercase tracking-wider text-[#d9a520] flex items-center gap-1.5">
                <HelpCircle className="w-3.5 h-3.5 text-[#d9a520]" />
                <span>Card Question Prompt</span>
              </div>
              <p className="text-xs font-extrabold text-white mt-1 line-clamp-2">
                "{pop.question || QUESTION_PRESETS[0]}"
              </p>
            </div>
            <button
              onClick={handleOpenEditQuestion}
              className="bg-[#d9a520] hover:bg-[#c9951b] active:scale-95 text-[#073d27] font-black text-xs px-3.5 py-2.5 rounded-xl flex items-center gap-1.5 shadow transition-all cursor-pointer shrink-0"
            >
              <Edit3 className="w-3.5 h-3.5" />
              Change Question
            </button>
          </div>

          {/* Quick Share Link Box */}
          <div className="w-full bg-[#0b5d3b] rounded-2xl p-4 border border-white/10 flex flex-col gap-2.5">
            <div className="flex items-center justify-between text-xs text-[#f6f1e0]/80 font-bold">
              <span>Your Personal Link</span>
              <span className="text-[#d9a520] font-mono text-[11px]">/pop/{pop.slug}</span>
            </div>

            <div className="flex items-center gap-2 bg-black/30 p-2 rounded-xl border border-white/10">
              <input
                type="text"
                readOnly
                value={fullLink}
                className="bg-transparent text-xs text-white font-mono flex-1 outline-none truncate"
              />
              <button
                onClick={handleCopyLink}
                className="bg-[#d9a520] text-[#073d27] px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 cursor-pointer shrink-0 hover:bg-[#c9951b]"
              >
                {copiedLink ? <Check className="w-3 h-3 stroke-[3]" /> : <Copy className="w-3 h-3" />}
                {copiedLink ? 'Copied' : 'Copy'}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* Tab 2: Private Inbox */}
      {activeTab === 'inbox' && (
        <div className="w-full max-w-sm flex flex-col gap-4">
          {/* Inbox Header Banner */}
          <div className="bg-[#0b5d3b] rounded-2xl p-4 border border-white/10 flex items-center justify-between">
            <div>
              <h2 className="font-black text-lg text-[#f6f1e0] flex items-center gap-2">
                <span>Private Inbox</span>
                <span className="bg-[#d9a520] text-[#073d27] text-xs font-black px-2 py-0.5 rounded-full">
                  {totalMessageCount}
                </span>
              </h2>
              <p className="text-xs text-[#f6f1e0]/70">
                Only you can view and delete these messages
              </p>
            </div>

          </div>

          {/* Empty State */}
          {allMessages.length === 0 ? (
            <div className="bg-[#0b5d3b]/80 border-2 border-dashed border-[#d9a520]/40 rounded-3xl p-8 text-center flex flex-col items-center gap-4 my-2">
              <div className="w-16 h-16 rounded-full bg-[#d9a520]/20 flex items-center justify-center text-[#d9a520]">
                <Inbox className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-black text-lg text-white mb-1">
                  No messages yet
                </h3>
                <p className="text-xs text-[#f6f1e0]/75 leading-relaxed max-w-[240px] mx-auto">
                  Share your 12/12 card on WhatsApp Status or Instagram to get the first one!
                </p>
              </div>

              <button
                onClick={() => setActiveTab('card')}
                className="bg-[#d9a520] hover:bg-[#c9951b] text-[#073d27] font-black text-xs py-3 px-5 rounded-xl shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                Share My 12/12 Card
              </button>

             
            </div>
          ) : (
            /* Messages List */
            <div className="flex flex-col gap-4">
              {allMessages.map((msg) => (
                <InboxMessageCard
                  key={msg.id}
                  message={msg}
                  onDelete={handleDeleteMessage}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Success Toast */}
      {questionUpdatedToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-[#d9a520] text-[#073d27] font-black px-5 py-2.5 rounded-full shadow-2xl flex items-center gap-2 text-sm border-2 border-white animate-bounce">
          <Check className="w-4 h-4 stroke-[3]" />
          Card question updated successfully!
        </div>
      )}

      {/* Question Editing Modal */}
      {showQuestionModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0b5d3b] border-2 border-[#d9a520] rounded-3xl p-6 max-w-sm w-full text-white shadow-2xl relative flex flex-col gap-4 animate-in fade-in zoom-in duration-200 max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setShowQuestionModal(false)}
              className="absolute top-4 right-4 text-white/70 hover:text-white p-1 rounded-full hover:bg-black/30 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#d9a520] flex items-center justify-center text-[#073d27] shrink-0 font-black">
                <Edit3 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-lg font-black text-[#f6f1e0] leading-tight">
                  Change 12/12 Question
                </h3>
                <span className="text-xs text-[#d9a520] font-bold">
                  Updates your story card & link
                </span>
              </div>
            </div>

            {/* Presets */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black uppercase tracking-wider text-[#d9a520]">
                Choose a Question
              </label>
              <div className="flex flex-col gap-1.5 max-h-[170px] overflow-y-auto pr-1">
                {QUESTION_PRESETS.map((q) => (
                  <button
                    key={q}
                    type="button"
                    onClick={() => {
                      setEditingQuestionChoice(q);
                      setCustomEditingQuestion('');
                    }}
                    className={`text-left text-xs font-bold p-3 rounded-xl border transition-all cursor-pointer ${
                      editingQuestionChoice === q && !customEditingQuestion
                        ? 'bg-[#d9a520] text-[#073d27] border-white shadow-md'
                        : 'bg-black/20 text-[#f6f1e0] border-white/10 hover:bg-black/30'
                    }`}
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Question */}
            <div className="flex flex-col gap-1.5 bg-black/30 p-3.5 rounded-2xl border border-white/15">
              <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-[#d9a520]">
                <span>Or Write Custom Question:</span>
                <span className="font-mono text-white/70 text-[10px]">
                  {customEditingQuestion.length}/100
                </span>
              </div>
              <input
                type="text"
                value={customEditingQuestion}
                onChange={(e) => {
                  setCustomEditingQuestion(e.target.value.slice(0, 100));
                  if (e.target.value.trim()) {
                    setEditingQuestionChoice('');
                  }
                }}
                placeholder="Type your custom question here..."
                className="w-full bg-white text-gray-900 placeholder-gray-400 font-bold text-xs px-3.5 py-3 rounded-xl border-2 border-[#d9a520] focus:outline-none focus:ring-2 focus:ring-[#d9a520] shadow-sm"
                maxLength={100}
              />
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2 pt-1">
              <button
                onClick={() => handleSaveQuestion()}
                disabled={savingQuestion || (!editingQuestionChoice && !customEditingQuestion.trim())}
                className="w-full bg-[#d9a520] hover:bg-[#c9951b] active:scale-95 text-[#073d27] font-black py-3.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm shadow-lg cursor-pointer disabled:opacity-50"
              >
                {savingQuestion ? (
                  <div className="w-4 h-4 border-2 border-[#073d27] border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Check className="w-4 h-4 stroke-[3]" />
                )}
                <span>{savingQuestion ? 'Updating...' : 'Save & Update Question'}</span>
              </button>

              <button
                onClick={() => setShowQuestionModal(false)}
                className="w-full bg-white/10 hover:bg-white/20 text-[#f6f1e0] font-bold py-2.5 px-4 rounded-xl text-xs cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
