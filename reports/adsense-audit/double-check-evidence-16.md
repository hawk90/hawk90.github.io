# 공개 글 루프 16 근거 초벌 대조

> 대상: Embedded C++ 7편, Embedded Debugging 3편. 최종 점수 및 오류 판정은 Sol 검토 대상.
> 각 `source_file`은 전체를 1행부터 끝까지 읽었다. A~G 표의 근거 줄, D의 비교 파일/대응 구간, F의 링크 target과 뒤 설명을 확인했다. 1차 자료 fetch와 코드 실행은 하지 않았으며 아래 확인 필요 항목에 표시했다.

## 글별 대조

### embedded-cpp/part4-06-state-machine.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part4-06-state-machine.md`, 1–428행 전체.
- A/B/C: 기존 근거 위치 동의. 특히 ETL 예제 261행 `PausedState` 미정의, 263행 state 목록, TCP 예제의 `Packet`/`Conn` 등 미정의, 측정 398–408행에 환경 일부(STM32F4, -Os)는 있으나 compiler·version·방법은 없는 것을 확인. 48행 “네 이벤트”는 코드에 Resume handler가 없지만, diagram 자료와 대조해 diagram에는 Resume이 있음을 확인해야 하는 이견을 남김.
- D: part4-07 43–70행과 이 글 302–339행의 constexpr transition table/next_state 구조가 겹침. part4-02 179–243행과 이 글 197–272행 ETL FSM 골격, part3-08 98–185행과 이 글 104–160행 variant 내용도 대응한다. 다른 시리즈 Modern Embedded Recipes part6-02는 C switch FSM이라 역할 구분 가능. 비교 근거 동의.
- E/F: 제목의 Visitor/Table-driven 약속과 실제 본문 범위 차이는 286–339행. 421–423행 관련 링크는 title/대상 맞음. 424행 GoF State는 무링크·draft 항목. 428행 next target은 part4-07, order 35, 설명도 맞음.
- G/factcheck: ETL upstream/API 및 C++ constexpr 표준 확인 필요. 내부 기술 주장끼리 모순 확정은 보류하고 `미검증` 유지가 적절해 보임. compile-time 절의 미정의 `EventId`(309행) 및 ETL API·함수 밖 코드 조각은 컴파일/자료 확인 필요.

### embedded-cpp/part4-07-compile-time-fsm.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part4-07-compile-time-fsm.md`, 1–348행 전체.
- A/B/C/E/G: 근거 동의. 39행 “runtime 코드와 데이터 모두 0”은 73행 `.rodata` 설명 및 320행 `.text: 180 B`와 양립하지 않음. 150–154행 catch-all 주석은 invalid 전이 유지라 말하지만 153행 static_assert 실패, 170행도 컴파일 오류라고 설명한다. 308–326행 측정에 보드/compiler/flags/method 없음.
- D: part4-06 302–339행 ↔ 이 글 43–71행 table 코드, 104–160행 ↔ 116–170행 variant 설명, 397–405행 ↔ 308–326행 FSM 측정 구조가 대응. 다음 편 part4-08은 주제 다름. 해당 비교에 동의.
- F: 341–344행 대상은 part4-06·part2-04·part3-08·Boost.SML이며 제목/주제 일치. 348행 next part4-08 title/order 36 및 설명 일치.
- 3-1: 두 내부 충돌은 원문 자체에서 확인되므로 기존 `오류 확인` 근거 충족. 다만 152–153행 템플릿 static_assert 동작은 C++ 표준 판에 따라 별도 확인. 측정 신뢰도는 별도 미검증.

### embedded-cpp/part4-08-singleton-alternatives.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part4-08-singleton-alternatives.md`, 1–412행 전체.
- A/B/C/E/G: 4가지 패턴(31–226행), 예제, 측정(376–392행)이 보고서 근거와 맞음. 보고서가 놓친 영향 가능성으로 15행 “세 가지”지만 대안 절은 4개(Template Injection 포함)임을 기록. 이것은 rubric상 개수 표기 실수라 factcheck 오류로 확정하지 않음.
- D: 현재 part5-04 216–237·309–352행에 hardware singleton + IUart interface/DI 패턴이 이 글 253–279·307–352행과 구조 및 결론이 유사하다. 기존 보고서의 미포함 비교를 추가함. part5-04가 점수 검토 대상의 같은 C++ 시리즈여서 직접 비교. 점수 조정은 Sol 판단.
- F: 405–406행 링크 label/target 일치. 407–408행 GoF 5/TDD 43은 무링크이며 대상은 draft. 412행 next part5-01은 order 37 및 설명 일치.
- 3-1: 내부 기술 모순은 확정 못함. C++11 local-static thread safety/`-fno-threadsafe-statics`, destructor lifetime, compiler guard 비용은 C++ standard/compiler sources 필요. 376–392행 measurements no compiler/board/method → 신뢰 미확인.

