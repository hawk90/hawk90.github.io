# 공개 글 AdSense 평가 — 루프 09

> 대상: 공개 글 10편 (CMake `seriesOrder` 3~9, 7편 + CXL 4.0 Internals `seriesOrder` 1~3, 3편)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 아홉 번째 루프다. 대상은 `src/content/blog/tools/build/cmake/`의 `chapter03-targets.md`~`chapter09-modern-advanced.md` 7편(CMake 시리즈 끝까지)과 `src/content/blog/embedded/hardware/cxl/`의 `chapter01-cxl-position.md`~`chapter03-coherency-model.md` 3편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `cmake/chapter03-targets.md` | 13 | 13 | 7 | 10 | 8 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `cmake/chapter04-options.md` | 11 | 12 | 7 | 10 | 7 | 4 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `cmake/chapter05-find-package.md` | 11 | 12 | 6 | 10 | 7 | 6 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `cmake/chapter06-testing.md` | 11 | 12 | 8 | 11 | 7 | 6 | 3 | **58** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md` |
| `cmake/chapter07-install.md` | 11 | 13 | 8 | 12 | 8 | 7 | 2 | **61** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `cmake/chapter08-best-practices.md` | 11 | 12 | 6 | 8 | 7 | 6 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `cmake/chapter09-modern-advanced.md` | 11 | 12 | 6 | 8 | 6 | 7 | 3 | **53** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `cxl/chapter01-cxl-position.md` | 13 | 12 | 4 | 9 | 8 | 5 | 3 | **54** | 검증됨 | 보강 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `cxl/chapter02-system-architecture.md` | 14 | 12 | 5 | 9 | 7 | 7 | 3 | **57** | 검증됨 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `cxl/chapter03-coherency-model.md` | 14 | 13 | 7 | 11 | 7 | 5 | 3 | **60** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |

평균 56.2점(10편 합 562), 범위 52~61점이다. 판정은 우선 조치 6편, 병합 검토 2편, 보강 2편이다. 80점 이상 글은 없다. 오류 확인은 6편(CMake ch03~ch08)이다. ch03(660행 target_link_libraries)과 ch06(317행 DEPENDS)은 직접 연 CMake 공식 문서와, ch04·ch05·ch07은 원문 내부 모순으로, ch08은 코드와 진술의 충돌(로컬 CMake 도움말로도 확인)로 판정했다. CMake 7편은 git log에 1차 자료 대조 커밋이 하나도 없고, CXL 3편은 a0eeea28(PR #59) 팩트체크 커밋이 있어 `factcheck: 검증됨`이다. 점수 구간으로는 ch03·ch07(CMake)과 cxl ch03이 보강(60~79), 나머지 7편이 병합 검토(40~59)다. cxl ch01은 시리즈 첫 글이자 15편 목차·레이어 지도를 가진 허브라 루브릭 5절 허브 예외로 보강에 뒀다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft: false`까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `cmake/chapter03-targets.md` | 62 | 60 | -2 | 없음 |
| `cmake/chapter04-options.md` | 54 | 53 | -1 | 없음 |
| `cmake/chapter05-find-package.md` | 54 | 54 | 0 | 없음 |
| `cmake/chapter06-testing.md` | 58 | 58 | 0 | 없음 |
| `cmake/chapter07-install.md` | 63 | 61 | -2 | 없음 |
| `cmake/chapter08-best-practices.md` | 52 | 52 | 0 | 없음 |
| `cmake/chapter09-modern-advanced.md` | 53 | 53 | 0 | 없음 |
| `cxl/chapter01-cxl-position.md` | 54 | 54 | 0 | 없음 |
| `cxl/chapter02-system-architecture.md` | 57 | 57 | 0 | 없음 |
| `cxl/chapter03-coherency-model.md` | 60 | 60 | 0 | 없음 |

1차 합 567에서 최종 562로 5점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 없음.
- 추가한 오류 확인: 2건, 2편.
  - cmake ch03: 660~661행 '# 회피: CMake 3.x에서 경고 또는 오류 / `target_link_libraries(app mylib)`' vs cmake.org target_link_libraries 문서(_sources rst 174~186행 'Libraries for both a Target and its Dependents', 'Library dependencies are transitive by default with this signature'). plain signature는 현행 지원 형식이고, compatibility-only 표시는 197·221행의 LINK_PRIVATE/LINK_PUBLIC, LINK_INTERFACE_LIBRARIES에만 붙는다. 판정이 미검증 → 오류 확인, 보강 → 우선 조치로 바뀌었다.
  - cmake ch07: 264행 'Config.cmake — 진입점. ... 다른 두 파일을 include하고, 의존성을 확인합니다' vs 272~279행 Config 템플릿(Targets.cmake만 include, ConfigVersion include·find_dependency 없음). 판정이 미검증 → 오류 확인, 보강 → 우선 조치로 바뀌었다.
- 유지한 오류 확인: cmake ch04(368행 생성 결과 vs 380행 `#cmakedefine01` 규칙), ch05(155행 콜론 예시 vs 549~552행 세미콜론), ch06(317행 DEPENDS '통과 후 실행' vs DEPENDS 문서 'results … are not considered'), ch08(273행 최소 3.20 vs 312행 PROJECT_IS_TOP_LEVEL, 3.21 추가)은 재검증에서 성립했다.
- 점수 변경: cmake ch03 B 15→13(열린 정확성 불확실, AP-C-24), ch04 F 5→4(708·709행 관련 항목 라벨 두 개가 대상과 어긋남), ch07 B 14→13(AP-C-24)·G 3→2(출처가 'latest' 목록뿐, 인라인 출처 없음). 나머지 7편은 인용 줄을 원문과 대조해 점수를 유지했다.
- 근거 정정: D 비교 줄 번호를 직접 연 줄로 바꿨다(ch04의 ch02 128~140행·ch08 590~603행·sanitizers ch05 32~66·149~184행, ch05의 ch06 352~361행, ch06의 ch08 311~314·342~345행, ch07의 ch09 245~260행, cxl ch01의 part11-15 33~40행·hbm ch09 48~51행, cxl ch02의 ch04 58~65행). D 비교 범위에 cmake ch03의 ch02 122~141행, ch06의 goos/chapter09-commitment.md(draft), ch07의 buildroot chapter17-sdk.md·chapter09-new-package.md, ch09의 modern-recipes part3-11 165행, cxl ch03의 postmortem chapter06-cxl-fabric-postmortem.md를 더했다.
- uncertainties 정리: cmake ch06에서 165행 `--repeat until-fail`과 273행 여러 `-L`(AND) 항목은 ctest 매뉴얼과 맞아 뺐다. cmake ch05 127행 'Config 모드 먼저'는 find_package 기본 동작과 어긋날 수 있어 오류 확인 후보로 표시했다(문서 미확인). cxl ch01 43행 '5세대'는 1.1 이후 다섯 세대로 읽으면 맞아 모호한 표기로 낮췄다.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점 원인은 틀린 관련 항목 라벨(cmake ch04 708·709행, cxl ch01 164행, cxl ch03 124행)이다. cmake ch09는 seriesOrder 10이 없는 마지막 편이라 시리즈 마무리 절이 다음 편 안내를 대신한다.

## 글별 근거

### `cmake/chapter03-targets.md` — 60점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료와 충돌한다. 이 글 660~661행은 `target_link_libraries(app mylib)  # 가시성 없음`을 두고 '회피: CMake 3.x에서 경고 또는 오류'라고 쓴다. 직접 연 cmake.org/cmake/help/latest/command/target_link_libraries 원문(_sources rst 174~186행) 'Libraries for both a Target and its Dependents' 절은 `target_link_libraries(<target> <item>...)`를 현행 signature로 싣고 'Library dependencies are transitive by default with this signature'라고 동작을 정의한다. compatibility-only/Legacy 표시는 197·221행의 LINK_PRIVATE/LINK_PUBLIC, LINK_INTERFACE_LIBRARIES 형식에만 붙는다. 같은 타겟에 keyword signature를 섞지 않는 한 661행 한 줄은 경고도 오류도 내지 않는다. git log(0a9dd7bc slug 고정, 07cc1988 관련 항목, be973200 topic 메타, ac24bb76 제목 변경 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 이 글만의 것은 키워드를 고르는 세 질문과 조합 표(264~280행), add_subdirectory의 변수 스코프와 타겟 전역성 대비(464~514행), 전역 설정이 깨지는 세 이유(28~32행)다. 타겟 종류 표(65~69행), 확장자 표(136~157행), 가시성 표(215~219행), 별칭 설명(428~450행)은 공식 문서와 732행 참고 글의 표준 내용이다. 측정과 실패 사례가 없어 13~19 구간의 아래쪽이다. |
| B | 13 | 왜 타겟인가(13~57행) → 타겟 종류 → 라이브러리 4종(124~207행) → 가시성(211~326행) → 연결·체인(330~367행) → 구조·별칭·서브디렉터리(371~579행) → 실전 예시(591~635행) → 흔한 실수(639~710행) → 정리(714~722행)로 흐름은 갖췄다. 233~262행과 282~310행에 같은 mylib 예제가 두 번 나오고, 324~326행은 위 그림을 다시 가리키기만 한다. 660행 오류와 171·450행 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 코드 조각은 많지만 CMake 버전·생성기·컴파일러 같은 실행 환경이 없다. 예상 결과는 474~482행 message 주석과 692행 오류 문구 정도다. compile 명령에서 -I·-D가 전파되는 것을 확인하는 절차가 없고, 591~635행 예시는 소스 트리가 없어 그대로 재현되지 않는다. 4~7 구간. |
| D | 10 | 같은 시리즈: chapter08 73~95행(mylib PUBLIC include·PRIVATE src)이 이 글 235~262·284~310행과 같은 예제다. chapter08 121~140행 전역 설정 안티패턴은 이 글 15~47·641~655행과, chapter09 227~245행 BUILD/INSTALL_INTERFACE는 400~424행과, chapter01 375~394행은 15~49행과 겹친다. chapter02 122~141행 변수 스코프·PARENT_SCOPE는 464~494행과 일부 겹치지만 add_subdirectory 예가 없다. chapter04는 캐시·option이라 갈린다. 다른 시리즈: embedded-cpp part1-05 425~446행, modern-recipes part3-11 257~264행은 target_*를 PRIVATE로 쓰기만 하고 전파를 설명하지 않는다. 가시성 전파의 정본은 이 글이고 ch08·ch09가 되풀이한다. |
| E | 8 | 제목의 'INTERFACE·PUBLIC·PRIVATE 전파'는 211~326행과 340~354행 의존성 체인에서 다룬다. 53~57행이 목표 셋을 밝히고 정리(714~722행)가 같은 항목으로 닫는다. description(5행) '타겟 중심 접근법과 라이브러리 생성'은 일반적이고 대상 독자가 없어 9 미만. |
| F | 7 | 726행 다음 장 예고 'Ch 4 option()·set(CACHE)·CMakePresets.json'은 seriesOrder 4 chapter04-options.md의 116행 option(), 56·61행 캐시 변수, 418행 CMakePresets.json 절과 맞다. 관련 항목 736~739행(Ch 2, Ch 4, Ch 8, gnu-make/chapter02-rules)의 라벨이 모두 대상과 맞다. 587행 Ch 9 앵커(chapter09 27행 H2), 326행 내부 앵커(227행 H3)도 맞다. 494행은 이 글 자신을 '[Ch 3 PUBLIC/INTERFACE]'로 링크해 다른 장처럼 보이고, 282~326행 반복이 방향을 흐린다. |
| G | 2 | 참고 자료(730~732행)와 740행에 cmake.org 문서가 있지만 모두 'latest' 링크라 버전이 없다. 171행, 660행, 34행 'CMake 3.0(2014)' 같은 주장에 연결되지 않는다. 버전 표기는 549·596행 cmake_minimum_required 3.15뿐이다. |

