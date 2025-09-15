export interface JobAnalysis {
    keyRequirements: string[];
    themes: string[];
  }
  
  export interface ClientQuestion {
    id: number;
    question: string;
    answer: string;
  }

  export interface PortfolioCollection {
    id: string;
    name: string;
    links: string[];
  }
