# 공개 글 AdSense 평가 — 루프 22

> 대상: 공개 글 10편 (Embedded Performance Engineering, `seriesOrder` 44~53)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 스물두 번째 루프다. 대상은 `src/content/blog/embedded/performance-engineering/`의 Part 5 후반(part5-05~part5-10, 프로파일링 도구)과 Part 6 앞부분(part6-01~part6-04, 실전 사례) 10편이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part5-05-flamegraph.md` | 11 | 12 | 7 | 12 | 7 | 7 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part5-06-arm-ds-lauterbach.md` | 12 | 11 | 6 | 11 | 6 | 7 | 1 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `part5-07-baremetal-profiling.md` | 10 | 10 | 6 | 7 | 6 | 6 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part5-08-nsight.md` | 11 | 11 | 7 | 12 | 6 | 6 | 1 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part5-09-tracy-hotspot.md` | 10 | 10 | 6 | 12 | 7 | 6 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `part5-10-ebpf-continuous.md` | 10 | 10 | 6 | 11 | 6 | 5 | 1 | **49** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `part6-01-case-isr-latency.md` | 15 | 12 | 8 | 12 | 8 | 4 | 2 | **61** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `part6-02-case-cache-thrashing.md` | 14 | 12 | 7 | 11 | 7 | 5 | 1 | **57** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `part6-03-case-lock-contention.md` | 15 | 13 | 9 | 11 | 8 | 5 | 2 | **63** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `part6-04-case-dma-tuning.md` | 14 | 11 | 6 | 10 | 7 | 4 | 1 | **53** | 오류 확인 | 우선 조치 | 높음 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |

평균 54.8점(10편, 합 548점), 범위 46~63점이다. 판정은 우선 조치 9편, 병합 검토 1편(part5-10)이고 유지·검증 대기·보강·제외 검토는 없다. 점수 구간으로는 보강(60~79) 2편(part6-01 61점, part6-03 63점), 병합 검토(40~59) 8편인데, 오류 확인 9건 때문에 9편이 우선 조치로 올라갔다. 오류 확인 9건은 모두 원문 내부 모순·산술 불일치이고 1차 자료를 열어 확인한 것은 없다. 10편 모두 git log에 1차 자료 대조 커밋이 없어 '검증됨'은 0편이다(part5-06의 279096d9 'Qualify …'는 출처 없는 완곡화라 인정하지 않았다). P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·sitemap은 보지 않았다. Part 6 사례 4편을 한 커밋(ba91202b)으로 쓴 이력과 공통 H2 뼈대는 글 단위 P0가 아니라 시리즈 단위 scaled content 점검 대상으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `part5-05-flamegraph.md` | 58 | 58 | 0 | 없음 |
| `part5-06-arm-ds-lauterbach.md` | 54 | 54 | 0 | 없음 |
| `part5-07-baremetal-profiling.md` | 46 | 46 | 0 | 없음 |
| `part5-08-nsight.md` | 54 | 54 | 0 | 없음 |
| `part5-09-tracy-hotspot.md` | 53 | 53 | 0 | 없음 |
| `part5-10-ebpf-continuous.md` | 49 | 49 | 0 | 없음 |
| `part6-01-case-isr-latency.md` | 61 | 61 | 0 | 없음 |
| `part6-02-case-cache-thrashing.md` | 57 | 57 | 0 | 없음 |
| `part6-03-case-lock-contention.md` | 64 | 63 | -1 | 없음 |
| `part6-04-case-dma-tuning.md` | 53 | 53 | 0 | 없음 |

