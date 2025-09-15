import { Lightbulb } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface ProTipProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

export function ProTip({ title = 'Pro Tip', children, className }: ProTipProps) {
  return (
    <div className={cn('rounded-lg border border-yellow-300 bg-yellow-50 text-yellow-900 p-4', className)}>
      <div className="flex items-start gap-3">
        <Lightbulb className="h-5 w-5 mt-0.5 text-yellow-500 flex-shrink-0" />
        <div>
          <h4 className="font-semibold">{title}</h4>
          <div className="text-sm mt-1">{children}</div>
        </div>
      </div>
    </div>
  );
}
