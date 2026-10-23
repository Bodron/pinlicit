import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/utils/money.dart';
import 'commerce_flow.dart';
import 'commerce_models.dart';

class CommerceReviewScreen extends ConsumerStatefulWidget {
  const CommerceReviewScreen({super.key});
  @override
  ConsumerState<CommerceReviewScreen> createState() =>
      _CommerceReviewScreenState();
}

class _CommerceReviewScreenState extends ConsumerState<CommerceReviewScreen> {
  List<Map<String, dynamic>> _rows = [];
  bool _busy = false;
  String? _error;
  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    if (ref.read(sessionControllerProvider).user?.isAdmin != true) return;
    setState(() => _busy = true);
    try {
      final rows = await ref
          .read(apiClientProvider)
          .commerceList('review-queue');
      if (mounted) {
        setState(() {
          _rows = rows;
          _error = null;
        });
      }
    } catch (error) {
      if (mounted) setState(() => _error = commerceError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _refund(CommerceOrder order) async {
    final reason = TextEditingController();
    final text = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rambursare integrală'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'Se solicită returnarea sumei de ${formatRon(order.amount)}, inclusiv garanția aplicată. Operația este permisă numai înainte de transfer.',
            ),
            TextField(
              controller: reason,
              maxLength: 200,
              decoration: const InputDecoration(
                labelText: 'Motivul rambursării',
              ),
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
              if (reason.text.trim().length >= 3) {
                Navigator.pop(context, reason.text.trim());
              }
            },
            child: const Text('Solicită rambursarea'),
          ),
        ],
      ),
    );
    Future<void>.delayed(const Duration(seconds: 1), reason.dispose);
    if (text == null || !mounted) return;
    setState(() => _busy = true);
    try {
      await ref.read(apiClientProvider).commercePost(
        'orders/${order.id}/refund',
        {'reason': text},
      );
      await _load();
    } catch (error) {
      if (mounted) setState(() => _error = commerceError(error));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) => Theme(
    data: ThemeData(
      colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xff0f766e)),
      useMaterial3: true,
    ),
    child: Scaffold(
      appBar: AppBar(title: const Text('Suport comenzi Stripe')),
      body: ref.watch(sessionControllerProvider).user?.isAdmin != true
          ? const Center(child: Text('Acces doar pentru administratori.'))
          : RefreshIndicator(
              onRefresh: _load,
              child: ListView(
                padding: const EdgeInsets.all(20),
                children: [
                  const Text('Sandbox — rambursările nu folosesc bani reali.'),
                  if (_busy) const LinearProgressIndicator(),
                  if (_error != null)
                    Text(_error!, style: const TextStyle(color: Colors.red)),
                  if (!_busy && _rows.isEmpty)
                    const Text('Nu sunt comenzi în coada de revizuire.'),
                  for (final row in _rows)
                    Builder(
                      builder: (context) {
                        final order = CommerceOrder.fromJson(row);
                        return Card(
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
                                Text(
                                  '${order.label} · ${formatRon(order.amount)}',
                                ),
                                if (row['issueCode'] != null)
                                  Text('Problemă: ${row['issueCode']}'),
                                if (row['reviewCode'] != null)
                                  Text(
                                    'Verificare necesară: ${row['reviewCode']}',
                                  ),
                                if ([
                                  'paid',
                                  'shipped',
                                  'delivered',
                                  'refund_pending',
                                ].contains(order.status))
                                  FilledButton(
                                    onPressed: _busy
                                        ? null
                                        : () => _refund(order),
                                    child: const Text('Rambursează integral'),
                                  )
                                else
                                  const Text(
                                    'Această stare necesită reconciliere în Stripe și verificarea transferurilor înainte de orice altă operație.',
                                  ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
                ],
              ),
            ),
    ),
  );
}
