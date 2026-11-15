# 공개 글(Modern Embedded Recipes 제외) — 전체 AdSense 평가 요약

> - 기준: 루브릭 v1.2 (`docs/adsense-audit/rubric.md`), 앵커 `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> - 대상: Modern Embedded Recipes를 뺀 공개 글 406편, 25개 시리즈 디렉터리. 루프 41개(`node scripts/adsense-score-loop.mjs plan`, 루프당 10편, 마지막 6편)
> - 루프 보고서: `reports/adsense-audit/published-loop-01.md` ~ `published-loop-41.md`
> - 평가일: 2026-10-11~12
> - 원칙: 점수만 매겼다. 원문·비공개·삭제·URL은 바꾸지 않았다. 모든 점수는 `잠정`이다

## 결론

406편의 점수는 37~66점이고 평균 51.5점(표준편차 6.0)이다. 80점 이상 글은 없어 `유지`·`검증 대기`가 0편이다. 판정은 `우선 조치` 223편, `병합 검토` 146편, `보강` 33편, `제외 검토` 4편이다. 확정 P0는 없다(`정책 확인 필요` 4편은 아래에 적었다).

가장 큰 문제는 이번에도 정확성이다. **223편(55%)이 `오류 확인`**이다. 그중 187편은 외부 자료 없이 원문 안의 두 위치(산술, 코드와 주석, 예시 출력끼리, 두 진술)가 동시에 참일 수 없다는 근거다. 1차 자료와 대조한 기록이 있는 `검증됨`은 36편이고, 모두 fact-check 1·2라운드를 거친 CXL·HBM 계열 글이다. 이 36편 중 `오류 확인`은 0편이다. 1차 자료 대조를 거친 글과 거치지 않은 글의 차이가 이 숫자로 드러난다.

따라서 다음 작업 순서는 Modern Embedded Recipes와 같다. **오류 수정(fact-check 라운드) → 시리즈 구조 결정(병합·제외) → 출처·측정 정리**. 점수는 내부 우선순위이며 Google의 공식 점수나 승인 확률이 아니다.

## 점수 분포

| 항목 | 만점 | 평균 | 만점 대비 |
| --- | ---: | ---: | ---: |
| A 독창성 | 25 | 11.5 | 46% |
| B 완결성 | 20 | 11.1 | 55% |
| C 실전성 | 15 | 6.1 | 40% |
| D 중복 | 15 | 9.2 | 61% |
| E 검색 의도 | 10 | 6.3 | 63% |
| F 탐색성 | 10 | 5.6 | 56% |
| G 출처 | 5 | 1.7 | 34% |
| 합계 | 100 | 51.5 | |

| 구간 | 35~39 | 40~44 | 45~49 | 50~54 | 55~59 | 60~64 | 65~66 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 편수 | 6 | 49 | 99 | 129 | 80 | 39 | 4 |

- C는 406편 중 403편이 8점 이하다. 출처·측정 환경 없는 수치에 걸리는 상한(루브릭 3-1)이다. 9점은 3편뿐이다.
- G는 1점 172편, 2점 186편, 3점 36편, 4점 12편이다. 본문 주장에 연결된 1차 출처가 거의 없다.

## 판정 분포

| 판정 | 편수 | 의미 |
| --- | ---: | --- |
| `우선 조치` | 223 | 모두 `오류 확인`. 총점과 무관하게 먼저 고친다 |
| `병합 검토` | 146 | 40~59점. 병합 대상 후보 또는 `병합 대상 없음`과 다음 조치를 루프 보고서 글별 블록에 적었다 |
| `보강` | 33 | 60~79점 23편, 허브 규칙(시리즈 첫 글·preface)으로 보강에 둔 60점 미만 10편 |
| `제외 검토` | 4 | 40점 미만 |
| `검증 대기`·`유지` | 0 | 80점 이상 없음 |

허브 규칙을 적용한 10편: `bootloader/chapter01`, `bsp/chapter01`, `cxl/chapter01`, `driver-cosim/chapter01`, `embedded-cpp/00-preface`, `performance-engineering/00-preface`, `esp32-c3-mastering/chapter01`, `hbm/chapter01`, `practical-internals/00-preface`, `sanitizers/chapter01`.

## 시리즈별 결과

| 시리즈 디렉터리 | 편수 | 루프 | 평균 | 범위 | 오류 확인 | 검증됨 | 우선 조치 | 병합 검토 | 보강 | 제외 검토 |
| --- | ---: | --- | ---: | --- | ---: | ---: | ---: | ---: | ---: | ---: |
| `embedded/bootloader` | 37 | 01~04 | 54.5 | 45~66 | 28 | 0 | 28 | 6 | 3 | 0 |
| `embedded/bsp` | 21 | 04~06 | 52.4 | 41~60 | 12 | 0 | 12 | 8 | 1 | 0 |
| `embedded/buildroot` | 20 | 06~08 | 56.6 | 49~64 | 14 | 0 | 14 | 4 | 2 | 0 |
| `tools/build/cmake` | 9 | 08~09 | 56.3 | 52~61 | 7 | 0 | 7 | 2 | 0 | 0 |
| `embedded/hardware/cxl` | 15 | 09~11 | 58.3 | 51~66 | 0 | 15 | 0 | 7 | 8 | 0 |
| `tools/emulation/driver-cosim` | 8 | 11 | 49.4 | 47~53 | 4 | 0 | 4 | 3 | 1 | 0 |
| `tools/debugging/dwarf-elf` | 6 | 12 | 55.3 | 50~60 | 5 | 0 | 5 | 0 | 1 | 0 |
| `embedded/embedded-cpp` | 41 | 12~16 | 49.6 | 43~59 | 22 | 0 | 22 | 18 | 1 | 0 |
| `tools/debugging/embedded` | 9 | 16~17 | 53.8 | 44~60 | 6 | 2 | 6 | 2 | 1 | 0 |
| `embedded/performance-engineering` | 57 | 17~23 | 46.7 | 37~63 | 34 | 3 | 34 | 20 | 1 | 2 |
| `embedded/embedded-security` | 13 | 23~24 | 54.5 | 45~65 | 5 | 2 | 5 | 6 | 2 | 0 |
| `embedded/riscv/esp32-c3-mastering` | 12 | 24~25 | 51.8 | 44~58 | 7 | 0 | 7 | 4 | 1 | 0 |
| `tools/debugging/gdb-lldb` | 12 | 25~26 | 49.1 | 38~56 | 5 | 0 | 5 | 7 | 0 | 0 |
| `tools/debugging/gdb-extension` | 6 | 27 | 49.8 | 42~58 | 1 | 0 | 1 | 5 | 0 | 0 |
| `tools/build/gnu-make` | 7 | 27~28 | 59.7 | 54~63 | 3 | 0 | 3 | 1 | 3 | 0 |
| `embedded/hardware/hbm` | 12 | 28~29 | 54.3 | 45~62 | 2 | 10 | 2 | 6 | 4 | 0 |
| `embedded/protocols/industrial-ethernet` | 12 | 29~30 | 53.3 | 49~59 | 8 | 0 | 8 | 4 | 0 | 0 |
| `tools/debugging/kernel` | 9 | 30~31 | 49.8 | 44~54 | 3 | 2 | 3 | 6 | 0 | 0 |
| `tools/debugging/memory` | 7 | 31~32 | 51.1 | 41~57 | 2 | 1 | 2 | 5 | 0 | 0 |
| `embedded/hardware/pcie` | 19 | 32~34 | 45.8 | 41~53 | 10 | 0 | 10 | 9 | 0 | 0 |
| `tools/debugging/postmortem` | 6 | 34 | 50.8 | 42~63 | 2 | 1 | 2 | 3 | 1 | 0 |
| `embedded/rtos/practical-internals` | 53 | 34~40 | 48.9 | 38~61 | 31 | 0 | 31 | 18 | 2 | 2 |
| `tools/debugging/python` | 5 | 40 | 55.4 | 52~58 | 4 | 0 | 4 | 1 | 0 | 0 |
| `tools/debugging/sanitizers` | 5 | 40~41 | 57.4 | 53~61 | 3 | 0 | 3 | 1 | 1 | 0 |
| `tools/debugging/valgrind` | 5 | 41 | 57.0 | 54~65 | 5 | 0 | 5 | 0 | 0 | 0 |
| **합계** | **406** | 01~41 | **51.5** | 37~66 | **223** | **36** | **223** | **146** | **33** | **4** |

## 평가 절차와 더블 체크

- 글마다 평가 에이전트가 루브릭 v1.2·앵커로 A~G를 채점하고, 다른 에이전트가 인용 줄 번호·`오류 확인` 근거·상한(AP-C-24)·D 비교 글·다음 편과 관련 링크 대상·git 이력을 다시 열어 확인한 뒤 직접 다시 채점했다. 루프 보고서는 더블 체크 결과(`final`)만 쓴다.
- 더블 체크가 점수를 바꾼 글은 127편이다. 1차 평균 51.8점 → 최종 51.5점. 1차보다 3점 넘게 낮아진 부풀림은 3편이다: `bsp/chapter02-datasheet.md` 61→57, `cxl/chapter10-arb-mux.md` 67→63, `embedded-cpp/part1-06-startup-code.md` 51→47.
- `factcheck`는 git 이력으로 정했다. 출처를 적은 대조 커밋이 있는 글만 `검증됨`이고, 출처 없는 `Qualify …`·`Fact-check …` 커밋(e4f6db70, bf206362, 7d14b1b8, 279096d9, 2bb21c78)은 검증으로 치지 않았다.
- 실행 중 로그인 만료로 루프가 한 번 끊겼고, 재개할 때 루프 01~20은 채점부터 다시 돌았다. 보고서는 재실행 결과만 담는다. 첫 실행과 판정이 다른 글이 있다(예: `bootloader/chapter02`는 첫 실행 `오류 확인`, 재실행 `미검증`). `오류 확인`과 `미검증`의 경계에 있는 글이라는 뜻이므로 fact-check 라운드에서 다시 본다.
- `gnu-make/chapter06-conditionals.md`(60점)는 더블 체크 기록이 `병합 검토`였지만 같은 기록이 "중복은 일부이고 독립 검색 의도가 있음"이라 했으므로 루브릭 5절('차별화 보강')에 따라 보고서는 `보강`으로 적었다. 이 요약의 수치도 `보강`으로 셌다.
- 41개 보고서 모두 `node scripts/adsense-score-loop.mjs check-report`에서 행 수와 A~G 합계가 맞고, 406행이 워크플로 결과와 일치한다.

## 시리즈 공통 문제

41개 보고서의 `## 시리즈 공통 문제` 절에서 3편 이상으로 기록된 것만 모았다. 편수는 보고서 기록을 루프별로 더한 값이다.

