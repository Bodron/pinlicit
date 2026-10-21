# Licit

Aplicatie Flutter + NestJS pentru licitatii video tip feed vertical.

## Structura

- `lib/` - aplicatia mobila Flutter.
- `backend/` - API NestJS cu MongoDB, JWT, Socket.IO si AWS S3 presigned uploads.

## Backend local

1. Porneste Docker Desktop.
2. Porneste MongoDB:

```powershell
cd backend
docker compose up -d
```

3. Configureaza env:

```powershell
Copy-Item .env.example .env
```

Pentru upload video real completeaza in `.env`:

```env
AWS_REGION=eu-central-1
AWS_S3_BUCKET=licit-videos-dev
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
PUBLIC_VIDEO_BASE_URL=
```

4. Porneste API-ul:

```powershell
npm install
npm run seed
npm run start:dev
```

Adminul seed-uit este:

- email: `admin@licit.local`
- parola: `admin1234`

## Flutter

Pe emulator Android, default-ul API este `http://10.0.2.2:3000`.

```powershell
flutter pub get
flutter run
```

Pentru device fizic sau iOS simulator seteaza API-ul explicit:

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
