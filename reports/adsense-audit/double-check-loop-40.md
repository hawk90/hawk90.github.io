# 공개 글 독립 재평가 — 루프 40

평가일 2026-10-18. 원문 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`, 루브릭 v1.2·AP-C-24 적용. 대상 10편의 전문, 기존 판정, 아래 비교 원문과 내부 링크 목적지를 대조했다. 앵커는 현재 보강된 Recipes가 아닌 `10550ca1` 당시 원문 기준이다. 원문과 기존 보고서는 수정하지 않았다. 전편 `score_status: 잠정`, `confidence: 중간`. 일부 오류 확인을 전체 주장 검증으로 확대하지 않는다. 공통 검사는 [공통 게이트](double-check-gates-2026-10-18.md)를 참조한다. 본문 검토에서 P0는 확인하지 못했다.

## 재평가 표

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `practical-internals/part5-07-preempt-rt-linux.md` | 12 | 12 | 7 | 10 | 7 | 5 | 1 | 54 | 오류 확인 | 우선 조치 |
| `python/chapter01-pdb-basics.md` | 10 | 12 | 7 | 14 | 7 | 5 | 2 | 57 | 오류 확인 | 우선 조치 |
| `python/chapter02-debugpy-ide.md` | 12 | 12 | 6 | 12 | 6 | 7 | 2 | 57 | 미검증 | 병합 검토 |
| `python/chapter03-asyncio.md` | 11 | 9 | 6 | 12 | 6 | 6 | 2 | 52 | 오류 확인 | 우선 조치 |
| `python/chapter04-py-spy.md` | 11 | 12 | 7 | 13 | 8 | 5 | 2 | 58 | 미검증 | 병합 검토 |
| `python/chapter05-faulthandler-tracemalloc.md` | 11 | 11 | 6 | 12 | 7 | 5 | 2 | 54 | 오류 확인 | 우선 조치 |
| `sanitizers/chapter01-intro.md` | 11 | 11 | 6 | 10 | 7 | 6 | 2 | 53 | 오류 확인 | 우선 조치 |
| `sanitizers/chapter02-asan-ubsan.md` | 12 | 13 | 8 | 11 | 7 | 7 | 2 | 60 | 오류 확인 | 우선 조치 |
| `sanitizers/chapter03-lsan-leaks.md` | 11 | 12 | 7 | 10 | 6 | 7 | 2 | 55 | 미검증 | 병합 검토 |
| `sanitizers/chapter04-tsan.md` | 12 | 12 | 7 | 11 | 7 | 7 | 2 | 58 | 오류 확인 | 우선 조치 |

기존 합계557→558, 평균55.7→55.8이다. 점수 변경은 debugpy B11→12뿐이다. debugpy 오류 확인을 철회하고 Sanitizers 개요의 atomic 예제를 신규 오류로 확인하여 우선 조치는7편이다.

## 정확성 게이트

- PREEMPT_RT: 기존 L276의 soft deadline과 worst-case 비교는 마감 위반을 허용하는 soft RT와 양립하므로 확정 오류 근거에서 제외한다. L177~187의 서로 다른 EtherCAT 주기는 맥락 설명이 부족하지만 처리 경로·업무가 같다는 전제까지 확정하지 않는다. 대신 L63~66의 non-RT `spin_lock()`이 IRQ를 막는다는 설명을 [Linux lock types의 spinning locks·spinlock_t 절](https://docs.kernel.org/locking/locktypes.html)과 대조했다. 일반 spinlock은 선점을 막고, IRQ 차단은 `_irq`·`_irqsave` 변형의 별도 보호다. 오류 확인은 유지하되 근거를 교체한다. L305의 RT 임계구역 sleep 허용 문제까지 이 확인으로 결론 내리지 않는다.
- Python ch01: L212~220 코드를 그대로 추출해 예외를 발생시킨 실행에서 `traceback` 미정의 NameError가 먼저 발생하여 post_mortem에 도달하지 않았다(Python 3.15.0, exit 1). 글의 import는 sys·pdb뿐이다. [pdb 문서](https://docs.python.org/3/library/pdb.html)와 함께 예제 실패를 확인했다. 기존 판정 유지.
- Python ch02: L174의 reload 설정과 L179의 '보통 충돌' 권고는 동시에 참일 수 있다. 기존 보고서의 내부 모순 논증을 철회한다. [debugpy 설정 문서](https://github.com/microsoft/debugpy/wiki/Debug-configuration-settings)는 subProcess 기본값 true를 명시한다. [CLI reference](https://github.com/microsoft/debugpy/wiki/Command-Line-Reference)와 [v1.8.14 CLI parser](https://raw.githubusercontent.com/microsoft/debugpy/v1.8.14/src/debugpy/server/cli.py)에는 `--multiprocess`가 없지만, L141은 어느 프로그램 옵션인지도 불명확하므로 이를 대신 오류 게이트로 올리지 않는다. 버전·PyCharm·리로더 지원은 추가 확인 대상이다.
- Python ch03: L206~210의 순차적인 두 `asyncio.run(main())` 호출을 재현하면 둘 다 1을 반환했다(Python 3.15.0). [공식 runner 문서](https://docs.python.org/3/library/asyncio-runner.html)는 호출별 루프 생성·종료와 같은 스레드의 실행 중 루프 안에서 호출하는 제한을 구분한다. 순차 호출 자체가 closed-loop 오류라는 설명은 틀리므로 기존 판정 유지.
- Python ch05: L100의 1,000회와 L110의 50 MiB 증가에서 회당 약51 KiB이며 같은 출력의 1 MiB/cycle과 맞지 않는다. L113의 약50 KB 설명은 앞 산술 쪽이다. 기존 판정 유지.
- Sanitizers ch01: L165~177의 ready는 `std::atomic<bool>`이고 대입·변환에 별도 memory_order가 없다. [C++ draft atomic operations](https://eel.is/c++draft/atomics.types.operations)는 이를 기본 seq_cst store/load로 정의한다. [atomic order](https://eel.is/c++draft/atomics.order)는 해당 store/load의 release/acquire 동작과 읽힌 값에 따른 동기화를 규정한다. ready가 true일 때 그 이전 data 쓰기와 이후 읽기 사이에 happens-before가 성립하므로 '동기화 없이 읽음/데이터 레이스' 표시가 틀렸다. false이면 읽지 않는다. 코드에 나타나지 않은 다른 writer를 가정하지 않았다. 신규 오류 확인이며 TSan을 실제 실행했다고 주장하지 않는다.
- Sanitizers ch02: L27은 컴파일·링크 중 한쪽 플래그가 없어도 빌드된다고 하지만 L30~32는 링크 누락 시 undefined symbol이라고 한다. 같은 빌드 조건의 실패 여부가 충돌하여 기존 오류 확인 유지.
- Sanitizers ch04: L174·190은 relaxed 예를 false positive로 분류하고 L205·292~308은 같은 패턴을 실제 레이스로 설명한다. 단순 절 제목 오타만이 아닌 탐지 분류·결론의 충돌이므로 기존 오류 확인 유지.

## 글별 근거

각 A~G 행은 `evidence`다. 유지한 점수도 아래 관찰과 앵커에 따라 독립 판단했다. 수치 차이를 만들기 위한 조정은 하지 않았다. 줄 번호는 현재 원문 기준이며 경로의 `python/`·`sanitizers/` 기준은 `src/content/blog/tools/debugging/`다.

### practical-internals/part5-07-preempt-rt-linux.md

source_file: `src/content/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux.md`

- url: `/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`, `part7-05-kernel-build.md@10550ca1`.
- blockers: L66 spin_lock IRQ 차단 설명. P0 미발견.
- uncertainties: L305 sleep 허용, EVL API·지연 보장, Yocto 문법, L191·216 기업 채택과 모든 지연 수치는 미검증. 서로 다른 산업 사례의 주기를 동일 작업으로 간주하지 않음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L158~169 EVL 비교와 L264~288 선택표는 고유 관점. 업체 나열·무출처 지연만으로 선택을 뒷받침해 높은 독창성 구간에 못 미친다. |
| B | 12 | L24~101 원리→L103~171 비교→L232~288 튜닝·선택으로 완결. lock 의미 오류와 미검증 API가 남아 B≤13. |
| C | 7 | L105~110 cyclictest·L234~260 설정은 따라갈 단서. L114~118 수치는 보드·부하·커널·출처가 없어 C≤8. |
| D | 10 | 이 글 L24~33·103~112·234~236↔industrial-ethernet/ch11 L47~58·148~164·90~102가 겹친다. 같은 시리즈 선택 가이드 L64~76·why-rtos L124~138은 짧은 비교뿐. 현재 Recipes IRQ affinity L227~242는 IRQ routing을 더 자세히 다루나 RTOS와 Linux 선택 역할은 남는다. |
| E | 7 | L24~33 mainline·L122~171 EVL·L264~288 선택 기준으로 제목 약속은 이행. 실제 요구 조건과 적용 범위 설명이 부족하다. |
| F | 5 | L338~341 관련 대상 제목은 일치. L334의60+편은 실제53편과 달라 탐색 상한5. 마지막 글이라 다음 편 누락 감점은 없음. |
| G | 1 | L114~118 지연·L191·216 채택 사례에 출처가 없고 버전도 kernel6.12 이외 희박하다. |

다음 조치: lock 계약과 지연 근거 보강. 병합 대상 없음. 튜닝 반복은 industrial-ethernet ch11로 넘길 후보.

### python/chapter01-pdb-basics.md

source_file: `src/content/blog/tools/debugging/python/chapter01-pdb-basics.md`

- url: `/blog/tools/debugging/python/chapter01-pdb-basics`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: L213·216 import 누락으로 예외 hook 실패.
- uncertainties: GIL 설명 L243, header 옵션 L246, display 출력·버전별 명령은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | L37~52 명령 목록·L56~93 진입 방법이 중심. L224~239 signal 조합은 있으나 관측한 진단 사례는 없다. |
| B | 12 | 진입→BP→변수→스택→패턴 흐름은 완결. L212~222 자동 진입이 실패하며 정확성 의문으로 B≤13. |
| C | 7 | L64~70·107~110·161~191 명령/출력과 실제 실패 확인. 본문 출력 환경·재현 기록은 약하고 핵심 예제 실패가 남는다. |
| D | 14 | 이 글 L56~93·195~239↔ch02 L13·197~202 및ch05 L250~267 비교: 후자는 대안 표·짧은 magic 설명이고 pdb 사용 자체는 이 글에 집중한다. 도구별 독립 의도가 강하다. |
| E | 7 | L15~54 breakpoint·L136~157 ipdb·L74~93 postmortem은 약속을 다루나 hook의 실제 실패가 적용성을 낮춘다. |
| F | 5 | L259·263의 실제 다음은debugpy로 맞지만 L239의 '다음 장 py-spy'는4장. 잘못된 안내로5상한. |
| G | 2 | L265~266 공식 문서·저장소가 끝에 있고 세부 주장에 연결 안 됨. Python3.7+ 이외 환경 부족. |

다음 조치: 예외 hook 수정·실행 기록 보강. 병합 대상 없음.

### python/chapter02-debugpy-ide.md

source_file: `src/content/blog/tools/debugging/python/chapter02-debugpy-ide.md`

- url: `/blog/tools/debugging/python/chapter02-debugpy-ide`
- score_status: 잠정; confidence: 중간; anchor_ref: `part6-09-isr-api.md@10550ca1`.
- blockers: 기존 reload 내부 모순 근거 철회. P0·확정 오류 미발견.
- uncertainties: L13·226·247 PyCharm 공통 어댑터, L141 multiprocess 옵션의 도구·버전, Flask 환경변수, 워커 포트 연결 절차 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L133~139 워커 포트·L207~222 SSH와 환경 gating은 적용 관점. 실측 실패 분석은 없다. |
| B | 12 | L15~252 launch부터 운영·문제 표까지 흐름 완결. 기존 reload 확정 오류 논증 제거로11→12. PyCharm·포트 절차 공백과 불확실성 때문에13상한 아래. |
| C | 6 | L19~52·84~89·156~190 설정 조각은 있지만 attach 성공/실패 관찰·버전이 없다. reload가 항상 실패한다는 기존 설명은 이 근거에서 제거한다. |
| D | 12 | L78~80·224~232↔gdb-extension/ch05 L429~445 및gdb-lldb/ch10 L222~239 DAP 모델이 겹친다. 이 글의attach·보안·프레임워크 설정은 독립적이다. |
| E | 6 | VSCode·원격 attach·justMyCode는 실현. 제목 PyCharm은 L13·226·247 언급에 그치고 설정 절차가 없다. |
| F | 7 | L256 다음 asyncio, L260~262 관련 대상 모두 실제제목·순서 일치. L236~243 고유 증상 표가 탐색을 돕는다. 모바일 미검사. |
| G | 2 | L13·263 저장소 링크는 있으나 세부 옵션·환경별 주장 출처·버전 없음. |

다음 조치: 보강. 병합 검토 구간이지만 병합 대상 없음; debugpy attach 검색 의도가 독립적이다. reload를 무조건 제거하라는 이전 조치는 따르지 않고 버전·구성별 검증부터 한다.

### python/chapter03-asyncio.md

source_file: `src/content/blog/tools/debugging/python/chapter03-asyncio.md`

- url: `/blog/tools/debugging/python/chapter03-asyncio`
- score_status: 잠정; confidence: 중간; anchor_ref: `part6-09-isr-api.md@10550ca1`.
- blockers: L206~210 순차 asyncio.run 오류 설명.
- uncertainties: L174 예외 보고·L191 finally 취소, aiomonitor API·출력과 버전 차이 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L106~134 외부 signal+task stack·L151~217 버그 분류는 유용하나 관측 실패 분석이 없다. |
| B | 9 | 도구별 조각과 짧은 해법 중심. race condition 설명 부족·run 오류로 핵심 진단 범위가 불완전하다. |
| C | 6 | L36~58·82~102 명령/출력은 있지만 환경·출처 부족, L206~210 기대 오류는 재현과 다르다. C≤8. |
| D | 12 | L76~80↔ch05 L139~144 생성 위치 추적이 반복. L120~127↔ch01 L226~236 signal 패턴은 목적이 다르고 ch04 L121~123은 외부 샘플러라 독립 주제 유지. |
| E | 6 | 짧은 스택·slow callback 절은 있으나 description의 race condition은 본격 이행하지 않음. |
| F | 6 | L272 다음py-spy 및L276~278 대상은 일치. 일부 끊긴 문장과 짧은 해법이 흐름을 약화한다. |
| G | 2 | L221·279~280 링크는 있으나 세부 주장을 버전별로 연결하지 못한다. |

다음 조치: run 조건과 취소 의미 보강. 병합 대상 없음.

### python/chapter04-py-spy.md

source_file: `src/content/blog/tools/debugging/python/chapter04-py-spy.md`

- url: `/blog/tools/debugging/python/chapter04-py-spy`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: 확정 오류·P0 미발견.
- uncertainties: L13·91 무정지 주장, L123 asyncio 재구성, L154 Yama 권한과macOS SIP는 upstream·OS 문서 대조 필요. 실제 출력인지 불명확.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L93~109 hung server 해석·L190~197 정기dump는 응용이나 실측 분석 없음. |
| B | 12 | 설치→3모드→운영→권한→비교로 완결. asyncio·무정지 지원 조건은 얕고 불확실하여 B≤13. |
| C | 7 | L42·61·75·103~106 명령과 출력이 있으나 버전·환경·실측 여부 없음. L178 오버헤드 수치로 C≤8. |
| D | 13 | 이 글 L72~109↔ch05 L47~65·250~267은 외부/내부 stack 역할 비교이고 memory/ch03 L211~215는 한줄 언급뿐이다. 본격 py-spy 역할은 독립. |
| E | 8 | L39~91 샘플링·dump·Flamegraph, L164~171 attach가 운영 분석 약속을 받친다. 적용 환경 설명은 부족. |
| F | 5 | L211·215~216 다음/관련 제목은 일치하지만 L217 perf+Flamegraph는 링크 없이 draft시리즈를 가리킨다. 관련 항목 결함5상한. |
| G | 2 | L13·218 저장소·L65·219 Flamegraph 출처는 있으나 권한·비율·버전의 근거 연결 없음. |

다음 조치: 보강. 병합 대상 없음. 운영 외부 진단은 독립 검색 의도다.

### python/chapter05-faulthandler-tracemalloc.md

source_file: `src/content/blog/tools/debugging/python/chapter05-faulthandler-tracemalloc.md`

- url: `/blog/tools/debugging/python/chapter05-faulthandler-tracemalloc`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`.
- blockers: L100·110 회당 증가량 산술 불일치.
- uncertainties: DEBUG_SAVEALL 의미 L197~204, signal 도달 조건, objgraph 의존·pyrasite 지원은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L180~186 누수 패턴·L250~267 도구 선택은 적용 관점. 실제 진단 기록 없음. |
| B | 11 | L15~244 여러 진단 도구 흐름은 완결되나 pyringe heading만 있고 산술 오류·미검증 GC 설명이 남는다. |
| C | 6 | snapshot 코드·L109~111 출력은 연결되나 회당 값이 틀리고 환경 없는 메모리 수치로 C≤8. |
| D | 12 | L71~84↔memory/ch05 L313~334는 같은 snapshot 패턴. 후자는 상세를 이 글로 넘긴다. L140~144↔asyncio L76~80 반복은 일부이고 메모리 진단 역할 유지. |
| E | 7 | faulthandler·tracemalloc·objgraph 약속은 L15~186에서 답한다. 도구가 넓어 시나리오 집중도는 제한. |
| F | 5 | L279~283 관련 제목 일치. L284 Massif라벨은 Valgrind suppression ch05로 연결되어5상한. |
| G | 2 | L286~290 공식 링크는 목록이고 개별 동작·버전·환경과 연결이 약하다. |

