# 공개 글 AdSense 평가 — 루프 27

> 대상: 공개 글 10편 (GDB Extension and IDE `seriesOrder` 1~6, GNU Make `seriesOrder` 1~4)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 스물일곱 번째 루프다. 대상은 `src/content/blog/tools/debugging/gdb-extension/`의 GDB Extension and IDE 6편 전체(chapter01~06)와 `src/content/blog/tools/build/gnu-make/`의 GNU Make 앞 4편(chapter01~04)이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `gdb-extension/chapter01-python-api-basics.md` | 10 | 11 | 6 | 8 | 7 | 6 | 2 | **50** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `gdb-extension/chapter02-commands-events.md` | 10 | 9 | 7 | 5 | 7 | 6 | 2 | **46** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `gdb-extension/chapter03-pretty-printers.md` | 12 | 11 | 7 | 7 | 7 | 7 | 3 | **54** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part12-10-on-device-llm.md` |
| `gdb-extension/chapter04-frame-unwinder.md` | 11 | 11 | 5 | 8 | 6 | 6 | 2 | **49** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `gdb-extension/chapter05-mi-dap-protocol.md` | 13 | 12 | 7 | 10 | 7 | 7 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `gdb-extension/chapter06-frontends.md` | 9 | 9 | 6 | 4 | 6 | 6 | 2 | **42** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `gnu-make/chapter01-intro.md` | 11 | 12 | 7 | 10 | 8 | 8 | 3 | **59** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `gnu-make/chapter02-rules.md` | 13 | 13 | 8 | 11 | 5 | 7 | 3 | **60** | 미검증 | 보강 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `gnu-make/chapter03-variables.md` | 14 | 13 | 8 | 11 | 7 | 5 | 2 | **60** | 오류 확인 | 우선 조치 | 높음 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `gnu-make/chapter04-pattern-rules.md` | 15 | 13 | 8 | 10 | 7 | 7 | 3 | **63** | 오류 확인 | 우선 조치 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |

평균 54.1점(10편, 합 541점), 범위 42~63점이다. 판정은 병합 검토 5편(gdb-extension ch01·02·03·04·06), 우선 조치 4편(gdb-extension ch05, gnu-make ch01·03·04), 보강 1편(gnu-make ch02)이고 유지·검증 대기·제외 검토는 없다. 오류 확인은 4건이다. gdb-extension ch05는 원문 내부 산술 불일치(Content-Length), gnu-make ch01은 GNU Make NEWS(1차 자료)와 내부 규칙·실행 결과, gnu-make ch03·ch04는 원문 내부 모순과 GNU Make 3.81 실행 결과가 근거다. 10편 모두 git log에 1차 자료 대조 커밋이 없어 '검증됨'은 0편이다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목·본문 링크 대상 파일의 제목·seriesOrder·`draft`, 그리고 같은 주제의 다른 시리즈 글(gdb-lldb chapter09·chapter10, cmake chapter01~04 등)과의 중복까지다. 렌더링·광고 배치·외부 링크 응답은 보지 않았다. gdb-extension과 gdb-lldb 사이의 예제 중복은 글 단위 P0가 아니라 두 시리즈의 역할 정리 대상으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `gdb-extension/chapter01-python-api-basics.md` | 50 | 50 | 0 | 없음 |
| `gdb-extension/chapter02-commands-events.md` | 47 | 46 | -1 | 없음 |
| `gdb-extension/chapter03-pretty-printers.md` | 54 | 54 | 0 | 없음 |
| `gdb-extension/chapter04-frame-unwinder.md` | 50 | 49 | -1 | 없음 |
| `gdb-extension/chapter05-mi-dap-protocol.md` | 58 | 58 | 0 | 없음 |
| `gdb-extension/chapter06-frontends.md` | 42 | 42 | 0 | 없음 |
| `gnu-make/chapter01-intro.md` | 61 | 59 | -2 | 없음 |
| `gnu-make/chapter02-rules.md` | 61 | 60 | -1 | 없음 |
| `gnu-make/chapter03-variables.md` | 61 | 60 | -1 | 없음 |
| `gnu-make/chapter04-pattern-rules.md` | 63 | 63 | 0 | 없음 |

- 추가한 오류 확인(gnu-make ch01): 127행 '(.RECIPEPREFIX, $(file ...) 같은 함수가 4.0에서 추가됐습니다)'·359행 '4.0부터는 .RECIPEPREFIX 변수로' ↔ GNU Make NEWS(github.com/mirror/make master) 636행 'Version 3.82 (28 Jul 2010)' 절 698행 '* New special variable: .RECIPEPREFIX'. `$(file)`은 NEWS 596행(4.0 절)이라 맞다. 평가자가 uncertainties에 둔 것을 1차 자료로 확인해 올렸다.
- 추가한 오류 확인(gnu-make ch01): 198행 'Makefile:2: *** missing separator. Stop.' ↔ 181~196행 Makefile의 첫 레시피는 파일 3행(1행 주석, 2행 규칙)이다. 글의 356행 예(2줄 파일 → Makefile:2)와 같은 규칙이면 3이어야 한다. 같은 파일을 8칸 스페이스로 만들어 GNU Make 3.81로 실행한 결과는 'Makefile:3: *** missing separator (did you mean TAB instead of 8 spaces?).  Stop.'이다. 이 두 건으로 판정을 보강 → 우선 조치로 바꾸고 B 13→12, C 8→7로 내렸다.
- 추가한 오류 확인(gnu-make ch03): 178행 `make  # CC=gcc로 빌드`(168행 `CC ?= gcc`의 결과)는 165행 '아직 정의되지 않았을 때만 할당', 285행 CC 기본값 `cc`, 376행 `default` origin 예 `CC = cc`와 함께 참일 수 없다. GNU Make 3.81로 실행하니 `CC=cc origin=default`가 나왔다. 평가자의 534행 오류(`Hello, ame`)에 더했다.
- 기각한 오류 확인: 없다.
- gnu-make ch04: 평가자가 '그 밖에'로 덧붙인 456행과 464~465행의 모순(레시피 없는 명시적 규칙을 두고 판정이 반대)을 정식 오류 근거로 올렸다. 3.81로 cc/gcc 출력, 레시피 없는 규칙, 다중 타겟 한 번 실행을 모두 다시 재현했다. 점수 변경은 없다.
- gdb-extension ch02 B 10→9: 평가자 스스로 '절마다 코드 한 조각과 한 줄 설명'이라 적었고 같은 형태의 앵커 part6-09가 B 8이다. ThreadDumper(263~278행)는 start() 호출도 없다. anchor_ref의 part1-04는 오류 확인 앵커라 part7-05로 바꿨다.
- gdb-extension ch04 G 3→2: 362~365행은 끝의 관련 항목 목록이라 주장과 이어지지 않는다. 주장에 묶인 본문 출처는 237행 V8 gdbinit 하나다.
- gnu-make ch02 E 6→5: 제목(2행)이 '분석'을 약속하는데 본문이 개념 설명 수준이라 루브릭 E 주석('분석·추적·진단·실전 + 개념 소개 본문이면 3~5점')을 적용했다(AP-C-24).
- gnu-make ch03 C 9→8: 74행 '80%'가 출처·환경 없는 수치라 C ≤ 8 상한을 적용했다. confidence는 오류 두 건을 실행으로 재현해 중간→높음.
- 줄 번호 보정(점수 영향 없음): gdb-extension ch01 D(gdb-lldb ch09 73~84행, 721~728행), ch02 D(ch09 173~182·187~195·560~568·716행, gdb-extension ch06 98·455행, gdb-lldb ch10 119·314행 추가), ch03 D(ch05 133~152행), ch04 A·C·D(208행, 257~261행, ch01 257·263·264·282행, 코루틴 접기는 구현이 달라 '같다'를 철회), ch05 D(python/chapter02 224~232행), ch06 D(gdb-lldb ch10 대응 줄을 grep 결과로 정정), gnu-make ch03 D(chapter07 45~69행), ch04 D(chapter07 79행은 일반 패턴, chapter03 270~274행).
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `gdb-extension/chapter01-python-api-basics.md` — 50점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 52d2a6cd(시리즈 6편 추가), c99833a1(callout 변환), 400892d7(linter 일괄 수정), ac24bb76(제목 변경), be973200(topic 메타데이터), 28524a9d(코드 블록 언어 태그), 0a9dd7bc(slug 고정)뿐이고, GDB 매뉴얼이나 gdb/python 소스와 대조한 커밋이 없다. 평가 중에도 1차 자료를 열지 않았다. 232행 `t.target()`과 241행 `t.target_type`의 불일치는 기억에 기댄 판단이라 uncertainties로 옮겼다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 69~83행 핵심 객체 표, 85~248행 Value·Type 절, 339~383행 Symbol 속성과 addr_class 목록은 GDB Python API 항목을 차례로 옮긴 카탈로그다. 이 글에만 있는 것은 432~440행 safe_eval 래퍼, 459~504행 whereami 명령, 506~546행 findstr 명령 정도다. 161행 'Value 끼리의 산술은 Python 측에서', 417행 'gdb.write가 … 매끄러움', 556행 '일상 디버깅 효율이 크게 늘어남'은 근거 없는 짧은 해석이다. 선택 기준·실패 사례가 없어 앵커 part1-04(10점)와 같은 구간이다. |
| B | 11 | 활성화(21~41행) → 실행(43~67행) → 객체별 API(85~383행) → execute·write·예외(385~457행) → 예제 두 개(459~546행) → 정리(548~556행)로 흐름은 끝까지 간다. 430행 제목 '무한 정지 방지'에 비해 432~438행 코드는 예외를 None으로 바꾸는 것뿐이고, 161행 '디버기 측 함수 호출'의 예가 없으며(158행은 덧셈), 33행 venv 한계 설명이 없다. 241·125·154·161행 정확성이 열려 있어 AP-C-24에 따라 13을 넘지 않는다. |
| C | 6 | 23~28행 활성화 확인 출력, 450~456행 traceback 예, 542~546행 findstr 출력은 있으나 GDB 버전·OS·대상 프로그램이 없다. 28행 '3.11.5'와 544~545행 주소는 출처·환경 없는 구체 값(C ≤ 8)이고, 241~242행은 pass만 도는 루프다. 성공·실패 관찰이 다른 검증 절차가 없다. |
| D | 8 | 비교한 글: 같은 시리즈 `chapter02-commands-events.md`, 다른 시리즈 `gdb-lldb/chapter09-python-scripting.md`(공개). 이 글 21~41행 ↔ ch09 22~46행(경로 버전만 다름), 69~83행 객체 표 ↔ ch09 73~84행, 108~126행 멤버 접근·slice ↔ ch09 88~99행, 442~448행 print-stack ↔ ch09 721~728행. 이 글만의 것은 Type 세부(185~248행), Inferior 메모리 API(305~337행), Symbol·addr_class(339~383행), 예제 두 개다. ch02와는 역할이 갈린다. |
| E | 7 | 2행 제목과 5행 description의 Value/Type/Frame/Symbol을 85~383행이 모두 다룬다. '활용'에 비해 활용 예는 459~546행 두 개뿐이고 대상 독자·문제가 드러나지 않는다. |
| F | 6 | 560행 다음 장 예고는 seriesOrder 2 `chapter02-commands-events.md` 제목과 맞고, 564·566행 Ch 2·Ch 6 라벨도 대상 제목과 맞다. 전제 지식 안내가 없고 560행 예고는 링크가 없으며 567행은 명령어 메모다. 중복이 큰 gdb-lldb ch09로 가는 연결도 없다. |
| G | 2 | 본문 1차 출처는 565행 GDB Python API 문서 링크 하나다. current 경로라 버전을 알 수 없고 125행 slice, 180행 dynamic_cast None, 379행 SYMBOL_LOC_OPTIMIZED_OUT 같은 주장과 연결되지 않는다. |

