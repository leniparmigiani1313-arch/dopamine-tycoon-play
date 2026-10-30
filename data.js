/* Dopamine Tycoon : contenu du jeu (mécaniques, améliorations, succès, événements, chapitres). */
window.DT = window.DT || {};
(function (DT) {
'use strict';

const I = {
  bell:  '<path d="M6 16v-5a6 6 0 0 1 12 0v5l1.5 2h-15z"/><path d="M10 20.5a2 2 0 0 0 4 0"/><circle cx="18" cy="5" r="2.6" fill="currentColor" stroke="none"/>',
  heart: '<path d="M12 20s-7.5-4.6-7.5-10.2A4.2 4.2 0 0 1 12 7.2a4.2 4.2 0 0 1 7.5 2.6C19.5 15.4 12 20 12 20z"/>',
  phone: '<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M12 7v8m-3-3 3 3 3-3"/>',
  play:  '<circle cx="12" cy="12" r="9"/><path d="M10 8.5v7l6-3.5z" fill="currentColor"/>',
  flame: '<path d="M12 2.5c.8 3.2 5.5 5.2 5.5 10.5a5.5 5.5 0 0 1-11 0c0-2.3 1.2-4 2.3-5 0 2.2 1 3.4 2.2 3.4 0-3.3-1-5.6 1-8.9z"/>',
  gift:  '<rect x="4" y="10" width="16" height="10.5" rx="1"/><rect x="3" y="7" width="18" height="3.5" rx="1"/><path d="M12 7v13.5M12 7c-1.5-4-6-4-5.5-.8M12 7c1.5-4 6-4 5.5-.8"/>',
  graph: '<circle cx="6" cy="6" r="2.2"/><circle cx="18" cy="6" r="2.2"/><circle cx="12" cy="18" r="2.2"/><circle cx="12" cy="10.5" r="1.6" fill="currentColor"/><path d="M7.8 7.2 10.6 9.4M16.2 7.2 13.4 9.4M12 12.1v3.7"/>',
  robot: '<rect x="5" y="7" width="14" height="11" rx="3"/><path d="M12 7V4.2"/><circle cx="12" cy="3.2" r="1"/><circle cx="9.3" cy="12" r="1.3" fill="currentColor"/><circle cx="14.7" cy="12" r="1.3" fill="currentColor"/><path d="M9.5 15.3h5"/>',
  vr:    '<path d="M3 9.5A2.5 2.5 0 0 1 5.5 7h13A2.5 2.5 0 0 1 21 9.5v4a2.5 2.5 0 0 1-2.5 2.5h-3.2l-2-2h-2.6l-2 2H5.5A2.5 2.5 0 0 1 3 13.5z"/><circle cx="8" cy="11.5" r="1.6"/><circle cx="16" cy="11.5" r="1.6"/>',
  chip:  '<rect x="7" y="7" width="10" height="10" rx="1.5"/><path d="M10 7V4M14 7V4M10 20v-3M14 20v-3M7 10H4M7 14H4M20 10h-3M20 14h-3"/><circle cx="12" cy="12" r="1.8" fill="currentColor"/>',
  trophy:'<path d="M8 4h8v5a4 4 0 0 1-8 0z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20h7M10 17h4v3h-4z"/>',
  alert: '<path d="M12 3 2.5 20h19z"/><path d="M12 10v4.5"/><circle cx="12" cy="17.2" r=".9" fill="currentColor"/>',
  lock:  '<rect x="5" y="10.5" width="14" height="10" rx="2"/><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5"/>',
  sound: '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
  mute:  '<path d="M4 9.5h3.5L12 5.5v13l-4.5-4H4z"/><path d="m16 9.5 5 5m0-5-5 5"/>',
  gear:  '<circle cx="12" cy="12" r="3"/><path d="M12 2.5v3M12 18.5v3M21.5 12h-3M5.5 12h-3M18.7 5.3l-2.1 2.1M7.4 16.6l-2.1 2.1M18.7 18.7l-2.1-2.1M7.4 7.4 5.3 5.3"/>',
  plane: '<path d="M21 15.5v-2l-8-5V3.5a1.5 1.5 0 0 0-3 0V8.5l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-6z"/>',
  help:  '<circle cx="12" cy="12" r="9"/><path d="M9.3 9.3a2.8 2.8 0 1 1 3.9 2.6c-.8.4-1.2 1-1.2 1.8v.6"/><circle cx="12" cy="17" r=".9" fill="currentColor"/>',
  sat:   '<rect x="9.5" y="9.5" width="5" height="5" rx="1" transform="rotate(45 12 12)"/><path d="m8.5 8.5-3-3M15.5 15.5l3 3"/><rect x="1.5" y="2.5" width="6" height="3.5" rx=".6" transform="rotate(45 4.5 4.25)"/><rect x="16.5" y="18" width="6" height="3.5" rx=".6" transform="rotate(45 19.5 19.75)"/><path d="M15.5 5.5a4 4 0 0 1 3 3M16 2.5a7 7 0 0 1 5.5 5.5"/>',
  twin:  '<circle cx="8.5" cy="8" r="3.2"/><path d="M2.5 20a6 6 0 0 1 12 0"/><circle cx="15.5" cy="8" r="3.2" stroke-dasharray="2 2"/><path d="M13 14.6A6 6 0 0 1 21.5 20" stroke-dasharray="2 2"/>',
  hive:  '<path d="M12 2.8 15.5 4.8v4L12 10.8 8.5 8.8v-4z"/><path d="M8.5 8.8 12 10.8v4l-3.5 2-3.5-2v-4z"/><path d="M15.5 8.8 19 10.8v4l-3.5 2-3.5-2v-4z"/><path d="M12 14.8l3.5 2v4l-3.5 2-3.5-2v-4z"/><circle cx="12" cy="6.8" r="1" fill="currentColor"/>',
  eye:   '<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3.4"/><circle cx="12" cy="12" r="1.2" fill="currentColor"/><path d="M12 2v1.8M4.5 4.5l1.3 1.3M19.5 4.5l-1.3 1.3"/>',
  galaxy:'<ellipse cx="12" cy="12" rx="9.5" ry="3.8" transform="rotate(-25 12 12)"/><circle cx="12" cy="12" r="2.4" fill="currentColor"/><circle cx="5" cy="6" r=".8" fill="currentColor"/><circle cx="19.5" cy="17" r=".8" fill="currentColor"/><circle cx="18" cy="5" r=".6" fill="currentColor"/>',
  lotus: '<path d="M12 19c-3-2.5-4.5-5.5-4.5-8.5 0-2.3 1.7-4.7 4.5-6.5 2.8 1.8 4.5 4.2 4.5 6.5 0 3-1.5 6-4.5 8.5z"/><path d="M12 19c-4 .2-7.5-1.8-9-5.5 2.2-.8 4.3-.7 6 .2M12 19c4 .2 7.5-1.8 9-5.5-2.2-.8-4.3-.7-6 .2"/><path d="M5 21.2h14"/>',
};
DT.ICONS = I;
DT.svg = (name, cls = '') => `<svg class="ic ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${I[name] || ''}</svg>`;

DT.GENS = [
  {code:'PUSH', icon:'bell',  name:'Notification push',  desc:'Un petit point rouge. Personne ne résiste.',             cost:15,     prod:0.1},
  {code:'LIKE', icon:'heart', name:"Bouton J'aime",       desc:'Validation sociale livrée à la demande.',                cost:100,    prod:1},
  {code:'FEED', icon:'phone', name:'Scroll infini',       desc:"Il n'y a plus de bas de page. Il n'y en aura jamais.",   cost:1100,   prod:8},
  {code:'AUTO', icon:'play',  name:'Autoplay',            desc:"L'épisode suivant démarre dans 5… 4… 3…",                cost:12000,  prod:47},
  {code:'STRK', icon:'flame', name:'Série quotidienne',   desc:'Ne casse surtout pas ta flamme de 212 jours.',           cost:130000, prod:260},
  {code:'LOOT', icon:'gift',  name:'Loot box',            desc:'Récompense variable : la découverte préférée de Skinner.', cost:1.4e6, prod:1400},
  {code:'ALGO', icon:'graph', name:'Algorithme de reco',  desc:'Il sait ce que tu veux avant toi.',                      cost:2e7,    prod:7800},
  {code:'INFL', icon:'robot', name:'Influenceur IA',      desc:'Ne dort jamais. Poste toutes les 4 minutes.',            cost:3.3e8,  prod:44000},
  {code:'VR',   icon:'vr',    name:'Casque VR',           desc:'Le monde réel, en résolution inférieure.',               cost:5.1e9,  prod:260000},
  {code:'NEUR', icon:'chip',  name:'Implant neuronal',    desc:"Plus besoin d'écran. Plus besoin de rien.",               cost:7.5e10, prod:1.6e6},
  {code:'SAT',  icon:'sat',   name:'Constellation de satellites', desc:"Du Wi-Fi jusque dans la grotte où tu voulais t'isoler.", cost:1e12, prod:1e7},
  {code:'TWIN', icon:'twin',  name:'Jumeau numérique',    desc:'Ton double IA scrolle pendant que tu dors. Il like mieux que toi.', cost:1.4e13, prod:6.5e7},
  {code:'HIVE', icon:'hive',  name:'Conscience collective', desc:"Huit milliards de cerveaux, un seul fil d'actu.",         cost:1.7e14, prod:4.3e8},
  {code:'SIMU', icon:'eye',   name:'Simulation totale',    desc:'Le monde entier tourne dans un onglet de ton navigateur. 47 onglets ouverts.', cost:2.2e15, prod:2.8e9},
  {code:'COSM', icon:'galaxy', name:'Réseau galactique',   desc:'Les extraterrestres aussi ont des notifications. Ils adorent tes stories.',  cost:3e16,  prod:1.8e10},
];

DT.TIERS = [{at:1, m:10}, {at:10, m:50}, {at:25, m:500}, {at:50, m:5e4}, {at:100, m:5e6}];
const TIER_NAMES = [
  ['Pastille rouge', 'Vibration fantôme', "Notif à 3 h du mat'", '« Quelqu\'un a aimé ta photo »', 'Notif de notif'],
  ['Double tap', 'Compteur caché', "Like d'un crush", 'Réactions animées', 'Like de ta mère'],
  ['Pull-to-refresh', 'Chargement fluide', 'Feed « Pour toi »', 'Scroll de 3 h du matin', 'Doomscroll ultime'],
  ["Passer l'intro", 'Prochain épisode : 5 s', 'Question « Toujours là ? » supprimée', 'Cliffhanger procédural', 'Binge éternel'],
  ['Flamme de 3 jours', 'Rappel culpabilisant', 'Le hibou vert te surveille', 'Gel de série payant', 'Série de 10 ans'],
  ['Coffre commun', 'Animation de légendaire', 'Pity timer', 'Battle pass saison 47', 'Gacha infernal'],
  ['Bulle de filtre', 'Rage bait', 'Recommandé pour toi', "Prédiction d'humeur", 'Il lit tes pensées'],
  ['Filtre beauté', 'Placement de produit', 'Collab virale', 'Drama calculé', 'Idole parasociale'],
  ['Métavers bêta', 'Les jambes, enfin', 'Terrain virtuel à 2 M', 'Oubli du réel', 'Ready Player You'],
  ['Firmware 1.0', 'Mise à jour silencieuse', 'Pubs dans les rêves', 'Abonnement neuronal premium', 'Conscience en SaaS'],
  ['Zone blanche supprimée', 'Réseau au sommet du mont Blanc', 'Wi-Fi au fond des océans', 'Couverture polaire', 'Plus aucun endroit hors ligne'],
  ['Réponses automatiques', 'Avatar qui like pour toi', 'Sosie en visio', 'Jumeau plus suivi que toi', "Qui est l'original ?"],
  ['Pensée partagée', 'Humeur synchronisée', 'Rêve collectif', 'Esprit de ruche', 'Un cerveau, huit milliards de pouces'],
  ['Bac à sable infini', 'PNJ très convaincants', 'Bug dans la matrice', 'Patch de la réalité', 'Le développeur, c\'est toi'],
  ['Antenne sur Mars', 'Stories en apesanteur', 'Like interstellaire', 'Influenceur martien', 'Trou noir de l\'attention'],
];

DT.UPS = [];
DT.GENS.forEach((g, i) => DT.TIERS.forEach((t, k) => DT.UPS.push({
  id: `g${i}t${k}`, name: TIER_NAMES[i][k], desc: `${g.name} : production ×2.`, icon: g.icon,
  cost: g.cost * t.m, req: G => G.S.gens[i] >= t.at,
})));
[
  {id:'c1', name:'Pouce agile',       desc:'Chaque tap rapporte 2× plus.',             cost:100, at:15},
  {id:'c2', name:'Pouce en titane',   desc:'Chaque tap rapporte encore 2× plus.',      cost:2000, at:120},
  {id:'c3', name:'Doigt fantôme',     desc:'Chaque tap ajoute 1 % de ta production.',  cost:6e4, at:400},
  {id:'c4', name:'Réflexe pavlovien', desc:'Chaque tap ajoute 2 % de plus.',           cost:5e6, at:1200},
  {id:'c5', name:'Tap compulsif',     desc:'Chaque tap ajoute 4 % de plus.',           cost:5e8, at:3000},
].forEach(u => DT.UPS.push({...u, icon:'heart', req: G => G.S.clicks >= u.at}));
[
  {id:'u_micro',  icon:'flame', name:'Microdosage',        desc:'Les récepteurs se désensibilisent 20 % moins vite.',          cost:2e4},
  {id:'u_gold',   icon:'bell',  name:'Badges dorés',       desc:'Les notifications dorées arrivent 2× plus souvent.',           cost:4e5},
  {id:'u_medit',  icon:'plane', name:'Méditation guidée',  desc:'En mode avion, les récepteurs reviennent 2× plus vite.',       cost:8e5},
  {id:'u_night',  icon:'phone', name:'Mode sombre',        desc:'Le combo tient 2× plus longtemps entre deux taps.',            cost:3e6},
  {id:'u_blue',   icon:'phone', name:'Lumière bleue',      desc:'Production ×1,5. Désensibilisation 10 % plus rapide.',         cost:6e6},
  {id:'u_story',  icon:'play',  name:'Stories éphémères',  desc:'Les bonus des notifications dorées durent 50 % de plus.',       cost:5e7},
  {id:'u_dark',   icon:'graph', name:'Dark patterns',      desc:'Production ×2. Le bouton « Se désabonner » devient gris clair.', cost:2e9},
  {id:'u_crit',   icon:'heart', name:'Algorithme du crush', desc:'Chances de tap critique doublées.',                            cost:1e10},
  {id:'u_neuro',  icon:'chip',  name:'Neuroplasticité',    desc:'Les récepteurs ne descendent plus sous 35 %.',                 cost:5e10},
  {id:'u_fomo',   icon:'alert', name:'FOMO industriel',    desc:'Production ×3. Tout le monde a peur de rater quelque chose.',  cost:1e13},
  {id:'u_sync',   icon:'hive',  name:'Synchronisation mondiale', desc:'Production ×2. La planète entière scrolle au même rythme.', cost:2e16},
  {id:'u_cosmos', icon:'galaxy', name:'Algorithme cosmique', desc:'Production ×2. Même les étoiles regardent tes vidéos jusqu\'au bout.', cost:5e19},
].forEach(u => DT.UPS.push({...u, req: G => G.S.run >= u.cost * 0.25}));
DT.UPS.sort((a, b) => a.cost - b.cost);

/* Emotes à envoyer aux potes (dessins originaux, clins d'œil aux mèmes). viewBox 0 0 100 100. */
const E_ = 'stroke="#1B1029" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"';
DT.EMOTES = [
  {id:'giant', name:'AAAAAH !', svg:`<g ${E_}>
    <ellipse cx="14" cy="52" rx="7" ry="10" fill="#C97B5A"/><ellipse cx="86" cy="52" rx="7" ry="10" fill="#C97B5A"/>
    <ellipse cx="50" cy="50" rx="36" ry="41" fill="#D98C6A"/>
    <ellipse cx="38" cy="21" rx="12" ry="5" fill="#fff" opacity=".35" stroke="none"/>
    <path d="M27 36 L41 42 M73 36 L59 42" stroke-width="5"/>
    <circle cx="36" cy="47" r="5.5" fill="#fff"/><circle cx="37" cy="47" r="2.4" fill="#1B1029"/>
    <circle cx="64" cy="47" r="5.5" fill="#fff"/><circle cx="63" cy="47" r="2.4" fill="#1B1029"/>
    <path d="M29 60 Q50 53 71 60 Q67 90 50 90 Q33 90 29 60Z" fill="#5A1A2A"/>
    <path d="M32 61 Q50 56 68 61 L67 67 Q50 62 33 67Z" fill="#fff" stroke-width="2"/>
    <ellipse cx="50" cy="81" rx="11" ry="6" fill="#FF7E8E" stroke-width="2"/></g>`},
  {id:'rain', name:'Sous la pluie', svg:`<rect x="3" y="3" width="94" height="94" rx="22" fill="#34507F"/>
    <g stroke="#BFD6FF" stroke-width="1.5" opacity=".7"><path d="M12 8v14M24 30v14M86 12v14M78 60v14M16 62v14M92 40v12M40 6v10M62 4v10"/></g>
    <g ${E_}><path d="M30 94 Q20 64 36 44 Q50 26 72 30 Q86 34 85 46 L79 52 L86 60 Q82 67 72 67 Q70 82 60 94Z" fill="#F2C29B"/>
    <path d="M32 46 L16 10 L40 30 L44 4 L55 26 L69 6 L71 30 Q52 24 32 46Z" fill="#1B1029"/>
    <path d="M59 45 q6 4 12 0"/><path d="M70 72 q-4 2 -8 0"/></g>
    <path d="M66 50 q-3 7 0 10 q3 -3 0 -10Z" fill="#9FD3FF"/>`},
  {id:'yuno', name:'Pourquoi tu… ?!', svg:`<g ${E_}>
    <path d="M6 94 q4 -16 18 -14 M94 94 q-4 -16 -18 -14"/>
    <ellipse cx="18" cy="84" rx="7" ry="5" fill="#F0CDB0"/><ellipse cx="82" cy="84" rx="7" ry="5" fill="#F0CDB0"/>
    <ellipse cx="50" cy="44" rx="33" ry="38" fill="#F0CDB0"/>
    <circle cx="32" cy="22" r="1.6" fill="#D9A98A" stroke="none"/><circle cx="66" cy="18" r="1.6" fill="#D9A98A" stroke="none"/><circle cx="72" cy="62" r="1.6" fill="#D9A98A" stroke="none"/>
    <path d="M24 30 L44 38 M76 30 L56 38" stroke-width="5"/>
    <circle cx="36" cy="44" r="9.5" fill="#fff"/><circle cx="64" cy="44" r="9.5" fill="#fff"/>
    <circle cx="37" cy="44" r="3" fill="#1B1029"/><circle cx="63" cy="44" r="3" fill="#1B1029"/>
    <path d="M50 46 q7 9 -2 14"/>
    <path d="M33 66 Q50 57 67 66 Q61 80 50 80 Q39 80 33 66Z" fill="#5A1A2A"/>
    <path d="M37 65 L63 65 L62 69 L38 69Z" fill="#fff" stroke-width="2"/></g>`},
  {id:'wave', name:'Coucou !', svg:`<g ${E_}>
    <circle cx="50" cy="58" r="31" fill="#F2C21B"/>
    <ellipse cx="40" cy="52" rx="7.5" ry="10" fill="#fff"/><ellipse cx="60" cy="52" rx="7.5" ry="10" fill="#fff"/>
    <circle cx="41" cy="54" r="3.4" fill="#1B1029"/><circle cx="59" cy="54" r="3.4" fill="#1B1029"/>
    <path d="M38 70 q12 8 24 0"/>
    <path d="M6 30 q0 -12 6 -18 M12 30 q1 -14 7 -20 M18 32 q3 -12 8 -16" stroke-width="2.5"/>
    <ellipse cx="15" cy="32" rx="10" ry="9" fill="#fff"/><ellipse cx="85" cy="32" rx="10" ry="9" fill="#fff"/>
    <path d="M94 30 q0 -12 -6 -18 M88 30 q-1 -14 -7 -20 M82 32 q-3 -12 -8 -16" stroke-width="2.5"/></g>`},
  {id:'moon', name:'Bonne nuit', svg:`<g ${E_}>
    <path d="M60 6 A44 44 0 1 0 60 94 A36 36 0 1 1 60 6Z" fill="#F6C700"/>
    <path d="M27 46 q6 4 12 0"/><path d="M30 68 q6 3 11 -1"/>
    <path d="M36 54 q4 4 0 7" stroke-width="2.5"/></g>
    <text x="70" y="36" font-family="Bungee, Impact, sans-serif" font-size="18" fill="#fff" stroke="#1B1029" stroke-width="1.5">Z</text>
    <text x="82" y="20" font-family="Bungee, Impact, sans-serif" font-size="12" fill="#fff" stroke="#1B1029" stroke-width="1">z</text>`},
  {id:'chad', name:'Trop facile', svg:`<g ${E_}>
    <path d="M26 32 Q26 92 52 92 Q76 90 76 32Z" fill="#F2C29B"/>
    <path d="M20 50 Q14 6 52 6 Q88 6 82 50 L76 30 Q56 20 28 30Z" fill="#FFD76A"/>
    <path d="M35 50 q5 -3 10 0 M57 50 q5 -3 10 0"/>
    <path d="M50 52 q4 10 -2 14" stroke-width="2.5"/>
    <path d="M42 76 q8 -5 16 0"/>
    <rect x="68" y="66" width="20" height="24" rx="7" fill="#F2C29B"/><path d="M74 66 q2 -14 8 -12 q3 4 -2 12" fill="#F2C29B"/></g>`},
  {id:'knight', name:'Hé hé hé !', svg:`<g ${E_}>
    <circle cx="50" cy="50" r="44" fill="#8D99AE"/>
    <g stroke="#6C7787" stroke-width="2" fill="none"><path d="M12 40h76M10 56h80M14 72h72M30 10v80M50 6v88M70 10v80"/></g>
    <ellipse cx="50" cy="54" rx="28" ry="32" fill="#F2B48C"/>
    <path d="M28 38 q10 -8 18 0 M54 38 q8 -8 18 0" stroke-width="6" stroke="#E0B030"/>
    <circle cx="39" cy="46" r="4.5" fill="#fff"/><circle cx="61" cy="46" r="4.5" fill="#fff"/>
    <circle cx="40" cy="47" r="2" fill="#1B1029"/><circle cx="60" cy="47" r="2" fill="#1B1029"/>
    <ellipse cx="50" cy="58" rx="7" ry="6" fill="#E8927A"/>
    <path d="M36 72 Q50 84 64 72 Q50 76 36 72Z" fill="#fff"/>
    <path d="M50 64 Q34 58 20 70 Q30 62 40 70 Q46 66 50 66 Q54 66 60 70 Q70 62 80 70 Q66 58 50 64Z" fill="#FFD23F"/></g>`},
  {id:'miner', name:'Retour à la mine', svg:`<g ${E_}>
    <ellipse cx="50" cy="62" rx="28" ry="31" fill="#B98A6A"/>
    <ellipse cx="36" cy="72" rx="9" ry="6" fill="#5A4636" opacity=".45" stroke="none"/><ellipse cx="64" cy="58" rx="7" ry="5" fill="#5A4636" opacity=".4" stroke="none"/>
    <path d="M36 60 q5 2 10 0 M54 60 q5 2 10 0"/>
    <path d="M34 56 h12 M54 56 h12" stroke-width="2"/>
    <path d="M40 80 q10 5 20 0"/>
    <path d="M16 46 Q18 10 50 10 Q82 10 84 46Z" fill="#F2C21B"/>
    <rect x="10" y="42" width="80" height="9" rx="4" fill="#E0B010"/>
    <rect x="42" y="20" width="16" height="12" rx="3" fill="#8D99AE"/><circle cx="50" cy="26" r="4" fill="#FFF6B0"/></g>`},
];

/* Cartes à collectionner. L'image vient de app/memes/<id>.(jpg|png|webp|jpeg) si elle existe,
 * sinon du dessin de l'emote du même nom, sinon d'une silhouette. */
DT.RARITIES = {
  common:    {name:'Commune',    color:'#8FB8FF', rgb:'143,184,255', bonus:0.02},
  rare:      {name:'Rare',       color:'#FF9F1C', rgb:'255,159,28',  bonus:0.05},
  epic:      {name:'Épique',     color:'#C77DFF', rgb:'199,125,255', bonus:0.10},
  legendary: {name:'Légendaire', color:'#5CFFE1', rgb:'92,255,225',  bonus:0.25},
  champion:  {name:'Champion',   color:'#FFD23F', rgb:'255,210,63',  bonus:0.50},
};
DT.RARITY_ORDER = ['common', 'rare', 'epic', 'legendary', 'champion'];
DT.CARDS = [
  {id:'wave',      name:'Coucou',               rarity:'common',    line:'Il te fait coucou. Tu ne sais pas pourquoi. Lui non plus.'},
  {id:'barbarian', name:'Barbare musclé',       rarity:'common',    line:'Jamais sauté un jour de jambes. Enfin presque.'},
  {id:'knight',    name:'Chevalier moustachu',  rarity:'common',    line:'Sourire commercial niveau 14.'},
  {id:'recruits',  name:'Recrues en tonneaux',  rarity:'common',    line:'Livrées par trois, comme les notifications.'},
  {id:'royalgiant',name:'Géant royal',          rarity:'common',    line:'La moustache la plus chère du royaume.'},
  {id:'clay',      name:'Tête de pâte',         rarity:'common',    line:'Il sourit. Il ne cligne jamais des yeux. Jamais.'},
  {id:'stare',     name:'Le Regard',             rarity:'common',    line:'Il t’a vu fermer l’appli. Il n’a rien dit.'},
  {id:'dummy',     name:'Le Mannequin pilote',   rarity:'common',    line:'Crash-test validé : 0 dégât, 100 % dopamine.'},
  {id:'ctrlaltdel', name:'Le Gang Ctrl-Alt-Suppr', rarity:'common',    line:'Tu les appelles toujours quand ça plante.'},
  {id:'pepe',      name:'Pepe sur Excel',        rarity:'common',    line:'5 ans d’études pour faire des tableaux croisés.'},
  {id:'kermit',    name:'Kermit à 8 h 05',       rarity:'common',    line:'Raté 8 h. Il attend 9 h. Comme tout le monde.'},
  {id:'lifegoing', name:'La Vie en ce moment',   rarity:'common',    line:'Quand on te demande comment ça va.'},
  {id:'pingfrog',  name:'La Grenouille qui attend', rarity:'common',    line:'Délai d’attente de la demande dépassé.'},
  {id:'fishface',  name:'Tête de poisson',       rarity:'common',    line:'Bloup.'},
  {id:'moon',      name:'La Lune',              rarity:'rare',      line:'Elle te regarde scroller à 3 h du matin.'},
  {id:'yuno',      name:'Pourquoi tu… ?!',      rarity:'rare',      line:'Pourquoi tu tapes pas plus vite ?!'},
  {id:'icewiz',    name:'Sorcier de glace',     rarity:'rare',      line:'Froid comme ton regard quand ta série casse.'},
  {id:'wizard',    name:'Sorcier à capuche',    rarity:'rare',      line:'« Hé hé, c\'est moi le meilleur. »'},
  {id:'beard',     name:'Le Barbu',             rarity:'rare',      line:'Coiffure validée par l\'algorithme.'},
  {id:'forever',   name:'Forever Alone',        rarity:'rare',      line:'Zéro ami, 400 notifications. Il est heureux.'},
  {id:'dafoe',     name:'Le Regard vers le ciel', rarity:'rare',      line:'Il attend que la roue tombe sur JACKPOT.'},
  {id:'grin',      name:'Le Sourire 3D',         rarity:'rare',      line:'Trop de dents. Beaucoup trop de dents.'},
  {id:'keyboard',  name:'Troisième essai',       rarity:'rare',      line:'Au troisième essai, le clavier a perdu.'},
  {id:'yelling',   name:'La Dispute',            rarity:'rare',      line:'Elle crie. Le chat s’en fiche.'},
  {id:'mememan',   name:'Meme Man codeur',       rarity:'rare',      line:'27 réponses copiées-collées. Ça compile.'},
  {id:'llama',     name:'Le Lama hurleur',       rarity:'rare',      line:'AAAAAAAH (mais en lama).'},
  {id:'shrek',     name:'L’Ogre crampe',         rarity:'rare',      line:'La crampe au mollet en plein étirement.'},
  {id:'giant',     name:'Le Géant qui crie',    rarity:'epic',      line:'AAAAAAAAAAAH.'},
  {id:'gobgiant',  name:'Gobelin géant',        rarity:'epic',      line:'Deux gobelins dans le dos, zéro souci.'},
  {id:'prince',    name:'Le Prince',            rarity:'epic',      line:'Charge vers ta dopamine à pleine vitesse.'},
  {id:'miner',     name:'Le Mineur',            rarity:'epic',      line:'Il extrait la dopamine à la main.'},
  {id:'bald',      name:'Le Chauve à lunettes', rarity:'epic',      line:'Profil gauche, vision totale.'},
  {id:'monkey',    name:'Le Singe blond',       rarity:'epic',      line:'Il a vu ton solde de dopamine. Il est fier de toi.'},
  {id:'pekka',     name:'P.E.K.K.A câlin',       rarity:'epic',      line:'Un câlin en armure. Le gobelin n’a pas le choix.'},
  {id:'tornado',   name:'Tempête émotionnelle',  rarity:'epic',      line:'Aspire toute ta dopamine en 3 secondes.'},
  {id:'screamcat', name:'Le Chat qui hurle',     rarity:'epic',      line:'Il a vu ton bilan au casino.'},
  {id:'orangutan', name:'L’Orang-outan farceur', rarity:'epic',      line:'Il te tire la langue depuis la jungle.'},
  {id:'woody',     name:'Le Cowboy maudit',      rarity:'epic',      line:'Il y a un serpent dans ma botte. Et dans ta tête.'},
  {id:'giantguy',  name:'Géant niveau 9',       rarity:'legendary', line:'218/200. Prêt à monter de niveau.'},
  {id:'chad',      name:'Le Chad',              rarity:'legendary', line:'Trop facile.'},
  {id:'samurai',   name:'Le Samouraï',          rarity:'legendary', line:'Un seul coup de sabre, mille taps.'},
  {id:'gorilla',   name:'Le Gorille à cravate', rarity:'legendary', line:'Il a trouvé la banane dorée. Il ne la partagera pas.'},
  {id:'beluga',    name:'Le Chat Beluga',        rarity:'legendary', line:'Il sourit poliment. Il juge en silence.'},
  {id:'goblin',    name:'Le Gobelin hilare',     rarity:'legendary', line:'Il rit de ton solde en banque.'},
  {id:'gigadaron', name:'Le Giga Daron',         rarity:'legendary', line:'Il est parti chercher le pain. Il a ramené la couronne.'},
  {id:'rain',      name:'Prince sous la pluie', rarity:'champion',  line:'Même les princes pleurent.'},
  {id:'comrade',   name:'Le Camarade',          rarity:'champion',  line:'Ta dopamine appartient désormais au peuple.'},
  {id:'troll',     name:'Trollface',             rarity:'champion',  line:'Problème ?'},
  {id:'memeland',  name:'Le Paradis des mèmes',  rarity:'champion',  line:'Là où vont les mèmes quand ils meurent.'},
  {id:'shocked',   name:'Le Choqué',             rarity:'common',    line:'Attends… QUOI ?'},
  {id:'stunned',   name:'Le Chauve sidéré',      rarity:'common',    line:'Il vient de voir le prix des coffres.'},
  {id:'donkey',    name:'L’Âne',                 rarity:'rare',      line:'On est bientôt arrivés ? On est bientôt arrivés ?'},
  {id:'plank',     name:'La Planche',            rarity:'epic',      line:'Il te regarde scroller. Il ne cligne jamais des yeux.'},
  {id:'nice',      name:'Nice',                  rarity:'epic',      line:'Nice.'},
  {id:'shorse',    name:'Le Shorse',             rarity:'legendary', line:'Quand le client veut les options 1 et 2.'},
];
/* Collections : une série complète ajoute son bonus de production (en plus des cartes elles-mêmes). */
DT.SETS = [
  {id:'arena',  name:'Arène royale',    bonus:0.25, cards:['barbarian', 'knight', 'recruits', 'royalgiant', 'icewiz', 'wizard', 'gobgiant', 'prince', 'miner', 'pekka', 'tornado', 'gigadaron']},
  {id:'rage',   name:'Rage comics',     bonus:0.15, cards:['yuno', 'forever', 'troll']},
  {id:'zoo',    name:'Zoo du mème',     bonus:0.20, cards:['monkey', 'gorilla', 'orangutan', 'beluga', 'screamcat', 'llama', 'kermit']},
  {id:'info',   name:'Informatique',    bonus:0.10, cards:['ctrlaltdel', 'pepe', 'keyboard', 'yelling', 'mememan', 'pingfrog']},
  {id:'cursed', name:'Visages maudits', bonus:0.15, cards:['clay', 'grin', 'goblin', 'woody', 'shrek', 'dummy']},
  {id:'react',  name:'Têtes de réaction', bonus:0.15, cards:['shocked', 'stunned', 'donkey', 'plank', 'nice', 'shorse']},
];
/* Pack Personnalités : 170 cartes de célébrités du monde entier (photos libres de Wikimedia Commons, crédits dans
 * app/memes/CREDITS-personnalites.txt). Raretés : c commune, r rare, e épique, l légendaire, C champion.
 * Phrases : clins d'œil sympas, jamais de pique politique ni de fausse citation. */
{
  const R = {c: 'common', r: 'rare', e: 'epic', l: 'legendary', C: 'champion'};
  const P = {
    leaders: [
      ['p_emmanuelmacron', 'Emmanuel Macron', 'l', 'En même temps, il collectionne les cartes.'],
      ['p_barackobama', 'Barack Obama', 'l', 'Yes we can… finir la collection.'],
      ['p_charlesdegaulle', 'Charles de Gaulle', 'C', 'Il a compris ta dopamine.'],
      ['p_abrahamlincoln', 'Abraham Lincoln', 'l', 'Le chapeau le plus haut de la Maison-Blanche.'],
      ['p_johnfkennedy', 'John F. Kennedy', 'e', '« Ich bin ein Dopaminer. »'],
      ['p_winstonchurchill', 'Winston Churchill', 'l', 'Never give up. Surtout pas avant le prochain coffre.'],
      ['p_georgewashington', 'George Washington', 'e', 'Il est sur le billet de 1 dollar. Toi, sur le classement.'],
      ['p_franklindrooseve', 'Franklin D. Roosevelt', 'r', 'Quatre mandats. Comme quatre parties d\'affilée.'],
      ['p_nelsonmandela', 'Nelson Mandela', 'l', 'Un sourire qui vaut tous les jackpots.'],
      ['p_jacqueschirac', 'Jacques Chirac', 'e', 'Il aimait les pommes. Et le Salon de l\'agriculture.'],
      ['p_francoismitterra', 'François Mitterrand', 'r', 'La force tranquille, même au casino.'],
      ['p_nicolassarkozy', 'Nicolas Sarkozy', 'r', 'Il tape vite. Très vite.'],
      ['p_francoishollande', 'François Hollande', 'r', 'Président normal, carte normale. Enfin, rare.'],
      ['p_donaldtrump', 'Donald Trump', 'e', 'Il aurait dit que c\'était la meilleure carte. Énorme.'],
      ['p_joebiden', 'Joe Biden', 'r', 'Il a des lunettes d\'aviateur. Respect.'],
      ['p_angelamerkel', 'Angela Merkel', 'e', 'Les mains en losange, signe de concentration maximale.'],
      ['p_elizabethii', 'Elizabeth II', 'l', '70 ans de règne. Ta série quotidienne a du boulot.'],
      ['p_charlesiii', 'Charles III', 'r', 'Il a attendu longtemps. Comme toi pour ton coffre légendaire.'],
      ['p_mahatmagandhi', 'Gandhi', 'e', 'Le calme absolu. Même devant un ticket perdant.'],
      ['p_martinlutherking', 'Martin Luther King', 'l', 'Il a fait un rêve. Un grand.'],
      ['p_theodoreroosevel', 'Theodore Roosevelt', 'r', 'L\'ours en peluche « Teddy », c\'est lui.'],
      ['p_ronaldreagan', 'Ronald Reagan', 'c', 'Acteur, puis président. Le rêve de tout figurant.'],
      ['p_justintrudeau', 'Justin Trudeau', 'c', 'Le Canada en mode chaussettes rigolotes.'],
      ['p_volodymyrzelensk', 'Volodymyr Zelensky', 'e', 'Président de l\'Ukraine. Respect.'],
      ['p_jacindaardern', 'Jacinda Ardern', 'c', 'Kia ora depuis la Nouvelle-Zélande.'],
      ['p_georgespompidou', 'Georges Pompidou', 'c', 'Il a son musée. Toi, ta collection.'],
      ['p_valerygiscarddes', 'Valéry Giscard d\'Estaing', 'c', 'Il a dit « Au revoir ». Toi, jamais.'],
      ['p_louisxiv', 'Louis XIV', 'e', 'L\'État, c\'est moi. La dopamine aussi.'],
      ['p_14thdalailama', 'Le Dalaï-lama', 'r', 'Zéro notification. Plénitude totale.'],
      ['p_billclinton', 'Bill Clinton', 'c', 'Il joue du saxophone. Pas toi.'],
      ['p_georgewbush', 'George W. Bush', 'c', 'Il peint des tableaux maintenant.'],
      ['p_jimmycarter', 'Jimmy Carter', 'c', 'Producteur de cacahuètes devenu président.'],
      ['p_dwightdeisenhowe', 'Dwight D. Eisenhower', 'c', 'Le surnom « Ike » tient en 3 lettres.'],
      ['p_luladasilva', 'Lula', 'c', 'Le Brésil en mode samba.'],
      ['p_kamalaharris', 'Kamala Harris', 'c', 'Première vice-présidente des États-Unis.'],
      ['p_juliuscaesar', 'Jules César', 'e', 'Veni, vidi, scrolli.'],
      ['p_cleopatra', 'Cléopâtre', 'e', 'Reine d\'Égypte, reine du mystère.'],
      ['p_queenvictoria', 'La Reine Victoria', 'r', 'Elle n\'était pas amusée. Toi, si.'],
    ],
    influ: [
      ['p_mrbeast', 'MrBeast', 'C', 'Il t\'offre 1 000 000 de dopamine si tu tapes 100 jours.'],
      ['p_ishowspeed', 'IShowSpeed', 'l', 'SIUUUUU. Il aboie, il saute, il est partout.'],
      ['p_khabylame', 'Khaby Lame', 'l', 'Il n\'a rien dit. Il a tout expliqué.'],
      ['p_pewdiepie', 'PewDiePie', 'e', 'Le roi historique de YouTube. Brofist.'],
      ['p_kaicenat', 'Kai Cenat', 'e', 'Un mois de live non-stop. Ta série tremble.'],
      ['p_loganpaul', 'Logan Paul', 'r', 'Catcheur, boxeur, vendeur de boissons.'],
      ['p_ksi', 'KSI', 'r', 'Il crie plus fort que le Géant qui crie.'],
      ['p_charlidamelio', 'Charli D\'Amelio', 'r', 'Une danse, 150 millions d\'abonnés.'],
      ['p_addisonrae', 'Addison Rae', 'c', 'De TikTok aux tapis rouges.'],
      ['p_markiplier', 'Markiplier', 'r', 'Hello everybody, my name is Markiplier.'],
      ['p_ninja', 'Ninja', 'r', 'Les cheveux bleus les plus rapides de Fortnite.'],
      ['p_xqc', 'xQc', 'c', 'Il parle plus vite que tu ne lis.'],
      ['p_ibaillanos', 'Ibai Llanos', 'e', 'Le roi du stream espagnol.'],
      ['p_thegrefg', 'TheGrefg', 'c', 'Un skin Fortnite à son nom.'],
      ['p_bellapoarch', 'Bella Poarch', 'c', 'Le hochement de tête le plus vu du monde.'],
      ['p_zachking', 'Zach King', 'r', 'Il fait disparaître des trucs en 6 secondes.'],
      ['p_caseyneistat', 'Casey Neistat', 'c', 'Vlog quotidien, skate électrique, café.'],
      ['p_jakepaul', 'Jake Paul', 'r', 'Il a boxé Mike Tyson. Oui, vraiment.'],
      ['p_kyliejenner', 'Kylie Jenner', 'r', 'Un selfie, des millions de likes.'],
      ['p_kimkardashian', 'Kim Kardashian', 'r', 'Elle a cassé Internet. Il fonctionne encore.'],
      ['p_jacksepticeye', 'Jacksepticeye', 'c', 'TOP OF THE MORNING TO YA LADDIES.'],
      ['p_markrober', 'Mark Rober', 'e', 'Ancien ingénieur de la NASA, roi des pièges à voleurs de colis.'],
      ['p_valkyrae', 'Valkyrae', 'c', 'Reine du stream gaming.'],
      ['p_lillysingh', 'Lilly Singh', 'c', 'Superwoman d\'Internet.'],
      ['p_lizakoshy', 'Liza Koshy', 'c', 'L\'énergie à 300 %.'],
      ['p_daviddobrik', 'David Dobrik', 'c', 'Des vlogs de 4 minutes 20 pile.'],
      ['p_emmachamberlain', 'Emma Chamberlain', 'c', 'Café glacé et montage chaotique.'],
      ['p_squeezie', 'Squeezie', 'l', 'Le patron du YouTube français. GP Explorer en prime.'],
      ['p_nasdas', 'Nasdas', 'e', 'Il distribue des billets à Perpignan. Il distribue des cartes ici.'],
      ['p_inoxtag', 'Inoxtag', 'l', 'Il a gravi l\'Everest. Toi, l\'arbre des améliorations.'],
      ['p_amixem', 'Amixem', 'r', 'Des concepts plus fous les uns que les autres.'],
      ['p_normanthavaud', 'Norman', 'r', 'Il fait des vidéos depuis l\'époque des 240p.'],
      ['p_misterv', 'Mister V', 'r', 'Pizza Delamama, c\'est lui.'],
      ['p_tiboinshape', 'Tibo InShape', 'e', 'Musculation : il soulève plus que ta banque.'],
      ['p_lenasituations', 'Léna Situations', 'r', 'Le vlog d\'août, chaque année.'],
      ['p_kameto', 'Kameto', 'e', 'Le patron de la Karmine Corp. BLUE WALL.'],
      ['p_zerator', 'ZeratoR', 'e', 'Le ZEvent, des millions récoltés pour les assos.'],
      ['p_gotaga', 'Gotaga', 'r', 'La légende du FPS français.'],
      ['p_joueurdugrenier', 'Joueur du Grenier', 'e', 'Il teste les pires jeux. Il n\'a pas testé celui-là. Ouf.'],
      ['p_mcflyetcarlito', 'McFly et Carlito', 'r', 'Ils ont fait un clip avec le Président.'],
      ['p_hugotravers', 'HugoDécrypte', 'r', 'Il t\'explique l\'actu en 3 minutes.'],
      ['p_seblafrite', 'Seb la Frite', 'c', 'La frite la plus connue de France.'],
      ['p_antoinedaniel', 'Antoine Daniel', 'c', 'What the Cut, le retour.'],
      ['p_natoo', 'Natoo', 'c', 'Reine des sketchs depuis toujours.'],
    ],
    sport: [
      ['p_kylianmbappe', 'Kylian Mbappé', 'l', 'Plus rapide que ton taux de clic.'],
      ['p_zinedinezidane', 'Zinedine Zidane', 'C', 'La roulette marseillaise, version dopamine.'],
      ['p_lionelmessi', 'Lionel Messi', 'l', '8 Ballons d\'or. Ta vitrine est vide.'],
      ['p_cristianoronaldo', 'Cristiano Ronaldo', 'l', 'SIUUUU. Le cri qui fait trembler l\'écran.'],
      ['p_lebronjames', 'LeBron James', 'l', 'Le King. Littéralement.'],
      ['p_teddyriner', 'Teddy Riner', 'e', 'Ippon. Ta dopamine est au tapis.'],
      ['p_michaeljordan', 'Michael Jordan', 'C', 'Six bagues. Zéro regret.'],
      ['p_serenawilliams', 'Serena Williams', 'l', '23 titres du Grand Chelem.'],
      ['p_rogerfederer', 'Roger Federer', 'e', 'L\'élégance suisse en revers à une main.'],
      ['p_rafaelnadal', 'Rafael Nadal', 'e', '14 Roland-Garros. Le roi de la terre battue.'],
      ['p_novakdjokovic', 'Novak Djokovic', 'e', 'La souplesse d\'un chat, la mentalité d\'un boss.'],
      ['p_muhammadali', 'Muhammad Ali', 'l', 'Vole comme le papillon, pique comme l\'abeille.'],
      ['p_tonyparker', 'Tony Parker', 'r', 'Quatre titres NBA, made in France.'],
      ['p_victorwembanyama', 'Victor Wembanyama', 'e', '2,24 m de talent. Il voit ton écran d\'en haut.'],
      ['p_antoinegriezmann', 'Antoine Griezmann', 'r', 'Champion du monde 2018. Il fait le Fortnite dance.'],
      ['p_karimbenzema', 'Karim Benzema', 'r', 'Ballon d\'or 2022.'],
      ['p_thierryhenry', 'Thierry Henry', 'e', 'Va va voom.'],
      ['p_paulpogba', 'Paul Pogba', 'c', 'Champion du monde, coupes de cheveux légendaires.'],
      ['p_neymar', 'Neymar', 'r', 'Le joga bonito en personne.'],
      ['p_erlinghaaland', 'Erling Haaland', 'r', 'Un robot à buts. Et il médite.'],
      ['p_kobebryant', 'Kobe Bryant', 'l', 'Mamba mentality. Pour toujours.'],
      ['p_stephencurry', 'Stephen Curry', 'e', 'Il marque de la ligne médiane. Toi, tu tapes.'],
      ['p_tigerwoods', 'Tiger Woods', 'r', 'Le golf version légende.'],
      ['p_michaelphelps', 'Michael Phelps', 'e', '23 médailles d\'or olympiques.'],
      ['p_leonmarchand', 'Léon Marchand', 'e', 'Quatre fois en or à Paris 2024.'],
      ['p_antoinedupont', 'Antoine Dupont', 'e', 'Le meilleur rugbyman du monde. Il est français.'],
      ['p_simonebiles', 'Simone Biles', 'l', 'Elle défie la gravité. Toi, la flemme.'],
      ['p_maxverstappen', 'Max Verstappen', 'r', 'Toujours à fond. Comme ta presse hydraulique.'],
      ['p_ayrtonsenna', 'Ayrton Senna', 'l', 'La légende de la F1.'],
      ['p_pele', 'Pelé', 'l', 'O Rei. Trois Coupes du monde.'],
      ['p_diegomaradona', 'Diego Maradona', 'e', 'Un génie du ballon rond.'],
      ['p_ronaldinho', 'Ronaldinho', 'e', 'Le sourire le plus joyeux du football.'],
      ['p_franckribery', 'Franck Ribéry', 'c', 'Des dribbles et des blagues.'],
      ['p_mariejoseperec', 'Marie-José Pérec', 'r', 'La gazelle, triple championne olympique.'],
      ['p_conormcgregor', 'Conor McGregor', 'c', 'Le roi du trash-talk irlandais.'],
      ['p_francisngannou', 'Francis Ngannou', 'r', 'Le coup de poing le plus puissant du monde.'],
      ['p_miketyson', 'Mike Tyson', 'r', 'Il a des pigeons. Et des poings.'],
      ['p_shaquilleoneal', 'Shaquille O\'Neal', 'r', 'Un géant au sourire géant.'],
      ['p_pierregasly', 'Pierre Gasly', 'c', 'Le Normand qui a gagné à Monza.'],
      ['p_renaudlavillenie', 'Renaud Lavillenie', 'c', 'Saut à la perche : il vole au-dessus des 6 mètres.'],
    ],
    legends: [
      ['p_alberteinstein', 'Albert Einstein', 'C', 'E = mc² + dopamine.'],
      ['p_napoleon', 'Napoléon', 'l', 'Impossible n\'est pas français.'],
      ['p_elonmusk', 'Elon Musk', 'l', 'Il veut aller sur Mars. Ta dopamine aussi.'],
      ['p_ayanakamura', 'Aya Nakamura', 'e', 'Djadja, la reine de la pop française.'],
      ['p_michaeljackson', 'Michael Jackson', 'C', 'Le Roi de la pop. Moonwalk sur ton écran.'],
      ['p_billgates', 'Bill Gates', 'r', 'Il a mis un ordinateur dans chaque maison.'],
      ['p_stevejobs', 'Steve Jobs', 'l', '« One more thing… »'],
      ['p_markzuckerberg', 'Mark Zuckerberg', 'e', 'Il connaît bien ta dopamine. Trop bien.'],
      ['p_jeffbezos', 'Jeff Bezos', 'r', 'Livraison de ta carte en 24 h.'],
      ['p_leonardodavinci', 'Léonard de Vinci', 'l', 'Il a peint la Joconde. Elle te regarde aussi.'],
      ['p_mariecurie', 'Marie Curie', 'l', 'Deux prix Nobel. Rayonnante.'],
      ['p_isaacnewton', 'Isaac Newton', 'e', 'La pomme est tombée. La dopamine aussi.'],
      ['p_nikolatesla', 'Nikola Tesla', 'e', 'Il a électrifié le monde.'],
      ['p_charliechaplin', 'Charlie Chaplin', 'e', 'Un chapeau, une canne, zéro parole.'],
      ['p_marilynmonroe', 'Marilyn Monroe', 'e', 'Icône éternelle d\'Hollywood.'],
      ['p_elvispresley', 'Elvis Presley', 'l', 'The King of Rock\'n\'Roll.'],
      ['p_freddiemercury', 'Freddie Mercury', 'l', 'We are the champions, my friend.'],
      ['p_bobmarley', 'Bob Marley', 'e', 'Don\'t worry, be happy… non, ça c\'est pas lui.'],
      ['p_johnnyhallyday', 'Johnny Hallyday', 'l', 'Allumer le feu… de ta dopamine.'],
      ['p_edithpiaf', 'Édith Piaf', 'e', 'Non, rien de rien, elle ne regrette rien.'],
      ['p_celinedion', 'Céline Dion', 'e', 'My heart will go on. Ta série aussi.'],
      ['p_beyonce', 'Beyoncé', 'l', 'Queen B. Le reste est en option.'],
      ['p_rihanna', 'Rihanna', 'e', 'Umbrella-ella-ella, eh, eh.'],
      ['p_taylorswift', 'Taylor Swift', 'l', 'Sa tournée a fait trembler les sismographes.'],
      ['p_eminem', 'Eminem', 'e', 'Le débit le plus rapide du rap.'],
      ['p_snoopdogg', 'Snoop Dogg', 'r', 'Fo shizzle, ma dopamine.'],
      ['p_booba', 'Booba', 'r', 'Le Duc de Boulogne.'],
      ['p_orelsan', 'Orelsan', 'r', 'La quête de la carte ultime.'],
      ['p_gims', 'Gims', 'r', 'Les lunettes de soleil, même la nuit.'],
      ['p_stromae', 'Stromae', 'e', 'Alors on danse.'],
      ['p_omarsy', 'Omar Sy', 'e', 'Lupin, c\'est lui. Il a volé ta carte.'],
      ['p_jeandujardin', 'Jean Dujardin', 'r', 'OSS 117 et un Oscar.'],
      ['p_louisdefunes', 'Louis de Funès', 'l', 'Non mais, ça va pas la tête ?'],
      ['p_keanureeves', 'Keanu Reeves', 'l', 'Néo en personne. Il refuse les cookies.'],
      ['p_dwaynejohnson', 'Dwayne « The Rock » Johnson', 'e', 'Le sourcil le plus célèbre du monde.'],
      ['p_tomcruise', 'Tom Cruise', 'r', 'Il fait ses cascades lui-même.'],
      ['p_leonardodicaprio', 'Leonardo DiCaprio', 'e', 'Il a fini par avoir son Oscar.'],
      ['p_jackiechan', 'Jackie Chan', 'r', 'Kung-fu et fous rires.'],
      ['p_pablopicasso', 'Pablo Picasso', 'r', 'Il voit ta collection de face et de profil.'],
      ['p_vincentvangogh', 'Vincent van Gogh', 'r', 'La nuit étoilée, toutes les nuits.'],
      ['p_victorhugo', 'Victor Hugo', 'r', 'Les Misérables. Toi, les miséreux du casino.'],
      ['p_moliere', 'Molière', 'c', 'La langue de Molière, c\'est la sienne.'],
      ['p_williamshakespea', 'William Shakespeare', 'c', 'Taper ou ne pas taper, telle est la question.'],
      ['p_wolfgangamadeusm', 'Mozart', 'c', 'La Petite musique de nuit, en boucle.'],
      ['p_ludwigvanbeethov', 'Beethoven', 'c', 'Ta-ta-ta-taaa.'],
      ['p_thomaspesquet', 'Thomas Pesquet', 'r', 'Il a vu la Terre d\'en haut. Toi, ton écran.'],
      ['p_neilarmstrong', 'Neil Armstrong', 'e', 'Un petit pas pour l\'homme, un grand tap pour la dopamine.'],
      ['p_jul', 'Jul', 'e', 'Un album par mois. Une carte pour la vie. 👌'],
    ],
  };
  const SET = {leaders: ['Présidents et dirigeants', 0.25], influ: ['Influenceurs', 0.25], sport: ['Sportifs', 0.25], legends: ['Artistes et légendes', 0.25]};
  for (const [k, list] of Object.entries(P)) {
    for (const [id, name, r, line] of list) DT.CARDS.push({id, name, rarity: R[r], line, perso: true});
    DT.SETS.push({id: 'p_' + k, name: SET[k][0], bonus: SET[k][1], cards: list.map(x => x[0])});
  }
}
DT.CHESTS = {
  wood:   {name:'Coffre en bois',    n:3, color:'#B5773B', rgb:'181,119,59',  odds:{common:.72, rare:.22, epic:.052, legendary:.007, champion:.001}},
  gold:   {name:'Coffre doré',       n:5, color:'#FFC247', rgb:'255,194,71',  odds:{common:.52, rare:.32, epic:.12, legendary:.033, champion:.007}},
  magic:  {name:'Coffre magique',    n:6, color:'#C77DFF', rgb:'199,125,255', odds:{common:.34, rare:.34, epic:.24, legendary:.066, champion:.014}, sure:'epic'},
  legend: {name:'Coffre légendaire', n:4, color:'#5CFFE1', rgb:'92,255,225',  odds:{common:.5, rare:.3, epic:.15, legendary:.04, champion:.01}, sure:'legendary'},
};

/* Chapitres : se débloquent sur la production totale depuis toujours. */
DT.ERAS = [
  {at:0,    num:'I',   name:'Le Garage',      line:'Une idée, un ordi portable et zéro scrupule.',                     color:'#FF4F79', rgb:'255,79,121'},
  {at:1e6,  num:'II',  name:'La Licorne',     line:'Valorisée à 1 milliard. Aucun bénéfice. Tout le monde applaudit.',  color:'#C77DFF', rgb:'199,125,255'},
  {at:1e9,  num:'III', name:'Le Monopole',    line:'Trop gros pour tomber. Trop gros pour être régulé.',               color:'#FFC247', rgb:'255,194,71'},
  {at:1e12, num:'IV',  name:'La Singularité', line:"L'algorithme a pris les commandes. Il t'a gardé par politesse.",   color:'#4FD8FF', rgb:'79,216,255'},
  {at:1e15, num:'V',   name:'La Matrice',     line:'Pilule bleue pour tout le monde. Tu gardes la rouge.',             color:'#5CFF8A', rgb:'92,255,138'},
  {at:1e18, num:'VI',  name:'La Ruche',       line:"Huit milliards de cerveaux en réseau. Plus personne ne s'ennuie. Plus personne ne rêve.", color:'#FF7EB6', rgb:'255,126,182'},
  {at:1e21, num:'VII', name:'La Galaxie',     line:"L'attention humaine ne suffisait plus. Place aux autres espèces.",  color:'#FFB347', rgb:'255,179,71'},
];

DT.RANKS = [
  [0, 'Stagiaire growth'], [1e4, 'Growth hacker'], [1e6, 'Head of Engagement'], [1e8, 'CEO en sweat à capuche'],
  [1e10, 'Licorne sur pattes'], [1e12, 'Techno-baron'], [1e14, "Maître de l'attention"], [1e16, 'Architecte de la Matrice'],
  [1e18, 'Cerveau de la Ruche'], [1e21, 'Empereur de la Galaxie'],
];
DT.rankOf = life => { let r = DT.RANKS[0][1]; for (const [at, n] of DT.RANKS) if (life >= at) r = n; return r; };

DT.HEADLINES = [
  [ // I
    ['STARTUP', 'Une appli sortie d\'un garage promet de « reconnecter les gens ». Ses fondateurs n\'ont pas vu le soleil depuis mars.'],
    ['ÉTUDE', 'Des chercheurs découvrent que le pouce humain peut scroller 40 mètres par jour.'],
    ['SOCIÉTÉ', 'Une famille dîne sans téléphone. Les voisins appellent les secours.'],
    ['TECH', 'Nouvelle fonctionnalité : une notification qui te prévient que tu as des notifications.'],
  ],
  [ // II
    ['MARCHÉ', 'Levée de fonds record : les investisseurs financent une appli qui ne sait pas ce qu\'elle vend.'],
    ['CULTURE', 'Un roman de 300 pages adapté en 41 vidéos de 15 secondes.'],
    ['RH', 'Poste ouvert : « Architecte de la frustration », télétravail possible, baby-foot obligatoire.'],
    ['SPORT', 'Le record du monde de swipe tombe : 11 swipes par seconde.'],
  ],
  [ // III
    ['POLITIQUE', 'Audition au Sénat. Réponse du PDG : « Sénateur, nous vendons de la publicité. »'],
    ['BOURSE', 'L\'action gagne 12 % après l\'ajout d\'un bouton qui ne fait rien mais clignote.'],
    ['ÉDUCATION', 'Les ados ne savent plus lire l\'heure, sauf quand elle précède « de visionnage ».'],
    ['MÉTÉO', 'Grand soleil dehors. Personne n\'a vérifié.'],
  ],
  [ // IV
    ['IA', 'L\'algorithme publie son propre communiqué : « Tout va bien. Continuez à scroller. »'],
    ['SANTÉ', 'Les neurologues parlent de « récepteurs D2 en grève ». Le service marketing parle de « rétention ».'],
    ['BIEN-ÊTRE', 'Une appli de méditation envoie 14 rappels par jour pour aider à se détendre.'],
    ['SCIENCE', 'Premier humain à rêver en format vertical 9:16.'],
  ],
  [ // V
    ['SYSTÈME', 'Il n\'y a pas de cuillère. Il n\'y a que des notifications.'],
    ['RÉALITÉ', 'Le monde réel passe en version bêta fermée. Liste d\'attente : 8 milliards.'],
    ['AGENT', 'Des rumeurs parlent d\'un certain Néo qui refuserait les cookies. Enquête en cours.'],
    ['ORACLE', '« Tu n\'es pas l\'élu. Tu es l\'utilisateur actif mensuel. »'],
  ],
  [ // VI
    ['RUCHE', 'Huit milliards de personnes ont liké la même vidéo à la même seconde. Personne ne sait laquelle.'],
    ['ESPACE', 'Une constellation de satellites cache les étoiles. Une appli propose des étoiles en réalité augmentée.'],
    ['CLONES', 'Ton jumeau numérique a demandé une augmentation. Il l\'a obtenue.'],
    ['DERNIÈRE MINUTE', 'Un homme retrouvé dans une forêt sans aucun réseau. Les scientifiques veulent comprendre comment il a survécu.'],
  ],
  [ // VII
    ['ESPACE', 'Premier like reçu depuis Proxima du Centaure. Il a mis 4 ans à arriver. Ça valait le coup.'],
    ['MARS', 'La colonie martienne réclame la 5G avant l\'oxygène.'],
    ['ALIENS', 'Contact établi avec une civilisation extraterrestre. Première question : « Vous avez TikTok ? »'],
    ['COSMOS', 'Une étoile s\'est éteinte. Personne ne l\'a remarqué : elle n\'avait pas assez d\'abonnés.'],
  ],
];

// Pack France : des actus bien de chez nous, mélangées aux autres dans chaque chapitre.
[
  [['FRANCE', 'Nasdas distribue encore des billets à Perpignan. La file d\'attente fait le tour du quartier.'],
   ['MÉTRO', 'Ligne 13 aux heures de pointe : 4 000 personnes scrollent dans le même wagon. Record de France.'],
   ['BOULANGERIE', 'Plus de croissants à 7 h 58 : la moitié du pays envoie « t\'es où ? » à son boulanger.']],
  [['RAP', 'Jul sort un nouvel album. Puis un autre, pendant que tu lisais cette phrase.'],
   ['YOUTUBE', 'Squeezie lance une nouvelle course de voitures. Les voitures ont plus d\'abonnés que toi.'],
   ['DÉBAT', 'Pain au chocolat ou chocolatine ? Le pays se coupe en deux, comme chaque année.']],
  [['SPORT', 'Les Bleus en finale : 68 millions de sélectionneurs donnent leur avis en même temps.'],
   ['AVENTURE', 'Inoxtag a gravi l\'Everest. Toi, tu n\'as pas monté les escaliers depuis mardi.'],
   ['GRÈVE', 'Grève surprise des notifications : elles réclament le droit de ne pas vibrer le dimanche.']],
  [['CARITATIF', 'Le ZEvent bat son record de dons. Ton algorithme, lui, bat son record de temps d\'écran.'],
   ['IMPÔTS', 'impots.gouv lance une appli conçue pour être addictive. Personne ne l\'ouvre.'],
   ['APÉRO', 'Étude : 92 % des « petits apéros » finissent à 2 h du matin avec « bon, on va pas tarder ».']],
  [['MATRICE', 'Dans la Matrice, la baguette est toujours chaude. C\'est comme ça qu\'on sait que c\'est faux.'],
   ['TÉLÉRÉALITÉ', 'Une téléréalité tourne à Dubaï dans une simulation. Personne ne voit la différence.'],
   ['ADMINISTRATION', 'Même dans la Matrice, il faut un justificatif de domicile de moins de 3 mois.']],
  [['PÉTANQUE', 'Finale mondiale de pétanque entre 8 milliards de clones. Le cochonnet a pris un agent.'],
   ['SANTÉ', 'Prochain rendez-vous disponible chez le dentiste : 2041.'],
   ['PARIS', 'La tour Eiffel scintille désormais au rythme de tes notifications.']],
  [['ESPACE', 'Vu de l\'espace : la Muraille de Chine, la tour Eiffel et la file d\'attente devant chez Nasdas.'],
   ['MARS', 'Première baguette cuite sur Mars. Elle est déjà rassise.'],
   ['COSMOS', 'Les extraterrestres demandent la recette de la raclette. Les négociations durent depuis trois jours.']],
].forEach((l, i) => { if (DT.HEADLINES[i]) DT.HEADLINES[i].push(...l); });

/* Succès : chacun ajoute +1 % de production. */
const gAll = G => G.S.gens.every(n => n > 0);
DT.ACH = [
  {id:'first',  name:'Hello World',               desc:'Faire ton premier tap.',                               t:G => G.S.clicks >= 1},
  {id:'crush1', name:'Première victime',          desc:'Écraser ton premier objet sous la presse.',             t:G => (G.S.crushed || 0) >= 1},
  {id:'crush100', name:'Oddly satisfying',        desc:'Écraser 100 objets.',                                   t:G => (G.S.crushed || 0) >= 100},
  {id:'crush1k', name:'Chaîne de la presse hydraulique', desc:'Écraser 1 000 objets. Un classique d\'Internet.', t:G => (G.S.crushed || 0) >= 1000},
  {id:'popit',  name:'Pop-it addict',             desc:'Terminer 10 pop-it.',                                   t:G => (G.S.popits || 0) >= 10},
  {id:'midas',  name:'Le toucher de Midas',       desc:'Écraser un objet doré.',                                t:G => (G.S.goldObj || 0) >= 1},
  {id:'irony',  name:'Ironie',                    desc:'Écraser 50 smartphones pour produire… de la dopamine d\'écran.', t:G => (G.S.phones || 0) >= 50},
  {id:'like',   name:'Premier like',              desc:"Acheter un Bouton J'aime.",                            t:G => G.S.gens[1] >= 1},
  {id:'pav',    name:'Le chien de Pavlov',        desc:'Taper 1 000 fois.',                                     t:G => G.S.totClicks >= 1000},
  {id:'tendon', name:'Tendinite',                 desc:'Taper 10 000 fois.',                                    t:G => G.S.totClicks >= 10000},
  {id:'42',     name:'La grande réponse',         desc:'Posséder exactement 42 notifications push.',           t:G => G.S.gens[0] === 42},
  {id:'ep',     name:'Juste un dernier épisode',  desc:'Posséder 10 Autoplay.',                                 t:G => G.S.gens[3] >= 10},
  {id:'owl',    name:'Le hibou te regarde',       desc:'Posséder 25 Séries quotidiennes.',                      t:G => G.S.gens[4] >= 25},
  {id:'skin',   name:'Skinner serait fier',       desc:'Posséder 25 Loot box.',                                 t:G => G.S.gens[5] >= 25},
  {id:'rabbit', name:'Suivre le lapin blanc',     desc:'Posséder 10 Algorithmes de reco.',                      t:G => G.S.gens[6] >= 10},
  {id:'her',    name:'Her',                       desc:'Posséder 10 Influenceurs IA.',                          t:G => G.S.gens[7] >= 10},
  {id:'rp1',    name:'Ready Player One',          desc:'Acheter un premier casque VR.',                         t:G => G.S.gens[8] >= 1},
  {id:'ghost',  name:'Ghost in the Shell',        desc:'Acheter un premier implant neuronal.',                  t:G => G.S.gens[9] >= 1},
  {id:'sat',    name:'Plus de zone blanche',      desc:'Acheter une première constellation de satellites.',     t:G => G.S.gens[10] >= 1},
  {id:'twin',   name:'Black Mirror',              desc:'Acheter un premier jumeau numérique.',                  t:G => G.S.gens[11] >= 1},
  {id:'simu',   name:'Bienvenue dans la simulation', desc:'Acheter une première simulation totale.',             t:G => G.S.gens[13] >= 1},
  {id:'cosm',   name:'Influenceur intergalactique', desc:'Acheter un premier réseau galactique.',               t:G => G.S.gens[14] >= 1},
  {id:'borg',   name:'La résistance est futile',  desc:'Acheter une première conscience collective.',           t:G => G.S.gens[12] >= 1},
  {id:'all',    name:'Attrapez-les tous',         desc:'Posséder toutes les mécaniques en même temps.',         t:gAll},
  {id:'9000',   name:"It's over 9000 !",          desc:'Dépasser 9 000 nmol/s.',                                t:G => G.effDps() > 9000},
  {id:'stonks', name:'Stonks',                    desc:'Avoir 1 M nmol en banque.',                             t:G => G.S.bank >= 1e6},
  {id:'wolf',   name:'Le Loup de Wall Street',    desc:'Produire 1 Md nmol en une seule partie.',               t:G => G.S.run >= 1e9},
  {id:'rich',   name:'Plus riche qu\'un pays',    desc:'Avoir 1 Bn nmol en banque.',                            t:G => G.S.bank >= 1e12},
  {id:'speed',  name:'Speedrun any%',             desc:'Produire 1 M nmol en moins de 10 min de partie.',       t:G => G.S.run >= 1e6 && G.S.runTime < 600},
  {id:'combo',  name:'C-C-C-COMBO BREAKER',       desc:'Enchaîner un combo de 100 taps.',                       t:G => G.S.bestCombo >= 100},
  {id:'crit',   name:'Coup critique',             desc:'Réussir un tap critique.',                              t:G => G.S.crits >= 1},
  {id:'gold',   name:'Sonnerie dorée',            desc:'Attraper 10 notifications dorées.',                     t:G => G.S.goldClicks >= 10},
  {id:'cat',    name:'Réflexes de chat',          desc:'Attraper 50 notifications dorées.',                     t:G => G.S.goldClicks >= 50},
  {id:'grass',  name:'Touch grass',               desc:'Passer 10 minutes cumulées en mode avion.',             t:G => G.S.planeTime >= 600},
  {id:'floor',  name:'Plus rien ne me fait rien', desc:'Laisser tes récepteurs D2 tomber au plancher.',         t:G => G.S.d2 <= G.floorD2() + 0.01},
  {id:'still',  name:'Êtes-vous toujours là ?',   desc:'Répondre à la question fatidique.',                     t:G => G.flags.still},
  {id:'detox',  name:'Détox vue sur YouTube',     desc:'Faire une première cure de désintox.',                 t:G => G.S.resets >= 1},
  {id:'incep',  name:'Inception',                 desc:'Faire 3 cures de désintox.',                            t:G => G.S.resets >= 3},
  {id:'zen',    name:'Nirvana',                   desc:'Accumuler 50 points de Sérénité.',                      t:G => G.S.ser >= 50},
  {id:'sag1',   name:'Premier pas vers la sagesse', desc:'Acquérir une sagesse.',                               t:G => Object.keys(G.S.sag || {}).length >= 1},
  {id:'sagall', name:'Illumination',              desc:'Acquérir toutes les sagesses.',                         t:G => DT.SAGES.every(x => (G.S.sag || {})[x.id])},
  {id:'era2',   name:'Licorne',                   desc:'Atteindre le chapitre II.',                             t:G => G.S.era >= 1},
  {id:'era3',   name:'Trop gros pour tomber',     desc:'Atteindre le chapitre III.',                            t:G => G.S.era >= 2},
  {id:'era4',   name:'Singularité',               desc:'Atteindre le chapitre IV.',                             t:G => G.S.era >= 3},
  {id:'era5',   name:'Pilule rouge',              desc:'Atteindre le chapitre V.',                              t:G => G.S.era >= 4},
  {id:'era6',   name:'Esprit de ruche',           desc:'Atteindre le chapitre VI.',                             t:G => G.S.era >= 5},
  {id:'crisis', name:'Gestion de crise',          desc:'Trancher 10 événements.',                               t:G => G.S.events >= 10},
  {id:'cynic',  name:'Aucune limite',             desc:"Choisir 5 fois l'option la plus cynique.",              t:G => G.S.cynic >= 5},
  {id:'saint',  name:'Conscience professionnelle', desc:"Choisir 5 fois l'option la plus humaine.",             t:G => G.S.kind >= 5},
  {id:'night',  name:'Oiseau de nuit',            desc:'Jouer entre 2 h et 5 h du matin.',                      t:() => { const h = new Date().getHours(); return h >= 2 && h < 5; }},
  {id:'friend', name:'Pas seul au monde',         desc:'Voir au moins un pote dans le classement.',             t:G => G.friendCount() >= 1},
  {id:'top1',   name:'Numéro 1',                  desc:'Être premier du classement face à au moins un pote.',   t:G => G.friendCount() >= 1 && G.myRank() === 1},
  {id:'egg1',   name:"Chasseur d'œufs",          desc:'Trouver 3 easter eggs.',                                t:G => Object.keys(G.S.eggs || {}).length >= 3},
  {id:'eggall', name:"Rien ne m'échappe",       desc:'Trouver les 8 easter eggs.',                            t:G => Object.keys(G.S.eggs || {}).length >= 8, secret:true},
  {id:'chest1', name:'Loot !',                    desc:'Ouvrir ton premier coffre.',                             t:G => (G.S.chestsOpened || 0) >= 1},
  {id:'chest50', name:'Accro aux coffres',        desc:'Ouvrir 50 coffres.',                                     t:G => (G.S.chestsOpened || 0) >= 50},
  {id:'legend', name:'LÉGENDAIRE !',              desc:'Obtenir une carte légendaire.',                          t:G => G.hasRarity('legendary')},
  {id:'champ',  name:'Champion du monde',         desc:'Obtenir une carte Champion.',                            t:G => G.hasRarity('champion')},
  {id:'coll10', name:'Collectionneur',            desc:'Posséder 10 cartes différentes.',                        t:G => Object.keys(G.S.cards || {}).length >= 10},
  {id:'coll20', name:'Grand collectionneur',      desc:'Posséder 20 cartes différentes.',                        t:G => Object.keys(G.S.cards || {}).length >= 20},
  {id:'coll35', name:'Musée du mème',             desc:'Posséder 35 cartes différentes.',                        t:G => Object.keys(G.S.cards || {}).length >= 35},
  {id:'collall', name:'Deck complet',              desc:'Posséder toutes les cartes.',                           t:G => Object.keys(G.S.cards || {}).length >= DT.CARDS.length},
  {id:'bx1',    name:'Premier ordre',             desc:'Ouvrir une position en Bourse.',                         t:G => (G.S.bTrades || 0) >= 1},
  {id:'bxmoon', name:'To the moon',               desc:'Encaisser une position en Bourse à +100 % ou plus.',     t:G => (G.S.bMoon || 0) >= 1},
  {id:'bxliq',  name:'Margin call',               desc:'Te faire liquider en Bourse.',                           t:G => (G.S.bLiq || 0) >= 1},
  {id:'swap1',  name:'Troc',                      desc:'Échanger une carte avec un pote.',                       t:G => (G.S.swapsDone || 0) >= 1},
  {id:'stim1',  name:'Première stimulation',      desc:'Acheter une stimulation.',                               t:G => DT.Stim.count(G.S) >= 1},
  {id:'stim7',  name:'Cerveau en surchauffe',     desc:'Avoir 7 stimulations.',                                  t:G => DT.Stim.count(G.S) >= 7},
  {id:'stimall', name:'Surstimulé',               desc:'Avoir toutes les stimulations.',                         t:G => DT.Stim.count(G.S) >= DT.Stim.STIMS.length},
  {id:'dvd',    name:'Le coin parfait',           desc:'Voir le logo DVD toucher un coin pile.',                 t:G => (G.S.dvdCorners || 0) >= 1},
  {id:'grass2', name:'J\'ai touché de l\'herbe',  desc:'Acheter la dernière stimulation.',                       t:G => (G.S.grassDone || 0) >= 1},
  {id:'era7',   name:'Conquête galactique',       desc:'Atteindre le chapitre VII : La Galaxie.',                t:G => G.S.era >= 6},
  {id:'season1', name:'Sur le podium',            desc:'Finir une saison dans le top 3.',                        t:G => ((G.S.medals || {}).g || 0) + ((G.S.medals || {}).s || 0) + ((G.S.medals || {}).b || 0) >= 1},
  {id:'seasonchamp', name:'Champion de la saison',     desc:'Finir une saison à la première place.',                  t:G => ((G.S.medals || {}).g || 0) >= 1},
  {id:'daily1', name:'Défi relevé',               desc:'Réussir un défi du jour.',                               t:G => (G.S.dcDone || 0) >= 1},
  {id:'dchal7', name:'Habitué des défis',         desc:'Réussir 7 défis du jour.',                               t:G => (G.S.dcDone || 0) >= 7},
  {id:'wboss',  name:'Tueur de titans',           desc:'Abattre le boss mondial du week-end avec les autres joueurs.', t:G => (G.S.wbKills || 0) >= 1},
  {id:'clan1',  name:'Esprit d\'équipe',          desc:'Rejoindre un clan.',                                     t:G => !!(G.S.clan && G.S.clan.name)},
  {id:'hilo5',  name:'Devin',                     desc:'Enchaîner 5 bonnes réponses au Plus ou Moins.',          t:G => (G.S.hiloBest || 0) >= 5},
  {id:'friend1', name:'Pote officiel',            desc:'Ajouter un ami.',                                        t:G => G.friendCount() >= 1},
  {id:'friend10', name:'Influenceur',             desc:'Avoir 10 amis.',                                         t:G => G.friendCount() >= 10},
  {id:'hard1',  name:'Sans filet',                desc:'Partir en cure de désintox en Hardcore ou en Cauchemar.', t:G => (G.S.hardResets || 0) >= 1},
  {id:'nightmare', name:'Cauchemar éveillé',      desc:'Produire 1 Md nmol dans une seule partie en Cauchemar.',  t:G => G.S.dif === 3 && G.S.run >= 1e9},
  {id:'lvl10',  name:'Niveau 10',                 desc:'Atteindre le niveau 10.',                                t:G => (G.S.lvl || 1) >= 10},
  {id:'lvl30',  name:'Vétéran du scroll',         desc:'Atteindre le niveau 30.',                                t:G => (G.S.lvl || 1) >= 30},
  {id:'fever1', name:'Hype maximale',             desc:'Déclencher le mode Hype.',                              t:G => (G.S.fevers || 0) >= 1},
  {id:'fever25', name:'Accro à la hype',         desc:'Déclencher 25 fois la Hype.',                           t:G => (G.S.fevers || 0) >= 25},
  {id:'boss1',  name:'Boss vaincu',               desc:'Terrasser un boss sous la presse.',                     t:G => (G.S.bosses || 0) >= 1},
  {id:'boss10', name:'Chasseur de boss',          desc:'Terrasser 10 boss.',                                    t:G => (G.S.bosses || 0) >= 10},
  {id:'spin1',  name:'Faites vos jeux',           desc:'Tourner la roue de la dopamine.',                       t:G => (G.S.spinsDone || 0) >= 1},
  {id:'jackpot', name:'JACKPOT !',                desc:'Décrocher le jackpot à la roue.',                       t:G => (G.S.jackpots || 0) >= 1},
  {id:'quest10', name:'Quêteur',                  desc:'Terminer 10 quêtes.',                                   t:G => (G.S.questsDone || 0) >= 10},
  {id:'daily7', name:'Accro quotidien',           desc:'Se connecter 7 jours d\'affilée.',                      t:G => (G.S.dailyBest || 0) >= 7},
  {id:'slot1',  name:'Machine à sous',            desc:'Jouer à une machine à sous.',                              t:G => (G.S.slotSpins || 0) >= 1},
  {id:'slot777', name:'777',                      desc:'Toucher un jackpot aux machines à sous.',                 t:G => (G.S.slotJackpots || 0) >= 1},
  {id:'scr1',   name:'Gratte-gratte',             desc:'Gratter un ticket.',                                    t:G => (G.S.scratched || 0) >= 1},
  {id:'scr10',  name:'Main chanceuse',            desc:'Gagner avec 10 tickets.',                               t:G => (G.S.scratchWins || 0) >= 10},
  {id:'rain50', name:'Il pleut des nmol',         desc:'Attraper 50 gouttes en une seule pluie.',               t:G => (G.S.bestRain || 0) >= 50},
  {id:'duel1',  name:'En garde !',                desc:'Lancer un duel à un pote.',                             t:G => (G.S.duelsSent || 0) >= 1},
  {id:'duel5',  name:"Champion de l'arène",       desc:'Gagner 5 duels.',                                       t:G => (G.S.duelsWon || 0) >= 5},
  {id:'cas1',   name:'Bienvenue au casino',       desc:'Jouer une partie au Casino Dopamine.',                   t:G => (G.S.casinoPlays || 0) >= 1},
  {id:'cas100', name:'Flambeur',                  desc:'Jouer 100 parties au casino.',                           t:G => (G.S.casinoPlays || 0) >= 100},
  {id:'moon10', name:"Jusqu'à la lune",           desc:'Encaisser la Fusée à ×10 ou plus.',                      t:G => (G.S.crash10 || 0) >= 1},
  {id:'plk25',  name:'Plinko parfait',            desc:'Faire tomber une bille dans la case ×25.',               t:G => (G.S.plinko25 || 0) >= 1},
  {id:'mine5',  name:'Démineur',                  desc:'Encaisser aux Mines à ×5 ou plus.',                      t:G => (G.S.mines5 || 0) >= 1},
  {id:'coin5',  name:'Pile ou face ×5',           desc:'Gagner 5 pile ou face d\'affilée.',                      t:G => (G.S.coinBest || 0) >= 5},
  {id:'allin',  name:'Tapis gagnant',             desc:'Doubler au moins sa mise en jouant TAPIS.',              t:G => (G.S.allInWins || 0) >= 1},
  {id:'big10',  name:'Gros gagnant',              desc:'Faire 10 gros gains (×10 ou plus) au casino.',           t:G => (G.S.bigWins || 0) >= 10},
  {id:'rou36',  name:'Plein !',                   desc:'Gagner sur un numéro plein à la roulette (×36).',        t:G => (G.S.rouNum || 0) >= 1},
  {id:'bjnat',  name:'Blackjack !',               desc:'Avoir un blackjack d\'entrée.',                           t:G => (G.S.bjNat || 0) >= 1},
  {id:'royal',  name:'Quinte flush royale',       desc:'La main parfaite au vidéo poker (×250).',               t:G => (G.S.pokerRoyal || 0) >= 1, secret:true},
  {id:'tower',  name:'Au sommet de la tour',      desc:'Grimper les 10 étages de la Tour.',                      t:G => (G.S.towerTop || 0) >= 1},
  {id:'mega1',  name:'MÉGA-PRESSE !',             desc:'Déclencher une Méga-Presse.',                           t:G => (G.S.megas || 0) >= 1},
  {id:'mega25', name:'Presse hydraulique infinie', desc:'Déclencher 25 Méga-Presses.',                         t:G => (G.S.megas || 0) >= 25},
  {id:'pass10', name:'Abonné premium',            desc:'Atteindre le palier 10 du Pass Dopamine.',               t:G => ((G.S.pass || {}).pts || 0) >= 4000},
  {id:'pass30', name:'Pass complet',              desc:'Atteindre le palier 30 du Pass Dopamine.',               t:G => ((G.S.pass || {}).pts || 0) >= 12000},
  {id:'fuse1',  name:'Alchimiste',                desc:'Fusionner 5 cartes en trop en une carte plus rare.',     t:G => (G.S.fusions || 0) >= 1},
  {id:'set1',   name:'Série complète',            desc:'Compléter une collection de cartes.',                    t:G => Object.keys(G.S.setsDone || {}).length >= 1},
  {id:'setall', name:'Musée du mème',             desc:'Compléter toutes les collections de cartes.',            t:G => DT.SETS.every(x => (G.S.setsDone || {})[x.id])},
  {id:'emote',  name:'Langage universel',         desc:'Envoyer une emote à tes potes.',                        t:G => (G.S.emotes || 0) >= 1},
  {id:'konami', name:'↑↑↓↓←→←→BA',                desc:'Tu connais les classiques.',                           t:G => G.flags.konami, secret:true},
];

/* Niveaux de difficulté : choisis à la création du compte, puis à chaque cure de désintox (jamais en cours de
 * partie, sinon on passerait en Chill pour farmer). prod : production et taps ; ser : Sérénité gagnée ; xp : XP ;
 * slope : vitesse à laquelle les récepteurs D2 se désensibilisent. L'icône s'affiche au classement. */
DT.DIFS = [
  {id:0, name:'Chill',     ico:'🌴', prod:2,    ser:0.75, xp:1,    slope:0.85, desc:'Production ×2, récepteurs plus solides, mais Sérénité ×0,75. Pour se détendre.'},
  {id:1, name:'Normal',    ico:'',   prod:1,    ser:1,    xp:1,    slope:1,    desc:"L'expérience prévue."},
  {id:2, name:'Hardcore',  ico:'🔥', prod:0.5,  ser:1.5,  xp:1.25, slope:1.1,  desc:'Production ÷2, mais Sérénité ×1,5 et XP ×1,25.'},
  {id:3, name:'Cauchemar', ico:'💀', prod:0.25, ser:2.5,  xp:1.5,  slope:1.25, desc:'Production ÷4, récepteurs fragiles. Sérénité ×2,5 et XP ×1,5. Pour les vrais.'},
];

/* Sagesses : bonus permanents achetés avec la Sérénité. Ils restent après chaque cure de désintox,
 * et dépenser de la Sérénité ne réduit pas son bonus de production. Les effets sont branchés dans game.js,
 * extras.js et stage.js via leur identifiant. */
DT.SAGES = [
  {id:'s_tap',   icon:'heart', name:'Mémoire musculaire',  desc:'Tes taps rapportent 3× plus.',                                                  cost:1},
  {id:'s_start', icon:'bell',  name:"Capital d'amorçage",  desc:"Chaque nouvelle partie démarre avec 10 notifications push et 5 boutons J'aime.", cost:1},
  {id:'s_gold',  icon:'bell',  name:'Œil de lynx',         desc:'Les notifications dorées restent 2× plus longtemps et leurs jackpots sont 2× plus gros.', cost:2},
  {id:'s_sleep', icon:'plane', name:'Sommeil réparateur',  desc:"Hors ligne, tes mécaniques tournent à 100 % au lieu de 50 %, jusqu'à 24 h au lieu de 8 h.", cost:2},
  {id:'s_cheap', icon:'gift',  name:'Achats groupés',      desc:'Toutes les mécaniques coûtent 10 % de moins.',                                  cost:3},
  {id:'s_homeo', icon:'flame', name:'Homéostasie',         desc:'Les récepteurs D2 se désensibilisent 25 % moins vite.',                         cost:4},
  {id:'s_fever', icon:'flame', name:'Hype contrôlée',      desc:'La jauge de Hype se remplit 30 % plus vite et la Hype dure 5 s de plus.',   cost:4},
  {id:'s_robot', icon:'robot', name:'Doigt robotisé',      desc:'3 taps automatiques par seconde, sans combo et sans user tes récepteurs.',      cost:5},
  {id:'s_chest', icon:'gift',  name:'Souvenir de retraite', desc:'Chaque cure de désintox rapporte un coffre magique.',                           cost:6},
  {id:'s_pilot', icon:'plane', name:'Pilote automatique',  desc:'En mode avion, tes mécaniques tournent encore à 25 %.',                         cost:8},
  {id:'s_boss',  icon:'alert', name:'Presse renforcée',    desc:'Les boss restent 5 s de plus et lâchent 2× plus de dopamine.',                  cost:10},
  {id:'s_awake', icon:'lotus', name:'Éveil',               desc:'Chaque point de Sérénité ajoute 15 % de production au lieu de 10 %.',           cost:15},
];

/* Événements à choix. Chaque option : label, effet, et son camp (cynic / kind). */
DT.EVENTS = [
  {id:'leak', icon:'alert', title:'Lanceuse d\'alerte',
   text:'Une ex-employée menace de publier vos études internes sur l\'addiction des ados.',
   a:{label:'Acheter son silence', hint:'−15 % de ta banque', side:'cynic', fx:G => { G.spend(G.S.bank*0.15); G.toast('Le dossier disparaît. Ta conscience aussi.'); }},
   b:{label:'Laisser fuiter', hint:'Production −40 % pendant 60 s, récepteurs +30', side:'kind', fx:G => { G.buff('prod', 0.6, 60, 'Scandale −40 %'); G.S.d2 = Math.min(100, G.S.d2 + 30); }}},
  {id:'senate', icon:'alert', title:'Audition au Sénat',
   text:'Une commission d\'enquête te convoque. Les caméras tournent.',
   a:{label:'« Sénateur, nous vendons de la pub. »', hint:'Devient un mème : production ×3 pendant 45 s', side:'cynic', fx:G => G.buff('prod', 3, 45, 'Mème ×3')},
   b:{label:'Promettre un contrôle parental', hint:'Production −25 % 2 min, puis +5 % pour la partie', side:'kind', fx:G => { G.buff('prod', 0.75, 120, 'Contrôle parental'); G.S.runMult *= 1.05; }}},
  {id:'collab', icon:'robot', title:'Méga-influenceur',
   text:'Un influenceur à 80 M d\'abonnés propose un partenariat « authentique ».',
   a:{label:'Signer sans lire', hint:'Production ×3 pendant 90 s, récepteurs −20', side:'cynic', fx:G => { G.buff('prod', 3, 90, 'Collab ×3'); G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 20); }},
   b:{label:'Refuser poliment', hint:'Une notification dorée arrive tout de suite', side:'kind', fx:G => G.spawnGolden()}},
  {id:'rival', icon:'phone', title:'TikTak débarque',
   text:'Une appli concurrente explose chez les 13-17 ans. Tes métriques tremblent.',
   a:{label:'Copier chaque fonctionnalité', hint:'Coûte 5 min de production, +10 % pour la partie', side:'cynic', fx:G => { G.spend(G.effDps()*300); G.S.runMult *= 1.10; }},
   b:{label:'La racheter', hint:'−30 % de ta banque, +25 % pour la partie', side:'cynic', fx:G => { G.spend(G.S.bank*0.30); G.S.runMult *= 1.25; }}},
  {id:'outage', icon:'alert', title:'Panne mondiale',
   text:'Tes serveurs tombent pendant 6 heures. Les gens redécouvrent… leurs proches.',
   a:{label:'Accuser un stagiaire', hint:'Retour en force : production ×2 pendant 60 s', side:'cynic', fx:G => G.buff('prod', 2, 60, 'Rebond ×2')},
   b:{label:'Parler de « pause bien-être »', hint:'Récepteurs D2 remis à 100 %', side:'kind', fx:G => { G.S.d2 = 100; }}},
  {id:'docu', icon:'play', title:'Le documentaire',
   text:'Un docu sur les dangers de ton appli cartonne en streaming. Ironie : il est très addictif.',
   a:{label:'En faire un mème', hint:'Production ×7 pendant 20 s', side:'cynic', fx:G => G.buff('prod', 7, 20, 'Viral ×7')},
   b:{label:'Ajouter un minuteur d\'écran', hint:'Récepteurs +25, +3 % pour la partie', side:'kind', fx:G => { G.S.d2 = Math.min(100, G.S.d2 + 25); G.S.runMult *= 1.03; }}},
  {id:'dreams', icon:'chip', title:'Le labo des rêves',
   text:'La R&D propose de tester la publicité pendant le sommeil paradoxal.',
   a:{label:'Valider le protocole', hint:'+15 % pour la partie, récepteurs −25', side:'cynic', fx:G => { G.S.runMult *= 1.15; G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 25); }},
   b:{label:'Refuser', hint:'Bonne presse : +3 min de production', side:'kind', fx:G => G.gain(G.effDps()*180 + 50)}},
  {id:'coin', icon:'gift', title:'Le DopaCoin',
   text:'Un « visionnaire » en gilet te propose de lancer ta propre cryptomonnaie.',
   a:{label:'Lancer le DopaCoin', hint:'Pile : banque ×2. Face : banque ÷2', side:'cynic', fx:G => { if (Math.random() < 0.5){ G.gain(G.S.bank); G.toast('<b>To the moon !</b> Ta banque double.'); } else { G.spend(G.S.bank/2); G.toast('<b>Rug pull.</b> Ta banque fond de moitié.', 'coral'); } }},
   b:{label:'Non merci', hint:'+1 min de production', side:'kind', fx:G => G.gain(G.effDps()*60 + 20)}},
  {id:'mods', icon:'robot', title:'Grève des modérateurs',
   text:'Les modérateurs de contenu arrêtent le travail. Le fil devient… intéressant.',
   a:{label:'Les remplacer par une IA', hint:'+10 % pour la partie', side:'cynic', fx:G => { G.S.runMult *= 1.10; }},
   b:{label:'Augmenter les salaires', hint:'−10 % de ta banque, récepteurs +20', side:'kind', fx:G => { G.spend(G.S.bank*0.10); G.S.d2 = Math.min(100, G.S.d2 + 20); }}},
  {id:'parents', icon:'alert', title:'Pétition des parents',
   text:'2 millions de parents exigent un bouton « pause » dans l\'appli.',
   a:{label:'Un bouton pause que personne ne voit', hint:'Tap ×20 pendant 15 s', side:'cynic', fx:G => G.buff('tap', 20, 15, 'Tap ×20')},
   b:{label:'Mode avion activé par défaut la nuit', hint:'Récepteurs D2 remis à 100 %', side:'kind', fx:G => { G.S.d2 = 100; }}},
  {id:'energy', icon:'flame', title:'Sponsor énergisant',
   text:'Une marque de boissons énergisantes veut coller son logo sur chaque notification.',
   a:{label:'Signer le contrat', hint:'Production ×4 pendant 40 s, récepteurs −15', side:'cynic', fx:G => { G.buff('prod', 4, 40, 'Sponsor ×4'); G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 15); }},
   b:{label:"Refuser l'offre", hint:'+5 % pour la partie', side:'kind', fx:G => { G.S.runMult *= 1.05; }}},
  {id:'spam', icon:'bell', title:'Trop de notifs',
   text:'Les utilisateurs se plaignent : 140 notifications par jour, c\'est « un peu beaucoup ».',
   a:{label:'Doubler les notifications', hint:'Tap ×10 pendant 20 s, récepteurs −10', side:'cynic', fx:G => { G.buff('tap', 10, 20, 'Spam ×10'); G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 10); }},
   b:{label:'Un seul résumé par jour', hint:'Récepteurs +20 et une notification dorée', side:'kind', fx:G => { G.S.d2 = Math.min(100, G.S.d2 + 20); G.spawnGolden(); }}},
  {id:'hack', icon:'lock', title:'Fichier à vendre',
   text:'Un hacker propose les données de 40 millions de comptes. Prix d\'ami.',
   a:{label:'Acheter le fichier', hint:'−10 % de ta banque, +15 % pour la partie', side:'cynic', fx:G => { G.spend(G.S.bank*0.10); G.S.runMult *= 1.15; }},
   b:{label:'Prévenir les utilisateurs', hint:'Production −30 % pendant 60 s, puis un coffre doré', side:'kind', fx:G => { G.buff('prod', 0.7, 60, 'Aveu public −30 %'); G.give('gold', 'honnêteté récompensée'); }}},
  {id:'detoxapp', icon:'phone', title:'Une appli de désintox',
   text:'Trois étudiants ont codé une appli qui aide les gens à décrocher. Elle cartonne.',
   a:{label:'La racheter et la fermer', hint:'−20 % de ta banque, +20 % pour la partie', side:'cynic', fx:G => { G.spend(G.S.bank*0.20); G.S.runMult *= 1.20; }},
   b:{label:'Laisser faire', hint:'Récepteurs D2 remis à 100 %', side:'kind', fx:G => { G.S.d2 = 100; }}},
  {id:'dislike', icon:'heart', title:'Le bouton « Je n\'aime pas »',
   text:'La R&D a inventé le dislike. Les tests montrent +40 % d\'engagement, et beaucoup de larmes.',
   a:{label:'Le lancer partout', hint:'Production ×5 pendant 30 s, récepteurs −20', side:'cynic', fx:G => { G.buff('prod', 5, 30, 'Indignation ×5'); G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 20); }},
   b:{label:'Classer le projet', hint:'Un coffre en bois et +3 min de production', side:'kind', fx:G => { G.give('wood', 'projet classé'); G.gain(G.effDps()*180 + 50); }}},
  {id:'school', icon:'alert', title:'Semaine sans écran',
   text:'Une école organise une semaine sans écran. Les parents adorent. Tes actionnaires, moins.',
   a:{label:'Sponsoriser un défi viral la même semaine', hint:'Production ×3 pendant 60 s', side:'cynic', fx:G => G.buff('prod', 3, 60, 'Défi viral ×3')},
   b:{label:"Soutenir l'initiative", hint:'Récepteurs +25, +5 % pour la partie', side:'kind', fx:G => { G.S.d2 = Math.min(100, G.S.d2 + 25); G.S.runMult *= 1.05; }}},
  {id:'quarter', icon:'graph', title:'Fin de trimestre',
   text:'Les actionnaires exigent +20 % de temps d\'écran ce trimestre. Ils ont préparé des graphiques.',
   a:{label:'Promettre +30 %', hint:'+5 min de production, récepteurs −25', side:'cynic', fx:G => { G.gain(G.effDps()*300 + 50); G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 25); }},
   b:{label:'Promettre une croissance stable', hint:'Production ×1,5 pendant 3 min', side:'kind', fx:G => G.buff('prod', 1.5, 180, 'Croissance durable ×1,5')}},
  /* ---- Pack France ---- */
  {id:'nasdas', icon:'gift', title:'Nasdas est en bas de chez toi',
   text:'Il passe en story devant ton QG à Perpignan et distribue des billets. Tout le quartier descend en chaussons.',
   a:{label:'Faire la queue comme tout le monde', hint:'+10 min de production', side:'kind', fx:G => { G.gain(G.effDps()*600 + 100); G.toast('Tu repars avec un billet et une photo floue. Journée réussie.'); }},
   b:{label:'Lancer un filtre « pluie de billets »', hint:'Production ×4 pendant 45 s', side:'cynic', fx:G => G.buff('prod', 4, 45, 'Pluie de billets ×4')}},
  {id:'ratp', icon:'phone', title:'Grève dans les transports',
   text:'Métro à l\'arrêt. Des millions de gens attendent sur le quai avec leur téléphone pour seule compagnie.',
   a:{label:'Envoyer « Coincé ? On est là 😉 »', hint:'Production ×5 pendant 30 s, récepteurs −15', side:'cynic', fx:G => { G.buff('prod', 5, 30, 'Quai bondé ×5'); G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 15); }},
   b:{label:'Offrir le Wi-Fi gratuit sur les quais', hint:'+4 % pour la partie', side:'kind', fx:G => { G.S.runMult *= 1.04; }}},
  {id:'zevent', icon:'heart', title:'Le marathon caritatif',
   text:'Un grand live caritatif bat tous les records de dons. On te propose de participer.',
   a:{label:'Faire un énorme don', hint:'−20 % de ta banque, coffre doré, récepteurs +30', side:'kind', fx:G => { G.spend(G.S.bank*0.20); G.give('gold', 'don caritatif'); G.S.d2 = Math.min(100, G.S.d2 + 30); }},
   b:{label:'Glisser une pub entre chaque don', hint:'Production ×3 pendant 60 s', side:'cynic', fx:G => G.buff('prod', 3, 60, 'Pub caritative ×3')}},
  {id:'bacphilo', icon:'help', title:'Bac de philo',
   text:'Sujet de l\'année : « Le scroll nous rend-il libres ? » 500 000 lycéens paniquent en même temps.',
   a:{label:'Publier des résumés de 15 secondes', hint:'Production ×3 pendant 60 s', side:'cynic', fx:G => G.buff('prod', 3, 60, 'Fiches de révision ×3')},
   b:{label:'Couper l\'appli la veille de l\'épreuve', hint:'Récepteurs +30, +3 % pour la partie', side:'kind', fx:G => { G.S.d2 = Math.min(100, G.S.d2 + 30); G.S.runMult *= 1.03; }}},
  {id:'finale', icon:'trophy', title:'Les Bleus en finale',
   text:'Tout le pays regarde le match. Enfin presque : la moitié regarde les résumés sur ton appli.',
   a:{label:'Glisser une pub pendant les tirs au but', hint:'Production ×6 pendant 20 s, récepteurs −20', side:'cynic', fx:G => { G.buff('prod', 6, 20, 'Tirs au but ×6'); G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 20); }},
   b:{label:'Diffuser la finale gratuitement', hint:'Une notification dorée, +3 % pour la partie', side:'kind', fx:G => { G.spawnGolden(); G.S.runMult *= 1.03; }}},
  {id:'dejeuner', icon:'gift', title:'La pause déj\' sacrée',
   text:'Tes développeurs exigent deux heures de pause déjeuner et un plateau de fromages. Ce n\'est pas négociable.',
   a:{label:'Refuser : sandwich devant l\'écran', hint:'Production ×2 pendant 90 s, récepteurs −10', side:'cynic', fx:G => { G.buff('prod', 2, 90, 'Sandwich-clavier ×2'); G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 10); }},
   b:{label:'Commander le plateau de fromages', hint:'−5 % de ta banque, +6 % pour la partie', side:'kind', fx:G => { G.spend(G.S.bank*0.05); G.S.runMult *= 1.06; G.toast('Le comté a ressoudé l\'équipe.'); }}},
  {id:'telereal', icon:'play', title:'Téléréalité',
   text:'Une émission de téléréalité veut tourner sa prochaine saison dans tes bureaux. Avec piscine.',
   a:{label:'Accepter, clashs compris', hint:'Production ×3 pendant 75 s', side:'cynic', fx:G => G.buff('prod', 3, 75, 'Clash en direct ×3')},
   b:{label:'Refuser poliment', hint:'Récepteurs +20', side:'kind', fx:G => { G.S.d2 = Math.min(100, G.S.d2 + 20); }}},
  {id:'petanque', icon:'trophy', title:'Tournoi de pétanque',
   text:'Le comité d\'entreprise organise un tournoi de pétanque. Le stagiaire tire comme un champion du monde.',
   a:{label:'Jouer avec toute l\'équipe', hint:'Récepteurs +20 et une notification dorée', side:'kind', fx:G => { G.S.d2 = Math.min(100, G.S.d2 + 20); G.spawnGolden(); }},
   b:{label:'Diffuser le tournoi en live', hint:'Production ×2,5 pendant 60 s', side:'cynic', fx:G => G.buff('prod', 2.5, 60, 'Carreau en direct ×2,5')}},
  {id:'chocolatine', icon:'alert', title:'Pain au chocolat ou chocolatine ?',
   text:'Le débat explose dans tes commentaires : 40 millions de messages en une heure.',
   a:{label:'Mettre de l\'huile sur le feu', hint:'Production ×4 pendant 40 s, récepteurs −15', side:'cynic', fx:G => { G.buff('prod', 4, 40, 'Débat national ×4'); G.S.d2 = Math.max(G.floorD2(), G.S.d2 - 15); }},
   b:{label:'Annoncer que les deux se disent', hint:'Tout le monde est fâché : −20 % pendant 30 s, puis +4 % pour la partie', side:'kind', fx:G => { G.buff('prod', 0.8, 30, 'Tout le monde est fâché'); G.S.runMult *= 1.04; }}},
];

})(window.DT);

