
export interface JobAnalysis {
    keyRequirements: string[];
    themes: string[];
  }
  
  export interface ClientQuestion {
    id: number;
    question: string;
    answer: string;
  }

  export interface SkillProfile {
    id: string;
    title: string;
    description: string;
    experience: number;
    keywords: string[];
    links: string[];
    tone: string;
    length: string;
    createdAt: string;
  }

  export interface SavedProposal {
    id: string;
    title: string;
    content: string;
    createdAt: string;
  }

