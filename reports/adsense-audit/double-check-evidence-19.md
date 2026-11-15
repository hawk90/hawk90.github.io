# 초벌 근거 대조 — 공개 루프 19

목적: Sol 최종 검토용 저비용 근거 대조. 이 문서는 최종 점수·오류 판정이 아니며 원문은 수정하지 않았다. 대상 10편 전체 본문을 `nl -ba`로 읽고, D의 비교 원문과 F의 실제 링크 대상을 확인했다. 출처가 필요한 사양·성능 수치 및 실행 여부는 미확정으로 표시한다. `Modern Embedded Recipes` 글은 점수 대상 집합에서는 제외되지만 D의 비교 대상으로는 허용된다.

기준은 rubric v1.2, anchors.md, antipatterns.md다. 공개 여부는 각 대상 frontmatter의 `draft: false`; 시리즈 순서는 `seriesOrder`를 기준으로 확인했다. 기존 판정 기록은 `reports/adsense-audit/published-loop-19.md`다.

## 1. `part2-06-cache-miss.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part2-06-cache-miss.md`; 읽은 구간: 1–276행 전체(앞선 작업에서 원문 전문 재열람 완료).
- A–G 대조: A(17–94, 98–129, 141–217) 기본 3C 설명과 PMU/예시 혼재; 차별화 근거는 있으나 문턱값·일반론의 출처가 불명. B(13–268) 전체 흐름은 있으나 168/174행 working-set 계산과 127–135행 conflict 설명이 동시에 성립하는지 재검산 필요. C(98–113, 165–204) 명령과 코드만 있고 측정 환경·결과 미제공. D(141–163, 187–204)의 주제 중첩을 실제 대응 구간과 대조했고 아래 기재. E(2, 5, 17–122, 141–217) 세 miss·분석을 약속하나 진단 절차가 얕고 후반 범위가 확장됨. F(270–276) 다음 편/관련 링크 라벨을 확인. G(1–276) 외부 근거 링크 없음.
- D 대조: 본문 false-sharing 141–163 ↔ 같은 시리즈 `part4-02-false-sharing.md` 17–20 및 142–156행(캐시라인 격리 설명/queue padding 코드), `part2-07-cache-line.md` 65–79행. Prefetch 187–204 ↔ `part2-07-cache-line.md` 132–157행. Tiling 165–185 ↔ `part6-02-gemm-optimization.md` 112–125행. 3C 전제/예고는 `part2-05-cache-basics.md` 273행. 다른 시리즈 Recipes 비교도 허용 범위. 중복 정도의 최종 평가는 보류.
- F 실대상: 270행 next Cache Line은 공개 `part2-07-cache-line.md`(order 15); 274–276행 라벨과 대상(order 13/15/16)을 확인. 274행 다음의 짧은 설명은 2-05가 prerequisites라는 안내이며 대상과 모순 없음.
- 기존 factcheck 사유(168/174행 working-set 산술 및 127–135행 conflict 일반화): 원문 내부 산술·조건 모순 후보로 3-1 내부 검산 근거는 있음. 단, 배열 수·캐시 set 매핑 조건 명시가 불완전하므로 각 사례별 확정 여부는 Sol 검토 필요. 1차 자료/실행: 용량 산술은 직접 검산 가능; conflict 재현은 특정 캐시 구성·정책을 명시한 코드 실험이 필요하며 TRM 확인도 권장.
- 추가 확인: malloc 정렬, Cortex-A53 PMU event, cache 정책 및 prefetcher 수치, `#define B` 코드 치환/선언 문제는 표준·TRM·컴파일 확인 전 추측 금지.

