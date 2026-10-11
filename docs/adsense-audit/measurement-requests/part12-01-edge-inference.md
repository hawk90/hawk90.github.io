# 작성자 측정 요청 — `part12-01-edge-inference.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part12-01-edge-inference.md`
> - 작성: 2026-10-11, AdSense 개선 파일럿 루프 2차 (최종 점수 79, 상태 `split_proposed`)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어에서 잰 값과 기록이 있어야 오른다. 아래 항목을 측정해 주면 글에 넣는다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 측정값은 작성자가 직접 잰 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. 실제 보드·실제 모델로 첫 측정 프로그램(Stage별·end-to-end latency) 실행: capture/pre/infer/post/action 평균과 e2e 평균·최악값, 그리고 V4L2 timestamp 기준 e2e

- **준비:** 보드 한 대를 고정합니다. 후보는 표에 이미 있는 Jetson Orin Nano 8GB Super(JetPack 버전, `nvpmodel -q`로 본 power mode, `jetson_clocks` 적용 여부)나 Raspberry Pi 5 + AI HAT+(Pi OS 버전, HailoRT 버전)입니다. 카메라는 V4L2 장치 하나(모델명, 해상도, fps, pixel format NV12)입니다. 모델은 공개 모델 하나로 고정합니다(예: YOLOv8n 또는 SSD-MobileNet ONNX, 입력 크기, 정밀도 INT8/FP16, 런타임과 버전: TensorRT·ORT·HailoRT). 컴파일러 버전과 커널 버전도 적습니다.
- **절차:** 1) 글의 stand-in `preprocess/inference/postprocess`를 실제 함수(NV12→RGB resize·정규화, 런타임 호출, NMS·threshold)로 바꿉니다. 2) `t_start`를 글의 `v4l2_ts_ns()`로 바꾼 빌드와 `now_ns()` 그대로인 빌드 두 개를 만듭니다. 3) 각 빌드를 같은 보드에서 5회 이상 실행하고(`FRAMES`=200 이상, `WARMUP`=10), 실행 사이에 보드 온도가 안정되도록 둡니다. 4) `uname -a`, `cat /etc/nv_tegra_release` 또는 `cat /etc/os-release`, `nvpmodel -q`, 런타임 버전 출력을 함께 저장합니다.
- **기록할 것:** 실행별 stdout 원문(stage별 avg ms, e2e avg/worst ms) 5회 이상, 그 5회에서 뽑은 최악값의 최댓값, `*soe` 값(SOE/EOF), V4L2 timestamp 기준 e2e와 capture() 시작 기준 e2e의 차이(= driver 대기열 등 시간), 환경 표(보드, OS/JetPack, power mode, clock 고정 여부, 모델·입력·정밀도·런타임 버전, 카메라).
- **글에 넣을 위치:** "Stage별·end-to-end latency 측정" 절의 읽는 순서 bullet 바로 뒤에 '측정 환경' 표 + 실행 출력 블록 + 설계값(10·30·5 ms)과의 비교 한 문단. "`t_start`를 V4L2 timestamp로 바꾸기" 절 끝에 두 시작점의 e2e 차이 한 줄. 정리의 pipeline bullet에 '설계값 대신 실측 시 직렬이 30 fps를 통과/실패했는지' 한 줄.
- **오르는 항목:** C: 현재 '관찰 결과 없음'으로 약 10점 상한 → 재현 절차 + 관찰 결과 + 환경으로 8~11 상단, 여러 회 최악값·환경 차이까지 적으면 12~15 구간. A: 설계값 셈이 실제 모델에서 맞는지/어긋나는지라는 이 글만의 결과가 생겨 13~19 상단 근거.

## 2. 3-stage pipeline(pipe.c)을 같은 보드에서 실제 stage로 실행해 backpressure와 latest-wins의 interval·latency·dropped·buffers를 공식 표와 대조

