"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { completeOnboardingAction } from "@/app/dashboard/onboarding-action";
import { usePathname } from "next/navigation";

const Joyride = dynamic(() => import("react-joyride").then(mod => mod.Joyride), { ssr: false }) as any;

interface OnboardingTourProps {
  onboardingCompleted: boolean;
}

export function OnboardingTour({ onboardingCompleted }: OnboardingTourProps) {
  const [run, setRun] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    // Only run the tour if onboarding is not completed and we are on the main dashboard
    if (!onboardingCompleted && pathname === "/dashboard") {
      const timer = setTimeout(() => setRun(true), 1500);
      return () => clearTimeout(timer);
    }
  }, [onboardingCompleted, pathname]);

  const handleJoyrideCallback = async (data: any) => {
    const { status } = data;
    if (status === "finished" || status === "skipped") {
      setRun(false);
      await completeOnboardingAction();
    }
  };

  const steps = [
    {
      target: "body",
      title: "Welcome to Proposal Up AI!",
      content: "The most powerful AI tool for winning freelance jobs. Let's take a 1-minute tour of your new command center.",
      placement: "center",
      disableBeacon: true,
      image: "/onboarding/welcome.png",
    },
    {
      target: "#tour-sidebar-profiles",
      title: "1. Create Your Skill Profiles",
      content: "Your first real mission! You need to create at least one Skill Profile so the AI knows your expertise and can write tailored proposals that sell.",
      placement: "right",
      image: "/onboarding/profiles.png",
    },
    {
      target: "#tour-sidebar-pricing",
      title: "2. Plans & Pricing",
      content: "Upgrade your account to unlock more credits, custom tones, and priority AI generation. We have plans for every stage of your career.",
      placement: "right",
      image: "/onboarding/pricing.png",
    },
    {
      target: "#tour-sidebar-general",
      title: "3. General Profile",
      content: "Manage your personal details and account settings. Keep your information up-to-date for a professional appearance.",
      placement: "right",
      image: "/onboarding/general.png",
    },
    {
      target: "#tour-sidebar-subscription",
      title: "4. Your Subscription",
      content: "View and manage your current plan, billing history, and upcoming renewals all in one place.",
      placement: "right",
      image: "/onboarding/subscription.png",
    },
    {
      target: "#tour-header-credits",
      title: "5. Credits & Fuel",
      content: "Each proposal uses a small amount of fuel. Keep an eye on your credits here and top up anytime to keep winning.",
      placement: "bottom",
      image: "/onboarding/credits.png",
    },
    {
      target: "#tour-proposal-form",
      title: "6. The Magic Generator",
      content: "This is where the magic happens! Paste any job description here. Our AI will use your profiles to craft a high-converting proposal in seconds.",
      placement: "top",
      image: "/onboarding/generator.png",
    },
    {
      target: "body",
      title: "You're Ready to Win!",
      content: "That's it! You're now equipped with the ultimate freelance weapon. Go ahead and start your journey!",
      placement: "center",
      image: "/onboarding/victory.png",
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

      {step.image && (
        <div className="w-full h-40 overflow-hidden relative">
          <img src={step.image} alt={step.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />
        </div>
      )}

      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center gap-2">
            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold">
              {index + 1}
            </span>
            <span className="text-[10px] uppercase tracking-widest font-bold text-slate-400">Step Guide</span>
          </div>
          <button
            type="button"
            onClick={(e) => {
              if (skipProps.onClick) skipProps.onClick(e);
            }}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18" /><path d="m6 6 12 12" /></svg>
          </button>
        </div>

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

        <div className="flex items-center justify-between mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={(e) => {
              if (skipProps.onClick) skipProps.onClick(e);
            }}
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
      spotlightClicks={true}
      disableBeacons={true}
      tooltipComponent={Tooltip}
      styles={{
        options: {
          zIndex: 999999,
          overlayColor: "rgba(0, 0, 0, 0.6)",
        },
      } as any}
    />
  );
}