- 추가한 오류 확인: part6-02 23행 '이론값: 2.1 GFLOPS × 1.8 GHz × 4 core ≈ 15 GFLOPS'는 이미 초당 연산량인 GFLOPS에 GHz를 곱해 단위가 맞지 않고, 적힌 대로 core당 2.1 GFLOPS면 4 core는 8.4 GFLOPS라 24행 '0.14 초 예상'·183행 '이론값 15 GFLOPS에 도달'과 동시에 참일 수 없다. 평가자는 이 공식을 맞다고 보고 미검증으로 두었다. 판정이 병합 검토에서 우선 조치로 바뀌었고 점수는 그대로다.
- 추가한 오류 근거(판정은 그대로): part6-04 109행 'Overhead 20 cycle @ 1 GHz = 20 ns'와 110행 '128/6.4 GB/s'(16 beat를 20 ns, 즉 800 MHz bus)가 같은 AXI bus에 다른 클록을 전제한다. 기존 80행 대 111행 산술 모순과 같은 원인 절이라 factcheck 근거에 합쳤고 confidence를 중간에서 높음으로 올렸다.
- 기각한 오류 확인: 없음.
- part6-03 F 6→5: 평가자는 가설별 H2 구분(33·57·101·120·180행)을 가점 근거로 썼으나 Part 6 공통 템플릿 뼈대라 AP-C-24상 점수를 받지 못한다. 다음 편 안내 문장과 전제 지식 안내도 없다. 합계 64→63, 판정은 오류 확인 우선으로 우선 조치 그대로다.
- part6-01 B 근거: 평가자가 든 PREEMPT IRQ thread 우선순위·threadirqs 부작용은 1차 자료 없는 메커니즘이라 감점 근거에서 빼고, 162행 '검증용' hist trigger가 165행에서 hitcount만 센다는 본문 안 불일치로 바꿨다(점수 12 유지).
- 오류 확인 보강(판정 그대로): part5-05는 207행 소수 오류가 230행 정리 '99 Hz 표준'으로 이어짐을, part5-09는 122·128행 진입 줄 DURATION이 빈칸이라 진입 줄 값의 의미도 일관되지 않음을, part6-01은 14행 '0.1%가 deadline을 놓친다'를 179행 쪽 근거로 더했다.
- D 비교 대상 보강(점수 영향 없음): part5-05에 `tools/perf-flamegraph/chapter05-flamegraph.md`·`chapter06-off-cpu.md`(draft stub), part5-06에 `tools/debugging/embedded/chapter06-trace.md` 333·345·357행, part5-07에 `chapter06-trace.md` 387행 비교 절, part5-08에 `modern-recipes/part12-05-tensorrt.md` 161~180행, part5-09에 tracy/uftrace/COZ grep 결과(나머지는 draft 언급뿐)를 더했다.
- 줄 번호 보정(점수 영향 없음): part5-05 D(part5-04 124~125·148~149행, part1-08 86~87행, part5-09 92~96행), part5-07 D(practical-internals part2-11 89~90행, part1-03 63~72행)와 uncertainties(part2-11 194·196행), part5-08 D(part6-05 65행), part5-09 series_issues(part5-10 14·20·250행), part5-10 D(part5-04 130~139행), part6-01 D(part3-05 79~90행, modern-recipes part7-13 36~40행), part6-03 D(part4-03 42~55행, part4-02 118~133·222~223행, part1-07 114~123행, part4-10 205~213행).
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `part5-05-flamegraph.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문만으로 성립하는 산술 오류(루브릭 3-1 '글이 밝힌 사실·산술이 참일 수 없음'). 207행 '99 Hz 또는 999 Hz가 표준입니다. 99 Hz는 다른 주기적 작업과 alias가 발생하지 않도록 prime number를 쓰는 관행입니다'에서 99 = 9×11이라 소수가 아니다(같은 문장의 999 = 27×37도 소수가 아니다). 230행 정리 '99 Hz … 표준 sampling 설정'이 이 근거 위에 서 있다. git log(0a9dd7bc slug 고정, 68525f0c 산문 코드 블록 이동, be973200 topics, ac24bb76 제목 변경, 그 아래 seriesOrder 재번호·다이어그램·작성 커밋)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 이 글만의 정리는 on-CPU·off-CPU 조합 판독 표(124~129행)와 함정 4개(192~221행) 정도다. 수집 workflow(35~48행), collapsed format(57~63행), 읽는 법 표(76~81행), 차분·icicle·색상 옵션(135~171행)은 FlameGraph 저장소 README 순서와 같다. 임베디드 시리즈인데 시나리오(173~188행)는 웹 서비스이고 cross 빌드 target의 perf·심볼·frame pointer 문제가 없다. 188행 '대부분의 web service는 off-CPU가 80% 이상'은 출처 없는 일반화다. |
| B | 12 | 수집 → 포맷 → 읽기 → off-CPU → 함께 보기 → 차분 → icicle → 색상 → 시나리오 → 함정 → 정리(225~230행) 흐름은 갖췄다. 109~111행 perf sched_switch 경로가 시간이 아니라 전환 횟수로 가중된다는 한계, 차분 그래프가 어느 프로파일 모양 기준인지 설명이 없다. 114행·155~159행 정확성이 열려 있어 AP-C-24 기준 B ≤ 13. |
| C | 7 | 따라 칠 수 있는 명령(28~49, 65~72, 103~112, 135~146, 175~186행)은 있지만 perf·커널·BCC·FlameGraph 버전과 실행 환경이 없고 생성된 SVG나 관찰 결과가 없다. 58~60행 collapsed 샘플, 85~89행 그림은 예시값이다. 188행 '80% 이상', 221행 '최소 5초, 가능하면 30초'는 출처·환경 없는 수치라 C ≤ 8. |
| D | 12 | 비교한 글: 같은 시리즈 `part5-04-ebpf.md`(43), `part5-06-arm-ds-lauterbach.md`(45), `part1-08-profiling-overview.md`, `part5-09-tracy-hotspot.md`, `part5-10-ebpf-continuous.md`, 다른 시리즈 `tools/debugging/python/chapter04-py-spy.md`, `tools/perf-flamegraph/chapter05-flamegraph.md`·`chapter06-off-cpu.md`. 겹침: 65~68행 profile-bpfcc -F 99 -af 30 → flamegraph.pl ↔ part5-04 124~125·148~149행, 35~48행 파이프라인 ↔ part1-08 86~87행. part5-09 92~96행, part5-10 119행, py-spy 58~65행은 다른 도구라 역할이 갈린다. perf-flamegraph Ch5(14~19행)·Ch6(14~20행)는 목록만 둔 draft stub이다. off-CPU·차분·icicle·함정 본문은 공개 글 중 이 글뿐이다. |
| E | 7 | 제목의 On-CPU(24~95행)·Off-CPU(97~129행)·Differential(131~148행)이 모두 절로 있고 description의 perf·BCC 수집(37·67·105행)도 다룬다. 대상 독자(임베디드)와 풀 구체 문제가 드러나지 않고 시나리오가 웹 서비스(173행)다. |
| F | 7 | 232행 다음 편 'ARM DS / Lauterbach'는 seriesOrder 45 `part5-06-arm-ds-lauterbach.md`와 맞다. 236~238행 5-04·5-06·5-09 라벨을 대상 파일과 대조해 맞음을 확인했다. 해부도(95행)와 단계 번호 주석(36~48행)이 글 고유 구조다. 33행 '세 단계'라 하고 네 단계를 나열하며 전제 지식(perf 기초) 안내가 없다. audit:reading·모바일 확인은 하지 않았다. |
| G | 2 | 본문 출처는 29행 brendangregg/FlameGraph 저장소 URL 하나다. 색상 옵션(163~169행), difffolded 의미(148행), --reverse/--inverted(155~159행)에 대한 README 절이나 버전, perf·BCC·커널 버전 표기가 없다. |

uncertainties:
- 114행 'I/O 대기와 mutex contention이 우측에 큰 면적으로 나타납니다'는 20·81·226행 '정렬은 알파벳 순/의미 없음'과 맞지 않는다. flamegraph.pl 정렬 동작을 1차 자료로 확인하지 않았다.
- 155행은 --reverse 출력을 icicle.svg, --inverted 출력을 inverted.svg로 이름 붙였는데 152행은 icicle을 root가 위인 그래프로, 159행은 --reverse를 leaf부터 보여 주는 옵션으로 설명한다. icicle을 만드는 옵션이 --inverted인지 README로 확인하지 않았다.
- 20·80·226행 '색상은 의미가 없다'와 148행 차분 그래프의 빨강/파랑, 166행 --color=io가 정리에서 구분되지 않는다.
- 109~111행 perf sched_switch 결과를 stackcollapse-perf.pl로 접으면 시간이 아니라 전환 횟수 가중치가 되는지 미확인(105행 offcputime은 시간 단위).
- 182행 offcputime-bpfcc -df 출력이 그대로 flamegraph.pl 입력 형식인지 BCC 버전별로 미확인.
- 33행 '세 단계'라고 하고 4단계를 나열함(산문 개수 표기 실수).
- 188행 '80% 이상', 221행 '최소 5초, 가능하면 30초'와 230행 '30초 이상이 표준'은 출처 없는 수치이고 서로 강도가 다르다.

병합 대상: 병합 대상 없음. 같은 주제의 `tools/perf-flamegraph/chapter05-flamegraph.md`·`chapter06-off-cpu.md`는 목록뿐인 draft stub이라 오히려 이 글이 흡수할 쪽이고, part5-04·part1-08과는 명령 몇 줄만 겹친다. 다음 조치는 보강이다. 207·230행 소수 서술을 FlameGraph·Gregg 자료로 바로잡고, 임베디드 target(cross perf, 심볼, frame pointer) 시나리오와 실제 관찰 결과·도구 버전을 추가한다.

### `part5-06-arm-ds-lauterbach.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 79행 'Cortex-M에서는 ETM-M0, ETM-M4가 있습니다'는 Cortex-M0용 ETM이 있다고 읽히고, 161행 'Cortex-M0에는 ETM이 없습니다 … Cortex-M3 이상부터 ETM-M3가 본격적입니다'는 없다고 한다. 두 진술은 동시에 참일 수 없다. 79행은 161행이 드는 ETM-M3도 빠뜨렸다. git log에 1차 자료 대조 커밋이 없다. 279096d9 'Qualify trace and CXL performance claims'는 출처 없는 완곡화이고, 387d7b79는 링크 추가, 0a9dd7bc는 slug 고정이다. ARM ETM TRM은 열지 않았으므로 어느 쪽이 맞는지는 fact-check 단계에서 정한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 요소는 TRACE32 PRACTICE 스크립트(57~71행), 인증 표준별 coverage 표(100~104행), 가격표(117~124행), CAN ISR 50 µs 시나리오(128~145행)인데 셋 다 출처와 환경이 없다. 14행 '구성에 따라 달라집니다', 22행 '줄일 수 있습니다 … 단정할 수는 없습니다'는 구체 기준을 완곡 표현으로 대신했고, 49행 '사실상 기본 도구', 106행 '거의 유일한 방법', 173행 '사실상 표준'은 근거 없이 단정한다. |
| B | 11 | DS·Streamline(24~37행) → probe(39~45행) → TRACE32(47~73행) → ETM/PTM(75~81행) → RTOS awareness(83~96행) → coverage(98~113행) → 가격(115~126행) → 시나리오(128~145행) → 함정(147~167행) → 정리(169~178행) 흐름은 있다. 'ETM과 PTM' 절은 PTM을 설명하지 않고, 시나리오는 145행에서 원인을 '찾습니다'로 끝난다. 135행 breakpoint 진입·이탈은 45·96행 비침습 trace 설명과 어긋난다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 6 | PRACTICE 스크립트(57~71행)와 측정 절차 4단계(134~137행)는 있다. 141~143행 결과(평균 12 µs, 최대 78 µs, 분포)에 MCU·클록·probe·TRACE32 버전이 없어 C ≤ 8. 110~113행 coverage 표는 예시값이고, 155행 0.8초 계산은 산술은 맞지만 10 Gbit/s 전제에 출처가 없다. 165행 'gator 1-3% CPU'도 환경이 없다. 합격·실패 관찰이 없다. |
| D | 11 | 인접 `part5-05-flamegraph.md`(Linux perf stack), `part5-07-baremetal-profiling.md`(DWT·ITM·SystemView, ETM은 18·206행 한 줄)와는 역할이 갈린다. ETM 설명 20·79~81행은 `rtos/practical-internals/part2-11-tracing-observability.md`, `tools/debugging/embedded/chapter02-jtag-swd-coresight.md` 344~356행, `chapter06-trace.md` 327~357행과 같다. 161행 Cortex-M0 ETM 부재와 151행 trace 핀 주의는 chapter02 356행, chapter06 333·345·357행과 겹친다. probe 사양(39~53행), coverage 인증(98~113행), 가격(115~126행)은 이 글에만 있다. |
| E | 6 | 제목·description(Streamline, TRACE32, ETM·PTM)은 본문 방향과 맞는다. description이 내건 PTM은 20행에 이름만 나오고 75~81행 절에서도 설명이 없으며, Streamline은 30~37행 capture 4단계뿐이다. |
| F | 7 | 178행 다음 편 'Bare-metal 프로파일링'은 seriesOrder 46 `part5-07-baremetal-profiling.md`와 맞다. 182~185행 관련 링크 4개(5-05 seriesOrder 44, 5-07, RTOS 2-11 'RTOS Tracing과 Observability', chapter02 'JTAG·SWD·CoreSight')를 열어 라벨이 맞음을 확인했다. 전제 지식 안내가 없고 108·132·139행은 heading이 아닌 맨 문단이다. audit:reading 확인이 없어 9 이상은 줄 수 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. ARM DS·TRACE32 버전, DSTREAM 사양(41~43행) 출처, DO-178C·ISO 26262·IEC 62304(100~104행) 조항 번호, 가격표(117~124행) 기준 시점이 없다. 버전 표기는 79행 'ETMv4' 하나뿐이다. |

uncertainties:
- 79행 'ETM-M0' macrocell이 실제로 있는지, Cortex-M용 ETM 이름(ETM-M3·M4·M7)을 ARM TRM으로 확인하지 않았다. 오류 확인 근거는 161행과의 내부 모순뿐이다.
- 41~43행 DSTREAM 4 GB, DSTREAM-PT 32 GB·100 Gbit/s, DSTREAM-ST 16 GB 사양은 ARM 제품 문서로 확인하지 않았다.
- 53행 PowerTrace '8-32 GB buffer'와 117~124행 가격대 전부에 출처·기준 시점이 없다.
- 102~104행 ISO 26262 coverage 요구(ASIL별), DO-178C MC/DC(Level A)를 1차 자료로 확인하지 않았다. 104행 IEC 62304 Statement Coverage와 106행 '모든 분기가 실제로 실행되었음을 증명'의 어긋남은 coverage 정의와 표준 원문이 필요해 오류 확인에 넣지 않았다.
- 96행 ETM 데이터로 RTOS TCB를 읽는다는 주장이 program flow trace만 하는 ETMv4 구성에서 가능한지 확인하지 않았다.
- 135행 breakpoint 진입·이탈과 45·96행 비침습 설명의 관계, TRACE32 Statistic.Func 절차는 문서로 확인하지 않았다.
- 37행 Streamline이 bare-metal에서 RTOS task switch를 '자동으로 인식'한다는 주장은 확인하지 않았다.
- 106행 '거의 유일한 방법', 126행 인건비 비교, 45행 '코어당 수 Gbps', 155행 '초당 10 Gbit', 165행 'gator 1-3% CPU'는 출처·환경 없는 단정·수치다.

병합 대상: 병합 대상 없음. ETM 개념은 `rtos/practical-internals/part2-11`과 `tools/debugging/embedded/chapter02`·`chapter06`에도 있지만 상용 trace 도구, probe 사양, coverage 인증 도구라는 질문은 다른 글이 다루지 않는다. 다음 조치는 보강이다. 79행과 161행 모순을 ARM ETM TRM으로 정리하고, probe 사양과 인증 표에 1차 출처를 달고, 시나리오 측정 환경을 밝히거나 수치를 지운다. ETM 공통 설명은 줄여 chapter02·chapter06으로 링크한다.

