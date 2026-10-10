# Modern Embedded Recipes — 루프 15 (seriesOrder 140~149)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

## 결론

이번 루프의 10편은 산문 중앙값 4,944자다. 산문 2,500자 미만은 0편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 3편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 3 | 코드 비중과 설명의 역할을 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 4 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 3 | 자동 신호상 상대적으로 균형이지만 최종 판정 아님 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 6 |
| 산문 <2500 | 0 |
| 산문 <1500 | 0 |
| 코드 우세 | 3 |
| 실전 신호 약함 | 1 |

## 검사 포인트

- TensorRT·TFLite Micro·ONNX Runtime 글은 코드가 설명을 대체하지 않는지, 런타임·모델·하드웨어·버전별 전제가 명확한지 확인한다.
- Thermal·Jetson·Zero-Copy Camera 글은 측정 기준선, 지속 부하 조건, 카메라·GPU·NPU 파이프라인의 실제 검증 절차가 있는지 확인한다.
- 온디바이스 LLM, TF-M/TrustZone, Matter/Thread 글은 외부 표준·공식 문서 링크와 함께 버전 및 적용 범위를 확인한다.
- `part12-11-tfm-trustzone.md`와 `part12-12-matter-thread.md`는 산문이 긴 만큼 용어·표준 설명이 독립적인 설계 판단과 사례로 이어지는지 확인한다.
- `part11-15-pcie-to-cxl.md`는 실전 신호가 약한 후보로, PCIe와 CXL의 차이를 개념 비교에 그치지 않고 적용 조건과 공식 근거로 연결하는지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, NVIDIA·Google·Arm·CNCF/표준기구·Matter/Thread 공식 자료가 인용 또는 명시되는지 확인한다.
- 정확도·지연·전력·온도·메모리 사용량·보안 수준 주장은 모델·보드·런타임·측정 조건을 함께 기록한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part12-04-tensorrt.md | TensorRT 분석 — ONNX→Engine·FP16·INT8·DLA·Multi-Stream | 4,106 | 5,263 | 0 | 10 | 8 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 2 | part12-05-tflite-micro.md | TFLite Micro 분석 — Op Resolver·Tensor Arena·Cortex-M | 3,201 | 4,773 | 0 | 6 | 17 | 코드 우세, 외부 출처 없음 | 정성 검토 우선 |
| 3 | part12-06-onnx-runtime.md | ONNX Runtime 분석 — Execution Provider와 Cross-Platform 배포 | 3,911 | 4,760 | 1 | 8 | 18 | 코드 우세 | 정성 검토 우선 |
| 4 | part12-07-thermal.md | Edge Thermal Management — Throttling·DVFS·Fan Curve·Sustained | 4,471 | 2,579 | 0 | 39 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 5 | part12-08-jetson.md | NVIDIA Jetson 분석 — Nano·Xavier·Orin·Thor·JetPack·DLA·VPI | 5,417 | 3,279 | 0 | 15 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part12-09-zero-copy-camera.md | Zero-Copy Camera Pipeline — V4L2·DMA-BUF·GPU Import·NPU 직결 | 6,016 | 4,667 | 0 | 11 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 7 | part12-10-on-device-llm.md | 온디바이스 LLM 추론 — llama.cpp·GGUF·MLX·KV Cache·NPU Backend | 5,475 | 4,492 | 3 | 7 | 8 | 해당 없음 | 1차 유지 후보 |
| 8 | part12-11-tfm-trustzone.md | Cortex-M33 TF-M·TrustZone — Secure Firmware·PSA·MCUboot | 7,202 | 4,645 | 1 | 10 | 8 | 해당 없음 | 1차 유지 후보 |
| 9 | part12-12-matter-thread.md | Matter·Thread 분석 — IoT 통합 표준·Commissioning·Multi-Fabric | 8,159 | 2,597 | 1 | 13 | 8 | 해당 없음 | 1차 유지 후보 |
| 10 | part11-15-pcie-to-cxl.md | PCIe → CXL 진화 — 같은 PHY 위 cache-coherent 프로토콜 추가 | 3,838 | 928 | 0 | 1 | 10 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |

## 판정 보류와 다음 조치

이번 루프에서는 원문을 수정하지 않는다. 다음 정성 검토에서 각 글의 다음 근거를 원문 위치와 함께 기록한다.

1. 실제 보드·가속기·런타임·표준 버전 범위와 재현 가능한 절차
2. 기준선과 비교한 정확도·지연·전력·온도·메모리 측정값 및 조건
3. 공식 문서·표준·데이터시트 등 주장에 대응하는 출처
4. 인접 글과 겹치지 않는 독립적인 문제 해결 가치
5. 코드만 복사해도 이해할 수 있도록 하는 설명·실패 조건·트레이드오프

정성 검토 결과에 따라 유지·보강 검토·병합 후보를 나누되, 근거 없는 수치나 경험을 새로 만들어 넣지 않는다. 원문 수정은 별도 승인 후 별도 루프에서 수행한다.

## 루프 종료 조건

- [x] 공개 글 10편을 모두 행으로 기록
- [x] 산문·코드·외부 링크·실전 신호를 동일 기준으로 검사
- [x] 자동 분류를 최종 판정으로 사용하지 않음
- [x] 원문 수정·비공개·삭제·URL 변경 없음
- [x] 보고서 자체의 diff 공백 오류 없음