/* ======================= v1.24 : un jeu presque sans fin =======================
 * 10 mécaniques de plus (jusqu'à ~1e28), 5 paliers de plus pour chaque mécanique (150 à 500 exemplaires),
 * améliorations globales jusqu'à 1e50, 20 sagesses de plus (jusqu'à 1e14 Sérénité), 6 chapitres de plus.
 * Les améliorations et sagesses à effet générique portent leurs multiplicateurs dans `mult` (production), `tap`,
 * `eff` (sagesses : prod, tap, ser, cost, xp) : game.js les applique sans code par identifiant. */
const NEW_GENS = [
  {code:'QBIT', icon:'chip',   name:'Ordinateur quantique', desc:'Il scrolle tous les feeds possibles en même temps.',                 cost:4e17,   prod:1.17e11},
  {code:'MULT', icon:'twin',   name:'Multivers',            desc:'Une infinité de toi. Une infinité de notifications.',                cost:5.5e18, prod:7.6e11},
  {code:'LOOP', icon:'play',   name:'Boucle temporelle',    desc:'Tu revis la même minute de scroll. Pour toujours.',                  cost:7.5e19, prod:4.9e12},
  {code:'DYSN', icon:'sat',    name:'Sphère de Dyson',      desc:"Toute l'énergie d'une étoile pour faire tourner une appli de vidéos.", cost:1e21, prod:3.2e13},
  {code:'VOID', icon:'eye',    name:"Trou noir d'attention", desc:"Même la lumière ne peut pas s'en échapper. Toi non plus.",          cost:1.4e22, prod:2.1e14},
  {code:'DREM', icon:'lotus',  name:'Rêve partagé',         desc:"Des pubs dans les rêves de tout l'univers, en même temps.",         cost:2e23,   prod:1.36e15},
  {code:'OMEG', icon:'galaxy', name:'Point Oméga',          desc:"La fin de l'univers, sponsorisée.",                                 cost:2.8e24, prod:8.8e15},
  {code:'META', icon:'hive',   name:'Méta-univers',         desc:'Un univers qui contient tous les univers. Tous ont des stories.',    cost:4e25,   prod:5.7e16},
  {code:'BANG', icon:'flame',  name:'Nouveau Big Bang',     desc:'Un univers tout neuf, rempli de notifications dès la première seconde.', cost:6e26, prod:3.7e17},
  {code:'INF',  icon:'heart',  name:'Dopamine infinie',     desc:"Il n'y a plus de fin. Il n'y a plus que la suite.",                 cost:9e27,   prod:2.4e18},
];
const NEW_TIER_NAMES = [
  ['Qubit de compagnie', 'Superposition de feeds', 'Intrication sociale', 'Décohérence du sommeil', 'Calcul de toutes les vies'],
  ['Toi bis', 'Univers parallèle premium', 'Toi qui a réussi', 'Collision de timelines', 'Une infinité de pouces'],
  ['Déjà-vu', 'Lundi sans fin', 'Paradoxe du grand-père', 'Rembobinage de la vie', 'Éternel retour'],
  ['Panneau solaire XXL', 'Étoile sous contrat', 'Ciel sans nuit', 'Galaxie alimentée', 'Soleil en abonnement'],
  ['Horizon des événements', 'Spaghettification', 'Temps figé', 'Trou de ver sponsorisé', 'Singularité attentionnelle'],
  ['Rêve lucide', 'Cauchemar sponsorisé', 'Sommeil paradoxal', 'Rêve dans le rêve', 'Inception publicitaire'],
  ['Compte à rebours final', 'Dernière notification', 'Entropie inversée', 'Fin du temps', 'Le tout dernier like'],
  ['Univers de poche', 'Univers en série', 'Bibliothèque des mondes', 'Méta-feed', 'Tout, partout'],
  ['Étincelle primordiale', 'Inflation cosmique', 'Premières étoiles', 'Galaxies fraîches', 'Univers 2.0'],
  ['Shot éternel', 'Dopamine pure', 'Récepteurs infinis', 'Bonheur à la demande', 'Au-delà de tout'],
];
const g0 = DT.GENS.length;
DT.GENS.push(...NEW_GENS);
NEW_GENS.forEach((g, j) => DT.TIERS.slice(0, 5).forEach((t, k) => DT.UPS.push({
  id: `g${g0 + j}t${k}`, name: NEW_TIER_NAMES[j][k], desc: `${g.name} : production ×2.`, icon: g.icon,
  cost: g.cost * t.m, req: G => G.S.gens[g0 + j] >= t.at,
})));
// Paliers supplémentaires pour toutes les mécaniques (le coût suit celui des exemplaires : 1,15 par achat).
const MORE_TIERS = [{at:150, m:1e9}, {at:200, m:1e12}, {at:300, m:1e18}, {at:400, m:1e24}, {at:500, m:1e30}];
const MORE_NAMES = ['Turbo', 'Pro Max', 'Édition Deluxe', 'Quantique', 'Cosmique'];
DT.TIERS.push(...MORE_TIERS);
DT.GENS.forEach((g, i) => MORE_TIERS.forEach((t, kk) => DT.UPS.push({
  id: `g${i}t${5 + kk}`, name: `${g.name} ${MORE_NAMES[kk]}`, desc: `${g.name} : production ×2.`, icon: g.icon,
  cost: g.cost * t.m, req: G => G.S.gens[i] >= t.at,
})));
[
  {id:'c6', name:'Pouce quantique', desc:'Chaque tap rapporte 5× plus.',  cost:1e20, at:6000,  tap:5},
  {id:'c7', name:'Pouce cosmique',  desc:'Chaque tap rapporte 10× plus.', cost:1e30, at:15000, tap:10},
  {id:'c8', name:'Pouce infini',    desc:'Chaque tap rapporte 25× plus.', cost:1e42, at:40000, tap:25},
].forEach(u => DT.UPS.push({...u, icon:'heart', req: G => G.S.clicks >= u.at}));
[
  {id:'u_quant', icon:'chip',   name:'Intrication quantique',  desc:'Production ×2. Tes notifications arrivent avant d\'être envoyées.', cost:1e22, mult:2},
  {id:'u_multi', icon:'twin',   name:'Copies parallèles',      desc:'Production ×3. Chaque toi du multivers bosse pour toi.',          cost:1e25, mult:3},
  {id:'u_loop',  icon:'play',   name:'Boucle parfaite',        desc:'Production ×2. La fin de la vidéo est aussi son début.',          cost:1e28, mult:2},
  {id:'u_dyson', icon:'sat',    name:'Énergie stellaire',      desc:'Production ×3. Une étoile entière dédiée à ton fil d\'actu.',     cost:1e31, mult:3},
  {id:'u_void',  icon:'eye',    name:'Horizon des événements', desc:'Production ×2. Plus rien ne quitte ton appli.',                   cost:1e34, mult:2},
  {id:'u_dream', icon:'lotus',  name:'Publicité onirique',     desc:'Production ×3. Même tes rêves ont des pubs non désactivables.',   cost:1e37, mult:3},
  {id:'u_omega', icon:'galaxy', name:'Attention oméga',        desc:'Production ×5. L\'univers entier regarde tes stories.',           cost:1e41, mult:5},
  {id:'u_bang',  icon:'flame',  name:'Big Bang sponsorisé',    desc:'Production ×5. « Ce nouvel univers vous est offert par… »',       cost:1e45, mult:5},
  {id:'u_eter',  icon:'heart',  name:'Dopamine éternelle',     desc:'Production ×10. Le jeu n\'a plus de fin. Toi non plus.',          cost:1e50, mult:10},
].forEach(u => DT.UPS.push({...u, req: G => G.S.run >= u.cost * 0.25}));
DT.UPS.sort((a, b) => a.cost - b.cost);

