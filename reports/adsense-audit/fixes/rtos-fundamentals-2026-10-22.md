# RTOS 소개·기초1~3 수정 기록

공개4편의 수정 기록. 점수·판정·factcheck는 변경하지 않는다. 모든 RTOS·실기기를 검증했다는 뜻이 아니다.

## 00-preface.md

1. **맥락·범위**: 공개 Practical RTOS Internals 소개
2. **신호·반증**: 본문52+소개1 구분, Zephyr4.0 LTS 오표기, stream buffer를 무조건 lock-free로 설명, 분석 버전·실행 범위 누락
3. **원인·대안**: API와tick/실행시간,이론충분조건과실제시스템비용을혼합한일반화를정정; 제품구성을추측하지않고모델/실제헤더/소스대조범위로구분
4. **증거**: 정확한 tag·소스/API와 실행 관찰을 구분하고 Zephyr3.7 LTS 공식 release 및 ArmMbed 공식 서비스 종료 안내에 연결
5. **표본·한계**: 2026-10-22 macOS; HomebrewClang23.1.3; FreeRTOSV11.2.0 ARM_CM4F공식헤더와Node정수모델. 실제kernel scheduler/board 미실행
6. **결정**: 오류수정·URL/발행상태유지,재채점없음
7. **안전 변경·롤백**: 이4편본문·연관TikZ/SVG2쌍·독립verifier/기록; 01description만확인오류로장단위수동정정
8. **검증·잔여 위험**: 제품WCET·IRQ·blocking·SMP·boardstartup·실제삭제/상태전이·타OS실행·툴chain설정은별도검증

반증 조건: 정확한 대상·태그·실측 자료 또는 모델 가정이 맞는 경우 그 범위의 결과는 수용 가능; 커널 이름만으로 시스템 보장을 추론하지 않음

## part1-01-why-rtos.md

1. **맥락·범위**: 공개 Practical RTOS Internals RTOS 필요성
2. **신호·반증**: 1.8ms CPU 작업을 RTOS로1ms마다 실행한다는 불가능한 약속, 상대1tick을 정확1ms주기로설명, RTOS=hardRT보장과무출처latency/메모리숫자
3. **원인·대안**: API와tick/실행시간,이론충분조건과실제시스템비용을혼합한일반화를정정; 제품구성을추측하지않고모델/실제헤더/소스대조범위로구분
4. **증거**: 1ms요구의180%부하를 거절하는 산술예제; 10ms절대기준 API조각, logger간섭·ISR·blocking·overrun 계약 보강; ThreadX공식라이선스MIT정정
5. **표본·한계**: 2026-10-22 macOS; HomebrewClang23.1.3; FreeRTOSV11.2.0 ARM_CM4F공식헤더와Node정수모델. 실제kernel scheduler/board 미실행
6. **결정**: 오류수정·URL/발행상태유지,재채점없음
7. **안전 변경·롤백**: 이4편본문·연관TikZ/SVG2쌍·독립verifier/기록; 01description만확인오류로장단위수동정정
8. **검증·잔여 위험**: 제품WCET·IRQ·blocking·SMP·boardstartup·실제삭제/상태전이·타OS실행·툴chain설정은별도검증

반증 조건: 정확한 대상·태그·실측 자료 또는 모델 가정이 맞는 경우 그 범위의 결과는 수용 가능; 커널 이름만으로 시스템 보장을 추론하지 않음

## part1-02-task-thread.md

1. **맥락·범위**: 공개 Practical RTOS Internals Task/Thread
2. **신호·반증**: 모든삭제는idle처리·모든Running→Ready는강제·idle은다른task모두block일때만·1KiB대부분충분·80%장애통계 등의 오정보
3. **원인·대안**: API와tick/실행시간,이론충분조건과실제시스템비용을혼합한일반화를정정; 제품구성을추측하지않고모델/실제헤더/소스대조범위로구분
4. **증거**: 공식V11.2.0 vTaskDelete/prvDeleteTCB/prvIdleTask와포트소스대조; 실제헤더 ARM 생성API 컴파일,256word=1024byte,100Hz/1ms정적단언실패
5. **표본·한계**: 2026-10-22 macOS; HomebrewClang23.1.3; FreeRTOSV11.2.0 ARM_CM4F공식헤더와Node정수모델. 실제kernel scheduler/board 미실행
6. **결정**: 오류수정·URL/발행상태유지,재채점없음
7. **안전 변경·롤백**: 이4편본문·연관TikZ/SVG2쌍·독립verifier/기록; 01description만확인오류로장단위수동정정
8. **검증·잔여 위험**: 제품WCET·IRQ·blocking·SMP·boardstartup·실제삭제/상태전이·타OS실행·툴chain설정은별도검증

