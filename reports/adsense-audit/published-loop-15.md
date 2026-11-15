# 공개 글 AdSense 평가 — 루프 15

> 대상: 공개 글 10편 (Embedded C++ for Real Systems, `seriesOrder` 24~33)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 열다섯 번째 루프다. 대상은 `src/content/blog/embedded/embedded-cpp/`의 `part3-06-error-handling-patterns.md`~`part4-05-type-safe-flags.md` 10편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part3-06-error-handling-patterns.md` | 12 | 10 | 5 | 9 | 4 | 5 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part3-07-expected.md` | 11 | 12 | 6 | 9 | 5 | 6 | 2 | **51** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `part3-08-no-rtti-design.md` | 11 | 12 | 6 | 11 | 7 | 7 | 1 | **55** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `part3-09-smart-pointer-choice.md` | 12 | 12 | 6 | 9 | 7 | 5 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part3-10-ownership-model.md` | 10 | 10 | 5 | 10 | 6 | 5 | 2 | **48** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part4-01-intrusive-containers.md` | 12 | 12 | 6 | 12 | 5 | 5 | 1 | **53** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part4-02-etl-library.md` | 9 | 10 | 6 | 9 | 5 | 6 | 2 | **47** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part4-03-lock-free-basics.md` | 10 | 11 | 6 | 7 | 7 | 6 | 1 | **48** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part4-04-lock-free-container.md` | 10 | 10 | 6 | 7 | 7 | 7 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part4-05-type-safe-flags.md` | 10 | 10 | 4 | 12 | 5 | 5 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |

평균 49.5점(10편 합 495), 범위 46~55점이다. 판정은 병합 검토 7편(3-06·3-07·3-08·3-10·4-01·4-02·4-03), 우선 조치 3편(3-09·4-04·4-05)이고 유지·검증 대기·보강·제외 검토는 없다. 우선 조치 3편은 모두 원문 내부 모순으로 `factcheck: 오류 확인`이 났고 점수 구간은 병합 검토(40~59)다. 나머지 7편은 git 이력에 1차 자료 대조 커밋이 없어 미검증이다. 병합 검토 7편은 모두 독립 검색 의도가 있어 다음 조치가 보강(차별화)이다(병합 대상 없음 3편: 3-08·4-01·4-02). 오류 확인은 3건이다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체, 다음 글·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·draft 여부, 링크 없는 관련 항목의 대상 파일까지이고, 렌더링·광고 배치·외부 링크 응답·외부 유사 문서는 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part3-06-error-handling-patterns.md` | 46 | 46 | 0 | 없음 |
| `part3-07-expected.md` | 52 | 51 | -1 | 없음 |
| `part3-08-no-rtti-design.md` | 55 | 55 | 0 | 없음 |
| `part3-09-smart-pointer-choice.md` | 52 | 52 | 0 | 없음 |
| `part3-10-ownership-model.md` | 49 | 48 | -1 | 없음 |
| `part4-01-intrusive-containers.md` | 55 | 53 | -2 | 없음 |
| `part4-02-etl-library.md` | 47 | 47 | 0 | 없음 |
| `part4-03-lock-free-basics.md` | 48 | 48 | 0 | 없음 |
| `part4-04-lock-free-container.md` | 48 | 48 | 0 | 없음 |
| `part4-05-type-safe-flags.md` | 49 | 47 | -2 | 없음 |

1차 합 501에서 최종 495로 6점 내려갔다. 판정이 바뀐 글은 없다. 부풀림(AP-C-24) 판정을 받은 글은 없다.

- 기각한 오류 확인: 0건. 1차 평가의 오류 확인 3건(3-09, 4-04, 4-05)은 모두 원문 줄을 다시 대조해 유지했다.
- 추가한 오류 확인: 1건(같은 글 안의 근거 추가). 4-05 212행 `reg &= ~(0b111 << (pin * 2))`와 202·213행 AnalogMode=0b111이 212·217행의 핀 간격 pin*2와 동시에 맞을 수 없다(pin 5 기준 비트 12는 같은 글 간격상 pin 6 필드). 1차는 uncertainties에 두었으나 글 자신의 간격만으로 성립하는 산술이라 3-1 내부 모순으로 올렸다. 판정(우선 조치)은 같다.
- 3-07: E 6→5. 제목이 '분석'을 약속하는데 74~86행 layout 절이 주석 두 줄뿐인 API 소개 수준이라 루브릭 E 주석(3~5)을 적용했다.
- 3-10: B 11→10. 89행 borrower 정의('함수 scope 동안만')와 113·123행 멤버로 보관하는 Display를 borrower로 부르는 것, 360~366행 함정 5가 서로 맞지 않는 용어 충돌을 추가했다.
- 4-01: D 13→12(같은 주제 공개 글 `rtos/practical-internals/part2-01-ready-list.md` 48~55행을 1차가 비교하지 않음), E 6→5(제목 '분석' + 사용 예 나열).
- 4-05: C 5→4(레지스터 예 두 개가 모두 내부 모순), F 6→5(다음 글·관련 링크가 템플릿 요소뿐이고 같은 질문을 다루는 part5-01로 본문 안내가 없음).
- 근거 정정(점수 영향 없음): 3-07 D의 part3-05·3-06 줄 범위, 4-01 B의 표 줄(230→229행)과 part3-03 allocate 줄(86~92행), 4-03·4-04 D의 4-04·4-03·performance-engineering 줄 번호, 3-09 D의 part2-02 PoolDeleter 줄(198~214행).
- F는 10편 모두 다음 글(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 감점은 링크 없는 draft 관련 항목(3-06 463행, 3-09 346행, 3-10 405행)과 주제 라벨이 00-preface로 가는 링크(4-01 420행), 템플릿 수준 내비게이션(4-05)이다.

## 글별 근거

### `part3-06-error-handling-patterns.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 45f880d5(작성), 815510c8·39149f68(톤 폴리싱), 400892d7(린터 일괄), ac24bb76(제목 일괄 변경), be973200(topic 메타데이터), 0a9dd7bc(slug 고정), b12f53a8 'Correct embedded C++ standard guidance'(398·419행 -fno-exceptions 문구 2줄 수정, 커밋 본문 없음·출처 없음)뿐이다. 1차 자료와 대조했다는 커밋이 없다. 평가 중 GCC 문서·tl::expected 소스를 열지 않았고, 원문 안의 코드 결함(372행 미정의 enumerator 등)은 기존 보고서 관행대로 B·C 감점과 uncertainties로 두었다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 것은 범위별 Error enum(69~112행), 원인 에러를 담는 ErrorContext·ERR_CTX(157~172행), statement expression TRY 매크로(180~196행), magic·CRC를 단 CrashInfo와 부팅 시 검사(309~349행)다. 다만 모두 흔한 패턴이고 선택 기준이 약하다. 174행은 옵션 1·2의 차이를 '트레이드오프입니다'로 끝내 코드 크기가 얼마나 느는지 말하지 않는다. 인증 환경 절(351~379행)은 '테스트해야 합니다'(355행)·'명시하고 검증해야 합니다'(356행) 같은 일반론과 조항 없는 예제다. part1-04 앵커(A 10)보다 고유 예제가 많지만 13 구간의 '선택 기준 확인'에는 못 미친다. |
| B | 10 | 분류(30~63행) → 표준화(65~112행) → Result(114~143행) → 전파(145~174행) → 로깅(200~232행) → 복구(234~266행) → fatal(305~349행) → 함정(381~419행) → 측정(421~447행) 흐름은 끝까지 간다. 제목의 errno는 2행 제목 말고 본문에 한 번도 없고, description(5행)의 'exception-free RAII'도 본문에 없다. 372행 Error::InternalError는 71~100행 enum에 없고, 169행은 Result&lt;float&gt;(121행 정의상 에러 타입 Error)에서 tl::unexpected(ErrorContext)를 반환한다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13이고, 빠진 키워드·한계로 10. |
| C | 5 | 컴파일러·버전·대상 MCU·tl::expected 버전이 없다. 측정 절(425~445행)의 8 B·10 B·16 B·18 B·312 B는 출처·측정 환경 없는 구체 수치라 루브릭 3-1 'C ≤ 8'을 적용했다. '크기'가 코드 크기인지 반환값 크기인지 정하지 않았다(436행). 372·169행 코드는 글 안 정의와 맞지 않아 그대로는 컴파일되지 않고(AP-C-35), 재현 절차·기대 관찰이 없다. 4~7 구간. |
| D | 9 | 같은 시리즈 `part3-05-no-exception-design.md`(seriesOrder 23) 210~251행 계층화된 에러가 이 글 145~172행 에러 chain과 같은 질문이고, 3-05 253~273행 and_then 체인이 이 글 132~143행, 3-05 367~383행 예외 on/off 크기 측정이 이 글 442~447행과 겹친다. `part3-07-expected.md`(25) 113~135행 and_then/or_else, 194~214행 transform_error, 298~323행 반환 형태별 비용 비교가 이 글 134~143행·145~172행·425~447행과 겹친다. 다른 시리즈 공개 글 `modern-recipes/part10-12-postmortem-analysis.md` 87~150행 MCU mini-dump(292행 .noinit)가 이 글 309~349행 CrashInfo와 같은 기법이다. embedded-cpp 밖에서 tl::expected·std::expected·fatal_error를 쓰는 글은 grep 결과 모두 draft다. fatal/recoverable 분류(30~63행)와 Error 범위 표준화(65~112행)는 이 글만의 역할이라 5~9 구간. |
| E | 4 | 제목(2행)은 'Result·errno·optional 비교'를 약속한다. errno는 본문에 없고, optional은 393행 한 문장과 434~436·447행 측정 한 칸뿐이며, 세 방식을 나란히 비교하는 절이 없다. description(5행)의 'exception-free RAII'도 다루지 않는다. 키워드 절반 이상이 빠져 3~5 구간. 15행 '세 가지 결정'과 28·451행 '네 가지 결정'도 어긋난다. |
| F | 5 | 467행 다음 글(part3-07-expected)은 실제 seriesOrder 25 글이고 라벨이 제목과 맞다. 460~462행 관련 항목(3-05, 3-07, 4-06)과 19·303행 본문 링크도 대상 제목과 맞다. 그러나 463행 'Refactoring Pattern 40: Introduce Assertion — 검증'은 링크가 없고 대상 `refactoring-catalog/pattern40-introduce-assertion.md`는 draft라 독자가 갈 수 없다. 루브릭 F '링크 없는 관련 항목'으로 5 이하. 전제 지식 안내는 19행 한 줄이고 audit:reading·폰 폭 렌더는 보지 않았다. |
| G | 1 | 본문에 1차 출처 링크가 없다. tl::expected 버전, GCC statement expression(196행), C++20 std::source_location(220행), C++23 monadic 연산(198행), DO-178C·ISO 26262(351행)가 출처·버전 없이 이름만 나온다. 측정 수치(428~444행)의 컴파일러·옵션·대상도 없다. 앵커 part1-04·part6-09(G 1)와 같다. |

