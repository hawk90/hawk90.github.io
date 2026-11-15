# 공개 글 독립 재채점 — 루프 16

평가일 2026-10-18. 루브릭 v1.2·anchors·antipatterns를 적용했다. 기준 HEAD `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 대상 10편 전문을 직접 읽고 Luna 초벌 `double-check-evidence-16.md` 및 기존 `published-loop-16.md`와 대조했다. 원문·기존 보고서·사용자 미커밋 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

기존 보고서 커밋 `ba9f7104` 이후 대상 10편과 아래 D 비교 구간에 사용한 파일은 변경되지 않았다. 점수/게이트 차이는 평가 재판정이며 비교글 변경 효과가 아니다. Modern Embedded Recipes는 D 비교에 허용된다. UART/ISR/Build 앵커는 루프15에서 직접 읽은 `git show 10550ca1:src/content/blog/embedded/modern-recipes/<part1-04-uart-hardware.md|part6-09-isr-api.md|part7-05-kernel-build.md>`의 과거 전문과 앵커 문서 점수49/40/50을 사용했다. 현재 개선본·Part12 rename과 섞지 않았다.

짧은 C++ 파일명은 `src/content/blog/embedded/embedded-cpp/`, Debugging은 `src/content/blog/tools/debugging/embedded/`, GDB/LLDB는 `src/content/blog/tools/debugging/gdb-lldb/`, Recipes는 `src/content/blog/embedded/modern-recipes/`, Performance는 `src/content/blog/embedded/performance-engineering/` 기준이다. D의 양쪽 대응 구간은 직접 열람했고 F는 후행 설명까지 실제 slug·title·seriesOrder·draft와 대조했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `embedded-cpp/part4-06-state-machine.md` | 11 | 10 | 5 | 8 | 6 | 5 | 1 | 46 | 미검증 | 병합 검토 |
| `embedded-cpp/part4-07-compile-time-fsm.md` | 12 | 9 | 5 | 9 | 6 | 7 | 2 | 50 | 오류 확인 | 우선 조치 |
| `embedded-cpp/part4-08-singleton-alternatives.md` | 10 | 11 | 5 | 9 | 6 | 5 | 1 | 47 | 미검증 | 병합 검토 |
| `embedded-cpp/part5-01-register-abstraction.md` | 10 | 10 | 5 | 8 | 6 | 7 | 1 | 47 | 오류 확인 | 우선 조치 |
| `embedded-cpp/part5-02-gpio-abstraction.md` | 10 | 8 | 5 | 8 | 6 | 6 | 1 | 44 | 미검증 | 병합 검토 |
| `embedded-cpp/part5-03-peripheral-abstraction.md` | 10 | 8 | 4 | 8 | 5 | 7 | 1 | 43 | 오류 확인 | 우선 조치 |
| `embedded-cpp/part5-04-hal-design-patterns.md` | 11 | 9 | 4 | 10 | 7 | 4 | 1 | 46 | 오류 확인 | 우선 조치 |
| `debugging/embedded/chapter01-rsp-protocol.md` | 13 | 12 | 6 | 9 | 7 | 6 | 2 | 55 | 오류 확인 | 우선 조치 |
| `debugging/embedded/chapter02-jtag-swd-coresight.md` | 14 | 12 | 7 | 10 | 7 | 7 | 2 | 59 | 오류 확인 | 우선 조치 |
| `debugging/embedded/chapter03-openocd.md` | 14 | 13 | 7 | 8 | 8 | 6 | 2 | 58 | 오류 확인 | 우선 조치 |

합계495, 평균49.5, 범위43~59로 이전 총점과 같다. 총점 동의10/10, 판정 동의9/10이다. 5-04는 B−1/E+1로 같은46점이나 컴파일로 오류를 확인해 우선 조치로 변경했다. 오류 확인7편·미검증3편, 우선 조치7편·병합 검토3편이다. P0는 본문 범위에서 미발견. [공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 통과를 인용하며 기술 주장 검증·실제 모바일 육안 검사를 수행했다고 표현하지 않는다.

| 파일 | 이전총점 | 새총점 | 차이 | 이전판정 | 새판정 | 항목 동의/변경 |
| --- | ---: | ---: | ---: | --- | --- | --- |
| `embedded-cpp/part4-06-state-machine.md` | 46 | 46 | 0 | 병합 검토 | 병합 검토 | A~G 동의 |
| `embedded-cpp/part4-07-compile-time-fsm.md` | 50 | 50 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `embedded-cpp/part4-08-singleton-alternatives.md` | 47 | 47 | 0 | 병합 검토 | 병합 검토 | A~G 동의 |
| `embedded-cpp/part5-01-register-abstraction.md` | 47 | 47 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `embedded-cpp/part5-02-gpio-abstraction.md` | 44 | 44 | 0 | 병합 검토 | 병합 검토 | A~G 동의 |
| `embedded-cpp/part5-03-peripheral-abstraction.md` | 43 | 43 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `embedded-cpp/part5-04-hal-design-patterns.md` | 46 | 46 | 0 | 병합 검토 | 우선 조치 | B10→9: static 호출 실패 확인; E6→7: 실제 interface/template/mixed가 제목 의도를 이행 |
| `debugging/embedded/chapter01-rsp-protocol.md` | 55 | 55 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `debugging/embedded/chapter02-jtag-swd-coresight.md` | 59 | 59 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |
| `debugging/embedded/chapter03-openocd.md` | 58 | 58 | 0 | 우선 조치 | 우선 조치 | A~G 동의 |

## 오류게이트와 초벌 채택/기각

Luna의 원문 위치·실측 조건 부재·대부분 D/F 대조를 채택했다. 초벌은 점수를 확정하지 않았으므로 위 표는 기존 최종 점수와 비교한다. 4-08의 part5-04 비교는 새 누락 발견이 아니라 기존 보고서 더블 체크에서 이미 반영된 비교다. E는 제목의 단어가 본문에 그대로 있는지만 보지 않는다. 5-04의 Interface+Implementation(53행), Template(116행), Mixed(211행)는 Dynamic/Static/Hybrid의 실질적인 비교이므로 E7로 재판정했다.

언어/API 의미가 필요한 결함은 컴파일 전에는 오류로 올리지 않았다. Homebrew clang23.1.3, arm64-apple-darwin25.6.0 환경에서 다음 최소 예를 검사했다. 모두 문법 검사이며 MCU 실행이나 전체 글 컴파일 검증이 아니다.

| 글 | 확인 근거·입력·명령·결과 |
| --- | --- |
| 4-07 | 39행 runtime 코드/데이터 모두0 ↔ 73행 table은 .rodata·320행 동일 compile-time 방식의 .text180B. 전반의 ‘모두0’와 글 자체의 실재 비용 주장이 상반된다. 150행 유지 주석 ↔170행 static_assert 실패 설명도 상반된 동작 설명이다. 단순 ‘최소’(15행)와 ‘0’ 문구 차이만으로 확정한 것이 아니다. 템플릿 코드 동작의 추가 오류는 미검증으로 남겼다. |
| 5-01 | 기존 294행 ‘매크로와 동일’는 어떤 매크로인지 모호하고443행은 크기 비교여서, 다른 코드가 보인다는 사실만으로 모든 주장 오류를 증명하진 못한다. 원문179~189행 GpioRegs·154~159행 GpioMode·248~274행 GpioPort와 434행 ODR 연산을 별도 함수에 넣어 `clang++ --target=armv7m-none-eabi -mcpu=cortex-m4 -mthumb -O2 -S -std=c++17 /private/tmp/adsense-loop16-mmio.cpp -o /private/tmp/adsense-loop16-mmio.s` exit0. macro_set은 ODR주소0x40020014에서 ldr/orr/str, template_set은 BSRR주소0x40020018에 str로 실제 다르다. typedef는 uint32_t=unsigned int, uintptr_t=__UINTPTR_TYPE__만 사용했다. 특정 MCU 동작/모든 옵션의 크기까지 검증한 것은 아니다. 더 명확한 게이트는 원문299~332행 Uart와356~366행 UartGuard에 `<cstdint>`, `<cstddef>`, `int main(){UartGuard<Uart2> uart;}`만 붙인 `/private/tmp/adsense-loop16-reg_guard.cpp`. `clang++ -std=c++20 -fsyntax-only` exit1, 실제 선언에 shutdown이 없다는 진단. 오류 확인 유지 근거를 이 컴파일 결과로 보강한다. |
| 5-03 | 원문37~71행 Uart/Uart2,326~340행 PeripheralGuard를 그대로 추출하고 표준 정수/크기 헤더·main만 추가. `clang++ -std=c++20 -fsyntax-only /private/tmp/adsense-loop16-peripheral_guard.cpp` exit1: enable_clock/shutdown/disable_clock 없음 및 init의 인자2개 부족. 343행 사용 예와 직접 연결되므로 오류 확인 유지. HAL wrapping이 더 빠르다는432행과 blocking 비교표만으로 새 오류를 확정하지 않았다(다른 구현/조건 가능). |
| 5-04 | 원문122~133행 hal::GpioBase,138~149행 hal::stm32::StmGpio,183행 LedGpio alias,194행 static 호출을 그대로 추출하고 `<cstdint>`·main만 추가. `clang++ -std=c++17 -fsyntax-only /private/tmp/adsense-loop16-hal_static.cpp` exit1, `call to non-static member function without an object argument`. alias가 바로 앞의 동일 타입을 가리키므로 미검증→오류 확인. 216행 전역 IUart와325·348행 hal::IUart는 namespace·예제 전제가 달라질 수 있어 send_string 누락만으로 단정하지 않았다. |
| ch01 | 41행 payload합 규칙 ↔83행 `$!#04`는 ASCII '!'=0x21과 불일치.178행 XOR0x7d ↔365~368행 escape-prefix0x7d+XOR0x20도 상반된다. [GDB Remote Protocol Overview](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Overview.html)에서 modulo256 checksum, 0x7d prefix 뒤 원바이트 XOR0x20, repeat-count=encoded−29를 직접 확인했다(2026-10-18). 따라서178행 escape 규칙과355행 N+29 디코딩 설명은 공식 규칙과 맞지 않는다.221·409행 `$$#00`는 빈 payload 프레임 `$#00`와도 다르다. 오류 확인 유지, 전체 프로토콜/버전 주장이 검증된 것은 아니다. |
| ch02 | 213~214행 S_HALT=17/S_REGRDY=16 ↔235행0x00010003의 S_HALT=1 주석은 bit17이0이라 모순.215행reserved[5:2] ↔216~217행 C_MASKINTS[3]/C_STEP[2]도 동일 비트의 정의 충돌. 이 두 근거로 오류 확인 유지.161·168행packet수/clock수 및250~254행access/17packet 비교는 transaction 뜻·캐시/배치 전제가 필요해 추가 미검증으로 분리했다. |
| ch03 | 52행 -d3 최대 ↔430행 동일 옵션의0~4범위 및4추가출력은 명시 범위 충돌. 외부 규격에서 어느 쪽이 맞는지는 별도이나 두 주장이 함께 참일 수 없어 오류 확인 유지.497행 ‘마지막 무기’ 같은 비유만으로 확정한 것이 아니다. |

