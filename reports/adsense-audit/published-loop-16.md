# 공개 글 AdSense 평가 — 루프 16

> 대상: 공개 글 10편 (Embedded C++ for Real Systems `seriesOrder` 34~40 7편, Embedded Debugging `seriesOrder` 1~3 3편)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 열여섯 번째 루프다. 대상은 `src/content/blog/embedded/embedded-cpp/`의 `part4-06-state-machine.md`~`part5-04-hal-design-patterns.md` 7편(Part 5-04는 시리즈 마지막 편)과 `src/content/blog/tools/debugging/embedded/`의 `chapter01-rsp-protocol.md`~`chapter03-openocd.md` 3편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다. 표의 파일명 앞 `embedded-cpp/`는 `src/content/blog/embedded/embedded-cpp/`, `debugging/embedded/`는 `src/content/blog/tools/debugging/embedded/`를 줄인 것이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `embedded-cpp/part4-06-state-machine.md` | 11 | 10 | 5 | 8 | 6 | 5 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `embedded-cpp/part4-07-compile-time-fsm.md` | 12 | 9 | 5 | 9 | 6 | 7 | 2 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `embedded-cpp/part4-08-singleton-alternatives.md` | 10 | 11 | 5 | 9 | 6 | 5 | 1 | **47** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `embedded-cpp/part5-01-register-abstraction.md` | 10 | 10 | 5 | 8 | 6 | 7 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `embedded-cpp/part5-02-gpio-abstraction.md` | 10 | 8 | 5 | 8 | 6 | 6 | 1 | **44** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `embedded-cpp/part5-03-peripheral-abstraction.md` | 10 | 8 | 4 | 8 | 5 | 7 | 1 | **43** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `embedded-cpp/part5-04-hal-design-patterns.md` | 11 | 10 | 4 | 10 | 6 | 4 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `debugging/embedded/chapter01-rsp-protocol.md` | 13 | 12 | 6 | 9 | 7 | 6 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `debugging/embedded/chapter02-jtag-swd-coresight.md` | 14 | 12 | 7 | 10 | 7 | 7 | 2 | **59** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `debugging/embedded/chapter03-openocd.md` | 14 | 13 | 7 | 8 | 8 | 6 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |

평균 49.5점(10편 합 495), 범위 43~59점이다. 10편 모두 점수 구간은 병합 검토(40~59)이고, 판정은 우선 조치 6편(4-07·5-01·5-03·ch01·ch02·ch03), 병합 검토 4편(4-06·4-08·5-02·5-04)이다. 유지·검증 대기·보강·제외 검토는 없다. 오류 확인은 6건이고 모두 글 안의 모순(두 구체 진술, 코드 대 산문, 산술)으로 정했다. 1차 자료를 열어 정한 오류는 없다. 10편 모두 git log에 1차 자료 대조 커밋이 없어, 오류 확인이 아닌 4편은 `factcheck: 미검증`이다. 병합 검토 4편과 우선 조치 6편 모두 독립 검색 의도가 있어 다음 조치는 보강이다(4-06·5-02는 일부 절을 다른 글로 합치는 후보를 함께 적었다). P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체, 다음 편·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·draft 여부, 4-06 다이어그램 `.tex`, 5-01 그림 `part5-01-mmio-bitfield.tex`까지이고, 렌더링·광고 배치·sitemap·외부 링크 응답(ch01 428행 저장소 포함)은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `embedded-cpp/part4-06-state-machine.md` | 46 | 46 | 0 | 없음 |
| `embedded-cpp/part4-07-compile-time-fsm.md` | 50 | 50 | 0 | 없음 |
| `embedded-cpp/part4-08-singleton-alternatives.md` | 49 | 47 | -2 | 없음 |
| `embedded-cpp/part5-01-register-abstraction.md` | 47 | 47 | 0 | 없음 |
| `embedded-cpp/part5-02-gpio-abstraction.md` | 44 | 44 | 0 | 없음 |
| `embedded-cpp/part5-03-peripheral-abstraction.md` | 43 | 43 | 0 | 없음 |
| `embedded-cpp/part5-04-hal-design-patterns.md` | 46 | 46 | 0 | 없음 |
| `debugging/embedded/chapter01-rsp-protocol.md` | 55 | 55 | 0 | 없음 |
| `debugging/embedded/chapter02-jtag-swd-coresight.md` | 59 | 59 | 0 | 없음 |
| `debugging/embedded/chapter03-openocd.md` | 58 | 58 | 0 | 없음 |

1차 합 497에서 최종 495로 2점 내려갔다. 판정이 바뀐 글은 없다. 부풀림(AP-C-24)은 없다.

- 기각한 오류 확인: 0건. 1차가 올린 오류 확인 6건(4-07·5-01·5-03·ch01·ch02·ch03)을 모두 원문 줄로 다시 확인해 유지했다.
- 추가한 오류 확인 근거(판정은 그대로, 같은 글에 근거를 덧붙임): 4-07 15행 '런타임 코드는 최소' vs 39행 '런타임 코드와 데이터 모두 0'. 5-01 294행 '매크로 출력과 완전히 동일'·443행 '(동일)' vs 22·25·434~435행 ODR(0x40020014) read-modify-write와 288~290행 BSRR(0x40020018) 단일 str. ch01 221·409행 빈 응답 `$$#00` vs 36·41행 패킷 형식·체크섬 규칙. 5-03은 B 보강 근거로 331행 `Peripheral::init()`(인자 없음) vs 48행 `init(uint32_t baud, uint32_t pclk)`·343행 `PeripheralGuard<Uart2>`를 더했다.
- 4-08: A 11→10, D 10→9. 1차가 고유 기여로 본 hardware singleton + IUart DI 절(307~352행)이 같은 시리즈 공개 글 part5-04 216~237·309~339행과 같은 구성이다. 1차는 part5-04를 비교하지 않았다. TDD pattern43 경로도 `programming/engineering/tdd-patterns/`로 바로잡았다.
- 근거 정정(점수 영향 없음): 4-06 B의 StateId 서술(330행은 210행 열거자를 그대로 쓰고, 문제는 `EventId` 미정의), 4-06 C의 `Packet` 위치(173행), 4-06 D 대응 줄(part4-07 43~70행, part3-08 98~185행, part3-06은 embedded-cpp 경로), 4-06 48행 '네 이벤트'는 다이어그램 .tex로 확인해 해소하고 코드의 Resume 누락으로 바꿔 적음. 4-07 series_issues의 4-06 환경 표기(4-06 399행에 'STM32F4, -Os'가 있음). 5-01 A·G의 'ARM CMSIS' 줄(196→176행). 5-03 git 커밋 수(5→7). ch01 D의 gdb-lldb ch08 줄(92~106행). ch02 D의 ch06 ETM 줄(333~336행). ch03 D의 part10-03·ch07·ch08 대응 줄.
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목과 대조했다. 다음 편 안내는 10편 모두 실제 파일과 맞았다(5-04는 시리즈 마지막이라 다음 시리즈 추천). 감점 원인은 draft 대상을 가리키는 링크 없는 관련 항목(4-06 424행, 4-08 407·408행, 5-04 480·431~432행)과 5-04 428~430행 다음 시리즈 편수 오기다.

## 글별 근거

### `embedded-cpp/part4-06-state-machine.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log 커밋 8개(304eb61b 최초 작성, 815510c8 다이어그램·정리 폴리싱, 39149f68 번역투 폴리싱, 400892d7 linter, 407c9d9a ASCII→TikZ, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정) 중 ETL 소스·C++ 표준·컴파일러 같은 1차 자료와 대조한 커밋이 없다. 원문 안에서 기술 주장 두 개가 동시에 참일 수 없는 모순은 찾지 못했다. 다이어그램(Resume 이벤트)과 코드(Play로 재개)의 불일치는 예제 설계 불일치라 B·C에서 감점했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | enum+switch → variant → etl::fsm 세 단계(52~285행)와 단계별 장단점 불릿(92~102, 151~160, 274~284행)은 상태 머신 입문 자료의 표준 구성이다. 이 글만의 것은 TCP 연결 상태를 variant로 표현해 상태별 데이터를 분리한 예(162~195행)와 전이 로깅 템플릿(345~352행) 정도다. 비교표(288~292행)의 '3-5 / 5-15 / 15+ state' 구간은 근거가 없고, HSM 절(294~300행)은 '대부분의 임베디드는 flat FSM으로 충분합니다' 한 문장으로 선택 기준을 대신한다. 앵커 part6-09(A 10)와 비슷하나 TCP 예가 있어 1점 높다. |
| B | 10 | 문제(26~42행) → 세 단계 구현 → 비교 → HSM → compile-time → 함정 → 측정 → 정리로 흐름은 끝까지 간다. 그러나 etl::fsm 예제는 261행에서 `PausedState`를 쓰면서 정의하지 않는다. 48행 '세 상태와 네 이벤트', 50행 다이어그램은 Play·Pause·Resume·Stop인데 코드는 Paused→Playing을 Play로 처리한다(67~70·318행). 330·334행 `EventId`는 정의가 없고 `StateId`가 210행 enum을 쓰는지 밝히지 않는다. HSM(294~300행)과 ISR·main 동시 이벤트(392~393행)는 한두 문장이다. 155·304행 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 5 | 측정 표(400~406행)는 'STM32F4, -Os'만 적고 컴파일러·버전·ETL 버전·측정 방법이 없다. ~400 B·~800 B·~1.6 KB는 출처가 없어 루브릭 3-1 C ≤ 8. 400행 '같은 5-state FSM 기준'인데 본문 예제는 모두 3-state라 재현할 수 없다. `start_playback`(64행)·`Conn`(166행)·`Packet`(173행)·`accept`(177행) 미정의, `PausedState` 누락(261행), 147~148·266~271·334행 함수 밖 문장으로 그대로 컴파일되지 않는다(AP-C-35). 예상 출력·검증 절차가 없어 4~7 하단. |
| D | 8 | 같은 시리즈 다음 글 part4-07: 이 글 306~334행(Transition 구조체, constexpr transitions 5행, next_state 루프, static_assert)이 4-07 43~70행과 이름만 다른 같은 코드이고 339행이 4-07로 넘긴다. part4-02-etl-library.md 179~243행의 etl::fsm 예제가 이 글 197~272행과 같은 뼈대다. part3-08-no-rtti-design.md 98~185행 variant+visit 설명이 104~160행과 개념상 겹친다. part4-05(type-safe flags)는 겹치지 않고, part3-06 268~303행은 에러를 전이 트리거로 쓰는 예로 303행에서 이 글로 넘긴다. 다른 시리즈 modern-recipes/part6-02-task-design.md 85~110행은 RTOS task 안 C switch FSM이라 역할이 구별된다. 5~9 구간. |
| E | 6 | 제목은 'Variant·Visitor·Table-driven 비교'인데 비교표(288~292행)·측정표(402~406행)는 enum/variant/etl::fsm 세 가지뿐이고 table-driven은 302~337행에 따로 있다가 339행에서 4-07로 넘어간다. description(5행)은 'enum + switch부터 std::variant, etl::fsm까지'로 제목과 다른 목록을 약속한다. 6~8 하단. |
| F | 5 | 428행 다음 글(Part 4-07)은 seriesOrder 35 파일과 맞고, 421~423행 part4-02(179행 etl::fsm 절)·part3-08(98행 variant 절) 라벨도 맞다. 그러나 424행 'GoF 20: State'는 링크가 없고 대상 후보 `programming/design/gof-design-patterns/item20-state.md`는 9행 `draft: true`라 루브릭 F '링크 없는 관련 항목'으로 5 이하. 50·298행 다이어그램과 H2는 기능하지만 전제 지식 안내는 없다. |
| G | 1 | ETL 문서·저장소 링크, ETL 버전, C++ 표준 조항, 컴파일러 버전이 없다. 400행 환경은 'STM32F4, -Os'뿐이고 304행 'C++23의 constexpr', 106행 'C++17부터'에 근거가 없다. |

