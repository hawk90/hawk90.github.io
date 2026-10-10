# Modern Embedded Recipes — 전체 AdSense 평가 요약

> - 기준: 루브릭 v1.2 (`docs/adsense-audit/rubric.md`), 앵커 `docs/adsense-audit/anchors.md`
> - 재평가일: 2026-10-11. v1.1 점수(2026-10-10)는 각 루프 보고서에 참고 기록으로 남아 있다
> - 대상: 공개 글 152편 (`seriesOrder 0~151`), 루프 16개
> - 원칙: 원문 수정·비공개·삭제·URL 변경 없음. 모든 점수는 `잠정`

## 결론

v1.2로 다시 평가한 152편의 점수는 40~74점, 평균 53.1점이다(v1.1 평균 75.1점). `유지`·`검증 대기`는 0편, `보강` 22편, `병합 검토` 93편, `우선 조치` 37편이다. P0 정책 차단 요소는 확인되지 않았다.

가장 큰 발견은 정확성이다. **37편(24%)이 외부 자료 없이 원문만으로 증명되는 오류**(같은 글 안의 수치·동작 모순, 산술 오류, 코드와 주석 불일치)를 갖고 있고, 이 37건은 채점에 참여하지 않은 검증자가 원문을 인용해 모두 다시 확인했다(아래 "검증 결과"). v1.1은 정확성을 채점하지 않아 이런 글에도 75~80점을 줬다. 1차 자료와 대조한 기록이 있는 글은 10편뿐이고, 2026-10-09~10의 `Qualify …` 커밋은 출처 없이 표현만 완곡하게 바꿨다. 그 결과 본문은 일반론이 되고 정리 절에는 옛 단정이 남아 서로 어긋나는 글이 많다.

따라서 다음 작업은 개별 글 보강이 아니라 **오류 수정 → 시리즈 구조 결정 → 측정표·출처 정리** 순서다. 점수는 내부 우선순위이며 Google의 공식 점수나 승인 확률이 아니다.

## v1.1과 v1.2의 차이

| 항목 | 만점 | v1.2 평균 | v1.1 평균 |
| --- | ---: | ---: | ---: |
| A 독창성 | 25 | 11.9 | 17.2 |
| B 완결성 | 20 | 12.2 | 16.4 |
| C 실전성 | 15 | 6.8 | 10.2 |
| D 중복 | 15 | 9.5 | 11.0 |
| E 검색 의도 | 10 | 6.4 | 8.9 |
| F 탐색성 | 10 | 5.2 | 8.4 |
| G 출처 | 5 | 1.2 | 2.9 |
| 합계 | 100 | 53.1 | 75.1 |

하락은 주로 C·E·F·G에서 났다. v1.2는 목차·이전/다음 글·저자 소개 같은 템플릿 요소에 F·G 점수를 주지 않고, 완곡 표현과 빈 측정표를 일반론으로 보며, 틀린 다음 편 안내·관련 글 라벨을 감점한다(루브릭 v1.2 개정 사유). 표준편차는 4.8에서 6.9로 넓어졌다.

## 판정 분포

| 판정 | 편수 | 의미 |
| --- | ---: | --- |
| `우선 조치` | 37 | 원문만으로 증명되는 오류. 총점과 무관하게 먼저 고친다 |
| `병합 검토` | 93 | 40~59점이거나 다른 글과 거의 같다. 병합 대상 또는 `병합 대상 없음`과 다음 조치를 루프 보고서에 적었다 |
| `보강` | 22 | 60~79점. 허브 글(`00-preface.md`)은 점수와 무관하게 여기에 둔다 |
| `검증 대기` | 0 | 80점 이상이지만 fact-check 기록 없음 |
| `유지` | 0 | 80점 이상이고 검증됨 |
| `제외 검토` | 0 | 40점 미만 |

| factcheck | 편수 | 비고 |
| --- | ---: | --- |
| `검증됨` | 10 | 2-03, 4-14, 11-15~11-17, 12-08~12-12. 커밋 본문에 1차 자료 기록. 평균 63.8점 |
| `오류 확인` | 37 | 원문 내부 오류. 아래 표 |
| `미검증` | 105 | 출처 없는 `Qualify …` 커밋만 거침 |

## 검증 결과 (2026-10-11)

루프 채점 뒤 다음 세 가지를 따로 검증했다.

