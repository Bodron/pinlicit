export declare class CreateProductDto {
    title: string;
    description: string;
    categoryId: string;
    imageKey: string;
    imageUrl: string;
    startingPrice: number;
    reservePrice?: number;
    minBidIncrement: number;
    buyNowPrice: number;
    startsAt: string;
    endsAt: string;
}
