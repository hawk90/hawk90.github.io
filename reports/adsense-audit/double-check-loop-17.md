# 공개 글 평가 독립 재검토 — 루프 17

> independent_review: completed
> 검토일: 2026-10-18. 원문 변경 없음.
> 대상: 기존 `published-loop-17.md`의 10편. 원문 10편 전문, 아래 D 비교 구간, 내부 링크 대상의 제목·공개 상태·seriesOrder를 직접 확인했다.
> 기준: 루브릭 v1.2. `score_status: 잠정`, `confidence: 중간`(10편 공통).
> P0: 원문 범위에서 확인하지 못함. 광고·모바일 렌더링은 검사하지 않음.

blockers: 표에서 `factcheck: 오류 확인`인 6편은 정확성 게이트 차단이며, 나머지 4편에서 확인한 P0 차단은 없다. 정책을 전수 보증한다는 뜻은 아니다.

기존 평균 48.6점에서 48.7점으로 조정한다. 점수 자체는 대체로 타당하지만, J-Link 예시 출력의 합계와 metrics의 0μs 버킷에서 기존 평가가 놓친 내부 불일치를 확인했다. 두 편의 factcheck를 `오류 확인`, 판정을 `우선 조치`로 바꾼다. A~G 1점 차이는 판정 경계나 명시적 상한을 제외하면 평가 재량이며 객관적 정답처럼 해석하지 않는다.

앵커는 현재 수정본과 혼동하지 않도록 `git show 10550ca1:src/content/blog/embedded/modern-recipes/<파일>`의 UART·ISR API·커널 빌드·기존 part12-10 LLM 네 편을 읽었다. 본 보고서의 `anchor_ref`는 그 역사적 이름이다. 루프별 합계·상한·필드 형식 검사는 원문 독립 검토와 별개로 실행했다.

## 새 평가

표의 `embedded/`는 `src/content/blog/tools/debugging/embedded/`, `performance-engineering/`는 `src/content/blog/embedded/performance-engineering/`다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `embedded/chapter04-jlink.md` | 11 | 11 | 6 | 9 | 6 | 6 | 2 | 51 | 오류 확인 | 우선 조치 |
| `embedded/chapter05-elf-map.md` | 11 | 12 | 6 | 7 | 6 | 7 | 2 | 51 | 오류 확인 | 우선 조치 |
| `embedded/chapter06-trace.md` | 12 | 11 | 6 | 9 | 7 | 5 | 2 | 52 | 오류 확인 | 우선 조치 |
| `embedded/chapter07-rtos-troubleshooting.md` | 11 | 9 | 6 | 7 | 5 | 4 | 2 | 44 | 오류 확인 | 우선 조치 |
| `embedded/chapter08-cxl-link-debug.md` | 12 | 11 | 8 | 9 | 6 | 5 | 2 | 53 | 검증됨 | 병합 검토 |
| `embedded/chapter09-cxl-device-troubleshoot.md` | 14 | 12 | 9 | 9 | 7 | 7 | 3 | 61 | 검증됨 | 보강 |
| `performance-engineering/00-preface.md` | 9 | 8 | 3 | 10 | 6 | 4 | 2 | 42 | 미검증 | 보강 |
| `performance-engineering/part1-01-methodology.md` | 11 | 9 | 4 | 9 | 6 | 7 | 2 | 48 | 미검증 | 병합 검토 |
| `performance-engineering/part1-02-metrics.md` | 8 | 9 | 5 | 6 | 5 | 6 | 1 | 40 | 오류 확인 | 우선 조치 |
| `performance-engineering/part1-03-measurement.md` | 10 | 9 | 5 | 7 | 6 | 7 | 1 | 45 | 오류 확인 | 우선 조치 |

합계 487점. 판정은 우선 조치 6편, 병합 검토 2편, 보강 2편이다. `00-preface`는 허브 예외로 보강이다.

## 기존 평가와 차이

