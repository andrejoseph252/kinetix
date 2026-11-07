/* Kinetix — Faith: a daily rule of life, guided Rosary (bring your own beads), the Examen,
   Scripture reading plans (NABRE via bible.usccb.org), intentions, prayers and the liturgical year.
   Traditional prayer texts are public domain; meditations and guidance are written for this app. */
'use strict';

/* ---------- dates ---------- */
const dk = (d = new Date()) => { const x = new Date(d); return x.getFullYear() + '-' + String(x.getMonth() + 1).padStart(2, '0') + '-' + String(x.getDate()).padStart(2, '0'); };
const addDays = (d, n) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const wd = (d = new Date()) => (new Date(d).getDay() + 6) % 7; // 0 = Monday
const dayDiff = (a, b) => Math.round((new Date(dk(b)) - new Date(dk(a))) / 864e5);
const ALL_DAYS = [0, 1, 2, 3, 4, 5, 6];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

/* ---------- prayers (traditional texts) ---------- */
const PRAYERS = {
  sign: ['Sign of the Cross', 'In the name of the Father, and of the Son, and of the Holy Spirit. Amen.'],
  creed: ["Apostles' Creed", 'I believe in God, the Father almighty, Creator of heaven and earth; and in Jesus Christ, his only Son, our Lord, who was conceived by the Holy Spirit, born of the Virgin Mary, suffered under Pontius Pilate, was crucified, died and was buried. He descended into hell; on the third day he rose again from the dead; he ascended into heaven, and is seated at the right hand of God the Father almighty; from there he will come to judge the living and the dead. I believe in the Holy Spirit, the holy Catholic Church, the communion of saints, the forgiveness of sins, the resurrection of the body, and life everlasting. Amen.'],
  ourfather: ['Our Father', 'Our Father, who art in heaven, hallowed be thy name; thy kingdom come; thy will be done on earth as it is in heaven. Give us this day our daily bread; and forgive us our trespasses, as we forgive those who trespass against us; and lead us not into temptation, but deliver us from evil. Amen.'],
  hailmary: ['Hail Mary', 'Hail Mary, full of grace, the Lord is with thee. Blessed art thou among women, and blessed is the fruit of thy womb, Jesus. Holy Mary, Mother of God, pray for us sinners, now and at the hour of our death. Amen.'],
  glorybe: ['Glory Be', 'Glory be to the Father, and to the Son, and to the Holy Spirit; as it was in the beginning, is now, and ever shall be, world without end. Amen.'],
  fatima: ['Fatima Prayer', 'O my Jesus, forgive us our sins, save us from the fires of hell; lead all souls to heaven, especially those in most need of thy mercy.'],
  holyqueen: ['Hail, Holy Queen', 'Hail, holy Queen, Mother of mercy, our life, our sweetness and our hope. To thee do we cry, poor banished children of Eve; to thee do we send up our sighs, mourning and weeping in this valley of tears. Turn then, most gracious advocate, thine eyes of mercy toward us; and after this our exile, show unto us the blessed fruit of thy womb, Jesus. O clement, O loving, O sweet Virgin Mary.\n\nV. Pray for us, O holy Mother of God.\nR. That we may be made worthy of the promises of Christ.'],
  rosaryprayer: ['Closing prayer', 'Let us pray. O God, whose only-begotten Son, by his life, death and resurrection, has purchased for us the rewards of eternal life; grant, we beseech thee, that meditating upon these mysteries of the most holy Rosary of the Blessed Virgin Mary, we may imitate what they contain and obtain what they promise, through the same Christ our Lord. Amen.'],
  offering: ['Morning Offering', 'O Jesus, through the Immaculate Heart of Mary, I offer you my prayers, works, joys and sufferings of this day, for all the intentions of your Sacred Heart, in union with the Holy Sacrifice of the Mass throughout the world, in reparation for my sins, for the intentions of all our associates, and in particular for the intentions of the Holy Father this month. Amen.'],
  angelus: ['The Angelus', 'V. The Angel of the Lord declared unto Mary.\nR. And she conceived of the Holy Spirit.\nHail Mary…\n\nV. Behold the handmaid of the Lord.\nR. Be it done unto me according to thy word.\nHail Mary…\n\nV. And the Word was made flesh.\nR. And dwelt among us.\nHail Mary…\n\nV. Pray for us, O holy Mother of God.\nR. That we may be made worthy of the promises of Christ.\n\nLet us pray. Pour forth, we beseech thee, O Lord, thy grace into our hearts, that we, to whom the Incarnation of Christ thy Son was made known by the message of an angel, may by his Passion and Cross be brought to the glory of his Resurrection, through the same Christ our Lord. Amen.'],
  reginacaeli: ['Regina Caeli', 'Queen of Heaven, rejoice, alleluia.\nFor he whom you did merit to bear, alleluia.\nHas risen, as he said, alleluia.\nPray for us to God, alleluia.\n\nV. Rejoice and be glad, O Virgin Mary, alleluia.\nR. For the Lord has truly risen, alleluia.\n\nLet us pray. O God, who gave joy to the world through the resurrection of thy Son, our Lord Jesus Christ, grant, we beseech thee, that through the intercession of the Virgin Mary, his Mother, we may obtain the joys of everlasting life, through the same Christ our Lord. Amen.'],
  stmichael: ['St Michael Prayer', 'Saint Michael the Archangel, defend us in battle; be our protection against the wickedness and snares of the devil. May God rebuke him, we humbly pray; and do thou, O Prince of the heavenly host, by the power of God, cast into hell Satan and all the evil spirits who prowl about the world seeking the ruin of souls. Amen.'],
  memorare: ['Memorare', 'Remember, O most gracious Virgin Mary, that never was it known that anyone who fled to thy protection, implored thy help, or sought thy intercession was left unaided. Inspired by this confidence, I fly unto thee, O Virgin of virgins, my Mother; to thee do I come, before thee I stand, sinful and sorrowful. O Mother of the Word Incarnate, despise not my petitions, but in thy mercy hear and answer me. Amen.'],
  contrition: ['Act of Contrition', 'O my God, I am heartily sorry for having offended thee, and I detest all my sins because of thy just punishments, but most of all because they offend thee, my God, who art all good and deserving of all my love. I firmly resolve, with the help of thy grace, to sin no more and to avoid the near occasion of sin. Amen.'],
  comeholyspirit: ['Come, Holy Spirit', 'Come, Holy Spirit, fill the hearts of thy faithful and kindle in them the fire of thy love.\nV. Send forth thy Spirit and they shall be created.\nR. And thou shalt renew the face of the earth.'],
  guardianangel: ['Guardian Angel Prayer', 'Angel of God, my guardian dear, to whom God’s love commits me here, ever this day be at my side, to light and guard, to rule and guide. Amen.'],
  anima: ['Anima Christi', 'Soul of Christ, sanctify me. Body of Christ, save me. Blood of Christ, inebriate me. Water from the side of Christ, wash me. Passion of Christ, strengthen me. O good Jesus, hear me. Within thy wounds hide me. Suffer me not to be separated from thee. From the malicious enemy defend me. In the hour of my death call me, and bid me come unto thee, that with thy saints I may praise thee for ever and ever. Amen.'],
  jesusprayer: ['The Jesus Prayer', 'Lord Jesus Christ, Son of God, have mercy on me, a sinner.\n\nPray it slowly with your breath: the first half breathing in, the second breathing out.'],
};
const PRAYER_LIST = ['offering', 'angelus', 'reginacaeli', 'comeholyspirit', 'stmichael', 'memorare', 'guardianangel', 'anima', 'jesusprayer', 'contrition', 'ourfather', 'hailmary', 'glorybe', 'creed', 'holyqueen'];

