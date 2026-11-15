# 공개 글 루프 29 — 초벌 근거 대조

기준: `docs/adsense-audit/rubric.md` v1.2, `anchors.md`, `antipatterns.md`. 이 문서는 Sol 최종 재채점을 위한 근거 대조이며 최종 점수·분류를 산정하지 않는다. 각 source file 전문(헤더부터 관련 항목까지)을 읽고, 아래에는 판정에 영향을 줄 근거 구간과 이견을 적었다. 원문과 기존 보고서, 이미 존재하던 미커밋 파일은 수정하지 않았다.

## 앵커 및 비교 기준

- 앵커 근거는 `10550ca1` 당시 `anchors.md`가 참조한 실제 원문으로 보아야 한다. 그 커밋의 `part1-04-uart-hardware.md`는 현재 보강된 UART 글과 다르고, `part12-10-on-device-llm.md`는 당시 LLM 글의 경로다. 현재 part12-10은 zero-copy-camera이고 LLM 글은 `part12-11-on-device-llm.md`로 이동·분리됐다. 따라서 현행 파일을 옛 앵커 파일로 대입하면 안 된다. anchors 문서의 점수·줄 번호는 역사적 기준선으로만 쓴다.
- Recipes 비교 대상은 기준 커밋 이후 실질적으로 바뀌었다. `git diff --name-only 10550ca1 -- src/content/blog/embedded/modern-recipes/`에는 60 경로가 나오며, 이 중 옛 LLM 파일 삭제 1건을 제외하면 현재 Recipes 글 59편이 변경됐다. D는 현재 본문으로 다시 보아야 한다. 구체적으로 `part11-15-pcie-to-cxl.md`는 내용이 아니라 seriesOrder만 149→150으로 바뀌었고, `part12-11-on-device-llm.md`는 신설된 현행 LLM 글이며, `part7-13-irq-affinity.md`는 363행 규모로 다시 작성됐다.
- 현재 Recipes 대조에서 확인한 영향: HBM Ch 8의 기존 비교 `part12-11`은 현행 Llama 3 8B·GQA 설명(현행 220~232, 260~270행)과 HBM Ch 8의 Llama 2 70B 계산(21~41, 104~113행)이 같은 공식 계열을 다루지만 모델·질문·계산 결론이 다르다. 문장·예시가 겹친다는 근거로 쓰기 어렵고, 주제 중복으로만 반영할지 재판단할 것. Ch 9~11의 Recipes 11-15 비교는 현재 글 16~44, 46~50행에 PCIe/CXL·Type 1~3 개요가 있어 겹침 주제 자체는 남았지만, 변경된 seriesOrder 150을 링크 평가에 반영할 것. Ch 5의 `part7-13-irq-affinity`는 현재 본문에 EtherCAT/SOEM/ecrt 설명이 없고, 344행의 Industrial Ethernet Ch 11 관련 링크만 확인된다. 기존 “검색 결과 유일한 IRQ affinity 글”은 현재 D 중복 근거가 아니다.

## 글별 근거

### HBM Ch 8

- `source_file`: `src/content/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage.md`
- 읽은 구간: 전문 1~279행.
- A~G: A·B·C·E·G 근거는 대체로 동의한다. 고유한 수치 전개는 21~51, 104~113, 175~177행에 있고, 일반 CUDA/FlashAttention 설명은 117~171행이다. C는 재현 가능한 측정이 없는 반면 출처 없는 수치가 있어 낮은 구간이라는 근거가 성립한다. E는 203~216행이 제목의 “배치 분석”을 얼마나 이행하는지 낮게 본 판단에 동의한다. G는 본문 출처와 커밋 검증 기록을 구분한 점에 동의한다.
- D 대조: `chapter05-bandwidth-bottleneck.md` 146~152행의 Llama 2 70B·140 GB/3.35 TB/s·batch amortization과 이 글 175~177, 255~257행은 같은 사례·계산·결론이다. `chapter09-cxl-mem.md` 17행은 21~39행의 226 GB 계산을 요약한다. 반면 현행 Recipes `part12-11-on-device-llm.md` 220~232, 260~270행은 Llama 3 8B 기준으로 경량 추론·GQA cache 계산을 다룬다. 같은 공식이 쓰였다는 사실만으로 강한 중복으로 보지 말고, 기존 D 근거의 강도를 낮춰 재채점할 것.
- F 대조: 271행 다음 편 Ch 9는 slug `embedded/hardware/hbm/chapter09-cxl-mem`, seriesOrder 9, 공개 글이며 제목도 일치한다. 275행 Ch 1 라벨은 실제 제목과 다르다(대상 `chapter01-overview.md`, 제목 “HBM과 GDDR 분기점 분석”). 278행 CXL Ch 8은 링크가 없고 실제 제목은 “CXL.mem — M2S·S2M·HDM Decoder”다. 279행 UCIe Ch 12도 링크가 없으며 대상은 draft다. 이들은 실제 탐색 결함이다.
- 불확실/기존 factcheck 재검토: 119~152행 CUDA 조각은 thread/block 인덱스 범위와 shared tile shape가 맞물리지 않는 의심이다. CUDA 실행 규칙이 필요하므로 `오류 확인`으로 단정하지 말고 CUDA Programming Guide로 확인한다. 91~102행은 의사 코드이므로 누락된 softmax 등을 코드 오류로 확정하지 않는다. 64행 별도 산술 오류는 보이지 않는다.
- Sol 1차자료 질문: CUDA Programming Guide로 119~152행의 인덱싱/블록 크기를 확인할 것. 표의 카드별 HBM·전력, H100 228 KB, UALink 승인일과 이사회, REBEL-Quad 사양은 기존 9ad745f7 검증 기록이 있더라도 현재 원문 주장과 원출처를 샘플 확인할 것.