uncertainties:
- 155행 'if constexpr 패턴으로 … exhaustive check가 가능': 130~131행 코드는 else 분기로 나머지를 받으므로 누락을 컴파일러가 잡지 않는다. 표준·컴파일러로 확인하지 않았다.
- 304행 'C++23의 constexpr로 컴파일 타임에 검증': 322~327행 for 루프 constexpr 함수가 C++23을 요구하는지(C++14 relaxed constexpr일 가능성) 확인하지 않았다.
- 48행 '네 이벤트'는 다이어그램 .tex(Play·Pause·Resume·Stop)와 맞지만 코드에 Resume이 없다(67~70·318행).
- 219행 `fsm(0)`, 263~266행 `set_states`·`start`, 350행 `fsm.state`가 현재 ETL API와 맞는지 ETL 소스로 확인하지 않았다.
- 147~148·266~271·334행 namespace 범위 문장은 그대로는 컴파일되지 않을 것으로 보인다(언어 규칙 판단, 컴파일 안 함).
- 402~406행 수치의 출처·컴파일러·측정 방법이 없다.
- 330·334행 `EventId` 미정의, `StateId`가 210행 enum을 재사용하는지 불명.

병합 대상: compile-time table 절(302~339행)은 `part4-07-compile-time-fsm.md` 43~70행과 같은 코드라 4-07로 합치고 이 글에는 링크 한 줄만 남긴다. etl::fsm 절(197~272행)은 `part4-02-etl-library.md` 179~243행과 같은 뼈대라 한쪽으로 모은다. '런타임 FSM 구현 방식 선택'은 독립 검색 의도가 있어 글 전체는 병합하지 않고 다음 조치는 보강이다: 같은 미디어 플레이어 FSM(Resume 포함)으로 세 방식을 끝까지 구현하고(PausedState 추가), 측정 표를 컴파일러·버전·재현 절차와 함께 다시 재거나 TBD로 두고, table-driven을 비교표에 넣는다.

### `embedded-cpp/part4-07-compile-time-fsm.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(0ef51ef3 작성, 815510c8·39149f68 문체 폴리싱, 400892d7 linter, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋은 없고, 근거는 글 안의 모순이다. (1) 39행 '런타임 코드와 데이터 모두 0'과 73행 'table은 `.rodata`에 들어가고'는 동시에 참일 수 없다. 39행·5행 'runtime 코드 0'은 320행 'Compile-time (template specialization) .text: 180 B'와도, 15행 '런타임 코드는 최소가 됩니다'와도 맞지 않는다. (2) 150행 주석 'catch-all — invalid transition은 현재 state 유지'와 153행 `static_assert(sizeof(E) == 0, "Invalid transition")`·170행 '없으면 `static_assert`가 실패합니다'는 같은 코드의 동작을 다르게 말한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 template specialization으로 invalid 전이를 static_assert로 막는 예(77~114행)와 constexpr로 도달 불가·dead-end state를 검사하는 예(242~284행)다. constexpr table(43~73행)은 4-06에 이미 있고, Boost.SML 장단점(205~217행)은 일반론이며, HSM 절(219~240행)은 `is_in_state` 본문이 주석뿐이다. 39행 '수 KB를 절약할 수 있습니다', 295행 '수 분에 이를 수도 있습니다. 측정이 필요합니다'는 구체 주장을 완곡 표현으로 대신했다. |
| B | 9 | 문제(17~29행) → table → template → variant → SML → HSM → 검증 → 함정(286~304행) → 측정 → 정리(330~337행) 흐름은 있다. HSM(234~237행)은 구현이 없고, variant 절 catch-all(150~155행)은 주석과 코드가 반대 동작을 말해 invalid 전이가 무시되는지 컴파일 에러인지 알 수 없다. 134~135·159~166행 컴파일 가능성 의문이 열려 있어 AP-C-24 B ≤ 13. |
| C | 5 | 측정 블록(308~326행)은 .text·cycle 수치를 적었지만 컴파일러·플래그·MCU·측정 방법이 없어 C ≤ 8. 320행 180 B가 39행 '0'과 충돌한다. 32~36행 예상 에러 `error: invalid transition`은 106행 메시지 'Invalid state transition'와 다르다. 134~135·151~166행처럼 그대로 컴파일될지 의심되는 조각이 있어 4~7 하단. |
| D | 9 | 앞 글 part4-06(seriesOrder 34): 이 글 43~71행 Transition 구조체·`constexpr transitions[]`·`next_state` 루프·static_assert가 4-06 302~331행과 이름만 다른 같은 코드다. 116~170행 variant 접근은 4-06 104행 '단계 2 — std::variant + std::visit'과 겹치고 118행이 스스로 밝힌다. 측정 312~316행(380 B, 720 B)은 4-06 397~405행 표(~400 B, ~800 B)와 같은 비교다. HSM·SML(219~240행)은 4-06 294~300행과 겹친다. 다음 글 part4-08(DI)은 겹치지 않는다. 다른 시리즈 gof-design-patterns/item20-state.md 342행, autosar-cpp/chapter12-compile-time-cpp.md 672행은 같은 주제지만 둘 다 draft다. |
| E | 6 | 제목 '템플릿으로 상태 전이 검증'은 77~114·242~284행으로 이행했다. description(5행) 'runtime 코드 0'은 320행 180 B, 73행 .rodata와 맞지 않는 과장이고 HSM은 빈 뼈대다. 6~8 하단. |
| F | 7 | 348행 다음 글 'Part 4-08: Singleton 대안 — 임베디드의 DI 패턴'은 seriesOrder 36 part4-08(title 'Singleton 대안 패턴')과 맞다. 341행 4-06, 342행 2-04('constexpr 고급 활용 — 룩업 테이블…'), 343행 3-08(description에 std::variant) 라벨이 대상과 맞다. 19·118행이 전제 글을 가리킨다. 렌더·모바일 확인을 안 해 9 이상은 아님. |
| G | 2 | 본문 출처는 Boost.SML GitHub 링크(174·344행)뿐이고 버전·태그가 없다. C++ 표준판·컴파일러 버전, 측정(308~326행)의 보드·툴체인이 없다. |

uncertainties:
- 134~135행 `constexpr State transition(Idle, StartEvent)`가 constexpr 아닌 `get_time()`을 호출한다. 표준판에 따라 ill-formed일 수 있으나 표준 원문으로 확인하지 않았다.
- 151~166행: std::visit가 모든 대안에 lambda를 인스턴스화해 catch-all의 static_assert로 166행 유효 호출부터 컴파일이 막힐 수 있다(언어 규칙 판단, 오류 확인 근거에 넣지 않음).
- 152~153행 항상 거짓 static_assert 처리는 C++23(P2593) 전후로 다르다. 확인하지 않았다.
- 308~326행 수치와 4-06 397~405행 표(~400 B·~800 B)가 다르다. 어느 쪽이 맞는지 근거가 없다.
- 39행 '수 KB를 절약'은 같은 글 측정(380 B 대 180 B)과 규모가 맞지 않는다.
- 186~195행 Boost.SML 문법, 304행 `etl::hsm` 존재를 upstream과 대조하지 않았다.

병합 대상: `part4-06-state-machine.md`(4-06 302~331행 Compile-time FSM 절이 이 글 43~71행과 같은 코드). 판정은 오류 확인으로 우선 조치다. 먼저 5·39행 'runtime 코드 0'과 150행 주석을 바로잡고, 4-06 쪽은 링크(4-06 335행)만 남긴 뒤 이 글을 template specialization과 unreachable·dead-end 검사(77~114·242~284행) 중심으로 보강한다. 'compile-time FSM'은 독립 검색 의도가 있어 다음 조치는 보강이다.

