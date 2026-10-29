export const config = {
  port: Number(process.env.PORT ?? 4000),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '12h',
  taxRate: Number(process.env.TAX_RATE ?? 0.18),
  serviceChargeRate: Number(process.env.SERVICE_CHARGE_RATE ?? 0.10),
};

if (process.env.NODE_ENV === 'production' && config.jwtSecret === 'dev-only-secret-change-me') {
  throw new Error('Set JWT_SECRET before running in production.');
}
