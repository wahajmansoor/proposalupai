"use client";

import { useProposalStore } from '@/lib/store/proposal-store';
import { useState, useEffect, useRef, Suspense } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import dynamic from 'next/dynamic';

const Step1Details = dynamic(() => import('./step-1-details').then(mod => mod.Step1Details), { ssr: false });
const Step2Profile = dynamic(() => import('./step-2-profile').then(mod => mod.Step2Profile), { ssr: false });
const Step3Questions = dynamic(() => import('./step-3-questions').then(mod => mod.Step3Questions), { ssr: false });
const Step4Review = dynamic(() => import('./step-4-review').then(mod => mod.Step4Review), { ssr: false });
import {
  generateProposalAction,
  analyzeAndSuggestAction,
  autofillSkillsAction,
  answerQuestionsAction,
  improveProposalAction,
  resendVerificationEmailAction,
} from '@/app/lib/actions';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Sparkles, Bot, Clipboard, Plus, Trash2, Wand2, FileText, User, Settings, Rocket, ArrowLeft, ArrowRight, MessageSquareQuote, CheckCircle, Phone, Globe, Users, Calendar, BarChart, ShoppingCart, Code, Search, Lightbulb, Mail, BarChart2, ExternalLink, LayoutDashboard, FolderKanban, Save, AlertCircle, RefreshCcw, X, Link as LinkIcon, Star } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter, DialogTrigger } from "@/components/ui/dialog";

import { HugeiconsIcon } from '@hugeicons/react';
import { File01Icon } from "@hugeicons/core-free-icons";

import type { ClientQuestion, SkillProfile, PortfolioLink } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { ProTips } from '@/components/pro-tips';
import { Badge } from '@/components/ui/badge';
import { useSession } from 'next-auth/react';
import { getSkillProfilesAction } from '@/lib/profile-actions';
import { saveProposalAction } from '@/lib/proposal-actions';
import { Slider } from '@/components/ui/slider';
import { ProposalUpLogos, LinkedInIcon } from '@/components/icons';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { WelcomeDialog } from '@/components/welcome-dialog';
import { useSearchParams, useRouter } from 'next/navigation';
import { CreditsButton, BuyMoreCreditsButton } from '@/components/credits-button';
import { DiffViewer } from '@/components/diff-viewer';



type Suggestion = {
  template: 'standard' | 'video';
  templateReasoning: string;
  strategyId: string;
  strategyReasoning: string;
  wordLimit: number[];
  wordLimitReasoning: string;
}

const openingStrategies = [
  { id: 'video', title: 'Video Introduction', description: 'A brief, engaging introduction leading with a personal video.' },
  { id: 'none', title: 'None', description: 'The AI will customize it for you.' },
  { id: 'helpWithTask', title: 'Help with Specific Task', description: "I see that you need help with [SPECIFIC TASK]. I'd love to take some of the workload off your plate." },
  { id: 'extensiveExperience', title: 'Extensive Experience', description: "While viewing your job details, it really jumped out at me. I have extensive experience in [SPECIFIC SKILL], and I can start immediately." },
  { id: 'upworkDiscount', title: 'New to Upwork Discount', description: "I'm new to Upwork and looking to land a few clients. If you're interested, I'll offer a 10% discount on this project." },
  { id: 'similarProject', title: 'Similar Project Experience', description: "Your job description caught my attention because I recently completed a similar project. Here's the link: [INSERT LINK]." },
  { id: 'congratulations', title: 'Congratulations Approach', description: "Congratulations on [SPECIFIC MILESTONE OR ACHIEVEMENT]. I'd love to help you take it even further." },
  { id: 'freeSample', title: 'Free Sample Offer', description: "I'd be happy to provide a free sample of my work to show you what I can do. Let's start there." },
  { id: 'strategicQuestions', title: 'Strategic Questions', description: "Your job description sparked a couple of questions in my mind: 1. [QUESTION 1] 2. [QUESTION 2]" },
];

const greetings = [
  { value: 'hi', label: 'Hi' },
  { value: 'hello', label: 'Hello' },
  { value: 'hey', label: 'Hey' },
  { value: 'good-morning', label: 'Good morning' },
  { value: 'good-afternoon', label: 'Good afternoon' },
  { value: 'good-evening', label: 'Good evening' },
  { value: 'greetings', label: 'Greetings' },
  { value: 'dear', label: 'Dear' },
  { value: 'hi-there', label: 'Hi there' },
  { value: 'hello-there', label: 'Hello there' },
  { value: 'hey-there', label: 'Hey there' },
];

const closingCtas = [
  { value: 'looking-forward', label: 'Looking forward to hearing from you' },
  { value: 'excited-to-work', label: 'Excited to work with you' },
  { value: 'ready-to-start', label: 'Ready to start immediately' },
  { value: 'discuss-further', label: "Let's discuss your project further" },
  { value: 'schedule-call', label: "Let's schedule a quick call to discuss" },
  { value: 'thank-you', label: 'Thank you for your consideration' },
  { value: 'any-questions', label: 'Let me know if you have any questions' },
  { value: 'hope-to-hear', label: 'Hope to hear from you soon' },
  { value: 'make-it-happen', label: "Let's make this happen" },
  { value: 'im-ready-to-start', label: "I'm ready to get started" },
  { value: 'create-amazing', label: "Let's create something amazing together" },
  { value: 'talk-soon', label: 'Talk soon' },
];

const signOffCtas = [
  { value: 'best-regards', label: 'Best regards,' },
  { value: 'sincerely', label: 'Sincerely,' },
  { value: 'kind-regards', label: 'Kind regards,' },
  { value: 'warm-regards', label: 'Warm regards,' },
];