### `embedded-cpp/part4-08-singleton-alternatives.md` — 47점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0ef51ef3 최초 작성, 815510c8·39149f68 Tone A 폴리싱, 400892d7 linter, ac24bb76 제목 일괄 변경, be973200 topic, 0a9dd7bc slug)에 C++ 표준·GCC 문서와 구체 주장을 대조한 커밋이 없다. 원문만으로 성립하는 내부 모순도 찾지 못했다. 389행 'no guards'와 168~170행 함수 지역 static은 표가 105~110행 전역 wiring 판을 가리킬 수도 있어 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 이 글만의 내용은 main에서 peripheral 초기화 뒤 static 객체로 wiring하는 예(159~181행), Service Locator의 register 누락 nullptr(150·302행), DI container를 쓰지 말라는 판단(354~374행) 정도다. hardware singleton을 IUart 뒤에 두고 DI로 받는 조합(253~279·307~352행)은 part5-04 216~237·309~339행과 같은 구성이다. 19~25행 문제 목록과 생성자 주입(63~113행)은 표준 목록이고, 151행 'anti-pattern으로 보는 시각도 있습니다', 296행 'single-task RTOS면 괜찮습니다'는 기준 없는 일반론이다. 앵커 part1-04(A 10)와 같다. |
| B | 11 | 문제(17~29행) → 대안 1~4(31~226행) → 진짜 singleton(228~279행) → 함정(281~305행) → hardware singleton(307~352행) → 측정(376~392행) → 정리(394~401행)로 끝까지 간다. 제목의 'Phantom'은 본문에 없고(2행뿐), 15·29·397행은 '세 가지 대안'인데 196행에 대안 4가 있다. 94행 'fake logger를 주입해 테스트가 쉽습니다'는 68~75행 비가상 concrete `Logger&`와 연결이 설명되지 않는다. AP-C-24 B ≤ 13. |
| C | 5 | 컴파일러·MCU·플래그가 없다. 376~390행 '.text 4.2 KB vs 3.8 KB', '.bss 120 B'는 출처·툴체인 없는 수치라 C ≤ 8. 49행 `Logger::instance().log("hello");`는 namespace 범위 문장, 290~294행 `#pragma push_options`는 주석 한 줄뿐, 186~193행 테스트는 FakeLogger·FakeBus 정의가 없다. 4~7 구간, 앵커 part1-04(C 6)보다 약간 낮다. |
| D | 9 | 인접 글 part4-07(35)·part5-01(37)은 주제가 달라 겹치지 않는다. 같은 시리즈 공개 글: part1-06-startup-code.md 236~245행 Construct-On-First-Use가 이 글 31~56행과 같고, part5-04-hal-design-patterns.md 216~237행 IUart + 구현·309~339행 생성자 주입이 이 글 253~279·307~352행과 같은 구성이다(part5-04 311행이 이 글을 가리킴). 다른 시리즈 draft 글 beautiful-cpp/item14-avoid-singletons.md 163·218·253행, gof-design-patterns/item05-singleton.md 290·328·347행, programming/engineering/tdd-patterns/pattern43-singleton.md 175행이 이 글 23·63·115·228·354행과 같은 뼈대다. 5~9 상단. |
| E | 6 | 제목의 'Service Locator·Static Init·Phantom' 중 Service Locator(115~153행)와 Static Init(23·31~61행)은 다루지만 'Phantom'은 본문에 한 번도 없다. description(5행)은 31·63·115행과 맞는다. 6~8 하단. |
| F | 5 | 412행 다음 편 part5-01은 seriesOrder 37과 맞다. 405행 part1-06(219~245행), 406행 part3-10(109~130행 Display/Bus borrow), 226행 part2-08(seriesOrder 16) 라벨이 대상과 맞다. 그러나 407·408행 'GoF 5: Singleton (avoid)', 'TDD Pattern 43: Singleton (avoid)'은 링크 없는 관련 항목이고 대상이 draft라 F ≤ 5. |
| G | 1 | 1차 출처 링크가 없다. 33·39·55행 'C++11 thread-safe magic static'에 표준 절이 없고, 61행 `-fno-threadsafe-statics`에 GCC 버전·문서가 없다. 19행 'GoF조차 권장하지 않습니다', 299행 'unspecified'도 출처가 없고 376~390행 측정에 툴체인·보드가 없다. |

uncertainties:
- 15·29·397행 '세 가지 대안' vs 196행 '대안 4 — Template Injection'(산문 개수 실수라 오류 확인에 넣지 않음).
- 299행 'destructor 호출 순서는 unspecified': 생성 역순으로 소멸한다는 기억과 다르다. [basic.start.term]을 열어 확인하지 않았다.
- 389행 'Static DI runtime: 0 (no guards)' vs 61행 guard 비용·168~170행 함수 지역 static. 표가 105~110행 판을 가리킬 수 있어 모순으로 확정하지 않았다.
- 75행 Sensor가 비가상 `Logger&`(68~71행)를 받아 94행 'fake logger 주입'과 187~189행 `FakeLogger` 전달이 성립하지 않아 보인다. 192행 `EXPECT_EQ`가 포인터 비교가 되는지도 미확인.
- 49행 namespace 범위 호출문은 컴파일되지 않을 수 있다(언어 규칙 판단).
- 19행 'GoF조차 권장하지 않습니다' 출처 미확인.
- 328~329행 `USART0->DR`의 CMSIS 헤더 기준 미확인.
- 382~389행 수치의 출처·툴체인·최적화 옵션이 없다.
- 290~294행 `#pragma push_options`로 `-fno-threadsafe-statics`를 지정할 수 있는지 미확인.

병합 대상: 병합 대상 없음. 겹치는 part1-06 236~245행과 part5-04 216~237·309~339행은 다른 질문(스타트업 순서, HAL 설계)의 일부이고 part5-04 311행이 이 글을 DI 정본으로 가리킨다. beautiful-cpp item14·GoF item05·TDD pattern43은 draft라 대상이 아니다. 다음 조치는 보강: 'Phantom'을 다루거나 제목에서 빼고, '세 가지/네 가지'를 맞추고, 376~390행 측정을 실측 환경과 함께 다시 쓰거나 지우고, 49·290~294행 코드를 컴파일되는 형태로 고치고, 407·408행을 공개 글 링크로 바꾼다. 31~61행과 307~352행은 part1-06·part5-04로 링크하고 줄인다.

### `embedded-cpp/part5-01-register-abstraction.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(14fe805b 작성, 815510c8·862fa1b8 그림, 39149f68·400892d7 문체, ac24bb76 제목, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋이 없고, 근거는 글 안의 모순 두 건이다. (1) 124행에 실린 그림 소스 `part5-01-mmio-bitfield.tex` 20행은 대상을 'STM32 USART_CR1 at 0x40004400 + 0x0C'로 밝히고 39~40·71행에서 UE = bit 14, 41~42·74행에서 bit 13 = M0, 58~59행에서 TE = bit 4로 그린다. 같은 레지스터(332행 `Uart<0x40004400>`, 301~305행 CR1 = +0x0C)에 대해 본문 318행 `(1 << 13) | (1 << 3) | (1 << 2); // UE | TE | RE`는 UE = bit 13, TE = bit 3이다. 그림 100행 Naive 예 `(1 << 13) | (1 << 3)`도 그림 자신의 비트 표와 어긋난다. (2) 294행 '매크로 출력과 완전히 동일합니다'와 443행 '(동일)': 비교 대상 매크로(22·25행, 434~435행)는 0x40020014(ODR)에 `|=`/`&=` read-modify-write를 하는데 288~290행 어셈블리는 0x40020018(BSRR)에 단일 str을 한다. 어느 비트 배치가 맞는지는 reference manual로 정할 일이고 이번에 1차 자료는 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 매크로(21~26행) → volatile(54~70행) → Reg32(74~116행) → 비트 마스크·enum class(128~170행) → CMSIS struct(178~197행) → class(215~239행) → template(247~282행) 진행은 이 글의 구성이지만 각 단계는 흔한 표준 패턴이고 언제 어느 단계를 고를지 기준이 없다. 장단점은 200~209행 불릿과 241행 한 줄뿐이다. 151행 '복잡합니다'로 비트 필드 타입화를 접는다. 앵커 part1-04(A 10) 수준. |
| B | 10 | 문제(17~52행) → 단계별 해법 → 함정 6개(377~426행) → 측정(428~450행) → 정리(452~459행)로 끝까지 간다. 147·166행 `GPIOA_MODER`는 정의가 없고, 364행 `Uart::shutdown()`·370행 `send_string`은 298~330행 Uart에 없으며, 129~132행 `BitField`는 쓰이지 않는다. 비트 모순과 '동일' 주장이 열려 있어 AP-C-24 B ≤ 13, 10~15 하단. |
| C | 5 | 대상 MCU·컴파일러·최적화 옵션이 없다(주소로 STM32F4를 짐작할 뿐). 286~292행 어셈블리와 437·443행 '8 bytes per call'은 환경 없는 수치라 C ≤ 8이고, 437행은 RMW 매크로와 BSRR 쓰기를 같은 크기로 적어 측정 결과로 볼 수 없다. 147·166·364·370행 미정의 식별자로 블록 셋이 그대로 컴파일되지 않는다(AP-C-35). |
| D | 8 | 같은 시리즈: 298~336행 Uart 템플릿이 part5-03 36~73행과 거의 같다. 247~292행 GpioPort·BSRR set/clear·`ldr r3, =0x40020018 / movs r2, #32` 어셈블리가 part5-02 55~109·119~125행과 겹친다. 이전 글 part4-08(36)은 주제가 다르다. 다른 시리즈: 54~70행 volatile과 178~197행 GPIO struct가 modern-recipes/part4-02-mmio-access.md 25~50·52~69행과 같고, 400~406행 RMW race는 performance-engineering/part3-07-mmio.md 107행과 겹친다. Reg32와 단계 비교가 이 글만의 부분이라 5~9 구간. |
| E | 6 | 제목·description(volatile, bit field, register wrapper class)은 본문 주제와 같다. 다만 '비트 필드 접근'은 151행에서 접고, 그림 tex 105행 `cr1.set<UE>().set<TE>()` 같은 typed field API는 구현이 없다. 일반 제목에 STM32F4 주소 본문(110~112·194·332행)이라 E ≤ 8, 키워드 부분 미이행으로 6. |
| F | 7 | 470행 다음 글 part5-02는 seriesOrder 38(이 글 37+1), 제목 'GPIO 추상화 패턴'과 맞다. 463행 part4-05(33), 465행 part5-03(39), 466행 part2-06(14), 375행 part2-01(9) 라벨이 대상 제목과 맞다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 안 해 9 이상은 아님. |
| G | 1 | 1차 출처 링크가 없다. 주소·비트 위치(110~112·194~195·318·322·327행)에 MCU·reference manual 판이 없고, 176행 'ARM CMSIS의 표준 패턴'도 CMSIS 문서 인용이 없다. 286~292·437행 어셈블리의 컴파일러 버전도 없다. |

