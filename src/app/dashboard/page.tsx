"use client";

import { useState } from 'react';
import {
  generateProposalAction,
  suggestProposalTemplateAction
} from '@/app/lib/actions';
import { Header } from '@/components/header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { Sparkles, Bot, Clipboard, Plus, Trash2, Wand2, FileText, User, Settings, Rocket, Lightbulb, Save, CheckCircle2, ArrowLeft, ArrowRight } from 'lucide-react';
import type { ClientQuestion } from '@/app/lib/types';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { ProTips } from '@/components/pro-tips';
import { Badge } from '@/components/ui/badge';

type TemplateSuggestion = {
  template: 'standard' | 'video';
  reasoning: string;
}

export default function DashboardPage() {
  const { toast } = useToast();
  
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;

  const [jobDetails, setJobDetails] = useState({ jobTitle: '', jobDescription: '' });
  
  const [proposalTemplate, setProposalTemplate] = useState('standard');
  const [openingStrategy, setOpeningStrategy] = useState('none');

  const [profileName, setProfileName] = useState('');
  const [clientName, setClientName] = useState('');
  const [skillsAndExpertise, setSkillsAndExpertise] = useState('');
  const [relevantExperience, setRelevantExperience] = useState('');
  const [portfolioLinks, setPortfolioLinks] = useState('');
  
  const [clientQuestions, setClientQuestions] = useState<ClientQuestion[]>([{ id: 1, question: '', answer: '' }]);
  
  const [generatedProposal, setGeneratedProposal] = useState('');
  
  const [templateSuggestion, setTemplateSuggestion] = useState<TemplateSuggestion | null>(null);

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const nextStep = () => {
    if (currentStep < totalSteps) {
      if (currentStep === 1 && (!jobDetails.jobTitle || !jobDetails.jobDescription)) {
        toast({ title: 'Missing Information', description: 'Please provide both Job Title and Description.', variant: 'destructive' });
        return;
      }
       if (currentStep === 1 && !templateSuggestion) {
        toast({ title: 'Analysis Required', description: 'Please analyze the job description before proceeding.', variant: 'destructive' });
        return;
      }
      setCurrentStep(prev => prev + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev + 1);
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
    if (!jobDetails.jobTitle || !jobDetails.jobDescription) {
      toast({ title: 'Missing Information', description: 'Please provide Job Title and Description to analyze.', variant: 'destructive' });
      return;
    }
    setIsAnalyzing(true);
    setTemplateSuggestion(null);

    const result = await suggestProposalTemplateAction(jobDetails);

    if (result.error) {
      toast({ title: 'Analysis Error', description: result.error, variant: 'destructive' });
    } else if (result.data) {
      setTemplateSuggestion(result.data);
      setProposalTemplate(result.data.template);
      toast({ title: 'Analysis Complete!', description: 'We\'ve suggested a proposal template for you.' });
    }
    setIsAnalyzing(false);
  };
  
  const handleGenerateProposal = async () => {
    if (!jobDetails.jobDescription || !jobDetails.jobTitle) {
        toast({ title: 'Missing Information', description: 'Please provide job title and description first.', variant: 'destructive' });
        setCurrentStep(1);
        return;
    }
    setIsGenerating(true);
    setGeneratedProposal('');

    const clientQA = clientQuestions
      .filter(q => q.question)
      .map(q => `Q: ${q.question}`)
      .join('\n\n');

    const result = await generateProposalAction({
        jobTitle: jobDetails.jobTitle,
        jobDescription: jobDetails.jobDescription,
        profileSummary: `Name: ${profileName}\nRelevant Experience: ${relevantExperience}`,
        relevantSkills: skillsAndExpertise,
        pastSuccesses: '',
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
  
  const stepTitles = ["Job Details", "Your Profile", "Client Questions", "Preferences & Strategy"];

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
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
                    <Label htmlFor="jobTitle">Job Title</Label>
                    <Input id="jobTitle" value={jobDetails.jobTitle} onChange={(e) => setJobDetails({...jobDetails, jobTitle: e.target.value})} placeholder="e.g., Senior Frontend Developer" />
                  </div>
                  <div>
                    <Label htmlFor="jobDescription">Job Description</Label>
                    <Textarea id="jobDescription" value={jobDetails.jobDescription} onChange={(e) => setJobDetails({...jobDetails, jobDescription: e.target.value})} placeholder="Paste the job description from Upwork or another platform here..." className="min-h-[150px]" />
                  </div>
                   <Button onClick={handleAnalyzeJob} disabled={isAnalyzing} className="w-full">
                    {isAnalyzing ? "Analyzing..." : <><Sparkles className="mr-2"/>Analyze Job Description & AI Guide</>}
                  </Button>
                  
                  {isAnalyzing && (
                    <div className="space-y-2 pt-4">
                      <Skeleton className="h-6 w-1/3" />
                      <Skeleton className="h-4 w-full" />
                    </div>
                  )}

                  {templateSuggestion && (
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
                        <p><span className="font-bold">AI Suggestion: </span>{templateSuggestion.reasoning}</p>
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
                    <Label htmlFor="skillsAndExpertise">Skills and Expertise</Label>
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
                    <Label htmlFor="portfolioLinks">Portfolio Links</Label>
                    <Textarea id="portfolioLinks" value={portfolioLinks} onChange={handleInputChange(setPortfolioLinks)} placeholder="Add your portfolio links, previous work examples, or relevant project URLs, separated by commas." className="min-h-[80px]" />
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
                    <CardDescription>If the job posting asks specific questions, add them here.</CardDescription>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {clientQuestions.map((q, index) => (
                      <div key={q.id} className="flex items-start gap-2">
                        <Textarea placeholder={`Question ${index + 1}`} value={q.question} onChange={(e) => handleClientQuestionChange(q.id, 'question', e.target.value)} className="flex-1" />
                        <Button variant="ghost" size="icon" onClick={() => removeClientQuestion(q.id)} className="text-muted-foreground hover:text-destructive mt-1">
                            <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                  ))}
                  <Button variant="outline" size="sm" onClick={addClientQuestion}><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
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
                        <Select defaultValue="hi">
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="hi">Hi</SelectItem>
                                <SelectItem value="hello">Hello</SelectItem>
                                <SelectItem value="dear">Dear</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Closing CTA</Label>
                        <Select defaultValue="best-regards">
                            <SelectTrigger><SelectValue/></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="best-regards">Best regards</SelectItem>
                                <SelectItem value="sincerely">Sincerely</SelectItem>
                                <SelectItem value="looking-forward">Looking forward</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Tone</Label>
                        <Select defaultValue="professional">
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="professional">Professional</SelectItem>
                                <SelectItem value="friendly">Friendly</SelectItem>
                                <SelectItem value="formal">Formal</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div>
                        <Label>Word Limit (Optional)</Label>
                        <Input type="number" placeholder="100" />
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader>
                    <div className="flex items-center gap-2">
                      <Rocket className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">Opening Strategy</CardTitle>
                      <CardDescription>Choose a proven opening approach, or leave it as "None" to use the standard greeting.</CardDescription>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <RadioGroup value={openingStrategy} onValueChange={setOpeningStrategy} className="space-y-2">
                      {['none', 'helpWithTask', 'extensiveExperience', 'upworkDiscount', 'similarProject', 'congratulations', 'freeSample', 'strategicQuestions'].map(strategy => (
                        <Label key={strategy} htmlFor={`strategy-${strategy}`} className={cn("flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all", openingStrategy === strategy && "border-primary ring-2 ring-primary")}>
                          <RadioGroupItem value={strategy} id={`strategy-${strategy}`} className="mt-1" />
                          <div className="grid gap-1.5">
                            <span className="font-semibold capitalize">{strategy.replace(/([A-Z])/g, ' $1').replace('none', 'None').replace('helpWithTask', 'Help with Specific Task')}</span>
                          </div>
                        </Label>
                      ))}
                    </RadioGroup>
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
            {isGenerating || generatedProposal ? (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle>Generated Proposal</CardTitle>
                  <Button variant="ghost" size="sm" onClick={() => copyToClipboard(generatedProposal)} disabled={!generatedProposal}>
                      <Clipboard className="mr-2 h-4 w-4" /> Copy
                  </Button>
                </CardHeader>
                <CardContent className="min-h-[400px]">
                  {isGenerating ? (
                      <div className="space-y-2 pt-4">
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-5/6" />
                          <Skeleton className="h-4 w-full mt-4" />
                          <Skeleton className="h-4 w-full" />
                          <Skeleton className="h-4 w-2/3" />
                      </div>
                  ) : (
                      <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                          {generatedProposal}
                      </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <ProTips />
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