- **준비:** 위 항목과 같은 보드·모델·카메라·버전. pipe.c의 `sleep_ms(PRE_MS/INF_MS/POST_MS)`를 실제 stage 함수로 교체한 판과, stand-in 그대로의 판 두 가지(stand-in 판은 대상 보드에서만 실행 — 개발용 노트북 출력은 쓰지 않는다는 기존 결정 유지). `POOL`=5와 `-DPOOL=4`.
- **절차:** 1) `pipe_bp`, `pipe_latest`를 대상 보드에서 각각 5회 실행. 2) 마지막 줄의 stage busy 평균을 글의 식(backpressure 간격 I, 지연 3I+Q / latest-wins 지연 P+(0~P)+I+Q)에 넣어 예측값을 계산. 3) `-DPOOL=4` 빌드도 한 번 돌려 `pool waits`가 0이 아니게 되는지 확인. 4) 직렬 측정(항목 1) 결과와 같은 표에 놓기.
- **기록할 것:** 실행별 stdout 원문 전체(captured/results/dropped, interval avg, latency avg/worst, buffers max in use, pool waits, stage busy avg), 식 예측값 vs 측정값 표, POOL=4에서의 `pool waits` 값, 최악값이 평균에서 얼마나 벗어났는지.
- **글에 넣을 위치:** "구조로 셈한 처리량과 지연" 표에 '측정 간격'·'측정 지연(avg/worst)' 열 추가와 어긋난 값에 대한 한 문단. "Buffer는 몇 개면 되나" 절 끝에 POOL=5/4의 `buffers`·`pool waits` 관찰. "자주 보는 함정"의 'Inference 구간만 재고 끝냄'의 65 ms를 측정 지연 − 측정 infer로 바꾸고, 그 차이가 mailbox 대기(2I)와 Q로 이루어진다는 것을 측정 busy 값으로 보임.
- **오르는 항목:** C: 공식과 관찰을 같은 실행에서 대조 — 8~11의 '관찰 결과' 충족, 환경 차이·트레이드오프(버리는 frame 수 실측)까지 있으면 12~15. A: latest-wins가 실제로 몇 frame을 버리는지라는 선택 기준 근거. L675 issue(65 ms의 정체)도 측정으로 해소.

## 3. ONNX Runtime EP fallback의 실패 모양을 실제로 관찰: TensorRT EP가 받은 node 수와 CPU로 넘어간 node 수, 그에 따른 inference stage 시간 차이

- **준비:** Jetson Orin Nano(또는 보유 Jetson), JetPack 버전, onnxruntime-gpu 버전(Jetson용 wheel), TensorRT 버전. 모델 두 개: TensorRT가 전부 받는 모델 하나와 TensorRT 미지원 operator가 끼어 있는 모델 하나(어떤 op인지 명시).
- **절차:** 1) `providers=['TensorrtExecutionProvider','CUDAExecutionProvider','CPUExecutionProvider']`, `trt_dump_subgraphs=True`로 세션 생성. 2) `SessionOptions.log_severity_level=0`(verbose)로 node 배정 로그 저장. 3) 같은 모델을 CPU EP만으로, CUDA+CPU로, TRT+CUDA+CPU로 각각 항목 1의 측정 틀에 넣어 inference stage 평균·최악값을 잼. 4) 덤프된 subgraph 파일 수·크기 확인(`ls -l`).
- **기록할 것:** EP별 node 배정 수(로그 발췌), 덤프된 subgraph 수, 세 provider 구성별 inference avg/worst ms, 세션 생성 시간(첫 실행 engine build 포함 여부 구분), 모든 버전 문자열.
- **글에 넣을 위치:** "프레임워크 선택"의 '실패 모양' bullet 뒤에 '관찰' 소절: 로그 발췌(코드 블록, 출력만)와 구성별 시간 표.
- **오르는 항목:** C: 실패 사례를 명령·환경·결과로 기록 — 12~15 기준('실패·트레이드오프·환경 차이')에 직접 해당. A: '세션은 도는데 가속기는 일부만 받는다'를 자기 측정으로 보인 이 글만의 결과로 20~25 쪽 근거('실패 사례·선택 기준').

## 4. Orin에서 sparse·dense 칸 차이를 실제 모델로 확인: trtexec sparsity on/off