## 글별 근거

### part4-06-state-machine.md

source_file: `src/content/blog/embedded/embedded-cpp/part4-06-state-machine.md`

score_status: 잠정 · score:46 · confidence:중간 · factcheck:미검증 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 FSM 개수·API·성능 대조 미완료. uncertainties:155행exhaustive가능은권고/가능표현이므로현else만으로오류확정안함.304행C++23필요성·261행PausedState·EventId누락·ETL판미검증.48행네이벤트는diagram.tex의Play/Pause/Resume/Stop과일치하나코드는Play로재개한다.

| 항목 | 근거 |
| --- | --- |
| A11 | 52~285행 enum→variant→ETL 단계는 일반 입문.162~195행 TCP 상태 데이터 예·345~352행 logging 통합이 고유 응용으로 ISR보다 조금 구체적이다. |
| B10 | 26~408행 문제/구현/비교/함정/측정 완결.261행 PausedState·310행 EventId 정의 누락과 HSM294~300행 짧은 설명이 한계. 불확실 때문에 B≤13. |
| C5 | 400행 STM32F4/-Os만 있고 compiler/ETL판/측정방법 없음.402~406행 수치에 §3-1 C≤8. 예상 관찰·독립 빌드 절차 없어5. |
| D8 | 306~334행 ↔ part4-07 43~71행 constexpr table/loop 중복.197~272행 ↔ part4-02 179~243행 ETL 골격.104~160행 ↔ part3-08 98~185행 variant. Recipes part6-02-task-design.md85~110행은 task 내부 C switch라 독립 C++선택 질문이 남는다. |
| E6 | 2행 Variant/Visitor/Table-driven 중 table은302~337행 있으나288~292행 비교표에 없다. 주제 범위는 맞지만 비교 약속 부분 이행. |
| F5 | 421~423행4-02/4-07/3-08 라벨·설명과 공개 대상 일치,428행next4-07 order35.424행GoF20은무링크·실제 programming/design/gof-design-patterns/item20-state.md draft:true라F≤5. |
| G1 | 202행ETL이름은있으나본문공식출처/ETL판/컴파일러판없음.400행보드/최적화이름만으로G상향안함. |

