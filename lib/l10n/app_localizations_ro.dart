// ignore: unused_import
import 'package:intl/intl.dart' as intl;
import 'app_localizations.dart';

// ignore_for_file: type=lint

/// The translations for Romanian Moldavian Moldovan (`ro`).
class AppLocalizationsRo extends AppLocalizations {
  AppLocalizationsRo([String locale = 'ro']) : super(locale);

  @override
  String get dismissNotification => 'Închide notificarea';

  @override
  String get listingPublished => 'Anunțul a fost publicat.';

  @override
  String get activityPurchases => 'Cumpărări';

  @override
  String get activitySales => 'Vânzări';

  @override
  String get previousPage => 'Pagina anterioară';

  @override
  String get nextPage => 'Pagina următoare';

  @override
  String salesPage(int page, int total) {
    return '$page din $total';
  }

  @override
  String get myListings => 'Anunțurile mele';

  @override
  String get noCompletedSales => 'Nu ai încă produse vândute.';

  @override
  String get navFeed => 'Acasă';

  @override
  String get navExplore => 'Explorează';

  @override
  String get navSell => 'Vinde';

  @override
  String get navActivity => 'Activitate';

  @override
  String get navProfile => 'Profil';

  @override
  String get navAdmin => 'Administrare';

  @override
  String get fullName => 'Nume complet';

  @override
  String get yourName => 'Numele tău';

  @override
  String get emailAddress => 'Adresă de e-mail';

  @override
  String get emailExample => 'nume@exemplu.ro';

  @override
  String get invalidEmail => 'Introdu o adresă de e-mail validă.';

  @override
  String get minimumTwoCharacters => 'Minimum 2 caractere';

  @override
  String get minimumThreeCharacters => 'Minimum 3 caractere';

  @override
  String get minimumEightCharacters => 'Minimum 8 caractere';

  @override
  String get minimumTenCharacters => 'Minimum 10 caractere';

  @override
  String get phoneNumber => 'Număr de telefon';

  @override
  String get createAccountAction => 'CREEAZĂ CONT';

  @override
  String get signInAction => 'AUTENTIFICARE';

  @override
  String get password => 'Parolă';

  @override
  String get forgotPassword => 'Ai uitat parola?';

  @override
  String get showPassword => 'Arată parola';

  @override
  String get hidePassword => 'Ascunde parola';

  @override
  String get continueWith => 'SAU CONTINUĂ CU';

  @override
  String get alreadyHaveAccount => 'Ai deja cont pe Pinbind? ';

  @override
  String get newToPinbind => 'Ești nou pe Pinbind? ';

  @override
  String get signIn => 'Autentifică-te';

  @override
  String get createAccount => 'Creează cont';

  @override
  String get search => 'Caută';

  @override
  String get forYou => 'Pentru tine';

  @override
  String get reload => 'Reîncarcă';

  @override
  String get noActiveListings => 'Nu există anunțuri active.';

  @override
  String get videoLoadFailed => 'Videoclipul nu poate fi încărcat.';

  @override
  String get shareComingSoon => 'Distribuirea va fi disponibilă în curând.';

  @override
  String get newLiveBid => 'A fost primită o ofertă nouă.';

  @override
  String get auctionExtended => 'Licitația a fost prelungită.';

  @override
  String get bidSubmitted => 'Oferta a fost trimisă.';

  @override
  String get productReservedContact =>
      'Produs rezervat. Vânzătorul va vedea datele tale de contact.';

  @override
  String get productReserved => 'Produs rezervat.';

  @override
  String get addedToFavorites => 'Adăugat la favorite.';

  @override
  String get removedFromFavorites => 'Eliminat din favorite.';

  @override
  String get collapseAuction => 'Restrânge licitația';

  @override
  String get expandAuction => 'Extinde licitația';

  @override
  String get showLess => 'Mai puțin';

  @override
  String get bidDetails => 'Licitează / Detalii';

  @override
  String get currentBidUpper => 'OFERTA CURENTĂ';

  @override
  String get minimumBidUpper => 'OFERTA MINIMĂ';

  @override
  String get buyNowUpper => 'CUMPĂRĂ ACUM';

  @override
  String get reserveMet => 'Preț de rezervă atins';

  @override
  String get reserveNotMet => 'Preț de rezervă neatins';

  @override
  String get yourMaxBidUpper => 'OFERTA TA MAXIMĂ';

  @override
  String get minimumMaxBid => 'Oferta maximă minimă';

