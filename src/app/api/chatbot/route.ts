import { NextRequest, NextResponse } from 'next/server';
import { LLMClient, Config, HeaderUtils } from 'coze-coding-dev-sdk';
import { withAuth, ok, Err } from '@/lib/api-helpers';

// Store conversation history in memory (suitable for single-instance deployments).
// ⚠️  For multi-instance / edge deployments, migrate to Redis or a DB table.
// History is capped at MAX_HISTORY_PAIRS exchanges per user to prevent
// unbounded memory growth (acts as a soft DoS safeguard).
const conversationHistories: Map<string, Array<{ role: 'user' | 'assistant' | 'system'; content: string }>> = new Map();
const MAX_HISTORY_PAIRS = 20; // keep last 20 user+assistant exchanges (40 messages)

const SYSTEM_PROMPT = `你是米格AI助手，一个专业、友好的AI助手。你可以回答用户关于米格AI平台的各种问题，包括：
- 如何使用Web通话和电话通话功能
- 如何创建和管理Agent
- 如何配置电话号码
- 如何查看通话记录和分析
- 平台的一般使用问题

请用友好、专业的态度回答问题。如果遇到不确定的问题，请坦诚告知用户。`;

export const POST = withAuth(async (request: NextRequest, ctx) => {
  try {
    const body = await request.json();
    const { message, clearHistory } = body;

    if (!message || typeof message !== 'string') {
      return Err.badRequest('Message is required');
    }

    const userId = ctx.user.userId;
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const config = new Config();
    const client = new LLMClient(config, customHeaders);

    // Get or create conversation history for this user
    let history = conversationHistories.get(userId) || [];
    
    // Clear history if requested
    if (clearHistory) {
      history = [];
      conversationHistories.delete(userId);
    }

    // Build messages array
    const messages: Array<{ role: 'user' | 'assistant' | 'system'; content: string }> = [
      { role: 'system', content: SYSTEM_PROMPT },
      ...history,
      { role: 'user', content: message },
    ];

    // Invoke LLM with streaming
    const chunks: string[] = [];
    
    try {
      const stream = client.stream(messages, {
        model: 'doubao-seed-1-8-251228',
        temperature: 0.7,
      });

      for await (const chunk of stream) {
        if (chunk.content) {
          chunks.push(chunk.content.toString());
        }
      }
    } catch (llmError) {
      console.error('[ChatBot] LLM error:', llmError);
      return Err.internal('AI服务暂时不可用，请稍后再试');
    }

    const fullResponse = chunks.join('');

    // Update conversation history and enforce size cap
    history.push({ role: 'user', content: message });
    history.push({ role: 'assistant', content: fullResponse });
    // Trim to the most recent MAX_HISTORY_PAIRS exchanges
    if (history.length > MAX_HISTORY_PAIRS * 2) {
      history.splice(0, history.length - MAX_HISTORY_PAIRS * 2);
    }
    conversationHistories.set(userId, history);

    return ok({
      response: fullResponse,
      historySize: history.length,
    });
  } catch (error) {
    console.error('[ChatBot] Error:', error);
    return Err.internal('处理消息时出错');
  }
});

// DELETE - Clear conversation history
export const DELETE = withAuth(async (request: NextRequest, ctx) => {
  const userId = ctx.user.userId;
  conversationHistories.delete(userId);
  return ok({ success: true, message: '对话历史已清除' });
});
