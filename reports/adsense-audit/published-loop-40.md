# 공개 글 AdSense 평가 — 루프 40

> 대상: 공개 글 10편 (Practical RTOS Internals `seriesOrder` 52, Python Debugging `seriesOrder` 1~5, Sanitizers `seriesOrder` 1~4)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 마흔 번째 루프다. 대상은 `src/content/blog/embedded/rtos/practical-internals/`의 마지막 글 part5-07(PREEMPT_RT) 1편, `src/content/blog/tools/debugging/python/`의 chapter01~chapter05(pdb, debugpy, asyncio, py-spy, faulthandler·tracemalloc) 5편, `src/content/blog/tools/debugging/sanitizers/`의 chapter01~chapter04(개요, ASan·UBSan, LSan, TSan) 4편이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `practical-internals/part5-07-preempt-rt-linux.md` | 12 | 12 | 7 | 10 | 7 | 5 | 1 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `python/chapter01-pdb-basics.md` | 10 | 12 | 7 | 14 | 7 | 5 | 2 | **57** | 오류 확인 | 우선 조치 | 높음 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `python/chapter02-debugpy-ide.md` | 12 | 11 | 6 | 12 | 6 | 7 | 2 | **56** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `python/chapter03-asyncio.md` | 11 | 9 | 6 | 12 | 6 | 6 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `python/chapter04-py-spy.md` | 11 | 12 | 7 | 13 | 8 | 5 | 2 | **58** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `python/chapter05-faulthandler-tracemalloc.md` | 11 | 11 | 6 | 12 | 7 | 5 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `sanitizers/chapter01-intro.md` | 11 | 11 | 6 | 10 | 7 | 6 | 2 | **53** | 미검증 | 보강 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `sanitizers/chapter02-asan-ubsan.md` | 12 | 13 | 8 | 11 | 7 | 7 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `sanitizers/chapter03-lsan-leaks.md` | 11 | 12 | 7 | 10 | 6 | 7 | 2 | **55** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `sanitizers/chapter04-tsan.md` | 12 | 12 | 7 | 11 | 7 | 7 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 55.7점(10편, 합 557점), 범위 52~60점이다. 판정은 우선 조치 7편, 병합 검토 2편(python ch04, sanitizers ch03), 보강 1편(sanitizers ch01)이고 유지·검증 대기·제외 검토는 없다. 점수 구간으로는 sanitizers ch02(60점)만 보강이고 나머지 9편은 병합 검토(40~59)이며, sanitizers ch01은 시리즈 첫 글(허브)이라 루브릭 5절에 따라 보강으로 두었다. 오류 확인은 7건(part5-07, python ch01·ch02·ch03·ch05, sanitizers ch02·ch04)이다. python ch03은 CPython 3.15.0 `asyncio/runners.py`를 열고 실행해 확인했고, python ch01은 예제 코드를 Python 3.15.0에서 실행해 산문과의 모순을 확인했다. 나머지 5건은 원문 내부 모순·산술 불일치다. '검증됨'은 없다. 10편 모두 git log에 1차 자료 대조 커밋이 없다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `practical-internals/part5-07-preempt-rt-linux.md` | 56 | 54 | -2 | 없음 |
| `python/chapter01-pdb-basics.md` | 58 | 57 | -1 | 없음 |
| `python/chapter02-debugpy-ide.md` | 56 | 56 | 0 | 없음 |
| `python/chapter03-asyncio.md` | 52 | 52 | 0 | 없음 |
| `python/chapter04-py-spy.md` | 58 | 58 | 0 | 없음 |
| `python/chapter05-faulthandler-tracemalloc.md` | 54 | 54 | 0 | 없음 |
| `sanitizers/chapter01-intro.md` | 54 | 53 | -1 | 없음 |
| `sanitizers/chapter02-asan-ubsan.md` | 60 | 60 | 0 | 없음 |
| `sanitizers/chapter03-lsan-leaks.md` | 54 | 55 | +1 | 없음 |
| `sanitizers/chapter04-tsan.md` | 58 | 58 | 0 | 없음 |

- 기각한 오류 확인은 없다. 평가자가 올린 오류 확인 4건(part5-07 177~178행 vs 187행, python ch03 206~207·210행, python ch05 100~101·110행, sanitizers ch04 174·190행 vs 205행)은 원문에서 다시 확인했고 모두 성립한다.
- 추가한 오류 확인 3건(AP-C-24: 평가자가 보고도 불확실로만 남긴 내부 모순):
  - python ch01: 213행은 `import sys, pdb`만 하는데 216행이 `traceback.print_exception`을 부른다. Python 3.15.0에서 그대로 실행하면 NameError가 나고 217행 `pdb.post_mortem`에 닿지 않아 222행 '자동으로 post-mortem 진입'과 모순된다. 판정 병합 검토 → 우선 조치.
  - python ch02: 174행 uvicorn 디버그 설정 `"args": ["main:app", "--reload"]`와 179행 '`--reload`는 보통 디버거와 충돌하므로 단일 워커로 디버깅'(145·241행도 같은 방향)이 동시에 맞을 수 없다. 판정 병합 검토 → 우선 조치.
  - sanitizers ch02: 27행 '둘 중 하나라도 빠지면 빌드는 되지만 동작이 이상해집니다'와 30~32행 '링크에 없음 → undefined symbol'(링크 실패)이 같은 경우를 다르게 말한다. 판정 보강 → 우선 조치.
- part5-07은 오류 확인 근거를 하나 더했다: 276행 'soft RT (10 µs - 1 ms deadline)'과 112·117·130·328행 worst case 100-300 µs. A 13→12, B 13→12(결정 기준 자체가 본문 수치와 모순), 합계 56→54.
- python ch01 C 8→7: 예외 자동 진입 코드가 실행되지 않음을 확인해 1점 감점. confidence 중간→높음.
- sanitizers ch01 F 7→6: 시리즈 허브인데 로드맵 226~232행의 Ch 2~5에 링크가 하나도 없다(chapter03~05 존재·발행). 루브릭 5절 허브 기준을 F에 반영했다.
- sanitizers ch03 E 5→6: 제목 키워드 중 'Stop-the-world' 하나만 빠졌으므로 루브릭 E의 '하나를 거의 다루지 않음' 6~8 구간 하단이다. B 근거에서 1차 자료 위치가 없는 '보수적 스캔 미검출 한계 누락'은 AP-C-31에 따라 감점 사유에서 뺐다(점수 12 유지). 최종이 1차보다 1점 높지만 루브릭 문구 적용을 바로잡은 것이라 부풀림은 아니다.
- 줄 번호 보정(점수 영향 없음): part5-07 D(IE ch11 92~98·148행), python ch02 D(chapter01 103~105행), python ch03 D(chapter05 139~144행, chapter01 226~236행), python ch05 D(memory ch05 316~328·330행), sanitizers ch01 D(valgrind ch01 41~49·53행), sanitizers ch02 D(ch01 84~95행, ch03 90~101·146~181행), sanitizers ch03 D(ch02 181~205행, ch01 183~187행, ch05 469~477행), sanitizers ch04 C·D·series_issues(131~149행, ch05 305~316·303·468·497행, GDB ch06 390~402행, ch01 52·54행).
- 부풀림 판정은 10편 모두 없음이다.

## 글별 근거

### `practical-internals/part5-07-preempt-rt-linux.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 모순 두 건. (1) 177~178행은 PREEMPT_RT Linux 위 산업 PLC 구성에 'EtherCAT slave (1-10 µs cycle)'을 적었는데, 187행은 같은 EtherCAT slave를 '1 ms cycle'로 적고 PREEMPT_RT latency budget 안에 든다고 한다. 글 스스로 PREEMPT_RT worst case를 100-300 µs(112·117·130행)로, '수 µs hard RT는 여전히 RTOS의 영역'(120행)으로 적었으므로 1-10 µs 주기와 PREEMPT_RT 적용은 동시에 참일 수 없다. (2) 276행은 PREEMPT_RT 선택 조건을 'soft RT (10 µs - 1 ms deadline)'으로 적었는데, 같은 글의 worst case 100-300 µs(112·117·130·328행)로는 10 µs deadline을 맞출 수 없다. git log(0e21b56c·5cf58b6b·2bb21c78 집필, 85a2d46f 번역투 수정·발행, ce78221e 코드블록 정리, ac24bb76 제목 변경, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | PREEMPT_RT와 Xenomai 4/EVL 8항목 비교표(158~169행)와 RTOS·PREEMPT_RT·Hybrid 결정 기준(264~288행)이 이 글의 고유한 틀이다. 그러나 결정 기준 자체가 276행(10 µs deadline)과 120행(수 µs는 RTOS)으로 어긋나고, threaded IRQ·sleeping spinlock·hrtimer·RCU 절(35~101행)은 입문 요약 수준이다. PLC·자동차·ROS 2 사례(173~218행)는 회사·차종 이름 나열뿐이고, 305행 '기대 동작이 달라지므로 코드 의도를 검증해야 합니다'는 구체 주장 대신 쓴 완곡 표현이다. 일반론 비중이 커서 6~12 구간 상단으로 봤다. |
| B | 12 | mainline 합류(24~33행) → 핵심 변경 4가지(35~101행) → cyclictest(103~120행) → Xenomai/EVL(122~171행) → 적용 사례(173~230행) → 튜닝·Yocto(232~262행) → 결정 기준(264~288행) → 함정(290~321행) → 정리(323~334행)로 흐름은 완성됐다. 다만 hrtimer 절(78~87행)은 코드 4줄과 두 문장, RCU·NO_HZ 절(89~101행)은 불릿뿐이고, 튜닝 절(232~252행)은 단계별 이유가 없다. 핵심 결론인 결정 기준(276행)이 본문 수치와 모순되고 정확성 불확실(66·305·321행)이 열려 있어 B 13 상한 아래로 둔다. |
| C | 7 | cyclictest 명령·출력(105~110행), 튜닝 명령(234~250행), Yocto 설정(256~260행)이 있다. 그러나 108~109행 출력과 114~118행 latency 표에 보드·커널 버전·부하 조건·출처가 없어 루브릭 3-1 '출처·측정 환경 없는 구체 수치는 C 8 이하'를 적용했다. 236행 kernel cmdline과 248~249행 C 함수 호출이 bash 블록에 섞여 그대로 실행할 수 없고, 321행 보호 수단 'RTLIMIT'은 절차가 없다. |
| D | 10 | 같은 시리즈: part5-06-nuttx.md(seriesOrder 51)는 NuttX 분석이라 겹치지 않는다. part5-05-selection-guide.md 71·210·235행은 PREEMPT_RT를 선택지로 한 줄씩 언급할 뿐이다. part1-01-why-rtos.md 129·134행은 이 글 20·120행과 같은 결론(6.12 merge, µs-deterministic은 RTOS)을 짧게 쓴다. 다른 시리즈: industrial-ethernet/chapter11-linux-realtime.md 47~55행(6.12 mainline, Xenomai 4/EVL)이 이 글 24~33·122~139행과, 92~98행(isolcpus·nohz_full·rcu_nocbs 표)이 이 글 234~236행과, 148행 이후 cyclictest 절이 103~112행과 겹친다. modern-recipes/part7-13-irq-affinity.md 231~233행은 PREEMPT_RT threaded IRQ를 upstream 소스로 이 글 35~57행보다 깊게 다룬다. performance-engineering/part1-05-realtime.md 115~123행 cyclictest가 이 글 103~112행과 겹친다. 'RTOS냐 PREEMPT_RT냐' 선택이라는 역할은 구별되므로 10~14 구간 하단. |
| E | 7 | 제목의 Mainline 6.12(24~33행)·Xenomai 4·EVL(122~171행)과 description의 threaded IRQ(35~57행)·sleeping spinlock(59~76행)·cyclictest(103~120행)·RTOS 선택 기준(264~288행)이 모두 본문에 있다. 대상 독자가 명시되지 않았고, 14행 'Linux를 real-time 운영체제로 바꿉니다'가 296행 'PREEMPT_RT는 soft RT입니다'와 결이 달라 9점 이상은 주지 않았다. |
| F | 5 | seriesOrder 52이고 시리즈 디렉터리 53편 중 최대 seriesOrder가 52라 마지막 글이며, 334행 마무리 문장이 다음 편 안내를 대신한다. 관련 항목 338~341행 네 링크를 열어 보니 part1-01-why-rtos('RTOS가 필요한 이유'), part4-07-smp-rtos('SMP RTOS 설계'), part5-05-selection-guide('RTOS 선택 가이드'), part5-06-nuttx('Apache NuttX 분석')로 라벨과 맞다. 그러나 334행 'Part 1부터 Part 5까지 60+ 편'은 실제 53편(00-preface 포함, seriesOrder 0~52)과 다른 편수 표기라 내비게이션 결함으로 5점 이하를 적용했다. 전제 지식 안내도 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 커널 버전 6.12(31·162행)만 있고 114~118행 latency 표, 191행 차종, 216행 채택 기업에 출처가 없다. EVL 코드(141~154행)는 libevl 버전이, Yocto 설정(256~260행)은 Yocto 릴리스 이름이 없다. |

