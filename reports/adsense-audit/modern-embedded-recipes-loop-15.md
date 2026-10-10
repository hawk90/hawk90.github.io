# Modern Embedded Recipes — 루프 15 (seriesOrder 140~149)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음
>
> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

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

## 정성 평가 업데이트

원문 10편을 직접 대조해 루브릭 7개 항목으로 잠정 점수화했다. 이번 점수는 Google의 공식 점수나 승인 확률이 아니라, 현재 공개 상태에서의 콘텐츠 품질·독립 가치·검증 가능성을 비교하기 위한 내부 지표다. P0 정책 차단 요소는 확인되지 않았다. 실제 보드·런타임 버전별 실행 결과와 공식 문서 대조 전이므로 신뢰도는 중간이다.

### 요약

| 파일 | 점수 | 잠정 판정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part12-04-tensorrt.md` | **77/100** | 보강 | ONNX→Engine, FP16/INT8/DLA와 벤치마크 흐름은 좋지만 실제 장치·버전별 결과가 없다 |
| `part12-05-tflite-micro.md` | **76/100** | 보강 | Tensor Arena·Resolver·CMSIS-NN 설명은 실용적이나 모델·보드·메모리 결과가 없다 |
| `part12-06-onnx-runtime.md` | **76/100** | 보강 | Execution Provider와 배포 선택지가 넓지만 교차 플랫폼 호환 범위 검증이 약하다 |
| `part12-07-thermal.md` | **80/100** | 유지 후보 | 지속 부하·전력·온도 측정 설계가 구체적이나 실제 측정 표가 없다 |
| `part12-08-jetson.md` | **79/100** | 보강 | JetPack·DLA·VPI·DeepStream을 제품 관점으로 연결했지만 보드·릴리스별 차이가 크다 |
| `part12-09-zero-copy-camera.md` | **80/100** | 유지 후보 | V4L2·DMA-BUF·EGL/CUDA 연결과 실패 조건이 실전적이나 장치별 검증 결과가 없다 |
| `part12-10-on-device-llm.md` | **82/100** | 유지 후보 | llama.cpp·GGUF·KV cache·벤치마크 명령과 출처가 있어 재현성이 상대적으로 높다 |
| `part12-11-tfm-trustzone.md` | **82/100** | 유지 후보 | TF-M·PSA·MCUboot 보안 흐름이 연결되고 공식 프로젝트 출처가 있으나 규정·버전 확인이 필요하다 |
| `part12-12-matter-thread.md` | **82/100** | 유지 후보 | Commissioning·Multi-Fabric·OTA·인증 흐름이 독립 가치가 높지만 표준 버전은 최신 공식 자료 대조가 필요하다 |
| `part11-15-pcie-to-cxl.md` | **72/100** | 보강 | PCIe/CXL 개념 비교는 명확하지만 실전 절차·공식 출처·검증 신호가 약하다 |

### 항목별 점수

| 파일 | 독창성 25 | 완결성 20 | 실전 검증 15 | 중복/병합 15 | 검색 의도 10 | UX/내부링크 10 | 신뢰/출처 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part12-04-tensorrt.md` | 17 | 17 | 11 | 11 | 9 | 9 | 3 | **77** |
| `part12-05-tflite-micro.md` | 17 | 17 | 10 | 11 | 9 | 9 | 3 | **76** |
| `part12-06-onnx-runtime.md` | 17 | 17 | 10 | 10 | 9 | 9 | 4 | **76** |
| `part12-07-thermal.md` | 18 | 18 | 12 | 11 | 9 | 9 | 3 | **80** |
| `part12-08-jetson.md` | 18 | 17 | 11 | 11 | 9 | 9 | 4 | **79** |
| `part12-09-zero-copy-camera.md` | 18 | 18 | 12 | 11 | 9 | 9 | 3 | **80** |
| `part12-10-on-device-llm.md` | 18 | 18 | 12 | 12 | 9 | 9 | 4 | **82** |
| `part12-11-tfm-trustzone.md` | 18 | 18 | 12 | 12 | 9 | 9 | 4 | **82** |
| `part12-12-matter-thread.md` | 18 | 18 | 12 | 12 | 9 | 9 | 4 | **82** |
| `part11-15-pcie-to-cxl.md` | 16 | 16 | 9 | 10 | 9 | 9 | 3 | **72** |

### 공통 근거와 우선순위

