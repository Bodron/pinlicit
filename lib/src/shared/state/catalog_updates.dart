import 'package:flutter_riverpod/flutter_riverpod.dart';

/// Refresh cached lists after a listing is published, rather than on tab changes.
final catalogUpdatesProvider = NotifierProvider<CatalogUpdates, int>(
  CatalogUpdates.new,
);

class CatalogUpdates extends Notifier<int> {
  @override
  int build() => 0;

  void listingPublished() => state++;
}
