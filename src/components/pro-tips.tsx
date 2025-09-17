import { Lightbulb, Video, Phone, Zap, ShieldCheck, CreditCard, Star, TrendingUp, Sparkles, Target, MessageCircle, FileText, CalendarCheck, PocketKnife } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

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
    title: 'Your Focus Is to Get Them on a Call',
    text: 'The proposal’s main goal is not to explain everything—it’s to start a conversation and book a call.',
  },
  {
    icon: CalendarCheck,
    title: 'Structure Your Calls Smartly',
    text: 'When you land a call, prepare an agenda: project goals, your approach, timeline, and next steps.',
  },
];

export function ProTips() {
  return (
    <Card className="bg-transparent border-0 shadow-none">
      <CardHeader className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
            <Lightbulb className="h-6 w-6 text-primary" />
            <CardTitle className="text-2xl font-bold">Pro Tips for Winning Projects on Upwork</CardTitle>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tips.map((tip, index) => (
            <Card key={index} className="border-green-200 hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                    <div className="flex items-start gap-4">
                        <div className="bg-primary/10 p-2 rounded-full">
                            <tip.icon className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                            <h4 className="font-semibold text-md mb-1">{tip.title}</h4>
                            <p className="text-sm text-muted-foreground">{tip.text}</p>
                        </div>
                    </div>
                </CardContent>
            </Card>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
