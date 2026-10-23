import 'dart:async';

import 'package:flutter/foundation.dart';
import 'package:flutter/widgets.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:intl/intl.dart' as intl;

import 'app_localizations_ro.dart';

// ignore_for_file: type=lint

/// Callers can lookup localized strings with an instance of AppLocalizations
/// returned by `AppLocalizations.of(context)`.
///
/// Applications need to include `AppLocalizations.delegate()` in their app's
/// `localizationDelegates` list, and the locales they support in the app's
/// `supportedLocales` list. For example:
///
/// ```dart
/// import 'l10n/app_localizations.dart';
///
/// return MaterialApp(
///   localizationsDelegates: AppLocalizations.localizationsDelegates,
///   supportedLocales: AppLocalizations.supportedLocales,
///   home: MyApplicationHome(),
/// );
/// ```
///
/// ## Update pubspec.yaml
///
/// Please make sure to update your pubspec.yaml to include the following
/// packages:
///
/// ```yaml
/// dependencies:
///   # Internationalization support.
///   flutter_localizations:
///     sdk: flutter
///   intl: any # Use the pinned version from flutter_localizations
///
///   # Rest of dependencies
/// ```
///
/// ## iOS Applications
///
/// iOS applications define key application metadata, including supported
/// locales, in an Info.plist file that is built into the application bundle.
/// To configure the locales supported by your app, you’ll need to edit this
/// file.
///
/// First, open your project’s ios/Runner.xcworkspace Xcode workspace file.
/// Then, in the Project Navigator, open the Info.plist file under the Runner
/// project’s Runner folder.
///
/// Next, select the Information Property List item, select Add Item from the
/// Editor menu, then select Localizations from the pop-up menu.
///
/// Select and expand the newly-created Localizations item then, for each
/// locale your application supports, add a new item and select the locale
/// you wish to add from the pop-up menu in the Value field. This list should
/// be consistent with the languages listed in the AppLocalizations.supportedLocales
/// property.
abstract class AppLocalizations {
  AppLocalizations(String locale)
    : localeName = intl.Intl.canonicalizedLocale(locale.toString());

  final String localeName;

  static AppLocalizations of(BuildContext context) {
    return Localizations.of<AppLocalizations>(context, AppLocalizations)!;
  }

  static const LocalizationsDelegate<AppLocalizations> delegate =
      _AppLocalizationsDelegate();

  /// A list of this localizations delegate along with the default localizations
  /// delegates.
  ///
  /// Returns a list of localizations delegates containing this delegate along with
  /// GlobalMaterialLocalizations.delegate, GlobalCupertinoLocalizations.delegate,
  /// and GlobalWidgetsLocalizations.delegate.
  ///
  /// Additional delegates can be added by appending to this list in
  /// MaterialApp. This list does not have to be used at all if a custom list
  /// of delegates is preferred or required.
  static const List<LocalizationsDelegate<dynamic>> localizationsDelegates =
      <LocalizationsDelegate<dynamic>>[
        delegate,
        GlobalMaterialLocalizations.delegate,
        GlobalCupertinoLocalizations.delegate,
        GlobalWidgetsLocalizations.delegate,
      ];

  /// A list of this localizations delegate's supported locales.
  static const List<Locale> supportedLocales = <Locale>[Locale('ro')];

  /// No description provided for @dismissNotification.
  ///
  /// In ro, this message translates to:
  /// **'Închide notificarea'**
  String get dismissNotification;

  /// No description provided for @listingPublished.
  ///
  /// In ro, this message translates to:
  /// **'Anunțul a fost publicat.'**
  String get listingPublished;

  /// No description provided for @activityPurchases.
  ///
  /// In ro, this message translates to:
  /// **'Cumpărări'**
  String get activityPurchases;

  /// No description provided for @activitySales.
  ///
  /// In ro, this message translates to:
  /// **'Vânzări'**
  String get activitySales;

  /// No description provided for @previousPage.
  ///
  /// In ro, this message translates to:
  /// **'Pagina anterioară'**
  String get previousPage;

  /// No description provided for @nextPage.
  ///
  /// In ro, this message translates to:
  /// **'Pagina următoare'**
  String get nextPage;

  /// No description provided for @salesPage.
  ///
  /// In ro, this message translates to:
  /// **'{page} din {total}'**
  String salesPage(int page, int total);

  /// No description provided for @myListings.
  ///
  /// In ro, this message translates to:
  /// **'Anunțurile mele'**
  String get myListings;

  /// No description provided for @noCompletedSales.
  ///
  /// In ro, this message translates to:
  /// **'Nu ai încă produse vândute.'**
  String get noCompletedSales;

  /// No description provided for @navFeed.
  ///
  /// In ro, this message translates to:
  /// **'Acasă'**
  String get navFeed;

  /// No description provided for @navExplore.
  ///
  /// In ro, this message translates to:
  /// **'Explorează'**
  String get navExplore;

  /// No description provided for @navSell.
  ///
  /// In ro, this message translates to:
  /// **'Vinde'**
  String get navSell;

  /// No description provided for @navActivity.
  ///
  /// In ro, this message translates to:
  /// **'Activitate'**
  String get navActivity;

  /// No description provided for @navProfile.
  ///
  /// In ro, this message translates to:
  /// **'Profil'**
  String get navProfile;

  /// No description provided for @navAdmin.
  ///
  /// In ro, this message translates to:
  /// **'Administrare'**
  String get navAdmin;

  /// No description provided for @fullName.
  ///
  /// In ro, this message translates to:
  /// **'Nume complet'**
  String get fullName;

  /// No description provided for @yourName.
  ///
  /// In ro, this message translates to:
  /// **'Numele tău'**
  String get yourName;

  /// No description provided for @emailAddress.
  ///
  /// In ro, this message translates to:
  /// **'Adresă de e-mail'**
  String get emailAddress;

  /// No description provided for @emailExample.
  ///
  /// In ro, this message translates to:
  /// **'nume@exemplu.ro'**
  String get emailExample;

  /// No description provided for @invalidEmail.
  ///
  /// In ro, this message translates to:
  /// **'Introdu o adresă de e-mail validă.'**
  String get invalidEmail;

  /// No description provided for @minimumTwoCharacters.
  ///
  /// In ro, this message translates to:
  /// **'Minimum 2 caractere'**
  String get minimumTwoCharacters;