1. **`오류 확인` 전수 검증.** 처음 기록된 44건을 채점에 참여하지 않은 검증자 4명이 원문 두 위치를 인용해 다시 판정했다(2건은 직접 확인). 맞음 37건, 애매 7건, 틀림 0건이었다. 애매 7건(`part2-10-memory-barrier.md`, `part3-07-c-runtime.md`, `part4-01-first-baremetal.md`, `part6-07-event-group.md`, `part9-02-wait-free.md`, `part9-03-rcu-basics.md`, `part11-05-ps-pl-communication.md`)은 완곡한 본문과 단정적 정리의 충돌, 산문 개수 오기, 외부 지식이 필요한 판단이라 루브릭 3-1에 따라 `미검증`으로 내리고 점수 구간대로 판정했다. 근거는 각 루프 보고서에 `uncertainties`로 남겼다.
2. **블라인드 재채점.** 루프마다 1편, 16편을 기존 점수를 보지 않은 평가자가 다시 채점했다. 총점 차이는 평균 2.9점(치우침 +0.3), 4점 이내 일치 13/16편, 판정 일치 13/16편이었다. 항목별 차이는 D(중복)가 평균 2.0점으로 가장 컸고 나머지는 1.4점 이하였다. D 차이가 큰 두 편(`part12-08-jetson.md` +8, `part11-17-linux-cxl-driver.md` +10)은 원래 평가자가 적은 중복 대응(12-08 ↔ 12-07 nvpmodel 블록, 11-17 ↔ CXL 4.0 Internals Ch 11 region 생성 단계)을 원문에서 확인해 원래 점수를 유지했고, 루브릭 D에 "비교한 글을 파일명으로 적지 않으면 미산정" 규칙을 추가했다.
3. **요약 수치 대조.** 이 문서의 표와 수치는 루프 보고서의 v1.2 표에서 스크립트로 계산했다.

## 우선 조치 37편

모두 같은 글 안의 두 위치를 근거로 기록했고 위 검증에서 맞음으로 확인됐다(세부는 루프 보고서). 수정할 때는 1차 자료로 올바른 값을 정하고, 확인하지 못하면 문장을 지운다. 완곡 표현으로 바꾸지 않는다.

| 파일 | 루프 | 점수 | 오류 |
| --- | ---: | ---: | --- |
| `part1-04-uart-hardware.md` | 01 | 49 | 51행 BRR 주석(730)과 코드 값(729) 불일치 |
| `part1-05-spi-hardware.md` | 01 | 46 | 35행 "UART의 두 배"의 근거(full-duplex)를 123행 표가 부정 |
| `part1-07-adc-principles.md` | 01 | 54 | 24-bit "실제 90 dB"와 ENOB 17~21 표(104~128 dB) 불일치 |
| `part1-09-pwm-signal.md` | 01 | 46 | 37행과 76행의 PWM mode 1 극성 설명이 반대 |
| `part1-10-can-electrical.md` | 02 | 49 | BTR 1+13+2=16 TQ로는 437.5 kbps, 500 kbps 아님 |
| `part1-12-lvds-differential.md` | 02 | 45 | USB 3.x·MIPI를 CML/LVDS와 분리(70행)했다가 묶음(104·158행) |
| `part2-04-cortex-m-exceptions.md` | 02 | 41 | "5~6 cycle 절약"과 표(12+12 vs 6) 불일치, EXTI0 priority 2와 "0~3은 고정 예외" 표 충돌 |
| `part2-06-arm-cache.md` | 02 | 45 | `aligned(32)`와 64-byte 주석, 완료 후 invalidate 필수 절차를 생략하는 "안전한 패턴" |
| `part2-07-arm-mpu.md` | 02 | 51 | SRD 0x18 제외 범위 끝이 0x27F인데 0x2FF로 적음 |
| `part2-08-arm-mmu.md` | 03 | 49 | fork 시 page table을 복사한다(79행)와 공유한다(81행) |
| `part3-10-map-file-analysis.md` | 04 | 57 | map 예시 구간 0x1dc+0x40이 0x20c와 겹침 |
| `part3-11-make-cmake-cross.md` | 04 | 56 | 변수 치환 결과 `STM32STM32F4` 경로 |
| `part4-03-gpio-driver.md` | 04 | 61 | MODER 0x28000c00 해석: PA5=11, PA9/10=00인데 주석·본문과 다름 |
| `part4-06-systick-timer.md` | 05 | 61 | `delay_ms(0)` 제목(1 ms 대기)과 코드·본문(즉시 반환) 모순 |
| `part4-09-i2c-driver.md` | 05 | 53 | 1-byte read STOP 순서: 본문 규칙과 코드 순서가 반대 |
| `part4-11-low-power-modes.md` | 05 | 48 | 평균 전류 0.3 mA, 같은 글의 식으로는 약 0.4 mA |
| `part4-12-watchdog.md` | 05 | 63 | W=0x50을 wide window라 했으나 예제(0x60)보다 좁음 |
| `part5-07-tft-display.md` | 06 | 53 | 153 KB framebuffer를 128 KB SRAM에서 가능하다고 함 |
| `part5-13-sd-card-fatfs.md` | 07 | 57 | diskio 구현 함수 수 5개(64행)와 4개(325행) |
| `part5-14-rtc-utilization.md` | 07 | 56 | 예시 ms 출력 네 값이 196행 식으로 나올 수 없음 |
| `part6-04-semaphore-usage.md` | 07 | 49 | "약 4바이트 절약"과 80 B vs 4 B 표 |
| `part6-11-timer-services.md` | 08 | 47 | timer wheel level 단위(256 ms·16 s)와 slot 996 산술 오류 |
| `part7-01-linux-boot-flow.md` | 08 | 49 | root mount 주체가 Kernel(30행)과 U-Boot(118행) |
| `part7-08-platform-driver.md` | 09 | 51 | 239행 주석("s 누락")이 코드(`fooo`)를 잘못 설명(경미) |
| `part7-13-irq-affinity.md` | 09 | 53 | `echo $((1<<i))`가 10진수라 hex mask로 잘못 해석됨 |
| `part8-08-neon.md` | 10 | 41 | 루프는 16씩 진행, 계산·저장은 8 lane |
| `part8-11-power-optimization.md` | 10 | 54 | "손댈 축은 두 가지뿐"과 같은 글의 DVFS·V 항 |
| `part8-12-wcet-analysis.md` | 11 | 53 | 측정 13,800 cycle이 "증명된 상한" 11,400보다 큼 |
| `part9-07-spinlock-vs-mutex.md` | 11 | 54 | 206행 표(spinlock이 빠름)와 209행 결론 반대 |
| `part10-06-boot-failure.md` | 12 | 69 | 사례 원인이 보드·빌드 불일치(153행)와 솔더 불량(175행) |
| `part10-09-timing-race-diag.md` | 12 | 63 | 이미 `volatile`인 변수를 원인으로 지목(26·132행) |
| `part10-10-protocol-analyzer.md` | 13 | 61 | 같은 설정의 bit time을 1.5 µs와 2 µs로 적음 |
| `part11-02-vivado-usage.md` | 13 | 60 | "실패 path" 예시의 slack이 양수 |
| `part11-11-hls-optimization.md` | 14 | 44 | 1080p60(124 Mpx/s)을 100 MHz II=1로 처리, latency 8302 cycle |
| `part12-01-edge-inference.md` | 14 | 48 | 0.1 W와 60 W를 "6배"로 적음(600배) |
| `part12-02-npu-architecture.md` | 14 | 43 | 200/10000을 5%로 계산, 역양자화 식이 역연산이 아님 |
| `part12-03-quantization.md` | 14 | 57 | 두 PPL 표의 Δ가 서로 다름 |

