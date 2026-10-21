import { Body, Controller, Get, Post, UseGuards } from "@nestjs/common";
import { JwtAuthGuard } from "../auth/jwt-auth.guard";
import { CurrentUser } from "../common/current-user.decorator";
import { CreateSellerApplicationDto } from "./dto/create-seller-application.dto";
import { SellerApplicationsService } from "./seller-applications.service";

@UseGuards(JwtAuthGuard)
@Controller("seller-applications")
export class SellerApplicationsController {
  constructor(
    private readonly applicationsService: SellerApplicationsService,
  ) {}

  @Post()
  create(@CurrentUser() user: any, @Body() dto: CreateSellerApplicationDto) {
    return this.applicationsService.create(user._id.toString(), dto);
  }

  @Get("me")
  mine(@CurrentUser() user: any) {
    return this.applicationsService.findMine(user._id.toString());
  }
}