병합 대상: part4-07의 table·part4-02의 ETL 절. 다음 조치: runtime 방식 선택 의도로 보강하고 공통 구현은 정본으로 줄인다.

### part4-07-compile-time-fsm.md

source_file: `src/content/blog/embedded/embedded-cpp/part4-07-compile-time-fsm.md`

score_status: 잠정 · score:50 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 runtime 비용의 자체 주장 충돌. uncertainties:134~135행get_time constexpr조건·151~166행std::visit 인스턴스화·304행etl::hsm API미검증. 다른 예제의비용차이만으로오류확정하지않았다.

| 항목 | 근거 |
| --- | --- |
| A12 | 77~114행 specialization·242~284행 reachability/dead-end는 표준 API목록 이상의 설계 질문.234~237행HSM은빈몸체라 UART보다약간높은정도. |
| B9 | table→template→variant→SML/HSM→검증/함정 구성.150/170행 invalid동작 설명이 상반되고234~237행부모추적없음. B≤13. |
| C5 | 308~326행 .text/cycles에 보드·compiler·옵션·프로그램없어 §3-1 C≤8.32~36행 진단이 있어도 실제 합격/실패 실험 전체가 아님. |
| D9 | 43~71행 ↔ part4-06 302~334행table,116~170행 ↔4-06 104~160행variant,219~240행 ↔4-06 294~300행HSM 개괄. 앞글이339행심화링크하므로 독립 검증 질문이 일부 남는다. 다음4-08 31~153행DI는다른주제. |
| E6 | 2행템플릿검증을77~114·242~284행다루지만5행runtime0과320행180B로약속신뢰저하. |
| F7 | 19·118행전제4-06,341~343행4-06/2-04/3-08의runtime/table/variant설명실제내용대응.348행next4-08 order36.344행Boost.SML저장소. 고유단계안내있어7. |
| G2 | 174·344행Boost.SML공식저장소링크는있으나태그·컴파일러·비용출처없음. |

