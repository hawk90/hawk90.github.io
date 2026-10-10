# Modern Embedded Recipes — 루프 10 (seriesOrder 90~99)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 약 3,528자다. 산문 2,500자 미만은 0편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 2편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 2 | 코드 비중과 설명의 역할을 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 8 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 0 | 기계 신호만으로 유지 후보로 올릴 글 없음 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 10 |
| 산문 <2500 | 0 |
| 산문 <1500 | 0 |
| 코드 우세 | 2 |
| 실전 신호 약함 | 0 |

## 검사 포인트

- 정렬·캐시·DMA allocator·zero-copy·NUMA 글은 메모리 성능 주제가 겹치므로, 각 글의 독립적인 문제와 측정 조건이 분리되는지 비교한다.
- SIMD와 NEON 글은 코드가 설명을 대체하지 않는지, ISA·컴파일러·CPU 모델별 전제와 fallback이 설명되는지 확인한다.
- 성능 개선·전력 절감·코드 크기 감소 주장은 반드시 기준선, 측정 조건, 빌드 옵션, 하드웨어 범위를 함께 확인한다.
- DMA-BUF·io_uring·IOMMU·HBM·DVFS처럼 플랫폼과 커널 버전에 의존하는 용어는 적용 범위를 명확히 하는지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, 원문에 ARM·Linux·컴파일러·커널 공식 자료가 인용 또는 명시되는지 확인한다.
- `part8-08-neon.md`는 코드 비중이 높으므로 예제의 설명, 지원하지 않는 CPU에서의 동작, 검증 방법을 우선 확인한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part8-02-memory-alignment.md | 메모리 정렬과 패딩 분석 — Natural·Strict Alignment·Trap | 3,135 | 2,949 | 0 | 8 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part8-03-cache-alignment.md | Cache Line Alignment — alignas·Padding·SoA 적용 | 3,214 | 2,668 | 0 | 11 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 3 | part8-04-dma-allocator.md | DMA-Friendly Allocator — dma_alloc_coherent·IOMMU·Pool | 3,887 | 3,041 | 0 | 12 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 4 | part8-05-zero-copy.md | Zero-Copy Pipeline — DMA-BUF·sendfile·io_uring·splice | 3,927 | 3,187 | 0 | 21 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 5 | part8-06-numa.md | NUMA Memory Topology — numactl·numa_alloc·HBM 적용 | 4,137 | 2,633 | 0 | 23 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part8-07-simd.md | SIMD 활용 분석 — Intrinsics·Auto-Vectorization·OpenMP SIMD | 3,093 | 3,458 | 0 | 21 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 7 | part8-08-neon.md | ARM NEON 심화 — Matrix Multiply·FFT·Image Filter 적용 | 3,670 | 5,478 | 0 | 30 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 8 | part8-09-stack-analysis.md | 임베디드 스택 분석 — high-water·overflow 탐지 | 3,385 | 3,050 | 0 | 21 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 9 | part8-10-code-size-optimization.md | 임베디드 코드 크기 최적화 — -Os·LTO·Section Garbage Collection | 3,236 | 2,621 | 0 | 30 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part8-11-power-optimization.md | 임베디드 전력 최적화 — Sleep Mode·Clock Gating·DVFS | 3,709 | 2,222 | 0 | 18 | 8 | 외부 출처 없음 | 근거·실전성 검토 |

## 판정 보류와 다음 조치

이번 루프에서는 원문을 수정하지 않는다. 다음 정성 검토에서 각 글의 다음 근거를 원문 위치와 함께 기록한다.

1. 실제 보드·CPU·툴체인·커널 버전 범위와 재현 가능한 절차
2. 기준선과 비교한 성능·전력·코드 크기 측정값 및 조건
3. 공식 문서·데이터시트·커널·컴파일러 자료 등 주장에 대응하는 출처
4. 인접 글과 겹치지 않는 독립적인 문제 해결 가치
5. 코드만 복사해도 이해할 수 있도록 하는 설명·실패 조건·트레이드오프

정성 검토 결과에 따라 유지·보강 검토·병합 후보를 나누되, 근거 없는 수치나 경험을 새로 만들어 넣지 않는다. 원문 수정은 별도 승인 후 별도 루프에서 수행한다.

## 루프 종료 조건

- [x] 공개 글 10편을 모두 행으로 기록
- [x] 산문·코드·외부 링크·실전 신호를 동일 기준으로 검사
- [x] 자동 분류를 최종 판정으로 사용하지 않음
- [x] 원문 수정·비공개·삭제·URL 변경 없음
- [x] 보고서 자체의 diff 공백 오류 없음

## 정성 평가 업데이트