### HBM Ch 9

- `source_file`: `src/content/blog/embedded/hardware/hbm/chapter09-cxl-mem.md`
- 읽은 구간: 전문 1~141행.
- A~G: 17~28, 30~44, 55~72, 74~101, 103~129행을 근거로 A~E·G 판단은 대체로 동의한다. 5행 description의 tier 위치와 21~28행 표·28행/125행 설명은 서로 다르다. 이는 실제로 양립할 수 없는 본문 내부 설명이므로 오류 확인 근거가 유효하다. “환경에 따라 달라짐”이나 다른 조건 예시로 해소되지 않는다.
- D 대조: HBM Ch 8 203~216행과 이 글 21~28, 70행은 메모리 tier 주제를 공유한다. HBM Ch 11 65~82행 System RAM/DAX 설명과 이 글 96~101행도 직접 비교 대상이다. 다른 시리즈 `hardware/cxl/chapter08-cxl-mem.md` 21~35행(load 경로·DMA 언급·HDM)과 이 글 40~42, 111행, 그리고 같은 CXL 글 152~165행 region 생성과 이 글 91~93행을 대조한다. `modern-recipes/part11-15-pcie-to-cxl.md` 현행 16~44, 46~50행은 CXL/PCIe와 유형 분류 개요이며 order만 변경됐다. 제품·tier 표(59~66행)는 이 글의 구별점이다.
- F 대조: 133행 Ch 10 next 링크는 slug/order/title이 모두 일치한다. 138행 Ch 5의 “Roofline에서 CXL.mem의 자리” 설명은 target `chapter05-bandwidth-bottleneck.md`에 CXL이 실질적으로 없고 218행에 링크 없는 한 줄뿐이라 부정확하다. 다른 관련 항목은 대상 제목을 재확인할 것.
- 불확실/기존 factcheck: 92행 decoder0.1 명령과 79~85행 decoder0.0 트리는 서로 다른 예시일 수 있으므로 내부 오류로 세지 않는다. 63행 Micron 36 GB/s와 PCIe 5.0 x8 표기는 양방향 합산 가능성이 있어 우선 의심으로 둔다. 특정 제품 수치·CXL 버전 날짜·Azure 발표와 명령 기본값은 외부 확인 대상이다.
- Sol 1차자료 질문: CXL Consortium의 CXL 2.0/3.0 개요, Linux CXL ABI/ndctl man page, Samsung·SK hynix·Micron·Astera 제품 발표로 42, 50~66, 70, 91~93행을 점검할 것. CZ120 36 GB/s가 한 방향인지 합산인지 확인할 것.

### HBM Ch 10