// Améliorations infinies (dans la partie en cours) : rachetables sans fin, chaque niveau plus cher.
DT.INF_UPS = [
  {id:'p', icon:'graph', name:'Algorithme infini', desc: n => `Production ×1,1 par niveau (actuellement ×${fx(Math.pow(1.1, n))}).`, base:1e15, grow:4,  open:1e14},
  {id:'t', icon:'heart', name:'Pouce sans fin',    desc: n => `Taps ×1,25 par niveau (actuellement ×${fx(Math.pow(1.25, n))}).`,  base:1e12, grow:5,  open:1e11},
];
const fx = m => (m < 10 ? m.toFixed(2) : m < 1000 ? m.toFixed(1) : m.toExponential(2)).replace('.', ',');
DT.infCost = (u, n) => u.base * Math.pow(u.grow, n);

// Chapitres, rangs et actus des nouveaux chapitres
DT.ERAS.push(
  {at:1e24, num:'VIII', name:'Le Multivers',        line:'Une infinité d\'univers. Une infinité de joueurs. Un seul classement.', color:'#7CF5FF', rgb:'124,245,255'},
  {at:1e28, num:'IX',   name:'La Boucle',           line:'Le temps tourne en rond. Ta production, elle, monte encore.',          color:'#B5FF6B', rgb:'181,255,107'},
  {at:1e32, num:'X',    name:'L\'Horizon',          line:'Au bord du trou noir, tout ralentit. Sauf les notifications.',         color:'#FF6BD6', rgb:'255,107,214'},
  {at:1e37, num:'XI',   name:'Le Point Oméga',      line:'La fin de toute chose. Elle a quand même un bouton « J\'aime ».',     color:'#FFE66B', rgb:'255,230,107'},
  {at:1e43, num:'XII',  name:'Le Nouveau Big Bang', line:'Tout recommence. En mieux. Avec plus de pubs.',                        color:'#FF9E6B', rgb:'255,158,107'},
  {at:1e50, num:'XIII', name:'L\'Infini',           line:'Il n\'y a plus de chapitre suivant. Enfin… on verra.',                 color:'#C2A3FF', rgb:'194,163,255'},
);
DT.RANKS.push([1e24, 'Seigneur du Multivers'], [1e28, 'Maître du Temps'], [1e32, 'Gardien de l\'Horizon'], [1e37, 'Architecte d\'Oméga'],
  [1e43, 'Créateur d\'univers'], [1e50, 'Être infini']);
