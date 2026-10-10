# Modern Embedded Recipes — 루프 10 (seriesOrder 90~99)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

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

