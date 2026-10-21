String formatRon(int bani) {
  final lei = bani / 100;
  return '${lei.toStringAsFixed(2)} RON';
}

int ronToBani(String value) {
  final normalized = value.replaceAll(',', '.').trim();
  final parsed = double.tryParse(normalized) ?? 0;
  return (parsed * 100).round();
}