uncertainties:
- 171행 'INTERFACE 라이브러리는 PRIVATE이나 PUBLIC이 의미가 없습니다': add_library 문서(Interface Libraries 절)와 맞지만, 실제로 PRIVATE를 쓰면 구성 오류가 나는지는 target_include_directories 문서나 실행으로 확인해야 한다.
- 450행 '::가 들어간 이름은 항상 타겟으로 해석'은 정책 CMP0028이 NEW일 때 동작으로 보인다. 정책 문서 확인 필요.
- 522행 EXCLUDE_FROM_ALL '명시적으로 링크할 때만 빌드'는 add_subdirectory 문서 23~26행과 대체로 맞다. ALL 안의 타겟이 의존하면 함께 빌드된다는 세부는 미확인.
- 184~189행 OBJECT 라이브러리를 target_link_libraries로 링크하는 형태의 최소 버전(3.12로 보임)이 글에 없다.
- 34행 'CMake 3.0(2014)' 연도는 출처가 없다.
- 660행 오류 판정은 plain signature 단독 사용 기준이다. keyword signature를 섞을 때의 오류는 글이 말하는 상황이 아니다.

### `cmake/chapter04-options.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1)이다. 337행 템플릿 `#cmakedefine01 ENABLE_FEATURE_Y`와 346행 `set(ENABLE_FEATURE_Y OFF)`의 결과로 368행 생성 파일은 `/* #undef ENABLE_FEATURE_Y */`인데, 같은 글 380행 표는 `#cmakedefine01 VAR`가 거짓이면 `#define VAR 0`이라고 한다. 예시 출력과 글이 밝힌 규칙이 동시에 참일 수 없다. 보조로, 379행 표는 `#cmakedefine VAR` 참일 때 `#define VAR <값>`인데 345행 ON을 넣은 367행 결과는 값 없는 `#define ENABLE_FEATURE_X`다. git log(7b246722, 0a9dd7bc, 4d1efcb7, be973200, ac24bb76, 400892d7, c99833a1, 644b71b5)에 1차 자료 대조 커밋은 없다(4d1efcb7·7b246722는 링크 추가, 나머지는 메타데이터·이동·일괄 정리).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 캐시 타입 표(64~70행), FORCE(104~112행), CMakeDependentOption(216~246행), FeatureSummary(248~268행), Presets 구조·상속(418~512행)은 공식 문서 항목을 옮긴 수준이다. 이 글만의 것은 option()과 set(CACHE STRING) 선택 표(133~148행), @ONLY가 필요한 이유(382~390행), configure_file vs file(GENERATE) 비교(392~414행), 흔한 실수 네 가지(624~680행)다. 112행 '신중히 사용하세요', 131행 '건너뛸 수 있습니다'는 기준 대신 쓴 완곡 표현이다. 앵커 part1-04(10)보다 비교 관점이 조금 더 있다. |
| B | 12 | 캐시 필요성(13~52행) → 캐시 변수(56~112행) → option(116~185행) → 일반 변수 우선(189~210행) → 조건부 옵션(214~268행) → 빌드 타입(272~315행) → configure_file(319~414행) → Presets(418~512행) → 캐시 관리(516~546행) → 실전 예시(550~620행) → 흔한 실수 → 정리(684~693행)로 흐름은 완성됐다. 368행 생성 결과가 380행 규칙과 어긋나고, 129행 CMP0077은 NEW가 켜지는 조건을 적지 않았다. 122행 '동치'라 해 놓고 125행에서 '세 가지 차이'를 든다. |
| C | 7 | CMakeCache.txt 출력(40~50행), -D 명령(84~86행), 캐시 확인·초기화(520~546행), 전체 CMakeLists(552~620행)가 있다. CMake 버전·생성기·OS가 없고, 36행 'find_package 수십 개면 매번 수십 초'는 출처·환경 없는 수치라 C ≤ 8. 266행 FeatureSummary 출력은 서술이고 368행은 380행과 모순이다. 315행 'Visual Studio에서도 Debug에서만 sanitizer'는 308행 `-fsanitize=address,undefined`가 MSVC에서 통하는지 보이지 않는다. |
| D | 10 | 같은 시리즈: chapter03(옵션 절 없음), chapter05(겹침 없음), chapter02 128~140행(캐시 스코프 한 줄 소개, 이 글이 상세판). chapter08 590~603행 'Multi-config에서 if(CMAKE_BUILD_TYPE)'가 이 글 641~654·295~315행과 같은 함정·해결이고, chapter09 265~316행 Presets(version 6, inherits, --preset)가 이 글 418~512행과 거의 같다. 다른 시리즈 sanitizers/chapter05-cmake-ci.md 32~66·149~184행은 sanitizer별 분리라는 다른 질문이다. 캐시·option 본론은 독립 역할이나 Presets 절과 multi-config 함정이 시리즈 안에서 중복된다. |
| E | 7 | 제목(2행) 키워드 option·set·cache type은 56~148행에서 모두 다룬다. 본문 상당 부분이 제목에 없는 configure_file(319~414행)·CMakePresets(418~512행)로 넓어지고, description(5행)은 독자가 얻는 결과를 말하지 않는다. |
| F | 4 | 697행 다음 장 예고(Ch 5 find_package·FetchContent)는 seriesOrder 5 chapter05-find-package.md와 맞다. 707행(chapter03)·710행(sanitizers/chapter05-cmake-ci)도 라벨과 맞다. 그러나 709행 '[GNU Make 소개] — 조건부 변수를 Make에서는 어떻게 다루는가'는 조건문 절이 없는 gnu-make/chapter01-intro.md로 가고(조건문은 chapter06-conditionals.md), 708행 'Ch 5 — 옵션으로 의존성 탐색을 제어하는 법'의 대상 chapter05에는 option() 사용이 없다(469행 절은 find_package QUIET 폴백). 관련 항목 4개 중 2개가 틀려 F ≤ 5에서 한 단계 더 낮췄다. 전제 지식 안내도 없다. |
| G | 2 | 701~703행 참고 자료는 cmake.org set·option·cmake-presets 'latest' 링크 3개로 버전이 없고, 129행 CMP0077, 375~380행 치환 규칙, 398~399행 file(GENERATE) 평가 시점에 인라인 출처가 없다. configure_file·file(GENERATE)·CMakeDependentOption 문서는 없다. 129행 3.13, 420행 3.19 표기는 있지만 예제를 돌린 버전은 없다. |

uncertainties:
- 128행 'option(X "" yes)는 동작하지 않습니다': option() 문서로 yes 같은 값의 처리를 확인하지 않았다.
- 129행 CMP0077 OLD 동작 설명과 NEW가 cmake_minimum_required 3.13+에서 켜진다는 조건을 정책 문서로 확인하지 않았다.
- 398행 file(GENERATE)는 '빌드 시스템 생성 시점' 평가, 399행 제너레이터 식은 '빌드 시점에 풀림'이라 시점 표현이 어긋난다. 이미 오류 확인이라 판정 영향은 없다.
- 122행 '동치'와 125~129행 '세 가지 차이'의 충돌, 127행 '타입 강제'는 set(... CACHE BOOL)도 BOOL이라 차이로 성립하는지 불분명.
- 315행 MSVC가 308·311행 `-fsanitize=address,undefined`를 받는지 미확인.
- 426·481행 Presets "version": 6의 최소 CMake 버전과 420행 '3.19부터'의 관계를 cmake-presets(7)로 확인하지 않았다.
- 36행 'find_package 수십 개면 매번 수십 초'는 출처·환경 없는 수치.
- 579행 실전 예시가 config.h.in을 쓰지만 ENABLE_FEATURE_X/Y 정의가 없어 336~337행 템플릿을 그대로 쓰는지 불명.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토) 기준으로는 병합 대상 없음 — 캐시·option 본론(56~210행)은 시리즈에서 이 글만 다루는 독립 질문이다. 다음 조치는 보강이다. 368행 생성 결과를 configure_file 문서로 확인해 380행 규칙과 맞추고 379행 `#cmakedefine VAR` 행도 함께 고친다. CMakePresets 절(418~512행)은 chapter09 265~316행에 맡기고 cacheVariables 연결만 남기며, multi-config 함정(641~654행)은 chapter08 590~603행과 역할을 나눈다. 708·709행 관련 항목 라벨(또는 대상)을 고친다.

