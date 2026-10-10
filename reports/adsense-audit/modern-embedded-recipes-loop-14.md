# Modern Embedded Recipes — 루프 14 (seriesOrder 130~139)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음
> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 3,922자다. 산문 2,500자 미만은 0편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 3편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 3 | 코드 비중과 설명의 역할을 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 7 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 0 | 기계 신호만으로 유지 후보로 올릴 글 없음 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 10 |
| 산문 <2500 | 0 |
| 산문 <1500 | 0 |
| 코드 우세 | 3 |
| 실전 신호 약함 | 2 |

## 검사 포인트

- DMA completion·PCIe streaming·HLS·Quartus 글은 하드웨어/툴체인별 전제와 실제 검증 절차가 설명되는지 확인한다.
- Vitis HLS와 HLS 최적화 글은 동일한 Pipeline·Unroll·Partition·Dataflow 주제가 중복되지 않고, 기초 분석과 최적화 판단이 분리되는지 비교한다.
- `part11-13-opencl-fpga.md`와 `part11-14-intel-quartus.md`는 실전 신호가 약한 후보로, 명령·API 나열을 넘어 재현 가능한 설계 또는 디버깅 절차가 있는지 우선 확인한다.
- Vitis AI·Edge Inference·NPU·Quantization 글은 빠르게 변하는 도구와 모델에 의존하므로 버전, 하드웨어, 모델, 정확도·지연 측정 조건을 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, AMD/Xilinx·Intel·Arm·Qualcomm·프레임워크 공식 자료가 인용 또는 명시되는지 확인한다.
- 처리량·II·지연·정확도·메모리 절감 주장은 기준선과 측정 조건을 함께 기록한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part11-08-dma-completion.md | DMA Completion 메커니즘 — Interrupt·Polling·Completion Ring | 3,804 | 2,835 | 0 | 8 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part11-09-pcie-streaming.md | PCIe Streaming 분석 — BAR Type·MSI-X·Kernel Bypass | 4,921 | 2,779 | 0 | 12 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 3 | part11-10-hls.md | Vitis HLS 분석 — Pragma·Pipeline II·Dataflow 실전 감각 | 3,826 | 3,541 | 0 | 7 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 4 | part11-11-hls-optimization.md | HLS 최적화 기법 — Pipeline·Unroll·Partition·Dataflow | 3,199 | 5,312 | 0 | 5 | 15 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 5 | part11-12-vitis-ai.md | Vitis AI 분석 — DPU·xmodel·VART | 3,518 | 4,525 | 0 | 7 | 15 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 6 | part11-13-opencl-fpga.md | OpenCL on FPGA — Kernel·Channel·Burst Memory 분석 | 3,190 | 5,859 | 0 | 0 | 16 | 코드 우세, 외부 출처 없음, 실전 신호 약함 | 정성 검토 우선 |
| 7 | part11-14-intel-quartus.md | Intel Quartus 사용법 — Platform Designer·Nios II·HLS | 4,218 | 3,320 | 0 | 0 | 19 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 8 | part12-01-edge-inference.md | Edge Inference 분석 — Cloud vs Edge·Latency·Privacy | 4,018 | 3,319 | 0 | 25 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 9 | part12-02-npu-architecture.md | NPU 아키텍처 분석 — Ethos·Hexagon·Systolic Array 비교 | 4,266 | 3,340 | 0 | 5 | 17 | 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part12-03-quantization.md | 딥러닝 Quantization 분석 — PTQ·QAT·INT8·INT4·Calibration | 4,930 | 2,802 | 0 | 7 | 8 | 외부 출처 없음 | 근거·실전성 검토 |

## 판정 보류와 다음 조치

이번 루프에서는 원문을 수정하지 않는다. 다음 정성 검토에서 각 글의 다음 근거를 원문 위치와 함께 기록한다.

1. 실제 보드·FPGA·가속기·툴 버전·모델 범위와 재현 가능한 절차
2. 파형·자원 사용량·II·처리량·지연·정확도 등 관찰 결과와 조건
3. 공식 문서·데이터시트·프레임워크 자료 등 주장에 대응하는 출처
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

기계 triage 후 원문을 직접 읽은 두 글의 잠정 평가를 추가한다. 두 글 모두 P0 정책 차단은 확인되지 않았다.

| 파일 | 상태 | 총점 | 결정 | 핵심 근거 |
| --- | --- | ---: | --- | --- |
| `part11-13-opencl-fpga.md` | 잠정 | **70/100** | 보강 | FPGA 실행 모델·channel·II·emulator 차이는 유용하지만 실제 보드 합성·리포트 검증이 예시 수준임 |
| `part11-14-intel-quartus.md` | 잠정 | **72/100** | 보강 | Quartus 전체 흐름과 명령은 풍부하지만 release·device·edition별 제약과 실제 timing 결과가 부족함 |

### `part11-13-opencl-fpga.md`

| 항목 | 점수 |
| --- | ---: |
| 독창성 | 15/25 |
| 완결성 | 16/20 |
| 실전성·검증 가능성 | 10/15 |
| 중복·병합 위험 | 10/15 |
| 검색 의도 일치 | 9/10 |
| 탐색성·가독성·내부 연결 | 8/10 |
| 작성자·출처·신뢰성 | 2/5 |

