
'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, Wand2 } from 'lucide-react';
import { improveProposalAction } from '@/app/lib/actions';
import { useToast } from '@/hooks/use-toast';

interface SelectionToolbarProps {
  position: { top: number; left: number; width: number };
  selectedText: string;
  onImprovement: (improvedText: string) => void;
  onClose: () => void;
  usageCount: number;
  usageLimit: number;
}

export function SelectionToolbar({ position, selectedText, onImprovement, onClose, usageCount, usageLimit }: SelectionToolbarProps) {
  const [instruction, setInstruction] = useState('');
  const [isImproving, setIsImproving] = useState(false);
  const [processingPreset, setProcessingPreset] = useState<string | null>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  
  const isLimitReached = usageCount >= usageLimit;

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (toolbarRef.current && !toolbarRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [onClose]);

  const handleImprovement = async (prompt: string, preset: string | null = null) => {
    if (!prompt || isLimitReached) {
        if(isLimitReached) {
            toast({
                title: "Improvement Limit Reached",
                description: `You can only use the inline improvement ${usageLimit} times per proposal.`,
                variant: "destructive"
            });
        }
        return;
    };

    setIsImproving(true);
    if (preset) {
        setProcessingPreset(preset);
    }
    
    try {
      const result = await improveProposalAction({
        proposal: selectedText,
        instruction: prompt,
      });

      if (result.error) {
        toast({ title: 'Error', description: result.error, variant: 'destructive'});
      } else if (result.data) {
        onImprovement(result.data.improvedProposal);
      }
    } catch (e: any) {
       toast({ title: 'Error', description: e.message || 'An unexpected error occurred.', variant: 'destructive'});
    } finally {
      setIsImproving(false);
      setProcessingPreset(null);
      onClose();
    }
  };
  
  const presetInstructions = ["Make it more concise", "Make it more detailed", "Make it more professional", "Make it more informal"];

  return (
    <div
      ref={toolbarRef}
      data-selection-toolbar="true"
      className="absolute z-10 w-80 rounded-lg border bg-popover text-popover-foreground shadow-lg p-4"
      style={{ top: position.top, left: position.left }}
    >
        {isLimitReached ? (
            <p className="text-sm text-destructive-foreground text-center bg-destructive/80 p-2 rounded-md">Improvement limit reached.</p>
        ) : (
            <>
                <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">🧐</span>
                    <p className="text-sm font-medium text-popover-foreground">Ask Genie to make selected part... ({usageCount}/{usageLimit})</p>
                </div>
                <div className="flex flex-nowrap gap-2 mb-3">
                    {presetInstructions.map(preset => (
                        <Button 
                            key={preset}
                            size="sm"
                            variant="secondary"
                            className="flex-auto capitalize"
                            onClick={() => handleImprovement(preset, preset)}
                            disabled={isImproving}
                        >
                            {isImproving && processingPreset === preset ? <Loader2 className="h-4 w-4 animate-spin"/> : preset.split(' ').pop()}
                        </Button>
                    ))}
                </div>
                <div className="relative mb-3">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-popover px-2 text-muted-foreground">Or</span>
                    </div>
                </div>
                <div className="flex w-full items-center gap-2">
                    <Input
                        placeholder="Type how to improve..."
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleImprovement(instruction)}
                        disabled={isImproving}
                    />
                    <Button onClick={() => handleImprovement(instruction)} disabled={isImproving || !instruction.trim()}>
                        {isImproving && !processingPreset ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Improve'}
                    </Button>
                </div>
            </>
        )}
    </div>
  );
}
