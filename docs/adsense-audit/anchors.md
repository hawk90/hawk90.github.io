# AdSense 루브릭 앵커 글

> 루브릭 버전: 1.2 (`docs/adsense-audit/rubric.md`)
> 작성일: 2026-10-11
> 대상: Modern Embedded Recipes 4편 (`src/content/blog/embedded/modern-recipes/`)

## 목적과 사용법

이 문서는 루브릭 v1.2 4-0절의 채점 앵커다. v1.1 채점이 59~84점에 몰리고 E가 거의 9점이었던 문제를 막기 위해, 실제 글 네 편을 A~G 항목별로 채점하고 근거를 이 글의 heading·줄 번호로 남겼다.

새 글을 채점할 때는 항목마다 아래 앵커 중 가장 가까운 글의 근거와 비교해 점수를 정하고, 비교한 앵커 파일명을 `anchor_ref`에 적는다. 앵커는 점수 구간을 보여 주는 기준이지 모범 글이 아니다. 앵커 점수를 바꾸면 루브릭 버전을 올린다.

줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 판정은 앵커 작성 뒤 루브릭 3-1절에 추가된 "원문 내부 오류" 규칙을 반영했다. factcheck 상태는 git 이력으로 정했다. `part12-10`만 커밋 `cc3c64ee`에서 llama.cpp upstream과 대조한 기록이 있고, 나머지 세 편은 출처 없는 `Qualify …` 커밋만 거쳤다. 평가 중 1차 자료를 직접 가져와 대조하지 않았으므로 `오류 확인`은 주지 않았고, 의심은 `uncertainties`에 적었다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `part1-04-uart-hardware.md` | 10 | 11 | 6 | 11 | 5 | 5 | 1 | 49 | 오류 확인 | 우선 조치 (점수 구간: 병합 검토) |
| `part6-09-isr-api.md` | 10 | 8 | 4 | 8 | 6 | 3 | 1 | 40 | 미검증 | 병합 검토 |
| `part7-05-kernel-build.md` | 9 | 10 | 8 | 10 | 4 | 7 | 2 | 50 | 미검증 | 병합 검토 |
| `part12-10-on-device-llm.md` | 18 | 16 | 10 | 13 | 7 | 7 | 3 | 74 | 검증됨 | 보강 |

공통 필드: 네 편 모두 `score_status: 잠정`, P0 없음(확인 범위는 원문 본문·내부 링크 대상 존재 여부까지이고, 렌더링·광고 배치는 보지 않았다). 80점 이상 앵커는 아직 없다. 다른 시리즈에서 80점대 글이 나오면 상단 앵커로 추가한다.

## 1. part1-04-uart-hardware.md — 49점, 우선 조치

`confidence: 중간`. 개념 교과서 수준의 글이 어디에 놓이는지 보여 주는 하단 앵커다.

`factcheck: 오류 확인` — 51행 코드는 정수 나눗셈으로 BRR 729(약 115226 baud, 오차 약 0.02%)를 쓰는데, 같은 줄 주석은 "실제 730 = 115068, 오차 0.11%"라고 적었다. 원문만으로 성립하는 산술 불일치라 루브릭 3-1절에 따라 `오류 확인`이고, 판정은 총점과 무관하게 `우선 조치`다. 점수 자체는 구간 비교용으로 그대로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 프레임·oversampling·parity 표(26~66행)는 어느 UART 입문서에나 있는 내용이다. 이 글만의 것은 baud별 전송 시간 표와 라인 길이별 권장 baud 표(116~128행)인데 둘 다 출처가 없다. 46행 "±2.5%는 … 경험적 기준일 뿐 보편적인 보장값은 아닙니다", 70행 "데이터시트에서 깊이와 trigger level을 확인해야 합니다"는 구체 주장을 완곡 표현으로 바꾼 문장이라 일반론으로 본다. |
| B | 11 | 개념 → 코드 → 측정 → 함정 → 정리 흐름은 완성됐다. description이 약속한 "RS-232 레벨"은 128행 표 한 칸("RS-232 또는 RS-485 변환 필요")뿐이고, DMA TX 예제(104~112행)는 stream·channel 선택과 완료 처리가 빠져 그대로는 동작을 판단할 수 없다. |
| C | 6 | 레지스터 수준 코드는 있지만 실행 환경이 없다. 51행은 84 MHz APB(F4 계열 값), 73행은 STM32H7 FIFO, 88·93행은 `ISR`/`TDR` 레지스터(H7·L4 계열 이름)라 한 보드에서 재현되는 코드가 아니다. 142행은 logic analyzer로 baud를 재라고만 하고 절차·예상 파형이 없다. |
| D | 11 | 1-04는 회로 원리, 10-05 `uart-not-printing`은 진단 절차라 역할은 갈린다. 다만 함정 절(132~142행 TX/RX 교차, baud mismatch)이 10-05의 Step 2·3·6과 겹친다. |
| E | 5 | 제목이 "동작 분석"을 약속하지만 본문은 개념 소개 수준이다(루브릭 E 주석: 3~5점). description의 RS-232 레벨은 다루지 않는다. |
| F | 5 | 다음 편 안내(160행 SPI)는 실제 seriesOrder 5와 맞다. 그러나 167행 "Practical RTOS Internals: ISR latency" 링크가 ISR latency 글이 아니라 `00-preface`로 간다. 링크 설명이 틀린 경우라 5점 이하 규칙을 적용했다. |
| G | 1 | 출처 링크가 하나도 없고, 대상 MCU·reference manual 판이 없다. 코드가 여러 STM32 계열을 섞어 쓴다(C 근거와 같음). |

