import 'dart:async';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:video_player/video_player.dart';

import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';

/// Flutter implementation of the productdetails.html design.
class ProductDetailScreen extends ConsumerStatefulWidget {
  const ProductDetailScreen({super.key, required this.productId});

  final String productId;

  @override
  ConsumerState<ProductDetailScreen> createState() =>
      _ProductDetailScreenState();
}

class _ProductDetailScreenState extends ConsumerState<ProductDetailScreen> {
  Product? _product;
  VideoPlayerController? _video;
  Timer? _clock;
  bool _loading = true;
  String? _message;

  @override
  void initState() {
    super.initState();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
    _load();
  }

  @override
  void dispose() {
    _clock?.cancel();
    _video?.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.montserratTextTheme(
      Theme.of(context).textTheme,
    );
    return Theme(
      data: Theme.of(context).copyWith(textTheme: textTheme),
      child: Scaffold(
        backgroundColor: const Color(0xfffcfcfd),
        appBar: AppBar(
          backgroundColor: const Color(0xfffcfcfd).withValues(alpha: 0.92),
          foregroundColor: const Color(0xff363a34),
          elevation: 0,
          surfaceTintColor: Colors.transparent,
          leading: IconButton(
            tooltip: 'Back',
            onPressed: () => Navigator.of(context).maybePop(),
            icon: const Icon(Icons.arrow_back),
          ),
          title: const Text(
            'Licit',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
          ),
          actions: [
            IconButton(
              tooltip: 'Account',
              onPressed: () {},
              icon: const Icon(Icons.shopping_bag_outlined),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: _loading
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xff363a34)),
              )
            : _product == null
            ? Center(child: Text(_message ?? 'Produsul nu a fost gasit.'))
            : _ProductDetailsBody(
                product: _product!,
                video: _video,
                message: _message,
                onBid: _product!.isActive ? _placeBid : null,
                onBuyNow: _product!.canBuyNow ? _buyNow : null,
              ),
      ),
    );
  }

