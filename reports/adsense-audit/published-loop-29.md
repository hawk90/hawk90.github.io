# 공개 글 AdSense 평가 — 루프 29

> 대상: 공개 글 10편 (HBM·GDDR 심화 `seriesOrder` 8~12, Industrial Ethernet 심화 `seriesOrder` 1~5)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 스물아홉 번째 루프다. 대상은 `src/content/blog/embedded/hardware/hbm/`의 뒤쪽 다섯 편(Ch 8 NPU·GPU 메모리 분해와 Ch 9~12 CXL 꼬리)과 `src/content/blog/embedded/protocols/industrial-ethernet/`의 앞쪽 다섯 편(Ch 1 개관~Ch 5 EtherCAT master)이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `hbm/chapter08-npu-gpu-usage.md` | 16 | 13 | 7 | 11 | 6 | 5 | 2 | **60** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`(현재 `part12-11-on-device-llm.md`), `part7-05-kernel-build.md` |
| `hbm/chapter09-cxl-mem.md` | 10 | 9 | 6 | 9 | 4 | 5 | 2 | **45** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `hbm/chapter10-cxl-mem-protocol.md` | 16 | 13 | 8 | 10 | 6 | 5 | 3 | **61** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `hbm/chapter11-cxl-device-types.md` | 16 | 13 | 7 | 10 | 8 | 5 | 3 | **62** | 검증됨 | 보강 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `hbm/chapter12-cxl-pooling-fabric.md` | 16 | 12 | 5 | 10 | 7 | 4 | 2 | **56** | 검증됨 | 병합 검토 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `industrial-ethernet/chapter01-overview.md` | 12 | 12 | 3 | 10 | 7 | 4 | 1 | **49** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `industrial-ethernet/chapter02-realtime-requirements.md` | 13 | 12 | 7 | 10 | 5 | 5 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `industrial-ethernet/chapter03-ethercat-architecture.md` | 12 | 13 | 5 | 9 | 7 | 6 | 2 | **54** | 미검증 | 병합 검토 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `industrial-ethernet/chapter04-ethercat-frame.md` | 12 | 11 | 6 | 11 | 7 | 6 | 2 | **55** | 오류 확인 | 우선 조치 | 높음 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `industrial-ethernet/chapter05-ethercat-master.md` | 13 | 12 | 6 | 10 | 6 | 5 | 2 | **54** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 55.0점(10편, 합 550점), 범위 45~62점이다. 판정은 우선 조치 5편, 보강 3편(HBM Ch 8·10·11), 병합 검토 2편(HBM Ch 12, Industrial Ethernet Ch 3)이고 유지·검증 대기·제외 검토는 없다. 오류 확인은 5건(HBM Ch 9, Industrial Ethernet Ch 1·2·4·5)이다. 4건은 원문 내부 모순·산술 불일치이고, Industrial Ethernet Ch 4는 SOEM v1.4.0 원문(`soem/ethercattype.h`·`soem/ethercatmain.h`)을 열어 확인한 1차 자료 근거와 내부 모순이 함께 있다. 검증됨은 HBM 4편(Ch 8·10·11·12)으로, 모두 fact-check round 1(9ad745f7, #58)의 장별 커밋이 근거다. HBM Ch 9도 같은 라운드에서 본문은 대조됐지만 frontmatter description과 본문의 모순 때문에 오류 확인이다. Industrial Ethernet 5편은 git log에 1차 자료 대조 커밋이 없다. Industrial Ethernet Ch 1은 시리즈 첫 글·허브라 점수 구간(병합 검토) 대신 보강 대상이지만 오류 확인 때문에 판정은 우선 조치다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·sitemap·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `hbm/chapter08-npu-gpu-usage.md` | 60 | 60 | 0 | 없음 |
| `hbm/chapter09-cxl-mem.md` | 48 | 45 | -3 | 없음 |
| `hbm/chapter10-cxl-mem-protocol.md` | 61 | 61 | 0 | 없음 |
| `hbm/chapter11-cxl-device-types.md` | 62 | 62 | 0 | 없음 |
| `hbm/chapter12-cxl-pooling-fabric.md` | 56 | 56 | 0 | 없음 |
| `industrial-ethernet/chapter01-overview.md` | 49 | 49 | 0 | 없음 |
| `industrial-ethernet/chapter02-realtime-requirements.md` | 54 | 54 | 0 | 없음 |
| `industrial-ethernet/chapter03-ethercat-architecture.md` | 55 | 54 | -1 | 없음 |
| `industrial-ethernet/chapter04-ethercat-frame.md` | 55 | 55 | 0 | 없음 |
| `industrial-ethernet/chapter05-ethercat-master.md` | 54 | 54 | 0 | 없음 |

- 추가한 오류 확인(판정 변경): HBM Ch 9 5행 description 'on-package HBM과 DRAM DIMM 사이의 새 tier' vs 21~26행 표(HBM → DDR DIMM → CXL.mem → NAND SSD), 28·125행 'DDR과 SSD 사이', 15·70·107행 'local DDR보다 지연이 크다'. 계층 위치는 이 글의 결론이라 두 진술이 동시에 참일 수 없다. 평가자는 이를 적어 놓고 E 감점과 uncertainties로만 처리했다. AP-C-24에 따라 검증됨 → 오류 확인, 판정 병합 검토 → 우선 조치로 바꿨다.
- HBM Ch 9 점수 조정: A 11→10(이 글만의 부분이 수치 없는 tier 표와 제품 표뿐, 앵커 part1-04와 같은 수준), B 10→9(17행이 내건 GPU 용량 문제에 본문이 답하지 않음), E 5→4(description 약속이 본문과 반대, 제목의 GDDR이 본문에 없음). 합계 48→45.
- 추가한 오류 확인 근거(판정 유지): Industrial Ethernet Ch 2 28~29행 권장 cycle(시정수 100 ms → 10~50 ms, 10 ms → 1~10 ms)이 34·219행 '물리 시정수의 1/10 이하' 원칙과 동시에 참일 수 없다. 평가자가 적은 34행 vs 41행 모순과 같은 계열이다.
- 추가한 오류 확인 근거(판정 유지): Industrial Ethernet Ch 4 198행 'Mailbox header (10 byte)'는 SOEM v1.4.0 `soem/ethercatmain.h` 316~322행 `ec_mbxheadert`(uint16 length, uint16 address, uint8 priority, uint8 mbxtype = 6 byte)와 다르다. 1차 원문을 열어 확인해 uncertainties에서 옮겼다. 47행 'WKC: 슬레이브들이 각자 1씩 증가'·279행 vs 89행 'Read+Write 성공 +3'·92행 '기대 WKC 48', 104·105행 dump offset vs 115행 '[0x0E] EtherCAT Header'도 내부 모순으로 추가했다. confidence는 중간 → 높음.
- 추가한 오류 확인 근거(판정 유지): Industrial Ethernet Ch 5 408행 제목 'WKC가 expected의 절반이다' vs 410행 '+1, output은 +2를 못 더해 +1만 됩니다'. 글의 설명대로면 기대 3 중 1이라 절반이 아니다.
- 기각한 오류 확인: 없음.
- Industrial Ethernet Ch 3 F 7→6: 221·223행 관련 항목 라벨이 제목 변경(ac24bb76) 전 형태로 남아 실제 제목과 다르다(223행 'EtherCAT Master/Slave — SOEM·IgH' vs 'EtherCAT Master 구현 비교 — SOEM·IgH·TwinCAT 분석'). 주제는 맞아 F ≤ 5는 적용하지 않았다. 합계 55→54.
- HBM Ch 8: C 상한 근거를 'C ≤ 9'에서 rubric 3-1 'C ≤ 8'로 바로잡았다(168행 228 KB, 183~201행 카드 사양처럼 출처 없는 수치). 119~152행 CUDA 의사 코드 인덱스 문제는 CUDA 실행 모델을 알아야 판단되는 결함이라 rubric 3-1에 따라 오류 확인이 아니라 uncertainties로 두었다. 점수 변경 없음.
- HBM Ch 12: factcheck 근거 커밋을 a0eeea28(#59)에서 9ad745f7(#58)로 바로잡았다. a0eeea28에는 'Coherency Domain ID' 링크 설명 삭제만 있다. 판정 변경 없음.
- 줄 번호 보정(점수 영향 없음): HBM Ch 8 D(ch05 146~152행, perf part6-05 89~96행), HBM Ch 11 D(Ch 9 91~93·98~101행, Ch 10 63~64행, CXL Ch2 23~27행, Recipes 11-15 46~50행, Perf 3-11 55~61행), HBM Ch 12 D(CXL Ch 4 23~33행), Industrial Ethernet Ch 1 D(ch2 23~32행, 200~202행, ch12 23~33행), Ch 2 D(ch09 125~154·335~345행 추가, ch10 46~50행), Ch 3 D(ch05 276~283행), Ch 4 D(ch03 75~97행), Ch 5 D(ch11 IgH 절 270행 시작).
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `hbm/chapter08-npu-gpu-usage.md` — 60점, 보강

confidence: 중간

factcheck: 검증됨. 9ad745f7(fact-check round 1, #58) 안의 'fix(content): fact-check HBM Ch 8 against primary sources' 커밋이 Llama 2 논문·model config(80 layer, 64 head, KV head 8)로 KV cache를 GQA 기준 327,680 B/token·86 GB·172 GB로 다시 계산했고, FlashAttention·vLLM 논문으로 설명을 고쳤고, MI325X TDP·REBEL-Quad 전력·Mach-1 메모리 종류를 AMD·Rebellions 자료로 고쳤다. 근거 없는 항목은 지우거나 TBD로 두었다. 이 커밋 뒤 파일 변경은 없다. 평가 중 본문 산술(30·31·34~36·41·67·68·80~85·113·160·164·175·177·193행)을 다시 계산해 모두 맞음을 확인했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 16 | 21~39행에서 Llama 2 70B(layer 80, KV head 8, head_dim 128)로 weight 140 GB, activation 168 MB, KV cache 327,680 B/token·86 GB를 직접 분해하고, 41행에서 seq 4096이면 172 GB, MHA였다면 687 GB라는 비교를 낸다. 43~51행은 '140 GB를 넣고 남는 용량'으로 바꿔 MI325X만 KV 86 GB까지 담는다는 결론을 낸다. 113행은 batch 128 전제로 8K·128K에서 KV read가 weight read의 2.5배·39배라고 계산하고, 175~177행은 42 ms를 batch 64로 나눠 0.65 ms를 보인다. 반면 117~171행 CUDA tiling 의사 코드·FlashAttention 설명과 216행 PagedAttention 요약은 일반 교재 수준이고, 209~214행 tiering 대응은 '이렇게 대응시킬 수 있습니다'로 근거 없는 일반론이다. 183~201행 카드 표와 220~228행 UALink 절은 사양 나열이다. |
| B | 13 | 메모리 분해(19~51행) → weight(53~57행) → activation(59~70행) → KV cache(72~113행) → tiling(115~171행) → decode batch(173~177행) → 카드 사례(179~201행) → CXL·UALink(203~228행) → 실수(245~257행) → 정리 흐름이 끝까지 간다. 187·188·200·225행이 TBD라 카드 비교가 일부 비어 있고, 제목의 '배치' 절(203~216행)은 기준 없이 목록 네 줄이다. 119~152행 CUDA 의사 코드의 인덱스 범위가 정확성 불확실로 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 34~36행 per-token 공식, 67~68행 activation 식, 113행 KV read 식, 175행 140 GB ÷ 3.35 TB/s처럼 계산식이 드러나 독자가 산술을 다시 해 볼 수 있다. 실제 측정·관찰 결과나 재현 절차가 없고, 168행 H100 shared memory 228 KB, 183~201행 카드 사양처럼 본문에 출처·환경 없는 구체 수치가 있어 rubric 3-1 C ≤ 8(AP-C-24의 C ≤ 9보다 낮은 상한)을 적용했다. 91~102행 Python과 119~152행 CUDA는 실행 조건·예상 결과가 없는 의사 코드이고, 157~169행 tile 비교는 수치 없는 정성 비교다. |
| D | 11 | 같은 시리즈: `chapter07-memory-controller.md` 195행은 이 글로 안내할 뿐 겹치지 않는다. `chapter09-cxl-mem.md` 17행은 이 글의 226 GB 계산을 요약해 이어받는다. `chapter05-bandwidth-bottleneck.md` 146~152행(Llama 2 70B batch 1 decode, 140 GB / 3.35 TB/s ≈ 42 ms, batch amortize)은 이 글 175~177·255~257행과 같은 계산·결론이다. `chapter01-overview.md` 79행 제품 목록은 183~191행 카드 표와 일부 겹친다. 다른 시리즈: `modern-recipes/part12-11-on-device-llm.md` 220~232행은 Llama 3 8B로 같은 KV cache 공식과 GQA 축소를 보이지만 edge·llama.cpp 대상이라 역할이 다르다. `performance-engineering/part6-05-case-cxl-llm-kv-cache.md` 89~96행은 이 글을 인용한 CXL 사례다. `ml/systems/ml-profiling/chapter04`·`chapter08`은 Outline뿐인 draft라 비교에서 뺐다. Ch 5와의 decode 계산 중복 때문에 15점은 주지 않았다. |
| E | 6 | 제목의 Weight·Activation·KV Cache는 53~113행에서 모두 다룬다. '배치 분석'은 209~214행 목록 네 줄뿐이라 부분 미이행이다. description(5행) '시리즈 마무리'는 232행 'Ch 9부터는 … CXL.mem으로 넘어갑니다'와 실제 12편 구성과 어긋난다. 6~8 구간 하단. |
| F | 5 | 271행 다음 편 'Ch 9: CXL.mem 분석'은 seriesOrder 9 `chapter09-cxl-mem.md`와 맞다. 17행 Ch 7 back-link와 230~243행 Ch 1~8 정리 표가 위치를 잡아 준다. 275행 라벨 '고대역 메모리 개요'는 실제 제목 'HBM과 GDDR 분기점 분석'과 다르다. 278행 'CXL Ch 8: ML 가속기 — HBM과 CXL의 조합'은 링크가 없고 실제 `cxl/chapter08-cxl-mem.md`는 'Ch 8: CXL.mem — M2S·S2M·HDM Decoder'다. 279행 'UCIe Ch 12'도 링크가 없고 대상은 `draft: true`다. 틀린 라벨·링크 없는 항목이라 F ≤ 5. |
| G | 2 | 본문에 1차 출처 링크나 문서명이 없다. Llama 2 config(21행), FlashAttention(171행), PagedAttention(216행), 카드 사양(183~201행)의 출처는 커밋 9ad745f7 본문에만 있다. 199행 'Hot Chips 2025', 201행 '2024년 3월 발표', 220행 '2025년 4월 8일 UALink 200G 1.0' 같은 날짜·버전 표기만 있다. |

uncertainties:
- 119~152행 CUDA 의사 코드: `tileA[128][32]`·`tileB[32][128]`을 `[threadIdx.y][threadIdx.x]`로 채우므로 139·141행 load는 threadIdx < 32를 전제하는데, 131·132행 row·col은 128 stride라 threadIdx가 0~127이어야 128×128 출력 tile을 채운다. 32×32 블록이면 C 일부만 쓰이고 128×128 블록이면 배열 범위와 블록당 스레드 상한을 넘을 수 있다. CUDA 실행 모델을 알아야 판단되는 결함이라 rubric 3-1에 따라 여기에 둔다. CUDA Programming Guide로 확인할 것.
- 91~102행 Python 의사 코드: 101행이 루프 밖에서 `past_token`을 쓰고 softmax가 없다. 의사 코드라 오류로 단정하지 않았다.
- 168행 H100 shared memory SM당 228 KB, 185행 H100 SXM5 5 stack, 191행 TPU v5p 95 GiB·2,765 GB/s는 1차 자료를 직접 열지 않았다.
- 199행 REBEL-Quad 144 GB·4.8 TB/s·1,024 TFLOPS·600 W와 228행 UALink 이사회 명단은 커밋에 대조 기록이 있으나 직접 열지 않았다.
- `performance-engineering/part6-05-case-cxl-llm-kv-cache.md` 89~96행은 이 글을 인용하며 KV cache를 batch 64에 320 GB, batch 128에 640 GB(MHA 시절 수치)로 적어 이 글 36·85행(batch 128·seq 2048에 86 GB, GQA)과 어긋난다. 다른 글과의 모순이라 오류 확인 근거가 아니다.
- `anchors.md`는 'part12-10-on-device-llm.md'라고 적지만 현재 part12-10은 zero-copy-camera이고 on-device-llm은 part12-11이다. anchor 문서의 파일명이 stale일 수 있다.

### `hbm/chapter09-cxl-mem.md` — 45점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순(rubric 3-1, AP-C-24). 5행 description은 CXL.mem을 'on-package HBM과 DRAM DIMM 사이의 새 tier'라고 한다. 본문 21~26행 표는 HBM → DDR DIMM → CXL.mem → NAND SSD 순서로 놓고, 28·125행은 'DDR과 SSD 사이'라고 하며, 15·70·107행은 'local DDR보다 지연이 크다'고 한다. HBM과 DIMM 사이이면서 DDR 아래일 수는 없다. 9ad745f7(#58)의 'fix(content): fact-check HBM Ch 9 (CXL.mem) against primary sources'는 CXL Consortium 2.0·3.0 발표, Linux `drivers/cxl`·sysfs-bus-cxl ABI, ndctl man page, 제품 발표와 본문을 대조했지만 frontmatter description은 고치지 않았다. 이 모순만 고치면 검증됨으로 돌아갈 수 있다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 이 글만의 것은 Ch 8의 226 GB 문제(17행)에서 출발해 CXL.mem을 HBM·DDR·SSD 사이 tier로 놓는 표(21~26행), 1차 자료로 고친 CXL 2.0 제품 표(59~66행), 용도 구분(70~72행)이다. load 경로·HDM decoder(40~42행), 세 프로토콜 표(34~38행), 버전 표(48~51행)는 CXL 입문 자료의 표준 내용이다. tier 표에 지연·대역폭 칸이 없고 28·44행이 TBD라 tier를 가르는 정량 근거가 없다. 70·107행 '지연이 크다'는 크기 없이 방향만 말한다. 앵커 part1-04(A=10)와 같은 수준. |
| B | 9 | 17행 문제 제기 → tier 위치(19~28행) → load/store 경로(30~44행) → 버전 → 제품 → 용도 → OS 통합(74~101행) → 함정 → 정리 흐름은 있다. 그러나 17행이 내건 전제(H100 80 GB에 weight가 안 들어가는 문제를 'PCIe 너머로 DRAM을 끌어와' 푼다)에 본문이 답하지 않는다. 본문의 CXL.mem은 호스트 CPU가 디바이스 DRAM을 쓰는 것(15·40행)인데 GPU 서빙에서 어떻게 쓰이는지 설명이 없다. 96~101행 OS 절도 NUMA 노드로 올라온 뒤 배치 정책을 다루지 않는다. 5~9 구간이고 5행과 21~28행의 모순도 있다. |
| C | 6 | `cxl list`·`cxl create-region`·`daxctl list`(91~93행)와 sysfs 트리(79~85행)는 있지만 커널·ndctl 버전, 예상 출력, 성공·실패 관찰이 없다. 92행 region을 만든 뒤 System RAM과 DAX 중 무엇이 되었는지 확인하는 절차도 없다. 28·44행은 TBD이고 44행은 공식에서 유도한 산술뿐이다(C ≤ 9). 63행 '최대 36 GB/s'는 본문에 출처가 없다(C ≤ 8). 4~7 구간. |
| D | 9 | 같은 시리즈: `chapter08-npu-gpu-usage.md` 203~212행 Memory Tiering이 이 글 21~28·70행과 겹친다. `chapter10-cxl-mem-protocol.md` 17행은 이 글의 결론을 받고 19행에서 메커니즘을 CXL Ch 8로 넘겨 역할이 갈린다. `chapter11-cxl-device-types.md` 65~74행 System RAM/DAX 표가 이 글 96~101행을 다시 다룬다. 다른 시리즈: `cxl/chapter08-cxl-mem.md` 21~35행(load 경로 7단계, 'DMA setup 없음', HDM Decoder 문장)이 이 글 40~42·111행과 거의 같은 문장이고, 같은 글 152~165행 `cxl create-region`이 이 글 91~93행과 겹친다. `performance-engineering/part3-11-cxl-interconnect.md` 26~43행, `cxl/chapter01-cxl-position.md` 41~50행, `modern-recipes/part11-15-pcie-to-cxl.md` 32행, `part11-17-linux-cxl-driver.md` 67~69·92행도 겹친다. 이 글만의 부분은 tier 표와 제품 표(59~66행)라 5~9 구간 상단. |
| E | 4 | 제목이 'CXL.mem 분석'을 약속하지만 본문은 개념 정리다(17행 스스로 '어디에 끼는지를 정리'). 제목의 GDDR은 본문에 나오지 않는다. description(5행) 'HBM과 DRAM DIMM 사이의 새 tier'는 본문(21~28·125행)과 반대라 3~5 구간 안에서 한 점 더 낮췄다. |
| F | 5 | 133행 다음 편 'Ch 10: CXL.mem 프로토콜 분해'는 seriesOrder 10 `chapter10-cxl-mem-protocol.md`와 맞다. 17행 Ch 8 링크는 전제 문제를 가리키는 고유 안내다. 그러나 138행 관련 항목 'Ch 5: 메모리 대역폭 병목 분석 — Roofline에서 CXL.mem의 자리'는 `chapter05-bandwidth-bottleneck.md`에 맞지 않는다. Roofline 절(99~115행)에 CXL이 없고 CXL은 218행에 링크 없는 한 줄뿐이다. 틀린 라벨이라 F ≤ 5. Ch 8·10·11·12 라벨은 대상 제목과 맞다. |
| G | 2 | 본문에 출처 링크가 하나도 없다. 50~51행(CXL 2.0 2020년 11월 10일, 3.0 2022년 8월), 42행 'CXL 2.0 규격의 HDM Decoder Capability Structure', 66행 Azure 발표(2025년 11월), 70행 'Astera Labs는 … 대표 용도로 듭니다'처럼 이름과 날짜는 있지만 링크·판·절 번호가 없다. 91~93행 명령의 ndctl·커널 버전도 없다. |

uncertainties:
- 92행 `cxl create-region -m -d decoder0.1 -w 2 -g 1024 mem0 mem1`에는 `-t`가 없다. ndctl 버전에 따라 기본 region type(ram/pmem)이 다를 수 있다. `cxl/chapter08-cxl-mem.md` 156행과 modern-recipes part11-17 92행은 `-t ram`을 붙인다. 79~85행 트리에는 decoder0.0만 있고 명령은 decoder0.1을 쓰지만 예시라 모순으로 보지 않았다.
- 63행 Micron CZ120 'PCIe 5.0 x8, 최대 36 GB/s'는 44행 공식(한 방향)으로 x8 32 GB/s를 넘는다. 방향을 밝히지 않아 양방향 합일 수 있으므로 모순으로 확정하지 않았다.
- 61행 Samsung CMM-D '512 GB 제품도 등록됨', 62행 SK hynix '96 GB 고객 검증 완료, 128 GB 검증 진행'은 원문 발표를 열지 않았다. 62행은 진행형이라 staleness 후보다.
- 66행 Azure M-series CXL 프리뷰(2025년 11월)는 커밋 본문과 맞지만 1차 자료는 열지 않았다.
- 32행 'CXL 3.0은 PCIe 6.0 PHY의 64 GT/s(PAM4)'와 44행 128 GB/s는 규격 문서로 대조하지 않았다.

병합 대상: 판정은 오류 확인 때문에 우선 조치다. 점수 구간(병합 검토) 기준 병합 후보는 같은 시리즈 `chapter10-cxl-mem-protocol.md`(17행이 이 글의 결론을 받으므로 tier 표·제품 표를 Ch 10 도입으로 옮길 수 있다)와 개념 부분이 거의 같은 `cxl/chapter08-cxl-mem.md` 21~35행이다. 다만 Ch 10·11이 이 글을 전제로 삼고 'HBM 시리즈 안에서 CXL.mem이 어느 계층에 놓이나'라는 독립 검색 의도가 있어, 모순을 고친 뒤 다음 조치는 보강이다. 5행 description 정정, 17행 226 GB 문제에 대한 답, 40~42행 CXL Ch 8과 같은 문장 축소, 138행 Ch 5 라벨 정정, 본문 출처 링크, 92행 명령 뒤 결과 확인 절차, 제목의 GDDR 정리.

### `hbm/chapter10-cxl-mem-protocol.md` — 61점, 보강

confidence: 중간

factcheck: 검증됨. 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 10 against the CXL 1.1 spec and measurements'. CXL 1.1 규격(MemRd→MemData, MemWr→Cmp, MemWrPtl 64-bit Byte Enable, credit 흐름 제어, Host/Device Bias·Bias Table·Transition Agent §2.2.1), Sun et al. MICRO 2023(Xeon 6430, 원격 DDR5 대비 35%~약 3배), Linux HDM decoder 코드(`CXL_DECODER_MIN_GRANULARITY` 256, `SZ_16K`)와 대조했고 64 B→256 B 수정과 근거 없는 지연 사다리·효율 수치 삭제가 기록돼 있다. 23ed6256 'qualify or remove suspect claims'는 근거로 쓰지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 16 | 55·164~166행이 'write가 read보다 비싸다'는 직관을 MemWr→Cmp, MemWrPtl+Byte Enable로 뒤집는다. 117~119행은 in-flight 양 = 대역폭 × 왕복 지연을 끌어내 200 ns·50 GB/s → 10 KB ≈ 156 라인을 계산한다(10,000 ÷ 64 = 156.25, 맞음). 43행 'switch 한 단 = 통과 지점 두 개', 82~85행 '확장해도 그대로인 것' 표가 이 글의 관점이다. 그러나 47~53행 메시지 표, 131~138행 granularity, 117행 credit 정의는 CXL Ch 8과 같은 내용이고, 43·66행 핵심 수치는 TBD, 80행 '직렬화 시간이 큰 몫이 아니다'는 수치 근거가 없다. |
| B | 13 | 지연 예산(21~43행) → 왕복 1회(45~55행) → bias(57~68행) → 대역폭·지연 분리(70~111행) → credit과 무릎(113~127행) → granularity(129~140행) → 실수·정리(154~189행)로 질문이 닫힌다. 43행 구성별 지연과 66행 bias 전환 비용이 TBD이고, 91~108행 측정 코드는 ring 생성·타이머·예상 결과가 없다. 41~43·80행 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 8 | 33·178행 실측값은 외부 연구(Sun et al., Xeon 6430) 인용이고 직접 잰 값이 없다. 91~108행 코드는 pointer chase와 stream의 차이를 보여 주지만 실행 절차·결과가 없다. 121~125행 무릎 표는 조건·수치 없이 정성적이다. 119행은 가정값에서 나온 산술뿐이라 C ≤ 9, 합격·실패를 가르는 관찰 절차가 없어 8. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter09-cxl-mem.md`·`chapter11-cxl-device-types.md`, 다른 시리즈 `cxl/chapter08-cxl-mem.md`·`performance-engineering/part3-12-cxl-mem-latency.md`·`modern-recipes/part11-15-pcie-to-cxl.md`. 47~53행 메시지 표 ↔ CXL Ch 8 메시지 표와 Write 흐름. 131~138·172~174행 granularity ↔ CXL Ch 8 Interleave Granularity 절과 '자주 하는 실수'(문장 거의 같음). 117행 credit 정의 ↔ CXL Ch 8 credit 단락. 33·178·182행 Sun et al. 1.35배~약 3배 ↔ Perf-Eng 3-12의 14·38·42~44·102·106행. 72~78행 링크 전송률 ↔ HBM Ch 9 44행. 19·142~152행이 역할을 나누고 in-flight 계산·왕복 횟수 논지는 이 글에만 있어 10~14 구간 하단. |
| E | 6 | 제목의 '왕복 횟수가 만드는 지연, 링크가 만드는 대역폭'은 21~111행이 이행한다. 5행 description은 'Ch 9의 지연·대역폭 수치가 왜 그렇게 나오는지'를 약속하지만 Ch 9 28행은 수치를 TBD로 두고 44행에 링크 원시 전송률만 있다. description의 'throughput 절벽'은 121~125행에서 포화하는 무릎이다. 제목의 '프로토콜 분해'도 144행 '이 장은 성질만 다뤘습니다'와 결이 다르다. |
| F | 5 | 193행 다음 편 Ch 11(`chapter11-cxl-device-types.md`, seriesOrder 11)은 맞다. 68·140·146~152행은 CXL Ch 3·8·9·11로 넘기는 고유 안내다. 그러나 203행 'Modern Embedded Recipes Ch 149: PCIe → CXL 진화'의 대상 `part11-15-pcie-to-cxl.md`는 seriesOrder 150이고, 149는 `part12-13-matter-thread.md`다. 번호가 틀린 링크라 F ≤ 5. 197행 Ch 9 라벨 '이 장이 설명한 지연·대역폭 수치의 출처'도 Ch 9 28행이 TBD라 맞지 않는다. 202행 Perf-Eng 'Ch 54'는 seriesOrder 54와 맞다. |
| G | 3 | 47·59·117행 'CXL 1.1 규격', 33·89행 Sun et al.(MICRO 2023, Xeon 6430, Intel MLC), 131행 'Linux 커널의 HDM decoder 코드'로 주장마다 출처 이름이 붙는다. 규격 절 번호(§2.2.1)는 커밋에만 있고, 커널 버전·심볼 이름·논문 링크가 없다. |