  @override
  String get yourMaxBid => 'Oferta ta maximă';

  @override
  String get placeMaxBid => 'PLASEAZĂ OFERTA';

  @override
  String get proxyBidExplanation =>
      'Licităm doar cât este necesar ca să rămâi în frunte. Limita ta maximă rămâne privată.';

  @override
  String get bidTerms => 'Plasând o ofertă, accepți condițiile licitației.';

  @override
  String get all => 'Toate';

  @override
  String get bids => 'Oferte';

  @override
  String get watching => 'Urmărite';

  @override
  String get wins => 'Câștigate';

  @override
  String get noWatchedProducts => 'Nu ai produse urmărite încă.';

  @override
  String get watchlistEmpty =>
      'Produsele pe care le adaugi la favorite vor apărea aici.';

  @override
  String get noWonAuctions => 'Nu ai nicio licitație câștigată încă.';

  @override
  String get noActivity => 'Nu există activitate de afișat.';

  @override
  String get activityLoadFailed => 'Activitatea nu a putut fi încărcată.';

  @override
  String get auction => 'Licitație';

  @override
  String get auctionEnglish => 'Licitație';

  @override
  String get auctionBid => 'Ofertă la licitație';

  @override
  String get success => 'Câștigată';

  @override
  String get outbidAlert => 'Ofertă depășită';

  @override
  String get activeBid => 'Ofertă activă';

  @override
  String get bidActivity => 'Activitatea ofertelor';

  @override
  String get yourBidPrefix => 'Oferta ta: ';

  @override
  String get currentBidBullet => '  •  Oferta curentă: ';

  @override
  String get viewUpper => 'VEZI';

  @override
  String get rebidUpper => 'LICITEAZĂ DIN NOU';

  @override
  String get openUpper => 'DESCHIDE';

  @override
  String get justNow => 'Chiar acum';

  @override
  String get savedItem => 'Produs salvat';

  @override
  String get currentBidPrefix => 'Oferta curentă: ';

  @override
  String get buyNowBullet => '  •  Cumpără acum: ';

  @override
  String get auctionActive => 'Licitație activă';

  @override
  String get tryAgain => 'Încearcă din nou';

  @override
  String get adminRequired => 'Ai nevoie de drepturi de administrare.';

  @override
  String get sellerApplications => 'Cereri de vânzător';

  @override
  String get noPendingApplications => 'Nu există cereri în așteptare.';

  @override
  String get approve => 'Aprobă';

  @override
  String get reject => 'Respinge';

  @override
  String get quickModeration => 'Moderare rapidă';

  @override
  String get hideProductId => 'ID-ul produsului de ascuns';

  @override
  String get hideProduct => 'Ascunde produsul';

  @override
  String get blockUserId => 'ID-ul utilizatorului de blocat';

  @override
  String get blockUser => 'Blochează utilizatorul';

  @override
  String get actionApplied => 'Acțiunea a fost aplicată.';

  @override
  String get defaultUserName => 'Utilizator Pinbind';

  @override
  String get defaultSellerName => 'Vânzător Pinbind';

  @override
  String get defaultSeller => 'Vânzător Pinbind';

  @override
  String get editProfile => 'Editează profilul';

  @override
  String get curatorCollector => 'Curator și colecționar';

  @override
  String get activeBids => 'Oferte active';

  @override
  String get wonItems => 'Produse câștigate';

  @override
  String get paymentMethods => 'Metode de plată';

  @override
  String get accountSettings => 'Setările contului';

  @override
  String get supportCenter => 'Centrul de asistență';

  @override
  String get logout => 'Deconectare';

  @override
  String get verifiedSeller => 'Vânzător verificat';

  @override
  String get collector => 'Colecționar';

  @override
  String get sellerStatus => 'Statut de vânzător';

  @override
  String get becomeSeller => 'Devino vânzător';

  @override
  String get requestSellerApproval => 'Solicită aprobarea ca vânzător';

  @override
  String get adminPremium => 'Administrator Premium';

  @override
  String get verifiedPremium => 'Verificat Premium';

  @override
  String get bidHistoryComingSoon =>
      'Istoricul ofertelor va fi disponibil în curând.';

  @override
  String get viewHistory => 'Vezi istoricul';

  @override
  String get bidsLoadFailed => 'Ofertele nu au putut fi încărcate';

  @override
  String get noBids => 'Nu ai încă oferte';

  @override
  String get noBidsDescription =>
      'Licitațiile active vor apărea aici după ce plasezi o ofertă.';

