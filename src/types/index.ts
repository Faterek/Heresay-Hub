// Shared types for the application

export interface Speaker {
  id: number;
  name: string;
  createdAt?: Date;
  createdById?: string;
}

export interface QuoteSpeaker {
  id: number;
  quoteId: number;
  speakerId: number;
  createdAt: Date;
  speaker: Speaker;
}

export interface User {
  id?: string;
  name: string | null;
  email?: string;
  role?: string;
}

export interface Quote {
  id: number;
  content: string;
  context?: string | null;
  quoteDate?: string | null;
  quoteDatePrecision?: string | null;
  submittedById: string;
  createdAt: Date;
  updatedAt?: Date | null;
  // New multiple speakers support - flexible to handle different API responses
  quoteSpeakers?: QuoteSpeaker[];
  speakers?: Speaker[];
  submittedBy?: User;
  // For backward compatibility in some contexts
  votes?: QuoteVote[];
}

export interface QuoteVote {
  id: number;
  quoteId: number;
  userId: string;
  voteType: "upvote" | "downvote";
  createdAt: Date;
}

// Helper type for quotes with speakers populated
export interface QuoteWithSpeakers extends Quote {
  speakers: Speaker[];
}

// Helper type for creating new quotes
export interface CreateQuoteInput {
  content: string;
  context?: string;
  quoteDate?: string;
  quoteDatePrecision?: string;
  speakerIds: number[];
}

// Helper type for updating quotes
export interface UpdateQuoteInput {
  id: number;
  content?: string;
  context?: string;
  quoteDate?: string;
  quoteDatePrecision?: string;
  speakerIds?: number[];
}
