import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpStatus,
} from '@nestjs/common';
import { MulterError } from 'multer';
import { Response } from 'express';
import { MAX_IMAGE_UPLOAD_BYTES } from '../constants/upload.constant';

/**
 * Traduce los errores de multer a respuestas legibles.
 *
 * Sin esto, pasarse del límite de tamaño devuelve un 500 genérico: multer
 * aborta la petición antes de que el controlador llegue a ejecutarse, así que
 * el error nunca pasa por la lógica de la aplicación. El interceptor del
 * frontend muestra `error.error.message` en un toast, de modo que lo que se
 * escriba aquí es literalmente lo que ve quien sube la foto.
 */
@Catch(MulterError)
export class MulterExceptionFilter implements ExceptionFilter {
  catch(exception: MulterError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    const maxMb = Math.round(MAX_IMAGE_UPLOAD_BYTES / (1024 * 1024));

    const { status, message } =
      exception.code === 'LIMIT_FILE_SIZE'
        ? {
            status: HttpStatus.PAYLOAD_TOO_LARGE,
            message: `La imagen supera el máximo de ${maxMb} MB. Reducila e intentá de nuevo.`,
          }
        : exception.code === 'LIMIT_FILE_COUNT'
          ? {
              status: HttpStatus.BAD_REQUEST,
              message: 'Solo se puede subir un archivo por vez.',
            }
          : {
              status: HttpStatus.BAD_REQUEST,
              message: 'No se pudo procesar el archivo enviado.',
            };

    response.status(status).json({ statusCode: status, message });
  }
}
