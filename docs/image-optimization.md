# Procesarea și livrarea fotografiilor

## Fluxul implementat

1. Flutter/admin trimite fotografia o singură dată, ca multipart `image`, la `POST /uploads/images`, cu JWT de seller/admin.
2. Backend-ul admite cel mult două upload-uri simultane pe proces, înainte de buffering. Acceptă maximum 10 MB; Sharp/libvips validează conținutul real și maximum 40 megapixeli. Sunt acceptate JPEG, PNG și WebP statice, nu SVG sau animații.
3. Imaginea este orientată după EXIF, convertită în sRGB și redimensionată fără decupare sau mărire. EXIF/GPS și celelalte metadate originale nu sunt păstrate.
4. Se generează WebP pentru lățimi țintă 320, 960 și 1920 px, cu înălțimi maxime 640, 1920 și 2560 px. Calitățile sunt 82/85/88; transparența și imaginile paletate folosesc WebP lossless. Pentru surse mici sau variante care nu aduc o reducere de minimum 20% în lățime și octeți se păstrează mai puține fișiere.
5. Numai fișierele rezultate sunt încărcate în S3. Originalul este ținut temporar în memoria cererii și nu este salvat în S3 sau pe disc de către backend. În producție, reverse proxy-ul poate avea propriul buffering; configurează-l conform politicii de stocare temporară.
6. Cheile sunt `images/v1/<hash>/<width>x<height>.webp`, cu `Cache-Control: public, max-age=31536000, immutable`. Hash-ul include contul, octeții sursei și versiunea pipeline-ului. Reîncărcarea exactă a aceluiași fișier de către același cont reutilizează asset-ul, fără duplicate S3.
7. MongoDB păstrează în `imageassets` starea procesării, proprietarul și manifestul variantelor: dimensiuni, chei, octeți. Cererile duplicate simultane folosesc o revendicare atomică; operațiile eșuate pot fi reluate, iar cele întrerupte pot fi revendicate după 5 minute. La modificarea encoderului/preseturilor trebuie incrementată versiunea pipeline-ului pentru a păstra URL-urile imuabile.
8. Publicarea acceptă numai un asset optimizat, finalizat și deținut de vânzător. `imageUrl` și `imageVariants` sunt stabilite de server din manifest, nu din URL-uri inventate de client. Starea nu devine `ready` înainte de confirmarea tuturor upload-urilor S3.

Răspunsul endpoint-ului conține `imageKey`, `imageUrl`, `variants`, `sourceBytes`, `totalBytes`. Anunțul se creează folosind `imageKey`/`imageUrl`; serverul salvează și manifestul verificat în `imageVariants`. Endpoint-ul vechi `/uploads/image-url` a fost eliminat pentru a nu ocoli procesarea. Clientul mobil/admin și backend-ul trebuie actualizate împreună.

Procesarea are un timeout libvips de 20 secunde pe variantă și 15 secunde pe operație S3. La încărcare mare, cererile suplimentare primesc 503 pentru retry în locul unei cozi nelimitate în RAM. Limita este per proces; pentru trafic mult mai mare, măsoară latența și separă procesarea într-un worker/coadă durabilă, păstrând același contract de asset. Nu există o promisiune de latență maximă independentă de hardware, rețea și fotografie.

## Afișare și cache

- Feed-ul preîncarcă pe disc numai fotografia următoare, cu un singur download în avans; swipe-urile rapide înlocuiesc lucrarea în așteptare și ieșirea din feed o anulează. Download-ul deja început poate fi finalizat în cache.
- Flutter alege cel mai mic fișier suficient pentru lățimea afișată și densitatea ecranului. Are cache persistent pentru maximum 160 fișiere, retenție 30 zile, și cache de imagini decodate limitat la 64 MB/160 intrări. Dimensiunea decodării este limitată la necesarul widgetului. Limita pe disc este exprimată în număr de fișiere, nu într-un buget fix de octeți.
- Site-ul folosește `ProductImage` și un loader Next.js pentru `srcset`/`sizes`. Browserul selectează o variantă existentă în S3/CDN; Next.js nu recomprimă din nou imaginile deja procesate. Listele, favoritele, camera de comparație și pagina produsului folosesc același mecanism.
- Anunțurile vechi fără manifest păstrează URL-ul fotografiei existente. Nu sunt recomprimate automat, iar imaginile existente nu sunt șterse de acest release.

Pentru fotografii, WebP este lossy: reducerea rezoluției și compresia nu pot garanta identitate pixel cu pixel sau calitate vizuală identică pentru orice sursă. Preseturile urmăresc diferențe greu de observat la afișare normală, fără tăierea produsului. Originalul nu este păstrat pentru arhivare/zoom fără limită. Fișierele deja optimizate pot aduce economii mici; variantele multiple pot ocupa, împreună, mai mult decât un singur original foarte eficient, în schimbul unor descărcări mai mici în liste.

