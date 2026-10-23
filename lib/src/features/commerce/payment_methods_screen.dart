import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';
import 'commerce_flow.dart';
import 'seller_payout_setup.dart';

class PaymentMethodsScreen extends ConsumerStatefulWidget {
  const PaymentMethodsScreen({super.key});
  @override
  ConsumerState<PaymentMethodsScreen> createState() =>
      _PaymentMethodsScreenState();
}

class _PaymentMethodsScreenState extends ConsumerState<PaymentMethodsScreen>
    with WidgetsBindingObserver {
  Map<String, dynamic>? _config, _account, _earnings;
  bool _loading = true, _busy = false, _refreshing = false, _foreground = true;
  String? _error;
  Timer? _timer;
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _load();
    _timer = Timer.periodic(const Duration(seconds: 15), (_) {
      if (_foreground && !_busy) _load(quiet: true);
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

  bool get _seller => [
    'seller',
    'admin',
  ].contains(ref.read(sessionControllerProvider).user?.role);
  Future<void> _load({bool quiet = false}) async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final api = ref.read(apiClientProvider);
      final config = await api.commerceGet('config');
      final account = await api.commerceGet('me');
      final earnings = _seller
          ? await api.commerceGet('seller/earnings')
          : null;
      if (mounted) {
        setState(() {
          _config = config;
          _account = account;
          _earnings = earnings;
          _error = null;
        });
      }
    } catch (error) {
      if (mounted && !quiet) setState(() => _error = commerceError(error));
    } finally {
      _refreshing = false;
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _collect() async {
    final seller = _account?['sellerPayments'] as Map? ?? {};
    final ready =
        seller['transfersEnabled'] == true && seller['payoutsEnabled'] == true;
    String? type;
    if (!ready) {
      type = await chooseSellerBusinessType(
        context,
        existingType: seller['businessType'] as String?,
      );
      if (type == null || !mounted) return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final api = ref.read(apiClientProvider);
      if (ready) {
        await api.commercePost('seller/withdraw');
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text(
                'Am verificat comenzile eligibile. Transferul către Stripe și viramentul bancar au stări și termene separate.',
              ),
            ),
          );
        }
      } else {
        await openSellerOnboarding(api, type!);
      }
      await _load();
    } catch (error) {
      if (mounted) setState(() => _error = commerceError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _money(String field) =>
      formatRon((_earnings?[field] as num? ?? 0).toInt());
  @override
  Widget build(BuildContext context) {
    final seller = _account?['sellerPayments'] as Map? ?? {};
    final ready =
        seller['transfersEnabled'] == true && seller['payoutsEnabled'] == true;
    final reviewBy = DateTime.tryParse('${_earnings?['reviewBy']}')?.toLocal();
    final theme = ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff0f766e)),
      useMaterial3: true,
    );
    return Theme(
      data: theme,
      child: Scaffold(
        appBar: AppBar(
          title: const Text('Metode de plată și încasare'),
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
                    const Text(
                      'Mod de test Stripe — fără bani reali.',
                      style: TextStyle(fontWeight: FontWeight.bold),
                    ),
                    if (_error != null)
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 12),
                        child: Text(
                          _error!,
                          style: TextStyle(color: theme.colorScheme.error),
                        ),
                      ),
                    const Card(
                      child: Padding(
                        padding: EdgeInsets.all(16),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Plățile tale',
                              style: TextStyle(
                                fontSize: 20,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            Text(
                              'Introduci cardul în formularul securizat Stripe când plătești o comandă sau garanția de licitare. Pinbind nu păstrează numărul cardului.',
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (_seller)
                      Card(
                        child: Padding(
                          padding: const EdgeInsets.all(16),
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.stretch,
                            children: [
                              const Text(
                                'Încasări din vânzări',
                                style: TextStyle(
                                  fontSize: 20,
                                  fontWeight: FontWeight.bold,
                                ),
                              ),
                              Text(
                                ready
                                    ? 'Cont Stripe pregătit pentru încasări'
                                    : 'Poți vinde înainte să configurezi contul. Configurează încasările pentru a primi banii.',
                              ),
                              const SizedBox(height: 16),
                              Text(
                                'În așteptarea livrării sau a termenului de eliberare: ${_money('awaitingDelivery')}',
                              ),
                              Text(
                                'Eligibil pentru transfer: ${_money('readyForRelease')}',
                              ),
                              Text(
                                'Transfer în curs către Stripe: ${_money('transferPending')}',
                              ),
                              Text(
                                'Transferat către Stripe: ${_money('transferred')}',
                              ),
                              if ((_earnings?['reviewCount'] as num? ?? 0) > 0)
                                const Text(
                                  'Există comenzi în verificare. Aceste sume nu sunt eligibile pentru încasare.',
                                ),
                              if (reviewBy != null)
                                Text(
                                  'Cel mai apropiat termen de revizuire: ${reviewBy.day}.${reviewBy.month}.${reviewBy.year}.',
                                ),
                              const SizedBox(height: 12),
                              FilledButton(
                                onPressed:
                                    _busy ||
                                        _config?['ready'] != true ||
                                        (ready &&
                                            (_earnings?['readyForRelease']
                                                        as num? ??
                                                    0) ==
                                                0)
                                    ? null
                                    : _collect,
                                child: Text(
                                  ready
                                      ? 'Încasează sumele eligibile'
                                      : seller['connected'] == true
                                      ? 'Continuă configurarea încasărilor'
                                      : 'Configurează încasările',
                                ),
                              ),
                              const Text(
                                'Sumele afișate sunt după comisionul platformei. Eliberarea necesită confirmarea primirii, expirarea termenului și absența unei dispute. Viramentul bancar este procesat de Stripe după transfer; fondurile nu se păstrează nelimitat.',
                              ),
                            ],
                          ),
                        ),
                      ),
                    OutlinedButton(
                      onPressed: () => context.push('/commerce'),
                      child: const Text('Vezi plățile și comenzile'),
                    ),
                    if (_busy) const LinearProgressIndicator(),
                  ],
                ),
              ),
      ),
    );
  }
}