## 시리즈 공통 문제

루브릭 5절은 같은 문제가 3편 이상이면 개별 수정 전에 시리즈 구조부터 보게 한다. 반복된 문제는 다음과 같다.

| 문제 | 규모 | 처리 방향 |
| --- | --- | --- |
| 원문 내부 오류 | 37편 | 위 표. Part 1~2는 22편 중 10편, Part 11~12는 5편이라 계산·코드 주석을 묶어 점검한다 |
| 본문에 1차 출처가 없음 | G=1이 135편, 본문 외부 링크가 있는 글 2편 | 주장마다 공식 문서·데이터시트·소스 링크를 붙인다 |
| 측정표가 비어 있음 | 칸을 `측정 필요`·`환경별 측정`·`부품별 상이` 등으로 채운 글 최소 42편(단순 패턴 기준), 루프 보고서 기준으로는 거의 모든 루프 | 실제 측정값을 넣거나 표를 지운다. 측정했다는 문장 아래 빈 표가 있는 경우가 많다 |
| 완곡한 본문과 단정적인 정리의 충돌 | 루프 06·09·10·11 등에서 루프마다 4~8편, 위 애매 7건 포함 | `Qualify …` 커밋이 본문만 바꾸고 정리 절을 남긴 결과다. fact-check로 한쪽을 정한다 |
| 다음 편 안내·관련 글 라벨 오류 | F 5 이하 78편 | 옛 번호 체계(`1-06`, `2-02` 등)와 "더 깊이" 링크가 자매 시리즈 `00-preface`로 가는 문제. 시리즈 전체를 한 번에 고친다 |
| 다른 시리즈와 같은 질문 | RTOS 장 ↔ Practical RTOS Internals, 9장 ↔ Embedded C++·Performance Engineering, 11-03 ↔ PCIe Deep Dive, 11-15~11-17 ↔ Performance Engineering·CXL 4.0 Internals | 어느 시리즈가 깊이를 맡을지 운영자가 정한다. 정하기 전에는 병합하지 않는다 |
| 시리즈 안 반복 | 1-01·1-03·1-06(GPIO 전기 특성), 3-04~3-07(startup 코드), 7-03↔7-04, 8-02↔8-03, 8-07↔8-08, 11-10·11-11·11-13(HLS), 12-04·12-07·12-08·12-09(Jetson) 등 | 병합 후보로 루프 보고서에 기록 |
| 제목·설명의 약속 미이행 | 루프마다 3~8편 (예: 1-01 Setup/Hold, 5-09 BMI270, 7-06 DKMS) | 내용을 채우거나 제목을 본문에 맞춘다(URL 유지) |
| 글 사이의 서로 다른 주장 | MPU attribute 인코딩(2-05·2-06·2-07), hazard pointer가 ABA를 해결하는지(9-04 vs 9-05·9-08) | 1차 자료로 정답을 정한 뒤 해당 글을 함께 고친다 |
| 경험의 진위가 의심되는 사례 | 10-01의 "실제 사례" 날짜(2026-05-16)가 글 날짜(2026-04-19)보다 뒤 | 직접 겪은 사례인지 확인하고, 아니면 예시라고 밝히거나 지운다 |

## 사이트 게이트 (루브릭 9절)

