# Localizare

Aplicația Flutter folosește `flutter_localizations` și generatorul oficial `gen-l10n`.
Limba implicită și singura limbă activată momentan este româna, independent de limba telefonului.

- `lib/l10n/app_ro.arb`: textele interfeței, pluralizarea ICU și parametrii tipizați.
- `lib/l10n/l10n.dart`: acces prin `context.l10n`.
- `lib/l10n/localized_errors.dart`: traducerea erorilor API și a stărilor/categoriilor standard, fără schimbarea identificatorilor din backend.
- `lib/src/shared/utils/money.dart`: afișare RON în format românesc și citirea sumelor în bani.
- `l10n.yaml`: configurarea generării în sursele proiectului.

După modificarea catalogului:

```sh
flutter gen-l10n
flutter analyze
flutter test
```

Fișierele `app_localizations*.dart` sunt generate; nu se editează manual.
Pentru o limbă nouă, se adaugă `app_<locale>.arb` cu aceleași chei și se regenerează.
La introducerea selecției de limbă se conectează preferința salvată la `MaterialApp.locale`
și se adaptează formatarea monetară/calendaristică la limba selectată.

Titlurile, descrierile și numele introduse de utilizatori nu sunt traduse automat.
Numele proprii (Pinbind, Google, Apple și mărcile produselor) sunt păstrate.
Erorile tehnice necunoscute sunt înlocuite cu un mesaj românesc potrivit; textul intern al serverului nu este afișat.

Constantele vizuale rămân `const`; numai expresiile care depind de localizarea curentă
au devenit dinamice. Nu se fac cereri de rețea pentru traduceri.