uncertainties:
- 334·360행 USART2 init에 168'000'000, part5-03 73행은 같은 Uart2에 84'000'000. APB1 클록은 reference manual로 확인하지 않았다(다른 글과의 차이라 오류 확인에 넣지 않음).
- 419행 `set_mode<32>` '컴파일 OK': 258~259행 `0b11u << 64`는 상수식에서 허용되지 않아 컴파일 오류일 수 있다(언어 규칙 판단).
- 426행 '64-bit register를 32-bit access하면 bus fault'는 출처 없는 일반화.
- 437·443행 '8 bytes per call': literal pool 포함 여부·컴파일러·옵션 미상.
- 115·406행 BSRR 'HW atomic'은 reference manual 인용 없음.
- 그림 tex 83행 'TE / RE' 라벨이 bit 3과 2 사이에 놓여 58~61행 주석(TE = 4, RE = 3)과 위치가 맞지 않는다. SVG 렌더 결과는 직접 보지 않았다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 후보로 Uart 절(298~336행)은 `part5-03-peripheral-abstraction.md` 36~73행으로, GpioPort·어셈블리 절(247~294행)은 `part5-02-gpio-abstraction.md` 55~125행으로 넘기고 이 글은 Reg32 wrapper·CMSIS struct·비트 필드 타입화에 집중시킨다. 먼저 그림 tex 39~83행과 본문 318행의 USART_CR1 비트 위치를 reference manual로 확정해 한쪽을 고치고, 294·437~443행 '동일' 비교를 같은 레지스터·같은 연산끼리로 바로잡는다. 다음 조치는 보강이다.

### `embedded-cpp/part5-02-gpio-abstraction.md` — 44점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug, be973200 topic, ac24bb76 제목·날짜, 400892d7 linter, 39149f68 폴리싱, 그 이전 폴리싱·최초 작성)에 STM32 reference manual·C++ 표준·컴파일러 출력과 대조한 커밋이 없다. 원문 안 숫자도 서로 맞는다: 구조체 오프셋 BSRR 0x18(59~66행)이 121행 0x40020018과 맞고, 122행 #32 = 1<<5, 386행 1<<21 = pin 5 clear도 맞다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 이 글에만 있는 것은 GpioGroup fold(131~145행), GpioMask 한 번 store(149~167행), NTTP PinConfig static_assert(171~201행), GpioPin concept(205~227행), AFR 인덱스·shift(239~262행)다. 절마다 코드 한 조각과 한두 문장뿐이다. template 방식을 버릴 기준은 373행 '부족합니다. runtime 설정이 필요합니다'로 끝나고, 145행 '결합할 수 있습니다', 282행 'type-safe해집니다'는 근거 없는 일반론이다. 핵심 예제(54~127행)는 2-06·5-01과 같다. |
| B | 8 | 문제 → 기본 class → 확장 → 보드 헤더 → 함정 → 정리 순서는 갖췄다. ConfiguredGpio::init()은 주석만 있고(186~189행) set()은 비어 있는데(191행) 정리 424행은 'if constexpr로 분기합니다'라고 단정한다. EXTI 절은 `// ...`로 끝나고(271~273행), enable_clock은 주석 한 줄(356~358행), 함정 5·6(371~377행)은 한두 문장이다. |
| C | 5 | 어셈블리(119~125·395~411행)에 컴파일러·버전·옵션·대상 코어가 없다. 379행 '측정' 절은 같은 3줄 어셈블리를 두 번 적었을 뿐이다(396~398·409~411행). 환경 없는 구체 결과라 C ≤ 8. GpioMode·GpioSpeed·InterruptEdge 미정의, 239행 class Gpio 재정의, 250행 AFR이 PortRegs(59~68행)에 없음, 272행 Pin::pin_number·139행 Led3 미정의, 39행 `Gpio<GpioA, 5>`는 100행 주소 정수 인자와 맞지 않는다. |
| D | 8 | 5-01 247~294행(GpioPort 템플릿, BSRR, 같은 어셈블리)과 428~445행 측정 절이 이 글 54~127·379~416행과 겹친다. 2-06(part2-06-templates-basics.md) 167~205행이 같은 `Gpio<uintptr_t Port, uint8_t Pin>`, LedRed alias, 어셈블리, 설명까지 이 글 13~48·54~127행과 거의 같다. 5-03은 UART/SPI/I2C라 겹치지 않는다. 5-04 179~200행 board_config.h typedef가 이 글 286~326행과 같은 구조다(5-04는 STM32F4/NRF52로 실제 보드를 가름). 다른 시리즈 modern-recipes/part4-03-gpio-driver.md는 C 레지스터 드라이버라 역할이 다르다. 5~9 구간. |
| E | 6 | 제목 'Template·Concept으로 보드 독립성'과 description '컴파일 타임에 핀 설정 검증, runtime 비용 0'은 방향이 같다. 그러나 314~319행 DISCOVERY·NUCLEO_F401 두 분기는 주소와 핀이 똑같아 보드 차이를 보여 주지 못하고, '핀 설정 검증'은 182행 static_assert 하나에 init()은 비어 있다. |
| F | 6 | 435행 다음 글 part5-03(seriesOrder 39)은 이 글(38)+1과 맞고 'UART, SPI, I2C' 안내도 맞다. 428~431행 2-06·4-05·5-01·5-03 라벨이 모두 맞고 52행에서 전제 글을 밝혔다. 239행 같은 이름 class 재선언으로 앞 절과 관계가 흐리고, 383~414행은 C 코드와 어셈블리를 text 블록 하나에 섞어 7은 주지 않았다. |
| G | 1 | 본문 출처는 231행 'STM32 datasheet 참조' 한 곳이고 링크·문서 번호·판이 없다. 100~101행 주소의 reference manual과 대상 MCU가 없다. 145·201·203행 C++17/C++20 표기는 있으나 표준 조항·컴파일러 버전은 없다. |

uncertainties:
- 145행 '같은 port면 컴파일러가 자동으로 결합': set()은 volatile store라 합칠 수 없다고 보지만 표준으로 확인하지 않았다.
- 314~319행 STM32F4 Discovery의 LED·버튼이 PA5·PC13이 아니라고 기억하지만 보드 user manual로 확인하지 않았다.
- 182~183행 'Output mode shouldn't have pull-up' 규칙의 근거를 reference manual로 확인하지 않았다.
- 343행 'invalid mode': 리셋 상태 BSRR 쓰기가 invalid인지 미확인.
- 119~125·395~411행 어셈블리의 컴파일러·옵션 미상, 재현 안 함.
- 39행 `Gpio<GpioA, 5>`와 100행 `Gpio<0x40020000, 5>`의 인자 형태 차이는 설명용 조각이라 사실 오류로 보지 않았다.

병합 대상: `part5-01-register-abstraction.md`(247~294·428~445행), `part2-06-templates-basics.md`(167~205행), `part5-04-hal-design-patterns.md`(179~200행)이 후보다. GPIO template 추상화는 독립 검색 의도가 있어 이 글을 흡수시키기보다 시리즈의 GPIO 설명을 이 글로 모으는 보강이 맞다. 다음 조치는 보강: 2-06·5-01과 겹치는 기본 Gpio·어셈블리·측정 절을 줄이고 링크하며, 빈 init()·EXTI·enable_clock은 실제 코드로 채우거나 범위에서 빼고, 다중 보드 절은 실제로 다른 매핑을 쓰고, 주소·보드 매핑·어셈블리는 reference manual·보드 user manual·컴파일러 버전과 옵션으로 확인해 출처를 적는다.

### `embedded-cpp/part5-03-peripheral-abstraction.md` — 43점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log 7개(14fe805b 집필, 815510c8 TikZ·정리, 39149f68 번역투, 400892d7 linter, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋이 없고, 근거는 글 안의 모순 두 개다. (1) 측정 vs 정리: 420행 'C++ … 실행: ~8.7 ms (동일)', 423행 '속도는 동일합니다'인데 432행은 'HAL을 wrap하는 방식이 대부분 더 빠르고 작습니다'라고 쓴다. HAL을 감싼 쪽이 HAL(415행 1.2 KB)보다 작다는 말도 측정과 맞지 않는다. (2) 코드 vs 산문: 168~171행 `UartInterface`는 `T::send(data,len)`와 `T::recv_byte()`를 요구하는데 `IsrUart`(83~118행)에는 `init`·`send_async`·`irq_handler`만, `DmaUart`(132~155행)에는 `init`·`send_dma`·`dma_complete_handler`만 있어 둘 다 concept을 만족하지 못한다. 그런데 186행은 'blocking, interrupt, DMA 중 어느 것으로도 교체할 수 있습니다. Logger는 변경할 필요가 없습니다'라고 쓰고 429행 정리도 반복한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 이 글만의 것은 CS 핀을 SPI와 묶어 select·deselect를 transfer 안에 감춘 `SpiDevice`(231~258행) 정도다. 기본 `Uart`(36~75행)와 RAII guard(323~349행)는 5-01과 거의 같다. I2C는 292행 'HAL을 wrapping하는 방식이 대부분 실용적'으로 끝나고 ADC `init()`은 빈 주석(300~302행)이다. 함정 절(385~407행)은 한두 문장 일반론이다(395·407행). 앵커 part6-09·part1-04(10)와 같다. |
| B | 8 | UART 세 모드 → concept → SPI → I2C → ADC → RAII → pool → 함정 → 측정 → 정리 흐름은 있으나 코드가 뼈대다. DMA init(134~139행)은 주석뿐이고 `dma_busy`·`dma_setup_mem_to_peripheral`·`dma_start`(143~148행) 미정의, 완료 처리(152~154행) 비어 있음. I2C `start`·`send_address`·`send_byte`·`recv_byte`(271~286행) 미정의. 331행 `Peripheral::init()`(인자 없음) vs 48행 인자 두 개 init, `enable_clock`·`shutdown`·`disable_clock`(330·335~336행)이 Uart에 없다. `UartPool`(355행)은 템플릿 인자 없는 `Uart*`. AP-C-24 B ≤ 13, 앵커 part6-09(8)과 같다. |
| C | 4 | 측정(411~421행) 환경은 'STM32F4, 115200 baud'뿐이고 컴파일러·옵션·크기 측정 방법이 없다. 1.2 KB(415행)·80 B(419행)는 출처 없는 수치라 C ≤ 8. 8.7 ms는 100 byte×10 bit/115200 = 8.68 ms로 산술은 맞다. 73~74·159·183·255·318행 함수 밖 문장, `big_buffer`(159행)·`SpiMode`·`SpiSpeed`(202행)·`Spi1`·`GpioPin`·`GpioPortA`(253행)·`ADC_REG`(306행) 미정의. 실행 조건·예상 결과가 없어 4~7 하단. |
| D | 8 | 36~75행 `Uart`(SR~GTPR, `BRR = pclk / baud`, CR1 UE·TE·RE, TXE·RXNE polling, `using Uart2 = Uart<0x40004400>`)가 part5-01 298~337행과 거의 같다(차이는 함수 이름과 클록값 84 vs 168 MHz). RAII guard 323~349행은 5-01 353~375행 `UartGuard`와 같은 구조이고 맺음 문장 'power saving이 자연스럽게 됩니다'(349행, 5-01 375행)도 같다. Concept 절 164~186행은 part2-10-concepts.md 164~181행 Driver concept과 같은 패턴이다. 5-02(GPIO)·5-04(HAL 구조)는 역할이 다르다. 다른 시리즈 modern-recipes/part4-07-uart-driver.md(2·70·162~180행)는 같은 세 모드를 C로 다뤄 79~162행과 주제가 겹치나 관점이 갈린다. 5~9 구간. |
| E | 5 | 제목(2행)의 핵심 약속 'UART·SPI·I2C 공통 인터페이스 설계'에 대해 concept은 UART 전용 `UartInterface`(166~172행) 하나뿐이고 세 peripheral을 묶는 인터페이스가 없다. I2C는 뼈대(262~290행)만 두고 292행에서 HAL wrapping으로 넘긴다. description의 'Blocking, interrupt, DMA 패턴'은 UART에만 있다. 3~5 상단. |
| F | 7 | 443행 다음 글 'Part 5-04: HAL 설계 패턴'은 seriesOrder 40 part5-04와 맞다. 436행 5-01(37), 437행 5-02(38), 438행 5-04(40), 439행 2-10('C++20 Concepts 활용', 18), 399행 본문 링크(volatile → 5-01) 모두 대상 제목과 맞다. 전제 지식 안내가 없어 9 이상은 아님. 앵커 part7-05(7)와 비슷. |
| G | 1 | 1차 출처 링크가 없다. reference manual 이름·판, MCU 품번, 컴파일러 버전이 없고 411행 'STM32F4'가 전부다. 레지스터 비트(50·55·61·66·92·138·205~206·306행)와 157행 'DMA1 Channel 7'에 대응 자료가 없다. |

