import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../shared/models/bid.dart';
import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';

class AccountScreen extends ConsumerStatefulWidget {
  const AccountScreen({super.key});

  @override
  ConsumerState<AccountScreen> createState() => _AccountScreenState();
}

class _AccountScreenState extends ConsumerState<AccountScreen> {
  List<Bid> _bids = [];
  bool _loading = true;
  String? _message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final session = ref.watch(sessionControllerProvider);
    final user = session.user;
    final theme = Theme.of(context).copyWith(
      textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
    );

    return Theme(
      data: theme,
      child: Scaffold(
        backgroundColor: _AccountColors.background,
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              _TopBar(
                onMenu: () => context.go('/seller'),
                onBag: () => context.go('/account'),
              ),
              Expanded(
                child: RefreshIndicator(
                  color: _AccountColors.primaryContainer,
                  onRefresh: _load,
                  child: ListView(
                    padding: const EdgeInsets.fromLTRB(16, 24, 16, 112),
                    children: [
                      LayoutBuilder(
                        builder: (context, constraints) {
                          final wide = constraints.maxWidth >= 780;
                          if (!wide) {
                            return Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                _ProfileColumn(
                                  name: user?.name ?? 'Licit User',
                                  email: user?.email ?? '',
                                  role: user?.role ?? 'user',
                                  activeBidCount: _bids.length,
                                  wonItemCount: _wonItemsCount,
                                  onLogout: () => _logout(session),
                                  onSellerTap: () => context.go('/seller'),
                                ),
                                const SizedBox(height: 32),
                                _BidsColumn(
                                  loading: _loading,
                                  message: _message,
                                  bids: _bids,
                                  onOpenProduct: _openProduct,
                                ),
                              ],
                            );
                          }

                          return Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              SizedBox(
                                width: constraints.maxWidth * 0.33,
                                child: _ProfileColumn(
                                  name: user?.name ?? 'Licit User',
                                  email: user?.email ?? '',
                                  role: user?.role ?? 'user',
                                  activeBidCount: _bids.length,
                                  wonItemCount: _wonItemsCount,
                                  onLogout: () => _logout(session),
                                  onSellerTap: () => context.go('/seller'),
                                ),
                              ),
                              const SizedBox(width: 64),
                              Expanded(
                                child: _BidsColumn(
                                  loading: _loading,
                                  message: _message,
                                  bids: _bids,
                                  onOpenProduct: _openProduct,
                                ),
                              ),
                            ],
                          );
                        },
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: const _AccountBottomNav(),
      ),
    );
  }