병합 대상: part4-06 중복 table 절. 다음 조치: 비용·invalid동작 설명부터 정정하고 검증 전용 역할로 보강.

### part4-08-singleton-alternatives.md

source_file: `src/content/blog/embedded/embedded-cpp/part4-08-singleton-alternatives.md`

score_status: 잠정 · score:47 · confidence:중간 · factcheck:미검증 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 초기화·테스트·guard비용 대조 미완료. uncertainties:15/29행세대안과196행네번째는개수표기.168~170행localstatic과389행noguards는다른wiring예를비교했을수있다. destructor순서·threadsafe옵션·GoF권고미검증.

| 항목 | 근거 |
| --- | --- |
| A10 | 155~193행main wiring/test·253~279행hardware interface는실용적이나일반DI패턴.307~352행도동일아이디어를되풀이한다. |
| B11 | 31~226행4대안→hardware→함정→container→측정흐름완결.186~193행FakeLogger테스트가concreteSensor와어떻게맞는지불분명,B≤13. |
| C5 | 376~392행4.2/3.8KB·120B는보드/compiler/source없어§3-1C≤8. mock검사예가있으나테스트실행/결과없음. |
| D9 | 31~56행 ↔part1-06-startup-code.md236~245행localstatic,253~279·307~352행 ↔part5-04 216~237·309~339행interface/wiring.31~226행대안선택이라는전담질문은남는다. 이비교는기존더블체크에이미반영됐다. |
| E6 | 2행ServiceLocator/StaticInit이행,Phantom은본문에없음. 키워드일부미이행6~8구간. |
| F5 | 226행2-08CRTP·405행1-06초기화·406행3-10ownership설명맞음.412행next5-01 order37.407~408행GoF5/TDD43무링크·각실제item05-singleton.md/pattern43-singleton.md draft:true로F≤5. |
| G1 | 33·55행C++11threadsafe·299행destructor주장·376~390행비용에1차출처/환경없음. |

병합 대상: part5-04 DI 공통 예. 다음 조치: Singleton 대안 선택의 독립 의도를 살려 보강.

### part5-01-register-abstraction.md

source_file: `src/content/blog/embedded/embedded-cpp/part5-01-register-abstraction.md`

