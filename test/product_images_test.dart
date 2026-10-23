import 'package:flutter_test/flutter_test.dart';
import 'package:licit/src/shared/models/product.dart';

void main() {
  test(
    'chooses the smallest sufficient image and preserves it on auction updates',
    () {
      final product = Product.fromJson({
        'imageUrl': 'large.webp',
        'imageVariants': [
          {'url': 'large.webp', 'width': 1920, 'height': 1280},
          {'url': 'thumb.webp', 'width': 320, 'height': 213},
          {'url': 'card.webp', 'width': 960, 'height': 640},
        ],
      });
      expect(product.imageForWidth(240), 'thumb.webp');
      expect(product.imageForWidth(700), 'card.webp');
      expect(product.imageForWidth(1100), 'large.webp');
      expect(product.imageForWidth(3000), 'large.webp');
      expect(
        product.copyWith(currentPrice: 200).imageForWidth(700),
        'card.webp',
      );
    },
  );
  test('old listings without a manifest keep their image', () {
    expect(
      Product.fromJson({'imageUrl': 'legacy.jpg'}).imageForWidth(320),
      'legacy.jpg',
    );
  });
}
