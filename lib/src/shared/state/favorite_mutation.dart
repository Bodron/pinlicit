import '../models/product.dart';

/// One in-flight change per product, with an exact favorite-only rollback.
/// Auction prices/status received while the request runs are never reverted.
class FavoriteMutation {
  bool _pending = false;
  bool get pending => _pending;
  bool? _previousFavorite;
  int? _previousCount;

  Product? begin(Product product, String? currentUserId) {
    if (_pending ||
        product.seller?.id == currentUserId && currentUserId != null) {
      return null;
    }
    _pending = true;
    _previousFavorite = product.isFavorite;
    _previousCount = product.favoriteCount;
    final next = !product.isFavorite;
    return product.copyWith(
      isFavorite: next,
      favoriteCount: next
          ? product.favoriteCount + 1
          : product.favoriteCount > 0
          ? product.favoriteCount - 1
          : 0,
    );
  }

  Product rollback(Product current) {
    final result = current.copyWith(
      isFavorite: _previousFavorite,
      favoriteCount: _previousCount,
    );
    complete();
    return result;
  }

  void complete() {
    _pending = false;
    _previousFavorite = null;
    _previousCount = null;
  }
}
