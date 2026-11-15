# RTOS 기초04~10 수정 루프

재채점 전 원문 7편 수정 기록. 본문 실행 예제는 직접 추출한다. kernel이름·단일관찰값·미측정숫자를제품보장으로확장하지않는다.

## part1-04-preemption.md

1. **맥락·범위**: 공개RTOS기초part1-04-preemption.md
2. **문제 신호**: 전환 trigger·cooperative실시간성·tick기본값·BASEPRI mask범위에대한일반화
3. **원인·대안**: 언어·커널API·hardware·시스템보장을혼합한설명을분리하고실행가능한작은본문예제와target미검증경계로대체
4. **증거**: 실제V11.2.0 ARM_CM4F헤더 BASEPRI mrs/msr·PendSV요청 코드생성 및tasks/port소스대조
5. **표본 범위**: 2026-10-22 macOS arm64/Clang23.1.3/FreeRTOSV11.2.0. 각본문전문과기존published-loop35를대조, named블록직접추출. host/ARMobject/정수모델범위구분
6. **결정**: 확인오류수정. URL/date/draft/seriesOrder유지,재채점안함
7. **최소 안전 변경·롤백**: 7편본문·독립verifier2개·기록/로그. 이장description만확인오류로수동정정. rollback은이장과관련named예제검증기경계
8. **검증·잔여 위험**: 실제선점/IRQ/보드timing미실행

반증 조건: 동일tag/target/설정·정확한모델·실제측정원자료가있는경우해당결론만수용가능. 일반규칙으로확장하지않음

## part1-05-interrupts-rtos.md

1. **맥락·범위**: 공개RTOS기초part1-05-interrupts-rtos.md
2. **문제 신호**: Cortex-M stack·scheduler비활성일반화·RDR범용이름·포화무시·cycle표·FromISR take누락·NVIC논리/인코딩값혼합
3. **원인·대안**: 언어·커널API·hardware·시스템보장을혼합한설명을분리하고실행가능한작은본문예제와target미검증경계로대체
4. **증거**: 공식헤더 UART queue API object컴파일·drop hook 의존심볼;queue/semphr/portmacro및Linux NAPI문서대조
5. **표본 범위**: 2026-10-22 macOS arm64/Clang23.1.3/FreeRTOSV11.2.0. 각본문전문과기존published-loop35를대조, named블록직접추출. host/ARMobject/정수모델범위구분
6. **결정**: 확인오류수정. URL/date/draft/seriesOrder유지,재채점안함
7. **최소 안전 변경·롤백**: 7편본문·독립verifier2개·기록/로그. frontmatter전체보존. rollback은이장과관련named예제검증기경계
8. **검증·잔여 위험**: UART상태ack·queue포화IRQ·NVIC/IRQ실행·파형미검증

반증 조건: 동일tag/target/설정·정확한모델·실제측정원자료가있는경우해당결론만수용가능. 일반규칙으로확장하지않음

## part1-06-sync-basics.md

1. **맥락·범위**: 공개RTOS기초part1-06-sync-basics.md
2. **문제 신호**: 모든IRQ disable·이전mask무시·atomic=단일명령·producer barrier만으로data race해결·50us보편안전선
3. **원인·대안**: 언어·커널API·hardware·시스템보장을혼합한설명을분리하고실행가능한작은본문예제와target미검증경계로대체
4. **증거**: C11release/acquire one-shot게시host실행·UBSan;C11§5.1.2.4/§7.17·GCCatomic·FreeRTOS공식포트대조
5. **표본 범위**: 2026-10-22 macOS arm64/Clang23.1.3/FreeRTOSV11.2.0. 각본문전문과기존published-loop35를대조, named블록직접추출. host/ARMobject/정수모델범위구분
6. **결정**: 확인오류수정. URL/date/draft/seriesOrder유지,재채점안함
7. **최소 안전 변경·롤백**: 7편본문·독립verifier2개·기록/로그. frontmatter전체보존. rollback은이장과관련named예제검증기경계
8. **검증·잔여 위험**: 모든interleaving·보드ISR/atomic helper·DMA/cache·WCET미검증