uncertainties:
- 15행 '세 가지 결정'과 28·451행 '네 가지 결정'이 다르다(개수 표기 실수라 오류 확인에 넣지 않음).
- 372행 Error::InternalError가 71~100행 enum에 없어 그대로는 컴파일되지 않는다. 기존 보고서 관행(미정의 식별자 → B·C 감점)에 따라 오류 확인이 아니라 B·C에서 감점했다.
- 169행: Result&lt;float&gt;=tl::expected&lt;float, Error&gt;(121행)인데 tl::unexpected(ErrorContext)를 반환한다. 변환 불가로 보이나 tl::expected 소스로 확인하지 않았다.
- 196행 'statement expression은 gnu++ 모드에서만 동작': GCC는 -std=c++NN에서도 확장으로 받고 -pedantic에서 경고만 내는 것으로 기억하지만 GCC 문서로 확인하지 않았다.
- 322~324·349·456행: .noinit 섹션은 reset 후 보존되지만 전원 차단 후 보존은 battery-backed/FRAM 배치와 링커 스크립트에 달려 있는데 그 전제가 없다.
- 334·342행: calculate_crc(&g_crash_info)가 crc 필드를 포함해 계산하면 부팅 시 비교가 항상 실패한다. calculate_crc 정의가 없어 판단 불가.
- 333행 strncpy는 message[63]에 NUL을 쓰지 않고 .noinit 영역은 초기화되지 않아 종료 문자가 보장되지 않을 수 있다. 312행 reset_count는 갱신하는 코드가 없다.
- 428~444행 크기 수치(8/10/16/18/312 B)는 출처·환경이 없고, 같은 다섯 형태를 비교한 part3-07 298~323행 sizeof 1/4/8/8과 지표가 다르다(다른 글과의 차이라 오류 확인에 넣지 않음).
- 398행 'throw는 -fno-exceptions에서 일반적으로 컴파일 오류'와 417행 'try/catch 컴파일 에러'는 GCC·Clang 문서로 확인하지 않았다(b12f53a8에서 수정됐으나 출처 없음).

병합 대상: 후보는 `part3-05-no-exception-design.md`(이 글 132~172행 체인·계층 래핑, 442~447행 예외 크기 → 3-05 210~273행·367~383행)와 `part3-07-expected.md`(이 글 425~447행 반환 형태 비교 → 3-07 298~323행). 다음 조치는 보강이다. fatal/recoverable 분류(30~63행), 프로젝트 공통 Error 범위(65~112행), CrashInfo 보존·부팅 검사(305~349행)는 '시스템 차원 에러 정책'이라는 독립 검색 의도가 있어 글 전체 병합보다 차별화 보강이 맞다. 겹치는 체인·측정 절은 3-05/3-07로 넘기고, 제목의 errno 비교를 실제로 쓰거나 제목·description을 본문 범위로 좁히고, 372·169행 코드 불일치와 측정 환경을 정리한다.

### `part3-07-expected.md` — 51점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), be973200(topic 메타), ac24bb76(제목 변경), 400892d7(linter 일괄), 39149f68·815510c8(번역투 폴리싱), 44d280e6(작성)뿐이다. P0323·cppreference·libstdc++/libc++ 같은 1차 자료와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고, 글 안에서 동시에 참일 수 없는 두 진술도 확정하지 못했다(의심은 uncertainties에 적음).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 15~111행(optional과 비교한 동기, 기본 사용, unexpected wrapper, sizeof, toolchain 표)은 cppreference·입문 자료 수준이다. 이 글만의 부분은 센서 driver chain(148~173행), LowError→HighError 변환(198~214행), combine 헬퍼(220~237행)인데 모두 짧은 코드와 한 문장 설명이다. 289행 '보통은 신경 쓰지 않아도 됩니다', 323행 '가치가 비용을 크게 웃돕니다'는 근거 없는 일반론이다. tl::expected 대신 직접 구현할 때, 예외 off에서 value()를 막는 방법 같은 선택 기준이 없다. 6~12 구간 상단. |
| B | 12 | 문제(17~46행) → 기본 사용 → layout → 가용성 → monadic(113~144행) → void·에러 변환·combine·move → 함정 6개(254~296행) → 측정 → 정리까지 흐름이 완성됐다. 다만 261행은 -fno-exceptions에서 value()가 'abort 또는 UB'라고만 하고 구현별 동작은 적지 않았다. 92~96행 표는 헤더 유무만 적고 monadic 연산을 쓸 수 있는 버전은 없다. 120·123·129·155행의 Result는 이 글에서 정의하지 않는다(정의는 part3-06 120~121행). 정확성 의심이 남아 AP-C-24에 따라 B ≤ 13. |
| C | 6 | 그대로 컴파일되는 예가 드물다. 60행 Error::SomeError는 29행 enum에 없고, 64행 some_function은 정의되지 않았고, 120~132행 Result도 정의되지 않았다. 131행은 std::expected 절에서 tl::unexpected를 쓴다. 측정 절(302~321행)은 sizeof 1/4/8/8과 'Cortex-M4 -O2 … 4-8 instructions'를 적었지만 컴파일러·버전·관찰 출력이 없다. 3-1 'C ≤ 8'에 걸리고 실행 조건·예상 결과가 부족해 4~7 구간. |
| D | 9 | 같은 시리즈 `part3-05-no-exception-design.md` 121~146행(std::expected read_register와 switch)은 이 글 28~44행과, 150~164행(tl::expected 백포트 'C++17부터'·'API가 거의 동일')은 98~111행과, 254~271행 and_then 체인은 117~144행과 같은 예제·문장이다. `part3-06-error-handling-patterns.md` 118~129행 Result 별칭·Result&lt;void&gt;는 이 글 177~192행과, 428~447행 비교 측정은 302~323행과 뼈대가 같다. `part1-08-cpp-standard-choice.md` 241~244행 divide 예는 이 글 31~35행과 같다. 다른 시리즈 같은 주제 글(code-review/folly/part16-01-expected.md, beautiful-cpp/item17, autosar-cpp/chapter14)은 모두 draft다. transform_error·void·combine·함정 절은 이 글에만 있어 5~9 구간. |
| E | 5 | description(5행) 'monadic 에러 처리, 예외 없이 풍부한 정보'는 본문 113~214행이 다룬다. 하지만 제목(2행)이 '분석'을 약속하는데 layout 절(74~86행)은 주석 두 줄뿐이고 구현·코드 생성 분석이 없어 API 소개 수준이다. 루브릭 E 주석에 따라 3~5점. 15행 'zero-cost'도 323행 'sizeof는 약간 크고'로 끝나 근거가 없다. |
| F | 6 | 343행 다음 글 'Part 3-08: No-RTTI 설계'는 seriesOrder 26 `part3-08-no-rtti-design.md`와 맞다. 336~338행 관련 항목 라벨은 대상 제목(part3-05, part3-06, part1-08)과 맞다. H2 뼈대는 시리즈 공통 템플릿이고 3-05·3-06을 먼저 읽으라는 전제 지식 안내가 본문에 없어 7점 이상의 근거가 없다. audit:reading과 폰 폭은 확인하지 않았다. |
| G | 2 | 본문의 출처는 339행 Rust Result 문서 링크와 102행 bash 주석 안의 TartanLlama 저장소 URL뿐이고 둘 다 버전이 없다. P0323·P2505 같은 표준 문서나 cppreference 링크가 없다. 92~96행 toolchain 표와 95행 'ARM Compiler 6 아직 미지원 (2026)'에는 출처와 확인 날짜가 없고, 319행 측정에는 컴파일러 버전이 없다. |

uncertainties:
- 92행 'GCC 12+ OK'와 part1-08-cpp-standard-choice.md 163행 'C++23 (GCC 13+ 필수)'가 다르다. libstdc++의 &lt;expected&gt;·monadic 연산 도입 버전을 1차 자료로 확인하지 않았다(다른 글과의 모순이라 오류 확인에 넣지 않음).
- 281·332행 'expected는 기본 [[nodiscard]]'가 표준·구현과 맞는지 확인하지 않았다.
- 98·328행 'tl::expected는 C++17부터'가 저장소의 지원 표준과 맞는지 확인하지 않았다.
- 95~96행 ARM Compiler 6·IAR '아직 미지원 (2026)'은 출처 없이 날짜를 박은 주장이다.
- 80행은 'int 4 + bool 1 + 정렬 패딩'으로 8 byte를, 317행은 'int + ErrorCode + flag'로 sizeof 8을 설명한다. 76행은 union이라고 한다. union으로 읽으면 맞아서 모순으로 확정하지 않았다.
- 131행은 std::expected 절에서 tl::unexpected를 반환한다. part3-06 120~121행처럼 Result가 tl::expected 별칭이면 맞지만 이 글 안에서는 정의되지 않았다.
- 115행 'Rust의 ? operator처럼 체인'은 and_then의 의미와 다르다는 의심이 있다.
- 261행 -fno-exceptions에서 value()가 실패할 때 'abort 또는 UB'라는 구현별 동작을 확인하지 않았다.
- 15행 'zero-cost'와 323행 'sizeof는 약간 크고'는 말이 어긋나지만 정의에 따라 둘 다 참일 수 있어 모순으로 보지 않았다.

병합 대상: 후보는 `part3-05-no-exception-design.md`(121~164행 패턴 3·4, 254~271행 and_then 체인)와 `part3-06-error-handling-patterns.md`(118~129행 Result 별칭, 428~447행 비교 측정). 'std::expected' 단독 검색 의도가 있으므로 이 글은 남기고 다음 조치는 보강이다. 3-05·3-06의 expected 예제를 이 글로 모으고 그쪽은 링크로 줄인다. 이 글은 1차 자료(P0323/P2505, libstdc++·libc++ 버전)로 toolchain 표를 고치고, -fno-exceptions에서 value() 동작과 실제 측정 환경을 적어 차별화한다.