uncertainties:
- 241행 `t.target_type.fields()`: 같은 글 232행은 `t.target()`을 쓴다. gdb.Type에 target_type 속성이 없다면 AttributeError가 나지만 매뉴얼로 확인하지 않았다(기억). struct 타입에 target()을 부르는 것 자체가 맞는지도 미확인.
- 125행 gdb.Value가 Python slice(`arr[0:10]`)를 지원하는지 미확인. gdb-lldb ch09 94행도 같은 주장이다.
- 154·161행 'Python 측' 산술과 158행 '디버기 안에서 평가'가 GDB 내부 evaluator와 맞는지 미확인.
- 180행 dynamic_cast 실패 시 None 반환 주석 미확인.
- 31행 '모든 배포판의 기본 패키지가 켭니다'는 출처 없는 보편 주장이다.
- 520행 주석은 'R/W 영역'인데 523~537행 코드는 권한으로 거르지 않는다.
- 379·380행 SYMBOL_LOC_OPTIMIZED_OUT·SYMBOL_LOC_COMPUTED가 Python 모듈에 노출되는지 미확인.

병합 대상: `src/content/blog/tools/debugging/gdb-lldb/chapter09-python-scripting.md` 후보. 이 글 21~41·69~83·108~126·442~448행이 ch09 22~46·73~84·88~99·721~728행과 겹친다. 다음 조치는 보강이다. ch09에 없는 Type·Inferior·Symbol 세부(185~383행)와 독립 검색 의도('GDB Python API Value Type Frame')가 있으므로 겹치는 도입·객체 표를 줄여 ch09로 연결하고, 버전을 밝힌 GDB 매뉴얼로 125·180·232·241행 주장을 확인한다. 시리즈 첫 글이지만 장 목록·읽는 순서를 주는 허브가 아니어서(15행 한 문장 소개뿐) 허브 예외를 적용하지 않았다.

### `gdb-extension/chapter02-commands-events.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 52d2a6cd(시리즈 6편 추가), 400892d7(린터 일괄), ac24bb76(제목 변경), be973200(topic 메타), 28524a9d(코드 블록 언어 태그), 0a9dd7bc(slug 고정)뿐이다. GDB 매뉴얼(Python API 절)이나 GDB 소스와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | HelloCmd(20~29행), COMPLETE_SYMBOL(66~70행), prefix(98~117행), LogAllocs(289~297행), BigMalloc(310~321행), 누수 추적(379~419행), StrLen(164~183행)은 gdb-lldb ch09와 거의 같은 예제다. 60·185·305·421행은 한 줄 평가라 선택 기준이 없다. 고유 부분은 gdb.Parameter(122~158행), 이벤트 표(216~231행), new_objfile 자동 셋업(235~243행), post_event 스레드 예(263~280행), 호출 통계·Tracer(425~465행)다. 앵커 part6-09(A 10)와 같은 형태다. |
| B | 9 | Command → Parameter → Function → 이벤트 → Breakpoint → .gdbinit → 패턴 → batch(15~483행)로 범위는 넓고 정리(485~494행)도 있다. 그러나 13행 한 줄 외에 문제 정의가 없고 절마다 코드 한 조각과 한 줄 설명이다. 391행 주석 'finish 사용'은 코드에 없고, stop()이 False를 반환한 채(394행) stop 이벤트에 반환값 수집을 건다(392행). ThreadDumper(263~278행)는 start() 호출이 없다. 앵커 part6-09(B 8)와 같은 5~9 구간이다. |
| C | 7 | hello 세션(35~38행), set/show 출력(143~146행), `$strlen2` 출력(179~182행)은 기대 출력이 있다. GDB·Python 버전과 대상 아키텍처가 없고(x86-64 전제는 293행 주석뿐), 379~465행 패턴과 470~482행 batch 예는 실행 결과가 없다. |
| D | 5 | 같은 시리즈 `chapter01-python-api-basics.md`(464·511행 Command 예, 80행 Breakpoint 한 줄), `chapter03-pretty-printers.md`(겹침 없음), `chapter06-frontends.md`(98·455행)와는 역할이 갈린다. 다른 시리즈 `gdb-lldb/chapter09-python-scripting.md`와는 HelloCmd 20~29 ↔ 109~120, COMPLETE_SYMBOL 66~70 ↔ 136~142, prefix 98~117 ↔ 149~161, LogAllocs 289~297 ↔ 173~182, BigMalloc 310~319 ↔ 187~195, 누수 추적 379~419 ↔ 206~251(결론 421행 ↔ 254행 ASan 대비 취지), StrLen 164~185 ↔ 465~487, 이벤트 훅 199~210 ↔ 560~568, batch 469~470 ↔ 716행이 겹친다. `gdb-lldb/chapter10-tui-frontends.md`(119·314행)는 역할이 다르다. 고유 절이 있어 1~4는 아니지만 5~9 하단이다. |
| E | 7 | 제목의 네 키워드를 15·160·187·282행 절이 다루고 description의 `$name(...)` 함수·stop hook·자동 BP 액션도 162·245·307행에 있다. 대상 독자와 구체 문제가 없는 API 카탈로그라 9 이상은 아니다. |
| F | 6 | 498행 다음 장 예고는 seriesOrder 3 `chapter03-pretty-printers.md`와 맞고 그 글에 children(72행)·display_hint(102행)·auto-load(181행)·MI(413행) 절이 있다. 502·503행 라벨도 대상 제목과 맞다. 전제 지식(ch01 객체 모델, x86-64 호출 규약) 안내와 긴 패턴 절(375~465행)의 단계 안내가 없고 gdb-lldb ch09 링크가 없다. |
| G | 2 | 504·505행 GDB 공식 문서 링크는 관련 항목에만 있고 216~231행 이벤트 표, 363행 'GDB 8.0+', 280행 'main thread only'와 연결되지 않는다. current 문서이고 본문에 버전 표기가 없다. |

