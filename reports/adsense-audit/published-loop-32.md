# 공개 글 AdSense 평가 — 루프 32

> 대상: 공개 글 10편 (Memory Diagnostics `seriesOrder` 5~7, PCIe Deep Dive `seriesOrder` 1~7)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른두 번째 루프다. 대상은 `src/content/blog/tools/debugging/memory/`의 Ch 5~7(누수 진단·CXL·tiered memory) 3편과 `src/content/blog/embedded/hardware/pcie/`의 Ch 1~7 7편이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `memory/chapter05-prod-leak-diagnosis.md` | 13 | 12 | 7 | 10 | 7 | 4 | 2 | **55** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `memory/chapter06-cxl-memory-diagnostics.md` | 9 | 7 | 5 | 5 | 5 | 7 | 3 | **41** | 검증됨 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `memory/chapter07-tiered-memory-diagnostics.md` | 13 | 13 | 6 | 11 | 7 | 6 | 1 | **57** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `pcie/chapter01-fundamentals.md` | 11 | 11 | 4 | 8 | 7 | 4 | 2 | **47** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `pcie/chapter02-tlp.md` | 10 | 11 | 5 | 12 | 7 | 7 | 1 | **53** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `pcie/chapter03-config-space.md` | 8 | 9 | 4 | 8 | 6 | 6 | 1 | **42** | 오류 확인 | 우선 조치 | 높음 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `pcie/chapter04-bar-mmio.md` | 10 | 10 | 4 | 9 | 7 | 7 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `pcie/chapter05-interrupts.md` | 9 | 9 | 4 | 9 | 6 | 4 | 1 | **42** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `pcie/chapter06-power-management.md` | 9 | 9 | 5 | 10 | 7 | 5 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md` |
| `pcie/chapter07-error-handling.md` | 9 | 9 | 5 | 10 | 7 | 5 | 1 | **46** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |

평균 47.7점(10편, 합 477점), 범위 41~57점이다. 판정은 우선 조치 7편, 병합 검토 3편(memory Ch 5·Ch 6, pcie Ch 2)이고 유지·검증 대기·보강·제외 검토는 없다. 점수 구간으로는 10편 모두 병합 검토(40~59)인데, 오류 확인 7건 때문에 7편이 우선 조치로 올라갔다. pcie Ch 1은 시리즈 첫 글이라 허브 규칙상 보강으로 대체될 구간이지만 오류 확인이 우선한다. 오류 확인 7건 중 1차 자료를 직접 열어 확인한 것이 3건(memory Ch 7 커널 DAMON usage·design 문서, pcie Ch 3 upstream `pci_regs.h`, pcie Ch 7 `pci_regs.h` 벤더 사본)이고, 원문 내부 모순·산술이 4건(pcie Ch 1·4·5·6)이다. '검증됨'은 memory Ch 6 1편(4a033a72, 커널·ndctl 소스 대조)뿐이다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목·본문 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·sitemap은 보지 않았다. CXL 장 묶음(0ec69ea9 stub → 23ed6256 일괄 확장)과 PCIe 시리즈 공통 H2 뼈대는 글 단위 P0가 아니라 시리즈 단위 scaled content 점검 대상으로 넘겼다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `memory/chapter05-prod-leak-diagnosis.md` | 55 | 55 | 0 | 없음 |
| `memory/chapter06-cxl-memory-diagnostics.md` | 42 | 41 | -1 | 없음 |
| `memory/chapter07-tiered-memory-diagnostics.md` | 58 | 57 | -1 | 없음 |
| `pcie/chapter01-fundamentals.md` | 47 | 47 | 0 | 없음 |
| `pcie/chapter02-tlp.md` | 53 | 53 | 0 | 없음 |
| `pcie/chapter03-config-space.md` | 42 | 42 | 0 | 없음 |
| `pcie/chapter04-bar-mmio.md` | 48 | 48 | 0 | 없음 |
| `pcie/chapter05-interrupts.md` | 42 | 42 | 0 | 없음 |
| `pcie/chapter06-power-management.md` | 46 | 46 | 0 | 없음 |
| `pcie/chapter07-error-handling.md` | 47 | 46 | -1 | 없음 |

- 추가한 오류 확인(memory Ch 7): 174행 `echo 100 > quotas/sz_permil  # 0.1% 메모리만 migrate`(172행 '시간당 migration 횟수 제한')를 docs.kernel.org/admin-guide/mm/damon/usage.html과 대조했다. `quotas/` 바로 아래 파일은 ms·bytes·reset_interval_ms·effective_bytes 등이고 sz_permil은 `quotas/weights/` 아래 우선순위 가중치(per-thousand)라 경로·용도가 틀렸고, 100‰는 10%라 주석 0.1%와도 맞지 않는다. 보조로 71행 '10초 동안 1번 이하 access'는 38행 aggr_us=200000(200ms)과 맞지 않는다(design 문서상 nr_accesses는 aggregation interval마다 초기화). 미검증 → 오류 확인, 병합 검토 → 우선 조치, C 7→6, 합계 58→57.
- 추가한 오류 확인(pcie Ch 5): 40행은 Multiple Message Capable을 '지원 가능 vector 수(1·2·4·8·16·32)'로 정의하고 42행에 Per-vector Masking을 별도 행으로 두는데, 151행은 같은 필드가 per-vector mask 지원 여부를 표시한다고 쓴다. 원문 내부 모순이다. 미검증 → 오류 확인, 병합 검토 → 우선 조치. 점수는 그대로다.
- 추가한 오류 확인(pcie Ch 7): 평가자가 기억으로 uncertainties에 둔 Replay 분류를 Linux uapi `pci_regs.h` 사본 773~778행으로 확인했다. REPLAY_NUM Rollover(0x100)와 Replay Timer Timeout(0x1000)은 Correctable Error Status 비트인데 138·139·165~167행은 UE/ERR_NONFATAL이라고 쓴다. 미검증 → 오류 확인, 병합 검토 → 우선 조치, A 10→9(틀린 '실수' 항목을 고유 가치에서 뺌), 합계 47→46.
- 기각한 오류 확인: 없음.
- memory Ch 6 B 8→7: 출력 예·위험 값 기준·추적 방법이 모든 절에서 빠졌고 제목의 '추적'을 본문이 하지 않는다. 합계 42→41, 판정 병합 검토 그대로.
- pcie Ch 3: 오류 확인 판정은 평가자와 같고, `pci_regs.h`(2026-10-12 내려받음)로 7개 Extended Cap ID 오류(128·129·130·136·137·138·139행, 147행)를 헤더 행 번호로 다시 확인했다.
- memory Ch 5: 52행 RssAnon과 65~66행 anon Private_Dirty 수치 충돌은 같은 시점이라는 진술이 없고 커널 집계 의미가 필요해 오류 확인으로 올리지 않고 uncertainties에 두었다.
- 줄 번호 보정(점수 영향 없음): memory Ch 5 D(chapter01 84~90행, chapter03 122~123행, chapter02 141행, python ch05 72~79행), memory Ch 6 D(ED ch09 겹침 행, perf-eng part5-11 105·109·112행 추가), memory Ch 7 D(part5-11 77~80·138행, bootloader ch36 139~147행), pcie Ch 1 D(ch09 105~111행, ch08 110~118행, ch17 22~29행).
- D·F 근거 보강(점수 영향 없음): pcie Ch 2에 cxl/chapter09-flit-format.md 29행, pcie Ch 6에 bsp/chapter13-power-management.md 24·68~70행과 npu-drivers/chapter09-runtime-pm.md 13행, pcie Ch 6 F에 Ch 3·Ch 9·BSP Ch 2 대상 행을 더했다.
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `memory/chapter05-prod-leak-diagnosis.md` — 55점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(2907896a 최초 작성, c99833a1 callout 변환, 09a00a29·400892d7 대량 정리·linter, ac24bb76 제목 변경, be973200 topic 메타, 8cf32ed2 앵커 수정, 0a9dd7bc slug 고정)에 cgroup-v2 문서·jemalloc·BCC 같은 1차 자료와 대조한 커밋이 없다. 52행 RssAnon 5000000 kB와 65~66행 anon 매핑 Private_Dirty 6000000·2000000 KB는 함께 성립하기 어려워 보이지만, 두 출력이 같은 시점이라는 진술이 없고 집계 관계는 커널 의미를 알아야 판단할 수 있어 uncertainties에 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 이 글만의 것: 확인→영역→콜스택→수정 검증 4단계(19·48·74·163행), PSS 추세 네 가지 판정(33~36행), polyfit slope 회귀 판정(170~176행), RSS 50% 급증 시 자동 dump(267~279행), 개발·스테이징·운영·비상별 도구 선택(355~359행). 반면 옵션 A~D(76~161행)와 Java/Python/Go 절(298~343행)은 도구마다 명령 하나와 한두 줄뿐이고, 86행 '< 5%', 144행 '2-3x', 175행 문턱 1024는 근거가 없다. 13~19 구간 하단. |
| B | 12 | 누수 확인부터 수정 검증, cgroup 보호, OOM 회피까지 흐름은 끝까지 간다(19~368행). 169행 monitor_pss.sh가 정의되지 않아 174행 slope 단위(KB/sec)를 정할 수 없고 1단계 루프(25~29행)는 60초 간격이다. 233행 ru_maxrss 의미 설명이 없고, 288행 /metrics 예제는 C 블록 안에 람다 문법을 쓰며, 139행 heaptrack_gui와 142행 heaptrack-gui 표기가 다르다. AP-C-24상 B ≤ 13. |
| C | 7 | /proc 폴링(25~29행), smaps awk(60~64행), MALLOC_CONF·LD_PRELOAD(82~83행), jeprof --base(110~111행), cgroup v2 생성(197~199행), PSI 트리거(256~257행)는 따라 할 수 있고 257행 문자열 길이 19, 210행 = 213~214행 합은 맞는다. 커널·jemalloc·BCC·heaptrack 버전과 배포판이 없고 출력 예(52~54·65~66·121~126·210~217행)가 측정 결과인지 알 수 없다. 86·144·175행 출처 없는 수치로 C ≤ 8. |
| D | 10 | 같은 시리즈: 23~30행 PSS 폴링 ↔ chapter01-memory-accounting.md 84~90행, 60~64행 Private_Dirty awk ↔ chapter01 156~161행, 50~57행 ↔ chapter01 165~170행, 82·95·110~111행 ↔ chapter03-jemalloc-tcmalloc.md 73~80·138·122~123행, 136행 ↔ chapter02-heaptrack.md 141행. 다른 시리즈: 119행 memleak ↔ kernel/chapter04-ebpf-kernel.md 269행, 317~327행 tracemalloc ↔ python/chapter05-faulthandler-tracemalloc.md 72~79행. cgroup memory.max·PSI(181~261행)는 `src/content/blog` 전체에서 이 글에만 있다. Ch 6·Ch 7과는 주제가 다르다. |
| E | 7 | 제목 'long-running 프로세스의 진단 전략'과 description의 /proc 모니터링·cgroup memory.max·OOM 회피를 19~70·181~220·222~261행이 다룬다. attach 부하·재시작 비용으로 도구를 고르는 기준은 355~359행 한 줄씩뿐이고 Java/Python/Go 절(298~343행)은 범위 밖으로 넓어진다. |
| F | 4 | 13행 '이 시리즈의 마지막 장', 347행 '5장으로 메모리 진단 전체'는 틀렸다. 같은 디렉터리에 seriesOrder 6 chapter06-cxl-memory-diagnostics.md, 7 chapter07-tiered-memory-diagnostics.md가 공개돼 있다. 다음 편 안내가 없고 시리즈 종료로 잘못 안내해 F ≤ 5. 372~375행 Ch 1~4 라벨, 116행 kernel ch04 앵커(238행), 330·379~381행 대상은 맞지만 379~381행 내부 글을 '외부 자료' 아래 두었다. |
| G | 2 | 382~385행 cgroup-v2·PSI 문서, systemd-oomd man, Brendan Gregg 링크는 글 끝 목록뿐이고 202~205행 memory.* 정의나 251~253행 PSI 설명과 연결되지 않는다. 버전 표기가 없고 86·144행 수치에 출처가 없다. |

