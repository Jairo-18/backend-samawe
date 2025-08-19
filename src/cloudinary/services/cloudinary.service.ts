import { Injectable, Inject } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor(
    @Inject('CLOUDINARY') private readonly cloudinaryClient: typeof cloudinary,
  ) {}

  /**
   * Subir imagen a Cloudinary
   */
  async uploadImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<UploadApiResponse> {
    // Verificar que el archivo existe
    if (!file || !file.buffer) {
      throw new Error('Archivo no válido o vacío');
    }

    return new Promise((resolve, reject) => {
      this.cloudinaryClient.uploader
        .upload_stream(
          {
            folder,
            resource_type: 'auto',
            quality: 'auto',
            fetch_format: 'auto',
          },
          (error: UploadApiErrorResponse, result: UploadApiResponse) => {
            if (error) {
              console.error('Error subiendo a Cloudinary:', error);
              return reject(error);
            }

            resolve(result);
          },
        )
        .end(file.buffer);
    });
  }

  /**
   * Eliminar imagen por public_id
   */
  async deleteImage(publicId: string): Promise<{ result: string }> {
    if (!publicId) {
      throw new Error('Public ID es requerido');
    }

    return new Promise((resolve, reject) => {
      this.cloudinaryClient.uploader.destroy(publicId, (error, result) => {
        if (error) {
          console.error('Error eliminando de Cloudinary:', error);
          return reject(error);
        }

        resolve(result);
      });
    });
  }
}