/* ---------- Rosary mysteries ---------- */
// [title, fruit, scripture ref text, book slug, chapter, meditation (written for Kinetix)]
const MYSTERIES = {
  joyful: { name: 'Joyful', days: 'Monday & Saturday', list: [
    ['The Annunciation', 'Humility', 'Luke 1:26–38', 'luke', 1, 'Gabriel greets Mary and she answers with a simple yes. Ask for the grace to say yes to what God asks of you today.'],
    ['The Visitation', 'Love of neighbour', 'Luke 1:39–56', 'luke', 1, 'Mary hurries to serve Elizabeth while carrying Christ. Who could you carry Christ to this week?'],
    ['The Nativity', 'Poverty of spirit', 'Luke 2:1–20', 'luke', 2, 'God is born in a stable, poor and small. Let go of something you are holding on to too tightly.'],
    ['The Presentation in the Temple', 'Obedience', 'Luke 2:22–38', 'luke', 2, 'Mary and Joseph offer Jesus to the Father, and Simeon recognises him. Offer God your work and your plans.'],
    ['The Finding in the Temple', 'Joy in finding Jesus', 'Luke 2:41–52', 'luke', 2, 'After three days of searching, they find him in his Father’s house. Where have you lost sight of Jesus lately?'],
  ] },
  luminous: { name: 'Luminous', days: 'Thursday', list: [
    ['The Baptism in the Jordan', 'Openness to the Holy Spirit', 'Matthew 3:13–17', 'matthew', 3, '“This is my beloved Son.” Hear the Father say the same over you, his son, by your baptism.'],
    ['The Wedding at Cana', 'To Jesus through Mary', 'John 2:1–12', 'john', 2, '“Do whatever he tells you.” Bring Mary the place where you are running short.'],
    ['The Proclamation of the Kingdom', 'Repentance and trust', 'Mark 1:14–15', 'mark', 1, 'Jesus calls everyone to repent and believe. What is one thing he is asking you to turn from?'],
    ['The Transfiguration', 'Desire for holiness', 'Luke 9:28–36', 'luke', 9, 'The disciples glimpse his glory before the Cross. Ask for hope that carries you through hard days.'],
    ['The Institution of the Eucharist', 'Adoration', 'Luke 22:14–20', 'luke', 22, 'He gives himself as food, holding nothing back. Thank him for the next time you receive him.'],
  ] },
  sorrowful: { name: 'Sorrowful', days: 'Tuesday & Friday', list: [
    ['The Agony in the Garden', 'Conformity to God’s will', 'Luke 22:39–46', 'luke', 22, '“Not my will but yours be done.” Bring him whatever you are dreading.'],
    ['The Scourging at the Pillar', 'Purity', 'John 19:1', 'john', 19, 'He suffers in his body for us. Offer up your own discipline and discomfort with his.'],
    ['The Crowning with Thorns', 'Moral courage', 'Matthew 27:27–31', 'matthew', 27, 'He is mocked as a king and stays silent. Ask for courage when following him costs you something.'],
    ['The Carrying of the Cross', 'Patience', 'Luke 23:26–32', 'luke', 23, 'Simon helps carry the Cross. Whose burden can you help carry, and who helps you carry yours?'],
    ['The Crucifixion', 'Perseverance', 'John 19:17–30', 'john', 19, '“It is finished.” Stay with him at the foot of the Cross, next to Mary and John.'],
  ] },
  glorious: { name: 'Glorious', days: 'Wednesday & Sunday', list: [
    ['The Resurrection', 'Faith', 'Matthew 28:1–10', 'matthew', 28, 'The tomb is empty. Let his victory change how you see what is dead or stuck in your life.'],
    ['The Ascension', 'Hope', 'Acts 1:6–11', 'acts', 1, 'He goes ahead of us to prepare a place. Lift your eyes to where you are headed.'],
    ['The Descent of the Holy Spirit', 'Wisdom and love of God', 'Acts 2:1–13', 'acts', 2, 'Fearful disciples become bold. Ask the Spirit for the gift you need most right now.'],
    ['The Assumption of Mary', 'Grace of a happy death', 'Revelation 12:1', 'revelation', 12, 'Mary is taken body and soul into heaven, a promise of what God intends for us too.'],
    ['The Coronation of Mary', 'Trust in Mary’s intercession', 'Revelation 12:1–6', 'revelation', 12, 'Mary is crowned Queen of Heaven and Earth. Entrust your intentions to her.'],
  ] },
};
const MYSTERY_BY_DAY = ['joyful', 'sorrowful', 'glorious', 'luminous', 'sorrowful', 'joyful', 'glorious'];
const NABRE = (book, ch) => `https://bible.usccb.org/bible/${book}/${ch}`;
const massReadingsUrl = (d = new Date()) => { const x = new Date(d); return `https://bible.usccb.org/bible/readings/${String(x.getMonth() + 1).padStart(2, '0')}${String(x.getDate()).padStart(2, '0')}${String(x.getFullYear()).slice(2)}.cfm`; };

