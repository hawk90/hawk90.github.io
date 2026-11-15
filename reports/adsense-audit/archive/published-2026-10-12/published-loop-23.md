# 공개 글 AdSense 평가 — 루프 23

> 대상: 공개 글 10편 (Embedded Performance Engineering `seriesOrder` 54~56 3편, Embedded Security `seriesOrder` 1~7 7편)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 스물세 번째 루프다. 대상은 `src/content/blog/embedded/performance-engineering/`의 CXL 확장 3편(part3-12·part5-11·part6-05, seriesOrder 54~56, 시리즈 끝)과 `src/content/blog/embedded/embedded-security/`의 chapter01~chapter07 7편이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `performance-engineering/part3-12-cxl-mem-latency.md` | 8 | 7 | 5 | 4 | 3 | 7 | 3 | **37** | 검증됨 | 제외 검토 | 중간 | `part6-09-isr-api.md`, `part1-04-uart-hardware.md` |
| `performance-engineering/part5-11-cxl-profiling-tools.md` | 14 | 12 | 7 | 10 | 6 | 6 | 3 | **58** | 검증됨 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `performance-engineering/part6-05-case-cxl-llm-kv-cache.md` | 10 | 11 | 6 | 12 | 5 | 4 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `embedded-security/chapter01-threat-model.md` | 13 | 12 | 5 | 11 | 6 | 5 | 1 | **53** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `embedded-security/chapter02-secure-boot.md` | 12 | 12 | 6 | 8 | 7 | 5 | 1 | **51** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `embedded-security/chapter03-mcu-crypto.md` | 11 | 11 | 5 | 9 | 5 | 5 | 2 | **48** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `embedded-security/chapter04-trustzone.md` | 12 | 11 | 4 | 7 | 5 | 5 | 1 | **45** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part6-09-isr-api.md` |
| `embedded-security/chapter05-tee.md` | 14 | 13 | 8 | 12 | 6 | 5 | 2 | **60** | 미검증 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `embedded-security/chapter06-ota-update.md` | 12 | 12 | 6 | 9 | 7 | 6 | 2 | **54** | 오류 확인 | 우선 조치 | 높음 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `embedded-security/chapter07-side-channel.md` | 12 | 12 | 6 | 12 | 6 | 5 | 3 | **56** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 51.1점(10편, 합 511점), 범위 37~60점이다. 판정은 우선 조치 4편(part6-05·chapter02·chapter04·chapter06), 병합 검토 4편(part5-11·chapter01·chapter03·chapter07), 보강 1편(chapter05), 제외 검토 1편(part3-12)이고 유지·검증 대기는 없다. 오류 확인은 4건이다. 3건(part6-05·chapter02·chapter04)은 원문 내부 모순·산술 불일치이고, chapter06은 mcu-tools/mcuboot main의 `boot/bootutil/include/bootutil/image.h`를 열어 확인한 1차 자료 근거와 원문 내부 모순(203·225행)을 함께 갖는다. factcheck '검증됨'은 2편(part3-12 a10c3404, part5-11 e4415b20)이지만 둘 다 80점 미만이라 판정에 쓰이지 않았다. Embedded Security 7편은 git log에 1차 자료 대조 커밋이 없다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·sitemap은 보지 않았다. part6-05는 15행이 '일반화한 시나리오'라고 밝히면서 49~57·70~75·156~163행을 실측처럼 쓴 점을 정책 확인 필요로 적었지만 P0로 단정하지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `performance-engineering/part3-12-cxl-mem-latency.md` | 37 | 37 | 0 | 없음 |
| `performance-engineering/part5-11-cxl-profiling-tools.md` | 60 | 58 | -2 | 없음 |
| `performance-engineering/part6-05-case-cxl-llm-kv-cache.md` | 51 | 49 | -2 | 없음 |
| `embedded-security/chapter01-threat-model.md` | 53 | 53 | 0 | 없음 |
| `embedded-security/chapter02-secure-boot.md` | 51 | 51 | 0 | 없음 |
| `embedded-security/chapter03-mcu-crypto.md` | 49 | 48 | -1 | 없음 |
| `embedded-security/chapter04-trustzone.md` | 47 | 45 | -2 | 없음 |
| `embedded-security/chapter05-tee.md` | 61 | 60 | -1 | 없음 |
| `embedded-security/chapter06-ota-update.md` | 54 | 54 | 0 | 없음 |
| `embedded-security/chapter07-side-channel.md` | 56 | 56 | 0 | 없음 |

- 추가한 오류 확인: part6-05 60행 '총 462 GB / 480 GB 사용'은 53~57행 nvidia-smi 값과 맞지 않는다. 5장 합계 462,129 MiB는 약 484.6 GB이고 총량 96000 MiB × 5는 약 503 GB다. MiB를 GB로 센 산술 오류다.
- 추가한 오류 확인: chapter04 101행 그림(`public/images/blog/embedded-security/diagrams/ch04-stm32l552-memory-map.tex` 라벨: Non-secure flash 0x00000000~0x07FFFFFF)과 112~113행 코드(`SAU->RBAR = 0x08000000; // region base (non-secure flash 시작)`, limit 0x081FFFFF)는 같은 글이 밝힌 NS flash 범위가 서로 겹치지도 않는다. 이 때문에 B 12→11, C 5→4로 내렸다.
- 추가한 오류 확인: chapter06 203행 SWUpdate 'tarball-based update package'와 225행 '.swu 패키지(cpio archive + sw-description)'는 같은 패키지 형식에 대한 구체 진술 둘이다. 평가자는 불확실로 두었으나 루브릭 3-1 내부 모순에 해당한다.
- 기각한 오류 확인은 없다. chapter05 평가자의 F 근거 '본문에 링크가 하나도 없다 / 관련 항목 절이 없다'는 사실이 아니다(397~406행에 관련 항목 절과 링크 6개가 있음). 확인 범위가 1~396행이라 놓쳤다. 다만 405~406행 링크 없는 항목 때문에 F ≤ 5가 걸려 6→5.
- part5-11 C 8→7, F 7→6: 출력·기대 관찰·실행 환경이 하나도 없어 C 4~7 구간이고, 17행이 Ch 54 링크에 '그 측정에 쓴 도구들을 정리'한다고 쓰지만 part3-12는 mlc·STREAM·numactl·DAMON만 써서 링크 설명이 실제 내용과 맞지 않는다. 합계 58로 판정이 보강에서 병합 검토로 내려갔다.
- part6-05 A 12→10: 제목의 '실전 사례'를 15행이 스스로 일반화한 시나리오라고 밝히고 해결책이 개념 YAML(120~138행)이다. B 근거의 'GPU KV block과 host tiering 연결 설명 부재'는 1차 자료 없는 메커니즘 감점이라(AP-C-31) 불확실로 옮기고 내부 산술 모순으로 근거를 바꿨다(점수 11 유지).
- chapter03 D 10→9: 평가자가 비교하지 않은 chapter06-ota-update.md 37~50행(서명 알고리즘 선택표, nonce 함정)이 이 글 129~150·341행과 겹쳐 서명 알고리즘 선택을 ch02·ch03·ch06이 나눠 답한다.
- 사실 정정(점수 영향 없음): part6-05에서 평가자가 '모두 draft:false'라고 쓴 것은 부정확하다(part5-08·part3-12는 draft 필드가 없음). part3-12 series_issues의 part3-11 다음 편 안내 위치를 177행에서 173행으로 고쳤다. chapter02 356행 Ch1 라벨 불일치를 F 근거에 넣었다. chapter04 226행 'AUTOSAR Adaptive'는 저장소에 대상 글 자체가 없음을 확인했다.
- 줄 번호 보정(점수 영향 없음): part5-11 D(memory/chapter07 27~33·35~42행, memory/chapter06 68~77행), chapter01 D(chapter10 84~93·91행), chapter02 D(ch06 41~46행, bootloader chapter27 72·238~240행), chapter04 D(part2-09 60~66·73~81·168~171행, bsp ch07 357~370행), chapter05 D(bootloader chapter25 162·166~177행), chapter06 D(bootloader ch17 73~88행, buildroot ch16 31~37·196~197행, Ch2 98~106행), chapter07 D(ch03 299~321행 ↔ 이 글 167~192행).
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `performance-engineering/part3-12-cxl-mem-latency.md` — 37점, 제외 검토

confidence: 중간