uncertainties:
- 379~399행 누수 추적: stop()이 False를 반환해 malloc 진입에서 정지하지 않는데 반환값 수집을 gdb.events.stop에 걸어(392행) 다음 임의 정지 시점의 `$rax`를 기록할 수 있다. API 의미가 필요한 판단이라 오류 확인으로 올리지 않았다(Breakpoints In Python, FinishBreakpoint 미확인).
- 365~368행 프로젝트 .gdbinit 안의 `add-auto-load-safe-path .`가 363행 '보안상' 설명과 맞는지 미확인.
- 363행 'GDB 8.0+' 버전 표기 출처 없음.
- 263~280행 ThreadDumper가 all-stop/non-stop 모드에서 의미 있는 출력을 내는지 미확인.
- 216~231행 이벤트별 도입 GDB 버전 표기 없음.
- 41~58행 COMMAND_*, 72~79행 COMPLETE_* 목록 완전성 미확인.
- gdb-lldb ch09 206~251행도 같은 `$rax` 수집 구조라 두 글에 같은 의심이 있다.

병합 대상: `src/content/blog/tools/debugging/gdb-lldb/chapter09-python-scripting.md` 후보. 두 글 모두 독립 검색 의도(GDB Python 확장 심화 vs GDB·LLDB 개론의 스크립팅 장)가 있다고 볼 여지가 있어 다음 조치는 보강(차별화)이다. 겹치는 예제를 이 글이나 ch09 한쪽에서 요약+링크로 바꾸고, Parameter·이벤트 표·post_event·watchpoint·batch 같은 고유 절을 버전을 밝힌 GDB 매뉴얼과 대조해 보강한다. 병합·URL 변경은 두 시리즈 전체 검토 뒤에 정한다.

### `gdb-extension/chapter03-pretty-printers.md` — 54점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 52d2a6cd(시리즈 추가), 60ec7a24(다이어그램), c99833a1(callout), 400892d7(린터 일괄), f38a41a0(TikZ), ac24bb76(제목 변경), be973200(topic 메타), 28524a9d(코드 블록 언어 태그), 0a9dd7bc(slug 고정)이고 GDB 문서·libstdc++ printers.py와 대조한 기록이 없다. 500행 MyClass, 507행 `std::__1`, 277행 식은 1차 자료나 API 의미가 있어야 판단되므로 uncertainties로 뒀다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유 부분은 libstdc++ StdVectorPrinter 발췌와 패턴 해설(231~296행), `print elements`를 따르는 printer(164~179행), RTOS Task·Queue 도메인 printer(439~489행), type printer·xmethod(349~411행)다. dispatch 단계(23~33행), 단순 printer(37~61행), display_hint 표(104~110행), auto-load(183~213행)는 gdb-lldb ch09의 반복이다. 437·489·586행은 일반론이다. part1-04(10)보다 고유 예제가 많고 part12-10(18)의 직접 분석은 없다. |
| B | 11 | description이 약속한 to_string/children/display_hint, MI 출력(413~433행), auto-load(181~225행), libstdc++ 분석(227~315행)은 모두 절이 있다. map printer(114~135행)는 `KeyT`/`ValueT` 자리표시자(126행)와 미정의 `next_node`(131행)를 쓰는 조각이고 166행 `...`도 조각이다. printer 예외·`<optimized out>` 처리, xmethod matcher가 class_type을 검사하지 않는 점(399~401행)의 한계 설명이 없다. AP-C-24에 따라 B ≤ 13. |
| C | 7 | 코드·기대 출력 쌍(37~61·74~98·383~409·417~429행)은 있으나 GDB·GCC 버전과 빌드 옵션이 없다(222행 `libstdc++.so.6.0.32`만 간접 단서). map printer는 그대로 실행되지 않고 482~486행 출력은 `[0] = ...` 자리표시자다. 315행 '수천 줄'은 출처 없는 수치라 C ≤ 8이다. |
| D | 7 | 비교한 글: 같은 시리즈 chapter01·02·04·05, 다른 시리즈 `gdb-lldb/chapter09-python-scripting.md`. ch09와 dispatch 23~33 ↔ 260~270, Point printer·`print /r` 37~61 ↔ 274~311, display_hint 표 104~110 ↔ 338~344, map printer 114~143 ↔ 346~372(ch09는 연결 리스트형), auto-load 183~213 ↔ 374~390, 소스 위치 229·319 ↔ 392~415행이 겹친다. 같은 시리즈 ch05 133~152행 MI 변수 트리 출력이 이 글 417~433행과 값까지 같다. ch09 14행이 이 시리즈로 깊이를 넘기는 역할 분담은 있다. |
| E | 7 | 제목·description 키워드가 72·146·181·227·413·435행 절에 모두 대응한다. '심화'에 비해 19~143행은 입문 반복이고 대상 독자·문제가 명시되지 않았다. |
| F | 7 | 590행 다음 장 예고는 seriesOrder 4 `chapter04-frame-unwinder.md`와 맞고 594·595행 라벨도 두 대상 frontmatter와 맞다. 15~17행 tldr과 21행 dispatch 다이어그램 뒤 절이 단계 순서를 따른다. 전제(Ch 1) 안내와 gdb-lldb ch09 링크가 없고 렌더 확인을 하지 않아 9 이상은 불가하다. |
| G | 3 | 229행 `gcc/libstdc++-v3/python/libstdcxx/v6/printers.py`, 319행 LLVM `utils/gdb/libcxx/printers.py` 경로가 해당 발췌와 연결되고 596~598행에 문서·소스 링크가 있다. GDB 버전과 발췌한 printers.py의 GCC 버전·커밋 기준이 없고 596행은 current 문서다. 앵커 part12-10(3)과 같은 수준이다. |

uncertainties:
- 277행 vector<bool> length 식이 실제 printers.py와 같은지, 240행 `self.so = 0`과의 관계 미확인.
- 507행 libstdc++-v6 목록의 `std::__1::shared_ptr`가 319행의 'libc++ namespace' 설명과 어긋나 보인다. 실제 출력인지 미확인.
- 500행 myproject 아래 `MyClass`는 47~50행 build_pp가 Point만 등록한 것과 맞지 않는다. 493~559행이 실제 출력인지 미확인.
- 340행 `set print array on  # 배열 한 줄로` 설명을 문서로 확인하지 않았다.
- 365행 type printer의 `type_obj.tag == 'unsigned long'` 비교(기본 타입 tag가 None일 수 있음) 미확인.
- 399~401행 xmethod matcher가 모든 클래스의 `size`를 가로챌 수 있음. 381행과 411행 의미 관계 불명확.
- 168~172행 `gdb.parameter("print elements")`의 unlimited 반환값 미확인.
- 222·225행 libstdc++ auto-load 스크립트 위치 미확인.
- 419~421행 `numchild="3"`·`has_more="0"` 조합 미확인.
- 315행 '수천 줄'은 출처 없는 수치. 288행 '핵심 패턴 셋' 뒤에 다섯 항목(산문 개수 실수).

병합 대상: `src/content/blog/tools/debugging/gdb-lldb/chapter09-python-scripting.md` 256~415행(pretty-printer 절)과 같은 시리즈 `chapter05-mi-dap-protocol.md` 131~152행 후보. 'pretty-printer 심화'라는 독립 검색 의도가 있고 ch09 13~14행이 이 시리즈로 깊이를 넘기므로 합치지 않는다. 다음 조치는 보강(차별화)이다. ch09와 같은 기초(23~143·183~213행)는 줄여 링크하고, 417~433행 MI 출력은 ch05로 넘기며, libstdc++ 내부·xmethod·type printer·도메인 printer를 GDB/GCC 버전과 실제 실행 결과로 보강하고 map printer를 동작하는 코드로 바꾼다.

