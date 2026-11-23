/**
 * Site content in English.
 * Rules: names of organisations, institutions, degrees and official documents kept in their
 * original form; Creole signatures unchanged; no new statements.
 */
import * as fr from './site';

export const en = {
  identity: {
    ...fr.identity,
    status: 'Candidate for Deputy',
    circonscription: '1st Constituency of Saint-Marc',
    statusShort: 'Candidate for Deputy · 1st Constituency of Saint-Marc',
    descriptor: 'Father · Citizen · Committed actor',
    motto: 'Engagement makes the citizen',
  },
  nav: [
    { name: 'Home', path: '/' },
    { name: 'About', path: '/biographie' },
    { name: 'Vision', path: '/vision' },
    { name: 'Priorities', path: '/priorites' },
    { name: 'Background', path: '/parcours' },
    { name: 'Publications', path: '/publications' },
    { name: 'Media', path: '/medias' },
    { name: 'News', path: '/actualites' },
  ],
  contact: { ...fr.contact, addressFooter: ['Saint-Marc, Artibonite', 'Haiti'], addressContact: ['City centre, Saint-Marc', 'Artibonite, Haiti'] },
  hero: {
    lines: ['One horizon: the common good.', "One unwavering conviction: everything for Haiti, in the name of every person's dignity."],
  },
  conviction:
    "I am convinced that only an audible and credible voice from Saint-Marc can defend Saint-Marc's strategic interests at the scale of today's challenges. This calls for alternative, consistent and enlightened leadership.",
  bio: {
    title: 'A career built across law, communication and public service.',
    paragraphs: [
      'I was born in Saint-Marc, the pivotal commune of the Bas-Artibonite. My profile can be summed up in three Creole words: <strong>“Moun, Ayisyen, Sitwayen.”</strong>',
      "A lawyer duly registered with the Barreau de Port-au-Prince and holder of a <em>Master II en droit international et comparé de l'environnement</em>, I am a committed advocate of the rule of law and good governance.",
      'Guided by the principles of responsibility and civic engagement, I hold a vision of politics grounded in respect for human dignity and the common good.',
    ],
    triad: fr.bio.triad,
  },
  convictions: [
    'Human dignity before political ambition',
    'Respect, even in disagreement',
    'Violence, defamation and intimidation have no place in politics',
    'Engagement makes the citizen',
    'Transparency is a democratic requirement',
    'Politics must serve the common good',
  ],
  boussole: ['the Haitian Act of Independence', 'the Universal Declaration of Human Rights', 'the Haitian Constitution', 'La Dessalinienne'],
  methode: [
    'studies and data',
    'building on local experience',
    'listening',
    'pragmatism suited to the Haitian context',
    "a genuine understanding of the country's challenges",
  ],
  ctaBand: ["Let us build a country worthy", 'of our ancestors’ dreams, one that honours', 'our duty to future generations!'],
  visionIntro:
    'Saint-Marc is at once a city, a commune, an electoral district and the seat of an arrondissement. It is a major demographic, economic and political hub of the Bas-Artibonite.',
  visionLead:
    "The proposed vision rests on solution-driven leadership grounded in rigour, listening and a genuine understanding of the country's challenges.",
  axesIntro: 'A non-exhaustive list of issues and files that will guide my commitment to the common good.',
  axes: [
    { title: 'Local governance', text: 'Bringing community leaders and local authorities together to contribute to the development of Saint-Marc.' },
    { title: 'The Bas-Artibonite', text: 'Promoting the Bas-Artibonite with a view to its administrative autonomy.' },
    { title: 'Budget oversight, control and accountability', text: 'Exercising rigorous oversight of the use of public resources and demanding accountability.' },
    { title: 'Economic, social and cultural rights', text: "Advancing the effective enjoyment of the population's economic, social and cultural rights." },
    { title: 'Decentralisation', text: 'Championing decentralisation to bring State services closer to citizens.' },
    { title: 'National sovereignty', text: "Defending national sovereignty and the country's capacity to decide its own future." },
    { title: 'Rule of law and balance of powers', text: 'Strengthening the rule of law and the balance between public powers.' },
    { title: 'Artificial intelligence', text: 'Supporting the integration of artificial intelligence in the service of national development.' },
  ],
  parcoursIntro:
    'My career lies at the crossroads of the public sector, the private sector and community engagement. I bring experience and expertise in public governance to the service of the common good.',
  positionnement:
    'A career built across law, communication and public service. As a lawyer and independent consultant in public governance, I have built solid experience at the intersection of law, communication and service to the common good.',
  experience: [
    {
      field: 'Public sector',
      items: [
        { role: 'Executive Secretary to the Prime Minister', place: 'Primature' },
        { role: 'Consultant', place: "Cabinet du Secrétaire d'État à la Population" },
        { role: 'Legal consultant', place: "Ministère de l'Agriculture" },
        { role: 'Communication consultant', place: 'Cour supérieure des comptes et du contentieux administratif' },
      ],
    },
    {
      field: 'Private sector',
      items: [
        { role: 'Pacific FM', place: 'Tribune parlementaire programme' },
        { role: 'Le National (newspaper)' },
        { role: 'Haiti Press Network' },
        { role: 'Independent consultant', place: 'for several companies' },
        { role: 'Teacher', place: 'secondary and vocational level' },
      ],
    },
    {
      field: 'Community engagement',
      items: [{ role: 'Co-founder of social organisations', place: 'non-profit' }],
    },
  ],
  organisations: [
    { ...fr.organisations[0], text: 'A non-profit social organisation, co-founded to support the integrated development of communities.' },
    { ...fr.organisations[1], text: 'A co-founded initiative dedicated to observing, listening to and empowering Haitian youth.' },
    { ...fr.organisations[2], text: 'A co-founded organisation supporting citizen initiatives and social projects.' },
  ],
  formation: [
    fr.formation[0],
    fr.formation[1],
    { title: fr.formation[2].title, place: 'Advanced training' },
    { title: 'Professional certifications', place: 'Project management, management, brand & content creation, writing' },
  ],
  publicationCategories: ['Law', 'Society', 'Governance', 'Environment', 'Development', 'Opinion'],
  videos: [
    { id: '_u33V7Isa80', title: 'Appearance', category: 'Appearance' },
    { id: 'bU1dTzDXobs', title: 'Conversation', category: 'Debate' },
    { id: '3ZAFiCmsOuw', title: 'Exchange', category: 'Appearance' },
    { id: 'WKaDXQsJin8', title: 'Round table', category: 'Analysis' },
  ],
  newsCategories: ['In the field', 'Press releases', 'Meetings'],
  news: [
    { ...fr.news[0], title: 'Civic engagement gains ground in Saint-Marc', excerpt: "More and more citizens are joining Réginald Calixte's vision for a new approach to local governance.", cat: 'In the field' },
    { ...fr.news[1], title: 'Press release: For a safe return to school', excerpt: "Réginald Calixte calls on the authorities to take urgent measures to guarantee students' safety.", cat: 'Press releases' },
    { ...fr.news[2], title: 'Meeting with neighbourhood associations', excerpt: 'Discussions with community leaders on security and sanitation issues.', cat: 'Meetings' },
    { ...fr.news[3], title: 'Remarks on local governance', excerpt: 'Speaking on the need for transparent management of municipal public funds.', cat: 'In the field' },
    { ...fr.news[4], title: 'Meeting with development stakeholders', excerpt: 'Discussions with community development stakeholders in the region.', cat: 'Meetings' },
    { ...fr.news[5], title: 'Leadership begins with listening', excerpt: 'A reflection on the importance of listening in building a collective vision.', cat: 'Press releases' },
  ],
  contactCategories: ['Media request', 'Invitation', 'Collaboration', 'Community initiative', 'General question'],
  pressUsage:
    'These photographs are made available to newsrooms, journalists and partners to illustrate content relating to Réginald Calixte and his public activities. They may be used freely provided the credit “© Réginald Calixte” is included. No alteration that changes the meaning or integrity of the image is permitted.',
  pressPhotos: [
    { ...fr.pressPhotos[0], title: 'Official portrait', alt: 'Official portrait of Réginald Calixte' },
    { ...fr.pressPhotos[1], title: 'Editorial portrait', alt: 'Réginald Calixte — editorial portrait' },
    { ...fr.pressPhotos[2], alt: 'The Place Publique in Saint-Marc' },
    { ...fr.pressPhotos[3], title: 'Citizen meeting', alt: 'Réginald Calixte with residents' },
  ],
  gallery: [
    { image: 'place-publique', alt: 'The Place Publique in Saint-Marc, with its fountain and bandstand' },
    { image: 'rencontre-citoyenne', alt: 'Citizens gathered in a hall in Saint-Marc' },
    { image: 'echange-quartier', alt: 'Discussion with residents of a Saint-Marc neighbourhood' },
    { image: 'terrain-foule', alt: 'Réginald Calixte smiling among the crowd' },
    { image: 'terrain-marche', alt: 'On the ground, in a street in Saint-Marc' },
    { image: 'assemblee-quartier', alt: 'Residents gathered outdoors' },
    { image: 'helicoptere-terrain', alt: 'A helicopter landing on a football pitch' },
    { image: 'poignee-de-main', alt: 'A handshake on a sports field' },
    { image: 'distribution-cadeaux', alt: 'Gifts being prepared during a community event' },
    { image: 'activite-communautaire', alt: 'A festive community event with residents' },
  ],
  cv: {
    summary:
      "Holder of a <em>Master II en Droit international et comparé de l'environnement</em> and a law degree (<em>Licence en droit</em>), I have gained in-depth knowledge and experience that have enabled me to hold strategic positions. Today, I put my skills to work in legal advice, environmental litigation, public governance, the drafting of strategic documents and the management of complex files.",
    domain: 'Law, communication, governance and strategic planning',
    skills:
      "These skills enable me to provide legal consultations, design technical documents for decision-making, ensure the effective management of an institution's resources and develop strategies for project implementation.",
    jobs: [
      { role: 'Legal consultant', org: 'FOS-LA', period: 'October 2025 – present' },
      { role: 'Executive Secretary to the Prime Minister', org: "Alix Didier Fils-Aimé, Primature de la République d'Haïti", period: 'November 2024 – July 2026' },
      { role: 'Legal consultant', org: 'Succès École professionnelle St-Monfort de Saint-Marc', period: 'June 2021 – present' },
      { role: 'Legal consultant', org: "Ministère de l'Agriculture", period: 'April 2020 – July 2021', note: 'Providing guidance on all legal matters.' },
      { role: 'Consultant to the Office of the Secretary of State for Population', org: "Bureau du Secrétaire d'État à la Population", period: 'March 2020', note: 'Contributing to the coordination of the office and helping to design and implement sector policy.' },
      { role: 'Communication consultant', org: 'Cour supérieure des comptes et du contentieux administratif', period: 'January – April 2019' },
      { role: 'Publication director', org: 'Magazine critique La Voie', period: 'April 2018 – March 2020', note: "Ensuring the magazine's editorial line was respected, proposing topics, writing articles and liaising with management." },
      { role: 'Staff writer', org: 'Agence de presse HPN (Haiti Press Network)', period: '2018 – 2019', note: 'Writing news and opinion articles for the daily.' },
      { role: 'Staff writer', org: 'Journal Le National', period: '2017 – 2018', note: 'Writing articles for the daily.' },
      { role: 'Presenter', org: 'Tribune parlementaire programme, Pacific FM', period: '2017 – 2018', note: 'Discussing the Haitian Parliament with parliamentarians and public law specialists.' },
      { role: 'Philosophy teacher', org: '', period: '2016 – 2018', note: 'Helping students develop critical thinking and learn about the philosophers and philosophies of the final-year curriculum.' },
      { role: 'Literature teacher', org: 'Collège FILSECCAM', period: '2015', note: 'Helping students understand the reach of literature and learn about the major authors, works and periods of Haitian and French literature.' },
      { role: 'Editor-in-chief', org: 'Trip Info Magazine', period: '2013', note: 'Directing the editorial team.' },
      { role: 'French teacher', org: 'PAODES-Université', period: '2012', note: 'Teaching the fundamentals of French through an interactive approach.' },
    ],
    political: [
      { role: 'Vice-president', org: 'RELANS! political party organisation', period: 'Since March 2022' },
      { role: 'National coordinator', org: "PAC party (Plan d'actions citoyennes)", period: '2013', note: 'Candidate for Deputy for the Saint-Marc constituency, 2015 legislative elections.' },
    ],
    social: [
      { role: 'Executive director', org: 'Fondation pour la démocratie et la culture « Lakounsa »', period: '2019 – 2020' },
      { role: 'Communications secretary', org: 'Observatoire de la Jeunesse Haïtienne', period: '2017 – 2019' },
      { role: 'Executive director', org: "Bureau d'Appui au Développement Intégré", period: '2014', note: "Planning and coordinating the office's activities, representing it and engaging with the institution's partners. Ensuring respect for the institution's priorities, statutes and internal rules." },
    ],
    degrees: [
      fr.cv.degrees[0],
      fr.cv.degrees[1],
      { ...fr.cv.degrees[2], period: '2009 – 2011 (not completed)' },
    ],
    training: [
      { title: 'Economic, social and cultural rights (ESCR) and the International Covenant on Economic, Social and Cultural Rights (ICESCR)', place: 'Seminar with MINUSTAH', period: 'August 2012' },
      { title: 'Parliamentarism', place: 'Université Laval', period: 'June 2018' },
      { title: 'Écrire pour gouverner', place: 'CEFAN, Université Laval', period: 'December 2018' },
    ],
    languages: [
      { name: 'Haitian Creole', level: 'Native language' },
      { name: 'French', level: 'Very good' },
      { name: 'English', level: 'Advanced' },
    ],
    awards: [
      { title: 'Certificate of recognition', org: 'Tribune nationale de la jeunesse haïtienne' },
      { title: 'Certified leader', org: 'Global Leadership Summit' },
    ],
  },
};
