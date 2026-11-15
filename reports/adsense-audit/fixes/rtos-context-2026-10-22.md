# RTOS context 전환 4편 수정 기록

재채점하지 않았다. [기존 평가](../published-loop-36.md)는 보존하며 아래 기록은 선언한 수정·검증 범위만 나타낸다.

## 실행 범위

- `node scripts/verify-rtos-context-examples.mjs`: [실행 로그](rtos-context-examples-2026-10-22.log). Homebrew Clang **23.1.4**. 공식 CM4F·CA9 port object, 본문 named M0/RV32/A64/PendSV/인코딩 예제 검사.
- M0 32표본/RV32 64표본은 원문 명령 일부를 해석하는 **호스트 모델**이며 CPU 예외 진입·복귀 실행을 의미하지 않는다. RV32의 이전 128B 할당 변형은 의도한 범위외 거부를 확인했다.
- [publish gate](rtos-context-gate-2026-10-22.log): 차단 검사 통과. clone-dependent symbol/upstream 검사는 SKIPPED이며 PASS가 아니다.
- 그림: [빌드](rtos-context-diagram-2026-10-22.log), [strict bbox](rtos-context-diagram-strict-2026-10-22.log) overlap0/touch0. 최초 TeX underscore 오류·자동 줄바꿈 겹침을 수정 후 재검사했다.
- 전체 사이트 검사는 공통 checkpoint에서 수행한다. 보드 IRQ/FP/중첩, 실제 RV trap/mret, firmware link, page table 변경, GIC·controller 동작과 시간 상한은 미실행이다.

## part2-04-context-switch.md

상태: remediated. before SHA: `8c692d94024bef4fbfa10cc95b496e9804cfb99f7251b4a4bf0c3ee273017409`. after SHA: `f37151ea32f3245144aba01ce23c91acceaa219c767c2a23eed1e2cb01a76aa4`.

- **맥락·범위**: 공개 Practical RTOS Internals 컨텍스트 전환 part2-04-context-switch.md
- **문제 신호**: 전체 CPU 가시 상태 저장으로 일반화, 16word/17word 혼용, FP reserved 누락, TCB 갱신을 포인터 한 개로 단정, 측정 근거 없는 시간표
- **반증 조건**: 동일 ISA·ABI·태그에서 실제 다른 계약과 실행 증거가 있다면 해당 범위로 재검토하며 단순 문체·제목만으로 결함 판정하지 않음
- **원인·대안**: 서로 다른 ISA/port의 축약 예제를 실제 구현과 혼합. 기존 장의 질문은 보존하고 원본 태그와 교육용 모델을 분리하는 작은 범위 수정 선택
- **증거**: ARM_CM4F V11.2.0 실제 port.c의 초기 stack/SVC/PendSV 대조. 기본 HW8+SW9=68B, FP HW18+SW16 추가136B로 일치. 공식 포트 object에서 r14 저장/복원과 조건부 FP 확인.
- **표본**: 2026-10-22 macOS arm64, Homebrew Clang23.1.4. 네 편 전문과 published-loop-36 대조. 원문 named fences·실제 FreeRTOSV11.2.0 두 ARM 포트 object·어려운 범위외 실패 사례 확인
- **결정**: 확인 오류를 본문에서 수정. 기존 A–G/총점/판정/factcheck 보존, 재채점 없음
- **최소 변경·롤백**: 네 편 본문과 기존 Cortex-M 그림 TeX/SVG 한 쌍 및 전용 검증·기록. 04/06/07 description과 06 title은 실제 범위 오류를 장별 수동 정정. URL/date/draft/order 보존, 파일별 diff로 롤백 가능
- **검증**: verify-rtos-context-examples.mjs exit0; gate 차단검사/math/diff 통과; 그림 build 및 strict bbox overlap0/touch0. upstream clone-dependent 검사는 SKIPPED로 구분
- **잔여 위험**: 실제 MCU IRQ·FP·중첩·MRET, 펌웨어 링크, MMU page table 변경·GIC·controller, latency/WCET는 미실행. 실제 타깃 도입 또는 포트/ABI 변경 전 재확인

