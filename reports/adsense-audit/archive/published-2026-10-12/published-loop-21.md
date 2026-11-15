# 공개 글 AdSense 평가 — 루프 21

> 대상: 공개 글 10편 (Embedded Performance Engineering, `seriesOrder` 34~43)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 스물한 번째 루프다. 대상은 `src/content/blog/embedded/performance-engineering/`의 Part 4 후반(part4-05~part4-10, 동기화·SMP)과 Part 5 앞부분(part5-01~part5-04, perf·ftrace·eBPF) 10편이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part4-05-mutex.md` | 11 | 11 | 6 | 8 | 6 | 6 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part4-06-rw-lock.md` | 10 | 10 | 6 | 10 | 6 | 6 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part4-07-lock-free.md` | 12 | 12 | 7 | 7 | 6 | 6 | 1 | **51** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part4-08-memory-ordering.md` | 10 | 9 | 5 | 6 | 6 | 6 | 1 | **43** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part4-09-cache-coherency.md` | 9 | 10 | 6 | 9 | 6 | 6 | 1 | **47** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part4-10-smp-analysis.md` | 9 | 9 | 6 | 8 | 5 | 5 | 1 | **43** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part5-01-perf-basics.md` | 10 | 12 | 7 | 8 | 7 | 7 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part5-02-perf-advanced.md` | 9 | 9 | 6 | 6 | 6 | 6 | 1 | **43** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `part5-03-ftrace.md` | 10 | 11 | 7 | 4 | 7 | 6 | 1 | **46** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part5-04-ebpf.md` | 11 | 11 | 6 | 8 | 7 | 7 | 1 | **51** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 47.4점(10편, 합 474점), 범위 43~52점이다. 판정은 우선 조치 7편, 병합 검토 3편이고 유지·검증 대기·보강·제외 검토는 없다. 10편 모두 점수 구간은 병합 검토(40~59)이며, 오류 확인 7건(part4-05·4-06·4-08·4-09·4-10·5-01·5-04) 때문에 7편이 우선 조치로 올라갔다. 오류 확인 6건은 원문 내부 모순·산술 불일치이고, 1건(part5-04)은 iovisor/bcc `tools/profile.py`를 열어 확인한 1차 자료 근거다. 10편 모두 git log에 1차 자료 대조 커밋이 없어 '검증됨'은 0편이다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·sitemap은 보지 않았다. 4-03~4-10을 한 커밋(84b54508)으로 쓴 이력과 공통 H2 뼈대는 글 단위 P0가 아니라 시리즈 단위 scaled content 점검 대상으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part4-05-mutex.md` | 49 | 49 | 0 | 없음 |
| `part4-06-rw-lock.md` | 49 | 49 | 0 | 없음 |
| `part4-07-lock-free.md` | 51 | 51 | 0 | 없음 |
| `part4-08-memory-ordering.md` | 44 | 43 | -1 | 없음 |
| `part4-09-cache-coherency.md` | 47 | 47 | 0 | 없음 |
| `part4-10-smp-analysis.md` | 44 | 43 | -1 | 없음 |
| `part5-01-perf-basics.md` | 52 | 52 | 0 | 없음 |
| `part5-02-perf-advanced.md` | 43 | 43 | 0 | 없음 |
| `part5-03-ftrace.md` | 48 | 46 | -2 | 없음 |
| `part5-04-ebpf.md` | 52 | 51 | -1 | 없음 |

