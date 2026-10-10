# Modern Embedded Recipes — 루프 14 (seriesOrder 130~139)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

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

