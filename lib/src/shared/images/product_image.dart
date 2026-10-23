import 'image_prefetch_queue.dart';
import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter_cache_manager/flutter_cache_manager.dart';

/// One bounded disk cache for product photos; stable content URLs never need revalidation.
class ProductImage extends StatelessWidget {
  const ProductImage({
    super.key,
    required this.url,
    this.fit = BoxFit.cover,
    this.errorBuilder,
  });
  final String url;
  final BoxFit fit;
  final ImageErrorWidgetBuilder? errorBuilder;

  static final cache = CacheManager(
    Config(
      'pinbind_product_images_v1',
      stalePeriod: const Duration(days: 30),
      maxNrOfCacheObjects: 160,
    ),
  );

  static final prefetch = ImagePrefetchQueue((url) async {
    await cache.getSingleFile(url);
  });

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final logicalWidth = constraints.maxWidth.isFinite
          ? constraints.maxWidth
          : MediaQuery.sizeOf(context).width;
      final pixels = (logicalWidth * MediaQuery.devicePixelRatioOf(context))
          .ceil()
          .clamp(1, 1920)
          .toInt();
      return CachedNetworkImage(
        imageUrl: url,
        cacheManager: cache,
        fit: fit,
        memCacheWidth: pixels,
        fadeInDuration: Duration.zero,
        fadeOutDuration: Duration.zero,
        placeholder: (context, _) => const ColoredBox(color: Color(0xffeeeeef)),
        errorWidget: (context, _, error) =>
            errorBuilder?.call(context, error, StackTrace.current) ??
            const Icon(Icons.image_not_supported_outlined),
      );
    },
  );
}
