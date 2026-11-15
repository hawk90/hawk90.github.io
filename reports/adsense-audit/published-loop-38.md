# 공개 글 AdSense 평가 — 루프 38

> 대상: 공개 글 10편 (Practical RTOS Internals `seriesOrder` 32~41, part3-11~part4-09)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른여덟 번째 루프다. 대상은 `src/content/blog/embedded/rtos/practical-internals/`의 Part 3 마지막 글(part3-11 Stream/Message Buffer)과 Part 4 앞 아홉 편(part4-01~09, 실시간 메모리·heap·TLSF·static allocation·memory pool·stack overflow·SMP·spinlock·software timer)이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part3-11-stream-message-buffer.md` | 13 | 12 | 7 | 11 | 5 | 5 | 1 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part4-01-realtime-memory.md` | 9 | 8 | 4 | 7 | 6 | 6 | 1 | **41** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part4-02-freertos-heap.md` | 12 | 12 | 7 | 11 | 7 | 7 | 1 | **57** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part4-03-tlsf.md` | 14 | 12 | 6 | 13 | 7 | 7 | 2 | **61** | 오류 확인 | 우선 조치 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `part4-04-static-allocation.md` | 13 | 13 | 7 | 11 | 7 | 7 | 1 | **59** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `part4-05-memory-pool.md` | 13 | 12 | 6 | 9 | 7 | 7 | 1 | **55** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part12-10-on-device-llm.md` |
| `part4-06-stack-overflow.md` | 13 | 12 | 7 | 8 | 7 | 7 | 1 | **55** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `part4-07-smp-rtos.md` | 14 | 13 | 7 | 10 | 8 | 7 | 1 | **60** | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `part4-08-spinlock-smp.md` | 12 | 12 | 6 | 7 | 7 | 7 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part4-09-software-timer.md` | 11 | 12 | 6 | 8 | 7 | 6 | 1 | **51** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |

평균 54.6점(10편, 합 546점), 범위 41~61점이다. 판정은 우선 조치 7편, 병합 검토 2편(4-04·4-05), 보강 1편(4-07)이고 유지·검증 대기·제외 검토는 없다. 점수 구간으로는 4-03(61)·4-07(60)만 보강(60~79)이고 나머지 8편은 병합 검토(40~59)다. 오류 확인은 7편(3-11, 4-01, 4-02, 4-03, 4-06, 4-08, 4-09)이다. 4-01과 4-09는 1차 자료(FreeRTOS-Kernel `include/portable.h`, Linux v6.6 `Documentation/timers/hrtimers.rst`)를 직접 열어 확인했고, 나머지와 4-01·4-09의 두 번째 근거는 원문 내부 모순(두 구체 진술, 코드 대 산문, 산술)이다. factcheck는 10편 모두 git log에 1차 자료 대조 커밋이 없어 출발은 미검증이고, 오류 확인이 없는 3편(4-04·4-05·4-07)은 미검증으로 남았다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상의 제목·seriesOrder, 4-06 111행 앵커 대상 heading까지이고 렌더링·광고 배치·외부 링크 생존은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part3-11-stream-message-buffer.md` | 54 | 54 | 0 | 없음 |
| `part4-01-realtime-memory.md` | 40 | 41 | +1 | 없음 |
| `part4-02-freertos-heap.md` | 57 | 57 | 0 | 없음 |
| `part4-03-tlsf.md` | 62 | 61 | -1 | 없음 |
| `part4-04-static-allocation.md` | 59 | 59 | 0 | 없음 |
| `part4-05-memory-pool.md` | 55 | 55 | 0 | 없음 |
| `part4-06-stack-overflow.md` | 56 | 55 | -1 | 없음 |
| `part4-07-smp-rtos.md` | 60 | 60 | 0 | 없음 |
| `part4-08-spinlock-smp.md` | 53 | 53 | 0 | 없음 |
| `part4-09-software-timer.md` | 53 | 51 | -2 | 없음 |

- 기각한 오류 확인: 없음.
- 추가한 오류 확인(미검증 → 오류 확인): 4-03 36~38행(16등분인데 SL 폭 8 byte, SL[15]=120-127은 산술상 SL[7]), 4-06 54행 대 56행(Method 2 검출 범위)과 150행 대 203·212행(MPU guard 검출 보장). 두 편 모두 판정이 우선 조치로 바뀌었다(4-03은 점수 구간 보강, 4-06은 병합 검토 유지).
- 기존 오류 확인에 근거 추가: 3-11 216행 CPU 6%/1.5%가 206행 168 MHz와 표 1-byte cycle로 계산하면 약 36%/4.5%라 맞지 않음. 4-01은 portable.h 156~165행을 직접 받아 `xMaximumFreeBlockSize`가 없음을 재확인하고 81/85행 모순에 79행 2^n bucket 정의를 근거로 추가. 4-08은 47행(LSE는 A55·A75 이후)과 62행(Cortex-A72 열의 CASAL 수치)을 두 번째 내부 모순으로 명시. 4-09는 hrtimers.rst v6.6을 직접 열어 'red black tree' 문장을 확인했고, 40행 설명과 43~50행 구조체·65·69·76행 `expiry_tick`의 불일치를 추가.
- 점수 변경: 4-01 E 5→6(제목이 '분석·진단'을 약속하지 않아 3~5 규칙 대신 WCET 미이행으로 6~8 구간 감점, 40→41). 4-03 B 13→12(구조 절 첫 예시 오류, 62→61). 4-06 B 13→12(핵심 절 두 곳이 서로 어긋남, 56→55). 4-09 A 12→11(핵심 자료구조 절의 129행 오류와 133·139~141행 무출처), B 13→12(53행 단일 list, 40 대 50행 불일치, 129행 오류, 53→51).
- 줄 번호 보정(점수 영향 없음): 3-11 D(part1-09 166~185행, part3-07 194~206행, part9-01 283~292행, esp32 chapter10 162~184행), 4-01 D(part4-05 29~30행, part4-02 131행, modern-recipes part8-01 26~27·33·118~122행), 4-02 D(part8-01 120~126행, part4-01 139~148행, part4-03 184~190행), 4-03 D(part4-02 210~218행), 4-04 D(part4-01 91~98·169행), 4-07 uncertainties(149·178·134행)와 D(perf-eng 103~108·116~117행, part5-01 349행), 4-08 D(Perf Eng 4-04 71~87·89~111·113~141행), 4-09 D(6-11 20~69행, tickless 285~306행).
- 부풀림 판정은 10편 모두 없음이다. 4-01의 +1은 E 규칙 적용 구간을 바로잡은 것이다.

## 글별 근거

### `part3-11-stream-message-buffer.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git 이력(2bb21c78 stub 추가, b6f19d58 본문 작성, 85a2d46f 번역투 수정·발행, ac24bb76 제목 변경, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋이 없어 출발은 미검증이다. 원문 내부 모순 두 건: (1) description(5행) 'queue보다 10배 빠른 IPC'와 28행 '10배 가까이 빠른 처리량'은 같은 글 측정 표(208~212행) 합계 600 대 140(약 4.3배)·600 대 175(약 3.4배), 214행 '4배 빠릅니다', 299행 '3~4배 빠르고'와 동시에 참일 수 없다. (2) 216행 '100 KB/s UART를 queue로 처리하면 CPU 6%, stream buffer로 1.5% 미만'은 206행 168 MHz와 표의 1-byte 합계로 계산하면 queue 100,000×600 = 60M cycle/s(약 36%), stream buffer는 ISR send(75 cycle)만 쳐도 7.5M cycle/s(약 4.5%)라 맞지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 이 글만의 것은 trigger level 64로 UART 1-byte ISR wake-up을 묶는 예(126~163행), Message Buffer로 가변 길이 명령을 넘기며 queue의 고정 크기·포인터 전달과 비교한 설명(165~202행), producer별 채널 선택 기준(233~238행), 4-byte prefix 크기 계산(277행)이다. SPSC ring 구조(52~91행)는 69행이 '실제 코드 아님 — 개념만'이라 밝힌 일반 lock-free 입문이고, 측정 표(206~214행)는 출처·방법이 없고 도입 수치(28행)·CPU 수치(216행)와도 맞지 않는다. 13~19 구간 하단. |
| B | 12 | 문제(16~30행) → 비교(32~50행) → 내부 구조(52~91행) → API(93~126행) → 예제 둘(128~202행) → 측정(204~216행) → SPSC 제약·FromISR·함정(218~292행) → 정리(294~302행)로 흐름은 끝까지 간다. 그러나 핵심 결론(얼마나 빠른가)이 5·28행과 214·299행에서 다르고 216행 CPU 수치도 표와 맞지 않으며, 18·91·244·264행 불확실이 열려 있어 AP-C-24상 B ≤ 13이다. 명령 예제에서 cmd_mb 생성(176행)이 없다. |
| C | 7 | 측정 표(206~214행)는 'Cortex-M4F @ 168 MHz'만 적고 FreeRTOS 버전·컴파일러·최적화·측정 방법이 없다. 216행 CPU 6%→1.5%, 264행 'trigger × 4'도 출처·환경 없는 수치라 C ≤ 8. 예제는 uart_rx_available/uart_rx_read/process(145·146·158행), dispatch(196행)가 정의되지 않고 cmd_mb가 생성되지 않아(176행) 그대로 재현되지 않는다. 합격·실패 관찰이 있는 검증 절차는 없다. |
| D | 11 | 인접 part3-10-deadlock.md·part4-01-realtime-memory.md는 겹침 없음. 같은 시리즈 part1-09-queues.md 166~185행, part3-07-queue-impl.md 194~206행이 요약하고 이 글 32~50·93~124행이 상세 편 역할이다. 다른 시리즈: modern-recipes/part9-01-lock-free-ring.md 283~292행이 이 글 132~160행과, riscv/esp32-c3-mastering/chapter10-freertos.md 162~184행이 이 글 132~160·218~231행과 겹친다. modern-recipes/part6-06-queue-usage.md 166~189행은 측정 절(204~216행)과, embedded-cpp/part4-04-lock-free-container.md SPSC ring은 52~91행과 겹친다. Message Buffer 명령 예와 producer별 채널 기준은 다른 글에 없어 10~14 구간. |
| E | 5 | 제목(2행) 'Stream Buffer와 Message Buffer'는 본문이 다루지만 'Lock-Free SPSC'의 구현은 69행 개념 코드뿐이다. description(5행) 'queue보다 10배 빠른 IPC'는 본문 측정(214행 4배, 299행 3~4배)이 뒷받침하지 않아 3~5 구간. |
| F | 5 | 304행 '다음 편은 3-12: Task Notification'인데 part3-12 글이 없고 seriesOrder 33은 part4-01-realtime-memory.md다. 00-preface.md 목차도 108행 3-11에서 끝난다. 다음 편 안내가 틀려 F ≤ 5. 관련 항목 4개(308~311행)는 대상 title을 열어 라벨이 맞음을 확인했다. |
| G | 1 | 본문에 1차 출처 링크가 없다. FreeRTOS 버전은 '10(2017)'(28·296행)뿐이고 stream_buffer.c·API 문서 인용이 없다. 측정 표의 버전·도구도 없다. |

uncertainties:
- 18행 xQueue가 내부적으로 task notification을 쓴다는 설명은 queue.c로 확인하지 않았다.
- 91행 'FreeRTOS 포트가 DMB를 자동으로 처리': stream_buffer.c barrier 여부 미확인. modern-recipes/part9-01의 FreeRTOS 내부 locking 설명과 298행 'lock 없이 동작'이 다른 글 간 모순일 수 있다.
- 38·43·277행 Message Buffer 길이 prefix 4 byte: 실제로는 configMESSAGE_BUFFER_LENGTH_TYPE(기본 size_t) 크기라 32-bit 전제인지 미확인.
- 244행 일반 API를 ISR에서 부르면 crash한다는 단정, 실제 결과(configASSERT 등) 미확인.
- 264행 trigger level 관련 설명과 'trigger × 4' 권장은 출처 없음. 214행 'ISR에서 차이가 더 커진다'도 출처·수치 없음.
- 28·296행 FreeRTOS 10(2017) 추가 시점 미확인.
- 179~190행 send_cmd가 len을 uint16_t로 받아 buf[256]에 memcpy하므로 len > 252면 overflow. 의도된 제한인지 글에 없다.

병합 대상: 오류 확인에 따른 우선 조치라 병합은 보류한다. 점수 구간(병합 검토) 참고로는 병합 대상 없음 — part1-09-queues.md·part3-07-queue-impl.md는 이 주제를 요약만 하므로 이 글이 상세 편이다. 다음 조치는 보강: 5·28행 '10배'와 216행 CPU 수치를 측정 표와 맞추거나 출처 없는 측정 표를 TBD로 바꾸고, stream_buffer.c·queue.c·API 문서로 18·91·244·264행을 대조하고, 304행 다음 편 안내를 part4-01로 고친다.

### `part4-01-realtime-memory.md` — 41점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(42ebbcbb stub, 2bb21c78, 2083e506 본문, 85a2d46f 번역투, a746e269·ac24bb76·e85d7684·be973200·0a9dd7bc 형식 정리)에는 1차 자료 대조 커밋이 없다. (1) 1차 자료: FreeRTOS-Kernel main `include/portable.h` 156~165행의 HeapStats_t 필드는 xAvailableHeapSpaceInBytes, xSizeOfLargestFreeBlockInBytes, xSizeOfSmallestFreeBlockInBytes, xNumberOfFreeBlocks, xMinimumEverFreeBytesRemaining, xNumberOfSuccessfulAllocations, xNumberOfSuccessfulFrees뿐이다. 145행 주석과 148행 산문의 `xMaximumFreeBlockSize`는 없는 필드다. (2) 내부 산술 모순: 79행은 first level을 2^n bucket으로 정의하므로 2 KB bucket은 [2k, 4k)다. 85행 식 `(size - 2^fl) / (2^(fl-4))`이면 sub-bucket 16개, fl=11에서 폭 128 B인데 81행 예시 '2k, 2.25k, 2.5k, 2.75k'는 폭 256 B짜리 4개라 3k까지만 덮는다. 85행·79행과 동시에 참일 수 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | malloc 내부 단계(25~28행), fragmentation(34~51행), 전략 표(55~62행), 표준 표(66~72행)는 흔한 개념 목록이다. 이 글 쪽 재료는 buddy split 예시(128~133행), TCM/SDRAM/SRAM section 배치(152~156행), 누리호 주장(169행) 정도인데 169행과 180행 'ITAR이나 NIST'는 출처가 없다. 30행 '수 µs에서 수 ms'도 환경이 없다. 선택 기준·실패 사례 분석이 없어 6~12 구간. |
| B | 8 | 문제(17~30행) → fragmentation(32~51행) → 전략(53~62행) → 대안(74~135행) → 측정(137~148행) → 실수(182~220행) → 정리(222~228행) 흐름은 있다. TLSF는 90행에서 4-03으로 넘기고, pool 함수 본문은 주석뿐이다(114~119행). 표준 표는 한 줄 요약이고 WCET 방법은 175행 목록 한 줄뿐이다. 145·148행 필드명 오류와 81/85행 모순도 있어 5~9 구간. |
| C | 4 | 196~198행 `free();`는 인자가 없고, 98~100행은 xTaskCreateStatic 호출을 선언 형태로 썼으며 95행 uint8_t 배열을 스택 버퍼로 넘긴다. 141~145행 측정 코드는 없는 필드를 가리킨다. 대상 MCU·FreeRTOS 버전·예상 출력이 없다. 30행 수치는 출처·환경이 없어 C ≤ 8이고 측정 절차가 없어 4~7 구간 하단. |
| D | 7 | 같은 시리즈: 137~148행 heap 측정 ↔ part4-02 172~189행(183·189행은 올바른 필드명), 61~62행 Heap_4/5 ↔ part4-02 107~131행, 74~90행 TLSF ↔ part4-03 축약, 66~72행 표준 표·92~103행 static ↔ part4-04 22행 등, 107~111행 pool(32×64) ↔ part4-05 29~30행(상수까지 같음). 직전 글 part3-11과는 겹침 없음. 다른 시리즈: modern-recipes/part8-01-dynamic-memory.md 26~27·33·118~122행. 본문 대부분이 뒤 편 요약이라 5~9 구간. |
| E | 6 | 제목의 Determinism(15·30행)·Fragmentation(32~51행)은 다루지만 WCET는 30·57·135행 언급과 175행 한 줄뿐이다. 제목이 '분석·진단'을 약속하지 않아 3~5가 아니라 키워드 하나 부분 미이행으로 6~8 구간에서 감점. description 'WCET-bounded allocator'도 78~88행 의사코드에 그친다. |
| F | 6 | 230행 다음 편 안내는 seriesOrder 34 part4-02-freertos-heap.md와 맞다. 234~236행 관련 항목 라벨(3-10, 4-02, 4-03)과 90행 '4-03 편' 안내도 맞다. 전제 지식·단계 구분 같은 글 고유 구조가 없어 7 이상은 주지 않았다. |
| G | 1 | 본문 출처는 76행 'Masmano 2004' 저자·연도뿐이다. 68~72행 MISRA·DO-178C·CERT·ISO 26262 조항에 판·원문이 없고 FreeRTOS 버전·코어·툴체인 표기도 없다. 169행 누리호 사례도 출처가 없다. |

uncertainties:
- 70행 'CERT C MEM34-C — realloc 후 NULL 검사': 기억으로는 MEM34-C가 '동적으로 할당한 메모리만 free' 규칙이다. 원문 미확인.
- 68행 'Rule 21.3 — malloc/free 사용 금지 (Dir 4.12)'의 MISRA C:2012 판과 Rule/Dir 관계 미확인.
- 169행 누리호, 180행 'ITAR이나 NIST'(ITAR은 수출 통제 규정이라 관련성 의심) 출처 없음.
- 61행 'Heap_4 first-fit'과 part4-02 107행 'Best Fit'이 다르다(다른 글 간 모순, heap_4.c 확인 필요).
- 98~100행 호출·인자 형태는 그대로 컴파일되지 않을 가능성이 크다(API 의미 판단이라 오류 확인에 넣지 않음).
- 217행 'ISR에서 malloc → heap lock deadlock': heap_4는 vTaskSuspendAll을 써 실패 양상 미확인.
- 30행 '수 µs에서 수 ms' 출처·환경 없음. 122행 'fragmentation 0'은 46~51행 internal fragmentation을 고려하지 않은 표현일 수 있다. 42행 '총 free 6 KB'는 39행 그림 단위가 없어 산술 확인 불가.

병합 대상: 판정은 오류 확인에 따른 우선 조치다. 점수 구간(41, 병합 검토) 기준 후보는 part4-02-freertos-heap.md(heap 측정·Heap_4/5), part4-04-static-allocation.md(표준·static API), part4-05-memory-pool.md(pool)다. 이 글은 Part 4 도입 역할이 있어 다음 조치는 보강이다. 145·148행 필드명을 xSizeOfLargestFreeBlockInBytes로, 81행 예시를 85행 식과 맞게 고친 뒤 뒤 편 요약을 줄이고 할당 전략 선택 기준과 WCET 분석 절을 보강할지 판단한다.

### `part4-02-freertos-heap.md` — 57점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(rubric 3-1). 같은 heap_4 탐색 정책을 107행 제목 "Heap_4 — Best Fit + Coalesce", 158행 "heap_4와 같은 best-fit + coalesce", 244행 "heap_4는 best-fit + coalesce 조합"은 best-fit이라 하고, 131행은 "alloc은 first-fit입니다. free list 앞에서부터 충분히 큰 첫 block을 찾습니다"라고 한다. 두 구체 진술은 동시에 참일 수 없다. git log(85a2d46f 번역투, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 24~170행 heap_1~5 구조 설명은 FreeRTOS 공식 메모리 관리 문서 범위와 같고 코드는 29행 '핵심만' 재구성이다. 이 글만의 것은 189행 단편화 판단 규칙(largest free block이 총 free의 절반 이하), 160행 heap_5 region 선택 불가와 DMA pool 권고, 212~216행 heap_4 측정 표와 218행 '제어 루프 안 alloc 금지' 기준이다. 6~12 구간 상단. |
| B | 12 | 16~22 → 24~160 → 164~170 비교표 → 172~189 측정 → 191~206 hook → 208~218 WCET → 220~236 함정 → 238~246행 정리로 흐름은 끝까지 간다. heap_4 정책이 107·158·244행과 131행에서 엇갈리고 103·160·183행 불확실이 열려 있어 B ≤ 13. |
| C | 7 | 210~216행 측정값은 'Cortex-M4 168 MHz, DWT cycle counter'만 적고 heap 크기·block 분포·측정 코드·FreeRTOS 버전·출처가 없다(C ≤ 8). 표는 '평균'인데 131·218행은 'worst case'로 말한다. 176~187행 heap stats·195~204행 hook에 예상 출력·관찰 결과가 없다. 4~7 구간. |
| D | 11 | 비교 글: part4-01(33), part4-03(35), part5-01-freertos-source.md(46), modern-recipes/part8-01-dynamic-memory.md. 164~170행 heap 표 ↔ part8-01 120~126행, 176~189행 HeapStats ↔ part4-01 139~148행, 208~218행 heap_4 측정 ↔ part4-03 184~190행, 222~224행 heap_1 free 함정 ↔ part5-01 383~385행. 다섯 구현을 하나씩 해부하는 글은 이 글뿐이라 10~14. |
| E | 7 | 제목 '5종 Allocator의 구조와 트레이드오프'를 24~170행이 이행하고 비교표·선택 기준까지 있다. description 'source 수준에서 비교'는 29행 재구성 코드라 약하고 heap_4 정책이 엇갈려 6~8 중간. |
| F | 7 | 248행 다음 편 4-03은 seriesOrder 35 part4-03-tlsf.md와 맞다. 252~256행 관련 항목 5개(4-01, 4-03, 4-04, 4-05, 4-06) 라벨·번호가 대상과 맞다. 218·246행이 본문에서 다음 행동을 안내한다. 전제 지식 안내·렌더 확인이 없어 9 이상 불가. |
| G | 1 | 본문 1차 출처 링크 없음. FreeRTOS 버전, heap 소스 판, 측정 보드(210행은 코어·클록만) 없음. 79행 '공식 문서가 deprecated로 안내'도 링크·버전 없음. |

uncertainties:
- 103행 heap_3 영역을 `_heap_start`·`_heap_end` 링커 심볼로 단정(toolchain마다 다름). 미확인.
- 39행 heap_1 경계 조건과 실제 heap_1.c 비교식 미대조. 160행 heap_5 'region 배열 순서대로 채워' 표현 정확성 미확인.
- 145행 0x20000000 'internal SRAM 64 KB'와 141행 STM32H7 DTCM 언급. RM 미확인.
- 131·218행 worst case 대 212~216행 평균. part4-03 190행은 같은 조건에서 heap_4 worst 15 µs(다른 글과의 모순 후보).
- 183·189행 필드명과 part4-01 147~148행 'xMaximumFreeBlockSize'가 다르다(4-01 쪽이 portable.h와 다름).
- 79행 heap_2 deprecated 출처, 137행 'STM32 / nRF / ESP32 BSP 대부분이 heap_4 기본' 출처 없음.
- 109행 '단편화가 폭발하지 않습니다'와 228행 '며칠 가동 후 큰 alloc 실패'의 완곡·단정 충돌(A·C 감점 대상). 182·186행 printf 라벨 'free total' 중복.

병합 대상: 판정은 오류 확인에 따른 우선 조치다. 점수 구간은 병합 검토이나 병합 대상 없음 — modern-recipes/part8-01은 120~126행 표 하나만 겹치고 part4-01·part4-03은 다른 질문을 다룬다. 다음 조치는 보강: heap_4.c로 탐색 정책을 확인해 107·131·158·244행을 하나로 맞추고, 210~216행 측정값의 환경·코드·출처를 밝히거나 지운다.

### `part4-03-tlsf.md` — 61점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 산술 모순(rubric 3-1, AP-C-24). 36행 'Level 2 — 각 FL bucket을 2^M 등분 (보통 M=4 → 16등분)', 37행 'FL[6] (64~127)', 38행 'SL[0]=64-71  SL[1]=72-79  SL[2]=80-87  ... SL[15]=120-127'. 64~127은 64 byte이므로 16등분이면 칸 폭이 4 byte(SL[0]=64-67)다. 38행처럼 8 byte 폭이면 SL[15]는 184~191로 FL[6] 범위를 벗어나고 120-127은 SL[7]이다. 41행 '1/16 ≈ 6.25%'는 16등분을 따르므로 38행 예시가 틀렸다. git log(42ebbcbb, 2bb21c78, 2083e506, 8ee66588, 845231cf, 85a2d46f, fec6fe94, ac24bb76, be973200, 0a9dd7bc)에 Masmano 논문·mattconte/tlsf와 대조한 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | bitmap 두 단계를 따라가는 alloc 코드(63~97행), prev_phys 기반 coalesce(118~139행), CLZ 없는 Cortex-M0에서 O(1)이 약해진다는 구분(110~112·256~258행), VxWorks partition 비교(223행), SLUB와 목표 차이(236~240행)가 이 글만의 것이다. 22·197·211·266행 채택 주장은 출처가 없어 상단으로 올리지 않았다. 13~19 구간. |
| B | 12 | 문제(18~22) → 구조(24~57) → alloc(59~99) → CLZ(101~112) → free(114~143) → 단편화 상한(145~152) → 라이브러리(154~182) → 성능(184~193) → 단점·함정(225~258) → 정리(260~268행). 구조 절 첫 예시(36~38행)가 틀렸고, 코드는 block_split·tlsf_insert·tlsf_remove·ptr_to_block 없는 조각이며 130행 next 주소와 125·133행 HEADER 가산의 size 정의가 열려 있다. B ≤ 13에 내부 오류를 더해 12. |
| C | 6 | 성능 표(186~191행)는 'Cortex-M4 168 MHz, 32 KB heap, random alloc/free 100회'만 있고 측정 도구·버전·컴파일 옵션·출처가 없다(C ≤ 8). 229~231행 '1 KB 가량', '약 2 KB', '50% 이상', 152행 '90% 이상'도 출처 없음. 158~180행 mattconte 사용 예만 그대로 쓸 수 있고 검증 절차가 없어 4~7 구간. |
| D | 13 | 비교 글: part4-01(33), part4-02(34), part4-04(36), part4-05(37), modern-recipes/part8-01-dynamic-memory.md, part3-08-memory-layout.md. part4-01 74~90행은 미리보기로 이 글 28~45행과 겹친다. part8-01 162~179행 tlsf API 예는 이 글 158~174행과 거의 같다. part4-02 210~218행 heap_4 실측은 이 글 188~191행과 근거가 다르다. 63~143행 해설은 이 글에만 있어 10~14 상단. |
| E | 7 | 제목 'TLSF Allocator 분석 — O(1)'과 59~143행이 맞는다. description의 'Masmano 2004'는 서지가 없고 '표준 allocator가 된 이유'는 195~211행 출처 없는 채택 주장으로만 답해 6~8 중간. |
| F | 7 | 270행 다음 편 4-04는 seriesOrder 36 part4-04-static-allocation.md와 맞다. 274~277행 관련 항목 4개 라벨이 대상과 맞다. 18행이 heap_4 글을 링크하고 45·47행이 구조를 잡아 준다. 246행 '4-05' 링크 없음, 154행 'tlsf-bsd'와 156행 mattconte/tlsf 이름 불일치. 렌더 확인 없음. |
| G | 2 | 20·147행 'Masmano 등 2004', 156행 'mattconte/tlsf(MIT)'가 이름으로만 있다. 논문 제목·학회, 저장소 URL·버전, ROS 2 배포판(200~208행), VxWorks 버전(217~221행)이 없고 성능 표도 출처가 없다. |

uncertainties:
- 130행 다음 block을 `b + b->size`로 구하는데 125·133행은 size가 헤더를 뺀 값임을 전제한다. 코드 의미 판단이라 오류 확인에 넣지 않았다.
- 150행 '≤ 25% (실측)'과 147·265행 '수학적으로 보장'이 같은 수치의 근거를 다르게 적는다. 논문 미확인.
- 67행 fl < SL_BITS에서 shift 음수, 70행 경계 크기 처리. mattconte mapping_search 미대조.
- 45·103행 ctz가 ARMv7-M에서 RBIT+CLZ로 컴파일되는지 미확인.
- 22행 PREEMPT_RT·VxWorks의 TLSF 사용, 197행 micro-ROS '표준 권장' 출처 없음. 215~223행은 VxWorks partition을 별개 기법으로 설명해 22행과 결이 다르다.
- 154행 'tlsf-bsd'와 156행 mattconte/tlsf 동일 여부, 156·230행 '약 2 KB', 229행 '1 KB' 미확인.
- 188~191행 heap_4 worst 15 µs와 part4-02 210~218행 측정의 조건 차이(다른 글과의 모순 후보).

### `part4-04-static-allocation.md` — 59점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic, ac24bb76 제목 변경, fec6fe94 text 블록 정리, 85a2d46f 번역투 등)에 FreeRTOS 소스·MISRA C:2012·DO-178C·GCC 문서와 대조한 커밋이 없다. 글 안의 산술(183~189행 896+64+64+256=1280, 160~162행 0x20000400+0x800=0x20000c00)은 맞는다. 31·36행 'StackType_t[2048], stack depth in words'와 160행 nm 크기 0x800의 불일치는 포트 정의가 필요하고 160행 출력이 31행 코드의 빌드 결과라 명시되지 않아 오류 확인으로 올리지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | `*Static` API 묶음(28~64행), `configSUPPORT_DYNAMIC_ALLOCATION 0`으로 동적 API를 링크 단계에서 막는 방법(68~73·282행), DTCM·SRAM·SDRAM 배치(127~146행), `.su` 값으로 worst path를 합산하는 예산 표(183~189행), static+pool 절충 기준(270~272행)이 이 글의 구성이다. 157·175~178행 출력은 예시이고 22행 사례·237행 '수십 인-월'은 출처가 없다. 13점. |
| B | 13 | 16~22 → 24~73 → 75~103 → 105~123 → 125~148 → 150~166 → 168~196 → 198~228 → 230~237 → 239~266 → 268~272 → 274~294 → 296~304행으로 흐름이 닫히고 한계 절도 있다. 77·148행, 232~235행 인용, 189행 byte와 36·222행 word 단위 혼용이 열려 있어 B ≤ 13. |
| C | 7 | API 호출(33~63행), config(69~70행), 훅(80~100행), 명령(155·159·173행)은 옮길 수 있다. 대상 MCU·FreeRTOS/Zephyr·툴체인 버전이 없고 157·160~162·175~178·189행이 환경 없는 수치라 C ≤ 8. 191행 '2배 이상'도 출처 없음. 검증은 73·103행 link error 언급뿐이다. |
| D | 11 | 같은 시리즈: part4-01 91~98·160~169행 ↔ 이 글 22·28~40·239~264행, part4-06 82~86·107~111·113행 ↔ 168~196행. part4-03(35)·part4-05(37)는 주제가 다르다. 다른 시리즈: modern-recipes/part8-01 104~116행 ↔ 42~46행, part8-09-stack-analysis.md 157~168행 ↔ 170~179행, embedded-cpp/part3-01-no-dynamic-alloc.md 36행 ↔ 22행. 전용 장이라 역할은 구별된다. |
| E | 7 | description이 약속한 Static API(24~73행), Zephyr(105~123행), linker section(125~148행), MISRA/DO-178C(230~237행)를 모두 다루고 제목·정리(298~304행)가 같은 질문을 향한다. 대상 독자·상황이 없어 9점 이상은 아니다. |
| F | 7 | 306행 다음 편 4-05는 seriesOrder 37 part4-05-memory-pool.md와 맞다. 310~314행 관련 항목 5개 라벨이 대상과 맞다. 18·272행의 본문 안 연결이 있다. 278행과 part4-06 111행이 서로 미루고 전제 지식 안내가 없어 9점 이상은 아니다. |
| G | 1 | 외부 링크 0개. 22·232행 'MISRA C:2012 Dir 4.12'는 판이 있지만 233~235행 인용문은 출처가 없고 FreeRTOS·Zephyr·GCC 버전이 없다. 22행 사례도 출처 없음. |

uncertainties:
- 77행 'FreeRTOS는 두 weak 함수를 정의하지 않으므로'가 configKERNEL_PROVIDED_STATIC_MEMORY와 맞는지 미확인. 103행 '부팅 자체가 안 됩니다'는 link error와 어긋난다.
- 91~100행 timer task 훅이 configUSE_TIMERS=1일 때만 필요한지, 148행 NOLOAD 0 채움 설명 미확인.
- 31·36행 StackType_t[2048](word) 대 160행 0x800(byte). 32-bit 포트면 8192 byte여야 한다.
- 189행 byte 결과 2048을 222·254행 word 인자에 쓰는 단위 혼용(part4-01 96행은 sizeof(StackType_t)로 나눔).
- 200행 `_init_array` 표기(embedded-cpp/part1-03 136~139행은 `.init_array`·`__libc_init_array`)와 Reset_Handler 설명 미확인.
- 232~235행 표준 인용 문구, 22행 누리호·BMW iX·Boeing 787 주장, 237행 '수십 인-월', 191행 '2배 이상' 출처 없음.
- 287~290행 초기화된 const 배열·`.rodata.lut` 권고 미확인.

병합 대상: 병합 대상 없음. 다음 조치: 보강. 겹치는 글(part4-01 91~98·160~169행, part4-06 107~113행, modern-recipes part8-01·part8-09)은 static allocation이나 `-fstack-usage`를 한 절로만 다루고 part4-06 111행이 이 글의 stack 계산 절을 앵커로 참조하므로 이 글이 전용 장이다. 232~235행 인용 대조, 77행 훅 기본 구현 확인, 148행 NOLOAD 확인, 22행 사례 출처 확인 또는 삭제, 157~178행 출력에 빌드 환경 표시, 189행 byte/word 단위 정리가 보강 항목이다.

### `part4-05-memory-pool.md` — 55점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub, 2bb21c78 재번호, 2083e506·8ee66588 Part 4 일괄 작성, 85a2d46f 번역투·공개, ac24bb76, be973200, 0a9dd7bc)에 CMSIS-RTOS v2·FreeRTOS·lwIP·Linux 소스와 대조한 커밋이 없다. 1차 자료를 열지 않았고 동시에 참일 수 없는 두 진술도 찾지 못했다(240~242행 64×200µs/1ms=12.8→16, 25%=4, 합 20은 맞음. 159행 ISR의 pool_alloc과 325행 'mutex 기반 pool은 ISR에서 deadlock'은 mbuf_pool 구현이 없어 조건부).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 26행 block 안 next 포인터 재활용, 110~140행 FreeRTOS static queue를 pool로 쓰는 패턴, 236~243행 peak burst sizing, 249~268행 CAS peak_use 통계가 이 글의 예제다. free list·per-class·lock-free·multi-size는 표준 목록이고 89·108·309행은 출처 없는 일반론이다. 13~19 하단. |
| B | 12 | 16~22 → 24~68 → 91~140 → 142~176 → 178~211 → 213~230 → 232~270 → 272~303 → 305~325 → 327~335행으로 흐름은 완성됐다. 48행 pool_alloc(void)이 85·159·257·295행에서는 pool_t 인자를 받고 pool_t·pool_create·p->stats 정의가 없다. 159 대 325행, 161행 memcpy 길이 검사 누락이 열려 있어 B ≤ 13. |
| C | 6 | C 코드(28~64·182~209·249~268행)는 있지만 MCU·RTOS 버전·컴파일 환경이 없고 75~86·155·256~262·291행은 정의되지 않은 타입을 써 컴파일되지 않는다(AP-C-35). 236~243행은 가정 수치, 270행 80%·309행 25%·274행 32/64 byte는 출처 없는 수치라 C ≤ 8. 검증 절차가 없어 4~7. |
| D | 9 | embedded/embedded-cpp/part3-03-pool-allocator.md와 핵심이 겹친다: free list 26~66행 ↔ 39~59행, lock-free CAS·ABA 182~211행 ↔ 260~299행, multi-size 285~303행 ↔ 405~435행, peak 통계 247~270행 ↔ 305~340행, 함정 309~317행 ↔ 382~397행. part4-01 105~121행에 같은 빈 pool 코드가 있다. modern-recipes/part8-01 48~80행은 구조가 달라 겹침이 작다. 인접 4-04·4-06은 주제가 갈린다. linux-kernel-internals/part3-03-slab-slub-slob.md는 draft. 이 글만의 부분은 RTOS API 쪽(91~176·213~230행)이라 5~9 상단. |
| E | 7 | 제목은 결과를 말하지 않지만 과장은 아니다. description이 약속한 free list(24~68행), O(1)(66행), per-class(70~89행), lock-free(178~211행)가 모두 있다. '실전 패턴'에 비해 실측·환경이 없어 6~8. |
| F | 7 | 337행 다음 편 4-06은 seriesOrder 38 part4-06-stack-overflow.md와 맞다. 341~345행 관련 항목 5개 라벨·번호가 맞다. 18행이 본문 안에서 이어 준다. 176행 '4-04에서 본 정적 sizing 원칙'은 링크가 없고 4-04에 해당 절이 없다. 전제 지식 안내 없음. |
| G | 1 | 본문 1차 출처 링크 없음. 93행 CMSIS-RTOS v2, 142행 lwIP·FreeRTOS+TCP, 213~230행 Linux SLUB를 이름만 대고 판·버전이 없다. |

uncertainties:
- 215행 'SLAB → SLUB → SLOB → SLUB(현재 기본)' 순서와 각 도입·제거 시점 미확인.
- 22·142~144행 'lwIP의 mbuf' 명칭: lwIP는 pbuf/memp를 쓰는 것으로 기억하나 미확인.
- 159행 ISR pool_alloc과 325행 deadlock 경고의 관계(mbuf_pool 구현 없음). 161행 len 검사 없음.
- 178~211행 제목은 SPSC인데 양쪽 CAS 루프. 211행 ABA 미발생 주장 미검증.
- 48행 대 85·159·257·295행 시그니처 불일치(AP-C-35 후보). 100행 osMemoryPoolNew 인자 순서 미확인.
- 274행 cache line, 283행 비정렬 DMA 무효화 주장 출처 없음. 277~280행 aligned(64) 구조체는 64-bit에서 68 byte→128 byte 패딩.
- 68행 최소 block 크기 표현, 14행 '단편화 0'과 303행 internal fragmentation 표현 차이. 309행 25%와 embedded-cpp part3-03 394행 10~20% 마진 차이.

병합 대상: 후보는 `src/content/blog/embedded/embedded-cpp/part3-03-pool-allocator.md`(free list·lock-free·multi-pool·통계·함정이 겹침). 이 글은 C/RTOS API(osMemoryPool, FreeRTOS queue 기반 pool, lwIP/mbuf, Linux kmem_cache)라는 독립 검색 의도가 있어 rubric 5절 '차별화 보강' 조건을 따른다. 다음 조치: 보강. 겹치는 lock-free·multi-size 설명은 줄여 embedded-cpp 3-03으로 링크하고, RTOS API 절을 1차 자료로 검증해 출처를 붙이고, pool_t 정의를 하나로 맞춘다. part4-01 105~121행의 빈 pool 코드를 이 글 링크로 바꾸는 것도 함께 검토한다.

### `part4-06-stack-overflow.md` — 55점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건. (1) 47~50행 코드는 pxStack부터 16 byte를 모두 검사해 한 word라도 바뀌면 hook을 부르는데, 54행은 'Method 2는 16 byte보다 작은 침범은 놓친다', 56행은 'Method 2는 경계를 살짝 침범한 순간까지도 잡는다'고 한다. 같은 Method 2의 검출 범위에 대한 두 진술이 동시에 참일 수 없다. (2) 150행 'stack을 1 byte라도 넘기는 순간 MemManageFault… 침범과 동시에 검출'(142~145행 32 byte guard)과 203행 '큰 stack frame이 guard page를 건너뛰고 침범할 가능성', 212행 'probe를 넣어야 guard가 반드시 건드려진다'가 MPU guard 검출 보장을 반대로 말한다. git log(42ebbcbb·2bb21c78·2083e506·8ee66588 작성, 85a2d46f, 1b2ffe6a·a0f21c45, ac24bb76, be973200·0a9dd7bc, 83899a96, a82eb9d0)에서 a82eb9d0의 FreeRTOS 대조는 chapter07-rtos-troubleshooting.md 대상이고 이 파일에는 308행 관련 항목 한 줄만 더했다. 로컬 FreeRTOS-Kernel clone이 없어 1차 자료 대조는 하지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 113행 정적 worst path와 watermark 실측이 2배 이상 벌어질 때 방향별 해석, 188~197행 MSP 예산 표(128+64+64+64=320, margin 80, 400→512 산술 일치), 180행 RTOS canary와 stack protector의 역할 구분이 이 글만의 분석이다. canary·hook·HWM·패턴 채우기·stack protector·printf/recursion은 표준 목록이고, 105행 '10% 이하면 위험'·247~252행 누리호는 출처 없는 단정이다. 13~19 하단. |
| B | 12 | 16~22 → 24~30 → 32~212 → 235~254 → 256~286 → 288~297행으로 흐름은 완성됐고 199·159행 한계도 적었다. 핵심 절인 Method 2 검출 범위(54 대 56)와 MPU guard 보장(150 대 203·212)이 어긋나고, 199·286행 MSP canary는 코드 없이 한 문장이다. B ≤ 13에 내부 모순을 반영해 12. |
| C | 7 | 코드 조각(36~52·62~75·91~102·121~132·141~147·205~209행)은 있지만 버전·MCU·툴체인과 관찰 결과가 없다. 105·227·230·233·264행 수치는 출처·환경 없음(C ≤ 8). 44~51행은 재구성, 169~177행은 의사 표현이라 그대로 재현할 수 없다. |
| D | 8 | 인접 part4-05(37)·part4-07(39)는 겹침 없음. modern-recipes/part8-09-stack-analysis.md: 39~58 ↔ 117~135, 85~96 ↔ 58~78, 98~112 ↔ 161~180, 114~132 ↔ 137~159, 157~180 ↔ 107~115, 203~229 ↔ 214~233·256~282행. part4-04 191행 ↔ 113행, 276~278행 ↔ 258~260행. tools/debugging/embedded/chapter07-rtos-troubleshooting.md 268~302행 ↔ 32~105행. MSP 예산·Method 비교·stack probe는 이 글에만 있지만 part8-09와 반복이 커 5~9. |
| E | 7 | 제목의 Canary(32~56)·MPU(137~159)·Watermark(80~105행)와 description의 정적 분석(107~115행)을 다룬다. '3중'이라면서 14행 세 층, 22행 네 층, 254행 '3중 4중'으로 범위가 흐리고 대상 환경을 밝히지 않아 6~8. |
| F | 7 | 299행 다음 편 4-07은 seriesOrder 39 part4-07-smp-rtos.md와 맞다. 303~308행 관련 항목 6개를 대조했고 Embedded Debugging 라벨도 대상 87~98행 스크립트와 맞다. 111행 앵커는 part4-04 168행 heading slug와 맞고 186행은 2-05로 전제를 넘긴다. 전제 지식 명시·렌더 확인 없음. |
| G | 1 | 본문 1차 출처 링크 없음. FreeRTOS 버전(34~56행, 152행 port_mpu.c), GCC 버전(165·203·212행), ARMv7-M/ARMv8-M ARM(139~159행) 표기 없음. 239~252행 ASIL-D·DO-178C 요구와 누리호 사례도 출처 없음. |

uncertainties:
- 40행 'Method 1 = SP 위치, Method 2 = canary'와 chapter07-rtos-troubleshooting.md 284행 설명이 다르다(다른 글과의 모순, stack_macros.h로 확인 필요).
- 44~51행 실제 Method 2 검사 바이트 수(16 대 20)와 Method 1 포함 여부 미확인.
- 14·22·254행 층 수 표기 불일치(산문 개수, 오류 확인 대상 아님).
- 224행 recursive(10)은 11 frame이라 주석 '10 KB'보다 크고 최적화로 사라질 수 있다.
- 227·230·278행 printf stack 수치가 서로 다르고 출처 없음.
- 212행 arm-none-eabi의 -fstack-clash-protection 지원, 208행 probe 간격 4 KB 미확인. 152행 MPU port 범위, 159행 region 수 미확인.
- 142~147행 RBAR 32 byte 정렬과 비표준 매크로명. 239~245행 표준 근거 조항, 247~252행 누리호 사례 출처 없음.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 후보는 `src/content/blog/embedded/modern-recipes/part8-09-stack-analysis.md`(같은 방어 층을 같은 순서로 다룸). 이 글은 Method 1/2 비교·MSP 예산(188~199행)·정적/실측 차이 해석(113행)이라는 독립 검색 의도가 있어 차별화 보강 조건을 따른다. 다음 조치: 보강 — 54·56행과 150행을 stack_macros.h·ARMv7-M ARM으로 대조해 고치고, 출처 없는 수치(105·227·230·233·264행)와 누리호 사례를 확인하거나 지우고, part8-09와 겹치는 일반 목록을 줄인다.

### `part4-07-smp-rtos.md` — 60점, 보강

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub, 2bb21c78 재번호, 2083e506·f4900e11 본문, 845231cf 다이어그램, 85a2d46f 번역투·공개, ac24bb76, be973200, 0a9dd7bc)에 FreeRTOS·Zephyr 소스나 ARM·RP2040 문서와 대조한 커밋이 없다. 로컬 clone이 없어 1차 자료를 열지 못했다. 250~253행 cycle↔µs 환산과 256행 4배·10배는 맞고, 동시에 참일 수 없는 모순은 확정하지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | global/per-core ready list 의사코드(30~39·48~57행)를 나란히 놓고 분석 표(70~76행)와 선택 기준(78행)을 준 것, affinity 표(202~207행)와 243행 결론이 이 글만의 구조다. IPI(137행), spinlock+IRQ disable(143~162행), CFS·EAS(241행)는 표준 내용이고 44·75행 경계와 168~174·249~254행 수치가 출처 없음. |
| B | 13 | 18~22 → 24~78 → 80~104 → 106~123 → 125~139 → 141~162 → 164~198 → 200~217 → 219~243 → 245~256 → 258~284 → 286~295행으로 완성됐다. 108·123·291행 Zephyr runqueue, 82행 FreeRTOS 11 연도, 139행 PendSV, 178행 RP2040 cache, 253행 big↔little 불확실이 열려 있어 B ≤ 13. |
| C | 7 | FreeRTOS config·affinity(84~102행), Zephyr cpu_mask(110~121행), RP2040 SIO FIFO(180~196행)는 실제 API 조각이다. 30~57·223~238행은 의사코드이고 측정 표 두 개(168~174·247~254행)는 OS·도구·방법·출처가 없다(C ≤ 8). 4~7 상단. |
| D | 10 | 인접 part4-06(무관)·part4-08, 같은 시리즈 part2-03-scheduler-algorithm.md·part5-01-freertos-source.md·part5-02-zephyr-source.md, 다른 시리즈 performance-engineering/part4-10-smp-analysis.md. 84~98행 ↔ perf-eng 103~108행, 119~120행 ↔ 116~117행, 108행 ↔ perf-eng 120행·part5-02 123행, 137행 ↔ perf-eng 136~145행, 264~270행 ↔ 233~243행, 90행 ↔ part5-01 349행, affinity 예 ↔ part2-03 87~98행. 역할이 갈려 10~14 하단. |
| E | 8 | Ready List(24~78)·Affinity(200~217)·IPI(125~139)·Load Balancing(219~243행)을 모두 절로 다루고 description의 FreeRTOS 11·Zephyr(80~123), cross-core wake(139), coherency(164~198행)도 있다. 직접 대조 표와 대상 독자 명시가 없어 9점은 아니다. |
| F | 7 | 297행 다음 편 4-08은 seriesOrder 40 part4-08-spinlock-smp.md와 맞다. 301~304행 관련 항목 라벨(2-03, 3-01, 4-06, 4-08)이 맞다. 22행 '4-12편 OpenAMP'는 링크는 없지만 part4-12-amp-openamp.md 주제와 맞다. 4-06은 관련이 약하고 전제 지식 안내가 없다. |
| G | 1 | 본문 1차 출처 링크 없음. 버전은 'FreeRTOS 11'(20·82행)뿐이고 Zephyr·Linux·pico-sdk 버전, GIC 문서(127행) 출처가 없다. 측정 표도 출처·도구 없음. |

