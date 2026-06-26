import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PortfolioLink {
  url: string;
}

interface ClientQuestion {
  id: number;
  question: string;
  answer: string;
}

interface Suggestion {
  template: 'standard' | 'video';
  templateReasoning: string;
  wordLimit: number[];
  wordLimitReasoning: string;
  strategyId: string;
  strategyReasoning: string;
  skillTags?: string[];
}

interface ProposalState {
  currentStep: number;
  setCurrentStep: (step: number) => void;

  projectDetails: { projectTitle: string; summary: string };
  setProjectDetails: (details: { projectTitle: string; summary: string }) => void;

  proposalTemplate: 'standard' | 'video';
  setProposalTemplate: (template: 'standard' | 'video') => void;

  openingStrategy: string;
  setOpeningStrategy: (strategy: string) => void;

  strategySuggestionReasoning: string;
  setStrategySuggestionReasoning: (reasoning: string) => void;

  suggestion: Suggestion | null;
  setSuggestion: (suggestion: Suggestion | null) => void;

  clientName: string;
  setClientName: (name: string) => void;

  skillsAndExpertise: string;
  setSkillsAndExpertise: (skills: string) => void;

  relevantExperience: string;
  setRelevantExperience: (exp: string) => void;

  selectedProfile: string;
  setSelectedProfile: (profile: string) => void;

  profileLinks: PortfolioLink[];
  setProfileLinks: (links: PortfolioLink[]) => void;

  manualLinks: PortfolioLink[];
  setManualLinks: (links: PortfolioLink[]) => void;

  greeting: string;
  setGreeting: (greeting: string) => void;

  includeGreeting: boolean;
  setIncludeGreeting: (include: boolean) => void;

  closingCta: string;
  setClosingCta: (cta: string) => void;

  includeClosingCta: boolean;
  setIncludeClosingCta: (include: boolean) => void;

  closingCta2: string;
  setClosingCta2: (cta: string) => void;

  includeSignOff: boolean;
  setIncludeSignOff: (include: boolean) => void;

  tone: string;
  setTone: (tone: string) => void;

  wordLimit: number[];
  setWordLimit: (limit: number[]) => void;

  clientQuestions: ClientQuestion[];
  setClientQuestions: (questions: ClientQuestion[]) => void;
  
  generatedProposal: string;
  setGeneratedProposal: (proposal: string) => void;
  
  improvements: string[];
  setImprovements: (improvements: string[]) => void;
  
  clearStore: () => void;
}

export const useProposalStore = create<ProposalState>()(
  persist(
    (set) => ({
      currentStep: 1,
      setCurrentStep: (step) => set({ currentStep: step }),

      projectDetails: { projectTitle: '', summary: '' },
      setProjectDetails: (details) => set({ projectDetails: details }),

      proposalTemplate: 'standard',
      setProposalTemplate: (template) => set({ proposalTemplate: template }),

      openingStrategy: 'none',
      setOpeningStrategy: (strategy) => set({ openingStrategy: strategy }),

      strategySuggestionReasoning: '',
      setStrategySuggestionReasoning: (reasoning) => set({ strategySuggestionReasoning: reasoning }),

      suggestion: null,
      setSuggestion: (suggestion) => set({ suggestion }),

      clientName: '',
      setClientName: (name) => set({ clientName: name }),

      skillsAndExpertise: '',
      setSkillsAndExpertise: (skills) => set({ skillsAndExpertise: skills }),

      relevantExperience: '',
      setRelevantExperience: (exp) => set({ relevantExperience: exp }),

      selectedProfile: 'none',
      setSelectedProfile: (profile) => set({ selectedProfile: profile }),

      profileLinks: [],
      setProfileLinks: (links) => set({ profileLinks: links }),

      manualLinks: [],
      setManualLinks: (links) => set({ manualLinks: links }),

      greeting: 'hi',
      setGreeting: (greeting) => set({ greeting }),

      includeGreeting: false,
      setIncludeGreeting: (include) => set({ includeGreeting: include }),

      closingCta: 'looking-forward',
      setClosingCta: (cta) => set({ closingCta: cta }),

      includeClosingCta: false,
      setIncludeClosingCta: (include) => set({ includeClosingCta: include }),

      closingCta2: 'best-regards',
      setClosingCta2: (cta) => set({ closingCta2: cta }),

      includeSignOff: true,
      setIncludeSignOff: (include) => set({ includeSignOff: include }),

      tone: 'Professional',
      setTone: (tone) => set({ tone }),

      wordLimit: [50, 120],
      setWordLimit: (limit) => set({ wordLimit: limit }),

      clientQuestions: [{ id: 1, question: '', answer: '' }],
      setClientQuestions: (questions) => set({ clientQuestions: questions }),
      
      generatedProposal: '',
      setGeneratedProposal: (proposal) => set({ generatedProposal: proposal }),
      
      improvements: [],
      setImprovements: (improvements) => set({ improvements }),

      clearStore: () => set({
        currentStep: 1,
        projectDetails: { projectTitle: '', summary: '' },
        proposalTemplate: 'standard',
        openingStrategy: 'none',
        strategySuggestionReasoning: '',
        suggestion: null,
        clientName: '',
        skillsAndExpertise: '',
        relevantExperience: '',
        selectedProfile: 'none',
        profileLinks: [],
        manualLinks: [],
        greeting: 'hi',
        includeGreeting: false,
        closingCta: 'looking-forward',
        includeClosingCta: false,
        closingCta2: 'best-regards',
        includeSignOff: true,
        tone: 'Professional',
        wordLimit: [50, 120],
        clientQuestions: [{ id: 1, question: '', answer: '' }],
        generatedProposal: '',
        improvements: []
      })
    }),
    {
      name: 'proposal-storage', // name of item in the storage (must be unique)
      partialize: (state) => ({ 
        projectDetails: state.projectDetails,
        proposalTemplate: state.proposalTemplate,
        openingStrategy: state.openingStrategy,
        clientName: state.clientName,
        skillsAndExpertise: state.skillsAndExpertise,
        relevantExperience: state.relevantExperience,
        selectedProfile: state.selectedProfile,
        profileLinks: state.profileLinks,
        manualLinks: state.manualLinks,
        greeting: state.greeting,
        includeGreeting: state.includeGreeting,
        closingCta: state.closingCta,
        includeClosingCta: state.includeClosingCta,
        closingCta2: state.closingCta2,
        includeSignOff: state.includeSignOff,
        tone: state.tone,
        wordLimit: state.wordLimit,
        clientQuestions: state.clientQuestions,
        generatedProposal: state.generatedProposal,
        improvements: state.improvements,
        currentStep: state.currentStep
      })
    }
  )
);
