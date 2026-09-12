/**
 * Aritmética fiscal compartida por TODOS los documentos que se envían a Factus:
 * factura, nota crédito, nota débito, documento soporte y nota de ajuste.
 *
 * Estaba copiada literalmente en cada servicio. Es lógica fiscal sensible: si
 * una copia se corrige y las otras no, unos documentos cuadran y otros los
 * rechaza la DIAN con un 422, que es de los errores más caros de diagnosticar
 * porque el mensaje no dice qué línea falla.
 */

/** Redondeo a 2 decimales, con corrección del error de coma flotante. */
export const round2 = (n: number): number =>
  Math.round((n + Number.EPSILON) * 100) / 100;

/** La forma mínima de un ítem ya mapeado al payload de Factus. */
export interface FactusPayloadItem {
  quantity: unknown;
  price: unknown;
  discount_rate: unknown;
  taxes: unknown;
}

/**
 * Total exacto de un conjunto de ítems, replicando el redondeo de Factus.
 *
 * ⚠️ **Factus redondea el neto y el impuesto de CADA línea a 2 decimales antes
 * de sumar.** Redondear una sola vez al final parece equivalente y no lo es:
 * con varios ítems la diferencia acumulada supera el céntimo y Factus rechaza
 * con 422 ("La suma de todos los detalles de pago no es igual al total de la
 * factura"). Por eso el redondeo va dentro del bucle y no fuera.
 */
export const sumFactusItemsTotal = (items: FactusPayloadItem[]): number =>
  items.reduce((sum, item) => {
    const qty = parseFloat(String(item.quantity));
    const price = parseFloat(String(item.price));
    const discount = parseFloat(String(item.discount_rate ?? '0'));
    const taxRate = parseFloat(
      String((item.taxes as { rate?: unknown }[] | undefined)?.[0]?.rate ?? '0'),
    );
    const net = round2(qty * price * (1 - discount / 100));
    const tax = round2((net * taxRate) / 100);
    return sum + net + tax;
  }, 0);
