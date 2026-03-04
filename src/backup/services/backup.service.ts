import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import archiver from 'archiver';
import * as path from 'path';
import * as fs from 'fs';
import { Response } from 'express';

@Injectable()
export class BackupService {
  constructor(private readonly dataSource: DataSource) {}

  async generateBackup(res: Response) {
    try {
      const sqlDump = await this.generateSqlDump();

      const archive = archiver('zip', {
        zlib: { level: 9 },
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename=samawe-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`,
      );

      archive.pipe(res);

      archive.append(sqlDump, { name: 'data.sql' });

      const uploadsDir =
        process.platform === 'win32'
          ? path.join(process.cwd(), 'uploads')
          : '/app/uploads';

      if (fs.existsSync(uploadsDir)) {
        archive.directory(uploadsDir, 'uploads');
      } else {
        console.warn(`Uploads directory not found at: ${uploadsDir}`);
      }

      await archive.finalize();
    } catch (error) {
      console.error('Backup creation failed:', error);
      if (!res.headersSent) {
        res.status(500).send('Failed to generate backup');
      }
    }
  }

  private async generateSqlDump(): Promise<string> {
    const metadatas = this.dataSource.entityMetadatas;
    const sortedMetadatas = this.topologicalSort(metadatas);

    let sql = '-- Samawe Database Dump (Topological Order)\n';
    sql += `-- Generated at: ${new Date().toISOString()}\n\n`;

    sql += `SET session_replication_role = 'replica';\n\n`;

    for (const meta of sortedMetadatas) {
      const records = await this.dataSource.query(
        `SELECT * FROM "${meta.tableName}"`,
      );
      if (records.length === 0) continue;

      sql += `-- Table: ${meta.tableName}\n`;

      for (const record of records) {
        const columns = Object.keys(record);
        const values = Object.values(record).map((val) =>
          this.escapeSqlValue(val),
        );

        sql += `INSERT INTO "${meta.tableName}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      sql += '\n';
    }

    // Reactiva la verificación de llaves foráneas
    sql += `SET session_replication_role = 'origin';\n`;

    return sql;
  }

  private escapeSqlValue(value: any): string {
    if (value === null || value === undefined) {
      return 'NULL';
    }
    if (typeof value === 'boolean') {
      return value ? 'true' : 'false';
    }
    if (typeof value === 'number') {
      return value.toString();
    }
    if (value instanceof Date) {
      return `'${value.toISOString()}'`;
    }
    if (typeof value === 'object') {
      return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
    }

    return `'${String(value).replace(/'/g, "''")}'`;
  }

  private topologicalSort(metadatas: any[]): any[] {
    const sorted = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (meta: any) => {
      if (visited.has(meta.name)) return;
      if (visiting.has(meta.name)) {
        return;
      }

      visiting.add(meta.name);

      for (const fk of meta.foreignKeys) {
        const referencedMeta = fk.referencedEntityMetadata;
        if (referencedMeta && referencedMeta.name !== meta.name) {
          visit(referencedMeta);
        }
      }

      visiting.delete(meta.name);
      visited.add(meta.name);
      sorted.push(meta);
    };

    for (const meta of metadatas) {
      visit(meta);
    }

    return sorted;
  }
}
