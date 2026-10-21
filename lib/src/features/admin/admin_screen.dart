import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../shared/models/seller_application.dart';
import '../../shared/state/session_controller.dart';
import '../../shared/widgets/app_nav_bar.dart';

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
      return const Scaffold(
        bottomNavigationBar: AppNavBar(currentIndex: 3),
        body: Center(child: Text('Ai nevoie de rol admin.')),
      );
    }

    return Scaffold(
      appBar: AppBar(title: const Text('Admin')),
      bottomNavigationBar: const AppNavBar(currentIndex: 3),
      body: RefreshIndicator(
        onRefresh: _load,
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            Text(
              'Cereri seller',
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
              const Text('Nu exista cereri pending.')
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
                        Text('${app.contactPhone} · ${app.status}'),
                        if (app.notes != null) Text(app.notes!),
                        const SizedBox(height: 8),
                        Row(
                          children: [
                            Expanded(
                              child: FilledButton(
                                onPressed: () => _approve(app.id),
                                child: const Text('Aproba'),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: OutlinedButton(
                                onPressed: () => _reject(app.id),
                                child: const Text('Respinge'),
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
              'Moderare rapida',
              style: Theme.of(context).textTheme.titleMedium,
            ),
            const SizedBox(height: 10),
            TextField(
              controller: _productId,
              decoration: const InputDecoration(
                labelText: 'Product ID de ascuns',
              ),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _hideProduct,
              icon: const Icon(Icons.visibility_off_outlined),
              label: const Text('Ascunde produs'),
            ),
            const SizedBox(height: 16),
            TextField(
              controller: _userId,
              decoration: const InputDecoration(labelText: 'User ID de blocat'),
            ),
            const SizedBox(height: 8),
            OutlinedButton.icon(
              onPressed: _blockUser,
              icon: const Icon(Icons.block),
              label: const Text('Blocheaza user'),
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
      setState(() => _message = error.toString());
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
      setState(() => _message = 'Actiune aplicata.');
    } on DioException catch (error) {
      final data = error.response?.data;
      setState(
        () =>
            _message = data is Map ? data['message'].toString() : error.message,
      );
    }
  }
}