### `part5-07-baremetal-profiling.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순(루브릭 3-1). 136행 'UART printf는 보통 1 character당 87 us(115200 baud)'인데 215행 `printf("start\n")`(6자)와 217행 `printf("end\n")`(4자)에 둘 다 '/* ~870 us */'를 붙였다. 87 us/자면 각각 약 522 us·348 us이고, 길이가 다른 두 문자열이 같은 870 us(10자 분)일 수 없다. 보조 근거로 250행 'printf 대비 100배 빠른'은 136행 87 us 대 100 ns(약 870배)와 맞지 않는다. git log(387d7b79 링크, 3232b1be 태그, 0a9dd7bc slug, 68525f0c 코드 블록 산문, ac24bb76 제목, 6205e212 seriesOrder, 3b861694·42ebbcbb 작성)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | GPIO toggle(26~54행), DWT(60~96행), SysTick(100~121행), ITM(123~146행), SystemView(148~173행)는 Cortex-M 측정 입문의 표준 목록이고 코드는 CMSIS 관용구다. 이 글만의 것은 7가지 방법 비교 표(198~206행), cold/warm I-cache 함정(222~229행), SWO 속도 함정(231~235행) 정도인데 표 수치에 출처가 없다. 선택 기준은 208행 한 문장이다. |
| B | 10 | 네 도구를 코드와 함께 다루고 시나리오(175~194행)·비교 표·함정·정리까지 흐름은 있다. 84행은 긴 구간에 wrap 처리를 추가하라면서 방법이 없고 237~243행은 unsigned 뺄셈이면 된다고 해 25초 초과 처리가 열려 있다. 98행 inline 매크로 문장은 뜻이 거꾸로 읽히고, 145행 ITM 쓰기는 130행과 달리 FIFO ready 확인이 없다. AP-C-24에 따라 B ≤ 13. |
| C | 6 | 레지스터 수준 코드(31~36, 63~71, 105~118, 128~133, 179~191행)는 있지만 환경은 27행 'STM32F4 예시'와 61행 core_cm4.h뿐이고 보드·클록·툴 버전이 없다. 비교 표(198~206행), 170~172행 RTT '~0.5 us'·'4-8 KB'·'~1 MB/s', 136행 'ITM 한 자에 100 ns'는 출처·환경 없는 수치라 C ≤ 8이다. 측정 결과·파형·기대 관찰이 없다. |
| D | 7 | 같은 시리즈 `part1-03-measurement.md`와 크게 겹친다: DWT 1-03 63~72행 ↔ 63~81행, '168 MHz 약 25초 wrap' 1-03 75행 ↔ 84행, Cortex-M0 SysTick 1-03 77~87행 ↔ 100~121행, GPIO 1-03 143~166행 ↔ 24~54행, SystemView 1-03 202~213행 ↔ 148~167행, ITM 1-03 215~223행 ↔ 123~146행. 다른 시리즈: `rtos/practical-internals/part2-11-tracing-observability.md` 117~127행 itm_putc ↔ 127~133행, SystemView 89~90행 ↔ 155~158행. `modern-recipes/part10-07-interrupt-debugging.md` 217~241행 ↔ 175~194행. `tools/debugging/embedded/chapter06-trace.md` 387행 비교 절 ↔ 198~206행. 인접 part5-06·part5-08과는 역할이 갈린다. |
| E | 6 | 제목·description(2·5행)의 GPIO·DWT·SysTick·ITM을 24·56·100·123행 절에서 모두 다룬다. 다만 '프로파일링'에 비해 본문은 구간 시간 측정만 하고 함수별 hotspot(ITM PC sampling 등)은 없다. 대상 독자는 18행 'M0/M3/M4 작은 MCU'로 넓다. |
| F | 6 | 254행 다음 편 'Nsight Systems'는 seriesOrder 47 `part5-08-nsight.md`와 맞다. 258~261행 관련 항목 4개(5-06 seriesOrder 45, 5-08, practical-internals part2-11, Embedded Debugging chapter06-trace)를 열어 라벨·slug가 맞음을 확인했다. 같은 내용을 먼저 다룬 part1-03 안내와 전제 지식 안내가 없고 H2 뼈대는 시리즈 템플릿이다. |
| G | 1 | 본문에 출처 링크가 없다. DWT·ITM·SysTick 동작(58·102·125행)에 ARMv7-M ARM 인용이 없고, SystemView 수치(170~172행)에 SEGGER 문서·버전이 없다. CMSIS·툴 버전 표기도 없다. |

uncertainties:
- 58행 'DWT는 Cortex-M3 이상에 표준 포함', 102행 'DWT가 없는 Cortex-M0'와 CYCCNT 구현이 선택 사항인지 ARMv7-M/ARMv6-M ARM으로 확인하지 않았다.
- 125행은 ITM이 'SWD pin'으로 송신한다고 하고 136·250행은 SWO 핀이라고 한다. 표기 실수인지 확인하지 않았다.
- 32·35·45행 'BSRR 쓰기 1 cycle'과 49행 '1-2 cycle'은 출처가 없다. part1-03 176행은 GPIO toggle 2-4 cycle로 적었다(다른 글과의 모순).
- 136·203행 ITM '100 ns', 170·204행 SystemView RTT '~0.5 us'는 practical-internals part2-11 194·196행(SystemView 100~200 ns, ITM 5~10 ns)과 다르다. 1차 자료로 정해야 한다.
- 98행 '함수 호출 비용까지 포함하려면 inline 매크로가 안전'의 의도가 불분명하다.
- 145행 `ITM->PORT[ch].u32` 쓰기에 FIFO ready 확인이 없다(130행과 다름).
- 233행 'SWO 속도는 코어 클럭과 정수배로 나뉘어야'의 TPIU 분주 규칙을 확인하지 않았다.
- 205행 SWO overhead '~10 ns', 206행 ETM overhead 0, 203행 ITM Resolution 칸 '단방향'은 출처·의미가 없다.
- 18행 'printf는 UART 출력 자체가 ms 단위'와 215행 '~870 us'는 단위 표현 차이 수준이라 오류로 올리지 않았다.

병합 대상: 후보는 같은 시리즈 `src/content/blog/embedded/performance-engineering/part1-03-measurement.md`다(DWT·SysTick·GPIO·SystemView·ITM 절이 거의 같다). 우선 조치(136행 대 215·217행 산술 모순, 250행 '100배')를 먼저 하고, 다음 조치는 보강이다. 비교 표(198~206행)를 1차 자료로 채우고 1-03(측정 기초)과 이 글(도구 선택)의 역할을 나눌 수 있으면 독립 유지, 안 되면 1-03으로 병합한다.

### `part5-08-nsight.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 104행 'PyTorch와 TensorFlow는 내부에 NVTX marker가 이미 있어, Python 코드는 별도 작업 없이도 layer별 timeline이 보입니다'와 258행 정리 '추가 작업 없이 layer별 분석이 가능합니다'는, 238행 함정 제목 'NVTX 없이 Python ML framework profile', 240행 'PyTorch는 자동 NVTX를 켜야 보입니다', 242~247행 `torch.cuda.nvtx.range_push`/`range_pop` 수동 삽입 예와 같은 동작을 두고 동시에 참일 수 없다. 완곡 본문 대 단정 정리가 아니라 두 단정 진술의 충돌이다. git log(42ebbcbb stub, 3b861694 본문 작성, 6205e212 seriesOrder 재배치, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 설치·`nsys profile` 옵션(28~43행), NVTX(69~102행), Systems vs Compute 표(110~113행), stream·pinned memory 함정(212~228행)은 NVIDIA 문서·CUDA 입문 자료의 표준 내용이다. 이 글만의 관점은 Jetson `nvmedia`·`nvvideo` trace로 카메라→ISP→추론 pipeline을 한 timeline에서 본다는 점(149·156행)과 YOLO 시나리오(181~208행)인데, timeline은 예시 그림이고 198행 '1.5-2배', 61행 '5-20 us', 125행 '5-10배'는 출처가 없다. |
| B | 11 | 문제 정의(18~22행) → 설치·실행 → timeline 읽기 → NVTX → Compute 구분 → stream overlap(127~141행) → Jetson(143~158행) → trace 표 → 시나리오 → 함정 → 정리(251~258행)로 흐름은 완성됐다. PyTorch NVTX 서술이 104·258행과 240행에서 충돌하고, 137~138행 예제는 s2에서 kernel이 `d_b`를 쓴 뒤 같은 s2로 `d_b`에 H2D 복사를 넣어 '동시 실행' 주석과 맞지 않는다. NPU(DLA)는 145·158행 두 문장뿐이다. AP-C-24상 B ≤ 13. |
| C | 7 | 실행 명령(40~42·119~122·149~153·165~166·184~185·236행)은 있지만 nsys·JetPack 버전, 보드·GPU 환경이 없다. 30행 URL은 `2024-x-x` 자리표시자라 그대로 실행되지 않는다. 49~59·190~206행 timeline은 예시 그림이고 실제 capture나 `--stats=true` 출력이 없다. 61·125·198행 수치로 C ≤ 8. |
| D | 12 | 인접 `part5-07-baremetal-profiling.md`, `part5-09-tracy-hotspot.md`와 주제가 겹치지 않고, 5-09 204행 표 한 칸이 이 글을 가리킬 뿐이다. `part6-05-case-cxl-llm-kv-cache.md` 65행은 nsys를 한 줄 쓴다. 다른 시리즈 `modern-recipes/part12-05-tensorrt.md` 48·122~128·161~180행(multi-stream) ↔ 127~141·198~206·212~219행, 그 글 44·62~64행 DLA ↔ 145·158행. `hardware/hbm/chapter05-bandwidth-bottleneck.md` 158·186·207행은 Nsight Compute만 언급한다. `ml/systems/ml-profiling/chapter02-npu-profiler.md`는 draft outline이라 뺐다. '시스템 timeline 도구' 역할은 구별된다. |
| E | 6 | 제목 'GPU·NPU 포함 시스템 분석'과 description은 본문(20·143~158행)과 같은 질문을 향한다. NPU는 DLA 두 문장(145·158행)뿐이고, description의 '메모리'는 memcpy row(57·63·192~194행) 외에 사용량·대역 row를 다루지 않는다. |
| F | 6 | 260행 다음 편 'Tracy·Hotspot·uftrace'는 seriesOrder 48 `part5-09-tracy-hotspot.md`와 맞다. 264~266행 5-07(46), 5-09, 'Embedded C++ 2-07: 템플릿 비용'(`embedded-cpp/part2-07-templates-cost.md`) 라벨은 모두 맞다. 266행 대상은 GPU 프로파일링과 연결이 약하고, 전제 지식 안내 등 글 고유 구조가 없다. |
| G | 1 | 본문에 NVIDIA 문서·CUDA Programming Guide·NVTX 헤더 같은 1차 출처 링크가 없다. 30행 버전은 자리표시자이고 33·145행 JetPack, 149·165행 옵션의 기준 nsys 버전이 없다. |