score_status: 잠정 · score:47 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 UartGuard<Uart2>의없는shutdown컴파일확인. uncertainties:294행어떤macro와동일인지모호함은해결안됨. UARTclock/encoding·426행64bitaccessfault·도식USART비트위치미대조. ARM출력은명시한옵션하나의결과다.

| 항목 | 근거 |
| --- | --- |
| A10 | 38~108행registerwrapper·174~294행struct/객체/template단계는일반입문.353~375행RAII는있어도실제구성실패로고유검증기여낮음. |
| B10 | macro→wrapper→field→CMSIS→객체/template→UART/RAII흐름.147·166행GPIOA_MODER전제빠짐,Guard실패로예제통합불완전.B≤13. |
| C5 | 286~294·428~446행어셈블리주장에조건없어§3-1C≤8. 이번crosscompile은보고서검증이며본문재현성가점아님. |
| D8 | 247~292·428~445행 ↔part5-02 55~127·379~416행GPIO/template/asm.298~336·353~375행 ↔part5-03 36~75·323~349행UART/guard.54~70·178~197행 ↔Recipes part4-02-mmio-access.md25~69행volatile/struct.400~406행 ↔Performance part3-07-mmio.md107~114행RMW. registerwrapper정본역할은남는다. |
| E6 | 2·5행타입안전/volatile/field를38~170행이행.151행field를복잡하다며접고다른패턴으로넘겨선택기준은약함. |
| F7 | 375행RAII→2-01,463~466행4-05/5-02/5-03/2-06모두실제제목/내용대응.470행next5-02 order38. 매크로→구조체→template단계구성이글고유길잡이. |
| G1 | 176행CMSIS이름만있고manual·CMSIS판·UART클록환경없음. |

병합 대상: part5-02 GPIO·part5-03 UART/RAII 중복 절. 다음 조치: guard API 정정 후 register 표현의 정본으로 보강.

### part5-02-gpio-abstraction.md

source_file: `src/content/blog/embedded/embedded-cpp/part5-02-gpio-abstraction.md`

score_status: 잠정 · score:44 · confidence:중간 · factcheck:미검증 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 구현·핀설정·compiler대조미완료. uncertainties:39행GpioA타입전제와55행주소NTTP관계·145행volatile병합가능·182행출력pullup불가제약·314~323행보드mapping미검증. placeholder자체는오류게이트아님.

| 항목 | 근거 |
| --- | --- |
| A10 | 129~167행그룹/mask·169~225행config/concept·284~326행boardalias가있지만일반template응용이다. |
| B8 | 186~191행init/set빈몸체·264~280행EXTIplaceholder·356~358행clock비어있어컴파일타임검증/보드독립약속을완결못함.B≤13. |
| C5 | 119~127·395~413행asm에compiler/flags없어§3-1C≤8.224행blink호출은있으나실행조건/관찰결과없음. |
| D8 | 54~127·379~416행 ↔part5-01 247~294·428~445행동일BSRR/asm.13~48·54~127행 ↔part2-06-templates-basics.md167~205행GPIOtemplate/alias/asm.286~326행 ↔part5-04 179~200행boardalias. Recipes part4-03-gpio-driver.md15~48행은실제C레지스터설정관점이라질문구분. |
| E6 | 2행template/concept는55~225행있지만보드독립예314~323행은두보드가같은alias.5행설정검증은빈init이라부분이행. |
| F6 | 52행전제2-06,428~431행2-06/4-05/5-01/5-03라벨맞음.435행next5-03 order39·UART/SPI/I2C실제절있음.239행재작성class와383~414행혼합코드블록때문에7수준의명확한안내는아님. |
| G1 | 231행datasheet참조라고만하고정확한보드/STM32판·compiler출처없음. |

병합 대상: part2-06 GPIO 맛보기·part5-01 GPIO 절. 다음 조치: GPIO 전담 구현으로 보강하고 빈 config/EXTI는 범위를 정한다.

### part5-03-peripheral-abstraction.md

source_file: `src/content/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction.md`

score_status: 잠정 · score:43 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 제시Uart2와PeripheralGuard인스턴스의컴파일실패. uncertainties:83~155행send_async/send_dma와168~172행send/recv요구의mode호환·DMAchannel·ADCstartbit·I2C헬퍼계약미대조.432행더빠름권고와특정blocking표의차이를독립오류확정하지않았다.