factcheck: 검증됨. 커밋 a10c3404 'fix(content): Embedded Performance Engineering Ch 54 — replace estimated CXL.mem figures with measured data'가 출처 Sun et al. MICRO 2023(arXiv 2303.15375 §4), Intel Memory Latency Checker 페이지, Linux `Documentation/admin-guide/mm/damon/usage.rst`, damo USAGE.md를 적고 지연 표(40~44행), CXL-C/CXL-B 67%(46행), mlc 옵션과 MLC 3.0 메모리 전용 노드 지원(50·57~63행)을 고쳤으며 지어낸 측정값·출력을 지웠다. 279096d9 'Qualify …'는 근거에 넣지 않았다. 점수가 80 미만이라 판정에는 쓰이지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 8 | 이 글만의 내용은 46행(같은 DDR4인데 CXL-C(DDR4-3200)의 ld 지연이 CXL-B(DDR4-2400)보다 67% 김)과 96~98행 함정(PCIe 5.0 x16 원시 전송률 64 GB/s를 실효 대역폭으로 가정하지 말 것) 정도다. 핵심 표(40~44행)는 논문 수치 세 개를 옮긴 것이고 같은 표가 part3-11 104~110행에도 있다. 66·88·92행은 '직접 잰 값으로 판단', '워크로드마다 다르므로'처럼 판단을 독자에게 넘기는 일반론이다. 제목이 내건 토폴로지 비교 분석은 없다. |
| B | 7 | 도입(16~22행) → 토폴로지(24~34행) → 실측(36~46행) → mlc·STREAM·DAMON(48~88행) → 선택(90~92행) → 함정(94~102행) → 정리(104~109행) 흐름은 있다. 그러나 31·32행 사례 칸이 TBD이고 46·107행은 switch·pool 실측이 없다고 밝힌다. 34행은 단계 수·지연 증분을 제시하지 않는다. mlc(57~63행)는 출력 예와 읽는 법이 없고 DAMON(81행)은 '커널 문서 참조'로 넘긴다. 92행 토폴로지 선택은 기준 없이 '직접 재라'로 끝난다. |
| C | 5 | 명령은 있다: mlc 4종(54~63행), `numactl --membind` STREAM(71행), DAMON sysfs·damo(82·85행). 그러나 예상 출력, 합격·실패 관찰, 측정 환경이 없다. 74행은 비교 절차만 있고 81행 DAMON 설정은 생략돼 재현할 수 없다. 40~44행 수치는 출처가 있지만 이 글이 잰 값이 아니다. 실제 출력을 담은 앵커 part7-05(8)보다 낮다. |
| D | 4 | 비교한 글: 같은 시리즈 `part3-11-cxl-interconnect.md`, `part5-11-cxl-profiling-tools.md`, `part2-08-memory-bandwidth.md`, 다른 시리즈 `hardware/hbm/chapter09-cxl-mem.md`·`chapter10-cxl-mem-protocol.md`, `hardware/cxl/chapter08-cxl-mem.md`. 38~46행 Sun et al. 표·결론은 part3-11 104~112행과 거의 같고 106행은 part3-11 171행과 같다. 같은 결론이 hbm/chapter10 33·178·182행, cxl/chapter08 190행에 반복된다. 80~86행 DAMON 블록은 part5-11 60~64행과 같고 part5-11이 DAMOS까지 더 다룬다. 71행 numactl 방식은 part2-08 145행과 같다. 고유한 것은 57~63행 mlc 목록과 96~98행 함정뿐이다. |
| E | 3 | 제목(2행)은 '지연·대역폭 실측 — Direct·Switch·Pooled 토폴로지 비교'를 약속하지만 46·107행이 switch·pool 실측이 없다고 밝히고 대역폭 실측값도 없다(66·74행은 안내뿐). 지연 실측은 direct attach 3종의 논문 인용뿐이다. description(5행)은 본문에 맞게 좁혀져 있어 0~2로는 내리지 않았다. |
| F | 7 | 111행 다음 편 'Ch 55: CXL 성능 프로파일링 도구'는 seriesOrder 55 `part5-11-cxl-profiling-tools.md`와 맞다. 115행 Ch 16 → part2-08, 116행 Ch 29 → part3-11, 117행 HBM Ch 9 → hbm/chapter09-cxl-mem, 118행 HBM Ch 8 → chapter08-npu-gpu-usage(그 글 19행 H2와 맞음)를 열어 확인했다. 18행이 전제 Ch 29를 본문에서 가리킨다. 렌더·모바일 확인은 안 해 9 이상은 주지 않았다. |
| G | 3 | 핵심 수치(14·38·106행)에 Sun et al., MICRO 2023을 붙이고 38행에 플랫폼(Intel Sapphire Rapids)과 기준(DDR5-R)을 적었다. 그러나 링크·arXiv 번호가 없고 66행 'Intel MLC 문서', 81행 '커널 문서'는 이름만 있으며 커널·damo·mlc 버전도 없다. |

uncertainties:
- 42~44행 '약 2배'(CXL-B)와 '약 3배'(CXL-C)로 계산하면 C가 B보다 약 50% 길지만 46행은 67%다. 둘 다 반올림 값이라 내부 모순으로 확정하지 않았다. 논문 §4 원표로 확인해야 한다.
- 30행 'Samsung CMM-D'를 Direct Attach 대표 사례로 든 것을 제조사 자료로 확인하지 않았다.
- 32행 Multi-Host Pool을 'CXL 2.0 multi-LD / 3.0 fabric'으로 나눈 것과 MLD 설명을 CXL spec으로 확인하지 않았다.
- 85행 `damo report access` 하위 명령이 현재 damo 판에서도 같은 이름인지 확인하지 않았다.
- 71행 STREAM 예의 node 2·16 스레드는 가정한 환경인데 본문에 가정이라고 적지 않았다.
- 제외 대신 57~63행 mlc 목록과 96~98행 함정을 part3-11 또는 part5-11에 흡수하는 병합도 시리즈 차원에서 검토할 수 있다.

제외 검토 사유: 제목 약속(대역폭·switch·pool 비교)의 절반 이상이 빠졌고, 남은 본문은 part3-11·part5-11과 거의 겹친다. 남길 고유 내용(mlc 명령, PCIe 함정)은 짧다.

### `performance-engineering/part5-11-cxl-profiling-tools.md` — 58점, 병합 검토

confidence: 중간

factcheck: 검증됨. 커밋 e4415b20 'fix(content): Embedded Performance Engineering Ch 55 — fix granularity, opcodes and trace targets'가 granularity 범위(`drivers/cxl/cxl.h` granularity_to_eig), create-region 문법(ndctl cxl-create-region.txt), 명령 표(ndctl `cxl/cxl.c`), `cxl list -i`(cxl-list.txt), mailbox opcode(`cxlmem.h`), trace 대상(`core/mbox.c`, `pci.c`, `include/trace/events/migrate.h`), DAMON 기본값·튜닝(`mm/damon/core.c`, design.rst, usage.rst), numastat 정의(`admin-guide/numastat.rst`), `PERF_MEM_LVLNUM_CXL`(`tools/perf/util/mem-events.c`)을 Linux master·ndctl 문서와 대조해 고친 기록을 출처와 함께 남겼다. 35baac92는 도구 수정이라 쓰지 않았다. 점수가 80 미만이라 판정에는 쓰이지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 23~29행 표가 도구를 층(디바이스·page·CPU access·NUMA·커널)으로 나누고 33~153행 절 순서가 이를 따른다. 118·184행은 numastat.rst 정의를 CXL에 옮겨 'local 노드 numa_foreign + CXL 노드 numa_miss로 넘친 방향을 읽는다'는 해석을 붙였고, 172·176·180행은 실패 사례와 선택 기준이다. 151행 opcode와 `cxl_internal_send_cmd`/`cxl_pci_mbox_send` 구분도 구체적이다. 다만 37~48·88~98·107~116행은 기본 사용법이고 60행은 DAMON 설정을 문서로 넘겨 13~19 구간 하단이다. |
| B | 12 | 도구별 절(33~153행) → 조합 워크플로(155~166행) → 함정(168~184행) → 정리(186~192행)로 흐름은 끝까지 간다. 그러나 출력 예가 하나도 없어(e4415b20에서 지어낸 출력을 지운 뒤 대체 없음) 읽는 법이 비고, 101행 perf mem의 CXL 비중은 조건 한 문장뿐이며 159~166행 워크플로 표에 정상/이상 기준이 없다. 163·145행 불확실이 열려 있어 B ≤ 13(AP-C-24). |
| C | 7 | 출처로 확인된 명령·경로는 있다: 45행 create-region, 67~68행 DAMON scheme 경로, 126~148행 bpftrace, 75~80행 기본값 표. 그러나 관찰 결과·기대 출력이 없고(51행은 출력 형식을 ndctl 문서로 넘김), 커널·ndctl 판과 실장비/QEMU 여부가 없으며, 61행 DAMON 시작은 60행 주석대로 설정 없이는 재현되지 않는다. 관찰 출력이 있던 앵커 part7-05(8)보다 낮다. |
| D | 10 | part3-12 81~85행 DAMON 블록이 이 글 60~64행과 같고, part6-05 144행에 같은 시작 줄이 있다. `tools/debugging/memory/chapter06-cxl-memory-diagnostics.md` 25~50·68~77·95~102행(numastat, cxl list -RT, cxl monitor, DAMON, 진단 워크플로)이 이 글 39·109~112·61~64·159~166행과 상당히 겹친다. `memory/chapter07-tiered-memory-diagnostics.md` 27~33행 DAMON 파라미터 표가 75~80행과 같은 네 항목이다. `hardware/cxl/chapter15-ras-performance.md` 128~141행은 RAS 관점이라 일부만 겹친다. perf mem·perf c2c, mailbox opcode bpftrace, numa_miss/foreign 해석은 이 글에만 있다. |
| E | 6 | 제목의 cxl-cli·DAMON·perf-mem과 description의 numastat이 각각 절(33·55·84·103행)로 있다. 그러나 description의 'perf-mem로 보는 CXL 트래픽'은 101행 조건부 한 문장뿐이고 '활용'은 출력·해석 없는 명령 나열이다. |
| F | 6 | 194행 다음 편 'Ch 56'은 seriesOrder 56 `part6-05-case-cxl-llm-kv-cache.md` 제목과 맞다. 198~202행 관련 항목(part5-01=40, part5-04=43, part3-12=54, hbm/chapter09=9, memory/chapter06=6)을 열어 제목이 맞고 draft가 아님을 확인했다. 그러나 17행은 Ch 54 링크에 '그 측정에 쓴 도구들을 정리'한다고 쓰는데 part3-12는 mlc·STREAM·numactl·DAMON만 쓰고(5·48~71·108행) 이 글은 mlc·STREAM을 다루지 않는다. 링크 설명이 실제 내용과 맞지 않아 7을 주지 않는다. 194행 'Ch 8(HBM)의 LLaMA 70B'는 링크가 없다. |
| G | 3 | 51행 `drivers/cxl/cxl.h` granularity_to_eig(), 53행 ndctl `cxl/cxl.c`, 75행 `mm/damon/core.c`, 82·176행 DAMON 설계 문서, 101행 `PERF_MEM_LVLNUM_CXL`, 118행 numastat.rst, 151행 `drivers/cxl/cxlmem.h`, 172행 ndctl cxl-list처럼 주장과 묶인 1차 출처 위치가 여럿이다. 그러나 링크와 커널·ndctl 버전이 없다. 앵커 part12-10(3)과 같은 수준이다. |

uncertainties:
- 15행은 도구 4개를, 188행은 bpftrace를 더해 '5개 도구'라고 쓴다. 산문 개수 불일치라 오류 확인에 넣지 않았다.
- 163행 'perf mem record — CPU가 어느 노드 자주 접근'은 101행 설명(memory level 표시)과 달리 노드 단위 정보를 준다고 읽힌다. 1차 자료로 확인하지 않았다.
- 145행 `kprobe:cxl_event_thread`는 `drivers/cxl/pci.c`의 static 함수라 인라인되면 붙지 않을 수 있다.
- 105행 'CXL은 별도 NUMA 노드로 등록'은 daxctl system-ram 모드(48행)를 전제한 것으로 보이나 본문에 조건이 없다.
- 82·176행 DAMON 튜닝 규칙을 design.rst 원문과 직접 대조하지 않았다(e4415b20 기록에 의존). memory/chapter07 27~28행 권장값과의 차이도 정리하지 않았다.
- part6-05 171행은 'Ch 55에서 본 DAMON 출력'이라고 이 글을 가리키지만 이 글에는 DAMON 출력이 없다(e4415b20에서 삭제). 다른 글 쪽 문제라 점수에 넣지 않았다.