uncertainties:
- 66행 'mainline spin_lock은 IRQ는 막힘': spin_lock()은 IRQ를 끄지 않고 spin_lock_irqsave 계열이 끈다는 기억과 다르다. 커널 문서로 확인하지 않았다.
- 305행 'PREEMPT_RT에서는 spin_lock이 mutex가 되어 sleep이 허용': RT에서도 spinlock_t 구간 안의 msleep은 허용되지 않는다는 기억과 다르다(Documentation/locking/locktypes.rst로 확인 필요).
- 321행 'RTLIMIT'은 확인하지 못한 이름이다. RLIMIT_RTTIME이나 sched_rt_runtime_us를 뜻한 것으로 보인다.
- 259행 'KERNEL_FEATURES_append'는 최근 Yocto ':append' 문법과 다르고, 262행 'Yocto 6.12+'는 Yocto 릴리스가 아니라 커널 버전이다. 확인하지 않았다.
- 28행 '2004 Ingo Molnar (Red Hat) 시작', 30행 '2023 대부분 mainline merge' 연표는 1차 자료로 확인하지 않았다.
- 118행 'Cortex-M4 FreeRTOS IRQ latency 80-100 ns', 137행 'Xenomai/EVL worst case ~10 µs', 112행 '튜닝된 PREEMPT_RT 100-300 µs'는 출처 없는 수치다. industrial-ethernet ch11 412행은 '50µs 이하면 production-ready'로 수치가 어긋난다(다른 글과의 모순이라 오류 확인에 넣지 않음).
- 137·163행은 Xenomai/EVL worst case를 '~10 µs'로, 329행 정리는 '수 µs hard RT 보장'으로 적어 표현이 다르다. 근사 표현 차이일 수 있어 오류 확인에 넣지 않았다.
- 191행 BMW iX·Tesla Model 3·Mercedes EQS·IONIQ 5의 PREEMPT_RT ECU 사용, 216행 Universal Robots·Boston Dynamics·KUKA 채택은 출처가 없다.
- 147행 EVL_T_WOSS 주석 'warn on out-of-band switch'와 156행 'warn on switch' 설명이 조금 다르다. libevl 문서로 확인하지 않았다.
- 오류 확인 근거 (1)에서 178행 '1-10 µs'가 cycle이 아니라 jitter를 뜻했을 가능성은 배제하지 못했다. 근거 (2)(276행)는 표현 그대로 성립한다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간(병합 검토)으로 보면 `src/content/blog/embedded/industrial-ethernet/chapter11-linux-realtime.md`가 mainline·isolcpus·cyclictest를 더 실전적으로 다루지만, 이 글은 RTOS 시리즈 마지막 글로 'RTOS냐 PREEMPT_RT냐'를 고르는 독립 검색 의도가 있어 병합 대상 없음으로 둔다. 다음 조치는 보강: 177~178행 vs 187행 EtherCAT 주기와 276행 deadline 범위를 1차 자료로 고치고, 114~118행 수치에 출처·환경을 붙이거나 TBD로 둔다. 334행 편수를 바로잡고, 겹치는 튜닝·cyclictest 절은 industrial-ethernet ch11로 링크한다.

### `python/chapter01-pdb-basics.md` — 57점, 우선 조치

confidence: 높음

factcheck: 오류 확인. git log -- 파일에는 0a9dd7bc(slug 고정), be973200(topics 메타데이터), ac24bb76(제목 변경·날짜 정규화) 등 일괄 커밋만 있고 1차 자료 대조 커밋은 없다. 오류 확인 근거는 글 안의 코드와 산문이다. 212~220행 excepthook 예는 213행에서 `import sys, pdb`만 하는데 216행이 `traceback.print_exception`을 부른다. 222행은 이 코드로 '어떤 미처리 예외에서든 자동으로 post-mortem 진입'한다고 쓴다. 이 코드를 그대로 Python 3.15.0에서 실행해 보니(1/0 추가) `NameError: name 'traceback' is not defined`가 난 뒤 원래 예외만 출력됐고 217행 pdb.post_mortem까지 가지 못했다. 코드(213·216행)와 산문(222행)이 동시에 참일 수 없다(루브릭 3-1).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 명령 표(37~52행), 진입 방법 셋(56~93행), 브레이크포인트 문법(97~114행), display(183~193행)는 pdb 문서의 명령 목록을 옮긴 수준이다. 이 글만의 내용은 GDB 대응(35·54·181행), SIGUSR1로 외부에서 진입하는 예(224~239행), PYTHONBREAKPOINT=0으로 디버그 코드를 지우지 않고 끄는 관점(152~157행) 정도다. 한계 절(241~246행)은 근거 없는 한 줄 단정이고 선택 기준·실패 사례가 없어 6~12 구간. |
| B | 12 | breakpoint()(15행) → 명령 표(37행) → 진입 방법(56행) → 브레이크포인트(95행) → 변수 조작(116행) → ipdb(136행) → 콜스택(159행) → display(183행) → 패턴(195행) → 한계(241행) → 정리(248행)로 description(5행)의 breakpoint()·핵심 명령·ipdb·postmortem을 모두 다룬다. 다만 212~220행 코드가 실행되지 않는 오류가 확인됐고 243행 GIL 설명, 246행 header 옵션 등 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 실행 명령과 기대 출력이 있다: 진입 화면(28~33행), python -m pdb(64~70행), BP 목록(107~110행), w/u/d(161~179행), display(185~191행). 그러나 환경은 15행 'Python 3.7+'뿐이고 출력이 실제 실행 결과라는 표시가 없어 C ≤ 8. 여기에 212~220행 예외 자동 진입 예가 그대로는 NameError로 실패함을 실행으로 확인했고, 30행 출력 줄 번호(4)는 21~22행 예제와 맞지 않을 가능성이 있어 8에서 1점 더 뺐다. 측정·트레이드오프 기록 없음. |
| D | 14 | 같은 시리즈 chapter02-debugpy-ide.md는 debugpy·DAP·IDE attach를 다루고 pdb는 13행 비교와 197~202행 %pdb 매직뿐이다. chapter05-faulthandler-tracemalloc.md 252·264행은 pdb/ipdb를 표 한 줄로만 언급한다. src/content/blog 전체에서 breakpoint()·PYTHONBREAKPOINT·post_mortem을 grep하면 python 시리즈 외에는 kernel/chapter05-kdb-kgdb.md(138·168·308행, kgdb_breakpoint로 주제 다름)뿐이다. GDB 명령 대응 설명(35·54·181행)이 gdb-lldb 시리즈와 개념상 겹쳐 14. |
| E | 7 | 제목(2행) 'pdb 기본 사용법과 breakpoint() 빌트인'과 description(5행)의 항목이 15~54행, 136~157행, 74~93·210~222행에서 이행된다. 다만 description이 약속한 postmortem 중 210~222행 excepthook 예는 그대로 동작하지 않는다. 대상 독자나 풀려는 구체 문제가 드러나지 않아 9 이상은 주지 않았다. |
| F | 5 | 259행 다음 장 예고(Ch 2 debugpy)는 seriesOrder 2인 chapter02-debugpy-ide.md(제목 'debugpy 활용 — VSCode·PyCharm·원격 attach 통합')와 맞고 263행 라벨도 맞다. 264행 'GDB Ch 9: Python 스크립팅'은 gdb-lldb/chapter09-python-scripting.md(seriesOrder 9, 'GDB·LLDB Python 스크립팅')와 맞다. 244행 'Ch 3에서 다룸'은 chapter03-asyncio.md와 맞다. 그러나 239행 '다음 장의 py-spy'는 다음 장(Ch 2)이 아니라 seriesOrder 4인 chapter04-py-spy.md라 잘못된 장 안내로 F ≤ 5. 전제 지식 안내 없음. |
| G | 2 | 265~266행 pdb 공식 문서·ipdb GitHub 링크는 관련 항목 목록에만 있고 본문 주장(79행 -c continue, 152행 PYTHONBREAKPOINT=0, 246행 header 옵션)에 연결되지 않는다. 버전 표기는 15행 'Python 3.7+' 하나이고 ipdb 버전·실행 환경이 없다. |

uncertainties:
- 30행: 18~23행 예제에서 breakpoint()는 함수 4번째 줄이고 정지 후 표시되는 다음 줄 `total += item.value`는 5번째 줄인데 출력은 script.py(4)다. 167행은 같은 줄을 process.py(5)로 쓴다. script.py 전체가 예제와 같다고 글이 밝히지 않아 오류 확인에는 넣지 않았다.
- 243행: 다른 스레드가 계속 도는 원인을 'GIL 때문'이라 단정했다. pdb가 현재 스레드만 추적하는 구조 때문인지 1차 자료로 확인하지 않았다.
- 246행: set_trace의 header 인자가 큰 객체 출력 문제의 대책이라는 설명의 근거 미확인.
- 190행: display 출력 형식 `[old: 0]`이 실제 출력과 같은지 미확인.
- 127행: `!` 접두사가 대입에 '필요'하다는 서술(이름이 명령과 겹치지 않으면 접두사 없이 실행될 수 있음)을 pdb 문서로 확인하지 않았다.
- 50행: `locals()`는 pdb 명령이 아니라 파이썬 표현식인데 명령 표에 들어 있다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간(병합 검토)으로 봐도 병합 대상 없음: pdb·breakpoint()를 다루는 다른 공개 글이 없고 chapter02·05가 이 글을 Ch 1로 링크한다(시리즈 첫 글). 다음 조치는 213행에 traceback import 추가, 30행 출력 줄 번호 정정, 239행 '다음 장'을 Ch 4로 정정, 243·246행 설명을 docs.python.org pdb 문서로 확인하거나 삭제, 실행 환경을 밝힌 실제 출력으로 교체.