- **embedded/bootloader** (37편): 오류 확인 28편. 예시 출력·메모리 맵 산술이 맞지 않는 글 10편(ch11·12·16, ch22 66~75행 bdinfo, ch24·25·28 등). 관련 항목 라벨과 대상이 다른 글 약 27편(fa55144d가 대상만 다시 매핑). '시리즈 마지막' 표기가 확장 뒤 갱신되지 않은 글 7편(ch37 167행은 없는 Ch 38 예고). U-Boot가 `data/upstream-tracking.yaml`에 없다.
- **embedded/bsp** (21편): 글 날짜보다 늦은 'May 19 2026'(ch06 432행, ch07 406행)과 만든 타임스탬프(ch09·10·11)로 꾸민 실행 로그 5편. 주제 라벨 링크가 다른 시리즈의 00-preface로 가는 글 12편. 오류 확인 12편.
- **embedded/buildroot** (20편): 기준 릴리스가 없거나 글마다 다름 8편. 그대로 따라 하면 동작하지 않는 예제 5편(ch14 261행, ch15 60행, ch16 243행, ch17 136행, ch19 330행)과 자리표시 해시 4편. 라벨 오류 loop07·08 전부. 오류 확인 14편.
- **tools/build/cmake** (9편): 1차 대조 커밋 0편, 참고 자료가 cmake.org 'latest' 링크뿐(7편). 오류 확인 7편 중 ch02·03·06은 공식 문서·실행으로 확인.
- **embedded/hardware/cxl** (15편): 15편 모두 검증됨, 오류 확인 0편. 다만 출처가 시리즈 공통 footer 한 줄에 몰려 G가 낮고, 시리즈 제목은 'CXL 4.0'인데 근거는 3.1 spec(ch08·09·10·13). 지어낸 출력을 지운 뒤 대체 절차가 없는 장 6편.
- **tools/emulation/driver-cosim** (8편): draft 글을 가리키는 링크 없는 관련 항목 8편, 빌드되지 않는 코드 7편, G=1 8편. 오류 확인 4편.
- **tools/debugging/dwarf-elf** (6편): 예시 출력끼리 맞지 않는 글 6편(ch01 56행 vs 197행, ch05 86행 vs 251행). gdb-lldb ch12와 문장 공유 5편.
- **embedded/embedded-cpp** (41편): 출처·환경 없는 `## 측정` 절 약 35편. 그대로 컴파일되지 않는 조각 21편 이상(AP-C-35). 같은 H2 템플릿 40편. 제목 키워드를 본문이 이행하지 않는 글 약 21편(1-07 'vtable' 0건, 2-02 'DMA' 0건). 오류 확인 22편.
- **tools/debugging/embedded** (9편): 같은 OpenOCD `tpiu config` 줄이 3편과 gdb-lldb ch08에 반복. ch07 13행 '마지막 장'. 오류 확인 6편.
- **embedded/performance-engineering** (57편): 예시 수치·코드 블록 산술 모순 27편 이상. 'Cortex-A72 4-core'만 적은 '실측' 표 9편 이상(4-02 84~90행, 4-03~4-10). 6205e212 재정렬 뒤 다음 편 안내 미갱신(3-10, 3-11, 4-01, 5-10 258행, 6-04 234행). 허브 '53편' 표기. 오류 확인 34편, 제외 검토 2편.
- **embedded/embedded-security** (13편): 링크 없는 관련 항목 6편 이상. RSA-2048 검증 시간이 ch01·02·03·06에서 서로 다름. ch11~13이 cxl ch14와 문장 단위로 겹침. 오류 확인 5편.
- **embedded/riscv/esp32-c3-mastering** (12편): 한 커밋(7b2b5e69) 템플릿. 출처가 docs.espressif.com '/latest/'뿐이고 ESP-IDF 판 미고정. 전력 수치가 글마다 다름(ch01 140 µA vs ch12 130 µA). 오류 확인 7편.
- **tools/debugging/gdb-lldb** (12편): 손으로 만든 예시 출력 7편, 전용 시리즈와 겹치는 'Deep dive' 6편, 라벨 오류 5편. ch10·11은 '마지막 장'인데 ch12가 공개됨. 오류 확인 5편.
- **tools/debugging/gdb-extension** (6편): 5편이 gdb-lldb ch09·ch10과 예제가 겹쳐 병합 검토. 전제 지식 안내 6편 모두 없음.
- **tools/build/gnu-make** (7편): 예상 출력이 실행 결과와 다른 글 3편(ch01 198행, ch03 178행, ch04 170~173행). 버전 표기 없음.
- **embedded/hardware/hbm** (12편): 10편 검증됨. fact-check 뒤 TBD·완곡 문장으로 비운 핵심 칸 6편, 링크 없는 관련 항목 6편, 제목이 본문보다 넓은 글 5편, 'Recipes Ch 149' 라벨 3편.
- **embedded/protocols/industrial-ethernet** (12편): 옛 번호 라벨 5곳. EtherCAT 명령 코드 오류가 ch03·04·05에 퍼짐. '12.5 μs'에 출처·링크 속도 없음(4편). 오류 확인 8편.
- **tools/debugging/kernel·memory** (9+7편): '마지막 장' 미갱신 4편 이상, 'Ch N' 라벨 번호 오류 8편, '...'·꾸민 값의 예시 출력 7편 이상.
- **embedded/hardware/pcie** (19편): 'Ch 1 footer'로 출처를 넘기는 글 17편. 표 렌더 깨짐 4편(ch12 184행, ch14 21행, ch15, ch16). 허브 17행 '18편'(실제 19편). 오류 확인 10편.
- **tools/debugging/postmortem** (6편): gdb-lldb ch07·dwarf-elf ch06과 문단 단위로 겹치는 글 4편. si_code 값 오류가 ch02·03과 gdb-lldb ch07에 퍼짐.
- **embedded/rtos/practical-internals** (53편): FreeRTOS 버전·경로 없음, 'Cortex-M4 168 MHz' 측정 표에 환경 없음(6편 이상). 재구성한 FreeRTOS 의사코드의 주석·코드·산문 불일치(loop37 6편). heap_4 정책·SMP 도입 버전·critical 매크로 서술이 글마다 다름. Part 1 개념 장과 Part 3·5 구현 장 반복. 오류 확인 31편, 제외 검토 2편.
- **tools/debugging/python·sanitizers·valgrind** (5+5+5편): 환경 없는 예시 출력·오버헤드 배율 10편 이상, 동작하지 않는 예제 5편. 오류 확인 valgrind 5/5, python 4/5, sanitizers 3/5.