## part2-05-cortex-m-context.md

상태: remediated. before SHA: `33715dad32a068401388b6e68000174abe43175c8f09482f91f76e225d6e5a24`. after SHA: `c8291bc4148734afa5f6a10adff235d82ee6f1fa63fe35dfa21186ad9e3aef3a`.

- **맥락·범위**: 공개 Practical RTOS Internals 컨텍스트 전환 part2-05-cortex-m-context.md
- **문제 신호**: M4F EXC_RETURN 슬롯 누락, M0 원래 R4–R7 파괴, SHPR 레지스터·BASEPRI 인코딩·FPCA 혼동
- **반증 조건**: 동일 ISA·ABI·태그에서 실제 다른 계약과 실행 증거가 있다면 해당 범위로 재검토하며 단순 문체·제목만으로 결함 판정하지 않음
- **원인·대안**: 서로 다른 ISA/port의 축약 예제를 실제 구현과 혼합. 기존 장의 질문은 보존하고 원본 태그와 교육용 모델을 분리하는 작은 범위 수정 선택
- **증거**: 원문 named fence의 M0 R4–R11 저장·복원 모델 32표본; 실제 Cortex-M0 object 생성. PENDSVSET 및 BASEPRI 인코딩 C11 컴파일. 공식 ARM_CM4F port.c 전체 object 생성 후 EXC_RETURN/FP 명령 확인. 그림 주소 순서·9word SW·MSP/PSP 수정.
- **표본**: 2026-10-22 macOS arm64, Homebrew Clang23.1.4. 네 편 전문과 published-loop-36 대조. 원문 named fences·실제 FreeRTOSV11.2.0 두 ARM 포트 object·어려운 범위외 실패 사례 확인
- **결정**: 확인 오류를 본문에서 수정. 기존 A–G/총점/판정/factcheck 보존, 재채점 없음
- **최소 변경·롤백**: 네 편 본문과 기존 Cortex-M 그림 TeX/SVG 한 쌍 및 전용 검증·기록. 04/06/07 description과 06 title은 실제 범위 오류를 장별 수동 정정. URL/date/draft/order 보존, 파일별 diff로 롤백 가능
- **검증**: verify-rtos-context-examples.mjs exit0; gate 차단검사/math/diff 통과; 그림 build 및 strict bbox overlap0/touch0. upstream clone-dependent 검사는 SKIPPED로 구분
- **잔여 위험**: 실제 MCU IRQ·FP·중첩·MRET, 펌웨어 링크, MMU page table 변경·GIC·controller, latency/WCET는 미실행. 실제 타깃 도입 또는 포트/ABI 변경 전 재확인

## part2-06-cortex-a-context.md

상태: remediated. before SHA: `9b0abc10a0fb540fe06fbb55f2738d2bcdd6f740e43def599252af15078e65cd`. after SHA: `62048fd4fb93a406c0ab9c2850edbd34328e2358c3b6b042cc9afa04d0c1b411`.