## CloudFront și AWS

`PUBLIC_IMAGE_BASE_URL` poate rămâne gol pentru S3 cu citire publică, sau poate fi domeniul unei distribuții CloudFront. Exemplu:

```dotenv
PUBLIC_IMAGE_BASE_URL=https://YOUR_DISTRIBUTION.cloudfront.net
```

Pentru S3 privat + CDN:

1. Creează distribuția CloudFront cu bucketul S3 ca origin, fără `Origin path`; fișierele au deja prefixul `images/`.
2. Activează Origin Access Control, cu semnarea cererilor către S3. Adaugă declarația din [politica OAC](../backend/aws/images-cloudfront-oac-policy.example.json) la politica existentă a bucketului, înlocuind bucketul, ID-ul contului și distribuției. Aceasta este alternativa la citirea publică directă.
3. Pentru `images/*`, permite GET/HEAD, redirecționează HTTP către HTTPS și folosește o politică de cache care respectă `Cache-Control` cu TTL maxim de minimum 31536000 secunde. Nu trimite cookie-uri/autorizări în cheia de cache a fotografiilor publice.
4. Setează `PUBLIC_IMAGE_BASE_URL` la domeniul CloudFront și repornește backend-ul. URL-urile noi devin CDN; fotografiile deja publicate cu vechiul domeniu nu sunt rescrise automat.
5. Permite rolului backend `s3:PutObject` pe `images/*` și, pentru curățare, `s3:DeleteObject`. Exemplul IAM este în [images-iam-policy.example.json](../backend/aws/images-iam-policy.example.json).

Distribuția CloudFront nu este creată sau activată de cod. În verificarea anterioară, AWS a permis upload dar a refuzat citirea și ștergerea. Configurația de acces/CDN rămâne necesară; compresia nu remediază un 403 de permisiuni. Upload-ul web merge acum către backend, deci originea administratorului trebuie inclusă în `APP_ORIGIN`; PUT direct din browser către S3 nu mai este folosit.

La reverse proxy, permite un body puțin peste 10 MB pentru delimitările multipart (de exemplu `client_max_body_size 11m` în nginx) și un timeout de răspuns care să acopere procesarea (de exemplu 120 secunde). Nu include fișierele `.env` în imaginea Docker. Dockerfile-ul compilează și include Sharp/libvips pentru Node 22 Alpine; nu copia `node_modules` de pe macOS pe server.

## Curățarea încărcărilor abandonate

Din `backend`:

```sh
node scripts/cleanup-image-assets.cjs
node scripts/cleanup-image-assets.cjs --apply
```

Implicit este preview. Comanda aplicată verifică maximum 100 asset-uri mai vechi de 7 zile și elimină numai cele care nu sunt referite de anunțuri, folosind exclusiv cheile din manifestul validat. Publicarea reîmprospătează atomic referința asset-ului; curățarea revendică starea înainte de ștergere și verifică din nou existența anunțului. Operațiile eșuate rămân marcate pentru retry. După verificarea permisiunii DeleteObject, comanda poate fi programată zilnic pe server. Nu configura o regulă S3 de expirare pentru întreg `images/`, deoarece ar șterge și fotografii publicate.

## Verificare și măsurători

Testele de codec folosesc Sharp real: orientare, eliminarea EXIF, WebP, transparență, limitarea rezoluției, date corupte și refolosirea asset-urilor. Integrarea locală verifică multipart/JWT/roluri, dimensiunea inputului, upload-uri concurente, canonicalizarea URL-ului și refuzul publicării asset-ului altui vânzător. Folosește `npm run test:integration:images` cu replica set-ul temporar documentat în ghidul Stripe; testul refuză baze cloud și simulează transportul S3.

[Benchmark-ul local](image-optimization-benchmark.json) folosește trei JPEG-uri existente în repository, de circa 512 px lățime, deja comprimate. Variantele principale au fost cu 32–44% mai mici; totalul tuturor variantelor a fost cu aproximativ 9–26% mai mic. PSNR a fost circa 41–42 dB față de sursa decodată; nu este o garanție de echivalență perceptuală. Timpii măsurați sunt timpi locali ai encoderului, nu latențe de producție sau de CDN.

Referințe: [Sharp: opțiuni WebP și metadate](https://sharp.pixelplumbing.com/api-output/), [Sharp: redimensionare fără mărire](https://sharp.pixelplumbing.com/api-resize/), [CloudFront: controlul expirării cache-ului](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Expiration.html).