### `gdb-extension/chapter04-frame-unwinder.md` — 49점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), 28524a9d(코드 블록 언어 태그), be973200(topic 메타), ac24bb76(제목 변경) 등 메타·서식 커밋뿐이고, GDB 매뉴얼·V8·CPython 소스와 대조한 커밋이 없다. 평가 중 1차 자료는 열지 않았다. 225행 미정의 변수는 언어 규칙으로 판단하는 코드 결함, 233행 '유일한 길'과 274행 '대안'은 산문 과장이라 uncertainties로 보냈다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | Frame filter 등록(22~38행), priority(47~63행), FrameDecorator 기본형(65~82행), gdb.Frame API(293~308행), frame type(310~317행)·unwind_stop_reason(331~341행)은 매뉴얼 항목 수준이다. 고유 부분은 코루틴 프레임 개수 접기(88~124행), JIT unwinder 골격(154~231행), V8·CPython·JVM 헬퍼 비교(235~270행)다. 208·233행은 일반론이고, 233행 '유일한 길'은 274행 `__register_frame` '대안'과 맞지 않아 선택 기준이 없다. |
| B | 11 | filter → decorator → frame_args → unwinder → 엔진별 헬퍼 → `__register_frame` → Frame API → 끊김 진단 → 정리(345~352행) 흐름은 끝까지 간다. JIT 예제는 find_code_object_containing·read_memory_u64·JitFrameInfo(217·228·230행)가 정의되지 않았고 225행은 인자로 받지 않은 pending_frame을 쓰며 222행 sp_offset은 쓰지 않는다. 42~45행 bt 출력은 주석 한 줄이고, 13행이 꺼낸 '합성된 자식 프레임'은 본문에 없다. B ≤ 13(AP-C-24). |
| C | 5 | GDB 버전·아키텍처·빌드 환경이 없다. 핵심 JIT unwinder(154~231행)는 202~204·221~222행의 확인 안 된 V8 내부 심볼과 미정의 헬퍼에 의존해 재현할 수 없다. 출력 예 118~122·257~261행의 환경이 없다. part6-09(4)보다 실행 가능한 조각이 조금 많다. |
| D | 8 | 같은 시리즈 chapter03(주제 다름), chapter05(FrameDecorator 언급만), chapter01 257·263·264·282행 ↔ 이 글 293~308행 Frame API. 다른 시리즈 `gdb-lldb/chapter09-python-scripting.md`: SkipBoostFilter 25~37 ↔ 493~506행(글자까지 같음), FrameDecorator 설명 67 ↔ 512행, JitUnwinder 골격 158~183 ↔ 534~549행. 코루틴 접기는 구현이 다르다(이 글 110~115행 프레임 개수, ch09 517~526행 이름 연결). `dwarf-elf/chapter05-cfi-eh-frame.md` 399~404행이 272~287행과 일부 겹친다. |
| E | 6 | 제목·description이 18·65·150행 절과 같은 방향이지만 'JIT 지원' 핵심 예제(154~231행)가 실행되지 않는 골격이고, 268행 소제목 'JVM — hsdis'를 본문(270행)이 다루지 않는다. |
| F | 6 | 356행 다음 장 예고는 seriesOrder 5 `chapter05-mi-dap-protocol.md`와 맞고 360·361행 라벨·slug도 맞다. 345·354·358행 마무리는 시리즈 템플릿이라 가점 근거가 아니고, 전제(Ch 1 Frame 객체) 안내가 없으며 268행 소제목이 내용과 어긋난다. |
| G | 2 | 주장에 연결된 본문 1차 출처는 237행 V8 tools/gdbinit 링크 하나다. 362~365행은 끝의 목록이다. GDB·Python·V8 버전이 없고 285행 'GDB가 `__register_frame`을 watch', 343행 'UNWIND_UNAVAILABLE (DWARF 없음)'에 출처가 없다. |

uncertainties:
- 225행 lookup_jit_frame(pc)가 받지 않은 pending_frame을 쓴다(NameError로 보이나 실행 미확인). 222행 sp_offset 미사용.
- 233행 '유일한 길'과 274행 '대안'이 맞지 않는다(산문 과장으로 A 감점).
- 202~204행 `v8::internal::g_heap`, `code_space_['allocation_top_']`, 221~222행 `frame_size_`·`caller_sp_offset_`가 V8 소스 이름인지 미확인. 203행은 allocation_top_을 code_start로 써 의미도 의심된다.
- 33행 frame.function() 문자열 검사와 297행 gdb.Symbol 반환 설명의 관계(FrameDecorator는 다른 객체일 수 있음) 미확인.
- 241~243행 jss·jlh·job 매크로의 현재 존재 미확인.
- 255행 python-gdb.py 경로와 365행 링크 대상(Tools/gdb/libpython.py)의 관계 미확인.
- 285행 '`__register_frame`을 watch'는 GDB JIT 인터페이스(`__jit_debug_register_code`)와 혼동했을 수 있다.
- 268·270행 hsdis·GDB SA 설명 미확인.
- 340행 UNWIND_FIRST_ERROR 별칭 여부, 343행 빈도 주장 출처 없음.
- 99행 `std::__n4861::coroutine_handle` 버전 표기 없음.
- 315~317행 frame type 상수, 328행 frame_stop_reason_string, 145행 SymValueWrapper 미확인.

병합 대상: `src/content/blog/tools/debugging/gdb-lldb/chapter09-python-scripting.md` 489~553행 후보. ch09 14행이 스스로 빠른 참조라 밝히고 이 시리즈를 깊은 버전으로 지목하므로 이 글을 흡수하지 말고 ch09 쪽 중복 코드(SkipBoostFilter·JitUnwinder)를 줄여 이 글로 링크하는 방향이 맞다. 다음 조치는 보강이다. JIT unwinder를 실행 가능한 최소 예제로 바꾸고, GDB 버전·환경과 실제 bt 출력을 넣고, 268~270행 JVM 절과 285행 설명을 GDB 매뉴얼(JIT Interface)과 대조한다.

### `gdb-extension/chapter05-mi-dap-protocol.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치(루브릭 3-1). 188행은 메시지가 '길이 header + JSON body'라고 하고 191행 예시 header는 `Content-Length: 119`인데, 193~194행 body는 줄바꿈을 빼면 104바이트(193행 49바이트 + 194행 56바이트, `printf '%s' | wc -c`), 줄바꿈 1을 넣어도 106바이트다. 글이 밝힌 규칙과 예시 값이 함께 참일 수 없다. git log(0a9dd7bc·28524a9d·be973200·ac24bb76 등)에 1차 자료 대조 커밋이 없어 오류가 없었더라도 미검증이다. 점수 구간은 병합 검토(40~59)지만 오류 확인이 앞선다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 같은 시나리오를 MI와 DAP로 나란히 보여 주는 구조가 이 글의 몫이다: 백트레이스(116~126행 MI, 305~318행 DAP), 변수 트리 지연 로드(132~152행 `-var-list-children`, 323~353행 `variablesReference`), cppdbg의 DAP→MI 대응(419행). MI 명령 목록(74~110행), prefix 표(57~68행), DAP 메시지 예(207~404행)는 명세를 옮긴 수준이고 어댑터의 매개 방법은 419행 한 줄이다. 423·283행은 근거 없는 단정이다. |
| B | 12 | MI 활성화(29~36행) → 명령·응답(38~162행) → CLI 대응(164~176행) → DAP 전송·핸드셰이크·요청·이벤트(178~406행) → 어댑터(408~437행) → Neovim·Emacs(439~480행) → 어댑터 작성(482~520행) → 비교 표(522~532행) → 정리(534~543행). MI 버전 차이(36행 한 줄), DAP 트래픽 관찰 방법, 어댑터별 차이가 없고 497~519행 TypeScript 예제는 `...` import와 빈 핸들러다. B ≤ 13(AP-C-24). |
| C | 7 | MI 세션 출력(29~34·47~53·116~126·132~150·156~160행)과 DAP JSON 예(207~404행)는 있으나 GDB·cppdbg 버전과 OS가 없고, 어댑터 로그로 실제 트래픽을 보는 절차가 없다. 191행 Content-Length는 193~194행 body와 맞지 않는다. C ≤ 8 상한을 적용하고 검증 절차가 없어 그 아래로 둔다. |
| D | 10 | 비교한 글: 같은 시리즈 chapter03·04·06, 다른 시리즈 `gdb-lldb/chapter10-tui-frontends.md`, `python/chapter02-debugpy-ide.md`. 132~152행 MI 변수 트리가 chapter03 413~433행과 이름(v1/var1)만 다르다. 439~480행 nvim-dap·dap-mode가 chapter06 258~348행과 겹치고 471~478행은 chapter06 332~337행과 같다. gdb-lldb ch10 227·232·239행이 이 글 182·188·412~417행과 같은 내용이다. python ch02 224~232행은 429~435행과 짧게 겹친다. MI 형식과 DAP 단계별 예는 이 글에만 있다. |
| E | 7 | 제목과 5행 description, 본문 23~437행이 같은 질문을 향한다. '분석'에 비해 다수가 명령·메시지 목록(74~110·289~404행)이고 매개 메커니즘은 419행 한 줄이며 대상 독자가 없다. |
| F | 7 | 547행 다음 장 예고는 seriesOrder 6 `chapter06-frontends.md` 제목·description과 맞고 551·552행 라벨도 대상과 맞다. 13~21행 도입·tldr 그림이 두 축을 먼저 잡는다. 전제(Ch 3 display_hint, 139·355행) 안내가 없고 412~417·425~427·433~435행 흐름이 ASCII 텍스트 블록이다. |
| G | 2 | 112행 GDB/MI 문서(current), 553~555행 MI 문서·DAP 명세·어댑터 목록이 있으나 버전이 없고 36행 'mi3이 현재 표준', 180행 '2016년 도입', 528행 'MI 1990s'에 출처가 연결되지 않는다. 493행 링크와 497행 패키지도 판이 없다. |