| 파일 | 이전 총점 | 새 총점 | 이전 판정 | 새 판정 | 변경 근거 |
| --- | ---: | ---: | --- | --- | --- |
| chapter04-jlink | 52 | 51 | 병합 검토 | 우선 조치 | C −1, load size 내부 합계 오류 추가 |
| chapter05-elf-map | 50 | 51 | 우선 조치 | 우선 조치 | F +1: 실제 진단 단계 구조 인정 |
| chapter06-trace | 53 | 52 | 우선 조치 | 우선 조치 | F −1: 다음 편에 없는 MMU 안내의 상한 적용 |
| chapter07-rtos-troubleshooting | 44 | 44 | 우선 조치 | 우선 조치 | 동의 |
| chapter08-cxl-link-debug | 53 | 53 | 병합 검토 | 병합 검토 | 동의 |
| chapter09-cxl-device-troubleshoot | 60 | 61 | 보강 | 보강 | F +1: 전제 링크·진단 순서 인정 |
| 00-preface | 42 | 42 | 보강 | 보강 | 동의, 현재 공개 57편(허브 포함)으로 근거 정정 |
| part1-01-methodology | 48 | 48 | 병합 검토 | 병합 검토 | 동의 |
| part1-02-metrics | 40 | 40 | 병합 검토 | 우선 조치 | 0μs 입력과 출력 구간의 내부 불일치 추가 |
| part1-03-measurement | 44 | 45 | 우선 조치 | 우선 조치 | F +1: 시계별 절 구분·함정 구조 인정 |

## 글별 재검토

### embedded/chapter04-jlink.md

source_file: `src/content/blog/tools/debugging/embedded/chapter04-jlink.md`

anchor_ref: `part1-04-uart-hardware.md`, `part7-05-kernel-build.md`

factcheck: 오류 확인. 152~155행 섹션 크기는 `0x1c0 + 0x9d20 + 0x4c0 + 0x140 = 42,208`바이트다. 156행은 같은 load의 총크기를 41,960으로 적는다. 총계가 열거한 부분 합보다 작으므로 외부 도구 지식 없이 확인되는 불일치다. 기존 평가가 기록하지 않았다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 126~132행 device 이름 함정, 333~370행 CI 흐름은 고유 관점이다. 60~122행 명령·옵션 목록이 중심이라 11. |
| B | 설치부터 GDB·RTT·CI·라이선스까지 흐름은 완성된다. 270~301행 J-Trace/Ozone은 얕고 예시 출력 오류가 있어 11. |
| C | 99~160행 실행 예와 335~370행 검증 분기는 있으나, 핵심 load 출력 합계가 틀리고 182~187행 속도 표는 측정 환경이 없다. 기존 7에서 6. |
| D | `gdb-lldb/chapter08-remote-debugging.md` 490~495행 GDB Server 출력 ↔ 이 글 99~104행, 515~522행 flash BP 절 ↔ 199~209행을 실제 대조했다. 같은 시리즈 ch06 246·288행 RTT 코드 ↔ 244~245행도 겹친다. 도구 체인 역할은 구별되어 9. |
| E | 2·5행의 도구들이 각 절에 있지만 중심은 명령 활용이며 13행의 압도적 안정성 주장은 근거가 없다. 6. |
| F | 416행 다음 장과 420~421행 관련 2개는 공개 파일·제목·번호가 맞는다. 30~31행 불완전 표와 224행 링크 없는 대괄호 안내 때문에 6. |
| G | 142행 supported-device 1차 링크, 39·47행 V7.94는 있다. 182~211행 속도·FPB 핵심 주장에 출처 연결이 부족해 2. |

uncertainties: 205~211행 UFBP SRAM/FP_REMAP 설명, 318~321행 adaptive clocking과 OpenOCD 비교, 350~358행 ELF verify 및 서버 종료 뒤 RTTClient 구동은 1차 자료로 새로 검증하지 않았다. 라이선스 문구도 별도 확인 대상이다.

병합 대상: gdb-lldb chapter08의 J-Link/RTT 절 및 같은 시리즈 chapter06의 RTT 절. 독립 도구 체인 의도가 있어 다음 조치는 오류 수정 후 차별화 보강이다.

### embedded/chapter05-elf-map.md

source_file: `src/content/blog/tools/debugging/embedded/chapter05-elf-map.md`

anchor_ref: `part1-04-uart-hardware.md`, `part7-05-kernel-build.md`