/* ---------- Bible books (Catholic canon, NABRE) ---------- */
const BOOKS = [
  ['Genesis', 'genesis', 50], ['Exodus', 'exodus', 40], ['Leviticus', 'leviticus', 27], ['Numbers', 'numbers', 36], ['Deuteronomy', 'deuteronomy', 34],
  ['Joshua', 'joshua', 24], ['Judges', 'judges', 21], ['Ruth', 'ruth', 4], ['1 Samuel', '1samuel', 31], ['2 Samuel', '2samuel', 24],
  ['1 Kings', '1kings', 22], ['2 Kings', '2kings', 25], ['1 Chronicles', '1chronicles', 29], ['2 Chronicles', '2chronicles', 36], ['Ezra', 'ezra', 10],
  ['Nehemiah', 'nehemiah', 13], ['Tobit', 'tobit', 14], ['Judith', 'judith', 16], ['Esther', 'esther', 10], ['1 Maccabees', '1maccabees', 16],
  ['2 Maccabees', '2maccabees', 15], ['Job', 'job', 42], ['Psalms', 'psalms', 150], ['Proverbs', 'proverbs', 31], ['Ecclesiastes', 'ecclesiastes', 12],
  ['Song of Songs', 'songofsongs', 8], ['Wisdom', 'wisdom', 19], ['Sirach', 'sirach', 51], ['Isaiah', 'isaiah', 66], ['Jeremiah', 'jeremiah', 52],
  ['Lamentations', 'lamentations', 5], ['Baruch', 'baruch', 6], ['Ezekiel', 'ezekiel', 48], ['Daniel', 'daniel', 14], ['Hosea', 'hosea', 14],
  ['Joel', 'joel', 4], ['Amos', 'amos', 9], ['Obadiah', 'obadiah', 1], ['Jonah', 'jonah', 4], ['Micah', 'micah', 7], ['Nahum', 'nahum', 3],
  ['Habakkuk', 'habakkuk', 3], ['Zephaniah', 'zephaniah', 3], ['Haggai', 'haggai', 2], ['Zechariah', 'zechariah', 14], ['Malachi', 'malachi', 3],
  ['Matthew', 'matthew', 28], ['Mark', 'mark', 16], ['Luke', 'luke', 24], ['John', 'john', 21], ['Acts', 'acts', 28], ['Romans', 'romans', 16],
  ['1 Corinthians', '1corinthians', 16], ['2 Corinthians', '2corinthians', 13], ['Galatians', 'galatians', 6], ['Ephesians', 'ephesians', 6],
  ['Philippians', 'philippians', 4], ['Colossians', 'colossians', 4], ['1 Thessalonians', '1thessalonians', 5], ['2 Thessalonians', '2thessalonians', 3],
  ['1 Timothy', '1timothy', 6], ['2 Timothy', '2timothy', 4], ['Titus', 'titus', 3], ['Philemon', 'philemon', 1], ['Hebrews', 'hebrews', 13],
  ['James', 'james', 5], ['1 Peter', '1peter', 5], ['2 Peter', '2peter', 3], ['1 John', '1john', 5], ['2 John', '2john', 1], ['3 John', '3john', 1],
  ['Jude', 'jude', 1], ['Revelation', 'revelation', 22],
];
const chaptersOf = names => BOOKS.filter(b => names.includes(b[0])).flatMap(b => Array.from({ length: b[2] }, (_, i) => [b[0], b[1], i + 1]));
const NT_START = BOOKS.findIndex(b => b[0] === 'Matthew');
function split(list, days) { const out = Array.from({ length: days }, () => []); list.forEach((c, i) => out[Math.floor(i * days / list.length)].push(c)); return out; }
function zipDays(...streams) { const n = Math.max(...streams.map(s => s.length)); return Array.from({ length: n }, (_, i) => streams.flatMap(s => s[i] || [])); }
const PLANS = {
  gospel1: { name: 'A Gospel chapter a day', blurb: 'Matthew, Mark, Luke and John — one chapter at a time', build: () => split(chaptersOf(['Matthew', 'Mark', 'Luke', 'John']), 89) },
  gospels30: { name: 'The Gospels in 30 days', blurb: 'About 3 chapters a day', build: () => split(chaptersOf(['Matthew', 'Mark', 'Luke', 'John']), 30) },
  psprov: { name: 'Psalms & Proverbs in a month', blurb: '5 psalms and a chapter of Proverbs a day', build: () => zipDays(split(chaptersOf(['Psalms']), 30), split(chaptersOf(['Proverbs']), 31)) },
  nt90: { name: 'New Testament in 90 days', blurb: 'About 3 chapters a day', build: () => split(BOOKS.slice(NT_START).flatMap(b => Array.from({ length: b[2] }, (_, i) => [b[0], b[1], i + 1])), 90) },
  year: { name: 'The Bible in a year', blurb: 'Old Testament, New Testament and Psalms side by side, every day', build: () => {
    const ot = BOOKS.slice(0, NT_START).filter(b => !['Psalms', 'Proverbs'].includes(b[0])).flatMap(b => Array.from({ length: b[2] }, (_, i) => [b[0], b[1], i + 1]));
    const nt = BOOKS.slice(NT_START).flatMap(b => Array.from({ length: b[2] }, (_, i) => [b[0], b[1], i + 1]));
    return zipDays(split(ot, 365), split(nt, 365), split(chaptersOf(['Psalms', 'Proverbs']), 365));
  } },
};
const planCache = {};
const planDays = id => planCache[id] || (planCache[id] = PLANS[id].build());
// "Luke 4–6, Psalm 23" from a list of chapters
function readingLabel(chs) {
  const groups = [];
  chs.forEach(([b, s, c]) => { const g = groups[groups.length - 1]; if (g && g.b === b && g.to === c - 1) g.to = c; else groups.push({ b, s, from: c, to: c }); });
  return groups.map(g => (g.b === 'Psalms' ? (g.from === g.to ? 'Psalm' : 'Psalms') : g.b) + ' ' + (g.from === g.to ? g.from : g.from + '–' + g.to)).join(', ');
}

/* ---------- Liturgical year (Roman calendar, USA) ---------- */
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4, f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30, i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31), day = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(y, month - 1, day);
}
const LIT_COLOR = { violet: '#9b7bff', rose: '#f29bbf', white: '#f1eee6', red: '#ff6a5c', green: '#5fd28a' };
function liturgy(date = new Date()) {
  const d = new Date(date); d.setHours(0, 0, 0, 0);
  const y = d.getFullYear(), E = easter(y), same = (a, b) => dk(a) === dk(b), between = (a, b) => d >= a && d <= b;
  const xmas = new Date(y, 11, 25), adv1 = addDays(xmas, -(xmas.getDay() === 0 ? 28 : 21 + xmas.getDay()));
  // Epiphany: Sunday between Jan 2–8; Baptism of the Lord follows
  const jan2 = new Date(y, 0, 2), epiph = addDays(jan2, (7 - jan2.getDay()) % 7), bapt = epiph.getDate() >= 7 ? addDays(epiph, 1) : addDays(epiph, 7);
  const ash = addDays(E, -46), holyThu = addDays(E, -3), pent = addDays(E, 49);
  let season, color, week = null;
  if (d >= adv1) { season = 'Advent'; color = 'violet'; if (d >= xmas) { season = 'Christmas'; color = 'white'; } }
  else if (d <= bapt) { season = 'Christmas'; color = 'white'; }
  else if (between(ash, addDays(holyThu, -1))) { season = 'Lent'; color = 'violet'; }
  else if (between(holyThu, addDays(E, -1))) { season = 'Easter Triduum'; color = d.getDay() === 5 ? 'red' : 'white'; }
  else if (between(E, pent)) { season = 'Easter'; color = 'white'; }
  else { season = 'Ordinary Time'; color = 'green'; }
  if (season === 'Advent') week = Math.floor(dayDiff(adv1, d) / 7) + 1;
  if (season === 'Lent' && d >= addDays(ash, 4)) week = Math.floor(dayDiff(addDays(ash, 4), d) / 7) + 1;
  if (season === 'Easter') week = Math.floor(dayDiff(E, d) / 7) + 1;
  // feasts & special days
  const fixed = { '1-1': 'Mary, Mother of God', '2-2': 'The Presentation of the Lord', '3-19': 'St Joseph', '3-25': 'The Annunciation', '6-24': 'The Nativity of St John the Baptist', '6-29': 'Sts Peter & Paul', '8-6': 'The Transfiguration', '8-15': 'The Assumption of Mary', '9-14': 'The Exaltation of the Holy Cross', '11-1': 'All Saints', '11-2': 'All Souls', '12-8': 'The Immaculate Conception', '12-12': 'Our Lady of Guadalupe', '12-25': 'Christmas' };
  let feast = fixed[(d.getMonth() + 1) + '-' + d.getDate()] || null;
  const mov = [[ash, 'Ash Wednesday'], [addDays(E, -7), 'Palm Sunday'], [holyThu, 'Holy Thursday'], [addDays(E, -2), 'Good Friday'], [addDays(E, -1), 'Holy Saturday'], [E, 'Easter Sunday'],
    [addDays(E, 7), 'Divine Mercy Sunday'], [addDays(E, 42), 'The Ascension'], [pent, 'Pentecost'], [addDays(E, 56), 'The Most Holy Trinity'], [addDays(E, 63), 'Corpus Christi'],
    [addDays(E, 68), 'The Sacred Heart of Jesus'], [addDays(adv1, -7), 'Christ the King'], [epiph, 'The Epiphany'], [bapt, 'The Baptism of the Lord']];
  if (season === 'Lent' && week === 4 && d.getDay() === 0) feast = feast || 'Laetare Sunday';
  if (season === 'Advent' && week === 3 && d.getDay() === 0) feast = feast || 'Gaudete Sunday';
  mov.forEach(([x, n]) => { if (same(x, d)) feast = n; });
  if (feast === 'Laetare Sunday' || feast === 'Gaudete Sunday') color = 'rose';
  else if (['Palm Sunday', 'Good Friday', 'Pentecost', 'Sts Peter & Paul', 'The Exaltation of the Holy Cross'].includes(feast)) color = 'red';
  else if (feast === 'All Souls') color = 'violet';
  else if (feast && !['Ash Wednesday', 'Holy Saturday'].includes(feast)) color = 'white';
  // obligations & penance (USA)
  const md = (d.getMonth() + 1) + '-' + d.getDate(), dow = d.getDay();
  let note = null;
  if (['Ash Wednesday', 'Good Friday'].includes(feast)) note = 'Day of fasting and abstinence';
  else if (season === 'Lent' && dow === 5) note = 'Friday of Lent: abstain from meat';
  else if (dow === 5 && season !== 'Christmas' && !feast) note = 'Friday: a day of penance';
  const obligation = ['12-25', '12-8'].includes(md) || (['1-1', '8-15', '11-1'].includes(md) && dow !== 1 && dow !== 6);
  if (obligation && dow !== 0) note = 'Holy day of obligation (check your diocese)';
  return { season, color, hex: LIT_COLOR[color], week, feast, note, easterSeason: season === 'Easter' };
}

