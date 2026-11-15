# 공개 글 AdSense 평가 — 루프 29

> **현재 점수 정본 — 2026-10-19 독립 재검토 반영.**
> [갱신 전 평가](archive/published-2026-10-12/published-loop-29.md) · [재검토 기록](double-check-loop-29.md) · [전체 요약](published-summary.md)

아래 점수·판정·A~G 근거는 재검토 결과로 함께 갱신했다. 재검토 기록 안의 “기존 보고서 수정 없음”은 검토 당시의 상태를 뜻하며, 이번 반영에서 이 정본을 갱신했다. 원문·공개 상태는 변경하지 않았다. 이전 점수·철회 근거는 비교 기록과 보관본에서 확인한다.

기준 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 10편 원문 전문과 아래 비교 범위를 직접 읽어 기존 점수를 다시 판단했다. 초벌 근거표는 확인할 위치를 찾는 참고로만 사용했다. 원문·기존 보고서·사용자 파일 수정 및 커밋 없음. 모든 점수는 잠정이다.

공통 정적검사: [double-check-gates-2026-10-18.md](./double-check-gates-2026-10-18.md). 통과는 사실 검증과 의미상 링크 검증을 대신하지 않는다. 앵커는 `10550ca1` 역사 원문 UART(49)·Build(50)와 앵커 문서의 ISR(40)·LLM(74) 설명을 비교 기준으로 사용했다. 현행 Recipes는 D 비교에만 사용하고 옛 점수를 대입하지 않았다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `hbm/chapter08-npu-gpu-usage.md` | 16 | 13 | 7 | 12 | 7 | 5 | 2 | **62** | 검증됨 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter09-cxl-mem.md` | 10 | 9 | 6 | 9 | 4 | 5 | 2 | **45** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter10-cxl-mem-protocol.md` | 16 | 13 | 8 | 11 | 7 | 5 | 3 | **63** | 검증됨 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter11-cxl-device-types.md` | 16 | 13 | 7 | 11 | 8 | 5 | 3 | **63** | 검증됨 | 보강 | 중간 | 글별 anchor_ref; `10550ca1` |
| `hbm/chapter12-cxl-pooling-fabric.md` | 16 | 12 | 5 | 11 | 7 | 4 | 2 | **57** | 검증됨 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `industrial-ethernet/chapter01-overview.md` | 12 | 12 | 3 | 11 | 5 | 4 | 1 | **48** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `industrial-ethernet/chapter02-realtime-requirements.md` | 13 | 12 | 7 | 10 | 7 | 5 | 2 | **56** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `industrial-ethernet/chapter03-ethercat-architecture.md` | 12 | 13 | 5 | 10 | 7 | 7 | 2 | **56** | 미검증 | 병합 검토 | 중간 | 글별 anchor_ref; `10550ca1` |
| `industrial-ethernet/chapter04-ethercat-frame.md` | 12 | 11 | 6 | 11 | 7 | 6 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |
| `industrial-ethernet/chapter05-ethercat-master.md` | 13 | 12 | 6 | 11 | 6 | 5 | 2 | **55** | 오류 확인 | 우선 조치 | 중간 | 글별 anchor_ref; `10550ca1` |

기존 합계 550 → 재검토 560. 오류 확인 5편은 유지하되 Ethernet4는 직접 확인한 offset·산술만 핵심 근거로 삼았다. HBM 검증됨 4편은 9ad745f7의 글별 대조 기록에 근거한 승계이며 이 검토의 전체 독립 재검증 완료라는 뜻이 아니다. Ethernet3는 제목 축약을 오링크로 보았던 감점을 철회했다.

### `hbm/chapter08-npu-gpu-usage.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage.md`
url: `/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage`

score_status: 잠정 · score: 62 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처·실행환경 보강 필요.
uncertainties: 119~152행 CUDA tile/블록 크기,168행 SM 사양은 독립 검증 미완료. 9ad745f7의 Llama2·FlashAttention·PagedAttention 및 카드 사양 대조 기록을 직접 읽었으나 전체 주장을 이번에 재검증한 뜻은 아니다.

| 항목 | 근거 |
| --- | --- |
| A | 16 | 21~51행에서 GQA head 수를 넣어 86 GB와 카드 잔여 용량을 연결하고 113·175~177행에서 읽기 트래픽·batch 비용으로 확장한다. 일반 tiling 소개보다 추가 가치가 있어 A16 유지. |
| B | 13 | 19~228행 메모리 분해→kernel→카드→tier 흐름은 끝나지만 실행 가능한 kernel 전제와 카드 표 TBD가 남는다. CUDA 정확성 불확실 때문에 B≤13, 기존13 유지. |
| C | 7 | 34~41·113·175행 산술을 다시 대입하면 327680 B/token,85.899 GB,41.79 ms이다. 산술·의사 코드 중심이고168·185~201행 사양의 본문 출처가 없어 §3-1 C≤8; 실행 관찰도 없어7 유지. |
| D | 12 | 175~177·255~257행 ↔ 같은 HBM chapter05-bandwidth-bottleneck.md146~152행은 140 GB/3.35 TB/s와 batch amortization 중복. 현행 Recipes part12-11-on-device-llm.md220~232행은 Llama3 8B·512 MB 계산이라 모델·배포 질문이 달라 강한 예제 중복에서 제외. 이 차이를 반영해11→12. |
| E | 7 | 2행 Weight·Activation·KV Cache는19~113행이 모두 답한다. 배치도43~51·209~216행 용량/위치 판단이 있어6→7. description의 시리즈 마무리는232행 이후 CXL4편과 맞지 않아 상위 구간은 아님. |
| F | 5 | 271행 next는 공개 order9·slug·내용 일치. 275~277행 실제 HBM1/5/7 제목은 축약 주제와 대응하지만278행 무링크 CXL8의 ML가속기 설명은 실제 CXL8의 메시지/decoder 주제와 다르고279행 UCIe12는 draft. F≤5 유지. |
| G | 2 | 본문 199·220행 발표/버전 표기는 있으나 주장별 공식 링크가 없다. 검증 커밋의 외부 자료는 G 본문 출처로 세지 않아2 유지. |

전문 읽기: 1~279행. SHA-256: `03e83a096163fcf4139cc3567b919527322651c91e18c9171e688d35b649ca3f`.

### `hbm/chapter09-cxl-mem.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter09-cxl-mem.md`
url: `/blog/embedded/hardware/hbm/chapter09-cxl-mem`

score_status: 잠정 · score: 45 · confidence: 높음 · factcheck: 오류 확인 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 위 표의 실제 기술/산술 충돌 우선 조치.
uncertainties: 63행 CZ120 대역폭 방향,66행 Azure 발표,92행 region 기본값은 별도 원출처 확인 대상. tier 모순 수정만으로 다른 주장까지 검증됐다고 간주하지 않는다.

| 항목 | 근거 |
| --- | --- |
| A | 10 | 17~28행 GPU 용량 문제와 tier 표·59~66행 제품목록이 고유 부분이나 실제 GPU 배치 해법은 없다. UART 역사 앵커 수준의 개념 재구성이라10 유지. |
| B | 9 | 17행 H100 weight 문제에서 출발하나40~42·96~101행은 CPU/DAX 설명이라 GPU가 이 용량을 쓰는 과정이 비어 있다. 5행 tier 위치도28·125행과 양립하지 않아9 유지. |
| C | 6 | 79~93행 sysfs와 cxl/daxctl 명령은 구체적이지만 커널판·예상 출력·생성 결과 모드 확인이 없다.63행 무출처 수치로 C≤8, 절차만이면≤9.6 유지. |
| D | 9 | 40~42·111행 load/store 경로 ↔ CXL chapter08-cxl-mem.md21~35행;91~93행 region 명령 ↔ 그 글152~165행을 직접 열어 유사함 확인.96~101행 System RAM/DAX ↔ HBM11 65~82행 재등장. 제품/tier 개관 역할이 남아9 유지. |
| E | 4 | 2행 분석 대비 tier·제품 개관이고5행 HBM-DIMM 사이 약속이28·125행 DDR-SSD 사이와 반대. 4 유지. |
| F | 5 | 133행 next HBM10은 공개 order10·실제 지연/대역폭 내용 대응.138행 HBM5 뒤 Roofline에서 CXL.mem의 자리 설명은 대상99~115행 roofline에 CXL이 없고218행에 관련 항목뿐이라 부정확.5 유지. |
| G | 2 | 42·50~66행 규격/벤더/날짜 이름만 있고 링크·절·도구판이 없다.2 유지. |

전문 읽기: 1~141행. SHA-256: `41f04daf7661afd4c0485b3fd067eae7fe9319c268b4a71628b6e7e843864a4e`.

### `hbm/chapter10-cxl-mem-protocol.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol.md`
url: `/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol`

score_status: 잠정 · score: 63 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처·실행환경 보강 필요.
uncertainties: 80행 직렬화 기여,131~138행 granularity 권고의 적용조건·출처는 직접 재검증 미완료. 9ad745f7의 CXL1.1/Sun 연구/Linux 코드 대조 기록은 읽었으나 실행 검증은 하지 않았다.

| 항목 | 근거 |
| --- | --- |
| A | 16 | 117~127행 in-flight 필요량과 throughput 무릎을 연결하고89~108행 pointer chase/stream을 가르는 질문이 분명하다.16 유지. |
| B | 13 | 21~140행 경로·bias·link·credit·interleave가 한 흐름이고142~152행 심화 경계도 명시한다. granularity 단정 범위가 열려 B≤13;13 유지. |
| C | 8 | 119행 50e9×200e-9=10000 B,÷64=156.25 계산 확인.91~108행 함수만으로 측정/오류를 가르지는 못하며131행 수치의 본문 소스 링크는 없어 C≤8.8 유지. |
| D | 11 | 47~55행 메시지표 ↔ CXL chapter08-cxl-mem.md47~53행,131~140행 region↔그 글152~165행 비교. HBM9 44행 raw BW 설명도72~78행과 겹치나 이 글117~127행 큐/동시요청 분석은 별도라10→11. |
| E | 7 | 2행 왕복/링크 제목을21~89·117~127행이 각각 설명한다. description의 Ch9 수치 출처는 Ch9가 TBD여서 과장. 제목 약속 자체는 이행해6→7. |
| F | 5 | 193행 next HBM11은 공개 order11 및 bias/traffic 내용 대응.197행 지연·대역폭 수치 출처는 Ch9 28·44행 TBD와 맞지 않고203행 Recipes149는 실제 공개 order150. F5 유지. |
| G | 3 | 33행 Sun/MICRO2023/Xeon6430,47·117행 CXL1.1,131행 Linux를 명명한다. 주장 연결은 있으나 직접 인용 링크/고정 커널판이 없어3 유지. |

전문 읽기: 1~203행. SHA-256: `18f9ec455929eb8453359b4c16231b94a4c03b5bdbb603a6a8e78badf4bea1c9`.

### `hbm/chapter11-cxl-device-types.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter11-cxl-device-types.md`
url: `/blog/embedded/hardware/hbm/chapter11-cxl-device-types`

score_status: 잠정 · score: 63 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처·실행환경 보강 필요.
uncertainties: 82·113행 Linux 노출로 유형/모드를 판정하는 충분조건 및55행 사양은 독립 대조 미완료.9ad745f7의 CXL1.1 §§2.1~2.3와 manpage 대조 기록을 확인했다.

| 항목 | 근거 |
| --- | --- |
| A | 16 | 33~39·55~57행 프로토콜 분류를 호스트 용량/대역폭이라는 구매 질문으로 재해석하고88~95행 트래픽을 비교한다.16 유지. |
| B | 13 | 정의→유형별 실효 용량→Linux 모드→traffic→함정 흐름은 완료.82행 판정의 정확성은 열려 있어 B≤13,13 유지. |
| C | 7 | 55행 819/64=12.8,1230/64=19.2는 한 자리수 이상 차이와 맞음.77~79행 관찰 명령만 있고 환경/출력없음.무출처 사양으로 C≤8,7 유지. |
| D | 11 | 27~29·61~63행 ↔ CXL chapter02-system-architecture.md23~39행 동일 Type정의,69~74행 ↔ HBM9 96~101행 모드 구분 반복. 그러나33~39·55~57행 호스트 관점이 독립적이고 현행 Recipes11-15 46~50행은 개요라10→11. |
| E | 8 | 2·5행 어떤 유형이 호스트 메모리인가라는 약속에33~39·65~95행이 직접 답함.일반 CXL 유형 소개보다 구체적이지만 단정 범위 미검증이라8 유지. |
| F | 5 | 126행 next HBM12는 공개 order12·토폴로지와 종결 내용 맞음.130행 Ch9 실측은 실제 TBD,131행 Ch10 BISnp 동작은 대상68행에서 타 시리즈로 넘기고135행 Recipes149는 실제150.5 유지. |
| G | 3 | 23행 규격판/절,51·53행 규격 설명을 연결했고 명령도 있으나 본문 공식 링크·커널판이 없다.3 유지. |

전문 읽기: 1~135행. SHA-256: `cbca782b8739ed6a59599efe433c5265c7e1f7870603d23ff2ac145b3704272f`.

### `hbm/chapter12-cxl-pooling-fabric.md`

source_file: `src/content/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric.md`
url: `/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric`

score_status: 잠정 · score: 57 · confidence: 중간 · factcheck: 검증됨 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처·실행환경 보강 필요.
uncertainties: 91·108행 연구지표의 기준선과122행 MLD 할당 제약은 원자료 재검증 미완료.9ad745f7의 TPP/Pond·consortium 대조 기록은 직접 확인했다.

| 항목 | 근거 |
| --- | --- |
| A | 16 | 29~47행 병목축과99~106행 조달 peak를 분리하는 설명은 글 고유다. hot/cold 전제85~89행이 선택 질문이지만 실측없어16 유지. |
| B | 12 | 용량상한→병목→토폴로지→hot/cold→조달→한계로 종결.59행 단계별 실제 지연은 TBD이고85~89행 질문의 답을 구하는 절차는 없다.12 유지. |
| C | 5 | 91·108행 연구 결과 인용은 있으나 재현 환경/명령이 없고85~89행은 확인 질문뿐.40행 사양도 본문 출처없어 C≤8;실전 절차가 약해5 유지. |
| D | 11 | 53~63행 ↔ CXL chapter04-pooling-gfam.md23~33행 토폴로지,91·108행 ↔ 그 글127~128행 TPP/Pond 수치를 실제 비교. 그러나29~47·99~106행 병목과 조달 표는 추가 해석으로10→11. |
| E | 7 | 2·5행 용량을 빌리는 판단을21~108행이 수행. 지연 값 약속은59행 TBD라7 유지. |
| F | 4 | 146~150행 실제 마지막 공개 order12의 종결.152행 Recipes149~151은 target150 포함이라 단독 번호 오류로 세지 않음.153~155행 target은 각각 공개54/11/34로 범위 포함.161행 Ch9를 실측 출처로 안내한 설명은 틀려4 유지. |
| G | 2 | 91·108행 TPP/Pond 이름과 비교결과는 있지만 논문 링크/판/환경 설명이 본문에 없다.2 유지. |

병합 대상 없음. 토폴로지 조달 판단/아키텍처 입문이라는 독립 검색 의도가 있어 다음 조치는 차별화 보강이다.

전문 읽기: 1~166행. SHA-256: `94e5e4f963b310e14d0ce6e819ef69f9c1265790d9da8fe1730692ded1d5328e`.

### `industrial-ethernet/chapter01-overview.md`

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter01-overview.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter01-overview`