uncertainties:
- 82행 '2022년 발표된 FreeRTOS 11': 기억으로는 11.0.0이 2023년 말. part2-03 89행은 '10.5 이상'. release note 확인 필요.
- 108·123·291행 'Zephyr per-CPU runqueue + push/pull': Zephyr sched.c는 SMP에서도 단일 ready queue를 쓴다고 기억함. 미확인.
- 139행 Cortex-A GIC 맥락의 PendSV(Cortex-M 예외) 미확인. 178·274행 RP2040 cache flush: Cortex-M0+에 data cache가 없다고 기억함. datasheet 미확인.
- 247행 'Cortex-A53 4 core SMP'와 253행 'cross-cluster (big↔little)' 행이 같은 환경으로 성립하는지 의문.
- 149행 spin_lock_irqsave(&lock, &flags) 인자 형태, 134행 portYIELD_CORE 존재 미확인.
- 172행 '한가' 라벨에 contended 값이 섞임. 168~174·249~254행 측정값, 44·75행 core 수 기준 출처 없음.
- 294행 'coherency는 hardware로 제공'과 178행 'RP2040은 coherency가 없다'의 범위 차이.

### `part4-08-spinlock-smp.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(42ebbcbb stub, 2bb21c78·2083e506·f4900e11 집필, 85a2d46f 번역투·발행, fec6fe94 코드블록, ac24bb76, be973200·0a9dd7bc)에 1차 자료 대조 커밋은 없다. 원문 내부 모순 두 건: (1) 60행 "CASAL 한 줄 3 cycle로 줄어듭니다. contention이 심할수록 차이가 더 벌어집니다"와 312행 "CASAL은 … contention 환경에서 큰 이득"은 65행 표의 강한 contention 행(LDREX/STREX 20~50 cycle, CASAL 30~80 cycle)과 동시에 참일 수 없다. (2) 47행은 LSE 지원을 "Cortex-A55, A75 이후"로 적었는데 62행 표는 CASAL 수치를 Cortex-A72 열로 적어, 글 스스로 LSE가 없다고 한 코어에서 CASAL을 잰 셈이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | LSE 명령과 컴파일러 플래그(45~67행), WFE/SEV 저전력 spin(120~143행), ESP-IDF portMUX(221~239행), LDREX·STREX 사이 접근과 lock 순서 함정(269~307행)이 이 글만의 내용이다. TTAS·ticket·MCS(94~219행)는 교과서 목록이고 Perf Eng 4-04와 거의 같다. 141행 'mA 단위', 219행 '10배 이상 보고'는 근거가 없고 선택 기준(252·265행)은 출처 없는 표(258~263행)에 기댄다. |
| B | 12 | 18~20행 문제 정의에서 309~317행 정리까지 간다. 60·312행과 65행이 충돌해 'LSE를 언제 쓰나' 결론이 흔들리고, MCS(188~214행) me->next 비원자 접근, 239행 ESP32 설명이 열려 있어 B ≤ 13. 143행 'SEV 없이 되는 변형'은 코드가 없다. |
| C | 6 | 실행 환경·빌드 명령·예상 출력이 없다. 62~65·256~263행 표는 'Cortex-A72 4 core' 외에 방법·클록·컴파일러·반복 횟수가 없어 C ≤ 8. 252행 '~1 µs'도 출처 없음. cpu_relax(83·105·160행)·shared_counter(234행) 정의가 없어 컴파일되지 않는다. |
| D | 7 | 비교 글: part4-07(39), part4-09(41, 겹침 없음), part3-01-critical-section.md(22), performance-engineering/part4-04-spinlock.md(33). Perf Eng 4-04와 LDREX/STREX 28~38 ↔ 58~67, TTAS 100~118 ↔ 71~87(118 ↔ 85), ticket 149~172 ↔ 89~111, MCS 178~217 ↔ 113~141, qspinlock 219 ↔ 143, spin·mutex 252 ↔ 14·38행이 대응한다. A72 측정(254~263 ↔ 254~266행)은 내용은 다르고 보드 표기만 같다. part4-07 143·154·104행이 이 글 18·239행에서 반복. 5~9 구간. |
| E | 7 | 제목 키워드 LDREX/STREX(24~43)·Ticket(145~172)·MCS(174~219)·WFE/SEV(120~143행)를 모두 다루고 description의 LSE·TTAS·fairness도 있다. 'trade-off 정리'가 60·65행 모순으로 일관되지 않아 9점 이상은 아니다. |
| F | 7 | 18행이 4-07을 전제로 링크하고 22행이 범위를 예고한다. 319행 다음 편 4-09는 seriesOrder 41 part4-09-software-timer.md와 맞다. 323~327행 관련 항목 5개(3-01, 3-09, 4-07, 4-09, Perf Eng 4-04) 라벨이 맞다. Perf Eng 4-04와 겹치는 부분 안내가 없고 렌더 확인을 하지 않았다. |
| G | 2 | 본문 출처 링크 없음. ARMv7/ARMv8.1(26·47행), qspinlock 4.2+(219행), Mellor-Crummey·Scott 1991(176행) 표기뿐이고 ARM ARM 절, 논문 제목, 커널 소스 위치, ESP-IDF 버전이 없다. |