uncertainties:
- 30~31행 `wget …nsight-systems-2024-x-x-linux`는 자리표시자 URL이고 받은 파일 이름이 31행 `nsight-systems-*.deb`와 맞는지 미확인.
- 137~138행 주석 '다른 stream에서 동시 실행'이 s1 복사와의 overlap만 뜻하는지, 순서가 잘못된 것인지 CUDA 문서로 확인하지 않았다(API 의미 판단이라 오류 확인에 넣지 않음).
- 61행 '5-20 us', 125행 '5-10배', 198행 '1.5-2배'는 출처·환경 없는 수치다.
- 149·176행 `nvmedia`·`nvvideo` trace, 156행 ISP·NVENC 표시 범위, 165행 `--sample=cpu`·`--cpuctxsw=process`, 236행 `-d 30`·`--delay 60` 옵션이 현재 nsys CLI에 있는지 User Guide로 확인하지 않았다.
- 145·158행 DLA 별도 row 표시와 Nano에 DLA가 있다는 전제(기억으로는 Nano에 DLA가 없으나 1차 자료 미확인).
- 104행 'TensorFlow는 내부에 NVTX marker가 이미 있어'는 TensorFlow 문서로 확인하지 않았다.
- 221~228행 함정 제목 'Pinned memory 없이 Async copy' 아래 코드가 고친 예(`cudaMallocHost`)라 함정과 해결 구분이 흐리다.

병합 대상: 병합 대상 없음. 시리즈 안에서 Nsight Systems를 다루는 글은 이 글뿐이고 `modern-recipes/part12-05-tensorrt.md`와는 역할(engine 빌드·배포 대 시스템 timeline 분석)이 다르다. 다음 조치는 보강이다. 104·258행과 240행 PyTorch NVTX 서술을 1차 자료(PyTorch `torch.autograd.profiler.emit_nvtx` 문서, Nsight Systems User Guide)로 정해 한쪽으로 고치고, 137~138행 stream 예제를 바로잡고, nsys·JetPack 버전과 출처를 본문에 남긴다.

### `part5-09-tracy-hotspot.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(1차 자료 미개봉, 루브릭 3-1 '예시 출력과 산술이 동시에 참일 수 없음'). 119~131행 uftrace replay 예시 출력에서 한 호출의 DURATION이 두 값이다. parse_input은 123행 진입 줄 '12.345 us', 126행 종료 줄 '12.000 us'이고, process는 127행 '45.678 us', 131행 '45.000 us'다. 같은 출력에서 122행 main()·128행 compute() 진입 줄은 DURATION이 비어 있어 진입 줄 값의 의미도 일관되지 않다. git log(0a9dd7bc slug, 68525f0c 산문 이동, be973200 topic, ac24bb76 제목, 6205e212 seriesOrder, 작성 커밋)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 도구 소개(26·69·102·147행)와 설치·기본 사용(28~33, 71~85, 104~117, 153~176행)은 각 프로젝트 README 수준이다. 이 글 고유의 것은 149행 Coz 필요성 설명, 209행 perf→Tracy→Coz→uftrace 조합 순서, 211~219행 미디어 pipeline 시나리오다. 214행 8%·1%는 출처·환경 없는 가정이고 65행 적용 예는 한 문장뿐이다. 임베디드 target에서 쓰는 조건(크로스 빌드, ARM 지원)이 없다. |
| B | 10 | 도구마다 설치→사용→출력→함정 흐름이 있고 198~207행 선택 표와 256~263행 정리까지 간다. 59행 'target과 GUI 분리'의 연결 절차, uftrace의 -pg 외 계측 방식, 250행 한 문장뿐인 Coz 해석 한계가 빠졌다. 119~131행 내부 모순으로 AP-C-24상 B ≤ 13. |
| C | 6 | 명령(31~32, 83~84, 105~116, 139~140, 174~175행)과 코드(37~50, 162~169행)는 있지만 실행 환경·버전이 없다. 53·58·258행 'marker 50-100 ns', 237행 '-pg 5-20% overhead'는 출처·환경 없는 수치라 C ≤ 8. 119~131행 uftrace 출력과 180~186행 Coz 출력은 예시이고 전자는 내부 모순이 있다. 성공·실패를 가르는 검증 절차가 없다. |
| D | 12 | 인접 `part5-08-nsight.md`(47, 이 글은 204행 표 한 칸만 언급), `part5-10-ebpf-continuous.md`(49, 그 글 258행에서 Tracy 한 줄)와 겹침 없음. `part5-03-ftrace.md` 80·167행 function_graph ↔ 102·134행 uftrace는 개념상 맞닿지만 대상(커널 대 사용자 공간)이 다르다. `part5-05-flamegraph.md` ↔ 94·98행 Hotspot 내장 flamegraph 일부 겹침. `tools/perf-flamegraph/chapter09-alternatives.md`는 draft stub(13~20행 '예정 내용')이다. 나머지 Tracy/uftrace/COZ grep 결과는 draft 글 언급뿐이다. H2 뼈대가 5-08과 같아 15는 주지 않았다. |
| E | 7 | 제목의 네 도구를 24·67·100·145행 절에서 모두 다룬다. '비교'는 198~207행 시나리오→추천 도구 표뿐이고 overhead·지원 플랫폼·수집 방식 비교 축이 없다. 190~194행 Apple Instruments는 제목·description(5행) 밖이다. |
| F | 6 | 265행 다음 편 'Continuous Profiling'은 seriesOrder 49 `part5-10-ebpf-continuous.md`와 맞다. 269~272행 5-05(44), 5-08(47), 5-10(49), `embedded-cpp/part2-07-templates-cost.md`(15)를 열어 라벨이 맞음을 확인했다. 272행은 주제 연결이 약하고, 18행이 perf·ftrace를 전제하면서 5-01·5-03 링크가 없다. audit:reading·폰 폭 미확인. |
| G | 2 | 본문 출처는 29행 Tracy 저장소, 76행 Hotspot v1.5.0 릴리스, 154행 Coz 저장소뿐이고 모두 설치 명령 안의 URL이다. Tracy·uftrace·Coz 버전, Tracy 매뉴얼, Coz 논문(147행은 저자만 언급) 링크가 없고 53·237행 수치와 143행 'ChromeBook 개발팀' 주장에 출처가 없다. |

uncertainties:
- 31행 `cd tracy` 뒤 `cmake -B build/profiler tracy/profiler`의 소스 경로가 `profiler`여야 할 것으로 보이나 Tracy 저장소로 확인하지 않았다.
- 53·58·258행 'marker 한 개당 50-100 ns'가 Tracy 매뉴얼의 zone 비용과 같은지 미확인(기억 기반 의심).
- 76행 Hotspot v1.5.0 AppImage 파일명이 실제 릴리스 자산과 같은지 미확인.
- 139행 uftrace `-F 'parse_*'`가 glob인지 regex인지 미확인.
- 143행 'ChromeBook 개발팀과 일부 Linux 배포판에서 사용' 출처 없음.
- 175행 `plot profile.coz`가 Coz의 결과 확인 방식(`coz plot` 또는 웹 viewer)과 다를 수 있고, 180~186행 출력도 예시로 보인다.
- 237행 '-pg 5-20% overhead' 출처·환경 없음.
- 254행 '-fno-omit-frame-pointer 필수'는 `--call-graph dwarf` 경로를 고려하지 않은 단정일 수 있다(perf 문서 미확인).
- 242행 `void main()`은 C 표준상 `int main`이어야 한다(언어 규칙 판단이라 오류 확인에 넣지 않음).

병합 대상: 병합 대상 없음. 같은 주제 `tools/perf-flamegraph/chapter09-alternatives.md`는 draft stub이다. 다음 조치는 보강이다(119~131행 uftrace 출력 정정, 비교 축 추가, 도구 버전·1차 출처 기재, 5-01·5-03 전제 링크).

