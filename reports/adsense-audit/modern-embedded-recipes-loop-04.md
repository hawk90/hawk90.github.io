# Modern Embedded Recipes — 루프 04 (seriesOrder 30~39)

> 분석 단계: 루브릭 기반 검사·분류 1차
> 대상: 공개 글 10편
> 기준: AdSense 공개 글 평가 루브릭
> 상태: 검사·분류만 완료 — 원문 수정·비공개 처리 없음
>
> v1.2 재평가(2026-10-11)가 이 문서의 판정이다. 아래 v1.1 점수·분류는 참고 기록이다.

## 결론

이번 루프의 10편은 산문 중앙값 3,097자다. 산문 2,500자 미만은 1편, 1,500자 미만은 0편이며, 코드가 산문보다 긴 글은 1편이다.

이번 결과는 공개 유지 여부를 확정하지 않는다. 외부 URL·실전 경험·출처의 자동 신호는 누락될 수 있으므로, 다음 정성 검토에서 원문 위치와 실제 절차를 확인해야 한다.

## 1차 분류 요약

| 분류 | 편수 | 의미 |
| --- | ---: | --- |
| 정성 검토 우선 | 1 | 코드 비중과 설명의 역할을 먼저 확인할 후보. 최종 판정 아님 |
| 근거·실전성 검토 | 9 | 외부 출처·근거 신호를 우선 확인할 후보. 최종 판정 아님 |
| 1차 유지 후보 | 0 | 기계 신호만으로 유지 후보로 올릴 글 없음 |

### 신호 분포

| 신호 | 편수 |
| --- | ---: |
| 외부 출처 없음 | 9 |
| 산문 <2500 | 1 |
| 산문 <1500 | 0 |
| 코드 우세 | 1 |
| 실전 신호 약함 | 0 |

## 검사 포인트

- `part3-11-make-cmake-cross.md`는 코드가 산문보다 길어 코드가 설명을 대체하는지 정성 확인한다.
- 메모리 레이아웃·컴파일러 최적화·Map 파일 분석 글은 동일한 임베디드 빌드/메모리 진단 의도와 겹치는 부분이 있는지 확인한다.
- Bootloader와 bare-metal 시작 글은 독립적인 문제·독자 의도·결론이 분리되는지 확인한다.
- MMIO·GPIO·클럭·인터럽트 글은 하드웨어 전제와 적용 범위가 명확한지 확인한다.
- 외부 링크가 없다는 자동 신호만으로 출처 부재를 확정하지 않고, 원문에 표준명·칩 제조사 문서·데이터시트가 인용 또는 명시되는지 확인한다.
- 근거 없는 보편 수치나 모든 MCU에 적용되는 것처럼 보이는 기준은 P0/P1 근거 태그로 기록한다.
- Abseil·Folly와 달리 Modern Embedded Recipes는 이 단계에서 일괄 제외하지 않는다.

## 글별 기계 triage

| # | 파일 | 제목 | 산문(자) | 코드(자) | 외부 링크 | 실전 신호 | H2 수 | 신호 | 1차 분류 |
| ---: | --- | --- | ---: | ---: | ---: | ---: | ---: | --- | --- |
| 1 | part3-08-memory-layout.md | 임베디드 메모리 레이아웃 — .text·.rodata·.data·.bss·.heap·.stack | 3,053 | 1,653 | 0 | 8 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 2 | part3-09-compiler-optimization.md | 임베디드 컴파일러 최적화 분석 — -O0~-O3·-Os·-LTO 비교 | 3,044 | 1,420 | 0 | 8 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 3 | part3-10-map-file-analysis.md | Map 파일 분석 — Symbol·Section·Size 추적으로 코드 크기 진단 | 2,687 | 2,166 | 0 | 5 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 4 | part3-11-make-cmake-cross.md | Make·CMake 크로스 컴파일 — Toolchain File·Sysroot 통합 | 2,169 | 4,845 | 1 | 8 | 8 | 산문<2500, 코드 우세 | 정성 검토 우선 |
| 5 | part3-12-bootloader-chain.md | 임베디드 Bootloader 체인 — BootROM·SPL·U-Boot·Kernel·Secure Boot | 3,141 | 2,805 | 0 | 3 | 14 | 외부 출처 없음 | 근거·실전성 검토 |
| 6 | part4-01-first-baremetal.md | 첫 bare-metal 프로그램 작성 — Linker·Startup·main의 최소 구성 | 2,957 | 2,940 | 0 | 7 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 7 | part4-02-mmio-access.md | MMIO 레지스터 직접 접근 — volatile·Memory Map·Aliasing 분석 | 3,486 | 2,907 | 0 | 4 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 8 | part4-03-gpio-driver.md | GPIO 드라이버 직접 구현 — STM32 HAL 없이 레지스터로 | 3,708 | 3,642 | 0 | 4 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 9 | part4-04-clock-setup.md | 임베디드 클럭 설정 분석 — HSE·PLL·SYSCLK·AHB/APB 분주 | 3,329 | 2,707 | 0 | 2 | 8 | 외부 출처 없음 | 근거·실전성 검토 |
| 10 | part4-05-interrupt-handling.md | Cortex-M 인터럽트 핸들링 — NVIC·Priority·Vector·EXTI | 3,500 | 2,984 | 0 | 3 | 8 | 외부 출처 없음 | 근거·실전성 검토 |