| 항목 | 근거 |
| --- | --- |
| A10 | 36~315행UART/SPI/I2C/ADCwrapper는흔한패턴.228~258행CS통합은유용하나측정기반선택없음. |
| B8 | 79~162행모드·164~186행concept·323~349행RAII의결합을약속하나API가안맞고I2C/ADC초기화도생략.실제Guard컴파일실패,B≤13. |
| C4 | 411~423행100byte/115200baud만있고compiler·측정source없어§3-1C≤8.8.7ms는1000bit/115200≈8.68ms로산술정상.실행가능한통합경로부족은ISR앵커수준. |
| D8 | 36~75·323~349행 ↔part5-01 298~337·353~375행UART/RAII.164~186행 ↔part2-10-concepts.md164~181행concept요구패턴.79~162행 ↔Recipes part4-07-uart-driver.md162~180행동일모드질문이나C실장관점다름. |
| E5 | 2행UART/SPI/I2C공통interface는실제164~186행UART만제약하며186행모드대체가제시API와연결되지않음.5행세모드자체는있다. |
| F7 | 399행volatile→5-01대응,436~439행5-01/02/04/2-10관련라벨일치.443행next5-04 order40의vendor격리/다중board내용실재. UART3모드→interface→SPI/CS구조가길잡이. |
| G1 | 157행DMAchannel·306행SWSTART·411~423행HAL비교에1차출처/SDK판없음. |

병합 대상: part5-01 UART/guard 공통 부분. 다음 조치: mode별 공통 API를 먼저 검증하고 독립 peripheral 패턴으로 보강.

### part5-04-hal-design-patterns.md

source_file: `src/content/blog/embedded/embedded-cpp/part5-04-hal-design-patterns.md`

score_status: 잠정 · score:46 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 LedGpio alias의nonstatic메서드static호출실패. uncertainties:325·348행hal::IUart는앞전역IUart와namespace전제가다를수있어send_string없음단독오류기각.미정의ISpi/StmSpi·STM32/NXP동작범위·실측미검증.468행3대4는개수표기.

| 항목 | 근거 |
| --- | --- |
| A11 | 53~241행interface/template/typedef/mixed와283~339행mock/DI통합관점은유용하나일반HAL패턴.484행실증주장뒷받침없음. |
| B9 | 네패턴/배치/mock/vendor전환까지흐름은있다.183행alias→194행static사용이실제실패해10→9.317·333행SPI전제도없어통합완결성낮다.B≤13. |
| C4 | 143~146행register실장빈몸체·297~304행테스트는blink_twice없음.484행측정가능주장만썼다지만명령/관찰결과없음. 실제성능가점없어0~3바로위.수치가있으면C≤8,절차만있으면≤9인데그보다낮다. |
| D10 | 180~189·262~263행 ↔part5-02 284~325행boardalias.309~339행 ↔part4-08 155~193행wiring/mock.116~176행 ↔part2-08-static-polymorphism.md183~232행CRTPperipheral. 직전5-03 164~186행concept와이글216~241행virtualinterface는서로역할다름. |
| E7 | 2행Static/Dynamic/Hybrid는116행Template,53행virtualInterface,211행Mixed에각각대응한다.단어그대로없음만으로미이행처리한기존6을7로상향.장단점도105~114·167~176행있음. |
| F4 | 475~479행5-01/02/03/2-08/4-08·311/463행본문링크맞음.428~430행preface추천편수50/45/145는현재public57/53/153(각order0소개포함)과다르고소개제외56/52/152와도다름.480행TDD49무링크draft;431~432행미연결시리즈추천.시리즈끝의길잡이부실로4. |
| G1 | vendorSDK/version·CRTP비용·484행측정주장에실제1차출처없음. |

병합 대상: 병합 대상 없음. 다음 조치: 독립 HAL 비교 의도로 보강. static typedef API부터 맞추고 추천 편수/연결 정리.

### chapter01-rsp-protocol.md

source_file: `src/content/blog/tools/debugging/embedded/chapter01-rsp-protocol.md`

score_status: 잠정 · score:55 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 checksum/escape/RLE규칙불일치. uncertainties:91행LLDB옵션·107행Sdeprecated·168행PacketSize보편값·295행uib·310행flashwrite규칙·336행PID표기·406행버전미검증.428행외부예제존재/진위미확인으로P0단정안함.

