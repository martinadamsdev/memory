# Memory Server - MCP Knowledge Graph on Cloudflare Workers

A Model Context Protocol (MCP) server that provides persistent knowledge graph management, deployed on Cloudflare Workers with Durable Objects for state management.

## Features

This Memory Server implements a knowledge graph system with the following capabilities:

- **Entity Management**: Create and manage entities with names, types, and observations
- **Relationship Tracking**: Define connections between entities with typed relationships
- **Observation System**: Add and manage observations for each entity
- **Search & Query**: Search nodes by name, type, or observation content
- **Persistent Storage**: Uses Cloudflare Durable Objects SQL for data persistence

## Available Tools

The server exposes the following MCP tools:

- `create_entities` - Create new entities in the knowledge graph
- `create_relations` - Define relationships between entities
- `add_observations` - Add observations to existing entities
- `delete_entities` - Remove entities and their relationships
- `delete_observations` - Remove specific observations from entities
- `delete_relations` - Remove relationships between entities
- `read_graph` - Read the entire knowledge graph
- `search_nodes` - Search for entities by query string
- `open_nodes` - Retrieve specific entities by name

## Deployment

Deploy your Memory Server to Cloudflare Workers:

```bash
npm run deploy
```

This will deploy to: `https://memory.<your-account>.workers.dev/mcp`

## Development

Start the development server locally:

```bash
npm run dev
```

## Connect to Cloudflare AI Playground

Connect to your Memory Server from the Cloudflare AI Playground:

1. Go to https://playground.ai.cloudflare.com/
2. Enter your deployed MCP server URL: `memory.<your-account>.workers.dev/mcp`
3. Use the knowledge graph tools directly from the playground

## Connect to Claude Desktop

To connect from Claude Desktop using [mcp-remote proxy](https://www.npmjs.com/package/mcp-remote):

```json
{
  "mcpServers": {
    "memory": {
      "command": "npx",
      "args": [
        "mcp-remote",
        "https://memory.<your-account>.workers.dev/mcp"
      ]
    }
  }
}
```

## Architecture

- **MCP Agent**: Extends `McpAgent` from the agents library for MCP protocol support
- **Durable Objects**: Uses Cloudflare Durable Objects with SQL storage for persistence
- **Knowledge Graph**: Implements entities and relations with full CRUD operations
- **MCP Transport**: Supports both SSE (Server-Sent Events) and standard HTTP for MCP communication

## Example Usage

Once connected, you can use natural language to interact with the knowledge graph:

- "Create an entity for 'John Doe' as a person"
- "Add an observation that John likes programming"
- "Create a relationship between John and his project"
- "Search for all entities related to programming"
- "Show me the entire knowledge graph" 
