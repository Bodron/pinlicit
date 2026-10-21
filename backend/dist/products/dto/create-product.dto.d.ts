export declare class CreateProductDto {
    title: string;
    description: string;
    categoryId: string;
    videoKey: string;
    videoUrl: string;
    thumbnailUrl?: string;
    startingPrice: number;
    reservePrice?: number;
    minBidIncrement: number;
    buyNowPrice: number;
    startsAt: string;
    endsAt: string;
}
