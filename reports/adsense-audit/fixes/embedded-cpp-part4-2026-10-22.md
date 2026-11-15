# Embedded C++ Part4 수정 기록 (2026-10-22)

기존 published-loop-15(01~05),published-loop-16(06~08) 근거를 전문과 대조해 수정했습니다. 재채점·점수·판정·factcheck 파일은 변경하지 않았습니다. 장별 변경 전후 SHA와 세부 결정은 같은 이름의 JSON에 있습니다. remediated는 본문 오류 수정의 상태이며 모든 target/board 동작 검증 완료가 아닙니다.

Clang/LLVM23.1.3 macOS arm64, C++17 host ASan+UBSan으로 기사에 이름을 붙인 코드블록을 직접 추출했습니다. 03의 M0/M4는 headerless builtin ELF 오브젝트 검사이며 runtime link/board 실행은 아닙니다. 02/06은 기존 로컬 ETL20.49.0 headers를 read-only로 사용했고 관련 header SHA도 기록했습니다.

```bash
node scripts/verify-embedded-cpp-part4-examples.mjs 01
ETL_INCLUDE=/path/to/etl-20.49.0/include node scripts/verify-embedded-cpp-part4-examples.mjs 02
node scripts/verify-embedded-cpp-part4-examples.mjs 03
node scripts/verify-embedded-cpp-part4-examples.mjs 04
node scripts/verify-embedded-cpp-part4-examples.mjs 05
ETL_INCLUDE=/path/to/etl-20.49.0/include node scripts/verify-embedded-cpp-part4-examples.mjs 06
node scripts/verify-embedded-cpp-part4-examples.mjs 07
node scripts/verify-embedded-cpp-part4-examples.mjs 08
```

8개 예제 검증과 장별 publish gate는 exit0입니다. inlineMath8편과 diff whitespace도 통과했습니다. upstream cited-symbol 검사는 clone 부재로 SKIPPED이며 PASS로 계산하지 않습니다. 전체 사이트 빌드/렌더 검사는 parent 통합 단계에서 수행합니다.

## Part4-01: part4-01-intrusive-containers.md

1. **맥락·범위:** 고정 주소 객체를 list가 빌려 쓰는 intrusive 경계
2. **문제 신호·반증 조건:** std::list iterator erase O(n), 미초기화 sentinel, 안전하지 않은 이중 삽입/erase와 근거 없는 cycle/ms 비교가 문제입니다. 객체가 연결되기 전에 초기화되고 더 오래 살며 실제 다른 API를 쓴 경우는 구분합니다.
3. **원인 가설·대안:** allocator·객체 수명·hook 저장 공간과 복잡도를 혼합한 것이 원인입니다. owner guard와 복사 금지를 둔 교육용 list, lifetime 계약, 올바른 std::list 복잡도를 반영했습니다.
4. **증거:** Boost.Intrusive·C++ list.modifiers·Linux list.h를 대조했습니다. 정상2node 순회/erase/clear, 이중 삽입·wrong-container erase 거부, 독립 hook 동시 가입과 BAD_COPY compile failure를 실행했습니다.
5. **표본 범위:** 자작 list와 정상/거부 경계를 포함합니다. Boost/ETL intrusive library와 실제 RTOS scheduler는 빌드·실행하지 않았습니다.
6. **결정:** remediated: 잘못된 복잡도·수명 가정을 고치고 재현 예제로 대체했습니다. 도식의 O(n)도 O(1)로 수정하고 allocator와 node 저장 공간을 구분했습니다.
7. **가장 작은 안전한 변경:** URL·frontmatter 보존. 소유권 이전/삭제/시리즈 병합은 하지 않았습니다. 추가 owner 포인터 비용과 node 선행 수명을 명시했습니다.
8. **검증·잔여 위험:** host ASan·UBSan+copy failure, gate 통과. diagram은 single target 재빌드·stamp 확인·시각 확인 및 bbox overlap=0/touching=0 검사를 수행했습니다. node 재배치·연결 중 파괴·ISR 동시 사용은 지원 계약 밖이며 target 변경 시 재검증합니다.

로그: [예제](embedded-cpp-part4-01-examples.log) · [gate](embedded-cpp-part4-01-gate.log)

## Part4-02: part4-02-etl-library.md

