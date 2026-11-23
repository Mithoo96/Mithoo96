/**
 * Kontni sit la an kreyòl ayisyen.
 * Règles : noms d'organisations, d'institutions, de diplômes et de documents officiels
 * conservés dans leur forme d'origine ; signatures créoles inchangées ; aucune nouvelle déclaration.
 */
import * as fr from './site';

export const ht = {
  identity: {
    ...fr.identity,
    status: 'Kandida pou depite',
    circonscription: 'Premye Sikonskripsyon Senmak',
    statusShort: 'Kandida pou depite · Premye Sikonskripsyon Senmak',
    descriptor: 'Papa · Sitwayen · Aktè angaje',
    motto: 'Angajman fè sitwayen',
  },
  nav: [
    { name: 'Akèy', path: '/' },
    { name: 'Apwopo', path: '/biographie' },
    { name: 'Vizyon', path: '/vision' },
    { name: 'Priyorite', path: '/priorites' },
    { name: 'Pakou', path: '/parcours' },
    { name: 'Piblikasyon', path: '/publications' },
    { name: 'Medya', path: '/medias' },
    { name: 'Aktyalite', path: '/actualites' },
  ],
  contact: fr.contact,
  hero: {
    lines: ['Yon sèl orizon : enterè jeneral la.', 'Yon konviksyon ki pa janm bese : tout pou Ayiti, nan non diyite chak moun.'],
  },
  conviction:
    'Mwen konvenk se sèlman yon vwa ki soti Senmak, ki fè tèt li tande e ki gen kredibilite, ki ka defann enterè estratejik Senmak nan menm wotè ak defi jodi a yo. Sa mande yon lidèchip altènatif, konsekan e klere.',
  bio: {
    title: 'Yon pakou ki bati ant dwa, kominikasyon ak sèvis piblik.',
    paragraphs: [
      'Mwen fèt Senmak, komin ki se poto mitan Ba-Latibonit. Pwofil mwen ka rezime nan twa mo kreyòl : <strong>« Moun, Ayisyen, Sitwayen. »</strong>',
      "Mwen se avoka ki enskri nan Barreau de Port-au-Prince, e mwen gen yon <em>master II en droit international et comparé de l'environnement</em>. Mwen se yon defansè cho Leta de dwa ak bon gouvènans.",
      'Prensip responsablite ak angajman sitwayen se yo ki gide m. Mwen pote yon vizyon politik ki chita sou respè diyite moun ak enterè jeneral la.',
    ],
    triad: fr.bio.triad,
  },
  convictions: [
    'Diyite moun anvan ambisyon politik',
    'Respè, menm lè nou pa dakò',
    'Vyolans, difamasyon ak entimidasyon pa gen plas nan politik',
    'Angajman fè sitwayen',
    'Transparans se yon egzijans demokratik',
    'Politik fèt pou sèvi enterè jeneral la',
  ],
  boussole: ['Zak Endepandans Ayiti', 'Deklarasyon Inivèsèl Dwa Moun', 'Konstitisyon ayisyen an', 'La Dessalinienne'],
  methode: [
    'etid ak done',
    'valorizasyon eksperyans lokal yo',
    'koute moun',
    'yon pragmatis ki adapte ak reyalite ayisyen an',
    'yon konpreyansyon reyèl sou defi peyi a',
  ],
  ctaBand: ['Ann bati yon peyi ki sanble ak rèv zansèt nou yo,', 'yon peyi ki respekte devwa nou', 'anvè jenerasyon k ap vini yo !'],
  visionIntro:
    'Senmak se an menm tan yon vil, yon komin, yon sikonskripsyon elektoral ak yon chèflye awondisman. Se yon gwo pòl demografik, ekonomik ak politik nan Ba-Latibonit.',
  visionLead:
    'Vizyon nou pwopoze a chita sou yon lidèchip-solisyon ki baze sou rigè, koute moun ak yon konpreyansyon reyèl sou defi peyi a.',
  axesIntro: 'Men yon lis sijè ak dosye, ki pa fin konplè, k ap gide angajman mwen nan sèvis enterè jeneral la.',
  axes: [
    { title: 'Gouvènans lokal', text: 'Mete notab yo ak otorite lokal yo ansanm pou yo kontribye nan devlopman Senmak.' },
    { title: 'Ba-Latibonit', text: 'Valorize Ba-Latibonit pou l ka rive gen otonomi administratif.' },
    { title: 'Siveyans, kontwòl ak rann kont sou bidjè', text: 'Kontwole sou fason serye jan resous piblik yo itilize, epi egzije pou moun rann kont.' },
    { title: 'Dwa ekonomik, sosyal ak kiltirèl', text: 'Fè pwogrè pou popilasyon an jwi tout bon vre dwa ekonomik, sosyal ak kiltirèl li yo.' },
    { title: 'Desantralizasyon', text: 'Pote lit desantralizasyon an pou sèvis Leta yo vin pi pre sitwayen yo.' },
    { title: 'Souverènte nasyonal', text: 'Defann souverènte nasyonal la ak kapasite peyi a pou l deside avni pa l.' },
    { title: 'Leta de dwa ak ekilib pouvwa yo', text: 'Ranfòse Leta de dwa ak ekilib ant pouvwa piblik yo.' },
    { title: 'Entèlijans atifisyèl', text: 'Akonpaye entegrasyon entèlijans atifisyèl la pou l sèvi devlopman nasyonal.' },
  ],
  parcoursIntro:
    'Pakou mwen chita nan kalfou sektè piblik la, sektè prive a ak angajman kominotè. Mwen gen eksperyans ak konesans nan gouvènans piblik pou m mete nan sèvis enterè jeneral la.',
  positionnement:
    'Yon pakou ki bati ant dwa, kominikasyon ak sèvis piblik. Kòm avoka ak konsiltan endepandan nan gouvènans piblik, mwen konstwi yon eksperyans solid nan kalfou dwa, kominikasyon ak sèvis enterè jeneral la.',
  experience: [
    {
      field: 'Sektè piblik',
      items: [
        { role: 'Sekretè egzekitif Premye minis', place: 'Primature' },
        { role: 'Konsiltan', place: "Cabinet du Secrétaire d'État à la Population" },
        { role: 'Konsiltan jiridik', place: "Ministère de l'Agriculture" },
        { role: 'Konsiltan an kominikasyon', place: 'Cour supérieure des comptes et du contentieux administratif' },
      ],
    },
    {
      field: 'Sektè prive',
      items: [
        { role: 'Pacific FM', place: 'emisyon Tribune parlementaire' },
        { role: 'Jounal Le National' },
        { role: 'Haiti Press Network' },
        { role: 'Konsiltan endepandan', place: 'pou plizyè antrepriz' },
        { role: 'Pwofesè', place: 'nan nivo segondè ak pwofesyonèl' },
      ],
    },
    {
      field: 'Angajman kominotè',
      items: [{ role: 'Kofondatè òganizasyon sosyal', place: 'ki pa fè benefis' }],
    },
  ],
  organisations: [
    { ...fr.organisations[0], text: 'Òganizasyon sosyal san bi likratif, ki kofonde pou ede devlopman entegre kominote yo.' },
    { ...fr.organisations[1], text: 'Inisyativ ki kofonde pou obsève, koute ak valorize jèn ayisyen yo.' },
    { ...fr.organisations[2], text: 'Òganizasyon ki kofonde, ki angaje pou akonpaye inisyativ sitwayen ak pwojè sosyal.' },
  ],
  formation: [
    fr.formation[0],
    fr.formation[1],
    { title: fr.formation[2].title, place: 'Fòmasyon avanse' },
    { title: 'Sètifikasyon pwofesyonèl', place: 'Jesyon pwojè, jesyon, kreyasyon mak ak kontni, redaksyon' },
  ],
  publicationCategories: ['Dwa', 'Sosyete', 'Gouvènans', 'Anviwònman', 'Devlopman', 'Opinyon'],
  videos: [
    { id: '_u33V7Isa80', title: 'Entèvansyon', category: 'Entèvansyon' },
    { id: 'bU1dTzDXobs', title: 'Konvèsasyon', category: 'Deba' },
    { id: '3ZAFiCmsOuw', title: 'Echanj', category: 'Entèvansyon' },
    { id: 'WKaDXQsJin8', title: 'Tab wonn', category: 'Analiz' },
  ],
  newsCategories: ['Sou teren', 'Kominike', 'Rankont'],
  news: [
    { ...fr.news[0], title: 'Angajman sitwayen ap gaye nan Senmak', excerpt: 'Plis e plis sitwayen ap antre nan vizyon Réginald Calixte pou yon nouvo gouvènans lokal.', cat: 'Sou teren' },
    { ...fr.news[1], title: 'Kominike : Pou yon rantre lekòl ki an sekirite', excerpt: 'Réginald Calixte mande otorite yo pran mezi ijan pou garanti sekirite elèv yo.', cat: 'Kominike' },
    { ...fr.news[2], title: 'Rankont ak asosyasyon katye yo', excerpt: 'Echanj ak lidè kominotè yo sou kesyon sekirite ak asenisman.', cat: 'Rankont' },
    { ...fr.news[3], title: 'Entèvansyon sou gouvènans lokal', excerpt: 'Pran lapawòl sou nesesite pou jesyon lajan piblik minisipal yo fèt nan transparans.', cat: 'Sou teren' },
    { ...fr.news[4], title: 'Rankont ak aktè devlopman yo', excerpt: 'Echanj ak aktè devlopman kominotè nan rejyon an.', cat: 'Rankont' },
    { ...fr.news[5], title: 'Lidèchip kòmanse ak koute', excerpt: 'Yon refleksyon sou enpòtans koute moun pou bati yon vizyon kolektif.', cat: 'Kominike' },
  ],
  contactCategories: ['Demann medya', 'Envitasyon', 'Kolaborasyon', 'Inisyativ kominotè', 'Kesyon jeneral'],
  pressUsage:
    'Foto sa yo disponib pou redaksyon, jounalis ak patnè yo, pou ilistre kontni ki gen rapò ak Réginald Calixte ak aktivite piblik li yo. Nou ka itilize yo lib depi nou mansyone kredi « © Réginald Calixte ». Okenn chanjman ki ta chanje sans oswa entegrite foto a pa otorize.',
  pressPhotos: [
    { ...fr.pressPhotos[0], title: 'Pòtrè ofisyèl', alt: 'Pòtrè ofisyèl Réginald Calixte' },
    { ...fr.pressPhotos[1], title: 'Pòtrè editoryal', alt: 'Réginald Calixte — pòtrè editoryal' },
    { ...fr.pressPhotos[2], alt: 'Place Publique Senmak' },
    { ...fr.pressPhotos[3], title: 'Rankont sitwayen', alt: 'Réginald Calixte ak popilasyon an' },
  ],
  gallery: [
    { image: 'place-publique', alt: 'Place Publique Senmak, ak basen dlo li ak kyòsk li' },
    { image: 'rencontre-citoyenne', alt: 'Sitwayen ki reyini nan yon sal nan Senmak' },
    { image: 'echange-quartier', alt: 'Echanj ak abitan yon katye nan Senmak' },
    { image: 'terrain-foule', alt: 'Réginald Calixte ap souri nan mitan foul la' },
    { image: 'terrain-marche', alt: 'Deplasman sou teren, nan yon lari Senmak' },
    { image: 'assemblee-quartier', alt: 'Popilasyon an rasanble deyò' },
    { image: 'helicoptere-terrain', alt: 'Yon elikoptè ki ateri sou yon teren foutbòl' },
    { image: 'poignee-de-main', alt: 'Yon lanmen sou yon teren espò' },
    { image: 'distribution-cadeaux', alt: 'Preparasyon kado pandan yon aktivite kominotè' },
    { image: 'activite-communautaire', alt: 'Aktivite kominotè ak popilasyon an nan yon atmosfè fèt' },
  ],
  cv: {
    summary:
      "Mwen gen yon <em>master II en Droit international et comparé de l'environnement</em> e mwen lisansye an dwa. Mwen akeri konesans ak eksperyans pwofon ki pèmèt mwen okipe pòs estratejik. Jodi a, mwen mete konpetans mwen yo nan sèvis konsèy jiridik, kontansye anviwònmantal, gouvènans piblik, redaksyon dokiman estratejik ak jesyon dosye konplèks.",
    domain: 'Dwa, kominikasyon, gouvènans ak planifikasyon estratejik',
    skills:
      'Konpetans sa yo pèmèt mwen bay konsiltasyon jiridik, konsevwa dokiman teknik pou ede pran desizyon, asire bon jesyon resous yon enstitisyon epi elabore estrateji pou egzekite pwojè.',
    jobs: [
      { role: 'Konsiltan jiridik', org: 'FOS-LA', period: 'Oktòb 2025 jiska jodi a' },
      { role: 'Sekretè egzekitif Premye minis', org: "Alix Didier Fils-Aimé, Primature de la République d'Haïti", period: 'Novanm 2024 – jiyè 2026' },
      { role: 'Konsiltan jiridik', org: 'Succès École professionnelle St-Monfort de Saint-Marc', period: 'Jen 2021 jiska jodi a' },
      { role: 'Konsiltan jiridik', org: "Ministère de l'Agriculture", period: 'Avril 2020 – jiyè 2021', note: 'Bay direktiv sou tout kesyon jiridik.' },
      { role: "Konsiltan nan kabinè Sekretè d Eta pou Popilasyon", org: "Bureau du Secrétaire d'État à la Population", period: 'Mas 2020', note: 'Patisipe nan kowòdinasyon kabinè a, ede nan konsepsyon ak aplikasyon politik sektoryèl la.' },
      { role: 'Konsiltan an kominikasyon', org: 'Cour supérieure des comptes et du contentieux administratif', period: 'Janvye – avril 2019' },
      { role: 'Direktè piblikasyon', org: 'Magazine critique La Voie', period: 'Avril 2018 – mas 2020', note: 'Veye pou liy editoryal magazin nan respekte, pwopoze sijè, ekri atik epi fè lyen ak direksyon an.' },
      { role: 'Redaktè', org: 'Agence de presse HPN (Haiti Press Network)', period: '2018 – 2019', note: 'Ekri atik aktyalite ak atik opinyon pou jounal la.' },
      { role: 'Redaktè', org: 'Journal Le National', period: '2017 – 2018', note: 'Ekri atik pou jounal la.' },
      { role: 'Prezantatè', org: 'Emisyon Tribune parlementaire, Pacific FM', period: '2017 – 2018', note: 'Diskite sou Palman ayisyen an ak palmantè ak espesyalis dwa piblik.' },
      { role: 'Pwofesè filozofi', org: '', period: '2016 – 2018', note: 'Ede elèv yo devlope lespri kritik, epi konnen filozòf ak filozofi ki nan pwogram klas Tèminal la.' },
      { role: 'Pwofesè literati', org: 'Collège FILSECCAM', period: '2015', note: 'Ede elèv yo konprann pòte literati a, epi konnen otè, zèv ak peryòd ki make literati ayisyen ak literati franse.' },
      { role: 'Redaktè an chèf', org: 'Trip Info Magazine', period: '2013', note: 'Bay ekip redaksyon an konsiy.' },
      { role: 'Pwofesè franse', org: 'PAODES-Université', period: '2012', note: 'Anseye baz lang franse a ak yon metòd entèaktif.' },
    ],
    political: [
      { role: 'Vis-prezidan', org: 'Òganizasyon pati politik RELANS !', period: 'Depi mas 2022' },
      { role: 'Kowòdonatè nasyonal', org: "Pati PAC (Plan d'actions citoyennes)", period: '2013', note: 'Kandida pou depite nan Sikonskripsyon Senmak, eleksyon lejislatif 2015.' },
    ],
    social: [
      { role: 'Direktè egzekitif', org: 'Fondation pour la démocratie et la culture « Lakounsa »', period: '2019 – 2020' },
      { role: 'Sekretè kominikasyon', org: 'Observatoire de la Jeunesse Haïtienne', period: '2017 – 2019' },
      { role: 'Direktè egzekitif', org: "Bureau d'Appui au Développement Intégré", period: '2014', note: 'Planifye ak kowòdone aktivite biwo a, reprezante l epi diskite ak patnè enstitisyon an. Garanti respè priyorite enstitisyon an, estati l ak règleman entèn li.' },
    ],
    degrees: [
      fr.cv.degrees[0],
      fr.cv.degrees[1],
      { ...fr.cv.degrees[2], period: '2009 – 2011 (pa fini)' },
    ],
    training: [
      { title: 'Dwa ekonomik, sosyal ak kiltirèl (DESC) ak Pak entènasyonal ki gen rapò ak dwa ekonomik, sosyal ak kiltirèl (PIDESC)', place: 'Seminè ak MINUSTAH', period: 'Out 2012' },
      { title: 'Palmantaris', place: 'Université Laval', period: 'Jen 2018' },
      { title: 'Écrire pour gouverner', place: 'CEFAN, Université Laval', period: 'Desanm 2018' },
    ],
    languages: [
      { name: 'Kreyòl ayisyen', level: 'Lang manman' },
      { name: 'Franse', level: 'Trè byen' },
      { name: 'Anglè', level: 'Nivo avanse' },
    ],
    awards: [
      { title: 'Sètifika rekonesans', org: 'Tribune nationale de la jeunesse haïtienne' },
      { title: 'Lidè sètifye', org: 'Global Leadership Summit' },
    ],
  },
};
