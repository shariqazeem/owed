import { Agent, type ContentBlockData } from "@strands-agents/sdk";
import { ReadLedgerSchema, READER_SYSTEM_PROMPT, type ReadLedger } from "./ledger-schema";
import { makeModel } from "./model";

export type ReaderInput = { owner?: string; caption?: string; defaultCurrency?: string } & (
  | { kind: "text"; text: string }
  | { kind: "screenshot"; bytes: Uint8Array; format: "png" | "jpeg" | "webp" }
);

/**
 * THE READER. One Strands agent, one job: turn whatever the owner dropped into a ledger the code
 * can act on. Structured output is validated against the zod schema by the SDK itself, so a wrong
 * shape is retried with feedback and a persistently wrong one throws rather than being acted on.
 */
export async function readLedger(input: ReaderInput): Promise<{ ledger: ReadLedger; model: string }> {
  const model = makeModel();
  const agent = new Agent({
    model: model.instance,
    systemPrompt: READER_SYSTEM_PROMPT,
    structuredOutputSchema: ReadLedgerSchema,
    printer: false,
  });

  const who = input.owner ? `The owner of this ledger — the person who dropped it on you and who is OWED — is "${input.owner}". ` : "";
  const cap = input.caption ? `The owner added: "${input.caption}". ` : "";
  const cur = `The owner's default currency is ${input.defaultCurrency ?? "USD"}; use it only when the source gives no currency cue. `;
  const blocks: ContentBlockData[] =
    input.kind === "text"
      ? [{ text: `${who}${cap}${cur}Read this into a ledger of who owes the owner what:\n\n${input.text}` }]
      : [{ text: `${who}${cap}${cur}Read this screenshot into a ledger of who owes the owner what.` }, { image: { format: input.format, source: { bytes: input.bytes } } }];

  const result = await agent.invoke(blocks);
  const ledger = ReadLedgerSchema.parse(result.structuredOutput);
  return { ledger, model: model.id };
}