uncertainties:
- 52행 RssAnon 5000000 kB인데 65~66행 anon(rw-p) 매핑 Private_Dirty가 6000000·2000000 KB다. 57·72행이 이 영역을 RssAnon 쪽 누수로 설명하므로 같은 시점이면 함께 성립하기 어렵다. 시점 진술이 없고 proc.rst로 확인하지 않았다. 66행 주소 '7f789abcdef00'은 13자리다.
- 204행 'memory.low — OOM 시 마지막'은 cgroup-v2 문서상 reclaim 보호로 알려져 있다. 1차 자료 미대조.
- 261행 systemd-oomd가 memory.swap.max를 늘린다는 동작은 man 페이지로 미확인.
- 233행 ru_maxrss는 peak 값으로 알려져 있어 캐시를 비워도 줄지 않을 수 있다. getrusage(2) 미확인.
- 130행 'memleak 5초 동안의 누적 누수'는 attach 이후 미해제 할당을 보고하는 동작과 다를 수 있다. BCC 문서 미확인.
- 149~158행 drgn -p(사용자 프로세스)에 커널 helper(vmalloc_areas·for_each_slab_cache)를 쓰는 예와 161행 설명이 동작하는지 미확인.
- 174~175행 slope 'KB/sec'와 문턱 1024는 monitor_pss.sh 샘플 간격이 없어 판단 불가.
- 86행 '< 5%', 144행 '2-3x', 131행 'eBPF verifier 통과라 부담 적음'은 출처 없는 주장이다.
- 220행 K8s resources.limits.memory → memory.max 매핑은 kubelet 문서 미확인.

병합 대상: 병합 대상 없음. chapter01-memory-accounting.md(23~30·50~64행 해당)·chapter03-jemalloc-tcmalloc.md(82·95·110~111행 해당)와는 일부만 겹치고, cgroup memory.max·PSI·자동 dump(181~282행)는 다른 공개 글에 없는 독립 검색 의도라 다음 조치는 보강이다. 앞 장 명령은 링크로 줄이고, 13·345~353행 시리즈 종료 문구를 고쳐 Ch 6 다음 편 안내를 넣는다. 86·144·175행 수치는 1차 자료로 확인하거나 지우고, 204·261행을 cgroup-v2·oomd 문서와 대조한다. 169행 monitor_pss.sh를 정의해 slope 단위를 맞추고 52행과 65~66행 예시 수치를 서로 맞춘다.

### `memory/chapter06-cxl-memory-diagnostics.md` — 41점, 병합 검토

confidence: 중간

factcheck: 검증됨. 4a033a72가 cxl-cli 플래그(-H, -L, cxl monitor), mailbox opcode(0x4200, 0x4300, 0x4400=Sanitize), Event Log 네 종류, numa_balancing=2·demotion_enabled를 torvalds/linux `drivers/cxl/cxlmem.h`, `drivers/cxl/core/trace.h`, `Documentation/admin-guide/sysctl/kernel.rst`, `include/linux/sched/sysctl.h`, `Documentation/ABI/testing/sysfs-kernel-mm-numa`(@ master)와 pmem/ndctl `cxl/cxl.c`, `Documentation/cxl/cxl-list.txt`, `cxl-monitor.txt`(@ main)에 대조해 고치고 지어낸 출력·근거 없는 행을 지웠다. DAMON 절(68~80행), numastat 해석(35행), dmesg 패턴(102행)은 대조 목록에 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 이 글만의 것은 21행 '프로세스 관점 vs 디바이스 관점' 구분과 84~91행 용량·tiering 함정 표(create-region 누락, daxctl system-ram 누락, numa_balancing=2, demotion_enabled) 정도다. 37~66행은 53행이 스스로 'Embedded Debugging Ch 9에 있다'고 넘기는 요약이다. 35행 '원하지 않은 placement', 80행 'DDR보다 낮으면 의도대로'는 수치·근거 없는 판단 문장이다. |
| B | 7 | 절마다 명령 2~4줄과 한두 문장이다. numastat(27~33행)·cxl list(39~51행)·damo(72~78행)에 출력 예가 없고, 53행은 health 필드 이름만 나열하며 위험 값 기준이 없다. 110행 '세 지표 장기 추적'은 방법·임계가 없고 74행은 '(kdamond 설정 뒤)'로 앞 단계를 생략했다. 제목의 '추적'을 본문 어디서도 하지 않는다. 16·80·102행 정확성 불확실로 B ≤ 13. |
| C | 5 | 실제 명령(29·32·41·44·47·50·74·77·102행)과 sysfs/procfs 경로(74·90·91행)는 있으나 커널·ndctl 버전, 실제 CXL 디바이스인지 QEMU인지, 예상 출력이 없다. 80행 판단 기준은 측정 없이 문장만 있다. 합격·실패가 갈리는 관찰이 없어 AP-C-24상 C ≥ 10 불가. |
| D | 5 | 비교한 글: 같은 시리즈 chapter05-prod-leak-diagnosis.md, chapter07-tiered-memory-diagnostics.md, 다른 시리즈 tools/debugging/embedded/chapter09-cxl-device-troubleshoot.md, performance-engineering/part5-11-cxl-profiling-tools.md·part3-12-cxl-mem-latency.md, hbm/chapter09-cxl-mem.md. 겹침: 39~53행 ↔ ED ch09 34~83행(같은 명령·opcode, ED 쪽에 출력 예까지 있음), 57~66행 Event Log 표 ↔ ED ch09 19~30행, 97~102행 워크플로 ↔ ED ch09 159~164행, 110행 ↔ ED ch09 172행 같은 문장, 74행 ↔ ch07 43행, 77행 ↔ part3-12 85행, 16·29·32행 ↔ part5-11 105·109·112행. 구별되는 것은 86~91행 함정 표와 84·93행 역할 분담뿐이다. |
| E | 5 | 제목 키워드 RAS·Poison List·Media Error는 44·47행 명령 두 줄과 53행 필드 나열 수준이고 '추적'은 ED ch09로 넘긴다(53·93행). 제목 부제가 ED ch09 제목과 같아 이 글 고유 질문(84행 '메모리로서의 CXL')이 드러나지 않는다. description의 'NUMA node별 사용량 분석'은 27~35행에 명령만 있다. |
| F | 7 | 114행 다음 장 'Ch 7 — Tiered Memory 진단'은 seriesOrder 7 chapter07-tiered-memory-diagnostics.md 제목과 맞다. 118~121행 관련 항목 대상(memory Ch 1, hbm/chapter09-cxl-mem.md seriesOrder 9, part3-12-cxl-mem-latency.md seriesOrder 54, ED chapter09 seriesOrder 9)을 열어 라벨이 맞음을 확인했고 모두 공개다. 93행 앵커는 ED ch09 147행 H2와 맞다. 전제 지식(region·DAX) 안내가 없고 audit:reading·폰 폭 확인이 없어 9 이상 불가. |
| G | 3 | 본문 출처는 53행 ndctl `Documentation/cxl/cxl-list.txt`, 57행 `drivers/cxl/core/trace.h` 두 곳으로 주장과 연결된다. 43·46·66행 opcode, 74·90·91행 DAMON·numa_balancing·demotion_enabled는 본문 출처가 없고(커밋 본문에만 있음) 커널·ndctl 버전·대조 시점도 본문에 없다. |

