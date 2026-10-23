# Notificări globale Pinbind

Implementare Flutter proprie, inspirată vizual de [shadcn/Sonner](https://ui.shadcn.com/docs/components/radix/sonner), fără o bibliotecă nouă. Host-ul este montat o singură dată în `LicitApp`, deasupra routerului. Mesajele rămân vizibile la navigare și sunt șterse când se schimbă utilizatorul autentificat.

## Apel dintr-un widget

```dart
import 'package:licit/src/shared/notifications/app_notifier.dart';

context.notifier.success('Modificările au fost salvate.');
context.notifier.error('Salvarea nu a reușit.', description: 'Încearcă din nou.');
context.notifier.warning('Verifică datele introduse.');
context.notifier.info('Informație utilă');
```

Nu este necesar un `Scaffold` local. În cod cu acces la Riverpod se folosește același controller, fără `BuildContext`:

```dart
final notifier = ref.read(appNotifierProvider.notifier);
final id = notifier.loading('Se salvează…');
try {
  await save();
  notifier.success('Salvat.', id: id);
} catch (_) {
  notifier.error('Salvarea nu a reușit.', id: id);
}
```

Reutilizarea unui ID înlocuiește mesajul și resetează expirarea. La operații asincrone păstrează verificările de sesiune/mounted ale operației; un mesaj global nu înlocuiește controlul cererilor anulate sau vechi.

## Acțiune și închidere

```dart
final id = context.notifier.info(
  'Operația nu s-a finalizat.',
  action: NoticeAction(label: 'Reîncearcă', onPressed: retry),
);
context.notifier.dismiss(id);
context.notifier.clear();
```

Acțiunea închide notificarea înainte de apelarea callback-ului. Mesajele pot fi închise și cu butonul accesibil de închidere sau prin swipe orizontal.

## Comportament

- Maximum trei notificări simultane; cea mai veche este eliminată împreună cu timerul ei.
- Mesajele identice fără acțiuni sunt deduplicate. Un ID explicit permite înlocuirea intenționată a unui mesaj.
- Durata implicită: 4 secunde pentru informare/succes, 6 pentru avertizare/eroare, 10 pentru mesaje cu acțiuni. `duration: Duration.zero` dezactivează expirarea. `loading` rămâne până la închidere, înlocuire sau eliminarea din limita de trei mesaje.
- Timer-ele sunt curățate la închidere, înlocuire și distrugerea providerului. Nu există polling sau actualizări ale întregului ecran.
- Host-ul afișează notificările jos, deasupra barei de navigare sau a tastaturii (cea mai nouă este lângă marginea de jos). Respectă zona sigură, limita de lățime de 420 px, textul mărit și reducerea animațiilor. Stiva poate fi derulată dacă ecranul nu o poate cuprinde.
- Validarea formularelor și erorile persistente de încărcare rămân lângă conținut; notificările sunt feedback temporar.
- Nu trimite în notificări tokenuri, payload-uri API sau erori interne brute; folosește `localizedError` și mesajele i18n existente.

Integrări inițiale: mesajele anterior afișate prin Snackbar, rezultatul operațiilor de favorite și confirmarea publicării unui anunț.

Verificări: `flutter analyze --no-pub` și `flutter test --no-pub`. Testele acoperă limita, deduplicarea, înlocuirea, expirarea, eliminarea timer-elor, navigarea, acțiunile, swipe și afișarea pe ecran mic cu text mărit.
