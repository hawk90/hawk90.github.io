# 공개 글 AdSense 평가 — 루프 26

> 대상: 공개 글 10편 (GDB and LLDB, `seriesOrder` 3~12)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 스물여섯 번째 루프다. 대상은 `src/content/blog/tools/debugging/gdb-lldb/`의 chapter03~chapter12, 곧 GDB and LLDB 시리즈 3편부터 마지막 12편까지다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter03-inspecting-state.md` | 10 | 10 | 6 | 10 | 7 | 7 | 2 | **52** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `chapter04-backtrace-frames.md` | 11 | 10 | 6 | 10 | 6 | 7 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter05-breakpoints-watchpoints.md` | 9 | 11 | 7 | 9 | 5 | 7 | 2 | **50** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter06-multithread-multiprocess.md` | 14 | 12 | 7 | 10 | 7 | 4 | 2 | **56** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter07-core-dump.md` | 10 | 12 | 7 | 3 | 6 | 5 | 2 | **45** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter08-remote-debugging.md` | 12 | 13 | 8 | 5 | 7 | 7 | 3 | **55** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter09-python-scripting.md` | 10 | 12 | 7 | 3 | 7 | 6 | 2 | **47** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `chapter10-tui-frontends.md` | 7 | 11 | 5 | 3 | 6 | 4 | 2 | **38** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `chapter11-practical-tips.md` | 11 | 10 | 7 | 7 | 6 | 5 | 2 | **48** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `chapter12-dwarf.md` | 10 | 12 | 5 | 4 | 7 | 4 | 2 | **44** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |

평균 48.7점(10편, 합 487점), 범위 38~56점이다. 판정은 우선 조치 4편, 병합 검토 6편이고 유지·검증 대기·보강·제외 검토는 없다. 점수 구간으로는 ch10(38점)만 제외 검토이고 나머지 9편은 병합 검토(40~59)다. 오류 확인 4건(ch04·ch08·ch10·ch12) 때문에 4편이 우선 조치로 올라갔다. ch04는 GDB 매뉴얼 두 절을 직접 열어 확인한 1차 자료 근거와 내부 모순을 함께 썼고, ch08·ch10·ch12는 원문 내부 모순·산술 불일치다. 10편 모두 git log에 1차 자료 대조 커밋이 없어 '검증됨'은 0편이다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다. ch07·ch08·ch09·ch10·ch12가 Postmortem·Embedded Debugging·GDB Extension·DWARF-ELF 시리즈와 문단 단위로 겹치는 것은 같은 사이트 안 축약본이라 글 단위 P0가 아니라 D 감점과 시리즈 단위 중복 점검으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `chapter03-inspecting-state.md` | 52 | 52 | 0 | 없음 |
| `chapter04-backtrace-frames.md` | 53 | 52 | -1 | 없음 |
| `chapter05-breakpoints-watchpoints.md` | 50 | 50 | 0 | 없음 |
| `chapter06-multithread-multiprocess.md` | 56 | 56 | 0 | 없음 |
| `chapter07-core-dump.md` | 45 | 45 | 0 | 없음 |
| `chapter08-remote-debugging.md` | 55 | 55 | 0 | 없음 |
| `chapter09-python-scripting.md` | 47 | 47 | 0 | 없음 |
| `chapter10-tui-frontends.md` | 38 | 38 | 0 | 없음 |
| `chapter11-practical-tips.md` | 48 | 48 | 0 | 없음 |
| `chapter12-dwarf.md` | 45 | 44 | -1 | 없음 |