### `part3-08-no-rtti-design.md` — 55점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 44d280e6(최초 작성), 815510c8(TikZ·정리 폴리싱), 39149f68(번역투 폴리싱), 400892d7(linter 일괄), ac24bb76(제목 변경), be973200(topic 메타), 0a9dd7bc(slug 고정) 7개다. C++ 표준·GCC 문서·libstdc++ 구현과 대조했다는 커밋이 없다. 재검토 중 1차 자료를 열지 않았고, 동시에 참일 수 없는 두 진술은 확정하지 못했다(381행 58→38 KB, 20 KB, 34.5%≈35%는 산술상 맞고, 372+373=374행 합계도 맞음).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | enum tag(44~96행)·std::variant(98~185행)·CRTP(187~211행) 세 대안은 흔한 목록이고 같은 시리즈 part1-02 140~145행도 같은 세 가지를 나열한다. 글 고유의 것은 정적 변수 주소 TypeId(213~249행), dynamic_cast 대체 세 가지를 맞댄 절(251~274행), Event 시스템 variant 예(293~326행)다. 276행 '조금씩 다른 트레이드오프'는 선택 기준 없이 끝나고, 29행 '수 KB에 이를 수 있습니다'·326행 '수 KB 절약할 수 있습니다'·388행은 출처 없는 완곡 수치라 일반론으로 본다. |
| B | 12 | 문제 정의(17~42행) → 대안 3개 → 자체 type-id(213~249행) → dynamic_cast 대체(251~274행) → std::any(278~291행) → Event 예(293~326행) → 함정(336~364행) → 측정(366~384행) → 정리(386~392행)로 흐름은 완성됐고 variant의 closed set·크기 한계(182~183행), CRTP의 runtime 다형성 불가(211행)도 적었다. 열린 계층(플러그인·런타임 등록)에서 무엇을 쓰는지, 세 대안의 선택 기준이 없다. 289행 std::any, 361행 std::function, 81~91행 선언 순서 같은 정확성 불확실이 열려 있어 AP-C-24에 따라 13 이하. |
| C | 6 | 측정 절(368~382행)은 'STM32F4, 단순한 상속 프로젝트'만 적고 컴파일러·버전·명령·측정 도구가 없으며, 절 제목은 'RTTI 끄기 효과'(366행)인데 371·376행이 -frtti/-fexceptions를 함께 바꿔 RTTI 효과를 분리하지 못한다. 출처·환경 없는 구체 수치라 C ≤ 8. 그대로 복사하면 컴파일되지 않을 조각(83행이 89행 선언보다 앞서 TypeOf 사용, 303~304행 class와 307~308행 struct ClickEvent/KeyEvent 중복 정의, 204행 r 미초기화)이 있어 4~7 구간. |
| D | 11 | 같은 시리즈 인접 `part3-07-expected.md`(25)·`part3-09-smart-pointer-choice.md`(27)는 주제가 별개다. `part1-02-compiler-flags.md` 120~147행이 이 글 19~31행·44~211행과 같은 RTTI 비용·세 대안을 요약하고 147행에서 이 글로 넘겨 역할이 나뉜다. `part4-06-state-machine.md` 104~130행의 variant+visit+if constexpr가 이 글 141~149행·313~323행과 같은 형태. `part2-08-static-polymorphism.md`(CRTP 전체)를 이 글 187~211행이 짧게 되풀이하고 189행에서 참조. `part3-05-no-exception-design.md` 367~383행 STM32F4 크기 측정 블록과 이 글 366~382행이 같은 뼈대. 다른 시리즈 `rtos/practical-internals/part4-13-cpp-in-rtos.md` 252~263행은 -fno-rtti 플래그만 짧게 다룬다. visitor 계열(gof item23-visitor, cpp-software-design guideline16~18)은 모두 draft라 공개 글 중 독립 주제는 이 글뿐. |
| E | 7 | 제목(2행) 'dynamic_cast 제거와 정적 타입 분기'와 description(5행) enum tag·std::variant·CRTP를 본문 44~211행·251~274행이 다룬다. 다만 366행 'RTTI 끄기 효과'는 예외 플래그를 함께 바꾼 측정이라 약속과 어긋나고, 78행 '헬퍼 매크로'는 매크로가 아니라 템플릿(81~91행)이다. 대상 독자·환경(MCU, 표준 버전)이 도입에 없다. |
| F | 7 | 403행 다음 글 'Part 3-09: 스마트 포인터 선택'은 seriesOrder 27 `part3-09-smart-pointer-choice.md`와 맞다. 관련 항목 396~398행 라벨(part1-02, part2-08, part4-06)은 대상과 맞다. 399행 'GoF 23: Visitor'는 링크가 없고 대상 item23-visitor.md는 draft. 185·189행 본문 링크가 관련 절로 이어지고 251~274행이 세 대안을 한 블록에 대응시키는 글 고유 정리가 있어 7. audit:reading·폰 폭 확인을 하지 않아 9 이상은 아니다. |
| G | 1 | 본문에 C++ 표준 조항, cppreference, GCC -fno-rtti 문서, libstdc++ 구현 같은 1차 출처 링크가 없다. 98행 'C++17' 외 컴파일러·라이브러리 버전이 없고, 249행 Boost.TypeIndex 언급도 링크·버전이 없다. 측정(368행)도 툴체인 표기가 없다. |

uncertainties:
- 289행 'std::any는 -fno-rtti에서 컴파일 에러': libstdc++는 RTTI 없이도 any_cast가 동작하고 type()만 빠진다고 기억하나 1차 자료 미확인.
- 361행 'std::function은 내부 type erasure에 typeid를 사용': target_type()만 RTTI에 의존한다고 기억하나 미확인.
- 76행 '클래스당 enum size(4 byte)': 58행 type_은 비정적 멤버라 객체마다 붙는 비용으로 보이며(코드와 산문 표현 불일치 가능성), enum class 기본 기반형 크기도 미확인.
- 152·356행 'sizeof = max(sizeof) + index': 정렬 패딩 누락 여부 미확인.
- 177행 'visitor가 인라인되어 간접 호출이 0': std::visit 구현(점프 테이블) 여부 미확인.
- 81~91행: checked_cast가 89행 선언보다 앞서 TypeOf를 써 컴파일되지 않을 수 있음(언어 규칙 판단 필요).
- 303~308행: ClickEvent·KeyEvent 재정의(그대로는 재정의 오류로 보임).
- 364행 '한 모듈만 RTTI를 켜 두면 링크 충돌': 출처 없음.
- 368~382행 측정 수치는 출처·툴체인 없음. part1-02 395행(-fno-rtti 단독 0.5 KB), 137행(1-5KB), part3-05 371~380행(-fno-exceptions만으로 .text 42→38 KB)과 맞물리지 않아 1차 측정으로 정해야 함(교차 글 불일치라 오류 확인 아님).
- 249행 Boost.TypeIndex가 정적 주소 방식을 쓴다는 설명 미확인.

병합 대상: 병합 대상 없음. `part1-02-compiler-flags.md` 120~147행이 이 글의 요약이고 147행에서 이 글로 넘기며, RTTI 대체를 다루는 visitor 계열 글은 모두 draft라 공개 글 중 이 주제를 독립으로 다루는 곳은 이 글뿐이다. 다음 조치는 보강: 세 대안의 선택 기준(열린/닫힌 type set, 객체 크기, 호출 비용), 컴파일러·버전·명령이 있는 RTTI 단독 on/off 측정으로 366~382행 교체(또는 TBD), std::any·std::function의 -fno-rtti 동작을 libstdc++ 1차 자료로 확인해 289·361행 수정, 컴파일되지 않는 조각(81~91행, 303~308행) 정리, 78행 '매크로' 표기 수정.

### `part3-09-smart-pointer-choice.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치(루브릭 3-1). 299~302행 표는 unique_ptr 1.2 ms(~120 cycles), unique_ptr + pool 0.15 ms(~15 cycles)인데 304행은 'pool과 unique_ptr 조합이 10배 빠릅니다'라고 결론짓는다. 1.2/0.15 = 120/15 = 8배라 표(299~302행)와 304행 결론이 동시에 참일 수 없다. total 열은 '~' 없는 값이라 반올림으로 설명되지 않고, 개수 표기 실수가 아니라 수치 결론이므로 3-1 제외 조항에 해당하지 않는다. git log(0a9dd7bc slug 고정, be973200 topic, ac24bb76 제목 변경, 407c9d9a ASCII→TikZ, 400892d7 linter, 39149f68 번역투 폴리싱, 그 이전 작성·폴리싱 커밋)에는 1차 자료 대조 커밋이 없어, 이 불일치가 없어도 미검증이다. 점수 구간은 병합 검토(40~59)이고 오류 확인 우선 적용으로 판정은 우선 조치다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 것은 임베디드 선택 기준(15행 'unique_ptr 기본, shared_ptr 회피', 109행 '명확한 정당화 필요'), heap 없는 std::optional 대안(241~254행), intrusive refcount 대안(306~330행), pool custom deleter(67~84행)다. 반면 네 포인터 정의(19~24행), weak_ptr cycle 예(145~153행), Core Guidelines 요약(180~185행)은 표준 입문 목록과 같다. shared_ptr 회피 근거(105행 cache coherence, 291행 'hot path에 부담')는 수치 없는 주장이고, 유일한 정량 근거(297~302행)는 출처·환경이 없다. 앵커 part1-04(A 10)보다 선택 기준이 뚜렷해 12. |
| B | 12 | 요약(13) → 네 종류(28~185) → 결정 트리(189) → 패턴 두 개(193~254) → 함정 6개(256~291) → 측정(293~304) → 대안(306~330) → 정리(332)로 흐름은 끝까지 간다. IntrusivePtr(320~327행)는 copy·move를 `// ...`로 비워 이중 release 위험을 판단할 수 없고, 330행은 atomic 전환을 한 줄로 끝낸다. 114행은 'RTOS 다중 task 동시 접근'을 shared_ptr 사용 이유로 들지만 124행 `process(*data_)`의 객체 접근 동기화는 다루지 않는다. pool 위 shared_ptr(allocate_shared 등)이 없다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 6 | 실행 환경(MCU·컴파일러·표준 라이브러리·C++ 판)이 없다. 측정 표(297~302행)는 295행 '1만 회 생성·해제'뿐이고 MCU·클록·컴파일 옵션·측정 방법이 없어 3-1 'C ≤ 8'이 걸린다. 304행 결론(10배)이 표(8배)와 맞지 않아 그 아래로 둔다. 120 cycles × 1만 = 1.2 ms는 1 GHz 클록을 전제하는데 글이 밝히지 않는다. 49~51·200~204행 예제는 validate·initialize·생성자 정의 없는 조각이다. |
| D | 9 | 같은 시리즈 인접 `part3-10-ownership-model.md`(28)와 겹침: 276~281행 cycle 함정 = 3-10 333~338행(코드 두 줄 동일), 180~185행 Core Guidelines·gsl::owner = 3-10 305~323행, 222~254행 optional 멤버 = 3-10 168~183행 멤버 결정 표. `part2-02-raii-patterns.md`와 겹침: 67~84행 PoolDeleter·PoolPtr = 2-02 198~214행(같은 이름·구조), 270~274행 함수 포인터 deleter = 2-02 218~226행. `part3-08-no-rtti-design.md`(26)는 주제가 달라 겹침 없음, `part3-03-pool-allocator.md` 157행 이후는 자체 Pool unique_ptr 클래스라 접근이 다르다. 다른 시리즈 effective-modern-cpp item18·19·20은 draft다. 공개 글 중 shared_ptr/unique_ptr 언급이 많은 글은 이 글·3-10·2-02 셋뿐(grep). 결정 트리·비교 표라는 질문은 남는다. |
| E | 7 | 제목 '임베디드 스마트 포인터 선택 — unique·shared·custom 비교'와 description(5행)이 본문 28~185행 네 종류, 187~191행 결정 트리, 293~304행 비교 표와 같은 질문을 향한다. 'custom'은 67~84행 custom deleter와 306~330행 intrusive ptr로 다룬다. '비교'의 정량 근거가 환경 없는 수치이고 대상 MCU가 없어 9 이상은 아니다. |
| F | 5 | 350행 다음 글(Part 3-10 소유권 모델)은 seriesOrder 28 `part3-10-ownership-model.md`와 맞다. 342~345행 링크 대상(2-01 RAII 기초, 2-02 custom deleter 196~226행 절, 3-03 157행 Pool unique_ptr 절, 3-10)은 라벨과 맞다. 그러나 346행 'Refactoring Pattern 33: Change Reference to Value'는 링크 없는 관련 항목이고 대상 `programming/design/refactoring-catalog/pattern33-change-reference-to-value.md`는 draft라 독자가 볼 수 없으며 주제도 맞지 않는다. 루브릭 F 조항으로 5 이하. |
| G | 1 | 180·185행 C++ Core Guidelines·gsl::owner, 330행 Boost.IntrusivePtr는 이름만 있고 링크·규칙 번호·버전이 없다. C++ 표준 판, 컴파일러·표준 라이브러리 버전, 측정 MCU가 없다. 94·101행 크기 수치와 297~302행 cycles에 출처가 없다. |

