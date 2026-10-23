import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:licit/l10n/l10n.dart';
import 'package:licit/src/shared/notifications/app_notifier.dart';
import 'package:licit/src/shared/notifications/app_notifier_host.dart';

void main() {
  testWidgets(
    'notifications deduplicate, stay bounded and cancel evicted timers',
    (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(appNotifierProvider.notifier);
      final first = notifier.info('Informare');
      expect(notifier.info('Informare'), first);
      expect(container.read(appNotifierProvider), hasLength(1));
      notifier.success('Salvat');
      notifier.warning('Atenție');
      notifier.error('Eroare');
      expect(container.read(appNotifierProvider), hasLength(3));
      expect(
        container.read(appNotifierProvider).any((n) => n.id == first),
        isFalse,
      );
      await tester.pump(const Duration(seconds: 7));
      expect(container.read(appNotifierProvider), isEmpty);
    },
  );

  testWidgets(
    'loading persists and replacement restarts expiry under the same ID',
    (tester) async {
      final container = ProviderContainer();
      addTearDown(container.dispose);
      final notifier = container.read(appNotifierProvider.notifier);
      final id = notifier.loading('Se salvează');
      await tester.pump(const Duration(minutes: 1));
      expect(container.read(appNotifierProvider).single.id, id);
      notifier.error(
        'Încearcă din nou',
        id: id,
        duration: const Duration(seconds: 2),
      );
      await tester.pump(const Duration(seconds: 1));
      notifier.success('Salvat', id: id, duration: const Duration(seconds: 3));
      await tester.pump(const Duration(seconds: 2));
      expect(
        container.read(appNotifierProvider).single.kind,
        NoticeKind.success,
      );
      await tester.pump(const Duration(seconds: 1));
      expect(container.read(appNotifierProvider), isEmpty);
      notifier.loading('Altă operație');
      notifier.clear();
      expect(container.read(appNotifierProvider), isEmpty);
    },
  );

  testWidgets('disposing the provider cancels pending timers', (tester) async {
    final container = ProviderContainer();
    container.read(appNotifierProvider.notifier).info('Temporar');
    container.dispose();
    await tester.pump(const Duration(seconds: 10));
    expect(tester.takeException(), isNull);
  });

  Future<ProviderContainer> mount(
    WidgetTester tester, {
    bool small = false,
    double keyboard = 0,
    double bottomOffset = 0,
    double safeBottom = 0,
  }) async {
    if (small) {
      tester.view.physicalSize = const Size(320, 568);
      tester.view.devicePixelRatio = 1;
      addTearDown(tester.view.resetPhysicalSize);
      addTearDown(tester.view.resetDevicePixelRatio);
    }
    final container = ProviderContainer();
    addTearDown(container.dispose);
    await tester.pumpWidget(
      UncontrolledProviderScope(
        container: container,
        child: MaterialApp(
          locale: const Locale('ro'),
          localizationsDelegates: AppLocalizations.localizationsDelegates,
          supportedLocales: AppLocalizations.supportedLocales,
          builder: (context, child) => MediaQuery(
            data: MediaQuery.of(context).copyWith(
              textScaler: TextScaler.linear(small ? 1.8 : 1),
              disableAnimations: small,
              viewInsets: EdgeInsets.only(bottom: keyboard),
              viewPadding: EdgeInsets.only(bottom: safeBottom),
            ),
            child: AppNotifierHost(bottomOffset: bottomOffset, child: child!),
          ),
          home: Builder(
            builder: (context) => Scaffold(
              body: Center(
                child: TextButton(
                  onPressed: () => Navigator.of(context).push(
                    MaterialPageRoute<void>(
                      builder: (_) => const Scaffold(body: Text('Pagina nouă')),
                    ),
                  ),
                  child: const Text('Navighează'),
                ),
              ),
            ),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    return container;
  }

  for (final keyboard in [0.0, 300.0]) {
    testWidgets('notices sit above navigation and keyboard ($keyboard)', (
      tester,
    ) async {
      final container = await mount(
        tester,
        keyboard: keyboard,
        bottomOffset: 80,
        safeBottom: 34,
      );
      container
          .read(appNotifierProvider.notifier)
          .info('Poziție', duration: Duration.zero);
      await tester.pumpAndSettle();
      final bottom = tester.getBottomRight(find.byType(Dismissible)).dy;
      final height =
          tester.view.physicalSize.height / tester.view.devicePixelRatio;
      expect(
        bottom,
        closeTo(height - (keyboard > 0 ? keyboard : 114) - 12, 0.5),
      );
      expect(tester.takeException(), isNull);
    });
  }

  testWidgets('host survives navigation and leaves unrelated controls usable', (
    tester,
  ) async {
    final semantics = tester.ensureSemantics();
    final container = await mount(tester);
    container
        .read(appNotifierProvider.notifier)
        .success('Salvat', duration: Duration.zero);
    await tester.pumpAndSettle();
    await tester.tap(find.text('Navighează'));
    await tester.pumpAndSettle();
    expect(find.text('Pagina nouă'), findsOneWidget);
    expect(find.text('Salvat'), findsOneWidget);
    await tester.tap(find.bySemanticsLabel('Închide notificarea'));
    await tester.pumpAndSettle();
    expect(find.text('Salvat'), findsNothing);
    semantics.dispose();
    expect(tester.takeException(), isNull);
  });

  testWidgets('actions dismiss before invoking callback and swipe closes', (
    tester,
  ) async {
    final container = await mount(tester);
    final notifier = container.read(appNotifierProvider.notifier);
    var calls = 0;
    notifier.info(
      'Modificare salvată',
      duration: Duration.zero,
      action: NoticeAction(
        label: 'Anulează',
        onPressed: () {
          calls++;
          expect(container.read(appNotifierProvider), isEmpty);
        },
      ),
    );
    await tester.pumpAndSettle();
    await tester.tap(find.text('Anulează'));
    await tester.pumpAndSettle();
    expect(calls, 1);
    notifier.warning('Avertizare', duration: Duration.zero);
    await tester.pumpAndSettle();
    await tester.drag(find.byType(Dismissible), const Offset(600, 0));
    await tester.pumpAndSettle();
    expect(container.read(appNotifierProvider), isEmpty);
  });

  testWidgets(
    'three notices fit small screens with large text and reduced motion',
    (tester) async {
      final container = await mount(tester, small: true);
      final notifier = container.read(appNotifierProvider.notifier);
      for (var i = 0; i < 3; i++) {
        notifier.info(
          'Mesaj $i cu titlu mai lung și lizibil',
          description:
              'Detalii suplimentare pentru notificare, inclusiv informații despre următorul pas.',
          duration: Duration.zero,
        );
      }
      await tester.pumpAndSettle();
      expect(find.byType(Dismissible), findsNWidgets(3));
      expect(tester.takeException(), isNull);
    },
  );
}