## 2. `part2-07-cache-line.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part2-07-cache-line.md`; 읽은 구간: 1–287행 전체.
- A–G: A(38–237) 폭넓은 기법 나열, 고유 근거는 prefetch와 M7 DMA 사례. B(161–166, 202–220, 248) MEMCTL 설명/코드 불일치 및 struct 크기 미완료는 원문에서 확인되나 하드웨어 사양은 미검증. C(59, 81, 143–157, 176, 202–220) 재현 환경·결과 없음. D(65–81, 83–130, 132–157, 184–226) 여러 글과 겹치는 구간을 비교. E(2, 5, 38–237) 제목·description 주제는 다루되 주변 절 비중 큼. F(282–287) 링크 대조 완료. G(1–287) 근거 링크 없음.
- D 대조: 이 글 prefetch 132–157 ↔ `part2-06-cache-miss.md` 187–204 및 거리 가정 2-06 202행; 다른 문맥의 2-06 98–107행 PMU 언급. False sharing/SPSC 65–81, 184–198 ↔ `part4-02-false-sharing.md` 142–156 및 Recipes `part8-03-cache-alignment.md` 66–95행. SoA/hot-cold 83–130 ↔ Recipes `part8-03-cache-alignment.md` 99–142. DMA cache 절 200–226 ↔ Recipes `part4-10-dma-basics.md` 67–74행. Recipes는 허용된 D 비교 대상.
- F 실대상: 282행 다음 Memory Bandwidth는 공개 `part2-08-memory-bandwidth.md`(order 16); 286행 2-06 및 287행 2-08 대상·라벨 확인.
- 기존 factcheck: 내부 모순으로 명시된 사항 없음. 161/164행 레지스터와 코드 부조화는 factcheck 확정이라기보다 원문 명세 확인 대상. ARM TRM/CMSIS/컴파일러 문서 확인 필요.
- 확인 필요: STNP/non-temporal 의미, MEMCTL·CCR 비트, MVE/캐시 라인 관련 API·구조체 정렬을 공식 문서로 대조.

## 3. `part2-08-memory-bandwidth.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part2-08-memory-bandwidth.md`; 읽은 구간: 1–226행 전체.
- A–G: A(19–175) 다수 플랫폼/사례 소개, 주요 고유 근거는 RPi 수치이나 환경·출처 미기재. B(39–44, 59–85, 166–175) 산술과 측정 절의 재현성 검토. C(37–42, 77–85) 결과는 있으나 실험 환경/버전 미기재. D(55–85, 166–175) 아래 비교 대조. E(2, 5, 21–33, 55–85, 89–150) 약속된 STREAM/Roofline/Bus 측정은 제한적으로 다뤄짐. F(221–226) next 대상 확인. G 외부 출처 없음.
- D 대조: NT store 166–175 ↔ `part2-07-cache-line.md` 168–181; Roofline 55–64 ↔ `part1-07-modeling.md` 53–97; BUS event 측정 77–85 ↔ `part3-02-bus-contention.md` 117–130; DTCM 103행 ↔ `part2-05-cache-basics.md` 201–202; HBM 비교는 `hbm/chapter05-bandwidth-bottleneck.md` 19, 74–103행. 본문 전문/비교 범위 확인.
- F 실대상: 221행 next SIMD/NEON은 공개 `part2-09-simd-neon.md`(order 17); 225–226행 관련 링크 2-07/2-09 확인.
- 기존 factcheck 사유: 44행 `1600 MB/s × 2 = 12.8 GB/s`는 산술상 불일치(1600×2=3200 MB/s); 같은 행의 산출 설명과 39행 실측·215행 정리 비율도 서로 다름. 이 자체는 3-1 내부 계산으로 확정 가능한 오류 후보. 다만 39행 측정값의 진위/실험 설정 및 rad-hard SRAM 서술(218행)은 원문만으로 확정할 수 없어 1차 자료 필요. 사양 claim은 실행보다 데이터시트/STREAM 출처가 필요.

## 4. `part2-09-simd-neon.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part2-09-simd-neon.md`; 읽은 구간: 1–267행 전체.
- A–G: A(30–34, 56–76, 92–108, 120–155, 186–196) SIMD 코드와 설명의 차별화 정도를 비교. B(120–127, 164–197, 230–238) 측정/꼬리 처리 설명 확인. C(164–176, 222–233) 재현 환경·결과 부족. D(30–34, 186–196, 230–238) Recipes 대응 코드 대조. E(17–160) 제목/description 항목의 본문 위치 확인. F(262–267) next·링크 확인. G 외부 공식 문서 링크 없음.
- D 대조: scaling 예 30–34 ↔ Recipes `part8-07-simd.md` 55–59; 4-accumulator 186–196 ↔ 같은 Recipes 185–196; tail 예 230–238 ↔ Recipes 245–252. 같은 시리즈 인접 글 `part2-08` 및 `part2-10`은 겹침 근거가 약하다고 기록됐으나 최종 D는 보류.
- F 실대상: 262행 next PMU는 공개 `part2-10-pmu.md`(order 18); 266–267행 2-08(order16)/2-10(order18) 라벨 확인.
- 기존 factcheck: 오류 확인은 미검증으로 남긴 판단에 동의. 233행 N=10, i=8 표기는 process_4가 8–11 범위라는 해석과 주석의 “tail 2” 설명이 충돌 후보이나, loop index가 4씩 증가하는 실제 코드 전문·주석 의미를 먼저 대조해야 함. 121–126행 MVE tail 접근/133행 predication 주장은 API semantics issue라 내부 모순로 확정하지 말고 Arm 공식 intrinsic 문서와 코드 컴파일/실행 확인 필요. A78/X1 SVE claim은 primary-source 확인 전 미확정.