uncertainties:
- 94행 'shared_ptr 크기 8 byte(32-bit ARM에서도 8 byte)'는 같은 줄 '포인터 두 개' 설명대로면 64-bit에서는 16 byte다. 같은 주제 draft 글 effective-modern-cpp/item19도 16 byte로 적었다. 표준 라이브러리 구현으로 확인하지 않았다.
- 96행 'control block은 별도로 할당'과 106행 'make_shared는 1번 할당'이 89행 make_shared 예 아래에서 함께 쓰여 엇갈려 읽힌다. '별도'의 뜻이 모호해 오류 확인으로 올리지 않았다.
- 274행은 함수 포인터 deleter가 sizeof를 두 배로 만든다며 struct deleter를 권하지만, 67~77행 PoolDeleter는 Pool* 멤버를 가진 상태 있는 struct라 42행 조건('deleter가 비어 있다면')을 만족하지 않아 PoolPtr도 포인터 두 개 크기일 것으로 보인다. 337행 정리도 구분하지 않는다. EBO 규칙 확인 필요.
- 101행 control block '보통 16~32 byte', 301행 'copy +10 cycles'는 출처 없는 수치다(libstdc++/libc++ 미확인).
- 105·291행 atomic 카운터 비용: 단일 코어 Cortex-M(ARMv6-M 등 LDREX/STREX 없음)에서 libstdc++ lock policy에 따라 달라지는데 글은 multi-core만 다룬다. 미확인.
- 114·124행: shared_ptr은 수명만 보장하고 객체 접근 동기화는 보장하지 않는데 글이 '동시 접근'을 사용 이유로 든다.
- 320~327행 IntrusivePtr는 copy 생성자·대입이 `// ...`로 빠져 그대로 쓰면 기본 복사로 add_ref 없이 release가 두 번 일어날 수 있다. 310행 non-atomic int count_는 330행 단서뿐이다.
- 297~302행 측정 환경이 없다. 120 cycles × 1만 = 1.2 ms는 1 GHz 클록을 전제한다.

병합 대상: 판정은 오류 확인으로 우선 조치다(점수 구간 병합 검토 기준 기록). 겹치는 글은 `part3-10-ownership-model.md`(cycle 함정·Core Guidelines·optional 멤버)와 `part2-02-raii-patterns.md`(PoolDeleter·함수 포인터 deleter)지만 결정 트리·비교 표라는 독립 질문이 있다. 다음 조치: 304행 결론과 299~302행 표의 8배/10배 불일치를 먼저 바로잡고(측정 환경이 없으면 표를 TBD로), 346행 무링크 draft 항목을 빼고, 겹치는 코드는 2-02·3-10 링크로 줄인 뒤 보강한다.

### `part3-10-ownership-model.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), 68525f0c(코드 펜스 산문 이동), be973200(topic 메타), ac24bb76(제목 변경) 등 정리·폴리싱 커밋뿐이다. C++ 표준, C++ Core Guidelines, Microsoft GSL, FreeRTOS 같은 1차 자료와 대조한 커밋이 없다. 원문 안에서 수치·동작·API가 동시에 참일 수 없는 기술 모순은 찾지 못했다(89행 borrower 정의와 113·123행 Display 예의 용어 충돌은 분류 용어 문제라 uncertainties와 B 감점으로 둠).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | owner/observer/borrower 구분(30~96행)과 매개변수·멤버 결정 표(134~143행, 170~177행)는 C++ Core Guidelines R·F 절 권장을 옮긴 표준 목록이다. 이 글만의 것은 RTOS task 간 소유권 세 패턴(189~266행, 특히 pool+handle 218~239행)과 System/Display 예(110~130행) 정도다. 374~390행 측정은 환경·출처 없는 수치로 '100 B 추가만으로 버그가 완전히 사라집니다'(390행)라는 결론을 내 독자 분석으로 보지 않는다. 앵커 part6-09(A 10)와 같은 수준. |
| B | 10 | 문제 정의(17~28행) → 세 역할 → 결정 표 → RTOS·callback → Core Guidelines → 함정 → 정리(392~399행)로 기본 흐름은 있다. pool+handle(220~236행)은 ObjectPool 소진 시 처리와 consumer가 deallocate를 빼먹을 때의 책임을 다루지 않고, 284~286행 'Good — capture by value'는 본문이 비어 있다. 266행 '각 task는 non-owning ref만 사용'은 259~263행이 전역 g_state를 직접 읽고 복사하는 코드와 맞지 않는다. 89행은 borrower를 '함수 scope 동안만 유효'로 정의하는데 113·123행은 멤버(118행 Bus& bus_)로 보관하는 Display를 borrower라 부르고, 360~366행 함정 5는 빌린 객체 저장을 dangling 안티패턴으로 든다. 안전 조건(122~123행 선언 순서)을 설명하지 않는다. AP-C-24에 따라 B ≤ 13, 용어 충돌로 10. |
| C | 5 | 선언 수준 코드(145~166행, 179~186행, 315~321행)는 있으나 컴파일러·표준 버전·RTOS 버전 등 실행 조건이 없고 Sink·Bus·ObjectPool·LargeMessage·register_callback 정의가 없어 그대로는 빌드되지 않는 조각이다. 378~388행 측정은 모듈·보드·툴체인·stress 방법이 없는 구체 수치(4.2 KB, 3-5건/일, 1-2건/주)라 3-1 'C ≤ 8' 상한이 걸린다. 검증 절차나 합격·실패 관찰이 없어 4~7 구간. |
| D | 10 | 인접 `part3-09-smart-pointer-choice.md`(27)와 겹침: cyclic shared_ptr 함정 333~338행 = 3-09 276~281행(같은 코드·주석), raw pointer observer 51~71행 ≈ 3-09 157~178행, Core Guidelines·gsl::owner 305~323행 ≈ 3-09 180~185행, optional 멤버 173~174·183행 ≈ 3-09 241~254행. 다음 글 `part4-01-intrusive-containers.md`(29)와는 겹치지 않는다. 다른 시리즈 `beautiful-cpp/item13-never-transfer-ownership-via-raw-pointer.md` 241~249행, `autosar-cpp/chapter13-gsl-safety-types.md` 218~244행이 같은 주제지만 둘 다 draft다. weak_ptr·gsl::owner·non-owning을 쓰는 공개 글은 embedded-cpp 밖에 주제가 다른 `tools/debugging/gdb-extension/chapter03-pretty-printers.md`뿐이다. 고유 역할은 결정 표와 RTOS 소유권 절이라 10~14 하단. |
| E | 6 | 제목(2행)은 'single·shared·borrow 패턴'인데 본문 축은 Owner·Observer·Borrower(30행)이고 'shared'는 결정 표 칸(104·176행), mutex 공유 상태 절(241~266행), cycle 함정(333~338행)에 얕게만 나온다. description(5행)은 본문과 맞는다. 제목 키워드 하나의 부분 미이행이라 6~8 구간 하단. |
| F | 5 | 408~410행 다음 글 Part 4-01 Intrusive Containers는 seriesOrder 29와 맞고, 403행 part3-09·404행 part2-01도 라벨과 대상 제목이 맞다. 그러나 405행 'Refactoring Pattern 33: Change Reference to Value'는 링크 없는 관련 항목이고 대상 pattern33은 draft라 공개 URL이 없다. 루브릭 F 조항으로 5 이하. 100행 '위에서부터 차례로 답합니다' 같은 안내는 있으나 전제 지식(3-09·2-01) 명시는 없다. |
| G | 2 | 406행 C++ Core Guidelines Resource Management 1차 출처 링크가 305~323행 절과 연결되고, 141~142행에 span(C++20)·string_view(C++17) 버전 표기가 있다. Core Guidelines 판, GSL 구현(316행 &lt;gsl/pointers&gt;) 버전, FreeRTOS 버전(195~263행)이 없고 374~390행 측정은 출처·환경이 없다. 앵커 part7-05(G 2)와 같은 수준. |

uncertainties:
- 374~390행 측정(모듈 4.2 KB→4.3 KB, leak 3-5건/일, use-after-free 1-2건/주)은 모듈·보드·툴체인·stress 방법이 없어 실제 측정인지 확인할 수 없다.
- 89행 borrower 정의와 113·123행 Display, 360~366행 함정 5가 서로 맞지 않는다. 코드 자체는 122~123행 선언 순서로 안전하므로 기술 오류가 아니라 용어 충돌로 보고 B에서 감점했다.
- 284~286행 'Good — capture by value': 기본 lambda는 operator()가 const라 비-const 멤버 함수(277행 data.process(e))를 부르면 컴파일되지 않을 수 있다. C++ 표준으로 확인하지 않았다.
- 358행 'reference 멤버는 immutable이라 copy/move가 어렵습니다': 복사·이동 생성은 가능하고 대입 연산자만 암묵 삭제된다는 점과 표현이 맞는지 표준으로 확인하지 않았다.
- 366행 '저장하려면 copy하거나 shared_ptr' 권고: const Data& 매개변수에서 shared_ptr을 얻을 수 없어 시그니처 변경 전제가 빠졌는지, 3-09 109행 shared_ptr 회피 권고와 맞는지는 다른 글과의 관계라 오류로 보지 않았다.
- 323행 'gsl::owner는 static analysis 도구에 힌트를 주며, 임베디드 인증 환경에서 유용합니다'는 출처 없는 주장이다.

병합 대상: 후보는 `part3-09-smart-pointer-choice.md`(cycle 함정 333~338행, raw pointer observer 51~71행, gsl::owner 305~323행, optional 멤버 173~183행이 3-09와 겹침). '소유권 모델'은 '스마트 포인터 선택'과 독립 검색 의도가 있어 다음 조치는 보강(차별화)이다. 3-09와 겹치는 절은 3-09 링크로 줄이고, 매개변수·멤버 결정 표와 RTOS task 간 소유권(pool+handle의 소진·해제 책임)을 고유 축으로 키운다. 89행 borrower 정의와 113·123행·360~366행이 맞도록 '저장되는 non-owning 참조(observer)'와 '일시 borrow'를 구분한다. 374~390행 측정은 실제 환경 기록이 없으면 지운다.