/* ---------- light & colour ---------- */
// Three colours of light per season / mystery — painted as soft, slowly drifting glows
function seasonPalette(L) {
  if (L.color === 'rose') return ['#f29bbf', '#f2c46d', '#8b6fd6'];
  if (L.color === 'red') return ['#ff5a4a', '#ffb347', '#c2185b'];
  if (L.season === 'Advent') return ['#6b4bd6', '#f0a64e', '#2b3fa8'];
  if (L.season === 'Lent') return ['#7a4fb8', '#3b2f7a', '#c79be0'];
  if (L.season === 'Easter Triduum') return ['#b4373f', '#5a2a6a', '#e7c27d'];
  if (L.color === 'white') return ['#f6ecd2', '#f2c46d', '#8fb7ff'];
  return ['#2fae7a', '#e7c27d', '#2a6fdb']; // Ordinary Time: green, gold, sky
}
const MYSTERY_PAL = {
  joyful: ['#ffb0a0', '#f6d27a', '#8fc7ff'],
  luminous: ['#ffe08a', '#4fb8f0', '#fff1c1'],
  sorrowful: ['#a02c40', '#5b2a7a', '#c0563f'],
  glorious: ['#f6d27a', '#fff6e0', '#6f8cff'],
};
const EXAMEN_PAL = ['#2b3f9f', '#e99b52', '#6a4bb3'];
const glowStyle = pal => `--g1:${pal[0]};--g2:${pal[1]};--g3:${pal[2]}`;
const glow = (pal, cls = '') => `<div class="glow ${cls}" style="${glowStyle(pal)}" aria-hidden="true"><i></i><b></b></div>`;
// A line to lift the heart, one per day
const SAYINGS = [
  ['You have made us for yourself, O Lord, and our heart is restless until it rests in you.', 'St Augustine'],
  ['The glory of God is man fully alive.', 'St Irenaeus'],
  ['Be who God meant you to be and you will set the world on fire.', 'St Catherine of Siena'],
  ['Let nothing disturb you, let nothing frighten you. All things pass; God never changes.', 'St Teresa of Ávila'],
  ['Late have I loved you, beauty so ancient and so new.', 'St Augustine'],
  ['Prayer is a surge of the heart, a simple look turned toward heaven.', 'St Thérèse of Lisieux'],
  ['Have patience with all things, but chiefly have patience with yourself.', 'St Francis de Sales'],
  ['Nothing is so strong as gentleness, nothing so gentle as real strength.', 'St Francis de Sales'],
  ['In all things, to love and to serve.', 'St Ignatius of Loyola'],
  ['To give, and not to count the cost.', 'St Ignatius of Loyola'],
  ['Pray, hope, and don’t worry.', 'St Pio of Pietrelcina'],
  ['Love God, serve God; everything is in that.', 'St Clare of Assisi'],
  ['Holiness consists simply in doing God’s will, and being just what God wants us to be.', 'St Thérèse of Lisieux'],
  ['All shall be well, and all shall be well, and all manner of thing shall be well.', 'Julian of Norwich'],
  ['Take courage; it is I. Do not be afraid.', 'Matthew 14:27'],
  ['The Rosary is the most beautiful and the most rich in graces of all prayers.', 'Pope St Pius X'],
  ['Trust the past to God’s mercy, the present to his love, and the future to his providence.', 'St Augustine'],
  ['Where there is no love, put love, and you will draw out love.', 'St John of the Cross'],
];
const saying = (d = new Date()) => SAYINGS[Math.floor((new Date(d) - new Date(new Date(d).getFullYear(), 0, 0)) / 864e5) % SAYINGS.length];

/* ---------- state ---------- */
const FAITH_DEFAULT_PRACTICES = [
  { id: 'offering', kind: 'prayer', prayer: 'offering', name: 'Morning Offering', when: 'morning', days: ALL_DAYS, on: true },
  { id: 'scripture', kind: 'scripture', name: 'Scripture', when: 'any', days: ALL_DAYS, on: true },
  { id: 'rosary', kind: 'rosary', name: 'Rosary', when: 'any', days: ALL_DAYS, on: true },
  { id: 'angelus', kind: 'prayer', prayer: 'angelus', name: 'Angelus', when: 'midday', days: ALL_DAYS, on: false },
  { id: 'examen', kind: 'examen', name: 'Examen', when: 'evening', days: ALL_DAYS, on: true },
  { id: 'mass', kind: 'mass', name: 'Sunday Mass', when: 'any', days: [6], on: true },
  { id: 'dailymass', kind: 'mass', name: 'Daily Mass', when: 'any', days: [0, 1, 2, 3, 4, 5], on: false },
  { id: 'confession', kind: 'confession', name: 'Confession', when: 'any', every: 30, on: true },
  { id: 'adoration', kind: 'custom', name: 'Adoration', when: 'any', every: 7, on: false },
  { id: 'friday', kind: 'custom', name: 'Friday penance', when: 'any', days: [4], on: true, sub: 'Offer up a small sacrifice' },
  { id: 'stmichael', kind: 'prayer', prayer: 'stmichael', name: 'St Michael Prayer', when: 'any', days: ALL_DAYS, on: false },
];
(function initFaith() {
  const f = S.faith = S.faith || {};
  f.practices = f.practices || clone(FAITH_DEFAULT_PRACTICES);
  f.log = f.log || {};           // { 'YYYY-MM-DD': { practiceId: true } }
  f.sessions = f.sessions || []; // guided sessions with duration
  f.journal = f.journal || {};   // Examen notes by date
  f.intentions = f.intentions || [];
  f.plan = f.plan || null;       // { id, start, done: [dayIndex] }
  f.opts = Object.assign({ showPrayers: false, examenAfterBed: true, offeringAfterWake: true, stMichaelAfterRosary: false }, f.opts || {});
})();
const F = () => S.faith;
const isDone = (pid, d = new Date()) => !!(F().log[dk(d)] || {})[pid];
function setDone(pid, on = true, d = new Date()) { const k = dk(d), L = F().log; L[k] = L[k] || {}; if (on) L[k][pid] = true; else delete L[k][pid]; save(); }
function lastDone(pid) { const ks = Object.keys(F().log).filter(k => F().log[k][pid]).sort(); return ks.length ? ks[ks.length - 1] : null; }
function practiceDue(p, d = new Date()) {
  if (!p.on) return false;
  if (p.every) { const last = lastDone(p.id); return isDone(p.id, d) || !last || dayDiff(last, d) >= p.every; }
  return (p.days || ALL_DAYS).includes(wd(d));
}
const WHEN_ORDER = { morning: 0, midday: 1, any: 2, evening: 3 };
const WHEN_LABEL = { morning: 'Morning', midday: 'Midday', any: 'Any time', evening: 'Evening' };
function todaysPractices(d = new Date()) { return F().practices.filter(p => practiceDue(p, d)).sort((a, b) => WHEN_ORDER[a.when] - WHEN_ORDER[b.when]); }
function faithDayCount(d) { return Object.keys(F().log[dk(d)] || {}).length; }
function todayMysteries(d = new Date()) { return MYSTERY_BY_DAY[wd(d)]; }
function practiceSub(p) {
  if (p.kind === 'rosary') return `The ${MYSTERIES[todayMysteries()].name} Mysteries`;
  if (p.kind === 'scripture') { const r = planToday(); return r ? `Day ${r.day + 1}: ${readingLabel(r.chs)}` : 'Choose a reading plan'; }
  if (p.kind === 'examen') return 'Five steps to review your day with God';
  if (p.kind === 'mass') return 'Today’s readings';
  if (p.kind === 'confession') { const l = lastDone(p.id); return l ? `Last time ${dayDiff(l, new Date())} days ago` : 'Mark it when you go'; }
  if (p.every) { const l = lastDone(p.id); return l ? `Every ${p.every} days, last ${dayDiff(l, new Date())} days ago` : `Every ${p.every} days`; }
  if (p.kind === 'prayer' && p.id === 'angelus' && liturgy().easterSeason) return 'Regina Caeli in Eastertide';
  return p.sub || '';
}
// next thing to do, by time of day
function nextPractice() {
  const h = new Date().getHours(), now_ = h < 11 ? 'morning' : h < 15 ? 'midday' : h < 19 ? 'any' : 'evening';
  const open = todaysPractices().filter(p => !isDone(p.id));
  const daily = open.filter(p => !p.every);
  return daily.find(p => p.when === now_) || daily.find(p => p.when === 'any') || (now_ !== 'morning' && daily.find(p => p.when === 'evening')) || daily[0] || open[0] || null;
}