### embedded-cpp/part5-01-register-abstraction.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part5-01-register-abstraction.md`, 1–470행 전체.
- A/B/C/E/G: 근거 동의. 22–25행 ODR read-modify-write와 434–435행 ODR access를 macro와 같은 동작처럼 비교하지만, 288–290행 BSRR 단일 store 예와 달라 294행 “macro와 완전히 동일”의 비교 쌍이 모호하다. 측정 428–446행에는 compiler/MCU/flags/method 미기재. USART register layout/bit positions(296–335행)에는 target family/source가 없음.
- D: part5-02 54–127·379–416행이 GpioPort/BSRR/template/assembly 예를 이 글 243–294·428–446행과 공유. part5-03 36–75·323–375행 UART 및 RAII는 이 글 296–375행과 유사. Modern Embedded Recipes part1-05는 실제 원리 비교 참고로는 허용되는 D 비교 대상이며, 대상 제외 규칙과 혼동하지 않음.
- F: 463–466행 대상 label과 파일 제목 맞음. 470행 next part5-02 order 38, 설명 맞음.
- 3-1: 기존 `오류 확인`은 294·443행 “동일” 문장과 각 본문 코드의 서로 다른 register/access 방식에 기반. 쌍이 같은 연산 비교인지가 모호해 강도 확인 필요; 그 자체가 명백한 산술/기술 모순인지는 ARM/STM32 자료로 확인해야 함. 따라서 초벌상 확인 필요로 표시, Sol이 재판정.

### embedded-cpp/part5-02-gpio-abstraction.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part5-02-gpio-abstraction.md`, 1–435행 전체.
- A/B/C/E/G: 근거 동의. 39행 `Gpio<GpioA,5>`와 정의 템플릿 55행 `uintptr_t`/실사용 주소형 alias(100–101행), `ConfiguredGpio::init`·`set` 빈 구현(186–192행), EXTI placeholder(264–280행), 동일 매핑의 두 보드(314–323행), 비교 어셈블리에 build metadata 없음 확인.
- D: part2-06 templates 167–205행 ↔ 이 글 13–48·54–127행의 same GPIO template; part5-01 247–294·428–445행 ↔ 54–127·379–416행; part5-04 179–200행 ↔ 284–326행 board alias 구조. 비교 범위와 겹침 지적 동의. Modern Embedded Recipes part4-03-gpio-driver는 C 레지스터 관점이라 차별화 가능.
- F: 428–431행 링크 targets와 titles 일치. 435행 next part5-03 order 39와 UART/SPI/I2C 설명 일치.
- 3-1: `미검증` 지지. 같은 보드 이름의 실제 핀 할당, GPIO clock/mode 규칙은 board manual/STM32 reference manual 필요. API/assembly claims는 compiler·보드 자료 필요. 빈 placeholder는 완결성 문제이지 즉시 factcheck 오류는 아님.

### embedded-cpp/part5-03-peripheral-abstraction.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction.md`, 1–443행 전체.
- A/B/C/E/G: 근거 위치 동의. `UartInterface` 요구(168–172행)와 `IsrUart`/`DmaUart` 공개 메서드(83–155행)가 맞지 않는데 186행은 그대로 교체 가능하다고 말함. `Peripheral::init()` 인자 없음(331행) vs UART `init(baud,pclk)`(48행), 343행의 `PeripheralGuard<Uart2>`도 독립된 API 불일치. HAL 비교 결론(423·432행)과 결과(414–420행), 8.7ms 산술은 1000 bit / 115200 ≈ 8.68ms로 맞지만 코드 크기/성능 주장은 근거 없음.
- D: part5-01 298–337·353–375행 ↔ 이 글 36–77·323–349행 UART/RAII; part2-10 concepts 164–181행 ↔ 164–186행 UartInterface 패턴. Modern Embedded Recipes part4-07 UART C driver는 동일 mode 질문을 다른 C 관점으로 설명; 비교 허용. 기존 D 겹침 근거 동의.
- F: 436–439행 label/targets 일치, 443행 next part5-04 order 40, 설명 맞음.
- 3-1: 코드/산문 인터페이스 충돌(168–186 및 83–155행)은 자체적으로 확인 가능하며 기존 `오류 확인` 근거 성립. 성능 표의 주장도 내부 결론 상충 가능성이 크나 exact claim은 HAL upstream/source/build metadata 필요. Register bits/DMA mapping/ADC SWSTART는 STM32F4 reference manual 필요.

