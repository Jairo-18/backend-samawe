import { config } from 'dotenv';
import { DataSource } from 'typeorm';

config();

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: [`${__dirname}/src/**/*.entity.{ts,js}`],
  migrations: [`${__dirname}/src/migrations/*.{ts,js}`],
  synchronize: false,
  ssl: {
    // Es buena idea añadir esto para Supabase
    rejectUnauthorized: false,
  },
});
