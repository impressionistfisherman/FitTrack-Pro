const aliasGroups = [
  ["바벨 벤치프레스", "벤치프레스", "벤치 프레스", "벤치", "가슴 프레스", "bb bench", "barbell bench press"],
  ["인클라인 바벨 벤치프레스", "인클라인 벤치", "인클라인 벤치프레스", "윗가슴 벤치", "incline bench"],
  ["덤벨 벤치프레스", "덤벨 프레스", "덤벨프레스", "덤벨 벤치", "디비 벤치", "db bench", "dumbbell bench", "dumbbell press"],
  ["덤벨 플라이", "덤벨 플라이", "덤벨 플라이즈", "가슴 플라이", "db fly", "dumbbell fly"],
  ["케이블 크로스오버", "케이블 크로스", "케크오", "케이블 플라이", "가슴 케이블", "cable crossover"],
  ["스미스 머신 벤치프레스", "스미스 벤치", "스미스벤치", "smith bench press", "smith machine bench press"],
  ["머신 체스트 프레스", "체스트프레스", "체스트 프레스", "chest press", "machine chest press"],
  ["케이블 체스트 프레스", "케이블 체스트프레스", "cable chest press"],
  ["푸시업", "팔굽혀펴기", "팔굽혀 펴기", "푸쉬업", "push up", "pushup"],
  ["딥스", "체스트 딥스", "가슴 딥스", "삼두 딥스", "dips"],
  ["데드리프트", "컨벤데드", "컨벤셔널 데드", "컨벤셔널 데드리프트", "deadlift"],
  ["루마니안 데드리프트", "루마데", "루마니안", "RDL", "알디엘", "romanian deadlift"],
  ["풀업", "턱걸이", "철봉", "pull up", "pullup"],
  ["친업", "언더그립 풀업", "친 업", "chin up", "chinup"],
  ["바벨 로우", "바벨로우", "벤트오버 로우", "벤트 오버 로우", "등 로우", "barbell row"],
  ["시티드 케이블 로우", "케이블 로우", "시티드 로우", "롱풀", "롱 풀", "seated row", "cable row"],
  ["머신 로우", "머신로우", "로우 머신", "로우머신", "machine row"],
  ["덤벨 로우", "원암 덤벨 로우", "한팔 덤벨 로우", "덤벨로우", "db row", "dumbbell row"],
  ["T바 로우", "티바 로우", "티바로우", "t bar row", "t-bar row"],
  ["페이스 풀", "페이스풀", "후면 어깨 케이블", "face pull"],
  ["오버헤드 프레스", "밀프", "밀리터리 프레스", "바벨 숄더 프레스", "어깨 프레스", "ohp", "military press"],
  ["숄더 프레스", "숄더프레스", "머신 숄더 프레스", "머신숄더프레스", "shoulder press", "machine shoulder press"],
  ["덤벨 숄더 프레스", "덤벨 숄프", "덤숄프", "덤벨 어깨프레스", "db shoulder press", "dumbbell shoulder press"],
  ["레터럴 레이즈", "사레레", "사이드 레터럴", "사이드 레터럴 레이즈", "측면 어깨", "lateral raise"],
  ["프론트 레이즈", "전면 레이즈", "앞어깨 레이즈", "front raise"],
  ["리어 델트 플라이", "리어델트", "후면 어깨", "후면 삼각근", "어깨 후면", "reverse fly", "rear delt fly"],
  ["업라이트 로우", "업라이트로우", "승모 로우", "upright row"],
  ["바벨 컬", "바벨컬", "이두 바벨", "bb curl", "barbell curl"],
  ["덤벨 컬", "덤벨컬", "이두 덤벨", "db curl", "dumbbell curl"],
  ["해머 컬", "해머컬", "망치컬", "hammer curl"],
  ["트라이셉 푸시다운", "케푸다", "케이블 푸시다운", "삼두 푸시다운", "푸쉬다운", "pushdown"],
  ["스컬 크러셔", "라잉 트라이셉 익스텐션", "라잉 익스텐션", "누워서 삼두", "skull crusher"],
  ["오버헤드 트라이셉 익스텐션", "오버헤드 익스텐션", "삼두 오버헤드", "overhead triceps extension"],
  ["바벨 스쿼트", "스쿼트", "백스쿼트", "백 스쿼트", "bb squat", "barbell squat"],
  ["스미스 머신 스쿼트", "스미스 스쿼트", "스미스스쿼트", "smith squat", "smith machine squat"],
  ["프론트 스쿼트", "프론트스쿼트", "앞스쿼트", "front squat"],
  ["레그 프레스", "레그프레스", "하체 프레스", "leg press"],
  ["런지", "워킹 런지", "제자리 런지", "lunge"],
  ["레그 컬", "레그컬", "햄스트링 컬", "hamstring curl"],
  ["레그 익스텐션", "레그익스텐션", "레그 익스텐", "대퇴사두", "leg extension"],
  ["카프 레이즈", "카프레이즈", "종아리", "calf raise"],
  ["불가리안 스플릿 스쿼트", "불스스", "불가리안 스쿼트", "불가리안", "bulgarian split squat"],
  ["핵 스쿼트", "핵스쿼트", "hack squat"],
  ["힙 스러스트", "힙쓰러스트", "힙트러스트", "엉덩이", "hip thrust"],
  ["크런치", "윗몸", "윗몸일으키기", "복근 크런치", "crunch"],
  ["플랭크", "플랭크 자세", "코어 버티기", "plank"],
  ["레그 레이즈", "레그레이즈", "누워서 다리올리기", "하복부", "leg raise"],
  ["러시안 트위스트", "러시안트위스트", "복사근", "russian twist"],
  ["행잉 레그 레이즈", "행레레", "매달려 다리올리기", "hanging leg raise"],
  ["AB 휠 롤아웃", "ab휠", "앱휠", "복근 휠", "ab wheel"],
  ["트레드밀 달리기", "런닝머신", "러닝머신", "트레드밀", "달리기", "treadmill"],
  ["고정식 자전거", "싸이클", "사이클", "실내 자전거", "stationary bike"],
  ["마운틴 클라이머", "마운틴클라이머", "산악자세", "mountain climber"],
  ["버피", "버피 테스트", "버피테스트", "burpee"],
  ["로잉 머신", "로잉머신", "로잉", "rowing machine"],
  ["펙 덱 머신", "펙덱", "팩덱", "펙덱 플라이", "pec deck"],
  ["스트레이트 암 케이블 풀다운", "암풀다운", "스트레이트 암 풀다운", "케이블 암풀다운", "straight arm pulldown"],
  ["머신컬", "머신 컬", "머신프리처컬", "머신 프리처 컬", "프리쳐컬", "프리처컬", "preacher curl", "machine curl"],
  ["케이블컬", "케이블 컬", "cable curl"],
  ["이너싸이", "이너 싸이", "이너타이", "이너 타이", "어덕트", "어덕터", "어덕션", "힙 어덕션", "어덕트머신", "어덕터머신", "내전근", "adductor", "adduction", "hip adduction", "inner thigh"],
  ["아웃싸이", "아웃 싸이", "아웃타이", "아웃 타이", "어브덕트", "어브덕터", "어브덕션", "앱덕트", "앱덕터", "앱덕션", "힙 어브덕션", "힙 앱덕션", "아웃싸이머신", "아웃타이머신", "외전근", "abductor", "abduction", "hip abduction", "outer thigh"],
  ["랫풀다운", "렛풀다운", "랫 풀 다운", "랫 풀다운", "풀다운", "lat pulldown", "lat pull down", "pulldown"],
  ["플레이트풀다운", "플레이트 풀다운", "머신풀다운", "머신 풀다운", "레버리지풀다운", "레버리지 풀다운", "레버풀다운", "레버 풀다운", "lever pulldown", "leverage pulldown", "machine pulldown", "lever front pulldown", "레버리지 프론트 풀다운", "레버리지 원암 와이드 풀다운", "리버스 그립 머신 랫 풀다운"],
  ["체스트프레스", "체스트 프레스", "chest press"],
  ["숄더프레스", "숄더 프레스", "shoulder press"],
  ["레그프레스", "레그 프레스", "leg press"],
  ["레그컬", "레그 컬", "leg curl"],
  ["레그익스텐션", "레그 익스텐션", "leg extension"],
  ["스컬크러셔", "스컬 크러셔", "skullcrusher", "skull crusher"],
  ["바이셉컬", "바이셉 컬", "이두컬", "이두 컬", "bicep curl", "biceps curl"],
  ["트라이셉익스텐션", "트라이셉 익스텐션", "삼두익스텐션", "삼두 익스텐션", "triceps extension"],
];