| 게이트 | 상태 | 근거 (2026-10-11) |
| --- | --- | --- |
| 배포·광고·탐색 자동 검사 | 통과 | 2026-10-10 실행: anchor 51건, search/page parity 726건, RSS·sitemap 3/3, 광고 스크립트는 글 페이지만, sitemap·robots 경계 749건 모두 0 finding |
| Search Console 색인·sitemap | 진행 중 | `sitemap-index.xml` 성공, 하위 `sitemap-0.xml`은 "가져올 수 없음"(실시간 테스트는 가져오기 성공). 직접 제출 후 대기 |
| Ads.txt | 통과 | AdSense `hawk90.dev` Ads.txt 승인됨 |
| 같은 도메인의 다른 콘텐츠 | 통과 | revue·metl Pages 종료, `/revue/`·`/metl/` 404 |
| 발행 패턴(scaled content) | 위험 | Recipes 152편의 frontmatter 날짜가 13일에 몰림(하루 최대 14편). 같은 H2 뼈대 하나를 57편이 쓰고, 116편이 5편 이상과 뼈대를 공유한다. 148편 중 109편의 본문이 2026-05-19 한 커밋(`62e5e6fc`)에서 작성됐다 |
| 꾸준한 업데이트 | 확인 필요 | 새 글 발행 리듬이 없다(runbook 5단계) |
| AI·자동화 사용 공개 | 운영자 결정 필요 | Google은 자동화 사용이 독자에게 드러나는지를 묻는다 |
| About·Contact·Privacy·광고 안내 일치 | 확인 필요 | 수동 확인 대상 |

## 처리 순서

1. **우선 조치 37편** — 원문 오류를 1차 자료로 고친다. Part 1~2(10편)와 Part 11~12(5편)는 묶어서 처리한다.
2. **시리즈 구조 결정 (운영자)** — RTOS·lock-free·PCIe·CXL·Jetson 장을 전용 시리즈와 어떻게 나눌지 정한다. 이 결정 전에는 병합·비공개를 하지 않는다.
3. **내비게이션 일괄 수정** — 다음 편 안내와 관련 글 라벨을 시리즈 전체에서 한 번에 고친다(78편).
4. **측정표·출처 정리** — 빈 측정표는 실제 값을 넣거나 지우고, 주장마다 1차 출처를 붙인다. 이 단계가 fact-check를 겸해 `미검증`을 `검증됨`으로 바꾼다. 애매 7건도 여기서 정한다.
5. **병합 검토 93편** — 2번 결정에 따라 병합하거나, `병합 대상 없음`인 글은 보강한다.
6. **재평가** — 같은 루브릭 버전으로 다시 채점한다.

## 루프별 결과

| 루프 | 글 수 | 최저 | 최고 | 평균(v1.2) | 평균(v1.1) | 우선 조치 | 병합 검토 | 보강 | 보고서 |
| ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 01 | 10 | 40 | 54 | 48.5 | 63.9 | 4 | 5 | 1 | [loop-01](./modern-embedded-recipes-loop-01.md) |
| 02 | 10 | 41 | 65 | 49.8 | 71.3 | 5 | 4 | 1 | [loop-02](./modern-embedded-recipes-loop-02.md) |
| 03 | 10 | 40 | 55 | 51.1 | 72.2 | 1 | 9 | 0 | [loop-03](./modern-embedded-recipes-loop-03.md) |
| 04 | 10 | 41 | 67 | 56 | 75.9 | 3 | 4 | 3 | [loop-04](./modern-embedded-recipes-loop-04.md) |
| 05 | 10 | 48 | 67 | 56.8 | 76.3 | 4 | 3 | 3 | [loop-05](./modern-embedded-recipes-loop-05.md) |
| 06 | 10 | 49 | 61 | 57 | 76.2 | 1 | 7 | 2 | [loop-06](./modern-embedded-recipes-loop-06.md) |
| 07 | 10 | 45 | 57 | 50.2 | 73.5 | 3 | 7 | 0 | [loop-07](./modern-embedded-recipes-loop-07.md) |
| 08 | 10 | 40 | 56 | 47.7 | 73.3 | 2 | 8 | 0 | [loop-08](./modern-embedded-recipes-loop-08.md) |
| 09 | 10 | 44 | 57 | 51.5 | 77.1 | 2 | 8 | 0 | [loop-09](./modern-embedded-recipes-loop-09.md) |
| 10 | 10 | 41 | 54 | 49.2 | 77.5 | 2 | 8 | 0 | [loop-10](./modern-embedded-recipes-loop-10.md) |
| 11 | 10 | 42 | 59 | 52.9 | 76.6 | 2 | 8 | 0 | [loop-11](./modern-embedded-recipes-loop-11.md) |
| 12 | 10 | 45 | 69 | 61.8 | 78.2 | 2 | 3 | 5 | [loop-12](./modern-embedded-recipes-loop-12.md) |
| 13 | 10 | 41 | 62 | 54 | 78 | 2 | 6 | 2 | [loop-13](./modern-embedded-recipes-loop-13.md) |
| 14 | 10 | 43 | 57 | 50.1 | 75.7 | 4 | 6 | 0 | [loop-14](./modern-embedded-recipes-loop-14.md) |
| 15 | 10 | 46 | 74 | 58.6 | 78.6 | 0 | 6 | 4 | [loop-15](./modern-embedded-recipes-loop-15.md) |
| 16 | 2 | 60 | 66 | 63 | 83.5 | 0 | 1 | 1 | [loop-16](./modern-embedded-recipes-loop-16.md) |