- 추가한 오류 확인(ch04): 115행 "`bt`에서 *번호가 큰 쪽이 깊은 호출*"은 31~34행 출력(#0 deepest가 가장 깊고 #3 main이 바깥), 37행 'deeper→deep→main 순', 같은 115행 'up은 스택 깊이 줄임 … up은 번호 증가'와 동시에 참일 수 없다. GDB 매뉴얼 Selecting a Frame('up n … toward the outermost frame, to higher frame numbers')과도 반대다. 평가자는 skip 오류만 잡았고, 이 건을 더해 B 11→10, 합계 53→52로 내렸다. 판정(우선 조치)은 그대로다.
- 추가한 오류 확인(ch12): 평가자는 미검증으로 두었으나 루브릭 3-1의 '예시 출력과 같은 글이 밝힌 사실·산술이 동시에 참일 수 없음'에 해당하는 두 건을 찾았다. (1) 163~166행 .debug_line 표(0x401131→14행, 0x40113e→16행)대로라면 0x401134는 14행인데 195~196행 addr2line 출력은 main.cpp:13이다. (2) 198~200행 `-f -i 0x401134`는 main만 출력하는데 같은 주소에 -p만 더한 203~204행은 foo→bar→main 3단 체인을 출력한다. factcheck 미검증→오류 확인, 판정 병합 검토→우선 조치, C 6→5, 합계 45→44.
- 기각한 오류 확인은 없다. ch06 227행 데드락 산문과 210~225행 콜스택, ch07 304·309·326행 coredump_filter, ch08 717행 RTT 'J-Link 종속'은 모두 '~라면' 조건문이라 동시 거짓으로 단정할 수 없어 평가자와 같이 uncertainties에 두었다.
- ch11 B 근거: 142행 safe-path 위험과 196~205행 record-full 한계 누락은 1차 자료 위치 없이 '빠진 한계'로 감점하지 않는다(AP-C-24/AP-C-31)는 규칙에 따라 감점 사유에서 빼고 uncertainties로 옮겼다. 명사형 한 줄 설명과 LLDB 부족을 근거로 같은 10점을 유지했다.
- ch07 factcheck_basis: 평가자는 커밋 5건만 적었으나 실제 git log는 9건이다(09a00a29·c99833a1·2907896a·60ec7a24 누락). 모두 형식·일괄 커밋이라 판정은 그대로다.
- ch03 F: 297행이 Ch 9를 가리키는 것을 '어긋남'으로 본 평가는 뺐다(Ch 9가 스크립팅 장이라 맞음). 대신 224행 pretty printer 절에 Ch 9 안내가 없다는 점을 넣었다. 점수 7 유지.
- 줄 번호 보정(점수 영향 없음): ch03 D(ch02 248~249·306행, postmortem ch03 236~239행, ch09 392~415행), ch05 D(ch02 tbreak 100·rbreak 111·disable/enable 123~124행, recipes part10-03·qemu-riscv ch03 추가), ch07 D(postmortem ch02 13·419·433·437행), ch08 D(embedded ch02 210~218행, ch03 288·333행, ch06 273행), ch09 D(gdb-extension 대응 줄 경계, ch10 85행), ch11 D(gdb-extension ch03·modern-recipes part3-09는 줄 비교를 하지 않아 목록에서 뺌), ch12 D(dwarf-elf ch03 282·290·292행, ch02 37·39행).
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `chapter03-inspecting-state.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- 파일 결과는 0a9dd7bc(slug 고정), 28524a9d(코드 블록 언어 태그), 07cc1988(관련 항목 추가), be973200(topic 메타데이터), ac24bb76(제목 변경), 400892d7(linter 일괄), 60ec7a24(TikZ) 7개뿐이다. GDB 매뉴얼·LLDB 문서 같은 1차 자료와 이 글의 명령·출력을 대조했다는 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 대부분 GDB 매뉴얼의 명령 목록을 옮긴 수준이다(58~80행 x 형식·단위 표, 136~155행 info registers 출력, 243~261행 STL 출력 목록). 이 글에만 있는 것은 ptype /o로 offset을 보는 예(114~124행), while 루프로 연결 리스트를 순회하는 예(299~327행), set print object on과 명시적 다운캐스트 비교(349~364행), print free(my_ptr) 부작용 경고(440~447행) 정도다. 선택 기준·실패 사례가 없고, 270행 'GDB 버전에 따라 지원이 다름', 239행 '일부 형식이 살짝 다를 수 있음', 461행 '레지스터에 살아 있을 수 있음'은 구체 주장 대신 쓴 완곡 표현이다. |
| B | 10 | 도입 불릿(17~21행)의 다섯 주제는 모두 절이 있고 정리(468~478행)도 있다. 그러나 224행은 pretty printer가 없을 때 '설치 또는 GDB 설정 필요'로 끝나고 방법이 없다. compare-sections(368~374행)는 명령 한 줄과 설명 한 줄뿐이고, optimized out 절(451~464행)은 같은 주제를 더 다루는 Ch 11로 안내하지 않는다. 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13이다. |
| C | 6 | 명령과 예상 출력 transcript는 많다(41~56, 97~121, 283~308, 380~398행). 그러나 GDB·LLDB 버전, 컴파일러·옵션, OS·아키텍처가 하나도 없어 C ≤ 8이다. 151행 rip 0x55555555515f <main+22>는 183행 main 시작 0x55555555513f와 차이가 0x20이고, 53행은 비PIE 주소 0x401234다. 382행은 0x7fff1234에서 0x12345678을 찾았다고 하지만 47행은 같은 주소 값을 0x6c6c6548로 보여 준다. 검증 절차가 없어 4~7 구간이다. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter02-basic-commands.md` 248~249행(print *arr@10, p *(int*)0x7fff1234@5)·306행(info registers) ↔ 이 글 432~447·134~169행. `chapter11-practical-tips.md` 62~95행 'value optimized out' ↔ 451~464행. `chapter09-python-scripting.md` 392~415행과 `gdb-extension/chapter03-pretty-printers.md` 491~500행 ↔ 211~224행. 다른 시리즈 `postmortem/chapter03-gdb-core-analysis.md` 236~239행 x/16xb·x/s 목록 ↔ 41~55행, 같은 글 409행 set print object on ↔ 350행. '조사 명령 모음'이라는 시리즈 안 역할은 구별돼 10~14 구간 하단이다. |
| E | 7 | 제목의 변수·메모리·레지스터·STL이 모두 절로 있다(27·95·134·196행). 그러나 '추적'에 비해 본문은 명령 소개와 출력 예 위주이고, LLDB는 절마다 한두 줄(84~89, 126~130, 171~176행)뿐이다. |
| F | 7 | 15행이 전제 장 Ch 2를 링크한다. 482행 다음 장 'Ch 4: Backtrace와 프레임'은 seriesOrder 4 `chapter04-backtrace-frames.md`와 맞다. 492~496행 관련 항목(ch02, ch04, ch09, gdb-extension ch03, memory ch01)은 대상을 열어 라벨과 맞음을 확인했다. 다만 optimized out 절(451~464행)과 pretty printer 미적용 절(224행)이 Ch 11·Ch 9로 안내하지 않는다. audit:reading·폰 폭 확인을 하지 않아 8을 넘기지 않았다. |
| G | 2 | 본문 출처는 486~488·497행(GDB Examining Memory, LLDB tutorial, GDB STLSupport wiki, GDB 매뉴얼)뿐이고 글 끝 일반 링크라 특정 주장과 연결되지 않는다. GDB·LLDB·libstdc++ 버전 표기도 없다. |

uncertainties:
- 151행 rip <main+22>와 183행 main 시작 주소 차이(32), 53행 다른 바이너리 주소는 예시가 서로 다른 실행에서 나왔을 수 있어 오류 확인으로 올리지 않았다.
- 382행 0x12345678과 47행 같은 주소 값 0x6c6c6548은 절이 다른 예시라 모순으로 단정하지 않았다.
- 166행 print $rax 출력 16진 표기와 138행 natural 열 10진 표기의 차이를 GDB 매뉴얼로 확인하지 않았다.
- 374행 compare-sections를 '코어 덤프와 실행 파일 .text 비교'로 설명한 것은 매뉴얼(원격 target 메모리 대 실행 파일)과 다를 수 있으나 1차 자료로 확인하지 않았다.
- 406행 print "hello"[2] 출력 0x6c 'l'이 GDB 기본 표기(108 'l')와 맞는지 미확인.
- 458행 '-O2 이상에서' 변수 제거 주장은 -O1에서도 생길 수 있다는 기억에 근거한 의심이다.
- 87·397행 LLDB memory read -fc alias 표현과 memory find -s 문법, 260행 unique_ptr printer 출력, 487행 LLDB tutorial 앵커를 확인하지 않았다.

병합 대상: 병합 대상 없음. 일부 절이 ch02 248~249·306행, ch11 62~95행, postmortem ch03 236~239·409행과 겹치지만 시리즈 3장으로서 메모리·타입·레지스터 조사라는 독립 검색 의도가 있다. 다음 조치는 보강이다(451~464행은 줄이고 Ch 11로 연결, 버전·환경을 밝히고 한 세션의 일관된 출력으로 재작성, 224행 해결 절차를 Ch 9·gdb-extension Ch 3로 연결, 명령별 주장에 GDB 매뉴얼 절 출처).

### `chapter04-backtrace-frames.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log에는 형식 커밋(0a9dd7bc, 28524a9d, 07cc1988 등)뿐이다. 평가 중 GDB 매뉴얼 두 절을 직접 열었다. (1) 'Skipping Over Functions and Files': skip은 'skip a function ... when stepping'이고 이름 패턴은 -rfunction regexp이며 backtrace는 언급하지 않는다. 본문 299행 "`bt`에서 pthread_* 와 __libc_* 프레임을 숨김"과 428행 "`skip function` — 외부 라이브러리 프레임 숨김"은 매뉴얼과 맞지 않는다. (2) 'Selecting a Frame': 'up n … advances toward the outermost frame, to higher frame numbers'. 본문 115행 "`bt`에서 *번호가 큰 쪽이 깊은 호출*"은 매뉴얼과 반대이고, 글 안에서도 31~34행 출력(#0 deepest → #3 main)·37행 'deeper→deep→main 순'·같은 115행 'up은 번호 증가'와 동시에 참일 수 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | bt·frame·up·down·info frame·thread apply all bt(41~150, 240~265행)는 매뉴얼 Backtrace·Selection 절 범위의 명령 소개다. 이 글만의 부분은 인라인 프레임(153~179행), tail call로 사라지는 helper(193~213행), 깨진 스택(271~288행), 시나리오 3개(332~391행)다. 시나리오 3(376~391행)은 결론이 없고, 181~189행 'set print frame-info' 절은 그 명령을 실행하지 않는다. 164·195·230행 완곡 표현이 구체 조건을 대신한다. |
| B | 10 | 도입 예(17~37행) → 명령 변형 → 프레임 이동 → 함정 → 정리(420~430행)로 기본 흐름은 있다. 그러나 115행 프레임 번호 방향 설명이 31~34행 예와 매뉴얼에 반대이고, 299·428행 skip 설명이 매뉴얼과 맞지 않는다. 284행 'bt no-filters로 깨진 자리 통과'는 근거가 없고 시나리오 3은 결론이 없다. AP-C-24상 B ≤ 13, 핵심 개념 오류 2건과 결론 누락으로 10. |
| C | 6 | 명령과 출력 예(25~35, 62~73, 125~135, 313~324행)는 있으나 GDB·LLDB 버전, 컴파일러·옵션, OS가 없다. 출력이 '0x...'(185~186행), '#0~99'(365행), 'Thread 4: 멈춰 있음'(382행)처럼 손으로 만든 형태다. 128행 saved rip 0x...145와 32행 #1 0x...140이 다르다. 412~414행 디버그 심볼 설치는 결과 확인이 없다. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter03-inspecting-state.md`(이전 편), `chapter05-breakpoints-watchpoints.md`(다음 편, 주제 다름), `chapter06-multithread-multiprocess.md` 117~125행 ↔ 이 글 240~265·376~391행, `chapter07-core-dump.md` 217~238행 ↔ 311~328행, `chapter11-practical-tips.md` 111~115행 ↔ 164~172행. 다른 시리즈 `postmortem/chapter03-gdb-core-analysis.md` 57~67·101~111행 ↔ 30~37·240~259행. `dwarf-elf/chapter05-cfi-eh-frame.md`는 unwinding 내부라 역할이 다르다. 라이브 프로세스 call stack 탐색 입문이라는 역할이 남아 10. |
| E | 6 | 제목·description의 bt·frame·up·down, 프레임 안 변수, 인라인은 41~119, 92~104, 153~179행에서 다룬다. 그러나 '분석'에 비해 명령 소개 위주이고 LLDB는 몇 줄뿐이며(52~58, 99~104, 146~149, 261~265행), 제목 핵심인 프레임 이동 방향 설명(115행)이 틀렸다. |
| F | 7 | 434행 다음 장 Ch 5는 seriesOrder 5 `chapter05-breakpoints-watchpoints.md`와 맞다. 443~447행 관련 항목(ch03, ch05, ch07, dwarf-elf ch05, postmortem ch03)을 열어 라벨·제목·draft:false를 확인했다. 본문 267행 Ch 6, 328행 Ch 7도 맞다. 전제 지식 안내가 없고 audit:reading·폰 폭 확인을 하지 않아 9 이상은 아니다. |
| G | 2 | 438~439행 GDB Backtrace 매뉴얼·LLDB tutorial 링크는 본문 주장과 연결되지 않은 목록이고, 172행 'GDB 7+' 외 버전 표기가 없다. 448행 DWARF 규격 링크도 본문 주장과 무관하다. |

uncertainties:
- 128행 info frame saved rip과 32행 bt #1 주소 차이: caller 프레임 pc 표시 규칙을 매뉴얼로 확인하지 않았다.
- 284행 'bt no-filters — 가끔 깨진 자리 통과'는 매뉴얼상 Python frame filter를 끄는 옵션일 뿐이라 근거 없는 주장 후보다.
- 295~296행 `skip function pthread_*`의 linespec 해석을 실행 확인하지 않았다.
- 156행 C의 `inline int small()`은 -O0에서 링크 오류가 날 수 있다(C99 inline 규칙 미확인).
- 172행 'GDB 7+' 버전 기준, 175~176행 'Inlined frame, no frame info.' 출력 문구, 410행 `libstdc++6-dbgsym` 패키지 조건을 확인하지 않았다.
- `chapter11-practical-tips.md` 111~115행은 인라인을 한 줄 '(inlined by ...)'로, 이 글 164~172행은 별도 프레임으로 보여 준다. 다른 글과의 모순이라 1차 자료로 정해야 한다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간 기준 후보는 `postmortem/chapter03-gdb-core-analysis.md`(bt·thread apply all bt 중복)지만 라이브 디버깅의 프레임 탐색이라는 독립 검색 의도가 있어 차별화 보강이 맞다. 115행을 매뉴얼 기준으로, 299·428행 skip 설명을 'step 시에만 건너뜀, 이름 패턴은 -rfunction'으로 고치고, 284행 주장 삭제, 시나리오 3 결론을 보강한다.

### `chapter05-breakpoints-watchpoints.md` — 50점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(URL 고정), 28524a9d(코드 블록 언어 태그), 07cc1988(관련 항목 추가), be973200(topic 메타데이터), ac24bb76(제목 변경), c1e04375(text 블록 변환), 400892d7(린터 일괄), 60ec7a24(다이어그램)뿐이다. GDB 매뉴얼·LLDB 문서와 대조한 커밋은 없다. 원문 안에서 동시에 참일 수 없는 두 기술 진술은 찾지 못했다(38행 b 4는 스니펫 행 번호가 파일 행 번호라는 보장이 없어 uncertainties).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 조건부 break(19~53행), commands(55~92행), ignore(94~103행), tbreak·rbreak(107~131행), watch 3종(135~186행), catch(238~287행), enable count(291~301행), hbreak(305~318행), handle(367~389행)은 매뉴얼 Breakpoints 장 명령을 차례로 옮긴 목록이다. 고유한 것은 commands+silent+printf 로그(75~92행)와 balance가 -1이 되는 자리를 watch로 찾는 예(146~172행) 정도다. 172행 '며칠 걸릴 사고를 몇 분 만에'는 근거 없는 수사다. |
| B | 11 | 조건부 break → watchpoint → catchpoint → 활성화 제어 → hbreak → 시그널 → pending → 시나리오 → 정리(459~468행)로 흐름은 끝난다. LLDB 대응은 one-shot(116~120행)과 예외(271~275행)뿐이고 LLDB watchpoint가 없다. commands(55~92 vs 322~363행), catch throw(240~268 vs 445~455행)가 두 번 나온다. 정확성 불확실이 열려 있어 13 이하. |
| C | 7 | GDB·LLDB 버전, 아키텍처, 컴파일 옵션이 없다. 세션 출력(154~170·252~263·279~285행)은 주소를 0x...로 지운 설명용이고 대상 소스가 없다. 195행 'x86은 4개, ARM은 더 많음', 211행 '수십~수백× 느림', 316행 'x86은 4개'는 출처·환경 없는 수치라 C ≤ 8. 38행 b 4 if ...는 30~34행 스니펫의 닫는 중괄호를 가리킨다. |
| D | 9 | 비교한 글: 같은 시리즈 ch02·ch04·ch06·ch09·ch11, 다른 시리즈 `gdb-extension/chapter02-commands-events.md`, `embedded/chapter02-jtag-swd-coresight.md`, `embedded/chapter01-rsp-protocol.md`, `tools/emulation/qemu-riscv/chapter03-gdb-debugging.md`, `embedded/modern-recipes/part10-03-gdb-remote-debug.md`. ch02 90~92행 조건부 break ↔ 이 글 22~24행, ch02 100·111·123~124행 ↔ 110·125·294~295행. recipes part10-03 77~79·101~107·310행 ↔ 176~184·155~169·227행. qemu-riscv ch03 102~104·207~209행 ↔ 305~318·176~184행. gdb-extension ch02 324~338행, embedded ch02 286~301행, rsp ch01 213~215행은 층위가 다르다. 5~9 구간. |
| E | 5 | 제목·description의 Conditional·Hardware·Catchpoint·watchpoint는 19~53·135~234·238~287·305~318행에서 다룬다. 그러나 제목의 '분석'과 달리 명령 목록과 한두 문장 설명 수준이라 루브릭 E 주석에 따라 3~5점이다. LLDB 쪽 watchpoint·hardware breakpoint가 없다. |
| F | 7 | 15행이 전제 장 Ch 2를 링크한다. 472행 다음 장 Ch 6은 seriesOrder 6 `chapter06-multithread-multiprocess.md`와 맞다. 482~486행 대상(ch04, ch06, ch09, gdb-extension ch02, embedded ch02)을 열어 라벨과 맞음을 확인했다. 395~401행 gdb 세션에 c 태그가 붙었고 같은 절이 두 번 나와 흐름이 끊긴다. |
| G | 2 | 476~478행 GDB 매뉴얼·LLDB tutorial 링크는 본문 주장과 연결되지 않고 버전·아키텍처 표기가 없다. 195·316행 디버그 레지스터 개수, 211행 software watchpoint 비용에 출처가 없다. |

uncertainties:
- 195행 'x86은 4개, ARM은 더 많음': embedded ch02 194·301행은 Cortex-M DWT 4개, recipes part10-03 113행은 core별로 다르다고 적는다. ARM ARM으로 확인하지 않았다(다른 글과의 모순).
- 211행 software watchpoint '수십~수백× 느림'은 출처·환경 없는 수치다.
- 318행 '매핑된 라이브러리 부분에서는 hbreak 필수'는 ptrace software breakpoint 동작과 다를 수 있으나 확인하지 않았다.
- 244·280~284행 catch syscall open은 최근 glibc에서 openat으로 처리돼 걸리지 않을 수 있다.
- 38행 b 4가 의도한 행(3행)과 다른 듯하나 스니펫 행 번호 전제가 없어 오류 확인에 넣지 않았다.
- 198~206행 watch (long array)[100]와 software watchpoint 대체·수동 강제 흐름, 103행 ignore count와 if i == 1000의 동작 차이를 GDB 문서로 확인하지 않았다.

병합 대상: 병합 대상 없음. ch02 90~124행과 일부 겹치지만 breakpoint·watchpoint·catchpoint는 따로 검색되는 주제다. 다음 조치는 보강이다(ch02와 겹치는 부분을 한쪽으로 모음, 글 안 반복 절 322~363·445~455행 정리, LLDB watchpoint·hardware breakpoint 대응 추가, 디버그 레지스터 개수와 software watchpoint 비용을 1차 자료로 확인해 고치거나 삭제).

### `chapter06-multithread-multiprocess.md` — 56점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(URL 고정), be973200(topic 메타데이터), ac24bb76(제목 변경), 400892d7(linter 일괄), 09a00a29(stub·TikZ 일괄), c99833a1(callout 변환), 2907896a(Deep dive callout 추가), 60ec7a24(다이어그램)뿐이다. GDB 매뉴얼·rr 문서·glibc 소스·man page와 대조한 커밋은 없다. 227행 산문과 210~225행 콜스택은 어긋나 보이지만 '~라면' 가정문이라 오류 확인으로 올리지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 이 글만의 것은 clone 플래그(26~40행)를 info threads의 두 ID 읽는 법(42~50행)으로 잇는 부분, `print *mutex`로 `__owner`를 LWP로 읽는 절차(196~204행), 같은 스택끼리 묶는 Python 요약 스크립트(165~178행), GDB·TSan·Helgrind·rr 분담 표(396~401행)다. non-stop(54~69행), scheduler-locking(244~255행), follow-fork(273~296행)는 명령을 한두 문장으로 옮긴 수준이고, 56행 '모드가 다릅니다', 259·416행 근거 없는 비교가 있다. 13~19 구간 하단. |
| B | 12 | 흐름은 끝까지 간다(정리 418~429행). 그러나 227행 산문은 210~225행 콜스택(Logger::Write는 T3에만 있음)과 맞지 않고 232행도 T2에서 cache_mutex_를 찍는다. 236행 '같은 주소가 보이면 데드락 확정'은 사이클 확인이 없다. 142행 '두 방법' 뒤에 세 가지(144·152·163행)를 나열한다. 367행 `while ! rr record ./my_test`는 성공할 때 멈추는데 369행은 '재현될 때까지 반복'이라 쓴다. AP-C-24로 13 이하. |
| C | 7 | 267행 '수 마이크로초 ~ 밀리초', 340행 '5-10배 느림', 369행 '30분 안에'는 출처·환경 없는 수치라 C ≤ 8. 명령과 예시 출력(73~80, 196~202, 289~294, 342~361행)은 있으나 대상 프로그램, GDB·LLDB·glibc·rr 버전이 없다. 201행 `__owner = 12346`은 thread 2 자신의 LWP(77행)라 예시끼리 맞지 않는다. |
| D | 10 | 같은 시리즈 인접 ch05·ch07과는 역할이 겹치지 않는다. `chapter04-backtrace-frames.md` 375~390행 데드락 시나리오 ↔ 이 글 206~236행, `chapter11-practical-tips.md` 207~218행 rr 반복 ↔ 342~361행, `chapter02-basic-commands.md` 416행 follow-fork-mode ↔ 273~296행. 다른 시리즈 `postmortem/chapter03-gdb-core-analysis.md` 310~320행 같은 데드락 패턴. `sanitizers/chapter04-tsan.md`, `valgrind/chapter04-helgrind-drd.md`와는 392~401행 표로 역할을 나눈다. draft인 concurrency/chapter01~05가 이 글 H2를 나눠 다룬다. 10~14 구간 하단. |
| E | 7 | 제목의 Non-Stop(54~69행), Scheduler-Locking(240~269행), Fork(271~324행)와 description의 thread apply·follow-fork·rr(326~388행)을 다룬다. Non-Stop은 세 단락과 가상 출력 하나뿐이고 description의 'process apply'는 본문에 명령으로 나오지 않는다. |
| F | 4 | 433행 다음 장 Ch 7은 seriesOrder 7 `chapter07-core-dump.md`와 맞다. 437·438·440행 라벨도 맞다. 그러나 439행 'Sanitizers Ch 4: TSan / MSan'의 대상 `sanitizers/chapter04-tsan.md`에는 MSan이 0건이라 라벨 오류로 5 이하. 14행 Deep dive callout은 링크 없이 draft:true뿐인 Concurrency Debugging 시리즈로 보내 한 점 더 낮췄다. |
| G | 2 | 본문 출처는 330행 rr-project.org, 384행 Microsoft TTD 문서, 441~444행 rr·Pernosco·`man 2 clone`·`man 7 futex`다. GDB·LLDB·glibc·rr 버전이 없고 76·212행 glibc 파일:줄 인용도 판이 없다. 255·322·377행처럼 버전에 따라 달라지는 주장에 매뉴얼 위치가 없다. |

uncertainties:
- 227행 T2·T3 락 관계가 210~225행 콜스택과 반대로 보이지만 가정문이라 오류 확인으로 올리지 않았다.
- 201행 `__owner = 12346`은 197행 thread 2 자신의 LWP(77행)이고, 77행 thread 2는 fetch_add에 있어 196행 예시와 상태가 다르다.
- 367행 rr 루프는 성공 시 멈춰 369행 설명과 반대일 수 있다. rr record의 종료 코드 전달을 확인하지 않았다.
- 236행 같은 mutex 주소만으로는 대기 사이클이 확인되지 않는다.
- 322행 follow-exec-mode 기본값 `new`, 377행 rr ARM 미지원, 305행 fork의 clone 플래그, 238행 `clang-analyzer-alpha.deadcode.*`, 255행 scheduler-locking replay, 56·257행 ptrace 내부 동작, 413·414·384행 LLDB·macOS 대응은 1차 자료로 확인하지 않았다.
- 267·340·369행 수치는 출처·환경이 없다.

병합 대상: 병합 대상 없음. 같은 질문을 나눠 답하는 concurrency/chapter01~05는 모두 draft라 공개 URL이 아니다. 다음 조치는 보강이다(227행을 콜스택과 맞추기, 201행 예시 수정, 367~369행 루프 조건 정리, 142행 개수 수정, GDB·rr 버전과 매뉴얼 출처, 439행 라벨과 14행 draft 시리즈 안내 수정). Concurrency 시리즈 공개 때 병합 여부를 다시 판단한다.

### `chapter07-core-dump.md` — 45점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 9건이다(0a9dd7bc slug 고정, 2343c401 태그 정리, be973200 topic 메타데이터, ac24bb76 제목 일괄 변경, 400892d7 linter, 09a00a29 stub 일괄·Mermaid→TikZ, c99833a1 callout 형식, 2907896a gdb-lldb polish, 60ec7a24 TikZ). 어느 것도 man 5 core·proc 문서·systemd-coredump(8)·GDB 매뉴얼과 본문 주장을 대조했다고 적지 않았다. 원문 안에서 동시에 참일 수 없는 진술도 확정하지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 생성 조건(22~38행), ulimit(40~62행), core_pattern 표(82~94행), Note 타입 표(128~136행), si_code 표(261~266행), coredump_filter 비트 표(315~324행)는 man 5 core·proc(5) 수준의 목록이다. 이 글다운 해석은 %p/%P와 PID namespace(96행), 파이프 핸들러 함정(100행), NT_FILE과 build-id 매칭(162행) 정도인데 postmortem ch01 144~170행에도 있다. 297·382·249행은 근거 없는 일반론이다. |
| B | 12 | 생성 조건 → ELF 구조 → coredumpctl → gdb 열기(217~249행) → siginfo → debuginfo → coredump_filter → macOS → minidump → Sanitizer → 운영 절차(395~401행) → 정리(416~427행)로 흐름은 끝까지 간다. 제목의 gcore는 본문 0건, description의 'gdb -c'도 예시가 없다. coredump_filter·si_code 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 7 | readelf 출력(107~160행), coredumpctl info(183~199행), coredump.conf(206~215행), 배치 분석 루프(405~411행)가 있지만 커널·systemd·GDB 버전과 배포판이 없고 출력은 '...'로 잘렸다. '수십 GB'(301행), '수 MB'(371행)는 출처 없는 수치라 C ≤ 8. 309행은 기본값 0x33을 그대로 써 넣으며 'file-backed 제외' 설정처럼 소개해 관찰되는 변화가 없다. |
| D | 3 | 비교한 글: 같은 시리즈 `chapter06-multithread-multiprocess.md`(겹침은 433행 예고문뿐), `chapter08-remote-debugging.md`(겹침 없음). 다른 시리즈: 98~100행 ↔ `postmortem/chapter01-core-generation.md` 155~170행, 202행 ↔ chapter01 239행(거의 같은 문장), 299~326행 ↔ chapter01 273~298행, 380~393행 ↔ chapter01 353~370행, 104행 ↔ `chapter02-elf-core-format.md` 13행, 343·374·378행 ↔ chapter02 419·433·437행, 254~266행 ↔ `chapter03-gdb-core-analysis.md` 116~127행, 287~297행 ↔ `chapter04-debuginfod-minidump-automation.md` 16행 이후. 같은 질문을 같은 예제로 나눠 답해 1~4 구간. |
| E | 6 | 제목 키워드 gcore·coredumpctl·디버거 활용 중 gcore가 본문에 없다. description의 ulimit·core_pattern·ELF core·NT_PRSTATUS·systemd-coredump는 40~215행에서 다루지만 'gdb -c' 예시가 없다. 14행은 '빠른 참조', 제목은 '분석 기법'이라 역할 표기가 어긋난다. |
| F | 5 | 431행 다음 장 Ch 8은 seriesOrder 8 `chapter08-remote-debugging.md`와 맞다. 435~437행 라벨도 맞다. 438행 'Sanitizers Ch 1: AddressSanitizer'는 `sanitizers/chapter02-asan-ubsan.md`(seriesOrder 2)를 가리켜 번호가 틀렸다. 틀린 관련 링크 규칙으로 F ≤ 5. |
| G | 2 | 439~442행 man 5 core·man 5 elf·systemd-coredump(8)·Breakpad 링크는 목록일 뿐 304·100·265~266·393행 주장과 연결되지 않는다. 버전·확인 날짜가 없고, 주장에 붙은 출처는 26행 'man 7 signal' 하나다. |

uncertainties:
- 304·309·326·399행 coredump_filter: 기본값 0x33이면 bit 2가 이미 꺼져 있는데 309행은 같은 값을 'file-backed 제외' 설정으로 쓰고 326·399행은 bit 2를 끄면 코어가 준다고 한다. 304행 괄호는 bit 4를 빠뜨렸다. 조건문이라 오류 확인으로 올리지 않았고 kernel proc.rst로 확인이 필요하다.
- 100행 core_pipe_limit을 '시간 제한'으로 설명하나 postmortem ch01 166행은 동시 core 수 제한으로 설명한다(다른 글과의 모순).
- 265~266행 SEGV_BNDERR=6, SEGV_PKUERR=7은 uapi siginfo.h에서 3·4로 기억하지만 1차 자료를 열지 못했다. postmortem ch03 127행도 같은 값.
- 166행 'Ubuntu 22.04+' systemd-coredump 기본 여부, 235행 info signal 설명, 393행 coredump_dump_full_shadow, 408행 file 출력 파싱, 330행 SIP, 339행 kern.corefile 기본값을 확인하지 않았다.

병합 대상: `src/content/blog/tools/debugging/postmortem/chapter01-core-generation.md`, `chapter02-elf-core-format.md`, `chapter03-gdb-core-analysis.md`. 이 글에만 있는 내용이 거의 없어 기본 방향은 병합이다. GDB 시리즈 7편 자리를 유지해야 한다면 대안은 GDB/LLDB 명령 중심(gcore·generate-core-file·gdb -c·lldb process save-core)의 짧은 빠른 참조로 좁히고 나머지는 Postmortem 링크로 대체하는 차별화 보강이다. URL 처리는 시리즈 전체 검토 뒤 정한다.

### `chapter08-remote-debugging.md` — 55점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건(루브릭 3-1). (1) 342행 '[5:2] reserved'인데 343행 '[3] C_MASKINTS', 344행 '[2] C_STEP'이 같은 범위 안 비트를 정의한다. (2) 422~425행 섹션 크기 0x1c0+0x9d20+0x4c0+0x140 = 0xa4e0 = 42208바이트이고 LMA 0x8009ee0, 0x800a3a0도 이 크기로 이어지는데 426행은 'load size 41960'(0xa3e8)이다. git log 13개 커밋은 다이어그램·태그·날짜·URL 정리뿐이고 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 것은 GDB의 일/스텁의 일로 두 갈래를 묶는 틀(20~25행), remote vs extended-remote 표와 OpenOCD·J-Link가 extended를 쓰는 이유(170~179행), `target remote \| ssh … gdbserver -` 한 줄(212~218행), load가 RSP 메모리 쓰기이고 flash loader는 스텁 몫이라는 설명(430~439행)이다. JTAG/SWD·CoreSight 표, RTT·ITM·semihosting·ETM 절은 카탈로그 수준이고 14행이 스스로 '빠른 참조'라 밝힌다. 510·513행은 출처 없는 경험칙이다. |
| B | 13 | RSP → gdbserver/lldb-server → JTAG/SWD → CoreSight → OpenOCD → J-Link → ELF/MAP → trace → 문제 표(770~781행) → RDP → 정리(814~826행)로 흐름은 이어진다. 342~344·422~426행 내부 모순과 열린 정확성 의심으로 AP-C-24에 따라 B ≤ 13. |
| C | 8 | gdbserver 연결(126~162행), OpenOCD 0.12.0 기동 로그(375~384행), GDB 연결 순서(392~401행), J-Link GDB Server V7.94(491~495행)는 재현 가능한 명령과 출력이다. 그러나 load 출력(421~427행)은 산술이 맞지 않고, 510행 '4000이 안전한 기본값', 434행 '4-128 KB 단위', 667행 '1µs 이하'는 출처·환경 없는 수치라 C ≤ 8. 검증 절차는 없다. |
| D | 5 | 인접 ch07·ch09와는 겹치지 않는다. 다른 시리즈와 문단 단위 중복: `embedded/chapter02-jtag-swd-coresight.md` 210~218행 DHCSR 목록 ↔ 이 글 333~345행('[5:2] reserved' 모순까지 같음), `embedded/chapter04-jlink.md` 154~156행 load 출력 ↔ 424~426행, `embedded/chapter03-openocd.md` 296행 ↔ 456행, chapter03 288·333행과 `chapter06-trace.md` 273행 ↔ 688행. `modern-recipes/part10-03-gdb-remote-debug.md`, `part10-02-jtag-swd.md`와 OpenOCD 기동·RDP가 겹친다(평가자 인용, 줄 번호 미재확인). gdbserver·lldb-server 절(120~248행)만 고유하다. |
| E | 7 | 제목의 gdbserver·OpenOCD·J-Link와 description의 RSP·JTAG/SWD·CoreSight를 120~218, 361~484, 486~524, 27~118·250~331행에서 다룬다. ELF/MAP(526~610행), RDP(783~791행), trace(656~766행)는 제목·description이 약속하지 않은 범위라 질문이 흩어진다. |
| F | 7 | 830행 다음 장 Ch 9는 seriesOrder 9 `chapter09-python-scripting.md`와 맞다. 834~837행 관련 항목(ch07, ch09, ch12, part10-02)을 열어 라벨과 맞음을 확인했다. 14행 deep dive 대상 `embedded/chapter01-rsp-protocol.md` 존재, 776행 Ch 11 안내는 ch11 62행 절과 맞다. audit:reading·폰 폭 확인이 없어 9점 이상은 아니다. |
| G | 3 | 본문 출처는 89·838행 RSP 명세, 839행 ARMv7-M ARM, 840·841행 OpenOCD·Segger Wiki다. 버전 표기는 192행 'GDB 7.4+', 376행 OpenOCD 0.12.0, 492행 J-Link V7.94, 685행 'OpenOCD 0.11+'가 있다. DHCSR 비트(333~345행), FPB 6개(118·313행), RTT 채널 수(693행)에 ARM ARM 절·Segger 문서 위치가 붙어 있지 않다. |

uncertainties:
- 302행 ESP32-S3가 SWD를 쓴다는 주장은 Xtensa 코어라 다를 수 있으나 1차 자료 미확인.
- 475행 'Cortex-M0+ + M4 듀얼(예: nRF5340, RP2040)'은 nRF5340 M33 두 개, RP2040 M0+ 두 개로 기억하지만 미확인.
- 717행 'RTT가 J-Link 종속이라면'은 685·688행 OpenOCD RTT 지원과 어긋나지만 조건문이라 오류 확인에 넣지 않았다. 779행 'RTT 깨진 문자 → tpiu config'는 715행상 ITM/SWO 증상이다.
- 335행 DBGKEY [31:16]과 336~341행 상태 비트 [25:16] 겹침을 ARMv7-M ARM C1.6.2로 확인하지 않았다.
- 426행 Start address 0x080001b8이 .isr_vector 안에 있다(예시 일관성 미확인).
- 724~731행 semihosting SYS_WRITE 인자 전달, 699행 미사용 `ITM_PORT`, 752·511·693·788행 주장, 29·256행 연도는 1차 자료로 확인하지 않았다.

병합 대상: 우선 조치가 판정을 덮고 점수 구간은 병합 검토다. 베어메탈 절(250~812행)은 `src/content/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight.md`·`chapter03-openocd.md`·`chapter04-jlink.md`·`chapter06-trace.md`와 문단 단위로 같다. 다음 조치는 보강이다. 342~344행과 426행 오류를 먼저 고치고, 베어메탈 부분을 요약과 Embedded Debugging 링크로 줄여 gdbserver·lldb-server 중심으로 차별화한다.

### `chapter09-python-scripting.md` — 47점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), be973200(topic 메타), ac24bb76(제목 변경), 400892d7(린터 일괄), c99833a1(callout 변환), 2907896a(quick reference callout 추가), 60ec7a24(다이어그램)뿐이다. GDB Python API·LLDB SB API·GDB/MI와 대조한 커밋이 없고, 원문 안에서 동시에 참일 수 없는 기술 주장은 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | GDB Python API 객체 목록(75~84행)과 Command·Breakpoint·pretty-printer·Function·frame filter·Unwinder 사용법(101~552행)을 차례로 옮긴 빠른 참조이고, 14행이 스스로 그렇게 밝힌다. 이 글만의 것은 GDB↔LLDB API 대응표(603~610행), DOT 출력 viz_tree 예(419~456행) 정도다. 456·528행은 근거 없는 일반론이다. |
| B | 12 | 시작(22행) → gdb 모듈 → 명령 → 브레이크포인트 → pretty-printer → frame filter·Unwinder → event → MI → LLDB → .gdbinit → 정리(731~742행)로 흐름은 완성됐다. 누수 추적기(202~252행)는 223행에서 stop 이벤트에 람다를 연결하고 끊지 않으며 222행 주석의 '다음 step에서'와 달리 step·finish가 없다. Unwinder 예 545행은 비어 있는 조각이다. AP-C-24로 B ≤ 13. |
| C | 7 | 123~129, 301~311, 450~454, 478~481, 624~628행에 명령과 예상 출력이 있으나 GDB·LLDB·Python 버전과 환경이 없다. 39행 '보통 Python 3.6+'는 출처 없는 수치라 C ≤ 8. 540·543행 in_jit_region·lookup_jit_frame 미정의, 545행 '...' 인자, 700행 myproj_printers 미정의라 그대로 돌릴 수 없고 715행 백그라운드 스크립트는 구현이 없다. |
| D | 3 | 같은 시리즈 인접 `chapter08-remote-debugging.md`(겹침 없음), `chapter10-tui-frontends.md`(85행 MI 언급만 일부 겹침). 다른 시리즈 대조: HelloCmd 109~120행 = `gdb-extension/chapter02-commands-events.md` 20~30행, MyCmd 136~138행 = 같은 글 67~70행, StrLen 465~486행 = 같은 글 167~182행, LogAllocs 173~182행 = 같은 글 289~297행, MallocTrack 202~240행 = 같은 글 386~410행(저쪽은 disconnect 있음), SkipBoostFilter 494~507행 = `chapter04-frame-unwinder.md` 25~37행, JitUnwinder 535~549행 = 같은 글 158~175행, pretty-printer 262~268·376~390행 = `chapter03-pretty-printers.md` 28~30·102·181~211행, print-stack 726행 = `chapter01-python-api-basics.md` 445행. 1~4 구간. |
| E | 7 | 제목의 Pretty-Printer(256~415, 630~657행)와 Custom Command(101~164, 612~628행)는 이행한다. description의 '자동화'(166~254·712~719행)와 'MI'(573~586행)는 짧아 부분 이행이다. |
| F | 6 | 746행 다음 장 Ch 10은 seriesOrder 10 `chapter10-tui-frontends.md`(description에 cgdb·gdb-dashboard·nvim-dap)와 맞다. 750행 ch05는 ch05 484행 역링크와 같은 관계 설명, 751행 ch10은 20행에 DAP, 752행 ch12는 503행에 pyelftools가 있어 라벨과 맞다. 14행 deep dive도 gdb-extension ch01로 간다. 전제 지식 안내가 없고 680행 .gdbinit 블록이 GDB 명령 대부분인데 ```python으로 표시돼 7점은 주지 않았다. |
| G | 2 | 753~756행 GDB Python API·LLDB Python API·GDB/MI 명세·libstdc++ printer 소스 링크가 있지만 131·268·376·601행 주장과 연결되지 않고 버전 표기가 없다(current 문서라 기준 시점 불명). |

uncertainties:
- 222~228행 누수 추적기는 malloc마다 핸들러가 쌓이고 $rax 읽는 시점이 보장되지 않아 보인다. gdb-extension ch02 386~401행은 disconnect를 한다. GDB Python API 문서로 미확인.
- 94행 gdb.Value 슬라이스 지원, 601행 '*SB*는 Scripted Bridge', 39행 Python 3.6+ 하한, 413행 libc++ printer 경로, 376~381행 auto-load 위치 규칙을 확인하지 않았다.
- 528행 Stripe·Bloomberg, 552행 V8·HotSpot 주장은 출처가 없다.
- 674행 gdb.execute로 LLDB 외부 프로세스 제어와 같은 일이 된다는 주장 미확인.
- 28~31행 '>'와 41~46행 '>>>' 프롬프트 표기 차이는 기술 주장이 아니라 오류 확인에 넣지 않았다.

병합 대상: `src/content/blog/tools/debugging/gdb-extension/chapter02-commands-events.md`, `chapter03-pretty-printers.md`, `chapter04-frame-unwinder.md`, `chapter01-python-api-basics.md`. 다만 GDB↔LLDB 대응표(603~610행)와 LLDB 절(612~674행)이라는 독립 검색 의도가 있어 다음 조치는 차별화 보강이다. GDB 코드 반복은 gdb-extension 링크로 줄이고 LLDB 비교 중심 빠른 참조로 좁힌다. URL·seriesOrder 변경은 시리즈 전체 검토 뒤에 정한다.

### `chapter10-tui-frontends.md` — 38점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 63행은 "*Python으로* 직접 ncurses와 통합한 cgdb·dashboard가 더 안정적인 이유"라고 해 gdb-dashboard가 ncurses와 통합한다고 쓰고, 119행은 같은 gdb-dashboard를 두고 "ncurses를 쓰지 않으므로 화면 깨짐 없음"이라고 쓴다. 두 진술은 동시에 참일 수 없다. 63행은 85행(cgdb는 GDB를 서브프로세스로 띄우고 MI로 받아 자체 ncurses UI를 그림)과도 맞지 않는다. git log 10건에는 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 7 | 본문 대부분이 gdb-extension ch06과 같은 내용이다(TUI 22~66, cgdb 70~96, dashboard 98~133, nvim-dap 169~223, Emacs 278~298, 시각화 300~333, 선택 표 345~354행). 이 글에만 있는 것은 셋의 성격 구분(149행), cppdbg가 MI로 통신해 생기는 어긋남(157~161행), variables 지연 로드(272행) 정도다. 161행 '미묘하게 다르게 평가되는 경우가 있고'는 사례 없는 완곡 표현이다. |
| B | 11 | 내장 TUI → 터미널 확장 → IDE → DAP → 선택 표(345~354행) → 정리(356~364행)까지 흐름은 끝난다. 그러나 gef/pwndbg 명령표(151행), VSCode launch.json(163행), Cortex-Debug 설정(341행)은 gdb-extension ch06으로 넘긴다. 63↔119행 모순이 열려 있어 B ≤ 13. |
| C | 5 | 명령(25~29·75·103·141~146행)과 설정 조각(90~95·169~223·278~295행)은 있으나 GDB·LLDB·익스텐션 버전, OS, 예상 화면·출력이 없다. 174행 '/usr/bin/lldb-vscode'도 LLVM 판이 없다. 검증 절차·관찰 결과가 없어 4~7 구간. |
| D | 3 | 비교한 글: `chapter09-python-scripting.md`, `chapter11-practical-tips.md`(인접), `gdb-extension/chapter06-frontends.md`, `chapter05-mi-dap-protocol.md`. gdb-extension ch06과 절 단위로 거의 같다: 24~30 ↔ 17~23, 49~59 ↔ 33~43, 63 ↔ 47, 85 ↔ 64, 90~95 ↔ 75~81, 100~133 ↔ 87~120, 169~223 ↔ 260~316, 278~298 ↔ 331~348, 300~331 ↔ 383~409, 345~354 ↔ 445~456행. 239행 'JSON-RPC over TCP/stdio'는 gdb-extension ch05 188행과 같다. 1~4 구간. |
| E | 6 | 제목의 gdb-dashboard·gef·pwndbg·VS Code와 description의 TUI·cgdb·nvim-dap·DAP는 모두 절이 있다(22·70·98·135·155·165·227행). gef/pwndbg(149~153행)와 VS Code(155~163행)는 성격만 짧게 적고 나머지를 다른 시리즈로 넘겨 부분 미이행이다. |
| F | 4 | 368행 다음 장 'Ch 11(시리즈 마지막)'은 내용은 맞지만 seriesOrder 12 `chapter12-dwarf.md`(draft:false)가 있어 '마지막'이 틀렸다. 372행 'Ch 8 — Cortex-Debug 익스텐션이 OpenOCD를 띄움'의 대상 `chapter08-remote-debugging.md`에는 Cortex-Debug가 0건이고, 373행 'Ch 9 — dashboard도 Python 확장'의 ch09에서 dashboard는 746행 예고뿐이다. 라벨 오류로 F ≤ 5. |
| G | 2 | 본문에 72행 cgdb, 100행 gdb-dashboard, 167행 nvim-dap, 337행 Cortex-Debug 링크와 374행 DAP 명세가 있다. 그러나 버전·확인 날짜가 없고 161·239·264행 주장과 연결되지 않는다. |

uncertainties:
- 점수 구간은 제외 검토지만 `gdb-extension/chapter06-frontends.md`와 거의 같다. 63↔119행 모순 수정 뒤 그 글로 병합할지 검토할 후보다.
- 85행 cgdb가 GDB/MI를 쓰는지 annotation을 쓰는지 upstream 소스로 확인하지 않았다.
- 141행 gef 설치 URL 'https://gef.blah.cat/py' 유효성 미확인.
- 159·167행 CodeLLDB·nvim-dap 어댑터 설명, 174행 lldb-vscode→lldb-dap 이름 변경 가능성, 239행 DAP를 'JSON-RPC'로 부르는 표현, 56행 Ctrl-x s, 264행 setDataBreakpoints 설명을 1차 자료로 대조하지 않았다.

### `chapter11-practical-tips.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), 28524a9d(코드 블록 언어 태그), be973200(topic 메타데이터), a46f8b3e(톤 정리), ac24bb76(제목 변경), ffe6517b(주석 복원), f38a41a0(TikZ 변환), 400892d7(린터), 09a00a29(stub 배포), 60ec7a24(다이어그램)이다. GDB·GCC 매뉴얼·rr 문서와 대조한 기록이 없다. 71행 '해법 셋'과 4개 나열은 개수 표기 실수, 13·272행 '마지막 장'과 286행 Ch 12 안내 충돌은 내비게이션 결함이라 F에서 감점했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 것은 optimized out 변수를 디스어셈블로 찾아 레지스터를 직접 보는 절(87~99행), CI 사후 분석 batch 한 줄(188~192행), 증상별 함정 표(223~233행), 빌드 옵션 3단 정리(237~251행)다. 나머지는 STL 출력(17~28행), print elements·pretty(43~60행), .gdbinit 목록(124~161행), rr 명령(211~217행)처럼 매뉴얼 수준 팁 나열이다. 205행 '거의 모든 면에서 앞섭니다', 219행 '거의 유일한 도구'는 근거 없는 단정이다. |
| B | 10 | STL(15행) → optimized out(62행) → frame(109행) → .gdbinit(120행) → 한 줄 디버깅(172행) → record/rr(194·207행) → 함정(221행) → 빌드 옵션(235행) → 정리(263행)로 흐름은 끝까지 간다. 43·60·99·163행처럼 명사형 한 줄 설명이 많고, 제목의 LLDB는 163~170행 설정 4줄뿐이다. 85·219·230행 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 7 | 77~79행 gcc 옵션, 174~192행 gdb -batch, 246~248행 objcopy·strip은 재현 가능하다. 그러나 GDB·GCC·LLDB 버전과 배포판이 없고 예시 출력이 가공돼 있다(48행 '{0, 1, 2, ..., 19, ...}', 93~94행 '0x55...', 180행 '[자동으로 콜스택 출력]'). 17행 '>= 7.0', 230행 'GDB 8.0+'는 출처 없는 버전 수치라 C ≤ 8. |
| D | 7 | 비교한 글: 같은 시리즈 ch10·ch12(인접), ch01·ch03·ch06·ch09, 다른 시리즈 `dwarf-elf/chapter04-debug-loc.md`, `dwarf-elf/chapter06-split-dwarf-tools.md`, `postmortem/chapter04-debuginfod-minidump-automation.md`. .gdbinit 124~161행 ↔ ch09 676~700행(gcc-13 경로까지 같음), rr 207~219행 ↔ ch06 326~360행, STL·optimized out 15~30·62~71행 ↔ ch03 196~221·451~466행과 dwarf-elf ch04 403~418행, objcopy 246~248행 ↔ ch01 228~234·ch12 399~401·dwarf-elf ch06 129~131·postmortem ch04 45~47행. 함정 표와 레지스터 직접 보기만 독립 역할이라 5~9 구간. |
| E | 6 | 제목의 STL(15~60행), 최적화 코드(62~118행), 시간 역행(194~219행)은 다룬다. 그러나 제목 주어의 LLDB는 163~170행 4줄뿐이고, description(5행) '시리즈 마무리'와 13행 '마지막 장'은 seriesOrder 12가 있어 맞지 않는다. |
| F | 5 | 286행 다음 편 Ch 12는 seriesOrder 12 `chapter12-dwarf.md`와 맞고 276~285행 Ch 1~10 라벨도 대체로 맞다. 본문 교차 참조(30행 Ch 9, 118행 Ch 4, 209행 Ch 6, 233행 Ch 5)도 대상 절이 있다. 그러나 5·13·263·272행이 이 글을 마지막 장으로 소개해 286행과 충돌한다. 290~291행 '외부 자료' 아래 'Sanitizer 시리즈'·'Valgrind 시리즈'는 시리즈 허브가 아니라 `sanitizers/chapter02-asan-ubsan.md`, `valgrind/chapter02-memcheck.md`로 가는 라벨 오류라 F ≤ 5. |
| G | 2 | 209행 rr 링크가 rr 설명과 붙어 있고 292~294행 rr·GDB 매뉴얼·LLDB 튜토리얼 링크가 있지만 17·85·230행 주장에 절 단위로 연결되지 않는다. 버전 표기는 154행 gcc-13 경로뿐이다. |