const popularAliasByExercise = [
  { match: ["바벨 벤치프레스"], aliases: ["벤치", "벤치프레스"] },
  { match: ["인클라인 바벨 벤치프레스"], aliases: ["인클라인 벤치", "윗가슴 벤치"] },
  { match: ["덤벨 벤치프레스"], aliases: ["덤벨 프레스", "덤벨 벤치", "디비 벤치"] },
  { match: ["케이블 크로스오버"], aliases: ["케이블 크로스", "케이블 플라이"] },
  { match: ["푸시업"], aliases: ["팔굽혀펴기", "푸쉬업"] },
  { match: ["데드리프트"], aliases: ["컨벤데드", "컨벤셔널 데드"] },
  { match: ["루마니안 데드리프트"], aliases: ["루마데", "RDL"] },
  { match: ["풀업"], aliases: ["턱걸이", "철봉"] },
  { match: ["시티드 케이블 로우"], aliases: ["롱풀", "케이블 로우"] },
  { match: ["오버헤드 프레스"], aliases: ["밀프", "밀리터리 프레스"] },
  { match: ["덤벨 숄더 프레스"], aliases: ["덤숄프", "덤벨 어깨프레스"] },
  { match: ["레터럴 레이즈"], aliases: ["사레레", "사이드 레터럴"] },
  { match: ["리어 델트 플라이"], aliases: ["후면 어깨", "리어델트"] },
  { match: ["트라이셉 푸시다운"], aliases: ["케푸다", "삼두 푸시다운"] },
  { match: ["바벨 스쿼트"], aliases: ["스쿼트", "백스쿼트"] },
  { match: ["불가리안 스플릿 스쿼트"], aliases: ["불스스", "불가리안"] },
  { match: ["힙 스러스트"], aliases: ["힙트러스트", "엉덩이"] },
  { match: ["트레드밀 달리기"], aliases: ["런닝머신", "러닝머신"] },
  { match: ["고정식 자전거"], aliases: ["싸이클", "실내 자전거"] },
  { match: ["펙 덱 머신"], aliases: ["펙덱", "펙덱 플라이"] },
  { match: ["스트레이트 암 케이블 풀다운"], aliases: ["암풀다운", "스트레이트 암 풀다운"] },
];

