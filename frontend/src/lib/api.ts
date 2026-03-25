import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Error interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || error.message || 'An error occurred';
    console.error('API Error:', message);
    return Promise.reject(error);
  }
);

// Types
export interface Team {
  id: number;
  name: string;
  monthlyBudget: number;
  createdAt: string;
  updatedAt: string;
}

export interface ApiKey {
  id: number;
  teamId: number;
  teamName?: string;
  keyPrefix: string;
  status: 'active' | 'revoked' | 'expired';
  allowedModels: string[];
  allowedFeatures: string[];
  monthlyLimitUsd: number;
  createdAt: string;
  revokedAt: string | null;
  apiKey?: string; // Only present on creation
}

export interface UsageLog {
  id: number;
  teamId: number;
  apiKeyId: number;
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  costUsd: number;
  requestPath: string | null;
  responseStatus: number | null;
  createdAt: string;
}

export interface MonthlyUsage {
  teamId: number;
  month: string;
  totalCostUsd: number;
  totalPromptTokens: number;
  totalCompletionTokens: number;
  requestCount: number;
}

export interface FeatureUsage {
  featureType: string;
  totalCostUsd: number;
  requestCount: number;
}

export interface User {
  id: number;
  email: string;
  teamId: number | null;
  teamName: string | null;
  teamMonthlyBudget: number | null;
  role: 'admin' | 'user';
  createdAt: string;
  updatedAt: string;
}

export interface KeyRequest {
  id: number;
  apiKeyId: number;
  requesterId: number;
  requesterEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'revealed';
  approvedBy: number | null;
  approverEmail: string | null;
  approvedAt: string | null;
  revealedAt: string | null;
  createdAt: string;
  keyPrefix: string;
  teamId: number;
  teamName: string;
}

export interface KeyRevealResponse {
  requestId: number;
  apiKey: string;
}

// 키 발급 신청 관련 타입
export interface KeyIssueRequest {
  id: number;
  teamId: number;
  teamName: string;
  requesterId: number;
  requesterEmail: string;
  status: 'pending' | 'approved' | 'rejected' | 'issued';
  allowedFeature: string;
  allowedModels: string[];
  monthlyLimitUsd: number;
  approvedBy: number | null;
  approverEmail: string | null;
  approvedAt: string | null;
  issuedApiKeyId: number | null;
  keyPrefix: string | null;
  revealedAt: string | null;
  createdAt: string;
}

export interface KeyIssueApproveResponse {
  request: KeyIssueRequest;
  apiKey: string;
}

// Teams API
export const teamsApi = {
  getAll: () => api.get<Team[]>('/teams').then(res => res.data),
  getById: (id: number) => api.get<Team>(`/teams/${id}`).then(res => res.data),
  create: (data: { name: string; monthlyBudget: number }) => 
    api.post<Team>('/teams', data).then(res => res.data),
  update: (id: number, data: { name?: string; monthlyBudget?: number }) =>
    api.put<Team>(`/teams/${id}`, data).then(res => res.data),
  delete: (id: number) => api.delete(`/teams/${id}`),
};

// API Keys API
export const apiKeysApi = {
  getAll: () => api.get<ApiKey[]>('/api-keys').then(res => res.data),
  getByTeam: (teamId: number) => 
    api.get<ApiKey[]>(`/api-keys?teamId=${teamId}`).then(res => res.data),
  create: (data: { teamId: number; allowedModels?: string[]; allowedFeatures?: string[]; monthlyLimitUsd?: number }) =>
    api.post<ApiKey>('/api-keys', data).then(res => res.data),
  revoke: (id: number) => 
    api.put<ApiKey>(`/api-keys/${id}/revoke`).then(res => res.data),
  updateModels: (id: number, models: string[]) =>
    api.put<ApiKey>(`/api-keys/${id}/models`, { models }).then(res => res.data),
  updateFeatures: (id: number, features: string[]) =>
    api.put<ApiKey>(`/api-keys/${id}/features`, { features }).then(res => res.data),
};

export interface TeamUsage {
  teamId: number;
  totalCostUsd: number;
}

// Usage API
export const usageApi = {
  getTeamLogs: (teamId: number, limit = 100) =>
    api.get<UsageLog[]>(`/usage/team/${teamId}?limit=${limit}`).then(res => res.data),
  getCurrentMonth: (teamId: number) =>
    api.get<{ teamId: number; currentMonthUsageUsd: number }>(`/usage/team/${teamId}/current-month`).then(res => res.data),
  getCurrentMonthByFeature: (teamId: number) =>
    api.get<FeatureUsage[]>(`/usage/team/${teamId}/current-month/by-feature`).then(res => res.data),
  getMonthlyHistory: (teamId: number, months = 6) =>
    api.get<MonthlyUsage[]>(`/usage/team/${teamId}/monthly?months=${months}`).then(res => res.data),
  getApiKeyUsageByFeature: (apiKeyId: number) =>
    api.get<FeatureUsage[]>(`/usage/api-key/${apiKeyId}/current-month/by-feature`).then(res => res.data),
  // 전체 팀의 이번 달 사용량 (관리자용)
  getAllTeamsCurrentMonth: () =>
    api.get<TeamUsage[]>('/usage/all-teams/current-month').then(res => res.data),
  // 전체 기능별 이번 달 사용량 (관리자용)
  getAllTeamsCurrentMonthByFeature: () =>
    api.get<FeatureUsage[]>('/usage/all-teams/current-month/by-feature').then(res => res.data),
};

