

"use client";

import { useState, useEffect, useRef, Suspense } from 'react';
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
import { FeaturedSectionClient } from '@/components/featured-section-client';


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

function DashboardContent() {
  const { data: session, status, update } = useSession();
  const loading = status === 'loading';
  const user = session?.user;
  const userProfile = user?.profile;
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const router = useRouter();

  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [projectDetails, setProjectDetails] = useState({ projectTitle: '', summary: '' });

  const [proposalTemplate, setProposalTemplate] = useState<'standard' | 'video'>('standard');
  const [openingStrategy, setOpeningStrategy] = useState('none');
  const [strategySuggestionReasoning, setStrategySuggestionReasoning] = useState('');


  const [clientName, setClientName] = useState('');
  const [skillsAndExpertise, setSkillsAndExpertise] = useState('');
  const [relevantExperience, setRelevantExperience] = useState('');

  const [skillProfiles, setSkillProfiles] = useState<SkillProfile[]>([]);
  const [selectedProfile, setSelectedProfile] = useState<string>('none');
  const [profileLinks, setProfileLinks] = useState<PortfolioLink[]>([]);
  const [manualLinks, setManualLinks] = useState<PortfolioLink[]>([]);
  const [manualLinkInput, setManualLinkInput] = useState('');


  const [greeting, setGreeting] = useState('hi');
  const [includeGreeting, setIncludeGreeting] = useState(false);
  const [closingCta, setClosingCta] = useState('looking-forward');
  const [includeClosingCta, setIncludeClosingCta] = useState(false);
  const [closingCta2, setClosingCta2] = useState('best-regards');
  const [includeSignOff, setIncludeSignOff] = useState(true);
  const [tone, setTone] = useState(tones[0]);
  const [wordLimit, setWordLimit] = useState([50, 120]);

  const [clientQuestions, setClientQuestions] = useState<ClientQuestion[]>([{ id: 1, question: '', answer: '' }]);

  const [generatedProposal, setGeneratedProposal] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const [isSaving, setIsSaving] = useState(false);
  const [isOriginalProposalSaved, setIsOriginalProposalSaved] = useState(false);

  const summaryTextareaRef = useRef<HTMLTextAreaElement>(null);
  const improvementCardRef = useRef<HTMLDivElement>(null);

  const [showWelcomeDialog, setShowWelcomeDialog] = useState(false);
  const [planInterval, setPlanInterval] = useState<'monthly' | 'yearly' | null>(null);
  const [isResending, setIsResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);

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

  const [improvements, setImprovements] = useState<string[]>([]);
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

  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

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
      setCurrentStep(prev => prev + 1);
      window.scrollTo(0, 0);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
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
    setClientQuestions(prev => [...prev, { id: Date.now(), question: '', answer: '' }]);
  };

  const removeClientQuestion = (id: number) => {
    setClientQuestions(prev => prev.filter(q => q.id !== id));
  };

  const handleClientQuestionChange = (id: number, field: 'question' | 'answer', value: string) => {
    setClientQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
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

      setImprovements(prev => [...prev, newFullProposal]);
      setSavedImprovements(prev => [...prev, false]);
      setIsSavingImprovement(prev => [...prev, false]);
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
      <div id="tour-proposal-form" className="grid grid-cols-1 xl:grid-cols-2 gap-8 items-start">
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <HugeiconsIcon icon={File01Icon} size={24} className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Create Your Proposal</h1>
                <p className="text-muted-foreground">Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}</p>
              </div>
            </div>
            {isTrial && !trialLimitReached && (
              <div className="text-right hidden md:block">
                <p className="font-semibold text-sm">Trial Usage</p>
                <p className="text-xs text-muted-foreground">Proposals created: {proposalCount} / 5</p>
              </div>
            )}
          </div>
          {isTrial && !trialLimitReached && (
            <div className="md:hidden text-left">
              <p className="font-semibold text-xs">Trial Usage</p>
              <p className="text-xs text-muted-foreground">Proposals created: {proposalCount} / 5</p>
            </div>
          )}

          <Progress value={(currentStep / totalSteps) * 100} className="w-full" />

          {currentStep === 1 && (
            <Card>
              <CardContent className="p-6 space-y-4">
                <div>
                  <Label htmlFor="projectTitle">Project Title</Label>
                  <Input id="projectTitle" value={projectDetails.projectTitle} onChange={(e) => setProjectDetails({ ...projectDetails, projectTitle: e.target.value })} placeholder="e.g., Senior Frontend Developer" disabled={!isEmailVerified} />
                </div>
                <div>
                  <Label htmlFor="summary">Summary</Label>
                  <Textarea
                    ref={summaryTextareaRef}
                    id="summary"
                    value={projectDetails.summary}
                    onChange={(e) => setProjectDetails({ ...projectDetails, summary: e.target.value })}
                    placeholder="Paste the project summary from Upwork or another platform here..."
                    className="resize-none overflow-hidden"
                    rows={1}
                    disabled={!isEmailVerified}
                  />
                </div>
                <div>
                  <Button onClick={handleAnalyzeJob} disabled={isAnalyzing || trialLimitReached || !isEmailVerified}>
                    {isAnalyzing ? "Analyzing..." : <><Sparkles className="mr-2" />Analyze & Get Suggestions</>}
                  </Button>
                  <p className="text-xs text-muted-foreground mt-2">
                    Let our AI analyze the job and provide tailored suggestions for template, strategy, and word count.
                  </p>
                </div>

                {isAnalyzing && (
                  <div className="flex flex-col items-center justify-center py-6 border rounded-lg bg-muted/30">
                    <Loader2 className="h-8 w-8 animate-spin text-primary mb-2" />
                    <p className="text-sm text-muted-foreground font-medium">Analyzing project requirements...</p>
                  </div>
                )}

                {suggestion && (
                  <div className="pt-4">
                    <h3 className="font-semibold text-lg mb-2">Proposal Template</h3>
                    <RadioGroup value={proposalTemplate} onValueChange={(val) => setProposalTemplate(val as 'standard' | 'video')} className="space-y-2">
                      <Label htmlFor="template-standard" className={cn("flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all", proposalTemplate === 'standard' && "border-primary ring-2 ring-primary")}>
                        <RadioGroupItem value="standard" id="template-standard" className="mt-1" />
                        <div className="grid gap-1.5">
                          <span className="font-semibold">Standard Proposal</span>
                          <span className="text-sm text-muted-foreground">A classic, professional proposal structure. The AI will customize it for you.</span>
                        </div>
                      </Label>
                      <Label htmlFor="template-video" className={cn("flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all", proposalTemplate === 'video' && "border-primary ring-2 ring-primary")}>
                        <RadioGroupItem value="video" id="template-video" className="mt-1" />
                        <div className="grid gap-1.5">
                          <span className="font-semibold">Video Intro Proposal</span>
                          <span className="text-sm text-muted-foreground">A template that includes a Loom video to introduce yourself.</span>
                        </div>
                      </Label>
                    </RadioGroup>
                    <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-800 rounded-r-lg">
                      <p><span className="font-bold">AI Suggestion: </span>{suggestion.templateReasoning}</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {currentStep === 2 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Your Profile</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="skillProfile">Skill Profile</Label>
                    <Select value={selectedProfile} onValueChange={setSelectedProfile}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a profile" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None (Use manual inputs)</SelectItem>
                        {skillProfiles.map(profile => (
                          <SelectItem key={profile.id} value={profile.id}>
                            {profile.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-sm text-muted-foreground mt-2">
                      Manage your profiles on the <Link href="/dashboard/skill-profiles" className="underline">Skill Profiles page</Link>.
                    </p>
                  </div>
                  <div>
                    <Label htmlFor="clientName">Client's Name (Optional)</Label>
                    <Input id="clientName" value={clientName} onChange={handleInputChange(setClientName)} placeholder="Client's name (if known)" />
                  </div>
                </div>
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <Label htmlFor="skillsAndExpertise">Skills & Expertise Tags</Label>
                    <Button variant="outline" size="sm" onClick={handleAutofillSkills} disabled={isSuggestingSkills}>
                      {isSuggestingSkills ? 'Thinking...' : <><Sparkles className="mr-2 h-4 w-4" /> AI Suggest Skills</>}
                    </Button>
                  </div>
                  <Input id="skillsAndExpertise" value={skillsAndExpertise} onChange={handleInputChange(setSkillsAndExpertise)} placeholder="Select a profile or enter skills manually" />
                  {skillsAndExpertise.trim() && (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {skillsAndExpertise.split(',').map(skill => skill.trim()).filter(Boolean).map((skill, index) => (
                        <Badge key={index} variant="secondary" className="font-normal gap-1">
                          {skill}
                          <button type="button" onClick={() => removeSkillTag(skill)} className="rounded-full hover:bg-black/10"><X className="h-3 w-3" /></button>
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
                <div>
                  <Label htmlFor="relevantExperience">Relevant Experience</Label>
                  <Textarea id="relevantExperience" value={relevantExperience} onChange={handleInputChange(setRelevantExperience)} placeholder="Briefly describe 1-2 past successes or experiences that are highly relevant to this specific job." />
                </div>
                <div className="space-y-4">
                  <Label>Portfolio / Relevant Links</Label>
                  {selectedProfile !== 'none' && profileLinks.length > 0 && (
                    <div>
                      <Label className="text-xs text-muted-foreground">From Skill Profile</Label>
                      <div className="space-y-1 mt-1">
                        {profileLinks.map((link, index) => (
                          <div key={`profile-link-${index}`} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted group">
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                              <LinkIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium group-hover:underline text-primary truncate flex-1">{link.url}</span>
                            </a>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeProfileLink(index)} className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  <div>
                    <Label htmlFor="manualLinks" className="text-xs text-muted-foreground">Manual Links</Label>
                    <Input
                      id="manualLinks"
                      value={manualLinkInput}
                      onChange={(e) => setManualLinkInput(e.target.value)}
                      onKeyDown={handleManualLinkKeyDown}
                      placeholder="Enter a URL and press Enter..."
                      type="url"
                    />
                    {manualLinks.length > 0 && (
                      <div className="mt-2 flex flex-col gap-1">
                        {manualLinks.map((link, index) => (
                          <div key={`manual-link-${index}`} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted group">
                            <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                              <LinkIcon className="h-4 w-4 text-muted-foreground" />
                              <span className="font-medium group-hover:underline text-primary truncate">{link.url}</span>
                            </a>
                            <Button type="button" variant="ghost" size="icon" onClick={() => removeManualLink(index)} className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 3 && (
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Client Questions</CardTitle>
                </div>
                <CardDescription>If the job posting asks specific questions, add them here and get AI-powered answers.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {clientQuestions.map((q, index) => (
                  <div key={q.id} className="space-y-2">
                    <div className="flex items-start gap-2">
                      <Textarea
                        placeholder={`Question ${index + 1}`}
                        value={q.question}
                        onChange={(e) => handleClientQuestionChange(q.id, 'question', e.target.value)}
                        className="flex-1"
                        disabled={answersGenerated}
                      />
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeClientQuestion(q.id)}
                        className="text-muted-foreground hover:text-destructive h-8 w-8 self-center"
                        disabled={answersGenerated}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={addClientQuestion} disabled={answersGenerated}><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
                  <Button variant="outline" size="sm" onClick={handleAnswerAllQuestions} disabled={isAnsweringQuestions || !hasQuestions || answersGenerated}>
                    {isAnsweringQuestions ? 'Answering...' : <><Sparkles className="mr-2 h-4 w-4" /> Get All Answers</>}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Settings className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Preferences</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="toggle-greeting">Greeting</Label>
                      <Switch
                        id="toggle-greeting"
                        checked={includeGreeting}
                        onCheckedChange={setIncludeGreeting}
                      />
                    </div>
                    <Select value={greeting} onValueChange={setGreeting} disabled={!includeGreeting}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {greetings.map(g => (
                          <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="toggle-closing-cta">Closing CTA</Label>
                      <Switch
                        id="toggle-closing-cta"
                        checked={includeClosingCta}
                        onCheckedChange={setIncludeClosingCta}
                      />
                    </div>
                    <Select value={closingCta} onValueChange={setClosingCta} disabled={!includeClosingCta}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {closingCtas.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <Label htmlFor="toggle-sign-off">Sign-off (Optional)</Label>
                      <Switch
                        id="toggle-sign-off"
                        checked={includeSignOff}
                        onCheckedChange={setIncludeSignOff}
                      />
                    </div>
                    <Select value={closingCta2} onValueChange={setClosingCta2} disabled={!includeSignOff}>
                      <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {signOffCtas.map(c => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Tone</Label>
                    <Select value={tone} onValueChange={setTone}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {tones.map(t => (
                          <SelectItem key={t} value={t}>{t}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="md:col-span-2">
                    <div className="flex justify-between items-center mb-2">
                      <Label>Word Limit (Optional)</Label>
                      <span className="text-sm font-medium text-muted-foreground">{wordLimit[0]} - {wordLimit[1]} words</span>
                    </div>
                    <Slider
                      value={wordLimit}
                      onValueChange={setWordLimit}
                      min={50}
                      max={500}
                      step={10}
                    />
                    {suggestion?.wordLimitReasoning && (
                      <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-800 rounded-r-lg text-sm">
                        <p><span className="font-bold">AI Suggestion: </span>For this project, a range of {suggestion.wordLimit[0]} - {suggestion.wordLimit[1]} words is ideal. {suggestion.wordLimitReasoning}</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <Rocket className="h-5 w-5 text-primary" />
                    <CardTitle className="text-lg">Opening Strategy</CardTitle>
                  </div>
                  <CardDescription>Choose a proven opening approach, or leave it as "None", AI will customize it for you.</CardDescription>
                </CardHeader>
                <CardContent>
                  <RadioGroup value={openingStrategy} onValueChange={setOpeningStrategy} className="space-y-2" disabled={proposalTemplate === 'video'}>
                    {openingStrategies.map(strategy => (
                      <Label key={strategy.id} htmlFor={`strategy-${strategy.id}`} className={cn("flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all", openingStrategy === strategy.id && "border-primary ring-2 ring-primary", (proposalTemplate === 'video' && strategy.id !== 'video') && "opacity-50 cursor-not-allowed")}>
                        <RadioGroupItem value={strategy.id} id={`strategy-${strategy.id}`} className="mt-1" disabled={proposalTemplate === 'video' && strategy.id !== 'video'} />
                        <div className="grid gap-1.5">
                          <span className="font-semibold">{strategy.title}</span>
                          <span className="text-sm text-muted-foreground">{strategy.description}</span>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                  {strategySuggestionReasoning && openingStrategy !== 'none' && (
                    <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-800 rounded-r-lg">
                      <p><span className="font-bold">AI Suggestion: </span>{strategySuggestionReasoning}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          )}

          <div className="flex justify-between items-center">
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

        <div className="space-y-6 xl:sticky xl:top-24">
          <Card>
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
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mb-3">
                <AlertCircle className="h-3.5 w-3.5 shrink-0" />
                <span>AI may make mistakes. Double-check all generated proposals.</span>
              </div>
              <div onMouseUp={() => setSelectedText(window.getSelection()?.toString() ?? '')}>
                {isGenerating ? (
                  <div className="flex flex-col items-center justify-center py-20">
                    <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
                    <p className="text-muted-foreground font-medium">Crafting your custom proposal...</p>
                    <p className="text-xs text-muted-foreground mt-1">This usually takes 10-15 seconds</p>
                  </div>
                ) : generatedProposal ? (
                  <div className="prose prose-sm max-w-none dark:prose-invert whitespace-pre-wrap">
                    {generatedProposal}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                    <HugeiconsIcon icon={File01Icon} size={32} className="h-12 w-12 mb-4" />
                    <p className="font-medium">Your proposal will appear here.</p>
                    <p className="text-sm">Fill out the details on the left and click "Generate Proposal".</p>
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

          {generatedProposal && (
            <Button variant="outline" className="w-full" onClick={handleResetForm}>
              <RefreshCcw className="mr-2 h-4 w-4" />
              Create a New Proposal
            </Button>
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


      <div className="mt-16 w-full">
        <FeaturedSectionClient />
      </div>

      <ProTips />
    </>
  );
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DashboardContent />
    </Suspense>
  )
}