  @override
  String get currentBid => 'Oferta curentă';

  @override
  String get endsIn => 'Se încheie în';

  @override
  String get ended => 'Încheiată';

  @override
  String get topBidder => 'În frunte';

  @override
  String get outbid => 'Ofertă depășită';

  @override
  String get discoverCollection => 'Descoperă produse pentru colecția ta';

  @override
  String get collectionDescription =>
      'Am selectat produse pe baza activității tale recente la licitații.';

  @override
  String get exploreSelection => 'Explorează selecția';

  @override
  String get categoryWatches => 'Ceasuri';

  @override
  String get categoryArt => 'Artă';

  @override
  String get categoryFashion => 'Modă';

  @override
  String get categoryFurniture => 'Mobilier';

  @override
  String get categoryCollectibles => 'Obiecte de colecție';

  @override
  String get categoryElectronics => 'Electronice';

  @override
  String get exploreCurated => 'Descoperă selecția';

  @override
  String get exploreDescription =>
      'Descoperă produse deosebite din categoriile noastre.';

  @override
  String get searchingAuctions => 'Se caută licitații…';

  @override
  String get noSearchResults => 'Nicio licitație nu corespunde căutării.';

  @override
  String get searchHint => 'Caută categorii sau produse…';

  @override
  String get modernistDescription =>
      'Selecție inspirată de estetica Bauhaus și de designul modernist.';

  @override
  String get heritageDescription => 'Ceasuri rare și bijuterii deosebite.';

  @override
  String get canvasDescription =>
      'O selecție atentă de artă contemporană emergentă.';

  @override
  String get featuredCurators => 'Curatori recomandați';

  @override
  String get viewAll => 'Vezi toate';

  @override
  String get follow => 'Urmărește';

  @override
  String get sellerApprovalRequired =>
      'Ai nevoie de aprobarea ca vânzător înainte de a crea un anunț.';

  @override
  String get overview => 'PREZENTARE GENERALĂ';

  @override
  String get performance => 'Performanță';

  @override
  String get requestSellerAccess =>
      'Solicită acces ca vânzător pentru a publica anunțuri.';

  @override
  String get newListing => 'Anunț nou';

  @override
  String get approved => 'aprobată';

  @override
  String get rejected => 'respinsă';

  @override
  String get pending => 'în așteptare';

  @override
  String get trendTwelvePercent => '+12% față de luna trecută';

  @override
  String get trendEightPercent => '+8% față de luna trecută';

  @override
  String get activeAuctions => 'Licitații active';

  @override
  String get itemsSold => 'Produse vândute';

  @override
  String get totalRevenue => 'Venit total';

  @override
  String get createFirstListing => 'Creează primul anunț';

  @override
  String get addFirstProduct =>
      'Adaugă primul produs pentru a vedea date reale.';

  @override
  String get demoBidsTwentyFour => '24 de oferte · Maxim 32.400 RON';

  @override
  String get demoBidsTwelve => '12 oferte · Maxim 8.200 RON';

  @override
  String get more => 'Mai multe';

  @override
  String get inventory => 'Inventar';

  @override
  String get drafts => 'Ciorne';

  @override
  String get demoDrafts => '4 produse pregătite pentru verificare';

  @override
  String get unsoldItems => 'Produse nevândute';

  @override
  String get recentlySold => 'Vândute recent';

  @override
  String get recent => 'Recent';

  @override
  String get salesReport => 'Raport de vânzări';

  @override
  String get downloadSalesReport => 'Descarcă raportul de vânzări';

  @override
  String get demoSold450 => 'Vândut cu 450 RON';

  @override
  String get demoSold180 => 'Vândut cu 180 RON';

  @override
  String get demoSold1200 => 'Vândut cu 1.200 RON';

  @override
  String get demoTwoHoursAgo => 'Acum 2 ore';

  @override
  String get demoFiveHoursAgo => 'Acum 5 ore';

  @override
  String get yesterday => 'Ieri';

  @override
  String get paid => 'Plătit';

  @override
  String get pendingUpper => 'În așteptare';

  @override
  String get sellerApplicationDescription =>
      'Trimite cererea pentru aprobare. După acceptare poți publica anunțuri video și licitații.';

  @override
  String get sellerName => 'Nume vânzător';

  @override
  String get contactPhone => 'Telefon de contact';

  @override
  String get whatDoYouSell => 'Ce vinzi?';