- 추가한 오류 확인: part4-08 244행 'Barrier는 이미 atomic으로 발행된 access의 순서만 통제합니다'가 104행 'DMB | 이전 memory access 완료 후 이후 access 진행', 186~192행(non-atomic `fill_buf()` 쓰기와 `DMA->CR` 사이의 `__DMB()`)과 동시에 참일 수 없다. 평가자가 놓친 두 번째 내부 모순이라 B 10→9로 내렸다.
- 추가한 오류 확인: part5-04 118행 `profile-bpfcc -F 99 -ag 30`의 `-g`는 iovisor/bcc `tools/profile.py`(master c398a9a7 93~134행, v0.5.0·v0.12.0·v0.18.0·v0.29.1 태그 동일)에 없는 옵션이라 argparse가 거부한다. 실행 실패 명령이라 C 7→6.
- 기각한 오류 확인 근거: part5-04에서 평가자가 145·148행 대 166행 '30초 안에'를 원문 내부 산술 모순으로 본 것은 성립하지 않는다. 원문이 `10 1`·`30`이 초 단위라고 밝히지 않아 도구 인자 의미를 알아야 판단되기 때문이다(루브릭 3-1). bcc `runqlat.py` 58~61행·`profile.py` 123~125행을 열어 확인했으므로 1차 자료 기반 보조 근거로만 남겼다. 오류 확인 판정 자체는 위 `-g` 근거로 유지된다.
- part4-10 E 6→5: 제목이 'SMP 성능 분석'을 약속하는데 본문은 도구·개념 소개 수준이다(63~72행 Load Balance 세 문장, 276행 fitting 방법 없음). 루브릭 E '분석을 약속하는데 개념 소개 수준이면 3~5점'을 적용했다. 평가자가 B 근거에 쓴 'B≤13 상한'은 AP-C-24 조건(정확성 불확실)과 무관하게 붙인 문구라 근거에서 뺐다(점수 영향 없음).
- part5-03 D 6→4: 평가자는 latency tracer 표(125~132행)가 이 글에만 있다고 했으나 `tools/debugging/kernel/chapter03-ftrace-tracepoints.md` 48~58행 tracer 표에 wakeup·wakeup_rt·irqsoff·preemptoff가 이미 있다. 그 글이 이 글의 상위 집합이라 루브릭 D 1~4 구간이다.
- part5-02: B 근거의 'AP-C-24로 B ≤ 13' 문구는 열린 정확성 불확실과 연결되지 않아 지웠다(점수는 5~9 구간 그대로).
- 줄 번호 보정(점수 영향 없음): part4-05 D(part4-04 260~266행, part1-08 97행), part4-06(part9-02 100·102행), part4-07 D(embedded-cpp part4-03은 CAS 69행·ABA 96~115행만 있고 hazard pointer는 286행 한 줄, epoch 없음), part4-08 D, part4-09 D(4-10 87·95행, CXL 141~142행), part4-10 D(part7-13 145~149행), part5-01 D(5-02 209·236행, 2-10 57~71행, 1-08 72~89행), part5-02 D(2-10 65·199~202행, 5-03 138~159행, 9-09 169~180행), part5-03 D, part5-04 D.
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `part4-05-mutex.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치(루브릭 3-1). 117~123행 Mutex_DB 출력은 blocked_count 2345(122행), max_block_time 45 µs(121행), total_block_time 1234 ms(120행)다. 2345회가 모두 최댓값 45 µs만큼 막혀도 합계는 약 105.5 ms라서 120행의 1234 ms와 동시에 참일 수 없다. 125행이 이 출력을 근거로 'max_block_time이 평균보다 중요'라고 해석한다. git log(42ebbcbb stub, 92bdd7df·84b54508 본문 작성, 6205e212 seriesOrder 재정렬, ac24bb76 제목 변경, be973200 메타데이터, 68525f0c 코드 블록 산문 이동, 0a9dd7bc slug 고정)에 1차 자료 대조 커밋이 없어 오류가 없었더라도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 24~36행 uncontended/contended 비용 분해 표, 42~61행 futex 0/1/2 상태 의사코드, 127~143행 robust mutex(EOWNERDEAD), 182~192행 os_unfair_lock이다. 80~97행 PI(Mars Pathfinder), 145~154행 recursive, 156~166행 mutex vs semaphore 표, 194~223행 함정 네 개는 입문 자료의 표준 목록이다. 78행 '실측해서 … 조정할 수 있습니다', 101행 '수십 µs까지 늘어날 수 있습니다'는 완곡 표현이라 일반론으로 본다. spin 횟수·PI chain 비용의 선택 기준을 숫자로 끌어내지 않는다. |
| B | 11 | 도입(16~22행)부터 정리(241~248행)까지 흐름은 끝까지 가지만 절마다 코드 한 조각과 한두 문장이다. 67행 spin 상한 100회는 근거가 없고, 90행 `holder waits on another lock`은 의사 문장이며, 107~123행 FreeRTOS 측정은 도구 이름 없는 출력뿐이다. 117~123행 산술 오류로 AP-C-24에 따라 B ≤ 13이다. |
| C | 6 | 225~237행 '실측 결과'는 227행 'Cortex-A53 4-core, glibc futex mutex' 한 줄뿐이고 커널·glibc 버전, 클록, 벤치 코드, 반복 횟수가 없다. 26~34행 비용 표와 105행 'chain depth 보통 3 이하'도 출처가 없어 C ≤ 8이다. 109~113행 측정 코드는 tick 해상도라 115행이 스스로 부족하다고 말한다. |
| D | 8 | 비교한 글: 같은 시리즈 `part4-04-spinlock.md` 187~202행 adaptive mutex ↔ 이 글 63~78행, 4-04 260~266행 'hold 10 µs부터 mutex 우세' ↔ 14·243행. `part4-06-rw-lock.md`·`part4-03-lock-contention.md`는 역할이 다르다. 다른 시리즈: `rtos/practical-internals/part1-08-mutex.md` 48~60행 ↔ 156~166행, 229~237행 ↔ 196~202행, 97행 ↔ 80~84행. `part3-05-priority-inheritance.md` 101~135행 ↔ 99~105행. `modern-recipes/part9-07-spinlock-vs-mutex.md` 22~47행 ↔ 14·18행. futex 2-stage, robust mutex, os_unfair_lock은 이 글에만 있다. |
| E | 6 | 제목의 Futex·Adaptive·Priority Inheritance는 38~61·63~78·80~105행에서 다루고 범위는 맞다. 그러나 '성능 분석'에 대해 adaptive spin 비용과 PI overhead는 235~237행 출처 없는 표 한 줄씩이고, 127~223행은 성능과 거리가 있는 사용법이다. |
| F | 6 | 250행 다음 편 'Reader-Writer Lock'은 seriesOrder 35 `part4-06-rw-lock.md`와 맞다. 254~256행 관련 링크 4-03·4-04·4-06을 열어 라벨·제목이 맞음을 확인했다. 22행 예고에 robust·recursive·os_unfair_lock 절이 없고, 전제 지식 안내와 RTOS Internals PI 글 링크가 없다. |
| G | 1 | 본문 출처 링크가 하나도 없다. futex 의사코드(42~59행), `PTHREAD_MUTEX_ADAPTIVE_NP`(76행), robust mutex(130~140행), os_unfair_lock(185~192행), FreeRTOS API(110~111행)에 출처·버전이 없고 227행 환경에도 버전이 없다. |

uncertainties:
- 42~58행 futex 의사코드가 Drepper 'Futexes Are Tricky'의 mutex2와 같은지 1차 자료로 대조하지 않았다.
- 67행 spins = 100과 76행 '`PTHREAD_MUTEX_ADAPTIVE_NP`가 이 구조'를 glibc 소스로 확인하지 않았다. 78행은 spin '횟수'를 'cycle'로 적어 단위가 섞였다.
- `part4-04-spinlock.md` 201행은 adaptive spin을 'Linux mutex의 기본 동작'이라 하고 이 글 76행은 비기본 타입을 든다. 다른 글과의 모순이라 오류 확인 근거가 아니다.
- 192행 os_unfair_lock 'spin 후 park'를 Apple 문서로, 105행 'ASIL-D chain depth 3 이하'를 ISO 26262로 확인하지 않았다.
- 20행 context switch '1-5 µs'와 33행 '1-3 µs', 31~33행 합(3~9 µs)과 34행 '~10 µs'의 차이는 범위 표기 차이라 오류 확인으로 올리지 않았다.
- 199행 `xSemaphoreTake(mtx)`, 215~216행은 FreeRTOS 시그니처(인자 두 개)와 맞지 않는다. 의도적 축약인지 확인하지 않았다.

병합 대상: 병합 대상 없음. futex 2-stage·robust mutex·os_unfair_lock은 이 글에만 있어 독립 검색 의도가 있다. 다음 조치는 보강이다(117~123행 출력 수정·삭제, 225~237행 실측 표에 환경·방법을 붙이거나 TBD, mutex vs semaphore·PI 기본 설명은 `rtos/practical-internals/part1-08-mutex.md` 링크로 줄임, adaptive mutex는 part4-04 187~202행과 한쪽으로 정리).

### `part4-06-rw-lock.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 수치 불일치(루브릭 3-1, AP-C-24). 97~98행은 'Workload: 90% read, 10% write / RW-Lock: 약 1.5-3x mutex 대비'라 하고, 같은 글 243행 실측 표의 90:10 행은 Mutex 1.1 M, RW-Lock 4.2 M으로 약 3.8배다. 같은 워크로드·같은 비교의 두 구체 수치가 동시에 참일 수 없다. git log(84b54508 본문 작성 '측정 수치 포함', 6205e212, ac24bb76, be973200·0a9dd7bc)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | reader/writer preference·FIFO·RCU·seqlock 설명(59~85·103~162행)은 입문 자료의 표준 목록이다. 이 글만의 것은 FIFO batch 예(77~83행), 자료구조 형태별 선택 기준(174행), 네 기법 실측 표(240~246행)인데 표는 출처·측정 코드가 없다. 101행 '측정 없이 가정하지 말아야 합니다', 209행 'mutex가 더 빠를 수 있습니다'는 완곡 표현이고 85행 '일부 platform'은 플랫폼을 밝히지 않는다. |
| B | 10 | 기본 구조 → 정책 → mutex 비교 → RCU → seqlock → 비교표 → 함정 → 실측 → 정리(24~257행) 흐름은 있다. 26~55행 코드에 write_unlock이 없고 write_lock(49~54행)은 state_lock을 잡은 채 반환하며 writers_waiting을 줄이지 않는다. seqlock_read(149~157행)의 `data`·`T`는 정의가 없고, 50:50에서 느려지는 이유는 95행 한 줄이다. 정확성 불확실(153·198·116행)이 열려 있어 B ≤ 13. |
| C | 6 | 238행 'Cortex-A72 4-core, 4 thread'뿐이고 OS·커널 버전, lock 구현, critical section 크기, 측정 코드가 없다. 240~246행 표는 C ≤ 8 대상이다. 89~99행 비교 블록은 '저하'·'향상'만 적고 98행 수치는 243행과 맞지 않는다. 재현 절차가 없다. |
| D | 10 | 같은 시리즈 `part4-05-mutex.md`(34)·`part4-07-lock-free.md`(36)와는 역할이 갈리고, `part4-03-lock-contention.md` 151~169행은 이 글 18~20·87~101행을 요약해 넘긴다. 다른 시리즈 `modern-recipes/part9-03-rcu-basics.md` 22~48·191~210행 ↔ 103~131·164~174행, `modern-recipes/part9-02-wait-free.md` 45~75·77~104행 ↔ 133~162·176~198행(같은 sensor·GPS 예). `systems/linux-kernel-internals/part5-01-sync-primitives.md`는 draft stub이라 겹침 없음. RW-lock 정책 비교와 네 기법 throughput 비교는 이 글 고유다. |
| E | 6 | 제목의 Reader/Writer Priority(59~71행), RCU(103~131행), Seqlock(133~162행)를 모두 다루고 description(5행)과 맞는다. '성능'은 출처 없는 실측 표(240~246행)와 정성 비교(89~99행)뿐이고 이유 분석이 약하다. |
| F | 6 | 259행 다음 편 'Lock-Free 기초 — CAS와 ABA'는 seriesOrder 36 `part4-07-lock-free.md`와 맞다. 263~265행 4-05, 4-07, RTOS 3-11(`part3-11-stream-message-buffer.md` 'Stream Buffer와 Message Buffer')를 열어 라벨이 맞음을 확인했다. 전제 지식 안내·글 고유 안내가 없다. |
| G | 1 | 본문 출처 링크가 없다. 65행 rwlock_t, 71행 PTHREAD_RWLOCK_PREFER_WRITER_NP, 123행 routing table·dentry cache, 162행 jiffies에 커널·glibc 버전이나 문서 인용이 없다. |

