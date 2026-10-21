import 'app_user.dart';
import 'product.dart';

class Bid {
  const Bid({
    required this.id,
    required this.amount,
    required this.maxAmount,
    required this.createdAt,
    this.bidder,
    this.product,
  });

  final String id;
  final int amount;
  final int maxAmount;
  final DateTime createdAt;
  final AppUser? bidder;
  final Product? product;

  factory Bid.fromJson(Map<String, dynamic> json) {
    return Bid(
      id: (json['id'] ?? json['_id'] ?? '').toString(),
      amount: _asInt(json['amount']),
      maxAmount: _asInt(json['maxAmount'] ?? json['amount']),
      createdAt:
          DateTime.tryParse((json['createdAt'] ?? '').toString()) ??
          DateTime.now(),
      bidder: json['bidder'] is Map<String, dynamic>
          ? AppUser.fromJson(json['bidder'] as Map<String, dynamic>)
          : null,
      product: json['product'] is Map<String, dynamic>
          ? Product.fromJson(json['product'] as Map<String, dynamic>)
          : null,
    );
  }
}

int _asInt(dynamic value) {
  if (value is int) return value;
  if (value is double) return value.round();
  return int.tryParse(value?.toString() ?? '') ?? 0;
}
