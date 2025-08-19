import { CloudinaryService } from './services/cloudinary.service';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { v2 as cloudinary } from 'cloudinary';

@Module({
  providers: [
    CloudinaryService,
    {
      provide: 'CLOUDINARY',
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        cloudinary.config({
          cloud_name: configService.get<string>('cloudinary.cloudName'),
          api_key: configService.get<string>('cloudinary.apiKey'),
          api_secret: configService.get<string>('cloudinary.apiSecret'),
        });

        return cloudinary;
      },
    },
  ],
  exports: [CloudinaryService, 'CLOUDINARY'],
})
export class CloudinaryModule {}