다음 조치: 회당 수치·Massif 링크 수정 및 실제 출력 보강. 병합 대상 없음.

### sanitizers/chapter01-intro.md

source_file: `src/content/blog/tools/debugging/sanitizers/chapter01-intro.md`

- url: `/blog/tools/debugging/sanitizers/chapter01-intro`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: L165~177 동기화된atomic 예를 레이스로 분류.
- uncertainties: GCC·Clang 지원 표·다중 sanitizer 조합, overhead와 ASan 예시 출력, 다른 예제의 독립 번역단위 여부 미검증. 산문의 옵션 개수는 오류 게이트에 포함하지 않음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L72~114 도입 단계는 허브 역할. 종류/플래그 목록과 일반 예제가 중심이고 실측 비교는 없다. |
| B | 11 | 이유→종류→도입→예제→선택으로 완결. atomic 예제는 의심에서 확인으로 바뀌었지만 같은 결함의 근거 강화라 점수는 추가로 빼지 않는다. |
| C | 6 | L89~114 빌드 플래그·예제는 있으나 컴파일러·실행결과 없음. L38·51~55 배율로 C≤8, 잘못 분류한 예제가 적용성을 낮춘다. |
| D | 10 | L204~218↔Valgrind ch01 L41~53 비교 틀 반복. L84~97↔ASan ch02 L13~88 플래그 설명 반복. 전체도구 선택·로드맵 허브는 독립이다. |
| E | 7 | 5개도구·선택·도입 순서를 표와 각 예제가 이행하나 정확한 선택 근거는 얕다. |
| F | 6 | L248·259 다음ASan은 일치. L226~232 허브 로드맵 링크가 없어 탐색 완성도가 낮다. |
| G | 2 | L252~255 공식 링크는 있으나 지원·비율·플래그 계약에 본문 연결과 버전이 부족하다. |