  int get _wonItemsCount {
    return _bids
        .where(
          (bid) =>
              bid.product?.reservedBy?.id ==
              ref.read(sessionControllerProvider).user?.id,
        )
        .length;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      final bids = await ref.read(apiClientProvider).myBids();
      if (!mounted) return;
      setState(() => _bids = bids);
    } catch (error) {
      if (!mounted) return;
      setState(() => _message = error.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  void _openProduct(Product? product) {
    if (product == null) return;
    context.push('/products/${product.id}');
  }

  Future<void> _logout(SessionController session) async {
    await session.logout();
    if (!mounted) return;
    context.go('/login');
  }
}

class _AccountColors {
  static const background = Color(0xfff9f9fa);
  static const surface = Color(0xffffffff);
  static const surfaceLow = Color(0xfff3f3f4);
  static const surfaceContainer = Color(0xffeeeeef);
  static const secondaryContainer = Color(0xffe4e3d8);
  static const outlineVariant = Color(0xffc5c7c0);
  static const primary = Color(0xff363a34);
  static const primaryContainer = Color(0xff4d514a);
  static const onSurfaceVariant = Color(0xff454842);
  static const error = Color(0xffba1a1a);
}

class _TopBar extends StatelessWidget {
  const _TopBar({required this.onMenu, required this.onBag});

  final VoidCallback onMenu;
  final VoidCallback onBag;

  @override
  Widget build(BuildContext context) {
    return Container(
      height: 64,
      padding: const EdgeInsets.symmetric(horizontal: 16),
      decoration: BoxDecoration(
        color: _AccountColors.background.withValues(alpha: 0.86),
        border: Border(
          bottom: BorderSide(
            color: _AccountColors.outlineVariant.withValues(alpha: 0.3),
          ),
        ),
      ),
      child: Row(
        children: [
          IconButton(
            tooltip: 'Seller',
            onPressed: onMenu,
            icon: const Icon(Icons.menu, color: _AccountColors.primary),
          ),
          const SizedBox(width: 8),
          const Text(
            'Licit',
            style: TextStyle(
              color: _AccountColors.primary,
              fontSize: 36,
              height: 1.2,
              fontWeight: FontWeight.w800,
            ),
          ),
          const Spacer(),
          IconButton(
            tooltip: 'My activity',
            onPressed: onBag,
            icon: const Icon(
              Icons.shopping_bag_outlined,
              color: _AccountColors.primary,
            ),
          ),
        ],
      ),
    );
  }
}

class _ProfileColumn extends StatelessWidget {
  const _ProfileColumn({
    required this.name,
    required this.email,
    required this.role,
    required this.activeBidCount,
    required this.wonItemCount,
    required this.onLogout,
    required this.onSellerTap,
  });

  final String name;
  final String email;
  final String role;
  final int activeBidCount;
  final int wonItemCount;
  final VoidCallback onLogout;
  final VoidCallback onSellerTap;

  bool get _isSeller => role == 'seller' || role == 'admin';

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Column(
          children: [
            Stack(
              clipBehavior: Clip.none,
              children: [
                Container(
                  width: 132,
                  height: 132,
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    border: Border.all(color: _AccountColors.outlineVariant),
                  ),
                  child: DecoratedBox(
                    decoration: const BoxDecoration(
                      shape: BoxShape.circle,
                      color: _AccountColors.surface,
                    ),
                    child: Center(
                      child: Text(
                        _initials(name),
                        style: const TextStyle(
                          color: _AccountColors.primary,
                          fontSize: 36,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  right: 4,
                  bottom: 4,
                  child: IconButton.filled(
                    tooltip: 'Edit profile',
                    onPressed: () => _showComingSoon(context, 'Edit profile'),
                    icon: const Icon(Icons.edit, size: 18),
                    style: IconButton.styleFrom(
                      backgroundColor: _AccountColors.primary,
                      foregroundColor: Colors.white,
                      fixedSize: const Size.square(38),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Text(
              name,
              textAlign: TextAlign.center,
              style: const TextStyle(
                color: _AccountColors.primary,
                fontSize: 30,
                height: 1.3,
                fontWeight: FontWeight.w700,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              email.isEmpty
                  ? 'Curator & Collector'
                  : '$email · ${_roleLabel(role)}',
              textAlign: TextAlign.center,
              style: TextStyle(
                color: _AccountColors.onSurfaceVariant.withValues(alpha: 0.7),
                fontSize: 16,
                height: 1.5,
              ),
            ),
          ],
        ),
        const SizedBox(height: 32),
        GridView(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
            crossAxisCount: 2,
            crossAxisSpacing: 16,
            mainAxisSpacing: 16,
            childAspectRatio: 1.1,
          ),
          children: [
            _StatTile(
              label: 'Active Bids',
              value: activeBidCount.toString().padLeft(2, '0'),
            ),
            _StatTile(
              label: 'Won Items',
              value: wonItemCount.toString().padLeft(2, '0'),
            ),
          ],
        ),
        const SizedBox(height: 16),
        _SellerStatusCard(seller: _isSeller, role: role, onTap: onSellerTap),
        const SizedBox(height: 28),
        _QuickLink(
          icon: Icons.payments_outlined,
          label: 'Payment Methods',
          onTap: () => _showComingSoon(context, 'Payment Methods'),
        ),
        _QuickLink(
          icon: Icons.settings_outlined,
          label: 'Account Settings',
          onTap: () => _showComingSoon(context, 'Account Settings'),
        ),
        _QuickLink(
          icon: Icons.help_outline,
          label: 'Support Center',
          onTap: () => _showComingSoon(context, 'Support Center'),
        ),
        _QuickLink(
          icon: Icons.logout,
          label: 'Logout',
          destructive: true,
          onTap: onLogout,
        ),
      ],
    );
  }

  static String _initials(String name) {
    final parts = name
        .trim()
        .split(RegExp(r'\s+'))
        .where((part) => part.isNotEmpty)
        .toList();
    if (parts.isEmpty) return 'LU';
    if (parts.length == 1) {
      return parts.first.characters.take(2).toString().toUpperCase();
    }
    return '${parts.first.characters.first}${parts.last.characters.first}'
        .toUpperCase();
  }

  static String _roleLabel(String role) {
    switch (role) {
      case 'admin':
        return 'Admin';
      case 'seller':
        return 'Verified Seller';
      default:
        return 'Collector';
    }
  }

  void _showComingSoon(BuildContext context, String label) {
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text('$label va fi adaugat in urmatorul pas.')),
    );
  }
}

class _StatTile extends StatelessWidget {
  const _StatTile({required this.label, required this.value});

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: _AccountColors.surfaceLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _AccountColors.outlineVariant.withValues(alpha: 0.1),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            label.toUpperCase(),
            style: const TextStyle(
              color: _AccountColors.onSurfaceVariant,
              fontSize: 12,
              fontWeight: FontWeight.w800,
              letterSpacing: 1.2,
            ),
          ),
          const Spacer(),
          Text(
            value,
            style: const TextStyle(
              color: _AccountColors.primary,
              fontSize: 42,
              height: 1.05,
              fontWeight: FontWeight.w800,
            ),
          ),
        ],
      ),
    );
  }
}