uncertainties:
- 17행 libstdc++ pretty-printer 자동 활성화 버전(>= 7.0)을 GDB 매뉴얼로 확인하지 않았다.
- 85행 '-g3는 매크로·인라인 정보까지'는 dwarf-elf ch04 418행과 설명이 다르다(글 간 차이, GCC 매뉴얼로 확인 필요).
- 113~116행 '(inlined by …)' 형식은 addr2line -i 출력에 가깝고 GDB bt 실제 출력과 다를 수 있다.
- 142행 `set auto-load safe-path /` 권장, 196~205행 record-full 범위·제약, 219행 'x86 Linux 전용', 230행 'GDB 8.0+', 231행 kill -USR2, 232행 disable-randomization '기본 on'과 증상 설명의 어긋남을 확인하지 않았다.
- 251행 'build-id로 매칭'과 248행 --add-gnu-debuglink(이름·CRC 기반) 예시는 다른 메커니즘이다.
- 48행 print elements 출력은 가공 예시로 보이고, 71행 '해법 셋'과 실제 4개 나열은 산문 개수 실수다.

병합 대상: 후보는 .gdbinit 절(120~170행) ↔ `chapter09-python-scripting.md` 676~700행, STL·optimized out 절(15~118행) ↔ `chapter03-inspecting-state.md` 196~221·451~466행, rr 절(194~219행) ↔ `chapter06-multithread-multiprocess.md` 326~360행. 함정 표(223~233행)와 빌드 옵션 정리(235~251행)는 'gdb 실전 팁'이라는 독립 검색 의도가 있어 다음 조치는 보강이다(중복 절은 링크로 줄이고, 함정 표·레지스터 직접 보기를 버전·실제 출력으로 보강, '마지막 장' 문구와 '외부 자료' 라벨 정정). 보강 뒤에도 고유 분량이 남지 않으면 위 세 장으로 병합한다.

