# RTOS Part2-01~03 수정·검증 기록

재채점 없이공개3편의확인오류를수정했다. 본문named블록을직접추출하고공식FreeRTOS V11.2.0의list.c·headers·POSIXport를구분사용한다.

## part2-01-ready-list.md

1. **맥락·범위**: 공개RTOSscheduler자료구조·선택입문 part2-01-ready-list.md
2. **신호·반증**: 0부터검색해idle/낮은priority선택,정렬insert를O1로설명,8x8을256priority로표기,CLZ1cycle=전체scheduler·근거없는TCB/최대priority표
3. **원인·대안**: 자료구조/정책/코어명령/실제커널동작을섞은일반화와예제전사오류. 원래학습주제는유지하고공식태그·작은실행모델·실제POSIX동작을분리
4. **증거**: 실제V11.2.0 list.c/link호스트모델에서7/3/0선택·동일priority회전·제거;priority0bitmap회피·bit31;CortexM4 CLZ코드생성;EEVDF공식문서·그림Idlebit/순환/비용표시정정
5. **표본·한계**: 2026-10-22 macOS/Clang23.1.3·FreeRTOSV11.2.0. 전문과published-loop35/36대조,실제namedfence추출. 호스트list모델·ARM컴파일·POSIXkernel만실행
6. **결정**: 확인오류수정,점수/판정원장은보존하고재채점하지않음
7. **최소 변경·롤백**: 이3편본문·readybitmap그림TeX/SVG1쌍·독립verifier/기록. 01description만확인오류로수동정정. URL/date/draft/order동일,장별diff경계로rollback
8. **검증·잔여 위험**: 전체MCU reset/IRQ/PendSV/latency/WCET/SMP·실제kernel장기tickwrap·uCOS/Linux실행은미검증. 실제제품태그·port·모델변경전재검토

반증 조건: 같은타깃/태그/설정의유효한모델·실측자료가있으면그범위에서만수용가능;용어·단일cycle만으로결론내리지않음

## part2-02-blocked-list.md

1. **맥락·범위**: 공개RTOSscheduler자료구조·선택입문 part2-02-blocked-list.md
2. **신호·반증**: delta postdecrement1tick늦음·동시만료누락,empty sentinel검사누락,xItemValue설정누락,49일무조건·서로배타list·suspendedtick갱신·구조체크기오류
3. **원인·대안**: 자료구조/정책/코어명령/실제커널동작을섞은일반화와예제전사오류. 원래학습주제는유지하고공식태그·작은실행모델·실제POSIX동작을분리
4. **증거**: 실제list API의8bit시간모델250→255/2·같은tick두만료·최대key;ARM32/tick32/integrity0에서mini0/1 sizeof정적단언과nm List_t28/20확인;공식tasks.c 누적tick·pendingready경로대조
5. **표본·한계**: 2026-10-22 macOS/Clang23.1.3·FreeRTOSV11.2.0. 전문과published-loop35/36대조,실제namedfence추출. 호스트list모델·ARM컴파일·POSIXkernel만실행
6. **결정**: 확인오류수정,점수/판정원장은보존하고재채점하지않음
7. **최소 변경·롤백**: 이3편본문·readybitmap그림TeX/SVG1쌍·독립verifier/기록. 01description만확인오류로수동정정. URL/date/draft/order동일,장별diff경계로rollback
8. **검증·잔여 위험**: 전체MCU reset/IRQ/PendSV/latency/WCET/SMP·실제kernel장기tickwrap·uCOS/Linux실행은미검증. 실제제품태그·port·모델변경전재검토

반증 조건: 같은타깃/태그/설정의유효한모델·실측자료가있으면그범위에서만수용가능;용어·단일cycle만으로결론내리지않음

## part2-03-scheduler-algorithm.md

1. **맥락·범위**: 공개RTOSscheduler자료구조·선택입문 part2-03-scheduler-algorithm.md
2. **신호·반증**: tickISR직접context선택·resume direct·포인터대입이전부·RRcursor다음위치오표기·timeslicing0이면yield회전불가·BASEPRI와scheduler suspend혼합
3. **원인·대안**: 자료구조/정책/코어명령/실제커널동작을섞은일반화와예제전사오류. 원래학습주제는유지하고공식태그·작은실행모델·실제POSIX동작을분리
4. **증거**: 공식ARM optimized헤더CLZ코드생성·최대priority33설정컴파일거절;실제V11.2.0 POSIXkernel에서tick slicing0·동일priority명시적yield0123순서정상실행;tasks/portmacro/port.c대조
5. **표본·한계**: 2026-10-22 macOS/Clang23.1.3·FreeRTOSV11.2.0. 전문과published-loop35/36대조,실제namedfence추출. 호스트list모델·ARM컴파일·POSIXkernel만실행
6. **결정**: 확인오류수정,점수/판정원장은보존하고재채점하지않음
7. **최소 변경·롤백**: 이3편본문·readybitmap그림TeX/SVG1쌍·독립verifier/기록. 01description만확인오류로수동정정. URL/date/draft/order동일,장별diff경계로rollback
8. **검증·잔여 위험**: 전체MCU reset/IRQ/PendSV/latency/WCET/SMP·실제kernel장기tickwrap·uCOS/Linux실행은미검증. 실제제품태그·port·모델변경전재검토

반증 조건: 같은타깃/태그/설정의유효한모델·실측자료가있으면그범위에서만수용가능;용어·단일cycle만으로결론내리지않음

## 실행 로그

- `node scripts/verify-rtos-scheduler-list-examples.mjs`: ASan/UBSan 실제list API 모델2개,ARM CLZ와mini0/1헤더크기,optimized실제헤더/priority33거절,공식POSIX kernel 명시적yield실행PASS.
- native upstream kernel의unused-variable warning은로그에보존했다. host모델과실제커널검사를같은것으로표시하지않는다.
- 3편 publishgate blocking0·inline math0. upstream cited-symbol SKIPPED는검증PASS가아니다.
- readybitmap그림의1cycle보장·idle0empty·NULL끝표현을고쳤고source/SVG재빌드·strictbbox overlap0/touch0을확인했다. 실제임베디드리스트는sentinel순환이라는설명과맞췄다.
- 전체사이트build/anchor는공통checkpoint로그를참조한다. 새명령과hardware성능을미실행인채로실측이라부르지않는다.

[예제·거절 로그](rtos-scheduler-list-2026-10-22-examples.log) · [gate](rtos-scheduler-list-2026-10-22-gate.log) · [그림 빌드](rtos-scheduler-list-2026-10-22-diagram.log) · [bbox](rtos-scheduler-list-2026-10-22-diagram-overlap.log)