uncertainties:
- 73행 USART2에 PCLK 84 MHz, 5-01 334행은 같은 Uart2에 168 MHz. APB1 최대 클록은 RM으로 확인하지 않았다(글 간 차이라 오류 확인 근거 아님).
- 157행 'DMA1 Channel 7'은 F1 계열 매핑으로 보이며 F4의 stream/channel 구조와 맞지 않을 수 있다. RM 미확인.
- 306행 ADC_CR2 bit 0을 SWSTART라 적었으나 F4 RM에서 bit 0은 ADON일 수 있다. RM 미확인.
- 92행 init에서 TXEIE를 켜면 데이터 없이 TXE 인터럽트가 바로 걸리는지 미확인.
- 86·106~112행 `std::atomic<volatile uint8_t*>` load/store 쌍이 ISR 공유에서 맞는지 미확인.
- 415·419행 1.2 KB·80 B는 출처·측정 방법이 없다.
- 313행 12-bit 결과를 4096으로 나눈 것이 의도인지 미확인.
- 282행 read 경로 `/*read=*/false`와 272행 `/*write=*/true`의 의미는 send_address 정의가 없어 판단 불가.
- 162행 'CPU 사용이 거의 0' vs 428행 'DMA(CPU 0)'은 표현 차이로 보고 오류로 올리지 않았다.

병합 대상: 판정은 오류 확인(432행 vs 420·423행, 186·429행 vs 168~171·83~155행)으로 우선 조치다. 점수 구간 기준 후보는 `part5-01-register-abstraction.md`(UART 클래스 5-01 298~337행, RAII guard 353~375행 중복)다. 5-03에는 SpiDevice(CS 결합)와 모드 교체라는 독립 질문이 있어 다음 조치는 보강이다. 먼저 432행 결론과 186행 교체 주장을 측정·코드와 맞게 고치고, 중복된 UART 기본 클래스는 5-01 링크로 대체한 뒤, UART·SPI·I2C 공통 concept을 실제로 정의해 제목의 약속을 채운다.

### `embedded-cpp/part5-04-hal-design-patterns.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(14fe805b 초안, 815510c8·39149f68 폴리싱, 400892d7 린터, ac24bb76 제목, fa55144d·8bf4703f 링크 수정, 0a9dd7bc slug, be973200 메타데이터)에 STM32 HAL·nRF SDK·MCUXpresso·C++ 표준과 대조한 커밋이 없다. 코드 조각 간 불일치(194행 정적 호출, 237행 vs 332·353행 StmUart, 75행 vs 141행 StmGpio 이중 정의)는 언어 규칙을 알아야 판단되는 결함이라 루브릭 3-1에 따라 uncertainties로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | Interface(53~114행)·CRTP(116~176행)·typedef(178~209행)·Mixed(211~241행) 네 패턴을 장단점 불릿으로 두고 STM32→NXP 교체 시나리오(341~363행)를 보인 구성은 이 글의 것이다. 장단점은 113행 'Virtual call overhead가 작지만 존재합니다', 176행 'type이 폭증할 수 있습니다', 209행 '(보통은 괜찮습니다)'처럼 수치·조건 없는 일반론이고 선택 기준이 없다. 365~422·482~490행은 시리즈 요약이고, 484행 '측정 가능한 주장만 사용했고'는 이 글에 측정이 없는 것과 맞지 않는다. 앵커 part6-09(A 10)보다 1점 높다. |
| B | 10 | 문제(17~43행) → 3계층(45~51행) → 패턴 4개 → 디렉토리·CMake(243~281행) → Mock(283~307행) → DI(309~339행) → 벤더 교체(341~363행) → 함정(434~463행) → 정리(465~471행)로 끝까지 간다. 233행 `uart.send(...)`는 생략 코드, 299행 `blink_twice` 미정의, 468행 '패턴은 3가지'는 211행 패턴 4를 빠뜨린다. AP-C-24 B ≤ 13, 10~15 하단. |
| C | 4 | MCU·컴파일러·HAL/SDK 버전과 측정·관찰 결과가 없다. 463행은 HAL 비용을 '측정 도구를 활용합니다'라고만 한다. 216~221행 IUart에는 send/recv뿐인데 325·348행은 `send_string`을 부르고, 317행 `hal::ISpi`·333행 `StmSpi` 미정의, 237행 `StmUart<0x40004400>`와 332·353행 `StmUart uart(USART2)`가 다르고, 194행 `LedGpio::set()` 정적 호출은 127행 비정적 멤버와 맞지 않는다. 앵커 part6-09(C 4)와 같다. |
| D | 10 | typedef·보드 헤더(180~189·262~263행)가 part5-02 284~325행(같은 주소 `0x40020000, 5`·`0x40020800, 13`)과 거의 같다. DI 절(309~339행)은 part4-08 155~193행(main wiring, FakeLogger 테스트)을 다시 보여 준다. CRTP(116~176행)는 part2-08-static-polymorphism.md 183~232행 'Peripheral CRTP'와 같은 구조다. 직전 글 part5-03 164~187행은 concept 기반이라 이 글의 virtual IUart(215~239행)와 역할이 갈린다. 다른 시리즈 modern-recipes/part4-03-gpio-driver.md(2·19~21행)는 HAL 없이 레지스터로 쓰는 글이고, bsp/chapter01-what-is-bsp.md 29행은 HAL을 표 한 칸으로만 언급하며, modern-recipes part5-03-stepper-motor 등은 HAL 설계 글이 아니다. 10~14 하단. |
| E | 6 | 제목은 'Static·Dynamic·Hybrid 비교'인데 본문은 Interface/Template/Typedef/Mixed(53·116·178·211행)로 부르고 비교 표·선택 기준이 없다. 468행은 Mixed를 빠뜨린다. description의 벤더 종속성 격리·다중 보드·시리즈 마무리는 17~32·178~189·341~363·365~422행이 이행한다. 6~8 하단. |
| F | 4 | seriesOrder 40이 시리즈 마지막이다. 424~432행 '다음 시리즈 추천' 링크 대상 세 개(00-preface)는 있지만 편수가 틀렸다: 428행 '50 chapters' → performance-engineering 57편, 429행 '45 chapters' → practical-internals 53편, 430행 '145 recipes' → modern-recipes 153편. 480행 'TDD Pattern 49: Extract Interface'는 링크가 없고 대상 `pattern49-extract-interface.md`는 draft, 431~432행 Refactoring Catalog·GoF도 링크 없는 항목이라 F ≤ 5. 475~479행 관련 항목 5개와 311·463행 본문 링크는 맞다. 369~412행 Part 요약에 링크가 없어 시리즈 지도 역할을 못 한다. |
| G | 1 | 1차 출처 링크가 없다. 19~29행 STM32 HAL·MCUXpresso·Nordic SDK API 인용에 SDK 버전이 없고, 73행 중첩 namespace 등 C++ 표준판, MCU·툴체인 표기가 없다. |

uncertainties:
- 114행 'vtable과 RTTI 비용이 듭니다': virtual 함수 자체는 RTTI를 요구하지 않는 것으로 보이며 417행은 -fno-rtti를 권한다. 표준·GCC 문서로 확인하지 않았다.
- 194·196행 `LedGpio::set()` 정적 호출은 127~130행 비정적 멤버와 맞지 않아 컴파일되지 않는 것으로 보이나 확인하지 않았다.
- 325·348행 `send_string`이 IUart(216~221행)에 없고, 317행 `hal::ISpi`·333행 `StmSpi` 미정의, 237행 StmUart(주소 템플릿·생성자 없음) vs 332·353행 `StmUart uart(USART2)`.
- 75행 비템플릿 `hal::stm32::StmGpio`와 141행 템플릿 `hal::stm32::StmGpio`가 같은 namespace에 같은 이름으로 정의된다.
- 101·331행 `StmGpio(GPIOA, GPIO_PIN_5)` vs 354행 `StmGpio led(GPIOA, 5)`: GPIO_PIN_5가 비트 마스크라면 354행은 다른 핀이다. HAL 헤더 미확인.
- 186~187행 `hal::nrf::NrfGpio<NRF_P0, 13>`: NRF_P0가 포인터 캐스트 매크로라면 비타입 템플릿 인자로 쓸 수 없을 수 있다. nRF SDK 미확인.
- 84행 `HAL_GPIO_ReadPin` 반환의 bool 변환, 129행 CRTP read()가 non-const(64행 IGpio는 const).
- 468행 '패턴은 3가지' vs 패턴 4개, 369·399행 Part 편수(8·8) vs 불릿 7·7, 378행(10) vs 불릿 7(Part 3은 일치). 산문 개수 실수라 오류 확인에 넣지 않았다.
- 32행 '같은 LED toggle'이지만 23·29행은 set, 26행 NXP만 toggle. MCUXpresso API 이름은 SDK로 확인하지 않았다.