### `cmake/chapter05-find-package.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1)이다. 155행은 `CMAKE_PREFIX_PATH`를 "콜론(`;`) 구분 prefix 목록. `/opt/myapp:/usr/local` 식"이라고 적고, 549~552행은 같은 변수를 "여러 경로를 세미콜론으로 구분합니다"라며 `-DCMAKE_PREFIX_PATH="/opt/mylibs;/home/user/libs"`를 보인다. 같은 변수의 구분자를 두고 콜론 예시와 세미콜론 예시가 동시에 참일 수 없다. 155행은 한 칸 안에서도 '콜론'과 `;`가 어긋난다. 573행 환경변수 export의 콜론은 별개 맥락이라 근거에서 뺐다. git log(0a9dd7bc, 4d1efcb7, be973200, ac24bb76, 400892d7, 09a00a29, c99833a1, 644b71b5)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 84~127행이 Module·Config 모드 차이를, 123행이 Config 쪽이 더 정확한 이유('라이브러리가 자기 정보를 들고 다닌다')를 든다. 141~149행은 --debug-find 진단, 365~382행은 FetchContent 단점과 ExternalProject 선택 기준이다. 141행 '모드에 따라 미묘하게 다릅니다'는 실제 탐색 순서 대신 완곡 표현으로 끝난다. 151~158행 변수 표와 pkg-config 절은 문서 예 나열이다. 앵커 part1-04(10)와 비슷하거나 조금 위. |
| B | 12 | 13~61행 도입 → Module/Config → 검색 경로(139~168행) → FetchContent → 폴백(469행~) → ExternalProject → 탐색 경로(545행~) → 정리(700행~)로 흐름은 이어진다. 비교표가 369~382행과 531~541행에 두 번, '### 기본 사용법' heading이 384·386행에 연달아 나온다. 하이브리드 패턴 버전도 61행 '(3.25+)'와 367·492행 '3.24+'로 다르다. 155행 모순까지 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 6 | 143~147행 --debug-find, 162~168행 -DCMAKE_PREFIX_PATH·-DZLIB_DIR, 451~465행 옵션 설정은 있다. CMake 버전·OS가 없고 기대 출력도 없다(149행 '출력에 … 모두 찍힙니다'뿐). 439행 URL_HASH는 '...'로 잘렸고 524행은 `SHA256=...`이라 그대로 따라 하면 실패한다. |
| D | 10 | 이 글 469~487행 fmt 11.0.2 '시스템 우선, FetchContent 폴백'은 chapter08 480~503행 find_or_fetch와 같은 질문이고, 447~465행 'MakeAvailable 전 옵션 설정'은 chapter08 506~515행과, 458~464행 googletest v1.15.2 선언은 chapter06 352~361행과 같다. 다른 시리즈의 같은 주제 글(folly part1-03-build-fbcode.md, abseil part1-03-build-dependency-bazel.md, gtest chapter02-cmake-integration.md)은 모두 draft다. 글 안에서도 비교표가 369~382·531~541행에 두 번 나온다. 시리즈 안 find_package 본편 역할은 구별된다. |
| E | 7 | 제목 키워드 Module·Config·FetchContent를 59~61행이 약속하고 84~137행, 347~510행에서 다룬다. 5행 description '외부 라이브러리 탐색, FetchContent, 그리고 의존성 관리.'는 막연하고 대상 독자가 없다. |
| F | 6 | 712행 'Ch 6 테스트와 CTest'는 seriesOrder 6 chapter06-testing.md와 맞고, 722~724행 관련 링크 라벨도 각 대상 title과 맞는다. 57~61행 장 범위 목록은 이 글 고유 안내다. 384·386행 heading 중복, 비교표 반복, 전제 지식(Ch3 타겟) 안내 없음, 긴 글에 중간 요약 없음 때문에 7 이상은 주지 않았다. |
| G | 2 | 716~718행 참고 자료는 cmake.org/cmake/help/latest 링크 3개뿐이라 기준 버전이 없고 본문 주장과 직접 이어지지 않는다. 본문의 버전 표기(158·568행 3.12, 367·492행 3.24, 375행 3.11, 61행 3.25)는 출처 없이 적혔다. |

uncertainties:
- 61행 '(3.25+)'와 367·492행 'CMake 3.24+'가 FIND_PACKAGE_ARGS 하이브리드 패턴의 하한을 다르게 적었다. 하한 표기 차이라 둘 다 참일 여지가 있어 오류 확인에 넣지 않았다.
- FetchContent_MakeAvailable 도입 버전(기억상 3.14)과 375~376행 3.11/3.12 표기의 관계를 1차 자료로 확인하지 않았다.
- 127행 'Config 모드를 먼저 시도'는 find_package 기본(CMAKE_FIND_PACKAGE_PREFER_CONFIG OFF면 Module 먼저)과 어긋날 수 있다. 문서를 열지 않았다. 확인되면 오류 확인 후보다.
- 50행 '이 다섯 줄'인데 38~48행 코드는 다섯 줄이 넘는다(개수 표기 실수라 오류 확인 대상 아님).
- 158·568행 `<PackageName>_ROOT` 3.12(CMP0074)는 1차 자료로 확인하지 않았다.
- 439행 URL_HASH가 잘려 있어 json v3.11.3 실제 해시와 대조할 수 없다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토) 기준 병합 후보는 `chapter08-best-practices.md` 478~515행(폴백 매크로·옵션 격리 반복)이지만, 이 글이 시리즈 안 유일한 find_package·FetchContent 본편이라 독립 검색 수요가 있다. 다음 조치는 보강이다. 155행 구분자를 세미콜론으로 고치고, 61행과 367·492행 버전 표기를 1차 문서로 맞춘다. 384행 중복 heading과 531~541행 중복 비교표를 없애고, ch08 중복 절은 이 글로 링크한다.

### `cmake/chapter06-testing.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료와 충돌한다. 317행 표는 `DEPENDS OtherTest`를 "다른 테스트 *통과 후* 실행"이라고 쓴다. 직접 연 cmake.org/cmake/help/latest/prop_test/DEPENDS.html은 "Specifies that this test should only be run after the specified list of tests. The results of those tests are not considered, the dependency relationship is purely for order of execution"이라고 하고, 성공 조건이 필요하면 fixture(FIXTURES_REQUIRED)를 쓰라고 한다. 이 글 278~302행이 그 fixture를 설명하므로 고칠 방향도 글 안에 있다. git log(0a9dd7bc, 4d1efcb7, be973200, ac24bb76, 400892d7, 09a00a29 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 본문 대부분이 CTest·GoogleTest 모듈 문서를 다시 정리한 내용이다(add_test 70~85행, -R/-E/-L 127~139행, 속성 표 306~317행). 이 글만의 해석은 PROCESSORS 4와 -j8로 2개씩 도는 계산(319행), 크로스 컴파일에서 gtest_discover_tests가 실패하는 이유와 대안(759~767행), CI 단계별 라벨 운용(203~209·276행) 정도다. 36행 '50년 가까이 살아남은 빌드 도구의 미학', 32행 '모든 CI 시스템이 기본으로 지원'은 근거 없는 수사다. |
| B | 12 | 동기(13~32행) → 기초(40~117행) → 옵션(121~166행) → 속성(170~248행) → fixture·스크립트 모드(252~339행) → GTest·Catch2(343~502행) → 커버리지(506~569행) → 실전 예시(573~714행) → 정리·흔한 실수(718~799행)로 끝난다. 32행이 말한 JUnit 출력은 예가 없다. 라벨 186~209·254~276행, RESOURCE_LOCK 151~157·770~783행, enable_testing 위치 44·733~741행, -O0 커버리지 528·785~799행이 반복된다. 317행 오류와 176·312·502행 불확실이 열려 있어 B ≤ 13. |
| C | 8 | 실행할 수 있는 명령과 CMakeLists(91~103행, 600~714행), 예시 출력(107~117행 ctest 결과, 409~413행 ctest -N)이 있다. CMake·컴파일러 버전과 실행 환경이 없고 출력이 실제 실행 결과인지 알 수 없다. 176행 '기본 타임아웃은 1500초(25분)'는 출처·조건 없는 수치라 C ≤ 8. 합격·실패를 가르는 검증 절차가 없다. |
| D | 11 | chapter05 421~428·454~464행 googletest FetchContent 블록(v1.15.2)이 이 글 349~361·638~645행과 겹치지만 ch05는 의존성 가져오기, ch06은 테스트 등록·실행이라 역할이 다르다. chapter07은 install·CPack이라 겹치지 않는다. chapter08 311~314·342~345행 enable_testing+add_subdirectory(tests)는 이 글 62~65·627~630행과 같은 패턴이지만 몇 줄이다. 다른 시리즈 gtest/chapter02-cmake-integration.md(13행 'Outline —' 스텁), cpp-concurrency-in-action chapter11, goos/chapter09-commitment.md는 모두 draft다. 더 큰 문제는 글 안 반복이다. |
| E | 7 | 제목은 'add_test·테스트 fixture·리포트'(2행), description은 'CTest와 Google Test, Catch2 연동'(5행)이다. add_test는 68~85행, fixture는 278~302행, GTest·Catch2는 343~502행이다. '리포트'는 커버리지 리포트(530~569행)뿐이고 테스트 결과 리포트(JUnit)는 32행 한 구절이라 키워드 하나가 부분 미이행이다. |
| F | 6 | 805행 'Ch 7 설치와 패키징'은 seriesOrder 7 chapter07-install.md와 맞다. 818~820행 관련 항목(ch05, ch07, ch08 '모범 사례')도 대상 제목과 맞다. 실전 예시(573~714행)는 단계 구분이 있다. 820행 길이에 전제 지식 안내가 없고 같은 주제가 186·254행 두 절로 흩어져 있다. |
| G | 3 | 809~814행에 ctest 매뉴얼, GoogleTest 모듈, googletest·Catch2 문서가 있다. 버전은 GIT_TAG v1.15.2(355·642행), v3.5.0(460행), cmake_minimum_required 3.20(48·601행)이다. 출처가 176·317·502행 같은 개별 주장에 붙어 있지 않고 링크는 latest 문서다. |

