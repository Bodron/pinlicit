import { Controller, Get, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { BidsService } from "./bids.service";

@UseGuards(JwtAuthGuard)
@Controller("me/bids")
export class BidsController {
  constructor(private readonly bidsService: BidsService) {}

  @Get()
  mine(@CurrentUser() user: any) {
    return this.bidsService.mine(user._id.toString());
  }
}
