import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../shared/models/product.dart';
import '../../shared/models/seller_application.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';

class SellerScreen extends ConsumerStatefulWidget {
  const SellerScreen({super.key});

  @override
  ConsumerState<SellerScreen> createState() => _SellerScreenState();
}

class _SellerScreenState extends ConsumerState<SellerScreen> {
  final _displayName = TextEditingController();
  final _phone = TextEditingController();
  final _notes = TextEditingController();
  List<SellerApplication> _applications = [];
  List<Product> _products = [];
  bool _loading = true;
  String? _message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _displayName.dispose();
    _phone.dispose();
    _notes.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider);
    final user = session.user;
    final isSeller = user?.isSeller == true;
    final theme = Theme.of(context).copyWith(
      textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
    );

    return Theme(
      data: theme,
      child: Scaffold(
        backgroundColor: _SellerColors.background,
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              _SellerTopBar(
                onMenu: () => context.go('/'),
                onBag: () => context.go('/account'),
              ),
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
                            sellerName: user?.name ?? 'Licit Seller',
                            isSeller: isSeller,
                            message: _message,
                            latestApplication: _latestApplication,
                            onNewListing: () => _handleNewListing(isSeller),
                          ),
                        ),
                      ),
                      if (!isSeller)
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                          sliver: SliverToBoxAdapter(
                            child: _SellerApplicationPanel(
                              displayName: _displayName,
                              phone: _phone,
                              notes: _notes,
                              applications: _applications,
                              onSubmit: _requestSeller,
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
                                      onNewListing: () =>
                                          _handleNewListing(isSeller),
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
                                      onNewListing: () =>
                                          _handleNewListing(isSeller),
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
        bottomNavigationBar: const _SellerBottomNav(),
        floatingActionButton: isSeller
            ? FloatingActionButton.extended(
                onPressed: () => context.go('/seller/new'),
                backgroundColor: _SellerColors.primary,
                foregroundColor: Colors.white,
                icon: const Icon(Icons.add),
                label: const Text('New Listing'),
              )
            : null,
      ),
    );
  }

  List<Product> get _activeProducts {
    return _products.where((product) => product.isActive).toList();
  }

  List<Product> get _soldProducts {
    return _products
        .where(
          (product) =>
              product.status == 'reserved' ||
              product.status == 'sold' ||
              product.status == 'closed',
        )
        .toList();
  }

  int get _revenueBani {
    return _soldProducts.fold<int>(
      0,
      (total, product) => total + product.currentPrice,
    );
  }

  SellerApplication? get _latestApplication {
    if (_applications.isEmpty) return null;
    return _applications.first;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final apps = await api.mySellerApplications();
      final user = ref.read(sessionControllerProvider).user;
      final products = user?.isSeller == true
          ? await api.myProducts()
          : <Product>[];
      if (!mounted) return;
      setState(() {
        _applications = apps;
        _products = products;
      });
    } catch (error) {
      if (!mounted) return;
      setState(() => _message = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _requestSeller() async {
    try {
      await ref
          .read(apiClientProvider)
          .requestSeller(
            displayName: _displayName.text.trim(),
            contactPhone: _phone.text.trim(),
            notes: _notes.text.trim(),
          );
      await _load();
    } on DioException catch (error) {
      setState(() => _message = _messageFrom(error));
    }
  }

  void _openProduct(Product product) {
    context.push('/products/${product.id}');
  }

  void _handleNewListing(bool isSeller) {
    if (isSeller) {
      context.go('/seller/new');
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(
        content: Text(
          'Ai nevoie de aprobare seller inainte sa creezi o listare.',
        ),
      ),
    );
  }

  void _showComingSoon(String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label va fi adaugat in urmatorul pas.')),
    );
  }

  String _messageFrom(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return error.message ?? 'Cererea a esuat.';
  }
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

class _SellerTopBar extends StatelessWidget {
  const _SellerTopBar({required this.onMenu, required this.onBag});

  final VoidCallback onMenu;
  final VoidCallback onBag;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: _SellerColors.background.withValues(alpha: 0.88),
        border: Border(
          bottom: BorderSide(
            color: _SellerColors.outlineVariant.withValues(alpha: 0.3),
          ),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Feed',
            onPressed: onMenu,
            icon: const Icon(Icons.menu, color: _SellerColors.primary),
          ),
          const SizedBox(width: 8),
          const Text(
            'Licit',
            style: TextStyle(
              color: _SellerColors.primary,
              fontSize: 36,
              height: 1.2,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Spacer(),
          TextButton(
            onPressed: () => context.go('/explore'),
            child: const Text('Marketplace'),
          ),
          const SizedBox(width: 8),
          IconButton(
            tooltip: 'Profile',
            onPressed: onBag,
            icon: const Icon(
              Icons.shopping_bag_outlined,
              color: _SellerColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _SellerHeader extends StatelessWidget {
  const _SellerHeader({
    required this.sellerName,
    required this.isSeller,
    required this.message,
    required this.latestApplication,
    required this.onNewListing,
  });

  final String sellerName;
  final bool isSeller;
  final String? message;
  final SellerApplication? latestApplication;
  final VoidCallback? onNewListing;

  @override
  Widget build(BuildContext context) {
    final status = latestApplication?.status;

    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 430;
        final titleBlock = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'OVERVIEW',
              style: TextStyle(
                color: _SellerColors.onSurfaceVariant,
                fontSize: 12,
                fontWeight: FontWeight.w800,
                letterSpacing: 1.8,
              ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Performance',
              style: TextStyle(
                color: _SellerColors.primary,
                fontSize: 30,
                height: 1.3,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              isSeller
                  ? 'Seller dashboard pentru $sellerName'
                  : status == null
                  ? 'Cere acces seller ca sa poti lista produse.'
                  : 'Cererea ta seller este ${_statusLabel(status)}.',
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
          label: const Text('New Listing'),
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

  String _statusLabel(String status) {
    switch (status) {
      case 'approved':
        return 'aprobata';
      case 'rejected':
        return 'respinsa';
      default:
        return 'in asteptare';
    }
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
              trend: '+12% vs last month',
              value: activeCount.toString(),
              label: 'Active Auctions',
            ),
            _MetricCard(
              icon: Icons.check_circle_outline,
              trend: '+8% vs last month',
              value: soldCount.toString(),
              label: 'Items Sold',
            ),
            _MetricCard(
              icon: Icons.payments_outlined,
              trend: '+24.5%',
              value: revenueBani == 0 ? 'RON 0' : formatRon(revenueBani),
              label: 'Total Revenue',
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
    required this.trend,
    required this.value,
    required this.label,
    this.inverted = false,
  });

  final IconData icon;
  final String trend;
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
                  const Spacer(),
                  Flexible(
                    child: Text(
                      trend,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      textAlign: TextAlign.right,
                      style: TextStyle(
                        color: foreground.withValues(alpha: 0.72),
                        fontSize: 12,
                        fontWeight: FontWeight.w600,
                      ),
                    ),
                  ),
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

class _ActiveAuctionsSection extends StatelessWidget {
  const _ActiveAuctionsSection({
    required this.products,
    required this.onOpenProduct,
    required this.onNewListing,
  });

  final List<Product> products;
  final ValueChanged<Product> onOpenProduct;
  final VoidCallback? onNewListing;

  @override
  Widget build(BuildContext context) {
    final displayProducts = products.isEmpty ? _demoProducts : products;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Active Auctions',
                style: TextStyle(
                  color: _SellerColors.primary,
                  fontSize: 24,
                  height: 1.4,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton(
              onPressed: onNewListing,
              child: Text(products.isEmpty ? 'Create First' : 'View All'),
            ),
          ],
        ),
        const SizedBox(height: 24),
        LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 640 ? 2 : 1;
            return GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: displayProducts.length.clamp(0, 4),
              gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: columns,
                crossAxisSpacing: 24,
                mainAxisSpacing: 24,
                childAspectRatio: 0.64,
              ),
              itemBuilder: (context, index) {
                final item = displayProducts[index];
                if (item is Product) {
                  return _ProductAuctionCard(
                    title: item.title,
                    subtitle:
                        '${item.status} - Highest ${formatRon(item.currentPrice)}',
                    imageUrl: item.thumbnailUrl,
                    remaining: _remaining(item.endsAt),
                    fallbackIcon: Icons.sell_outlined,
                    onTap: () => onOpenProduct(item),
                  );
                }

                final demo = item as _DemoAuction;
                return _ProductAuctionCard(
                  title: demo.title,
                  subtitle: demo.subtitle,
                  imageUrl: demo.imageUrl,
                  remaining: demo.remaining,
                  fallbackIcon: demo.icon,
                  onTap: () => ScaffoldMessenger.of(context).showSnackBar(
                    const SnackBar(
                      content: Text('Adauga primul produs pentru date reale.'),
                    ),
                  ),
                );
              },
            );
          },
        ),
      ],
    );
  }

  String _remaining(DateTime endsAt) {
    final remaining = endsAt.difference(DateTime.now());
    if (remaining.isNegative) return 'Ended';
    if (remaining.inDays > 0) {
      return '${remaining.inDays}d ${remaining.inHours.remainder(24)}h';
    }
    return '${remaining.inHours}h ${remaining.inMinutes.remainder(60)}m';
  }

  static const _demoProducts = [
    _DemoAuction(
      title: 'Patek Philippe Calatrava',
      subtitle: '24 Bids - Highest RON 32,400',
      remaining: '2d 04h',
      icon: Icons.watch_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCO2Q79m5xoBdnzFQ4WmB-s5VP_xWjgVQ_jSE0-JYTEcxHfv_8Ujvz0gYk3xDVLv1eg5-roLVQMYIziLmOcLBOLZEBqqLBZrVj5Z9w3ALoFdlCcA-Kz3lM-vshGB58q0MZQxEyv-zWK63WrrEP3N5mLgcuZQ1BqEe0-PuNHEEZ1s11cXoHLX1OaT9p-Dwmo9riT6yTuS_8RFEvHsiUu-ZOsXJX2NGYY6SR1TSZa_hpLJZ2GPAfWGsglDxX9mpTZ-CMjhZyp2bLr5A',
    ),
    _DemoAuction(
      title: 'Vintage Leica M3 Limited',
      subtitle: '12 Bids - Highest RON 8,200',
      remaining: '08h 15m',
      icon: Icons.camera_alt_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuC1p3RHU55eJng1cvWiJl5edU4C6Ttjqyy-X0xrT8BUT5bxpAEeuEjfTFC1YsXLeZkvxce3SlENrRKxcT8K5fWbwXGHslaYIe7_xODwu1UDgljIpnFXwEqyWVvWcbNdg_WhpiKRWkEX_xhReZbKmHfF2cyUiydWvltMg8j2LkgIQKAQpDgmZuLBy9-p5KFFQV9QDKy-ryVq4ftFHbqBZJ3SfqkxIJxAioueBB_BpBQT6K4Sp-6-7_oj2F0RBxFxj1y0Rld-KSpgOw',
    ),
  ];
}

class _DemoAuction {
  const _DemoAuction({
    required this.title,
    required this.subtitle,
    required this.remaining,
    required this.icon,
    required this.imageUrl,
  });

  final String title;
  final String subtitle;
  final String remaining;
  final IconData icon;
  final String imageUrl;
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
                tooltip: 'More',
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
    final sold = products
        .where(
          (product) =>
              product.status == 'reserved' ||
              product.status == 'sold' ||
              product.status == 'closed',
        )
        .toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        const Text(
          'Inventory',
          style: TextStyle(
            color: _SellerColors.primary,
            fontSize: 24,
            height: 1.4,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 24),
        _InventoryButton(
          icon: Icons.description_outlined,
          title: 'Drafts',
          subtitle: '4 items ready for review',
          onTap: () => onComingSoon('Drafts'),
        ),
        const SizedBox(height: 8),
        _InventoryButton(
          icon: Icons.inventory_2_outlined,
          title: 'Unsold Items',
          subtitle: '${_unsoldCount(products)} items expired',
          onTap: () => onComingSoon('Unsold Items'),
        ),
        const SizedBox(height: 64),
        const Text(
          'Recently Sold',
          style: TextStyle(
            color: _SellerColors.primary,
            fontSize: 24,
            height: 1.4,
            fontWeight: FontWeight.w700,
          ),
        ),
        const SizedBox(height: 16),
        if (sold.isEmpty)
          for (final item in _recentSoldFallback)
            _SoldItemRow(
              title: item.title,
              subtitle: item.subtitle,
              trailingTop: item.time,
              status: item.status,
              statusColor: item.statusColor,
              imageUrl: item.imageUrl,
              icon: item.icon,
            )
        else
          for (final product in sold.take(3))
            _SoldItemRow(
              title: product.title,
              subtitle: 'Sold for ${formatRon(product.currentPrice)}',
              trailingTop: 'Recent',
              status: product.status,
              statusColor: product.status == 'reserved'
                  ? _SellerColors.pending
                  : _SellerColors.success,
              imageUrl: product.thumbnailUrl,
              icon: Icons.sell_outlined,
            ),
        const SizedBox(height: 16),
        OutlinedButton(
          onPressed: () => onComingSoon('Sales report'),
          style: OutlinedButton.styleFrom(
            foregroundColor: _SellerColors.primary,
            side: BorderSide(
              color: _SellerColors.outlineVariant.withValues(alpha: 0.35),
            ),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(8),
            ),
          ),
          child: const Text('Download Sales Report'),
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

  static const _recentSoldFallback = [
    _SoldFallback(
      title: 'Luxe Tortoise Shades',
      subtitle: 'Sold for RON 450',
      time: '2h ago',
      status: 'Paid',
      statusColor: _SellerColors.success,
      icon: Icons.visibility_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBEhXQkA9cf72KiTk2VIS34y1fSmLvuz52V1Ku-V1nllgnXFPEons77U-Hk3ZX8cWOCY7YK9AJD0k4hvSADoL8K6KplWrEDWKjNvh8NfGWJkkwHok_ezETgdW2WvGbZ6aY8Y65W5500d7naGqU2SxB1_ftzh0-CIQsnmHunfqEntnFUEY6fqrVoDp9-GA0gri8b7Iduqgvw2HdjTe50vjjHbHgnyzlIoQE_MefJcdrXZ4HvE8YVoXNYGGNnj-80jVCN8iT8MVVgLg',
    ),
    _SoldFallback(
      title: 'Essential Silk Tee',
      subtitle: 'Sold for RON 180',
      time: '5h ago',
      status: 'Pending',
      statusColor: _SellerColors.pending,
      icon: Icons.checkroom_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuA0Th1y2R8I4QZ7DfPFhnqm05HW3Zz1bOSTNBGAPCjErpGHJkuJ745R2v8hdiAGO9L7GltWJZlxC3H4XXSq3TH_l_sD8Rgs78xp3N-_QDrlNkPnDtYOrWYS8CvbmNIEpu1aQ1HDPYa2idgFl0x8VrrqsirrZPYU_AD8OCVvaxzSlKsVz5gQrE5KEE3teHp-TtrYZSSSrOxBeFcimVDWabUsrICtZwDRAzL2jUDYoWwUBjJDR29nLfvdHddsZQvopyww7Ajwxsd4-w',
    ),
    _SoldFallback(
      title: 'Pro Audio Monitor H1',
      subtitle: 'Sold for RON 1,200',
      time: 'Yesterday',
      status: 'Paid',
      statusColor: _SellerColors.success,
      icon: Icons.headphones_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuB-MwXvRyXFLDZRSbH379c9b45-QV1_Tf2zwNUVdF2Z-494qmlwJOJKaRXcTSI3DmZ2uvr0Oyp_1zWCc2nJCttgKu6Ntu1QLVwzGdDt8lUM6EowbV5hjlfiQA1_JvLNHorXqsd4iNDIEf8O-WpYH_zEijqfYEup5SLi5lsSLWenZYGnxUPtbQYJf_tvXa5_PBAgKP10JncEjVihqtLIFrZpucDnXM65euKJN35NeQqtbmn4VrbDiwr-7ZGZIrz7iM6V09fGXdIeOg',
    ),
  ];
}

class _SoldFallback {
  const _SoldFallback({
    required this.title,
    required this.subtitle,
    required this.time,
    required this.status,
    required this.statusColor,
    required this.icon,
    required this.imageUrl,
  });

  final String title;
  final String subtitle;
  final String time;
  final String status;
  final Color statusColor;
  final IconData icon;
  final String imageUrl;
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
  final VoidCallback onSubmit;

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
          const Text(
            'Become a Seller',
            style: TextStyle(
              color: _SellerColors.primary,
              fontSize: 24,
              height: 1.35,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          const Text(
            'Trimite cererea pentru aprobare. Dupa acceptare poti crea listari video si licitatii.',
            style: TextStyle(
              color: _SellerColors.onSurfaceVariant,
              fontSize: 14,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 20),
          TextField(
            controller: displayName,
            style: const TextStyle(color: _SellerColors.primary),
            decoration: _inputDecoration('Nume seller'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: phone,
            keyboardType: TextInputType.phone,
            style: const TextStyle(color: _SellerColors.primary),
            decoration: _inputDecoration('Telefon contact'),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: notes,
            minLines: 3,
            maxLines: 5,
            style: const TextStyle(color: _SellerColors.primary),
            decoration: _inputDecoration('Ce vinzi?'),
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
            label: const Text('Trimite cererea'),
          ),
          if (applications.isNotEmpty) ...[
            const SizedBox(height: 20),
            for (final application in applications)
              _InlineNotice(
                icon: Icons.verified_user_outlined,
                text:
                    '${application.displayName} - ${application.contactPhone} - ${application.status}',
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
      return Image.network(
        url,
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

class _SellerBottomNav extends StatelessWidget {
  const _SellerBottomNav();

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 80 + MediaQuery.paddingOf(context).bottom,
      padding: EdgeInsets.fromLTRB(
        8,
        8,
        8,
        8 + MediaQuery.paddingOf(context).bottom,
      ),
      decoration: BoxDecoration(
        color: _SellerColors.background,
        border: Border(
          top: BorderSide(
            color: _SellerColors.outlineVariant.withValues(alpha: 0.2),
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _BottomItem(
            icon: Icons.play_circle_outline,
            label: 'Feed',
            onTap: () => context.go('/'),
          ),
          _BottomItem(
            icon: Icons.search,
            label: 'Explore',
            onTap: () => context.go('/explore'),
          ),
          _BottomItem(
            icon: Icons.add_circle,
            label: 'Sell',
            active: true,
            onTap: () => context.go('/seller'),
          ),
          _BottomItem(
            icon: Icons.notifications_outlined,
            label: 'Activity',
            onTap: () => context.go('/activity'),
          ),
          _BottomItem(
            icon: Icons.person_outline,
            label: 'Profile',
            onTap: () => context.go('/account'),
          ),
        ],
      ),
    );
  }
}

class _BottomItem extends StatelessWidget {
  const _BottomItem({
    required this.icon,
    required this.label,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final color = active
        ? _SellerColors.primary
        : _SellerColors.onSurfaceVariant;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: active
              ? _SellerColors.secondaryContainer.withValues(alpha: 0.5)
              : Colors.transparent,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, color: color.withValues(alpha: active ? 1 : 0.62)),
            Text(
              label,
              style: TextStyle(
                color: color.withValues(alpha: active ? 1 : 0.62),
                fontSize: 12,
                fontWeight: FontWeight.w700,
                letterSpacing: 0.6,
              ),
            ),
          ],
        ),
      ),
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