class _SellerStatusCard extends StatelessWidget {
  const _SellerStatusCard({
    required this.seller,
    required this.role,
    required this.onTap,
  });

  final bool seller;
  final String role;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(20),
        decoration: BoxDecoration(
          color: _AccountColors.primaryContainer,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    seller ? 'Seller Status' : 'Become a Seller',
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 24,
                      height: 1.3,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    seller
                        ? '${_sellerLabel(role)} Member'
                        : 'Request seller approval',
                    style: TextStyle(
                      color: Colors.white.withValues(alpha: 0.78),
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ],
              ),
            ),
            Icon(
              seller ? Icons.verified_user_outlined : Icons.storefront_outlined,
              color: Colors.white,
              size: 32,
            ),
          ],
        ),
      ),
    );
  }

  String _sellerLabel(String role) {
    if (role == 'admin') return 'Admin Premium';
    return 'Verified Premium';
  }
}

class _QuickLink extends StatelessWidget {
  const _QuickLink({
    required this.icon,
    required this.label,
    required this.onTap,
    this.destructive = false,
  });

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool destructive;

  @override
  Widget build(BuildContext context) {
    final color = destructive ? _AccountColors.error : _AccountColors.primary;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(8),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 14),
        child: Row(
          children: [
            Icon(
              icon,
              color: destructive
                  ? _AccountColors.error
                  : _AccountColors.onSurfaceVariant,
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Text(
                label,
                style: TextStyle(
                  color: color,
                  fontSize: 16,
                  height: 1.4,
                  fontWeight: FontWeight.w500,
                ),
              ),
            ),
            Icon(
              Icons.chevron_right,
              color: _AccountColors.onSurfaceVariant.withValues(alpha: 0.45),
            ),
          ],
        ),
      ),
    );
  }
}

class _BidsColumn extends StatelessWidget {
  const _BidsColumn({
    required this.loading,
    required this.message,
    required this.bids,
    required this.onOpenProduct,
  });