const equipmentSynonymGroups = [
  ["덤벨", "디비", "DB", "dumbbell"],
  ["바벨", "비비", "BB", "barbell"],
  ["케이블", "케블", "cable"],
  ["머신", "machine", "lever", "leverage", "레버", "레버리지"],
  ["스미스", "스미스머신", "smith", "smith machine"],
  ["밴드", "고무밴드", "resistance band", "band"],
  ["케틀벨", "kettlebell"],
  ["맨몸", "바디웨이트", "bodyweight", "body weight"],
  ["이지바", "ez바", "EZ 바", "ez bar"],
  ["로프", "rope"],
  ["V바", "V 바", "브이바", "v bar", "v-bar"],
];

const movementSynonymGroups = [
  ["프레스", "press", "presses"],
  ["로우", "row", "rows"],
  ["풀다운", "풀 다운", "랫풀다운", "렛풀다운", "라풀", "lat pulldown", "pull down", "pulldown"],
  ["레이즈", "raise", "raises"],
  ["레터럴", "사이드레터럴", "사이드 레터럴", "lateral"],
  ["플라이", "플라이즈", "fly", "flye", "flyes"],
  ["컬", "curl", "curls"],
  ["익스텐션", "익스텐", "extension", "extensions"],
  ["푸시다운", "푸쉬다운", "pushdown", "pushdowns"],
  ["스쿼트", "squat", "squats"],
  ["런지", "lunge", "lunges"],
  ["데드리프트", "데드", "deadlift"],
  ["힙힌지", "힙 힌지", "hip hinge"],
  ["스러스트", "쓰러스트", "트러스트", "thrust"],
  ["크런치", "crunch"],
  ["트위스트", "twist"],
  ["플랭크", "plank"],
  ["스트레칭", "스트레치", "stretch"],
  ["킥백", "kickback"],
  ["풀오버", "pullover"],
  ["슈러그", "쉬러그", "shrug"],
  ["탭", "터치", "tap", "touch"],
  ["점프", "jump", "jumps"],
];