## 사이트 전체 반복 패턴

- **1차 자료 대조가 CXL·HBM 계열에만 있다.** `검증됨` 36편이 전부 CXL·HBM 관련 장이다. 나머지 370편은 출처를 적은 대조 커밋이 없다.
- **출처·환경 없는 수치.** C ≤ 8이 403편. 같은 사실을 시리즈마다 다른 값으로 적는다(RSA 검증 시간, PREEMPT_RT latency, false sharing 배수, RTT 처리량).
- **본문 출처가 글 끝 목록·footer에만 있다.** G ≤ 2가 358편. 'latest' 링크(cmake, espressif), 시리즈 공통 footer(cxl, pcie), 관련 항목 끝 '원문 —' 링크(bootloader).
- **같은 H2 뼈대.** '한 줄 요약 → … → 자주 하는 실수 → 정리 → 다음 편 → 관련 항목'이 거의 모든 시리즈에 있고, 일괄 작성 커밋 단위로 모여 있다(160a78a8, 87bd86e2, 3d56a230, 84b54508, 7b2b5e69, 80cb602e, 23ed6256). 루브릭 9절 scaled content 기록 대상이다. 보고서 기록 합산으로 300편 이상(추정).
- **링크 라벨과 대상 불일치는 세 번의 기계 변환에서 왔다.** fa55144d(주제 라벨 링크가 다른 시리즈 00-preface로), 8bf4703f(draft 대상 링크를 벗겨 텍스트만 남김), ac24bb76(옛 'Ch N: 제목' 라벨). 'Modern Embedded Recipes Ch 149/150/151'처럼 번호가 seriesOrder보다 1 작은 라벨도 12곳 이상이다. 걸린 글은 약 120편 이상(추정). 글마다 고치기보다 한 번에 고치는 게 맞다.
- **편수·'마지막 장' 표기 미갱신.** 장을 추가한 뒤 앞 글과 허브를 고치지 않았다. 13개 시리즈, 약 35편(추정).
- **'X 분석' 제목에 개념 소개 수준의 본문.** ac24bb76 일괄 제목 변경에서 왔다. 약 35편이 E ≤ 6(추정).
- **실행 기록이 아닌 예시 출력과 그대로는 동작하지 않는 코드.** bsp, buildroot, dwarf-elf, embedded-cpp, gdb-lldb, valgrind, practical-internals에서 루프마다 5~7편.

