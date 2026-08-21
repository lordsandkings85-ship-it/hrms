import { Module } from '@nestjs/common';
import { ShiftsController } from './shifts.controller';
import { ShiftsService } from './shifts.service';
import { ShiftTypesController } from './shift-types.controller';
import { ShiftTypesService } from './shift-types.service';

@Module({
  controllers: [ShiftsController, ShiftTypesController],
  providers: [ShiftsService, ShiftTypesService],
})
export class ShiftsModule {}