### `part4-01-intrusive-containers.md` — 53점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 159aeabf(최초 작성), 815510c8(다이어그램·정리 폴리싱), 39149f68(번역투 폴리싱), 400892d7(린터 일괄), ac24bb76(제목 변경), fa55144d(링크 일괄 수정), be973200(topic 메타), 0a9dd7bc(slug 고정)뿐이다. list.h·Boost.Intrusive·ETL API나 측정 수치를 1차 자료와 대조했다는 커밋 본문이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 member pointer를 template 인자로 받는 IntrusiveList(99~143행), 같은 Task를 link 두 개로 두 list에 넣는 예(148~168행), priority별 TCB ready queue(292~310행)다. list_head·container_of(53~93행), Boost.Intrusive base hook(170~211행), ETL intrusive_list(238~252행)는 각 라이브러리 문서의 첫 예제 수준이다. 51행 'Linux 커널과 FreeRTOS가 전부 이 패턴', 234행 '압도적으로 유리', 404행 '결정적 동작을 보장'은 근거 없는 단정이고, std::list·etl::list가 나은 경우 같은 선택 기준이 없다. |
| B | 12 | 문제(19~33행) → Linux 방식 → C++ template → Boost → 비교 → ETL → tree·hash → RTOS·Event Pool → 함정(346~384행) → 측정(386~404행) → 정리 흐름은 끝까지 간다. description의 'tree'는 260~273행 type alias 한 블록뿐이고, hash map(277~286행)은 bucket 배열을 넘기는 코드가 없다. 72~76행 add_task는 g_pending_list 초기화 없이 75행에서 g_pending_list.next->prev를 쓴다. 동시성 함정(383~384행)은 한 문장이다. 측정 산술(392~400행)·표 229행 같은 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 6 | 386~402행 측정은 'STM32F4'(388행)만 적고 클럭·컴파일러·최적화 옵션·측정 방법이 없어 3-1 'C ≤ 8' 상한 적용. 392·398행 cycle 수와 394·400행 ms 합계는 1 MHz 클럭에서만 함께 맞는다. 354·362~363·371행은 이 글의 IntrusiveList(99~143행)에 없는 push_back·pop_front를 부르고, 322~330행은 ObjectPool::allocate()(part3-03 86~92행, 생성자 호출 없음)로 받은 메모리의 hook을 생성하지 않은 채 push_back한다. 4~7 구간. |
| D | 12 | 같은 시리즈 `part3-10-ownership-model.md`(28)은 410행에서 이 글을 다음 편으로 안내할 뿐 겹치지 않는다. `part4-02-etl-library.md`(30) 77~90행은 내부 pool형 etl::list라 이 글 238~252행 intrusive_list와 역할이 갈린다. `part3-03-pool-allocator.md` 39~55행 free list는 같은 발상이지만 allocator 관점이고, 이 글 314~344행이 그 ObjectPool을 재사용한다. 다른 시리즈 공개 글 `rtos/practical-internals/part2-01-ready-list.md` 48~55행(priority별 pxReadyTasksLists)이 이 글 292~310행 g_ready_head[MAX_PRIORITY] 예와 같은 주제를 더 자세히 다룬다. `rtos/practical-internals/part5-02-zephyr-source.md` 104~108행은 sys_dlist + CONTAINER_OF 한 조각이라 이 글 80~87행과 일부 겹친다. `programming/standards/linux-kernel/chapter07-data-structures.md` 15~33행 list_head는 draft다. intrusive container를 독립 주제로 다룬 공개 글은 이 글뿐이라 10~14 구간, ready queue 겹침으로 12. |
| E | 5 | 제목 'Intrusive Containers 분석 — 동적 할당 없는 컨테이너 설계'(2행)는 '분석'을 약속하지만 본문은 list_head·Boost·ETL 사용 예 나열이고, 분석에 해당하는 225~232행 비교표와 386~402행 측정은 출처·환경이 없다. 루브릭 E 주석('분석' 약속 + 개념 소개 수준 → 3~5)을 적용했다. description(5행)의 'tree'는 260~273행 alias 한 블록뿐이고, 258행 소제목 'Intrusive doubly linked list (RB-tree)'는 내용(bi::set)과 맞지 않는다. |
| F | 5 | 424행 다음 글 'Part 4-02: ETL 라이브러리'는 seriesOrder 30 `part4-02-etl-library.md`와 맞다. 417~419행 세 링크(part3-01, part3-03, part4-02)도 대상 제목과 맞다. 420행 'Practical RTOS Internals — RTOS scheduler'는 scheduler 글이 아니라 00-preface('실시간 커널 내부 분석 시리즈 소개')로 간다. 같은 시리즈에 part2-01-ready-list.md·part2-03-scheduler-algorithm.md가 있는데도 소개 글로 보낸다. 앵커 part1-04 167행과 같은 유형이라 F ≤ 5. |
| G | 1 | 본문에 1차 출처 링크가 없다. 55행 'Linux 커널의 list.h'는 경로·커널 버전이 없고, Boost.Intrusive(175행)·ETL(239행)도 버전·문서 링크가 없다. 측정(388행)은 보드 계열만 있고 클럭·툴체인이 없다. |

uncertainties:
- 392~400행: 1000회 × (150+80) cycle = 230,000 cycle인데 합계 '~230 ms', intrusive 20 cycle × 1000 = 20,000 cycle인데 '~20 ms'다. 둘 다 1 MHz에서만 성립하고 STM32F4 통상 클럭이면 약 1.3 ms다. 글에 클럭 표기가 없어 원문만으로 성립하는 모순으로 단정하지 않았다.
- 229행 표 'std::list Erase O(n) (iterator로)': std::list::erase(iterator)는 상수 시간으로 알고 있으나 표준 문서로 확인하지 않았다.
- 232행 'std::list 표준 C++11': std::list는 C++98부터 있는 것으로 알고 있으나 미확인.
- 72~76행: 전역 g_pending_list는 0으로 초기화되므로 75행 g_pending_list.next->prev가 null 역참조가 된다(초기화 코드 누락). 언어 의미 판단이라 fact-check 단계에서 확인.
- 322~330행: ObjectPool::allocate()는 생성자를 부르지 않으므로(part3-03 86~92행) bi::list_base_hook이 초기화되지 않은 채 push_back된다. Boost.Intrusive 문서로 확인하지 않았다.
- 51·312행 'FreeRTOS와 Zephyr 모두 이 패턴': 이 글 307~308행은 단일 next pointer LIFO인데, 공개 글 practical-internals/part2-01 48~55행·part5-02 104~108행은 doubly-linked list를 쓴다고 적는다. 다른 글과의 모순이라 FreeRTOS list.h·Zephyr dlist.h로 확인해야 한다.
- 312행 '모든 연산이 O(1)': 306~309행 단일 연결 queue에서 임의 task를 빼려면 앞 노드를 찾아야 한다. 삭제 코드가 글에 없어 판단하지 않았다.
- 381행 const list iteration에서 non-const node 변경이 가능하다는 서술은 Boost·ETL의 const_iterator 정의로 확인하지 않았다.
- 241·246행 etl::list_link&lt;0&gt;·etl::intrusive_list 템플릿 인자 형태는 ETL 헤더로 확인하지 않았다.

병합 대상: 병합 대상 없음. intrusive container를 독립 주제로 다룬 공개 글이 이 글뿐이고(linux-kernel ch07은 draft, part4-02는 비 intrusive etl::list, practical-internals part2-01은 RTOS ready list 자료구조가 주제), 독립 검색 의도가 있다. 다음 조치는 보강: 72~76행 head 초기화, 354·362·371행의 없는 push_back/pop_front, Event Pool(322~330행) hook 생성 문제를 고치고, 측정(386~402행)은 환경·방법을 갖춘 실측으로 바꾸거나 TBD로 두며, list.h·Boost.Intrusive·ETL 버전과 문서 링크를 단다. 420행 관련 링크는 practical-internals/part2-01-ready-list로 바꾸고, 292~312행은 그 글과 겹치지 않게 intrusive link 관점으로 좁힌다.

### `part4-02-etl-library.md` — 47점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), be973200(topic 메타), ac24bb76(제목 변경), 400892d7(linter 일괄), 39149f68·815510c8(Tone A 폴리싱), 159aeabf(초안)뿐이다. ETL upstream 소스나 공식 문서와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았다. 내부 모순 후보(70행 `s.size() > 64` 검사와 75행 '길이가 초과되면 잘립니다')는 size()가 capacity를 넘지 않는다는 API 의미를 알아야 판단되므로 오류 확인에 넣지 않았다. 364행 '15배'는 6.2/0.4=15.5와 맞고, 355행 '~64 B'는 int 16개와 맞다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 본문 대부분이 ETL 주요 타입을 하나씩 소개하는 API 목록이다. vector·string·list·map·queue(41~118행)는 코드 한 조각과 한 문장('내부적으로는 T storage[N]과 size만' 60행, 'RB-tree 기반이며' 105행, 'ring buffer 기반입니다' 118행)뿐이라 공식 README 수준이다. 이 글만의 부분은 STL 혼용 함정(376~381행), 큰 N의 .bss 폭증(386~391행), 장단점 표(399~408행) 정도다. 292행 '대부분의 경우 std::array로 충분합니다', 393~394행 '프로젝트의 요구에 맞게 선택합니다'는 선택 기준 없는 일반론이다. 앵커 part6-09(A 10)보다 고유 예제가 적어 9. |
| B | 10 | 문제 정의(17~19행) → 컨테이너(39~118행) → delegate·observer·fsm·message_router(120~280행) → 설정 매크로(307~323행) → 에러 처리(325~346행) → 측정(348~364행) → 함정(366~397행) → 정리(410~417행)로 흐름은 끝까지 간다. 하지만 327행 '예외 또는 abort를 선택', 330행 '예외 모드 (기본)', 338행 '그냥 *무시* 또는 ETL_ASSERT trigger', 384행 '-fno-exceptions 환경에서는 abort'가 실패 시 실제 동작을 하나로 정하지 않는다. 289행 '.at() 동작이 차이'는 차이를 말하지 않고, 15행이 약속한 factory는 본문에 없다. 반복자 무효화, ISR·멀티태스크 동기화도 빠졌다. AP-C-24에 따라 13 이하, 한계 누락으로 10. |
| C | 6 | 159행 alarm(), 166행 read_temperature(), 214·227행 log(), 263·267행 log_temp()·log_pressure(), 145~146행 add_function·Class가 정의되지 않았고, 82·97행 Order와 84행 o도 선언이 없다. 측정 절(350~362행)은 'STM32F4'만 적고 컴파일러·최적화 옵션·링크 방법이 없으며 .text 6.2 KB / 0.4 KB 수치에 출처가 없다. 3-1 'C ≤ 8'을 적용했고 실행 조건·예상 결과가 부족해 4~7 구간의 6. |
| D | 9 | 비교한 글: 같은 시리즈 `part4-01-intrusive-containers.md`(29), `part4-03-lock-free-basics.md`(31), `part3-01-no-dynamic-alloc.md`(19), `part4-06-state-machine.md`(34), 다른 시리즈 `rtos/practical-internals/part4-13-cpp-in-rtos.md`. 이 글 41~75·92~103행의 vector·string·map 예제가 part3-01 ETL 절(약 64~88행)과 거의 같다. 120~140행 etl::delegate가 part3-01 280~301행과 같다. 350~364행 측정(6.2 KB vs 0.4 KB)이 part3-01 388~391행 수치와 같다. 179~246행 etl::fsm 예제가 part4-06 197~240행과 뼈대가 같다. RTOS part4-13 226~250행은 ETL을 짧게 소개하고 250행에서 이 글로 넘긴다. part4-01·part4-03은 겹침이 작다. 예제·측정·FSM이 반복돼 5~9 구간 상단. |
| E | 5 | 제목 'ETL 라이브러리 분석 — Embedded Template Library의 STL 대체'(2행)가 '분석'을 약속하지만 본문은 타입별 API 소개(39~305행)이고 설계·내부 구현 설명은 60·90·105·118·140행의 한 문장씩뿐이다. 루브릭 E 주석('분석' + 개념 소개 수준 → 3~5) 적용. description(5행)의 'fsm, message router'는 179~280행에서 다룬다. 15행 한 줄 요약의 factory는 본문에 없다. |
| F | 6 | 428행 다음 글 'Part 4-03: Lock-free 기초'는 seriesOrder 31 `part4-03-lock-free-basics.md`와 맞다. 421행 part3-01(19), 422행 part4-01(29), 423행 part4-06(34, 197행 이후 etl::fsm 절)은 라벨과 내용이 맞고 248행 본문 링크도 4-06으로 맞게 간다. 전제 지식 안내가 없고 H2 뼈대가 시리즈 공통 템플릿이라 7점 이상은 주지 않았다. |
| G | 2 | 출처는 etlcpp.com 홈 링크(37·424행) 하나다. ETL 버전, 대상 C++ 표준, 컴파일러가 없다. 313~317행 설정 매크로, 336행 ETL_NO_EXCEPTIONS, 384행 기본 예외 동작 같은 구체 주장에 ETL 문서·소스 위치를 연결하지 않았다. 측정(350행)도 툴체인·옵션 표기가 없다. |