uncertainties:
- 98행 '약 1.5-3x'와 243행(약 3.8배) 불일치를 '일반 범위 vs 특정 환경 측정'으로 읽으면 모순이 아니라고 볼 여지가 있다.
- 101행 '90% 이상이 read일 때만 의미', 248행 '90:10 이상에서만 분명'은 244행 70:30(RW 1.5M vs Mutex 0.9M, 약 1.67배)과 어긋난다. 기준이 주관적이라 오류 확인에 넣지 않았다.
- 20행 '99% read에서 한 자릿수 빨라집니다'와 242행(약 7배)은 표현이 모호하다.
- 153행 do-while 안의 continue는 조건식으로 가 *out을 쓰지 않고 끝날 수 있어 160행 'retry'와 맞지 않을 수 있다(언어 규칙 판단).
- 116행 rcu_assign_pointer 반환값, 109행 'rcu_read_lock = preempt disable', 65행 'unfair reader-preferring'을 커널 소스로 확인하지 않았다.
- 198행 double buffer 'Race가 없으며'는 `modern-recipes/part9-02-wait-free.md` 100·102·256·284행과 결론이 반대다(다른 글과의 모순).
- `part4-03-lock-contention.md` 169행 'write 30% 초과 시 RW-lock이 더 비싸다'와 이 글 244행이 맞지 않는다(다른 글과의 모순).
- 198행 'ASIL 시스템 표준 패턴', 123행 '수백만 read/sec', 85행 FIFO 기본 동작은 출처가 없다.

병합 대상: 글 전체 병합 없음. 부분 병합 후보는 RCU 절(103~131행) ↔ `modern-recipes/part9-03-rcu-basics.md`, seqlock·double buffer 절(133~162·176~198행) ↔ `modern-recipes/part9-02-wait-free.md`다. 다음 조치는 보강이다. 98·243행 불일치를 먼저 정리하고, 실측 표의 출처·코드가 없으면 산문 수치를 지우고 표 칸은 TBD로 둔다.

### `part4-07-lock-free.md` — 51점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타, ac24bb76 제목 변경, 6205e212 seriesOrder 재정렬, 84b54508 본문 작성 등)에 ARM ARM·C11 표준·Michael 2002 논문과 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고, 원문 안에서 동시에 참일 수 없는 진술도 찾지 못했다(14·28행 lock-free 정의, 77·284·288행 LDADD 우위, 108·116~120행 ABA 설명은 서로 맞는다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 26~30행 progress 등급, 36~45행 CAS, 81~105행 Treiber stack, 112~121행 ABA, 125~192행 tagged pointer·hazard pointer·epoch은 표준 목록이다. 고유 관점은 77·288행 LDADD가 contention에서 CAS loop보다 유리하다는 주장, 192행 per-pointer vs per-thread 구분, 268행 glibc malloc이 lock-free 의미를 없앤다는 지적 정도다. 192행은 '일반적으로 … 점유할 수 있습니다'로 완곡하게 끝난다. |
| B | 12 | 18~22행 문제 → 개념·코드 → 247~272행 함정 → 274~288행 측정 → 290~297행 정리 흐름은 완성됐다. MPMC는 228~235행 struct와 237행 한 문장뿐이고, 241~245행 list·tree는 불릿이다. 146~166행 hazard pointer는 147행 __thread hp가 148행 hp_list와 연결되지 않는다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 7 | 278~286행 표의 환경은 276행 한 줄뿐이고 컴파일러·커널·측정 방법·벤치 코드가 없다. counter 실험이 아닌 285행 'SPSC queue', 4 thread와 맞지 않는 280행 'Mutex (uncontended)'가 섞여 있다. C ≤ 8이고 재현 절차가 없다. 93·101행 atomic_compare_exchange, 256행 3인자 atomic_store, 200행 미정의 T로 코드가 그대로 컴파일되지 않는다. |
| D | 7 | 같은 시리즈 `part4-06-rw-lock.md` 103~118행 RCU ↔ 190행, `part4-08-memory-ordering.md` 29~44행(37행 seq_cst 기본값) ↔ 253~272행. 다른 시리즈 `embedded-cpp/part4-03-lock-free-basics.md` 69행 CAS·96~115행 ABA·156행 SPSC·221행 MPMC ↔ 34~59·110~123·194~222·224~237행(hazard pointer는 286행 한 줄, epoch 없음), `embedded-cpp/part4-04-lock-free-container.md` 95·144행 ↔ 79~140행, `modern-recipes/part9-08-aba-problem.md` 24~33행 ↔ 112~192행, part9-04·9-05·9-10이 절마다 한 편씩 다룬다. 고유 역할은 274~288행 성능 비교인데 근거가 약하다. |
| E | 6 | 제목의 CAS·ABA·Hazard Pointer·Epoch Reclamation은 34·110·142·170행에 절이 있다. '성능'은 77행 한 문장과 274~288행 표뿐이고, description이 약속한 hazard pointer와 epoch 비교는 192행 한 문단이며 수치가 없다. |
| F | 6 | 299행 다음 편 'Memory Ordering'은 seriesOrder 37 `part4-08-memory-ordering.md`와 맞다. 303~305행 4-06, 4-08, Embedded C++ 4-03 라벨과 260행 '4-08 편'을 대상 파일과 대조해 맞음을 확인했다. 전제 지식 안내와 modern-recipes 9-04·9-05·9-08·9-10 링크가 없다. |
| G | 1 | 외부 링크가 없다. 168행 Michael 2002 논문, 226행 Vyukov, 241행 Harris-Michael은 이름만 있다. 47·77·138행 CASAL·LDADD·CASP·CMPXCHG16B에 ARM ARM·Intel SDM 인용이 없고 276행에 버전이 없다. |

uncertainties:
- 276·284행 Cortex-A72에서 LDADD(ARMv8.1 LSE)를 쟀다고 하나 A72가 ARMv8.0-A라는 것은 기억이고 TRM으로 확인하지 않았다. 글 안에 아키텍처 버전이 없어 내부 모순으로 확정하지 않았다.
- 280~285행 latency·throughput 정의가 없어 LDADD(50 ns, 320 M/s)·SPSC(25 ns, 400 M/s) 조합을 내부 모순으로 확정하지 않았다.
- 155~156행 continue 동작, 147행 hp와 hp_list 미연결, store-load fence 누락은 fact-check에서 확인한다.
- 93·101행 atomic_compare_exchange, 256행 3인자 atomic_store를 C11 표준으로 확인하지 않았다. 49~57행 LDREX/STREX에 fail 레이블·CLREX가 없다.
- 123행 'IBM 360에서 처음 보고', 168행 'DPDK·LMAX Disruptor가 hazard pointer 채택', 190·295행 'RCU가 epoch 위', 237행 'Folly MPMCQueue = Vyukov 구조'는 기억과 충돌하나 미확인이다.
- 260행 'release-acquire pair가 없으면 관찰하지 못합니다'는 과장일 수 있다. 192행은 완곡하고 295행 정리는 단정한다.

병합 대상: 병합 대상 없음. 가장 많이 겹치는 글은 `embedded-cpp/part4-03-lock-free-basics.md`·`part4-04-lock-free-container.md`, `modern-recipes/part9-04`·`9-05`·`9-08`·`9-10`이지만 시리즈를 넘는 병합은 4-06→4-07→4-08 흐름을 깬다. 다음 조치는 보강이다. Performance Engineering 안의 '성능' 관점이라는 독립 검색 의도가 있으므로, 일반 알고리즘 설명은 줄여 modern-recipes 9-0x로 링크하고 278~286행 표는 벤치 코드·컴파일러·커널·LSE 여부와 함께 재현 가능하게 만들거나 TBD로 둔다.

