import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyError } from 'fastify';
import sensible from '@fastify/sensible';
import helmet from '@fastify/helmet';
import {
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod';
import { env } from './config/env.js';
import { migrateDb } from './db/index.js';
import { registerCors } from './plugins/cors.js';
import { registerSwagger } from './plugins/swagger.js';
import { registerRateLimit } from './plugins/rate-limit.js';
import { registerAuth } from './plugins/auth.js';
import { requireUser } from './auth/require-user.js';
import { healthRoutes } from './routes/health.js';
import { bookRoutes } from './routes/books.js';
import { AppError } from './lib/errors.js';

export async function buildApp() {
  const app = Fastify({
    logger: {
      level: env.BACKEND_LOG_LEVEL,
      transport:
        env.NODE_ENV === 'development'
          ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'HH:MM:ss' } }
          : undefined,
    },
    disableRequestLogging: false,
    requestIdHeader: 'x-request-id',
    trustProxy: true,
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  app.setErrorHandler((error, req, reply) => {
    req.log.error({ err: error }, 'request failed');
    if (error instanceof AppError) {
      return reply.code(error.statusCode).send({
        error: error.code,
        message: error.message,
        details: error.details,
        requestId: req.id,
      });
    }
    const fastifyError = error as FastifyError;
    const status = fastifyError.statusCode ?? 500;
    return reply.code(status).send({
      error: fastifyError.name,
      message: status >= 500 ? 'Internal server error' : fastifyError.message,
      requestId: req.id,
    });
  });

  await app.register(helmet, { contentSecurityPolicy: env.NODE_ENV === 'production' });
  await app.register(sensible);
  await registerRateLimit(app);
  await registerCors(app);
  await registerSwagger(app);

  await app.register(healthRoutes);
  await registerAuth(app);
  await app.register(
    async (protectedScope) => {
      protectedScope.addHook('preHandler', requireUser);
      await protectedScope.register(bookRoutes);
    },
    { prefix: '/api/v1' },
  );

  return app;
}

async function main() {
  if (env.NODE_ENV !== 'production') {
    await migrateDb();
  }
  const app = await buildApp();
  try {
    await app.listen({ host: env.BACKEND_HOST, port: env.BACKEND_PORT });
  } catch (err) {
    app.log.error({ err }, 'failed to start server');
    process.exit(1);
  }
}

const entrypoint = process.argv[1]
  ? fileURLToPath(`file://${process.argv[1].replace(/\\/g, '/')}`)
  : '';
const isMain = entrypoint === fileURLToPath(import.meta.url);
if (isMain || process.env.DREAM_LIBRARY_FORCE_START === '1') {
  main();
}
