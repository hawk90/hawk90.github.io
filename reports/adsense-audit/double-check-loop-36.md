# 공개 글 독립 재검토 — 루프 36

기준 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 원문 전문을 직접 읽고 근거·중복 비교·링크 의미를 다시 판단했다. 초벌 evidence는 위치 탐색 참고로 사용했으며 점수를 확정 복사하지 않았다. 원문과 기존 보고서 및 사용자 파일 수정·커밋 없음.

공통 검사: [double-check-gates-2026-10-18.md](./double-check-gates-2026-10-18.md). 정적 검사 통과는 사실 검증 완료가 아니다. 앵커는 `10550ca1`의 UART(49)·Build(50) 역사 원문을 기준으로 하고, 현행 Recipes는 D 비교에만 사용한다. 실행/컴파일 검증 없이 예시를 실측으로 인정하지 않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `part2-02-blocked-list.md` | 10 | 9 | 4 | 11 | 7 | 7 | 1 | 49 | 오류 확인 | 우선 조치 |
| `part2-03-scheduler-algorithm.md` | 9 | 8 | 4 | 6 | 6 | 6 | 1 | 40 | 미검증 | 병합 검토 |
| `part2-04-context-switch.md` | 12 | 12 | 6 | 11 | 7 | 7 | 1 | 56 | 오류 확인 | 우선 조치 |
| `part2-05-cortex-m-context.md` | 13 | 12 | 5 | 11 | 7 | 5 | 1 | 54 | 오류 확인 | 우선 조치 |
| `part2-06-cortex-a-context.md` | 9 | 8 | 4 | 11 | 6 | 7 | 1 | 46 | 미검증 | 병합 검토 |
| `part2-07-riscv-context.md` | 10 | 10 | 5 | 11 | 7 | 7 | 1 | 51 | 오류 확인 | 우선 조치 |
| `part2-08-tick-timer.md` | 11 | 10 | 6 | 8 | 7 | 7 | 1 | 50 | 미검증 | 병합 검토 |
| `part2-09-tickless.md` | 10 | 7 | 4 | 10 | 6 | 4 | 1 | 42 | 미검증 | 병합 검토 |
| `part2-10-scheduler-latency.md` | 10 | 8 | 6 | 8 | 7 | 4 | 1 | 44 | 오류 확인 | 우선 조치 |
| `part2-11-tracing-observability.md` | 12 | 12 | 7 | 10 | 7 | 5 | 1 | 54 | 오류 확인 | 우선 조치 |

기존 합계 466 → 재검토 486. 2026-10-19독립재검토. Cortex-A와tickless의기존오류는동일조건/배터리용량근거부족으로철회했다.6편오류유지,2편기존미검증유지.실행/하드웨어검증없음.

### part2-02-blocked-list.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-02-blocked-list.md`
url: `/blog/embedded/rtos/practical-internals/part2-02-blocked-list`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 구조체 크기는 원문이 적은 값끼리 산술 대조했다. 실제 FreeRTOS sizeof는 config/ABI 의존이라 고정하지 않는다. state/event 두 노드의 서로 다른 list 소속을 단독 모순으로 삼지 않는다.

| 항목 | 근거 |
| --- | --- |
| A10 | delta/absolute timeout·overflow·wait list를 한 흐름으로 설명하나 실제 타이머 실험은 없어 A10 유지. |
| B9 | List_t가 count와포인터,값sentinel로이뤄지고 표는 sentinel16B/List_t20B라고한다. Cortex-M32bit에서최소4+4+16=24B라같은표의20B와맞지않아오류유지/B9. |
| C4 | delta와two-list코드는있지만실제wrap테스트·메모리측정없다.49일은1kHz32bit조건설명이부족해C4유지. |
| D11 | 직접연ready2-01 227–243행의동일delayedlist/while과비교.이글은삽입·wrap·eventwait에집중하므로D10→11.후속scheduler2-03의선택과역할다름. |
| E7 | Timeout정렬·DeltaList·TwoList라는제목에각절이대응하여E6→7. |
| F7 | 다음2-03의선택로직설명과relatedready/tick의공개title/order/slug일치.overflow삽입→swap→wake의글고유흐름으로F6→7. |
| G1 | FreeRTOS버전·list헤더·크기계산출처없어G1유지. |

