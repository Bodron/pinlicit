import 'package:dio/dio.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:licit/src/shared/api/api_client.dart';

void main() {
  test(
    'API shares concurrent reads, retains categories, refreshes live feed',
    () async {
      final api = ApiClient();
      final calls = <String, int>{};
      api.dio.interceptors.add(
        InterceptorsWrapper(
          onRequest: (request, handler) {
            calls.update(request.path, (count) => count + 1, ifAbsent: () => 1);
            handler.resolve(
              Response(
                requestOptions: request,
                statusCode: 200,
                data: <dynamic>[],
              ),
            );
          },
        ),
      );
      await Future.wait([api.categories(), api.categories()]);
      await api.categories();
      expect(calls['/categories'], 1);
      await Future.wait([api.feed(), api.feed()]);
      expect(calls['/products/feed'], 1);
      await api.feed();
      expect(calls['/products/feed'], 2);
      api.setToken('another-session');
      await api.categories();
      expect(calls['/categories'], 2);
      api.dio.close();
    },
  );

  test('different feed filters cannot accidentally share results', () async {
    final api = ApiClient();
    final requested = <String?>[];
    api.dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (request, handler) {
          requested.add(request.queryParameters['categoryId'] as String?);
          handler.resolve(
            Response(
              requestOptions: request,
              statusCode: 200,
              data: <dynamic>[],
            ),
          );
        },
      ),
    );
    await Future.wait([
      api.feed(categoryId: 'auto'),
      api.feed(categoryId: 'home'),
    ]);
    expect(requested, containsAll(['auto', 'home']));
    expect(requested.length, 2);
    api.dio.close();
  });
}
