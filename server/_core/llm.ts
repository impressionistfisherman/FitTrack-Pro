import { ENV } from "./env";

export type Role = "system" | "user" | "assistant" | "tool" | "function";

export type TextContent = {
  type: "text";
  text: string;
};

export type ImageContent = {
  type: "image_url";
  image_url: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
};

export type FileContent = {
  type: "file_url";
  file_url: {
    url: string;
    mime_type?: "audio/mpeg" | "audio/wav" | "application/pdf" | "audio/mp4" | "video/mp4" ;
  };
};

export type MessageContent = string | TextContent | ImageContent | FileContent;

export type Message = {
  role: Role;
  content: MessageContent | MessageContent[];
  name?: string;
  tool_call_id?: string;
};

export type Tool = {
  type: "function";
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
  };
};

export type ToolChoicePrimitive = "none" | "auto" | "required";
export type ToolChoiceByName = { name: string };
export type ToolChoiceExplicit = {
  type: "function";
  function: {
    name: string;
  };
};

export type ToolChoice =
  | ToolChoicePrimitive
  | ToolChoiceByName
  | ToolChoiceExplicit;

export type InvokeParams = {
  messages: Message[];
  provider?: LlmProvider;
  tools?: Tool[];
  toolChoice?: ToolChoice;
  tool_choice?: ToolChoice;
  maxTokens?: number;
  max_tokens?: number;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
};

export type LlmProvider = "auto" | "gemini" | "openai";

export type ToolCall = {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
};

export type InvokeResult = {
  id: string;
  created: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: Role;
      content: string | Array<TextContent | ImageContent | FileContent>;
      tool_calls?: ToolCall[];
    };
    finish_reason: string | null;
  }>;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
};

export type JsonSchema = {
  name: string;
  schema: Record<string, unknown>;
  strict?: boolean;
};

export type OutputSchema = JsonSchema;

export type ResponseFormat =
  | { type: "text" }
  | { type: "json_object" }
  | { type: "json_schema"; json_schema: JsonSchema };

type GeminiGenerateContentResponse = {
  candidates?: Array<{
    content?: { parts?: Array<{ text?: string }> };
    finishReason?: string;
  }>;
  usageMetadata?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  };
};

type GeminiPart = { text: string } | { inlineData: { mimeType: string; data: string } };

const ensureArray = (
  value: MessageContent | MessageContent[]
): MessageContent[] => (Array.isArray(value) ? value : [value]);

const normalizeContentPart = (
  part: MessageContent
): TextContent | ImageContent | FileContent => {
  if (typeof part === "string") {
    return { type: "text", text: part };
  }

  if (part.type === "text") {
    return part;
  }

  if (part.type === "image_url") {
    return part;
  }

  if (part.type === "file_url") {
    return part;
  }

  throw new Error("Unsupported message content part");
};

const normalizeMessage = (message: Message) => {
  const { role, name, tool_call_id } = message;

  if (role === "tool" || role === "function") {
    const content = ensureArray(message.content)
      .map(part => (typeof part === "string" ? part : JSON.stringify(part)))
      .join("\n");

    return {
      role,
      name,
      tool_call_id,
      content,
    };
  }

  const contentParts = ensureArray(message.content).map(normalizeContentPart);

  // If there's only text content, collapse to a single string for compatibility
  if (contentParts.length === 1 && contentParts[0].type === "text") {
    return {
      role,
      name,
      content: contentParts[0].text,
    };
  }

  return {
    role,
    name,
    content: contentParts,
  };
};

const normalizeToolChoice = (
  toolChoice: ToolChoice | undefined,
  tools: Tool[] | undefined
): "none" | "auto" | ToolChoiceExplicit | undefined => {
  if (!toolChoice) return undefined;

  if (toolChoice === "none" || toolChoice === "auto") {
    return toolChoice;
  }

  if (toolChoice === "required") {
    if (!tools || tools.length === 0) {
      throw new Error(
        "tool_choice 'required' was provided but no tools were configured"
      );
    }

    if (tools.length > 1) {
      throw new Error(
        "tool_choice 'required' needs a single tool or specify the tool name explicitly"
      );
    }

    return {
      type: "function",
      function: { name: tools[0].function.name },
    };
  }

  if ("name" in toolChoice) {
    return {
      type: "function",
      function: { name: toolChoice.name },
    };
  }

  return toolChoice;
};

const resolveApiUrl = () =>
  ENV.forgeApiUrl && ENV.forgeApiUrl.trim().length > 0
    ? `${ENV.forgeApiUrl.replace(/\/$/, "")}/v1/chat/completions`
    : "https://forge.manus.im/v1/chat/completions";