### `python/chapter02-debugpy-ide.md` — 56점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log -- 파일에는 0a9dd7bc(slug 고정), be973200(topic 메타데이터), ac24bb76(제목 일괄 변경) 등 일괄 커밋만 있고 1차 자료 대조 커밋은 없다. 오류 확인 근거는 글 안의 코드와 산문 모순이다. 167~177행 'FastAPI / uvicorn' 디버깅 설정은 174행 `"args": ["main:app", "--reload"]`로 리로더를 켜는데, 바로 아래 179행은 '`--reload`는 보통 디버거와 충돌하므로 단일 워커로 디버깅'이라 하고, 145행('자동 리로드를 하므로 디버거가 잘 안 붙습니다')과 241행(해법 '--no-reload')도 리로드를 끄라고 한다. 같은 글이 내놓은 디버그 설정과 같은 글이 밝힌 동작이 동시에 맞을 수 없다. 1차 자료는 열지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | launch.json 세 구성(19~52행), launch/attach 구분(54~57행), justMyCode(95~101행), 조건부 BP 표(107~111행)는 VSCode Python 디버깅 문서 수준이다. 이 글만의 것은 gunicorn 워커 포트 충돌과 pid 기반 포트(133~139행), 프레임워크별 리로더 끄기(147~193행), listen 포트 무인증 경고와 SSH 터널·환경 변수 gating(207~222행), 증상별 문제 표(236~243행)다. 항목마다 설정 조각과 한 문장뿐이라 선택 기준·실패 분석이 없고, 179행 '보통 디버거와 충돌'은 이유 없이 끝난다. 앵커 part6-09(10)보다 실전 항목이 조금 많아 12점. |
| B | 11 | launch → attach → 컨테이너 → justMyCode → BP → 멀티프로세스 → 프레임워크 → Jupyter → 보안 → DAP → 문제 표 → 정리(15~252행) 흐름은 끝까지 간다. 빠진 것: 137행 pid 기반 포트에 42행 고정 포트 attach 설정으로 어떻게 붙는지 없음, 141행 '--multiprocess 옵션'이 어디에 주는 옵션인지 없음, 174행 설정이 179행 권고와 반대(오류 확인), 제목의 PyCharm은 설정·절차 없음(13·226·247행 언급뿐). 내부 모순과 열린 정확성 불확실이 있어 AP-C-24에 따라 B ≤ 13, 11점. |
| C | 6 | launch.json(19~52행), Dockerfile(84~89행), ssh 터널(212~215행), 프레임워크 설정(156~190행)은 그대로 쓸 수 있는 형태다. 그러나 debugpy·VSCode Python 확장·Flask·uvicorn 버전 등 환경이 없고, attach 성공·실패 시 관찰 결과가 없다(236~243행 문제 표도 증상·해법만). 174행 설정은 179행에 따르면 그대로 쓰면 디버거와 충돌한다. 관찰 결과나 기대 관찰을 적은 절차가 없어 AP-C-24상 C ≥ 10 불가, 4~7 구간. |
| D | 12 | 같은 시리즈: python/chapter01-pdb-basics.md 103~105행은 콘솔 pdb 조건부 BP·ignore를 다루고 이 글 107~111행은 IDE 쪽이라 역할이 구별된다. python/chapter03-asyncio.md 136~150행 'debugpy + asyncio'는 launch 설정 한 조각만 이 글 19~30행과 겹친다. 다른 시리즈: gdb-extension/chapter05-mi-dap-protocol.md 429~434행 'VSCode ─DAP─> debugpy'가 이 글 78~80행과 같은 형태, 같은 글 439~441행 nvim-dap 설정이 이 글 224~232행과 주제가 겹친다. gdb-lldb/chapter10-tui-frontends.md 167행·227~232행('DAP — 표준 프로토콜의 의미')이 이 글 226·247·252행의 '공용 어댑터' 주장과 같다. 겹침은 DAP 개념 몇 줄이고 debugpy attach·컨테이너·프레임워크·보안은 사이트에 이 글뿐이라 10~14 구간. |
| E | 6 | 제목 'debugpy 활용 — VSCode·PyCharm·원격 attach 통합'과 description(5행 'IDE 디버깅, 원격 프로세스 attach, justMyCode, 멀티프로세스')의 VSCode·원격 attach·justMyCode·멀티프로세스는 15~141행에서 다룬다. 제목 키워드 PyCharm은 13·226·247행 한 문장씩뿐이고 설정·절차가 없다. 키워드 하나 부분 미이행이라 6~8 구간 하단 6점. |
| F | 7 | 256행 'Ch 3 — asyncio 디버깅'은 같은 디렉터리 seriesOrder 3 chapter03-asyncio.md('asyncio 디버깅 — 짧은 콜스택과 slow callback 추적')와 맞고 예고 내용도 그 글 13행과 맞는다. 260행 chapter01-pdb-basics(seriesOrder 1, 'pdb 기본 사용법…'), 261행 chapter03-asyncio, 262행 gdb-lldb/chapter10-tui-frontends(seriesOrder 10, 'GDB·LLDB TUI와 프런트엔드', 227행 DAP 절)를 열어 라벨과 대상이 맞음을 확인했다. 113행 'GDB Ch 5의 commands silent printf'는 gdb-lldb/chapter05-breakpoints-watchpoints.md 76~83행과 맞지만 링크와 시리즈 이름이 없다. 전제 지식 안내가 없고 78~80행 구조도가 text 코드 블록이라 8은 주지 않음. 모바일 확인이 없어 9 이상 불가. |
| G | 2 | 본문 출처는 debugpy GitHub 저장소 링크(13·263행)뿐이고 개별 주장(98행 justMyCode 기본값, 117~123행 subProcess, 73행 debugpy.breakpoint 동작, 207행 '인증 없음')에 연결된 문서 위치가 없다. debugpy·VSCode 확장·Flask·uvicorn 버전 표기가 없다. 2~3 구간 하단. |

uncertainties:
- 13·226·247행: PyCharm이 debugpy를 어댑터로 쓴다는 주장. PyCharm은 자체 pydevd 기반 디버거로 기억하나 JetBrains 문서로 확인하지 않았다.
- 141행: '--multiprocess 옵션'이 debugpy CLI 옵션인지 미확인(debugpy README와 대조 필요).
- 117~123행: subProcess 자동 attach 대상(multiprocessing·subprocess·os.fork)과 기본값 미확인.
- 133행: '각 워커가 자기 포트로 서버를 띄우므로 포트 충돌'은 문장 자체가 어색하다(자기 포트면 충돌이 없음, 같은 포트를 다시 listen한다는 뜻으로 보임). 또 137행 pid 기반 포트에 42행 고정 포트 설정으로 붙는 방법이 없다.
- 161행: FLASK_ENV 환경 변수는 Flask 최신 버전에서 제거된 것으로 기억하나 Flask 문서로 확인하지 않았다.
- 73행: debugpy.breakpoint()가 클라이언트가 없으면 그냥 통과한다는 동작 미확인.
- 98행: justMyCode 기본값 true, 240행 '가상환경 경로 확인' 원인 미확인.
- 175행: uvicorn 설정의 `"jinja": false` 항목의 의미 미확인.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간(병합 검토)으로 봐도 병합 대상 없음: debugpy attach·컨테이너·프레임워크·보안은 사이트에 이 글뿐이다. 다음 조치는 174행 `--reload` 제거(또는 179행 설명과 맞춤) 뒤 재채점, PyCharm 절차 추가 또는 제목에서 제외, 버전 표기.

### `python/chapter03-asyncio.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log에는 1차 자료 대조 커밋이 없다(0a9dd7bc slug 고정, be973200 topic 메타데이터, ac24bb76 제목 변경 등). 1차 자료: CPython 3.15.0 `asyncio/runners.py` run() docstring "This function always creates a new event loop and closes it at the end."를 직접 열었고, 같은 환경에서 `asyncio.run(main())`을 연달아 두 번 실행해 둘 다 1을 반환(예외 없음)하는 것을 재확인했다. 원문 206~207행은 두 번째 asyncio.run이 "RuntimeError: Event loop is closed"를 낸다고 하고 210행은 "여러 번 호출하면 에러"라고 적어 1차 자료·실행 결과와 맞지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 것은 asyncio.all_tasks()+get_stack()을 SIGUSR1에 묶어 외부에서 태스크 콜스택을 덤프하는 조합(106~134행)과 버그 패턴 네 가지(151~217행) 정도다. debug=True·PYTHONASYNCIODEBUG(33~60행), never awaited(62~80행), to_thread·run_in_executor(100~102행), aiomonitor(219~238행), yappi(240~257행)는 asyncio-dev 문서와 도구 README 목록 수준이다. 29행 '없을 수 있습니다', 166행 '모호' 같은 완곡 표현이 구체 동작 설명을 대신하고 선택 기준·실패 사례 분석이 없어 6~12 구간이다. |
| B | 9 | 도입(13행) → 도구 → 버그 패턴 → 정리(259~268행) 흐름은 있지만 절마다 코드 한 조각과 한두 문장이다. description(5행)의 'race condition'은 본문에 절이 없다. 50행 '컨텍스트 누수 검출'은 설명이 없다. 48행은 never awaited 경고를 debug 모드 효과로 적고 76행은 '디버그 모드든 아니든 뜬다'고 해 설명이 엇갈린다. 정확성 불확실(29·174·191행)이 열려 있어 5~9 구간. |
| C | 6 | 실행할 수 있는 명령·코드(36·42·79·130·232~235·249~254행)와 예시 출력(52~58·72~74·94~96행)은 있지만 Python 버전·실행 환경이 없고 실제 실행 출력인지 알 수 없다. 88행 '500 ms', 95행 '0.523 seconds'는 출처·환경 없는 수치라 C ≤ 8 상한이 걸린다. 206~207행 예시는 실행하면 글과 다른 결과가 나온다. 합격·실패 관찰을 가르는 검증 절차가 없어 4~7 구간. |
| D | 12 | 같은 시리즈 인접 글: chapter02-debugpy-ide.md는 asyncio를 256행 다음 장 예고와 261행 링크에서만 언급해 겹침이 없다. chapter04-py-spy.md 121~123행(py-spy의 asyncio 콜스택 재구성)은 이 글 29행 짧은 콜스택 주제와 닿지만 도구가 달라 구별된다. 시리즈 다른 글: chapter05-faulthandler-tracemalloc.md 139~144행(PYTHONTRACEMALLOC=10이 never awaited 경고에 생성 위치를 붙임)이 이 글 76~80행과 같고, 05의 267행 '비동기 버그 → PYTHONASYNCIODEBUG=1 + Task.get_stack()'이 이 글 261·264행을 반복한다. chapter01-pdb-basics.md 226~236행 SIGUSR1 pdb 진입은 이 글 120~127행과 같은 시그널 패턴이지만 목적이 다르다. 다른 시리즈에서 asyncio를 주제로 다루는 published 글은 찾지 못했다(cocotb 글은 시뮬레이터 주제). 공통 설명 일부 반복으로 10~14 구간. |
| E | 6 | 제목(2행)의 '짧은 콜스택'(15~31행)과 'slow callback'(82~102행)은 절이 있다. description(5행) 네 키워드 중 'race condition'은 본문에 없어 부분 미이행이다. 짧은 콜스택 설명(29행) 자체가 불확실 목록에 있어 6~8 구간 하단. |
| F | 6 | 272행 다음 장 예고(Ch 4 py-spy)는 실제 seriesOrder 4 chapter04-py-spy.md('py-spy 운영 분석 — 코드 수정 없이 프로세스 검사')와 맞다. 276~278행 내부 링크 세 개를 열어 대조: chapter02-debugpy-ide.md, chapter04-py-spy.md, gdb-lldb/chapter06-multithread-multiprocess.md('멀티스레드·멀티프로세스 디버깅 — Non-Stop·Scheduler-Locking·Fork')로 slug·라벨이 맞는다. 279행 PEP 567은 본문이 contextvars를 다루지 않아 연결 근거가 약하다. 정리·예고·관련 항목은 템플릿 요소라 가점 근거가 아니고, 전제 지식 안내가 없으며 '활성화되면.'(45행), '해법.'(98행) 같은 끊긴 문장이 흐름을 끊는다. |
| G | 2 | 본문 안 출처는 221행 aiomonitor GitHub 링크 하나이고 버전이 없다. asyncio 디버그 모드 문서(280행)와 PEP 567(279행)은 관련 항목 목록에만 있어 49행 100 ms 기준, 47~50행 효과 목록과 연결되지 않는다. Python·aiomonitor·yappi 버전 표기가 없어 2~3 구간 하단. |

