import { HugeiconsIcon } from '@hugeicons/react';
import { BulbIcon, AiBrain01Icon, ComputerVideoCallIcon, Target01Icon, CreditCardIcon, File01Icon, ZapIcon, AnonymousIcon, Suit01Icon, ChatQuestion01Icon } from "@hugeicons/core-free-icons";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";

const tips = [
  {
    icon: () => <HugeiconsIcon icon={AiBrain01Icon} size={24} className="h-5 w-5 text-primary shrink-0" />,
    title: 'Hook with a Strong First Line',
    text: 'Start with a personalized opener that shows you understand the client’s exact need.',
  },
  {
    icon: () => <HugeiconsIcon icon={ComputerVideoCallIcon} size={24} className="h-5 w-5 text-primary shrink-0" />,
    title: 'Use a Short Loom Video',
    text: 'Add a 30–60 sec intro video to build trust and make your proposal stand out.',
  },
  {
    icon: () => <HugeiconsIcon icon={Target01Icon} size={24} className="h-5 w-5 text-primary shrink-0" />,
    title: 'Target Low-Proposal Projects',
    text: 'Apply to jobs with fewer than 10 proposals to boost visibility and response chances.',
  },
  {
    icon: () => <HugeiconsIcon icon={CreditCardIcon} size={24} className="h-5 w-5 text-primary shrink-0" />,
    title: 'Check Client’s Payment & Rating',
    text: 'Work only with verified, well-rated clients to stay safe and ensure timely payment.',
  },
  {
    icon: () => <HugeiconsIcon icon={File01Icon} size={24} className="h-5 w-5 text-primary shrink-0" />,
    title: 'Keep Proposals Short & Client-Focused',
    text: 'Limit to 150–200 words, talk about their problem and how you’ll solve it, not yourself.',
  },
  {
    icon: () => <HugeiconsIcon icon={ZapIcon} size={24} className="h-5 w-5 text-primary shrink-0" />,
    title: 'Offer Quick Insights or Mini-Solutions',
    text: 'Share a small actionable idea to prove your expertise right away.',
  },
  {
    icon: () => <HugeiconsIcon icon={AnonymousIcon} size={24} className="h-5 w-5 text-primary shrink-0" />,
    title: 'Don’t Waste Connects',
    text: 'Apply only to projects that fit your skills, quality beats quantity every time.',
  },
  {
    icon: () => <HugeiconsIcon icon={Suit01Icon} size={24} className="h-5 w-5 text-primary shrink-0" />,
    title: 'Optimize your Profile for Conversion',
    text: 'Make your profile instantly convincing with a clear headline, solid samples, and social proof.',
  },
  {
    icon: () => <HugeiconsIcon icon={ChatQuestion01Icon} size={24} className="h-5 w-5 text-primary shrink-0" />,
    title: 'Ask Smart, Simple Questions',
    text: 'End your proposal with one thoughtful question that invites a reply and shows engagement.',
  },
];

export function ProTips({ className }: { className?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className={className || "flex items-center gap-2 px-4 py-2 bg-button-gradient border border-slate-200 dark:border-slate-800 rounded-full shadow-lg hover:opacity-90 transition-all text-xs font-semibold text-white"}>
          <HugeiconsIcon icon={BulbIcon} size={16} className="h-4 w-4" />
          Pro Tips
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-foreground">Winning Pro Tips</DialogTitle>
          <DialogDescription className="text-muted-foreground">
            Boost your proposal success rate with these expert strategies.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[70vh] pr-4">
          <div className="space-y-6">
            {tips.map((tip, index) => (
              <div key={index} className="flex items-start gap-3">
                <div className="bg-primary/10 p-2 rounded-full mt-1">
                  <tip.icon />
                </div>
                <div>
                  <h4 className="font-semibold text-lg">{tip.title}</h4>
                  <p className="text-sm text-muted-foreground">{tip.text}</p>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