  /// No description provided for @minimumThreeCharacters.
  ///
  /// In ro, this message translates to:
  /// **'Minimum 3 caractere'**
  String get minimumThreeCharacters;

  /// No description provided for @minimumEightCharacters.
  ///
  /// In ro, this message translates to:
  /// **'Minimum 8 caractere'**
  String get minimumEightCharacters;

  /// No description provided for @minimumTenCharacters.
  ///
  /// In ro, this message translates to:
  /// **'Minimum 10 caractere'**
  String get minimumTenCharacters;

  /// No description provided for @phoneNumber.
  ///
  /// In ro, this message translates to:
  /// **'Număr de telefon'**
  String get phoneNumber;

  /// No description provided for @createAccountAction.
  ///
  /// In ro, this message translates to:
  /// **'CREEAZĂ CONT'**
  String get createAccountAction;

  /// No description provided for @signInAction.
  ///
  /// In ro, this message translates to:
  /// **'AUTENTIFICARE'**
  String get signInAction;

  /// No description provided for @password.
  ///
  /// In ro, this message translates to:
  /// **'Parolă'**
  String get password;

  /// No description provided for @forgotPassword.
  ///
  /// In ro, this message translates to:
  /// **'Ai uitat parola?'**
  String get forgotPassword;

  /// No description provided for @showPassword.
  ///
  /// In ro, this message translates to:
  /// **'Arată parola'**
  String get showPassword;

  /// No description provided for @hidePassword.
  ///
  /// In ro, this message translates to:
  /// **'Ascunde parola'**
  String get hidePassword;

  /// No description provided for @continueWith.
  ///
  /// In ro, this message translates to:
  /// **'SAU CONTINUĂ CU'**
  String get continueWith;

  /// No description provided for @alreadyHaveAccount.
  ///
  /// In ro, this message translates to:
  /// **'Ai deja cont pe Pinbind? '**
  String get alreadyHaveAccount;

  /// No description provided for @newToPinbind.
  ///
  /// In ro, this message translates to:
  /// **'Ești nou pe Pinbind? '**
  String get newToPinbind;

  /// No description provided for @signIn.
  ///
  /// In ro, this message translates to:
  /// **'Autentifică-te'**
  String get signIn;

  /// No description provided for @createAccount.
  ///
  /// In ro, this message translates to:
  /// **'Creează cont'**
  String get createAccount;

  /// No description provided for @search.
  ///
  /// In ro, this message translates to:
  /// **'Caută'**
  String get search;

  /// No description provided for @forYou.
  ///
  /// In ro, this message translates to:
  /// **'Pentru tine'**
  String get forYou;

  /// No description provided for @reload.
  ///
  /// In ro, this message translates to:
  /// **'Reîncarcă'**
  String get reload;

  /// No description provided for @noActiveListings.
  ///
  /// In ro, this message translates to:
  /// **'Nu există anunțuri active.'**
  String get noActiveListings;

  /// No description provided for @shareComingSoon.
  ///
  /// In ro, this message translates to:
  /// **'Distribuirea va fi disponibilă în curând.'**
  String get shareComingSoon;

  /// No description provided for @newLiveBid.
  ///
  /// In ro, this message translates to:
  /// **'A fost primită o ofertă nouă.'**
  String get newLiveBid;

  /// No description provided for @auctionExtended.
  ///
  /// In ro, this message translates to:
  /// **'Licitația a fost prelungită.'**
  String get auctionExtended;

  /// No description provided for @bidSubmitted.
  ///
  /// In ro, this message translates to:
  /// **'Oferta a fost trimisă.'**
  String get bidSubmitted;

  /// No description provided for @productReservedContact.
  ///
  /// In ro, this message translates to:
  /// **'Produs rezervat. Vânzătorul va vedea datele tale de contact.'**
  String get productReservedContact;

  /// No description provided for @productReserved.
  ///
  /// In ro, this message translates to:
  /// **'Produs rezervat.'**
  String get productReserved;

  /// No description provided for @addedToFavorites.
  ///
  /// In ro, this message translates to:
  /// **'Adăugat la favorite.'**
  String get addedToFavorites;

  /// No description provided for @removedFromFavorites.
  ///
  /// In ro, this message translates to:
  /// **'Eliminat din favorite.'**
  String get removedFromFavorites;

  /// No description provided for @collapseAuction.
  ///
  /// In ro, this message translates to:
  /// **'Restrânge licitația'**
  String get collapseAuction;

  /// No description provided for @expandAuction.
  ///
  /// In ro, this message translates to:
  /// **'Extinde licitația'**
  String get expandAuction;

  /// No description provided for @showLess.
  ///
  /// In ro, this message translates to:
  /// **'Mai puțin'**
  String get showLess;

  /// No description provided for @bidDetails.
  ///
  /// In ro, this message translates to:
  /// **'Licitează / Detalii'**
  String get bidDetails;

  /// No description provided for @currentBidUpper.
  ///
  /// In ro, this message translates to:
  /// **'OFERTA CURENTĂ'**
  String get currentBidUpper;

  /// No description provided for @minimumBidUpper.
  ///
  /// In ro, this message translates to:
  /// **'OFERTA MINIMĂ'**
  String get minimumBidUpper;

  /// No description provided for @buyNowUpper.
  ///
  /// In ro, this message translates to:
  /// **'CUMPĂRĂ ACUM'**
  String get buyNowUpper;

  /// No description provided for @reserveMet.
  ///
  /// In ro, this message translates to:
  /// **'Preț de rezervă atins'**
  String get reserveMet;

  /// No description provided for @reserveNotMet.
  ///
  /// In ro, this message translates to:
  /// **'Preț de rezervă neatins'**
  String get reserveNotMet;

  /// No description provided for @yourMaxBidUpper.
  ///
  /// In ro, this message translates to:
  /// **'OFERTA TA MAXIMĂ'**
  String get yourMaxBidUpper;

  /// No description provided for @minimumMaxBid.
  ///
  /// In ro, this message translates to:
  /// **'Oferta maximă minimă'**
  String get minimumMaxBid;

  /// No description provided for @yourMaxBid.
  ///
  /// In ro, this message translates to:
  /// **'Oferta ta maximă'**
  String get yourMaxBid;

  /// No description provided for @placeMaxBid.
  ///
  /// In ro, this message translates to:
  /// **'PLASEAZĂ OFERTA'**
  String get placeMaxBid;