1. **맥락·범위:** 고정 capacity ETL 저장 정책과 오류 처리
2. **문제 신호·반증 조건:** size>capacity로 string truncation을 검사하고 예외/abort/무시를 기본 동작처럼 서술한 것이 문제입니다. ETL 판과 설정이 다른 실제 동작은 별도 비교합니다.
3. **원인 가설·대안:** compiler 예외 사용과 ETL_THROW_EXCEPTIONS·ETL_CHECK_PUSH_POP·error_handler 정책을 혼동했습니다. 판 고정 source와 정상·고갈·unknown event probe로 대체했습니다.
4. **증거:** 로컬 ETL20.49.0 version/platform/error_handler/vector/basic_string/fsm/delegate 헤더를 직접 확인했습니다. vector4개/5번째 vector_full, string4byte truncation, delegate42와2state FSM start/unknown/stop을 실제 실행했습니다.
5. **표본 범위:** 고갈 정상 처리와 미정의 event를 포함합니다. no-exception handler 분기·router·observer·모든 ETL 컨테이너를 실행한 것은 아닙니다.
6. **결정:** remediated: 잘못된 설정·누락 FSM 상태 처리·router message 생성자를 수정하고 재현 불가능한 15배 크기 주장 대신 검증 조건을 기록했습니다.
7. **가장 작은 안전한 변경:** URL·frontmatter와 대표 API 개관 보존. capacity 저장 위치를 항상 bss라고 하지 않고 T/callback 자체의 allocation 계약을 분리했습니다.
8. **검증·잔여 위험:** host ASan·UBSan, pinned capacity/FSM 실행과 gate 통과. no-exception 제품 오류 handler, target library 및 board 메모리 예산은 제품 통합 시 확인합니다.

로그: [예제](embedded-cpp-part4-02-examples.log) · [gate](embedded-cpp-part4-02-gate.log)

## Part4-03: part4-03-lock-free-basics.md

1. **맥락·범위:** atomic 기본 API와 Cortex-M/ISR 적용 조건
2. **문제 신호·반증 조건:** atomic=단일 명령=deterministic ISR-safe, M0 atomic API 전면 미지원 같은 일반화가 문제입니다. 특정 target의 lock-free/ISR 보장 증거가 있으면 그 범위에서만 적용합니다.
3. **원인 가설·대안:** 언어 atomicity·알고리즘 진행성·코어 명령·runtime helper를 한 의미로 취급했습니다. 실제 코드 생성과 release/acquire 게시, CAS expected 갱신을 구분했습니다.
4. **증거:** C++ atomic lock-free/order·Clang builtin·CMSIS PRIMASK 문서를 대조했습니다. host2thread payload42 게시와 CAS mismatch7/success9, M4 LDREX/STREX와 M0 __atomic_fetch_add_4 참조를 확인했습니다.
5. **표본 범위:** host 기능과 M0/M4 ELF 코드를 포함합니다. M0 helper 링크·board ISR·contention WCET는 실행하지 않았습니다.
6. **결정:** remediated: cycle 수·항상 가장 빠름을 제거하고 weak CAS의 spurious failure, seq_cst 범위, IRQ 상태 복원과 SPSC capacity>=2 조건을 반영했습니다.
7. **가장 작은 안전한 변경:** URL·frontmatter·입문 API 구조 보존. 성능 수치만 지우고 성공 단정으로 바꾸지 않았으며 실제 관찰과 미검증 한계를 본문에 기록했습니다.
8. **검증·잔여 위험:** ASan·UBSan host 및 ARM object 검사, gate 통과. host interleaving 표본은 증명이 아니며 ISR/helper/retry 상한은 target과 runtime 변경 때 재검증합니다.

로그: [예제](embedded-cpp-part4-03-examples.log) · [gate](embedded-cpp-part4-03-gate.log)

## Part4-04: part4-04-lock-free-container.md

1. **맥락·범위:** SPSC 구현과 MPMC/reclamation 경계
2. **문제 신호·반증 조건:** 동일 EventBus를 여러 consumer와 SPSC로 동시에 설명하고 안전하지 않은 union freelist를 완성 pool처럼 제시했습니다. 정확히 한 producer/consumer와 별도 수명 프로토콜이 있으면 다르게 판단합니다.
3. **원인 가설·대안:** 인덱스 소유권·node 재사용·wake token과 item 개수를 혼합했습니다. SPSC는 N-1/overflow/slot 회수 계약으로 검증하고 MPMC 골격은 명시적으로 제품 구현 범위에서 제외했습니다.
4. **증거:** C++ atomic order·Boost.Lockfree·ConcurrentQueue README를 대조했습니다. N4 capacity3, empty/full/wrap,2thread100000 FIFO와 N0 static_assert failure를 실행했습니다.
5. **표본 범위:** 기본 경계와 장시간 순환 FIFO 표본을 포함합니다. 완성 Treiber reclamation·RTOS semaphore deadline·Boost/moodycamel 실행은 포함하지 않습니다.
6. **결정:** remediated: EventBus를 단일 consumer로 고치고 semaphore 주입·stale wake hint·실제 timeout 한계를 명시했습니다. union을 lifetime 분리 설계 조각으로 바꾸고 실제 MPMC 완성이라고 주장하지 않습니다.
7. **가장 작은 안전한 변경:** URL·frontmatter·SPSC 구현 보존. custom MPMC를 임의로 새 library로 대체하지 않고 node 수명/ABA 검증이 추가로 필요함을 명시했습니다.
8. **검증·잔여 위험:** ASan·UBSan+FIFO/compile failure와 gate 통과. 전체 interleaving/board ISR/DMA coherence/WCET 및 MPMC reclamation은 미검증입니다. target 도입 전 해당 계약을 검증합니다.

