import { Module } from '@nestjs/common';
import { VpsController } from './vps.controller';
import { VpsService } from './vps.service';

@Module({
  controllers: [VpsController],
  providers: [VpsService],
  exports: [VpsService],
})
export class VpsModule {}
