import 'package:flutter_test/flutter_test.dart';
import 'package:licit/src/shared/models/app_user.dart';
import 'package:licit/src/shared/models/product.dart';
import 'package:licit/src/shared/state/favorite_mutation.dart';

Product product({bool favorite = false, int count = 0}) => Product(
  id: 'product',
  title: 'Audi A4',
  description: '',
  imageUrl: '',
  imageKey: '',
  status: 'active',
  startingPrice: 100,
  currentPrice: 100,
  minBidIncrement: 10,
  buyNowPrice: 500,
  favoriteCount: count,
  startsAt: DateTime.utc(2026),
  endsAt: DateTime.utc(2027),
  isFavorite: favorite,
  seller: const AppUser(
    id: 'seller',
    name: 'Seller',
    email: '',
    role: 'seller',
    blocked: false,
  ),
);

void main() {
  test('own-product rejection never changes the heart or count', () {
    final mutation = FavoriteMutation();
    final before = product(count: 7);
    expect(mutation.begin(before, 'seller'), isNull);
    expect(mutation.pending, isFalse);
    expect(before.favoriteCount, 7);
    expect(before.isFavorite, isFalse);
  });

  test(
    'rejected add restores exactly the original count on repeated attempts',
    () {
      final mutation = FavoriteMutation();
      var current = product(count: 0);
      for (var i = 0; i < 15; i++) {
        final optimistic = mutation.begin(current, 'buyer')!;
        expect(optimistic.favoriteCount, 1);
        current = mutation.rollback(optimistic);
        expect(current.favoriteCount, 0);
        expect(current.isFavorite, isFalse);
      }
    },
  );

  test('rapid taps allow only one in-flight change', () {
    final mutation = FavoriteMutation();
    final optimistic = mutation.begin(product(count: 3), 'buyer')!;
    expect(optimistic.favoriteCount, 4);
    expect(mutation.begin(optimistic, 'buyer'), isNull);
    expect(mutation.pending, isTrue);
    mutation.complete();
    expect(mutation.pending, isFalse);
  });

  test(
    'failed removal restores membership and count without reverting live bids',
    () {
      final mutation = FavoriteMutation();
      final optimistic = mutation.begin(
        product(favorite: true, count: 7),
        'buyer',
      )!;
      expect(optimistic.favoriteCount, 6);
      final liveUpdate = optimistic.copyWith(
        currentPrice: 250,
        status: 'reserved',
      );
      final rolledBack = mutation.rollback(liveUpdate);
      expect(rolledBack.isFavorite, isTrue);
      expect(rolledBack.favoriteCount, 7);
      expect(rolledBack.currentPrice, 250);
      expect(rolledBack.status, 'reserved');
    },
  );
}