const bodySynonymGroups = [
  ["가슴", "흉근", "체스트", "chest", "pec", "pectorals"],
  ["등", "광배", "광배근", "랫", "lat", "lats", "back"],
  ["어깨", "숄더", "삼각근", "shoulder", "deltoid", "delt"],
  ["전면어깨", "앞어깨", "전면 삼각근", "front delt", "anterior delt"],
  ["측면어깨", "옆어깨", "측면 삼각근", "side delt", "lateral delt"],
  ["후면어깨", "후면 삼각근", "리어델트", "rear delt", "posterior delt"],
  ["이두", "이두근", "바이셉", "바이셉스", "bicep", "biceps"],
  ["삼두", "삼두근", "트라이셉", "트라이셉스", "tricep", "triceps"],
  ["하체", "다리", "레그", "leg", "legs"],
  ["허벅지앞", "앞벅지", "대퇴사두", "대퇴사두근", "쿼드", "quad", "quadriceps"],
  ["허벅지뒤", "뒷벅지", "햄스트링", "햄스", "hamstring", "hamstrings"],
  ["엉덩이", "둔근", "힙", "글루트", "glute", "glutes"],
  ["종아리", "카프", "calf", "calves"],
  ["복근", "복부", "abs", "abdominals"],
  ["코어", "core"],
  ["내전근", "이너싸이", "이너타이", "어덕터", "어덕션", "adductor", "adduction", "inner thigh"],
  ["외전근", "아웃싸이", "아웃타이", "어브덕터", "앱덕터", "어브덕션", "앱덕션", "abductor", "abduction", "outer thigh"],
];

const positionSynonymGroups = [
  ["인클라인", "incline"],
  ["디클라인", "decline"],
  ["플랫", "flat"],
  ["시티드", "앉아서", "seated"],
  ["스탠딩", "서서", "standing"],
  ["라잉", "누워서", "lying"],
  ["프론", "엎드려", "prone"],
  ["원암", "원 암", "한팔", "한 팔", "싱글암", "싱글 암", "one arm", "one-arm", "single arm", "single-arm"],
  ["투암", "투 암", "양팔", "양 팔", "two arm", "two-arm"],
  ["와이드", "넓게", "wide", "wide grip", "wide-grip"],
  ["내로우", "좁게", "클로즈", "close", "close grip", "narrow"],
  ["리버스", "reverse"],
  ["해머", "뉴트럴", "neutral", "hammer"],
];

const generatedAliasRules = [
  { any: ["adductor", "adduction", "어덕터", "어덕션", "내전근"], aliases: ["이너싸이", "어덕터 머신", "내전근"] },
  { any: ["abductor", "abduction", "어브덕터", "앱덕터", "어브덕션", "앱덕션", "외전근"], aliases: ["아웃싸이", "어브덕터 머신", "외전근"] },
  { any: ["lateral raise", "레터럴 레이즈"], aliases: ["사레레", "사이드 레터럴"] },
  { any: ["shoulder press", "숄더 프레스"], aliases: ["숄프", "어깨 프레스"] },
  { any: ["overhead press", "오버헤드 프레스"], aliases: ["밀프", "밀리터리 프레스"] },
  { any: ["lat pulldown", "랫 풀다운", "렛 풀다운"], aliases: ["라풀", "랫풀다운"] },
  { any: ["seated row", "시티드 로우", "cable row", "케이블 로우"], aliases: ["롱풀", "케이블 로우"] },
  { any: ["hip thrust", "힙 스러스트"], aliases: ["힙트러스트", "힙쓰러스트"] },
  { any: ["romanian deadlift", "루마니안 데드리프트"], aliases: ["루마데", "RDL"] },
  { any: ["bulgarian split squat", "불가리안 스플릿 스쿼트"], aliases: ["불스스", "불가리안"] },
  { any: ["treadmill", "트레드밀"], aliases: ["런닝머신", "러닝머신"] },
  { any: ["pec deck", "펙 덱"], aliases: ["펙덱", "펙덱 플라이"] },
];