- `source_file`: `src/content/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol.md`
- 읽은 구간: 전문 1~203행.
- A~G: 21~68행의 지연 경로와 bias, 70~140행 대역폭·credit·granularity, 142~189행의 경계 설명을 근거로 A~E·G 판단은 대체로 동의한다. `검증됨`은 9ad745f7의 1차 자료 대조 기록이 근거이며, 이번 초벌에서 해당 원문 규격·논문을 다시 열어 독립 재검증한 것은 아니다.
- 내부 산술: 기존 보고서가 든 117~119행은 50 GB/s×200 ns=10,000 B, 10,000/64≈156.25 cache lines라 맞다. 33·178·182행의 연구 비율은 외부 출처 주장이다.
- D 대조: HBM Ch 9 44행과 이 글 72~78행은 링크 원시 전송률을 공유한다. HBM Ch 11 53행은 bias를 요약하고 이 글 59~68행이 확장한다. 다른 시리즈 `hardware/cxl/chapter08-cxl-mem.md` 47~53행 ↔ 이 글 47~55행 메시지표, CXL Ch 8 interleave 절/자주 하는 실수(현행 152~165행으로 기존 보고서 기준) ↔ 이 글 131~140, 172~174행은 직접 비교한다. `performance-engineering/part3-12-cxl-mem-latency.md` 14, 38, 42~44, 102, 106행과 이 글 33, 178, 182행은 Sun et al. 결과를 공유한다. `modern-recipes/part11-15-pcie-to-cxl.md` 16~44, 46~50행은 상위 개요와 겹치는 범위만 있고 왕복/credit 계산과는 역할이 다르다.
- F 대조: 193행 next Ch 11은 공개·order 11·title/slug 일치. 203행 Recipes “Ch 149”는 현행 `part11-15-pcie-to-cxl.md`가 order 150이므로 번호 불일치. 197행 Ch 9를 지연·대역폭 수치 출처라 부르는 설명도 부정확하다. Ch 9 28·44행은 실제 지연·실측을 TBD라 하고, 연구 결과는 이 글 33행에 있다.
- 불확실: 41~43, 183행 “switch 한 단=경로 통과점 두 개”는 규격/토폴로지 정의로 확인할 주장이지 문장 자체 내부 모순은 아니다. 80행 직렬화 시간이 지연 예산에서 작다는 평가는 추론·외부 수치가 필요하다. 66행 bias table 단위·Linux interleave 범위·논문 측정 방법을 확인한다.
- Sol 1차자료 질문: CXL 1.1 해당 절 및 CXL 2.0 switching 경로, Sun et al. MICRO 2023 논문 원문으로 33, 41~43, 53~66, 89, 131행을 확인할 것. Linux kernel의 `CXL_DECODER_MIN_GRANULARITY` 및 `SZ_16K`를 특정 커밋/버전과 대조할 것.

### HBM Ch 11

- `source_file`: `src/content/blog/embedded/hardware/hbm/chapter11-cxl-device-types.md`
- 읽은 구간: 전문 1~135행.
- A~G: 15, 21~39, 41~82, 84~122행 근거로 A~E·G는 대체로 동의한다. 내부 산술 55행의 819/64≈12.8, 1230/64≈19.2는 “한 자리수 이상”과 맞고 82행의 요약은 67~72행 표와 모순되지 않는다. 다만 `검증됨`은 기존 커밋에 기록된 CXL 1.1 대조 사실에 기반해 이어받은 것이며, 이번에 원문을 다시 확인한 뜻은 아니다.
- D 대조: HBM Ch 9 65~82행과 이 글 65~82행의 System RAM/DAX 및 명령, Ch 10 59~68행과 이 글 51~57행의 bias, Ch 12 53~63행과 이 글 45행의 switch/pooling 문맥을 비교한다. `hardware/cxl/chapter02-system-architecture.md` 23~27, 33행 Type 정의와 이 글 21~29, 61~63행은 직접 겹친다. 현행 Recipes 11-15 22~37행에도 Type 1~3 정의 개요가 남아 있다. 이 글 고유 구간은 호스트 용량 관점(33~39행), 대역폭 비대칭(55~57행), 트래픽 표(88~95행)다.
- F 대조: 126행 next Ch 12는 order/title/slug 일치. 130행 Ch 9에 붙은 “지연·대역폭 실측”은 Ch 9 28·44행이 TBD라 틀린 라벨이다. 131행 Ch 10의 “BISnp 동작”은 Ch 10 본문 68행에서 CXL Ch 8·Ch 3으로 넘긴다고 명시해 해당 링크 대상이 설명과 맞지 않는다. 135행 Recipes Ch 149는 target order 150이라 틀리다.
- 불확실: 23행 규격 절 번호와 Type 설명, 29행 Type 3의 CXL.cache 경계, 55행 대역폭 및 82행 Linux 노출 판별은 1차 규격·제품/커널 문서 확인 필요. HBM 세대·호스트 링크의 서로 다른 조건을 합쳐 단정한 산술 모순은 현재 확인되지 않는다.
- Sol 1차자료 질문: CXL 1.1 §§2.1~2.3 및 CXL 3.0 HDM-DB Type 3 분류를 버전 구분해 확인할 것. HBM3/3E stack bandwidth는 제조사·JEDEC 자료로, `cxl list -M -D` 노출 판별은 특정 Linux/드라이버 조합으로 확인할 것.

