# 공개 글 AdSense 평가 — 루프 20

> 대상: 공개 글 10편 (Embedded Performance Engineering `seriesOrder` 24~33)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 20번째 루프다. 대상은 `src/content/blog/embedded/performance-engineering/`의 `part3-06-interrupt-storm.md`~`part3-11-cxl-interconnect.md` 6편(seriesOrder 24~29)과 `part4-01-concurrency-basics.md`~`part4-04-spinlock.md` 4편(seriesOrder 30~33)이고 모두 공개 글이다. 한 시리즈라 파일 이름만 적었다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part3-06-interrupt-storm.md` | 10 | 9 | 5 | 9 | 6 | 6 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part3-07-mmio.md` | 9 | 9 | 4 | 6 | 5 | 6 | 1 | **40** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `part3-08-peripheral-clock.md` | 8 | 8 | 5 | 7 | 5 | 6 | 1 | **40** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part3-09-power-vs-performance.md` | 9 | 9 | 5 | 8 | 6 | 6 | 1 | **44** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part3-10-thermal.md` | 8 | 7 | 5 | 7 | 5 | 4 | 1 | **37** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part3-11-cxl-interconnect.md` | 11 | 11 | 7 | 7 | 5 | 4 | 3 | **48** | 검증됨 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `part4-01-concurrency-basics.md` | 9 | 8 | 4 | 6 | 6 | 6 | 1 | **40** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part4-02-false-sharing.md` | 10 | 10 | 6 | 6 | 6 | 6 | 2 | **46** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part4-03-lock-contention.md` | 11 | 11 | 6 | 10 | 6 | 6 | 1 | **51** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `part4-04-spinlock.md` | 10 | 11 | 5 | 5 | 5 | 6 | 1 | **43** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |

평균 43.5점(10편 합 435), 범위 37~51점이다. 판정은 병합 검토 9편, 우선 조치 1편(3-10)이다. 3-10은 점수 구간으로는 제외 검토(37점)지만 오류 확인이 있어 우선 조치로 뒀다. 나머지 9편은 모두 병합 검토 구간(40~59)이고, merge_note의 다음 조치는 9편 모두 보강이다(4-03은 병합 대상 없음, 나머지 8편은 후보를 적고 보강을 먼저 권함). 80점 이상 글은 없다. `factcheck: 검증됨`은 3-11 1편(4c77e2bf, CXL 3.1 spec·Arm RD-V2 문서·MICRO 2023 대조)뿐이고, 8편은 1차 자료 대조 커밋이 없다. 오류 확인은 1편(3-10)이고 원문 내부 모순(루브릭 3-1)이다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 편 안내·관련 항목 링크 대상 파일의 존재·제목·seriesOrder, 3-08 다이어그램 파일 존재까지이고, 렌더링·광고 배치·모바일 표시·사이트 단위 scaled content 신호는 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part3-06-interrupt-storm.md` | 47 | 46 | -1 | 없음 |
| `part3-07-mmio.md` | 41 | 40 | -1 | 없음 |
| `part3-08-peripheral-clock.md` | 41 | 40 | -1 | 없음 |
| `part3-09-power-vs-performance.md` | 44 | 44 | 0 | 없음 |
| `part3-10-thermal.md` | 37 | 37 | 0 | 없음 |
| `part3-11-cxl-interconnect.md` | 48 | 48 | 0 | 없음 |
| `part4-01-concurrency-basics.md` | 40 | 40 | 0 | 없음 |
| `part4-02-false-sharing.md` | 47 | 46 | -1 | 없음 |
| `part4-03-lock-contention.md` | 52 | 51 | -1 | 없음 |
| `part4-04-spinlock.md` | 43 | 43 | 0 | 없음 |

1차 합 440에서 최종 435로 5점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이고, 판정이 바뀐 글은 없다.

- 기각한 오류 확인: 없음. 1차에서 오류 확인이던 3-10(138~139행 TDP·SDP 정의 vs 232행 정리)은 원문을 다시 읽어 그대로 성립하고, 146행 'SDP ~30 W (idle + light)'가 138~139행 쪽 정의를 뒷받침해 232행이 틀린 쪽이라는 근거를 더했다. 4-02의 15행 '10~100배'와 89행 14x는 모순이 아니라는 1차 판단에 동의했다.
- 추가한 오류 확인: 없음. 3-07 31·38행(Device-nGnRE vs nGnRnE), 3-09 39행 sweet spot vs 31~33행 표, 3-11 49행 캡션 vs 32~33·167행, 4-02 199행 aligned 배열 vs 122~124행, 4-04 85행 vs 148행은 '보통'·조건부 표현이거나 아키텍처·언어 규칙 해석이 필요해 uncertainties에 뒀다.
- 점수 변경(D 4편, B 1편): 1차가 비교하지 않은 같은 주제 글을 찾아 고유 부분이 줄었다. 3-06 D 10→9(rtos/practical-internals/part1-05 'ISR Storm 방지' 140~163행), 3-07 D 7→6(modern-recipes/part11-09 36~42·123~139행이 PCIe posted 절과 겹침), 3-08 D 8→7(modern-recipes/part4-04-clock-setup의 PLLRDY·ENR enable·__DSB, bsp/chapter13 cpufreq), 4-03 D 11→10(같은 시리즈 part6-03-case-lock-contention 59~66·204행의 perf lock). 4-02 B 11→10은 199행 '해결책' 코드가 배열 시작만 정렬해 122~124행에서 스스로 false sharing이라 한 배치와 구별되지 않는 점을 더한 것이다.
- 근거 정정: 3-06·3-11 D의 다른 시리즈 경로를 `hardware/…`·`protocols/…` 약칭에서 실제 경로 `embedded/hardware/…`·`embedded/protocols/…`로 고쳤다. 3-08 factcheck_basis의 커밋 개수 오기(7개→9개)를 고쳤고 anchor_ref를 `part7-05-kernel-build.md`로 바꿨다. 3-09·3-10·3-11·4-01·4-02 D의 비교 글 줄 범위를 실제 위치로 좁혔다(점수 영향 없음).
- F는 10편 모두 다음 편(seriesOrder+1)과 관련 항목 대상 파일을 열어 제목·seriesOrder와 대조했다. F ≤ 5는 2편이다. 3-10은 236행 다음 편이 옛 Part 구성('Toolchain & Profiling')이고 241행 '4-01: Compiler Optimization'이 실제 4-01('Concurrency 기초')과 다르다. 3-11은 174행 '3-12: 차세대 SoC 트렌드'가 없는 글이고 실제 seriesOrder 30은 4-01이다. 나머지 8편은 라벨이 맞지만 관련 항목이 인접 글뿐이라 6에 머문다.

## 글별 근거

### `part3-06-interrupt-storm.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub, fa6eb0c8 본문, 845231cf TikZ, 3d56a230 번역투 수정·공개, 49f2a443 text 블록 변환, f38a41a0 IRQ overhead 표 변환, ac24bb76 제목 변경, be973200 topics, 0a9dd7bc slug 고정)는 모두 형식·구조 변경이고, 수치·API를 spec·datasheet·커널 소스와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 이 글만의 것은 1 Gbps×64-byte로 IRQ 빈도와 ISR 점유율을 계산한 표(19~26행)와 RTOS 10 ms 주기 IRQ budget 표(170~176행)이고 산술은 맞다(1e9/512=1.95 M, 112×1.95 M≈220 M, 4,000/10 ms=0.4 MHz). 나머지 top/bottom half(30~49), NAPI(51~83), coalescing(85~100), adaptive(102~109), DMA(111~119), polling(121~133), busy_poll(135~141), affinity·RSS(143~154), ICMP·XDP(156~166), BASEPRI(180~196)는 코드 한 조각과 한두 문장의 나열이고 기법 선택 기준이 없다. 83행 'polling으로 overhead가 0'은 과장이다. |
| B | 9 | 문제(17~28행) → 기법 목록 → 함정(198~232행) → 정리(234~241행) 흐름은 있다. storm 진단 방법, 기법 사이 선택 기준·조합이 없고 한계는 coalescing trade-off(95~98행) 하나다. NAPI 코드(53~77행)의 `rx_one_packet(...)`·`enable_rx_irq()`는 정의되지 않았고 netif_napi_add 등록 설명도 없다. 49행 설명과 44행 코드의 정합, 232행 우선순위 함정의 원인이 열려 있어 5~9 구간이다. |
| C | 5 | 24행 '진입 12 cycle + 처리 100 cycle', 100·219행 '50µs / 16 packet 일반 default', 133행 '60 Mpps'는 출처·환경 없는 수치라 C ≤ 8. 89·215행 `NIC->IRQ_COALESCE`는 가상 레지스터, 105행 `cpu_load > 80%`는 C 문법이 아니고 138행 `sysctl`은 c 블록 안에 있다. 실행 가능한 명령(109행 `ethtool -C`, 146행 smp_affinity, 153행 `ethtool -X`)에 예상 출력이 없고 storm 재현·측정 절차가 없어 4~7 구간이다. |
| D | 9 | 같은 시리즈 `part3-05-interrupt-latency.md`의 top/bottom half(79~108행)·BASEPRI(123~141행)·'IRQ Storm 회피'(156~167행)가 이 글 30~49·180~196·85~133행과 겹친다. `part3-07-mmio.md`와는 겹치지 않는다. 다른 시리즈: `rtos/practical-internals/part1-05-interrupts-rtos.md` 'ISR Storm 방지'(140~163행) ↔ 5행·30~49·72~76행, `modern-recipes/part7-13-irq-affinity.md`(smp_affinity를 더 깊게) ↔ 143~149행, `protocols/industrial-ethernet/chapter11-linux-realtime.md` 229~246행 ↔ 85~109·135~141행, `hardware/pcie/chapter17-performance.md` 95행, `hardware/pcie/chapter05-interrupts.md` 123~130행. 'storm 대응 모음' 역할은 구별되지만 겹침이 많아 10~14 하단 경계 밑인 9. |
| E | 6 | 제목 'NAPI·Rate-Limit·Polling 전환'(2행)과 description(5행) 중 NAPI(51~83행)·polling(121~141행)·coalescing(85~109행)은 다룬다. rate limit은 163행 `icmp_ratelimit` 한 줄이고 IRQ rate가 아니라 ICMP 응답 제한이다. 'main loop 봉쇄'는 30~49행에서 짧게만 다룬다. 키워드 하나 부분 미이행이라 6~8 하단. |
| F | 6 | 243행 '다음 편은 MMIO 접근'은 seriesOrder 25 `part3-07-mmio.md`와 맞고, 247행 3-05(seriesOrder 23)·248행 3-07 라벨도 대상 제목과 맞다. 전제 지식 안내, 3-05 storm 절·RTOS part1-05로 가는 본문 연결이 없다. 180행 H2 'Lock Pendling' 오타, 189행 'Path 2: pending PendSV'는 BASEPRI 코드와 맞지 않는 라벨, 72행과 203행이 `net_irq`를 다른 의미로 쓴다. |
| G | 1 | 본문 1차 출처 링크가 없다. NAPI(54행)·busy_poll(138행)·icmp_ratelimit(163행)·XDP(166행)에 커널 버전·문서가 없고, HAL_UART_Receive_DMA(115·224행)에 MCU·HAL 버전이 없으며 24·100·133행 수치에 NIC·코어 기준이 없다. |

