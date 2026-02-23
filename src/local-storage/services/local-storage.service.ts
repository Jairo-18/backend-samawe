import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

@Injectable()
export class LocalStorageService {
  /**
   * Directorio base donde se guardan las imágenes.
   * En producción: /app/uploads (volumen persistente en Dokploy → /var/lib/dokploy/samawe-storage)
   * En desarrollo: ./uploads (relativo al cwd)
   */
  private readonly uploadsDir: string;

  /**
   * URL base pública del servidor (e.g. https://api.ecohotelsamawe.com)
   */
  private readonly baseUrl: string;

  constructor(private readonly configService: ConfigService) {
    this.uploadsDir =
      process.platform === 'win32'
        ? path.join(process.cwd(), 'uploads')
        : '/app/uploads';

    const configuredUrl = this.configService.get<string>('APP_BASE_URL');
    this.baseUrl =
      configuredUrl ||
      `http://localhost:${this.configService.get<number>('app.port') || 3000}`;
  }

  /**
   * Guarda un archivo en disco y retorna la información para la BD.
   * @param file   - Archivo de multer (con buffer en memoria)
   * @param folder - Subcarpeta lógica: 'products' | 'accommodations' | 'excursions'
   * @returns { imageUrl, publicId }
   */
  async saveImage(
    file: Express.Multer.File,
    folder: string,
  ): Promise<{ imageUrl: string; publicId: string }> {
    if (!file || !file.buffer) {
      throw new InternalServerErrorException('Archivo no válido o vacío');
    }

    // Validar tipo MIME
    const allowedMimeTypes = [
      'image/jpeg',
      'image/png',
      'image/webp',
      'image/gif',
    ];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new InternalServerErrorException(
        'Tipo de archivo no permitido. Solo se aceptan: jpg, png, webp, gif',
      );
    }

    // Crear directorio si no existe
    const targetDir = path.join(this.uploadsDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    // Generar nombre único para el archivo (siempre será webp para optimizar tamaño)
    const filename = `${uuidv4()}.webp`;
    const filePath = path.join(targetDir, filename);

    // Comprobar si pesa más de 2MB (2 * 1024 * 1024 bytes)
    const isLargeFile = file.buffer.length > 2 * 1024 * 1024;

    // Guardar el archivo en disco optimizado con sharp
    try {
      if (isLargeFile) {
        // Optimización agresiva: imagen > 2MB
        await sharp(file.buffer)
          .webp({ quality: 80, effort: 4 })
          .resize({ width: 1920, withoutEnlargement: true })
          .toFile(filePath);
      } else {
        // Optimización suave: imagen <= 2MB
        await sharp(file.buffer)
          .webp({ quality: 95 }) // Mantiene alta calidad
          .toFile(filePath);
      }
    } catch (error) {
      console.error('Error optimizando o guardando imagen en disco:', error);
      throw new InternalServerErrorException(
        'Error al optimizar y guardar la imagen',
      );
    }

    // publicId = ruta relativa (folder/filename) → usado para eliminar el archivo
    const publicId = `${folder}/${filename}`;

    // imageUrl = URL pública accesible desde el frontend
    const imageUrl = `${this.baseUrl}/uploads/${publicId}`;

    return { imageUrl, publicId };
  }

  /**
   * Elimina un archivo del disco usando su publicId (ruta relativa al uploadsDir).
   * @param publicId - e.g. 'products/uuid.jpg'
   */
  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;

    const filePath = path.join(this.uploadsDir, publicId);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error eliminando imagen del disco:', error);
      // No bloqueamos el flujo si el archivo ya no existe
    }
  }

  // getExtension ya no se utiliza porque forzamos webp, se puede quitar
}
