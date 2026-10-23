import '../commerce/commerce_flow.dart';
import '../../shared/images/product_image.dart';
import 'package:intl/intl.dart';
import 'package:licit/l10n/l10n.dart';
import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/widgets/app_layout.dart';
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
  Timer? _clock;
  bool _visible = false;
  bool _loading = true;
  String? _message;

  @override
  void initState() {
    super.initState();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted && _visible) setState(() {});
    });
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _visible =
        AppLayoutVisibility.locationOf(context) ==
        '/products/${widget.productId}';
  }

  @override
  void dispose() {
    _clock?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final textTheme = GoogleFonts.montserratTextTheme(
      Theme.of(context).textTheme.apply(
        bodyColor: const Color(0xff363a34),
        displayColor: const Color(0xff363a34),
      ),
    );
    return Theme(
      data: Theme.of(context).copyWith(
        colorScheme: ColorScheme.fromSeed(
          seedColor: const Color(0xff0f766e),
          brightness: Brightness.light,
        ),
        textTheme: textTheme,
      ),
      child: ColoredBox(
        color: const Color(0xfffcfcfd),
        child: _loading
            ? const Center(
                child: CircularProgressIndicator(color: Color(0xff363a34)),
              )
            : _product == null
            ? Center(child: Text(_message ?? context.l10n.productNotFound))
            : _ProductDetailsBody(
                product: _product!,
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
    } catch (error) {
      if (mounted) {
        setState(() => _message = localizedError(error, context.l10n));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  bool _commerceBusy = false;
  Future<void> _placeBid() async {
    if (_commerceBusy) return;
    final product = _product;
    if (product == null) return;
    _commerceBusy = true;
    try {
      final maximum = await chooseBidMaximum(context, product);
      if (maximum == null || !mounted) return;
      if (!await ensureBidGuarantee(context, ref, product, maximum) ||
          !mounted) {
        return;
      }
      final updated = await ref
          .read(apiClientProvider)
          .placeBid(product.id, maximum);
      if (mounted) {
        setState(() {
          _product = updated;
          _message = context.l10n.bidSubmitted;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _message = commerceError(error));
    } finally {
      _commerceBusy = false;
    }
  }

  Future<void> _buyNow() async {
    if (_commerceBusy) return;
    final product = _product;
    if (product == null) return;
    final userId = ref.read(sessionControllerProvider).user?.id;
    if (userId != null && product.seller?.id == userId) {
      setState(() => _message = context.l10n.ownProductBuy);
      return;
    }
    _commerceBusy = true;
    try {
      if (product.commerceVersion != 1) {
        throw StateError(
          'Vânzătorul trebuie să activeze plata Stripe pentru acest anunț vechi.',
        );
      }
      if (product.commerceVersion == 1 &&
          !await ensureCommerceIdentity(context, ref)) {
        return;
      }
      final updated = await ref.read(apiClientProvider).buyNow(product.id);
      if (mounted) {
        setState(() {
          _product = updated;
          _message = updated.commerceVersion == 1
              ? 'Produs rezervat. Finalizează plata în Plăți și comenzi.'
              : context.l10n.productReserved;
        });
      }
      if (mounted) await openProductPayment(context, ref, updated);
    } catch (error) {
      if (mounted) setState(() => _message = commerceError(error));
    } finally {
      _commerceBusy = false;
    }
  }
}

class _ProductDetailsBody extends StatelessWidget {
  const _ProductDetailsBody({
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
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 40),
      children: [
        ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: AspectRatio(
            aspectRatio: 4 / 3,
            child: Stack(
              fit: StackFit.expand,
              children: [
                if (product.imageUrl.isNotEmpty)
                  ProductImage(
                    url: product.imageForWidth(
                      MediaQuery.sizeOf(context).width *
                          MediaQuery.devicePixelRatioOf(context),
                    ),
                    fit: BoxFit.contain,
                    errorBuilder: (context, error, stackTrace) =>
                        Center(child: Text(context.l10n.imageLoadFailed)),
                  )
                else
                  const ColoredBox(
                    color: Color(0xffeeeeef),
                    child: Center(child: Icon(Icons.image_outlined, size: 64)),
                  ),
                Positioned(
                  top: 12,
                  left: 12,
                  child: _Badge(
                    label: product.isActive
                        ? context.l10n.liveAuction
                        : localizedStatus(product.status, context.l10n),
                  ),
                ),
              ],
            ),
          ),
        ),
        const SizedBox(height: 30),
        _SectionTitle(context.l10n.description),
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
                  label: context.l10n.category,
                  value: product.category == null
                      ? '-'
                      : localizedCategory(product.category!.name, context.l10n),
                ),
                _Metadata(
                  label: context.l10n.seller,
                  value: product.seller?.name ?? '-',
                ),
                _Metadata(
                  label: context.l10n.startingPrice,
                  value: formatRon(product.startingPrice),
                ),
                if (product.hasReserve)
                  _Metadata(
                    label: context.l10n.reserve,
                    value: product.reserveMet
                        ? context.l10n.met
                        : context.l10n.notMet,
                  ),
                _Metadata(
                  label: context.l10n.auctionEnds,
                  value: _date(product.endsAt),
                ),
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
        Row(
          children: [
            Expanded(
              child: _Feature(
                icon: Icons.verified_outlined,
                label: context.l10n.verified,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Feature(
                icon: Icons.local_shipping_outlined,
                label: context.l10n.insured,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: _Feature(
                icon: Icons.workspace_premium_outlined,
                label: context.l10n.premium,
              ),
            ),
          ],
        ),
      ],
    );
  }

  String _date(DateTime value) =>
      DateFormat('dd.MM.yyyy HH:mm', 'ro').format(value.toLocal());
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
        ? context.l10n.endedUpper
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
            context.l10n.sellerBy(
              product.seller?.name ?? context.l10n.defaultSeller,
            ),
            style: const TextStyle(color: Color(0xff454842)),
          ),
          const SizedBox(height: 22),
          Row(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Expanded(
                child: _PriceBlock(
                  label: context.l10n.currentBidUpper,
                  value: formatRon(product.currentPrice),
                ),
              ),
              _PriceBlock(
                label: context.l10n.endsInUpper,
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
                    disabledBackgroundColor: const Color(0xffe6e7e2),
                    disabledForegroundColor: const Color(0xff62665e),
                  ),
                  child: Text(context.l10n.placeMaxBid),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: OutlinedButton(
                  onPressed: onBuyNow,
                  style: OutlinedButton.styleFrom(
                    foregroundColor: const Color(0xff363a34),
                    disabledBackgroundColor: const Color(0xfff0f1ed),
                    disabledForegroundColor: const Color(0xff62665e),
                    side: const BorderSide(color: Color(0xff363a34)),
                    padding: const EdgeInsets.symmetric(horizontal: 8),
                  ),
                  child: FittedBox(
                    fit: BoxFit.scaleDown,
                    child: Text(
                      context.l10n.buyAmount(formatRon(product.buyNowPrice)),
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
          Text(
            context.l10n.bidHistory,
            style: const TextStyle(
              color: Color(0xff4d514a),
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          Text(
            context.l10n.liveBidsPrice(formatRon(currentBid)),
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
