import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Bot, Plus, Trash2, Sparkles } from 'lucide-react';

export function Step3Questions({
  clientQuestions,
  handleClientQuestionChange,
  answersGenerated,
  removeClientQuestion,
  addClientQuestion,
  handleAnswerAllQuestions,
  isAnsweringQuestions,
  hasQuestions,
}: any) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Client Questions</CardTitle>
        </div>
        <CardDescription>If the job posting asks specific questions, add them here and get AI-powered answers.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {clientQuestions.map((q: any, index: number) => (
          <div key={q.id} className="space-y-2">
            <div className="flex items-start gap-2">
              <Textarea
                placeholder={`Question ${index + 1}`}
                value={q.question}
                onChange={(e) => handleClientQuestionChange(q.id, 'question', e.target.value)}
                className="flex-1"
                disabled={answersGenerated}
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => removeClientQuestion(q.id)}
                className="text-muted-foreground hover:text-destructive h-8 w-8 self-center"
                disabled={answersGenerated}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={addClientQuestion} disabled={answersGenerated}><Plus className="mr-2 h-4 w-4" /> Add Question</Button>
          <Button variant="outline" size="sm" onClick={handleAnswerAllQuestions} disabled={isAnsweringQuestions || !hasQuestions || answersGenerated}>
            {isAnsweringQuestions ? 'Answering...' : <><Sparkles className="mr-2 h-4 w-4" /> Get All Answers</>}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