  @override
  String get submitApplication => 'Trimite cererea';

  @override
  String get basicInformation => 'Informații de bază';

  @override
  String get listingTitle => 'Titlul anunțului';

  @override
  String get category => 'Categorie';

  @override
  String get selectCategory => 'Selectează categoria';

  @override
  String get chooseCategory => 'Alege o categorie';

  @override
  String get materials => 'Tehnică / Materiale';

  @override
  String get description => 'Descriere';

  @override
  String get materialsExample => 'De exemplu, acrilic pe pânză';

  @override
  String get descriptionHint =>
      'Descrie produsul, proveniența și starea acestuia…';

  @override
  String get auctionRules => 'Regulile licitației';

  @override
  String get startingPriceRon => 'Preț de pornire (RON)';

  @override
  String get reservePriceRon => 'Preț de rezervă (RON)';

  @override
  String get minimumAccepted => 'Minimum acceptat';

  @override
  String get minimumIncrementRon => 'Pas minim (RON)';

  @override
  String get buyNowOptional => 'Cumpără acum (opțional)';

  @override
  String get setPrice => 'Stabilește prețul';

  @override
  String get auctionDuration => 'Durata licitației';

  @override
  String get sevenDays => '7 zile';

  @override
  String get chooseVideo => 'Alege un videoclip pentru anunț.';

  @override
  String get createListing => 'Creează un anunț nou';

  @override
  String get createListingDescription =>
      'Prezintă produsul tău comunității Pinbind.';

  @override
  String get uploadVideo => 'Încarcă videoclipul produsului';

  @override
  String get videoRequirements =>
      'MP4 sau MOV, maximum 500 MB. Folosește un videoclip clar care prezintă produsul.';

  @override
  String get developmentVideoUrl => 'URL video pentru dezvoltare (opțional)';

  @override
  String get auctionRulesExplanation =>
      'Cumpărătorii introduc suma maximă. Pinbind mărește oferta publică doar cât este necesar pentru a păstra ofertantul în frunte.';

  @override
  String get invalidAmount => 'Sumă invalidă';

  @override
  String get publishing => 'Se publică…';

  @override
  String get publishListing => 'Publică anunțul';

  @override
  String get publishingTerms =>
      'Publicând anunțul, accepți condițiile pentru vânzători și politica de comisioane Pinbind.';

  @override
  String get productNotFound => 'Produsul nu a fost găsit.';

  @override
  String get liveAuction => 'LICITAȚIE ÎN DESFĂȘURARE';

  @override
  String get seller => 'Vânzător';

  @override
  String get startingPrice => 'Preț de pornire';

  @override
  String get reserve => 'Preț de rezervă';

  @override
  String get met => 'Atins';

  @override
  String get notMet => 'Neatins';

  @override
  String get auctionEnds => 'Licitația se încheie';

  @override
  String get verified => 'Verificat';

  @override
  String get insured => 'Asigurat';

  @override
  String get premium => 'Premium';

  @override
  String get endedUpper => 'ÎNCHEIATĂ';

  @override
  String get endsInUpper => 'SE ÎNCHEIE ÎN';

  @override
  String get bidHistory => 'Istoricul ofertelor';

  @override
  String providerLoginComingSoon(String provider) {
    return 'Autentificarea cu $provider va fi disponibilă după configurare.';
  }

  @override
  String featureComingSoon(String feature) {
    return '$feature va fi disponibil în curând.';
  }

  @override
  String maxBidAmount(String amount) {
    return 'OFERTĂ MAXIMĂ $amount';
  }

  @override
  String remainingTime(String time) {
    return '$time RĂMAS';
  }

  @override
  String currentBidAmount(String amount) {
    return 'Oferta curentă: $amount';
  }

  @override
  String minimumBidAmount(String amount) {
    return 'Oferta minimă este $amount.';
  }

  @override
  String youWon(String title) {
    return 'Ai câștigat $title';
  }

  @override
  String youWereOutbid(String title) {
    return 'Oferta ta pentru $title a fost depășită';
  }

  @override
  String yourBidFor(String title) {
    return 'Oferta ta pentru $title';
  }