근거 위치: `핵심 개념 — Single Work-Item Kernel`, `Channel — Kernel 간 통신`, `Burst memory access`, `Host code (Intel OpenCL)`, `사례 — FIR Filter`, `Profile / Report`, `자주 보는 함정`, `정리`.

### `part11-14-intel-quartus.md`

| 항목 | 점수 |
| --- | ---: |
| 독창성 | 14/25 |
| 완결성 | 17/20 |
| 실전성·검증 가능성 | 10/15 |
| 중복·병합 위험 | 11/15 |
| 검색 의도 일치 | 9/10 |
| 탐색성·가독성·내부 연결 | 9/10 |
| 작성자·출처·신뢰성 | 2/5 |

근거 위치: `Project 생성`, `SDC Constraint`, `Compile`, `TimeQuest — Timing Analysis`, `Platform Designer (Qsys)`, `Nios II Soft Processor`, `TCL 자동화`, `자주 보는 함정`, `정리`. 두 글 모두 특정 버전·보드·실행 결과를 공식 문서와 대조한 뒤 점수를 확정한다. 원문은 수정하지 않았다.

### 추가 정성 평가

| 파일 | 총점 | 결정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part11-08-dma-completion.md` | **79/100** | 보강 | IRQ/polling/completion ring/hybrid와 p99 latency 관점이 좋지만 제시한 UART 결과의 실제성 확인이 필요함 |
| `part11-09-pcie-streaming.md` | **78/100** | 보강 | BAR/MSI-X/ordering/kernel bypass를 streaming 결정으로 연결하지만 benchmark와 PCIe 조건이 없음 |
| `part11-10-hls.md` | **80/100** | 유지 후보 | FIR·dataflow·II·AXI·C/RTL 검증 흐름이 명확하지만 합성 report가 예시 수준임 |
| `part11-11-hls-optimization.md` | **77/100** | 보강 | pipeline/unroll/partition/dataflow를 단계적으로 설명하지만 실제 II/resource 결과가 없음 |
| `part11-12-vitis-ai.md` | **73/100** | 보강 | quantize→compile→xmodel→VART 흐름은 좋지만 release·board 의존성과 성능 주장 근거가 부족함 |
| `part12-01-edge-inference.md` | **76/100** | 보강 | cloud/edge 판단과 end-to-end pipeline 기준은 좋지만 latency·privacy·비용 수치의 검증이 없음 |
| `part12-02-npu-architecture.md` | **74/100** | 보강 | Ethos/Hexagon/ANE/Edge TPU/DLA를 비교하지만 제조사별 비공개 구조를 일반화할 위험이 있음 |
| `part12-03-quantization.md` | **78/100** | 보강 | PTQ/QAT/per-channel/GPTQ/AWQ 흐름이 풍부하지만 accuracy·memory·latency 결과가 없음 |

| 파일 | 독창성 25 | 완결성 20 | 실전성 15 | 중복 15 | 검색 의도 10 | UX 10 | 신뢰 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part11-13-opencl-fpga.md` | 15 | 16 | 10 | 10 | 9 | 8 | 2 | **70** |
| `part11-14-intel-quartus.md` | 14 | 17 | 10 | 11 | 9 | 9 | 2 | **72** |
| `part11-08-dma-completion.md` | 18 | 17 | 11 | 11 | 9 | 9 | 4 | **79** |
| `part11-09-pcie-streaming.md` | 18 | 17 | 10 | 11 | 9 | 9 | 4 | **78** |
| `part11-10-hls.md` | 18 | 18 | 11 | 11 | 9 | 9 | 4 | **80** |
| `part11-11-hls-optimization.md` | 18 | 17 | 10 | 11 | 9 | 9 | 3 | **77** |
| `part11-12-vitis-ai.md` | 17 | 16 | 10 | 10 | 9 | 8 | 3 | **73** |
| `part12-01-edge-inference.md` | 17 | 17 | 10 | 11 | 9 | 9 | 3 | **76** |
| `part12-02-npu-architecture.md` | 17 | 17 | 9 | 10 | 9 | 9 | 3 | **74** |
| `part12-03-quantization.md` | 18 | 17 | 10 | 11 | 9 | 9 | 4 | **78** |

### 공통 근거와 보강 우선순위

- 근거 위치: 각 글의 `사례`, `코드 / 실제 사용 예`, `측정 / 성능 비교`, `자주 보는 함정`, `정리` 섹션.
- 공통 강점: FPGA/AI 글이 단순 용어 소개를 넘어 pipeline, resource, quantization, end-to-end 측정 항목을 제시한다.
- 공통 감점: `측정 필요` 표가 많고 board·IP·runtime·model·release가 고정되지 않았다.
- 우선 확인: OpenCL/Quartus/Vitis AI의 기존 점수와 함께 AMD/Xilinx·Intel·Arm·runtime 공식 문서 및 실제 synthesis/profile/accuracy 결과를 대조한다.
- 중복 위험: HLS·HLS optimization·OpenCL·Vitis AI가 pipeline/accelerator 설명을 공유하므로 각 글의 독립적인 질문을 구분한다.

원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2(`docs/adsense-audit/rubric.md`)와 앵커(`docs/adsense-audit/anchors.md`)로 10편을 다시 채점했다. 위 v1.1 표에서 원문을 읽은 글은 두 편뿐이었고, 이번에는 10편 모두 원문 전체를 읽었다. 줄 번호는 2026-10-11 기준 원문 파일의 줄(frontmatter 포함)이다.

