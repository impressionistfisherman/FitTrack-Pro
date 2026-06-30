import fs from "node:fs";
import path from "node:path";

const projectRoot = process.cwd();
const sourcePath = path.resolve(projectRoot, "%TEMP%", "free-exercise-db-codex", "dist", "exercises.json");
const hasanSourcePath = path.resolve(process.env.TEMP ?? "%TEMP%", "hasan-exercises-dataset", "data", "exercises.json");
const baselinePath = path.resolve(projectRoot, "server", "data", "core-exercises-baseline.json");
const targetPath = path.resolve(projectRoot, "server", "data", "bulk-exercises.json");

const existingExercises = JSON.parse(fs.readFileSync(baselinePath, "utf8"));

async function loadSourceExercises() {
  if (fs.existsSync(sourcePath)) {
    return JSON.parse(fs.readFileSync(sourcePath, "utf8"));
  }

  const response = await fetch("https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/dist/exercises.json");
  if (!response.ok) {
    throw new Error(`Failed to download free-exercise-db source: ${response.status}`);
  }
  return await response.json();
}

async function loadHasanSourceExercises() {
  if (fs.existsSync(hasanSourcePath)) {
    return JSON.parse(fs.readFileSync(hasanSourcePath, "utf8"));
  }

  const response = await fetch("https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json");
  if (!response.ok) {
    throw new Error(`Failed to download hasaneyldrm/exercises-dataset source: ${response.status}`);
  }
  return await response.json();
}