uncertainties:
- 176행 '기본 타임아웃은 1500초': ctest 매뉴얼(latest)은 DART_TESTING_TIMEOUT을 언급하지만 숫자 기본값을 적지 않는다. include(CTest) 없이 enable_testing만 쓸 때 적용되는지 미확인.
- 502행 '각 SECTION은 별도의 테스트 실행으로 등록': catch_discover_tests가 TEST_CASE 단위로 등록하는지 Catch2 문서로 확인하지 않았다.
- 312행 DISABLED를 'skipped로 보고됨'이라 했다. CMake 문서 표현('Not Run', CDash 'Disabled')과의 차이인지 오류인지 미확인.
- 36행 '50년 가까이 살아남은 빌드 도구'는 CMake 첫 공개 연도와 맞지 않아 보이지만 1차 자료로 확인하지 않았다.
- 386행: 부호 있는 int 오버플로(UB) 결과를 INT_MIN으로 기대하는 테스트. 주석은 UB를 경고하는데 테스트는 결과를 단정한다.
- 44·737·741행 '하위 디렉터리에서 enable_testing을 호출하면 CTest가 테스트를 못 찾음'의 정확한 조건을 확인하지 않았다.
- 30행 'Jenkins·GitHub Actions·GitLab CI 모두 표준 입출력 포맷을 요구'는 출처 없는 일반화다.

병합 대상: 판정은 오류 확인(317행 DEPENDS)으로 우선 조치이고 점수 구간만 보면 병합 검토다. 병합 대상 없음 — ch05·ch07·ch08과 역할이 갈리고 같은 주제의 다른 시리즈 글은 draft 스텁이다. 다음 조치는 보강이다. 317행을 '순서만 지정, 결과 무관(성공 조건은 FIXTURES_REQUIRED)'으로 고치고, 186~209·254~276행 라벨 절을 합치며, '리포트' 약속에 맞춰 --output-junit 절을 넣거나 제목을 좁히고, 176행 1500초에 출처·조건을 붙이거나 지운다.

### `cmake/chapter07-install.md` — 61점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(코드 vs 산문)이다. 264행은 'Config.cmake — 진입점. ... 다른 두 파일을 include하고, 의존성을 확인합니다'(262행 '세 파일' = Config·ConfigVersion·Targets)라고 쓴다. 그런데 이 글이 1단계로 제시한 272~279행 Config 템플릿은 `@PACKAGE_INIT@`, `include("${CMAKE_CURRENT_LIST_DIR}/MyLibTargets.cmake")`, `check_required_components(MyLib)`뿐이라 ConfigVersion.cmake를 include하지 않고 find_dependency도 없다. 같은 Config 파일에 대한 두 서술이 동시에 참일 수 없다. git log(0a9dd7bc, 07cc1988, be973200, ac24bb76, f38a41a0·a080ac90 표 변환, 400892d7, 09a00a29, c99833a1, 644b71b5)에 CMake 문서와 대조한 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | install(TARGETS) RUNTIME/LIBRARY/ARCHIVE 표(58~72행), GNUInstallDirs 표(189~198행), Config/ConfigVersion/Targets 1~4단계(270~369행), CPack 기본·DEB·RPM(392~456행)은 공식 문서 구성과 거의 같다. 이 글만의 설명은 빌드 디렉터리→설치 경로 매핑(35~41행), DIRECTORY 끝 슬래시 차이(141~151행), INCLUDES DESTINATION이 헤더 설치가 아니라 INTERFACE 경로 메타정보라는 구분(351~353행), NAMESPACE 오타 보호(336~339행), 흔한 실수 5개(650~724행)다. 실패 사례·컴포넌트 분리 판단 기준은 없다. |
| B | 13 | 왜 필요한가(13~46행) → install 기초·DESTDIR(52~116행) → 파일·디렉터리(120~177행) → GNUInstallDirs(181~215행) → 패키지 설정 파일(219~382행) → CPack·컴포넌트(386~523행) → 완전한 예시(527~634행) → 정리·흔한 실수(638~724행)로 흐름은 완성됐다. 264행 vs 272~279행 모순과 91·339·380~382·443·700행 불확실이 열려 있어 AP-C-24에 따라 13. 소비 측 확인 절차는 371~382행 코드 두 줄과 경로 목록뿐이다. |
| C | 8 | 설치·패키징 명령(76~89·405~424·619~634행), DESTDIR 결과 트리(103~114행), cmake_minimum_required(VERSION 3.20) 완결 예제(529~617행)가 있다. cmake --install·cpack 실제 출력이 없고 443·523행 산출 파일명은 서술이다. 91행 기본 PREFIX 등에 출처·환경이 없어 C ≤ 8. 518~521행은 bash 블록에 CMake set() 문이 들어 있다. |
| D | 12 | 같은 시리즈: chapter06(설치 내용 없음), chapter08(187행 install(FILES) 한 줄, 235행 Config.cmake.in 레이아웃, 544~545행 체크리스트뿐), chapter09 245~260행 BUILD/INSTALL_INTERFACE + install(TARGETS … EXPORT … INCLUDES DESTINATION)이 이 글 304~314·341~353·543~546행과 겹침, chapter05 78행 이하 Config 모드는 소비 측 시점. 다른 시리즈: gnu-make/chapter07-practical.md 426~448행 PREFIX/DESTDIR은 이 글 93~116행과 같은 개념이지만 도구가 다르고, buildroot chapter17-sdk.md 176~179행 DESTDIR·chapter09-new-package.md는 Buildroot 관점이다. 역할이 구별된다. |
| E | 8 | 제목(2행) 'install·EXPORT·CPack'을 모두 다룬다(install 52~215행, EXPORT 304~339행, CPack 386~523행). description(5행) '플랫폼별 패키지 생성'도 416~456행이 이행한다. 대상 독자(라이브러리 배포자)는 33·221행 본문에만 있다. |
| F | 7 | 730행 'Ch 8 Modern CMake 베스트 프랙티스'가 seriesOrder 8 chapter08 제목과 맞다. 743~746행 관련 항목(ch06, ch08, ch05, gnu-make ch07 — 426~448행에 PREFIX·DESTDIR 존재)이 모두 대상과 맞다. 229행(chapter05 78행 heading)·353행(chapter03 211행 heading)이 앞 장 절을 직접 가리키고, 270~369행이 1~4단계로 긴 설정을 나눈다. 전제 지식 절은 없다. |
| G | 2 | 참고 자료(736~739행)와 747행이 cmake.org 'latest' 링크라 버전이 없고 인라인 출처가 없다. 91행 기본 PREFIX, 339행 '::' 검사 시점, 380~382행 검색 경로, 443행 파일명 규칙에 대응 문서·버전이 없다. |

uncertainties:
- 91행 Windows 기본 CMAKE_INSTALL_PREFIX 'C:/Program Files/${PROJECT_NAME}'를 CMake 문서로 확인하지 않았다.
- 339행 '::' 포함 이름이 없으면 '구성 단계에서' 에러 — 실제 검사 시점(generate 단계)과 CMP0028 미확인.
- 380~382행 find_package 검색 경로 목록이 CMake 검색 절차와 맞는지 미확인(`<prefix>/share/cmake`, lib64 등 누락 가능).
- 443·523행 'mylib-1.2.3-Linux.deb' — 531행 project(MyLib) 기준 CPACK_PACKAGE_NAME이 MyLib이라 대소문자·컴포넌트별 파일명 규칙 미확인.
- 614행 CPACK_DEBIAN_DEVELOPMENT_PACKAGE_DEPENDS "mylib (= ...)"가 컴포넌트 설치 시 실제 생성되는 런타임 DEB 이름과 맞는지 미확인.
- 700·706행 INCLUDES DESTINATION '필수!' — 543~546행 예제가 이미 `$<INSTALL_INTERFACE>`로 include 경로를 export하므로 둘 다 필요한지 미확인.
- 683~688행 PUBLIC_HEADER와 install(DIRECTORY) 혼용 시 '두 번 설치' 주장의 근거 미확인.
- 518~521행 bash 코드 블록 안 CMake set() 문(언어 태그 오류, 점수 외 기록).