uncertainties:
- 49행 'storm이 끝날 때까지 ISR이 한 번만 호출'이 44행 코드와 맞지 않을 수 있다. 44행은 batch마다 `NET->IMR |= RX_INT`로 unmask하므로 storm이 이어지면 batch마다 ISR이 다시 불린다. 42행 `pending = 0`과 44행 unmask 사이 race도 설명이 없다. IRQ pending 동작 해석에 기대므로 오류 확인으로 올리지 않았다.
- 19행 1.95 Mpps는 preamble·IFG를 뺀 값(1e9/512)이다. IEEE 802.3 회선 최대치(약 1.488 Mpps)와 다를 수 있으나 원문을 확인하지 않았다.
- 100·219행 '50µs / 16 packet이 일반적 default'는 드라이버 ethtool -c 기본값으로 확인하지 않았다.
- 163행 icmp_ratelimit이 수신 IRQ storm을 줄인다는 서술을 ip-sysctl 문서로 확인하지 않았다.
- 164행 'NIC IRQ 전에 drop'과 166행 'driver 단계에서 drop'은 시점이 다르다. XDP 실행 위치를 커널 소스로 확인하지 않았다.
- 133행 'DPDK IRQ 0개로 60 Mpps'는 출처·환경이 없다.
- 138행 busy_poll '50 µs polling 후 IRQ fallback' 동작을 net.core.busy_poll 문서로 확인하지 않았다.
- 24행 '진입 12 cycle'은 Cortex-M 수치로 보이는데 같은 표 26행은 1 GHz CPU·Gigabit NIC 시나리오라 대상 코어가 섞여 있다.

병합 대상: 후보는 `src/content/blog/embedded/performance-engineering/part3-05-interrupt-latency.md`('IRQ Storm 회피' 156~167행, top/bottom half 79~108행, BASEPRI 123~141행)이고, 2순위는 `src/content/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos.md` 'ISR Storm 방지'(140~163행)다. 'interrupt storm'은 독립 검색 의도가 있어 다음 조치는 보강이다. 이 글을 storm 정본으로 삼고 3-05·RTOS part1-05의 storm 절은 이 글 링크로 줄인다. 보강 항목은 storm 진단(/proc/interrupts 증가율, ISR 점유 측정), 기법별 선택 기준, 커널·드라이버 소스로 확인한 NAPI budget·coalesce 기본값(확인 못 하면 산문 삭제·표 칸 TBD), 실제 rate limit 절, 49행과 44행 정합 정정이다.

### `part3-07-mmio.md` — 40점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic, ac24bb76 제목 변경, 49f2a443 text 블록 변환, 3d56a230 번역투 수정·공개, 845231cf 다이어그램, fa6eb0c8 본문 작성, 42ebbcbb stub)에 ARM ARM·Linux 커널 소스·PCIe 명세와 대조한 커밋이 없다. 31·38행, 25·155행의 엇갈림은 '보통'·'일부' 같은 단서가 붙어 동시에 참일 수 없는 두 진술로 보기 어려워 오류 확인으로 올리지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 메모리 타입 표(21~27행), volatile 예(66~76행), DMB·DSB·ISB 목록(82~86행), BSRR(127~130행), bit-band 공식(134~143행)은 입문 자료의 표준 목록이다. 이 글만의 관점은 write-combining 32→4 transaction 설명(48~58행)과 PCIe posted write를 read로 flush하는 패턴(169~176행) 정도이고, 58행 'bandwidth가 8배'는 transaction 수 비율을 대역폭으로 옮긴 출처 없는 수치다. 제목의 '성능'에 맞는 read 지연·매핑별 비용 분석이 없다. 앵커 part7-05(9) 수준. |
| B | 9 | H2 13개(17~242행)가 각각 코드 한 조각과 한두 문장이고, 정리(244~251행)는 요약일 뿐 매핑 선택 결론이 없다. 31행 'MMIO는 보통 Device-nGnRE'와 38행 주석 'Device-nGnRnE', 155행 'speculation 일부 OK'와 25행 Speculation 'no', 201행 'word access만 안전'과 같은 행의 iowrite16/iowrite8 권고가 엇갈린다. 정확성 불확실이 열려 있어 B ≤ 13이고, 대상 코어(A-profile vs Cortex-M) 전제가 없어 5~9 구간이다. |
| C | 4 | 92~94행 STM32 RCC, 36~41행 Linux ioremap, 152~156행 GIC, 115~119행 Cortex-M asm으로 플랫폼이 섞여 한 환경에서 재현되지 않는다. 58행 '8배'는 환경·출처 없는 수치라 C ≤ 8. write-combining 효과·posted flush 비용을 재는 절차가 없고, 152~156·162~167행은 산문 목록을 `c` 블록에 넣어 컴파일되지 않는다. |
| D | 6 | 인접 `part3-06-interrupt-storm.md`(24)·`part3-08-peripheral-clock.md`(26)와는 겹치지 않는다. 다른 시리즈: `modern-recipes/part4-02-mmio-access.md` 25~50행 ↔ 64~78·214~219행, 158~171행 ↔ 107~130행, 15행 ↔ 193~201행. `modern-recipes/part2-10-memory-barrier.md` 59~66행 ↔ 90~94행, 75~80·189~193행 ↔ 101~104·178~191행, 207~232행 ↔ 96~99행. `modern-recipes/part2-05-arm-memory-map.md` 55~60행 ↔ 21~27·150~158행. `modern-recipes/part11-09-pcie-streaming.md` 36~42·123~139행 ↔ 44~62·160~176행. `hardware/pcie/chapter04-bar-mmio.md` 134행은 pci_iomap 언급뿐이다. 고유 부분은 32→4 burst 설명(48~58행) 정도라 5~9 하단. |
| E | 5 | 제목 키워드 Cache Policy(17~31행)·Write-Combining(46~62행)·Volatile(64~78행)·Barrier(80~105행)는 다룬다. 제목이 'MMIO 접근 성능'을 약속하는데 본문은 정확성(순서·race·width) 중심이고 성능 수치는 58행 하나다. description(5행)은 영어 단어 나열이다. |
| F | 6 | 253행 다음 편 'Peripheral Clock'은 seriesOrder 26 `part3-08-peripheral-clock.md`와 맞고, 257행 3-06(24)·258행 3-08 라벨도 slug·제목이 맞다. 관련 항목이 인접 두 편뿐이고 크게 겹치는 modern-recipes 4-02·2-10·11-09나 전제 지식 안내가 없다. |
| G | 1 | 본문 출처 링크 0건. 19행 'ARM v7/v8 Memory Type'에 ARM ARM 판·절이 없고, 36~44행 ioremap에 커널 버전이 없으며, 148행 'Cortex-M7부터 제거'와 162~167행 PCIe posted 규칙에 명세 인용이 없다. |

uncertainties:
- 31행 'MMIO는 보통 Device-nGnRE'와 38행 주석 'ioremap → Device-nGnRnE'가 엇갈린다. arm64 ioremap 실제 속성을 커널 소스로 확인하지 않았다.
- 155행 'Device: speculation 일부 OK'와 25행 Device Speculation 'no'가 엇갈린다. ARM ARM 미확인.
- 27행·150~158행은 ARMv8에서 Device-nGnRnE에 대응하는 Strongly-Ordered를 별도 타입처럼 적었다. ARM ARM 미확인.
- 58행 'bandwidth가 8배'는 transaction 수 비율(32→4)을 대역폭 비율로 쓴 출처 없는 수치다.
- 98행 주석 'cache flush와 pipeline refill': DSB는 cache를 flush하지 않으며 I-cache invalidate가 빠졌을 수 있다(modern-recipes 2-10 215~216·232행은 D-clean·I-invalidate를 단계로 둔다). ARM 문서 미확인.
- 148행 'Cortex-M7부터 제거'의 의미를 Cortex-M7 TRM으로 확인하지 않았다.
- 223행 'Cortex-M7 D-cache enable 뒤 MMIO 영역도 cacheable이 될 수 있다'가 기본 메모리 맵(peripheral 영역 Device)과 맞는지 ARMv7-M ARM 미확인.
- 239행 'heap_var는 bit-band 영역이 아니어서': STM32 heap은 보통 0x2000xxxx SRAM이라 bit-band 영역일 수 있다. 미확인.
- 201행 'ARM v7에서는 word-aligned word access만 안전'과 같은 행 iowrite16/iowrite8 권고의 관계를 1차 자료로 확인하지 않았다.
- 92~94행 clock enable 뒤 __DSB만으로 충분한지(STM32 errata dummy read 권고) 미확인.

병합 대상: 후보는 `src/content/blog/embedded/modern-recipes/part4-02-mmio-access.md`(volatile·BSRR·width), `part2-10-memory-barrier.md`(barrier·DMA·self-modifying), `part2-05-arm-memory-map.md`(메모리 타입 표), `part11-09-pcie-streaming.md`(posted/non-posted·write-combining)다. 시리즈가 다르고 seriesOrder 25 자리를 비우면 Part 3 흐름이 끊기므로 다음 조치는 보강이다. 겹치는 절은 위 글로 링크해 줄이고, 제목이 약속한 '접근 성능'(Device vs Normal-NC vs WC 매핑별 처리량·read 지연, posted flush 비용)을 1차 자료와 측정 절차로 채운다. 보강 후에도 성능 내용이 없으면 제외 검토.