score_status: 잠정 · score: 48 · confidence: 높음 · factcheck: 오류 확인 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 위 표의 실제 기술/산술 충돌 우선 조치.
uncertainties: 19행 재전송100ms와38~46행 ping분포·105~109행 표준 cycle·142/146행 현황은 외부 검증 미완료.57행 Firm범위와65행 사례 차이는 별도 조건일 수 있어 오류로 세지 않았다.

| 항목 | 근거 |
| --- | --- |
| A | 12 | 71~99행 네 결정성 전략을 표준에 대응하는 구조는 있으나 대부분 개념 개요. 독립 측정/개발사례 없는12 유지. |
| B | 12 | 23~113행 원인→등급→전략→표준은 끝남.119~126행 로드맵은 실제7~12편이 빠지고64행 실제 예의 산술 불일치로12 유지, B≤13. |
| C | 3 | 38~46행 ping분포에 OS/NIC/명령/조건이 없고62~66행 실제 예도 출처가 없다. C≤8보다 낮은 실행 절차 부재 구간3 유지. |
| D | 11 | 54~58행↔Ethernet2 23~32행 cycle분류,103~109행↔Ethernet12 chapter12-comparison.md23~33행 비교표 공통. 이 글은71~99행 전략 지도가 독립적이라10→11. |
| E | 5 | 2행 분석을 내걸지만23~113행은 원인/표준 개요 중심으로 E3~5 구간.7→5로 보정;description은 같은 질문이다. |
| F | 4 | 158행 next는 공개order2·cycle/jitter/PTP범위 맞음.138행 PREEMPT_RT설정 링크는 RTOS part1-04-preemption.md가 일반preemption/yield 글이라 틀림.165행 Recipes4.6도 실제87. 허브로드맵119~126행 누락까지 있어4 유지. |
| G | 1 | 166~167행 단체홈은 있으나 기술주장별 근거/버전없다.1 유지. |