DT.HEADLINES.push(
  [['MULTIVERS', 'Un toi parallèle a déjà fini le jeu. Il s\'ennuie terriblement.'], ['SCIENCE', 'Découverte d\'un univers sans réseau. Personne ne veut y aller.'],
   ['SOCIÉTÉ', 'Les toi des autres univers demandent un jour de congé. Refusé.']],
  [['TEMPS', 'Lundi matin a été rallongé de trois heures. Personne n\'a rien remarqué.'], ['BOUCLE', 'Tu as déjà lu cette actu. Tu as déjà lu cette actu.'],
   ['HORLOGE', 'Les montres tournent désormais dans le sens du scroll.']],
  [['ESPACE', 'Un trou noir refuse de rendre les vidéos qu\'il a avalées.'], ['PHYSIQUE', 'La vitesse de la lumière dépassée par une rumeur de célébrité.'],
   ['NASA', 'Les astronautes demandent le Wi-Fi au bord de l\'horizon des événements.']],
  [['FIN DU MONDE', 'La fin de l\'univers est repoussée : trop de spectateurs en direct.'], ['OMÉGA', 'La dernière étoile a posté une story. 12 milliards de vues.'],
   ['PHILO', 'Un sage atteint le Point Oméga. Il demande où est le bouton « Passer l\'intro ».']],
  [['BIG BANG', 'Nouvel univers lancé. Première chose créée : un fil d\'actu.'], ['COSMOS', 'Les galaxies toutes neuves ont déjà des influenceurs.'],
   ['GENÈSE', 'Au commencement était le Like.']],
  [['INFINI', 'Ta production a dépassé tous les nombres connus. Les mathématiciens en inventent de nouveaux.'], ['ÉTUDE', 'Il ne reste plus rien à débloquer. Ah si, encore un niveau.'],
   ['FIN ?', 'Il n\'y a pas de fin. Il n\'y a que la suite.']],
);

