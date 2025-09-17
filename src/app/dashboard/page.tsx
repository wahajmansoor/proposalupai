
"use client";

import { useState, useEffect, useRef } from 'react';
import {
  generateProposalAction,
  analyzeAndSuggestAction,
  autofillSkillsAction,
  answerQuestionsAction,
} from '@/app/lib/actions';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Bot, Clipboard, Plus, Trash2, Wand2, FileText, User, Settings, Rocket, ArrowLeft, ArrowRight, MessageSquareQuote, CheckCircle, Phone, Globe, Users, Calendar, BarChart, ShoppingCart, Code, Search, Lightbulb, Mail, BarChart2, ExternalLink } from 'lucide-react';
import type { ClientQuestion, PortfolioCollection } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ProTips } from '@/components/pro-tips';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/context/auth-context';
import { useRouter } from 'next/navigation';
import { getPortfolioCollections } from '@/lib/firebase/portfolio';
import { Slider } from '@/components/ui/slider';
import { ProposalUpLogo, LinkedInIcon } from '@/components/icons';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import Image from 'next/image';
import Link from 'next/link';

type Suggestion = {
  template: 'standard' | 'video';
  templateReasoning: string;
  strategyId: string;
  strategyReasoning: string;
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

export default function DashboardPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [projectDetails, setProjectDetails] = useState({ projectTitle: '', summary: '' });
  
  const [proposalTemplate, setProposalTemplate] = useState<'standard' | 'video'>('standard');
  const [openingStrategy, setOpeningStrategy] = useState('none');
  const [strategySuggestionReasoning, setStrategySuggestionReasoning] = useState('');


  const [profileName, setProfileName] = useState('Jane Doe');
  const [clientName, setClientName] = useState('');
  const [skillsAndExpertise, setSkillsAndExpertise] = useState('');
  const [relevantExperience, setRelevantExperience] = useState('');
  
  const [portfolioCollections, setPortfolioCollections] = useState<PortfolioCollection[]>([]);
  const [selectedPortfolio, setSelectedPortfolio] = useState<string>('none');
  const [portfolioLinkOption, setPortfolioLinkOption] = useState<'manual' | 'collection'>('manual');
  const [manualPortfolioLinks, setManualPortfolioLinks] = useState('');


  const [greeting, setGreeting] = useState('hi');
  const [closingCta, setClosingCta] = useState('looking-forward');
  const [closingCta2, setClosingCta2] = useState('best-regards');
  const [tone, setTone] = useState('professional');
  const [wordLimit, setWordLimit] = useState([50, 120]);
  
  const [clientQuestions, setClientQuestions] = useState<ClientQuestion[]>([{ id: 1, question: '', answer: '' }]);
  
  const [generatedProposal, setGeneratedProposal] = useState('');
  const [wordCount, setWordCount] = useState(0);

  const summaryTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (generatedProposal) {
      setWordCount(generatedProposal.trim().split(/\s+/).filter(Boolean).length);
    } else {
      setWordCount(0);
    }
  }, [generatedProposal]);
  
  const [suggestion, setSuggestion] = useState<Suggestion | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isSuggestingSkills, setIsSuggestingSkills] = useState(false);
  const [isAnsweringQuestions, setIsAnsweringQuestions] = useState(false);
  const [answersGenerated, setAnswersGenerated] = useState(false);


  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (user) {
      if (user.displayName) {
        setProfileName(user.displayName);
      }
      // Fetch portfolio collections
      const fetchCollections = async () => {
        const collections = await getPortfolioCollections(user.uid);
        setPortfolioCollections(collections);
      };
      fetchCollections();
    }
  }, [user]);
  
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
      // If the user switches back from video, don't leave 'video' selected.
      if (openingStrategy === 'video') {
        setOpeningStrategy('none');
      }
    }
  }, [proposalTemplate, openingStrategy]);


  if (loading || !user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <ProposalUpLogo className="h-20 w-20 animate-pulse text-primary" />
      </div>
    );
  }

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
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };

  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setter(e.target.value);
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
  
  const handleAnalyzeJob = async () => {
    if (!projectDetails.projectTitle || !projectDetails.summary) {
      toast({ title: 'Missing Information', description: 'Please provide Project Title and Summary to analyze.', variant: 'destructive' });
      return;
    }
    setIsAnalyzing(true);
    setSuggestion(null);

    try {
      const strategiesMap = openingStrategies.reduce((acc, str) => {
        if (str.id !== 'video') { // Don't include video in what the AI can choose from
          acc[str.id] = str.description;
        }
        return acc;
      }, {} as Record<string, string>);

      const result = await analyzeAndSuggestAction({
        projectDetails,
        strategies: strategiesMap,
      });

      if (result.error) {
        toast({ title: 'Analysis Error', description: result.error, variant: 'destructive' });
      } else if (result.data) {
        setSuggestion(result.data);
        setProposalTemplate(result.data.template);
        setOpeningStrategy(result.data.strategyId);
        setStrategySuggestionReasoning(result.data.strategyReasoning);

        toast({ 
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
    setIsSuggestingSkills(true);
    const result = await autofillSkillsAction({
      projectTitle: projectDetails.projectTitle,
      summary: projectDetails.summary,
      profileInformation: relevantExperience,
    });

    if (result.error) {
      toast({ title: 'Error filling skills', description: result.error, variant: 'destructive' });
    } else if (result.data) {
      setSkillsAndExpertise(result.data.skillsAndExpertise.join(', '));
      toast({ title: 'Skills Auto-filled!', description: 'Relevant skills have been added based on the project summary.' });
    }
    setIsSuggestingSkills(false);
  };
  
  const handleAnswerAllQuestions = async () => {
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
    
    setIsAnsweringQuestions(true);
    const result = await answerQuestionsAction({
      jobDescription: projectDetails.summary,
      clientQuestions: questionsToAnswer.map(q => q.question),
      profileInformation: `My name is ${profileName}. My skills are ${skillsAndExpertise}. My experience is: ${relevantExperience}`,
    });
    
    if (result.error) {
      toast({ title: 'Error Getting Answers', description: result.error, variant: 'destructive' });
    } else if (result.data?.answers) {
      const newClientQuestions = [...clientQuestions];
      let answerIndex = 0;
      for(let i=0; i < newClientQuestions.length; i++) {
        if(newClientQuestions[i].question) {
          if(result.data.answers[answerIndex]) {
            newClientQuestions[i].answer = result.data.answers[answerIndex];
            answerIndex++;
          }
        }
      }
      setClientQuestions(newClientQuestions);
      setAnswersGenerated(true);
      toast({ title: 'Answers Ready!', description: 'Your answers will be available after the proposal is generated.' });
    }
    setIsAnsweringQuestions(false);
  }

  const handleGenerateProposal = async () => {
    if (!projectDetails.summary || !projectDetails.projectTitle) {
        toast({ title: 'Missing Information', description: 'Please provide project title and summary first.', variant: 'destructive' });
        setCurrentStep(1);
        return;
    }
    setIsGenerating(true);
    setGeneratedProposal('');

    const selectedGreeting = greetings.find(g => g.value === greeting)?.label || greeting;
    const selectedClosing = closingCtas.find(c => c.value === closingCta)?.label || closingCta;
    const selectedClosing2 = closingCta2 === 'none' ? undefined : signOffCtas.find(c => c.value === closingCta2)?.label || closingCta2;
    const selectedOpeningStrategy = openingStrategies.find(s => s.id === openingStrategy)?.description;

    
    let portfolioLinks = '';
    if (portfolioLinkOption === 'collection' && selectedPortfolio !== 'none') {
      portfolioLinks = portfolioCollections.find(c => c.id === selectedPortfolio)?.links.join(', ') || '';
    } else if (portfolioLinkOption === 'manual') {
      portfolioLinks = manualPortfolioLinks;
    }
      
    const result = await generateProposalAction({
        projectTitle: projectDetails.projectTitle,
        summary: projectDetails.summary,
        profileSummary: `Name: ${profileName}\nRelevant Experience: ${relevantExperience}`,
        relevantSkills: skillsAndExpertise,
        pastSuccesses: '',
        portfolioLinks: portfolioLinks,
        greeting: clientName ? `${selectedGreeting} ${clientName}` : selectedGreeting,
        openingStrategy: (openingStrategy !== 'none' && openingStrategy !== 'video') ? selectedOpeningStrategy : undefined,
        closingCta: selectedClosing,
        closingCta2: selectedClosing2,
        tone,
        wordLimit: `${wordLimit[0]}-${wordLimit[1]}`,
        proposalTemplate,
    });

    if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result.data) {
        setGeneratedProposal(result.data.proposal);
    }
    setIsGenerating(false);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: 'Copied!', description: 'Content copied to clipboard.' });
  };
  
  const stepTitles = ["Project Details", "Your Profile", "Client Questions", "Preferences & Strategy"];
  const hasAnsweredQuestions = clientQuestions.some(q => q.answer);
  const hasQuestions = clientQuestions.some(q => q.question);

  return (
    <div className="flex flex-col min-h-screen bg-[#f9f9f9]">
      <Header />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Create Your Proposal</h1>
                <p className="text-muted-foreground">Step {currentStep} of {totalSteps}: {stepTitles[currentStep - 1]}</p>
              </div>
            </div>
            
            <Progress value={(currentStep / totalSteps) * 100} className="w-full" />

            {currentStep === 1 && (
              <Card>
                <CardContent className="p-6 space-y-4">
                  <div>
                    <Label htmlFor="projectTitle">Project Title</Label>
                    <Input id="projectTitle" value={projectDetails.projectTitle} onChange={(e) => setProjectDetails({...projectDetails, projectTitle: e.target.value})} placeholder="e.g., Senior Frontend Developer" />
                  </div>
                  <div>
                    <Label htmlFor="summary">Summary</Label>
                    <Textarea 
                      ref={summaryTextareaRef}
                      id="summary" 
                      value={projectDetails.summary} 
                      onChange={(e) => setProjectDetails({...projectDetails, summary: e.target.value})} 
                      placeholder="Paste the project summary from Upwork or another platform here..." 
                      className="resize-none overflow-hidden" 
                      rows={1}
                    />
                  </div>
                   <Button onClick={handleAnalyzeJob} disabled={isAnalyzing} className="w-full">
                    {isAnalyzing ? "Analyzing..." : <><Sparkles className="mr-2"/>Analyze & Get Suggestions</>}
                  </Button>
                  
                  {isAnalyzing && (
                    <div className="space-y-2 pt-4">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-4 w-full" />
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
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="yourName">Your Name</Label>
                      <Input id="yourName" value={profileName} onChange={handleInputChange(setProfileName)} placeholder="Your name"/>
                    </div>
                    <div>
                      <Label htmlFor="clientName">Client's Name (Optional)</Label>
                      <Input id="clientName" value={clientName} onChange={handleInputChange(setClientName)} placeholder="Client's name (if known)"/>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1">
                      <Label htmlFor="skillsAndExpertise">Skills and Expertise</Label>
                      <Button variant="outline" size="sm" onClick={handleAutofillSkills} disabled={isSuggestingSkills}>
                        {isSuggestingSkills ? 'Thinking...' : <><Sparkles className="mr-2 h-4 w-4" /> Auto Fill</>}
                      </Button>
                    </div>
                    <Input id="skillsAndExpertise" value={skillsAndExpertise} onChange={handleInputChange(setSkillsAndExpertise)} placeholder="Enter skills separated by commas (e.g., React, Node.js)" />
                    {skillsAndExpertise.trim() && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {skillsAndExpertise.split(',').map(skill => skill.trim()).filter(Boolean).map((skill, index) => (
                          <Badge key={index} variant="secondary" className="font-normal">{skill}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="relevantExperience">My Style / Relevant Experience</Label>
                    <Textarea id="relevantExperience" value={relevantExperience} onChange={handleInputChange(setRelevantExperience)} placeholder="Briefly describe your relevant experience or paste a sample of your writing. The AI will adapt to your style." className="min-h-[120px]" />
                  </div>
                   <div>
                      <Label className="mb-2 block">Portfolio / Relevant Links</Label>
                      <RadioGroup value={portfolioLinkOption} onValueChange={(value) => setPortfolioLinkOption(value as 'collection' | 'manual')} className="flex items-center space-x-4 mb-2">
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="manual" id="r2" />
                          <Label htmlFor="r2">Manual Links</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                          <RadioGroupItem value="collection" id="r1" />
                          <Label htmlFor="r1">Portfolio Collection</Label>
                        </div>
                      </RadioGroup>

                      {portfolioLinkOption === 'collection' ? (
                        <div>
                          <Select value={selectedPortfolio} onValueChange={setSelectedPortfolio}>
                            <SelectTrigger>
                              <SelectValue placeholder="Select a collection" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">None</SelectItem>
                              {portfolioCollections.map(collection => (
                                <SelectItem key={collection.id} value={collection.id}>
                                  {collection.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground mt-2">
                            Manage your collections on the <a href="/dashboard/portfolio" className="underline">Portfolio page</a>.
                          </p>
                        </div>
                      ) : (
                        <Textarea 
                          value={manualPortfolioLinks}
                          onChange={handleInputChange(setManualPortfolioLinks)}
                          placeholder="Paste relevant links, one per line."
                          className="min-h-[100px]"
                        />
                      )}
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
                        <Label>Greeting</Label>
                        <Select value={greeting} onValueChange={setGreeting}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {greetings.map(g => (
                                    <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Closing CTA</Label>
                        <Select value={closingCta} onValueChange={setClosingCta}>
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                {closingCtas.map(c => (
                                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Sign-off (Optional)</Label>
                        <Select value={closingCta2} onValueChange={setClosingCta2}>
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
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="assertive">Assertive</SelectItem>
                                <SelectItem value="persuasive">Persuasive</SelectItem>
                                <SelectItem value="creative">Creative</SelectItem>
                                <SelectItem value="concise">Concise</SelectItem>
                                <SelectItem value="formal">Formal</SelectItem>
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
                ) : (
                  <Button size="lg" onClick={handleGenerateProposal} disabled={isGenerating}>
                    {isGenerating ? "Generating..." : <><Wand2 className="mr-2"/>Generate Proposal</>}
                  </Button>
                )}
              </div>
            </div>
          </div>
          
          <div className="space-y-6 sticky top-24">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div className="flex items-center gap-2">
                  <CardTitle>Generated Proposal</CardTitle>
                  {wordCount > 0 && (
                    <Badge variant="secondary">{wordCount} words</Badge>
                  )}
                </div>
                <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedProposal)} disabled={!generatedProposal}>
                    <Clipboard className="mr-2 h-4 w-4" /> Copy
                </Button>
              </CardHeader>
              <CardContent className={cn("min-h-[400px]", { 'min-h-[200px]': !generatedProposal && !isGenerating })}>
                {isGenerating ? (
                    <div className="space-y-2 pt-4">
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-5/6" />
                        <Skeleton className="h-4 w-full mt-4" />
                        <Skeleton className="h-4 w-full" />
                        <Skeleton className="h-4 w-2/3" />
                    </div>
                ) : generatedProposal ? (
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                        {generatedProposal}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground">
                      <FileText className="h-12 w-12 mb-4" />
                      <p className="font-medium">Your proposal will appear here.</p>
                      <p className="text-sm">Fill out the details on the left and click "Generate Proposal".</p>
                    </div>
                )}
              </CardContent>
            </Card>

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
                      <p className="text-gray-600 whitespace-pre-wrap">{q.answer}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        <div className="mt-16 grid grid-cols-1 md:grid-cols-5 gap-8 items-start">
          <div className="md:col-span-3">
            <div className="bg-card p-6 rounded-lg border shadow-sm">
                <ProTips />
            </div>
          </div>
          <Card className="md:col-span-2">
            <CardContent className="p-6">
               <div className="flex items-center gap-4 mb-4">
                <Image 
                  src="https://proposalup.wahajmansoor.com/storage/2025/07/Wahaj-Mansoor-Wordpress-Expert-Profile-Picture-New-1.png"
                  alt="Wahaj Mansoor"
                  width={80}
                  height={80}
                  className="rounded-full"
                />
                <div>
                  <Link href="https://www.linkedin.com/in/wahajmansoor/" target="_blank" className="flex items-center gap-2 hover:underline">
                    <h3 className="text-xl font-bold">Wahaj Mansoor</h3>
                    <LinkedInIcon className="h-5 w-5" />
                  </Link>
                  <p className="text-sm text-muted-foreground font-semibold">WordPress Developer & Brand Strategist</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground mb-4">
                I design high-converting WordPress websites that consistently capture leads. With 1,500+ verified 5-star reviews, I'm recognized as a Preferred Freelancer on freelancer.com and a Level 2 Seller on fiverr.com.
              </p>
              
              <div className="grid grid-cols-3 gap-4 text-center mb-6">
                <div>
                  <p className="text-lg font-bold">1500+</p>
                  <p className="text-xs text-muted-foreground">Happy Customers</p>
                </div>
                <div>
                  <p className="text-lg font-bold">10</p>
                  <p className="text-xs text-muted-foreground">Years Experience</p>
                </div>
                <div>
                  <p className="text-lg font-bold">6500+</p>
                  <p className="text-xs text-muted-foreground">LinkedIn Community</p>
                </div>
              </div>

              <div className="border-t pt-4 mt-6">
                <h4 className="font-semibold mb-4 text-center">My Services</h4>
                <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-1 rounded-full"><Code className="h-3 w-3 text-primary" /></div>
                      <span>Web Development</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-1 rounded-full"><ShoppingCart className="h-3 w-3 text-primary" /></div>
                      <span>eCommerce Solution</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-1 rounded-full"><Search className="h-3 w-3 text-primary" /></div>
                      <span>On-Page SEO</span>
                    </div>
                     <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-1 rounded-full"><Lightbulb className="h-3 w-3 text-primary" /></div>
                      <span>Landing Page</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-1 rounded-full"><Globe className="h-3 w-3 text-primary" /></div>
                      <span>Web Designing</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-primary/10 p-1 rounded-full"><Mail className="h-3 w-3 text-primary" /></div>
                      <span>Email Marketing</span>
                    </div>
                     <div className="flex items-center gap-2 col-span-2">
                      <div className="bg-primary/10 p-1 rounded-full"><BarChart2 className="h-3 w-3 text-primary" /></div>
                      <span>GoHighLevel Funnels</span>
                    </div>
                </div>
              </div>

              <div className="mt-6 flex flex-col gap-2">
                 <Button asChild className="bg-black text-white hover:bg-gray-800 w-full">
                  <Link href="https://cal.com/wahajmansoor/website-consultation" target="_blank">
                    <Calendar className="mr-2" /> Book 1:1 Discovery Call
                  </Link>
                </Button>
                <Button asChild variant="outline" className="w-full">
                  <Link href="https://wahajmansoor.com/" target="_blank">
                    <ExternalLink className="mr-2" /> Visit Website
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
