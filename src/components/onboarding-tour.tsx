"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { completeOnboardingAction } from "@/app/dashboard/onboarding-action";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { createPortal } from "react-dom";
import { useIsMobile } from "@/hooks/use-mobile";

const Joyride = dynamic(() => import("react-joyride").then(mod => mod.Joyride), { ssr: false }) as any;

interface OnboardingTourProps {
  onboardingCompleted: boolean;
}

// ─── Lightbox ────────────────────────────────────────────────────────────────
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 flex items-center justify-center p-4 md:p-8 animate-in fade-in duration-200"
      style={{ zIndex: 9999999, background: "rgba(0,0,0,0.85)" }}
      onClick={onClose}
    >
      <div
        className="relative max-w-7xl w-full animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <img
          src={src}
          alt={alt}
          className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-slate-200/60"
        />
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 flex items-center justify-center w-8 h-8 rounded-full bg-white text-slate-800 shadow-lg hover:bg-slate-100 transition-colors"
          aria-label="Close image"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
        </button>
        <p className="text-center text-white/50 text-xs mt-3">Click outside or press Esc to close</p>
      </div>
    </div>,
    document.body
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function OnboardingTour({ onboardingCompleted }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>("");
  const pathname = usePathname();
  const { data: session } = useSession();
  const isMobile = useIsMobile();

  useEffect(() => {
    let isLocalCompletedStorage = false;
    try {
      isLocalCompletedStorage = localStorage.getItem("onboardingCompleted") === "true";
    } catch (e) {
      // Ignore if localStorage is disabled
    }

    if (isLocalCompletedStorage) {
      setLocalCompleted(true);
    }

    const shouldShow = false;

    if (shouldShow) {
      const timer = setTimeout(() => setRun(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [onboardingCompleted, pathname, localCompleted, session?.user?.emailVerified, isMobile]);

  if (onboardingCompleted) return null;

  const handleJoyrideCallback = async (data: any) => {
    const { status, action, type, index } = data;

    // Aggressively catch any scenario that means the tour is ending/exiting
    const isFinished = status === "finished";
    const isClosed = action === "close" || type === "tour:end";
    const isSkipped = action === "skip";

    // Only mark as complete if finished, explicitly closed, or skipped
    if (isFinished || isClosed || isSkipped) {
      setRun(false);
      setLocalCompleted(true);

      if (isFinished || isSkipped || action === "close") {
        console.log("Tour ended, calling completeOnboardingAction");
        await completeOnboardingAction();
      }
    }
  };

  const openLightbox = useCallback((src: string, alt: string) => {
    setLightboxSrc(src);
    setLightboxAlt(alt);
  }, []);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  const steps = [
    {
      target: "body",
      title: "Welcome to Proposal Up AI!",
      content: "The most powerful AI tool for winning freelance jobs. Let's take a 1-minute tour of your new command center.",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "#tour-sidebar-profiles",
      title: "1. Create Your Skill Profiles",
      content: "Your first real mission! You need to create at least one Skill Profile so the AI knows your expertise and can write tailored proposals that sell.",
      placement: "right",
    },
    {
      target: "#tour-sidebar-pricing",
      title: "2. Plans & Pricing",
      content: "Upgrade your account to unlock more credits, custom tones, and priority AI generation. We have plans for every stage of your career.",
      placement: "right",
    },
    {
      target: "#tour-sidebar-general",
      title: "3. General Profile",
      content: "Manage your personal details and account settings. Keep your information up-to-date for a professional appearance.",
      placement: "right",
    },
    {
      target: "#tour-sidebar-subscription",
      title: "4. Your Subscription",
      content: "View and manage your current plan, billing history, and upcoming renewals all in one place.",
      placement: "right",
    },
    {
      target: "#tour-header-credits",
      title: "5. Credits & Fuel",
      content: "Each proposal improvement uses a 1 credit. Keep an eye on your credits here and top up anytime to keep improving and winning.",
      placement: "bottom",
    },
    {
      target: "#tour-proposal-form",
      title: "6. The Magic Generator",
      content: "This is where the magic happens! Paste any job description here. Our AI will use your profiles to craft a high-converting proposal in seconds.",
      placement: "top",
    },
    {
      target: "body",
      title: "You're Ready to Win!",
      content: "That's it! You're now equipped with the ultimate freelance weapon. Go ahead and start your journey!",
      placement: "center",
    }
  ];

  const Tooltip = ({
    index,
    step,
    primaryProps,
    skipProps,
    isLastStep,
  }: any) => (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-0 max-w-sm overflow-hidden relative">
      <div className="h-1 bg-gradient-to-r from-primary to-blue-500 w-full" />

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">System Guide</span>
          </div>
          <button
            type="button"
            onClick={(e) => { if (skipProps.onClick) skipProps.onClick(e); }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        {/* Text */}
        <div className="space-y-2">
          {step.title && (
            <h3 className="text-xl font-bold text-slate-900 dark:text-white leading-tight">
              {step.title}
            </h3>
          )}
          <div className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
            {step.content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={(e) => { if (skipProps.onClick) skipProps.onClick(e); }}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 transition-colors"
          >
            Skip Tour
          </button>
          <button
            type="button"
            {...primaryProps}
            className="px-6 py-2.5 rounded-full bg-button-gradient text-primary-foreground font-bold text-sm shadow-lg shadow-primary/20 hover:opacity-90 active:opacity-80 transition-all"
          >
            {isLastStep ? "Get Started" : "Next Step"}
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <button
        onClick={() => setRun(true)}
        className="fixed bottom-6 right-6 z-[9999] hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-full shadow-lg hover:bg-slate-50 transition-all text-xs font-semibold text-slate-700 dark:text-slate-200"
      >
        <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
        System Guide
      </button>

      <Joyride
        callback={handleJoyrideCallback}
        continuous
        hideCloseButton
        run={run}
        scrollToFirstStep
        showProgress={false}
        showSkipButton
        steps={steps}
        disableScrolling={false}
        disableOverlayClose={true}
        spotlightClicks={false}
        disableBeacons={true}
        disableCloseOnEsc={true}
        tooltipComponent={Tooltip}
        styles={{
          options: {
            zIndex: 999999,
            overlayColor: "rgba(0, 0, 0, 0.6)",
          },
        } as any}
        floaterProps={{
          disableFlip: true,
        }}
      />
    </>
  );
}