`uncertainties`:
- 42행 "start edge 후 8 sample 후부터 시작"과 majority vote 위치의 구체 동작은 제조사 문서로 확인하지 않았다.
- 54행 "내부 RC ±1~2%", 123~128행 라인 길이별 권장 baud는 출처 없는 수치다.

## 2. part6-09-isr-api.md — 40점, 병합 검토

`confidence: 중간`. 주제는 좋지만 코드 결함 의심과 틀린 내비게이션이 겹친 경우의 기준이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | reentrant·SPSC ring·FromISR·BASEPRI·printf 회피는 RTOS 입문 자료의 표준 목록이다. "자동차 ISR — 최소 처리"(137~157행)가 유일한 고유 예제인데, 157행은 "실제 허용 시간은 시스템 측정으로 정합니다", 195행은 "규칙을 확인하고"로 구체 기준 대신 완곡 표현을 둔다. |
| B | 8 | 절마다 코드 한 조각과 한두 문장이다. SPSC ring(75~101행)에 메모리 순서·barrier 언급이 없고, deferred work 예제(117~133행)는 ISR과 task가 `rx_pending`을 함께 쓰는 race를 설명하지 않는다. 한계가 빠졌으므로 5~9 구간이다. |
| C | 4 | 실행 조건·예상 결과가 없고, 예제 일부는 그대로 쓰면 문제가 될 수 있다(아래 uncertainties). 측정·검증 절차가 없다. |
| D | 8 | Lock-free ring 절(75~101행)은 9-01 `lock-free-ring`의 주제를 앞당겨 다루고, FromISR·critical section은 4-05 `interrupt-handling`, 6-04·6-06과 겹친다. 이 글만의 질문은 "ISR-safe 함수 조건" 표(19~24행) 정도다. |
| E | 6 | 제목·description·본문이 같은 패턴 목록을 향한다. "설계"라는 말에 비해 선택 기준은 없다. |
| F | 3 | 256행 "다음 편은 Lock-Free Ring Buffer"인데 seriesOrder 72는 Priority Inversion 글이다. 260행 "1-06: JTAG·SWD"는 `part10-02`로, 261행 "2-02: Lock-Free Ring"은 `part9-01`로 가서 번호가 틀렸고, JTAG 글은 주제와도 무관하다. |
| G | 1 | 출처·FreeRTOS 버전·대상 코어 표기가 없다. 73행 "Cortex-M에서 32-bit aligned word access가 자동으로 atomic"도 Architecture Reference Manual 인용이 없다. |

`uncertainties`:
- 65행 `isr_counter++; /* atomic on 32-bit */`: 증가는 load-modify-store라 단일 접근만 atomic이라는 73행 설명과 맞지 않는다. ARMv7-M ARM으로 확인하지 않았다.
- 117~131행: task가 `rx_pending = 0`을 쓰는 사이 ISR이 증가시킬 수 있고, 256에 도달하기 전 task가 처리하지 않으면 `rx_buffer` 범위를 넘을 수 있다.
- 145행: `CAN->RDLR >> (i*8)`를 `dlc`가 8까지 반복하면 상위 4바이트는 RDHR에 있어야 한다(bxCAN 레지스터 배치 미확인).
- 189행: `configMAX_SYSCALL_INTERRUPT_PRIORITY`를 다시 shift하는 형태가 FreeRTOS 포트 정의와 맞는지 미확인.
- 113행 "Zephyr도 ISR variant를 분리", 245행 `atomic_load_64`의 존재 여부 미확인.

## 3. part7-05-kernel-build.md — 50점, 병합 검토