### `part3-08-peripheral-clock.md` — 40점, 병합 검토

confidence: 중간

factcheck: 미검증. git log 9개 커밋(42ebbcbb stub, fa6eb0c8 본문 작성, 845231cf 다이어그램, 3d56a230 번역투·발행, 4e66cbfc KaTeX, a746e269 text 블록, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정) 어디에도 RM0433·Linux CCF 문서·ESP-IDF 같은 1차 자료와 대조한 기록이 없다. 글 안의 산술(66행 868.05, 72행 115,207, 74행 0.006%, 54~57행 SPI 주기)은 맞고, 141행 '~100 µs'와 146·242행 '수십 µs'는 근사 표현 차이라 오류 확인으로 보지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | 이 글만의 것은 UART BRR 오차 계산(63~76행)과 voltage→frequency 순서를 보인 '자동차 사례' 코드(119~134행) 정도다. RCC enable(25~40행), CCF(80~95행), cpufreq(104~113행), Sleep/Stop/Standby(167~184행), ESP32 sleep(188~197행), powertop(201~207행)은 2~5줄짜리 일반 소개다. 21행 '이렇게 하면 power를 최적화할 수 있습니다'는 기준 없이 가능성만 말한다. 6~12 하단. |
| B | 8 | H2 13개 대부분이 코드 한 조각과 한두 문장이다. 제목의 PLL은 lock 대기(138~146행)뿐이고 M/N/P 분주·PLL 출력 계산이 없다. 146행 'RTC backup으로 이 구간을 우회'는 방법이 없다. 정리(236~243행)는 항목 나열이다. B ≤ 13 상한 아래 5~9 구간. |
| C | 5 | 17행이 STM32H743을 내걸지만 158행 `RCC->CIR`·`RCC_CIR_CSSF`, 139·143행 `RCC->PLLCFGR`·`RCC_CFGR_SW_PLL`이 한 계열로 재현되는지 불명이다. 122·130행 `set_pll(100_MHZ)`는 C에서 컴파일되지 않는다. 182~184행 모드별 wakeup·전류 표, 141행 '~100 µs', 197행 '99% deep sleep'은 출처·환경 없는 수치라 C ≤ 8. 재현 가능한 것은 72~74행 UART 오차 산술뿐이다. |
| D | 7 | 같은 시리즈 `part3-07-mmio.md`(25)와는 겹침이 적다. `part3-09-power-vs-performance.md`(27)와는 97~115행 DVFS·V²f·governor ↔ 3-09 17~39·54행 이하, 186~197행 ESP32 sleep ↔ 3-09 142~150행, 199~207행 powertop ↔ 3-09 164~175행이 같다. 다른 시리즈: `modern-recipes/part4-04-clock-setup.md`(PLLRDY 대기 114·196행, ENR enable 132~148행, `__DSB` 204행) ↔ 17~40·136~146행, `bsp/chapter04-pinmux-clock.md` 174~210행 ↔ 78~95행, `bsp/chapter13-power-management.md` 243~276행 ↔ 104~113행, `modern-recipes/part4-11-low-power-modes.md` 31~46행 ↔ 165~184행. 고유 부분은 SPI prescaler 표(44~59행), UART BRR 오차(63~76행), CSS(148~163행), DVFS 순서(117~134행) 정도다. |
| E | 5 | 제목 'Peripheral Clock 분석 — PLL·Divider·Gating·DVFS'에서 Divider(42~76행)·Gating(78~95행)·DVFS(97~134행)는 있으나 PLL은 lock time(136~146행)뿐이다. '분석'을 약속하고 본문은 개념 소개 수준이다. description(5행)의 'Power vs Performance'는 다음 편 주제이고 165~207행은 제목 범위 밖이다. |
| F | 6 | 245행 다음 편 'Power vs Performance'는 seriesOrder 27 `part3-09-power-vs-performance.md`와 맞고, 249행 3-07·250행 3-09 라벨도 slug·제목이 맞다. 전제 지식 안내, 본문 내부 링크, 같은 주제 글(part4-04-clock-setup 등) 연결이 없고 H2 13개가 평면 나열이다. |
| G | 1 | 본문 1차 출처 링크가 없다. 17행 STM32H743 이름만 있고 RM 번호·판, HAL·커널·ESP-IDF 버전이 없다. 81행 'kernel/clk-provider.h'는 경로 언급일 뿐 주장과 연결된 인용이 아니다. |

uncertainties:
- 66~67행 '정수만 가능, fractional은 DIV_FRACTION 필드': STM32H7 USART BRR 형식을 RM0433으로 확인하지 않았다.
- 158행 `RCC->CIR`·`RCC_CIR_CSSF`, 143행 `RCC_CFGR_SW_PLL`, 139행 `RCC->PLLCFGR`이 STM32H7 레지스터·비트 이름과 맞는지 미확인(계열 혼용 의심).
- 46행 'SPI1 source = APB2 = 100 MHz': H7 SPI1 kernel clock 기본 소스 미확인.
- 141행 '~100 µs wait'와 146·242행 '수십 µs'의 크기 차이. PLL lock 시간을 데이터시트로 확인하지 않았다.
- 38행 `__DSB()`가 RCC enable 직후 지연으로 충분한지 미확인. modern-recipes/part4-04 204행도 같은 주장이다.
- 182행 Sleep wakeup '0 µs'는 modern-recipes/part4-11 표(F407 '5 CPU cycle')와 다르다. 다른 글과의 모순이라 1차 자료로 정해야 한다.
- 230행 'Stop은 모든 PLL을 끄기 때문에 USB와 Ethernet이 멈춥니다'는 part4-11의 wakeup source 목록과 함께 읽으면 오해 소지가 있다. 미확인.
- 146행 'RTC backup으로 이 구간을 우회'의 근거·방법 미확인.
- 90행 '사용하지 않는 driver는 clock이 자동으로 disable'을 CCF clk_disable_unused 문서로 확인하지 않았다.
- 183~184행 Stop 200 µA·Standby 1 µA, 189행 light sleep '1 ms wakeup', 192행 '수 µA'는 출처 없는 수치다.
- 34행 'Cortex-M은 reset 직후 모든 peripheral clock이 OFF'는 코어가 아니라 벤더 RCC 리셋값 문제라 일반화가 맞는지 미확인.

병합 대상: DVFS·cpufreq(97~134행)·ESP32 sleep(186~197행)·powertop(199~207행)은 `src/content/blog/embedded/performance-engineering/part3-09-power-vs-performance.md`로, clock tree·RCC enable·PLL lock(17~40·136~146행)은 `src/content/blog/embedded/modern-recipes/part4-04-clock-setup.md` 링크로, Sleep/Stop/Standby 표(165~184행)는 `src/content/blog/embedded/modern-recipes/part4-11-low-power-modes.md` 링크로 대체할 후보다. 남는 SPI prescaler·UART BRR 오차·CSS·DVFS 전압 순서(42~76·117~134·148~163행)는 '성능 관점의 peripheral clock 분주 선택'이라는 독립 검색 의도가 있어 다음 조치는 보강이다. STM32H743 RM 판 기준으로 레지스터 이름을 정리하고, PLL 분주 계산을 넣고, 출처 없는 수치는 1차 자료로 고치거나 삭제·TBD로 둔다.

### `part3-09-power-vs-performance.md` — 44점, 병합 검토

confidence: 중간

factcheck: 미검증. git log --follow(0a9dd7bc slug 고정, be973200 topic, ac24bb76 제목 변경, 03012dec·49f2a443 text 블록 변환 등)에 수치·커널 동작·SoC 사양을 커널 cpufreq 문서·Arm/Qualcomm 자료·ESP-IDF 문서와 대조한 커밋이 없다. 글 안 산술(25행 V 10%→19%, 36행 37x, 48행 108 mJ)은 모두 맞아 오류 확인 근거도 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | CMOS 동적 전력식(19~23행), governor 다섯 종(54~86행), big.LITTLE 전환 모드(97~101행), C-state(127~133행), powertop 항목(170~175행)은 표준 목록이다. 이 글만의 것은 race-to-idle 에너지 비교 표(45~48행)와 DVFS 곡선 예(30~37행)인데 둘 다 출처·SoC가 없다. 50행은 자기 예제(48행 108 mJ > 47행 100 mJ)가 race-to-idle이 불리하다고 보여 주는데도 '부하 짧을수록 유리'라는 일반론으로 넘어가고, 52행 big 100 ms vs little 1 s도 근거가 없다. 74·86·105행은 한 문장으로 끝나 선택 기준이 없다. |
| B | 9 | DVFS → race-to-idle → governor → big.LITTLE → hotplug → C-state → ESP32 → thermal → 측정 → 실수 → 정리로 범위는 넓지만 절마다 한두 문장이다(72~86행 governor 셋은 각 한 줄). race-to-idle 예제가 결론(233행)과 반대인 이유, 어떤 조건에서 역전되는지 설명이 없다. 237행 정리는 turbostat을 드는데 본문(164~175행)에는 powertop만 있다. |
| C | 5 | hotplug sysfs(111~117행), cpuidle(135~138행), powertop(166~168행), /proc/interrupts·ethtool WoL(181~189행) 명령은 있다. governor 경로를 '/sys/.../scaling_governor'(59행), '...'(67·79행)로 생략했고 ESP32 코드(145~147행)는 GPIO_PIN 정의가 없다. DVFS 표(31~33행), '30 µA, 1 ms wakeup'(147행), 85°C(154행), '노트북 2시간/6시간'(211행), '10초 후부터 throttle'(225행), power budget 표(195~199행)는 출처·환경 없는 수치라 C ≤ 8. |
| D | 8 | 비교한 글: 같은 시리즈 `part3-08-peripheral-clock.md`(26), `part3-10-thermal.md`(28), 다른 시리즈 `bsp/chapter13-power-management.md`, `modern-recipes/part7-13-irq-affinity.md`(259행은 util-linux 경로라 겹침 없음). 3-08 97~116행 DVFS·governor ↔ 19~26·54~82행, 3-08 186~196행 ESP32 sleep ↔ 142~150행, 3-08 198~207행 powertop·turbostat ↔ 164~175행, 3-10 195~201행 benchmark 실수 ↔ 222~228행, 3-10 111~121행 big core hotplug ↔ 109~121·152~160행, BSP ch13 181~275행 C-state·governor 표 ↔ 54~86·123~140행. 이 글만의 질문은 race-to-idle 비교(41~52행) 정도다. |
| E | 6 | 제목의 DVFS(28~39행)·Race-to-Idle(41~52행)·big.LITTLE(88~107행)과 description의 hotplug(109~121행)·측정(164~175행)은 절이 있다. '트레이드오프'를 내걸었는데 race-to-idle 절은 '거의 같음'(50행)으로 끝나 선택 결론이 없고, description의 'tuning'은 WoL 끄기(188행)와 실수 목록뿐이다. |
| F | 6 | 239행 '다음 편은 Thermal'은 seriesOrder 28 `part3-10-thermal.md`와 맞고, 243행 3-08(26)·244행 3-10 라벨도 대상과 맞다. 관련 항목이 앞뒤 두 편뿐이고 전제 지식 안내나 3-08·BSP ch13 연결이 없다. |
| G | 1 | 본문 출처 링크 0건. 216행 governor 기본값의 커널 버전, 92~95행 Snapdragon 845 사양 출처, 145~147행 ESP-IDF 버전, 31~33행 DVFS 표의 SoC가 없다. |

