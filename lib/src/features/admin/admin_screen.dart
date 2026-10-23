import 'package:licit/l10n/l10n.dart';
import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/seller_application.dart';
import '../../shared/state/session_controller.dart';

class AdminScreen extends ConsumerStatefulWidget {
  const AdminScreen({super.key});

  @override
  ConsumerState<AdminScreen> createState() => _AdminScreenState();
}

class _AdminScreenState extends ConsumerState<AdminScreen> {
  final _productId = TextEditingController();
  final _userId = TextEditingController();
  List<SellerApplication> _applications = [];
  bool _loading = true;
  String? _message;

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _productId.dispose();
    _userId.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(sessionControllerProvider).user;

    if (user?.isAdmin != true) {
      return ColoredBox(
        color: const Color(0xfff9f9fa),
        child: Center(child: Text(context.l10n.adminRequired)),
      );
    }

    return ColoredBox(
      color: const Color(0xfff9f9fa),
      child: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              context.l10n.sellerApplications,
              style: Theme.of(
                context,
              ).textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w800),
            ),
            if (_message != null) ...[
              const SizedBox(height: 8),
              Text(
                _message!,
                style: TextStyle(color: Theme.of(context).colorScheme.primary),
              ),
            ],
            const SizedBox(height: 12),
            if (_loading)
              const Center(child: CircularProgressIndicator())
            else if (_applications.isEmpty)
              Text(context.l10n.noPendingApplications)
            else
              for (final app in _applications)
                Card(
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          app.displayName,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        Text(
                          '${app.contactPhone} · ${localizedStatus(app.status, context.l10n)}',
                        ),
                        if (app.notes != null) Text(app.notes!),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton(
                                onPressed: () => _approve(app.id),
                                child: Text(context.l10n.approve),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => _reject(app.id),
                                child: Text(context.l10n.reject),
                              ),
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),
                ),
            const Divider(height: 32),
            Text(
              context.l10n.quickModeration,
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _productId,
              decoration: InputDecoration(
                labelText: context.l10n.hideProductId,
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _hideProduct,
              icon: const Icon(Icons.visibility_off_outlined),
              label: Text(context.l10n.hideProduct),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _userId,
              decoration: InputDecoration(labelText: context.l10n.blockUserId),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _blockUser,
              icon: const Icon(Icons.block),
              label: Text(context.l10n.blockUser),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _load() async {
    setState(() {
      _loading = true;
      _message = null;
    });
    try {
      final apps = await ref
          .read(apiClientProvider)
          .pendingSellerApplications();
      setState(() => _applications = apps);
    } catch (error) {
      setState(() => _message = localizedError(error, context.l10n));
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _approve(String id) async {
    await _adminAction(() => ref.read(apiClientProvider).approveSeller(id));
  }

  Future<void> _reject(String id) async {
    await _adminAction(() => ref.read(apiClientProvider).rejectSeller(id));
  }

  Future<void> _hideProduct() async {
    await _adminAction(
      () => ref.read(apiClientProvider).hideProduct(_productId.text.trim()),
    );
  }

  Future<void> _blockUser() async {
    await _adminAction(
      () => ref.read(apiClientProvider).blockUser(_userId.text.trim(), true),
    );
  }

  Future<void> _adminAction(Future<void> Function() action) async {
    try {
      await action();
      await _load();
      setState(() => _message = context.l10n.actionApplied);
    } on DioException catch (error) {
      setState(() => _message = localizedError(error, context.l10n));
    }
  }
}
