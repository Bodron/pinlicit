import 'app_user.dart';
import 'category.dart';

class ProductImageVariant {
  const ProductImageVariant({
    required this.url,
    required this.width,
    required this.height,
  });
  final String url;
  final int width;
  final int height;
  factory ProductImageVariant.fromJson(Map<String, dynamic> json) =>
      ProductImageVariant(
        url: (json['url'] ?? '').toString(),
        width: (json['width'] as num?)?.toInt() ?? 0,
        height: (json['height'] as num?)?.toInt() ?? 0,
      );
}

class Product {
  const Product({
    required this.id,
    required this.title,
    required this.description,
    required this.imageUrl,
    required this.imageKey,
    this.imageVariants = const [],
    this.commerceVersion = 0,
    required this.status,
    required this.startingPrice,
    this.reservePrice,
    required this.currentPrice,
    required this.minBidIncrement,
    required this.buyNowPrice,
    required this.favoriteCount,
    required this.startsAt,
    required this.endsAt,
    this.category,
    this.seller,
    this.reservedBy,
    this.isFavorite = false,
  });

  final String id;
  final String title;
  final String description;
  final String imageUrl;
  final String imageKey;
  final List<ProductImageVariant> imageVariants;

  String imageForWidth(double pixels) {
    final variants =
        imageVariants
            .where((variant) => variant.width > 0 && variant.url.isNotEmpty)
            .toList()
          ..sort((a, b) => a.width.compareTo(b.width));
    if (variants.isEmpty) return imageUrl;
    for (final variant in variants) {
      if (variant.width >= pixels) return variant.url;
    }
    return variants.last.url;
  }

  final int commerceVersion;
  final String status;
  final int startingPrice;
  final int? reservePrice;
  final int currentPrice;
  final int minBidIncrement;
  final int buyNowPrice;
  final int favoriteCount;
  final DateTime startsAt;
  final DateTime endsAt;
  final ProductCategory? category;
  final AppUser? seller;
  final AppUser? reservedBy;
  final bool isFavorite;

  bool get isActive => status == 'active' && endsAt.isAfter(DateTime.now());
  int get nextBid => currentPrice + minBidIncrement;
  bool get hasReserve => reservePrice != null && reservePrice! > startingPrice;
  bool get reserveMet => !hasReserve || currentPrice >= reservePrice!;
  bool get canBuyNow => isActive && (!hasReserve || !reserveMet);

  Product copyWith({
    String? status,
    int? currentPrice,
    int? reservePrice,
    int? favoriteCount,
    DateTime? endsAt,
    AppUser? reservedBy,
    bool? isFavorite,
  }) {
    return Product(
      id: id,
      title: title,
      description: description,
      imageUrl: imageUrl,
      imageKey: imageKey,
      imageVariants: imageVariants,
      commerceVersion: commerceVersion,
      status: status ?? this.status,
      startingPrice: startingPrice,
      reservePrice: reservePrice ?? this.reservePrice,
      currentPrice: currentPrice ?? this.currentPrice,
      minBidIncrement: minBidIncrement,
      buyNowPrice: buyNowPrice,
      favoriteCount: favoriteCount ?? this.favoriteCount,
      startsAt: startsAt,
      endsAt: endsAt ?? this.endsAt,
      category: category,
      seller: seller,
      reservedBy: reservedBy ?? this.reservedBy,
      isFavorite: isFavorite ?? this.isFavorite,
    );
  }

  factory Product.fromJson(Map<String, dynamic> json) {
    return Product(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      title: (json['title'] ?? '').toString(),
      description: (json['description'] ?? '').toString(),
      imageUrl: (json['imageUrl'] ?? json['thumbnailUrl'] ?? '').toString(),
      imageKey: (json['imageKey'] ?? '').toString(),
      imageVariants: (json['imageVariants'] as List? ?? [])
          .whereType<Map<String, dynamic>>()
          .map(ProductImageVariant.fromJson)
          .toList(),
      commerceVersion: _asInt(json['commerceVersion']),
      status: (json['status'] ?? 'active').toString(),
      startingPrice: _asInt(json['startingPrice']),
      reservePrice: json['reservePrice'] == null
          ? null
          : _asInt(json['reservePrice']),
      currentPrice: _asInt(json['currentPrice']),
      minBidIncrement: _asInt(json['minBidIncrement']),
      buyNowPrice: _asInt(json['buyNowPrice']),
      favoriteCount: _asInt(json['favoriteCount']),
      startsAt:
          DateTime.tryParse((json['startsAt'] ?? '').toString()) ??
          DateTime.now(),
      endsAt:
          DateTime.tryParse((json['endsAt'] ?? '').toString()) ??
          DateTime.now(),
      category: json['category'] is Map<String, dynamic>
          ? ProductCategory.fromJson(json['category'] as Map<String, dynamic>)
          : null,
      seller: json['seller'] is Map<String, dynamic>
          ? AppUser.fromJson(json['seller'] as Map<String, dynamic>)
          : null,
      reservedBy: json['reservedBy'] is Map<String, dynamic>
          ? AppUser.fromJson(json['reservedBy'] as Map<String, dynamic>)
          : null,
      isFavorite: json['isFavorite'] == true,
    );
  }
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is double) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