### `cmake/chapter08-best-practices.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 코드와 사실 진술의 충돌이고 1차 자료로도 확인했다. 338행은 'CMake 3.21+에서 제공하는 PROJECT_IS_TOP_LEVEL', 348행은 'CMake 3.20 이하에서는 수동으로 검사합니다'라고 쓴다. 그런데 41행이 '그대로 채택해도 좋은 템플릿'이라 한 최상위 템플릿은 273행에서 `cmake_minimum_required(VERSION 3.20)`을 선언하고 312행에서 수동 검사 없이 PROJECT_IS_TOP_LEVEL을 쓴다. 3.20에서는 이 변수가 정의되지 않아 312행 조건이 늘 거짓이 되고 테스트가 에러 없이 빠진다. 로컬 CMake 4.4.4 `cmake --help-variable PROJECT_IS_TOP_LEVEL`이 '.. versionadded:: 3.21'로 확인해 준다. git log(0a9dd7bc, 07cc1988, be973200, ac24bb76 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 타겟 중심 설계, 전역 명령 회피, 별칭, 경고 INTERFACE 타겟(54~117·121~222·360~419행)은 629행 cliutils 가이드 같은 입문 자료의 흔한 목록이다. 이 글에만 있는 것은 file(GLOB)이 구성 시점에 목록을 고정하는 과정을 4단계로 짚은 부분(156~161행), CONFIGURE_DEPENDS의 비용과 쓸 자리를 가른 표(173~196행), 시스템 우선·FetchContent 폴백 매크로(485~503행)다. |
| B | 12 | 문제(13~50행) → 원칙 → 안티패턴 → 구조 템플릿 → 라이브러리 설계 → 크로스 플랫폼 → 의존성 → 체크리스트 → 흔한 실수까지 흐름은 간다. 핵심 산출물인 템플릿(272~320행)이 3.21 기능을 3.20 최소 버전으로 쓰고, 297~299행 전역 CMAKE_CXX_STANDARD는 542행 체크리스트의 target_compile_features 요구와 어긋난다. '대규모 프로젝트 구성 전략'은 디렉터리 표(228~268행)와 템플릿 하나뿐이다. 179·372~377·573행 불확실이 열려 있어 B ≤ 13. |
| C | 6 | 코드 조각은 많지만 CMake 버전·생성기·컴파일러와 결과 출력이 없다. 175행 '모듈이 수십·수백 개면 누적'은 측정이 없고, 176행 VS·Xcode 미지원 주장은 출처가 없다. 372~377행 오타 예시는 오류 메시지를 보여 주지 않는다. 템플릿을 실제로 구성해 본 기록이 있었다면 273/312행 문제가 드러났을 것이다. |
| D | 8 | 비교한 글: 같은 시리즈 chapter01·03·07·09, 다른 시리즈 modern-recipes/part3-11-make-cmake-cross.md, gnu-make/chapter07-practical.md(PROJECT_IS_TOP_LEVEL·CONFIGURE_DEPENDS·target_compile_features로 블로그 전체 grep, 시리즈 밖 공개 글은 part3-11만, folly part1-03은 draft). ch03과 겹침: old-vs-modern 도입(13~50 ↔ ch03 13~56행), 별칭·오타 예(360~378 ↔ ch03 428~452·682~693행), 키워드 누락(565~573 ↔ ch03 657~665행). ch09와 겹침: BUILD/INSTALL_INTERFACE(380~391·575~588 ↔ ch09 227~263행), target_compile_features(205 ↔ ch09 213~225행). in-source 빌드 거부(282~288행)는 ch01 268행과 겹친다. 체크리스트(526~547행)와 GLOB·CONFIGURE_DEPENDS 절은 이 글에만 있다. |
| E | 7 | 제목 'target_* 중심 설계'와 description의 '타겟 중심 접근법, 안티패턴'은 54~222행이 이행한다. '대규모 프로젝트 구성 전략'은 226~354행 레이아웃·템플릿과 506~516행 옵션 격리 조각에 그쳐 부분 미이행이다. |
| F | 6 | 522·623행 다음 편 안내(chapter09)는 실제 seriesOrder 9와 맞고, 639~642행 관련 항목(ch07, ch09, ch03, gnu-make chapter07-practical) 라벨도 대상과 맞다. 다음 편 안내가 520~522·621~623행에 두 번 나오고, 체크리스트 544~545행(GNUInstallDirs, Config 파일)에 ch07 링크가 없으며 전제 지식 안내가 없다. |
| G | 2 | 본문에 기능별 버전(165행 CONFIGURE_DEPENDS 3.12+, 338행 3.21+, 41행 3.0+/3.15+)은 있다. 627~633행 참고 자료는 주장과 연결되지 않은 목록이다. 179행은 'CMake 매뉴얼 자체가'라며 따옴표로 인용하지만 링크·절이 없고, 로컬 CMake 4.4.4 file() 도움말 원문과 문구가 다르다. 기준 CMake 버전이 없다. |

uncertainties:
- 15행 'CMake … 50년 가까이 살아남은 비결': CMake 첫 공개는 기억으로 2000년 무렵이라 약 25년으로 보이지만 1차 자료로 확인하지 않았다.
- 163행 '손으로 적은 목록은 Makefile 자체가 변경되므로': 148행은 CMakeLists.txt를 수정한다고 한다. 용어 실수로 보이며 ch01 195행에도 같은 표현이 있다.
- 179행 'CMake 매뉴얼 자체가 "CONFIGURE_DEPENDS는 가능하면 피하라"': file() 도움말은 소스 GLOB을 권하지 않고 CONFIGURE_DEPENDS가 모든 생성기에서 안정적이지 않을 수 있다고 쓴다. 취지는 비슷하나 따옴표 문구는 원문에 없다.
- 176행 'Visual Studio, Xcode는 지원하지 않거나 불완전': 매뉴얼은 특정 생성기를 이름 대지 않는다.
- 372~377행: 오타 줄은 `mylob`인데 377행 주석은 'MyProject::mylob을 찾을 수 없다'고 한다. target_link_libraries 도움말은 일반 이름을 `-lmylob`으로 넘기고 `::` 이름만 없으면 에러라고 쓰며, 376행 '경고만 나오고'의 경고는 문서에 없다.
- 573행 '키워드가 없으면 CMake 버전에 따라 경고 또는 에러': target_include_directories 도움말은 키워드가 required라고만 쓴다. 경고로 넘어가는 버전은 미확인.
- 48행 매핑표가 link_directories()의 대응으로 target_link_libraries()만 적었다. target_link_directories()는 3.13에 추가됐다(도움말 확인). '권장 대체'를 뜻하면 오류는 아니다.
- 297~299행 전역 CMAKE_CXX_STANDARD와 542행·ch09 213~225행의 target_compile_features 권장이 충돌한다. 권장 규칙끼리의 불일치라 오류 확인에는 넣지 않았다.
- 440행 Release `-O3 -DNDEBUG`가 기본 CMAKE_CXX_FLAGS_RELEASE와 중복되는지 미확인.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토) 기준 병합 후보는 `chapter03-targets.md`(old-vs-modern 도입·별칭·키워드 누락)와 `chapter09-modern-advanced.md`(BUILD/INSTALL_INTERFACE, target_compile_features)다. 다음 조치는 보강이다. 273행 최소 버전과 312행 PROJECT_IS_TOP_LEVEL을 맞추고(3.21로 올리거나 351행 수동 검사 사용), ch03·ch09와 겹치는 절은 링크로 줄이며, 체크리스트·GLOB 판단표·의존성 전략 중심으로 남긴다. 체크리스트 역할이 독립 검색 의도를 가져 제외 검토는 아니다.

### `cmake/chapter09-modern-advanced.md` — 53점, 병합 검토

confidence: 중간

factcheck: 미검증. git log에는 0a9dd7bc(slug 고정), 07cc1988(관련 항목 추가), be973200(topic 메타데이터), ac24bb76(제목 변경)과 그 이전의 이동·stub·linter 일괄 커밋만 있다. 1차 자료와 대조한 커밋은 없고, 평가 중에도 1차 자료를 직접 열지 않았다. 원문 안에서 동시에 참일 수 없는 진술도 찾지 못했다. 75행 '디폴트 빌드에 포함되지 않음'과 95행 'ALL이면 디폴트 빌드 시 호출'은 ALL 유무로 나뉘는 진술이라 모순이 아니다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글이 직접 정리한 비교는 110~115행 add_custom_command·add_custom_target 선택 기준 표와 47·56·58행 OUTPUT 의존 모델 설명(Make 규칙과 같은 모델)이다. target_*(134~223행), BUILD/INSTALL_INTERFACE(227~261행), Presets(265~314행), cmake -E 표(343~354행)는 공식 문서 기능 목록 수준이다. 189행 '수십 퍼센트 줄일 수 있습니다', 191행 '섞기 어려워질 수 있어'는 완곡 표현이다. 앵커 part7-05(9)보다 비교 표가 조금 더 있다. |
| B | 12 | 13~23행이 다섯 영역을 예고하고 360~368행이 같은 다섯 영역으로 정리해 흐름은 닫힌다. 167행 'BASE_DIRS 구조 보존'에 install(TARGETS … FILE_SET HEADERS) 전제가 빠졌고, 241행 '/usr/local/include'는 기본 prefix 조건이 없으며, 331·336행 add_custom_command(...)는 생략형이다. 189·271·314행 불확실이 열려 있어 B ≤ 13. |
| C | 6 | CMake 코드 조각(36~44, 82~92, 120~123, 160~164, 269~298행)과 preset 명령(302~304행)이 있다. CMake 버전·환경, 예상 출력, 생성 파일 확인 절차가 없다. 189행 '수십 퍼센트'는 출처·환경 없는 수치라 C ≤ 8. |
| D | 8 | 시리즈 마지막 편이라 +1 글은 없다. (1) Presets 265~314행이 chapter04 418~512행과 겹친다('3.19부터' Ch4 420행, version 6 426·482행, inherits, --preset 470·473행). (2) BUILD/INSTALL_INTERFACE 231~235·250~258행은 chapter07 313·342~352·544~545·565행, chapter08 585~586행, chapter02 647~648·663~664행과 같은 genex를 반복한다. (3) 213~223행은 chapter01 378~401행과, (4) 169~176행은 chapter03 98~117행과 겹친다. 120~126행 POST_BUILD 예는 modern-recipes part3-11 165행과 형태가 같지만 크로스 빌드 산물 처리라 역할이 다르고, part3-11 193~195행 preset도 크로스 빌드용이다. sanitizers/chapter05-cmake-ci.md도 비교했다. custom command 절(27~126행)은 이 글에만 있다. |
| E | 6 | title(2행)의 BUILD/INSTALL_INTERFACE, Presets, cmake -E는 227·265·318행 절에서 다룬다. 분량이 가장 큰 custom command 절(27~126행)과 target_* 절(130~223행)이 title에 없고, description(5행) '자주 안 보이지만 실무에서 결정적인 기능들'은 독자가 무엇을 얻는지 밝히지 않는다. |
| F | 7 | 15행이 전제(Ch1~Ch8)를 밝히고 23행이 참조용으로 읽으라고 안내한다. seriesOrder 10이 없는 마지막 편이고 370~384행 시리즈 마무리와 다음 단계가 다음 편 안내를 대신한다. 395~398행 관련 항목(ch08, ch03, ch07, gnu-make chapter02-rules) 라벨이 대상 title과 맞고 모두 `draft: false`다. 17~21행 목차는 target_*가 먼저인데 실제 절은 custom command(27행)가 먼저라 8은 주지 않았다. |
| G | 3 | 본문에 기능별 최소 버전(157행 3.23+, 178행 3.16+, 265행 3.19+)이 있고, 참고 자료(388~391행)와 399행 add_custom_command 문서 링크가 있다. 모두 latest 문서라 기준 판을 알 수 없고 189·314행 주장에는 출처가 없다. 앵커 part12-10(3)과 같은 수준. |

