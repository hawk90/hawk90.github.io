# 공개 글 AdSense 평가 — 루프 22

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-22.md) · [재검토 기록](double-check-loop-22.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일: 2026-10-19. 기준 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2·anchors·antipatterns(AP-C-23/24)를 적용했다. 대상 전문과 기존 보고서 근거를 직접 읽고 아래와 같이 재판정했다. 원문·기존 보고서·사용자 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

역사 앵커 UART=`part1-04-uart-hardware.md`(49), ISR=`part6-09-isr-api.md`(40), Build=`part7-05-kernel-build.md`(50)는 `10550ca1` 원문 기준이다. 현재 수정된 Recipes 점수를 역사 앵커에 연결하지 않았다. Recipes는 재채점에서 제외하고 명시한 D 구간 비교만 허용했다.

2026-10-19 재개 평가. 기준은 10-18 공통 원문 스냅샷이다. 원문 전문 및 기존 근거를 읽고 재판정했다. 기존의 항목별 설명 중 직접 원문과 대조하여 동의한 문장은 재사용하고, 변경/철회한 것은 아래에 고쳤다. 기계적으로 점수에 동의한 기록이 아니다. D의 짧은 파일명은 src/content/blog/embedded/performance-engineering/, RTOS는 src/content/blog/embedded/rtos/practical-internals/, Recipes는 src/content/blog/embedded/modern-recipes/, Debug는 src/content/blog/tools/debugging/embedded/ 기준이다. F는 모든 링크 대상의 title/slug/order/공개와 라벨 뒤 설명까지 직접 대조했다.

[공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 결과를 인용한다. 본문 정확성·실제 target 실행·모바일 육안 확인과 구분한다. P0는 본문 검토 범위에서 미발견이며 전체 구체 주장의 1차 자료 대조는 완료하지 않았다. 사실 불확실 B≤13, 출처·환경 없는 수치 C≤8, 절차뿐 C≤9, 잘못된 안내 F≤5를 먼저 적용했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `part5-05-flamegraph.md` | 11 | 12 | 7 | 12 | 7 | 7 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-06-arm-ds-lauterbach.md` | 12 | 11 | 6 | 11 | 6 | 7 | 1 | **54** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-07-baremetal-profiling.md` | 10 | 11 | 6 | 7 | 6 | 6 | 1 | **47** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-08-nsight.md` | 11 | 11 | 7 | 12 | 6 | 6 | 1 | **54** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-09-tracy-hotspot.md` | 10 | 10 | 6 | 12 | 7 | 6 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part5-10-ebpf-continuous.md` | 10 | 10 | 6 | 11 | 6 | 5 | 1 | **49** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part6-01-case-isr-latency.md` | 15 | 12 | 8 | 12 | 8 | 4 | 2 | **61** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part6-02-case-cache-thrashing.md` | 14 | 12 | 7 | 11 | 7 | 5 | 1 | **57** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part6-03-case-lock-contention.md` | 15 | 13 | 8 | 11 | 8 | 5 | 2 | **62** | 미검증 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |
| `part6-04-case-dma-tuning.md` | 14 | 12 | 6 | 10 | 7 | 4 | 1 | **54** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |

기존 합계 548 → 새 합계 549; 평균 54.8 → 54.9. 오류 확인 9편 중 5-07·6-03·6-04는 동일 조건의 모순이라고 확정할 근거가 부족하여 미검증으로 내렸다. 6-01은 동일 After 표의 Max78µs와 100µs deadline의 nonzero miss라는 직접 모순을 근거로 유지했다. 6-03 C9→8, 5-07 B10→11, 6-04 B11→12. 일부 오류 확인은 전체 검증 완료가 아니다.

| 파일 | 기존 | 새점수 | 차이 | 게이트·점수 재판정 |
| --- | ---: | ---: | ---: | --- |
| part5-05-flamegraph.md | 58 | 58 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part5-06-arm-ds-lauterbach.md | 54 | 54 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part5-07-baremetal-profiling.md | 46 | 47 | 1 | B10→11; 오류 확인→미검증. 문자 전송 시간과 printf 총시간을 같은 비용으로 본 기존 추론 철회. |
| part5-08-nsight.md | 54 | 54 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part5-09-tracy-hotspot.md | 53 | 53 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part5-10-ebpf-continuous.md | 49 | 49 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part6-01-case-isr-latency.md | 61 | 61 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part6-02-case-cache-thrashing.md | 57 | 57 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part6-03-case-lock-contention.md | 63 | 62 | -1 | C9→8; 오류 확인→미검증. DDR포화와 일반 memory-bound 요약을 동일 조건으로 확정할 수 없음. |
| part6-04-case-dma-tuning.md | 53 | 54 | 1 | B11→12; 오류 확인→미검증. ideal burst 모델과 descriptor 손실을 포함한 실측을 동일 조건으로 묶지 않음. |

## 글별 근거

### `part5-05-flamegraph.md`

source_file: `src/content/blog/embedded/performance-engineering/part5-05-flamegraph.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-05-flamegraph`

score_status: 잠정 · score: 58 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 아래 게이트 재판정에 명시한 기술 모순/산술 오류가 P1 우선 조치 대상이다. 다른 구체 주장은 검증 미완료.

uncertainties: - 114행 'I/O 대기와 mutex contention이 우측에 큰 면적으로 나타납니다'는 20·81·226행 '정렬은 알파벳 순/의미 없음'과 맞지 않는다. flamegraph.pl 정렬 동작을 1차 자료로 확인하지 않았다. - 155행은 --reverse 출력을 icicle.svg, --inverted 출력을 inverted.svg로 이름 붙였는데 152행은 icicle을 root가 위인 그래프로, 159행은 --reverse를 leaf부터 보여 주는 옵션으로 설명한다. icicle을 만드는 옵션이 --inverted인지 README로 확인하지 않았다. - 20·80·226행 '색상은 의미가 없다'와 148행 차분 그래프의 빨강/파랑, 166행 --color=io가 정리에서 구분되지 않는다. - 109~111행 perf sched_switch 결과를 stackcollapse-perf.pl로 접으면 시간이 아니라 전환 횟수 가중치가 되는지 미확인(105행 offcputime은 시간 단위). - 182행 offcputime-bpfcc -df 출력이 그대로 flamegraph.pl 입력 형식인지 BCC 버전별로 미확인. - 33행 '세 단계'라고 하고 4단계를 나열함(산문 개수 표기 실수). - 188행 '80% 이상', 221행 '최소 5초, 가능하면 30초'와 230행 '30초 이상이 표준'은 출처 없는 수치이고 서로 강도가 다르다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 124~129행 on/off 조합 판독표와173~188행 적용 흐름이 추가 가치다.35~171행 수집/포맷/해석/옵션은 기본 도구 설명 중심으로11. |
| B | 12 | 수집 → 포맷 → 읽기 → off-CPU → 함께 보기 → 차분 → icicle → 색상 → 시나리오 → 함정 → 정리(225~230행) 흐름은 갖췄다. 109~111행 perf sched_switch 경로가 시간이 아니라 전환 횟수로 가중된다는 한계, 차분 그래프가 어느 프로파일 모양 기준인지 설명이 없다. 114행·155~159행 정확성이 열려 있어 AP-C-24 기준 B ≤ 13. |
| C | 7 | 따라 칠 수 있는 명령(28~49, 65~72, 103~112, 135~146, 175~186행)은 있지만 perf·커널·BCC·FlameGraph 버전과 실행 환경이 없고 생성된 SVG나 관찰 결과가 없다. 58~60행 collapsed 샘플, 85~89행 그림은 예시값이다. 188행 '80% 이상', 221행 '최소 5초, 가능하면 30초'는 출처·환경 없는 수치라 C ≤ 8. |
| D | 12 | 65~68행 ↔ part5-04-ebpf.md124~125/148~149행 BCC→SVG,35~48행 ↔ part1-08-profiling-overview.md86~90행 perf 변환. 5-06은 hardware trace,5-09 92~98행은 GUI내장 flamegraph라 역할이 다르며 off/diff/icicle 전담12. |
| E | 7 | 제목의 On-CPU(24~95행)·Off-CPU(97~129행)·Differential(131~148행)이 모두 절로 있고 description의 perf·BCC 수집(37·67·105행)도 다룬다. 대상 독자(임베디드)와 풀 구체 문제가 드러나지 않고 시나리오가 웹 서비스(173행)다. |
| F | 7 | 232행 다음 편 'ARM DS / Lauterbach'는 seriesOrder 45 `part5-06-arm-ds-lauterbach.md`와 맞다. 236~238행 5-04·5-06·5-09 라벨을 대상 파일과 대조해 맞음을 확인했다. 해부도(95행)와 단계 번호 주석(36~48행)이 글 고유 구조다. 33행 '세 단계'라 하고 네 단계를 나열하며 전제 지식(perf 기초) 안내가 없다. audit:reading·모바일 확인은 하지 않았다. |
| G | 2 | 본문 출처는 29행 brendangregg/FlameGraph 저장소 URL 하나다. 색상 옵션(163~169행), difffolded 의미(148행), --reverse/--inverted(155~159행)에 대한 README 절이나 버전, perf·BCC·커널 버전 표기가 없다. |

게이트 재판정: 오류 확인. 원문만으로 성립하는 산술 오류(루브릭 3-1 '글이 밝힌 사실·산술이 참일 수 없음'). 207행 '99 Hz 또는 999 Hz가 표준입니다. 99 Hz는 다른 주기적 작업과 alias가 발생하지 않도록 prime number를 쓰는 관행입니다'에서 99 = 9×11이라 소수가 아니다(같은 문장의 999 = 27×37도 소수가 아니다). 230행 정리 '99 Hz … 표준 sampling 설정'이 이 근거 위에 서 있다. git log(0a9dd7bc slug 고정, 68525f0c 산문 코드 블록 이동, be973200 topics, ac24bb76 제목 변경, 그 아래 seriesOrder 재번호·다이어그램·작성 커밋)에 1차 자료 대조 커밋이 없다.

병합 대상·다음 조치: 병합 대상 없음. 같은 주제의 `tools/perf-flamegraph/chapter05-flamegraph.md`·`chapter06-off-cpu.md`는 목록뿐인 draft stub이라 오히려 이 글이 흡수할 쪽이고, part5-04·part1-08과는 명령 몇 줄만 겹친다. 다음 조치는 보강이다. 207·230행 소수 서술을 FlameGraph·Gregg 자료로 바로잡고, 임베디드 target(cross perf, 심볼, frame pointer) 시나리오와 실제 관찰 결과·도구 버전을 추가한다.


### `part5-06-arm-ds-lauterbach.md`

source_file: `src/content/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 아래 게이트 재판정에 명시한 기술 모순/산술 오류가 P1 우선 조치 대상이다. 다른 구체 주장은 검증 미완료.

uncertainties: - 79행 'ETM-M0' macrocell이 실제로 있는지, Cortex-M용 ETM 이름(ETM-M3·M4·M7)을 ARM TRM으로 확인하지 않았다. 오류 확인 근거는 161행과의 내부 모순뿐이다. - 41~43행 DSTREAM 4 GB, DSTREAM-PT 32 GB·100 Gbit/s, DSTREAM-ST 16 GB 사양은 ARM 제품 문서로 확인하지 않았다. - 53행 PowerTrace '8-32 GB buffer'와 117~124행 가격대 전부에 출처·기준 시점이 없다. - 102~104행 ISO 26262 coverage 요구(ASIL별), DO-178C MC/DC(Level A)를 1차 자료로 확인하지 않았다. 104행 IEC 62304 Statement Coverage와 106행 '모든 분기가 실제로 실행되었음을 증명'의 어긋남은 coverage 정의와 표준 원문이 필요해 오류 확인에 넣지 않았다. - 96행 ETM 데이터로 RTOS TCB를 읽는다는 주장이 program flow trace만 하는 ETMv4 구성에서 가능한지 확인하지 않았다. - 135행 breakpoint 진입·이탈과 45·96행 비침습 설명의 관계, TRACE32 Statistic.Func 절차는 문서로 확인하지 않았다. - 37행 Streamline이 bare-metal에서 RTOS task switch를 '자동으로 인식'한다는 주장은 확인하지 않았다. - 106행 '거의 유일한 방법', 126행 인건비 비교, 45행 '코어당 수 Gbps', 155행 '초당 10 Gbit', 165행 'gator 1-3% CPU'는 출처·환경 없는 단정·수치다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 이 글에만 있는 요소는 TRACE32 PRACTICE 스크립트(57~71행), 인증 표준별 coverage 표(100~104행), 가격표(117~124행), CAN ISR 50 µs 시나리오(128~145행)인데 셋 다 출처와 환경이 없다. 14행 '구성에 따라 달라집니다', 22행 '줄일 수 있습니다 … 단정할 수는 없습니다'는 구체 기준을 완곡 표현으로 대신했고, 49행 '사실상 기본 도구', 106행 '거의 유일한 방법', 173행 '사실상 표준'은 근거 없이 단정한다. |
| B | 11 | DS·Streamline(24~37행) → probe(39~45행) → TRACE32(47~73행) → ETM/PTM(75~81행) → RTOS awareness(83~96행) → coverage(98~113행) → 가격(115~126행) → 시나리오(128~145행) → 함정(147~167행) → 정리(169~178행) 흐름은 있다. 'ETM과 PTM' 절은 PTM을 설명하지 않고, 시나리오는 145행에서 원인을 '찾습니다'로 끝난다. 135행 breakpoint 진입·이탈은 45·96행 비침습 trace 설명과 어긋난다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 6 | PRACTICE 스크립트(57~71행)와 측정 절차 4단계(134~137행)는 있다. 141~143행 결과(평균 12 µs, 최대 78 µs, 분포)에 MCU·클록·probe·TRACE32 버전이 없어 C ≤ 8. 110~113행 coverage 표는 예시값이고, 155행 0.8초 계산은 산술은 맞지만 10 Gbit/s 전제에 출처가 없다. 165행 'gator 1-3% CPU'도 환경이 없다. 합격·실패 관찰이 없다. |
| D | 11 | 20/79~81/151~161행 ↔ tools/debugging/embedded/chapter02-jtag-swd-coresight.md344~357·chapter06-trace.md327~357행 ETM/핀/M0 범위. 인접5-07은DWT/ITM전담, probe/coverage/가격의 별도 역할이 남아11. |
| E | 6 | 제목·description(Streamline, TRACE32, ETM·PTM)은 본문 방향과 맞는다. description이 내건 PTM은 20행에 이름만 나오고 75~81행 절에서도 설명이 없으며, Streamline은 30~37행 capture 4단계뿐이다. |
| F | 7 | 178행 다음 편 'Bare-metal 프로파일링'은 seriesOrder 46 `part5-07-baremetal-profiling.md`와 맞다. 182~185행 관련 링크 4개(5-05 seriesOrder 44, 5-07, RTOS 2-11 'RTOS Tracing과 Observability', chapter02 'JTAG·SWD·CoreSight')를 열어 라벨이 맞음을 확인했다. 전제 지식 안내가 없고 108·132·139행은 heading이 아닌 맨 문단이다. audit:reading 확인이 없어 9 이상은 줄 수 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. ARM DS·TRACE32 버전, DSTREAM 사양(41~43행) 출처, DO-178C·ISO 26262·IEC 62304(100~104행) 조항 번호, 가격표(117~124행) 기준 시점이 없다. 버전 표기는 79행 'ETMv4' 하나뿐이다. |

게이트 재판정: 오류 확인. 원문 내부 모순(루브릭 3-1). 79행 'Cortex-M에서는 ETM-M0, ETM-M4가 있습니다'는 Cortex-M0용 ETM이 있다고 읽히고, 161행 'Cortex-M0에는 ETM이 없습니다 … Cortex-M3 이상부터 ETM-M3가 본격적입니다'는 없다고 한다. 두 진술은 동시에 참일 수 없다. 79행은 161행이 드는 ETM-M3도 빠뜨렸다. git log에 1차 자료 대조 커밋이 없다. 279096d9 'Qualify trace and CXL performance claims'는 출처 없는 완곡화이고, 387d7b79는 링크 추가, 0a9dd7bc는 slug 고정이다. ARM ETM TRM은 열지 않았으므로 어느 쪽이 맞는지는 fact-check 단계에서 정한다.

병합 대상·다음 조치: 병합 대상 없음. ETM 개념은 `rtos/practical-internals/part2-11`과 `tools/debugging/embedded/chapter02`·`chapter06`에도 있지만 상용 trace 도구, probe 사양, coverage 인증 도구라는 질문은 다른 글이 다루지 않는다. 다음 조치는 보강이다. 79행과 161행 모순을 ARM ETM TRM으로 정리하고, probe 사양과 인증 표에 1차 출처를 달고, 시나리오 측정 환경을 밝히거나 수치를 지운다. ETM 공통 설명은 줄여 chapter02·chapter06으로 링크한다.


### `part5-07-baremetal-profiling.md`

source_file: `src/content/blog/embedded/performance-engineering/part5-07-baremetal-profiling.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-07-baremetal-profiling`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 58행 'DWT는 Cortex-M3 이상에 표준 포함', 102행 'DWT가 없는 Cortex-M0'와 CYCCNT 구현이 선택 사항인지 ARMv7-M/ARMv6-M ARM으로 확인하지 않았다. - 125행은 ITM이 'SWD pin'으로 송신한다고 하고 136·250행은 SWO 핀이라고 한다. 표기 실수인지 확인하지 않았다. - 32·35·45행 'BSRR 쓰기 1 cycle'과 49행 '1-2 cycle'은 출처가 없다. part1-03 176행은 GPIO toggle 2-4 cycle로 적었다(다른 글과의 모순). - 136·203행 ITM '100 ns', 170·204행 SystemView RTT '~0.5 us'는 practical-internals part2-11 194·196행(SystemView 100~200 ns, ITM 5~10 ns)과 다르다. 1차 자료로 정해야 한다. - 98행 '함수 호출 비용까지 포함하려면 inline 매크로가 안전'의 의도가 불분명하다. - 145행 `ITM->PORT[ch].u32` 쓰기에 FIFO ready 확인이 없다(130행과 다름). - 233행 'SWO 속도는 코어 클럭과 정수배로 나뉘어야'의 TPIU 분주 규칙을 확인하지 않았다. - 205행 SWO overhead '~10 ns', 206행 ETM overhead 0, 203행 ITM Resolution 칸 '단방향'은 출처·의미가 없다. - 18행 'printf는 UART 출력 자체가 ms 단위'와 215행 '~870 us'는 단위 표현 차이 수준이라 오류로 올리지 않았다. printf 총비용과 문자당 wire비용의 차이 및100배 주장은 실측 조건 미검증.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | GPIO toggle(26~54행), DWT(60~96행), SysTick(100~121행), ITM(123~146행), SystemView(148~173행)는 Cortex-M 측정 입문의 표준 목록이고 코드는 CMSIS 관용구다. 이 글만의 것은 7가지 방법 비교 표(198~206행), cold/warm I-cache 함정(222~229행), SWO 속도 함정(231~235행) 정도인데 표 수치에 출처가 없다. 선택 기준은 208행 한 문장이다. |
| B | 11 | 24~251행 도구→ISR사례→비교→함정 흐름은 완결. wrap 범위·ITM FIFO는 불확실하나 확정 printf 산술오류 감점은 철회하여11,B≤13. |
| C | 6 | 레지스터 수준 코드(31~36, 63~71, 105~118, 128~133, 179~191행)는 있지만 환경은 27행 'STM32F4 예시'와 61행 core_cm4.h뿐이고 보드·클록·툴 버전이 없다. 비교 표(198~206행), 170~172행 RTT '~0.5 us'·'4-8 KB'·'~1 MB/s', 136행 'ITM 한 자에 100 ns'는 출처·환경 없는 수치라 C ≤ 8이다. 측정 결과·파형·기대 관찰이 없다. |
| D | 7 | 24~54/63~81/100~121/148~167/123~146행 ↔ part1-03-measurement.md143~166/63~72/77~87/202~213/215~223행 GPIO/DWT/SysTick/RTT/ITM.127~133행 ↔ RTOS part2-11-tracing-observability.md117~128행 ready검사도 같은 핵심으로7. |
| E | 6 | 제목·description(2·5행)의 GPIO·DWT·SysTick·ITM을 24·56·100·123행 절에서 모두 다룬다. 다만 '프로파일링'에 비해 본문은 구간 시간 측정만 하고 함수별 hotspot(ITM PC sampling 등)은 없다. 대상 독자는 18행 'M0/M3/M4 작은 MCU'로 넓다. |
| F | 6 | 254행 다음 편 'Nsight Systems'는 seriesOrder 47 `part5-08-nsight.md`와 맞다. 258~261행 관련 항목 4개(5-06 seriesOrder 45, 5-08, practical-internals part2-11, Embedded Debugging chapter06-trace)를 열어 라벨·slug가 맞음을 확인했다. 같은 내용을 먼저 다룬 part1-03 안내와 전제 지식 안내가 없고 H2 뼈대는 시리즈 템플릿이다. |
| G | 1 | 본문에 출처 링크가 없다. DWT·ITM·SysTick 동작(58·102·125행)에 ARMv7-M ARM 인용이 없고, SystemView 수치(170~172행)에 SEGGER 문서·버전이 없다. CMSIS·툴 버전 표기도 없다. |

게이트 재판정: 136행87µs/문자는 선로 전송이고215/217행printf의 ~870µs에는 formatting/버퍼/동기화 비용도 포함될 수 있다. 순수 전송시간이라고 제한하지 않아 6자/4자에서 같은 총근사값이 불가능하다고 확정할 수 없다.250행100배도 동일 벤치의 정확 비율이라 밝히지 않아 미검증으로 내린다.

병합 대상·다음 조치: 후보는 같은 시리즈 `src/content/blog/embedded/performance-engineering/part1-03-measurement.md`다(DWT·SysTick·GPIO·SystemView·ITM 절이 거의 같다). 우선 조치(136행 대 215·217행 산술 모순, 250행 '100배')를 먼저 하고, 다음 조치는 보강이다. 비교 표(198~206행)를 1차 자료로 채우고 1-03(측정 기초)과 이 글(도구 선택)의 역할을 나눌 수 있으면 독립 유지, 안 되면 1-03으로 병합한다.


### `part5-08-nsight.md`

source_file: `src/content/blog/embedded/performance-engineering/part5-08-nsight.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-08-nsight`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 아래 게이트 재판정에 명시한 기술 모순/산술 오류가 P1 우선 조치 대상이다. 다른 구체 주장은 검증 미완료.

uncertainties: - 30~31행 `wget …nsight-systems-2024-x-x-linux`는 자리표시자 URL이고 받은 파일 이름이 31행 `nsight-systems-*.deb`와 맞는지 미확인. - 137~138행 주석 '다른 stream에서 동시 실행'이 s1 복사와의 overlap만 뜻하는지, 순서가 잘못된 것인지 CUDA 문서로 확인하지 않았다(API 의미 판단이라 오류 확인에 넣지 않음). - 61행 '5-20 us', 125행 '5-10배', 198행 '1.5-2배'는 출처·환경 없는 수치다. - 149·176행 `nvmedia`·`nvvideo` trace, 156행 ISP·NVENC 표시 범위, 165행 `--sample=cpu`·`--cpuctxsw=process`, 236행 `-d 30`·`--delay 60` 옵션이 현재 nsys CLI에 있는지 User Guide로 확인하지 않았다. - 145·158행 DLA 별도 row 표시와 Nano에 DLA가 있다는 전제(기억으로는 Nano에 DLA가 없으나 1차 자료 미확인). - 104행 'TensorFlow는 내부에 NVTX marker가 이미 있어'는 TensorFlow 문서로 확인하지 않았다. - 221~228행 함정 제목 'Pinned memory 없이 Async copy' 아래 코드가 고친 예(`cudaMallocHost`)라 함정과 해결 구분이 흐리다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | 설치·`nsys profile` 옵션(28~43행), NVTX(69~102행), Systems vs Compute 표(110~113행), stream·pinned memory 함정(212~228행)은 NVIDIA 문서·CUDA 입문 자료의 표준 내용이다. 이 글만의 관점은 Jetson `nvmedia`·`nvvideo` trace로 카메라→ISP→추론 pipeline을 한 timeline에서 본다는 점(149·156행)과 YOLO 시나리오(181~208행)인데, timeline은 예시 그림이고 198행 '1.5-2배', 61행 '5-20 us', 125행 '5-10배'는 출처가 없다. |
| B | 11 | 문제 정의(18~22행) → 설치·실행 → timeline 읽기 → NVTX → Compute 구분 → stream overlap(127~141행) → Jetson(143~158행) → trace 표 → 시나리오 → 함정 → 정리(251~258행)로 흐름은 완성됐다. PyTorch NVTX 서술이 104·258행과 240행에서 충돌하고, 137~138행 예제는 s2에서 kernel이 `d_b`를 쓴 뒤 같은 s2로 `d_b`에 H2D 복사를 넣어 '동시 실행' 주석과 맞지 않는다. NPU(DLA)는 145·158행 두 문장뿐이다. AP-C-24상 B ≤ 13. |
| C | 7 | 실행 명령(40~42·119~122·149~153·165~166·184~185·236행)은 있지만 nsys·JetPack 버전, 보드·GPU 환경이 없다. 30행 URL은 `2024-x-x` 자리표시자라 그대로 실행되지 않는다. 49~59·190~206행 timeline은 예시 그림이고 실제 capture나 `--stats=true` 출력이 없다. 61·125·198행 수치로 C ≤ 8. |
| D | 12 | 127~141/198~206행 ↔ 현재 Recipes part12-05-tensorrt.md161~180행 multi-stream pipeline. 인접5-07은MCU,5-09는user profiler로 핵심 중복 적음. Nsight 시스템 timeline 전담12. |
| E | 6 | 제목 'GPU·NPU 포함 시스템 분석'과 description은 본문(20·143~158행)과 같은 질문을 향한다. NPU는 DLA 두 문장(145·158행)뿐이고, description의 '메모리'는 memcpy row(57·63·192~194행) 외에 사용량·대역 row를 다루지 않는다. |
| F | 6 | 260행 다음 편 'Tracy·Hotspot·uftrace'는 seriesOrder 48 `part5-09-tracy-hotspot.md`와 맞다. 264~266행 5-07(46), 5-09, 'Embedded C++ 2-07: 템플릿 비용'(`embedded-cpp/part2-07-templates-cost.md`) 라벨은 모두 맞다. 266행 대상은 GPU 프로파일링과 연결이 약하고, 전제 지식 안내 등 글 고유 구조가 없다. |
| G | 1 | 본문에 NVIDIA 문서·CUDA Programming Guide·NVTX 헤더 같은 1차 출처 링크가 없다. 30행 버전은 자리표시자이고 33·145행 JetPack, 149·165행 옵션의 기준 nsys 버전이 없다. |

게이트 재판정: 오류 확인. 원문 내부 모순(루브릭 3-1). 104행 'PyTorch와 TensorFlow는 내부에 NVTX marker가 이미 있어, Python 코드는 별도 작업 없이도 layer별 timeline이 보입니다'와 258행 정리 '추가 작업 없이 layer별 분석이 가능합니다'는, 238행 함정 제목 'NVTX 없이 Python ML framework profile', 240행 'PyTorch는 자동 NVTX를 켜야 보입니다', 242~247행 `torch.cuda.nvtx.range_push`/`range_pop` 수동 삽입 예와 같은 동작을 두고 동시에 참일 수 없다. 완곡 본문 대 단정 정리가 아니라 두 단정 진술의 충돌이다. git log(42ebbcbb stub, 3b861694 본문 작성, 6205e212 seriesOrder 재배치, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정)에 1차 자료 대조 커밋은 없다.

병합 대상·다음 조치: 병합 대상 없음. 시리즈 안에서 Nsight Systems를 다루는 글은 이 글뿐이고 `modern-recipes/part12-05-tensorrt.md`와는 역할(engine 빌드·배포 대 시스템 timeline 분석)이 다르다. 다음 조치는 보강이다. 104·258행과 240행 PyTorch NVTX 서술을 1차 자료(PyTorch `torch.autograd.profiler.emit_nvtx` 문서, Nsight Systems User Guide)로 정해 한쪽으로 고치고, 137~138행 stream 예제를 바로잡고, nsys·JetPack 버전과 출처를 본문에 남긴다.


### `part5-09-tracy-hotspot.md`

source_file: `src/content/blog/embedded/performance-engineering/part5-09-tracy-hotspot.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-09-tracy-hotspot`

score_status: 잠정 · score: 53 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 아래 게이트 재판정에 명시한 기술 모순/산술 오류가 P1 우선 조치 대상이다. 다른 구체 주장은 검증 미완료.

uncertainties: - 31행 `cd tracy` 뒤 `cmake -B build/profiler tracy/profiler`의 소스 경로가 `profiler`여야 할 것으로 보이나 Tracy 저장소로 확인하지 않았다. - 53·58·258행 'marker 한 개당 50-100 ns'가 Tracy 매뉴얼의 zone 비용과 같은지 미확인(기억 기반 의심). - 76행 Hotspot v1.5.0 AppImage 파일명이 실제 릴리스 자산과 같은지 미확인. - 139행 uftrace `-F 'parse_*'`가 glob인지 regex인지 미확인. - 143행 'ChromeBook 개발팀과 일부 Linux 배포판에서 사용' 출처 없음. - 175행 `plot profile.coz`가 Coz의 결과 확인 방식(`coz plot` 또는 웹 viewer)과 다를 수 있고, 180~186행 출력도 예시로 보인다. - 237행 '-pg 5-20% overhead' 출처·환경 없음. - 254행 '-fno-omit-frame-pointer 필수'는 `--call-graph dwarf` 경로를 고려하지 않은 단정일 수 있다(perf 문서 미확인). - 242행 `void main()`은 C 표준상 `int main`이어야 한다(언어 규칙 판단이라 오류 확인에 넣지 않음).

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 도구 소개(26·69·102·147행)와 설치·기본 사용(28~33, 71~85, 104~117, 153~176행)은 각 프로젝트 README 수준이다. 이 글 고유의 것은 149행 Coz 필요성 설명, 209행 perf→Tracy→Coz→uftrace 조합 순서, 211~219행 미디어 pipeline 시나리오다. 214행 8%·1%는 출처·환경 없는 가정이고 65행 적용 예는 한 문장뿐이다. 임베디드 target에서 쓰는 조건(크로스 빌드, ARM 지원)이 없다. |
| B | 10 | 도구마다 설치→사용→출력→함정 흐름이 있고 198~207행 선택 표와 256~263행 정리까지 간다. 59행 'target과 GUI 분리'의 연결 절차, uftrace의 -pg 외 계측 방식, 250행 한 문장뿐인 Coz 해석 한계가 빠졌다. 119~131행 내부 모순으로 AP-C-24상 B ≤ 13. |
| C | 6 | 명령(31~32, 83~84, 105~116, 139~140, 174~175행)과 코드(37~50, 162~169행)는 있지만 실행 환경·버전이 없다. 53·58·258행 'marker 50-100 ns', 237행 '-pg 5-20% overhead'는 출처·환경 없는 수치라 C ≤ 8. 119~131행 uftrace 출력과 180~186행 Coz 출력은 예시이고 전자는 내부 모순이 있다. 성공·실패를 가르는 검증 절차가 없다. |
| D | 12 | 102/134행user function trace ↔ part5-03-ftrace.md77~101행kernel function_graph는 유사 방식이나 대상 다름.94~98행내장flamegraph ↔ part5-05 35~48행SVGworkflow도 역할 다르며 인접5-08/5-10과 전담 질문 구별12. |
| E | 7 | 제목의 네 도구를 24·67·100·145행 절에서 모두 다룬다. '비교'는 198~207행 시나리오→추천 도구 표뿐이고 overhead·지원 플랫폼·수집 방식 비교 축이 없다. 190~194행 Apple Instruments는 제목·description(5행) 밖이다. |
| F | 6 | 265행 다음 편 'Continuous Profiling'은 seriesOrder 49 `part5-10-ebpf-continuous.md`와 맞다. 269~272행 5-05(44), 5-08(47), 5-10(49), `embedded-cpp/part2-07-templates-cost.md`(15)를 열어 라벨이 맞음을 확인했다. 272행은 주제 연결이 약하고, 18행이 perf·ftrace를 전제하면서 5-01·5-03 링크가 없다. audit:reading·폰 폭 미확인. |
| G | 2 | 본문 출처는 29행 Tracy 저장소, 76행 Hotspot v1.5.0 릴리스, 154행 Coz 저장소뿐이고 모두 설치 명령 안의 URL이다. Tracy·uftrace·Coz 버전, Tracy 매뉴얼, Coz 논문(147행은 저자만 언급) 링크가 없고 53·237행 수치와 143행 'ChromeBook 개발팀' 주장에 출처가 없다. |

게이트 재판정: [공식 uftrace replay 문서](https://github.com/namhyung/uftrace/blob/master/doc/uftrace-replay.md)의 FIELDS는 duration을 함수 실행시간으로 정의하며 timestamp/delta와 구분한다(2026-10-19 열람). 원문123/126행 parse_input 동일 호출12.345/12.000µs,127/131행 process45.678/45.000µs로 같은 DURATION이 달라 기존 오류 유지. 실제 uftrace 실행은 하지 않았다.

병합 대상·다음 조치: 병합 대상 없음. 같은 주제 `tools/perf-flamegraph/chapter09-alternatives.md`는 draft stub이다. 다음 조치는 보강이다(119~131행 uftrace 출력 정정, 비교 축 추가, 도구 버전·1차 출처 기재, 5-01·5-03 전제 링크).


### `part5-10-ebpf-continuous.md`

source_file: `src/content/blog/embedded/performance-engineering/part5-10-ebpf-continuous.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-10-ebpf-continuous`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 45행 'Parca는 … CNCF 인큐베이션 프로젝트'를 1차 자료로 확인하지 않았다. - 87행 'sFrame은 GCC 14, LLVM 17 이후 지원'과 생성 주체(binutils as --gsframe), 'Parca와 Pyroscope agent가 모두 인식'을 문서로 확인하지 않았다. - 79행 Ubuntu 24.04 frame pointer 기본 빌드 범위와 'Fedora도 따라가는 중'을 배포판 공지로 확인하지 않았다. - 60행 Parca agent 99 Hz 기본값과 228행 '4 Hz' 계산의 관계, 샘플당 크기가 없어 '수십 TB'를 검산할 수 없다. - 168행 'BPF_LSM hook으로 … 차단'과 170~185행 kprobes TracingPolicy가 같은 메커니즘인지, 'sys_openat'·matchArgs index 1·Sigkill 문법이 현재 Tetragon CRD와 맞는지 미확인. - 111행 Pixie OpenSSL uprobe TLS 디코드, 52행 --remote-store-address 플래그가 현재 버전과 맞는지 미확인. - 36~41행 overhead 수치, 195행 30-50 MB, 213행 '기본 30일 권장'은 출처 없는 수치다. - 66~68·147~149행 예시 시점(2026-05-07~08)이 글 date(2026-04-27)보다 뒤라 경험 기록처럼 읽힐 수 있다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | Parca(43~73행), Pixie(89~117행), Pyroscope(119~152행), Tetragon(166~187행)을 설치 명령과 한두 문장으로 소개하는 도구 순회형이다. 이 글만의 내용은 stack trace 정보별 위험도(201~206행)와 임베디드 fleet 적용(189~197행) 정도인데, fleet 절은 195행 '30-50 MB 수준'과 197행 한 문장이 전부라 선택 기준이 없다. Datadog 절(154~164행)은 '비용이 크게 늘어납니다'로 끝난다. |
| B | 10 | 문제 정의(16~22행) → 비교 표(26~41행) → 도구별 절 → fleet → privacy(199~215행) → 함정(217~246행) → 정리(248~258행)로 끝까지 간다. 임베디드 보드에 agent를 올리고 label을 붙이는 방법은 246행에서 이름만 나오고, 197행 '1시간 단위 aggregate' 설정이 없다. 168행 BPF_LSM과 170~185행 kprobes 정책의 관계가 설명되지 않는다. AP-C-24상 B ≤ 13. |
| C | 6 | docker run(49~57·125행), px deploy(98행), readelf(84행), Pyroscope Go 코드(133~141행)가 있으나 이미지 태그가 latest(51·57행)이고 환경·예상 출력이 없다. overhead 표(36~41행), 195행 '30-50 MB', 228행 '수십 TB'는 출처·환경 없는 수치라 C ≤ 8. 147~149행 'json_parse +120%'와 66~68행 쿼리 시점(2026-05-07~08)은 글 date(2026-04-27, 4행)보다 뒤라 관찰 결과가 아닌 예시다. |
| D | 11 | 34~41/168행 ↔ part5-04-ebpf.md130~139/168~180행 overhead/BPF_LSM.219~223행 ↔ part5-01 270~277/part5-05 192~199/part5-09 252~254행 framepointer. 연속수집/fleet 역할은 구별11. |
| E | 6 | 제목의 네 도구는 모두 절이 있다(43·89·119·166행). Tetragon은 187행이 스스로 '이상한 행동'을 찾는 보안 도구라고 해 '연속 프로파일링'과 어긋나고, Pixie 절(101~117행)도 HTTP·gRPC 관측 중심이다. 임베디드 시리즈인데 본문 대부분이 Kubernetes·컨테이너 환경이고 임베디드 적용은 189~197행뿐이다. |
| F | 5 | 258행이 'Part 5(측정과 분석)와 Embedded Performance Engineering 시리즈의 본문이 마무리됩니다'라고 하지만 같은 디렉터리 seriesOrder 50 `part6-01-case-isr-latency.md`, 51 `part6-02-case-cache-thrashing.md`로 시리즈가 이어진다. 다음 편 안내가 틀려 F ≤ 5. 262~265행 관련 항목 4개는 대상 파일 제목과 라벨이 맞는다. |
| G | 1 | 본문에 1차 출처 링크가 하나도 없다. Ubuntu 24.04(79행), GCC 14·LLVM 17(87행)은 이름만 있고, 이미지는 latest 태그(51·57행)다. 'CNCF 인큐베이션'(45행), Pixie·Pyroscope 인수(91·121행)에도 출처가 없다. |

게이트 재판정: 미검증. git log(fa6eb0c8·3b861694·bf2ed188 작성, fec6fe94·68525f0c 코드 블록 산문 정리, 6205e212 seriesOrder 재정렬, ac24bb76 제목 변경, be973200 topic 메타, 0a9dd7bc slug 고정)에 Parca·Pixie·Pyroscope·Tetragon 문서나 binutils/GCC sFrame 문서와 대조한 커밋이 없다. 이번 평가에서도 1차 자료를 열지 않았고, 본문 안에서 동시에 참일 수 없는 두 기술 진술도 찾지 못했다(14·20·40·250행의 '1% 이하/<1%'는 서로 맞고, 60행 99 Hz와 228행 4 Hz는 다른 설정의 예로 읽힌다).

병합 대상·다음 조치: 병합 대상 없음. continuous profiling(Parca·Pyroscope)은 시리즈 안에서 이 글만 다루는 독립 주제라 `part5-04-ebpf.md`에 합치면 범위가 흐려진다. 다음 조치는 보강이다. 34~41행 overhead 표는 part5-04 130~139행 참조로 바꾸고, 219~223행 frame pointer 함정은 5-01·5-05로 넘기며, aarch64 게이트웨이 보드에 Parca agent를 올리는 구체 절차·버전·출처를 채운다. 258행 '시리즈 마무리' 문장을 고치고 다음 편(part6-01) 안내를 넣는다. Tetragon 절은 축소하거나 5-04로 옮기는 것을 함께 검토한다.


### `part6-01-case-isr-latency.md`

source_file: `src/content/blog/embedded/performance-engineering/part6-01-case-isr-latency.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part6-01-case-isr-latency`

score_status: 잠정 · score: 61 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 아래 게이트 재판정에 명시한 기술 모순/산술 오류가 P1 우선 조치 대상이다. 다른 구체 주장은 검증 미완료.

uncertainties: - 112~114행 코드 주석(data_irq ~50, finish_data ~130, request_done ~100 µs)과 90~94행 trace(50→180 = 130, 180→280 = 100, 280→312 = 32 µs)가 한 칸씩 어긋난다. trace의 'N us : 함수'가 진입 시각인지 해석이 갈려 오류로 올리지 않았다. - 178행 Before max 512 µs가 31행 'spike 200~500 µs', 74행 '최대 312 µs'보다 크다. 측정 대상이 달라 원문만으로 판단할 수 없다. - 78~95행 irqsoff trace 형식이 실제 ftrace 출력인지 Documentation/trace/ftrace.rst로 확인하지 않았다. part5-03 116~123행은 '# latency: 234 us, #20/20, CPU#1' 형식을 쓴다. - 149~158행: mainline sdhci가 이미 request_threaded_irq를 쓴다는 기억이 있으나 drivers/mmc/host/sdhci.c(v5.10)로 확인하지 않았다. - 165~166행 hist trigger(keys=common_pid, vals=hitcount)가 latency 검증 수단이 아닌지 커널 histogram 문서로 확인하지 않았다. - 51행 '전 코어 평균 idle 70% 이상'과 CPU0 idle 67.4%(45행)는 'all' 행(72.4%)을 뜻한 것으로 읽혀 오류로 두지 않았다. - 153행 threadirqs 부팅 파라미터를 c 코드 블록에 넣었다(§5 후보, 점수 외). - 184행 'SD throughput 약 5% 감소', 179행 After 0.0001%는 출처·측정 방법 없는 수치다.   현장보고 시점과 Before 표 측정시점의 동일성은 미검증. After 표의 구체 정의 모순만 오류게이트로 썼다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | 가설 1 CPU 부하(36~55행, mpstat 출력으로 기각) → 가설 2 irqsoff(57~99행) → 원인 코드(105~122행) → affinity·threaded IRQ(131~160행) → Before/After(173~180행)로 이어지는 진단 사례 구조와 97행 '로그 flush 타이밍과 일치' 해석이 이 글만의 관점이다. 교훈(190~197행)은 '평균은 거짓말', 'IRQ affinity로 격리가 정석' 같은 일반론이고, 사례 수치는 출처·측정 방법이 없어 실제 경험인지 확인할 수 없다(ba91202b가 사례 4편을 한 번에 작성). |
| B | 12 | 16~197행 증상→가설→원인→해결→검증 흐름은 완결.162~167행hitcount trigger를 latency검증과 연결하는 방법이 없고 After표 Max/miss가 충돌하여12,B≤13. |
| C | 8 | 환경(22행 Cortex-A53, Linux 5.10, PREEMPT), mpstat 출력(40~49행), irqsoff 절차(63~72행), affinity 명령(135~147행)은 재현 절차다. 80~95행 trace 수치, 173~180행 표, 184행 '약 5% 감소'는 측정 도구·방법·출처가 없는 수치라 C ≤ 8을 적용했다. |
| D | 12 | 63~72행 ↔ part5-03 103~125행irqsoff,145~146행 ↔ part3-06 143~149행affinity,149~160행 ↔ part3-05 79~108행defer. 도구 설명과 다른 사례 원인 탐색 역할로12. |
| E | 8 | 제목 'ISR Latency 100µs Deadline Miss 추적'과 description '가설 두 개를 거쳐 SD 카드 드라이버를 범인으로 확정'을 24행(100 µs deadline), 36·57행(가설 두 개), 99행(SD 확정)이 이행한다. 대상 독자·전제 지식이 명시되지 않았다. |
| F | 4 | 본문에 다음 편 안내가 없다(201행 6-02는 관련 항목에만 있고 실제 seriesOrder 51과 맞음). 204행 'Practical RTOS Internals 2-08: Interrupt Latency'는 링크 없는 항목이고 실제 `practical-internals/part2-08`은 `part2-08-tick-timer.md`라 틀린 번호다 → F ≤ 5. 201~203행 6-02·3-05·5-01 라벨은 대상 제목과 맞는다. irqsoff를 다루는 `part5-03-ftrace.md`는 연결하지 않았다. |
| G | 2 | 22행에 Linux 5.10·PREEMPT·Cortex-A53 환경은 적었다. irqsoff tracer 문서, 103행 '소스를 보니'가 가리키는 sdhci 드라이버 소스, request_threaded_irq·threadirqs 문서 등 1차 출처가 본문에 하나도 없다. |

게이트 재판정: 같은 검증 After표의 Max latency78µs(178행)는 deadline100µs(24행)보다 작지만 Deadline miss rate0.0001%(179행)>0이다. 표본 전체 최댓값이 deadline보다 작으면 초과표본은0이어야 하므로 직접 정의/산술 모순으로 오류 유지. 기존 field시간당수십회와 다른 시점 Before비율 비교는 동일 관측조건 미상이라 확정 근거에서 제외한다.

병합 대상·다음 조치: 전체 병합 대상 없음. 독립 질문을 유지하며 출처/실제 관측으로 보강.


### `part6-02-case-cache-thrashing.md`

source_file: `src/content/blog/embedded/performance-engineering/part6-02-case-cache-thrashing.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part6-02-case-cache-thrashing`

score_status: 잠정 · score: 57 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 아래 게이트 재판정에 명시한 기술 모순/산술 오류가 P1 우선 조치 대상이다. 다른 구체 주장은 검증 미완료.

uncertainties: - 179행 15.3 GFLOPS는 23행 4 core 이론값과 같은데 134~152·161~166행 코드는 단일 스레드이고 병렬화 언급이 없다. 23행 식대로 core당 3.78 GFLOPS(2.1×1.8)라면 단일 스레드로 15.3은 불가능하다. 측정이 멀티스레드였는지 확정하지 못해 오류 확인 근거로는 23행 공식만 썼다. - 79행 cycles 2,712,345,678은 1.8 GHz 단일 코어로 약 1.51초인데 26·175행 실측은 1.4초다. 실행 조건 미확인. - 38행 scalar 삼중 루프는 N^3 ≈ 1.07e9회 반복마다 load 2개가 필요한데 81행 L1-dcache-loads 3.46e8, 80행 instructions 1.23e9는 그보다 작다. 컴파일러 unroll-and-jam 여부(빌드 옵션 미기재)를 알아야 판단된다. - 79~84행 perf 출력이 연속 숫자 패턴이다. 이 사례는 ba91202b의 'Jetson Orin LiDAR' 사례를 f83d9992에서 통째로 바꾼 것이다. - 23행 'core당 2.1 FLOP/cycle'(의도로 보이는 값)이 Cortex-A72 NEON FMA 처리량과 맞는지 TRM으로 확인하지 않았다. - 52행 32-bit 툴체인으로 AArch64 `fmla` grep, 56행 `-mfpu=neon`(AArch32 옵션). 실제 빌드 타깃 미확인. - 63행 `vmlaq_f32(sum, ...)`의 `sum`은 36행에서 `float`라 형이 맞지 않는다(intrinsics 의미 판단이라 불확실로 둠). 165행 `vsum`은 선언·수평 합산이 없다. - 190·191·194행 기준 수치는 출처가 없다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 가설 1(SIMD, 46~69행)이 30% 개선(67행)에 그친 뒤 perf stat(76~85행)으로 가설 2를 확정하는 흐름과 Original→NEON→Transpose→Tiling→Tiling+NEON 단계별 표(173~179행)는 이 글만의 구조다. 해법(transpose·32×32 tiling, 114~155행)은 교과서 표준이고, 190행 'SIMD는 30% 정도가 한계', 191행 '5% 이하 정상', 194행 'IPC 2.0 이상'은 출처 없는 기준이다. perf 출력이 연속 숫자 패턴(79~84행)이라 실패 사례의 실재가 의심된다. |
| B | 12 | 증상(18~27행) → 가설 2개(46~89행) → 원인(91~110행) → 해결 3단계(116~167행) → 검증(173~179행) → 교훈(185~196행) 흐름은 완성됐다. 142행 `sum = C[i * N + j]`는 C 초기화 언급이 없고, 162~166행 NEON 조각은 `vsum` 선언·수평 합산이 없으며 N이 TILE의 배수라는 전제가 없다. 23행 이론값은 4 core 기준인데 코드(134~152행)는 단일 스레드다. B ≤ 13. |
| C | 7 | 명령(52행 objdump, 76~77행 perf stat), 관찰 결과(79~84·173~179행), HW(21행 Cortex-A72 1.8 GHz, L1D 32 KB, L2 1 MB)가 있다. 컴파일러·커널·perf 버전과 빌드 옵션이 없어 C ≤ 8이다. 52행은 32-bit 툴체인 `arm-linux-gnueabihf-objdump`로 AArch64 `fmla`를 찾고 56행 `-mfpu=neon`도 AArch32 옵션이라 타깃이 하나로 정해지지 않는다. 79~84행 연속 숫자 패턴으로 경험 진위도 의심된다. |
| D | 11 | 31~43/134~152행 ↔ part2-06-cache-miss.md165~185행 naive/blocked GEMM,189/192행 ↔ part1-07-modeling.md81~100행 matmul OI/tiling. 단계별 가설 기각 사례의 역할은 구별11. |
| E | 7 | 제목 'Matrix Multiply가 예상의 10배 느린 이유'와 description('SIMD부터 의심했지만 진짜 범인은 캐시 미스 90%')이 46~89행 흐름과 82행 90.36%, 181행 결론으로 이행된다. '10배'의 기준인 23행 이론값이 공식부터 맞지 않고 4 core 전제를 단일 스레드 코드와 비교한다. |
| F | 5 | 다음 편 안내가 본문에 없다(실제 seriesOrder 52 `part6-03-case-lock-contention.md`는 201행 관련 항목에만 있음) → F ≤ 6. 200~203행 6-01·6-03·2-06('Cache Miss 3C Model 분석')·5-01 대상 파일을 열어 라벨이 맞음을 확인했다. 116·129·157행 Step 1~3 구분은 있으나 전제 지식 안내가 없다. |
| G | 1 | 본문에 출처 링크가 하나도 없다. 21행 HW 사양만 있고 Cortex-A72 TRM·Software Optimization Guide, perf 문서, NEON intrinsics 레퍼런스, 컴파일러 버전이 없다. 190·191·194행 기준 수치도 출처가 없다. |

게이트 재판정: 오류 확인. 원문 내부 공식 불일치(루브릭 3-1, AP-C-24). 23행 '이론값: 2.1 GFLOPS × 1.8 GHz × 4 core ≈ 15 GFLOPS'는 이미 초당 연산량인 GFLOPS에 클럭(GHz)을 다시 곱해 단위가 GFLOPS가 되지 않는다. 적힌 대로 core당 2.1 GFLOPS를 받으면 4 core 이론값은 8.4 GFLOPS라 23행 결과 15 GFLOPS, 24행 '0.14 초 예상', 183행 '이론값 15 GFLOPS에 도달했습니다'가 함께 참일 수 없다. 이 이론값이 제목·26행·181행 '10배'의 기준이다. git log(42ebbcbb, ba91202b, f83d9992, 6205e212, ac24bb76, be973200, 68525f0c, 0a9dd7bc)에 1차 자료 대조 커밋이 없다. 나머지 내부 산술(82행 90.36%, 84행 52.0%, 80행 IPC 0.46, 175~179행 GFLOPS와 실행 시간, 181행 4·8·10배, 105행 64 KB, 109행 1/16, 110행 12 MB, 155행 4 KB)은 직접 계산해 맞는 것을 확인했다.

병합 대상·다음 조치: 점수 구간은 병합 검토이고 후보는 `part2-06-cache-miss.md` 165~185행이지만, matmul 진단 사례라는 독립 검색 의도가 있다. 판정은 오류 확인에 따른 우선 조치이며, 23행 공식을 고친 뒤 다음 조치는 보강이다(실측 환경·버전 기재 또는 TBD, 스레드 수 명시, 다음 편 안내 추가).


### `part6-03-case-lock-contention.md`

source_file: `src/content/blog/embedded/performance-engineering/part6-03-case-lock-contention.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part6-03-case-lock-contention`

score_status: 잠정 · score: 62 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 62~68행 perf lock은 커널 lock 이벤트를 기록하므로 user-space pthread mutex인 stats_mutex가 이름으로 나오는지 의심된다. perf 문서로 확인하지 않았다. - 197행 perf c2c는 load latency 샘플링(PEBS, Arm SPE)이 필요한데 Cortex-A72에서 쓸 수 있는지 미확인. - 53행 perf stat -e mem_access로 '시스템 한계 대비 대역폭 30%'를 구할 수 있는지 미확인. - 116행은 α를 contention, β를 coherency로 정의하는데 203행은 'throughput 감소 = lock contention = USL β>0 곡선'이라고 묶는다. lock이 cache line ping-pong을 일으킨다고 읽으면 양립하므로 오류 확인으로 올리지 않았다. - 176·178행: 같은 CPU에서 선점된 두 thread가 비원자적 `s->packets++`를 하면 lost update가 생길 수 있는데 글은 migration 문제만 적었다. - git 이력: ba91202b의 사례(5G UPF router, routing_mutex, RCU)와 현재 f83d9992 사례(패킷 카운터 데몬, per-CPU)가 달라 측정값이 실제 기록인지 의심된다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 15 | 한 데몬 사례를 끝까지 끌고 간다. 33~55행 가설 1(메모리 대역폭) 기각, 57~99행 perf lock으로 가설 2 확정, 112~118행 USL β 설명, 120~178행 per-CPU 해결, 184~193행 before/after 표. 176·178행은 읽기 정확성과 CPU migration 트레이드오프를 짚는다. 14·203행 '거의 항상 lock contention', '거의 예외 없이 성립'은 근거 없는 일반화이고, 116·150·207행 USL·padding 설명은 교과서 수준이다. |
| B | 13 | 18~210행 증상부터 합산 thread/검증까지 완결된다.51/205행 설명 범위와 user mutex 관측·동시성 불확실이 열려 B≤13으로13 유지. |
| C | 8 | 21행A72/Linux5.15·38~193행 출력/코드/표가 있지만53행30%의 원시counter/환산·벤치/기간·실측출처가 없다. 재현 결과로 인정할 환경/출처가 충분하지 않아 C≤8로8. |
| D | 11 | 61~69행 ↔ part4-03-lock-contention.md42~55행perf lock,124~174행 ↔ part4-02-false-sharing.md118~133/222~236행per-CPU/shard,112~118행 ↔ part4-10-smp-analysis.md205~213행USL. 원인 좁히기 사례 역할은 구별11. |
| E | 8 | 제목 '8-core가 4-core를 넘으면 throughput이 떨어지는 이유'는 21행 환경, 25~29행 측정, 97~118행 원인, 184~193행 검증과 맞는다. description의 '단일 global mutex가 cache invalidation 폭주'는 103~110행과 197행 HITM 한 문장으로만 받쳐지고 71행 측정 근거는 mutex 대기 쪽이다. |
| F | 5 | 214~218행 관련 항목 5개(6-02 seriesOrder 51, 6-04 53, 4-03 32, 4-02 31, 5-01 40)를 열어 라벨과 주제가 맞음을 확인했다. 본문에 '다음 편' 안내 문장이 없어 F ≤ 6이고, 가설별 H2(33·57·101·120·180행)와 관련 항목 목록은 Part 6 공통 템플릿이라 점수를 주지 않았다. 4-03·4-02·1-07 전제 지식 안내도 없다. |
| G | 2 | 21행에 Cortex-A72 8-core, Linux 5.15 환경을 적었다. perf lock·perf c2c·sched_getcpu·USL(Gunther)에 본문 1차 출처나 perf 버전이 없고, 206행 커널 per_cpu() 매크로도 문서·소스 위치를 인용하지 않았다. |

게이트 재판정: 51행 DDR bandwidth 포화시 실행 중 stall의 busy와205행 일반 memory-bound는 보통 idle이라는 요약을 같은 범위의 두 보편명제로 확정한 기존 오류는 철회한다. 개념 혼동 의심은 강하지만 다른 stall/block 범주·조건을 공식 accounting 자료 없이 배제할 수 없다. 미검증으로 남긴다.

병합 대상·다음 조치: 전체 병합 대상 없음. part4-03/part4-02/part4-10과 개념이 일부 겹치지만 독립 lock병목 사례다. CPU accounting/실제 pthread 대기 관측과 원시 결과·data race 조건부터 보강.


### `part6-04-case-dma-tuning.md`

source_file: `src/content/blog/embedded/performance-engineering/part6-04-case-dma-tuning.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part6-04-case-dma-tuning`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 80행 'DDR3-1600 single-channel 6.4 GB/s'는 64-bit channel이면 12.8 GB/s라 32-bit 채널 전제인지 확인이 필요하다. 1차 자료로 확인하지 않아 오류로 올리지 않았다. - 135~141행 `snps,axi-config`·`snps,max-burst-len`·`snps,wr-osr-lmt`는 stmmac(Synopsys Ethernet) 계열 바인딩 이름으로 보이며 카메라 DMA 바인딩인지 커널 문서로 확인하지 않았다. - 148~153행 dmaengine `src_maxburst`/`dst_maxburst` 단위와 256 값이 AXI 256 beat과 같은 뜻인지 미확인. - 175행 `dma_engine_start_chain`이 실재 커널 API인지 미확인. - 219행 'CPU 사용률은 변화 없이 60% 정도'와 29행 'CPU idle 70% 이상'은 기준이 다르면 둘 다 참일 수 있어 모순으로 올리지 않았다(47행 thread 합 55%와 같은 기준으로 보인다). - 89행 total ~50%가 cam_dma 98%보다 작은 이유('overlapping')가 설명되지 않는다. - 156·226행 'DDR controller의 row open/close cost가 burst length로 분산' 메커니즘은 1차 자료로 확인하지 않았다. - `part3-03-dma-performance.md` 41행은 64-byte를 burst sweet spot으로, 이 글 226행은 hardware 최대값에 가깝게 올리라고 한다. 시리즈 안 권고 충돌이며 1차 자료로 정해야 한다. - 측정 수치 전체(124 MB/s, 98% busy, 230/245/248 MB/s)가 실측 기록인지 확인할 수 없다. ba91202b 메시지는 같은 파일 이름의 이전 판이 다른 수치의 사례였다고 적는다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 33~217행 CPU기각→DMA가설→모델→세변경→단계표가 구체적인 사례 서사다.225~230행 교훈도 사례와 연결되지만 실제 SoC·원시 관찰기록은 없어14. |
| B | 12 | 16~232행 증상→가설→모델→세 변경→검증은 완결.124행 line별 setup 손실 규모와 모델 조건은 불명확하지만 확정 동일조건 모순감점은 철회하여12,B≤13. |
| C | 6 | top·perf stat 명령과 출력(37~57행), DMA 레지스터 덤프(69~78행), AXI monitor 출력(84~97행), device tree·dmaengine 설정(132~154행), 측정 표(210~215행)가 있다. SoC·커널 버전·센서·DMA 컨트롤러 이름이 없어 C ≤ 8. 169~170행은 `dma_alloc_coherent` 반환 포인터를 `dma_addr_t buf[]`에 넣고, 175행 `dma_engine_start_chain`은 실재 API인지 불분명하며 148행 `dma_slave_config`에 `struct`가 빠져 그대로 컴파일되지 않는다(AP-C-35 성격). |
| D | 10 | 130~204행 ↔ part3-03-dma-performance.md27~41/63~125행burst/SG/chain/doublebuffer.108행16×8=128B ↔ part3-01-bus-architecture.md203행. 기법 반복이지만 Linux카메라 진단 역할로10. |
| E | 7 | 2·5행1080p60→30fps 질문을23~29/103~124/210~217행에서 다룬다. 모델/실측의 조건과 controller가 명확하지 않아 결과 해석은 약하지만 제목 방향은 맞아7. |
| F | 4 | 234행 '이 사례로 6장 case study series를 마칩니다. 다음은 7장 advanced topics'는 틀렸다. 실제 seriesOrder 54는 `part3-12-cxl-mem-latency.md`이고, 같은 6장에 `part6-05-case-cxl-llm-kv-cache.md`(56)가 있으며 디렉터리에 part7 글은 없다. 다음 편 안내가 틀려 F ≤ 5. 238~242행 관련 항목 다섯 개는 대상 파일을 열어 라벨이 맞음을 확인했다. Step 1~3 구분(130·158·180행)은 긴 코드의 방향을 잡아 준다. |
| G | 1 | 본문에 출처 링크가 하나도 없다. 31행 '데이터시트상'·105행 '데이터시트는 최대 256 beat'·227행 'Datasheet의 PMU 챕터'는 어느 SoC의 어떤 문서인지 밝히지 않는다. 135~141행 `snps,*` 바인딩의 근거 문서·커널 버전도 없다. |

게이트 재판정: 108~111행3.2GB/s는 ideal burst 모델이고124MB/s 실측에는118~124행 single-descriptor/line별 setup 손실이 추가된다.98% busy도 어떤 counter/구간인지 미정의라 같은 모델로 직접 묶을 수 없다.6.4GB/s는DDR rate이며 overhead1GHz를AXI beat800MHz와 같은 clock으로 강제할 근거도 없다. 모델 타당성은 미검증이나 기존 확정오류는 철회한다.

병합 대상·다음 조치: part3-03 DMA 기법 설명과 부분 중복 후보. 독립 카메라 transport 사례로 실제 SoC/clock domain/counter정의 및 ideal모델 대 실측 범위를 명시하고 원시 관찰을 보강.

## 원문 스냅샷과 검증 범위

아래 전문과 SHA-256은 이번 근거 읽기 스냅샷이다. 종료 시 동일 해시를 다시 확인했다. target/compiler 실행은 별도 실행 기록이 있는 경우만 인정하며, 실행하지 않은 예제나 공식 자료를 확인했다고 쓰지 않았다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| part5-05-flamegraph.md | 1~238행 | 065539a92a1f796250af6aa5aca6541485c9c47c8a8622199463350e682aa51b |
| part5-06-arm-ds-lauterbach.md | 1~185행 | b037d05e45d05fbabae8698b8cc4c38c285cb88815896684b0eefe86b4b63cd1 |
| part5-07-baremetal-profiling.md | 1~261행 | 1c9f28be43d479925f31735148777b030c068834f4584a27d5f1c6383ccc293c |
| part5-08-nsight.md | 1~266행 | 0803c0b16205f4128de1629ef7dc884f30eebdbdcdee1ace8ef7b02c1bf67b8f |
| part5-09-tracy-hotspot.md | 1~272행 | 0ce6e8ead9c48045bd0edf0a0c26ad07641f2c6a8c357c711119bd47a7db1932 |
| part5-10-ebpf-continuous.md | 1~265행 | b056fcc66fee42c192778b420b64fe8f49dfbb3a599092bf9b10abf571496f88 |
| part6-01-case-isr-latency.md | 1~204행 | 2f5f83bb37b77dcf557838178d9889564e605ecbda5e17e57014e02708fa54e5 |
| part6-02-case-cache-thrashing.md | 1~203행 | 23951df0d507fb88499846b2f30d8e4beb9cbb28231e65e9a6b3371aae31e1bb |
| part6-03-case-lock-contention.md | 1~218행 | 0e87461fe2012f9c061afd6defbb4905607098020dae44e23aada44aa339e0a3 |
| part6-04-case-dma-tuning.md | 1~242행 | 123e55a8edaba0671205af1951ba6e97c2a59206b6b7f844967af8cf1c88b5f2 |
