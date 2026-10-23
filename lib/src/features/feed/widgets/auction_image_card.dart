import '../../commerce/commerce_flow.dart';
import '../../../shared/images/product_image.dart';
import 'package:licit/l10n/l10n.dart';
import 'dart:async';
import 'dart:ui';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;

import '../../../shared/config/app_config.dart';
import '../../../shared/models/product.dart';
import '../../../shared/navigation/app_route_observer.dart';
import '../../../shared/state/session_controller.dart';
import '../../../shared/notifications/app_notifier.dart';
import '../../../shared/state/favorite_mutation.dart';
import '../../../shared/utils/money.dart';

class AuctionImageCard extends ConsumerStatefulWidget {
  const AuctionImageCard({
    super.key,
    required this.product,
    required this.onOpenDetails,
    this.onFavoriteChanged,
    this.isActive = true,
  });

  final Product product;
  final bool isActive;
  final VoidCallback onOpenDetails;
  final ValueChanged<Product>? onFavoriteChanged;

  @override
  ConsumerState<AuctionImageCard> createState() => _AuctionImageCardState();
}

class _AuctionImageCardState extends ConsumerState<AuctionImageCard>
    with RouteAware, WidgetsBindingObserver {
  late Product _product;
  io.Socket? _socket;
  String? _message;
  bool _panelExpanded = false;
  FavoriteMutation _favoriteMutation = FavoriteMutation();
  ModalRoute<dynamic>? _route;
  bool _foreground = true;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _product = widget.product;
    _syncSocket();
  }

  @override
  void didUpdateWidget(covariant AuctionImageCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.product.id != widget.product.id) {
      _disconnectSocket();
      _product = widget.product;
      _message = null;
      _panelExpanded = false;
      _favoriteMutation = FavoriteMutation();
    } else if (!_favoriteMutation.pending &&
        (oldWidget.product.isFavorite != widget.product.isFavorite ||
            oldWidget.product.favoriteCount != widget.product.favoriteCount)) {
      _product = _product.copyWith(
        isFavorite: widget.product.isFavorite,
        favoriteCount: widget.product.favoriteCount,
      );
    }
    _syncSocket();
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final route = ModalRoute.of(context);
    if (route != null && route != _route) {
      if (_route != null) appRouteObserver.unsubscribe(this);
      _route = route;
      appRouteObserver.subscribe(this, route);
    }
  }

  @override
  void didPushNext() {
    _disconnectSocket();
  }

  @override
  void didPopNext() {
    _syncSocket();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    appRouteObserver.unsubscribe(this);
    _disconnectSocket();
    super.dispose();
  }

  void _disconnectSocket() {
    final socket = _socket;
    _socket = null;
    socket?.emit('auction:leave', {'productId': _product.id});
    socket?.dispose();
  }

  void _syncSocket() {
    if (!widget.isActive || !_foreground || _route?.isCurrent == false) {
      _disconnectSocket();
    } else if (_socket == null) {
      _connectSocket();
    }
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    _syncSocket();
  }

  @override
  Widget build(BuildContext context) {
    return Stack(
      fit: StackFit.expand,
      children: [
        RepaintBoundary(
          child: _product.imageUrl.isEmpty
              ? const ColoredBox(
                  color: Color(0xff454842),
                  child: Center(
                    child: Icon(
                      Icons.image_outlined,
                      color: Colors.white,
                      size: 64,
                    ),
                  ),
                )
              : ProductImage(
                  url: _product.imageForWidth(
                    MediaQuery.sizeOf(context).width *
                        MediaQuery.devicePixelRatioOf(context),
                  ),
                  fit: BoxFit.cover,
                  errorBuilder: (context, error, stackTrace) => ColoredBox(
                    color: const Color(0xff454842),
                    child: Center(
                      child: Text(
                        context.l10n.imageLoadFailed,
                        style: const TextStyle(color: Colors.white),
                      ),
                    ),
                  ),
                ),
        ),
        const _ImageGradient(),
        Positioned.fill(
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onTap: widget.onOpenDetails,
          ),
        ),
        Positioned(
          left: 16,
          right: 16,
          // The Scaffold body already ends above the feed navigation bar.
          // Keep only a 5 px visual gap, plus the device's system inset.
          bottom: 10 + MediaQuery.paddingOf(context).bottom,
          child: SafeArea(
            top: false,
            bottom: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                _MetricAction(
                  icon: _product.isFavorite
                      ? Icons.favorite
                      : Icons.favorite_border,
                  label: _compactCount(_product.favoriteCount),
                  active: _product.isFavorite,
                  onTap: _favoriteMutation.pending ? null : _toggleFavorite,
                ),
                const SizedBox(height: 20),
                _MetricAction(
                  icon: Icons.share_outlined,
                  onTap: () =>
                      setState(() => _message = context.l10n.shareComingSoon),
                ),
                const SizedBox(height: 12),
                _AuctionInfoPanel(
                  product: _product,
                  message: _message,
                  expanded: _panelExpanded,
                  onToggle: () =>
                      setState(() => _panelExpanded = !_panelExpanded),
                  onBid: _product.isActive ? _openBidSheet : null,
                  onBuyNow: _product.canBuyNow ? _buyNow : null,
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  void _connectSocket() {
    final socket = io.io(
      AppConfig.apiBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .enableForceNew()
          .disableAutoConnect()
          .build(),
    );
    _socket = socket;
    socket.onConnect((_) {
      if (!mounted || !identical(_socket, socket)) return;
      socket.emit('auction:join', {'productId': _product.id});
    });
    socket.on('auction:update', (data) {
      if (!mounted || !identical(_socket, socket)) return;
      final map = Map<String, dynamic>.from(data as Map);
      if (map['product'] is Map) {
        setState(
          () => _product =
              Product.fromJson(
                Map<String, dynamic>.from(map['product']),
              ).copyWith(
                isFavorite: _product.isFavorite,
                favoriteCount: _favoriteMutation.pending
                    ? _product.favoriteCount
                    : null,
              ),
        );
      }
    });
    socket.on('bid:new', (data) {
      if (!mounted || !identical(_socket, socket)) return;
      final map = Map<String, dynamic>.from(data as Map);
      if (map['product'] is Map) {
        _product = Product.fromJson(Map<String, dynamic>.from(map['product']))
            .copyWith(
              isFavorite: _product.isFavorite,
              favoriteCount: _favoriteMutation.pending
                  ? _product.favoriteCount
                  : null,
            );
      }
      if (mounted) setState(() => _message = context.l10n.newLiveBid);
    });
    socket.on('auction:extended', (_) {
      if (!mounted || !identical(_socket, socket)) return;
      if (mounted) setState(() => _message = context.l10n.auctionExtended);
    });
    socket.on('auction:closed', (data) {
      if (!mounted || !identical(_socket, socket)) return;
      final map = Map<String, dynamic>.from(data as Map);
      if (map['product'] is Map && mounted) {
        setState(
          () => _product =
              Product.fromJson(
                Map<String, dynamic>.from(map['product']),
              ).copyWith(
                isFavorite: _product.isFavorite,
                favoriteCount: _favoriteMutation.pending
                    ? _product.favoriteCount
                    : null,
              ),
        );
      }
    });
    socket.connect();
  }

  Future<void> _openBidSheet() async {
    final amount = await showModalBottomSheet<int>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      barrierColor: Colors.black.withValues(alpha: 0.34),
      builder: (_) => _PlaceBidSheet(product: _product),
    );
    if (amount != null) {
      await _placeBid(amount);
    }
  }

  bool _commerceBusy = false;
  Future<void> _placeBid(int amount) async {
    if (_commerceBusy) return;
    _commerceBusy = true;
    try {
      if (!await ensureBidGuarantee(context, ref, _product, amount) ||
          !mounted) {
        return;
      }
      final product = await ref
          .read(apiClientProvider)
          .placeBid(_product.id, amount);
      if (!mounted) return;
      setState(() {
        _product = product.copyWith(isFavorite: _product.isFavorite);
        _message = context.l10n.bidSubmitted;
      });
    } catch (error) {
      if (mounted) setState(() => _message = commerceError(error));
    } finally {
      _commerceBusy = false;
    }
  }

  Future<void> _buyNow() async {
    if (_commerceBusy) return;
    final userId = ref.read(sessionControllerProvider).user?.id;
    if (userId != null && _product.seller?.id == userId) {
      setState(() => _message = context.l10n.ownProductBuy);
      return;
    }
    try {
      _commerceBusy = true;
      if (_product.commerceVersion != 1) {
        throw StateError(
          'Vânzătorul trebuie să activeze plata Stripe pentru acest anunț vechi.',
        );
      }
      if (_product.commerceVersion == 1 &&
          !await ensureCommerceIdentity(context, ref)) {
        return;
      }
      final product = await ref.read(apiClientProvider).buyNow(_product.id);
      if (!mounted) return;
      setState(() {
        _product = product.copyWith(isFavorite: _product.isFavorite);
        _message = product.commerceVersion == 1
            ? 'Produs rezervat. Finalizează plata în Plăți și comenzi.'
            : context.l10n.productReservedContact;
      });
      if (mounted) await openProductPayment(context, ref, product);
    } catch (error) {
      if (!mounted) return;
      setState(() => _message = commerceError(error));
    } finally {
      _commerceBusy = false;
    }
  }

  Future<void> _toggleFavorite() async {
    final mutation = _favoriteMutation;
    if (mutation.pending) return;
    final userId = ref.read(sessionControllerProvider).user?.id;
    if (userId != null && _product.seller?.id == userId) {
      context.notifier.warning(
        context.l10n.cannotFavoriteOwnProduct,
        id: 'favorite:${_product.id}',
      );
      return;
    }
    final optimistic = mutation.begin(_product, userId);
    if (optimistic == null) return;
    final productId = _product.id;
    final next = optimistic.isFavorite;
    bool isCurrent() =>
        mounted &&
        identical(_favoriteMutation, mutation) &&
        _product.id == productId;
    setState(() {
      _product = optimistic;
      _message = null;
    });
    widget.onFavoriteChanged?.call(_product);
    try {
      final api = ref.read(apiClientProvider);
      final int? confirmedCount;
      if (next) {
        final product = await api.addFavorite(productId);
        confirmedCount = product.favoriteCount;
      } else {
        confirmedCount = await api.removeFavorite(productId);
      }
      if (!mounted || !isCurrent()) return;
      setState(() {
        _product = _product.copyWith(
          isFavorite: next,
          favoriteCount: confirmedCount,
        );
        _message = null;
      });
      context.notifier.success(
        next
            ? context.l10n.addedToFavorites
            : context.l10n.removedFromFavorites,
        id: 'favorite:$productId',
      );
      widget.onFavoriteChanged?.call(_product);
    } catch (error) {
      if (!mounted || !isCurrent()) return;
      setState(() {
        _product = mutation.rollback(_product);
        _message = null;
      });
      context.notifier.error(
        localizedError(error, context.l10n),
        id: 'favorite:$productId',
      );
      widget.onFavoriteChanged?.call(_product);
    } finally {
      if (isCurrent()) setState(mutation.complete);
    }
  }

  String _compactCount(int count) {
    if (count < 1000) return count.toString();
    final value = count / 1000;
    final text = value >= 10
        ? value.toStringAsFixed(0)
        : value.toStringAsFixed(1);
    return '${text.replaceAll('.0', '')}k';
  }
}

class _ImageGradient extends StatelessWidget {
  const _ImageGradient();

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            Colors.black.withValues(alpha: 0.18),
            Colors.transparent,
            Colors.black.withValues(alpha: 0.46),
          ],
        ),
      ),
    );
  }
}