## 5. `part2-10-pmu.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part2-10-pmu.md`; 읽은 구간: 1–262행 전체.
- A–G: A(17–73, 75–101, 103–207) 일반 표준/도구 설명과 고유 WCET 예의 비중, 출처 없는 threshold를 재확인. B(75–101, 114–125, 197–207, 243–245) 흐름은 완결되나 event 표의 누락 BRANCHES, CPI/Top-Down 정의 및 ISR 측정법 불명확. C(26–34, 57–71, 107–122, 147–164) 코드·명령은 있으나 플랫폼·버전·기대 출력 없음. D는 아래. E(2, 5, 75–101, 128–151) 진단/분석 주장에 비해 해석 사례 부족. F(257–262) 다음 편 설명 mismatch. G(1–262) 공식 출처 링크 없음.
- D 대조: PMU 기본 23, 33, 38–51, 197–207 ↔ `part1-03-measurement.md` 122–141; perf event usage ↔ `part2-03-measurement-tools.md` 161–170; Cortex-M DWT/CPI ↔ `part5-01` 45–57, 90행; cycle measurement ↔ `part5-02` 46–50; WCET ↔ `part5-07` 182–184. 다른 시리즈 Recipes `part8-12` 59–61 및 tools/perf-flamegraph chapter01 16,20도 비교 가능(단 draft 상태 비교는 중복도 판단과 구분).
- F 실대상: 257행의 후속 `Compiler & Optimization`, 262행 비링크 “3-01: Compiler 최적화 단계”는 실제 공개 order 19인 `part3-01-bus-architecture.md`와 불일치. 261행 2-09는 공개 order 17 대상 확인. 실제 다음 글의 제목/설명은 Bus Architecture이며 Compiler 문구와 맞지 않음.
- 기존 factcheck: 21행·event 표 수와 114행 DWT 표현 등은 공식 사양/용어 문제여서 본문만으로 오류 확정하지 않음. 77–93행 임계값, 166행 overhead, M-class counter 및 U74 event IDs, `mcycle` width/multiplex semantics는 ARM/RISC-V/Sifive 문서·perf 매뉴얼 확인 필요. 199행 12개 대 202행 이벤트 나열 개수도 직접 재계산은 가능하지만, “12개 측정 희망”과 예시 7개 사이의 사실 모순인지 서술상 예시인지 확인 질문으로 남김.

## 6. `part3-01-bus-architecture.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part3-01-bus-architecture.md`; 읽은 구간: 1–235행 전체.
- A–G: A(17–27, 33–119, 155–197) 명세 요약과 고유 STM32 사례를 확인. B(17–27, 79–128, 144–153) 내부 APB 설명 불일치 후보 및 측정 절의 빈약함 재확인. C(144–153) 지표만 제시되고 수행 절차/관측값 없음. D 3-02 및 Recipes AXI 비교 구간 아래 확인. E(2, 5, 17–27, 33–77, 132–153) AXI/AHB/APB 비중과 ACE/CHI의 간략 서술 확인. F(230–235) 다음 편/링크 검증. G 외부 spec 링크 없음.
- D 대조: AXI handshake 37, 61행 ↔ Recipes `part11-04-axi.md` 대응 handshake 32, 44행; outstanding 94–103 ↔ Recipes 147–162; 4KB boundary 203–205 ↔ Recipes 100–103, 120; ID/deadlock 207–211 ↔ Recipes 164–175, 229–231; QoS 186 ↔ Recipes 176–191. contention 181–186 ↔ `part3-02-bus-contention.md` 51–60. 이 비교는 실제 쌍의 범위를 열어 대조.
- F 실대상: 230행 next Bus Contention은 공개 `part3-02-bus-contention.md`(order 20); 234–235행 링크 2-10/3-02 대상 확인.
- 기존 factcheck: APB가 21행 “단일 사이클”인데 123–126행 setup/access 두 cycle 및 219행 “2-cycle”이라고 한 것은 원문 내 직접 진술 충돌. 다만 spec 의미상 APB wait state를 포함하는 실제 전송 주기 설명이 필요하므로 AMBA APB 명세로 확정/정정할 것. ARLEN 88 vs 116행 flexible 1–256은 AXI 버전 차이 또는 표기 예일 수 있어 원문만으로 오류 확정 불가. ARM AMBA 명세와 RM0433/TRM 확인 필요.