uncertainties:
- 16·106행 'CXL 메모리는 별도 NUMA 노드로 등록됨'을 조건 없이 적었으나 88·89행은 create-region·daxctl system-ram 전환 전에는 용량·노드가 보이지 않는다고 한다. 최종 상태 서술과 설정 누락 증상으로 읽혀 오류 확인으로 올리지 않았다. 플랫폼(CEDT/SRAT)에 따른 노드 생성 조건은 미확인.
- 80행 'CXL 노드 access 빈도가 DDR과 비슷하면 promotion이 잘 안 되는 신호'는 출처·측정 없는 판단 기준이고 4a033a72 대조 목록에 없다.
- 74행 `/sys/kernel/mm/damon/admin/kdamonds/0/state`, 77행 `damo report access` 하위 명령 이름은 DAMON 문서·damo 저장소로 확인하지 않았다.
- 89행 'node 2'는 특정 토폴로지를 전제한 번호이며 환경 표기가 없다.
- 102행 dmesg grep 패턴의 `memory_failure` 문자열이 실제 커널 메시지에 나오는지 미확인.

병합 대상: `src/content/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot.md` 후보(디바이스 health·poison·Event Log·워크플로가 이 글의 상위 호환). 다만 a5929257 이후 '용량·tiering은 Memory Diagnostics, 디바이스 health는 Embedded Debugging'으로 역할이 나뉘어 있고(84·93행) 독립 검색 의도가 있으므로 다음 조치는 보강이다. 37~66행과 97~110행의 ED ch09 중복을 한 단락+링크로 줄이고, region→dax→system-ram 경로와 numastat로 placement 이상을 판단하는 기준을 1차 출처와 함께 채운다. 보강 뒤에도 고유 내용이 함정 표(86~91행) 수준이면 ch07 앞부분으로 병합하는 안을 다시 검토한다.

### `memory/chapter07-tiered-memory-diagnostics.md` — 57점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 1차 자료 docs.kernel.org/admin-guide/mm/damon/usage.html을 직접 열었다. 172~174행은 '시간당 migration 횟수 제한'을 위해 `echo 100 > quotas/sz_permil  # 0.1% 메모리만 migrate`라고 적는데, `schemes/<N>/quotas/` 아래 파일은 ms·bytes·reset_interval_ms·effective_bytes 등이고 sz_permil은 `quotas/weights/` 아래 우선순위 가중치(per-thousand)다. (1) 없는 경로, (2) 크기 제한이 아닌 가중치 파일, (3) 100‰=10%인데 주석은 0.1%로 세 겹으로 틀렸다. 크기 제한은 quotas/bytes로 한다. 보조: docs.kernel.org/mm/damon/design.html상 nr_accesses는 aggregation interval마다 집계·초기화되므로 38행 aggr_us=200000(200ms) 설정에서 71~73행 주석 '10초 동안 1번 이하 access'는 맞지 않는다. git log(0a9dd7bc slug 고정, be973200 topics, 23ed6256 일괄 확장·'qualify or remove suspect claims', 0ec69ea9 stub)에 1차 자료 대조 기록은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 140~203행 false promotion·demotion thrashing·promotion 실패·NUMA balancing과 DAMON 충돌을 증상→해결로 정리했고, 205~214행 워크로드별 설정 표와 243~256행 regression 해결 순서가 이 글만의 선택 기준이다. 해결책이 '임계 높임'(154행), 'cool-down 추가'(171행), '여유 확보'(188행)처럼 일반론이고 209~211행 수치는 근거가 없으며 실제 측정·실패 사례가 없다. 13~19 구간 하단. |
| B | 13 | 동작 모델(13~23행)→파라미터(25~46행)→DAMOS(48~83행)→tier 설정(85~107행)→추적(109~136행)→흔한 문제(138~203행)→워크로드 권장(205~214행)→bpftrace(216~241행)→regression(243~256행)→함정 표(258~269행)→정리(271~278행)로 흐름은 갖췄다. 커널 버전 요건(migrate_hot/cold 도입 시점), demotion_enabled 같은 전제 설정, DAMON과 numa_balancing=2의 역할 구분이 빠졌다. |
| C | 6 | sysfs 설정(37~43·64~82행), memory_tiering 확인(91~106행), perf stat(130~135행), bpftrace(221~240행)가 있으나 커널 버전·환경이 없고 출력(116~120·126~127·133·237~240행)이 실행 기록인지 예시인지 밝히지 않았다. 23행 '오버헤드 1% 이하', 209~211행, 249행 '수십 μs 정지'는 출처 없는 수치라 C ≤ 8이고, 174행 오류 명령, 189행 문서에 없는 flag `damos demote-first`, 71행과 38행 불일치를 반영해 6. |
| D | 11 | 비교한 글: 같은 시리즈 chapter06-cxl-memory-diagnostics.md, 다른 시리즈 performance-engineering/part5-11-cxl-profiling-tools.md, bootloader/chapter36-boot-memory-topology.md. 겹침: 27~32행 DAMON 파라미터 표 ↔ part5-11 77~80행, 216~241행 bpftrace ↔ part5-11 138행, 85~107행 memory_tiering ↔ bootloader ch36 139~147행. ch06 68~80행은 DAMON을 짧게 다루고 114행에서 이 글로 넘긴다. DAMOS scheme 구성(62~83행)과 문제 사례(140~203행)는 다른 글에 없다. |
| E | 7 | 제목의 DAMON·DAMOS·Promotion/Demotion과 description의 'promotion/demotion 추적, hot/cold 분류 디버깅'을 109~136·138~203·216~241행이 이행하고 'DDR + CXL.mem 계층화'도 69·95~98행과 맞다. 대상 독자·커널 버전 전제가 없다. |
| F | 6 | 이 글은 seriesOrder 7로 시리즈 마지막이고 280~282행이 Postmortem Ch 5~6(chapter05-cxl-device-postmortem.md·chapter06-cxl-fabric-postmortem.md)으로 안내하며 제목과 맞다. 286~290행 관련 항목 5개 라벨은 대상 제목·번호와 일치하고 모두 공개다. 282행 안내에 링크가 없고 Postmortem Ch 6은 관련 항목에도 없으며 전제 지식 안내가 없다. |
| G | 1 | 본문(13~290행)에 커널 문서·소스·damo 버전 같은 1차 출처가 하나도 없고 커널 버전 표기도 없다. part5-11이 `mm/damon/core.c`와 커널 DAMON 설계 문서를 적은 것과 대조된다. |

uncertainties:
- 189행 `damos demote-first` flag는 커널 usage 문서에 없다. damo 도구 옵션까지는 확인하지 않았다.
- 101행 memory_tier0/tier_id 쓰기 가능 여부 미확인.
- 104~106행 node2/demotion_target_nodes 출력 '0,1'을 'CXL → DDR로 promotion 대상'으로 해석한다. 파일 이름(demotion)과 해석(promotion)이 맞지 않아 보이고 경로 존재 여부도 미확인.
- 123~127행 trace_pipe 출력 형식과 221~226행 tracepoint `mm_migrate_pages_start`/`mm_migrate_pages_completed` 인자 미확인(part5-11 138행은 mm_migrate_pages의 reason·succeeded 사용).
- 29~32행 '기본' 값: design 문서는 aggregation 기본 100ms만 명시한다. sample 5ms·regions 10/1000은 core.c로 확인 필요.
- 23행 '오버헤드 1% 이하', 249행 '수십 μs 정지', 269행 'Migration 후 SIGBUS'는 근거가 없다.
- 52~60행 DAMOS 액션 표에 willneed·cold·hugepage·collapse가 빠졌다. 60행 nohugepage 설명은 design 문서상 대체로 맞다.
- chapter06 92행은 demotion에 demotion_enabled가 필요하다고 하나 이 글은 언급이 없다.
- 116~120·133·237~240행 출력이 실행 결과인지 예시인지 표시가 없다.

