# Fotografii ilustrative pentru cele trei anunțuri existente

Au fost completate numai câmpurile media și o notă în descriere pentru anunțurile BMW, Audi A4 și Caine Bichon. Prețurile, ofertele, rezervările, cumpărătorul și datele de încheiere sunt păstrate. Toate trei erau `reserved`, nu anunțuri active în feed.

Imaginile sunt ilustrative, nu fotografii ale produselor reale. Nota este vizibilă în descriere. Sursele și licențele sunt în [manifest](../backend/scripts/demo-listing-images.json):

- [BMW sedan](https://commons.wikimedia.org/wiki/File:BMWcar.jpg), Jackson2161, CC0.
- [Audi A4 B8](https://commons.wikimedia.org/wiki/File:Audi_A4_B8.jpg), Thomas Wolf, CC0.
- [Bichon](https://commons.wikimedia.org/wiki/File:Bichon2.JPG), Patrick Huebgen, domeniu public.

Sistemul existent a generat și încărcat variantele WebP în S3. La verificare, atât GET public cât și GET autentificat erau refuzate de AWS cu 403/AccessDenied. Pentru afișare se folosesc temporar trei dimensiuni publice de la Wikimedia; URL-urile au fost verificate prin backendul de pe domeniu și răspund 200. Nu s-au modificat politicile IAM, bucket sau setările de acces public.

## Reaplicare după repararea accesului AWS

Din `backend`, cu `.env` privat și conectarea la baza corectă:

```sh
node scripts/backfill-demo-images.cjs
node scripts/backfill-demo-images.cjs --apply
```

Prima comandă doar verifică sursele și planul. A doua este limitată la cele trei ID-uri/titluri din manifest, reutilizează uploadurile optimizate și trece la variantele S3 numai dacă fotografia poate fi citită public. Nu înlocuiește o fotografie reală adăugată între timp. O editare concurentă oprește actualizarea documentului respectiv.

Backupul inițial al câmpurilor media și descrierilor este local, în `/private/tmp/pinbind-listing-illustrations/product-media-backup.json`; nu este publicat în Git. Scriptul păstrează primul backup la reluare. Directorul poate fi ales cu `DEMO_IMAGE_WORK_DIR`; pe un alt sistem se folosește directorul temporar al sistemului. Nu restaura integral documentele Product dintr-un backup: restaurarea trebuie să privească numai câmpurile media, pentru a păstra angajamentele licitației.

## Mostre active în feed

Cele trei originale sunt rezervate și nu apar în feedul activ. `scripts/add-demo-listings.cjs --apply`, rulat din `backend`, adaugă separat trei mostre: BMW — DEMO, Audi A4 — DEMO și Poster Bichon — DEMO (Casa). Fără `--apply` verifică numai planul și imaginile. Scriptul refuză cheile Stripe care nu sunt sandbox, folosește ID-uri stabile și nu modifică mostre existente la reluare. Nu pornește aplicația sau workerul și nu creează comenzi ori plăți.

Mostrele refolosesc imaginile ilustrative, au prețuri de test și expiră la 14 zile după inserare. Nu sunt marcate artificial ca pregătite pentru Stripe: nu au `commerceVersion`, astfel încât API-ul cu Stripe activ refuză cumpărarea/licitația până la activarea explicită a anunțului de către vânzător după Identity și Connect. Rolurile, verificările și rezervările existente sunt păstrate. Verificarea prin API-ul public a confirmat trei mostre active, imagini cu răspuns 200 și trei variante pentru fiecare.

### Activarea mostrelor după actualizarea backendului

După publicarea backendului cu `deferredSellerOnboarding=true`, `node scripts/add-demo-listings.cjs --enable-stripe` verifică planul fără modificări. `node scripts/add-demo-listings.cjs --apply --enable-stripe` înscrie numai aceste trei mostre în checkout sandbox. Cere buildul nou și Stripe sandbox activ, verifică vânzătorul eligibil și folosește tranzacții; omite mostrele rezervate/expirate sau cu oferte, garanții ori comenzi. Nu modifică cele trei anunțuri originale și nu fabrică un rezultat Identity/Connect. Sumele sunt simulate, iar descrierile păstrează eticheta demonstrativă. Nu rula activarea înainte să actualizezi procesul public.

## Catalog suplimentar — 24 octombrie 2026

Lotul `pinbind-catalog-demo-2026-10-v1` adaugă 12 mostre separate: cameră foto, căști, laptop, ceas, sneakers, ținută casual, decorațiuni de Crăciun, Audi coupé, lampadar, partituri, BMW albastru și telefon cu căști. Sunt distribuite în cele cinci categorii existente. Prețurile sunt în bani, cu afișare în RON; licitațiile expiră eșalonat după 3–14 zile.

Fotografiile au fost verificate vizual și descărcate pentru verificarea formatului/dimensiunilor. Fiecare anunț are trei dimensiuni publice Pexels (320, 960 și 1280), fără a depinde de accesul S3. Sursele sunt în [manifestul catalogului](../backend/scripts/catalog-demo-products.json), în metadatele `demoImage` și în descrierea fiecărui anunț. Se aplică [Pexels License](https://www.pexels.com/license/). Sunt imagini ilustrative pentru produse fictive, marcate DEMO.

Din `backend`:

```sh
node scripts/add-catalog-demos.cjs --enable-stripe
node scripts/add-catalog-demos.cjs --apply --enable-stripe
```

Prima comandă verifică planul, fără scrieri. A doua adaugă mostrele cu checkout sandbox și verifică existența vânzătorului demo eligibil, Stripe în modul test și suportul backendului pentru onboarding amânat. Nu creează plăți, oferte sau comenzi și nu modifică verificările contului. Fără `--enable-stripe`, mostrele sunt doar de afișare. ID-urile sunt stabile: reluarea omite documentele existente fără a le reactiva, schimba sau duplica, inclusiv dacă au fost vândute.
