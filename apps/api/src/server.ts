import { buildApp } from "./app.js";
import { MemoryRepository } from "./repository.js";
import { PostgresRepository } from "./postgres-repository.js";

const databaseUrl = process.env.DATABASE_URL;
if (process.env.NODE_ENV === "production" && !databaseUrl) {
  throw new Error("DATABASE_URL is required in production");
}

const repository = databaseUrl ? new PostgresRepository(databaseUrl) : new MemoryRepository();
const app = await buildApp({ repository, logger: true });
const port = Number(process.env.PORT ?? 4000);
const host = process.env.HOST ?? "0.0.0.0";

await app.listen({ port, host });

const shutdown = async () => {
  await app.close();
  if (repository instanceof PostgresRepository) await repository.close();
};
process.on("SIGTERM", () => void shutdown());
process.on("SIGINT", () => void shutdown());
