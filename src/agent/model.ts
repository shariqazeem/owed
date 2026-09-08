import { BedrockModel } from "@strands-agents/sdk";
import { OpenAIModel } from "@strands-agents/sdk/models/openai";

/**
 * One place that decides which model the agents run on. Every agent asks here; none constructs its own.
 *
 * On AWS the agents run on Amazon Bedrock: set BEDROCK_MODEL_ID (and AWS credentials / AWS_REGION)
 * and the factory switches — no other code changes. Anywhere else, any OpenAI-compatible endpoint
 * works (LLM_BASE_URL + LLM_API_KEY + LLM_MODEL). The Reader's structured output is a forced tool
 * call, so the model must honour tool use; the ones listed in the README are known to.
 */
export interface MadeModel {
  instance: OpenAIModel | BedrockModel;
  id: string;
  provider: "bedrock" | "openai-compatible";
}

const MAX_TOKENS = 4000;

export function makeModel(): MadeModel {
  const bedrockId = process.env.BEDROCK_MODEL_ID?.trim();
  if (bedrockId) {
    const region = process.env.AWS_REGION ?? process.env.AWS_DEFAULT_REGION ?? "us-east-1";
    return { instance: new BedrockModel({ modelId: bedrockId, region, maxTokens: MAX_TOKENS }), id: bedrockId, provider: "bedrock" };
  }
  const baseURL = process.env.LLM_BASE_URL ?? process.env.COMMONSTACK_BASE_URL;
  const apiKey = process.env.LLM_API_KEY ?? process.env.COMMONSTACK_API_KEY;
  const modelId = process.env.LLM_MODEL ?? "openai/gpt-5.4-mini-2026-03-17";
  if (!baseURL || !apiKey) {
    throw new Error("No model configured: set BEDROCK_MODEL_ID for Bedrock, or LLM_BASE_URL and LLM_API_KEY for an OpenAI-compatible endpoint.");
  }
  const instance = new OpenAIModel({ api: "chat", modelId, apiKey, clientConfig: { baseURL }, maxTokens: MAX_TOKENS });
  return { instance, id: modelId, provider: "openai-compatible" };
}