### `part5-10-ebpf-continuous.md` — 49점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(fa6eb0c8·3b861694·bf2ed188 작성, fec6fe94·68525f0c 코드 블록 산문 정리, 6205e212 seriesOrder 재정렬, ac24bb76 제목 변경, be973200 topic 메타, 0a9dd7bc slug 고정)에 Parca·Pixie·Pyroscope·Tetragon 문서나 binutils/GCC sFrame 문서와 대조한 커밋이 없다. 이번 평가에서도 1차 자료를 열지 않았고, 본문 안에서 동시에 참일 수 없는 두 기술 진술도 찾지 못했다(14·20·40·250행의 '1% 이하/<1%'는 서로 맞고, 60행 99 Hz와 228행 4 Hz는 다른 설정의 예로 읽힌다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | Parca(43~73행), Pixie(89~117행), Pyroscope(119~152행), Tetragon(166~187행)을 설치 명령과 한두 문장으로 소개하는 도구 순회형이다. 이 글만의 내용은 stack trace 정보별 위험도(201~206행)와 임베디드 fleet 적용(189~197행) 정도인데, fleet 절은 195행 '30-50 MB 수준'과 197행 한 문장이 전부라 선택 기준이 없다. Datadog 절(154~164행)은 '비용이 크게 늘어납니다'로 끝난다. |
| B | 10 | 문제 정의(16~22행) → 비교 표(26~41행) → 도구별 절 → fleet → privacy(199~215행) → 함정(217~246행) → 정리(248~258행)로 끝까지 간다. 임베디드 보드에 agent를 올리고 label을 붙이는 방법은 246행에서 이름만 나오고, 197행 '1시간 단위 aggregate' 설정이 없다. 168행 BPF_LSM과 170~185행 kprobes 정책의 관계가 설명되지 않는다. AP-C-24상 B ≤ 13. |
| C | 6 | docker run(49~57·125행), px deploy(98행), readelf(84행), Pyroscope Go 코드(133~141행)가 있으나 이미지 태그가 latest(51·57행)이고 환경·예상 출력이 없다. overhead 표(36~41행), 195행 '30-50 MB', 228행 '수십 TB'는 출처·환경 없는 수치라 C ≤ 8. 147~149행 'json_parse +120%'와 66~68행 쿼리 시점(2026-05-07~08)은 글 date(2026-04-27, 4행)보다 뒤라 관찰 결과가 아닌 예시다. |
| D | 11 | 비교한 글: 인접 `part5-09-tracy-hotspot.md`(48), `part6-01-case-isr-latency.md`(50), 같은 주제 `part5-04-ebpf.md`, `part5-01-perf-basics.md`, `part5-05-flamegraph.md`. 34~41행 overhead 표 ↔ part5-04 130~139행. 219~223행 frame pointer 함정 ↔ part5-01 270~277행, part5-05 192~199행, part5-09 252~254행. 168행 BPF_LSM ↔ part5-04 168~180행(5-04가 180행에서 Tetragon을 이 글로 넘김). `src/content/blog` 전체 grep에서 Parca·Pyroscope를 다룬 다른 글은 00-preface(목차)뿐이라 continuous profiling 자체는 이 글만의 질문이다. |
| E | 6 | 제목의 네 도구는 모두 절이 있다(43·89·119·166행). Tetragon은 187행이 스스로 '이상한 행동'을 찾는 보안 도구라고 해 '연속 프로파일링'과 어긋나고, Pixie 절(101~117행)도 HTTP·gRPC 관측 중심이다. 임베디드 시리즈인데 본문 대부분이 Kubernetes·컨테이너 환경이고 임베디드 적용은 189~197행뿐이다. |
| F | 5 | 258행이 'Part 5(측정과 분석)와 Embedded Performance Engineering 시리즈의 본문이 마무리됩니다'라고 하지만 같은 디렉터리 seriesOrder 50 `part6-01-case-isr-latency.md`, 51 `part6-02-case-cache-thrashing.md`로 시리즈가 이어진다. 다음 편 안내가 틀려 F ≤ 5. 262~265행 관련 항목 4개는 대상 파일 제목과 라벨이 맞는다. |
| G | 1 | 본문에 1차 출처 링크가 하나도 없다. Ubuntu 24.04(79행), GCC 14·LLVM 17(87행)은 이름만 있고, 이미지는 latest 태그(51·57행)다. 'CNCF 인큐베이션'(45행), Pixie·Pyroscope 인수(91·121행)에도 출처가 없다. |

uncertainties:
- 45행 'Parca는 … CNCF 인큐베이션 프로젝트'를 1차 자료로 확인하지 않았다.
- 87행 'sFrame은 GCC 14, LLVM 17 이후 지원'과 생성 주체(binutils as --gsframe), 'Parca와 Pyroscope agent가 모두 인식'을 문서로 확인하지 않았다.
- 79행 Ubuntu 24.04 frame pointer 기본 빌드 범위와 'Fedora도 따라가는 중'을 배포판 공지로 확인하지 않았다.
- 60행 Parca agent 99 Hz 기본값과 228행 '4 Hz' 계산의 관계, 샘플당 크기가 없어 '수십 TB'를 검산할 수 없다.
- 168행 'BPF_LSM hook으로 … 차단'과 170~185행 kprobes TracingPolicy가 같은 메커니즘인지, 'sys_openat'·matchArgs index 1·Sigkill 문법이 현재 Tetragon CRD와 맞는지 미확인.
- 111행 Pixie OpenSSL uprobe TLS 디코드, 52행 --remote-store-address 플래그가 현재 버전과 맞는지 미확인.
- 36~41행 overhead 수치, 195행 30-50 MB, 213행 '기본 30일 권장'은 출처 없는 수치다.
- 66~68·147~149행 예시 시점(2026-05-07~08)이 글 date(2026-04-27)보다 뒤라 경험 기록처럼 읽힐 수 있다.

병합 대상: 병합 대상 없음. continuous profiling(Parca·Pyroscope)은 시리즈 안에서 이 글만 다루는 독립 주제라 `part5-04-ebpf.md`에 합치면 범위가 흐려진다. 다음 조치는 보강이다. 34~41행 overhead 표는 part5-04 130~139행 참조로 바꾸고, 219~223행 frame pointer 함정은 5-01·5-05로 넘기며, aarch64 게이트웨이 보드에 Parca agent를 올리는 구체 절차·버전·출처를 채운다. 258행 '시리즈 마무리' 문장을 고치고 다음 편(part6-01) 안내를 넣는다. Tetragon 절은 축소하거나 5-04로 옮기는 것을 함께 검토한다.

### `part6-01-case-isr-latency.md` — 61점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순(루브릭 3-1). 23행 '10 kHz sampling', 24행 deadline은 sample 단위(sample → user buffer 100 µs), 179행 Before 'Deadline miss rate 0.12%'(14행 '0.1%가 deadline을 놓친다'도 같은 크기)이면 시간당 10,000×3,600×0.0012 = 43,200회다. 30행은 같은 Before 상태를 '시간당 수십 회 deadline miss'라고 적었다. 177행 P999 240 µs도 sample의 0.1% 이상이 100 µs를 넘는다는 뜻이라 시간당 3만 6천 회 이상이다. 두 진술은 세 자릿수 차이로 동시에 참일 수 없다. git log(42ebbcbb stub, ba91202b 작성, 6205e212 seriesOrder, ac24bb76 제목, fa55144d 링크, be973200 topic, 68525f0c 산문 이동, 0a9dd7bc slug)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 가설 1 CPU 부하(36~55행, mpstat 출력으로 기각) → 가설 2 irqsoff(57~99행) → 원인 코드(105~122행) → affinity·threaded IRQ(131~160행) → Before/After(173~180행)로 이어지는 진단 사례 구조와 97행 '로그 flush 타이밍과 일치' 해석이 이 글만의 관점이다. 교훈(190~197행)은 '평균은 거짓말', 'IRQ affinity로 격리가 정석' 같은 일반론이고, 사례 수치는 출처·측정 방법이 없어 실제 경험인지 확인할 수 없다(ba91202b가 사례 4편을 한 번에 작성). |
| B | 12 | 증상(16~34행) → 가설 2개 → 원인(101~129행) → 해결(131~167행) → 검증(169~184행) → 교훈(186~197행) 흐름은 완성됐다. 표(173~180행) latency를 무엇으로 쟀는지가 없다. 162행은 '측정 결과를 검증할 수 있도록' hist trigger를 켰다고 하나 165행 trigger는 irq_handler_entry를 common_pid별 hitcount로 세는 설정이라 표와 연결되지 않는다. 30·179행 모순과 112~114행·90~94행 불일치가 열려 있어 B ≤ 13. |
| C | 8 | 환경(22행 Cortex-A53, Linux 5.10, PREEMPT), mpstat 출력(40~49행), irqsoff 절차(63~72행), affinity 명령(135~147행)은 재현 절차다. 80~95행 trace 수치, 173~180행 표, 184행 '약 5% 감소'는 측정 도구·방법·출처가 없는 수치라 C ≤ 8을 적용했다. |
| D | 12 | 인접 `part5-10-ebpf-continuous.md`(49)는 주제가 다르고, `part6-02-case-cache-thrashing.md`(51)는 H2 뼈대(12·16·46·71·91·112·169·185·198행 ↔ 이 글 12·16·36·57·101·131·169·186·199행)만 같다. 같은 주제: irqsoff 63~72행 ↔ `part5-03-ftrace.md` 103~125행, affinity 145~146행 ↔ `part3-06-interrupt-storm.md` 144~148행, top/bottom half 149~160행 ↔ `part3-05-interrupt-latency.md` 79~90행. 다른 시리즈: `modern-recipes/part7-13-irq-affinity.md` 36~40행, `rtos/practical-internals/part2-10-scheduler-latency.md` 112~117행, `tools/debugging/kernel/chapter03-ftrace-tracepoints.md` 292~302행. 도구 설명은 겹치지만 진단 사례 역할은 구별된다. |
| E | 8 | 제목 'ISR Latency 100µs Deadline Miss 추적'과 description '가설 두 개를 거쳐 SD 카드 드라이버를 범인으로 확정'을 24행(100 µs deadline), 36·57행(가설 두 개), 99행(SD 확정)이 이행한다. 대상 독자·전제 지식이 명시되지 않았다. |
| F | 4 | 본문에 다음 편 안내가 없다(201행 6-02는 관련 항목에만 있고 실제 seriesOrder 51과 맞음). 204행 'Practical RTOS Internals 2-08: Interrupt Latency'는 링크 없는 항목이고 실제 `practical-internals/part2-08`은 `part2-08-tick-timer.md`라 틀린 번호다 → F ≤ 5. 201~203행 6-02·3-05·5-01 라벨은 대상 제목과 맞는다. irqsoff를 다루는 `part5-03-ftrace.md`는 연결하지 않았다. |
| G | 2 | 22행에 Linux 5.10·PREEMPT·Cortex-A53 환경은 적었다. irqsoff tracer 문서, 103행 '소스를 보니'가 가리키는 sdhci 드라이버 소스, request_threaded_irq·threadirqs 문서 등 1차 출처가 본문에 하나도 없다. |