## 오류 확인 유형

223편을 루프 보고서의 factcheck 근거로 분류했다. 하위 유형은 키워드 분류라 한 글이 여러 유형에 들어갈 수 있고 추정치다.

| 유형 | 편수 | 예 |
| --- | ---: | --- |
| 원문 내부 모순만으로 판정 | 187 | — |
| 1차 자료를 열거나 실행해 판정 | 36 | `pcie/chapter03-config-space.md` 128~139행: Extended Cap ID 7개가 upstream `pci_regs.h`와 다르다 |
| └ 그중 도구 실행 결과가 근거 | 약 8 | `cmake/chapter02-language.md` 714~716행: '공백으로 두 개로 분리'라 했지만 `cmake -P` 실행 결과는 한 번만 출력 |
| 산술 오류 | 약 51 | `embedded-cpp/part1-04-code-size-analysis.md` 391행: dec 94816과 hex 0x1722c(=94764) 불일치 |
| 코드↔주석·산문 불일치 | 약 42 | `practical-internals/part3-07-queue-impl.md` 148행 주석과 162행 코드가 다르게 동작 |
| 같은 글 안의 출력·로그 불일치 | 약 41 | `bootloader/chapter22-debugging.md` 70·72행: relocaddr·fdt_blob이 66~68행 bdinfo DRAM 범위 밖 |
| 같은 글 안의 두 진술 모순 | 나머지 대부분 | `bootloader/chapter03-build-system.md` 430행 '그대로 커밋 = 실수' vs 432행 '그대로 둠' |
| description↔본문 | 5 | `hbm/chapter09-cxl-mem.md` 5행 'HBM과 DIMM 사이' vs 21~26행 'DDR과 SSD 사이' |

