import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Settings, Rocket } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Step4Review({
  includeGreeting,
  setIncludeGreeting,
  greeting,
  setGreeting,
  greetings,
  includeClosingCta,
  setIncludeClosingCta,
  closingCta,
  setClosingCta,
  closingCtas,
  includeSignOff,
  setIncludeSignOff,
  closingCta2,
  setClosingCta2,
  signOffCtas,
  tone,
  setTone,
  tones,
  wordLimit,
  setWordLimit,
  suggestion,
  openingStrategy,
  setOpeningStrategy,
  openingStrategies,
  proposalTemplate,
  strategySuggestionReasoning,
}: any) {
  return (
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
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="toggle-greeting">Greeting</Label>
              <Switch
                id="toggle-greeting"
                checked={includeGreeting}
                onCheckedChange={setIncludeGreeting}
              />
            </div>
            <Select value={greeting} onValueChange={setGreeting} disabled={!includeGreeting}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {greetings.map((g: any) => (
                  <SelectItem key={g.value} value={g.value}>{g.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="toggle-closing-cta">Closing CTA</Label>
              <Switch
                id="toggle-closing-cta"
                checked={includeClosingCta}
                onCheckedChange={setIncludeClosingCta}
              />
            </div>
            <Select value={closingCta} onValueChange={setClosingCta} disabled={!includeClosingCta}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {closingCtas.map((c: any) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="toggle-sign-off">Sign-off (Optional)</Label>
              <Switch
                id="toggle-sign-off"
                checked={includeSignOff}
                onCheckedChange={setIncludeSignOff}
              />
            </div>
            <Select value={closingCta2} onValueChange={setClosingCta2} disabled={!includeSignOff}>
              <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {signOffCtas.map((c: any) => (
                  <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Tone</Label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {tones.map((t: string) => (
                  <SelectItem key={t} value={t}>{t}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="md:col-span-2">
            <div className="flex justify-between items-center mb-2">
              <Label>Word Limit (Optional)</Label>
              <span className="text-sm font-medium text-muted-foreground">{wordLimit[0]} - {wordLimit[1]} words</span>
            </div>
            <Slider
              value={wordLimit}
              onValueChange={setWordLimit}
              min={50}
              max={500}
              step={10}
            />
            {suggestion?.wordLimitReasoning && (
              <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-800 rounded-r-lg text-sm">
                <p><span className="font-bold">AI Suggestion: </span>For this project, a range of {suggestion.wordLimit[0]} - {suggestion.wordLimit[1]} words is ideal. {suggestion.wordLimitReasoning}</p>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Rocket className="h-5 w-5 text-primary" />
            <CardTitle className="text-lg">Opening Strategy</CardTitle>
          </div>
          <CardDescription>Choose a proven opening approach, or leave it as "None", AI will customize it for you.</CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={openingStrategy} onValueChange={setOpeningStrategy} className="space-y-2" disabled={proposalTemplate === 'video'}>
            {openingStrategies.map((strategy: any) => (
              <Label key={strategy.id} htmlFor={`strategy-${strategy.id}`} className={cn("flex items-start gap-3 rounded-lg border p-3 cursor-pointer transition-all", openingStrategy === strategy.id && "border-primary ring-2 ring-primary", (proposalTemplate === 'video' && strategy.id !== 'video') && "opacity-50 cursor-not-allowed")}>
                <RadioGroupItem value={strategy.id} id={`strategy-${strategy.id}`} className="mt-1" disabled={proposalTemplate === 'video' && strategy.id !== 'video'} />
                <div className="grid gap-1.5">
                  <span className="font-semibold">{strategy.title}</span>
                  <span className="text-sm text-muted-foreground">{strategy.description}</span>
                </div>
              </Label>
            ))}
          </RadioGroup>
          {strategySuggestionReasoning && openingStrategy !== 'none' && (
            <div className="mt-4 p-3 bg-green-50 border-l-4 border-green-400 text-green-800 rounded-r-lg">
              <p><span className="font-bold">AI Suggestion: </span>{strategySuggestionReasoning}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