### `pcie/chapter01-fundamentals.md` — 47점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순. 71행 표는 'Lane 수 16 → x16'인데 74행은 'x16이면 32 lane × 2 pair = 64 wire'라고 적는다. 같은 74행 앞 문장 '각 lane은 … 4개의 wire'로 계산하면 64 wire는 16 lane에서만 나오고 32 lane이면 128 wire다. x16의 lane 수가 16과 32로 동시에 참일 수 없다. git 이력의 1차 자료 대조 커밋은 3da59d41 하나(130행 CXL 3.x→PCIe 6.0, CXL 3.1 spec §1.5)뿐이고 세대 표·encoding·FLIT·토폴로지 주장은 대조 기록이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | PCI 한계 표(25~30행), 3계층 표(38~42행), 토폴로지 표(50~56행), 세대 표(80~88행)는 PCIe 입문 자료의 표준 구성이다. 이 글만의 판단은 148행 bifurcation(x8+x8)을 LnkCap·LnkSta 비교로 확인하라는 것, 140행 Switch와 hub 구별, 144행 Gen 6 변화 정리인데 근거·출처가 없다. |
| B | 11 | PCI→PCIe(21~32행) → 3계층(34~44행) → 토폴로지(46~60행) → lane(62~76행) → 세대·encoding·FLIT(78~117행) → 인접 표준(119~130행) → 실수(132~152행)·정리(154~163행)로 흐름은 갖췄다. 3계층 절은 표 하나와 44행 두 문장뿐이고 74행 lane 수 모순, 90·92행 기준 차이가 열려 있어 B ≤ 13. |
| C | 4 | 명령은 60행 'lspci -t'와 148행 'lspci -vv'의 LnkCap/LnkSta 언급뿐이고 예상 출력·환경이 없다. 92행 '실측은 90~110 GB/s'는 출처·측정 환경 없는 수치라 C ≤ 8이고, 152행 양산 '2027~2028년'도 근거가 없다. |
| D | 8 | 같은 시리즈: 98~104행 encoding 표·PAM4 설명 ↔ chapter09-physical-layer.md 105~111행, 110~117행 FLIT 표 ↔ chapter08-dllp.md 110~118행(117행 문장은 ch08 130행과 같음), 90~92행 대역폭 ↔ chapter17-performance.md 22~29행. 인접 chapter02-tlp.md는 역할이 다르다. 다른 시리즈: bootloader/chapter34-pcie-enumeration.md 33~34행이 58·76행과 일부 겹치고, modern-recipes/part11-15-pcie-to-cxl.md는 CXL 중심이다. 세 절이 후속 장과 반복된다. |
| E | 7 | 제목 '계층 구조와 토폴로지'와 description의 point-to-point·3-Layer·RC/Switch/EP·Gen 1~7.0이 21·34·46·78행 절에 있다. 제목이 앞세운 '계층 구조'가 38~44행 표 하나로 짧다. |
| F | 4 | 167행 다음 편(Ch 2 TLP)은 seriesOrder 2 chapter02-tlp.md와 맞다. 171행 CXL Ch 1, 172행 HBM Ch 9, 174행 EPE Ch 29 라벨은 맞지만 173행 'Modern Embedded Recipes Ch 149'의 대상 part11-15-pcie-to-cxl.md는 seriesOrder 150이라 라벨이 틀렸다 → F ≤ 5. 17행은 시리즈를 '18편'이라 하지만 공개 글은 chapter19-advanced-features.md까지 19편이라 허브 편수 표기도 틀렸다. |
| G | 2 | 176~186행이 PCI-SIG 자료, Linux drivers/pci/, QEMU, 벤더 매뉴얼과 Base Spec 6.1(2023)·7.0(2025)을 적었지만 링크가 없고 80~88·108~115·72행 주장과 § 번호로 연결되지 않는다. 3da59d41의 §1.5 대조는 커밋 본문에만 있다. |

uncertainties:
- 90행 'Gen 1 4 GB/s → Gen 7 256 GB/s'는 단방향 값이고 92행은 '× 2 directions'와 '전이중'을 붙였다. 모순은 아니지만 기준을 글 안에서 밝히지 않았다.
- 64·72행 x32 lane: PCIe 6.0에서 x12·x32 폭이 제거되었다는 기억이 있으나 Base Spec 미확인.
- 102행 PAM4 overhead '1.5% + FEC'는 Gen 6 FLIT mode에서 128b/130b를 쓰지 않는다면 맞지 않는다. ch17 29행은 '~3%'로 다르게 적었다(다른 글과의 차이라 판정 근거 아님).
- 82~88행 세대별 발표 연도를 PCI-SIG 자료로 확인하지 않았다.
- 117·126행 'UCIe 2.0이 PCIe 6.0 FLIT 채택': UCIe 1.0부터 flit 모드를 지원했는지 미확인.
- 58행 'Bus 0:Device 0:Function 0이 RC 자체'가 플랫폼과 무관한 규칙인지 미확인.
- 104행 'noise margin 1/3', 140행 'Switch는 non-blocking이 일반적'은 출처 없는 일반화다.
- 152행 'PCIe 7.0 양산 2027~2028년'은 근거 없는 예측이고 audit:staleness 대상 미래 시제다.

### `pcie/chapter02-tlp.md` — 53점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타, bd3aed87 PCIe Ch 2-18 내용 확장 — 커밋 본문은 publish gate·astro build 통과만 언급, 400892d7 linter, 55e250f2 날짜 정규화)에 PCIe Base Spec·Linux drivers/pci와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 내부 모순도 없다: 54행 'Length 최대 1024 DW (4 KB)'와 179행 '0 → 4096 byte (1024 DW)'는 맞고, 80행 4096/256=16 산술도 맞으며, 78·104·167행 Tag 비트 수도 글 안에서 일치한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 본문 대부분이 사양 요약 표다: TLP 구조(23~27행), 5 가족(33~39행), 헤더 DW(47~52행), Posted/Non-Posted(60~64행), 라우팅(84~88행), Requester ID(96~100행), Attr(112~117행), ordering(125~129행), ECRC(139~144행), 고급 기능(150~155행). 이 글만의 해석은 read-back flush(163행), address routing과 IOMMU 구분(171행), Producer-Consumer와 RO 관계(131~133행) 정도이고 실패 사례·선택 기준은 없다. |
| B | 11 | 구조(19~29행)부터 정리(181~191행)까지 기본 흐름은 완성됐다. Completion 헤더(Completer ID·Status·Byte Count·Lower Address)를 다루지 않아 80행처럼 나뉜 응답을 어떻게 이어 붙이는지 설명이 없고, ordering 표(125~129행)는 세 줄뿐이다. 116·175·78·167행 정확성 불확실로 B ≤ 13. |
| C | 5 | lspci·setpci 명령, protocol analyzer 캡처, TLP 바이트 덤프가 하나도 없다. 예제는 split 단계 표(70~76행)와 80행 산술뿐이다. 41행 'MRd/MWr가 전체 traffic의 99%'는 출처 없는 수치라 C ≤ 8. |
| D | 12 | 비교한 글: 같은 시리즈 chapter01-fundamentals.md(40~41·167행, 겹침 없음), chapter03-config-space.md 108행(주제만 닿음), chapter07-error-handling.md 107~116행(175행과 겹침), chapter08-dllp.md 32~38행(DLL 관점), chapter11-linux-dma.md(150~157행을 넘겨받음), chapter17-performance.md 130~137·33행(114·115·80·179행과 비슷), chapter19-advanced-features.md 40~44행(78·104·167행과 겹침). 다른 시리즈: embedded-security/chapter11-pcie-cxl-ide.md 47~48행, driver-cosim/chapter06-bfm.md 202·270행(링크만), cxl/chapter09-flit-format.md 29행(역할 다름). TLP 형식 자체를 다루는 글은 이 글 하나다. |
| E | 7 | 제목(2행)과 description(5행)이 약속한 3/4 DW header(23~29·47~52행), 5 가족(31~41행), split transaction(68~80행), 라우팅 3 방식(82~90행), ordering(121~133행)마다 절이 있다. 대상 독자와 풀려는 구체 문제가 드러나지 않는다. |
| F | 7 | 17행에 전제 글(Ch 1 3-Layer Stack)을 밝혔다. 195행 다음 편은 seriesOrder 3 chapter03-config-space.md와 맞다. 199~202행 관련 항목 대상 4개(ch01, ch07 49·107행, ch08 32행, ch11)를 열어 라벨이 맞음을 확인했고 157행 본문 링크와 206행 ch01 앵커(176행)도 대상이 있다. audit:reading·폰 폭 렌더는 확인하지 않았다. |
| G | 1 | 본문 주장에 연결된 출처가 없다. 206행은 시리즈 공통 문구로 자료 이름만 대고 링크·Base Spec 판·§ 번호가 없다. 54행 Fmt/Type, 78·104·167행 Tag, 127~129행 ordering 어디에도 사양 판·절이 없다. |

