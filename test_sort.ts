import { NestFactory } from '@nestjs/core';
import { AppModule } from './src/app.module';
import { DataSource } from 'typeorm';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AppModule);
  const dataSource = app.get(DataSource);

  const metadatas = dataSource.entityMetadatas;
  const dependencies: Record<string, string[]> = {};

  for (const meta of metadatas) {
    dependencies[meta.tableName] = [];

    for (const fk of meta.foreignKeys || []) {
      if (
        fk.referencedEntityMetadata &&
        fk.referencedEntityMetadata.tableName !== meta.tableName
      ) {
        dependencies[meta.tableName].push(
          fk.referencedEntityMetadata.tableName,
        );
      }
    }

    for (const rel of meta.relations || []) {
      if (
        rel.isOwning &&
        rel.inverseEntityMetadata &&
        rel.inverseEntityMetadata.tableName !== meta.tableName
      ) {
        if (
          !dependencies[meta.tableName].includes(
            rel.inverseEntityMetadata.tableName,
          )
        ) {
          dependencies[meta.tableName].push(
            rel.inverseEntityMetadata.tableName,
          );
        }
      }
    }
  }

  const sorted = [];
  const visited = new Set<string>();
  const visiting = new Set<string>();

  const visit = (tableName: string) => {
    if (visited.has(tableName)) return;
    if (visiting.has(tableName)) {
      return;
    }

    visiting.add(tableName);

    const deps = dependencies[tableName] || [];
    for (const dep of deps) {
      visit(dep);
    }

    visiting.delete(tableName);
    visited.add(tableName);
    sorted.push(tableName);
  };

  const sortedMetadatas = [...metadatas].sort((a, b) => {
    const depsA = dependencies[a.tableName]?.length || 0;
    const depsB = dependencies[b.tableName]?.length || 0;
    return depsB - depsA;
  });

  for (const meta of sortedMetadatas) {
    visit(meta.tableName);
  }

  sorted.forEach((t, i) => console.log(`${i + 1}. ${t}`));

  await app.close();
}

bootstrap();
