# 공개 글 AdSense 평가 — 루프 28

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-28.md) · [재검토 기록](double-check-loop-28.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일: 2026-10-19. 기준 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2·anchors·antipatterns(AP-C-23/24)를 적용했다. 대상 전문과 기존 보고서 근거를 직접 읽고 아래와 같이 재판정했다. 원문·기존 보고서·사용자 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

역사 앵커 UART=`part1-04-uart-hardware.md`(49), ISR=`part6-09-isr-api.md`(40), Build=`part7-05-kernel-build.md`(50)는 `10550ca1` 원문 기준이다. 현재 수정된 Recipes 점수를 역사 앵커에 연결하지 않았다. Recipes는 재채점에서 제외하고 명시한 D 구간 비교만 허용했다.

2026-10-19 재개 평가. 기준은 10-18 공통 원문 스냅샷이다. 원문 전문 및 기존 근거를 읽고 재판정했다. 기존의 항목별 설명 중 직접 원문과 대조하여 동의한 문장은 재사용하고, 변경/철회한 것은 아래에 고쳤다. 기계적으로 점수에 동의한 기록이 아니다.

[공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 결과를 인용한다. 본문 정확성·실제 target 실행·모바일 육안 확인과 구분한다. P0는 본문 검토 범위에서 미발견이며 전체 구체 주장의 1차 자료 대조는 완료하지 않았다. 사실 불확실 B≤13, 출처·환경 없는 수치 C≤8, 절차뿐 C≤9, 잘못된 안내 F≤5를 먼저 적용했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `gnu-make/chapter05-functions.md` | 13 | 13 | 8 | 11 | 6 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `gnu-make/chapter06-conditionals.md` | 13 | 13 | 8 | 10 | 7 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `gnu-make/chapter07-practical.md` | 11 | 12 | 7 | 8 | 7 | 7 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter01-overview.md` | 13 | 11 | 6 | 9 | 4 | 6 | 2 | **51** | 검증됨 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter02-hbm-stack.md` | 13 | 11 | 5 | 12 | 6 | 6 | 2 | **55** | 검증됨 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter03-hbm-generations.md` | 15 | 12 | 6 | 10 | 7 | 6 | 3 | **59** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter04-gddr.md` | 12 | 10 | 6 | 10 | 5 | 6 | 2 | **51** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter05-bandwidth-bottleneck.md` | 15 | 12 | 7 | 10 | 6 | 5 | 1 | **56** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter06-thermal-power.md` | 11 | 8 | 7 | 12 | 5 | 7 | 2 | **52** | 검증됨 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter07-memory-controller.md` | 11 | 10 | 5 | 10 | 5 | 5 | 2 | **48** | 검증됨 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |

기존 합계 544 → 새 합계 546; 평균 54.4 → 54.6. Make 함수 B15→13(AP-C-24), Make 3편 미검증→오류 확인(선택 예제 실제 실행+공식 규칙). HBM3세대 비교/대역폭 2편은 기존 검증 이력만으로 남은 구체 주장·코드까지 검증됐다고 할 수 없어 미검증으로 낮췄다. HBM 관련 일반 주제 안내 4편 F5→6; 잘못된 특정 장 라벨 2편은 F5 유지.

| 파일 | 기존 | 새점수 | 차이 | 게이트·점수 재판정 |
| --- | ---: | ---: | ---: | --- |
| chapter05-functions.md | 62 | 60 | -2 | B15→13: 정확성 불확실 상한 적용. 미검증→오류 확인: define greeting 예제 실제 셸 실행 실패. |
| chapter06-conditionals.md | 60 | 60 | 0 | 점수 유지, 미검증→오류 확인: 빈값 ifdef 및 쉼표 공백 예제를 실제 실행·공식 매뉴얼로 확인. |
| chapter07-practical.md | 54 | 54 | 0 | 점수 유지, 미검증→오류 확인: ARCH=arm에서도 CC=gcc인 선택 실행과 :=공식 규칙 확인. |
| chapter01-overview.md | 50 | 51 | 1 | F5→6: 링크 없는 일반 관련 주제와 draft라는 사실만으로 잘못된 특정 target 상한을 적용한 근거 철회. 표준 구조/정확한 다음 편 수준6; 렌더·공개 접근성은 미확인. |
| chapter02-hbm-stack.md | 54 | 55 | 1 | F5→6: 링크 없는 일반 관련 주제와 draft라는 사실만으로 잘못된 특정 target 상한을 적용한 근거 철회. 표준 구조/정확한 다음 편 수준6; 렌더·공개 접근성은 미확인. |
| chapter03-hbm-generations.md | 58 | 59 | 1 | F5→6: 링크 없는 일반 관련 주제와 draft라는 사실만으로 잘못된 특정 target 상한을 적용한 근거 철회. 표준 구조/정확한 다음 편 수준6; 렌더·공개 접근성은 미확인. 기존검증됨→미검증:190행 구체 배율/비교기간은 검증 기록만으로 범위를 채울 수 없음. |
| chapter04-gddr.md | 50 | 51 | 1 | F5→6: 링크 없는 일반 관련 주제와 draft라는 사실만으로 잘못된 특정 target 상한을 적용한 근거 철회. 표준 구조/정확한 다음 편 수준6; 렌더·공개 접근성은 미확인. |
| chapter05-bandwidth-bottleneck.md | 56 | 56 | 0 | 점수 유지, 검증됨→미검증: 기존 수치/field ID 대조가 실행 미완성 STREAM 코드 및 도구 호출까지 포함하지 않음. |
| chapter06-thermal-power.md | 52 | 52 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter07-memory-controller.md | 48 | 48 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |

## 글별 근거

### `gnu-make/chapter05-functions.md`

source_file: `src/content/blog/tools/build/gnu-make/chapter05-functions.md`

url: `https://hawk90.github.io/blog/tools/build/gnu-make/chapter05-functions`

score_status: 잠정 · score: 60 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 271~275·523행 'wildcard의 `**` 재귀 매칭은 4.0+에서 셸 globstar에 위임'은 GNU Make가 내부 glob을 쓴다는 기억과 어긋나 틀렸을 수 있으나 매뉴얼·소스를 열지 않았다(기억 기반). - 212행 '매뉴얼은 … 자연수 직관에 더 가깝다는 설명을 곁들인다' 인용이 매뉴얼에 있는지 미확인. - 410행 define `:=` 도입 버전(4.0+)을 NEWS로 확인하지 않았다. - 357행 '모든 호출이 파싱 시점에 일어난다'와 360~361행 '= 로 쓰면 참조할 때마다 find가 돈다'·304행이 실행 시점을 다르게 말한다. 레시피 참조를 명시하지 않아 동시에 거짓이라 확정하지 않았다. - 258행 'wildcard가 존재를 알아내는 유일한 1차 함수'와 292·629~637행 realpath 존재 검사가 긴장 관계다. '1차' 해석 여지가 있다. - 566행 '@true는 레시피가 비면 안 되어서 넣는 no-op' 설명을 매뉴얼로 확인하지 않았다. - 332행 `$(or $(CC),gcc)`는 CC 기본값 cc 때문에 gcc로 채워지는 경우가 드물다(예제 효과가 약함). - 605행 경로 사고, 637행 realpath 속도는 출처·측정 없는 주장이다.   이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | 33행이 스스로 '내장 함수 카탈로그'라 밝히고 68~507행이 매뉴얼 Functions 장 순서를 따른다. 글 고유의 것은 84행 subst 경계 문제(foo.cmd→foo.omd), 236행 Make basename과 유닉스 basename 차이, 292~297·629~637행 realpath 빈 문자열 존재 검사, 444~455행 call→eval 이중 확장 풀이, 335행 `$(or)`와 `?=` 차이다. 212행 매뉴얼 인용·605행 경로 사고처럼 출처 없는 주장이 섞여 13~19 구간 하단. |
| B | 13 | 13~31행 문제 정의 → 37~64행 문법 → 함수군 → 513~566행 실전 Makefile → 570~637행 흔한 실수 6개 → 641~649행 정리로 흐름이 닫힌다. `$(file)`·`$(value)`·`$(origin)`과 Make 버전별 차이 정리가 없어 16점 이상은 아니다. define greeting의 echo 예제를 그대로 실행하면 인용부호 오류로 실패해 완결성·정확성 불확실 상한13을 적용했다. |
| C | 8 | 예제 대부분에 예상 결과 주석(81, 97, 158~160, 167~168, 183, 205~209, 232~233, 374, 389행)이 있고 515~559행은 info 타깃까지 있는 실행 가능한 Makefile이다. 주석은 기대값일 뿐 실행 출력이 아니고 Make 버전·OS가 없다. 271·274·410·523행 '4.0+'와 637행 '셸 호출보다 빠릅니다'가 출처 없이 적혀 C ≤ 8. 이번 로컬GNU Make3.81의 greeting 선택 실행은 exit2였다. 나머지 출력 주석은 관측으로 승격하지 않았다. |
| D | 11 | 양쪽 전문 읽기: ch07 512~520행↔본문582~596행 wildcard 함정, ch06 376~385행↔459~479행 MAKEFILE_LIST, ch03 434~444행↔481~495행 info/warning/error, ch07 148~151행↔524~530행 find+patsubst+sort dir가 겹친다. ch04 390~393·422행은 함수 상세를 이 글로 넘긴다. CMake ch02 전문의 명령/list/cache는 다른 도구 의미다. 읽지 않은 Recipes/Buildroot 비교는 제외하고도 카탈로그와 call/eval 이중확장 역할이 남아 D11 유지. |
| E | 6 | 제목 키워드 wildcard(252~283행)·patsubst(86~111행)·foreach(369~379행)·shell(341~367행)과 description의 filter·call·eval이 모두 본문에 있다. 제목은 '분석'인데 본문은 카탈로그(33행)이고 foreach는 예제 하나와 두 문장뿐이라 6~8 하단. |
| F | 7 | 653행 다음 장 안내(Ch 6 조건문과 include, -MMD -MP)는 seriesOrder 6 chapter06-conditionals.md와 맞는다. 663~666행 관련 항목 라벨이 대상 제목과 맞는다. 15·304행이 장 간 위치를 짚는다. 477행이 아직 읽지 않은 Ch 6을 'Ch 6에서 본'이라고 과거형으로 가리켜 8점은 주지 않았다. |
| G | 2 | 657~659·667행 GNU Make Manual 링크는 글 끝 목록이다. 271행 `**` 재귀 매칭, 410행 define `:=`, 212행 매뉴얼 인용에 본문 출처가 없고 기준 Make 버전 표기도 없다. |

게이트 재판정: 오류 확인으로 변경. 397~405행 define greeting 및 test recipe를 원문 그대로 추출하여 /usr/bin/make GNU3.81에서 실행했더니 /bin/sh unexpected EOF matching quote, exit2였다. [공식 Recipe Execution](https://www.gnu.org/s/make/manual/html_node/Execution.html)은 기본적으로 recipe 각 줄을 별도 셸로 실행한다고 설명한다. 여러 줄 값의 개행이 보존된다는 설명 자체와 달리 그 사용 예가 완결 실행되지 않는다는 판정이다. 실행 입력/명령/출력: /private/tmp/sol28-33lmfbds/results.json. 4.x/전체 예제 검증은 미완료.

병합 대상·다음 조치: 전체 병합 대상 없음. 독립 질문을 유지하며 출처/실제 관측으로 보강.


### `gnu-make/chapter06-conditionals.md`

source_file: `src/content/blog/tools/build/gnu-make/chapter06-conditionals.md`

url: `https://hawk90.github.io/blog/tools/build/gnu-make/chapter06-conditionals`

score_status: 잠정 · score: 60 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 340행 '-MP 없이는 header.h: No such file or directory. Stop.': 3.81 실행에서는 "No rule to make target `header.h', needed by `main.o'.  Stop."이 나왔다(OBS). - 250행 'sinclude는 POSIX 호환 별명'은 매뉴얼이 다른 make 구현과의 호환을 이유로 든 것으로 기억한다. 미확인. - 421행 'Kbuild, U-Boot이 모두 비재귀적': Kbuild는 `$(MAKE) $(build)=dir`로 재귀 호출한다고 기억한다. 미확인. - 404~406행 재귀 Make 단점 정도와 323행 '1990년대 후반에 끝났습니다'는 출처 없는 단정이다. - 104행 `ifeq ($(CC),gcc)`: CC 기본값이 cc라 두 분기 모두 안 맞을 수 있는데 111행은 '두 컴파일러 모두에서 깔끔하게 빌드'라고만 쓴다. 107행 `-Wno-c++98-compat` 설명도 없다.  병합 대상(부분 정리 후보, 판정은 점수 구간대로 보강): 글 전체로는 병합 대상 없음. 500~562행 실전 예시는 chapter07-practical.md 54~103행과 거의 같은 코드라 이 글 쪽을 줄이고 링크하고, 425~496행 타겟별 변수는 chapter03-variables.md 322행 이후 절로 옮길지 검토한다. 571·340행은 매뉴얼과 실제 실행으로 확인해 고친다.   ifdef/571행 두 사항은 위 게이트대로 확정했다. 340행 오류 문구 차이만으로 별도 기술 오류를 확정하지 않는다. 이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | 42~163·209~250행은 매뉴얼 Conditionals·Include 범위를 따른다. 글 고유 설명은 125~149행 ifdef(정의 여부)와 `ifeq ($(VAR),)`(빈 값) 구분, 325~340행 -MP 빈 규칙이 헤더 삭제 뒤 재빌드로 이어지는 과정, 484~496행 타겟별 변수가 파싱 시점 `$(info)`에 안 보이는 시점 차이다. 205·323·404행은 근거 없는 단정이고 256~340행은 648행 Paul Smith 글 요약 수준이라 13~19 하단. 다만 이 글 고유의 ifdef 설명은 이번 실행에서 잘못된 것으로 확인돼 그대로 신뢰할 설명은 아니다. |
| B | 13 | 13~38 → 42~163 → 167~205 → 209~252 → 256~340 → 344~421 → 425~496 → 500~562 → 566~626 → 630~638행으로 흐름이 이어진다. 571행 ifeq 공백, 340행 오류 메시지, 421행 Kbuild 비재귀 주장이 확인되지 않은 채 열려 있고, chapter01 127행 'GNU Make 4.0 이상' 전제가 이 글에 다시 나오지 않는다. |
| C | 8 | 131·135행 `$(info)` 출력 주석, 280~281행 `gcc -MM` 출력, 461행 펼쳐진 CFLAGS, 502~554행 config.mk·Makefile 전체와 호출 예가 있다. make·gcc 버전과 실제 실행 기록이 없고, 로컬 3.81 실행에서 571·340행이 본문과 다르게 나왔다(OBS). 8~11 구간 하단. |
| D | 10 | 양쪽 전문 읽기: 본문502~548행 골격↔ch07 54~96행, 본문46행 지시자vsif↔ch05 304~317행, 본문381~385행 MAKEFILE_LIST↔ch05 459~471행이 겹친다. CMake ch04 70~105행 옵션/cache는 도구가 달라 명령 자체 중복은 아니다. 조건 지시자/읽기 시점/include 및 자동의존성에 독립 질문이 남아 D10 유지. 열지 않은 Recipes 중복 근거는 제외. |
| E | 7 | 2행 제목 'ifeq·ifdef·include·-include'와 5행 description을 42~163·344~385·296~340행이 이행한다. 제목·description에 없는 타겟별 변수 절(425~496행, 약 70행)이 있고 독자·전제 버전을 밝히지 않았다. |
| F | 7 | 642행 'Ch 7: 실전 Makefile'은 seriesOrder 7 chapter07-practical.md와 맞고 안내 내용이 대상 201·260·423·455행에 있다. 653~656행 라벨(Ch 5 `$(if)`·MAKEFILE_LIST, Ch 7, Ch 3 우선순위 규칙, CMake Ch 4 옵션과 캐시 변수)이 대상과 맞는다. 46행 '(Ch 5)'에 링크가 없고 전제 지식 안내가 없다. |
| G | 2 | 644~649행 참고 자료(Conditionals·Include, Paul D. Smith, Peter Miller 1997)는 끝 목록이고, 408행 Miller 언급에 링크·버전이 없다. GNU Make·GCC 버전 표기가 없다. |

게이트 재판정: 오류 확인으로 변경. 원문 VAR := #빈값/ifdef 예제를 그대로 추출해 실행하면 VAR is empty만 나오며 “VAR is defined도 출력” 주석과 다르다. DEBUG=1을 주고 ifeq ($(DEBUG), 1)을 실행하면 SPACE-MATCH로 참이어서571~574행 거짓/쉼표뒤공백흡수 설명과도 다르다. [공식 Conditional Syntax](https://www.gnu.org/software/make/manual/html_node/Conditional-Syntax.html)의 빈 foo=는 ifdef false라는 예 및 인자외 공백 허용 규칙을2026-10-19 공식 검색 본문에서 직접 대조했다(페이지 open은 timeout, 검색 반환된 공식 본문을 확인). /private/tmp/sol28-33lmfbds/results.json. GNU3.81의 선택재현이며 전체4.x 검증은 아니다.

병합 대상·다음 조치: 전체 병합 대상 없음. 독립 질문을 유지하며 출처/실제 관측으로 보강.


### `gnu-make/chapter07-practical.md`

source_file: `src/content/blog/tools/build/gnu-make/chapter07-practical.md`

url: `https://hawk90.github.io/blog/tools/build/gnu-make/chapter07-practical`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 197행 ASan 수치를 clang AddressSanitizer 문서와 대조하지 않았다. - 599행 'GNU Make는 1976년 Stuart Feldman이 만든 도구'는 원조 make와 GNU Make를 섞은 표현일 수 있다(기억 기반). - 418행 Makefile 안 `MAKEFLAGS += -j$(NPROCS)`의 효과가 버전에 따라 다를 수 있다. 미확인. - 226행 `ar Trcs` 표기와 빌드 시간 효과를 binutils 문서로 확인하지 않았다. - 453행 '모든 패키지 매니저가 이 관용을 따른다'는 과일반화 가능성. - 518행 wildcard가 비면 '할 일 없음'이라 했지만 45~97행 골격에서는 76~78행 링크 레시피가 입력 없이 돌 수 있다. 실행 확인 안 함. - 102·103행 앵커가 렌더된 id와 맞는지 `audit:anchors`로 확인하지 않았다. :=순서 문제는 이번 선택 재현+공식 문서로 위 게이트에서 확정했다. 이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 45~97행 C 골격, 125~189행 sanitizer 분기, 220~224행 `ar rcs` 표, 266~297행 CROSS_COMPILE, 425~506행 install·help·V=1은 매뉴얼·Coding Standards·커널 관용을 모은 목록이다. 이 글만의 해석은 421행 MAKEFLAGS `-j` 경고, 448~451행 PREFIX·DESTDIR 구분, 226행 thin archive 한 문장, 388행 테스트 러너 적용 범위 정도다. 254·421행은 일반론으로 끝난다. |
| B | 12 | 15~22행이 약속한 여섯 항목을 26~506행이 다루고 510~595행까지 흐름은 완성됐다. SONAME 체인은 256행에서 넘기고, 267~285행 크로스 컴파일 블록이 그대로는 크로스 컴파일되지 않는다는 의심이 열려 있어 AP-C-24상 B ≤ 13. |
| C | 7 | 108~114·299~304·383~386·441~446·501~504행 명령은 있지만 make·gcc 버전, OS, 실행 출력이 없다. 197행 'ASan 2~3배 느림, 메모리 3배'는 출처 없는 수치라 C ≤ 8. 300행 주석 'make ARCH=arm # armhf'는 267~277행 구조상 재현 시 CC=gcc가 나온다. 347~364행 테스트 러너에 예상 출력이 없다. |
| D | 8 | 양쪽 전문 읽기: 본문45~104행↔ch06 500~562행은 골격/요약 반복, 본문569~580행↔ch02 502~515행은 $$실수 반복. 본문522~539행↔ch02 470~484행은 해결이 비슷하나 질문이 다르다. CMake ch07 93~110행 DESTDIR은 자동설치 도구 맥락이고, 이 글의 라이브러리/테스트/install/help가 독립 역할로 남아 D8 유지. 미개봉 Buildroot17/bootloader3 비교는 제외. |
| E | 7 | 제목·description의 범위는 26·118·201·260·320행 절과 맞는다. description '그대로 쓰는'과 15행 '그대로 옮겨 쓸 수 있는'은 267~285행 결함 의심과 205~252행 설치·SONAME 부재로 약속보다 좁다. |
| F | 7 | 시리즈 마지막 편(chapter08 없음)이라 603행이 cmake/chapter01-intro.md(draft: false)로 안내한다. 615~618행 관련 항목(Ch 6, Ch 5, CMake Ch 7, Buildroot Ch 11) 대상 제목이 라벨과 맞는다. 15행 전제 안내, 102·103행이 ch02 142행·ch06 256행 heading으로 연결된다. 렌더 확인이 없어 9 이상은 아니다. |
| G | 2 | 607~611행 GNU Make Manual·GNU Coding Standards는 끝 목록이다. 본문 주장 옆 출처와 Make·GCC·clang-tidy 버전·OS가 없다. 197·453·599행 주장에 출처가 없다. |

게이트 재판정: 오류 확인으로 변경. 267행부터 CROSS_COMPILE 조건 분기까지 원문 그대로 추출하고 recipe만 CC/PREFIX 관찰용 echo로 두었다. make ARCH=arm 결과 CC=gcc PREFIX=arm-linux-gnueabihf-라 300행32-bitARM 컴파일 명령 약속과 다르다. [공식 Simple Assignment](https://www.gnu.org/software/make/manual/html_node/Simple-Assignment.html)는 := 우변을 정의 시점에 한 번 확장하며 이후 변경은 반영하지 않는다고 명시한다(2026-10-19 공식 검색 반환 본문 확인, open timeout). 입력/출력 /private/tmp/sol28-33lmfbds/results.json. 이 근거는 언어/API 기억이 아니라 실제 실행과 primary 규칙이며 모든 타겟 크로스빌드를 실행한 것은 아니다.

병합 대상·다음 조치: 부분 병합 대상은 `src/content/blog/tools/build/gnu-make/chapter06-conditionals.md` 500~562행(이 글 45~104행과 거의 같음)과 `chapter02-rules.md` 502~515행(`$$`, 이 글 569~580행과 같음). 글 전체 병합 대상은 없다. 다음 조치는 보강이다. 라이브러리·크로스 컴파일·테스트·install 절은 시리즈에서 이 글에만 있고 '실전 Makefile' 검색 의도가 독립적이다(루브릭 5절 '중복 후보가 강하지만 독립 검색 의도 → 차별화 보강'). 기본 골격은 ch06 예와 한쪽으로 정리하고, `:=` 순서 문제를 매뉴얼로 확인해 고치고, 197행 수치는 출처를 달거나 지운다.


### `hbm/chapter01-overview.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter01-overview.md`

url: `https://hawk90.github.io/blog/embedded/hardware/hbm/chapter01-overview`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 79행 Rebellions REBEL-Quad HBM3E, Google TPU v5p HBM 분류는 Ch 1 fact-check 출처 목록에 없어 확인하지 않았다. - 21행 'JEDEC 표준 안에서 네 갈래'와 64행 GDDR6X 'Micron'(독자 규격) 표기가 함께 있다. 계열 단위로는 모순이 아니라 오류 확인으로 두지 않았다. - 90행 2015 Fury X, 96행 2024년 9월 SK hynix 12-Hi 36 GB HBM3E 양산 날짜는 보도자료를 열어 확인하지 않았다. - 렌더링·`audit:reading` 미실행.  판정 메모: 점수 구간은 병합 검토(40~59)지만 시리즈 허브 첫 글이라 보강으로 둔다. 표·계산은 Ch 3·4·5로 링크하고 줄이며, 제목의 Capacity·Cost를 본문과 맞추고, 149~151행 항목을 지우거나 공개 글로 링크한다.   이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | 47행 RTX 4090 '21 Gbps × 384-bit ÷ 8 = 1,008 GB/s'·chip당 84 GB/s와 49행 H100 SXM5 정격 4.1 TB/s 대비 3.35 TB/s를 같은 틀로 풀고, 121행이 819 대 84 GB/s를 시스템 단위로 다시 맞춘다. 129행은 Xeon Max·A64FX로 'DDR5 후속' 오해를 반박한다. 23~28·57~65·77~80·88~96행은 사양·발표 나열이고 71행은 cost 분석을 '벤더가 공개하지 않습니다'로 비웠다. |
| B | 11 | 17 → 34~39 → 47~49 → 57~67 → 71 → 77~82 → 88~96 → 102~115 → 119~129 → 133~138행으로 흐름은 끝까지 간다. 제목의 capacity는 17행 한 문장, cost는 71행 한 문장이고 37행 DDR per-pin 칸은 TBD다. |
| C | 6 | 실행 절차·관찰이 없는 개념·사양 글이다. 47·49·67·121·135행 산술은 서로 맞지만 사양 수치의 본문 출처 링크가 없어 C ≤ 8. 역사 UART 앵커의 사양설명/관측부족 대역과 비교했다. |
| D | 9 | 양쪽 전문 읽기: 본문57~65행 세대표↔ch03 24~27/ch04 23~25행, 본문49행 H100↔ch03 117행, 본문47~49·121행 계산↔ch05 22~43행이 반복된다. 본문41행 PAM요약↔ch04 15행. 입문 시장분할/DDR대체오해 역할이 남아 D9 유지; 미개봉Recipes 비교/전사이트 중복 부재는 제외. |
| E | 4 | 제목·description의 'Bandwidth·Capacity·Cost'와 '시장 분할' 중 bandwidth(34~67행)와 시장 분할(77~82행)만 답한다. capacity는 17행 한 문장, cost는 71행 '공개하지 않습니다' 한 문장이라 키워드 절반 이상 누락(3~5). |
| F | 6 | 다음편 ch02의 metadata/title/slug/order2/draft:false와 후행 설명을 확인했다. 일반 관련 BoW1·UCIe1·CXL1 주제는 실제 개요/칩렛/메모리 인터커넥트 범위다. BoW/UCIe draft와 링크 부재는 탐색 약점이나 잘못된 특정 장명은 아니다. 정상 다음편/로드맵 구조 수준 F6; 장별 링크 없는 로드맵을7이상 근거로 쓰지 않았다. |
| G | 2 | 57~65행 표가 JESD235B(2018)·JESD235C(2020)·JESD238(2022)·JESD250(2017)·JESD239(2024)와 벤더 이름을 행마다 붙였지만 본문 링크가 없고, 17·49·79·88~96행에 출처 표기가 없다. |

게이트 재판정: 검증됨. 9ad745f7 'fact-check round 1: HBM·GDDR series (12 posts) against primary sources (#58)' 안의 'fix(content): fact-check HBM Ch 1 against primary sources'. SK hynix HBM3 양산 시기, H100 PCIe/NVL 메모리 종류, H100 SXM 3.35 TB/s, Micron HBM3E 9.2 Gbps, A64FX·Xeon Max 모드 등을 고쳤고 출처로 NVIDIA Hopper whitepaper·H100 페이지, RTX 4090 사양, L4·L40·Gaudi 3 사양, JEDEC JESD250(2017)·JESD239(2024-03-05), Micron GDDR6X, 벤더 보도자료, Intel Xeon Max 개요, Fujitsu A64FX 사양을 적었다. 이번에는 위 커밋의 검증 기록과 현재 원문의 적용 범위를 재검토해 그 범위에서 유지한 상태이며 독립적인 전체 primary 재검증을 수행했다는 뜻은 아니다.

병합 대상·다음 조치: 전체 병합 대상 없음. 독립 질문을 유지하며 출처/실제 관측으로 보강.


### `hbm/chapter02-hbm-stack.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter02-hbm-stack.md`

url: `https://hawk90.github.io/blog/embedded/hardware/hbm/chapter02-hbm-stack`

score_status: 잠정 · score: 55 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 27행 'JEDEC 기준 nominal 높이는 HBM3E까지 720 μm': HBM3E는 별도 JEDEC 규격이 아니라는 점에서 표현이 원문과 맞는지 미확인. 775 μm 출처도 커밋상 2차 매체다. - 49행 '16-Hi HBM4도 기존 bonding 기술로'의 업체별 접합 방식은 1차 자료로 확인하지 않았다. - 25행 HBM4 4·8·12·16-Hi와 'HBM3 16-Hi 확장 조항'을 JESD238/JESD270-4 원문으로 확인하지 않았다. 113행은 HBM3를 4·8·12-Hi로만 적어 25행보다 좁지만 모순은 아니다. - 63행 HBM4 pseudo channel 폭은 비어 있다. - 80~89행 제조 흐름 번호 목록이 ```text 블록에 있다(§5 후보, 점수 외). 이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | 27행 stack 높이가 cold plate 공유 때문에 제약이라는 설명과 720/775 μm, 49·105행 HBM4 높이 완화 → microbump 유지 인과, 69~78행 95% 가정을 밝힌 0.95^N 표와 KGD·redundancy 보정, 97행 12→16-Hi 용량 33% 대 yield 51.3→41.8% 트레이드오프가 고유하다. 41행 TSV는 '벤더가 공개하지 않습니다', 51행 microbump는 '확인하지 못했습니다'로 끝나고 33행은 업체 발표 요약이다. |
| B | 11 | 19~27 → 29~33 → 35~41 → 43~51 → 53~65 → 67~91 → 93~109 → 111~119행으로 흐름은 완결이다. base die 역할은 31행 한 문장, TSV 개수(41행)와 bump pitch(51행)가 비었고 80~89행 제조 흐름은 설명 없는 목록이다. |
| C | 5 | 실행·측정 대상이 없는 구조 글이다. 69~76행 가정 명시 산술뿐이고 27·33·59~63행 수치에 본문 출처가 없어 C ≤ 8. 4~7 구간 하단. |
| D | 12 | 양쪽 전문 읽기: ch01 39·105행이 stack을 이 글에 위임하고, 본문59~65행↔ch03 64·71·110~111·150행 channel설명이 겹친다. 본문19~27행↔ch06 24~28행은 단면이 같지만 높이vs열 경로 질문이 다르다. 본문57·117행↔ch07 27·34·187행 일부반복. UCIe6/7 Outline과 BoW6 packaging bump/yield 절도 직접열었으며, stack의 KGD/거듭제곱수율 설명이 남아 D12 유지. 전체사이트 중복 부재는 주장하지 않는다. |
| E | 6 | 제목 'TSV·Microbump·Base Die의 역할'과 29·35·43행 H2가 맞지만 세 키워드 모두 역할 설명이 짧다(31·41·51행). 부분 미이행으로 6~8 하단. |
| F | 6 | 다음편 ch03의 metadata/order3/draft:false 및 BW/capacity/HBM4 설명이 실제 본문과 맞는다. 관련 UCIe6/7은 각각2.5D/3D Outline, BoW6 packaging의 bump/yield 절로 라벨 역할이 맞는다. draft/비링크만으로F≤5 근거는 철회하고 표준 구조 F6. |
| G | 2 | 본문에 링크된 1차 출처가 없다. 27행 'JEDEC 기준', 33행 '2024년 4월 MOU', 47행 'SK hynix … MR-MUF'에 문서 번호(JESD238/JESD270-4)·URL이 없다. |

게이트 재판정: 검증됨. 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 2 against primary sources' — HBM3 channel 표(128-bit×16 → 64-bit×16, PC 32-bit, JEDEC HBM3 release), base die 공정(SK hynix/TSMC MOU 2024-04), HBM4 microbump 유지(775 μm), 12-Hi 높이(SK hynix 12-layer HBM3E release 2024-09)를 고치고 근거 없는 TSV 개수·bump pitch 표를 지웠다. 내부 일관성도 확인했다: 0.95^5/9/13/17 = 77.4/63.0/51.3/41.8%(71~76행), 97행 33%·51.3→41.8%, 63행 64-bit×32 = 2048-bit, 57행 그림 alt와 62행 표, 27행과 114행 모두 맞다. 이번에는 위 커밋의 검증 기록과 현재 원문의 적용 범위를 재검토해 그 범위에서 유지한 상태이며 독립적인 전체 primary 재검증을 수행했다는 뜻은 아니다.

병합 대상·다음 조치: 병합 대상 없음. chapter01 105행 로드맵이 물리 적층을 이 글에 배정했고 ch03(세대)·ch06(열)·ch07(컨트롤러)과 질문이 다르다. 다음 조치는 보강이다. JESD238·JESD270-4 번호와 SK hynix 발표 링크를 본문에 넣고, 31·41·51행을 1차 자료로 채우거나 제목 범위를 좁히고, 59~65행 channel 표는 ch03·ch07 링크로 대체를 검토하고, 130~132행 draft 대상 항목을 지운다.


### `hbm/chapter03-hbm-generations.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter03-hbm-generations.md`

url: `https://hawk90.github.io/blog/embedded/hardware/hbm/chapter03-hbm-generations`

score_status: 잠정 · score: 59 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 190행 '8년 만에 6.25배'의 기준이 없어 15행 '6년 만에 4배', 212행 '9년 만에 약 10배'와 맞출 수 없다. - 190행 'GPU compute 25배(FP16)'는 출처가 없고 chapter05 15행(V100→H100 연산 약 8배)과 어긋난다. 다른 글과의 불일치라 오류 확인 근거가 아니다. - 183행 A100 stack당 311 GB/s는 HBM2 상한 307 GB/s를 넘는다. 30행대로 벤더가 정격 위로 돌릴 수 있어 내부 모순으로 확정하지 않았다. - 156·208행 'HBM4가 HBM3 controller와 하위 호환'의 JEDEC 표현은 원문으로 확인하지 않았다. - 65~66행 JESD235B 12-Hi·24 GB, 113행 HBM3 '4~64 GB'·'16-Hi 확장 조항'은 JEDEC 원문으로 확인하지 않았다. - 96행 'A100 80GB (2 TB/s 이상)'의 정확한 값은 확인하지 않았다. 이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | 30행이 JEDEC 정격(JESD235B 2.4, JESD235C 3.2 Gbps)과 SK hynix 제품 속도(3.6 Gbps)를 구분하고, 123·200행이 HBM3 6.4 Gbps가 DDR 포함 속도이며 WDQS/RDQS 3.2 GHz·CK 1.6 GHz로 분리됐다고 짚는다. 196행 GH100 패키지 분리, 178~188행 카드 총 BW를 stack 수로 나눈 해석, 141·208행 HBM4 폭 확장 선택이 이 글의 관점이다. 세대별 값 나열과 TBD 칸(23·24·25·27·46·47·67·135·164·165·167행), 190행 '25배' 일반론 때문에 15. |
| B | 12 | 34~219행 흐름은 완성됐다. RAS 표(162~168행) 5행 중 3행이 TBD, HBM3E JEDEC 번호(27행)와 Samsung 행(135행)이 비었다. 190행 '6.25배'·'25배'가 불확실로 열려 있어 B ≤ 13(AP-C-24). |
| C | 6 | 재현 절차·측정은 없고 52·92·137·153·182~184행 사양 유도 산술뿐이다. 190·204행 출처 없는 수치·일반론으로 C ≤ 8. 183행 A100 stack당 311 GB/s가 24·63행 HBM2 최대 307 GB/s를 넘는데 188행 설명이 이 경우를 다루지 않는다. |
| D | 10 | 양쪽 전문 읽기: 본문21~30·91·133~134행↔ch01 57~65·88~96행 세대/연혁, 본문64·71·110~111·150행↔ch02 59~65행 channel, 본문109·134행↔ch05 23~29행이 겹친다. HBM4 폭/RAS/카드당stack환산이 남아 D10 유지. 전체사이트중복검색 결과는이번판정근거에서제외. |
| E | 7 | 제목의 네 세대 모두 절이 있다(54·83·100·125행). 'JEDEC 표준 진화'는 27행 TBD로 한 칸 비었고 description의 'signaling'은 114·123행 정도라 부분 미이행. |
| F | 6 | 다음편 ch04의 metadata/order4/draft:false 및 PAM/PCB/signaling 범위와 관련 UCIe5 버전 비교 Outline을 확인했다. 32Gbps라는 다음편의 약속은 대상이48Gbps 중심인 점과 어긋나 보강할 표현이나 다른 장으로 잘못보낸 것은 아니다. 일반 버전진화 주제의 draft/비링크만으로 상한5는 적용하지 않고 F6. |
| G | 3 | 30행 JESD270-4(2025년 4월), 56행 JESD235A 2016·JESD235B 2018, 85행 JESD235C 2020, 104행 JESD238 2022년 1월, 133·134행 양산 발표 월이 주장에 붙어 있고 30·188행이 TBD 이유를 밝힌다. 링크는 없어 2~3 상단. |

게이트 재판정: 미검증으로 변경. 9ad745f7 HBM Ch3 절의 NVIDIA/JEDEC/벤더 사양 대조 이력은 유지하며 독립검증이라고 부르지 않는다. 그러나 현재190행 “8년6.25배/compute25배(FP16)”는 비교 장치·정밀도/sparsity·기간이 정해지지 않아 그 기존 검증 범위만으로 현재 구체 비교까지 대조됐다고 인정하지 못했다. 서로 다른 시나리오라 기술 오류로 확정하지도 않는다. 카드별 stack산술은 재계산했으나 이것이 나머지구체주장의 primary대조를 대신하지 않는다.

병합 대상·다음 조치: 병합 대상 없음. 'HBM 세대별 사양 비교'는 시리즈 안에서 이 글만 답하고 다른 시리즈에 같은 주제 공개 글이 없다. 다음 조치는 보강이다. ch01 57~65·88~96행, ch02 59~64행 세대 표를 이 글로 링크하게 줄이고, HBM3E JEDEC 번호·RAS TBD 칸을 1차 자료로 채우거나 행을 지우고, 190행은 ch05 15행 수치로 바꾸거나 지우고, 231행 항목을 지운다.


### `hbm/chapter04-gddr.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter04-gddr.md`

url: `https://hawk90.github.io/blog/embedded/hardware/hbm/chapter04-gddr`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 111행 '(GDDR6의 2배)'와 23·40행 '최대 16 Gbps / 64 GB/s' 중 어느 쪽을 고칠지는 JEDEC GDDR7 발표문으로 정해야 한다. 발표문이 비교 기준으로 든 GDDR6 값이 16 Gbps 칩이 아닐 수 있다. - 23·39행 'GDDR6 최대 16 Gbps'가 이후 개정판·벤더 제품과 맞는지 확인하지 않았다. - 41행 1.35 V는 출처가 없고, fact-check 커밋이 'VDD values'를 지웠다고 적었는데 이 칸이 남아 있다. - 113행 density 16~32 Gbit, 112행 channel 4개는 JEDEC 발표문으로 대조하지 않았다. - 146행 'HBM3는 stack당 16 channel(채널당 64-bit)'은 1차 자료를 열지 않았다. 이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 85행 −9.5 dB, 91·97행 PAM3 −6.0 dB, 91행 레벨 간격 '50% 넓다', 126행 'PAM4는 UI 폭에서 여유를 얻고 레벨 간격에서 잃는다'(95 ps vs 48 ps), 164~174행 오해 바로잡기(10.5 Gbaud, L4·L40 GDDR6, Strix Halo LPDDR5X)다. 62~83·138~143·109~116행은 발표문·입문 수준이고 GDDR7 48 Gbps 경로는 91행 'log₂3 ≈ 1.58 bit'에서 멈춘다. |
| B | 10 | 15 → 21~27 → 29~58 → 60~118 → 120~126 → 128~146 → 148~156 → 158~174 → 176~182행으로 흐름은 간다. 42·152·153행 TBD로 신뢰성 절은 GDDR7 한 행이고 PCB 절은 한 문장과 UI 계산뿐이다. 111행 불일치로 AP-C-24 B ≤ 13. |
| C | 6 | 27행 식, 53~54행 1,008 GB/s, 85·96~98행 dB, 126행 UI 계산 같은 출처 유도 산술뿐이라 C ≤ 9이고 측정·관찰이 없다. 41행 1.35 V는 출처가 없고 150~154행 3행 중 2행이 TBD다. |
| D | 10 | 양쪽 전문 읽기: 본문21~25/46~56/178~179행↔ch01 63~65/47/134행 세대표/RTX4090계산, ch05 35행도84GB/s를반복한다. PAM3 87~104행/UI126행/channel130~146행이 남아 D10 유지. 미개봉PCIe 비교는제외. |
| E | 5 | 2·5행이 'PAM 신호로 32 Gbps 도달한 경로'를 약속하지만 본문에 32 Gbps가 없고 15·25·179행은 48 Gbps다. description의 'clock 진화' 절이 없고 48 Gbps 경로 분석도 없다. |
| F | 6 | 다음편 ch05 metadata/order5/draft:false와 roofline/대역폭 후행 설명이 본문과 맞는다. 관련 UCIe3 physical Outline/BoW2 Slice·clock·signaling 절은 주제 역할이 맞는다. 링크 부재/draft를 잘못된 장명과 같게 취급한 상한은 철회하고 일반 구조 F6. |
| G | 2 | 23·25행 JESD250 (2017)·JESD239 (2024), 106행 'JEDEC JESD239(2024년 3월 5일)', 15·68·89행 JEDEC·Micron 이름이 있지만 링크가 없고, 118·170·174행 제품 주장에 본문 출처가 없다. |

게이트 재판정: 오류 확인. 원문 내부 산술 불일치(루브릭 3-1). 23행 표와 39~40행 chip 사양 표는 GDDR6를 '최대 16 Gbps', chip BW '최대 64 GB/s'(27행 식 per-pin × 32 ÷ 8)로 적었고, 111행은 GDDR7 chip BW '최대 192 GB/s (GDDR6의 2배)'라고 적었다. 글이 밝힌 값으로는 192 ÷ 64 = 3배라 두 진술이 동시에 참일 수 없다. git 이력에는 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 4 (GDDR) against primary sources'(JEDEC JESD250·JESD239 발표, Micron GDDR6X, RTX 5090·RTX 4090·AD102, HPE L4/L40, AMD Strix Halo)가 있어 이 불일치가 없었다면 검증됨이지만, 대조 뒤에도 111행이 남아 있다.

병합 대상·다음 조치: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준 후보는 `src/content/blog/embedded/hardware/hbm/chapter01-overview.md`(세대 표 63~65행, RTX 4090 계산 47행)지만 PAM3·UI 트레이드오프·channel 비교는 이 글에만 있어 독립 검색 의도가 있다. 111행을 JEDEC GDDR7 발표문으로 고친 뒤 다음 조치는 보강이다(세대 표·RTX 4090 계산을 한쪽으로 모음, 32 Gbps·clock 약속 정리, 193~194행 삭제, PAM3 48 Gbps 경로 보강).


### `hbm/chapter05-bandwidth-bottleneck.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck.md`

url: `https://hawk90.github.io/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 163행 `rocprof --hsa-trace --hip-trace`의 현재 ROCm(rocprofv3 전환) 기준 유효성을 확인하지 않았다. - 39행 '5 × 819 = 4,096 GB/s'는 27행 819가 819.2의 반올림이라 생긴 표기 차이다. 값은 맞다. - 131행 H100 L2 50 MB는 커밋상 whitepaper로 대조됐으나 직접 열지 않았다. - 190행 'MLPerf Inference가 그런 기준'은 출처 없는 평가 문장이다. - 80~95행 STREAM 코드의 컴파일 여부는 확인하지 않았다(AP-C-35 후보). 이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | 38~43행 정격(5×819.2)과 실제 3.35 TB/s를 나란히 두고 '효율 손실이 아니라 정격보다 낮은 속도의 peak'라고 구분, 105행 dense 990 TFLOPS로 knee 295 FLOP/B, 109~113행 연산별 intensity, 121~125행 V100→H100 knee 139→295, 146~151행 Llama 2 70B batch 1 decode 42 ms 하한이 고유하다. 49~52행 손실 요인은 교과서 목록이고 54·97·186행 완곡 표현은 일반론이다. |
| B | 12 | 19~43 → 45~70 → 72~97 → 99~115 → 117~133 → 135~151 → 153~176 → 178~198 → 200~207행으로 흐름은 완성됐다. 제목의 'Achievable'은 54·203행 '측정으로 확인'으로 끝나 값·비율이 없고 STREAM 코드(76~95행)는 조각이다. 163행 rocprof 플래그 등 불확실이 열려 있어 B ≤ 13. |
| C | 7 | 89~92행 Triad 커널, 94행 BW 식, 159·163·166·175행 명령이 있지만 환경·출력·측정 결과가 없다. 80~86행 cudaMalloc이 함수 밖에 있고 94행 launch·타이밍이 주석뿐이라 실행할 수 없다(AP-C-35). 수치는 출처 유도 산술이라 C ≤ 9. |
| D | 10 | 양쪽 전문 읽기: 본문56~70행↔ch07 55~96행 row/bank/스케줄링이 반복된다. 본문49행 refresh↔ch06 33행은 손실요인vs냉각질문이다. 본문22~43행↔ch01 47~49·121행/ch03 카드표는사양환산반복. H100 knee/OI/메모리wall연결이 별도로남아 D10 유지. 읽지않은 ch08/타시리즈 전체비교는제외. |
| E | 6 | Theoretical(19~43행)·Roofline(99~115행)·Memory Wall(117~133행)은 이행하나 Achievable은 값이 없다. 제목이 일반 범위인데 본문은 HBM·NVIDIA GPU 범위라 E ≤ 8. description 5행과 허브 chapter01 108행의 'sustained BW' 약속도 본문에 없다. |
| F | 5 | 17행 이전 편 ch04 링크, 211행 다음 편이 seriesOrder 6 chapter06-thermal-power.md와 맞고 안내 내용이 ch06 23·31·37·52행 H2와 맞는다. 215~217행 라벨도 맞다. 218행 'CXL Ch 8: ML 가속기 — memory wall 보완 경로'는 링크가 없고 실제 cxl/chapter08-cxl-mem.md 제목은 'CXL.mem — M2S·S2M·HDM Decoder'라 F ≤ 5. CXLch08 전문을 열어 hostload/store·HDM·interleave·Linuxregion 내용이며 ML가속기라는 장명/주제가 아님을 확인했다. 뒤의memorywall보완관계만으로 앞의잘못된특정장명은해소되지않아F5유지. |
| G | 1 | 본문 출처 링크가 없다. 105행 1,979 TFLOPS, 123행 V100 125 TFLOPS·900 GB/s, 131행 L2 50 MB, 172~174행 DCGM field ID에 출처 표기가 없고 Nsight Compute·ROCm·DCGM·CUDA 버전도 없다. |

게이트 재판정: 미검증으로 변경. 9ad745f7 Ch5 절의 H100/Volta/Hopper 사양·OI/42ms/knee 및 DCGM field ID 대조 이력은 인정하되 이번의 독립 primary 전면검증으로 부르지 않는다. 현재80~95행 CUDA STREAM은 함수밖 할당/호출·타이밍이 주석이라 실행완결성과 실제BW환산 관측이 없고 rocprof 호출 버전도 남아 있다. 발췌코드일 가능성을 배제하지 않아 오류 확정은 하지 않지만 기존의 일부 수치검증으로 현재 코드/도구 사용까지 검증됨으로 유지할 수 없어 미검증. 나머지산술 재계산은 그 제한 내에서만 인정.

병합 대상·다음 조치: 병합 대상 없음. 가장 가까운 후보는 performance-engineering/part2-08-memory-bandwidth.md와 hbm/chapter08-npu-gpu-usage.md 175~177행이지만, part2-08은 CPU·LPDDR 대상이고 이 글은 HBM·H100 knee·memory wall 계산이라는 독립 검색 의도가 있으며 ch06 17행·ch09 138행·ch12 44·146행이 이 글을 roofline 참조점으로 링크한다. 다음 조치는 보강이다(achievable 값의 1차 출처를 넣거나 54·203행을 TBD로, whitepaper·H100 페이지·dcgm_fields.h 링크와 도구 버전, 218행 수정·삭제, STREAM 코드를 실행 가능하게 고치거나 발췌라고 표시, ch08과 겹치는 42 ms 계산 정리).


### `hbm/chapter06-thermal-power.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter06-thermal-power.md`

url: `https://hawk90.github.io/blog/embedded/hardware/hbm/chapter06-thermal-power`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 58행 `clocks_event_reasons.active`는 최신 이름이고 옛 드라이버는 `clocks_throttle_reasons.active`를 쓴다고 알고 있다. 바뀐 버전은 문서로 확인하지 않았다(기억 기반). - 58행 `temperature.memory`가 일부 SKU에서 N/A인지 확인하지 않았다. - 62행 출력 92·0x…20이 실측인지 알 수 없고, '# SW Thermal Slowdown' 주석은 nvidia-smi 출력이 아니다. - 70행은 0x20을 'GPU 온도 또는 메모리 온도'로, 83행은 '메모리 온도 때문이면 0x20'이라고 써서 0x20만으로 HBM 원인을 단정하는 것처럼 읽힐 수 있다. 동시에 참일 수 있어 표현 문제다. - 21행 HBM4 VDDQ '0.7~0.9 V'와 chapter03 154행 이산값 표기가 다르다. JESD270-4로 확인하지 않았다. - 46·47행 수치는 커밋 출처 목록에 있지만 이번에 NVIDIA 페이지를 직접 열지 않았다. 이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 고유한 것은 47·50·77~79행 'DGX B200은 공랭, GB200 NVL72는 liquid라 냉각 방식은 rack 밀도로 갈린다'와 65~73·81~83행 `clocks_event_reasons.active`에서 0x04와 0x20을 구분해 읽는 법이다. 29행 열 구조는 정성 한 문단, 33~35행 refresh는 교과서 설명 뒤 TBD, 87행 'cooling 설계도 달라집니다'는 완곡 표현이다. |
| B | 8 | 흐름은 있으나 35행 refresh 비용 TBD, 43~48행 cooling 표의 45·46·48행 TBD, 21행 전압 값 외 전력 관리(power state·DVFS)가 없다. throttling 절(52~73행)만 완결된다. 5~9 구간. |
| C | 7 | 58행 `nvidia-smi --query-gpu=temperature.memory,clocks_event_reasons.active --format=csv`와 67~71행 비트 표가 있다. 62행 출력 예에 GPU 모델·드라이버·부하 조건이 없어 C ≤ 8이고 실측 결과가 없다. |
| D | 12 | 양쪽 전문 읽기: 본문21·91행 전압↔ch03 26·30·114·154행, 본문33행 refresh↔ch05 49행, 본문25~29행 열경로↔ch02 27행 coldplate높이, 본문refresh↔ch07 123~129행 perbank스케줄은 각도가다르다. 냉각방식/SWthrottle판독을별도질문으로유지해 D12 유지. 미개봉ch08/타시리즈 비교는제외. |
| E | 5 | 제목 '열 설계와 전력 관리 — Stack 열 부하·Refresh Cost·냉각 솔루션' 중 '전력 관리'는 21행 전압뿐, 'Refresh Cost'는 35행 TBD, 'Stack 열 부하'는 29행 한 문단이다. 키워드 절반 이상 사실상 미이행. description(5행)은 본문과 맞다. |
| F | 7 | 99행 다음 편 'Ch 7: 메모리 컨트롤러 인터페이스'가 seriesOrder 7 chapter07-memory-controller.md이고 안내 내용이 ch07 55·85·94행 H2와 맞는다. 103~105행 ch02·ch05·ch07 라벨이 맞고 17행이 장 간 질문을 잇는다. 전제 지식·렌더 확인이 없어 9 이상은 아니다. |
| G | 2 | 21행 JESD238·JESD270-4 번호와 65행 'NVML 헤더(nvml.h)' 언급뿐이고 링크·드라이버 버전이 없다. 45~47행 A100 400 W, H100 700 W, DGX B200 14.3 kW에 본문 출처가 없다. |

게이트 재판정: 검증됨. 9ad745f7(#58) 본문의 'fix(content): fact-check HBM Ch 6 — keep what has a source' 절. DGX B200 공랭(약 14.3 kW)과 GB200 NVL72 liquid, nvml.h 0x4=SwPowerCap·0x20=SwThermalSlowdown, 열 흐름 화살표를 고쳤고 출처로 JEDEC HBM3/HBM4 발표(EDN 재게재), NVIDIA Ampere 백서(A100 400 W), H100·DGX B200·GB200 NVL72 페이지, nvml.h(nvidia-settings repo), nvidia-smi 문서를 적었다. 근거 없는 수치는 지우고 refresh 값은 TBD로 둔 기록도 있다. 이번에는 위 커밋의 검증 기록과 현재 원문의 적용 범위를 재검토해 그 범위에서 유지한 상태이며 독립적인 전체 primary 재검증을 수행했다는 뜻은 아니다.

병합 대상·다음 조치: 병합 대상 없음. 21행 전압은 ch03 26·30·114행과, 33행 refresh는 ch05 49행과 겹치지만 'HBM 냉각 방식과 throttling 비트 판독'은 시리즈 안 다른 글에 없는 질문이다. 다음 조치는 보강이다(35행 TBD를 JEDEC 원문으로 채우거나 제목에서 'Refresh Cost'를 뺌, '전력 관리'를 본문 범위로 좁힘, 62행 출력에 GPU·드라이버 버전과 nvml.h·nvidia-smi·JEDEC 링크, cooling 표 TBD 정리).


### `hbm/chapter07-memory-controller.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter07-memory-controller.md`

url: `https://hawk90.github.io/blog/embedded/hardware/hbm/chapter07-memory-controller`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 83·175행 'adaptive 방식이 흔하다'는 출처 없는 일반화다. - 96행 '큰 stride가 한 bank에 몰린다'와 104행 '작은 범위 반복 sweep이 같은 bank만 hit'은 상위 비트 매핑에서 104행 쪽이 맞고 96행이 어색하지만 '~수 있습니다'로 완화된 문장이라 내부 모순으로 확정하지 않았다. - 125~129행 HBM2/HBM3 REFpb 지원 여부를 JESD235/JESD238로 확인하지 않았다. - 153행 14.375 GB/s·460 GB/s는 PG276 원문을 열지 않았다. 내부 산술(14.375 × 32 = 460, 2 stack × 8 channel × 2 PC = 32)은 맞다. - 149행 FR-FCFS 정의를 Rixner et al.(ISCA 2000)으로 확인하지 않았다. 이번 독립 재검토의 실행 범위는 Make3.81 선택 예제뿐이며 전체API/사양 대조·4.x빌드·모바일 렌더는 미완료다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 38행이 스스로 'DRAM 계열 공통'이라 하고 57~83·85~92·94~121·123~129·131~137·149행은 일반 컨트롤러 개념이다. HBM 고유 값은 34·51·129행 모두 TBD다. 고유한 것은 153행 PG276 포트 32개·460 GB/s와 53·177~183행 tCCD_L/tCCD_S·AXI-Stream 오해 교정 정도다. 83·175행은 출처 없는 일반론. |
| B | 10 | 19~34 → 36~53 → 55~83 → 85~121 → 123~129 → 131~137 → 139~141 → 143~149 → 151~165 → 167~183 → 185~191행으로 흐름은 간다. 34·51·129행 TBD, ECC 절 두 문장(141행), queue 절 그림 하나(147행)라 10~15 하단. |
| C | 5 | 61~68·75~78행 의사 명령, 109~119행 XOR 코드는 110행 주석대로 가상 비트 위치다. 137행은 예시일 뿐이고 153행 수치는 판·링크가 없다. 실행 조건·예상 결과가 없어 4~7 구간. |
| D | 10 | 양쪽 전문 읽기: 본문59~96행↔ch05 49~68행 row/bank설명, 본문169~171행↔ch05 196~198행, 본문125~129행↔ch06 33~35행 refresh, 본문21~34·187행↔ch02 stack/channel설명이 일부겹친다. pagepolicy/FRFCFS/turnaround/PG276의독립질문으로 D10 유지. draftDDR파일은이번중복판정에사용하지않았다. |
| E | 5 | 제목 'HBM 메모리 컨트롤러 분석'을 약속하지만 본문은 DRAM 공통 개념 소개(38행)이고 HBM 고유 구성은 34행 TBD다. Address Mapping(94~121행)·Scheduling(55~83·149행)은 다룬다. |
| F | 5 | 17행 이전 편, 195행 다음 편(chapter08-npu-gpu-usage.md, seriesOrder 8), 199~201행 Ch 5·6·8 라벨은 맞다. 202행 'CXL Ch 4: CXL.mem'은 링크가 없고 cxl/chapter04-pooling-gfam.md는 'Pooling·GFAM·Fabric'(CXL.mem은 chapter08), 203행 'BoW Ch 4'는 링크 없고 draft라 F ≤ 5. CXLch04 전문(풀링/GFAM/HDM/재배치)을 확인했으나 CXL.mem라는 특정장명은ch08의메시지/decoder절을 가리킨다. 외부메모리관계가있어도잘못된장명상한은유지. BoW4의컨트롤러분리/protocol절도읽어그쪽라벨은맞으므로draft만의감점근거는철회. |
| G | 2 | 34행 'JEDEC HBM3 발표'에 날짜·번호가 없고 153행 PG276·Alveo U55C는 판·링크가 없다. 141·149행 주장에 출처가 없다. |

게이트 재판정: 검증됨. 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 7 against primary sources' — tCCD_L/tCCD_S 대소 관계, Xilinx 컨트롤러를 PG276 기준(256-bit AXI 포트 32개, 14.375 GB/s × 32 = 460 GB/s, Alveo U55C 16 GB HBM2, segmented crossbar)으로, HBM3 on-die ECC를 symbol 기반으로 고치고 근거 없는 수치를 삭제·TBD로 했다. 출처는 JEDEC HBM3 release, AMD Alveo U55C 제품 페이지, AMD PG276. 이번에는 위 커밋의 검증 기록과 현재 원문의 적용 범위를 재검토해 그 범위에서 유지한 상태이며 독립적인 전체 primary 재검증을 수행했다는 뜻은 아니다.

병합 대상·다음 조치: 병합 대상 없음. chapter05와 row hit/miss·bank conflict 설명(ch05 49~68행 ↔ 이 글 59~96행)이 겹치지만 page policy·FR-FCFS·turnaround·PG276 AXI 포트 구조는 이 글에만 있고 'HBM 메모리 컨트롤러' 검색 의도가 있다. 다음 조치는 보강이다(34·51·129행 TBD를 JESD238로 채움, JEDEC·PG276 출처를 판·링크와 함께 본문에, 202~203행을 cxl/chapter08-cxl-mem.md 링크로 고치거나 지움, ch05와 겹치는 bank conflict 설명은 링크로 줄임).

## 원문 스냅샷과 검증 범위

아래 전문과 SHA-256은 이번 근거 읽기 스냅샷이다. 종료 시 동일 해시를 다시 확인했다. target/compiler 실행은 별도 실행 기록이 있는 경우만 인정하며, 실행하지 않은 예제나 공식 자료를 확인했다고 쓰지 않았다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| chapter05-functions.md | 1~667행 | e7eddbf4a8e57446b497c6955273d0c03eaf1e3f9cfa80829903506d61dacde1 |
| chapter06-conditionals.md | 1~657행 | 7ddc4dba0a956cf0c35aca21039993f84c8e2a0246b281cd1267eb2dbf935c1a |
| chapter07-practical.md | 1~619행 | d90d7635d0c4363ed4de48c2b13805c0c071e4c636d5764b741352cf431f7b8d |
| chapter01-overview.md | 1~151행 | 4beac4e7f5aba0dbf37ce022a0b211f49092e58156b54648f76a3025086a9514 |
| chapter02-hbm-stack.md | 1~132행 | ef23566caf7a3aa07f8ca599c6184215d9f5e48389d7894e3d82de420e4fbedd |
| chapter03-hbm-generations.md | 1~231행 | 388f90b02e13b6c3497a78dcd431142a681cec6b45356822d8c6948be6aa18a5 |
| chapter04-gddr.md | 1~194행 | 883c54103e9486ee70955d85b57f5f80b947f2852525454b654c15597fb69730 |
| chapter05-bandwidth-bottleneck.md | 1~218행 | f919bfbc29d8a633a6c47bf6aafd3f205257ca09f920ca4a9bb36edaed963af3 |
| chapter06-thermal-power.md | 1~105행 | 7201ed8ff38b2c6b8d323860f6fe27483ea15f9118bcaaad475ac8fd748b82d9 |
| chapter07-memory-controller.md | 1~203행 | 03ac1ebf4f98d4fb85fbeecda4231f8d5d2972963863cd72a2632b688ddfbd89 |
