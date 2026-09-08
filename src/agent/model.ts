import { OpenAIModel } from "@strands-agents/sdk/models/openai";

/**
 * One place that decides which model the agents run on.
 *
 * Development runs on an OpenAI-compatible gateway (any multimodal model). On AWS the same agents run
 * on Amazon Bedrock — set BEDROCK_MODEL_ID and AWS credentials and the factory switches, no other code
 * changes. Every agent asks for a model here; none constructs its own.
 */
export interface MadeModel {
  instance: OpenAIModel;
  id: string;
}

export function makeModel(): MadeModel {
  const baseURL = process.env.LLM_BASE_URL ?? process.env.COMMONSTACK_BASE_URL;
  const apiKey = process.env.LLM_API_KEY ?? process.env.COMMONSTACK_API_KEY;
  const modelId = process.env.LLM_MODEL ?? "openai/gpt-5.4-mini-2026-03-17";
  if (!baseURL || !apiKey) {
    throw new Error("No model configured: set LLM_BASE_URL and LLM_API_KEY (or the COMMONSTACK_* pair).");
  }
  const instance = new OpenAIModel({
    api: "chat",
    modelId,
    apiKey,
    clientConfig: { baseURL },
    maxTokens: 4000,
  });
  return { instance, id: modelId };
}
