# Licit

Aplicatie Flutter + NestJS pentru licitatii cu fotografii tip feed vertical.

## Structura

- `lib/` - aplicatia mobila Flutter.
- `backend/` - API NestJS cu MongoDB, JWT, Socket.IO si AWS S3 presigned uploads.

## Backend cu Docker si MongoDB cloud

1. Porneste Docker Desktop.
2. In `backend/.env`, seteaza `MONGODB_URI` la conexiunea MongoDB cloud,
   inclusiv numele bazei de date care contine conturile existente.
   Daca `.env` exista deja, pastreaza configuratia lui. Pentru o instalare noua,
   copiaza `backend/.env.example` in `backend/.env` si completeaza valorile.
3. Porneste backend-ul:

```bash
cd backend
docker compose up -d --build --remove-orphans
```

API-ul este disponibil la `http://localhost:3000`. Containerul foloseste
`backend/.env` la pornire; credentialele nu sunt incluse in imagine.
MongoDB local nu mai este pornit de aceasta configuratie. `--remove-orphans`
opreste containerul MongoDB din vechea configuratie, pastrand volumul cu date.

Pentru loguri si oprire:

```bash
docker compose logs -f backend
docker compose down
```

Pentru upload de imagini completeaza in `.env`:

```env
AWS_REGION=eu-central-1
AWS_S3_BUCKET=licit-images-dev
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
PUBLIC_IMAGE_BASE_URL=
```

Alternativ, pentru dezvoltare fara Docker (cu aceeasi conexiune cloud):

```bash
cd backend
npm install
npm run start:dev
```

`npm run seed` este optional si modifica baza configurata in `.env`.
Ruleaza-l doar pentru popularea intentionata a unei baze de dezvoltare.
Adminul creat de seed este:

- email: `admin@licit.local`
- parola: `admin1234`

## Flutter

### Pornire cu selector de backend

Din rădăcina proiectului:

```sh
./run-mobile.command
```

Pe macOS poți deschide `run-mobile.command` și prin dublu-click în Finder. Necesită Flutter în `PATH` și Python 3.
Alegi **Local** sau **Producție** (`https://pinbind.bcmenu.ro`), apoi telefonul/simulatorul. Dacă nu există un dispozitiv pornit, scriptul îți oferă emulatoarele configurate în Flutter și îl pornește pe cel ales.

Pentru Local, portul este citit din `backend/.env` (implicit 3000 dacă lipsește). Pe simulator iOS se folosește `localhost`, pe emulator Android `10.0.2.2`, iar pe telefon fizic scriptul cere IP-ul LAN al calculatorului; telefonul trebuie să fie în aceeași rețea Wi-Fi. Dacă backend-ul local nu rulează, scriptul oferă să îl pornească și îl oprește când închizi sesiunea Flutter (`q` sau Ctrl+C). Un backend deja pornit este păstrat. Backend-ul local folosește în continuare baza MongoDB configurată în `.env`, inclusiv dacă este în cloud.

Poți alege backend-ul și direct:

```sh
./run-mobile.command --backend production
./run-mobile.command --backend local
./run-mobile.command --backend local --local-host 192.168.1.10 --port 14020
```

`--device ID` selectează un dispozitiv din `flutter devices`, iar `--dry-run` afișează comanda fără să pornească aplicația/backend-ul. Schimbarea backend-ului cere relansarea aplicației cu scriptul. Pentru producție, serverul HTTPS trebuie să fie deja disponibil. În aplicație ajunge numai URL-ul API, niciodată fișierul `.env` sau cheile backend-ului.

### Pornire manuală

Pe emulator Android, default-ul API este `http://10.0.2.2:3000`.
Pe simulator iOS si desktop, default-ul este `http://localhost:3000`.

```powershell
flutter pub get
flutter run
```

Pentru device fizic seteaza API-ul explicit:

```powershell
flutter run --dart-define=API_BASE_URL=http://<ip-ul-tau-lan>:3000
```

## Verificari

```powershell
flutter analyze
flutter test
flutter build apk --debug

cd backend
npm run build
npm test
```

## Stripe marketplace (backend sandbox)

[Arhitectură, API, configurare și limitele integrării Stripe](docs/stripe-marketplace.md): Identity cu act și selfie, Connect și plăți cu transfer după confirmarea livrării. Integrarea este dezactivată implicit; cheile live sunt refuzate. Flutter și Next.js urmează să consume aceste endpoint-uri. Pentru teste este folosit exclusiv un MongoDB local temporar, cu Stripe simulat.

## Anunțuri numai cu imagini

Fotografiile trec prin `POST /uploads/images` ca multipart: backend-ul validează octeții, optimizează cu Sharp/libvips și salvează numai variante WebP în S3. Aplicația, administratorul și site-ul folosesc manifestul pentru miniaturi, feed și detalii. Sunt acceptate JPG/JPEG, PNG și WebP statice de maximum 10 MB/40 MP. Originalele nu sunt păstrate în S3.

[Flux, cache, CloudFront, limite, curățare și măsurători](docs/image-optimization.md). Pentru eliminarea referințelor video vechi consultă [migrarea imaginilor](docs/images-only.md).

## Plăți Stripe în aplicația mobilă

Profil → **Plăți și comenzi** deschide verificarea identității, configurarea încasărilor și comenzile. Licitarea pe anunțurile Stripe cere o garanție rambursabilă de 10% din maximul ales. Plata produsului folosește PaymentSheet în aplicație, cu garanția scăzută din preț. Implementarea este exclusiv sandbox; instrucțiunile și limitele sunt în [ghidul de testare mobilă](docs/stripe-mobile-testing.md).
