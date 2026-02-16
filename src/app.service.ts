import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as os from 'os';

@Injectable()
export class AppService {
  constructor(private readonly configService: ConfigService) {}

  getHello(): string {
    return 'Hello World!';
  }

  getServerInfo() {
    const interfaces = os.networkInterfaces();
    const addresses: string[] = [];

    // Obtener todas las direcciones IPv4 no locales
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        // Ignorar direcciones IPv6 y localhost
        if (iface.family === 'IPv4' && !iface.internal) {
          addresses.push(iface.address);
        }
      }
    }

    const port = this.configService.get<number>('app.port') || 3001;

    return {
      port,
      addresses,
      primaryAddress: addresses[0] || 'localhost',
      apiUrl: `http://${addresses[0] || 'localhost'}:${port}/`,
      message: 'Usa cualquiera de las direcciones para conectar las tablets',
    };
  }
}
