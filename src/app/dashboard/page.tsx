"use client";

import { useState, useTransition, useRef } from 'react';
import { useFormState } from 'react-dom';
import {
  analyzeJobAction,
  autofillSkillsAction,
  suggestIntroductionsAction,
  answerQuestionsAction,
  generateProposalAction
} from '@/app/lib/actions';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Bot, Clipboard, Plus, Trash2, Wand2 } from 'lucide-react';
import type { JobAnalysis, ClientQuestion } from '@/app/lib/types';
import { ProTip } from '@/components/pro-tip';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"

const initialState = {
  error: null,
  data: null,
};

export default function DashboardPage() {
  const { toast } = useToast();
  const [analysisState, formAction] = useFormState(analyzeJobAction, initialState);
  
  const [jobDetails, setJobDetails] = useState({ jobTitle: '', jobDescription: '' });
  const [analysis, setAnalysis] = useState<JobAnalysis | null>(null);
  const [isAnalyzing, startAnalyzing] = useTransition();

  const [profileSummary, setProfileSummary] = useState('');
  const [skills, setSkills] = useState('');
  const [pastSuccesses, setPastSuccesses] = useState('');
  const [clientQuestions, setClientQuestions] = useState<ClientQuestion[]>([{ id: 1, question: '', answer: '' }]);
  const [introductionSuggestions, setIntroductionSuggestions] = useState<string[]>([]);
  const [generatedProposal, setGeneratedProposal] = useState('');

  const [isAutofilling, setIsAutofilling] = useState(false);
  const [isSuggesting, setIsSuggesting] = useState(false);
  const [isAnswering, setIsAnswering] = useState<number | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  const formRef = useRef<HTMLFormElement>(null);

  const handleTextareaChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setter(e.target.value);
  };
  
  const handleInputChange = (setter: React.Dispatch<React.SetStateAction<string>>) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setter(e.target.value);
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    startAnalyzing(async () => {
      const formData = new FormData(e.currentTarget);
      setJobDetails({
        jobTitle: formData.get('jobTitle') as string,
        jobDescription: formData.get('jobDescription') as string,
      });
      const result = await analyzeJobAction(initialState, formData);
      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
      } else {
        setAnalysis(result.data as JobAnalysis);
      }
    });
  };

  const handleAutofillSkills = async () => {
    if (!jobDetails.jobDescription) {
        toast({ title: 'Missing Information', description: 'Please provide job details first.', variant: 'destructive' });
        return;
    }
    setIsAutofilling(true);
    const result = await autofillSkillsAction({
        jobTitle: jobDetails.jobTitle,
        jobDescription: jobDetails.jobDescription,
        profileInformation: profileSummary,
    });
    if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result.data) {
        setSkills(result.data.skillsAndExpertise);
    }
    setIsAutofilling(false);
  };

  const handleSuggestIntroductions = async () => {
    if (!jobDetails.jobDescription) {
        toast({ title: 'Missing Information', description: 'Please provide job details first.', variant: 'destructive' });
        return;
    }
    setIsSuggesting(true);
    const result = await suggestIntroductionsAction({
        jobTitle: jobDetails.jobTitle,
        jobDescription: jobDetails.jobDescription,
        profileSummary: profileSummary,
        pastSuccesses: pastSuccesses.split('\n').filter(s => s.trim() !== ''),
    });
    if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result.data) {
        setIntroductionSuggestions(result.data.introductionSuggestions);
    }
    setIsSuggesting(false);
  };

  const handleClientQuestionChange = (id: number, field: 'question' | 'answer', value: string) => {
    setClientQuestions(prev => prev.map(q => q.id === id ? { ...q, [field]: value } : q));
  };
  
  const addClientQuestion = () => {
    setClientQuestions(prev => [...prev, { id: Date.now(), question: '', answer: '' }]);
  };

  const removeClientQuestion = (id: number) => {
    setClientQuestions(prev => prev.filter(q => q.id !== id));
  };
  
  const handleAnswerQuestions = async (questionId: number) => {
    if (!jobDetails.jobDescription) {
        toast({ title: 'Missing Information', description: 'Please provide job details first.', variant: 'destructive' });
        return;
    }
    const questionToAnswer = clientQuestions.find(q => q.id === questionId)?.question;
    if (!questionToAnswer) {
        toast({ title: 'Missing Question', description: 'Please enter a question to answer.', variant: 'destructive' });
        return;
    }
    setIsAnswering(questionId);
    const result = await answerQuestionsAction({
        jobDescription: jobDetails.jobDescription,
        clientQuestions: [questionToAnswer],
        profileInformation: `${profileSummary}\n\nSkills: ${skills}\n\nPast Successes: ${pastSuccesses}`,
    });
    if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive' });
    } else if (result.data && result.data.answers.length > 0) {
        handleClientQuestionChange(questionId, 'answer', result.data.answers[0]);
    }
    setIsAnswering(null);
  };

  const handleGenerateProposal = async () => {
    if (!jobDetails.jobDescription) {
        toast({ title: 'Missing Information', description: 'Please provide job details first.', variant: 'destructive' });
        return;
    }
    setIsGenerating(true);
    const clientQA = clientQuestions
      .filter(q => q.question && q.answer)
      .map(q => `Q: ${q.question}\nA: ${q.answer}`)
      .join('\n\n');

    const result = await generateProposalAction({
        jobTitle: jobDetails.jobTitle,
        jobDescription: jobDetails.jobDescription,
        profileSummary: profileSummary,
        relevantSkills: skills,
        pastSuccesses: pastSuccesses,
        clientQuestions: clientQA,
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
  

  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 p-4 md:p-8 container">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Column 1: Job Input & Analysis */}
          <div className="lg:col-span-3 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>1. Job Details</CardTitle>
                <CardDescription>Enter the job info to start.</CardDescription>
              </CardHeader>
              <CardContent>
                <form ref={formRef} onSubmit={handleFormSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input id="jobTitle" name="jobTitle" placeholder="e.g., Senior Frontend Developer" required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="jobDescription">Job Description</Label>
                    <Textarea id="jobDescription" name="jobDescription" placeholder="Paste the job description here..." className="min-h-[200px]" required />
                  </div>
                  <Button type="submit" disabled={isAnalyzing} className="w-full">
                    {isAnalyzing ? 'Analyzing...' : <> <Sparkles className="mr-2" /> Analyze Job </>}
                  </Button>
                </form>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI Analysis</CardTitle>
                 <CardDescription>Key requirements from the job post.</CardDescription>
              </CardHeader>
              <CardContent>
                {isAnalyzing ? (
                  <div className="space-y-4">
                    <Skeleton className="h-8 w-1/2" />
                    <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-20 rounded-full" />
                      <Skeleton className="h-6 w-24 rounded-full" />
                      <Skeleton className="h-6 w-16 rounded-full" />
                    </div>
                    <Skeleton className="h-8 w-1/3 mt-4" />
                     <div className="flex flex-wrap gap-2">
                      <Skeleton className="h-6 w-28 rounded-full" />
                      <Skeleton className="h-6 w-20 rounded-full" />
                    </div>
                  </div>
                ) : analysis ? (
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">Key Themes</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.themes.map((theme, i) => <Badge key={i} variant="secondary">{theme}</Badge>)}
                      </div>
                    </div>
                     <div>
                      <h4 className="font-semibold mb-2">Requirements</h4>
                      <div className="flex flex-wrap gap-2">
                        {analysis.keyRequirements.map((req, i) => <Badge key={i} variant="outline">{req}</Badge>)}
                      </div>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Analysis will appear here.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Column 2: Proposal Crafting */}
          <div className="lg:col-span-6 space-y-8">
            <Tabs defaultValue="standard">
                <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold tracking-tight">2. Craft Your Proposal</h2>
                    <TabsList>
                        <TabsTrigger value="standard">Standard Proposal</TabsTrigger>
                        <TabsTrigger value="video" disabled>Video Intro</TabsTrigger>
                    </TabsList>
                </div>
                <TabsContent value="standard" className="mt-6">
                    <Card>
                        <CardContent className="p-6 space-y-6">
                             <div className="space-y-2">
                                <Label htmlFor="profileSummary">Your Profile Summary</Label>
                                <Textarea id="profileSummary" value={profileSummary} onChange={handleTextareaChange(setProfileSummary)} placeholder="A brief summary of your professional background and expertise." className="min-h-[100px]" />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="skills">Skills & Expertise</Label>
                                <Textarea id="skills" value={skills} onChange={handleTextareaChange(setSkills)} placeholder="List your relevant skills..." className="min-h-[120px]" />
                                <Button variant="outline" size="sm" onClick={handleAutofillSkills} disabled={isAutofilling}>
                                    {isAutofilling ? 'Filling...' : <> <Bot className="mr-2" /> Autofill with AI </>}
                                </Button>
                            </div>
                             <div className="space-y-2">
                                <Label htmlFor="pastSuccesses">Past Successes</Label>
                                <Textarea id="pastSuccesses" value={pastSuccesses} onChange={handleTextareaChange(setPastSuccesses)} placeholder="Describe 2-3 relevant successful projects or accomplishments. Use a new line for each." className="min-h-[120px]" />
                                 <ProTip>
                                    Use the STAR method (Situation, Task, Action, Result) to structure your success stories for maximum impact.
                                </ProTip>
                            </div>

                            <div>
                                <h4 className="font-semibold mb-2">Client Questions</h4>
                                <Accordion type="single" collapsible className="w-full">
                                  {clientQuestions.map((q, index) => (
                                    <AccordionItem value={`item-${index}`} key={q.id}>
                                       <AccordionTrigger>Question {index + 1}</AccordionTrigger>
                                       <AccordionContent className="p-2">
                                          <div className="space-y-4">
                                            <Textarea placeholder="What is the client asking?" value={q.question} onChange={(e) => handleClientQuestionChange(q.id, 'question', e.target.value)} />
                                            <Textarea placeholder="AI-generated answer will appear here..." value={q.answer} onChange={(e) => handleClientQuestionChange(q.id, 'answer', e.target.value)} className="min-h-[100px] bg-secondary/50"/>
                                            <div className="flex justify-between items-center">
                                                <Button variant="outline" size="sm" onClick={() => handleAnswerQuestions(q.id)} disabled={isAnswering === q.id}>
                                                    {isAnswering === q.id ? 'Answering...' : <><Bot className="mr-2" /> Get Answer with AI</>}
                                                </Button>
                                                 <Button variant="ghost" size="icon" onClick={() => removeClientQuestion(q.id)} className="text-muted-foreground hover:text-destructive">
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            </div>
                                          </div>
                                       </AccordionContent>
                                    </AccordionItem>
                                  ))}
                                </Accordion>
                                <Button variant="outline" size="sm" onClick={addClientQuestion} className="mt-4"><Plus className="mr-2" /> Add Question</Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
            <div className="flex justify-end">
                <Button size="lg" onClick={handleGenerateProposal} disabled={isGenerating}>
                    {isGenerating ? 'Generating...' : <><Wand2 className="mr-2" /> Generate Full Proposal</>}
                </Button>
            </div>
          </div>

          {/* Column 3: AI Assistant & Output */}
          <div className="lg:col-span-3 space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>3. AI Assistant</CardTitle>
                <CardDescription>Tools to enhance your proposal.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Button onClick={handleSuggestIntroductions} disabled={isSuggesting} className="w-full">
                  {isSuggesting ? 'Suggesting...' : <> <Sparkles className="mr-2" /> Suggest Introductions </>}
                </Button>
                 <div className="space-y-3 pt-4">
                    {isSuggesting ? (
                      Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)
                    ) : introductionSuggestions.length > 0 ? (
                      introductionSuggestions.map((suggestion, i) => (
                        <div key={i} className="text-sm p-3 border rounded-md bg-secondary/50 relative group">
                          {suggestion}
                          <Button size="icon" variant="ghost" className="absolute top-1 right-1 h-7 w-7 opacity-0 group-hover:opacity-100" onClick={() => copyToClipboard(suggestion)}>
                            <Clipboard className="h-4 w-4" />
                          </Button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground text-center pt-2">Introduction suggestions will appear here.</p>
                    )}
                  </div>
              </CardContent>
            </Card>

            <Card className="sticky top-24">
              <CardHeader>
                <CardTitle>4. Final Proposal</CardTitle>
                 <CardDescription>Your generated proposal output.</CardDescription>
              </CardHeader>
              <CardContent>
                {isGenerating ? (
                   <div className="space-y-2">
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-5/6" />
                      <Skeleton className="h-4 w-full mt-4" />
                      <Skeleton className="h-4 w-2/3" />
                   </div>
                ) : generatedProposal ? (
                  <div className="relative">
                    <Textarea readOnly value={generatedProposal} className="min-h-[250px] bg-secondary/50" />
                    <Button size="icon" variant="ghost" className="absolute top-2 right-2 h-8 w-8" onClick={() => copyToClipboard(generatedProposal)}>
                      <Clipboard className="h-4 w-4" />
                    </Button>
                  </div>
                ) : (
                    <div className="flex items-center justify-center h-48 border-2 border-dashed rounded-md">
                        <p className="text-sm text-muted-foreground">Generated proposal will appear here.</p>
                    </div>
                )}
              </CardContent>
            </Card>
          </div>

        </div>
      </main>
    </div>
  );
}