병합 대상: 후보는 `src/content/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics.md`(cxl list·numastat·cxl monitor·DAMON 워크플로가 이 글 159~166행과 같은 순서)다. 다만 '성능 프로파일링'이라는 독립 검색 의도가 있고 perf mem·perf c2c, mailbox opcode bpftrace, numa_miss/foreign 해석은 그 글에 없어 다음 조치는 보강이다. 각 도구의 실제 출력 예와 읽는 법(측정 환경 명시), 60행 DAMON 대상·operations 설정 단계, 워크플로 표의 정상/이상 기준을 넣고, 17행 Ch 54 설명을 실제 내용에 맞추며, 공통 DAMON 블록은 이 글로 모으고 memory/chapter06과 역할(프로파일 vs 장애 진단)을 두 글에 명시한다.

### `performance-engineering/part6-05-case-cxl-llm-kv-cache.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순·산술 불일치(1차 자료 미사용, 루브릭 3-1). (1) 5행 description 'CXL.mem 256 GB pool 추가' vs 111·113·114행 '2 TB DRAM, 카드 2장, 총 CXL.mem 4 TB'와 217행 'Astera Leo CXL.mem 4 TB 추가'. (2) 74행 batch 96의 KV cache load/swap 180 ms와 84·100행 'PCIe 64 GB/s로 수백 GB 데이터를 매 프레임 swap': 64 GB/s × 180 ms ≈ 11.5 GB라 한 프레임에 수백 GB를 옮길 수 없다. (3) 165행 '80 → 220, 275% 향상'은 2.75배, 곧 증가율 175%다. (4) 53~57행 nvidia-smi 값의 합은 462,129 MiB(약 484.6 GB)인데 60행은 '462 GB / 480 GB'로 MiB를 GB처럼 셌다. git log(0a9dd7bc slug, be973200 topic, 23ed6256 stub 채움·서버 모델 일반화)에 수치를 1차 자료와 대조한 커밋이 없다.

정책 확인 필요: 15행이 '현장 관측을 일반화한 시나리오'라고 밝히는데 49~57행 nvidia-smi 출력, 70~75행 Nsight 분해, 156~163행 '해결 후 측정' 표, 115~116행 '측정 지연·측정 대역폭'은 실측처럼 쓰였다. P0로 단정하지 않고 수정 루프에서 '측정' 표현을 지우거나 근거를 다는 항목으로 둔다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 배경→증상→진단→원인→해결→결과→재발 방지(17~194행)는 사례 글의 형식이고 186~192행 운영 지표·임계표는 이 글만의 것이다. 그러나 15행이 스스로 '일반화한 시나리오'라고 밝혀 실패 사례의 경험 가치가 없고, 핵심 해결책은 120·123행 '개념적 예시 — 실 schema는 사용 엔진의 docs 참조', 138행 'release note를 확인'으로 완곡 처리됐다. 208행 'DAMON 같은 자동 tiering이 manual placement보다 일반적으로 우수'는 근거 없는 일반론이다. |
| B | 11 | 증상(35~42행), 진단 3단계(46~85행), 메모리 분해(91~98행), 해결(104~152행), 결과(158~167행), DAMON 분포(173~180행), 재발 방지·함정·정리(184~220행)까지 흐름은 간다. 그러나 100행 '매 프레임 수백 GB swap'은 74·84행으로 계산하면 약 11.5 GB이고, 60행 GB 합계는 53~57행 MiB와 맞지 않으며, 165행 275%는 175%다. GPU KV block을 CXL 노드에 두는 방법은 122~136행 개념 YAML 하나다. B ≤ 13(AP-C-24). |
| C | 6 | 명령은 있다(49행 nvidia-smi, 65행 nsys, 144·147·150~151행 DAMON·numa_balancing·daxctl). 그러나 37~40·72~75·93~96·115~116·160~163·175~178행 수치는 출처·실측 환경이 없는 시나리오라 C ≤ 8이고, 122~136행 YAML은 실제 schema가 아니라고 스스로 밝힌다. 검증 절차가 없고 100·165행 산술 오류가 있어 상한보다 낮다. |
| D | 12 | 비교한 글: 같은 시리즈 `part5-11-cxl-profiling-tools.md`(55), `part3-12-cxl-mem-latency.md`(54), 다른 시리즈 `hbm/chapter08-npu-gpu-usage.md`, `hbm/chapter09-cxl-mem.md`. 144행 DAMON 시작 줄은 part5-11 61행과, 150~151행 daxctl은 part5-11 48행과 같다. 110~111행 Leo 2 TB는 hbm ch09 64행과, 93행 weight 140 GB는 hbm ch08 15행과 겹친다. '용량 초과 → 처리량 붕괴 → 회복' 사례로 묶는 역할은 구별되고 part5-11 194행이 이 글을 해결편으로 예고한다. |
| E | 5 | 제목의 'CXL.mem 추가로 KV cache 처리량 회복'은 104~167행이 다룬다. 그러나 5행 '256 GB pool'은 본문(114·217행 4 TB)과 다르고, '실전 사례'는 15행 '일반화한 시나리오'와 맞지 않는다. |
| F | 4 | 226~232행 관련 항목 7개와 222행 본문 링크 2개를 열어 라벨 번호·title이 맞음을 확인했다(part5-08·part3-12는 draft 필드 없음, 나머지 draft:false). 그러나 222행 '다음 편은 시리즈의 마무리 영역으로 들어갑니다'가 가리킬 글이 없다(디렉터리 최대 seriesOrder 56이 이 글). 89행 'HBM·GDDR 심화 Ch 8에서 본 LLaMA 70B 메모리 분해'는 ch08에 없는 표다(ch08 36·85행 batch 128·seq 2048 KV 86 GB vs 이 글 95행 batch 64 KV 320 GB). 틀린 안내 두 건이라 4. |
| G | 1 | 본문에 1차 출처 링크가 없다. vLLM 버전(28·120행 '계열'), DAMON sysfs 커널 버전(144행), Leo 사양(110~116행), H100 96 GB 사양(23행) 출처가 없다. 21~29행 환경 표는 '현장 일반화'(19행)라 환경 표기로 인정하지 않는다. |

uncertainties:
- 23행 'H100 96 GB SXM5' SKU가 실제로 있는지 NVIDIA 사양으로 확인하지 않았다.
- 84·100행 'PCIe 5.0 x16 양방향 64 GB/s'가 한 방향 값인지 PCIe 5.0 명세로 확인하지 않았다.
- 83행 'HBM 8 TB/s'가 5장 합계인지 장당 값인지 불명확하다.
- 147행 numa_balancing=1과 memory tiering 모드(값 2)의 차이를 커널 문서로 확인하지 않았다.
- 140~152·173~180행: DAMON·NUMA balancing은 host 메모리 페이지를 다루는데 GPU HBM 위 KV block promotion·demotion을 보여준다고 쓴 부분이 성립하는지 1차 자료로 확인하지 않았다(AP-C-31).
- 175~178행 Access %의 정의가 없다.
- 167·218행 'p99 latency 25% 증가'는 해결 전 p99가 글에 없어 계산 근거를 확인할 수 없다.
- 95행 batch 64 KV 320 GB는 sequence 길이가 없고 hbm ch08 36행과 규모가 다르다(다른 글과의 모순이라 오류 확인 아님).
- 115~116행 Leo 215 ns·56 GB/s/카드는 출처 없는 '측정' 수치다.

병합 대상: 판정은 오류 확인 때문에 우선 조치이고 점수 구간만 병합 검토다. 후보는 `part5-11-cxl-profiling-tools.md`(DAMON·daxctl 명령 중복)와 `hbm/chapter08-npu-gpu-usage.md`(LLaMA 70B 메모리 분해)지만 part5-11 194행이 이 글을 해결편으로 예고하고 '용량 초과 사례'라는 독립 검색 의도가 있어 다음 조치는 보강이다. 먼저 5행 256 GB와 본문 4 TB, 100행 '매 프레임 수백 GB', 165행 275%, 60행 MiB/GB 합계를 고친다. 그다음 95행 KV 320 GB 전제를 ch08 계산식(36행)과 맞추고 GPU KV block을 CXL 노드에 두는 경로를 vLLM·LMCache 문서와 커널 DAMON·memory tiering 문서로 확인한다. 확인 못 한 수치와 '측정' 표현은 지우거나 TBD로 둔다.