uncertainties:
- 78·167행 'Extended Tag로 10-bit (1024)'와 chapter19-advanced-features.md 17·44·92행 '10-bit Tag는 768개'가 다르다. 다른 글과의 모순이라 오류 확인에 넣지 않았다. 10-bit Tag가 Extended Tag와 별개 capability인지도 미확인.
- 110~117행이 TH(TLP Hints)를 DW0 Attr 비트로 묶었다. 별개 비트인지 미확인.
- 175행 'Header corruption은 poisoned TLP 메커니즘이 다룸'은 poisoned TLP가 payload 손상 표시용인지 확인하지 않았다(chapter07 109행도 같은 서술).
- 127~129행 ordering 규칙 세 줄의 방향과 조건을 PCIe ordering 표로 확인하지 않았다.
- 41행 '99%', 36행 'I/O 현대 거의 unused', 29행 '현대 시스템은 거의 4 DW'는 출처 없는 주장이다. 29행은 4 GB 아래 주소에서 3 DW를 쓰는 규칙과 맞는지 미확인.
- 62행 Posted 예에 Msg(데이터 없는 메시지)가 빠졌다.
- 80행 Completion 16개 설명은 RCB 경계 분할 규칙을 고려하지 않았을 수 있다.
- 163행 visible 보장이 같은 경로·대상에만 해당하는지 미확인.

병합 대상: 병합 대상 없음. 시리즈에서 TLP 형식을 다루는 글은 이 글뿐이고 독립 검색 의도가 있다. chapter17-performance.md 130~137행과 chapter19-advanced-features.md 40~44행은 일부 표만 겹친다. 다음 조치는 보강이다. Completion 헤더와 ordering 표 전체를 PCIe Base Spec 판·절과 함께 채우고, lspci -vv DevCtl(MaxPayload·ExtTag·RlxdOrd·NoSnoop) 출력이나 공개된 TLP 캡처 같은 관찰을 넣는다. 41행 99% 같은 출처 없는 수치는 지우고, chapter17 136~137행과 겹치는 RO·NS 표는 한쪽을 링크로 바꾼다. 보강 전에 1차 자료 대조 커밋이 필요하다.

### `pcie/chapter03-config-space.md` — 42점, 우선 조치

confidence: 높음

factcheck: 오류 확인. Linux upstream `include/uapi/linux/pci_regs.h`(git.kernel.org torvalds/linux master, 2026-10-12 내려받음)를 직접 대조했다. 128행 VSEC 0x0009 ↔ 헤더 734행 0x09=VC9(Vendor-Specific은 736행 0x0B), 129·147행 DVSEC 0x000B ↔ 756행 0x23, 130행 ACS 0x000F ↔ 738행 0x0D(0x0F는 740행 ATS), 136행 ReBAR 0x0023 ↔ 746행 0x15, 137행 ATS 0x0026 ↔ 740행 0x0F(0x26은 759행 PL_16GT), 138행 TPH 0x0027 ↔ 748행 0x17, 139행 PASID 0x002A ↔ 752행 0x1B(0x2A는 761행 PL_32GT). 맞는 값: 125~127·131~135·140~141행 ID, 105~115행 PCIe Cap offset(헤더 483~653행), 58·68·72·73·75행 offset(122·131·158·160·164행), 143행 Extended Cap 헤더(722~724행). git log(0a9dd7bc, be973200, bd3aed87, 077d5525, 400892d7)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | 본문 대부분이 offset·ID 표(41~59·63~76·84~99·105~115·123~141·161~166행)이고 작성자 해석이 적다. 고유 관점은 15행 '명함과 다이얼' 비유와 '자주 하는 실수'(195~215행) 정도인데, 199행은 인과가 뒤섞였고 201~203행은 '0xFFFF면 device 없음'을 실수로 걸어 놓고 본문은 맞다고 한다. 207행 '거의 확실', 211행 '모두 가질 수 있음'은 기준 없는 일반론이다. |
| B | 9 | 4 KB 구분(19행) → Type 0/1(28~78행) → Capability chain(80~99행) → PCIe Cap(101~117행) → Extended Cap(119~143행) → DVSEC(145~155행) → ECAM(157~170행) → Type1→0(172~182행) → LTR(184~193행) → 실수 → 정리 흐름은 있다. chain 순회 절차는 87·143행 한 문장뿐이고, 82행 '3 byte 헤더'는 86~88행 표(8bit+8bit)와 맞지 않으며, LTR 절은 주제와 연결이 약하다. Extended Cap ID 오류가 열려 있어 B ≤ 13. |
| C | 4 | 재현 수단은 117행 lspci -vv, 170행 dmesg | grep MCFG, 215행 lspci -D 세 줄이고 환경·예상 출력이 없다. 168행 ECAM 주소식은 있으나 특정 BDF·offset 계산 예가 없다. 163행 '보통 0xE0000000 근처', 211행 'Cap 5~10개 + Extended Cap 10~20개'는 출처 없는 수치라 C ≤ 8. |
| D | 8 | 같은 시리즈 chapter18-register-maps.md와 표가 겹친다: 41~59행 ↔ ch18 19행~, 61~76행 ↔ ch18 79행~, 105~115행 ↔ ch18 100행~, 161~168행 ↔ ch18 308~322행(같은 식·같은 1 MB·256 MB). 145~155행 DVSEC은 cxl/chapter06-cxl-io.md 44행~과 주제가 겹치나 그쪽은 CXL 식별 흐름이다. 인접 chapter02-tlp.md(82행 Routing), chapter04-bar-mmio.md(60·95행)는 질문이 다르다. |
| E | 6 | 제목 '4 KB ECAM·Capability Linked List'와 description의 256 byte + 4 KB Extended·Type 0/1·Capability chain·ECAM이 19~170행 절과 대응한다. linked list를 따라가는 방법은 87·143행 한 문장뿐이고 172~193행 Type1→0·LTR은 약속 밖 내용이다. |
| F | 6 | 17·234행 Ch 2 링크는 chapter02-tlp.md와 맞다. 230행 다음 편 'Ch 4: BAR & MMIO'는 seriesOrder 4 chapter04-bar-mmio.md와 맞고 prefetchable·ReBAR는 그 글 60·95행에 있다(부제는 실제 제목과 표현만 다름). 236행 Ch 18 라벨은 맞고, 155·237행 'CXL Internals Ch 6'은 cxl/chapter06-cxl-io.md 제목과 맞으나 시리즈 이름은 'CXL 4.0 Internals'다. 241행 앵커는 chapter01 176행에 있다. 긴 표의 읽는 순서 안내가 없다. |
| G | 1 | 본문 1차 출처는 143행 'PCIe Base Spec § 7'뿐이고 판이 없다. 241행은 출처를 Ch 1 footer로 넘기고, `pci_regs.h`·lspci 버전 표기가 없다. |

uncertainties:
- 82행 capability 헤더 '3 byte'와 86~88행 표(2 byte)가 맞지 않는다. 개수 표기 실수로 보고 오류 확인 근거에서 뺐다.
- 15행이 Power Budgeting을 Capability linked list에 묶었는데 `pci_regs.h` 729행 PCI_EXT_CAP_ID_PWR 0x04로 Extended Cap이다. 두 체인을 묶어 말한 것인지 모호해 오류 확인에는 넣지 않았다.
- 121·222행 'PCIe 3.0 이상 기능은 대부분 여기에'는 AER·VC·DSN이 초기 PCIe부터 있다는 기억과 충돌한다. 1차 자료 미확인.
- 207행 'PCIe Cap이 없어도 PCIe device가 있음'은 PCI Express Capability 필수라는 기억과 충돌한다. Base Spec 확인 필요.
- 155행 'CXL 1.1+ device는 DVSEC ID = 0x0~0x10 사이 여러 entry'는 CXL 규격 미확인.
- 163행 ECAM base, 211행 Cap 개수는 출처·환경 없는 수치다.
- 180행 '범위 밖이면 bridge가 unsupported request 반환'은 조건 미확인.

참고(점수 구간 기준): 병합 대상 후보는 같은 시리즈 chapter18-register-maps.md(Type 0/1·PCIe Cap·ECAM 표 중복)다. 먼저 123~141·147행 Extended Cap ID를 `pci_regs.h` 기준으로 고친 뒤, 이 글은 개념·순회 절차 중심으로 보강하고 비트 표는 ch18로 넘기는 방향을 검토한다.