병합 대상: 병합 대상 없음. typedef 보드 헤더(180~189행 ↔ part5-02 284~325행), DI(309~339행 ↔ part4-08 155~193행), CRTP(116~176행 ↔ part2-08 183~232행)가 겹치지만 '벤더 HAL을 어떤 구조로 격리하는가'는 시리즈에서 이 글만 답하고 시리즈 마무리 역할도 있다. 다음 조치는 보강: 패턴별 선택 기준(코드 크기·호출 비용·테스트 가능성)을 1차 자료나 측정과 함께 비교 표로 두고, 맞지 않는 코드 조각(send_string, ISpi·StmSpi, StmUart 생성자, StmGpio 이중 정의, LedGpio 정적 호출)을 한 세트로 맞추고, typedef·DI 설명은 5-02·4-08 링크로 줄인다. 다음 시리즈 편수와 draft를 가리키는 링크 없는 관련 항목도 고친다.

### `debugging/embedded/chapter01-rsp-protocol.md` — 55점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(0a9dd7bc slug, 28524a9d 코드 블록 언어 태그, be973200 topic, ac24bb76 제목, 03012dec·49f2a443 text 블록 변환, 400892d7 linter, c99833a1 callout, 35e57912 디렉터리 이름)에 1차 자료 대조 커밋이 없고, 근거는 글 안의 모순이다. (1) 178행 '`0x7d ^ byte`로 escape' vs 365행 "'}' (0x7d) + (X XOR 0x20)"와 367~368행 예(0x23→0x7d 0x03, 0x7d→0x7d 0x5d). (2) 41행 규칙(payload 바이트 합 % 256)과 51행 예(`g`→0x67)를 따르면 83행 `$!#04`의 체크섬은 0x21이어야 한다('!' = 0x21; 85행 `$?#3f`는 규칙과 맞음). (3) RLE 절: 349행 '0' 40개를 350행 '0' 16개+`*0d`로 적고, 352행 '+29 (40 - 4 + 0x20)'(= 68)은 29와 맞지 않으며, 355행 '14자 → 4자'는 349~350행 예(40자→20자)와 맞지 않는다. (4) 221·409행 빈 응답 `$$#00`은 36·41행 형식 `$<payload>#<checksum>`대로면 `$#00`이어야 하고, `$$#00`은 payload '$'(0x24)라 체크섬 00과 맞지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 고유한 부분은 11개 패킷 카탈로그(99~342행)에 임베디드 관점을 붙인 것이다: memory-map이 load 때 flash/RAM 경로를 가른다는 설명(297~310행), 자체 스텁 최소 패킷 표(411~428행), 에러 메시지별 사례 4개(438~463행). 대부분은 GDB 매뉴얼 Remote Protocol 장의 패킷 목록을 옮긴 수준이고 사례 절은 원인 후보 나열에서 끝난다(454행). 238~254행 qSupported 블록과 해설은 gdb-lldb ch08과 문장까지 같다. 13~19 하단. |
| B | 12 | 패킷 형식→트래픽→카탈로그→RLE·escape→PacketSize→F 패킷→에러→최소 스텁→보안→사례→정리(465~475행)로 끝까지 간다. 그러나 escape·83행 체크섬·RLE 예·빈 응답 표기가 서로 맞지 않아 413행이 약속한 자체 스텁 구현에 그대로 쓸 수 없다. 344행 '멀티 패킷 — RLE 압축' 절은 RLE만 다룬다. AP-C-24 B ≤ 13. |
| C | 6 | `set debug remote 1` 트래픽(77~87행), 로그 저장 명령(93~97행), 패킷 예(103~342행), 사례별 GDB 설정(446·457~458행)으로 따라 해 볼 수는 있다. GDB·OpenOCD 버전·타깃 보드가 없고 83행 체크섬부터 규칙과 맞지 않아 실제 관찰로 믿기 어렵다. 168행 '보통 16KB', 378행 '32-bit MCU 흔함', 383행 'PacketSize=4000 이상', 71행 '왕복 절반', 387행 `set _PacketSize 0x4000`은 출처·환경이 없어 C ≤ 8. 4~7 구간. |
| D | 9 | 같은 시리즈 chapter02(TAP·SWD·CoreSight)는 겹치지 않고 chapter03은 RSP 포트만 언급한다. 다른 시리즈 gdb-lldb/chapter08-remote-debugging.md와 많이 겹친다: 30행 역사(1989 GDB 4.x, 9600bps, USB 3.0) ↔ ch08 29행, 36~41행 패킷 형식 ↔ ch08 31~40행(체크섬 문장 같음), 240~254행 qSupported 블록과 해설 ↔ ch08 92~106행. ch08 14행이 이 글을 '깊은 내부 메커니즘'으로 가리켜 역할은 나뉜다. qemu-riscv/chapter03-gdb-debugging.md, riscv/baremetal-boot/chapter12-boot-debugging.md는 RSP 이름만 언급한다. 5~9 구간. |
| E | 7 | 제목과 description(5행)의 패킷 형식·qSupported·vCont·RLE는 32~71·236~276·189~206·344~357행에서 다룬다. description의 '멀티 패킷'은 344행 제목에만 있고, '모든 것'은 과장이다. 6~8 구간. |
| F | 6 | 479행 다음 장 'Ch 2 — JTAG / SWD / CoreSight'는 seriesOrder 2 chapter02와 맞고 483행 링크도 그 파일로 간다. 484행 'GDB and LLDB Ch 1: 소개'는 gdb-lldb/chapter01-intro-and-install.md와 맞다. 같은 주제 gdb-lldb ch08은 연결하지 않았고 487행은 링크 없는 명령 한 줄이다. 344행 절 제목이 내용과 다르고 전제 지식 안내가 없으며 렌더 확인을 안 해 9 이상은 아님. |
| G | 2 | 출처는 관련 항목의 GDB RSP 공식 명세(485행)와 LLDB gdb-remote 문서(486행) 링크뿐이고 개별 주장(escape, RLE, Z0 kind, PacketSize)과 연결되지 않는다. 버전 표기는 406행 'GDB 12+' 하나이고 트래픽 예의 GDB·스텁 버전이 없다. 428행 외부 링크는 존재 미확인. |

uncertainties:
- 91행 LLDB 옵션 `set remote-debug 1`: LLDB는 `log enable gdb-remote packets` 계열로 알고 있으나 LLDB 문서로 확인하지 않았다.
- 387행 OpenOCD `set _PacketSize 0x4000`이 실제 변수인지 미확인.
- 428행 github.com/bigchungus/embedded-gdb-stub 존재 미확인. 없으면 P0 '없는 페이지로 이어지는 링크' 후보.
- 107·111행 `S` 응답 deprecated, 406행 `E.<text>` 'GDB 12+'는 매뉴얼·NEWS로 확인하지 않았다.
- 243행 `memory-tagging+`와 274행 `MemoryTagging+` 표기 차이 미확인.
- 310행 'memory-map이 없으면 GDB가 flash 영역 M 패킷을 거부' 미확인.
- 295행 `uib:read`, 335행 `R0` 응답 없음, 206행 vCont `r` 설명 미확인.
- 336행 `vAttach;1234`의 PID를 10진으로 읽었는데 RSP는 16진으로 쓰는 것으로 기억한다. 매뉴얼 미대조.
- 219행 Z0 kind(ARM 4, Thumb 2), 221행 'Z1 빈 응답 시 software BP로 대체' 미확인.
- 168행 'PacketSize 보통 16KB'는 80·245행 예(PacketSize=2000, 8KB)와도 달라 근거가 없다.

병합 대상: 병합 대상 없음. 겹치는 gdb-lldb/chapter08-remote-debugging.md는 이 글을 심화 글로 가리키는 빠른 참조라 ch08의 RSP 절(27~107행)을 줄여 이 글로 넘기는 편이 낫다. 판정은 오류 확인으로 우선 조치이고 다음 조치는 보강: 먼저 escape(178행)·체크섬(83행)·RLE(349~357행)·빈 응답(221·409행) 모순을 GDB 매뉴얼 Remote Protocol 장(Overview, Binary Data, Run-Length Encoding, Standard Replies)과 대조해 고치고, 그 뒤 트래픽 예의 GDB·스텁 버전과 주장별 출처를 붙인다.

