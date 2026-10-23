# Plăți Stripe în aplicația mobilă — sandbox

Implementarea folosește PaymentSheet nativ în Flutter (iOS/Android), Stripe Identity găzduit și Stripe Connect Express. Cheile live sunt refuzate. Site-ul Next.js nu primește în această modificare formularul mobil.

## Regula confirmată

Înainte de ofertă, cumpărătorul achită o garanție rambursabilă de **10% din maximul ales**, rotunjită în sus la un ban. Comisionul Pinbind rămâne separat: configurația actuală este 5% din prețul final, reținut din suma vânzătorului.

Garanția este o plată efectivă în sandbox, nu o autorizare care poate expira înaintea licitației. Fiecare completare este o încasare separată cu cheie stabilă de idempotență. La creșterea maximului se solicită numai diferența. Din motive de procesare, maximul inițial trebuie să fie cel puțin 30 RON, iar fiecare plată/completare cel puțin 3 RON. O creștere care necesită o completare mai mică este refuzată cu explicație; nu se debitează automat mai mult. Prețul Buy Now pentru anunțurile noi este minimum 3 RON.

La închiderea licitației:

- Cel care pierde primește garanția integral. Inclusiv cel care a achitat-o, dar nu a mai trimis oferta.
- Câștigătorului i se scade garanția din preț. Surplusul se rambursează. În cazul unui rest între 0 și 3 RON, se păstrează un rest de 3 RON și se restituie diferența din garanție, pentru a respecta minimul de procesare.
- Dacă prețul este acoperit complet, cumpărătorul confirmă aplicarea garanției fără o nouă debitare.
- Dacă nu achită restul în termen, garanția se rambursează; nu s-a autorizat o penalizare/confiscare. Produsul nu este repus automat în vânzare.
- Fondurile alocate vânzătorului se transferă din încasările efective ale comenzii (garanție + rest), după confirmarea primirii și termenul configurat. Totalul transferurilor este exact prețul minus comision. Transferul în Connect nu înseamnă intrarea în bancă.

Nu există sold intern reutilizabil între licitații. Rambursările au timpi bancari și pot genera costuri de procesare pentru platformă. Regula comercială trebuie bugetată înainte de live.

## Unde este în aplicație

**Profil → Plăți și comenzi**, același acces din Activitate și din formularul de publicare:

1. Cumpărător: verifică identitatea prin Stripe. În sandbox, pagina oferă alegerea unui rezultat simulat; nu este necesar un document real.
2. Vânzător aprobat: poate publica și primi plăți înainte de Connect. Din Profil → Metode de plată și încasare alege persoană fizică/juridică și completează Connect cu date de test când vrea încasarea. Connect colectează verificările vânzătorului; verificarea Identity separată rămâne pentru cumpărători.
3. Publică un anunț nou. Pentru unul vechi, vânzătorul poate alege explicit „Activează Stripe”, numai dacă nu există oferte și anunțul este activ. Anunțurile cu oferte/rezervări vechi necesită revizuire; nu se debitează retroactiv.
4. Înainte de ofertă, acceptă sumarul garanției și plătește în PaymentSheet. Oferta se trimite numai după verificarea plății pe server. Dacă prețul se modifică în timpul plății, oferta poate necesita reluare; garanția rămâne legată de această licitație.
5. „Cumpără acum” creează rezervarea/comanda și deschide comenzile. Cumpărătorul vede prețul, garanția aplicată și restul, apoi apasă „Plătește prin Stripe”. Cumpărarea directă nu cere separat o nouă garanție.
6. Vânzătorul înregistrează curierul și trackingul după plată. Cumpărătorul confirmă primirea sau raportează o problemă. Problema blochează transferul.
7. După termenul configurat, workerul transferă suma în Connect dacă flagul de transfer este activ. Refundul integral înainte de transfer este disponibil din Administrare → Suport comenzi și prin API-ul administrativ și restituie atât garanția, cât și restul plătit.