  /// No description provided for @proxyBidExplanation.
  ///
  /// In ro, this message translates to:
  /// **'Licităm doar cât este necesar ca să rămâi în frunte. Limita ta maximă rămâne privată.'**
  String get proxyBidExplanation;

  /// No description provided for @bidTerms.
  ///
  /// In ro, this message translates to:
  /// **'Plasând o ofertă, accepți condițiile licitației.'**
  String get bidTerms;

  /// No description provided for @all.
  ///
  /// In ro, this message translates to:
  /// **'Toate'**
  String get all;

  /// No description provided for @bids.
  ///
  /// In ro, this message translates to:
  /// **'Oferte'**
  String get bids;

  /// No description provided for @watching.
  ///
  /// In ro, this message translates to:
  /// **'Urmărite'**
  String get watching;

  /// No description provided for @wins.
  ///
  /// In ro, this message translates to:
  /// **'Câștigate'**
  String get wins;

  /// No description provided for @noWatchedProducts.
  ///
  /// In ro, this message translates to:
  /// **'Nu ai produse urmărite încă.'**
  String get noWatchedProducts;

  /// No description provided for @watchlistEmpty.
  ///
  /// In ro, this message translates to:
  /// **'Produsele pe care le adaugi la favorite vor apărea aici.'**
  String get watchlistEmpty;

  /// No description provided for @noWonAuctions.
  ///
  /// In ro, this message translates to:
  /// **'Nu ai nicio licitație câștigată încă.'**
  String get noWonAuctions;

  /// No description provided for @noActivity.
  ///
  /// In ro, this message translates to:
  /// **'Nu există activitate de afișat.'**
  String get noActivity;

  /// No description provided for @activityLoadFailed.
  ///
  /// In ro, this message translates to:
  /// **'Activitatea nu a putut fi încărcată.'**
  String get activityLoadFailed;

  /// No description provided for @auction.
  ///
  /// In ro, this message translates to:
  /// **'Licitație'**
  String get auction;

  /// No description provided for @auctionEnglish.
  ///
  /// In ro, this message translates to:
  /// **'Licitație'**
  String get auctionEnglish;

  /// No description provided for @auctionBid.
  ///
  /// In ro, this message translates to:
  /// **'Ofertă la licitație'**
  String get auctionBid;

  /// No description provided for @success.
  ///
  /// In ro, this message translates to:
  /// **'Câștigată'**
  String get success;

  /// No description provided for @outbidAlert.
  ///
  /// In ro, this message translates to:
  /// **'Ofertă depășită'**
  String get outbidAlert;

  /// No description provided for @activeBid.
  ///
  /// In ro, this message translates to:
  /// **'Ofertă activă'**
  String get activeBid;

  /// No description provided for @bidActivity.
  ///
  /// In ro, this message translates to:
  /// **'Activitatea ofertelor'**
  String get bidActivity;

  /// No description provided for @yourBidPrefix.
  ///
  /// In ro, this message translates to:
  /// **'Oferta ta: '**
  String get yourBidPrefix;

  /// No description provided for @currentBidBullet.
  ///
  /// In ro, this message translates to:
  /// **'  •  Oferta curentă: '**
  String get currentBidBullet;

  /// No description provided for @viewUpper.
  ///
  /// In ro, this message translates to:
  /// **'VEZI'**
  String get viewUpper;

  /// No description provided for @rebidUpper.
  ///
  /// In ro, this message translates to:
  /// **'LICITEAZĂ DIN NOU'**
  String get rebidUpper;

  /// No description provided for @openUpper.
  ///
  /// In ro, this message translates to:
  /// **'DESCHIDE'**
  String get openUpper;

  /// No description provided for @justNow.
  ///
  /// In ro, this message translates to:
  /// **'Chiar acum'**
  String get justNow;

  /// No description provided for @savedItem.
  ///
  /// In ro, this message translates to:
  /// **'Produs salvat'**
  String get savedItem;

  /// No description provided for @currentBidPrefix.
  ///
  /// In ro, this message translates to:
  /// **'Oferta curentă: '**
  String get currentBidPrefix;

  /// No description provided for @buyNowBullet.
  ///
  /// In ro, this message translates to:
  /// **'  •  Cumpără acum: '**
  String get buyNowBullet;

  /// No description provided for @auctionActive.
  ///
  /// In ro, this message translates to:
  /// **'Licitație activă'**
  String get auctionActive;

  /// No description provided for @tryAgain.
  ///
  /// In ro, this message translates to:
  /// **'Încearcă din nou'**
  String get tryAgain;

  /// No description provided for @adminRequired.
  ///
  /// In ro, this message translates to:
  /// **'Ai nevoie de drepturi de administrare.'**
  String get adminRequired;

  /// No description provided for @sellerApplications.
  ///
  /// In ro, this message translates to:
  /// **'Cereri de vânzător'**
  String get sellerApplications;

  /// No description provided for @noPendingApplications.
  ///
  /// In ro, this message translates to:
  /// **'Nu există cereri în așteptare.'**
  String get noPendingApplications;

  /// No description provided for @approve.
  ///
  /// In ro, this message translates to:
  /// **'Aprobă'**
  String get approve;

  /// No description provided for @reject.
  ///
  /// In ro, this message translates to:
  /// **'Respinge'**
  String get reject;

  /// No description provided for @quickModeration.
  ///
  /// In ro, this message translates to:
  /// **'Moderare rapidă'**
  String get quickModeration;

  /// No description provided for @hideProductId.
  ///
  /// In ro, this message translates to:
  /// **'ID-ul produsului de ascuns'**
  String get hideProductId;

  /// No description provided for @hideProduct.
  ///
  /// In ro, this message translates to:
  /// **'Ascunde produsul'**
  String get hideProduct;

  /// No description provided for @blockUserId.
  ///
  /// In ro, this message translates to:
  /// **'ID-ul utilizatorului de blocat'**
  String get blockUserId;

  /// No description provided for @blockUser.
  ///
  /// In ro, this message translates to:
  /// **'Blochează utilizatorul'**
  String get blockUser;

  /// No description provided for @actionApplied.
  ///
  /// In ro, this message translates to:
  /// **'Acțiunea a fost aplicată.'**
  String get actionApplied;

  /// No description provided for @defaultUserName.
  ///
  /// In ro, this message translates to:
  /// **'Utilizator Pinbind'**
  String get defaultUserName;