uncertainties:
- 41~43·183행 'switch 한 단 = 통과 지점 두 개 추가'는 커밋 출처 목록에 없다. CXL 2.0 규격으로 확인하지 않았다.
- 80행 '64 B 한 줄의 직렬화 시간이 지연 예산의 큰 몫이 아니다'는 수치·출처가 없는 추론이다.
- 89행 '위 연구도 지연은 pointer chase(Intel MLC)로 쟀습니다'와 Perf-Eng 3-12 38행 'Intel MLC와 자체 마이크로벤치마크'의 차이를 논문 원문으로 확인하지 않았다.
- 131·188행 256 B~16 KB는 Linux 커널 코드 기준인데 커널 버전이 없고, CXL 규격 허용 범위와 같은지 확인하지 않았다.
- 66행 '4 KB당 1 bit' 예시가 CXL 1.1 §2.2.1 문구인지 원문으로 확인하지 않았다.
- 125·162행 '필요량 초과 시 지연만 오른다'는 큐잉 일반론이고 CXL 측정 출처가 본문에 없다.

### `hbm/chapter11-cxl-device-types.md` — 62점, 보강

confidence: 중간

factcheck: 검증됨. 9ad745f7(#58) 하위 커밋 'fix(content): fact-check HBM Ch 11 against the CXL 1.1 spec'. CXL 1.1 규격 §2.1~2.3으로 Type 정의를 고쳤고, Device Bias 중 BISnp 주장을 1.1 규격 표현('성능이 떨어짐')으로 바꿨고, Ch 9 가상 수치를 HBM3 819 GB/s·HBM3E 1.23 TB/s·PCIe 5.0 x16 64 GB/s로 바꿨고, `cxl list -M -D` 옵션은 cxl-list man page로 확인했다. 이번 검토에서 1차 자료를 직접 열지는 않았다. 본문 안 모순도 찾지 못했다(55행 819/64 ≈ 12.8, 1230/64 ≈ 19는 '한 자리수 이상'과 맞고, 82행 판별 규칙은 71~72행 표와 맞는다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 16 | 33~37행 '호스트 용량이 늘어나나' 표와 39행 결론이 이 글만의 관점이다. 55행은 같은 HBM을 가속기는 819 GB/s~1.23 TB/s로, 호스트는 PCIe 5.0 x16 64 GB/s로 본다는 비대칭을 수치로 보이고 57행 'Type 2를 사는 이유는 연산'으로 잇는다. 88~95행 트래픽 표는 유형마다 병목 지점을 가른다. 21~29행 정의 표는 규격을 옮긴 것이고, 71·113행은 Type 2 노출 방식을 '가속기 드라이버가 정함'으로 넘긴다. 실패 사례·실측이 없어 앵커 part12-10(18)보다 낮다. |
| B | 13 | 정의(21~29행) → 용량 관점(31~39행) → 유형별 절(41~63행) → Linux 노출 형태와 명령(65~82행) → 트래픽(84~95행) → 실수(97~113행) → 정리(115~122행) 순으로 제목 질문에 답한다. Type 2 노출 형태(71행)는 구체 예가 없고, 122행 '배치(direct·switch·fabric)'는 본문에서 45행 한 문장뿐이다. 82행 판별 규칙, 23행 절 번호 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 76~80행 명령 세 줄과 82행 해석은 확인 절차지만 실행 환경·기대 출력·실패 시 관찰이 없다. 55행 대역폭 수치는 본문에 출처·환경이 없다. rubric 3-1 C ≤ 8을 적용했고, 기대 출력 예가 없어 앵커 part7-05(8)보다 한 단계 낮다. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter09-cxl-mem.md`, `chapter10-cxl-mem-protocol.md`, `chapter12-cxl-pooling-fabric.md`, 다른 시리즈 `cxl/chapter02-system-architecture.md`, `modern-recipes/part11-15-pcie-to-cxl.md`, `performance-engineering/part3-11-cxl-interconnect.md`. 21~29행 정의 표와 61~63행은 CXL Ch2 23~27행 표·33행 Type 1 설명과 거의 같은 문장이고, Recipes 11-15 46~50행, Perf 3-11 55~61행에도 같은 표가 있다. 65~74행 System RAM/DAX 구분과 76~79행 명령은 Ch 9 91~93행·98~101행과 겹친다. 53행 Host/Device Bias는 Ch 10 63~64행 표 요약이다. 33~37행 용량 표, 55행 대역폭 비교, 88~93행 트래픽 표는 비교한 글에 없다. 10~14 구간 아래쪽. |
| E | 8 | 제목 '이 중 무엇이 나에게 메모리인가'와 description의 '호스트 용량·NUMA·대역폭'을 본문이 이행한다(용량 33~39행, NUMA 65~82행, 대역폭 55·88~95행). 과장은 없고 독자(카드를 고르는 사람, 15행)도 드러난다. 대역폭은 55행 사양값 한 쌍뿐이고 Type 2 NUMA 사례가 없어 9는 주지 않는다. |
| F | 5 | 126행 다음 편은 seriesOrder 12 `chapter12-cxl-pooling-fabric.md`와 맞고, 47행 'Ch 9의 현세대 디바이스 절'도 Ch 9 55행에 있다. 그러나 130행 라벨은 Ch 9에 '지연·대역폭 실측'이 있다고 하지만 Ch 9 44행은 '실측값은 TBD'이고 실측은 Ch 10 33행에 있다. 131행 'BISnp 동작'은 Ch 10 19·68·150행이 CXL Ch 8·Ch 3으로 넘긴 내용이다. 135행 'Modern Embedded Recipes Ch 149'의 대상 part11-15는 seriesOrder 150이다. 라벨 오류로 F ≤ 5. |
| G | 3 | 23행 'CXL 1.1 규격(2.1~2.3절)'은 판·절 번호가 있는 1차 출처로 21~29·61행 주장에 연결되고 53행 '규격 표현대로'도 같은 출처다. 55행 HBM3·HBM3E·PCIe 수치와 76~79행 ndctl/numactl 명령에는 출처·버전이 없다. |

uncertainties:
- 23행 'CXL 1.1 규격 2.1~2.3절' 절 번호와 27행 Type 1 예(복잡한 atomic)를 규격 원문으로 다시 확인하지 않았다(9ad745f7 기록에 기댐).
- 55행 HBM3 819 GB/s, HBM3E 1.23 TB/s를 JEDEC·제조사 자료로 다시 확인하지 않았다.
- 82행 판별 규칙: Type 2가 `cxl list`에 memdev로 잡히는지는 커널 버전·드라이버에 따라 다를 수 있다(CXL Ch2 133행 `CXL_DEVTYPE_DEVMEM` 언급).
- 72·105행 'Type 1은 HDM이 없음'을 규격 원문으로 확인하지 않았다.
- 29행 'Type 3는 CXL.cache로 요청하지 않음'은 1.1 기준이고, CXL 3.0 HDM-DB Type 3의 BISnp(CXL Ch2 52행)와의 구분이 판 표기 없이 남아 있다.

### `hbm/chapter12-cxl-pooling-fabric.md` — 56점, 병합 검토

confidence: 중간

factcheck: 검증됨. 9ad745f7(#58) 안의 'fix(content): fact-check HBM Ch 12 against primary sources' 커밋 본문. TPP 논문(ASPLOS 2023)과 대조해 '기본 Linux 대비 +18%, NUMA balancing 대비 5~17%'로, Pond(ASPLOS 2023)와 대조해 '8~16 소켓, DRAM 비용 7%, 1~5%'로 고쳤다. CXL 2.0 MLD pooling은 CXL FMS 2023 tutorial, 2.0 switching·pooling과 3.0 fabric은 컨소시엄 발표 자료로 남겼다. 출처 없는 일정·양산 주장은 지웠다. a0eeea28(#59)에는 이 글의 'Coherency Domain ID' 링크 설명을 지운 커밋만 있다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 16 | 29~34행은 배치별 용량 상한을 정하는 요소를 표로 정리하고, 42~45행은 대역폭 병목과 용량 병목을 갈라 '풀링이 답인가'를 판정한다. 85~89행은 도입 전에 답할 질문 세 개를 둔다. 99~104행은 조달 기준이 '서버별 peak의 합'에서 '동시 peak'로 바뀐다는 비교이고, 104·106행에 새로 드는 비용도 적었다. 25행은 Ch 8의 226 GB 대 80 GB를 다시 써서 시리즈 근거와 잇는다. 반면 69행 '나빠질 수 있습니다'와 59행 '단계별 실제 지연 값은 TBD'가 핵심 수치를 비워 두었고, 73~77행 표의 '이유' 칸은 일반론이다. |
| B | 12 | 용량 상한(21~36행) → 대역폭·용량 축(38~47행) → 토폴로지 단계(49~65행) → 지연(67~79행) → hot/cold 전제(81~91행) → 조달(93~108행) → 오해(110~132행) → 정리(134~142행) 흐름이 완결된다. description이 약속한 '빌린 용량의 지연 값'은 59행 TBD이고, 지연은 69·114행 정성 서술뿐이다. 122행 MLD 할당 단위 낭비도 LD 개수·크기 조건이 없다. 40행 HBM stack 대역폭 범위 불확실이 열려 있어 AP-C-24에 따라 13 이하. |
| C | 5 | 실행하거나 검증할 절차가 없다. 측정 명령도 기대 관찰도 없다. 구체 수치는 논문 이름이 붙은 결과(91행 TPP 18%·5~17%, 108행 Pond 7%·1~5%)와 40행 PCIe 5.0 x16 64 GB/s 하나다. 29~34·99~104행 표는 정성 비교다. 85~89행 질문 세 개는 판단 틀이지만 working set 비율을 재는 방법은 없다. 4~7 구간. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter11-cxl-device-types.md`, `chapter10-cxl-mem-protocol.md`, 다른 시리즈 `cxl/chapter04-pooling-gfam.md`, `performance-engineering/part3-11-cxl-interconnect.md`. 53~57행 3단계 표와 61~63행 불릿이 CXL Ch 4 23~33행과 구조가 같다. 128~130행 NVLink 절이 CXL Ch 4 160~162행과 제목·답이 거의 같다. 91·108행 TPP·Pond 수치가 CXL Ch 4 127~128행 표와 같다. 71·114행 cold tier 원칙은 Perf part3-11 159행과 같은 결론이다. HBM Ch 11 45행은 토폴로지를 이 장에 넘겨 역할이 갈린다. 21~47행 용량 상한·축 분리와 93~106행 조달 기준은 고유 부분이다. |
| E | 7 | 제목(2행)과 15행 요약, 본문 21~108행, 정리 136~142행이 같은 질문을 향한다. description(5행)이 약속한 '빌린 용량의 지연 값'은 59행 TBD, 69·114행 정성 서술뿐이라 부분 미이행이다. |
| F | 4 | 19행은 fabric 메커니즘을 CXL Ch 4·13으로 넘긴다고 범위를 밝히고, 144~148행은 마지막 편으로서 Ch 1~11을 되짚는다. 같은 디렉터리에 seriesOrder 13이 없어 146행 '여기서 마칩니다'는 맞다. 틀린 라벨 둘: 152행 'Modern Embedded Recipes Ch 149~151'의 대상 `part11-15-pcie-to-cxl.md`는 seriesOrder 150이다. 161행 'Ch 9 — 이 장이 인용한 지연·대역폭 실측'인데 Ch 9 28·44행은 실측값을 TBD로 두었고 이 장의 지연 참조는 59행 Ch 10이다. 153행 Perf Ch 54, 164행 Perf Ch 29, 154행 Security Ch 11, 155행 Bootloader Ch 34, 132행 `#자주-하는-실수` 앵커(CXL Ch 4 142행)는 맞다. 두 곳이 틀린 라벨 규칙에 걸려 4. |
| G | 2 | 91행 'Meta의 TPP 연구', 108행 'Microsoft Azure의 Pond'를 이름으로만 든다. 학회·연도(ASPLOS 2023)나 링크가 없다. 55~57행 CXL 버전별 주장에 스펙 절·컨소시엄 자료 출처가 없고, 40행 HBM 대역폭에 세대 표기가 없다. CXL Ch 4 185행 같은 자료 출처 문장도 없다. |

uncertainties:
- 40행 'HBM은 stack 하나가 수백 GB/s~1 TB/s대': HBM3E stack 대역폭이 1 TB/s를 넘는 제품이 있어 상단이 맞는지 JEDEC·제조사 자료로 확인하지 않았다.
- 40행 'PCIe 5.0 x16 원시 전송률 64 GB/s'에 한 방향 표기가 없다. Ch 9 44행은 '(한 방향)'을 적었다.
- 91·108행 TPP·Pond 수치는 9ad745f7 기록상 논문과 대조됐지만 이번에 논문을 다시 열지는 않았다.
- 122행 MLD 할당 단위 낭비 주장에는 LD 개수·크기 근거가 없다. 스펙 절은 확인하지 않았다.

병합 대상: `src/content/blog/embedded/hardware/cxl/chapter04-pooling-gfam.md`(3단계 표, NVLink 오해, Pond·TPP 수치가 겹친다). 다음 조치는 보강이다. 이 글에는 독립 검색 의도(HBM 용량 상한, 대역폭과 용량 축의 분리, 동시 peak 기준 조달)가 있고 시리즈 마지막 장이라 URL을 유지할 이유가 있다. 53~63행 3단계 표와 128~130행 NVLink 절은 CXL Ch 4 링크로 줄이고, 59행 TBD 지연은 Ch 10 실측 인용으로 채우고, 91·108행에 ASPLOS 2023 출처를 본문에 달고, 152·161행 링크 라벨을 고친다.

### `industrial-ethernet/chapter01-overview.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 불일치(rubric 3-1). 64행 'Hard (motion): 250 μs cycle, 64 byte × 32 축 → 대역폭 8 Mbps'는 64 × 32 = 2048 B, 2048 × 8 bit / 250 μs ≈ 65.5 Mbps라 8 Mbps가 될 수 없다(약 8.2 MB/s를 bit로 잘못 적음). 바로 아래 65행 '1 ms cycle, 256 byte × 100 노드 → 대역폭 200 Mbps'는 25,600 × 8 bit / 1 ms ≈ 204.8 Mbps로 bit 단위 계산이 맞는다. 같은 블록의 두 줄이 같은 계산법으로 동시에 참일 수 없다. git 이력: 80cb602e(작성), 8d58ed3a 'tier-1 retroactive audit'(회사별 채택 매핑을 일반 표현으로 바꿈, 1차 자료 이름 없음), 0a9dd7bc·be973200·ac24bb76(메타데이터·제목). 이 오류가 없었다면 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 71~99행이 결정성 전략 네 가지(master polling·TDMA·priority queue·시계 동기)를 세우고 99행에서 'EtherCAT은 1번+4번, PROFINET IRT는 2번+3번+4번'으로 표준을 전략에 대응시킨 것이 이 글만의 틀이다. 132~146행 '자주 하는 오해' 네 개도 관점이 있다. 그러나 29~34행 비결정성 표, 54~58행 Soft/Firm/Hard 표, 103~109행 5대 표준 표는 입문 자료의 표준 목록이다. 38~46행 ping latency 분포는 출처·측정 환경이 없다. 113행 '공개 자료 한정적이므로 spec 카탈로그에서 직접 확인하는 게 안전합니다'는 구체 주장을 완곡 표현으로 바꾼 일반론이다. |
| B | 12 | 문제(19행 250 μs 로봇 예) → 표준 Ethernet 한계(23~48행) → 시간 등급(50~69행) → 네 전략(71~99행) → 표준 비교(101~113행) → 로드맵(115~128행) → 오해(130~146행) → 정리(148~156행)로 흐름은 완성됐다. 허브 역할은 불완전하다. 119~126행 로드맵이 Ch 1~6만 적어 실제 12편 중 chapter07~12가 빠졌고 링크도 없다. 64행 산술 오류와 57행 vs 65행 Firm 사이클 불확실이 열려 있어 AP-C-24에 따라 13 이하. |
| C | 3 | 코드, 명령, 측정 절차가 없다. 38~46행 latency 분포(평균 80 μs, p99.99 3.2 ms, 최대 12 ms)와 62~67행 '실제 예' 트래픽 구성은 출처·측정 환경 없는 수치라 C ≤ 8 상한에 걸리고 64행은 산술도 틀렸다. 독자가 따라 해 볼 검증 방법이 없어 0~3 구간. |
| D | 10 | 같은 시리즈: `chapter02-realtime-requirements.md` 23~32행 cycle time 표가 이 글 54~58행과 같은 질문을 다루고, 이 글 136~138행 'PREEMPT_RT만 켜면 hard real-time이다'는 ch2 200~202행과 같은 논지다. `chapter12-comparison.md` 23~33행 비교표는 이 글 103~109행 표(12.5 μs·31.25 μs·100 μs 등 같은 값)를 확장한다. `chapter08-tsn.md` 21행이 이 글 111·142행 TSN 언급을 깊게 다룬다. 다른 시리즈: `rtos/practical-internals/part5-07-preempt-rt-linux.md` 178·187행, `part5-05-selection-guide.md` 208행은 EtherCAT 한 줄 언급, `can-bus/chapter01-overview.md` 145행은 이 글로 가는 링크, `embedded-serial/chapter09-rs232-rs485.md` 172~174행은 PROFINET 한 단락이라 겹치지 않는다. 전략 분류(71~99행)는 구별되지만 표 세 개가 ch2·ch12와 반복된다. |
| E | 7 | 제목 '일반 이더넷과 결정성 요구의 차이'와 description '왜 표준 Ethernet으로 부족한가'에 23~48·50~69·134행이 직접 답한다. 과장은 없다. 101~128행 표준 비교·로드맵은 제목에 없는 시리즈 개관이고 대상 독자·전제 지식이 없다. |
| F | 4 | 158행 다음 편 안내(Ch 2)는 seriesOrder 2 `chapter02-realtime-requirements.md`와 맞고, 162·163행 링크도 대상 제목과 맞는다. 그러나 165행 라벨 'Modern Embedded Recipes Part 4.6: IRQ affinity'는 `part7-13-irq-affinity.md`(seriesOrder 87)로 가서 번호가 틀렸다. 138행 'PREEMPT_RT 설정 자체는 [Practical RTOS Internals Part 1.4: Preemption]에서 다룹니다'와 164행 대상 `part1-04-preemption.md`는 preemptive·cooperative 비교 글이고 PREEMPT_RT 언급이 0건이다. 틀린 링크 설명 두 건으로 F ≤ 5, 허브인데 119~126행 로드맵이 12편 중 6편만 적고 링크가 없어 4점. |
| G | 1 | 출처는 166·167행 ETG·PROFINET International 홈페이지 두 개뿐이고 특정 주장과 이어지지 않는다. 95·97행 'IEEE 1588 PTP', '802.1AS'는 판이 없다. 105~109행 최소 사이클, 38~46행 latency 분포, 146행 'Security extension 추가하는 중'에 출처·기준 시점이 없다. |

uncertainties:
- 57행 표는 Firm real-time 사이클을 10~100 ms로 적었는데 65행 예는 'Firm (PLC I/O): 1 ms cycle'이다. 표는 범위 예시, 65행은 사례라 모순으로 단정하지 않았다. ch2 30행은 일반 PLC I/O를 1~10 ms로 적었다.
- 105~109행 최소 사이클(EtherCAT 12.5 μs, PROFINET IRT 31.25 μs, POWERLINK 100 μs, SERCOS III 31.25 μs)은 ETG·PI·EPSG·sercos 1차 자료로 확인하지 않았다.
- 107행 EtherNet/IP '1 ms (CIP Motion)'와 `chapter12-comparison.md` 26행 '1 ms (CIP Sync)'는 표기가 다르다. 글 사이 차이라 ODVA 자료로 정해야 한다.
- 109행 SERCOS III 주도를 'Bosch Rexroth'로 적었는데 거버넌스 단체(sercos international)와 구분되는지 확인하지 않았다.
- 38~46행 ping latency 분포는 출처·측정 환경이 없다.
- 19행 'TCP의 재전송 100 ms'는 RTO 기준 출처가 없다(Linux 기본 RTO 최솟값 200 ms, RFC 6298 권장 1 s와 다를 수 있음, 미대조).
- 146행 'Security extension을 추가하는 중'은 진행형이라 CIP Security 등 현재 상태 대조가 필요하다.
- 142행 'EtherCAT over TSN 흐름'의 근거 자료가 없다.

병합 대상: 해당 없음. 점수 구간은 병합 검토(40~59)지만 시리즈 첫 글·허브라 허브 규칙상 보강 대상이고, 오류 확인 때문에 판정은 우선 조치다. 64행 산술을 고친 뒤 119~126행 로드맵을 12편 전체와 링크로 채우고, 164·165행 관련 링크를 고친다.

### `industrial-ethernet/chapter02-realtime-requirements.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순(rubric 3-1). 34행 'cycle time을 물리 시정수의 1/10 이하로 잡는 것이 일반 원칙입니다. 시정수 1 ms인 서보를 250 μs cycle로 도는 이유가 여기 있습니다' — 1 ms의 1/10은 100 μs이고 250 μs는 1/4이다. 같은 글 41행은 250 μs를 '시정수의 1/4'로 적는다. 표 28행(시정수 100 ms → 10~50 ms, 최대 1/2)과 29행(10 ms → 1~10 ms, 최대 1/1)도 219행 정리의 '1/10 이하' 원칙과 동시에 참일 수 없다. git log(0a9dd7bc slug 고정, 2343c401 태그 정리 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 65~72행 jitter 예산 표(표준 Ethernet·EtherCAT DC·PROFINET IRT를 원천별로 비교), 38~42행 서보 1 ms 예의 cycle time 기준 표, 104~108행 PTP 오프셋·지연 식과 대칭 가정, 116~148행 `ethtool -T`·`ptp4l` 출력 해석은 이 글만의 내용이다. 그러나 25~32행 권장 cycle, 52~56행 jitter 영향 단계, 154~157행 BC/TC 정확도가 모두 출처 없는 단정이고, 34행 원칙이 같은 줄 예와 28~30행 표와 맞지 않는다. 215행 '더 나빠질 수 있습니다. 실제 측정이 필수입니다'는 구체 기준 대신 완곡 표현이다. 13~19 구간 하단. |
| B | 12 | cycle time(21~42행) → jitter(44~59행) → 예산 분해(61~74행) → PTP(76~159행) → EtherCAT DC(161~175행) → TDMA(177~185행) → 동기 방식 비교(187~197행) → 함정(199~215행) → 정리(217~226행)로 흐름은 갖췄다. 그러나 description(5행)의 Soft·Firm·Hard 등급은 본문에 없고(chapter01 50~58행에 있음), 108행 비대칭 오차는 크기·보정 없이 한 문장으로 끝난다. 221행은 원천을 '네' 개라 하지만 65~71행 표는 다섯 행이다. 34행 모순 등 정확성 문제가 열려 있어 B ≤ 13. |
| C | 7 | 118행 `ethtool -T eth0`, 137행 `ptp4l -i eth0 -s -m`과 예시 출력, 148행 '100 ns 안쪽이면 정상' 판정 기준이 있어 따라 할 단서는 있다. 그러나 NIC 모델·커널·linuxptp 버전·망 구성이 없고 139~145행 출력이 실측인지 예시인지 밝히지 않는다. 65~72·154~157·189~195행 수치가 출처·환경 없는 구체 수치라 C ≤ 8. 215행 `ec_dcsync0`/`ec_DCtime` 로깅은 절차·기대값이 없다. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter01-overview.md`, `chapter03-ethercat-architecture.md`, `chapter08-tsn.md`, `chapter09-tsn-scheduling.md`, `chapter10-powerlink.md`, `chapter11-linux-realtime.md`, 다른 시리즈 `rtos/practical-internals/part2-11-tracing-observability.md`(255행은 다음 편 예고뿐). 이 글 161~175행 DC 절 ↔ chapter03 127~144·198~200행(chapter03 129행은 원리를 Ch 2에 미룸). 177~185행 POWERLINK TDMA ↔ chapter01 81~85행, chapter10 46~50행 이후. 201~203행 PREEMPT_RT 함정 ↔ chapter01 136~138행. 76~108행 PTP 메시지 ↔ chapter08 50~67행(gPTP P2P로 차별). 116~148행 `ethtool -T`·`ptp4l` ↔ chapter09 125~154·335~345행(gPTP 설정·phc2sys로 확장). 정량 jitter 예산·PTP 기본 원리 역할은 구별되어 10~14 구간 하단. |
| E | 5 | 제목(2행)의 Determinism·Jitter·Cycle Time은 21~74행에서 다룬다. description(5행) 'Soft·Firm·Hard real-time — 산업 자동화의 시간 등급'은 본문 어디에도 없고 chapter01 50~58행 절의 내용이다. 본문 절반인 PTP·DC·TDMA(76~197행)는 제목·description에 없다. 3~5 구간. |
| F | 5 | 228행 다음 편 'Ch 3: EtherCAT 아키텍처 — Processing on the Fly'는 seriesOrder 3 `chapter03-ethercat-architecture.md`와 맞다. 232행 Ch 1, 233행 Ch 3, 234행 `part1-04-preemption`('Preemption과 Cooperation') 라벨은 대상과 맞다. 235행 'Modern Embedded Recipes Part 4.6: IRQ affinity'는 `part7-13-irq-affinity.md`(seriesOrder 87)로 가 번호 라벨이 틀렸다. F ≤ 5. 전제 지식 안내 없음. |
| G | 2 | 236~237행 IEEE 1588-2019·linuxptp 링크는 관련 항목 목록에만 있고 104~105행 식, 154~157행 정확도, 167~171행 DC 절차와 연결되지 않는다. linuxptp·커널·NIC 버전, ETG 문서 출처가 없다. |

uncertainties:
- 167~171행 DC 절차(BRD 0x900 → ARMW로 offset 분배)는 chapter03 131~134행(BWR latch → BRD → ARMW로 reference 시각 분배)과 다르다. 다른 글과의 모순이라 ETG.1000으로 확인 필요.
- 59·220행은 worst-case를 p99.9 백분위와 같은 것으로 쓴다. 개념 충돌 의심, 1차 자료 미확인.
- 40행 'Nyquist: 시정수 1 ms → 최소 샘플 500 μs'는 시정수를 주파수처럼 다룬 근거가 없다.
- 154~157행 BC <100 ns/hop·TC <30 ns/hop, 69행 5~50 μs/hop, 70행 <100 ns는 출처 없는 수치다.
- 207행 'NTP는 소프트웨어, PTP는 하드웨어'는 PTP 소프트웨어 타임스탬프 모드(122·124행 software-transmit/receive)와 맞지 않는 단순화로 보인다.
- 215행 SOEM `ec_dcsync0`·`ec_DCtime` 심볼은 upstream으로 확인하지 않았다.
- 139~145행 ptp4l 출력이 실측인지 예시인지 표시가 없다.

병합 대상: 점수 구간은 병합 검토지만 오류 확인으로 판정은 우선 조치다. 구간 기준 병합 후보는 절 단위다. DC 절(161~175행)은 `chapter03-ethercat-architecture.md` 127~144행, TDMA 절(177~185행)은 `chapter10-powerlink.md`, `ethtool`/`ptp4l` 절(116~148행)은 `chapter09-tsn-scheduling.md` 125~154행과 겹친다. 글 전체는 jitter 예산·PTP 원리라는 독립 검색 의도가 있어 다음 조치는 보강이다. 34·28~30행 원칙과 예의 모순 수정, description을 본문에 맞추기, 수치에 1차 출처(IEEE 1588-2019, ETG.1000, linuxptp) 연결.

### `industrial-ethernet/chapter03-ethercat-architecture.md` — 54점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(0a9dd7bc slug 고정, be973200 topic 메타데이터, e85d7684 코드 블록 산문 정리, ac24bb76 제목 변경, c38cb67c outline 변환 등)에 ETG.1000/IEC 61158, ET1100·LAN9252 데이터시트 같은 1차 자료와 본문 주장을 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 FMMU를 두는 이유를 '64개 개별 datagram 대신 한 명령'으로 푼 79·98행, 3-buffer SM의 버퍼 역할 표와 swap 설명(115~123행), '자주 하는 실수' 다섯 항목(186~204행)이다. on-the-fly·ESC·DC·ESM 설명(29~56, 127~156행)은 EtherCAT 소개 자료의 표준 목록 수준이다. 73·182행 '한국 중소 업체 LAN9252 + STM32'는 출처 없는 일반화라 고유 분석으로 보지 않았다. 6~12 구간 상단. |
| B | 13 | on-the-fly(29~56) → ESC(58~73) → FMMU(75~100) → SM(102~125) → DC(127~144) → ESM(146~172) → 생태계(174~182) → 실수(184~204) → 정리(206~215) 순으로 제목 범위를 끝까지 다룬다. 다만 64행 '대표는 두 가지'인데 66~71행 표는 네 칩이고, 133행(각 ESC가 delay를 빼 offset 계산)과 136행(마스터가 delay를 계산해 ARMW에 실음)의 계산 주체가 엇갈리며, 명령 코드(91·98·131~133행)·12.5 μs 등 정확성 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 5 | 재현 가능한 절차·코드·관찰 결과가 없다. 81~96행 FMMU 매핑은 설명용 주소 예이고 실제 레지스터 설정은 없다. 27·47행 '64 slave × 4 byte 기준 12.5 μs', 54행 '<<1 μs', 140~141행 '<100 ns / 1~5 μs', 182행 '연회비 약 1500 EUR'는 출처·측정 환경이 없는 수치라 C ≤ 8. 링크 속도를 적지 않아 12.5 μs를 검산할 수 없다. 4~7 구간. |
| D | 9 | (1) DC 절 127~144행 vs `chapter02-realtime-requirements.md` 161~175행: 첫 슬레이브 reference, BRD/ARMW 분배, 64축 동시 동작, 마스터 OS jitter에 둔감하다는 결론(144·200행 ↔ ch02 173·175행)이 같고 절차 단계는 서로 다르다. (2) FMMU 절 81~98행 vs `chapter04-ethercat-frame.md` 142~166행: 슬레이브별 FMMU → DPRAM 0x1000/0x1010 매핑과 'LRW 한 번으로 자기 슬롯만 R/W' 결론이 같다(논리 주소·DPRAM 배치는 반대). (3) ESC 칩 표 66~71행 vs `chapter05-ethercat-master.md` 276~283행. `chapter01-overview.md` 79·105행도 on-the-fly와 12.5 μs를 먼저 말한다. 다른 시리즈 `rtos/practical-internals/part5-05`·`part5-07`, `modern-recipes/part7-13`, `can-bus/chapter01`(145행 링크)·`chapter12`(24·206행)는 EtherCAT을 이름만 언급한다. SM 3-buffer·ESM 절은 이 글에만 있다. 5~9 구간. |
| E | 7 | 제목 'EtherCAT 아키텍처 분해 — Processing on the Fly 메커니즘'과 description(2·5행), 도입(17~19행), 정리(208~214행)가 같은 주제를 향한다. 그러나 '메커니즘'을 약속한 on-the-fly 절(50~56행)은 기차 비유와 세 줄 이유뿐이고, 포트 forwarding 지연·비트 스트림 처리는 54행 한 문장이다. |
| F | 6 | 217행 다음 편 'Ch 4: EtherCAT 프레임 — Datagram·WKC'는 seriesOrder 4 `chapter04-ethercat-frame.md`와 맞고, 안내한 명령 코드·WKC·mailbox도 ch04에 있다. 221~223행 slug는 세 파일과 일치하지만 라벨이 제목 변경(ac24bb76) 전 형태다. 223행 'EtherCAT Master/Slave — SOEM·IgH' vs 실제 'EtherCAT Master 구현 비교 — SOEM·IgH·TwinCAT 분석', 221행 'Determinism·Cycle Time' vs 'Determinism·Jitter·Cycle Time'. 주제가 틀린 라벨은 아니라 F ≤ 5까지는 아니다. 125·129행이 앞뒤 글을 직접 가리킨다. 160~170행 초기화 흐름이 굵은 문단+빈 줄로 깨진 outline 변환 흔적이고 전제 지식 안내가 없다. |
| G | 2 | 출처는 224~225행 ETG 홈페이지와 LAN9252 제품 페이지 두 링크뿐이고 본문 주장과 연결되지 않는다. 176·214행 'IEC 61158/61784'는 part·판 번호가 없고, ETG.1000이나 ET1100 데이터시트 판 표기가 없다. 66~71행 칩 사양, 91·98·131~133행 명령 코드에도 출처가 없다. |

uncertainties:
- 91행 'LWR=0x08', 131행 'BWR (0x05)': ch04 55~66행 표와는 일치하지만 기억으로는 ETG.1000 기준 BWR 0x08, LRD 0x0A, LWR 0x0B, FPWR 0x05다. 이 글 평가에서는 1차 자료를 열지 않아 오류 확인으로 올리지 않았다(같은 루프의 ch04 평가에서 SOEM v1.4.0 `ec_cmdtype`으로 ch04 표의 오류를 확인했다).
- 27·47행 '64 slave × 4 byte = 12.5 μs': 100 Mbps면 256 byte payload만 약 20 μs라 성립하지 않아 보이나 글이 링크 속도를 적지 않아 내부 산술 모순으로 확정하지 않았다.
- 64행 '대표는 두 가지' vs 66~71행 네 칩(산문 개수 실수, 오류 확인 대상 아님).
- 133행과 136행의 delay 계산 주체: 마스터가 delay를 레지스터에 쓰고 ESC가 적용하는 식이면 양립 가능해 모순으로 확정하지 않았다.
- 131~134행 DC 절차(BWR latch → BRD → ARMW)와 chapter02 167~171행(BRD 0x900 → offset 계산 → ARMW) 단계가 다르다. ch02의 'BRD(0x900)'은 레지스터 주소를 명령처럼 쓴 것으로 보인다.
- 92~94행 output → DPRAM 0x1000, input → 0x1010 배치가 ch04 152~159행과 반대다. 실제 SM 기본 주소와 대조하지 않았다.
- 25행 termination을 '접지'로 옮긴 표현, 55행 '최소 84 byte, 최대 1500 byte', 176행 '2003년 발표, 같은 해 ETG 양도', 182행 'ETG 연회비 약 1500 EUR'(가입 무료로 알려져 있음)는 확인하지 않았다.
- 69행 LAN9252 'ET1100 호환·바이너리 호환'(73행), 71행 'ESC20 ETG FPGA reference', AX58100 사양은 데이터시트로 확인하지 않았다.
- 204행 '일반 1 Gbps NIC로 동작'은 EtherCAT 링크가 100 Mbps라는 점 없이 서술됐다.

병합 대상: 병합 대상 없음. ESC·FMMU·SM·DC·ESM을 묶은 'EtherCAT 아키텍처'는 독립 검색 의도가 있고 SM 3-buffer·ESM 절은 다른 글에 없다. 다음 조치는 보강이다. DC 절차는 chapter02 161~175행, FMMU 매핑 예는 chapter04 142~166행, ESC 칩 표는 chapter05 276~283행과 겹치므로 한 곳에 두고 나머지는 링크로 바꾼다. 명령 코드·칩 사양·12.5 μs 수치를 ETG.1000·ET1100/LAN9252 데이터시트로 대조해 고치거나 지운다.

### `industrial-ethernet/chapter04-ethercat-frame.md` — 55점, 우선 조치

confidence: 높음

factcheck: 오류 확인. git log에 1차 자료 대조 커밋이 없다(80cb602e 집필, a0f21c45·49f2a443·c38cb67c·e85d7684 서식, ac24bb76 제목 변경, be973200·0a9dd7bc 메타데이터). 재검에서 SOEM v1.4.0 원문을 직접 열었다.
- 명령 코드: `soem/ethercattype.h` 225~253행 `ec_cmdtype`은 NOP 0x00, APRD, APWR, APRW, FPRD, FPWR 0x05, FPRW 0x06, BRD 0x07, BWR 0x08, BRW 0x09, LRD 0x0A, LWR 0x0B, LRW 0x0C, ARMW, FRMW 순서다. 이 글 60행 'BWR 0x05', 62행 'LWR 0x08', 63행 'LRD 0x09', 64행 'FPWR 0x0A', 65행 'FPRW 0x0B', 278행 'LRD(0x09), LWR(0x08), BWR(0x05)'가 틀렸다.
- chain 표시 비트: 같은 파일 135행 `EC_DATAGRAMFOLLOWS (1<<15)`는 `ec_comt.dlength`의 bit다. 46행 'IRQ Bit (16b): 0=마지막 datagram, 1=뒤에 datagram 더 있음'이 틀렸고 130행 'Len/Flags 필드의 M bit(bit 15)'가 맞다. 46행과 130행은 글 안에서도 서로 모순이다.
- mailbox header: `soem/ethercatmain.h` 316~322행 `ec_mbxheadert`는 uint16 length + uint16 address + uint8 priority + uint8 mbxtype = 6 byte인데 198행은 'Mailbox header (10 byte)'라 한다.
- 내부 모순: 272행 '1500 − header 2 − overhead 14'는 1484인데 1486이라 적었다(SOEM `ethercattype.h` 54행 `EC_MAXLRWDATA` = 1518−14−2−10−2−4 = 1486). 105행 바이트 '0000 0010'·'0010'을 115행이 쓴 little-endian으로 읽으면 0x10000000·0x1000인데 121·122행은 0x00000010·length=16으로 풀었다. 47행 '슬레이브들이 각자 1씩 증가'·279행 'WKC는 처리된 슬레이브 수를 누적'은 89행 'Read+Write 성공 +3'·92행 '16개 슬레이브 → 기대 WKC 48'과 동시에 맞을 수 없다. 104·105행 dump offset(0x0000/0x0010, 104행 14 byte, 105행이 EtherCAT header `1c10`로 시작)은 115행 '[0x0E] EtherCAT Header'·119행 '[0x10] Cmd'와 맞지 않는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 고유한 부분은 hex dump 바이트 해석(101~128행), WKC 기대값 계산(85~97행), 4-datagram chain 예(132~138행), '자주 하는 실수' 다섯 개(254~272행, 특히 256행 FMMU 오매핑에도 WKC가 증가한다는 지적)다. 명령 코드표(53~68행), mailbox 다섯 종 표(172~178행), CiA 402 객체 목록(183~189행)은 ETG·CiA 자료 요약이고 고른 기준이 없다. 명령 코드 다섯 개, mailbox header 크기, dump 해석이 1차 자료나 글 자체와 어긋나 해석의 신뢰가 떨어진다. 6~12 구간 상단. |
| B | 11 | 흐름은 Ethernet 헤더 → EtherCAT 헤더 → datagram → 명령 → WKC → dump → FMMU → mailbox → 실수 → 정리(21~283행)로 갖춰졌다. 그러나 FoE 절(224~243행)은 1~7단계 굵은 제목만 있고 본문이 없다. 192행 '0x6040에 0x0F를 쓰면 Operation Enabled'는 상태 전이 순서를 건너뛴다. 46·130행 chain 표시 필드가 충돌하고, 47행 '각자 1씩'과 89행 '+3'도 충돌한다. AP-C-24에 따라 B ≤ 13. |
| C | 6 | 101행 tcpdump 명령과 103~126행 dump·해석이 있어 형태상 관찰 결과가 있다. 그러나 MAC 01:02:03:04:05:06(113행)과 0으로 채운 데이터로 만든 예시이고 캡처 환경(마스터·슬레이브 구성, NIC)이 없다. 104·105행 offset 표기가 115행과 맞지 않고 105행 바이트와 121·122행 해석도 어긋난다. 79·140행 '12.5 μs cycle'과 128행 '16 slave × 3'은 출처·환경 없는 수치라 C ≤ 8. 97행 FPRD polling은 절차 없이 한 줄이다. |
| D | 11 | 같은 시리즈 `chapter03-ethercat-architecture.md` 75~97행에 FMMU 논리 → DPRAM 매핑 예가 이미 있는데 이 글 142~166행이 같은 형식으로 다시 쓴다. ch03 125행은 mailbox를 'Ch 4에서 다룹니다'라고 넘겨 역할 분담은 맞다. `chapter05-ethercat-master.md` 125~149행(SOEM WKC 검증)과 408행('WKC가 expected의 절반이다')은 이 글 85~97행 WKC 개념의 응용이라 일부만 겹친다. 다른 시리즈 `rtos/practical-internals/part5-07-preempt-rt-linux.md`·`part5-05-selection-guide.md`는 EtherCAT을 1~2회 언급할 뿐이고 `can-bus/chapter12-debugging.md`는 draft다. 10~14 구간. |
| E | 7 | 제목 키워드 Datagram·WKC·Address 모드는 38~97행에서 모두 다룬다. 주소 모드 절(70~75행)은 '세 가지'라 하고 네 개를 나열하며, 명령 코드표 오류로 주소 모드와 코드의 대응이 어긋난다. 본문 큰 비중인 mailbox(168~250행)는 제목에 없다. description(5행)은 21~36행 정도만 가리킬 만큼 좁다. |
| F | 6 | 285행 다음 편 안내는 seriesOrder 5 `chapter05-ethercat-master.md`와 맞고, 예고한 ESC 칩 선택(ch05 274행)과 ENI/ESI(ch05 339행)도 실제로 있다. 289~291행 관련 링크 라벨은 ch03·ch05·ch06 제목과 맞다. FoE 절(224~243행)이 빈 단계 제목이라 읽기가 끊기고, 전제 지식(ch03 FMMU·SM) 안내가 없다. 템플릿 TOC·관련 항목만으로는 6점을 넘지 않는다. |
| G | 2 | 292·293행 Wireshark wiki와 CiA 402 링크는 글 끝 목록일 뿐이고 명령 코드·헤더 비트·WKC 규칙에 연결되지 않는다. ETG.1000 판이나 SOEM·IgH 버전 표기가 없다. 244행 `ec_FOEwrite()`도 버전 없이 이름만 나온다. |

uncertainties:
- 70행 '핵심 패턴은 세 가지'라 하고 AP·FP·L·B 네 개를 나열한다(개수 표기 실수라 오류 확인에 넣지 않음).
- 88행 Write +1, 89행 RW에서 write +2의 WKC 규칙은 ETG.1000으로 확인하지 않았다.
- 92행 '16개 슬레이브 × 4 byte LRW'(64 byte)와 124·128행 dump(data 16 byte, 응답 WKC 48)가 같은 구성을 가정하는지 불분명하다.
- 79·140행 '12.5 μs cycle'은 출처가 없는 수치다.
- 192행 '0x6040에 0x0F를 쓰면 Operation Enabled'는 CiA 402 상태 전이를 생략한 것으로 보이나 CiA 402 원문은 확인하지 않았다.
- 222행 'FoE는 Bootstrap 상태에서만 동작'은 ETG 문서로 확인하지 않았다.
- 36행 Type=0x4 Network Variables, Type=0x5 Mailbox 값은 1차 자료로 확인하지 않았다(SOEM `ethercattype.h` 60행 `EC_ECATTYPE 0x1000`은 Type=0x1만 뒷받침한다).
- 264행 'mailbox는 cycle 안에서 우선순위가 낮다'는 근거가 없다.

병합 대상: 점수 구간은 병합 검토지만 오류 확인 때문에 판정은 우선 조치다. 병합 대상 없음. 시리즈에서 프레임·WKC·mailbox를 다루는 글은 이 글뿐이고 ch03(아키텍처)·ch05(마스터 구현)와 역할이 나뉜다. 다음 조치는 보강이다. 명령 코드표(60~65행)와 278행을 SOEM `ec_cmdtype`이나 ETG.1000에 맞춰 고치고, 46행 IRQ 설명, 198행 mailbox header 크기(6 byte), 272행 overhead 산술, 104~122행 dump offset과 바이트 순서, 47·279행 WKC 증가 설명을 바로잡는다. 그다음 142~166행 FMMU 예를 ch03과 정리하고, 비어 있는 FoE 단계(224~243행)를 채우거나 지운다.

### `industrial-ethernet/chapter05-ethercat-master.md` — 54점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 세 가지(rubric 3-1).
- 코드와 출력: 64~138행 SOEM 코드의 printf는 'ec_init succeeded'(83행), '%d slaves found'(91행), 실패 메시지(80·87·117행), WKC mismatch(127행)뿐이다. 그런데 155~168행 '실행 예'는 'Slave 1: EK1100 …'(159~162행), 'SM/FMMU configured, IOmap size = 16 bytes'(163행), 'DC sync configured for 2 slaves'(164행), 'Reached OP state'(165행), 'cycle 250: data = …'(166행)을 출력한다. 코드로는 나올 수 없다. 62행은 슬레이브 '한 개' 예제라는데 158행은 '4 slaves found'다.
- SM3: 410행 'SM3(output) 설정을 확인합니다' vs 320행 ESI 예 `<TxPdo … Sm="3">`(Name Input, 319·327행 Inputs). 같은 글 안에서 SM3이 입력에 쓰인다.
- 산술: 408행 제목 'WKC가 expected의 절반이다' vs 410행 'input만 처리해서 +1, output은 +2를 못 더해 +1만 됩니다'. 글의 설명대로면 기대 3 중 1(1/3)이라 절반이 아니다.

git 이력: 0a9dd7bc(slug), be973200(topic 메타데이터), 8d58ed3a(회사별 채택 사례를 일반 표현으로 바꿈, 1차 자료 대조 기록 아님), ac24bb76(제목), 3a5602d3·a0f21c45(다이어그램), 80cb602e(최초 작성), 400892d7·09a00a29(일괄 정리). 구체 주장을 1차 자료와 대조한 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 세 마스터 비교표(23~31행)와 용도별 선택(35~37행), SOEM 최소 마스터 코드(64~138행), `clock_nanosleep` 절대 시각 루프(175~192행), ESC 칩 표(278~285행), ESI·ENI XML 예(297~378행), 현장 함정 5개(400~418행)로 이 글만의 구성은 있다. 다만 28~29행 cycle·LoC, 194행 '±10 μs', 272행 '프로젝트당 수백만 원'은 출처가 없고, 39행은 '비공개 정보가 많음 … 공식 발표·기술 자료 기반 권장'이라는 완곡 표현으로 구체 주장을 대신한다. 직접 측정·실패 사례가 없어 13~19 구간 하단. |
| B | 12 | 비교 → SOEM 빌드·코드 → IgH(196~251행) → TwinCAT(253~272행) → ESC·ESI·ENI·EEPROM(274~396행) → 함정 → 정리(420~429행) 흐름은 끝까지 간다. IgH 예제는 236행 'PDO 매핑 등 설정 생략'이라 그대로는 process data를 주고받지 못한다. TwinCAT 절은 텍스트 블록과 두 문단뿐이다. 내부 모순 세 가지와 정확성 불확실(358행 LRW 코드, 384행 EEPROM)이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 6 | 빌드 명령(47~56·206~218행), 컴파일 명령(151행), CAP_NET_RAW 안내(402행)는 있다. NIC·커널·SOEM 버전 같은 실행 환경이 없다. 155~168행 '실행 예'는 위 코드로 나올 수 없는 출력이라 관찰 결과로 인정할 수 없다. 28행 cycle 수치와 194행 '±10 μs'는 출처·환경 없는 수치라 C ≤ 8이고, 출력 불일치 때문에 더 내렸다. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter04-ethercat-frame.md`(4), `chapter06-profinet.md`(6), `chapter03-ethercat-architecture.md`(3), `chapter11-linux-realtime.md`(11). 다른 시리즈는 SOEM·ecrt_·EtherCAT master 검색에서 `modern-recipes/part7-13-irq-affinity.md`만 걸렸고 IRQ affinity만 다뤄 겹치지 않는다. 이 글 206~218행 IgH 설치와 224~249행 ecrt 루프가 chapter11 270~285행 configure·make, 311~341행 `ecrt_request_master` → receive/process/queue/send 루프와 거의 같다. 17행 '일반 NIC + Linux PC면 충분'은 chapter03 202~204행과 같은 주장이다. 405~410행 WKC 설명은 chapter04 81~97행과 일부 겹친다. 세 마스터 비교, SOEM 코드, ESI·ENI 절은 이 글에만 있다. |
| E | 6 | 제목 'EtherCAT Master 구현 비교 — SOEM·IgH·TwinCAT 분석'(2행)과 description '오픈소스와 상용 master 구현'(5행)은 23~37행 비교표와 세 절로 이행된다. 본문 약 1/3(274~396행)이 슬레이브 ESC·ESI·EEPROM이라 제목·description 밖이다(19행이 예고는 한다). TwinCAT(253~272행)은 다른 둘보다 얇다. 6~8 구간 하단. |
| F | 5 | 431행 다음 편 'Ch 6: PROFINET 개요 — RT·IRT 클래스'는 seriesOrder 6 `chapter06-profinet.md`와 맞다. 435~437행 Ch 3·4·6 라벨과 438행 'Practical RTOS Internals Part 1.4: Preemption'(`part1-04-preemption.md`, seriesOrder 4)은 대상과 맞다. 439행 'Modern Embedded Recipes Part 4.6: IRQ affinity'는 `part7-13-irq-affinity.md`(seriesOrder 87)로 가서 번호 라벨이 틀렸다. F ≤ 5. 전제 지식 안내는 없다. |
| G | 2 | 본문 출처는 SOEM GitHub(48·440행), EtherLab IgH(207·441행) 저장소 링크뿐이고 버전·대조 날짜가 없다. 278~285행 ESC 칩 수치에 데이터시트 인용이 없고, 386~394행 EEPROM 배치에 ETG.1000 인용이 없다. |

uncertainties:
- 358행 ENI 예 `<Cmd>10</Cmd> <!-- LRW (0x0A?) -->`: 글 스스로 물음표를 달았고 chapter04 66·77행은 LRW를 0x0C, 0x0A를 FPWR로 적는다. 글 사이 차이라 ETG.1000으로 확인 필요.
- 384행 '외부 SPI EEPROM (보통 16~64 KB)': ESC EEPROM 인터페이스(I2C 여부)와 용량 단위(Kbit 여부), 388~393행 오프셋 단위(byte/word)를 ESC 데이터시트로 확인하지 않았다.
- 235·307행 EL1004 ProductCode 0x044C2C52를 Beckhoff ESI와 대조하지 않았다. chapter11 324행은 다른 코드 0x07d83052를 쓴다(대상 슬레이브는 다를 수 있음).
- 406행 'NIC가 promiscuous mode가 아니면 슬레이브 0개': SOEM이 소켓 오픈 시 promiscuous를 직접 설정하는지 확인하지 않았다.
- 414행 'SOEM의 ec_send_processdata가 ARMW를 자동 처리': SOEM 소스로 확인하지 않았다.
- 418행 `ec_ENI` 별도 라이브러리 존재 여부를 확인하지 않았다. 380행 'SOEM은 ENI를 명시적으로 안 씁니다'와 418행 '원칙적으로는 호환'의 관계도 불분명하다.
- 425행 정리 'IgH … ±1 μs jitter'는 본문에 근거가 없는 새 수치다. 28행 cycle 최소값, 29행 LoC, 194행 ±10 μs, 272행 라이선스 비용도 출처 없는 수치다.
- 429행 한국 시장 분포는 39행이 '비공개 정보가 많음'이라 한 내용을 정리에서 단정한다.
- 278~285행 ESC 칩 표(예: ET1200 FMMU 3/SM 4, LAN9253 DPRAM 8KB)는 데이터시트와 대조하지 않았다.
- 25행 IgH 라이선스 'LGPL/GPL' vs chapter11 273행 'GPL' 표기 차이(글 사이).

병합 대상: 점수 구간은 병합 검토다. IgH 설치·ecrt 루프(206~251행)는 `chapter11-linux-realtime.md` 270~341행과 부분 병합(한쪽을 링크로 대체) 후보지만, 글 전체는 'SOEM·IgH·TwinCAT 중 무엇을 고르나'라는 독립 검색 의도가 있어 글 단위로는 병합 대상 없음. 다음 조치는 보강이다. 먼저 오류 확인 세 가지(155~168행 실행 예 출력과 코드, 410행 SM3, 408~410행 '절반' 산술)를 고치고, IgH 중복을 줄이고 비교표 수치에 출처를 단다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 관련 항목 라벨이 대상 글과 맞지 않음(F ≤ 5의 주원인, 8편): HBM Ch 8 275·278·279행, Ch 9 138행, Ch 10 197·203행, Ch 11 130·131·135행, Ch 12 152·161행, Industrial Ethernet Ch 1 164·165행, Ch 2 235행, Ch 5 439행. Ch 3 221·223행은 제목 변경 전 라벨이다. 시리즈 단위로 라벨을 대상 title·seriesOrder와 한 번에 대조해야 한다.
- 'Modern Embedded Recipes Ch 149'(실제 `part11-15-pcie-to-cxl.md`는 seriesOrder 150, 149는 `part12-13-matter-thread.md`): HBM Ch 10 203행, Ch 11 135행, Ch 12 152행. 9ad745f7이 seriesOrder와 대조했지만 이후 Recipes 재번호로 어긋났다. 평가자 grep 기준 다른 글까지 12곳이다.
- 'Modern Embedded Recipes Part 4.6: IRQ affinity'(실제 `part7-13-irq-affinity.md`, seriesOrder 87): Industrial Ethernet Ch 1 165행, Ch 2 235행, Ch 5 439행(루프 밖 ch06 243행, ch12 330행 포함 다섯 곳, 80cb602e 일괄 삽입).
- fact-check 라운드(9ad745f7) 뒤 description·관련 항목이 갱신되지 않음: HBM Ch 8 5행 '시리즈 마무리', Ch 9 5행 tier 위치(본문과 반대), Ch 10 5행·197행 'Ch 9의 수치', Ch 11 130행 'Ch 9 실측', Ch 12 161행 'Ch 9 실측'. Ch 9의 지연·대역폭 표를 TBD로 바꾼 수정이 Ch 10~12 안내 문구에 전파되지 않았다. 다른 시리즈(performance-engineering part6-05 89~96행)도 Ch 8의 수정 전 KV cache 수치를 쓴다.
- 본문 1차 출처 부재: 10편 모두 G ≤ 3이다. HBM 4편은 1차 자료 대조가 커밋 본문에만 있고 본문에는 출처 링크·판·절 번호가 없다(Ch 8 183~201행, Ch 9 50~66행, Ch 12 91·108행). Industrial Ethernet 5편은 글 끝 홈페이지 링크뿐이다(Ch 1 166~167행, Ch 2 236~237행, Ch 3 224~225행, Ch 4 292~293행, Ch 5 440~441행).
- HBM CXL 꼬리와 CXL 4.0 Internals 등 다른 시리즈의 중복: HBM Ch 9 40~42·91~93행 ↔ `cxl/chapter08-cxl-mem.md` 21~35·152~165행, Ch 10 47~53·131~138행 ↔ CXL Ch 8 메시지 표·granularity 절, Ch 11 21~29행 ↔ `cxl/chapter02-system-architecture.md` 23~27행·Recipes 11-15 46~50행·Perf 3-11 55~61행, Ch 12 53~63·128~130행 ↔ `cxl/chapter04-pooling-gfam.md` 23~33·160~162행. Sun et al. MICRO 2023 '1.35배~약 3배' 문장도 HBM Ch 10, Perf-Eng 3-12, CXL Ch 8에 반복된다. 정본을 정하고 나머지는 링크로 넘겨야 한다.
- Industrial Ethernet 시리즈 안 같은 절 반복: EtherCAT DC(Ch 2 161~175행 ↔ Ch 3 127~144행, 단계가 서로 다름), FMMU 매핑 예(Ch 3 81~98행 ↔ Ch 4 142~166행, DPRAM 배치가 반대), ESC 칩 표(Ch 3 66~71행 ↔ Ch 5 276~283행), PREEMPT_RT 오해(Ch 1 136~138행 ↔ Ch 2 201~203행), 표준 비교표(Ch 1 103~109행 ↔ ch12 23~33행).
- EtherCAT 명령 코드 오류가 시리즈에 퍼짐: Ch 4 60~65·278행(SOEM v1.4.0 `ec_cmdtype`으로 오류 확인), Ch 3 91·98·131·133행 'LWR=0x08'·'BWR (0x05)', Ch 5 358행 'LRW (0x0A?)'. `data/known-falsehoods.yaml` 등재 후보다.
- 출처·링크 속도 없는 '12.5 μs': Industrial Ethernet Ch 1 105행, Ch 2 173행, Ch 3 27·47행, Ch 4 79·140행.
- 출처·환경 없는 구체 수치로 C ≤ 8 상한: HBM Ch 8 168·183~201행, Ch 9 63행, Ch 11 55행, Industrial Ethernet Ch 1 38~46·62~67행, Ch 2 65~72·154~157행, Ch 3 27·47·140~141·182행, Ch 4 79·140행, Ch 5 28·194·425행.
- Industrial Ethernet 1차 자료 대조 이력 없음: Ch 1~5 모두 git log에 1차 자료 대조 커밋이 없다(Ch 1·5는 8d58ed3a의 회사명 일반화뿐). 이 시리즈는 `/fact-check-round`를 거치지 않았다.
- 공통 H2 뼈대 '한 줄 요약 → 본문 → 자주 하는 실수 → 정리 → 다음 편 → 관련 항목': HBM Ch 9(13·103·121·131·135행)·Ch 10·Ch 11, Industrial Ethernet Ch 2(13·199·217·230행)·Ch 3(13·184·206·219행)·Ch 4(13·252·274·287행)·Ch 5(13·398·420·433행). 9절 scaled content 기록 대상이다.

## 다음 조치

- 우선 조치(5편, 오류 확인): Industrial Ethernet Ch 4 60~65·278행 명령 코드, 46행 chain 비트, 198행 mailbox header, 272행 산술, 104~122행 dump, 47·279행 WKC 설명을 SOEM `ec_cmdtype`·ETG.1000 기준으로 먼저 고친다. 이어서 Ch 5 155~168행 실행 예와 코드, 410행 SM3, 408행 '절반', Ch 2 34·28~29·219행 cycle 원칙, Ch 1 64행 대역폭 산술, HBM Ch 9 5행 description의 tier 위치를 정정한다. 근거를 만들 수 없는 수치는 지우거나 TBD로 둔다.
- 링크 라벨 일괄 정리: 'Recipes Ch 149'(HBM Ch 10·11·12)와 'Part 4.6: IRQ affinity'(Industrial Ethernet Ch 1·2·5·6·12)를 실제 seriesOrder로, HBM Ch 8~12 관련 항목 설명을 #58 이후 내용으로, Industrial Ethernet Ch 1 138·164행 PREEMPT_RT 링크를 `part5-07-preempt-rt-linux.md`로 맞춘다.
- 병합 검토(2편): HBM Ch 12는 3단계 표·NVLink 절을 `cxl/chapter04-pooling-gfam.md` 링크로 줄이는 보강을 먼저 하고, Industrial Ethernet Ch 3은 DC·FMMU·ESC 칩 표를 ch02·ch04·ch05와 한 곳으로 정리한 뒤 명령 코드·수치를 1차 자료로 대조한다.
- 보강(3편): HBM Ch 8·10·11은 본문에 1차 출처(논문·규격 절·커널 버전)를 달고, Ch 8 description '시리즈 마무리'와 Ch 10 description의 'Ch 9 수치' 전제를 고친다.
- Industrial Ethernet 시리즈를 `/fact-check-round` 대상으로 올리고, 허브(Ch 1) 로드맵을 12편 전체와 링크로 채운다. HBM 시리즈는 fact-check 수정이 description·관련 항목·인용 글(performance-engineering part6-05)에 전파됐는지 다시 대조한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