  Future<void> _load() async {
    try {
      final product = await ref
          .read(apiClientProvider)
          .product(widget.productId);
      if (!mounted) return;
      setState(() => _product = product);
      await _initVideo(product.videoUrl);
    } catch (error) {
      if (mounted) setState(() => _message = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _initVideo(String url) async {
    final uri = Uri.tryParse(url);
    if (uri == null) return;
    final controller = VideoPlayerController.networkUrl(uri);
    _video = controller;
    try {
      await controller.initialize();
      await controller.setLooping(true);
      await controller.play();
      if (mounted) setState(() {});
    } catch (_) {
      await controller.dispose();
      if (identical(_video, controller)) _video = null;
      if (mounted) setState(() => _message = 'Video-ul nu poate fi incarcat.');
    }
  }

  Future<void> _placeBid() async {
    final product = _product;
    if (product == null) return;
    try {
      final updated = await ref
          .read(apiClientProvider)
          .placeBid(product.id, product.nextBid);
      if (mounted) {
        setState(() {
          _product = updated;
          _message = 'Oferta trimisa.';
        });
      }
    } on DioException catch (error) {
      if (mounted) setState(() => _message = _messageFrom(error));
    }
  }

  Future<void> _buyNow() async {
    final product = _product;
    if (product == null) return;
    try {
      final updated = await ref.read(apiClientProvider).buyNow(product.id);
      if (mounted) {
        setState(() {
          _product = updated;
          _message = 'Produs rezervat.';
        });
      }
    } on DioException catch (error) {
      if (mounted) setState(() => _message = _messageFrom(error));
    }
  }

  String _messageFrom(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return error.message ?? 'Actiunea a esuat.';
  }
}

class _ProductDetailsBody extends StatelessWidget {
  const _ProductDetailsBody({
    required this.product,
    required this.video,
    required this.message,
    required this.onBid,
    required this.onBuyNow,
  });

  final Product product;
  final VideoPlayerController? video;
  final String? message;
  final VoidCallback? onBid;
  final VoidCallback? onBuyNow;

  @override
  Widget build(BuildContext context) {
    final ready = video?.value.isInitialized == true;
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 40),
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: AspectRatio(
            aspectRatio: 16 / 9,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (ready)
                  FittedBox(
                    fit: BoxFit.cover,
                    child: SizedBox(
                      width: video!.value.size.width,
                      height: video!.value.size.height,
                      child: VideoPlayer(video!),
                    ),
                  )
                else
                  const ColoredBox(color: Color(0xffeeeeef)),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topCenter,
                      end: Alignment.bottomCenter,
                      colors: [
                        Colors.black.withValues(alpha: 0.2),
                        Colors.transparent,
                      ],
                    ),
                  ),
                ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: _Badge(
                    label: product.isActive
                        ? 'LIVE AUCTION'
                        : product.status.toUpperCase(),
                  ),
                ),
                Center(
                  child: Icon(
                    ready && video!.value.isPlaying
                        ? Icons.pause_circle_outline_rounded
                        : Icons.play_circle_fill_rounded,
                    color: Colors.white.withValues(alpha: 0.92),
                    size: 64,
                  ),
                ),
                Positioned.fill(
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      onTap: ready
                          ? () async {
                              if (video!.value.isPlaying) {
                                await video!.pause();
                              } else {
                                await video!.play();
                              }
                            }
                          : null,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 16),
        const Row(
          children: [
            _MediaThumbnail(selected: true, icon: Icons.play_arrow_rounded),
            SizedBox(width: 12),
            _MediaThumbnail(icon: Icons.image_outlined),
            SizedBox(width: 12),
            _MediaThumbnail(icon: Icons.photo_library_outlined),
          ],
        ),
        const SizedBox(height: 30),
        const _SectionTitle('Description'),
        const SizedBox(height: 10),
        Text(
          product.description,
          style: const TextStyle(color: Color(0xff454842), height: 1.6),
        ),
        const SizedBox(height: 22),
        DecoratedBox(
          decoration: const BoxDecoration(
            border: Border(top: BorderSide(color: Color(0xffe2e2e3))),
          ),
          child: Padding(
            padding: const EdgeInsets.only(top: 18),
            child: Wrap(
              runSpacing: 18,
              children: [
                _Metadata(
                  label: 'Category',
                  value: product.category?.name ?? '-',
                ),
                _Metadata(label: 'Seller', value: product.seller?.name ?? '-'),
                _Metadata(
                  label: 'Starting price',
                  value: formatRon(product.startingPrice),
                ),
                if (product.hasReserve)
                  _Metadata(
                    label: 'Reserve',
                    value: product.reserveMet ? 'Met' : 'Not met',
                  ),
                _Metadata(label: 'Auction ends', value: _date(product.endsAt)),
              ],
            ),
          ),
        ),
        const SizedBox(height: 30),
        _PricingCard(
          product: product,
          message: message,
          onBid: onBid,
          onBuyNow: onBuyNow,
        ),
        const SizedBox(height: 18),
        _BidHistoryCard(currentBid: product.currentPrice),
        const SizedBox(height: 18),
        const Row(
          children: [
            Expanded(
              child: _Feature(icon: Icons.verified_outlined, label: 'Verified'),
            ),
            SizedBox(width: 10),
            Expanded(
              child: _Feature(
                icon: Icons.local_shipping_outlined,
                label: 'Insured',
              ),
            ),
            SizedBox(width: 10),
            Expanded(
              child: _Feature(
                icon: Icons.workspace_premium_outlined,
                label: 'Premium',
              ),
            ),
          ],
        ),
      ],
    );
  }

  String _date(DateTime value) =>
      '${value.day.toString().padLeft(2, '0')}/${value.month.toString().padLeft(2, '0')}/${value.year}';
}

class _PricingCard extends StatelessWidget {
  const _PricingCard({
    required this.product,
    required this.message,
    required this.onBid,
    required this.onBuyNow,
  });

  final Product product;
  final String? message;
  final VoidCallback? onBid;
  final VoidCallback? onBuyNow;

