import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../shared/models/bid.dart';
import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';

enum _ActivityFilter { all, bids, watching, wins }

class ActivityScreen extends ConsumerStatefulWidget {
  const ActivityScreen({super.key});

  @override
  ConsumerState<ActivityScreen> createState() => _ActivityScreenState();
}

class _ActivityScreenState extends ConsumerState<ActivityScreen> {
  List<Bid> _bids = [];
  List<Product> _favorites = [];
  _ActivityFilter _filter = _ActivityFilter.all;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
      ),
      child: Scaffold(
        backgroundColor: const Color(0xfff9f9fa),
        appBar: AppBar(
          backgroundColor: const Color(0xfff9f9fa).withValues(alpha: 0.94),
          foregroundColor: const Color(0xff363a34),
          surfaceTintColor: Colors.transparent,
          centerTitle: true,
          leading: IconButton(
            tooltip: 'Seller',
            onPressed: () => context.go('/seller'),
            icon: const Icon(Icons.menu),
          ),
          title: const Text(
            'Licit',
            style: TextStyle(fontSize: 28, fontWeight: FontWeight.w800),
          ),
          actions: [
            IconButton(
              tooltip: 'Account',
              onPressed: () => context.go('/account'),
              icon: const Icon(Icons.shopping_bag_outlined),
            ),
            const SizedBox(width: 8),
          ],
        ),
        body: Column(
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(24, 22, 24, 8),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Activity',
                  style: TextStyle(
                    color: Color(0xff1a1c1d),
                    fontSize: 30,
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ),
            ),
            _FilterTabs(selected: _filter, onSelected: _select),
            Expanded(child: _buildContent()),
          ],
        ),
        bottomNavigationBar: const _ActivityBottomBar(),
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
      return const _ActivityMessage(message: 'Nu ai produse urmărite încă.');
    }
    if (_filter == _ActivityFilter.watching) {
      return const _ActivityMessage(
        message:
            'Nu ai produse urmărite încă. Funcția de watchlist va apărea aici.',
      );
    }

    final items = _filter == _ActivityFilter.wins
        ? _bids.where(_isWin).toList()
        : _bids;
    if (items.isEmpty) {
      return _ActivityMessage(
        message: _filter == _ActivityFilter.wins
            ? 'Nu ai nicio licitație câștigată încă.'
            : 'Nu există activitate de afișat.',
      );
    }
    return RefreshIndicator(
      color: const Color(0xff363a34),
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 18, 16, 28),
        itemCount: items.length,
        separatorBuilder: (_, _) => const SizedBox(height: 12),
        itemBuilder: (context, index) => _ActivityCard(bid: items[index]),
      ),
    );
  }

  bool _isWin(Bid bid) {
    final product = bid.product;
    if (product == null) return false;
    return (product.status == 'reserved' || product.status == 'sold') &&
        bid.maxAmount >= product.currentPrice;
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([api.myBids(), api.myFavorites()]);
      if (mounted) {
        setState(() {
          _bids = results[0] as List<Bid>;
          _favorites = results[1] as List<Product>;
        });
      }
    } catch (_) {
      if (mounted) {
        setState(() => _error = 'Activitatea nu a putut fi încărcată.');
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
            label: 'All',
            active: selected == _ActivityFilter.all,
            onTap: () => onSelected(_ActivityFilter.all),
          ),
        ),
        Expanded(
          child: _Tab(
            label: 'Bids',
            active: selected == _ActivityFilter.bids,
            onTap: () => onSelected(_ActivityFilter.bids),
          ),
        ),
        Expanded(
          child: _Tab(
            label: 'Watching',
            active: selected == _ActivityFilter.watching,
            onTap: () => onSelected(_ActivityFilter.watching),
          ),
        ),
        Expanded(
          child: _Tab(
            label: 'Wins',
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
  const _ActivityCard({required this.bid});
  final Bid bid;

  @override
  Widget build(BuildContext context) {
    final product = bid.product;
    final won =
        product != null &&
        (product.status == 'reserved' || product.status == 'sold') &&
        bid.maxAmount >= product.currentPrice;
    final outbid =
        product != null &&
        product.isActive &&
        bid.maxAmount < product.currentPrice;
    final title = product?.title ?? 'Licitație';
    final type = won
        ? 'Success'
        : outbid
        ? 'Outbid Alert'
        : product?.isActive == true
        ? 'Active bid'
        : 'Bid activity';
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
            imageUrl: product?.thumbnailUrl,
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
                      ? 'You won $title'
                      : outbid
                      ? 'You were outbid on $title'
                      : 'Your bid for $title',
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
                      const TextSpan(text: 'Your bid: '),
                      TextSpan(
                        text: formatRon(bid.maxAmount),
                        style: const TextStyle(
                          color: Color(0xff363a34),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      if (product != null) ...[
                        const TextSpan(text: '  •  Current bid: '),
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
                  _ago(bid.createdAt),
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
                    ? 'VIEW'
                    : outbid
                    ? 'RE-BID'
                    : 'OPEN',
              ),
            ),
        ],
      ),
    );
  }

  String _ago(DateTime value) {
    final difference = DateTime.now().difference(value);
    if (difference.inMinutes < 1) return 'Just now';
    if (difference.inHours < 1) return '${difference.inMinutes} min ago';
    if (difference.inDays < 1) return '${difference.inHours} h ago';
    return '${difference.inDays} days ago';
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
            imageUrl: product.thumbnailUrl,
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
                        active ? 'Watching' : 'Saved item',
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
                      const TextSpan(text: 'Current bid: '),
                      TextSpan(
                        text: formatRon(product.currentPrice),
                        style: const TextStyle(
                          color: Color(0xff363a34),
                          fontWeight: FontWeight.w700,
                        ),
                      ),
                      const TextSpan(text: '  •  Buy now: '),
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
                  active ? 'Auction active' : product.status.toUpperCase(),
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
            child: const Text('OPEN'),
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
            ? Image.network(
                imageUrl!,
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
              child: const Text('Încearcă din nou'),
            ),
          ],
        ],
      ),
    ),
  );
}