const koreanDisplayPhraseReplacements: Array<[RegExp, string]> = [
  [/^어덕터$/i, "이너싸이 머신"],
  [/^어브덕터 머신$/i, "아웃싸이 머신"],
  [/어덕터 머신/g, "이너싸이 머신"],
  [/어브덕터 머신/g, "아웃싸이 머신"],
  [/힙 어덕션/g, "이너싸이"],
  [/힙 어브덕션|힙 앱덕션/g, "아웃싸이"],
  [/원 암/g, "원암"],
  [/투 암/g, "투암"],
  [/싱글 암/g, "싱글암"],
  [/투 덤벨/g, "투 덤벨"],
  [/투 케틀벨/g, "투 케틀벨"],
  [/원 레그/g, "원레그"],
  [/싱글 레그/g, "싱글레그"],
  [/투 레그/g, "투레그"],
  [/온 니/g, "온 니"],
  [/온 더 니/g, "온 더 니"],
  [/헤드 온 벤치/g, "헤드 온 벤치"],
  [/라잉 어게인스트 언 인클라인/g, "라잉 어게인스트 인클라인"],
  [/비하인드 더 백/g, "비하인드 더 백"],
  [/투 어 벤치/g, "투 어 벤치"],
  [/풀어파트/g, "풀 어파트"],
  [/델토이드/g, "델트"],
  [/Sitted/gi, "시티드"],
  [/Twisting/gi, "트위스팅"],
  [/Twisted/gi, "트위스트"],
  [/Blaster/gi, "블래스터"],
  [/Rollerout/gi, "롤아웃"],
  [/Inverse/gi, "인버스"],
  [/Planche/gi, "플란체"],
  [/Pov/gi, "POV"],
  [/Revers\b/gi, "리버스"],
  [/Abduction/gi, "어브덕션"],
  [/Archer/gi, "아처"],
  [/Jack Knife/gi, "잭 나이프"],
  [/Jack/gi, "잭"],
  [/Knife/gi, "나이프"],
  [/Quads/gi, "쿼드"],
  [/Scapula/gi, "스캐퓰라"],
  [/Squatting/gi, "스쿼팅"],
  [/Around/gi, "어라운드"],
  [/Burpee/gi, "버피"],
  [/Cage/gi, "케이지"],
  [/Clasped/gi, "클래스프드"],
  [/Mountain Climber/gi, "마운틴 클라이머"],
  [/Crossovers/gi, "크로스오버"],
  [/Horizontal/gi, "호리존탈"],
  [/Hyper/gi, "하이퍼"],
  [/Maltese/gi, "말티즈"],
  [/Rotate/gi, "로테이트"],
  [/Raised/gi, "레이즈드"],
  [/Support/gi, "서포트"],
  [/Tap/gi, "탭"],
  [/Touch/gi, "터치"],
  [/Jumps/gi, "점프"],
  [/Jump/gi, "점프"],
  [/Circular/gi, "서큘러"],
  [/Apart/gi, "어파트"],
  [/Basic/gi, "베이직"],
  [/Modified/gi, "모디파이드"],
  [/Prisoner/gi, "프리즈너"],
  [/Semi/gi, "세미"],
  [/Swimmer/gi, "스위머"],
  [/Cossack/gi, "코사크"],
  [/French/gi, "프렌치"],
  [/Thrusts/gi, "스러스트"],
  [/Renegade/gi, "레니게이드"],
  [/힐 터치/g, "힐 터치"],
  [/힐 터처/g, "힐 터처"],
  [/앵클/g, "앵클"],
  [/서클/g, "서클"],
  [/메디신 볼/g, "메디신볼"],
  [/스텝 업/g, "스텝업"],
  [/풀 업/g, "풀업"],
  [/푸시 업|푸쉬 업/g, "푸시업"],
  [/싯업/g, "싯업"],
  [/AB 롤아웃/g, "AB 휠 롤아웃"],
  [/\bMale\b|\bFemale\b/gi, ""],
  [/\s+v\.\s*\d+/gi, ""],
  [/\s*\(.*?\)\s*/g, " "],
  [/\s+-\s+/g, " "],
];