다음 조치: seq_cst 예제 분류와 허브 연결 보강. 병합 대상 없음. 총점53 유지지만 판정은 보강→우선 조치.

### sanitizers/chapter02-asan-ubsan.md

source_file: `src/content/blog/tools/debugging/sanitizers/chapter02-asan-ubsan.md`

- url: `/blog/tools/debugging/sanitizers/chapter02-asan-ubsan`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`, `part12-10-on-device-llm.md@10550ca1`.
- blockers: L27↔30~32 링크 플래그 누락 결과 충돌.
- uncertainties: 런타임 flag 기본값·suppression 문법·배율·플랫폼별 지원은 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L63~88 옵션 이유·L254~344 보고서/한계는 기본 목록보다 구체적이나 독자적 실행 사례는 없다. |
| B | 13 | 컴파일/링크→옵션→런타임→suppression→보고서의 범위는 충실. 빌드 계약 오류·미검증 flag가 있어 상한13. |
| C | 8 | L14~32·137~169·330~344 명령/출력 단서가 풍부하나 환경·실제 실행 기록과 수치 근거 부족으로8상한. |
| D | 11 | L13~88↔intro L84~97, L181~205↔LSan L154~182 예시 반복. Recipes memory-corruption L130~153은 desktopASan 짧은 안내라 런타임 설정 상세 역할은 구분. |
| E | 7 | 옵션·런타임 동작을 본문이 다루지만 실제 도입 환경과 실패 조건 설명은 제한. |
| F | 7 | 다음LSan·관련 목적지 제목 일치. 옵션 역할·보고서 해석의 글 고유 구성이 있음. 모바일 미검사. |
| G | 2 | L376~378 공식 링크는 있으나 기본값·지원 주장의 버전별 연결이 약하다. |

다음 조치: 링크 플래그 결과·런타임 기본값 보강. 병합 대상 없음. suppression은 LSan 정본으로 위임 후보.

### sanitizers/chapter03-lsan-leaks.md

source_file: `src/content/blog/tools/debugging/sanitizers/chapter03-lsan-leaks.md`

- url: `/blog/tools/debugging/sanitizers/chapter03-lsan-leaks`
- score_status: 잠정; confidence: 중간; anchor_ref: `part7-05-kernel-build.md@10550ca1`.
- blockers: 확정 오류·P0 미발견.
- uncertainties: L177 suppression 문법, L239 recoverable 반환값, L340 no_sanitize 속성, 플랫폼 지원과L262 미정의result는 실제 컴파일·upstream 확인 필요. 이 검토에서 실행하지 않음.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | L106~144 보고서 해석·L230~246 recoverable check는 응용. 실제 누수 진단·트레이드오프 기록 없음. |
| B | 12 | reachability→빌드→보고서→suppression→분석패턴은 완결. 제목의 스레드 정지 원리 공백과 코드/API 의문으로 B≤13. |
| C | 7 | L77~101 빌드·L187~225 반복 실행과 출력이 있지만 환경·실제결과 없음. L222~225는 첫 실행과 두번째 grep 실행 설정이 달라 관찰 절차도 약함. |
| D | 10 | L154~182↔ASan L181~205 suppression 예가 겹치고 L344~373 CI는ch05 주제다. L106~144·230~246 해석과recoverable check는 별도 역할. |
| E | 6 | 제목 Stop-the-world는 제목 외에서 메커니즘을 설명하지 않는다. 누수 분석 약속은 본문이 이행. |
| F | 7 | L373·389·399~402 실제 다음/관련 목적지·설명은 일치. L252~329 번호별 사고 패턴이 고유 탐색을 돕는다. |
| G | 2 | L393~395 Wiki·Flags·논문은 있으나 개별 지원·API 계약의 버전 근거는 부족. |

다음 조치: 보강. 병합 검토 구간이나 병합 대상 없음. 원리·API 검증 후 suppression 중복 축소.

### sanitizers/chapter04-tsan.md

source_file: `src/content/blog/tools/debugging/sanitizers/chapter04-tsan.md`

- url: `/blog/tools/debugging/sanitizers/chapter04-tsan`
- score_status: 잠정; confidence: 중간; anchor_ref: `part1-04-uart-hardware.md@10550ca1`.
- blockers: L174·190↔205·292~308 레이스/오탐 분류 충돌.
- uncertainties: suppression 종류·signal handler·const 초기화 탐지, deadlock 지원, 운영 권고와 수치 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | L115~168 map 보고서 해석은 기본 목록보다 구체적. 진단 결과·선택 실증은 없다. |
| B | 12 | 원리→빌드→보고서→수정→운영으로 완결. 핵심 false positive 예 분류가 모순되어 높은 구간 제외. |
| C | 7 | L81~100·262~271·392~398 명령·CI는 따라갈 수 있으나 버전·실제 출력 없음. L107~109 수치 출처 부족으로8상한. |
| D | 11 | L88~95·388~398↔ch05 L31~55·305~316 빌드와10회stress 반복. GDB ch06 L388~403은 역할 비교만이라 이 글 보고서·메모리모델 역할은 남는다. |
| E | 7 | happens-before·false positive·atomic/mutex를 다루나 추적 구현은 L49 한문장이고 오탐 분류 오류가 약속 이행을 약화. |
| F | 7 | L424 다음CI·L435~438 관련 대상과 후행 설명이 일치. 레이스보고서의 해석·수정 단계가 고유 구조를 제공. |
| G | 2 | L428~431 공식 링크는 있지만 suppression·비율·실행환경의 개별 근거 연결 부족. |

다음 조치: false positive 분류 정정·실제 빌드/보고서 보강. 병합 대상 없음.

## 공통 후속 조치

10편은 실행 환경과 주장별 출처 부족이 반복된다. 점수 차이1점은 평가자의 구간 내 판단이며 객관적인 확정값으로 읽지 않는다. 더 큰 변화는 debugpy 오류 게이트 철회와 atomic 예제의 신규 오류 확인이다. 수정·병합·draft 전환은 이번 검토 범위에 포함하지 않았다.