Anularea formularului nu este marcată ca plată și nu trimite oferta. O intenție neplătită de garanție se anulează la renunțare, pentru a permite schimbarea maximului. Stripe rămâne sursa stării financiare; redirecturile nu dovedesc plata.

## Configurare

În `backend/.env`, exclus din Git:

```dotenv
STRIPE_ENABLED=true
STRIPE_PUBLISHABLE_KEY=pk_test_...
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_CONNECT_WEBHOOK_SECRET=whsec_...
STRIPE_AUTOMATIC_TRANSFERS_ENABLED=true
STRIPE_PLATFORM_FEE_BPS=500
STRIPE_PAYMENT_WINDOW_HOURS=48
STRIPE_RELEASE_DELAY_HOURS=1
STRIPE_MAX_FULFILLMENT_DAYS=30
STRIPE_IDENTITY_RETURN_URL=https://pinbind.bcmenu.ro/commerce/stripe/return
STRIPE_CONNECT_RETURN_URL=https://pinbind.bcmenu.ro/commerce/stripe/return
STRIPE_CONNECT_REFRESH_URL=https://pinbind.bcmenu.ro/commerce/stripe/refresh
```

Acestea sunt setări de test confirmate pentru proiect, nu instrucțiuni pentru operare live. Publicabilă și secretă trebuie să aparțină aceluiași sandbox. Aplicația obține doar cheia publicabilă din endpointul autentificat `/commerce/config`. Cheia secretă nu intră în Flutter.

Publică backendul actualizat, rulează `npm ci`, `npm run build`, `npm run check:env`, `npm run db:prepare:commerce` și repornește procesul. Pregătirea adaugă colecții/indexuri, fără seed sau migrarea automată a anunțurilor. Dacă există build Docker, folosește imaginea refăcută și env exclusiv pe server. Verifică rutele publice de webhook și paginile de revenire. Evenimentele enumerate în `stripe-marketplace.md` acoperă și garanțiile; nu se creează al treilea webhook.

După adăugarea SDK-ului Stripe este obligatoriu un build complet Flutter, nu numai hot reload. Android folosește FlutterFragmentActivity și AppCompat; iOS/Android au schema `pinbind` pentru revenire după autentificarea cardului. Apple Pay și Google Pay nu sunt activate în acest lot.

Pentru simulator, backend local:

```sh
python3 scripts/run_mobile.py --backend local --device AF83DCCA-EFEB-4EDE-85CE-271F3451C761
```

Backendul local folosește tot MongoDB-ul configurat în `.env`, inclusiv Atlas. Modificarea codului local nu actualizează serverul `pinbind.bcmenu.ro`.

## Verificare

```sh
cd backend
npm run check:stripe:mobile
npm run test:stripe:sandbox
npm run test:integration:commerce
```

Primul script verifică perechea de chei cu o intenție neplătită, anulată la final. Al doilea încasează numai sume **simulate**, prin metodele oficiale Stripe de test: garanție 10 RON, rest 90 RON, provocare 3DS și card refuzat. La final rambursează plățile simulate și anulează restul. Nu atinge MongoDB și nu folosește carduri reale.

Integrarea commerce folosește MongoDB replica set local temporar, refuză hosturile cloud și simulează SDK-ul extern. Verifică JWT, Identity, Connect, garanție obligatorie, completare, anulare, idempotență, rambursări pentru pierzători/neparticipanți, credit/exces, transferuri din mai multe surse, răspuns de transfer pierdut, expirare și activare explicită a anunțurilor. Nu înlocuiește proba completă cu două conturi în aplicație și un Connect configurat în sandbox.

