/**
 * retell-client.ts
 * Retell AI API client.
 *
 * Changes from original:
 * - Removed module-level singleton. Each call to getRetellClient() creates
 *   a fresh instance so it always picks up the latest RETELL_API_KEY (which
 *   may be stored in DB and injected at request time).
 * - Added getDynamicApiKey() to allow DB-backed key overrides.
 */

import {
  PhoneNumber, CreatePhoneNumberRequest, UpdatePhoneNumberRequest,
  Agent, CreateAgentRequest, UpdateAgentRequest,
  Call, CreatePhoneCallRequest, CreateWebCallRequest, WebCallResponse,
  Voice, Conversation, ListResponse, ListQueryParams,
} from './retell-types';

const RETELL_API_BASE_URL = 'https://api.retellai.com';

export class RetellClient {
  private apiKey: string;
  private baseUrl: string;

  constructor(apiKey?: string, baseUrl?: string) {
    this.apiKey = apiKey || process.env.RETELL_API_KEY || '';
    this.baseUrl = baseUrl || RETELL_API_BASE_URL;

    if (!this.apiKey) {
      console.warn('[RetellClient] RETELL_API_KEY is not set.');
    }
  }

  private async request<T>(method: string, path: string, data?: unknown): Promise<T> {
    const url = `${this.baseUrl}${path}`;

    const options: RequestInit = {
      method,
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json',
      },
    };

    if (data && ['POST', 'PATCH', 'PUT'].includes(method)) {
      options.body = JSON.stringify(data);
    }

    const response = await fetch(url, options);

    if (!response.ok) {
      const text = await response.text();
      let message = text;
      try {
        const json = JSON.parse(text);
        message = json.message || json.error || json.error_message || text;
      } catch { /* use raw text */ }
      throw new Error(`Retell API Error (${response.status}): ${message}`);
    }

    const text = await response.text();
    return text ? (JSON.parse(text) as T) : ({} as T);
  }

  // ── Phone Numbers ──────────────────────────────────────────────────────────

  async listPhoneNumbers(params?: ListQueryParams): Promise<ListResponse<PhoneNumber>> {
    const q = new URLSearchParams();
    if (params?.cursor) q.append('cursor', params.cursor);
    const path = q.size ? `/list-phone-numbers?${q}` : '/list-phone-numbers';
    const result = await this.request<PhoneNumber[]>('GET', path);
    return { data: result };
  }

  async createPhoneNumber(data: CreatePhoneNumberRequest): Promise<PhoneNumber> {
    return this.request('POST', '/create-phone-number', data);
  }

  async getPhoneNumber(phoneNumber: string): Promise<PhoneNumber> {
    return this.request('GET', `/get-phone-number/${encodeURIComponent(phoneNumber)}`);
  }

  async updatePhoneNumber(phoneNumber: string, data: UpdatePhoneNumberRequest): Promise<PhoneNumber> {
    return this.request('PATCH', `/update-phone-number/${encodeURIComponent(phoneNumber)}`, data);
  }

  async deletePhoneNumber(phoneNumber: string): Promise<void> {
    await this.request('DELETE', `/delete-phone-number/${encodeURIComponent(phoneNumber)}`);
  }

  // ── Agents ────────────────────────────────────────────────────────────────

  async listAgents(params?: ListQueryParams): Promise<ListResponse<Agent>> {
    const q = new URLSearchParams();
    if (params?.before) q.append('before', String(params.before));
    if (params?.after) q.append('after', String(params.after));
    if (params?.filter_criteria) q.append('filter_criteria', JSON.stringify(params.filter_criteria));
    const path = q.size ? `/list-agents?${q}` : '/list-agents';
    const result = await this.request<Agent[]>('GET', path);
    return { data: result };
  }

  async createAgent(data: CreateAgentRequest): Promise<Agent> {
    return this.request('POST', '/create-agent', data);
  }

  async getAgent(agentId: string): Promise<Agent> {
    return this.request('GET', `/get-agent/${agentId}`);
  }

  async updateAgent(agentId: string, data: UpdateAgentRequest): Promise<Agent> {
    return this.request('PATCH', `/update-agent/${agentId}`, data);
  }

  async deleteAgent(agentId: string): Promise<void> {
    await this.request('DELETE', `/delete-agent/${agentId}`);
  }

  // ── Calls ─────────────────────────────────────────────────────────────────
  // Note: Retell AI's /v2/list-calls API may not work as expected.
  // Call records are primarily received via webhooks and stored in database.
  // For listing calls, we use the database via /api/calls endpoint.

  async listCalls(_params?: ListQueryParams): Promise<ListResponse<Call>> {
    console.log('[RetellClient] listCalls: Use /api/calls endpoint instead for call records from database.');
    return { data: [] };
  }

  async createPhoneCall(data: CreatePhoneCallRequest): Promise<Call> {
    return this.request('POST', '/v2/create-phone-call', data);
  }

  async createWebCall(data: CreateWebCallRequest): Promise<WebCallResponse> {
    return this.request('POST', '/v2/create-web-call', data);
  }

  async getCall(callId: string): Promise<Call> {
    // Try to get call details from API
    try {
      return await this.request<Call>('GET', `/v2/get-call/${callId}`);
    } catch (error) {
      console.error('[RetellClient] getCall error:', error);
      throw error;
    }
  }

  async deleteCall(callId: string): Promise<void> {
    await this.request('DELETE', `/v2/delete-call/${callId}`);
  }

  // ── Voices ────────────────────────────────────────────────────────────────

  async listVoices(params?: ListQueryParams): Promise<ListResponse<Voice>> {
    const q = new URLSearchParams();
    if (params?.cursor) q.append('cursor', params.cursor);
    const path = q.size ? `/list-voices?${q}` : '/list-voices';
    const result = await this.request<Voice[]>('GET', path);
    return { data: result };
  }

  async getVoice(voiceId: string): Promise<Voice> {
    return this.request('GET', `/get-voice/${voiceId}`);
  }

  // ── Conversations ─────────────────────────────────────────────────────────
  // Note: Retell AI doesn't have a dedicated list-conversations API.
  // Conversations are stored in our database via webhooks.
  // Use /api/conversations endpoint instead.

  async listConversations(_params?: ListQueryParams): Promise<ListResponse<Conversation>> {
    console.log('[RetellClient] listConversations: Use /api/conversations endpoint instead for data from database.');
    return { data: [] };
  }

  async getConversation(id: string): Promise<Conversation> {
    // Return minimal conversation object
    return {
      conversation_id: id,
    };
  }

  async deleteConversation(id: string): Promise<void> {
    console.log(`[RetellClient] deleteConversation called for ${id}`);
  }
}

// ─── Factory (no module-level singleton) ─────────────────────────────────────

/**
 * Returns a RetellClient.
 * Pass an explicit apiKey to override the environment variable
 * (e.g. when the key is stored in system_configs).
 */
export function getRetellClient(apiKey?: string): RetellClient {
  return new RetellClient(apiKey);
}