uncertainties:
- 191행 Content-Length 119가 209~212행 긴 initialize를 의도했는지 알 수 없으나 화면의 body와는 어느 쪽이든 맞지 않는다.
- 188·528·537행 'JSON-RPC': DAP가 JSON-RPC 2.0 형식인지 명세로 확인하지 않았다(gdb-lldb ch10 239·362행도 같은 표현).
- 36행 'mi3이 현재 표준', 98~99행 `-data-read-memory`·`-data-write-memory` 권장 여부 미확인.
- 355행 `indexedVariables: 3`의 출처, 283행 logpoint 변환 출처 없음.
- 423행 CodeLLDB 평가, 437행 Rust 어댑터 `rust-analyzer` 출처 없음.
- 180행 DAP 2016년, 528행 MI 1990s 미확인.
- 493·497행 `vscode-debugadapter` 현재 이름, 532행 'lldb-vscode' 현재 이름(lldb-dap 등) 미확인.
- audit:reading·폰 폭 렌더 미확인.

### `gdb-extension/chapter06-frontends.md` — 42점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), 28524a9d(코드 블록 언어 태그), be973200(topic 메타데이터), ac24bb76(제목 개명·날짜 정리) 등 일괄 정리 커밋뿐이고, 52d2a6cd 이후 단축키·명령·설정 키를 GDB 매뉴얼·cgdb·gdb-dashboard·cpptools·nvim-dap·Cortex-Debug upstream과 대조한 커밋이 없다. 원문 안에서 동시에 참일 수 없는 두 진술도 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 도구마다 소개·설치·키 목록을 늘어놓은 카탈로그이고 체언으로 끝나는 조각 문장이 대부분이다(25·29·52·83·122·318행). 고유 해석은 그리는 방식 비교(47·64·98행)와 선택표(443~456행)·병용 권고(458행)다. 122·381·411행은 근거 없는 평가다. 앵커 part7-05의 A 9와 같다. |
| B | 9 | description의 일곱 도구는 모두 절이 있다(15·54·85·124·163·258·350행). 각 절은 코드 한 덩어리와 한두 줄 설명이고 한계는 45~50·252~256·159~161행에만 있다. 제목의 '비교'는 443~456행 선택표 하나에 몰려 있다. |
| C | 6 | launch.json 다섯 구성(167~220행), nvim-dap Lua(260~316행), Cortex-Debug(354~371행)는 쓸 수 있지만 버전·환경·예상 화면이 없다. 322~327행 lua 블록에 `:Telescope` Ex 명령과 `#` 주석이 섞여 실행되지 않고, 75~81행 cgdbrc는 불릿이며, 265행 `/usr/bin/lldb-vscode`는 환경 의존이다. |
| D | 4 | 비교한 글: 같은 시리즈 `chapter05-mi-dap-protocol.md`, 다른 시리즈 `gdb-lldb/chapter10-tui-frontends.md`(공개). 내장 TUI 15~50 ↔ 22~66(26행 `layout src`), cgdb 54~83 ↔ 70~96, gdb-dashboard 87~120 ↔ 100~133(103행 같은 wget), gef 134~142 ↔ 139~146(141행 같은 URL), nvim-dap 260~315 ↔ 169~223(174행 같은 경로), dap-mode 331~348 ↔ 278~298, ViewImage 383~411 ↔ 300~333(314행), 선택표 443~456 ↔ 343~354행. dap-mode는 ch05 472행과도 겹친다. 고유 부분(146~157·167~220·225~246·354~379·413~441행)이 있으나 본문 절반 이상이 같은 코드로 답한다. |
| E | 6 | 제목·description의 일곱 항목은 15~381행 절과 맞지만 '비교'는 443~456행 선택표뿐이고 같은 축의 비교표가 없다. 대상 독자·문제는 13행 한 문장이다. |
| F | 6 | 시리즈 마지막 글(seriesOrder 6)이라 다음 편이 없고 460~469행이 Ch1~6을 요약한다. 475~479행 링크 다섯 개와 483·484행 대상 라벨·공개 상태를 확인했다. 내부 링크를 '외부 자료'(481행) 아래 두고, 전제(ch05) 안내가 없으며, 75~81행 설정이 불릿으로 풀려 있다. |
| G | 2 | 도구 저장소 링크(56·87·130~132·352·415행)와 485~493행 외부 자료가 있으나 버전·대조 날짜가 없고 주장별 출처가 없다. 130행 gef 링크는 bata24 fork인데 136행 설치 URL(gef.blah.cat)은 다른 배포처다. |

uncertainties:
- 265행 `/usr/bin/lldb-vscode`: LLVM 18부터 lldb-dap으로 바뀐 것으로 기억하나 릴리스 노트로 확인하지 않았다.
- 130행 gef 링크와 136행 설치 URL이 서로 다른 프로젝트인지 미확인.
- 64행 cgdb가 MI로 받는다는 설명(MI/annotation) 미확인.
- 106행 `dashboard source -style style 'monokai'` vs gdb-lldb ch10 114행 `dashboard -style syntax_highlighting 'monokai'`: 다른 글과의 차이라 오류 확인 아님.
- 246행 Logpoint 변환, 378행 'Live Watch는 J-Link 한정', 386행 'gef memoryview' 미확인.
- 431행 `.vimspector.json`과 417~429행 vim 변수 예시의 관계 미확인.
- 322~327행 lua 블록 Ex 명령·# 주석 혼재(코드 형식 결함).

병합 대상: `src/content/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends.md`. ch10이 14·151·163·341행에서 이 글을 심화로 가리키므로 이 글을 정본으로 두고 ch10은 빠른 참조만 남기도록 중복 절을 나누는 방향을 검토한다. 다음 조치는 보강이다. launch.json 다섯 구성, gef 공통 명령표, Cortex-Debug, Vimspector·DDD는 독립 검색 의도('GDB 프런트엔드 비교')가 있어 제외할 이유가 없다. 비교 축을 정한 비교표, 도구·버전 명시, upstream 대조를 보강한다. URL과 seriesOrder는 바꾸지 않는다.

