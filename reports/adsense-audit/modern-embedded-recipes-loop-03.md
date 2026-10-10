# Modern Embedded Recipes — 루프 03 (seriesOrder 20~29)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음
>
> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 2,800자다. 산문 2,500자 미만은 3편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 3편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 근거·실전성 검토 | 9 | 기계 신호 기반 후보. 최종 판정 아님 |
| 1차 유지 후보 | 1 | 기계 신호 기반 후보. 최종 판정 아님 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 9 |
| 산문 <2500 | 3 |
| 코드 우세 | 3 |
| 실전 신호 약함 | 3 |

## 검사 포인트

- 이 루프의 주제가 이전 루프와 얼마나 겹치는지 확인한다.
- 같은 섹션 템플릿이 반복되어도 각 글의 독립 문제와 결론이 있는지 확인한다.
- 코드·표가 설명을 보완하는지, 반대로 설명을 대체하는지 구분한다.
- 근거 없는 표준 수치와 보편적인 “양호 기준”이 있는지 기록한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part2-08-arm-mmu.md | ARM MMU 기초 분석 — Translation Table·TLB·ASID | 3,603 | 684 | 0 | 3 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part2-09-trustzone-m.md | ARM TrustZone-M 기초 — Secure/Non-Secure·NSC·MPC | 2,426 | 1,465 | 0 | 2 | 8 | 산문 <2500, 외부 출처 없음 | 근거·실전성 검토 |
| 3 | part2-10-memory-barrier.md | ARM Memory Barrier 실전 — DMB·DSB·ISB·DMA·MMIO | 2,729 | 3,544 | 0 | 0 | 16 | 코드 우세, 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 4 | part3-01-cross-compiler.md | 임베디드 크로스 컴파일러 분석 — GCC·Clang·Sysroot 구성 | 3,134 | 1,777 | 1 | 5 | 8 | 없음 | 1차 유지 후보 |
| 5 | part3-02-compile-pipeline.md | C 컴파일 4단계 — Preprocess·Compile·Assemble·Link 추적 | 2,020 | 1,599 | 0 | 4 | 8 | 산문 <2500, 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part3-03-elf-format.md | ELF 파일 구조 분석 — Section·Segment·Symbol Table·DWARF | 2,800 | 1,784 | 0 | 1 | 8 | 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 7 | part3-04-linker-script-basics.md | 링커 스크립트 기초 — SECTIONS·MEMORY·entry point | 2,313 | 2,931 | 0 | 1 | 8 | 산문 <2500, 코드 우세, 외부 출처 없음, 실전 신호 약함 | 근거·실전성 검토 |
| 8 | part3-05-linker-script-advanced.md | 링커 스크립트 고급 — Overlay·BSS·init_array·LMA/VMA | 2,501 | 2,300 | 0 | 5 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 9 | part3-06-startup-code.md | 임베디드 스타트업 코드 분석 — Reset_Handler·Vector Table·SystemInit | 2,817 | 3,233 | 0 | 6 | 8 | 코드 우세, 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part3-07-c-runtime.md | C 런타임 crt0 분석 — Stack·BSS Zero·Data Copy·atexit | 3,065 | 2,365 | 0 | 4 | 8 | 외부 출처 없음 | 근거·실전성 검토 |

## 루프 종료 조건

- 대상 10편과 보고서 행 10개 일치
- 원문 콘텐츠 파일 변경 없음
- git diff --check 통과
- 정책·중복·실전성 검토 후보를 다음 정성 단계에 전달

## 정성 평가 업데이트

원문 10편을 직접 대조해 루브릭 7개 항목으로 잠정 점수화했다. 점수는 Google의 공식 점수나 승인 확률이 아니라 콘텐츠 품질·독립 가치·검증 가능성을 비교하기 위한 내부 지표다. P0 정책 차단 요소는 확인되지 않았다. 실제 보드·커널·툴체인 버전별 실행 결과와 ARM/GNU 공식 문서 대조 전이므로 신뢰도는 중간이다.

### 요약

