export default () => ({
  app: {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    publicUrl: process.env.LUMI_PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? '3000'}`,
    frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:4200',
  },
  database: {
    url: process.env.DATABASE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    refreshSecret: process.env.JWT_REFRESH_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.REFRESH_TOKEN_EXPIRES_IN ?? '7d',
  },
  bcrypt: {
    saltRounds: parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10),
  },
  throttle: {
    ttl: parseInt(process.env.THROTTLE_TTL ?? '60000', 10),
    limit: parseInt(process.env.THROTTLE_LIMIT ?? '100', 10),
    authLimit: parseInt(process.env.THROTTLE_AUTH_LIMIT ?? '10', 10),
  },
  logs: {
    level: process.env.LOG_LEVEL ?? 'debug',
    prismaLogQueries: process.env.PRISMA_LOG_QUERIES === 'true',
  },
  smtp: {
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT ?? '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.EMAIL_USER,
    password: process.env.EMAIL_PASSWORD,
    fromName: process.env.SMTP_FROM_NAME,
    fromEmail: process.env.SMTP_FROM_EMAIL,
  },
});