### `pcie/chapter04-bar-mmio.md` — 48점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). (1) 15행 'ReBAR는 64 GB BAR까지 협상 가능'과 102행 표 'Sizes 지원 | 1 MB ~ 8 TB'가 ReBAR 최대 크기를 서로 다르게 단정한다. (2) 102행 같은 칸 '8 TB (40-bit 표현)'는 산술이 맞지 않는다. 8 TB는 2^43 byte이고 40-bit로 표현되는 최대는 1 TB다. git log(0a9dd7bc slug 고정, be973200 topic 메타, bd3aed87 내용 확장, 400892d7 린터, 55e250f2 날짜 정규화)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | BAR type 비트 표(23~28행), probing 6단계 표(36~43행), Expansion ROM 비트 표(87~91행), SR-IOV 필드 표(113~118행)는 명세 구조 요약이다. 이 글만의 것은 GPU ReBAR 전후 비교(105행), VF BAR 산술 예(120행), 자주 하는 실수 5개(144~162행)인데 한두 문장 단정이다. 45행 0xFFF00000 → 1 MB 예는 bootloader/chapter34-pcie-enumeration.md 86행과 같다. |
| B | 10 | type → probing → 64-bit → prefetchable → enumeration → ROM → ReBAR → VF BAR → Linux 매핑 → 실수 → 정리(19~173행)로 흐름은 끝까지 간다. 절마다 표 하나와 한두 문장이고, 136~140행 코드는 pci_enable_device·pci_request_regions·오류 처리 없는 두 줄이다. 81행 resource conflict는 진단 grep만 있고 해결책이 없다. 15·102행 모순과 69·116행 의심 주장으로 B ≤ 13. |
| C | 4 | 실행 가능한 것은 81행 dmesg grep과 138~139행 pci_iomap·writel 두 줄뿐이며 REG_ENABLE·pdev 정의, 커널 버전, 대상 장치가 없다. probing(36~43행)은 절차 표만 있고 lspci -vv·sysfs resource 출력이 없다. 102·105행 수치는 출처 없는 수치라 C ≤ 8. |
| D | 9 | 같은 시리즈: chapter03-config-space.md 49~57·136행이 17·85·101행과, chapter10-linux-basics.md 98·114~115행이 126~134행과 겹치고, chapter12-virtualization-1.md 28·52행은 VF BAR stride를 이 글 참조로 요약하며, chapter18-register-maps.md 255~270행 SR-IOV 맵이 113~118행과 겹친다. 다른 시리즈: modern-recipes/part11-03-pcie-bar.md 55·87·224행 절이 32~47·124~140·142~162행과 같은 질문에 답하고, bootloader/chapter34-pcie-enumeration.md 80~86행이 39~45행과 같다. ReBAR·Expansion ROM·VF BAR(83~120행)은 이 글에만 있다. |
| E | 7 | 제목·description 키워드(Memory·I/O·64-bit·Prefetchable·size 결정·ReBAR·SR-IOV VF BAR)를 19~30·49~58·60~69·32~47·95~107·109~122행에서 다룬다. 제목의 MMIO는 124~140행 두 줄 코드 수준이다. |
| F | 7 | 17행이 Ch 3에서 이어받는 것을 밝힌다. 177행 다음 편은 seriesOrder 5 chapter05-interrupts.md와 맞다. 181~183행 관련 항목 대상 chapter03·chapter10(98행 pci_iomap)·chapter12를 열어 라벨이 맞음을 확인했고 187행 앵커는 chapter01 176행에 있다. 이탤릭 조각 남발(15·58·105행)로 읽기가 거칠다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 185~187행은 출처를 Ch 1 footer로 넘기고 101행 cap ID 0x0023, 102행 ReBAR 크기, 111행 SR-IOV ID 0x0010, 89~91행 ROM 비트가 Base Spec 판·절과 연결되지 않는다. 134행 pci_iomap에 커널 버전이 없다. |

uncertainties:
- 69행 'prefetchable만이 64-bit BAR 가능'은 26행 표와 어긋나 보이나 64-bit non-prefetchable BAR 허용 여부는 Base Spec 미확인.
- 116행 'VF Stride'는 Routing ID stride 필드일 가능성이 있다(chapter18 264행은 +0x16에 둠). SR-IOV 명세 미확인.
- 91행 Expansion ROM 'bit 1~10 reserved'가 최신 명세와 맞는지 미확인.
- 150행 'prefetchable 여부가 RC의 deeper power state 진입에 영향'은 출처 없는 주장이다.
- 105행 'ReBAR 이전 256 MB BAR', 'zero-copy direct mapping'과 107·154행 ReBAR 필수 조건은 출처 없는 단정이다.
- 102행 '40-bit 표현'이 주소 비트인지 크기 bitmask 폭인지 모호하다. 어느 해석이든 8 TB와 맞지 않지만, 정답 상한과 15행 64 GB 중 어느 쪽을 고칠지는 ReBAR ECN·Base Spec 확인 뒤 정한다.

### `pcie/chapter05-interrupts.md` — 42점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순. 40행은 MSI 표에서 'Multiple Message Capable | 지원 가능 vector 수 (1·2·4·8·16·32)'로 정의하고 42행에 'Per-vector Masking·Pending Bit | optional'을 별도 행으로 둔다. 151행은 'Multiple Message Capable가 (per-vector mask) 지원 여부 표시'라고 적는다. 1~32 vector 수를 나타내는 필드가 per-vector mask 지원 여부를 나타낸다는 설명은 40·42행 정의와 동시에 참일 수 없다. 같은 시리즈 ch18 222행 'bit 8 Per-vector Masking Capable'과도 어긋나지만 다른 글과의 모순이라 참고로만 적는다. git log(0a9dd7bc, be973200, bd3aed87, 400892d7)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | INTx 표(23~26행), MSI 필드 표(36~42행), MSI-X 표(52~57행), Table Entry(65~69행)는 표준 개념을 명사구 표로 옮긴 것이다. 이 글만의 내용은 '자주 하는 실수'(137~155행), 특히 143행 'MSI-X 16 vector인데 모든 ISR이 core 0이면 MSI보다 못함'과 133행 NVMe queue=vector=core binding인데 근거·측정 없이 결론만 있다. 28·61·133행은 수치 없는 일반론이다. |
| B | 9 | INTx(19행)→MSI(32행)→MSI-X(48행)→흐름(73행)→Remapping(88행)→Linux API(100행)→affinity(123행)→실수(135행)→정리(157행) 흐름은 있다. 113~118행 코드는 nvecs<0과 request_irq 실패를 처리하지 않고, 121행 'INTx까지 fallback'은 114행 flag와 맞지 않는다. Remapping 절(88~98행)은 짧고 79~82행 표는 APIC 전달 뒤에 IR을 둔다. 40·151행 결함으로 B ≤ 13. |
| C | 4 | 실행 가능한 것은 113~118행 driver 조각 하나이고 커널 버전·대상 디바이스·예상 결과·오류 처리가 없다. 129~131행 smp_affinity·irqbalance는 이름만 있고, lspci -vv MSI-X Enable 확인이나 /proc/interrupts 관찰 절차가 없다. 44·56·59행 값에 출처 표시가 없다. |
| D | 9 | 비교한 글: chapter18-register-maps.md 215~225행 MSI Message Control 표 ↔ 36~42행, chapter03-config-space.md 95·97행 Cap ID ↔ 34·50행, 인접 chapter04-bar-mmio.md(177행 안내뿐)·chapter06(범위 다름), modern-recipes/part11-09-pcie-streaming.md 33~35·78~79행 ↔ 21~61·113~114행(part11-09 80행에는 오류 처리도 있음), modern-recipes/part7-13-irq-affinity.md 36~40행 이후 ↔ 123~133행(이 글이 얕은 요약). hardware/nvme/chapter09-multiqueue.md도 queue-vector 주제를 다룬다(줄 단위 대조 안 함). |
| E | 6 | 제목의 네 키워드는 19·32·48·88행 절에서 다루지만 Interrupt Remapping은 92~98행 짧은 표와 두 문장뿐이다. description(5행)은 '메커니즘 3가지'라 쓰고 네 항목을 나열한다. 독자가 무엇을 판단·설정하게 되는지 분명하지 않다. |
| F | 4 | 169행 다음 편 'Ch 6: Power Management'는 seriesOrder 6 chapter06-power-management.md와 맞고, 173행 ch03·176행 ch10 라벨은 대상 내용과 맞다. 174행 'Ch 4 — MSI-X Table BAR'는 틀렸다(chapter04에는 177행 다음 편 안내 한 줄뿐). 175행 'Ch 11 — Interrupt Remapping'도 틀렸다(chapter11은 17·64·207행에서 이 글로 다시 보낸다). 라벨 오류로 F ≤ 5. 44행 별표 중첩은 렌더링이 깨질 수 있다. |
| G | 1 | 본문에 1차 출처 링크, Base Spec 절 번호, 커널 버전이 없다. 178~180행은 출처를 ch01 footer로 넘기고 2048 vector, per-vector mask 조건, IR 기본 활성, 84행 do_IRQ() 주장과 연결되는 출처가 없다. |

uncertainties:
- 114행 flag가 PCI_IRQ_MSIX | PCI_IRQ_MSI뿐인데 121행은 INTx까지 fallback한다고 쓰고 106행도 'INTx/MSI/MSI-X 자동 선택'이라 쓴다. PCI_IRQ_INTX(구 PCI_IRQ_LEGACY) flag 필요 여부는 API 의미를 알아야 판단할 수 있어 오류 확인에서 제외했다.
- 5행 description '메커니즘 3가지' 뒤에 네 항목을 나열한다(개수 표기 실수).
- 151행은 ch18 222행 'bit 8 Per-vector Masking Capable'과도 어긋난다(다른 글과의 모순).
- 44행 'Mask는 전체 또는 per-vector': MSI에 function 단위 mask가 있는지 미확인.
- 79~82행: IR은 IOMMU에서 APIC 전달 전에 일어나는 것으로 보인다. VT-d spec 미확인.
- 84행 do_IRQ()가 현재 x86 커널에 남아 있는지 미확인.
- 98·155행 '비가상화 환경에서도 IR 기본 활성'은 출처가 없다.
- 147행 'NVMe는 runtime mask/unmask로 coalescing 유사 효과'는 출처가 없다.
- 28행 'driver가 polling으로 source 식별'이 shared IRQ handler의 IRQ_NONE/IRQ_HANDLED 방식과 맞는지 미확인.
- 61·133행 'core 수 = vector 수'는 출처 없는 일반화다.