### HBM Ch 12

- `source_file`: `src/content/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric.md`
- 읽은 구간: 전문 1~166행.
- A~G: 15~19, 21~47, 49~89, 91~108, 110~142행의 독자적 용량·조달 판단과 TBD 한계를 근거로 A~E·G는 대체로 동의한다. 91행 TPP와 108행 Pond 수치는 커밋에서 논문 대조를 기록했지만 이번 초벌에서 논문 자체를 재확인하지 않았다. 다른 연구·제품 수치와의 차이는 조건이 명시된 경우 오류로 세지 않는다.
- D 대조: `hardware/cxl/chapter04-pooling-gfam.md` 23~33행의 3단계 토폴로지와 이 글 53~63행, CXL Ch 4 127~128행 TPP/Pond 표와 이 글 91·108행, CXL Ch 4 160~162행 NVLink 문답과 이 글 128~130행을 비교한다. `performance-engineering/part3-11-cxl-interconnect.md` 159행 cold tier 원칙과 이 글 71, 114행은 결론이 비슷하다. HBM Ch 11 45행은 토폴로지 세부를 이 장으로 넘긴다. 21~47, 93~106행의 HBM 용량 상한·병목축·조달 결론은 구별점이다.
- F 대조: 글 146~150행이 12편 종결임을 설명하고 같은 시리즈 공개 order 13은 없다. 152행 label “Recipes Ch 149~151”은 링크 대상 order 150을 포함하는 범위이므로 “Ch 149 단독” 오기와 동일 취급하지 않는다. 다만 target 하나만 링크하고 범위를 적었으므로 라벨의 의도/탐색성은 재검토한다. 161행 Ch 9를 “인용한 지연·대역폭 실측”이라 부르는 것은 Ch 9 28·44행 TBD와 모순되고, 91·108행 실측 논문은 본문에 적혀 있어 부정확하다. 153~155, 164~166행 관련 링크는 기존 보고서상 target/order가 맞으며 실제 공개 상태를 최종 자동 확인할 것.
- 불확실: 40행 HBM stack 대역폭 상한과 PCIe 64 GB/s 방향, 122행 MLD 할당 단위 낭비, TPP/Pond 수치·조건은 외부 근거 필요. 59행 TBD를 정성 설명이 보완한다고 보는지와 E의 약속 이행은 채점 판단이지 사실 오류가 아니다.
- Sol 1차자료 질문: TPP ASPLOS 2023과 Pond ASPLOS 2023 원문에서 91·108, 141~142행의 지표·기준선을 확인할 것. CXL FMS 2023 tutorial/규격으로 53~63, 122행의 MLD·fabric 관계를 확인할 것.