- **준비:** Jetson Orin(Nano Super 또는 AGX), JetPack·TensorRT 버전, 2:4 structured sparsity로 prune한 공개 모델(예: NVIDIA가 배포한 sparse 체크포인트, 출처 링크)과 같은 모델의 dense 판. INT8(또는 FP16) 정밀도.
- **절차:** 1) `trtexec --onnx=model.onnx --int8 --sparsity=disable` 와 `--sparsity=enable`(또는 force)로 각각 engine 빌드·실행, `--verbose`로 sparse 대상 layer 로그 저장. 2) dense 모델에도 `--sparsity=enable`을 줘서 eligible layer가 0개인 경우를 확인. 3) 각 경우의 GPU compute 시간(mean/median/P99)과 throughput을 기록.
- **기록할 것:** trtexec 요약 블록(Throughput qps, GPU Compute Time mean/median/percentile), verbose 로그 중 sparse eligible/selected layer 목록 발췌, 네 조합(sparse 모델·dense 모델 × on·off) 표, 버전과 power mode.
- **글에 넣을 위치:** "Sparse·dense 칸을 같은 기준으로 맞추기" 절 끝: '같은 모델에서 sparsity를 켜고 끈 측정' 표. 이 측정이 TensorRT 문서의 조건(Ampere 이후, Conv/MatMul, FP16·INT8)을 실제로 보여 주므로 B issue(L177) 보강과 같이 둠.
- **오르는 항목:** C: 공개 TOPS 비교를 실측 trade-off로 바꿈(12~15). A: 'sparse 칸은 모델이 조건을 맞출 때만'이라는 선택 기준을 자기 결과로 뒷받침.

## 5. Device에서 cloud까지의 접속망 구간 실측: 실제 uplink에서 가장 가까운 region까지 RTT와 1080p frame 업로드 시간(비압축·압축)

- **준비:** 실제 설치 환경에 가까운 네트워크 하나(유선 LAN, LTE/5G 라우터 등 종류·통신사·요금제 속도 명시), 대상 보드, Azure Korea Central(또는 실제 쓸 cloud region)에 띄운 작은 VM 하나. 측정 날짜·시각.
- **절차:** 1) 보드에서 VM까지 TCP RTT를 `hping3 -S -p 443` 또는 `curl -w '%{time_connect}'`로 1,000회, 시간대 두 번 이상. 2) 3,110,400 B 비압축 NV12 파일과, 같은 frame을 보드 인코더로 H.264 압축한 파일을 `curl -T`로 업로드하며 `time_total` 기록. 3) `iperf3 -c <vm> -R` 없이 정방향(uplink)으로 실효 속도 측정.
- **기록할 것:** RTT P50/P99/최대, 실효 uplink Mbit/s, 비압축·압축 frame 업로드 시간 P50/P99, 압축 frame 크기(B), 인코더 stage 시간(항목 1 측정 틀로).
- **글에 넣을 위치:** "Cloud 경로에 더해지는 것" 절의 Azure 표 아래(현재 '접속망 구간은 들어 있지 않습니다'라고 적은 자리)에 '접속망 실측' 표, 업로드 표에 '실측' 열 추가. 결정 표 첫 줄 판정을 이 숫자로 한 번 적용.
- **오르는 항목:** C: 계산용 가정값(10 Mbit/s·100 Mbit/s·1 Gbit/s)을 실측으로 보강 — 환경 차이 기록으로 12~15. A: 공개 backbone 값 + 자기 접속망 값을 합친 판단은 다른 글과 구별되는 결론.

## 6. Ethos-U55(Alif E7) NPU에서 실제 추론 cycle과 시간 측정, Vela 추정치와 대조 — 공개 GOPS·clock 의문(46 GOPS)과 MCU 등급 거리를 자기 데이터로 확인