기계 triage 대상 10편을 원문으로 읽고 잠정 점수를 추가했다. P0 정책 차단은 확인되지 않았다. 성능·전력·메모리 결과는 실제 target 측정 전의 `잠정` 값이다.

| 파일 | 총점 | 결정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part8-02-memory-alignment.md` | **76/100** | 보강 | alignment/padding/packed 함정과 compile-time 검증은 좋지만 architecture별 실제 penalty가 없음 |
| `part8-03-cache-alignment.md` | **75/100** | 보강 | false sharing·SoA·DMA cache 경계를 설명하지만 benchmark 결과가 측정 필요 상태임 |
| `part8-04-dma-allocator.md` | **80/100** | 유지 후보 | coherent/streaming/CMA/IOMMU/MPU를 구분하고 cache 오류 경로를 다루지만 platform별 검증이 필요함 |
| `part8-05-zero-copy.md` | **78/100** | 보강 | DMA-BUF·V4L2·sendfile·io_uring을 pipeline으로 연결하지만 실제 복사 제거 여부와 성능값이 없음 |
| `part8-06-numa.md` | **77/100** | 보강 | numactl/libnuma/HBM/CXL과 측정 도구를 연결하지만 서버·자동차 사례가 넓고 실측이 없음 |
| `part8-07-simd.md` | **76/100** | 보강 | auto-vectorization·intrinsics·OpenMP SIMD의 선택 기준은 좋지만 ISA별 benchmark가 없음 |
| `part8-08-neon.md` | **75/100** | 보강 | matrix/image/FFT/crypto 사례가 풍부하지만 코드 우세와 target별 결과 부재가 남음 |
| `part8-09-stack-analysis.md` | **80/100** | 유지 후보 | high-water·canary·MPU·static 분석을 실제 검출 흐름으로 연결하지만 RTOS/target 조건이 필요함 |
| `part8-10-code-size-optimization.md` | **78/100** | 보강 | -Os/LTO/gc-sections/libc 선택 순서가 명확하지만 실제 map diff가 없음 |
| `part8-11-power-optimization.md` | **80/100** | 유지 후보 | sleep/clock gating/DVFS/측정 장비까지 다루지만 전류·수명 결과는 측정 필요임 |

| 파일 | 독창성 25 | 완결성 20 | 실전성 15 | 중복 15 | 검색 의도 10 | UX 10 | 신뢰 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part8-02-memory-alignment.md` | 17 | 17 | 10 | 11 | 9 | 9 | 3 | **76** |
| `part8-03-cache-alignment.md` | 16 | 17 | 10 | 11 | 9 | 9 | 3 | **75** |
| `part8-04-dma-allocator.md` | 18 | 18 | 12 | 12 | 9 | 8 | 3 | **80** |
| `part8-05-zero-copy.md` | 17 | 17 | 11 | 11 | 9 | 9 | 4 | **78** |
| `part8-06-numa.md` | 17 | 17 | 10 | 11 | 9 | 9 | 4 | **77** |
| `part8-07-simd.md` | 17 | 16 | 10 | 11 | 9 | 9 | 4 | **76** |
| `part8-08-neon.md` | 17 | 17 | 10 | 10 | 9 | 9 | 3 | **75** |
| `part8-09-stack-analysis.md` | 18 | 18 | 12 | 12 | 9 | 8 | 3 | **80** |
| `part8-10-code-size-optimization.md` | 17 | 17 | 11 | 12 | 9 | 9 | 3 | **78** |
| `part8-11-power-optimization.md` | 18 | 18 | 12 | 11 | 9 | 9 | 3 | **80** |

### 공통 근거와 보강 우선순위

- 근거 위치: 각 글의 `핵심 개념`, `코드 / 실제 사용 예`, `측정 / 성능 비교`, `자주 보는 함정`, `정리` 섹션.
- 공통 강점: 성능·전력·메모리 주장을 무조건적인 수치로 단정하지 않고 target·workload 측정을 반복해서 요구한다.
- 공통 감점: 실제 benchmark, map diff, power trace, cache/DMA 환경, CPU/ISA 버전이 보고서에 없다.
- 중복 위험: alignment/cache/DMA/zero-copy/NUMA가 모두 메모리 이동·locality를 다루므로 각 글의 독립 질문을 유지해야 한다.
- 다음 확인: ARM/Linux 공식 자료, compiler optimization report, perf/numastat, power profiler, DMA/cache maintenance 결과.