  final bool loading;
  final String? message;
  final List<Bid> bids;
  final ValueChanged<Product?> onOpenProduct;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Active Bids',
                style: TextStyle(
                  color: _AccountColors.primary,
                  fontSize: 24,
                  height: 1.4,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton(
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Bid history va fi adaugat in urmatorul pas.'),
                ),
              ),
              child: const Text('View History'),
            ),
          ],
        ),
        Divider(
          height: 24,
          color: _AccountColors.outlineVariant.withValues(alpha: 0.2),
        ),
        if (loading)
          const Padding(
            padding: EdgeInsets.all(32),
            child: Center(
              child: CircularProgressIndicator(
                color: _AccountColors.primaryContainer,
              ),
            ),
          )
        else if (message != null)
          _AccountEmptyState(
            icon: Icons.error_outline,
            title: 'Could not load bids',
            subtitle: message!,
          )
        else if (bids.isEmpty)
          const _AccountEmptyState(
            icon: Icons.gavel_outlined,
            title: 'No bids yet',
            subtitle: 'When you place bids, active auctions will appear here.',
          )
        else
          for (final bid in bids)
            Padding(
              padding: const EdgeInsets.only(bottom: 24),
              child: _BidCard(
                bid: bid,
                onTap: () => onOpenProduct(bid.product),
              ),
            ),
        const SizedBox(height: 24),
        const _SuggestionBanner(),
      ],
    );
  }
}

class _BidCard extends StatelessWidget {
  const _BidCard({required this.bid, required this.onTap});

  final Bid bid;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final product = bid.product;

    return InkWell(
      onTap: product == null ? null : onTap,
      borderRadius: BorderRadius.circular(8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          _BidArtwork(product: product),
          const SizedBox(width: 24),
          Expanded(
            child: ConstrainedBox(
              constraints: const BoxConstraints(minHeight: 148),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              product?.title ?? 'Auction Bid',
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: _AccountColors.primary,
                                fontSize: 24,
                                height: 1.25,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                          ),
                          const SizedBox(width: 8),
                          _BidStatus(product: product, bid: bid),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(
                        product?.category?.name ??
                            bid.createdAt.toLocal().toString(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          color: _AccountColors.onSurfaceVariant,
                          fontSize: 16,
                          height: 1.5,
                        ),
                      ),
                    ],
                  ),
                  Padding(
                    padding: const EdgeInsets.only(top: 16),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        border: Border(
                          top: BorderSide(
                            color: _AccountColors.outlineVariant.withValues(
                              alpha: 0.1,
                            ),
                          ),
                        ),
                      ),
                      child: Padding(
                        padding: const EdgeInsets.only(top: 14),
                        child: Row(
                          children: [
                            Expanded(
                              child: _BidMetric(
                                label: 'Current Bid',
                                value: formatRon(
                                  product?.currentPrice ?? bid.amount,
                                ),
                              ),
                            ),
                            _BidMetric(
                              label: 'Ends In',
                              value: _remaining(product?.endsAt),
                              alignEnd: true,
                              valueColor: product?.isActive == true
                                  ? _AccountColors.primary
                                  : _AccountColors.error,
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  String _remaining(DateTime? endsAt) {
    if (endsAt == null) return '--';
    final remaining = endsAt.difference(DateTime.now());
    if (remaining.isNegative) return 'Ended';
    if (remaining.inDays > 0) {
      return '${remaining.inDays}d ${remaining.inHours.remainder(24)}h';
    }
    return '${remaining.inHours}h ${remaining.inMinutes.remainder(60)}m';
  }
}

class _BidArtwork extends StatelessWidget {
  const _BidArtwork({required this.product});

  final Product? product;

  @override
  Widget build(BuildContext context) {
    final thumbnail = product?.thumbnailUrl;
    final title = product?.title ?? 'Auction';

    return ClipRRect(
      borderRadius: BorderRadius.circular(8),
      child: SizedBox(
        width: 132,
        height: 148,
        child: DecoratedBox(
          decoration: const BoxDecoration(
            color: _AccountColors.surfaceContainer,
          ),
          child: thumbnail == null || thumbnail.isEmpty
              ? Center(
                  child: Text(
                    _ProfileColumn._initials(title),
                    style: const TextStyle(
                      color: _AccountColors.primary,
                      fontSize: 28,
                      fontWeight: FontWeight.w800,
                    ),
                  ),
                )
              : Image.network(
                  thumbnail,
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => const Center(
                    child: Icon(Icons.image_not_supported_outlined),
                  ),
                ),
        ),
      ),
    );
  }
}

class _BidStatus extends StatelessWidget {
  const _BidStatus({required this.product, required this.bid});

  final Product? product;
  final Bid bid;

  @override
  Widget build(BuildContext context) {
    final topBidder = product == null || bid.amount >= product!.currentPrice;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: topBidder
            ? _AccountColors.secondaryContainer
            : Colors.transparent,
        borderRadius: BorderRadius.circular(999),
        border: topBidder
            ? null
            : Border.all(color: _AccountColors.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        child: Text(
          topBidder ? 'Top Bidder' : 'Outbid',
          style: const TextStyle(
            color: _AccountColors.onSurfaceVariant,
            fontSize: 12,
            fontWeight: FontWeight.w800,
          ),
        ),
      ),
    );
  }
}

class _BidMetric extends StatelessWidget {
  const _BidMetric({
    required this.label,
    required this.value,
    this.alignEnd = false,
    this.valueColor = _AccountColors.primary,
  });

  final String label;
  final String value;
  final bool alignEnd;
  final Color valueColor;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: alignEnd
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      children: [
        Text(
          label.toUpperCase(),
          style: TextStyle(
            color: _AccountColors.onSurfaceVariant.withValues(alpha: 0.62),
            fontSize: 12,
            fontWeight: FontWeight.w700,
            letterSpacing: 1,
          ),
        ),
        const SizedBox(height: 4),
        Text(
          value,
          style: TextStyle(
            color: valueColor,
            fontSize: 24,
            height: 1.2,
            fontWeight: FontWeight.w700,
          ),
        ),
      ],
    );
  }
}

class _AccountEmptyState extends StatelessWidget {
  const _AccountEmptyState({
    required this.icon,
    required this.title,
    required this.subtitle,
  });

  final IconData icon;
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _AccountColors.surfaceLow,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        children: [
          Icon(icon, color: _AccountColors.primary, size: 32),
          const SizedBox(height: 12),
          Text(
            title,
            textAlign: TextAlign.center,
            style: const TextStyle(
              color: _AccountColors.primary,
              fontSize: 20,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 6),
          Text(
            subtitle,
            textAlign: TextAlign.center,
            style: const TextStyle(color: _AccountColors.onSurfaceVariant),
          ),
        ],
      ),
    );
  }
}