/* ---------- reading plan ---------- */
function planToday() {
  const P = F().plan; if (!P || !PLANS[P.id]) return null;
  const days = planDays(P.id), day = days.findIndex((_, i) => !P.done.includes(i));
  if (day < 0) return { finished: true, day: days.length - 1, chs: [], total: days.length };
  return { day, chs: days[day], total: days.length, expected: Math.min(days.length - 1, dayDiff(P.start, new Date())) };
}

/* ---------- views ---------- */
const FAITH_CAT = 'faith';
function litPill(L) { return `<span class="litpill" style="--lc:${L.hex}"><i></i>${esc(L.season)}${L.week ? ', week ' + L.week : ''}</span>`; }
function practiceRow(p) {
  const done = isDone(p.id);
  const act = { rosary: 'Pray', examen: 'Begin', scripture: 'Read', mass: 'Readings', prayer: 'Pray', confession: 'Prayer' }[p.kind];
  return `<div class="prow ${done ? 'done' : ''}">
    <button class="pchk" data-act="fDone" data-p="${p.id}" aria-label="${done ? 'Mark not done' : 'Mark done'}: ${esc(p.name)}">${ICON.check}</button>
    <div class="grow" data-act="fOpen" data-p="${p.id}"><b>${esc(p.name)}</b><span>${esc(practiceSub(p))}</span></div>
    ${act && !done ? `<button class="btn sm" data-act="fOpen" data-p="${p.id}">${act}</button>` : ''}
  </div>`;
}
function faithTodayCard() {
  if (!F().practices.some(p => p.on)) return '';
  const L = liturgy(), ps = todaysPractices(), done = ps.filter(p => isDone(p.id)).length, nx = nextPractice();
  const y = F().journal[dk(addDays(new Date(), -1))];
  return `<a class="card faithcard" href="#/faith" style="--lc:${L.hex}">${glow(seasonPalette(L), 'soft')}
    <div class="row"><div class="grow">${litPill(L)}${L.feast ? `<div class="feast">${esc(L.feast)}</div>` : ''}</div><div class="fcount"><b>${done}</b>/${ps.length}</div></div>
    ${L.note ? `<div class="muted small" style="margin-top:6px">${esc(L.note)}</div>` : ''}
    ${y && y.resolution ? `<div class="resol">Yesterday you resolved: <b>${esc(y.resolution)}</b></div>` : ''}
    ${nx ? `<div class="row" style="margin-top:12px"><div class="grow"><div class="small muted">Next</div><b>${esc(nx.name)}</b><div class="small muted">${esc(practiceSub(nx))}</div></div><button class="btn sm fbtn" data-act="fOpen" data-p="${nx.id}">${{ rosary: 'Pray', examen: 'Begin', scripture: 'Read' }[nx.kind] || 'Open'}</button></div>` : `<div class="small" style="margin-top:10px">Everything for today is done. Thanks be to God.</div>`}
  </a>`;
}
VIEWS.faith = () => {
  setTop(`<h1>Faith</h1><a class="icon-btn" href="#/faithsetup" aria-label="Customise">${ICON.gear}</a>`);
  const L = liturgy(), ps = todaysPractices(), f = F();
  const groups = {}; ps.forEach(p => (groups[p.when] = groups[p.when] || []).push(p));
  const r = planToday();
  const mon = mondayOf(new Date());
  const week = Array.from({ length: 7 }, (_, i) => { const d = addDays(mon, i); return `<div class="${dk(d) === dk() ? 'today' : ''} ${d > new Date() && dk(d) !== dk() ? 'future' : ''}"><span>${'MTWTFSS'[i]}</span><b>${d.getDate()}</b><i>${faithDayCount(d) ? `<em style="background:var(--c-faith)"></em>` : ''}${(f.log[dk(d)] || {}).rosary ? `<em style="background:var(--lc)"></em>` : ''}</i></div>`; }).join('');
  const openInt = f.intentions.filter(x => !x.answered), answered = f.intentions.filter(x => x.answered);
  $('#view').innerHTML = `
    <div class="lithero" style="--lc:${L.hex}">
      ${glow(seasonPalette(L))}
      <div class="lit-in">
      ${litPill(L)}
      <div class="title" style="margin-top:10px">${esc(L.feast || new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' }))}</div>
      ${L.feast ? `<div class="muted small" style="margin-top:2px">${new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}</div>` : ''}
      ${L.note ? `<div class="muted small" style="margin-top:4px">${esc(L.note)}</div>` : ''}
      <blockquote class="saying">“${esc(saying()[0])}”<cite>${esc(saying()[1])}</cite></blockquote>
      <a class="btn sm glass" href="${massReadingsUrl()}" target="_blank" rel="noopener">Today’s Mass readings</a>
      </div>
    </div>
    <div class="h2 row"><span class="grow">Today</span><span class="small muted">${ps.filter(p => isDone(p.id)).length} of ${ps.length}</span></div>
    ${ps.length ? Object.keys(WHEN_LABEL).filter(w => groups[w]).map(w => `<div class="pgroup"><div class="eyebrow">${WHEN_LABEL[w]}</div><div class="plist">${groups[w].map(practiceRow).join('')}</div></div>`).join('') : `<div class="card muted small">Nothing scheduled today. <a href="#/faithsetup" style="text-decoration:underline">Choose your practices</a>.</div>`}
    <div class="card" style="margin-top:12px"><div class="eyebrow">This week</div><div class="wkstrip">${week}</div></div>

    <div class="h2">Scripture</div>
    ${r ? `<div class="card scard">
        <div class="row"><div class="grow"><div class="eyebrow">${esc(PLANS[f.plan.id].name)}</div>
          <div class="title" style="font-size:26px;margin-top:4px">${r.finished ? 'Plan complete' : esc(readingLabel(r.chs))}</div>
          <div class="muted small" style="margin-top:4px">${r.finished ? 'Well done. Pick another plan below.' : `Day ${r.day + 1} of ${r.total}${r.expected > r.day ? `, ${r.expected - r.day} behind the calendar, no rush` : ''}`}</div></div></div>
        <div class="bar" style="margin-top:12px"><i style="width:${(f.plan.done.length / r.total) * 100}%;background:var(--c-faith)"></i></div>
        ${r.finished ? '' : `<div class="chips" style="margin-top:12px">${r.chs.map(([b, s, c]) => `<a class="chip" href="${NABRE(s, c)}" target="_blank" rel="noopener">${esc(b === 'Psalms' ? 'Psalm' : b)} ${c}</a>`).join('')}</div>
        <div class="row" style="margin-top:12px"><button class="btn sm fbtn grow" data-act="fRead">${ICON.check} Mark day ${r.day + 1} read</button><button class="btn sm ghost" data-act="fPlanPick">Change plan</button></div>
        <div class="muted small" style="margin-top:8px">Opens the NABRE at bible.usccb.org. Before you read, pray: “Come, Holy Spirit.”</div>`}
        ${r.finished ? `<button class="btn sm ghost" style="margin-top:12px" data-act="fPlanPick">Choose a plan</button>` : ''}
      </div>` : `<div class="card"><div class="muted small">Pick a plan and read a little each day. Chapters open in the NABRE.</div><button class="btn sm pri" style="margin-top:10px" data-act="fPlanPick">Choose a reading plan</button></div>`}

    <div class="h2">Intentions</div>
    <div class="card">
      <div class="row"><input type="text" id="intentIn" placeholder="Pray for…" maxlength="120"><button class="btn sm pri" data-act="fIntAdd">Add</button></div>
      <div class="ilist">${openInt.map(x => `<div class="irow"><span class="grow">${esc(x.text)}<small>${dateTxt(x.date)}</small></span><button class="btn sm ghost" data-act="fIntAns" data-id="${x.id}">Answered</button><button class="icon-btn sm" data-act="fIntDel" data-id="${x.id}" aria-label="Remove">${ICON.trash}</button></div>`).join('') || '<div class="muted small" style="margin-top:10px">People and things you’re praying for. They appear when you pray the Rosary.</div>'}</div>
      ${answered.length ? `<details class="answered"><summary>${answered.length} answered</summary>${answered.map(x => `<div class="irow"><span class="grow">${esc(x.text)}<small>Answered ${dateTxt(x.answeredOn || x.date)}</small></span><button class="icon-btn sm" data-act="fIntDel" data-id="${x.id}" aria-label="Remove">${ICON.trash}</button></div>`).join('')}</details>` : ''}
    </div>

    <div class="h2">Prayers</div>
    <div class="plist">${PRAYER_LIST.map(k => `<button class="prow" data-act="fPrayer" data-k="${k}"><span class="grow"><b>${esc(PRAYERS[k][0])}</b></span></button>`).join('')}</div>

    ${Object.keys(f.journal).length ? `<div class="h2">Examen journal</div><div class="plist">${Object.keys(f.journal).sort().reverse().slice(0, 7).map(k => { const j = f.journal[k]; return `<div class="prow jrow"><div class="grow"><b>${dateTxt(k + 'T12:00')}</b>${j.gratitude ? `<span>Grateful for: ${esc(j.gratitude)}</span>` : ''}${j.resolution ? `<span>Resolved: ${esc(j.resolution)}</span>` : ''}</div></div>`; }).join('')}</div>` : ''}
  `;
};
VIEWS.faithsetup = () => {
  setTop(`<a class="icon-btn" href="#/faith" data-nav="back" aria-label="Back">${ICON.back}</a><h1>Your rule of life</h1>`);
  const f = F();
  $('#view').innerHTML = `
    <p class="muted small" style="margin-top:0">Choose the practices you want to keep. A short list you actually keep beats a long one.</p>
    <div class="plist">${f.practices.map(p => `<div class="prow setrow ${p.on ? '' : 'off'}">
      <button class="pchk ${p.on ? 'on' : ''}" data-act="fToggle" data-p="${p.id}" aria-label="${p.on ? 'Turn off' : 'Turn on'} ${esc(p.name)}">${ICON.check}</button>
      <div class="grow" data-act="fEdit" data-p="${p.id}"><b>${esc(p.name)}</b><span>${WHEN_LABEL[p.when]}, ${p.every ? `every ${p.every} days` : (p.days.length === 7 ? 'daily' : p.days.map(i => DAY_NAMES[i]).join(' '))}</span></div>
      <button class="icon-btn sm" data-act="fEdit" data-p="${p.id}" aria-label="Edit">${ICON.edit}</button></div>`).join('')}</div>
    <button class="btn ghost block" style="margin-top:12px" data-act="fAdd">${ICON.plus} Add a practice</button>
    <div class="h2">Options</div>
    <div class="plist">
      ${[['showPrayers', 'Show full prayer texts', 'Otherwise prayers are collapsed, tap to open'],
         ['examenAfterBed', 'Examen after evening mobility', 'Offer the Examen when Before Bed or Evening Unwind ends'],
         ['offeringAfterWake', 'Morning Offering after Wake-Up', 'Offer the Morning Offering when your morning routine ends'],
         ['stMichaelAfterRosary', 'St Michael Prayer after the Rosary', '']].map(([k, t, d]) => `<div class="prow"><button class="pchk ${f.opts[k] ? 'on' : ''}" data-act="fOpt" data-k="${k}" aria-label="${esc(t)}">${ICON.check}</button><div class="grow" data-act="fOpt" data-k="${k}"><b>${t}</b>${d ? `<span>${d}</span>` : ''}</div></div>`).join('')}
    </div>`;
};
function editPractice(pid) {
  const f = F(), p = pid ? f.practices.find(x => x.id === pid) : null;
  const d = p ? clone(p) : { id: 'c' + uid(), kind: 'custom', name: '', when: 'any', days: ALL_DAYS.slice(), on: true };
  FE = d;
  const render = () => openSheet(`<h3>${p ? 'Edit practice' : 'New practice'}</h3>
    <div class="field"><div class="lab">Name</div><input type="text" id="fpName" value="${esc(FE.name)}" placeholder="e.g. Divine Mercy Chaplet, Lectio Divina"></div>
    <div class="field"><div class="lab">When</div><div class="seg">${Object.entries(WHEN_LABEL).map(([k, l]) => `<button class="${FE.when === k ? 'on' : ''}" data-act="fpWhen" data-k="${k}">${l}</button>`).join('')}</div></div>
    <div class="field"><div class="lab">How often</div><div class="seg">${[['days', 'Certain days'], ['every', 'Every few days']].map(([k, l]) => `<button class="${(FE.every ? 'every' : 'days') === k ? 'on' : ''}" data-act="fpMode" data-k="${k}">${l}</button>`).join('')}</div>
      ${FE.every ? `<div class="row" style="margin-top:10px"><span class="grow">Every</span>${[7, 14, 30].map(n => `<button class="chip ${FE.every === n ? 'on' : ''}" data-act="fpEvery" data-n="${n}">${n} days</button>`).join('')}</div>`
        : `<div class="chips" style="margin-top:10px">${DAY_NAMES.map((n, i) => `<button class="chip ${FE.days.includes(i) ? 'on' : ''}" data-act="fpDay" data-i="${i}">${n}</button>`).join('')}</div>`}</div>
    <div class="row" style="margin-top:18px">${p && !FAITH_DEFAULT_PRACTICES.some(x => x.id === p.id) ? `<button class="btn ghost danger" data-act="fpDel">${ICON.trash}</button>` : ''}<button class="btn pri grow" data-act="fpSave">Save</button></div>`, true);
  FE.render = render; render();
}
let FE = null;

