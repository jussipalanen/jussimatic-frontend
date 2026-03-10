export interface ChatImage {
  dataUri: string;
}

export interface ChatMessage {
  id: number;
  text: string;
  isUser: boolean;
  createdAt?: number;
  images?: ChatImage[];
}

export type OutputPart = { text?: string; type?: string };