  /// No description provided for @defaultSellerName.
  ///
  /// In ro, this message translates to:
  /// **'Vânzător Pinbind'**
  String get defaultSellerName;

  /// No description provided for @defaultSeller.
  ///
  /// In ro, this message translates to:
  /// **'Vânzător Pinbind'**
  String get defaultSeller;

  /// No description provided for @editProfile.
  ///
  /// In ro, this message translates to:
  /// **'Editează profilul'**
  String get editProfile;

  /// No description provided for @curatorCollector.
  ///
  /// In ro, this message translates to:
  /// **'Curator și colecționar'**
  String get curatorCollector;

  /// No description provided for @activeBids.
  ///
  /// In ro, this message translates to:
  /// **'Oferte active'**
  String get activeBids;

  /// No description provided for @wonItems.
  ///
  /// In ro, this message translates to:
  /// **'Produse câștigate'**
  String get wonItems;

  /// No description provided for @paymentMethods.
  ///
  /// In ro, this message translates to:
  /// **'Metode de plată'**
  String get paymentMethods;

  /// No description provided for @accountSettings.
  ///
  /// In ro, this message translates to:
  /// **'Setările contului'**
  String get accountSettings;

  /// No description provided for @supportCenter.
  ///
  /// In ro, this message translates to:
  /// **'Centrul de asistență'**
  String get supportCenter;

  /// No description provided for @logout.
  ///
  /// In ro, this message translates to:
  /// **'Deconectare'**
  String get logout;

  /// No description provided for @verifiedSeller.
  ///
  /// In ro, this message translates to:
  /// **'Vânzător verificat'**
  String get verifiedSeller;

  /// No description provided for @collector.
  ///
  /// In ro, this message translates to:
  /// **'Colecționar'**
  String get collector;

  /// No description provided for @sellerStatus.
  ///
  /// In ro, this message translates to:
  /// **'Statut de vânzător'**
  String get sellerStatus;

  /// No description provided for @becomeSeller.
  ///
  /// In ro, this message translates to:
  /// **'Devino vânzător'**
  String get becomeSeller;

  /// No description provided for @requestSellerApproval.
  ///
  /// In ro, this message translates to:
  /// **'Solicită aprobarea ca vânzător'**
  String get requestSellerApproval;

  /// No description provided for @adminPremium.
  ///
  /// In ro, this message translates to:
  /// **'Administrator Premium'**
  String get adminPremium;

  /// No description provided for @verifiedPremium.
  ///
  /// In ro, this message translates to:
  /// **'Verificat Premium'**
  String get verifiedPremium;

  /// No description provided for @bidHistoryComingSoon.
  ///
  /// In ro, this message translates to:
  /// **'Istoricul ofertelor va fi disponibil în curând.'**
  String get bidHistoryComingSoon;

  /// No description provided for @viewHistory.
  ///
  /// In ro, this message translates to:
  /// **'Vezi istoricul'**
  String get viewHistory;

  /// No description provided for @bidsLoadFailed.
  ///
  /// In ro, this message translates to:
  /// **'Ofertele nu au putut fi încărcate'**
  String get bidsLoadFailed;

  /// No description provided for @noBids.
  ///
  /// In ro, this message translates to:
  /// **'Nu ai încă oferte'**
  String get noBids;

  /// No description provided for @noBidsDescription.
  ///
  /// In ro, this message translates to:
  /// **'Licitațiile active vor apărea aici după ce plasezi o ofertă.'**
  String get noBidsDescription;

  /// No description provided for @currentBid.
  ///
  /// In ro, this message translates to:
  /// **'Oferta curentă'**
  String get currentBid;

  /// No description provided for @endsIn.
  ///
  /// In ro, this message translates to:
  /// **'Se încheie în'**
  String get endsIn;

  /// No description provided for @ended.
  ///
  /// In ro, this message translates to:
  /// **'Încheiată'**
  String get ended;

  /// No description provided for @topBidder.
  ///
  /// In ro, this message translates to:
  /// **'În frunte'**
  String get topBidder;

  /// No description provided for @outbid.
  ///
  /// In ro, this message translates to:
  /// **'Ofertă depășită'**
  String get outbid;

  /// No description provided for @discoverCollection.
  ///
  /// In ro, this message translates to:
  /// **'Descoperă produse pentru colecția ta'**
  String get discoverCollection;

  /// No description provided for @collectionDescription.
  ///
  /// In ro, this message translates to:
  /// **'Am selectat produse pe baza activității tale recente la licitații.'**
  String get collectionDescription;

  /// No description provided for @exploreSelection.
  ///
  /// In ro, this message translates to:
  /// **'Explorează selecția'**
  String get exploreSelection;

  /// No description provided for @categoryWatches.
  ///
  /// In ro, this message translates to:
  /// **'Ceasuri'**
  String get categoryWatches;

  /// No description provided for @categoryArt.
  ///
  /// In ro, this message translates to:
  /// **'Artă'**
  String get categoryArt;

  /// No description provided for @categoryFashion.
  ///
  /// In ro, this message translates to:
  /// **'Modă'**
  String get categoryFashion;

  /// No description provided for @categoryFurniture.
  ///
  /// In ro, this message translates to:
  /// **'Mobilier'**
  String get categoryFurniture;

  /// No description provided for @categoryCollectibles.
  ///
  /// In ro, this message translates to:
  /// **'Obiecte de colecție'**
  String get categoryCollectibles;

  /// No description provided for @categoryElectronics.
  ///
  /// In ro, this message translates to:
  /// **'Electronice'**
  String get categoryElectronics;

  /// No description provided for @exploreCurated.
  ///
  /// In ro, this message translates to:
  /// **'Descoperă selecția'**
  String get exploreCurated;

  /// No description provided for @exploreDescription.
  ///
  /// In ro, this message translates to:
  /// **'Descoperă produse deosebite din categoriile noastre.'**
  String get exploreDescription;

  /// No description provided for @searchingAuctions.
  ///
  /// In ro, this message translates to:
  /// **'Se caută licitații…'**
  String get searchingAuctions;

  /// No description provided for @noSearchResults.
  ///
  /// In ro, this message translates to:
  /// **'Nicio licitație nu corespunde căutării.'**
  String get noSearchResults;

  /// No description provided for @searchHint.
  ///
  /// In ro, this message translates to:
  /// **'Caută categorii sau produse…'**
  String get searchHint;

