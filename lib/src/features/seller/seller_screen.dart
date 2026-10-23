import '../../shared/images/product_image.dart';
import 'package:licit/l10n/l10n.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../products/create_product_screen.dart';
import '../../shared/models/product.dart';
import '../../shared/models/seller_application.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/notifications/app_notifier.dart';
import '../../shared/state/catalog_updates.dart';
import '../../shared/utils/money.dart';

/// The publishing tab contains only the form (or the required seller access).
class SellScreen extends ConsumerWidget {
  const SellScreen({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final isSeller = ref.watch(
      sessionControllerProvider.select(
        (session) => session.user?.isSeller == true,
      ),
    );
    // Discard a successfully published draft, but preserve unfinished forms
    // when navigating between the persistent tabs.
    final revision = ref.watch(catalogUpdatesProvider);
    return isSeller
        ? CreateProductScreen(key: ValueKey(revision))
        : const SellerAccessScreen();
  }
}

/// Seller performance and inventory, hosted by the Activity tab.
class SellerScreen extends ConsumerStatefulWidget {
  const SellerScreen({super.key});

  @override
  ConsumerState<SellerScreen> createState() => _SellerScreenState();
}

class _SellerScreenState extends ConsumerState<SellerScreen> {
  List<Product> _products = [];
  bool _loading = true;
  String? _message;
  int _request = 0;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(catalogUpdatesProvider, (_, _) => _load());
    final session = ref.watch(sessionControllerProvider);
    final user = session.user;
    if (user?.isSeller != true) return const SellerAccessScreen();
    final theme = Theme.of(context).copyWith(
      textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
    );

