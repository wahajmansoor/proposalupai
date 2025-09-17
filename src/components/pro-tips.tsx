import { Lightbulb, Video, Phone, ShieldCheck, CreditCard, Star, TrendingUp, Sparkles, Target, MessageCircle, FileText, CalendarCheck, PocketKnife } from 'lucide-react';

const tips = [
  {
    icon: Sparkles,
    title: 'Hook with a Strong First Line',
    text: 'Start by addressing the client’s exact need. Show you’ve read their job post and understand the problem.',
  },
  {
    icon: Video,
    title: 'Use Loom Videos if You’re New',
    text: 'A short, personal video introduction builds instant trust and helps you stand out.',
  },
  {
    icon: Target,
    title: 'Target Low-Proposal Projects',
    text: 'Focus on jobs with fewer than 10 proposals to increase visibility and response rates.',
  },
  {
    icon: CreditCard,
    title: 'Check Client’s Payment & Rating',
    text: 'Work with verified clients who have good reviews. It reduces risk and ensures you’ll get paid.',
  },
  {
    icon: FileText,
    title: 'Keep Proposals Short & Client-Focused',
    text: 'Stick to 150–200 words. Talk about their problem and how you’ll solve it, not just about yourself.',
  },
  {
    icon: PocketKnife,
    title: 'Offer Quick Insights or Mini-Solutions',
    text: 'Share a small idea or suggested approach to prove expertise. It builds credibility fast.',
  },
  {
    icon: ShieldCheck,
    title: 'Don’t Waste Connects',
    text: 'Apply only when you’re confident you’re a good fit. Quality beats quantity on Upwork.',
  },
  {
    icon: Phone,
    title: 'Your Focus is to get them on a Call',
    text: 'The proposal’s main goal is not to explain everything—it’s to start a conversation and book a call.',
  },
  {
    icon: CalendarCheck,
    title: 'Structure your Calls Smartly',
    text: 'When you land a call, prepare an agenda: project goals, your approach, timeline, and next steps.',
  },
];

export function ProTips() {
  return (
    <div className="w-full">
      <div className="mb-6 flex items-center gap-4">
        <div className="bg-primary/10 p-3 rounded-full">
            <Lightbulb className="h-8 w-8 text-primary" />
        </div>
        <div>
            <h2 className="text-2xl font-bold tracking-tight">Pro Tips</h2>
            <p className="text-muted-foreground">for Winning Projects</p>
        </div>
      </div>
      <div className="space-y-4">
        {tips.map((tip, index) => (
          <div key={index} className="flex items-start gap-3">
            <div className="bg-primary/10 p-2 rounded-full mt-1">
              <tip.icon className="h-4 w-4 text-primary shrink-0" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">{tip.title}</h4>
              <p className="text-xs text-muted-foreground">{tip.text}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