## 판정 보류와 다음 조치

이번 루프에서는 원문을 수정하지 않는다. 다음 정성 검토에서 각 글의 다음 근거를 원문 위치와 함께 기록한다.

1. 실제 보드·툴체인·칩 범위와 재현 가능한 절차
2. 측정값 또는 관찰 결과와 조건
3. 공식 문서·데이터시트·표준 등 주장에 대응하는 출처
4. 인접 글과 겹치지 않는 독립적인 문제 해결 가치
5. 코드만 복사해도 이해할 수 있도록 하는 설명·실패 조건·트레이드오프

정성 검토 결과에 따라 유지·보강 검토·병합 후보를 나누되, 근거 없는 수치나 경험을 새로 만들어 넣지 않는다. 원문 수정은 별도 승인 후 별도 루프에서 수행한다.

## 루프 종료 조건

- [x] 공개 글 10편을 모두 행으로 기록
- [x] 산문·코드·외부 링크·실전 신호를 동일 기준으로 검사
- [x] 자동 분류를 최종 판정으로 사용하지 않음
- [x] 원문 수정·비공개·삭제·URL 변경 없음
- [x] 보고서 자체의 diff 공백 오류 없음

## 정성 평가 업데이트

원문 10편을 직접 대조해 루브릭 7개 항목으로 잠정 점수화했다. 점수는 Google의 공식 점수나 승인 확률이 아니라 콘텐츠 품질·독립 가치·검증 가능성을 비교하기 위한 내부 지표다. P0 정책 차단 요소는 확인되지 않았다. 실제 보드·칩·툴체인 버전별 실행 결과와 제조사 문서 대조 전이므로 신뢰도는 중간이다.

### 요약

| 파일 | 점수 | 잠정 판정 | 핵심 근거 |
| --- | ---: | --- | --- |
| `part3-08-memory-layout.md` | **74/100** | 보강 후 유지 | section·heap·stack·사용량 추적을 연결하지만 MCU별 linker 조건과 실제 map 결과가 부족하다 |
| `part3-09-compiler-optimization.md` | **72/100** | 보강 | O 레벨·LTO·PGO 선택은 유용하나 최적화별 실제 크기·속도 결과가 없다 |
| `part3-10-map-file-analysis.md` | **75/100** | 유지 후보 | map·symbol·section·GC 분석을 구체적 도구 명령과 연결한다 |
| `part3-11-make-cmake-cross.md` | **76/100** | 유지 후보 | Make/CMake toolchain·sysroot·preset을 전체 빌드 흐름으로 보여준다 |
| `part3-12-bootloader-chain.md` | **78/100** | 유지 후보 | BootROM→SPL→U-Boot→Kernel·Secure Boot·A/B·디버깅까지 범위가 넓다 |
| `part4-01-first-baremetal.md` | **78/100** | 유지 후보 | linker·startup·GPIO·flash까지 첫 실행 경로가 재현 가능하게 연결된다 |
| `part4-02-mmio-access.md` | **75/100** | 유지 후보 | volatile·access width·RMW·barrier의 위험을 코드와 함께 설명한다 |
| `part4-03-gpio-driver.md` | **77/100** | 유지 후보 | STM32 레지스터·BSRR·alternate function·출력 모드를 직접 구현한다 |
| `part4-04-clock-setup.md` | **76/100** | 유지 후보 | STM32F4 clock tree·PLL·Flash latency·APB timer 규칙이 연결된다 |
| `part4-05-interrupt-handling.md` | **78/100** | 유지 후보 | NVIC 상태·priority·EXTI/TIM 예제·tail chaining을 실전 흐름으로 묶었다 |

### 항목별 점수

| 파일 | 독창성 25 | 완결성 20 | 실전 검증 15 | 중복/병합 15 | 검색 의도 10 | UX/내부링크 10 | 신뢰/출처 5 | 합계 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `part3-08-memory-layout.md` | 18 | 16 | 10 | 11 | 9 | 8 | 2 | **74** |
| `part3-09-compiler-optimization.md` | 17 | 15 | 9 | 11 | 9 | 8 | 3 | **72** |
| `part3-10-map-file-analysis.md` | 18 | 16 | 10 | 12 | 9 | 8 | 2 | **75** |
| `part3-11-make-cmake-cross.md` | 18 | 16 | 11 | 12 | 9 | 8 | 2 | **76** |
| `part3-12-bootloader-chain.md` | 19 | 17 | 11 | 12 | 9 | 8 | 2 | **78** |
| `part4-01-first-baremetal.md` | 19 | 17 | 11 | 12 | 9 | 8 | 2 | **78** |
| `part4-02-mmio-access.md` | 18 | 16 | 10 | 11 | 9 | 8 | 3 | **75** |
| `part4-03-gpio-driver.md` | 19 | 17 | 11 | 11 | 9 | 8 | 2 | **77** |
| `part4-04-clock-setup.md` | 18 | 16 | 11 | 12 | 9 | 8 | 2 | **76** |
| `part4-05-interrupt-handling.md` | 19 | 17 | 11 | 12 | 9 | 8 | 2 | **78** |