const resolveOpenAIApiUrl = () =>
  ENV.openaiApiUrl && ENV.openaiApiUrl.trim().length > 0
    ? ENV.openaiApiUrl.replace(/\/$/, "")
    : "https://api.openai.com/v1/chat/completions";

const assertApiKey = () => {
  if (!ENV.forgeApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const assertOpenAIApiKey = () => {
  if (!ENV.openaiApiKey) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

const normalizeResponseFormat = ({
  responseFormat,
  response_format,
  outputSchema,
  output_schema,
}: {
  responseFormat?: ResponseFormat;
  response_format?: ResponseFormat;
  outputSchema?: OutputSchema;
  output_schema?: OutputSchema;
}):
  | { type: "json_schema"; json_schema: JsonSchema }
  | { type: "text" }
  | { type: "json_object" }
  | undefined => {
  const explicitFormat = responseFormat || response_format;
  if (explicitFormat) {
    if (
      explicitFormat.type === "json_schema" &&
      !explicitFormat.json_schema?.schema
    ) {
      throw new Error(
        "responseFormat json_schema requires a defined schema object"
      );
    }
    return explicitFormat;
  }

  const schema = outputSchema || output_schema;
  if (!schema) return undefined;

  if (!schema.name || !schema.schema) {
    throw new Error("outputSchema requires both name and schema");
  }

  return {
    type: "json_schema",
    json_schema: {
      name: schema.name,
      schema: schema.schema,
      ...(typeof schema.strict === "boolean" ? { strict: schema.strict } : {}),
    },
  };
};

function getTextFromMessageContent(content: MessageContent | MessageContent[]) {
  return ensureArray(content)
    .map((part) => {
      if (typeof part === "string") return part;
      if (part.type === "text") return part.text;
      if (part.type === "image_url") return `[image: ${part.image_url.url}]`;
      if (part.type === "file_url") return `[file: ${part.file_url.url}]`;
      return "";
    })
    .filter(Boolean)
    .join("\n");
}

function getGeminiPartsFromMessageContent(content: MessageContent | MessageContent[]) {
  const parts: GeminiPart[] = [];

  for (const part of ensureArray(content)) {
    if (typeof part === "string") {
      if (part.trim()) parts.push({ text: part });
      continue;
    }

    if (part.type === "text") {
      if (part.text.trim()) parts.push({ text: part.text });
      continue;
    }

    if (part.type === "image_url") {
      const imageUrl = part.image_url.url;
      const dataUrlMatch = imageUrl.match(/^data:([^;,]+);base64,(.+)$/);
      if (dataUrlMatch) {
        parts.push({
          inlineData: {
            mimeType: dataUrlMatch[1],
            data: dataUrlMatch[2],
          },
        });
      } else {
        parts.push({ text: `[image url: ${imageUrl}]` });
      }
      continue;
    }

    if (part.type === "file_url") {
      parts.push({ text: `[file url: ${part.file_url.url}]` });
    }
  }

  return parts;
}

function toGeminiSchema(schema: Record<string, unknown>): Record<string, unknown> {
  if (Array.isArray(schema)) return schema.map((item) => typeof item === "object" && item ? toGeminiSchema(item as Record<string, unknown>) : item) as unknown as Record<string, unknown>;

  const next: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === "additionalProperties" || key === "$schema" || key === "strict") continue;

    if (key === "type" && typeof value === "string") {
      next[key] = value.toUpperCase();
      continue;
    }

    if (Array.isArray(value)) {
      next[key] = value.map((item) => typeof item === "object" && item ? toGeminiSchema(item as Record<string, unknown>) : item);
      continue;
    }

    if (typeof value === "object" && value !== null) {
      next[key] = toGeminiSchema(value as Record<string, unknown>);
      continue;
    }

    next[key] = value;
  }
  return next;
}

function toGeminiContents(messages: Message[]) {
  const systemInstructionParts: Array<{ text: string }> = [];
  const contents: Array<{ role: "user" | "model"; parts: GeminiPart[] }> = [];

  for (const message of messages) {
    if (message.role === "system") {
      const text = getTextFromMessageContent(message.content);
      if (!text) continue;
      systemInstructionParts.push({ text });
      continue;
    }

    const parts = getGeminiPartsFromMessageContent(message.content);
    if (!parts.length) continue;

    contents.push({
      role: message.role === "assistant" ? "model" : "user",
      parts,
    });
  }

  return {
    contents,
    systemInstruction: systemInstructionParts.length > 0
      ? { parts: systemInstructionParts }
      : undefined,
  };
}

async function invokeGemini(params: InvokeParams): Promise<InvokeResult> {
  if (!ENV.geminiApiKey) {
    throw new Error("GEMINI_API_KEY is not configured");
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat: params.responseFormat,
    response_format: params.response_format,
    outputSchema: params.outputSchema,
    output_schema: params.output_schema,
  });
  const { contents, systemInstruction } = toGeminiContents(params.messages);
  const generationConfig: Record<string, unknown> = {
    maxOutputTokens: params.maxTokens ?? params.max_tokens ?? 8192,
  };

  if (normalizedResponseFormat?.type === "json_schema") {
    generationConfig.responseMimeType = "application/json";
    generationConfig.responseSchema = toGeminiSchema(normalizedResponseFormat.json_schema.schema);
  } else if (normalizedResponseFormat?.type === "json_object") {
    generationConfig.responseMimeType = "application/json";
  }

  const body: Record<string, unknown> = {
    contents,
    generationConfig,
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const configuredModel = ENV.geminiModel || "gemini-2.5-flash";
  const modelCandidates = Array.from(new Set([
    configuredModel,
    "gemini-2.5-flash",
    "gemini-2.0-flash",
    "gemini-1.5-flash-latest",
    "gemini-1.5-flash",
  ]));
  let usedModel = modelCandidates[0];
  let lastError = "";
  let data: GeminiGenerateContentResponse | null = null;

  for (const model of modelCandidates) {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(ENV.geminiApiKey)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-goog-api-key": ENV.geminiApiKey,
      },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      data = await response.json() as GeminiGenerateContentResponse;
      usedModel = model;
      break;
    }

    const errorText = await response.text();
    lastError = `Gemini invoke failed: ${response.status} ${response.statusText} – ${errorText}`;
    if (response.status !== 404 && response.status !== 429 && response.status < 500) break;
  }

  if (!data) {
    throw new Error(lastError || "Gemini invoke failed");
  }

  const content = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";

  return {
    id: crypto.randomUUID(),
    created: Math.floor(Date.now() / 1000),
    model: usedModel,
    choices: [
      {
        index: 0,
        message: {
          role: "assistant",
          content,
        },
        finish_reason: data.candidates?.[0]?.finishReason ?? null,
      },
    ],
    usage: data.usageMetadata
      ? {
          prompt_tokens: data.usageMetadata.promptTokenCount ?? 0,
          completion_tokens: data.usageMetadata.candidatesTokenCount ?? 0,
          total_tokens: data.usageMetadata.totalTokenCount ?? 0,
        }
      : undefined,
  };
}