| 항목 | 근거 |
| --- | --- |
| A13 | 240~330행feature/memory-map/monitor,438~463행증상별관찰연결은UART/Build보다고유한구조.프로토콜카탈로그범위가크고실제captured세션근거는없음. |
| B12 | framing/ACK→catalog→encoding→최소stub→보안/실전흐름완결.중요encoding규칙이불일치하고최소구현/PacketSize여러주장미대조라B≤13. |
| C6 | 75~97행트래픽노출·442~458행증상별명령있음.83행checksum잘못되어기대관찰신뢰저하.168·378~383행구체보편수치에출처·환경없어§3-1C≤8. |
| D9 | 30·36~41·240~254행 ↔GDB/LLDB chapter08-remote-debugging.md29·31~40·92~106행역사/framing/feature블록반복.비교글14행은이시리즈를심화로넘긴다.인접ch02 134~170행은물리DAP로다른질문이고이글binary/RLE/stub상세는독립역할. |
| E7 | 2·5행프로토콜/feature/vCont/RLE가36~425행전반에있다.‘모든것’약속과미검증catalog때문에9이상아님. |
| F6 | 479행nextch02 order2·483행link맞음.484행GDB/LLDBch01소개대상title/order1맞음.485~486행공식GDB/LLDB문서라벨일치.487행은실행명령자체이며없는글안내가아님.344행‘멀티패킷’아래RLE가나와길잡이약함. |
| G2 | 485~486행1차문서링크는있으나개별규칙/버전/로그주장과조항연결약함.보고서의추가공식대조는본문G가점아님. |

병합 대상: 병합 대상 없음. 다음 조치: RSP 전담 의도로 보강. encoding·checksum 정정 후 GDB/스텁판과 packet 원자료를 연결.

### chapter02-jtag-swd-coresight.md

source_file: `src/content/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight.md`

score_status: 잠정 · score:59 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 DHCSR필드/덤프bit및reserved범위내부모순. uncertainties:161/168·250/254행packet/clock비교는용어/배치조건필요로보류.129행APnDP·143행APbank·270행FPBnum·278행BKPT1byte·306행TRCENA·356행ETM종류미검증.

| 항목 | 근거 |
| --- | --- |
| A14 | 67~84행IDCODE해독·221~254행halt→register읽기·276~284행BP선택이입문표보다구체적.다만핵심덤프해석오류로상위분석수준은아님. |
| B12 | JTAG→SWD→SWO→CoreSight→신호/프로브로5행범위완결.121행역전환/150행JTAG-AP는짧고핵심비트예모순열림.B≤13. |
| C7 | 79~81·234~235·269~271·338~339행명령/출력,305~332행C코드있음.보드/tool판없고168/254/368/420행구체수치에출처·환경없어§3-1C≤8.덤프기대해석오류로7. |
| D10 | 179·338~342행 ↔Debugging chapter06-trace.md156~182행tpiu/clock.346~356행 ↔ch06 333~336행ETMhardware.303~313행 ↔Performance part5-07-baremetal-profiling.md56~70행DWT.86~101행 ↔Recipes part10-02-jtag-swd.md193~207행daisy/newtap.134~284행DP/AP/DHCSR/FPB전담질문은남는다. |
| E7 | 2·5행TAP/SWD/DAP/FPB/DWT/ITM/ETM범위는24~356행이행.비교는107·412~413행정성차이정도라9점이상아님. |
| F7 | 13행RSP아래계층위치안내,424행nextch03 order3및TCL/flash/target실제절대응.428~430행ch01/ch03/Performance part5-06 title·ETM/Streamline/TRACE32description과맞음.429행옛짧은‘깊이’는현재‘심화분석’과동의적이어서오안내아님. |
| G2 | 431~433행ARMmanual/latest·CMSIS-DAP공식링크있으나코어/칩판·구체절연결없음. |

병합 대상: 병합 대상 없음. 다음 조치: DHCSR 오류 우선 정정, DP/AP/FPB 전담으로 보강하고 trace 중복은 ch06 안내.

### chapter03-openocd.md

source_file: `src/content/blog/tools/debugging/embedded/chapter03-openocd.md`

score_status: 잠정 · score:58 · confidence:중간 · factcheck:오류 확인 · anchor_ref:UART, ISR, Build. blockers:P0 미발견/P1 같은debuglevel의최대3/최대4충돌. uncertainties:172~177행RCC/워치독·296행nRF주소·325행async2배·RTT판·403행RTOS목록·option_write인자·433~437행로그출처미검증.458~460행로그캡처시점도환경필요.