### 공통 근거와 우선순위

- 이 루프는 이전 루프보다 실행 절차와 코드가 구체적이어서 유지 후보가 많다. 다만 코드가 있다는 사실만으로 실전 검증을 충족하지 않으므로 실제 빌드·플래시·로그·파형 결과가 필요하다.
- 메모리 레이아웃·최적화·map 파일은 하나의 빌드 진단 흐름으로 연결되지만, 각각 메모리 배치·성능/크기 선택·원인 추적이라는 독립 질문을 유지할 수 있다.
- Make/CMake 글은 다운로드 URL, 도구 버전, 실제 `cmake --build` 출력과 cross compiler 선택 결과를 고정하면 재현성이 올라간다. 현재 측정된 빌드 시간은 환경 의존 수치로 취급해야 한다.
- Bootloader·bare-metal·GPIO·clock·interrupt는 특정 STM32F4 보드·레퍼런스 매뉴얼 조건을 명시해야 한다. 다른 STM32 제품군에 일반화되는 것처럼 보이지 않게 범위를 제한할 필요가 있다.
- MMIO 글은 `volatile`이 순서·원자성·cache coherency를 해결하지 않는다는 경계를 계속 분명히 해야 한다. access width와 RMW 실패 사례를 실제 레지스터 기준으로 검증하는 것이 우선이다.
- 이번 평가는 점수 기록만 수행했다. 원문 수정·비공개·삭제·URL 변경은 하지 않았다.

## v1.2 재평가 (2026-10-11)

루브릭 v1.2와 `docs/adsense-audit/anchors.md` 앵커 네 편을 기준으로 10편을 원문 전체를 읽고 다시 채점했다. 모든 글은 `score_status: 잠정`이다. P0는 찾지 못했다(확인 범위는 원문 본문과 내부 링크 대상의 존재·라벨까지이고, 렌더링·광고 배치는 보지 않았다). factcheck는 git 이력 기준으로 모두 `미검증`에서 출발했고, 같은 글 안의 모순·산술 오류만 두 줄 번호를 근거로 `오류 확인`으로 올렸다. 외부 자료는 가져오지 않았다. 줄 번호는 2026-10-11 기준 원문 줄이다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part3-08-memory-layout.md` | 10 | 12 | 8 | 8 | 7 | 5 | 1 | 51 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part3-09-compiler-optimization.md` | 7 | 9 | 5 | 8 | 5 | 6 | 1 | 41 | 미검증 | 병합 검토 | 중간 | part6-09-isr-api.md |
| `part3-10-map-file-analysis.md` | 12 | 13 | 8 | 10 | 7 | 6 | 1 | 57 | 오류 확인 | 우선 조치 | 높음 | part1-04-uart-hardware.md |
| `part3-11-make-cmake-cross.md` | 11 | 13 | 9 | 10 | 6 | 6 | 1 | 56 | 오류 확인 | 우선 조치 | 높음 | part7-05-kernel-build.md |
| `part3-12-bootloader-chain.md` | 13 | 13 | 8 | 5 | 7 | 3 | 1 | 50 | 미검증 | 병합 검토 | 중간 | part6-09-isr-api.md |
| `part4-01-first-baremetal.md` | 13 | 14 | 10 | 9 | 8 | 5 | 1 | 60 | 미검증 | 보강 | 중간 | part1-04-uart-hardware.md |
| `part4-02-mmio-access.md` | 11 | 13 | 9 | 9 | 6 | 6 | 1 | 55 | 미검증 | 병합 검토 | 중간 | part7-05-kernel-build.md |
| `part4-03-gpio-driver.md` | 13 | 14 | 9 | 10 | 8 | 6 | 1 | 61 | 오류 확인 | 우선 조치 | 높음 | part12-10-on-device-llm.md |
| `part4-04-clock-setup.md` | 14 | 15 | 10 | 11 | 8 | 7 | 2 | 67 | 미검증 | 보강 | 중간 | part12-10-on-device-llm.md |
| `part4-05-interrupt-handling.md` | 13 | 14 | 10 | 9 | 8 | 7 | 1 | 62 | 미검증 | 보강 | 중간 | part12-10-on-device-llm.md |