### `embedded-security/chapter01-threat-model.md` — 53점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 b43f6861(stub), 14cffad8(시리즈 10편 작성), b05e5d1d·a0f21c45·69e67197(코드블록·표·그림 변환), ac24bb76(제목), fa55144d·8bf4703f(링크), be973200·bfd34a20·0a9dd7bc(메타데이터·태그·slug)뿐이다. STRIDE·DREAD·RDP·crypto 수치를 1차 자료와 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안 모순도 찾지 못했다(176~181행 DREAD 평균 6개는 모두 0.2의 배수라 5축 정수 평균으로 가능).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | STRIDE 표(72~79행)와 DREAD 표(100~106행)는 입문 자료의 표준 내용이다. 고유한 것은 공격자 5단계를 임베디드 장비(JTAG·glitching·decap)로 나눈 목록(45~66행), BLE OTA 엔드포인트 STRIDE 표(83~92행), 자산×STRIDE×DREAD 위험 표(174~181행)다. 위험 표의 DREAD 평균은 다섯 축 점수 없이 결과만 있고 110~113행 등급 구간과 66행 '대부분의 상용 제품은 Level 3까지'는 출처 없는 일반론이다. |
| B | 12 | 도입(17~23행) → 자산(25~39행) → 공격자(41~66행) → STRIDE(68~94행) → DREAD(96~115행) → 특화 벡터(117~139행) → 자원 제약(141~160행) → 신뢰 경계(162~168행) → 위험 표(170~183행) → 실수·정리(185~202행) 흐름은 완성됐다. 제목의 DFD는 본문에 단어가 없고 166행 그림·168행 한 문단뿐이다. DREAD의 한계나 대체 방법이 없다. B ≤ 13. |
| C | 5 | 재현 절차·관찰 결과가 없다. 145~151행 'Cortex-M0+ @ 48 MHz' RSA-2048 2~3초, ECDSA P-256 200~400 ms, SHA-256 SW 1~3 MB/s는 라이브러리·옵션·측정 방법이 없어 C ≤ 8 대상이다. 176~181행 DREAD 평균도 산출 근거가 없다. 123·190행은 무엇을 어떻게 확인하는지 적지 않은 완곡 표현이다. |
| D | 11 | 비교한 글: 같은 시리즈 `chapter02-secure-boot.md`, `chapter10-sdlc.md`, 다른 시리즈 `modern-recipes/part12-12-tfm-trustzone.md`, `rtos/practical-internals/part4-11-trustzone-tfm.md`. chapter02 19행은 이 글 180행(RoT 9.0)을 받아 이어간다. 가장 크게 겹치는 곳은 chapter10 84~93행 'STRIDE 매핑 예 — OTA 컴포넌트' 표로 이 글 83~92행과 같은 자산·같은 6행 구조다(I 행: 이 글 90행 이미지 암호화 vs chapter10 91행 채널 암호화). chapter10 82행이 이 글을 재방문해 설계 산출물로 쓰므로 역할은 구별된다. part12-12는 14·282·293행에서 언급만 한다. |
| E | 6 | 제목 'STRIDE·DFD·자산 식별 흐름'(2행) 중 STRIDE(68~94행)와 자산 식별(25~39행)은 다루지만 DFD는 단어가 없고 166행 그림·168행 한 문단뿐이다. description(5행)은 96~160행과 맞는다. |
| F | 5 | 204행 다음 편 'Ch 2: Secure Boot'는 seriesOrder 2 `chapter02-secure-boot.md`와 맞고, 209~211·213행 링크(chapter03·04·07, practical-internals part4-11)와 135행 'Ch 7에서 따로'도 맞다. 그러나 212행 'CERT C — 보안 코딩 규칙'은 링크 없는 관련 항목이라 F ≤ 5다. 또 204행 '위협 모델 표의 최상위 항목인 "임의 펌웨어 실행"'은 위험 표(174~181행)에 없는 문구이고 최상위는 180행 'RoT 공개키 / OTP write가 열려 있음'이다. |
| G | 1 | 본문에 출처 링크가 없다. 70행 'STRIDE는 Microsoft가 정립'에 문서 인용이 없고, 123행 RDP Level 2·ESP32 e-fuse, 145~151행 crypto 수치에 reference manual·라이브러리 버전이 없다. 212행 CERT C도 링크·판 표기가 없다. |

uncertainties:
- 123행 'NXP의 LP55'가 실제 제품·기능 이름인지 확인하지 않았다(LPC55 debug 인증을 뜻하는지 불명).
- 155행 'ECC 키 크기 1/8'은 비교 강도에 따라 비율이 달라진다. NIST SP 800-57로 확인하지 않았다.
- 147~148행 RSA-2048 검증(2~3초)이 ECDSA P-256 검증(200~400 ms)보다 느리다는 서술은 일반적 인식과 반대로 보이나 기억 기반이라 오류 확인으로 올리지 않았다.
- 145~151행 수치 전반과 149~150행 'HW 가속 있으면 수십 MB/s'는 출처 없는 수치다.
- 21행 'STRIDE와 DREAD가 가장 널리 쓰이는 두 프레임워크', 110~113행 DREAD 등급 구간은 출처가 없다.
- 139행 'DRAM은 전원 차단 후 몇 초, 냉각 시 수십 분'의 원 논문을 확인하지 않았다.
- 123행 'Level 2는 영구적'을 STM32 계열별 reference manual로 확인하지 않았다.
- 62행 'FIB, focused ion beam'은 표기 중복이다(점수 외).

병합 대상: 병합 대상 없음. 겹치는 곳은 `chapter10-sdlc.md` 84~93행 OTA STRIDE 표지만 그 글은 SDLC 전체가 주제이고 82행에서 이 글을 재방문하므로 흡수 위치가 아니다. '임베디드 위협 모델링'이라는 독립 검색 의도가 있어 다음 조치는 보강이다(DFD 작성 절차 추가, DREAD 다섯 축 점수 공개, 145~151행 수치에 출처·환경을 달거나 삭제, STRIDE·DREAD 1차 출처 연결, 212행 링크 없는 항목 정리, 204행 문구를 180행 항목명과 맞춤, chapter10과 OTA 예제 차별화). 첫 글이지만 목차·편수를 안내하는 허브가 아니라 허브 예외는 적용하지 않았다.

### `embedded-security/chapter02-secure-boot.md` — 51점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(루브릭 3-1). 275~278행은 PCR_extend(idx, data)를 `new_value = SHA-256(old_PCR_value || SHA-256(data))`, `PCR[idx] = new_value`로, 즉 같은 레지스터의 이전 값에 누적한다고 정의한다. 그런데 282~286행 예시는 `PCR1 = H(PCR0 || kernel_hash)`, `PCR2 = H(PCR1 || rootfs_hash)`로 다른 번호 PCR의 값을 이어 쓰고, 283행 `PCR0 = H(bootloader_hash)`에는 이전 값이 없다. 정의와 예시가 동시에 참일 수 없다. git log(8bf4703f 링크 정리, 0a9dd7bc slug, bfd34a20 태그 등)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | RoT 두 형태(23~24행), hash에 서명하는 이유(81~94행), OTP에 공개키 대신 hash를 굽는 이유(110행)는 표준 설명이다. 이 글만의 판단은 157행 'RDP Level 2는 secure boot이 아니라 디버그·flash 읽기 차단'이라는 구분, 267·336행 'sec_ver은 보안 수정에만 올린다'는 fuse 수명 기준, 338행 검증 실패 정책을 미리 정하라는 지적이다. 98~104행 알고리즘 표는 수치 출처가 없고 106행 'RSA-2048은 호환성이 중요할 때만'도 근거 없는 단정이다. |
| B | 12 | RoT(17~26행) → 체인(28~77행) → 서명(79~106행) → OTP(108~120행) → STM32·NXP·ESP32(122~245행) → anti-rollback(247~267행) → measured boot(269~302행) → TF-A(304~330행) → 실수·정리(332~350행) 흐름은 완성됐다. 다만 벤더 절마다 명령 한 묶음과 두세 문장이라 HAB 검증 실패 진단은 212행 한 문장, TF-A는 325행 개발 키만 있고 ROTPK를 OTP로 옮기는 단계가 없다. 275~287행 모순으로 B ≤ 13. |
| C | 6 | HAL RDP2 코드(140~155행), CST CSF(175~210행), espsecure/espefuse(225~243행), tpm2 명령(293~300행), TF-A make(318~328행)가 있다. 그러나 보드·도구 버전·예상 출력이 없고 299행 `tpm2_create ... ...`는 생략된 조각이다. 98~104행 Cortex-M4 @100MHz 검증 시간·코드 크기는 출처·환경 없는 수치라 C ≤ 8이고 성공·실패 관찰 절차가 없다. |
| D | 8 | 같은 시리즈: chapter01 180행(RoT DREAD 9.0)을 19행이 이어받는다. chapter06 41~46행 서명 알고리즘 표가 이 글 98~104행을 다른 수치로 반복한다. 다른 시리즈: `bootloader/chapter27-chain-of-trust.md` 72행(HABv4 SRK·CSF Key·Image Key)·238~240행(SRK revocation, anti-rollback counter)이 이 글 165~171·247~251행과 거의 같다. `modern-recipes/part3-12-bootloader-chain.md` 129행 이후 Secure Boot 절이 30~53행과 겹친다. bootloader chapter23·25·16도 SRK hash·BL 단계·anti-rollback을 다룬다(표본 확인). |
| E | 7 | 제목 '부트 체인 서명 검증과 RoT 구축'과 description(5행)은 30~53행 체인, 79~120행 서명·OTP, 214~219·236~243행 fuse 굽기로 답한다. 'app까지' 검증은 51행 dm-verity 한 줄과 337행뿐이고 '분석'은 벤더 기능 소개 수준이다. |
| F | 5 | 352행 다음 편 'Ch 3: MCU 크립토 — HW accelerator'는 seriesOrder 3 `chapter03-mcu-crypto.md`와 맞고 356~361행 링크 대상 6개는 존재·공개다. 그러나 356행 라벨 'Ch 1: 임베디드 보안 개요 / 위협 모델'은 실제 제목 '임베디드 보안 위협 모델 — STRIDE·DFD·자산 식별 흐름'과 다르고, 362행 'DO-178C — 항공 SW 보증'은 링크 없는 관련 항목이라 F ≤ 5다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 339행 RFC 6979는 이름만 들었고 161행 HABv4·223행 ESP32 Secure Boot v2·289행 IMA·306행 TF-A에 공식 문서·도구 버전(CST, esptool, TF-A 릴리스)이 없다. |

uncertainties:
- 98~104행 Cortex-M4 검증 시간(RSA-2048 400~600 ms, ECDSA P-256 100~200 ms, Ed25519 80~150 ms)은 출처가 없다. chapter06 43~46행은 ~150·~80·~30 ms이고 Ed25519 키 크기도 이 글 104행 64 bytes vs ch06 46행 32B다(다른 글과의 모순).
- 100행 'RSA 검증은 빠르고 서명은 느림'은 같은 표에서 RSA-2048 검증 시간이 ECDSA보다 길게 적힌 것과 긴장 관계다.
- 110행 '공개키는 수백 바이트 또는 더 길어서'는 102·104행 64 bytes와 긴장 관계다(RSA만 뜻한 것인지 불명).
- 306행 'ATF는 4단계'인데 308~314행 표는 BL1·BL2·BL31·BL32·BL33 다섯 행이다(산문 개수 실수).
- 177행 `cst --keygen` 방식이 NXP CST 배포본(hab4_pki_tree)과 다를 수 있다.
- 223행 ESP32-C3의 ECDSA P-256 Secure Boot v2 지원 여부를 ESP-IDF 문서로 확인하지 않았다.
- 157행 'STM32H7의 RSS', 131행 RDP Level 1 'SRAM은 읽힘'을 reference manual로 확인하지 않았다.
- 218행 `fuse prog -y 0 6 0x2` 위치가 i.MX7·8에서도 같은지 확인하지 않았다.
- 101행 'NIST 2030년 이후 권장', 103행 'CNSA 권장' 근거를 확인하지 않았다.
- 280행 'PCR은 증가만 가능'은 extend를 '증가'로 표현해 부정확할 수 있다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준 후보는 `src/content/blog/embedded/bootloader/chapter27-chain-of-trust.md`(HABv4 키 계층·revocation·anti-rollback)와 `embedded-security/chapter06-ota-update.md`(서명 알고리즘 표)지만 Ch1 위협 모델의 최상위 위험(RoT)을 받는 글이라 독립 검색 의도가 있다. 먼저 275~287행 PCR 정의·예시를 TCG PC Client Platform Firmware Profile, TPM 2.0 Library Part 1로 고치고, 이후 보강한다. 체인·HAB·TF-A 상세는 bootloader 시리즈로 링크하고 이 글은 방어 선택 기준(RDP vs secure boot, 알고리즘 선택, 실패 정책)에 집중한다.