### `gnu-make/chapter01-intro.md` — 59점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(3232b1be 태그, 0a9dd7bc slug, 07cc1988 관련 항목 등)에 1차 자료 대조 커밋은 없다. 오류 두 건을 확인했다. (1) 127행 '(.RECIPEPREFIX, $(file ...) 같은 함수가 4.0에서 추가됐습니다)'·359행 '4.0부터는 .RECIPEPREFIX 변수로' ↔ GNU Make NEWS(github.com/mirror/make master) 636행 'Version 3.82 (28 Jul 2010)' 절 698행 '* New special variable: .RECIPEPREFIX'. `$(file)`은 NEWS 596행(4.0 절)이라 맞다. (2) 198행 '스페이스 여덟 개로 들여쓰면 ... Makefile:2: *** missing separator. Stop.' ↔ 181~196행 Makefile은 1행 주석, 2행 규칙, 3행(184행)이 첫 레시피이고, 글 자신의 356행 예(2줄 파일 → Makefile:2)와 같은 규칙이면 3이다. 같은 Makefile을 8칸 스페이스로 만들어 GNU Make 3.81로 실행한 결과는 'Makefile:3: *** missing separator (did you mean TAB instead of 8 spaces?).  Stop.'이다. 점수 구간은 병합 검토(40~59)이고 시리즈 첫 글이라 허브 규칙상 보강으로 둘 구간이지만 오류 확인이 앞선다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 21~32행 필요성, 38~54행 의존성 그래프와 mtime 규칙(50행), 181~196행 첫 Makefile, 303~340행 .PHONY, 344~426행 흔한 실수 네 가지는 매뉴얼·입문 튜토리얼(480행)의 표준 구성이다. 이 글만의 것은 touch로 재빌드 범위를 보이는 실험(250~259행)과 touch clean 재현(307~311행) 정도이고 둘 다 흔한 교재 예다. 21행 '1~2초', 259행 '분 단위에서 초 단위'는 근거 없는 수사다. |
| B | 12 | 15~23행 문제 → 38~54행 원리 → 58~127행 설치 → 145~205행 첫 Makefile → 209~270행 실행·재빌드 → 274~299행 규칙 → 303~340행 .PHONY → 344~426행 흔한 실수 → 430~459행 종합 예 → 463~470행 정리로 흐름이 완성되고 459행이 한계와 다음 단계를 적었다. 127·359행 버전 전제와 198행 오류 메시지가 틀렸고 54·32행 불확실이 열려 있어 12. |
| C | 7 | 215~220·232~235·241~244·252~257·307~311·355~357·121~125행에 재현 가능한 명령과 기대 출력이 있다. 21·259행이 출처 없는 수치라 C ≤ 8이고, 198행 기대 출력이 실제 실행 결과(Makefile:3, 힌트 문구 포함)와 달라 1점 더 깎았다. GCC·Make 실행 환경을 밝히지 않았다. |
| D | 10 | 비교 글: 같은 시리즈 `chapter02-rules.md`, 다른 시리즈 `tools/build/cmake/chapter01-intro.md`, `embedded/modern-recipes/part3-11-make-cmake-cross.md`. 348~365행 ↔ ch02 517~525행('(반복)' 표시), 378~403행 ↔ ch02 63~86·527~537행, 299·405~426행 ↔ ch02 182·486~500행으로 흔한 실수 네 개 중 세 개가 ch02에 다시 나온다. CMake Ch 1은 같은 H2 뼈대(13·81~118·133·146행)지만 내용은 겹치지 않는다. |
| E | 8 | 제목과 description의 역할·설치·첫 Makefile·실행이 13~54·58~127·131~205·209~270행과 대응하고 과장이 없다. 대상 독자 수준을 명시하지 않았다. |
| F | 8 | 474행 다음 장 'Ch 2: 규칙'은 seriesOrder 2 `chapter02-rules.md`와 맞고, 예고한 다중 타겟(ch02 40행)·의존성 체인(94행)·셸(176·308행)·종료 코드(229·241행)가 실제로 있다. 484~487행 관련 항목 라벨이 ch02 142·335·373행, ch03 213행, CMake Ch 1 제목, 303행 절과 맞고, 376행 Ch 6(ch06 296행)·228행 Ch 7(ch07 418행) 앞당김 참조도 맞다. 전제 지식 안내가 없고 렌더 확인을 하지 않았다. |
| G | 3 | 478행 GNU Make Manual, 487행 Phony Targets(323행과 연결), 479·480행 자료가 있고 127행에서 4.0 전제를 밝혔으나 그 근거인 .RECIPEPREFIX 버전이 틀렸다. 32행 Feldman 1976 일화·54행 Bazel·Ninja 서술에 출처가 없고 매뉴얼 판·확인 날짜가 없다. |

uncertainties:
- 54행 'Bazel, Ninja 일부 옵션'이 콘텐츠 해시 기반이라는 서술(Ninja는 기본 mtime, restat은 해시 아님)을 1차 자료로 확인하지 않았다.
- 32행 Feldman 1976·'하룻밤' 일화 출처 없음.
- 323행 매뉴얼 권고 인용 문구 미확인.
- 69행 build-essential 구성, 77행 Fedora `@development-tools` 이름 미확인.
- 198행 재현은 GNU Make 3.81로 했다. 4.3으로는 실행하지 않았다.
- 121~125·215~257행 출력의 실행 환경이 본문에 없다.

병합 대상: 병합 대상 없음. 시리즈 첫 글(seriesOrder 1)이라 루브릭 5절 허브 규칙에 따라 병합 대신 보강한다. 우선 조치(127·359행 버전을 3.82로, 198행 오류 메시지를 실제 출력으로) 뒤 ch02와 겹치는 흔한 실수 세 개(348~426행)의 정리 방향을 시리즈 단위로 정한다.

### `gnu-make/chapter02-rules.md` — 60점, 보강

confidence: 중간

factcheck: 미검증. git log는 3232b1be(태그 정규화), 0a9dd7bc(slug 고정), 07cc1988(관련 항목 추가), be973200(topic 메타데이터), ac24bb76(제목 일괄 변경), 400892d7(린터 일괄), 09a00a29, e8f4f432, 644b71b5(디렉터리 이동)이고 GNU Make 매뉴얼과 대조한 커밋이 없다. 337행 vs 123~131행은 문맥상 레시피 두 개를 뜻한다고 읽혀 uncertainties로 뒀다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 타겟·의존성·레시피·특수 타겟 목록은 매뉴얼 Rules·Recipes·Special Targets 범위다. 덧붙인 '왜'가 있다: 59행 다중 타겟과 한 명령이 두 파일을 만드는 경우의 구분, 154~158행 디렉터리 mtime과 order-only, 436행 실패한 gzip의 부분 산물, 115~119행 헤더 수정 전파. 449·369행은 근거 없는 권고이고, 241·288행 `-rm -f` 예는 293행 'rm -f에는 - 불필요'와 어긋난다. |
| B | 13 | 규칙 해부(13~23행) → 타겟 → 의존성(order-only) → 레시피·접두사 → 셸 → 이중 콜론 → 특수 타겟 → 흔한 실수 → 종합 예(545~573행) → 정리로 완성됐고 229~230·369행 한계도 있다. 541·543행 '모든 요소 적용' 예에 449·462행이 권한 .DELETE_ON_ERROR·.SUFFIXES가 없고, 582행은 이미 557·561·568행이 쓰는 `$@`·`$<`·`$^`를 다음 장에서 배운다고 한다. 156·478·456·425행 불확실이 열려 있어 B ≤ 13. |
| C | 8 | 절마다 작은 Makefile 예가 있고 261~266·276~280행 실행 출력, 521~523행 오류 메시지가 있다. Make 버전·OS가 없고 order-only·.DELETE_ON_ERROR·.PRECIOUS 동작은 주석(389·409~411행)으로만 적었다. 525행 '99%', 598행 '9할'은 출처 없는 수치라 C ≤ 8. |
| D | 11 | 같은 시리즈 `chapter01-intro.md`와 겹친다: 63~86·527~537행 ↔ ch01 378~400행, 182~215·486~500행 ↔ ch01 299·405~427행, 517~525행('(반복)') ↔ ch01 198·348~356행. 470~484행은 `chapter07-practical.md` 523~535행과 해결이 같다. H2 뼈대 466·541·586·596·600·606행이 ch01 344·430·463·472·476·482행과 같다. `chapter04-pattern-rules.md` 364~376행은 grouped target을 맡아 역할이 다르고, ch03 275·ch04 420·ch05 541·ch06 561·ch07 591행은 order-only 한 줄 언급이다. 다른 시리즈 `modern-recipes/part3-11-make-cmake-cross.md` 80행, `cmake/chapter09-modern-advanced.md` 70행, `cmake/chapter03-targets.md`와는 겹치지 않는다. |
| E | 5 | description의 다중 타겟(40~61행), order-only(142~168행), 접두사(234~304행), 이중 콜론(335~369행)은 다룬다. 그러나 제목 'Make 규칙 분석 — … 평가'가 '분석'을 약속하는데 본문은 매뉴얼 범위의 개념 설명에 이유를 붙인 수준이고 '평가'가 무엇인지(86행 정도) 드러나지 않는다. 루브릭 E 주석으로 3~5점, 앵커 part1-04 E 5와 같은 경우다. |
| F | 7 | 598행 다음 장은 seriesOrder 3 `chapter03-variables.md`와 맞다. 608~612행 관련 항목 대상(ch01 38·303행, ch03 124행, ch04 81·364~376행, `cmake/chapter03-targets.md` 13행, 매뉴얼 Prerequisite-Types)을 모두 열어 라벨이 맞음을 확인했다. 86행 ch01 앵커, 59행 Ch4, 140행 Ch6(296행)·Ch7(82행) 안내도 맞고 15·184행이 전제 글을 가리킨다. 렌더 확인을 하지 않았다. |
| G | 3 | 602~604·612행에 매뉴얼 링크가 있고 217·457행 '.ONESHELL 3.82+', 59행 'grouped target 4.3' 버전 표기가 있다. 612행만 order-only 정의에 붙어 있고 나머지는 글 끝 목록이라 405·429·456행 주장과 연결되지 않는다. 예제 확인 Make 버전·환경이 없다. |

