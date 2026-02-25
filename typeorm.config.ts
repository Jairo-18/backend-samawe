import { config } from 'dotenv';
import { DataSource } from 'typeorm';

const envFile =
  process.env.NODE_ENV === 'production'
    ? '.env.production'
    : '.env.development';

config({ path: envFile });

const isLocal =
  process.env.DB_HOST === 'localhost' || process.env.DB_HOST === '127.0.0.1';
const sslEnabled = process.env.DB_SSL === 'true' && !isLocal;

const backendDir = __dirname;

const dataSourceConfig: any = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432'),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [`${backendDir}/src/**/*.entity.{ts,js}`],
  migrations: [`${backendDir}/src/migrations/*.{ts,js}`],
  synchronize: false,
  logging: process.env.NODE_ENV === 'development',
  extra: { max: 10, keepAlive: true },
};

if (sslEnabled) {
  dataSourceConfig.ssl = true;
  dataSourceConfig.extra = {
    ...dataSourceConfig.extra,
    ssl: {
      rejectUnauthorized: false,
    },
  };
}

export const AppDataSource = new DataSource(dataSourceConfig);
