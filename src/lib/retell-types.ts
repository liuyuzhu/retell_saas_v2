// Retell AI API Types

// ==================== Phone Numbers ====================

export interface PhoneNumber {
  phone_number: string;
  nickname?: string;
  agent_id?: string;
  inbound_call_recording_enabled?: boolean;
  outbound_call_recording_enabled?: boolean;
  created_at?: string;
}

export interface CreatePhoneNumberRequest {
  phone_number: string;
  nickname?: string;
  agent_id?: string;
  inbound_call_recording_enabled?: boolean;
  outbound_call_recording_enabled?: boolean;
}

export interface UpdatePhoneNumberRequest {
  nickname?: string;
  agent_id?: string;
  inbound_call_recording_enabled?: boolean;
  outbound_call_recording_enabled?: boolean;
}

// ==================== Agents ====================

export interface Agent {
  agent_id: string;
  agent_name?: string;
  voice_id?: string;
  response_engine?: ResponseEngine;
  ambient_noise?: string;
  enable_backchannel?: boolean;
  backchannel_frequency?: number;
  backchannel_word?: string;
  bot_filler_noise?: boolean;
  enable_heartbeat?: boolean;
  end_call_after_silence?: number;
  Reminder?: ReminderConfig[];
  boosted_keywords?: string[];
  call_details_info?: string;
  voicemail_message?: string;
  voicemail_detection_enabled?: boolean;
  llm_model?: string;
  llm_temperature?: number;
  llm_system_prompt?: string;
  llm_tools?: Tool[];
  conversation_flow?: ConversationFlow;
  emotional_authenticity?: number;
  interrupt_sensitivity?: number;
  speed?: number;
  clip_stopping?: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface ResponseEngine {
  type: 'retell-llm' | 'bring-your-own-llm' | 'llm-webhook';
  llm_id?: string; // Required for retell-llm type
  llm_websocket_url?: string; // Required for bring-your-own-llm type
  llm_webhook_url?: string; // For llm-webhook type
  llm_url?: string;
  model?: string;
  temperature?: number;
  system_prompt?: string;
  tools?: Tool[];
  knowledge_base?: KnowledgeBase[];
}

export interface KnowledgeBase {
  knowledge_base_id: string;
  name?: string;
}

export interface Tool {
  type: 'function' | 'end_call';
  name?: string;
  description?: string;
  parameters?: Record<string, unknown>;
}

export interface ReminderConfig {
  trigger_type: 'inactive' | 'static';
  inactive_threshold?: number;
  static_delay?: number;
  message?: string;
}

export interface ConversationFlow {
  start_msg?: string;
}

export interface CreateAgentRequest {
  agent_name?: string;
  voice_id?: string;
  response_engine?: ResponseEngine;
  ambient_noise?: string;
  enable_backchannel?: boolean;
  backchannel_frequency?: number;
  backchannel_word?: string;
  bot_filler_noise?: boolean;
  enable_heartbeat?: boolean;
  end_call_after_silence?: number;
  Reminder?: ReminderConfig[];
  boosted_keywords?: string[];
  call_details_info?: string;
  voicemail_message?: string;
  voicemail_detection_enabled?: boolean;
  llm_model?: string;
  llm_temperature?: number;
  llm_system_prompt?: string;
  llm_tools?: Tool[];
  conversation_flow?: ConversationFlow;
  emotional_authenticity?: number;
  interrupt_sensitivity?: number;
  speed?: number;
  clip_stopping?: boolean;
}

export interface UpdateAgentRequest extends Partial<CreateAgentRequest> {}

// ==================== Calls ====================

export interface Call {
  call_id: string;
  call_type: 'phone_call' | 'web_call';
  agent_id?: string;
  from_number?: string;
  to_number?: string;
  call_status?: 'registered' | 'ongoing' | 'ended' | 'error';
  call_direction?: 'inbound' | 'outbound';
  recording_url?: string;
  transcript?: TranscriptSegment[];
  call_recording_sid?: string;
  duration_ms?: number;
  started_at?: number;
  ended_at?: number;
  disconnection_reason?: string;
  cost?: number;
  call_analysis?: CallAnalysis;
}

export interface TranscriptSegment {
  role: 'agent' | 'user';
  content: string;
  timestamp_ms: number;
}

export interface CallAnalysis {
  call_summary?: string;
  user_sentiment?: string;
  call_successful?: boolean;
  in_voicemail?: boolean;
  call_completion_reason?: string;
  custom_analysis_data?: Record<string, unknown>;
}

export interface CreatePhoneCallRequest {
  from_number: string;
  to_number: string;
  agent_id: string;
  metadata?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, unknown>;
}

export interface CreateWebCallRequest {
  agent_id: string;
  metadata?: Record<string, unknown>;
  retell_llm_dynamic_variables?: Record<string, unknown>;
}

export interface WebCallResponse {
  call_id: string;
  access_token: string;
}

// ==================== Voice ====================

export interface Voice {
  voice_id: string;
  voice_name: string;
  voice_description?: string;
  language?: string;
  gender?: 'male' | 'female';
  accent?: string;
  age?: string;
  provider?: string;
  sample_audio_url?: string;
  preview_audio_url?: string;
  avatar_url?: string;
  recommended?: boolean;
  voice_type?: string;
  standard_voice_type?: string;
}

// ==================== Conversations ====================

export interface Conversation {
  conversation_id: string;
  agent_id?: string;
  call_id?: string;
  transcript?: TranscriptSegment[];
  call_analysis?: CallAnalysis;
  started_at?: number;
  ended_at?: number;
  duration_ms?: number;
  disconnection_reason?: string;
  sentiment?: string;
  metadata?: Record<string, unknown>;
}

// ==================== API Response Types ====================

export interface ListResponse<T> {
  data: T[];
  has_more?: boolean;
  next_cursor?: string;
}

export interface ApiError {
  error: string;
  message?: string;
  status_code?: number;
}

// ==================== List Query Parameters ====================

export interface ListQueryParams {
  limit?: number;
  cursor?: string;
  before?: number;
  after?: number;
  filter_criteria?: Record<string, unknown>;
}