원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md` 앵커 4편을 기준으로 10편을 원문 전체로 다시 읽고 채점했다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다.

- 공통 필드: 10편 모두 `score_status: 잠정`. P0 없음(확인 범위: 원문 본문과 내부 링크 대상 파일 존재 여부. 렌더링·광고 배치는 보지 않았다).
- factcheck: git 이력상 10편 모두 출처 없는 `Qualify …` 커밋만 거쳐 기본값은 `미검증`이다. 외부 자료는 가져오지 않았다. 원문만으로 성립하는 오류가 있는 2편(8-08, 8-11)만 루브릭 3-1절에 따라 `오류 확인`으로 두었다.
- 내비게이션 확인: 다음 편 안내는 seriesOrder+1 파일과, 관련 항목은 링크 대상 파일의 존재와 라벨을 대조했다. 링크 대상 파일은 모두 존재한다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part8-02-memory-alignment.md` | 10 | 12 | 7 | 11 | 7 | 6 | 1 | 54 | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |
| `part8-03-cache-alignment.md` | 10 | 11 | 6 | 4 | 6 | 4 | 1 | 42 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part8-04-dma-allocator.md` | 12 | 12 | 7 | 10 | 7 | 4 | 1 | 53 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part8-05-zero-copy.md` | 10 | 10 | 4 | 8 | 5 | 5 | 1 | 43 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part8-06-numa.md` | 10 | 11 | 6 | 12 | 6 | 4 | 1 | 50 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part8-07-simd.md` | 11 | 12 | 6 | 9 | 6 | 5 | 1 | 50 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part8-08-neon.md` | 11 | 10 | 5 | 5 | 6 | 3 | 1 | 41 | 오류 확인 | 우선 조치 | 높음 | `part1-04-uart-hardware.md` |
| `part8-09-stack-analysis.md` | 12 | 12 | 7 | 5 | 7 | 7 | 1 | 51 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part8-10-code-size-optimization.md` | 10 | 12 | 8 | 9 | 8 | 6 | 1 | 54 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part8-11-power-optimization.md` | 11 | 12 | 7 | 10 | 7 | 6 | 1 | 54 | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |

v1.1 점수(75~80점, `유지 후보` 3편 포함)보다 21~34점 낮다. v1.1의 `유지 후보` 표기는 v1.2 5절 분류 이름이 아니며, 80점이던 3편(8-04, 8-09, 8-11)도 E·F·G와 측정 표 내용을 반영하면 앵커 `part7-05-kernel-build.md`(50점) 구간이다. 8-09는 다른 시리즈 글과 같은 질문을 나눠 답해 D가 크게 내려갔다.

### part8-02-memory-alignment.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | s1·s2 재배치(48~65행), `_Static_assert`로 wire format 고정(92~104·140행), packed + memcpy(120~126행)는 C 입문서의 표준 예제다. 39~42행은 unaligned 비용을 "달라짐·확인합니다"로 비우고 18·118·265행은 "Cortex-A cycle 두 배", "ARMv7+는 2배 cycle"로 단정한다. |
| B | 12 | natural alignment → padding → offsetof → static_assert → packed → alignas → stack → 함정으로 완결된다. 201~206행은 내용이 빠진 text 블록 뒤에 "같은 정보를 두 배의 RAM으로 표현하는 셈"만 남아 문맥이 끊긴다. |
| C | 7 | offsetof 기대값(81~85행)과 `_Static_assert`는 컴파일만으로 검증할 수 있다. 측정 블록(188~197행)은 Cortex-M4 칸이 비어 있고 A72 1·2 cycle 수치는 출처가 없다. |
| D | 11 | 8-03과 packed 남용(210~219행 / 8-03 232~241행), stack alignas(252~260행 / 8-03 213~221행), A72 NEON cycle 블록(194~196행 / 8-03 192~196행)이 반복된다. padding이라는 핵심 질문은 구별된다. |
| E | 7 | description 키워드는 다룬다. 제목의 "Trap"은 fault 여부 한두 문장(18·115행)뿐이다. |
| F | 6 | 272행 다음 편(8-03)이 seriesOrder 91과 맞고, 276~279행 라벨이 대상과 맞는다. 그 밖의 글 고유 탐색 구조는 없다. |
| G | 1 | ABI 문서나 Architecture Reference Manual 인용이 없다. |

uncertainties:
- 85행 `alignof(struct s) = 8`은 31행 "32-bit ARM은 uint64_t를 4-byte로 처리"와 대상 ABI가 다르면 맞지 않는다. 예제의 대상 ABI가 없다.
- 184행 "stack frame은 보통 8 또는 16-byte 정렬"과 256행 "stack은 16/32 byte만 보장"이 다르다.
- 18·265행 "ARMv6/M0 fault"에서 ARMv6와 ARMv6-M을 구분했는지 미확인.
- 260행 "alignas가 무시될 수 있습니다" 컴파일러 동작 미확인.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — 8-03과 겹치는 블록을 한쪽으로 정리하고, 예제의 대상 ABI를 밝히고, 201~206행을 정리한다.

### part8-03-cache-alignment.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | element 사이 padding이 필요한 이유(66~80행)와 hot/cold 분리(126~142행)가 이 글의 몫이다. 41~47행 line size 표는 칸이 모두 "확인"인데 226·259행은 "Cortex-M7 32 B, Apple M1 128 B"로 단정한다. 163행 "scaling은 측정해야"와 258행 "선형 scaling을 얻습니다"가 어긋난다. |
| B | 11 | 정렬 → padding → SPSC → SoA → hot/cold → per-CPU → 커널 매크로 → 함정 흐름은 있다. SoA 예제(112~121행)는 AoS 배열(104행)과 같은 이름 `parts`를 써서 그대로는 성립하지 않는다. |
| C | 6 | 182행 "1억 번 증가시킨 결과입니다"인데 표(184~188행)는 비어 있다. false sharing을 확인할 도구(perf c2c 등)가 없다. |
| D | 4 | `part9-09-false-sharing`(제목 "False Sharing 해결 — Cache Line Padding·SoA 적용")이 per-CPU counter, SPSC head/tail, `____cacheline_aligned`, `hardware_destructive_interference_size`를 같은 방식으로 다룬다. PE 4-02·2-07도 같은 주제다. 같은 질문을 여러 글이 나눠 답한다. |
| E | 6 | description의 "코드와 측정으로"가 이행되지 않는다. |
| F | 4 | 262행 다음 편(DMA Allocator)은 맞다. 266·267행 라벨 "2-02"·"3-02"가 실제 9-01·8-04와 다르고, 43행 표에 머리글 행이 한 번 더 들어가 있다. |
| G | 1 | 출처가 없다. |

uncertainties:
- 108행 "60% 낭비": 7개 float 중 x·vx 2개만 쓰면 약 71%다. 비율 계산 근거 미확인.
- 192~198행 A72 aligned/misaligned NEON load cycle 수치 출처 없음.
- 255행 "흔히 8~10배 throughput 회복" 출처 없음.

병합 대상: `src/content/blog/embedded/modern-recipes/part9-09-false-sharing.md`. false sharing·per-CPU·SPSC 부분을 9-09로 모으고, 이 글은 SoA·hot/cold·DMA 정렬로 좁히거나 9-09에 합친다.

### part8-04-dma-allocator.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | Linux DMA API(coherent·streaming·SG·CMA·IOMMU)와 Cortex-M MPU non-cacheable + linker section(124~181행)을 같은 질문으로 묶은 것이 이 글의 관점이다. stack 위 DMA buffer 함정(226~236행)이 구체적이다. 65~69행 방향별 cache 동작 표는 세 칸 모두 "규칙을 따름"이라 정보가 없다. |
| B | 12 | 문제 → 요건 다섯 가지 → Linux → MCU → DPDK → 함정으로 완결된다. 26행 "contiguous는 SG/IOMMU가 대체할 수도"와 261행 "contiguous·정렬·cache 세 조건을 모두 충족해야"가 어긋난다. |
| C | 7 | linker script(148~159행)와 MPU 설정(165~179행)은 따라 할 수 있는 형태다. 196행 "측정한 결과입니다" 아래 표가 비어 있고, 213행 "latency를 절반 가까이"는 근거가 없다. |
| D | 10 | IOMMU·iova 설명이 7-11 154행과, DMA 정렬 함정이 8-03 243~250행과 겹친다. |
| E | 7 | 제목·description 키워드를 다룬다. |
| F | 4 | 269행 다음 편(Zero-Copy Pipeline)은 8-05인데, 274행 "3-03: Zero-Copy Pipeline" 링크는 `part12-09-zero-copy-camera`로 간다. 273행 "3-01" 라벨도 틀렸다. |
| G | 1 | 대상 칩 reference manual과 커널 문서 출처가 없다. |

uncertainties:
- 80행 `sg_set_buf(&sgt.sgl[i], …)` 배열 인덱싱이 chained scatterlist에서도 안전한지 미확인.
- 150·169행 0x30000000 SRAM2 주소와 크기가 어느 STM32H7 part 기준인지 표기가 없다.
- 255~257행 "32B line MCU에서 64B 정렬만 신경 쓰는 경우"는 64B 정렬이 32B 정렬을 포함하므로 제목과 설명의 연결 확인 필요.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — 196·213행 측정 주장 처리, 26행과 261행 정리, 274행 링크 수정.

### part8-05-zero-copy.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | buffer 공유·kernel 내 전송·kernel 우회 세 갈래(24~30행)는 이 글의 정리다. 각 절은 API 조각 하나와 완곡 문장이다(71·85·110·129·140·151·188·209·229행이 모두 "확인해야"·"달라집니다"·"보장할 수 없습니다"). |
| B | 10 | description이 약속한 Camera → GPU → Encoder → Network 연결 예제가 없고 API 목록으로 끝난다. |
| C | 4 | 측정 블록(194~207행)이 전부 "측정 필요"다. 98행 "throughput 2~3배"는 근거가 없다. 코드 조각끼리 연결되지 않는다. |
| D | 8 | V4L2 EXPBUF·DRM PRIME 절(49~85행)이 12-09 `zero-copy-camera`의 "V4L2 buffer export"·"Display — DRM/KMS PRIME" 절과 겹치고, mmap 절은 7-09, DPDK 절은 7-11과 겹친다. |
| E | 5 | description "memcpy를 모두 제거"와 14행 "복사가 남을 수 있습니다"가 어긋나고, 제목의 pipeline을 실제로 구성하지 않는다. |
| F | 5 | 269행 다음 편(NUMA)은 맞다. 273·274·276행 라벨 번호("3-02"·"3-04"·"RTOS 3-11")가 실제 파일 번호와 다르다. |
| G | 1 | 커널·liburing 버전과 문서 출처가 없다(129행 "5.1 계열"만 있다). |

uncertainties:
- 54~65행: `V4L2_MEMORY_DMABUF`로 REQBUFS한 버퍼에 `VIDIOC_EXPBUF`를 쓰는 조합이 유효한지 미확인.
- 28행 io_uring을 "kernel 우회"로 분류한 것, 266행 "XDP와 DPDK는 NIC을 user space와 직접 연결"(176행은 XDP를 드라이버 레벨 eBPF로 설명) 표현 확인 필요.
- 264행 "sendfile/splice/io_uring은 user space 복사를 제거"는 121행 `io_uring_prep_read`(user buffer로 읽기) 예제와 맞지 않는다.

병합 대상: `src/content/blog/embedded/modern-recipes/part12-09-zero-copy-camera.md`. DMA-BUF·V4L2·DRM 절을 12-09로 모으고, 이 글은 sendfile·splice·io_uring의 file·network 경로로 좁힌다.

### part8-06-numa.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 자동차 SoC cluster를 mini-NUMA로 보는 관점(20·144~155행)과 first-touch 함정(219~225행)이 이 글의 몫이다. 그러나 155행은 "구성이 있을 수 있습니다 … 확인해야"로 그 관점을 스스로 비우고, HBM·CXL 절(125~142행)은 "측정·확인" 문장뿐이다. |
| B | 11 | 확인 → binding → libnuma → pin → allocator → HBM → ECU → balancing → 측정 도구 → 함정까지 간다. 206행 "latency는 single-node pin, throughput은 interleave"는 70행 "검증해야"와 어긋난다. |
| C | 6 | `numactl --hardware`·`numastat` 출력 예(46~58·167~174행)는 있으나 198행 "2-socket Xeon 4 GB array sum 결과입니다" 아래 표가 비어 있다. |
| D | 12 | 시리즈 안에서 NUMA를 다루는 글은 이것뿐이다. |
| E | 6 | 제목의 "HBM 적용"은 128~140행 placeholder 수준이다. |
| F | 4 | 257행 다음 편(SIMD)은 맞다. 261행 "3-03: Zero-Copy Pipeline"은 12-09 camera 글로 가고, 262행 "3-05" 라벨도 틀렸다. |
| G | 1 | 출처와 커널·libnuma 버전이 없다. |

uncertainties:
- 20·147~149행 "Cortex-A78AE 8 core, cluster별 DRAM channel" 구성의 근거 제품이 없다.
- 181~182행 perf 이벤트 이름은 특정 x86 PMU 이름으로 보여 ARM 대상에서 쓸 수 있는지 미확인.
- 252행 "HBM과 CXL도 NUMA node로 노출되어"는 142행 "일부 플랫폼에서 … 될 수 있습니다"보다 강한 단정이다.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — HBM 절을 실제 노출 예로 채우거나 제목에서 빼고, 빈 측정 표와 정리 절 단정문을 정리한다.

### part8-07-simd.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 세 전략의 적용 순서(36행), vectorize 실패 패턴(69~85행), 같은 덧셈을 NEON·MVE·SVE·AVX2로 나란히 쓴 예(87~162행)가 쓸 만하다. 223행 "Auto-vectorize만 잘 풀려도 4배"는 214행 "재측정해야"와 어긋난다. |
| B | 12 | 전략 → 조건 → 실패 패턴 → ISA별 예 → OpenMP → ILP → saturating → 함정으로 완결된다. 151~159행 AVX2 예제에는 245~252행이 경고한 tail loop가 없다. |
| C | 6 | `-fopt-info-vec`·`-Rpass` 명령(42~48행)은 재현 가능하지만 출력 예가 없고 측정 표(216~230행)가 비어 있다. |
| D | 9 | MVE 예제(106~124행), multiple accumulator(183~199행), misaligned·tail 함정(245~261행)이 8-08 186~223·253~278행과 거의 같고, PE 2-09 "SIMD·NEON 활용"과 주제가 겹친다. |
| E | 6 | 제목의 "분석"에 비해 분석 결과가 없다. 본문이 개념 소개보다는 깊어 앵커 1-04(5점)보다 1점 높게 봤다. |
| F | 5 | 291행 다음 편(NEON)은 맞다. 295·296·298행 라벨 "3-04"·"3-06"·"3-01"이 실제 파일 번호와 다르다. |
| G | 1 | 컴파일러 버전과 ISA 문서 출처가 없다. |

uncertainties:
- 47행 `gcc-aarch64` 실행 파일 이름 미확인.
- 67행 "loop count가 vector 크기의 배수"를 vectorize 조건으로 든 것(컴파일러의 remainder 처리) 확인 필요.
- 154행 `_mm256_load_ps`의 정렬 요구가 예제에 드러나지 않는다.

병합 대상: 병합 대상 없음(일반 SIMD 전략은 독립 검색 의도가 있다). 다음 조치: `보강` — 8-08과 겹치는 MVE·누산기·함정 절을 한쪽으로 정리하고 AVX2 tail을 보완한다.

### part8-08-neon.md

`factcheck: 오류 확인` — box filter(91~105행)와 Sobel(118~133행)은 루프를 `x += 16`으로 진행하면서 한 번에 `vld1_u8`로 8바이트를 읽어 `uint16x8_t`(8 lane)로 계산하고 `vst1_u8`로 8바이트만 쓴다. 24·29행이 밝힌 lane 수(int16 8개) 기준으로 16픽셀마다 8픽셀은 계산되지 않는다. 또 111행은 "9-element sum"이라 하고 104행은 `>> 4`(16으로 나눔)를 쓴다. 원문만으로 성립하는 산술 오류라 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 4×4 행렬 lane FMA(44~64행), box filter·Sobel NEON 구현, crypto extension 예(173~184행)는 이 글만의 예제다. 위 오류 때문에 예제를 그대로 믿고 쓸 수 없다. |
| B | 10 | YUV → RGB는 76행 "(~10 NEON ops)"로 생략했고, quaternion은 정의되지 않은 `quat_mul`(166행)을 쓰고, FFT는 CMSIS-DSP 호출(143~156행)뿐이다. |
| C | 5 | 측정 표(229~238행)가 전부 "측정 필요"다. 78행 `r`·`g`·`b`는 정의되지 않아 예제가 그대로는 컴파일되지 않는다. |
| D | 5 | MVE(186~202행), multiple accumulator(204~223행), misaligned load·tail 함정(253~278행)이 8-07 106~124·183~199·245~261행과 거의 같다. |
| E | 6 | 제목의 FFT는 라이브러리 호출뿐이고, "심화"를 내건 Image Filter 예제에 위 오류가 있다. |
| F | 3 | 306행 "이 시리즈 Part 3은 여기까지"인데 이 글은 part8이고 다음 글(8-09)을 안내하지 않는다. 310·311행 라벨 "3-05"·"3-01"도 틀렸다. |
| G | 1 | ARM 문서와 CMSIS-DSP 버전 출처가 없다. |

uncertainties:
- 34행 "ARMv9 SVE2 (Neoverse V1/V2, Cortex-X)"에서 V1의 SVE2 지원 여부 미확인.
- 100~101행 `vextq_u16(sum, sum, 7/1)`은 한 벡터 안에서 회전하므로 가장자리 lane에 다른 쪽 끝 값이 더해진다. 의도 확인 필요.
- 288~294행 Cortex-M CPACR 설명과 "NEON·FPU 명령은 reset 직후 disabled"를 Cortex-A NEON에도 같은 뜻으로 쓴 것인지 미확인.

다음 조치: box filter·Sobel 루프 폭과 나눗셈 수정, 306행 안내와 라벨 수정, 8-07과 겹치는 절 정리 후 재채점. 점수 구간 기준 병합 후보는 `src/content/blog/embedded/modern-recipes/part8-07-simd.md`(MVE·누산기·함정 절 중복)다.

### part8-09-stack-analysis.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 1차 high-water → 2차 hook → 3차 MPU 계층(33~35행), `.su` 파일의 static·dynamic·bounded 해석(164~170행), puncover로 worst-case path 보기(172~180행)가 실무 관점이다. 254행 "양산 사고 1순위", 258행 "MPU guard는 0 cycle에 … 가장 강력"은 14·190~192행의 완곡 표현과 어긋난다. |
| B | 12 | 패턴 채우기 → FreeRTOS → hook → stack protector → MPU → bare-metal → `.su` → call chain → 함정으로 완결된다. 31행은 "세 기법"이라 하는데 바로 위 표(24~29행)는 네 기법이다. |
| C | 7 | `-fstack-usage` 출력 예(161~168행)와 FreeRTOS API 코드가 재현 가능하다. 측정 표(184~201행)는 비어 있다. |
| D | 5 | PRTOS 4-06 `stack-overflow`(제목 "Stack Overflow 탐지 — Canary·MPU·Watermark 3중 방어")가 같은 세 방어와 `uxTaskGetStackHighWaterMark`·`configCHECK_FOR_STACK_OVERFLOW`·`-fstack-usage`를 다룬다. |
| E | 7 | 제목·description 키워드를 다룬다. |
| F | 7 | 33~35행 1·2·3차 목록이 아래 절 순서와 대응하고, 262행 다음 편(8-10)과 266~269행 관련 항목 라벨이 모두 대상과 맞는다. |
| G | 1 | FreeRTOS 버전과 MPU 문서 출처가 없다. |

uncertainties:
- 67행은 `wm * 4`로 byte를 계산해 66·78행의 `sizeof(StackType_t)`와 다르다.
- 119~122행 guard를 `MPU_ACCESS_RO`로 설정하면 overflow 시 읽기 접근은 잡지 못한다. 29행 "read-only로 만들어 HW가 trap"의 범위 확인 필요.
- 146~152행 Reset_Handler가 현재 쓰고 있는 main stack 영역까지 패턴으로 덮어쓰는 문제 미확인.
- 90행 hook 주석 "ISR context, scheduler suspended" 미확인.

병합 대상: `src/content/blog/embedded/rtos/practical-internals/part4-06-stack-overflow.md`. bare-metal(134~155행)·`.su`·puncover 절을 넘기고 FreeRTOS 부분은 PRTOS 글로 위임하는 안을 검토한다.

### part8-10-code-size-optimization.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 7단계 순서 표(24~31행), bloaty 출력 읽기(146~155행), LTO와 inline asm·weak 충돌(219~225행)은 툴체인 문서 수준이다. 효과 표(37~43행)와 단계별 표(185~193행)가 모두 "측정"이라 33행 "각 단계가 누적적으로 효과를 냅니다"를 보여 주지 못한다. |
| B | 12 | 단계별 옵션 → 분석 도구 → section 배치 → inline → 함정으로 완결된다. 85행은 strip이 flash 크기에 영향이 없다고 하는데 24~33행은 strip을 누적 절감 단계로 둔다. |
| C | 8 | 명령이 그대로 실행 가능하고(49~132행) `size`·`bloaty` 출력 예(139~152행)가 있다. 실측 비교는 없다. |
| D | 9 | ECPP 1-04 `code-size-analysis`가 `--gc-sections`·`-flto`·`nano.specs`·`bloaty`를 함께 다룬다. 그 글은 C++ 비용 중심이라 역할은 일부 구별된다. |
| E | 8 | 제목과 description의 키워드(-Os·LTO·gc-sections·strip·newlib-nano·printf-tiny)를 모두 다룬다. |
| F | 6 | 253행 다음 편(8-11)이 맞고 257~260행 라벨이 대상과 맞는다. 24행 표는 첫 단계가 머리글 자리에 들어가 깨진다. |
| G | 1 | GCC·newlib 버전이 없다. |

uncertainties:
- 195행 "다섯 옵션", 187~192행 여섯 단계, 24~31행 일곱 단계가 서로 다르다.
- 199·250행 "LTO는 runtime이 더 빠른 경우도 많습니다" 근거 없음.
- 126행 `-fno-builtin`을 크기 절감 공통 권장에 넣은 근거 미확인.

병합 대상: 병합 대상 없음. 다음 조치: `보강` — 빈 효과 표를 실측 map diff로 채우거나 삭제하고, strip 위치와 단계 수를 정리한다.

### part8-11-power-optimization.md

`factcheck: 오류 확인` — 25행 식은 `I_active × t_active` 항을 포함하는데 28~31행은 "손댈 수 있는 축은 두 가지뿐"이라며 `t_sleep`·`I_sleep`만 든다. 같은 글 47·146·236행은 DVFS로 active 전력을 줄인다고 설명한다. 같은 글 안의 모순이라 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 평균 전류 식(24~31행), STM32 stop·standby 레지스터 코드(66~91행), tickless hook에서 clock을 8 ↔ 80 MHz로 바꾸는 예(108~127행), 측정 도구 비교(148~157행)가 이 글의 몫이다. 37~40행 대표 전류 표는 출처가 없고 14행 "측정으로 확인"과 어긋난다. |
| B | 12 | 식 → mode → WFI → stop → standby → gating → tickless → DVFS → 측정 → pin → 함정으로 완결된다. 170행 "대표 BLE sensor의 평균 전류 측정값입니다" 아래 표가 비어 있어 배터리 수명이라는 결론에 닿지 못한다. |
| C | 7 | 레지스터 수준 코드가 있으나 70행 `PWR_CR1_LPMS_STOP1`, 97행 `RCC->APB1ENR`, 220행 `USART2->DR`이 서로 다른 STM32 계열 이름으로 보여 한 보드에서 재현되는지 알 수 없다(앵커 1-04 C 근거와 같은 유형). |
| D | 10 | PRTOS 2-09 `tickless`, PE 3-09 `power-vs-performance`(DVFS)와 일부 겹친다. |
| E | 7 | description 키워드를 다룬다. µA 측정은 도구 표뿐이다. |
| F | 6 | 240행 다음 편(8-12 WCET)이 seriesOrder 100과 맞고, 244~248행 라벨이 대상과 맞는다. |
| G | 1 | datasheet·reference manual 인용과 대상 칩 이름이 없다. |

uncertainties:
- 117~119행 `*xExpectedIdleTime`을 ms로 다루는데 FreeRTOS에서 단위가 tick인지 확인 필요.
- 77행 "stop mode는 모든 clock을 끄고 … 100 µA 이하" 출처 없음.
- 152행 "multimeter는 µA가 noise floor에 묻힘"과 227행 "일반 DMM은 0.1 µA 단위"의 정합성 확인 필요.

다음 조치: 28~31행 서술을 식과 맞게 고치고, 대표 전류 표의 출처를 밝히거나 삭제하고, 대상 STM32 계열을 하나로 정한 뒤 재채점. 병합 대상 없음.

### 시리즈 공통 문제

- 측정 표·블록이 전부 "측정 필요"·"workload별 측정" 같은 문구라 내용이 없다(루브릭 3-1절에 따라 C 채점에서 빈 표로 봤다): `part8-02`(188~197행), `part8-03`(184~188행), `part8-04`(198~210행), `part8-05`(194~207행), `part8-06`(200~213행), `part8-07`(216~230행), `part8-08`(229~238행), `part8-09`(184~201행), `part8-10`(185~193행), `part8-11`(172~186행). 10편 전부.
- "측정한 결과입니다"·"측정값입니다"라고 쓰고 빈 표를 둔다: `part8-03`(182행), `part8-04`(196행), `part8-06`(198행), `part8-11`(170행).
- 본문은 완곡하게 쓰고 요약·정리 절은 근거 없이 단정한다: `part8-02`(42 vs 265행), `part8-03`(163 vs 258행), `part8-04`(26 vs 261행), `part8-05`(129 vs 264행), `part8-06`(70 vs 206행), `part8-07`(214 vs 223행), `part8-09`(96 vs 256행), `part8-11`(14 vs 37~40행).
- 관련 항목 라벨 번호가 실제 파일 번호와 다르다("3-02: DMA Allocator" → 8-04 등): `part8-03`, `part8-04`, `part8-05`, `part8-06`, `part8-07`, `part8-08`. "Zero-Copy Pipeline" 라벨이 8-05가 아니라 `part12-09-zero-copy-camera`로 가는 링크는 `part8-04`(274행), `part8-06`(261행)에 있고 루프 09의 `part7-09`·`part7-10`에도 같은 대상이 있다.
- 같은 블록이 여러 글에 반복된다: packed 남용·stack alignas·A72 NEON cycle 블록(`part8-02`, `part8-03`), MVE 예제·multiple accumulator·misaligned·tail 함정(`part8-07`, `part8-08`), DMA 정렬 함정(`part8-03`, `part8-04`).
- 다른 시리즈 글과 같은 질문을 나눠 답한다: `part8-03`(PE 4-02, 9-09), `part8-09`(PRTOS 4-06), `part8-10`(ECPP 1-04), `part8-11`(PRTOS 2-09, PE 3-09).
- Markdown 표가 깨진다(데이터 행이 머리글 자리에 있거나 머리글 중복): `part8-03`(43행), `part8-08`(264행), `part8-10`(24행).
- 10편 모두 본문 출처 링크와 칩·툴체인·커널 버전이 없다(G 1점).
- 10편 모두 같은 H2 뼈대를 쓴다. 글 단위 P0로 보지는 않았지만 루브릭 9절 사이트 게이트의 "같은 H2 뼈대를 쓰는 글 수"에 반영해야 한다.

개별 수정 전에 메모리 파트(8-02~8-08)의 글 경계를 먼저 정한다. alignment·cache·SIMD 블록을 어느 글에 둘지, 다른 시리즈와 겹치는 8-03·8-09를 병합할지 결정한 뒤 보강 범위를 잡는다.