반증 조건: 정확한 대상·태그·실측 자료 또는 모델 가정이 맞는 경우 그 범위의 결과는 수용 가능; 커널 이름만으로 시스템 보장을 추론하지 않음

## part1-03-scheduling-algorithms.md

1. **맥락·범위**: 공개 Practical RTOS Internals 스케줄링
2. **신호·반증**: 69%보편안전선·RR최대1slice대기·협력형실시간불가·ZephyrEDF없음·FreeRTOS SMP partitioned·95%정답단정
3. **원인·대안**: API와tick/실행시간,이론충분조건과실제시스템비용을혼합한일반화를정정; 제품구성을추측하지않고모델/실제헤더/소스대조범위로구분
4. **증거**: 단일CPU/독립주기/D=T/완전선점/오버헤드0 모델명시; RM 응답[1,3,4],harmonic U1성공,overload6>4실패 검증; 커널정책과RM우선순위배정구분
5. **표본·한계**: 2026-10-22 macOS; HomebrewClang23.1.3; FreeRTOSV11.2.0 ARM_CM4F공식헤더와Node정수모델. 실제kernel scheduler/board 미실행
6. **결정**: 오류수정·URL/발행상태유지,재채점없음
7. **안전 변경·롤백**: 이4편본문·연관TikZ/SVG2쌍·독립verifier/기록; 01description만확인오류로장단위수동정정
8. **검증·잔여 위험**: 제품WCET·IRQ·blocking·SMP·boardstartup·실제삭제/상태전이·타OS실행·툴chain설정은별도검증

반증 조건: 정확한 대상·태그·실측 자료 또는 모델 가정이 맞는 경우 그 범위의 결과는 수용 가능; 커널 이름만으로 시스템 보장을 추론하지 않음

## 실행 기록

- `node scripts/verify-rtos-fundamentals-examples.mjs`: PASS. 실제 공식헤더 ARM object 컴파일과100Hz/1ms거절 및 정수RTA·주기 예제만 실행. FreeRTOS scheduler를 구동하지 않았다.
- 원본소스는 공식 V11.2.0 archive를 승인받아 `/private/tmp`에만 풀었다. 호스트설정·패키지·기존toolchain변경없음. 재실행 시 `FREERTOS_KERNEL_DIR`로 동일태그경로 지정.
- 4편 publish gate blocking0·inline math0, 수정 전후frontmatter직접대조. 01description의불가능한일괄보장만수동정정; URL/date/draft/seriesOrder동일.
- 도식은 별도 설명용 모델이다. source/SVG2쌍 빌드·문자누락0, strict bbox 결과는 동반 로그 참조. 그림 caption을 actual measurement로 제시하지 않는다.
- 전체사이트1135페이지build,anchor67/0,readingquiet통과(공통checkpoint; 병행루프가새로고친미완료글도포함될수있으며실행검증완료를뜻하지않음).
- gate upstream symbol SKIPPED는 사실검증PASS로세지않는다. 실제board·WCET·SMP·실행중삭제경로는제품적용전에재검토한다.

[예제로그](rtos-fundamentals-2026-10-22-examples.log) · [gate](rtos-fundamentals-2026-10-22-gate.log) · [도식bbox](rtos-fundamentals-2026-10-22-diagram-overlap.log)

- 후속 산문 교정(2026-10-22): 7편의 산문·표에서 띄어쓰기와 어색한 조사·표현을 다듬었다. 코드 fence·frontmatter·숫자·기술 의미·링크와 01~03의 좁은 실험 범위 표시는 유지했다. 00~03의 after SHA-256을 갱신했으며 04~06 해시는 별도 전달한다.