uncertainties:
- 29행: 실행 중인 코루틴에서 정지하면 호출자 handle 프레임이 콜스택에 없을 수 있다는 설명. await 체인은 send()로 이어져 실행 중에는 호출자 프레임도 스택에 있다고 기억하지만 1차 자료로 확인하지 않았다.
- 174행: fire-and-forget 태스크 예외가 '어디서도 보고되지 않는다'는 단정과 GC 시 'Task exception was never retrieved' 로그의 관계는 확인하지 않았다.
- 178행: done callback에서 t.exception()을 부르면 취소된 태스크에서 CancelledError가 날 수 있다. 확인하지 않았다.
- 191행: finally 안의 await가 cancellation 중 '즉시 CancelledError'라는 설명. 한 번 취소된 뒤 finally의 await는 다시 취소되지 않으면 정상 진행한다고 기억하지만 문서로 확인하지 않았다.
- 48행(never awaited 경고를 debug 모드 효과로 나열)과 76행('디버그 모드든 아니든 뜬다')이 엇갈리지만, 둘 다 참으로 읽을 여지가 있어 오류 확인 근거로 쓰지 않았다.
- 49행 100 ms는 CPython 3.15.0 slow_callback_duration = 0.1로 확인했으나 글의 기준 Python 버전이 없다.
- 227행 aiomonitor.start_monitor(loop=...) 시그니처, 232행 'python -m aiomonitor.cli', 233~235행 명령 이름은 현재 릴리스로 확인하지 않았다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간(병합 검토)으로 봐도 병합 대상 없음: 다른 시리즈에 asyncio 디버깅 공개 글이 없다. 다음 조치는 206~210행 asyncio.run 설명을 runners.py 기준으로 고치고, description의 race condition을 본문에 넣거나 빼고, Python 버전을 밝힌다.

### `python/chapter04-py-spy.md` — 58점, 병합 검토

confidence: 중간

