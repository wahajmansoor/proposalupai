export interface JobAnalysis {
    keyRequirements: string[];
    themes: string[];
  }
  
  export interface ClientQuestion {
    id: number;
    question: string;
    answer: string;
  }
  
  export interface PortfolioCategory {
    id: string;
    name: string;
    userId: string;
  }

  export interface PortfolioItem {
    id: string;
    url: string;
    description: string;
    categoryId: string;
    userId: string;
  }
  