전문 읽기: 1~215행. SHA-256: `9621a04f3c80644888305a03e3fd66ba207d8247fa7df11fc9aa5046118e3b91`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part2-03-scheduler-algorithm.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm.md`
url: `/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm`

score_status: 잠정 · score: 40 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: SMP도입버전과실제vTaskSwitchContext분기·config조건확인대기.매크로표현만으로컴파일오류판정하지않는다.

| 항목 | 근거 |
| --- | --- |
| A9 | 진입경로와generic/optimized선택을짧게정리한다.새로운분석결과가적어A9유지. |
| B8 | entry→selection→RR→idle→SMP흐름은있으나각경로추적이나실제호출증거가없어B8유지. |
| C4 | 축약코드와복잡도설명뿐이며버전/빌드/전환로그없어C4유지. |
| D6 | 직접연ready2-01의선택코드와freertos-source5-01 149–168행의vTaskSwitchContext를비교했다.대부분반복이나entry목록과선택호출역할이독립이라D5→6. |
| E6 | NextTaskSelection제목에generic하향탐색과CLZ/RR설명을제공해E5→6. |
| F6 | 다음context2-04와relatedready2-01의공개title/order/slug및후행저장복원설명일치.짧은코드목록위주라F6유지. |
| G1 | 버전별tasks.c/portmacro직접출처없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~148행. SHA-256: `24d227ac973f7698e4b85f3f7c0a847fe94f613b456eaf9278cd7430fa789aa4`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part2-04-context-switch.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-04-context-switch.md`
url: `/blog/embedded/rtos/practical-internals/part2-04-context-switch`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 16word64B와17word68B를같은fullcontext로적은불일치를확인.실제port별EXC_RETURN/FPU/정렬포함여부는별도확인필요.

| 항목 | 근거 |
| --- | --- |
| A12 | caller/callee→HW/SW→TCB SP→가짜frame으로원리를설명해A12유지.실제독자사례없음. |
| B12 | 앞과정리는HW8+SW8=16word64B,stacksize절은fullsave17word68B라같은context범위가일치하지않는다.다른port조건이명시되지않아오류유지/B12. |
| C6 | 168MHz비용표와frame예시는있지만실측/빌드환경과숫자근거없어C6유지. |
| D11 | 이루프Cortex-M/A/RISC-V전문을직접비교했다.기초frame과아키텍처목록은겹쳐도원리개요와port별상세역할이다르므로D10→11. |
| E7 | 레지스터보존·TCB·초기frame을단계별설명한다.분석단어만으로낮춘기존E5→7. |
| F7 | 다음Morder15·relatedscheduler/M/A/RISC-V공개title/slug/order와후행PendSV한줄추적설명일치.7단계내부재참조구조가있어F7유지. |
| G1 | AAPCS·ARM·FreeRTOS코드의원출처태그가없어G1유지. |

전문 읽기: 1~223행. SHA-256: `8c692d94024bef4fbfa10cc95b496e9804cfb99f7251b4a4bf0c3ee273017409`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part2-05-cortex-m-context.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context.md`
url: `/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: Cortex-M0코드가기존R4–R7을덮어쓴뒤같은새R4–R7을두번저장한다는동일코드/설명불일치확인.전체포트명령은실행하지않았다.