참고(점수 구간 기준): 병합 대상은 없다. 인터럽트 메커니즘을 맡은 장이라 독립 역할이 있다. 151행을 Base Spec MSI Capability와 대조해 고치고 40·42행·ch18 222행과 맞춘 뒤, 113~121행 코드와 fallback 설명을 msi-howto와 `include/linux/pci.h`로 대조하고, lspci -vv·/proc/interrupts 확인 절차와 174·175행 라벨 수정을 이어 한다. 필드 표는 ch18로, affinity 절은 part7-13으로 링크한다.

### `pcie/chapter06-power-management.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 41행은 L3를 'Off — 완전 차단, PCIe 없음'으로 정의하고 40행은 PME 가능을 L2에만 적었는데, 145행 정리는 'PME Message가 D3cold·L2/L3에서 wake-up 트리거'라고 쓴다. 76행은 PME Message를 'Device가 PME Message TLP 발송'이라고 해 PCIe TLP임을 밝혔다. PCIe가 없다고 정의한 L3에서 PCIe TLP로 wake-up을 트리거한다는 두 진술은 동시에 참일 수 없다. git log에 이 글의 주장을 1차 자료와 대조한 커밋은 없다. adb7589e는 BSP Ch 2 erratum을 pci-imx6.c와 대조하며 157행 관련 링크 문구만 고쳤고, de653395는 링크 추가 커밋이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 21~27행 D-state 표, 33~41행 L-state 표, 47~52행 ASPM 표는 사양 개요 수준이다. 이 글만의 내용은 118~136행 '자주 하는 실수'와 107~112행 sysfs 표인데 근거 없이 단정한다. 128행 '(vendor 구현)', 132행 '차단되기도'는 구체 기준 대신 완곡 표현이다. |
| B | 9 | D-state(19행)부터 정리(138행)까지 주제는 다 다룬다. 62~63행 latency 칸이 'µs'·'수백 µs'뿐이라 값이 없고, 54행 'Exit Latency로 latency budget 결정'은 판단 방법이 없다. 71~78행 PME 흐름은 링크가 L2/L3일 때 메시지를 어떻게 보내는지 빠져 41·145행과 어긋난다. B ≤ 13. |
| C | 5 | 재현 단서는 114행 `lspci -vv | grep -E "Power|ASPM"`과 110~112행 sysfs 경로뿐이고 예상 출력·커널 버전·대상 장치가 없다. 15행 '수십 mW에서 mW급', 65행 '수 mW', 92행 '수십 mW 절감'은 출처 없는 수치라 C ≤ 8이고, 120행 '차이 큼'도 측정값이 없다. |
| D | 10 | 같은 시리즈 인접 chapter05-interrupts.md·chapter07-error-handling.md는 겹치지 않는다. 겹침: chapter09-physical-layer.md 29~31·122행 ↔ 36~40·51행, chapter17-performance.md 141~150행 ASPM 표·결론 ↔ 120·124행, chapter03-config-space.md 184~192행 LTR ↔ 67행, chapter16-troubleshooting.md 124행 ↔ 112·120행. 다른 시리즈: bsp/chapter13-power-management.md 24·68~70행 ↔ 109·111행(일반 Linux PM), debugging/embedded/chapter08-cxl-link-debug.md 71행·npu-drivers/chapter09-runtime-pm.md 13행은 겹치지 않는다. D-state·PME·CLKREQ#·L1 substates는 이 글만 다룬다. |
| E | 7 | 제목 키워드 D-state·L-state·ASPM은 19~54행이, description의 L1 substates·CLKREQ·PME는 56~92행이 다룬다. 대상 독자와 해결할 구체 문제(어떤 증상에서 ASPM을 끌지)가 정의되지 않았고 15행 'BAR 대기 전력'은 뜻이 불분명하다. |
| F | 5 | 150행 다음 편(Ch 7 Error Handling)은 seriesOrder 7 chapter07-error-handling.md와 맞다. 155행 '[Ch 5: Interrupts] — PME 흐름'은 대상에 PME 언급이 169행 다음 편 안내 한 줄뿐이라 라벨이 틀렸다(F ≤ 5). 154행 Ch 3(15·133·135·184행), 156행 Ch 9(29~31·122·168행), 157행 BSP Ch 2(167~175·347행)는 맞다. |
| G | 1 | 본문에 주장과 연결된 1차 출처가 없다. 29행 PCI-PM Capability, 45행 Link Control register에 Base Spec 판·절이 없고 107~112행 sysfs·`pcie_aspm`에 커널 버전이 없다. 159~161행은 Ch 1 footer로 넘기는 공통 문구다. |

uncertainties:
- 38·62·88행 L1.1에서 CLKREQ#·RefCLK '유지'라 적었으나 L1 PM Substates ECN 기준으로 L1.1도 CLKREQ# deassert·RefCLK off가 가능하다는 기억이 있다. 1차 자료 미확인.
- 71·76행 D3cold(L2)에서 PME Message TLP를 바로 보낸다고 썼으나 WAKE#나 Beacon으로 깨운 뒤 L0에서 보낸다는 기억이 있다. Base Spec 미확인.
- 26행 'D3hot … configuration 통한 wake 가능'의 의미가 불분명하다.
- 36·37·39행 latency, 58행 '기본 활성', 15·65·92행 mW 수치는 출처 없는 수치다.
- 128행 'D3cold도 internal context 일부 유지'는 27행 '전원 완전 차단'과 긴장 관계지만 '(vendor 구현)' 단서가 있어 오류 확인으로 올리지 않았다.
- 136행 'boot 시 link instability는 ASPM과 무관' 단정의 근거가 없다.
- 15행 'BAR 대기 전력'은 오타 또는 용어 오용으로 보인다.

### `pcie/chapter07-error-handling.md` — 46점, 우선 조치

confidence: 중간

factcheck: 오류 확인. Linux uapi `pci_regs.h` 사본(`/Users/hawk/Workspaces/career_slide/sdk_new/metisx/firmware/gaia/core/ssd/pci/snps/pci_regs.h`, SPDX GPL-2.0 WITH Linux-syscall-note)을 열었다. 773~778행에서 PCI_ERR_COR_STATUS(Correctable Error Status) 아래에 PCI_ERR_COR_REP_ROLL 0x100 'REPLAY_NUM Rollover'와 PCI_ERR_COR_REP_TIMER 0x1000 'Replay Timer Timeout'이 정의돼 있다. 둘 다 Correctable Error다. 138행 'Replay 반복 실패 → Replay Number Rollover → UE 진입', 139행 'Replay timer … timeout으로 ERR_NONFATAL', 165~167행 'Replay Number Rollover면 … UE에 진입'은 이와 어긋난다. 같은 헤더 710행 PCI_EXT_CAP_ID_ERR 0x01, 737행 PCI_EXT_CAP_ID_DPC 0x1D, 755행 PCI_ERR_UNC_POISON_TLP는 41·69·35행과 맞는다. git log(de653395, 0a9dd7bc, be973200, bd3aed87, 077d5525, 400892d7, 55e250f2)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 21~25행 3단계 표, 31~35행 계층별 표, 43~51행 AER 레지스터 표, 59~63행 ERR 메시지 표, 122~127행 reset 표는 입문 목록 수준이다. 이 글만의 해석은 155행(AER는 보고만, 복구는 callback)과 159행(DPC는 격리) 구분인데, '자주 하는 실수' 중 165~167행은 `pci_regs.h`와 어긋나 가치에서 뺐다. 77·151·155행은 출처 없는 단정이다. |
| B | 9 | 목차는 갖췄지만 절마다 표 하나와 한두 문장이다. 47행 Severity 레지스터가 ERR_NONFATAL/ERR_FATAL을 정하는 경로가 없고, 88행 link_reset은 91~104행 코드에 없으며 callback 반환값·호출 순서도 없다. 133행 'replay timer 만료 시' 표에 139행 'Replay timer 없음' 행이 있어 뜻이 통하지 않고 131~141행 분류 자체가 틀렸다. B ≤ 13. |
| C | 5 | 실행 가능한 것은 53행 lspci, 129행 sysfs reset, 91~104행 pci_driver 등록 조각뿐이고 커널 버전·장치·예상 출력이 없으며 함수 본문이 없다. aer-inject 같은 오류 주입이나 dmesg AER 로그 읽기 절차도 없다. 137행 'Replay 1~3회 성공'은 출처 없는 수치라 C ≤ 8. |
| D | 10 | 비교한 글: 같은 시리즈 chapter06-power-management.md, chapter08-dllp.md, chapter14-linux-operations.md, chapter16-troubleshooting.md, chapter02-tlp.md, 다른 시리즈 cxl/chapter15-ras-performance.md, modern-recipes/part11-03-pcie-bar.md, qemu-fake-device/chapter21-aer-emulation.md(draft). 겹침: 79~105행 ↔ ch14 67~100행(ch14가 더 완전), 153~155행 ↔ ch14 178~180행, 157~159행 ↔ ch14 182~184행, 131~141행 ↔ ch08 57~65행(같은 Rollover→UE 서술), 141·149~151행 ↔ ch16 60~72행, 107~116행 ↔ ch02 175행. 에러 분류·AER 레지스터·DPC 역할은 구별된다. |
| E | 7 | 제목 키워드 Correctable(21~23행)·Uncorrectable(24~25행)·AER(39~53행)·DPC(67~77행)와 description의 계층별 처리(29~37행)·Linux 복구 callback(79~105행)을 모두 다룬다. '계층별 처리'는 표 하나와 37행 한 문장뿐이다. |
| F | 5 | 182행 다음 편은 seriesOrder 8 chapter08-dllp.md와 맞고 186~190행 관련 항목 5개와 194행 앵커(ch01 176행)도 대상과 맞다. 그러나 17행 'Ch 8 DLL에서 ECRC·LCRC·ACK/NAK가 … 보장임을 봤습니다'는 다음 편을 이미 읽은 전제로 안내하고, 182행은 같은 DLL을 다음 편에서 '본격적으로 분해'한다고 해 17행과 어긋난다. 틀린 전제 안내라 F ≤ 5. |
| G | 1 | 본문에 주장과 이어진 1차 출처가 없다. 41행 0x0001, 69행 0x001D에 spec 판·절이나 `pci_regs.h` 언급이 없고 79~105행 callback에도 커널 버전이나 `Documentation/PCI/pci-error-recovery.rst` 출처가 없다. 194행은 Ch 1 footer로 넘긴다. |