uncertainties:
- 330행 '예외 모드 (기본)', 384행 'ETL은 기본적으로 exception을 던집니다': ETL은 ETL_THROW_EXCEPTIONS를 정의해야 예외를 던진다고 기억하나 upstream으로 확인하지 않았다. RTOS part4-13 230행은 ETL을 'no exception' 컨테이너로 설명한다(다른 글과의 모순이라 오류 확인에 넣지 않음).
- 336·384·415행 ETL_NO_EXCEPTIONS, 313~317행 ETL_NO_LARGE_CHAR_SUPPORT·ETL_LOG_ERRORS·ETL_VERBOSE_ERRORS·ETL_DEBUG_COUNT의 존재와 의미를 ETL 소스로 확인하지 않았다.
- 70행 `if (s.size() > 64) { /* truncated */ }`: 67행 capacity 64와 75행을 함께 보면 이 조건은 참이 될 수 없어 잘림 검사로 동작하지 않을 것으로 보인다. API 의미가 필요해 오류 확인에 넣지 않았다(is_truncated() 존재도 미확인).
- 140행 'delegate 크기는 object와 method 두 pointer'와 part3-01 301행 '고정 크기 internal storage' 설명의 차이, 142행 'lambda도 받을 수 있습니다'인데 예제(145~146행)에 lambda가 없다.
- 255~256·276~277행 `struct TempMessage : etl::message<1> { float celsius; }`를 `TempMessage{25.0f}`로 초기화: 기반 클래스가 있는 aggregate라 C++17에서 `{{}, 25.0f}`가 필요할 수 있다. 미확인.
- 199~203행 StateId에 error가 있고 191행 events::error도 정의했지만 236행 states 배열은 두 개뿐이다. etl::fsm의 state id·배열 인덱스 대응을 확인하지 않았다.
- 350~364행 측정 수치(6.2 KB / 0.4 KB)가 part3-01 388~391행의 100원소·newlib-nano·-Os 예제 수치와 같은데, 이 글은 16원소 예제다. 측정 환경·출처 없음.
- 15행 'factory도 함께 제공'은 본문에서 다루지 않는다. 404행 '인증 친화 (MISRA 가까움)', 'C++11/14 위주 (C++20 일부)', 408행 'Active maintenance'는 출처 없는 평가다.

병합 대상: 병합 대상 없음. 시리즈 안에서 ETL 전용 글이고 RTOS part4-13(250행)과 part3-01(관련 항목)·part4-06(197행 부근)이 이 글을 ETL 상세 글로 가리키므로 독립 검색 의도가 있다. 다음 조치는 보강이다. ETL upstream 소스로 예외·assert 기본 동작(327·330·338·384행)과 설정 매크로(313~317행)를 대조해 정확히 쓰고, 측정 절(350~364행)은 툴체인·옵션을 갖춘 재현 절차로 바꾸거나 근거가 없으면 지운다. part3-01과 겹치는 컨테이너·delegate·측정 예제는 어느 쪽에 둘지 시리즈 단위로 정한다.

### `part4-03-lock-free-basics.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 159aeabf(최초 작성), 815510c8·862fa1b8(TikZ 다이어그램), 39149f68(번역투 폴리싱), 400892d7(린터 일괄), ac24bb76(제목 변경), fa55144d(링크 수리), be973200(topic 메타데이터), 0a9dd7bc(slug 고정)뿐이다. C++ 표준, ARMv6-M/ARMv7-M ARM, 컴파일러 문서와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고, 동시에 참일 수 없는 두 구체 진술은 확정하지 못했다(65행 vs 260·263행은 'atomic'의 범위 해석에 달림, 260행 vs 305행도 해석 문제).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | std::atomic 기본(48~63행), CAS push(75~85행), ABA 해결책 세 줄 나열(111~113행), memory order 표(130~136행)는 C++ 동시성 입문 자료의 표준 목록이다. 이 글만의 것은 SysTick 카운터에 relaxed를 쓰는 ISR 예(142~152행), __disable_irq와 CAS 루프를 나란히 둔 V1/V2 비교(235~256행), Cortex-M0/M0+ 한계 절(258~274행) 정도다. 256행 'V2가 더 deterministic', 138행 'acquire/release로 seq_cst보다 빠르게', 231행 'SPSC로 충분한 경우가 대부분'은 근거 없는 단정이고, 308행 '반드시 측정합니다'는 기준 없는 완곡 표현이다. 앵커 part6-09(A 10)와 같은 수준. |
| B | 11 | 문제(19~26행) → atomic(46~67행) → CAS(69~94행) → ABA(96~115행) → memory order(117~138행) → ISR 카운터(140~154행) → SPSC(156~219행) → MPMC(221~231행) → M0 한계(258~274행) → 함정(276~308행) → 측정(310~321행) → 정리(323~330행)까지 흐름은 끝까지 간다. 111행 tagged pointer를 '64-bit으로' 묶는다고만 하고 32-bit Cortex-M에서 그 CAS를 어떻게 하는지 없고, 288~295행 함정 3의 대안이 fetch_add뿐이며, 297~302행 is_lock_free 확인 방법이 없다. 정확성 불확실이 열려 있어 13을 넘기지 않는다. |
| C | 6 | 컴파일 가능한 형태의 코드(142~152행 SysTick, 160~195행 SpscQueue, 203~217행 UART ISR)는 있으나 컴파일러·표준 버전·대상 MCU·실행 결과가 없다. 312~319행 측정 블록은 'Cortex-M4'만 적고 클록·FreeRTOS 버전·측정 방법 없이 ~600/~30/~15/~5 cycles를 제시한다(3-1 C ≤ 8). 321행 결론이 이 수치에 기대고, 308행은 절차가 없다. 28~41행은 같은 블록에 counter·increment를 두 번 정의해 그대로는 컴파일되지 않는다. 앵커 part1-04(C 6)와 같은 구간. |
| D | 7 | 같은 시리즈 `part4-04-lock-free-container.md`(32)가 이 글 160~195행 SpscQueue를 38행 이후에 다시 싣고(36행 '4-03에서 본 코드를 다시 옮기면'), ABA 설명·해결책(96~115행 vs 4-04 137~142행, '64-bit으로 묶는다'는 표현까지 같음), 함정 '큰 객체에 atomic'(297~302행 vs 4-04 334~339행)·'seq_cst 남용'(278~283행 vs 4-04 331~332행)·'ABA 무시'(285~286행 vs 4-04 341~342행), M0 미지원 정리(329행 vs 4-04 406행), MPMC 라이브러리(221~231행 vs 4-04 220~256행)가 겹친다. `part3-03-pool-allocator.md` 260행 이후 atomic free list가 75~85행 CAS push와 같은 패턴. 다른 시리즈 `performance-engineering/part4-07-lock-free.md`(CAS 34행·ABA 110행·Tagged/Hazard/Epoch 125·142·170행·SPSC 194행·MPMC 224행), `modern-recipes/part9-01-lock-free-ring.md`(17~51행 SPSC ring·65행 Memory Order·85행 Cortex-M single core), part9-05·part9-08도 같은 주제다. 'std::atomic API 입문' 역할은 남지만 5~9 구간. |
| E | 7 | 제목(2행)의 atomic·memory ordering·CAS를 46~67행, 117~138행, 69~94행이 다루고, description(5행)의 'ISR-safe 패턴'은 140~154행·201~219행이 답한다. memory ordering 절은 코드 한 블록·표 하나·한 문장(138행)뿐이라 키워드 하나를 얇게 다룬 부분 미이행으로 6~8 안에서 감점. 대상 독자·전제 지식이 명시되지 않아 9 이상은 아니다. |
| F | 6 | 341행 다음 글 'Part 4-04: Lock-free Container'는 seriesOrder 32 `part4-04-lock-free-container.md`와 맞고, 'queue와 stack, SPSC·MPMC 차이' 설명도 4-04 내용과 맞는다. 334행 4-04, 335행 Part 3-03 'atomic free list'(part3-03 260행), 336행 'Practical RTOS Internals'(시리즈명 라벨로 00-preface)는 맞다. 337행 CppCon 항목은 YouTube 검색 URL이라 특정 자료가 아니다. 전제 지식 안내가 없고 H2 구성(13·17·276·310·323·332·339행)은 시리즈 템플릿이라 7 이상 근거가 없다. |
| G | 1 | 본문에 1차 출처가 없다. LDREX/STREX(44·67·260행), M0/M0+ 미지원(260~263행)에 ARMv7-M/ARMv6-M Architecture Reference Manual 인용이 없고, memory order 표(130~136행)에 C++ 표준 조항이나 cppreference 링크가 없다. C++ 표준·컴파일러·Boost(227~228행)·FreeRTOS(315행) 버전 표기도 없다. 337행은 검색 결과 URL이라 세지 않는다. |

uncertainties:
- 65행 'ARM Cortex-M에서 4-byte … load/store가 자연스럽게 atomic'과 260·263·329행 'Cortex-M0/M0+는 atomic이 없으므로 critical section만'이 충돌하는지: M0에서도 정렬된 word load/store가 single-copy atomic이라면 263행은 RMW 연산에만 맞는 말이다. ARMv6-M ARM으로 확인하지 않았다.
- 260행 'M0/M0+는 atomic operation을 쓸 수 없습니다'와 305행 'runtime fallback이나 컴파일 에러가 발생'의 관계: GCC가 __atomic_* 라이브러리 호출로 바꾸는지 컴파일러 문서로 확인하지 않았다.
- 111행 tagged pointer를 64-bit으로 묶는 방식이 32-bit Cortex-M에서 가능한지, 302행 '4 byte 이하로 만들라'와 어떻게 양립하는지 미확인.
- 256행 'V2가 더 deterministic'은 94·308행 'contention이 높으면 starvation·retry가 길어짐'과 방향이 다르다. ISR 대 main 단일 코어에서 retry 횟수 상한 근거가 없다.
- 312~319행 cycles 수치(Mutex ~600, critical section ~30, fetch_add ~15, plain ++ ~5)의 측정 환경·출처 없음.
- 24행 '대부분의 RTOS에서 ISR은 mutex를 쓸 수 없습니다', 231행 'SPSC로 충분한 경우가 대부분', 138행 'acquire/release로 seq_cst보다 빠르게'는 출처 없는 일반화.
- 223행 'Concurrent Data Structures'가 어떤 라이브러리를 가리키는지 불명확.

병합 대상: 후보는 `part4-04-lock-free-container.md`(SPSC 절 156~219행, MPMC 절 221~231행, 함정 1·2·4번이 4-04와 반복). 'std::atomic·memory order·CAS 입문'이라는 독립 검색 의도가 있어 다음 조치는 보강이다. 글 전체를 합치지 말고 SPSC 구현은 4-04로 넘기고, 이 글은 memory order 절(117~138행)과 Cortex-M0 한계(258~274행)를 1차 자료(ARMv6-M/ARMv7-M ARM, C++ 표준) 근거로 차별화한다. 312~319행 측정 수치는 출처·환경을 찾지 못하면 지우거나 TBD로 둔다.