`우선 조치` 네 편의 점수 구간은 `part3-10`·`part3-11`이 병합 검토, `part4-01`·`part4-03`이 보강이다. 판정은 factcheck 게이트로 정해졌다.

### part3-08-memory-layout.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | RAM 배치 표(28~35행)와 section 표(41~48행)는 입문 내용이다. heap 정책 비교 표(112~118행)와 `ASSERT`로 빌드 시점에 RAM 초과를 잡는 예(153행)가 고유하다. 37·52행은 "달라질 수 있습니다", "확인해야 합니다"로 끝난다. |
| B | 12 | 배치 → `_end` → stack 크기 → 측정 → heap 정책 → linker 예까지 흐름은 있다. 63행 단순 allocator가 143~150행 배치(heap 위에 stack section)에서는 stack 영역을 침범할 수 있다는 한계를 설명하지 않는다. |
| C | 8 | stack painting 코드(91~105행), linker `ASSERT`, `nm -S` 명령(170~174행)이 있다. 176~178행 비율 표는 "크게 달라짐" 한 칸이라 내용이 없다. |
| D | 8 | painting·high-water·MPU guard(89~108·159~164행)가 8-09 `stack-analysis` 39~56·114~130행과 같은 질문이다. `_sbrk`형 allocator(54~67행)는 3-07 129~140행과 겹친다. |
| E | 7 | 제목의 section 목록을 표로 모두 다루고 본문은 description("누가 어디 사는가")과 맞는다. |
| F | 5 | 218행 "Practical RTOS Internals: Task stack 설계" 링크가 `00-preface`로 간다. 5점 상한을 적용했다. 다음 편(211행)은 seriesOrder 31과 맞다. |
| G | 1 | linker·newlib 문서 링크와 대상 칩 표기가 없다. |

uncertainties:
- 35행 `_estack`을 `0x2001FFFF`로 적었지만 200행은 RAM 끝을 `ORIGIN+LENGTH`라고 한다. RAM 크기를 이 글에서 밝히지 않아 불일치인지 확정하지 못했다.
- 96행 painting이 `__get_PSP()`를 쓰는데 87행은 main stack을 `_estack`(MSP)으로 설명한다. 대상 stack이 어느 쪽인지 불명확하다.

병합 대상: `part8-09-stack-analysis.md`(stack 측정 절 89~108·159~164행 흡수). 레이아웃 설명만 남기면 독립 가치가 약하므로, 남는 부분은 3-04 링커 기초와의 통합도 함께 검토한다.

### part3-09-compiler-optimization.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 7 | 레벨 표(28~36행)는 GCC 문서 요약이다. 84·88·90·112·116행이 모두 "달라지므로 측정해야 합니다" 형태라 핵심 주장(어느 레벨이 얼마나 다른가)을 대신한다. 완곡 표현을 일반론으로 보는 규칙을 적용했다. |
| B | 9 | 레벨·Og·LTO·PGO를 소개하지만 90행 "hello.c 빌드 결과"는 결과 없이 끝나고, PGO(114~116행)는 두 문장이다. 선택 기준이라는 결론이 없다. |
| C | 5 | `-O0`/`-O2` 어셈블리 비교(50~82행)와 함수별 attribute(122~142행)가 있다. 160~162행 비교 표는 한 행이 "측정 필요"라 내용이 없다. |
| D | 8 | `-Os`·LTO·section GC는 8-10 `code-size-optimization` 47~76행과 같은 질문이고, `-O0` vs `-O2` diff는 3-02 142~147행과 겹친다. |
| E | 5 | 제목은 "분석 — … 비교"인데 비교 결과가 없다. 독자가 얻는 결과가 불명확한 경우로 3~5 구간이다. |
| F | 6 | 206행 다음 편(맵 파일)이 seriesOrder 32와 맞고 관련 링크가 일치한다. 템플릿 외 고유 구조는 없다. |
| G | 1 | GCC 최적화 옵션 문서 링크와 컴파일러 버전이 없다. |

uncertainties:
- 52~63행 `-O0` 출력은 `r7`을 frame pointer로 쓰지만 설정하는 명령이 없다. 실제 출력인지 미확인.
- 194행 함정 제목("너무 작아도 inline 안 됨")을 본문이 뒷받침하지 않는다.

병합 대상: `part8-10-code-size-optimization.md`. 크기 쪽은 8-10에 흡수하고, 디버깅 친화(164~170행)와 함수별 attribute만 남길지 결정한다.

### part3-10-map-file-analysis.md

