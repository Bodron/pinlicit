import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../shared/models/category.dart';
import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import 'widgets/auction_video_card.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen> {
  List<ProductCategory> _categories = [];
  List<Product> _products = [];
  String? _categoryId;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionControllerProvider).user;

    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
      ),
      child: Scaffold(
        backgroundColor: const Color(0xfff9f9fa),
        extendBody: true,
        body: Stack(
          children: [
            if (_loading)
              const _FeedLoading()
            else if (_error != null)
              _FeedError(message: _error!, onRetry: _load)
            else if (_products.isEmpty)
              _FeedError(
                message: 'Nu exista produse active in feed.',
                onRetry: _load,
              )
            else
              PageView.builder(
                scrollDirection: Axis.vertical,
                itemCount: _products.length,
                itemBuilder: (context, index) => AuctionVideoCard(
                  product: _products[index],
                  onOpenDetails: () =>
                      context.push('/products/${_products[index].id}'),
                  onFavoriteChanged: _updateProduct,
                ),
              ),
            _FeedTopBar(onSearch: () => context.go('/explore')),
            _CategoryRail(
              categories: _categories,
              selectedCategoryId: _categoryId,
              onSelected: _selectCategory,
            ),
          ],
        ),
        bottomNavigationBar: _FeedBottomBar(isAdmin: user?.isAdmin == true),
      ),
    );
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.categories(),
        api.feed(categoryId: _categoryId),
        api.myFavorites(),
      ]);
      final favoritesById = {
        for (final product in results[2] as List<Product>) product.id: product,
      };
      setState(() {
        _categories = results[0] as List<ProductCategory>;
        _products = (results[1] as List<Product>)
            .map(
              (product) => product.copyWith(
                isFavorite: favoritesById.containsKey(product.id),
                favoriteCount:
                    favoritesById[product.id]?.favoriteCount ??
                    product.favoriteCount,
              ),
            )
            .toList();
      });
    } catch (error) {
      setState(() => _error = error.toString());
    } finally {
      if (mounted) {
        setState(() => _loading = false);
      }
    }
  }

  void _selectCategory(String? id) {
    setState(() => _categoryId = id);
    _load();
  }

  void _updateProduct(Product updated) {
    setState(() {
      _products = _products
          .map((product) => product.id == updated.id ? updated : product)
          .toList();
    });
  }
}

class _FeedTopBar extends StatelessWidget {
  const _FeedTopBar({required this.onSearch});

  final VoidCallback onSearch;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: 0,
      left: 0,
      right: 0,
      child: SafeArea(
        bottom: false,
        child: SizedBox(
          height: 64,
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                IconButton(
                  tooltip: 'Search',
                  onPressed: onSearch,
                  icon: const Icon(Icons.search, color: Colors.white),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _CategoryRail extends StatelessWidget {
  const _CategoryRail({
    required this.categories,
    required this.selectedCategoryId,
    required this.onSelected,
  });

  final List<ProductCategory> categories;
  final String? selectedCategoryId;
  final ValueChanged<String?> onSelected;

  @override
  Widget build(BuildContext context) {
    return Positioned(
      top: MediaQuery.paddingOf(context).top + 64,
      left: 0,
      right: 0,
      child: SizedBox(
        height: 48,
        child: ListView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
          scrollDirection: Axis.horizontal,
          children: [
            _CategoryChip(
              label: 'For You',
              selected: selectedCategoryId == null,
              onTap: () => onSelected(null),
            ),
            for (final category in categories)
              _CategoryChip(
                label: category.name,
                selected: selectedCategoryId == category.id,
                onTap: () => onSelected(category.id),
              ),
          ],
        ),
      ),
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(right: 8),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(999),
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 7),
          decoration: BoxDecoration(
            color: selected ? const Color(0xff4d514a) : const Color(0xffeeeeef),
            borderRadius: BorderRadius.circular(999),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: Colors.black.withValues(alpha: 0.05),
                      blurRadius: 12,
                      offset: const Offset(0, 4),
                    ),
                  ]
                : null,
          ),
          child: Text(
            label,
            style: TextStyle(
              color: selected ? Colors.white : const Color(0xff454842),
              fontSize: 14,
              height: 1.2,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.7,
            ),
          ),
        ),
      ),
    );
  }
}

class _FeedBottomBar extends StatelessWidget {
  const _FeedBottomBar({required this.isAdmin});

  final bool isAdmin;

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
        color: const Color(0xfff9f9fa),
        border: Border(
          top: BorderSide(
            color: const Color(0xffc5c7c0).withValues(alpha: 0.22),
          ),
        ),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceAround,
        children: [
          _FeedNavItem(
            icon: Icons.play_circle_fill,
            label: 'Feed',
            active: true,
            onTap: () => context.go('/'),
          ),
          _FeedNavItem(
            icon: Icons.search,
            label: 'Explore',
            onTap: () => context.go('/explore'),
          ),
          _FeedNavItem(
            icon: Icons.add_circle,
            label: 'Sell',
            onTap: () => context.go('/seller'),
          ),
          _FeedNavItem(
            icon: Icons.notifications,
            label: isAdmin ? 'Admin' : 'Activity',
            onTap: () =>
                isAdmin ? context.go('/admin') : context.go('/activity'),
          ),
          _FeedNavItem(
            icon: Icons.person,
            label: 'Profile',
            onTap: () => context.go('/account'),
          ),
        ],
      ),
    );
  }
}

class _FeedNavItem extends StatelessWidget {
  const _FeedNavItem({
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
    final color = active ? const Color(0xff363a34) : const Color(0xff454842);

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: active
              ? const Color(0xffe4e3d8).withValues(alpha: 0.5)
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

class _FeedLoading extends StatelessWidget {
  const _FeedLoading();

  @override
  Widget build(BuildContext context) {
    return const ColoredBox(
      color: Color(0xfff9f9fa),
      child: Center(child: CircularProgressIndicator(color: Color(0xff4d514a))),
    );
  }
}

class _FeedError extends StatelessWidget {
  const _FeedError({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(message, textAlign: TextAlign.center),
            const SizedBox(height: 12),
            OutlinedButton.icon(
              onPressed: onRetry,
              icon: const Icon(Icons.refresh),
              label: const Text('Reincarca'),
            ),
          ],
        ),
      ),
    );
  }
}