// Sagesses à effet générique (eff : prod, tap, ser = Sérénité gagnée, cost = prix des mécaniques, xp)
DT.SAGES.push(
  {id:'s_p1', icon:'lotus', name:'Lâcher-prise',        desc:'Production ×2.',                           cost:25,   eff:{prod:2}},
  {id:'s_t1', icon:'heart', name:'Pouce zen',           desc:'Taps ×3.',                                 cost:40,   eff:{tap:3}},
  {id:'s_x1', icon:'gift',  name:'Curiosité',           desc:'XP ×1,25 (niveaux, saison et Pass).',      cost:60,   eff:{xp:1.25}},
  {id:'s_s1', icon:'lotus', name:'Gratitude',           desc:'Sérénité gagnée à chaque cure ×1,25.',     cost:100,  eff:{ser:1.25}},
  {id:'s_c1', icon:'gift',  name:'Sobriété',            desc:'Toutes les mécaniques coûtent 10 % de moins.', cost:150, eff:{cost:0.9}},
  {id:'s_p2', icon:'lotus', name:'Pleine conscience',   desc:'Production ×3.',                           cost:300,  eff:{prod:3}},
  {id:'s_s2', icon:'lotus', name:'Respiration profonde', desc:'Sérénité gagnée ×1,5.',                   cost:600,  eff:{ser:1.5}},
  {id:'s_t2', icon:'heart', name:'Main de fer',         desc:'Taps ×5.',                                 cost:1000, eff:{tap:5}},
  {id:'s_p3', icon:'lotus', name:'Détachement',         desc:'Production ×5.',                           cost:2500, eff:{prod:5}},
  {id:'s_x2', icon:'gift',  name:'Sagesse ancienne',    desc:'XP ×1,5.',                                 cost:5000, eff:{xp:1.5}},
  {id:'s_c2', icon:'gift',  name:'Minimalisme',         desc:'Toutes les mécaniques coûtent 20 % de moins.', cost:1e4, eff:{cost:0.8}},
  {id:'s_s3', icon:'lotus', name:'Illumination',        desc:'Sérénité gagnée ×2.',                      cost:2.5e4, eff:{ser:2}},
  {id:'s_p4', icon:'lotus', name:'Nirvana',             desc:'Production ×10.',                          cost:1e5,  eff:{prod:10}},
  {id:'s_t3', icon:'heart', name:'Toucher de maître',   desc:'Taps ×10.',                                cost:3e5,  eff:{tap:10}},
  {id:'s_s4', icon:'lotus', name:'Satori',              desc:'Sérénité gagnée ×2.',                      cost:1e6,  eff:{ser:2}},
  {id:'s_p5', icon:'galaxy', name:'Unité cosmique',     desc:'Production ×25.',                          cost:5e6,  eff:{prod:25}},
  {id:'s_c3', icon:'gift',  name:'Ascèse',              desc:'Toutes les mécaniques coûtent 30 % de moins.', cost:2e7, eff:{cost:0.7}},
  {id:'s_p6', icon:'galaxy', name:'Éternité',           desc:'Production ×100.',                         cost:1e9,  eff:{prod:100}},
  {id:'s_s5', icon:'galaxy', name:'Infinité',           desc:'Sérénité gagnée ×3.',                      cost:1e11, eff:{ser:3}},
  {id:'s_p7', icon:'galaxy', name:'Au-delà',            desc:'Production ×1 000.',                       cost:1e14, eff:{prod:1000}},
);
// Sagesses infinies : achetées par niveaux avec la Sérénité, gardées pour toujours.
DT.SAG_INF = [
  {id:'p', icon:'lotus',  name:'Méditation infinie', desc: n => `Production ×1,15 par niveau (actuellement ×${fx(Math.pow(1.15, n))}).`, base:50,  grow:1.5},
  {id:'s', icon:'galaxy', name:'Sérénité infinie',   desc: n => `Sérénité gagnée ×1,1 par niveau (actuellement ×${fx(Math.pow(1.1, n))}).`, base:200, grow:1.7},
  {id:'t', icon:'heart',  name:'Pouce éternel',      desc: n => `Taps ×1,25 par niveau (actuellement ×${fx(Math.pow(1.25, n))}).`, base:100, grow:1.6},
];
DT.sagInfCost = (u, n) => Math.ceil(u.base * Math.pow(u.grow, n));

