# 공개 글 독립 재평가 — 루프 38

2026-10-19 재평가. 기준 원문 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`, 루브릭 v1.2·AP-C-24. Practical RTOS Internals 3-11·4-01~09 전문과 기존 평가, 아래 비교 원문을 읽었다. 전편 `score_status: 잠정`, `confidence: 중간`. 앵커는 수정 전 `10550ca1` 기준. 원문·기존 보고서는 변경하지 않았다. 공통 정적 검사는 [2026-10-18 게이트](double-check-gates-2026-10-18.md) 참조. 전체 사실 검증·보드 실행 완료를 뜻하지 않는다. 본문 검토에서 P0 미발견.

## 점수

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `part3-11-stream-message-buffer.md` | 13 | 12 | 7 | 12 | 5 | 5 | 1 | 55 | 오류 확인 | 우선 조치 |
| `part4-01-realtime-memory.md` | 9 | 8 | 4 | 8 | 6 | 6 | 1 | 42 | 오류 확인 | 우선 조치 |
| `part4-02-freertos-heap.md` | 12 | 12 | 7 | 12 | 7 | 7 | 1 | 58 | 오류 확인 | 우선 조치 |
| `part4-03-tlsf.md` | 14 | 12 | 6 | 13 | 7 | 7 | 2 | 61 | 오류 확인 | 우선 조치 |
| `part4-04-static-allocation.md` | 13 | 13 | 7 | 12 | 7 | 7 | 1 | 60 | 미검증 | 보강 |
| `part4-05-memory-pool.md` | 13 | 12 | 6 | 9 | 7 | 7 | 1 | 55 | 미검증 | 병합 검토 |
| `part4-06-stack-overflow.md` | 13 | 12 | 7 | 8 | 7 | 7 | 1 | 55 | 오류 확인 | 우선 조치 |
| `part4-07-smp-rtos.md` | 14 | 12 | 6 | 11 | 8 | 7 | 1 | 59 | 오류 확인 | 우선 조치 |
| `part4-08-spinlock-smp.md` | 12 | 12 | 6 | 7 | 7 | 7 | 2 | 53 | 오류 확인 | 우선 조치 |
| `part4-09-software-timer.md` | 11 | 12 | 6 | 8 | 7 | 7 | 1 | 52 | 오류 확인 | 우선 조치 |

합계 546→550, 평균54.6→55.0. 4-07이 신규 오류 확인으로 우선 조치, 4-04는60점으로 보강이 된다. 개요와 전용 심화 글의 역할 차이를 D에 반영한 소폭 수정이며 일괄 가점이 아니다.

## 정확성 게이트 재검토

- 3-11 기존 ‘10배 도입 vs 약4배 측정’은 조건이 다른 성능 일반화일 수 있어 단독 오류 게이트에서 철회한다. CPU6%/1.5%도 앞 표의 task send/receive 비용을 UART ISR 처리에 그대로 대입할 수 있는지 불명확하다. 수치의 검증 부족으로 남긴다. 대신 L264의 ‘buffer가 trigger+한 번 send보다 작으면 영원히 trigger 안 됨’을 [FreeRTOS V11.2.0 stream_buffer.c](https://raw.githubusercontent.com/FreeRTOS/FreeRTOS-Kernel/V11.2.0/stream_buffer.c)와 대조했다. dynamic create는 요청 크기에 내부 여유1byte를 더하고, send/FromISR은 누적 byte가 trigger 이상이면 통지한다. 요청64/trigger32에서 receiver가 대기 중이고 비어 있는 buffer에64byte를 한 번 송신하면 누적64≥32라 통지한다. 요청 capacity64·내부 length65 모두 trigger32+send64=96보다 작은데도 trigger된다. 실제 커널 실행이 아닌 소스 흐름의 반례이며 오류 상태를 이 근거로 유지한다.
- 4-01 L145·148의 `xMaximumFreeBlockSize`는 [FreeRTOS V11.2.0 portable.h](https://raw.githubusercontent.com/FreeRTOS/FreeRTOS-Kernel/V11.2.0/include/portable.h)의 HeapStats_t 필드와 다르다. 실제 필드는 `xSizeOfLargestFreeBlockInBytes`다. 고정 태그로 기존 오류 재확인. TLSF의 m값이 없는 예시와 고정4 식 비교는 조건 미상이라 확정 근거에서 뺀다. 대신 L42의 free총6KB를 8KB 요청보다 충분하다고 설명한 부분은 총량 부족과 연속 공간 부족을 혼동한 수치 설명이다.
- 4-02 L107·158·244의 heap_4 best-fit 설명과 L131의 같은 알고리즘 first-fit 설명은 충돌한다. 내부 오류 유지. coalesce가 있다는 사실만으로 장기 단편화가 사라진다고 확정하지 않는다.
- 4-03 L36~38의 64~127을16등분하면 칸 폭4byte다. 제시8byte 구간과 SL15=120~127은 맞지 않는다. 내부 산술 오류 유지. 논문의 모든 단편화 상한·채택 사례를 확인한 것은 아니다.
- 4-04·05는 미검증 유지. static StackType_t[2048]과 nm0x800은 같은 빌드/포트라는 조건이 없어 내부 오류로 확정하지 않는다. pool의 ISR 예제와 mutex 경고도 pool_t 구현이 정의되지 않아 같은 구현이라고 단정하지 않는다. 표준/사례 인용은 별도 확인이 필요하다.
- 4-06 L47~50의 predicate를 추출하여 uint32_t canary4개 중 단1byte만 바꾸는 호스트 C 시험을 실행했다. `modified_bytes=1 hook=1`로 L54의 ‘16byte보다 작은 침범은 놓침’과 다르다. 파일 `/private/tmp/adsense-loop38-canary.c`, 결과 `/private/tmp/adsense-loop38-canary.log`, clang C11·Wall/Wextra/Werror 컴파일 및 실행 exit0. 실제 FreeRTOS/MPU 실행이 아니다. L150의 무조건 즉시 MPU 검출과 L203·212의 guard leap/probe 조건은 검출 보장 범위의 부정확성으로 남긴다. 단순 강한 요약/약한 경고 비교만으로 독립 오류를 늘리지 않는다.
- 4-07 L108·123·291의 Zephyr 일반 SMP를 per-CPU queue+push/pull로 설명한 내용을 [Zephyr v4.2.0 sched.c](https://raw.githubusercontent.com/zephyrproject-rtos/zephyr/v4.2.0/kernel/sched.c)와 대조했다. `CONFIG_SCHED_CPU_MASK_PIN_ONLY` 조건에 따라 CPU별 queue가 존재하지만 일반 경로는 `_kernel.ready_q`를 공유한다. 조건 없는 일반화가 틀리다. L119의 `k_thread_cpu_mask_disable_all`도 [v4.2.0 kernel.h](https://raw.githubusercontent.com/zephyrproject-rtos/zephyr/v4.2.0/include/zephyr/kernel.h)의 해당 API 구간과 다르다. `k_thread_cpu_mask_clear`/enable이 존재하고 mask 변경에는 thread가 runnable이 아니어야 하는 조건도 있다. 본문은 K_NO_WAIT로 생성한다. 신규 오류 확인. 모든 과거/별도 vendor API 존재까지 배제하는 주장은 아니다.
- 4-08 L60은 contention에서 CASAL 이득이 커진다는데 L65의 같은 표는 CASAL30~80·LL/SC20~50cycle로 반대 경향이다. L47의 지원 코어 설명과 L62의 Cortex-A72 CASAL 측정도 글 안에서 맞지 않는다. 내부 오류 유지. 실제 A72에서 테스트했다고 하지 않는다.
- 4-09 L129 hrtimer=hierarchical wheel은 [Linux 6.6 hrtimers 공식 문서](https://docs.kernel.org/6.6/timers/hrtimers.html)의 red-black tree 설명과 다르다. 기존 오류 재확인. Timer_t에 expiry_tick이 없다는 점은 의사코드/생략 범위의 문제로 B의 약점에 두고 독립 게이트로 쓰지 않는다.

## 글별 근거

축약 경로 기준 `src/content/blog/embedded/`. 다음 편은 실제 seriesOrder를 대조하고 관련 항목은 목적지 제목과 뒤 설명을 함께 비교했다. 코드/개념을 공유하더라도 입문·전용 구현·성능 분석의 질문이 다르면 D에서 구별했다.

### part3-11-stream-message-buffer.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part6-09-isr-api.md@10550ca1`.
- blockers: L264 trigger 불가능 조건 설명 오류·존재하지 않는 다음 편 안내.
- uncertainties: 성능 수치 조건·4byte prefix의 타입/포트·메모리 ordering·개념 memcpy의 wrap 처리·yield 보장은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | L126~163 batching UART·L165~202 가변 명령·L233~238 채널 선택은 적용 관점. 실험 원자료 없이 일반 ring/API가 중심이다. |
| B | 12 | 비교→구조→API→예제→성능→제약으로 완결. trigger 오류·미생성 cmd_mb·개념 ordering 불확실성이 남는다. |
| C | 7 | 코어/clock·표와 예제는 있지만 버전/컴파일러·측정 방법/결과 자료가 없다. undefined 보드 함수와 cmd 생성이 빠지고 무출처 수치로 C≤8. |
| D | 12 | 11→12. 본글 L32~50·93~124↔같은 시리즈1-09 L166~185·3-07 L194~206은 입문 API 개요와 전용 글 관계다. 일반 SPSC 골격만으로 별도 Message Buffer 명령/채널 선택까지 중복이라고 하지 않는다. |
| E | 5 | 두 buffer는 다루지만 description의10배·Lock-Free 구현 약속을 개념 코드/조건 없는 표가 충분히 뒷받침하지 않는다. |
| F | 5 | L304 다음3-12 Notification이 실제 목차/파일에 없고 다음 order33은4-01이다. 관련3-07/3-10/C++4-04/Perf4-07 라벨은 맞지만 틀린 다음 편으로 상한5. |
| G | 1 | 구체 API/측정/메모리 ordering의 본문 1차 자료·고정 버전 연결이 없다. |

