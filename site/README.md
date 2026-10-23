# Pinbind — Site

Next.js / TypeScript / App Router, cu paginile principală, Explore și detalii licitație adaptate din designurile furnizate.
Fontul Montserrat și logo-ul sunt servite local. Catalogul folosește anunțurile reale din API: căutare, categorii, interval de preț, stadiu, sortare și paginare pe server. Videoclipurile nu se redau automat în grilă; cardurile deschid pagina dedicată a anunțului.

## Site și backend în Docker

Din rădăcina proiectului:

```sh
docker compose up -d --build
```

- Site: http://localhost:3002
- Backend: http://localhost:3000
- MongoDB: conexiunea existentă din `backend/.env` (nu se creează MongoDB local).

Configurația comună reutilizează proiectul Compose `backend` existent, pentru a evita două instanțe pe portul 3000. De acum folosește comenzile Compose din rădăcină pentru ambele servicii.

```sh
docker compose logs -f site
docker compose down
```

Pentru doar site, cu backend-ul pornit separat pe host:

```sh
cd site
docker compose up -d --build
```

Nu porni simultan cele două variante Compose ale site-ului: ambele expun portul 3002.

## Dezvoltare locală

```sh
cd site
npm ci
npm run dev
```

Proxy-ul server-side folosește `API_INTERNAL_URL` (implicit `http://127.0.0.1:3000`). În Docker, acesta este `http://backend:3000`. URL-ul intern nu ajunge în JavaScript-ul browserului; nu sunt necesare schimbări CORS pentru site.

```sh
npm run lint
npm run build
npm test
```

## Comportament

- `/`: pagina principală cu anunț în prim-plan, categorii, licitații active, explicații și secțiune pentru vânzători.
- `/despre`: pagina editorială Despre Pinbind, cu principiile platformei, imagini locale din design, perspectivele comunității și statistici reale încărcate separat pe server.
- `/explore`: catalogul Explore, în română, cu prețuri RON și date reale.
- Linkurile vechi `/?q=…`, `/?categoryId=…`, `/?stage=…` redirecționează către catalog.
- Imaginile de categorii din design sunt în `public/categories`; fotografiile și videoclipurile anunțurilor provin din API.
- Selecția de pe prima pagină folosește filtre și paginare pe server (4 anunțuri/pagină), cu anularea cererilor înlocuite și actualizare doar când fila este vizibilă.
- Nu se simulează streaming live, spectatori, oferte sau recenzii. Secțiunile de prezentare descriu funcțiile existente.
- `/anunturi/[id]`: pagina de detalii adaptată din designul furnizat, cu player video, descriere, detalii, vânzător și panou de preț.
- Header-ul și footer-ul se află în layout-ul comun și rămân montate la navigarea între catalog și anunțuri.
- `/api/catalog`, `/api/categories`, `/api/products/[id]`: endpoint-uri same-origin către datele publice. Răspunsul de detalii include doar câmpurile necesare paginii, fără contactele vânzătorului și identitatea rezervării.
- Căutarea din header se trimite cu Enter; linkurile de categorie și licitații active folosesc parametrii catalogului.
- Pagina anunțului se încarcă pe server și reîmprospătează prețul la 30 s; contorul se actualizează izolat. Stările de anunț încheiat, rezervat, vândut, retras și indisponibil sunt tratate separat.
- Filtrele anulează cererile vechi; căutarea este temporizată 300 ms.
- Datele sunt reîmprospătate la 30 s numai când fila este vizibilă; nu este un flux live de licitare.
- Inimile sunt semne de carte locale, salvate în browser. Nu modifică favoritele contului și nici contoarele MongoDB.
- `/cont/favorite`: favoritele contului, cu filtre, carduri prioritare, căutare, sortare, paginare și tipărire/PDF a întregii selecții filtrate. Adăugarea și eliminarea sunt confirmate de API înainte de actualizarea listei. Un snapshot de cont pornit înainte de o modificare nu suprascrie modificarea confirmată.
- `/api/favorites/[id]`: POST/DELETE autentificate, cu verificarea originii și fără expunerea datelor private din răspunsul backend.
- Reperele de preț și afișarea lor sunt setări locale browserului, separate pe cont, fără notificări SMS/email/push.
- `/cont/anunturi`: inventarul personal, cu stări calculate din datele reale (programate, active, rezervate, încheiate), filtre, căutare, sortare și paginare la 6 carduri. Publicarea și administrarea se fac în aplicația mobilă.
- `/cont/video`: cameră de vizionare pentru videoclipurile licitațiilor active, cu player principal, grilă 2×2 (maximum 4 videoclipuri), schimbarea produsului și participarea proprie. Nu simulează streaming live, spectatori sau oferte ale altor conturi.
- Modul principal încarcă un singur player; în grilă videoclipurile sunt mute implicit și sunetul se poate activa pentru unul singur. Nu există autoplay; previzualizările secundare nu încarcă playere.
- `/cont/oferte`: pagina dedicată ofertelor și istoricului, cu filtre, căutare, sortare, paginare și export CSV al selecției. Exportul este un rezumat, nu un document fiscal.
- `/cont`: panoul utilizatorului, cu autentificare prin contul existent din aplicație, oferte grupate pe anunț, favorite, anunțuri proprii și datele profilului.
- `/cont/verificare`: datele profilului, rolul contului și istoricul cererilor de vânzător, cu filtre și paginare. Rezumatul tipăribil nu reprezintă o certificare a identității. KYC, conturile bancare, soldurile și escrow sunt marcate indisponibile.
- `/api/verification`: citește exclusiv cererile utilizatorului autentificat, cu `private, no-store`; proiectează doar identificatorul, starea și datele cererii, fără note sau datele evaluatorului.
- `/api/session`: autentificare și deconectare. Tokenul backend este păstrat într-un cookie HttpOnly, SameSite=Lax (Secure pe HTTPS); nu este returnat JavaScript-ului. Cererile de modificare a sesiunii verifică originea.
- `/api/dashboard`: datele utilizatorului autentificat, cu `private, no-store`. Endpoint-urile backend verifică tokenul la fiecare cerere. O eroare parțială rămâne o secțiune indisponibilă, fără contoare inventate.
- Layout-urile `(platform)` și `(account)` separă prezentarea publică de panoul cu navigare laterală. Sesiunea, meniul și actualizarea periodică a datelor persistă la navigarea între `/cont`, `/cont/oferte` `/cont/video` și `/cont/anunturi`. Legăturile `?section=favorites|products|profile` deschid secțiunile corespunzătoare. URL-urile publice existente sunt păstrate.
- Panoul se actualizează la 30 secunde cât fila este vizibilă, grupează ofertele pe produs și afișează 12 rânduri pe pagină. „Licitații încheiate” nu presupune câștig sau tranzacție finalizată.
- Căutările salvate sunt locale browserului (maximum 8), fără notificări SMS sau email.
- Publicarea și licitarea se fac în continuare în aplicația mobilă. Panoul web oferă acces de citire la activitatea contului; nu afișează solduri, limite escrow sau garanții care nu există în API.
- `npm test`: teste cu date fictive pentru agregarea ofertelor, proiecția datelor, originea cererilor, autentificare, cookie, expirarea sesiunii și erori parțiale. Nu accesează conturi sau MongoDB.
- Nu sunt afișate loturi fictive, statistici inventate, conversii EUR/USD sau garanții de autentificare/escrow care nu există în API.