// Users API
export const usersApi = {
  getAll: () => api.get<User[]>('/users').then(res => res.data),
  getById: (id: number) => api.get<User>(`/users/${id}`).then(res => res.data),
  getByEmail: (email: string) => 
    api.get<User | null>(`/users/me?email=${encodeURIComponent(email)}`).then(res => res.data),
  getByTeam: (teamId: number) =>
    api.get<User[]>(`/users/team/${teamId}`).then(res => res.data),
  create: (data: { email: string; teamId?: number; role?: 'admin' | 'user' }) =>
    api.post<User>('/users', data).then(res => res.data),
  updateTeam: (id: number, teamId: number | null) =>
    api.put<User>(`/users/${id}/team`, { teamId }).then(res => res.data),
  updateRole: (id: number, role: 'admin' | 'user') =>
    api.put<User>(`/users/${id}/role`, { role }).then(res => res.data),
  delete: (id: number) => api.delete(`/users/${id}`),
};

// Key Requests API (키 조회 요청)
export const keyRequestsApi = {
  // 모든 요청 목록 (관리자용)
  getAll: () => api.get<KeyRequest[]>('/key-requests').then(res => res.data),
  
  // 내 요청 목록
  getMyRequests: (email: string) =>
    api.get<KeyRequest[]>(`/key-requests/my?email=${encodeURIComponent(email)}`).then(res => res.data),
  
  // 키 조회 요청 생성
  create: (apiKeyId: number, email: string) =>
    api.post<KeyRequest>(`/key-requests?email=${encodeURIComponent(email)}`, { apiKeyId }).then(res => res.data),
  
  // 요청 승인 (관리자)
  approve: (requestId: number, adminEmail: string) =>
    api.put<KeyRequest>(`/key-requests/${requestId}/approve?email=${encodeURIComponent(adminEmail)}`).then(res => res.data),
  
  // 요청 거절 (관리자)
  reject: (requestId: number, adminEmail: string) =>
    api.put<KeyRequest>(`/key-requests/${requestId}/reject?email=${encodeURIComponent(adminEmail)}`).then(res => res.data),
  
  // 승인된 요청으로 키 값 확인 (1회성)
  reveal: (requestId: number, email: string) =>
    api.get<KeyRevealResponse>(`/key-requests/${requestId}/reveal?email=${encodeURIComponent(email)}`).then(res => res.data),
};

// Key Issue Requests API (키 발급 신청)
export const keyIssueRequestsApi = {
  // 모든 신청 목록 (관리자용)
  getAll: () => api.get<KeyIssueRequest[]>('/key-issue-requests').then(res => res.data),
  
  // 대기 중인 신청 수 (관리자용)
  getPendingCount: () =>
    api.get<{ count: number }>('/key-issue-requests/pending-count').then(res => res.data.count),
  
  // 내 신청 목록
  getMyRequests: (email: string) =>
    api.get<KeyIssueRequest[]>(`/key-issue-requests/my?email=${encodeURIComponent(email)}`).then(res => res.data),
  
  // 키 발급 신청 생성
  create: (data: { teamId: number; allowedFeature: string; allowedModels: string[]; monthlyLimitUsd: number }, email: string) =>
    api.post<KeyIssueRequest>(`/key-issue-requests?email=${encodeURIComponent(email)}`, data).then(res => res.data),
  
  // 신청 승인 (관리자) - 키 발급 및 최초 열람용 키 반환
  approve: (requestId: number, adminEmail: string, modifications?: { allowedModels?: string[]; monthlyLimitUsd?: number }) =>
    api.put<KeyIssueApproveResponse>(`/key-issue-requests/${requestId}/approve?email=${encodeURIComponent(adminEmail)}`, modifications || {}).then(res => res.data),
  
  // 신청 거절 (관리자)
  reject: (requestId: number, adminEmail: string) =>
    api.put<KeyIssueRequest>(`/key-issue-requests/${requestId}/reject?email=${encodeURIComponent(adminEmail)}`).then(res => res.data),
  
  // 승인된 신청의 키 열람 (최초 1회)
  reveal: (requestId: number, email: string) =>
    api.get<KeyRevealResponse>(`/key-issue-requests/${requestId}/reveal?email=${encodeURIComponent(email)}`).then(res => res.data),
};

// Manual RAG (USER_MANUAL Chroma + LLM)
export interface ManualRagChatSource {
  chunkId: string;
  section: string;
  subsection: string;
}

export interface ManualRagChatResponse {
  answer: string;
  sources: ManualRagChatSource[];
}

export const manualRagApi = {
  chat: (data: { message: string }) =>
    api
      .post<ManualRagChatResponse>('/manual-rag/chat', data)
      .then((res) => res.data),
};

export default api;