### `part4-08-memory-ordering.md` — 43점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건(루브릭 3-1). (1) 89행 표는 'Store seq_cst | STLR + barrier'인데 134행은 'Store seq_cst 5 cycle (LDAR/STLR과 동일)'이고, 같은 글이 barrier 비용을 135행 'DMB ISH 20-50 cycle', 257~259행 DMB ISH 30·DMB OSH 80·ISB 40 cycle로 적는다. STLR(133행 5 cycle)에 barrier를 더한 명령열이 STLR 단독과 같은 5 cycle일 수 없다. (2) 244행 'Barrier는 이미 atomic으로 발행된 access의 순서만 통제합니다'는 104행 'DMB | 이전 memory access 완료 후 이후 access 진행', 186~192행 non-atomic `fill_buf()` 쓰기와 `DMA->CR` 쓰기 사이의 `__DMB()` 설명('CPU가 buffer에 쓴 데이터가 메모리에 도달한 뒤에 DMA를 시작해야 하므로 DMB가 필요합니다')과 동시에 참일 수 없다. git log에 이 글의 주장을 1차 자료와 대조한 커밋이 없다(a82eb9d0은 TSan 링크 추가, 0a9dd7bc slug 고정, 68525f0c 코드 블록 산문 이동).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | memory order 6종(26~35행), 방향 설명(41~46행), acquire-release 예(50~61행), DMB/DSB/ISB 표(102~106행), volatile 함정(210~217행)은 표준 목록이다. 고유한 것은 x86·ARM 비용 비교(123~140행)와 'Cortex-A72에서 측정' 표(248~262행)인데 둘 다 출처·방법이 없다. 119행 '좁은 scope일수록 빠릅니다', 140행 '자주 발생합니다'는 근거 없는 일반화다. |
| B | 9 | 문제(18~22행)에서 정리(264~271행)까지 흐름은 있으나 절마다 코드 한 조각과 두세 문장이다. 155~166행 SPSC는 pop에서 미선언 `t`를 쓰고 tail 갱신·full 검사가 없다. 89·134행, 244·104·186~192행 내부 모순 두 건이 있어 B ≤ 13이고, 두 번째 모순 확인으로 1점 더 낮췄다. |
| C | 5 | 248행은 'Cortex-A72에서 측정'뿐이고 SoC·클록·측정 코드·반복 횟수·도구가 없으며 123~136행 x86/ARM 수치는 CPU 이름도 없다(C ≤ 8). 재현 명령·하네스가 없고 165행 미선언 `t`, 69·231행 3인자 `atomic_store`가 있다. 134행 수치가 89행과 모순이라 5. |
| D | 6 | 같은 시리즈 `part4-01-concurrency-basics.md`와 크게 겹친다: 26~37행 ↔ 110~126행, 48~63행 ↔ 128~141행, 65~78행 ↔ 143~159행, 89·134행 ↔ 163행, 94~108행 ↔ 169~177행, 210~217행 ↔ 237~244행. 다른 시리즈 `modern-recipes/part2-10-memory-barrier.md` 112~119행 ↔ 115~123행, 180~192행 ↔ 130~145행, 170~178행 ↔ 127~128행. `modern-recipes/part9-06-atomic-cost.md` 82~90행 ↔ 36~48행, 210~226행 ↔ 206~222행. `embedded-cpp/part4-03-lock-free-basics.md` 117·156행 절도 겹친다. 인접 4-07·4-09와는 역할이 갈린다. |
| E | 6 | Acquire·Release·Seq-Cst·ARM은 41~46·48~63·65~78·80~92행에서 다룬다. '분석'에 비해 본문은 개념 소개와 출처 없는 비용 표이고, 'ARM Relaxed Model'은 명령 매핑 표(82~90행)뿐이다. description의 'seq-cst 비용'은 89·134행이 어긋나 결론이 흐리다. |
| F | 6 | 273행 다음 편 'Cache Coherency — MESI'는 seriesOrder 38 `part4-09-cache-coherency.md`와 맞다. 277~279행 4-07, 4-09, `sanitizers/chapter04-tsan.md`(195~211행 relaxed flag 예)를 열어 라벨이 맞음을 확인했다. 전제 글(4-01) 안내가 없다. |
| G | 1 | 1차 출처 링크가 없다. C11/C++ 조항, Arm ARM, Cortex-A72 TRM, memory-barriers.txt 인용이 없고 152행 'C++17에서 deprecated'도 출처 없이 단정한다. |

uncertainties:
- 89행 'STLR + barrier'와 134행 '5 cycle' 중 어느 쪽이 맞는지 1차 자료로 확인하지 않았다. part4-01 163행 'DMB ISH 추가 (~30 cycle)', modern-recipes part9-06 42행 'STLR + DMB ISH'와도 엇갈린다(시리즈 간 모순).
- 37·268행 'seq_cst가 가장 비쌈'과 134행 '동일'은 동률이면 함께 참일 수 있어 오류로 올리지 않았다.
- 123~136·250~259행 수치는 출처·환경이 없다.
- 69~73·231행 3인자 `atomic_store`, 114~116행 `__DMB_ISH()`·`__DMB_NSH()`·`__DMB_OSH()` 이름, 196행 'Cortex-M55+M85 cluster', 182·188~192행 DMA 앞 DMB(DSB 필요 여부), 152행 consume deprecated 근거는 미확인이다.

병합 대상: 후보는 같은 시리즈 `part4-01-concurrency-basics.md`(memory order·acquire-release·SC·DMB 절)와 `modern-recipes/part9-06-atomic-cost.md`(ARM 매핑·함정)다. 판정은 오류 확인으로 우선 조치이며, 먼저 89·134행과 244·104·186~192행 모순을 Arm ARM과 C/C++→AArch64 매핑 1차 자료로 정정한다. 그 뒤 x86·ARM 비용 비교를 측정 환경과 함께 독립 글로 남길지 4-01과 병합할지 시리즈 단위로 정한다.

### `part4-09-cache-coherency.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 35행에 넣은 그림의 소스 `public/images/blog/perf-eng/diagrams/part4-09-mesi-states.tex` 48~50행은 'Remote read: E -> S, M -> S'이고 M→S 화살표에 'remote read (flush)' 라벨을 단다. 41행 표는 같은 사건('Read miss | 다른 cache에 M')을 '그 cache가 flush 후 I, this → S'로 적는다. 같은 글에서 M 보유 cache의 다음 상태가 S와 I로 갈린다. 41행은 30행 S 정의('여러 cache valid')와도 맞지 않는다. git log(0a9dd7bc, 68525f0c, be973200, ac24bb76 등)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | MESI 표(26~31행), MOESI 표(55~61행), snoop·directory(65~87행), AXI/ACE/ACE-Lite/CHI 표(150~155행)는 교과서 수준 목록이다. 고유 자료는 219~228행 Cortex-A72 표뿐인데 보드·커널·명령이 없다. NUMA(119~135행), CXL(137~146행), ASIL lock-step(186~188행)은 주제와 거리가 있는 짧은 나열이다. |
| B | 10 | 도입(16~22행) → 상태(24~47행) → MOESI(51~63행) → 구현(65~87행) → 측정(102~117행) → 함정(190~215행) → 정리(232~239행) 흐름은 있다. MOESI는 O 상태 전이가 없고 111행 'Snoop hit'은 event 코드가 없다. 41행 모순과 108~110·77행 불확실로 B ≤ 13. |
| C | 6 | perf stat(114행), perf c2c(174~175행), numactl(132행) 명령은 있다. 219~228행 표는 'Cortex-A72 4-core cluster'뿐이고 'high/low/100+' 칸은 실측 출력으로 볼 수 없다(C ≤ 8). 126행 '1.5-2x latency'도 출처가 없다. 166행 `MPU->RBAR = ... |`는 실행할 수 없는 의사 코드이고 131~133행 셸 명령이 c 블록에 있다. |
| D | 9 | 같은 시리즈 `part4-02-false-sharing.md` 44~60행 ↔ 26~47행 MESI, 170~182행 ↔ 171~184행 perf c2c, '측정 — 실 cycle' 절 ↔ 91~100행. `part4-10-smp-analysis.md` 87·95행 ↔ 126·132행. `part3-01-bus-architecture.md` 24~27·142행 ↔ 77·150~157행. `part3-11-cxl-interconnect.md` 44~45·59~61행 ↔ 141~142행. 다른 시리즈 `modern-recipes/part2-06-arm-cache.md` 42~50행 ↔ 192~199행(그쪽은 출처 있음). MOESI·snoop/directory 비교는 이 글에만 있다. |
| E | 6 | MESI·MOESI·Snoop·Directory는 24~87행에서 다룬다. description의 'coherency overhead 측정'은 102~117·217~230행이 맡지만 event 코드가 의심스럽고 환경이 없다. 제목에 없는 NUMA·CXL·lock-step 절이 초점을 흐린다. |
| F | 6 | 241행 다음 편 'SMP 성능 분석'은 seriesOrder 39 `part4-10-smp-analysis.md`와 맞다. 245~247행 4-02·4-08·4-10 라벨을 대상 제목과 대조해 맞음을 확인했다. 100행 '4-02 편'은 링크가 없고 NUMA·CXL 절에서 4-10·part3-11로 넘기는 링크도 없다. |
| G | 1 | 1차 출처 링크가 없다. AMBA ACE/CHI, CCI-400 TRM, Arm ARM PMU event 표, CXL 명세를 판과 함께 인용하지 않는다. 버전 표기는 139행 'CXL 2.0과 3.0'뿐이다. |