### `part4-04-lock-free-container.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1, 코드 주석 vs 산문). 258행 H2 '임베디드 — ISR + 여러 task'와 261행 코드 주석 'ISR가 producer, 여러 task가 consumer'는 `SpscQueue<Event, 256>`(263행) 하나를 여러 consumer task가 `wait()`(277~284행)로 함께 pop하는 설계라고 적는다. 같은 글 324행 'SPSC가 가장 빠르지만 producer와 consumer가 정확히 하나씩일 때만 쓸 수 있습니다', 328~329행 함정 'SPSC를 MPMC처럼 사용', 402행 'Consumer는 tail만 다루므로 … CAS가 필요 없습니다'와 동시에 참일 수 없고, 바로 아래 288행 'SPSC queue로 ISR에서 단일 task로 전달합니다'와도 어긋난다. git log(0a9dd7bc URL 고정, be973200 topic 메타데이터, fa55144d 링크 일괄 수정, ac24bb76 제목 변경, 400892d7 린터, 39149f68 번역투 폴리싱 등)에 1차 자료 대조 커밋은 없어, 이 모순이 없더라도 미검증이다. 점수 구간은 병합 검토이고 판정은 우선 조치다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | SPSC ring(38~68행)은 36행이 밝히듯 4-03 코드를 다시 옮긴 것이고, false sharing(77~93행)·Treiber stack(95~142행)·tagged pointer(144~164행)·Boost/moodycamel 소개(220~256행)는 lock-free 입문 자료의 표준 목록이다. 고유한 부분은 FreeRTOS 세마포어를 붙인 EventBus(260~286행), 3-03 pool의 lock-free 판(170~216행), 실용 한계 목록(379~397행) 정도다. 218행 'ABA 문제가 발생할 수 있으므로 주의가 필요합니다', 241행 '일부 헤더만 포함할 수 있습니다'는 완곡 표현이라 일반론으로 봤다. 앵커 part1-04(A 10)와 같은 수준. |
| B | 10 | 문제(17~28행) → SPSC·stack·pool 구현 → 라이브러리 → 임베디드 예 → 측정 → 함정 → LDREX/STREX → 정리 흐름은 완성됐다. 그러나 hazard pointer(142행)는 이름뿐이고, 32-bit packing(158~162행)은 구조체 선언뿐이며 tag 갱신 코드가 없고, LockFreePool의 ABA(218행)는 해결 없이 끝난다. 258~288행 모순이 열려 있어 AP-C-24에 따라 B ≤ 13이고, 약속만 하고 풀지 않은 세 곳을 반영해 10. |
| C | 6 | 컴파일 가능한 형태의 코드(38~68, 99~132, 170~216, 260~309행)는 있지만 실행 조건·예상 결과가 없다. 313~322행 측정 표는 'Cortex-M4, 1M operations'만 적고 컴파일러·클럭·contention 조건·측정 방법·출처가 없어 3-1 'C ≤ 8'을 적용했다. 단일 코어 M4에서 MPMC 라이브러리를 어떻게 돌렸는지도 알 수 없다. 256행 '수십만 ops/sec'도 환경 없는 수치다. 4~7 구간. |
| D | 7 | 같은 시리즈 `part4-03-lock-free-basics.md`와 반복이 크다: SPSC 코드 38~68행 ↔ 4-03 161~194행(alignas만 추가), ABA·해결책 137~142행 ↔ 4-03 96~113행, Boost MPMC 224~237행 ↔ 4-03 221~229행, 큰 객체 atomic 함정 334~339행 ↔ 4-03 297~302행, Cortex-M0 389·406행 ↔ 4-03 258~274·329행, 정리 401·404~406행 ↔ 4-03 328~330행. 다음 글 `part4-05-type-safe-flags.md`와는 겹침 없음. 다른 시리즈 `performance-engineering/part4-07-lock-free.md`(Stack 79행·ABA 110행·Tagged Pointer 125행·alignas SPSC 194~200행)가 이 글 95~164행·38~68행을 더 깊게 다루고, `modern-recipes/part9-01-lock-free-ring.md`(17~53행), `part9-10-mpmc-queue.md`(SPSC 비교 110행, boost 157행, moodycamel 170~175행)가 220~256행과 겹친다. 이 글만의 역할은 EventBus·LockFreePool 정도라 5~9 구간. |
| E | 7 | 제목 'Lock-free Container 구현 — SPSC Queue·Ring Buffer'의 두 키워드와 description(5행 'SPSC queue, MPMC stack, ring buffer')은 SPSC ring(30~75행)·Treiber stack(95~142행)으로 이행된다. 다만 258행 H2 'ISR + 여러 task'는 288행이 실제로 하지 않는 설계를 약속하고, '구현'이라는 제목에 비해 MPMC queue는 라이브러리 소개(220~256행)로 넘긴다. 대상 독자(Cortex-M vs Cortex-A multi-core)가 93·156·256·373행에 섞여 9점 이상은 아니다. |
| F | 7 | 19행이 전제 글(4-03)을 직접 밝히고, 36·168행 본문 링크가 실제 대상(part4-03, part3-03)과 맞다. 417행 다음 글 4-05 Type-safe Flags는 seriesOrder 33과 일치한다. 관련 항목 410~413행 네 개(4-03, 3-03, 4-01, 'Practical RTOS Internals' 시리즈명 라벨 → 00-preface)는 라벨과 제목이 맞다. audit:reading·폰 폭 렌더 확인은 하지 않아 9점 이상은 아니다. |
| G | 1 | 본문에 1차 출처 링크가 없다. Boost.Lockfree(222~239행)와 moodycamel(243~256행)은 버전·저장소 링크 없이 이름만 있고, LDREX/STREX·exclusive monitor 설명(358~375행)과 156행 'Cortex-M에서 64-bit atomic 불가'에 ARMv7-M Architecture Reference Manual 인용이 없다. 측정 표(315~322행)에 환경·도구 표기도 없다. |

uncertainties:
- 258~288행: 288행이 저자 의도를 바로잡은 것으로도 읽힌다. 오류 확인은 H2(258행)·코드 주석(261행)과 324·329·402행, 그리고 288행 자체의 충돌을 근거로 했다.
- 141행 'Tagged pointer — 64-bit으로 ptr과 counter를 묶습니다'와 153행 '16 byte atomic on 64-bit'은 32-bit 대상과 64-bit 대상을 섞은 설명이다.
- 156행 'Cortex-M(32-bit)에서는 64-bit atomic이 불가능', 389·406행 'Cortex-M0/M0+ atomic 미지원', 373행 'DMA 같은 다른 master가 접근하면 STREX가 실패', 375행 peripheral 주소 exclusive monitor 미지원은 ARMv6-M/ARMv7-M ARM으로 확인하지 않았다.
- 160행 PackedPtr '16-bit ptr + 16-bit tag'가 Cortex-M 주소 공간에서 실용적인지 미확인.
- 313~322행 측정값(1M ops에 mutex queue ~10M cycles = op당 약 10 cycles, SPSC ~1.2 cycles/op)은 4-03 315행 'Mutex (FreeRTOS) ~600 cycles'와 규모가 맞지 않는다(다른 글과의 모순이라 오류 확인에 넣지 않음). 단일 코어 Cortex-M4에서 MPMC를 측정한 조건도 불명.
- 256행 moodycamel '수십만 ops/sec'는 321행 처리량과 자릿수가 다를 수 있으나 클럭이 없어 산술로 확정하지 못했다. 245행 '가장 빠른 MPMC 구현'도 출처 없는 비교 주장이다.
- 120~131행 Treiber pop이 노드 회수 보호 없이 `old_top->next`를 읽는 것, 173~176행 union Slot에 `std::atomic<Slot*>` 멤버를 두고 `Slot slots_[N]`을 기본 생성하는 것이 C++ 표준 판에 따라 컴파일되는지는 언어 규칙 문제라 확인하지 않았다.
- 336행 'hardware atomic 안 됨 → mutex fallback', 241행 'Boost 일부 헤더만 포함'은 구현·라이브러리 의존 동작으로 1차 자료 확인 안 함.
- 402행 '서로 무관하며'는 74행 '서로의 변수는 acquire로 읽고'와 표현이 어긋나지만 산문 표현 차이로 보고 오류에 넣지 않았다.

병합 대상: 판정은 오류 확인으로 우선 조치이고 점수 구간은 병합 검토다. 후보는 `part4-03-lock-free-basics.md`(SPSC 코드·ABA·Boost·Cortex-M0 내용이 이미 있음). 다음 조치: 먼저 258~288행 SPSC 다중 consumer 모순을 바로잡고, 4-03과 역할을 나눌 수 있으면(4-04 = Treiber/tagged pointer/LockFreePool/EventBus 구현 전용, SPSC 재수록 38~68행 삭제) 보강, 나눌 수 없으면 4-03으로 병합. performance-engineering/part4-07, modern-recipes/part9-01·9-10은 시리즈가 달라 병합 대상이 아니라 차별화 비교 대상이다.

### `part4-05-type-safe-flags.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건(루브릭 3-1). (1) 98~101행 has_flag(a, b)는 (a & b) == b로, b의 비트가 모두 켜졌을 때만 true다. 239행 AnyError = Overrun\|NoiseDetected\|FramingError\|ParityError(0b11110)를 255행 has_flag(status, UartStatus::AnyError)에 넘기면 Overrun만 켜진 status(0b00010)는 0b00010 & 0b11110 = 0b00010 ≠ 0b11110이라 false다. 이름 AnyError와 256행 log_error("UART error")가 뜻하는 '오류가 하나라도 있으면'과 달리 네 오류가 동시에 켜져야 분기한다. (2) 212행 `reg &= ~(0b111 << (pin * 2))`는 핀당 간격을 2비트(pin*2, 217행도 같음)로 두면서 3비트 마스크를 지운다. 224행 pin 5면 비트 10~12를 지우는데, 같은 글의 간격으로는 비트 12가 pin 6 필드(12~13)다. 202행 AnalogMode=0b111도 213행에서 2비트 간격에 3비트 값을 써 다음 핀 필드를 침범한다. git 이력(304eb61b 작성, 815510c8·39149f68 문체 폴리싱, 400892d7 linter, ac24bb76 제목 변경, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋은 없다. 점수 구간은 병합 검토이고 판정은 우선 조치다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | enum class + operator\| 정의(38~54행), 연산자 묶음(60~102행), trait+concept 자동화(128~161행), 매크로 버전(167~187행)은 bitmask enum 관용구로 흔히 소개되는 내용이다. 이 글만의 것은 GPIO 설정 enum(196~224행)과 UART 상태 enum(232~259행)인데 두 예 모두 factcheck의 결함이 있다. 선택 기준은 189행 '매크로는 C++17 이전, C++20 이상은 template' 한 문장, 327행 '약간 무겁습니다'뿐이다. 앵커 part6-09(A 10)와 같은 수준. |
| B | 10 | 문제(19~56행) → 기본 패턴(60~104행) → 사용 예 → 자동화(122~189행) → 임베디드 예(191~262행) → to_string → Flags&lt;E&gt; wrapper(293~327행) → 함정(329~371행) → 측정 → 정리 흐름은 끝까지 간다. 그러나 has_flag는 98행에서 Flag 전용으로만 정의됐는데 216·219·252·255·282행은 GpioConfig·UartStatus에 쓰고, 템플릿 절(151행)과 매크로 절(183행)은 has_flag를 일반화하지 않는다. 제목의 'Strong Typedef·Tag' 중 Tag는 절이 없다. 370행 함정 제목은 327행 '약간 무겁습니다'와 엇갈리는데 371행 본문은 wrapper가 아닌 enum class를 말한다. AP-C-24에 따라 B ≤ 13. |
| C | 4 | 코드는 많지만 컴파일 환경·실행 결과가 없다. 383~391행 어셈블리 비교는 컴파일러·옵션·타깃 없는 구체 결과라 3-1 'C ≤ 8' 상한에 걸리고, 371·393·401행 zero-cost도 이 근거 하나에 기댄다. 210~222행 GPIO 예는 212·213행에서 2비트 간격에 3비트 마스크·값을 써 다음 핀 필드를 건드리고, 255행 AnyError 분기는 단일 오류에서 실행되지 않는다. 322행 p \|= Permission::Write는 Flags&lt;E&gt;(299~317행)에 operator\|=가 없다. 레지스터 예 두 개가 모두 결함이라 앵커 part6-09(C 4)와 같은 수준. |
| D | 12 | 인접 `part4-04-lock-free-container.md`(SPSC·Treiber stack)와 `part4-06-state-machine.md`(52행 enum+switch, 104행 variant, 197행 etl::fsm)는 주제가 달라 겹치지 않는다. 같은 시리즈 `part5-01-register-abstraction.md` 154~170행이 enum class GpioMode(Output=0b01, clear_mask 0b11u &lt;&lt; Pin*2)로 MODER 필드를 type-safe하게 쓰는데, 이 글 196~222행 GpioConfig→MODER 예와 같은 질문을 다루고 마스크 폭이 다르다. 다른 시리즈 `beautiful-cpp/item20-prefer-enum-class.md`, `effective-modern-cpp/item10-prefer-scoped-enums-to-unscoped-enums.md`는 둘 다 draft라 공개 글 중복은 없다. bit flag 연산자 자동화라는 핵심 질문은 이 글에만 있다. |
| E | 5 | 제목(2행) 'Enum Class·Strong Typedef·Tag' 중 enum class만 본문 전체가 다룬다. Strong typedef는 293행 'Strongly-typed Flags&lt;E&gt;'·370행 함정 제목에서 wrapper 이름으로만 비슷하게 나오고 strong typedef 자체(단일 값 래핑)는 다루지 않는다. Tag(tag type·tag dispatch)는 본문에 한 번도 없다(grep 확인). 키워드 일부가 빠져 3~5 구간. description(5행 'enum class + bit operators')은 본문과 맞는다. |
| F | 5 | 411행 다음 글 part4-06-state-machine은 seriesOrder 34이고 라벨이 그 글 52·104행 절과 맞다. 관련 항목 405행 part2-09-type-traits, 406행 part5-01-register-abstraction, 407행 part5-02-gpio-abstraction 모두 라벨과 맞다. 다만 이들은 시리즈 템플릿 요소이고 407행은 설명이 없다. 같은 질문을 다루는 part5-01 154~170행으로 본문(191~227행)에서 안내하지 않고 전제 지식 안내도 없다. 앵커 part1-04(F 5)와 같은 수준. |
| G | 1 | 본문에 1차 출처 링크가 없다. C++20 concept(126행), 291행 'C++20 이후 reflection'을 표준 문서·제안서 번호 없이 적었고, 383~391행 어셈블리는 컴파일러·버전·옵션이 없다. 196~259행 레지스터 예는 대상 MCU·reference manual 판이 없다. |

