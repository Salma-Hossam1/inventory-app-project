import { ConfigService } from '@nestjs/config';

// export const typeOrmconfig = (configService: ConfigService) => ({
//   type: configService.get<'postgres'>('DB_TYPE'),
//   host: configService.get<string>('DB_HOST'),
//   port: configService.get<number>('DB_PORT'),
//   username: configService.get<string>('DB_USER'),
//   password: configService.get<string>('DB_PASSWORD'),
//   database: configService.get<string>('DB_NAME'),
//   entities: [__dirname + '/../**/*.entity{.ts,.js}'],
//   synchronize: configService.get<string>('NODE_ENV') !== 'production',
//   logging: configService.get<string>('NODE_ENV') === 'development',
// });

export const typeOrmconfig = (configService: ConfigService) => ({
  type: configService.get<'postgres'>('DB_TYPE') || 'postgres',

  host: configService.get<string>('DB_HOST') || 'postgres',

  port: parseInt(configService.get<string>('DB_PORT') || '5432'),

  username: configService.get<string>('DB_USER') || 'admin',

  password: configService.get<string>('DB_PASSWORD') || 'admin',

  database: configService.get<string>('DB_NAME') || 'inventory_app',

  entities: [__dirname + '/../**/*.entity{.ts,.js}'],

  synchronize: configService.get<string>('NODE_ENV') !== 'production',

  logging: true, // خليه true مؤقتًا عشان نشوف
});