factcheck `오류 확인`: 63행 `.text.setup`은 `0x080001dc`에서 크기 `0x40`이라 `0x0800021c`까지인데, 66행 `.rodata.str1`이 `0x0800020c`에서 시작해 두 구간이 겹친다. 같은 예제 안에서 61행 `.text.main` 크기 `0x30`과 128행 `nm` 출력의 `main` 크기 `0x10c`도 다르다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | map 파일 다섯 부분(32~38행)을 실제 출력 형태로 짚고, archive member 절(88~102행)이 `printf`가 어떤 object를 끌어오는지 보여 준다. 102·194행은 "구현과 옵션에 따라 다릅니다", "측정해야 합니다"로 끝난다. |
| B | 13 | 생성 → memory configuration → section dump → symbol → archive → gc 출력 → 도구까지 완결된다. |
| C | 8 | 명령과 출력 예가 많고 `size -A` 합계(147행)는 맞는다. 그러나 section dump·symbol list·nm·size 출력(56~82·126~146행)이 같은 `app.elf`라고 하면서 서로 맞지 않는다. 182~184행 분포 표는 한 칸 서술이다. |
| D | 10 | `nm --size-sort`는 3-03 125행과, gc-sections는 3-04·3-05와 겹친다. map 파일 해석이라는 질문은 독립적이다. |
| E | 7 | 제목의 "코드 크기 진단"을 도구와 절차로 다룬다. |
| F | 6 | 217행 다음 편(Make·CMake)이 seriesOrder 33과 맞고 관련 링크가 일치한다. 템플릿 외 고유 구조는 없다. |
| G | 1 | GNU ld 문서, bloaty·puncover 저장소 링크와 버전이 없다. |

uncertainties:
- 126~127행 `vfprintf`·`printf`를 local(`t`)로 표시했다. 133행 규칙대로라면 static 함수라는 뜻이라 실제 출력인지 미확인.
- 130행 `vector_table` 크기 `0x80`은 58행 `.isr_vector` `0x1ac`와 다르다.

### part3-11-make-cmake-cross.md

factcheck `오류 확인`: 204행은 `MCU_TARGET`을 `"STM32F4"`로 정하고, 219행은 include 경로를 `Drivers/STM32${MCU_TARGET}_HAL_Driver/Inc`로 조립한다. 치환하면 `Drivers/STM32STM32F4_HAL_Driver/Inc`가 되어 접두어가 두 번 붙는다. 원문만으로 성립하는 코드 오류다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | Makefile 전체(28~74행), toolchain file(80~103행), preset(170~194행), MCU별 분기(202~222행), CI(226~244행)를 한 흐름으로 묶었다. 개별 요소는 CMake 문서와 같은 수준이다. |
| B | 13 | Make → CMake toolchain → CMakeLists → 빌드 → preset → 마이그레이션 → CI까지 완결된다. |
| C | 9 | 그대로 실행해 볼 수 있는 빌드 파일이 대부분이다. 258~263행 빌드 시간(25 s·8 s·6 s·1 s)은 환경·도구 버전 없이 숫자만 있고, 표 헤더가 한 열이라 렌더링이 깨질 수 있다. 235행 URL은 자리표시자다. |
| D | 10 | toolchain file(80~103행)이 3-01 158~170행과 거의 같다. 빌드 시스템 비교와 preset은 이 글만의 것이다. |
| E | 6 | 제목의 "Sysroot 통합"은 본문에 없다. `CMAKE_FIND_ROOT_PATH_MODE_*`(99~102행)만 있고 `CMAKE_SYSROOT`나 `--sysroot`는 나오지 않는다. 부분 미이행이다. |
| F | 6 | 296행 다음 편(Bootloader 체인)이 seriesOrder 34와 맞고 관련 링크가 일치한다. 템플릿 외 고유 구조는 없다. |
| G | 1 | CMake 문서 링크가 없다. 163행 "CMake 3.19+"와 110행 `VERSION 3.20` 외에 도구 버전이 없다. |

uncertainties:
- 207행 `MCU_FLAGS`를 공백 포함 문자열 하나로 만들어 214행 `add_compile_options`에 넘긴다. 인자가 하나로 전달되는지 CMake 문서로 확인하지 않았다.
- 173행 preset `"version": 3`과 163행 "3.19+"의 최소 버전이 맞는지 미확인.
- 156행 `toolchain-arm-none-eabi.cmake`와 160행 `toolchain.cmake`가 같은 파일인지 불명확하다.

### part3-12-bootloader-chain.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | FIT `.its` 예(87~120행), U-Boot A/B 스크립트(170~183행), TF-A BL 단계(147~157행), STM32MP1·i.MX8 사례(187~205행), test key/production key 함정(262~264행)이 있다. 38행은 offset을 "공식 문서로 확인해야 합니다"로 미루고, 251행은 같은 offset을 단정한다. |
| B | 13 | 단계표 → 단계별 설명 → 서명 → A/B → 사례 → 디버깅 → 함정까지 이어진다. |
| C | 8 | U-Boot 명령, `mkimage`, gdb 명령이 있다. 216~218행 부트 로그는 형식 예시이고 실제 보드 로그가 아니다. |
| D | 5 | 7-01 `linux-boot-flow`가 BootROM·SPL·U-Boot bootcmd·bootargs·ATF/OP-TEE(47~131행)를 같은 순서로 다룬다. 7-02 `uboot-usage`도 bootcmd를 다룬다. 같은 질문을 두 글이 나눠 답한다. |
| E | 7 | 제목의 다섯 키워드를 모두 다룬다. |
| F | 3 | 275행 "다음 편은 JTAG/SWD 디버깅"인데 seriesOrder 35는 `part4-01-first-baremetal`이다. 279행 "1-04: Device Tree"는 `part7-03`, 280행 "1-06: JTAG·SWD"는 `part10-02`로 가서 번호 라벨도 틀렸다. |
| G | 1 | U-Boot·TF-A 문서 링크가 없다. 93행 "Linux 5.15" 외 버전 표기가 없다. |