변경:54→55, 오류 근거 교체. 병합 대상 없음; 일반 SPSC 설명을 줄이고 stream/message 선택·batch 검증에 집중할 후보.

### part4-01-realtime-memory.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-01-realtime-memory.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part6-09-isr-api.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: HeapStats_t 필드명 오류·L42 부족한 free총량 설명.
- uncertainties: CERT/MISRA/항공·자동차 표준과 누리호/ITAR/NIST 사례, 실제 API 호출/포트는 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 개념/전략/표준 목록이 중심이고 자체 선택 근거·실패 분석은 없다. buddy/section 예도 출처 없는 개요다. |
| B | 8 | 문제→대안→측정→함정은 있으나 pool 함수는 주석뿐이고 WCET 방법은 L175 한 줄. 측정 필드 오류도 있어 낮은 구간. |
| C | 4 | L98~100 호출/선언 혼용·L196~198 인자 없는 free·없는 stats필드로 그대로 실행하기 어렵다. 환경/출력/시험 부재. |
| D | 8 | 7→8. L137~148↔4-02 L176~189 stats, L74~90↔4-03 L28~45 TLSF, L107~111↔4-05 L29~35 pool이 겹친다. Part4 도입·선택 지도 역할을 인정하지만 본체 대부분이 후속 요약인 한계는 유지. |
| E | 6 | Determinism/Fragmentation은 있으나 WCET 분석의 실제 방법이 목록에 머문다. 제목에 없는 심층 분석 약속을 만들어 추가 감점하지 않는다. |
| F | 6 | 다음4-02·관련3-10/4-02/4-03은 일치. 각 절이 짧은 목록이고 글 고유의 진단/선택 흐름이 없어7 이상은 어렵다. |
| G | 1 | 저자/연도 언급만 있으며 표준 조항·사례·핵심 API의 직접 출처가 없다. |

