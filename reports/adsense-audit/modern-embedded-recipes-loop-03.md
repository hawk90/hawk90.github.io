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