전문 읽기: 1~167행. SHA-256: `03a52ca04cb7cc0ff45ebf148b3afc668ec8e10b213d55f3b5e8e96ca6f3d2b6`.

### `industrial-ethernet/chapter02-realtime-requirements.md`

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements`

score_status: 잠정 · score: 56 · confidence: 높음 · factcheck: 오류 확인 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 위 표의 실제 기술/산술 충돌 우선 조치.
uncertainties: 59·220행 worst-case/p99.9 등치,167~171행 DC 명령,PTP 필수조건·수치 검증 미완료.표28~31행 휴리스틱 범위 전체를 오류로 일반화하지 않는다.

| 항목 | 근거 |
| --- | --- |
| A | 13 | 61~108행 jitter원천과PTP 대칭가정을 분리하고116~148행 관찰명령을 둔다.일반론보다 구조가 구체적이라13 유지. |
| B | 12 | 21~197행 cycle→jitter→budget→PTP→DC→TDMA 완결.34행1ms의1/10 이하라면서250μs를 그 결과라 하고41행1/4로 표기하여 같은 예의 산술이 불일치. B12 유지. |
| C | 7 | 116~148행 ethtool/ptp4l과 예상로그로 관찰 지점은 있으나 실측환경없음.52~56·154~157행 무출처 수치로 C≤8;7 유지. |
| D | 10 | 161~175행 DC ↔ Ethernet3 127~144행,177~185행 TDMA ↔ Ethernet1 81~85행 직접 비교. PTP네시각/대칭 식과NIC관찰은 이 장 전담이라10 유지. |
| E | 7 | 2행 요구사항·jitter·cycle은21~108행이 구체적으로 전개하고116~148행 관찰도 포함.제목에 분석 약속이 없으므로 기존5는 낮아7. |
| F | 5 | 228행 next Ethernet3 공개order3·FMMU/SM설명 맞음.232~234행 관련 라벨은 축약 제목/주제 대응.235행 Recipes Part4.6은 공개order87과 다름.5 유지. |
| G | 2 | 236~237행 IEEE1588-2019·linuxptp링크는 있으나53행등 주장과 조항 연결/실행판없어2 유지. |

전문 읽기: 1~237행. SHA-256: `5b3c10e4811eff136e0a355ab250826c10b4ba8ccf8083f356bfb4fc029bd955`.

### `industrial-ethernet/chapter03-ethercat-architecture.md`

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 미검증 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처·실행환경 보강 필요.
uncertainties: 91·131~134행 명령값/DC절차,110~123행latest-only·54~73행사양·182행회비는 공식자료 대조 미완료.기억이나 다른 글 표와의 차이를 오류 확정으로 삼지 않았다.

| 항목 | 근거 |
| --- | --- |
| A | 12 | 25~56행 기차 비유·81~98행 processimage 슬롯으로 개념을 풀지만 새로운 관찰/비교는 없다.12 유지. |
| B | 13 | 구조→FMMU→SM→DC→state→생태계로19행 약속을 완수. 각 메커니즘의 단정 정확성이 열려B≤13;13 유지. |
| C | 5 | 81~98행 주소매핑 예는 구체적이나 실행명령/장치환경/성공·실패관찰없음.27·54·68~73행무출처 수치로C≤8,5 유지. |
| D | 10 | 81~98행↔Ethernet4 142~166행 FMMU매핑,127~144행↔Ethernet2 161~175행 DC,66~71행↔Ethernet5 278~285행ESC표 비교.물리on-the-fly·SM개념 전담을 인정해9→10. |
| E | 7 | 2·5행 on-the-fly 메커니즘을29~56행과75~144행이 설명한다.제품/생태계로 일부 분산되지만7 유지. |
| F | 7 | 217행 next Ethernet4 공개order4,datagram/WKC/mailbox 후행설명도 실제본문38~250행에 있다.221~223행은 제목 축약이지만 Ethernet2/4/5 실주제와 맞으며5편은실제로 slave/ESC도274~396행다룬다.옛제목과 글자차이만으로감점안함.75~125행주소/동기화 구분이 고유 길잡이여서6→7. |
| G | 2 | 224~225행 ETG·Microchip공식페이지는 있으나 명령/DC·칩사양의 판/절없어2 유지. |

병합 대상 없음. 토폴로지 조달 판단/아키텍처 입문이라는 독립 검색 의도가 있어 다음 조치는 차별화 보강이다.

전문 읽기: 1~225행. SHA-256: `dba618b86d8177892213a8e0c55bf3446040ed29fbe97627d4e6d4502b930aa8`.

### `industrial-ethernet/chapter04-ethercat-frame.md`

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame`