### embedded-cpp/part5-04-hal-design-patterns.md

- `source_file`: `src/content/blog/embedded/embedded-cpp/part5-04-hal-design-patterns.md`, 1–490행 전체.
- A/B/C/E/G: 4개 pattern(53–241행)과 468행 “3가지” summary 간 불일치 확인(개수 표기). 216–221행 IUart에는 `send`, 325·348행은 `send_string`; 317행 ISpi 및 333행 StmSpi 미정의; 194행 static `LedGpio::set()`는 interface 예의 비정적 함수와 모순; 237·332행 StmUart forms 다름. 484행 “측정 가능한 주장만”과 이 글에 방법·수치가 없는 점도 확인.
- D: part5-02 284–325행 board aliases ↔ 이 글 178–209·262–263행; part4-08 155–193행 composition-root/wiring and mock ↔ 이 글 309–339행; part2-08 183–232행 CRTP peripheral ↔ 116–176행. 서로 다른 시리즈 comparison도 루브릭상 유효하며, Recipes 제외 대상 여부와 무관함.
- F: 475–479행 링크 targets/titles 일치. 480행 TDD 49 무링크·draft. 시리즈 마지막이라 next series recommendation: 428–430행 link target prefaces는 존재하나 chapter counts가 틀림(보고서의 50/45/145와 현재 site count 대조는 별도 site inventory 확인 필요). 431–432행 무링크 추천 항목.
- 3-1: 여러 코드/산문 API 충돌은 원문으로 보이나 C++ 표준/API 의미 확인이 필요한 것도 섞였다. 초벌 기준으로 명백한 내부 사실 오류라기보다 컴파일 확인 후보로 분류; 기존 `미검증` 유지. SDK/header/compiler version 및 최소 컴파일이 필요.

### debugging/embedded/chapter01-rsp-protocol.md

- `source_file`: `src/content/blog/tools/debugging/embedded/chapter01-rsp-protocol.md`, 1–487행 전체.
- A/B/C/E/G: 기존 근거 및 위치 동의. 178행은 escape를 `0x7d ^ byte`라 하고 365행은 `0x7d + (X XOR 0x20)`라 표현해 형식이 서로 다르다. 41행 payload checksum 규칙에서 `!`의 합은 0x21이므로 83행 `$!#04` 예시는 내부 불일치. 349–355행의 run-length 예도 repetition 수·문자수 계산이 서로 안 맞는다. 221·409행 `$$#00`도 36·41행 frame 규칙의 빈 payload 응답과 다르게 보인다. 이 네 지적은 원문 근거로 확인되며, 공식 RSP 명세로 protocol 해석을 확인할 1차 자료 후보를 남김.
- D: 기존 report 대응 대상은 `gdb-lldb/chapter08` 92–106행; 해당 fragment/lines should be rechecked in current tree before score use. RSP is a clear standalone chapter and D 9 plausible. No unlisted comparison invented.
- F: 483–486행 links: ch02 target title 맞음; GDB/LLDB ch1 title 맞음; official GDB protocol URL + LLDB doc link labels match. 479행 “Ch2” sequence is correct; no prose explanation after section's related links.
- 3-1: existing `오류 확인`은 178 vs 365, 41 vs 83, 349–355 run-length 산술에서 원문 내부 모순으로 지지된다. 221/409도 frame 정의와 충돌하는 듯하나 빈 응답 표기 자체는 공식 GDB Remote Protocol spec으로 판독할 필요가 있다. 적어도 앞의 산술/escape 예시는 3-1 조건 충족 후보가 강하다.