// Succès des nouveautés
DT.ACH.push(
  {id:'gen16',  name:'Calcul quantique',      desc:'Avoir un Ordinateur quantique.',            t:G => (G.S.gens[15] || 0) >= 1},
  {id:'gen20',  name:'Attention absorbée',    desc:'Avoir un Trou noir d\'attention.',          t:G => (G.S.gens[19] || 0) >= 1},
  {id:'gen25',  name:'Dopamine infinie',      desc:'Avoir une Dopamine infinie.',               t:G => (G.S.gens[24] || 0) >= 1},
  {id:'g500',   name:'Collectionneur fou',    desc:'Avoir 500 exemplaires d\'une mécanique.',   t:G => G.S.gens.some(n => n >= 500)},
  {id:'era8',   name:'Bienvenue dans le Multivers', desc:'Atteindre le chapitre VIII.',          t:G => G.S.era >= 7},
  {id:'era11',  name:'La fin de toute chose', desc:'Atteindre le chapitre XI : le Point Oméga.', t:G => G.S.era >= 10},
  {id:'era13',  name:'Vers l\'infini',        desc:'Atteindre le chapitre XIII : l\'Infini.',    t:G => G.S.era >= 12},
  {id:'inf10',  name:'Sans fin',              desc:'Monter une amélioration infinie au niveau 10.', t:G => Object.values(G.S.inf || {}).some(n => n >= 10)},
  {id:'sag20',  name:'Grand sage',            desc:'Avoir 20 sagesses.',                         t:G => Object.keys(G.S.sag || {}).length >= 20},
  {id:'sagall', name:'Sagesse absolue',       desc:'Avoir toutes les sagesses.',                 t:G => DT.SAGES.every(x => (G.S.sag || {})[x.id])},
  {id:'saginf', name:'Méditation éternelle',  desc:'Monter une sagesse infinie au niveau 25.',  t:G => Object.values(G.S.sagInf || {}).some(n => n >= 25)},
);