- 가장 먼저 보강할 축은 실제 실행 증거다. 보드·OS·커널·드라이버·SDK/런타임 버전, 모델·입력 조건, 측정 도구와 결과 표가 함께 있어야 숫자 주장이 독립적인 경험으로 남는다.
- TensorRT·TFLite Micro·ONNX Runtime은 지원 연산자·Execution Provider·양자화·메모리 요구량이 버전에 따라 달라지므로, 단순 API 나열보다 실패 사례와 호환성 표가 필요하다.
- Thermal·Jetson·Zero-Copy Camera는 현재도 유지 가치가 높지만, 실제 장치별 baseline과 sustained-load 결과를 추가하면 설명형 글에서 검증형 글로 올라간다.
- 온디바이스 LLM·TF-M·Matter/Thread는 현재 점수가 높지만 생태계와 표준이 빠르게 변한다. 공식 문서의 날짜·버전·적용 범위를 명시해 오래된 단정으로 보이지 않게 해야 한다.
- PCIe→CXL은 개념 설명을 유지하되, 호스트 인식·QEMU/커널 설정·실제 장치 또는 명확한 시뮬레이션 절차를 추가하지 않으면 다른 개념형 글과 병합 검토 대상이다.
- 이번 평가는 점수 산정만 수행했다. 원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md`의 앵커 네 편을 기준으로 10편을 다시 채점했다. 원문 10편을 처음부터 끝까지 읽었고, 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `part12-10-on-device-llm.md`는 앵커이므로 앵커 점수와 근거 요약을 그대로 옮겼다.

공통 필드: 10편 모두 `score_status: 잠정`이다. P0는 확인하지 못했다(확인 범위는 원문 본문, 다음 편 안내의 seriesOrder 대조, 내부 링크 대상 파일의 존재와 제목이다. 렌더링·광고 배치는 보지 않았다). factcheck는 git 이력으로 정했고 외부 자료를 가져와 대조하지 않았다. 원문만으로 성립하는 오류는 확정하지 못해 `오류 확인`은 없다. 의심은 글별 `uncertainties`에 적었다.

중복 비교 범위: 같은 루프의 인접 글, `performance-engineering/part3-10-thermal.md`, `performance-engineering/part3-11-cxl-interconnect.md`, `rtos/practical-internals/part4-11-trustzone-tfm.md`, `hardware/hbm/chapter09-cxl-mem.md`. `ml/inference/onnx-practice/`는 전부 draft라 D 비교에서 뺐다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part12-04-tensorrt.md` | 12 | 13 | 7 | 9 | 7 | 3 | 1 | 52 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part12-05-tflite-micro.md` | 10 | 12 | 6 | 11 | 7 | 4 | 1 | 51 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part12-06-onnx-runtime.md` | 9 | 11 | 6 | 9 | 7 | 3 | 1 | 46 | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md` |
| `part12-07-thermal.md` | 13 | 12 | 8 | 10 | 6 | 7 | 1 | 57 | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part12-08-jetson.md` | 12 | 12 | 6 | 7 | 7 | 7 | 2 | 53 | 검증됨 | 병합 검토 | 중간 | `part7-05-kernel-build.md` |
| `part12-09-zero-copy-camera.md` | 17 | 15 | 9 | 11 | 6 | 5 | 1 | 64 | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md` |
| `part12-10-on-device-llm.md` | 18 | 16 | 10 | 13 | 7 | 7 | 3 | 74 | 검증됨 | 보강 | 높음 | `part12-10-on-device-llm.md` |
| `part12-11-tfm-trustzone.md` | 18 | 16 | 9 | 8 | 8 | 7 | 3 | 69 | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md` |
| `part12-12-matter-thread.md` | 17 | 16 | 8 | 13 | 6 | 6 | 2 | 68 | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md` |
| `part11-15-pcie-to-cxl.md` | 12 | 11 | 7 | 4 | 6 | 8 | 4 | 52 | 검증됨 | 병합 검토 | 중간 | `part1-04-uart-hardware.md` |

v1.1과 비교하면 10편 모두 점수가 내려갔다(72~82 → 46~74). 주된 이유는 세 가지다. 틀린 다음 편 안내·링크 라벨에 F 5점 이하 규칙을 적용했고, 템플릿 요소만으로 E·F·G를 주지 않았고, 다른 시리즈와 겹치는 글의 D를 실제 본문 대조로 낮췄다. v1.1에서 80점 이상이던 5편 가운데 80점에 남은 글은 없다.

### part12-04-tensorrt.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | trtexec(54~71행)·Builder API(77~104행)·calibrator(135~157행)·plugin(204~218행)은 NVIDIA 개발자 문서의 기본 흐름이다. 이 글만의 것은 Orin 측정 표 두 개(224~246행)와 함정 절(250~300행)인데, 측정 표는 출처·환경이 없어 고유 근거로 약하다. 14행 "baseline에 따라 측정합니다"는 완곡 표현이다. |
| B | 13 | ONNX → engine → 추론 → INT8 → multi-stream → DLA → plugin → 측정 → 함정까지 기본 흐름은 끝난다. TensorRT 버전이 없어 API 차이(implicit batch, `enqueueV3`)의 전제가 빠졌고, 146행 `host_buf_`처럼 선언 없는 조각이 있다. |
| C | 7 | 명령(54~71행)은 그대로 실행할 수 있다. 224행은 "Jetson AGX Orin, ResNet-50, batch 1"이라고만 적고 JetPack·TensorRT 버전, power mode, 측정 명령이 없어 표(226~244행)를 재현할 수 없다. 표 값만으로 C를 올리지 않았다. |
| D | 9 | DLA 설정 코드(194~197행)와 "DLA에 unsupported op" 함정(293~300행)이 12-08 79~85행·227~234행과 거의 같다. INT8 calibration(133~159행)은 12-03과 주제가 겹친다. |
| E | 7 | 제목의 ONNX→Engine·FP16·INT8·DLA·Multi-Stream을 모두 다룬다. "분석"보다 사용법 정리에 가깝지만 약속 범위는 지킨다. |
| F | 3 | 313행 "다음 편은 Quantization"인데 seriesOrder 141은 TFLite Micro이고 Quantization은 139(앞 편)다. 317·319·320행 라벨 "6-01"·"6-05: Jetson"·"5-04"는 실제 대상 `part12-01`·`part12-08`·`part11-09`와 번호가 다르다. |
| G | 1 | 출처 링크가 없고 TensorRT·JetPack 버전 표기도 없다. |

uncertainties:
- 200행 "Jetson Xavier·Orin에는 DLA가 2개"는 12-08 31행(Orin Nano DLA 없음)과 맞지 않는다. 글 사이 불일치라 게이트에는 넣지 않았다.
- 189행 "frame rate가 stream 수에 비례"와 232행(1 stream 660 fps → 4 stream 2200 fps, 약 3.3배)이 정확히 맞지는 않는다. 근사 표현으로 보고 오류로 확정하지 않았다.
- 226~244행 측정값의 출처·측정 환경 미확인. 159행 "entropy calibrator가 기본", 136·205행 `IInt8EntropyCalibrator2`·`IPluginV2DynamicExt`의 현재 TensorRT 지원 상태 미확인.

병합 대상: 병합 대상 없음. TensorRT engine 빌드는 독립 검색 의도가 있다. 다음 조치는 `보강`이다. 12-08과 겹치는 DLA 절을 이 글로 모으고, 측정 표에 버전·power mode·명령을 적거나 확인하지 못한 값은 `TBD`로 둔다.

### part12-05-tflite-micro.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 설계 원칙(24~30행), 변환(34~53행), interpreter 기본형(75~134행)은 TFLM 공식 예제와 같은 내용이다. 고유한 것은 arena 크기 결정 절차(142~147행) 정도다. 191·242·353행은 CMSIS-NN·Ethos-U 효과를 "측정합니다"로 끝내 구체 판단을 대신한다. |
| B | 12 | 변환 → C array → interpreter → arena → resolver → CMSIS-NN → Ethos-U → 사례 → profiling → 함정까지 흐름은 갖췄다. TFLM 버전이 없고, 프로파일링 예제(261~270행)가 앞 코드와 이어지지 않아 따라 하기 어렵다. |
| C | 6 | 빌드 명령(184~188행)과 Vela 명령(198행)은 있다. 측정 블록(276~291행)은 보드·클럭만 적고 측정 명령·버전·출처가 없다. 268행 `interp.Invoke()`는 89행에서 포인터로 선언한 `interp`와 맞지 않고, 183행 주석 "CMake build"는 `make -f …Makefile` 명령에 붙어 있다. |
| D | 11 | INT8 변환(42~48행)은 12-03과, Ethos-U(193~210행)는 12-02와 겹치지만 MCU 런타임이라는 역할은 구별된다. |
| E | 7 | 제목의 Op Resolver·Tensor Arena·Cortex-M과 description의 CMSIS-NN·Ethos-U delegate를 모두 다룬다. |
| F | 4 | 358행 다음 편(ONNX Runtime)은 seriesOrder 142와 맞다. 365·366행 라벨 "6-01: Edge Inference"·"6-03: Quantization"은 `part12-01`·`part12-03`을 가리켜 번호가 틀렸다. |
| G | 1 | 출처 링크·TFLM 버전·대상 보드 SDK 표기가 없다. |

uncertainties:
- 153행 Person Detection 96×96 arena "~70 KB"와 220행 같은 모델 "90 KB (arena)"가 다르다. 둘 다 근삿값이고 220행이 할당 크기일 수 있어 오류로 확정하지 않았다.
- 176행 "AllOpsResolver가 200 KB"와 315행 "600 KB(model 50 KB) — 대부분이 op resolver"가 서로 다른 크기를 말한다.
- 345행 변환식 `q = round(x / scale - zero_point)`의 부호와 231행 `gray_buffer[i] - 128`의 관계 미확인(zero_point 값이 본문에 없음).
- 98행 `AllOpsResolver`가 현재 TFLM에 남아 있는지, 332행 `SOFTMAX_V2`가 실제 op 이름인지 미확인. 276~291행 수치 출처 미확인.

병합 대상: 병합 대상 없음. MCU 추론 런타임은 독립 검색 의도가 있다. 다음 조치는 `보강`이다. 측정 블록에 환경·출처를 적거나 `TBD`로 바꾸고, 268행 코드와 resolver 크기 수치를 정리한다.

### part12-06-onnx-runtime.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | EP 표(86~98행)와 provider 지정 예(102~114행)는 ORT 문서의 목록을 옮긴 수준이다. 248행 Whisper 성능, 313행 calibration 크기는 "측정합니다"로 끝나 구체 내용이 없다. 고유한 비교는 YOLOv8 플랫폼 표(223~231행)뿐인데 출처가 없다. |
| B | 11 | 다루는 범위(export, C++ API, EP, minimal build, quantization, Web, profile)는 넓지만 절마다 한두 문장이다(157·193·263행). EP를 고르는 기준이나 실패 시 대응이 없다. |
| C | 6 | 코드는 많지만 33행 `torchvision`, 216행 `QuantFormat`이 import되지 않았다. 223~231행 표는 모델 크기·정밀도·버전이 없어 재현할 수 없다. |
| D | 9 | TensorRT EP 절(118~134행)은 12-04와, quantization 절(195~217행)은 12-03과 주제가 겹친다. |
| E | 7 | 제목의 Execution Provider와 Cross-Platform 배포, description의 embedded build를 다룬다. |
| F | 3 | 335행 "다음 편은 Series 마지막 — Modern Embedded Recipes 정리"인데 seriesOrder 143은 Thermal이고 시리즈 정리 글은 없다. 342·343행 라벨 "6-01"·"6-03"도 대상 번호와 다르다. |
| G | 1 | 170행 저장소 clone URL 하나뿐이고 ORT 버전·문서 출처가 없다. |

uncertainties:
- 233행 "6 platform 배포"와 223~231행 표의 7행이 맞지 않는다. Server와 Workstation을 한 플랫폼으로 셌을 수도 있어 오류로 확정하지 않았다.
- 188·193행 `model.opt.onnx`를 "ORT format"이라고 한 설명(ORT format 파일 확장자) 미확인. 142행 `COREML_FLAG_USE_NPU` 옵션 이름 미확인.
- 146행 "M2/M3에서 ResNet-50 ~1ms", 162~163행 50 MB·5 MB, 225~231행 fps 값은 출처 없는 수치다.

병합 대상: 병합 대상 없음. cross-vendor 배포는 12-04와 다른 검색 의도다. 다음 조치는 `보강`이다. EP 선택 기준과 fallback 확인 절차를 중심으로 다시 쓰고, TensorRT EP·quantization 절은 12-04·12-03 링크로 줄인다.

### part12-07-thermal.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | "진짜 spec은 sustained"라는 관점(14·20행), MAXN이 sustained에 항상 최선은 아니라는 판단(97행), IP67 밀폐함의 conduction 설계(225행), batch 크기에 따른 순간 전력(229행)은 이 글의 시각이다. trip 온도 표(26~31행)는 "예시"로 두었고 margin 크기(45행)도 "측정해 정합니다"로 끝나 20점대는 아니다. |
| B | 12 | 개념 → 모니터링 도구 → power mode → fan → sustained 측정 → 함정까지 흐름은 완성됐다. 실제 throttle 곡선이나 burst·sustained 차이의 예가 없어 결론이 절차에 머문다. |
| C | 8 | `tegrastats`·thermal zone 명령과 예상 출력(51~57·63~77행), 1시간 측정 절차(150~159행)가 있어 재현할 수 있다. 측정 표(180~186행)는 기록 항목만 있고 결과는 없다. |
| D | 10 | thermal zone sysfs 절(63~77행)은 `performance-engineering/part3-10-thermal.md` 50~77행과 같은 내용이고, nvpmodel·jetson_clocks 절(83~95·165~172행)은 12-08 67~75행과 겹친다. sustained 측정이라는 질문은 이 글만의 것이다. |
| E | 6 | 제목은 "Edge Thermal Management"인데 도구 절(49~174행)은 전부 Jetson 전용이다. 제목의 Fan Curve는 131~146행 한 절이고 수치 설계는 없다. |
| F | 7 | 242행 다음 편(Jetson)이 seriesOrder 144와 맞고, 관련 항목 세 개(246~248행)의 라벨·대상이 맞는다. 측정 표(180~186행)가 각 항목을 앞 절의 도구와 이어 준다. |
| G | 1 | 출처·JetPack 버전·대상 모듈 표기가 없다. |

uncertainties:
- 26~31행 trip 온도와 118·122행 임계값(80·90°C)은 예시로 표시돼 있으나 근거 문서 없음.
- 52행 `tegrastats --interval`, 158행 `--logfile` 옵션은 JetPack 버전별 확인 안 함.

병합 대상: 일반 Linux thermal 절은 `performance-engineering/part3-10-thermal.md`와 병합 후보다. 다만 Jetson sustained 측정은 독립 검색 의도가 있어 글 전체 병합은 권하지 않는다. 다음 조치는 `보강`이다. 겹치는 sysfs 절은 PE 3-10 링크로 줄이고 sustained 측정 절을 키운다.

### part12-08-jetson.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 라인업 표의 precision 기준 차이를 짚은 36행, devkit과 production carrier의 thermal 차이(255행), USB camera 복사(243행), container L4T release 일치(169행)는 실무 관점이다. 그 밖의 절은 14·38·104·148·158·194·225행처럼 "확인해야 합니다"·"달라집니다"로 끝난다. |
| B | 12 | 라인업 → JetPack → 가속기 → nvpmodel → DLA → zero-copy → VPI → DeepStream → Isaac ROS → container → Tensor core → 함정으로 넓게 훑는다. VPI 예제 123행과 WMMA 예제 183~186행이 `...`로 끊겨 완결되지 않는다. |
| C | 6 | 명령은 일반적인 것뿐이고, 측정 절(194~201행)은 기록 항목 표만 있다. 148행은 8 camera × 30 fps 같은 수치를 "별도 벤치마크로 확인해야" 한다고만 적는다. |
| D | 7 | DLA 코드(79~85행)·fallback 함정(227~234행)은 12-04 194~200·293~300행과, nvpmodel 블록(67~73행)은 12-07 83~95·165~172행과, DeepStream pipeline(136~146행)·USB camera 함정(236~243행)은 12-09 179~188·305~307행과 겹친다. 인접 세 글과 반복이 많다. |
| E | 7 | 제목의 Nano·Xavier·Orin·Thor·JetPack·DLA·VPI를 모두 다룬다. 깊이는 고르지 않다. |
| F | 7 | 268행 다음 편(zero-copy)이 seriesOrder 145와 맞고, 203행 본문 링크와 관련 항목 세 개(272~274행)가 내용과 맞는다. |
| G | 2 | 26행 표 머리에 "NVIDIA 발표"라고 출처를 밝히고 43~45행에 JetPack 6.x·CUDA 12·TensorRT 10을 적었지만 링크·확인 날짜가 없다. 커밋 `26c1f131`의 대조 기록은 factcheck에만 반영했다. |

uncertainties:
- 34행 Thor 2070 FP4 TFLOPS·40~130 W, 31~32행 Super 수치는 대조 시점 이후 변경 여부 미확인.

병합 대상: Jetson 글을 허브로 두고 `part12-04-tensorrt.md`의 DLA 절, `part12-07-thermal.md`의 nvpmodel·jetson_clocks 절을 한 곳으로 모으는 부분 병합 후보다. 다음 조치는 중복 절을 한쪽에만 남기고 이 글에는 SKU 선택 기준을 보강하는 것이다.

### part12-09-zero-copy-camera.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 17 | export와 import 두 방향을 구분한 45행, CUDA가 DMA-BUF fd를 바로 받지 않아 EGLImage로 등록한다는 119행, `uvcvideo`가 URB payload를 복사하는 이유(307행), IOMMU·CMA 제약(299행), NV12를 `sampler2D`로 읽을 때의 증상(303행)은 다른 입문 자료에서 보기 어려운 판단이다. 14·252행은 완곡 표현이라 20점대는 아니다. |
| B | 15 | V4L2 export → EGL import → CUDA → capture loop → NVMM → libcamera → DRM → shader → 측정 → 함정까지 이어지고, 88·234행에서 코드의 한계(2-plane, `handles[1]`)도 밝힌다. |
| C | 9 | 실제 ioctl 순서(55~86·141~173행)와 세 구성을 비교하는 gst 명령(258~265행)이 있다. 측정 표(267~272행)는 방법만 있고 결과가 없다. |
| D | 11 | NVMM gst pipeline(179~188행)과 USB camera 함정(305~307행)이 12-08 136~146·236~243행과 겹친다. 나머지 DMA-BUF 경로는 이 글만의 역할이다. |
| E | 6 | 제목의 "NPU 직결"은 다루지 않는다. 168행 `inference_on_dma_fd`는 빈 함수 이름이고, 실제 import 예는 EGL·CUDA·DRM뿐이다. |
| F | 5 | 다이어그램(28행)과 다음 편 안내(328행, seriesOrder 146)는 맞지만 334행 라벨 "1-04: Device Tree"가 `part7-03-device-tree-basics`를 가리켜 번호가 틀렸다. |
| G | 1 | 커널·JetPack 버전과 1차 출처 링크가 본문에 없다. 커밋 `26c1f131`의 대조 기록은 factcheck에만 반영했다. |

uncertainties:
- 63행은 `num_planes = 2`로 형식을 정하는데 142~163행 QBUF·DQBUF는 `.length = 1`이다. 88행 설명과 함께 보면 1-plane 형식을 전제한 것으로 보이나 코드끼리 맞지 않는다.
- 99·102행 pitch 1920은 stride padding이 없는 경우만 성립한다.

### part12-10-on-device-llm.md

앵커 글이다. 점수와 근거는 `docs/adsense-audit/anchors.md` 4절을 옮겼다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 18 | Llama 3 8B 구성으로 KV cache를 직접 계산하고(222~232행) GQA 효과를 설명한다. 116행 deprecated·현재 API 대응, 320행 mmap 효과 구분. 14·20·270행 완곡 표현 때문에 20점대는 아니다. |
| B | 16 | 메모리 예산부터 함정까지 별도 검색 없이 따라갈 수 있다. 핵심 질문(8 GB 보드 context 길이)의 답이 270행 "달라집니다"로 끝난다. |
| C | 10 | 빌드 옵션(77~86행), 현재 `llama.h` API 생성 루프(118~160행), `llama-bench` 절차(255~258행)가 있다. 실측 tok/s는 없다. |
| D | 13 | 12-03과 INT4 설명이 일부 겹치지만 KV cache·chat template·llama.cpp 도구에 집중해 역할이 분명하다. |
| E | 7 | 제목의 "NPU Backend"는 63행 표 한 칸과 66행 한 문장뿐이다. |
| F | 7 | 46행 내부 안내, 333행 다음 편(TF-M)이 seriesOrder 147과 맞는다. 전제 지식 안내는 없다. |
| G | 3 | 본문에 저장소 URL(73행)과 `include/llama.h`(116행)만 있고 빌드 번호·대조 날짜가 없다. |

uncertainties:
- 95행 Hugging Face 파일 경로, 304행 CLI 기본값, 317행 `--load-mode`, 211행 `mlx-community` 저장소 이름의 현재 상태 미확인.

### part12-11-tfm-trustzone.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 18 | NSC veneer 전환 단계(39~44행), 현재 TF-M build가 SPE만 만들고 `api_ns`로 내보낸다는 설명(71행), ITS와 PS의 저장 매체·rollback 차이(119·130행), IPC와 SFN partition 차이(216행), `--security-counter`로 downgrade를 막는 조건(339행)이 구체적이다. 14·18·101행은 완곡 표현이다. |
| B | 16 | 규제 배경 → 구조 → build → Crypto·ITS·PS·Attestation → client·partition → MCUboot → SAU → 인증 등급 → 함정으로 완결된다. 측정 절(272~280행)은 항목만 있다. |
| C | 9 | 플랫폼·profile을 지정한 build 명령(65~68행), 산출물 경로(71행), `imgtool sign` 전체 옵션(232~239행), manifest(172~191행)가 있다. 실행 출력과 TF-M 버전이 없다. |
| D | 8 | `rtos/practical-internals/part4-11-trustzone-tfm.md`가 NSC veneer 순서(89~110행), PSA key handle 원칙, attestation 코드(209~225행, 이 글 134~147행과 거의 같음), secure boot chain, PSA Certified 등급을 이미 다룬다. build 산출물·ITS/PS·custom partition·imgtool은 이 글만의 내용이다. |
| E | 8 | 제목의 Cortex-M33 TF-M·TrustZone·Secure Firmware·PSA·MCUboot를 모두 다루고 대상 독자(18행 connected MCU)가 분명하다. |
| F | 7 | 361행 다음 편(Matter·Thread)이 seriesOrder 148과 맞고, 관련 항목 세 개(365~367행) 라벨·대상이 맞는다. 220행이 flash 주소가 예시임을 먼저 밝힌다. |
| G | 3 | 규정 번호와 시행일(20~22행), 저장소 URL(62행)이 있다. TF-M 버전과 PSA 명세 링크가 없다. |

uncertainties:
- 20~22행 규제 시행일, 286~293행 PSA Certified 등급 설명은 대조 시점 이후 변경 여부 미확인.

### part12-12-matter-thread.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 17 | commissioning 7단계(165~171행), multi-fabric 추가 절차와 `SupportedFabrics`(177~184행), OTA cluster 흐름(204~212행), 평균 전류로 배터리 수명을 추정하는 식(240행), 한 칩 Wi-Fi·802.15.4 공존(252행), SDK 기본 fabric 한도(268행)가 구체적이다. 14·46·161행은 완곡 표현이다. |
| B | 16 | 구조 → Thread → OpenThread → SED → SDK build → cluster handler → ESP-IDF → commissioning → multi-fabric → BR → OTA → 진단 → 함정까지 완결된다. 측정 절(230~238행)은 항목만 있다. |
| C | 8 | OpenThread 초기화(54~84행), SDK build 명령(105~113행), neighbor 진단 코드(216~224행)가 있다. 실행 결과와 SDK 버전이 없고 240행 식도 예제 값으로 계산하지 않았다. |
| D | 13 | 공개 글 중 Matter를 다루는 다른 글은 없다. 212행이 OTA 설치를 12-11의 MCUboot로 넘겨 역할을 나눈다. |
| E | 6 | description(5행)이 "Matter 1.3/1.4"와 "한 번에 모든 ecosystem에 등록"을 약속하지만 본문에는 Matter 버전 설명이 없고, 14·48행은 ecosystem 지원 범위를 따로 확인하라고 한다. |
| F | 6 | 다음 편 안내가 없다(seriesOrder 149는 PCIe → CXL). 212행의 앞 편 참조는 맞지만 288행 관련 항목 "Edge Inference"는 이 글 내용과 연결이 약하다. |
| G | 2 | 저장소 URL(106행), 예제 경로(120행), cluster ID(204행), SDK 매크로(268행)는 있으나 Matter 명세·SDK 버전이 없다. |

uncertainties:
- 184·268행 "spec은 최소 5개", 268행 `CHIP_CONFIG_MAX_FABRICS` 기본 16, 204행 cluster ID `0x0029`·`0x002A`는 대조 시점 이후 변경 여부 미확인.
- 190행 Border Router 제품 목록은 모델별 차이를 본문도 인정한다.

### part11-15-pcie-to-cxl.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 레이어·프로토콜·Type 표(22~50행)는 CXL 입문 설명이다. 고유한 부분은 CEDT 부재(114~116행), sysfs 기능별 커널 버전(118~120행), degraded mode와 alternate protocol negotiation(122~124행) 함정이다. 68행 Flex Bus arbitration은 "일반화할 수 없습니다"로 끝난다. |
| B | 11 | 제목이 약속한 cache coherency를 어떻게 얹는지(snoop·bias·coherence 흐름)는 설명하지 않는다. 37행 CXL.cache 한 줄과 58~66행 flit 예시가 전부다. |
| C | 7 | `lspci`·sysfs·`cxl list` 명령과 DVSEC 출력 예(80~82행)가 있으나 77행 출력은 자리표시자이고 실행 환경이 없다. |
| D | 4 | 세 프로토콜 표(34~38행, 비유 열까지)·Type 표(46~50행)·"CXL.io는 모든 디바이스 필수" 문장(40행)·RD-V2 설명(96행)이 `performance-engineering/part3-11-cxl-interconnect.md` 37~86행과 거의 같다. `hardware/hbm/chapter09-cxl-mem.md`도 같은 질문을 다룬다. |
| E | 6 | 제목 "같은 PHY 위 cache-coherent 프로토콜 추가" 가운데 PHY 공유와 세 프로토콜은 다루지만 coherency 추가 방식은 다루지 않는다. |
| F | 8 | 18행이 전제 글(Ch 125 PCIe BAR)을 밝히고, 135행 다음 편(Ch 150)이 seriesOrder 150과 맞으며, 관련 항목 다섯 개(139~143행)의 라벨·번호가 대상과 맞는다. |
| G | 4 | 본문이 Arm RD-V2 Technical Overview(96행), 커널 ABI 문서와 기능별 버전(120행), CXL 3.1 spec 절 번호(124행)를 직접 인용한다. 링크와 확인 날짜는 없다. |

uncertainties:
- 30행 "같은 케이블·같은 connector"는 PCIe 슬롯·커넥터를 뜻하는지 불분명하다.
- 54행 제목 "시분할"과 56행 "동시에 흐릅니다"는 표현이 엇갈리지만 flit 다중화를 달리 적은 것으로 보고 오류로 보지 않았다.

병합 대상: `performance-engineering/part3-11-cxl-interconnect.md`. 프로토콜·Type 설명은 PE 3-11로 모으고, 이 글은 호스트 인식 함정(114~124행)과 루프 16의 QEMU·드라이버 글로 넘어가는 입구 역할로 줄이는 방안을 검토한다. 독립 유지라면 다음 조치는 coherency 메커니즘을 보강하는 것이다.

### 시리즈 공통 문제

- 다음 편 안내·관련 글 라벨이 틀렸다(F 5점 이하): `part12-04-tensorrt.md`(313, 317~320행), `part12-05-tflite-micro.md`(365~366행), `part12-06-onnx-runtime.md`(335, 342~343행), `part12-09-zero-copy-camera.md`(334행). Part 12 글이 옛 번호 체계("6-01", "1-04")를 라벨에 남겼다. 루프 16의 `part11-17-linux-cxl-driver.md` 165행도 다음 편 안내가 틀렸다.
- 측정 절이 기록 항목 표뿐이고 결과가 없다: `part12-07-thermal.md`(178~188행), `part12-08-jetson.md`(194~201행), `part12-09-zero-copy-camera.md`(256~274행), `part12-11-tfm-trustzone.md`(272~282행), `part12-12-matter-thread.md`(230~238행). 같은 "측정 / 성능 비교" 뼈대가 내용 없이 반복된다.
- 출처·환경 없는 구체 측정값: `part12-04-tensorrt.md`(224~246행), `part12-05-tflite-micro.md`(276~291행), `part12-06-onnx-runtime.md`(223~231행).
- 핵심 판단을 "측정합니다"·"확인해야 합니다"로 대신한 문장: `part12-05-tflite-micro.md`(191·242·353행), `part12-06-onnx-runtime.md`(248·313행), `part12-07-thermal.md`(20·45행), `part12-08-jetson.md`(104·148·194행). git 이력의 `Qualify …` 커밋과 시기가 겹친다.
- 본문에 1차 출처·버전이 없다(G 2점 이하): `part12-04`, `part12-05`, `part12-06`, `part12-07`, `part12-08`, `part12-09`, `part12-12`.
- Jetson 군 인접 글끼리 같은 절을 반복한다: DLA 코드·함정(`part12-04` ↔ `part12-08`), nvpmodel·jetson_clocks(`part12-07` ↔ `part12-08`), NVMM pipeline·USB camera(`part12-08` ↔ `part12-09`). 개별 수정 전에 어느 글이 각 주제를 맡을지 먼저 정해야 한다.