uncertainties:
- 47·62행 Cortex-A72(ARMv8.0)의 LSE 미지원 여부를 ARM 문서로 확인하지 않았다. 미지원이면 64~65행 CASAL 수치 전체가 성립하지 않는다.
- 62~65·256~263행 측정 환경·출처 없음. part4-07 172행과 260행 12 cycle이 같은 출처인지 미확인.
- 239행 ESP32(Xtensa LX6)에는 LDREX/STREX가 없고 S32C1I 기반으로 기억하나 ESP-IDF 미확인.
- 273·277행 LDR이 monitor를 반드시 clear한다는 주장, 143행 event 조건, 137행 dsb 범위 미확인.
- 188~214행 MCS me->next 데이터 레이스와 206행 캐스트 적합성 미확인.
- 219행 '10배 이상' 출처와 qspinlock 4.2 미확인. part3-01 117행 'ARMv8 이상 casal'과 47행의 글 간 불일치. 141·252행 수치 출처 없음.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 후보는 `src/content/blog/embedded/performance-engineering/part4-04-spinlock.md`(TTAS·ticket·MCS 코드와 qspinlock·spin/mutex 기준이 대응). LSE·WFE/SEV·RTOS 통합·함정이라는 독립 검색 의도가 있어 차별화 보강이 맞다. 다음 조치: 60·312행과 65행, 47행과 62행을 ARM 문서로 확인해 고친 뒤 TTAS·ticket·MCS 절은 Perf Eng 4-04로 링크해 줄이고 RTOS 고유 내용을 키운다.

