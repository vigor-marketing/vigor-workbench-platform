export const config = {
  port: Number.parseInt(process.env.PORT ?? '4000', 10),
  databaseUrl: process.env.DATABASE_URL,
  demoMode: (process.env.DEMO_MODE ?? 'true') === 'true',
  allowedOrigins: (process.env.ALLOWED_ORIGINS ?? 'http://localhost:4173').split(',').map(value => value.trim()).filter(Boolean),
}