const tones = ["Professional", "Friendly", "Assertive", "Persuasive", "Creative", "Concise", "Formal"];
const improvementPresets = ["Concise", "Detailed", "Informal", "Professional", "Fix Formatting"];

export function ProposalWizard() {
  const { data: session, status, update } = useSession();
  const loading = status === 'loading';
  const user = session?.user;
  const userProfile = user?.profile;
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const {
    currentStep, setCurrentStep,
    projectDetails, setProjectDetails,
    proposalTemplate, setProposalTemplate,
    openingStrategy, setOpeningStrategy,
    strategySuggestionReasoning, setStrategySuggestionReasoning,
    clientName, setClientName,
    skillsAndExpertise, setSkillsAndExpertise,
    relevantExperience, setRelevantExperience,
    selectedProfile, setSelectedProfile,
    profileLinks, setProfileLinks,
    manualLinks, setManualLinks,
    greeting, setGreeting,
    includeGreeting, setIncludeGreeting,
    closingCta, setClosingCta,
    includeClosingCta, setIncludeClosingCta,
    closingCta2, setClosingCta2,
    includeSignOff, setIncludeSignOff,
    tone, setTone,
    wordLimit, setWordLimit,
    clientQuestions, setClientQuestions,
    generatedProposal, setGeneratedProposal,
    improvements, setImprovements,
    suggestion, setSuggestion
  } = useProposalStore();

  const totalSteps = 4;
  const [skillProfiles, setSkillProfiles] = useState<SkillProfile[]>([]);
  const [manualLinkInput, setManualLinkInput] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const [isOriginalProposalSaved, setIsOriginalProposalSaved] = useState(false);

  const summaryTextareaRef = useRef<HTMLTextAreaElement>(null);
  const improvementCardRef = useRef<HTMLDivElement>(null);

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [showResumeDialog, setShowResumeDialog] = useState(false);
  const [planInterval, setPlanInterval] = useState<'monthly' | 'yearly' | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

  useEffect(() => {
    // Check for draft in local storage implicitly via Zustand store
    if (projectDetails.summary && currentStep > 1 && !generatedProposal) {
      setShowResumeDialog(true);
    }
  }, []);

  const handleResendVerification = async () => {
    setIsResending(true);
    try {
      const result = await resendVerificationEmailAction();
      if (result.success) {
        setResendSuccess(true);
        toast({ title: 'Email Sent', description: 'Verification link has been resent to your email.' });
      } else {
        toast({ title: 'Error', description: result.error || 'Failed to resend email.', variant: 'destructive' });
      }
    } catch (error) {
      toast({ title: 'Error', description: 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsResending(false);
    }
  };

  const isEmailVerified = session?.user?.emailVerified;



  const [customImprovementInstruction, setCustomImprovementInstruction] = useState('');
  const [isImproving, setIsImproving] = useState(false);


  const [savedImprovements, setSavedImprovements] = useState<boolean[]>([]);
  const [isSavingImprovement, setIsSavingImprovement] = useState<boolean[]>([]);

  const [selectedText, setSelectedText] = useState('');
  const [currentImprovementIndex, setCurrentImprovementIndex] = useState(0);
  const [showDiff, setShowDiff] = useState(true);

  const proposalCredits = userProfile?.proposalCredits ?? 0;

  const isTrial = userProfile?.subscriptionStatus === 'trialing';
  const proposalCount = userProfile?.proposalCount ?? 0;
  const trialLimitReached = isTrial && proposalCount >= 5;

  useEffect(() => {
    if (!session?.user?.id) return;
    const isNew = searchParams.get('new') === 'true';
    const isSubscribed = searchParams.get('subscribed') === 'true';
    const storageKey = `hasSeenWelcomeDialog_${session.user.id}`;
    const hasSeenWelcome = localStorage.getItem(storageKey) === 'true';

    // Show dialog if url says it's new, OR if they've never generated a proposal, are on trial, and haven't seen it yet.
    if (isNew || isSubscribed || (isTrial && proposalCount === 0 && !hasSeenWelcome)) {
      if (isSubscribed) {
        const interval = searchParams.get('interval');
        if (interval === 'monthly' || interval === 'yearly') {
          setPlanInterval(interval);
        }
      }

      // Mark as seen immediately so second login never re-triggers it
      localStorage.setItem(storageKey, 'true');
      setShowWelcomeDialog(true);
    }
  }, [searchParams, isTrial, proposalCount, session]);

  const handleWelcomeDialogClose = (open: boolean) => {
    setShowWelcomeDialog(open);
    if (!open) {
      if (session?.user?.id) {
        localStorage.setItem(`hasSeenWelcomeDialog_${session.user.id}`, 'true');
      }
      window.history.replaceState(null, '', '/dashboard');
    }
  };


  useEffect(() => {
    const latestProposal = improvements.length > 0 ? improvements[improvements.length - 1] : generatedProposal;
    setWordCount(latestProposal.trim().split(/\s+/).filter(Boolean).length);
  }, [generatedProposal, improvements]);



  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false);
  const [isAnsweringQuestions, setIsAnsweringQuestions] = useState(false);
  const [answersGenerated, setAnswersGenerated] = useState(false);

  useEffect(() => {
    if (session) {
      const fetchProfiles = async () => {
        const result = await getSkillProfilesAction();
        if (result.profiles) {
          setSkillProfiles(result.profiles);
        }
      };
      fetchProfiles();
    }
  }, [session]);

  // Apply referral code for OAuth (Google) users who signed up via an invite link
  useEffect(() => {
    if (!session?.user?.id) return;
    const storedReferralCode = localStorage.getItem('referralCode');
    if (!storedReferralCode) return;

    fetch('/api/auth/apply-referral', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ referralCode: storedReferralCode }),
    }).then(() => {
      localStorage.removeItem('referralCode');
    }).catch(console.error);
  }, [session?.user?.id]);

  useEffect(() => {
    if (selectedProfile !== 'none') {
      const profile = skillProfiles.find(p => p.id === selectedProfile);
      if (profile) {
        setSkillsAndExpertise(profile.keywords.join(', '));
        setTone(profile.tone);
        setProfileLinks(profile.links);
        const lengthMap: { [key: string]: number[] } = {
          "Very Short": [50, 80],
          "Short": [50, 120],
          "Detailed": [50, 200],
          "Very Detailed": [50, 300],
        };
        setWordLimit(lengthMap[profile.length] || [50, 150]);
      }
    } else {
      setSkillsAndExpertise('');
      setProfileLinks([]);
      setTone(tones[0]);
      setWordLimit([50, 120]);
    }
  }, [selectedProfile, skillProfiles]);

  useEffect(() => {
    if (summaryTextareaRef.current) {
      summaryTextareaRef.current.style.height = 'auto';
      summaryTextareaRef.current.style.height = `${summaryTextareaRef.current.scrollHeight}px`;
    }
  }, [projectDetails.summary]);

  useEffect(() => {
    if (proposalTemplate === 'video') {
      setOpeningStrategy('video');
    } else {
      if (openingStrategy === 'video') {
        setOpeningStrategy('none');
      }
    }
  }, [proposalTemplate, openingStrategy]);


  // DashboardClient already handles auth/loading guards above this component.
  // We do NOT early-return here to avoid "Rendered fewer hooks" violations.

  const handleResetForm = () => {
    setCurrentStep(1);
    setProjectDetails({ projectTitle: '', summary: '' });
    setProposalTemplate('standard');
    setOpeningStrategy('none');
    setStrategySuggestionReasoning('');
    setClientName('');
    setSkillsAndExpertise('');
    setSelectedProfile('none');
    setProfileLinks([]);
    setManualLinks([]);
    setManualLinkInput('');
    setRelevantExperience('');
    setGreeting('hi');
    setClosingCta('looking-forward');
    setClosingCta2('best-regards');
    setTone('Professional');
    setWordLimit([50, 120]);
    setClientQuestions([{ id: 1, question: '', answer: '' }]);
    setGeneratedProposal('');
    setSuggestion(null);
    setAnswersGenerated(false);
    setIsOriginalProposalSaved(false);

    setImprovements([]);
    setSavedImprovements([]);
    setIsSavingImprovement([]);
    setSelectedText('');
    setCurrentImprovementIndex(0);

    toast({ variant: "success", title: 'Form Cleared', description: 'You can now start a new proposal.' });
  };

  const nextStep = () => {
    if (currentStep < totalSteps) {
      if (currentStep === 1 && (!projectDetails.projectTitle || !projectDetails.summary)) {
        toast({ title: 'Missing Information', description: 'Please provide both Project Title and Summary.', variant: 'destructive' });
        return;
      }
      if (currentStep === 1 && !suggestion) {
        toast({ title: 'Analysis Required', description: 'Please analyze the project summary before proceeding.', variant: 'destructive' });
        return;
      }
      setCurrentStep(currentStep + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      window.scrollTo(0, 0);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
  };

  const removeSkillTag = (tagToRemove: string) => {
    const currentSkills = skillsAndExpertise.split(',').map(s => s.trim()).filter(Boolean);
    const newSkills = currentSkills.filter(skill => skill !== tagToRemove);
    setSkillsAndExpertise(newSkills.join(', '));
  };

  const removeProfileLink = (index: number) => {
    setProfileLinks(profileLinks.filter((_, i) => i !== index));
  };


  const handleManualLinkKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && manualLinkInput.trim()) {
      e.preventDefault();
      const url = manualLinkInput.trim();
      if (!manualLinks.some(link => link.url === url)) {
        try {
          new URL(url);
          setManualLinks([...manualLinks, { url: url }]);
        } catch (_) {
          toast({
            title: "Invalid URL",
            description: "Please enter a valid URL.",
            variant: "destructive"
          });
        }
      }
      setManualLinkInput('');
    }
  };

  const removeManualLink = (index: number) => {
    setManualLinks(manualLinks.filter((_, i) => i !== index));
  };

  const addClientQuestion = () => {
    setClientQuestions([...clientQuestions, { id: Date.now(), question: '', answer: '' }]);
  };

  const removeClientQuestion = (id: number) => {
    setClientQuestions(clientQuestions.filter((q) => q.id !== id));
  };

  const handleClientQuestionChange = (id: number, field: 'question' | 'answer', value: string) => {
    setClientQuestions(clientQuestions.map((q) => q.id === id ? { ...q, [field]: value } : q));
  };

  const handleAnalyzeJob = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (trialLimitReached) {
      toast({
        title: 'Trial Limit Reached',
        description: 'Please upgrade your plan to use AI features.',
        variant: 'destructive',
      });
      return;
    }
    if (!projectDetails.projectTitle || !projectDetails.summary) {
      toast({ title: 'Missing Information', description: 'Please provide Project Title and Summary to analyze.', variant: 'destructive' });
      return;
    }
    setIsAnalyzing(true);
    setSuggestion(null);

    try {
      const strategiesMap = openingStrategies.reduce((acc, str) => {
        if (str.id !== 'video') {
          acc[str.id] = str.description;
        }
        return acc;
      }, {} as Record<string, string>);

      const result = await analyzeAndSuggestAction({
        projectDetails,
        strategies: strategiesMap,
      });

      if (result?.error) {
        toast({ title: 'Analysis Error', description: result.error, variant: 'destructive' });
      } else if (result?.data) {
        setSuggestion(result.data);
        setProposalTemplate(result.data.template);
        setOpeningStrategy(result.data.strategyId);
        setStrategySuggestionReasoning(result.data.strategyReasoning);
        setWordLimit(result.data.wordLimit);

        toast({
          variant: "success",
          title: 'Analysis Complete!',
          description: `Suggestions are ready!`
        });
      }
    } catch (e: any) {
      toast({ title: 'Analysis Failed', description: e.message || 'An unexpected error occurred.', variant: 'destructive' });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAutofillSkills = async () => {
    if (!projectDetails.projectTitle || !projectDetails.summary) {
      toast({ title: 'Missing Information', description: 'Please fill out the project details on Step 1 first.', variant: 'destructive' });
      setCurrentStep(1);
      return;
    }

    const profile = skillProfiles.find(p => p.id === selectedProfile);
    const profileInfo = profile ? profile.description : '';


    setIsSuggestingSkills(true);
    const result = await autofillSkillsAction({
      projectTitle: projectDetails.projectTitle,
      summary: projectDetails.summary,
      profileInformation: profileInfo,
    });

    if (result?.error) {
      toast({ title: 'Error filling skills', description: result.error, variant: 'destructive' });
    } else if (result?.data) {
      const existingSkills = skillsAndExpertise.split(',').map(s => s.trim()).filter(Boolean);
      const newSkills = result.data.skillsAndExpertise;
      const combined = new Set([...existingSkills, ...newSkills]);
      setSkillsAndExpertise(Array.from(combined).join(', '));

      toast({ variant: "success", title: 'Skills Auto-filled!', description: 'Relevant skills have been added based on the project and your profile.' });
    }
    setIsSuggestingSkills(false);
  };

  const handleAnswerAllQuestions = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    const questionsToAnswer = clientQuestions.filter(q => q.question);
    if (questionsToAnswer.length === 0) {
      toast({ title: 'No Questions', description: 'Please enter at least one question.', variant: 'destructive' });
      return;
    }
    if (!projectDetails.summary) {
      toast({ title: 'Missing Project Summary', description: 'Please provide the project summary on Step 1 first.', variant: 'destructive' });
      setCurrentStep(1);
      return;
    }
    const profile = skillProfiles.find(p => p.id === selectedProfile);
    const profileInfo = profile ? `${profile.title}: ${profile.description}` : '';

    setIsAnsweringQuestions(true);
    const result = await answerQuestionsAction({
      jobDescription: projectDetails.summary,
      clientQuestions: questionsToAnswer.map(q => q.question),
      profileInformation: `My name is ${user?.name}. My selected skill profile is ${profileInfo}`,
    });

    if (result?.error) {
      toast({ title: 'Error Getting Answers', description: result.error, variant: 'destructive' });
    } else if (result?.data?.answers) {
      const newClientQuestions = [...clientQuestions];
      let answerIndex = 0;
      for (let i = 0; i < newClientQuestions.length; i++) {
        if (newClientQuestions[i].question) {
          if (result.data.answers[answerIndex]) {
            newClientQuestions[i].answer = result.data.answers[answerIndex];
            answerIndex++;
          }
        }
      }
      setClientQuestions(newClientQuestions);
      setAnswersGenerated(true);
      toast({ variant: "success", title: 'Answers Ready!', description: 'Your answers will be available after the proposal is generated.' });
    }
    setIsAnsweringQuestions(false);
  }

  const handleGenerateProposal = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    if (trialLimitReached) {
      toast({
        title: 'Trial Limit Reached',
        description: 'Please upgrade your plan to generate more proposals.',
        variant: 'destructive',
      });
      return;
    }
    if (!projectDetails.summary || !projectDetails.projectTitle) {
      toast({ title: 'Missing Information', description: 'Please provide project title and summary first.', variant: 'destructive' });
      setCurrentStep(1);
      return;
    }
    setIsGenerating(true);
    setGeneratedProposal('');
    setImprovements([]);
    setSavedImprovements([]);
    setIsSavingImprovement([]);
    setIsOriginalProposalSaved(false);

    const selectedGreeting = greetings.find(g => g.value === greeting)?.label || greeting;
    const selectedClosing = closingCtas.find(c => c.value === closingCta)?.label || closingCta;
    const selectedClosing2 = closingCta2 === 'none' ? undefined : signOffCtas.find(c => c.value === closingCta2)?.label || closingCta2;
    const selectedOpeningStrategy = openingStrategies.find(s => s.id === openingStrategy)?.description;


    const profile = skillProfiles.find(p => p.id === selectedProfile);
    const profileSummary = profile ? `
      Skill Profile: ${profile.title}
      Experience: ${profile.experience} years
      Summary: ${profile.description}
    ` : ``;

    const result = await generateProposalAction({
      projectTitle: projectDetails.projectTitle,
      summary: projectDetails.summary,
      profileSummary: profileSummary,
      userName: user?.name || 'The User',
      relevantSkills: skillsAndExpertise,
      pastSuccesses: relevantExperience,
      profileLinks: profileLinks,
      manualLinks: manualLinks.filter(l => l.url.trim() !== ''),
      greeting: includeGreeting ? (clientName ? `${selectedGreeting} ${clientName}` : selectedGreeting) : undefined,
      openingStrategy:
        openingStrategy !== 'none' && openingStrategy !== 'video'
          ? selectedOpeningStrategy
          : undefined,
      closingCta: includeClosingCta ? selectedClosing : undefined,
      closingCta2: includeSignOff ? selectedClosing2 : undefined,
      tone,
      wordLimit: `${wordLimit[0]}-${wordLimit[1]}`,
      proposalTemplate,
    });

    if (result?.error) {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result?.data) {
      setGeneratedProposal(result.data.proposal);
      setImprovements([]);
      setSavedImprovements([]);
      setIsSavingImprovement([]);
      setCurrentImprovementIndex(0);
      await update();
    }
    setIsGenerating(false);
  };

  const handleImproveProposal = async (instruction: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    if (!instruction) {
      toast({ title: 'No Instruction', description: 'Please provide an instruction.', variant: 'destructive' });
      return;
    }
    if (proposalCredits <= 0) {
      toast({ title: 'Improvement Limit Reached', description: `You have no improvement credits left.`, variant: 'destructive' });
      return;
    }

    setIsImproving(true);

    const baseProposal = improvements.length > 0 ? improvements[improvements.length - 1] : generatedProposal;
    const selectedClosing = closingCtas.find(c => c.value === closingCta)?.label || closingCta;

    const result = await improveProposalAction({
      proposal: baseProposal,
      instruction: instruction,
      selectedText: selectedText,
      closingCta: selectedClosing,
    });

    if (result?.error) {
      toast({ title: 'Error Improving Proposal', description: result.error, variant: 'destructive' });
    } else if (result?.data) {
      let improvedText = result.data.improvedProposal;

      let newFullProposal;
      if (selectedText) {
        // Find the index of the selected text to ensure we replace the correct instance
        const index = baseProposal.indexOf(selectedText);
        if (index !== -1) {
          const before = baseProposal.substring(0, index);
          const after = baseProposal.substring(index + selectedText.length);

          // If improvedText is empty (deleted), clean up potential double newlines
          if (improvedText === '') {
            // Remove the selected text and collapse extra newlines created by deletion
            const joined = before + after;
            newFullProposal = joined.replace(/\n{3,}/g, '\n\n').trim();
          } else {
            newFullProposal = before + improvedText + after;
          }
        } else {
          newFullProposal = improvedText;
        }
      } else {
        newFullProposal = improvedText;
      }

      setImprovements([...improvements, newFullProposal]);
      setSavedImprovements([...savedImprovements, false]);
      setIsSavingImprovement([...isSavingImprovement, false]);
      setCurrentImprovementIndex(improvements.length); // Navigate to the new improvement
      await update(); // Refresh credit count

      toast({ variant: "success", title: 'Proposal Improved!', description: 'The improved version is ready below.' });
    }
    setIsImproving(false);
    setCustomImprovementInstruction('');
    setSelectedText('');
  };


  useEffect(() => {
    if (improvements.length > 0) {
      improvementCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [improvements.length]);


  const handleSaveProposal = async (proposalContent: string, isOriginal: boolean, index: number = -1) => {
    if (!projectDetails.projectTitle.trim() || !proposalContent) {
      toast({ title: 'Missing Information', description: 'Please provide a project title and ensure there is content to save.', variant: 'destructive' });
      return;
    }

    if (isOriginal) {
      setIsSaving(true);
    } else {
      const newSavingStatus = [...isSavingImprovement];
      newSavingStatus[index] = true;
      setIsSavingImprovement(newSavingStatus);
    }

    try {
      const result = await saveProposalAction({
        title: projectDetails.projectTitle.trim(),
        content: proposalContent,
      });
      if (result.error) throw new Error(result.error);
      toast({ variant: "success", title: 'Proposal Saved!', description: 'You can view it on the Saved Proposals page.' });
      if (isOriginal) {
        setIsOriginalProposalSaved(true);
      } else {
        const newSavedStatus = [...savedImprovements];
        newSavedStatus[index] = true;
        setSavedImprovements(newSavedStatus);
      }
    } catch (error: any) {
      toast({ title: 'Error Saving Proposal', description: error.message || 'Failed to save proposal.', variant: 'destructive' });
    } finally {
      if (isOriginal) {
        setIsSaving(false);
      } else {
        const newSavingStatus = [...isSavingImprovement];
        newSavingStatus[index] = false;
        setIsSavingImprovement(newSavingStatus);
      }
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ variant: "success", title: 'Copied!', description: 'Content copied to clipboard.' });
  };

  const stepTitles = ["Project Details", "Your Profile", "Client Questions", "Preferences & Strategy"];
  const hasAnsweredQuestions = clientQuestions.some(q => q.answer);
  const hasQuestions = clientQuestions.some(q => q.question);


  const latestProposal = improvements.length > 0 ? improvements[improvements.length - 1] : generatedProposal;
  const currentImprovement = improvements[currentImprovementIndex];
  const currentImprovementWordCount = currentImprovement?.trim().split(/\s+/).filter(Boolean).length || 0;

  return (
    <>
      <Dialog open={showResumeDialog} onOpenChange={setShowResumeDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resume Proposal Draft?</DialogTitle>
            <DialogDescription>
              We found an unsaved proposal draft in your browser. Would you like to resume where you left off or start a new proposal?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex sm:justify-start gap-2 sm:gap-0">
            <Button variant="outline" className="mr-auto" onClick={() => { handleResetForm(); setShowResumeDialog(false); }}>
              Start Fresh
            </Button>
            <Button onClick={() => setShowResumeDialog(false)}>
              Resume Draft
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <WelcomeDialog
        open={showWelcomeDialog}
        onOpenChange={handleWelcomeDialogClose}
        subscriptionStatus={userProfile?.subscriptionStatus}
        planInterval={planInterval}
      />
      {resendSuccess ? (
        <div className="bg-green-100 border border-green-400 text-green-700 dark:bg-green-950/30 dark:border-green-900 dark:text-green-200 px-4 py-3 rounded relative mb-6 w-full flex items-center justify-between">
          <span className="flex items-center gap-2"><CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" /> Verification link resent! Please check your inbox.</span>
        </div>
      ) : !isEmailVerified && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-950/30 dark:border-amber-900 dark:text-amber-200 px-4 py-3 rounded relative mb-6 w-full flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 shrink-0" />
            <span className="text-sm font-medium">Please verify your email address to enable proposal generation.</span>
          </div>
          <Button
            size="sm"
            variant="outline"
            className="border-amber-300 text-amber-800 hover:bg-amber-100 dark:border-amber-700 dark:text-amber-300 dark:hover:bg-amber-900/50 shrink-0"
            onClick={handleResendVerification}
            disabled={isResending}
          >
            {isResending ? <RefreshCcw className="h-4 w-4 animate-spin mr-2" /> : <Mail className="h-4 w-4 mr-2" />}
            Resend Verification Link
          </Button>
        </div>
      )}
      {trialLimitReached && (
        <Card className="mb-6 border-destructive bg-destructive/5 text-destructive-foreground">
          <CardHeader>
            <div className="flex items-center gap-3">
              <AlertCircle className="h-6 w-6 text-destructive" />
              <div>
                <CardTitle className="text-destructive">Trial Limit Reached</CardTitle>
                <CardDescription className="text-destructive/80">You've used all 5 of your free proposal generations.</CardDescription>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}
      <div id="tour-proposal-form" className="grid gap-8 items-start transition-all duration-500 grid-cols-1 lg:grid-cols-2 w-full">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={File01Icon} size={24} className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Create Your Proposal</h1>
                <p className="text-muted-foreground">Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}</p>
              </div>
            </div>
<ProTips className="hidden lg:flex items-center gap-2 px-4 py-2 bg-button-gradient rounded-full shadow-lg hover:opacity-90 transition-all text-xs font-semibold text-white" />
          </div>
          {isTrial && !trialLimitReached && (
            <div className="text-right hidden md:block">
              <p className="font-semibold text-sm">Trial Usage</p>
              <p className="text-xs text-muted-foreground">Proposals created: {proposalCount} / 5</p>
            </div>
          )}
          {isTrial && !trialLimitReached && (
            <div className="md:hidden text-left">
              <p className="font-semibold text-xs">Trial Usage</p>
              <p className="text-xs text-muted-foreground">Proposals created: {proposalCount} / 5</p>
            </div>
          )}

          <div className="flex items-center justify-between pt-6 pb-12 relative w-full px-2 sm:px-6">
            <div className="absolute left-6 right-6 top-10 w-[calc(100%-3rem)] h-1 bg-neutral-200 dark:bg-neutral-800 rounded-full z-0" />
            <div 
              className="absolute left-6 top-10 h-1 bg-primary rounded-full z-0 transition-all duration-500 ease-in-out"
              style={{ width: `calc(${((currentStep - 1) / (totalSteps - 1)) * 100}% - ${currentStep === 1 ? 0 : 3}rem)` }} 
            />
            
            {stepTitles.map((title, index) => {
              const stepNum = index + 1;
              const isActive = currentStep === stepNum;
              const isCompleted = currentStep > stepNum;
              
              return (
                <button 
                  key={title} 
                  type="button"
                  onClick={() => setCurrentStep(stepNum)}
                  className="relative z-10 flex flex-col items-center cursor-pointer group focus:outline-none"
                >
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm transition-all duration-300 shadow-sm group-hover:ring-4 group-hover:ring-primary/20",
                    isActive ? "bg-primary text-primary-foreground ring-4 ring-primary/20 scale-110" : 
                    isCompleted ? "bg-primary text-primary-foreground" : 
                    "bg-white dark:bg-neutral-900 border-2 border-neutral-200 dark:border-neutral-800 text-neutral-500"
                  )}>
                    {isCompleted || (isActive && stepNum === totalSteps) ? <CheckCircle className="w-5 h-5" /> : stepNum}
                  </div>
                  <span className={cn(
                    "hidden sm:block text-xs font-normal absolute -bottom-8 w-32 text-center transition-colors duration-300",
                    isActive ? "text-primary" : "text-neutral-500 dark:text-neutral-400 group-hover:text-primary/70"
                  )}>
                    {title}
                  </span>
                </button>
              );
            })}
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentStep}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
            >

          {currentStep === 1 && (
            <Step1Details
              projectDetails={projectDetails}
              setProjectDetails={setProjectDetails}
              isEmailVerified={isEmailVerified}
              summaryTextareaRef={summaryTextareaRef}
              handleAnalyzeJob={handleAnalyzeJob}
              isAnalyzing={isAnalyzing}
              trialLimitReached={trialLimitReached}
              suggestion={suggestion}
              proposalTemplate={proposalTemplate}
              setProposalTemplate={setProposalTemplate}
            />
          )}

          {currentStep === 2 && (
            <Step2Profile
              selectedProfile={selectedProfile}
              setSelectedProfile={setSelectedProfile}
              skillProfiles={skillProfiles}
              clientName={clientName}
              handleInputChange={handleInputChange}
              setClientName={setClientName}
              skillsAndExpertise={skillsAndExpertise}
              setSkillsAndExpertise={setSkillsAndExpertise}
              handleAutofillSkills={handleAutofillSkills}
              isSuggestingSkills={isSuggestingSkills}
              removeSkillTag={removeSkillTag}
              relevantExperience={relevantExperience}
              setRelevantExperience={setRelevantExperience}
              profileLinks={profileLinks}
              removeProfileLink={removeProfileLink}
              manualLinkInput={manualLinkInput}
              setManualLinkInput={setManualLinkInput}
              handleManualLinkKeyDown={handleManualLinkKeyDown}
              manualLinks={manualLinks}
              removeManualLink={removeManualLink}
            />
          )}

          {currentStep === 3 && (
            <Step3Questions
              clientQuestions={clientQuestions}
              handleClientQuestionChange={handleClientQuestionChange}
              answersGenerated={answersGenerated}
              removeClientQuestion={removeClientQuestion}
              addClientQuestion={addClientQuestion}
              handleAnswerAllQuestions={handleAnswerAllQuestions}
              isAnsweringQuestions={isAnsweringQuestions}
              hasQuestions={hasQuestions}
            />
          )}

          {currentStep === 4 && (
            <Step4Review
              includeGreeting={includeGreeting}
              setIncludeGreeting={setIncludeGreeting}
              greeting={greeting}
              setGreeting={setGreeting}
              greetings={greetings}
              includeClosingCta={includeClosingCta}
              setIncludeClosingCta={setIncludeClosingCta}
              closingCta={closingCta}
              setClosingCta={setClosingCta}
              closingCtas={closingCtas}
              includeSignOff={includeSignOff}
              setIncludeSignOff={setIncludeSignOff}
              closingCta2={closingCta2}
              setClosingCta2={setClosingCta2}
              signOffCtas={signOffCtas}
              tone={tone}
              setTone={setTone}
              tones={tones}
              wordLimit={wordLimit}
              setWordLimit={setWordLimit}
              suggestion={suggestion}
              openingStrategy={openingStrategy}
              setOpeningStrategy={setOpeningStrategy}
              openingStrategies={openingStrategies}
              proposalTemplate={proposalTemplate}
              strategySuggestionReasoning={strategySuggestionReasoning}
            />
          )}

            </motion.div>
          </AnimatePresence>

          <div className="flex justify-between items-center mt-8">
            <div>
              {currentStep > 1 && (
                <Button variant="outline" onClick={prevStep}>
                  <ArrowLeft className="mr-2 h-4 w-4" /> Previous
                </Button>
              )}
            </div>
            <div>
              {currentStep < totalSteps ? (
                <Button onClick={nextStep}>
                  Next <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              ) : trialLimitReached ? (
                <Button size="lg" asChild>
                  <Link href="/pricing">Upgrade to Pro to Continue</Link>
                </Button>
              ) : (
                <Button type="button" size="lg" onClick={handleGenerateProposal} disabled={isGenerating || improvements.length > 0}>
                  {isGenerating ? "Generating..." : <><Wand2 className="mr-2" />Generate Proposal</>}
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-6 lg:sticky lg:top-24">


            <Card className="shadow-lg border-primary/20">
            <CardHeader className="flex flex-row items-center justify-between md:pb-0">
              <div className="flex items-center gap-2">
                <CardTitle>Generated Proposal</CardTitle>
                {wordCount > 0 && improvements.length === 0 && (
                  <Badge variant="secondary">{wordCount} words</Badge>
                )}
              </div>
              <div className="flex items-center gap-1">
                <Button variant="outline" size="sm" onClick={() => handleSaveProposal(generatedProposal, true)} disabled={!generatedProposal || isSaving || isOriginalProposalSaved}>
                  {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {isOriginalProposalSaved ? 'Saved' : 'Save'}
                </Button>
                <Button variant="outline" size="sm" onClick={() => copyToClipboard(generatedProposal)} disabled={!generatedProposal}>
                  <Clipboard className="mr-2 h-4 w-4" /> Copy
                </Button>
              </div>
            </CardHeader>
            <CardContent className="min-h-[200px]">
              {generatedProposal && (
                <div className="flex items-center gap-2 text-xs bg-background rounded-md px-3 py-2 mb-3">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>AI may make mistakes. Double-check all generated proposals.</span>
                </div>
              )}
              <div onMouseUp={() => setSelectedText(window.getSelection()?.toString() ?? '')}>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground font-medium">Crafting your custom proposal...</p>
                    <p className="text-xs text-muted-foreground mt-1">This usually takes 10-15 seconds</p>
                  </div>
                ) : generatedProposal ? (
                  <Textarea
                    value={generatedProposal}
                    onChange={(e) => setGeneratedProposal(e.target.value)}
                    className="min-h-[400px] font-medium text-sm leading-relaxed shadow-inner resize-y focus-visible:ring-primary/50"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center min-h-[400px] text-center text-muted-foreground p-8 bg-muted/20 rounded-md border border-dashed border-muted">
                    <HugeiconsIcon icon={File01Icon} size={48} className="h-16 w-16 mb-4 text-muted-foreground/50" />
                    <p className="font-medium text-lg">Your proposal will appear here</p>
                    <p className="text-sm max-w-[250px] mt-2">Fill out the details on the left and click "Generate Proposal" to get started.</p>
                  </div>
                )}
              </div>
            </CardContent>
            {generatedProposal && improvements.length === 0 && (
              <CardFooter className="flex-col items-start gap-4 border-t pt-4">
                {proposalCredits > 0 ? (
                  <p className="text-sm text-muted-foreground">You have {proposalCredits} improvements remaining. Highlight text to refine a specific part.</p>
                ) : (
                  <div className="text-sm text-muted-foreground flex flex-col items-start gap-2">
                    You have 0 improvement credits.
                    <BuyMoreCreditsButton />
                  </div>
                )}
                <div className="w-full space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {improvementPresets.map(preset => (
                      <Button
                        key={preset}
                        variant="outline"
                        size="sm"
                        onClick={() => handleImproveProposal(preset)}
                        disabled={isImproving || proposalCredits <= 0}
                      >
                        {preset}
                      </Button>
                    ))}
                  </div>
                  <div className="flex w-full items-center gap-2">
                    <Input
                      placeholder="Or type a custom improvement request..."
                      value={customImprovementInstruction}
                      onChange={(e) => setCustomImprovementInstruction(e.target.value)}
                      disabled={isImproving || proposalCredits <= 0}
                    />
                    <Button
                      onClick={() => handleImproveProposal(customImprovementInstruction)}
                      disabled={isImproving || !customImprovementInstruction.trim() || proposalCredits <= 0}
                    >
                      {isImproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                      Update
                    </Button>
                  </div>
                  {selectedText && (
                    <p className="text-xs text-muted-foreground bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded-md border border-yellow-300 dark:border-yellow-700">
                      Note: Improvement will be applied to your highlighted text. Clear selection to apply to the whole proposal.
                    </p>
                  )}
                </div>
              </CardFooter>
            )}
          </Card>

          {improvements.length > 0 && (
            <Card ref={improvementCardRef}>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-3">
                  <CardTitle>Improved Version</CardTitle>
                  <Badge variant="secondary">{currentImprovementIndex + 1} of {improvements.length}</Badge>
                </div>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => setCurrentImprovementIndex(p => p - 1)} disabled={currentImprovementIndex === 0}>
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => setCurrentImprovementIndex(p => p + 1)} disabled={currentImprovementIndex === improvements.length - 1}>
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleSaveProposal(currentImprovement, false, currentImprovementIndex)} disabled={!currentImprovement || isSavingImprovement[currentImprovementIndex] || savedImprovements[currentImprovementIndex]}>
                    {isSavingImprovement[currentImprovementIndex] ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    {savedImprovements[currentImprovementIndex] ? 'Saved' : 'Save'}
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => copyToClipboard(currentImprovement)}>
                    <Clipboard className="mr-2 h-4 w-4" /> Copy
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="min-h-[200px]" onMouseUp={() => setSelectedText(window.getSelection()?.toString() ?? '')}>
                <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mb-4">
                  <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                  <span>AI may make mistakes. Double-check all generated proposals.</span>
                </div>
                <div className="flex items-center justify-end mb-4">
                  <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/50 px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-700">
                    <span className="text-xs font-medium text-slate-600 dark:text-slate-400">Highlight Changes</span>
                    <Switch
                      id="toggle-diff"
                      checked={showDiff}
                      onCheckedChange={setShowDiff}
                      className="scale-75"
                    />
                  </div>
                </div>
                <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                  {showDiff ? (
                    <DiffViewer
                      oldText={currentImprovementIndex === 0 ? generatedProposal : improvements[currentImprovementIndex - 1]}
                      newText={currentImprovement}
                    />
                  ) : (
                    currentImprovement
                  )}
                </div>
              </CardContent>
              {proposalCredits > 0 ? (
                <CardFooter className="flex-col items-start gap-4 border-t pt-4">
                  <p className="text-sm text-muted-foreground">You have {proposalCredits} improvements remaining. Highlight text to refine a specific part.</p>
                  <div className="w-full space-y-2">
                    <div className="flex flex-wrap gap-2">
                      {improvementPresets.map(preset => (
                        <Button
                          key={preset}
                          variant="outline"
                          size="sm"
                          onClick={() => handleImproveProposal(preset)}
                          disabled={isImproving || proposalCredits <= 0}
                        >
                          {preset}
                        </Button>
                      ))}
                    </div>
                    <div className="flex w-full items-center gap-2">
                      <Input
                        placeholder="Or type a custom improvement request..."
                        value={customImprovementInstruction}
                        onChange={(e) => setCustomImprovementInstruction(e.target.value)}
                        disabled={isImproving || proposalCredits <= 0}
                      />
                      <Button
                        onClick={() => handleImproveProposal(customImprovementInstruction)}
                        disabled={isImproving || !customImprovementInstruction.trim() || proposalCredits <= 0}
                      >
                        {isImproving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Wand2 className="mr-2 h-4 w-4" />}
                        Update
                      </Button>
                    </div>
                    {selectedText && (
                      <p className="text-xs text-muted-foreground bg-yellow-100 dark:bg-yellow-900/50 p-2 rounded-md border border-yellow-300 dark:border-yellow-700">
                        Note: Improvement will be applied to your highlighted text. Clear selection to apply to the whole proposal.
                      </p>
                    )}
                  </div>
                </CardFooter>
              ) : (
                <CardFooter className="border-t pt-4 text-center text-sm text-muted-foreground flex flex-col items-center gap-2">
                  You have 0 improvement credits.
                  <BuyMoreCreditsButton />
                </CardFooter>
              )}
            </Card>
          )}



          {generatedProposal && hasAnsweredQuestions && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquareQuote className="h-5 w-5 text-primary" />
                  Answers to Client Questions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {clientQuestions.filter(q => q.answer).map(q => (
                  <div key={q.id} className="prose prose-sm max-w-none">
                    <p className="font-semibold text-gray-800">{q.question}</p>
                    <div className="text-gray-600 whitespace-pre-wrap">{q.answer}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {generatedProposal && (
        <div className="mt-8 pt-8 border-t w-full">
          <Button variant="outline" size="lg" className="w-full py-8 text-lg font-semibold" onClick={handleResetForm}>
            <RefreshCcw className="mr-2 h-6 w-6" />
            Create a New Proposal
          </Button>
        </div>
      )}
    </>
  );
}











