import {
  AskQuestionPayload,
  AskQuestionResponse,
  ChangePasswordPayload,
  ConversationDetailResponse,
  ConversationItem,
  DocumentItem,
  DocumentListResponse,
  DocumentUploadResponse,
  ForgotPasswordPayload,
  LoginPayload,
  RegisterPayload,
  ResetPasswordPayload,
  TokenResponse,
  User,
} from "@/types";

const RAW_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "https://mini-project-jxgk.onrender.com";
export const API_BASE_URL = RAW_BASE_URL.replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

// Token storage helpers
const ACCESS_TOKEN_KEY = "aktu_notes_access_token";
const REFRESH_TOKEN_KEY = "aktu_notes_refresh_token";

export const getStoredAccessToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACCESS_TOKEN_KEY);
};

export const getStoredRefreshToken = (): string | null => {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_KEY);
};

export const setStoredTokens = (accessToken: string, refreshToken: string) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

export const clearStoredTokens = () => {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
};

// Generic fetch wrapper with automatic token injection and 401 refresh
async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {},
  isRetry = false
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? "" : "/"}${endpoint}`;
  const headers = new Headers(options.headers || {});

  const token = getStoredAccessToken();
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  // Set default JSON Content-Type if not sending FormData
  if (!(options.body instanceof FormData) && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  // Handle 401 Unauthorized -> Attempt refresh token rotation
  if (response.status === 401 && !isRetry && !endpoint.includes("/auth/")) {
    const refreshToken = getStoredRefreshToken();
    if (refreshToken) {
      try {
        const refreshResponse = await fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (refreshResponse.ok) {
          const tokenData: TokenResponse = await refreshResponse.json();
          setStoredTokens(tokenData.access_token, tokenData.refresh_token);
          // Retry original request with newly acquired access token
          return apiFetch<T>(endpoint, options, true);
        } else {
          clearStoredTokens();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("aktu:auth-expired"));
          }
        }
      } catch (e) {
        clearStoredTokens();
      }
    }
  }

  if (!response.ok) {
    let errorDetail = "An unexpected error occurred.";
    let errorData = null;
    try {
      errorData = await response.json();
      if (typeof errorData?.detail === "string") {
        errorDetail = errorData.detail;
      } else if (Array.isArray(errorData?.detail)) {
        errorDetail = errorData.detail.map((d: any) => d.msg || d.message).join(", ");
      } else if (errorData?.message) {
        errorDetail = errorData.message;
      }
    } catch {
      errorDetail = response.statusText || errorDetail;
    }
    throw new ApiError(errorDetail, response.status, errorData);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

export const api = {
  // Authentication
  auth: {
    register: (payload: RegisterPayload) =>
      apiFetch<TokenResponse>("/api/v1/auth/register", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    login: (payload: LoginPayload) =>
      apiFetch<TokenResponse>("/api/v1/auth/login", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    logout: (refreshToken?: string) =>
      apiFetch<{ message: string }>("/api/v1/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken || getStoredRefreshToken() }),
      }),

    changePassword: (payload: ChangePasswordPayload) =>
      apiFetch<{ message: string }>("/api/v1/auth/change-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    forgotPassword: (payload: ForgotPasswordPayload) =>
      apiFetch<{ message: string }>("/api/v1/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    resetPassword: (payload: ResetPasswordPayload) =>
      apiFetch<{ message: string }>("/api/v1/auth/reset-password", {
        method: "POST",
        body: JSON.stringify(payload),
      }),
  },

  // Users
  users: {
    getMe: () => apiFetch<User>("/api/v1/users/me"),
    updateMe: (data: { full_name?: string }) =>
      apiFetch<User>("/api/v1/users/me", {
        method: "PATCH",
        body: JSON.stringify(data),
      }),
  },

  // Documents
  documents: {
    upload: (file: File) => {
      const formData = new FormData();
      formData.append("file", file);
      return apiFetch<DocumentUploadResponse>("/api/v1/documents", {
        method: "POST",
        body: formData,
      });
    },

    list: (skip = 0, limit = 50, status?: string) => {
      const params = new URLSearchParams({
        skip: skip.toString(),
        limit: limit.toString(),
      });
      if (status) params.append("status", status);
      return apiFetch<DocumentListResponse>(`/api/v1/documents?${params.toString()}`);
    },

    get: (documentId: string) =>
      apiFetch<DocumentItem>(`/api/v1/documents/${documentId}`),

    delete: (documentId: string) =>
      apiFetch<void>(`/api/v1/documents/${documentId}`, {
        method: "DELETE",
      }),

    downloadUrl: (documentId: string) =>
      `${API_BASE_URL}/api/v1/documents/${documentId}/download`,
  },

  // Chats & RAG
  chats: {
    ask: (payload: AskQuestionPayload) =>
      apiFetch<AskQuestionResponse>("/api/v1/chats/ask", {
        method: "POST",
        body: JSON.stringify(payload),
      }),

    listConversations: (skip = 0, limit = 50) =>
      apiFetch<ConversationItem[]>(`/api/v1/chats/conversations?skip=${skip}&limit=${limit}`),

    getConversation: (conversationId: string) =>
      apiFetch<ConversationDetailResponse>(`/api/v1/chats/conversations/${conversationId}`),

    deleteConversation: (conversationId: string) =>
      apiFetch<void>(`/api/v1/chats/conversations/${conversationId}`, {
        method: "DELETE",
      }),
  },
};

