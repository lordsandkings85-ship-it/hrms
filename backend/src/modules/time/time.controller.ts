import { Controller, Get } from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';

@SkipThrottle()
@Controller('time')
export class TimeController {
  @Get()
  now() {
    return { iso: new Date().toISOString(), unix: Date.now() };
  }
}