### `debugging/embedded/chapter02-jtag-swd-coresight.md` — 59점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log에 1차 자료 대조 커밋이 없다(387d7b79 시리즈 간 링크, 35baac92 도구·그림 수정). 근거는 글 안의 모순이다. (1) 213행 '[17] S_HALT', 214행 '[16] S_REGRDY'인데 235행 덤프 00010003은 bit16·bit1·bit0만 1이라, 주석 'S_HALT=1'은 글 자신의 비트 표로는 성립하지 않는다. (2) 215행 '[5:2] reserved'와 216행 '[3] C_MASKINTS'·217행 '[2] C_STEP'이 같은 비트에 다른 의미를 준다. (3) 161행 '패킷 한 단위로 32비트만 전송', 168행 '총 3-4 패킷'이면 데이터만 96비트 이상인데 같은 168행은 한 워드 읽기를 '약 30-40 클럭'이라 적었다. (4) 250~252행은 레지스터 하나에 DCRSR 쓰기·DHCSR 폴링·DCRDR 읽기 세 번 접근을 쓰는데 254행은 16개 레지스터를 '17 패킷 왕복'이라 적었다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 67~84행 IDCODE 비트 필드를 OpenOCD 출력(80~81행 mfg 0x23b, part 0xba00, ver 0x4)과 짝지어 읽고, 221~229행 break main을 FPB 기록→debug state→DHCSR 폴링→DCRSR 순으로 풀며, 268~272행 FP_COMP0 덤프, 276~284행 Z0/Z1 선택 기준이 이 글만의 내용이다. 30~36행 핀 표, 56~63행 IR 표, 190~198행 주소 표, 288~299행 DWT 레지스터는 ARM 문서 카탈로그 수준이고, 핵심 예시(235·254행)가 글 자신의 표·절차와 맞지 않는다. part12-10(18)보다 낮고 part1-04(10)보다 높다. |
| B | 12 | JTAG(24~103행)→SWD(105~170행)→SWO(172~182행)→CoreSight(184~360행)→신호 무결성(362~393행)→프로브(395~408행)→정리(410~420행)로 끝까지 간다. 121행 'SWD → JTAG도 비슷한 매직 시퀀스 존재', 150행 JTAG-AP 한 줄은 내용 없이 끝나고 306행 DWT 예제는 CYCCNTENA만 켠다. 235·215~217·168·254행 문제가 열려 있어 AP-C-24 B ≤ 13. |
| C | 7 | OpenOCD 명령·출력(79~81, 98, 234~235, 269~271, 338~339, 388행)과 C 코드(305~311, 321~332행)가 있지만 보드·MCU·OpenOCD 버전이 없다. 168행 '30-40 클럭, ~10µs', 254행 '~1ms', 368행 '>15cm', 420행 '트러블슈팅의 80%'는 출처·환경 없는 수치라 C ≤ 8. 235행 DHCSR 해석이 213~214행 표와 맞지 않아 독자가 자기 출력과 비교하는 기준으로 쓸 수 없어 7. |
| D | 10 | 비교한 글: 같은 시리즈 chapter01, chapter03, chapter06-trace.md, 다른 시리즈 modern-recipes/part10-02-jtag-swd.md, performance-engineering/part5-07-baremetal-profiling.md, part5-06-arm-ds-lauterbach.md. 179·338행 tpiu config가 ch06 156행·ch03 350행에 그대로 있고 182·342행 'core clock 불일치→garbled'가 ch06 182행과 같다. 356행 ETM 코어별 구성과 346행 병렬 TRACE·ETB가 ch06 333~336행과 같다. 303~313행 DWT cycle counter가 perf part5-07 56~70행, 86~101행 daisy chain·`jtag newtap … -irlen 4`가 recipes part10-02 193~207행과 겹친다. DP·AP(134~170행), DHCSR·DCRSR halt 흐름(202~254행), FPB와 Z0/Z1(256~284행)은 이 글에만 있다. |
| E | 7 | description(5행)의 TAP 상태 머신(40~52행), SWD 패킷(123~132행), DAP·FPB·DWT·ITM·ETM(134~356행)을 다룬다. 제목의 'ARM 디버그 인터페이스 비교'에 해당하는 JTAG 대 SWD 비교는 107행 한 문장과 412~413행 정리뿐이고 비교 표가 없다. Cortex-M 중심(190행)이라 6~8 구간. |
| F | 7 | 13행이 Ch1 RSP 아래 계층이라는 위치를 밝힌다. 424행 다음 장 안내는 seriesOrder 3 chapter03('OpenOCD 심화 분석', 123행 target 설정, 201행 TCL, 265행 Custom 명령, 310행 Flash driver)과 맞다. 428행 ch01, 429행 ch03, 430행 part5-06 라벨이 대상과 맞다. 본문에 전제 지식 링크가 없고 ch06(ITM·ETM 심화)로 보내는 안내가 없으며 audit:reading·모바일 확인을 안 해 7. |
| G | 2 | 431~432행 ARMv7-M ARM(DDI0403)·ADIv5(IHI0031)는 'latest' 링크라 판 번호가 없고, 본문 레지스터 비트(206~219, 260~264, 288~299행)·IDCODE(67~75행)와 문서 절이 연결되지 않는다. 코어·보드·OpenOCD 버전 표기도 없다. |

uncertainties:
- 270행 FP_CTRL 0x00000010을 'NUM_CODE=2'로 읽었다. 글이 필드 위치를 정의하지 않아 모순으로 확정할 수 없고, 195·258행 '6개'와 다른 것은 칩별 차이일 수 있다.
- 271행: 264행 배치로는 bit0이 ENABLE인데 0x08000125의 +1을 'Thumb'로 설명한다. FP_COMP 비트 배치 미확인.
- 278행 Thumb BKPT를 '명령어 한 바이트'로 갈아 끼운다고 적었다(Thumb 명령은 16비트). 1차 자료 미확인.
- 356행 'Cortex-M7/M33은 ETM-M4 옵션 탑재'와 'M7은 보통 탑재'는 표현이 모호해 모순으로 확정하지 않았다.
- 103행 JTAG 체인 문맥에 SWD 용어 'Invalid ACK'를 IR 길이 오류 증상으로 적었다. 출처 미확인.
- 306행 DWT 예제에 DEMCR.TRCENA 설정이 없다(perf part5-07 63행은 켬). 필요 여부는 ARMv7-M ARM으로 확인해야 한다.
- 119행 0x79E7, 74~75행 IDCODE 값, 274행 코어별 BP 개수, 376행 Vref '1.65V~3.3V', 143행 AP 뱅크 크기는 1차 자료로 대조하지 않았다.

병합 대상: 병합 대상 없음. DP·AP·DHCSR·FPB 절(134~284행)이 시리즈 안에서 이 글에만 있다. 판정은 오류 확인으로 우선 조치이고 다음 조치는 보강: (1) 235·215~217·168·254행 모순을 ARMv7-M ARM·ADIv5로 대조해 고친다. (2) SWO·ITM·ETM 중복(172~182, 317~356행)은 ch06으로 줄이고 링크한다. (3) 레지스터 표에 문서 판·절 번호를 붙인다.

### `debugging/embedded/chapter03-openocd.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1): 52행 '`-d3`는 디버그 레벨 3(최대)'와 430행 '레벨 0~4. 3이면 모든 SWD 트랜잭션, 4면 더 (USB raw). 신호 무결성 의심 시 4까지'는 같은 옵션 범위에 대한 두 구체 진술이라 동시에 참일 수 없다. 497행 정리 '`-d3`가 신호 문제 추적의 마지막 무기'는 52행 쪽을 따른다. git log(35baac92 게이트·다이어그램, 0a9dd7bc slug, be973200 topic, ac24bb76 제목, 400892d7 linter, c99833a1 callout, 35e57912 디렉터리 이름)에는 1차 자료 대조 커밋이 없어, 모순이 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 이 글만의 해설: 110행 HLA 어댑터가 raw SWD를 못 보내 기능이 제한된다는 구분, 156~158행 work area와 `-work-area-backup 0`의 대가, 319행 flash 알고리즘을 SRAM에서 CPU로 돌리는 이유, 474~485행 오류 메시지별 원인·해법 표, 420행 RDP L1→L0 전체 erase 해석. 나머지는 사용자 가이드 명령 목록 수준이다(148~154행 TCL 명령 표, 183~199행 이벤트 표, 205~232행 메모리·flash 명령, 403행 RTOS 나열). part12-10(18)보다 낮고 part7-05(9)보다 높다. |
| B | 13 | 구조(19행)→실행(32행)→interface(97행)→target(123행)→init/reset(160행)→TCL(201행)→custom cfg(265행)→flash driver(310행)→RTT(327행)→SWO(346행)→multi-core(363행)→RTOS(394행)→RDP(407행)→log(424행)→CI(441행)→함정(472행)→정리(487행)로 description 범위를 끝까지 간다. 52/430행 모순, 172~177행 레지스터 주석, 433~437행 로그 출처가 열려 있어 AP-C-24 B ≤ 13. 382행 '멀티 인페리어 … 도구 체인 한계'는 한계를 설명하지 않는다. |
| C | 7 | 그대로 칠 수 있는 명령(35·41~48·68~73행), board cfg(269~306행), CI 스크립트(443~468행)가 있다. 보드·OpenOCD 버전·프로브가 없고 121행 '보통 1000~8000 KHz', 319행 '64KB … 수십 초', 325행 '~2배 향상', 344행 '수십 Hz vs 수백 Hz'는 출처·환경이 없어 C ≤ 8. 예상 출력은 412행과 433~437행뿐이고 합격·실패 관찰 표가 없다. 458~460행 CI는 openocd 종료(455행) 뒤 UART 캡처를 시작한다. 4~7 상단. |
| D | 8 | 비교한 글: 같은 시리즈 chapter02·04-jlink·06-trace·07-rtos-troubleshooting, 다른 시리즈 gdb-lldb/chapter08-remote-debugging.md, modern-recipes/part10-03-gdb-remote-debug.md. 35행 실행 명령 = ch08 375행 = part10-03 39행. 62~66행 포트 표 = ch08 386행. 382행 '멀티 인페리어 … 도구 체인 한계' = ch08 484행. RTT 333·335행 = ch08 688~689행. tpiu/itm 350·356행 = ch08 711~712행 = ch06 156·159행 = ch02 179·338~339행. RTOS-aware 397~398행 = ch07 25~26행 = part10-03 151행. RDP 415~417행 = ch07 389~392행. 485행 nrf5 mass_erase = ch07 398행. 이 글에만 있는 것은 target cfg 해설(125~158행), reset 이벤트 표(183~199행), TCL proc·board cfg(236~306행), flash driver 내부(310~325행). 5~9 구간. |
| E | 8 | 제목 'Configuration·Adapter·Target 통합'과 description(5행)의 TCL 인터프리터·target/interface 설정·flash driver·custom 명령·multi-core가 97·123·201·265·310·363행 절로 답해진다. 대상 독자·전제가 없고 flash driver 절(310~325행)이 일반 네 단계뿐이라 9 이상은 아님. |
| F | 6 | 501행 'Ch 4 — J-Link / Segger 도구 체인'은 seriesOrder 4 chapter04-jlink.md와 맞다. 505행 Ch 2, 506행 Ch 4 라벨이 대상 제목과 맞다(파일을 열어 대조). 509행 소스 경로는 링크 없는 참고. 본문에 전제 지식 안내(ch02 선행)가 없고 고유 구조는 H2 구분과 487~497행 정리뿐이라 7 이상은 아님. |
| G | 2 | 본문 출처는 507행 OpenOCD 문서 루트, 508행 TCL 8.6 reference, 321·509행 `src/flash/nor/` 경로다. 버전은 325·329행 'OpenOCD 0.11+' 두 곳뿐이고 출처가 없다. 126~143행 `target/stm32f4x.cfg` 발췌의 버전, 172~177행 레지스터 주소의 reference manual이 없다. |