변경:41→42. 병합 후보4-02/04/05의 중복 절. Part4 도입 역할을 유지하며 WCET 기준과 선택 지도를 보강할 후보.

### part4-02-freertos-heap.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-02-freertos-heap.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: heap_4 best-fit/first-fit 설명 충돌.
- uncertainties: heap1 free/assert·heap2 deprecated 표현·ESP32 기본 heap·WCET 측정/단편화 임계 수치·모든 region 계약은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 다섯 구현/워크로드·region 함정·실패hook을 묶는다. 실제 검증/실패 기록 없이 표준 알고리즘이 중심이다. |
| B | 12 | 각 구현→비교→상태→실패→측정으로 충실하지만 핵심 heap4 정책이 충돌해13 이하. |
| C | 7 | 코드·stats·cycle 예는 있으나 kernel/compiler/워크로드 원자료가 없고 평균을 WCET로 쓰는 근거가 부족하다. 무출처 수치로C≤8. |
| D | 12 | 11→12. L164~170↔Recipes8-01 L118~126은 개요 표와 전용 allocator 분석 관계. L176~189↔4-01 L137~148은 같은 API지만 본글은 각 필드/상황을 확장한다. 다섯 구현 비교 역할을 구별. |
| E | 7 | 다섯 정책·트레이드오프는 이행하지만 source-level 약속 대비 코드가 생략형이고 tag/원문 연결이 없다. |
| F | 7 | 다음TLSF·관련4-01/03/04/05/06이 맞고 구현별 절과 L218·246의 다음 행동 안내가 고유 구조다. |
| G | 1 | 측정/공식 권장·source code의 본문 1차 출처·태그가 없다. |