uncertainties:
- 36행 BootROM을 "TPL (Tertiary), 또는 SBL"이라고도 부른다는 설명은 42행 SPL 정의와 용어 체계가 어긋나 보인다. 1차 자료로 확인하지 않았다.
- 251행 "NXP i.MX는 0x400, Allwinner는 8 KB", 189~190행 STM32MP1 크기, 205행 "자동차·산업 분야에서 표준"은 출처가 없다.

병합 대상: `part7-01-linux-boot-flow.md`. FIT·A/B·secure boot 키 함정처럼 7-01에 없는 절만 옮기고 이 URL은 리다이렉트 후보로 둔다.

### part4-01-first-baremetal.md

factcheck `미검증` — 2026-10-11 독립 검증에서 아래 근거가 루브릭 3-1의 제외 유형(완곡한 본문과 단정적 정리의 충돌, 산문 개수 오기, 외부 지식이 필요한 판단)으로 판정되어 `오류 확인`에서 내렸다. 아래 내용은 `uncertainties`로 보고 fact-check 때 1차 자료로 정한다. 원래 기록: 15행은 LED 검사가 "toolchain·linker·boot 전체의 정상 동작을 보장하는 것은 아닙니다"라고 하고, 236행 정리는 "동작하면 toolchain·linker·startup·clock·GPIO가 모두 정상이라는 뜻입니다"라고 한다. 같은 글의 결론이 서로 반대다. 보조 근거로 21행 "빠르게 깜빡이면 clock이 올라갔다는 신호"는 clock 설정이 없는 예제 코드(127~140행)와 맞지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 보드별 LED 핀 표(53~58행)와 Nucleo-F411RE 기준 단일 파일 예제(110~140행), 깜빡임 패턴으로 단계를 판정하는 관점(21행)이 이 글만의 것이다. 27·47행은 "확인해야 합니다"로 끝난다. |
| B | 14 | startup → main → linker → 빌드·flash → 확인 → 함정까지 별도 검색 없이 따라갈 수 있다. |
| C | 10 | 보드·핀·주소를 고정한 코드와 `st-flash`·OpenOCD 명령(176~191행), 파형 그림(206행)이 있다. 실제로 잰 주기는 없다(204행). |
| D | 9 | startup(66~104행)이 3-06 167~200행과, linker 골격(145~172행)이 3-04 26~56행과 같다. LED bring-up이라는 질문은 독립적이다. |
| E | 8 | 제목과 본문이 최소 구성이라는 같은 약속을 지킨다. |
| F | 5 | 244행 "3-04: Startup 코드 작성" 라벨이 `part3-06-startup-code`를 가리킨다. 번호가 다른 글을 가리키는 링크라 5점 상한을 적용했다. 다음 편(239행)은 seriesOrder 36과 맞다. |
| G | 1 | reference manual·보드 user manual 링크가 없다. 보드 이름은 있으나 toolchain 버전이 없다. |

uncertainties:
- 214행 "clock이 꺼지면 register write가 무시되고 핀이 floating"은 미확인.
- 201행 "HSI 16MHz 기준 적당"은 측정값 없이 쓴 판단이다.

### part4-02-mmio-access.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | `volatile` 유무에 따른 dead store(39~48행)와 어셈블리(181~193행), bit-field 위험(145~153행), RMW와 BSRR(157~171행)은 임베디드 입문서의 표준 목록이다. access width 표(80~85행) 두 행은 "reference manual에 따름"이라 내용이 없다. |
| B | 13 | volatile → struct → width → barrier → 코드 패턴 → 확인 → 함정까지 완결된다. |
| C | 9 | objdump 명령과 `volatile` 유무 어셈블리 비교가 있다. 어떤 컴파일러·옵션 출력인지 없다. |
| D | 9 | base+offset 매크로(109~116행)가 4-01 114~119행과 같고, struct·BSRR(121~141행)은 4-03이, clock 뒤 DSB(93~98행)는 2-10 61~66행이 다룬다. |
| E | 6 | 제목의 "Aliasing"은 bit-band alias 표 한 칸(84행)뿐이고 포인터 aliasing은 다루지 않는다. description의 packed struct는 74행에서 쓰지 말라고만 한다. 부분 미이행이다. |
| F | 6 | 243행 다음 편(GPIO 드라이버)이 seriesOrder 37과 맞고 관련 링크와 100행 "2-10" 참조가 실제 글과 일치한다. 템플릿 외 고유 구조는 없다. |
| G | 1 | Armv7-M ARM·CMSIS·reference manual 링크가 없다. |