### `chapter12-dwarf.md` — 44점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 모순 두 건(루브릭 3-1). (1) 163~166행 .debug_line 표에서 0x401131은 14행, 다음 행 0x40113e는 16행이라 0x401134는 14행이어야 하는데, 195~196행 `addr2line -e my_prog 0x401134` 출력은 main.cpp:13이다. (2) 198~200행 `-f -i 0x401134` 출력은 인라인 체인 없이 main 하나이고 202행은 '-i는 인라인 호출 체인까지'라고 하는데, 같은 주소에 -p만 더한 203~204행은 foo→bar→main 3단 체인을 출력한다. 같은 바이너리·주소·-i라 동시에 참일 수 없다. git log 11개 커밋에는 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 섹션 표(48~62행), TAG 카탈로그(112~131행), DW_OP 표(245~257행), CFI 규칙(290~297행)은 DWARF 입문 자료의 표준 목록이고 14행이 스스로 '빠른 참조'라 밝힌다. 고유한 부분은 흔한 문제 진단(422~473행)과 inline 트리 예(549~573행) 정도다. |
| B | 12 | DIE → abbrev → .debug_line → .debug_loc·expression → CFI → 크기 대책 → 별도 debuginfo → 진단 → 도구 → DWARF 5 순서로 끝까지 간다(22~584행). Abbreviation 절(139~148행)은 '- ...'로 끝나는 불릿뿐이라 150행 '압축비가 매우 높음'을 받치지 못한다. 예시 출력 모순(196 대 163~166행, 199 대 204행)으로 AP-C-24에 따라 13 이하. |
| C | 5 | readelf·llvm-dwarfdump·addr2line·objcopy·dwz·pyelftools 명령(32~44, 158~205, 398~418, 477~520행)은 있으나 컴파일러·binutils 버전과 소스가 없다. 73행은 GCC 13.2.0 main.c, 97행은 clang 17 main.cpp이고, main 시작 주소는 82·104행 0x401120, 306행 FDE 0x401130이다. 172~188행 line 바이트코드의 DW_LNS_copy 4번과 163~166행 표 3행이 맞지 않는다. 338·376·392·324행 수치는 출처·환경이 없어 C ≤ 8이고, 예시 출력 모순으로 5로 낮췄다. |
| D | 4 | 비교한 글: 같은 시리즈 인접 `chapter11-practical-tips.md`, 다른 시리즈 `dwarf-elf/chapter02~06`. readelf 오프셋 0001234c·52431892는 34·342행과 dwarf-elf ch02 37행, 18937451은 344행과 ch02 39행, addr2line 0x401134 -p는 203행과 ch03 272행, is_stmt는 211행과 ch03 282·290·292행, DW_OP_piece·constu 42는 262·270행과 ch04 48~49·182행, CFI rbp+16은 311행과 ch05 102행, '5~10배'는 338행과 ch06 13행, dwz -m은 379행과 ch06 106행, 1/10은 392행과 ch03 442·ch06 120행, debuginfod 문장은 420행과 ch06 182행에 같이 있다. ch11 62~89행은 437~439행과 일부 겹친다. 1~4 구간. |
| E | 7 | 제목의 '변수와 라인을 찾는 방식'에 .debug_info(64행~), .debug_line(154행~), .debug_loc(228행~)이 답하고 description의 항목은 모두 절이 있다. abbrev(135~152행)가 얇아 감점했다. |
| F | 4 | 13~15행 tip은 템플릿 callout이라 점수를 주지 않았다. seriesOrder 12는 디렉터리의 마지막 글인데 시리즈 마무리나 다음 단계 안내가 없다(6 이하). 589행 Ch1, 591행 Ch7, 592행 Ch11 라벨은 대상과 맞지만, 590행 'Ch 4: 콜스택과 프레임 — CFI가 풀어 주는 것'의 대상 ch04에는 CFI가 446·448행 링크에만 나오고 설명이 없다. 라벨 오류로 5 이하. 366~370행 불릿 안 트리 문자, 139~148행 끊긴 불릿도 있다. |
| G | 2 | 본문 출처는 dwz 링크(376행)와 593~596행(DWARF5 PDF, llvm-dwarfdump, pyelftools, debuginfod)뿐이다. 441행 GCC 8+, 532행 GCC 11+/Clang 11+, 376행 20-40%에 연결된 출처가 아니고 표준 절 번호·도구 버전도 없다. |

