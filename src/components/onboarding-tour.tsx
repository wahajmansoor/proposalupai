"use client";

import { useEffect, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import { completeOnboardingAction } from "./onboarding-action";
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
          className="w-full max-h-[80vh] object-contain rounded-2xl shadow-2xl border border-border/60"
        />
        {/* Close button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute -top-3 -right-3 flex items-center justify-center w-8 h-8 rounded-full bg-white text-foreground shadow-lg hover:bg-accent transition-colors"
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
  const [isClient, setIsClient] = useState(false);
  const [run, setRun] = useState(false);
  const [localCompleted, setLocalCompleted] = useState(false);
  const [lightboxSrc, setLightboxSrc] = useState<string | null>(null);
  const [lightboxAlt, setLightboxAlt] = useState<string>("");

  const [tourKey, setTourKey] = useState(0);

  const pathname = usePathname();
  const { data: session } = useSession();
  const isMobile = useIsMobile();

  // Only show the System Guide button on exact /dashboard route
  const isDashboardPage = pathname === '/dashboard';

  useEffect(() => {
    setIsClient(true);
    let isLocalCompletedStorage = false;
    try {
      isLocalCompletedStorage = localStorage.getItem("onboardingCompleted") === "true";
    } catch (e) {
      // Ignore if localStorage is disabled
    }

    if (isLocalCompletedStorage) {
      setLocalCompleted(true);
    }
  }, []);


  const handleJoyrideCallback = useCallback(async (data: any) => {
    const { status, action, type } = data;

    // Aggressively catch any scenario that means the tour is ending/exiting
    const isFinished = status === "finished";
    const isClosed = action === "close" || type === "tour:end";
    const isSkipped = action === "skip";

    // Only mark as complete if finished, explicitly closed, or skipped
    if (isFinished || isClosed || isSkipped) {
      setRun(false);
      setLocalCompleted(true);
      try {
        localStorage.setItem("onboardingCompleted", "true");
      } catch (e) { }

      if (isFinished || isSkipped || action === "close") {
        console.log("Tour ended, calling completeOnboardingAction");
        await completeOnboardingAction();
      }
    }
  }, []);

  if (!isClient) return null;

  const steps = [
    {
      target: "body",
      title: "Welcome to Proposal Up AI!",
      content: "The most powerful AI tool for winning freelance jobs. Let's take a 30-second tour of your new AI proposal writing tool.",
      placement: "center",
      disableBeacon: true,
    },
    {
      target: "#tour-dashboard-profiles",
      title: "1. Your Skill Profiles",
      content: "Your first mission! The AI needs to know your expertise. Set up your skill profiles here so the AI can write tailored proposals that sell.",
      placement: "bottom",
    },
    {
      target: "#tour-dashboard-create",
      title: "2. The Magic Generator",
      content: "Start here to create a proposal! Paste any job description, and our AI will use your profiles to craft a high-converting proposal in seconds.",
      placement: "bottom",
    },
    {
      target: "#tour-dashboard-saved",
      title: "3. Saved Proposals",
      content: "Access all your generated saved proposals here anytime, you can edit and resend to your clients as well.",
      placement: "bottom",
    },
    {
      target: "#tour-header-credits",
      title: "4. Credits & Fuel",
      content: "Each proposal improvement uses 1 credit. Keep an eye on your balance here and top up anytime to keep winning.",
      placement: "bottom",
    },
    {
      target: "#tour-sidebar-pricing",
      title: "5. Plans & Pricing",
      content: "Need more credits? Check out our pricing plans to upgrade your account.",
      placement: "right",
    },
    {
      target: "#tour-sidebar-subscription",
      title: "6. Your Subscription",
      content: "If you upgrade, you can view and manage your current plan, billing history, and upcoming renewals right here.",
      placement: "right",
    },
    {
      target: "body",
      title: "You're Ready to Win!",
      content: "That's it! You're now equipped with the ultimate AI proposal writing tool. Go ahead and start your journey!",
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
    <div className="bg-white dark:bg-background rounded-2xl shadow-2xl border p-0 max-w-sm overflow-hidden relative">
      <div className="h-1 bg-gradient-to-r from-primary to-blue-500 w-full" />

      <div className="p-6">
        {/* Header */}
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">System Guide</span>
          </div>
          <button
            type="button"
            onClick={(e) => { if (skipProps.onClick) skipProps.onClick(e); }}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

        {/* Text */}
        <div className="space-y-2">
          {step.title && (
            <h3 className="text-xl font-bold text-foreground leading-tight">
              {step.title}
            </h3>
          )}
          <div className="text-muted-foreground text-sm leading-relaxed">
            {step.content}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t border-border">
          <button
            type="button"
            onClick={(e) => { if (skipProps.onClick) skipProps.onClick(e); }}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors"
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
      {isDashboardPage && (
        <button
          onClick={() => {
            setTourKey(prev => prev + 1);
            setRun(true);
          }}
          className="fixed bottom-6 right-6 z-[40] hidden md:flex items-center gap-2 px-4 py-2 bg-white dark:bg-background border rounded-full shadow-lg hover:bg-accent dark:hover:bg-[#1a1a1a] text-foreground transition-all text-xs font-semibold"
        >
          <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          System Guide
        </button>
      )}

      <Joyride
        key={tourKey}
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