const manualNameOverrides = new Map([
  ["3/4 Sit-Up", "3/4 싯업"],
  ["90/90 Hamstring", "90/90 햄스트링 스트레치"],
  ["Ab Crunch Machine", "앱 크런치 머신"],
  ["Ab Roller", "AB 롤러"],
  ["Abdominal Stretch", "복근 스트레칭"],
  ["Advanced Kettlebell Windmill", "어드밴스드 케틀벨 윈드밀"],
  ["Adductor", "어덕터"],
  ["Adductor/Groin", "어덕터 그로인 스트레치"],
  ["Air Bike", "에어 바이크"],
  ["All Fours Quad Stretch", "올포 쿼드 스트레치"],
  ["Alternate Hammer Curl", "얼터네이트 해머 컬"],
  ["Alternate Heel Touchers", "얼터네이트 힐 터치"],
  ["Alternate Incline Dumbbell Curl", "얼터네이트 인클라인 덤벨 컬"],
  ["Alternate Leg Diagonal Bound", "얼터네이트 레그 다이아고널 바운드"],
  ["Alternating Renegade Row", "얼터네이팅 레니게이드 로우"],
  ["Arnold Dumbbell Press", "아놀드 덤벨 프레스"],
  ["Around The Worlds", "어라운드 더 월드"],
  ["Atlas Stones", "아틀라스 스톤"],
  ["Atlas Stone Trainer", "아틀라스 스톤 트레이너"],
  ["Back Flyes - With Bands", "밴드 백 플라이"],
  ["Balance Board", "밸런스 보드"],
  ["Band Assisted Pull-Up", "밴드 어시스트 풀업"],
  ["Band Pull Apart", "밴드 풀어파트"],
  ["Barbell Bench Press - Medium Grip", "바벨 벤치프레스"],
  ["Barbell Full Squat", "바벨 풀 스쿼트"],
  ["Barbell Glute Bridge", "바벨 글루트 브리지"],
  ["Barbell Hip Thrust", "바벨 힙 스러스트"],
  ["Barbell Incline Bench Press - Medium Grip", "인클라인 바벨 벤치프레스"],
  ["Barbell Rollout from Bench", "바벨 롤아웃"],
  ["Battling Ropes", "배틀 로프"],
  ["Bench Dips", "벤치 딥스"],
  ["Bodyweight Flyes", "맨몸 플라이"],
  ["Butterfly", "버터플라이 스트레치"],
  ["Cable Chest Press", "케이블 체스트 프레스"],
  ["Cable Crossover", "케이블 크로스오버"],
  ["Cable Crunch", "케이블 크런치"],
  ["Cable Hammer Curls - Rope Attachment", "케이블 해머 컬"],
  ["Cable Hip Adduction", "케이블 힙 어덕션"],
  ["Cable Incline Triceps Extension", "케이블 인클라인 트라이셉스 익스텐션"],
  ["Cable Internal Rotation", "케이블 인터널 로테이션"],
  ["Cable Iron Cross", "케이블 아이언 크로스"],
  ["cable one arm pulldown", "케이블 원암 풀다운"],
  ["cable seated row", "케이블 시티드 로우"],
  ["cable seated wide-grip row", "케이블 시티드 와이드 그립 로우"],
  ["cable standing one arm triceps extension", "케이블 스탠딩 원암 트라이셉스 익스텐션"],
  ["cable standing row (v-bar)", "케이블 스탠딩 V바 로우"],
  ["lever front pulldown", "레버리지 프론트 풀다운"],
  ["lever high row", "레버리지 하이 로우"],
  ["lever one arm lateral wide pulldown", "레버리지 원암 와이드 풀다운"],
  ["reverse grip machine lat pulldown", "리버스 그립 머신 랫 풀다운"],
  ["Decline EZ Bar Triceps Extension", "디클라인 EZ바 트라이셉스 익스텐션"],
  ["Foot-SMR", "풋 폼롤링"],
  ["Calf Press", "카프 프레스"],
  ["Calf Raise On A Dumbbell", "덤벨 카프 레이즈"],
  ["Cat Stretch", "캣 스트레치"],
  ["Child's Pose", "아이 자세"],
  ["Chin-Up", "친업"],
  ["Clean and Jerk", "클린 앤 저크"],
  ["Close-Grip Barbell Bench Press", "클로즈 그립 벤치프레스"],
  ["Concentration Curls", "컨센트레이션 컬"],
  ["Deadlift with Bands", "밴드 데드리프트"],
  ["Decline Barbell Bench Press", "디클라인 벤치프레스"],
  ["Dips - Chest Version", "체스트 딥스"],
  ["Dips - Triceps Version", "트라이셉 딥스"],
  ["Dumbbell Alternate Bicep Curl", "덤벨 컬"],
  ["Dumbbell Bench Press", "덤벨 벤치프레스"],
  ["Dumbbell Flyes", "덤벨 플라이"],
  ["Dumbbell Incline Flyes", "인클라인 덤벨 플라이"],
  ["Dumbbell One-Arm Row", "원암 덤벨 로우"],
  ["EZ-Bar Curl", "EZ바 컬"],
  ["EZ-Bar Preacher Curl", "EZ바 프리처 컬"],
  ["EZ-Bar Skullcrusher", "EZ바 스컬 크러셔"],
  ["Face Pull", "페이스 풀"],
  ["Farmer's Walk", "파머스 워크"],
  ["Flat Bench Leg Pull-In", "레그 풀인"],
  ["Hammer Grip Incline DB Bench Press", "해머 그립 인클라인 덤벨 벤치프레스"],
  ["Glute Bridge", "글루트 브리지"],
  ["Good Morning", "굿모닝"],
  ["Hack Squat", "핵 스쿼트"],
  ["Hammer Curls", "해머 컬"],
  ["Hanging Leg Raise", "행잉 레그 레이즈"],
  ["Incline Dumbbell Press", "인클라인 덤벨 벤치프레스"],
  ["Kettlebell Swing", "케틀벨 스윙"],
  ["Lat Pulldown", "랫 풀다운"],
  ["Leg Extensions", "레그 익스텐션"],
  ["Leg Press", "레그 프레스"],
  ["Lying Leg Curls", "라잉 레그 컬"],
  ["Mountain Climbers", "마운틴 클라이머"],
  ["Pec Deck Fly", "펙 덱 플라이"],
  ["Plank", "플랭크"],
  ["Pull-Up", "풀업"],
  ["Push-Up", "푸시업"],
  ["Romanian Deadlift", "루마니안 데드리프트"],
  ["Russian Twist", "러시안 트위스트"],
  ["Seated Cable Row", "시티드 케이블 로우"],
  ["Side Plank", "사이드 플랭크"],
  ["See-Saw Press (Alternating Side Press)", "시소 프레스"],
  ["Sumo Deadlift", "스모 데드리프트"],
  ["T-Bar Row with Handle", "T바 로우"],
  ["Triceps Pushdown - Rope Attachment", "트라이셉 푸시다운"],
  ["V-Up", "V업"],
  ["Wide-Grip Lat Pulldown", "와이드 그립 랫 풀다운"],
  ["World's Greatest Stretch", "월즈 그레이티스트 스트레치"],
  ["Hyperextensions With No Hyperextension Bench", "노 벤치 하이퍼익스텐션"],
  ["Bench Press with Chains", "체인 벤치프레스"],
  ["Bench Press - With Bands", "밴드 벤치프레스"],
  ["Cross Over - With Bands", "밴드 크로스오버"],
  ["External Rotation", "익스터널 로테이션"],
  ["External Rotation with Band", "밴드 익스터널 로테이션"],
  ["External Rotation with Cable", "케이블 익스터널 로테이션"],
  ["Internal Rotation with Band", "밴드 인터널 로테이션"],
  ["Lateral Bound", "레터럴 바운드"],
  ["Rope Jumping", "로프 점핑"],
  ["Torso Rotation", "토르소 로테이션"],
  ["Wrist Rotations with Straight Bar", "스트레이트 바 리스트 로테이션"],
]);