// Succès de l'onglet Bonus (v1.25)
DT.ACH.push(
  {id:'luckmax', name:'Né sous une bonne étoile', desc:'Monter une amélioration de chance au maximum.',      t:G => Object.values(G.S.luck || {}).some(n => n >= 5)},
  {id:'luckall', name:'Trèfle géant',             desc:'Toutes les améliorations de chance au maximum.',      t:G => ['casino', 'slots', 'ticket', 'chest', 'wheel', 'crystal'].every(k => ((G.S.luck || {})[k] || 0) >= 5)},
  {id:'pet5',    name:'Bon maître',               desc:'Dopa au niveau 5.',                                   t:G => ((G.S.pet || {}).lvl || 0) >= 5},
  {id:'pet20',   name:'Meilleurs amis',           desc:'Dopa au niveau 20.',                                  t:G => ((G.S.pet || {}).lvl || 0) >= 20},
  {id:'vault5',  name:'Perceur de coffres',       desc:'Ouvrir 5 coffres-forts.',                             t:G => ((G.S.fun || {}).vaults || 0) >= 5},
  {id:'lotto3',  name:'Main heureuse',            desc:'Avoir 3 bons numéros ou plus à la loterie.',          t:G => ((G.S.fun || {}).lotto || 0) >= 1},
  {id:'fz10',    name:'Frénétique',               desc:'Réussir 10 frénésies.',                               t:G => ((G.S.fun || {}).fz || 0) >= 10},
  {id:'clover10', name:'Chasseur de trèfles',     desc:'Attraper 10 trèfles à 4 feuilles.',                   t:G => ((G.S.fun || {}).clover || 0) >= 10},
  {id:'tour7',   name:'Habitué du casino',        desc:'Faire 7 tournées des jeux.',                          t:G => ((G.S.fun || {}).tours || 0) >= 7},
  {id:'trans1',  name:'Transcendance',            desc:'Transcender une première fois.',                      t:G => (G.S.trans || 0) >= 1},
  {id:'eclat10', name:'Éternel',                  desc:'Avoir 10 Éclats d\'éternité.',                       t:G => (G.S.eclats || 0) >= 10},
);

