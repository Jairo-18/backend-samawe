import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import archiver from 'archiver';
import * as path from 'path';
import * as fs from 'fs';
import { Response } from 'express';
import { GoogleDriveService } from './google-drive.service';
import { PassThrough } from 'stream';

@Injectable()
export class BackupService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly googleDriveService: GoogleDriveService,
  ) {}

  async generateBackup(res: Response) {
    try {
      const { archive, filename } = await this.createBackupStream();

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename=${filename}`);

      archive.pipe(res);
      await archive.finalize();
    } catch (error) {
      console.error('Backup creation failed:', error);
      if (!res.headersSent) {
        res.status(500).send('Failed to generate backup');
      }
    }
  }

  async createBackupStream(): Promise<{
    archive: archiver.Archiver;
    filename: string;
  }> {
    const sqlDump = await this.generateSqlDump();

    const archive = archiver('zip', {
      zlib: { level: 9 },
    });

    const filename = `samawe-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.zip`;

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

    return { archive, filename };
  }

  async executeFullBackupAndUpload(): Promise<string> {
    const { archive, filename } = await this.createBackupStream();

    const passThrough = new PassThrough();
    archive.pipe(passThrough);

    const uploadPromise = this.googleDriveService.uploadFile(
      passThrough,
      filename,
    );

    await archive.finalize();
    return uploadPromise;
  }

  private async generateSqlDump(): Promise<string> {
    const metadatas = this.dataSource.entityMetadatas;
    const sortedMetadatas = this.topologicalSort(metadatas);

    let sql = '-- Samawe Database Dump (Topological Order)\n';
    sql += `-- Generated at: ${new Date().toISOString()}\n\n`;

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
    const dependencies: Record<string, string[]> = {};

    for (const meta of metadatas) {
      dependencies[meta.name] = [];

      for (const fk of meta.foreignKeys || []) {
        if (
          fk.referencedEntityMetadata &&
          fk.referencedEntityMetadata.name !== meta.name
        ) {
          dependencies[meta.name].push(fk.referencedEntityMetadata.name);
        }
      }

      for (const rel of meta.relations || []) {
        if (
          rel.isOwning &&
          rel.inverseEntityMetadata &&
          rel.inverseEntityMetadata.name !== meta.name
        ) {
          if (
            !dependencies[meta.name].includes(rel.inverseEntityMetadata.name)
          ) {
            dependencies[meta.name].push(rel.inverseEntityMetadata.name);
          }
        }
      }
    }

    const sorted = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (metaName: string) => {
      if (visited.has(metaName)) return;
      if (visiting.has(metaName)) {
        return;
      }

      visiting.add(metaName);

      const deps = dependencies[metaName] || [];
      for (const dep of deps) {
        visit(dep);
      }

      visiting.delete(metaName);
      visited.add(metaName);

      const actualMeta = metadatas.find((m) => m.name === metaName);
      if (actualMeta) sorted.push(actualMeta);
    };

    const sortedMetadatas = [...metadatas].sort((a, b) => {
      const depsA = dependencies[a.name]?.length || 0;
      const depsB = dependencies[b.name]?.length || 0;
      return depsB - depsA;
    });

    for (const meta of sortedMetadatas) {
      visit(meta.name);
    }

    return sorted;
  }
}
