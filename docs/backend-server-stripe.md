# Backend pe server, MongoDB cloud și Stripe sandbox

Backend-ul folosește `MONGODB_URI` din `backend/.env` atât local cât și pe server. Colecțiile pentru Stripe sunt în aceeași bază configurată, fără o bază Mongo locală obligatorie. Testele automate de integrare își folosesc separat propria bază locală temporară.

## Ce este pregătit

Colecțiile `commerceaccounts`, `commerceorders`, `stripeinboxes`, `commercelocks`, indexurile unice și indexul TTL pentru lockuri se pregătesc cu `db:prepare:commerce`. Comanda este repetabilă și adaugă colecții/indexuri; nu șterge indexuri, nu introduce utilizatori de test și nu migrează anunțurile vechi. Necesită permisiuni de creare a colecțiilor/indexurilor și un replica set sau cluster sharded pentru tranzacții. Atlas îndeplinește cerința de topologie.

La pregătirea acestei versiuni comanda a rulat cu succes pe MongoDB-ul cloud din `.env`. Nu este necesar să copiezi datele pe server; serverul se conectează la aceeași bază.

## Fișierul de mediu

`backend/.env` este fișierul privat existent, completat cu variabilele Stripe. URI-ul Mongo și cheile AWS sunt păstrate. Secretul JWT prea scurt a fost înlocuit cu unul aleator de 48 de octeți; utilizatorii trebuie să se autentifice din nou după deploy. `.env` a fost scos din indexul Git, iar exemplele nu conțin secrete. Excluderea nu elimină secretele din istoricul Git existent; înlocuiește cheile expuse înainte de o distribuire a repository-ului.

Pe server poți copia privat `.env` existent sau porni de la `backend/.env.server.example`. Nu suprascrie fișierul existent cu exemplul, deoarece exemplul nu conține credențialele cloud. Valorile marcate `YOUR_*`, `USER`, `PASSWORD`, `CLUSTER` trebuie înlocuite.

| Variabilă | Ce completezi |
| --- | --- |
| `MONGODB_URI` | URI-ul cloud existent, cu numele explicit al bazei; permite IP-ul serverului în Atlas |
| `JWT_SECRET` | Secretul generat din `.env`, identic pe toate instanțele backend |
| `APP_ORIGIN` | Originile site-ului și adminului, separate prin virgulă, fără slash final sau cale |
| `AWS_*`, `PUBLIC_VIDEO_BASE_URL` | Configurația existentă pentru video; pe un server cu IAM role cheile AWS pot lipsi |
| `STRIPE_SECRET_KEY` | Cheie secretă `sk_test_...` a contului sandbox; niciodată cheie live |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` al webhook-ului contului platformei |
| `STRIPE_CONNECT_WEBHOOK_SECRET` | Alt `whsec_...`, pentru webhook-ul conturilor Connect |
| `STRIPE_IDENTITY_RETURN_URL` | `https://pinbind.bcmenu.ro/commerce/stripe/return` |
| `STRIPE_CONNECT_RETURN_URL` | `https://pinbind.bcmenu.ro/commerce/stripe/return` |
| `STRIPE_CONNECT_REFRESH_URL` | `https://pinbind.bcmenu.ro/commerce/stripe/refresh` |

Paginile de revenire sunt servite de backend, fără autentificare și fără a marca utilizatorul verificat. Pagina `refresh` cere reluarea onboarding-ului; un link nou se obține prin endpoint-ul autentificat de onboarding.

Setează explicit politicile înainte de activare. Pentru un scenariu de test poți folosi valorile de mai jos; acestea nu sunt termeni comerciali aprobați:

```dotenv
STRIPE_PLATFORM_FEE_BPS=500
STRIPE_PAYMENT_WINDOW_HOURS=48
STRIPE_RELEASE_DELAY_HOURS=48
STRIPE_MAX_FULFILLMENT_DAYS=30
```

Aceste valori înseamnă comision 5%, termen de plată 48 ore, eliberare la 48 ore după confirmarea primirii, revizuire după 30 zile fără finalizarea livrării. Pentru testarea rapidă a eliberării poți alege 1 oră. Nu există variabile publice Stripe necesare backend-ului; cheia `pk_test_...` va fi folosită de viitoarea integrare mobil/web.

## Stripe și webhook-uri