uncertainties:
- 108~110행 PMU event 코드(0x2A/0x2B/0x2D)는 기억상 L3D 계열이나 TLB refill일 수 있다. Arm ARM 표로 확인하지 않았다.
- 77행 CCI-400 '최대 5 master, 4 cluster'(part3-01 142행도 같음), 87행 'Cortex-A78 서버급 SoC', 53행 'Cortex-A는 MOESI', 125행 'CCIX (ARM)', 157행 'CHI는 directory 방식'은 미확인이다.
- 135행 numactl로 cross-socket traffic을 '0으로'는 과장일 수 있다.
- 165~169행 Cortex-A 문맥에서 MPU->RBAR 예가 맞는지 미확인이다.
- 219~226행 '4-core cluster'와 'Cross-cluster snoop'은 클러스터 수가 적혀 있지 않아 모순으로 확정하지 않았다.
- 그림 SVG에는 라벨이 글리프로 들어가 grep되지 않아 모순 판단은 tex 소스 48~50행에 기댔다.

병합 대상: 병합 대상 없음. MESI/MOESI·snoop/directory 비교는 4-02·4-10이 다루지 않는 독립 주제다. 다음 조치는 보강이다. 41행 전이를 그림과 AMBA ACE 명세로 대조해 고치고, 108~110행 event 코드와 77·87행 interconnect 주장을 Arm ARM·CCI-400 TRM으로 확인한다. NUMA·CXL·Cortex-M DMA 절은 4-10·part3-11·modern-recipes 2-06 링크로 줄이고 219~228행 표는 환경을 붙이거나 TBD로 바꾼다.

### `part4-10-smp-analysis.md` — 43점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순(루브릭 3-1). 209행 USL 식 S(N)=N/(1+α(N-1)+βN(N-1))에 216행 α=0.1, β=0.01을 넣으면 4 core 2.82, 8 core 3.54, 16 core 3.27, 32 core 2.28이다. 217~220행은 3.0x, 4.7x, 5.8x, 5.7x이고 220행은 32에서 'peak 후 하락'이라 하지만 식의 최댓값은 N≈sqrt((1-α)/β)≈9.5다. 같은 글의 식과 표가 동시에 참일 수 없다. git log(42ebbcbb, 92bdd7df, 84b54508, 4e66cbfc KaTeX, 6205e212, ac24bb76, be973200, 68525f0c, 0a9dd7bc)에 fact-check 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | mpstat(26~35행), taskset·sched_setaffinity(43~53행), numactl(90행), isolcpus(180~189행), schedstat(193~203행), Amdahl·USL(207~213행)은 도구 사용법 나열이다. 고유 해석은 37행 mpstat 패턴과 203행 nr_migrations·nr_involuntary_switches 해석 정도다. 61행 '워크로드 특성에 따라 … 선택해야 합니다', 229행 '유리하기도 합니다'는 일반론이고 85·97·99행 수치는 출처가 없다. |
| B | 9 | 22행 약속대로 진단 → affinity·NUMA → migration → scalability를 다루지만 절 대부분이 코드 한 조각과 한두 문장이다(101~111·113~120·122~132행). 18행 '어디서 손실이 났는가'를 가르는 절차가 없고 276행은 fitting 방법 없이 끝난다. 216~220행 USL 예시는 식과 맞지 않고, 227행은 '4 core × 16 W'와 '6 core'가 섞인다. |
| C | 6 | 실행 가능한 명령(27·44~45·169·194~195행)은 있지만 커널·보드가 없다. 79~82행 migration cost, 143행 'Cortex-A53에서 5 µs', 267~273행 표는 출처·환경 없는 수치라 C ≤ 8이다. 90행 셸 명령이 C 블록에 있고 186·236행 `{2, 3}` 인자는 컴파일되지 않는 의사 코드다. |
| D | 8 | 인접 `part4-09-cache-coherency.md`(38)·`part5-01-perf-basics.md`(40)와는 역할이 다르다. 같은 시리즈 USL 식 209행 = `part1-07-modeling.md` 118행 = `part6-03-case-lock-contention.md` 114행, α·β 설명 211·223행 ↔ part1-07 120~122행, part6-03 116~118행. 다른 시리즈 `rtos/practical-internals/part4-07-smp-rtos.md` 98·213행 ↔ 108행, 119~120행 ↔ 116~117행(코드 동일), 125~139행 ↔ 134~147행. `modern-recipes/part8-06-numa.md` 65행 ↔ 90행, `modern-recipes/part7-13-irq-affinity.md` 145~149행 ↔ 180~189행. 고유 역할은 mpstat·schedstat 기반 불균등 진단(24~39·191~203행)이다. |
| E | 5 | Per-Core(24행), Affinity(41행), Load Balance(63행), Scalability(205·262행)와 description의 NUMA·migration·Amdahl 절은 있다. 그러나 'SMP 성능 분석'을 약속하는데 Load Balance는 CFS 설명 세 문장(63~72행)이고 18행 손실 분석 절차가 없어 루브릭 E 3~5점을 적용했다. FreeRTOS·Zephyr·big.LITTLE·power capping으로 범위가 퍼진다. |
| F | 5 | 291~293행 4-09, 4-02, RTOS 3-01 대상을 열어 라벨·`draft: false`를 확인했다. 287행 다음 파트 안내는 링크 없이 'perf, ftrace, LTTng'를 내걸지만 performance-engineering 디렉터리에서 LTTng가 나오는 글은 part1-01과 이 글뿐이고 part5에는 없다. 안내가 실제 내용과 달라 F ≤ 5. RTOS part4-07, Recipes part8-06 링크와 전제 지식 안내도 없다. |
| G | 1 | 1차 출처 링크가 없다. 버전 표기는 101·111행 'FreeRTOS 11'뿐이고 커널 버전, libnuma 버전, USL 출처(Gunther)가 없다. 143·97행 수치도 출처가 없다. |

uncertainties:
- 79~82행 migration cost, 85행 '30%까지', 97행 '60-70%·1.5-2배', 99행 '두 배 가까이', 143행 IPI 5 µs는 출처가 없다.
- 164행 'RT task는 load balancing 제외'는 RT class push/pull과 맞지 않을 수 있다. kernel/sched/rt.c로 확인하지 않았다.
- 111행 'Cortex-M55+M85 멀티코어'·'FreeRTOS 11 SMP 자동 load balancing', 65·70행 balancing 주기·sched domain 순서, 153·260행 SCHED_FIFO·sched_setattr 설명은 미확인이다.
- 227행 코어 수 혼동, 239행과 233행 안티패턴 제목의 연결이 불명확하다.
- 276행 '8 thread까지 거의 선형'과 271행 speedup 5.2(효율 65%)는 산문 해석 차이라 오류 확인에 넣지 않았다.
- 266~274행 표가 실측인지 가상 예시인지 적혀 있지 않다.

병합 대상: 글 전체 병합 없음. 먼저 216~220행 USL 예시를 209행 식으로 다시 계산해 고친다(2.82/3.54/3.27/2.28, peak 약 9.5 core). 절 단위 후보는 FreeRTOS·Zephyr·IPI(101~120·134~147행) ↔ `rtos/practical-internals/part4-07-smp-rtos.md`, NUMA(87~99행) ↔ `modern-recipes/part8-06-numa.md`, Amdahl·USL(205~223행) ↔ `part1-07-modeling.md`다. 오류 수정 뒤 다음 조치는 보강으로, mpstat·schedstat 기반 진단 축으로 범위를 좁히고 겹치는 절은 링크로 대체한다.