/* ======================= v1.26 : l'infini =======================
 * Mécaniques générées jusqu'à ~1e290 (chacune ~80× plus chère et ~40× plus productive que la précédente), avec leurs
 * 10 paliers ; chapitres jusqu'à 1e300. Le jeu ne peut pas dépasser 1e300 (limite des nombres de JavaScript) : au-delà,
 * la progression continue par la Transcendance, les talents, les défis et la Renaissance (app/infini.js). */
const INF_PFX = ['Usine', 'Ferme', 'Réacteur', 'Forge', 'Nébuleuse', 'Moteur', 'Tour', 'Océan', 'Cristal', 'Fractale',
  'Nuage', 'Volcan', 'Labyrinthe', 'Spirale', 'Archipel', 'Citadelle', 'Comète', 'Prisme', 'Essaim', 'Abîme'];
const INF_SFX = ['à likes', 'à notifications', 'de scroll', 'de stories', 'à dopamine', 'd\'attention', 'de hype'];
const INF_DESC = ['Elle tourne plus vite que la lumière. Personne ne sait où est le bouton stop.',
  'Construite avec la dopamine de l\'univers précédent.', 'Un milliard de fois plus grosse que la précédente. Au moins.',
  'Les physiciens ont arrêté de compter. Toi, non.', 'On dit qu\'elle rêve de notifications.', 'Elle produit pendant que l\'univers dort.',
  'Même ses ombres scrollent.', 'Plus grande que tout ce qui existait hier.'];
const INF_ICONS = ['bell', 'heart', 'phone', 'play', 'flame', 'gift', 'graph', 'robot', 'vr', 'chip', 'sat', 'twin', 'hive', 'eye', 'galaxy', 'lotus'];
const INF_LBL = ['I', 'II', 'III', 'IV', 'V', 'Turbo', 'Pro Max', 'Deluxe', 'Quantique', 'Cosmique'];
{
  let last = DT.GENS[DT.GENS.length - 1], i = 0;
  while (i < INF_PFX.length * INF_SFX.length) {
    const cost = last.cost * 80, prod = last.prod * 40;
    if (cost > 1e290) break;
    const g = {code: 'X' + i, icon: INF_ICONS[i % INF_ICONS.length], name: `${INF_PFX[i % INF_PFX.length]} ${INF_SFX[Math.floor(i / INF_PFX.length)]}`,
      desc: INF_DESC[i % INF_DESC.length], cost, prod};
    const gi = DT.GENS.length;
    DT.GENS.push(g);
    DT.TIERS.forEach((t, k) => DT.UPS.push({id: `g${gi}t${k}`, name: `${g.name} ${INF_LBL[k]}`, desc: `${g.name} : production ×2.`, icon: g.icon,
      cost: g.cost * t.m, req: G => G.S.gens[gi] >= t.at}));
    last = g; i++;
  }
  DT.UPS.sort((a, b) => a.cost - b.cost);
}
// Chapitres XIV à XXX : un tous les 1e15, jusqu'à 1e300
{
  const roman = n => { let s = ''; for (const [v, r] of [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]) while (n >= v) { s += r; n -= v; } return s; };
  const NAMES = ['Le Fractal', 'Les Abysses', 'Le Cristal', 'La Spirale', 'Les Archipels', 'La Citadelle', 'Les Comètes', 'Le Prisme', 'L\'Essaim',
    'L\'Abîme', 'Le Labyrinthe', 'Les Volcans', 'Les Nuages', 'Les Océans', 'Les Forges', 'Les Tours', 'L\'Au-delà'];
  NAMES.forEach((name, k) => {
    const at = Math.pow(10, 60 + 15 * k), hue = (k * 47) % 360;
    // couleur du chapitre : teinte qui tourne (TSL 85 %, 65 %)
    const s = 0.85, l = 0.65, a = s * Math.min(l, 1 - l);
    const f = n => { const c = (n + hue / 30) % 12; return Math.round(255 * (l - a * Math.max(-1, Math.min(c - 3, 9 - c, 1)))); };
    const rgb = [f(0), f(8), f(4)];
    DT.ERAS.push({at, num: roman(14 + k), name, line: `Une nouvelle strate de l'univers de la dopamine. Elle ne sera pas la dernière.`,
      color: `rgb(${rgb.join(',')})`, rgb: rgb.join(',')});
    DT.RANKS.push([at, `Souverain : ${name.replace(/^(Le|La|Les|L')\s?/, '')}`]);
    DT.HEADLINES.push([['INFINI', `Le chapitre « ${name} » est ouvert. Les scientifiques n'ont plus de mots pour les nombres.`],
      ['ÉCONOMIE', 'La dopamine mondiale dépasse le nombre d\'atomes dans l\'univers. Encore.'], ['RUMEUR', 'Il paraît qu\'il existe un chapitre après celui-ci.']]);
  });
}
DT.ACH.push(
  {id:'gx10',  name:'Usine à rêves',     desc:'Avoir 50 sortes de mécaniques.',         t:G => G.S.gens.filter(n => n > 0).length >= 50},
  {id:'gx100', name:'Collection infinie', desc:'Avoir 100 sortes de mécaniques.',       t:G => G.S.gens.filter(n => n > 0).length >= 100},
  {id:'era20', name:'Strate XX',          desc:'Atteindre le chapitre XX.',              t:G => G.S.era >= 19},
  {id:'era30', name:'Au-delà',            desc:'Atteindre le dernier chapitre.',         t:G => G.S.era >= DT.ERAS.length - 1},
  {id:'e100',  name:'Gogol en vue',       desc:'Produire 1e100 nmol au total.',          t:G => G.S.life >= 1e100},
  {id:'e200',  name:'Nombres interdits',  desc:'Produire 1e200 nmol au total.',          t:G => G.S.life >= 1e200},
  {id:'e300',  name:'Bord de l\'infini',  desc:'Atteindre la limite : 1e300 nmol.',      t:G => G.S.life >= 1e299},
);