uncertainties:
- 229행 "대부분의 STM32는 1 cycle 만에 clock이 들어온다"와 errata 언급은 출처가 없다.
- 21행 "register 접근의 모든 변종을 다룹니다"는 과장이다.

병합 대상: 병합 대상 없음. `volatile`·MMIO라는 독립 검색 의도가 있으므로 `보강`으로 다룬다. 다음 조치는 Aliasing 절 추가 또는 제목 축소, access width 표를 사양값이나 TBD로 정리, 4-01·4-03과 겹치는 GPIO 코드를 링크로 대체.

### part4-03-gpio-driver.md

factcheck `오류 확인`: 229행 dump는 `MODER = 0x28000c00`이고 주석은 "PA5=01 (output), PA9/10=10 (AF)"라고 한다. `0x0c00`은 bit 11·10이 모두 1이라 PA5 필드는 `11`이고, 239행 "`0x28000c00 >> 10 & 3 = 1`"은 실제로 3이다. PA9/10 자리(bit 21:18)도 0이다. 231행 `OSPEEDR = 0x0c000c00`도 PA5 필드가 `11`인데 주석은 "PA5=high"(`10`)라고 한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 설정 구조체 기반 드라이버(98~173행), UART·I2C·LED·button 사용 예(177~207행), speed 선택 표(85~90행), BSRR toggle(213~217행)이 구체적이다. 15·19행은 "reference manual을 확인해야 합니다"로 시작한다. |
| B | 14 | register 역할 → mode → PP/OD → speed → 드라이버 → 사용 → 검증 → 함정까지 완결된다. |
| C | 9 | 바로 쓸 수 있는 드라이버 코드와 gdb register dump 확인 절차가 있다. 그 dump 값이 주석·계산과 맞지 않아 검증 절차로서의 가치가 깎인다. |
| D | 10 | PP/OD 설명(68~79행)은 1-03 `gpio-internals`와, BSRR·struct는 4-02와 겹친다. 드라이버 API 설계는 이 글만의 것이다. |
| E | 8 | 제목("HAL 없이 레지스터로")과 본문이 일치한다. |
| F | 6 | 273행 다음 편(클럭)이 seriesOrder 38과 맞고 관련 링크가 일치한다. 템플릿 외 고유 구조는 없다. |
| G | 1 | STM32 reference manual·datasheet AF 표 링크가 없고 대상 family를 고정하지 않는다(15·19행). |

uncertainties:
- 89~90행 speed별 권장 주파수(SPI 20 MHz, 50+ MHz)는 출처가 없다.
- 211행 "두 write로 분리합니다"와 214~217행 한 번 쓰는 코드가 다르다.

### part4-04-clock-setup.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | HSE 8 MHz → 168 MHz PLL 계산(53~58행)을 register 코드(105~110행)와 1:1로 맞추고, flash latency·voltage·PLL·prescaler·switch 순서(90~127행), TIM ×2 규칙(153~160행), MCO 검증(164~180행)까지 구체 값으로 쓴다. 완곡 표현이 거의 없다. |
| B | 15 | reset 상태 → clock tree → 계산 → latency → bus 한계 → 코드 → peripheral enable → 검증 → 함정까지 이어진다. HSE bypass 설정 등 Nucleo 쪽 예외는 188행 한 문단이다. |
| C | 10 | MCO2로 42 MHz가 나와야 한다는 예상 결과(180행)와 HSI 대비 약 10배라는 비교 기준(182행)이 있다. 실제로 잰 파형은 없다. |
| D | 11 | PLL 개념은 1-02 `clock-timing`과, SystemInit 클럭 설정은 3-06과 일부 겹친다. STM32F4 클럭 초기화 절차라는 역할은 분명하다. |
| E | 8 | 제목의 HSE·PLL·SYSCLK·AHB/APB 분주를 모두 다룬다. 21행은 F4 기준이라 하면서 75행은 F411·F407, 85행은 F407, 91행은 Nucleo를 섞어 대상 독자가 흐려져 9점은 주지 않았다. |
| F | 7 | 코드 안 1~7단계 주석(91~126행)이 앞 표의 순서와 대응해 긴 코드의 방향을 잡아 준다. 214행 다음 편(인터럽트)이 seriesOrder 39와 맞고 관련 링크가 일치한다. |
| G | 2 | 대상(STM32F4, 85행 F407 계열)을 적었다. RM0090 같은 1차 출처 링크는 없다. |