factcheck: 오류 확인 유지. 62행 첫 LOAD의 끝은 `0x08000000 + 0x09f80 = 0x08009f80`인데 67행은 .rodata부터 .fini_array까지 그 segment에 넣는다. 33~38행에서 이 섹션들은 0x0800a3b0까지다. 또한 501행 `47832+320+2048=50200`은 맞지만 같은 firmware.elf의 517~519행 flash 섹션 합은 41,888로 다른 예시와 일치하지 않는다. 후자는 생략 섹션 가능성이 있어 주근거로 쓰지 않는다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 296~369행 진단 네 가지와 402~440행 메모리 분리 관점은 있으나 일반 ELF/링커 개관이 대부분이라 11. |
| B | 21~222행 모델·startup·스크립트, 224~369행 MAP 진단, 525~553행 배포 변환까지 이어져 12. LOAD 예시 오류·심볼 체계 전환이 남는다. |
| C | readelf·nm·addr2line·objcopy 명령은 구체적이다. 308~310행 추출 예·예시 메모리 지도는 실행 결과가 확인되지 않았고 서로 맞지 않아 6. |
| D | `modern-recipes/part3-04-linker-script-basics.md` 110~160행 RAM AT FLASH·_sidata·startup 복사 ↔ 이 글 169~218·108~116행을 읽었다. 메모리 초기화 설명과 코드가 같은 질문을 반복하므로 7. |
| E | 제목의 LMA/VMA·MAP·startup은 다룬다. 별도 바이너리 없이 설명 예만으로 분석하는 한계 때문에 6. |
| F | 296·333·349·360행 진단 소제목과 569행 맞는 다음 편, 573~575행 공개 대상 3개의 정확한 라벨을 확인했다. 글 고유 단계 구분은 7점 근거이며 전제 지식/모바일 검사를 7점 필수 요건으로 삼지 않는다. |
| G | 576행 GNU LD manual은 있으나 핵심 예시와 연결된 문서 절·도구 판이 약해 2. |

uncertainties: 103행 __etext 설명과 실제 linker 심볼 대응, 308~310행 awk 추출, 389~398행 최종 ELF의 section 설명은 도구 문서·실행 검증 대상이다. 산문 “다른 셋” 같은 개수 오기는 정확성 게이트로 올리지 않는다.

병합 대상: Recipes part3-03~05·part3-10의 반복 절. 오류 수정 후 베어메탈 진단 관점을 남기는 보강이 우선이다.

### embedded/chapter06-trace.md

source_file: `src/content/blog/tools/debugging/embedded/chapter06-trace.md`

anchor_ref: `part7-05-kernel-build.md`, `part1-04-uart-hardware.md`