const englishPhraseMap = [
  ["multiple response", "멀티플 리스폰스"],
  ["single response", "싱글 리스폰스"],
  ["single-leg", "싱글 레그"],
  ["single leg", "싱글 레그"],
  ["single arm", "싱글 암"],
  ["single-arm", "싱글 암"],
  ["self assisted", "셀프 어시스트"],
  ["band assisted", "밴드 어시스트"],
  ["cable assisted", "케이블 어시스트"],
  ["lever assisted", "레버리지 어시스트"],
  ["assisted", "어시스트"],
  ["assist", "어시스트"],
  ["alternate", "얼터네이트"],
  ["alternating", "얼터네이팅"],
  ["advanced", "어드밴스드"],
  ["all fours", "올포"],
  ["one arm", "원암"],
  ["one-arm", "원암"],
  ["two-arm", "투암"],
  ["two-dumbbell", "투 덤벨"],
  ["three", "쓰리"],
  ["with a twist", "트위스트"],
  ["with chains", "체인"],
  ["with bands", "밴드"],
  ["with band", "밴드"],
  ["with no hyperextension bench", "노 벤치"],
  ["with no", "노"],
  ["external rotation", "익스터널 로테이션"],
  ["internal rotation", "인터널 로테이션"],
  ["torso rotation", "토르소 로테이션"],
  ["lateral bound", "레터럴 바운드"],
  ["bent over", "벤트 오버"],
  ["behind the back", "비하인드 더 백"],
  ["behind head", "비하인드 헤드"],
  ["behind the neck", "비하인드 넥"],
  ["behind neck", "비하인드 넥"],
  ["close-grip", "클로즈 그립"],
  ["wide-grip", "와이드 그립"],
  ["underhand", "언더핸드"],
  ["overhand", "오버핸드"],
  ["bodyweight", "맨몸"],
  ["body weight", "맨몸"],
  ["smr", "폼롤링"],
  ["ez-bar", "EZ바"],
  ["ez bar", "EZ바"],
  ["db", "덤벨"],
  ["hyperextensions", "하이퍼익스텐션"],
  ["arm blaster", "암 블래스터"],
  ["rollerout", "롤아웃"],
  ["planche", "플란체"],
  ["back pov", "백 POV"],
  ["pov", "POV"],
  ["revers", "리버스"],
  ["abduction", "어브덕션"],
  ["archer", "아처"],
  ["jack knife", "잭 나이프"],
  ["quads", "쿼드"],
  ["scapula", "스캐퓰라"],
  ["squatting", "스쿼팅"],
  ["around", "어라운드"],
  ["burpee", "버피"],
  ["cage", "케이지"],
  ["clasped", "클래스프드"],
  ["mountain climber", "마운틴 클라이머"],
  ["crossovers", "크로스오버"],
  ["horizontal", "호리존탈"],
  ["reverse hyper", "리버스 하이퍼"],
  ["hyper", "하이퍼"],
  ["maltese", "말티즈"],
  ["pallof", "팔로프"],
  ["supinated", "슈피네이티드"],
  ["leverage", "레버리지"],
  ["lever", "레버리지"],
  ["iso", "아이소"],
  ["see-saw", "시소"],
  ["see saw", "시소"],
  ["it band", "IT 밴드"],
  ["iliotibial tract", "장경인대"],
  ["latissimus dorsi", "랫"],
  ["rhomboids", "롬보이드"],
  ["quadriceps", "쿼드리셉스"],
  ["piriformis", "피리포미스"],
  ["peroneals", "페로니얼"],
  ["anterior tibialis", "앤티리어 티비알리스"],
  ["brachialis", "브라키알리스"],
  ["lower back", "로워 백"],
  ["upper back", "어퍼 백"],
  ["neck", "넥"],
  ["calves", "카프"],
  ["hamstring", "햄스트링"],
  ["with rotation", "로테이션"],
  ["decline", "디클라인"],
  ["incline", "인클라인"],
  ["flat bench", "플랫 벤치"],
  ["standing", "스탠딩"],
  ["seated", "시티드"],
  ["lying", "라잉"],
  ["hanging", "행잉"],
  ["walking", "워킹"],
  ["running", "러닝"],
  ["kneeling", "닐링"],
  ["straight bar", "스트레이트 바"],
  ["smith machine", "스미스 머신"],
  ["barbell", "바벨"],
  ["dumbbell", "덤벨"],
  ["kettlebell", "케틀벨"],
  ["cable", "케이블"],
  ["machine", "머신"],
  ["bands", "밴드"],
  ["band", "밴드"],
  ["medicine ball", "메디신 볼"],
  ["exercise ball", "짐볼"],
  ["stability ball", "스태빌리티 볼"],
  ["foam roll", "폼롤"],
  ["bench press", "벤치프레스"],
  ["shoulder press", "숄더 프레스"],
  ["chest press", "체스트 프레스"],
  ["pull-up", "풀업"],
  ["pull-ups", "풀업"],
  ["pull ups", "풀업"],
  ["pullup", "풀업"],
  ["chin-up", "친업"],
  ["chin-ups", "친업"],
  ["push-up", "푸시업"],
  ["push-ups", "푸시업"],
  ["pushups", "푸시업"],
  ["pushdown", "푸시다운"],
  ["pushdowns", "푸시다운"],
  ["pulldown", "풀다운"],
  ["pulldowns", "풀다운"],
  ["deadlift", "데드리프트"],
  ["deadlifts", "데드리프트"],
  ["squat", "스쿼트"],
  ["squats", "스쿼트"],
  ["lunge", "런지"],
  ["lunges", "런지"],
  ["flyes", "플라이"],
  ["flye", "플라이"],
  ["fly", "플라이"],
  ["crossover", "크로스오버"],
  ["crunch", "크런치"],
  ["crunches", "크런치"],
  ["sit-up", "싯업"],
  ["sit-ups", "싯업"],
  ["sit ups", "싯업"],
  ["row", "로우"],
  ["rows", "로우"],
  ["curl", "컬"],
  ["curls", "컬"],
  ["raise", "레이즈"],
  ["raises", "레이즈"],
  ["extension", "익스텐션"],
  ["extensions", "익스텐션"],
  ["shrug", "슈러그"],
  ["shrugs", "슈러그"],
  ["pullover", "풀오버"],
  ["walk", "워크"],
  ["walking", "워킹"],
  ["press", "프레스"],
  ["presses", "프레스"],
  ["dip", "딥"],
  ["dips", "딥스"],
  ["pullover", "풀오버"],
  ["rollout", "롤아웃"],
  ["roller", "롤러"],
  ["twist", "트위스트"],
  ["bridge", "브리지"],
  ["thrust", "스러스트"],
  ["step up", "스텝업"],
  ["step-up", "스텝업"],
  ["kickback", "킥백"],
  ["woodchopper", "우드초퍼"],
  ["windmill", "윈드밀"],
  ["drag", "드래그"],
  ["stretch", "스트레치"],
  ["rotation", "로테이션"],
  ["rotation", "로테이션"],
  ["rotations", "로테이션"],
  ["bound", "바운드"],
  ["circles", "서클"],
  ["circle", "서클"],
  ["jump", "점프"],
  ["jumping", "점핑"],
  ["carry", "캐리"],
  ["swing", "스윙"],
  ["clean", "클린"],
  ["jerk", "저크"],
  ["snatch", "스내치"],
  ["snatches", "스내치"],
  ["farmer's", "파머스"],
  ["farmers", "파머스"],
  ["arnold", "아놀드"],
  ["atlas", "아틀라스"],
  ["ab", "AB"],
  ["lat", "랫"],
  ["glute", "글루트"],
  ["hamstring", "햄스트링"],
  ["calf", "카프"],
  ["tricep", "트라이셉"],
  ["triceps", "트라이셉스"],
  ["bicep", "바이셉"],
  ["biceps", "바이셉스"],
  ["rear delt", "리어 델트"],
  ["front raise", "프론트 레이즈"],
  ["lateral raise", "레터럴 레이즈"],
  ["face pull", "페이스 풀"],
  ["side", "사이드"],
  ["reverse", "리버스"],
  ["leg", "레그"],
  ["legs", "레그"],
  ["legged", "레그드"],
  ["overhead", "오버헤드"],
  ["smith", "스미스"],
  ["bench", "벤치"],
  ["front", "프론트"],
  ["wrist", "리스트"],
  ["to", "투"],
  ["push", "푸시"],
  ["palms", "팜"],
  ["palm", "팜"],
  ["on", "온"],
  ["the", "더"],
  ["pull", "풀"],
  ["hip", "힙"],
  ["chest", "체스트"],
  ["over", "오버"],
  ["floor", "플로어"],
  ["split", "스플릿"],
  ["up", "업"],
  ["ups", "업"],
  ["bent", "벤트"],
  ["bar", "바"],
  ["box", "박스"],
  ["back", "백"],
  ["hang", "행"],
  ["shoulder", "숄더"],
  ["pulley", "풀리"],
  ["knee", "니"],
  ["knees", "니"],
  ["high", "하이"],
  ["power", "파워"],
  ["weighted", "웨이티드"],
  ["arm", "암"],
  ["arms", "암"],
  ["from", "프롬"],
  ["plate", "플레이트"],
  ["throw", "스로우"],
  ["low", "로우"],
  ["in", "인"],
  ["preacher", "프리처"],
  ["rope", "로프"],
  ["stance", "스탠스"],
  ["grip", "그립"],
  ["upright", "업라이트"],
  ["one", "원"],
  ["ball", "볼"],
  ["good", "굿"],
  ["sled", "슬레드"],
  ["body", "바디"],
  ["rear", "리어"],
  ["double", "더블"],
  ["down", "다운"],
  ["morning", "모닝"],
  ["sprint", "스프린트"],
  ["sprints", "스프린트"],
  ["head", "헤드"],
  ["lateral", "레터럴"],
  ["long", "롱"],
  ["lift", "리프트"],
  ["hops", "홉"],
  ["hop", "홉"],
  ["wide", "와이드"],
  ["linear", "리니어"],
  ["military", "밀리터리"],
  ["straight", "스트레이트"],
  ["stiff", "스티프"],
  ["suspended", "서스펜디드"],
  ["against", "어게인스트"],
  ["step", "스텝"],
  ["butt", "버트"],
  ["wall", "월"],
  ["chair", "체어"],
  ["blocks", "블록"],
  ["block", "블록"],
  ["oblique", "오블리크"],
  ["balance", "밸런스"],
  ["prone", "프론"],
  ["elevated", "엘리베이티드"],
  ["groin", "그로인"],
  ["quad", "쿼드"],
  ["isometric", "아이소메트릭"],
  ["sumo", "스모"],
  ["behind", "비하인드"],
  ["supine", "수파인"],
  ["deltoid", "델토이드"],
  ["backward", "백워드"],
  ["through", "스루"],
  ["bend", "벤드"],
  ["upper", "어퍼"],
  ["of", "오브"],
  ["off", "오프"],
  ["cross", "크로스"],
  ["hammer", "해머"],
  ["depth", "뎁스"],
  ["kick", "킥"],
  ["flexor", "플렉서"],
  ["ham", "햄"],
  ["cone", "콘"],
  ["inner", "이너"],
  ["treadmill", "트레드밀"],
  ["pass", "패스"],
  ["muscle", "머슬"],
  ["drill", "드릴"],
  ["resistance", "레지스턴스"],
  ["narrow", "내로우"],
  ["rack", "랙"],
  ["speed", "스피드"],
  ["vertical", "버티컬"],
  ["yoke", "요크"],
  ["zercher", "저처"],
  ["zottman", "조트만"],
  ["wind", "윈드"],
  ["windmills", "윈드밀"],
  ["windmill", "윈드밀"],
  ["upward", "업워드"],
  ["sidebend", "사이드 벤드"],
  ["anti-gravity", "안티 그래비티"],
  ["gravity", "그래비티"],
  ["axle", "액슬"],
  ["adductions", "어덕션"],
  ["adduction", "어덕션"],
  ["guillotine", "길로틴"],
  ["bear", "베어"],
  ["drags", "드래그"],
  ["powerlifting", "파워리프팅"],
  ["board", "보드"],
  ["bosu", "보수"],
  ["skip", "스킵"],
  ["judo", "유도"],
  ["russian", "러시안"],
  ["drivers", "드라이버"],
  ["driver", "드라이버"],
  ["carioca", "카리오카"],
  ["catch", "캐치"],
  ["handle", "핸들"],
  ["circus", "서커스"],
  ["bell", "벨"],
  ["clock", "클락"],
  ["cocoons", "코쿤"],
  ["conan's", "코난스"],
  ["conans", "코난스"],
  ["wheel", "휠"],
  ["crucifix", "크루시픽스"],
  ["cuban", "큐반"],
  ["dancer's", "댄서스"],
  ["dancers", "댄서스"],
  ["bug", "버그"],
  ["donkey", "동키"],
  ["downward", "다운워드"],
  ["drop", "드롭"],
  ["neutral", "뉴트럴"],
  ["pronation", "프로네이션"],
  ["supination", "수피네이션"],
  ["scaption", "스캡션"],
  ["elliptical", "엘립티컬"],
  ["trainer", "트레이너"],
  ["fast", "패스트"],
  ["skipping", "스키핑"],
  ["finger", "핑거"],
  ["flutter", "플러터"],
  ["kicks", "킥"],
  ["forward", "포워드"],
  ["frankenstein", "프랑켄슈타인"],
  ["freehand", "프리핸드"],
  ["or", "오어"],
  ["two", "투"],
  ["kettlebells", "케틀벨"],
  ["motion", "모션"],
  ["gironda", "지론다"],
  ["sternum", "스테넘"],
  ["goblet", "고블릿"],
  ["pins", "핀"],
  ["gorilla", "고릴라"],
  ["groiners", "그로이너"],
  ["handstand", "핸드스탠드"],
  ["pike", "파이크"],
  ["heaving", "히빙"],
  ["heavy", "헤비"],
  ["bag", "백"],
  ["flexion", "플렉션"],
  ["inchworm", "인치웜"],
  ["medium", "미디엄"],
  ["straps", "스트랩"],
  ["crosses", "크로스"],
  ["squeezes", "스퀴즈"],
  ["sides", "사이드"],
  ["wipers", "와이퍼"],
  ["jm", "JM"],
  ["janda", "잔다"],
  ["jefferson", "제퍼슨"],
  ["jogging", "조깅"],
  ["keg", "케그"],
  ["figure", "피겨"],
  ["between", "비트윈"],
  ["pirate", "파이럿"],
  ["ships", "십"],
  ["seesaw", "시소"],
  ["thruster", "스러스터"],
  ["kipping", "키핑"],
  ["across", "어크로스"],
  ["bars", "바"],
  ["forearm", "포어암"],
  ["part", "파트"],
  ["start", "스타트"],
  ["technique", "테크닉"],
  ["acceleration", "액셀러레이션"],
  ["log", "로그"],
  ["london", "런던"],
  ["bridges", "브리지"],
  ["looking", "루킹"],
  ["at", "앳"],
  ["ceiling", "실링"],
  ["cambered", "캠버드"],
  ["scoop", "스쿱"],
  ["mixed", "믹스드"],
  ["monster", "몬스터"],
  ["moving", "무빙"],
  ["claw", "클로"],
  ["series", "시리즈"],
  ["natural", "내추럴"],
  ["para", "파라"],
  ["half", "하프"],
  ["locust", "로커스트"],
  ["handed", "핸디드"],
  ["otis", "오티스"],
  ["into", "인투"],
  ["physioball", "피지오볼"],
  ["pin", "핀"],
  ["pinch", "핀치"],
  ["platform", "플랫폼"],
  ["slides", "슬라이드"],
  ["slide", "슬라이드"],
  ["plie", "플리에"],
  ["posterior", "포스테리어"],
  ["tibialis", "티비알리스"],
  ["partials", "파셜"],
  ["partial", "파셜"],
  ["stairs", "스테어"],
  ["stair", "스테어"],
  ["manual", "매뉴얼"],
  ["prowler", "프로울러"],
  ["pullups", "풀업"],
  ["plank", "플랭크"],
  ["positions", "포지션"],
  ["pyramid", "피라미드"],
  ["delivery", "딜리버리"],
  ["pulls", "풀"],
  ["recumbent", "리컴번트"],
  ["bike", "바이크"],
  ["return", "리턴"],
  ["ring", "링"],
  ["rocket", "로켓"],
  ["rocking", "라킹"],
  ["romanian", "루마니안"],
  ["climb", "클라임"],
  ["round", "라운드"],
  ["world", "월드"],
  ["rowing", "로잉"],
  ["runner's", "러너스"],
  ["runners", "러너스"],
  ["sandbag", "샌드백"],
  ["scapular", "스캐퓰러"],
  ["scissor", "시저"],
  ["scissors", "시저"],
  ["mornings", "모닝"],
  ["tucks", "턱"],
  ["shotgun", "샷건"],
  ["shuffle", "셔플"],
  ["progression", "프로그레션"],
  ["sit", "싯"],
  ["skating", "스케이팅"],
  ["sledgehammer", "슬레지해머"],
  ["spell", "스펠"],
  ["caster", "캐스터"],
  ["spinal", "스파이널"],
  ["dumbbells", "덤벨"],
  ["movers", "무버"],
  ["stairmaster", "스테어마스터"],
  ["wood", "우드"],
  ["chop", "찹"],
  ["above", "어보브"],
  ["gastrocnemius", "가스트록니미어스"],
  ["flexors", "플렉서"],
  ["squeeze", "스퀴즈"],
  ["soleus", "솔레우스"],
  ["achilles", "아킬레스"],
  ["touches", "터치"],
  ["touchers", "터치"],
  ["towel", "타월"],
  ["star", "스타"],
  ["mill", "밀"],
  ["stomach", "스토머크"],
  ["vacuum", "배큠"],
  ["superman", "슈퍼맨"],
  ["fallout", "폴아웃"],
  ["svend", "스벤드"],
  ["tate", "테이트"],
  ["straddle", "스트래들"],
  ["abductor", "앱덕터"],
  ["adductor", "어덕터"],
  ["tire", "타이어"],
  ["trail", "트레일"],
  ["trap", "트랩"],
  ["attachment", "어태치먼트"],
  ["grab", "그랩"],
  ["sissy", "시시"],
  ["ankle", "앵클"],
  ["skull", "스컬"],
  ["crusher", "크러셔"],
  ["crushers", "크러셔"],
  ["hack", "핵"],
  ["crawl", "크롤"],
  ["bicycling", "바이시클링"],
  ["stationary", "스테이셔너리"],
  ["mid", "미드"],
  ["bends", "벤드"],
  ["bottoms", "바텀"],
  ["bottom", "바텀"],
  ["position", "포지션"],
  ["bradford", "브래드포드"],
  ["rocky", "라키"],
  ["flip", "플립"],
  ["delt", "델트"],
  ["twists", "트위스트"],
  ["elbows", "엘보"],
  ["elbow", "엘보"],
  ["hands", "핸드"],
  ["hand", "핸드"],
  ["car", "카"],
  ["quick", "퀵"],
  ["chain", "체인"],
  ["extended", "익스텐디드"],
  ["dead", "데드"],
  ["deficit", "데피싯"],
  ["leap", "리프"],
  ["facing", "페이싱"],
  ["pronated", "프로네이티드"],
  ["dynamic", "다이내믹"],
  ["range", "레인지"],
  ["frog", "프로그"],
  ["hurdle", "허들"],
  ["full", "풀"],
  ["chins", "친"],
  ["chin", "친"],
  ["below", "빌로우"],
  ["hug", "허그"],
  ["intermediate", "인터미디엇"],
  ["inverted", "인버티드"],
  ["iron", "아이언"],
  ["exercise", "엑서사이즈"],
  ["jackknife", "잭나이프"],
  ["load", "로드"],
  ["pistol", "피스톨"],
  ["turkish", "터키시"],
  ["get", "겟"],
  ["style", "스타일"],
  ["parallel", "패러럴"],
  ["tuck", "턱"],
  ["landmine", "랜드마인"],
  ["jammer", "재머"],
  ["face", "페이스"],
  ["middle", "미들"],
  ["olympic", "올림픽"],
  ["your", "유어"],
  ["swings", "스윙"],
  ["slam", "슬램"],
  ["open", "오픈"],
  ["laterals", "레터럴"],
  ["pelvic", "펠빅"],
  ["tilt", "틸트"],
  ["plyo", "플라이오"],
  ["close", "클로즈"],
  ["feet", "피트"],
  ["hyperextension", "하이퍼익스텐션"],
  ["rickshaw", "릭쇼"],
  ["concentration", "컨센트레이션"],
  ["harness", "하네스"],
  ["single", "싱글"],
  ["stride", "스트라이드"],
  ["spider", "스파이더"],
  ["toe", "토"],
  ["thigh", "사이"],
  ["anti", "안티"],
  ["point", "포인트"],
  ["run", "런"],
  ["release", "릴리즈"],
  ["a", "어"],
  ["an", "언"],
];