    return Theme(
      data: theme,
      child: ColoredBox(
        color: _SellerColors.background,
        child: SafeArea(
          bottom: false,
          child: Column(
            children: [
              Expanded(
                child: RefreshIndicator(
                  color: _SellerColors.primaryContainer,
                  onRefresh: _load,
                  child: CustomScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    slivers: [
                      if (_loading)
                        const SliverToBoxAdapter(child: _LoadingStrip()),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                        sliver: SliverToBoxAdapter(
                          child: _SellerHeader(
                            sellerName:
                                user?.name ?? context.l10n.defaultSellerName,
                            message: _message,
                            onNewListing: () => _handleNewListing(),
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                        sliver: SliverToBoxAdapter(
                          child: _PerformanceGrid(
                            activeCount: _activeProducts.length,
                            soldCount: _soldProducts.length,
                            revenueBani: _revenueBani,
                          ),
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 64, 16, 120),
                        sliver: SliverToBoxAdapter(
                          child: LayoutBuilder(
                            builder: (context, constraints) {
                              final wide = constraints.maxWidth >= 940;
                              if (!wide) {
                                return Column(
                                  crossAxisAlignment:
                                      CrossAxisAlignment.stretch,
                                  children: [
                                    _ActiveAuctionsSection(
                                      products: _products,
                                      onOpenProduct: _openProduct,
                                      onNewListing: () => _handleNewListing(),
                                    ),
                                    const SizedBox(height: 48),
                                    _SellerSidebar(
                                      products: _products,
                                      onComingSoon: _showComingSoon,
                                    ),
                                  ],
                                );
                              }

                              return Row(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Expanded(
                                    flex: 8,
                                    child: _ActiveAuctionsSection(
                                      products: _products,
                                      onOpenProduct: _openProduct,
                                      onNewListing: () => _handleNewListing(),
                                    ),
                                  ),
                                  const SizedBox(width: 64),
                                  Expanded(
                                    flex: 4,
                                    child: _SellerSidebar(
                                      products: _products,
                                      onComingSoon: _showComingSoon,
                                    ),
                                  ),
                                ],
                              );
                            },
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  List<Product> get _activeProducts =>
      _products.where((product) => product.isActive).toList();

  List<Product> get _soldProducts =>
      _products.where((product) => product.status == 'sold').toList();

  int get _revenueBani => _soldProducts.fold<int>(
    0,
    (total, product) => total + product.currentPrice,
  );

  Future<void> _load() async {
    final request = ++_request;
    if (ref.read(sessionControllerProvider).user?.isSeller != true) {
      setState(() => _loading = false);
      return;
    }
    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      final products = await ref.read(apiClientProvider).myProducts();
      if (!mounted || request != _request) return;
      setState(() => _products = products);
    } catch (error) {
      if (mounted && request == _request) {
        setState(() => _message = localizedError(error, context.l10n));
      }
    } finally {
      if (mounted && request == _request) setState(() => _loading = false);
    }
  }

  void _openProduct(Product product) => context.push('/products/${product.id}');
  void _handleNewListing() => context.go('/seller');
  void _showComingSoon(String label) {
    context.notifier.info(context.l10n.featureComingSoon(label));
  }
}

/// Shared access form for accounts that cannot publish yet.
class SellerAccessScreen extends ConsumerStatefulWidget {
  const SellerAccessScreen({super.key});
  @override
  ConsumerState<SellerAccessScreen> createState() => _SellerAccessScreenState();
}

class _SellerAccessScreenState extends ConsumerState<SellerAccessScreen> {
  final _displayName = TextEditingController();
  final _phone = TextEditingController();
  final _notes = TextEditingController();
  List<SellerApplication> _applications = [];
  bool _loading = true;
  bool _submitting = false;
  String? _message;

  @override
  void initState() {
    super.initState();
    final user = ref.read(sessionControllerProvider).user;
    _displayName.text = user?.name ?? '';
    _phone.text = user?.phone ?? '';
    _load();
  }

  @override
  void dispose() {
    _displayName.dispose();
    _phone.dispose();
    _notes.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    try {
      final applications = await ref
          .read(apiClientProvider)
          .mySellerApplications();
      if (mounted) setState(() => _applications = applications);
    } catch (error) {
      if (mounted) {
        setState(() => _message = localizedError(error, context.l10n));
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _requestSeller() async {
    if (_submitting) return;
    setState(() {
      _submitting = true;
      _message = null;
    });
    try {
      await ref
          .read(apiClientProvider)
          .requestSeller(
            displayName: _displayName.text.trim(),
            contactPhone: _phone.text.trim(),
            notes: _notes.text.trim(),
          );
      if (mounted) await _load();
    } on DioException catch (error) {
      if (mounted) {
        setState(() => _message = localizedError(error, context.l10n));
      }
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) => RefreshIndicator(
    onRefresh: _load,
    child: ListView(
      physics: const AlwaysScrollableScrollPhysics(),
      padding: const EdgeInsets.fromLTRB(16, 24, 16, 32),
      children: [
        if (_loading) const _LoadingStrip(),
        if (_message != null) ...[
          _InlineNotice(icon: Icons.info_outline, text: _message!),
          const SizedBox(height: 16),
        ],
        _SellerApplicationPanel(
          displayName: _displayName,
          phone: _phone,
          notes: _notes,
          applications: _applications,
          onSubmit: _submitting ? null : _requestSeller,
        ),
      ],
    ),
  );
}

class _SellerColors {
  static const background = Color(0xfff9f9fa);
  static const surface = Color(0xffffffff);
  static const surfaceLow = Color(0xfff3f3f4);
  static const surfaceContainer = Color(0xffeeeeef);
  static const surfaceHigh = Color(0xffe8e8e9);
  static const secondaryContainer = Color(0xffe4e3d8);
  static const outlineVariant = Color(0xffc5c7c0);
  static const primary = Color(0xff363a34);
  static const primaryContainer = Color(0xff4d514a);
  static const onSurfaceVariant = Color(0xff454842);
  static const error = Color(0xffba1a1a);
  static const success = Color(0xff2f7d42);
  static const pending = Color(0xffa66a12);
}

class _SellerHeader extends StatelessWidget {
  const _SellerHeader({
    required this.sellerName,
    required this.message,
    required this.onNewListing,
  });

  final String sellerName;
  final String? message;
  final VoidCallback? onNewListing;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 430;
        final titleBlock = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              context.l10n.overview,
              style: const TextStyle(
                color: _SellerColors.onSurfaceVariant,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.8,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              context.l10n.performance,
              style: const TextStyle(
                color: _SellerColors.primary,
                fontSize: 30,
                height: 1.3,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              context.l10n.sellerDashboard(sellerName),
              style: const TextStyle(
                color: _SellerColors.onSurfaceVariant,
                fontSize: 16,
                height: 1.5,
              ),
            ),
          ],
        );
        final button = FilledButton.icon(
          onPressed: onNewListing,
          style: FilledButton.styleFrom(
            backgroundColor: _SellerColors.primary,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          icon: const Icon(Icons.add, size: 18),
          label: Text(context.l10n.newListing),
        );

        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (compact) ...[
              titleBlock,
              const SizedBox(height: 14),
              SizedBox(width: double.infinity, child: button),
            ] else
              Row(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  Expanded(child: titleBlock),
                  const SizedBox(width: 16),
                  button,
                ],
              ),
            if (message != null) ...[
              const SizedBox(height: 16),
              _InlineNotice(icon: Icons.info_outline, text: message!),
            ],
          ],
        );
      },
    );
  }
}

class _PerformanceGrid extends StatelessWidget {
  const _PerformanceGrid({
    required this.activeCount,
    required this.soldCount,
    required this.revenueBani,
  });

  final int activeCount;
  final int soldCount;
  final int revenueBani;

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final columns = constraints.maxWidth >= 760 ? 3 : 1;
        return GridView(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: columns,
            crossAxisSpacing: 24,
            mainAxisSpacing: 24,
            childAspectRatio: columns == 1 ? 2.15 : 1.55,
          ),
          children: [
            _MetricCard(
              icon: Icons.gavel_outlined,
              value: activeCount.toString(),
              label: context.l10n.activeAuctions,
            ),
            _MetricCard(
              icon: Icons.check_circle_outline,
              value: soldCount.toString(),
              label: context.l10n.itemsSold,
            ),
            _MetricCard(
              icon: Icons.payments_outlined,
              value: formatRon(revenueBani),
              label: context.l10n.totalRevenue,
              inverted: true,
            ),
          ],
        );
      },
    );
  }
}

class _MetricCard extends StatelessWidget {
  const _MetricCard({
    required this.icon,
    required this.value,
    required this.label,
    this.inverted = false,
  });

  final IconData icon;
  final String value;
  final String label;
  final bool inverted;

  @override
  Widget build(BuildContext context) {
    final foreground = inverted ? Colors.white : _SellerColors.primary;

    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: inverted
            ? _SellerColors.primaryContainer
            : _SellerColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color:
              (inverted ? _SellerColors.primary : _SellerColors.outlineVariant)
                  .withValues(alpha: 0.3),
        ),
      ),
      child: Stack(
        children: [
          Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Icon(icon, color: foreground.withValues(alpha: 0.58)),
                ],
              ),
              const Spacer(),
              FittedBox(
                fit: BoxFit.scaleDown,
                alignment: Alignment.centerLeft,
                child: Text(
                  value,
                  style: TextStyle(
                    color: foreground,
                    fontSize: 44,
                    height: 1.05,
                    fontWeight: FontWeight.w800,
                  ),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                label.toUpperCase(),
                style: TextStyle(
                  color: foreground.withValues(alpha: inverted ? 0.74 : 0.68),
                  fontSize: 12,
                  fontWeight: FontWeight.w800,
                  letterSpacing: 1,
                ),
              ),
            ],
          ),
          Positioned(
            right: -8,
            bottom: -10,
            child: Icon(
              icon,
              size: 96,
              color: foreground.withValues(alpha: inverted ? 0.07 : 0.04),
            ),
          ),
        ],
      ),
    );
  }
}

