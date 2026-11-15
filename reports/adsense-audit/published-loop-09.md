# 공개 글 AdSense 평가 — 루프 09

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-09.md) · [재검토 기록](double-check-loop-09.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일2026-10-18. 루브릭v1.2·anchors·antipatterns를 적용했다. 기준HEAD `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. CMake7편·CXL3편을 첫 행부터 끝까지 직접 읽었다. 이 묶음은 Luna 초벌 없이 Sol이 원문부터 직접 검토했다. D의 아래 대응 구간·F의 링크 후행 설명/실제slug/title/seriesOrder/draft를 대조했다. 본문·기존보고서·사용자미커밋작업은바꾸지않았다. 전편score_status=잠정, confidence=중간.

기존보고서커밋ba9f7104이후대상10편의diff는없다. D는현재원문을비교했으며점수차이는평가재판정이다. UART/ISR/Build 앵커는루프15에서읽은`10550ca1:src/content/blog/embedded/modern-recipes/`의part1-04-uart-hardware·part6-09-isr-api·part7-05-kernel-build 과거전문(49/40/50)을쓴다. 현재Recipes개선본/Part12rename와구분하며Recipes는D비교에허용된다.

표의cmake는`src/content/blog/tools/build/cmake/`,cxl은`src/content/blog/embedded/hardware/cxl/`의단축명이다. D/F에서같은시리즈chapter는그디렉터리기준,Recipes=`src/content/blog/embedded/modern-recipes/`,Performance=`src/content/blog/embedded/performance-engineering/`,HBM=`src/content/blog/embedded/hardware/hbm/`,Sanitizers=`src/content/blog/tools/debugging/sanitizers/`,GNU-Make=`src/content/blog/tools/build/gnu-make/`다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `cmake/chapter03-targets.md` | 13 | 13 | 7 | 10 | 8 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cmake/chapter04-options.md` | 11 | 12 | 7 | 10 | 7 | 5 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cmake/chapter05-find-package.md` | 11 | 12 | 6 | 10 | 7 | 6 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cmake/chapter06-testing.md` | 11 | 12 | 8 | 11 | 7 | 6 | 3 | **58** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cmake/chapter07-install.md` | 11 | 13 | 8 | 12 | 8 | 7 | 2 | **61** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cmake/chapter08-best-practices.md` | 11 | 12 | 6 | 8 | 7 | 6 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cmake/chapter09-modern-advanced.md` | 11 | 11 | 6 | 8 | 7 | 7 | 3 | **53** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cxl/chapter01-cxl-position.md` | 13 | 12 | 4 | 9 | 8 | 5 | 3 | **54** | 검증됨 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cxl/chapter02-system-architecture.md` | 14 | 12 | 5 | 9 | 7 | 7 | 3 | **57** | 검증됨 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `cxl/chapter03-coherency-model.md` | 14 | 13 | 7 | 11 | 7 | 5 | 3 | **60** | 검증됨 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |

합계563, 평균56.3, 범위52~61. 이전562대비+1이다. 우선조치7편·보강2편·병합검토1편. 기존CMake6건오류확인은유지하고ch09를공식문서/실행으로새오류확인한다. CXL3편은출처기록이있는기존팩트체크의검증됨을유지한다. 총점동의9/10·판정동의9/10. 본문범위P0미발견. [공통게이트](double-check-gates-2026-10-18.md)의check/build/links/sitemap/ads/anchors/reading통과를인용하며기술주장검증·모바일육안확인으로간주하지않는다.

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 | 항목 동의/변경 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `cmake/chapter03-targets.md` | 60 | 60 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `cmake/chapter04-options.md` | 53 | 54 | 1 | 우선 조치 | 우선 조치 | F4→5: ch05옵션안내는실제find옵션으로이행 |
| `cmake/chapter05-find-package.md` | 54 | 54 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `cmake/chapter06-testing.md` | 58 | 58 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `cmake/chapter07-install.md` | 61 | 61 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `cmake/chapter08-best-practices.md` | 52 | 52 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `cmake/chapter09-modern-advanced.md` | 53 | 53 | 0 | 병합 검토 | 우선 조치 | B12→11: UserPresets오류확인; E6→7: 제목세기능실제이행 |
| `cxl/chapter01-cxl-position.md` | 54 | 54 | 0 | 보강 | 보강 | A~G 동의 |
| `cxl/chapter02-system-architecture.md` | 57 | 57 | 0 | 병합 검토 | 병합 검토 | A~G 동의 |
| `cxl/chapter03-coherency-model.md` | 60 | 60 | 0 | 보강 | 보강 | A~G 동의 |

## 오류게이트 확인

CMake4.4.4의설치된공식도움말을직접열었다. 실행환경macOS arm64,프로브경로`/private/tmp/adsense-loop09-probes/`다. 전체문서의모든API/모든이전판을검증한것은아니다.

- ch03 660~661행plain target_link_libraries가CMake3.x에서경고/오류라는주장: `cmake --help-command target_link_libraries`의‘Libraries for both a Target and its Dependents’는plain서명을정의하고기본transitive라고명시한다. `cmake_minimum_required(VERSION 3.15)`,CXX프로젝트,`add_library(mylib INTERFACE)`,`add_executable(app main.cpp)`,`target_link_libraries(app mylib)`와빈main을만들어 `cmake -S /private/tmp/adsense-loop09-probes -B /private/tmp/adsense-loop09-probes/build-executable`이exit0/경고없음이었다. 최초INTERFACE수신타입프로브는실제app과조건이달라근거에서버렸고실행파일타입으로교정해검사했다.
- ch04 337·346행cmakedefine01/OFF의생성결과368행undef ↔380행define0규칙은직접충돌. `cmake --help-command configure_file`에서01형식은VAR0/VAR1임을확인해오류유지.379행일반cmakedefine의값표현도별도로확인이필요하다.
- ch05 155행콜론예와549~552행세미콜론은환경변수와CMake변수조건혼동가능성을구분한다. `cmake --help-variable CMAKE_PREFIX_PATH`는CMake변수를semicolon목록으로정의하고환경변수를별도로말한다. 더확실한근거는127행기본Config-first단정으로, `cmake --help-command find_package`는기본Module-first,실패시Config이며CMAKE_FIND_PACKAGE_PREFER_CONFIG로역전한다고명시한다. 이공식대조로오류확인을유지한다.
- ch06 317행DEPENDS가선행test‘통과후’실행한다는주장: `cmake --help-property DEPENDS`는선행결과를고려하지않고오직실행순서만제약한다고정의한다.성공의존은fixture를보라고한다.오류유지.
- ch07 264행Config가ConfigVersion/Targets둘다include한다는일반설명은272~279행템플릿과맞지않는다. 코드의생략만으로단정하지않고 `cmake --help-manual cmake-packages.7`의Package Version File절을확인했다.버전요청시find_package가version파일을별도scope에먼저로드해호환성을검사한뒤config를받는절차이므로Config가Version을include한다는설명이잘못됐다.의존성없는예에find_dependency가없다는사실자체는오류아니다.
- ch08 273행최소3.20·312행PROJECT_IS_TOP_LEVEL무조건사용 ↔338/348행3.21추가/3.20이하fallback안내. `cmake --help-variable PROJECT_IS_TOP_LEVEL`은versionadded3.21로확인된다.3.20실행환경은없어실제구동했다고적지않지만지원판계약오류는확인됨.
- ch09 314행UserPresets가함께있으면덮어쓴다는단정: `cmake --help-manual cmake-presets.7`은양파일합집합에동일이름configurepreset을허용하지않는다.두파일에각각version6/name=debug/Ninja/binaryDir를base와user로다르게둔뒤 `cmake --list-presets` 실행시exit1,`Duplicate preset: "debug"`. 덮어쓰기규칙으로설명하면실패하므로미검증→오류확인.상속으로개인preset을따로만드는것과구분한다.75행ALL없는custom과95행ALL있는custom은조건이다르므로내부오류아니다.

CXL 검증됨의근거는기억이나이전보고서평점이아니라직접읽은커밋본문이다. `git show --format=%B --no-patch a0eeea28`의Ch1은CXL3.1revisionhistory/FlexBus§6·3.2/4.0발표·2025-12웨비나·drivers/cxl/acpi.c,Ch2는§2.4.4·§2.5·LDPoolCCI·4.0BundledPort·LinuxCXL_DEVTYPE_DEVMEM,Ch3는§2.2.1/2.2.2·Linuxport.c/target_type·ndctlcxl-list대조기록을명시한다. `be8f2ec9`는Ch1의TSP를§11.5의TEE Security Protocol로고친추가출처기록이다. e2aa6b02는footer정리여서새검증으로세지않았다. 이번에CXLspec전문을재fetch했다고쓰지않으며기존팩트체크출처기록을루브릭3-1허용범위로승계한다.

## 글별 근거

A/B/C/E/G의기존인용중아래에남긴부분은전문과대조해채택했다. D/F는현재원문기준으로다시썼다. 불확실이남아B≤13,출처·환경없는수치는C≤8,절차만이면C≤9를먼저적용했다. 추가내용이제목에나열되지않았다는사실만으로제목의약속미이행이라하지않는다.

### `cmake/chapter03-targets.md`

source_file: `src/content/blog/tools/build/cmake/chapter03-targets.md`

score_status:잠정 · score:60 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0미발견/P1위오류게이트확인. uncertainties:171행INTERFACE모든속성단정·450행alias범위·522행명시링크만빌드단정미검증.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 이 글만의 것은 키워드를 고르는 세 질문과 조합 표(264~280행), add_subdirectory의 변수 스코프와 타겟 전역성 대비(464~514행), 전역 설정이 깨지는 세 이유(28~32행)다. 타겟 종류 표(65~69행), 확장자 표(136~157행), 가시성 표(215~219행), 별칭 설명(428~450행)은 공식 문서와 732행 참고 글의 표준 내용이다. 측정과 실패 사례가 없어 13~19 구간의 아래쪽이다. |
| B | 13 | 왜 타겟인가(13~57행) → 타겟 종류 → 라이브러리 4종(124~207행) → 가시성(211~326행) → 연결·체인(330~367행) → 구조·별칭·서브디렉터리(371~579행) → 실전 예시(591~635행) → 흔한 실수(639~710행) → 정리(714~722행)로 흐름은 갖췄다. 233~262행과 282~310행에 같은 mylib 예제가 두 번 나오고, 324~326행은 위 그림을 다시 가리키기만 한다. 660행 오류와 171·450행 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 코드 조각은 많지만 CMake 버전·생성기·컴파일러 같은 실행 환경이 없다. 예상 결과는 474~482행 message 주석과 692행 오류 문구 정도다. compile 명령에서 -I·-D가 전파되는 것을 확인하는 절차가 없고, 591~635행 예시는 소스 트리가 없어 그대로 재현되지 않는다. 4~7 구간. |
| D | 10 | 이 글235~262·284~310행 ↔ chapter08 73~95행 PUBLIC include/PRIVATE src 예 반복.400~424행 ↔ chapter09 227~261행 BUILD/INSTALL_INTERFACE.464~494행 ↔ chapter02 122~141행 scope 개괄. 다른 시리즈 Recipes part3-11-make-cmake-cross.md257~264행은 target_*를 쓸 뿐 전파를 설명하지 않는다. 가시성 정본 역할은 남아10. |
| E | 8 | 제목의 'INTERFACE·PUBLIC·PRIVATE 전파'는 211~326행과 340~354행 의존성 체인에서 다룬다. 53~57행이 목표 셋을 밝히고 정리(714~722행)가 같은 항목으로 닫는다. description(5행) '타겟 중심 접근법과 라이브러리 생성'은 일반적이고 대상 독자가 없어 9 미만. |
| F | 7 | 726행nextch04 order4·option/cache/Presets본론116/56/418행대응.736~739행ch02/ch04/ch08/GNU-Makechapter02-rules의title/주제맞음.587행ch09custom절은실제27행,326행내부전파절도있음.53~57·264~280행고유목표/선택안내로7.494행자기링크와반복때문에8아님. |
| G | 2 | 참고 자료(730~732행)와 740행에 cmake.org 문서가 있지만 모두 'latest' 링크라 버전이 없다. 171행, 660행, 34행 'CMake 3.0(2014)' 같은 주장에 연결되지 않는다. 버전 표기는 549·596행 cmake_minimum_required 3.15뿐이다. |

병합 대상: chapter08/09의전파/interface중복절. 다음조치:타겟전파정본으로보강하고plain서명설명정정.

### `cmake/chapter04-options.md`

source_file: `src/content/blog/tools/build/cmake/chapter04-options.md`

score_status:잠정 · score:54 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0미발견/P1위오류게이트확인. uncertainties:128행option(yes)처리·CMP0077정책조건·399행fileGENERATE시점·MSVCsanitizer·presetformat버전미검증.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | 캐시 타입 표(64~70행), FORCE(104~112행), CMakeDependentOption(216~246행), FeatureSummary(248~268행), Presets 구조·상속(418~512행)은 공식 문서 항목을 옮긴 수준이다. 이 글만의 것은 option()과 set(CACHE STRING) 선택 표(133~148행), @ONLY가 필요한 이유(382~390행), configure_file vs file(GENERATE) 비교(392~414행), 흔한 실수 네 가지(624~680행)다. 112행 '신중히 사용하세요', 131행 '건너뛸 수 있습니다'는 기준 대신 쓴 완곡 표현이다. 앵커 part1-04(10)보다 비교 관점이 조금 더 있다. |
| B | 12 | 캐시 필요성(13~52행) → 캐시 변수(56~112행) → option(116~185행) → 일반 변수 우선(189~210행) → 조건부 옵션(214~268행) → 빌드 타입(272~315행) → configure_file(319~414행) → Presets(418~512행) → 캐시 관리(516~546행) → 실전 예시(550~620행) → 흔한 실수 → 정리(684~693행)로 흐름은 완성됐다. 368행 생성 결과가 380행 규칙과 어긋나고, 129행 CMP0077은 NEW가 켜지는 조건을 적지 않았다. 122행 '동치'라 해 놓고 125행에서 '세 가지 차이'를 든다. |
| C | 7 | CMakeCache.txt 출력(40~50행), -D 명령(84~86행), 캐시 확인·초기화(520~546행), 전체 CMakeLists(552~620행)가 있다. CMake 버전·생성기·OS가 없고, 36행 'find_package 수십 개면 매번 수십 초'는 출처·환경 없는 수치라 C ≤ 8. 266행 FeatureSummary 출력은 서술이고 368행은 380행과 모순이다. 315행 'Visual Studio에서도 Debug에서만 sanitizer'는 308행 `-fsanitize=address,undefined`가 MSVC에서 통하는지 보이지 않는다. |
| D | 10 | 641~654·295~315행 ↔ chapter08 590~603행 multi-config 함정,418~512행 ↔ chapter09 265~314행 version6/inherits/--preset. chapter02 128~140행은cache소개뿐이다. Sanitizers chapter05-cmake-ci.md32~66·149~184행은ASan/TSan분리선택이달라같은preset도질문구분. 캐시 본론은 독립이므로10. |
| E | 7 | 제목(2행) 키워드 option·set·cache type은 56~148행에서 모두 다룬다. 본문 상당 부분이 제목에 없는 configure_file(319~414행)·CMakePresets(418~512행)로 넓어지고, description(5행)은 독자가 얻는 결과를 말하지 않는다. |
| F | 5 | 697행nextch05 order5·find/fetch실제65/347행대응.707행ch03·710행Sanitizersch05내용맞음.708행‘옵션으로의존성탐색제어’는대상127~136·172~205행CONFIG/MODULE/REQUIRED/QUIET/COMPONENTS가실제로다뤄맞음(option()함수가없다는이유로기각하지않음).709행GNU-Makechapter01-intro에는조건부변수설명이없어오안내한건은남음. F≤5상한내5로조정. |
| G | 2 | 701~703행 참고 자료는 cmake.org set·option·cmake-presets 'latest' 링크 3개로 버전이 없고, 129행 CMP0077, 375~380행 치환 규칙, 398~399행 file(GENERATE) 평가 시점에 인라인 출처가 없다. configure_file·file(GENERATE)·CMakeDependentOption 문서는 없다. 129행 3.13, 420행 3.19 표기는 있지만 예제를 돌린 버전은 없다. |

병합 대상: 병합대상없음. 다음조치:cache/option정본으로보강,Presets공통절은chapter09와분담.

### `cmake/chapter05-find-package.md`

source_file: `src/content/blog/tools/build/cmake/chapter05-find-package.md`

score_status:잠정 · score:54 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0미발견/P1위오류게이트확인. uncertainties:61/367/492행하이브리드최소판차이·439/524행생략hash·모든OS동작범위미검증.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | 84~127행이 Module·Config 모드 차이를, 123행이 Config 쪽이 더 정확한 이유('라이브러리가 자기 정보를 들고 다닌다')를 든다. 141~149행은 --debug-find 진단, 365~382행은 FetchContent 단점과 ExternalProject 선택 기준이다. 141행 '모드에 따라 미묘하게 다릅니다'는 실제 탐색 순서 대신 완곡 표현으로 끝난다. 151~158행 변수 표와 pkg-config 절은 문서 예 나열이다. 앵커 part1-04(10)와 비슷하거나 조금 위. |
| B | 12 | 13~61행 도입 → Module/Config → 검색 경로(139~168행) → FetchContent → 폴백(469행~) → ExternalProject → 탐색 경로(545행~) → 정리(700행~)로 흐름은 이어진다. 비교표가 369~382행과 531~541행에 두 번, '### 기본 사용법' heading이 384·386행에 연달아 나온다. 하이브리드 패턴 버전도 61행 '(3.25+)'와 367·492행 '3.24+'로 다르다. 155행 모순까지 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 6 | 143~147행 --debug-find, 162~168행 -DCMAKE_PREFIX_PATH·-DZLIB_DIR, 451~465행 옵션 설정은 있다. CMake 버전·OS가 없고 기대 출력도 없다(149행 '출력에 … 모두 찍힙니다'뿐). 439행 URL_HASH는 '...'로 잘렸고 524행은 `SHA256=...`이라 그대로 따라 하면 실패한다. |
| D | 10 | 469~487행 ↔ chapter08 480~503행 시스템 우선/fetch 폴백,447~465행 ↔ chapter08 506~515행 MakeAvailable 전 옵션.458~464행 ↔ chapter06 352~361행 동일 googletest 태그/선언. 인접chapter04 56~185행은cache,chapter06 68~85행은test등록으로역할다름. 패키지탐색 정본은 남아10. |
| E | 7 | 제목 키워드 Module·Config·FetchContent를 59~61행이 약속하고 84~137행, 347~510행에서 다룬다. 5행 description '외부 라이브러리 탐색, FetchContent, 그리고 의존성 관리.'는 막연하고 대상 독자가 없다. |
| F | 6 | 712행nextch06 order6및enable_testing/add_test/GTest실제내용일치.722~724행ch04cache/ch06test/ch08target의후행설명도각대상과맞음.57~61행고유장범위가있으나384/386행중복heading·반복표때문에기본6. |
| G | 2 | 716~718행 참고 자료는 cmake.org/cmake/help/latest 링크 3개뿐이라 기준 버전이 없고 본문 주장과 직접 이어지지 않는다. 본문의 버전 표기(158·568행 3.12, 367·492행 3.24, 375행 3.11, 61행 3.25)는 출처 없이 적혔다. |

병합 대상: chapter08find/fetch폴백절. 다음조치:탐색우선순위정정후버전/실행관찰보강.

### `cmake/chapter06-testing.md`

source_file: `src/content/blog/tools/build/cmake/chapter06-testing.md`

score_status:잠정 · score:58 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0미발견/P1위오류게이트확인. uncertainties:176행기본timeout·312행DISABLED표시·502행Catch2SECTION개별등록·759행cross실패범위미검증.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | 본문 대부분이 CTest·GoogleTest 모듈 문서를 다시 정리한 내용이다(add_test 70~85행, -R/-E/-L 127~139행, 속성 표 306~317행). 이 글만의 해석은 PROCESSORS 4와 -j8로 2개씩 도는 계산(319행), 크로스 컴파일에서 gtest_discover_tests가 실패하는 이유와 대안(759~767행), CI 단계별 라벨 운용(203~209·276행) 정도다. 36행 '50년 가까이 살아남은 빌드 도구의 미학', 32행 '모든 CI 시스템이 기본으로 지원'은 근거 없는 수사다. |
| B | 12 | 동기(13~32행) → 기초(40~117행) → 옵션(121~166행) → 속성(170~248행) → fixture·스크립트 모드(252~339행) → GTest·Catch2(343~502행) → 커버리지(506~569행) → 실전 예시(573~714행) → 정리·흔한 실수(718~799행)로 끝난다. 32행이 말한 JUnit 출력은 예가 없다. 라벨 186~209·254~276행, RESOURCE_LOCK 151~157·770~783행, enable_testing 위치 44·733~741행, -O0 커버리지 528·785~799행이 반복된다. 317행 오류와 176·312·502행 불확실이 열려 있어 B ≤ 13. |
| C | 8 | 실행할 수 있는 명령과 CMakeLists(91~103행, 600~714행), 예시 출력(107~117행 ctest 결과, 409~413행 ctest -N)이 있다. CMake·컴파일러 버전과 실행 환경이 없고 출력이 실제 실행 결과인지 알 수 없다. 176행 '기본 타임아웃은 1500초(25분)'는 출처·조건 없는 수치라 C ≤ 8. 합격·실패를 가르는 검증 절차가 없다. |
| D | 11 | 349~361행 ↔ chapter05 421~428·454~464행 googletest블록.62~65·627~630행 ↔ chapter08 311~314·342~345행 testing구조. 인접chapter07 52~116행install은다른질문. fetch몇줄외실제test실행전담역할은분명해11. |
| E | 7 | 제목은 'add_test·테스트 fixture·리포트'(2행), description은 'CTest와 Google Test, Catch2 연동'(5행)이다. add_test는 68~85행, fixture는 278~302행, GTest·Catch2는 343~502행이다. '리포트'는 커버리지 리포트(530~569행)뿐이고 테스트 결과 리포트(JUnit)는 32행 한 구절이라 키워드 하나가 부분 미이행이다. |
| F | 6 | 805행nextch07 order7의install/CPack은실제52/386행.818~820행ch05fetch/ch07배포/ch08구조라벨·후행설명맞음.573~714행실전단계가있어도라벨·속성설명반복으로긴글방향이흐려6. |
| G | 3 | 809~814행에 ctest 매뉴얼, GoogleTest 모듈, googletest·Catch2 문서가 있다. 버전은 GIT_TAG v1.15.2(355·642행), v3.5.0(460행), cmake_minimum_required 3.20(48·601행)이다. 출처가 176·317·502행 같은 개별 주장에 붙어 있지 않고 링크는 latest 문서다. |

병합 대상: 병합대상없음. 다음조치:CTest전담으로보강하고DEPENDS/fixture성공계약구분.

### `cmake/chapter07-install.md`

source_file: `src/content/blog/tools/build/cmake/chapter07-install.md`

score_status:잠정 · score:61 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0미발견/P1위오류게이트확인. uncertainties:91행prefix·339행오류발생단계·380~382행탐색목록·443/523행package파일명·700행include경로필수단정미검증.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | install(TARGETS) RUNTIME/LIBRARY/ARCHIVE 표(58~72행), GNUInstallDirs 표(189~198행), Config/ConfigVersion/Targets 1~4단계(270~369행), CPack 기본·DEB·RPM(392~456행)은 공식 문서 구성과 거의 같다. 이 글만의 설명은 빌드 디렉터리→설치 경로 매핑(35~41행), DIRECTORY 끝 슬래시 차이(141~151행), INCLUDES DESTINATION이 헤더 설치가 아니라 INTERFACE 경로 메타정보라는 구분(351~353행), NAMESPACE 오타 보호(336~339행), 흔한 실수 5개(650~724행)다. 실패 사례·컴포넌트 분리 판단 기준은 없다. |
| B | 13 | 왜 필요한가(13~46행) → install 기초·DESTDIR(52~116행) → 파일·디렉터리(120~177행) → GNUInstallDirs(181~215행) → 패키지 설정 파일(219~382행) → CPack·컴포넌트(386~523행) → 완전한 예시(527~634행) → 정리·흔한 실수(638~724행)로 흐름은 완성됐다. 264행 vs 272~279행 모순과 91·339·380~382·443·700행 불확실이 열려 있어 AP-C-24에 따라 13. 소비 측 확인 절차는 371~382행 코드 두 줄과 경로 목록뿐이다. |
| C | 8 | 설치·패키징 명령(76~89·405~424·619~634행), DESTDIR 결과 트리(103~114행), cmake_minimum_required(VERSION 3.20) 완결 예제(529~617행)가 있다. cmake --install·cpack 실제 출력이 없고 443·523행 산출 파일명은 서술이다. 91행 기본 PREFIX 등에 출처·환경이 없어 C ≤ 8. 518~521행은 bash 블록에 CMake set() 문이 들어 있다. |
| D | 12 | 304~314·341~353·543~546행 ↔ chapter09 245~261행export/includeinterface 일부중복. chapter05 78~127행은소비측Config탐색이라공급측패키징과역할다름. GNU Make chapter07-practical.md426~448행PREFIX/DESTDIR ↔ 이글93~116행은개념만겹치며도구다름. 전담install/CPack질문으로12. |
| E | 8 | 제목(2행) 'install·EXPORT·CPack'을 모두 다룬다(install 52~215행, EXPORT 304~339행, CPack 386~523행). description(5행) '플랫폼별 패키지 생성'도 416~456행이 이행한다. 대상 독자(라이브러리 배포자)는 33·221행 본문에만 있다. |
| F | 7 | 730행nextch08 order8·안티패턴/구조맞음.743~746행ch06/ch08/ch05/GNU-Makechapter07라벨·후행설명맞고Make426~448행실제install/DESTDIR있음.229행ch05Config절·353행ch03가시성절연결과270~369행1~4단계가고유길잡이라7. |
| G | 2 | 참고 자료(736~739행)와 747행이 cmake.org 'latest' 링크라 버전이 없고 인라인 출처가 없다. 91행 기본 PREFIX, 339행 '::' 검사 시점, 380~382행 검색 경로, 443행 파일명 규칙에 대응 문서·버전이 없다. |

병합 대상: 병합대상없음. 다음조치:ConfigVersion처리주체정정후소비측install/find검증절차보강.

### `cmake/chapter08-best-practices.md`

source_file: `src/content/blog/tools/build/cmake/chapter08-best-practices.md`

score_status:잠정 · score:52 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0미발견/P1위오류게이트확인. uncertainties:179행공식권고인용·176행generator미지원·372~377행alias오류단계·전역CXXSTANDARD와target권고전제미검증.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | 타겟 중심 설계, 전역 명령 회피, 별칭, 경고 INTERFACE 타겟(54~117·121~222·360~419행)은 629행 cliutils 가이드 같은 입문 자료의 흔한 목록이다. 이 글에만 있는 것은 file(GLOB)이 구성 시점에 목록을 고정하는 과정을 4단계로 짚은 부분(156~161행), CONFIGURE_DEPENDS의 비용과 쓸 자리를 가른 표(173~196행), 시스템 우선·FetchContent 폴백 매크로(485~503행)다. |
| B | 12 | 문제(13~50행) → 원칙 → 안티패턴 → 구조 템플릿 → 라이브러리 설계 → 크로스 플랫폼 → 의존성 → 체크리스트 → 흔한 실수까지 흐름은 간다. 핵심 산출물인 템플릿(272~320행)이 3.21 기능을 3.20 최소 버전으로 쓰고, 297~299행 전역 CMAKE_CXX_STANDARD는 542행 체크리스트의 target_compile_features 요구와 어긋난다. '대규모 프로젝트 구성 전략'은 디렉터리 표(228~268행)와 템플릿 하나뿐이다. 179·372~377·573행 불확실이 열려 있어 B ≤ 13. |
| C | 6 | 코드 조각은 많지만 CMake 버전·생성기·컴파일러와 결과 출력이 없다. 175행 '모듈이 수십·수백 개면 누적'은 측정이 없고, 176행 VS·Xcode 미지원 주장은 출처가 없다. 372~377행 오타 예시는 오류 메시지를 보여 주지 않는다. 템플릿을 실제로 구성해 본 기록이 있었다면 273/312행 문제가 드러났을 것이다. |
| D | 8 | 13~50·73~95·360~378행 ↔ chapter03 13~57·235~262·428~450행타겟/alias반복.380~391·575~588행 ↔ chapter09 227~261행interfaces,205행 ↔ chapter01 375~401행compilefeatures.485~503행 ↔ chapter05 469~487행find/fetch. Recipes part3-11-make-cmake-cross.md257~264행target사용보다시리즈내반복이주된감점. checklist/GLOB질문은남아8. |
| E | 7 | 제목 'target_* 중심 설계'와 description의 '타겟 중심 접근법, 안티패턴'은 54~222행이 이행한다. '대규모 프로젝트 구성 전략'은 226~354행 레이아웃·템플릿과 506~516행 옵션 격리 조각에 그쳐 부분 미이행이다. |
| F | 6 | 522·623행nextch09 order9및custom/preset/cmake-E대응.639~642행ch07/ch09/ch03/GNU-Makechapter07title·설명일치.안내두번과체크리스트중간정본링크부족으로6. |
| G | 2 | 본문에 기능별 버전(165행 CONFIGURE_DEPENDS 3.12+, 338행 3.21+, 41행 3.0+/3.15+)은 있다. 627~633행 참고 자료는 주장과 연결되지 않은 목록이다. 179행은 'CMake 매뉴얼 자체가'라며 따옴표로 인용하지만 링크·절이 없고, 로컬 CMake 4.4.4 file() 도움말 원문과 문구가 다르다. 기준 CMake 버전이 없다. |

병합 대상: chapter03target전파·chapter05폴백·chapter09interface중복. 다음조치:체크리스트/GLOB검토질문으로차별화보강.

### `cmake/chapter09-modern-advanced.md`

source_file: `src/content/blog/tools/build/cmake/chapter09-modern-advanced.md`

score_status:잠정 · score:53 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0미발견/P1위오류게이트확인. uncertainties:189행PCH공유/성능수치·167행FILE_SETheader설치전제·241행prefix전제·presetformat최소판미검증.314행의미만공식/실행확정.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 11 | 이 글이 직접 정리한 비교는 110~115행 add_custom_command·add_custom_target 선택 기준 표와 47·56·58행 OUTPUT 의존 모델 설명(Make 규칙과 같은 모델)이다. target_*(134~223행), BUILD/INSTALL_INTERFACE(227~261행), Presets(265~314행), cmake -E 표(343~354행)는 공식 문서 기능 목록 수준이다. 189행 '수십 퍼센트 줄일 수 있습니다', 191행 '섞기 어려워질 수 있어'는 완곡 표현이다. 앵커 part7-05(9)보다 비교 표가 조금 더 있다. |
| B | 11 | 13~23·360~368행다섯영역이닫히지만314행개인preset덮어쓰기계약이실제로실패해12→11.167행설치전제·331/336행생략형한계도남는다.B≤13. |
| C | 6 | CMake 코드 조각(36~44, 82~92, 120~123, 160~164, 269~298행)과 preset 명령(302~304행)이 있다. CMake 버전·환경, 예상 출력, 생성 파일 확인 절차가 없다. 189행 '수십 퍼센트'는 출처·환경 없는 수치라 C ≤ 8. |
| D | 8 | 265~314행 ↔ chapter04 418~512행Presets.231~258행 ↔ chapter07 304~353·543~565행interface/export.213~223행 ↔ chapter01 375~401행compilefeatures,169~176행 ↔ chapter03 98~117행linkoptions.120~126행 ↔ Recipes part3-11-make-cmake-cross.md165~167행POST_BUILD는cross산물처리역할차이.27~126행custom출력모델전담은남아8. |
| E | 7 | 2행BUILD/INSTALL_INTERFACE·Presets·cmake-E약속은227·265·318행에서모두이행.27~223행custom/확장target이추가된것은‘고급’범위안이며키워드누락아니므로6→7.대상/결과의구체성은9미만. |
| F | 7 | 15행선행ch01~08·23행참조용읽기안내있음.마지막order9이며370~384행시리즈닫기/다음행동이후속편대신기능.395~398행ch08/ch03/ch07/GNU-Makechapter02title·내용맞음.17~21목록과실제절순서가달라8아님. |
| G | 3 | 본문에 기능별 최소 버전(157행 3.23+, 178행 3.16+, 265행 3.19+)이 있고, 참고 자료(388~391행)와 399행 add_custom_command 문서 링크가 있다. 모두 latest 문서라 기준 판을 알 수 없고 189·314행 주장에는 출처가 없다. 본문 출처·판 연결은 3점 구간이다. |

병합 대상: chapter04Presets·chapter07interface중복절. 다음조치:UserPresets설명정정후customcommand출력/의존성질문으로보강.

### `cxl/chapter01-cxl-position.md`

source_file: `src/content/blog/embedded/hardware/cxl/chapter01-cxl-position.md`

score_status:잠정 · score:54 · confidence:중간 · factcheck:검증됨 · anchor_ref:UART, ISR, Build. blockers:P0미발견/새기술오류미발견/출처기록승계. uncertainties:31/106행시분할단순화·89행lane폭과native지원차이·17행4.0spec표기/171~172행3.1자료정책모호함.기존검증을취소할새반증은없음.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 13 | 이 글이 더한 관점은 79행 '128 GT/s는 파이프를 굵게, Bundled Port는 여러 개 묶는 다른 축', 132행 HDM Decoder commit 전 load fault와 `cxl create-region` 함정, 144행 CEDT를 drivers/cxl/acpi.c가 읽는다는 함정이다. 25~29행 프로토콜 표, 45~52행 세대 표, 85~91행 Flex Bus 표는 CXL 소개 자료의 표준 목록이다. 140행 NVLink/IF 용도 구분은 출처 없는 일반론이다. |
| B | 12 | 문제(19~21행) → 세 프로토콜(23~39행) → 세대(41~60행) → 4.0 변경(62~79행) → Flex Bus(81~93행) → 레이어 지도(95~106행) → 시리즈 구성(108~126행) → 함정(128~144행) → 정리(146~153행)로 흐름은 완성됐다. 17행 '15편'은 cxl 디렉터리 파일 15개와 맞다. 89행 x2와 68·91행 'x2 native width 신규'의 관계, 31·106행 '시분할' 표현 등 불확실이 열려 있어 B ≤ 13. |
| C | 4 | 실행·관찰 절차가 없다. 재현 단서는 132행 `cxl create-region`과 144행 `drivers/cxl/acpi.c` 이름뿐이고 명령 출력·환경·기대 결과가 없다. 90행 '8/16/32/64/128 GT/s', 73행 '지연을 더하지 않았다'는 발표 자료 인용이지 측정이 아니다. 앵커 part6-09(C 4)와 같은 수준. |
| D | 9 | 25~29·37행 ↔ Recipes part11-15-pcie-to-cxl.md33~40행세프로토콜,45~52행 ↔ Performance part3-11-cxl-interconnect.md28~33행세대표,HBM chapter09-cxl-mem.md34~51행도같은개괄.66~71·75~79행 ↔ CXLchapter05 21~26·58~75행4.0변경/Bundled중복.81~93행 ↔ Recipes11-15 30·54~68행FlexBus. 지도/시리즈도입이라는독립허브역할있어9. |
| E | 8 | title '1.1에서 4.0까지'와 description '푸는 문제, 세대별 진화, 4.0 핵심 변경(128 GT/s·Bundled Port)'을 19~21·41~60·62~79행이 이행한다. 대상 독자·전제 지식 명시가 없어 9 미만. |
| F | 5 | 157행nextch02 order2제목맞음.161~163·165행HBM9/12·Performance29·Security11제목/주제맞음.164행RecipesCh149는실제part11-15의order150으로틀림.104행ch05가PHY를다루어도모드협상상세절은없다. F≤5. |
| G | 3 | 본문에서 주장과 묶인 출처는 64행 '4.0 발표문(2025년 11월 18일)과 소개 웨비나(2025년 12월)'와 144행 `drivers/cxl/acpi.c` 둘이다. 171~176행 출처 안내에 CXL 3.1 spec(2023-08), Linux v7.3-rc6, QEMU master가 있으나 개별 주장과 § 번호로 연결되지 않고 URL이 없다. 17행 'CXL 4.0 spec § 번호만 인용'은 171~172행('§·표 번호는 3.1 기준', '4.0 spec 본문은 쓰지 않았다')과 어긋나고 본문에 § 번호가 하나도 없다. |

병합 대상: 병합대상없음(시리즈허브). 다음조치:번호150및레이어지도포인터보강.전편목차역할로총점54라도보강예외.

### `cxl/chapter02-system-architecture.md`

source_file: `src/content/blog/embedded/hardware/cxl/chapter02-system-architecture.md`

score_status:잠정 · score:57 · confidence:중간 · factcheck:검증됨 · anchor_ref:UART, ISR, Build. blockers:P0미발견/새기술오류미발견/출처기록승계. uncertainties:47~50행제품현황시점·133행kernel기준판·15행5형태와96행MH-SLD하위분류표현미검증.기존규격대조를무효화할새오류는확정하지않음.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | 85~88행 Shared FAM 일관성을 영역마다 FM이 HDM-DB 하드웨어 모델·소프트웨어 모델 중 고른다는 설명(CXL 3.1 §2.4.4), 92~104행 MH-SLD/MH-MLD 구분과 LD Pool CCI(MCTP·Mailbox tunnel), 146~156행 'MLD vs Shared FAM'·'Bundled Port vs Multi-LD' 오해 정리가 이 글만의 부분이다. 23~27행 Type 표와 33행 Type 1 설명은 표준 내용이고, 144행 '운영 복잡도가 디바이스 복잡도와 일치하지 않습니다'는 근거 없는 일반론이다. |
| B | 12 | Type 1·2·3(19~52행) → MLD(54~74행) → Shared FAM(76~88행) → MH-MLD(90~104행) → Bundled Port(106~119행) → Linux(121~138행) → 실수 → 정리로 제목의 분류를 모두 다룬다. Type 2는 37~39행 두 문장 뒤 Ch 3으로 넘기고, Linux 절은 Type 2·Type 1을 133·135행 주석 한 줄씩으로 끝낸다. 15행 '5가지 형태'인데 96행 MH-SLD가 따로 나와 분류 경계가 흐리다. 제품표(47~50행)·커널 버전 불확실이 열려 있어 13 이하. |
| C | 5 | 재현 절차는 125~130행 `ls /sys/bus/cxl/devices/` 출력 예 하나이고 커널 버전·장치·QEMU 여부가 없다. 47~50행 제품표의 '128·256 GB', '96 GB 고객 검증 완료', '컨트롤러당 최대 2 TB'는 출처·시점 없는 수치라 C ≤ 8. 66~72행 2 TB/512 GB×4 흐름은 가상 예로 FM 명령·관찰이 없다. |
| D | 9 | 60~72행 ↔ chapter04-pooling-gfam.md51~66행2TB/512GB×4·LD3미할당예,78~88행 ↔ch04 69~85행pooled/SharedFAM.110~117행 ↔chapter05-cxl-4-features.md62~67행Bundled표.23~33행 ↔HBMchapter11-cxl-device-types.md25~29행Type표/atomic예. 비교글19·133행이이글을분류정본으로연결하므로일부역할남아9. |
| E | 7 | title의 Type 1·2·3·MLD·MH-MLD와 description '디바이스 분류와 multi-LD·multi-head 구조'를 19~104행이 다루고 정리(160~165행)도 같은 범위로 끝난다. 'System Architecture'는 본문(디바이스 분류)보다 넓고, 90행 heading 'MH-MLD — Multi-Headed Device'가 MH-SLD까지 묶어 키워드와 범위가 조금 어긋난다. |
| F | 7 | 17행전제ch01,29행ch06/07/08프로토콜·39/52행ch03일관성·74행ch04pool·119행ch05Bundled·138행ch11driver가실제제목/역할대응.169행nextch03 order3·173~176행관련대상CXL1/4/5·HBM11도맞음.고유절별심화안내로7. |
| G | 3 | 본문에 주장과 연결된 출처 표기가 있다: 33행 CXL 1.1 규격, 85행 CXL 3.1 §2.4.4, 92행 §2.5, 108행 CXL 4.0 웨비나(2025년 12월), 133행 include/cxl/cxl.h. 180행은 템플릿 footer라 가점 없음. 링크가 없고 47~50행 제품표는 출처·시점이 없으며 Linux 코드 기준 버전이 본문에 없다. |

병합 대상: chapter04pool/LD배분·chapter05Bundled·HBMchapter11Type기초부분. 다음조치:분류정본으로차별화보강.

### `cxl/chapter03-coherency-model.md`

source_file: `src/content/blog/embedded/hardware/cxl/chapter03-coherency-model.md`

score_status:잠정 · score:60 · confidence:중간 · factcheck:검증됨 · anchor_ref:UART, ISR, Build. blockers:P0미발견/새기술오류미발견/출처기록승계. uncertainties:50행bias전환비용TBD·61행추적구현세부·description두종류/본문세종류의개정누락.개수산문은기술오류로승격안함.

| 항목 | 점수 | 근거 |
| --- | ---: | --- |
| A | 14 | 33~37행 표가 HDM-H·HDM-D·HDM-DB를 규격 정의, 디바이스 유형, 일관성 채널로 나눠 비교하고, 91~97행 '자주 하는 실수'가 'Bias와 BISnp 중 하나를 고른다', 'Type 3의 주된 영역은 HDM-DB' 같은 오해를 규격 근거로 바로잡는다. 나머지는 규격 §2.2를 풀어 쓴 설명이고, 76·105행 snoop filter 트레이드오프는 일반론이며, 50행 전환 비용은 TBD다. |
| B | 13 | HDM 정의(19~27행) → 세 종류(29~39행) → HDM-D bias(41~50행) → HDM-DB BISnp(52~61행) → 비교표(63~70행) → snoop filter(72~76행) → Linux sysfs(78~87행) → 실수(89~105행) → 정리(107~114행)로 흐름은 완성됐다. BISnp 처리 순서는 61행 두 문장뿐이고, bias 전환은 50·101행에서 멈추며 전환 비용은 TBD다. 61행 '2.2.2절의 bias 기반 추적 방식'은 본문에서 설명하지 않은 절 번호를 가리킨다. |
| C | 7 | 실행해 볼 수 있는 것은 82~85행 `cat /sys/bus/cxl/devices/decoder1.0/target_type` 한 줄과 87행 `cxl list -M` 필드 이름 나열뿐이다. 커널·하드웨어(또는 QEMU)와 전체 예상 출력이 없다. 50행 '예: 4 KB당 1 bit'는 출처 없는 수치라 C ≤ 8. |
| D | 11 | 45~50행 ↔ HBMchapter10-cxl-mem-protocol.md61~68행Bias표·4KB/1bit·TransitionAgent·전환비용TBD가거의동일.56~59행 ↔ CXLchapter08-cxl-mem.md39~48행BISnp/BIRsp.다만비교글131~135행은상세일관성을이글로넘기며chapter02 39·52행도같다.정의/오해교정이라는전담역할이남아11. |
| E | 7 | 2행 제목 키워드 HDM-DB(52~61행), HDM-D(41~50행), Bias(45~50행), BISnp(56~61·72~76행)를 모두 다룬다. 5행 description은 'Host-managed Device Memory 두 종류'인데 본문 15·29~37·110행은 HDM-H를 넣어 세 종류로 설명한다. |
| F | 5 | 118행nextch04 order4의pooling/fabric/GFAM이대상35/69행이후있음.122행ch02title·123행ch08HDM매핑83~99행맞음.124행HBM10—‘Bias·BISnp의message흐름’은대상19·68·150행이그흐름을CXL3/8로돌려보내실제로이행하지않아F≤5. |
| G | 3 | 17·31행 'CXL 3.1 규격 §2.2 기준', 61행 '2.2.2절', 87행 '커널 ABI 문서(sysfs-bus-cxl, v5.14)'처럼 버전을 붙인 출처가 주장에 연결된 곳이 있다. 규격·ABI 문서 링크가 없고 39·50행 같은 주장에는 절이 없다. 128행은 시리즈 공통 footer라 근거가 아니다. |

병합 대상: HBMchapter10Bias중복절. 다음조치:독립coherency질문으로보강,실행환경과관련링크후행설명수정.

## 공통 문제와 해시

CMake는동일target/preset/표준예를여러장에재수록하고실전예의소스·환경·관찰결과가빠져있다. 입력코드와기대출력/설명계약이엇갈린것은1차자료로재확인했다. CXL은시리즈간Type/Bias/Bundled설명이반복되고명령을조사할환경이없다. 출처가검증됐다는사실은A/C/D의높은점수근거가아니다. 무근거수치·완곡표현만의표는실측으로세지않는다.

원문열람후스냅샷과종료시SHA-256을다시계산해같음을확인했다. 기존보고서커밋이후대상diff없음도확인했다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| chapter09-modern-advanced.md | 1~399행 | bf5c5903e29a48c2eeee6d92d27de1cf9fe82d92c24893f9339e65a171e1f3bb |
| chapter06-testing.md | 1~820행 | 9c29bc4d34774cd3d40b3c30e834052167af9fb2ae8a1eec2608b161ccb828e7 |
| chapter05-find-package.md | 1~724행 | 5af7e12bde9344f863f21f69f5042bfcb3f4c56e92c73e1338286eae8f1a0b9a |
| chapter07-install.md | 1~747행 | 2f22889f45ffa4b11b1360cc4b90e20d3ef4ca18461af7d8abc79d3dd7813d87 |
| chapter04-options.md | 1~710행 | e5b6d9498c96a81034684ff65da8968440488d68e598c7d304bd522e49f22864 |
| chapter08-best-practices.md | 1~643행 | e806e4e33d41a7c12bc63de5ecbf2b4ed0ecc14028800f867e92147f3a8c68a2 |
| chapter03-targets.md | 1~740행 | f57800f917191fc98276491183fb331da3a9f2187c4d64bd8d1ba4364de62315 |
| chapter03-coherency-model.md | 1~128행 | f11f9b1b570fb969ba5db47a0a3d9d69d3ae2ade0a86eabf13a030d084917bc4 |
| chapter01-cxl-position.md | 1~179행 | 0926717e7871e50664b21987d86a51b5ee39a276fa22e94b4f5f60f59a0299a1 |
| chapter02-system-architecture.md | 1~180행 | e14829bbef7feaa6caaf3fab298737854ce8c4056d3f6b4fa4a039878c92845a |