factcheck: 미검증. git log --follow -- 이 파일: 218652df(시리즈 신규 작성), 35e57912(디렉터리 이름 변경), 400892d7(린터 일괄 수정), 3a5602d3(HBM 커밋에 섞인 린터 변경), ac24bb76(제목 이름 변경·날짜 정규화), be973200(topics 메타데이터), 0a9dd7bc(slug 고정). py-spy README·upstream 소스, Linux Yama 문서와 대조했다는 커밋이 없다. 평가 중 1차 자료를 열지 않았고, 원문 안에서 두 구체 진술이 동시에 참일 수 없는 모순은 찾지 못했다(123행과 182·205행의 긴장은 uncertainties로 둔다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 설치(17~28행), 세 모드(32~91행), --subprocesses(116행), --idle/--gil(128~129행), --native(137행), attach vs spawn(167~168행)은 py-spy README의 명령 목록을 순서대로 옮긴 수준이다. 이 글만의 것은 hung gunicorn 진단의 콜스택 위치별 해석(109행: psycopg2 execute → DB 락, acquire_lock → 데드락, time.sleep → 백오프 확인), cProfile 비교표(175~182행), cron 정기 dump 스크립트(190~197행)다. 56행 '30초 안에 답합니다', 207행 '운영 환경의 첫 번째 디버깅 도구'는 근거 없는 단정이고, 언제 top/record/dump를 고르는지·샘플링 주기 같은 선택 기준은 없다. 앵커 part7-05(A 9)보다 해석 문단이 하나 더 있어 11점. |
| B | 12 | 설치 → 권한 → 세 모드 → 실전 진단(93~109행) → subprocess·asyncio·GIL·native → 권한 오류(142~162행) → cProfile 비교 → 정기 dump → 정리(201~207행)까지 기본 흐름은 완성됐다. 한계 설명이 약하다: 123행 asyncio는 'Python 3.11+ 이면 거의 정확'으로 끝나고, 13행 '오버헤드가 거의 0'·91행 '프로세스를 멈추지 않고'에 대해 샘플링 방식이나 지원 Python 버전 범위가 없다. 192~195행 cron은 /var/log/py-spy 생성·회전이 없다. 147행 오류 문구, 154행 ptrace_scope 값 설명 등 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 그대로 칠 수 있는 명령(42·61·75·103~106·116·137·158·167~168행)과 예시 출력(47~54행 top, 75~89행 dump)이 있다. 그러나 py-spy 버전·OS·커널 버전 같은 실행 환경이 없고, 예시 출력이 실제 실행 결과인지 표시가 없다. 33~37행 'py-spy --help' 출력은 한국어 설명으로 되어 있어 실제 출력이 아니다. 178행 'cProfile 오버헤드 20-100%, py-spy <1%'와 45행 '1초마다 갱신'은 출처·측정 환경 없는 구체 수치라 루브릭 3-1절 'C ≤ 8' 상한을 적용했다. 합격·실패 관찰을 가르는 검증 절차는 없다(109행은 해석 규칙만). 환경 표기가 있는 앵커 part7-05(C 8)보다 1점 낮게 7점. |
| D | 13 | 비교한 글: 같은 시리즈 인접 글 chapter03-asyncio.md(seriesOrder 3), chapter05-faulthandler-tracemalloc.md(seriesOrder 5), 시리즈 첫 글 chapter01-pdb-basics.md, 다른 시리즈의 py-spy 언급 글 tools/debugging/memory/chapter03-jemalloc-tcmalloc.md(211행 한 줄), tools/debugging/gdb-lldb/chapter01-intro-and-install.md(21행 링크 한 줄), tools/perf-flamegraph/(전 편 draft, py-spy 언급 없음). 겹침: 이 글 91행 'hung 프로세스 진단에 가장 빠른 첫 명령'·203행이 chapter05 57행('py-spy dump와 비슷하지만 프로세스 안에서')·244행·255행 표·265행('py-spy dump 먼저')·275행과 역할 비교 수준으로 겹친다. 이 글 123행 asyncio 콜스택 설명은 chapter03 104행 'Task.get_stack' 절, 240행 yappi 프로파일링과 주제가 닿지만 도구가 다르다. chapter01 13·239·245행, chapter03 272행은 py-spy를 다음 장 예고·대안으로만 언급한다. py-spy를 본격적으로 다루는 다른 공개 글이 없어 역할은 분명하다. |
| E | 8 | 제목(2행) '운영 분석 — 코드 수정 없이 프로세스 검사'와 description(5행) '콜스택 dump, 샘플링 프로파일링, flamegraph, 외부 attach'의 키워드를 72~91행(dump), 39~70행(top·record 샘플링), 58~70행(flamegraph), 164~171행(attach)이 각각 다룬다. 범위 불일치·과장은 없고, '운영 분석'은 93~109행 hung server 진단이 받친다. 대상 독자(운영 환경·Python 버전)가 명시되지 않고 실전 사례가 하나뿐이라 9점 이상은 주지 않았다. |
| F | 5 | 211행 다음 장 예고 'Ch 5(시리즈 마지막) — faulthandler, tracemalloc, objgraph'는 실제 seriesOrder 5 파일 chapter05-faulthandler-tracemalloc.md(제목 'Python faulthandler·tracemalloc·objgraph — 죽음과 누수 진단')와 맞고, 디렉터리에 seriesOrder 6 이상이 없어 '시리즈 마지막'도 맞다. 215행 'Ch 3: asyncio 디버깅'은 chapter03-asyncio.md(seriesOrder 3), 216행 'Ch 5'는 chapter05와 라벨이 맞다. 그러나 217행 '- perf + Flamegraph 시리즈'는 링크 없는 관련 항목이고 대상 tools/perf-flamegraph/는 전 편 draft라 연결할 공개 글이 없다. 루브릭 F는 링크 없는 관련 항목을 틀린 링크로 보므로 5점 이하. 정리·예고·관련 항목 꼬리(201~219행)는 시리즈 템플릿이라 가점 근거로 쓰지 않았다. |
| G | 2 | 본문 13·218행에 py-spy GitHub, 65·219행에 Brendan Gregg flamegraph 페이지 링크가 있다. 그러나 py-spy 버전, 대상 OS·커널 버전이 없고(77행 'Python v3.11.0'은 예시 출력 안의 값), 154행 ptrace_scope 값, 162행 macOS SIP, 178행 오버헤드 수치, 199행 'Datadog·Sentry가 py-spy 같은 샘플러를 씀' 같은 구체 주장에 연결된 1차 출처(Yama 커널 문서, py-spy README 절)가 없다. 출처는 있으나 주장과 연결이 약한 2~3 구간의 아래쪽. |

uncertainties:
- 13·91·203행 '프로세스를 멈추지 않고', '오버헤드가 거의 0': py-spy 기본 동작이 샘플마다 대상 프로세스를 잠시 멈추고 --nonblocking으로 끄는 구조인지 py-spy README로 확인하지 않았다(기억 기반 의심).
- 147행 'Error: Failed to find python process'가 권한 부족 시 실제 출력 문구인지 미확인.
- 154행 ptrace_scope '0 = 자유, 1 = 자식만, 3 = 차단': 값 2가 빠졌고 각 값의 의미를 Linux Yama 문서로 대조하지 않았다.
- 123행 '코루틴 콜스택도 재구성 — Python 3.11+ 이면 거의 정확'과 같은 행 'await로 떠난 코루틴은 안 잡힘'이 182행 표 'asyncio 자연스러움', 205행 'asyncio까지 합성'과 긴장 관계다. 어느 쪽이 맞는지는 py-spy 문서로 확인해야 한다.
- 33~37행 'py-spy --help' 출력이 한국어 설명으로 되어 있어 실제 출력이 아니다. 실제 서브커맨드 목록과 대조하지 않았다.
- 23행 macOS 'taskinfo for pid' 권한, 140행 dsymutil, 162행 SIP 설명은 미확인.
- 178행 cProfile 오버헤드 20-100%, py-spy <1%, 45행 '1초마다 갱신'은 출처·측정 환경 없는 수치.
- 199행 'Datadog·Sentry Profiling 제품도 py-spy 같은 샘플러를 씀'은 출처 없는 주장.
- 47~54행 top 예시와 75~89행 dump 예시가 실제 실행 출력인지 만든 예인지 표시가 없다.

병합 대상: 병합 대상 없음. 공개 글 중 py-spy를 본격적으로 다루는 다른 글이 없고(chapter05 57·255·265·275행, chapter01 13·239·245행, chapter03 272행, memory/chapter03 211행, gdb-lldb/chapter01 21행은 한두 줄 언급), 'py-spy로 운영 프로세스 진단'은 독립 검색 의도가 있다. 다음 조치: 보강. 사유: 독립 역할은 분명하지만 C(출처 없는 178·45행 수치, 실행 환경 부재, 33~37행 가짜 --help 출력), G(버전·1차 출처 부재), F(217행 링크 없는 관련 항목)가 점수를 끌어내렸다. 보강 전 py-spy README·upstream, Linux Yama 문서로 13·23·91·123·147·154행 주장을 대조하는 fact-check가 먼저다.

### `python/chapter05-faulthandler-tracemalloc.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치. 100~101행은 `for _ in range(1000): do_work()`로 1000사이클을 돌리고, 110행 예시 출력은 `size=+50.0 MiB (+1.0 MiB/cycle)`이라고 적었다. 50 MiB ÷ 1000 = 약 51 KiB/cycle이므로 1.0 MiB/cycle과 동시에 참일 수 없다(1.0 MiB/cycle이면 총 약 1000 MiB). 113행 산문 '한 사이클 돌릴 때마다 … 50KB씩'은 루프 횟수와는 맞지만 110행의 1.0 MiB/cycle과 어긋난다. git log(0a9dd7bc slug 고정, be973200 topic 메타데이터, fa55144d 링크 일괄 수정 등)에는 1차 자료와 대조한 fact-check 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | faulthandler enable/register/dump_traceback_later(19~65행), tracemalloc snapshot·compare_to·traceback(71~136행), objgraph(148~178행), gc(190~204행)는 공식 문서 수준의 사용법 소개다. 이 글만의 판단은 누수 패턴 셋(180~186행), tracemalloc은 Python 객체 단위·memory_profiler는 RSS 단위라는 구분(231행), 시리즈 도구 표와 선택 기준(250~267행) 정도다. 실제 진단 기록이나 실패 사례는 없다. |
| B | 11 | faulthandler → tracemalloc → objgraph → gc → memory_profiler → pyrasite → 시리즈 정리로 흐름은 끝까지 간다. 233행 제목의 pyringe는 본문에 설명이 없다. tracemalloc 오버헤드(운영에서 켜 둘 때 비용), objgraph show_backrefs(175행)의 graphviz 의존 같은 전제가 빠졌다. 57행 hung 프로세스 한계는 근거 없는 한 문장. 110행 산술 불일치와 197·204행 DEBUG_SAVEALL 설명의 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 6 | 실행 가능한 코드·명령(39~43, 47~55, 71~84, 96~107, 140~142, 220~221행)은 있다. 예시 출력(26~33, 86~90, 109~111, 126~134, 222~228행)에 Python 버전·OS·실행 환경이 없고, 110행 출력은 100행 루프 횟수와 산술이 맞지 않아 실제 출력으로 보기 어렵다. 35행 '거의 0 오버헤드', 215~216행 '~80 MB'·'~30 MB'는 출처·환경 없는 수치라 C ≤ 8. 누수 여부를 가르는 판정 절차가 없어 4~7 구간. |
| D | 12 | 인접 글 chapter04-py-spy.md는 외부 샘플링, 이 글은 프로세스 내부 진단·메모리로 역할이 갈린다(57·265행은 ch04를 가리킬 뿐). chapter03-asyncio.md 76~80행의 PYTHONTRACEMALLOC=10으로 코루틴 생성 위치를 보는 팁이 이 글 140~144행에 반복된다. 다른 시리즈 memory/chapter05-prod-leak-diagnosis.md 316~328행의 tracemalloc 코드는 이 글 71~84행과 거의 같지만 330행에서 이 글로 상세를 넘겨 역할은 구별된다. 10~14 구간. |
| E | 7 | 제목의 faulthandler·tracemalloc·objgraph, description(5행)의 세그폴트 트레이스백·할당 추적·객체 그래프는 15~186행에서 모두 다룬다. 본문은 memory_profiler(206~231행)·pyrasite(233~244행)까지 넓고, 233행 heading의 pyringe는 다루지 않는다. 대상 독자·구체 진단 시나리오 명시가 없어 9점 이상은 아니다. |
| F | 5 | seriesOrder 5가 디렉터리의 마지막 글(ch01~ch05)이고 13행에서 마지막 장임을 밝혀 다음 글 안내 누락은 아니다. ch04 209~216행 예고·링크도 이 글과 맞다. 279~283행 Ch1~Ch4·GDB 링크는 라벨과 대상이 맞는다. 284행 'Valgrind Massif — RSS heap 시각화'는 valgrind/chapter05-suppressions.md(제목 'Valgrind Suppression과 실무 운용')로 가고, valgrind 디렉터리(chapter01~05)에 Massif 글이 없다. 라벨이 다른 글을 가리켜 F ≤ 5. |
| G | 2 | 286~290행에 tracemalloc·faulthandler 공식 문서와 objgraph 문서 링크가 있으나 글 끝 목록일 뿐 본문 주장(35행 오버헤드, 144행 경고 동작, 204행 3.4+ 동작)과 연결되지 않는다. 버전 표기는 204행 'Python 3.4+' 하나, objgraph·memory_profiler·pyrasite 버전은 없다. |

uncertainties:
- 110행: Snapshot.compare_to 출력 형식에 '/cycle' 표기가 실제로 있는지 공식 문서로 확인하지 않았다(산술 불일치는 원문만으로 성립).
- 197행 주석 '수집 불가능한'과 198행 DEBUG_SAVEALL: SAVEALL은 수집 대상 전체를 gc.garbage에 남기는 것으로 기억하나 gc 문서로 확인하지 않았다.
- 57행: hung 프로세스에서 SIGUSR1이 도달하지 않을 수 있다는 설명은 faulthandler의 C 수준 핸들러 동작과 대조하지 않았다.
- 216행 list(range(10**6)) '~30 MB'는 포인터 8MB+int 객체 약 28MB로 계산하면 약 36MB일 수 있으나 환경 의존이라 오류로 보지 않았다.
- 144행 PYTHONTRACEMALLOC과 'never awaited' 경고 생성 위치 동작은 asyncio/warnings 문서로 확인하지 않았다.
- 244행 pyrasite의 gdb 주입 방식과 유지보수 상태는 확인하지 않았다.

병합 대상: 판정은 오류 확인 때문에 우선 조치. 점수 구간(병합 검토) 기준으로는 병합 대상 없음: `src/content/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis.md` 330행이 Python 상세를 이 글로 넘기는 구조라 이 글이 Python 메모리 진단의 독립 글이다. 다음 조치는 보강: 110행 '/cycle' 값과 113행 단위를 1000사이클·50 MiB와 맞추고, pyringe heading 정리, 284행 Massif 링크 라벨 수정, 예시 출력에 Python 버전·OS 명시.

### `sanitizers/chapter01-intro.md` — 53점, 보강

confidence: 중간

factcheck: 미검증. git log에 1차 자료 대조 커밋이 없다. 3232b1be(태그 정규화), 0a9dd7bc(slug 고정), 07cc1988(관련 항목 추가) 등 정리 커밋뿐이고, 본문 수치·호환성·TSan 예제를 문서와 대조한 기록이 없다. 평가 중에도 Clang·GCC·TSan 문서를 열지 않았으므로 의심은 uncertainties에 적었다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 종류 표(49~55행), 호환성 표(59~64행), 도구별 예제(120~200행)는 Clang·GCC 문서와 google/sanitizers 위키의 목록을 옮긴 수준이다. 이 글만의 것은 '실무 빌드 세 가지'(72~76행), 1→2→3단계 도입 순서(84~114행), PR마다 Sanitizer·야간 Valgrind 운영 제안(218행) 정도다. 오버헤드 배수(38·51~55·212행)와 '정확도 매우 높음'(38행), '모든 경우를 보고'(180행)는 출처 없는 일반론이다. 6~12 구간 상단. |
| B | 11 | 왜(13~41행)→종류(45~55행)→호환성(57~76행)→도입 순서(80~114행)→도구별 예제(118~200행)→Valgrind 비교(204~220행)→로드맵(224~234행)→정리(238~244행)로 기본 흐름은 완성됐다. 호환성 표(59~64행)는 열이 다섯인데 LSan 행이 없고, 92행 '세 옵션의 역할'은 94~97행에 네 개를 나열한다. TSan 예제(165~177행)는 ready가 std::atomic<bool>(기본 seq_cst)인데 169·175행을 데이터 레이스로 표시해 정확성 불확실이 열려 있다(AP-C-24, B ≤ 13). 예제가 같은 범위에서 p·v를 다시 선언(126·135행, 147·150행, 148·151행)한다. |
| C | 6 | 플래그(89·107·114행)는 있지만 컴파일러 종류·버전·OS와 실제 실행 결과가 없다. 25~30행 ASan 출력은 주석으로 쓴 예시이고, 22행 strcpy(쓰기)에 'READ of size 12'(27행), [32, 42) 버퍼에 'offset 42'(30행)로 적혀 실제 출력인지 의심된다. 오버헤드 배수(38·51~55·212행)는 출처·환경 없는 구체 수치라 3-1절에 따라 C ≤ 8. 예제 일부가 그대로 컴파일되지 않아(126·135, 147·150행) 4~7 구간. |
| D | 10 | 비교한 글: 같은 시리즈 chapter02-asan-ubsan.md(인접)·chapter04-tsan.md, 다른 시리즈 valgrind/chapter01-intro.md, build/cmake/chapter04-options.md, embedded/modern-recipes/part10-08-memory-corruption.md. Valgrind 비교 절(204~218행: 재컴파일·2~3× vs 10~50×·syscall·'경쟁이 아니라 보완')은 valgrind ch01 41~49행 표·53행 결론과 거의 같다. 황금 조합(84~97행)은 ch02 13~18행 '다시 보기'와 63~88행(frame pointer·-O1)에서 더 자세히 반복된다. TSan 예제(165~177행)는 ch04 63~75행에서 release/acquire로 다시 다룬다. cmake ch04 299~311행(CMake 적용)과 part10-08 138행(임베디드 데스크톱 빌드)은 역할이 다르다. 허브로서 종류·호환성·도입 순서 역할은 구별된다. |
| E | 7 | 제목(2행)의 다섯 키워드 ASan·UBSan·LSan·TSan·MSan은 49~55행 표와 120~200행 예제에서 모두 다룬다. description(5행)의 '역할, 종류별 선택, 실무 도입 순서'도 13~41·72~76·80~114행이 이행한다. 대상 독자와 해결할 구체 문제는 개요 수준이라 9 이상은 주지 않았다. |
| F | 6 | 다음 장 예고(248행)는 실제 seriesOrder 2인 chapter02-asan-ubsan.md를 가리키고 내용(ASAN_OPTIONS·suppression·오탐)이 ch02 description과 맞다. 관련 항목 259행(ch02 'ASan과 UBSan 실전 설정 — 컴파일 옵션과 런타임 동작'), 260행(valgrind ch01 'Valgrind 도구 개요 — Memcheck·Helgrind·DRD 비교'), 261행(gdb-lldb ch01 'GDB vs LLDB 분석 — 두 디버거의 설치·차이·선택 기준')은 대상 파일을 열어 라벨과 일치함을 확인했다. 그러나 시리즈 허브인데 로드맵(226~232행)의 Ch 2~5에 링크가 하나도 없어(실제 파일 chapter03~05 존재·발행) 허브의 목차 역할이 비어 있다. 루브릭 5절의 허브 기준을 F에 반영해 6. |
| G | 2 | 참고 자료(252~255행)에 Clang ASan 매뉴얼, GCC Instrumentation Options, TSan 논문이 있지만 본문 주장(오버헤드 38·51~55행, 호환성 59~64행, -O1 권고 97행, MSan Clang only 55행)과 연결되지 않았고 GCC·Clang 버전 표기가 없다. |

uncertainties:
- 165~177행: ready가 std::atomic<bool>이고 기본 seq_cst store/load라 data=42(169행)와 data 읽기(175행) 사이에 happens-before가 성립해 레이스가 아닐 가능성. 같은 시리즈 chapter04-tsan.md 63~75행은 같은 패턴(release/acquire)을 '레이스 없음'으로, 330행은 기본 순서를 seq_cst로 적는다. 다른 글과의 모순이고 언어 의미 판단이 필요해 오류 확인에 넣지 않음.
- 25~30행: strcpy로 buf에 쓰는 오버플로인데 'READ of size 12'(27행), 버퍼 [32, 42)에서 시작하는 12바이트 쓰기를 'offset 42'(30행)로 적음. 실제 ASan 출력 형식과 대조하지 않음.
- 215행 '외부 라이브러리 동작(재컴파일 불필요)'과 112행 'MSan은 표준 라이브러리도 MSan-instrumented build 필요'의 충돌 여부. valgrind ch01 47행은 '계측 안 됨 → 부분 검사'로 적음.
- 38·51~55·212행 오버헤드 배수(ASan 2~3×, UBSan 1.2~1.5×, TSan 5~15×, MSan 3×, Valgrind 10~50×) 출처 없음. 38행은 Sanitizer 전체를 2~3×로 적어 54행 TSan 5~15×와 범위가 다름.
- 95행 '없으면 인라인이 트레이스 망침': frame pointer 생략과 인라이닝을 섞은 설명인지 미확인.
- 97행 'O0은 false positive 많음' 근거 미확인(ch02 88행은 '어떤 UB는 컴파일러가 제거'로 다른 이유를 듦).
- 59~64행 호환성 표에 LSan 행이 없고, 63·64행 TSan×LSan·MSan×LSan ✗를 Clang 문서로 확인하지 않음.
- 92행 '세 옵션'이라 하고 94~97행에 네 개 나열(개수 표기 실수).
- 180행 'TSan이 ... 모든 경우를 보고'·99행 '다 잡힙니다'는 실행된 경로만 검사하는 동적 도구의 한계와 맞지 않는 과장일 가능성.
- 다른 글과의 모순: valgrind/chapter01-intro.md 132행은 초기화 안 된 값을 'Sanitizer로 못 잡음'이라 하고, 이 글 191~200행과 valgrind ch01 48행은 MSan이 잡는다고 함.

병합 대상: 점수 구간은 병합 검토지만 시리즈 첫 글(허브, 226~232행 로드맵)이라 루브릭 5절에 따라 병합 검토 대신 보강으로 둔다. 다음 조치: 로드맵 Ch 2~5에 링크 추가, TSan 예제(165~177행)를 TSan 문서·C++ 메모리 모델로 확인해 ch04 63~75행과 맞추기, Valgrind 비교 절(204~218행)은 valgrind ch01 41~53행과 겹치므로 줄이고 링크로 넘기기, 오버헤드 배수에 출처·환경 붙이기.

### `sanitizers/chapter02-asan-ubsan.md` — 60점, 우선 조치

confidence: 중간

factcheck: 오류 확인. git log -- 파일: bda66c51(2026-05-15 시리즈 5장 재작성), 400892d7(린터 일괄), f38a41a0(표 변환), ac24bb76(제목 변경), be973200(topic 메타), 07cc1988(관련 항목 추가), 28524a9d(코드 블록 언어 태그), 0a9dd7bc(slug 고정), 3232b1be(태그 정규화). Clang 매뉴얼·sanitizers wiki와 대조한 커밋은 없다. 대신 원문 안 두 진술이 동시에 참일 수 없다: 27행 '둘 중 하나라도 빠지면 빌드는 되지만 *동작이 이상*해집니다'는 링크 쪽 옵션만 빠져도 빌드가 된다고 말하는데, 30~32행 '잘못된 예 — 컴파일에만 … gcc main.o -o myapp # 링크에 없음 → undefined symbol'은 같은 경우에 링크가 실패한다고 말한다. 링크 단계의 undefined symbol은 빌드 실패라 두 진술은 함께 성립하지 않는다(362행 정리 '한쪽이라도 빠지면 미동작'도 27행과 다른 결론). 337~343행 보고서의 줄 번호(strcpy main.c:4, buf line 3)는 316행 주석 줄을 빼면 318~321행 코드와 맞고, 'WRITE of size 14'(13자+NUL)·[32, 40) 8바이트·offset 40의 산술도 맞는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글만의 부분은 341~356행 실제 ASan 보고서를 여섯 항목으로 나눈 해설(`WRITE of size 14`, `[32, 40)` 8바이트, offset 40)과 282~297행 켤 자리·끌 자리 결정 가이드다. 옵션 표(134~143행), ASAN/UBSAN_OPTIONS 목록(124~159행), suppression 문법(183~205행)은 Clang 매뉴얼·sanitizers wiki 플래그 목록을 정리한 수준이다. 260행 'false positive 보고 가능', 267행 '보고할 수 있습니다', 278행 '의심할 수 있습니다'는 어떤 조건에서 어떤 보고가 나오는지 대신 완곡 표현을 둔 문장이라 일반론으로 본다. 13점 이상에는 못 미친다. |
| B | 13 | 컴파일·링크 양쪽 적용(25~57행) → 컴파일러 옵션(61~104행) → 환경 변수(108~175행) → suppression(179~207행) → 오탐 함정 다섯 가지(211~278행) → 적용 범위(282~310행) → 보고서 해부(314~356행) → 정리(360~368행)로 기본 흐름은 완성됐다. UBSan은 147~161행 옵션 두 개뿐이고 검사 그룹 선택이나 recover 동작이 없다. 27행과 32행의 내부 모순, 그리고 uncertainties에 열린 정확성 항목(240·251·137·196행 등)이 있어 AP-C-24에 따라 B ≤ 13이다. |
| C | 8 | 그대로 돌릴 수 있는 빌드 명령(29~37행), Makefile·CMake 설정(41~57, 301~308행), 재현 예제와 명령(316~328행), 기대 출력(329~344행)이 있어 8~11 구간이다. 그러나 출력에 컴파일러·OS·버전이 없고 332행 경로(`/usr/include/.../strcpy_interceptor.h:45`)는 실제 실행 기록인지 알 수 없으며, 295행 '2배 느린 바이너리'는 출처·환경 없는 수치다. 루브릭 3-1 '출처·측정 환경 없이 구체 수치만 있는 경우 C ≤ 8'을 적용했다. 오탐 절(253~278행)은 재현 절차나 기대 관찰이 없다. |
| D | 11 | 같은 시리즈 인접 글: chapter01-intro.md 84~95행이 황금 조합과 옵션별 이유를 이미 적고, 이 글 13~104행이 이를 확장한다(15행이 이를 밝힘). chapter03-lsan-leaks.md 90~101행 macOS detect_leaks, 146~181행 suppression(`leak:libcrypto.so`, `leak:OpenSSL_*`, 정규식 패턴 설명)이 이 글 136·183~205행과 겹친다. chapter05-cmake-ci.md 24~51행 option()·add_compile_options 패턴과 163~166·253~256행 ASAN/UBSAN_OPTIONS 값이 이 글 299~308·124~153행과 거의 같다. 다른 시리즈: embedded/modern-recipes/part10-08-memory-corruption.md 133~150행은 데스크톱 시뮬레이션에서 ASan을 켜는 한 절뿐이고, valgrind/chapter02-memcheck.md는 다른 도구다. 같은 주제의 programming/testing/gtest/chapter17-sanitizers.md와 embedded/automotive/cert-c/chapter14-sanitizer-suite.md(76·95행에 같은 옵션·ASAN_OPTIONS)는 draft: true라 공개 중복은 아니다. 시리즈 안 반복이 있으나 '옵션·런타임 설정'이라는 역할은 구별되어 10~14 구간. |
| E | 7 | 제목(2행)의 '컴파일 옵션과 런타임 동작'과 description(5행)의 옵션·환경 변수·suppression·흔한 오탐은 각각 61~104, 108~175, 179~207, 211~278행에 대응한다. 제목의 두 도구 중 UBSan은 147~161행 짧은 옵션 소개와 205행 suppression 한 줄뿐이라 키워드 하나의 부분 이행으로 보고 6~8 구간에서 감점했다. |
| F | 7 | 다음 장 안내(372행 'Ch 3: LSan과 누수 분석')는 같은 디렉터리 seriesOrder 3 chapter03-lsan-leaks.md(제목 'LSan 누수 분석 — Stop-the-world Leak Detection 메커니즘')와 맞다. 관련 항목 382~385행 대상을 열어 대조했다: chapter01-intro.md('Sanitizer 종류 비교 — ASan·UBSan·LSan·TSan·MSan'), chapter03-lsan-leaks.md, valgrind/chapter02-memcheck.md('Valgrind Memcheck 실전'), gdb-lldb/chapter07-core-dump.md('Core Dump 분석 기법', seriesOrder 7) 모두 라벨과 맞다. 글 고유 구조로 15행 전제 글(Ch 1) 링크와 310행 Ch 5(chapter05-cmake-ci.md 'Sanitizer를 CMake와 CI에 통합') 전방 안내가 있다. audit:reading이나 폰 폭 렌더 확인을 하지 않아 9점 이상은 주지 않는다. |
| G | 2 | 376~378행에 Clang AddressSanitizer·UBSan 매뉴얼과 sanitizers wiki AddressSanitizerFlags라는 1차 출처가 있으나 글 끝 목록일 뿐 본문의 특정 주장(136·137행 기본값, 196행 '정규식 지원', 251행 libstdc++ 기본 활성화)과 연결되지 않는다. GCC·Clang 버전, 대상 OS, 출력을 얻은 환경 표기가 없다(327행 명령에 컴파일러 버전 없음). |

uncertainties:
- 137행 'halt_on_error 기본 0 — 계속 진행'과 327~344행 출력: 328행은 ASAN_OPTIONS 없이 실행했는데(124행 대입은 export가 아님) 344행 출력은 첫 에러에서 `==ABORTING`이다. 글의 기본값 설명대로라면 계속 진행해야 한다. 기본 ASan은 -fsanitize-recover 없이 halt_on_error=0이어도 멈춘다는 기억이 있어 137행 설명이 틀렸을 가능성이 있으나, 환경 변수 상속 여지가 있어 내부 모순으로 확정하지 않았다. AddressSanitizerFlags wiki로 확인 필요.
- 240행 `std::vector<int> v(10); v[20]`: capacity가 10이면 20은 할당 범위 밖이라 기본 ASan의 heap-buffer-overflow로 잡힐 것으로 보이는데, 주석은 'container-overflow (ASan 옵션 필요)'라 하고 243행은 capacity 안쪽만 못 잡는다고 설명한다. 1차 자료로 확인 필요.
- 248행 `-D_LIBCPP_HAS_ASAN_CONTAINER_ANNOTATIONS`와 251행 'libstdc++는 이미 활성화'(libstdc++는 `_GLIBCXX_SANITIZE_VECTOR` 같은 매크로가 필요하다는 기억과 다름)는 libc++·libstdc++ 문서로 확인하지 않았다.
- 84행 '-O0에서 sanitizer 오탐 증가'의 근거 미확인. 88행 '어느 최적화 레벨에서도 대부분 동작'과의 관계도 불명확하다.
- 136행 detect_leaks 기본값(Linux 1, macOS 0), 142행 strict_string_checks 의미('교차 영역 검사')를 AddressSanitizerFlags wiki와 대조하지 않았다.
- 196·204행 suppression '정규식' 지원 설명: sanitizer suppression은 `*` 와일드카드와 `^`·`$` 앵커만 쓴다는 기억이 있어 `^OpenSSL_*`의 의미가 글 설명과 다를 수 있다. 미확인.
- 172행 `ASAN_SYMBOLIZER_PATH=$(which addr2line)`이 실제로 동작하는지 미확인.
- 253~263행 dlsym 호출이 ASan false positive를 낸다는 주장, 278행 ASan이 시그널 핸들러 안 malloc을 '의심'한다는 주장의 출처 미확인.
- 330~344행 보고서는 경로 일부가 `...`로 생략되고 interceptor 경로가 실제 libsanitizer 경로와 달라 보인다. 실제 실행 출력인지, 어떤 GCC 버전인지 알 수 없다.
- 295행 '2배 느린'은 출처·환경 없는 수치다.

### `sanitizers/chapter03-lsan-leaks.md` — 55점, 병합 검토

confidence: 중간

factcheck: 미검증. git log -- 파일: bda66c51(시리즈 5편 재작성), 400892d7(linter 일괄), 49f2a443(텍스트 블록 변환), ac24bb76(제목 일괄 변경), be973200(topic 메타데이터), 07cc1988(관련 항목 추가), 28524a9d(코드 블록 언어 태그), 0a9dd7bc(slug 고정), 3232b1be(태그 정규화), 35baac92(도구·다이어그램 수정). LSan 동작·플래그·API를 1차 자료(google/sanitizers wiki, LLVM 문서, compiler-rt 소스)와 대조했다는 커밋이 없다. 평가 중 1차 자료를 열지 않았고, 원문 안에서 동시에 참일 수 없는 두 기술 진술도 확정하지 못했으므로 오류 확인은 주지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 부분은 보고서 세 유형 읽기(108~144행: 단순 1024바이트, Direct 16+Indirect 80바이트/5개, 같은 위치 300회 12000바이트), print_suppressions 출력 예(192~198행), 실행 중간 검사 __lsan_do_recoverable_leak_check(232~246행)다. 동작 원리(45~54행)는 루트 집합 마킹의 일반 설명이고, 흔한 사고 패턴(252~340행: 조기 반환·예외·콜백·가상 소멸자·정적 변수)은 LSan과 상관없는 C/C++ 일반론이다. 89행 '훨씬 빠릅니다', 97행 '거의 100% 환경 변수 누락'은 근거 없는 단정이다. part1-04-uart-hardware(A 10)와 비슷한 개념 교과서 수준이고, 보고서 해석 부분 때문에 1점 높였다. |
| B | 12 | 누수 예(15~37행) → 원리(45~69행) → 켜기·플랫폼 차이(73~102행) → 보고서 해석(106~144행) → suppression(148~198행) → 분석 방식(202~246행) → 사고 패턴(250~340행) → CI(344~373행) → 정리(377~385행)로 기본 흐름은 완성됐다. 빠진 것: 제목(2행)이 내건 stop-the-world 메커니즘 설명이 본문에 없다. 262행 `return result;`는 255~261행 어디에도 선언되지 않은 변수라 첫 예가 그대로는 컴파일되지 않는다. 정확성에 걸린 불확실(215·239·323·340·177행)이 열려 있어 AP-C-24에 따라 B ≤ 13이다. |
| C | 7 | 빌드·실행 명령(77~87행, 101행, 163행, 187행, 209행)과 예시 출력(27~37행, 192~198행)이 있다. 그러나 컴파일러·런타임 버전, OS 같은 실행 환경이 없고, 106~144행 보고서는 주소가 '0x...'라 실제 실행 기록인지 알 수 없다. 222~225행 반복 분석 루프는 매 반복 앱을 두 번 돌리며, 출력을 버리는 첫 실행에만 detect_leaks=1을 주고 grep하는 두 번째 실행에는 주지 않아 94행이 말한 macOS에서는 SUMMARY가 나오지 않는다(코드와 산문 불일치). 254~263행 예는 컴파일되지 않는다. 측정·트레이드오프 기록이 없다. 관찰 결과나 합격·실패 관찰이 다른 검증 절차가 없으므로 AP-C-24에 따라 C ≥ 10은 불가하고, 4~7 구간 상단으로 두었다. |
| D | 10 | 비교 글: 같은 시리즈 chapter01-intro.md(1), chapter02-asan-ubsan.md(2), chapter04-tsan.md(4), chapter05-cmake-ci.md(5), 다른 시리즈 valgrind/chapter03-leak-report.md, valgrind/chapter05-suppressions.md. 겹침: 이 글 154~182행 suppression 파일(leak:libcrypto.so, leak:libssl.so, OpenSSL_*)과 함수명·모듈명·정규식 패턴이 chapter02 181~205행(asan.supp 예와 패턴 표)과 같은 예다. 15~21행 malloc(40) 누수 예는 chapter01 183~187행과 같다. 93~101행 macOS detect_leaks 설명은 chapter02 136행 표, chapter05 469~477행과 겹친다. 344~373행 GitHub Actions 예는 chapter05 주제를 앞당겨 다룬다. valgrind/chapter03 54~72행 indirectly lost 설명(head→next)은 이 글 39~41·123~135행과 개념이 같지만 도구가 달라 역할은 구별된다. 보고서 해석(106~144행)과 recoverable check(230~246행)는 이 글에만 있다. |
| E | 6 | 제목(2행) 키워드는 'LSan 누수 분석'과 'Stop-the-world Leak Detection 메커니즘'이다. 누수 분석은 106~246행에서, leak detection 메커니즘은 45~54행 reachability 4단계로 다룬다. 빠진 것은 'Stop-the-world'(스레드 정지) 한 키워드로, grep하면 2행 제목에만 나온다. 루브릭 E는 '나열한 키워드 중 하나를 거의 다루지 않았다면 6~8 구간에서 감점'이므로 6~8 구간 하단 6이다. description(5행)의 보고서 해석·suppression·일회성·반복 분석은 106~246행에서 이행한다. |
| F | 7 | 다음 장 예고(389행) Ch 4 링크는 같은 디렉터리 seriesOrder 4 chapter04-tsan.md와 맞고, 예고 내용(happens-before, false positive, atomic·mutex)이 그 글 description(5행)과 일치한다. 373행 Ch 5 링크도 chapter05-cmake-ci.md로 맞다. 관련 항목 399~402행 대상을 열어 대조했다: chapter02 'ASan과 UBSan 실전 설정', chapter04 'TSan으로 데이터 레이스 디버깅', valgrind/chapter03 'Valgrind Leak Report 분석 — definitely·indirectly·possibly·still reachable', valgrind/chapter05 'Valgrind Suppression과 실무 운용'으로 라벨·설명이 실제 글과 맞다. 사고 패턴 절이 번호(252~329행)로 나뉘어 있다. 전제 지식 안내가 없고 audit:reading·모바일 확인을 하지 않아 8 이상은 주지 않았다. |
| G | 2 | 참고 자료(393~395행)에 LeakSanitizer Wiki·Flags·Google 논문 링크가 있지만 본문 주장(94행 macOS 기본 꺼짐, 95행 Windows 미지원, 177행 정규식, 239행 반환값, 340행 no_sanitize 속성)에 연결된 인용이 없다. GCC/Clang·libasan 버전 등 환경 표기가 없다(32행 libasan.so.6은 예시 출력 안의 문자열일 뿐). 403행은 393행 Wiki 링크를 반복한다. |

uncertainties:
- 323행 'UBSan이 이 자리도(비가상 소멸자 delete) 잡을 수 있습니다' — UBSan 검사 목록으로 확인하지 않았다. ASan new-delete-type-mismatch와 혼동했을 가능성.
- 340행 `__attribute__((no_sanitize("leak")))`가 LSan 누수 보고를 끄는지 GCC/Clang 문서로 확인하지 않았다.
- 177~181행 suppression 문법 — 177행은 정규식(`.*`)이라 하고 180행은 'leak:dl_init'을 '정확히 일치'라고 하지만, 166행 설명대로라면 앵커 없는 패턴은 부분 일치일 수 있다. LSan suppression이 정규식인지 와일드카드(`*`, `^`, `$`)인지 1차 자료 미확인.
- 215행 halt_on_error=1이 '첫 누수에서 즉시 종료'시킨다는 설명 — 25·47행이 말한 대로 누수 검사가 종료 시점에 한 번 수행된다면 의미가 맞지 않을 수 있다. 플래그 문서 미확인.
- 239~241행 __lsan_do_recoverable_leak_check() 반환값을 누수 개수로 출력 — 반환값이 개수인지 0/1인지 lsan_interface.h로 확인하지 않았다. 246행 요청별 추적 가능 여부도 같은 이유로 미확인.
- 93~95행 Linux 자동 활성화, macOS 기본 꺼짐, Windows 미지원 — 컴파일러·버전별 1차 자료 미확인.
- 52·54·67행 순환 참조에서 둘 다 Direct leak인지, 52행 규칙대로 하나가 Indirect로 보고되는지 미확인.
- 33행 예시 출력 'main.c:3'은 16~17행 예에서 malloc이 함수 2번째 줄이라 맞지 않을 수 있다(파일 앞 include 여부 불명, 예시 출력이 실제 실행 결과가 아닐 가능성).
- 89·382행 'LSan 단독 모드는 훨씬 빠릅니다'는 출처·측정 없는 단정이다.
- 커밋 bda66c51 본문은 ch03에 'happens-before 기반 reachability 모델'을 적었지만 본문에는 없다(커밋 기록과 본문 불일치, 점수 외).

병합 대상: 병합 대상 없음. 'LSan 누수 분석'은 독립 검색 의도가 있고 보고서 해석(106~144행)·recoverable check(230~246행)는 다른 글에 없다. 다음 조치: 보강. chapter02 181~205행과 겹치는 suppression 예·패턴을 한쪽으로 몰고(이 글에 두고 chapter02는 링크), 제목의 stop-the-world를 1차 자료(compiler-rt lsan 소스·google/sanitizers wiki)로 확인해 쓰거나 제목에서 빼며, 262행·222~225행 코드를 고치고 컴파일러 버전과 실제 출력을 붙인다.

### `sanitizers/chapter04-tsan.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1): 174행 'TSan은 … 몇 가지 패턴에서 false positive를 냅니다'와 190행 소제목 '2. atomic을 사용했는데 TSan이 false alarm'은 relaxed store/load 보고를 오탐으로 분류한다. 같은 절 205행은 그 예(192~203행)를 두고 'TSan은 정확히 이걸 잡습니다. 실제 동작이 우연히 올바르더라도 코드는 잘못된 것'이라 해 진짜 레이스로 판정하고, 292~308행도 같은 패턴(304행 '❌ TSan 경고')을 올바른 탐지로 설명한다. 같은 보고가 오탐이면서 진짜 레이스일 수는 없다. git log(bda66c51 작성, 400892d7·ac24bb76·be973200·07cc1988·28524a9d·0a9dd7bc·3232b1be·35baac92)에는 1차 자료 대조 커밋이 없고 린트·제목·메타데이터·링크·태그 정리뿐이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | happens-before 규칙 목록(51~57행), 오버헤드(105~109행), suppression 키워드 표(275~282행), memory_order 설명(288~338행), lock-order-inversion(342~374행)은 Clang ThreadSanitizer 문서·cppreference 수준의 일반 내용이다. 이 글만의 것은 std::map 동시 삽입 보고서를 줄 단위로 읽는 절(115~168행)과 race:/race_top: 차이 설명(284행) 정도다. 228행 '경고할 수 있습니다', 254행 '확신할 수 없을 수 있어 경고할 수 있습니다', 405행 '못 따라갈 수 있음'은 조건 대신 완곡 표현이라 일반론으로 봤다. 앵커 part1-04(A 10)보다 고유 예제가 조금 많아 12. |
| B | 12 | 문제(13~43행) → 원리(47~75행) → 켜기·오버헤드(79~111행) → 보고서 해석·수정(115~168행) → false positive·suppression·메모리 모델·데드락·운영(172~408행) → 정리(412~420행)로 기본 흐름은 완성됐다. 다만 제목의 happens-before '추적'이 어떻게 구현되는지는 49행 한 문장뿐이고, false positive 절 네 사례 중 2번(190~212행)은 실제 레이스(205행)라 핵심 질문이 섞였다. 정확성 문제가 열려 있어 12. |
| C | 7 | 빌드 명령(81~84행), CMake 옵션(88~100행), suppression 실행(262~271행), CI 반복 루프(392~398행)는 그대로 쓸 수 있다. 그러나 보고서 출력(32~40, 131~149행)은 주소 '0x7f8c...', 프레임 '<header>'로 된 예시이고 컴파일러·버전·OS 표기가 없다. 107~109행 '5~15× 느림, 5~10× 메모리, 약 1.5× 컴파일'은 출처·측정 환경 없는 수치라 C ≤ 8 상한. 82행은 C++ 예제(15~23행 std::thread·std::cout)를 'gcc … main.c'로 빌드하라고 적어 그대로 재현되지 않고, 232~237행은 ```c 블록에 std::atomic을 쓴다. 경고가 나오는지/사라지는지 확인하는 절차가 없어 7. |
| D | 11 | 비교한 글: 같은 시리즈 chapter03-lsan-leaks.md(seriesOrder 3), chapter05-cmake-ci.md(5), chapter01-intro.md(1); 다른 시리즈 valgrind/chapter04-helgrind-drd.md, gdb-lldb/chapter06-multithread-multiprocess.md. 겹침: 이 글 88~95행 ENABLE_TSAN CMake 블록 ↔ ch05 31~55행(ENABLE_TSAN 33·50~55행), 이 글 388~398행 10회 반복 루프 ↔ ch05 305~316행 'TSan stress (10x)', 이 글 400~408행 lock-free·__tsan_acquire annotation ↔ ch05 461~468행, 이 글 107행 오버헤드 5~15× ↔ ch01 54행. ch03은 LSan 전용, Helgrind/DRD 글은 400~405행에서 TSan과 역할을 나누고, GDB ch06 390~402행은 도구 역할 비교만 한다. 레이스 원리·보고서 해석·메모리 모델 절은 이 글에만 있어 역할은 구별된다. |
| E | 7 | 제목(2행) 'TSan으로 데이터 레이스 디버깅 — Happens-before 추적'과 description(5행) 'happens-before 모델, false positive, atomic·mutex 통합'은 47~75, 172~256, 288~338행에서 다룬다. 'Happens-before 추적'은 동기화 규칙 목록(51~57행)으로만 답하고 TSan이 어떻게 추적하는지는 49행 한 문장뿐이며, false positive 절에 실제 레이스 사례가 섞여 있어 6~8 구간에서 감점했다. 범위 불일치는 없다. |
| F | 7 | 424행 다음 장 'Ch 5: CMake / CI 통합'은 실제 seriesOrder 5 chapter05-cmake-ci.md('Sanitizer를 CMake와 CI에 통합')와 맞는다. 관련 항목 435~438행 4개를 열어 대조: chapter03-lsan-leaks.md(seriesOrder 3, 'LSan 누수 분석'), chapter05-cmake-ci.md, valgrind/chapter04-helgrind-drd.md('Valgrind Helgrind와 DRD'), gdb-lldb/chapter06-multithread-multiprocess.md('멀티스레드·멀티프로세스 디버깅') 모두 라벨·번호·제목이 맞고 링크마다 관계 설명이 있다. 전제 지식 표기가 없고 모바일 렌더를 보지 않아 7. |
| G | 2 | 참고 자료 428~431행에 Clang ThreadSanitizer 문서, google/sanitizers TSan Flags 위키, cppreference memory_order가 있으나 본문 주장(107~109행 오버헤드, 275~282행 suppression 키워드 표, 390행 '10번 반복 패턴이 흔합니다')에 연결되지 않는다. 컴파일러(GCC/Clang)·버전·OS 표기가 없다. 439행은 428행과 같은 링크 중복. |

uncertainties:
- 43행 'TSan 보고는 해당 실행에서 레이스가 발생할 가능성'과 390행 '발생할 가능성이 있는 레이스만 감지' 설명: TSan은 실행 중 실제 관찰된 동기화 없는 충돌 접근을 보고한다고 기억하지만 Clang 문서로 대조하지 않았다.
- 107~109행 오버헤드 5~15×·5~10×는 Clang 문서 수치와 같다고 기억하지만 확인하지 않았고, '컴파일 약 1.5×'의 출처는 없다.
- 275~282행 suppression 키워드 의미(thread:, mutex:, signal:)가 google/sanitizers 위키와 맞는지 미확인. 282행 '시그널 핸들러 사용'은 모호하다.
- 214~228행 같은 스레드 안의 signal handler 접근을 TSan이 데이터 레이스로 보고하는지 미확인. 217행 volatile int와 232행 ```c 블록의 std::atomic은 언어가 섞였다.
- 240~256행 const 전역 객체를 TSan이 경고할 수 있다는 주장은 출처가 없다. 248행 동적 초기화는 스레드 생성 이전이라 happens-before로 보일 것으로 추정되지만 미확인.
- 82행 'gcc … main.c'로 C++ 예제를 빌드하라고 함. g++/clang++여야 하는지는 언어 규칙 문제라 uncertainties로만 둔다.
- 111행 'PR 빌드에는 너무 무겁고'와 384행 '동시성 단위 테스트만 PR 빌드'는 범위를 나누면 양립하지만, valgrind/chapter04-helgrind-drd.md 404·451·469행은 'TSan = PR 빌드'로 적어 다른 글과 충돌한다.
- 372행 std::scoped_lock의 deadlock-free 보장은 cppreference로 대조하지 않았다.

병합 대상: 점수 구간은 병합 검토지만 오류 확인이라 우선 조치. 병합 대상 없음: chapter05-cmake-ci.md와 CMake 옵션(88~95행)·반복 실행(388~398행)·annotation(400~408행)이 겹치지만 TSan 원리·보고서 해석·메모리 모델은 이 글에만 있고 'TSan 데이터 레이스' 독립 검색 의도가 있다. 다음 조치는 보강 — 172~212행 false positive 분류 모순을 먼저 고치고(2번 사례를 '오탐 아님' 절로 이동), ch05 중복은 ch05 링크로 줄이며, 107~109행 수치에 Clang 문서 출처와 버전을 붙인다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 1차 자료 대조 커밋 없음: 10편 모두 '검증됨'이 없다. Python Debugging은 218652df 신규 작성 뒤 0a9dd7bc·be973200·ac24bb76 같은 일괄 커밋뿐이고, Sanitizers는 bda66c51 한 번에 작성된 뒤 린터·메타데이터 커밋뿐이며, part5-07도 집필·번역투·메타데이터 커밋뿐이다. 그 사이 오류 확인 7편(part5-07, python ch01·ch02·ch03·ch05, sanitizers ch02·ch04)이 나왔다. 두 시리즈 모두 `/fact-check-round` 대상이다.
- 본문 1차 출처·버전 표기 부재: 10편 모두 G가 1~2다. 출처가 글 끝 참고 자료·관련 항목에만 있고 본문 주장과 연결되지 않는다(python ch01 265~266행, ch03 279~280행, ch05 286~290행, sanitizers ch01 252~255행, ch02 376~378행, ch03 393~395행, ch04 428~431행). part5-07은 본문 출처 링크가 아예 없다. 컴파일러·Python·도구 버전 표기는 python ch01 15행 'Python 3.7+', ch05 204행 'Python 3.4+', part5-07 31·162행 커널 6.12 정도다.
- 환경 없는 예시 출력과 출처 없는 수치: C가 6~8에 묶인 공통 원인이다. 예시 출력이 실제 실행인지 표시가 없다(python ch01 28~33행, ch03 52~58·94~96행, ch04 47~54·75~89행과 33~37행 가짜 --help, ch05 109~111행, sanitizers ch01 25~30행, ch02 330~344행, ch03 106~144행 '0x...', ch04 131~149행). 출처 없는 오버헤드·latency 수치도 반복된다(part5-07 114~118행, python ch04 178행, ch05 35행, sanitizers ch01 38·51~55·212행, ch02 295행, ch04 107~109행, ch05 303행).
- 그대로는 동작하지 않는 예제 코드: python ch01 213·216행(traceback import 누락, 실행 확인), sanitizers ch01 126·135·147·150행(같은 범위 재선언), ch03 262행(선언 안 된 `result`)·222~225행(두 번째 실행에 detect_leaks 없음), ch04 82행(C++ 예제를 gcc·main.c로 빌드), part5-07 236·248~249행(cmdline·C 호출이 bash 블록에 섞임). 5편이다.
- 제목·description 키워드 미이행: ac24bb76 제목 일괄 변경 뒤 본문이 따라가지 못한 키워드가 있다. sanitizers ch03 'Stop-the-world'(2행에만 있음), ch04 'Happens-before 추적'(49행 한 문장), python ch02 'PyCharm'(13·226·247행 한 문장씩), python ch03 description의 'race condition'(본문 절 없음). 4편에서 E가 6~7로 깎였다.
- 내비게이션·라벨 오류: part5-07 334행 '60+ 편'(실제 53편), python ch01 239행 '다음 장의 py-spy'(실제 Ch 4), python ch04 217행 링크 없는 'perf + Flamegraph 시리즈'(전 편 draft), python ch05 284행 'Valgrind Massif' 라벨이 valgrind/chapter05-suppressions.md로 감, sanitizers ch01 허브 로드맵 226~232행에 장 링크 없음. 5편에서 F가 5~6으로 깎였다.
- 공통 H2 꼬리 뼈대: '정리 / 다음 장 예고 / (참고 자료) / 관련 항목'이 python ch01(248·257·261행), ch02(245·254·258행), ch03(259·270·274행), ch04(201~219행), ch05(275·282행 부근), sanitizers ch02~ch04에 같은 순서로 있다. part5-07도 시리즈 공통 '한 줄 요약 → … → 자주 보는 함정 → 정리 → 관련 항목'(12·16·290·323·336행)을 쓴다. 템플릿 요소라 F 가점 근거로 쓰지 않았고, 9절 scaled content 기록 대상이다.
- 시리즈 안 주제 중복: Sanitizers는 황금 조합(ch01 84~97행, ch02 13~88행), suppression 예·'정규식' 주장(ch02 181~205·196행, ch03 154~182·177행), macOS detect_leaks(ch02 136행, ch03 93~101행, ch05 469~477행), ENABLE_TSAN·10회 반복 루프(ch04 88~95·388~398행, ch05 31~55·305~316행), Valgrind 비교(ch01 204~218행, valgrind ch01 41~53행)가 겹친다. Python Debugging은 PYTHONTRACEMALLOC=10(ch03 76~80행, ch05 140~144행), SIGUSR1 패턴(ch01 226~236행, ch03 120~127행), 비동기 정리(ch03 261·264행, ch05 267행)가 겹친다. 정본을 정하고 나머지는 링크로 바꿀 후보다.
- 시리즈 사이 서술 불일치(다른 글과의 모순이라 오류 확인은 아님): TSan atomic 예제 결론(sanitizers ch01 165~177행 seq_cst를 레이스로 ↔ ch04 63~75행 release/acquire를 레이스 없음으로), TSan PR 빌드 여부(sanitizers ch04 111·384행, ch05 15·468·497행 ↔ valgrind/chapter04-helgrind-drd.md 404~405·451·469행), MSan 초기화 안 된 값 검출(sanitizers ch01 191~200행 ↔ valgrind ch01 132행), PREEMPT_RT latency 기준(part5-07 100-300 µs ↔ industrial-ethernet ch11 412행 50 µs ↔ performance-engineering part1-05 123행 < 100 µs), py-spy 속도 표현(python ch04 56행 '30초' ↔ ch03 272행 '1초'). 1차 자료로 정본을 정한다.

## 다음 조치

- 우선 조치(7편, 오류 확인): part5-07 177~178행 vs 187행 EtherCAT 주기와 276행 deadline 범위를 1차 자료로 고친다. python ch01 213행에 traceback import를 추가하고, python ch02 174행 `--reload`를 179행 설명과 맞추고, python ch03 206~210행 asyncio.run 설명을 CPython runners.py 기준으로 고치고, python ch05 110행 '+1.0 MiB/cycle'을 100행 루프 횟수·113행과 맞춘다. sanitizers ch02 27행과 30~32행의 링크 옵션 누락 결과를 하나로 맞추고, sanitizers ch04 172~212행 false positive 절에서 2번 사례(실제 레이스)를 분리한다.
- 내비게이션 일괄 수정: part5-07 334행 편수, python ch01 239행 장 번호, python ch04 217행 링크 없는 관련 항목, python ch05 284행 Massif 라벨, sanitizers ch01 로드맵 링크를 실제 seriesOrder·제목에 맞춘다.
- 보강(1편): sanitizers ch01은 허브 로드맵 링크와 TSan 예제 정리, Valgrind 비교 절 축소를 한다.
- 병합 검토(2편): python ch04, sanitizers ch03 모두 병합 대상 없음. 다음 조치는 보강이다. python ch04는 py-spy README·Yama 문서 대조가 먼저이고, sanitizers ch03은 제목의 stop-the-world 확인과 ch02와의 suppression 중복 정리가 먼저다.
- Python Debugging ch01~ch05와 Sanitizers ch01~ch04를 `/fact-check-round` 대상으로 올리고, 예시 출력을 실행 환경을 밝힌 실제 출력으로 바꾼다. 시리즈 사이 불일치(TSan atomic 예제, TSan PR 빌드, MSan 검출, PREEMPT_RT latency 기준)는 정본을 정한 뒤 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