uncertainties:
- 112~114행 코드 주석(data_irq ~50, finish_data ~130, request_done ~100 µs)과 90~94행 trace(50→180 = 130, 180→280 = 100, 280→312 = 32 µs)가 한 칸씩 어긋난다. trace의 'N us : 함수'가 진입 시각인지 해석이 갈려 오류로 올리지 않았다.
- 178행 Before max 512 µs가 31행 'spike 200~500 µs', 74행 '최대 312 µs'보다 크다. 측정 대상이 달라 원문만으로 판단할 수 없다.
- 78~95행 irqsoff trace 형식이 실제 ftrace 출력인지 Documentation/trace/ftrace.rst로 확인하지 않았다. part5-03 116~123행은 '# latency: 234 us, #20/20, CPU#1' 형식을 쓴다.
- 149~158행: mainline sdhci가 이미 request_threaded_irq를 쓴다는 기억이 있으나 drivers/mmc/host/sdhci.c(v5.10)로 확인하지 않았다.
- 165~166행 hist trigger(keys=common_pid, vals=hitcount)가 latency 검증 수단이 아닌지 커널 histogram 문서로 확인하지 않았다.
- 51행 '전 코어 평균 idle 70% 이상'과 CPU0 idle 67.4%(45행)는 'all' 행(72.4%)을 뜻한 것으로 읽혀 오류로 두지 않았다.
- 153행 threadirqs 부팅 파라미터를 c 코드 블록에 넣었다(§5 후보, 점수 외).
- 184행 'SD throughput 약 5% 감소', 179행 After 0.0001%는 출처·측정 방법 없는 수치다.

### `part6-02-case-cache-thrashing.md` — 57점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 공식 불일치(루브릭 3-1, AP-C-24). 23행 '이론값: 2.1 GFLOPS × 1.8 GHz × 4 core ≈ 15 GFLOPS'는 이미 초당 연산량인 GFLOPS에 클럭(GHz)을 다시 곱해 단위가 GFLOPS가 되지 않는다. 적힌 대로 core당 2.1 GFLOPS를 받으면 4 core 이론값은 8.4 GFLOPS라 23행 결과 15 GFLOPS, 24행 '0.14 초 예상', 183행 '이론값 15 GFLOPS에 도달했습니다'가 함께 참일 수 없다. 이 이론값이 제목·26행·181행 '10배'의 기준이다. git log(42ebbcbb, ba91202b, f83d9992, 6205e212, ac24bb76, be973200, 68525f0c, 0a9dd7bc)에 1차 자료 대조 커밋이 없다. 나머지 내부 산술(82행 90.36%, 84행 52.0%, 80행 IPC 0.46, 175~179행 GFLOPS와 실행 시간, 181행 4·8·10배, 105행 64 KB, 109행 1/16, 110행 12 MB, 155행 4 KB)은 직접 계산해 맞는 것을 확인했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 가설 1(SIMD, 46~69행)이 30% 개선(67행)에 그친 뒤 perf stat(76~85행)으로 가설 2를 확정하는 흐름과 Original→NEON→Transpose→Tiling→Tiling+NEON 단계별 표(173~179행)는 이 글만의 구조다. 해법(transpose·32×32 tiling, 114~155행)은 교과서 표준이고, 190행 'SIMD는 30% 정도가 한계', 191행 '5% 이하 정상', 194행 'IPC 2.0 이상'은 출처 없는 기준이다. perf 출력이 연속 숫자 패턴(79~84행)이라 실패 사례의 실재가 의심된다. |
| B | 12 | 증상(18~27행) → 가설 2개(46~89행) → 원인(91~110행) → 해결 3단계(116~167행) → 검증(173~179행) → 교훈(185~196행) 흐름은 완성됐다. 142행 `sum = C[i * N + j]`는 C 초기화 언급이 없고, 162~166행 NEON 조각은 `vsum` 선언·수평 합산이 없으며 N이 TILE의 배수라는 전제가 없다. 23행 이론값은 4 core 기준인데 코드(134~152행)는 단일 스레드다. B ≤ 13. |
| C | 7 | 명령(52행 objdump, 76~77행 perf stat), 관찰 결과(79~84·173~179행), HW(21행 Cortex-A72 1.8 GHz, L1D 32 KB, L2 1 MB)가 있다. 컴파일러·커널·perf 버전과 빌드 옵션이 없어 C ≤ 8이다. 52행은 32-bit 툴체인 `arm-linux-gnueabihf-objdump`로 AArch64 `fmla`를 찾고 56행 `-mfpu=neon`도 AArch32 옵션이라 타깃이 하나로 정해지지 않는다. 79~84행 연속 숫자 패턴으로 경험 진위도 의심된다. |
| D | 11 | 같은 시리즈 `part2-06-cache-miss.md` 165~185행 'Loop Tiling 실전'(N=1024 naive 루프와 블록 루프) ↔ 31~43·134~152행(2-06은 block 64, 이 글은 32). `part1-07-modeling.md` 81~92행 naive matmul OI·Blocking ↔ 189·192행. 인접 `part6-01-case-isr-latency.md`(50)·`part6-03-case-lock-contention.md`(52)는 주제가 다르고 H2 뼈대만 같다. 다른 시리즈 `modern-recipes/part8-08-neon.md` 42행 '4×4 Matrix Multiply'는 NEON 커널 자체라 역할이 다르다. 'Loop Tiling|cache thrashing'은 이 글과 2-06에만 나온다. |
| E | 7 | 제목 'Matrix Multiply가 예상의 10배 느린 이유'와 description('SIMD부터 의심했지만 진짜 범인은 캐시 미스 90%')이 46~89행 흐름과 82행 90.36%, 181행 결론으로 이행된다. '10배'의 기준인 23행 이론값이 공식부터 맞지 않고 4 core 전제를 단일 스레드 코드와 비교한다. |
| F | 5 | 다음 편 안내가 본문에 없다(실제 seriesOrder 52 `part6-03-case-lock-contention.md`는 201행 관련 항목에만 있음) → F ≤ 6. 200~203행 6-01·6-03·2-06('Cache Miss 3C Model 분석')·5-01 대상 파일을 열어 라벨이 맞음을 확인했다. 116·129·157행 Step 1~3 구분은 있으나 전제 지식 안내가 없다. |
| G | 1 | 본문에 출처 링크가 하나도 없다. 21행 HW 사양만 있고 Cortex-A72 TRM·Software Optimization Guide, perf 문서, NEON intrinsics 레퍼런스, 컴파일러 버전이 없다. 190·191·194행 기준 수치도 출처가 없다. |

uncertainties:
- 179행 15.3 GFLOPS는 23행 4 core 이론값과 같은데 134~152·161~166행 코드는 단일 스레드이고 병렬화 언급이 없다. 23행 식대로 core당 3.78 GFLOPS(2.1×1.8)라면 단일 스레드로 15.3은 불가능하다. 측정이 멀티스레드였는지 확정하지 못해 오류 확인 근거로는 23행 공식만 썼다.
- 79행 cycles 2,712,345,678은 1.8 GHz 단일 코어로 약 1.51초인데 26·175행 실측은 1.4초다. 실행 조건 미확인.
- 38행 scalar 삼중 루프는 N^3 ≈ 1.07e9회 반복마다 load 2개가 필요한데 81행 L1-dcache-loads 3.46e8, 80행 instructions 1.23e9는 그보다 작다. 컴파일러 unroll-and-jam 여부(빌드 옵션 미기재)를 알아야 판단된다.
- 79~84행 perf 출력이 연속 숫자 패턴이다. 이 사례는 ba91202b의 'Jetson Orin LiDAR' 사례를 f83d9992에서 통째로 바꾼 것이다.
- 23행 'core당 2.1 FLOP/cycle'(의도로 보이는 값)이 Cortex-A72 NEON FMA 처리량과 맞는지 TRM으로 확인하지 않았다.
- 52행 32-bit 툴체인으로 AArch64 `fmla` grep, 56행 `-mfpu=neon`(AArch32 옵션). 실제 빌드 타깃 미확인.
- 63행 `vmlaq_f32(sum, ...)`의 `sum`은 36행에서 `float`라 형이 맞지 않는다(intrinsics 의미 판단이라 불확실로 둠). 165행 `vsum`은 선언·수평 합산이 없다.
- 190·191·194행 기준 수치는 출처가 없다.

병합 대상: 점수 구간은 병합 검토이고 후보는 `part2-06-cache-miss.md` 165~185행이지만, matmul 진단 사례라는 독립 검색 의도가 있다. 판정은 오류 확인에 따른 우선 조치이며, 23행 공식을 고친 뒤 다음 조치는 보강이다(실측 환경·버전 기재 또는 TBD, 스레드 수 명시, 다음 편 안내 추가).