uncertainties:
- 오류 확인 근거로 쓴 `pci_regs.h`는 벤더 사본(Synopsys 경로)이다. 비트 정의는 upstream과 같다고 보지만 upstream 원본이나 PCIe Base Spec 7.8절 표로 한 번 더 대조하면 좋다.
- 109행 'Header 손상 또는 명시적 poison된 TLP': Poisoned TLP는 EP bit로 payload 오염을 표시한다는 기억이 있다(header 손상은 ECRC·Malformed TLP 쪽). ch02 175행도 같은 서술이다.
- 129행 sysfs reset이 'FLR 또는 secondary bus reset'이라는 설명이 pci_reset_function 시도 순서와 맞는지 미확인.
- 25행 'UE-F = link 자체 손상', 37행 '상위 계층은 모름', 65행 Switch forward 범위는 미확인.
- 77행 'DPC가 enterprise server·NVMe·CXL에 필수', 137행 'Replay 1~3회 성공'은 출처 없는 단정·수치다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 공통 H2 뼈대: PCIe Deep Dive는 '한 줄 요약 / 표 중심 절 / 자주 하는 실수 / 정리 / 다음 편 / 관련 항목 / 시리즈 자료 출처 안내'를 쓴다(ch02 13·159·181·193·197·204행, ch03 13·195·217·228·232·239행, ch04 13·142·164·175·179행, ch05 13·135·157·167·171·178행, ch06 13·116·138·148·152·159행, ch07 13·147·169·180·184·192행). CXL 장 묶음(0ec69ea9 stub → 23ed6256 일괄 확장)도 '자주 만나는 함정(증상|원인 표) → 진단 워크플로 → 정리 → 다음 장 예고 → 관련 항목' 뼈대를 공유한다(memory ch06 82~121행, ch07 258~290행, ED ch09 147~183행). 9절 scaled content 기록 대상이다.
- 본문 1차 출처·버전 표기 없음: PCIe 6편이 출처를 'Ch 1 footer'로 넘기고(ch02 206행, ch03 241행, ch04 185~187행, ch05 178~180행, ch06 159~161행, ch07 194행), ch01 176~186행 footer도 주장과 § 번호로 연결되지 않는다. PCIe 7편 G 1~2, memory ch07 G 1이다. memory ch06도 대조 시점·버전은 커밋 본문에만 있다.
- git 이력에 1차 자료 대조 커밋 없음: PCIe ch02~ch07은 bd3aed87 일괄 확장과 린터·메타 커밋만 있고, ch01은 3da59d41 한 줄 대조뿐이다. memory ch05·ch07도 대조 커밋이 없다(23ed6256은 완곡화·삭제만 해 174행 DAMOS 경로 오류가 남음). '검증됨'은 memory ch06 1편이다.
- 1차 자료·원문 내부로 확인된 오류: memory ch07 174·71행(DAMOS sz_permil, aggregation 구간), pcie ch01 71·74행(lane 수), ch03 128~139·147행(Extended Cap ID 7개), ch04 15·102행(ReBAR 최대 크기, 8 TB 40-bit), ch05 40·42·151행(Multiple Message Capable), ch06 41·145·76행(L3 PME), ch07 138·139·165~167행(Replay 분류). 같은 오류가 다른 글에도 있다: ch03 130행 ACS 0x000F ↔ ch18 271행, ch07 Rollover→UE ↔ ch08 65행.
- 관련 항목·다음 편·허브 안내 오류: memory ch05 13·347행(시리즈 종료로 잘못 안내, Ch 6·7 공개), pcie ch01 173행(Recipes 'Ch 149' ↔ seriesOrder 150)과 17행 '18편'(실제 19편, ch18 343·345행도 같음), ch05 174·175행(Ch 4·Ch 11 라벨), ch06 155행(Ch 5 'PME 흐름'), ch07 17행(다음 편을 '봤다'는 전제). 6편이 F ≤ 5다.
- 출처·환경 없는 수치와 예상 출력 없는 명령: memory ch05 86·144·175행, ch06 27~51·72~78행(출력 없음), ch07 23·209~211·249행, pcie ch01 92·152행, ch02 41행, ch03 163·211행, ch04 102·105행, ch06 15·65·92행, ch07 137행. 10편 모두 C ≤ 8이고 C 4~7이다.
- 시리즈 안 표·문장 반복: pcie ch01 98~104·110~117행 ↔ ch08·ch09, ch03 표 ↔ ch18, ch05 36~42행 ↔ ch18 215~225행, ch06 120·124행 ↔ ch17 141~150행, ch07 79~105·153~159행 ↔ ch14, ch02 114~115행 ↔ ch17 136~137행. memory ch05 ↔ ch01·ch03, ch06 ↔ ED ch09, ch07 ↔ perf-eng part5-11. 기준 글 하나에 두고 나머지는 링크로 바꾸는 정리 대상이다.
- 시리즈 안 수치 불일치: 10-bit Tag 개수(pcie ch02 78·167행 1024 ↔ ch19 17·44·92행 768), PAM4 overhead(ch01 102행 1.5% ↔ ch17 29행 ~3%), Per-vector Masking(ch05 151행 ↔ ch18 222행). 1차 자료로 정본을 정한다.
- 이탤릭 조각·명사형 문체: pcie ch02 29·41·54·78·90·119행, ch04 15·58·105·158행, ch05 15·44·133행(44행 별표 중첩), memory ch06 15~21·35·80·106~110행. §2 산문 점검 대상이다.

## 다음 조치

- 우선 조치(7편, 오류 확인): memory ch07 172~174행 DAMOS quota 경로·단위와 71행 주석, pcie ch01 74행 lane·wire 계산, ch03 128~139·147행 Extended Cap ID(`pci_regs.h` 기준), ch04 15·102행 ReBAR 크기, ch05 151행 Multiple Message Capable 설명, ch06 41·145행 L3 PME, ch07 138·139·165~167행 Replay 분류를 먼저 정정한다. 같은 오류가 있는 ch18 271행, ch08 65행도 함께 고치고 `data/known-falsehoods.yaml` 등재를 검토한다.
- 안내 정정: memory ch05 13·345~353행 시리즈 종료 문구와 다음 편, pcie ch01 17행 편수와 173행 Recipes 번호, ch05 174·175행, ch06 155행 라벨, ch07 17행 전제 문장을 대상 글에 맞춘다. cxl 시리즈의 Recipes 'Ch 149~151' 라벨도 함께 점검한다.
- 병합 검토(3편): memory ch05는 병합 대상 없음, 앞 장 명령을 링크로 줄이고 cgroup·PSI 절을 1차 자료와 대조해 보강한다. memory ch06은 ED ch09 중복을 줄이고 region→dax→system-ram 경로를 보강하되, 고유 내용이 함정 표 수준에 머물면 ch07 병합을 다시 검토한다. pcie ch02는 병합 대상 없음, Completion 헤더·ordering 표와 관찰 가능한 출력을 1차 출처와 함께 보강한다.
- PCIe Deep Dive 전체와 debugging 시리즈 CXL 장(23ed6256 15편)을 `/fact-check-round` 대상으로 올리고, 본문 주장마다 Base Spec 판·절 또는 커널 소스·문서 경로를 붙인다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