`confidence: 중간`. 재현 가능한 명령은 있으나 측정 칸을 완곡 표현으로 비운 글의 기준이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | defconfig → menuconfig → build → install 흐름(26~31행)은 커널 문서와 같은 내용이다. 고유한 부분은 vendor BSP 태그 예(59행)와 `INSTALL_MOD_PATH` 사고 함정(226~232행)이다. 측정 표(171~186행)는 칸 전체가 "환경별 측정"·"config에 따라 측정"이라 정보가 없다. |
| B | 10 | 받기부터 패키징까지 기본 흐름은 끝까지 간다. 제목의 zImage는 185행 표 한 칸뿐이고, description의 "KBuild 전 과정"에 비해 Kbuild Makefile 설명은 `obj-m` 한 줄(115행)이다. |
| C | 8 | 실제 명령·경로·산출물 위치(35~41행, 93~97행)와 vermagic 오류 출력(208~213행)이 있어 8~11 구간이다. 결과 측정은 없고, 241행 "ccache로 70% 이상 단축"은 167·175행의 "측정합니다"와 서로 어긋난다. |
| D | 10 | out-of-tree module 절(111~132행)의 Makefile과 `KDIR=/work/linux-bsp modules` 명령이 7-06 `kernel-module` 66~86행과 거의 같다. 나머지 빌드·패키징 부분은 역할이 구별된다. |
| E | 4 | 제목이 "Image·zImage"를 내걸지만 본문은 arm64 `Image`만 다루고 zImage는 설명이 없다. description의 "KBuild 전 과정"도 과장이다. 주제 자체는 맞으므로 2점 이하까지는 내리지 않았다. |
| F | 7 | 26~31행 단계 목록이 아래 코드 절과 1:1로 대응해 긴 명령 나열의 방향을 잡아 준다. 132행 본문 링크와 244행 다음 편 안내(7-06)가 실제 seriesOrder 80과 맞고, 관련 항목 다섯 개가 모두 커널·rootfs 글로 내용과 맞는다. |
| G | 2 | 커널 v6.6과 vendor 태그 `imx_5.15.71_2.2.0`(56·59행)으로 버전은 적었지만, Kbuild 문서 같은 1차 출처 링크가 없다. |

`uncertainties`:
- 129행: out-of-tree Makefile에 `modules` 타깃이 없는데 `make … KDIR=… modules`로 호출한다. 기본 타깃 `all`을 의도했는지 미확인.
- 138행: arm64 cross build인데 산출물 이름을 `_amd64.deb`로 적었다.
- 99행 "8 코어에서 8~15분", 241행 "70% 이상"은 출처·환경 없는 수치다.
- 200~202행은 산문을 `text` 코드 블록에 넣었다(가이드 §5 위반 후보, 점수 외).

## 4. part12-10-on-device-llm.md — 74점, 보강

`confidence: 높음`. 1차 자료 대조를 거친 글 중 가장 높은 앵커다. 측정 결과와 본문 출처가 없어 80점에 못 미친다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 18 | Llama 3 8B의 32 layer·KV head 8·head_dim 128로 KV cache를 직접 계산하고(222~232행) GQA가 1/4로 줄이는 이유를 설명한다. 116행은 deprecated API 이름과 현재 이름을 짝지어 주고, 320행은 mmap이 load 속도·page 공유를 돕지만 총 메모리는 줄이지 않는다고 구분한다. 14·20·270행은 완곡 표현이라 20점대는 주지 않았다. |
| B | 16 | 메모리 예산 → 빌드 → CLI → C API → server → quantize → MLX → template → 벤치 → 함정까지 별도 검색 없이 따라갈 수 있다. "8 GB 보드에서 몇 k context가 되는가"라는 핵심 질문의 답은 270행에서 "달라집니다"로 끝난다. |
| C | 10 | 빌드 옵션(77~86행), 현재 `llama.h` API로 쓴 생성 루프(118~160행), `llama-bench`의 pp·tg를 따로 기록하라는 절차(255~258행)가 있다. 실제로 잰 tok/s는 없어 12점 이상은 아니다. C 코드는 `prompt` 선언이 없는 조각이다. |
| D | 13 | 12-03 `quantization`과 INT4 설명이 일부 겹치지만, 이 글은 LLM 고유의 KV cache·chat template·llama.cpp 도구에 집중해 역할이 분명하다. |
| E | 7 | 제목·description·본문이 같은 질문을 향한다. 제목의 "NPU Backend"는 63행 표 한 칸과 66행 한 문장(Hexagon)뿐이라 9점 이상은 아니다. |
| F | 7 | 46행이 아래 "Context length·KV cache 계산" 절을 직접 가리키는 글 고유의 내부 안내가 있다. 333행 다음 편(TF-M)은 seriesOrder 147과 맞고 관련 항목도 Edge AI 파트 글이다. 전제 지식 안내는 없다. |
| G | 3 | upstream 대조 기록(커밋 `cc3c64ee`)은 factcheck에만 반영했다. 본문에는 저장소 URL(73행)과 `include/llama.h`(116행) 언급만 있고, llama.cpp 빌드 번호·대조 날짜가 없어 "현재 API"가 언제 기준인지 알 수 없다. |

`uncertainties`:
- 95행 Hugging Face 파일명(`Phi-3-mini-4k-instruct-q4.gguf`)이 지금도 같은 경로에 있는지 미확인.
- 304행 CLI 기본값(temperature 0.8, top-p 0.95)과 317행 `--load-mode` 옵션은 대조 시점 이후 upstream 변경 여부 미확인.
- 211행 `mlx-community/Llama-3-8B-Instruct-4bit` 저장소 이름 미확인.
