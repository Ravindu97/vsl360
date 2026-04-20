import dotenv from 'dotenv';
dotenv.config();

function getRequiredEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
  DATABASE_URL: getRequiredEnv('DATABASE_URL'),
  JWT_SECRET: getRequiredEnv('JWT_SECRET'),
  JWT_REFRESH_SECRET: getRequiredEnv('JWT_REFRESH_SECRET'),
  UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
  DOCUMENT_LOGO_PATH: process.env.DOCUMENT_LOGO_PATH || '',
  DOCUMENT_INVOICE_LOGO_PATH: process.env.DOCUMENT_INVOICE_LOGO_PATH || '',
  DOCUMENT_THEME_PATH: process.env.DOCUMENT_THEME_PATH || '',
  DOCUMENT_LOGO_URL: process.env.DOCUMENT_LOGO_URL || '',
  DOCUMENT_INVOICE_LOGO_URL: process.env.DOCUMENT_INVOICE_LOGO_URL || '',
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  CORS_ORIGINS: (process.env.CORS_ORIGINS || process.env.CORS_ORIGIN || 'http://localhost:5173')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),
};