const englishDisplayPhraseMap: Array<[RegExp, string]> = [
  [/\badductor\b|\bhip adduction\b/i, "이너싸이 머신"],
  [/\babductor\b|\bhip abduction\b/i, "아웃싸이 머신"],
  [/\bbarbell bench press\b/i, "바벨 벤치프레스"],
  [/\bincline barbell bench press\b/i, "인클라인 바벨 벤치프레스"],
  [/\bdumbbell bench press\b/i, "덤벨 벤치프레스"],
  [/\bbench press\b/i, "벤치프레스"],
  [/\blat pulldown\b|\bpull down\b|\bpulldown\b/i, "랫 풀다운"],
  [/\bseated cable row\b|\bseated row\b/i, "시티드 케이블 로우"],
  [/\blateral raise\b/i, "레터럴 레이즈"],
  [/\boverhead press\b|\bmilitary press\b/i, "오버헤드 프레스"],
  [/\bshoulder press\b/i, "숄더 프레스"],
  [/\brear delt\b/i, "리어 델트"],
  [/\btriceps? pushdown\b/i, "트라이셉 푸시다운"],
  [/\bhammer curl\b/i, "해머 컬"],
  [/\bdumbbell press\b/i, "덤벨 프레스"],
  [/\bbiceps? curl\b/i, "바이셉 컬"],
  [/\bromanian deadlift\b/i, "루마니안 데드리프트"],
  [/\bdeadlift\b/i, "데드리프트"],
  [/\bbulgarian split squat\b/i, "불가리안 스플릿 스쿼트"],
  [/\bsquat\b/i, "스쿼트"],
  [/\bhip thrust\b/i, "힙 스러스트"],
  [/\btreadmill\b/i, "트레드밀"],
  [/\bpec deck\b/i, "펙 덱 머신"],
];

const synonymGroups = [
  ["원암", "원 암", "한팔", "한 팔", "싱글암", "싱글 암", "one arm", "one-arm", "single arm", "single-arm"],
  ["투암", "투 암", "양팔", "양 팔", "two arm", "two-arm"],
  ["케이블", "cable"],
  ["머신", "machine", "lever", "leverage", "레버", "레버리지", "플레이트", "plate", "plate loaded", "plate-loaded"],
  ["로우", "row", "rows"],
  ["풀다운", "풀 다운", "pulldown", "pull down", "pulldowns", "lat pulldown", "랫풀다운", "렛풀다운", "랫 풀다운"],
  ["트라이셉", "트라이셉스", "삼두", "삼두근", "tricep", "triceps"],
  ["바이셉", "바이셉스", "이두", "이두근", "bicep", "biceps"],
  ["어시스트", "어시스티드", "보조", "보조식", "assisted", "assist"],
  ["익스텐션", "extension", "extensions"],
  ["푸시다운", "pushdown", "pushdowns"],
  ["프레스", "press", "presses"],
  ["컬", "curl", "curls"],
  ["와이드", "wide", "wide grip", "wide-grip"],
  ["리버스", "reverse"],
  ["그립", "grip"],
  ["시티드", "seated"],
  ["스탠딩", "standing"],
  ["벤트오버", "벤트 오버", "bent over", "bent-over"],
  ["하이", "high"],
  ["스트레이트", "straight"],
  ["백", "back"],
  ["V바", "V 바", "v bar", "v-bar"],
  ["랫", "lat", "lats"],
  ...equipmentSynonymGroups,
  ...movementSynonymGroups,
  ...bodySynonymGroups,
  ...positionSynonymGroups,
];

const synonymByCompact = new Map<string, Set<string>>();

for (const group of [...aliasGroups, ...synonymGroups]) {
  const normalizedGroup = group.map((item) => normalizeExerciseSearchText(item)).filter(Boolean);
  for (const item of normalizedGroup) {
    const compact = compactSearchText(item);
    const synonyms = synonymByCompact.get(compact) ?? new Set<string>();
    for (const synonym of normalizedGroup) synonyms.add(synonym);
    synonymByCompact.set(compact, synonyms);
  }
}

