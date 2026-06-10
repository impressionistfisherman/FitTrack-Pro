import { afterEach, describe, expect, it, vi } from "vitest";

describe("LLM provider routing", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    delete process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_MODEL;
    delete process.env.OPENAI_API_URL;
    delete process.env.GEMINI_API_KEY;
    delete process.env.GEMINI_MODEL;
  });

  it("uses OpenAI when provider is explicitly openai", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_MODEL = "gpt-test-model";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    vi.resetModules();

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        id: "chatcmpl-test",
        created: 1,
        model: "gpt-test-model",
        choices: [{ index: 0, message: { role: "assistant", content: "{}" }, finish_reason: "stop" }],
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { invokeLLM } = await import("./_core/llm");
    await invokeLLM({
      provider: "openai",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 123,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/chat/completions");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer test-openai-key");
    expect(JSON.parse(String(init.body))).toMatchObject({
      model: "gpt-test-model",
      max_completion_tokens: 123,
    });
  });

  it("uses Gemini when provider is explicitly gemini", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
    vi.resetModules();

    const fetchMock = vi.fn(async () => ({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: "{}" }] }, finishReason: "STOP" }],
        usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
      }),
    }));
    vi.stubGlobal("fetch", fetchMock);

    const { invokeLLM } = await import("./_core/llm");
    await invokeLLM({
      provider: "gemini",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 123,
    });

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent");
    expect((init.headers as Record<string, string>)["x-goog-api-key"]).toBe("test-gemini-key");
    expect(JSON.parse(String(init.body)).generationConfig).toMatchObject({
      maxOutputTokens: 123,
    });
  });

  it("falls back to Gemini when explicit OpenAI invocation fails", async () => {
    process.env.OPENAI_API_KEY = "test-openai-key";
    process.env.OPENAI_MODEL = "gpt-test-model";
    process.env.GEMINI_API_KEY = "test-gemini-key";
    process.env.GEMINI_MODEL = "gemini-test-model";
    vi.resetModules();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        statusText: "Too Many Requests",
        text: async () => JSON.stringify({ error: { code: "insufficient_quota" } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: "{}" }] }, finishReason: "STOP" }],
          usageMetadata: { promptTokenCount: 1, candidatesTokenCount: 1, totalTokenCount: 2 },
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { invokeLLM } = await import("./_core/llm");
    const result = await invokeLLM({
      provider: "openai",
      messages: [{ role: "user", content: "hello" }],
      maxTokens: 123,
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(fetchMock.mock.calls[0][0]).toBe("https://api.openai.com/v1/chat/completions");
    expect(fetchMock.mock.calls[1][0]).toContain("https://generativelanguage.googleapis.com/v1beta/models/gemini-test-model:generateContent");
    expect(result.model).toBe("gemini-test-model");
  });
});