## 7. `part3-02-bus-contention.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part3-02-bus-contention.md`; 읽은 구간: 1–274행 전체.
- A–G: A(17–115, 145–227, 231–267) 정책·시나리오·해결책은 다루지만 일부 가상 레지스터/수치의 근거 없음. B(89–143, 145–178, 180–202) 측정 방법은 짧고 STM32 bus 구성 설명 간 일치 여부 확인 필요. C(117–143) 단일 perf 명령과 예시값 외 실행 환경/기대 출력 없음. D는 3-01 및 Recipes AXI와 비교. E(2, 5, 89–143) starvation 측정·BUSY counter 약속이 본문과 정확히 대응하는지 확인. F(269–274) 다음 글 대상 검증. G 출처 링크 없음.
- D 대조: 이 글의 QoS 51–74, 237–245 ↔ `part3-01-bus-architecture.md` 179–186 및 Recipes `part11-04-axi.md` 177–190. STM32 bus matrix 이 글 76–87 ↔ `part3-01` 155–177. Starvation/regulator는 고유 가능성이 있어 중복 판단 유보. Recipes 비교 허용.
- F 실대상: 269행 next DMA Performance는 공개 `part3-03-dma-performance.md`(order 21); 273–274행 3-01/3-03 링크 대상 확인.
- 기존 factcheck: “Slave 6, master 7” 및 “4 simultaneous”는 같은 파일 180–199행의 다이어그램/목록과 202행 4배 설명을 함께 보면 불일치 후보이나, 다른 STM32 세대/구성 가능성 때문에 RM0433 확인 전 확정 금지. CCI-400 master/slave 수, QoS latency-based behavior, event IDs/utilization 식, HAL API는 TRM/RM/API 문서 및 실행 필요.

## 8. `part3-03-dma-performance.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part3-03-dma-performance.md`; 읽은 구간: 1–275행 전체.
- A–G: A(17–61, 63–179, 181–229) DMA 사용 주제는 넓고 상투 절과 특화 주제가 섞임. B(27–61, 73–125, 181–202, 231–260) 설명은 있으나 break-even 모델의 부호/결론이 일치하는지 재확인. C(29–59, 75–88, 113–179, 181–202) 예제 일부 의사코드/미정의 식별자, 성능값 무환경. D 아래. E(2, 5, 27–179) 제목·description 키워드 위치 확인하나 chain·성능 측정 깊이는 약함. F(270–275) 후속 링크 대상 검증. G 외부 primary 링크 없음.
- D 대조: DMA break-even 181–202 ↔ `part3-04-dma-vs-cpu.md` 35–76; cache maintenance 129–148 ↔ Recipes `part4-10` 66–73; stack buffer 233–244 ↔ Recipes `part4-10` 59–64; misalignment 150–161 ↔ Recipes `part8-03-cache-alignment.md` 244–249. 같은 시리즈 `part6-04` 126행에 주제 사례 언급. 양쪽의 정확한 현재 원문을 확인했으며 같은 주제/series 중복은 사실 오류와 분리.
- F 실대상: 270행 next DMA vs CPU는 공개 `part3-04-dma-vs-cpu.md`(order 22); 274–275행 3-02/3-04 대상 확인.
- 기존 factcheck: 193–198행 모델의 `50+N = .5N`은 양의 break-even이 불가능한데 202행은 >256 byte면 DMA가 유리하다고 단정, 같은 글 안에서 조건/모델이 충돌한다. 185행 ~5 cycle 및 193행 .5 cycle/byte로 256 B는 ~128 CPU cycles여서 189행 setup overhead 문장도 숫자와 모순 후보. 직접 계산 가능한 부분은 3-1 근거가 될 수 있지만 하드웨어별 setup 수치는 RM/API/실측 확인이 필요. 기존 report가 오류 확인 1건으로 묶은 사유를 확정치로 복제하지 않고 Sol이 최종 판단할 것.