### `part4-09-software-timer.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log(85a2d46f 번역투·발행, a746e269 코드블록, ac24bb76 제목, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋은 없다. (1) 1차 자료: Linux v6.6 `Documentation/timers/hrtimers.rst`(gh api, ref=v6.6)의 'hrtimer subsystem implementation details' 절은 "we chose the red black tree as the basic data structure"라고 적고, 앞 단락은 precision-sensitive API를 timer wheel에서 떼어 hrtimer로 옮긴다고 적는다. 129행 "Linux kernel의 `hrtimer`는 *hierarchical timer wheel*을 씁니다"는 이와 맞지 않는다. (2) 내부 불일치: 40행은 구조체에 '만기 tick'이 있다고 하는데 43~50행 Timer_t 구조체에는 그 필드가 없고, 65·69·76행 코드는 `expiry_tick`을 쓴다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | sorted·delta·wheel·heap 비교(94~143행), 10 ms tick에서 50 ms timer 지연 예산(253~256행), hardware timer + semaphore 기준(258~283행)이 고유하다. 핵심 자료구조 절의 129행이 틀렸고 133행 min-heap·139~141행 cycle 수는 출처가 없다. daemon·one-shot/auto-reload·FromISR(55~88·166~224행)은 FreeRTOS 문서의 기본 내용이다. |
| B | 12 | 16~24행에서 349~357행 정리까지 간다. prvTimerTask 의사코드(59~84행)에 tick overflow 처리가 없고 53행 '단일 list'로 현재·overflow 두 리스트 구조가 빠졌다. 40행과 50행 구조체 불일치, 129행 오류로 핵심 절 완결성이 떨어진다. |
| C | 6 | API 코드(149~162행), hardware timer + semaphore(260~281행)는 있지만 보드·버전·예상 결과가 없다. 139~141행 cycle 표, 256행 '51~52 ms, 60+ ms', 308행 '수십 µA', 337행 '2~3배'는 출처·환경 없음(C ≤ 8). 검증 절차 없음. |
| D | 8 | modern-recipes/part6-08-software-timer.md: 28~34 ↔ 26~29행, 312~337 ↔ 190~218행. modern-recipes/part6-11-timer-services.md는 같은 자료구조 비교를 논문·v6.6 출처와 함께 다룬다(90~143 ↔ 20~69행). part3-09-isr-safe-api.md 127~154행에 daemon 의사코드와 FromISR 예제가 이미 있다(이 글 59~84·226~247행). part2-09-tickless.md 38~113행 ↔ 285~306행. 글 안에서도 199~203행과 314~318행이 겹친다. 인접 4-08·4-10과는 겹침 없음. |
| E | 7 | 제목의 Daemon Task(55~88), 자료구조(90~143), ISR-Safe API(208~247행)와 description의 wheel·one-shot/auto-reload·PendFunctionCall(114~129·166~182·226~247행)이 있다. '분석'인데 timers.c 실제 코드가 아니라 단순화 의사코드다. |
| F | 6 | 359행 다음 편 4-10은 seriesOrder 42 part4-10-syscall.md와 맞고 363~366행 관련 항목 라벨도 대상과 맞다. 그러나 365행 4-08은 내용과 무관한 인접 번호 글이고, tickless 절(285~308행)이 2-09로 연결되지 않으며 전제 지식 안내가 없다. |
| G | 1 | 본문 1차 출처 링크 없음. FreeRTOS 버전·timers.c 위치 없음. 129·133행 Linux 구현 주장에도 커널 버전·출처가 없다. |