| 파일 | 점수 | 잠정 판정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part2-08-arm-mmu.md` | **73/100** | 보강 후 유지 | translation table·TLB·page fault 흐름과 Linux 확인 명령이 있지만 아키텍처별 수치 근거가 부족하다 |
| `part2-09-trustzone-m.md` | **70/100** | 보강 | Secure/Non-Secure·SAU/IDAU·NSC를 연결하지만 실제 보안 경계와 보드 조건이 없다 |
| `part2-10-memory-barrier.md` | **67/100** | 보강 검토 | DMB/DSB/ISB·DMA·SMP 사례는 풍부하지만 코드 비중과 일반화 위험이 크다 |
| `part3-01-cross-compiler.md` | **77/100** | 유지 후보 | triplet·sysroot·multilib·libc 선택을 실제 구성 흐름과 연결한다 |
| `part3-02-compile-pipeline.md` | **70/100** | 보강 | GCC 4단계와 옵션이 명확하지만 실행 결과·환경별 차이가 약하다 |
| `part3-03-elf-format.md` | **73/100** | 보강 후 유지 | ELF header·section/segment·symbol·relocation을 도구 명령과 연결한다 |
| `part3-04-linker-script-basics.md` | **67/100** | 보강 검토 | MEMORY·SECTIONS·LMA/VMA 설명은 실용적이나 코드 의존과 독립 검증이 부족하다 |
| `part3-05-linker-script-advanced.md` | **76/100** | 유지 후보 | RAM 함수·A/B·overlay·NOLOAD·KEEP을 실제 펌웨어 배치 문제와 연결한다 |
| `part3-06-startup-code.md` | **75/100** | 유지 후보 | Reset_Handler부터 C++ 초기화·SystemInit까지 부팅 경로를 단계적으로 설명한다 |
| `part3-07-c-runtime.md` | **74/100** | 보강 후 유지 | crt 계열·init_array·syscall stub과 newlib 옵션을 함께 다룬다 |

### 항목별 점수

| 파일 | 독창성 25 | 완결성 20 | 실전 검증 15 | 중복/병합 15 | 검색 의도 10 | UX/내부링크 10 | 신뢰/출처 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part2-08-arm-mmu.md` | 18 | 16 | 10 | 11 | 9 | 7 | 2 | **73** |
| `part2-09-trustzone-m.md` | 17 | 15 | 9 | 11 | 9 | 7 | 2 | **70** |
| `part2-10-memory-barrier.md` | 16 | 14 | 7 | 10 | 9 | 8 | 3 | **67** |
| `part3-01-cross-compiler.md` | 19 | 17 | 11 | 12 | 9 | 8 | 1 | **77** |
| `part3-02-compile-pipeline.md` | 17 | 15 | 9 | 10 | 9 | 8 | 2 | **70** |
| `part3-03-elf-format.md` | 18 | 16 | 9 | 11 | 9 | 8 | 2 | **73** |
| `part3-04-linker-script-basics.md` | 16 | 14 | 8 | 10 | 9 | 8 | 2 | **67** |
| `part3-05-linker-script-advanced.md` | 18 | 16 | 11 | 12 | 9 | 8 | 2 | **76** |
| `part3-06-startup-code.md` | 18 | 16 | 11 | 11 | 9 | 8 | 2 | **75** |
| `part3-07-c-runtime.md` | 18 | 16 | 10 | 11 | 9 | 8 | 2 | **74** |

### 공통 근거와 우선순위

