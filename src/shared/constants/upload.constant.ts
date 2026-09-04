import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';

/**
 * Tope de subida por archivo.
 *
 * 15 MB y no más porque multer usa almacenamiento en MEMORIA: el archivo entero
 * vive en la RAM del contenedor mientras se procesa, así que el límite se
 * multiplica por las subidas simultáneas. Antes no había ninguno en ninguna
 * capa —ni front, ni multer, ni nginx—, así que un usuario autenticado podía
 * mandar un archivo de gigas y tumbar el proceso.
 *
 * 15 MB cubre de sobra una foto de móvil (3–8 MB) o de réflex (15–25 MB
 * comprimida), y sharp reescala a 1200/1920 px de todas formas: por encima de
 * ese tamaño lo único que se gana es gastar ancho de banda.
 */
export const MAX_IMAGE_UPLOAD_BYTES = 15 * 1024 * 1024;

/**
 * Opciones para `FileInterceptor` en todos los endpoints de imagen.
 * `files: 1` evita que se cuelen varios archivos en una petición que espera uno.
 */
export const IMAGE_UPLOAD_OPTIONS: MulterOptions = {
  limits: {
    fileSize: MAX_IMAGE_UPLOAD_BYTES,
    files: 1,
  },
};