  /// No description provided for @modernistDescription.
  ///
  /// In ro, this message translates to:
  /// **'Selecție inspirată de estetica Bauhaus și de designul modernist.'**
  String get modernistDescription;

  /// No description provided for @heritageDescription.
  ///
  /// In ro, this message translates to:
  /// **'Ceasuri rare și bijuterii deosebite.'**
  String get heritageDescription;

  /// No description provided for @canvasDescription.
  ///
  /// In ro, this message translates to:
  /// **'O selecție atentă de artă contemporană emergentă.'**
  String get canvasDescription;

  /// No description provided for @featuredCurators.
  ///
  /// In ro, this message translates to:
  /// **'Curatori recomandați'**
  String get featuredCurators;

  /// No description provided for @viewAll.
  ///
  /// In ro, this message translates to:
  /// **'Vezi toate'**
  String get viewAll;

  /// No description provided for @follow.
  ///
  /// In ro, this message translates to:
  /// **'Urmărește'**
  String get follow;

  /// No description provided for @sellerApprovalRequired.
  ///
  /// In ro, this message translates to:
  /// **'Ai nevoie de aprobarea ca vânzător înainte de a crea un anunț.'**
  String get sellerApprovalRequired;

  /// No description provided for @overview.
  ///
  /// In ro, this message translates to:
  /// **'PREZENTARE GENERALĂ'**
  String get overview;

  /// No description provided for @performance.
  ///
  /// In ro, this message translates to:
  /// **'Performanță'**
  String get performance;

  /// No description provided for @requestSellerAccess.
  ///
  /// In ro, this message translates to:
  /// **'Solicită acces ca vânzător pentru a publica anunțuri.'**
  String get requestSellerAccess;

  /// No description provided for @newListing.
  ///
  /// In ro, this message translates to:
  /// **'Anunț nou'**
  String get newListing;

  /// No description provided for @approved.
  ///
  /// In ro, this message translates to:
  /// **'aprobată'**
  String get approved;

  /// No description provided for @rejected.
  ///
  /// In ro, this message translates to:
  /// **'respinsă'**
  String get rejected;

  /// No description provided for @pending.
  ///
  /// In ro, this message translates to:
  /// **'în așteptare'**
  String get pending;

  /// No description provided for @trendTwelvePercent.
  ///
  /// In ro, this message translates to:
  /// **'+12% față de luna trecută'**
  String get trendTwelvePercent;

  /// No description provided for @trendEightPercent.
  ///
  /// In ro, this message translates to:
  /// **'+8% față de luna trecută'**
  String get trendEightPercent;

  /// No description provided for @activeAuctions.
  ///
  /// In ro, this message translates to:
  /// **'Licitații active'**
  String get activeAuctions;

  /// No description provided for @itemsSold.
  ///
  /// In ro, this message translates to:
  /// **'Produse vândute'**
  String get itemsSold;

  /// No description provided for @totalRevenue.
  ///
  /// In ro, this message translates to:
  /// **'Venit total'**
  String get totalRevenue;

  /// No description provided for @createFirstListing.
  ///
  /// In ro, this message translates to:
  /// **'Creează primul anunț'**
  String get createFirstListing;

  /// No description provided for @addFirstProduct.
  ///
  /// In ro, this message translates to:
  /// **'Adaugă primul produs pentru a vedea date reale.'**
  String get addFirstProduct;

  /// No description provided for @demoBidsTwentyFour.
  ///
  /// In ro, this message translates to:
  /// **'24 de oferte · Maxim 32.400 RON'**
  String get demoBidsTwentyFour;

  /// No description provided for @demoBidsTwelve.
  ///
  /// In ro, this message translates to:
  /// **'12 oferte · Maxim 8.200 RON'**
  String get demoBidsTwelve;

  /// No description provided for @more.
  ///
  /// In ro, this message translates to:
  /// **'Mai multe'**
  String get more;

  /// No description provided for @inventory.
  ///
  /// In ro, this message translates to:
  /// **'Inventar'**
  String get inventory;

  /// No description provided for @drafts.
  ///
  /// In ro, this message translates to:
  /// **'Ciorne'**
  String get drafts;

  /// No description provided for @demoDrafts.
  ///
  /// In ro, this message translates to:
  /// **'4 produse pregătite pentru verificare'**
  String get demoDrafts;

  /// No description provided for @unsoldItems.
  ///
  /// In ro, this message translates to:
  /// **'Produse nevândute'**
  String get unsoldItems;

  /// No description provided for @recentlySold.
  ///
  /// In ro, this message translates to:
  /// **'Vândute recent'**
  String get recentlySold;

  /// No description provided for @recent.
  ///
  /// In ro, this message translates to:
  /// **'Recent'**
  String get recent;

  /// No description provided for @salesReport.
  ///
  /// In ro, this message translates to:
  /// **'Raport de vânzări'**
  String get salesReport;

  /// No description provided for @downloadSalesReport.
  ///
  /// In ro, this message translates to:
  /// **'Descarcă raportul de vânzări'**
  String get downloadSalesReport;

  /// No description provided for @demoSold450.
  ///
  /// In ro, this message translates to:
  /// **'Vândut cu 450 RON'**
  String get demoSold450;

  /// No description provided for @demoSold180.
  ///
  /// In ro, this message translates to:
  /// **'Vândut cu 180 RON'**
  String get demoSold180;

  /// No description provided for @demoSold1200.
  ///
  /// In ro, this message translates to:
  /// **'Vândut cu 1.200 RON'**
  String get demoSold1200;

  /// No description provided for @demoTwoHoursAgo.
  ///
  /// In ro, this message translates to:
  /// **'Acum 2 ore'**
  String get demoTwoHoursAgo;

  /// No description provided for @demoFiveHoursAgo.
  ///
  /// In ro, this message translates to:
  /// **'Acum 5 ore'**
  String get demoFiveHoursAgo;

  /// No description provided for @yesterday.
  ///
  /// In ro, this message translates to:
  /// **'Ieri'**
  String get yesterday;

  /// No description provided for @paid.
  ///
  /// In ro, this message translates to:
  /// **'Plătit'**
  String get paid;

  /// No description provided for @pendingUpper.
  ///
  /// In ro, this message translates to:
  /// **'În așteptare'**
  String get pendingUpper;

