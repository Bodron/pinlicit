import 'package:licit/l10n/l10n.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../shared/models/category.dart';
import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/state/catalog_updates.dart';
import '../../shared/widgets/app_layout.dart';
import '../../shared/video/feed_playback.dart';
import 'widgets/auction_video_card.dart';

class FeedScreen extends ConsumerStatefulWidget {
  const FeedScreen({super.key});

  @override
  ConsumerState<FeedScreen> createState() => _FeedScreenState();
}

class _FeedScreenState extends ConsumerState<FeedScreen>
    with WidgetsBindingObserver {
  final _playback = FeedPlayback();
  bool _feedVisible = false;
  bool _foreground = true;
  int _loadRevision = 0;
  List<ProductCategory> _categories = [];
  List<Product> _products = [];
  String? _categoryId;
  int _currentIndex = 0;
  bool _loading = true;
  String? _error;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    _feedVisible = AppLayoutVisibility.isFeedVisible(context);
    _syncPlayback();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    _syncPlayback();
  }

  void _syncPlayback() {
    final active =
        _feedVisible &&
        _foreground &&
        !_loading &&
        _currentIndex < _products.length;
    final product = active ? _products[_currentIndex] : null;
    _playback.select(product?.id, product?.videoUrl);
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _playback.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    ref.listen(catalogUpdatesProvider, (_, _) => _load());
    return Theme(
      data: Theme.of(context).copyWith(
        textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
      ),
      child: ColoredBox(
        color: const Color(0xfff9f9fa),
        child: Stack(
          children: [
            if (_loading)
              const _FeedLoading()
            else if (_error != null)
              _FeedError(message: _error!, onRetry: _load)
            else if (_products.isEmpty)
              _FeedError(message: context.l10n.noActiveListings, onRetry: _load)
            else
              PageView.builder(
                scrollDirection: Axis.vertical,
                itemCount: _products.length,
                onPageChanged: (index) {
                  setState(() => _currentIndex = index);
                  _syncPlayback();
                },
                itemBuilder: (context, index) => AuctionVideoCard(
                  key: ValueKey(_products[index].id),
                  product: _products[index],
                  isActive:
                      _feedVisible && _foreground && index == _currentIndex,
                  playback: _playback,
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
      ),
    );
  }

  Future<void> _load() async {
    final revision = ++_loadRevision;
    final categoryId = _categoryId;
    setState(() {
      _loading = true;
      _currentIndex = 0;
      _error = null;
    });
    _syncPlayback();
    try {
      final api = ref.read(apiClientProvider);
      final results = await Future.wait([
        api.categories(),
        api.feed(categoryId: categoryId),
        api.myFavorites(),
      ]);
      if (!mounted || revision != _loadRevision) return;
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
      if (!mounted || revision != _loadRevision) return;
      setState(() => _error = localizedError(error, context.l10n));
    } finally {
      if (mounted && revision == _loadRevision) {
        setState(() => _loading = false);
        _syncPlayback();
      }
    }
  }

  void _selectCategory(String? id) {
    if (id == _categoryId) return;
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
                  tooltip: context.l10n.search,
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
              label: context.l10n.forYou,
              selected: selectedCategoryId == null,
              onTap: () => onSelected(null),
            ),
            for (final category in categories)
              _CategoryChip(
                label: localizedCategory(category.name, context.l10n),
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
              label: Text(context.l10n.reload),
            ),
          ],
        ),
      ),
    );
  }
}