### debugging/embedded/chapter02-jtag-swd-coresight.md

- `source_file`: `src/content/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight.md`, 1–434행 전체.
- A/B/C/E/G: 기존 오류 근거 4건을 원문으로 다시 확인했다. 213–214행 표에 S_HALT=bit17/S_REGRDY=bit16인데 235행 0x00010003 주석은 S_HALT=1이라 하지 않는다. 215행 reserved [5:2]는 216–217행 C_MASKINTS bit3/C_STEP bit2와 충돌. 161행 32-bit per packet 및 168행 3–4 packet이면 data-only 96+ bits가 되는데 30–40 clocks라고 병기. 250–252행 한 register read의 세 번 access와 254행 16 register를 17 packet 왕복이라는 설명도 긴장한다. 258–275행 comparator count, SWD timing 등은 별도로 ARM docs/part-specific reference manual로 확인 필요.
- D: 기존 비교는 ch06 ETM 333–336행, chapter07/08 references; current line mapping needs target inspection before relying on it. Modern Embedded Recipes exclusion is only for scored candidates; external same-topic comparison is permitted. Performance Engineering part5-06 is explicit link at 430행 and can be a valid D comparator.
- F: 428–433행: ch01 and ch03 target titles match; Performance Engineering part5-06 link label/explanation (Streamline/TRACE32) matches its indicated subject; official ARM docs/CMSIS-DAP links match labels. 424행 next ch03 exists and topic matches.
- 3-1: 기존 네 내부 모순 사유는 원문 위치로 확인되어 rubric 기준을 충족하는 근거가 있다. 다만 161/168·250/254의 packet/clocks 표현은 실제 SWD/AP transaction의 정의·ACK/wait-state를 ARM ADI v5로 대조하고 해석해야 하며, 이를 원문만으로 오류 확정할 수 있는지 Sol 최종 검토 필요. DHCSR 표/덤프 비트 모순은 본문 내 명확한 산술·비트 일치 문제.

### debugging/embedded/chapter03-openocd.md

- `source_file`: `src/content/blog/tools/debugging/embedded/chapter03-openocd.md`, 1–509행 전체.
- A/B/C/E/G: existing factcheck 근거 확인. 52행은 `-d3`를 “최대”라 하고 430행은 level 0–4라 하며 level 4가 더 많이 출력된다고 한다. 같은 옵션이 레벨 최대인지 아닌지 원문 두 진술이 충돌한다. OpenOCD versioned docs로 실제 level 상한을 확인해야 한다. 50–58, 110–121, 156–169, 325–344행 등의 동작/버전 주장도 공식 OpenOCD docs/source 필요.
- D: original report comparator locations include embedded chapter 01 and Modern Embedded Recipes chapter 7-05; comparator use is valid for overlap under rubric D even though Recipes isn't scored. Need current counterpart lines before relying on exact overlap. Standalone OpenOCD scope remains distinct from generic kernel build.
- F: 505–508 related links to ch02/ch04 and official OpenOCD/Tcl docs have labels that match. 501행 next chapter ch04 title/series progression correct. 509행 source path is prose, not linked.
- 3-1: 52 vs 430행은 같은 verbosity level range에 관한 직접 충돌이라 기존 `오류 확인` 근거가 rubric 기준을 충족한다. 옵션의 정확한 가능한 값/출력은 공식 OpenOCD documentation으로 추가 확인한다.

## 앵커 및 보고서 판정 근거

- Loop 16의 anchor refs도 `10550ca1` 당시 `src/content/blog/embedded/modern-recipes/` 하위의 part1-04, part6-09, part7-05 경로로 확인하는 방식이며 anchor는 D 비교 자료와 별개다.
- loop 16의 기존 `오류 확인` 여섯 건은 4-07, 5-01, 5-03, ch01, ch02, ch03이다. 원문상 근거 pair를 모두 재확인했다. 5-01의 register bit field 및 5-03의 peripheral APIs는 정확한 MCU family/SDK와 1차 자료 확인을 거친 뒤 최종 판단해야 한다.
- 15번 메모의 범위 문장을 고쳤다: Modern Embedded Recipes는 재채점 대상에서만 제외이며, 루브릭 D의 다른 시리즈 비교 대상으로는 허용된다.