공통 기록:

- `score_status`: 10편 모두 `잠정`.
- factcheck 기준: git 이력상 10편 모두 출처 없는 `Qualify …` 커밋만 있어 기본값은 `미검증`이다. 외부 자료는 가져오지 않았다. `오류 확인`은 원문 안의 산술·수치 모순만으로 성립하는 경우에만 줬고, 두 위치를 함께 적었다.
- P0: 10편 모두 확인되지 않았다. 확인 범위는 원문 본문과 내부 링크 대상의 존재 여부까지다(본문 링크 대상은 모두 저장소에 있다). 렌더링·광고 배치·외부 유사 문서 비교는 하지 않았다.
- 다음 편 안내는 실제 seriesOrder+1 글과, 관련 항목 라벨은 링크 대상 파일 번호와 대조했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part11-08-dma-completion.md` | 13 | 14 | 6 | 9 | 8 | 4 | 1 | 55 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md, part6-09-isr-api.md |
| `part11-09-pcie-streaming.md` | 11 | 12 | 6 | 6 | 7 | 4 | 1 | 47 | 미검증 | 병합 검토 | 중간 | part6-09-isr-api.md |
| `part11-10-hls.md` | 13 | 13 | 7 | 7 | 7 | 3 | 1 | 51 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part11-11-hls-optimization.md` | 10 | 12 | 5 | 4 | 7 | 5 | 1 | 44 | 오류 확인 | 우선 조치 | 중간 | part6-09-isr-api.md, part1-04-uart-hardware.md |
| `part11-12-vitis-ai.md` | 10 | 12 | 6 | 12 | 7 | 5 | 1 | 53 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part11-13-opencl-fpga.md` | 11 | 12 | 6 | 9 | 7 | 6 | 1 | 52 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part11-14-intel-quartus.md` | 10 | 12 | 6 | 11 | 7 | 4 | 1 | 51 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part12-01-edge-inference.md` | 12 | 11 | 4 | 11 | 6 | 3 | 1 | 48 | 오류 확인 | 우선 조치 | 중간 | part6-09-isr-api.md, part12-10-on-device-llm.md |
| `part12-02-npu-architecture.md` | 10 | 10 | 4 | 9 | 6 | 3 | 1 | 43 | 오류 확인 | 우선 조치 | 중간 | part1-04-uart-hardware.md, part6-09-isr-api.md |
| `part12-03-quantization.md` | 14 | 14 | 6 | 11 | 8 | 3 | 1 | 57 | 오류 확인 | 우선 조치 | 중간 | part12-10-on-device-llm.md |

### part11-08-dma-completion.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | interrupt·polling·completion ring을 한 축에 놓고 hybrid(121~142행)와 cyclic DMA half/full(166~179행), phase 확인 뒤 `dma_rmb()` 순서(183~195행)까지 연결한 비교가 이 글의 관점이다. 28·34·215행은 latency 기준을 "측정"으로 돌린다. |
| B | 14 | 개념 → 다섯 가지 코드 패턴 → 측정 → 함정 → 정리가 완결된다. 측정 표의 환경이 없어 결론의 적용 범위를 판단할 수 없다. |
| C | 6 | 199~213행 두 표는 "받아 본 결과"라면서 MCU·clock·NVMe 장치·커널 버전이 없다. 같은 NVMe 수치(SPDK 2.4 M IOPS, 12 µs)가 11-09 193행에도 그대로 있다. |
| D | 9 | phase·DD 확인과 slot 재사용 함정(235~246행)이 11-07 함정(231~237·257~264행)과 같은 질문이고, completion ring 코드도 11-07 `q_reap`과 겹친다. |
| E | 8 | 제목·description의 세 방식과 IRQ coalescing trade-off를 모두 다룬다. |
| F | 4 | 274행 다음 편(PCIe Streaming)은 seriesOrder 131과 맞다. 278~280행 라벨 "5-02: CQ·SQ"(→ part11-07), "5-04"(→ part11-09), "3-02: DMA Allocator"(→ part8-04)는 번호가 틀렸다. |
| G | 1 | STM32 HAL·Linux NAPI·SPDK 버전과 문서 링크가 없다. |

uncertainties:
- 35행은 polling이 "CPU 한 코어 100%"라고 하는데 205행 "DMA cyclic + polling"은 CPU 1.5%다. 205행이 주기적 polling을 뜻하는지 원문으로 확인되지 않는다.
- 18행 "1 Mbps에서 30% 가까이"와 203행 32%의 측정 MCU·clock 미확인.
- 158행 NAPI poll에서 `enable_irq(rx_irq)`를 부르는 형태가 일반 드라이버 관례(장치 레벨 interrupt enable)와 맞는지 미확인.

병합 대상: `part11-07-cq-sq.md`. completion ring·phase bit·CQ doorbell 함정이 겹치므로 11-07에 "completion 처리" 절로 합치는 안을 검토한다. MCU cyclic DMA(166~179행)는 독립 가치가 있어 합치지 않는다면 이 부분을 중심으로 차별화 보강한다.

### part11-09-pcie-streaming.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | `lspci -vv` 출력 해석(50~59행), posted write 순서와 RO 비트(121~131·219~221행), non-posted read 비용(133~141행)이 이 글의 판단이다. BAR 타입·prefetchable 설명(26~42행)은 11-03과 같은 내용이다. 251행은 latency를 "측정합니다"로 돌린다. |
| B | 12 | BAR·MSI-X·ordering·bypass 세 축을 끝까지 다룬다. 측정 표 하나(180~185행)가 비었고, probe 코드(63~88행)는 error label이 없는 조각이다. |
| C | 6 | 명령·코드는 있으나 장치·커널 버전이 없다. BAR 측정 표는 전부 "측정 필요"이고, NVMe 표(189~193행)와 10 GbE 수치(195행)는 출처 없는 숫자다. 141행 "PCIe Read는 보통 1-5 µs"는 182행 "측정 필요"와 어긋난다. |
| D | 6 | 함정 "Prefetchable에 side-effect register"(199~208행)와 "64-bit BAR 읽기"(232~238행)가 11-03 함정(226~257행)과 같은 두 항목이다. MSI-X·VFIO·SPDK는 published `embedded/hardware/pcie/` Ch5·Ch12·Ch17과 겹친다(제목·H2만 대조). |
| E | 7 | 제목의 BAR Type·MSI-X·Kernel Bypass와 description을 이행한다. BAR 부분이 11-03 반복이라 9점은 아니다. |
| F | 4 | 255행 다음 편(Vitis HLS)은 seriesOrder 132와 맞다. 본문 20행 "1-03 PCIe BAR"(→ part11-03), 159행 "4-04 UIO·VFIO"(→ part7-11), 259~261행 라벨 셋은 번호가 틀렸다. |
| G | 1 | PCIe Base Specification 판·절, DPDK·SPDK 버전이 없다. |

uncertainties:
- 174행 "io_uring 대비 latency가 절반 가까이 떨어진다"는 192·193행 p99(55 µs → 12 µs, 약 78% 감소)와 크기가 맞지 않는다. 비교 기준(평균·p99)이 원문에 없어 오류로 단정하지 않았다.
- 126행 `sq[tail] = cmd`는 host 메모리 쓰기인데 "posted write"로 적었다. PCIe TLP 관점에서 맞는 표현인지 미확인.
- 238행 "4 GB 이상 영역이면 32-bit read는 0을 반환" 미확인.
- 34~35행 MSI 32·MSI-X 2048 vector 미확인(사양 대조 필요).

병합 대상: `part11-03-pcie-bar.md`(BAR 타입·함정 중복)과 하나의 PCIe 레시피로 합치는 안, 또는 `src/content/blog/embedded/hardware/pcie/chapter05-interrupts.md`·`chapter12-virtualization-1.md`로 독자를 넘기고 이 글은 streaming 결정(ordering·non-posted read·MSI-X 배치)만 남기는 안. 병합 전 PCIe 시리즈 본문을 직접 대조한다.

### part11-10-hls.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | UNROLL만 주면 자원만 늘고 II는 그대로라는 비교(188~195행, II 32 → 1, 200 MHz 기준 6 → 200 MSPS로 계산이 맞음)와 합성 보고서를 예상 자원과 대조하라는 습관(182행)이 이 글의 판단이다. 표는 "예시 형식"(186행)이라 실측은 아니다. 104행은 완곡 표현이다. |
| B | 13 | pragma 다섯 개 → FIR(axis·m_axi) → dataflow → 의존성 → 비트폭 → testbench → 보고서 → 함정까지 간다. burst 표(199~203행)가 비었다. |
| C | 7 | testbench(157~167행)와 C sim → co-sim 절차(169행), 보고서 예(173~180행)가 있지만 Vitis 버전·device가 없다. |
| D | 7 | 11-11과 같은 pragma 다섯 개, FIR 예제, 4-way 누적(134~140행 ↔ 11-11 286~292행), "partition 없는 UNROLL" 함정(239~249행 ↔ 11-11 295~305행)을 공유한다. |
| E | 7 | 제목의 Pragma·Pipeline II·Dataflow와 description의 AXI 인터페이스 결정을 다룬다. "실전 감각"은 예시 표로만 뒷받침된다. |
| F | 3 | 280행 "다음 편은 AXI 인터페이스"인데 seriesOrder 133은 HLS 최적화 글이다. 284~286행 라벨 "5-04"(→ part11-09), "5-06: AXI"(→ part11-04), "4-04"(→ part7-11)는 번호가 틀렸다. |
| G | 1 | Vitis HLS 버전·UG 문서·대상 device가 없다. |

uncertainties:
- 71행 MAC loop는 `#pragma HLS UNROLL`(완전 전개)인데 177행 보고서는 같은 loop를 Trip 32·II 1로 표시한다. 완전 전개된 loop가 보고서에 이렇게 남는지 미확인.
- 131행 정수 덧셈 recurrence가 "II=2~3"으로 떨어진다는 설명 미확인.
- 36행 "기본 BRAM이 single-port"는 11-01 75행 "dual-port"와 표현이 다르다(HLS 기본 binding과 하드웨어 port 수의 차이일 수 있음).

