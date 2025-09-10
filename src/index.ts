import { McpAgent } from "agents/mcp";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

interface Entity {
	name: string;
	entityType: string;
	observations: string[];
}

interface Relation {
	from: string;
	to: string;
	relationType: string;
}

interface KnowledgeGraph {
	entities: Entity[];
	relations: Relation[];
}

class KnowledgeGraphManager {
	private sql: <T = Record<string, string | number | boolean | null>>(
		strings: TemplateStringsArray,
		...values: (string | number | boolean | null)[]
	) => T[];

	constructor(
		sql: <T = Record<string, string | number | boolean | null>>(
			strings: TemplateStringsArray,
			...values: (string | number | boolean | null)[]
		) => T[],
	) {
		this.sql = sql;
	}

	async init() {
		this.sql`
			CREATE TABLE IF NOT EXISTS entities (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				name TEXT UNIQUE NOT NULL,
				entity_type TEXT NOT NULL,
				observations TEXT NOT NULL
			)
		`;

		this.sql`
			CREATE TABLE IF NOT EXISTS relations (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				from_entity TEXT NOT NULL,
				to_entity TEXT NOT NULL,
				relation_type TEXT NOT NULL,
				UNIQUE(from_entity, to_entity, relation_type)
			)
		`;
	}

	async createEntities(entities: Entity[]): Promise<Entity[]> {
		const newEntities: Entity[] = [];

		for (const entity of entities) {
			const existing = this.sql<{
				name: string;
			}>`SELECT * FROM entities WHERE name = ${entity.name}`;

			if (existing.length === 0) {
				this
					.sql`INSERT INTO entities (name, entity_type, observations) VALUES (${entity.name}, ${entity.entityType}, ${JSON.stringify(entity.observations)})`;
				newEntities.push(entity);
			}
		}

		return newEntities;
	}

	async createRelations(relations: Relation[]): Promise<Relation[]> {
		const newRelations: Relation[] = [];

		for (const relation of relations) {
			const existing = this
				.sql`SELECT * FROM relations WHERE from_entity = ${relation.from} AND to_entity = ${relation.to} AND relation_type = ${relation.relationType}`;
			if (existing.length === 0) {
				this
					.sql`INSERT INTO relations (from_entity, to_entity, relation_type) VALUES (${relation.from}, ${relation.to}, ${relation.relationType})`;
				newRelations.push(relation);
			}
		}

		return newRelations;
	}

	async addObservations(
		observations: { entityName: string; contents: string[] }[],
	): Promise<{ entityName: string; addedObservations: string[] }[]> {
		const results: { entityName: string; addedObservations: string[] }[] = [];

		for (const obs of observations) {
			const entityRows = this.sql<{
				observations: string;
			}>`SELECT observations FROM entities WHERE name = ${obs.entityName}`;

			const entity = entityRows[0];

			if (!entity) {
				throw new Error(`Entity with name ${obs.entityName} not found`);
			}

			const currentObservations: string[] = JSON.parse(entity.observations);
			const newObservations = obs.contents.filter(
				(content) => !currentObservations.includes(content),
			);

			if (newObservations.length > 0) {
				currentObservations.push(...newObservations);
				this
					.sql`UPDATE entities SET observations = ${JSON.stringify(currentObservations)} WHERE name = ${obs.entityName}`;
				results.push({
					entityName: obs.entityName,
					addedObservations: newObservations,
				});
			} else {
				results.push({ entityName: obs.entityName, addedObservations: [] });
			}
		}

		return results;
	}

	async deleteEntities(entityNames: string[]): Promise<void> {
		for (const name of entityNames) {
			this.sql`DELETE FROM entities WHERE name = ${name}`;
			this
				.sql`DELETE FROM relations WHERE from_entity = ${name} OR to_entity = ${name}`;
		}
	}

	async deleteObservations(
		deletions: { entityName: string; observations: string[] }[],
	): Promise<void> {
		for (const del of deletions) {
			const entityRows = this.sql<{
				observations: string;
			}>`SELECT observations FROM entities WHERE name = ${del.entityName}`;

			const entity = entityRows[0];

			if (entity) {
				const currentObservations: string[] = JSON.parse(entity.observations);
				const updatedObservations = currentObservations.filter(
					(o) => !del.observations.includes(o),
				);

				this
					.sql`UPDATE entities SET observations = ${JSON.stringify(updatedObservations)} WHERE name = ${del.entityName}`;
			}
		}
	}

	async deleteRelations(relations: Relation[]): Promise<void> {
		for (const relation of relations) {
			this
				.sql`DELETE FROM relations WHERE from_entity = ${relation.from} AND to_entity = ${relation.to} AND relation_type = ${relation.relationType}`;
		}
	}

	async readGraph(): Promise<KnowledgeGraph> {
		const entityRows = this.sql<{
			name: string;
			entity_type: string;
			observations: string;
		}>`SELECT * FROM entities`;
		const entities = entityRows.map((row) => ({
			name: row.name,
			entityType: row.entity_type,
			observations: JSON.parse(row.observations),
		}));

		const relationRows = this.sql<{
			from_entity: string;
			to_entity: string;
			relation_type: string;
		}>`SELECT * FROM relations`;
		const relations = relationRows.map((row) => ({
			from: row.from_entity,
			to: row.to_entity,
			relationType: row.relation_type,
		}));

		return { entities, relations };
	}

