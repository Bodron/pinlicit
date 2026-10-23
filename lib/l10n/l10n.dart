import 'package:flutter/widgets.dart';
import 'app_localizations.dart';

export 'app_localizations.dart';
export 'localized_errors.dart';

extension LocalizedContext on BuildContext {
  AppLocalizations get l10n => AppLocalizations.of(this);
}
