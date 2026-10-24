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

  bool get _seller =>
      ref.read(sessionControllerProvider).user?.isSeller == true;
  Future<void> _load({bool quiet = false}) async {
    if (_refreshing) return;
    _refreshing = true;
    try {
      final api = ref.read(apiClientProvider);
      final config = await api.commerceGet('config');
      final account = await api.commerceGet('me');
      if (mounted) {
        setState(() {
          _config = config;
          _account = account;
        });
      }
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

  String _money(String field) => _earnings == null
      ? '—'
      : formatRon((_earnings?[field] as num? ?? 0).toInt());

  static const _ink = Color(0xff363a34);
  static const _muted = Color(0xff6e756d);
  static const _teal = Color(0xff0f766e);

  Widget _panel({required Widget child}) => Container(
    padding: const EdgeInsets.all(24),
    decoration: BoxDecoration(
      color: Colors.white,
      borderRadius: BorderRadius.circular(24),
      border: Border.all(color: const Color(0xffe4e5df)),
    ),
    child: child,
  );

  Widget _balance(String title, String field, IconData icon) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 16),
    child: Row(
      children: [
        Icon(icon, color: _muted, size: 24),
        const SizedBox(width: 14),
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(title, style: const TextStyle(fontSize: 15, color: _muted)),
              const SizedBox(height: 6),
              Text(
                _money(field),
                style: const TextStyle(
                  fontSize: 23,
                  fontWeight: FontWeight.w600,
                ),
              ),
            ],
          ),
        ),
      ],
    ),
  );

  @override
  Widget build(BuildContext context) {
    final seller = _account?['sellerPayments'] as Map? ?? {};
    final ready =
        seller['transfersEnabled'] == true && seller['payoutsEnabled'] == true;
    final reviewBy = DateTime.tryParse('${_earnings?['reviewBy']}')?.toLocal();
    final theme = ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: _teal,
        surface: Colors.white,
      ),
      scaffoldBackgroundColor: const Color(0xfff9f9f7),
      textTheme: ThemeData.light().textTheme.apply(
        bodyColor: _ink,
        displayColor: _ink,
      ),
      appBarTheme: const AppBarTheme(
        backgroundColor: Color(0xfff9f9f7),
        foregroundColor: _ink,
        surfaceTintColor: Colors.transparent,
        centerTitle: false,
      ),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(
          backgroundColor: _ink,
          foregroundColor: Colors.white,
          minimumSize: const Size.fromHeight(58),
          padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
          textStyle: const TextStyle(fontSize: 16, fontWeight: FontWeight.w600),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
        ),
      ),
    );
    return Theme(
      data: theme,
      child: Scaffold(
        appBar: AppBar(
          title: const Text(
            'Plăți și încasări',
            style: TextStyle(fontSize: 20, fontWeight: FontWeight.w600),
          ),
          actions: [
            IconButton(
              tooltip: 'Actualizează',
              onPressed: _busy || _refreshing ? null : _load,
              icon: const Icon(Icons.refresh_rounded),
            ),
          ],
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator())
            : RefreshIndicator(
                onRefresh: _load,
                child: ListView(
                  physics: const AlwaysScrollableScrollPhysics(),
                  padding: const EdgeInsets.fromLTRB(24, 20, 24, 40),
                  children: [
                    const Text(
                      'Banii tăi,\nîntr-un singur loc.',
                      style: TextStyle(
                        fontSize: 34,
                        height: 1.15,
                        fontWeight: FontWeight.w700,
                        letterSpacing: -1.1,
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'Gestionează plățile și încasările tale.',
                      style: TextStyle(
                        fontSize: 17,
                        height: 1.5,
                        color: _muted,
                      ),
                    ),
                    const SizedBox(height: 28),
                    if (_error != null) ...[
                      _panel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              _error!,
                              style: TextStyle(
                                fontSize: 16,
                                height: 1.5,
                                color: theme.colorScheme.error,
                              ),
                            ),
                            TextButton(
                              onPressed: _busy ? null : _load,
                              child: const Text('Reîncearcă'),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 20),
                    ],
                    _panel(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: const Color(0xffedf4ef),
                              borderRadius: BorderRadius.circular(16),
                            ),
                            child: const Icon(
                              Icons.credit_card_rounded,
                              size: 30,
                              color: _teal,
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'Plățile tale',
                            style: TextStyle(
                              fontSize: 24,
                              fontWeight: FontWeight.w700,
                            ),
                          ),
                          const SizedBox(height: 10),
                          const Text(
                            'Plătești cu cardul când achiți o comandă sau garanția de participare la licitație.',
                            style: TextStyle(
                              fontSize: 17,
                              height: 1.55,
                              color: _muted,
                            ),
                          ),
                          const SizedBox(height: 22),
                          FilledButton(
                            onPressed: () => context.push('/commerce'),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Flexible(
                                  child: Text('Vezi plățile și comenzile'),
                                ),
                                SizedBox(width: 12),
                                Icon(Icons.arrow_forward_rounded, size: 20),
                              ],
                            ),
                          ),
                          const SizedBox(height: 16),
                          const Row(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Icon(
                                Icons.lock_outline_rounded,
                                size: 18,
                                color: _muted,
                              ),
                              SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  'Plăți securizate prin Stripe. Datele cardului nu sunt stocate de Pinbind.',
                                  style: TextStyle(
                                    fontSize: 14,
                                    height: 1.5,
                                    color: _muted,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ],
                      ),
                    ),
                    if (_seller) ...[
                      const SizedBox(height: 24),
                      _panel(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.stretch,
                          children: [
                            const Text(
                              'Încasări din vânzări',
                              style: TextStyle(
                                fontSize: 24,
                                fontWeight: FontWeight.w700,
                              ),
                            ),
                            const SizedBox(height: 10),
                            Text(
                              ready
                                  ? 'Contul tău este pregătit pentru încasări.'
                                  : 'Conectează contul în care vrei să primești banii din vânzări.',
                              style: const TextStyle(
                                fontSize: 17,
                                height: 1.55,
                                color: _muted,
                              ),
                            ),
                            const SizedBox(height: 24),
                            Container(
                              padding: const EdgeInsets.all(22),
                              decoration: BoxDecoration(
                                color: const Color(0xffedf4ef),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text(
                                    'Disponibil pentru transfer',
                                    style: TextStyle(
                                      fontSize: 15,
                                      color: _teal,
                                    ),
                                  ),
                                  const SizedBox(height: 10),
                                  Text(
                                    _money('readyForRelease'),
                                    style: const TextStyle(
                                      fontSize: 34,
                                      height: 1.2,
                                      fontWeight: FontWeight.w700,
                                      letterSpacing: -0.8,
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            const SizedBox(height: 8),
                            _balance(
                              'În așteptarea eliberării',
                              'awaitingDelivery',
                              Icons.schedule_rounded,
                            ),
                            const Divider(height: 1, color: Color(0xffe4e5df)),
                            _balance(
                              'Transfer în curs',
                              'transferPending',
                              Icons.sync_rounded,
                            ),
                            const Divider(height: 1, color: Color(0xffe4e5df)),
                            _balance(
                              'Transferat către Stripe',
                              'transferred',
                              Icons.check_circle_outline_rounded,
                            ),
                            if ((_earnings?['reviewCount'] as num? ?? 0) > 0)
                              const Padding(
                                padding: EdgeInsets.only(bottom: 16),
                                child: Text(
                                  'Ai comenzi în verificare. Sumele lor vor deveni disponibile după rezolvare.',
                                  style: TextStyle(fontSize: 15, height: 1.5),
                                ),
                              ),
                            if (reviewBy != null)
                              Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: Text(
                                  'Următoarea revizuire: ${reviewBy.day}.${reviewBy.month}.${reviewBy.year}.',
                                  style: const TextStyle(fontSize: 15),
                                ),
                              ),
                            const SizedBox(height: 8),
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
                                    ? 'Încasează banii disponibili'
                                    : seller['connected'] == true
                                    ? 'Continuă configurarea'
                                    : 'Configurează încasările',
                              ),
                            ),
                            const SizedBox(height: 18),
                            const Text(
                              'Sumele includ deducerea comisionului platformei. Banii devin disponibili după confirmarea primirii și expirarea termenului de eliberare, dacă nu există o dispută.',
                              style: TextStyle(
                                fontSize: 14,
                                height: 1.6,
                                color: _muted,
                              ),
                            ),
                            const SizedBox(height: 8),
                            const Text(
                              'După transferul către Stripe, viramentul în contul bancar urmează termenul de procesare Stripe.',
                              style: TextStyle(
                                fontSize: 14,
                                height: 1.6,
                                color: _muted,
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                    if (_busy)
                      const Padding(
                        padding: EdgeInsets.only(top: 20),
                        child: LinearProgressIndicator(),
                      ),
                  ],
                ),
              ),
      ),
    );
  }
}