uncertainties:
- 39행 'Sweet spot은 보통 중간 영역'은 31~33행 표로 구한 P/f(100 MHz 3.0, 400 MHz 3.25, 800 MHz 4.4, 1800 MHz 6.1 mW/MHz)가 최저 주파수에서 가장 좋다는 것과 맞지 않는다. 정적 전력·idle이 빠진 표이고 '보통'이라는 일반 진술이라 오류 확인으로 올리지 않았다.
- 50행 '부하 짧을수록 race-to-idle 유리'와 233행 정리는 48행 108 mJ > 47행 100 mJ 예제와 방향이 다르다. 조건부 진술이라 산술 모순으로 보지 않았다.
- 26행 'f를 절반, V를 약간 더 낮추면 4배'는 V를 약 29% 낮춰야 4배라 '약간'이 맞는지 의문이다.
- 74행 ondemand '95% 초과 시 ramp up'과 72행 'deprecated'를 커널 기본값·상태로 확인하지 않았다.
- 216행 'modern Linux의 기본은 schedutil'은 CONFIG_CPU_FREQ_DEFAULT_GOV_* 설정에 따라 다를 수 있다.
- 23행 leakage가 'V·온도에 비례'한다는 표현은 1차 자료로 확인하지 않았다.
- 92~95행 Snapdragon 845 'Cortex-A75 @ 2.8 GHz'·'A55 @ 1.8 GHz'를 Qualcomm 자료로 확인하지 않았다.
- 99행 'CPU Migration — 한 core만 active' 설명이 Arm in-kernel switcher 정의와 맞는지 미확인.
- 137행 출력 예가 ARM WFI와 x86 MWAIT 상태 이름을 섞은 것으로 보인다(기억 기반 의심).
- 147행 ESP32 light sleep '30 µA, 1 ms wakeup'은 데이터시트로 확인하지 않았다.
- 154행 throttle 85°C vs 3-10 trip point 75°C, 225행 '10초 후' vs 3-10 200행 '처음 1초만 peak'는 다른 글과의 불일치라 오류 확인이 아니다.
- 195~199행 power budget 표, 211행 '노트북 2시간/6시간', 173행 'C2 이상 residency 80%'는 출처 없는 수치다.
- 159행 '다른 core, 다른 코어'는 같은 말 반복(표기 실수, 점수 외).

병합 대상: 후보는 `src/content/blog/embedded/performance-engineering/part3-08-peripheral-clock.md`(DVFS·governor 97~116행, ESP32 sleep 186~196행, powertop 198~207행)와 `part3-10-thermal.md`(benchmark 실수 195~201행, big core hotplug 111~121행)다. 'DVFS로 낮출지 race-to-idle로 몰아칠지'는 독립 검색 의도가 있어 다음 조치는 보강이다. governor·ESP32·thermal·powertop 절은 3-08·3-10·BSP ch13 링크로 줄이고, 41~52행 race-to-idle 비교를 idle 전력·부하 길이에 따른 역전 조건과 1차 자료 기반 수치로 키운다. 보강 뒤에도 고유 내용이 race-to-idle 한 절뿐이면 3-08 DVFS 절로 병합한다.

### `part3-10-thermal.md` — 37점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 138행 'TDP (Thermal Design Power) — sustained 최대 발열', 139행 'SDP (Scenario Design Power) — 일반 workload 평균', 146행 'SDP ~30 W (idle + light)'는 SDP를 평균·경부하로 정의하는데, 232행 정리는 '**TDP**와 **SDP**는 각각 평균과 peak 발열을 가리킵니다'라고 적어 TDP=평균, SDP=peak로 뒤바꿨다. 두 정의는 동시에 참일 수 없고, 146행이 138~139행 쪽을 뒷받침하므로 232행이 틀린 쪽이다. git log(0a9dd7bc slug 고정, be973200 topic, e85d7684 코드 블록 산문 이동, fa55144d 링크 일괄 수정, ac24bb76 제목 변경 등)에 1차 자료 대조 커밋은 없다. 점수 구간은 제외 검토(37점)지만 오류 확인이 있어 판정은 우선 조치다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | 19~26행 온도 등급 표, 52~90행 sysfs 명령, 125~131행 냉각 방식 표, 137~141행 TDP 정의는 일반 입문 목록이다. 이 글만의 관점은 218~225행 RT deadline과 throttle, 161~183행 우주·cold boot인데 각각 주석 두 줄과 한 문장으로 끝난다(168행 'CPU 50-100 MHz (KSLV-II 누리 등)', 117행 '발열 ½'). |
| B | 7 | 14개 절이 코드 한 조각과 한두 문장으로 끝난다(111~121·173~183행). 63~66행 sysfs 출력은 trip 두 개(75 hot, 90 critical)인데 72~74행은 세 개(75·85·90)이고 연결 설명이 없다. 92행 '한 단계당 200 MHz'와 89행 max_state 8의 관계도 설명하지 않는다. 232행 정리가 138~139행 정의와 반대라 정확성 문제가 열려 있다. |
| C | 5 | 52~90행 sysfs 명령에 보드·커널 버전이 없다. 45행 STM32 식은 칩 계열·V25·AVG_SLOPE 값이 없고 48행 보정 설명과 연결되지 않는다. 98행 read_internal_temp, 105행 enter_safe_mode, 116행 cpu_hotplug_off는 정의되지 않은 가상 함수다. 38행 '±2~5°C', 152~156행 Snapdragon 865 온도 상승, 159행 '5분쯤 지나면 frame rate 절반', 207행 '10°C 정도 차이'는 출처·환경 없는 수치라 C ≤ 8. 측정 절차는 203행 '10분 이상' 한 문장뿐이다. |
| D | 7 | 비교한 글: 같은 시리즈 `part3-09-power-vs-performance.md`(152~162행 'Thermal Throttling'), `part3-11-cxl-interconnect.md`(겹침 없음), 다른 시리즈 `bsp/chapter14-thermal-watchdog.md`, `modern-recipes/part12-08-thermal.md`. 52~67·81~90행 sysfs 명령 ↔ bsp ch14 91~113행·recipes 12-08 61~73행, 19~26행 등급 표 ↔ bsp ch14 76~85행, 133행 자동차 fanless ↔ recipes 12-08 237행, 197~203행 sustained 측정 ↔ recipes 12-08 148행. 고유 부분(TDP 정의, 우주·cold boot, RT deadline)은 짧다. |
| E | 5 | 제목이 'Thermal Throttling 분석'을 약속하지만 본문은 개념·명령 나열이다. 제목 키워드 Junction Temp(19~26·205~207행)·Trip Point(69~77행)·냉각(123~133행)과 description의 자동차·우주(109·133·161~183행)는 다룬다. |
| F | 4 | 236행 '다음 part는 **Toolchain & Profiling**'인데 실제 seriesOrder 29(이 글은 7행 28)는 `part3-11-cxl-interconnect.md` 'CXL Interconnect 분석'이다. 241행 '4-01: Compiler Optimization'은 링크 없는 텍스트이고 실제 4-01은 'Concurrency 기초'(seriesOrder 30)다. 240행 3-09 링크만 맞다. 다음 편·관련 라벨 오류로 F ≤ 5. |
| G | 1 | 본문 출처 링크가 없다. 커널 버전·STM32 계열·reference manual 판이 없고, 109행 'DAPA 표준', 143~146행 i7-12700 전력 수치, 168행 KSLV-II 수치도 출처가 없다. |

uncertainties:
- 72~74행 'hot'=cpufreq throttle, 'passive'=fan 배정이 커널 trip type 정의(passive=throttle, active=fan)와 맞는지 1차 자료로 확인하지 않았다(기억 기반 의심이라 오류 확인에 넣지 않음).
- 63~66행 sysfs 출력(trip 2개)과 72~74행 trip 표(3개)가 같은 zone인지 불명확하다.
- 48행 TS_CAL 보정 온도점(25°C·85°C)이 실제 STM32 계열 값인지 reference manual로 확인하지 않았다.
- 109행 'DAPA 표준'의 실재 여부 미확인(hallucination 후보).
- 146행 i7-12700 'SDP ~30 W', 144~145행 65 W/180 W를 Intel ARK로 대조하지 않았다.
- 92·117·152~156·168·177행 수치는 출처 없는 수치다.
- 156행 'peak 75°C'는 152~154행 상승분 합(+70°C)과 ambient 가정이 없어 산술 관계를 판단할 수 없다.

### `part3-11-cxl-interconnect.md` — 48점, 병합 검토

confidence: 중간

