# 공개 글 AdSense 평가 — 루프 39

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-39.md) · [재검토 기록](double-check-loop-39.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일 2026-10-18. 원문 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`, 루브릭 v1.2와 AP-C-24 기준. Practical RTOS Internals 10편 전문을 읽고 기존 보고서·비교 원문·내부 링크를 다시 대조했다. 앵커는 `10550ca1` 당시 원문 기준이다. 전편 `score_status: 잠정`, `confidence: 중간`; 일부 오류 확인은 모든 주장 검증을 뜻하지 않는다. 원문·기존 보고서는 변경하지 않았다. P0는 본문 검토에서 확인하지 못했다. 공통 검사는 [공통 게이트](double-check-gates-2026-10-18.md) 참조.

## 재평가 표

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part4-10-syscall.md` | 13 | 12 | 6 | 11 | 6 | 6 | 1 | **55** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part4-11-trustzone-tfm.md` | 11 | 12 | 6 | 6 | 7 | 6 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part4-12-amp-openamp.md` | 13 | 12 | 7 | 12 | 8 | 6 | 1 | **59** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part4-13-cpp-in-rtos.md` | 13 | 12 | 6 | 8 | 6 | 6 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-01-freertos-source.md` | 11 | 12 | 5 | 6 | 6 | 7 | 2 | **49** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-02-zephyr-source.md` | 12 | 12 | 5 | 10 | 6 | 7 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-03-rt-thread.md` | 12 | 11 | 5 | 12 | 5 | 6 | 2 | **53** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-04-porting.md` | 11 | 11 | 6 | 6 | 6 | 7 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-05-selection-guide.md` | 14 | 12 | 5 | 12 | 8 | 7 | 1 | **59** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-06-nuttx.md` | 11 | 10 | 6 | 14 | 4 | 6 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

합계526→530, 평균52.6→53.0. C++ 안내 F+2, RT-Thread D+1, 선택 가이드 A/B 각+1, NuttX B−1/D+1/E−1이다. 기존7편 오류 확인은 유지하되 AMP·C++의 근거를 교체했다. NuttX는 신규 오류 확인으로 우선 조치가8편이 된다. 점수차는 상한 위반 교정 외에는 구간 내 평가 판단이며 확정값이 아니다.

## 정확성 게이트 재검토

- Syscall L140·151·163: 글 스스로 privilege bit를 끄면 unprivileged라고 정의하면서 코드에서는 bit를 켜고, unprivileged task의 MPU 접근 제한 예로 설명한다. 해당 예제 설명·코드의 권한 조건이 충돌하므로 유지한다. 모든 MPU 설정·FreeRTOS 버전을 검증한 것은 아니다.
- TrustZone L54~67: `0x08000000 ^ 0x0c000000 = 0x04000000 = 1 << 26`이다. 이 주소 쌍을 bit28 alias라고 한 설명은 내부 비트 산술로 틀린다. SRAM 쌍은 실제 bit28 차이여서 모든 alias가 bit26이라고 확대하지 않는다.
- AMP: L52의 Linux 전체 범위 안에 reserved-memory와 M firmware가 포함된다는 사실만으로 동시 점유를 확정하지 않는다. L63은 예약 제외를 이미 설명한다. 기존 단순 중첩 오류 논증을 철회한다. 대신 L125의 송신 자체는 비차단이라는 주장을 [OpenAMP rpmsg.h의 rpmsg_send/trysend 계약](https://raw.githubusercontent.com/OpenAMP/open-amp/main/lib/include/openamp/rpmsg.h)과 대조했다. 글의 실제 예제는 rpmsg_send이고, 이 API는 wait=true를 넘기며 TX buffer 부족 시 대기한다. 비대기는 별도 trysend다. L146도 송신 차단 가능성을 말한다. 최신 upstream과의 대조 범위를 명시하고 전체 버전의 대기 시간·오류 코드까지 확인했다고 하지 않는다.
- C++: 기존 RAII asm에 분기가 없다는 주장만으로 오류를 확정하지 않는다. L55~68에는 locked() 검사도 있고 L423~448은 비교 함수의 완전한 소스·가정이 없어 최적화 조건을 확정할 수 없다. 대신 L151의 std::thread가 RAII로 join/detach한다는 설명을 [C++ draft thread destructor](https://eel.is/c++draft/thread.thread.destr)와 대조했다. joinable이면 terminate하며 자동 join/detach하지 않는다. 같은 문단의 뒤 문장은 terminate라 하여 동작 설명도 혼재한다. 기존 오류 확인 유지, 근거 교체.
- FreeRTOS 소스와 포팅: 전자는 L137~142에서 R4~R11 8워드만 예약하고 L195에서 LR까지9워드를 복원한다. 후자도 L53~54와 L170이 같다. [FreeRTOS-Kernel V11.2.0 ARM_CM4F port.c](https://raw.githubusercontent.com/FreeRTOS/FreeRTOS-Kernel/V11.2.0/portable/GCC/ARM_CM4F/port.c)의 pxPortInitialiseStack은 EXC_RETURN을 별도로 놓고 그 뒤 R4~R11 슬롯을 예약한다. 두 글의 첫 task 시작 설명과 맞지 않으므로 유지한다. 실제 보드 실행은 하지 않았다.
- Zephyr: L139·147·151의 sem->lock을 [v4.2.0 kernel.h struct k_sem](https://raw.githubusercontent.com/zephyrproject-rtos/zephyr/v4.2.0/include/zephyr/kernel.h)와 [sem.c](https://raw.githubusercontent.com/zephyrproject-rtos/zephyr/v4.2.0/kernel/sem.c)에서 재확인했다. 해당 멤버가 없고 sem.c의 파일 전역 lock을 쓴다. CPU mask도 clear·enable API와 runnable 제한을 확인했다. 기존의 이동하는 main 커밋과 별개로 고정 릴리스에서 재확인한 오류다.
- NuttX: L60의100K가20K와50K 사이란 비교는 자체 산술부터 맞지 않는다. 추가로 L221의 Ingenuity FC를 Cortex-M이라고 한 설명을 [Balaram 외, Mars Helicopter Technology Demonstrator, 2018, §IV.C·pp.10–12](https://rotorcraft.arc.nasa.gov/Publications/files/Balaram_AIAA2018_0023.pdf)와 대조했다. 논문은 TI TMS570LC43x 및 lockstep Cortex-R5F를 기술한다. L227의 NASA 인용문은 출처 서지가 없고 이 논문에서는 찾지 못했지만, 검색 부재만으로 조작 인용이라고 판정하지 않는다. 2018 설계 논문을 후기 모든 소프트웨어 구성의 증명으로 쓰지 않으며 FCU의 NuttX 채택 여부·ROS 주장은 추가 확인 대상으로 남긴다. 확인된 하드웨어 오류로 신규 게이트를 적용한다.

## 글별 evidence

아래 `source_file`의 공통 기준 경로는 `src/content/blog/embedded/rtos/practical-internals/`다. 실제 내부 링크를 slug에 따라 파일로 해석해 공개 여부·seriesOrder·제목과 라벨 뒤 설명을 대조했다. 모든 글의 전체 사실 검증을 완료했다는 뜻은 아니다.

### `part4-10-syscall.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-10-syscall.md`

- url: `/blog/embedded/rtos/practical-internals/part4-10-syscall`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part6-09-isr-api.md@10550ca1`.
- blockers: L140·151·163 권한 조건 불일치.
- uncertainties: RISC-V delegation, SVC frame/ABI·wrapper 버전, 자동차·항공 인증의 일반화와 L230~242 지연 수치 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | L73~136 두 trap과 L138~202 MPU/USERSPACE를 묶어 비교한다. L308~321 pointer/ABI 함정도 있으나 관측한 실패·독자적 측정 없음. |
| B | 12 | 권한→trap→OS별 분리→capability→선택으로 완결. privilege 예 오류·미검증 API 때문에 B≤13. |
| C | 6 | L54~95·142~198 코드와 cycle표는 있지만 실제 빌드·성공 관찰 없고 L230~242 출처 없는 수치로 C≤8. |
| D | 11 | L50~97↔part2-05 L136~154는 syscall vs 첫task 시작으로 역할 차이. L99~134↔part2-07 L129~146은 ecall 처리 반복. L179~202↔part5-02 L273~282는 이 글이 더 상세하다. |
| E | 6 | SVC/ECALL·분리는 다루나 description의 overhead '측정'은 L230~242 표만 있고 실험 절차·근거 부족. |
| F | 6 | L333 다음4-11·L337~340 제목/순서는 일치. 관련 software timer의 연결 설명과 전제 안내 부족. |
| G | 1 | L22 등의 기술 주장에 직접 1차 출처가 없고 API·측정 버전 식별 부족. |

다음 조치: 권한 예제·실험 환경 보강. 병합 대상 없음; syscall 분리 질문은 독립적.

### `part4-11-trustzone-tfm.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm.md`

- url: `/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`.
- blockers: L67 flash alias bit 산술.
- uncertainties: SAU/IDAU·cmse flags, boot chain과measured boot 구분, PSA 인증표·NXP S32K3 코어·채택 사례는 별도 1차 자료 확인 필요.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L48~157 메모리/진입·L175~225 PSA 예가 중심. 실제 보드 검증·보안 실패 분석 없음. |
| B | 12 | 분리→서비스→boot→사례→함정까지 이어지나 주소 비트 오류와 미검증 인증/SoC 정보가 있어 B≤13. |
| C | 6 | L73~84 설정·L107~138 진입 예가 있으나 완전한 dual image build·관찰 없음. L280~290 수치로 C≤8. |
| D | 6 | L48~157↔embedded-security/ch04 L105~155 SAU·secure_aes_encrypt/검증 코드, L159~173↔동글 L179~199 서비스·함정 반복. 현재 Recipes part12-12 L26~44·140~149·284~293도 world/attestation/등급을 다룬다. part2-09 L24~82·165~170도 같은 게이트와SAU 질문이라 중복 큼. |
| E | 7 | Secure/NS·NSC·PSA와 bootchain을 본문이 답하지만 API·인증 선택은 일반 설명 수준. |
| F | 6 | L354 다음AMP와 L358~361 관련 라벨은 일치. RAII·stack 글과의 관계 설명은 약하고 실제 같은 주제 글로 연결이 부족. |
| G | 1 | 서지·버전 없는 측정표·인증·SoC 주장. 독립 본문 출처 부족. |

다음 조치: 주소·검증 계약 보강. 병합 후보 `embedded-security/chapter04-trustzone.md`; TF-M 서비스 상세로 남길지 독립 질문부터 결정한다.

### `part4-12-amp-openamp.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-12-amp-openamp.md`

- url: `/blog/embedded/rtos/practical-internals/part4-12-amp-openamp`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: L125 rpmsg_send 비차단 일반화. 메모리 중첩만으로 한 기존 오류 논증은 철회.
- uncertainties: SoC 표·RP2350 ISA 선택 조건·vring ownership·remoteproc 로드 시점·매송신IRQ 가정 미검증. M firmware carveout의 완전한 DTS 예는 없음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | L81~108 echo·L204~235 센서와Linux, L313~358 통합 함정 묶음은 구체적. 실제 통합·측정 기록 없음. |
| B | 12 | 구성→OpenAMP→RPMsg→remoteproc→운영 흐름 완결. 송신 대기 조건 오류와 버전별 API 의문으로 B≤13. |
| C | 7 | L154~165 sysfs·L225~235 char device·DTS 예는 단서지만 resource table·플랫폼 초기화·실행 기록이 비어 있다. L288~309 지연 출처 없어8상한. |
| D | 12 | L176~182·297~302·315~323↔현재Recipes part11-06 L135~145·198~202·245~247은 mailbox/캐시/지연 겹침. 후자는 raw mailbox, 이 글은RPMsg framework라 핵심 의도가 구분된다. SMP L20~22는 이 글에 위임. |
| E | 8 | heterogeneous·RPMsg·remoteproc·SoC사례를 본문 각절이 답한다. 통합 검증 깊이는 부족. |
| F | 6 | L370 다음C++·L374~376 관련 대상 일치. L48·56·69 등의 일반문단 제목은 목차 계층이 약하고 관련 포팅 연결 설명 부족. |
| G | 1 | 환경 이름은 있으나 OpenAMP/SDK 버전과 지연의 원자료·출처가 없다. |

다음 조치: 송신 계약·플랫폼 통합 절차 보강. 병합 대상 없음.

### `part4-13-cpp-in-rtos.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos.md`

- url: `/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos`
- score_status: 잠정; confidence: 중간; anchor_ref: `part6-09-isr-api.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: L151 std::thread 자동join/detach 설명.
- uncertainties: L288 ARMv7-M64-bit exclusive·is_lock_free 시점, ETL 예외 지원, coroutine allocator·컴파일 플래그, RAII asm의 실제 함수와가정 미확인.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | L155~224 TaskBase/StaticQueue와 L73~105 IRQ 보존은 적용 예제. 측정·선택 근거는 무출처. |
| B | 12 | RAII→표준thread→고정용량→atomic→coroutine→함정으로 완결. thread 계약 오류와 API 의문이 남아 B≤13. |
| C | 6 | C++ wrapper·asm 비교는 있지만 전체 소스·toolchain버전·결과 기록 없음. L263~265 비율·L334~340 cycle로 C≤8. |
| D | 8 | L26~139↔embedded-cpp part2-02 L29~97·375~411 guard/IRQ, L423~451↔동글 L474~492 asm결론 반복. L252~267↔part1-02 L25~36·78~115 flags, L226~250↔part4-02 L39~85 ETL도 겹침. Task/Queue wrapper의 묶음 역할은 남는다. |
| E | 6 | 키워드는 모두 있으나 std::thread 비교의 동작 설명이 틀리고 coroutine이 플랫폼 스케줄링 조각에 머문다. |
| F | 6 | 4→6. L483은 '다음 편'이 아닌 '다음 part'가 포팅·통합을 다룬다는 안내이며 실제 링크도Part5의 포팅 글이다. 곧바로 다음 order46을 약속했다고 본 이전 근거를 철회한다. 첫 글 안내가 모호해 높은 구간은 제외. L487~491 실제 관련 제목은 일치. |
| G | 1 | 내부 상세 링크는 많지만 외부 계약·비율·실험 버전의 직접 출처 부족. |

다음 조치: thread·atomic 계약 보강. 병합 후보 embedded-cpp part2-02; RTOS Task/Queue 결정성 질문으로 범위를 좁힐 수 있다.

### `part5-01-freertos-source.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part5-01-freertos-source.md`

- url: `/blog/embedded/rtos/practical-internals/part5-01-freertos-source`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`.
- blockers: L137~142↔195 EXC_RETURN 슬롯 누락.
- uncertainties: xTaskCreate의pxStack 연결, Queue_t 버전, SMP 설명, IRQ priority 경계와switch시간 미검증. 단일/SMP의 조건 차이를 자체 오류로 세지 않음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L47 읽는 순서·L330~338 관찰은 지도 역할. 코드 재구성이 중심이고 핵심 frame이 틀리다. |
| B | 12 | 자료구조→생성→선택→switch→IPC→port로 완결. 주소·레지스터 경계 오류와 upstream 버전 부재로 B≤13. |
| C | 5 | 실제 upstream처럼 제시한 코드에 슬롯 누락, 정확한태그·빌드·관찰 없음. L206 시간에 조건/출처 부족. |
| D | 6 | L133~144·173~204·282~296·317~328↔포팅 L42~56·147~180·66~85·135~142가 크게 반복. readybitmap↔part2-01 L81~97, Queue_t↔part3-07 L25~43도 같아 별도 순서 안내 가치만 남는다. |
| E | 6 | source 수준 추적 약속 대비 재구성 코드·버전 부재로 실제 파일 추적 신뢰가 낮다. |
| F | 7 | L397 다음Zephyr·L401~406 관련 대상을 확인. L47 고유 읽는 순서가 본문 경로와 이어진다. |
| G | 2 | 저장소 위치는 있으나 코드 태그·행 permalink·비율 근거가 부족하다. |

다음 조치: upstream 고정 버전·첫task 상태 보강. 포팅 글과 겹친 코드는 정본을 정하고 이 글은 소스 탐색 지도 역할을 유지할 후보.

### `part5-02-zephyr-source.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part5-02-zephyr-source.md`

- url: `/blog/embedded/rtos/practical-internals/part5-02-zephyr-source`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: L139·147·151 sem->lock과 upstream 구조 불일치.
- uncertainties: k_thread 구조·runqueue, devicetree macro의 인스턴스 범위, west 현재 작업경로, POSIX·인증과 스택 기준 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L125~208 동기화와driver생성 연결은 고유 지도. 실제 source trace나실패 기록은 없다. |
| B | 12 | kernel→driver→build→subsystem까지 완결. 핵심 semaphore/affinity 코드 오류로 B≤13. |
| C | 5 | L129~153 제시 코드가 실제 멤버와 맞지 않고 L306~309 API도 미완. west의실행 환경·관찰 없이 명령 나열 중심. |
| D | 10 | L123·301~312↔SMP L106~123, L273~282↔syscall L179~202이 반복. L284~297↔RT-Thread L303~313은 LoC/devicetree 일부만 같고 다른행은 다르다. H2공통 뼈대를 내용중복 증거로 세지 않는다. |
| E | 6 | kernel 분석 약속 대비 고정 source태그·실제호출 추적이 약하고 일부 잘못된 구현을 제시. |
| F | 7 | L356 다음RT-Thread·L360~364 라벨 일치. L123·303 상세SMP 위임은 글고유 안내 역할. |
| G | 2 | 저장소 위치는 있지만 릴리스·심볼 permalink·측정 근거 부족. |

다음 조치: 고정 릴리스에서 semaphore/affinity 예 재작성·실행 확인. 병합 대상 없음.

### `part5-03-rt-thread.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part5-03-rt-thread.md`

- url: `/blog/embedded/rtos/practical-internals/part5-03-rt-thread`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: 확정 오류·P0 미발견.
- uncertainties: L143~156 group→세부priority 선택 생략과 __rt_ffs 인덱스, Smart지원·SMP affinity·shell문법·채택·시장점유는 upstream 확인 필요. 의사코드 생략만으로 새 오류를 확정하지 않음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L119~139 객체와FinSH 연결·L163~194 IPC 순서가 지도 역할. 실제 진단·비교 관찰은 없다. |
| B | 11 | 구조→component→Smart→개발도구까지 완결이나 중요한스케줄러·Smart 구현은 짧고 정확성 의문이 남아 B≤13. |
| C | 5 | 짧은코드·shell 예시만 있고 태그·환경·성공 관찰 없음. L31·306 수치의출처도 약함. |
| D | 12 | 11→12. Zephyr L284~297과 이 글L303~313은 LoC/devicetree 외 비교 축이 다르다. selection L118·127·248~254는 component/Studio/중국생태계 짧은요약일뿐. 실제object·IPC 상세는 독립적이며 공통H2를 중복감점 근거에서 제외. |
| E | 5 | 분석을약속하지만 Smart/Studio는 L241~270 개념요약이고 연혁·시장표 비중이 크다. |
| F | 6 | L355 다음porting·L359~362 관련 제목/공개상태 일치. object/IPC의 전제 글 연결은 부족. |
| G | 2 | 저장소·라이선스 이름은 있으나 코드버전·시장/채택 근거의직접출처 없음. |

다음 조치: 보강. 병합 대상 없음. 객체·IPC를 source태그로 추적하는 질문이 독립적.

### `part5-04-porting.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part5-04-porting.md`

- url: `/blog/embedded/rtos/practical-internals/part5-04-porting`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: L53~54↔170 initial frame 슬롯 불일치.
- uncertainties: RISC-V trap문맥·return SP·CSR 보존, AArch32/64 혼합설명, tickless 폭·경합·정확한보정, Zephyr soc경로와 포팅기간은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L297~304 여섯단계 지도는 있으나 표준port 조각의 반복이고 실제 새보드 실패기록 없음. |
| B | 11 | 초기frame부터timer·arch·검증순서로 이어지나 첫task 시작 오류와미검증trap/tickless가핵심에 남음. |
| C | 6 | 코드·설정·검증할항목은 있지만 실제 빌드/보드결과 없음. L182·221 cycle/분량수치로8상한. |
| D | 6 | L42~179↔FreeRTOS소스 L133~204·282~310 같은frame/SysTick/PendSV. L187~205↔RISC-Vcontext L81~113 SP교환·레지스터보존; 기존비교51~66은설명목록이므로수정. L275~295↔tickless L38~60 흐름도겹친다. |
| E | 6 | 포팅절차는있으나 FreeRTOS예 중심이며 새아키텍처 완전검증·Zephyr이식은짧다. |
| F | 7 | L356 다음selection·L360~365 라벨일치. 번호목록과 구현절 대응이 고유단계탐색을제공. |
| G | 1 | 주된port코드에 upstream태그·permalink 없고 주기/분량·기간 근거도없다. |

다음 조치: frame·상태보존·검증결과 보강. FreeRTOS소스 글과 코드정본 분리, 새arch 포팅질문으로 역할을좁힐 후보.

### `part5-05-selection-guide.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part5-05-selection-guide.md`

- url: `/blog/embedded/rtos/practical-internals/part5-05-selection-guide`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: 확정 오류·P0 미발견.
- uncertainties: L26~38 라이선스·인증·footprint, 플랫폼 지원·NASA채택·금액·벤더 적용·EOL은 각각 공식자료 확인 필요. L204의NuttX채택은 인접글의미검증인용을 근거로 확정하지않음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 13→14. L42~174 축·L176~254 시나리오의 결합이 독립 의사결정 틀. HW표의footprint우선 추천에서Zephyr를빠뜨렸다고 네트워크중시시나리오추천까지 모순은아님. 기존그감점제거. 실증부재로상단불가. |
| B | 12 | 11→12. 비교→조건→시나리오→TCO·인력→함정으로 완결. '세축'요약과일곱절은관점깊이차이여서기술오류나완결성감점으로 과대반영하지않음. 구체인증·지원불확실로B≤13. |
| C | 5 | 비교표·추천이많지만 데이터수집/검증방법 없음. L134~150 성능·L91·267 금액에 원자료없어 C≤8. |
| D | 12 | L26~38·154~174↔NuttX L284~296 일부POSIX표, L206~238↔PREEMPT_RT L264~288 선택기준은겹침. 왜RTOS L145~154는짧은라이선스목록. 여러RTOS중선택이라는질문은별도. |
| E | 8 | 제목4축과여러시나리오를실제절로이행. 검증된비교데이터·구체프로젝트 가정은부족. |
| F | 7 | L320 실제다음NuttX와 L324~328 대상일치. 번호축·시나리오 구성은고유탐색이다. |
| G | 1 | 광범위한현재라이선스·인증·시세·채택을 서지없이제시. 내부링크가공식출처를대체하지않음. |

다음 조치: 보강. 병합 대상 없음; 비교축별공식버전·조건 확보가우선.

### `part5-06-nuttx.md`

source_file: `src/content/blog/embedded/rtos/practical-internals/part5-06-nuttx.md`

- url: `/blog/embedded/rtos/practical-internals/part5-06-nuttx`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: L60규모비교산술·L221Ingenuity FCcore 설명. NASA인용의서지부재는별도추가확인.
- uncertainties: L220Snapdragon세부core·L222ROS·L223NuttX채택·L227인용원전, POSIX모드별fork/procfs·SonySMP·채택조건은미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L99~122 빌드모드·L193~266 채택지도는정리관점이나실측사례 없음. 핵심NASA근거도부정확. |
| B | 10 | 11→10. 구조·빌드·응용까지끝나지만규모비교와핵심채택장 하드웨어오류가확인돼설명신뢰가낮다. |
| C | 6 | L167~189 NSH출력·L270~279 빌드단서가있으나버전·실행기록·모드별관찰 없음. 미출처cycle/규모 주장으로8상한. |
| D | 14 | 13→14. selection L32·60·162·244 및whyRTOS L153은언급/표한행뿐이고이글L99~189 빌드모드·VFS·NSH상세는독립. 공통H2만으로중복감점한옛근거제거. POSIX소개 일부겹침은남음. |
| E | 4 | 5→4. 제목·description이NuttX분석과NASA채택기술근거를약속하나L213~229핵심장에확인된core오류와서지없는인용. 분석약속대비개요수준이며검증근거가약하다. |
| F | 6 | L347 다음PREEMPT_RT·L351~354 관련라벨일치. L103·109·115·195·218 등범주가일반문단이라목차계층이약하다. |
| G | 1 | 저장소이름이외구체서지가없고NASA인용에도논문명/링크없음. 평가자가이번에연자료를글기존출처점수에더하지않음. |

다음 조치: NASA인용원전·실제구성을확인하고POSIX/빌드모드를버전별보강. 병합 대상 없음. 독립NuttX검색의도는유효하나확인된오류가우선.

## 공통 후속 조치

원문 추적·포팅이라는 약속에 비해 고정태그와 완전한 상태/빌드 관찰이 부족한 문제가 반복된다. 반복 코드의 정본을 정하고 나머지는 위임하는 수정 후보를 남겼다. 현재 Recipes의 변경은 비교대상의 변화일 수 있으므로 기존 평가자의 실수로 일괄 집계하지 않는다. 원문 수정·병합·공개상태 변경은 이번 작업에서 수행하지 않았다.