### `part5-01-perf-basics.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). perf annotate 예시에서 171행 `23.4 │ 12: add (%rcx), %edx ← 가장 hot`인데 같은 블록 174행 `76.0 │ 19: jne 10 ← 분기 hot`이 더 크다. 23.4가 '가장 hot'이라는 표기와 76.0은 동시에 참일 수 없다. 168~174행 비율 합계도 0.5+23.4+0.3+0.2+76.0=100.4%로 반올림 오차(최대 0.25)로 설명되지 않는다. 177행 결론이 이 표기에 기댄다. 76~83행(4.150 GHz, 1.61 IPC, 0.05%), 102~104행, 140·151~154행(18.20+5.25=23.45)은 직접 계산해 맞았다. git log(0a9dd7bc, be973200, ac24bb76, 6205e212, 4e66cbfc 등)에 fact-check 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 설치(28~40행), paranoid(44~52행), stat→record/report→annotate→top→diff는 perf 입문 자료의 흔한 구성이다. 고유 부분은 metric 기준 표(88~92행), IPC가 낮을 때 cache→branch→frontend/backend로 좁히는 절차(236~249행), ARM Cortex-A fp 조언(194행) 정도다. 90·107·117·231~233행 기준값은 대상 코어·출처가 없고 14행 '90%의 성능 진단'은 근거 없는 과장이다. |
| B | 12 | 22행 범위 → 설치 → 권한 → stat → record/report → annotate → call graph → top → diff → 해석 → 함정 → 정리(293~298행)로 끝까지 간다. 핵심 annotate 출력(167~177행)에 내부 모순이 있고, 임베디드 쪽은 36·194·268행뿐이며 cross 환경(perf 버전·sysroot 심볼)이 없다. 260행 심볼 분리는 방법이 없다. B ≤ 13. |
| C | 7 | 그대로 실행할 명령(30~39·51·57·63·99·112·125·185~191·201~203·213~215·240~246행)과 예시 출력이 있다. 출력 환경이 없고 76~83·141행은 4.150 GHz, `__memcpy_avx_unaligned`, `libc-2.31.so` 같은 x86 데스크톱 값인데 조언은 ARM 기준이다. 265·268·206·281행 수치는 출처가 없어 C ≤ 8, annotate 모순으로 1점 더 뺐다. |
| D | 8 | 같은 시리즈 `part5-02-perf-advanced.md`: call graph 183~194행 ↔ 111~120행, 268행 ↔ 209행(같은 문장), 270~277행 ↔ 213~220행, 279~281행 ↔ 222~226행, 206행 ↔ 236행. `part2-10-pmu.md` 57~71·235~240행 ↔ 44~52·66~144행. `part1-08-profiling-overview.md` 72~89·204~211행 ↔ 121~146행. 앞 글 `part4-10-smp-analysis.md`는 겹치지 않는다. 다른 시리즈 `tools/perf-flamegraph/chapter02-perf-list-stat.md`·`chapter03-perf-record-report.md`는 draft라 공개 글 중복이 아니다. |
| E | 7 | 제목 'stat·record·report 활용'과 description '설치, 권한, 첫 측정부터 핫스팟 분석까지'를 24~177행이 다룬다. 핫스팟 예시(171·174행) 모순이 신뢰를 깎고 14행 과장이 있으며 임베디드 SoC 독자에 맞춘 문제 정의가 약하다. |
| F | 7 | 300행 다음 편 안내는 seriesOrder 41 `part5-02-perf-advanced.md`와 맞다. 304~307행 5-02, `part1-01-methodology.md`, `part2-10-pmu.md`, `rtos/practical-internals/part2-11-tracing-observability.md` 모두 라벨·대상이 맞고 공개 상태다. 22행이 범위와 다음 편을 예고한다. 전제 글(2-10, 1-08) 본문 안내가 없고 1-08은 관련 항목에도 없다. |
| G | 1 | 1차 출처 링크(perf wiki, man page, perf-security.rst)가 없고 perf·커널 버전, 측정 CPU가 없다. 46~49행 paranoid 값, 63행 cap_perfmon, 268행 overhead를 어떤 출처와도 잇지 않았다. |

uncertainties:
- 46~49행 perf_event_paranoid 설명은 2에서도 프로세스 단위 user-space 측정이 허용된다는 기억과 맞지 않을 수 있고 배포판 기본값(3·4)이 빠졌다. perf-security.rst로 확인하지 않았다.
- 63행 cap_perfmon은 커널 5.8 이상에서만 쓸 수 있으나 버전 표기가 없다.
- 177행 해석은 sampling skid와 충돌할 수 있다.
- 265·268·206행 수치, 90·107·117·231~233행 기준값은 출처가 없다. 281행 'multiplex 50% 이하라면 추정값' 기준선이 부정확할 수 있다.
- 125행 99 Hz 예시와 268·298행 '999~4000 Hz 표준'은 모순은 아니지만 혼동을 줄 수 있다.

병합 대상: 후보는 `part5-02-perf-advanced.md`(call graph·overhead·함정 중복)와 `part2-10-pmu.md` 57~71·235~240행이다. 5-01은 Part 5 perf 입문으로 독립 검색 의도가 있어 합치지 않는다. 판정은 우선 조치이며, 171·174행 '가장 hot' 모순과 100.4% 합계를 먼저 고친 뒤 다음 조치는 보강이다(중복은 5-02 한쪽에만 남기고 링크, 예시 출력 환경 명시 또는 ARM 보드 출력으로 교체, 기준값·overhead에 출처를 달거나 삭제).

### `part5-02-perf-advanced.md` — 43점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(42ebbcbb stub 추가, 3b861694 본문 작성, 6205e212, ac24bb76, be973200, 0a9dd7bc, 387d7b79 DWARF CFI 링크 추가)에 perf 매뉴얼·커널 소스·Arm ARM과 대조한 기록이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 고유한 것은 sched:sched_switch 콜백 perf script Python 예(139~147행), tracepoint 카테고리(99~106행), software event 표(74~80행) 정도다. perf list 분류(35~41행), call-graph(110~118행), perf top·sched·mem·c2c(159~194행)는 매뉴얼 명령 목록 수준이다. 155행 '직접 계산하거나 … 출력할 수 있습니다'는 계산을 보여 주지 않고, raw event는 46~47행 두 줄과 50행 'TRM에서 정의를 찾을 수 있습니다'로 끝난다. |
| B | 9 | 주제를 열 개 넘게 훑지만 절마다 명령 한 블록과 한두 문장이다. 241행 `pmu/event=.../` 형식은 본문에서 설명하지 않았고, 22·243행 '커스텀 분석기'는 print 하나(144~146행)다. 155행 wake-up latency 코드가 없고 177~180행 perf sched 출력을 182행 판단으로 잇는 설명이 없다. |
| C | 6 | 실행 가능한 명령(27~30·89~90·132~153·170~173·198~206행)과 Python 콜백은 있다. 커널·perf 버전·보드가 없고 94·177~180행 출력은 환경이 없다. 120행 'DWARF 5-10%', 209행 '4 kHz 2-5%', 236행 '30분 이상'은 출처 없는 수치라 C ≤ 8. 검증 절차가 없다. |
| D | 6 | 같은 시리즈 `part5-01-perf-basics.md`: 110~120행 ↔ 179~194행, 157~165행 ↔ 196~206행, 236행 ↔ 206행, 209행 ↔ 268행, 213~220행 ↔ 270~277행, 222~228행 ↔ 279~281행. `part2-10-pmu.md` 65·199~202행 ↔ 46·222~228행. `part4-09-cache-coherency.md` 171~184행·`modern-recipes/part9-09-false-sharing.md` 169~180행 ↔ 190~194행. `part5-03-ftrace.md` 138~159행 ↔ 84~106행. 고유한 것은 software event 표, perf script Python, perf sched다. 본문 약 절반이 반복이다. |
| E | 6 | 제목 세 키워드 중 tracepoint(84~106행)와 perf script(128~155행)는 다루지만 raw event는 43~50행이 전부이고 지정 방법은 241행에만 있다. description의 '커스텀 분석'은 print 필터 하나이고, perf top·sched·mem·c2c(157~194행)는 제목에 없다. |
| F | 6 | 247행 다음 편 'ftrace 활용'은 seriesOrder 42 `part5-03-ftrace.md`와 맞다. 251~255행 5-01, 5-03, 4-09, RTOS 2-11, `dwarf-elf` chapter05를 열어 라벨이 맞음을 확인했다. 18행이 5-01을 전제로 짚는다. RTOS 2-11은 Tracealyzer·ITM/ETM 글이라 연결이 약하고 단계 구분이 없다. |
| G | 1 | 1차 출처 링크가 없다. perf·커널 버전, 대상 코어, PMU 버전이 없고 50행 'TRM'은 문서·절을 밝히지 않는다. 120·209행 수치에도 출처가 없다. |