/* ---------- guided sessions: Rosary & Examen ---------- */
let GD = null;
// Missal-style: versicles/responses and cues in rubric red
function prayerHTML(t) {
  return esc(t).split('\n').map(l => l.replace(/^V\. /, '<span class="rub">V.</span> ').replace(/^R\. /, '<span class="rub">R.</span> ').replace(/^(Hail Mary…)$/, '<em class="rub">$1</em>')).join('<br>');
}
const ORN = '<div class="orn" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 3v18M7.5 8h9"/></svg></div>';
function prayerBlock(keys) {
  const show = F().opts.showPrayers;
  return `<div class="prayers">${keys.map(k => { const [key, times] = k.split('*'), P = PRAYERS[key]; return `<details ${show ? 'open' : ''}><summary>${esc(P[0])}${times ? ` <span class="times">×${times}</span>` : ''}</summary><p>${prayerHTML(P[1])}</p></details>`; }).join('')}</div>`;
}
function rosarySteps(set) {
  const M = MYSTERIES[set], f = F(), ints = f.intentions.filter(x => !x.answered);
  const ord = ['First', 'Second', 'Third', 'Fourth', 'Fifth'];
  const steps = [{ k: 'Begin', title: `The ${M.name} Mysteries`, html: `<p class="lead">Take your rosary. Settle, and make your intention.</p>
      ${ints.length ? `<div class="gints"><div class="eyebrow">Your intentions</div>${ints.map(x => `<div>• ${esc(x.text)}</div>`).join('')}</div>` : ''}
      <div class="rubric" style="margin:14px 0 8px">On the crucifix</div>${prayerBlock(['sign', 'creed'])}
      <div class="mpick">${Object.entries(MYSTERIES).map(([k, m]) => `<button class="chip ${k === set ? 'on' : ''}" data-act="gSet" data-k="${k}">${m.name}</button>`).join('')}</div>` },
    { k: 'Opening', title: 'Faith, hope and charity', html: `<p class="lead">For an increase of faith, hope and charity.</p><div class="rubric" style="margin:14px 0 8px">On the first large bead an Our Father; a Hail Mary on each of the three small beads; then the Glory Be.</div>${prayerBlock(['ourfather', 'hailmary*3', 'glorybe'])}` }];
  M.list.forEach((m, i) => steps.push({ k: `Decade ${i + 1}`, title: m[0], html: `
      <div class="decbeads" aria-label="Decade ${i + 1} of 5">${[0, 1, 2, 3, 4].map(j => `<i class="${j < i ? 'on' : j === i ? 'cur' : ''}"></i>`).join('')}</div>
      <div class="rubric" style="margin-top:4px">The ${ord[i]} ${M.name} Mystery</div>
      <p class="lead" style="margin-top:12px">${esc(m[5])}</p>
      <div class="fruit">Fruit of the mystery: <b>${esc(m[1])}</b></div>
      <a class="btn sm ghost" style="margin-top:12px" href="${NABRE(m[3], m[4])}" target="_blank" rel="noopener">Read ${esc(m[2])}</a>
      <div class="rubric" style="margin:18px 0 8px">Our Father on the large bead, a Hail Mary on each of the ten, then the Glory Be and the Fatima Prayer.</div>
      ${prayerBlock(['ourfather', 'hailmary*10', 'glorybe', 'fatima'])}` }));
  steps.push({ k: 'Closing', title: 'Hail, Holy Queen', html: `<p class="lead">Finish with the Hail, Holy Queen and the closing prayer${f.opts.stMichaelAfterRosary ? ', then the St Michael Prayer' : ''}.</p>${prayerBlock(['holyqueen', 'rosaryprayer', ...(f.opts.stMichaelAfterRosary ? ['stmichael'] : []), 'sign'])}` });
  return steps;
}
function examenSteps() {
  const j = F().journal[dk()] || {};
  const ta = (k, ph) => `<textarea class="gnote" data-jn="${k}" placeholder="${ph}">${esc(j[k] || '')}</textarea>`;
  return [
    { k: 'Step 1 of 5', title: 'Become aware of God’s presence', html: `<p class="lead">Be still. Slow your breathing. God is here, and he looks at you with love. Ask the Holy Spirit to help you see your day as he sees it.</p><div class="breathe"><i></i><span>Breathe slowly. Take your time.</span></div>` },
    { k: 'Step 2 of 5', title: 'Review the day with gratitude', html: `<p class="lead">Walk back through today from waking up. Notice the gifts, big and small: people, moments, things that went right. Thank God for them.</p>${ta('gratitude', 'Today I’m grateful for…')}` },
    { k: 'Step 3 of 5', title: 'Pay attention to your feelings', html: `<p class="lead">Where did you feel close to God today, with peace, joy or love? Where did you feel far from him, restless, anxious or closed off? Don’t judge it, just notice.</p>${ta('consolation', 'Closer to God when…')}${ta('desolation', 'Further from God when…')}` },
    { k: 'Step 4 of 5', title: 'Choose one moment and pray from it', html: `<p class="lead">Pick one moment from today, good or hard, and talk to God about it. Give thanks, ask for healing, and where you fell short, ask for forgiveness.</p>${prayerBlock(['contrition'])}` },
    { k: 'Step 5 of 5', title: 'Look toward tomorrow', html: `<p class="lead">What’s coming tomorrow? Ask for the grace you’ll need. Choose one small, concrete resolution.</p>${ta('resolution', 'Tomorrow I will…')}<div class="muted small" style="margin-top:8px">You’ll see this on Today tomorrow morning.</div>` },
    { k: 'Close', title: 'Close in prayer', html: `<p class="lead">Rest a moment, then close with the Our Father.</p>${prayerBlock(['ourfather', 'glorybe'])}` },
  ];
}
function openGuide(kind, opts = {}) {
  const set = opts.set || todayMysteries();
  GD = { kind, set, i: 0, start: now(), steps: kind === 'rosary' ? rosarySteps(set) : examenSteps() };
  showOverlay('guide'); renderGuide();
}
function renderGuide() {
  const o = $('#overlay'), s = GD.steps[GD.i], last = GD.i === GD.steps.length - 1, L = liturgy();
  const title = GD.kind === 'rosary' ? 'The Rosary' : 'The Examen';
  o.innerHTML = `${glow(GD.kind === 'rosary' ? MYSTERY_PAL[GD.set] : EXAMEN_PAL, 'fixed')}<div class="ov-in guide" style="--lc:${L.hex}">
    <div class="ov-top"><button class="icon-btn" data-act="gClose" aria-label="Close">${ICON.close}</button><div class="t"><b>${title}</b><span>${esc(s.k)}${GD.kind === 'rosary' ? ' · ' + esc(MYSTERIES[GD.set].name) : ''}</span></div></div>
    <div class="progress-dots">${GD.steps.map((_, i) => `<i class="${i < GD.i ? 'on' : i === GD.i ? 'cur' : ''}" style="--c:var(--c-faith)"></i>`).join('')}</div>
    <div class="ov-body">
      <h2 class="gtitle">${esc(s.title)}</h2>
      ${s.html}
    </div>
    <div class="player-nav"><button class="btn" data-act="gNav" data-d="-1" ${GD.i === 0 ? 'disabled style="opacity:.4"' : ''}>Back</button>
      <button class="btn pri" data-act="${last ? 'gFinish' : 'gNav'}" data-d="1">${last ? 'Amen, finish' : 'Next'}</button></div>
  </div>`;
  o.scrollTop = 0;
}
function finishGuide() {
  const dur = Math.round((now() - GD.start) / 1000), kind = GD.kind;
  F().sessions.push({ date: new Date().toISOString(), kind, title: kind === 'rosary' ? `Rosary, ${MYSTERIES[GD.set].name} Mysteries` : 'Examen', dur });
  setDone(kind === 'rosary' ? 'rosary' : 'examen');
  GD = null; hideOverlay();
  toast(kind === 'rosary' ? 'Rosary prayed. Thanks be to God.' : 'Examen done. Good night.');
}
function prayerSheet(key, pid) {
  const P = PRAYERS[key];
  openSheet(`<div class="psheet">${glow(seasonPalette(liturgy()), 'band')}<h3>${esc(P[0])}</h3><p class="ptext">${prayerHTML(P[1])}</p></div>
    ${pid ? `<button class="btn pri block" style="margin-top:16px" data-act="fMark" data-p="${pid}">${ICON.check} Prayed</button>` : ''}`);
}
function planPicker() {
  openSheet(`<h3>Reading plans</h3><div class="muted small">Read a little each day. If you miss a day, you just pick up where you left off.</div>
    <div class="plist" style="margin-top:12px">${Object.entries(PLANS).map(([k, p]) => `<button class="prow" data-act="fPlanSet" data-k="${k}"><span class="grow"><b>${esc(p.name)}</b><span>${esc(p.blurb)}, ${planDays(k).length} days</span></span></button>`).join('')}</div>`);
}