const cleanupReplacements = [
  [/벤치 프레스/g, "벤치프레스"],
  [/원 암/g, "원암"],
  [/투 암/g, "투암"],
  [/풀 업/g, "풀업"],
  [/친 업/g, "친업"],
  [/싯 업/g, "싯업"],
  [/스텝 업/g, "스텝업"],
  [/Ez Bar/g, "EZ바"],
  [/Db/g, "덤벨"],
  [/Smr/g, "폼롤링"],
  [/ And /g, " & "],
  [/ With /g, " "],
  [/파머의 워크/g, "파머스 워크"],
  [/세계 최대의 스트레칭/g, "세계 최고의 스트레칭"],
  [/Ab /g, "AB "],
  [/ - (미디엄|중간) 그립/g, ""],
  [/ \(단일 응답\)/g, ""],
  [/ \(여러 응답\)/g, ""],
  [/ +/g, " "],
];

function normalizeKey(value) {
  return String(value)
    .toLowerCase()
    .replaceAll(/\(multiple response\)|\(single response\)|- medium grip/g, "")
    .replaceAll("rope jumping", "jump rope")
    .replaceAll("triceps", "tricep")
    .replaceAll(/[^a-z0-9가-힣]+/g, "");
}

function translateFallback(name) {
  const lower = name.toLowerCase();
  let value = ` ${lower} `;
  const sortedEnglishPhraseMap = [...englishPhraseMap];
  sortedEnglishPhraseMap.sort((a, b) => b[0].length - a[0].length);
  for (const [from, to] of sortedEnglishPhraseMap) {
    const escapedFrom = from.replaceAll(/[.*+?^${}()|[\]\\]/g, String.raw`\$&`);
    const pattern = new RegExp(`(?<![a-z])${escapedFrom}(?![a-z])`, "gi");
    value = value.replaceAll(pattern, ` ${to} `);
  }
  value = value
    .replaceAll(/[()]/g, " ")
    .replaceAll("/", " / ")
    .replaceAll("-", " ")
    .replaceAll(/\s+/g, " ")
    .trim();
  let titled = value
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      if (/^[A-Z0-9/]+$/.test(token)) return token;
      if (/[가-힣]/.test(token)) return token;
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ");
  for (const [pattern, replacement] of cleanupReplacements) titled = titled.replaceAll(pattern, replacement).trim();
  return titled;
}