uncertainties:
- 33행 '분류는 크게 네 가지'인데 36~40행은 다섯 개다. 개수 표기 실수라 오류 확인에 넣지 않았다.
- 59행 group과 multiplex 설명, 165행 perf top '1초마다 refresh', 50행 architectural event 정의 위치, 86·232행 tracepoint 'NOP 한 줄', 126행 `graph,0.5,caller`, 194행 perf mem 지원 조건은 매뉴얼·소스로 확인하지 않았다.
- 20행 'raw event가 절반 이상', 199행 '기본 4 kHz', 120·209·236행 수치는 출처가 없다.
- 94·177~180행 출력이 실제 실행 결과인지 알 수 없다.

병합 대상: `src/content/blog/embedded/performance-engineering/part5-01-perf-basics.md`. call-graph(110~120행), perf top(157~165행), sampling 권장(209행), fp·multiplex 함정(213~228행)은 5-01 179~206·268~281행과 거의 같아 이 글에서 줄이고 5-01을 가리킨다. 다음 조치는 보강이다. tracepoint·perf script·perf sched는 5-01에 없는 독립 검색 의도가 있어(루브릭 5절 차별화 보강) 통째 병합하지 않는다. raw event 절에 perf list에서 코드를 읽고 `armv8_pmuv3/event=0x..,/`로 지정하는 절차를 매뉴얼·Arm ARM과 함께 넣고, sched_switch·sched_wakeup으로 wake-up latency를 실제로 계산하는 예를 완성한다.

### `part5-03-ftrace.md` — 46점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(387d7b79 시리즈 간 링크 추가, 0a9dd7bc slug 고정, 그 밖에 메타데이터·seriesOrder·본문 작성·stub)에 ftrace.rst·커널 소스와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았다. 20·194·246행 'zero overhead'와 197행 '비활성 (nop): ~1-2%'는 어긋나지만 요약의 단정과 본문 수치의 충돌이라 오류 확인으로 올리지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | tracefs(24~49행), function tracer와 필터(51~75행), function_graph(77~101행), event(136~160행), trace-cmd·KernelShark(162~178행), kprobe(180~190행)는 커널 문서 순서를 따르는 입문 내용이다. 고유한 것은 overhead 표(196~202행)와 함정 네 가지(206~242행)인데 표는 출처가 없고 134·204행은 근거 없는 일반론이다. |
| B | 11 | 문제(16~22행) → tracefs → tracer별 사용(51~134행) → event·trace-cmd·kprobe → overhead → 함정 → 정리(244~251행) 흐름은 완성됐다. 22행 `/sys/kernel/debug/tracing`과 29~30행 `/sys/kernel/tracing`의 관계를 설명하지 않고, irqsoff 출력(115~123행) 해석과 preemptoff 실행 예가 없다. 129·134·197행 불확실로 B ≤ 13. |
| C | 7 | 복사해 실행할 명령(43~49·53~60·79~86·107~113·140~147행)과 예상 출력(62~68·88~99·115~123행)이 있다. 커널 버전·보드가 없고 185행 kprobe `+0(%si)`는 x86-64 레지스터인데 설명이 없다. 197~201행 퍼센트는 출처 없는 수치라 C ≤ 8. |
| D | 4 | `tools/debugging/kernel/chapter03-ftrace-tracepoints.md`가 거의 전부를 포함한다: 53~60행 ↔ 63~69행, 79~86행 ↔ 267~272행, 72~75행 ↔ 113~125행, 141~153행 ↔ 169~178행, 185행 ↔ 253행(같은 kprobe 문자열, 저쪽은 260행에서 x86-64 명시), 107~123행 ↔ 292~308행, 166~178행 ↔ 310~332행, 230행 ↔ 343~346행, 20행 ↔ 135·241행, latency tracer 표 125~132행 ↔ 48~58행. 이 글에만 있는 것은 preemptirqsoff·wakeup_dl 두 줄과 출처 없는 overhead 표다. `part5-02-perf-advanced.md` 84~97행과도 138행이 겹친다. `part5-04-ebpf.md`·RTOS part2-11과는 역할이 구별된다. |
| E | 7 | function·function_graph·latency tracer가 51~75·77~101·103~134행 절로 다뤄진다. description의 preemptoff는 128행 표 한 줄뿐이고 실행 예는 irqsoff뿐이다. 대상 아키텍처·커널 범위가 없고 185행은 x86 전제다. |
| F | 6 | 253행 다음 편 'eBPF/bpftrace'는 seriesOrder 43 `part5-04-ebpf.md`와 맞다. 257~260행 5-02, 5-04, RTOS 2-11, Kernel Debugging chapter03 라벨이 대상과 맞다. 전제 지식 안내가 없고 22·29행 경로가 달라 방향이 흐리다. |
| G | 1 | Documentation/trace/ftrace.rst 같은 출처 링크가 없고 커널·trace-cmd 버전, 보드가 없다. 196~202행 수치와 230행 '기본 1408 KB'도 출처가 없다. |

uncertainties:
- 20·194·246행 'zero overhead'와 197행 '~1-2%'의 충돌, 197~201행 수치 출처 없음.
- 20행 'NOP 두 명령'은 아키텍처별 패칭 방식에 따라 다르고 Kernel Debugging 135행은 'nop 5바이트'라 쓴다. 미확인.
- 129행 preemptirqsoff '둘 다 disable된 구간', 134행 wakeup_rt 'hardware interrupt부터'는 ftrace.rst와 다를 수 있다는 기억. 미확인.
- 74행 `echo '!nf_*' >> set_ftrace_filter`를 '제외'로 설명한 것은 set_ftrace_notrace와 혼동했을 수 있다(기억 기반).
- 81·185행 `do_sys_open`은 최근 커널에서 do_sys_openat2 경로라 예제가 안 나올 수 있다.
- 230행 1408 KB, 204행 'background로 켜 두는 것이 보통', 117행 `#20/20` 출력의 진위는 미확인이다.

병합 대상: `src/content/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints.md`(Kernel Debugging 3). 다만 chapter03 422행이 이 글을 'overhead까지 따지는 성능 쪽'으로 소개하고 seriesOrder 42를 비우면 5-02→5-04 흐름이 끊기므로, 먼저 차별화 보강(실제 보드에서 tracer별 overhead 측정 절차와 결과, latency tracer 결과 해석, ARM64 kprobe 인자, 커널 버전 명시)이 가능한지 정한다. 측정 근거를 만들 수 없으면 Kernel Debugging 3으로 병합하고 이 URL은 리다이렉트를 검토한다.