Pentru formularul nativ, Stripe documentează cardul de test `4242 4242 4242 4242`, o dată viitoare și orice CVC de test. Nu folosi datele unui card real în sandbox. Vezi [metodele de test Stripe](https://docs.stripe.com/testing).

## Ce rămâne înainte de live

Cheile live sunt intenționat blocate. Sunt încă necesare testarea manuală a circuitului complet cumpărător/vânzător, configurarea reală Connect, confirmarea politicilor comerciale/costurilor, tratarea operațională a disputei sau transferului incert, reversări după transfer, monitorizare și reconciliere contabilă. O garanție ori un transfer cu stare incertă de peste 20 de ore intră la revizuire; nu se repetă orbește o mișcare de bani după expirarea ferestrei de idempotență.

Anunțurile cu garanții contestate nu sunt acordate automat altui participant; pot fi ascunse la închidere pentru revizuire. UI-ul nu prezintă transferul în Connect ca payout bancar.

Surse: [PaymentSheet Flutter](https://docs.page/flutter-stripe/flutter_stripe/sheet), [Stripe Connect](https://docs.stripe.com/connect/separate-charges-and-transfers), [limitele autorizărilor pe card](https://docs.stripe.com/payments/place-a-hold-on-a-payment-method).

## Verificări efectuate în această modificare

- 53 teste unitare backend și 37 teste Flutter; analiza Flutter fără observații.
- Integrarea locală commerce și cea de imagini au trecut, cu baze temporare separate și Stripe/S3 simulate.
- Build iOS simulator cu SDK-ul nativ Stripe reușit; pagina Plăți și comenzi verificată în simulator.
- Cheile publică/secretă verificate cu Stripe sandbox real, fără afișarea lor. Testele RON, 3DS, card refuzat și refund au trecut folosind metode Stripe de test; toate plățile simulate reușite au fost rambursate.
- Verificarea Identity a contului de test existent a fost simulată cu succes în pagina Stripe; aplicația a recitit rezultatul real. Nu s-au folosit documente reale.
- Verificările inițiale de mai sus nu includeau deploy pe server. Nu s-a finalizat o probă manuală cu un vânzător Connect și formularul PaymentSheet pe un produs în aplicație; aceasta rămâne necesară înainte de orice afirmație de validare completă cu providerul.

## Încasarea vânzătorului după prima plată

Publicarea, activarea unui anunț fără oferte și plata unei comenzi verifică rolul de vânzător și faptul că nu este blocat, fără să ceară cont Connect. PaymentIntent este pe platformă, fără `transfer_data` sau `on_behalf_of`. Suma vânzătorului rămâne fixată pe comandă, nu este un portofel reutilizabil.

Profil → Metode de plată și încasare arată sumele după comision, separat: așteptare livrare/termen, eligibile pentru transfer, transfer în curs și transferate către Stripe. Configurează încasările cere `individual` sau `company` și deschide Stripe într-un browser securizat în aplicație (Safari View Controller / Custom Tabs, cu fallback browser extern). Datele bancare/documentele nu sunt colectate de Flutter. Tipul ales este păstrat înaintea creării contului și nu poate fi schimbat în timpul unei reluări cu aceeași cheie de idempotență.

`POST /commerce/seller/onboarding` cere `{ "businessType": "individual" }` sau `{ "businessType": "company" }`. `GET /commerce/seller/earnings` returnează numai sumele contului autentificat. `POST /commerce/seller/withdraw` verifică Stripe și reia numai comenzile proprii eligibile; nu poate ocoli livrarea, intervalul de reclamații, disputele, termenul de revizuire sau flagul de transfer. Workerul reia și automat transferurile eligibile după finalizarea Connect.

O comandă livrată fără Connect rămâne `delivered`, cu `payoutSetupRequired=true`; nu începe artificial tentativa de transfer și fereastra ei de idempotență. Destinația este fixată înainte de prima cerere de transfer. Se verifică în Stripe atât capabilitatea `transfers`, cât și `payouts_enabled`, inclusiv când cache-ul local este vechi. Termenul existent `fundsReviewAt` rămâne activ: după termen comanda intră în `review_required`, nu este transferată automat și necesită rezolvare prin suport/refund după caz. Acesta nu este un mecanism de păstrare nelimitată a fondurilor.

Nu este necesară o cheie nouă sau o schimbare în `.env`. Backendul și Flutter trebuie actualizate împreună. `/commerce/config` anunță noul flux prin `deferredSellerOnboarding=true`. Rezervările și ofertele vechi rămân nemigrate. Cheile live continuă să fie refuzate.

Verificări pentru acest flux: 53 teste unitare backend, 39 teste Flutter și integrarea pe replica set local cu Stripe simulat. Integrarea verifică publicarea și plata fără Connect, încasare blocată înainte de configurare, alegerea companie/persoană, reluare după răspuns pierdut, capabilități Stripe actualizate, transfer unic și termen de revizuire. Nu reprezintă o probă completă cu onboarding Stripe real și virament bancar.

Referințe: [încasare și transferuri separate](https://docs.stripe.com/connect/separate-charges-and-transfers), [onboarding găzduit de Stripe](https://docs.stripe.com/connect/hosted-onboarding), [onboarding în browserul aplicației iOS](https://docs.stripe.com/connect/enable-payment-acceptance-guide?platform=ios&ui=payment-sheet).

API-ul Stripe sandbox real a acceptat separat crearea Express RO pentru `individual` și `company`; cele două conturi tehnice temporare au fost șterse imediat. Nu au avut plăți sau documente reale.

## Checkout mobil în tema Pinbind

Cumpărarea deschide `/checkout/:id`, separat de istoricul `/commerce`. Linkurile vechi `/commerce?order=...` deschid același checkout. Sunt afișate fotografia și vânzătorul, prețul fixat pe comandă, garanția deja achitată, restul, termenul rezervării și un buton de plată fix jos. Verificările de identitate/încasări rămân în profil; când identitatea cumpărătorului lipsește, checkoutul oferă acces la verificare.

PaymentSheet are culorile neutre Pinbind, colțuri rotunjite și buton explicit cu suma citită din PaymentIntent. Formularul oferă plata cu cardul, fără opțiunea Link. SDK-ul refuză intenții live, altă monedă sau o sumă sub politica de 300 bani. Callback-ul formularului nu confirmă singur plata: checkoutul recitește comanda din backend, afișează procesarea dacă este necesar și păstrează erorile chiar dacă intervine refreshul periodic.

Backendul refuză comenzile importate sub minim înainte de a crea o intenție nouă. Publicarea normală valida deja minimul; problema mostrelor era în generatorul separat, unde 100 bani fuseseră introduși în loc de lei. Generatorul folosește acum valori explicite în bani și verifică minimul.

`backend/scripts/repair-demo-prices.cjs` este limitat la cele trei ID-uri DEMO și implicit afișează numai planul. `--apply` corectează numai mostre active fără oferte/garanții și rezervarea BMW de test identificată explicit, neplătită. Refuză cheile live, plăți în procesare/încasate, alte comenzi și anunțuri reale. Salvează backup privat în directorul temporar, anulează intenția neplătită verificată în Stripe, folosește lease-urile aplicației și actualizează produsul/comanda într-o tranzacție. Noua tentativă primește un ID nou; comisionul existent este păstrat. Valorile simulate aprobate sunt BMW 125.000 RON, Audi 45.000 RON, poster 100 RON. Nu este un mecanism general de modificare a prețurilor comenzilor.

Verificări: 53 teste unitare backend, 43 teste Flutter, analiză Flutter, build iOS simulator și integrare pe replica set local cu Stripe simulat. Testele checkoutului includ sumă de 1 RON refuzată înainte de formular, preț mare pe ecran de telefon, aplicarea garanției, confirmare canonică și eroare persistentă după refresh.

Proba manuală în simulator a finalizat plata BMW DEMO de 125.000 RON prin PaymentSheet cu cardul public de test Stripe. Backendul public a confirmat starea `paid`, iar noul checkout a afișat confirmarea și butonul de acces la comenzi, fără o nouă opțiune de plată. Audi și posterul au rămas active pentru testele utilizatorului. Nu s-a confirmat livrarea și nu s-a făcut transfer către vânzător în această probă.
