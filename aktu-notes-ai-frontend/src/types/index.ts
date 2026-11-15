export interface User {
  id: string;
  full_name: string;
  email: string;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  user: User;
}

export interface RegisterPayload {
  full_name: string;
  email: string;
  password: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface ChangePasswordPayload {
  current_password: string;
  new_password: string;
}

export interface ForgotPasswordPayload {
  email: string;
}

export interface ResetPasswordPayload {
  token: string;
  new_password: string;
}

export type DocumentStatus = "pending" | "processing" | "completed" | "failed";

export interface DocumentItem {
  id: string;
  original_filename: string;
  file_size: number;
  page_count: number;
  chunk_count: number;
  status: DocumentStatus;
  error_message?: string | null;
  created_at: string;
  processed_at?: string | null;
}

export interface DocumentUploadResponse {
  id: string;
  original_filename: string;
  status: DocumentStatus;
  message: string;
  created_at: string;
}

export interface DocumentListResponse {
  items: DocumentItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface CitationItem {
  document_id: string;
  filename: string;
  page_number: number;
  chunk_id: string;
}

export interface AskQuestionPayload {
  question: string;
  document_ids: string[];
  conversation_id?: string | null;
}

export interface AskQuestionResponse {
  conversation_id: string;
  message_id: string;
  answer: string;
  citations: CitationItem[];
  grounded: boolean;
}

export interface MessageItem {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  citations?: CitationItem[] | null;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  title: string;
  document_ids?: string[];
  created_at: string;
  updated_at: string;
  message_count?: number;
}

export interface ConversationDetailResponse {
  id: string;
  title: string;
  document_ids: string[];
  created_at: string;
  updated_at: string;
  messages: MessageItem[];
}