function mapEquipment(value, name = "") {
  const equipment = String(value ?? "").toLowerCase();
  const lowerName = String(name).toLowerCase();
  if (lowerName.includes("band")) return "resistance_band";
  if (equipment === "barbell") return "barbell";
  if (equipment === "olympic barbell") return "barbell";
  if (equipment === "ez barbell") return "barbell";
  if (equipment === "dumbbell") return "dumbbell";
  if (equipment === "machine") return "machine";
  if (equipment === "leverage machine") return "machine";
  if (equipment === "smith machine") return "machine";
  if (equipment === "sled machine") return "machine";
  if (equipment === "cable") return "cable";
  if (equipment === "body weight") return "bodyweight";
  if (equipment === "body only") return "bodyweight";
  if (equipment === "kettlebell") return "kettlebell";
  if (equipment === "kettlebells") return "kettlebell";
  if (equipment === "band") return "resistance_band";
  if (equipment === "resistance band") return "resistance_band";
  if (equipment === "bands") return "resistance_band";
  if (equipment === "e-z curl bar") return "barbell";
  if (equipment === "medicine ball") return "medicine_ball";
  if (equipment === "stability ball") return "stability_ball";
  return "none";
}

function mapDifficulty(level) {
  if (level === "beginner") return "beginner";
  if (level === "intermediate") return "intermediate";
  return "advanced";
}

