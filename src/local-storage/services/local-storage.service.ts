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
    // win32 = la app corre en la máquina del desarrollador; si no, en el
    // contenedor. Es el mismo criterio que se usa abajo para la URL pública.
    const isLocalMachine = process.platform === 'win32';

    this.uploadsDir = isLocalMachine
      ? path.join(process.cwd(), 'uploads')
      : '/app/uploads';

    const port = this.configService.get<number>('app.port') || 3000;
    const localUrl = `http://localhost:${port}`;
    const configuredUrl = this.configService.get<string>('APP_BASE_URL');

    // El disco y la URL pública TIENEN que apuntar al mismo sitio. Corriendo en
    // local los archivos se guardan en ./uploads y los sirve este mismo proceso
    // (ServeStaticModule en /uploads), pero `APP_BASE_URL` de .env.development
    // apunta al servidor de dev remoto —ese archivo lo comparten el local y el
    // desplegado—, así que la URL guardada en la BD señalaba a un host que no
    // tiene el archivo y la imagen nunca cargaba (404).
    // `APP_FILES_BASE_URL` permite forzarlo si hiciera falta otro host.
    this.baseUrl =
      this.configService.get<string>('APP_FILES_BASE_URL') ||
      (isLocalMachine ? localUrl : configuredUrl || localUrl);
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

    // ⚠️ `file.mimetype` lo declara el CLIENTE en la cabecera multipart: es
    // trivial mandar `image/png` con un .exe dentro. Esto es solo un descarte
    // barato y temprano, NO una validación de seguridad. Quien de verdad
    // decide es sharp, más abajo: si el buffer no es una imagen decodificable,
    // revienta y no se escribe nada. Comprobado con un PE renombrado, un PNG
    // con solo los magic bytes, un SVG con <script> y un HTML: los cuatro
    // rechazados.
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

    const targetDir = path.join(this.uploadsDir, folder);
    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    const filename = `${uuidv4()}.webp`;
    const filePath = path.join(targetDir, filename);

    const isLargeFile = file.buffer.length > 2 * 1024 * 1024;
    const maxWidth = isLargeFile ? 1920 : 1200;

    // El `toFile` DEBE esperarse. Antes se lanzaba sin `await` (solo con
    // `.catch`), así que el método devolvía la URL mientras sharp seguía
    // escribiendo el archivo: quien consumiera esa URL de inmediato —el front
    // tras subir un avatar— pedía una imagen que todavía no existía en disco y
    // veía la foto vieja o rota. También hacía que un fallo de sharp quedara
    // solo en consola, con la URL ya guardada en la BD apuntando a la nada.
    try {
      await sharp(file.buffer, {
        // Tope de píxeles descomprimidos: cierra las "bombas de
        // descompresión", un PNG de pocos KB que se expande a 40.000×40.000 y
        // reventaría la memoria del contenedor al decodificarlo. 100 MP deja
        // sitio de sobra para cualquier cámara real.
        limitInputPixels: 100_000_000,
      })
        .webp({ quality: 80, effort: 6 })
        .resize({ width: maxWidth, withoutEnlargement: true })
        .toFile(filePath);
    } catch (error) {
      console.error('Error optimizando imagen:', error);
      throw new InternalServerErrorException(
        'No se pudo procesar la imagen. Intenta con otro archivo.',
      );
    }

    const publicId = `${folder}/${filename}`;

    const imageUrl = `${this.baseUrl}/uploads/${publicId}`;

    return { imageUrl, publicId };
  }

  /**
   * Resuelve un `publicId` a una ruta real DENTRO de `uploadsDir`, o `null` si
   * se sale.
   *
   * Es imprescindible porque en los endpoints `DELETE :id/images/*publicId` el
   * valor llega crudo desde la URL y se le aplica `decodeURIComponent`. Un
   * `path.join` no protege de nada: resuelve los `../` y sale del directorio
   * (`path.join('/app/uploads', '../../etc/passwd')` → `/etc/passwd`), y una
   * ruta absoluta lo reemplaza entero. Con `fs.unlinkSync` detrás, eso era
   * borrado arbitrario de archivos del contenedor.
   */
  private resolveInsideUploads(publicId: string): string | null {
    if (!publicId || publicId.includes('\0')) return null;

    const base = path.resolve(this.uploadsDir);
    const target = path.resolve(base, publicId);

    // `startsWith` con el separador al final: sin él, `/app/uploads-otro`
    // pasaría la comprobación por ser prefijo textual de `/app/uploads`.
    if (target !== base && !target.startsWith(base + path.sep)) return null;

    return target;
  }

  /**
   * Elimina un archivo del disco usando su publicId (ruta relativa al uploadsDir).
   * @param publicId - e.g. 'products/uuid.jpg'
   */
  async deleteImage(publicId: string): Promise<void> {
    if (!publicId) return;

    const filePath = this.resolveInsideUploads(publicId);
    if (!filePath) {
      // No se lanza excepción a propósito: este método se llama en cascadas de
      // borrado y no debe tumbarlas. Se registra, que es lo que interesa para
      // detectar el intento.
      console.error(
        `Intento de borrado fuera de uploads, ignorado: ${publicId}`,
      );
      return;
    }

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    } catch (error) {
      console.error('Error eliminando imagen del disco:', error);
    }
  }
}
