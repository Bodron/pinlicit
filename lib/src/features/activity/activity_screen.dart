import '../../shared/images/product_image.dart';
import 'package:licit/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../seller/seller_screen.dart';
import '../../shared/models/bid.dart';
import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';

enum _ActivityFilter { all, bids, watching, wins }

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key, this.showSales = false});

  final bool showSales;

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  List<Bid> _bids = [];
  Set<String> _wonProductIds = {};
  List<Product> _favorites = [];
  _ActivityFilter _filter = _ActivityFilter.all;
  bool _loading = true;
  bool _salesVisited = false;
  bool _purchasesVisited = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _salesVisited = widget.showSales;
    if (!widget.showSales) _load();
  }

  @override
  void didUpdateWidget(covariant ActivityScreen oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.showSales) {
      _salesVisited = true;
    } else if (!_purchasesVisited) {
      _load();
    }
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
      ),
      child: ColoredBox(
        color: const Color(0xfff9f9fa),
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(24, 22, 24, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  context.l10n.navActivity,
                  style: const TextStyle(
                    color: Color(0xff1a1c1d),
                    fontSize: 30,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
              child: SizedBox(
                width: double.infinity,
                child: SegmentedButton<bool>(
                  style: SegmentedButton.styleFrom(
                    foregroundColor: const Color(0xff454842),
                    backgroundColor: const Color(0xfff9f9fa),
                    selectedForegroundColor: Theme.of(
                      context,
                    ).colorScheme.onSecondaryContainer,
                    selectedBackgroundColor: Theme.of(
                      context,
                    ).colorScheme.secondaryContainer,
                    side: const BorderSide(color: Color(0xffc5c7c0)),
                    textStyle: const TextStyle(fontWeight: FontWeight.w600),
                  ),
                  segments: [
                    ButtonSegment(
                      value: false,
                      icon: const Icon(Icons.shopping_bag_outlined),
                      label: Text(context.l10n.activityPurchases),
                    ),
                    ButtonSegment(
                      value: true,
                      icon: const Icon(Icons.sell_outlined),
                      label: Text(context.l10n.activitySales),
                    ),
                  ],
                  selected: {widget.showSales},
                  onSelectionChanged: (selected) => context.go(
                    selected.first ? '/activity?section=sales' : '/activity',
                  ),
                ),
              ),
            ),
            TextButton.icon(
              onPressed: () => context.push('/commerce'),
              icon: const Icon(Icons.payments_outlined),
              label: const Text('Plăți, comenzi și garanții'),
            ),
            Expanded(
              child: IndexedStack(
                index: widget.showSales ? 1 : 0,
                children: [
                  TickerMode(
                    enabled: !widget.showSales,
                    child: Column(
                      children: [
                        _FilterTabs(selected: _filter, onSelected: _select),
                        Expanded(child: _buildContent()),
                      ],
                    ),
                  ),
                  TickerMode(
                    enabled: widget.showSales,
                    child: _salesVisited
                        ? const SellerScreen()
                        : const SizedBox.shrink(),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildContent() {
    if (_loading) {
      return const Center(
        child: CircularProgressIndicator(color: Color(0xff363a34)),
      );
    }
    if (_error != null) {
      return _ActivityMessage(message: _error!, action: _load);
    }
    if (_filter == _ActivityFilter.watching && _favorites.isNotEmpty) {
      return RefreshIndicator(
        color: const Color(0xff363a34),
        onRefresh: _load,
        child: ListView.separated(
          padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
          itemCount: _favorites.length,
          separatorBuilder: (_, _) => const SizedBox(height: 12),
          itemBuilder: (context, index) =>
              _FavoriteActivityCard(product: _favorites[index]),
        ),
      );
    }
    if (_filter == _ActivityFilter.watching && _favorites.isEmpty) {
      return _ActivityMessage(message: context.l10n.noWatchedProducts);
    }
    if (_filter == _ActivityFilter.watching) {
      return _ActivityMessage(message: context.l10n.watchlistEmpty);
    }

    final items = _filter == _ActivityFilter.wins
        ? _bids.where(_isWin).toList()
        : _bids;
    if (items.isEmpty) {
      return _ActivityMessage(
        message: _filter == _ActivityFilter.wins
            ? context.l10n.noWonAuctions
            : context.l10n.noActivity,
      );
    }
    return RefreshIndicator(
      color: const Color(0xff363a34),
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) =>
            _ActivityCard(bid: items[index], won: _isWin(items[index])),
      ),
    );
  }

  bool _isWin(Bid bid) {
    final product = bid.product;
    if (product == null) return false;
    if (product.commerceVersion == 1) {
      return _wonProductIds.contains(product.id);
    }
    return (product.status == 'reserved' || product.status == 'sold') &&
        bid.maxAmount >= product.currentPrice;
  }

  Future<void> _load() async {
    _purchasesVisited = true;
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.myBids(),
        api.myFavorites(),
        api.commerceList('orders'),
      ]);
      if (mounted) {
        setState(() {
          _bids = results[0] as List<Bid>;
          _favorites = results[1] as List<Product>;
          final userId = ref.read(sessionControllerProvider).user?.id;
          _wonProductIds = (results[2] as List<Map<String, dynamic>>)
              .where((order) => order['buyerId'] == userId)
              .map((order) => order['productId'] as String)
              .toSet();
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = context.l10n.activityLoadFailed);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _select(_ActivityFilter filter) => setState(() => _filter = filter);
}

class _FilterTabs extends StatelessWidget {
  const _FilterTabs({required this.selected, required this.onSelected});
  final _ActivityFilter selected;
  final ValueChanged<_ActivityFilter> onSelected;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: const BoxDecoration(
      color: Color(0xfff9f9fa),
      border: Border(bottom: BorderSide(color: Color(0xffe2e2e3))),
    ),
    child: Row(
      children: [
        Expanded(
          child: _Tab(
            label: context.l10n.all,
            active: selected == _ActivityFilter.all,
            onTap: () => onSelected(_ActivityFilter.all),
          ),
        ),
        Expanded(
          child: _Tab(
            label: context.l10n.bids,
            active: selected == _ActivityFilter.bids,
            onTap: () => onSelected(_ActivityFilter.bids),
          ),
        ),
        Expanded(
          child: _Tab(
            label: context.l10n.watching,
            active: selected == _ActivityFilter.watching,
            onTap: () => onSelected(_ActivityFilter.watching),
          ),
        ),
        Expanded(
          child: _Tab(
            label: context.l10n.wins,
            active: selected == _ActivityFilter.wins,
            onTap: () => onSelected(_ActivityFilter.wins),
          ),
        ),
      ],
    ),
  );
}

class _Tab extends StatelessWidget {
  const _Tab({required this.label, required this.active, required this.onTap});
  final String label;
  final bool active;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 15),
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: active ? const Color(0xff363a34) : Colors.transparent,
            width: 2,
          ),
        ),
      ),
      child: Center(
        child: Text(
          label,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: TextStyle(
            color: active
                ? const Color(0xff363a34)
                : const Color(0xff454842).withValues(alpha: 0.65),
            fontWeight: FontWeight.w700,
          ),
        ),
      ),
    ),
  );
}