  /// No description provided for @sellerApplicationDescription.
  ///
  /// In ro, this message translates to:
  /// **'Trimite cererea pentru aprobare. După acceptare poți publica anunțuri cu fotografii și licitații.'**
  String get sellerApplicationDescription;

  /// No description provided for @sellerName.
  ///
  /// In ro, this message translates to:
  /// **'Nume vânzător'**
  String get sellerName;

  /// No description provided for @contactPhone.
  ///
  /// In ro, this message translates to:
  /// **'Telefon de contact'**
  String get contactPhone;

  /// No description provided for @whatDoYouSell.
  ///
  /// In ro, this message translates to:
  /// **'Ce vinzi?'**
  String get whatDoYouSell;

  /// No description provided for @submitApplication.
  ///
  /// In ro, this message translates to:
  /// **'Trimite cererea'**
  String get submitApplication;

  /// No description provided for @basicInformation.
  ///
  /// In ro, this message translates to:
  /// **'Informații de bază'**
  String get basicInformation;

  /// No description provided for @listingTitle.
  ///
  /// In ro, this message translates to:
  /// **'Titlul anunțului'**
  String get listingTitle;

  /// No description provided for @category.
  ///
  /// In ro, this message translates to:
  /// **'Categorie'**
  String get category;

  /// No description provided for @selectCategory.
  ///
  /// In ro, this message translates to:
  /// **'Selectează categoria'**
  String get selectCategory;

  /// No description provided for @chooseCategory.
  ///
  /// In ro, this message translates to:
  /// **'Alege o categorie'**
  String get chooseCategory;

  /// No description provided for @materials.
  ///
  /// In ro, this message translates to:
  /// **'Tehnică / Materiale'**
  String get materials;

  /// No description provided for @description.
  ///
  /// In ro, this message translates to:
  /// **'Descriere'**
  String get description;

  /// No description provided for @materialsExample.
  ///
  /// In ro, this message translates to:
  /// **'De exemplu, acrilic pe pânză'**
  String get materialsExample;

  /// No description provided for @descriptionHint.
  ///
  /// In ro, this message translates to:
  /// **'Descrie produsul, proveniența și starea acestuia…'**
  String get descriptionHint;

  /// No description provided for @auctionRules.
  ///
  /// In ro, this message translates to:
  /// **'Regulile licitației'**
  String get auctionRules;

  /// No description provided for @startingPriceRon.
  ///
  /// In ro, this message translates to:
  /// **'Preț de pornire (RON)'**
  String get startingPriceRon;

  /// No description provided for @reservePriceRon.
  ///
  /// In ro, this message translates to:
  /// **'Preț de rezervă (RON)'**
  String get reservePriceRon;

  /// No description provided for @minimumAccepted.
  ///
  /// In ro, this message translates to:
  /// **'Minimum acceptat'**
  String get minimumAccepted;

  /// No description provided for @minimumIncrementRon.
  ///
  /// In ro, this message translates to:
  /// **'Pas minim (RON)'**
  String get minimumIncrementRon;

  /// No description provided for @buyNowOptional.
  ///
  /// In ro, this message translates to:
  /// **'Cumpără acum (opțional)'**
  String get buyNowOptional;

  /// No description provided for @setPrice.
  ///
  /// In ro, this message translates to:
  /// **'Stabilește prețul'**
  String get setPrice;

  /// No description provided for @auctionDuration.
  ///
  /// In ro, this message translates to:
  /// **'Durata licitației'**
  String get auctionDuration;

  /// No description provided for @sevenDays.
  ///
  /// In ro, this message translates to:
  /// **'7 zile'**
  String get sevenDays;

  /// No description provided for @createListing.
  ///
  /// In ro, this message translates to:
  /// **'Creează un anunț nou'**
  String get createListing;

  /// No description provided for @createListingDescription.
  ///
  /// In ro, this message translates to:
  /// **'Prezintă produsul tău comunității Pinbind.'**
  String get createListingDescription;

  /// No description provided for @auctionRulesExplanation.
  ///
  /// In ro, this message translates to:
  /// **'Cumpărătorii introduc suma maximă. Pinbind mărește oferta publică doar cât este necesar pentru a păstra ofertantul în frunte.'**
  String get auctionRulesExplanation;

  /// No description provided for @invalidAmount.
  ///
  /// In ro, this message translates to:
  /// **'Sumă invalidă'**
  String get invalidAmount;

  /// No description provided for @publishing.
  ///
  /// In ro, this message translates to:
  /// **'Se publică…'**
  String get publishing;

  /// No description provided for @publishListing.
  ///
  /// In ro, this message translates to:
  /// **'Publică anunțul'**
  String get publishListing;

  /// No description provided for @publishingTerms.
  ///
  /// In ro, this message translates to:
  /// **'Publicând anunțul, accepți condițiile pentru vânzători și politica de comisioane Pinbind.'**
  String get publishingTerms;

  /// No description provided for @productNotFound.
  ///
  /// In ro, this message translates to:
  /// **'Produsul nu a fost găsit.'**
  String get productNotFound;

  /// No description provided for @liveAuction.
  ///
  /// In ro, this message translates to:
  /// **'LICITAȚIE ÎN DESFĂȘURARE'**
  String get liveAuction;

  /// No description provided for @seller.
  ///
  /// In ro, this message translates to:
  /// **'Vânzător'**
  String get seller;

  /// No description provided for @startingPrice.
  ///
  /// In ro, this message translates to:
  /// **'Preț de pornire'**
  String get startingPrice;

  /// No description provided for @reserve.
  ///
  /// In ro, this message translates to:
  /// **'Preț de rezervă'**
  String get reserve;

  /// No description provided for @met.
  ///
  /// In ro, this message translates to:
  /// **'Atins'**
  String get met;

  /// No description provided for @notMet.
  ///
  /// In ro, this message translates to:
  /// **'Neatins'**
  String get notMet;

  /// No description provided for @auctionEnds.
  ///
  /// In ro, this message translates to:
  /// **'Licitația se încheie'**
  String get auctionEnds;

  /// No description provided for @verified.
  ///
  /// In ro, this message translates to:
  /// **'Verificat'**
  String get verified;

  /// No description provided for @insured.
  ///
  /// In ro, this message translates to:
  /// **'Asigurat'**
  String get insured;

  /// No description provided for @premium.
  ///
  /// In ro, this message translates to:
  /// **'Premium'**
  String get premium;

