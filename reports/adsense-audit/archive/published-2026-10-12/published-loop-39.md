# 공개 글 AdSense 평가 — 루프 39

> 대상: 공개 글 10편 (Practical RTOS Internals `seriesOrder` 42~51)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른아홉 번째 루프다. 대상은 `src/content/blog/embedded/rtos/practical-internals/`의 Part 4 끝 네 편(part4-10 syscall, part4-11 TrustZone·TF-M, part4-12 AMP·OpenAMP, part4-13 C++ in RTOS)과 Part 5 앞 여섯 편(part5-01 FreeRTOS 소스, part5-02 Zephyr 소스, part5-03 RT-Thread, part5-04 포팅, part5-05 선택 가이드, part5-06 NuttX)이다. 모두 시리즈 'Practical RTOS Internals'이고 seriesOrder는 42~51이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 평가 시점 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part4-10-syscall.md` | 13 | 12 | 6 | 11 | 6 | 6 | 1 | **55** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part4-11-trustzone-tfm.md` | 11 | 12 | 6 | 6 | 7 | 6 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part4-12-amp-openamp.md` | 13 | 12 | 7 | 12 | 8 | 6 | 1 | **59** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part4-13-cpp-in-rtos.md` | 13 | 12 | 6 | 8 | 6 | 4 | 1 | **50** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part5-01-freertos-source.md` | 11 | 12 | 5 | 6 | 6 | 7 | 2 | **49** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part5-02-zephyr-source.md` | 12 | 12 | 5 | 10 | 6 | 7 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `part5-03-rt-thread.md` | 12 | 11 | 5 | 11 | 5 | 6 | 2 | **52** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `part5-04-porting.md` | 11 | 11 | 6 | 6 | 6 | 7 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `part5-05-selection-guide.md` | 13 | 11 | 5 | 12 | 8 | 7 | 1 | **57** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `part5-06-nuttx.md` | 11 | 11 | 6 | 13 | 5 | 6 | 1 | **53** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |

평균 52.6점(10편, 합 526점), 범위 48~59점이다. 판정은 우선 조치 7편, 병합 검토 3편이고 유지·검증 대기·보강·제외 검토는 없다. 10편 모두 점수 구간은 병합 검토(40~59)이며, 오류 확인 7건(part4-10·4-11·4-12·4-13·5-01·5-02·5-04) 때문에 7편이 우선 조치로 올라갔다. 오류 확인 7건 중 4건(4-10·4-11·4-12·4-13)은 원문 내부 모순·산술 불일치만으로 성립하고, 3건은 1차 자료도 열어 확인했다: part5-01은 FreeRTOS-Kernel V11.2.0 `port.c`·`tasks.c`, part5-02는 Zephyr main(e35b686b) `kernel.h`·`sem.c`, part5-04는 FreeRTOS-Kernel main `portable/GCC/ARM_CM4F/port.c`. '검증됨'은 없다. 10편 모두 git log에 1차 자료와 대조한 기록을 남긴 커밋이 없고, part5-05의 b2db16fd도 대조한 자료를 밝히지 않아 인정하지 않았다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목·본문 링크 대상 파일의 제목·seriesOrder까지이고, 렌더링·광고 배치·sitemap은 보지 않았다. part5-01과 part5-04의 FreeRTOS port 코드 중복은 시리즈 안 자기 중복이라 P0가 아니라 D에서 감점했다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part4-10-syscall.md` | 55 | 55 | 0 | 없음 |
| `part4-11-trustzone-tfm.md` | 49 | 49 | 0 | 없음 |
| `part4-12-amp-openamp.md` | 59 | 59 | 0 | 없음 |
| `part4-13-cpp-in-rtos.md` | 50 | 50 | 0 | 없음 |
| `part5-01-freertos-source.md` | 50 | 49 | -1 | 없음 |
| `part5-02-zephyr-source.md` | 54 | 54 | 0 | 없음 |
| `part5-03-rt-thread.md` | 53 | 52 | -1 | 없음 |
| `part5-04-porting.md` | 48 | 48 | 0 | 없음 |
| `part5-05-selection-guide.md` | 59 | 57 | -2 | 없음 |
| `part5-06-nuttx.md` | 53 | 53 | 0 | 없음 |

- 기각한 오류 확인은 없다. 평가자가 올린 오류 확인 4건(part4-10 151행 vs 140·163행, part4-11 67행 bit 28, part4-12 52행 vs 53·54·63·336행, part5-01 137~142행 vs 195행)은 원문에서 다시 확인했고 모두 성립한다.
- 추가한 오류 확인은 3건이다. part4-13: 34·36~39행 MutexGuard는 xSemaphoreTake 반환값으로 분기하는데, 그 코드의 컴파일 결과라고 내세운 439~448행 출력에는 비교·분기가 없고 448·451행은 'C 수동 버전과 동일, overhead 0'이라 한다. 평가자는 uncertainties에 두었으나 AP-C-24에 따라 내부 모순으로 올렸다. part5-02: Zephyr main(e35b686b)을 열어 127~153행 sem->lock이 struct k_sem(kernel.h 3738~3750행)에 없고, 306~309행 `&thr0_thread`·`k_thread_cpu_mask_disable_all`이 kernel.h에 없으며 cpu_mask_enable 대상은 runnable이면 안 된다(1252~1265행)는 것을 확인했다. part5-04: 53~54행 8워드 초기 프레임과 160~161·170행 9워드 `{r4-r11, lr}` save/restore가 61행 'R0=pvParameters, PC=pxCode로 시작'과 동시에 참일 수 없고, FreeRTOS-Kernel ARM_CM4F port.c는 portINITIAL_EXC_RETURN 슬롯을 따로 둔다.
- 위 세 편은 판정이 병합 검토 → 우선 조치로 바뀌었다. 점수 구간은 그대로 병합 검토다.
- part5-01 A 12→11: 독자 기여로 든 '흥미로운 세 곳' 중 셋째(338행)가 1차 자료와 다른 초기 frame(137~142행)에 기대고, 코드 대부분이 5-04·2-05·3-07과 겹치는 재구성이다.
- part5-03 E 6→5: 제목이 '분석'을 약속하는데 연혁·채택 사례·별점표(26~40·285~315행)가 크고 Studio·Smart·POSIX가 얕아 rubric E의 '분석 약속 + 개념 소개 수준이면 3~5'를 적용했다.
- part5-05 A 14→13, B 12→11: 평가자가 놓친 추천 간 충돌(66~67행 하드웨어 표는 Cortex-M0/M3에 Zephyr를 두지 않는데 178~182행 IoT 센서는 Zephyr 1순위)과 14·311행 '세 축' 대 제목 네 축·본문 일곱 축 불일치를 반영했다.
- part5-01 series_issues: 평가자가 '2-03 92행도 배열 인덱스 매크로'라고 했지만 2-03 91행은 배열 선언만 있어 목록에서 뺐다.
- part5-03 D 근거: 비교표(303~313행)가 5-02 표에 'RT-Thread 열만 더한 반복'이라는 평가자 근거는 과하다. 같은 행은 커널 LoC(306↔288)와 devicetree(310↔289) 두 행뿐이다. 점수 11 유지.
- 줄 번호 보정(점수 영향 없음): part4-10 D(part2-05 136~154·221~223행, part5-02 272~282행, freertos-mastering ch12 165~176행), part4-11 D(ch04 105~119·196~199행, part12-12 140~149행, part2-09 165~170행), part5-01 D(5-04 136~142행, 3-07 25~43행, 2-01 81~97행), part5-04 D(2-07 51~66행), part5-05 B(92→91행), part5-06 F·C(195·218행, NSH 출력 167~189행).
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `part4-10-syscall.md` — 55점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(코드 vs 같은 글이 밝힌 규칙과 산문). 151행 `.uxPriority = 3 | portPRIVILEGE_BIT,  /* bit 미설정 = unprivileged */` — 주석이 밝힌 규칙대로면 bit를 켠 이 task는 privileged다. 그런데 140행은 "xTaskCreateRestricted로 만든 task는 *unprivileged*로 동작하며, 허용 region만 access"한다고 하고, 163행은 pcName "user"(148행)인 이 task가 "허용되지 않은 메모리에 접근하면 MemManage fault가 즉시 발생"한다고 쓴다. 151행 코드와 140·163행 설명은 글 스스로의 규칙 아래서 동시에 참일 수 없다. git log(0a9dd7bc slug 고정, be973200 topic 메타데이터, ac24bb76 제목 변경 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | SVC immediate를 stacked PC-2에서 읽는 핸들러(73~95행), ECALL 대비(99~136행), FreeRTOS-MPU와 Zephyr USERSPACE 비교(138~202행), 선택 기준(277~282행), user pointer 검증·ABI 고정 함정(308~321행)의 묶음은 고유하다. 그러나 각 절은 ARM·RISC-V·FreeRTOS·Zephyr 입문 자료의 표준 설명이고, 18행 ThreadX USERSPACE, 224행 seL4 capability, 252~265행 ARINC-653·ISO 26262 불릿은 근거 없는 일반론이다. 독자 측정·실패 사례가 없어 13~19 구간 하단. |
| B | 12 | 문제(16~24행) → 권한 레벨(26~48행) → SVC·ECALL(50~136행) → FreeRTOS-MPU·Zephyr(138~202행) → capability(204~224행) → overhead(226~244행) → 적용 기준(267~282행) → 함정(284~321행) → 정리(323~331행)로 흐름은 완결이다. 그러나 핵심 예제 151행에 privilege bit 모순이 있고, FreeRTOS-MPU region 정렬·개수 제약, 76행 무조건 PSP 읽기(MSP 사용 중 svc 처리)가 빠졌다. 정확성 문제가 열려 있어 AP-C-24에 따라 13 이하. |
| C | 6 | `syscall_dispatch`·`read_reg`·`csr_read`·`current_task`(90·123·121·216행)가 정의되지 않아 그대로 빌드되지 않고 대상 MCU·툴체인·FreeRTOS/Zephyr 버전이 없다. overhead 표(230~238행: 진입 ~12, dispatch ~30, 복귀 ~10, round-trip ~60 cycle)와 240~242행(A53 ~50 cycle, Linux 80~200 ns, vDSO ~5 ns)은 출처·측정 환경 없는 수치라 rubric 3-1 'C ≤ 8'. 측정 절차(DWT CYCCNT 등)도 없어 4~7 구간. |
| D | 11 | 같은 시리즈 part2-05-cortex-m-context.md 136~154행·221~223행은 SVC를 첫 task 시작용으로 다루고 SVC vs PendSV 표를 둬 이 글 50~97행(syscall dispatch)과 역할이 다르다. part2-07-riscv-context.md 129~146행 ecall trap 조각(mcause 검사)이 이 글 99~134행과 겹친다. part5-02-zephyr-source.md 272~282행 'User Mode — MPU/MMU 분리'가 이 글 179~202행과 같은 설명이다. part4-06-stack-overflow.md 155행 부근 xTaskCreateRestricted는 stack guard 관점이라 겹침이 작다. 인접 part4-09(41)·part4-11(43)은 주제가 다르다. 다른 시리즈 freertos-mastering/chapter12-mpu-support.md 165~176행 MPU wrapper가 이 글 165~177행과 거의 같지만 draft라 공개 중복은 아니다. 10~14 구간. |
| E | 6 | 제목 키워드 SVC(50행)·ECALL(99행)·User/Kernel 분리(26·267행)·FreeRTOS-MPU(138행)는 절이 있다. description(5행)이 약속한 'syscall overhead 측정'은 출처 없는 cycle 표(230~242행)뿐이고 측정 방법이 없어 부분 미이행. |
| F | 6 | 333행 다음 편 4-11 링크는 seriesOrder 43 part4-11-trustzone-tfm.md('TrustZone과 TF-M')와 맞고 248행 예고도 같다. 337~340행 관련 항목 라벨(2-05 seriesOrder 15, 2-07 17, 4-06 38, 4-09 41)도 대상 제목과 맞는다. 다만 4-09는 syscall과 내용 연결이 없고 실제로 이어지는 part5-02 User Mode 절은 빠졌으며 전제 지식 안내가 없어 7 이상은 주지 않는다. |
| G | 1 | 본문에 1차 출처 링크가 없다. ARMv7-M ARM, RISC-V Privileged Spec, FreeRTOS-MPU 문서, Zephyr userspace 문서 중 어느 것도 인용하지 않고 FreeRTOS·Zephyr 버전 표기도 없다(170행 xPortRaisePrivilege 방식의 기준 버전 불명). 230~242행 수치도 출처가 없다. |

uncertainties:
- 151행: portPRIVILEGE_BIT를 켜면 privileged task가 된다는 것을 FreeRTOS 1차 자료로 열어 보지 않았다. 판정은 151행 주석 규칙과 140·163행의 내부 모순에만 근거한다.
- 165~177행 xPortRaisePrivilege/vPortResetPrivilege 구조가 V10.6 이후 MPU wrapper v2에서 바뀌었는지 upstream으로 확인하지 않았다.
- 18행 'ThreadX도 USERSPACE 옵션' — ThreadX는 Modules 방식으로 기억하며 옵션명 미확인.
- 290~291행 `extern TCB_t pxCurrentTCB; pxCurrentTCB.uxPriority` — pxCurrentTCB는 tasks.c의 포인터로 기억해 컴파일·링크되지 않을 수 있다. 미확인.
- 119~133행은 scause/sepc(S-mode CSR)를 쓰면서 132행은 'mret 또는 sret'로 복귀한다고 적는다. 사양 미확인.
- 230~242행 cycle·ns 수치는 출처·측정 환경이 없다. 산술(52≈60 cycle, 60/168MHz≈0.36µs, 50/1.2GHz≈42ns)은 스스로는 맞다.
- 244행 '10배 이상', 271행 '수십~수백 배', 329행 '수십~수백 cycle'이 같은 비용을 서로 다른 크기로 표현한다(산문 표기 불일치라 오류 확인에 넣지 않음).
- 76~97행 SVC_Handler가 무조건 PSP를 읽는다. EXC_RETURN bit 2 검사 필요 여부는 ARMv7-M ARM으로 확인하지 않았다.
- 136행 'RISC-V는 A0-A5 + A7'은 Linux syscall ABI 관례로 보이며 출처 미표기.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로 보면 병합 대상 없음. syscall 경계(SVC/ECALL trap, API wrapper, capability)라는 독립 검색 의도가 있고, 겹치는 part5-02 272~282행·part2-07 129~146행은 각 글의 일부 절이다. 151행 privilege bit 모순을 FreeRTOS task.h·FreeRTOS-MPU 문서로 고친 뒤 다음 조치는 보강이다. overhead 표에 측정 환경·출처를 달거나 TBD로 두고, FreeRTOS·Zephyr 버전과 ARM/RISC-V 사양 출처를 본문에 넣는다.

### `part4-11-trustzone-tfm.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 안의 산술 불일치(rubric 3-1). 67행은 '같은 물리 주소가 bit 28을 통해 두 alias로 보입니다'라고 쓰고 같은 문단에서 `0x0800_0000`(NS view)과 `0x0C00_0000`(S view)을 예로 든다. 54~55행 flash 표도 같은 두 주소다. 0x0C00_0000 - 0x0800_0000 = 0x0400_0000이므로 차이는 bit 26이고 bit 28이 아니다. bit 28 차이는 59~60행 SRAM 쌍(0x3000_0000과 0x2000_0000)에만 맞는다. git log(2bb21c78·2083e506·90d61d54 본문 작성, 845231cf 다이어그램, 85a2d46f 번역투·발행, 2d0f689c·68525f0c 코드 블록, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | S/NS 두 세계(26~46행), SAU/IDAU(48~87행), NSC veneer와 SG(89~141행), cmse_check_address_range(143~157행), TF-M(159~173행), PSA Crypto(175~207행), attestation(209~225행), boot chain(227~234행)은 TrustZone-M 입문 자료의 표준 목록이고 다른 시리즈 세 편에도 거의 같은 순서로 나온다. 이 글에만 있는 것은 18행(4-10의 MPU 기반 분리와 신뢰 도메인 분리 구별)과 280~290행 cross-world call cycle 표인데, 표에는 출처와 환경이 없다. 함정 절(294~341행)은 표준 목록이고 320~322·328~331행은 한 줄짜리 개념 표시다. 앵커 part1-04(10)보다 조금 높다. |
| B | 12 | 문제 정의(16~24행)부터 정리(343~352행)까지 이어진다. 그러나 RTOS internals 시리즈라면 중심이어야 할 'NS RTOS가 task마다 secure context를 어떻게 관리하는가'가 빠졌다(22·37행은 FreeRTOS를 NS에 둔다고만 함). description이 약속한 PSA Storage API는 168~169행 partition 이름 두 줄뿐이다. 67행 bit 28 불일치와 정확성 불확실(207·234·242~245·268행)이 열려 있어 AP-C-24에 따라 13 이하. |
| C | 6 | 280행은 'Cortex-M33 @ 110 MHz 측정'이라고만 하고 칩·컴파일러·최적화 옵션·측정 방법·TF-M 버전이 없다. 284~290행 '~25', '~12000', '~3.5 M'도 근거가 없어 rubric 3-1 'C ≤ 8'(내부 산술은 맞음). 코드 예(71~85·103~118·123~138·177~205·213~223행)에 117행 `psa_aead_encrypt(/* ... */)`, 215행 `get_random`, 222행 `upload_to_server` 같은 자리표시가 있고, -mcmse·import library 링커 옵션과 대상 보드가 없다. 181·192·199행은 반환값을 검사하지 않는다. |
| D | 6 | 같은 시리즈 part4-10-syscall.md(42)는 246~248행 'TrustZone 한 줄' 절만 겹치고 part4-12(44)는 주제가 다르다. 다른 시리즈 공개 글과 많이 겹친다. (1) embedded-security/chapter04-trustzone.md: SAU 설정 코드(105~119행), NSC·cmse_nonsecure_entry·cmse_check_address_range(121~150행), PSA RoT service(179~194행), 함정(196~199행)이 이 글 48~87·89~157·159~173·307~316행과 같고 entry 함수 이름 secure_aes_encrypt까지 같다(이 글 108·112~113행). (2) modern-recipes/part12-12-tfm-trustzone.md: SPE/NSPE·NSC·SG(26~44행), boot chain(73행), attestation(140~149행), PSA Certified 표(284~293행)가 이 글 26~46·89~99·227~234·213~225·236~245행과 대응한다. (3) modern-recipes/part2-09-trustzone-m.md 24~82·165~170행이 이 글 26~121·335~341행과 같다. 5~9 구간. |
| E | 7 | 제목 키워드 Secure/Non-Secure(26~87행), NSC Veneer(89~141행), TF-M(159~173행), PSA(175~247행)와 description의 SAU/IDAU·SG·Attestation·secure boot chain은 모두 절이 있다. 'PSA … Storage API'는 168~169행 partition 이름뿐이고 M55/M85는 이름만 나와(22·28행) 1점 감점. |
| F | 6 | 354행 다음 편 '4-12 AMP와 OpenAMP'는 seriesOrder 44 part4-12-amp-openamp.md와 맞다. 관련 항목 358~361행 라벨도 대상 제목(part4-06 Stack Overflow 탐지, part4-10 RTOS System Call, part4-12, embedded-cpp/part2-01-raii-basics.md)과 맞는다. 그러나 4-06과 RAII 기초는 TrustZone과 관련이 약하고, 같은 주제를 깊게 다룬 embedded-security ch04나 modern-recipes part12-12는 링크하지 않는다. audit:reading·모바일 확인은 하지 않았다. |
| G | 1 | 본문에 1차 출처 링크가 하나도 없다. Armv8-M ARM, CMSE(ACLE) 문서, TF-M 문서와 버전, PSA Certified 공식 문서가 빠졌다. 161행 라이선스, 242~245행 PSA Level 정의, 268행 S32K3 구성, 280행 측정 환경을 출처와 버전 없이 단정한다. |

uncertainties:
- 67행 '-mcmse 옵션으로 … 적절한 alias로 접근하도록 코드를 생성'한다는 주장. alias 선택은 링커 스크립트와 주소 배치가 정한다고 알고 있으나 ARM 문서로 확인하지 않았다.
- 75~80행 C 코드에 `0x0800'0000` 같은 자릿수 구분자를 썼다. C23 이전 C 컴파일러에서 컴파일되지 않을 수 있다(미확인).
- 64행 'GPIO, UART : Non-Secure (또는 NSC)' — 주변장치에 NSC 속성을 주는 것이 일반적인지 확인하지 않았다.
- 161행 TF-M 라이선스 'Apache 2.0' — BSD-3-Clause로 기억하지만 TF-M 저장소로 확인하지 않았다.
- 207행 'AES key를 read해 가는 API는 존재하지 않습니다' — psa_export_key는 PSA_KEY_USAGE_EXPORT가 없을 때만 막힌다고 기억한다. 명세 미확인.
- 234행 서명 검증 chain 전체를 'measured boot'라고 부른다. secure boot와의 구분은 TF-M 문서로 확인하지 않았다.
- 242~245행 PSA Certified 표가 modern-recipes/part12-12-tfm-trustzone.md 286~291행과 다르다. PSA Certified 공식 문서로 가려야 한다.
- 265~268행 NXP S32K3 'M33 core — TrustZone, HSM 역할'이 실제 코어 구성(M7 + HSE)과 맞는지 미확인.
- 280~290행 cycle·시간 수치 전체에 출처·보드·측정 방법이 없다(내부 산술은 맞음).
- 46행 'NS에서 IRQ를 막아도 Secure IRQ는 계속 들어옵니다'의 AIRCR.PRIS 조건을 ARMv8-M ARM으로 확인하지 않았다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로 보면 후보는 `src/content/blog/embedded/embedded-security/chapter04-trustzone.md`(SAU 코드·NSC·cmse·PSA RoT·함정이 같고 함수 이름까지 겹침)이고 modern-recipes part12-12·part2-09도 같은 내용을 싣는다. 먼저 67행 alias 비트 서술을 Armv8-M 자료로 고친다. 그 뒤 TrustZone-M 정본을 어느 시리즈에 둘지 정하고, 이 글은 RTOS 관점(NS RTOS의 secure context 관리, cross-world call 비용 측정)으로 좁혀 보강하거나, 차별점이 서지 않으면 공통 설명을 embedded-security ch04 링크로 대신한다.

### `part4-12-amp-openamp.md` — 59점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 52행 표는 0x4000_0000~0xBFFF_FFFF 전체를 'Linux 점유'로 적는데, 같은 표 53행은 그 안의 0xBFF0_0000~0xBFFF_FFFF를 reserved-memory 공유 영역으로, 54행은 그 안의 0x8000_0000~0x8007_FFFF를 'Cortex-M firmware 전용'으로 적는다. 63행('각 코어는 자기 메모리에서 자기 OS만 본다', 'reserved-memory로 Linux가 일반 메모리로 사용하지 못하게 막는다')과 336행('이 노드가 없으면 Linux가 해당 영역도 일반 메모리로 사용')은 52행 'Linux 점유'와 동시에 참일 수 없다. 329~330행 DTS(0xbff00000, 크기 0x100000)가 53행과 같은 범위라 모순은 52행 쪽이다. git log(2bb21c78 stub, 2083e506·90d61d54 본문, 845231cf 다이어그램, 85a2d46f 번역투, 2d0f689c text 블록, ac24bb76 제목, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 이 글이 보탠 부분은 resource table로 양쪽이 같은 vring을 보게 되는 과정(168행), M-core firmware만 교체하는 패턴(170행), SoC별 mailbox peripheral 표(176~182행), R-Car S4 도메인 구성(241~256행), cacheable 공유 영역·reserved-memory 누락·start 누락·작은 메시지 폭주 함정(315~358행)이다. OpenAMP 3 layer(69~73행), RPMsg channel/endpoint(112행), remoteproc sysfs(154~166행)는 기본 설명 수준이다. 146행 '차단되거나 즉시 실패합니다', 349행 'SoC도 존재합니다'는 양쪽을 열어 둔 문장이다. 앵커 part12-10(18)처럼 직접 계산·선택 기준을 낸 결론이 없어 13~19 구간 하단. |
| B | 12 | 문제(16~24행) → SoC 구성(26~44행) → 메모리·부트(46~63행) → OpenAMP·RPMsg·vring·remoteproc·mailbox(65~184행) → 응용(186~235행) → 측정(286~311행) → 함정(313~358행) → 정리(360~368행)로 끝까지 간다. 그러나 52~54행 표가 63·336행과 모순이고, 125행('수신 측은 used ring 확인')과 135~136·146행의 producer/consumer 설명이 맞물리지 않는다. RPMsg name service, resource table 형식은 이름만 있고 217행 `imu_ep`는 생성 코드가 없다. AP-C-24에 따라 B ≤ 13. |
| C | 7 | remoteproc sysfs 명령(154~166행), reserved-memory DTS(327~334행), Linux user-space rpmsg 코드(225~235행)는 따라 할 수 있다. 97·105행 `platform_create_rpmsg_vdev`·`platform_poll`은 어느 데모의 헬퍼인지 밝히지 않았다. 지연 표(288~309행)는 SoC 이름만 있고 측정 방법·클럭·커널/OpenAMP 버전·출처가 없어 rubric 3-1 'C ≤ 8'. 예제의 실행 조건·예상 출력이 없어 4~7 구간. |
| D | 12 | 같은 시리즈 인접 part4-11(43)·part4-13(45)은 주제가 겹치지 않는다. part4-07-smp-rtos.md 20~22행은 AMP를 한 문단으로 소개하고 '4-12편에서 다룬다'고 넘긴다. part5-07-preempt-rt-linux.md는 18·286행에서 언급만 한다. 다른 시리즈 공개 글 modern-recipes/part11-06-mailbox.md와 일부 겹친다: mailbox peripheral 목록(그 글 145행 ↔ 이 글 176~182행), STM32MP1 IPCC 지연(199~202행 ↔ 297~302행), cacheable 공유 메모리 함정(247행 ↔ 315~323행). 그 글은 raw mailbox 프로토콜, 이 글은 OpenAMP framework라 핵심 질문이 다르다. qemu-embedded ch15·zynq-book ch11은 draft. |
| E | 8 | 제목의 Heterogeneous SoC·RPMsg·remoteproc은 26~44·110~125·150~170행에서, description의 libmetal·virtio-vring·mailbox·i.MX·STM32MP·RP2350도 79·127~148·172~184·260~284행에서 다룬다. 대상 독자와 풀려는 구체 문제가 명시되지 않아 9 이상은 아니다. |
| F | 6 | 370행 다음 편 4-13은 seriesOrder 45 part4-13-cpp-in-rtos.md와 맞다. 374~376행 4-07(39)·4-11(43)·5-04(49) 라벨도 대상 제목과 맞다. 18행이 4-07 SMP와의 차이로 시작해 전제가 이어진다. 그러나 48·56·69·288·297·304행 소제목이 heading이 아닌 맨 문단이라 목차에 잡히지 않고, 114~123·131~144행 그림이 text 블록 ASCII다. 5-04 링크는 본문과 연결 설명이 없다. |
| G | 1 | 본문에 OpenAMP·libmetal 저장소, Linux remoteproc/rpmsg 문서, SoC reference manual 링크가 없다. 67행 OpenAMP 기원·라이선스, 288~309행 지연 수치, 28~36행 SoC 코어 구성에 출처·버전이 없다. |

uncertainties:
- 52~54행 표를 'DDR 전체에서 일부를 떼어 낸 구조'로 읽을 여지는 있으나 칸이 'Linux 점유'·'전용'이라 모순으로 판정했다. 수정 시 실제 i.MX 8M Plus DTS로 확인할 것.
- 125행과 133~146행 producer/consumer 설명의 차이. 실제 RPMsg는 Linux virtio 쪽이 두 vring 모두에 buffer를 공급하는 구조로 알고 있으나 소스로 확인하지 않았다.
- 35행 TI AM62x, 34행 Zynq UltraScale+ 코어 구성은 데이터시트 미확인.
- 36행 RP2350 heterogeneous 표기와 262행 'boot 시 둘 중 한쪽 ISA 선택'의 긴장. datasheet 미확인.
- 239행 Cortex-A78 cluster와 242~244행 R-Car S4 Cortex-A55 × 8, Xen·COQOS·PikeOS 지원 미확인.
- 288~309행 지연 수치에 출처·클럭이 없다. 308행 '~50 ns (≈10 cycle)'은 200 MHz를 뜻하는데 RP2040 기본 클럭은 125 MHz로 알고 있다.
- modern-recipes/part11-06-mailbox.md 202행(STM32MP1 RPMsg ~15 µs)과 이 글 302행(RTT 9~14 µs)이 다르다(글 사이 차이).
- 97·105행 헬퍼가 OpenAMP 공식 API인지 미확인. 217행 `imu_ep` 생성 코드 없음.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간으로 보면 병합 대상 없음. modern-recipes/part11-06-mailbox.md는 raw mailbox 프로토콜이 질문이라 검색 의도가 다르고, qemu-embedded ch15·zynq-book ch11은 draft다. 다음 조치는 보강이다. 52~54행 메모리 표 모순을 고치고, 지연 표에 측정 환경·출처를 달고, OpenAMP·remoteproc 1차 출처를 본문에 넣는다.

### `part4-13-cpp-in-rtos.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(코드 vs 그 코드의 컴파일 결과라고 내세운 출력). 34행 생성자는 `xSemaphoreTake(mtx, timeout) == pdTRUE`를 locked_에 저장하고 36~39행 소멸자는 `if (locked_)`일 때만 xSemaphoreGive를 부른다. xSemaphoreTake는 외부 호출(442행 `bl`)이라 반환값을 컴파일 타임에 알 수 없어 비교·조건 분기가 남아야 한다. 그런데 439~448행 'C++ RAII (MutexGuard)' 출력에는 비교·분기 명령이 하나도 없고 448행 '24 bytes — 동일', 451행 'overhead가 0'이라고 적었다. git log(0a9dd7bc slug, be973200 topic, ac24bb76 제목, 1b2ffe6a text 블록, 85a2d46f 번역투·발행)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | RTOS 고유 내용은 155~176행 TaskBase, 184~222행 xQueueCreateStatic 기반 StaticQueue<T,N>, 145~153행 std::thread를 쓰지 않는 이유 세 가지다. 26~71행 MutexGuard, 73~105행 ScopedIRQDisable, 252~267행 플래그, 226~250행 ETL은 Embedded C++ 시리즈와 같은 내용이다. 141행 '별로 중요하지 않게 됩니다', 288행 '옵션에 달려 있습니다', 326행 '패턴이 일반적입니다'는 구체 기준 대신 쓴 일반론이다. |
| B | 12 | 16~24행 문제 정의에서 470~481행 정리까지 흐름은 이어진다. 하지만 311행 schedule_resume_after가 정의되지 않았고, 326행이 말하는 pool allocator가 298~304행 promise_type에 없어 coroutine 절을 따라 할 수 없다. 453~468행 MISRA·AUTOSAR 절은 불릿 다섯 개다. 423~451행 측정 절은 34~39행 코드와 맞지 않는다. AP-C-24에 따라 B ≤ 13. |
| C | 6 | FreeRTOS·GCC·ETL 버전과 보드가 없다. 263행 '~10%', 265행 '~10~20%', 334~340행 cycle 표(2, 5~7, 30+)는 출처·측정 환경이 없어 rubric 3-1 'C ≤ 8'. 425행 'Cortex-M4, -O2, FreeRTOS'만 있고 컴파일러 버전·명령이 없으며, 427~449행 출력에는 인자 준비 명령도, 34~39행 코드가 요구하는 분기도 없다. 합격·실패 검증 절차가 없다. |
| D | 8 | 인접 part4-12(44)·part5-01(46)은 주제가 달라 겹치지 않는다. 다른 시리즈와 겹침: 이 글 26~71·107~139행 ↔ embedded-cpp/part2-02-raii-patterns.md 29~97행(std::lock_guard, FreeRtosMutex·FreeRtosLockGuard), 77~92행 ScopedIRQDisable ↔ 같은 글 375~411행 CriticalSection(코드 사실상 동일), 423~451행 RAII overhead 어셈블리 ↔ 같은 글 474~492행(결론까지 같음), 252~267행 세 플래그 ↔ embedded-cpp/part1-02-compiler-flags.md 25~36·78~166행, 226~250행 ETL ↔ embedded-cpp/part4-02-etl-library.md 39~119행. TaskBase·StaticQueue·std::thread 비판은 이 글에만 있다. |
| E | 6 | 제목 키워드 RAII(26~105행), std::thread(143~178행), ETL(226~250행), Coroutine(290~328행)은 절이 있다. description의 'C++20 coroutine을 RTOS 위에 얹는 방식'은 정의 없는 311행 한 줄뿐이다. 제목·description은 RTOS 일반(18행 Zephyr·ThreadX)인데 코드는 전부 FreeRTOS API와 Cortex-M PRIMASK라 AP-C-24에 따라 E ≤ 8이고 부분 미이행까지 반영해 6. |
| F | 4 | 483행 다음 안내는 'Part 5 … RTOS porting'으로 part5-04-porting.md(seriesOrder 49)를 가리키지만 실제 seriesOrder 46은 part5-01-freertos-source.md('FreeRTOS 소스 분석')다. 다음 편 안내가 틀려 F ≤ 5. 관련 항목 487~491행과 본문 링크 105·250·342·468행 라벨은 대상 제목(part4-12, part2-01-raii-basics, part2-08-static-polymorphism, part3-10-ownership-model, part4-02-etl-library)과 맞는다. 334행 표 캡션이 본문 한 줄로 떨어져 있고 전제 지식 안내가 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. FreeRTOS·arm-none-eabi-g++(255행)·ETL 버전이 없고, 286~288행 LDREX/STREX·LDREXD 주장에 ARMv7-M ARM 인용이 없으며, 455~466행 MISRA C++·AUTOSAR C++14·JSF C++는 이름만 있고 문서·규칙 번호가 없다. |

uncertainties:
- 288행 '`is_lock_free()`를 컴파일 타임에 확인합니다' — 컴파일 타임 확인은 C++17 is_always_lock_free로 알고 있으나 표준 미확인.
- 288행 'ARMv7-M은 LDREXD/STREXD로 64-bit lock-free 지원' — ARMv7-M에는 LDREXD가 없는 것으로 알고 있으나 ARMv7-M ARM 미확인.
- 334~340행: Cortex-M4 코어에는 일반적으로 cache가 없는데 'hot cache'·'cold cache 30+'를 적었다. cycle 출처도 없다.
- 326행: promise type이 지정 allocator에서 할당된다고 했지만 298~304행 promise_type에 operator new가 없어 기본 heap 할당이 된다. 224행 no-heap 기조와 어긋날 수 있다.
- 263행 -fno-rtti '~10%' 절약은 embedded-cpp/part1-02-compiler-flags.md 393~394행 측정(약 6%)과 다르다(다른 글과의 불일치).
- 380행 '-fno-exceptions에서도 abort로 이어지므로' — -fno-exceptions에서 throw 식은 컴파일 오류로 알고 있다. GCC 문서 미확인.
- 442·446행 `bl xSemaphoreTake`·`bl xSemaphoreGive` — FreeRTOS에서 이 둘은 매크로로 알고 있어 심볼 이름이 실제 출력과 다를 수 있다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 먼저 423~451행 측정 절을 고친다. 실제 컴파일러 버전·명령과 함께 34~39행 MutexGuard를 컴파일한 출력으로 바꾸거나, 근거가 없으면 절을 지우고 embedded-cpp/part2-02-raii-patterns.md 474~492행 링크로 대신한다. 점수 구간 기준 병합 후보는 `src/content/blog/embedded/embedded-cpp/part2-02-raii-patterns.md`와 `part1-02-compiler-flags.md`이지만 TaskBase·StaticQueue·std::thread 비판은 이 글에만 있으므로 다음 조치는 보강이다. 겹치는 RAII·플래그·ETL 절은 Embedded C++ 링크로 줄이고, 483행 다음 편 링크를 part5-01-freertos-source로 고치고, 263·265·334~340행 수치는 출처를 찾거나 TBD로 둔다.

### `part5-01-freertos-source.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. (1) 원문 내부 모순: 137~142행 초기 frame은 xPSR·PC·LR·R12~R0(8워드) 아래에 R4~R11 8워드만 잡는데, 195행 PendSV는 `ldmia r0!, {r4-r11, lr}`로 9워드를 pop한다. 그러면 lr에 R0 자리의 pvParameters가 들어가 `bx lr`(203행)이 task로 가지 않으므로 338행 '정확히 모사합니다'와 동시에 참일 수 없다. 1차 자료 FreeRTOS-Kernel V11.2.0(태그 커밋 0adc196) `portable/GCC/ARM_CM4F/port.c` 225~226행에 `portINITIAL_EXC_RETURN` 슬롯이 있다. (2) 342행이 'FreeRTOS 11'이라 밝힌 346행 `#define pxCurrentTCB pxCurrentTCBs[xPortGetCoreID()]`는 V11.2.0 tasks.c 468행 `#define pxCurrentTCB xTaskGetCurrentTaskHandle()`과 다르다. (3) 188~190행 `cpsid f`/`cpsie f`는 V11.2.0 port.c 520~531행의 `msr basepri, configMAX_SYSCALL_INTERRUPT_PRIORITY`와 다르다(버전 표기가 없어 약한 근거). git log(42ebbcbb, 2bb21c78, 5cf58b6b, 0e21b56c, 85a2d46f, ac24bb76, be973200, 0a9dd7bc)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 것은 47행 읽는 순서(FreeRTOS.h→list.c→tasks.c→queue.c→port.c)와 그 이유, 330~338행 '흥미로운 세 곳' 정리다. 셋째 항목(338행)은 1차 자료와 다른 초기 frame(137~142행)에 기댄다. 나머지는 TCB(61~81행), ready list·CLZ(87~104행), Queue_t(212~236행), xQueueGenericSend(242~273행), PendSV(173~204행)를 줄여 옮긴 구성이고 5-04·2-05·3-07이 이미 다룬다. 설계 이유를 대안과 비교하지 않는다. 앵커 part1-04(10)보다 조금 위. |
| B | 12 | 도입(16~22행) → 저장소 구조(26~47행) → tasks.c(49~104행) → 생성부터 PendSV(106~206행) → queue.c(208~275행) → port.c(277~328행) → SMP(340~349행) → CMake(351~367행) → 함정(369~385행) → 정리(387~395행)로 기본 흐름은 완성됐다. 238행은 뮤텍스가 owner를 들고 다닌다고 하는데 213~232행 구조체에 owner 필드가 없다. AP-C-24에 따라 B ≤ 13. |
| C | 5 | 빌드 환경·보드·FreeRTOS 버전이 없고 독자가 관찰할 결과가 없다. 206행 'Cortex-M4 168 MHz에서 30~50 사이클, 300 ns'는 출처·측정 환경이 없어 rubric 3-1 'C ≤ 8'. 111~127행 xTaskCreate는 NULL 검사·실패 경로를 뺀 재구성이고, 137~142행 초기 frame은 195행 pop과 맞지 않아 그대로 쓰면 첫 스위치가 깨진다. 355~365행 CMake도 결과 확인 절차가 없다. |
| D | 6 | 같은 시리즈 part5-04-porting.md와 크게 겹친다: pxPortInitialiseStack(133~144행 ↔ 5-04 42~56행), xPortStartScheduler·svc 0(282~296행 ↔ 66~85행, 296행과 85행은 거의 같은 문장), PendSV asm(173~204행 ↔ 147~180행), '168 MHz 30~50 사이클'(206행 ↔ 182행), BASEPRI(317~328행 ↔ 136~142행), SMP 매크로(345~346행 ↔ 240~241행). part2-05-cortex-m-context.md 81~110행도 같은 PendSV 흐름이다. Queue_t(213~232행)는 part3-07-queue-impl.md 25~43행, CLZ 비트맵(93~104행)은 part2-01-ready-list.md 81~97행과 겹친다. 인접 4-13·5-02는 주제가 다르다. 다른 시리즈 modern-recipes/part2-03-arm-registers.md 119행 이하 PendSV 예는 부분 중복이고 freertos-mastering ch01은 draft다. queue.c 절과 읽는 순서가 이 글의 역할이라 5~9 구간. |
| E | 6 | 제목의 tasks.c·queue.c·port.c(49·208·277행 절)와 description의 'xTaskCreate부터 PendSV까지'(106행 절)를 다룬다. 그러나 'source 수준'·'추적'을 약속하는데 코드는 upstream 재구성이고(111~127·152~160행) 일부는 upstream과 다르다(137~142·188~190·346행). port.c는 Cortex-M4F 하나뿐이다. |
| F | 7 | 397행 다음 편 '5-02 Zephyr 커널 분석'은 seriesOrder 47 part5-02-zephyr-source.md와 맞다. 관련 항목 401~406행(2-01 seriesOrder 11, 2-05 15, 3-02 23, 3-07 28, 4-07 39, 5-04 49)과 본문 링크 240·349행 라벨이 대상 제목과 맞다. 47행 읽는 순서는 이 글 고유 구조다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 하지 않았다. |
| G | 2 | 22행 저장소 `github.com/FreeRTOS/FreeRTOS-Kernel`, 132행 파일 경로 주석, 342행 'FreeRTOS 11'이 있지만 링크·태그·커밋 기준이 없어 코드 블록이 어느 릴리스 기준인지 알 수 없다. 206행 수치는 출처가 없다. |

uncertainties:
- 33행 'tasks.c ~5000 lines'와 18행 '1만 줄 안팎': V11.2.0 tasks.c는 8861줄이다. 기준 버전이 없어 오류로 올리지 않았다.
- 381행 'critical section 동안 … 모든 RT IRQ가 막힙니다'는 328·395행 '높은 hard-RT IRQ는 통과'와 충돌해 보이지만 'RT IRQ' 범위가 정의되지 않아 내부 모순으로 확정하지 않았다.
- 94~96행 uxTopReadyPriority가 configUSE_PORT_OPTIMISED_TASK_SELECTION 조건 안에서만 선언되는지 확인하지 않았다.
- 216~219행 union과 238행 '뮤텍스 owner': V11 Queue_t는 QueuePointers_t·SemaphoreData_t union이다. 옛 버전 구조인지 대조하지 않았다. 238행 '길이 1, item 크기 0'은 binary semaphore에만 해당한다.
- 349행 'ready list는 하나, task/ISR 두 단계 spinlock'은 V11 SMP 구현과 대조하지 않았다.
- 377행 'ARM_CM3 port를 잘못 링크하면 … 런타임 무한 fault'는 출처가 없다.
- 188~190행 마스킹 차이는 PendSV 블록에 버전 표기가 없어 버전 차이일 수 있다. (1) EXC_RETURN 슬롯은 글 자신의 195행 pop과도 맞지 않아 버전과 무관하다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 `src/content/blog/embedded/rtos/practical-internals/part5-04-porting.md`(port 계층 코드·문장 중복)이고 PendSV 설명은 `part2-05-cortex-m-context.md`와도 겹친다. 먼저 137~142행 초기 frame(EXC_RETURN 슬롯), 346행 SMP define, 188~190행 PendSV 마스킹을 FreeRTOS-Kernel 특정 태그(예: V11.2.0) 기준으로 고치고 본문에 태그를 적는다. 5-04 42~56행도 함께 고친다. 그 뒤 port.c 절(277~328행)은 5-04·2-05로 넘기고 이 글은 tasks.c·queue.c 읽기 지도로 좁혀 보강할지 정한다.

### `part5-02-zephyr-source.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료(Zephyr upstream main e35b686b, 2026-10-02)를 열어 대조했다. (1) 127행은 'kernel/sem.c의 take 함수'라며 139·147·151행에서 `sem->lock`을 잠그지만, `include/zephyr/kernel.h` 3738~3750행 struct k_sem에는 lock 멤버가 없고 `kernel/sem.c` 42·44행은 파일 static sem_lock(또는 sem_locks)을 두고 151·157행에서 sem_spinlock_get(sem)으로 얻은 lock을 잠근다. 글 안에서도 130~134행 구조체에 lock이 없어 139행과 맞지 않는다. (2) 306~309행: K_THREAD_DEFINE(thr0, …) 뒤 `&thr0_thread`를 쓰지만 kernel.h 986·993행은 _k_thread_obj_thr0와 k_tid_t thr0를 정의한다. 308행 `k_thread_cpu_mask_disable_all`은 kernel.h에 없고(1230행 clear, 1284행 disable만 있음), 1252~1265행은 k_thread_cpu_mask_enable 대상 스레드가 runnable이면 안 된다고 하는데 306행은 시작 지연 0이라 이미 runnable이다. git log(42ebbcbb·2bb21c78 stub, 5cf58b6b·0e21b56c 본문, 85a2d46f 번역투, ac24bb76 제목, be973200 topic, 0a9dd7bc slug, 3232b1be 태그)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 해석은 155~156행(k_spin_lock이 단일 코어는 IRQ disable, SMP는 spinlock+IRQ disable)과 183행(DEVICE_DT_INST_DEFINE이 device 구조체를 컴파일 시간에 ROM에 둠) 정도다. 61~153행 코드는 upstream을 줄여 옮긴 것이고 버전이 없다. 241~271행 POSIX·Network·BLE 절은 서브시스템 목록 소개다. 257행 '호환되는 부분만 의존하는 편이 안전합니다', 327행 '확인하는 습관이 필요합니다'는 완곡 표현이다. 앵커 part1-04(10)보다 소스 경로를 짚지만 part12-10(18)에는 못 미친다. |
| B | 12 | 저장소 구조(24행) → k_thread(57) → sched.c(96) → k_sem(125) → driver model(160) → devicetree(185) → KConfig(210) → west(226) → POSIX(241) → 서브시스템(259) → user mode(273) → 비교(284) → SMP(301) → 함정(314) → 정리(345~354)로 흐름은 완성됐다. description의 thread.c는 구조체(61~91행)뿐이고, scalable queue는 98행 한 문장, z_pend_curr timeout은 158행 한 문장이다. k_sem 코드(129~153행)와 SMP 예(305~310행)가 upstream과 맞지 않아 AP-C-24에 따라 B ≤ 13. |
| C | 5 | 실행 명령(223·231~236행 west init/update/build/flash, menuconfig)과 prj.conf(213~218행)는 있지만 Zephyr 버전·호스트 환경·예상 출력이 없다. 55행 '~50K LoC', 288행 LoC 표, 335행 '최소 1024바이트, 일반 2048바이트'는 출처·환경 없는 수치라 rubric 3-1 'C ≤ 8'. 316~343행 함정 네 개는 재현 절차가 없다. 139·147·151행 sem->lock, 308~309행 식별자는 그대로 복사하면 컴파일되지 않는다. |
| D | 10 | 같은 시리즈 인접 part5-01(46)·part5-03(48), 동일 주제 part4-07·part4-10·part5-05와 비교했다. (1) 301~312행 SMP affinity 예가 part4-07-smp-rtos.md 106~122행과 같은 API·설명이고 123행도 4-07 108·123행 요약이다. (2) 273~282행 K_USER가 part4-10-syscall.md 179~202행과 같은 주제이고 4-10이 더 자세하다. (3) 284~297행 비교표(LoC ~20K/~50K, DO-178C 진행)가 part5-03 301~313행과 part5-05 29행에 반복된다. (4) H2 뼈대(12·16·24·314·345·358행)가 5-01·5-03과 같다. 다른 시리즈 tools/debugging/embedded/chapter07-rtos-troubleshooting.md는 39·470행 언급뿐이고 qemu-embedded/chapter12-rtos.md 89~102행 west는 draft다. Zephyr 커널·driver model 소스 읽기(125~238행)는 이 글만 다룬다. |
| E | 6 | 제목의 k_thread(57~94행)·k_sem(125~158행)·Driver Model(160~208행)은 절이 있다. description의 'sched.c·thread.c·sem.c'에서 thread.c는 구조체만 있어 부분 미이행이다. 제목이 '커널 분석'인데 241~299행 POSIX·Network·BLE·비교표는 커널 밖 소개로 범위가 퍼진다. |
| F | 7 | 356행 다음 편 '5-03 RT-Thread'는 seriesOrder 48 part5-03-rt-thread.md와 맞다. 관련 항목 360~364행(part2-03-scheduler-algorithm 13, part4-07 39, part5-01 46, part5-04 49, part5-05 50)의 라벨·번호가 맞다. 본문 123·303행이 SMP 상세를 4-07로 넘기는 고유 안내가 있다. 전제 지식 명시가 없고 audit:reading·폰 폭 확인은 하지 않았다. |
| G | 2 | 22행에 저장소와 kernel/·include/zephyr/kernel.h 경로, 165행 drivers/uart/uart_stm32.c 경로가 있다. Zephyr 버전·태그·대조 날짜가 없고(231행 west init은 --mr main) docs.zephyrproject.org 같은 1차 문서 링크가 없다. 271행 BLE 채택 1위, 297행 인증 상태에도 출처가 없다. |

uncertainties:
- 96·98·101·112행 'dumb' ready queue와 _priq_dumb_best: upstream main Kconfig는 SCHED_SIMPLE·SCHED_SCALABLE·SCHED_MULTIQ이고 'dumb' 이름이 없다. 글에 버전이 없어 옛 이름인지 판단하지 못했다. Kconfig help(simple은 unordered list, 많은 스레드는 SCALABLE)와 112·114행 설명도 어긋난다. priq 구현 코드는 열어 보지 않았다.
- 96행 제목 '두 가지 ready queue'인데 98·348행은 세 가지를 든다(개수 표기 실수).
- 62~91행 struct k_thread/_thread_base 필드 구성이 upstream과 맞는지 미확인.
- 188행 nucleo_f407g.dts와 223·235행 -b nucleo_f407g 보드 이름 존재 여부 미확인(hwmv2 이후 구조 변경).
- 231~232행 west init에 디렉터리 인자 없이 바로 cd zephyrproject 한다. west 문서 미확인.
- 220행 '링크 단계에서 사라지므로'와 210·351행 '컴파일 단계에서 잘라냄'의 표현 차이.
- 55·288·335행 LoC·스택 수치, 271·297·312행 채택·인증·안정화 시점 주장은 출처가 없다.
- 277~282행 K_USER 예에 k_thread_access_grant가 없다(part4-10 196~200행과 대조, 다른 글과의 비교라 오류 확인에 넣지 않음).
- 324행 'CONFIG_BT_CTLR 또는 BT_HCI_RAW 미설정 → 런타임 동작 안 함'이 현재 Kconfig와 맞는지 미확인.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간으로 보면 병합 대상 없음. Zephyr 커널·driver model 소스 읽기(125~238행)는 시리즈·사이트에서 이 글만 다룬다. 다음 조치는 오류 수정 뒤 보강이다. k_sem 코드(129~153행)를 upstream sem.c의 sem_spinlock_get 구조로, SMP 예(305~310행)를 k_thread_create(K_FOREVER) + k_thread_cpu_mask_clear/enable + k_thread_start 형태로 고치고 Zephyr 버전을 고정한다. 겹치는 SMP·User Mode·비교표 절은 part4-07·part4-10·part5-05로 링크하고 줄인다.

### `part5-03-rt-thread.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub, 2bb21c78 편 추가, 5cf58b6b·0e21b56c 본문, 85a2d46f 번역투·공개, 1b2ffe6a text 블록, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 RT-Thread upstream 소스나 공식 문서와 대조한 커밋은 없고, 평가 중에도 1차 자료는 열지 않았다. 원문 안에서 동시에 참일 수 없는 두 진술은 확정하지 못했다(144~145행 32그룹×8=256은 141·156·348행과 맞고, 46·306·346행 ~10K LoC도 서로 맞다). 149~150행 코드 문제는 API 의미를 알아야 판단되므로 uncertainties로 보냈다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 rt_object 첫 멤버 상속과 type별 container가 FinSH `list_thread`·`list_sem`을 가능하게 한다는 연결(121~139행), `rt_sem_take`를 critical section → wait list → timer → schedule 순서로 따라간 설명(162~194행), scons를 Keil·IAR 프로젝트 생성과 묶은 설명(266행)이다. 나머지는 연혁 표(26~31행), 출처 없는 채택 사례(35~38행), 별점 비교표(303~313행), Smart 불릿(247~250행), ESP32 절(285~299행)처럼 소개 수준이다. 117행 '훨씬 단정한 크기', 232행 '크게 올라갑니다'는 수치 없는 평가다. |
| B | 11 | 커널(79~194행) → components(196~239행) → Smart(241~252행) → 빌드·IDE(254~270행) → SMP(272~283행) → 비교(301~315행) → 함정(317~342행) → 정리(344~353행)로 끝까지 간다. 그러나 scheduler 코드는 152행 '/* context switch */'로 끝나는 스케치이고, 149~150행은 그룹 비트맵의 ffs 결과를 바로 priority 인덱스로 써서 145행 '그룹별 8 priority' 표를 거치지 않는다. 181행 인자는 `...`로 생략됐다. description의 POSIX는 350행에만 나온다. 기준 RT-Thread 버전이 본문에 없다(00-preface 156행은 5.x). AP-C-24에 따라 B ≤ 13. |
| C | 5 | 코드 조각(81~115·143~153·162~192·198~203·234~239·274~281·289~298행)과 빌드 명령(258~264행)은 있지만 보드·RT-Thread 버전·툴체인과 예상 출력이 없다. FinSH 명령(222~230행)도 출력이 없다. 325행 512/1024바이트, 247행 '256 MB+ RAM', 306행 LoC ~10K/~20K/~50K는 출처·환경 없는 수치라 rubric 3-1 'C ≤ 8'. 측정·검증 절차가 없다. |
| D | 11 | 같은 시리즈 part5-02-zephyr-source.md(47)·part5-01-freertos-source.md(46)와 H2 뼈대가 같다(이 글 12·16·42·272·317·344·357행 ↔ 5-02 12·16·24·301·314·345·358행, 5-01 12·16·24·340·369·387·399행). 비교표는 306·310행(커널 LoC, devicetree)만 5-02 288·289행과 같고 나머지 행은 다르다. part5-05-selection-guide.md 31·54·59·118·127·184·252·316행이 components·Studio·Smart·중국 de facto 표준을 다시 말해 이 글 307~312·351~353행과 겹친다. part5-04(49)는 포팅 절차라 겹치지 않는다. 다른 시리즈 modern-recipes/part10-03-gdb-remote-debug.md 147행, embedded-cpp/part5-04-hal-design-patterns.md 429행은 이름 언급뿐이고 qemu-embedded ch12·avionics ch10은 draft다. RT-Thread를 소스 수준에서 다루는 글은 이 글 하나다. |
| E | 5 | 제목 키워드 Object 모델(119~139행), Components(196~239행), Smart(241~252행), Studio(268~270행)는 절이 있다. 그러나 '분석'을 약속하는데 Studio는 한 문단, Smart는 불릿 네 개이고, 26~40·285~315행 연혁·채택 사례·별점표가 본문 절반 가까이다. description의 'DFS·LwIP·POSIX·FinSH가 어떻게 얹히는지'는 device 프레임워크·DFS VFS 계층 설명이 없고 POSIX는 절이 없다. rubric E '분석 약속 + 개념 소개 수준이면 3~5' 상단. |
| F | 6 | 355행 다음 편 `part5-04-porting`은 seriesOrder 49(이 글 48+1)이고 제목 'RTOS 포팅 가이드'와 맞다. 359~362행 관련 항목(part5-01·5-02·5-04·5-05) 라벨이 대상 제목과 맞고 모두 공개 글이다. 전제 지식 안내(2-01 ready list, 3장 IPC 구현)와 본문 교차 연결이 없어 7점 이상은 주지 않았다. |
| G | 2 | 22행에 저장소 `github.com/RT-Thread/rt-thread`(텍스트)와 Apache 2.0, 160행에 `src/ipc.c` 경로가 있다. 버전·태그와 공식 문서 링크가 없다. 35~38행 채택 사례, 247행 Smart 하드웨어 요구, 31·309행 BSP·package 수에 출처가 없다. |

uncertainties:
- 149~150행: `__rt_ffs(rt_thread_ready_priority_group)` 결과(그룹 번호)를 바로 `rt_thread_priority_table` 인덱스로 쓴다. 256 priority 구성에서는 `rt_thread_ready_table`을 한 번 더 봐야 할 것으로 보인다. upstream scheduler.c로 확인해야 한다.
- 141·156·348행 '최대 256 priority'와 part2-01-ready-list.md 190행 '최대 prio 32'가 다르다(다른 글과의 모순이라 오류 확인에서 제외).
- 156행 `__rt_ffs`가 ARM `CLZ`·RISC-V `clz`를 쓴다고 했다. ffs와 clz는 방향이 달라 변환이 필요한지 port 구현을 확인하지 않았다.
- 82~114행 struct rt_thread 필드와 165·167행 `rt_hw_interrupt_disable` 패턴이 어느 버전 소스인지 알 수 없다. 5.x ipc.c가 spinlock 기반으로 바뀌었는지 미확인.
- 83·127행 base 필드를 `flags`와 `flag`로 다르게 적었다. upstream 이름 미확인.
- 30행 Apache 2.0 채택 시점, 35~38행 채택 사례, 31·62·309행 '300+ BSP, 1000+ packages'는 출처가 없다.
- 199·330행 `<dfs_posix.h>`가 5.x에도 있는지, 247행 Smart '256 MB+ RAM', 283행 RP2040 SMP, 287행 ESP32 BSP는 확인하지 않았다.
- 342행 '`make`는 동작하지 않습니다'는 scons Makefile target이 있으면 과장일 수 있다.
- 306행 LoC, 325행 스택 기준은 출처·환경 없는 수치다.

병합 대상: 병합 대상 없음. RT-Thread를 소스 수준에서 다루는 글은 이 글뿐이고 part5-05-selection-guide.md는 표 행·불릿만 있어 받아 줄 수 없다. 'RT-Thread 커널 구조'라는 독립 검색 의도가 있어 다음 조치는 보강이다. ① 00-preface 156행 5.x 기준 태그를 정하고 struct rt_thread·rt_object·rt_sem_take·스케줄러 비트맵(149~150행 포함)을 upstream과 대조한다. ② 303~313행 별점·LoC 표는 5-05와 겹치고 출처가 없으므로 줄이거나 1차 자료로 고친다. ③ device 프레임워크·DFS VFS 계층과 POSIX component를 실제로 설명한다. ④ 본문에 upstream 파일·버전 출처를 단다.

### `part5-04-porting.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. (1) 원문 내부 모순: 53~54행 소프트웨어 프레임은 'R4-R11' 8워드(`pxTopOfStack -= 8`)만 깔지만, 160~161행 주석·코드는 'R4-R11 + EXC_RETURN'을 `stmdb r0!, {r4-r11, lr}` 9워드로 저장하고 170행 `ldmia r0!, {r4-r11, lr}`로 9워드를 복원한다. 이 PendSV로 처음 복원되는 task는 lr에 R0 자리(pvParameters)가 들어가고 하드웨어 프레임이 한 워드 어긋나므로, 61행 '첫 PendSV가 끝나면 R0=pvParameters, PC=pxCode 상태로 task가 시작'과 동시에 참일 수 없다. (2) 1차 자료 FreeRTOS-Kernel main `portable/GCC/ARM_CM4F/port.c`의 pxPortInitialiseStack은 pvParameters 다음에 `portINITIAL_EXC_RETURN`(0xfffffffd)을 넣은 뒤 `-= 8`을 한다(평가 중 열어 확인). 이 글 47~55행은 그 슬롯을 빠뜨렸다. git log(42ebbcbb stub, 2bb21c78, 5cf58b6b·0e21b56c 본문, 85a2d46f 번역투, a746e269·1b2ffe6a text 블록, ac24bb76 제목, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 port layer를 '여섯 함수 + context switch'로 묶은 틀(24~35행), 단계 절차(297~306행), Zephyr arch/soc 분리(253~270행), Cortex-A generic timer tick 예(223~235행)다. 1~6절 코드(42~138행)는 5-01 port.c 절과 거의 같다. 22행 '2~3일짜리 작업', 221행 '약 5배', 182행 '30~50 사이클'은 근거 없는 수치다. 35행 '여섯 가지가 유일한 인터페이스'는 224·243·275행으로 스스로 넓어진다. 앵커 part7-05(9)보다 약간 위. |
| B | 11 | 도입(16~22행) → 함수 목록(24~35행) → 절별 코드(37~182행) → RISC-V·Cortex-A·SMP·Zephyr·tickless(184~295행) → 절차(297~306행) → 함정(308~343행) → 정리(345~354행)로 흐름은 완성됐다. 제목의 '절차'는 297~306행 6줄 목록뿐이고 단계별 완료 기준이 없다. 286행 `TickType_t elapsed = /* counter에서 계산 */;`로 tickless 보정 핵심 계산을 비웠다. 초기 스택(54행)과 PendSV(161·170행)가 맞지 않아 AP-C-24에 따라 B ≤ 13. |
| C | 6 | 대상 보드·FreeRTOS 버전·컴파일러가 없다. 182행 'Cortex-M4F 168 MHz 기준 30~50 사이클'은 출처·측정 방법이 없어 rubric 3-1 'C ≤ 8'. 304행 검증 단계는 'ping-pong delay, semaphore·queue 단위 테스트' 이름만 있고 합격·실패 관찰이 없다. 286행은 컴파일되지 않고 317·325행은 매크로에 대입하는 의사 코드다. 54행 초기 프레임과 161·170행 PendSV를 그대로 옮기면 새 task가 잘못된 EXC_RETURN으로 복귀한다. |
| D | 6 | 같은 시리즈 part5-01-freertos-source.md와 대조: 초기 스택 42~55행 ↔ 5-01 133~145행, xPortStartScheduler 66~80행 ↔ 282~293행, 85행 SVC 설명 ↔ 295행(거의 같은 문장), SysTick 105~117행 ↔ 301~312행, BASEPRI 135~142행 ↔ 318~329행, SMP 240~251행 ↔ 346~349행. PendSV·EXC_RETURN 146~182·312행은 part2-05-cortex-m-context.md 89~134행과, RISC-V trap 187~205행은 part2-07-riscv-context.md 51~66행과, tickless 275~295행은 part2-09-tickless.md 38·53행과 겹친다. 다른 시리즈 modern-recipes/part2-03-arm-registers.md 121~124행이 같은 PendSV 진입을 싣는다. 인접 part5-03(48)·part5-05(50)와는 주제가 다르다. |
| E | 6 | 제목 '새 아키텍처에 옮기는 절차'와 description 'FreeRTOS와 Zephyr의 port 계층을 따라가며'에 비해 본문 대부분은 FreeRTOS Cortex-M4F port 해설(37~182행)이고, 절차는 297~306행 목록, Zephyr port 계층은 디렉터리 트리(257~268행)와 270행 한 문단뿐이다. initial stack frame·context switch·tick·critical section은 다룬다. |
| F | 7 | 356행 다음 편 '5-05 RTOS 선택 가이드'는 seriesOrder 50 part5-05-selection-guide.md와 맞다. 관련 항목 360~365행(2-05 15, 2-07 17, 4-07 39, 4-10 42 '시스템 콜' 주제 일치, 5-01 46, 5-02 47)과 207·251행 본문 링크가 맞다. 24~31행 목록이 1~6절 코드와 대응해 단계 구분 역할을 한다. 전제 지식 안내가 없고 겹치는 2-09 tickless 링크가 없어 8은 주지 않았다. |
| G | 1 | 본문에 1차 출처 링크가 없다. FreeRTOS-Kernel 버전·port 파일 경로, ARMv7-M ARM, RISC-V privileged spec, Zephyr 버전이 모두 없다. 264~266행 Zephyr soc 경로도 기준 버전을 알 수 없다. |

uncertainties:
- 61행 '첫 PendSV가 끝나면 task가 시작'과 78·85행 '첫 task는 svc 0 → SVC_Handler로 시작'이 첫 task를 여는 핸들러를 다르게 말한다(39행 'PendSV(또는 trap)'으로 느슨하게 읽을 여지가 있어 오류 확인에 넣지 않음).
- 148·178행 `cpsid i`/`cpsie i`: upstream ARM_CM4F PendSV는 BASEPRI를 올리는 방식이다. 이 글이 upstream 그대로라고 주장하지는 않아 설계 차이로만 둔다. 142행 '보다 낮은 IRQ만'(같은 priority 포함 여부)도 미확인.
- 122~133행 vPortEnterCritical/ExitCritical을 static inline으로 둔 형태는 upstream에서 일반 함수다(요약 확인, 전문 대조는 안 함).
- 14행 '여섯 가지'에 context switch 핸들러를 넣고 26~31행 목록은 넣지 않는다(산문 개수 표기).
- 182행 '30~50 사이클', 221행 '약 5배', 22행 '2~3일', 328행 '1000 Hz가 표준'은 출처 없는 수치.
- 213~221행 Cortex-A 컨텍스트는 AArch32 기준인데 224~235행 코드는 AArch64 시스템 레지스터를 쓰고, 235행은 코드에 없는 cntpct_el0를 설명한다.
- 247행 `mpidr & 0xFF`(Aff0)가 MT 비트를 쓰는 코어에서 코어 번호가 되는지 미확인.
- 264~266행 Zephyr soc 경로의 HWMv2 이후 변화, 306행 `arch/template`·`portable/` template 존재 여부 미확인.
- 278~279행 tickless LOAD 계산에 -1과 SysTick 24비트 한계 처리가 없다. 275행 portSUPPRESS_TICKS_AND_SLEEP 연결 방식 미확인.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 병합 후보는 `src/content/blog/embedded/rtos/practical-internals/part5-01-freertos-source.md`(port.c 절 277~349행과 1~6절·SMP 절이 겹침)이고, 부분적으로 `part2-05-cortex-m-context.md`(PendSV·EXC_RETURN)다. 먼저 47~55행 초기 스택에 portINITIAL_EXC_RETURN 슬롯을 넣거나 161·170행을 `{r4-r11}`로 맞춰 61행 설명과 일치시킨다(FreeRTOS-Kernel ARM_CM4F port.c 기준). 그 뒤 'RTOS 포팅 절차'라는 독립 검색 의도를 살려 차별화 보강한다. 42~142행 FreeRTOS 코드 재게시를 5-01·2-05 링크로 줄이고, 297~306행 단계마다 완료 기준과 새 ISA에서 결정할 항목을 채우고, Zephyr port 계층을 description 약속만큼 다룬다.

### `part5-05-selection-guide.md` — 57점, 병합 검토

confidence: 중간

factcheck: 미검증. git log에서 사실 관련 커밋은 b2db16fd(fix(blog): RTOS selection-guide license columns) 하나다. ThreadX MIT(v6.4.1, 2024-04)·µC/OS Apache 2.0(2020-02) 전환을 적고 나머지는 'verified accurate'라고만 했으며, 대조한 1차 자료(ThreadX LICENSE, Weston Embedded 공지, 인증서 등)를 밝히지 않았다. 루브릭 3-1의 '출처를 남김' 조건을 채우지 못한다. 0a9dd7bc·be973200·ac24bb76·ce78221e 등은 slug·메타데이터·제목·서식 변경이다. 원문 안에서 동시에 참일 수 없는 기술 진술은 찾지 못했다. ISR latency 표(136~141행)의 cycle→ns 환산은 서로 맞는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 11개 RTOS를 License·Footprint·SMP·Certification·Ecosystem 축으로 한 표에 모은 것(26~38행), 결정 축 7개(44~174행), 시나리오별 순위(178~254행)는 이 글의 구조다. 291행(Zephyr가 크다는 인상으로 FreeRTOS를 골랐다가 통합 후 binary가 더 커짐), 295행(무료로 시작했다가 인증 단계에서 SafeRTOS 마이그레이션)은 선택 기준을 담은 관점이다. 그러나 추천은 대부분 이유 없는 한 줄(182~184·190~193·252~254행)이고 22행은 정답을 제시하지 않겠다고 한다. 66~67행 하드웨어 표는 Cortex-M0/M3에 Zephyr를 두지 않는데 178~182행 IoT 센서(Cortex-M0/M3)는 Zephyr 1순위이고, 14·311행 '세 축'·제목 네 축·본문 일곱 축이 하나로 모이지 않는다. |
| B | 11 | 문제 정의(18~22행) → 비교표 → 결정 축 → 시나리오 → TCO(256~272행) → soft factor(274~285행) → 함정(287~307행) → 정리(309~318행)로 기본 흐름은 완성됐다. 축 여러 개를 실제 결정으로 묶는 절차·가중치가 없고, 66~67행과 182행처럼 축 결론과 시나리오 결론이 설명 없이 엇갈린다. 91행 인증 비용 '수만~수십만 달러'에 전제가 없다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13이고 추천 간 충돌을 반영해 11. |
| C | 5 | 코드·명령·측정 절차가 없는 비교 글이다. 136~150행 ISR latency·context switch cycle 표는 'Cortex-M4 168 MHz'(134행)만 있고 RTOS 버전·설정·측정 도구·출처가 없다. Footprint 범위(28~38행), 라이선스 비용(106~107·267행)도 출처·환경 없는 수치라 rubric 3-1 'C ≤ 8'. 152행 'sub-µs라 결정 요인이 아님'과 291·299행 함정이 트레이드오프를 짚어 0~3보다는 높다. |
| D | 12 | (1) part5-04-porting.md(49)는 포팅 절차(24~307행)라 겹치지 않는다. (2) part5-06-nuttx.md 284~296행 비교표의 POSIX·Network 칸이 이 글 26~38행 표, 154~174행 POSIX 분류와 겹친다. (3) part5-07-preempt-rt-linux.md 264~288행 결정 기준·hybrid 구성이 이 글 206~213행(산업 PLC)·231~238행(Edge AI)과 겹친다. (4) part1-01-why-rtos.md 144~154행 '흔한 RTOS' 표가 이 글 26~38행과 같은 RTOS·라이선스 칸을 반복한다. (5) 다른 시리즈 modern-recipes/part6-01-rtos-decision.md(18행)는 super-loop 대 RTOS 결정이라 질문이 다르고, modern-recipes/part6-10-priority-inversion.md, performance-engineering/part1-08-profiling-overview.md도 RTOS 간 선택 글이 아니다. 여러 RTOS 중 하나를 고르는 역할은 이 글만 맡는다. |
| E | 8 | 제목의 Footprint·License·Certification·Ecosystem은 26~38행 표, 93~111행, 74~91행, 113~130행에서 다룬다. description의 11개 RTOS 표와 IoT·자동차·항공·산업·의료·웨어러블·드론 시나리오(178~246행)가 모두 있다. '결정 기준'은 축 목록 수준이고(22행) 14·311행 '세 축'이 제목과 달라 9 이상은 주지 않았다. |
| F | 7 | 320행 다음 편 '5-06 Apache NuttX'는 seriesOrder 51 part5-06-nuttx.md와 맞다. 관련 항목 324~328행(part5-01 46, 5-02 47, 5-03 48, 5-06 51, 5-07 52) 라벨·번호가 모두 맞다. 결정 축 1~7 번호(44~174행)와 204행 '(다음 편)' 안내가 고유 구조다. 전제 지식 안내와 앞 글(5-04) 링크가 없고 모바일 렌더·audit:reading은 확인하지 않았다. |
| G | 1 | 본문에 출처 링크가 없다. 인증 매핑(78~89행), Mbed OS 2026-07 EOL(40·307·318행), ThreadX MIT 전환(30·99행), cycle 표(136~150행)에 1차 출처·RTOS 버전이 없다. 버전 표기는 28행 'v11+' 하나다. 커밋 b2db16fd 내용은 본문 출처가 아니라 반영하지 않는다. |

uncertainties:
- 40·307·318행 Mbed OS EOL을 '2026년 7월 예고'로 적었는데 평가 시점에는 이미 지난 날짜다. 공지 날짜는 1차 자료로 확인하지 않았다.
- 29행 Zephyr 'DO-178C 진행', 32행 NuttX 'DO-178C optional', 38행 PX5 'DO-178C 진행'은 1차 자료로 확인하지 않았다.
- 78~79행 SafeRTOS ASIL-B/C와 192행 'SafeRTOS — 작은 ASIL-D ECU', 84행 µC/OS-III Level B와 201행 'Level A 가능', 37행 µC/OS 인증 칸(IEC 62304만)과 84·89행. 목록이 망라형이라 밝히지 않아 모순으로 단정하지 않았다.
- 66~67행과 178~182행 추천 충돌은 추천 문장이라 기술 오류로 단정하지 않고 A·B에서 감점했다.
- 14·311행 '세 축'과 제목 네 축, 본문 일곱 축(개수 표기 문제).
- 30·99행 ThreadX MIT는 part1-01-why-rtos.md 152행 'EPL-2.0'과 다르고, 전환 시점도 part1-01 152행·00-preface 157행은 2024-01, 커밋 b2db16fd는 2024-04다.
- 136~150행 cycle 수치는 출처·측정 환경이 없다. 10~15 cycle ISR 진입은 하드웨어 exception 진입 지연이라 RTOS 간 차이로 보기 어렵다는 의심이 있으나 확인하지 않았다.
- 171행 'ThreadX No POSIX(자체 API)', 261행 Yocto-LTS 인증 표기는 확인하지 않았다.
- 237·238·252행 채택 사례와 33·106·267행 상업 라이선스 비용은 출처가 없다.

병합 대상: 병합 대상 없음. part5-06(284~296행)·part5-07(264~288행)·part1-01(144~154행)과 비교표·결정 기준이 일부 겹치지만 'RTOS 중 무엇을 고르나'라는 독립 검색 의도는 시리즈에서 이 글만 답한다. 다음 조치는 차별화 보강이다. 인증 등급 매핑·라이선스 칸을 1차 자료(인증서·LICENSE)로 대조해 본문에 출처를 달고, 확인 못 한 cycle·footprint·비용 수치는 지우거나 TBD로 둔다. 66~67행과 182행 추천 충돌을 정리하고, 14·311행 '세 축'을 제목의 네 축과 맞추고, 축을 결정 절차로 묶는 기준을 더하고, Mbed OS EOL 시제를 고친다.

### `part5-06-nuttx.md` — 53점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(2bb21c78 stub, 5cf58b6b·0e21b56c 본문, 85a2d46f 번역투·발행, ce78221e·2d0f689c text 블록, ac24bb76 제목, be973200·0a9dd7bc 메타데이터·URL, 35baac92 도구 수정)에 NuttX 문서·upstream, NASA 논문, PX4 문서와 대조한 커밋은 없다. 글 안의 내부 모순도 찾지 못했다. 43행 '50+ 비행'·229·342행 '70회 이상'·216행 '72회'는 서로 모순되지 않고, 181행 free 출력 262144-40960=221184는 산술이 맞고, 33행과 290행 '~100K'는 같은 값이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 빌드 모드 세 가지(103~122행), 함정 절의 fork·mmap 모드 의존성(300~307행), ESP-IDF와 NuttX 혼동(317~326행)은 이 글의 정리 관점이다. 나머지는 채택 사례 불릿(37~41·245~266행)과 POSIX 호출 나열(64~80·126~134·151~160행)로 소개 자료 수준이다. 제목은 '분석'인데 저장소 트리(47~58행)만 있고 sched/·fs/ 실제 코드나 Protected build syscall 경로(112행 한 줄)는 설명하지 않는다. 60행 '무겁게 느껴질 수 있습니다', 82행 '거의 그대로', 191행 '크게 올라갑니다'는 근거 대신 인상이다. |
| B | 11 | 문제 정의(16~22행) → 역사(26~43행) → 빌드 모드(99~122행) → VFS·procfs·socket·NSH(124~191행) → PX4·Ingenuity·micro-ROS·Spresense·Vela(193~266행) → 빌드(268~282행) → 비교표(284~296행) → 함정(298~334행) → 정리(336~345행)로 끝까지 간다. Protected build syscall(112행)과 Kernel build process 모델(117~119행)은 불릿 한 줄씩이고 Spresense·Vela 절(243~266행)은 불릿 나열이다. 정확성 불확실(220·227행, 93행 vs 307행)이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 6 | 실행 가능한 명령은 270~280행 빌드(`./tools/configure.sh stm32f4discovery:nsh`, `make flash`) 하나다. NSH 출력(167~189행)은 보드·NuttX 버전·config 표기가 없다. 33·60·290행 LoC, 199행 '1 kHz 제어 루프', 263행 '수억 대'는 출처·환경 없는 수치라 rubric 3-1 'C ≤ 8'. `thread_func`(71행)·`data`/`len`(75행)·`request`/`buffer`(158~159행)·`support`(238행)가 정의되지 않아 그대로 돌릴 수 없다. |
| D | 13 | 인접 part5-05-selection-guide.md는 NuttX를 비교표 한 행(32행), 불릿(60·162·244행), 다음 편 예고(204·320행)로만 다루며 이 글 비교표(286~294행)의 POSIX 행과 일부 겹친다. part5-07-preempt-rt-linux.md는 관련 링크(341행)뿐이다. part5-02-zephyr-source.md는 Zephyr 주제라 역할이 다르다. 같은 시리즈 part1-01-why-rtos.md 153행은 표 한 행, 00-preface.md 145·158행은 목차·버전 한 줄이다. 다른 시리즈 공개 글 tools/debugging/embedded/chapter07-rtos-troubleshooting.md·chapter03-openocd.md, protocols/industrial-ethernet/chapter05-ethercat-master.md는 언급 수준이고 qemu-embedded ch12·ch02, qemu-riscv ch02, launch-vehicle ch10은 draft다. 시리즈 공통 H2 뼈대(12·16·298·336·349행)를 공유해 15는 주지 않았다. |
| E | 5 | 제목 키워드 POSIX·PX4·NASA Ingenuity는 62~82·193~211·213~229행에서 다루고, description의 Flat/Protected/Kernel(99~122행)·VFS(124~136행)·네트워크(149~163행)·NSH(165~191행)·micro-ROS(231~241행)도 절이 있다. 그러나 '분석'을 약속하는데 저장소 트리와 API 예시 수준이고 PX4·Ingenuity 채택 이유도 한 문단(211·229행)이다. rubric E '분석 약속 + 개념 소개 수준이면 3~5'. |
| F | 6 | 347행 다음 편 '5-07 PREEMPT_RT Linux'는 seriesOrder 52 part5-07-preempt-rt-linux.md(이 글 51)이고 '2024년 mainline 합류'도 그 글 5·14·20행과 맞다. 351~354행 관련 링크(5-02 47, 5-04 49, 5-05 50, 5-07 52) 라벨이 대상 제목과 맞다. 전제 지식 안내가 없고, 35·103·109·115·195·205·218·225·245·259행 소제목이 볼드·헤딩 없는 일반 문단이라 소제목 계층이 드러나지 않는다. |
| G | 1 | 본문 출처는 24행 저장소 이름 `github.com/apache/nuttx`(링크 아님)와 271~272행 clone URL뿐이다. 225~227행은 'paper 인용'이라며 인용문을 두지만 논문 제목·저자·연도가 없다. NuttX 버전(00-preface 158행 12.x), PX4 버전, 대상 보드 리비전이 없고 33행 '현재'는 기준 시점이 없다. |

uncertainties:
- 220행 'Qualcomm Snapdragon 801 (Cortex-A53)': Snapdragon 801 CPU 코어가 Krait 계열로 기억하지만 1차 자료로 확인하지 않아 오류 확인으로 올리지 않았다.
- 227행 NASA 'paper 인용' 문장이 실제 문헌 문구인지, 어느 논문인지 확인하지 못했다.
- 43·229·342행 Ingenuity '무사고' 비행: 마지막 비행의 로터 손상으로 임무가 끝났다면 표현이 맞는지 NASA 자료로 확인하지 않았다. 43행 '50+'와 229행 '70회 이상' 표기도 정리 필요.
- 93행 주석(task_spawn을 Protected/Kernel 빌드의 process 생성으로 적음)과 307행(Flat build에서 task_spawn 권장). 93행이 '그 빌드에서만'이라 단정하지 않아 모순으로 올리지 않았다.
- 122행 '같은 application 코드가 세 모드 모두에서 동작'과 303·307행 'POSIX는 모드 의존'의 긴장. 122행이 '설계 의도'로 적혀 있어 모순 단정은 하지 않았다.
- 33·60·290행 LoC 수치의 출처·측정 방법 불명.
- 39·247·255행 Spresense 'Cortex-M4F × 6 core'와 SMP affinity, 263행 Vela '수억 대', 199행 PX4 '1 kHz', 207행 Quanergy 채택은 출처 미확인.
- 147행 procfs 동작과 172행 `cat /proc/uptime` 출력 형식이 NuttX 실제 동작과 맞는지 미확인.
- 288·291행 비교표 값(FreeRTOS POSIX 'minimal', Network/BLE '외부')은 출처가 없다.

병합 대상: 병합 대상 없음. part5-05-selection-guide.md는 NuttX를 표 한 행과 예고(204·320행)로만 다루고 이 글을 다음 편으로 가리키며, part1-01 153행도 표 한 행이라 합칠 곳이 없다. NuttX라는 독립 검색 의도가 있으므로 다음 조치는 보강이다. (1) Protected build syscall 경로나 sched/ 코드 한 지점을 upstream 버전과 함께 보여 '분석'을 이행하고, (2) 227행 인용문과 Ingenuity 비행 수·하드웨어(216·220행)를 NASA 1차 자료로 확인해 출처를 달거나 삭제하고, (3) LoC·1 kHz·'수억 대' 수치에 출처를 달거나 삭제하고, (4) NSH 출력에 보드·NuttX 버전을 적고, (5) 71·75·158·238행 코드의 미정의 식별자를 정리한다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 1차 자료 대조 커밋 없음: 10편 모두 git log에 출처를 남긴 fact-check 커밋이 없다. Part 4는 2083e506·90d61d54, Part 5는 5cf58b6b·0e21b56c 일괄 작성 뒤 번역투·서식·메타데이터 커밋만 있고, part5-05의 b2db16fd도 대조 자료를 밝히지 않았다. 그 사이 오류 확인이 7편(part4-10·4-11·4-12·4-13·5-01·5-02·5-04)에서 나왔다. 시리즈 전체가 `/fact-check-round` 대상이다.
- 본문 1차 출처·버전 표기 부재: G가 10편 모두 1~2다. part4-10·4-11·4-12·4-13·5-04·5-05·5-06은 출처 링크가 0개이고, part5-01 22·342행, part5-02 22·165행, part5-03 22·160행, part5-06 24행은 저장소 이름·경로만 있고 태그가 없다. 버전은 00-preface 156~158행에만 있다. Zephyr·FreeRTOS·RT-Thread·NuttX가 `data/upstream-tracking.yaml`에 등록되지 않아 upstream 이름 변화(part5-02 101행 _priq_dumb → SCHED_SIMPLE)를 자동으로 잡지 못한다.
- 출처·측정 환경 없는 수치 표·cycle 값: part4-10 230~242행, part4-11 280~290행, part4-12 288~309행, part4-13 263·265·334~340행, part5-01 206행, part5-04 182행, part5-05 136~150행, part5-02 55·288·335행, part5-03 306·325행, part5-06 33·60·290행. 10편 모두 rubric 3-1 'C ≤ 8'에 걸렸고 C가 5~7에 묶인 공통 원인이다.
- 공통 H2 뼈대: '한 줄 요약 / 어떤 문제를 푸는가 / … / 자주 보는 함정과 안티패턴 / 정리 / 관련 항목'이 part4-10(12·16·284·323·335행), part4-11(12·16·294·343·356행), part4-12(12·16·313·360·372행), part4-13(12·16·361·470·485행), part5-01(12·16·369·387·399행), part5-02(12·16·314·345·358행), part5-03(12·16·317·344·357행), part5-04(12·16·308·345·358행), part5-05(12·16·287·309·322행), part5-06(12·16·298·336·349행)에 같은 순서로 있다. part4-13은 embedded-cpp part1-02·part2-02·part4-02와도 같다. 루브릭 9절 scaled content 기록 대상이다.
- FreeRTOS Cortex-M port 코드 중복과 같은 결함 반복: 초기 stack frame·PendSV·xPortStartScheduler·BASEPRI·SMP 매크로가 part5-01(133~144·173~206·282~296·317~328·345~346행)과 part5-04(42~56·66~85·136~182·240~241행)에 거의 그대로 있고, PendSV 흐름은 part2-05 81~110·89~134행, modern-recipes part2-03 119~124행에도 있다. EXC_RETURN 슬롯 없는 초기 frame + `{r4-r11, lr}` pop은 part5-01 137~142·195행과 part5-04 42~56·170행 두 곳에서 같은 오류이고, SMP pxCurrentTCB 배열 매크로도 part5-01 346행·part5-04 241행에 같다. '168 MHz 30~50 사이클'은 part5-01 206행과 part5-04 182행에 같은 문장이다.
- 시리즈 안 같은 설명 반복: Zephyr USERSPACE(part4-10 179~202행, part5-02 273~282행), Zephyr SMP affinity(part4-07 106~122행, part5-02 301~312행, 두 곳 모두 없는 API `k_thread_cpu_mask_disable_all` 사용), RTOS 비교표(part1-01 144~154행, part5-02 284~297행, part5-03 303~313행, part5-05 26~38행, part5-06 284~296행). 정본을 정하고 나머지는 링크로 바꿀 후보다.
- 관련 항목이 내용 연결이 아니라 고정 이웃 링크: part4-10 340행(4-09 Software Timer), part4-11 358·361행(4-06 Stack Overflow, RAII 기초), part4-12 376행(5-04 포팅, 본문 연결 없음). 같은 주제의 다른 시리즈 글(embedded-security ch04, modern-recipes part11-06·part12-12)로 가는 교차 링크가 없다.
- 시리즈 사이·안 서술 불일치(다른 글과의 모순이라 오류 확인은 아님): ThreadX 라이선스(part5-05 30·99행 MIT ↔ part1-01 152행 EPL-2.0, 전환 시점 2024-01 ↔ 2024-04), RT-Thread 최대 priority(part5-03 141행 256 ↔ part2-01 190행 32), PSA Certified 레벨(part4-11 242~245행 ↔ modern-recipes part12-12 286~291행), -fno-rtti 절약률(part4-13 263행 ~10% ↔ embedded-cpp part1-02 393~394행 약 6%), STM32MP1 RPMsg 지연(part4-12 302행 ↔ modern-recipes part11-06 202행). 1차 자료로 정본을 정한다.
- 소제목을 heading 대신 맨 문단으로 둔 패턴: part4-12 48·56·69·288·297·304행, part4-13 334행 표 캡션, part5-06 35·103·109·115·195·205·218·225·245·259행. text 블록 정리 커밋 이후 생긴 것으로 보이며 목차에 잡히지 않는다.

## 다음 조치

- 우선 조치(7편, 오류 확인): part4-10 151행 privilege bit를 140·163행과 맞추고, part4-11 67행 alias 비트(bit 26 vs bit 28)를 고치고, part4-12 52행 메모리 표를 53·54·63·336행과 맞추고, part4-13 423~451행 측정 절을 실제 컴파일 출력으로 바꾸거나 지우고, part5-01·part5-04의 초기 stack frame(EXC_RETURN 슬롯)과 SMP pxCurrentTCB 매크로를 FreeRTOS-Kernel 특정 태그 기준으로 함께 고치고, part5-02 k_sem 코드와 SMP affinity 예를 Zephyr 특정 태그 기준으로 고친다(part4-07 106~122행의 같은 API도 함께).
- 내비게이션 수정: part4-13 483행 다음 편을 part5-01-freertos-source로 고치고, part4-10·4-11·4-12의 관련 항목을 내용 연결 위주로 바꾼다.
- 병합 검토(3편): part5-03·part5-05·part5-06은 병합 대상 없이 보강한다. 출처 없는 비교표·채택 사례·수치는 1차 자료로 대조하거나 TBD로 두고, part5-05를 RTOS 비교표의 정본으로 삼아 part1-01·part5-02·part5-03·part5-06 표 값을 맞춘다. part5-05 Mbed OS EOL 시제는 `audit:staleness`로 함께 점검한다.
- 병합 후보 결정: part5-01과 part5-04의 FreeRTOS port 코드 중복은 한쪽을 정본으로 정하고, part4-11은 embedded-security ch04·modern-recipes part2-09·part12-12와의 TrustZone-M 역할 분담을 정한다.
- Practical RTOS Internals Part 4~5를 `/fact-check-round` 대상으로 올리고, Zephyr·FreeRTOS·RT-Thread·NuttX를 `data/upstream-tracking.yaml` 등록 후보로 검토한다. 시리즈 사이 불일치(ThreadX 라이선스, RT-Thread priority, PSA 레벨)는 정본을 정한 뒤 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