반증 조건: 동일tag/target/설정·정확한모델·실제측정원자료가있는경우해당결론만수용가능. 일반규칙으로확장하지않음

## part1-07-semaphore.md

1. **맥락·범위**: 공개RTOS기초part1-07-semaphore.md
2. **문제 신호**: 모순된lost-wakeup주석·give포화실패누락·대기등록/수면경쟁·token bucket1초고정한도·자원반환실패경로
3. **원인·대안**: 언어·커널API·hardware·시스템보장을혼합한설명을분리하고실행가능한작은본문예제와target미검증경계로대체
4. **증거**: 실제FreeRTOS V11.2.0 POSIX kernel의binary초기empty/full실패/재취득과counting5상한검사;queue/semphr소스대조
5. **표본 범위**: 2026-10-22 macOS arm64/Clang23.1.3/FreeRTOSV11.2.0. 각본문전문과기존published-loop35를대조, named블록직접추출. host/ARMobject/정수모델범위구분
6. **결정**: 확인오류수정. URL/date/draft/seriesOrder유지,재채점안함
7. **최소 안전 변경·롤백**: 7편본문·독립verifier2개·기록/로그. frontmatter전체보존. rollback은이장과관련named예제검증기경계
8. **검증·잔여 위험**: 실제UART/자원pool전송·timer refill·다중consumer경합/timeout미검증

반증 조건: 동일tag/target/설정·정확한모델·실제측정원자료가있는경우해당결론만수용가능. 일반규칙으로확장하지않음

## part1-08-mutex.md

1. **맥락·범위**: 공개RTOS기초part1-08-mutex.md
2. **문제 신호**: 존재하지않는configUSE_MUTEX_PI·단순priority복원·비소유자unlock무시기대·PCP자동교착방지·recursive형태비난
3. **원인·대안**: 언어·커널API·hardware·시스템보장을혼합한설명을분리하고실행가능한작은본문예제와target미검증경계로대체
4. **증거**: 실제공식POSIX kernel의normal자기재취득실패·recursive2취득/2해제;queue/tasks상속·timeout·uxMutexesHeld경로대조
5. **표본 범위**: 2026-10-22 macOS arm64/Clang23.1.3/FreeRTOSV11.2.0. 각본문전문과기존published-loop35를대조, named블록직접추출. host/ARMobject/정수모델범위구분
6. **결정**: 확인오류수정. URL/date/draft/seriesOrder유지,재채점안함
7. **최소 안전 변경·롤백**: 7편본문·독립verifier2개·기록/로그. 이장description만확인오류로수동정정. rollback은이장과관련named예제검증기경계
8. **검증·잔여 위험**: 다중task PI체인/timeout복원·PCP·실제SPI/DMA완료·보드미검증

반증 조건: 동일tag/target/설정·정확한모델·실제측정원자료가있는경우해당결론만수용가능. 일반규칙으로확장하지않음

## part1-09-queues.md

1. **맥락·범위**: 공개RTOS기초part1-09-queues.md
2. **문제 신호**: mutex로보호한대입의race단정·BigMsg1024/총메모리계산·pointer복사없음·overwrite길이누락·4byte/cycle단정
3. **원인·대안**: 언어·커널API·hardware·시스템보장을혼합한설명을분리하고실행가능한작은본문예제와target미검증경계로대체
4. **증거**: 실제POSIX kernel에서by-value42보존·empty/full거절·FIFO·wraparound3회;queue/stream header대조
5. **표본 범위**: 2026-10-22 macOS arm64/Clang23.1.3/FreeRTOSV11.2.0. 각본문전문과기존published-loop35를대조, named블록직접추출. host/ARMobject/정수모델범위구분
6. **결정**: 확인오류수정. URL/date/draft/seriesOrder유지,재채점안함
7. **최소 안전 변경·롤백**: 7편본문·독립verifier2개·기록/로그. frontmatter전체보존. rollback은이장과관련named예제검증기경계
8. **검증·잔여 위험**: pointer소유권전송·실제IRQ/MCUcycle·다중producer/stream부하미검증

