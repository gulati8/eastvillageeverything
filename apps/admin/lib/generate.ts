/**
 * The Claude call behind `app/api/admin/generate/route.ts`. Server only: this
 * module holds the SDK import and the model name; the prompt, schema and
 * wording checks are the pure helpers in `lib/editorial.ts`.
 *
 * One click = one `generateEditorial` call: a single Messages request with
 * the web search server tool (capped at 3 searches) and a JSON-schema output
 * format. A `pause_turn` is sent back once. If the copy breaks a wording
 * rule, one more request asks the model to fix only those fields; anything
 * still wrong after that comes back as `warnings`.
 */
import Anthropic from '@anthropic-ai/sdk';
import {
  EDITORIAL_OUTPUT_SCHEMA,
  buildEditorialPrompt,
  editorialViolations,
  normalizeEditorialOutput,
  pickEditorialFields,
  validateEditorial,
  type EditorialField,
  type EditorialFields,
  type EditorialPlace,
} from './editorial';

export const EDITORIAL_MODEL = 'claude-sonnet-5-5';

const WEB_SEARCH: Anthropic.WebSearchTool20260209 = {
  type: 'web_search_20260209',
  name: 'web_search',
  max_uses: 3,
  user_location: {
    type: 'approximate',
    city: 'New York',
    region: 'New York',
    country: 'US',
    timezone: 'America/New_York',
  },
};

/** The model stopped with `stop_reason: 'refusal'`. */
export class EditorialRefusal extends Error {
  constructor() {
    super('Claude declined to write this one.');
    this.name = 'EditorialRefusal';
  }
}

/** The response held no text block that parses as the editorial object. */
export class EditorialUnreadable extends Error {
  constructor(detail: string) {
    super(`Claude returned something unreadable (${detail}).`);
    this.name = 'EditorialUnreadable';
  }
}

export interface GenerateEditorialResult {
  fields: EditorialFields;
  /** Web searches the model ran, from `usage.server_tool_use.web_search_requests`. */
  searches: number;
  /** Wording rules the copy still breaks after the fix-up request. */
  warnings: string[];
  input_tokens: number;
  output_tokens: number;
  /** Messages requests made (1 normally, up to 4 with a pause and a fix-up). */
  requests: number;
}

interface Tally {
  searches: number;
  input_tokens: number;
  output_tokens: number;
  requests: number;
}

type TurnParams = Omit<Anthropic.MessageCreateParamsNonStreaming, 'messages'>;

function tally(t: Tally, message: Anthropic.Message): void {
  t.requests += 1;
  t.input_tokens += message.usage.input_tokens;
  t.output_tokens += message.usage.output_tokens;
  t.searches += message.usage.server_tool_use?.web_search_requests ?? 0;
}

/**
 * One assistant turn. A `pause_turn` (the server tool loop ran long) is sent
 * back once so the model can finish; a second pause is returned as is.
 */
async function completeTurn(client: Anthropic, params: TurnParams, messages: Anthropic.MessageParam[], t: Tally): Promise<Anthropic.Message> {
  let resumed = false;
  for (;;) {
    const message = await client.messages.create({ ...params, messages });
    tally(t, message);
    if (message.stop_reason === 'pause_turn' && !resumed) {
      resumed = true;
      messages.push({ role: 'assistant', content: message.content });
      continue;
    }
    return message;
  }
}

/** The editorial object from the last text block that parses as JSON. */
function readEditorial(message: Anthropic.Message): EditorialFields {
  if (message.stop_reason === 'refusal') throw new EditorialRefusal();
  const texts = message.content.filter((b): b is Anthropic.TextBlock => b.type === 'text');
  for (let i = texts.length - 1; i >= 0; i -= 1) {
    try {
      return normalizeEditorialOutput(JSON.parse(texts[i].text));
    } catch {
      // An earlier text block may be commentary around a search; keep looking.
    }
  }
  throw new EditorialUnreadable(message.stop_reason === 'max_tokens' ? 'the reply was cut off' : 'no editorial JSON in the reply');
}

export async function generateEditorial(client: Anthropic, place: EditorialPlace, fields: readonly EditorialField[]): Promise<GenerateEditorialResult> {
  const { system, user } = buildEditorialPrompt({ place, fields });
  const params: TurnParams = {
    model: EDITORIAL_MODEL,
    max_tokens: 16000,
    system,
    tools: [WEB_SEARCH],
    output_config: { format: { type: 'json_schema', schema: EDITORIAL_OUTPUT_SCHEMA } },
  };
  const messages: Anthropic.MessageParam[] = [{ role: 'user', content: user }];
  const t: Tally = { searches: 0, input_tokens: 0, output_tokens: 0, requests: 0 };

  const first = await completeTurn(client, params, messages, t);
  let result = pickEditorialFields(readEditorial(first), fields);
  const violations = editorialViolations(result);

  if (violations.length) {
    const broken = new Set(violations.map((v) => v.field));
    messages.push({ role: 'assistant', content: first.content });
    messages.push({
      role: 'user',
      content: [
        'Fix only these problems and return the full JSON object again, with every other field exactly as it was:',
        ...violations.map((v) => `- ${v.field}: ${v.message}`),
      ].join('\n'),
    });
    const second = await completeTurn(client, params, messages, t);
    const fixed = pickEditorialFields(readEditorial(second), fields);
    // Only the fields that broke a rule take the new text; the rest keep the first draft.
    for (const field of broken) result = { ...result, [field]: fixed[field] };
  }

  return {
    fields: result,
    searches: t.searches,
    warnings: validateEditorial(result),
    input_tokens: t.input_tokens,
    output_tokens: t.output_tokens,
    requests: t.requests,
  };
}