### Industrial Ethernet Ch 1

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter01-overview.md`
- 읽은 구간: 전문 1~167행.
- A~G: 15~21, 23~48, 50~69, 71~128, 130~167행 근거로 기존 A~E·G 설명은 대체로 동의한다. 64행은 원문 산술 오류로 확정 가능: 64 B×32=2,048 B/cycle; 250 μs 주기면 약 65.5 MB/s 또는 524 Mbps이지 8 Mbps가 아니다. 반면 65행 256 B×100/1 ms≈204.8 Mbps로 같은 줄의 계산 방식이 드러난다. Firm 범위(57행 10~100 ms)와 예시(65행 1 ms)는 범위/사례 차이므로 오류로 올리지 않는다.
- D 대조: `chapter02-realtime-requirements.md` 23~32행 ↔ 이 글 54~58행 cycle 분류, ch2 200~202행 ↔ 이 글 136~138행 PREEMPT_RT 논지. `chapter12-comparison.md` 23~33행 표 ↔ 이 글 103~109행은 공통 속도값을 확장 비교한다. `chapter08-tsn.md` 21행 ↔ 이 글 111, 142행 TSN 언급은 주제 확장. 이 글 71~99행 전략 분류는 별도 기여다.
- F 대조: 158행 Ch 2 다음 편은 order 2·title/slug가 맞다. 162~163행 Ch 2·3 링크도 제목과 맞는다. 164행 Preemption 라벨의 target `rtos/practical-internals/part1-04-preemption.md`에는 PREEMPT_RT 주제가 없다는 기존 대조를 유지한다. 165행 Recipes “Part 4.6: IRQ affinity” target `modern-recipes/part7-13-irq-affinity.md`의 현 order는 87이다. 119~126행 허브 로드맵은 1~6만 있고 실제 7~12가 빠져 있음.
- 불확실: 19행 TCP retransmission 100 ms, 38~46행 ping 분포, 105~109행 주기값, 142행 EtherCAT-over-TSN 현황, 146행 security extension 진행형은 출처/기준 시점 의심이다. 이들은 외부 검증 전 오류 확정 금지. 57행과 65행 Firm cycle은 사례 조건이 다를 수 있어 내부 모순 아니다.
- Sol 1차자료 질문: IEEE/ETG/PI/EPSG/sercos의 cycle/spec 자료로 105~109행; RFC 6298 및 실제 TCP 스택 조건으로 19행; TSN·CIP Security 공식 자료로 142·146행 확인. 64행 산술은 별도 출처 없이 원문 대입만으로 오류 확인 가능.

### Industrial Ethernet Ch 2

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements.md`
- 읽은 구간: 전문 1~237행.
- A~G: 21~42, 44~74, 76~108, 110~159, 161~197, 199~237행 근거로 내용 범위·재현 정보·출처 평가에 대체로 동의한다. 기존 factcheck에서 34행 “1 ms의 1/10 이하”라고 한 뒤 250 μs를 그 원칙의 예라고 한 점은 내부 산술상 불일치이며, 41행은 250 μs=1/4라 이를 확인한다. 다만 표 28~30행 권장 범위가 휴리스틱이므로 모든 값이 1/10 규칙을 만족해야 한다고 일반화하지 말고, 본문이 34행에서 250 μs를 그 원칙의 결과라고 명시하는 충돌만 근거 삼는다.
- D 대조: Ch 1 81~85행 POWERLINK TDMA ↔ 이 글 177~185행, Ch 1 136~138행 PREEMPT_RT ↔ 이 글 201~203행, Ch 3 127~144·198~200행 DC ↔ 이 글 161~175행. `chapter08-tsn.md` 50~67행 PTP/gPTP와 이 글 76~108행, `chapter09-tsn-scheduling.md` 125~154·335~345행 설정/ptp4l과 이 글 116~148행은 세부 수준이 다르다.
- F 대조: 228행 next Ch 3 target 공개·order/title/slug 일치. 232~234행 관련 항목은 target과 라벨이 맞다. 235행 Recipes “Part 4.6: IRQ affinity”는 target order 87이라 번호가 틀렸다. 5점 이하 조건은 실제 대상 라벨 오류에 적용 가능.
- 불확실: 167~171행 DC 과정은 Ch 3 131~134행과 단계/명령 표현이 다르지만 시리즈 간 차이로 사실 오류 확정하지 않는다. 59·220행 worst-case와 p99.9의 등치, 40행 Nyquist 설명, 154~157행 BC/TC 정확도, 69·70행 수치, 207행 “NTP software/PTP hardware” 단순화, ptp4l 출력이 실측인지 예시인지 모두 외부 또는 표현 검증 필요. 표의 “네 원천”과 실제 다섯 행은 개수 서술 오류로 uncertainties에 둔다.
- Sol 1차자료 질문: ETG 1000 및 ESC/DC 문서로 167~171행, IEEE 1588-2019·linuxptp 문서로 78~89, 104~108, 116~159행을 확인할 것. ptp4l 예시 출력의 출처/예시 여부도 저자 근거가 있는지 확인.