uncertainties:
- 133행 'posix-timers가 min-heap 위에서 동작': 기억으로는 hrtimer 위에 구현. 미확인.
- 129행 '수 ms 정확도에서 수천 개 timer를 O(1)'은 timer_list에 해당할 수 있다. 미확인.
- 53행 '단일 list'·102행 설명과 Recipes 6-11의 출처 붙은 표(timers.c V11.1.0, 두 리스트)가 다르다(다른 글과의 모순).
- 18행 'STM32F4 general-purpose timer 10개 남짓' datasheet 미확인. 255행 best case 50.0 ms의 tick 양자화 의심(기억 기반).
- 139~141·256·308·337행 수치 출처·환경 없음. 347행 silent corruption은 configASSERT 설정에 따라 다를 수 있다.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고 점수 구간은 병합 검토다. 후보는 `src/content/blog/embedded/modern-recipes/part6-08-software-timer.md`(사용법·함정)와 `src/content/blog/embedded/modern-recipes/part6-11-timer-services.md`(자료구조 비교). 먼저 129행을 v6.6 hrtimers.rst 기준(red-black tree)으로 고치고 40행과 43~50행 구조체를 맞춘다. 그다음 범위를 FreeRTOS timers.c 내부(두 리스트, overflow 전환, command 처리)로 좁혀 보강하고 자료구조 비교·함정은 6-11·6-08로 링크한다. 차별화가 안 되면 6-08과 병합을 다시 검토한다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)으로 묶었다.

