import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Loaded from node_modules at runtime, never bundled: the Strands SDK carries optional imports for
   * every provider it supports (S3 offloading, Bedrock, MCP over stdio) and a bundler tries to resolve
   * all of them; better-sqlite3 is native; the OpenAI client ships its own conditional exports.
   */
  serverExternalPackages: [
    "@strands-agents/sdk",
    "openai",
    "better-sqlite3",
    "@modelcontextprotocol/sdk",
    "@a2a-js/sdk",
    "express",
    "@opentelemetry/api",
    "@opentelemetry/sdk-trace-base",
    "@opentelemetry/sdk-trace-node",
    "@opentelemetry/sdk-metrics",
    "@opentelemetry/resources",
    "@opentelemetry/exporter-trace-otlp-http",
    "@opentelemetry/exporter-metrics-otlp-http",
  ],
};

export default nextConfig;
