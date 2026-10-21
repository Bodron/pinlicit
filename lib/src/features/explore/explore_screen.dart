import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:go_router/go_router.dart';

import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';

class ExploreScreen extends ConsumerStatefulWidget {
  const ExploreScreen({super.key});

  @override
  ConsumerState<ExploreScreen> createState() => _ExploreScreenState();
}

class _ExploreScreenState extends ConsumerState<ExploreScreen> {
  final _searchController = TextEditingController();
  String _query = '';
  List<Product> _products = [];
  bool _productsLoading = true;

  static const _categories = [
    _ExploreCategory(
      title: 'Watches',
      activeCount: 124,
      icon: Icons.watch_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBZ4INWSHHTQIrCfwRXlU1CO-cfKM8QQ_uLDNuZ6hAMLgd866_Df0w8CkxmXT3ZeNXdLHY8EROUlcZh8ko2hg0iEOHtBsnlMVPg59Bj1ln1me9ijtpPTEvxcpQmnUg52jQ6rm_x_aiVaC5Se1ZhtWhZiFQBOEGzb0uscwizad6hK_eR_Owp4jdii-_BkHUOOqCGViSXH-PXNyAbf_zUWAMLuTntrdyH9T-3CezxK4knipmy91rv2NA9GVDdql6dNSdhDHB-QNi0pA',
    ),
    _ExploreCategory(
      title: 'Art',
      activeCount: 86,
      icon: Icons.palette_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDNccLadMuPmbWJPudd8_T6ZJ-tNgWN-KzmyUt87srscUxiM3FrjSeqZV1v7sgC52MQbwZn_S7sPkjtaf5DeY6GzV3Nsal_g9aLKQorrjdR1wYjvszjCr3g9Ei0H-x3h-YvYV2rWkOGNsOBmerRezRdBvwTfMcsYYOKTz2ysvK5IxMnf2GGpjtDF96Eu73m7m3n5rzqbbwuAGTLJU1kR_AvsejDTPlwZoRexAa93C_MU4EFaeeN9AfrPaGLkNOlqdrhranvmAtRGA',
    ),
    _ExploreCategory(
      title: 'Fashion',
      activeCount: 241,
      icon: Icons.checkroom_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuD4ZwAYt_9CDAIEVJm2loj9Erns2-sQo4VDrGY4hsnwspaIysbwywZyf7AV-OcFhFlAp5fuPYP7bYUtgguxxwJKCrXU5qgCSNQFmK0d3CcNk7t5hr228LtOmUUqrL_Mb49ItzgyJCO1M76f-G0pIg6lcLYZF9X5w6ygoeuT3o9UOE7dbn-uF_aOrf5I6_TexX4aFD9d5KVDxJTPRf-5z1HLo6u1Z-dkJzobARvz15qvaK2-7vTKe82D1ARMcm1ymbReoNoFXXV40g',
    ),
    _ExploreCategory(
      title: 'Furniture',
      activeCount: 42,
      icon: Icons.chair_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuDASv39D6iA25pboS6-zp4yuhhFrhlpH6RGc9EvESpv3eqrxHb1uesZffYRsCXSLtPkKXHc20DB49JK-XQCO-NVp9sqYDNAFLQWVgcuE8fMPaNrAeWLynhZ9hZNf9dDFAfj9JwhBZZ_Ve_N10-GQJacJYxKtA1L4oQY_4B9ePoTPJisA8rU8os37iJEe1059Ikks3SUx3FilZnueZKnIyygMK22RQcC4gY3kW7paEbyVDhiuVSWBGYC7SPr3OPpJDYEkkyF1hxlHg',
    ),
    _ExploreCategory(
      title: 'Collectibles',
      activeCount: 312,
      icon: Icons.camera_alt_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuCm-Wuljy1wqhuN8vnMfXDI2U9J0VmxEZABSPjJdWrEt0_Z0xN2LLEOTEEGcE065J2Iat21G4DrRDTTA23OorH9bGp3R-w_uEWJ4yH3Cp35b7Z5Cg3OXSteZGidrT05K-q1lEycP_F9tQ8_SoWSdORN4UCzYUyjn5RtQh8TRW3PHfn5-Pgtzz5HjxEUPkK7Nh1I7g613DQL9VtTALJ81LwUg8q_4I0k-b-x9DWcnEHZG2A4kKT3v1PHQCmKk2Clg9YxN-_6yESfow',
    ),
    _ExploreCategory(
      title: 'Electronics',
      activeCount: 95,
      icon: Icons.speaker_outlined,
      imageUrl:
          'https://lh3.googleusercontent.com/aida-public/AB6AXuBUv1f2Pa4uOwqfkP8b48u7Q6_xTLV1yMNy0BJP3FVBLOG31GdLl2SSWBu1bd-ezT4j3K09i9-2GuupCkOuGYlCGXOqjQwzPXgAIuqTTAK-VWG-PQADloA5qOjhhwhajo5zXcagKwf3UpTkU3qPXpP4qF3r7BAg2E7hdP3gkBkiYc0zkRRhgONRlmdyn8_Qo-GCeo5kK-jsaFp1p_cpx4ujCNR91FXZ6MFOVCZudyXo4VsUQ2rEPf2oJjL8kvMWzhGjTBGf1LctMQ',
    ),
  ];