## 9. `part3-04-dma-vs-cpu.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part3-04-dma-vs-cpu.md`; 읽은 구간: 1–295행 전체.
- A–G: A(17–76, 78–131, 133–183) 비교 프레임은 있으나 기준 수치/라이브러리 주장 출처 확인 필요. B(35–76, 185–211, 224–288) 손익 계산 및 실측 재현성 문제 확인. C(25–33, 41–53, 185–211) 측정 코드 있지만 실행 보드/컴파일러/결과 일부 칸 미완성. D 아래. E 제목의 실측/break-even size와 55행 결론 간 간극. F(290–295) 다음 대상 확인. G 외부 출처 없음.
- D 대조: `part3-03-dma-performance.md` 181–202 ↔ 이 글 35–59행; 두 글의 상수와 계산을 직접 맞춰 봄(3-03 193–198 vs 3-04 47, 53–55). part3-05는 주제 겹침 없음. Recipes `part4-10`의 DMA 관련 189행 언급도 비교 가능.
- F 실대상: 290행 next Interrupt Latency는 공개 `part3-05-interrupt-latency.md`(order 23); 294–295행 3-03/3-05 링크 대상 확인.
- 기존 factcheck: 49행은 25–31행 표와 53행의 N/3 모델에 비추어 200 cycles를 ~60 bytes라 한 대응은 내부 산술 불일치 후보; 283행 요약도 반복. 단, 표·공식의 실측 조건이 없으므로 “표현끼리 계산이 안 맞음”과 “실제 Cortex-M4 성능 오답”을 분리한다. Cortex-M4 benchmark, DDR3/STM32H743 조합, 30fps/frame 수치는 공식 데이터시트 또는 실험 필요. 148행 산출식은 해상도/byte format 조건을 물어볼 사항.

## 10. `part3-05-interrupt-latency.md`

- `source_file`: `src/content/blog/embedded/performance-engineering/part3-05-interrupt-latency.md`; 읽은 구간: 1–244행 전체 및 `public/images/blog/perf-eng/diagrams/part3-05-tail-chaining.tex` 원본 27행 라벨 확인.
- A–G: A(17–57, 79–188) 표준 기법과 수치표, FreeRTOS/GIC 사례. B(32–46, 59–77, 110–121, 143–185) tail/chaining 근거가 그림·정리 위주이며 측정 코드에 setup/실행보장 부족. C(19–26, 59–77, 145–185) 환경·결과 미기재. D 아래. E(2, 5, 17–57) promised subtopics의 실제 위치/깊이 대조. F(239–244) 후속 편 확인. G 외부 출처 링크 없음.
- D 대조: Cortex-M entry/tail 32–42 ↔ Recipes `part2-04-cortex-m-exceptions.md` 67–73 및 102–104, RTOS `practical-internals/part1-05` 127–138. 이 글 156–167 IRQ storm 회피 ↔ 같은 시리즈 `part3-06-interrupt-storm.md` 30–49 및 85–133. DWT/latency 측정과 FreeRTOS 예산은 이 글의 고유 역할 후보. 정확한 중복량 판단은 Sol에 유보.
- F 실대상: 239행 next Interrupt Storm은 공개 `part3-06-interrupt-storm.md`(order 24); 243–244행 3-04/3-06 링크 대상 확인.
- 기존 factcheck: 오류 확인 사유는 미검증으로 둔 기존 판정에 동의. 19–26행 변환 및 147–150행 산술은 내부 계산으로 점검할 수 있으나 MCU 별 예외/표준 대조는 ARM TRM 필요. 36행의 “50% 효율”과 그림 라벨 30→6 cycle은 효율 정의/그림의 대상이 달라 보일 수 있어 모순 확정 금지. 119–121 동시 pending, late-arrival 코어 범위, DWT 코드가 실제 IRQ latency만 재는지, FreeRTOS/GIC 수치는 CMSIS/ARM Guide/FreeRTOS port 문서와 target 실행 확인이 필요.

## 보존 및 최종 검토 유의사항

- 이 문서만 추가했다. 원문 글·정식 loop report 및 사용자 수정 파일(`package.json`, `scripts/adsense-score-loop.mjs`, `embedded-performance-engineering-loop-01.md`)은 수정하지 않았다.
- `published-loop-19.md`의 점수/판정은 검토 대상 기존 결과일 뿐 여기서 새 최종 평가로 복제하거나 확정하지 않았다.
- 점검 범위 밖: 외부 공식 문서를 통한 사양 검증, 코드를 실제 target/compiler에서 실행, 시각 렌더링 및 광고/검색 적격성.
