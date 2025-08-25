import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

// Properly handle SSL configuration
const sslEnabled = process.env.DB_SSL === 'true';

const dataSourceConfig: any = {
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  entities: [`${__dirname}/src/**/*.entity.{ts,js}`],
  migrations: [`${__dirname}/src/migrations/*.{ts,js}`],
  synchronize: false,
};

// Only add SSL configuration if enabled
if (sslEnabled) {
  dataSourceConfig.ssl = {
    rejectUnauthorized: false, // For development environments
  };
}

export default new DataSource(dataSourceConfig);