변경:57→58. 병합 대상 없음; 고정 source와 관찰 가능한 fragmentation/시간 시험으로 보강할 후보.

### part4-03-tlsf.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-03-tlsf.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part12-10-on-device-llm.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: SL 구간/16등분 산술 오류.
- uncertainties: builtin 폭/0/small size·coalesce header·논문 단편화 상한·채택 사례·실측·API type 중복은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | mapping/bitmap/coalesce·작은heap/코어별 선택을 풀어쓴 관점. 채택과 수치의 직접 근거는 없다. |
| B | 12 | 구조→alloc/free→API→비교→한계까지 완성됐지만 첫 mapping 예부터 오류며 미확인 계약이 남는다. |
| C | 6 | 긴 알고리즘/API 예가 있으나 block/상수/크기 조건이 빠지고 측정 재현 절차가 없다. 숫자 출처 부재로8 상한 아래. |
| D | 13 | 4-01 L74~90은 본글 L28~45 미리보기. Recipes8-01 L162~179↔본글 L158~174는 얕은 API 반복이며 본글 L63~143 mapping/coalesce 해설을 대체하지 않는다. |
| E | 7 | TLSF 분석은 하지만 수학적 상한·표준 채택을 검증된 근거처럼 주장하는 부분이 약하다. |
| F | 7 | 다음4-04·관련4-01/02/04/05 일치. L18 전제 heap과 L45·47 구조 설명이 고유 탐색이다. tlsf-bsd/mattconte 명칭 불일치는 잔여 약점. |
| G | 2 | 논문 저자/연도·구현 이름은 있으나 판/원문 및 측정 근거의 연결이 약하다. |

동의:61 유지. 병합 대상 없음. mapping·자료구조를 고정 구현/원논문과 연결하고 작은 요청/실패 시험을 보강할 후보.

### part4-04-static-allocation.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-04-static-allocation.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: 확정 오류·P0 미발견. 검증/사례 출처 부족.
- uncertainties: static hook의 config 조건·NOLOAD와 startup zero-fill·표준 인용·채택 사례·byte/word 혼용과 전역 초기화는 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | 객체 storage→linker→stack budget→static/pool 절충은 적용 관점. 표준/산업 사례에 원자료가 없다. |
| B | 13 | API·hook·Zephyr·linker·계산·한계로 충실하나 startup/표준/단위의 불확실성으로13 상한. |
| C | 7 | API/config/size/nm/.su 예는 있으나 기준 환경과 실제 결과가 없다. 예시·마진 수치 근거 부족으로C≤8. |
| D | 12 | 11→12. Recipes8-01 L104~116↔본글L42~46은 API 개요, Recipes8-09 L157~180↔본글L170~189는 .su 도구 소개와 실제 예산 계산 차이가 있다. 4-06 L111도 이 계산을 참조하므로 본래 자리다. |
| E | 7 | API·Zephyr·section·표준 약속을 다루지만 실제 적합성/zero-heap 증거와 대상 조건이 부족하다. |
| F | 7 | 다음pool·관련4-01/02/03/05/06 일치. L18 전제·L272 절충·.su 계산의 고유 구조. 4-06은 계산을 여기로 넘기고 본글은 overflow 방어를4-06으로 넘겨 역할이 나뉜다. |
| G | 1 | 기준 표준판 일부만 있으며 실제 인용문·벤더 사례·kernel/toolchain의 본문 출처가 없다. |

변경:59→60, 보강. 병합 대상 없음; 메모리 예산·링커 초기화·zero-heap 검증을 보강할 후보.