class _ActiveAuctionsSection extends StatefulWidget {
  const _ActiveAuctionsSection({
    required this.products,
    required this.onOpenProduct,
    required this.onNewListing,
  });

  final List<Product> products;
  final ValueChanged<Product> onOpenProduct;
  final VoidCallback? onNewListing;

  @override
  State<_ActiveAuctionsSection> createState() => _ActiveAuctionsSectionState();
}

class _ActiveAuctionsSectionState extends State<_ActiveAuctionsSection> {
  int _page = 0;

  @override
  Widget build(BuildContext context) {
    final products = widget.products;
    final pages = ((products.length + 5) ~/ 6).clamp(1, 1 << 30);
    final page = _page.clamp(0, pages - 1);
    final visible = products.skip(page * 6).take(6).toList();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            Expanded(
              child: Text(
                context.l10n.myListings,
                style: const TextStyle(
                  color: _SellerColors.primary,
                  fontSize: 24,
                  height: 1.4,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton(
              onPressed: widget.onNewListing,
              child: Text(context.l10n.newListing),
            ),
          ],
        ),
        const SizedBox(height: 24),
        if (products.isEmpty) Text(context.l10n.addFirstProduct),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 640 ? 2 : 1;
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: visible.length,
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 24,
                mainAxisSpacing: 24,
                childAspectRatio: 0.64,
              ),
              itemBuilder: (context, index) {
                final item = visible[index];
                return _ProductAuctionCard(
                  title: item.title,
                  subtitle: context.l10n.statusHighest(
                    localizedStatus(item.status, context.l10n),
                    formatRon(item.currentPrice),
                  ),
                  imageUrl: item.imageForWidth(320),
                  remaining: _remaining(context, item.endsAt),
                  fallbackIcon: Icons.sell_outlined,
                  onTap: () => widget.onOpenProduct(item),
                );
              },
            );
          },
        ),
        if (pages > 1)
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton(
                tooltip: context.l10n.previousPage,
                onPressed: page > 0
                    ? () => setState(() => _page = page - 1)
                    : null,
                icon: const Icon(Icons.chevron_left),
              ),
              Text(context.l10n.salesPage(page + 1, pages)),
              IconButton(
                tooltip: context.l10n.nextPage,
                onPressed: page + 1 < pages
                    ? () => setState(() => _page = page + 1)
                    : null,
                icon: const Icon(Icons.chevron_right),
              ),
            ],
          ),
      ],
    );
  }

  String _remaining(BuildContext context, DateTime endsAt) {
    final remaining = endsAt.difference(DateTime.now());
    if (remaining.isNegative) return context.l10n.ended;
    if (remaining.inDays > 0) {
      return context.l10n.daysHours(
        remaining.inDays,
        remaining.inHours.remainder(24),
      );
    }
    return context.l10n.hoursMinutes(
      remaining.inHours,
      remaining.inMinutes.remainder(60),
    );
  }
}