class _SuggestionBanner extends StatelessWidget {
  const _SuggestionBanner();

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _AccountColors.surface,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(
          color: _AccountColors.outlineVariant.withValues(alpha: 0.3),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text(
            'Discover more items for your collection',
            style: TextStyle(
              color: _AccountColors.primary,
              fontSize: 24,
              height: 1.3,
              fontWeight: FontWeight.w700,
            ),
          ),
          const SizedBox(height: 8),
          const Text(
            'Our curators have selected pieces based on your recent auction activity.',
            style: TextStyle(
              color: _AccountColors.onSurfaceVariant,
              fontSize: 16,
              height: 1.5,
            ),
          ),
          const SizedBox(height: 16),
          FilledButton(
            onPressed: () => context.go('/'),
            style: FilledButton.styleFrom(
              backgroundColor: _AccountColors.primary,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(8),
              ),
            ),
            child: const Text('Explore Curation'),
          ),
        ],
      ),
    );
  }
}

class _AccountBottomNav extends StatelessWidget {
  const _AccountBottomNav();

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
        color: _AccountColors.background,
        border: Border(
          top: BorderSide(
            color: _AccountColors.outlineVariant.withValues(alpha: 0.2),
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
            icon: Icons.add_circle_outline,
            label: 'Sell',
            onTap: () => context.go('/seller'),
          ),
          _BottomItem(
            icon: Icons.notifications_outlined,
            label: 'Activity',
            onTap: () => context.go('/activity'),
          ),
          _BottomItem(
            icon: Icons.person,
            label: 'Profile',
            active: true,
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
        ? _AccountColors.primary
        : _AccountColors.onSurfaceVariant;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: active
              ? _AccountColors.secondaryContainer.withValues(alpha: 0.5)
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