병합 대상: `part11-11-hls-optimization.md`. 두 글이 같은 질문(II=1을 끌어내는 pragma 조합)에 답한다. 이 글을 본편으로 두고 11-11의 Sobel line buffer(184~229행)만 옮기는 안을 검토한다.

### part11-11-hls-optimization.md

`factcheck: 오류 확인` — 원문 안의 산술 모순 세 건이다. (1) 229행은 Sobel이 "1080p60 입력을 100 MHz fabric에서 그대로 처리"한다고 하지만, 190·200행은 II=1(1 pixel/cycle)이고 27행 기준으로 100 MHz × II=1은 100 Msample/s다. 1920×1080×60 ≈ 124.4 Mpixel/s라 blanking을 빼도 처리할 수 없다. (2) 236행 보고서는 "Latency 8302 cycles (1080×768)"인데 1080×768 = 829,440 pixel이므로 II=1이면 약 83만 cycle이어야 하고, 246행 "Interval ≈ data 수 / II" 기준과도 맞지 않는다. (3) 182행 "100배 빨라집니다"는 149행 naive II=8~16 → II=1과 맞지 않는다(8~16배). 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | pragma 다섯 개와 FIR naive/optimized는 11-10의 반복이다. 이 글에만 있는 것은 Sobel line buffer·sliding window(184~229행)와 partition 종류 설명(97행)이다. 14·27·77행은 기준 대신 "검증합니다"로 끝난다. |
| B | 12 | II 개념 → pragma별 예 → FIR → Sobel → 보고서 → dataflow → 함정 흐름은 있지만 Sobel 성능 결론과 보고서 숫자가 모순이라 핵심 사례의 결론이 성립하지 않는다. |
| C | 5 | 코드는 있으나 133·151행 제목이 "예시: II와 throughput은 합성 report 확인"이고 보고서(235~244행)는 원문 계산과 맞지 않는다. 도구 버전·device가 없다. |
| D | 4 | 11-10과 같은 질문을 나눠 답한다(pragma 다섯 개, FIR, 4-way 누적, partition 없는 UNROLL 함정, 3-stage dataflow). 루브릭 D 1~4 구간이다. |
| E | 7 | 제목의 네 기법을 모두 다룬다. description의 "throughput 극대화"는 모순된 수치로 뒷받침된다. |
| F | 5 | 352행 다음 편(Vitis AI)은 seriesOrder 134와 맞고 356~358행 라벨도 맞다. 359행 "6-03: Quantization"은 `part12-03`으로 가 번호가 틀렸다. |
| G | 1 | Vitis/Vivado HLS 버전·UG 문서·device가 없다. |