score_status: 잠정 · score: 55 · confidence: 높음 · factcheck: 오류 확인 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 위 표의 실제 기술/산술 충돌 우선 조치.
uncertainties: 명령enum·WKC규칙·198행mailbox크기·192행CiA402·222행FoE제약은 이 검토에서 공식원문을 새로 열지 않아 추가오류 근거로 채택하지 않음. 기존SOEM확인주장은 인계기록으로만 구분.

| 항목 | 근거 |
| --- | --- |
| A | 12 | 99~138행 hex를필드로해석하고142~166행processimage를보이나재현관찰아닌교재예.12 유지. |
| B | 11 | header→datagram→WKC→hex→mapping→mailbox 흐름은 완료.104~125행offset불일치와272행산술이읽기약속을손상하고FoE단계224~242행은제목뿐.11 유지. |
| C | 6 | 101행tcpdump명령은있지만104행14바이트뒤105행0x10시작이라115행0x0E의header가dump상위치와맞지않음.272행1500−2−14=1484≠1486.수정전dump를실측증거로인정안함.C≤8,6 유지. |
| D | 11 | 142~166행↔Ethernet3 81~98행동일logical→DPRAM슬롯문제.81~97행↔Ethernet5 125~149·408~410행WKC응용.그외프레임field/hex/mailbox이이장전담이라11 유지. |
| E | 7 | 2·19행datagram/WKC/address/바이트분석을27~166행이모두다룸.틀린값은정확성게이트에서반영하고범위자체는7 유지. |
| F | 6 | 285행nextEthernet5 공개order5,master비교·ESC·ENI/ESI후행설명은실제대상21~396행대응.289~291행3/5/6도내용대응.기본구조는기능하나FoE7단계224~242행의빈설명으로고유길잡이약해6 유지. |
| G | 2 | 292~293행Wireshark/CiA공식자료는있으나정확한표준판/실측패킷환경과연결없어2 유지. |