uncertainties:
- 271행 "version": 6과 265·367행 '3.19+'가 맞는지 cmake-presets(7)로 대조하지 않았다(기억으로는 version 6은 3.19보다 높다).
- 314행 'CMakeUserPresets.json이 덮어쓴다': 같은 이름 preset이 있을 때 덮어쓰는지 오류가 나는지 미확인.
- 189행 'PUBLIC이면 의존 타겟도 같은 PCH를 공유': REUSE_FROM 없이 PCH 산출물을 공유하는지 target_precompile_headers 문서로 확인해야 한다.
- 223행 'CMAKE_CXX_STANDARD는 그 자리에서만 동작'은 이후 생성 타겟의 기본값이 된다는 범위를 적지 않았다.
- 102·106행 version.h를 소스 목록에 넣으면 custom command가 자동 연결된다는 설명을 실행해 보지 않았다.
- 167행 FILE_SET BASE_DIRS 보존에 install(TARGETS … FILE_SET HEADERS)가 필요한지 확인하지 않았다.

병합 대상: Presets 절(265~314행)은 `chapter04-options.md` 418~512행으로, BUILD/INSTALL_INTERFACE 절(227~261행)은 `chapter07-install.md` 304~352·541~565행으로 합칠 수 있다. 글 전체는 병합하지 않는다 — custom command 절(27~126행)이 이 글에만 있고 chapter03 587행이 이 절의 앵커로 링크한다. 다음 조치는 보강이다. 겹치는 두 절을 Ch4·Ch7 링크로 줄이고 custom command·target_* 확장 명령에 실행 결과와 버전 기준을 더한다. sanitizers ch05 149행이 Presets 앵커를 쓰므로 절을 줄이면 그 링크도 함께 고친다.

### `cxl/chapter01-cxl-position.md` — 54점, 보강

confidence: 중간

factcheck: 검증됨. a0eeea28(2026-10-09, 'fact-check CXL Ch 1 against the CXL spec and consortium material')이 CXL 3.1 spec revision history·Flex Bus §6, CXL 3.2·4.0 발표문, 4.0 웨비나(2025-12)와 대조해 Streamlined Port 설명·3.2 행을 고치고 출처 없는 문장을 지웠으며, CEDT 함정을 drivers/cxl/acpi.c로 근거화했다. be8f2ec9(2026-10-10)는 3.1 행 TSP 확장명을 CXL 3.1 §11.5로 정정했다. e2aa6b02는 출처 안내 정리라 근거에서 뺐다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 이 글이 더한 관점은 79행 '128 GT/s는 파이프를 굵게, Bundled Port는 여러 개 묶는 다른 축', 132행 HDM Decoder commit 전 load fault와 `cxl create-region` 함정, 144행 CEDT를 drivers/cxl/acpi.c가 읽는다는 함정이다. 25~29행 프로토콜 표, 45~52행 세대 표, 85~91행 Flex Bus 표는 CXL 소개 자료의 표준 목록이다. 140행 NVLink/IF 용도 구분은 출처 없는 일반론이다. |
| B | 12 | 문제(19~21행) → 세 프로토콜(23~39행) → 세대(41~60행) → 4.0 변경(62~79행) → Flex Bus(81~93행) → 레이어 지도(95~106행) → 시리즈 구성(108~126행) → 함정(128~144행) → 정리(146~153행)로 흐름은 완성됐다. 17행 '15편'은 cxl 디렉터리 파일 15개와 맞다. 89행 x2와 68·91행 'x2 native width 신규'의 관계, 31·106행 '시분할' 표현 등 불확실이 열려 있어 B ≤ 13. |
| C | 4 | 실행·관찰 절차가 없다. 재현 단서는 132행 `cxl create-region`과 144행 `drivers/cxl/acpi.c` 이름뿐이고 명령 출력·환경·기대 결과가 없다. 90행 '8/16/32/64/128 GT/s', 73행 '지연을 더하지 않았다'는 발표 자료 인용이지 측정이 아니다. 앵커 part6-09(C 4)와 같은 수준. |
| D | 9 | 비교한 글: 같은 시리즈 chapter02, chapter05-cxl-4-features.md, 다른 시리즈 modern-recipes/part11-15-pcie-to-cxl.md, performance-engineering/part3-11-cxl-interconnect.md, hbm/chapter09-cxl-mem.md. 25~29행 프로토콜 표와 37행 'CXL.io만 필수' ≈ part11-15 33~40행, part3-11 39~45행, hbm ch09 34~38행. 45~52행 세대 표 ≈ part3-11 28~33행, hbm ch09 48~51행. 66~71행 4.0 변경 표 ≈ ch05 21~26행. 75~79행 Bundled Port ≈ ch05 58행 절, ch02 106~108행 절. 81~93행 Flex Bus·31행 DVSEC ≈ part11-15 30·54~68행. 레이어 지도(95~106행)·15편 구성(108~126행)·4.0 행은 고유하다. |
| E | 8 | title '1.1에서 4.0까지'와 description '푸는 문제, 세대별 진화, 4.0 핵심 변경(128 GT/s·Bundled Port)'을 19~21·41~60·62~79행이 이행한다. 대상 독자·전제 지식 명시가 없어 9 미만. |
| F | 5 | 157행 다음 편 Ch 2는 seriesOrder 2 chapter02-system-architecture.md와 맞다. 161행 HBM Ch 9, 162행 HBM Ch 12, 163행 Perf Eng Ch 29(part3-11), 165행 Security Ch 11은 맞다. 164행 'Modern Embedded Recipes Ch 149'의 대상 part11-15-pcie-to-cxl.md는 seriesOrder 150이고 149는 part12-13-matter-thread.md다. 104행 'Flex Bus Physical — PCIe PHY, 모드 협상 → Ch 5'도 ch05 H2(28행 128 GT/s PHY, 58행 Bundled Port, 77행 RAS)에 모드 협상 절이 없다. 틀린 라벨이 있어 F ≤ 5. |
| G | 3 | 본문에서 주장과 묶인 출처는 64행 '4.0 발표문(2025년 11월 18일)과 소개 웨비나(2025년 12월)'와 144행 `drivers/cxl/acpi.c` 둘이다. 171~176행 출처 안내에 CXL 3.1 spec(2023-08), Linux v7.3-rc6, QEMU master가 있으나 개별 주장과 § 번호로 연결되지 않고 URL이 없다. 17행 'CXL 4.0 spec § 번호만 인용'은 171~172행('§·표 번호는 3.1 기준', '4.0 spec 본문은 쓰지 않았다')과 어긋나고 본문에 § 번호가 하나도 없다. |

uncertainties:
- 43행 '1.1 발표 이후 5세대'와 47~52행 6행 표: 1.1 이후 다섯 세대(2.0~4.0)로 읽으면 맞아 모호한 표기 수준.
- 17행 'CXL 4.0 spec 문서는 § 번호만 인용', '1차 자료 … hyperscale 운용 자료'와 171~172행·출처 목록이 어긋난다(출처 서술 불일치라 오류 확인에 넣지 않음).
- 89행 Lane 구성 x2와 68·91행 'x2 native width 신규(128 GT/s)'의 관계를 CXL 3.1 §6 Flex Bus 표로 다시 확인하지 않았다.
- 31·106행 '시분할 다중화'가 ARB/MUX의 flit 단위 interleave 서술과 맞는지 1차 자료로 보지 않았다.
- 140행 NVLink·Infinity Fabric 용도 구분은 출처가 없다.

병합 대상: 시리즈 첫 글(seriesOrder 1)이자 15편 목차·레이어 지도를 가진 허브라 병합 검토 대신 보강이다. 보강 방향은 164행 라벨(Ch 150)과 104행 Ch 5 연결 정정, 17행 출처 서술을 171~172행과 일치, 세대·Flex Bus 표에 CXL 3.1 § 번호 연결, part11-15·part3-11과 겹치는 도입 표 축소다.

### `cxl/chapter02-system-architecture.md` — 57점, 병합 검토

confidence: 중간