function mapCategory(exercise) {
  const category = String(exercise.category ?? "").toLowerCase();
  if (category === "stretching") return "flexibility";
  if (category === "cardio" || category === "plyometrics") return "cardio";
  if (category === "powerlifting" || category === "olympic weightlifting" || category === "strongman") return "strength";
  if (category === "strength" && exercise.mechanic === "isolation") return "hypertrophy";
  if (exercise.force === "static") return "endurance";
  return "strength";
}

const bodyPartRules = [
  ["chest", /(chest|pectoral)/],
  ["back", /(lat|middle back|lower back|traps|trapezius|rhomboids|erector spinae)/],
  ["shoulders", /(deltoid|shoulder|rotator cuff|levator scapulae)/],
  ["arms", /(biceps|triceps|forearms|brachialis|brachioradialis|wrist flexors)/],
  ["legs", /(quadriceps|hamstrings|calves|adductors|abductors|tibialis|groin)/],
  ["glutes", /(glutes|glute medius|glute)/],
  ["abs", /(abdominals|obliques|abs|serratus)/],
];

function findBodyPart(text, allowAbs = true) {
  for (const [bodyPart, pattern] of bodyPartRules) {
    if (bodyPart === "abs" && !allowAbs) continue;
    if (pattern.test(text)) return bodyPart;
  }
  return "";
}