| 항목 | 근거 |
| --- | --- |
| A14 | 125~158행cfg/workarea·310~325행flash내부·474~485행증상해법이Build앵커의명령나열보다구체적.주장원자료/재현근거는부족. |
| B13 | 구조/adapter/target/reset/TCL/custom/flash/RTT/SWO/multicore/RTOS/RDP/CI로description범위를끝까지다룬다.52/430행충돌및기술의심으로B≤13상한적용. |
| C7 | 35~73행실행·269~306행cfg·443~468행CI가있다.121·319·325·344행구체속도수치는출처/환경없어§3-1C≤8.실제프로브/board/test로그부재. |
| D8 | 35·62~66·333~335·350~356행 ↔GDB/LLDB ch08-remote-debugging.md375·386·688~689·711~712행실행/포트/RTT/SWO.350~356행 ↔Debugging ch06-trace.md156~159행,397~398·415~417·485행 ↔ch07-rtos-troubleshooting.md25~26·389~398행RTOS/RDP.35·397행 ↔Recipes part10-03-gdb-remote-debug.md39·151행동일명령.125~158·183~199·236~306·310~325행cfg/event/proc/flash해설의독립역할은남는다. |
| E8 | 2·5행Configuration/Adapter/Target·TCL/custom/flash/multicore를97~392행이행.정확성한계와대상환경부족으로9이상아님. |
| F6 | 501행nextch04 order4와J-LinkGDBServer/J-Run/J-Trace/UnlimitedBP/RTT는대상15·94·197·222·256·270행실재.505~506행ch02/ch04title맞음.507~508행공식OpenOCD/TCL문서URL.509행은upstream소스경로메모라없는기사안내아님. |
| G2 | 507~509행공식문서/소스경로와325/329행0.11판언급은있으나각주장조항·cfg태그/SDK판연결없음. |

병합 대상: 병합 대상 없음. 다음 조치: debug level 설명부터 맞추고 OpenOCD cfg/event/flash 내부 전담으로 보강.

## 공통 문제와 스냅샷

컴파일 조건/출처/실행 관찰이 없는 수치·asm 비교가 C를 제한한다. 정확성 불확실이 열려 있어 모든 B≤13이다. 전편의 공통 H2만으로 F7 이상을 주지 않았으며 고유 단계·전제와 올바른 대상 연결을 별도로 적었다. 무링크 draft는4-06/4-08/5-04에서F≤5로반영했다. 단순 수량 표기, 다른 조건/구현 예, 권고나 완곡 표현은 자동 오류로 올리지 않았다. 전체 구체 주장을 대조하지 않아 검증됨/확정인 글은 없다.

아래 SHA-256은 원문 열람 후 스냅샷과 종료 시 다시 계산해 같음을 확인했다. 기존 보고서 커밋 이후 대상 diff도 없다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| part4-06-state-machine.md | 1~428행 | be2450a8ad0939851407699d160cd162c914fcceb79574d20c74ced8f839c40b |
| part4-07-compile-time-fsm.md | 1~348행 | adaf3b560feadfd7178a8df3da8397ec49b9c8d4c262feb7a1c53f74a0c9a214 |
| part4-08-singleton-alternatives.md | 1~412행 | d33a4bcd535c575dfe40e174cd553e86686d5c3028e2138a57df022ecca3b2a7 |
| part5-01-register-abstraction.md | 1~470행 | f3f6aa7fc70d64206504df83725081bb42f77cc12b88fb5d73b1a66f665c7315 |
| part5-02-gpio-abstraction.md | 1~435행 | 7fee7658c449c2726e1fca2417c59cef1004257049a76657e9df6b7fc8b30628 |
| part5-03-peripheral-abstraction.md | 1~443행 | 7faf8b441895be10f67c1f6f79831cf200c4aa698e20b44527aa3dfdc96c3297 |
| part5-04-hal-design-patterns.md | 1~490행 | 2aa8458251fb7d8d18bb958d9d6f6624b5f70f8d0c1f2bd760cdae5eaa1fe37f |
| chapter01-rsp-protocol.md | 1~487행 | ff7c9c2dfc434266a7af21abbfd03fd1bdb6614a1e66fbefe972d97f4ecbf401 |
| chapter02-jtag-swd-coresight.md | 1~434행 | 782b196817487d8d1634eb90d6727bef8193e54a59121dd018961545cd65c439 |
| chapter03-openocd.md | 1~509행 | 09a6ee6a58d7734405c3ea9b630be7ba9151c4c55857179012e70dc09fcbd7b5 |
