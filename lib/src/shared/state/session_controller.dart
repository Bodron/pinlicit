import 'package:dio/dio.dart';
import 'package:flutter/foundation.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_riverpod/legacy.dart';

import '../api/api_client.dart';
import '../models/app_user.dart';
import 'secure_token_store.dart';

final apiClientProvider = Provider<ApiClient>((ref) => ApiClient());
final secureTokenStoreProvider = Provider<SecureTokenStore>(
  (ref) => SecureTokenStore(),
);

final sessionControllerProvider = ChangeNotifierProvider<SessionController>((
  ref,
) {
  return SessionController(
    ref.read(apiClientProvider),
    ref.read(secureTokenStoreProvider),
  )..restoreSession();
});

class SessionController extends ChangeNotifier {
  SessionController(this._api, this._tokenStore);

  final ApiClient _api;
  final SecureTokenStore _tokenStore;
  AppUser? user;
  bool busy = false;
  bool restoring = true;
  Object? error;
  bool _restoreStarted = false;

  bool get isAuthenticated => user != null && _api.token != null;
  bool get hasFinishedRestore => !restoring;

  Future<void> restoreSession() async {
    if (_restoreStarted) return;
    _restoreStarted = true;
    restoring = true;
    error = null;
    notifyListeners();

    try {
      final token = await _tokenStore.readAccessToken();
      if (token == null || token.isEmpty) {
        _api.setToken(null);
        user = null;
        return;
      }

      _api.setToken(token);
      user = await _api.me();
    } on DioException {
      await _clearSession();
    } catch (_) {
      await _clearSession();
    } finally {
      restoring = false;
      notifyListeners();
    }
  }

  Future<void> login(String email, String password) async {
    if (restoring) return;
    await _run(() async {
      final session = await _api.login(email: email, password: password);
      await _tokenStore.writeAccessToken(session.accessToken);
      _api.setToken(session.accessToken);
      user = session.user;
    });
  }

  Future<void> register({
    required String name,
    required String email,
    required String password,
    String? phone,
  }) async {
    if (restoring) return;
    await _run(() async {
      final session = await _api.register(
        name: name,
        email: email,
        password: password,
        phone: phone,
      );
      await _tokenStore.writeAccessToken(session.accessToken);
      _api.setToken(session.accessToken);
      user = session.user;
    });
  }

  Future<void> refreshMe() async {
    if (_api.token == null) return;
    await _run(() async {
      user = await _api.me();
    });
  }

  Future<void> logout() async {
    await _clearSession();
    notifyListeners();
  }

  Future<void> _clearSession() async {
    await _tokenStore.clear();
    _api.setToken(null);
    user = null;
  }

  Future<void> _run(Future<void> Function() action) async {
    busy = true;
    error = null;
    notifyListeners();
    try {
      await action();
    } on DioException catch (exception) {
      error = exception;
      rethrow;
    } catch (exception) {
      error = exception;
      rethrow;
    } finally {
      busy = false;
      notifyListeners();
    }
  }
}
