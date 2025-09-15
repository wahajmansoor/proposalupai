"use client";

import { useState, useTransition, useRef, useActionState } from 'react';
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
import { Sparkles, Bot, Clipboard, Plus, Trash2, Wand2, FileText, User, Settings, Rocket, Lightbulb, Save, ChevronDown, CheckCircle2, Video } from 'lucide-react';
import type { JobAnalysis, ClientQuestion } from '@/app/lib/types';
import { ProTip } from '@/components/pro-tip';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { cn } from '@/lib/utils';

const initialState = {
  error: null,
  data: null,
};

export default function DashboardPage() {
  const { toast } = useToast();
  
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

  const [isGenerating, setIsGenerating] = useState(false);
  const [isAnswering, setIsAnswering] = useState<number | null>(null);


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
  
  const handleGenerateProposal = async () => {
    if (!jobDetails.jobDescription || !jobDetails.jobTitle) {
        toast({ title: 'Missing Information', description: 'Please provide job title and description first.', variant: 'destructive' });
        return;
    }
    setIsGenerating(true);
    setGeneratedProposal('');

    // Simulate analysis for now
    const analysisResult = await analyzeJobAction(null, new FormData());

    const clientQA = clientQuestions
      .filter(q => q.question)
      .map(q => `Q: ${q.question}`)
      .join('\n\n');

    const result = await generateProposalAction({
        jobTitle: jobDetails.jobTitle,
        jobDescription: jobDetails.jobDescription,
        profileSummary: `Name: ${profileName}\nRelevant Experience: ${relevantExperience}`,
        relevantSkills: skillsAndExpertise,
        pastSuccesses: '', // This can be derived from relevant experience or a dedicated field
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
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      <main className="flex-1 p-4 md:p-8 container mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          
          {/* Left Column: Form */}
          <div className="space-y-6">
            <div className="flex items-center gap-3">
              <FileText className="h-6 w-6 text-primary" />
              <div>
                <h1 className="text-2xl font-bold">Create Your Proposal</h1>
                <p className="text-muted-foreground">Fill in the details below to generate a new proposal with AI.</p>
              </div>
            </div>

            {/* Job Details */}
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
              </CardContent>
            </Card>

            {/* Proposal Template */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Proposal Template</CardTitle>
              </CardHeader>
              <CardContent>
                <RadioGroup value={proposalTemplate} onValueChange={setProposalTemplate} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Label htmlFor="template-standard" className={cn("flex flex-col items-start gap-2 rounded-lg border p-4 cursor-pointer transition-all", proposalTemplate === 'standard' && "border-primary ring-2 ring-primary")}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold">Standard Proposal</span>
                      <RadioGroupItem value="standard" id="template-standard" />
                    </div>
                    <p className="text-sm text-muted-foreground">A classic, professional proposal structure. The AI will customize it for you.</p>
                  </Label>
                  <Label htmlFor="template-video" className={cn("flex flex-col items-start gap-2 rounded-lg border p-4 cursor-pointer transition-all", proposalTemplate === 'video' && "border-primary ring-2 ring-primary")}>
                    <div className="flex items-center justify-between w-full">
                      <span className="font-semibold">Video Intro</span>
                      <RadioGroupItem value="video" id="template-video" />
                    </div>
                    <p className="text-sm text-muted-foreground">A template that includes a Loom video to introduce yourself.</p>
                  </Label>
                </RadioGroup>
              </CardContent>
            </Card>
            
            {/* Your Profile */}
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
                  <Textarea id="skillsAndExpertise" value={skillsAndExpertise} onChange={handleInputChange(setSkillsAndExpertise)} placeholder="Add a skill and press Enter" className="min-h-[80px]" />
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

             {/* Client Questions */}
            <Card>
              <CardHeader>
                 <div className="flex items-center gap-2">
                  <Bot className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Client Questions</CardTitle>
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

             {/* Preferences */}
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

            {/* Opening Strategy */}
            <Card>
              <CardHeader>
                 <div className="flex items-center gap-2">
                  <Rocket className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Opening Strategy</CardTitle>
                   <CardDescription>Choose a proven opening approach, or leave it as "None" to use the standard greeting.</CardDescription>
                </div>
              </CardHeader>
              <CardContent>
                <RadioGroup value={openingStrategy} onValueChange={setOpeningStrategy} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {['none', 'helpWithTask', 'extensiveExperience', 'upworkDiscount', 'similarProject', 'congratulations', 'freeSample', 'strategicQuestions'].map(strategy => (
                     <Label key={strategy} htmlFor={`strategy-${strategy}`} className={cn("flex flex-col items-start gap-2 rounded-lg border p-4 cursor-pointer transition-all", openingStrategy === strategy && "border-primary ring-2 ring-primary")}>
                      <div className="flex items-center justify-between w-full">
                        <span className="font-semibold capitalize">{strategy.replace(/([A-Z])/g, ' $1').replace('none', 'None').replace('helpWithTask', 'Help with Specific Task')}</span>
                        <RadioGroupItem value={strategy} id={`strategy-${strategy}`} />
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {
                          {
                            none: "Use the standard greeting selected above.",
                            helpWithTask: "Hi [Client's Name], I see that you need help with [Specific Task]. I'm new to Upwork...",
                            extensiveExperience: "Hi [Client's Name], While viewing your job details, it really jumped out at me...",
                            upworkDiscount: "Hi [Client's Name], I'm new to Upwork and looking to land a few clients...",
                            similarProject: "Hey, [Client's Name]! Your job description caught my attention because I recently completed a similar project.",
                            congratulations: "Hi, [Client's Name]! Congratulations on [Specific Milestone]!",
                            freeSample: "Hi [Client's Name]! I'd be happy to provide a free sample of the work...",
                            strategicQuestions: "Hi [Client's Name]! Your job description sparked a couple of questions in my mind...",
                          }[strategy]
                        }
                      </p>
                    </Label>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <Button size="lg" className="w-full" onClick={handleGenerateProposal} disabled={isGenerating}>
                {isGenerating ? "Generating..." : <><Wand2 className="mr-2"/>Generate Proposal</>}
            </Button>
          </div>
          
          {/* Right Column: Output */}
          <div className="space-y-6 sticky top-24">
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
                ) : generatedProposal ? (
                    <div className="prose prose-sm max-w-none text-gray-700 whitespace-pre-wrap">
                        {generatedProposal}
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8 border-2 border-dashed rounded-lg">
                        <Wand2 className="h-12 w-12 mb-4 text-gray-300" />
                        <p>Your AI-generated proposal will appear here.</p>
                    </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Pro Tips</CardTitle>
                    </div>
                </CardHeader>
                <CardContent className="space-y-4 text-sm">
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Use Loom videos if you are new</h4>
                            <p className="text-muted-foreground">A quick, personal video can make a great first impression and help you stand out.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Your focus is to get them on a call</h4>
                            <p className="text-muted-foreground">The main goal of your proposal is to start a conversation. Aim to schedule a call.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
                        <div>
                            <h4 className="font-semibold">Structuring your calls is essential</h4>
                            <p className="text-muted-foreground">Plan your call agenda to cover project goals, your approach, and next steps.</p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Save className="h-5 w-5 text-primary" />
                        <CardTitle className="text-lg">Saved Snippets</CardTitle>
                    </div>
                     <CardDescription>Save and reuse your best-performing text.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="snippetTitle">Snippet Title</Label>
                        <Input id="snippetTitle" placeholder="e.g., Project Outro" />
                    </div>
                     <div>
                        <Label htmlFor="snippetContent">Snippet Content</Label>
                        <Textarea id="snippetContent" placeholder="Your snippet text..." />
                    </div>
                    <Button className="w-full bg-primary hover:bg-primary/90"><Plus className="mr-2 h-4 w-4" /> Add New Snippet</Button>
                    <Accordion type="single" collapsible className="w-full">
                        <AccordionItem value="item-1">
                            <AccordionTrigger>Introduction</AccordionTrigger>
                            <AccordionContent>Saved introduction snippet content here.</AccordionContent>
                        </AccordionItem>
                        <AccordionItem value="item-2">
                            <AccordionTrigger>Closing</AccordionTrigger>
                            <AccordionContent>Saved closing snippet content here.</AccordionContent>
                        </AccordionItem>
                    </Accordion>
                </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}

    