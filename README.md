# Licit

Aplicatie Flutter + NestJS pentru licitatii video tip feed vertical.

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

Pentru upload video real completeaza in `.env`:

```env
AWS_REGION=eu-central-1
AWS_S3_BUCKET=licit-videos-dev
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
PUBLIC_VIDEO_BASE_URL=
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
