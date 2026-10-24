import 'package:go_router/go_router.dart';
import '../../shared/models/product.dart';
import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:intl/intl.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';
import 'commerce_flow.dart';
import 'commerce_models.dart';
import 'package:google_fonts/google_fonts.dart';

class CommerceScreen extends ConsumerStatefulWidget {
  const CommerceScreen({super.key, this.orderId});
  final String? orderId;
  @override
  ConsumerState<CommerceScreen> createState() => _CommerceScreenState();
}

class _CommerceScreenState extends ConsumerState<CommerceScreen>
    with WidgetsBindingObserver {
  Map<String, dynamic>? _config, _account;
  List<CommerceOrder> _orders = [];
  List<Product> _legacyListings = [];
  List<Map<String, dynamic>> _deposits = [];
  bool _busy = false, _loading = true;
  bool _refreshing = false, _foreground = true, _refreshAfterAction = false;
  String? _error;
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (_foreground &&
          !_busy &&
          !_loading &&
          (_orders.any((order) => order.status == 'awaiting_payment') ||
              (_config?['enabled'] == true &&
                  (_account?['identity'] as Map?)?['status'] != 'verified') ||
              _deposits.any(
                (row) =>
                    ['pending', 'paid', 'allocated'].contains(row['status']),
              ))) {
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
    if (_foreground) {
      if (_busy) {
        _refreshAfterAction = true;
      } else {
        _load(quiet: true);
      }
    }
  }

  Future<void> _load({bool quiet = false}) async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final api = ref.read(apiClientProvider);
      final config = await api.commerceGet('config');
      final account = await api.commerceGet('me');
      if (widget.orderId != null && config['enabled'] == true) {
        await api.commerceGet('orders/${widget.orderId}');
      }
      final orders = await api.commerceList('orders');
      final deposits = await api.commerceList('deposits');
      final products = ref.read(sessionControllerProvider).user != null
          ? await api.myProducts()
          : <Product>[];
      if (!mounted) return;
      setState(() {
        _config = config;
        _account = account;
        _orders = orders.map(CommerceOrder.fromJson).toList();
        _deposits = deposits;
        _legacyListings = products
            .where(
              (product) => product.commerceVersion != 1 && product.isActive,
            )
            .toList();
        if (!quiet) _error = null;
      });
    } catch (error) {
      if (mounted && !quiet) setState(() => _error = commerceError(error));
    } finally {
      _refreshing = false;
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _run(Future<void> Function() action) async {
    if (_busy) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await action();
      if (mounted) await _load();
    } catch (error) {
      if (mounted) setState(() => _error = commerceError(error));
    } finally {
      if (mounted) {
        setState(() => _busy = false);
        if (_refreshAfterAction) {
          _refreshAfterAction = false;
          await _load(quiet: true);
        }
      }
    }
  }

  Future<void> _hosted(String endpoint) => _run(() async {
    final data = await ref.read(apiClientProvider).commercePost(endpoint);
    if (data['url'] is! String) return;
    final url = Uri.parse(data['url'] as String);
    // Only links created by our authenticated Stripe endpoints are opened.
    if (url.scheme != 'https' ||
        !(url.host == 'stripe.com' || url.host.endsWith('.stripe.com'))) {
      throw StateError('Link Stripe invalid.');
    }
    if (!await launchUrl(url, mode: LaunchMode.externalApplication)) {
      throw StateError('Nu putem deschide pagina Stripe.');
    }
  });
  Future<bool> _confirm(String title, String content) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: Text(title),
          content: Text(content),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Renunță'),
            ),
            FilledButton(
              onPressed: () => Navigator.pop(context, true),
              child: const Text('Confirmă'),
            ),
          ],
        ),
      ) ??
      false;
  Future<void> _receipt(CommerceOrder order) async {
    if (!await _confirm(
      'Ai primit produsul?',
      'Confirmă doar după ce ai primit și verificat produsul. Confirmarea începe intervalul după care vânzătorul poate primi banii.',
    )) {
      return;
    }
    await _run(() async {
      await ref
          .read(apiClientProvider)
          .commercePost('orders/${order.id}/receipt');
    });
  }

  Future<void> _issue(CommerceOrder order) async {
    final code = await showDialog<String>(
      context: context,
      builder: (context) => SimpleDialog(
        title: const Text('Raportează o problemă'),
        children: [
          for (final entry in {
            'not_received': 'Nu am primit produsul',
            'not_as_described': 'Nu corespunde descrierii',
            'damaged': 'Produs deteriorat',
            'other': 'Altă problemă',
          }.entries)
            SimpleDialogOption(
              onPressed: () => Navigator.pop(context, entry.key),
              child: Text(entry.value),
            ),
        ],
      ),
    );
    if (code == null) return;
    await _run(() async {
      await ref.read(apiClientProvider).commercePost(
        'orders/${order.id}/issues',
        {'code': code},
      );
    });
  }

  Future<void> _ship(CommerceOrder order) async {
    final carrier = TextEditingController(), tracking = TextEditingController();
    final result = await showDialog<Map<String, dynamic>>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Înregistrează expedierea'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: carrier,
              maxLength: 50,
              decoration: const InputDecoration(labelText: 'Curier'),
            ),
            TextField(
              controller: tracking,
              maxLength: 100,
              decoration: const InputDecoration(labelText: 'Număr de urmărire'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Renunță'),
          ),
          FilledButton(
            onPressed: () {
              if (carrier.text.trim().length >= 2 &&
                  tracking.text.trim().length >= 3) {
                Navigator.pop(context, {
                  'carrier': carrier.text.trim(),
                  'trackingCode': tracking.text.trim(),
                });
              }
            },
            child: const Text('Salvează'),
          ),
        ],
      ),
    );
    // Dialog routes may still be animating; dispose controllers after the route leaves.
    Future<void>.delayed(const Duration(seconds: 1), () {
      carrier.dispose();
      tracking.dispose();
    });
    if (result != null) {
      await _run(() async {
        await ref
            .read(apiClientProvider)
            .commercePost('orders/${order.id}/shipment', result);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionControllerProvider).user;
    final identity = (_account?['identity'] as Map?)?['status'] ?? 'unverified';
    final seller = _account?['sellerPayments'] as Map? ?? {};
    final theme = ThemeData(
      colorScheme: const ColorScheme.light(
        primary: Color(0xff363a34),
        secondary: Color(0xff0f766e),
        surface: Colors.white,
        onSurface: Color(0xff363a34),
      ),
      scaffoldBackgroundColor: const Color(0xfff9f9fa),
      textTheme: GoogleFonts.montserratTextTheme(ThemeData.light().textTheme)
          .apply(
            bodyColor: const Color(0xff363a34),
            displayColor: const Color(0xff363a34),
          ),
      cardTheme: CardThemeData(
        elevation: 0,
        color: Colors.white,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(20),
          side: const BorderSide(color: Color(0xffe4e5df)),
        ),
      ),
      useMaterial3: true,
    );
    return Theme(
      data: theme,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Plăți și comenzi'),
          backgroundColor: const Color(0xfff9f9fa),
          surfaceTintColor: Colors.transparent,
          actions: [
            IconButton(
              onPressed: _busy ? null : _load,
              icon: const Icon(Icons.refresh),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  padding: const EdgeInsets.all(20),
                  children: [
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          _error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                      ),
                    if (_config?['ready'] != true)
                      const Card(
                        child: Padding(
                          padding: EdgeInsets.all(16),
                          child: Text(
                            'Plățile nu sunt încă activate pe server. Comenzile existente sunt păstrate.',
                          ),
                        ),
                      ),
                    Card(
                      child: Padding(
                        padding: const EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text(
                              'Identitatea ta',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(switch (identity) {
                              'verified' => 'Verificată',
                              'processing' => 'Stripe verifică documentele',
                              'requires_input' => 'Verificare de completat',
                              _ => 'Neverificată',
                            }),
                            if (identity != 'verified')
                              FilledButton(
                                onPressed: _busy || _config?['enabled'] != true
                                    ? null
                                    : () => _hosted('identity/session'),
                                child: const Text('Verifică prin Stripe'),
                              ),
                            const Text(
                              'Actul și selfie-ul sunt transmise direct către Stripe. Pinbind păstrează rezultatul verificării.',
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (user != null)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              const Text(
                                'Încasările tale',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                seller['transfersEnabled'] == true &&
                                        seller['payoutsEnabled'] == true
                                    ? 'Cont pregătit pentru încasări'
                                    : 'Configurează contul Stripe și datele bancare',
                              ),
                              FilledButton(
                                onPressed: _busy || _config?['enabled'] != true
                                    ? null
                                    : () => context.push('/payment-methods'),
                                child: const Text('Gestionează încasările'),
                              ),
                            ],
                          ),
                        ),
                      ),
                    const SizedBox(height: 16),
                    const Text(
                      'Comenzile tale',
                      style: TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                      ),
                    ),
                    if (_legacyListings.isNotEmpty) ...[
                      const Text(
                        'Anunțuri vechi',
                        style: TextStyle(
                          fontSize: 20,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Text(
                        'Poți activa Stripe doar înainte să existe oferte. Activarea introduce garanția de 10% pentru participanți și plata produsului în aplicație.',
                      ),
                      for (final product in _legacyListings)
                        ListTile(
                          title: Text(product.title),
                          trailing: TextButton(
                            onPressed: _busy || _config?['ready'] != true
                                ? null
                                : () async {
                                    if (!await _confirm(
                                      'Activezi plata Stripe?',
                                      'Se aplică garanția de 10% și plata prin Stripe pentru acest anunț. Anunțurile cu oferte existente necesită revizuire.',
                                    )) {
                                      return;
                                    }
                                    await _run(() async {
                                      await ref
                                          .read(apiClientProvider)
                                          .commercePost(
                                            'products/${product.id}/activate',
                                          );
                                    });
                                  },
                            child: const Text('Activează Stripe'),
                          ),
                        ),
                    ],
                    if (_orders.isEmpty)
                      const Padding(
                        padding: EdgeInsets.symmetric(vertical: 16),
                        child: Text(
                          'Nu ai comenzi Stripe. Comenzile apar după cumpărare sau câștigarea unei licitații compatibile.',
                        ),
                      ),
                    for (final order in _orders)
                      Card(
                        shape: order.id == widget.orderId
                            ? RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(12),
                                side: const BorderSide(
                                  color: Color(0xff0f766e),
                                  width: 2,
                                ),
                              )
                            : null,
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                order.title,
                                style: const TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(order.label),
                              Text('Preț produs: ${formatRon(order.amount)}'),
                              if (order.depositCredit > 0)
                                Text(
                                  'Garanție scăzută din preț: ${formatRon(order.depositCredit)}',
                                ),
                              if (order.status == 'awaiting_payment')
                                Text(
                                  'Rest de plată: ${formatRon(order.amountDue)}',
                                ),
                              if (order.canPay && order.paymentDeadline != null)
                                Text(
                                  'Plătește până la ${DateFormat('dd.MM.yyyy HH:mm').format(order.paymentDeadline!.toLocal())}',
                                ),
                              if (order.carrier != null)
                                Text(
                                  '${order.carrier}: ${order.trackingCode ?? ''}',
                                ),
                              if (order.issueOpen)
                                const Text(
                                  'Problemă raportată. Transferul necesită verificare.',
                                  style: TextStyle(color: Colors.red),
                                ),
                              if (order.status == 'completed')
                                const Text(
                                  'Suma a fost transferată în contul Stripe al vânzătorului. Intrarea în bancă are un termen separat.',
                                ),
                              if (order.sellerId == user?.id &&
                                  order.payoutSetupRequired)
                                const Text(
                                  'Plata cumpărătorului este confirmată. Configurează încasările din profil pentru a primi banii.',
                                ),
                              if (order.buyerId == user?.id && order.canPay)
                                FilledButton(
                                  onPressed: _busy || _config?['ready'] != true
                                      ? null
                                      : () => context.push(
                                          '/checkout/${order.id}',
                                        ),
                                  child: Text(
                                    order.amountDue == 0
                                        ? 'Confirmă plata din garanție'
                                        : 'Plătește prin Stripe',
                                  ),
                                ),
                              if (order.sellerId == user?.id && order.canShip)
                                FilledButton(
                                  onPressed: _busy ? null : () => _ship(order),
                                  child: const Text('Înregistrează expedierea'),
                                ),
                              if (order.buyerId == user?.id && order.canReceive)
                                OutlinedButton(
                                  onPressed: _busy
                                      ? null
                                      : () => _receipt(order),
                                  child: const Text('Am primit produsul'),
                                ),
                              if (order.buyerId == user?.id && order.canReport)
                                TextButton(
                                  onPressed: _busy ? null : () => _issue(order),
                                  child: const Text('Raportează o problemă'),
                                ),
                            ],
                          ),
                        ),
                      ),
                    if (_deposits.isNotEmpty) ...[
                      const SizedBox(height: 16),
                      const Text(
                        'Garanții de licitare',
                        style: TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const Text(
                        '10% din maximul ales. Dacă pierzi, rambursarea se inițiază după închiderea licitației; banca poate avea un termen de procesare.',
                      ),
                      for (final row in _deposits)
                        ListTile(
                          contentPadding: EdgeInsets.zero,
                          title: Text(
                            'Garanție: ${formatRon((row['amount'] as num).toInt())}',
                          ),
                          subtitle: Text(
                            'Scăzut din preț: ${formatRon((row['credited'] as num).toInt())} · Restituit: ${formatRon((row['refunded'] as num).toInt())}',
                          ),
                          trailing: Text(switch (row['status']) {
                            'pending' => 'În așteptare',
                            'paid' => 'Achitată',
                            'allocated' => 'Alocată comenzii',
                            'refunded' => 'Restituită',
                            'canceled' => 'Anulată',
                            _ => 'În verificare',
                          }),
                        ),
                    ],
                    if (_busy) const LinearProgressIndicator(),
                  ],
                ),
              ),
      ),
    );
  }
}