factcheck: 검증됨. 커밋 4c77e2bf "fix(content): Embedded Performance Engineering Ch 29 — fact-check CXL interconnect"가 CXL 3.1 spec §4.2·§11.5·D2H/H2D opcode 표, Arm Neoverse V2 reference design Technical Overview 102759_0000_03, Sun et al. MICRO 2023(arXiv 2303.15375)를 출처로 적고 TSP 이름, PCIe 5.0 대역폭, Invalidate opcode, RD-V2 구성, 지연 표를 고쳤으며 출처 없는 수치는 지웠다. 이 루프에서 1차 자료를 직접 열지는 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유 내용은 RD-V2 구성 표(79~84행), 68B flit 구성(134행), 'Invalidate opcode는 없고 SnpInv'(149행) 정도다. 세대 표(28~33행), 세 프로토콜 표(41~45행), Type 1/2/3 표(57~61행)는 표준 개관이다. 100·132·163·171행 '직접 잽니다'가 구체 주장 대신 절차 문구로 남아 일반론 비중이 크다. 6~12 상단. |
| B | 11 | 문제 정의(18~22행) → 세대 → 프로토콜 → Type → RD-V2 → Linux 인식(88~100행) → 지연(102~128행) → 대역폭(130~135행) → CXL.cache(137~149행) → 함정 → 정리로 흐름은 완결이다. description '대역폭의 현실'이 130~135행에서 수치 없이 끝나고, 92~98행 명령에 출력이 없으며, 114~125행 pointer-chase 코드에 사슬 초기화가 없고 124행이 tick을 ns로 찍어 128행이 정정한다. 112행 switch·CXL.cache는 TBD다. |
| C | 7 | 106~110행 지연 표는 Sun et al. MICRO 2023·Sapphire Rapids라는 출처·환경이 있으나 직접 잰 값이 아니다. 자체 검증 절차는 92~98행 명령과 114~128행 pointer-chase뿐이고 기대 출력·판정 기준이 없다(C ≤ 9). 코드가 그대로는 의미 있는 값을 내지 못하고 124행 단위가 틀려 4~7 상단. |
| D | 7 | 인접 `part3-10-thermal.md`(28)·`part4-01-concurrency-basics.md`(30)와는 겹치지 않는다. 같은 시리즈 `part3-12-cxl-mem-latency.md`(54) 40~44행 Sun et al. 표 ↔ 104~110·171행, 3-12 96~98행 '64 GB/s 그대로 가정' ↔ 161~163행. 다른 시리즈: Type 표(57~61행) ↔ `modern-recipes/part11-15-pcie-to-cxl.md` 48~50행, `hardware/hbm/chapter11-cxl-device-types.md` 27~29행, `hardware/cxl/chapter01-cxl-position.md` 27~29·46~47행, CXL.cache·false sharing(141~155행) ↔ `hardware/cxl/chapter07-cxl-cache.md` 40~60·104~110·124행. 고유 역할은 RD-V2 절(71~86행) 정도다. |
| E | 5 | 제목 'CXL Interconnect 분석 — AI 시대 메모리 대역폭 확장'은 '분석'과 '대역폭 확장'을 약속하지만 AI는 20행 한 단락, 대역폭 절(130~135행)은 '직접 잽니다'로 끝난다. description '대역폭의 현실'도 미이행이다. |
| F | 4 | 174행 '다음 편은 3-12: 차세대 SoC 트렌드'는 저장소에 없는 글이다. 실제 seriesOrder 30은 `part4-01-concurrency-basics.md`이고, 파일명 part3-12는 seriesOrder 54 `part3-12-cxl-mem-latency.md`다. 다음 편 안내 오류로 F ≤ 5. 관련 항목 4개(178~181행)는 대상 파일이 있고, 3-01 라벨 'AMBA·AXI·CHI' vs 대상 title 'AHB·AXI·CHI'는 표기 차이다. 3-12·5-11·6-05로 가는 링크가 없고 86행 '4-09편 참고'는 링크 없는 참조다. |
| G | 3 | 73·77행 Arm RD-V2 기술 개요, 104행 Sun et al. MICRO 2023, 134행 CXL 3.1 §4.2, 149행 CXL 3.1 D2H/H2D 목록이 주장에 붙어 있다. 링크·문서 번호(102759)·논문 제목이 본문에 없고 92~98·114~128행 실행 환경(커널·numactl 버전) 표기가 없다. |

uncertainties:
- 28~33행 세대 표의 발표 연도와 x16 대역폭(한 방향 기준인지 표기 없음)을 CXL spec으로 직접 확인하지 않았다.
- 83~84행 HN-F 32개·SLC 32 MB·SF 128 MB·CML 링크 8개는 RD-V2 Technical Overview 102759를 직접 열어 대조하지 않았다(4c77e2bf 기록만 확인).
- 134행 68B flit 구성(2+16×4+2=68 산술은 맞음)을 CXL 3.1 §4.2로 직접 확인하지 않았다.
- 114~125행 pointer-chase 코드에 사슬 초기화가 없고 124행이 tick을 ns로 출력한다(128행이 정정). 코드 결함이라 오류 확인에 넣지 않았다.
- 49행 그림 캡션 'PCIe 5.0 PHY 위에서 시분할'은 32~33행 PCIe 6.0 기반 3.x, 167행 'PCIe 5.0/6.0'과 범위가 다르다. 캡션이 2.0 기준이라는 해석이 가능해 내부 모순으로 확정하지 않았다.
- 22행 '수 TB unified memory', 65행 '수 TB 추가'는 출처 없는 규모 주장이다.

병합 대상: 후보는 `src/content/blog/embedded/performance-engineering/part3-12-cxl-mem-latency.md`(지연 표 104~112행이 3-12 40~44행과 같음)이고, Type·프로토콜·CXL.cache 개관은 `src/content/blog/embedded/hardware/cxl/chapter01-cxl-position.md`·`chapter07-cxl-cache.md`가 더 깊다. Performance Engineering의 CXL 도입 글이고 RD-V2/CMN-700 절(71~86행)이 고유하므로 다음 조치는 보강이다. 지연 표는 3-12 링크로 대체하고, 대역폭 절은 134행 flit 구성으로 실효 상한을 계산하거나 지우며, 174행 다음 편 안내를 seriesOrder 30 글로 고치고 3-12·5-11·6-05·hardware/cxl 시리즈를 관련 항목에 잇는다.

### `part4-01-concurrency-basics.md` — 40점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic, ac24bb76 제목 rename, 6205e212 seriesOrder 재정렬, 49f2a443·a746e269 text 블록 변환, 3d56a230 번역투 수정·공개, 92bdd7df Part 4 deep dive, 42ebbcbb stub)에 ARM ARM·C11 표준·Intel SDM과 대조한 커밋이 없다. 글 안에서 동시에 참일 수 없는 두 기술 진술도 확정하지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | Concurrency/Parallelism 정의(15·21행), counter++ race 표(36~44행), stdatomic 예(50~55행), memory order 표(117~124행), acquire-release 예(130~139행), DMB/DSB/ISB(171~179행), ABA(222~233행)는 동시성 입문 표준 목록이다. 덧붙인 것은 LDREX/STREX retry 루프(59~65행)와 SB litmus에서 seq_cst·acq_rel 결과를 나눈 것(145~156행)인데 설명이 주석 한 줄이다. 248행 '비슷하거나 오히려 더 느립니다', 257행 '충분한 경우가 많습니다'처럼 조건 없는 일반론이 결론 자리에 있다. |
| B | 8 | 절 15개 대부분이 코드 한 조각과 한두 문장이고 문제 정의 절이 없다. SPSC 예(193~205행)는 push만 있고 T·CAPACITY·buf가 정의되지 않았다. ABA 절(222~231행)은 의사코드이고 해결책(233행)은 이름만 있다. False Sharing 절(209~218행)은 다음 편 예고다. 96·141·155·163행 정확성 불확실이 열려 있다. |
| C | 4 | 163~164행 '~30 cycle'·'~5 cycle', 218행 '100배까지'는 출처·코어·환경 없는 수치라 C ≤ 8. 컴파일러·타깃·예상 출력이 없고 197·200행 미정의, 226~230행 의사코드라 돌릴 수 없다. 154~155행 litmus 결과는 기대값만 있고 실행 절차가 없으며, 262행 '1M 중 1회 → 1 day'는 근거 없는 도식이다. 앵커 part6-09(C 4)와 같은 수준. |
| D | 6 | 인접 `part3-11-cxl-interconnect.md`(29)는 겹치지 않고, `part4-02-false-sharing.md`(31)는 209~218행 예고를 본문에서 다루며 218행 '100배까지'는 4-02 15행 '10~100배'와 같다. `part4-08-memory-ordering.md`(37) 24~37·48~63·94~106행 ↔ 117~126·130~141·171~179행, `part4-07-lock-free.md`(36) 110~140·194행 이하 ↔ 220~233·193~205행. 다른 시리즈 `embedded-cpp/part4-03-lock-free-basics.md` 117~138·96·156~199·278~281행 ↔ 117~126·220~233·193~205·250~257행, `modern-recipes/part9-06-atomic-cost.md` 39·44·185·208~212행 ↔ 160~164·250~257행. draft인 parallel/cpp-concurrency-in-action ch01, art-of-concurrency ch01, extreme-c ch13은 비교에서 뺐다. |
| E | 6 | 제목 키워드 중 Race(23~46행)·Memory Model(67~179행)은 다룬다. Concurrency vs Parallelism은 그림 한 장과 한 문장(19~21행)뿐이고 description의 Rob Pike도 인용 한 줄(15행)이다. '기초' 제목인데 SPSC·ABA·false sharing(191~233행)까지 넓어진다. |
| F | 6 | 276행 다음 편(False Sharing)은 seriesOrder 31 `part4-02-false-sharing.md`와 맞다. 280행 '3-10: Thermal'은 대상 제목과 맞지만 주제 관련이 약하고 직전 seriesOrder 29는 3-11 CXL이다. 281행 4-02 라벨도 맞다. 전제 지식 안내와 4-07·4-08로 넘기는 안내가 없다. |
| G | 1 | 본문 출처 링크 0건. Rob Pike(15행)는 발표 출처가 없고, ARM 재정렬 표(85~91행)·x86 TSO(101~106행)·cycle 수치(163~164행)에 ARM ARM·Intel SDM 인용, 아키텍처 판·C 표준 판 표기가 없다. |

