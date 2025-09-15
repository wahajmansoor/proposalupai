import { Lightbulb, Video, Phone, Zap, ShieldCheck, CreditCard, Star } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const tips = [
  {
    icon: Video,
    title: 'Use Loom videos if you are new',
    text: 'A quick, personal video can make a great first impression and help you stand out.',
  },
  {
    icon: Phone,
    title: 'Your focus is to get them on a call',
    text: 'The main goal of your proposal is to start a conversation. Aim to schedule a call.',
  },
  {
    icon: Zap,
    title: 'Structuring your calls is essential',
    text: 'Plan your call agenda to cover project goals, your approach, and next steps.',
  },
  {
    icon: ShieldCheck,
    title: 'Don\'t waste your connects',
    text: 'Make sure your proposal is a good fit for the job before submitting to save your connects.',
  },
  {
    icon: CreditCard,
    title: 'Check for verified payment',
    text: 'Prioritize clients with a verified payment method to ensure you get paid for your work.',
  },
  {
    icon: Star,
    title: 'Review client\'s rating',
    text: 'Check the client\'s history and feedback from other freelancers to avoid potential issues.',
  },
];

export function ProTips() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lightbulb className="h-6 w-6 text-primary" />
          <span>Pro Tips</span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="space-y-4">
          {tips.map((tip, index) => (
            <li key={index} className="flex items-start gap-3">
              <tip.icon className="h-5 w-5 mt-0.5 text-primary flex-shrink-0" />
              <div>
                <h4 className="font-semibold">{tip.title}</h4>
                <p className="text-sm text-muted-foreground">{tip.text}</p>
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
