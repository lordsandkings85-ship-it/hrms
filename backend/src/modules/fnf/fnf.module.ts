import { Module } from '@nestjs/common';
import { FnfController } from './fnf.controller';
import { FnfService } from './fnf.service';

@Module({ controllers: [FnfController], providers: [FnfService] })
export class FnfModule {}