factcheck: 검증됨. a0eeea28(PR #59) 안의 'fix(content): fact-check CXL Ch 2 against the CXL 3.1 spec and 4.0 webinar'가 Type 3 HDM-H/HDM-DB, Shared FAM 일관성(§2.4.4), Multi-Headed Device(§2.5, LD Pool CCI), Bundled Port(4.0 웨비나)를 1차 자료와 대조해 고쳤다. e2aa6b02는 footer 출처 문구만 바꾼 커밋이라 근거로 쓰지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 85~88행 Shared FAM 일관성을 영역마다 FM이 HDM-DB 하드웨어 모델·소프트웨어 모델 중 고른다는 설명(CXL 3.1 §2.4.4), 92~104행 MH-SLD/MH-MLD 구분과 LD Pool CCI(MCTP·Mailbox tunnel), 146~156행 'MLD vs Shared FAM'·'Bundled Port vs Multi-LD' 오해 정리가 이 글만의 부분이다. 23~27행 Type 표와 33행 Type 1 설명은 표준 내용이고, 144행 '운영 복잡도가 디바이스 복잡도와 일치하지 않습니다'는 근거 없는 일반론이다. |
| B | 12 | Type 1·2·3(19~52행) → MLD(54~74행) → Shared FAM(76~88행) → MH-MLD(90~104행) → Bundled Port(106~119행) → Linux(121~138행) → 실수 → 정리로 제목의 분류를 모두 다룬다. Type 2는 37~39행 두 문장 뒤 Ch 3으로 넘기고, Linux 절은 Type 2·Type 1을 133·135행 주석 한 줄씩으로 끝낸다. 15행 '5가지 형태'인데 96행 MH-SLD가 따로 나와 분류 경계가 흐리다. 제품표(47~50행)·커널 버전 불확실이 열려 있어 13 이하. |
| C | 5 | 재현 절차는 125~130행 `ls /sys/bus/cxl/devices/` 출력 예 하나이고 커널 버전·장치·QEMU 여부가 없다. 47~50행 제품표의 '128·256 GB', '96 GB 고객 검증 완료', '컨트롤러당 최대 2 TB'는 출처·시점 없는 수치라 C ≤ 8. 66~72행 2 TB/512 GB×4 흐름은 가상 예로 FM 명령·관찰이 없다. |
| D | 9 | 비교한 글: 같은 시리즈 chapter01, chapter03, chapter04-pooling-gfam.md, chapter05-cxl-4-features.md, 다른 시리즈 hbm/chapter11-cxl-device-types.md, modern-recipes/part11-15-pcie-to-cxl.md, performance-engineering/part3-11-cxl-interconnect.md. (1) 60~72행 LD·LD-ID 표와 '2 TB를 512 GB×4 LD, LD3 미할당' 예가 ch04 51~66행(예시 58~65행)과 같다. (2) 110~117행 Bundled Port 표가 ch05 62~67행과 거의 같은 문장이다. (3) 78~88행 pooled/Shared FAM·HDM-DB가 ch04 69~85행과 겹친다. (4) 23~27·33행 Type 표·Type 1 설명이 hbm ch11 25~29행(27행 snoop filter·atomic 예까지 같음)과 겹친다. hbm ch11 19·133행이 분류 체계를 이 글로 넘기므로 '디바이스 분류' 역할은 이 글에 있다. |
| E | 7 | title의 Type 1·2·3·MLD·MH-MLD와 description '디바이스 분류와 multi-LD·multi-head 구조'를 19~104행이 다루고 정리(160~165행)도 같은 범위로 끝난다. 'System Architecture'는 본문(디바이스 분류)보다 넓고, 90행 heading 'MH-MLD — Multi-Headed Device'가 MH-SLD까지 묶어 키워드와 범위가 조금 어긋난다. |
| F | 7 | 169행 다음 편 라벨 'Ch 3: 메모리 일관성 모델 — HDM-DB·HDM-D·Bias·BISnp'가 seriesOrder 3 chapter03-coherency-model.md 제목(2행)과 같다. 173~176행 관련 항목이 Ch 1·4·5 제목, hbm ch11 주제와 맞는다. 본문 링크 29행 Ch 6/7/8, 138행 Ch 11도 맞다. 17행 Ch 1 전제 안내와 39·52·74·119·138행의 절별 후속 장 안내가 글 고유 구조다. 템플릿 H2는 점수에 넣지 않았다. |
| G | 3 | 본문에 주장과 연결된 출처 표기가 있다: 33행 CXL 1.1 규격, 85행 CXL 3.1 §2.4.4, 92행 §2.5, 108행 CXL 4.0 웨비나(2025년 12월), 133행 include/cxl/cxl.h. 180행은 템플릿 footer라 가점 없음. 링크가 없고 47~50행 제품표는 출처·시점이 없으며 Linux 코드 기준 버전이 본문에 없다. |

uncertainties:
- 47~50행 제품표(Samsung CMM-D 용량, SK hynix '96 GB 고객 검증 완료', Micron CZ120 128·256 GB·PCIe 5.0 x8, Astera Labs Leo '컨트롤러당 최대 2 TB')를 벤더 자료로 확인하지 않았다.
- 133행 CXL_DEVTYPE_DEVMEM이 include/cxl/cxl.h에 있다는 주장의 기준 커널 버전이 본문에 없다(Ch 1 footer의 v7.3-rc6 기준으로 보이나 미확인).
- 15행 '5가지 형태'는 96행 MH-SLD까지 치면 여섯이다. 개수 표기 문제라 오류 확인 대상 아님.
- 102행 'MLD: switch를 통해 multi-host'는 MLD가 한 host에 직결될 때를 말하지 않는다. 규격 §2.4와 대조하지 않았다.
- 144행 Type 3/Type 2 운영 복잡도 비교는 출처 없는 일반론이다.

병합 대상: 글 전체의 병합 대상 없음 — hbm/chapter11-cxl-device-types.md 19·133행이 분류 체계를 이 글로 넘기므로 '디바이스 분류' 역할은 이 글에만 있다. 다음 조치는 보강(차별화)이다. 60~72행 MLD 표·2 TB 예는 `chapter04-pooling-gfam.md` 51~66행에, 110~117행 Bundled Port 표는 `chapter05-cxl-4-features.md` 62~67행에 두고 이 글은 요약과 링크로 줄인다. 대신 Type별·MLD/MH-SLD/MH-MLD별 규격 절 기준과 커널 버전을 밝힌 sysfs·`cxl list` 관찰 예를 보강하고, 제품표는 출처·시점을 붙이거나 TBD로 둔다.

### `cxl/chapter03-coherency-model.md` — 60점, 보강

confidence: 중간

factcheck: 검증됨. a0eeea28(PR #59) 안의 'fix(content): fact-check CXL Ch 3 against CXL 3.1 §2.2'가 HDM-H/HDM-D/HDM-DB 정의와 디바이스 유형, Type 3 기본 영역(HDM-H), Bias와 BISnp가 같은 선상의 선택지가 아니라는 점, 256B flit 디바이스의 HDM-DB 필수 지원을 §2.2.1과 대조해 고쳤다. cxl list 출력은 cxl-list man page와 커널 port.c의 decoderX.Y/target_type ABI로 바꿨고, 출처 없는 BISnp 단계표와 bias 전환 '수 µs'는 지웠다. e2aa6b02(#61)는 출처 footer만 정리했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 33~37행 표가 HDM-H·HDM-D·HDM-DB를 규격 정의, 디바이스 유형, 일관성 채널로 나눠 비교하고, 91~97행 '자주 하는 실수'가 'Bias와 BISnp 중 하나를 고른다', 'Type 3의 주된 영역은 HDM-DB' 같은 오해를 규격 근거로 바로잡는다. 나머지는 규격 §2.2를 풀어 쓴 설명이고, 76·105행 snoop filter 트레이드오프는 일반론이며, 50행 전환 비용은 TBD다. |
| B | 13 | HDM 정의(19~27행) → 세 종류(29~39행) → HDM-D bias(41~50행) → HDM-DB BISnp(52~61행) → 비교표(63~70행) → snoop filter(72~76행) → Linux sysfs(78~87행) → 실수(89~105행) → 정리(107~114행)로 흐름은 완성됐다. BISnp 처리 순서는 61행 두 문장뿐이고, bias 전환은 50·101행에서 멈추며 전환 비용은 TBD다. 61행 '2.2.2절의 bias 기반 추적 방식'은 본문에서 설명하지 않은 절 번호를 가리킨다. |
| C | 7 | 실행해 볼 수 있는 것은 82~85행 `cat /sys/bus/cxl/devices/decoder1.0/target_type` 한 줄과 87행 `cxl list -M` 필드 이름 나열뿐이다. 커널·하드웨어(또는 QEMU)와 전체 예상 출력이 없다. 50행 '예: 4 KB당 1 bit'는 출처 없는 수치라 C ≤ 8. |
| D | 11 | 같은 시리즈: chapter02 39·52행은 Type 2 bias와 HDM-H/HDM-DB를 짧게 소개하고 Ch 3으로 넘기며 87~88행은 Shared FAM 일관성만 다룬다. chapter04 78·85·150행은 BISnp·HDM-DB를 한 줄씩만 쓴다. chapter08-cxl-mem.md 39·47~48행 BISnp/BIRsp 채널 표는 이 글 56~59행과 겹치지만 131~135행에서 흐름을 Ch 3으로 넘긴다. 다른 시리즈: hbm/chapter10-cxl-mem-protocol.md 61~64행 Host/Device Bias 표와 66행 'page 단위(예: 4 KB당 1 bit)… Transition Agent… 전환 비용 TBD' 단락이 이 글 45~48행 표·50행 단락과 거의 같은 문장이다. hbm/chapter11 53·91~95행은 tier 관점이라 겹침이 작고, postmortem/chapter06-cxl-fabric-postmortem.md는 103행 BISnp count 언급뿐이다. |
| E | 7 | 2행 제목 키워드 HDM-DB(52~61행), HDM-D(41~50행), Bias(45~50행), BISnp(56~61·72~76행)를 모두 다룬다. 5행 description은 'Host-managed Device Memory 두 종류'인데 본문 15·29~37·110행은 HDM-H를 넣어 세 종류로 설명한다. |
| F | 5 | 118행 다음 편 안내는 seriesOrder 4 chapter04-pooling-gfam.md와 맞고 내용(2.0 switching·3.0 fabric·GFAM)도 그 글 35·69·89행 절과 맞는다. 122행 Ch 2, 123행 Ch 8 'HDM Decoder의 mapping 구조'(chapter08 83행 절)도 맞다. 124행 'HBM·GDDR 심화 Ch 10 — Bias·BISnp의 message 흐름'은 대상과 맞지 않는다. hbm/chapter10은 19행에서 'BISnp 상태 전이… 메커니즘은 CXL Ch 8이 담당'이라 하고 68·150행에서 BISnp를 CXL Ch 3으로 돌려보낸다. 틀린 라벨이라 F ≤ 5. |
| G | 3 | 17·31행 'CXL 3.1 규격 §2.2 기준', 61행 '2.2.2절', 87행 '커널 ABI 문서(sysfs-bus-cxl, v5.14)'처럼 버전을 붙인 출처가 주장에 연결된 곳이 있다. 규격·ABI 문서 링크가 없고 39·50행 같은 주장에는 절이 없다. 128행은 시리즈 공통 footer라 근거가 아니다. |

uncertainties:
- 87행 'sysfs-bus-cxl, v5.14': target_type 항목이 v5.14 ABI 문서에 이미 있었는지 확인하지 않았다. 같은 라운드의 다른 장은 Linux v7.3-rc6을 기준으로 삼았다.
- 50행 'page 단위(예: 4 KB당 1 bit)'의 규격상 출처를 확인하지 않았다.
- 39행 'HDM-D 흐름은 68B flit 모드와의 호환을 위해 남아 있습니다'의 규격 근거 위치를 확인하지 않았다.
- 80·114행은 'switch 수준 decoder'라고 하지만 83행 예시는 decoder1.0이다. switch decoder인지 root decoder인지 커널 문서로 확인하지 않았다.
- CXL 3.1 규격 원문은 직접 열지 않았다. factcheck 판정은 a0eeea28 커밋 본문 기록에 근거한다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **CMake 시리즈에 1차 자료 대조 커밋 없음 (7편 전부).** ch03~ch09의 git log는 0a9dd7bc slug 고정, 07cc1988·4d1efcb7 관련 항목 추가, be973200 topic 메타, ac24bb76 제목 변경, 400892d7 linter, 09a00a29 stub roll-out, 644b71b5 이동 같은 일괄 커밋뿐이다. 7편 중 6편이 오류 확인이다(ch03 660행, ch06 317행은 공식 문서와 충돌, ch04 368/380행·ch05 155/549행·ch07 264/272~279행은 내부 모순, ch08 273/312행은 코드와 진술 충돌). CMake 시리즈는 `/fact-check-round` 대상이다.
- **참고 자료가 cmake.org 'latest' 링크뿐이고 본문 주장과 연결되지 않음 (CMake 7편 전부).** ch03 730~732·740행, ch04 701~703행, ch05 716~718행, ch06 809~814행, ch07 736~739·747행, ch08 627~633행, ch09 388~391·399행. G가 2~3점에 묶이는 공통 원인이다. 같은 주제의 modern-recipes part3-11은 v3.31 링크를 쓴다.
- **CXL 시리즈 출처가 공통 footer 한 줄에 몰림 (CXL 3편).** e2aa6b02로 Ch 2~15 공통이 된 '이 글은 ... 근거로 합니다' footer(ch02 180행, ch03 128행)와 ch01 171~176행 출처 안내가 개별 주장에 § 번호·링크로 붙지 않는다. 팩트체크는 됐지만 G가 3편 모두 3점이다.
- **출처·측정 환경 없는 구체 수치 (C ≤ 8 상한, 8편).** CMake ch04 36행, ch06 176행, ch07 91행, ch08 175행, ch09 189행, CXL ch01 90행(발표 인용), ch02 47~50행, ch03 50행. 실행 환경(CMake 버전·생성기, 커널·QEMU)과 기대 출력이 10편 모두 없다.
- **공통 H2 뼈대 (10편 전부).** CMake는 '흔한 실수 → 정리 → 다음 장 예고 → 참고 자료 → 관련 항목'(ch03 639·714·724·728·734행, ch06 731·718·803·809·816행, ch07 638·650·728·734·741행, ch04 684~710행, ch05 700~724행), CXL은 '한 줄 요약 → … → 자주 하는 실수 → 정리 → 다음 편 → 관련 항목 → 시리즈 자료 출처 안내'(ch01 13·128·146·155·159·167행, ch02 13·140·158·167·171·178행, ch03 13·89·107·116·120·126행). 루브릭 9절 scaled content 수치 기록 대상이다.
- **같은 설명이 CMake 시리즈 안에서 반복 (D 감점, 6편 관련).** 전역 vs 타겟 설정(ch01 375~394, ch03 15~49·641~655, ch08 121~140행), BUILD/INSTALL_INTERFACE(ch02 647·663, ch03 400~424, ch07 304~353·544~545, ch08 380~391·575~588, ch09 227~263행), CMakePresets(ch04 418~512, ch09 265~316행), multi-config if(CMAKE_BUILD_TYPE)(ch04 641~654, ch08 590~603행), FetchContent 폴백·옵션 격리(ch05 447~487, ch08 480~515행), googletest 선언(ch05 458~464, ch06 352~361행). 정본 한 곳을 정하고 나머지는 링크로 줄일 대상이다.
- **같은 글 안 반복·재작성 흔적 (CMake 4편).** ch03 233~262/282~310행 같은 예제 두 번, ch05 369~382/531~541행 비교표 두 번·384/386행 heading 중복, ch06 라벨 186~209/254~276행 등 네 쌍, ch08 520~522/621~623행 다음 편 안내 두 번.
- **관련 항목 라벨이 대상 글 내용과 다름 (3편, F ≤ 5).** CMake ch04 708행(chapter05에 option 없음)·709행(GNU Make 조건부 → chapter01-intro, 실제는 chapter06-conditionals), CXL ch01 164행('Modern Embedded Recipes Ch 149' → seriesOrder 150 글)·104행(Ch 5에 모드 협상 절 없음), CXL ch03 124행(HBM Ch 10을 BISnp 흐름으로 소개하지만 그 글은 CXL Ch 3·8로 넘김). 평가자 기록상 'Ch 149' 라벨은 cxl/chapter06, hbm/chapter10·11, pcie/chapter01, bootloader/chapter34, modern-recipes part11-16·11-17에도 있고, hbm/chapter11 131행도 ch03 124행과 같은 문제다. 4d1efcb7이 CMake Ch4·5·6 관련 항목을 한꺼번에 채웠으므로 같이 대조한다.
- **CMake 시리즈 안 권장 충돌.** 전역 set(CMAKE_CXX_STANDARD 17)을 쓰는 템플릿(ch08 297행 등)과 target_compile_features 권장(ch08 542행, ch09 213~225행)이 엇갈린다. 'CMakeLists.txt'를 'Makefile'로 부르는 용어 실수가 ch01 195행·ch08 163행에 있다. '키워드 없는 target_*는 경고/오류' 서술이 ch03 660행(오류 확인)·ch08 573행에 있어 known-falsehoods 등재 검토 대상이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 6편(CMake ch03~ch08)은 각 글의 오류 위치를 공식 문서로 고치고 출처를 적은 커밋을 남긴다. ch08(273행 최소 버전 vs 312행 PROJECT_IS_TOP_LEVEL), ch06(317행 DEPENDS → FIXTURES_REQUIRED), ch03(660행 plain signature), ch04(367~368·379~380행 configure_file 치환), ch05(155행 구분자), ch07(264행 vs 272~279행 Config 템플릿) 순으로, 템플릿을 그대로 복사하면 깨지는 것부터 본다.
- CMake 시리즈 전체를 `/fact-check-round` 대상으로 올린다. 기준 CMake 버전을 정하고 참고 링크를 'latest'에서 판 고정 링크로 바꾸는 것도 같은 라운드에서 한다. ch05 127행 'Config 먼저', ch09 271행 preset version 6과 '3.19+'는 문서를 열어 오류 여부를 정한다.
- 같은 작업에서 틀린 관련 항목 라벨(CMake ch04 708·709행, CXL ch01 104·164행, CXL ch03 124행)을 고친다. 'Ch 149' 라벨은 다른 시리즈 글까지 grep으로 한 번에 정리한다. F 감점 원인이라 다시 채점할 때 바로 반영된다.
- 병합 검토 2편: CMake ch09는 Presets 절을 ch04로, BUILD/INSTALL_INTERFACE 절을 ch07로 넘기는 부분 병합 뒤 custom command 중심으로 보강하고 sanitizers ch05 149행 앵커를 함께 고친다. CXL ch02는 MLD 예·Bundled Port 표를 ch04·ch05에 맡기고 sysfs·`cxl list` 관찰 예를 보강한다.
- 보강 2편: CXL ch01은 허브 예외 적용을 종합 검토에서 다시 확인하고 17행 출처 서술을 171~172행과 맞춘다. CXL ch03은 5행 description '두 종류'를 본문 세 종류와 맞추고 hbm/chapter10 61~66행과 겹치는 bias 절을 한쪽으로 정리한다.
- CXL 시리즈는 팩트체크가 끝났으므로 다음 루프(cxl chapter04~)에서도 G·C 공통 감점(footer 출처, 실행 환경 없음)이 반복되는지 세어 시리즈 단위 보강 항목으로 묶는다.