function mapBodyPart(exercise) {
  const category = String(exercise.category ?? "").toLowerCase();
  const bodyPart = String(exercise.body_part ?? exercise.bodyPart ?? "").toLowerCase();
  const categoryBodyPart = mapBodyPartLabel(bodyPart || category);
  if (categoryBodyPart) return categoryBodyPart;
  if (category === "stretching") return "stretching";
  if (category === "cardio" || category === "plyometrics") return "cardio";
  if (category === "powerlifting" || category === "olympic weightlifting" || category === "strongman") return "full_body";

  const primary = (exercise.primaryMuscles ?? []).map((item) => String(item).toLowerCase());
  const secondary = (exercise.secondaryMuscles ?? []).map((item) => String(item).toLowerCase());
  const primaryText = primary.join(" ");
  const combinedText = [...primary, ...secondary].join(" ");

  const primaryBodyPart = findBodyPart(primaryText, primary.length <= 2);
  if (primaryBodyPart) return primaryBodyPart;

  const combinedBodyPart = findBodyPart(combinedText);
  if (combinedBodyPart) return combinedBodyPart;

  if ((exercise.primaryMuscles ?? []).length >= 3) return "full_body";
  return "full_body";
}

function mapBodyPartLabel(value) {
  switch (String(value ?? "").toLowerCase()) {
    case "back":
      return "back";
    case "cardio":
      return "cardio";
    case "chest":
      return "chest";
    case "lower arms":
    case "upper arms":
      return "arms";
    case "lower legs":
    case "upper legs":
      return "legs";
    case "neck":
      return "full_body";
    case "shoulders":
      return "shoulders";
    case "waist":
      return "abs";
    default:
      return "";
  }
}

