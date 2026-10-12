/**
 * Registra hosts de DESARROLLO en `organization_domains` para un hotel.
 *
 * Desde la fase 1 multi-hotel, la API rechaza (421) cualquier host que no esté
 * en esa tabla. En local el front llama a `http://<host>:3000`, así que
 * `localhost` —y la IP de la red si se prueba desde el celular— tienen que
 * existir como dominios del hotel. No van en la migración para que producción
 * no los tenga.
 *
 * Solo corre contra la base de desarrollo (`.env.development`). Idempotente.
 *
 * Ejecutar (hotel por defecto: ecohotelsamawe):
 *   npx cross-env NODE_ENV=development ts-node scripts/seed-dev-domains.ts
 *   npx cross-env NODE_ENV=development ts-node scripts/seed-dev-domains.ts --slug ecohotelsamawe 192.168.1.50
 *
 * Sin hosts se registran `localhost` y `127.0.0.1`; con hosts, SOLO esos.
 * Otro hotel en local: otra IP de loopback, que llega al mismo backend sin
 * tocar el archivo `hosts` de Windows:
 *   npx cross-env NODE_ENV=development ts-node scripts/seed-dev-domains.ts --slug motel-crazy-love 127.0.0.2
 *
 * `--panel`: el host es del PANEL (la sesión decide el hotel; ver
 * `OrganizationDomain.isPanel`). Sin hosts, `localhost` y `127.0.0.1` ya lo son.
 */
import { AppDataSource } from '../typeorm.config';

const DEFAULT_HOSTS = ['localhost', '127.0.0.1'];

function parseArgs(argv: string[]) {
  let slug = 'ecohotelsamawe';
  let panel = false;
  const hosts: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--slug') slug = argv[++i];
    else if (argv[i] === '--panel') panel = true;
    else hosts.push(argv[i].trim().toLowerCase());
  }
  return {
    slug,
    panel: panel || !hosts.length,
    hosts: [...new Set(hosts.length ? hosts : DEFAULT_HOSTS)],
  };
}

async function main() {
  if (process.env.NODE_ENV !== 'development') {
    throw new Error('Este script solo corre con NODE_ENV=development.');
  }
  const { slug, hosts, panel } = parseArgs(process.argv.slice(2));
  for (const h of hosts) {
    if (!/^[a-z0-9.\-]+$/.test(h)) throw new Error(`Host inválido: ${h}`);
  }

  (AppDataSource.options as { logging?: boolean }).logging = false;
  await AppDataSource.initialize();
  try {
    const [org] = await AppDataSource.query(
      `SELECT "organizationalId" FROM "Organizational" WHERE "slug" = $1`,
      [slug],
    );
    if (!org) throw new Error(`No existe la organización con slug "${slug}".`);

    for (const hostname of hosts) {
      const rows = await AppDataSource.query(
        `INSERT INTO "organization_domains"
           ("organizationalId", "hostname", "isPrimary", "kind", "status", "verifiedAt", "isPanel")
         VALUES ($1, $2, false, 'staging', 'active', now(), $3)
         ON CONFLICT ("hostname") DO UPDATE SET "isPanel" = EXCLUDED."isPanel"
           WHERE "organization_domains"."organizationalId" = EXCLUDED."organizationalId"
         RETURNING "hostname"`,
        [org.organizationalId, hostname, panel],
      );
      console.log(`${hostname}: ${rows.length ? 'listo' : 'es de otro hotel, no se tocó'}${panel ? ' (panel)' : ''}`);
    }
  } finally {
    await AppDataSource.destroy();
  }
}

main().catch((e) => {
  console.error('ERROR:', (e as Error).message);
  process.exit(1);
});