  @override
  String minutesAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count de minute',
      few: '$count minute',
      one: 'o minută',
    );
    return 'Acum $_temp0';
  }

  @override
  String hoursAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count de ore',
      few: '$count ore',
      one: 'o oră',
    );
    return 'Acum $_temp0';
  }

  @override
  String daysAgo(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count de zile',
      few: '$count zile',
      one: 'o zi',
    );
    return 'Acum $_temp0';
  }

  @override
  String resultCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count de rezultate',
      few: '$count rezultate',
      one: 'Un rezultat',
    );
    return '$_temp0';
  }

  @override
  String activeCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count de licitații active',
      few: '$count licitații active',
      one: 'O licitație activă',
    );
    return '$_temp0';
  }

  @override
  String daysCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count de zile',
      few: '$count zile',
      one: 'O zi',
    );
    return '$_temp0';
  }

  @override
  String followComingSoon(String name) {
    return 'Urmărirea curatorului $name va fi disponibilă în curând.';
  }

  @override
  String sellerDashboard(String name) {
    return 'Panoul de vânzător al lui $name';
  }

  @override
  String sellerApplicationStatus(String status) {
    return 'Cererea ta de vânzător este $status.';
  }

  @override
  String statusHighest(String status, String amount) {
    return '$status · Oferta maximă: $amount';
  }

  @override
  String expiredItemCount(int count) {
    String _temp0 = intl.Intl.pluralLogic(
      count,
      locale: localeName,
      other: '$count de produse expirate',
      few: '$count produse expirate',
      one: 'Un produs expirat',
    );
    return '$_temp0';
  }

  @override
  String soldFor(String amount) {
    return 'Vândut cu $amount';
  }

  @override
  String memberStatus(String status) {
    return 'Membru $status';
  }

  @override
  String sellerBy(String name) {
    return 'Vândut de $name';
  }

  @override
  String buyAmount(String amount) {
    return 'CUMPĂRĂ $amount';
  }

  @override
  String liveBidsPrice(String amount) {
    return 'Ofertele live sunt reflectate în prețul curent: $amount.';
  }

  @override
  String materialsValue(String materials) {
    return 'Tehnică / Materiale: $materials';
  }

  @override
  String daysHours(int days, int hours) {
    return '${days}z ${hours}h';
  }

  @override
  String hoursMinutes(int hours, int minutes) {
    return '${hours}h ${minutes}min';
  }

  @override
  String get listingTitleExample => 'De exemplu, tablou abstract pe pânză';

  @override
  String get networkUnavailable =>
      'Nu ne putem conecta la server. Verifică conexiunea la internet și încearcă din nou.';

  @override
  String get requestTimeout => 'Serverul răspunde prea greu. Încearcă din nou.';

  @override
  String get invalidCredentials =>
      'Adresa de e-mail sau parola este incorectă.';

  @override
  String get requestCancelled => 'Cererea a fost anulată.';

  @override
  String get untrustedCertificate =>
      'Conexiunea securizată nu a putut fi verificată.';

  @override
  String get requestFailed =>
      'Acțiunea nu a putut fi finalizată. Încearcă din nou.';

  @override
  String get secureStorageUnavailable =>
      'Stocarea securizată nu este disponibilă. Închide și redeschide aplicația.';

  @override
  String get accountBlocked => 'Contul tău este blocat.';

  @override
  String get emailAlreadyRegistered =>
      'Această adresă de e-mail este deja înregistrată.';

  @override
  String get ownProductBid => 'Nu poți licita pentru propriul produs.';

  @override
  String get auctionInactive => 'Licitația nu mai este activă.';

  @override
  String get cannotBuyNow => 'Produsul nu poate fi cumpărat acum.';

  @override
  String get cannotFavoriteOwnProduct =>
      'Nu poți adăuga propriul produs la favorite.';

  @override
  String get invalidForm =>
      'Verifică informațiile completate și încearcă din nou.';

  @override
  String get notAuthorized => 'Nu ai permisiunea de a efectua această acțiune.';

  @override
  String get notFound => 'Elementul căutat nu a fost găsit.';

  @override
  String get statusActive => 'Activă';

  @override
  String get statusReserved => 'Rezervat';

  @override
  String get statusSold => 'Vândut';

  @override
  String get statusHidden => 'Ascuns';

  @override
  String get statusExpired => 'Expirat';

  @override
  String get statusClosed => 'Încheiată';

  @override
  String get unknownStatus => 'Necunoscut';

  @override
  String get categoryHome => 'Casă';

  @override
  String get categoryAuto => 'Auto';

  @override
  String get demoSunglasses => 'Ochelari de soare cu ramă în carapace';

  @override
  String get demoSilkShirt => 'Tricou din mătase';

  @override
  String get demoAudioMonitor => 'Monitor audio profesional H1';
}