### `embedded-security/chapter03-mcu-crypto.md` — 48점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 14cffad8(작성), 69e67197(AES 라운드 표 변환), ac24bb76(제목), 400892d7·55e250f2(날짜·린터), fa55144d·8bf4703f(링크), 0a9dd7bc(slug), be973200(topics), 35baac92(em-dash)와 stub·발행 커밋뿐이다. 1차 자료 대조 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안 모순도 찾지 못했다(217·353행 '10~100배'와 239행에서 나오는 6~20배는 일반 범위 대 한 칩 예라 uncertainties에 둠).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | AES 표(27~31행), 모드 표(35~42행), SHA-2 표(78~85행), HMAC(120행), 곡선 표(142~148행)는 입문서 수준이다. 고유한 것은 'SHA-256이 Cortex-M에 맞는 이유'(87행), Ed25519 추천(150행), counter 8바이트+boot id 4바이트 nonce(340행), `MBEDTLS_AES_ALT`를 안 켜 HW가 노는 함정(339행), tinycrypt·mbedTLS·wolfSSL 선택 기준(329~335행)이다. 선택 기준의 근거가 없고 '가속기 분석'은 칩별 HAL 호출(219~284행)에 그친다. |
| B | 11 | 문제 제기(17~21행) → 알고리즘 → 가속기(215~284행) → KCAPI/PSA(286~298행) → constant-time(300~323행) → SW fallback(325~335행) → 실수·정리(337~356행)로 흐름은 끝난다. 그러나 21·355행이 내건 masking은 본문에 없고, 339행은 alt driver 연결 방법이 없으며, ECC 가속은 258행 한 문장뿐이다. B ≤ 13. |
| C | 5 | mbedTLS GCM(46~70행), SHA-256(101~113행), libsodium Ed25519(152~172행), CTR-DRBG(193~211행), STM32 CRYP DMA(223~237행), NXP DCP(245~256행), PSA AEAD(264~284행) 코드는 있지만 버전·보드·예상 출력이 없고 106~108행 `flash_size`·`CHUNK`·`buf`, 201행 `board_trng_get`은 정의되지 않았다. 134~136·239·331~333행은 출처·환경 없는 수치라 C ≤ 8이고 가속 전후 처리량을 재는 절차도 없다. |
| D | 9 | 같은 시리즈: chapter02 100~106·339행과 chapter06 37~50행이 이 글 127~150·341행과 같은 서명 알고리즘 선택·nonce 함정을 다뤄 세 글이 나눠 답한다. chapter07 173~190행 memcmp_unsafe/memcmp_ct와 192행 T-table cache timing이 이 글 304~321·344·323행과 거의 같다. chapter04는 역할이 다르다. 다른 시리즈: `rtos/practical-internals/part4-11-trustzone-tfm.md` 192~199행 PSA AEAD가 276~283행과 같은 흐름이고 `modern-recipes/part12-12-tfm-trustzone.md` 80~97·282행은 일부만 겹친다. |
| E | 5 | 제목 'MCU Crypto HW Accelerator 분석 — AES·SHA·ECC 가속기'인데 23~213행이 알고리즘·모드 입문이고 가속기 절(215~284행)은 HAL 호출과 239행 처리량 한 줄뿐이다. ECC 가속기는 258행 한 문장, SHA 가속은 221·243행 지원 목록뿐이다. '분석' 약속 + 개념 소개라 3~5. |
| F | 5 | 358행 다음 편 'Ch 4: TrustZone'은 seriesOrder 4 `chapter04-trustzone.md`와 맞고 362~365행 링크(ch02·04·05·07)의 라벨도 맞다. 그러나 366~367행 'CERT C', 'MISRA C'는 링크 없는 관련 항목이고 automotive/cert-c·misra-c는 모두 draft라 공개 대상이 없다. F ≤ 5. |
| G | 2 | RFC 3610(41행), RFC 8032(150행), NIST SP 800-90A(191행), SP 800-90B(213·343행), RFC 6979(341행)를 주장과 연결해 이름으로 대지만 링크·판이 없다. mbedTLS는 '3.x'(298행)만 있고 libsodium·HAL·SDK 버전이 없다. |

uncertainties:
- 134~136행 RSA-2048 검증 '약 80 ms'가 chapter02 100행 '약 400~600 ms', chapter06 43·45행 RSA-2048 ~150 ms·ECDSA P-256 ~80 ms와 서로 다르다(다른 글과의 모순).
- 217·353행 '10~100배'와 15행 '수십 배'에 비해 239행 수치로 계산되는 배율은 6~20배다.
- 239행 STM32H7 CRYP 60~100 MB/s, SW 5~10 MB/s는 출처가 없다.
- 221행 STM32H7 CRYP·HASH 지원 범위를 RM으로 확인하지 않았다.
- 241~258행 절 제목은 'i.MX RT의 CAAM / DCP'인데 본문은 CAAM을 i.MX 8로 설명한다.
- 235행 `HAL_CRYP_Encrypt_DMA` Size 단위와 229·231행 타입이 H7 HAL과 맞는지 확인하지 않았다.
- 191행 'SP 800-90A의 DRBG로 whitening'은 conditioning이 SP 800-90B 범위라 용어 정확성을 확인하지 않았다.
- 72행 'GCM nonce 재사용 시 인증 키가 즉시 복원'을 SP 800-38D로 확인하지 않았다.
- 331~333행 footprint와 332행 wolfSSL 라이선스 표기를 확인하지 않았다.
- 85행 SHA-3 출력에 224가 빠졌다(점수 외).

병합 대상: 병합 대상 없음. ECC 선택(127~150행)은 chapter02 100~106행·chapter06 37~50행과, constant-time 절(300~323행)은 chapter07 173~192행과 겹쳐 링크로 대신할 수 있지만 칩별 가속기·SW 라이브러리 선택이라는 핵심 질문은 다른 글에 없다. 다음 조치는 보강이다(ECC·SHA 가속 코드, `MBEDTLS_AES_ALT`·PSA driver 연결, 가속 전후 처리량 측정 절차를 채우고 134~136·239·331~333행 수치는 1차 자료로 확인하거나 TBD).

### `embedded-security/chapter04-trustzone.md` — 45점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건(루브릭 3-1). (1) 83행 'BL31의 SMC 디스패치는 함수 ID 범위로 라우팅됩니다' 뒤 88행은 `0x82000000 ~ 0x8200FFFF`를 SiP Service로, 89행은 `0x82000000 ~ 0xC1FFFFFF`를 OEM Service로 적어 같은 ID 0x82000000이 두 서비스로 동시에 라우팅된다. (2) 101행 그림(`public/images/blog/embedded-security/diagrams/ch04-stm32l552-memory-map.tex` 라벨)은 Non-secure flash를 0x00000000~0x07FFFFFF로 그리는데 112행 `SAU->RBAR = 0x08000000; // region base (non-secure flash 시작)`, 113행 limit 0x081FFFFF는 그 범위와 겹치지도 않는다(SRAM 116~117행은 그림과 일치). git log(14cffad8 작성, fa55144d 링크 STRIP, 2343c401 태그, be973200 topic, 0a9dd7bc slug)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 관점은 Cortex-A(OS 단위)와 Cortex-M(application 단위) 분리를 한 글에서 대비한 23·97~99행과 MCU 벤더별 분리 컨트롤러 표(160~165행)다. NS bit 표(29~32행), EL(42행), BL31 역할(77~81행), SAU·NSC·CMSE(107~154행), PSA 표(187~192행)는 표준 내용이다. 34행 '읽히지 않거나, 0xDEADBEEF 같은 더미를 반환하거나, fault'는 가능성 나열로 구체 동작을 대신한다. |
| B | 11 | 왜 필요한가(17~23행) → NS bit(25~34행) → Cortex-A(36~93행) → TrustZone-M(95~154행) → MCU 컨트롤러(156~177행) → PSA(179~194행) → 실수·정리(196~215행) 흐름은 완성됐다. 그러나 88·89행과 112~113행 vs 101행이 각각 자기모순이고, 122행은 NSC를 유일한 게이트라 하고 141행은 링커가 entry를 NSC region에 둔다고 하지만 109~120행 SAU 설정에는 NSC region이 없다(113행 'NSC=0'). 모순 두 건으로 11. |
| C | 4 | SAU 코드(109~120행), CMSE entry·nonsecure_call(124~152행), GTZC(169~175행)가 있다. 그러나 보드·컴파일러 옵션(-mcmse)·TF-A/TF-M 버전·실행 결과·기대 관찰이 없다. 112~113행 flash 범위가 101행 그림과 맞지 않아 그대로 따라 할 수 없고 167행부터 STM32U5로 대상이 바뀐다. 107행 '8개의 region', 170행 'block당 256B'는 출처 없는 수치라 C ≤ 8이 먼저 걸린다. |
| D | 7 | 같은 시리즈 chapter03(가속기)·chapter05(OP-TEE·CCA)와는 역할이 갈린다. 다른 시리즈: `rtos/practical-internals/part4-11-trustzone-tfm.md` 48~83행 SAU·IDAU ↔ 105~120행, 107~117행 `secure_aes_encrypt`+`cmse_check_address_range` ↔ 129~138행(같은 함수 이름), 143~150행 ↔ 199행, 175행 이후 PSA ↔ 179~194행. `modern-recipes/part2-09-trustzone-m.md` 60~66·73~81·168~171행 ↔ 109~141·198행. `bsp/chapter07-tfa-trustzone.md` 241·308행 이후, 357~370행 ↔ 44~54·62·83~91행. `bootloader/chapter25-tfa-optee.md` 102행 이후 ↔ 42~54·71~81행. 두 절반이 각각 더 깊은 글과 반복된다. |
| E | 5 | 제목의 Cortex-A(36~93행)·Cortex-M(95~194행) 두 범위는 다루지만 '분석'을 약속하고 본문은 메커니즘 소개 수준이며 측정·실패 분석이 없다. description(5행) 'SMC, NSC.'는 키워드 나열이다. |
| F | 5 | 217행 다음 편 'Ch 5: TEE — OP-TEE / ARM CCA'는 seriesOrder 5 `chapter05-tee.md`와 맞고 221~225행 대상 5개의 라벨·제목이 맞다. 그러나 226행 'AUTOSAR Adaptive — 차량 보안'은 링크가 없고 저장소에 해당 글 자체가 없다(automotive/ 아래는 autosar-cpp·cert-c·misra-c뿐). F ≤ 5. 전제 지식 안내는 없다. |
| G | 1 | 본문에 1차 출처 링크가 없다. 85~91행 SMC ID 표에 SMCCC 문서 판, 107~154행에 Armv8-M ARM·CMSE 문서, 167~175행에 STM32U5 RM, 77~81행에 TF-A 버전이 없다. |