  @override
  Widget build(BuildContext context) {
    final remaining = product.endsAt.difference(DateTime.now());
    final time = remaining.isNegative
        ? 'ENDED'
        : '${remaining.inHours.toString().padLeft(2, '0')}:${remaining.inMinutes.remainder(60).toString().padLeft(2, '0')}:${remaining.inSeconds.remainder(60).toString().padLeft(2, '0')}';
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xffc5c7c0).withValues(alpha: 0.55),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            product.title,
            style: const TextStyle(
              color: Color(0xff4d514a),
              fontSize: 25,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 5),
          Text(
            'By ${product.seller?.name ?? 'Licit seller'}',
            style: const TextStyle(color: Color(0xff454842)),
          ),
          const SizedBox(height: 22),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: _PriceBlock(
                  label: 'CURRENT BID',
                  value: formatRon(product.currentPrice),
                ),
              ),
              _PriceBlock(
                label: 'ENDS IN',
                value: time,
                alignEnd: true,
                compact: true,
              ),
            ],
          ),
          const SizedBox(height: 22),
          Row(
            children: [
              Expanded(
                child: FilledButton(
                  onPressed: onBid,
                  style: FilledButton.styleFrom(
                    backgroundColor: const Color(0xff363a34),
                    foregroundColor: Colors.white,
                  ),
                  child: const Text('PLACE MAX BID'),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: onBuyNow,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xff363a34),
                    side: const BorderSide(color: Color(0xff363a34)),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      'BUY ${formatRon(product.buyNowPrice)}',
                      maxLines: 1,
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
              ),
            ],
          ),
          if (message != null) ...[
            const SizedBox(height: 14),
            Text(
              message!,
              style: const TextStyle(
                color: Color(0xff454842),
                fontWeight: FontWeight.w600,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _BidHistoryCard extends StatelessWidget {
  const _BidHistoryCard({required this.currentBid});
  final int currentBid;

  @override
  Widget build(BuildContext context) => Container(
    decoration: BoxDecoration(
      color: const Color(0xfff3f3f4),
      borderRadius: BorderRadius.circular(12),
      border: Border.all(color: const Color(0xffe2e2e3)),
    ),
    child: Padding(
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Bid History',
            style: TextStyle(
              color: Color(0xff4d514a),
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            'Live bids are reflected in the current price: ${formatRon(currentBid)}.',
            style: const TextStyle(color: Color(0xff454842), height: 1.45),
          ),
        ],
      ),
    ),
  );
}

class _PriceBlock extends StatelessWidget {
  const _PriceBlock({
    required this.label,
    required this.value,
    this.alignEnd = false,
    this.compact = false,
  });
  final String label;
  final String value;
  final bool alignEnd;
  final bool compact;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: alignEnd
        ? CrossAxisAlignment.end
        : CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(
          color: Color(0xff454842),
          fontSize: 11,
          fontWeight: FontWeight.w700,
          letterSpacing: 0.8,
        ),
      ),
      const SizedBox(height: 4),
      Text(
        value,
        style: TextStyle(
          color: const Color(0xff363a34),
          fontSize: compact ? 20 : 31,
          fontWeight: FontWeight.w800,
        ),
      ),
    ],
  );
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle(this.value);
  final String value;
  @override
  Widget build(BuildContext context) => Text(
    value,
    style: const TextStyle(
      color: Color(0xff4d514a),
      fontSize: 23,
      fontWeight: FontWeight.w700,
    ),
  );
}

class _Metadata extends StatelessWidget {
  const _Metadata({required this.label, required this.value});
  final String label;
  final String value;
  @override
  Widget build(BuildContext context) => SizedBox(
    width: MediaQuery.sizeOf(context).width > 600
        ? 250
        : MediaQuery.sizeOf(context).width / 2 - 20,
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: const TextStyle(
            color: Color(0xff454842),
            fontSize: 11,
            fontWeight: FontWeight.w700,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: const TextStyle(
            color: Color(0xff363a34),
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    ),
  );
}

class _Badge extends StatelessWidget {
  const _Badge({required this.label});
  final String label;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 6),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.9),
      borderRadius: BorderRadius.circular(5),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        const Icon(Icons.circle, size: 8, color: Color(0xffba1a1a)),
        const SizedBox(width: 6),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xff4d514a),
            fontSize: 11,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.7,
          ),
        ),
      ],
    ),
  );
}

class _MediaThumbnail extends StatelessWidget {
  const _MediaThumbnail({required this.icon, this.selected = false});
  final IconData icon;
  final bool selected;
  @override
  Widget build(BuildContext context) => Container(
    width: 68,
    height: 68,
    decoration: BoxDecoration(
      color: const Color(0xffeeeeef),
      borderRadius: BorderRadius.circular(8),
      border: Border.all(
        color: selected ? const Color(0xff363a34) : const Color(0xffc5c7c0),
      ),
    ),
    child: Icon(icon, color: const Color(0xff454842)),
  );
}

class _Feature extends StatelessWidget {
  const _Feature({required this.icon, required this.label});
  final IconData icon;
  final String label;
  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(vertical: 14, horizontal: 6),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(8),
      border: Border.all(color: const Color(0xffe2e2e3)),
    ),
    child: Column(
      children: [
        Icon(icon, color: const Color(0xff454842)),
        const SizedBox(height: 6),
        Text(
          label,
          style: const TextStyle(
            color: Color(0xff454842),
            fontSize: 11,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    ),
  );
}