반증 조건: 동일tag/target/설정·정확한모델·실제측정원자료가있는경우해당결론만수용가능. 일반규칙으로확장하지않음

## part1-10-realtime-analysis.md

1. **맥락·범위**: 공개RTOS기초part1-10-realtime-analysis.md
2. **문제 신호**: samplemax=보장WCET·모든IRQ마스킹·고정전환cycle·평균69%권장·저우선logger영향0·hardRT=특정인증/정적할당
3. **원인·대안**: 언어·커널API·hardware·시스템보장을혼합한설명을분리하고실행가능한작은본문예제와target미검증경계로대체
4. **증거**: 각측정경계·모델가정정정;1-03의정수RTA실행예제연결·공식port/draft/원논문대조·110us/89%가짜보장제거
5. **표본 범위**: 2026-10-22 macOS arm64/Clang23.1.3/FreeRTOSV11.2.0. 각본문전문과기존published-loop35를대조, named블록직접추출. host/ARMobject/정수모델범위구분
6. **결정**: 확인오류수정. URL/date/draft/seriesOrder유지,재채점안함
7. **최소 안전 변경·롤백**: 7편본문·독립verifier2개·기록/로그. frontmatter전체보존. rollback은이장과관련named예제검증기경계
8. **검증·잔여 위험**: Linuxcyclictest·실제DWT/GPIO·운용WCET상한·인증판정미검증

반증 조건: 동일tag/target/설정·정확한모델·실제측정원자료가있는경우해당결론만수용가능. 일반규칙으로확장하지않음

## 실행과 한계

- `node scripts/verify-rtos-preemption-sync-examples.mjs`: C11release/acquire게시host+UBSan,실제ARM_CM4F헤더BASEPRI코드생성·UART API컴파일PASS.
- `node scripts/verify-rtos-ipc-examples.mjs`: 공식V11.2.0 tasks/queue/list/heap_3/POSIX port와본문3함수링크·controller task에서실행PASS. binary/counting/normal·recursive/queue경계확인. 이전임시smoke의첫실행은완료가관찰되지않아중단했고,diagnostic추가smoke는정상종료했다. 최종검증기는POSIX tick을실제로관찰하는2tick대기와10초process timeout을두고정상종료를검사한다. 이관찰은타이밍상한의증거가아니다.
- 최종native빌드의upstream kernel unused-variable warning2개는로그에보존했다. 새코드가warning-free라는주장은하지않는다.
- 7편publishgate blocking0,inline-math0. gate의upstream SKIPPED는factcheck PASS가아니다. metadata는수정전백업과비교했고04/08description만장단위확인오류예외다.
- 전체사이트build/anchor/reading은후속공통checkpoint로수행한다. 실제보드·IRQ·DMA·WCET·Linuxcyclictest와다중taskPI는완료수범위밖이다. 제품적용시target/port/설정변경전재검토한다.

[ARM/게시 실행](rtos-preemption-sync-2026-10-22-examples.log) · [IPC 실제kernel 실행](rtos-ipc-2026-10-22-examples.log) · [04~06 gate](rtos-preemption-sync-2026-10-22-gate.log) · [07~10 gate](rtos-ipc-2026-10-22-gate.log)

## 산문 띄어쓰기 후속 교정

2026-10-22: part1-07~10의 산문과 표에서 띄어쓰기만 교정했습니다. 코드 fence·frontmatter·숫자 표기·기술 의미는 보존하고 JSON의 해당 네 `afterSha256`만 갱신했습니다. Named example, metadata/digit/fence invariant, inline-math 및 IPC/preemption example 검증을 다시 실행했습니다.