uncertainties:
- 172~177행 `mww 0x40023800 0x00000001`의 '외부 클럭으로 전환' 주석: STM32F4 RCC_CR이라면 bit0은 HSION이다. 177행 0x40002000 '워치독 비활성화'도 reference manual로 확인하지 않았다(기억 기반 의심).
- 296행 nrf52 cfg `mww 0x40000700 1` 주석을 product specification으로 확인하지 않았다.
- 433~437행 로그: `targets.c:2032 cortex_m_examine()`처럼 파일명과 함수가 맞지 않아 보이고 `transport.c`의 `jtag_libusb_bulk_read()` 위치도 미확인. 439행 설명과 433행 내용도 다르다. 실행 기록인지 구성한 예인지 알 수 없다.
- 75행 '6666(JSON-RPC 비슷)' 프로토콜 형식 미확인.
- 325행 'OpenOCD 0.11+ async transfer, ~2배', 329행 'RTT 0.11+', 344행 폴링 빈도 비교는 출처가 없다.
- 403행 RTOS 목록과 183~199행 이벤트 이름을 사용자 가이드와 대조하지 않았다.
- 412행 `stm32f4x option_read 0` 출력 형식과 417행 `option_write 0 0xaa 0xff` 인자 의미 미확인.
- 282행 `verify_image`(접두어 없음)와 230행 `flash verify_image`가 둘 다 유효한지 미확인.
- 365행 'Cortex-A9 + Cortex-M3 … (i.MX6, OMAP4)' 조합이 실제 SoC와 맞는지 미확인.
- 401행 RTOS-aware 절의 '베어메탈 디버깅에서 매우 유용'은 오타성 산문 실수로 보고 오류 확인에 넣지 않았다.
- 458~460행 CI 스크립트가 openocd 종료 뒤 UART 캡처를 시작해 부팅 로그를 놓칠 수 있다.

병합 대상: 병합 대상 없음. 시리즈에서 OpenOCD 설정 파일·이벤트·flash driver를 다루는 글은 이 글뿐이고 ch10·ch12·ch13이 이 글을 OpenOCD 참조처로 링크한다. 판정은 오류 확인으로 우선 조치이고 다음 조치는 보강: 52/430행 디버그 레벨 모순을 OpenOCD 사용자 가이드로 확인해 고치고 497행 정리도 맞춘다. RTT·SWO·RTOS·RDP 절(331~337·348~358·396~398·409~417행)은 ch06·ch07·gdb-lldb ch08로 링크하고 이 글은 OpenOCD 내부에 집중한다. 출처 없는 수치(121·319·325·344행)는 1차 자료로 확인하거나 지운다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** 두 시리즈 모두 git 이력이 작성·폴리싱·linter·제목 일괄 변경(ac24bb76)·slug·topic 커밋뿐이다. 오류 확인 6편을 뺀 4편(4-06·4-08·5-02·5-04)은 미검증이라 점수가 80을 넘어도 유지가 될 수 없다. 두 시리즈 모두 `/fact-check-round` 대상이다.
- **출처·환경 없는 '측정' 절 (Embedded C++ 6편).** 4-06 398~406행('STM32F4, -Os'만), 4-07 308~326행, 4-08 376~390행, 5-01 428~450행, 5-02 379~416행, 5-03 409~423행. 컴파일러·버전·플래그·측정 방법이 없어 루브릭 3-1 C ≤ 8이 걸렸고 6편 C가 4~5다. 같은 비교를 글마다 다른 숫자로 쓴다(4-06 ~400 B·~800 B vs 4-07 380 B·720 B). 4-08 기록상 시리즈 41편 중 39편에 '## 측정' 절이 있다. 5-04는 측정이 없는데 484행에서 '측정 가능한 주장만 사용했고'라고 쓴다. Debugging 3편도 출처 없는 수치가 있다(ch01 168·378·383행, ch02 168·254·368·420행, ch03 121·319·325·344행).
- **그대로 컴파일되지 않는 코드 조각 (Embedded C++ 7편 전부, AP-C-35).** 미정의 식별자·함수 밖 문장·서로 맞지 않는 시그니처: 4-06 64·166·173·177·261·147~148행, 4-07 134~135·151~166행, 4-08 49·186~193행, 5-01 147·166·364·370행, 5-02 39·239·250·272행, 5-03 143~148·271~286·331행, 5-04 194·317·325·333·348행.
- **본문에 1차 출처·버전이 없음 (10편 전부).** Embedded C++ 7편 모두 G 1~2(4-07만 Boost.SML 무버전 링크), Debugging 3편 G 2(관련 항목의 문서 루트·'latest' 링크뿐: ch01 485~486행, ch02 431~432행, ch03 507~509행). reference manual 판·C++ 표준판·컴파일러·SDK·GDB·OpenOCD 버전이 본문 주장에 붙지 않는다.
- **같은 코드·설명이 시리즈 안에서 반복 (D 감점, Embedded C++ 7편 전부).** constexpr transition table(4-06 306~334행 ≈ 4-07 43~71행), etl::fsm(4-06 197~272행 ≈ part4-02 179~243행), Uart<0x40004400>(5-01 298~337행 ≈ 5-03 36~73행, 클록값 168 vs 84 MHz), RAII guard(5-01 353~375행 ≈ 5-03 323~349행), Gpio 템플릿·`ldr 0x40020018 / movs #32 / str` 어셈블리(part2-06 167~205행, 5-01 247~294행, 5-02 54~127행), 보드 헤더 typedef(5-02 286~326행 ≈ 5-04 179~200행), IUart + 생성자 주입(4-08 253~279·307~352행 ≈ 5-04 216~237·309~339행). 주제마다 정본을 정하고 다른 쪽은 링크로 줄인다.
- **같은 OpenOCD·RSP 줄이 Debugging 장과 다른 시리즈에 반복 (Debugging 3편 전부).** `tpiu config internal /tmp/swo.log uart off 168000000 2000000`이 ch02 179·338행, ch03 350행, ch06 156행, gdb-lldb ch08 711행. RSP 역사·패킷 형식·qSupported(ch01 30·36~41·240~254행 ≈ gdb-lldb ch08 29·31~40·92~106행). `-rtos FreeRTOS/auto`(ch03 397~398행, ch07 25~26행, recipes part10-03 151행), RDP 해제(ch03 415~417행, ch07 389~392행).
- **링크 없는 관련 항목이 draft 글을 가리킴 (Embedded C++ 3편 이상).** 4-06 424행(GoF 20), 4-08 407·408행(GoF 5, TDD 43), 5-04 480·431~432행(TDD 49, Refactoring Catalog, GoF). 4-08 기록상 part1-01 307행, part2-01 488행, part2-08 493행, part3-08 399행에도 같은 모양이 있다. 루브릭 F에 따라 해당 글은 F ≤ 5. 8bf4703f에서 draft 대상 링크를 텍스트로 남긴 흔적으로 보이며 시리즈 단위로 한 번에 정리한다. ch01 487행도 링크 없는 항목이다.
- **제목 키워드가 본문에 없거나 부분 이행 (E 6 이하, 6편).** 4-06 'Table-driven 비교'(비교표에 없음), 4-07 'runtime 코드 0'(5·39행 vs 320행), 4-08 'Phantom'(2행뿐), 5-01 '비트 필드 접근'(151행에서 접음), 5-03 'UART·SPI·I2C 공통 인터페이스'(UART 전용 concept), 5-04 'Static·Dynamic·Hybrid'(본문 용어 없음). ac24bb76 제목 일괄 변경 뒤 생긴 불일치로 보인다.
- **산문 안 개수 표기 실수 (3편, 오류 확인 아님).** 4-08 '세 가지 대안'(15·29·397행) vs 대안 4(196행), 5-04 '패턴은 3가지'(468행) vs 4개, 5-04 Part 편수 vs 불릿 수(369·378·399행), 4-06 '5-state FSM'(400행) vs 3-state 예제.
- **공통 H2 뼈대 (Embedded C++ 7편 전부, Debugging 3편).** Embedded C++는 '한 줄 요약 → 어떤 문제를 푸는가 → … → 자주 보는 함정과 안티패턴 → 측정 → 정리 → 관련 항목 → 다음 글'(예: 4-06 13·17·356·398·410·419·426행, 5-01 13·17·377·428·452·461·468행, 5-03 13·17·383·409·425·434·441행), Debugging은 '정리 → 다음 장 예고 → 관련 항목'(ch02 422~424행, ch03 487·499·503행). 글마다 고유 절이 있어 P0는 아니지만 루브릭 9절 scaled content 수치 기록 대상이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 6편부터 글 안 모순을 고친다. 각 모순을 1차 자료로 정하고 출처를 적은 커밋을 남긴다: ch01(escape 178/365행, 체크섬 83행, RLE 349~357행, 빈 응답 221·409행 — GDB 매뉴얼 Remote Protocol 장), ch02(DHCSR 213~217·235행, SWD 클럭 168행, 254행 — ARMv7-M ARM·ADIv5), ch03(디버그 레벨 52/430/497행 — OpenOCD 사용자 가이드), 5-01(USART_CR1 비트 그림 tex vs 318행 — STM32F4 reference manual, '동일' 비교 294·443행), 5-03(432행 결론 vs 측정, 186·429행 교체 주장 vs concept), 4-07(5·15·39행 'runtime 0' vs 73·320행, 150행 주석 vs 153행).
- 병합 검토 4편은 모두 다음 조치가 보강이다. 중복 정본 결정이 먼저다: compile-time table은 4-07, etl::fsm은 4-06과 part4-02 중 하나, Uart·RAII guard는 5-01과 5-03 중 하나, Gpio 템플릿은 5-02, 보드 헤더·DI는 5-04/4-08 중 하나.
- Embedded C++ '측정' 절은 실측 환경(컴파일러·버전·플래그·보드·측정 방법)과 함께 다시 재거나 TBD로 바꾸는 방식을 시리즈 단위로 정한다. 측정 기록이 없으면 수치를 새로 만들지 않는다.
- draft 글을 가리키는 링크 없는 관련 항목(4-06·4-08·5-04 외 시리즈 내 여러 편)과 5-04 428~430행 다음 시리즈 편수를 한 번에 고친다. 다시 채점할 때 F가 바로 반영된다.
- 다른 장 링크 라벨이 ch03의 옛 제목 'Ch 3: OpenOCD 깊이'를 쓰는 곳(ch02 424·429행, ch04 420행, ch07 458행)은 해당 글 채점 루프에서 F로 확인한다.
- 두 시리즈를 `/fact-check-round` 대상으로 올릴지는 사용자가 정한다. 오류 확인이 없는 4편도 검증 커밋이 생겨야 유지 판정이 가능하다.
