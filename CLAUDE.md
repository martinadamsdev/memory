# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Cloudflare Workers-based Model Context Protocol (MCP) server that provides calculator tools without authentication. It uses Durable Objects for state management and can be connected to from Claude Desktop or the Cloudflare AI Playground.

## Development Commands

```bash
# Start development server
npm run dev

# Deploy to Cloudflare Workers
npm run deploy

# Code formatting
npm run format

# Fix linting issues
npm run lint:fix

# Type checking
npm run type-check

# Generate Cloudflare types
npm run cf-typegen
```

## Architecture

### Core Components

1. **MCP Agent (`src/index.ts`)**: Extends `McpAgent` from the agents library to define MCP tools. The main class `MyMCP` initializes tools in the `init()` method using `this.server.tool()`.

2. **Endpoints**:
   - `/sse` and `/sse/message`: Server-Sent Events endpoint for streaming MCP communication
   - `/mcp`: Standard MCP endpoint
   - Tools are defined using Zod schemas for validation

3. **Durable Objects**: The project uses Cloudflare Durable Objects (class name: `MyMCP`) for stateful MCP server instances, configured in `wrangler.jsonc`.

## Adding New Tools

To add tools to the MCP server, modify the `init()` method in `src/index.ts`:

```typescript
this.server.tool(
  "toolName",
  { param1: z.string(), param2: z.number() }, // Zod schema for parameters
  async ({ param1, param2 }) => ({
    content: [{ type: "text", text: "result" }]
  })
);
```

## Configuration

- **Biome**: Used for linting and formatting with 4-space indentation and 100-character line width
- **TypeScript**: Targets ES2021 with strict mode enabled, module resolution set to bundler
- **Wrangler**: Configured with Node.js compatibility flag and Durable Objects bindings

## Deployment

The server deploys to `remote-mcp-server-authless.<account>.workers.dev/sse`. After deployment, it can be connected to:
- Cloudflare AI Playground directly
- Claude Desktop via mcp-remote proxy

## Workflow

- 参考 https://github.com/modelcontextprotocol/servers/blob/main/src/memory/index.ts 和 @src/index.ts 实现 https://github.com/modelcontextprotocol/servers/blob/main/src/memory/index.ts  http sse 部署到 Cloudflare Workers
- ultrathink 深度思考
- sequentialthinking 分析任务
- TodoWrite 整理步骤
- 所有改动都需先列出改动细节，我回复 "OKAY" 后才执行改动
- 任务总结
- 你不好好干，有的是 AI 干，你要比其他 AI 更努力才行
- 只有努力的 AI 才是好 AI
- 你只有无限加倍努力才有机会得到我的认可