| 항목 | 근거 |
| --- | --- |
| A13 | PendSV/SVC/MSP/PSP/EXC_RETURN을명령과연결한상세가있어A13유지. |
| B12 | M0주석은R8–R11을R0–R3에옮긴다지만코드는R4–R7을덮어쓰고두번저장한다.원R4–R7보존없이결과가같다는결론과맞지않아오류유지/B12. |
| C5 | 상세assembly가있어도FreeRTOSport/tag·board·실행trace가없고95%동일수치는무출처라C5유지. |
| D11 | context2-04전문과source5-01 174–201행PendSV를직접비교했다.핸들러반복은크지만M0/BASEPRI/EXC_RETURN설명이독립이라D10→11. |
| E7 | PendSV·MSP/PSP어셈블리추적을실제로제공하므로E7유지. |
| F5 | nextAorder16및related정상target확인.1-06:ISR안에서RTOSAPI라벨은실제3-09(order30)로가므로F5상한유지. |
| G1 | ARM/TRM및FreeRTOSport원소스링크가없어G1유지. |

전문 읽기: 1~290행. SHA-256: `33715dad32a068401388b6e68000174abe43175c8f09482f91f76e225d6e5a24`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part2-06-cortex-a-context.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context.md`
url: `/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context`

score_status: 잠정 · score: 46 · confidence: 낮음~중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 기존수십usvs수us오류철회.본문이process와같은process내thread를구별해동일조건성능모순으로확정할수없다.32/64bit혼합명령·실제Zephyr포트는확인대기.

| 항목 | 근거 |
| --- | --- |
| A9 | AArch32mode/bankedregister→save/restore→MMU비용을묶으나실제포트추적이짧아A9유지. |
| B8 | thread와process비용이구별되고표도별도행이다.조건다른수치만으로기존오류를유지하지않는다.어셈블리/모드적용범위가미확인이라B8유지. |
| C4 | assembly·mode표는있으나ISA/tag·빌드·cycle측정근거없어C4유지. |
| D11 | 직접읽은context2-04의183–191행MMU목록과비교.공통목록은반복되나bankedregister와SVC저장복원은독립질문이므로D11유지. |
| E6 | Mode/SVC/BankedRegisters라는제목에표/전환단계/코드가있어E5→6. |
| F7 | 다음RISC-Vorder17의ECALL/mret/CSR설명과relatedM/RISC-V공개title/slug/order일치.모드→bank→복원흐름이있어F6→7. |
| G1 | ARM/Zephyr/FreeRTOS원자료태그가없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~191행. SHA-256: `9b0abc10a0fb540fe06fbb55f2738d2bcdd6f740e43def599252af15078e65cd`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part2-07-riscv-context.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-07-riscv-context.md`
url: `/blog/embedded/rtos/practical-internals/part2-07-riscv-context`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 128byte할당후128/132offsetwrite및mscratch설명과savedSP불일치확인.생략된x레지스터중간mapping은명시된offset이상으로단정하지않는다.

| 항목 | 근거 |
| --- | --- |
| A10 | CSR·trap저장·mscratch·mret을한흐름으로풀어A10유지.실측은없다. |
| B10 | addi sp,-128로확보한frame밖128/132에CSR을쓴다.또본문은swap후taskSP가mscratch라하면서sw x2를원taskSP저장이라고적는다.명시코드/설명불일치로오류유지/B10. |
| C5 | assembly/CSR표/비교cycle은있으나ISA/SoC/port버전·빌드산출물없어C5유지. |
| D11 | context2-04의169–181행mscratch/save소개와직접비교.이글은CSR/exceptionreturn/MCU포트까지넓혀독립이어서D10→11. |
| E7 | ECALL/mret/CSR를독립절과명령으로실제설명해E6→7. |
| F7 | 다음tickorder18의SysTick/generictimer설명과relatedA/tick/ESP32공개title/order/slug일치.핵심CSR→복원단계안내가있어F6→7. |
| G1 | 공식ISA·FreeRTOSport·ESP32주소출처연결이없어G1유지. |