class _ActivityCard extends StatelessWidget {
  const _ActivityCard({required this.bid, required this.won});
  final Bid bid;
  final bool won;

  @override
  Widget build(BuildContext context) {
    final product = bid.product;
    final outbid =
        product != null &&
        product.isActive &&
        bid.maxAmount < product.currentPrice;
    final title = product?.title ?? context.l10n.auction;
    final type = won
        ? context.l10n.success
        : outbid
        ? context.l10n.outbidAlert
        : product?.isActive == true
        ? context.l10n.activeBid
        : context.l10n.bidActivity;
    final icon = won
        ? Icons.celebration_outlined
        : outbid
        ? Icons.gavel_outlined
        : Icons.timer_outlined;
    final accent = outbid ? const Color(0xffba1a1a) : const Color(0xff4d514a);
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xffc5c7c0).withValues(alpha: 0.48),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ProductActivityImage(
            imageUrl: product?.imageForWidth(
              72 * MediaQuery.devicePixelRatioOf(context),
            ),
            icon: icon,
            accent: accent,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(icon, size: 16, color: accent),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        type,
                        style: TextStyle(
                          color: accent,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  won
                      ? context.l10n.youWon(title)
                      : outbid
                      ? context.l10n.youWereOutbid(title)
                      : context.l10n.yourBidFor(title),
                  style: const TextStyle(
                    color: Color(0xff1a1c1d),
                    fontSize: 15,
                    height: 1.3,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 5),
                Text.rich(
                  TextSpan(
                    style: const TextStyle(
                      color: Color(0xff454842),
                      fontSize: 13,
                    ),
                    children: [
                      TextSpan(text: context.l10n.yourBidPrefix),
                      TextSpan(
                        text: formatRon(bid.maxAmount),
                        style: const TextStyle(
                          color: Color(0xff363a34),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (product != null) ...[
                        TextSpan(text: context.l10n.currentBidBullet),
                        TextSpan(
                          text: formatRon(product.currentPrice),
                          style: const TextStyle(
                            color: Color(0xff363a34),
                            fontWeight: FontWeight.w700,
                          ),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  _ago(context, bid.createdAt),
                  style: const TextStyle(
                    color: Color(0xff454842),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          if (product != null)
            TextButton(
              onPressed: () => context.push('/products/${product.id}'),
              child: Text(
                won
                    ? context.l10n.viewUpper
                    : outbid
                    ? context.l10n.rebidUpper
                    : context.l10n.openUpper,
              ),
            ),
        ],
      ),
    );
  }

  String _ago(BuildContext context, DateTime value) {
    final difference = DateTime.now().difference(value);
    if (difference.inMinutes < 1) return context.l10n.justNow;
    if (difference.inHours < 1) {
      return context.l10n.minutesAgo(difference.inMinutes);
    }
    if (difference.inDays < 1) return context.l10n.hoursAgo(difference.inHours);
    return context.l10n.daysAgo(difference.inDays);
  }
}

class _FavoriteActivityCard extends StatelessWidget {
  const _FavoriteActivityCard({required this.product});
  final Product product;

  @override
  Widget build(BuildContext context) {
    final active = product.isActive;
    final accent = active ? const Color(0xff4d514a) : const Color(0xff8a6f19);

    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: const Color(0xffc5c7c0).withValues(alpha: 0.48),
        ),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _ProductActivityImage(
            imageUrl: product.imageForWidth(
              72 * MediaQuery.devicePixelRatioOf(context),
            ),
            icon: Icons.favorite,
            accent: accent,
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Icon(Icons.favorite, size: 16, color: accent),
                    const SizedBox(width: 5),
                    Expanded(
                      child: Text(
                        active ? context.l10n.watching : context.l10n.savedItem,
                        style: TextStyle(
                          color: accent,
                          fontSize: 12,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 5),
                Text(
                  product.title,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xff1a1c1d),
                    fontSize: 15,
                    height: 1.3,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 5),
                Text.rich(
                  TextSpan(
                    style: const TextStyle(
                      color: Color(0xff454842),
                      fontSize: 13,
                    ),
                    children: [
                      TextSpan(text: context.l10n.currentBidPrefix),
                      TextSpan(
                        text: formatRon(product.currentPrice),
                        style: const TextStyle(
                          color: Color(0xff363a34),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      TextSpan(text: context.l10n.buyNowBullet),
                      TextSpan(
                        text: formatRon(product.buyNowPrice),
                        style: const TextStyle(
                          color: Color(0xff363a34),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  active
                      ? context.l10n.auctionActive
                      : localizedStatus(product.status, context.l10n),
                  style: const TextStyle(
                    color: Color(0xff454842),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: () => context.push('/products/${product.id}'),
            child: Text(context.l10n.openUpper),
          ),
        ],
      ),
    );
  }
}

class _ProductActivityImage extends StatelessWidget {
  const _ProductActivityImage({
    required this.imageUrl,
    required this.icon,
    required this.accent,
  });

  final String? imageUrl;
  final IconData icon;
  final Color accent;

  @override
  Widget build(BuildContext context) {
    final hasImage = imageUrl != null && imageUrl!.trim().isNotEmpty;
    return ClipRRect(
      borderRadius: BorderRadius.circular(9),
      child: SizedBox(
        width: 72,
        height: 72,
        child: hasImage
            ? ProductImage(
                url: imageUrl!,
                fit: BoxFit.cover,
                errorBuilder: (_, _, _) => _fallback(),
              )
            : _fallback(),
      ),
    );
  }

  Widget _fallback() => ColoredBox(
    color: const Color(0xffe4e3d8),
    child: Icon(icon, color: accent),
  );
}

class _ActivityMessage extends StatelessWidget {
  const _ActivityMessage({required this.message, this.action});
  final String message;
  final VoidCallback? action;
  @override
  Widget build(BuildContext context) => Center(
    child: Padding(
      padding: const EdgeInsets.all(32),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.notifications_none,
            size: 48,
            color: Color(0xff5e5f57),
          ),
          const SizedBox(height: 14),
          Text(
            message,
            textAlign: TextAlign.center,
            style: const TextStyle(color: Color(0xff454842), height: 1.4),
          ),
          if (action != null) ...[
            const SizedBox(height: 16),
            OutlinedButton(
              onPressed: action,
              child: Text(context.l10n.tryAgain),
            ),
          ],
        ],
      ),
    ),
  );
}