  @override
  void initState() {
    super.initState();
    _loadProducts();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context).copyWith(
      textTheme: GoogleFonts.montserratTextTheme(Theme.of(context).textTheme),
    );
    final filtered = _categories
        .where(
          (category) =>
              _query.isEmpty ||
              category.title.toLowerCase().contains(_query.toLowerCase()),
        )
        .toList();
    final productResults = _products.where((product) {
      final query = _query.trim().toLowerCase();
      return query.isNotEmpty &&
          (product.title.toLowerCase().contains(query) ||
              product.description.toLowerCase().contains(query) ||
              (product.category?.name.toLowerCase().contains(query) ?? false));
    }).toList();
    final searching = _query.trim().isNotEmpty;

    return Theme(
      data: theme,
      child: Scaffold(
        backgroundColor: _ExploreColors.background,
        body: SafeArea(
          bottom: false,
          child: Column(
            children: [
              _TopBar(
                searchController: _searchController,
                onSearchChanged: (value) => setState(() => _query = value),
              ),
              Expanded(
                child: CustomScrollView(
                  slivers: [
                    SliverPadding(
                      padding: const EdgeInsets.fromLTRB(16, 24, 16, 0),
                      sliver: SliverToBoxAdapter(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: const [
                            Text(
                              'Explore Curated',
                              style: TextStyle(
                                color: _ExploreColors.primary,
                                fontSize: 30,
                                height: 1.3,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Discover exceptional pieces across our most exclusive categories.',
                              style: TextStyle(
                                color: _ExploreColors.onSurfaceVariant,
                                fontSize: 16,
                                height: 1.6,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (searching) ...[
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 28, 16, 0),
                        sliver: SliverToBoxAdapter(
                          child: Text(
                            _productsLoading
                                ? 'Searching auctions...'
                                : '${productResults.length} result${productResults.length == 1 ? '' : 's'}',
                            style: const TextStyle(
                              color: _ExploreColors.onSurfaceVariant,
                              fontSize: 16,
                              fontWeight: FontWeight.w600,
                            ),
                          ),
                        ),
                      ),
                      if (_productsLoading)
                        const SliverFillRemaining(
                          child: Center(child: CircularProgressIndicator()),
                        )
                      else if (productResults.isEmpty)
                        const SliverFillRemaining(
                          child: Center(
                            child: Text('No auctions match your search.'),
                          ),
                        )
                      else
                        SliverPadding(
                          padding: const EdgeInsets.fromLTRB(16, 16, 16, 120),
                          sliver: SliverList.separated(
                            itemCount: productResults.length,
                            itemBuilder: (context, index) => _ProductSearchCard(
                              product: productResults[index],
                              onTap: () => context.push(
                                '/products/${productResults[index].id}',
                              ),
                            ),
                            separatorBuilder: (_, _) =>
                                const SizedBox(height: 12),
                          ),
                        ),
                    ] else ...[
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 32, 16, 0),
                        sliver: SliverLayoutBuilder(
                          builder: (context, constraints) {
                            final width = constraints.crossAxisExtent;
                            final columns = width >= 1100
                                ? 3
                                : width >= 700
                                ? 2
                                : 1;
                            return SliverGrid(
                              delegate: SliverChildBuilderDelegate(
                                (context, index) => _CategoryCard(
                                  category: filtered[index],
                                  onTap: () => context.go('/'),
                                ),
                                childCount: filtered.length,
                              ),
                              gridDelegate:
                                  SliverGridDelegateWithFixedCrossAxisCount(
                                    crossAxisCount: columns,
                                    crossAxisSpacing: 24,
                                    mainAxisSpacing: 24,
                                    childAspectRatio: 4 / 5,
                                  ),
                            );
                          },
                        ),
                      ),
                      SliverPadding(
                        padding: const EdgeInsets.fromLTRB(16, 64, 16, 120),
                        sliver: SliverToBoxAdapter(child: _FeaturedCurators()),
                      ),
                    ],
                  ],
                ),
              ),
            ],
          ),
        ),
        bottomNavigationBar: const _ExploreBottomNav(),
      ),
    );
  }

  Future<void> _loadProducts() async {
    try {
      final products = await ref.read(apiClientProvider).feed();
      if (mounted) setState(() => _products = products);
    } finally {
      if (mounted) setState(() => _productsLoading = false);
    }
  }
}

class _ProductSearchCard extends StatelessWidget {
  const _ProductSearchCard({required this.product, required this.onTap});