  /// No description provided for @endedUpper.
  ///
  /// In ro, this message translates to:
  /// **'ÎNCHEIATĂ'**
  String get endedUpper;

  /// No description provided for @endsInUpper.
  ///
  /// In ro, this message translates to:
  /// **'SE ÎNCHEIE ÎN'**
  String get endsInUpper;

  /// No description provided for @bidHistory.
  ///
  /// In ro, this message translates to:
  /// **'Istoricul ofertelor'**
  String get bidHistory;

  /// No description provided for @providerLoginComingSoon.
  ///
  /// In ro, this message translates to:
  /// **'Autentificarea cu {provider} va fi disponibilă după configurare.'**
  String providerLoginComingSoon(String provider);

  /// No description provided for @featureComingSoon.
  ///
  /// In ro, this message translates to:
  /// **'{feature} va fi disponibil în curând.'**
  String featureComingSoon(String feature);

  /// No description provided for @maxBidAmount.
  ///
  /// In ro, this message translates to:
  /// **'OFERTĂ MAXIMĂ {amount}'**
  String maxBidAmount(String amount);

  /// No description provided for @remainingTime.
  ///
  /// In ro, this message translates to:
  /// **'{time} RĂMAS'**
  String remainingTime(String time);

  /// No description provided for @currentBidAmount.
  ///
  /// In ro, this message translates to:
  /// **'Oferta curentă: {amount}'**
  String currentBidAmount(String amount);

  /// No description provided for @minimumBidAmount.
  ///
  /// In ro, this message translates to:
  /// **'Oferta minimă este {amount}.'**
  String minimumBidAmount(String amount);

  /// No description provided for @youWon.
  ///
  /// In ro, this message translates to:
  /// **'Ai câștigat {title}'**
  String youWon(String title);

  /// No description provided for @youWereOutbid.
  ///
  /// In ro, this message translates to:
  /// **'Oferta ta pentru {title} a fost depășită'**
  String youWereOutbid(String title);

  /// No description provided for @yourBidFor.
  ///
  /// In ro, this message translates to:
  /// **'Oferta ta pentru {title}'**
  String yourBidFor(String title);

  /// No description provided for @minutesAgo.
  ///
  /// In ro, this message translates to:
  /// **'Acum {count, plural, =1{o minută} few{{count} minute} other{{count} de minute}}'**
  String minutesAgo(int count);

  /// No description provided for @hoursAgo.
  ///
  /// In ro, this message translates to:
  /// **'Acum {count, plural, =1{o oră} few{{count} ore} other{{count} de ore}}'**
  String hoursAgo(int count);

  /// No description provided for @daysAgo.
  ///
  /// In ro, this message translates to:
  /// **'Acum {count, plural, =1{o zi} few{{count} zile} other{{count} de zile}}'**
  String daysAgo(int count);

  /// No description provided for @resultCount.
  ///
  /// In ro, this message translates to:
  /// **'{count, plural, =1{Un rezultat} few{{count} rezultate} other{{count} de rezultate}}'**
  String resultCount(int count);

  /// No description provided for @activeCount.
  ///
  /// In ro, this message translates to:
  /// **'{count, plural, =1{O licitație activă} few{{count} licitații active} other{{count} de licitații active}}'**
  String activeCount(int count);

  /// No description provided for @daysCount.
  ///
  /// In ro, this message translates to:
  /// **'{count, plural, =1{O zi} few{{count} zile} other{{count} de zile}}'**
  String daysCount(int count);

  /// No description provided for @followComingSoon.
  ///
  /// In ro, this message translates to:
  /// **'Urmărirea curatorului {name} va fi disponibilă în curând.'**
  String followComingSoon(String name);

  /// No description provided for @sellerDashboard.
  ///
  /// In ro, this message translates to:
  /// **'Panoul de vânzător al lui {name}'**
  String sellerDashboard(String name);

  /// No description provided for @sellerApplicationStatus.
  ///
  /// In ro, this message translates to:
  /// **'Cererea ta de vânzător este {status}.'**
  String sellerApplicationStatus(String status);

  /// No description provided for @statusHighest.
  ///
  /// In ro, this message translates to:
  /// **'{status} · Oferta maximă: {amount}'**
  String statusHighest(String status, String amount);

  /// No description provided for @expiredItemCount.
  ///
  /// In ro, this message translates to:
  /// **'{count, plural, =1{Un produs expirat} few{{count} produse expirate} other{{count} de produse expirate}}'**
  String expiredItemCount(int count);

  /// No description provided for @soldFor.
  ///
  /// In ro, this message translates to:
  /// **'Vândut cu {amount}'**
  String soldFor(String amount);

  /// No description provided for @memberStatus.
  ///
  /// In ro, this message translates to:
  /// **'Membru {status}'**
  String memberStatus(String status);

  /// No description provided for @sellerBy.
  ///
  /// In ro, this message translates to:
  /// **'Vândut de {name}'**
  String sellerBy(String name);

  /// No description provided for @buyAmount.
  ///
  /// In ro, this message translates to:
  /// **'CUMPĂRĂ {amount}'**
  String buyAmount(String amount);

  /// No description provided for @liveBidsPrice.
  ///
  /// In ro, this message translates to:
  /// **'Ofertele live sunt reflectate în prețul curent: {amount}.'**
  String liveBidsPrice(String amount);

  /// No description provided for @materialsValue.
  ///
  /// In ro, this message translates to:
  /// **'Tehnică / Materiale: {materials}'**
  String materialsValue(String materials);

  /// No description provided for @daysHours.
  ///
  /// In ro, this message translates to:
  /// **'{days}z {hours}h'**
  String daysHours(int days, int hours);

  /// No description provided for @hoursMinutes.
  ///
  /// In ro, this message translates to:
  /// **'{hours}h {minutes}min'**
  String hoursMinutes(int hours, int minutes);

  /// No description provided for @listingTitleExample.
  ///
  /// In ro, this message translates to:
  /// **'De exemplu, tablou abstract pe pânză'**
  String get listingTitleExample;

  /// No description provided for @networkUnavailable.
  ///
  /// In ro, this message translates to:
  /// **'Nu ne putem conecta la server. Verifică conexiunea la internet și încearcă din nou.'**
  String get networkUnavailable;

  /// No description provided for @requestTimeout.
  ///
  /// In ro, this message translates to:
  /// **'Serverul răspunde prea greu. Încearcă din nou.'**
  String get requestTimeout;