uncertainties:
- 241행 "DSP: 8 (Sobel multipliers)"는 계수 ±1·±2 연산이 DSP로 가는지 미확인.
- 284행 "5-cycle add chain" 수치와 대상 연산(int·float) 미확인.
- 331행 "1024 element → 1024 FF"는 원소 비트폭을 빠뜨린 계산이다.

병합 대상: `part11-10-hls.md`. 오류 수정과 함께 이 글의 Sobel line buffer 절만 11-10으로 옮기고 이 글은 리다이렉트하는 안을 검토한다. URL 변경은 시리즈 전체 검토 뒤에 정한다.

### part11-12-vitis-ai.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | quantize → compile → VART 흐름(48~169행)은 vendor 튜토리얼 순서다. 이 글의 것은 CPU pre/post가 DPU 시간을 가리는 계산(291~296행: 6 ms + 30 ms → 36 ms, 약 28 fps로 계산이 맞음)과 CPU·DPU 분담도(223~229행)다. 18·34·266·279행은 완곡 표현이다. |
| B | 12 | 흐름 네 단계와 YOLOv5·multi-thread·IP instantiate·함정까지 있다. DPU 옵션 표(38~44행)는 B1024 행이 "—"이고 B4096은 "측정"으로 비어, 46행 "KV260은 보통 B4096"의 근거가 없다. |
| C | 6 | 명령(`vai_c_xir`, `xdputil`)과 C++·Python API 코드가 있지만 Vitis AI release가 없다. profile 출력(241~246행)은 전부 "측정 필요"인데 20·192행은 150·600 fps를 단정한다. |
| D | 12 | calibration 설명이 12-03과 겹치지만 DPU·xmodel·VART는 이 글에만 있다. |
| E | 7 | 제목의 DPU·xmodel·VART를 모두 다룬다. 성능 주장이 profile 절과 어긋나 9점은 아니다. |
| F | 5 | 311행 다음 편(OpenCL)은 seriesOrder 135와 맞다. 318·319행 라벨 "6-01: Edge Inference"(→ part12-01), "6-03: Quantization"(→ part12-03)은 번호가 틀렸다. |
| G | 1 | Vitis AI release·DPU IP 버전·보드 이미지 버전과 문서 링크가 없다. |

uncertainties:
- 20행 "ResNet-50 KV260 ~150 fps @ 5W", 192행 "~600 fps", 40~44행 GOPS 수치 출처 없음.
- 44행 "대형 부서"는 의미를 알 수 없는 표현이다.
- 256행 "`M_AXI_HP` 4개"는 PL master가 PS slave port(S_AXI_HP)에 붙는 방향과 이름이 맞는지 미확인.
- 283행 "ZU19EG는 2개 DPU" 미확인.

병합 대상: 병합 대상 없음. Vitis AI는 독립 검색 의도가 있다. 다음 조치는 `보강`이다. release를 고정하고 profile 표를 실측하거나 20·192행 수치를 지우며, 링크 라벨을 고친다.

