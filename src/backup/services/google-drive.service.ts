import { Injectable, Logger } from '@nestjs/common';
import { google } from 'googleapis';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

@Injectable()
export class GoogleDriveService {
  private readonly logger = new Logger(GoogleDriveService.name);
  private drive;

  constructor(private configService: ConfigService) {
    const clientId = this.configService.get<string>('GOOGLE_DRIVE_CLIENT_ID');
    const clientSecret = this.configService.get<string>(
      'GOOGLE_DRIVE_CLIENT_SECRET',
    );
    const refreshToken = this.configService.get<string>(
      'GOOGLE_DRIVE_REFRESH_TOKEN',
    );

    if (!clientId || !clientSecret || !refreshToken) {
      this.logger.error('Google Drive OAuth2 credentials are not configured');
      return;
    }

    try {
      const oauth2Client = new google.auth.OAuth2(clientId, clientSecret);

      oauth2Client.setCredentials({
        refresh_token: refreshToken,
      });

      this.drive = google.drive({ version: 'v3', auth: oauth2Client });
      this.logger.log('Google Drive OAuth2 client initialized');
    } catch (error) {
      this.logger.error(`Error creating OAuth2 client: ${error.message}`);
    }
  }

  async uploadFile(fileStream: Readable, fileName: string): Promise<string> {
    if (!this.drive) {
      throw new Error('Google Drive client not initialized');
    }

    const folderId = this.configService.get<string>('GOOGLE_DRIVE_FOLDER_ID');

    try {
      const response = await this.drive.files.create({
        requestBody: {
          name: fileName,
          parents:
            folderId && folderId !== 'TU_ID_DE_CARPETA_AQUI' ? [folderId] : [],
        },
        media: {
          mimeType: 'application/zip',
          body: fileStream,
        },
      });

      return response.data.id;
    } catch (error) {
      this.logger.error(
        `Failed to upload file to Google Drive: ${error.message}`,
      );
      if (error.opensslErrorStack) {
        this.logger.error(
          `OpenSSL Error: ${JSON.stringify(error.opensslErrorStack)}`,
        );
      }
      throw error;
    }
  }
}