uncertainties:
- 156·478행: 기존 build/hello.o를 다시 쓰면 디렉터리 mtime이 바뀌지 않을 수 있어 '영원히 반복'되는지 1차 자료·실행으로 확인하지 않았다.
- 456행 `.SUFFIXES:` 비우기가 내장 패턴 규칙까지 끄는지(-r 필요 여부) 미확인.
- 425행 .SECONDARY/.PRECIOUS 구분 미확인.
- 337행 '단일 콜론으로 두 번 적으면 오류'는 문자 그대로 읽으면 123~131·133행과 충돌하나 문맥상 레시피 중복으로 읽혀 오류 확인으로 올리지 않았다(실제로는 경고 후 마지막 레시피 사용으로 기억, 미확인).
- 297행 '+'의 '거의 항상' 필요성, 500행 `$(CURDIR)`를 '자동 변수'로 부른 용어, 230행 .ONESHELL 접두사 처리 미확인.
- 241·288행 `-rm -f` 예와 293행 설명의 어긋남(예시 선택 문제).
- 541~573·582행 종합 예와 449·462행 권고의 불일치.
- 449행 '.DELETE_ON_ERROR를 cmake_minimum_required처럼' 비유 부적절.
- 525행 '99%', 598행 '9할' 출처 없음. 59·217행 버전 표기는 NEWS로 확인하지 않았다(ch04 510행이 4.3 release notes 링크).

### `gnu-make/chapter03-variables.md` — 60점, 우선 조치

confidence: 높음

factcheck: 오류 확인. git log(3232b1be 태그 정리, 0a9dd7bc slug 고정, 07cc1988 관련 항목, be973200 메타데이터, ac24bb76 제목 변경 등)에 1차 자료 대조 커밋은 없다. 오류 두 건은 실제 실행(scratchpad/mk/Makefile, GNU Make 3.81)과 글 안의 모순으로 확인했다. (1) 534행 레시피 `name=world; echo "Hello, $name"`의 주석은 '빈 출력'이지만 실제로는 `echo "Hello, ame"`로 펼쳐져 `Hello, ame`가 나온다. 537행 '`$n`을 Make가 변수로 해석합니다'와도 맞지 않는다(`$n`이 빈 값이면 `ame`가 남는다). (2) 178행 `make  # CC=gcc로 빌드`(168행 `CC ?= gcc`) ↔ 165행 '아직 정의되지 않았을 때만 할당', 285행 표 CC 기본값 `cc`, 376행 `default` origin 예 `CC = cc`. 세 문장이 함께 참일 수 없고 실행 결과는 `CC=cc origin=default`다. 점수 구간은 보강(60~79)이지만 오류 확인이 앞선다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 고유 예가 있다: 62행 `$BUILD`가 `$B`와 `UILD`로 나뉘는 함정, 254~258행 `ar rcs $@ $?`, 411~421행 일반 `+=`와 `override +=` 비교, 373~389행 `$(origin)` 결과표와 활용 예. 확장 방식·자동 변수·우선순위(76~203·207~275·322~328행)는 매뉴얼 순서를 따른다. 74행 '버그의 80%', 148행, 156행은 출처 없는 일반론이다. |
| B | 13 | 동기(13~46행) → 확장 모델(72~203행) → 자동 변수(207~275행) → 표준 변수(279~318행) → 우선순위·origin·value·override(322~426행) → 디버깅(430~462행) → 실전 예(470~505행) → 흔한 실수(513~575행) → 정리(579~587행). `::=`, target-specific 변수, `export`, `define`이 빠졌고 534·178행 오류와 열린 불확실로 B ≤ 13(AP-C-24). |
| C | 8 | 83·96·132·141·398~401·420~421행에 예상 출력 주석이 있고 119행에 오류 메시지 원문이 있다. Make 버전·환경이 없고 관찰이 아닌 예상이며, 그중 534행 '빈 출력'과 178행 'CC=gcc로 빌드'가 실제 결과와 다르다. 74행 '80%'는 출처 없는 수치라 C ≤ 8. |
| D | 11 | 같은 시리즈 `chapter02-rules.md`는 `:=`/`=`·자동 변수를 이 장으로 넘긴다. `chapter04-pattern-rules.md` 106~116행 자동 변수표가 이 글 211~218행과 겹치지만 108행에서 이 글을 링크하고 `$*`를 더한다. `chapter07-practical.md` 45~69행 설정 골격이 이 글 470~487행과 거의 같다. 다른 시리즈 `cmake/chapter02-language.md`는 도구가 달라 겹치지 않고, src/content/blog 전체를 '재귀적 확장'·'recursively expanded'·'$(origin'으로 grep해도 gnu-make 밖에 맞는 글이 없다. |
| E | 7 | title의 `$@`·`$<`·`$^`는 220~249행, 재귀 vs 단순 할당은 76~161행에서 다루고 범위가 맞다. description의 '9할의 원인'과 74행 '80%'는 근거 없는 과장이다. |
| F | 5 | 591행 다음 장 'Ch 4: 패턴 규칙'은 seriesOrder 4 `chapter04-pattern-rules.md`와 맞고 Ch4(106행 `$*`)·Ch5(103행)·cmake ch4(80행) 라벨도 맞다. 그러나 604행 라벨 'CMake의 set·리스트·캐시가 Make의 `=`/`:=`와 어떻게 다른지'의 대상 `cmake/chapter02-language.md`에는 'make'로 grep해도 cmake 말고 나오는 것이 없다. 틀린 라벨이라 F ≤ 5. |
| G | 2 | 595~597행 매뉴얼 장 링크 세 개와 606행 매뉴얼 첫 페이지뿐이다. 196행 `!=` 4.0, 148행 '매뉴얼이 := 권장', 361행 `-e`에 매뉴얼 절이 연결되지 않고 기준 Make 버전이 없다. |

uncertainties:
- 534·178행 오류는 macOS 기본 GNU Make 3.81로 확인했다. 4.x로는 다시 돌려 보지 않았다.
- 203행 '`!=`는 `:= $(shell ...)`과 결과가 같다'(재귀 변수 여부)를 매뉴얼로 확인하지 않았다. 3.81에는 `!=`가 없다.
- 203행 'MAKEFLAGS에 따라 여러 번 파싱될 수도'는 근거가 없다.
- 196행 `!=` 4.0, 591행 grouped target 4.3 도입은 NEWS로 확인하지 않았다.
- 148행 '매뉴얼이 :=를 권한다'를 원문으로 확인하지 않았다.
- 119행 오류 메시지가 4.x 출력과 글자까지 같은지 미확인.
- 552행 '빈 타겟이 됩니다': 3.81에서는 `*** No targets. Stop.`으로 멈춘다. 틀렸다고 단정하지 않았다.
- 424행 '`+=`/`set` 양쪽'의 `set`이 무엇인지 불분명.
- 74행 '80%', 156행 성능 누적 주장 출처 없음.