### part11-13-opencl-fpga.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | GPU식 NDRange와 FPGA식 single work-item의 사고 차이(20·141~157·306~316행)가 이 글의 관점이다. channel·unroll·local memory 설명은 HLS 글과 같은 내용이고, 103·268·335행은 완곡 표현이다. |
| B | 12 | kernel → channel → burst → local → unroll → host code → SYCL → FIR → report → Vitis → 함정으로 완결된다. host code(161~207행)는 `N`·`host_a` 선언이 없는 조각이다. |
| C | 6 | `aoc` 명령, 동작 가능한 형태의 host·SYCL 코드가 있지만 Intel FPGA SDK·oneAPI 버전과 보드가 없다. report(278~287행)는 예시이고 268행은 "합성해 확인합니다"로 결과를 비웠다. |
| D | 9 | FIR 예제의 계수 배열(252행)이 11-11 161행과 같고, unroll·line buffer·float 비용 함정이 11-10·11-11과 반복된다. OpenCL·SYCL 부분은 역할이 구별된다. |
| E | 7 | 제목의 Kernel·Channel·Burst Memory와 description의 SYCL/oneAPI를 다룬다. |
| F | 6 | 365행 다음 편(Intel Quartus)이 seriesOrder 136과 맞고 369~372행 라벨도 맞다. 전제 지식(HLS 글을 먼저 읽을 것) 안내는 없다. |
| G | 1 | OpenCL·SYCL 사양 판, Intel FPGA SDK·oneAPI 버전, 문서 링크가 없다. |

uncertainties:
- 51행 `-board=p520_max_sg280l` 보드 이름 미확인.
- 302행 "XRT가 OpenCL 위에 더 thin abstraction"이라는 계층 설명 미확인.
- 18행 "AMD Alveo, 일부 Xilinx Vitis flow"에서 현재 OpenCL 지원 범위 미확인.

병합 대상: 병합 대상 없음. OpenCL·SYCL on FPGA는 독립 질문이다. 다음 조치는 `보강`이다. FIR 예제를 HLS 글과 다른 사례로 바꾸거나 같은 FIR을 OpenCL로 옮겼을 때의 차이를 보고서 수치로 보여 준다.

### part11-14-intel-quartus.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | GUI 절차와 TCL은 Quartus 문서 순서다. 이 글의 것은 Vivado 대응표(269~279행)와 HPS-FPGA bridge를 Zynq GP/HP/ACP에 대응시킨 설명(308~324행)이다. 18·215·281행은 완곡 표현이다. |
| B | 12 | project → SDC/QSF → compile → timing → programming → Platform Designer → Nios II → HLS → PR → Signal Tap → ModelSim → TCL까지 넓게 다루지만 각 절이 짧다. PR(213~228행)은 절차 네 줄과 API 한 줄이다. |
| C | 6 | 실행 가능한 TCL·CLI(39~47·88~91·120~130·285~304행)가 있지만 Quartus 버전이 없고 timing 결과는 예시(97~106행)다. |
| D | 11 | 11-02 Vivado와 절 구성이 평행하고 Nios II 절이 11-01 soft processor 절과 겹치지만, 도구가 달라 역할은 구별된다. |
| E | 7 | 제목의 Platform Designer·Nios II·HLS와 description의 partial reconfig을 다룬다. PR은 얕다. |
| F | 4 | 370행 "다음 편은 Part 12 시작 — NPU 아키텍처"인데 seriesOrder 137은 Edge Inference(12-01)다. 374~377행 라벨은 대상과 맞다. |
| G | 1 | Quartus release·edition, Intel 문서 링크가 없다. |

uncertainties:
- 22·337행 "Cyclone V는 Standard에서만, Lite는 안 됨"은 edition별 지원표로 확인하지 않았다.
- 157~159행 Nios II 등급별 LE 수, 224행 `alt_partial_reconfig_block` API 이름 미확인.
- 98행 "TimeQuest" 명칭과 현재 Quartus의 Timing Analyzer 명칭 차이, Nios II의 현재 지원 상태 미확인(staleness 후보).

병합 대상: 병합 대상 없음. Quartus 사용법은 독립 검색 의도가 있다. 다음 조치는 `보강`이다. release를 고정하고 한 보드에서 compile·timing 결과를 보여 주며 다음 편 안내를 고친다.

### part12-01-edge-inference.md