### `part6-03-case-lock-contention.md` — 63점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 모순(루브릭 3-1). 51행은 'Memory bandwidth 포화라면 코어들이 메모리를 기다리며 stall 상태로 100% 사용 중으로 보였을 텐데, 그렇지 않았습니다'라고 쓰고 이를 가설 1 기각 근거로 쓴다. 205행은 'CPU가 idle이면 contention 또는 I/O wait, busy면 compute bound입니다. Memory bound는 보통 idle로 잡힙니다'라고 쓴다. 메모리 포화가 mpstat에서 busy로 보이는지 idle로 보이는지를 두 문장이 반대로 단정하므로 둘 다 참일 수 없다. 205행이 맞으면 51행의 기각 논리가 무너진다. git log(0a9dd7bc, 68525f0c, be973200, ac24bb76, 6205e212, 4e66cbfc, f83d9992, ba91202b, 42ebbcbb)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 한 데몬 사례를 끝까지 끌고 간다. 33~55행 가설 1(메모리 대역폭) 기각, 57~99행 perf lock으로 가설 2 확정, 112~118행 USL β 설명, 120~178행 per-CPU 해결, 184~193행 before/after 표. 176·178행은 읽기 정확성과 CPU migration 트레이드오프를 짚는다. 14·203행 '거의 항상 lock contention', '거의 예외 없이 성립'은 근거 없는 일반화이고, 116·150·207행 USL·padding 설명은 교과서 수준이다. |
| B | 13 | 18~29행 증상부터 199~210행 교훈까지 흐름이 완결되고 154~174행 합산 thread도 있다. 51행과 205행이 모순되어 가설 1 기각이 성립하는지 독자가 판단할 수 없다. 정확성 불확실(perf lock이 user-space mutex를 보는지, A72에서 perf c2c 가능 여부, 116행 α와 203행 β의 관계)이 열려 있어 B ≤ 13. |
| C | 9 | 21행 환경(Cortex-A72 8-core, Linux 5.15), 38·62~63행 명령, 40~48·65~68행 출력, 184~193행 표가 있다. 66행 산술은 맞는다(3,892,012 × 32,200 ns ≈ 125.3 s). 53행 'mem_access로 측정한 대역폭 30%'는 원시값·계산 방법이 없고, 51/205행 모순으로 가설 1 판별의 합격·실패 관찰이 갈리지 않아 C ≥ 10 조건을 채우지 못한다. 사례 내용이 ba91202b와 f83d9992 사이에 통째로 바뀌어 경험 진위도 의심된다. 75~94·124~174행 코드는 packet_t·publish 정의가 없는 조각이다. |
| D | 11 | 인접 `part6-02-case-cache-thrashing.md`(51)·`part6-04-case-dma-tuning.md`(53)는 다른 병목이다. 같은 시리즈 개념 글과 겹친다: `part4-03-lock-contention.md` 42~55행 ↔ 61~69·204행, `part4-02-false-sharing.md` 118~133·222~223행 ↔ 124~150·152~174·207행, `part1-07-modeling.md` 114~123행·`part4-10-smp-analysis.md` 205~213행(USL 식) ↔ 112~118행. 측정 데이터로 원인을 좁히는 사례라는 역할은 구별된다. |
| E | 8 | 제목 '8-core가 4-core를 넘으면 throughput이 떨어지는 이유'는 21행 환경, 25~29행 측정, 97~118행 원인, 184~193행 검증과 맞는다. description의 '단일 global mutex가 cache invalidation 폭주'는 103~110행과 197행 HITM 한 문장으로만 받쳐지고 71행 측정 근거는 mutex 대기 쪽이다. |
| F | 5 | 214~218행 관련 항목 5개(6-02 seriesOrder 51, 6-04 53, 4-03 32, 4-02 31, 5-01 40)를 열어 라벨과 주제가 맞음을 확인했다. 본문에 '다음 편' 안내 문장이 없어 F ≤ 6이고, 가설별 H2(33·57·101·120·180행)와 관련 항목 목록은 Part 6 공통 템플릿이라 점수를 주지 않았다. 4-03·4-02·1-07 전제 지식 안내도 없다. |
| G | 2 | 21행에 Cortex-A72 8-core, Linux 5.15 환경을 적었다. perf lock·perf c2c·sched_getcpu·USL(Gunther)에 본문 1차 출처나 perf 버전이 없고, 206행 커널 per_cpu() 매크로도 문서·소스 위치를 인용하지 않았다. |

uncertainties:
- 62~68행 perf lock은 커널 lock 이벤트를 기록하므로 user-space pthread mutex인 stats_mutex가 이름으로 나오는지 의심된다. perf 문서로 확인하지 않았다.
- 197행 perf c2c는 load latency 샘플링(PEBS, Arm SPE)이 필요한데 Cortex-A72에서 쓸 수 있는지 미확인.
- 53행 perf stat -e mem_access로 '시스템 한계 대비 대역폭 30%'를 구할 수 있는지 미확인.
- 116행은 α를 contention, β를 coherency로 정의하는데 203행은 'throughput 감소 = lock contention = USL β>0 곡선'이라고 묶는다. lock이 cache line ping-pong을 일으킨다고 읽으면 양립하므로 오류 확인으로 올리지 않았다.
- 176·178행: 같은 CPU에서 선점된 두 thread가 비원자적 `s->packets++`를 하면 lost update가 생길 수 있는데 글은 migration 문제만 적었다.
- git 이력: ba91202b의 사례(5G UPF router, routing_mutex, RCU)와 현재 f83d9992 사례(패킷 카운터 데몬, per-CPU)가 달라 측정값이 실제 기록인지 의심된다.

### `part6-04-case-dma-tuning.md` — 53점, 우선 조치

confidence: 높음

factcheck: 오류 확인. 원문 내부 산술 모순(루브릭 3-1). 80행은 DMA channel이 98% busy인데 throughput이 124 MB/s라고 하고, 212행 표도 Original을 124 MB/s·AXI 효율 50%로 적는다. 그런데 92~96행·108~111행은 128 byte transaction을 40 ns(20 ns 전송 + 20 ns overhead)에 보내 효율 50%, 즉 3.2 GB/s라고 계산한다. 이 모델로는 효율 50%·98% busy에서 약 3.1 GB/s가 나와 124 MB/s와 동시에 참일 수 없고, 3.2 GB/s는 요구치 248 MB/s(23행)의 13배라 99~101행 '효율 50%가 병목' 결론이 성립하지 않는다. 덧붙여 110행은 16 beat × 8 byte를 6.4 GB/s로 20 ns에 보낸다고 해 bus clock 800 MHz(beat당 1.25 ns)를 전제하고, 109행은 같은 bus의 overhead 20 cycle을 '@ 1 GHz = 20 ns'로 계산해 클록 전제가 둘로 갈린다. git log에는 1차 자료 대조 커밋이 없다(0a9dd7bc slug 고정, 68525f0c 코드 블록 산문 이동, be973200 topic, ac24bb76 제목 변경 등 형식 커밋뿐).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 가설 1(CPU, 33~61행) 기각 → 가설 2(DMA, 63~101행) → 원인(103~124행) → 세 단계 해결(126~204행) → 단계별 Before/After 표(210~215행)로 가는 진단 서사는 이 글만의 구성이고, 225~230행 교훈도 사례와 연결된다. SoC 이름이 없고(22행 'Cortex-A53 quad-core'만), 핵심 진단 산술이 80행과 110~111행 사이에서 맞지 않아 설득력이 무너진다. |
| B | 11 | 증상 → 가설 → 원인 → 해결 → 검증 → 교훈 흐름은 16~232행에서 끝까지 간다. 결론을 받치는 산술이 내부 모순이고(80행 대 111행), 124행 '실제로는 frame end-of-line 사이에도 동일 패턴'은 손실 크기를 말하지 않으며 200 us라는 수치의 출처가 없다. B ≤ 13. |
| C | 6 | top·perf stat 명령과 출력(37~57행), DMA 레지스터 덤프(69~78행), AXI monitor 출력(84~97행), device tree·dmaengine 설정(132~154행), 측정 표(210~215행)가 있다. SoC·커널 버전·센서·DMA 컨트롤러 이름이 없어 C ≤ 8. 169~170행은 `dma_alloc_coherent` 반환 포인터를 `dma_addr_t buf[]`에 넣고, 175행 `dma_engine_start_chain`은 실재 API인지 불분명하며 148행 `dma_slave_config`에 `struct`가 빠져 그대로 컴파일되지 않는다(AP-C-35 성격). |
| D | 10 | 같은 시리즈 `part3-03-dma-performance.md`가 Burst Size(27~41행)·Scatter-Gather(63행~)·Chain(93행~)·Double Buffer(105행~)를 다루고 이 글 해결 3단계(130~204행)가 같은 기법이다. 3-03은 STM32H7 중심 기법 설명, 이 글은 Linux 카메라 사례 적용이라 역할은 갈린다. 인접 `part6-03-case-lock-contention.md`(52)와 6-01·6-02는 H2 뼈대만 같다. 다음 seriesOrder 54 `part3-12-cxl-mem-latency.md`는 겹치지 않는다. `modern-recipes/part11-04-axi.md` 96행 ↔ 114행, `part3-01-bus-architecture.md` 203행 INCR16 = 128 byte ↔ 108행. |
| E | 7 | 제목 '카메라 1080p 60fps가 30fps로 떨어지는 이유'와 description의 DMA burst·AXI 효율이 증상(27~29행)·원인(103~124행)·검증(210~217행)과 같은 질문을 향한다. 원인 진단 산술(80·111행)이 맞지 않아 '이유'에 일관되게 답하지 못하고, description의 'Cortex-A 보드'도 SoC를 밝히지 않는다. |
| F | 4 | 234행 '이 사례로 6장 case study series를 마칩니다. 다음은 7장 advanced topics'는 틀렸다. 실제 seriesOrder 54는 `part3-12-cxl-mem-latency.md`이고, 같은 6장에 `part6-05-case-cxl-llm-kv-cache.md`(56)가 있으며 디렉터리에 part7 글은 없다. 다음 편 안내가 틀려 F ≤ 5. 238~242행 관련 항목 다섯 개는 대상 파일을 열어 라벨이 맞음을 확인했다. Step 1~3 구분(130·158·180행)은 긴 코드의 방향을 잡아 준다. |
| G | 1 | 본문에 출처 링크가 하나도 없다. 31행 '데이터시트상'·105행 '데이터시트는 최대 256 beat'·227행 'Datasheet의 PMU 챕터'는 어느 SoC의 어떤 문서인지 밝히지 않는다. 135~141행 `snps,*` 바인딩의 근거 문서·커널 버전도 없다. |