uncertainties:
- 163행 'seq_cst store → DMB ISH 추가 (~30 cycle)'는 part4-08 89행('STLR + barrier')·134행('Store seq_cst 5 cycle')과 어긋나고 modern-recipes/part9-06 44행('STLR + DMB ISH')과는 맞는다. 다른 글과의 모순이라 오류 확인에 넣지 않았다.
- 96행 '__DMB(); 이전 access 모두 완료 보장'과 172~173행 DMB=ordering, DSB=완료 대기 구분이 흐리다. ARM ARM 미확인.
- 93행 'explicit barrier 없이는 어떤 순서도 보장되지 않습니다'는 같은 주소·dependency 순서를 빠뜨렸을 수 있다. ARM ARM 미확인.
- 141행 'Release는 write barrier, acquire는 read barrier'는 121~122행 표와 4-08 46행 half-fence 설명과 의미가 다를 수 있다. C11 표준 미확인.
- 155행 'acq_rel: r1==0 && r2==0 가능'의 이유 설명이 맞는지 C11 표준으로 확인하지 않았다.
- 207행 'lock 없이도 안전 … 더 빠릅니다'와 248행 'Lock-free가 항상 빠름은 실수'는 일반론끼리의 충돌이라 A·C 감점으로 본다.
- 57행 x86 'LOCK XADD', 108행 'x86은 약한 재정렬만 허용', 120행 consume 'deprecated'의 표준 상태를 확인하지 않았다.
- 218행 '100배까지', 248행 'lock과 비슷하거나 더 느림', 262행 '1M 중 1회 → 1 day'는 출처·환경 없는 주장이다.
- 85~91행과 261~263행은 표·산문 성격 내용을 text 코드 블록에 넣었다(§5 위반 후보, 점수 외).

병합 대상: memory model 부분(67~179행)은 `src/content/blog/embedded/performance-engineering/part4-08-memory-ordering.md`로, ABA·SPSC 부분(191~233행)은 `part4-07-lock-free.md`로 옮기는 후보다. 시리즈 허브는 공개 상태인 `00-preface.md`(seriesOrder 0)라 허브 예외는 적용되지 않는다. Part 4 첫 글로 남길 경우 Concurrency vs Parallelism·race 정의·Part 4 읽는 순서만 담은 짧은 도입 글로 줄이고, 단일 코어 RTOS와 SMP에서 race가 생기는 경로 비교 같은 이 글만의 질문으로 보강한다. URL·seriesOrder 변경은 시리즈 전체 검토 뒤에 정한다.

### `part4-02-false-sharing.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log 10개(42ebbcbb stub, 92bdd7df Part 4 본문, 845231cf 다이어그램, 3d56a230 번역투 수정·공개, cf8e14ef, 6205e212 seriesOrder 재정렬, ac24bb76 제목 변경, e85d7684 코드 블록 산문 이동, be973200 topic, 0a9dd7bc slug 고정) 중 MESI 전이·perf c2c 버전·hardware_destructive_interference_size 값·Cortex-A72 측정값을 1차 자료와 대조한 커밋이 없다. 15행 '10~100배'와 89행 14x는 모순이 아니다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | MESI 상태 표(45~50행)·padding 구조체(94~113행)·perf c2c 명령(172~180행)은 false sharing 입문 표준 목록이다. 이 글만의 부분은 true sharing을 떼어 sharded counter를 권하는 절(214~236행)과 '항상 나쁜가' 절(204~212행)인데 210행은 '측정해서 결정'으로 기준 없이 끝난다. VTune 절(184~190행)은 기능 이름 세 줄이다. part1-04 앵커(A 10)와 같은 수준. |
| B | 10 | 메커니즘(17~41행) → MESI(43~61행) → 측정(63~90행) → padding(92~115행) → 패턴 3가지(117~168행) → 진단 도구(170~190행) → 함정(250~289행) → 정리(291~298행) 흐름은 끝까지 간다. '진단'에 해당하는 perf c2c 절(170~182행)은 report 읽는 법이 없고, 측정 코드(65~81행)는 `bad`만 증가시키며 `good`·thread 생성·시간 측정이 없다. 231행 `for (i = 0)`는 루프가 아니다. 199행 해결책 `counters[NUM_CORES] __attribute__((aligned(64)))`는 배열 시작만 정렬하는 것으로 보여 122~124행에서 false sharing이라 한 배치와 구별되지 않는다. |
| C | 6 | 84~90행 'Cortex-A72 4-core 실측 4.2 sec / 0.3 sec, 14x'는 보드·커널·컴파일러·thread 배치가 없어 C ≤ 8. 77·80행 `10M`은 C 리터럴이 아니고 `good` 측정 코드가 없어 88행 결과를 재현할 수 없다. perf c2c(172~180행)는 예상 출력이 없다. |
| D | 6 | `modern-recipes/part9-09-false-sharing.md`(공개, seriesOrder 109): 169~180행 ↔ 170~182행, 206~215행 ↔ 252~259행, 217~220행 ↔ 282~289행, 234~238행 ↔ 272~280행, 141행 ↔ 240~245행, 164행 ↔ 196행, 75~87행 ↔ 104~115행이고 9-09는 측정 표(184~193행)·sharding까지 다뤄 범위가 넓다. 같은 시리즈 `part2-07-cache-line.md` 76~81·188행 부근 ↔ 63~74·148~155·240~248행, `part4-09-cache-coherency.md` 89~100·171~184행 ↔ 19~37·170~182행. 인접 `part4-01` 209~218행은 예고만 한다. 고유 부분은 MESI 전이(54~61행)와 true sharing 절(214~236행) 정도다. |
| E | 6 | 제목 'False Sharing 진단 — Cache Line Ping-Pong·Padding·측정'과 description은 17~61·92~168·63~90행이 다룬다. 첫 단어 '진단'에 해당하는 170~190행은 명령 두 줄과 VTune 기능 나열뿐이라 진단 절차를 따라 할 수 없다. |
| F | 6 | 300행 다음 편 'Lock Contention'은 seriesOrder 32 `part4-03-lock-contention.md`와 맞고, 304행 4-01(30)·305행 4-03 라벨도 맞다. 관련 항목이 직전·직후 편뿐이고 part2-07·part4-09 링크와 전제 지식 안내가 없다. |
| G | 2 | 본문 출처 링크가 없다. 182행 'Linux kernel 4.10 이상', 198행 'FreeRTOS 11 SMP', 104행 'C++17', 84행 'Cortex-A72 4-core', 285행 Cortex-M7 32 byte 같은 버전·환경 표기는 있으나 perf-c2c man page·ARM TRM·C++ 표준 조항과 연결되지 않는다. part7-05 앵커(G 2)와 같은 수준. |

uncertainties:
- 84~90행 측정값(4.2 s / 0.3 s, 14x)은 출처·환경이 없다. modern-recipes part9-09 184~193행은 같은 Cortex-A72 quad에서 7.8 s / 0.9 s(8배 이상)다. 다른 글과의 모순이라 오류 확인에 넣지 않았다.
- 199행 `static atomic_t counters[NUM_CORES] __attribute__((aligned(64)))`는 배열 시작만 64에 맞추는 것으로 보여 원소들이 한 line에 모이고, 이는 122~124·255~259행이 false sharing이라 한 상황과 같다. GCC 속성 의미가 필요한 코드 결함이라 오류 확인이 아니라 여기에 둔다.
- 77·80행 `10M`은 C 리터럴이 아니고 231행 `for (i = 0)`는 그대로 컴파일되지 않는다.
- 115행 'hardware_destructive_interference_size는 일반적으로 64, Apple M1은 128'을 표준 라이브러리 구현별 값으로 확인하지 않았다.
- 182행 'perf c2c는 Linux kernel 4.10 이상'은 perf 변경 이력으로 확인하지 않았다. '가장 강력한 도구'는 근거 없는 최상급 표현이다.
- 196행 'DEFINE_PER_CPU … 자동 padded'를 커널 소스로 확인하지 않았다(part9-09 167행은 '확인해야 합니다'로 적음).
- 202행 Zephyr `Z_KERNEL_STACK_DEFINE` 심볼 존재와 '자동 정렬' 의미를 Zephyr 소스로 확인하지 않았다.
- 276행 'stack 변수 alignas 보장 안 됨'과 280행 `-mstackrealign`(주로 x86 옵션)이 ARM 해결책인지 GCC 문서로 확인하지 않았다.
- 31행 'flush to L2'와 57행 'flush to memory'는 coherence 구현에 따라 다르다.
- 212행 'line 하나당 실제 정보가 1 byte 수준'은 int(4 byte) 예와 맞지 않는 과장이다.

병합 대상: 후보는 `src/content/blog/embedded/modern-recipes/part9-09-false-sharing.md`(같은 질문, 측정 표·sharding까지 포함)다. 시리즈 안에서는 `part4-09-cache-coherency.md` 89~100·171~184행이 같은 예와 perf c2c를 반복하므로 4-09가 이 글을 가리키게 정리한다. 다음 조치는 보강이다. part4-01 예고 → 4-02 → 4-03 흐름상 독립 URL 역할이 있으므로 9-09와 겹치는 함정 절(252~289행)을 줄이고 '진단' 절을 perf c2c report 해석(HITM·line·소스 위치)과 bad/good을 모두 재는 측정 하네스로 채운다. 차별화가 어려우면 9-09로 병합.

