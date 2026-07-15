import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SeederService } from './seeder.service';

@Global()
@Module({
  providers: [PrismaService, SeederService],
  exports: [PrismaService, SeederService],
})
export class PrismaModule {}