class _ProductAuctionCard extends StatelessWidget {
  const _ProductAuctionCard({
    required this.title,
    required this.subtitle,
    required this.remaining,
    required this.fallbackIcon,
    required this.onTap,
    this.imageUrl,
  });

  final String title;
  final String subtitle;
  final String remaining;
  final IconData fallbackIcon;
  final VoidCallback onTap;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: ClipRRect(
              borderRadius: BorderRadius.circular(12),
              child: Stack(
                fit: StackFit.expand,
                children: [
                  _NetworkArtwork(imageUrl: imageUrl, icon: fallbackIcon),
                  Positioned(
                    top: 16,
                    right: 16,
                    child: Container(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 8,
                        vertical: 4,
                      ),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.92),
                        borderRadius: BorderRadius.circular(999),
                      ),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Container(
                            width: 7,
                            height: 7,
                            decoration: const BoxDecoration(
                              color: _SellerColors.error,
                              shape: BoxShape.circle,
                            ),
                          ),
                          const SizedBox(width: 5),
                          Text(
                            remaining,
                            style: const TextStyle(
                              color: _SellerColors.primary,
                              fontSize: 12,
                              fontWeight: FontWeight.w800,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
          const SizedBox(height: 16),
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _SellerColors.primary,
                        fontSize: 18,
                        height: 1.3,
                        fontWeight: FontWeight.w700,
                      ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      subtitle,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: const TextStyle(
                        color: _SellerColors.onSurfaceVariant,
                        fontSize: 14,
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
              IconButton(
                tooltip: context.l10n.more,
                onPressed: onTap,
                icon: const Icon(Icons.more_vert, color: _SellerColors.primary),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _SellerSidebar extends StatelessWidget {
  const _SellerSidebar({required this.products, required this.onComingSoon});

  final List<Product> products;
  final ValueChanged<String> onComingSoon;

  @override
  Widget build(BuildContext context) {
    final sold = products.where((product) => product.status == 'sold').toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Text(
          context.l10n.inventory,
          style: const TextStyle(
            color: _SellerColors.primary,
            fontSize: 24,
            height: 1.4,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 24),
        _InventoryButton(
          icon: Icons.description_outlined,
          title: context.l10n.drafts,
          subtitle: products
              .where((product) => product.status == 'draft')
              .length
              .toString(),
          onTap: () => onComingSoon(context.l10n.drafts),
        ),
        const SizedBox(height: 8),
        _InventoryButton(
          icon: Icons.inventory_2_outlined,
          title: context.l10n.unsoldItems,
          subtitle: context.l10n.expiredItemCount(_unsoldCount(products)),
          onTap: () => onComingSoon(context.l10n.unsoldItems),
        ),
        const SizedBox(height: 64),
        Text(
          context.l10n.recentlySold,
          style: const TextStyle(
            color: _SellerColors.primary,
            fontSize: 24,
            height: 1.4,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 16),
        if (sold.isEmpty)
          Text(context.l10n.noCompletedSales)
        else
          for (final product in sold.take(3))
            _SoldItemRow(
              title: product.title,
              subtitle: context.l10n.soldFor(formatRon(product.currentPrice)),
              trailingTop: context.l10n.recent,
              status: localizedStatus(product.status, context.l10n),
              statusColor: product.status == 'reserved'
                  ? _SellerColors.pending
                  : _SellerColors.success,
              imageUrl: product.imageForWidth(480),
              icon: Icons.sell_outlined,
            ),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: () => onComingSoon(context.l10n.salesReport),
          style: OutlinedButton.styleFrom(
            foregroundColor: _SellerColors.primary,
            side: BorderSide(
              color: _SellerColors.outlineVariant.withValues(alpha: 0.35),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: Text(context.l10n.downloadSalesReport),
        ),
      ],
    );
  }

  int _unsoldCount(List<Product> products) {
    return products
        .where(
          (product) =>
              product.status == 'expired' ||
              (!product.isActive && product.status == 'active'),
        )
        .length;
  }
}

class _InventoryButton extends StatelessWidget {
  const _InventoryButton({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: _SellerColors.surfaceContainer,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _SellerColors.outlineVariant.withValues(alpha: 0.26),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              decoration: BoxDecoration(
                color: _SellerColors.surface,
                borderRadius: BorderRadius.circular(8),
              ),
              child: Icon(icon, color: _SellerColors.primary),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      color: _SellerColors.primary,
                      fontSize: 14,
                      height: 1.2,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 3),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _SellerColors.onSurfaceVariant,
                      fontSize: 12,
                      height: 1.4,
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(
              Icons.chevron_right,
              color: _SellerColors.onSurfaceVariant,
            ),
          ],
        ),
      ),
    );
  }
}

class _SoldItemRow extends StatelessWidget {
  const _SoldItemRow({
    required this.title,
    required this.subtitle,
    required this.trailingTop,
    required this.status,
    required this.statusColor,
    required this.icon,
    this.imageUrl,
  });

  final String title;
  final String subtitle;
  final String trailingTop;
  final String status;
  final Color statusColor;
  final IconData icon;
  final String? imageUrl;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        border: Border(
          bottom: BorderSide(
            color: _SellerColors.outlineVariant.withValues(alpha: 0.2),
          ),
        ),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(vertical: 16),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: SizedBox(
                width: 64,
                height: 64,
                child: _NetworkArtwork(imageUrl: imageUrl, icon: icon),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _SellerColors.primary,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    subtitle,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _SellerColors.onSurfaceVariant,
                      fontSize: 12,
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  trailingTop,
                  style: const TextStyle(
                    color: _SellerColors.onSurfaceVariant,
                    fontSize: 12,
                    fontWeight: FontWeight.w500,
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  status.toUpperCase(),
                  style: TextStyle(
                    color: statusColor,
                    fontSize: 10,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 0.4,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SellerApplicationPanel extends StatelessWidget {
  const _SellerApplicationPanel({
    required this.displayName,
    required this.phone,
    required this.notes,
    required this.applications,
    required this.onSubmit,
  });

  final TextEditingController displayName;
  final TextEditingController phone;
  final TextEditingController notes;
  final List<SellerApplication> applications;
  final VoidCallback? onSubmit;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _SellerColors.surface,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _SellerColors.outlineVariant.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          Text(
            context.l10n.becomeSeller,
            style: const TextStyle(
              color: _SellerColors.primary,
              fontSize: 24,
              height: 1.35,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            context.l10n.sellerApplicationDescription,
            style: const TextStyle(
              color: _SellerColors.onSurfaceVariant,
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: displayName,
            style: const TextStyle(color: _SellerColors.primary),
            decoration: _inputDecoration(context.l10n.sellerName),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: phone,
            keyboardType: TextInputType.phone,
            style: const TextStyle(color: _SellerColors.primary),
            decoration: _inputDecoration(context.l10n.contactPhone),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: notes,
            minLines: 3,
            maxLines: 5,
            style: const TextStyle(color: _SellerColors.primary),
            decoration: _inputDecoration(context.l10n.whatDoYouSell),
          ),
          const SizedBox(height: 16),
          FilledButton.icon(
            onPressed: onSubmit,
            style: FilledButton.styleFrom(
              backgroundColor: _SellerColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            icon: const Icon(Icons.send_outlined),
            label: Text(context.l10n.submitApplication),
          ),
          if (applications.isNotEmpty) ...[
            const SizedBox(height: 20),
            for (final application in applications)
              _InlineNotice(
                icon: Icons.verified_user_outlined,
                text:
                    '${application.displayName} - ${application.contactPhone} - ${localizedStatus(application.status, context.l10n)}',
              ),
          ],
        ],
      ),
    );
  }

  InputDecoration _inputDecoration(String label) {
    return InputDecoration(
      labelText: label,
      labelStyle: const TextStyle(color: _SellerColors.onSurfaceVariant),
      filled: true,
      fillColor: _SellerColors.surfaceLow,
      enabledBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: BorderSide(
          color: _SellerColors.outlineVariant.withValues(alpha: 0.35),
        ),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(8),
        borderSide: const BorderSide(color: _SellerColors.primary),
      ),
    );
  }
}

class _InlineNotice extends StatelessWidget {
  const _InlineNotice({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _SellerColors.secondaryContainer.withValues(alpha: 0.5),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        children: [
          Icon(icon, color: _SellerColors.primary, size: 20),
          const SizedBox(width: 10),
          Expanded(
            child: Text(
              text,
              style: const TextStyle(
                color: _SellerColors.primary,
                fontSize: 13,
                height: 1.4,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _NetworkArtwork extends StatelessWidget {
  const _NetworkArtwork({required this.imageUrl, required this.icon});

  final String? imageUrl;
  final IconData icon;

  @override
  Widget build(BuildContext context) {
    final url = imageUrl;
    if (url != null && url.isNotEmpty) {
      return ProductImage(
        url: url,
        fit: BoxFit.cover,
        errorBuilder: (context, error, stackTrace) => _FallbackArtwork(icon),
      );
    }
    return _FallbackArtwork(icon);
  }
}

class _FallbackArtwork extends StatelessWidget {
  const _FallbackArtwork(this.icon);

  final IconData icon;

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: _SellerColors.surfaceHigh,
      child: Center(child: Icon(icon, color: _SellerColors.primary, size: 42)),
    );
  }
}

class _LoadingStrip extends StatelessWidget {
  const _LoadingStrip();

  @override
  Widget build(BuildContext context) {
    return const LinearProgressIndicator(
      minHeight: 2,
      color: _SellerColors.primaryContainer,
      backgroundColor: _SellerColors.surfaceContainer,
    );
  }
}
