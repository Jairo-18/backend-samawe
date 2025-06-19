import { StateTypeRepository } from './../repositories/stateType.repository';
import { AccommodationRepository } from './../repositories/accommodation.repository';
import { InvoiceDetaillRepository } from './../repositories/invoiceDetaill.repository';
import { Cron } from '@nestjs/schedule';
import { Injectable } from '@nestjs/common';
import { LessThan } from 'typeorm';

@Injectable()
export class CronService {
  constructor(
    private readonly _invoiceDetaillRepository: InvoiceDetaillRepository,
    private readonly _stateTypeRepository: StateTypeRepository,
    private readonly _accommodationRepository: AccommodationRepository,
  ) {}
  @Cron('0 */12 * * *') // Ejecutar cada 12 horas (00:00 y 12:00)
  async handleExpiredAccommodations() {
    console.log('Verificando accommodations expiradas...');
    try {
      const result = await this.updateExpiredAccommodations();
      if (result.updated > 0) {
        console.log(
          `Se liberaron ${result.updated} accommodations:`,
          result.accommodations,
        );
      }
    } catch (error) {
      console.error('Error en tarea programada de accommodations:', error);
    }
  }

  async updateExpiredAccommodations() {
    try {
      const now = new Date();

      // Buscar todos los detalles con accommodation ocupadas que ya pasaron su endDate
      const expiredDetails = await this._invoiceDetaillRepository.find({
        where: {
          endDate: LessThan(now),
          accommodation: {
            stateType: {
              name: 'Ocupado',
            },
          },
        },
        relations: ['accommodation', 'accommodation.stateType'],
      });

      if (expiredDetails.length === 0) {
        return { updated: 0 };
      }

      // Buscar el stateType "Disponible"
      const disponibleState = await this._stateTypeRepository.findOne({
        where: { name: 'Disponible' },
      });

      if (!disponibleState) {
        throw new Error('No se encontró el estado "Disponible"');
      }

      // Actualizar todas las accommodations expiradas a Disponible
      const accommodationsToUpdate = expiredDetails
        .map((detail) => detail.accommodation)
        .filter(
          (acc, index, self) =>
            // Eliminar duplicados por accommodationId
            self.findIndex((a) => a.accommodationId === acc.accommodationId) ===
            index,
        );

      accommodationsToUpdate.forEach((acc) => {
        acc.stateType = disponibleState;
      });

      await this._accommodationRepository.save(accommodationsToUpdate);

      return {
        updated: accommodationsToUpdate.length,
        accommodations: accommodationsToUpdate.map((acc) => ({
          id: acc.accommodationId,
          name: acc.name || `Accommodation ${acc.accommodationId}`,
        })),
      };
    } catch (error) {
      console.error('Error actualizando accommodations expiradas:', error);
      throw error;
    }
  }
}