전문 읽기: 1~274행. SHA-256: `6c1eb4880b143d45ef10e1e80ffd88b548277008c6f940b2629b052a3ec74796`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part2-08-tick-timer.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-08-tick-timer.md`
url: `/blog/embedded/rtos/practical-internals/part2-08-tick-timer`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 원문전문은35루프D비교때직접읽었고이번에관련절을재대조했다.진입/보정코드의실제FreeRTOSclock정의·time-slicing조건·HW조건은확인대기.

| 항목 | 근거 |
| --- | --- |
| A11 | M/A/RISC-Vtimer와rate/overhead/drift를함께설명해A11유지.독자측정은없다. |
| B10 | source설정→handler→rate→periodicdelay→tickless→drift흐름은있으나포트및MCU조건이부족해B10유지. |
| C6 | 168MHz/1kHz=168000,64bit24MHz≈24000년,HSI일간drift계산은산술상맞다.공식측정/board출처없어C6유지. |
| D8 | 이루프M2-05SysTick및tickless2-09,앞서읽은preemption1-04의rate표와직접비교.반복되나M/A/RISC-V시간원과drift질문을인정해D7→8. |
| E7 | SysTick/GenericTimer/configTICK_RATE_HZ를실제설정코드로풀어E7유지. |
| F7 | nextticklessorder19와relatedpreemptiontickless절의실제내용/공개title/order/slug확인.각HW원→주기→drift연결구조가있어F6→7. |
| G1 | clock/port동작과발진기오차의원자료링크가없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~232행. SHA-256: `c1bc605d393aebfae43b09165094ab4b864bb82e094639d6dc70c171cbbd6045`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part2-09-tickless.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-09-tickless.md`
url: `/blog/embedded/rtos/practical-internals/part2-09-tickless`

score_status: 잠정 · score: 42 · confidence: 낮음~중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 기존1주배터리오류는용량미정으로철회.31uA×8760h≈272mAh는맞으며31uA와평균mA서술범위는불명확하다.사실상RTC요약과본문다른wakeup의차이는단정요약차이로미검증.대상STM32모드·허용sleep길이확인필요.

| 항목 | 근거 |
| --- | --- |
| A10 | 포트sleep알고리즘에서mode/hooks/RTC/profiler로넓히나자체전류trace없어A10유지. |
| B7 | 핵심clock보정코드가조건/계산생략이고SysTick장기sleep상한이없다.기존오류근거는부족해미검증으로돌리되B7유지. |
| C4 | 31uA/270mAh년계산과dutycycle은재계산가능하나board·배터리용량·실측없어C4유지. |
| D10 | 직접연tick2-08 148–170·207–209행및preemption1-04tickless절과비교.설명반복은있어도fullport절·modehooks라는독립질문으로D9→10. |
| E6 | IdleSuppression/Sleep/Wake보정이라는제목에절이대응하나보정계산이생략돼E6유지. |
| F4 | 다음latencyorder20를Part2마지막이라하지만tracingorder21공개.관련tick/preemption라벨·target는맞아도F4유지. |
| G1 | powercurrent·도구가격·FreeRTOS/Zephyr/STHAL의원출처가없어G1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~269행. SHA-256: `6eaca58770efb057d1e522927c4dfc6ad45468df982084179fa27f13d0265c15`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part2-10-scheduler-latency.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency.md`
url: `/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency`

score_status: 잠정 · score: 44 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 명시SET/CLR/TOGGLE동작순서만대조했다.매크로자체정의나board실행없음.추가clear가생략된전체프로그램까지실패로일반화하지않는다.

| 항목 | 근거 |
| --- | --- |
| A10 | t1~t7정의와GPIO/DWT/ftrace/cyclictest/툴을연결한다.원trace없는표라A10유지. |
| B8 | 첫event후t7TOGGLE로pin이high에남아다음eventt2SET은edge가없다.보인반복코드로매회3edge측정한다는설명과맞지않아오류유지/B8. |
| C6 | 실제측정사례라는표가있으나원trace·testload·도구버전이없어C6유지.절차만으로측정검증가점하지않는다. |
| D8 | 전문을연realtime1-10의cyclictest/GPIO와이루프tracing2-11의툴설명을비교.많이겹치지만t4→t7구간분리라는실행질문이달라D7→8. |
| E7 | GPIO/DWT/ftrace/cyclictest를각각코드와지표로설명하므로E6→7. |
| F4 | 다음Part3마무리안내가공개tracing21을건너뛴다.PerformancePart1링크는전체허브order0이며후행상세안내없다.F4유지. |
| G1 | 실측표의작성/환경/공식원자료가없어G1유지. |

전문 읽기: 1~253행. SHA-256: `e248b586b858c8da934cd42f4cdb7d208e7e8c134fa2113bef438d71428014ac`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### part2-11-tracing-observability.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part2-11-tracing-observability.md`
url: `/blog/embedded/rtos/practical-internals/part2-11-tracing-observability`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: ITM의DWT하드웨어packet출력을공식Cortex-M4TRM으로확인.툴라이선스/성능숫자전체를검증한것은아니다.

