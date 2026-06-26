import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Sparkles, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Step1Details({
  projectDetails,
  setProjectDetails,
  isEmailVerified,
  summaryTextareaRef,
  handleAnalyzeJob,
  isAnalyzing,
  trialLimitReached,
  suggestion,
  proposalTemplate,
  setProposalTemplate,
}: any) {
  return (
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
          {suggestion ? (
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2 text-sm text-green-600 font-medium">
                <Sparkles className="h-4 w-4" /> Job analyzed successfully. You can proceed or re-analyze.
              </div>
              <Button onClick={handleAnalyzeJob} disabled={isAnalyzing || trialLimitReached || !isEmailVerified} variant="outline" className="w-fit">
                {isAnalyzing ? "Analyzing..." : <><Sparkles className="mr-2 h-4 w-4" />Re-analyze Job</>}
              </Button>
            </div>
          ) : (
            <>
              <Button onClick={handleAnalyzeJob} disabled={isAnalyzing || trialLimitReached || !isEmailVerified}>
                {isAnalyzing ? "Analyzing..." : <><Sparkles className="mr-2" />Analyze & Get Suggestions</>}
              </Button>
              <p className="text-xs text-muted-foreground mt-2">
                Let our AI analyze the job and provide tailored suggestions for template, strategy, and word count.
              </p>
            </>
          )}
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
  );
}