### `part4-03-lock-contention.md` — 51점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic, ac24bb76 제목 변경, 6205e212 seriesOrder 재정렬, 4e66cbfc KaTeX, 84b54508 본문 일괄 작성, 92bdd7df, 42ebbcbb)에 perf·ftrace·FreeRTOS 문서나 upstream 소스와 대조한 커밋이 없다. 본문 산술(94행 Amdahl 4.7·8.8, 49~50행 0.234·1.52, 256~259행 contention ratio 33·41·75·80%)은 31행 정의와 모두 맞는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 26~31행 지표 표와 88~96행 Amdahl 식은 일반론이다. 이 글만의 내용은 53~55행 perf lock 해석(호출 수가 적어도 누적 대기가 큰 lock부터), 100~108행 convoy와 unfair lock trade-off, 205~213행 brake ECU 1 ms 루프 분해다. 34~36행 임계값 5%·20%, 169행 'write 30%', 207~210행 시간 분해, 254~260행 실측 표에 출처가 없고 187행 '항상 우선'은 근거 없는 단정이다. 36행 '20% 넘으면 재설계'와 262행 목표선(257행 ratio 41%)의 연결도 설명이 없다. |
| B | 11 | 지표 정의(24~39행) → 측정(41~84행) → 모델(86~96행) → 회피 패턴(98~201행) → 자동차 예(203~213행) → 함정(215~248행) → 실측(250~262행) → 정리(264~271행) 흐름을 갖췄다. 44~45행 perf lock record, 62~63행 lock_acquire/lock_release에 필요한 커널 설정 전제가 없고 67행은 ftrace 출력 예 없이 끝나며, 71~82행 FreeRTOS 통계는 어느 도구 화면인지 밝히지 않았다. |
| C | 6 | 44~45행 perf lock, 62~64행 ftrace 명령은 실행할 수 있다. 47~50행 출력 예는 커널·perf 버전이 없고, 252~260행 '실측 결과'는 'Cortex-A72 4-core, 100 thread'만 있고 OS·커널·lock 구현·도구·반복 횟수가 없어 C ≤ 8. 예상 결과·확인 절차가 없다. |
| D | 10 | 비교한 글: 같은 시리즈 `part4-02-false-sharing.md`(31), `part4-04-spinlock.md`(33), `part4-05-mutex.md`(34), `part4-06-rw-lock.md`(35), `part4-10-smp-analysis.md`(39), `part1-07-modeling.md`(7), `part6-03-case-lock-contention.md`(52), 다른 시리즈 `rtos/practical-internals/part4-07-smp-rtos.md`, `modern-recipes/part6-12-rtos-debugging.md`. 86~96행 Amdahl ↔ part1-07 19~38행·part4-10 207~215행, 151~169행 RW-lock ↔ part4-06 20행 이후, 171~187행 hold time ↔ part4-04 14·38행·part4-05 18행, 44~45·55행 perf lock·'acquired × wait_avg' ↔ part6-03 59~66·204행. 다른 시리즈는 한 줄 언급뿐이다(practical-internals part4-07 44·60·72행, modern-recipes part6-12 152행). |
| E | 6 | title의 'Wait·Hold·Convoy·측정 기법'과 description은 26~31·41~84·98~108행에 대응한다. 측정 기법은 명령 두 줄씩과 예시 출력(47~50행)뿐이고 convoy 절(98~108행)은 정의와 불릿 세 개뿐이라 부분 미이행이다. |
| F | 6 | 273행 다음 편 'Spinlock 성능'은 seriesOrder 33 `part4-04-spinlock.md`와 맞고 277~279행 라벨(4-02=31, 4-04=33, 4-05=34)도 맞다. 169행 '4-06 편'은 링크가 없고 같은 주제 사례 글 part6-03 링크도 없다. |
| G | 1 | 본문 1차 출처 링크가 없다. 44~64행 perf·ftrace의 커널·perf 버전, 71행 FreeRTOS·Tracealyzer·SystemView 버전이 없고 96행 Gunther USL, 149행 Java ConcurrentHashMap, 252행 실측에도 인용·환경이 없다. |

uncertainties:
- 47~50행 perf lock report 열 이름(acquired, wait_total(s), wait_avg(s))이 실제 perf 출력과 같은지 확인하지 않았다. part6-03 65행은 contended 열과 wait_avg(ns)로 다르게 쓴다(글 사이 불일치).
- 44~45행 perf lock record와 62~63행 이벤트가 CONFIG_LOCKDEP·CONFIG_LOCK_STAT를 전제하는지 확인하지 않았다.
- 71행 configUSE_TRACE_FACILITY=1만으로 Tracealyzer·SystemView 통계가 나오는지, 73~82행 항목이 실제 화면에 있는지 확인하지 않았다.
- 149행 'Java ConcurrentHashMap이 striped lock을 쓴다'는 JDK 버전에 따라 다를 수 있다.
- 169행 'write 30% 넘으면 RW-lock이 더 비싸다'는 part4-06 20행('50:50으로 가까워지면')과 기준이 다르다(글 사이 차이).
- 36행 '> 20% 재설계 필요'와 262행 '1 µs 목표선'(257행 ratio 41%)은 긴장 관계지만 동시에 참일 수 없는 수준은 아니어서 A 감점 근거로만 썼다.
- 193행 ISR의 mutex_try_take와 248행 'ISR·task가 같은 mutex를 공유하면 의미 없음'은 try-take가 block하지 않아 엄밀한 모순이 아니다. FreeRTOS API 문서 미확인.
- 252~260행 실측은 커널·lock 구현·도구가 없고 84b54508 일괄 작성 이력 때문에 실제 측정인지 의심된다.
- 96행 'USL이 실측 데이터와 더 잘 맞습니다', 239행 '32-bit aligned 정수 read는 atomic'은 아키텍처·출처 없는 일반화다.

병합 대상: 병합 대상 없음. 다음 조치는 보강이다. 시리즈 안에서 contention ratio 정의와 perf lock·ftrace 측정을 레퍼런스로 다루는 글은 이 글뿐이고 part6-03은 같은 도구를 쓰는 사례 글이다. 86~96행 Amdahl 절은 part1-07 링크로, 151~169행 RW-lock 절은 4-06 링크로 줄인다. perf lock 출력 형식과 커널 설정 전제를 perf 문서와 대조해 적고 part6-03 65행과 열 이름을 맞춘 뒤 part6-03을 링크한다. 252~260행 실측 표는 환경·도구를 밝힐 수 없으면 지우거나 TBD로 두고, 36행 임계값과 262행 목표선의 관계를 설명한다.

### `part4-04-spinlock.md` — 43점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub, 92bdd7df·84b54508 본문 작성, 6205e212 seriesOrder 재정렬, ac24bb76 제목 변경, be973200 topic, 68525f0c 코드 블록 산문 이동, 0a9dd7bc slug 고정)에 Linux kernel 소스·ARM ARM·Zephyr 문서와 대조한 커밋이 없다. 원문만으로 동시에 참일 수 없는 두 진술도 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | TTAS(71~87행) → ticket(89~111행) → MCS(113~143행) → qspinlock → cpu_relax/YIELD(204~214행)는 spinlock 교과서 표준 목록이고 같은 순서·코드가 Practical RTOS Internals 4-08에 있다. 이 글만의 것은 Spin vs Sleep 손익 분기 예(26~38행)와 hold time×코어 수 wait time 표(256~264행)인데 출처·환경이 없다. 18행 context switch 1~3 µs, 153행 '32-core 이상에서 TTAS throughput이 거의 0'도 근거 없는 단정이다. |
| B | 11 | 문제 정의(16~22행) → 구현 3종 → Linux·Zephyr API(155~185행) → adaptive(187~202행) → 함정(216~252행) → 측정 → 정리(268~277행)로 기본 흐름은 있다. MCS 코드(121~138행)는 tail을 `struct mcs_node *`로 받아 atomic 연산을 하고 `atomic_compare_exchange`(C11에 없는 이름)를 써 그대로 컴파일되지 않을 수 있다. LDREX/STREX 예(58~67행)와 TAS 코드에 barrier 설명이 없다. 측정 표(256~264행)는 방법이 없고 266행은 mutex 열 없는 표로 'mutex가 유리해지는 경계'를 결론 낸다. |
| C | 5 | 실행 환경·빌드 조건·예상 출력이 없다. 256행 'Cortex-A72 4-core에서 측정'은 커널·클록·벤치마크 코드·반복 횟수가 없어 C ≤ 8. 1 core 열이 전부 0 ns(260~263행)라 비교가 의미 없고 18·29·153·202행 수치도 출처가 없다. description이 약속한 ticket·MCS scalability 측정은 없다. |
| D | 5 | 비교한 글: 인접 `part4-03-lock-contention.md`(32), `part4-05-mutex.md`(34), 다른 시리즈 `rtos/practical-internals/part4-08-spinlock-smp.md`, `rtos/practical-internals/part3-01-critical-section.md`, `modern-recipes/part9-07-spinlock-vs-mutex.md`. TTAS 71~87행 ↔ RTOS 4-08 약 96~118행, ticket 89~111행 ↔ 약 145~170행, MCS·qspinlock 113~143행 ↔ 약 174~219행, 단일 코어 함정 218~225행 ↔ RTOS 3-01 237~239행, Spin vs Mutex(24~38행)·irqsave(168행) ↔ Recipes 9-07 22~46행, adaptive(187~202행) ↔ 4-05 63~78행. 고유 부분은 측정 표(256~264행)와 Zephyr k_spin_lock(176~185행) 정도다. |
| E | 5 | 제목(2행)의 Spin-Wait vs Context Switch·Ticket·MCS는 절이 있다. 제목이 '성능 분석'을, description(5행)이 'ticket lock, MCS lock의 scalability 차이'를 약속하는데 scalability는 147~153행 개념 비교와 근거 없는 단정뿐이고 측정 표는 lock 종류별 비교가 아니다. |
| F | 6 | 277행 다음 편 'Mutex 성능'은 seriesOrder 34 `part4-05-mutex.md`와 맞고, 281행 4-03(32)·282행 4-05·283행 'Practical RTOS Internals 3-01: Critical Section'(`part3-01-critical-section.md`) 라벨도 맞다. 전제 지식 안내와 거의 같은 주제인 RTOS 4-08 연결이 없다. |
| G | 1 | 본문 외부 출처 링크가 없다('http' 1건은 231행 코드 `http_request()`). 143행 'Linux 4.2 이후 qspinlock'은 버전 언급뿐이고, 측정 표(256행)의 커널·보드·컴파일러가 없으며 MCS 원 논문(Mellor-Crummey·Scott)도 인용하지 않는다. |

uncertainties:
- 121~138행 MCS 코드: `l`을 non-atomic `struct mcs_node *`로 받아 `atomic_exchange(l, self)`를 호출하고, `atomic_compare_exchange`는 C11 이름이 아니며(`_strong`/`_weak`), `self->next`가 atomic이 아니다. 언어 규칙 판단이라 오류 확인이 아니다.
- 58~67행 LDREX/STREX 루프에 DMB(또는 acquire)가 없다. ARM ARM으로 lock 획득 순서 보장 여부를 확인하지 않았다.
- 85행 '한 번의 invalidate'와 148행 'TTAS unlock 시 N CPU 모두 invalidate'가 같은 순간을 다르게 적었다. 85행을 unlock store 한 번의 broadcast로 읽으면 양립할 수 있어 오류 확인으로 올리지 않았다.
- 14행 요약 'context switch 비용보다 짧을 때', 38행 '두 배 이하(약 6 µs)', 262·266행 경계 10 µs, 202행 adaptive '수십 µs spin'이 서로 다른 기준이다.
- 143행 'qspinlock이 4.2 이후 표준 spinlock'의 버전·아키텍처 범위를 커널 소스로 확인하지 않았다.
- 174행 'SMP Cortex-M(RP2040, Cortex-M55+M85)': RP2040은 Cortex-M0+ 2코어로 기억하며 'M55+M85' 조합 예시도 근거가 없다. 1차 자료 미확인.
- 202행 'Linux mutex의 기본 동작이며 수십 µs spin'은 4-05 76행(PTHREAD_MUTEX_ADAPTIVE_NP)·78행('수십에서 수백 cycle')과 다르다. 다른 글과의 모순이다.
- 18행 context switch 1~3 µs/1~5 µs, 153행 32-core TTAS 붕괴, 256~264행 측정값 전체가 출처·환경 없는 수치다.
- 212행 'YIELD가 일부 코어에서 저전력 상태 진입' 여부 미확인.

