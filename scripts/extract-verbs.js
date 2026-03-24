const fs = require('fs');
const src = { source: 'מאגר', sourceName: 'רויטל חנוקוב ומרכז המורשת' };
const base = { term: '', russian: '', english: '', definition: '', pronunciationGuide: '', dialect: '', ...src, partOfSpeech: 'verb' };

const entries = [
  // infinitive
  { latin: 'omore', hebrew: 'לבוא' },
  { latin: 'ovurde', hebrew: 'להביא' },
  { latin: 'rafta', hebrew: 'ללכת' },

  // ציווי - omore
  { latin: 'biyo', hebrew: 'בוא! (יחיד)' },
  { latin: 'niyo', hebrew: 'בוא! (יחיד, שלילה)' },
  { latin: 'biyote', hebrew: 'בואו! (רבים)' },
  { latin: 'nilyoit', hebrew: 'בואו! (רבים, שלילה)' },
  // ציווי - ovurde
  { latin: 'bior', hebrew: 'תביא! (יחיד)' },
  { latin: 'nayor', hebrew: 'תביא! (יחיד, שלילה)' },
  { latin: 'biyorite', hebrew: 'תביאו! (רבים)' },
  { latin: 'neyorit', hebrew: 'תביאו! (רבים, שלילה)' },
  // ציווי - raft
  { latin: 'bura', hebrew: 'לך! (יחיד)' },
  { latin: 'nara', hebrew: 'לך! (יחיד, שלילה)' },
  { latin: 'burait', hebrew: 'לכו! (רבים)' },
  { latin: 'narite', hebrew: 'לכו! (רבים, שלילה)' },

  // עבר פשוט - omore
  { latin: 'me omorum', hebrew: 'אני באתי' },
  { latin: 'tu omori', hebrew: 'אתה באת' },
  { latin: 'u omo', hebrew: 'הוא בא' },
  { latin: 'imu omorim', hebrew: 'אנחנו באנו' },
  { latin: 'ishmu omorit', hebrew: 'אתם באתם' },
  { latin: 'uho Omorut', hebrew: 'הם באו' },
  // עבר פשוט - ovurde
  { latin: 'me ovurdum', hebrew: 'אני הבאתי' },
  { latin: 'tu ovurdi', hebrew: 'אתה הבאת' },
  { latin: 'u ovurd', hebrew: 'הוא הביא' },
  { latin: 'imu ovurdim', hebrew: 'אנחנו הבאנו' },
  { latin: 'ishmu ovurdit', hebrew: 'אתם הבאתם' },
  { latin: 'uho ovurdut', hebrew: 'הם הביאו' },
  // עבר פשוט - raft
  { latin: 'me raftum', hebrew: 'אני הלכתי' },
  { latin: 'tu rafty', hebrew: 'אתה הלכת' },
  { latin: 'u raft', hebrew: 'הוא הלך' },
  { latin: 'imu raftim', hebrew: 'אנחנו הלכנו' },
  { latin: 'ishmu raftite', hebrew: 'אתם הלכתם' },
  { latin: 'uho raftut', hebrew: 'הם הלכו' },

  // הווה - omore
  { latin: 'me biom', hebrew: 'אני בא' },
  { latin: 'tu biyoy', hebrew: 'אתה בא' },
  { latin: 'u biyov', hebrew: 'הוא בא' },
  { latin: 'imu bioyim', hebrew: 'אנחנו באים' },
  { latin: 'ishmu biyote', hebrew: 'אתם באים' },
  { latin: 'uho biovt', hebrew: 'הם באים' },
  // הווה - ovurde
  { latin: 'me biorum', hebrew: 'אני מביא' },
  { latin: 'tu biyor', hebrew: 'אתה מביא' },
  { latin: 'u Biyoru', hebrew: 'הוא מביא' },
  { latin: 'imu biyorim', hebrew: 'אנחנו מביאים' },
  { latin: 'ishmu biyorite', hebrew: 'אתם מביאים' },
  { latin: 'uho biorut', hebrew: 'הם מביאים' },
  // הווה - raft
  { latin: 'me rafte', hebrew: 'אני הולך' },
  { latin: 'tu rafte', hebrew: 'אתה הולך' },
  { latin: 'u burav', hebrew: 'הוא הולך' },
  { latin: 'imu Buraim', hebrew: 'אנחנו הולכים' },
  { latin: 'ishmu biright', hebrew: 'אתם הולכים' },
  { latin: 'uho boreavt', hebrew: 'הם הולכים' },

  // הווה eday - omore
  { latin: 'me Edem omore', hebrew: 'אני בא' },
  { latin: 'tu Edye omore', hebrew: 'אתה בא' },
  { latin: 'u Ede omore', hebrew: 'הוא בא' },
  { latin: 'imu Edeim omore', hebrew: 'אנחנו באים' },
  { latin: 'ishmu Edeit omore', hebrew: 'אתם באים' },
  { latin: 'uho Edet omore', hebrew: 'הם באים' },
  // הווה eday - ovurde
  { latin: 'me Edem ovurde', hebrew: 'אני מביא' },
  { latin: 'tu Edye ovurde', hebrew: 'אתה מביא' },
  { latin: 'u Ede ovurde', hebrew: 'הוא מביא' },
  { latin: 'imu Edeim ovurde', hebrew: 'אנחנו מביאים' },
  { latin: 'ishmu Edeit ovurde', hebrew: 'אתם מביאים' },
  { latin: 'uho Edet ovurde', hebrew: 'הם מביאים' },
  // הווה eday - raft
  { latin: 'me Edem rafte', hebrew: 'אני הולך' },
  { latin: 'tu Edye rafte', hebrew: 'אתה הולך' },
  { latin: 'u Ede rafte', hebrew: 'הוא הולך' },
  { latin: 'imu Edeim rafte', hebrew: 'אנחנו הולכים' },
  { latin: 'ishmu Edeit rafte', hebrew: 'אתם הולכים' },
  { latin: 'uho Edet rafte', hebrew: 'הם הולכים' },

  // עתיד - omore
  { latin: 'me miyom', hebrew: 'אני אבוא' },
  { latin: 'tu miyoi', hebrew: 'אתה תבוא' },
  { latin: 'u miiov', hebrew: 'הוא יבוא' },
  { latin: 'imu mioyim', hebrew: 'אנחנו נבוא' },
  { latin: 'ishmu miuit', hebrew: 'אתם תבואו' },
  { latin: 'uho miovt', hebrew: 'הם יבואו' },
  // עתיד - ovurde
  { latin: 'me myorum', hebrew: 'אני אביא' },
  { latin: 'tu miyori', hebrew: 'אתה תביא' },
  { latin: 'u miyoru', hebrew: 'הוא יביא' },
  { latin: 'imu miyorim', hebrew: 'אנחנו נביא' },
  { latin: 'ishmu myorite', hebrew: 'אתם תביאו' },
  { latin: 'uho miyoru', hebrew: 'הם יביאו' },
  // עתיד - raft
  { latin: 'me miram', hebrew: 'אני אלך' },
  { latin: 'tu mirai', hebrew: 'אתה תלך' },
  { latin: 'u mirav', hebrew: 'הוא ילך' },
  { latin: 'imu miraim', hebrew: 'אנחנו נלך' },
  { latin: 'ishmu miraite', hebrew: 'אתם תלכו' },
  { latin: 'uho mirav', hebrew: 'הם ילכו' },

  // עבר מרוחק - omore
  { latin: 'me omore birum', hebrew: 'אני באתי (עבר מרוחק)' },
  { latin: 'tu omore biri', hebrew: 'אתה באת (עבר מרוחק)' },
  { latin: 'u omore boo', hebrew: 'הוא בא (עבר מרוחק)' },
  { latin: 'imu omore birim', hebrew: 'אנחנו באנו (עבר מרוחק)' },
  { latin: 'ishmu omore birit', hebrew: 'אתם באתם (עבר מרוחק)' },
  { latin: 'uho Omore Birut', hebrew: 'הם באו (עבר מרוחק)' },
  // עבר מרוחק - ovurde
  { latin: 'me ovurde birum', hebrew: 'אני הבאתי (עבר מרוחק)' },
  { latin: 'tu ovurde biri', hebrew: 'אתה הבאת (עבר מרוחק)' },
  { latin: 'u ovurde boo', hebrew: 'הוא הביא (עבר מרוחק)' },
  { latin: 'imu ovurde birim', hebrew: 'אנחנו הבאנו (עבר מרוחק)' },
  { latin: 'ishmu ovurde birit', hebrew: 'אתם הבאתם (עבר מרוחק)' },
  { latin: 'uho ovurde birut', hebrew: 'הם הביאו (עבר מרוחק)' },
  // עבר מרוחק - raft
  { latin: 'me rafte birum', hebrew: 'אני הלכתי (עבר מרוחק)' },
  { latin: 'tu raft biri', hebrew: 'אתה הלכת (עבר מרוחק)' },
  { latin: 'u raft boo', hebrew: 'הוא הלך (עבר מרוחק)' },
  { latin: 'imu raft birim', hebrew: 'אנחנו הלכנו (עבר מרוחק)' },
  { latin: 'ishmu rafte birit', hebrew: 'אתם הלכתם (עבר מרוחק)' },
  { latin: 'uho rafte birut', hebrew: 'הם הלכו (עבר מרוחק)' },

  // עבר (הייתי צריך) - omore
  { latin: 'me omoreni birum', hebrew: 'אני הייתי צריך לבוא' },
  { latin: 'tu omoreni biri', hebrew: 'אתה היית צריך לבוא' },
  { latin: 'u omoreni boo', hebrew: 'הוא היה צריך לבוא' },
  { latin: 'imu Omoreni Birim', hebrew: 'אנחנו היינו צריכים לבוא' },
  { latin: 'ishmu Omoreni Birit', hebrew: 'אתם הייתם צריכים לבוא' },
  { latin: 'uho Omoreni Birut', hebrew: 'הם היו צריכים לבוא' },
  // עבר (הייתי צריך) - ovurde
  { latin: 'me ovurdeni birum', hebrew: 'אני הייתי צריך להביא' },
  { latin: 'tu ovurdeni biri', hebrew: 'אתה היית צריך להביא' },
  { latin: 'u ovurdeni bu', hebrew: 'הוא היה צריך להביא' },
  { latin: 'imu ovurdeni birim', hebrew: 'אנחנו היינו צריכים להביא' },
  { latin: 'ishmu ovurdeni birit', hebrew: 'אתם הייתם צריכים להביא' },
  { latin: 'uho ovurdeni birut', hebrew: 'הם היו צריכים להביא' },
  // עבר (הייתי צריך) - raft
  { latin: 'me raftany birum', hebrew: 'אני הייתי צריך ללכת' },
  { latin: 'tu raftani biri', hebrew: 'אתה היית צריך ללכת' },
  { latin: 'u raftany boo', hebrew: 'הוא היה צריך ללכת' },
  { latin: 'imu raftani birim', hebrew: 'אנחנו היינו צריכים ללכת' },
  { latin: 'ishmu raftani birit', hebrew: 'אתם הייתם צריכים ללכת' },
  { latin: 'uho raftany birut', hebrew: 'הם היו צריכים ללכת' },
].map(e => ({ ...base, ...e }));

// מילים נוספות
entries.push({ ...base, latin: 'di', hebrew: 'אתמול', partOfSpeech: 'adv' });
entries.push({ ...base, latin: 'imburuz', hebrew: 'היום', partOfSpeech: 'adv' });
entries.push({ ...base, latin: 'sebaxh', hebrew: 'מחר', partOfSpeech: 'adv' });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = {
  timestamp: new Date().toISOString(),
  source_files: ['פעלים.pdf'],
  ...src,
  total_entries: entries.length,
  entries,
};

const outPath = `data/processed/dictionary-verbs-conjugation-${timestamp}.json`;
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
console.log(`${entries.length} entries saved to ${outPath}`);