uncertainties:
- 80행 'DDR3-1600 single-channel 6.4 GB/s'는 64-bit channel이면 12.8 GB/s라 32-bit 채널 전제인지 확인이 필요하다. 1차 자료로 확인하지 않아 오류로 올리지 않았다.
- 135~141행 `snps,axi-config`·`snps,max-burst-len`·`snps,wr-osr-lmt`는 stmmac(Synopsys Ethernet) 계열 바인딩 이름으로 보이며 카메라 DMA 바인딩인지 커널 문서로 확인하지 않았다.
- 148~153행 dmaengine `src_maxburst`/`dst_maxburst` 단위와 256 값이 AXI 256 beat과 같은 뜻인지 미확인.
- 175행 `dma_engine_start_chain`이 실재 커널 API인지 미확인.
- 219행 'CPU 사용률은 변화 없이 60% 정도'와 29행 'CPU idle 70% 이상'은 기준이 다르면 둘 다 참일 수 있어 모순으로 올리지 않았다(47행 thread 합 55%와 같은 기준으로 보인다).
- 89행 total ~50%가 cam_dma 98%보다 작은 이유('overlapping')가 설명되지 않는다.
- 156·226행 'DDR controller의 row open/close cost가 burst length로 분산' 메커니즘은 1차 자료로 확인하지 않았다.
- `part3-03-dma-performance.md` 41행은 64-byte를 burst sweet spot으로, 이 글 226행은 hardware 최대값에 가깝게 올리라고 한다. 시리즈 안 권고 충돌이며 1차 자료로 정해야 한다.
- 측정 수치 전체(124 MB/s, 98% busy, 230/245/248 MB/s)가 실측 기록인지 확인할 수 없다. ba91202b 메시지는 같은 파일 이름의 이전 판이 다른 수치의 사례였다고 적는다.

병합 대상: 병합 대상 없음. `part3-03-dma-performance.md`가 같은 기법을 다루지만 이 글은 Linux 카메라 진단 사례라 독립 검색 의도가 있다. 판정은 오류 확인에 따른 우선 조치이고 다음 조치는 보강이다. 80·109~111·212행 산술 모순을 대상 SoC의 DMA·AXI·DDR 문서로 바로잡거나 근거 없는 수치를 지우고, 234행 다음 편 안내를 실제 seriesOrder 54에 맞추며, 169~175행 코드를 실재 dmaengine API로 고친다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 공통 H2 뼈대: Part 5 도구 글은 '한 줄 요약 / 어떤 문제를 푸는가 / … / 시나리오 / 자주 보는 함정과 안티패턴 / 정리 / 관련 항목'(part5-05 12·16·190·223·234행, part5-06 12·16·147·169·180행, part5-07 12·16·175·210·245·256행, part5-08 12·16·181·210·251·262행, part5-09 12·16·211·221·256·267행, part5-10 12·16·217·248·260행), Part 6 사례 글은 '한 줄 요약 / 증상 / 가설 1 / 가설 2 / 원인 / 해결 / 검증 — Before / After / 교훈 / 관련 항목'(part6-01 12~199행, part6-02 12~198행, part6-03 12·16·33·57·101·120·180·199·212행, part6-04 12~236행)을 쓴다. Part 6 사례 4편은 한 커밋 ba91202b로 작성됐다. 9절 scaled content 기록 대상이다.
- 원문 내부 수치·산술 모순: part5-05 207·230행(99가 소수라는 서술), part5-06 79·161행(Cortex-M0 ETM), part5-07 136·215·217행(printf 시간), part5-08 104·258행 대 240행(PyTorch NVTX), part5-09 119~131행(uftrace DURATION), part6-01 30·179행(miss 횟수), part6-02 23행(GFLOPS×GHz), part6-03 51·205행(memory bound의 CPU 사용률), part6-04 80·109~111행(DMA 효율·클록). 1차 자료 없이 원문만으로 확인된 오류가 9편이다. 같은 일괄 작성 글의 수치를 전수 검산해야 한다.
- 다음 편 안내 누락·오류: part5-10 258행('시리즈 본문 마무리', 실제로는 part6-01이 이어짐), part6-04 234행('다음은 7장', 실제 seriesOrder 54는 part3-12, part7 글 없음)은 틀렸고, part6-01·6-02·6-03은 본문에 다음 편 안내가 없다('다음 편' grep은 part6-05 222행에만 있음). 6205e212 seriesOrder 재정렬 뒤 안내 문장을 고치지 않은 것으로 보인다. 5편이 F ≤ 5~6 상한에 걸렸다.
- 출처·환경 없는 수치와 예시 출력: part5-05 188·221행, part5-06 141~143행, part5-07 198~206행 표, part5-08 61·125·198행, part5-09 53·237행과 119~131·180~186행 예시 출력, part5-10 36~41행 overhead 표, part6-01 173~180행, part6-02 79~84행(연속 숫자 패턴), part6-04 210~215행. 10편 모두 C ≤ 8 상한이 걸렸다.
- 사례 측정값의 진위: Part 6 사례 글은 ba91202b로 작성된 뒤 f83d9992에서 사례 내용이 통째로 바뀌었다(part6-02 'Jetson Orin LiDAR' → matmul, part6-03 5G UPF router → 패킷 카운터 데몬, part6-04 이전 판 수치 다름). 측정 수치가 실제 기록인지 시리즈 단위로 확인해야 한다(part6-01·6-02·6-03·6-04).
- 본문 1차 출처·버전 표기 없음: 10편 모두 G 1~2다. 외부 링크가 있는 글은 part5-05 29행, part5-09 29·76·154행처럼 설치 명령 안의 저장소 URL뿐이고 도구 버전(perf·BCC·nsys·JetPack·TRACE32·커널)이 없다. part5-08 30행은 버전 자리표시자(`2024-x-x`)다.
- git 이력에 1차 자료 대조 커밋 없음: 10편 모두 factcheck '검증됨'이 아니다. part5-06의 279096d9 'Qualify …'처럼 출처 없는 완곡화만 있다.
- 임베디드 시리즈인데 서버·데스크톱 workflow: part5-05 173~188행(웹 서비스 시나리오), part5-09(크로스 빌드·ARM 지원 조건 없음), part5-10 본문 대부분 Kubernetes·컨테이너. target 환경(cross perf, 심볼 경로, 커널 config) 설명이 없다.
- 반복 설명: frame pointer 함정(part5-01 270~277행, part5-05 192~199행, part5-09 252~254행, part5-10 219~223행), profile-bpfcc→flamegraph.pl 명령(part5-05 65~68행, part5-04 124~125·148~149행, part1-08 86~87행), overhead 표(part5-10 36~41행, part5-04 130~137행), 개념 글 내용의 사례 글 재서술(part6-03 ↔ part4-02·4-03·1-07·4-10, part6-04 ↔ part3-03, part6-02 ↔ part2-06, part5-07 ↔ part1-03). 기준 글 하나에 두고 나머지는 링크로 바꾸는 정리 대상이다.
- 관련 항목·전제 안내 문제: 전제 지식 안내가 10편 모두 없고, 주제가 먼 다른 시리즈 글을 관련 항목에 붙이거나(part5-08 266행, part5-09 272행 Embedded C++ 2-07) 옛 번호를 적는다(part6-01 204행 'Practical RTOS Internals 2-08'). 같은 내용을 먼저 다룬 글 링크가 빠졌다(part5-07에 part1-03, part5-09에 5-01·5-03, part6-01에 5-03).

## 다음 조치

- 우선 조치(9편, 오류 확인): part5-05 207·230행 소수 서술, part5-06 79·161행 ETM, part5-07 136·215·217·250행 printf 시간과 배수, part5-08 104·258·240행 PyTorch NVTX, part5-09 119~131행 uftrace 출력, part6-01 30·179행 miss 횟수, part6-02 23행 이론값 공식, part6-03 51·205행 memory bound 판정, part6-04 80·109~111·212행 DMA 산술을 먼저 정정한다. 근거를 만들 수 없는 수치는 지우거나 TBD로 둔다.
- 다음 편 안내: part5-10 258행과 part6-04 234행을 실제 seriesOrder(50·54)에 맞추고, part6-01·6-02·6-03에 다음 편 안내를 넣는다. part6-01 204행 옛 번호를 고친다.
- 병합 검토(1편, part5-10): 병합 대상 없음. overhead 표·frame pointer 함정은 5-04·5-01·5-05 링크로 줄이고 임베디드 보드 적용 절차·버전·출처를 보강한다. Tetragon 절 축소 또는 5-04 이동을 함께 검토한다.
- part5-07은 우선 조치 뒤 `part1-03-measurement.md`와 역할 분리가 가능한지 정하고, 안 되면 1-03으로 병합을 검토한다.
- Embedded Performance Engineering Part 5·6을 `/fact-check-round` 대상으로 올리고, ba91202b·f83d9992로 작성·교체된 Part 6 사례 글의 측정 수치 진위와 내부 산술을 전수 검산한다. 시리즈 안 권고 충돌(part3-03 41행 대 part6-04 226행 burst, part1-03 176행 대 part5-07 49행 GPIO cycle)은 1차 자료로 정본을 정한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
