import cors from "@fastify/cors";
import rateLimit from "@fastify/rate-limit";
import Fastify, { type FastifyInstance } from "fastify";
import { z } from "zod";
import {
  AppProfileSchema,
  CreateInviteSchema,
  SharingPolicySchema,
  StepSnapshotSchema,
  SyncEnvelopeSchema,
} from "@bodyfitness/contracts";
import { createAuthenticator, type Authenticate } from "./auth.js";
import { MemoryRepository, RepositoryError, type Repository } from "./repository.js";

declare module "fastify" {
  interface FastifyRequest {
    userId: string;
  }
}

export interface BuildAppOptions {
  repository?: Repository;
  authenticate?: Authenticate;
  logger?: boolean;
  webAppUrl?: string;
  allowedOrigins?: string[];
}

export async function buildApp(options: BuildAppOptions = {}): Promise<FastifyInstance> {
  const app = Fastify({ logger: options.logger ?? false, trustProxy: true });
  const repository = options.repository ?? new MemoryRepository();
  const authenticate = options.authenticate ?? createAuthenticator();
  const webAppUrl = options.webAppUrl ?? process.env.WEB_APP_URL ?? "http://localhost:3000";
  const allowedOrigins = options.allowedOrigins ?? (process.env.ALLOWED_ORIGINS ?? webAppUrl).split(",").map((item) => item.trim()).filter(Boolean);

  await app.register(cors, {
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) callback(null, true);
      else callback(new Error("Origin is not allowed"), false);
    },
    allowedHeaders: ["Authorization", "Content-Type", "Idempotency-Key", "X-Dev-User-Id"],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  });
  await app.register(rateLimit, { max: 240, timeWindow: "1 minute" });

  app.decorateRequest("userId", "");
  app.addHook("onRequest", async (request, reply) => {
    if (!request.url.startsWith("/v1/")) return;
    try {
      request.userId = await authenticate(request.headers);
      await repository.ensureUser(request.userId);
    } catch {
      return reply.code(401).send({ error: "AUTH_REQUIRED", message: "Sign in is required for cloud features", requestId: request.id });
    }
  });

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof RepositoryError) {
      return reply.code(error.statusCode).send({ error: error.code, message: error.message, requestId: request.id });
    }
    if (error instanceof z.ZodError) {
      return reply.code(400).send({ error: "VALIDATION_ERROR", message: error.issues[0]?.message ?? "Invalid request", requestId: request.id });
    }
    request.log.error(error);
    return reply.code(500).send({ error: "INTERNAL_ERROR", message: "The request could not be completed", requestId: request.id });
  });

  app.get("/health", async () => ({ status: "ok", service: "bodyfitness-api", time: new Date().toISOString() }));

  app.get("/v1/me/profile", async (request) => repository.getProfile(request.userId));
  app.put("/v1/me/profile", async (request) => repository.updateProfile(request.userId, AppProfileSchema.parse(request.body)));
  app.delete("/v1/me", async (request) => { await repository.deleteAccount(request.userId); return { ok: true }; });

  app.post("/v1/sync/batch", async (request) => repository.sync(request.userId, SyncEnvelopeSchema.parse(request.body)));

  app.post("/v1/devices", async (request) => {
    const body = z.object({ id: z.string().min(1), platform: z.enum(["web", "ios", "android"]), label: z.string().min(1).max(80), pushToken: z.string().nullable().optional() }).parse(request.body);
    await repository.registerDevice(request.userId, body);
    return { ok: true };
  });

  app.post("/v1/health/steps", async (request) => repository.upsertSteps(request.userId, StepSnapshotSchema.parse(request.body)));
  app.get("/v1/health/steps", async (request) => {
    const query = z.object({ date: z.string().date().optional() }).parse(request.query);
    return repository.getSteps(request.userId, query.date);
  });
  app.get("/v1/achievements", async (request) => repository.getAchievements(request.userId));

  app.post("/v1/invites", { config: { rateLimit: { max: 12, timeWindow: "1 hour" } } }, async (request) => {
    const body = CreateInviteSchema.parse(request.body ?? {});
    return repository.createInvite(request.userId, body.handle, webAppUrl);
  });
  app.post<{ Params: { token: string } }>("/v1/invites/:token/accept", async (request) => repository.acceptInvite(request.userId, request.params.token));

  app.get("/v1/circle", async (request) => repository.getCircle(request.userId));
  app.get<{ Params: { userId: string } }>("/v1/circle/:userId", async (request, reply) => {
    const circle = await repository.getCircle(request.userId);
    const member = circle.members.find((item) => item.connection.userId === request.params.userId);
    if (!member) return reply.code(404).send({ error: "CONNECTION_NOT_FOUND", message: "Connection not found", requestId: request.id });
    return member;
  });
  app.put<{ Params: { id: string } }>("/v1/connections/:id/sharing", async (request) => {
    await repository.updateSharing(request.userId, request.params.id, SharingPolicySchema.parse(request.body));
    return { ok: true };
  });
  app.delete<{ Params: { id: string } }>("/v1/connections/:id", async (request) => {
    await repository.removeConnection(request.userId, request.params.id);
    return { ok: true };
  });
  app.post<{ Params: { id: string } }>("/v1/connections/:id/block", async (request) => {
    await repository.blockConnection(request.userId, request.params.id);
    return { ok: true };
  });
  app.post("/v1/reports", { config: { rateLimit: { max: 10, timeWindow: "1 day" } } }, async (request) => {
    const body = z.object({ userId: z.string().min(1), reason: z.string().min(5).max(500) }).parse(request.body);
    await repository.reportUser(request.userId, body.userId, body.reason);
    return { ok: true };
  });

  return app;
}