	async searchNodes(query: string): Promise<KnowledgeGraph> {
		const lowerQuery = query.toLowerCase();
		const graph = await this.readGraph();

		const filteredEntities = graph.entities.filter(
			(e) =>
				e.name.toLowerCase().includes(lowerQuery) ||
				e.entityType.toLowerCase().includes(lowerQuery) ||
				e.observations.some((o) => o.toLowerCase().includes(lowerQuery)),
		);

		const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));

		const filteredRelations = graph.relations.filter(
			(r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to),
		);

		return {
			entities: filteredEntities,
			relations: filteredRelations,
		};
	}

	async openNodes(names: string[]): Promise<KnowledgeGraph> {
		const graph = await this.readGraph();

		const filteredEntities = graph.entities.filter((e) =>
			names.includes(e.name),
		);
		const filteredEntityNames = new Set(filteredEntities.map((e) => e.name));

		const filteredRelations = graph.relations.filter(
			(r) => filteredEntityNames.has(r.from) && filteredEntityNames.has(r.to),
		);

		return {
			entities: filteredEntities,
			relations: filteredRelations,
		};
	}
}

export class Memory extends McpAgent {
	private knowledgeGraphManager?: KnowledgeGraphManager;

	server = new McpServer({
		name: "Memory Server",
		version: "1.0.0",
	});

	async init() {
		this.knowledgeGraphManager = new KnowledgeGraphManager(this.sql);
		await this.knowledgeGraphManager.init();

		// Define Zod schemas for tool inputs
		const EntitySchema = z.object({
			name: z.string(),
			entityType: z.string(),
			observations: z.array(z.string()),
		});

		const RelationSchema = z.object({
			from: z.string(),
			to: z.string(),
			relationType: z.string(),
		});

		const ObservationSchema = z.object({
			entityName: z.string(),
			contents: z.array(z.string()),
		});

		const DeletionSchema = z.object({
			entityName: z.string(),
			observations: z.array(z.string()),
		});

		// Register create_entities tool
		this.server.tool(
			"create_entities",
			{ entities: z.array(EntitySchema) },
			async ({ entities }) => {
				const created =
					await this.knowledgeGraphManager!.createEntities(entities);
				return {
					content: [{ type: "text", text: JSON.stringify(created, null, 2) }],
				};
			},
		);

		// Register create_relations tool
		this.server.tool(
			"create_relations",
			{ relations: z.array(RelationSchema) },
			async ({ relations }) => {
				const created =
					await this.knowledgeGraphManager!.createRelations(relations);
				return {
					content: [{ type: "text", text: JSON.stringify(created, null, 2) }],
				};
			},
		);

		// Register add_observations tool
		this.server.tool(
			"add_observations",
			{ observations: z.array(ObservationSchema) },
			async ({ observations }) => {
				const added =
					await this.knowledgeGraphManager!.addObservations(observations);
				return {
					content: [{ type: "text", text: JSON.stringify(added, null, 2) }],
				};
			},
		);

		// Register delete_entities tool
		this.server.tool(
			"delete_entities",
			{ entityNames: z.array(z.string()) },
			async ({ entityNames }) => {
				await this.knowledgeGraphManager!.deleteEntities(entityNames);
				return {
					content: [{ type: "text", text: "Entities deleted successfully" }],
				};
			},
		);

		// Register delete_observations tool
		this.server.tool(
			"delete_observations",
			{ deletions: z.array(DeletionSchema) },
			async ({ deletions }) => {
				await this.knowledgeGraphManager!.deleteObservations(deletions);
				return {
					content: [
						{ type: "text", text: "Observations deleted successfully" },
					],
				};
			},
		);

		// Register delete_relations tool
		this.server.tool(
			"delete_relations",
			{ relations: z.array(RelationSchema) },
			async ({ relations }) => {
				await this.knowledgeGraphManager!.deleteRelations(relations);
				return {
					content: [{ type: "text", text: "Relations deleted successfully" }],
				};
			},
		);

		// Register read_graph tool
		this.server.tool("read_graph", {}, async () => {
			const graph = await this.knowledgeGraphManager!.readGraph();
			return {
				content: [{ type: "text", text: JSON.stringify(graph, null, 2) }],
			};
		});

		// Register search_nodes tool
		this.server.tool(
			"search_nodes",
			{ query: z.string() },
			async ({ query }) => {
				const results = await this.knowledgeGraphManager!.searchNodes(query);
				return {
					content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
				};
			},
		);

		// Register open_nodes tool
		this.server.tool(
			"open_nodes",
			{ names: z.array(z.string()) },
			async ({ names }) => {
				const results = await this.knowledgeGraphManager!.openNodes(names);
				return {
					content: [{ type: "text", text: JSON.stringify(results, null, 2) }],
				};
			},
		);
	}
}

export default {
	fetch(request: Request, env: Env, ctx: ExecutionContext) {
		const url = new URL(request.url);

		if (url.pathname === "/sse" || url.pathname === "/sse/message") {
			return Memory.serveSSE("/sse").fetch(request, env, ctx);
		}

		if (url.pathname === "/mcp") {
			return Memory.serve("/mcp").fetch(request, env, ctx);
		}

		return new Response("Not found", { status: 404 });
	},
};