uncertainties:
- 87행 PSCI 대역, 90행 0xC2000000~를 'Standard Secure Service'로 적었으나 bsp ch07 364~370행은 0xC2000000 계열을 i.MX SiP ID로 쓴다(다른 글과의 모순). SMCCC 원문으로 확인하지 않았다.
- 48행 SMC function ID 0x32000001을 'TEE call' 예로 든 것이 SMCCC 비트 구성상 맞는지 확인하지 않았다.
- 67행 'TTBR0_EL1_S vs TTBR0_EL1_NS'처럼 세계별 레지스터가 따로 있는지 Arm ARM으로 확인하지 않았다.
- 31행 Secure 상태에서 NS region 접근을 '정책에 따라 차단', 34행 '0xDEADBEEF 같은 더미'의 출처가 없다.
- 107행 'SAU는 8개의 region'은 구현 정의 값일 수 있다.
- 101행 그림 주소 자체가 STM32L552 RM(RM0438)과 맞는지 확인하지 않았다(그림과 코드 중 어느 쪽이 맞는지는 RM으로 정한다).
- 170행 GTZC MPCBB 'block당 256B'와 171행 VCTR 비트 의미를 STM32U5 RM으로 확인하지 않았다.
- 174행 `GTZC_TZSC_SECCFGR3_LPTIM1_Pos`를 `|=`로 쓰는 것은 _Msk 의도로 보이나 CMSIS 의미에 달린 판단이라 오류 확인에 넣지 않았다.
- 109~120행에 NSC region이 없는데 141행은 entry가 NSC region에 배치된다고 한다. IDAU가 NSC를 제공하는 구성인지 본문만으로 알 수 없다.
- 154행 'BXNS lr로 복귀', 201행 'SAU 미정의 영역은 IDAU 디폴트, 보통 secure'를 1차 자료로 대조하지 않았다.
- 164행 NXP RT500/600 명칭과 165행 SAM L11 'NVM Lock Bits' 서술을 확인하지 않았다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준 후보로 Cortex-M 절반(95~194행)은 `rtos/practical-internals/part4-11-trustzone-tfm.md`·`modern-recipes/part2-09-trustzone-m.md`, Cortex-A 절반(36~93행)은 `bsp/chapter07-tfa-trustzone.md`·`bootloader/chapter25-tfa-optee.md`가 더 깊게 다룬다. 먼저 85~91행 SMC ID 표를 SMCCC(Arm DEN0028)로, 112~113행 SAU 주소를 101행 그림과 RM0438에 맞춰 고친다. 그다음 위협 모델·키 보호 관점의 A/M 비교로 차별화 보강할지, 위 글들로 링크하고 공통 설명을 줄일지 정한다(보강 우선: Embedded Security 안에서 TrustZone 편의 독립 검색 의도가 있음).

### `embedded-security/chapter05-tee.md` — 60점, 보강

confidence: 중간

factcheck: 미검증. 대조 기록 후보는 7d14b1b8 'Fact-check CCA and PREEMPT_RT guidance' 하나인데 커밋 본문이 비어 있고 1차 자료 이름이 없다. 이 글의 diff는 334·358·369행 세 줄이고 358행은 '2026년 현재 ARMv9.2-A 일부 SoC에 처음 양산…'을 '특정 아키텍처 버전이나 확산 시점을 일반화하지 않습니다'로 바꾼 출처 없는 완곡 수정이다. OP-TEE·GP API·secure storage 주장(35~330행)은 대조 기록이 없다. 14cffad8 작성, fa55144d·8bf4703f 링크, ac24bb76 제목, 나머지는 서식·날짜다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 `TEEC_InvokeCommand` 한 번을 libteec ioctl → smc → BL31 → OP-TEE core → TA → RPC → 복귀로 나눈 8단계(115~124행), CA(59~112행)와 TA(134~223행)를 같은 UUID·명령 번호로 짝지은 AES 예제, 저장 위치별 보안 성질(289~291행)과 TA별 키 유도(293행), 381·382행 실수 목록이다. 35~40·46~51·299~312행은 공식 문서 수준이다. CCA 절(332~358행)은 개념 소개이고 358행은 완곡 문장이다. 126행은 문장이 깨져 분석으로 인정하지 않았다. |
| B | 13 | 17~25행 → 아키텍처(27~40행) → API(42~53행) → CA → TA 개발·manifest·빌드(128~252행) → secure storage(254~293행) → QEMU(295~330행) → CCA(332~358행) → 비교(360~372행) → 실수·정리(374~393행)로 흐름은 완성됐다. tee-supplicant가 나오지 않아 120·252·290행 동작 경로가 비고, 비교 표(364~370행)에 OP-TEE·TrustZone 행이 없다. 23·233·252·282·316~328행 불확실이 열려 있어 B ≤ 13. |
| C | 8 | CA·TA 코드(59~223행), TA dev kit 환경 변수와 산출물 이름(243~250행, 249행 파일명이 229~231행 UUID와 일치), manifest 기반 QEMU 빌드(299~312행), 예상 콘솔 출력(316~328행)이 있다. 그러나 126·376행 '수십 µs', 330행 '약 50,000개 테스트', 377행 'default heap 수 KB'는 출처·환경 없는 수치라 C ≤ 8이다. 316~328행이 실제 로그라는 표시와 OP-TEE 버전·보드가 없다. 92행 memset에 `<string.h>`가 없고 171행은 181행에서 정의되는 `do_aes_encrypt`를 선언 없이 호출하며 200행 `load_device_key`는 정의가 없다(AP-C-35 후보). |
| D | 12 | 같은 시리즈: chapter04 93행이 'OP-TEE 흐름은 Ch 5에서'라며 넘기고, chapter06은 OTA가 주제이며, chapter13-cxl-tee.md는 140행 링크로만 이 글을 가리킨다. 다른 시리즈: `bootloader/chapter25-tfa-optee.md` 144~146행(TA·Client API), 162행(tee-supplicant 경유 .ta 검증·적재), 166~177행(호출 경로와 왕복 지연)이 이 글 35~40·115~124·252행과 겹친다. `bsp/chapter07-tfa-trustzone.md` 273~289행은 BL32 빌드라 299~312행과 일부만 겹친다. `qemu-embedded/chapter16-trustzone.md` 106~126행은 draft라 감점에 넣지 않았다. TA 개발·GP Internal API·secure storage·CCA 비교는 이 글에만 있다. |
| E | 6 | 제목 'TEE 비교 분석 — OP-TEE·ARM CCA·SGX'인데 27~330행이 OP-TEE 튜토리얼이고 SGX는 366행 표 한 행과 372행 한 문단뿐이다. '비교 분석'은 세 칸 표(364~370행)와 372행이 전부다. description(5행)은 본문과 맞는다. |
| F | 5 | 397~406행 관련 항목 절의 링크 6개(399~404행) 대상은 모두 존재하는 공개 글이고 라벨이 주제와 맞는다(404행은 part4-11 제목과 일치). 그러나 405행 'AUTOSAR Adaptive — 차량 보안', 406행 'DO-178C — 항공 SW 보증'은 링크 없는 관련 항목이라 F ≤ 5. 395행 다음 편 'Ch 6: OTA 업데이트 — 안전한 펌웨어 배포'는 seriesOrder 6 `chapter06-ota-update.md`와 번호·주제가 맞지만 현재 제목과 라벨이 다르고 399행 Ch 2 라벨도 옛 제목이다. |
| G | 2 | 48~49행에 GP TEE Client API v1.0·Internal Core API v1.3 버전, 302행에 OP-TEE manifest 저장소 URL이 있다. GP 명세·OP-TEE 문서 링크와 코드·출력 기준 OP-TEE 릴리스가 없고 CCA·SGX·TDX·SEV 주장은 1차 자료와 연결되지 않는다. |

uncertainties:
- 23행 'TA들은 secure OS의 스케줄러 위에서 separate하게 돈다'가 OP-TEE 실행 모델과 맞는지 문서로 확인하지 않았다.
- 126·376행 SMC 왕복 '수십 µs'는 출처가 없고 bootloader/chapter25 177행은 '수 µs'다(다른 글과의 모순).
- 126행 '*blocksize/latency*가 압도적으로 latency가 큽니다'는 문장이 깨져 비교 대상을 알 수 없다.
- 233행 `TA_FLAG_EXEC_DDR`가 현재 OP-TEE 헤더에서 유효한지 upstream으로 확인하지 않았다.
- 252행 '부팅 시 등록된 TA 서명 키로 검증'과 120행 '호출 시 load', bootloader/chapter25 162행(tee-supplicant 경유 적재 때 검증)의 시점 서술이 모호하다.
- 282행 `bytes_read` uint32_t와 190·192·214행 size_t가 GP Internal Core API v1.3 시그니처와 맞는지 확인하지 않았다.
- 293행 'Trusted Key Derivation' 명칭과 HUK + TA UUID 유도를 OP-TEE 문서로 확인하지 않았다.
- 314행은 secure world 콘솔이 따로 뜬다고 하는데 317~321행 '# normal world' 블록에 `D/TC:` 로그가 있다. optee_examples 실제 출력과 같은지도 확인하지 않았다.
- 330행 xtest '약 50,000개', 377행 heap '수 KB'는 출처가 없다.
- 366~367·372행 SGX·TDX·SEV 서술을 Intel·AMD 1차 자료로 확인하지 않았다.
- 92·171·200행 코드는 그대로 빌드되지 않는다(AP-C-35 후보).
- 336~343행 CCA 계층 그림이 text 코드 블록의 ASCII 다이어그램이다(가이드 §6 위반 후보, 점수 외).