## 평가의 한계

- 루프 2개씩 서로 다른 평가자 8명이 채점했다. 블라인드 재채점 16편의 차이는 평균 2.9점이지만 표본이 루프당 1편이다. 루프 평균은 47.7(08)~63(16)로 차이가 나며, 표본만으로는 글 품질 차이와 평가자 차이를 완전히 구분하지 못한다.
- 80점 이상 앵커가 없어 상단 구간의 기준이 약하다.
- G는 본문 1차 출처만 세므로 135편이 1점에 모였다. 부품 번호·버전 명시와 출처 링크를 구분하도록 G를 나누는 것은 v1.3 후보다.
- `오류 확인`은 원문 안에서 성립하는 오류만 다룬다. 외부 사실의 오류는 1차 자료 fact-check 전까지 드러나지 않으므로, `미검증` 글에도 오류가 더 있을 수 있다(2-03·4-14는 fact-check에서 각각 10건 안팎이 나왔다).
- P0 확인 범위는 원문 본문과 내부 링크 대상까지다. 렌더링된 광고 배치는 사이트 게이트에서 따로 본다.

## 전체 목록

판정 순서(우선 조치 → 병합 검토 → 보강), 같은 판정 안에서는 점수 오름차순이다.

| 순서 | 판정 | 점수 | v1.1 | factcheck | 파일 | 루프 |
| ---: | --- | ---: | ---: | --- | --- | ---: |
| 1 | 우선 조치 | 41 | 76 | 오류 확인 | `part2-04-cortex-m-exceptions.md` | 02 |
| 2 | 우선 조치 | 41 | 75 | 오류 확인 | `part8-08-neon.md` | 10 |
| 3 | 우선 조치 | 43 | 74 | 오류 확인 | `part12-02-npu-architecture.md` | 14 |
| 4 | 우선 조치 | 44 | 77 | 오류 확인 | `part11-11-hls-optimization.md` | 14 |
| 5 | 우선 조치 | 45 | 71 | 오류 확인 | `part1-12-lvds-differential.md` | 02 |
| 6 | 우선 조치 | 45 | 72 | 오류 확인 | `part2-06-arm-cache.md` | 02 |
| 7 | 우선 조치 | 46 | 59 | 오류 확인 | `part1-05-spi-hardware.md` | 01 |
| 8 | 우선 조치 | 46 | 59 | 오류 확인 | `part1-09-pwm-signal.md` | 01 |
| 9 | 우선 조치 | 47 | 70 | 오류 확인 | `part6-11-timer-services.md` | 08 |
| 10 | 우선 조치 | 48 | 76 | 오류 확인 | `part12-01-edge-inference.md` | 14 |
| 11 | 우선 조치 | 48 | 74 | 오류 확인 | `part4-11-low-power-modes.md` | 05 |
| 12 | 우선 조치 | 49 | 59 | 오류 확인 | `part1-04-uart-hardware.md` | 01 |
| 13 | 우선 조치 | 49 | 70 | 오류 확인 | `part1-10-can-electrical.md` | 02 |
| 14 | 우선 조치 | 49 | 73 | 오류 확인 | `part2-08-arm-mmu.md` | 03 |
| 15 | 우선 조치 | 49 | 74 | 오류 확인 | `part6-04-semaphore-usage.md` | 07 |
| 16 | 우선 조치 | 49 | 76 | 오류 확인 | `part7-01-linux-boot-flow.md` | 08 |
| 17 | 우선 조치 | 51 | 71 | 오류 확인 | `part2-07-arm-mpu.md` | 02 |
| 18 | 우선 조치 | 51 | 78 | 오류 확인 | `part7-08-platform-driver.md` | 09 |
| 19 | 우선 조치 | 53 | 76 | 오류 확인 | `part4-09-i2c-driver.md` | 05 |
| 20 | 우선 조치 | 53 | 75 | 오류 확인 | `part5-07-tft-display.md` | 06 |
| 21 | 우선 조치 | 53 | 77 | 오류 확인 | `part7-13-irq-affinity.md` | 09 |
| 22 | 우선 조치 | 53 | 80 | 오류 확인 | `part8-12-wcet-analysis.md` | 11 |
| 23 | 우선 조치 | 54 | 68 | 오류 확인 | `part1-07-adc-principles.md` | 01 |
| 24 | 우선 조치 | 54 | 80 | 오류 확인 | `part8-11-power-optimization.md` | 10 |
| 25 | 우선 조치 | 54 | 76 | 오류 확인 | `part9-07-spinlock-vs-mutex.md` | 11 |
| 26 | 우선 조치 | 56 | 76 | 오류 확인 | `part3-11-make-cmake-cross.md` | 04 |
| 27 | 우선 조치 | 56 | 70 | 오류 확인 | `part5-14-rtc-utilization.md` | 07 |
| 28 | 우선 조치 | 57 | 78 | 오류 확인 | `part12-03-quantization.md` | 14 |
| 29 | 우선 조치 | 57 | 75 | 오류 확인 | `part3-10-map-file-analysis.md` | 04 |
| 30 | 우선 조치 | 57 | 72 | 오류 확인 | `part5-13-sd-card-fatfs.md` | 07 |
| 31 | 우선 조치 | 60 | 78 | 오류 확인 | `part11-02-vivado-usage.md` | 13 |
| 32 | 우선 조치 | 61 | 82 | 오류 확인 | `part10-10-protocol-analyzer.md` | 13 |
| 33 | 우선 조치 | 61 | 77 | 오류 확인 | `part4-03-gpio-driver.md` | 04 |
| 34 | 우선 조치 | 61 | 74 | 오류 확인 | `part4-06-systick-timer.md` | 05 |
| 35 | 우선 조치 | 63 | 78 | 오류 확인 | `part10-09-timing-race-diag.md` | 12 |
| 36 | 우선 조치 | 63 | 74 | 오류 확인 | `part4-12-watchdog.md` | 05 |
| 37 | 우선 조치 | 69 | 80 | 오류 확인 | `part10-06-boot-failure.md` | 12 |
| 38 | 병합 검토 | 40 | 64 | 미검증 | `part1-01-digital-signal-basics.md` | 01 |
| 39 | 병합 검토 | 40 | 70 | 미검증 | `part2-09-trustzone-m.md` | 03 |
| 40 | 병합 검토 | 40 | 64 | 미검증 | `part6-09-isr-api.md` | 08 |
| 41 | 병합 검토 | 40 | 76 | 미검증 | `part6-10-priority-inversion.md` | 08 |
| 42 | 병합 검토 | 40 | 65 | 미검증 | `part7-03-device-tree-basics.md` | 08 |
| 43 | 병합 검토 | 41 | 77 | 미검증 | `part11-03-pcie-bar.md` | 13 |
| 44 | 병합 검토 | 41 | 72 | 미검증 | `part3-09-compiler-optimization.md` | 04 |
| 45 | 병합 검토 | 42 | 75 | 미검증 | `part8-03-cache-alignment.md` | 10 |
| 46 | 병합 검토 | 42 | 67 | 미검증 | `part9-02-wait-free.md` | 11 |
| 47 | 병합 검토 | 43 | 78 | 미검증 | `part8-05-zero-copy.md` | 10 |
| 48 | 병합 검토 | 44 | 75 | 미검증 | `part7-06-kernel-module.md` | 09 |
| 49 | 병합 검토 | 45 | 72 | 미검증 | `part6-07-event-group.md` | 07 |
| 50 | 병합 검토 | 45 | 70 | 미검증 | `part9-10-mpmc-queue.md` | 12 |
| 51 | 병합 검토 | 46 | 76 | 미검증 | `part12-06-onnx-runtime.md` | 15 |
| 52 | 병합 검토 | 46 | 75 | 미검증 | `part6-05-mutex-usage.md` | 07 |
| 53 | 병합 검토 | 47 | 74 | 미검증 | `part11-01-fpga-basics.md` | 13 |
| 54 | 병합 검토 | 47 | 78 | 미검증 | `part11-09-pcie-streaming.md` | 14 |
| 55 | 병합 검토 | 47 | 77 | 미검증 | `part6-03-scheduler-internals.md` | 07 |
| 56 | 병합 검토 | 47 | 74 | 미검증 | `part6-08-software-timer.md` | 08 |
| 57 | 병합 검토 | 48 | 66 | 미검증 | `part1-02-clock-timing.md` | 01 |
| 58 | 병합 검토 | 48 | 63 | 미검증 | `part1-03-gpio-internals.md` | 01 |
| 59 | 병합 검토 | 48 | 76 | 미검증 | `part6-01-rtos-decision.md` | 07 |
| 60 | 병합 검토 | 48 | 78 | 미검증 | `part8-01-dynamic-memory.md` | 09 |
| 61 | 병합 검토 | 49 | 61 | 미검증 | `part1-08-dac-principles.md` | 01 |
| 62 | 병합 검토 | 49 | 78 | 미검증 | `part11-04-axi.md` | 13 |
| 63 | 병합 검토 | 49 | 70 | 미검증 | `part2-02-cortex-a-comparison.md` | 02 |
| 64 | 병합 검토 | 49 | 67 | 미검증 | `part2-10-memory-barrier.md` | 03 |
| 65 | 병합 검토 | 49 | 72 | 미검증 | `part5-04-servo-motor.md` | 06 |
| 66 | 병합 검토 | 49 | 74 | 미검증 | `part6-02-task-design.md` | 07 |
| 67 | 병합 검토 | 49 | 78 | 미검증 | `part7-09-mmap.md` | 09 |
| 68 | 병합 검토 | 49 | 78 | 미검증 | `part9-06-atomic-cost.md` | 11 |
| 69 | 병합 검토 | 50 | 70 | 미검증 | `part1-11-rs485-rs422.md` | 02 |
| 70 | 병합 검토 | 50 | 78 | 미검증 | `part3-12-bootloader-chain.md` | 04 |
| 71 | 병합 검토 | 50 | 76 | 미검증 | `part4-08-spi-driver.md` | 05 |
| 72 | 병합 검토 | 50 | 80 | 미검증 | `part7-05-kernel-build.md` | 08 |
| 73 | 병합 검토 | 50 | 77 | 미검증 | `part8-06-numa.md` | 10 |
| 74 | 병합 검토 | 50 | 76 | 미검증 | `part8-07-simd.md` | 10 |
| 75 | 병합 검토 | 51 | 80 | 미검증 | `part11-10-hls.md` | 14 |
| 76 | 병합 검토 | 51 | 72 | 미검증 | `part11-14-intel-quartus.md` | 14 |
| 77 | 병합 검토 | 51 | 76 | 미검증 | `part12-05-tflite-micro.md` | 15 |
| 78 | 병합 검토 | 51 | 71 | 미검증 | `part2-01-cortex-m-comparison.md` | 02 |
| 79 | 병합 검토 | 51 | 74 | 미검증 | `part3-07-c-runtime.md` | 03 |
| 80 | 병합 검토 | 51 | 74 | 미검증 | `part3-08-memory-layout.md` | 04 |
| 81 | 병합 검토 | 51 | 74 | 미검증 | `part6-06-queue-usage.md` | 07 |
| 82 | 병합 검토 | 51 | 77 | 미검증 | `part7-07-char-driver.md` | 09 |
| 83 | 병합 검토 | 51 | 80 | 미검증 | `part8-09-stack-analysis.md` | 10 |
| 84 | 병합 검토 | 52 | 70 | 미검증 | `part11-13-opencl-fpga.md` | 14 |
| 85 | 병합 검토 | 52 | 72 | 검증됨 | `part11-15-pcie-to-cxl.md` | 15 |
| 86 | 병합 검토 | 52 | 77 | 미검증 | `part12-04-tensorrt.md` | 15 |
| 87 | 병합 검토 | 52 | 67 | 미검증 | `part2-05-arm-memory-map.md` | 02 |
| 88 | 병합 검토 | 52 | 73 | 미검증 | `part3-03-elf-format.md` | 03 |
| 89 | 병합 검토 | 52 | 77 | 미검증 | `part4-13-flash-programming.md` | 05 |
| 90 | 병합 검토 | 52 | 79 | 미검증 | `part9-01-lock-free-ring.md` | 11 |
| 91 | 병합 검토 | 53 | 76 | 미검증 | `part11-05-ps-pl-communication.md` | 13 |
| 92 | 병합 검토 | 53 | 77 | 미검증 | `part11-06-mailbox.md` | 13 |
| 93 | 병합 검토 | 53 | 73 | 미검증 | `part11-12-vitis-ai.md` | 14 |
| 94 | 병합 검토 | 53 | 79 | 검증됨 | `part12-08-jetson.md` | 15 |
| 95 | 병합 검토 | 53 | 70 | 미검증 | `part3-02-compile-pipeline.md` | 03 |
| 96 | 병합 검토 | 53 | 75 | 미검증 | `part3-06-startup-code.md` | 03 |
| 97 | 병합 검토 | 53 | 78 | 미검증 | `part6-12-rtos-debugging.md` | 08 |
| 98 | 병합 검토 | 53 | 78 | 미검증 | `part7-10-epoll.md` | 09 |
| 99 | 병합 검토 | 53 | 75 | 미검증 | `part7-12-sysfs.md` | 09 |
| 100 | 병합 검토 | 53 | 80 | 미검증 | `part8-04-dma-allocator.md` | 10 |
| 101 | 병합 검토 | 53 | 77 | 미검증 | `part9-05-cas-patterns.md` | 11 |
| 102 | 병합 검토 | 54 | 63 | 미검증 | `part1-06-i2c-hardware.md` | 01 |
| 103 | 병합 검토 | 54 | 78 | 미검증 | `part11-07-cq-sq.md` | 13 |
| 104 | 병합 검토 | 54 | 77 | 미검증 | `part3-01-cross-compiler.md` | 03 |
| 105 | 병합 검토 | 54 | 77 | 미검증 | `part5-01-pwm-output.md` | 05 |
| 106 | 병합 검토 | 54 | 71 | 미검증 | `part5-12-ethernet-mac-phy.md` | 07 |
| 107 | 병합 검토 | 54 | 76 | 미검증 | `part8-02-memory-alignment.md` | 10 |
| 108 | 병합 검토 | 54 | 78 | 미검증 | `part8-10-code-size-optimization.md` | 10 |
| 109 | 병합 검토 | 55 | 79 | 미검증 | `part11-08-dma-completion.md` | 14 |
| 110 | 병합 검토 | 55 | 67 | 미검증 | `part3-04-linker-script-basics.md` | 03 |
| 111 | 병합 검토 | 55 | 76 | 미검증 | `part3-05-linker-script-advanced.md` | 03 |
| 112 | 병합 검토 | 55 | 75 | 미검증 | `part4-02-mmio-access.md` | 04 |
| 113 | 병합 검토 | 55 | 75 | 미검증 | `part7-02-uboot-usage.md` | 08 |
| 114 | 병합 검토 | 55 | 77 | 미검증 | `part9-03-rcu-basics.md` | 11 |
| 115 | 병합 검토 | 56 | 78 | 미검증 | `part10-02-jtag-swd.md` | 12 |
| 116 | 병합 검토 | 56 | 78 | 미검증 | `part5-02-dc-motor.md` | 06 |
| 117 | 병합 검토 | 56 | 75 | 미검증 | `part7-04-device-tree-overlay.md` | 08 |
| 118 | 병합 검토 | 56 | 79 | 미검증 | `part7-14-rootfs-buildroot.md` | 09 |
| 119 | 병합 검토 | 56 | 76 | 미검증 | `part9-08-aba-problem.md` | 11 |
| 120 | 병합 검토 | 56 | 78 | 미검증 | `part9-09-false-sharing.md` | 11 |
| 121 | 병합 검토 | 57 | 80 | 미검증 | `part12-07-thermal.md` | 15 |
| 122 | 병합 검토 | 57 | 77 | 미검증 | `part5-03-stepper-motor.md` | 06 |
| 123 | 병합 검토 | 57 | 75 | 미검증 | `part5-08-environmental-sensors.md` | 06 |
| 124 | 병합 검토 | 57 | 76 | 미검증 | `part7-11-uio-vfio.md` | 09 |
| 125 | 병합 검토 | 58 | 80 | 미검증 | `part10-05-uart-not-printing.md` | 12 |
| 126 | 병합 검토 | 58 | 78 | 미검증 | `part5-10-can-communication.md` | 06 |
| 127 | 병합 검토 | 59 | 77 | 미검증 | `part5-06-spi-oled.md` | 06 |
| 128 | 병합 검토 | 59 | 79 | 미검증 | `part5-09-imu-sensor.md` | 06 |
| 129 | 병합 검토 | 59 | 78 | 미검증 | `part9-04-hazard-pointer.md` | 11 |
| 130 | 병합 검토 | 66 | 84 | 검증됨 | `part11-16-qemu-cxl-emulation.md` | 16 |
| 131 | 보강 | 51 | 77 | 미검증 | `00-preface.md` | 01 |
| 132 | 보강 | 60 | 78 | 미검증 | `part10-11-logging-system.md` | 13 |
| 133 | 보강 | 60 | 83 | 검증됨 | `part11-17-linux-cxl-driver.md` | 16 |
| 134 | 보강 | 60 | 78 | 미검증 | `part4-01-first-baremetal.md` | 04 |
| 135 | 보강 | 60 | 77 | 미검증 | `part4-07-uart-driver.md` | 05 |
| 136 | 보강 | 60 | 78 | 미검증 | `part4-10-dma-basics.md` | 05 |
| 137 | 보강 | 61 | 74 | 미검증 | `part5-05-character-lcd.md` | 06 |
| 138 | 보강 | 61 | 77 | 미검증 | `part5-11-usb-device.md` | 06 |
| 139 | 보강 | 62 | 80 | 미검증 | `part10-01-debug-mindset.md` | 12 |
| 140 | 보강 | 62 | 80 | 미검증 | `part10-03-gdb-remote-debug.md` | 12 |
| 141 | 보강 | 62 | 82 | 미검증 | `part10-12-postmortem-analysis.md` | 13 |
| 142 | 보강 | 62 | 78 | 미검증 | `part4-05-interrupt-handling.md` | 04 |
| 143 | 보강 | 64 | 80 | 검증됨 | `part12-09-zero-copy-camera.md` | 15 |
| 144 | 보강 | 65 | 75 | 검증됨 | `part2-03-arm-registers.md` | 02 |
| 145 | 보강 | 67 | 80 | 미검증 | `part10-08-memory-corruption.md` | 12 |
| 146 | 보강 | 67 | 76 | 미검증 | `part4-04-clock-setup.md` | 04 |
| 147 | 보강 | 67 | 80 | 검증됨 | `part4-14-ddr-init-failure.md` | 05 |
| 148 | 보강 | 68 | 77 | 미검증 | `part10-04-hardfault-analysis.md` | 12 |
| 149 | 보강 | 68 | 79 | 미검증 | `part10-07-interrupt-debugging.md` | 12 |
| 150 | 보강 | 68 | 82 | 검증됨 | `part12-12-matter-thread.md` | 15 |
| 151 | 보강 | 69 | 82 | 검증됨 | `part12-11-tfm-trustzone.md` | 15 |
| 152 | 보강 | 74 | 82 | 검증됨 | `part12-10-on-device-llm.md` | 15 |

## 운영 규칙

- 이 문서의 점수는 잠정값이며, 실제 수정 후 같은 루브릭 버전으로 재평가한다.
- 원문 수정은 한 번에 한 묶음만 처리하고 build·anchor·search parity·distribution feed 검사를 통과시킨다.
- 확인하지 못한 수치·주장은 1차 자료로 고치거나 지운다. `~할 수 있습니다`, `확인해야 합니다` 같은 완곡 표현으로 바꾸지 않는다(CLAUDE.md §10).
- 외부 링크 추가만으로 품질이 올라갔다고 판단하지 않는다. 출처가 어떤 주장·측정을 뒷받침하는지 본문에 남긴다.
- 병합·비공개·삭제는 이 요약 점수만으로 실행하지 않고, 시리즈 구조 결정과 URL 영향 분석을 거친다.
- 상세 근거는 [rubric.md](../../docs/adsense-audit/rubric.md), [anchors.md](../../docs/adsense-audit/anchors.md)와 각 루프 보고서를 기준으로 한다.
