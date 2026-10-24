import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:intl/intl.dart';
import '../../shared/images/product_image.dart';
import '../../shared/models/product.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';
import '../../shared/widgets/app_logo.dart';
import 'commerce_flow.dart';
import 'commerce_models.dart';
import 'stripe_payments.dart';

const _ink = Color(0xff363a34);
const _muted = Color(0xff70746b);
const _line = Color(0xffe4e5df);
const _paper = Color(0xfff9f9fa);
const _teal = Color(0xff0f766e);

class CheckoutScreen extends ConsumerStatefulWidget {
  const CheckoutScreen({super.key, required this.orderId});
  final String orderId;
  @override
  ConsumerState<CheckoutScreen> createState() => _CheckoutScreenState();
}

class _CheckoutScreenState extends ConsumerState<CheckoutScreen>
    with WidgetsBindingObserver {
  CommerceOrder? _order;
  Product? _product;
  Map<String, dynamic>? _config, _account;
  bool _loading = true, _busy = false, _refreshing = false, _foreground = true;
  String? _error, _notice;
  Timer? _timer;
  bool _redirected = false;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _timer = Timer.periodic(const Duration(seconds: 10), (_) {
      if (_foreground && !_busy && _order?.status == 'awaiting_payment') {
        _load(quiet: true);
      }
    });
  }

  @override
  void dispose() {
    _timer?.cancel();
    WidgetsBinding.instance.removeObserver(this);
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    _foreground = state == AppLifecycleState.resumed;
    if (_foreground && !_busy) _load(quiet: true);
  }

  Future<void> _load({bool quiet = false}) async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final api = ref.read(apiClientProvider);
      final rows = await Future.wait([
        api.commerceGet('config'),
        api.commerceGet('me'),
        api.commerceGet('orders/${widget.orderId}'),
      ]);
      final wasAwaitingPayment = _order?.status == 'awaiting_payment';
      final order = CommerceOrder.fromJson(rows[2]);
      Product? product = _product;
      if (product == null || product.id != order.productId) {
        try {
          product = await api.product(order.productId);
        } catch (_) {
          /* A missing photo must not block payment. */
        }
      }
      if (!mounted) return;
      setState(() {
        _config = rows[0];
        _account = rows[1];
        _order = order;
        _product = product;
        if (!quiet) _error = null;
      });
      if (wasAwaitingPayment) _goToPurchases(order);
    } catch (error) {
      if (mounted && !quiet) setState(() => _error = commerceError(error));
    } finally {
      _refreshing = false;
      if (mounted) setState(() => _loading = false);
    }
  }

  bool get _verified =>
      (_account?['identity'] as Map?)?['status'] == 'verified';
  int get _minimum => (_config?['minimumOrderPayment'] as num? ?? 300).toInt();
  bool get _belowMinimum =>
      _order != null && _order!.amountDue > 0 && _order!.amountDue < _minimum;
  bool get _paid =>
      _order != null &&
      [
        'paid',
        'shipped',
        'delivered',
        'transfer_pending',
        'completed',
      ].contains(_order!.status);
  bool get _buyer =>
      _order?.buyerId == ref.read(sessionControllerProvider).user?.id;
  void _goToPurchases(CommerceOrder order) {
    if (_redirected ||
        !mounted ||
        order.buyerId != ref.read(sessionControllerProvider).user?.id ||
        ![
          'paid',
          'shipped',
          'delivered',
          'transfer_pending',
          'completed',
        ].contains(order.status)) {
      return;
    }
    _redirected = true;
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (mounted) context.go('/activity?filter=wins&purchase=${order.id}');
    });
  }

  Future<void> _pay() async {
    if (_busy || _belowMinimum || !_buyer || _order?.canPay != true) return;
    setState(() {
      _busy = true;
      _error = null;
      _notice = null;
    });
    try {
      final payments = ref.read(stripePaymentsProvider);
      await payments.configure();
      final data = await ref
          .read(apiClientProvider)
          .commercePost('orders/${widget.orderId}/payment');
      if (data['clientSecret'] is String) {
        final completed = await payments.present(
          data['clientSecret'] as String,
        );
        if (!completed) {
          if (mounted) {
            setState(
              () => _notice =
                  'Ai închis formularul de plată. Poți verifica starea comenzii și relua plata.',
            );
          }
          return;
        }
      }
      // Only canonical server state confirms the purchase, never the sheet callback.
      final order = CommerceOrder.fromJson(
        await ref
            .read(apiClientProvider)
            .commerceGet('orders/${widget.orderId}'),
      );
      if (mounted) {
        _goToPurchases(order);
        setState(() {
          _order = order;
          if (order.status == 'awaiting_payment') {
            _notice =
                'Plata este în curs de confirmare. Comanda se actualizează automat.';
          }
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = commerceError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Widget _panel(Widget child) => Container(
    padding: const EdgeInsets.all(20),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: _line),
    ),
    child: child,
  );
  Widget _row(String title, String amount, {bool accent = false}) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 7),
    child: Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(color: accent ? _teal : _muted, fontSize: 13),
          ),
        ),
        Text(
          amount,
          style: TextStyle(
            fontWeight: FontWeight.w600,
            color: accent ? _teal : _ink,
            fontSize: 14,
          ),
        ),
      ],
    ),
  );
  Widget _message(String text, {bool error = false}) => Container(
    margin: const EdgeInsets.only(top: 16),
    padding: const EdgeInsets.all(16),
    decoration: BoxDecoration(
      color: error ? const Color(0xffffefec) : const Color(0xffeaf4f0),
      borderRadius: BorderRadius.circular(16),
    ),
    child: Row(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Icon(
          error ? Icons.info_outline : Icons.check_circle_outline,
          size: 20,
          color: error ? const Color(0xff9b382d) : _teal,
        ),
        const SizedBox(width: 10),
        Expanded(
          child: Text(
            text,
            style: TextStyle(
              fontSize: 12,
              height: 1.5,
              color: error ? const Color(0xff9b382d) : _teal,
            ),
          ),
        ),
      ],
    ),
  );
  @override
  Widget build(BuildContext context) {
    final order = _order;
    final theme = ThemeData(
      scaffoldBackgroundColor: _paper,
      colorScheme: const ColorScheme.light(
        primary: _ink,
        secondary: _teal,
        surface: Colors.white,
        onSurface: _ink,
      ),
      textTheme: GoogleFonts.montserratTextTheme(
        ThemeData.light().textTheme,
      ).apply(bodyColor: _ink, displayColor: _ink),
      useMaterial3: true,
    );
    return Theme(
      data: theme,
      child: Scaffold(
        appBar: AppBar(
          backgroundColor: _paper,
          surfaceTintColor: Colors.transparent,
          centerTitle: true,
          title: const AppLogo(width: 118),
          leading: IconButton(
            icon: const Icon(Icons.arrow_back_rounded),
            tooltip: 'Înapoi',
            onPressed: _busy
                ? null
                : () {
                    if (context.canPop()) {
                      context.pop();
                    } else {
                      context.go('/commerce');
                    }
                  },
          ),
          actions: [
            IconButton(
              onPressed: _busy ? null : _load,
              tooltip: 'Actualizează comanda',
              icon: const Icon(Icons.refresh_rounded, size: 21),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: _ink))
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.fromLTRB(22, 16, 22, 28),
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            _paid ? 'Comanda ta' : 'Finalizează\ncumpărarea',
                            style: const TextStyle(
                              fontSize: 29,
                              height: 1.16,
                              fontWeight: FontWeight.w700,
                              letterSpacing: -1,
                            ),
                          ),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(
                            horizontal: 11,
                            vertical: 7,
                          ),
                          decoration: BoxDecoration(
                            color: const Color(0xffe9eeea),
                            borderRadius: BorderRadius.circular(30),
                          ),
                          child: const Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Icon(
                                Icons.lock_outline_rounded,
                                size: 12,
                                color: _teal,
                              ),
                              SizedBox(width: 4),
                              Text(
                                'SECURIZAT',
                                style: TextStyle(
                                  fontSize: 8,
                                  letterSpacing: .7,
                                  fontWeight: FontWeight.w700,
                                  color: _teal,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),
                    Text(
                      _paid
                          ? 'Plata a fost confirmată. Urmărește livrarea din comenzile tale.'
                          : 'Încă un pas și produsul este al tău.',
                      style: const TextStyle(
                        color: _muted,
                        fontSize: 12,
                        height: 1.6,
                      ),
                    ),
                    if (_config?['mode'] == 'test')
                      Padding(
                        padding: const EdgeInsets.only(top: 14),
                        child: Row(
                          children: [
                            Container(
                              width: 6,
                              height: 6,
                              decoration: const BoxDecoration(
                                color: _teal,
                                shape: BoxShape.circle,
                              ),
                            ),
                            const SizedBox(width: 7),
                            const Text(
                              'Mod de test · fără bani reali',
                              style: TextStyle(fontSize: 10, color: _muted),
                            ),
                          ],
                        ),
                      ),
                    if (_error != null) _message(_error!, error: true),
                    if (_notice != null) _message(_notice!),
                    const SizedBox(height: 22),
                    if (order != null) ...[
                      _panel(
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(14),
                              child: SizedBox(
                                width: 86,
                                height: 100,
                                child: _product?.imageUrl.isNotEmpty == true
                                    ? ProductImage(
                                        url: _product!.imageForWidth(320),
                                      )
                                    : const ColoredBox(
                                        color: Color(0xffeeeee9),
                                        child: Icon(
                                          Icons.image_outlined,
                                          color: _muted,
                                        ),
                                      ),
                              ),
                            ),
                            const SizedBox(width: 16),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _product?.category?.name ?? 'PRODUSUL TĂU',
                                    style: const TextStyle(
                                      fontSize: 9,
                                      color: _muted,
                                      letterSpacing: 1,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  const SizedBox(height: 7),
                                  Text(
                                    order.title,
                                    style: const TextStyle(
                                      fontSize: 17,
                                      fontWeight: FontWeight.w700,
                                      height: 1.3,
                                    ),
                                  ),
                                  if (_product?.seller != null)
                                    Padding(
                                      padding: const EdgeInsets.only(top: 7),
                                      child: Text(
                                        'Vândut de ${_product!.seller!.name}',
                                        style: const TextStyle(
                                          fontSize: 10,
                                          color: _muted,
                                        ),
                                      ),
                                    ),
                                  const SizedBox(height: 10),
                                  Text(
                                    formatRon(order.amount),
                                    style: const TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w700,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      _panel(
                        Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Sumarul comenzii',
                              style: TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 12),
                            _row('Preț produs', formatRon(order.amount)),
                            if (order.depositCredit > 0)
                              _row(
                                'Garanție achitată',
                                '− ${formatRon(order.depositCredit)}',
                                accent: true,
                              ),
                            const Padding(
                              padding: EdgeInsets.symmetric(vertical: 9),
                              child: Divider(height: 1, color: _line),
                            ),
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    _paid
                                        ? order.amountDue == 0
                                              ? 'Acoperit din garanție'
                                              : 'Achitat prin card'
                                        : 'Total de plată',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                Expanded(
                                  flex: 2,
                                  child: FittedBox(
                                    fit: BoxFit.scaleDown,
                                    alignment: Alignment.centerRight,
                                    child: Text(
                                      formatRon(order.amountDue),
                                      style: const TextStyle(
                                        fontSize: 23,
                                        fontWeight: FontWeight.w700,
                                        letterSpacing: -.8,
                                      ),
                                    ),
                                  ),
                                ),
                              ],
                            ),
                            if (order.canPay && order.paymentDeadline != null)
                              Padding(
                                padding: const EdgeInsets.only(top: 12),
                                child: Text(
                                  'Rezervat până la ${DateFormat('dd.MM, HH:mm').format(order.paymentDeadline!.toLocal())}',
                                  style: const TextStyle(
                                    fontSize: 10,
                                    color: _muted,
                                  ),
                                ),
                              ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                      _panel(
                        Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Icon(
                              Icons.credit_card_rounded,
                              color: _ink,
                              size: 24,
                            ),
                            SizedBox(width: 13),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    'Plată cu cardul',
                                    style: TextStyle(
                                      fontSize: 14,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                  SizedBox(height: 5),
                                  Text(
                                    _paid
                                        ? 'Plata a fost procesată în siguranță prin Stripe.'
                                        : 'Adaugi cardul în pasul următor, în formularul securizat Stripe.',
                                    style: TextStyle(
                                      fontSize: 11,
                                      color: _muted,
                                      height: 1.6,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            Icon(
                              Icons.lock_outline_rounded,
                              color: _muted,
                              size: 16,
                            ),
                          ],
                        ),
                      ),
                      if (_belowMinimum && order.canPay)
                        _message(
                          'Suma acestei rezervări este sub minimul de ${formatRon(_minimum)} acceptat de aplicație. Nu poate fi plătită cu cardul. Contactează suportul pentru corectarea anunțului de test.',
                          error: true,
                        ),
                      if (_config?['ready'] != true)
                        _message(
                          'Plata nu este disponibilă momentan. Poți reveni la această comandă fără să pierzi rezervarea înainte de termen.',
                          error: true,
                        ),
                      if (!_verified && order.canPay)
                        Padding(
                          padding: const EdgeInsets.only(top: 16),
                          child: _panel(
                            Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'Verifică identitatea pentru a continua',
                                  style: TextStyle(fontWeight: FontWeight.w600),
                                ),
                                const SizedBox(height: 8),
                                const Text(
                                  'Verificarea se face o singură dată, în siguranță prin Stripe.',
                                  style: TextStyle(color: _muted, fontSize: 12),
                                ),
                                TextButton(
                                  onPressed: () => context.push('/commerce'),
                                  child: const Text('Verifică identitatea'),
                                ),
                              ],
                            ),
                          ),
                        ),
                      if (_paid)
                        _message(
                          order.status == 'paid'
                              ? 'Plată confirmată'
                              : 'Plată confirmată · ${order.label}',
                        ),
                      if (!order.canPay && !_paid) _message(order.label),
                      const SizedBox(height: 22),
                      const Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Icon(
                            Icons.verified_user_outlined,
                            color: _teal,
                            size: 19,
                          ),
                          SizedBox(width: 10),
                          Expanded(
                            child: Text(
                              'Încasarea vânzătorului se eliberează după confirmarea primirii și termenul de verificare. Poți raporta o problemă din comandă.',
                              style: TextStyle(
                                color: _muted,
                                fontSize: 10,
                                height: 1.7,
                              ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ],
                ),
              ),
        bottomNavigationBar: order == null
            ? null
            : DecoratedBox(
                decoration: const BoxDecoration(
                  color: Colors.white,
                  border: Border(top: BorderSide(color: _line)),
                ),
                child: SafeArea(
                  top: false,
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(22, 16, 22, 12),
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        SizedBox(
                          width: double.infinity,
                          height: 56,
                          child: FilledButton(
                            style: FilledButton.styleFrom(
                              backgroundColor: _ink,
                              foregroundColor: Colors.white,
                              disabledBackgroundColor: const Color(0xffe7e8e3),
                              disabledForegroundColor: _muted,
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            onPressed: _busy
                                ? null
                                : _paid
                                ? () => context.go(
                                    '/activity?filter=wins&purchase=${order.id}',
                                  )
                                : order.canPay &&
                                      _buyer &&
                                      !_belowMinimum &&
                                      _verified &&
                                      _config?['ready'] == true
                                ? _pay
                                : null,
                            child: _busy
                                ? const SizedBox(
                                    width: 21,
                                    height: 21,
                                    child: CircularProgressIndicator(
                                      strokeWidth: 2,
                                      color: _muted,
                                    ),
                                  )
                                : Row(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      Icon(
                                        _paid
                                            ? Icons.check_rounded
                                            : Icons.lock_outline_rounded,
                                        size: 18,
                                      ),
                                      const SizedBox(width: 10),
                                      Flexible(
                                        child: Text(
                                          _paid
                                              ? 'Vezi comenzile tale'
                                              : order.amountDue == 0
                                              ? 'Confirmă plata din garanție'
                                              : 'Plătește ${formatRon(order.amountDue)}',
                                          style: const TextStyle(
                                            fontSize: 14,
                                            fontWeight: FontWeight.w600,
                                          ),
                                        ),
                                      ),
                                    ],
                                  ),
                          ),
                        ),
                        const SizedBox(height: 10),
                        const Text(
                          'Plată procesată în siguranță de Stripe',
                          style: TextStyle(fontSize: 9, color: _muted),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
      ),
    );
  }
}