uncertainties:
- 82·104행 main low_pc 0x401120과 306~307행 FDE start 0x401130·range 0x50은 같은 my_prog로 보기 어렵다. 오류 확인 근거로는 addr2line 두 건만 썼다.
- 172~188행 line 바이트코드와 163~166행 표의 행 수 차이는 설명용 도식일 수 있어 오류로 올리지 않았다.
- 441행 'DW_OP_entry_value로 GCC 8+'와 532행 'GCC 11+가 기본 DWARF 5'의 시점 차이, Clang 11+ 전환 버전은 1차 자료로 확인하지 않았다.
- 357행 '.dwo 자동 검색', 473행 -fdiagnostics-color 필요 주장, 420행 debuginfod 부분 다운로드, 24행 '1992년부터', 527행 .debug_names 효과는 근거가 없다.
- 338행 5~10배, 376행 20-40%, 392행 1/10, 324행 100KB는 출처와 환경이 없는 수치다.

병합 대상: 우선 조치가 먼저다. 163~166행 line 표와 196·199·204행 addr2line 출력, 82·104행과 306행 main 시작 주소를 실제 빌드 출력 하나로 다시 맞춘다. 점수 구간은 병합 검토이고 후보는 `src/content/blog/tools/debugging/dwarf-elf/chapter02-dwarf-overview.md`~`chapter06-split-dwarf-tools.md`다. 다음 조치는 보강이다. dwarf-elf 각 장으로 보내는 짧은 안내로 줄이고 GDB 사용자 관점의 진단 절(422~473행)과 inline 트리 예(549~573행)만 남겨 차별화한다. 리다이렉트 여부는 URL 영향 분석 뒤에 정한다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- git 이력에 1차 자료 대조 커밋 없음: 10편 모두 factcheck '검증됨'이 아니다. 파일 이력은 0a9dd7bc(slug 고정), be973200(topic 메타데이터), ac24bb76(제목 변경), 400892d7(린터), 60ec7a24(다이어그램) 같은 일괄 커밋뿐이다. GDB and LLDB 시리즈는 `/fact-check-round`를 거치지 않았다.
- 본문 1차 출처·버전 표기 없음: G가 10편 중 9편 2점, ch08만 3점이다. 출처가 글 끝 링크 목록에만 모여 있고(ch03 486~497, ch04 438~448, ch05 476~478, ch07 439~442, ch09 753~756, ch11 292~294, ch12 593~596행) GDB·LLDB·컴파일러 버전이 없다. ch03·ch04·ch05·ch06·ch07·ch09·ch10·ch11·ch12에서 C ≤ 8 상한이 걸렸다.
- 손으로 만든 예시 출력과 예시 간 불일치: ch03 151·183·47·382행, ch04 128·32·185~186·365행, ch05 154~170행(0x...), ch06 201·77행, ch08 422~426행, ch11 48·93~94·180행, ch12 163~166·196·199·204·82·306행. ch08·ch12는 이것이 오류 확인으로 이어졌다.
- 'Deep dive · 빠른 참조' callout(커밋 2907896a)과 전용 시리즈 중복: ch06 14행(draft Concurrency), ch07 14행(Postmortem), ch08 14행(Embedded Debugging), ch09 14행(GDB Extension), ch10 13~15행(GDB Extension ch06), ch12 13~15행(DWARF-ELF). D가 ch07·ch09·ch10 3점, ch12 4점, ch08 5점이다. 두 시리즈 역할 분담을 시리즈 단위로 정해야 한다.
- 시리즈 안 같은 주제 반복: optimized out(ch03 451~464, ch11 62~107행), pretty printer(ch03 211~224, ch09 256·392~415행), rr·데드락(ch04 375~390, ch06 206~236·342~361, ch11 207~218행), .gdbinit(ch09 676~700, ch11 124~161행), objcopy 3줄(ch01 228~234, ch11 246~248, ch12 399~401행). 서로 안내하지 않고 반복한다.
- 관련 항목·다음 편 라벨 오류: ch06 439행(TSan / MSan, MSan 0건), ch07 438행('Sanitizers Ch 1'이 seriesOrder 2), ch10 372·373행(Cortex-Debug·dashboard 없음), ch11 290~291행('… 시리즈' 라벨이 개별 글로 감), ch12 590행(CFI 설명 없는 ch04). 5편에서 F ≤ 5가 걸렸다.
- 시리즈 끝 표기 충돌: ch10 368행 'Ch 11(시리즈 마지막)', ch11 5·13·263·272행 '마지막 장'·'시리즈 마무리'인데 seriesOrder 12 `chapter12-dwarf.md`가 공개돼 있고, ch12에는 마무리 안내가 없다. ch01 허브의 편수 표기도 함께 확인해야 한다.
- 다른 글과의 모순(오류 확인 아님): 인라인 프레임 표시(ch04 164~172 ↔ ch11 111~115행), DHCSR '[5:2] reserved'(ch08 342~344 ↔ embedded ch02 215~217행), load size 41960(ch08 426 ↔ embedded ch04 156행), core_pipe_limit(ch07 100 ↔ postmortem ch01 166행), 누수 추적기 disconnect(ch09 223 ↔ gdb-extension ch02 401행), addr2line 0x401134 예(ch12 203 ↔ dwarf-elf ch03 272행). 한쪽만 고치면 다른 쪽에 남는다.
- LLDB 비중 부족: 제목이 GDB·LLDB인데 LLDB는 절마다 몇 줄이다(ch03 84~89·126~130·171~176, ch04 52~58·99~104, ch05 116~120·271~275, ch11 163~170행).