class _ActivityBottomBar extends StatelessWidget {
  const _ActivityBottomBar();
  @override
  Widget build(BuildContext context) => Container(
    height: 80 + MediaQuery.paddingOf(context).bottom,
    padding: EdgeInsets.fromLTRB(
      8,
      8,
      8,
      8 + MediaQuery.paddingOf(context).bottom,
    ),
    decoration: const BoxDecoration(
      color: Color(0xfff9f9fa),
      border: Border(top: BorderSide(color: Color(0xffe2e2e3))),
    ),
    child: Row(
      mainAxisAlignment: MainAxisAlignment.spaceAround,
      children: [
        _ActivityNav(
          icon: Icons.play_circle_outline,
          label: 'Feed',
          onTap: () => context.go('/'),
        ),
        _ActivityNav(
          icon: Icons.search,
          label: 'Explore',
          onTap: () => context.go('/explore'),
        ),
        _ActivityNav(
          icon: Icons.add_circle_outline,
          label: 'Sell',
          onTap: () => context.go('/seller'),
        ),
        _ActivityNav(
          icon: Icons.notifications,
          label: 'Activity',
          active: true,
          onTap: () {},
        ),
        _ActivityNav(
          icon: Icons.person_outline,
          label: 'Profile',
          onTap: () => context.go('/account'),
        ),
      ],
    ),
  );
}

class _ActivityNav extends StatelessWidget {
  const _ActivityNav({
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
  Widget build(BuildContext context) => InkWell(
    onTap: onTap,
    borderRadius: BorderRadius.circular(12),
    child: Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
      decoration: BoxDecoration(
        color: active
            ? const Color(0xffe4e3d8).withValues(alpha: 0.6)
            : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(
            icon,
            size: 22,
            color: const Color(0xff363a34).withValues(alpha: active ? 1 : 0.62),
          ),
          const SizedBox(height: 2),
          Text(
            label,
            style: TextStyle(
              color: const Color(
                0xff363a34,
              ).withValues(alpha: active ? 1 : 0.62),
              fontSize: 11,
              fontWeight: FontWeight.w600,
            ),
          ),
        ],
      ),
    ),
  );
}