- **맥락·범위**: 공개 Practical RTOS Internals 컨텍스트 전환 part2-06-cortex-a-context.md
- **문제 신호**: AArch32 설명에 AArch64 TLBI·EL3 혼용, User/System SP 공유 누락, 실제 포트와 다른 가상 복원 경로
- **반증 조건**: 동일 ISA·ABI·태그에서 실제 다른 계약과 실행 증거가 있다면 해당 범위로 재검토하며 단순 문체·제목만으로 결함 판정하지 않음
- **원인·대안**: 서로 다른 ISA/port의 축약 예제를 실제 구현과 혼합. 기존 장의 질문은 보존하고 원본 태그와 교육용 모델을 분리하는 작은 범위 수정 선택
- **증거**: 공식 V11.2.0 ARM_CA9 portASM.S 전체 cross-assembly 및 SRS/RFE·실존 handler 심볼 확인. 원문 named AArch64 TLBI는 A64 compile 성공, A32 compile 실패. User/System SP·LR 공유 및 Monitor/EL3 범위 구분.
- **표본**: 2026-10-22 macOS arm64, Homebrew Clang23.1.4. 네 편 전문과 published-loop-36 대조. 원문 named fences·실제 FreeRTOSV11.2.0 두 ARM 포트 object·어려운 범위외 실패 사례 확인
- **결정**: 확인 오류를 본문에서 수정. 기존 A–G/총점/판정/factcheck 보존, 재채점 없음
- **최소 변경·롤백**: 네 편 본문과 기존 Cortex-M 그림 TeX/SVG 한 쌍 및 전용 검증·기록. 04/06/07 description과 06 title은 실제 범위 오류를 장별 수동 정정. URL/date/draft/order 보존, 파일별 diff로 롤백 가능
- **검증**: verify-rtos-context-examples.mjs exit0; gate 차단검사/math/diff 통과; 그림 build 및 strict bbox overlap0/touch0. upstream clone-dependent 검사는 SKIPPED로 구분
- **잔여 위험**: 실제 MCU IRQ·FP·중첩·MRET, 펌웨어 링크, MMU page table 변경·GIC·controller, latency/WCET는 미실행. 실제 타깃 도입 또는 포트/ABI 변경 전 재확인

## part2-07-riscv-context.md

상태: remediated. before SHA: `6c1eb4880b143d45ef10e1e80ffd88b548277008c6f940b2629b052a3ec74796`. after SHA: `3f9ab0a1ebc49a9b9c8c96f9f60feb2c8a359bac6d3a6a30bb8124e42bd9fead`.

- **맥락·범위**: 공개 Practical RTOS Internals 컨텍스트 전환 part2-07-riscv-context.md
- **문제 신호**: 128byte 확보 뒤 CSR을 경계 밖 기록, 스택 교환 후 SP를 원래 SP로 오인, 첫 태스크 복원 불완전·MCU timer 주소 일반화
- **반증 조건**: 동일 ISA·ABI·태그에서 실제 다른 계약과 실행 증거가 있다면 해당 범위로 재검토하며 단순 문체·제목만으로 결함 판정하지 않음
- **원인·대안**: 서로 다른 ISA/port의 축약 예제를 실제 구현과 혼합. 기존 장의 질문은 보존하고 원본 태그와 교육용 모델을 분리하는 작은 범위 수정 선택
- **증거**: 원문 named RV32I_Zicsr fence 실제 object 생성. 64표본 host instruction-subset 모델에서 call-clobber 뒤 31정수 레지스터/SP·CSR 복원 및 16B 정렬·모든 접근 경계 확인. 128B 할당 변형은 범위외 검사로 거부. 실제 trap/mret 실행은 아님.
- **표본**: 2026-10-22 macOS arm64, Homebrew Clang23.1.4. 네 편 전문과 published-loop-36 대조. 원문 named fences·실제 FreeRTOSV11.2.0 두 ARM 포트 object·어려운 범위외 실패 사례 확인
- **결정**: 확인 오류를 본문에서 수정. 기존 A–G/총점/판정/factcheck 보존, 재채점 없음
- **최소 변경·롤백**: 네 편 본문과 기존 Cortex-M 그림 TeX/SVG 한 쌍 및 전용 검증·기록. 04/06/07 description과 06 title은 실제 범위 오류를 장별 수동 정정. URL/date/draft/order 보존, 파일별 diff로 롤백 가능
- **검증**: verify-rtos-context-examples.mjs exit0; gate 차단검사/math/diff 통과; 그림 build 및 strict bbox overlap0/touch0. upstream clone-dependent 검사는 SKIPPED로 구분
- **잔여 위험**: 실제 MCU IRQ·FP·중첩·MRET, 펌웨어 링크, MMU page table 변경·GIC·controller, latency/WCET는 미실행. 실제 타깃 도입 또는 포트/ABI 변경 전 재확인

## 추가 확인

사용자가 질문한 AArch32와 AArch64 TLBI 비교는 기존 장의 ISA 경계 설명에 한정한다. 독립 글을 추가하지 않았고, 페이지 테이블/ASID/BBM의 상세 구현을 새로 다루지 않았다.