### `gnu-make/chapter04-pattern-rules.md` — 63점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(35baac92 툴링·다이어그램, 3232b1be 태그, 0a9dd7bc slug, 07cc1988 관련 항목, 8cf32ed2 앵커, be973200 topics, ac24bb76 제목, 400892d7 linter, 09a00a29, e8f4f432, 644b71b5)에 1차 자료 대조 커밋은 없다. 오류 근거는 셋이다. (1) 글 안의 모순: 160행은 `CC := gcc`인데 170~173행 예상 출력은 `cc -Wall -g  -c -o main.o main.c`다. GNU Make 3.81로 make -n을 돌리니 `gcc -Wall -g   -c -o main.o main.c`가 나왔다. (2) 456행 '레시피 없는 명시적 규칙(453행 `main.o: main.c header.h`)이 패턴 규칙 적용을 막을 수 있다' ↔ 464~465행 같은 형태(`main.o: header.h`, 레시피 없음)를 'OK, 의존성만 추가'. 3.81에서 453행 형태로 실행하니 패턴 레시피 `gcc -c main.c -o main.o`가 적용됐다. (3) 81·367행은 `%.pb.cc %.pb.h: %.proto`에서 protoc이 두 번 호출된다고 쓰지만, 3.81에서 `%.a %.b: %.proto`로 x.a·x.b를 함께 요청하니 레시피가 한 번만 돌았다(`RUN x.a` 한 줄). 점수 구간은 보강(60~79)이지만 오류 확인이 앞선다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 고유 부분: 119~140행 `$*`가 중첩 디렉터리에서 `sub/main`이 되는 함정, 336~356행 VPATH에서 `$<`는 발견 경로이고 `$@`는 원래 타겟이라는 함정, 256~262행 일반·정적 패턴 비교표, 268~292행 검색 순서와 실례. 52~102행 문법과 148~155행 암시적 규칙 표는 매뉴얼 요약이다. 81·367행과 456행 결론이 실행 결과와 맞지 않아 13~19 구간 중간이다. |
| B | 13 | 동기(13~48행) → 문법(52~102행) → 자동 변수(106~140행) → 암시적 규칙(144~226행) → 정적 패턴(230~264행) → 검색 순서(268~292행) → VPATH(296~358행) → grouped target(362~378행) → 실전 예(382~422행) → 흔한 실수(426~487행) → 정리(491~499행). 정확성 오류가 열려 있어 13을 넘지 않는다. 378행 4.3 이전 회피책은 한 줄이고 예시가 없다. |
| C | 8 | 159~174행 Makefile과 출력, 199행 `make -p -f /dev/null`, 311~318행 VPATH 예시가 있다. 170~173행 출력이 160행 코드와 맞지 않고(cc vs gcc), 316~317행은 주석 설명이며, make 버전·OS가 없다. 367행 '두 번 호출'은 실행 결과와 다르다. |
| D | 10 | 같은 시리즈: `chapter03-variables.md` 270~274행 `build/%.o: src/%.c` + `@mkdir -p $(@D)`가 이 글 87~91행과 같고(93행이 Ch 3로 링크), chapter03 285행 변수 표가 178~192행과 겹친다. `chapter05-functions.md` 527~543행과 `chapter07-practical.md` 66~80행(79행 일반 패턴 `$(BUILDDIR)/%.o: $(SRCDIR)/%.c \| $(BUILDDIR)`)이 이 글 384~413행과 같은 뼈대다. `chapter02-rules.md` 59행은 grouped target을 이 글로 넘긴다. 다른 시리즈 `modern-recipes/part3-11-make-cmake-cross.md` 54~71행은 질문이 다르다. |
| E | 7 | 제목·description의 패턴 규칙, 내장 암시적 규칙, 충돌·우선순위를 52~102·144~226·268~292행이 이행한다. VPATH·grouped target까지 넓히지만 과장은 아니다. 대상 독자와 make 버전 전제가 없다. |
| F | 7 | 503행 다음 장 'Ch 5: 함수'는 seriesOrder 5 `chapter05-functions.md`와 맞다. 514~517행 관련 항목(Ch 3·5·2, `cmake/chapter03-targets.md`) 라벨이 대상과 맞고 본문 15·93·108·422행도 Ch 3의 실제 절을 가리킨다. 39~44행 단계 목록과 흔한 실수 번호가 이 글 고유 구조다. 292행 '명시적 규칙(2번째)'은 272행 목록의 1번과 어긋난다. |
| G | 3 | 505~510행에 매뉴얼 Pattern Rules·Static Pattern·Implicit Rules와 4.3 릴리스 노트가 있고 364행에 4.3(2020) 버전이 있다. 출처가 끝 목록에만 있어 102·278·218행 주장과 연결되지 않고 168~174행 출력의 make 버전·OS가 없다. 518행 makefiletutorial.com은 2차 자료다. |

uncertainties:
- 실행 확인은 GNU Make 3.81로만 했다. 4.x에서 다중 타겟 패턴 규칙 레시피가 한 번만 도는지는 매뉴얼 'Pattern Rules'로 다시 확인해야 한다.
- 180행 '정의하지 않으면 빈 값', 218행 '기본 변수(CC=cc 등)', 477행 '변수가 비어 있어'가 CC를 두고 엇갈린다. 문장 범위 문제로 보고 오류 근거에 넣지 않았다.
- 278행 '더 짧은 stem 우선'은 3.82 이후 규칙이라 버전 표기가 필요한지 매뉴얼로 확인하지 않았다.
- 272~276행 검색 순서가 매뉴얼 'Implicit Rule Search'와 맞는지 미확인(정적 패턴은 사실상 명시적 규칙).
- 226행 '빈 레시피 패턴 규칙이 내장 규칙을 취소', 218행 'Linux 커널 Makefile이 --no-builtin-rules·--no-builtin-variables 채택' 미확인.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 1차 자료 대조 커밋 없음: 10편 모두 git log에 fact-check 커밋이 없어 '검증됨'이 0편이다. GDB Extension and IDE는 52d2a6cd 일괄 추가 뒤 린터·메타 커밋(400892d7·ac24bb76·be973200·28524a9d·0a9dd7bc)만 있고, GNU Make도 3232b1be·0a9dd7bc·07cc1988·ac24bb76 같은 일괄 커밋뿐이다. 두 시리즈 모두 `/fact-check-round` 대상이다.
- 본문 1차 출처·버전 표기 없음: 출처가 글 끝 '관련 항목'·'참고 자료' 목록에만 있고 current 경로 매뉴얼이라 버전이 고정되지 않는다(gdb-extension ch01 565행, ch02 504·505행, ch04 362~365행, ch05 553~555행, ch06 485~493행, gnu-make ch02 600~604행, ch03 595~606행, ch04 505~510행). 10편 모두 G가 2~3이다.
- 실행 환경 없는 예시 출력과 실행해 보지 않은 예상 출력: GDB·Make 버전과 OS가 없다(gdb-extension ch01 28·542~546행, ch03 482~486행, ch04 42~45행, ch05 29~34행, gnu-make ch01 121~125행). GNU Make에서는 예상 출력이 실제 실행과 다른 것이 3편에서 확인됐다(ch01 198행, ch03 178·534행, ch04 170~173행).
- GDB Extension and IDE와 GDB and LLDB 시리즈의 예제 중복: gdb-extension ch01 21~41·69~83·108~126·442~448행, ch02 20~29·98~117·289~321·379~419행, ch03 23~213행, ch04 25~37·158~183행이 `gdb-lldb/chapter09-python-scripting.md`와, ch05 182·188·412~417행과 ch06 15~456행 대부분이 `gdb-lldb/chapter10-tui-frontends.md`와 겹친다. 6편 중 5편이 병합 검토로 내려간 주원인이다. ch09 14행·ch10 14행이 이 시리즈를 깊은 버전으로 지목하므로 gdb-lldb 쪽을 요약+링크로 줄이는 역할 정리가 필요하다.
- GDB Extension 시리즈 안 반복: MI 변수 트리 출력(ch03 417~433행 ↔ ch05 132~152행), nvim-dap·dap-mode 설정(ch05 439~480행 ↔ ch06 258~348행). 정본 편을 정해야 한다.
- 공통 마무리 뼈대: gdb-extension은 '정리 / 다음 장 예고 / 관련 항목'(ch02 485~505행, ch03 588~598행, ch04 345·354·358행, ch05 534~555행), gnu-make는 '흔한 실수 / 작은 예시 / 정리 / 다음 장 예고 / 참고 자료 / 관련 항목'(ch01 344·430·463·472·476·482행, ch02 466·541·586·596·600·606행). 9절 같은 H2 뼈대 집계 대상이다.
- 전제 지식 안내 없음: gdb-extension ch01~ch06 모두 전제 글(Ch 1 객체 모델, ch05 MI/DAP 등) 안내가 없고, ch01 560행처럼 다음 장 예고에 링크가 없는 경우가 있다.
- GNU Make 시리즈 안 '흔한 실수' 반복과 실전 예 뼈대 반복: ch01 348~426행 ↔ ch02 486~537행, ch04 384~413행 ↔ ch05 527~543행 ↔ ch07 66~80행. 근거 없는 비율 과장도 반복된다(ch02 525행 '99%'·598행 '9할', ch03 description '9할'·74행 '80%').

## 다음 조치

- 우선 조치(4편, 오류 확인): gdb-extension ch05 191행 Content-Length를 193~194행 body와 맞춘다. gnu-make ch01 127·359행 .RECIPEPREFIX 버전을 3.82로, 198행 오류 메시지를 실제 출력(Makefile:3)으로 고친다. gnu-make ch03 534행 '빈 출력'과 168~178행 `CC ?= gcc` 예를 고친다. gnu-make ch04 170~173행 출력, 456·464~465행 판정, 81·367행 '두 번 호출'을 GNU Make 매뉴얼과 4.x 실행으로 다시 확인해 고친다.
- gnu-make ch03 604행 관련 항목 라벨을 `cmake/chapter02-language.md` 실제 내용에 맞추거나 링크를 바꾼다.
- 병합 검토(5편, gdb-extension ch01·02·03·04·06): 글을 합치지 않고 gdb-lldb ch09·ch10과의 역할을 먼저 정한다. gdb-lldb 쪽을 요약+링크로 줄이고, gdb-extension 쪽은 고유 절을 버전을 밝힌 GDB 매뉴얼과 대조해 차별화 보강하는 방향을 시리즈 단위로 검토한다. URL과 seriesOrder는 바꾸지 않는다.
- 보강(gnu-make ch02): 541~573행 종합 예를 449·462행 권고와 맞추고, 제목의 '분석'을 본문에 맞게 다듬거나 메커니즘 설명을 보강한다.
- GDB Extension and IDE 6편과 GNU Make 시리즈 전체를 `/fact-check-round` 대상으로 올리고, GNU Make 예상 출력은 기준 Make 버전을 정해 실제로 돌려 확인한다. .RECIPEPREFIX 버전 오류는 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