async function invokeForgeLLM(params: InvokeParams): Promise<InvokeResult> {
  assertApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: "gemini-2.5-flash",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_tokens = 32768
  payload.thinking = {
    "budget_tokens": 128
  }

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(resolveApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.forgeApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `LLM invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

async function invokeOpenAILLM(params: InvokeParams): Promise<InvokeResult> {
  assertOpenAIApiKey();

  const {
    messages,
    tools,
    toolChoice,
    tool_choice,
    outputSchema,
    output_schema,
    responseFormat,
    response_format,
  } = params;

  const payload: Record<string, unknown> = {
    model: ENV.openaiModel || "gpt-5.5",
    messages: messages.map(normalizeMessage),
  };

  if (tools && tools.length > 0) {
    payload.tools = tools;
  }

  const normalizedToolChoice = normalizeToolChoice(
    toolChoice || tool_choice,
    tools
  );
  if (normalizedToolChoice) {
    payload.tool_choice = normalizedToolChoice;
  }

  payload.max_completion_tokens = params.maxTokens ?? params.max_tokens ?? 8192;

  const normalizedResponseFormat = normalizeResponseFormat({
    responseFormat,
    response_format,
    outputSchema,
    output_schema,
  });

  if (normalizedResponseFormat) {
    payload.response_format = normalizedResponseFormat;
  }

  const response = await fetch(resolveOpenAIApiUrl(), {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${ENV.openaiApiKey}`,
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI invoke failed: ${response.status} ${response.statusText} – ${errorText}`
    );
  }

  return (await response.json()) as InvokeResult;
}

export async function invokeLLM(params: InvokeParams): Promise<InvokeResult> {
  if (params.provider === "gemini") {
    return invokeGemini(params);
  }

  if (params.provider === "openai") {
    try {
      return await invokeOpenAILLM(params);
    } catch (error) {
      if (!ENV.geminiApiKey) throw error;
      return invokeGemini({ ...params, provider: "gemini" });
    }
  }

  if (ENV.geminiApiKey) {
    return invokeGemini(params);
  }

  return invokeForgeLLM(params);
}