export function normalizeExerciseSearchText(value: string) {
  return value
    .toLowerCase()
    .replace(/[()\[\]{}]/g, " ")
    .replace(/[·ㆍ,._\-_/\\|:;'"`~!@#$%^&*+=?<>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function compactSearchText(value: string) {
  return normalizeExerciseSearchText(value).replace(/\s+/g, "");
}

function tokenizeExerciseSearchText(value: string) {
  const normalized = normalizeExerciseSearchText(value);
  if (!normalized) return [];
  return normalized.split(" ").map((token) => compactSearchText(token)).filter((token) => token.length >= 2);
}

function expandToken(token: string) {
  const expanded = synonymByCompact.get(token);
  if (!expanded) return [token];
  return Array.from(expanded).flatMap((item) => tokenizeExerciseSearchText(item));
}

export function expandExerciseSearchTerms(query: string) {
  const normalized = normalizeExerciseSearchText(query);
  if (!normalized) return [];

  const terms = new Set<string>([normalized]);
  const raw = query.trim().toLowerCase();
  if (raw) terms.add(raw);
  const compactQuery = compactSearchText(query);

  for (const group of aliasGroups) {
    if (group.some((alias) => compactSearchText(alias).includes(compactQuery) || compactQuery.includes(compactSearchText(alias)))) {
      for (const alias of group) terms.add(normalizeExerciseSearchText(alias));
    }
  }

  return Array.from(terms).filter(Boolean);
}

export function getExerciseSearchTokenGroups(query: string) {
  const groups: string[][] = [];
  const seenGroups = new Set<string>();
  const addGroup = (group: string[]) => {
    const normalizedGroup = Array.from(new Set(group)).filter(Boolean);
    const key = normalizedGroup.slice().sort().join("|");
    if (!key || seenGroups.has(key)) return;
    seenGroups.add(key);
    groups.push(normalizedGroup);
  };

  for (const token of tokenizeExerciseSearchText(query)) {
    const group = Array.from(new Set([token, ...expandToken(token)])).filter(Boolean);
    if (group.length > 1) {
      addGroup(group);
      continue;
    }

    const embeddedSynonymKeys = Array.from(synonymByCompact.keys())
      .filter((key) => key.length >= 2 && token.includes(key) && key !== token)
      .sort((a, b) => token.indexOf(a) - token.indexOf(b) || b.length - a.length);
    if (embeddedSynonymKeys.length) {
      for (const key of embeddedSynonymKeys) {
        addGroup(Array.from(new Set([key, ...expandToken(key)])));
      }
      continue;
    }

    addGroup(group);
  }

  return groups;
}

export function matchesExerciseSearchText(query: string, ...values: Array<string | null | undefined>) {
  const terms = expandExerciseSearchTerms(query);
  if (!terms.length) return true;

  const haystack = compactSearchText(values.filter(Boolean).join(" "));
  if (!haystack) return false;
  if (terms.some((term) => {
    const compactTerm = compactSearchText(term);
    return haystack.includes(compactTerm) || compactTerm.includes(haystack);
  })) return true;

  const tokenGroups = getExerciseSearchTokenGroups(query);
  if (!tokenGroups.length) return true;
  return tokenGroups.every((group) => group.some((token) => haystack.includes(token)));
}

export function getPopularExerciseAliases(...values: Array<string | null | undefined>) {
  const haystack = compactSearchText(values.filter(Boolean).join(" "));
  if (!haystack) return [];
  const aliases = new Set<string>();

  const candidates = popularAliasByExercise
    .slice()
    .sort((a, b) => (
      Math.max(...b.match.map((value) => compactSearchText(value).length))
      - Math.max(...a.match.map((value) => compactSearchText(value).length))
    ));

  for (const item of candidates) {
    if (item.match.some((value) => haystack.includes(compactSearchText(value)))) {
      for (const alias of item.aliases) aliases.add(alias);
      break;
    }
  }

  for (const rule of generatedAliasRules) {
    if (rule.any.some((value) => haystack.includes(compactSearchText(value)))) {
      for (const alias of rule.aliases) aliases.add(alias);
    }
  }

  return Array.from(aliases).slice(0, 4);
}

function cleanupKoreanDisplayName(value: string) {
  let next = value.replace(/[·ㆍ_/\\|]+/g, " ");
  for (const [pattern, replacement] of koreanDisplayPhraseReplacements) {
    next = next.replace(pattern, replacement);
  }
  return next
    .replace(/\s+/g, " ")
    .replace(/\s+(머신|프레스|로우|컬|레이즈|플라이|스쿼트|런지|데드리프트|풀다운|푸시다운|익스텐션|스트레칭|스트레치)/g, " $1")
    .trim();
}

function translateEnglishExerciseName(value: string) {
  const normalized = normalizeExerciseSearchText(value);
  if (!normalized) return "";

  for (const [pattern, replacement] of englishDisplayPhraseMap) {
    if (pattern.test(normalized)) return replacement;
  }

  return "";
}

export function getReadableKoreanExerciseName(exercise: {
  name?: string | null;
  nameKo?: string | null;
  equipment?: string | null;
  bodyPart?: string | null;
}) {
  const rawKo = typeof exercise.nameKo === "string" ? exercise.nameKo.trim() : "";
  const rawEn = typeof exercise.name === "string" ? exercise.name.trim() : "";
  const cleanedKo = rawKo ? cleanupKoreanDisplayName(rawKo) : "";

  const englishDerived = rawEn ? translateEnglishExerciseName(rawEn) : "";
  if (!cleanedKo && englishDerived) return englishDerived;

  if (!cleanedKo) return rawEn;

  const compactKo = compactSearchText(cleanedKo);
  const compactEnglishDerived = compactSearchText(englishDerived);
  if (englishDerived && (
    /[a-z]/i.test(cleanedKo)
    || compactKo.length > compactEnglishDerived.length + 12
  )) {
    const prefixParts: string[] = [];
    const normalizedEn = normalizeExerciseSearchText(rawEn);
    if (/\bbarbell\b/.test(normalizedEn) && !/바벨/.test(englishDerived)) prefixParts.push("바벨");
    if (/\bdumbbell\b/.test(normalizedEn) && !/덤벨/.test(englishDerived)) prefixParts.push("덤벨");
    if (/\bcable\b/.test(normalizedEn) && !/케이블/.test(englishDerived)) prefixParts.push("케이블");
    if (/\bmachine\b|\blever\b/.test(normalizedEn) && !/머신|레버/.test(englishDerived)) prefixParts.push("머신");
    if (/\bband\b/.test(normalizedEn) && !/밴드/.test(englishDerived)) prefixParts.push("밴드");
    if (/\bone arm\b|\bone-arm\b|\bsingle arm\b/.test(normalizedEn) && !/원암|싱글암/.test(englishDerived)) prefixParts.push("원암");
    if (/\bseated\b/.test(normalizedEn) && !/시티드/.test(englishDerived)) prefixParts.push("시티드");
    if (/\bstanding\b/.test(normalizedEn) && !/스탠딩/.test(englishDerived)) prefixParts.push("스탠딩");

    return cleanupKoreanDisplayName([...prefixParts, englishDerived].join(" "));
  }

  return cleanedKo;
}

export function scoreExerciseSearchMatch(query: string, ...values: Array<string | null | undefined>) {
  const normalizedQuery = normalizeExerciseSearchText(query);
  if (!normalizedQuery) return 0;

  const compactQuery = compactSearchText(query);
  const normalizedValues = values
    .filter(Boolean)
    .map((value) => normalizeExerciseSearchText(String(value)));
  const compactValues = normalizedValues.map((value) => compactSearchText(value));

  if (compactValues.some((value) => value === compactQuery)) return 1000;
  if (normalizedValues.some((value) => value === normalizedQuery)) return 980;
  if (compactValues.some((value) => value.startsWith(compactQuery))) return 850;
  if (normalizedValues.some((value) => value.startsWith(normalizedQuery))) return 820;

  const queryTokens = tokenizeExerciseSearchText(query);
  const haystackTokens = new Set(tokenizeExerciseSearchText(values.filter(Boolean).join(" ")));
  if (queryTokens.length && queryTokens.every((token) => haystackTokens.has(token))) return 720;

  const haystack = compactSearchText(values.filter(Boolean).join(" "));
  if (haystack.includes(compactQuery)) return 620;

  const tokenGroups = getExerciseSearchTokenGroups(query);
  if (tokenGroups.length && tokenGroups.every((group) => group.some((token) => haystack.includes(token)))) {
    return 520;
  }

  return matchesExerciseSearchText(query, ...values) ? 400 : 0;
}