전문 읽기: 1~293행. SHA-256: `cfb77139a7a1f7d70220ca41be67b3cc8883cae3ba997c5f151df601b36dde4e`.

### `industrial-ethernet/chapter05-ethercat-master.md`

source_file: `src/content/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master.md`
url: `/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master`

score_status: 잠정 · score: 55 · confidence: 높음 · factcheck: 오류 확인 · anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 위 표의 실제 기술/산술 충돌 우선 조치.
uncertainties: SOEM expectedWKC/ec_ENI/API판,라이선스,202행driver,358행XML명령,384행EEPROM사양은공식원문미대조.155~168행이코드64~138행출력과맞지않는문제는직접확인했으나별도수정코드가생략됐을가능성을명시한다.

| 항목 | 근거 |
| --- | --- |
| A | 13 | 23~37행master선택과64~138행코드·293~380행ESI/ENI를연결하는고유한폭이있으나실제관찰조건없어13 유지. |
| B | 12 | 빌드→OP루프→RT시간→IgH/TwinCAT→ESC/XML→함정까지완료.408~410행절반진단은자체증분설명으로기대3중1이되어불일치;B12 유지. |
| C | 6 | 48~55·151행빌드/실행은구체적.그러나155~168행log에는코드에없는Slave목록/ReachedOP/주기data출력이있어그코드실행결과로인정못함.28·194·425행무출처cycle/jitter로C≤8;6 유지. |
| D | 11 | 206~218·224~249행↔Ethernet11 chapter11-linux-realtime.md276~285·311~341행IgH설치/receive-process-queue-send동일뼈대.이글은SOEM최소코드와XML전담으로10→11.RecipesIRQ현행글은구현중복으로세지않음. |
| E | 6 | 2행세master비교는23~37행에있지만TwinCAT253~272행은특징소개,정량비교조건없어6 유지. |
| F | 5 | 431행nextEthernet6 공개order6·RT/IRT/GSDML모두실제대상15~19행예고/본문에있음.435~438행주제대응.439행Recipes4.6은실제87이라F≤5 유지. |
| G | 2 | 48·207·440~441행공식저장소/프로젝트링크는있으나checkout판·실행환경·측정원자료없어2 유지. |

전문 읽기: 1~441행. SHA-256: `d4c9dc82dbec5d1ded58a751b7ba3f2e34c0beedebce0d68d5eedc3034fcfcfe`.

## 공통 문제와 실행 범위

B 불확실은 13 이하, 무출처 수치는 C8 이하를 적용했다. 틀린 관련 설명은 HBM9~12와 Ethernet1/2/5의 F에서 반영했다. 이름만 축약한 유효 링크를 틀렸다고 단정하지 않았다. 전송률·cycle·WKC·dump는 원문 산술과 두 기술 진술을 대조했으며 산문 개수 표기·다른 시나리오·API 기억을 오류 근거로 삼지 않았다. 커널/보드 실행 및 API 컴파일 검증은 수행하지 않았다. 보고서 작성 뒤 10편 현재 바이트와 기준 HEAD 원문 일치를 확인했다. 앞 해시는 해당 스냅샷 식별자이다.