### part4-05-memory-pool.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-05-memory-pool.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part6-09-isr-api.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: 확정 오류·P0 미발견. pool_t 구현/재현 환경 부족.
- uncertainties: alignment·CAS/ABA 조건·burst 모델·CMSIS/lwIP 계약·ISR 구현·수치/성능·메모리 안전 보장 표현은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | queue를 pool로 쓰기·peak 통계·per-class·ISR 대안을 묶는 적용 관점. 실제 workload 측정이 없다. |
| B | 12 | 기본→API→네트워크→lockfree→sizing→함정으로 충실하지만 타입/함수 구현이 생략되고 API/동시성 조건이 열려13 이하. |
| C | 6 | 기본 구현·통계 코드는 있으나 mutex/pool_t/DMA/mbuf 환경이 없다. sizing 예는 계산일 뿐 측정 결과가 아니다. |
| D | 9 | 본글L26~66↔C++pool L39~59 free list, L182~211↔L260~299 CAS/ABA, L247~270↔L305~340 통계가 겹친다. C++쪽은 RAII/형식 안전도 다루고 본글은 CMSIS/RTOS queue·ISR 선택 역할이 남는다. |
| E | 7 | fixed-size/per-class/lockfree 약속은 다루나 상수 시간/fragmentation 표현의 적용 조건은 더 필요하다. |
| F | 7 | 다음stack·관련4-01~04/06 일치. L232~270 sizing/peak검증이 고유 구조이며4-04의 정적 예산 원칙을 응용한다는 안내를 없는 절 약속으로 단정하지 않는다. |
| G | 1 | API·코어·수치·구현에 공식 출처/고정 버전이 없다. |

동의:55·미검증 유지. 부분 병합 후보 C++pool의 free-list/CAS 일반 설명. RTOS/ISR pool sizing 질문으로 차별화할 후보.

### part4-06-stack-overflow.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-06-stack-overflow.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: canary predicate와16byte 미만 검출 불가 설명의 충돌.
- uncertainties: 실제 FreeRTOS 검사 시점·MPU/stack-probe 지원·GCC protector 검출 시점·MSP/PSP frame·표준/항공 사례/수치 근거는 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | Method 비교·MSP 예산·probe를 다층 방어로 묶는다. 독자 실험/사례의 직접 근거는 없다. |
| B | 12 | canary/watermark/MPU/protector/probe/ISR을 다루지만 검출 범위 설명이 코드와 다르고 보장 조건이 약하다. |
| C | 7 | API/구성/monitor 예는 있으나 kernel/port/toolchain·오류 주입 결과가 없다. 예산·printf/마진 수치 출처 부족으로C≤8. |
| D | 8 | L117~135↔Recipes8-09 L39~58 pattern, L161~180↔L98~112 protector, L137~159↔L114~132 MPU, L107~115↔L157~180 static tools가 반복된다. MSP 예산/Method/probe 역할이 남으나 본체 중복 큼. |
| E | 7 | 세 층·정적 분석까지 약속은 이행하지만 검출 보장이 구체 코드/한계와 맞지 않는다. |
| F | 7 | 다음SMP·관련4-01/04/05/2-05/1-05·debug 장의 실제 주제가 맞는다. L111은4-04 실제 .su 계산 heading으로, L186은 context 전제로 연결한다. |
| G | 1 | 고정 kernel/MPU/toolchain 원문·실험·표준/누리호 주장 출처가 없다. |

동의:55 유지. 병합 후보 Recipes8-09의 일반 방어 절. Method/MSP/실제 overflow 주입 시험으로 보강할 후보.

### part4-07-smp-rtos.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-07-smp-rtos.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: Zephyr 일반 queue 모델·API 이름/상태 조건 오류.
- uncertainties: FreeRTOS 도입 연도·portYIELD_CORE/PendSV·RP2040 cache/coherency·Linux spinlock 인자·이동 시 cache 일반화·측정 환경은 별도 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 두 ready 구조·affinity 선택·load balancing을 설계 질문으로 묶는다. 코어 경계/성능 수치는 원자료가 없다. |
| B | 12 | 13→12. 모델→RTOS→IPI→coherency→affinity→측정까지 완성됐지만 Zephyr 비교 핵심이 조건 없이 틀리다. |
| C | 6 | 7→6. 실제 API 예의 mask 함수/상태 조건이 맞지 않고 측정표는 OS/도구/절차가 없다. 무출처 수치로C≤8. |
| D | 11 | 10→11. L84~98·119~120↔Performance4-10 L103~120 API, L137↔L136~145 IPI, L264~270↔L233~243 affinity가 반복. 성능 관측 글과 달리 ready-list 설계 대안·의사코드의 역할은 구별한다. |
| E | 8 | 제목의 네 주제/두RTOS/cross-core를 모두 본절로 답한다. 정확한 비교 조건 보강 필요. |
| F | 7 | 다음spinlock·관련2-03/3-01/4-06/4-08 일치, L22 AMP 예고도 실제4-12와 맞는다. 비교 구조와 전제 링크가 있다. |
| G | 1 | RTOS/코어/측정/아키텍처 주장의 직접 출처·고정 tag가 없다. |