- MMU·TrustZone·memory barrier는 ARM 아키텍처 버전, Cortex-A/M 계열, MPU/MMU 설정, SMP 여부를 분리해야 한다. 현재 설명은 좋은 개요지만 모든 구현에 동일하게 적용되는 것처럼 읽힐 위험이 있다.
- `part3-01`은 sysroot·multilib·libc 선택이라는 독립적인 문제를 풀어 유지 가치가 높다. 다만 다운로드 URL과 버전, 설치 후 `--print-sysroot`·`-v` 출력 같은 재현 증거를 고정해야 한다.
- compile pipeline·ELF·linker 글은 서로 연결되지만 각각 전처리/오브젝트 분석/메모리 배치라는 독립 질문이 있다. 공통 정의를 반복하기보다 `readelf`, map file, 실제 section 배치 결과를 차별화해야 한다.
- advanced linker·startup·crt 글은 부팅과 링크의 실제 장애를 다루므로 유지 후보로 분류한다. 특정 GCC/newlib/MCU에 종속되는 지점을 명시하면 신뢰도가 올라간다.
- memory barrier는 코드가 길다는 사실보다, 각 barrier 선택이 필요한 관찰 순서·DMA·MMIO·SMP 조건을 실행 가능한 litmus test로 입증하는 것이 우선이다.
- 이번 평가는 점수 기록만 수행했다. 원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md` 앵커 네 편을 기준으로 10편을 원문 전체를 읽고 다시 채점했다. 모든 글은 `score_status: 잠정`이다. P0는 찾지 못했다(확인 범위는 원문 본문과 내부 링크 대상의 존재·라벨까지이고, 렌더링·광고 배치는 보지 않았다). factcheck는 git 이력 기준으로 모두 `미검증`에서 출발했고, 같은 글 안의 모순만 두 줄 번호를 근거로 `오류 확인`으로 올렸다. 외부 자료는 가져오지 않았다. 줄 번호는 2026-10-11 기준 원문 줄이다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part2-08-arm-mmu.md` | 10 | 11 | 6 | 10 | 5 | 6 | 1 | 49 | 오류 확인 | 우선 조치 | 중간 | part1-04-uart-hardware.md |
| `part2-09-trustzone-m.md` | 9 | 8 | 4 | 7 | 6 | 5 | 1 | 40 | 미검증 | 병합 검토 | 중간 | part6-09-isr-api.md |
| `part2-10-memory-barrier.md` | 12 | 12 | 6 | 9 | 6 | 3 | 1 | 49 | 오류 확인 | 우선 조치 | 중간 | part6-09-isr-api.md |
| `part3-01-cross-compiler.md` | 11 | 12 | 7 | 10 | 6 | 6 | 2 | 54 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part3-02-compile-pipeline.md` | 10 | 12 | 7 | 10 | 7 | 6 | 1 | 53 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part3-03-elf-format.md` | 10 | 11 | 8 | 11 | 6 | 5 | 1 | 52 | 미검증 | 병합 검토 | 중간 | part1-04-uart-hardware.md |
| `part3-04-linker-script-basics.md` | 11 | 13 | 8 | 9 | 7 | 6 | 1 | 55 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part3-05-linker-script-advanced.md` | 12 | 12 | 8 | 10 | 6 | 6 | 1 | 55 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part3-06-startup-code.md` | 11 | 13 | 8 | 8 | 7 | 5 | 1 | 53 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part3-07-c-runtime.md` | 12 | 12 | 8 | 8 | 5 | 5 | 1 | 51 | 오류 확인 | 우선 조치 | 중간 | part1-04-uart-hardware.md |

점수 구간만 보면 10편 모두 40~59(`병합 검토`)다. `우선 조치` 세 편은 점수와 무관하게 factcheck 게이트로 정해졌다.

### part2-08-arm-mmu.md

factcheck `오류 확인`: 79행은 "fork() 시 page table을 copy하고 COW로 lazy 복제"라고 하고, 81행은 "parent와 child의 `mm_struct`가 같은 page table을 share"한다고 한다. 같은 글 안에서 fork 시 page table을 복사하는지 공유하는지가 서로 어긋난다. 보조 근거로 133행은 "IOMMU가 있으면 물리주소와 다를 수 있음"이라 하고 183행은 "DMA는 물리 주소를 쓰므로"라고 단정한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 4-level 분할(42~46행)과 PTE 비트 표(66~73행)는 아키텍처 입문 내용이다. "Cortex-A53:" 소제목(54행) 아래에 수치 대신 "확인해야 합니다"(56행), "달라집니다"(58행)만 있어 일반론으로 본다. DMA 가상 주소·kmalloc 단편화 함정(157~163행)이 그나마 고유하다. |
| B | 11 | 주소 변환 → TLB → attribute → Linux → page fault → 함정 흐름은 갖췄다. ASID는 함정 한 줄(175행)뿐이고 TLB 절은 내용이 비어 있다. |
| C | 6 | mmap 예제(98~108행)와 `/proc` 명령(113~122행)은 있으나 예상 출력이 없다. 140~146행 Cortex-A72 cycle 표는 출처·측정 환경이 없다. |
| D | 10 | 7-09 `mmap`이 anonymous mmap을, 8-04 `dma-allocator`가 `dma_alloc_coherent`(126~136행)를 따로 다룬다. MMU 개념 글로서의 역할은 남는다. |
| E | 5 | 제목은 "분석 — Translation Table·TLB·ASID"인데 본문은 개념 소개 수준이고 ASID는 175행 한 문단이다(루브릭 E 주석: 3~5점). |
| F | 6 | 186행 다음 편(TrustZone-M)이 seriesOrder 21과 맞고 관련 링크 4개(190~193행)의 라벨과 대상이 일치한다. 그 밖의 고유 구조는 없다. |
| G | 1 | ARM ARM·커널 문서 링크가 없고 대상 코어·커널 버전 표기가 없다. |

uncertainties:
- 140~146행 TLB hit·walk cycle 수치와 167행 "8 KB 이상이면 guard를 건너뜀"은 출처 없는 수치다.
- 85행 "PTE 없음 → page fault"인데 표(90행)의 COW write는 PTE가 있는 경우라 흐름 설명과 표가 어긋나 보인다.

### part2-09-trustzone-m.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | S/NS/NSC 표(45~49행)와 SAU/IDAU 설명은 입문 자료 수준이다. 39행 "Armv8-M 프로파일과 구현을 확인해야 합니다", 58행 "AND 또는 OR", 166행 "데이터시트 확인"처럼 핵심 규칙을 완곡 표현으로 둔다. |
| B | 8 | NS 이미지 빌드(138~140행)에 import library를 만드는 단계가 없고, 112행은 NS reset handler를 호출하는 방법이 불완전해 secure boot 예제가 끝까지 이어지지 않는다. 172행 함정 제목(stack 누적)과 본문(register clean)도 다르다. |
| C | 4 | 측정 표(145~150행) 네 칸이 모두 "구현·메모리 상태에 따라 상이"라 내용이 없다(루브릭 3-1). 실행 보드·toolchain 버전이 없다. |
| D | 7 | 12-11 `tfm-trustzone`이 SAU 설정(244~264행), NSC veneer·SG(37~44행), cmse 함정(304~314행)을 더 자세히 다룬다. 이 글만의 내용은 PRIS 함정(176~178행) 정도다. |
| E | 6 | 제목의 MPC는 본문에 한 번도 나오지 않는다. 나머지 키워드는 다루므로 부분 미이행으로 6~8 구간 하단을 줬다. |
| F | 5 | 195행 "Practical RTOS Internals: Secure RTOS" 링크가 Secure RTOS 글이 아니라 `00-preface`로 간다. 라벨과 대상이 다른 링크라 5점 상한을 적용했다. 다음 편 안내(188행)는 seriesOrder 22와 맞다. |
| G | 1 | Armv8-M ARM·CMSE 문서 링크와 대상 칩(96행 STM32L5 언급 외) 버전 표기가 없다. |

uncertainties:
- 112행 `(ns_func_t)(0x08040000 + 4)`는 vector table 항목 주소 자체를 함수 포인터로 쓴다. reset handler 값을 읽어야 하는지 1차 자료로 확인하지 않았다.
- 162행 "NS가 S 영역 접근 시 BusFault"는 12-11 35행의 "SecureFault"와 다르다(다른 글 사이 불일치라 게이트에는 넣지 않았다).
- 81행 "함수가 NSC 영역에 컴파일"과 92행 PRIS 동작 설명은 미확인이다. 154~156행 region 수는 출처가 없다.

병합 대상: `part12-11-tfm-trustzone.md`. TrustZone-M 기초 절로 흡수하고, 이 URL은 리다이렉트 후보로 둔다.

### part2-10-memory-barrier.md

factcheck `오류 확인`: 232행은 "전체 흐름은 5 단계입니다"라고 한 뒤 같은 줄에서 write·D-cache flush·I-cache invalidate·DSB·ISB·jump 여섯 항목을 나열한다. 바로 위 코드(211~228행)의 주석은 1~4단계다. 보조 근거로 304행 "Cortex-M single core에서는 MMIO·DMA·atomic에만 씁니다"는 같은 글의 ISR↔Task DMB 예(42~57행)와 CONTROL·MPU·FPU 뒤 ISB 목록(99~104행)과 어긋난다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | VTOR 변경(234~243행), CPACR 뒤 DSB+ISB(106~113행), M7 D-cache와 DMA(187~205행), 멀티코어 wakeup(245~259행)처럼 상황별 예제가 있다. 비용 칸(19~23행)은 전부 "상이"이고 68행은 "Arm의 정의를 확인해야 합니다"로 끝나 20점대에는 못 미친다. |
| B | 12 | DMB·DSB·ISB 각각의 사용 시점과 함정까지 있다. Cortex-M3/M4 특성(133~137행)은 근거 없이 단정하고, 정리(304행)가 본문과 어긋나 결론이 흔들린다. |
| C | 6 | 코드 조각은 많지만 어떤 코어·컴파일러에서 확인했는지 없고, barrier 유무에 따른 관찰 결과나 litmus 절차가 없다. |
| D | 9 | Lock-free queue 절(159~183행)은 9-01 `lock-free-ring` 주제를, clock enable 뒤 DSB(61~66행)는 4-02 `mmio-access` 93~98행을 반복한다. |
| E | 6 | 제목·본문은 barrier 사용 시점을 향하지만 MMIO는 61~66행 한 예뿐이고 "실전"에 비해 실제 장애 사례가 없다. |
| F | 3 | 310행 "다음 편은 Wait-Free"인데 seriesOrder 23은 `part3-01-cross-compiler`다. 314행 "2-03: Priority Inversion"은 `part6-10`으로, 315행 "2-05: Wait-Free"는 `part9-02`로 가서 번호 라벨이 틀렸다. |
| G | 1 | Arm 아키텍처 매뉴얼·CMSIS 문서 링크가 없고 대상 코어 표기가 없다. |

uncertainties:
- 296행 "Cortex-M에는 share domain 개념 없음"과 136행 "No store buffer reorder for same address"는 미확인이다.
- 162~183행 ring은 `head`/`tail`을 일반 변수로 두고 DMB만 쓴다. 33행 "DMB 하나가 C/C++ atomic을 대체하지 않는다"와 어떻게 맞는지 본문에 설명이 없다.

### part3-01-cross-compiler.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | triplet 표(30~37행), multilib 출력(82~90행), libc 선택 표(62~68행)는 정리가 좋지만 입문서와 같은 내용이다. 111행 "toolchain 배포 방식에 따라 확인해야 합니다"는 일반론이다. |
| B | 12 | 설치 → 빌드 → bin 추출 → CMake까지 흐름은 완성됐다. 제목의 Clang은 177행 표 한 칸("LLVM Embedded")뿐이고, Linux sysroot는 105~109행 한 예로 끝난다. |
| C | 7 | 버전 출력(131행)과 size 출력(152~153행, 1248+16+32=1296=0x510으로 맞음)이 있다. 다운로드 URL(125행)이 `...` 자리표시자고, 181~186행 libc 크기 표는 네 칸 모두 "달라짐"이라 내용이 없다. |
| D | 10 | CMake toolchain file(158~170행)이 3-11 82~96행과 거의 같다. triplet·multilib·libc 선택은 이 글만의 역할이다. |
| E | 6 | 제목의 Clang을 다루지 않는다. GCC·sysroot는 다루므로 부분 미이행으로 봤다. |
| F | 6 | 218행 다음 편(컴파일 4단계)이 seriesOrder 24와 맞고 관련 링크 4개의 라벨·대상이 일치한다. 템플릿 외 고유 구조는 없다. |
| G | 2 | 131행에 Arm GNU Toolchain 13.3.Rel1 버전이 있다. 공식 다운로드·문서 링크는 없다. |

uncertainties:
- 54행 `arm-none-eabi-newlib`를 도구 binary로 적었다. 실제 실행 파일 이름인지 미확인.
- 66행 "picolibc — newlib-nano 후속", 174~179행 toolchain 크기 수치는 출처가 없다.
- 198행 함정 제목(Library search path 누락)과 본문(nosys.specs)이 다르다.

병합 대상: 병합 대상 없음. 독립 질문(triplet·multilib·libc 선택)이 있으므로 `보강`으로 다룬다. 다음 조치는 Clang 절 추가 또는 제목 축소, libc 크기 표를 실측하거나 TBD로 정리, 158~170행은 3-11 링크로 대체.

### part3-02-compile-pipeline.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 4단계 표(34~39행)와 `-E/-S/-c` 표(43~48행)는 GCC 입문 내용이다. `-dM`·`-H`·`-fdump-tree-einline`(128~160행)이 작은 고유 팁이다. |
| B | 12 | 단계별 입력·출력과 명령이 끝까지 이어진다. 단계를 분리해 실제 링크 오류를 추적하는 사례는 없다. |
| C | 7 | 단계마다 명령과 출력 예가 있다. 87행은 최적화 옵션 없이 컴파일하는데 92~93행 출력은 최적화된 2줄짜리라 출력이 재현될지 판단하기 어렵다. 164~169행 측정 표는 헤더에 "예시 측정"이라고 써 놓고 칸은 모두 "달라짐"이다. |
| D | 10 | `objdump -h`(116행)는 3-03과, `-O0` vs `-O2` diff(142~147행)는 3-09와 겹친다. 단계 분해라는 질문은 이 글만의 것이다. |
| E | 7 | 제목의 "추적"을 `-E/-S/-c` 명령으로 실제 수행하고 description과도 맞는다. |
| F | 6 | 207행 다음 편(ELF)이 seriesOrder 25와 맞고 관련 링크가 모두 일치한다. 템플릿 외 고유 구조는 없다. |
| G | 1 | GCC 문서 링크와 사용한 GCC 버전이 없다. |

uncertainties:
- 136~137행 `-H` 출력의 `/usr/include/stdint.h` 경로가 arm-none-eabi toolchain 출력인지 미확인.
- 119~121행 `.data`·`.bss` 크기는 main.c(54~62행)에 전역 변수가 없어 startup.o에서 온 것인지 설명이 없다.

병합 대상: 병합 대상 없음. 3-01과 도구 표가 일부 겹치지만 검색 의도가 다르다. 다음 조치는 `보강`(측정 표를 지우거나 실측, 87행 명령과 출력 일치).

### part3-03-elf-format.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | ELF 구조 표(28~37행)와 section 표(50~60행)는 표준 설명이다. relocation 예(82~88행)가 짧은 고유 예제다. 46행 "section header는 어디서 만들어졌나"는 부정확한 비유다. |
| B | 11 | header → section → symbol → relocation → readelf까지 흐름은 있다. 제목의 DWARF는 36·58행 표 칸과 184~186행 함정 한 문단뿐이다. |
| C | 8 | `readelf -h/-S/-l` 출력(96~121행)이 서로 맞물린다(.text 0x1234+.rodata 0x100=LOAD FileSiz 0x1334, .data 0x80+.bss 0x200=MemSiz 0x280). 어떤 빌드에서 나온 출력인지 환경이 없다. |
| D | 11 | `nm --size-sort`(125행)는 3-10 125행과 같다. ELF 구조라는 질문은 독립적이다. |
| E | 6 | 제목 키워드 중 DWARF를 거의 다루지 않는다. 부분 미이행이다. |
| F | 5 | 211행 "Embedded C++ for Real Systems: ELF 분석" 링크가 ELF 글이 아니라 `00-preface`로 간다. 5점 상한을 적용했다. 다음 편(204행)은 seriesOrder 26과 맞다. |
| G | 1 | ELF·DWARF 명세 링크가 없다. |

uncertainties:
- 121행 두 번째 LOAD의 PhysAddr `0x080013B4`는 첫 LOAD 끝(0x08001334)과 0x80 차이가 난다. 사이에 다른 section이 있는지 출력에 없어 판단하지 못했다.
- 178행 "ELF를 그대로 쓰면 flash 크기를 초과"는 일반화다.

병합 대상: 병합 대상 없음. 다음 조치는 `보강`(DWARF 절 추가 또는 제목 축소, 211행 링크 수정).

### part3-04-linker-script-basics.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | MEMORY·SECTIONS·패턴 표(99~104행)는 ld 문서 요약이다. `*(.text)`와 `*(.text*)` 차이 함정(299~301행)과 BOOT/APP/CCM/BACKUP 분할 예(75~82행)가 실용적이다. |
| B | 13 | 최소 스크립트 → MEMORY → SECTIONS → VMA/LMA → symbol → ALIGN → 실제 스크립트 → 빌드까지 기본 흐름이 완성됐다. |
| C | 8 | STM32F4용 전체 스크립트(178~249행)와 빌드 명령(253~261행)이 있다. map 출력이나 `size` 결과 예가 없다. |
| D | 9 | `copy_data`/`zero_bss`(147~159행)가 3-06 183~200행·4-01 88~101행과 거의 같고, VMA/LMA 설명이 3-05 26~33행에서 되풀이된다. |
| E | 7 | 제목과 본문이 같은 질문을 향한다. "entry point"는 `ENTRY` 한 줄(29행)뿐이다. |
| F | 6 | 311행 다음 편(링커 고급)이 seriesOrder 27과 맞고 관련 링크도 일치한다. 120행 "다음 편에서 자세히 다룹니다"는 복사를 다루는 3-06을 가리키는 듯해 311행과 어긋난다. |
| G | 1 | GNU ld 문서 링크가 없다. |

uncertainties:
- 120행이 말하는 "다음 편"이 3-05인지 3-06인지 본문에서 확정할 수 없다. 3-05 62~72행이 `.ramfunc` 복사를 다루므로 5점 상한은 적용하지 않았다.
- 81행 BACKUP SRAM 주소 `0x40024000`은 칩 문서로 확인하지 않았다.

병합 대상: `part3-05-linker-script-advanced.md`. 기초·고급을 한 글로 합치고 VMA/LMA·KEEP 중복을 없애는 안을 검토한다.

### part3-05-linker-script-advanced.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | `.ramfunc` 배치와 복사(39~72행), BKP SRAM NOLOAD(80~98행), A/B 주소 분할(104~112행), M7 non-cacheable DMA buffer(148~175행), VTOR RAM 재배치(179~198행)처럼 실제 펌웨어 배치 문제를 다룬다. 74·142행은 "측정해야 합니다"로 끝난다. |
| B | 12 | 기법별 스크립트와 함정은 있다. 제목의 init_array는 본문에 없고 BSS는 NOLOAD 설명으로만 간접 등장한다. |
| C | 8 | 스크립트와 코드가 구체적이고 주소 산술이 맞는다(0x08008000+496K=0x08084000, 256×4=1024). 측정 표(202~207행)는 효과·비용의 정성 서술뿐이다. |
| D | 10 | LMA/VMA 복습(26~33행)과 gc-sections/KEEP(130~140행)이 3-04 106~120·270~285행과 겹친다. 나머지 기법은 이 글만의 것이다. |
| E | 6 | 제목 키워드 넷 중 init_array는 다루지 않고 BSS는 거의 다루지 않는다. 범위 불일치가 아니라 부분 미이행으로 봤다. |
| F | 6 | 249행 다음 편(스타트업)이 seriesOrder 28과 맞고 관련 링크가 일치한다. 템플릿 외 고유 구조는 없다. |
| G | 1 | GNU ld 문서·칩 reference manual 링크가 없다. |

uncertainties:
- 194행 `ALIGN(512)`이 256 entry(1024 byte) vector table의 VTOR 정렬 조건을 만족하는지 미확인.
- 114행 "같은 binary가 A에도 B에도"와 "빌드 시 slot 결정"이 같은 문장 안에서 다른 방식을 말한다.

병합 대상: `part3-04-linker-script-basics.md`(위와 같은 병합 안).

### part3-06-startup-code.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | ITTT를 쓴 어셈블리 Reset_Handler(68~114행)와 증상별 상황(19~22행)이 있다. 118·147·245·253행은 "구성에 따라 달라질 수 있습니다", "확인해야 합니다"로 구체 기준을 대신한다. |
| B | 13 | 전원 → main 10단계(28~37행), vector table, Reset_Handler, `__libc_init_array`, SystemInit, C 버전 startup까지 완결된다. |
| C | 8 | C startup 전체(167~214행)가 있다. 218~224행 시간 표는 "예시 측정; Cortex-M4 @ 168 MHz"라 적었지만 측정 방법·보드가 없고, 265행은 "측정해야 합니다"라고 해 표와 어긋난다. |
| D | 8 | `__libc_init_array` 구현(120~131행)과 `Sensor` 예(135~143행)가 3-07 98~107·177~181행과 같다. C startup은 4-01 88~101행과 거의 같다. |
| E | 7 | Reset_Handler·Vector Table·SystemInit을 모두 다룬다. |
| F | 5 | 274행 "Embedded C++ for Real Systems: 초기화 순서" 링크가 `00-preface`로 간다. 5점 상한을 적용했다. 다음 편(267행)은 seriesOrder 29와 맞다. |
| G | 1 | CMSIS·Armv7-M 문서 링크가 없다. |

uncertainties:
- 157행 "(보통 클럭은 main에서 설정)"과 161행 "ST는 PLL 설정까지", 221행 "SystemInit (PLL) 2 ms"가 서로 다른 전제를 쓴다. vendor별 차이로 읽힐 여지가 있어 오류로 보지 않았다.
- 220~224행 시간 수치와 229~231행 크기 수치는 출처가 없다.

병합 대상: `part3-07-c-runtime.md`. 두 글이 `.data`/`.bss`/`init_array`를 나눠 답하므로 "Reset에서 main까지" 한 글로 합치는 안을 검토한다.

### part3-07-c-runtime.md

factcheck `오류 확인`: 15행은 "Linux 환경의 startup도 본질은 `.data` 복사와 `.bss` 클리어"라고 하는데, 47~49행 `_start` 주석은 Linux에서는 stack·argc/argv를 준비하고 ".data 복사, .bss 클리어"는 "(bare)"의 경우라고 구분한다. 같은 글 안에서 Linux startup의 역할이 서로 다르다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | crt0/crti/crtbegin 표(30~37행), `_write`·`_sbrk` stub(116~148행), `printf` 호출 경로(156~166행), constructor priority 순서 예(170~191행)가 이 글의 고유 내용이다. 61·92·110행은 "달라집니다", "확인해야 하며"로 끝난다. |
| B | 12 | init_array·syscall stub·specs 옵션까지 흐름은 있다. 제목의 Stack·BSS Zero·Data Copy는 47~49행 주석뿐이다. |
| C | 8 | stub 코드가 바로 쓸 수 있는 수준이다. 203~208행 크기 표는 헤더가 한 열이고 행은 두 열이라 렌더링이 깨질 수 있고, 칸은 모두 "달라짐"이다. |
| D | 8 | `__libc_init_array`(98~107행)와 `Sensor`(177~181행)가 3-06과 같고, `_sbrk`(129~140행)는 3-08 54~67행과 같은 질문을 다룬다. |
| E | 5 | 제목 키워드 넷 중 셋(Stack·BSS Zero·Data Copy)은 주석으로만 나오고, 본문 중심인 syscall stub은 제목에 없다. 독자가 얻는 결과가 제목과 달라 3~5 구간으로 봤다. |
| F | 5 | 248행 "Embedded C++ for Real Systems: static 초기화" 링크가 `00-preface`로 간다. 다음 편(241행)은 seriesOrder 30과 맞다. |
| G | 1 | newlib·GCC 문서 링크와 버전이 없다. |

uncertainties:
- 92행 "priority 없는 TU 간 순서를 가정하지 말라"와 226행 "priority 없으면 link 순서"가 다른 강도로 말한다.
- 226행 priority 범위 101~65535, 150행 nosys.specs 설명은 미확인이다.

### 시리즈 공통 문제

- 관련 글·다음 편 라벨이 실제 대상과 다름: `part2-09-trustzone-m.md`(195행), `part2-10-memory-barrier.md`(310·314·315행), `part3-03-elf-format.md`(211행), `part3-06-startup-code.md`(274행), `part3-07-c-runtime.md`(248행). 다른 시리즈의 특정 주제 라벨을 단 "더 깊이" 링크가 시리즈 `00-preface`로 가는 유형이 네 편이다.
- 측정·비교 표를 "달라짐"·"상이" 문구로 채움: `part2-09-trustzone-m.md`(145~150행), `part2-10-memory-barrier.md`(19~23행 비용 열), `part3-01-cross-compiler.md`(181~186행), `part3-02-compile-pipeline.md`(164~169행), `part3-07-c-runtime.md`(203~208행).
- 제목 키워드 일부를 본문이 다루지 않음: `part2-09-trustzone-m.md`(MPC), `part3-01-cross-compiler.md`(Clang), `part3-03-elf-format.md`(DWARF), `part3-05-linker-script-advanced.md`(init_array·BSS), `part3-07-c-runtime.md`(Stack·BSS Zero·Data Copy).
- `.data` 복사·`.bss` 클리어·`__libc_init_array` 코드가 여러 글에 반복됨: `part3-04-linker-script-basics.md`(147~159행), `part3-05-linker-script-advanced.md`(64~72행), `part3-06-startup-code.md`(86~107·183~200행), `part3-07-c-runtime.md`(98~107행).
- 본문에 1차 출처 링크가 없음: 10편 전부. G가 2인 글은 버전을 적은 `part3-01-cross-compiler.md` 하나다.
- 같은 H2 뼈대(한 줄 요약·어떤 상황에서 쓰나·핵심 개념·코드 / 실제 사용 예·측정 / 비교·자주 보는 함정·정리·관련 항목): `part2-10-memory-barrier.md`를 뺀 9편. 루브릭 9절 사이트 게이트의 scaled content 수치에 넣을 항목이다.