uncertainties:
- 196~205·213행: GpioConfig 값(InputPullUp=0b001, Output=0b011, AnalogMode=0b111)이 STM32 MODER 2비트 인코딩(00 입력, 01 출력, 10 AF, 11 아날로그)과 맞지 않아 보인다. 224행 Output은 MODER에 0b11을 써 아날로그 모드가 될 수 있다. reference manual로 확인하지 않았다(겹침 산술은 factcheck에 올림).
- 216·219·252·255·282행: has_flag는 98행에서 Flag 전용으로만 정의돼 GpioConfig·UartStatus 인자로는 컴파일되지 않을 것으로 보인다(언어 규칙 판단이라 uncertainties).
- 322행: Flags&lt;E&gt;(299~317행)에 operator\|=가 없어 p \|= Permission::Write는 컴파일되지 않을 것으로 보인다. 320행 Permission이 154·185행 정의 중 어느 것인지도 불분명하다.
- 53행 'ERROR — type mismatch': 46~49행에 operator\|=가 없으므로 실제 오류 원인은 타입 불일치가 아니라 연산자 부재일 수 있다.
- 246행: USART2->SR는 F1/F4 계열 레지스터 이름이고 비트 배치(PE=0, FE=1, NE=2, ORE=3, RXNE=5로 기억)가 232~238행 enum과 다를 수 있다. reference manual로 확인하지 않았다.
- 291행 'C++20 이후 reflection이 추가되면': 정적 reflection 표준 채택 시점을 1차 자료로 확인하지 않았다.
- 349행 'enum class Flag { A = 1 << 30 }; // int 가정 — 32-bit 한계': 1<<30은 int 범위 안이라 주장하는 함정이 무엇인지 불분명하다.
- 383~391행 어셈블리 결과는 컴파일러·옵션 없이 제시돼 재현 여부 미확인.

병합 대상: 판정은 오류 확인으로 우선 조치이고 점수 구간 기준으로는 병합 대상 없음. bit flag 연산자 자동화는 시리즈 안에서 이 글만 다룬다(part5-01은 레지스터 필드 추상화가 주제). 다음 조치는 보강: 255행 AnyError 검사를 '비트 하나라도'(any) 함수로 바꾸고 has_flag를 템플릿화, 196~222행 MODER 예를 2비트 필드(part5-01 154~170행과 같은 0b11 마스크)로 고치거나 삭제, 제목에서 Strong Typedef·Tag를 빼거나 절 추가, 어셈블리 비교에 컴파일러·옵션을 적는다. 내부 모순 수정이 먼저다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **출처·환경 없는 '측정' 절 (10편 전부).** 컴파일러·클럭·옵션·측정 방법 없이 KB·cycles·ms를 적는다: 3-06 425~445행, 3-07 302~321행, 3-08 368~382행, 3-09 297~302행, 3-10 374~390행, 4-01 386~402행, 4-02 350~362행, 4-03 312~319행, 4-04 313~322행, 4-05 383~391행(어셈블리). 10편 모두 C ≤ 8 상한이 걸려 C가 4~6이다. 같은 비교가 글마다 다른 수치로 나온다(3-06 18 B vs 3-07 sizeof 8, 3-08 vs part1-02 395행·part3-05 371~380행의 RTTI/예외 크기, 4-03 ~600 cycles vs 4-04 op당 약 10 cycles, 4-02 350~364행 = part3-01 388~391행 다른 원소 수). 실측 근거가 없으면 지우거나 TBD로 두는 시리즈 단위 결정이 필요하다.
- **본문 1차 출처·버전 표기 부재 (10편 전부, G 1~2).** C++ 표준 조항·cppreference·ARM ARM·라이브러리 저장소와 버전이 본문 주장 옆에 없다. 출처가 있는 글도 3-07(Rust 문서·TartanLlama URL), 3-10(406행 Core Guidelines), 4-02(etlcpp.com 홈)뿐이다. 4-03 337행은 YouTube 검색 URL이다. ETL·tl::expected·Boost 같은 라이브러리 API를 인용하지만 `data/upstream-tracking.yaml` 등록 여부를 확인해야 한다.
- **1차 자료 대조 커밋 없음 (10편 전부).** git 이력이 작성·폴리싱·린터 일괄(400892d7)·제목 일괄(ac24bb76)·메타데이터(be973200, 0a9dd7bc)뿐이라 7편은 미검증, 3편은 내부 모순으로 오류 확인이다. 이 시리즈는 아직 published fact-check round를 거치지 않은 것으로 보인다.
- **시리즈 공통 H2 뼈대 (10편 전부).** '한 줄 요약 → 어떤 문제를 푸는가 → … → 자주 보는 함정과 안티패턴 → 측정 → 정리 → 관련 항목 → 다음 글'이 같은 순서다(예: 3-06 13·17·381·421·449·458·465행, 3-08 13·17·336·366·386·394·401행, 3-09 13·17·256·293·332·340·348행, 4-03 13·17·276·310·323·332·339행, 4-05 13·17·329·373·395·403·409행). embedded-cpp 41편 중 '## 어떤 문제를 푸는가'가 40편, '## 측정'이 39편이다. 각 글에 고유 절이 있어 P0는 아니지만 루브릭 9절 scaled content 수치 기록 대상이다.
- **제목 '분석'·키워드와 본문 범위 불일치 (5편, E 4~5).** ac24bb76 제목 일괄 변경 뒤 3-06(errno·optional 비교 미이행), 3-07('분석' + API 소개), 4-01('분석' + 사용 예 나열), 4-02('분석' + API 목록), 4-05(Strong Typedef·Tag 미이행)가 E 3~5 구간에 걸렸다. 같은 커밋으로 바뀐 이 시리즈 다른 글도 제목·본문 대조가 필요하다.
- **관련 항목 링크 문제로 F ≤ 5 (4편).** 링크 없는 draft 'Refactoring Pattern N' 항목: 3-06 463행(pattern40), 3-09 346행(pattern33), 3-10 405행(pattern33). 주제 라벨이 시리즈 소개로 가는 링크: 4-01 420행('RTOS scheduler' → practical-internals/00-preface, fa55144d 일괄 치환 유형). 3-08 399행 'GoF 23: Visitor'도 링크 없는 draft 항목이다(F 7은 다른 근거로 유지).
- **인접 글 사이 예제·함정 반복 (D 7~10, 7편).** 3-05·3-06·3-07의 and_then 체인·에러 래핑·반환 형태 비교(3-06 132~172행·425~447행, 3-07 113~214행·298~323행), 3-09·3-10의 cycle 함정·Core Guidelines·optional 멤버(3-09 276~281행 = 3-10 333~338행), 3-09·part2-02의 PoolDeleter(3-09 67~84행 = 2-02 198~214행), 4-03·4-04의 SPSC 코드·ABA·함정·M0 정리(4-04 38~68·137~142·334~339·406행 ↔ 4-03 161~194·96~113·297~302·329행), 4-02·part3-01·part4-06의 ETL 예제·측정·FSM. 정본을 한 곳에 두고 나머지는 링크로 줄이는 역할 재분배가 필요하다.
- **그대로 컴파일되지 않는 코드 조각 (7편 이상).** 미정의 식별자·중복 정의·없는 멤버 함수: 3-06 372·169행, 3-07 60·64·120~132행, 3-08 81~91·303~308행, 4-01 354·362·371행, 4-02 145~166·214~267행, 4-03 28~41행, 4-05 216·255·322행. C 감점 공통 원인이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 3편부터: 3-09 304행 '10배'와 299~302행 표(8배)의 불일치, 4-04 258~288행 SPSC 다중 consumer 모순(261행 주석·H2 vs 288·324·329·402행), 4-05 255행 AnyError 분기와 212~213행 3비트 마스크·값을 2비트 간격에 쓰는 산술을 바로잡는다. 측정 근거가 없는 표는 TBD로 둔다.
- 이 시리즈를 published fact-check round 대상으로 올려 C++ 표준·cppreference·libstdc++/libc++·ETL·Boost·ARM ARM으로 장마다 대조하고 출처를 적은 커밋을 남기는 방안을 검토한다. 7편 미검증과 uncertainties의 기억 기반 의심(3-08 289·361행, 4-02 330·384행, 4-03 65·260행 등)이 이 단계에서 정해진다.
- F 감점 원인인 관련 항목(3-06 463행, 3-09 346행, 3-10 405행의 링크 없는 draft 항목, 4-01 420행 00-preface 링크)을 시리즈 단위로 한 번에 정리한다.
- 병합 검토 7편은 모두 다음 조치가 보강(차별화)이다. 정본 결정이 먼저다: expected 설명(3-05·3-06·3-07, 정본 후보 3-07), 소유권·스마트 포인터(3-09·3-10), lock-free(4-03 입문·4-04 구현), ETL(4-02 정본, part3-01·part4-06은 링크).
- 제목 키워드와 본문 범위가 어긋난 5편(3-06·3-07·4-01·4-02·4-05)은 본문을 채우거나 제목을 좁혀야 하는데, 제목 변경은 사용자 결정 사항이라 제안만 남긴다.
- '측정' 절은 실측 환경 기록이 없으면 수치를 새로 만들지 않고 지우거나 TBD로 둔다.