### `embedded-security/chapter06-ota-update.md` — 54점, 우선 조치

confidence: 높음

factcheck: 오류 확인. 1차 자료(mcu-tools/mcuboot main `boot/bootutil/include/bootutil/image.h`)와 원문 내부 모순. (1) 69행 '0x6907 (protected) / 0x6908 (non-protected)'는 반대다. image.h 52행 `IMAGE_TLV_INFO_MAGIC 0x6907`, 53행 `IMAGE_TLV_PROT_INFO_MAGIC 0x6908`. (2) 78행 '0x30: dependency', 79행 '0x40: encrypted-AES128-KW'가 틀렸다. image.h 112행 0x30 = `IMAGE_TLV_ENC_RSA2048`, 113행 0x31 = `IMAGE_TLV_ENC_KW`, 119행 0x40 = `IMAGE_TLV_DEPENDENCY`. (3) 122행 '헤더에 security_counter를 둔다'와 127·137·138행 `hdr->ih_security_counter`는 image.h 168~175행 `struct image_header`(ih_ver 다음 _pad1로 끝남)에 없는 필드이고 security counter는 120행 TLV 0x50(`IMAGE_TLV_SEC_CNT`)이다. 같은 글 57~66행 struct에도 그 필드가 없어(65행 _pad로 끝남) 글 안에서도 코드끼리 모순이다. (4) 203행 SWUpdate 'tarball-based update package' vs 225행 '.swu 패키지(cpio archive + sw-description)'. git log(0a9dd7bc slug, bfd34a20 태그 등)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 21~248행의 OTA 단계·서명 알고리즘·MCUboot 헤더·A/B 슬롯·counter·TLS·delta·도구 비교는 MCUboot·Mender 문서의 표준 목차다. 고유한 판단은 82행(protected TLV가 서명 범위 밖이면 버전 위장), 145행(security_counter를 version과 분리해 보안 수정 때만 올림), 194·297행(patch와 결과 이미지를 둘 다 검증), 166행(현재·다음 CA 두 개를 미리 심음)이다. 82행의 근거인 69~79행 TLV 표가 1차 자료와 다르고 50행 키 길이 기준은 출처가 없다. |
| B | 12 | 25~33행 7단계 표를 축으로 서명(37~50행)·헤더(52~82행)·슬롯(84~116행)·counter(118~145행)·TLS(147~166행)·delta(168~194행)·도구(196~248행)·Linux A/B(250~275행)·실수·정리(277~311행)까지 흐름은 완성됐다. 102행 'N초 안에 confirm()'의 실제 API가 없고 116행 SWAP_USING_MOVE 권장 근거가 없으며 125~140행 코드가 없는 헤더 필드를 쓴다. B ≤ 13. |
| C | 6 | 43~46행 Cortex-M4 검증 시간과 181행 'bsdiff 결과물 3~8MB'는 출처·환경이 없어 C ≤ 8이다. 212~220행 imgtool sign과 264~272행 U-Boot bootcmd는 재현 가능한 형태다. 그러나 125~140행은 57~66행 struct에 없는 `ih_security_counter`를 써서 컴파일되지 않고(AP-C-35), 183~192행은 bash 블록 안에 C 호출을 섞은 의사코드다. 실행 결과가 없다. |
| D | 9 | 비교한 글: 인접 chapter05·chapter07(겹침 없음), chapter02, 다른 시리즈 `bootloader/chapter17-ab-update.md`·`bootloader/chapter20-rauc-swupdate.md`·`buildroot/chapter16-ota.md`. 37~50행 서명 표·nonce는 Ch2 98~106·339행과, 118~145행 rollback 방지는 Ch2 247~267행과 겹친다. 250~275행 bootcount·upgrade_available은 bootloader ch17 73~88행, buildroot ch16 31~37·196~197행을 짧게 반복한다. 227~244행 sw-description은 bootloader ch20 148~153행 이하와 겹친다. MCUboot TLV·counter 저장 위치·CA 회전은 이 글 고유다. |
| E | 7 | 제목의 서명(37~50행)·Rollback 방지(118~145행)와 description의 A/B 슬롯(84~116행)·delta(168~194행)·서명 검증(35·281행)을 다룬다. 다만 2행 제목의 'Rollback 방지'와 '롤백 카운터'는 같은 내용을 두 번 적었고 description은 슬롯 복구 rollback과 downgrade 방지를 구분하지 않으며 대상(MCU vs Linux)을 밝히지 않는다. |
| F | 6 | 313행 다음 편 'Ch 7: Side-channel 공격'은 seriesOrder 7 `chapter07-side-channel.md`와 맞는다. 317행 Ch2, 318행 Ch4, 319행 rtos part4-11, 252·320행 buildroot ch08(143행 'Read-only rootfs + overlayfs' 절)을 열어 라벨과 맞음을 확인했다. 19·285행이 본문 고유 연결이다. 전제 지식 안내가 없고 audit:reading을 보지 않아 7 이상은 주지 않았다. |
| G | 2 | 321~323행에 MCUboot·Mender·SWUpdate 문서 최상위 링크만 있다. 58·69·74~79행 상수의 MCUboot 버전·파일, 43~46행 검증 시간의 라이브러리·클록, 44행 'RSA-3072 2030년 이후 권장'의 출처가 본문에 없다. |

uncertainties:
- 43~46행 검증 시간이 chapter02 100~104행과 크게 다르다(다른 글과의 모순).
- 46행 Ed25519 키 32B와 Ch2 104행 '64 bytes'의 표기 기준(공개키 vs 서명)을 확인하지 않았다.
- 44행 'RSA-3072 2030년 이후 권장'을 NIST SP 800-57 Part 1과 대조하지 않았다.
- 102행 'N초 안에 confirm()을 안 하면 다음 부팅에 복귀'는 MCUboot 동작(재부팅 시 미확인 이미지 revert)과 다를 수 있다.
- 111행 DIRECT_XIP '더 빠르지만', 116행 'SWAP_USING_MOVE가 근래 가장 권장'을 MCUboot 문서로 확인하지 않았다.
- 75행 0x20은 image.h 104행에서 `IMAGE_TLV_RSA2048_PSS`다. 'RSA2048 signature' 표기가 틀렸다고까지 보지는 않았다.
- 172행 '두 가지'와 174~179행 네 개 나열은 산문 개수 실수다.
- 181행 'bsdiff 3~8MB', 293행 '키 회전 계획(2~3년)'은 출처가 없다.
- 166행은 공개키 pinning이 아니라 trust anchor를 자체 CA로 제한한 것이다. 용어 적합성을 확인하지 않았다.
- 170행 '쇠한 LTE'는 오탈자로 보인다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간 기준으로는 병합 대상 없음. MCU 쪽 OTA 보안(MCUboot TLV·security counter·CA 회전)을 다루는 다른 공개 글이 없고 Linux A/B(250~275행)만 `bootloader/chapter17-ab-update.md`·`buildroot/chapter16-ota.md`와 겹친다. 다음 조치는 보강이다. 69·78·79행 TLV 상수와 122~140행 security counter 설명·코드를 image.h(52~53·112~120·168~175행) 기준으로 고치고, 203·225행 패키지 형식을 SWUpdate 문서로 맞춘다. 250~275행은 bootloader ch17 링크 요약으로 줄이고 43~46·181행 수치는 1차 자료로 확인하거나 TBD로 둔다.

### `embedded-security/chapter07-side-channel.md` — 56점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug), bfd34a20·2343c401(태그), be973200(topic), ac24bb76(제목·날짜), 49f2a443(블록 변환), 14cffad8(집필), 400892d7·55e250f2·77e2773b·c78aa440·121697d1·b43f6861(린터·날짜·draft 전환·stub)뿐이다. Kocher 논문, ChipWhisperer 문서, FIPS 140-3/ISO 19790 등과 대조한 커밋이 없다. 평가 중 1차 자료를 열지 않았고 원문 안 모순도 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | SPA를 RSA square-and-multiply 취약 코드와 방어 코드로 보이고(41~71행), CPA 골격(81~87행), 1차 Boolean masking 의사코드(155~161행), 이중 검증 fault 방어(218~234행)로 공격과 방어를 짝지었다. 다만 Kocher·Mangard 교재의 표준 구성이고 직접 잰 트레이스나 실패 사례가 없다. 93~96행 트레이스 수는 출처가 없고 98행 '칩과 측정 조건에 크게 좌우됩니다만'으로 흐린다. 192행도 기준 없는 일반론이다. |
| B | 12 | 분류(21~33행) → SPA(35~73행) → DPA/CPA(75~98행) → ChipWhisperer(100~133행) → 방어(135~192행) → fault(194~236행) → 인증(238~248행) → 실수·정리(250~285행)로 흐름은 간다. ChipWhisperer 예제는 117행 `os.urandom`에 `import os`가 없고 128행 `AES128_round1_hw`가 정의되지 않으며 펌웨어 빌드·플래시 단계가 없다. hiding 표(139~145행)는 구현 예가 없고 masking은 SBOX_M 생성법이 없다. EM은 26행 한 줄과 33행 한 문장뿐이다. B ≤ 13. |
| C | 6 | C 코드(41~71·171~187·218~234행)와 ChipWhisperer Python(104~131행)이 있지만 보드·펌웨어·ChipWhisperer 버전·기대 출력이 없다. 133행은 판단 기준만 있고 측정 결과가 없다. 93~96행 트레이스 수와 29~30행 거리(1~2m, 수 m)는 출처·환경 없는 수치라 C ≤ 8이다. 예제가 그대로 실행되지 않는다. |
| D | 12 | 비교한 글: 인접 chapter06(fault·glitch 0건)·chapter08(IoT 표준)은 겹치지 않는다. 같은 시리즈 chapter03 299~321행 constant-time 절이 이 글 167~192행과 거의 같다(early-exit memcmp, `diff \|= a[i] ^ b[i]`, mbedtls_ct_memcmp·sodium_memcmp, T-table cache timing). chapter01 129~135행은 요약 후 'Ch 7에서 따로 다룹니다'로 넘기고, chapter09 257·359행은 한 줄 언급이다. 다른 시리즈: `rtos/practical-internals/part4-11-trustzone-tfm.md` 244행, `riscv/esp32-c3-mastering/chapter12-power-management.md` 241행, `modern-recipes/part1-08-dac-principles.md`(DAC glitch, 다른 뜻)만 걸렸다. SPA/CPA/masking/fault를 실제로 다루는 공개 글은 이 글 하나다. |
| E | 6 | 제목 'Power·Timing·EM 분석', description 'DPA / SPA / EM / fault injection. constant-time, masking, hiding'. Power(35~133행), Timing(167~192행), fault(194~236행), 세 방어는 다루지만 EM은 26행 표 한 줄과 33행 한 문장뿐이다. 실제 분석 결과(트레이스, 상관계수)도 없다. |
| F | 5 | 287행 다음 편 'Ch 8: IoT 표준'은 seriesOrder 8 `chapter08-iot-standards.md`와 맞는다. 292행 Ch 4, 294행 part4-11은 라벨과 맞는다. 291행 'Ch 3: MCU Crypto — secure element, true RNG'은 ch03에 TRNG 절은 있지만 secure element는 표 한 칸이다. 293행 'Ch 6: OTA Update — 서명 검증의 fault 저항'은 chapter06에 fault·glitch가 한 번도 없어 라벨이 대상과 다르다. F ≤ 5. |
| G | 3 | 17행이 Kocher 1996 Timing Attacks와 1999 DPA를 연도와 함께 들고 295~296행에 두 논문 링크가 있다. 297행 ChipWhisperer 문서, 298행 Mangard 책도 있다. 그러나 ChipWhisperer API(104~131행) 버전, 93~96행 트레이스 수, 214행 Trezor 사례, 240~246행 인증 표, 190행 라이브러리 함수에 출처·버전이 없다. |