다른 글과의 모순은 모든 루프가 `오류 확인`에서 빼고 `uncertainties`·시리즈 공통 문제로 넘겼다.

`data/known-falsehoods.yaml` 등재 후보(fact-check 라운드에서 1차 자료로 확정한 뒤 등재): si_code 값(postmortem ch02·03, gdb-lldb ch07), `CAP_EXP+8.W=0x2810`(pcie ch15·17), debugfs AER 경로(pcie ch15·16), EtherCAT LWR/BWR 코드(industrial-ethernet ch03~05), consteval 동적 할당 'C++20 불가'(embedded-cpp 2-05), CMake target_* 키워드 경고(cmake ch03·08).

## 정책 확인 필요

확정 P0는 0건이다. 다음 4편은 `정책 확인 필요`로 표시했다(루브릭 3절: 단정하지 않음).

- `embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm.md` (loop 24): 279~373행이 C3에 없는 MCPWM 절과 코드를 두고 15·19·292·408~409행이 C3에 MCPWM이 있다고 쓴다. 424행 링크는 'Page Not Found'에 닿는다. '거짓 주장이나 없는 페이지로 이어지는 링크'에 해당할 수 있다.
- `embedded/protocols/industrial-ethernet/chapter12-comparison.md` (loop 30): 125~264행이 실명 기업·공장의 망 채택을 출처 없이 단정한다. ch01 155행, ch06 184·190·200·232행도 같은 유형이다.
- `embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache.md` (loop 23): 15행에서 '일반화한 시나리오'라 밝히고 49~57행 nvidia-smi 출력, 70~75행 Nsight 분해, 156~163행 '해결 후 측정' 표를 실측처럼 쓴다.
- `embedded/bootloader/chapter08-board-init.md` (loop 01): 621행 '원문' 링크가 404다(ch05 392행도 404이며 F 감점만 했다).