변경:60→59, 신규 오류 확인으로 우선 조치. 병합 대상 없음. 실제 RTOS/config별 ready 구조와 cross-core 측정으로 보강할 후보.

### part4-08-spinlock-smp.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: LSE 성능/지원 조건과 자체 표 불일치.
- uncertainties: ESP32 실제 ISA/portMUX·일반 ldr가 exclusive를 항상 깨는지·WFE/event·MCS next 동시성/정렬·표의 측정 조건은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | WFE/SEV·RTOS lock·선택을 묶지만 일반 LL/SC/TTAS/ticket/MCS 설명이 중심이고 성능 근거가 없다. |
| B | 12 | primitive→C→TTAS→sleep→fair/scalable→통합으로 충실. 자체 표와 설명 충돌·미확인 의미로13 이하. |
| C | 6 | 많은 예제는 있으나 포트/환경/실행 결과·cycle 측정 방법이 없고 보조함수/동시성 조건도 부족하다. |
| D | 7 | L100~118↔Performance4-04 L71~87 TTAS, L149~172↔L89~111 ticket, L178~217↔L113~141 MCS 설명/코드가 크게 반복된다. WFE/SEV·ESP 통합은 고유하나 핵심 중복이 크다. |
| E | 7 | 제목 primitive/ticket/MCS/WFE는 모두 다루나 구현 정확성·실측 계약이 부족하다. |
| F | 7 | L18 앞SMP 전제·L22 범위·다음timer·관련3-01/3-09/4-07/4-09/Perf4-04 일치. 구현별 단계가 고유 구조다. |
| G | 2 | ARM 버전·알고리즘 저자/연도는 있으나 고정 문서·실험 출처 연결이 없다. |

동의:53 유지. 부분 병합 후보 Performance4-04의 기본 lock 구현. RTOS별 실제 primitive·저전력 spin 검증에 집중할 후보.

### part4-09-software-timer.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-09-software-timer.md`

- score_status: 잠정; confidence: 중간; anchor_ref: `part6-09-isr-api.md@10550ca1`, `part1-04-uart-hardware.md@10550ca1`.
- blockers: hrtimer 자료구조 설명 오류.
- uncertainties: posix-timers·FreeRTOS 현재/overflow list·만기 tick 필드 의사코드·best case 양자화·tickless 조건·실측 cycle/전류는 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | daemon/callback/자료구조/API를 묶지만 기존 자료의 반복이며 핵심 비교도 일부 틀리다. |
| B | 12 | 구조→daemon→자료구조→API→정확도→저전력→함정으로 완결. hrtimer 오류와 만기/overflow 생략으로13 이하. |
| C | 6 | timer/deferral/하드웨어 예는 있으나 미정의 함수·실제 버전/결과 부재. cycle·latency·전류 근거 부족으로C≤8. |
| D | 8 | 본글L90~143↔Recipes6-11 L20~69 자료구조, L59~84·226~247↔같은시리즈3-09 L127~154 daemon/deferral 반복. source기반 타이머 비교는Recipes가 더 구체적이다. |
| E | 7 | daemon/자료구조/ISR-safe 약속은 이행하지만 실제 kernel source와 대응/검증이 약하다. |
| F | 7 | 6→7. 다음syscall·관련2-08/3-09/4-08/4-10 라벨 일치. 자료구조 H3 비교·callback/ISR 문맥별 예제가 고유 탐색 구조. 인접 관련 글 하나의 관계가 약하다는 이유만으로6에 고정하지 않는다. |
| G | 1 | 실제 kernel/FreeRTOS source·벤치마크·전류의 직접 출처와 고정 버전이 없다. |

변경:51→52. 오류 유지, 의사코드 필드 생략과 사실 오류를 구별. 부분 병합 후보 Recipes6-11/같은시리즈3-09. 실제 daemon 명령/overflow/만기 trace로 보강할 후보.
