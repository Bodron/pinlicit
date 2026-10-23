import 'package:dio/dio.dart';
import 'app_localizations.dart';

String localizedStatus(String status, AppLocalizations l10n) =>
    switch (status) {
      'active' => l10n.statusActive,
      'reserved' => l10n.statusReserved,
      'sold' => l10n.statusSold,
      'hidden' => l10n.statusHidden,
      'expired' => l10n.statusExpired,
      'closed' => l10n.statusClosed,
      'approved' => l10n.approved,
      'rejected' => l10n.rejected,
      'pending' => l10n.pendingUpper,
      _ => l10n.unknownStatus,
    };

/// The API contract remains unchanged; raw English/internal errors are not UI.
String localizedError(Object? error, AppLocalizations l10n) {
  if (error is DioException) {
    final data = error.response?.data;
    final message = data is Map ? data['message'] : null;
    final messages = message is List ? message : [message];
    for (final value in messages) {
      final known = switch (value) {
        'Invalid email or password.' => l10n.invalidCredentials,
        'Account is blocked.' => l10n.accountBlocked,
        'Email is already registered.' => l10n.emailAlreadyRegistered,
        'You cannot bid on your own product.' => l10n.ownProductBid,
        'Auction is not active.' => l10n.auctionInactive,
        'Product cannot be bought now.' => l10n.cannotBuyNow,
        'You cannot favorite your own product.' =>
          l10n.cannotFavoriteOwnProduct,
        'Seller approval is required before listing products.' =>
          l10n.sellerApprovalRequired,
        'Product not found.' => l10n.productNotFound,
        _ => null,
      };
      if (known != null) return known;
    }
    return switch (error.type) {
      DioExceptionType.connectionError => l10n.networkUnavailable,
      DioExceptionType.connectionTimeout ||
      DioExceptionType.receiveTimeout ||
      DioExceptionType.sendTimeout => l10n.requestTimeout,
      DioExceptionType.cancel => l10n.requestCancelled,
      DioExceptionType.badCertificate => l10n.untrustedCertificate,
      _ => switch (error.response?.statusCode) {
        400 || 422 => l10n.invalidForm,
        401 => l10n.invalidCredentials,
        403 => l10n.notAuthorized,
        404 => l10n.notFound,
        _ => l10n.requestFailed,
      },
    };
  }
  if (error.toString().contains('MissingPluginException')) {
    return l10n.secureStorageUnavailable;
  }
  return l10n.requestFailed;
}

/// Translate built-in category labels without modifying their stored identity.
String localizedCategory(String name, AppLocalizations l10n) =>
    switch (name.toLowerCase()) {
      'auto' => l10n.categoryAuto,
      'casa' || 'casă' || 'home' => l10n.categoryHome,
      'fashion' => l10n.categoryFashion,
      'collectibles' => l10n.categoryCollectibles,
      'electronice' || 'electronics' => l10n.categoryElectronics,
      'watches' => l10n.categoryWatches,
      'art' => l10n.categoryArt,
      'furniture' => l10n.categoryFurniture,
      _ => name,
    };