로그: [예제](embedded-cpp-part4-04-examples.log) · [gate](embedded-cpp-part4-04-gate.log)

## Part4-05: part4-05-type-safe-flags.md

1. **맥락·범위:** enum flags와 register field/tag 경계
2. **문제 신호·반증 조건:** 존재하지 않는 Flags operator|=, all검사로 AnyError 판정, GPIO MODER 3bit mask·2bit stride 충돌과 bounded 출력 오류가 문제입니다. abstract flag와 실제 MCU field를 구분해야 합니다.
3. **원인 가설·대안:** 독립 bit flags·mutually-exclusive field·strong typedef를 같은 OR 연산으로 취급했습니다. compound operators, any/all,2bit pure encoding과 role tag를 분리했습니다.
4. **증거:** C++ enum/operator 계약·ST RM0090 field를 대조했습니다. Flags 추가/제거·빈mask·any/all·pin5 이웃 bit 보존·pin16/무효mode 거부, enum혼합/tag혼합 각각 compile failure를 실행했습니다.
5. **표본 범위:** 정상 조합과 잘못된 입력/type 경계를 포함합니다. 실제 USART/GPIO MMIO·interrupt·clock 설정은 실행하지 않았습니다.
6. **결정:** remediated: wrapper API를 완성하고 raw 정수 암묵 변환을 막았습니다. SR bit 배치·AnyError 검사·snprintf capacity 처리를 고치고 제목의 Tag/Strong typedef를 실제 예제로 이행했습니다.
7. **가장 작은 안전한 변경:** URL·frontmatter 보존. hardware 접근 대신 일반 정수 pure function을 써 board 미검증을 성공으로 오인하지 않게 했습니다.
8. **검증·잔여 위험:** ASan·UBSan·두 compile failure·gate 통과. 실제 RMW 경합·MMIO side effects·성능 동일성은 target에서 후속 검증합니다.

로그: [예제](embedded-cpp-part4-05-examples.log) · [gate](embedded-cpp-part4-05-gate.log)

## Part4-06: part4-06-state-machine.md

1. **맥락·범위:** 미디어 FSM의 enum/variant/table/ETL 선택
2. **문제 신호·반증 조건:** diagram의 Resume와 코드 Play재개 불일치, PausedState 누락, C++23 필요성 및 상태 수별 임의 크기 순위가 문제입니다. state/event 정책을 달리 설계했다면 그 계약을 먼저 명시합니다.
3. **원인 가설·대안:** 표현 방식을 고정된 발전 단계와 크기 순위로 취급했고 상태/event 정의가 분산됐습니다.3state4event ETL/table 완성 probe와 명시적 무시 정책으로 대체했습니다.
4. **증거:** C++ variant.visit/constexpr·ETL20.49 fsm.h를 대조했습니다. Play/Pause/Resume/Stop과 Stopped+Pause/Paused+Play 무시, C++17 table sequence·미정의 전이 유지를 실행했습니다.
5. **표본 범위:** 정상 sequence와 미정의 event를 포함합니다. 실제 playback action·TCP·HSM·원래 variant 조각 전체는 실행하지 않았습니다.
6. **결정:** remediated: 누락 상태/이벤트와 비교표를 고치고 variant fallback이 자동 exhaustive가 아니며 RAM 절감도 조건부임을 명시했습니다.
7. **가장 작은 안전한 변경:** URL·frontmatter와 비교 주제 보존. runtime 구현 상세와 compile-time 검증의 역할을 분리하고 미발행 GoF 링크 안내 대신 공개 근거를 제공했습니다.
8. **검증·잔여 위험:** ASan·UBSan ETL/table과 gate 통과. library 갱신·event policy 변경 시 회귀하며 board 코드 크기/전이 action과 재진입은 별도입니다.

로그: [예제](embedded-cpp-part4-06-examples.log) · [gate](embedded-cpp-part4-06-gate.log)