/* ---------- actions ---------- */
function openPractice(p) {
  if (p.kind === 'rosary') return openGuide('rosary');
  if (p.kind === 'examen') return openGuide('examen');
  if (p.kind === 'scripture') { if (!F().plan) return planPicker(); go('#/faith'); setTimeout(() => { const c = $('.scard'); if (c) c.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 120); return; }
  if (p.kind === 'prayer') return prayerSheet(p.id === 'angelus' && liturgy().easterSeason ? 'reginacaeli' : p.prayer, p.id);
  if (p.kind === 'mass') { window.open(massReadingsUrl(), '_blank', 'noopener'); return; }
  if (p.kind === 'confession') return prayerSheet('contrition', p.id);
  setDone(p.id, !isDone(p.id)); refresh();
}
const findP = id => F().practices.find(p => p.id === id);
Object.assign(ACT, {
  fDone: el => { const id = el.dataset.p; setDone(id, !isDone(id)); if (isDone(id)) buzz(20); refresh(); },
  fOpen: el => { const p = findP(el.dataset.p); if (p) openPractice(p); },
  fMark: el => { setDone(el.dataset.p, true); dismissSheet(); refresh(); toast('Amen'); },
  fPrayer: el => prayerSheet(el.dataset.k),
  fRead: () => { const P = F().plan, r = planToday(); if (!P || !r || r.finished) return; P.done.push(r.day); setDone('scripture'); save(); refresh(); toast(`Day ${r.day + 1} read`); },
  fPlanPick: () => planPicker(),
  fPlanSet: el => { F().plan = { id: el.dataset.k, start: dk(), done: [] }; save(); dismissSheet(); refresh(); },
  fIntAdd: () => { const i = $('#intentIn'); const t = i && i.value.trim(); if (!t) return; F().intentions.unshift({ id: uid(), text: t, date: new Date().toISOString() }); save(); rerender(); },
  fIntAns: el => { const x = F().intentions.find(y => y.id === el.dataset.id); if (x) { x.answered = true; x.answeredOn = new Date().toISOString(); save(); rerender(); toast('Thanks be to God'); } },
  fIntDel: el => { F().intentions = F().intentions.filter(y => y.id !== el.dataset.id); save(); rerender(); },
  fToggle: el => { const p = findP(el.dataset.p); p.on = !p.on; save(); rerender(); },
  fOpt: el => { const k = el.dataset.k; F().opts[k] = !F().opts[k]; save(); rerender(); },
  fEdit: el => editPractice(el.dataset.p),
  fAdd: () => editPractice(null),
  fpWhen: el => { FE.name = ($('#fpName') || {}).value || FE.name; FE.when = el.dataset.k; FE.render(); },
  fpMode: el => { FE.name = ($('#fpName') || {}).value || FE.name; if (el.dataset.k === 'every') { FE.every = FE.every || 7; } else { delete FE.every; FE.days = FE.days && FE.days.length ? FE.days : ALL_DAYS.slice(); } FE.render(); },
  fpEvery: el => { FE.name = ($('#fpName') || {}).value || FE.name; FE.every = +el.dataset.n; FE.render(); },
  fpDay: el => { FE.name = ($('#fpName') || {}).value || FE.name; const i = +el.dataset.i; FE.days = FE.days.includes(i) ? FE.days.filter(x => x !== i) : [...FE.days, i].sort(); FE.render(); },
  fpSave: () => {
    const name = ($('#fpName') || {}).value.trim(); if (!name) { toast('Give it a name'); return; }
    const d = Object.assign({}, FE, { name }); delete d.render; if (!d.every && (!d.days || !d.days.length)) { toast('Pick at least one day'); return; }
    if (d.every) delete d.days;
    const ps = F().practices, i = ps.findIndex(x => x.id === d.id);
    if (i >= 0) ps[i] = d; else ps.push(d);
    save(); FE = null; dismissSheet(); rerender();
  },
  fpDel: () => { F().practices = F().practices.filter(x => x.id !== FE.id); save(); FE = null; dismissSheet(); rerender(); },
  gNav: el => { const d = +el.dataset.d; GD.i = clamp(GD.i + d, 0, GD.steps.length - 1); renderGuide(); },
  gSet: el => { GD.set = el.dataset.k; GD.steps = rosarySteps(GD.set); renderGuide(); },
  gFinish: () => finishGuide(),
  gClose: () => { const g = GD; GD = null; hideOverlay(); if (g && g.i > 0) toast('Paused. Pick it up any time.'); },
  goExamen: () => { ACT.runClose(); setTimeout(() => openGuide('examen'), 60); },
  goOffering: () => { ACT.runClose(); setTimeout(() => prayerSheet('offering', 'offering'), 60); },
});
// Examen notes save as you type
document.addEventListener('input', e => {
  const t = e.target;
  if (t.dataset && t.dataset.jn) { const k = dk(), J = F().journal; J[k] = J[k] || {}; J[k][t.dataset.jn] = t.value; save(); }
});
document.addEventListener('keydown', e => { if (e.key === 'Enter' && e.target.id === 'intentIn') ACT.fIntAdd(); });