`factcheck: 오류 확인` — 38행은 "전력 6배, compute 500배 차이"라고 적었지만 같은 글의 표(32행 MCU 0.1 W, 36행 Jetson AGX Orin 60 W)로는 전력 차이가 600배다(compute는 0.5 → 275 TOPS로 약 550배라 맞음). 원문만으로 성립하는 산술 오류라 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | "모든 추론을 edge로가 아니라 어떤 추론을 옮길지"(24행)라는 결정 틀과 응용별 latency budget(20행), stage별 시간 비중(53~56행)이 이 글의 관점이다. 수치(30~36·192~198행)는 출처가 없다. |
| B | 11 | cloud vs edge 기준 → 하드웨어·프레임워크 → pipeline → 코드 → 측정 → 함정으로 간다. 제목의 privacy는 22행 한 문장뿐이고, latency 표는 비었다. |
| C | 4 | latency 표(179~186행)는 칸 전체가 "측정 필요"라 내용이 없다. 그런데 fps/W 표(192~198행)는 latency·전력 없이 값을 단정한다. 코드는 조각이고 환경이 없다. |
| D | 11 | 하드웨어 등급·전력 표가 12-02(185~194행)와 겹치고 Jetson·TensorRT 내용은 12-04·12-08과 겹친다. 결정 틀 자체는 이 글에만 있다. |
| E | 6 | 제목의 Cloud vs Edge·Latency는 이행하지만 Privacy는 거의 다루지 않는다(부분 미이행). |
| F | 3 | 249행 "다음 편은 TensorRT"인데 seriesOrder 138은 NPU 아키텍처다. 253·254·256행 라벨 "6-02"(→ part12-04), "6-05"(→ part12-08), "3-05"(→ part8-07)는 번호가 틀렸고 255행 "6-07: 온디바이스 LLM"은 링크가 없다. |
| G | 1 | 하드웨어 사양·프레임워크 버전의 출처가 없다. |

uncertainties:
- 38행 "같은 model이 MCU에서 ms·SBC에서 100 ms·Orin에서 1 ms"는 compute 순서와 맞지 않는다. 원래 의도한 단위를 확인하지 못했다.
- 33·34행 Raspberry Pi 5 "~0.5 TFLOPS CPU", Snapdragon X Elite "45 TOPS NPU / 15 W" 미확인.
- 90행 NEON "8~12배", 124행 Cortex-M55 KWS "1~2 ms", 236행 "accuracy가 5% 떨어지고" 출처 없음.

병합 검토 대상(점수 구간 기준 기록): 오류 수정 뒤에도 50점 미만이면 하드웨어 표는 `part12-02-npu-architecture.md`와 합치고, 이 글은 cloud·edge 결정 기준과 end-to-end pipeline만 남기는 안을 검토한다.

### part12-02-npu-architecture.md

`factcheck: 오류 확인` — 원문 안의 산술·수식 모순 두 건이다. (1) 279행 "Theoretical: 10000 fps"와 281행 "Real: 200 fps (5%)"는 200 / 10000 = 2%라 괄호 비율이 틀렸다. (2) 162행 `q = round((x - zero_point) / scale)`와 163행 `x = (q + zero_point) × scale`은 서로 역연산이 아니다(162행을 풀면 x = q × scale + zero_point). 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | Ethos·Hexagon·ANE·Edge TPU·Jetson 사양 목록(42~130행)과 TOPS/W 표(185~194행)는 공개 사양 나열이다. 이 글의 것은 roofline 관점(145~155행)과 peak TOPS가 application throughput이 아니라는 함정(274~284행)인데 후자는 계산이 틀렸다. 20·181행은 완곡 표현이다. |
| B | 10 | MAC array → vendor별 → memory → quantization → 전력 → 인터페이스 → 사례 → 함정 흐름은 있다. description이 약속한 "내부 구조"는 systolic array 8줄(33~40행) 외에는 사양 수치이고, 사례(237~248행)는 환경이 모순이다(241행 "96×96×3 grayscale"). |
| C | 4 | Vela·TFLite 명령은 있지만 결과가 없다. 사례 수치(244~245행)는 출처·측정 조건이 없고, 248행 "전력 1/3"은 80 / 200 mW = 0.4와 맞지 않는다. |
| D | 9 | Quantization 절(157~181행)이 12-03과, TOPS/W 표가 12-01 fps/W 표와 겹친다. |
| E | 6 | 제목의 비교는 사양 표로 이행하지만 "아키텍처 분석"에 비해 구조 설명이 얕다. |
| F | 3 | 305행 "다음 편은 TFLite Micro"인데 seriesOrder 139는 Quantization이다. 312·313행 라벨 "6-01"(→ part12-01), "6-03"(→ part12-03)은 번호가 틀렸다. |
| G | 1 | vendor 사양 출처·발표 시점이 없다. |

uncertainties:
- 60행 "MCU급 power budget에서 1 TOPS"는 46행(U55 32~512 GOPS)·188행(U55 0.5 TOPS)과 맞지 않는다. 60행이 U65를 가리킨 것인지 원문으로 판단할 수 없다.
- 196행 "작은 NPU일수록 TOPS/W 효율이 좋다"는 같은 표의 Cortex-M 1, Edge TPU 2, Orin GPU 5.5와 맞지 않는다(해석 문제라 오류 근거에서는 뺐다).
- 237행 "STM32H747 + Ethos-U55" 조합이 실재하는지, 84행 ANE 수치, 125~127행 Orin AGX 코어 수, 189·193행 Hexagon·DLA TOPS 미확인.

병합 검토 대상(점수 구간 기준 기록): 오류 수정 뒤에도 50점 미만이면 quantization 절은 `part12-03-quantization.md`로, 하드웨어 전력 표는 `part12-01-edge-inference.md`와 합치고 이 글은 NPU 구조(MAC array·memory hierarchy·fallback)만 남기는 안을 검토한다.

### part12-03-quantization.md

