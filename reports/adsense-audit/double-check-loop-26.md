# 공개 글 독립 재검토 — 루프 26

평가일: 2026-10-19. 기준 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2·anchors·antipatterns(AP-C-23/24)를 적용했다. 대상 전문과 기존 보고서 근거를 직접 읽고 아래와 같이 재판정했다. 원문·기존 보고서·사용자 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

역사 앵커 UART=`part1-04-uart-hardware.md`(49), ISR=`part6-09-isr-api.md`(40), Build=`part7-05-kernel-build.md`(50)는 `10550ca1` 원문 기준이다. 현재 수정된 Recipes 점수를 역사 앵커에 연결하지 않았다. Recipes는 재채점에서 제외하고 명시한 D 구간 비교만 허용했다.

2026-10-19 재개 평가. 기준은 10-18 공통 원문 스냅샷이다. 원문 전문 및 기존 근거를 읽고 재판정했다. 기존의 항목별 설명 중 직접 원문과 대조하여 동의한 문장은 재사용하고, 변경/철회한 것은 아래에 고쳤다. 기계적으로 점수에 동의한 기록이 아니다.

[공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 결과를 인용한다. 본문 정확성·실제 target 실행·모바일 육안 확인과 구분한다. P0는 본문 검토 범위에서 미발견이며 전체 구체 주장의 1차 자료 대조는 완료하지 않았다. 사실 불확실 B≤13, 출처·환경 없는 수치 C≤8, 절차뿐 C≤9, 잘못된 안내 F≤5를 먼저 적용했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `chapter03-inspecting-state.md` | 10 | 10 | 6 | 10 | 7 | 7 | 2 | 52 | 미검증 | 병합 검토 |
| `chapter04-backtrace-frames.md` | 11 | 10 | 6 | 10 | 6 | 7 | 2 | 52 | 오류 확인 | 우선 조치 |
| `chapter05-breakpoints-watchpoints.md` | 9 | 11 | 7 | 9 | 5 | 7 | 2 | 50 | 미검증 | 병합 검토 |
| `chapter06-multithread-multiprocess.md` | 14 | 12 | 7 | 10 | 7 | 5 | 2 | 57 | 미검증 | 병합 검토 |
| `chapter07-core-dump.md` | 10 | 12 | 7 | 3 | 6 | 5 | 2 | 45 | 미검증 | 병합 검토 |
| `chapter08-remote-debugging.md` | 12 | 13 | 8 | 5 | 7 | 7 | 3 | 55 | 오류 확인 | 우선 조치 |
| `chapter09-python-scripting.md` | 10 | 12 | 7 | 3 | 7 | 7 | 2 | 48 | 미검증 | 병합 검토 |
| `chapter10-tui-frontends.md` | 7 | 11 | 5 | 3 | 6 | 5 | 2 | 39 | 오류 확인 | 우선 조치 |
| `chapter11-practical-tips.md` | 11 | 10 | 7 | 7 | 6 | 5 | 2 | 48 | 미검증 | 병합 검토 |
| `chapter12-dwarf.md` | 10 | 12 | 5 | 4 | 7 | 6 | 2 | 46 | 오류 확인 | 우선 조치 |

기존 합계 487 → 새 합계 492; 평균 48.7 → 49.2. 기존 오류 확인4편을 유지하되 근거 범위를 좁혔다. 새로운 전체 verified는 없다. F는 특정 번호/주제의 잘못된 안내와 주제 간 관계 설명을 구분했다.

| 파일 | 기존 | 새점수 | 차이 | 게이트·점수 재판정 |
| --- | ---: | ---: | ---: | --- |
| chapter03-inspecting-state.md | 52 | 52 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter04-backtrace-frames.md | 52 | 52 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter05-breakpoints-watchpoints.md | 50 | 50 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter06-multithread-multiprocess.md | 56 | 57 | 1 | F4→5: 링크 없는 Concurrency 학습명만으로 잘못된 target 추가 감점한 근거 철회. TSan/MSan의 특정 관련라벨 오표기는 유지. |
| chapter07-core-dump.md | 45 | 45 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter08-remote-debugging.md | 55 | 55 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter09-python-scripting.md | 47 | 48 | 1 | F6→7: 코드블록 언어표시만으로 상한 두지 않고 객체→명령→printer→MI→LLDB의 고유 구조 인정. |
| chapter10-tui-frontends.md | 38 | 39 | 1 | F4→5: Cortex-Debug→수동 OpenOCD 관계 설명을 target 키워드 부재로 잘못 판정한 부분 철회; Ch11마지막 오안내 상한은 유지. |
| chapter11-practical-tips.md | 48 | 48 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter12-dwarf.md | 44 | 46 | 2 | F4→6: “CFI가풀어주는것”은 backtrace와CFI의 관계 안내이지 대상글에CFI교재가있다는 약속이 아니므로 잘못된라벨 상한 철회. |

## 글별 근거

### chapter03-inspecting-state.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 151행 rip <main+22>와 183행 main 시작 주소 차이(32), 53행 다른 바이너리 주소는 예시가 서로 다른 실행에서 나왔을 수 있어 오류 확인으로 올리지 않았다. - 382행 0x12345678과 47행 같은 주소 값 0x6c6c6548은 절이 다른 예시라 모순으로 단정하지 않았다. - 166행 print $rax 출력 16진 표기와 138행 natural 열 10진 표기의 차이를 GDB 매뉴얼로 확인하지 않았다. - 374행 compare-sections를 '코어 덤프와 실행 파일 .text 비교'로 설명한 것은 매뉴얼(원격 target 메모리 대 실행 파일)과 다를 수 있으나 1차 자료로 확인하지 않았다. - 406행 print "hello"[2] 출력 0x6c 'l'이 GDB 기본 표기(108 'l')와 맞는지 미확인. - 458행 '-O2 이상에서' 변수 제거 주장은 -O1에서도 생길 수 있다는 기억에 근거한 의심이다. - 87·397행 LLDB memory read -fc alias 표현과 memory find -s 문법, 260행 unique_ptr printer 출력, 487행 LLDB tutorial 앵커를 확인하지 않았다. 이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 대부분 GDB 매뉴얼의 명령 목록을 옮긴 수준이다(58~80행 x 형식·단위 표, 136~155행 info registers 출력, 243~261행 STL 출력 목록). 이 글에만 있는 것은 ptype /o로 offset을 보는 예(114~124행), while 루프로 연결 리스트를 순회하는 예(299~327행), set print object on과 명시적 다운캐스트 비교(349~364행), print free(my_ptr) 부작용 경고(440~447행) 정도다. 선택 기준·실패 사례가 없고, 270행 'GDB 버전에 따라 지원이 다름', 239행 '일부 형식이 살짝 다를 수 있음', 461행 '레지스터에 살아 있을 수 있음'은 구체 주장 대신 쓴 완곡 표현이다. |
| B | 10 | 도입 불릿(17~21행)의 다섯 주제는 모두 절이 있고 정리(468~478행)도 있다. 그러나 224행은 pretty printer가 없을 때 '설치 또는 GDB 설정 필요'로 끝나고 방법이 없다. compare-sections(368~374행)는 명령 한 줄과 설명 한 줄뿐이고, optimized out 절(451~464행)은 같은 주제를 더 다루는 Ch 11로 안내하지 않는다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13이다. |
| C | 6 | 명령과 예상 출력 transcript는 많다(41~56, 97~121, 283~308, 380~398행). 그러나 GDB·LLDB 버전, 컴파일러·옵션, OS·아키텍처가 하나도 없어 C ≤ 8이다. 151행 rip 0x55555555515f <main+22>는 183행 main 시작 0x55555555513f와 차이가 0x20이고, 53행은 비PIE 주소 0x401234다. 382행은 0x7fff1234에서 0x12345678을 찾았다고 하지만 47행은 같은 주소 값을 0x6c6c6548로 보여 준다. 검증 절차가 없어 4~7 구간이다. |
| D | 10 | 양쪽 전문 읽기: ch02 248~249·306행 배열/레지스터 명령과 이 글134~169·432~447행, ch11 62~95행 optimized out과 이 글451~464행이 반복된다. ch09 392~415행 printer 등록은 이 글211~224행의 입문을 심화한다. 명령 심화 조사라는 역할이 남아 D10 유지; 이번에 열지 않은 외부 글 범위는 근거에서 제외. |
| E | 7 | 제목의 변수·메모리·레지스터·STL이 모두 절로 있다(27·95·134·196행). 그러나 '추적'에 비해 본문은 명령 소개와 출력 예 위주이고, LLDB는 절마다 한두 줄(84~89, 126~130, 171~176행)뿐이다. |
| F | 7 | 15행이 전제 장 Ch 2를 링크한다. 482행 다음 장 'Ch 4: Backtrace와 프레임'은 seriesOrder 4 `chapter04-backtrace-frames.md`와 맞다. 492~496행 관련 항목(ch02, ch04, ch09, gdb-extension ch03, memory ch01)은 대상을 열어 라벨과 맞음을 확인했다. 다만 optimized out 절(451~464행)과 pretty printer 미적용 절(224행)이 Ch 11·Ch 9로 안내하지 않는다. audit:reading·폰 폭 확인을 하지 않아 8을 넘기지 않았다. |
| G | 2 | 본문 출처는 486~488·497행(GDB Examining Memory, LLDB tutorial, GDB STLSupport wiki, GDB 매뉴얼)뿐이고 글 끝 일반 링크라 특정 주장과 연결되지 않는다. GDB·LLDB·libstdc++ 버전 표기도 없다. |

게이트 재판정: 미검증. git log -- 파일 결과는 0a9dd7bc(slug 고정), 28524a9d(코드 블록 언어 태그), 07cc1988(관련 항목 추가), be973200(topic 메타데이터), ac24bb76(제목 변경), 400892d7(linter 일괄), 60ec7a24(TikZ) 7개뿐이다. GDB 매뉴얼·LLDB 문서 같은 1차 자료와 이 글의 명령·출력을 대조했다는 커밋은 없다.

병합 대상·다음 조치: 병합 대상 없음. 일부 절이 ch02 248~249·306행, ch11 62~95행, postmortem ch03 236~239·409행과 겹치지만 시리즈 3장으로서 메모리·타입·레지스터 조사라는 독립 검색 의도가 있다. 다음 조치는 보강이다(451~464행은 줄이고 Ch 11로 연결, 버전·환경을 밝히고 한 세션의 일관된 출력으로 재작성, 224행 해결 절차를 Ch 9·gdb-extension Ch 3로 연결, 명령별 주장에 GDB 매뉴얼 절 출처).  


### chapter04-backtrace-frames.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 128행 info frame saved rip과 32행 bt #1 주소 차이: caller 프레임 pc 표시 규칙을 매뉴얼로 확인하지 않았다. - 284행 'bt no-filters — 가끔 깨진 자리 통과'는 매뉴얼상 Python frame filter를 끄는 옵션일 뿐이라 근거 없는 주장 후보다. - 295~296행 `skip function pthread_*`의 linespec 해석을 실행 확인하지 않았다. - 156행 C의 `inline int small()`은 -O0에서 링크 오류가 날 수 있다(C99 inline 규칙 미확인). - 172행 'GDB 7+' 버전 기준, 175~176행 'Inlined frame, no frame info.' 출력 문구, 410행 `libstdc++6-dbgsym` 패키지 조건을 확인하지 않았다. - `chapter11-practical-tips.md` 111~115행은 인라인을 한 줄 '(inlined by ...)'로, 이 글 164~172행은 별도 프레임으로 보여 준다. 다른 글과의 모순이라 1차 자료로 정해야 한다. 이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | bt·frame·up·down·info frame·thread apply all bt(41~150, 240~265행)는 매뉴얼 Backtrace·Selection 절 범위의 명령 소개다. 이 글만의 부분은 인라인 프레임(153~179행), tail call로 사라지는 helper(193~213행), 깨진 스택(271~288행), 시나리오 3개(332~391행)다. 시나리오 3(376~391행)은 결론이 없고, 181~189행 'set print frame-info' 절은 그 명령을 실행하지 않는다. 164·195·230행 완곡 표현이 구체 조건을 대신한다. |
| B | 10 | 도입 예(17~37행) → 명령 변형 → 프레임 이동 → 함정 → 정리(420~430행)로 기본 흐름은 있다. 그러나 115행 프레임 번호 방향 설명이 31~34행 예와 매뉴얼에 반대이고, 299·428행 skip 설명이 매뉴얼과 맞지 않는다. 284행 'bt no-filters로 깨진 자리 통과'는 근거가 없고 시나리오 3은 결론이 없다. AP-C-24상 B ≤ 13, 핵심 개념 오류 2건과 결론 누락으로 10. |
| C | 6 | 명령과 출력 예(25~35, 62~73, 125~135, 313~324행)는 있으나 GDB·LLDB 버전, 컴파일러·옵션, OS가 없다. 출력이 '0x...'(185~186행), '#0~99'(365행), 'Thread 4: 멈춰 있음'(382행)처럼 손으로 만든 형태다. 128행 saved rip 0x...145와 32행 #1 0x...140이 다르다. 412~414행 디버그 심볼 설치는 결과 확인이 없다. |
| D | 10 | 양쪽 읽기: 이 글240~265·376~391행 thread apply/deadlock과 ch06 117~125·206~236행, core backtrace311~328행과 ch07 217~238행이 반복된다. ch11 111~115행 inline frame도 같은 주제지만 라이브 call stack 탐색과 프레임 이동 입문은 남아 D10 유지. |
| E | 6 | 제목·description의 bt·frame·up·down, 프레임 안 변수, 인라인은 41~119, 92~104, 153~179행에서 다룬다. 그러나 '분석'에 비해 명령 소개 위주이고 LLDB는 몇 줄뿐이며(52~58, 99~104, 146~149, 261~265행), 제목 핵심인 프레임 이동 방향 설명(115행)이 틀렸다. |
| F | 7 | 434행 다음 장 Ch 5는 seriesOrder 5 `chapter05-breakpoints-watchpoints.md`와 맞다. 443~447행 관련 항목(ch03, ch05, ch07, dwarf-elf ch05, postmortem ch03)을 열어 라벨·제목·draft:false를 확인했다. 본문 267행 Ch 6, 328행 Ch 7도 맞다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 하지 않아 9 이상은 아니다. |
| G | 2 | 438~439행 GDB Backtrace 매뉴얼·LLDB tutorial 링크는 본문 주장과 연결되지 않은 목록이고, 172행 'GDB 7+' 외 버전 표기가 없다. 448행 DWARF 규격 링크도 본문 주장과 무관하다. |

게이트 재판정: 오류 확인 유지. 2026-10-19 [공식 GDB skip 설명](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Skipping-Over-Functions-and-Files.html)과 [프레임 선택 설명](https://sourceware.org/gdb/current/onlinedocs/gdb.html/Selection.html)을 직접 열었다. skip은 stepping의 진입을 건너뛰는 기능이라299·428행 backtrace 프레임 숨김 주장과 다르다. up은 바깥쪽/큰번호로 이동한다는 공식 정의와115행 “큰번호=깊은호출”이 반대이며 같은 줄 깊이줄임/번호증가 및 #0deepest/#3main 예와도 충돌한다. 특정 두 기능만 대조했으며 전체 명령/target실행 검증은 아니다.

병합 대상·다음 조치: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 후보는 `postmortem/chapter03-gdb-core-analysis.md`(bt·thread apply all bt 중복)지만 라이브 디버깅의 프레임 탐색이라는 독립 검색 의도가 있어 차별화 보강이 맞다. 115행을 매뉴얼 기준으로, 299·428행 skip 설명을 'step 시에만 건너뜀, 이름 패턴은 -rfunction'으로 고치고, 284행 주장 삭제, 시나리오 3 결론을 보강한다.  


### chapter05-breakpoints-watchpoints.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 195행 'x86은 4개, ARM은 더 많음': embedded ch02 194·301행은 Cortex-M DWT 4개, recipes part10-03 113행은 core별로 다르다고 적는다. ARM ARM으로 확인하지 않았다(다른 글과의 모순). - 211행 software watchpoint '수십~수백× 느림'은 출처·환경 없는 수치다. - 318행 '매핑된 라이브러리 부분에서는 hbreak 필수'는 ptrace software breakpoint 동작과 다를 수 있으나 확인하지 않았다. - 244·280~284행 catch syscall open은 최근 glibc에서 openat으로 처리돼 걸리지 않을 수 있다. - 38행 b 4가 의도한 행(3행)과 다른 듯하나 스니펫 행 번호 전제가 없어 오류 확인에 넣지 않았다. - 198~206행 watch (long array)[100]와 software watchpoint 대체·수동 강제 흐름, 103행 ignore count와 if i == 1000의 동작 차이를 GDB 문서로 확인하지 않았다. 이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 9 | 조건부 break(19~53행), commands(55~92행), ignore(94~103행), tbreak·rbreak(107~131행), watch 3종(135~186행), catch(238~287행), enable count(291~301행), hbreak(305~318행), handle(367~389행)은 매뉴얼 Breakpoints 장 명령을 차례로 옮긴 목록이다. 고유한 것은 commands+silent+printf 로그(75~92행)와 balance가 -1이 되는 자리를 watch로 찾는 예(146~172행) 정도다. 172행 '며칠 걸릴 사고를 몇 분 만에'는 근거 없는 수사다. |
| B | 11 | 조건부 break → watchpoint → catchpoint → 활성화 제어 → hbreak → 시그널 → pending → 시나리오 → 정리(459~468행)로 흐름은 끝난다. LLDB 대응은 one-shot(116~120행)과 예외(271~275행)뿐이고 LLDB watchpoint가 없다. commands(55~92 vs 322~363행), catch throw(240~268 vs 445~455행)가 두 번 나온다. 정확성 불확실이 열려 있어 13 이하. |
| C | 7 | GDB·LLDB 버전, 아키텍처, 컴파일 옵션이 없다. 세션 출력(154~170·252~263·279~285행)은 주소를 0x...로 지운 설명용이고 대상 소스가 없다. 195행 'x86은 4개, ARM은 더 많음', 211행 '수십~수백× 느림', 316행 'x86은 4개'는 출처·환경 없는 수치라 C ≤ 8. 38행 b 4 if ...는 30~34행 스니펫의 닫는 중괄호를 가리킨다. |
| D | 9 | 양쪽 읽기: ch02 89~95·99~114·123~124행과 이 글22~24·109~132·294~295행의 조건부/임시/정규식 break 및 활성화가 반복된다. ch09 173~182행 Python stop hook은 이 글63~90행 commands 로깅을 다른 방식으로 심화한다. 명령 카탈로그 중복 비중이 크고 watch/catch 시나리오가 별도로 남아 D9 유지. |
| E | 5 | 제목·description의 Conditional·Hardware·Catchpoint·watchpoint는 19~53·135~234·238~287·305~318행에서 다룬다. 그러나 제목의 '분석'과 달리 명령 목록과 한두 문장 설명 수준이라 루브릭 E 주석에 따라 3~5점이다. LLDB 쪽 watchpoint·hardware breakpoint가 없다. |
| F | 7 | 15행이 전제 장 Ch 2를 링크한다. 472행 다음 장 Ch 6은 seriesOrder 6 `chapter06-multithread-multiprocess.md`와 맞다. 482~486행 대상(ch04, ch06, ch09, gdb-extension ch02, embedded ch02)을 열어 라벨과 맞음을 확인했다. 395~401행 gdb 세션에 c 태그가 붙었고 같은 절이 두 번 나와 흐름이 끊긴다. |
| G | 2 | 476~478행 GDB 매뉴얼·LLDB tutorial 링크는 본문 주장과 연결되지 않고 버전·아키텍처 표기가 없다. 195·316행 디버그 레지스터 개수, 211행 software watchpoint 비용에 출처가 없다. |

게이트 재판정: 미검증. git log는 0a9dd7bc(URL 고정), 28524a9d(코드 블록 언어 태그), 07cc1988(관련 항목 추가), be973200(topic 메타데이터), ac24bb76(제목 변경), c1e04375(text 블록 변환), 400892d7(린터 일괄), 60ec7a24(다이어그램)뿐이다. GDB 매뉴얼·LLDB 문서와 대조한 커밋은 없다. 원문 안에서 동시에 참일 수 없는 두 기술 진술은 찾지 못했다(38행 b 4는 스니펫 행 번호가 파일 행 번호라는 보장이 없어 uncertainties).

병합 대상·다음 조치: 병합 대상 없음. ch02 90~124행과 일부 겹치지만 breakpoint·watchpoint·catchpoint는 따로 검색되는 주제다. 다음 조치는 보강이다(ch02와 겹치는 부분을 한쪽으로 모음, 글 안 반복 절 322~363·445~455행 정리, LLDB watchpoint·hardware breakpoint 대응 추가, 디버그 레지스터 개수와 software watchpoint 비용을 1차 자료로 확인해 고치거나 삭제).  


### chapter06-multithread-multiprocess.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess`

score_status: 잠정 · score: 57 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 227행 T2·T3 락 관계가 210~225행 콜스택과 반대로 보이지만 가정문이라 오류 확인으로 올리지 않았다. - 201행 `__owner = 12346`은 197행 thread 2 자신의 LWP(77행)이고, 77행 thread 2는 fetch_add에 있어 196행 예시와 상태가 다르다. - 367행 rr 루프는 성공 시 멈춰 369행 설명과 반대일 수 있다. rr record의 종료 코드 전달을 확인하지 않았다. - 236행 같은 mutex 주소만으로는 대기 사이클이 확인되지 않는다. - 322행 follow-exec-mode 기본값 `new`, 377행 rr ARM 미지원, 305행 fork의 clone 플래그, 238행 `clang-analyzer-alpha.deadcode.*`, 255행 scheduler-locking replay, 56·257행 ptrace 내부 동작, 413·414·384행 LLDB·macOS 대응은 1차 자료로 확인하지 않았다. - 267·340·369행 수치는 출처·환경이 없다. 이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 이 글만의 것은 clone 플래그(26~40행)를 info threads의 두 ID 읽는 법(42~50행)으로 잇는 부분, `print *mutex`로 `__owner`를 LWP로 읽는 절차(196~204행), 같은 스택끼리 묶는 Python 요약 스크립트(165~178행), GDB·TSan·Helgrind·rr 분담 표(396~401행)다. non-stop(54~69행), scheduler-locking(244~255행), follow-fork(273~296행)는 명령을 한두 문장으로 옮긴 수준이고, 56행 '모드가 다릅니다', 259·416행 근거 없는 비교가 있다. 13~19 구간 하단. |
| B | 12 | 흐름은 끝까지 간다(정리 418~429행). 그러나 227행 산문은 210~225행 콜스택(Logger::Write는 T3에만 있음)과 맞지 않고 232행도 T2에서 cache_mutex_를 찍는다. 236행 '같은 주소가 보이면 데드락 확정'은 사이클 확인이 없다. 142행 '두 방법' 뒤에 세 가지(144·152·163행)를 나열한다. 367행 `while ! rr record ./my_test`는 성공할 때 멈추는데 369행은 '재현될 때까지 반복'이라 쓴다. AP-C-24로 13 이하. |
| C | 7 | 267행 '수 마이크로초 ~ 밀리초', 340행 '5-10배 느림', 369행 '30분 안에'는 출처·환경 없는 수치라 C ≤ 8. 명령과 예시 출력(73~80, 196~202, 289~294, 342~361행)은 있으나 대상 프로그램, GDB·LLDB·glibc·rr 버전이 없다. 201행 `__owner = 12346`은 thread 2 자신의 LWP(77행)라 예시끼리 맞지 않는다. |
| D | 10 | 양쪽 읽기: 이 글206~236행과 ch04 375~390행 deadlock,342~361행 rr과 ch11 207~218행 rr이 반복된다. ch02 416행 follow-fork 한줄에 비해 이 글273~296행은 부모/자식/inferior를 전개하고 futex·pthread/LWP 관계도 별도다. D10 유지. 다른 draft 시리즈 중복은 이번 평가 근거에서 제외. |
| E | 7 | 제목의 Non-Stop(54~69행), Scheduler-Locking(240~269행), Fork(271~324행)와 description의 thread apply·follow-fork·rr(326~388행)을 다룬다. Non-Stop은 세 단락과 가상 출력 하나뿐이고 description의 'process apply'는 본문에 명령으로 나오지 않는다. |
| F | 5 | Ch7 다음편 및 Ch5/7/Valgrind 라벨·metadata를 확인했다. 특정 “Sanitizers Ch4 TSan/MSan”은 실제 order4 TSan 글에 MSan이 없고 description도 TSan으로 한정해 F≤5 유지. 반면 링크 없는 Concurrency Debugging 시리즈명만으로 추가 틀린 target이라고 확정하지 않아 F5로 조정. 고유 futex/소유자/rr 경로는 있으나 상한 적용. |
| G | 2 | 본문 출처는 330행 rr-project.org, 384행 Microsoft TTD 문서, 441~444행 rr·Pernosco·`man 2 clone`·`man 7 futex`다. GDB·LLDB·glibc·rr 버전이 없고 76·212행 glibc 파일:줄 인용도 판이 없다. 255·322·377행처럼 버전에 따라 달라지는 주장에 매뉴얼 위치가 없다. |

게이트 재판정: 미검증. git log는 0a9dd7bc(URL 고정), be973200(topic 메타데이터), ac24bb76(제목 변경), 400892d7(linter 일괄), 09a00a29(stub·TikZ 일괄), c99833a1(callout 변환), 2907896a(Deep dive callout 추가), 60ec7a24(다이어그램)뿐이다. GDB 매뉴얼·rr 문서·glibc 소스·man page와 대조한 커밋은 없다. 227행 산문과 210~225행 콜스택은 어긋나 보이지만 '~라면' 가정문이라 오류 확인으로 올리지 않았다.

병합 대상·다음 조치: 병합 대상 없음. 같은 질문을 나눠 답하는 concurrency/chapter01~05는 모두 draft라 공개 URL이 아니다. 다음 조치는 보강이다(227행을 콜스택과 맞추기, 201행 예시 수정, 367~369행 루프 조건 정리, 142행 개수 수정, GDB·rr 버전과 매뉴얼 출처, 439행 라벨과 14행 draft 시리즈 안내 수정). Concurrency 시리즈 공개 때 병합 여부를 다시 판단한다.  


### chapter07-core-dump.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter07-core-dump.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter07-core-dump`

score_status: 잠정 · score: 45 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 304·309·326·399행 coredump_filter: 기본값 0x33이면 bit 2가 이미 꺼져 있는데 309행은 같은 값을 'file-backed 제외' 설정으로 쓰고 326·399행은 bit 2를 끄면 코어가 준다고 한다. 304행 괄호는 bit 4를 빠뜨렸다. 조건문이라 오류 확인으로 올리지 않았고 kernel proc.rst로 확인이 필요하다. - 100행 core_pipe_limit을 '시간 제한'으로 설명하나 postmortem ch01 166행은 동시 core 수 제한으로 설명한다(다른 글과의 모순). - 265~266행 SEGV_BNDERR=6, SEGV_PKUERR=7은 uapi siginfo.h에서 3·4로 기억하지만 1차 자료를 열지 못했다. postmortem ch03 127행도 같은 값. - 166행 'Ubuntu 22.04+' systemd-coredump 기본 여부, 235행 info signal 설명, 393행 coredump_dump_full_shadow, 408행 file 출력 파싱, 330행 SIP, 339행 kern.corefile 기본값을 확인하지 않았다. 이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 생성 조건(22~38행), ulimit(40~62행), core_pattern 표(82~94행), Note 타입 표(128~136행), si_code 표(261~266행), coredump_filter 비트 표(315~324행)는 man 5 core·proc(5) 수준의 목록이다. 이 글다운 해석은 %p/%P와 PID namespace(96행), 파이프 핸들러 함정(100행), NT_FILE과 build-id 매칭(162행) 정도인데 postmortem ch01 144~170행에도 있다. 297·382·249행은 근거 없는 일반론이다. |
| B | 12 | 생성 조건 → ELF 구조 → coredumpctl → gdb 열기(217~249행) → siginfo → debuginfo → coredump_filter → macOS → minidump → Sanitizer → 운영 절차(395~401행) → 정리(416~427행)로 흐름은 끝까지 간다. 제목의 gcore는 본문 0건, description의 'gdb -c'도 예시가 없다. coredump_filter·si_code 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 7 | readelf 출력(107~160행), coredumpctl info(183~199행), coredump.conf(206~215행), 배치 분석 루프(405~411행)가 있지만 커널·systemd·GDB 버전과 배포판이 없고 출력은 '...'로 잘렸다. '수십 GB'(301행), '수 MB'(371행)는 출처 없는 수치라 C ≤ 8. 309행은 기본값 0x33을 그대로 써 넣으며 'file-backed 제외' 설정처럼 소개해 관찰되는 변화가 없다. |
| D | 3 | 양쪽 직접 읽기: 이 글98~100행 파이프 핸들러 ↔ postmortem/chapter01-core-generation.md155~170행,299~326행 coredump_filter ↔273~298행,380~393행 ASan/shadow ↔353~370행이 같은 질문/명령/설명을 반복한다. core 생성·수집·필터·사후분석을 한 번에 읽는 빠른 참조 역할은 있으나 별도 사례/환경이 없어 D3 유지. 읽지 않은 외부 나머지 범위는 근거로 쓰지 않는다. |
| E | 6 | 제목 키워드 gcore·coredumpctl·디버거 활용 중 gcore가 본문에 없다. description의 ulimit·core_pattern·ELF core·NT_PRSTATUS·systemd-coredump는 40~215행에서 다루지만 'gdb -c' 예시가 없다. 14행은 '빠른 참조', 제목은 '분석 기법'이라 역할 표기가 어긋난다. |
| F | 5 | 431행 다음 장 Ch 8은 seriesOrder 8 `chapter08-remote-debugging.md`와 맞다. 435~437행 라벨도 맞다. 438행 'Sanitizers Ch 1: AddressSanitizer'는 `sanitizers/chapter02-asan-ubsan.md`(seriesOrder 2)를 가리켜 번호가 틀렸다. 틀린 관련 링크 규칙으로 F ≤ 5. |
| G | 2 | 439~442행 man 5 core·man 5 elf·systemd-coredump(8)·Breakpad 링크는 목록일 뿐 304·100·265~266·393행 주장과 연결되지 않는다. 버전·확인 날짜가 없고, 주장에 붙은 출처는 26행 'man 7 signal' 하나다. |

게이트 재판정: 미검증. git log는 9건이다(0a9dd7bc slug 고정, 2343c401 태그 정리, be973200 topic 메타데이터, ac24bb76 제목 일괄 변경, 400892d7 linter, 09a00a29 stub 일괄·Mermaid→TikZ, c99833a1 callout 형식, 2907896a gdb-lldb polish, 60ec7a24 TikZ). 어느 것도 man 5 core·proc 문서·systemd-coredump(8)·GDB 매뉴얼과 본문 주장을 대조했다고 적지 않았다. 원문 안에서 동시에 참일 수 없는 진술도 확정하지 못했다.

병합 대상·다음 조치: `src/content/blog/tools/debugging/postmortem/chapter01-core-generation.md`, `chapter02-elf-core-format.md`, `chapter03-gdb-core-analysis.md`. 이 글에만 있는 내용이 거의 없어 기본 방향은 병합이다. GDB 시리즈 7편 자리를 유지해야 한다면 대안은 GDB/LLDB 명령 중심(gcore·generate-core-file·gdb -c·lldb process save-core)의 짧은 빠른 참조로 좁히고 나머지는 Postmortem 링크로 대체하는 차별화 보강이다. URL 처리는 시리즈 전체 검토 뒤 정한다.  


### chapter08-remote-debugging.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging`

score_status: 잠정 · score: 55 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 302행 ESP32-S3가 SWD를 쓴다는 주장은 Xtensa 코어라 다를 수 있으나 1차 자료 미확인. - 475행 'Cortex-M0+ + M4 듀얼(예: nRF5340, RP2040)'은 nRF5340 M33 두 개, RP2040 M0+ 두 개로 기억하지만 미확인. - 717행 'RTT가 J-Link 종속이라면'은 685·688행 OpenOCD RTT 지원과 어긋나지만 조건문이라 오류 확인에 넣지 않았다. 779행 'RTT 깨진 문자 → tpiu config'는 715행상 ITM/SWO 증상이다. - 335행 DBGKEY [31:16]과 336~341행 상태 비트 [25:16] 겹침을 ARMv7-M ARM C1.6.2로 확인하지 않았다. - 426행 Start address 0x080001b8이 .isr_vector 안에 있다(예시 일관성 미확인). - 724~731행 semihosting SYS_WRITE 인자 전달, 699행 미사용 `ITM_PORT`, 752·511·693·788행 주장, 29·256행 연도는 1차 자료로 확인하지 않았다. 이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 고유한 것은 GDB의 일/스텁의 일로 두 갈래를 묶는 틀(20~25행), remote vs extended-remote 표와 OpenOCD·J-Link가 extended를 쓰는 이유(170~179행), `target remote \| ssh … gdbserver -` 한 줄(212~218행), load가 RSP 메모리 쓰기이고 flash loader는 스텁 몫이라는 설명(430~439행)이다. JTAG/SWD·CoreSight 표, RTT·ITM·semihosting·ETM 절은 카탈로그 수준이고 14행이 스스로 '빠른 참조'라 밝힌다. 510·513행은 출처 없는 경험칙이다. |
| B | 13 | RSP → gdbserver/lldb-server → JTAG/SWD → CoreSight → OpenOCD → J-Link → ELF/MAP → trace → 문제 표(770~781행) → RDP → 정리(814~826행)로 흐름은 이어진다. 342~344·422~426행 내부 모순과 열린 정확성 의심으로 AP-C-24에 따라 B ≤ 13. |
| C | 8 | gdbserver 연결(126~162행), OpenOCD 0.12.0 기동 로그(375~384행), GDB 연결 순서(392~401행), J-Link GDB Server V7.94(491~495행)는 재현 가능한 명령과 출력이다. 그러나 load 출력(421~427행)은 산술이 맞지 않고, 510행 '4000이 안전한 기본값', 434행 '4-128 KB 단위', 667행 '1µs 이하'는 출처·환경 없는 수치라 C ≤ 8. 검증 절차는 없다. |
| D | 5 | 양쪽 직접 읽기: 이 글333~345행 DHCSR 목록 ↔ embedded/chapter02-jtag-swd-coresight.md210~218행(동일reserved 충돌 포함),422~426행 load 출력 ↔ embedded/chapter04-jlink.md150~157행(같은 크기/총량),RDP절은 이전 루프24에서 읽은 Recipes part10-02 99~121행과 겹친다. gdbserver/lldb-server 분기 설명이 남아 D5 유지. |
| E | 7 | 제목의 gdbserver·OpenOCD·J-Link와 description의 RSP·JTAG/SWD·CoreSight를 120~218, 361~484, 486~524, 27~118·250~331행에서 다룬다. ELF/MAP(526~610행), RDP(783~791행), trace(656~766행)는 제목·description이 약속하지 않은 범위라 질문이 흩어진다. |
| F | 7 | 830행 다음 장 Ch 9는 seriesOrder 9 `chapter09-python-scripting.md`와 맞다. 834~837행 관련 항목(ch07, ch09, ch12, part10-02)을 열어 라벨과 맞음을 확인했다. 14행 deep dive 대상 `embedded/chapter01-rsp-protocol.md` 존재, 776행 Ch 11 안내는 ch11 62행 절과 맞다. audit:reading·폰 폭 확인이 없어 9점 이상은 아니다. |
| G | 3 | 본문 출처는 89·838행 RSP 명세, 839행 ARMv7-M ARM, 840·841행 OpenOCD·Segger Wiki다. 버전 표기는 192행 'GDB 7.4+', 376행 OpenOCD 0.12.0, 492행 J-Link V7.94, 685행 'OpenOCD 0.11+'가 있다. DHCSR 비트(333~345행), FPB 6개(118·313행), RTT 채널 수(693행)에 ARM ARM 절·Segger 문서 위치가 붙어 있지 않다. |

게이트 재판정: 오류 확인. 원문 내부 모순 두 건(루브릭 3-1). (1) 342행 '[5:2] reserved'인데 343행 '[3] C_MASKINTS', 344행 '[2] C_STEP'이 같은 범위 안 비트를 정의한다. (2) 422~425행 섹션 크기 0x1c0+0x9d20+0x4c0+0x140 = 0xa4e0 = 42208바이트이고 LMA 0x8009ee0, 0x800a3a0도 이 크기로 이어지는데 426행은 'load size 41960'(0xa3e8)이다. git log 13개 커밋은 다이어그램·태그·날짜·URL 정리뿐이고 1차 자료 대조 커밋이 없다.

병합 대상·다음 조치: 우선 조치가 판정을 덮고 점수 구간은 병합 검토다. 베어메탈 절(250~812행)은 `src/content/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight.md`·`chapter03-openocd.md`·`chapter04-jlink.md`·`chapter06-trace.md`와 문단 단위로 같다. 다음 조치는 보강이다. 342~344행과 426행 오류를 먼저 고치고, 베어메탈 부분을 요약과 Embedded Debugging 링크로 줄여 gdbserver·lldb-server 중심으로 차별화한다.  


### chapter09-python-scripting.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter09-python-scripting.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter09-python-scripting`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 222~228행 누수 추적기는 malloc마다 핸들러가 쌓이고 $rax 읽는 시점이 보장되지 않아 보인다. gdb-extension ch02 386~401행은 disconnect를 한다. GDB Python API 문서로 미확인. - 94행 gdb.Value 슬라이스 지원, 601행 '*SB*는 Scripted Bridge', 39행 Python 3.6+ 하한, 413행 libc++ printer 경로, 376~381행 auto-load 위치 규칙을 확인하지 않았다. - 528행 Stripe·Bloomberg, 552행 V8·HotSpot 주장은 출처가 없다. - 674행 gdb.execute로 LLDB 외부 프로세스 제어와 같은 일이 된다는 주장 미확인. - 28~31행 '>'와 41~46행 '>>>' 프롬프트 표기 차이는 기술 주장이 아니라 오류 확인에 넣지 않았다. 이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | GDB Python API 객체 목록(75~84행)과 Command·Breakpoint·pretty-printer·Function·frame filter·Unwinder 사용법(101~552행)을 차례로 옮긴 빠른 참조이고, 14행이 스스로 그렇게 밝힌다. 이 글만의 것은 GDB↔LLDB API 대응표(603~610행), DOT 출력 viz_tree 예(419~456행) 정도다. 456·528행은 근거 없는 일반론이다. |
| B | 12 | 시작(22행) → gdb 모듈 → 명령 → 브레이크포인트 → pretty-printer → frame filter·Unwinder → event → MI → LLDB → .gdbinit → 정리(731~742행)로 흐름은 완성됐다. 누수 추적기(202~252행)는 223행에서 stop 이벤트에 람다를 연결하고 끊지 않으며 222행 주석의 '다음 step에서'와 달리 step·finish가 없다. Unwinder 예 545행은 비어 있는 조각이다. AP-C-24로 B ≤ 13. |
| C | 7 | 123~129, 301~311, 450~454, 478~481, 624~628행에 명령과 예상 출력이 있으나 GDB·LLDB·Python 버전과 환경이 없다. 39행 '보통 Python 3.6+'는 출처 없는 수치라 C ≤ 8. 540·543행 in_jit_region·lookup_jit_frame 미정의, 545행 '...' 인자, 700행 myproj_printers 미정의라 그대로 돌릴 수 없고 715행 백그라운드 스크립트는 구현이 없다. |
| D | 3 | 양쪽 직접 읽기: HelloCmd109~120/MyCmd136~138/LogAllocs173~182/MallocTrack202~240행 ↔ gdb-extension/chapter02-commands-events.md20~30/67~70/289~297/386~410행. 같은 명령·malloc 예가 여러 절에서 반복되고 확장 글은 disconnect까지 설명한다. 넓은 GDB/LLDB 빠른 참조 역할만 남아 D3 유지. 이번에 읽지 않은 FrameDecorator/Unwinder 외부 구간은 근거에서 제외. |
| E | 7 | 제목의 Pretty-Printer(256~415, 630~657행)와 Custom Command(101~164, 612~628행)는 이행한다. description의 '자동화'(166~254·712~719행)와 'MI'(573~586행)는 짧아 부분 이행이다. |
| F | 7 | Ch10 다음편과 Ch5/10/12 metadata·뒤 설명을 확인했다. Ch12 503행 pyelftools,Ch10 DAP 절이 안내와 맞다. API 객체→custom command→stop hook→pretty printer→MI→LLDB 대응으로 고유 학습 경로가 있고 Deep dive는 실제 확장 시리즈 입구다. .gdbinit의 python 태그는 읽기 보강점이나 F6 상한 근거는 아니므로 F7. 모바일 육안 미확인. |
| G | 2 | 753~756행 GDB Python API·LLDB Python API·GDB/MI 명세·libstdc++ printer 소스 링크가 있지만 131·268·376·601행 주장과 연결되지 않고 버전 표기가 없다(current 문서라 기준 시점 불명). |

게이트 재판정: 미검증. git log는 0a9dd7bc(slug 고정), be973200(topic 메타), ac24bb76(제목 변경), 400892d7(린터 일괄), c99833a1(callout 변환), 2907896a(quick reference callout 추가), 60ec7a24(다이어그램)뿐이다. GDB Python API·LLDB SB API·GDB/MI와 대조한 커밋이 없고, 원문 안에서 동시에 참일 수 없는 기술 주장은 찾지 못했다.

병합 대상·다음 조치: `src/content/blog/tools/debugging/gdb-extension/chapter02-commands-events.md`, `chapter03-pretty-printers.md`, `chapter04-frame-unwinder.md`, `chapter01-python-api-basics.md`. 다만 GDB↔LLDB 대응표(603~610행)와 LLDB 절(612~674행)이라는 독립 검색 의도가 있어 다음 조치는 차별화 보강이다. GDB 코드 반복은 gdb-extension 링크로 줄이고 LLDB 비교 중심 빠른 참조로 좁힌다. URL·seriesOrder 변경은 시리즈 전체 검토 뒤에 정한다.  


### chapter10-tui-frontends.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends`

score_status: 잠정 · score: 39 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 점수 구간은 제외 검토지만 `gdb-extension/chapter06-frontends.md`와 거의 같다. 63↔119행 모순 수정 뒤 그 글로 병합할지 검토할 후보다. - 85행 cgdb가 GDB/MI를 쓰는지 annotation을 쓰는지 upstream 소스로 확인하지 않았다. - 141행 gef 설치 URL 'https://gef.blah.cat/py' 유효성 미확인. - 159·167행 CodeLLDB·nvim-dap 어댑터 설명, 174행 lldb-vscode→lldb-dap 이름 변경 가능성, 239행 DAP를 'JSON-RPC'로 부르는 표현, 56행 Ctrl-x s, 264행 setDataBreakpoints 설명을 1차 자료로 대조하지 않았다.   이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 7 | 본문 대부분이 gdb-extension ch06과 같은 내용이다(TUI 22~66, cgdb 70~96, dashboard 98~133, nvim-dap 169~223, Emacs 278~298, 시각화 300~333, 선택 표 345~354행). 이 글에만 있는 것은 셋의 성격 구분(149행), cppdbg가 MI로 통신해 생기는 어긋남(157~161행), variables 지연 로드(272행) 정도다. 161행 '미묘하게 다르게 평가되는 경우가 있고'는 사례 없는 완곡 표현이다. |
| B | 11 | 내장 TUI → 터미널 확장 → IDE → DAP → 선택 표(345~354행) → 정리(356~364행)까지 흐름은 끝난다. 그러나 gef/pwndbg 명령표(151행), VSCode launch.json(163행), Cortex-Debug 설정(341행)은 gdb-extension ch06으로 넘긴다. 63↔119행 모순이 열려 있어 B ≤ 13. |
| C | 5 | 명령(25~29·75·103·141~146행)과 설정 조각(90~95·169~223·278~295행)은 있으나 GDB·LLDB·익스텐션 버전, OS, 예상 화면·출력이 없다. 174행 '/usr/bin/lldb-vscode'도 LLVM 판이 없다. 검증 절차·관찰 결과가 없어 4~7 구간. |
| D | 3 | 양쪽 직접 읽기: 이 글24~30·49~59·85·90~133행 ↔ gdb-extension/chapter06-frontends.md17~23·33~43·64·75~120행. TUI명령/키/ cgdb구조와설정/dashboard 정지훅/모듈예까지 거의같다. 글 고유 추천표/Neovim설정을 인정하되 새 사례·실측이 없어 D3 유지. 다른 범위의 동일문장 전수는 주장하지 않는다. |
| E | 6 | 제목의 gdb-dashboard·gef·pwndbg·VS Code와 description의 TUI·cgdb·nvim-dap·DAP는 모두 절이 있다(22·70·98·135·155·165·227행). gef/pwndbg(149~153행)와 VS Code(155~163행)는 성격만 짧게 적고 나머지를 다른 시리즈로 넘겨 부분 미이행이다. |
| F | 5 | Ch11 다음편 주제는 맞으나 “시리즈 마지막”은 공개 order12가 있어 잘못된 다음 안내로 F≤5. 반면 Ch8의 “Cortex-Debug 익스텐션이 OpenOCD를 띄움”은 이 글345행에서 Ch8수동설정을 자동화한다고 설명한 관계이고 Ch9의 “dashboard도Python확장”도 배경 연결이므로 target에 동일키워드가 없다는 이유만으로 오류라고 하지 않는다. 둘의 추가 감점을 철회해 F5. |
| G | 2 | 본문에 72행 cgdb, 100행 gdb-dashboard, 167행 nvim-dap, 337행 Cortex-Debug 링크와 374행 DAP 명세가 있다. 그러나 버전·확인 날짜가 없고 161·239·264행 주장과 연결되지 않는다. |

게이트 재판정: 오류 확인. 원문 내부 모순(루브릭 3-1). 63행은 "*Python으로* 직접 ncurses와 통합한 cgdb·dashboard가 더 안정적인 이유"라고 해 gdb-dashboard가 ncurses와 통합한다고 쓰고, 119행은 같은 gdb-dashboard를 두고 "ncurses를 쓰지 않으므로 화면 깨짐 없음"이라고 쓴다. 두 진술은 동시에 참일 수 없다. 63행은 85행(cgdb는 GDB를 서브프로세스로 띄우고 MI로 받아 자체 ncurses UI를 그림)과도 맞지 않는다. git log 10건에는 1차 자료 대조 커밋이 없다.

병합 대상·다음 조치: 전체 병합 대상 없음. 독립 질문을 유지하며 출처/실제 관측으로 보강.


### chapter11-practical-tips.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter11-practical-tips.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter11-practical-tips`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 17행 libstdc++ pretty-printer 자동 활성화 버전(>= 7.0)을 GDB 매뉴얼로 확인하지 않았다. - 85행 '-g3는 매크로·인라인 정보까지'는 dwarf-elf ch04 418행과 설명이 다르다(글 간 차이, GCC 매뉴얼로 확인 필요). - 113~116행 '(inlined by …)' 형식은 addr2line -i 출력에 가깝고 GDB bt 실제 출력과 다를 수 있다. - 142행 `set auto-load safe-path /` 권장, 196~205행 record-full 범위·제약, 219행 'x86 Linux 전용', 230행 'GDB 8.0+', 231행 kill -USR2, 232행 disable-randomization '기본 on'과 증상 설명의 어긋남을 확인하지 않았다. - 251행 'build-id로 매칭'과 248행 --add-gnu-debuglink(이름·CRC 기반) 예시는 다른 메커니즘이다. - 48행 print elements 출력은 가공 예시로 보이고, 71행 '해법 셋'과 실제 4개 나열은 산문 개수 실수다. 이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 이 글만의 것은 optimized out 변수를 디스어셈블로 찾아 레지스터를 직접 보는 절(87~99행), CI 사후 분석 batch 한 줄(188~192행), 증상별 함정 표(223~233행), 빌드 옵션 3단 정리(237~251행)다. 나머지는 STL 출력(17~28행), print elements·pretty(43~60행), .gdbinit 목록(124~161행), rr 명령(211~217행)처럼 매뉴얼 수준 팁 나열이다. 205행 '거의 모든 면에서 앞섭니다', 219행 '거의 유일한 도구'는 근거 없는 단정이다. |
| B | 10 | STL(15행) → optimized out(62행) → frame(109행) → .gdbinit(120행) → 한 줄 디버깅(172행) → record/rr(194·207행) → 함정(221행) → 빌드 옵션(235행) → 정리(263행)로 흐름은 끝까지 간다. 43·60·99·163행처럼 명사형 한 줄 설명이 많고, 제목의 LLDB는 163~170행 설정 4줄뿐이다. 85·219·230행 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 7 | 77~79행 gcc 옵션, 174~192행 gdb -batch, 246~248행 objcopy·strip은 재현 가능하다. 그러나 GDB·GCC·LLDB 버전과 배포판이 없고 예시 출력이 가공돼 있다(48행 '{0, 1, 2, ..., 19, ...}', 93~94행 '0x55...', 180행 '[자동으로 콜스택 출력]'). 17행 '>= 7.0', 230행 'GDB 8.0+'는 출처 없는 버전 수치라 C ≤ 8. |
| D | 7 | 양쪽 전문 읽기: .gdbinit124~161행↔ch09 676~700행,gcc-13경로/등록이 반복. rr207~219↔ch06 326~360,STL·optimized out15~30·62~71↔ch03 196~221·451~466,objcopy246~248↔ch01 228~234·ch12 399~401행이 반복된다. 함정표/레지스터직접보기 역할이 남아 D7 유지. 외부 비교범위는 제외. |
| E | 6 | 제목의 STL(15~60행), 최적화 코드(62~118행), 시간 역행(194~219행)은 다룬다. 그러나 제목 주어의 LLDB는 163~170행 4줄뿐이고, description(5행) '시리즈 마무리'와 13행 '마지막 장'은 seriesOrder 12가 있어 맞지 않는다. |
| F | 5 | Ch12 다음 안내와 Ch1~10 및 본문Ch9/4/6/5 대상metadata·해당절을 확인했다. 시리즈 자료를 해당공개글 입구로 연결하는 것은 허브가 아니라는 이유만으로 오류가 아니다. 다만 본문5·13·263·272행은 마지막장이라 하고286행은 다음Ch12를 적어 순서안내가 충돌한다. 이 실제 navigation 결함을 근거로 F5 유지; 일반시리즈명 링크 감점은 철회. |
| G | 2 | 209행 rr 링크가 rr 설명과 붙어 있고 292~294행 rr·GDB 매뉴얼·LLDB 튜토리얼 링크가 있지만 17·85·230행 주장에 절 단위로 연결되지 않는다. 버전 표기는 154행 gcc-13 경로뿐이다. |

게이트 재판정: 미검증. git log는 0a9dd7bc(slug 고정), 28524a9d(코드 블록 언어 태그), be973200(topic 메타데이터), a46f8b3e(톤 정리), ac24bb76(제목 변경), ffe6517b(주석 복원), f38a41a0(TikZ 변환), 400892d7(린터), 09a00a29(stub 배포), 60ec7a24(다이어그램)이다. GDB·GCC 매뉴얼·rr 문서와 대조한 기록이 없다. 71행 '해법 셋'과 4개 나열은 개수 표기 실수, 13·272행 '마지막 장'과 286행 Ch 12 안내 충돌은 내비게이션 결함이라 F에서 감점했다.

병합 대상·다음 조치: 후보는 .gdbinit 절(120~170행) ↔ `chapter09-python-scripting.md` 676~700행, STL·optimized out 절(15~118행) ↔ `chapter03-inspecting-state.md` 196~221·451~466행, rr 절(194~219행) ↔ `chapter06-multithread-multiprocess.md` 326~360행. 함정 표(223~233행)와 빌드 옵션 정리(235~251행)는 'gdb 실전 팁'이라는 독립 검색 의도가 있어 다음 조치는 보강이다(중복 절은 링크로 줄이고, 함정 표·레지스터 직접 보기를 버전·실제 출력으로 보강, '마지막 장' 문구와 '외부 자료' 라벨 정정). 보강 뒤에도 고유 분량이 남지 않으면 위 세 장으로 병합한다.  


### chapter12-dwarf.md

source_file: `src/content/blog/tools/debugging/gdb-lldb/chapter12-dwarf.md`

url: `https://hawk90.github.io/blog/tools/debugging/gdb-lldb/chapter12-dwarf`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 82·104행 main low_pc 0x401120과 306~307행 FDE start 0x401130·range 0x50은 같은 my_prog로 보기 어렵다. 오류 확인 근거로는 addr2line 두 건만 썼다. - 172~188행 line 바이트코드와 163~166행 표의 행 수 차이는 설명용 도식일 수 있어 오류로 올리지 않았다. - 441행 'DW_OP_entry_value로 GCC 8+'와 532행 'GCC 11+가 기본 DWARF 5'의 시점 차이, Clang 11+ 전환 버전은 1차 자료로 확인하지 않았다. - 357행 '.dwo 자동 검색', 473행 -fdiagnostics-color 필요 주장, 420행 debuginfod 부분 다운로드, 24행 '1992년부터', 527행 .debug_names 효과는 근거가 없다. - 338행 5~10배, 376행 20-40%, 392행 1/10, 324행 100KB는 출처와 환경이 없는 수치다. 이번 재검토는 명시한 primary 기능 및 내부 예시만 확인했으며 target 실행/전면 정확성 검증은 하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 섹션 표(48~62행), TAG 카탈로그(112~131행), DW_OP 표(245~257행), CFI 규칙(290~297행)은 DWARF 입문 자료의 표준 목록이고 14행이 스스로 '빠른 참조'라 밝힌다. 고유한 부분은 흔한 문제 진단(422~473행)과 inline 트리 예(549~573행) 정도다. |
| B | 12 | DIE → abbrev → .debug_line → .debug_loc·expression → CFI → 크기 대책 → 별도 debuginfo → 진단 → 도구 → DWARF 5 순서로 끝까지 간다(22~584행). Abbreviation 절(139~148행)은 '- ...'로 끝나는 불릿뿐이라 150행 '압축비가 매우 높음'을 받치지 못한다. 예시 출력 모순(196 대 163~166행, 199 대 204행)으로 AP-C-24에 따라 13 이하. |
| C | 5 | readelf·llvm-dwarfdump·addr2line·objcopy·dwz·pyelftools 명령(32~44, 158~205, 398~418, 477~520행)은 있으나 컴파일러·binutils 버전과 소스가 없다. 73행은 GCC 13.2.0 main.c, 97행은 clang 17 main.cpp이고, main 시작 주소는 82·104행 0x401120, 306행 FDE 0x401130이다. 172~188행 line 바이트코드의 DW_LNS_copy 4번과 163~166행 표 3행이 맞지 않는다. 338·376·392·324행 수치는 출처·환경이 없어 C ≤ 8이고, 예시 출력 모순으로 5로 낮췄다. |
| D | 4 | 양쪽 읽기: 이 글203행 addr2line/is_stmt211행↔dwarf-elf/chapter03-debug-line.md272~292행,constu42 270행↔chapter04-debug-loc.md182행,CFI rbp+16 311행↔chapter05-cfi-eh-frame.md102행,dwz -m379행·1/10 392행·objcopy399행↔chapter06-split-dwarf-tools.md106~131행이 같은명령·예를 반복한다. 포맷전체 개관 빠른참조 역할은 있으나 독립 깊이가 약해 D4 유지. |
| E | 7 | 제목의 '변수와 라인을 찾는 방식'에 .debug_info(64행~), .debug_line(154행~), .debug_loc(228행~)이 답하고 description의 항목은 모두 절이 있다. abbrev(135~152행)가 얇아 감점했다. |
| F | 6 | 마지막order12이며 Ch1/4/7/11 대상metadata·뒤 설명을 확인했다. Ch4가 backtrace와프레임이동을 다루므로 “CFI가풀어주는것”은 내부메커니즘과실제관찰의 관계 설명이다. 대상에CFI본문이없다고 틀린라벨로 확정하지 않는다. 다만 마지막독자 다음단계안내가 적고 긴카탈로그·불릿트리가읽기를끊어 F6, 템플릿이상의7은보류. |
| G | 2 | 본문 출처는 dwz 링크(376행)와 593~596행(DWARF5 PDF, llvm-dwarfdump, pyelftools, debuginfod)뿐이다. 441행 GCC 8+, 532행 GCC 11+/Clang 11+, 376행 20-40%에 연결된 출처가 아니고 표준 절 번호·도구 버전도 없다. |

게이트 재판정: 오류 확인 유지(좁힌 범위). 연속한 동일 addr2line 예198~204행에서 같은my_prog/0x401134에 -f -i는main만, -p추가시 foo→bar→main을 출력한다. 본문은 -p가 인라인체인조건이라고설명하지않고202행은 -i가체인이라고정의해 동일명령입력의예시출력이 정합적이지않다. 앞의 debug_line표와13/14행 비교는 별도예시/빌드가능성을배제못해 독립확정근거에서뺐다. 실제binutils/llvm실행과나머지DWARF공식대조는미완료.

병합 대상·다음 조치: 우선 조치가 먼저다. 163~166행 line 표와 196·199·204행 addr2line 출력, 82·104행과 306행 main 시작 주소를 실제 빌드 출력 하나로 다시 맞춘다. 점수 구간은 병합 검토이고 후보는 `src/content/blog/tools/debugging/dwarf-elf/chapter02-dwarf-overview.md`~`chapter06-split-dwarf-tools.md`다. 다음 조치는 보강이다. dwarf-elf 각 장으로 보내는 짧은 안내로 줄이고 GDB 사용자 관점의 진단 절(422~473행)과 inline 트리 예(549~573행)만 남겨 차별화한다. 리다이렉트 여부는 URL 영향 분석 뒤에 정한다.

## 원문 스냅샷과 검증 범위

아래 전문과 SHA-256은 이번 근거 읽기 스냅샷이다. 종료 시 동일 해시를 다시 확인했다. target/compiler 실행은 별도 실행 기록이 있는 경우만 인정하며, 실행하지 않은 예제나 공식 자료를 확인했다고 쓰지 않았다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| chapter03-inspecting-state.md | 1~497행 | 6b55975560c8114f92e65a0a8389a53faf5493c05ec93f8f0468a354b0ec91ed |
| chapter04-backtrace-frames.md | 1~448행 | 29b6e6dcdceee4052892a37a2c0d3efc6d1e27edffefd05a66550f416e08605e |
| chapter05-breakpoints-watchpoints.md | 1~487행 | 4fe0fd37ad4b8d75a0f59a057a5d588824c62d169f9e71bdea9b53720f860aae |
| chapter06-multithread-multiprocess.md | 1~444행 | 5914c361520892e0821668d4e003ee367d9b0e8d269cec4f45a45f042d412bac |
| chapter07-core-dump.md | 1~442행 | 56676627f18a0d685ee325403702cba54b8e4c6ee784ad70046d198c43bfb551 |
| chapter08-remote-debugging.md | 1~841행 | 352bae95a2262cc8056efe3d27a92eb0e9704cd149efb1df173c27cd01749fe5 |
| chapter09-python-scripting.md | 1~756행 | 1a8e0da6c3128e74ebf5f077a7ce45ff143c29c77a78add8d4de9c441b1d71cd |
| chapter10-tui-frontends.md | 1~379행 | 4da70acad5c4ae258864c7ba48f198ff7bd57fb5311945f4a66e2cfd9b1715ea |
| chapter11-practical-tips.md | 1~294행 | 6ae07a245e365087748681e1c5f4c94fee34b879f2792fd47a2f69ebebec25a9 |
| chapter12-dwarf.md | 1~596행 | 72ab51105351c71bb102e2b7fe32c8ded5dfa236de13d8b3360871e41c783dca |
