import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { User, Sparkles, X, Trash2, Link as LinkIcon } from 'lucide-react';
import Link from 'next/link';

export function Step2Profile({
  selectedProfile,
  setSelectedProfile,
  skillProfiles,
  clientName,
  handleInputChange,
  setClientName,
  skillsAndExpertise,
  setSkillsAndExpertise,
  handleAutofillSkills,
  isSuggestingSkills,
  removeSkillTag,
  relevantExperience,
  setRelevantExperience,
  profileLinks,
  removeProfileLink,
  manualLinkInput,
  setManualLinkInput,
  handleManualLinkKeyDown,
  manualLinks,
  removeManualLink,
}: any) {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Your Profile</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 md:space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="skillProfile">Skill Profile</Label>
            <Select value={selectedProfile} onValueChange={setSelectedProfile}>
              <SelectTrigger>
                <SelectValue placeholder="Select a profile" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None (Use manual inputs)</SelectItem>
                {skillProfiles.map((profile: any) => (
                  <SelectItem key={profile.id} value={profile.id}>
                    {profile.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-2">
              Manage your profiles on the <Link href="/skill-profiles" className="underline">Skill Profiles page</Link>.
            </p>
          </div>
          <div>
            <Label htmlFor="clientName">Client's Name (Optional)</Label>
            <Input id="clientName" value={clientName} onChange={handleInputChange(setClientName)} placeholder="Client's name (if known)" />
          </div>
        </div>
        <div>
          <div className="flex justify-between items-center mb-1">
            <Label htmlFor="skillsAndExpertise">Skills & Expertise Tags</Label>
            <Button variant="outline" size="sm" onClick={handleAutofillSkills} disabled={isSuggestingSkills}>
              {isSuggestingSkills ? 'Thinking...' : <><Sparkles className="mr-2 h-4 w-4" /> AI Suggest Skills</>}
            </Button>
          </div>
          <Input id="skillsAndExpertise" value={skillsAndExpertise} onChange={handleInputChange(setSkillsAndExpertise)} placeholder="Select a profile or enter skills manually" />
          {skillsAndExpertise.trim() && (
            <div className="mt-2 flex flex-wrap gap-2">
              {skillsAndExpertise.split(',').map((skill: string) => skill.trim()).filter(Boolean).map((skill: string, index: number) => (
                <Badge key={index} variant="secondary" className="font-normal gap-1">
                  {skill}
                  <button type="button" onClick={() => removeSkillTag(skill)} className="rounded-full hover:bg-black/10"><X className="h-3 w-3" /></button>
                </Badge>
              ))}
            </div>
          )}
        </div>
        <div>
          <Label htmlFor="relevantExperience">Relevant Experience</Label>
          <Textarea id="relevantExperience" value={relevantExperience} onChange={handleInputChange(setRelevantExperience)} placeholder="Briefly describe 1-2 past successes or experiences that are highly relevant to this specific job." />
        </div>
        <div className="space-y-4">
          <Label>Portfolio / Relevant Links</Label>
          {selectedProfile !== 'none' && profileLinks.length > 0 && (
            <div>
              <Label className="text-xs text-muted-foreground">From Skill Profile</Label>
              <div className="space-y-1 mt-1">
                {profileLinks.map((link: any, index: number) => (
                  <div key={`profile-link-${index}`} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted group">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium group-hover:underline text-primary truncate flex-1">{link.url}</span>
                    </a>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeProfileLink(index)} className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
          <div>
            <Label htmlFor="manualLinks" className="text-xs text-muted-foreground">Manual Links</Label>
            <Input
              id="manualLinks"
              value={manualLinkInput}
              onChange={(e) => setManualLinkInput(e.target.value)}
              onKeyDown={handleManualLinkKeyDown}
              placeholder="Enter a URL and press Enter..."
              type="url"
            />
            {manualLinks.length > 0 && (
              <div className="mt-2 flex flex-col gap-1">
                {manualLinks.map((link: any, index: number) => (
                  <div key={`manual-link-${index}`} className="flex items-center gap-2 text-sm p-2 rounded-md hover:bg-muted group">
                    <a href={link.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 flex-1 min-w-0">
                      <LinkIcon className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium group-hover:underline text-primary truncate">{link.url}</span>
                    </a>
                    <Button type="button" variant="ghost" size="icon" onClick={() => removeManualLink(index)} className="shrink-0 h-8 w-8 text-muted-foreground hover:text-destructive">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