### Industrial Ethernet Ch 3

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture.md`
- 읽은 구간: 전문 1~225행.
- A~G: 15~19, 25~56, 58~100, 102~125, 127~172, 174~215행에서 독자적 설명과 반복 구간을 확인했다. 기존 A~G 근거의 큰 방향은 동의하되, SM 3-buffer의 “원자적/latest-only” 동작이나 DC 수치 등 외부 문서가 필요한 부분은 정확성 단정으로 처리하지 않는다.
- D 대조: 같은 시리즈 Ch 2 161~175행 DC ↔ 이 글 127~144행(절차 순서는 다르나 reference·ARMW·동시 동작 논지가 겹침); Ch 4 142~166행 FMMU 예 ↔ 이 글 81~98행(둘 다 논리 process image→DPRAM 자기 슬롯, 단 실제 논리 주소/DPRAM 예시 배치는 서로 다름); Ch 5 276~283행 ESC 표 ↔ 이 글 66~71행. Ch 1 79, 105행은 on-the-fly/12.5 μs를 선행한다. 각 쌍은 같은 결론/표 여부를 D 판단에 쓰되 조건·주소가 다른 예시는 동일 내용 오류라 보지 않는다.
- F 대조: 217행 next Ch 4 order 4·slug/title 일치, 221~223행 관련 링크도 공개 대상과 라벨이 맞다. 224~225행 공식 홈페이지·LAN9252 자료 링크는 source 대상이다. 단 기존 보고서가 기록한 대로 target draft 여부와 렌더된 URL은 최종 링크 검사에서 확인할 것.
- 불확실/기존 factcheck: Ch 3 91행 LWR=0x08, 131행 BWR=0x05 및 132행 BRD=0x07은 Ch 4 60~65행 표와 대응되지만, 어느 값이 맞는지는 EtherCAT 명령 표준/SOEM 공식 헤더 확인 전 확정하지 않는다. Ch 2 DC 절과의 다른 설명 역시 series contradiction이다. 27·47행 12.5 μs, 54행 ASIC latency, 66~73행 사양·시장 분포, 182행 회비 등도 출처 미검증이다.
- Sol 1차자료 질문: ETG EtherCAT Technology/ESC/DC 문서와 SOEM의 공식 command enum으로 91~98, 127~144, 54~56, 66~73행을 확인할 것. 경쟁 글들 사이 FMMU DPRAM 주소가 반대인 이유가 장치별 예인지도 확인할 것.

### Industrial Ethernet Ch 4

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame.md`
- 읽은 구간: 전문 1~293행.
- A~G: 15~19, 21~79, 81~97, 99~140, 142~166, 168~272, 274~293행 근거로 기존 A~G 설명에 대체로 동의한다. 내부 모순은 104~126행 dump: Ethernet 헤더는 14 B이므로 EtherCAT header 시작은 0x0E(115행)인데 dump 다음 줄은 0x0010부터 시작하면서 0x0E~0x0F 바이트가 생략돼 있다. `1c10` bytes와 표시 offset/byte order 해석도 맞지 않는다. 272행은 “1500−2−14”가 1484인데 결과를 1486으로 쓴 산술 불일치다. 두 사례는 원문 자체로 확정 가능하다.
- WKC와 command enum은 구별: 47·83~92행의 “슬레이브당 +1” vs LRW의 +3 설명은 같은 글 안에서 충돌하므로 기술 규칙 확인 질문으로 남긴다. 60~68행 command values는 Ch 3 91, 131~134행과 다른 시리즈 문서 내용과 다를 수 있어, 외부 enum 없이 오류 확인하지 않는다. 70행 “세 가지” 뒤 AP/FP/L/B 네 개 나열은 개수 표기 실수라 rubric상 factcheck 오류 확정이 아니다.
- D 대조: Ch 3 81~98행 FMMU↔이 글 142~166행은 논리 process image/DPRAM 슬롯 예시가 겹친다(주소 배치는 다름). Ch 5 125~149행 및 408~410행 WKC 응용은 일부 중복. Ch 3 125행이 mailbox를 Ch 4로 넘겨 역할 분담. 다른 비교 대상 `rtos/practical-internals/part5-07-preempt-rt-linux.md`/`part5-05-selection-guide.md`는 인접 주제 한두 언급 수준.
- F 대조: 285행 next Ch 5는 공개·order 5·제목 일치, 289~291행 Ch 3/5/6 labels도 일치. 224~243행 FoE 절은 일곱 제목만 있고 설명이 비어 있어 읽기 흐름 결함은 실제다. 이 점은 잘못된 링크와 혼동하지 않는다.
- Sol 1차자료 질문: SOEM v1.4.0 `ec_cmdtype` 또는 ETG 공식 frame description으로 46~47, 53~68, 83~97, 130~138행 command/WKC/chain field를 확인할 것. SOEM 공식 header의 mailbox header layout 및 MTU 식으로 198, 272행, Wireshark hexdump 규칙으로 104~126행을 확인할 것. CiA 402 state transition 및 FoE 상태 제약도 192, 222~244행의 1차 자료 질문이다.

