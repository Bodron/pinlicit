import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:licit/l10n/l10n.dart';
import 'package:licit/src/shared/utils/money.dart';
import 'package:licit/src/shared/widgets/app_nav_bar.dart';

void main() {
  late AppLocalizations l10n;
  setUp(() async {
    l10n = await AppLocalizations.delegate.load(const Locale('ro'));
  });

  test(
    'Romanian strings, placeholders and plurals are generated correctly',
    () {
      expect(l10n.signInAction, 'AUTENTIFICARE');
      expect(l10n.resultCount(1), 'Un rezultat');
      expect(l10n.resultCount(2), '2 rezultate');
      expect(l10n.resultCount(20), '20 de rezultate');
      expect(l10n.daysCount(1), 'O zi');
      expect(l10n.daysCount(7), '7 zile');
      expect(l10n.minutesAgo(1), 'Acum o minută');
      expect(l10n.youWon('Audi A4'), 'Ai câștigat Audi A4');
    },
  );

  test('Romanian currency formatting and decimal input round-trip in bani', () {
    expect(formatRon(123456).replaceAll('\u00a0', ' '), '1.234,56 RON');
    expect(ronToBani('1.234,56'), 123456);
    expect(ronToBani('1 234,56'), 123456);
    expect(ronToBani('1234.56'), 123456);
    expect(ronToBani('1,234.56'), 123456);
    expect(ronToBani('0,01'), 1);
    expect(parseRon('invalid'), isNull);
  });

  test(
    'API messages are localized without exposing unknown internal errors',
    () {
      final options = RequestOptions(path: '/auth/login');
      DioException response(int code, Object data) => DioException(
        requestOptions: options,
        type: DioExceptionType.badResponse,
        response: Response(
          requestOptions: options,
          statusCode: code,
          data: data,
        ),
      );
      expect(
        localizedError(
          response(401, {'message': 'Invalid email or password.'}),
          l10n,
        ),
        l10n.invalidCredentials,
      );
      expect(
        localizedError(response(403, {'message': 'Account is blocked.'}), l10n),
        l10n.accountBlocked,
      );
      expect(
        localizedError(
          response(400, {
            'message': ['email must be an email'],
          }),
          l10n,
        ),
        l10n.invalidForm,
      );
      expect(
        localizedError(
          response(500, {'message': 'Internal English detail'}),
          l10n,
        ),
        l10n.requestFailed,
      );
      expect(
        localizedError(
          DioException(
            requestOptions: options,
            type: DioExceptionType.connectionTimeout,
          ),
          l10n,
        ),
        l10n.requestTimeout,
      );
      expect(localizedStatus('reserved', l10n), 'Rezervat');
      expect(localizedCategory('Casa', l10n), 'Casă');
      expect(localizedCategory('Collectibles', l10n), 'Obiecte de colecție');
      expect(localizedCategory('Categoria mea', l10n), 'Categoria mea');
    },
  );

  testWidgets('Romanian navigation fits a small phone with larger text', (
    tester,
  ) async {
    tester.view.physicalSize = const Size(320, 640);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.resetPhysicalSize);
    addTearDown(tester.view.resetDevicePixelRatio);
    await tester.pumpWidget(
      MaterialApp(
        locale: const Locale('ro'),
        supportedLocales: AppLocalizations.supportedLocales,
        localizationsDelegates: AppLocalizations.localizationsDelegates,
        home: MediaQuery(
          data: const MediaQueryData(textScaler: TextScaler.linear(1.3)),
          child: Scaffold(
            bottomNavigationBar: AppNavBar(currentIndex: 0, onSelected: (_) {}),
          ),
        ),
      ),
    );
    await tester.pumpAndSettle();
    expect(find.text('Acasă'), findsOneWidget);
    expect(find.text('Explorează'), findsOneWidget);
    expect(find.text('Vinde'), findsOneWidget);
    expect(find.text('Activitate'), findsOneWidget);
    expect(find.text('Profil'), findsOneWidget);
    expect(tester.takeException(), isNull);
  });
}