## Part4-07: part4-07-compile-time-fsm.md

1. **맥락·범위:** compile-time 전이 검증과 runtime dispatch의 구분
2. **문제 신호·반증 조건:** runtime 코드0 약속, std::visit catch-all static_assert가 정상 event까지 막는 문제, cycle에서 종료하지 않는 recursive reachability가 문제입니다. 완전히 상수 평가된 단일 계산은 runtime 코드가 없어질 수 있습니다.
3. **원인 가설·대안:** 고정된 전이 정의와 실제 동적 state/event를 혼동했습니다. template 호출의 invalid와 runtime fallback을 분리하고 visited 집합을 유한 횟수 갱신했습니다.
4. **증거:** C++ constexpr·variant.visit 계약과 SML 저장소를 대조했습니다. 정상 runtime sequence, cycle/terminal/orphan 도달성, BAD_TRANSITION/BAD_REACHABILITY 실패, 정상 variant fallback과 BAD_VISIT_FALLBACK 실패를 실행했습니다.
5. **표본 범위:** 정상과 고립 상태·cycle·잘못된 조합·visit의 다른 alternative까지 포함합니다. SML/HSM 실제 library는 빌드하지 않았습니다.
6. **결정:** remediated:0비용/바이트·cycle 숫자 대신 코드/데이터가 남는 조건과 실제 정상·실패 예제를 반영했습니다. HSM 부모 type 조각은 미완성 개념임을 명시했습니다.
7. **가장 작은 안전한 변경:** URL·날짜·seriesOrder 보존. self-transition 없는 graph 가정과 외부 table index/중복 검증 한계를 기록했습니다.
8. **검증·잔여 위험:** ASan·UBSan 및3가지 의도한 compile failure, gate 통과. arbitrary graph/duplicate edges/SML runtime/board cost는 별도 검증입니다.

로그: [예제](embedded-cpp-part4-07-examples.log) · [gate](embedded-cpp-part4-07-gate.log)

## Part4-08: part4-08-singleton-alternatives.md

1. **맥락·범위:** Singleton의 전역 접근·초기화·주입·수명 계약
2. **문제 신호·반증 조건:** 모든 Singleton 폐기·GoF권고 단정, 초기화 thread-safe와 member thread-safe 혼동, 다른 concrete type fake 테스트와 runtime0 비용 주장이 문제입니다. 단일 자원 접근이 실제 요구라면 전역 접근과 별개로 검토합니다.
3. **원인 가설·대안:** 유일성·전역 접근·저장 기간·DI를 같은 축으로 비교했습니다. 명시적 local wiring, 공통 ILogger fake, 등록/해제와 phantom role tag로 대체했습니다.
4. **증거:** C++ block initialization·termination·GCC guard 옵션을 대조했습니다. fake주입/read message, locator미등록/등록/해제,정상LoggingTag와 DiagnosticTag 혼합 compile failure를 실행했습니다.
5. **표본 범위:** 정상 교체와 null 등록 경계·type mismatch를 포함합니다. 실제 Uart singleton 초기화·RTOS/ISR guard·board size는 실행하지 않았습니다.
6. **결정:** remediated: 초기화/파괴 규칙·create_once specialization 저장 계약을 고치고 제목의 Phantom을 type-safe role ref 예제로 이행했습니다. 근거 없는 KB 비교와 미발행 책 링크를 제거했습니다.
7. **가장 작은 안전한 변경:** URL·frontmatter 보존. hardware 소유권을 임의 변경하지 않았고 fake std::string이 host 검사 전용임을 명시했습니다.
8. **검증·잔여 위험:** ASan·UBSan+phantom compile failure와 gate 통과. global registry의 동시 교체·재귀 초기화·abnormal shutdown은 별도 프로토콜로 확인합니다.

로그: [예제](embedded-cpp-part4-08-examples.log) · [gate](embedded-cpp-part4-08-gate.log)

Part4-01 도식 자산은 tex/SVG 한 쌍을 함께 수정했고 재빌드 stamp를 확인했습니다. 코드·성능 수치를 실제로 재현하지 못한 보드 사례를 확인한 측정처럼 남기지 않았습니다. ETL의 기타 API, Boost/SML/moodycamel 전체 적용과 target qualification은 이 루프의 실행 범위 밖입니다.

메타데이터 예외: Part4-07 description의 확인된 `runtime 코드 0` 오류만 장단위 수동 정정했습니다(parent 승인, rule06 예외). slug/date/series/seriesOrder 및 공개 상태는 보존했으며 JSON afterSha256을 갱신했습니다.