- 1차 자료 대조 커밋 없음: 10편 모두 git log에 FreeRTOS·Zephyr·Linux 소스나 ARM·표준 문서와 대조한 커밋이 없다. Part 4는 2083e506·8ee66588·f4900e11 일괄 작성 뒤 85a2d46f(번역투 수정)로 발행됐다. 오류 확인이 7편이라 시리즈 단위 `/fact-check-round`가 필요하다.
- 본문 1차 출처·버전 표기 부재(G 1~2): 10편 모두. 3-11 28·296행(FreeRTOS 10만), 4-01 76행(Masmano 이름만), 4-02 79·210행, 4-03 20·147·156행, 4-04 외부 링크 0개, 4-05 93·142·213~230행, 4-06 34~56·139~159행, 4-07 20·82행(FreeRTOS 11만), 4-08 26·47·219행, 4-09 129·133행.
- 출처·측정 환경 없는 cycle·시간 측정 표(C ≤ 8): 3-11 206~214행, 4-02 210~216행, 4-03 186~191행, 4-07 168~174·247~254행, 4-08 62~65·256~263행, 4-09 139~141행. 'Cortex-M4 168 MHz'(3-11·4-02·4-03)와 'Cortex-A72 4 core'(4-07 172행·4-08·Perf Eng part4-04 254~266행) 같은 보드 표기가 반복되고 측정 코드·버전이 없다. 3-11은 표와 도입·CPU 수치가 산술로 맞지 않는다.
- FreeRTOS 내부 동작 서술이 글마다 다름: heap_4 탐색 정책(4-01 61행 first-fit, 4-02 107·158·244행 best-fit, 131행 first-fit), HeapStats 필드(4-01 145·148행 대 4-02 183·189행), configCHECK_FOR_STACK_OVERFLOW 1/2(4-06 40·54·56행, modern-recipes part8-09 96행, chapter07-rtos-troubleshooting 284행), FreeRTOS SMP 도입 버전(4-07 82행, part2-03 89행, part5-01 342행, perf-eng part4-10 111행), timer list 구조(4-09 53행 대 Recipes 6-11). FreeRTOS-Kernel 한 판으로 정리하고 확정된 오류는 `data/known-falsehoods.yaml` 등록 후보로 올린다(Zephyr per-CPU runqueue: 4-07 108·291행, part5-02 123행, perf-eng part4-10 120행 포함).
- 출처 없는 산업 사례·표준 인용: 누리호 사례(4-01 169행, 4-02 18행, 4-04 22행, 4-06 247~252행), 안전 표준 조항(4-01 66~72행, 4-04 22·232~235행, 4-06 239~245행), 채택 주장(4-03 22·197·211·266행).
- 다른 시리즈와 같은 주제 중복: 3-11 ↔ modern-recipes part9-01·part6-06, esp32 chapter10. 4-01·4-02·4-03 ↔ modern-recipes part8-01. 4-05 ↔ embedded-cpp part3-03. 4-06 ↔ modern-recipes part8-09. 4-07 ↔ performance-engineering part4-10. 4-08 ↔ performance-engineering part4-04. 4-09 ↔ modern-recipes part6-08·part6-11. 시리즈 간 역할 분담(RTOS 내부 대 사용법·측정)을 정해야 한다.
- Part 4 안 요약 반복: 4-01 74~148행이 4-02(측정)·4-03(TLSF)·4-04(static·표준)·4-05(pool, 32×64 상수까지)를 미리 반복한다. 4-04 278행과 4-06 111행은 stack 계산을 서로 미룬다.
- 컴파일되지 않는 코드 조각(AP-C-35 후보): 3-11 145·146·158·176·196행, 4-01 98~100·196~198행, 4-03 63~139행 도우미 함수 누락, 4-05 48 대 85·159·257·295행, 4-08 83·105·160·234행.
- H2 뼈대 '한 줄 요약 → 어떤 문제를 푸는가 → … → 자주 보는 함정과 안티패턴 → 정리 → 관련 항목': 4-02(12·16·220·238·250행), 4-03(12·242행), 4-04(12·16·274·296·308행), 4-05(12·16·305·327·339행), 4-06(12·16·256·288·301행), 4-07(12·16·258·286·299행), 4-08(12·16·267·309·321행), 4-09(12·16·310·349·361행). 9절 scaled content 수치 기록 대상이다.
- 다음 편·관련 항목 안내: 3-11 304행이 없는 '3-12'를 가리킨다(2bb21c78 stub 삽입·재번호 뒤 2-11, 4-11~4-13, 5-06, 5-07 앞 편도 점검 필요). 4-09 365행은 무관한 인접 번호 글(4-08)을 관련 항목에 넣었다.

