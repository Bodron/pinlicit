import 'package:intl/intl.dart';

final _ronFormatter = NumberFormat.currency(
  locale: 'ro_RO',
  symbol: 'RON',
  decimalDigits: 2,
);

String formatRon(int bani) => _ronFormatter.format(bani / 100);

/// Accept Romanian decimal input and the dot-decimal values already used by
/// imported data. Space/dot group separators are handled before conversion.
double? parseRon(String value) {
  var normalized = value.trim().replaceAll(RegExp(r'[\s\u00a0\u202f]'), '');
  final comma = normalized.lastIndexOf(',');
  final dot = normalized.lastIndexOf('.');
  if (comma >= 0) {
    if (dot > comma) {
      normalized = normalized.replaceAll(',', '');
    } else {
      normalized = normalized.replaceAll('.', '').replaceAll(',', '.');
    }
  }
  return double.tryParse(normalized);
}

int ronToBani(String value) => ((parseRon(value) ?? 0) * 100).round();