Configurează Connect și accesul Identity în contul Stripe de test. În sandbox/test creează două destinații de evenimente, folosind domeniul HTTPS public al API-ului:

1. Evenimente ale **platformei** → `https://pinbind.bcmenu.ro/commerce/webhooks/stripe`.
2. Evenimente ale **conturilor conectate** → `https://pinbind.bcmenu.ro/commerce/webhooks/connect`, cu `account.updated`.

Lista completă a evenimentelor platformei este în [stripe-marketplace.md](stripe-marketplace.md#configurare-și-activare). Selectează explicit și `identity.verification_session.redacted`. Copiază fiecare signing secret în variabila corespunzătoare; nu refolosi secretul unui listener Stripe CLI pentru destinațiile de pe server. Reverse proxy-ul trebuie să lase corpul cererii nemodificat și să expună aceste rute fără login la nivel de proxy; verificarea lor se face prin semnătura Stripe.

Referințe Stripe: [Identity în modul test](https://docs.stripe.com/api/identity/verification_sessions/create), [webhook-uri Connect](https://docs.stripe.com/connect/webhooks). În modul test nu are loc o verificare reală a documentelor.

Când toate câmpurile sunt completate, setează `STRIPE_ENABLED=true`. Pentru un test complet al transferului către vânzător setează și `STRIPE_AUTOMATIC_TRANSFERS_ENABLED=true`; cu `false`, transferurile automate rămân oprite.

## Pornire fără Docker

Din directorul `backend`, cu Node.js 22 și acces la rețea către Atlas, Stripe și S3:

```sh
npm ci
npm run check:env
npm run db:prepare:commerce
NODE_ENV=production npm run start:prod
```

`check:env` compilează și verifică setările de server fără conexiuni externe. Când Stripe e activ, lipsa cheilor/webhook-urilor/politicilor oprește pornirea cu numele câmpului greșit, fără afișarea secretelor. `db:prepare:commerce` verifică accesul la Mongo și suportul pentru tranzacții, apoi pregătește indexurile. Nu rula `seed` pe baza existentă.

## Pornire cu Docker Compose

Încarcă repository-ul și `backend/.env` pe server, apoi, din `backend`:

```sh
docker compose build backend
docker compose run --rm --no-deps backend node scripts/check-env.cjs
docker compose run --rm --no-deps backend node scripts/prepare-commerce-db.cjs
docker compose up -d backend
docker compose logs --tail=100 backend
```

După modificarea `.env`, aplică setările cu `docker compose up -d --force-recreate backend`. Compose setează `NODE_ENV=production`. Configurează reverse proxy-ul HTTPS spre portul 3000 și accesul IP-ului serverului în Atlas. Nu este necesar un serviciu Mongo în Compose.

## Prima verificare funcțională

1. Autentifică două conturi de test și păstrează JWT-urile separat. `GET /commerce/me` trebuie să arate `enabled: true` și `mode: test`.
2. Pentru fiecare, `POST /commerce/identity/session`, deschide URL-ul returnat și finalizează scenariul de test Stripe; verifică rezultatul din `GET /commerce/me` după procesarea webhook-ului.
3. Un vânzător aprobat în aplicație apelează `POST /commerce/seller/onboarding`, finalizează configurarea de test și verifică eligibilitatea din `/commerce/me`.
4. Creează un anunț nou după activarea Stripe. Anunțurile vechi rămân pe fluxul vechi. Folosește un cumpărător verificat și rezervă/câștigă produsul.
5. Creează comanda prin `POST /commerce/products/:id/order`, apoi plata prin `POST /commerce/orders/:id/payment`. Backend-ul returnează `clientSecret`; confirmarea interactivă a cardului/SCA necesită integrarea Stripe din client. Nu introduce date de card în API-ul nostru.
6. După confirmarea Stripe: vânzătorul trimite expedierea, cumpărătorul confirmă primirea, apoi verifică transferul după intervalul configurat. Rulează separat reclamație, refund și expirare. Consultă rutele și body-urile în [documentația API](stripe-marketplace.md#api).

Worker-ul procesează la aproximativ 15 secunde. Ecranele Flutter/Next.js pentru plata cardului, verificare și comenzi rămân de implementat; backend-ul poate fi configurat și testat prin API acum, dar testul interactiv complet al cumpărării necesită clientul Stripe. Această versiune acceptă numai chei test și nu este activare cu bani reali.
