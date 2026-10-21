import 'dart:async';
import 'dart:ui';

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:video_player/video_player.dart';

import '../../../shared/config/app_config.dart';
import '../../../shared/models/bid.dart';
import '../../../shared/models/product.dart';
import '../../../shared/navigation/app_route_observer.dart';
import '../../../shared/state/session_controller.dart';
import '../../../shared/utils/money.dart';

class AuctionVideoCard extends ConsumerStatefulWidget {
  const AuctionVideoCard({
    super.key,
    required this.product,
    required this.onOpenDetails,
    this.onFavoriteChanged,
  });

  final Product product;
  final VoidCallback onOpenDetails;
  final ValueChanged<Product>? onFavoriteChanged;

  @override
  ConsumerState<AuctionVideoCard> createState() => _AuctionVideoCardState();
}

class _AuctionVideoCardState extends ConsumerState<AuctionVideoCard>
    with RouteAware {
  late Product _product;
  VideoPlayerController? _video;
  io.Socket? _socket;
  List<Bid> _bids = [];
  String? _message;
  ModalRoute<dynamic>? _route;

  @override
  void initState() {
    super.initState();
    _product = widget.product;
    _initVideo();
    _connectSocket();
  }

  @override
  void didUpdateWidget(covariant AuctionVideoCard oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.product.id != widget.product.id) {
      _socket?.dispose();
      _video?.dispose();
      _product = widget.product;
      _bids = [];
      _message = null;
      _initVideo();
      _connectSocket();
    } else if (oldWidget.product.isFavorite != widget.product.isFavorite) {
      _product = _product.copyWith(isFavorite: widget.product.isFavorite);
    }
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
    _video?.pause();
  }

  @override
  void didPopNext() {
    _resumeVideo();
  }

  @override
  void dispose() {
    appRouteObserver.unsubscribe(this);
    _socket?.emit('auction:leave', {'productId': _product.id});
    _socket?.dispose();
    _video?.dispose();
    super.dispose();
  }

  Future<void> _resumeVideo() async {
    final video = _video;
    if (video == null || !video.value.isInitialized) return;
    try {
      await video.play();
      if (mounted) setState(() {});
    } catch (_) {
      // The regular video initialization path already surfaces playback errors.
    }
  }

  @override
  Widget build(BuildContext context) {
    final video = _video;
    final initialized = video?.value.isInitialized == true;

    return Stack(
      fit: StackFit.expand,
      children: [
        if (initialized)
          FittedBox(
            fit: BoxFit.cover,
            child: SizedBox(
              width: video!.value.size.width,
              height: video.value.size.height,
              child: VideoPlayer(video),
            ),
          )
        else
          Container(
            color: Colors.black,
            child: const Center(
              child: CircularProgressIndicator(color: Color(0xffe4e3d8)),
            ),
          ),
        const _VideoGradient(),
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
            child: _AuctionInfoPanel(
              product: _product,
              message: _message,
              onBid: _product.isActive ? _openBidSheet : null,
              onBuyNow: _product.canBuyNow ? _buyNow : null,
            ),
          ),
        ),
        Positioned(
          right: 16,
          bottom: 270,
          child: SafeArea(
            top: false,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                _MetricAction(
                  icon: _product.isFavorite
                      ? Icons.favorite
                      : Icons.favorite_border,
                  label: _compactCount(_product.favoriteCount),
                  active: _product.isFavorite,
                  onTap: _toggleFavorite,
                ),
                const SizedBox(height: 20),
                _MetricAction(
                  icon: Icons.share_outlined,
                  onTap: () =>
                      setState(() => _message = 'Share va fi adaugat curand.'),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Future<void> _initVideo() async {
    final uri = Uri.tryParse(_product.videoUrl);
    if (uri == null) return;
    final controller = VideoPlayerController.networkUrl(uri);
    _video = controller;
    try {
      await controller.initialize();
      await controller.setLooping(true);
      await controller.play();
      if (mounted) setState(() {});
    } catch (_) {
      if (mounted) setState(() => _message = 'Video-ul nu poate fi incarcat.');
    }
  }

  void _connectSocket() {
    final socket = io.io(
      AppConfig.apiBaseUrl,
      io.OptionBuilder()
          .setTransports(['websocket'])
          .disableAutoConnect()
          .build(),
    );
    _socket = socket;
    socket.onConnect(
      (_) => socket.emit('auction:join', {'productId': _product.id}),
    );
    socket.on('auction:update', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      if (map['product'] is Map) {
        setState(
          () => _product = Product.fromJson(
            Map<String, dynamic>.from(map['product']),
          ).copyWith(isFavorite: _product.isFavorite),
        );
      }
      if (map['bids'] is List) {
        setState(() {
          _bids = (map['bids'] as List)
              .whereType<Map>()
              .map((item) => Bid.fromJson(Map<String, dynamic>.from(item)))
              .toList();
        });
      }
    });
    socket.on('bid:new', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      if (map['product'] is Map) {
        _product = Product.fromJson(
          Map<String, dynamic>.from(map['product']),
        ).copyWith(isFavorite: _product.isFavorite);
      }
      if (map['bid'] is Map) {
        _bids = [
          Bid.fromJson(Map<String, dynamic>.from(map['bid'])),
          ..._bids.take(4),
        ];
      }
      if (mounted) setState(() => _message = 'Oferta noua primita live.');
    });
    socket.on('auction:extended', (_) {
      if (mounted) setState(() => _message = 'Licitatia a fost prelungita.');
    });
    socket.on('auction:closed', (data) {
      final map = Map<String, dynamic>.from(data as Map);
      if (map['product'] is Map && mounted) {
        setState(
          () => _product = Product.fromJson(
            Map<String, dynamic>.from(map['product']),
          ).copyWith(isFavorite: _product.isFavorite),
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

  Future<void> _placeBid(int amount) async {
    try {
      final product = await ref
          .read(apiClientProvider)
          .placeBid(_product.id, amount);
      setState(() {
        _product = product.copyWith(isFavorite: _product.isFavorite);
        _message = 'Oferta trimisa.';
      });
    } on DioException catch (error) {
      setState(() => _message = _messageFrom(error));
    }
  }

  Future<void> _buyNow() async {
    try {
      final product = await ref.read(apiClientProvider).buyNow(_product.id);
      setState(() {
        _product = product.copyWith(isFavorite: _product.isFavorite);
        _message = 'Produs rezervat. Sellerul va vedea contactul tau.';
      });
    } on DioException catch (error) {
      setState(() => _message = _messageFrom(error));
    }
  }

  Future<void> _toggleFavorite() async {
    final next = !_product.isFavorite;
    setState(() {
      _product = _product.copyWith(
        isFavorite: next,
        favoriteCount: next
            ? _product.favoriteCount + 1
            : _product.favoriteCount > 0
            ? _product.favoriteCount - 1
            : 0,
      );
      _message = next ? 'Adaugat la favorite.' : 'Scos de la favorite.';
    });
    widget.onFavoriteChanged?.call(_product);

    try {
      if (next) {
        final product = await ref
            .read(apiClientProvider)
            .addFavorite(_product.id);
        if (!mounted) return;
        setState(() => _product = product.copyWith(isFavorite: true));
        widget.onFavoriteChanged?.call(_product);
      } else {
        await ref.read(apiClientProvider).removeFavorite(_product.id);
      }
    } on DioException catch (error) {
      if (!mounted) return;
      setState(() {
        _product = _product.copyWith(isFavorite: !next);
        _message = _messageFrom(error);
      });
      widget.onFavoriteChanged?.call(_product);
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

  String _messageFrom(DioException error) {
    final data = error.response?.data;
    if (data is Map && data['message'] != null) {
      return data['message'].toString();
    }
    return error.message ?? 'Actiunea a esuat.';
  }
}

class _VideoGradient extends StatelessWidget {
  const _VideoGradient();

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
  });

  final Product product;
  final String? message;
  final VoidCallback? onBid;
  final VoidCallback? onBuyNow;

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
                  if (product.category != null)
                    _CategoryPill(label: product.category!.name),
                ],
              ),
              const SizedBox(height: 8),
              Text(
                product.title,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: const TextStyle(
                  color: Color(0xff242522),
                  fontSize: 25,
                  height: 1.15,
                  fontWeight: FontWeight.w800,
                ),
              ),
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
                      label: 'CURRENT BID',
                      value: formatRon(product.currentPrice),
                    ),
                  ),
                  Expanded(
                    child: _BidPrice(
                      label: 'MIN MAX BID',
                      value: formatRon(product.nextBid),
                      alignEnd: true,
                    ),
                  ),
                ],
              ),
              if (product.hasReserve) ...[
                const SizedBox(height: 8),
                _ReserveStatus(met: product.reserveMet),
              ],
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
              const SizedBox(height: 16),
              Row(
                children: [
                  Expanded(
                    child: FilledButton(
                      onPressed: onBid,
                      style: FilledButton.styleFrom(
                        minimumSize: const Size.fromHeight(46),
                        backgroundColor: const Color(0xff363a34),
                        foregroundColor: Colors.white,
                        textStyle: const TextStyle(
                          fontSize: 13,
                          fontWeight: FontWeight.w800,
                        ),
                      ),
                      child: Text('MAX BID ${formatRon(product.nextBid)}'),
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
                      'BUY NOW',
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

/// Updates only the countdown text, without rebuilding the video card or its
/// video player once per second.
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
        ? widget.status.toUpperCase()
        : '${_format(remaining)} REMAINING';
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
          met ? 'Reserve met' : 'Reserve not met',
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
      text: (widget.product.nextBid / 100).toStringAsFixed(2),
    )..addListener(() => setState(() => _error = null));
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  int get _amount {
    final value = double.tryParse(_controller.text.replaceAll(',', '.'));
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
                        Icons.play_circle_outline,
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
                            'Current bid: ${formatRon(widget.product.currentPrice)}',
                            style: const TextStyle(color: Color(0xff454842)),
                          ),
                          if (widget.product.hasReserve)
                            Text(
                              widget.product.reserveMet
                                  ? 'Reserve met'
                                  : 'Reserve not met',
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
                const Text(
                  'YOUR MAX BID',
                  style: TextStyle(
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
                const Text(
                  'We only bid enough to keep you winning. Your maximum stays private unless another bidder pushes the auction up.',
                  style: TextStyle(
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
                        label: 'Minimum max bid',
                        value: formatRon(widget.product.nextBid),
                      ),
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 9),
                        child: Divider(height: 1, color: Color(0xffc5c7c0)),
                      ),
                      _BidSummaryRow(
                        label: 'Your max bid',
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
                  label: const Text(
                    'PLACE MAX BID',
                    style: TextStyle(
                      fontWeight: FontWeight.w800,
                      letterSpacing: 0.8,
                    ),
                  ),
                ),
                const SizedBox(height: 10),
                const Text(
                  'By placing a bid, you agree to our Terms of Auction.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Color(0xff454842), fontSize: 11),
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
    _controller.text = ((base + increment) / 100).toStringAsFixed(2);
  }

  void _submit() {
    if (_amount < widget.product.nextBid) {
      setState(
        () => _error = 'Minimum bid is ${formatRon(widget.product.nextBid)}.',
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
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: label ?? '',
      child: Semantics(
        button: true,
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