## 다음 조치

- 우선 조치(7편, 이 루프에서는 원문을 고치지 않았다): 4-01 145·148행 필드명(portable.h 기준)과 81/85행 TLSF 예시, 4-09 129행 hrtimer(hrtimers.rst v6.6 기준)와 40/43~50행 구조체, 4-03 36~38행 SL 예시, 4-02 107·131·158·244행 heap_4 정책(heap_4.c 확인), 4-06 54·56·150행(stack_macros.h·ARMv7-M ARM 확인), 4-08 47·60·62·65·312행(ARM 문서 확인), 3-11 5·28·216행 수치와 304행 다음 편 안내.
- Practical RTOS Internals Part 3~4 단위 `/fact-check-round`: FreeRTOS-Kernel·Zephyr clone을 받아 heap·stack overflow·SMP·timer 서술을 한 판으로 맞추고, 확정 오류는 known-falsehoods 등록을 검토한다.
- 출처 없는 측정 표(3-11, 4-02, 4-03, 4-07, 4-08, 4-09)는 측정 환경·코드를 붙이거나 TBD로 바꾸는 방향을 시리즈 단위로 정한다.
- 병합 검토 2편(4-04, 4-05)과 우선 조치 글의 병합 후보는 다른 시리즈와의 역할 분담 결정이 먼저라 사용자에게 올린다(4-05 ↔ embedded-cpp part3-03, 4-06 ↔ modern-recipes part8-09, 4-08 ↔ performance-engineering part4-04, 4-09 ↔ modern-recipes part6-08·6-11).
- 4-07은 보강: 82·108·178행을 1차 자료로 확인하고 측정 표 출처를 정리한다.
- 렌더링·`audit:reading`·`audit:anchors`(4-06 111행 앵커 포함)는 다음 루프나 릴리스 검사에서 확인한다.