uncertainties:
- 214행 'Trezor 하드웨어 지갑이 2019년 voltage glitch로 PIN 인증을 우회'의 연도와 대상을 1차 자료로 확인하지 않았다.
- 102행 'ChipWhisperer가 피크 sample을 trigger 신호로 동기화'가 문서의 동기 샘플링 설명과 같은 뜻인지 확인하지 않았다.
- 109·113·126~129행 ChipWhisperer API가 현재 5.x API와 맞는지 확인하지 않았다. 117행 `os.urandom`은 `import os`가 없다.
- 93~96행 트레이스 수는 출처가 없고 15행 '몇 천 번', 279행 '수천 트레이스'와 93행 '~500'의 관계가 정리되지 않았다.
- 46·48행 uint32_t 곱셈은 mod가 2^16보다 크면 오버플로한다. 55행 '키가 256비트면'과 달리 코드는 32비트 지수다.
- 67행 `r[0] = r[bit]`는 비밀 비트로 배열을 인덱싱해 73행 '메모리 접근 패턴까지 같게'를 만족하는지 본문이 밝히지 않았다.
- 220행 `if (!verify_signature(img))`와 225·227행 `verify_signature(img) != OK`의 반환 규약이 다르다. API 의미 판단이라 오류 확인에 넣지 않았다.
- 17행과 242행의 FIPS 140-3 side-channel 요구 강도가 다르다. ISO/IEC 19790 범위와 246행 'CRYPTREC, BSI AIS 46'을 확인하지 않았다.
- 248행 'NXP A1006, ATECC608, Microchip TA100' DPA 인증 주장을 제조사 자료로 확인하지 않았다.
- 236행 'TrustZone-M nspe/spe 경계', 'PACBTI도 fault 저항성에 기여'를 Arm 문서로 확인하지 않았다.
- 204행 cold boot를 fault injection 표에 넣은 분류와 145행 dual-rail 설명을 확인하지 않았다.
- 192행 'MCU에서는 캐시가 없거나 직접 매핑이라 비교적 안전한 편'은 근거 없는 일반화다.

병합 대상: 병합 대상 없음. SPA/DPA/CPA·masking·fault injection을 실제로 다루는 공개 글은 이 글 하나이고 ch01(135행)·ch05(403행)·ch09(257·385행)가 이 글로 넘긴다. 다음 조치는 보강이다(ChipWhisperer 예제를 실행 가능하게 고치고 버전 표기, 93~96행 트레이스 수 확인 또는 삭제, EM 절 추가 또는 제목·description에서 EM 삭제, ch03 299~321행과 겹치는 constant-time 코드는 링크로 대체, 293행 Ch 6 라벨 수정).

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 공통 H2 뼈대: Embedded Security는 '한 줄 요약 / 왜 … / … / 자주 하는 실수 / 정리 / 다음 편 / 관련 항목'(chapter01 13·185·193·206행, chapter03 13·17·337·347·360행, chapter04 13·17·196·206·217·219행, chapter05 13·17·374·384·395·397행, chapter07 13·250·276·289행), Performance Engineering CXL 편은 '한 줄 요약 / 어떤 문제를 푸는가 / … / 자주 보는 함정과 안티패턴 / 정리 / 관련 항목'(part3-12 12·16·94·104·113행, part5-11 13·19·168·186·196행)이다. Embedded Security는 14cffad8 한 커밋으로 같은 날 작성됐다. 9절 scaled content 기록 대상이다.
- 관련 항목에 링크 없는 항목: chapter01 212행(CERT C), chapter02 362행(DO-178C), chapter03 366~367행(CERT C·MISRA C), chapter04 226행(AUTOSAR Adaptive, 대상 글 없음), chapter05 405~406행(AUTOSAR Adaptive·DO-178C). chapter10-sdlc.md 416~417행에도 있다. fa55144d·8bf4703f가 링크만 벗기고 텍스트를 남긴 흔적이라 6편 이상에서 F ≤ 5가 걸렸다.
- 다음 편·관련 항목 라벨이 대상 내용·현재 제목과 다르다: chapter01 204행('임의 펌웨어 실행'이 위험 표에 없음), chapter02 356행(Ch1 '개요'), chapter05 395·399행(옛 'Ch N' 제목), chapter07 293행(ch06에 fault 0건), part5-11 17행(Ch 54 도구 설명), part6-05 89·222행(ch08에 없는 표, 없는 다음 편). part3-11 173행 다음 편 안내도 seriesOrder 30 글과 맞지 않는다.
- git 이력에 1차 자료 대조 커밋 없음: Embedded Security 7편 모두 factcheck '검증됨'이 아니다. chapter05의 7d14b1b8 'Fact-check …'는 출처 없이 358행을 완곡 문장으로 바꾼 수정이다. CXL 편 중 part6-05도 대조 기록이 없다.
- 본문 1차 출처·버전 표기 부족: G가 1~3이다(chapter01·02·04·part6-05 G 1, chapter03·05·06 G 2, part3-12·part5-11·chapter07 G 3). 출처가 있어도 링크·커널·도구 버전이 없다.
- 출처·환경 없는 성능 수치와 시리즈 안 수치 불일치: chapter01 145~151행, chapter02 98~104행, chapter03 134~136·239·331~333행, chapter06 43~46·181행, chapter07 93~96행, part6-05 115~116행. RSA-2048 검증 시간이 chapter01(2~3초, M0+)·chapter02(400~600 ms)·chapter03(약 80 ms)·chapter06(~150 ms)에서 다르고 RSA·ECDSA 대소 관계도 글마다 뒤집힌다(다른 글과의 모순이라 오류 확인은 아님).
- 같은 질문을 여러 글이 나눠 답함: 서명 알고리즘 선택(chapter02 98~106행, chapter03 127~150행, chapter06 37~50행), constant-time memcmp(chapter03 300~323행, chapter07 167~192행), TrustZone·TF-A(chapter04, practical-internals part4-11, modern-recipes part2-09, bsp ch07, bootloader ch25), DAMON 기동 블록(part3-12 82·85행, part5-11 61·64행, part6-05 144행, memory/chapter06 74·77행, memory/chapter07 41행), Sun et al. CXL 지연 표(part3-12 40~46행, part3-11 104~112행, hbm/chapter10 33·178·182행, cxl/chapter08 190행).
- 지어낸 수치 정리 뒤 남은 공백: CXL 편(part3-12·part5-11·part6-05)은 fact-check에서 지운 수치·출력을 대체하지 않거나(part3-12 31·32·46·107행 TBD, part5-11 출력 0건) '개념적 예시', '일반화한 시나리오'로 완곡 처리했다(part6-05 15·120·123·138행). 제목이 약속한 비교·실측·사례를 본문이 이행하지 못하고, 삭제된 출력을 가리키는 문장(part6-05 171행)이 남았다.
- 원문 내부 모순: part6-05(5·60·100·165행), chapter02(275~287행), chapter04(88·89행, 101·112~113행), chapter06(57~66 vs 125~140행, 203 vs 225행). 1차 자료 없이 원문만으로 확인되는 오류가 4편이다.

## 다음 조치

- 우선 조치(4편, 오류 확인): part6-05 5·60·100·165행 수치와 '측정' 표현, chapter02 275~287행 PCR 정의·예시(TCG 문서), chapter04 85~91행 SMC ID 표(SMCCC)와 112~113행 SAU 주소(RM0438), chapter06 69·78·79행 TLV 상수와 122~140행 security counter(MCUboot image.h), 203·225행 SWUpdate 패키지 형식을 먼저 정정한다. 근거를 만들 수 없는 수치는 지우거나 TBD로 둔다.
- 제외 검토(1편): part3-12는 mlc 목록·PCIe 함정을 part3-11 또는 part5-11로 옮기고 제외할지, 제목·description을 남은 본문에 맞춰 줄일지 정한다.
- 병합 검토(4편): part5-11은 memory/chapter06과 역할을 나누고 출력 예를 보강한다. chapter01·chapter03·chapter07은 병합 대상 없이 보강한다(chapter01 DFD 절, chapter03 가속기 분석, chapter07 ChipWhisperer 예제와 EM 절).
- 보강(1편): chapter05는 코드 빌드 오류(92·171·200행)와 SMC 왕복 수치를 고치고 SGX·CCA 비교를 1차 자료로 채운다.
- 시리즈 단위: 관련 항목의 링크 없는 항목과 옛 'Ch N' 라벨을 일괄 정리하고, part6-05 222행과 part3-11 173행 다음 편 안내를 실제 seriesOrder에 맞춘다. Embedded Security 전체를 `/fact-check-round` 대상으로 올리고, 서명 알고리즘 검증 시간 등 시리즈 간 모순 수치는 1차 자료로 정본을 정한 뒤 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