- **준비:** Alif Ensemble E7 DevKit 또는 AppKit(보드 rev), Alif SDK/CMSIS pack 버전, TFLM 커밋, Vela 5.2.0. 작은 INT8 모델(예: MLPerf Tiny의 person detection 또는 keyword spotting, 출처 링크). 두 NPU(256 MAC, 128 MAC 쪽) 각각.
- **절차:** 1) `vela model.tflite --accelerator-config ethos-u55-256` 및 `ethos-u55-128`로 컴파일, 요약 출력(추정 cycle, NPU에 올라간 op 비율) 저장 — 이 단계는 PC에서 가능. 2) 보드에서 같은 모델을 각 NPU로 실행하며 Ethos-U PMU cycle counter와 Cortex-M55 DWT CYCCNT(또는 SysTick)로 추론 구간을 동시에 잼. 3) NPU cycle ÷ 벽시계 시간으로 NPU clock을 역산, SDK의 clock 설정 코드도 같이 기록. 4) NPU 없이 CMSIS-NN만으로 같은 모델 실행.
- **기록할 것:** Vela 요약 블록, NPU PMU cycle 수, 벽시계 ms, 역산한 NPU clock(MHz)과 SDK 설정값, NPU별·CMSIS-NN 추론 시간 표, 모델 정확도 변화 없음 확인(출력 일치 여부).
- **글에 넣을 위치:** "MAC 수를 TOPS로 바꾸는 계산" 절: '페이지만으로는 clock을 알 수 없다'는 문장 뒤에 실측 clock과 추론 시간. 162배 추정은 실제 같은 모델의 E7 vs Orin Nano(항목 1) 추론 시간 비로 대체하거나 병기. 하드웨어 등급 표의 E7 '(MCU 등급)' 설명을 실제 사용한 core(M55)와 NPU 연결로 구체화.
- **오르는 항목:** C: 공개 사양 산술 대신 같은 모델의 등급 간 실측 비교(12~15). A: 'MCU 등급은 더 느린 Jetson이 아니다'를 자기 측정으로 보여 20~25 쪽 근거. Alif 값 dense/INT8 가정(L173 issue)과 E7 tier 문제(L131)도 실측 맥락으로 정리 가능.

## 7. 추론 중 소비 전력 실측: 표의 '공식 표기' 옆에 실제 보드의 idle/추론 전력과 inference당 에너지

- **준비:** Jetson Orin Nano Super: `tegrastats`의 VDD_IN(power mode별, `nvpmodel -m` 번호 명시). Raspberry Pi 5(+AI HAT+): USB-C PD 인라인 전력계(모델명) 또는 `vcgencmd pmic_read_adc`(펌웨어 버전). Alif E7: 보드의 전류 측정 점퍼 + 전류계(모델명).
- **절차:** 1) idle 60 s 평균. 2) 항목 1의 실제 모델 추론 루프를 60 s 이상 돌리며 평균·최대 전력. 3) 같은 구간의 처리 frame 수로 inference당 mJ 계산. 4) Jetson은 power mode 두 개 이상 반복.
- **기록할 것:** 보드·모드별 idle W, 추론 평균/최대 W, 처리 fps, mJ/inference, 측정 장비와 샘플링 간격, 주변 온도.
- **글에 넣을 위치:** "네 질문 다음에 볼 것"의 '전력' bullet과 하드웨어 등급 표 아래에 '실측 전력' 표(공식 표기와 분리). Raspberry Pi 5 '5 V/5 A는 소비 전력이 아님' 문장 옆에 실제 소비값.
- **오르는 항목:** C: 공식 표기 전력의 한계(입력 규격·칩 typical)를 실측으로 메움, 환경 차이 기록(12~15). A: 전원 예산으로 등급을 거르는 선택 기준에 자기 데이터.

## 8. 글의 결정적(deterministic) 프로그램을 대상 툴체인에서 실행한 출력: 출하/디버그 빌드 `nm` 차이, check.sh 결과, store-and-forward 실행 결과

- **준비:** 대상 보드 또는 그 cross toolchain(aarch64 gcc/clang 버전), 글의 코드 그대로.
- **절차:** 1) `cc -c -O2 result.c -o release.o`, `cc -c -O2 -DFRAME_DUMP result.c -o debug.o`, 각 `nm` 출력 저장. 2) `sh check.sh release.o; echo $?`, `sh check.sh debug.o; echo $?`. 3) store-and-forward 프로그램 실행 출력 저장(produced/sent/folded 줄 포함). 4) `sizeof(count_result_t)` 출력.
- **기록할 것:** nm 출력 두 개, check.sh 두 결과와 exit code, store-and-forward stdout 전체, sizeof 값, 컴파일러 버전.
- **글에 넣을 위치:** "원본이 나갈 길을 빌드에서 막기"의 `nm` 블록 뒤와 check.sh 설명 뒤, "끊긴 동안의 결과"의 마지막 줄 설명 앞에 출력 블록.
- **오르는 항목:** C: '예상 결과'가 없는 예제에 관찰 결과를 붙여 4~7 수준 예제를 8~11 기준으로 올림. 타이밍이 아니라 결과가 환경과 무관하므로 노트북 출력 제외 결정과도 충돌이 적음. A 기여는 작음.