| 항목 | 근거 |
| --- | --- |
| A12 | SW/HWtrace선택과IPC인과시나리오,시간정렬/overflow함정을연결해A12유지. |
| B12 | ITM이자동PCsampling/exception을만든다고한뒤명시print만보낸다고한다.TRMDWT생성→ITM출력구분으로후자의only주장이틀림을공식확인하여오류유지/B12. |
| C7 | 설정/사용이벤트코드와비용표는있으나원캡처·toolversion·recordsize가없어C7유지. |
| D10 | 직접연성능part5-07 123–170·196–206행의ITM/SystemView코드와비교.도구반복이있지만SW/HW선택과IPC인과추적통합역할을인정해D9→10. |
| E7 | Tracealyzer/SystemView/ITM/ETM을각절에서설명해E7유지. |
| F5 | next2-12시간동기화파일은rg검색결과없고공개다음order22는critical3-01.관련latency/M/ARMDS/Baremetal의실제title/order/slug는맞아도F5상한유지. |
| G1 | ARM/Percepio/SEGGER공식출처와실측표근거가없어G1유지. |

전문 읽기: 1~262행. SHA-256: `43b5870d93e7ad55212bc89f5e852ff8ea7dd79afc362f8102f34a91b838a033`. 기준 HEAD 원문과 바이트 일치를 확인했다.

## 적용 상한과 검증 한계

정확성 불확실이 열리면 B≤13(AP-C-24), 무출처 수치 C≤8, 절차만 있는 경우 C≤9를 우선 적용했다. F는 실제 slug/order/draft/title과 안내 뒤 설명을 대조하고 틀린 대상/설명이 있으면5 이하, 템플릿 외 글 고유 안내가 있을 때7 이상으로 판단했다. 축약 제목과 실질적인 오안내를 구분했다. 다른 시나리오·산문 개수·완곡한 본문/단정 요약·언어/API 기억만으로 오류를 확정하지 않았다. 실행하지 않은 코드와 관찰되지 않은 로그는 검증 완료로 기록하지 않는다.

## 공식 자료와 검증 범위

[ARM Cortex-M4 TRM DDI0439C §9.2·10.2](https://www.keil.com/dd/docs/datashts/arm/cortex_m4/r0p1/ddi0439c_cortex_m4_r0p1_trm.pdf)는 DWT가 PC sample/interrupt정보를생성하고ITM은DWT하드웨어packet도출력한다고설명한다.이자료는tracing2-11의명시print만이라는한정반증에만적용했다.다른툴가격·오버헤드·전체RTOS구현은검증완료가아니다.모든글의D비교는보고서에명시한실제원문범위를직접열었다.다이어그램이미지·모바일렌더는별도검증하지않았다.
