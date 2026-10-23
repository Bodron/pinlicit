# Anunțuri cu fotografii

Fluxul de upload este acum optimizat pe server: [procesare, cache și CloudFront](image-optimization.md). Se folosește `POST /uploads/images` multipart, urmat de publicarea asset-ului verificat. Vechiul endpoint de URL PUT direct a fost eliminat.

## Datele vechi

Citirea produselor ascunde referințele vechi la clipuri. O fotografie de copertă existentă este folosită ca imagine principală; fără ea se afișează un substituent. Câmpurile imagine rămân opționale în schema Mongo pentru ca salvarea unei licitații vechi fără fotografie să continue să funcționeze. Crearea prin API cere obligatoriu fotografia nouă.

Din `backend`, inventariază fără modificări:

```sh
node scripts/migrate-images.cjs
```

Pentru un plan local cu ID-urile produselor și cheile S3, setează `MEDIA_PLAN_FILE` la o cale privată. Nu publica planul în Git.

```sh
MEDIA_PLAN_FILE=/tmp/pinbind-media-plan.json node scripts/migrate-images.cjs
```

Aplicarea metadatelor copiază imaginile de copertă valide în `imageUrl` și elimină vechile câmpuri media, păstrând anunțurile, ofertele și comenzile:

```sh
node scripts/migrate-images.cjs --apply
```

Ștergerea explicită a obiectelor video ale aplicației:

```sh
node scripts/migrate-images.cjs --apply --delete-videos
```

Ultima comandă șterge numai obiectele cu extensii video din `videos/`, condiționat de ETag-ul inventariat. Nu șterge imagini, alte prefixe sau anunțuri. Dacă bucketul are versionare, versiunile anterioare nu sunt eliminate. Pentru `AccessDenied`, administratorul AWS trebuie să acorde `s3:ListBucket` pe bucket (poate fi restrâns la prefixul `videos/`) și `s3:DeleteObject` pe `arn:aws:s3:::NUME_BUCKET/videos/*`. Permisiunile de upload/read pentru `images/*` rămân necesare pentru aplicație.

Nu folosi `seed` pentru această schimbare. Migrarea nu inventează fotografii pentru anunțurile care aveau numai un clip.

## Configurația AWS verificată în această sesiune

Migrarea metadatelor a fost aplicată celor 3 anunțuri vechi; nu aveau fotografii de copertă. Citirea lor nu mai folosește clipuri. La verificarea S3, PUT pentru o imagine PNG a răspuns 200, dar GET public, GET semnat, listarea `videos/` și ștergerea au fost refuzate cu AccessDenied/403. Nu s-au șters clipuri din S3.

Sunt pregătite trei exemple fără credențiale. Înlocuiește `YOUR_BUCKET` cu valoarea `AWS_S3_BUCKET`:

1. În AWS Console → IAM → utilizatorul/rolul cheii backend → Permissions, adaugă declarațiile din [politica IAM](../backend/aws/images-iam-policy.example.json). Aceasta permite citirea/încărcarea/ștergerea imaginilor și inventarierea/ștergerea vechiului prefix de clipuri.
2. Pentru adrese S3 publice directe: S3 → bucket → Permissions → Bucket policy, adaugă declarația din [politica de citire publică](../backend/aws/images-public-read-policy.example.json), păstrând celelalte declarații existente. Politica face publice numai imaginile produselor din `images/`, nu întreg bucketul. Setările Block Public Access trebuie să permită această politică. Dacă folosești CloudFront cu un origin privat, configurează accesul CloudFront la imagini și setează `PUBLIC_IMAGE_BASE_URL` la domeniul distribuției în locul accesului public direct S3.
3. În S3 → Permissions → CORS, adaugă originile și metodele necesare folosind [exemplul CORS](../backend/aws/images-cors.example.json). Dacă adminul are alt domeniu, adaugă și originea lui.
4. Repetă inventarul și, după verificarea numărului de fișiere, rulează `node scripts/migrate-images.cjs --apply --delete-videos`.

Imaginea tehnică de test de un pixel a rămas în `images/f02d84bb-0aea-4296-be97-e99871191acc.png`, deoarece DeleteObject a fost refuzat. Poate fi eliminată din consola S3 după acordarea permisiunii; nu este legată de niciun anunț.
