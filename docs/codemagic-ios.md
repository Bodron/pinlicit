# Pinbind — iOS pe Codemagic

Configurația urmează modelul din `lend/codemagic.yaml`, adaptat la Pinbind.

- Rădăcina proiectului/repository-ului: `pinlicit` (directorul care conține `pubspec.yaml` și `codemagic.yaml`).
- Workflow: `ios-app-store` / **Pinbind iOS App Store**.
- Bundle ID: `com.pinbind.ro`, inclusiv în Debug, Profile și Release.
- Apple Developer Team existent: `9474MTRLF8`.
- Nume afișat pe iPhone: **Pinbind**.
- Versiune: cea din `pubspec.yaml`; număr de build: variabila Codemagic `BUILD_NUMBER`.
- Backend compilat în aplicație: `https://pinbind.bcmenu.ro`, prin `--dart-define=API_BASE_URL=...`.

## Configurare în conturi

1. În Apple Developer, înregistrează/verifică App ID-ul explicit `com.pinbind.ro` în echipa de mai sus. În App Store Connect, creează aplicația **Pinbind** cu același Bundle ID.
2. Conectează repository-ul care conține acest proiect la Codemagic și folosește configurația YAML din rădăcină. Urcă și modificările iOS existente cu identificatorul corect.
3. În Team settings → Code signing identities, adaugă un certificat **Apple Distribution** cu cheia privată și un profil **App Store** pentru `com.pinbind.ro`, sau importă-le prin integrarea Apple. Workflow-ul selectează fișierele deja disponibile folosind `ios_signing`; nu creează singur certificate/profiluri în Apple Developer.
4. Creează/partajează cu aplicația grupul de variabile **appstore_credentials**, ca în Lend, cu aceste valori secrete din App Store Connect API:
   - `APP_STORE_CONNECT_PRIVATE_KEY`: conținutul cheii `.p8`, cu liniile originale.
   - `APP_STORE_CONNECT_KEY_IDENTIFIER`: Key ID.
   - `APP_STORE_CONNECT_ISSUER_ID`: Issuer ID.
   Cheia trebuie să aibă acces la aplicația Pinbind și permisiuni de upload.
5. Selectează workflow-ul **Pinbind iOS App Store** și pornește primul build. Numărul `BUILD_NUMBER` trebuie să depășească orice build deja încărcat pentru aceeași versiune; ajustează contorul Codemagic dacă este necesar.

Rezultatul este un `.ipa` semnat și arhiva Xcode în artifacts. Workflow-ul încarcă automat buildul în TestFlight; trimiterea la review/publicarea în App Store este dezactivată.

## Dependențe iOS

`ios/Podfile` setează iOS 15.0 și instalează dependențele Flutter prin CocoaPods atunci când este nevoie. Integrarea Swift Package Manager existentă este păstrată; în configurația curentă pluginurile folosesc SwiftPM, iar Podfile.lock conține doar Flutter. Nu se adaugă StripeIdentity din Lend: Pinbind folosește verificarea găzduită în browser, iar SDK-ul Stripe pentru PaymentSheet vine din dependențele proprii.

Configurațiile Debug, Profile și Release includ fișierele CocoaPods corespunzătoare. `Pods/`, `.symlinks/` și fișierele Flutter generate nu se urcă în Git. Se urcă `Podfile`, `Podfile.lock`, fișierele `.xcconfig` și modificările proiectului/workspace-ului Xcode.

Pentru verificare locală:

```sh
flutter pub get
(cd ios && pod install)
flutter build ios --release --no-codesign \
  --dart-define=API_BASE_URL=https://pinbind.bcmenu.ro
```

Buildul local fără semnare verifică compilarea; IPA-ul semnat și uploadul în TestFlight necesită configurarea Apple/Codemagic de mai sus. Cheile API și certificatele rămân în Codemagic.

Referințe: [Codemagic — semnare iOS](https://docs.codemagic.io/yaml-code-signing/signing-ios/), [Codemagic — Flutter](https://docs.codemagic.io/yaml-quick-start/building-a-flutter-app/), [Flutter — Swift Package Manager](https://docs.flutter.dev/packages-and-plugins/swift-package-manager/for-app-developers).