function titleCaseName(name) {
  return String(name ?? "")
    .split(" ")
    .filter(Boolean)
    .map((token) => {
      if (/^[(/)-]+$/.test(token)) return token;
      if (token === "v-bar") return "V-Bar";
      if (token === "ez") return "EZ";
      return token.charAt(0).toUpperCase() + token.slice(1);
    })
    .join(" ")
    .replaceAll(/\b\(([^)]+)\)/g, (match) => match.toUpperCase());
}

function buildHasanExercise(exercise) {
  const sourceName = String(exercise.name ?? "").trim();
  const displayName = titleCaseName(sourceName);
  const nameKo = manualNameOverrides.get(sourceName) ?? manualNameOverrides.get(displayName) ?? translateFallback(sourceName);
  const target = String(exercise.target ?? "").trim();
  const muscleGroup = String(exercise.muscle_group ?? "").trim();
  const primaryMuscles = [target].filter(Boolean);
  const secondaryMuscles = Array.from(new Set([
    ...(Array.isArray(exercise.secondary_muscles) ? exercise.secondary_muscles : []),
    muscleGroup,
  ].filter(Boolean)));
  const instructions = Array.isArray(exercise.instruction_steps?.en)
    ? exercise.instruction_steps.en
    : String(exercise.instructions?.en ?? "").split(/(?<=\.)\s+/).filter(Boolean);

  return {
    name: displayName,
    nameKo,
    bodyPart: mapBodyPart({
      ...exercise,
      primaryMuscles,
      secondaryMuscles,
    }),
    equipment: mapEquipment(exercise.equipment, sourceName),
    category: String(exercise.category ?? "").toLowerCase() === "cardio" ? "cardio" : "strength",
    difficulty: "intermediate",
    description: sourceName,
    descriptionKo: null,
    primaryMuscles,
    secondaryMuscles,
    instructions,
    instructionsKo: null,
    gifUrl: null,
    secondaryImages: [],
  };
}

function buildImageUrls(images = []) {
  const urls = images.map((image) => `https://raw.githubusercontent.com/yuhonas/free-exercise-db/main/exercises/${encodeURIComponent(image)}`);
  return {
    gifUrl: urls[0] ?? null,
    secondaryImages: urls.slice(1),
  };
}

async function main() {
  const sourceExercises = await loadSourceExercises();
  const hasanExercises = await loadHasanSourceExercises();
  const existingKeys = new Set();
  for (const exercise of existingExercises) {
    existingKeys.add(normalizeKey(exercise.name));
    existingKeys.add(normalizeKey(exercise.nameKo));
  }

  const outputKeys = new Set(existingKeys);
  const output = [];

  for (const exercise of sourceExercises) {
    const sourceName = exercise.name;
    const nameKo = manualNameOverrides.get(sourceName) ?? translateFallback(sourceName);
    const nameKey = normalizeKey(sourceName);
    const nameKoKey = normalizeKey(nameKo);

    if ((nameKey && outputKeys.has(nameKey)) || (nameKoKey && outputKeys.has(nameKoKey))) {
      continue;
    }

    output.push({
      name: exercise.name,
      nameKo,
      bodyPart: mapBodyPart(exercise),
      equipment: mapEquipment(exercise.equipment, exercise.name),
      category: mapCategory(exercise),
      difficulty: mapDifficulty(exercise.level),
      description: exercise.name,
      descriptionKo: null,
      primaryMuscles: exercise.primaryMuscles ?? [],
      secondaryMuscles: exercise.secondaryMuscles ?? [],
      instructions: exercise.instructions ?? [],
      instructionsKo: null,
      ...buildImageUrls(exercise.images),
    });
    outputKeys.add(nameKey);
    outputKeys.add(nameKoKey);
  }

  for (const sourceExercise of hasanExercises) {
    const exercise = buildHasanExercise(sourceExercise);
    const nameKey = normalizeKey(sourceExercise.name);
    const displayNameKey = normalizeKey(exercise.name);
    const nameKoKey = normalizeKey(exercise.nameKo);

    if (
      (nameKey && outputKeys.has(nameKey)) ||
      (displayNameKey && outputKeys.has(displayNameKey)) ||
      (nameKoKey && outputKeys.has(nameKoKey))
    ) {
      continue;
    }

    output.push(exercise);
    if (nameKey) outputKeys.add(nameKey);
    if (displayNameKey) outputKeys.add(displayNameKey);
    if (nameKoKey) outputKeys.add(nameKoKey);
  }

  fs.writeFileSync(targetPath, JSON.stringify(output, null, 2) + "\n", "utf8");
  console.log(`Generated ${output.length} bulk exercises to ${path.relative(projectRoot, targetPath)}`);
}

try {
  await main();
} catch (error) {
  console.error(error);
  process.exitCode = 1;
}