## 제외 검토 글

- `embedded/performance-engineering/part2-09-simd-neon.md` (38점): modern-recipes part8-07과 SIMD 역할을 정한 뒤 제외할지, MVE·SVE 차이로 좁혀 다시 쓸지 결정한다.
- `embedded/performance-engineering/part3-12-cxl-mem-latency.md` (37점, 검증됨): 제목이 약속한 대역폭·switch·pool 비교의 절반 이상이 없고, 남은 본문은 part3-11·part5-11과 거의 겹친다.
- `embedded/rtos/practical-internals/part2-03-scheduler-algorithm.md` (38점): part5-01 149~168·340~346행과 같은 vTaskSwitchContext·SMP 내용. part2-01·part5-01 병합 또는 진입 경로 표만 살린 보강.
- `embedded/rtos/practical-internals/part3-04-priority-inversion.md` (38점): 해결책 설명(52~100행)이 part1-08·part3-05·part3-06을 반복하고, 고유 내용은 19~36행뿐이다.

## 다음 조치 (운영자 결정)

1. **fact-check 라운드**: `오류 확인` 223편부터. 시리즈 단위로 묶으면 performance-engineering 34, practical-internals 31, bootloader 28, embedded-cpp 22, buildroot 14, bsp 12, pcie 10 순이다.
2. **기계 변환 결함 일괄 수정**: fa55144d·8bf4703f·ac24bb76에서 온 링크 라벨·대상, '마지막 장'·허브 편수 표기는 글마다가 아니라 한 번에 고친다(F 감점의 대부분).
3. **구조 결정**: 제외 검토 4편, gdb-extension↔gdb-lldb, postmortem↔gdb-lldb ch07, practical-internals Part 1↔Part 3·5, embedded-security ch11~13↔cxl ch14.
4. **정책 확인 필요 4편**은 수정 루프에 앞서 사람이 판단한다.
5. 이번 루프에서는 원문을 고치지 않았다.
