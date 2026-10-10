# Modern Embedded Recipes — 루프 03 (seriesOrder 20~29)

> 분석 단계: 루브릭 기반 검사·분류 1차  
> 대상: 공개 글 10편  
> 기준: AdSense 공개 글 평가 루브릭  
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음

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