## 다음 조치

- 우선 조치(4편, 오류 확인): ch04 115행 프레임 번호 방향과 299·428행 skip 설명, ch08 342~344행 DHCSR 비트와 426행 load size, ch10 63·119행 gdb-dashboard ncurses 서술, ch12 163~166·196·199·204행 addr2line 출력을 먼저 정정한다. ch08·ch12의 같은 예시가 embedded ch02·ch04, dwarf-elf ch03에도 있으므로 함께 고치고 `data/known-falsehoods.yaml` 등재를 검토한다.
- ch10은 정정 뒤 점수 구간(38점, 제외 검토)에 따라 `gdb-extension/chapter06-frontends.md`로 병합할지 검토한다.
- 시리즈 끝 표기(ch10 368행, ch11 5·13·263·272행)와 ch12 마무리 안내, 관련 항목 라벨 5건(ch06 439, ch07 438, ch10 372·373, ch11 290~291, ch12 590행)을 실제 대상과 맞춘다.
- 병합 검토(6편): ch07은 Postmortem 1~3장으로 병합하거나 GDB 명령 중심 빠른 참조로 좁히는 안을 시리즈 단위로 정한다. ch09는 gdb-extension과 겹치는 GDB 코드를 링크로 줄이고 LLDB 비교 중심으로 좁힌다. ch03·ch05·ch06·ch11은 시리즈 안 반복 절을 한쪽에 모으고 버전·환경과 매뉴얼 출처를 붙이는 보강으로 간다.
- GDB and LLDB 시리즈 전체를 `/fact-check-round` 대상으로 올리고, 'Deep dive' callout을 단 장과 전용 시리즈(Postmortem·Embedded Debugging·GDB Extension·DWARF-ELF)의 역할 분담을 정한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