### Industrial Ethernet Ch 5

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master.md`
- 읽은 구간: 전문 1~441행.
- A~G: 15~39, 41~151, 153~194, 196~272, 274~396, 398~441행의 범위·구현 예·비교·출처를 확인했다. 기존 A~G 설명에 대체로 동의한다. 코드/실행 출력 불일치(62, 64~138행 코드 대 155~168행 출력), SM3 의미(320행 TxPdo/Inputs 대 410행 output), “half” 산술(408행 제목 대 410행의 +1/+2 설명)은 본문 두 구절만으로 오류 확정 가능한 근거다. 코드가 기대된 출력이 없으므로 관찰 결과로 인정하지 않는 것도 타당하다.
- D 대조: Ch 11 Linux realtime `chapter11-linux-realtime.md` 270~285, 311~341행의 IgH configure/build 및 `ecrt_request_master`→receive/process/queue/send 루프와 이 글 206~218, 224~249행은 직접 겹친다. Ch 3 202~204행의 일반 NIC 주장과 이 글 17행, Ch 4 81~97행 WKC와 이 글 405~410행이 겹친다. `modern-recipes/part7-13-irq-affinity.md` 현행 본문은 IRQ 일반론으로 다시 쓰였고 344행에서 Industrial Ethernet Ch 11을 링크할 뿐 EtherCAT master 구현을 비교할 내용은 없다. 따라서 기존 D에서 이 Recipes 문서를 중복 후보로 취급하지 않는 판단에 동의.
- F 대조: 431행 Ch 6 next의 공개·order 6·title/slug 일치. 435~438행 Ch 3/4/6/RTOS 대상은 label과 맥락이 맞는다. 439행 Recipes “Part 4.6: IRQ affinity”는 target `part7-13-irq-affinity.md`의 order 87로 label이 잘못됐다. 440~441행 저장소 링크는 본문 SOEM/IgH 출처와 연결된다.
- 불확실: 358행 ENI Cmd 10/LRW 주석, 384행 EEPROM 인터페이스·용량·단위, 235/307행 ProductCode는 공식 ESI/데이터시트 확인 필요. 406행 promiscuous mode, 414행 SOEM 자동 ARMW 처리, 418행 `ec_ENI` 존재/호환성은 upstream 코드/문서 질문이다. 28~29, 194, 272, 425행 수치는 조건·버전 없이 제시되어 외부 출처가 필요하다. 이들의 부재는 오류 확정과 다르다.
- Sol 1차자료 질문: SOEM upstream 코드/공식 docs로 79~138, 406, 414, 418행; EtherLab IgH docs 및 지원 kernel/NIC로 202, 206~249행; Beckhoff ESI·ETG 표준·ESC datasheet로 235/307, 278~285, 358, 384~396행 확인. 408~410행 산술/SM3 라벨은 먼저 원문 내부 근거로 확정할 수 있다.

## F 링크 메타데이터 빠른 대조

다음 편 링크의 raw slug와 공개 메타데이터를 함께 대조했다. 내부 링크 target 자체가 존재하는지와 link label이 target에 맞는지는 별개로 보았다.

| 글 | 본문 위치·안내 | target slug / 공개·order / 실제 title | 대조 |
| --- | --- | --- | --- |
| HBM 8 | 271행 “Ch 9: CXL.mem 분석” | `embedded/hardware/hbm/chapter09-cxl-mem` / 공개·9 / “CXL.mem 분석 — HBM·GDDR·DDR 다음의 메모리 계층” | 일치 |
| HBM 9 | 133행 “Ch 10: CXL.mem 프로토콜 분해” | `embedded/hardware/hbm/chapter10-cxl-mem-protocol` / 공개·10 / “CXL.mem 프로토콜 분해 — 왕복 횟수가 만드는 지연, 링크가 만드는 대역폭” | 일치 |
| HBM 10 | 193행 “Ch 11: CXL Type 1·2·3 디바이스 분류” | `embedded/hardware/hbm/chapter11-cxl-device-types` / 공개·11 / “CXL Type 1·2·3 디바이스 분류 — 이 중 무엇이 나에게 메모리인가” | 일치 |
| HBM 11 | 126행 “Ch 12: 메모리 풀링과 데이터센터 토폴로지” | `embedded/hardware/hbm/chapter12-cxl-pooling-fabric` / 공개·12 / “메모리 풀링과 데이터센터 토폴로지 — 용량을 서버 밖에서 빌리는 일” | 일치 |
| HBM 12 | 144~150행 시리즈 종결 안내 | 다음 글 없음; 이 시리즈 공개 마지막 order 12 | 종결 안내와 맞음 |
| Ethernet 1 | 158행 “Ch 2: 실시간 요구사항 — Determinism·Cycle Time” | `embedded/protocols/industrial-ethernet/chapter02-realtime-requirements` / 공개·2 / “산업용 통신 실시간 요구사항 — Determinism·Jitter·Cycle Time” | 일치 |
| Ethernet 2 | 228행 “Ch 3: EtherCAT 아키텍처 — Processing on the Fly” | `embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture` / 공개·3 / “EtherCAT 아키텍처 분해 — Processing on the Fly 메커니즘” | 일치 |
| Ethernet 3 | 217행 “Ch 4: EtherCAT 프레임 — Datagram·WKC” | `embedded/protocols/industrial-ethernet/chapter04-ethercat-frame` / 공개·4 / “EtherCAT 프레임 구조 분석 — Datagram·WKC·Address 모드” | 일치 |
| Ethernet 4 | 285행 “Ch 5: EtherCAT Master/Slave — SOEM·IgH” | `embedded/protocols/industrial-ethernet/chapter05-ethercat-master` / 공개·5 / “EtherCAT Master 구현 비교 — SOEM·IgH·TwinCAT 분석” | 일치 |
| Ethernet 5 | 431행 “Ch 6: PROFINET 개요 — RT·IRT 클래스” 및 RT/IRT·GSDML 예고 | `embedded/protocols/industrial-ethernet/chapter06-profinet` / 공개·6 / “PROFINET 개요 분석 — RT·IRT 클래스와 실시간 등급” | slug/order/title이 맞고 target 첫 본문(15~19행)이 CC-A/B/C, RT·IRT, Controller/Device/Supervisor, GSDML 범위를 예고하므로 후행 설명도 맞음. |

추가로 점수에 영향을 줄 관련 항목 label: HBM 8의 275행 Ch 1은 실제 title이 다르고, 278행 CXL Ch 8은 링크가 없으며 실제 title이 다르고, 279행 UCIe Ch 12는 target `embedded/hardware/ucie/chapter12-case-studies`, order 12지만 `draft: true`. HBM 9의 138행 Ch 5 설명은 target의 실제 내용을 과장한다. HBM 10의 203행 Recipes Ch 149 target은 실제 `embedded/modern-recipes/part11-15-pcie-to-cxl`, 공개 order 150. HBM 11의 130행 Ch 9 실측 설명은 Ch 9 본문과 어긋나고, 131행 BISnp 설명은 Ch 10이 가리킨 실제 설명 위치와 어긋난다; 135행 Recipes Ch 149도 실제 order 150. HBM 12의 152행 범위 “Ch 149~151”은 target order 150을 포함하므로 단순히 “Ch 149 오기”로 취급하지 않으며, 161행 Ch 9 실측 설명은 실제와 어긋난다. Ethernet 1의 164행 Preemption target은 공개 order 4이지만 본문은 PREEMPT_RT를 다루지 않는다. Ethernet 1·2·5의 IRQ affinity label은 target 공개 slug `embedded/modern-recipes/part7-13-irq-affinity`, order 87과 번호가 맞지 않는다. Ethernet 2의 Preemption label은 공개 target order 4와 title이 맞다. Ethernet 3의 285행 next, 289~291행 cross-series links, Ethernet 5의 431행 next 및 435~438행 links는 기존 보고서가 기록한 label/title 대응을 유지한다.

## Sol 최종 재채점 시 남은 점검

- A~G를 이 문서의 동의·이견 근거와 함께 다시 점수화하고, 이 문서의 동의 표기를 최종 확정값으로 복사하지 않는다.
- factcheck 오류 확인은 원문 내부 산술·출력 모순(Ch 1 64행, Ch 2 34·41행, Ch 4 104~126·272행, Ch 5 155~168/64~138, 320/410, 408/410행)에 한정한다. Ch 3/4 명령 번호, Ch 2/3 DC 차이, 서로 다른 조건의 측정·예시, 완곡한 본문과 단정 정리의 간극은 1차자료 확인 또는 uncertainties로 둔다.
- D의 경우 현재 59개 Recipes 글 변경을 반영하며, 위에 병기한 현재 Recipe spans가 이전 보고서 당시와 달라진 곳은 비교 글 변경으로 표시한다. 다른 시리즈의 오래된 수치·링크 대상 차이는 평가 오류로 처리하기 전에 대상 글 변경 여부를 살핀다.
