const fs = require('fs');
const src = { source: 'מאגר', sourceName: 'רויטל חנוקוב ומרכז המורשת' };
const base = { term: '', russian: '', english: '', definition: '', pronunciationGuide: '', dialect: '', ...src, partOfSpeech: 'verb' };

const entries = [
  // infinitive
  { latin: 'dora', hebrew: 'לתת' },
  { latin: 'dira', hebrew: 'לראות' },
  { latin: 'nora', hebrew: 'להניח' },

  // ציווי - dora
  { latin: 'di', hebrew: 'תביא! (יחיד)' },
  { latin: 'mady', hebrew: 'תביא! (יחיד, שלילה)' },
  { latin: 'dit', hebrew: 'תביאו! (רבים)' },
  { latin: 'madit', hebrew: 'תביאו! (רבים, שלילה)' },
  // ציווי - dira
  { latin: 'Danish', hebrew: 'תראה! (יחיד)' },
  { latin: 'medanish', hebrew: 'תראה! (יחיד, שלילה)' },
  { latin: 'denishit', hebrew: 'תראו! (רבים)' },
  { latin: 'madenishit', hebrew: 'תראו! (רבים, שלילה)' },
  // ציווי - nora
  { latin: 'bini', hebrew: 'תניח! (יחיד)' },
  { latin: 'meni', hebrew: 'תניח! (יחיד, שלילה)' },
  { latin: 'binit', hebrew: 'תניחו! (רבים)' },
  { latin: 'manit', hebrew: 'תניחו! (רבים, שלילה)' },

  // עבר פשוט - dora
  { latin: 'me dorum', hebrew: 'אני נתתי' },
  { latin: 'tu dory', hebrew: 'אתה נתת' },
  { latin: 'u do', hebrew: 'הוא נתן' },
  { latin: 'imu dorim', hebrew: 'אנחנו נתנו' },
  { latin: 'ishmu dorit', hebrew: 'אתם נתתם' },
  { latin: 'uho Dorut', hebrew: 'הם נתנו' },
  // עבר פשוט - dira
  { latin: 'me dirum', hebrew: 'אני ראיתי' },
  { latin: 'tu diri', hebrew: 'אתה ראית' },
  { latin: 'u diri', hebrew: 'הוא ראה' },
  { latin: 'imu dirim', hebrew: 'אנחנו ראינו' },
  { latin: 'ishmu dirite', hebrew: 'אתם ראיתם' },
  { latin: 'uho dirut', hebrew: 'הם ראו' },
  // עבר פשוט - nora
  { latin: 'me norum', hebrew: 'אני הנחתי' },
  { latin: 'tu nori', hebrew: 'אתה הנחת' },
  { latin: 'u no', hebrew: 'הוא הניח' },
  { latin: 'imu norim', hebrew: 'אנחנו הנחנו' },
  { latin: 'ishmu norite', hebrew: 'אתם הנחתם' },
  { latin: 'uho norut', hebrew: 'הם הניחו' },

  // הווה - dora
  { latin: 'me dum', hebrew: 'אני נותן' },
  { latin: 'tu di', hebrew: 'אתה נותן' },
  { latin: 'u du', hebrew: 'הוא נותן' },
  { latin: 'imu dim', hebrew: 'אנחנו נותנים' },
  { latin: 'ishmu dit', hebrew: 'אתם נותנים' },
  // הווה - dira
  { latin: 'me winum', hebrew: 'אני רואה' },
  { latin: 'tu denish', hebrew: 'אתה רואה' },
  { latin: 'u vinu', hebrew: 'הוא רואה' },
  { latin: 'imu vinim', hebrew: 'אנחנו רואים' },
  { latin: 'ishmu vinishit', hebrew: 'אתם רואים' },
  // הווה - nora
  { latin: 'me Bunum', hebrew: 'אני מניח' },
  { latin: 'tu bini', hebrew: 'אתה מניח' },
  { latin: 'u bunu', hebrew: 'הוא מניח' },
  { latin: 'imu binnim', hebrew: 'אנחנו מניחים' },
  { latin: 'ishmu binit', hebrew: 'אתם מניחים' },

  // הווה eday - dora
  { latin: 'me Edem dora', hebrew: 'אני נותן' },
  { latin: 'tu Edye dora', hebrew: 'אתה נותן' },
  { latin: 'u Ede dora', hebrew: 'הוא נותן' },
  { latin: 'imu Edeim dora', hebrew: 'אנחנו נותנים' },
  { latin: 'ishmu Edeit dora', hebrew: 'אתם נותנים' },
  { latin: 'uho Edet dora', hebrew: 'הם נותנים' },
  // הווה eday - dira
  { latin: 'me Edem dira', hebrew: 'אני רואה' },
  { latin: 'tu Edye dira', hebrew: 'אתה רואה' },
  { latin: 'u Ede dira', hebrew: 'הוא רואה' },
  { latin: 'imu Edeim dira', hebrew: 'אנחנו רואים' },
  { latin: 'ishmu Edeit dira', hebrew: 'אתם רואים' },
  { latin: 'uho Edet dira', hebrew: 'הם רואים' },
  // הווה eday - nora
  { latin: 'me Edem nora', hebrew: 'אני מניח' },
  { latin: 'tu Edye nora', hebrew: 'אתה מניח' },
  { latin: 'u Ede nora', hebrew: 'הוא מניח' },
  { latin: 'imu Edeim nora', hebrew: 'אנחנו מניחים' },
  { latin: 'ishmu Edeit nora', hebrew: 'אתם מניחים' },
  { latin: 'uho Edet nora', hebrew: 'הם מניחים' },

  // עתיד - dora
  { latin: 'me midum', hebrew: 'אני אתן' },
  { latin: 'tu midi', hebrew: 'אתה תתן' },
  { latin: 'u midu', hebrew: 'הוא יתן' },
  { latin: 'imu midim', hebrew: 'אנחנו נתן' },
  { latin: 'ishmu midit', hebrew: 'אתם תתנו' },
  { latin: 'uho midut', hebrew: 'הם יתנו' },
  // עתיד - dira
  { latin: 'me Miunum', hebrew: 'אני אראה' },
  { latin: 'tu Miyni', hebrew: 'אתה תראה' },
  { latin: 'u Muinu', hebrew: 'הוא יראה' },
  { latin: 'imu Miynim', hebrew: 'אנחנו נראה' },
  { latin: 'ishmu Miynit', hebrew: 'אתם תראו' },
  { latin: 'uho Miunu', hebrew: 'הם יראו' },
  // עתיד - dira (שלילה)
  { latin: 'me mivinum', hebrew: 'אני אראה (שלילה)' },
  { latin: 'tu mivini', hebrew: 'אתה תראה (שלילה)' },
  { latin: 'u mivinu', hebrew: 'הוא יראה (שלילה)' },
  { latin: 'imu mivinim', hebrew: 'אנחנו נראה (שלילה)' },
  { latin: 'ishmu mivinite', hebrew: 'אתם תראו (שלילה)' },
  { latin: 'uho mivinu', hebrew: 'הם יראו (שלילה)' },
  // עתיד - nora
  { latin: 'me minum', hebrew: 'אני אניח' },
  { latin: 'tu mini', hebrew: 'אתה תניח' },
  { latin: 'u munu', hebrew: 'הוא יניח' },
  { latin: 'imu minim', hebrew: 'אנחנו נניח' },
  { latin: 'ishmu minit', hebrew: 'אתם תניחו' },
  { latin: 'uho minut', hebrew: 'הם יניחו' },

  // עבר מרוחק - dora
  { latin: 'me dora birum', hebrew: 'אני נתתי (עבר מרוחק)' },
  { latin: 'tu dora beery', hebrew: 'אתה נתת (עבר מרוחק)' },
  { latin: 'u dora boo', hebrew: 'הוא נתן (עבר מרוחק)' },
  { latin: 'imu dora birim', hebrew: 'אנחנו נתנו (עבר מרוחק)' },
  { latin: 'ishmu dora birit', hebrew: 'אתם נתתם (עבר מרוחק)' },
  { latin: 'uho dora birut', hebrew: 'הם נתנו (עבר מרוחק)' },
  // עבר מרוחק - dira
  { latin: 'me dire birum', hebrew: 'אני ראיתי (עבר מרוחק)' },
  { latin: 'tu dire biri', hebrew: 'אתה ראית (עבר מרוחק)' },
  { latin: 'u dire boo', hebrew: 'הוא ראה (עבר מרוחק)' },
  { latin: 'imu dire birim', hebrew: 'אנחנו ראינו (עבר מרוחק)' },
  { latin: 'ishmu dire birit', hebrew: 'אתם ראיתם (עבר מרוחק)' },
  { latin: 'uho dire birut', hebrew: 'הם ראו (עבר מרוחק)' },
  // עבר מרוחק - nora
  { latin: 'me nore birum', hebrew: 'אני הנחתי (עבר מרוחק)' },
  { latin: 'tu nore biri', hebrew: 'אתה הנחת (עבר מרוחק)' },
  { latin: 'u nore boo', hebrew: 'הוא הניח (עבר מרוחק)' },
  { latin: 'imu nore birim', hebrew: 'אנחנו הנחנו (עבר מרוחק)' },
  { latin: 'ishmu nore birit', hebrew: 'אתם הנחתם (עבר מרוחק)' },
  { latin: 'uho nore birut', hebrew: 'הם הניחו (עבר מרוחק)' },

  // עבר הייתי צריך - dora
  { latin: 'me dorani birum', hebrew: 'אני הייתי צריך לתת' },
  { latin: 'tu dorani beery', hebrew: 'אתה היית צריך לתת' },
  { latin: 'u dorani boo', hebrew: 'הוא היה צריך לתת' },
  { latin: 'imu doreni birim', hebrew: 'אנחנו היינו צריכים לתת' },
  { latin: 'ishmu doreni birit', hebrew: 'אתם הייתם צריכים לתת' },
  { latin: 'uho Dorani Birut', hebrew: 'הם היו צריכים לתת' },
  // עבר הייתי צריך - dira
  { latin: 'me direni birum', hebrew: 'אני הייתי צריך לראות' },
  { latin: 'tu dirani biri', hebrew: 'אתה היית צריך לראות' },
  { latin: 'u direni boo', hebrew: 'הוא היה צריך לראות' },
  { latin: 'imu direni birim', hebrew: 'אנחנו היינו צריכים לראות' },
  { latin: 'ishmu direni birit', hebrew: 'אתם הייתם צריכים לראות' },
  { latin: 'uho direni birut', hebrew: 'הם היו צריכים לראות' },
  // עבר הייתי צריך - nora
  { latin: 'me noreni birum', hebrew: 'אני הייתי צריך להניח' },
  { latin: 'tu noreni biri', hebrew: 'אתה היית צריך להניח' },
  { latin: 'u noreni boo', hebrew: 'הוא היה צריך להניח' },
  { latin: 'imu noreni birim', hebrew: 'אנחנו היינו צריכים להניח' },
  { latin: 'ishmu noreni birit', hebrew: 'אתם הייתם צריכים להניח' },
  { latin: 'uho norani birut', hebrew: 'הם היו צריכים להניח' },
].map(e => ({ ...base, ...e }));

// מילה נוספת
entries.push({ ...base, latin: 'Easaat', hebrew: 'עכשיו', partOfSpeech: 'adv' });

const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const output = {
  timestamp: new Date().toISOString(),
  source_files: ['פעלים dira dora nora.pdf'],
  ...src,
  total_entries: entries.length,
  entries,
};

const outPath = `data/processed/dictionary-verbs-dira-${timestamp}.json`;
fs.writeFileSync(outPath, JSON.stringify(output, null, 2), 'utf-8');
console.log(`${entries.length} entries saved to ${outPath}`);
