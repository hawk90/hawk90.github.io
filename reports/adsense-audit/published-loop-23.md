# 공개 글 AdSense 평가 — 루프 23

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-23.md) · [재검토 기록](double-check-loop-23.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

평가일: 2026-10-19. 기준 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2·anchors·antipatterns(AP-C-23/24)를 적용했다. 대상 전문과 기존 보고서 근거를 직접 읽고 아래와 같이 재판정했다. 원문·기존 보고서·사용자 작업은 수정하지 않았다. 전편 score_status=잠정, confidence=중간이다.

역사 앵커 UART=`part1-04-uart-hardware.md`(49), ISR=`part6-09-isr-api.md`(40), Build=`part7-05-kernel-build.md`(50)는 `10550ca1` 원문 기준이다. 현재 수정된 Recipes 점수를 역사 앵커에 연결하지 않았다. Recipes는 재채점에서 제외하고 명시한 D 구간 비교만 허용했다.

2026-10-19 재개 평가. 기준은 10-18 공통 원문 스냅샷이다. 원문 전문 및 기존 근거를 읽고 재판정했다. 기존의 항목별 설명 중 직접 원문과 대조하여 동의한 문장은 재사용하고, 변경/철회한 것은 아래에 고쳤다. 기계적으로 점수에 동의한 기록이 아니다. D의 Performance는 src/content/blog/embedded/performance-engineering/, Security는 src/content/blog/embedded/embedded-security/, RTOS는 src/content/blog/embedded/rtos/practical-internals/ 기준이다. Recipes는 재채점하지 않았다. F의 링크 대상 모두 title/slug/order/draft 및 후행 설명을 읽었다.

[공통 게이트](double-check-gates-2026-10-18.md)의 check/build/links/sitemap/ads/anchors/reading 결과를 인용한다. 본문 정확성·실제 target 실행·모바일 육안 확인과 구분한다. P0는 본문 검토 범위에서 미발견이며 전체 구체 주장의 1차 자료 대조는 완료하지 않았다. 사실 불확실 B≤13, 출처·환경 없는 수치 C≤8, 절차뿐 C≤9, 잘못된 안내 F≤5를 먼저 적용했다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `performance-engineering/part3-12-cxl-mem-latency.md` | 8 | 7 | 5 | 4 | 3 | 7 | 3 | **37** | 검증됨 | 제외 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `performance-engineering/part5-11-cxl-profiling-tools.md` | 14 | 12 | 7 | 10 | 6 | 5 | 3 | **57** | 검증됨 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `performance-engineering/part6-05-case-cxl-llm-kv-cache.md` | 10 | 11 | 6 | 12 | 5 | 4 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-security/chapter01-threat-model.md` | 13 | 12 | 5 | 11 | 6 | 6 | 1 | **54** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-security/chapter02-secure-boot.md` | 12 | 12 | 6 | 8 | 7 | 6 | 1 | **52** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-security/chapter03-mcu-crypto.md` | 11 | 11 | 5 | 9 | 5 | 6 | 2 | **49** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-security/chapter04-trustzone.md` | 12 | 11 | 4 | 7 | 5 | 6 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-security/chapter05-tee.md` | 14 | 13 | 8 | 12 | 6 | 6 | 2 | **61** | 미검증 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-security/chapter06-ota-update.md` | 12 | 12 | 6 | 9 | 7 | 7 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `embedded-security/chapter07-side-channel.md` | 12 | 12 | 6 | 12 | 6 | 5 | 3 | **56** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |

기존 합계 511 → 새 합계 516; 평균 51.1 → 51.6. 기존511점에서 F의 과감점/상한 적용을 재조정했다. CERT C·MISRA C·DO-178C·AUTOSAR Adaptive는 특정 블로그 장/URL을 약속하지 않는 표준/관련 주제명으로도 읽혀 무링크라는 이유만으로 F≤5를 강제하지 않았다. 개별 관련글의 구체 설명 오류와 다음편 오류에는 상한을 적용했다. CXL 2편의 역사 검증 커밋은 직접 읽었으며, 이번 target 실행 또는 전체 신규 외부 검증이라고 표현하지 않는다.

| 파일 | 기존 | 새점수 | 차이 | 게이트·점수 재판정 |
| --- | ---: | ---: | ---: | --- |
| part3-12-cxl-mem-latency.md | 37 | 37 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| part5-11-cxl-profiling-tools.md | 58 | 57 | -1 | F6→5:기존평가도17행링크설명불일치를인정했으나잘못된안내상한≤5를적용하지않았음. |
| part6-05-case-cxl-llm-kv-cache.md | 49 | 49 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |
| chapter01-threat-model.md | 53 | 54 | 1 | F5→6:무링크표준명/주제참고를없는블로그글안내로단정한과감점철회.구체적인다음편/링크대상은아래대조. |
| chapter02-secure-boot.md | 51 | 52 | 1 | F5→6:무링크표준명/주제참고를없는블로그글안내로단정한과감점철회.구체적인다음편/링크대상은아래대조. |
| chapter03-mcu-crypto.md | 48 | 49 | 1 | F5→6:무링크표준명/주제참고를없는블로그글안내로단정한과감점철회.구체적인다음편/링크대상은아래대조. |
| chapter04-trustzone.md | 45 | 46 | 1 | F5→6:무링크표준명/주제참고를없는블로그글안내로단정한과감점철회.구체적인다음편/링크대상은아래대조. |
| chapter05-tee.md | 60 | 61 | 1 | F5→6:무링크표준명/주제참고를없는블로그글안내로단정한과감점철회.구체적인다음편/링크대상은아래대조. |
| chapter06-ota-update.md | 54 | 55 | 1 | F6→7:정상본문연결/7단계OTA흐름을인정.기존의audit:reading없어서7불가라는제한은rubric상9이상조건을잘못적용한것. |
| chapter07-side-channel.md | 56 | 56 | 0 | A~G 유지: 아래 원문 관찰 및 앵커 대역과 부합. |

## 글별 근거

### `performance-engineering/part3-12-cxl-mem-latency.md`

source_file: `src/content/blog/embedded/performance-engineering/part3-12-cxl-mem-latency.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part3-12-cxl-mem-latency`

score_status: 잠정 · score: 37 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 42~44행 '약 2배'(CXL-B)와 '약 3배'(CXL-C)로 계산하면 C가 B보다 약 50% 길지만 46행은 67%다. 둘 다 반올림 값이라 내부 모순으로 확정하지 않았다. 논문 §4 원표로 확인해야 한다. - 30행 'Samsung CMM-D'를 Direct Attach 대표 사례로 든 것을 제조사 자료로 확인하지 않았다. - 32행 Multi-Host Pool을 'CXL 2.0 multi-LD / 3.0 fabric'으로 나눈 것과 MLD 설명을 CXL spec으로 확인하지 않았다. - 85행 `damo report access` 하위 명령이 현재 damo 판에서도 같은 이름인지 확인하지 않았다. - 71행 STREAM 예의 node 2·16 스레드는 가정한 환경인데 본문에 가정이라고 적지 않았다. - 제외 대신 57~63행 mlc 목록과 96~98행 함정을 part3-11 또는 part5-11에 흡수하는 병합도 시리즈 차원에서 검토할 수 있다.  제외 검토 사유: 제목 약속(대역폭·switch·pool 비교)의 절반 이상이 빠졌고, 남은 본문은 part3-11·part5-11과 거의 겹친다. 남길 고유 내용(mlc 명령, PCIe 함정)은 짧다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 8 | 이 글만의 내용은 46행(같은 DDR4인데 CXL-C(DDR4-3200)의 ld 지연이 CXL-B(DDR4-2400)보다 67% 김)과 96~98행 함정(PCIe 5.0 x16 원시 전송률 64 GB/s를 실효 대역폭으로 가정하지 말 것) 정도다. 핵심 표(40~44행)는 논문 수치 세 개를 옮긴 것이고 같은 표가 part3-11 104~110행에도 있다. 66·88·92행은 '직접 잰 값으로 판단', '워크로드마다 다르므로'처럼 판단을 독자에게 넘기는 일반론이다. 제목이 내건 토폴로지 비교 분석은 없다. |
| B | 7 | 도입(16~22행) → 토폴로지(24~34행) → 실측(36~46행) → mlc·STREAM·DAMON(48~88행) → 선택(90~92행) → 함정(94~102행) → 정리(104~109행) 흐름은 있다. 그러나 31·32행 사례 칸이 TBD이고 46·107행은 switch·pool 실측이 없다고 밝힌다. 34행은 단계 수·지연 증분을 제시하지 않는다. mlc(57~63행)는 출력 예와 읽는 법이 없고 DAMON(81행)은 '커널 문서 참조'로 넘긴다. 92행 토폴로지 선택은 기준 없이 '직접 재라'로 끝난다. |
| C | 5 | 명령은 있다: mlc 4종(54~63행), `numactl --membind` STREAM(71행), DAMON sysfs·damo(82·85행). 그러나 예상 출력, 합격·실패 관찰, 측정 환경이 없다. 74행은 비교 절차만 있고 81행 DAMON 설정은 생략돼 재현할 수 없다. 40~44행 수치는 출처가 있지만 이 글이 잰 값이 아니다. 실제 출력을 담은 앵커 part7-05(8)보다 낮다. |
| D | 4 | 38~46/106행 ↔ Performance part3-11-cxl-interconnect.md104~112/171행 동일 연구 지연표/결론.80~86행 ↔ part5-11-cxl-profiling-tools.md60~64행 DAMON 명령,71행 ↔ part2-08-memory-bandwidth.md145행 node binding. 새 실측 없이 공유 자료/명령이 핵심을 차지해4 유지. |
| E | 3 | 제목(2행)은 '지연·대역폭 실측 — Direct·Switch·Pooled 토폴로지 비교'를 약속하지만 46·107행이 switch·pool 실측이 없다고 밝히고 대역폭 실측값도 없다(66·74행은 안내뿐). 지연 실측은 direct attach 3종의 논문 인용뿐이다. description(5행)은 본문에 맞게 좁혀져 있어 0~2로는 내리지 않았다. |
| F | 7 | 111행 다음 편 'Ch 55: CXL 성능 프로파일링 도구'는 seriesOrder 55 `part5-11-cxl-profiling-tools.md`와 맞다. 115행 Ch 16 → part2-08, 116행 Ch 29 → part3-11, 117행 HBM Ch 9 → hbm/chapter09-cxl-mem, 118행 HBM Ch 8 → chapter08-npu-gpu-usage(그 글 19행 H2와 맞음)를 열어 확인했다. 18행이 전제 Ch 29를 본문에서 가리킨다. 렌더·모바일 확인은 안 해 9 이상은 주지 않았다. |
| G | 3 | 핵심 수치(14·38·106행)에 Sun et al., MICRO 2023을 붙이고 38행에 플랫폼(Intel Sapphire Rapids)과 기준(DDR5-R)을 적었다. 그러나 링크·arXiv 번호가 없고 66행 'Intel MLC 문서', 81행 '커널 문서'는 이름만 있으며 커널·damo·mlc 버전도 없다. |

게이트 재판정: 직접 읽은 a10c3404 커밋 본문이 Sun et al.MICRO2023§4, IntelMLC페이지, LinuxDAMON usage와damo USAGE.md를 출처로 지연비율/MLC옵션/NUMA지원 등을 대조한 기록이다. 현재 글의 연구수치/명령 검증 근거로 기존 검증됨 유지. 이번 하드웨어 실측/전체 신규대조는 아니며, 누락된switch/pool결과는TBD로 명시되어 있다.

병합 대상·다음 조치: 전체 병합 대상 없음. 독립 질문을 유지하며 출처/실제 관측으로 보강.


### `performance-engineering/part5-11-cxl-profiling-tools.md`

source_file: `src/content/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools`

score_status: 잠정 · score: 57 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 15행은 도구 4개를, 188행은 bpftrace를 더해 '5개 도구'라고 쓴다. 산문 개수 불일치라 오류 확인에 넣지 않았다. - 163행 'perf mem record — CPU가 어느 노드 자주 접근'은 101행 설명(memory level 표시)과 달리 노드 단위 정보를 준다고 읽힌다. 1차 자료로 확인하지 않았다. - 145행 `kprobe:cxl_event_thread`는 `drivers/cxl/pci.c`의 static 함수라 인라인되면 붙지 않을 수 있다. - 105행 'CXL은 별도 NUMA 노드로 등록'은 daxctl system-ram 모드(48행)를 전제한 것으로 보이나 본문에 조건이 없다. - 82·176행 DAMON 튜닝 규칙을 design.rst 원문과 직접 대조하지 않았다(e4415b20 기록에 의존). memory/chapter07 27~28행 권장값과의 차이도 정리하지 않았다. - part6-05 171행은 'Ch 55에서 본 DAMON 출력'이라고 이 글을 가리키지만 이 글에는 DAMON 출력이 없다(e4415b20에서 삭제). 다른 글 쪽 문제라 점수에 넣지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 23~29행 표가 도구를 층(디바이스·page·CPU access·NUMA·커널)으로 나누고 33~153행 절 순서가 이를 따른다. 118·184행은 numastat.rst 정의를 CXL에 옮겨 'local 노드 numa_foreign + CXL 노드 numa_miss로 넘친 방향을 읽는다'는 해석을 붙였고, 172·176·180행은 실패 사례와 선택 기준이다. 151행 opcode와 `cxl_internal_send_cmd`/`cxl_pci_mbox_send` 구분도 구체적이다. 다만 37~48·88~98·107~116행은 기본 사용법이고 60행은 DAMON 설정을 문서로 넘겨 13~19 구간 하단이다. |
| B | 12 | 도구별 절(33~153행) → 조합 워크플로(155~166행) → 함정(168~184행) → 정리(186~192행)로 흐름은 끝까지 간다. 그러나 출력 예가 하나도 없어(e4415b20에서 지어낸 출력을 지운 뒤 대체 없음) 읽는 법이 비고, 101행 perf mem의 CXL 비중은 조건 한 문장뿐이며 159~166행 워크플로 표에 정상/이상 기준이 없다. 163·145행 불확실이 열려 있어 B ≤ 13(AP-C-24). |
| C | 7 | 출처로 확인된 명령·경로는 있다: 45행 create-region, 67~68행 DAMON scheme 경로, 126~148행 bpftrace, 75~80행 기본값 표. 그러나 관찰 결과·기대 출력이 없고(51행은 출력 형식을 ndctl 문서로 넘김), 커널·ndctl 판과 실장비/QEMU 여부가 없으며, 61행 DAMON 시작은 60행 주석대로 설정 없이는 재현되지 않는다. 관찰 출력이 있던 앵커 part7-05(8)보다 낮다. |
| D | 10 | 60~64행 ↔ part3-12 81~85행 DAMON,39/109~112/61~64/159~166행 ↔ tools/debugging/memory/chapter06-cxl-memory-diagnostics.md25~50/68~78행cxl list/numastat/DAMON.75~80행 ↔ 같은디렉터리chapter07-tiered-memory-diagnostics.md27~43행네파라미터. mailbox/perf해석은 고유하여10. |
| E | 6 | 제목의 cxl-cli·DAMON·perf-mem과 description의 numastat이 각각 절(33·55·84·103행)로 있다. 그러나 description의 'perf-mem로 보는 CXL 트래픽'은 101행 조건부 한 문장뿐이고 '활용'은 출력·해석 없는 명령 나열이다. |
| F | 5 | 194행nextCh56/order56·198~202행다섯관련title/public은맞는다.17행그측정에쓴도구들을정리한다는안내와달리Ch54의MLC/STREAM을다루지않고여러새도구를추가해설명의정확성이부족하다.이불일치를유지하는이상F≤5를적용하여5. |
| G | 3 | 51행 `drivers/cxl/cxl.h` granularity_to_eig(), 53행 ndctl `cxl/cxl.c`, 75행 `mm/damon/core.c`, 82·176행 DAMON 설계 문서, 101행 `PERF_MEM_LVLNUM_CXL`, 118행 numastat.rst, 151행 `drivers/cxl/cxlmem.h`, 172행 ndctl cxl-list처럼 주장과 묶인 1차 출처 위치가 여럿이다. 그러나 링크와 커널·ndctl 버전이 없다. 앵커 part12-10(3)과 같은 수준이다. |

게이트 재판정: 직접 읽은 e4415b20 커밋 본문은 Linux/ndctl의granularity/CLI/명령표/opcode/tracepoint/DAMON/numastat/perf-mem자료 위치를 구체적으로 기록한다. 기존 검증됨은 이 문서/소스대조 기록에 근거해 유지. 현재실장비/QEMU실행과결과재현을 확인한것은아니다.

병합 대상·다음 조치: 후보는 `src/content/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics.md`(cxl list·numastat·cxl monitor·DAMON 워크플로가 이 글 159~166행과 같은 순서)다. 다만 '성능 프로파일링'이라는 독립 검색 의도가 있고 perf mem·perf c2c, mailbox opcode bpftrace, numa_miss/foreign 해석은 그 글에 없어 다음 조치는 보강이다. 각 도구의 실제 출력 예와 읽는 법(측정 환경 명시), 60행 DAMON 대상·operations 설정 단계, 워크플로 표의 정상/이상 기준을 넣고, 17행 Ch 54 설명을 실제 내용에 맞추며, 공통 DAMON 블록은 이 글로 모으고 memory/chapter06과 역할(프로파일 vs 장애 진단)을 두 글에 명시한다.


### `performance-engineering/part6-05-case-cxl-llm-kv-cache.md`

source_file: `src/content/blog/embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache.md`

url: `https://hawk90.github.io/blog/embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0미발견;게이트재판정에기록한내부기술/산술또는공식자료불일치가P1우선조치대상.다른구체주장검증미완료.

uncertainties: - 23행 'H100 96 GB SXM5' SKU가 실제로 있는지 NVIDIA 사양으로 확인하지 않았다. - 84·100행 'PCIe 5.0 x16 양방향 64 GB/s'가 한 방향 값인지 PCIe 5.0 명세로 확인하지 않았다. - 83행 'HBM 8 TB/s'가 5장 합계인지 장당 값인지 불명확하다. - 147행 numa_balancing=1과 memory tiering 모드(값 2)의 차이를 커널 문서로 확인하지 않았다. - 140~152·173~180행: DAMON·NUMA balancing은 host 메모리 페이지를 다루는데 GPU HBM 위 KV block promotion·demotion을 보여준다고 쓴 부분이 성립하는지 1차 자료로 확인하지 않았다(AP-C-31). - 175~178행 Access %의 정의가 없다. - 167·218행 'p99 latency 25% 증가'는 해결 전 p99가 글에 없어 계산 근거를 확인할 수 없다. - 95행 batch 64 KV 320 GB는 sequence 길이가 없고 hbm ch08 36행과 규모가 다르다(다른 글과의 모순이라 오류 확인 아님). - 115~116행 Leo 215 ns·56 GB/s/카드는 출처 없는 '측정' 수치다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 10 | 배경→증상→진단→원인→해결→결과→재발 방지(17~194행)는 사례 글의 형식이고 186~192행 운영 지표·임계표는 이 글만의 것이다. 그러나 15행이 스스로 '일반화한 시나리오'라고 밝혀 실패 사례의 경험 가치가 없고, 핵심 해결책은 120·123행 '개념적 예시 — 실 schema는 사용 엔진의 docs 참조', 138행 'release note를 확인'으로 완곡 처리됐다. 208행 'DAMON 같은 자동 tiering이 manual placement보다 일반적으로 우수'는 근거 없는 일반론이다. |
| B | 11 | 증상(35~42행), 진단 3단계(46~85행), 메모리 분해(91~98행), 해결(104~152행), 결과(158~167행), DAMON 분포(173~180행), 재발 방지·함정·정리(184~220행)까지 흐름은 간다. 그러나 100행 '매 프레임 수백 GB swap'은 74·84행으로 계산하면 약 11.5 GB이고, 60행 GB 합계는 53~57행 MiB와 맞지 않으며, 165행 275%는 175%다. GPU KV block을 CXL 노드에 두는 방법은 122~136행 개념 YAML 하나다. B ≤ 13(AP-C-24). |
| C | 6 | 명령은 있다(49행 nvidia-smi, 65행 nsys, 144·147·150~151행 DAMON·numa_balancing·daxctl). 그러나 37~40·72~75·93~96·115~116·160~163·175~178행 수치는 출처·실측 환경이 없는 시나리오라 C ≤ 8이고, 122~136행 YAML은 실제 schema가 아니라고 스스로 밝힌다. 검증 절차가 없고 100·165행 산술 오류가 있어 상한보다 낮다. |
| D | 12 | 144/150~151행 ↔ part5-11 61/48행DAMON/daxctl.93행weight140GB ↔ embedded/hardware/hbm/chapter08-npu-gpu-usage.md15~36행,110~111행2TB Leo ↔ chapter09-cxl-mem.md64행. 용량초과→붕괴→회복이라는 시나리오 역할은 구별되어12. |
| E | 5 | 제목의 'CXL.mem 추가로 KV cache 처리량 회복'은 104~167행이 다룬다. 그러나 5행 '256 GB pool'은 본문(114·217행 4 TB)과 다르고, '실전 사례'는 15행 '일반화한 시나리오'와 맞지 않는다. |
| F | 4 | 226~232행 관련 항목 7개와 222행 본문 링크 2개를 열어 라벨 번호·title이 맞음을 확인했다(part5-08·part3-12는 draft 필드 없음, 나머지 draft:false). 그러나 222행 '다음 편은 시리즈의 마무리 영역으로 들어갑니다'가 가리킬 글이 없다(디렉터리 최대 seriesOrder 56이 이 글). 89행 'HBM·GDDR 심화 Ch 8에서 본 LLaMA 70B 메모리 분해'는 ch08에 없는 표다(ch08 36·85행 batch 128·seq 2048 KV 86 GB vs 이 글 95행 batch 64 KV 320 GB). 틀린 안내 두 건이라 4. |
| G | 1 | 본문에 1차 출처 링크가 없다. vLLM 버전(28·120행 '계열'), DAMON sysfs 커널 버전(144행), Leo 사양(110~116행), H100 96 GB 사양(23행) 출처가 없다. 21~29행 환경 표는 '현장 일반화'(19행)라 환경 표기로 인정하지 않는다. |

게이트 재판정: 오류 확인. 원문 내부 모순·산술 불일치(1차 자료 미사용, 루브릭 3-1). (1) 5행 description 'CXL.mem 256 GB pool 추가' vs 111·113·114행 '2 TB DRAM, 카드 2장, 총 CXL.mem 4 TB'와 217행 'Astera Leo CXL.mem 4 TB 추가'. (2) 74행 batch 96의 KV cache load/swap 180 ms와 84·100행 'PCIe 64 GB/s로 수백 GB 데이터를 매 프레임 swap': 64 GB/s × 180 ms ≈ 11.5 GB라 한 프레임에 수백 GB를 옮길 수 없다. (3) 165행 '80 → 220, 275% 향상'은 2.75배, 곧 증가율 175%다. (4) 53~57행 nvidia-smi 값의 합은 462,129 MiB(약 484.6 GB)인데 60행은 '462 GB / 480 GB'로 MiB를 GB처럼 셌다. git log(0a9dd7bc slug, be973200 topic, 23ed6256 stub 채움·서버 모델 일반화)에 수치를 1차 자료와 대조한 커밋이 없다.

병합 대상·다음 조치: 판정은 오류 확인 때문에 우선 조치이고 점수 구간만 병합 검토다. 후보는 `part5-11-cxl-profiling-tools.md`(DAMON·daxctl 명령 중복)와 `hbm/chapter08-npu-gpu-usage.md`(LLaMA 70B 메모리 분해)지만 part5-11 194행이 이 글을 해결편으로 예고하고 '용량 초과 사례'라는 독립 검색 의도가 있어 다음 조치는 보강이다. 먼저 5행 256 GB와 본문 4 TB, 100행 '매 프레임 수백 GB', 165행 275%, 60행 MiB/GB 합계를 고친다. 그다음 95행 KV 320 GB 전제를 ch08 계산식(36행)과 맞추고 GPU KV block을 CXL 노드에 두는 경로를 vLLM·LMCache 문서와 커널 DAMON·memory tiering 문서로 확인한다. 확인 못 한 수치와 '측정' 표현은 지우거나 TBD로 둔다.


### `embedded-security/chapter01-threat-model.md`

source_file: `src/content/blog/embedded/embedded-security/chapter01-threat-model.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter01-threat-model`

score_status: 잠정 · score: 54 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 123행 'NXP의 LP55'가 실제 제품·기능 이름인지 확인하지 않았다(LPC55 debug 인증을 뜻하는지 불명). - 155행 'ECC 키 크기 1/8'은 비교 강도에 따라 비율이 달라진다. NIST SP 800-57로 확인하지 않았다. - 147~148행 RSA-2048 검증(2~3초)이 ECDSA P-256 검증(200~400 ms)보다 느리다는 서술은 일반적 인식과 반대로 보이나 기억 기반이라 오류 확인으로 올리지 않았다. - 145~151행 수치 전반과 149~150행 'HW 가속 있으면 수십 MB/s'는 출처 없는 수치다. - 21행 'STRIDE와 DREAD가 가장 널리 쓰이는 두 프레임워크', 110~113행 DREAD 등급 구간은 출처가 없다. - 139행 'DRAM은 전원 차단 후 몇 초, 냉각 시 수십 분'의 원 논문을 확인하지 않았다. - 123행 'Level 2는 영구적'을 STM32 계열별 reference manual로 확인하지 않았다. - 62행 'FIB, focused ion beam'은 표기 중복이다(점수 외).

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 13 | STRIDE 표(72~79행)와 DREAD 표(100~106행)는 입문 자료의 표준 내용이다. 고유한 것은 공격자 5단계를 임베디드 장비(JTAG·glitching·decap)로 나눈 목록(45~66행), BLE OTA 엔드포인트 STRIDE 표(83~92행), 자산×STRIDE×DREAD 위험 표(174~181행)다. 위험 표의 DREAD 평균은 다섯 축 점수 없이 결과만 있고 110~113행 등급 구간과 66행 '대부분의 상용 제품은 Level 3까지'는 출처 없는 일반론이다. |
| B | 12 | 도입(17~23행) → 자산(25~39행) → 공격자(41~66행) → STRIDE(68~94행) → DREAD(96~115행) → 특화 벡터(117~139행) → 자원 제약(141~160행) → 신뢰 경계(162~168행) → 위험 표(170~183행) → 실수·정리(185~202행) 흐름은 완성됐다. 제목의 DFD는 본문에 단어가 없고 166행 그림·168행 한 문단뿐이다. DREAD의 한계나 대체 방법이 없다. B ≤ 13. |
| C | 5 | 재현 절차·관찰 결과가 없다. 145~151행 'Cortex-M0+ @ 48 MHz' RSA-2048 2~3초, ECDSA P-256 200~400 ms, SHA-256 SW 1~3 MB/s는 라이브러리·옵션·측정 방법이 없어 C ≤ 8 대상이다. 176~181행 DREAD 평균도 산출 근거가 없다. 123·190행은 무엇을 어떻게 확인하는지 적지 않은 완곡 표현이다. |
| D | 11 | 83~92행 ↔ Security chapter10-sdlc.md84~94행OTA자산의STRIDE6행표. chapter02 19행은이글180행RoT9.0을이어받는다.위협식별입문과SDLC재적용역할은구별되어11. |
| E | 6 | 제목 'STRIDE·DFD·자산 식별 흐름'(2행) 중 STRIDE(68~94행)와 자산 식별(25~39행)은 다루지만 DFD는 단어가 없고 166행 그림·168행 한 문단뿐이다. description(5행)은 96~160행과 맞는다. |
| F | 6 | 204행nextCh2/order2와208~213행다섯실제링크의title/public정상.임의펌웨어실행은RoT공개키변조위험의결과를요약한표현으로볼수있다.무링크CERT C는표준주제명이며특정장약속은없어기본6. |
| G | 1 | 본문에 출처 링크가 없다. 70행 'STRIDE는 Microsoft가 정립'에 문서 인용이 없고, 123행 RDP Level 2·ESP32 e-fuse, 145~151행 crypto 수치에 reference manual·라이브러리 버전이 없다. 212행 CERT C도 링크·판 표기가 없다. |

게이트 재판정: 미검증. git log는 b43f6861(stub), 14cffad8(시리즈 10편 작성), b05e5d1d·a0f21c45·69e67197(코드블록·표·그림 변환), ac24bb76(제목), fa55144d·8bf4703f(링크), be973200·bfd34a20·0a9dd7bc(메타데이터·태그·slug)뿐이다. STRIDE·DREAD·RDP·crypto 수치를 1차 자료와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안 모순도 찾지 못했다(176~181행 DREAD 평균 6개는 모두 0.2의 배수라 5축 정수 평균으로 가능).

병합 대상·다음 조치: 병합 대상 없음. 겹치는 곳은 `chapter10-sdlc.md` 84~93행 OTA STRIDE 표지만 그 글은 SDLC 전체가 주제이고 82행에서 이 글을 재방문하므로 흡수 위치가 아니다. '임베디드 위협 모델링'이라는 독립 검색 의도가 있어 다음 조치는 보강이다(DFD 작성 절차 추가, DREAD 다섯 축 점수 공개, 145~151행 수치에 출처·환경을 달거나 삭제, STRIDE·DREAD 1차 출처 연결, 212행 링크 없는 항목 정리, 204행 문구를 180행 항목명과 맞춤, chapter10과 OTA 예제 차별화). 첫 글이지만 목차·편수를 안내하는 허브가 아니라 허브 예외는 적용하지 않았다.


### `embedded-security/chapter02-secure-boot.md`

source_file: `src/content/blog/embedded/embedded-security/chapter02-secure-boot.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter02-secure-boot`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0미발견;게이트재판정에기록한내부기술/산술또는공식자료불일치가P1우선조치대상.다른구체주장검증미완료.

uncertainties: - 98~104행 Cortex-M4 검증 시간(RSA-2048 400~600 ms, ECDSA P-256 100~200 ms, Ed25519 80~150 ms)은 출처가 없다. chapter06 43~46행은 ~150·~80·~30 ms이고 Ed25519 키 크기도 이 글 104행 64 bytes vs ch06 46행 32B다(다른 글과의 모순). - 100행 'RSA 검증은 빠르고 서명은 느림'은 같은 표에서 RSA-2048 검증 시간이 ECDSA보다 길게 적힌 것과 긴장 관계다. - 110행 '공개키는 수백 바이트 또는 더 길어서'는 102·104행 64 bytes와 긴장 관계다(RSA만 뜻한 것인지 불명). - 306행 'ATF는 4단계'인데 308~314행 표는 BL1·BL2·BL31·BL32·BL33 다섯 행이다(산문 개수 실수). - 177행 `cst --keygen` 방식이 NXP CST 배포본(hab4_pki_tree)과 다를 수 있다. - 223행 ESP32-C3의 ECDSA P-256 Secure Boot v2 지원 여부를 ESP-IDF 문서로 확인하지 않았다. - 157행 'STM32H7의 RSS', 131행 RDP Level 1 'SRAM은 읽힘'을 reference manual로 확인하지 않았다. - 218행 `fuse prog -y 0 6 0x2` 위치가 i.MX7·8에서도 같은지 확인하지 않았다. - 101행 'NIST 2030년 이후 권장', 103행 'CNSA 권장' 근거를 확인하지 않았다. - 280행 'PCR은 증가만 가능'은 extend를 '증가'로 표현해 부정확할 수 있다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | RoT 두 형태(23~24행), hash에 서명하는 이유(81~94행), OTP에 공개키 대신 hash를 굽는 이유(110행)는 표준 설명이다. 이 글만의 판단은 157행 'RDP Level 2는 secure boot이 아니라 디버그·flash 읽기 차단'이라는 구분, 267·336행 'sec_ver은 보안 수정에만 올린다'는 fuse 수명 기준, 338행 검증 실패 정책을 미리 정하라는 지적이다. 98~104행 알고리즘 표는 수치 출처가 없고 106행 'RSA-2048은 호환성이 중요할 때만'도 근거 없는 단정이다. |
| B | 12 | RoT(17~26행) → 체인(28~77행) → 서명(79~106행) → OTP(108~120행) → STM32·NXP·ESP32(122~245행) → anti-rollback(247~267행) → measured boot(269~302행) → TF-A(304~330행) → 실수·정리(332~350행) 흐름은 완성됐다. 다만 벤더 절마다 명령 한 묶음과 두세 문장이라 HAB 검증 실패 진단은 212행 한 문장, TF-A는 325행 개발 키만 있고 ROTPK를 OTP로 옮기는 단계가 없다. 275~287행 모순으로 B ≤ 13. |
| C | 6 | HAL RDP2 코드(140~155행), CST CSF(175~210행), espsecure/espefuse(225~243행), tpm2 명령(293~300행), TF-A make(318~328행)가 있다. 그러나 보드·도구 버전·예상 출력이 없고 299행 `tpm2_create ... ...`는 생략된 조각이다. 98~104행 Cortex-M4 @100MHz 검증 시간·코드 크기는 출처·환경 없는 수치라 C ≤ 8이고 성공·실패 관찰 절차가 없다. |
| D | 8 | 98~104/247~267행 ↔ Security chapter06 41~46/118~145행서명선택/rollback.165~171/247~251행 ↔ embedded/bootloader/chapter27-chain-of-trust.md72~90/238~241행HAB키/revocation.표준체인설명중복이상당해8. |
| E | 7 | 제목 '부트 체인 서명 검증과 RoT 구축'과 description(5행)은 30~53행 체인, 79~120행 서명·OTP, 214~219·236~243행 fuse 굽기로 답한다. 'app까지' 검증은 51행 dm-verity 한 줄과 337행뿐이고 '분석'은 벤더 기능 소개 수준이다. |
| F | 6 | 352행nextCh3/order3와356~361행여섯대상title/public정상.Ch1보안개요/위협모델은대상취지를요약하며현title과단어가완전히같지않다고오안내는아니다.DO-178C무링크표준참고만으로없는글상한을걸지않아6. |
| G | 1 | 본문에 1차 출처 링크가 없다. 339행 RFC 6979는 이름만 들었고 161행 HABv4·223행 ESP32 Secure Boot v2·289행 IMA·306행 TF-A에 공식 문서·도구 버전(CST, esptool, TF-A 릴리스)이 없다. |

게이트 재판정: 오류 확인. 원문 내부 모순(루브릭 3-1). 275~278행은 PCR_extend(idx, data)를 `new_value = SHA-256(old_PCR_value || SHA-256(data))`, `PCR[idx] = new_value`로, 즉 같은 레지스터의 이전 값에 누적한다고 정의한다. 그런데 282~286행 예시는 `PCR1 = H(PCR0 || kernel_hash)`, `PCR2 = H(PCR1 || rootfs_hash)`로 다른 번호 PCR의 값을 이어 쓰고, 283행 `PCR0 = H(bootloader_hash)`에는 이전 값이 없다. 정의와 예시가 동시에 참일 수 없다. git log(8bf4703f 링크 정리, 0a9dd7bc slug, bfd34a20 태그 등)에 1차 자료 대조 커밋이 없다.

병합 대상·다음 조치: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준 후보는 `src/content/blog/embedded/bootloader/chapter27-chain-of-trust.md`(HABv4 키 계층·revocation·anti-rollback)와 `embedded-security/chapter06-ota-update.md`(서명 알고리즘 표)지만 Ch1 위협 모델의 최상위 위험(RoT)을 받는 글이라 독립 검색 의도가 있다. 먼저 275~287행 PCR 정의·예시를 TCG PC Client Platform Firmware Profile, TPM 2.0 Library Part 1로 고치고, 이후 보강한다. 체인·HAB·TF-A 상세는 bootloader 시리즈로 링크하고 이 글은 방어 선택 기준(RDP vs secure boot, 알고리즘 선택, 실패 정책)에 집중한다.


### `embedded-security/chapter03-mcu-crypto.md`

source_file: `src/content/blog/embedded/embedded-security/chapter03-mcu-crypto.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter03-mcu-crypto`

score_status: 잠정 · score: 49 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 134~136행 RSA-2048 검증 '약 80 ms'가 chapter02 100행 '약 400~600 ms', chapter06 43·45행 RSA-2048 ~150 ms·ECDSA P-256 ~80 ms와 서로 다르다(다른 글과의 모순). - 217·353행 '10~100배'와 15행 '수십 배'에 비해 239행 수치로 계산되는 배율은 6~20배다. - 239행 STM32H7 CRYP 60~100 MB/s, SW 5~10 MB/s는 출처가 없다. - 221행 STM32H7 CRYP·HASH 지원 범위를 RM으로 확인하지 않았다. - 241~258행 절 제목은 'i.MX RT의 CAAM / DCP'인데 본문은 CAAM을 i.MX 8로 설명한다. - 235행 `HAL_CRYP_Encrypt_DMA` Size 단위와 229·231행 타입이 H7 HAL과 맞는지 확인하지 않았다. - 191행 'SP 800-90A의 DRBG로 whitening'은 conditioning이 SP 800-90B 범위라 용어 정확성을 확인하지 않았다. - 72행 'GCM nonce 재사용 시 인증 키가 즉시 복원'을 SP 800-38D로 확인하지 않았다. - 331~333행 footprint와 332행 wolfSSL 라이선스 표기를 확인하지 않았다. - 85행 SHA-3 출력에 224가 빠졌다(점수 외).

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 11 | AES 표(27~31행), 모드 표(35~42행), SHA-2 표(78~85행), HMAC(120행), 곡선 표(142~148행)는 입문서 수준이다. 고유한 것은 'SHA-256이 Cortex-M에 맞는 이유'(87행), Ed25519 추천(150행), counter 8바이트+boot id 4바이트 nonce(340행), `MBEDTLS_AES_ALT`를 안 켜 HW가 노는 함정(339행), tinycrypt·mbedTLS·wolfSSL 선택 기준(329~335행)이다. 선택 기준의 근거가 없고 '가속기 분석'은 칩별 HAL 호출(219~284행)에 그친다. |
| B | 11 | 문제 제기(17~21행) → 알고리즘 → 가속기(215~284행) → KCAPI/PSA(286~298행) → constant-time(300~323행) → SW fallback(325~335행) → 실수·정리(337~356행)로 흐름은 끝난다. 그러나 21·355행이 내건 masking은 본문에 없고, 339행은 alt driver 연결 방법이 없으며, ECC 가속은 258행 한 문장뿐이다. B ≤ 13. |
| C | 5 | mbedTLS GCM(46~70행), SHA-256(101~113행), libsodium Ed25519(152~172행), CTR-DRBG(193~211행), STM32 CRYP DMA(223~237행), NXP DCP(245~256행), PSA AEAD(264~284행) 코드는 있지만 버전·보드·예상 출력이 없고 106~108행 `flash_size`·`CHUNK`·`buf`, 201행 `board_trng_get`은 정의되지 않았다. 134~136·239·331~333행은 출처·환경 없는 수치라 C ≤ 8이고 가속 전후 처리량을 재는 절차도 없다. |
| D | 9 | 127~150/341행 ↔ Security chapter02 100~106/339행·chapter06 37~50행알고리즘선택/nonce.304~321행 ↔ chapter07 167~192행memcmp/T-table.276~283행 ↔ RTOS part4-11-trustzone-tfm.md175~200행PSAAEAD.세글이서명질문을나눠답하고constant-time도반복하여9. |
| E | 5 | 제목 'MCU Crypto HW Accelerator 분석 — AES·SHA·ECC 가속기'인데 23~213행이 알고리즘·모드 입문이고 가속기 절(215~284행)은 HAL 호출과 239행 처리량 한 줄뿐이다. ECC 가속기는 258행 한 문장, SHA 가속은 221·243행 지원 목록뿐이다. '분석' 약속 + 개념 소개라 3~5. |
| F | 6 | 358행nextCh4/order4와362~365행네관련title/public정상.366~367행CERT C/MISRA C는특정장/URL없이표준의관련분야를언급한다.로컬해당시리즈는draft지만이문장이그장발행을약속하지않으므로단독오안내확정안함.기본6. |
| G | 2 | RFC 3610(41행), RFC 8032(150행), NIST SP 800-90A(191행), SP 800-90B(213·343행), RFC 6979(341행)를 주장과 연결해 이름으로 대지만 링크·판이 없다. mbedTLS는 '3.x'(298행)만 있고 libsodium·HAL·SDK 버전이 없다. |

게이트 재판정: 미검증. git log는 14cffad8(작성), 69e67197(AES 라운드 표 변환), ac24bb76(제목), 400892d7·55e250f2(날짜·린터), fa55144d·8bf4703f(링크), 0a9dd7bc(slug), be973200(topics), 35baac92(em-dash)와 stub·발행 커밋뿐이다. 1차 자료 대조 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안 모순도 찾지 못했다(217·353행 '10~100배'와 239행에서 나오는 6~20배는 일반 범위 대 한 칩 예라 uncertainties에 둠).

병합 대상·다음 조치: 병합 대상 없음. ECC 선택(127~150행)은 chapter02 100~106행·chapter06 37~50행과, constant-time 절(300~323행)은 chapter07 173~192행과 겹쳐 링크로 대신할 수 있지만 칩별 가속기·SW 라이브러리 선택이라는 핵심 질문은 다른 글에 없다. 다음 조치는 보강이다(ECC·SHA 가속 코드, `MBEDTLS_AES_ALT`·PSA driver 연결, 가속 전후 처리량 측정 절차를 채우고 134~136·239·331~333행 수치는 1차 자료로 확인하거나 TBD).


### `embedded-security/chapter04-trustzone.md`

source_file: `src/content/blog/embedded/embedded-security/chapter04-trustzone.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter04-trustzone`

score_status: 잠정 · score: 46 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0미발견;게이트재판정에기록한내부기술/산술또는공식자료불일치가P1우선조치대상.다른구체주장검증미완료.

uncertainties: - 87행 PSCI 대역, 90행 0xC2000000~를 'Standard Secure Service'로 적었으나 bsp ch07 364~370행은 0xC2000000 계열을 i.MX SiP ID로 쓴다(다른 글과의 모순). SMCCC 원문으로 확인하지 않았다. - 48행 SMC function ID 0x32000001을 'TEE call' 예로 든 것이 SMCCC 비트 구성상 맞는지 확인하지 않았다. - 67행 'TTBR0_EL1_S vs TTBR0_EL1_NS'처럼 세계별 레지스터가 따로 있는지 Arm ARM으로 확인하지 않았다. - 31행 Secure 상태에서 NS region 접근을 '정책에 따라 차단', 34행 '0xDEADBEEF 같은 더미'의 출처가 없다. - 107행 'SAU는 8개의 region'은 구현 정의 값일 수 있다. - 101행 그림 주소 자체가 STM32L552 RM(RM0438)과 맞는지 확인하지 않았다(그림과 코드 중 어느 쪽이 맞는지는 RM으로 정한다). - 170행 GTZC MPCBB 'block당 256B'와 171행 VCTR 비트 의미를 STM32U5 RM으로 확인하지 않았다. - 174행 `GTZC_TZSC_SECCFGR3_LPTIM1_Pos`를 `|=`로 쓰는 것은 _Msk 의도로 보이나 CMSIS 의미에 달린 판단이라 오류 확인에 넣지 않았다. - 109~120행에 NSC region이 없는데 141행은 entry가 NSC region에 배치된다고 한다. IDAU가 NSC를 제공하는 구성인지 본문만으로 알 수 없다. - 154행 'BXNS lr로 복귀', 201행 'SAU 미정의 영역은 IDAU 디폴트, 보통 secure'를 1차 자료로 대조하지 않았다. - 164행 NXP RT500/600 명칭과 165행 SAM L11 'NVM Lock Bits' 서술을 확인하지 않았다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 고유한 관점은 Cortex-A(OS 단위)와 Cortex-M(application 단위) 분리를 한 글에서 대비한 23·97~99행과 MCU 벤더별 분리 컨트롤러 표(160~165행)다. NS bit 표(29~32행), EL(42행), BL31 역할(77~81행), SAU·NSC·CMSE(107~154행), PSA 표(187~192행)는 표준 내용이다. 34행 '읽히지 않거나, 0xDEADBEEF 같은 더미를 반환하거나, fault'는 가능성 나열로 구체 동작을 대신한다. |
| B | 11 | 17~215행필요→NSbit→A/M→MCUcontroller→PSA흐름완결.88/89행dispatch범위중첩과SAU/NSC예제의생략·memorymap불확실이남아11,B≤13. |
| C | 4 | 109~175행SAU/CMSE/GTZC코드가있지만board/compiler(-mcmse)/TF-A·TF-M판/결과없다.그림주소와코드관계도미검증이며107/170행수치미출처C≤8;재현성낮은4유지. |
| D | 7 | 105~120/129~138/179~194행 ↔ RTOS part4-11-trustzone-tfm.md48~83/107~118/175~200행SAU/CMSE/PSA.같은secure_aes_encrypt/입력검증구조가반복된다.Security chapter05는OS/TA개발로역할다르나TrustZone-M절의핵심중복커7. |
| E | 5 | 제목의 Cortex-A(36~93행)·Cortex-M(95~194행) 두 범위는 다루지만 '분석'을 약속하고 본문은 메커니즘 소개 수준이며 측정·실패 분석이 없다. description(5행) 'SMC, NSC.'는 키워드 나열이다. |
| F | 6 | 217행nextCh5/order5와221~225행다섯실제대상title/public정상.AUTOSAR Adaptive는무링크차량보안관련주제이고특정로컬글을지시하지않으므로없는글이라고단정하지않는다.기본6. |
| G | 1 | 본문에 1차 출처 링크가 없다. 85~91행 SMC ID 표에 SMCCC 문서 판, 107~154행에 Armv8-M ARM·CMSE 문서, 167~175행에 STM32U5 RM, 77~81행에 TF-A 버전이 없다. |

게이트 재판정: 83행함수ID범위로dispatch한다는설명에이어88행0x82000000~0x8200FFFF를SiP,89행동일시작~0xC1FFFFFF를OEM으로겹쳐배정한다.같은functionID가둘의서비스범위로동시에정의되어내부routing표오류유지.그림101행NSflash범위와112행SAU주소차이는alias/전체영역표현가능성을공식memorymap으로확인하지않아독립확정오류근거에서는뺐다.

병합 대상·다음 조치: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준 후보로 Cortex-M 절반(95~194행)은 `rtos/practical-internals/part4-11-trustzone-tfm.md`·`modern-recipes/part2-09-trustzone-m.md`, Cortex-A 절반(36~93행)은 `bsp/chapter07-tfa-trustzone.md`·`bootloader/chapter25-tfa-optee.md`가 더 깊게 다룬다. 먼저 85~91행 SMC ID 표를 SMCCC(Arm DEN0028)로, 112~113행 SAU 주소를 101행 그림과 RM0438에 맞춰 고친다. 그다음 위협 모델·키 보호 관점의 A/M 비교로 차별화 보강할지, 위 글들로 링크하고 공통 설명을 줄일지 정한다(보강 우선: Embedded Security 안에서 TrustZone 편의 독립 검색 의도가 있음).


### `embedded-security/chapter05-tee.md`

source_file: `src/content/blog/embedded/embedded-security/chapter05-tee.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter05-tee`

score_status: 잠정 · score: 61 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 23행 'TA들은 secure OS의 스케줄러 위에서 separate하게 돈다'가 OP-TEE 실행 모델과 맞는지 문서로 확인하지 않았다. - 126·376행 SMC 왕복 '수십 µs'는 출처가 없고 bootloader/chapter25 177행은 '수 µs'다(다른 글과의 모순). - 126행 '*blocksize/latency*가 압도적으로 latency가 큽니다'는 문장이 깨져 비교 대상을 알 수 없다. - 233행 `TA_FLAG_EXEC_DDR`가 현재 OP-TEE 헤더에서 유효한지 upstream으로 확인하지 않았다. - 252행 '부팅 시 등록된 TA 서명 키로 검증'과 120행 '호출 시 load', bootloader/chapter25 162행(tee-supplicant 경유 적재 때 검증)의 시점 서술이 모호하다. - 282행 `bytes_read` uint32_t와 190·192·214행 size_t가 GP Internal Core API v1.3 시그니처와 맞는지 확인하지 않았다. - 293행 'Trusted Key Derivation' 명칭과 HUK + TA UUID 유도를 OP-TEE 문서로 확인하지 않았다. - 314행은 secure world 콘솔이 따로 뜬다고 하는데 317~321행 '# normal world' 블록에 `D/TC:` 로그가 있다. optee_examples 실제 출력과 같은지도 확인하지 않았다. - 330행 xtest '약 50,000개', 377행 heap '수 KB'는 출처가 없다. - 366~367·372행 SGX·TDX·SEV 서술을 Intel·AMD 1차 자료로 확인하지 않았다. - 92·171·200행 코드는 그대로 빌드되지 않는다(AP-C-35 후보). - 336~343행 CCA 계층 그림이 text 코드 블록의 ASCII 다이어그램이다(가이드 §6 위반 후보, 점수 외).

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 `TEEC_InvokeCommand` 한 번을 libteec ioctl → smc → BL31 → OP-TEE core → TA → RPC → 복귀로 나눈 8단계(115~124행), CA(59~112행)와 TA(134~223행)를 같은 UUID·명령 번호로 짝지은 AES 예제, 저장 위치별 보안 성질(289~291행)과 TA별 키 유도(293행), 381·382행 실수 목록이다. 35~40·46~51·299~312행은 공식 문서 수준이다. CCA 절(332~358행)은 개념 소개이고 358행은 완곡 문장이다. 126행은 문장이 깨져 분석으로 인정하지 않았다. |
| B | 13 | 17~25행 → 아키텍처(27~40행) → API(42~53행) → CA → TA 개발·manifest·빌드(128~252행) → secure storage(254~293행) → QEMU(295~330행) → CCA(332~358행) → 비교(360~372행) → 실수·정리(374~393행)로 흐름은 완성됐다. tee-supplicant가 나오지 않아 120·252·290행 동작 경로가 비고, 비교 표(364~370행)에 OP-TEE·TrustZone 행이 없다. 23·233·252·282·316~328행 불확실이 열려 있어 B ≤ 13. |
| C | 8 | CA·TA 코드(59~223행), TA dev kit 환경 변수와 산출물 이름(243~250행, 249행 파일명이 229~231행 UUID와 일치), manifest 기반 QEMU 빌드(299~312행), 예상 콘솔 출력(316~328행)이 있다. 그러나 126·376행 '수십 µs', 330행 '약 50,000개 테스트', 377행 'default heap 수 KB'는 출처·환경 없는 수치라 C ≤ 8이다. 316~328행이 실제 로그라는 표시와 OP-TEE 버전·보드가 없다. 92행 memset에 `<string.h>`가 없고 171행은 181행에서 정의되는 `do_aes_encrypt`를 선언 없이 호출하며 200행 `load_device_key`는 정의가 없다(AP-C-35 후보). |
| D | 12 | 35~40/115~124/252행 ↔ embedded/bootloader/chapter25-tfa-optee.md162~177행TA검증/호출경로. Security chapter04 93행은이글로넘기고chapter06은OTA라역할다름.CA/TA쌍·InternalAPI·저장/CCA전담으로12. |
| E | 6 | 제목 'TEE 비교 분석 — OP-TEE·ARM CCA·SGX'인데 27~330행이 OP-TEE 튜토리얼이고 SGX는 366행 표 한 행과 372행 한 문단뿐이다. '비교 분석'은 세 칸 표(364~370행)와 372행이 전부다. description(5행)은 본문과 맞는다. |
| F | 6 | 395행nextCh6/order6와399~404행여섯관련대상title/slug/public정상.OTA안전펌웨어배포는현대상내용을요약한다.AUTOSAR Adaptive/DO-178C는표준주제명이지특정장번호안내가아니므로기본6. |
| G | 2 | 48~49행에 GP TEE Client API v1.0·Internal Core API v1.3 버전, 302행에 OP-TEE manifest 저장소 URL이 있다. GP 명세·OP-TEE 문서 링크와 코드·출력 기준 OP-TEE 릴리스가 없고 CCA·SGX·TDX·SEV 주장은 1차 자료와 연결되지 않는다. |

게이트 재판정: 미검증. 대조 기록 후보는 7d14b1b8 'Fact-check CCA and PREEMPT_RT guidance' 하나인데 커밋 본문이 비어 있고 1차 자료 이름이 없다. 이 글의 diff는 334·358·369행 세 줄이고 358행은 '2026년 현재 ARMv9.2-A 일부 SoC에 처음 양산…'을 '특정 아키텍처 버전이나 확산 시점을 일반화하지 않습니다'로 바꾼 출처 없는 완곡 수정이다. OP-TEE·GP API·secure storage 주장(35~330행)은 대조 기록이 없다. 14cffad8 작성, fa55144d·8bf4703f 링크, ac24bb76 제목, 나머지는 서식·날짜다.

병합 대상·다음 조치: 전체 병합 대상 없음. 독립 질문을 유지하며 출처/실제 관측으로 보강.


### `embedded-security/chapter06-ota-update.md`

source_file: `src/content/blog/embedded/embedded-security/chapter06-ota-update.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter06-ota-update`

score_status: 잠정 · score: 55 · confidence: 중간 · factcheck: 오류 확인 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0미발견;게이트재판정에기록한내부기술/산술또는공식자료불일치가P1우선조치대상.다른구체주장검증미완료.

uncertainties: - 43~46행 검증 시간이 chapter02 100~104행과 크게 다르다(다른 글과의 모순). - 46행 Ed25519 키 32B와 Ch2 104행 '64 bytes'의 표기 기준(공개키 vs 서명)을 확인하지 않았다. - 44행 'RSA-3072 2030년 이후 권장'을 NIST SP 800-57 Part 1과 대조하지 않았다. - 102행 'N초 안에 confirm()을 안 하면 다음 부팅에 복귀'는 MCUboot 동작(재부팅 시 미확인 이미지 revert)과 다를 수 있다. - 111행 DIRECT_XIP '더 빠르지만', 116행 'SWAP_USING_MOVE가 근래 가장 권장'을 MCUboot 문서로 확인하지 않았다. - 75행 0x20은 image.h 104행에서 `IMAGE_TLV_RSA2048_PSS`다. 'RSA2048 signature' 표기가 틀렸다고까지 보지는 않았다. - 172행 '두 가지'와 174~179행 네 개 나열은 산문 개수 실수다. - 181행 'bsdiff 3~8MB', 293행 '키 회전 계획(2~3년)'은 출처가 없다. - 166행은 공개키 pinning이 아니라 trust anchor를 자체 CA로 제한한 것이다. 용어 적합성을 확인하지 않았다. - 170행 '쇠한 LTE'는 오탈자로 보인다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | 21~248행의 OTA 단계·서명 알고리즘·MCUboot 헤더·A/B 슬롯·counter·TLS·delta·도구 비교는 MCUboot·Mender 문서의 표준 목차다. 고유한 판단은 82행(protected TLV가 서명 범위 밖이면 버전 위장), 145행(security_counter를 version과 분리해 보안 수정 때만 올림), 194·297행(patch와 결과 이미지를 둘 다 검증), 166행(현재·다음 CA 두 개를 미리 심음)이다. 82행의 근거인 69~79행 TLV 표가 1차 자료와 다르고 50행 키 길이 기준은 출처가 없다. |
| B | 12 | 25~33행 7단계 표를 축으로 서명(37~50행)·헤더(52~82행)·슬롯(84~116행)·counter(118~145행)·TLS(147~166행)·delta(168~194행)·도구(196~248행)·Linux A/B(250~275행)·실수·정리(277~311행)까지 흐름은 완성됐다. 102행 'N초 안에 confirm()'의 실제 API가 없고 116행 SWAP_USING_MOVE 권장 근거가 없으며 125~140행 코드가 없는 헤더 필드를 쓴다. B ≤ 13. |
| C | 6 | 43~46행 Cortex-M4 검증 시간과 181행 'bsdiff 결과물 3~8MB'는 출처·환경이 없어 C ≤ 8이다. 212~220행 imgtool sign과 264~272행 U-Boot bootcmd는 재현 가능한 형태다. 그러나 125~140행은 57~66행 struct에 없는 `ih_security_counter`를 써서 컴파일되지 않고(AP-C-35), 183~192행은 bash 블록 안에 C 호출을 섞은 의사코드다. 실행 결과가 없다. |
| D | 9 | 37~50/118~145행 ↔ Security chapter02 98~106/247~267행서명/rollback.250~275행 ↔ embedded/bootloader/chapter17-ab-update.md73~89행bootcount/altbootcmd,227~244행 ↔ chapter20-rauc-swupdate.md148~160행sw-description.고유MCUboot/TLV/CA회전역할이남아9. |
| E | 7 | 제목의 서명(37~50행)·Rollback 방지(118~145행)와 description의 A/B 슬롯(84~116행)·delta(168~194행)·서명 검증(35·281행)을 다룬다. 다만 2행 제목의 'Rollback 방지'와 '롤백 카운터'는 같은 내용을 두 번 적었고 description은 슬롯 복구 rollback과 downgrade 방지를 구분하지 않으며 대상(MCU vs Linux)을 밝히지 않는다. |
| F | 7 | 313행nextCh7/order7와317~320행네관련target/title/public정상.19·285행SecureBoot/TrustZone연결과25~33행OTA7단계가글고유길잡이다.252/320행Buildroot8후행read-only/overlayfs설명은대상143~160행에실제로있어7. |
| G | 2 | 321~323행에 MCUboot·Mender·SWUpdate 문서 최상위 링크만 있다. 58·69·74~79행 상수의 MCUboot 버전·파일, 43~46행 검증 시간의 라이브러리·클록, 44행 'RSA-3072 2030년 이후 권장'의 출처가 본문에 없다. |

게이트 재판정: [MCUboot 공식 design 문서](https://github.com/mcu-tools/mcuboot/blob/main/docs/design.md)를2026-10-19열어IMAGE_TLV_INFO_MAGIC=0x6907,PROT_INFO_MAGIC=0x6908,DEPENDENCY=0x40,SEC_CNT=0x50과image_header의ih_ver뒤_pad1구조를직접확인했다.원문69행protected/nonprotected는반대이며헤더에없는ih_security_counter를쓴다.추가로203행SWUpdate tarball과225행cpio는같은패키지형식을다르게정의한내부충돌.오류확인유지,전체OTA주장검증은아님.

병합 대상·다음 조치: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준으로는 병합 대상 없음. MCU 쪽 OTA 보안(MCUboot TLV·security counter·CA 회전)을 다루는 다른 공개 글이 없고 Linux A/B(250~275행)만 `bootloader/chapter17-ab-update.md`·`buildroot/chapter16-ota.md`와 겹친다. 다음 조치는 보강이다. 69·78·79행 TLV 상수와 122~140행 security counter 설명·코드를 image.h(52~53·112~120·168~175행) 기준으로 고치고, 203·225행 패키지 형식을 SWUpdate 문서로 맞춘다. 250~275행은 bootloader ch17 링크 요약으로 줄이고 43~46·181행 수치는 1차 자료로 확인하거나 TBD로 둔다.


### `embedded-security/chapter07-side-channel.md`

source_file: `src/content/blog/embedded/embedded-security/chapter07-side-channel.md`

url: `https://hawk90.github.io/blog/embedded/embedded-security/chapter07-side-channel`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 미검증 · anchor_ref: UART / ISR / Build (10550ca1)

blockers: P0 미발견; 공식 사양·API·실측 검증 미완료.

uncertainties: - 214행 'Trezor 하드웨어 지갑이 2019년 voltage glitch로 PIN 인증을 우회'의 연도와 대상을 1차 자료로 확인하지 않았다. - 102행 'ChipWhisperer가 피크 sample을 trigger 신호로 동기화'가 문서의 동기 샘플링 설명과 같은 뜻인지 확인하지 않았다. - 109·113·126~129행 ChipWhisperer API가 현재 5.x API와 맞는지 확인하지 않았다. 117행 `os.urandom`은 `import os`가 없다. - 93~96행 트레이스 수는 출처가 없고 15행 '몇 천 번', 279행 '수천 트레이스'와 93행 '~500'의 관계가 정리되지 않았다. - 46·48행 uint32_t 곱셈은 mod가 2^16보다 크면 오버플로한다. 55행 '키가 256비트면'과 달리 코드는 32비트 지수다. - 67행 `r[0] = r[bit]`는 비밀 비트로 배열을 인덱싱해 73행 '메모리 접근 패턴까지 같게'를 만족하는지 본문이 밝히지 않았다. - 220행 `if (!verify_signature(img))`와 225·227행 `verify_signature(img) != OK`의 반환 규약이 다르다. API 의미 판단이라 오류 확인에 넣지 않았다. - 17행과 242행의 FIPS 140-3 side-channel 요구 강도가 다르다. ISO/IEC 19790 범위와 246행 'CRYPTREC, BSI AIS 46'을 확인하지 않았다. - 248행 'NXP A1006, ATECC608, Microchip TA100' DPA 인증 주장을 제조사 자료로 확인하지 않았다. - 236행 'TrustZone-M nspe/spe 경계', 'PACBTI도 fault 저항성에 기여'를 Arm 문서로 확인하지 않았다. - 204행 cold boot를 fault injection 표에 넣은 분류와 145행 dual-rail 설명을 확인하지 않았다. - 192행 'MCU에서는 캐시가 없거나 직접 매핑이라 비교적 안전한 편'은 근거 없는 일반화다.

| 항목 | 점수 | evidence |
| --- | ---: | --- |
| A | 12 | SPA를 RSA square-and-multiply 취약 코드와 방어 코드로 보이고(41~71행), CPA 골격(81~87행), 1차 Boolean masking 의사코드(155~161행), 이중 검증 fault 방어(218~234행)로 공격과 방어를 짝지었다. 다만 Kocher·Mangard 교재의 표준 구성이고 직접 잰 트레이스나 실패 사례가 없다. 93~96행 트레이스 수는 출처가 없고 98행 '칩과 측정 조건에 크게 좌우됩니다만'으로 흐린다. 192행도 기준 없는 일반론이다. |
| B | 12 | 분류(21~33행) → SPA(35~73행) → DPA/CPA(75~98행) → ChipWhisperer(100~133행) → 방어(135~192행) → fault(194~236행) → 인증(238~248행) → 실수·정리(250~285행)로 흐름은 간다. ChipWhisperer 예제는 117행 `os.urandom`에 `import os`가 없고 128행 `AES128_round1_hw`가 정의되지 않으며 펌웨어 빌드·플래시 단계가 없다. hiding 표(139~145행)는 구현 예가 없고 masking은 SBOX_M 생성법이 없다. EM은 26행 한 줄과 33행 한 문장뿐이다. B ≤ 13. |
| C | 6 | C 코드(41~71·171~187·218~234행)와 ChipWhisperer Python(104~131행)이 있지만 보드·펌웨어·ChipWhisperer 버전·기대 출력이 없다. 133행은 판단 기준만 있고 측정 결과가 없다. 93~96행 트레이스 수와 29~30행 거리(1~2m, 수 m)는 출처·환경 없는 수치라 C ≤ 8이다. 예제가 그대로 실행되지 않는다. |
| D | 12 | 167~192행 ↔ Security chapter03 299~321행early-exit/constant-time/T-table. chapter01 129~135행은요약후이글안내,chapter06은OTA이며fault저항구현없다.SPA/CPA/masking/fault전담으로12. |
| E | 6 | 제목 'Power·Timing·EM 분석', description 'DPA / SPA / EM / fault injection. constant-time, masking, hiding'. Power(35~133행), Timing(167~192행), fault(194~236행), 세 방어는 다루지만 EM은 26행 표 한 줄과 33행 한 문장뿐이다. 실제 분석 결과(트레이스, 상관계수)도 없다. |
| F | 5 | 287행 다음 편 'Ch 8: IoT 표준'은 seriesOrder 8 `chapter08-iot-standards.md`와 맞는다. 292행 Ch 4, 294행 part4-11은 라벨과 맞는다. 291행 'Ch 3: MCU Crypto — secure element, true RNG'은 ch03에 TRNG 절은 있지만 secure element는 표 한 칸이다. 293행 'Ch 6: OTA Update — 서명 검증의 fault 저항'은 chapter06에 fault·glitch가 한 번도 없어 라벨이 대상과 다르다. F ≤ 5. |
| G | 3 | 17행이 Kocher 1996 Timing Attacks와 1999 DPA를 연도와 함께 들고 295~296행에 두 논문 링크가 있다. 297행 ChipWhisperer 문서, 298행 Mangard 책도 있다. 그러나 ChipWhisperer API(104~131행) 버전, 93~96행 트레이스 수, 214행 Trezor 사례, 240~246행 인증 표, 190행 라이브러리 함수에 출처·버전이 없다. |

게이트 재판정: 미검증. git log는 0a9dd7bc(slug), bfd34a20·2343c401(태그), be973200(topic), ac24bb76(제목·날짜), 49f2a443(블록 변환), 14cffad8(집필), 400892d7·55e250f2·77e2773b·c78aa440·121697d1·b43f6861(린터·날짜·draft 전환·stub)뿐이다. Kocher 논문, ChipWhisperer 문서, FIPS 140-3/ISO 19790 등과 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안 모순도 찾지 못했다.

병합 대상·다음 조치: 병합 대상 없음. SPA/DPA/CPA·masking·fault injection을 실제로 다루는 공개 글은 이 글 하나이고 ch01(135행)·ch05(403행)·ch09(257·385행)가 이 글로 넘긴다. 다음 조치는 보강이다(ChipWhisperer 예제를 실행 가능하게 고치고 버전 표기, 93~96행 트레이스 수 확인 또는 삭제, EM 절 추가 또는 제목·description에서 EM 삭제, ch03 299~321행과 겹치는 constant-time 코드는 링크로 대체, 293행 Ch 6 라벨 수정).

## 원문 스냅샷과 검증 범위

아래 전문과 SHA-256은 이번 근거 읽기 스냅샷이다. 종료 시 동일 해시를 다시 확인했다. target/compiler 실행은 별도 실행 기록이 있는 경우만 인정하며, 실행하지 않은 예제나 공식 자료를 확인했다고 쓰지 않았다.

| 파일 | 전문 | SHA-256 |
| --- | --- | --- |
| part3-12-cxl-mem-latency.md | 1~118행 | 08d82078101d2519c51ee4aa429141f61664c1c48b0a48c5269852a44955b54d |
| part5-11-cxl-profiling-tools.md | 1~202행 | 84849f5119300541642000947b4184a1eaab81a541cb1405ec8ba07b70e8f88e |
| part6-05-case-cxl-llm-kv-cache.md | 1~232행 | e36ee98c658aec149e29f72bcb037bb041ab42268c91bcd015e6032ea281c257 |
| chapter01-threat-model.md | 1~213행 | 4abb6315b079b8187a9c5aa548be37806d232c85b91868aa35d16a67d71cf2ba |
| chapter02-secure-boot.md | 1~362행 | 8eca8e3363275c255daf4a35eb4f4b0fdcec1a762107487d7f1b7446080db752 |
| chapter03-mcu-crypto.md | 1~367행 | 3ec072ff88dab09efa31c5eb6c44a7a95394997fa93bffbcc13992eaeb18f3a7 |
| chapter04-trustzone.md | 1~226행 | 4e73ba3938f0bfbbfe9f1b1a7d917692da158d492e49d7658e110e5534ab97c2 |
| chapter05-tee.md | 1~406행 | 633f869214c85e6f2d6fc06b49b87117550d26bf1a5f843d048c06e31f5e1602 |
| chapter06-ota-update.md | 1~323행 | a29c526b29ff529daf049e439f9338eccb4ad80af78d710ce52b5798d51466bf |
| chapter07-side-channel.md | 1~298행 | df47f21750b7cda4050cff2861cea2202b2fe6b6f046575253694d79f7338642 |