  final Product product;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final hasImage = product.thumbnailUrl?.trim().isNotEmpty == true;
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(
            color: _ExploreColors.outlineVariant.withValues(alpha: 0.45),
          ),
        ),
        child: Row(
          children: [
            ClipRRect(
              borderRadius: BorderRadius.circular(9),
              child: SizedBox(
                width: 76,
                height: 76,
                child: hasImage
                    ? Image.network(
                        product.thumbnailUrl!,
                        fit: BoxFit.cover,
                        errorBuilder: (_, _, _) => _videoFallback(),
                      )
                    : _videoFallback(),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    product.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      color: _ExploreColors.primary,
                      fontSize: 17,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    product.category?.name ?? 'Auction',
                    style: const TextStyle(
                      color: _ExploreColors.onSurfaceVariant,
                      fontSize: 13,
                    ),
                  ),
                  const SizedBox(height: 9),
                  Text(
                    'Current bid: ${formatRon(product.currentPrice)}',
                    style: const TextStyle(
                      color: _ExploreColors.primary,
                      fontSize: 13,
                      fontWeight: FontWeight.w700,
                    ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.arrow_forward, color: _ExploreColors.primary),
          ],
        ),
      ),
    );
  }

  Widget _videoFallback() => const ColoredBox(
    color: _ExploreColors.secondaryContainer,
    child: Icon(
      Icons.play_circle_outline,
      color: _ExploreColors.primary,
      size: 34,
    ),
  );
}

class _ExploreColors {
  static const background = Color(0xfff9f9fa);
  static const surfaceLow = Color(0xfff3f3f4);
  static const secondaryContainer = Color(0xffe4e3d8);
  static const primary = Color(0xff363a34);
  static const onSurfaceVariant = Color(0xff454842);
  static const outlineVariant = Color(0xffc5c7c0);
}

class _ExploreCategory {
  const _ExploreCategory({
    required this.title,
    required this.activeCount,
    required this.icon,
    required this.imageUrl,
  });

  final String title;
  final int activeCount;
  final IconData icon;
  final String imageUrl;
}

class _TopBar extends StatelessWidget {
  const _TopBar({
    required this.searchController,
    required this.onSearchChanged,
  });