`factcheck: 오류 확인` — 같은 글의 두 표가 같은 모델(Llama 3 8B)·같은 variant의 perplexity 차이를 다르게 적었다. 135~142행 "PPL Δ vs FP16"은 Q4_K_M +0.03, Q3_K_M +0.10, Q2_K +0.6, Q8_0 +0.001인데, 212~219행 표로 계산하면 FP16 6.21 대비 Q4_K_M 6.31(+0.10), Q3_K_M 6.45(+0.24), Q2_K 7.10(+0.89), Q8_0 6.22(+0.01)다. 판정은 `우선 조치`다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | scale·zero point 수식과 symmetric/asymmetric 선택 기준(26~34행), per-group이 LLM INT4에서 필요한 이유(49~51행), GPTQ·SmoothQuant의 원리 설명(156·167행)이 이 글의 정리다. 표 수치는 출처가 없고 서로 모순이라 20점대는 아니다. |
| B | 14 | 수식 → PTQ/QAT → granularity → TFLite·ORT·llama.cpp·GPTQ·SmoothQuant → calibration → 측정 → 함정 → 정리로 별도 검색 없이 따라갈 수 있다. description의 AWQ는 252행 이름뿐이다. |
| C | 6 | TFLite·ORT·llama.cpp·AutoGPTQ 명령이 있지만 버전이 없다. 측정 표(196~219행)는 장비·조건·출처가 없고 위 모순이 있다. 113행 `QuantFormat`·`QuantType` import가 없다. |
| D | 11 | llama.cpp quantize와 Q4_K_M 권장이 12-10 `on-device-llm`(192행 등)과, INT8 기본 수식·TFLite 변환이 12-02 157~179행과 겹친다. |
| E | 8 | 제목의 PTQ·QAT·INT8·INT4·Calibration을 모두 다룬다. |
| F | 3 | 273행 "다음 편은 Thermal management"인데 seriesOrder 140은 TensorRT다. 277·278행 라벨 "6-02: TensorRT"(→ part12-04), "6-04: Thermal"(→ part12-07)은 번호가 틀렸고 279행 "6-07"은 링크가 없다. |
| G | 1 | 논문(GPTQ·SmoothQuant·AWQ)·도구 버전·평가 데이터셋 출처가 없다. |

uncertainties:
- 133행 Q4_K_M의 layer별 bit 배분(attention 6-bit 등) 미확인.
- 198~206행 ResNet-50 INT4 GPTQ 수치와 "Cortex-A78" latency의 측정 조건 미확인.
- 214행 "FP16 OOM (Jetson Orin)"은 Orin 모델(메모리 용량)을 적지 않아 판단할 수 없다.
- 20행 "2024년 이후 mobile LLM이 폭발"은 날짜 앵커라 staleness 검사 대상이다.

병합 검토 대상(점수 구간 기준 기록): 오류 수정 뒤 표를 하나로 정리하면 60점대 회복 여지가 있다. llama.cpp 절은 `part12-10-on-device-llm.md`와 겹치므로 한쪽으로 모으는 안을 함께 검토한다.

### 시리즈 공통 문제

- 다음 편 안내가 실제 seriesOrder+1 글과 다르다: `part11-10-hls.md`(280행), `part11-14-intel-quartus.md`(370행), `part12-01-edge-inference.md`(249행), `part12-02-npu-architecture.md`(305행), `part12-03-quantization.md`(273행).
- 관련 항목·본문 링크 라벨이 옛 번호 체계(`1-03`, `3-02`, `4-04`, `5-02`, `6-03` 등)라 링크 대상 번호와 다르다: `part11-08-dma-completion.md`, `part11-09-pcie-streaming.md`, `part11-10-hls.md`, `part11-11-hls-optimization.md`, `part11-12-vitis-ai.md`, `part12-01-edge-inference.md`, `part12-02-npu-architecture.md`, `part12-03-quantization.md`.
- 원문 안의 산술·수치 모순: `part11-11-hls-optimization.md`(229·236·182행), `part12-01-edge-inference.md`(38행), `part12-02-npu-architecture.md`(281·163행), `part12-03-quantization.md`(135~142행 ↔ 212~219행). 루브릭 5절에 따라 개별 수정 전 시리즈 차원의 수치 검수 절차를 정한다.
- 측정 표가 "측정 필요"로 비어 있거나, 비어 있는 표 옆에 출처 없는 단정 수치가 있다: `part11-09-pcie-streaming.md`(180~195행), `part11-10-hls.md`(199~203행), `part11-12-vitis-ai.md`(241~246행 ↔ 20·192행), `part12-01-edge-inference.md`(179~198행).
- 환경·출처 없는 성능 수치가 여러 글에 반복된다: SPDK 2.4 M IOPS·12 µs가 `part11-08-dma-completion.md` 213행과 `part11-09-pcie-streaming.md` 193행에 같다. `part12-02-npu-architecture.md`(185~194행), `part12-03-quantization.md`(196~219행)도 같은 유형이다.
- 같은 HLS 주제(pragma 다섯 개, 같은 FIR 계수, partition 없는 UNROLL 함정)를 세 글이 반복한다: `part11-10-hls.md`, `part11-11-hls-optimization.md`, `part11-13-opencl-fpga.md`.
- Quantization·calibration 설명이 세 글에 흩어져 있다: `part11-12-vitis-ai.md`(91·303행), `part12-02-npu-architecture.md`(157~181행), `part12-03-quantization.md`.
- 본문 안에 외부 출처 링크·도구 버전·대상 보드가 없어 G가 1점이다: 10편 전부.