uncertainties:
- 66~71행 wait state 경계값(≤64 MHz 1 WS 등)과 36~37행 HSE ±20 ppm, HSI ±1%는 출처를 확인하지 않았다.
- 91행 "8 MHz crystal on Nucleo"와 188행 "Nucleo는 ST-Link MCO에서 8 MHz를 공급"이 같은 보드의 HSE 공급 방식을 다르게 말한다. 92행 코드에 bypass 설정이 없는 것이 맞는지 미확인.
- 19행 "clock 설정 누락이 90%"는 출처 없는 수치다.

### part4-05-interrupt-handling.md

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | EXTI13 전체 설정(112~143행), 4-04 클럭과 이어지는 TIM2 1 kHz 계산(148~169행), WFE/SEV 이벤트 루프(174~192행), GPIO pulse로 ISR 시간을 보는 방법(200~211행)이 구체적이다. 27·81·104행은 "확인해야 합니다", "달라집니다"로 끝난다. |
| B | 14 | vector 명명 → NVIC 상태 → priority·grouping → 예제 셋 → 확인 → 함정까지 완결된다. |
| C | 10 | 스코프 측정 방법과 pending register 확인 절차(213~220행)가 있다. 실제 pulse 폭은 "측정해야 합니다"(211행)로 비워 두었다. vector offset 계산(39~44행, IRQ 37 → 0xD4)은 맞는다. |
| D | 9 | vector table·NVIC·tail-chaining(25~104행)이 2-04 `cortex-m-exceptions`와, pending 확인은 10-07 `interrupt-debugging`과 겹친다. |
| E | 8 | 제목의 NVIC·Priority·Vector·EXTI를 모두 다룬다. |
| F | 7 | 예제마다 번호 단계 주석(114~132행)이 있고 256행 다음 편(SysTick)이 seriesOrder 40과 맞는다. 다른 시리즈 링크(263행)도 라벨과 대상이 일치한다. |
| G | 1 | Armv7-M ARM·reference manual 링크가 없고, 대상 칩이 50행 `startup_stm32f411xe`와 151행 84 MHz TIM 클럭(4-04의 F407 설정) 사이에서 섞인다. |

uncertainties:
- 217행 `ISPR[1] = 0x40`은 IRQ 38에 해당한다. EXTI15_10의 IRQ 번호를 이 글이 밝히지 않아 맞는지 판단하지 못했다.
- 251행 정리 순서(enable → priority)와 코드 순서(131~132·158~159행, priority → enable)가 다르다.
- 166행 `TIM2->SR &= ~TIM_SR_UIF`의 read-modify-write 방식이 권장 방식인지 미확인.

### 시리즈 공통 문제

- 관련 글·다음 편 라벨이 실제 대상과 다름: `part3-08-memory-layout.md`(218행), `part3-12-bootloader-chain.md`(275·279·280행), `part4-01-first-baremetal.md`(244행). 루프 03의 다섯 편과 같은 유형이다.
- 예제 출력·코드가 같은 글의 다른 위치나 자기 계산과 맞지 않음(`오류 확인` 근거): `part3-10-map-file-analysis.md`(61·63·66·128행), `part3-11-make-cmake-cross.md`(204·219행), `part4-03-gpio-driver.md`(229·231·239행). 결론끼리 반대인 `part4-01-first-baremetal.md`(15·236행)도 같은 유형이지만, 2026-10-11 독립 검증에서 단서와 정리의 충돌로 판정되어 `미검증`으로 내렸다. `오류 확인`은 세 편이다. 출력 예를 실제 빌드·디버거에서 가져오지 않은 것으로 보인다(INF).
- 같은 GPIO·startup 코드가 여러 글에 반복됨: PA5 레지스터 매크로와 BSRR set/reset이 `part4-01-first-baremetal.md`(114~119행), `part4-02-mmio-access.md`(109~116·139~140행), `part4-03-gpio-driver.md`(166~168행), `part4-05-interrupt-handling.md`(202·207행)에 있다.
- 측정·비교 표를 서술 한 칸으로 채움: `part3-08-memory-layout.md`(176~178행), `part3-09-compiler-optimization.md`(160~162행), `part3-10-map-file-analysis.md`(182~184행).
- 제목 키워드 일부를 본문이 다루지 않음: `part3-09-compiler-optimization.md`(비교 결과), `part3-11-make-cmake-cross.md`(Sysroot), `part4-02-mmio-access.md`(Aliasing).
- 본문에 1차 출처 링크가 없음: 10편 전부. 대상 칩을 명시한 `part4-04-clock-setup.md`만 G 2점이다.
- 같은 H2 뼈대: `part3-08`~`part3-11`은 루프 03과 같은 8개 H2, `part4-01`~`part4-05`는 "코드 예제·측정 / 동작 확인" 변형 8개 H2를 쓴다. 다른 뼈대는 `part3-12-bootloader-chain.md` 하나다.