factcheck: 오류 확인 유지. [Arm Semihosting 2025Q4 명세](https://raw.githubusercontent.com/ARM-software/abi-aa/2025Q4/semihosting/semihosting.rst)의 operation 목록 및 해당 절을 이번에도 열어 확인했다. SYS_EXIT/HEAPINFO/ELAPSED는 0x18/0x16/0x30인데 원문 96~98행은 0x0c/0x12/0x13이다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 389~398행 상황별 선택과 417~450행 셸 예제는 추가 가치가 있다. 일반 도구 소개와 반복도 있어 12. |
| B | 다섯 방식의 firmware·host·한계·선택 흐름은 있다. 87~98행 핵심 표 오류, 405~411행 미정의 조건 예제가 있어 11. |
| C | 110~159행 ITM 양쪽 설정, 273~288행 RTT 명령·채널 코드는 구체적이다. 속도 311~313행은 환경·출처 없고 잘못된 명세 표로 6. |
| D | 같은 시리즈 ch02 327~331행 itm_putchar ↔ 이 글 134~139행, ch02 338~342행 tpiu/clock ↔ 156~182행, ch04 244~245행 ↔ 246·288행을 실제 비교했다. 선택 비교 역할을 남겨 9. |
| E | 2·5행의 비교·코드·선택 약속을 각 절과 389~398행이 이행해 7. |
| F | 467행 다음 편은 MMU·MPU를 예고하지만 ch07 전문에는 MPU만 있다. 틀린 다음 편 안내는 루브릭 F의 5점 상한에 해당한다. 기존 6을 5로 조정한다. 관련 내부 링크 471~473행의 실제 대상·제목은 맞는다. |
| G | 100·474~476행 1차 링크가 있지만 바로 앞 syscall 표는 인용 명세와 반대이고 버전도 고정하지 않아 2. |

uncertainties: 341~342행 JTraceExe 옵션, 407행 RTT 연결 판정 API, ETM-SWO 조합은 이번 명세 대조 범위 밖이다. 13행 non-blocking 통칭과 뒤의 블로킹 한계는 서술 범위 문제로 따로 기록하며 외부 자료 없이 기술 오류를 더 단정하지 않는다.

병합 대상: 같은 시리즈 chapter02의 ITM/ETM 및 chapter04의 RTT 중복 절. 다음 조치는 정확한 명세 표와 선택 기준을 보강하는 것이다.

### embedded/chapter07-rtos-troubleshooting.md

source_file: `src/content/blog/tools/debugging/embedded/chapter07-rtos-troubleshooting.md`

anchor_ref: `part1-04-uart-hardware.md`, `part6-09-isr-api.md`

factcheck: 오류 확인 유지. 183행 BFSR 범위를 `[12:8]`로 정의하면서 바로 184행 BFARVALID를 그 하위 필드 `[15]`로 나열한다. 동일 레지스터의 범위와 나열 값이 내부에서 맞지 않는다. 칩별 fault 동작의 외부 지식은 이 결론에 필요 없다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 321~372행 신호·전원·부트 진단은 독립 가치가 있지만 task/fault/MPU 목록이 중심이라 11. |
| B | 86~98행 스택 진단은 `...`와 미정의 free가 있는 미완성, 417~437행 cloud도 의사코드다. 9. |
| C | 123~170행 fault handler·addr2line, 343~346행 reset 설정은 구체적이지만 버전·실행 검증과 완성 예제가 부족해 6. |
| D | `modern-recipes/part10-04-hardfault-analysis.md` 63~96행 SP 선택/필드 추출 ↔ 이 글 123~158행, 같은 비교 글 106~125행 CFSR 표 ↔ 174~197행을 직접 읽었다. 같은 예제·진단 순서 반복이어서 7. |
| E | Task·Stack은 다루지만 제목의 Queue는 독립 분석 절이 없고 70행 xQueueReceive 표시 정도다. 5. |
| F | 13행 “마지막 장”·442~450행 Ch1~7 종결은 공개 ch08·09와 맞지 않는다. 226행 CMSIS 5 라벨도 CMSIS_6 URL이다. 4. 456~467행 내부 링크 9개의 실제 공개 상태·제목은 확인했다. |
| G | 468~471행 Arm·FreeRTOS·Zephyr·CMSIS 자료는 footer 수준이고 특정 주장의 버전·절 연결이 약해 2. |

uncertainties: 283행 FreeRTOS overflow 검사 모드, 215~222행 모든 fault가 precise라는 설명, 409행 lock 뒤 보드 폐기 단정은 1차 자료 대조 대상이다. 언어/API 지식이 필요한 결함을 내부 모순으로 확대하지 않는다.

병합 대상: Recipes part10-04 및 Practical RTOS part4-06의 반복 부분. 다음 조치는 오류 수정과 신호·전원 진단에 초점을 맞춘 보강이다.

### embedded/chapter08-cxl-link-debug.md

source_file: `src/content/blog/tools/debugging/embedded/chapter08-cxl-link-debug.md`

anchor_ref: `part7-05-kernel-build.md`, `part1-04-uart-hardware.md`

factcheck: 검증됨 유지. `git show --format=full --no-patch 815be859 5b031eb6`의 pciutils·kernel·벤더 1차 대조 범위를 확인했다. 전체 규격 주장을 이번에 새로 검증했다는 뜻은 아니다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 15~17행 층 구분과 101~108행 진단 순서는 있지만 generic LTSSM·명령을 묶은 수준이라 12. |
| B | 27~58행 상태/캡처 → 62~89행 호스트 → 94~108행 함정/체크 순서. 실제 analyzer 판독과 SoC 레지스터 예는 빠져 11. |
| C | 62~89행 명령·대응 출력과 99행 실제 driver 문자열은 따라갈 단서다. 장비·kernel 판과 실패 판독 깊이가 부족해 8. |
| D | `embedded/hardware/pcie/chapter09-physical-layer.md` 19~45행 상태·timeline ↔ 이 글 23~41행을 직접 읽었다. 같은 상태 목록이지만 CXL 계층 진단이라는 별도 역할은 있어 9. |
| E | 제목의 LTSSM·Protocol Analyzer는 각각 절이 있지만 캡처를 분석하는 예가 없어 6. |
| F | 119행 ch09는 맞고 관련 4개의 경로도 공개다. 126행 Recipes Ch149 라벨은 현재 대상 seriesOrder150과 어긋나 5. |
| G | 99행 kernel source path는 있지만 글 안의 1차 URL·대조 버전 없이 2. 커밋 출처는 factcheck에만 반영했다. |

uncertainties: 67·96·103행 lspci에 안 보이면 L0 미도달이라는 충분조건 단정, 39~41행 상태별 원인 단정은 새 규격 검증 대상이다. 출처가 일부 있다는 이유로 모든 주장의 정확성을 보증하지 않는다.

병합 대상: PCIe chapter09의 상태 표·chapter16의 일반 link 진단. 독립 CXL 의도가 있으므로 다음 조치는 차별화 보강이다.

### embedded/chapter09-cxl-device-troubleshoot.md

source_file: `src/content/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot.md`

anchor_ref: `part12-10-on-device-llm.md`, `part7-05-kernel-build.md`

factcheck: 검증됨 유지. `2b646ec1` 커밋 본문에 기록된 kernel cxlmem.h/pci.c/trace.h·ABI 및 ndctl 문서 대조 범위를 다시 읽었다. 본문 183행까지 내부 산술·출력의 직접 모순은 찾지 못했다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 21~30행 이벤트 처리 주체, 103행 DPA/region 기준, 145행 native_cxl_error 설명이 명령 나열보다 판단에 도움을 준다. 반복을 감안해 14. |
| B | health·poison·sysfs·bpftrace·제어권·함정·워크플로는 완성되어 12. 실제 장애에서 원인을 고른 추적 사례는 없다. |
| C | 34~103행 ndctl 예시의 출처 경로, 118~120행 ABI, 126~140행 bpftrace가 있어 9. 측정 환경·실행판이 없어 상단은 아니다. |
| D | `memory/chapter06-cxl-memory-diagnostics.md` 43~64행 -H/-L/monitor·4로그 표 ↔ 이 글 23~28·37·74·83행, 97~110행 workflow·장기 지표 ↔ 159~172행을 직접 읽었다. 비교 글 53·93행은 이 글을 정본으로 링크한다. 중복은 있으나 역할은 유지되어 9. |
| E | 2·5행 RAS/poison/media error 약속을 19~164행이 이행해 7. |
| F | 15행 ch08 전제 링크, 157~164행 작업 순서와 180~183행 정확한 공개 대상 4개가 고유 구조를 만든다. 모바일 미확인을 7점 금지 근거로 삼지 않아 기존 6에서 7. |
| G | 21·34·80·114·124·145행 source/ABI 위치와 118행 v6.4가 있으나 upstream revision·문서 URL 연결이 약해 3. |

uncertainties: kernel/ndctl main을 근거로 한 대조는 가변이며 글의 실행 환경이 고정되지 않았다. 108~109행 clear 결과가 모든 ndctl 판에서 동일한지는 이번에 실행하지 않았다.

병합 대상: 글 전체를 합칠 대상 없음. Memory Diagnostics의 요약은 여기로 연결하고 이 글의 버전·재현 환경을 보강한다.

### performance-engineering/00-preface.md

source_file: `src/content/blog/embedded/performance-engineering/00-preface.md`

anchor_ref: `part6-09-isr-api.md`, `part7-05-kernel-build.md`

factcheck: 미검증 유지. 62행 편수 오류는 기술 주장 게이트가 아니라 B/F의 허브 내비게이션 문제로 처리한다. 현재는 허브 포함 57편, 본문 56편이다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 18~43행 임베디드 제약과 175~197행 학습 순서는 있지만 독립 분석은 없고 허브 목적이어서 9. |
| B | 대상·목차·원칙·레퍼런스는 있다. 62행 53편과 실제 목록/공개 범위가 다르고 목차에 링크가 없어 8. |
| C | 201~210행 측정 수단 이름만 있고 실행/관찰 예는 없어 3. 허브라고 임의 가점하지 않는다. |
| D | `embedded/embedded-cpp/00-preface.md` 43~58행 구성·표의 틀 ↔ 이 글 60~81행을 비교했다. 같은 템플릿이지만 안내하는 학습 범위는 별개이고 같은 시리즈 part1-01 70~96행은 허브 원칙의 상세편이라 10. |
| E | 2·5행 시리즈 안내 목적에 맞고 대상 독자 45~58행도 있으나 “모든 것”이라는 포괄 약속으로 6. |
| F | 257행 다음 글 실제 대상은 맞다. 목차 편수 불일치·링크 없는 72~171행 표, 179행 동시성 경로가 전력/열 3-09/10으로 가리키는 문제로 4. |
| G | 222~231행 책 판·저자/도구 링크는 있으나 개별 사실과 연결되지 않아 2. |

uncertainties: 31~35행 특정 서적의 비포괄 범위 주장은 책 본문과 새로 대조하지 않았다.

병합 대상: 없음. 시리즈 허브 예외로 보강. 목차 실제 공개 범위와 링크를 먼저 맞추는 것이 다음 조치다.

### performance-engineering/part1-01-methodology.md

source_file: `src/content/blog/embedded/performance-engineering/part1-01-methodology.md`

anchor_ref: `part6-09-isr-api.md`, `part7-05-kernel-build.md`

factcheck: 미검증 유지. 128~133행 출처 없는 백분율은 100%로 합산되지만 모집단·관측 근거가 없다. 167행 “9%”와 계산 9.9%의 차이는 근사/표현 범위가 불명확해 오류 게이트의 주근거로 올리지 않는다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 57~66행 임베디드 자원별 USE 표는 고유 적용이 있으나 실측 사례가 없어 11. |
| B | USE/RED·가설/검증의 틀은 있지만 74~94행 counter 함수는 조각이고 관찰→원인 확정 사례가 없어 9. |
| C | 75~78·92~93행 예시는 설정·예상 수치·반증 실험이 없고 128~133행 비율에 측정 근거 없어 4. |
| D | 같은 시리즈 metrics 115~137·230~232행 percentile/평균 함정 ↔ 이 글 100~108행, 허브 183~197행 측정 원칙 ↔ 70~96행을 직접 읽었다. USE 적용은 별개지만 반복이 많아 9. |
| E | 2·5행 방법론 약속은 표/단계로 다룬다. 실제 임베디드 사례까지 완결하지 못해 6. |
| F | 72·83·87행 단계와 139·145행 뒤편 참조, 181·185~186행 맞는 다음/관련 공개 대상이 있어 7. |
| G | 187행 Gregg 책 URL은 있지만 USE/RED 원자료나 수치 근거 연결이 없어 2. |

uncertainties: 19·128~133·159행 통계, 139행 Roofline의 단위 생략, 112행 cool cache 의미는 1차 자료 검증 대상이다.

병합 대상: 없음. 독립 USE/RED 의도가 있어 다음 조치는 관찰·반증 가능한 사례와 1차 출처 보강이다.

### performance-engineering/part1-02-metrics.md

source_file: `src/content/blog/embedded/performance-engineering/part1-02-metrics.md`

anchor_ref: `part6-09-isr-api.md`, `part1-04-uart-hardware.md`

factcheck: 오류 확인으로 변경. 213행 `us < 1`은 입력 0을 hist[0]에 넣는다. 222~223행은 i=0을 `1-1 us`로 출력한다. 함수가 기록한 0μs 입력과 표시 구간은 일치할 수 없다. `__clz` 의미·고비트 shift 규칙을 몰라도 성립하는 실행 예시의 내부 불일치다. 기존 평가가 이를 언어/API 의심과 함께 미검증에만 두었던 경계를 바로잡았다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 17~72행 기본 지표 정의/구분은 있으나 통상 개념과 인접 글 내용이 주여서 8. |
| B | jitter·deadline·percentile까지 폭넓지만 203~225행 핵심 예시가 잘못된 구간을 출력하고 80% 보편 규칙에 전제가 없어 9. |
| C | 89~98행 jitter·205~225행 histogram 조각은 있으나 clock 기준·반증 결과·환경이 없고 버킷 표기도 틀려 5. |
| D | 같은 시리즈 statistics 83~98행 record/print ↔ 이 글 205~225행의 log2 버킷/출력 구조를 직접 비교했다. measurement 64~97행의 DWT·Linux clock 설명 ↔ 이 글 195~201행 time-source 표도 같은 도구를 다룬다. 기본 정의 외 중복이 커서 6. |
| E | 2·5행 핵심 지표는 설명한다. 활용의 보편 한계를 단정하고 지표 선택 결론이 약해 5. |
| F | 255행 다음과 259~261행 관련 3개 공개 대상은 맞는다. 130~135행 bullet histogram은 축/분포가 읽기 어려워 6. |
| G | 261행까지 1차 출처·플랫폼 버전 표기가 없어 1. |

uncertainties: 214행 __clz와 223행 큰 shift, 61~63·145행 queueing의 70~80% 보편 한계, CoreMark/DMIPS 값은 별도 1차 검증 대상이다. 이번 오류 승격은 이들 언어·외부 지식에 의존하지 않는다.

병합 대상: statistics의 분포, realtime의 jitter/deadline, benchmark의 DMIPS/CoreMark 절. 다음 조치는 오류 수정 뒤 지표 선택 문제를 중심으로 차별화 보강이다.

### performance-engineering/part1-03-measurement.md

source_file: `src/content/blog/embedded/performance-engineering/part1-03-measurement.md`

anchor_ref: `part1-04-uart-hardware.md`, `part6-09-isr-api.md`

factcheck: 오류 확인 유지. 184~188행 trace record의 uint32_t+uint16_t+uint16_t는 필드 데이터만 8바이트다. 200행의 “1000개를 모아도 5 KB”는 8,000바이트보다 작다. padding 가정 없이도 하한과 충돌한다. 145~155행 GPIO 설명과 175~176행 overhead의 충돌은 서로 다른 “CPU 자체 측정 도구” 범위로 읽힐 여지가 있어 보조 지적으로만 남긴다.

| 항목 | 근거와 판단 |
| --- | --- |
| A | 시계·GPIO·PMU·trace를 한데 비교하지만 공통 튜토리얼 조각이고 자체 결과가 없어 10. |
| B | 17~56행 세 지표 → 58~167행 도구 → overhead/추적/PGO 흐름은 있지만 start 누락·플랫폼 전제가 열려 9. |
| C | 64~72행 DWT 설정과 227~235행 PGO 명령은 있다. 결과·환경이 없고 173~200행 비용과 저장량 주장에 오류/근거 부족으로 5. |
| D | 같은 시리즈 part5-07 64~66행 DWT init ↔ 이 글 64~66행을 직접 대조했다. cycle 차이·168MHz 25초 설명도 비교 글 75~84행 ↔ 69~75행으로 겹친다. 여러 후속편 요약 성격이 강해 7. |
| E | 2·5행 약속의 wall-clock·cycle·instruction 및 overhead를 각 절에서 다뤄 6. |
| F | 17~56행 세 종류의 기준부터 OS/코어별 절과 240~256행 함정으로 구분된다. 266행 다음 및 270~272행 관련 3개 실제 공개 대상이 정확해 7. 전제 지식 목록 부재만으로 6에 묶지 않는다. |
| G | source 명세 링크·실행판 없이 레지스터/API 이름만 있어 1. |

uncertainties: 35·44행 cycle counter가 IRQ·context switch를 제외한다는 주장, 51~53행 start 바인딩 누락, 192~197행 macro 매개변수/필드명 결합, 262행 user PMU 조건은 별도 1차 자료 또는 실행 검증 대상이다.

병합 대상: part5-07 baremetal, part2-10 PMU, part1-08 PGO의 반복 절. 다음 조치는 잘못된 예시를 고치고 “무슨 시간을 재는가”라는 독립 질문을 강화하는 것이다.

## 검증 범위와 한계

10편 원문과 각 글의 D 대응 구간을 직접 확인했고, 본문 내부 Markdown blog 링크를 slug로 해석하여 대상 frontmatter의 제목·seriesOrder·draft 상태를 대조했다. 내부 링크 대상 누락은 없고 ch08의 Recipes 번호 오류, ch06의 다음 편 MMU 범위 오류는 별개로 F에 반영했다. 출처가 footer에 있다는 이유로 해당 글의 모든 구체 주장을 검증됐다고 올리지 않았다.

모바일 렌더링·기기 실측·코드 전체 실행·구체 주장 전수 외부 대조는 수행하지 않았다. 그래서 모든 점수는 잠정이다. 새 오류 두 건은 원문 산술/입출력만으로 성립하며, ch06의 명세 오류는 위 Arm 1차 자료를 이번에 다시 열어 확인했다. 공통 검사 실행 결과는 `double-check-gates-2026-10-18.md`와 별개로 관리한다.
