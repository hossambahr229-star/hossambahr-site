// A provider is successful only after its complete terminal response, never on meta/delta.
export async function readAIResponse(response, onDelta = () => {}) {
  if (!response.ok) throw new Error(`ai_http_${response.status}`);
  if ((response.headers.get('content-type') || '').includes('application/json')) {
    const payload = await response.json();
    if (payload?.ok !== true || !payload.result?.answer?.text) throw new Error('ai_invalid_json');
    return { payload, ttft: null, doneMeta: null };
  }
  if (!response.body) throw new Error('ai_empty_stream');
  const reader = response.body.getReader(), decoder = new TextDecoder();
  let buffer = '', payload = null, terminal = false, full = '', doneMeta = null;
  const consume = (raw) => {
    if (!raw.trim()) return;
    let evt; try { evt = JSON.parse(raw); } catch { throw new Error('ai_invalid_frame'); }
    if (terminal) throw new Error('ai_frame_after_terminal');
    if (evt.type === 'meta') {
      if (payload) throw new Error('ai_duplicate_meta');
      payload = { ok: true, goal_context: evt.goal_context, rate_limit: evt.rate_limit,
        result: { ...evt.result, engine: { ...evt.result?.engine, external_model_used: false } } };
    } else if (evt.type === 'delta') {
      if (!payload || typeof evt.delta !== 'string') throw new Error('ai_delta_without_meta');
      full += evt.delta; onDelta(full);
    } else if (evt.type === 'done') {
      if (!payload || typeof evt.text !== 'string' || !evt.text.trim() || evt.engine?.external_model_used !== true) throw new Error('ai_invalid_completion');
      payload.result = { ...payload.result, answer: { ...payload.result.answer, text: evt.text, generated: true }, engine: evt.engine };
      terminal = true; doneMeta = evt;
    } else if (evt.type === 'fallback') {
      if (!evt.result?.answer?.text) throw new Error('ai_invalid_fallback');
      payload = { ok: true, goal_context: payload?.goal_context, rate_limit: payload?.rate_limit,
        result: { ...evt.result, engine: { ...evt.result.engine, external_model_used: false } } };
      terminal = true;
    } else throw new Error('ai_unknown_frame');
  };
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n'); buffer = lines.pop() || '';
      for (const line of lines) consume(line);
    }
    buffer += decoder.decode(); if (buffer.trim()) consume(buffer);
    if (!terminal || !payload) throw new Error('ai_incomplete_stream');
    return { payload, ttft: null, doneMeta };
  } finally { reader.releaseLock(); }
}