  final TextEditingController searchController;
  final ValueChanged<String> onSearchChanged;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
      decoration: BoxDecoration(
        color: _ExploreColors.background.withValues(alpha: 0.88),
        border: Border(
          bottom: BorderSide(
            color: _ExploreColors.outlineVariant.withValues(alpha: 0.3),
          ),
        ),
      ),
      child: Column(
        children: [
          SizedBox(
            height: 56,
            child: Row(
              children: [
                IconButton(
                  tooltip: 'Sell',
                  onPressed: () => context.go('/seller'),
                  icon: const Icon(Icons.menu, color: _ExploreColors.primary),
                ),
                const SizedBox(width: 8),
                const Text(
                  'Licit',
                  style: TextStyle(
                    color: _ExploreColors.primary,
                    fontSize: 36,
                    height: 1.2,
                    fontWeight: FontWeight.w800,
                  ),
                ),
                const Spacer(),
                IconButton(
                  tooltip: 'Profile',
                  onPressed: () => context.go('/account'),
                  icon: const Icon(
                    Icons.shopping_bag_outlined,
                    color: _ExploreColors.primary,
                  ),
                ),
              ],
            ),
          ),
          TextField(
            controller: searchController,
            onChanged: onSearchChanged,
            style: const TextStyle(
              color: _ExploreColors.primary,
              fontSize: 16,
              fontWeight: FontWeight.w500,
            ),
            decoration: InputDecoration(
              hintText: 'Search categories...',
              hintStyle: TextStyle(
                color: _ExploreColors.onSurfaceVariant.withValues(alpha: 0.62),
              ),
              prefixIcon: const Icon(
                Icons.search,
                color: _ExploreColors.onSurfaceVariant,
              ),
              filled: true,
              fillColor: _ExploreColors.surfaceLow,
              contentPadding: const EdgeInsets.symmetric(horizontal: 16),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: BorderSide.none,
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: _ExploreColors.primary),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _CategoryCard extends StatefulWidget {
  const _CategoryCard({required this.category, required this.onTap});

  final _ExploreCategory category;
  final VoidCallback onTap;

  @override
  State<_CategoryCard> createState() => _CategoryCardState();
}

class _CategoryCardState extends State<_CategoryCard> {
  bool _pressed = false;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: widget.onTap,
      onTapDown: (_) => setState(() => _pressed = true),
      onTapCancel: () => setState(() => _pressed = false),
      onTapUp: (_) => setState(() => _pressed = false),
      child: AnimatedScale(
        scale: _pressed ? 0.98 : 1,
        duration: const Duration(milliseconds: 120),
        child: ClipRRect(
          borderRadius: BorderRadius.circular(12),
          child: Stack(
            fit: StackFit.expand,
            children: [
              Image.network(
                widget.category.imageUrl,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => ColoredBox(
                  color: _ExploreColors.surfaceLow,
                  child: Icon(
                    widget.category.icon,
                    color: _ExploreColors.primary,
                    size: 56,
                  ),
                ),
              ),
              DecoratedBox(
                decoration: BoxDecoration(
                  gradient: LinearGradient(
                    begin: Alignment.topCenter,
                    end: Alignment.bottomCenter,
                    colors: [
                      Colors.transparent,
                      _ExploreColors.primary.withValues(alpha: 0.68),
                    ],
                  ),
                ),
              ),
              Positioned(
                left: 24,
                right: 24,
                bottom: 24,
                child: Container(
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.15),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(
                      color: Colors.white.withValues(alpha: 0.22),
                    ),
                  ),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              widget.category.title,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 24,
                                height: 1.3,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${widget.category.activeCount} Active',
                              style: TextStyle(
                                color: Colors.white.withValues(alpha: 0.82),
                                fontSize: 14,
                                fontWeight: FontWeight.w800,
                                letterSpacing: 1.1,
                              ),
                            ),
                          ],
                        ),
                      ),
                      Icon(widget.category.icon, color: Colors.white),
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
}

class _FeaturedCurators extends StatelessWidget {
  const _FeaturedCurators();

  final _curators = const [
    _Curator(
      icon: Icons.auto_awesome,
      title: 'The Modernist',
      description: 'Focusing on Bauhaus and Mid-Century aesthetics.',
    ),
    _Curator(
      icon: Icons.diamond_outlined,
      title: 'Heritage Vault',
      description: 'Rare timepieces and high jewelry selections.',
    ),
    _Curator(
      icon: Icons.palette_outlined,
      title: 'Canvas Select',
      description: 'A curated eye for emerging contemporary art.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            const Expanded(
              child: Text(
                'Featured Curators',
                style: TextStyle(
                  color: _ExploreColors.primary,
                  fontSize: 24,
                  height: 1.4,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
            TextButton(onPressed: () {}, child: const Text('View All')),
          ],
        ),
        const SizedBox(height: 24),
        SizedBox(
          height: 204,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _curators.length,
            separatorBuilder: (context, index) => const SizedBox(width: 16),
            itemBuilder: (context, index) =>
                _CuratorCard(curator: _curators[index]),
          ),
        ),
      ],
    );
  }
}

class _Curator {
  const _Curator({
    required this.icon,
    required this.title,
    required this.description,
  });

  final IconData icon;
  final String title;
  final String description;
}

class _CuratorCard extends StatelessWidget {
  const _CuratorCard({required this.curator});

  final _Curator curator;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 256,
      padding: const EdgeInsets.all(24),
      decoration: BoxDecoration(
        color: _ExploreColors.surfaceLow,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _ExploreColors.outlineVariant.withValues(alpha: 0.22),
        ),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          CircleAvatar(
            radius: 24,
            backgroundColor: _ExploreColors.secondaryContainer,
            child: Icon(curator.icon, color: _ExploreColors.primary),
          ),
          const SizedBox(height: 16),
          Text(
            curator.title,
            style: const TextStyle(
              color: _ExploreColors.primary,
              fontSize: 14,
              fontWeight: FontWeight.w800,
              letterSpacing: 0.7,
            ),
          ),
          const SizedBox(height: 6),
          Expanded(
            child: Text(
              curator.description,
              style: const TextStyle(
                color: _ExploreColors.onSurfaceVariant,
                fontSize: 12,
                height: 1.4,
              ),
            ),
          ),
          SizedBox(
            width: double.infinity,
            child: OutlinedButton(
              onPressed: () => ScaffoldMessenger.of(context).showSnackBar(
                SnackBar(content: Text('Following ${curator.title} soon.')),
              ),
              style: OutlinedButton.styleFrom(
                foregroundColor: _ExploreColors.primary,
                side: const BorderSide(color: _ExploreColors.primary),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(8),
                ),
              ),
              child: const Text('Follow'),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExploreBottomNav extends StatelessWidget {
  const _ExploreBottomNav();

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
        color: _ExploreColors.background,
        border: Border(
          top: BorderSide(
            color: _ExploreColors.outlineVariant.withValues(alpha: 0.2),
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
            active: true,
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
        ? _ExploreColors.primary
        : _ExploreColors.onSurfaceVariant;

    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(12),
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 180),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
        decoration: BoxDecoration(
          color: active
              ? _ExploreColors.secondaryContainer.withValues(alpha: 0.5)
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