  /// No description provided for @invalidCredentials.
  ///
  /// In ro, this message translates to:
  /// **'Adresa de e-mail sau parola este incorectă.'**
  String get invalidCredentials;

  /// No description provided for @requestCancelled.
  ///
  /// In ro, this message translates to:
  /// **'Cererea a fost anulată.'**
  String get requestCancelled;

  /// No description provided for @untrustedCertificate.
  ///
  /// In ro, this message translates to:
  /// **'Conexiunea securizată nu a putut fi verificată.'**
  String get untrustedCertificate;

  /// No description provided for @requestFailed.
  ///
  /// In ro, this message translates to:
  /// **'Acțiunea nu a putut fi finalizată. Încearcă din nou.'**
  String get requestFailed;

  /// No description provided for @secureStorageUnavailable.
  ///
  /// In ro, this message translates to:
  /// **'Stocarea securizată nu este disponibilă. Închide și redeschide aplicația.'**
  String get secureStorageUnavailable;

  /// No description provided for @accountBlocked.
  ///
  /// In ro, this message translates to:
  /// **'Contul tău este blocat.'**
  String get accountBlocked;

  /// No description provided for @emailAlreadyRegistered.
  ///
  /// In ro, this message translates to:
  /// **'Această adresă de e-mail este deja înregistrată.'**
  String get emailAlreadyRegistered;

  /// No description provided for @ownProductBid.
  ///
  /// In ro, this message translates to:
  /// **'Nu poți licita pentru propriul produs.'**
  String get ownProductBid;

  /// No description provided for @auctionInactive.
  ///
  /// In ro, this message translates to:
  /// **'Licitația nu mai este activă.'**
  String get auctionInactive;

  /// No description provided for @cannotBuyNow.
  ///
  /// In ro, this message translates to:
  /// **'Produsul nu poate fi cumpărat acum.'**
  String get cannotBuyNow;

  /// No description provided for @cannotFavoriteOwnProduct.
  ///
  /// In ro, this message translates to:
  /// **'Nu poți adăuga propriul produs la favorite.'**
  String get cannotFavoriteOwnProduct;

  /// No description provided for @invalidForm.
  ///
  /// In ro, this message translates to:
  /// **'Verifică informațiile completate și încearcă din nou.'**
  String get invalidForm;

  /// No description provided for @notAuthorized.
  ///
  /// In ro, this message translates to:
  /// **'Nu ai permisiunea de a efectua această acțiune.'**
  String get notAuthorized;

  /// No description provided for @notFound.
  ///
  /// In ro, this message translates to:
  /// **'Elementul căutat nu a fost găsit.'**
  String get notFound;

  /// No description provided for @statusActive.
  ///
  /// In ro, this message translates to:
  /// **'Activă'**
  String get statusActive;

  /// No description provided for @statusReserved.
  ///
  /// In ro, this message translates to:
  /// **'Rezervat'**
  String get statusReserved;

  /// No description provided for @statusSold.
  ///
  /// In ro, this message translates to:
  /// **'Vândut'**
  String get statusSold;

  /// No description provided for @statusHidden.
  ///
  /// In ro, this message translates to:
  /// **'Ascuns'**
  String get statusHidden;

  /// No description provided for @statusExpired.
  ///
  /// In ro, this message translates to:
  /// **'Expirat'**
  String get statusExpired;

  /// No description provided for @statusClosed.
  ///
  /// In ro, this message translates to:
  /// **'Încheiată'**
  String get statusClosed;

  /// No description provided for @unknownStatus.
  ///
  /// In ro, this message translates to:
  /// **'Necunoscut'**
  String get unknownStatus;

  /// No description provided for @categoryHome.
  ///
  /// In ro, this message translates to:
  /// **'Casă'**
  String get categoryHome;

  /// No description provided for @categoryAuto.
  ///
  /// In ro, this message translates to:
  /// **'Auto'**
  String get categoryAuto;

  /// No description provided for @demoSunglasses.
  ///
  /// In ro, this message translates to:
  /// **'Ochelari de soare cu ramă în carapace'**
  String get demoSunglasses;

  /// No description provided for @demoSilkShirt.
  ///
  /// In ro, this message translates to:
  /// **'Tricou din mătase'**
  String get demoSilkShirt;

  /// No description provided for @demoAudioMonitor.
  ///
  /// In ro, this message translates to:
  /// **'Monitor audio profesional H1'**
  String get demoAudioMonitor;

  /// No description provided for @imageLoadFailed.
  ///
  /// In ro, this message translates to:
  /// **'Fotografia nu poate fi încărcată.'**
  String get imageLoadFailed;

  /// No description provided for @chooseImage.
  ///
  /// In ro, this message translates to:
  /// **'Alege o fotografie pentru anunț.'**
  String get chooseImage;

  /// No description provided for @uploadImage.
  ///
  /// In ro, this message translates to:
  /// **'Încarcă fotografia produsului'**
  String get uploadImage;

  /// No description provided for @imageRequirements.
  ///
  /// In ro, this message translates to:
  /// **'JPG, PNG sau WebP, maximum 10 MB. Alege o fotografie clară a produsului.'**
  String get imageRequirements;

  /// No description provided for @ownProductBuy.
  ///
  /// In ro, this message translates to:
  /// **'Nu poți cumpăra propriul produs. Folosește un alt cont pentru a testa cumpărarea.'**
  String get ownProductBuy;
}

class _AppLocalizationsDelegate
    extends LocalizationsDelegate<AppLocalizations> {
  const _AppLocalizationsDelegate();

  @override
  Future<AppLocalizations> load(Locale locale) {
    return SynchronousFuture<AppLocalizations>(lookupAppLocalizations(locale));
  }

  @override
  bool isSupported(Locale locale) =>
      <String>['ro'].contains(locale.languageCode);

  @override
  bool shouldReload(_AppLocalizationsDelegate old) => false;
}

AppLocalizations lookupAppLocalizations(Locale locale) {
  // Lookup logic when only language code is specified.
  switch (locale.languageCode) {
    case 'ro':
      return AppLocalizationsRo();
  }

  throw FlutterError(
    'AppLocalizations.delegate failed to load unsupported locale "$locale". This is likely '
    'an issue with the localizations generation tool. Please file an issue '
    'on GitHub with a reproducible sample app and the gen-l10n configuration '
    'that was used.',
  );
}
