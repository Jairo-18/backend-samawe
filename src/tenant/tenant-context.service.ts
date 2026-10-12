import { ForbiddenException, Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { ResolvedTenant, TenantClsStore } from './tenant.types';

/**
 * Fuente ÚNICA del hotel de la petición en curso.
 *
 * Lo rellena el middleware de CLS a partir del host (ver `tenant.module.ts`).
 * Fuera de una petición —crons, colas, scripts— no hay hotel hasta que el
 * código lo fije a mano con `runAs`, una organización por vez.
 */
@Injectable()
export class TenantContext {
  constructor(private readonly _cls: ClsService<TenantClsStore>) {}

  /** El hotel actual, o `undefined` si no hay (ruta sin hotel, cron…). */
  get tenant(): ResolvedTenant | undefined {
    return this._cls.isActive() ? this._cls.get('tenant') : undefined;
  }

  get organizationalId(): string | undefined {
    return this.tenant?.organizationalId;
  }

  /**
   * El hotel actual o una excepción. Para todo lo que lee o escribe datos de
   * un hotel: sin hotel resuelto se falla, nunca se elige uno.
   */
  requireOrganizationalId(): string {
    const id = this.organizationalId;
    if (!id) {
      throw new ForbiddenException('No se pudo determinar el hotel de la petición.');
    }
    return id;
  }

  /**
   * Cambia el hotel de la petición EN CURSO a `organizationalId`. Solo lo usa la
   * estrategia JWT, ya validada la sesión: un administrador de plataforma que
   * eligió esa organización con el selector, o cualquier usuario en el host del
   * panel (opera en SU hotel).
   */
  actAs(organizationalId: string): void {
    if (!organizationalId || !this._cls.isActive()) return;
    const current = this._cls.get('tenant');
    if (current?.organizationalId === organizationalId) return;
    this._cls.set('tenant', {
      organizationalId,
      hostname: current?.hostname ?? '(sin host)',
      kind: 'acting',
      isPanel: current?.isPanel,
    });
  }

  /**
   * Ejecuta `fn` con un hotel fijado. Para crons y tareas en segundo plano:
   * `for (const org of activas) await tenant.runAs(org.id, () => job())`.
   */
  runAs<T>(organizationalId: string, fn: () => Promise<T>): Promise<T> {
    if (!organizationalId) {
      throw new Error('runAs exige una organización.');
    }
    return this._cls.run(async () => {
      this._cls.set('tenant', {
        organizationalId,
        hostname: '(tarea interna)',
        kind: 'internal',
      });
      return fn();
    });
  }
}