### `part5-04-ebpf.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료 iovisor/bcc `tools/profile.py`(master c398a9a7 93~134행, v0.5.0·v0.12.0·v0.18.0·v0.29.1 태그 동일)를 열어 확인했다. 118행 `profile-bpfcc -F 99 -ag 30`의 `-g`는 어느 버전의 argparse에도 없는 옵션이라 거부된다(-a는 annotations, folded는 -f). 같은 글 124·148행은 `-af`를 쓴다. 보조 근거: `tools/runqlat.py` 58~61행은 interval(초)·count, `profile.py` 123~125행은 duration(초)이라 145행 `runqlat-bpfcc 10 1`(10초)과 148행 `... 30`(30초)만으로 40초이고 152행 `biolatency-bpfcc`는 인자 없이 Ctrl-C까지 돈다. 166행 '30초 안에'는 이 명령들과 맞지 않는다. git log(387d7b79 교차 링크, 0a9dd7bc slug 고정 등)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 26~33행 VM·verifier, 50~63행 one-liner, 80~104행 probe 비교, 110~119행 BCC 목록은 입문 자료에 흔하다. 고유한 것은 130~137행 overhead 비교 표, 143~166행 latency spike 진단 순서, 168~178행 BPF_LSM인데 표는 출처가 없고 진단 순서는 118·148행 명령과 166행 결론이 1차 자료와 맞지 않는다. ARM 보드·BTF·cross 설치 관점이 없고 96행 uprobe 경로는 x86_64 libc다. |
| B | 11 | 문제(16~22행)부터 정리(218~225행)까지 흐름은 완성됐다. verifier 절에 명령 수 한도·CO-RE/libbpf-tools가 없고 임베디드 전제는 37행 한 줄이다. 172~177행 LSM 예는 모든 exec를 -EPERM으로 막는 골격이다. 130~137·184~190행 불확실로 B ≤ 13. |
| C | 6 | 그대로 쓸 명령(52·55·58~63·93~101·113~117·145·155~163행)과 histogram 출력 형태(69~76행)는 있다. 118행 `-ag`는 그대로 실행하면 실패한다. 커널·bpftrace·BCC 버전과 보드가 없고 130~137행 표는 출처 없는 수치라 C ≤ 8이다. 166행 '30초 안에'는 145·148·152행 명령 시간과 맞지 않는다. 실행 실패 명령으로 1점 낮췄다. |
| D | 8 | 비교 글: 인접 `part5-03-ftrace.md`(42), `part5-05-flamegraph.md`(44), 같은 시리즈 `part5-10-ebpf-continuous.md`(49), 다른 시리즈 `tools/debugging/kernel/chapter04-ebpf-kernel.md`. chapter04와 58~63행 ↔ 143~153행, 91~101행 ↔ 61~92행(USDT 101행 ↔ 78행 동일), 110~119행 ↔ 251~270행, 26~33·192~199행 ↔ 370~379행, 155~163행 ↔ 197~207행. 같은 시리즈 123~126행 ↔ 5-05 66~67행, 89행 ↔ 5-03 180~190행. 고유한 것은 overhead 표, 진단 순서, BPF_LSM이다. |
| E | 7 | 제목·description의 VM·verifier, one-liner, BCC tools, probe 비교가 24·40·106·80행 절과 대응한다. 독자 환경(임베디드 보드인지 x86 서버인지)이 흐리고 224행 'overhead가 훨씬 낮습니다'는 출처 없는 표에 기댄다. |
| F | 7 | 227행 다음 편 'Flamegraph 분석'은 seriesOrder 44 `part5-05-flamegraph.md`와 맞다. 231~234행 5-03, 5-05, 5-10, chapter04를 열어 라벨이 맞음을 확인했고 180행 'Tetragon은 5-10편에서'도 5-10 166행 절과 맞다. 143~163행 시나리오가 번호 단계로 나뉜다. 전제 지식(5-03) 안내가 없다. |
| G | 1 | 1차 출처 링크가 없다. 30행 '5.3+ bounded loop', 170행 '5.7+ BPF_LSM', 36행 '4.9+ 권장', 195행 '512 byte'에 커널 문서·커밋 인용이 없고 bpftrace·BCC 버전도 없다. 같은 주제의 chapter04가 bpftrace tutorial·BCC tools 링크(434~437행)를 단 것과 대조된다. |

uncertainties:
- 130~137행 overhead 수치는 출처·측정 환경이 없다.
- 30·170·36행 커널 버전 주장을 커널 문서·커밋으로 확인하지 않았다. 184~190행은 30행과의 관계가 모호하다.
- 121행 'profile-bpfcc는 collapsed 형식으로 출력'은 profile.py 114행상 -f를 줄 때만 맞다. 124행은 -f를 써서 문장 범위 문제로 둔다.
- 172~177행 BPF_LSM 예는 그대로 로드하면 시스템 전체 exec가 막힌다. BPF_PROG 시그니처는 확인하지 않았다.
- 18행 '100 KHz' 표기와 근거, 69~76행 출력이 실제 실행 결과인지 밝히지 않았다.

병합 대상: 후보는 `tools/debugging/kernel/chapter04-ebpf-kernel.md`(probe·one-liner·BCC 목록·verifier 겹침)지만 성능 측정(overhead 비교, latency spike 진단)이라는 별도 검색 의도가 있어 병합하지 않는다. 판정은 우선 조치이며 118행 옵션과 166행 시간을 고친 뒤 다음 조치는 보강이다(공통 설명은 chapter04 링크로 줄이고 overhead 표에 출처·환경을 붙임).

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 공통 H2 뼈대: '한 줄 요약 / 어떤 문제를 푸는가 / … / 자주 보는 함정과 안티패턴 / 측정 — 실측 결과 / 정리 / 관련 항목'이 10편 모두에 있다(예: part4-05 12·16·194·225·241·252행, part4-06 12·16·200·236·250·261행, part4-08 12·16·208·246·264·275행, part4-09 12·16·190·217·232·243행, part4-10 12·16·231·278·289행, part5-02 12·16·211·238·249행). part4-03~4-10 8편은 한 커밋 84b54508로 같은 날 작성됐다. 9절 scaled content 기록 대상이다.
- 출처·환경 없는 '측정 — 실측 결과' 표: CPU 이름 한 줄과 수치만 있다. part4-05 225~237행(Cortex-A53), part4-06 238~246행(Cortex-A72), part4-07 276~286행, part4-08 248~262행, part4-09 219~228행, part4-10 266~274행. Part 5에서도 overhead 표가 같은 패턴이다(part5-03 196~202행, part5-04 130~137행). 7편 이상에서 C ≤ 8 상한이 걸렸다.
- 내부 수치·산술 불일치: part4-05 117~123행(합계 산술), part4-06 98·243행, part4-08 89·134행, part4-10 209·216~220행(USL 재계산), part5-01 171·174행(annotate 비율). 1차 자료 없이 원문만으로 확인된 오류가 5편이다. 같은 일괄 작성 글의 수치를 전수 검산해야 한다.
- 본문 1차 출처·버전 표기 없음: 10편 모두 G = 1이다. 커널·glibc·perf·BCC 버전, Arm ARM·TRM·커널 문서 인용이 없다.
- git 이력에 1차 자료 대조 커밋 없음: 10편 모두 factcheck '검증됨'이 아니다. 이 시리즈는 `/fact-check-round`를 거치지 않았다.
- 시리즈 내부·외부 주제 중복: lock·memory ordering은 part4-01·4-04·embedded-cpp part4-03/04·modern-recipes part2-10·9-02~9-10·rtos practical-internals part1-08·3-05와(part4-05·4-06·4-07·4-08), perf·ftrace·eBPF는 part5-01↔5-02·part2-10·part1-08·Kernel Debugging chapter03·chapter04와(part5-01·5-02·5-03·5-04) 겹친다. 시리즈 사이 역할 분리와 교차 링크가 필요하다.
- 시리즈 안팎 수치·서술 모순(다른 글과의 모순이라 오류 확인은 아님): seq_cst store 매핑(part4-08 89·134행, part4-01 163행, modern-recipes part9-06 42행), MESI M→S/M→I(part4-02 55~57행, part4-09 41행), RW-lock write 비율(part4-03 169행, part4-06 244행), adaptive spin 기본 여부(part4-04 201행, part4-05 76행), sampling 범위(part5-01 268·298행 '999~4000 Hz', part5-02 209·245행 '1-4 kHz'), PMU counter 수(part2-10 199·250행, part5-02 65·228행). 정본을 1차 자료로 정하고 known-falsehoods 등재를 검토한다.
- x86 전제 예제: 임베디드 시리즈인데 part5-01 76~83·141행(x86 데스크톱 출력), part5-03 185행(`%si` kprobe), part5-04 96행(x86_64 libc 경로)이 x86 기준이다.
- 링크 없는 본문 교차 참조와 전제 지식 안내 부재: part4-09 100행 '4-02 편', part4-10 287행 다음 파트 안내, 그리고 10편 모두 전제 글 안내가 없다.

## 다음 조치

- 우선 조치(7편, 오류 확인): part4-05 117~123행 Mutex_DB 출력, part4-06 98·243행 배수, part4-08 89·134행과 244·104·186~192행, part4-09 41행 MESI 전이, part4-10 216~220행 USL 예시, part5-01 171·174행 annotate 비율, part5-04 118행 `-ag`와 166행 '30초'를 먼저 정정한다. 근거를 만들 수 없는 수치는 지우거나 TBD로 둔다.
- part4-10 287행 다음 파트 안내(LTTng)를 실제 Part 5 목록과 맞춘다.
- 병합 검토(3편): part5-03은 Kernel Debugging chapter03과의 차별화 보강 가능 여부를 먼저 정하고, 불가하면 병합·리다이렉트를 검토한다. part5-02는 5-01과 중복 절을 줄이고 raw event·perf script를 보강한다. part4-07은 알고리즘 설명을 modern-recipes 9-0x 링크로 줄이고 성능 비교를 재현 가능하게 만든다.
- Embedded Performance Engineering Part 4·5를 `/fact-check-round` 대상으로 올리고, 84b54508 일괄 작성 글의 실측 표 진위와 내부 산술을 전수 검산한다. 시리즈 간 모순 수치는 1차 자료로 정본을 정한 뒤 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