병합 대상: 후보는 `src/content/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp.md`(TTAS·ticket·MCS·qspinlock 구현 설명이 거의 같고 memory_order까지 더 정확함)이고, 보조로 `src/content/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex.md`(Spin vs Mutex 판단)다. lock 성능 장(4-03→4-04→4-05)의 연결 고리이고 '성능 분석'이라는 독립 검색 의도가 있어 다음 조치는 보강이다. 구현 설명은 RTOS 4-08 링크로 줄이고, 환경·코드를 밝힌 lock 종류별·코어 수별 측정(또는 출처 있는 공개 측정)으로 차별화한다. 측정을 확보하지 못하면 제외 검토로 넘긴다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다. 10편 모두 Embedded Performance Engineering이다.

- **1차 자료 대조 커밋 없음 (미검증 8편: 3-06·3-07·3-08·3-09·4-01·4-02·4-03·4-04, 3-10은 오류 확인).** fa6eb0c8(Part 3)·92bdd7df·84b54508(Part 4)로 본문을 일괄 작성하고 3d56a230로 일괄 공개한 뒤 slug·topic·제목·text 블록 커밋만 있다. `factcheck: 검증됨`은 4c77e2bf가 있는 3-11 1편뿐이다. Embedded Performance Engineering은 `/fact-check-round` 대상이다.
- **본문 1차 출처·버전 표기 없음 (G 1: 3-06·3-07·3-08·3-09·3-10·4-01·4-03·4-04 8편, 4-02는 G 2).** 커널 버전 없는 sysfs·perf·ethtool 명령(3-06 109·146·153행, 3-09 59·67·79행, 3-10 52~90행, 4-03 44~64행), RM 판 없는 STM32 코드(3-08 17행, 3-10 45행), ARM ARM·C11 인용 없는 메모리 모델 설명(3-07 19행, 4-01 85~124행)이 반복된다. 출처가 주장에 붙은 글은 3-11(G 3)뿐이다.
- **출처·측정 환경 없는 구체 수치 (C ≤ 8 상한, 3-11을 뺀 9편).** 3-06 24·100·133행, 3-07 58행, 3-08 141·182~184·197행, 3-09 31~33·147·154·195~199·211·225행, 3-10 38·152~159·207행, 4-01 163~164·218행, 4-02 84~90행, 4-03 252~260행, 4-04 18·153·256~264행. 특히 '실측'이라고 적은 표가 환경·도구·반복 횟수 없이 나온다(4-02 84~90행, 4-03 252~260행, 4-04 256~264행, 셋 다 'Cortex-A72 4-core'). 같은 시리즈 Part 4의 다른 '측정 — 실측 결과' 절(4-05 225행, 4-06 236행, 4-07 274행, 4-08 246행, 4-09 217행)도 같은 형태인지 다음 루프에서 본다.
- **그대로 컴파일·실행되지 않는 코드 (7편).** 3-06 89·105·215행(가상 레지스터, `cpu_load > 80%`), 3-07 152~156·162~167행(산문 목록을 `c` 블록에), 3-08 122·130행(`set_pll(100_MHZ)`), 3-10 98·105·116행(정의되지 않은 함수), 4-01 197·200·226~230행(T·CAPACITY 미정의, 의사코드), 4-02 77·80·231행(`10M`, `for (i = 0)`), 4-04 121~138행(MCS의 비원자 tail·C11에 없는 이름). 실행 환경·예상 출력도 없어 C가 4~7에 머문다.
- **관련 항목이 인접 두 편뿐이고 같은 주제 글로 잇지 않음 (F 6 이하, 3-06·3-07·3-08·3-09·4-01·4-02·4-03 7편).** 3-06 247~248행, 3-07 257~258행, 3-08 249~250행, 3-09 243~244행, 4-01 280~281행, 4-02 304~305행, 4-03 277~279행이 직전·직후 편만 건다. 더 깊게 다룬 modern-recipes·rtos/practical-internals·bsp 글로 가는 링크가 없다. 4-01 280행은 직전 seriesOrder 29(3-11) 대신 3-10을 건다.
- **다음 편·관련 항목이 seriesOrder 재정렬(6205e212) 뒤 갱신되지 않음 (3편).** 3-10 236행 'Toolchain & Profiling'·241행 '4-01: Compiler Optimization', 3-11 174행 '3-12: 차세대 SoC 트렌드'(실제 seriesOrder 30은 4-01), 4-01 280행 직전 편으로 3-10. CXL 후속 글 3-12(54)·5-11(55)·6-05(56)가 파일명 Part 번호와 달리 시리즈 끝에 붙어 있고, 00-preface.md 62행 '총 6개 Part, 53개 글'도 실제 편수와 다르다. 다른 Part 말미 글도 같은 패턴인지 확인이 필요하다.
- **'X 분석'·'성능' 제목에 개념 소개 본문 (E 5, 5편).** 3-07 'MMIO 접근 성능', 3-08 'Peripheral Clock 분석', 3-10 'Thermal Throttling 분석', 3-11 'CXL Interconnect 분석', 4-04 'Spinlock 성능 분석'. ac24bb76 일괄 제목 변경에서 온 형식이다.
- **Part 3 인접 글 사이 내용 중복 (3-08·3-09·3-10).** DVFS·governor 명령(3-08 97~116행 ↔ 3-09 54~82행), ESP32 light sleep '99%/1%'(3-08 186~196행 ↔ 3-09 142~150행), powertop(3-08 198~207행 ↔ 3-09 164~175행), benchmark thermal 실수·big core hotplug(3-09 222~228·109~121행 ↔ 3-10 195~201·111~121행). clock/power/thermal 경계를 다시 나눌 필요가 있다.
- **다른 시리즈와 같은 질문을 링크 없이 반복 (6편).** 3-06 ↔ rtos/practical-internals part1-05, 3-07 ↔ modern-recipes 4-02·2-10·2-05·11-09, 3-08 ↔ modern-recipes 4-04·4-11·bsp ch04·ch13, 3-11 ↔ hardware/cxl ch01·ch07·modern-recipes 11-15, 4-02 ↔ modern-recipes 9-09, 4-04 ↔ rtos/practical-internals 4-08·modern-recipes 9-07. Part 4 안에서도 4-01이 4-07·4-08 핵심 절을, 4-03이 part1-07·part6-03을 미리 반복한다.
- **같은 사실을 글마다 다르게 적음 (시리즈 안팎 5건).** throttle 온도·시점(3-09 154·225행 vs 3-10 trip point 75°C·200행), seq_cst store ARMv8 매핑·비용(4-01 163행 vs 4-08 89·134행 vs modern-recipes 9-06 44행), false sharing 배수(4-01 218행 '100배', 4-02 15·89행, part2-07 81행 '10x', modern-recipes 9-09 '8배 이상'), adaptive mutex spin 길이(4-04 202행 vs 4-05 76·78행), perf lock 출력 열(4-03 47~50행 vs 6-03 65행). 다른 글과의 모순이라 오류 확인에는 넣지 않았고 fact-check 라운드에서 1차 자료로 한 번에 정한다.
- **공통 H2 뼈대 (10편 전부).** '한 줄 요약 → 기법·개념 절 → 자주 하는 실수/자주 보는 함정 → 정리 → 다음 편 → 관련 항목'(3-06 13·198·234·243·245행, 3-09 13·205·230·241행, 3-10 13·195·227·238행, 4-03 12·215·264·275행, 4-04 12·216·268·279행 등). 글마다 고유 계산·예가 있어 글 단위 scaled content 판정은 아니지만 루브릭 9절 사이트 지표 기록 대상이다.

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 1편(3-10)은 232행 TDP/SDP 정리를 138~139·146행 정의에 맞게 정하고, 정의 자체를 Intel ARK 등 1차 자료로 확인한다. 같은 작업에서 236행 다음 편 안내를 seriesOrder 29 `part3-11-cxl-interconnect.md`로, 241행 '4-01: Compiler Optimization'을 실제 4-01 제목·링크로 고친다. 109행 'DAPA 표준'은 실재를 확인하지 못하면 지운다.
- 3-11 174행 다음 편 안내를 seriesOrder 30 `part4-01-concurrency-basics.md`로 고치고, 4-01 280행 관련 항목의 직전 편을 3-11로 바꾼다. 재정렬(6205e212) 뒤 다음 편 문장이 갱신되지 않은 글이 다른 Part에도 있는지 시리즈 전체를 대조한다.
- Embedded Performance Engineering `/fact-check-round`에서 '실측' 표(4-02 84~90행, 4-03 252~260행, 4-04 256~264행 및 4-05~4-09 측정 절)의 환경을 밝히거나 TBD로 바꾸고, 시리즈 안팎 사실 충돌(throttle 온도, seq_cst 매핑, adaptive mutex, perf lock 출력 열)과 열린 uncertainties를 1차 자료로 정한다.
- 병합 검토 9편은 merge_note대로 모두 보강이 먼저다. 3-06은 storm 정본으로 삼고 3-05·RTOS part1-05 storm 절을 링크로 줄이는 방향, 3-07·3-08·4-04는 겹치는 절을 modern-recipes·RTOS 글 링크로 줄이고 제목이 약속한 성능 내용을 채우는 방향, 3-09는 race-to-idle 역전 조건, 4-01은 4-07·4-08로 옮기거나 짧은 도입으로 줄이는 방향, 4-02는 진단 절 보강, 4-03은 Amdahl·RW-lock 절 축소와 perf lock 출력 정합이다. 보강 뒤에도 고유 내용이 남지 않으면 3-07·4-04는 제외 검토, 3-09는 3-08 병합으로 넘긴다.
- Part 3 clock/power/thermal(3-08·3-09·3-10)과 Part 4 동시성 글(4-01·4-07·4-08)의 역할 경계는 개별 보강 전에 시리즈 단위로 먼저 정한다. 병합·URL·seriesOrder 변경은 사용자가 결정한다.
