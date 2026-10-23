import {
  IsInt,
  Min,
  Max,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
export class ShipmentDto {
  @IsString() @MinLength(2) @MaxLength(50) carrier: string;
  @IsString() @MinLength(3) @MaxLength(100) trackingCode: string;
}
export class OrderIssueDto {
  @IsIn(["not_received", "not_as_described", "damaged", "other"]) code: string;
}
export class OrderRefundDto {
  @IsString() @MinLength(3) @MaxLength(200) reason: string;
}

export class BidGuaranteeDto {
  @IsInt() @Min(3000) @Max(99999999) maximum: number;
}

export class SellerOnboardingDto {
  @IsIn(["individual", "company"]) businessType: "individual" | "company";
}