class _AuctionInfoPanel extends StatelessWidget {
  const _AuctionInfoPanel({
    required this.product,
    required this.message,
    required this.onBid,
    required this.onBuyNow,
    required this.expanded,
    required this.onToggle,
  });

  final Product product;
  final String? message;
  final VoidCallback? onBid;
  final VoidCallback? onBuyNow;
  final bool expanded;
  final VoidCallback onToggle;

  @override
  Widget build(BuildContext context) {
    return ClipRRect(
      borderRadius: BorderRadius.circular(20),
      child: BackdropFilter(
        filter: ImageFilter.blur(sigmaX: 12, sigmaY: 12),
        child: Container(
          padding: const EdgeInsets.fromLTRB(16, 14, 16, 16),
          decoration: BoxDecoration(
            color: const Color(0xfffcfcfd).withValues(alpha: 0.88),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: const Color(0xffc5c7c0).withValues(alpha: 0.28),
            ),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Semantics(
                button: true,
                expanded: expanded,
                label: expanded
                    ? context.l10n.collapseAuction
                    : context.l10n.expandAuction,
                child: Material(
                  color: Colors.transparent,
                  child: InkWell(
                    onTap: onToggle,
                    borderRadius: BorderRadius.circular(12),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 4),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            children: [
                              const Icon(
                                Icons.timer_outlined,
                                size: 16,
                                color: Color(0xff454842),
                              ),
                              const SizedBox(width: 5),
                              Expanded(
                                child: _LiveRemainingLabel(
                                  endsAt: product.endsAt,
                                  status: product.status,
                                ),
                              ),
                              const SizedBox(width: 8),
                              Text(
                                expanded
                                    ? context.l10n.showLess
                                    : context.l10n.bidDetails,
                                style: const TextStyle(
                                  color: Color(0xff454842),
                                  fontSize: 11,
                                  fontWeight: FontWeight.w700,
                                ),
                              ),
                              AnimatedRotation(
                                turns: expanded ? 0.5 : 0,
                                duration: const Duration(milliseconds: 240),
                                child: const Icon(
                                  Icons.keyboard_arrow_up,
                                  color: Color(0xff454842),
                                ),
                              ),
                            ],
                          ),
                          const SizedBox(height: 6),
                          Row(
                            children: [
                              Expanded(
                                child: Text(
                                  product.title,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: const TextStyle(
                                    color: Color(0xff242522),
                                    fontSize: 21,
                                    height: 1.15,
                                    fontWeight: FontWeight.w800,
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Flexible(
                                child: FittedBox(
                                  fit: BoxFit.scaleDown,
                                  alignment: Alignment.centerRight,
                                  child: _BidPrice(
                                    label: context.l10n.currentBidUpper,
                                    value: formatRon(product.currentPrice),
                                    alignEnd: true,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                  ),
                ),
              ),
              AnimatedSize(
                duration: const Duration(milliseconds: 240),
                curve: Curves.easeInOutCubic,
                alignment: Alignment.bottomCenter,
                child: expanded
                    ? ConstrainedBox(
                        constraints: BoxConstraints(
                          maxHeight: MediaQuery.sizeOf(context).height * 0.3,
                        ),
                        child: SingleChildScrollView(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              const SizedBox(height: 3),
                              Text(
                                product.description,
                                maxLines: 1,
                                overflow: TextOverflow.ellipsis,
                                style: const TextStyle(
                                  color: Color(0xff5d5f59),
                                  fontSize: 13,
                                  fontWeight: FontWeight.w500,
                                ),
                              ),
                              const SizedBox(height: 13),
                              Row(
                                children: [
                                  Expanded(
                                    child: _BidPrice(
                                      label: context.l10n.minimumBidUpper,
                                      value: formatRon(product.nextBid),
                                    ),
                                  ),
                                  if (product.category != null)
                                    Flexible(
                                      child: _CategoryPill(
                                        label: localizedCategory(
                                          product.category!.name,
                                          context.l10n,
                                        ),
                                      ),
                                    ),
                                ],
                              ),
                              if (product.hasReserve) ...[
                                const SizedBox(height: 8),
                                _ReserveStatus(met: product.reserveMet),
                              ],
                              const SizedBox(height: 16),
                              Row(
                                children: [
                                  Expanded(
                                    child: FilledButton(
                                      onPressed: onBid,
                                      style: FilledButton.styleFrom(
                                        minimumSize: const Size.fromHeight(46),
                                        backgroundColor: const Color(
                                          0xff363a34,
                                        ),
                                        foregroundColor: Colors.white,
                                        textStyle: const TextStyle(
                                          fontSize: 13,
                                          fontWeight: FontWeight.w800,
                                        ),
                                      ),
                                      child: Text(
                                        context.l10n.maxBidAmount(
                                          formatRon(product.nextBid),
                                        ),
                                      ),
                                    ),
                                  ),
                                  const SizedBox(width: 10),
                                  Expanded(
                                    child: _BuyNowButton(
                                      price: formatRon(product.buyNowPrice),
                                      onPressed: onBuyNow,
                                    ),
                                  ),
                                ],
                              ),
                            ],
                          ),
                        ),
                      )
                    : const SizedBox(width: double.infinity),
              ),
              if (message != null) ...[
                const SizedBox(height: 9),
                Text(
                  message!,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(
                    color: Color(0xff454842),
                    fontSize: 12,
                    fontWeight: FontWeight.w700,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _BuyNowButton extends StatelessWidget {
  const _BuyNowButton({required this.price, required this.onPressed});

  final String price;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(10),
        child: Ink(
          height: 46,
          padding: const EdgeInsets.symmetric(horizontal: 10),
          decoration: BoxDecoration(
            color: enabled ? const Color(0xfffff4d6) : const Color(0xffe7e6df),
            borderRadius: BorderRadius.circular(10),
            border: Border.all(
              color: enabled
                  ? const Color(0xffc59a24)
                  : const Color(0xffc8c8c0),
              width: 1.2,
            ),
            boxShadow: enabled
                ? [
                    BoxShadow(
                      color: const Color(0xffc59a24).withValues(alpha: 0.18),
                      blurRadius: 10,
                      offset: const Offset(0, 3),
                    ),
                  ]
                : null,
          ),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Icon(
                Icons.bolt_rounded,
                size: 18,
                color: enabled
                    ? const Color(0xff7a5b00)
                    : const Color(0xff8f9088),
              ),
              const SizedBox(width: 6),
              Expanded(
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      context.l10n.buyNowUpper,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        color: enabled
                            ? const Color(0xff2f332d)
                            : const Color(0xff85877f),
                        fontSize: 10,
                        height: 1,
                        fontWeight: FontWeight.w900,
                        letterSpacing: 0,
                      ),
                    ),
                    const SizedBox(height: 3),
                    FittedBox(
                      fit: BoxFit.scaleDown,
                      alignment: Alignment.centerLeft,
                      child: Text(
                        price,
                        maxLines: 1,
                        style: TextStyle(
                          color: enabled
                              ? const Color(0xff2f332d)
                              : const Color(0xff85877f),
                          fontSize: 12,
                          height: 1,
                          fontWeight: FontWeight.w800,
                          letterSpacing: 0,
                        ),
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Updates only the countdown text, without rebuilding the image card or its
/// image once per second.
class _LiveRemainingLabel extends StatefulWidget {
  const _LiveRemainingLabel({required this.endsAt, required this.status});

  final DateTime endsAt;
  final String status;

  @override
  State<_LiveRemainingLabel> createState() => _LiveRemainingLabelState();
}

class _LiveRemainingLabelState extends State<_LiveRemainingLabel> {
  late final Timer _timer;

  @override
  void initState() {
    super.initState();
    _timer = Timer.periodic(const Duration(seconds: 1), (_) {
      if (mounted) setState(() {});
    });
  }

  @override
  void dispose() {
    _timer.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final remaining = widget.endsAt.difference(DateTime.now());
    final label = remaining.isNegative
        ? localizedStatus(widget.status, context.l10n)
        : context.l10n.remainingTime(_format(remaining));
    return Text(
      label,
      maxLines: 1,
      overflow: TextOverflow.ellipsis,
      style: const TextStyle(
        color: Color(0xff454842),
        fontSize: 11,
        fontWeight: FontWeight.w800,
        letterSpacing: 0.7,
      ),
    );
  }

  String _format(Duration remaining) {
    final hours = remaining.inHours.toString().padLeft(2, '0');
    final minutes = remaining.inMinutes
        .remainder(60)
        .toString()
        .padLeft(2, '0');
    final seconds = remaining.inSeconds
        .remainder(60)
        .toString()
        .padLeft(2, '0');
    return '$hours:$minutes:$seconds';
  }
}

class _BidPrice extends StatelessWidget {
  const _BidPrice({
    required this.label,
    required this.value,
    this.alignEnd = false,
  });

  final String label;
  final String value;
  final bool alignEnd;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: alignEnd
          ? CrossAxisAlignment.end
          : CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            color: Color(0xff5d5f59),
            fontSize: 10,
            fontWeight: FontWeight.w800,
            letterSpacing: 0.8,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: const TextStyle(
            color: Color(0xff242522),
            fontSize: 20,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _ReserveStatus extends StatelessWidget {
  const _ReserveStatus({required this.met});

  final bool met;

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Icon(
          met ? Icons.verified_outlined : Icons.lock_clock_outlined,
          size: 14,
          color: met ? const Color(0xff287264) : const Color(0xff8a6f19),
        ),
        const SizedBox(width: 5),
        Text(
          met ? context.l10n.reserveMet : context.l10n.reserveNotMet,
          style: TextStyle(
            color: met ? const Color(0xff287264) : const Color(0xff8a6f19),
            fontSize: 11,
            fontWeight: FontWeight.w800,
          ),
        ),
      ],
    );
  }
}

class _CategoryPill extends StatelessWidget {
  const _CategoryPill({required this.label});

  final String label;

  @override
  Widget build(BuildContext context) {
    return DecoratedBox(
      decoration: BoxDecoration(
        color: const Color(0xffe4e3d8),
        borderRadius: BorderRadius.circular(16),
      ),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 9, vertical: 5),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Icon(Icons.sell_outlined, size: 13, color: Color(0xff363a34)),
            const SizedBox(width: 4),
            Text(
              label,
              style: const TextStyle(
                color: Color(0xff363a34),
                fontSize: 11,
                fontWeight: FontWeight.w800,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

/// Bottom-sheet implementation based on placeabid.html.
class _PlaceBidSheet extends StatefulWidget {
  const _PlaceBidSheet({required this.product});
  final Product product;

  @override
  State<_PlaceBidSheet> createState() => _PlaceBidSheetState();
}

class _PlaceBidSheetState extends State<_PlaceBidSheet> {
  late final TextEditingController _controller;
  String? _error;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(
      text: (widget.product.nextBid / 100)
          .toStringAsFixed(2)
          .replaceAll('.', ','),
    )..addListener(() => setState(() => _error = null));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  int get _amount {
    final value = parseRon(_controller.text);
    return value == null ? 0 : (value * 100).round();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      top: false,
      child: Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.viewInsetsOf(context).bottom,
        ),
        child: Material(
          color: const Color(0xfffcfcfd),
          borderRadius: const BorderRadius.vertical(top: Radius.circular(28)),
          child: Padding(
            padding: const EdgeInsets.fromLTRB(20, 10, 20, 22),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 48,
                    height: 5,
                    decoration: BoxDecoration(
                      color: const Color(0xffc5c7c0),
                      borderRadius: BorderRadius.circular(99),
                    ),
                  ),
                ),
                const SizedBox(height: 18),
                Row(
                  children: [
                    Container(
                      width: 54,
                      height: 54,
                      decoration: BoxDecoration(
                        color: const Color(0xffe4e3d8),
                        borderRadius: BorderRadius.circular(10),
                      ),
                      child: const Icon(
                        Icons.image_outlined,
                        color: Color(0xff363a34),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            widget.product.title,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: const TextStyle(
                              color: Color(0xff363a34),
                              fontSize: 20,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 3),
                          Text(
                            context.l10n.currentBidAmount(
                              formatRon(widget.product.currentPrice),
                            ),
                            style: const TextStyle(color: Color(0xff454842)),
                          ),
                          if (widget.product.hasReserve)
                            Text(
                              widget.product.reserveMet
                                  ? context.l10n.reserveMet
                                  : context.l10n.reserveNotMet,
                              style: TextStyle(
                                color: widget.product.reserveMet
                                    ? const Color(0xff287264)
                                    : const Color(0xff8a6f19),
                                fontSize: 12,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                        ],
                      ),
                    ),
                    IconButton(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.close),
                    ),
                  ],
                ),
                const SizedBox(height: 22),
                Text(
                  context.l10n.yourMaxBidUpper,
                  style: const TextStyle(
                    color: Color(0xff454842),
                    fontSize: 12,
                    fontWeight: FontWeight.w800,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 8),
                TextField(
                  controller: _controller,
                  keyboardType: const TextInputType.numberWithOptions(
                    decimal: true,
                  ),
                  style: const TextStyle(
                    color: Color(0xff363a34),
                    fontSize: 25,
                    fontWeight: FontWeight.w700,
                  ),
                  decoration: InputDecoration(
                    prefixText: 'RON  ',
                    prefixStyle: const TextStyle(
                      color: Color(0xff454842),
                      fontSize: 15,
                      fontWeight: FontWeight.w700,
                    ),
                    filled: true,
                    fillColor: const Color(0xffeeeeef),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 15,
                    ),
                    border: OutlineInputBorder(
                      borderRadius: BorderRadius.circular(10),
                      borderSide: BorderSide.none,
                    ),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 6),
                  Text(
                    _error!,
                    style: const TextStyle(
                      color: Color(0xffba1a1a),
                      fontSize: 12,
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                Row(
                  children: [
                    for (final increment in [1000, 2500, 5000]) ...[
                      Expanded(
                        child: OutlinedButton(
                          onPressed: () => _add(increment),
                          style: OutlinedButton.styleFrom(
                            minimumSize: const Size.fromHeight(46),
                            padding: const EdgeInsets.symmetric(horizontal: 6),
                            side: const BorderSide(color: Color(0xff757872)),
                            foregroundColor: const Color(0xff363a34),
                          ),
                          child: FittedBox(
                            fit: BoxFit.scaleDown,
                            child: Text('+${formatRon(increment)}'),
                          ),
                        ),
                      ),
                      if (increment != 5000) const SizedBox(width: 8),
                    ],
                  ],
                ),
                const SizedBox(height: 16),
                Text(
                  context.l10n.proxyBidExplanation,
                  style: const TextStyle(
                    color: Color(0xff454842),
                    fontSize: 12,
                    height: 1.35,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xffe8e8e9),
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Column(
                    children: [
                      _BidSummaryRow(
                        label: context.l10n.minimumMaxBid,
                        value: formatRon(widget.product.nextBid),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 9),
                        child: Divider(height: 1, color: Color(0xffc5c7c0)),
                      ),
                      _BidSummaryRow(
                        label: context.l10n.yourMaxBid,
                        value: formatRon(_amount),
                        emphasized: true,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 18),
                FilledButton.icon(
                  onPressed: _submit,
                  style: FilledButton.styleFrom(
                    minimumSize: const Size.fromHeight(54),
                    backgroundColor: const Color(0xff4d514a),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(10),
                    ),
                  ),
                  icon: const Icon(Icons.arrow_forward, size: 18),
                  label: Text(
                    context.l10n.placeMaxBid,
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                Text(
                  context.l10n.bidTerms,
                  textAlign: TextAlign.center,
                  style: const TextStyle(
                    color: Color(0xff454842),
                    fontSize: 11,
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _add(int increment) {
    final base = _amount < widget.product.nextBid
        ? widget.product.nextBid
        : _amount;
    _controller.text = ((base + increment) / 100)
        .toStringAsFixed(2)
        .replaceAll('.', ',');
  }

  void _submit() {
    if (_amount < widget.product.nextBid) {
      setState(
        () => _error = context.l10n.minimumBidAmount(
          formatRon(widget.product.nextBid),
        ),
      );
      return;
    }
    Navigator.of(context).pop(_amount);
  }
}

class _BidSummaryRow extends StatelessWidget {
  const _BidSummaryRow({
    required this.label,
    required this.value,
    this.emphasized = false,
  });
  final String label;
  final String value;
  final bool emphasized;
  @override
  Widget build(BuildContext context) => Row(
    mainAxisAlignment: MainAxisAlignment.spaceBetween,
    children: [
      Text(
        label,
        style: TextStyle(
          color: const Color(0xff454842),
          fontWeight: emphasized ? FontWeight.w700 : FontWeight.w500,
        ),
      ),
      Text(
        value,
        style: TextStyle(
          color: const Color(0xff363a34),
          fontWeight: emphasized ? FontWeight.w800 : FontWeight.w600,
        ),
      ),
    ],
  );
}

class _MetricAction extends StatelessWidget {
  const _MetricAction({
    required this.icon,
    this.label,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String? label;
  final VoidCallback? onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: label ?? '',
      child: Semantics(
        button: true,
        enabled: onTap != null,
        label: label,
        child: GestureDetector(
          behavior: HitTestBehavior.opaque,
          onTap: onTap,
          child: SizedBox(
            width: 56,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Icon(
                  icon,
                  size: 25,
                  color: active ? const Color(0xffffd5dd) : Colors.white,
                  shadows: const [Shadow(color: Colors.black54, blurRadius: 8)],
                ),
                if (label != null)
                  Text(
                    label!,
                    style: const TextStyle(
                      color: Colors.white,
                      fontSize: 14,
                      fontWeight: FontWeight.w800,
                      height: 1,
                      shadows: [Shadow(color: Colors.black54, blurRadius: 8)],
                    ),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
