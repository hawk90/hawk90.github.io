# 공개 글 독립 재검토 — 루프 32

기준 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 원문 전문을 직접 읽고 근거·중복 비교·링크 의미를 다시 판단했다. 초벌 evidence는 위치 탐색 참고로 사용했으며 점수를 확정 복사하지 않았다. 원문과 기존 보고서 및 사용자 파일 수정·커밋 없음.

공통 검사: [double-check-gates-2026-10-18.md](./double-check-gates-2026-10-18.md). 정적 검사 통과는 사실 검증 완료가 아니다. 앵커는 `10550ca1`의 UART(49)·Build(50) 역사 원문을 기준으로 하고, 현행 Recipes는 D 비교에만 사용한다. 실행/컴파일 검증 없이 예시를 실측으로 인정하지 않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `chapter05-prod-leak-diagnosis.md` | 13 | 12 | 7 | 10 | 7 | 4 | 2 | 55 | 미검증 | 병합 검토 |
| `chapter06-cxl-memory-diagnostics.md` | 9 | 8 | 5 | 7 | 6 | 7 | 3 | 45 | 검증됨 | 병합 검토 |
| `chapter07-tiered-memory-diagnostics.md` | 13 | 13 | 6 | 11 | 7 | 7 | 1 | 58 | 오류 확인 | 우선 조치 |
| `chapter01-fundamentals.md` | 11 | 11 | 4 | 9 | 7 | 4 | 2 | 48 | 오류 확인 | 우선 조치 |
| `chapter02-tlp.md` | 10 | 11 | 5 | 12 | 7 | 7 | 1 | 53 | 미검증 | 병합 검토 |
| `chapter03-config-space.md` | 8 | 9 | 4 | 8 | 6 | 6 | 1 | 42 | 오류 확인 | 우선 조치 |
| `chapter04-bar-mmio.md` | 10 | 10 | 4 | 10 | 7 | 7 | 1 | 49 | 오류 확인 | 우선 조치 |
| `chapter05-interrupts.md` | 9 | 9 | 4 | 10 | 7 | 4 | 1 | 44 | 오류 확인 | 우선 조치 |
| `chapter06-power-management.md` | 9 | 9 | 5 | 11 | 7 | 5 | 1 | 47 | 미검증 | 병합 검토 |
| `chapter07-error-handling.md` | 9 | 9 | 5 | 10 | 7 | 5 | 1 | 46 | 오류 확인 | 우선 조치 |

기존 합계 477 → 재검토 487. PCIe PM의 기존 오류 확인은 wake전후상태를혼합할수있어 미검증으로철회. BAR의기존64GB/8TB·40bit산술단정은철회하되 ReBAR capability ID를공식헤더로새로확인해오류상태유지. D는독립진단관점과후속심화역할을반영했다. 검증됨memory6은4a033a72대조기록승계이며전체독립실행검증이아니다.

### chapter05-prod-leak-diagnosis.md

source_file: `src/content/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis.md`
url: `/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis`

score_status: 잠정 · score: 55 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 52행RSS와65행PrivateDirty는동일시점/범위명시없어error아님.169행monitor_pss.sh정의/174행slope시간단위·signal-safeprof.dump·drgn-pPID·ru_maxrss·systemd-oomd행동미대조.

| 항목 | 근거 |
| --- | --- |
| A13 | 19~176행확인→영역→콜스택→수정후검증순서와267~279행급증dump가선택흐름을만들어A13유지. |
| B12 | 181~261행cgroup/PSI와언어별도구까지끝나지만monitor_pss.sh의샘플간격과slopeKB/sec판정전제가없어B12유지.B≤13. |
| C7 | 25~29·60~64·110~111·197~199행명령은있으나version/관찰환경없음.86행5%·144행2~3x·175행1024문턱무출처로C≤8,7유지. |
| D10 | 23~30/60~64/50~57행↔memory chapter01-memory-accounting.md84~90/156~161/165~170행PSS/dirty/RSS;82/95/110행↔chapter03-jemalloc-tcmalloc.md73~80/138/122~128행;317~327행↔python chapter05-faulthandler-tracemalloc.md72~79행코드반복.운영보호/PSI전담으로10유지. |
| E7 | 2·5행장기누수/proc/cgroup/OOM약속을19~261행이직접다뤄7유지. |
| F4 | 13·347행마지막/5장종결과달리실제동일series공개6/7존재.372~375·379~381행대상은모두공개주제맞지만종결안내가틀려4유지. |
| G2 | 382~385행공식cgroup/PSI/systemd자료있으나주장별조항/실행판없어2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~385행. SHA-256: `ceb072fe841fd7a6029f319ab3f368c0131e6bf7ca0dc953d52a7112bddfffbc`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter06-cxl-memory-diagnostics.md

source_file: `src/content/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics.md`
url: `/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics`

score_status: 잠정 · score: 45 · confidence: 중간 · factcheck: 검증됨
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 4a033a72의ndctl/커널@main/master대조기록직접읽어승계.현재numastat/DAMON비교만으로placement실패판정조건·numabalancing제약의전체독립검증은미완료.

| 항목 | 근거 |
| --- | --- |
| A9 | 37~66행CLI/opcode/field/EventLog정리는구체적이나새관찰/실패사례없이9유지. |
| B8 | 관점→numastat→health→event→DAMON→함정→workflow완료.다만출력·판정기준없음은한계이고짧은단일device질문이있어7→8.B≤13. |
| C5 | 29~32·39~50·74~77행명령있지만성공/실패결과및커널판부족.절차C≤9,실제값판정예없어5유지. |
| D7 | 57~66/39~53/97~102/110행↔embedded chapter09-cxl-device-troubleshoot.md19~30/34~83/159~164/172행동일CLI/EventLog/장기지표반복.그러나이글25~34·68~80행NUMA/tier관점은장치고장글과달라5→7. |
| E6 | 2·5행RAS추적/NUMA분석을명령과workflow로일부이행.실제관찰은없지만단순무이행5보다6. |
| F7 | 114행next공개order7tiered글과내용맞음.118~121행memory1/HBM9/perf54/embedded9공개slug/title모두일치.53·94행고유경계안내까지있어7유지. |
| G3 | 53행ndctldoc70행kerneltrace파일·field/opcode가주장과연결.본문공식URL/고정판은없어3유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~121행. SHA-256: `0beb57ab825281b004fc075e6ff87d987b05995c3fb12bced7a5edf350fdcc23`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter07-tiered-memory-diagnostics.md

source_file: `src/content/blog/tools/debugging/memory/chapter07-tiered-memory-diagnostics.md`
url: `/blog/tools/debugging/memory/chapter07-tiered-memory-diagnostics`

score_status: 잠정 · score: 58 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 189행damosdemote-first·tier_id·tracepoint필드/CLI·migrate버전·SIGBUS설명은원출처미대조.38행200ms와71행10초만으로는관찰조건을단정안하고공식quota근거를핵심으로삼음.

| 항목 | 근거 |
| --- | --- |
| A13 | 14~80행모델/설정과141~207행falsepromotion/thrashing/충돌증상별대응이있어13유지. |
| B13 | 설정→tier→관찰→실패→튜닝으로완결하나174행quota경로/의미가공식ABI와다르다.전체판별정확성열려B13상한유지. |
| C6 | 36~43·64~80·113~136·216~241행명령/출력있으나실험판/실제실행없고23·27~32·207~212행무출처overhead/권장값으로C≤8,잘못된quota절때문에6유지. |
| D11 | 27~32행DAMON파라미터↔performance part5-11-cxl-profiling-tools.md77~80행,85~107행tier인터페이스↔bootloader chapter36-boot-memory-topology.md139~147행공통.이글falsepromotion/thrashing설계질문전담이라11유지. |
| E7 | 2·5행DAMOS/promotion진단을48~207행설정/증상/관찰로답해7유지. |
| F7 | 현재마지막공개order7종결맞음.282~286행memory1/6/perf55/HBM9/postmortem5공개slug/title대응.282행Ch6링크는실제로있어초벌의링크부재의견기각.종결다음postmortem설명과실제NUMA/core내용맞아6→7. |
| G1 | 본문kernel판·공식API링크·권장값원자료없어1유지. |

전문 읽기: 1~290행. SHA-256: `ea1cdf2cc7b4d0e78bb0251a3dc4e89266966f8132b60e3a820f18c9c6998d19`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter01-fundamentals.md

source_file: `src/content/blog/embedded/hardware/pcie/chapter01-fundamentals.md`
url: `/blog/embedded/hardware/pcie/chapter01-fundamentals`

score_status: 잠정 · score: 48 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: Gen6/7encoding·effectiveBW/GT→GB단위·22년·spec양산전망등공식미대조.74행lane전제만동일본문정의에대입하여error확정.

| 항목 | 근거 |
| --- | --- |
| A11 | 25~37행PCI한계→직렬전환과110~139행FLIT/인접표준을연결하지만일반개관으로11유지. |
| B11 | PCI→계층→토폴로지→lane→세대→인접표준완결.71행x16=16lane인데74행x16을32lane으로두어4wire/lane정의와양립못함.B11유지. |
| C4 | 166행lspciLnkCap/LnkSta확인외실험없고90~92행실측90~110GB/s무출처로C≤8,4유지. |
| D9 | 98~104행encoding↔chapter09-physical-layer.md105~111행,110~117행FLIT↔chapter08-dllp.md110~118행동일표/주제.상위지도를선행소개하는허브역할을인정해D8→9. |
| E7 | 2·5행기초/계층/토폴로지/세대약속을39~139행전부다뤄7유지. |
| F4 | 169행next공개order2TLP및splittransaction대응.174~178행CXL1/HBM9/perf29공개내용맞지만176행Recipes149는target실제order150.로드맵18편도실제19편이라F4유지. |
| G2 | 17·180~190행자료정책과spec판이있으나구체주장별출처없어2유지. |

전문 읽기: 1~189행. SHA-256: `dc07a40826323e847bb142b4bc0f1c06ac2339089e8528131db9eada31def73a`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter02-tlp.md

source_file: `src/content/blog/embedded/hardware/pcie/chapter02-tlp.md`
url: `/blog/embedded/hardware/pcie/chapter02-tlp`

score_status: 잠정 · score: 53 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 31행header3/4DW일반화·41행traffic99%·78행tag·80행completion최소개수·131~133행ordering보장조건/RO·ECRC전제미대조.

| 항목 | 근거 |
| --- | --- |
| A10 | 44~80행DW/write/read와tag추적을풀지만표준입문재구성이라10유지. |
| B11 | 구조/가족→split→routing/attribute→ordering→ECRC/고급기능완료.78·104·167행tag비트수와54·179행DW산술은내부일치.기술불확실로B11유지. |
| C5 | Len8DW=32B,4KiB/256B=16산술은확인.명령/실행환경없고41행99%출처없어C≤8,5유지. |
| D12 | 82~90행routing↔chapter03-config-space.md174~182행Configrouting은후속영역상세로역할분리.135~146행LCRC/ECRC↔chapter07-error-handling.md107~116행poison/AER경계도세부진단으로갈린다.TLP구조전담D12유지. |
| E7 | 2·5행기본packet/가족/split/ordering을19~146행이모두설명해7유지. |
| F7 | 17행전제Ch1,195행next공개order3Config와후행capability실내용맞음.199~202행1/7/8/11공개각라벨/ECRC·DLLwrapper·ATS설명대응.전제/단계표고유구조로7유지. |
| G1 | 204~206행공통자료정책만있고주장별1차링크/실행판없어1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~206행. SHA-256: `734fccd400030c3309db3bfc9fe71b8a5fac3f50f83858c2aba8b4e4746e77e6`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter03-config-space.md

source_file: `src/content/blog/embedded/hardware/pcie/chapter03-config-space.md`
url: `/blog/embedded/hardware/pcie/chapter03-config-space`

score_status: 잠정 · score: 42 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: ECAMsegment·Type0/1전환·capability헤더3byte·DVSECfield/ID범위등미대조.아래고정판헤더로확인한ID오류외에는전체검증완료로보지않음.

| 항목 | 근거 |
| --- | --- |
| A8 | 19~143행레지스터/ID표가대부분이고157~193행해설도일반입문이라8유지. |
| B9 | layout→cap→ECAM→routing→LTR완료하나핵심lookup용ID표125~147행다수오류로질문해결을방해하여9유지. |
| C4 | 166행4KB×256=1MB등산술가능하나실제configdump/디바이스명/관찰없음.C절차상한9이하,4유지. |
| D8 | 49~57·136행BAR/ReBAR↔chapter04-bar-mmio.md17·85·101행,95~97행MSI↔chapter05-interrupts.md34~50행,Type0/1header표↔chapter18-register-maps.mdConfig부분이반복.표위주lookup중복으로8유지. |
| E6 | 2·5행4KB/ECAM/Capability를모두다루나유효한reference로서ID표오류가큰한계.범위는맞아6유지. |
| F6 | 230행next공개order4BAR이며size/prefetch/ReBAR후행설명맞음.234~237행TLP2/BAR4/register18/CXL6공개대응.155행DVSEC심화설명도CXL6실제내용.표계층은있지만별도길잡이약해6유지. |
| G1 | 239~241행Ch1정책링크뿐이며표의고정표준판/실제공식헤더링크없어1유지. |

전문 읽기: 1~241행. SHA-256: `c4264ebd540bb2dc13025be46aa6dd39b116a77b65d19637fdebb30e426c2b0b`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter04-bar-mmio.md

source_file: `src/content/blog/embedded/hardware/pcie/chapter04-bar-mmio.md`
url: `/blog/embedded/hardware/pcie/chapter04-bar-mmio`

score_status: 잠정 · score: 49 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 기존15행64GB대102행8TB는상한/예시범위문구차이,40bit는address폭이아닌encoding일가능성있어그산술단정근거는철회.대신101행ReBARID0x23을공식헤더로오류확인.64bit/prefetch/VFstride/GPU매핑조건미대조.

| 항목 | 근거 |
| --- | --- |
| A10 | 32~47행probing산술과124~140행Linux매핑을연결하지만일반표준입문수준10유지. |
| B10 | 종류→size→64bit→prefetch→enumeration→ReBAR→VF→Linux완료.101행핵심capID가틀리고표준판/구체BAR검증없어10유지. |
| C4 | 45행NOTfff00000+1=00100000확인.134~140행pci_iomap/writel조각은실제device/REG정의·예상값없어4유지.C≤9. |
| D10 | 32~47행probe↔bootloader chapter34-pcie-enumeration.md80~86행같은절차,126~134행resource↔chapter10-linux-basics.md98·114~115행공통.이글size/ReBAR/VF결합전담을인정해9→10. |
| E7 | 2·5행host주소매핑과ReBAR/VF까지19~162행이설명.7유지. |
| F7 | 17행전제Config3,177행next공개order5interrupt/pervectormask실내용일치.181~183행3/10/12공개대상및pci_iomap/driver설명맞음.표준size예에서Linux로단계연결있어7유지. |
| G1 | 187행공통정책링크뿐이며구체BAR/ECN·Linux판출처없어1유지. |

전문 읽기: 1~187행. SHA-256: `ecca14166c2b50c7aa7b27176488b44e75e7743d7d4c69ffa6b9429d1d0a8f6e`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter05-interrupts.md

source_file: `src/content/blog/embedded/hardware/pcie/chapter05-interrupts.md`
url: `/blog/embedded/hardware/pcie/chapter05-interrupts`

score_status: 잠정 · score: 44 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: IRQfallback/affinity/remapping기본활성·APIC흐름/queue1:1등미대조.40·42대151행MMC동일필드설명충돌은공식헤더로도재확인.

| 항목 | 근거 |
| --- | --- |
| A9 | 21~61행3메커니즘과113~133행Linux/affinity를나열하나실제구현/비교관찰없어9유지. |
| B9 | INTx→MSI/X→IR→LinuxAPI→affinity완료.151행MMC가mask지원표시라지만40행vector개수/42행별도mask정의와충돌.9유지. |
| C4 | 113~121행driver조각은있으나하드웨어/반환nvecs관찰/해제실행없음.4유지.C≤9. |
| D10 | 36~42행MSI표↔chapter18-register-maps.md215~225행field표중복.123~133행affinity는같은IRQ문제지만전체질문은인터럽트메커니즘이라9→10.다른Recipes전체내용과동일하다고보지않음. |
| E7 | 2·5행INTx/MSI/MSIX/IR을21~105행모두다루어범위명확.독립검색의도대응은6보다7. |
| F4 | 169행next공개order6D/L/ASPM맞고173/176행Config3/Linux10대응.174행BAR4후행MSIXtable과175행DMA11후행IR은대상본문이별도구현대신다시이글로보내므로깊이안내가틀림.4유지. |
| G1 | 180행정책링크뿐구체IRQ/APIC/Linux판출처없어1유지. |

전문 읽기: 1~180행. SHA-256: `705b09e00653422769f9ef581459c7ff6a57f16a86138fc877a70f69015d2fed`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter06-power-management.md

source_file: `src/content/blog/embedded/hardware/pcie/chapter06-power-management.md`
url: `/blog/embedded/hardware/pcie/chapter06-power-management`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 기존41행L3off대145행PME wake는wake전/후link상태·sideband/TLP단계를구분해야하므로내부모순만으로확정했던error철회. D3cold/PME/CLKREQ/ASPM의전원·시간조건은PCI-SIG/제조사추가대조필요.

| 항목 | 근거 |
| --- | --- |
| A9 | 21~107행D/L/ASPM/clock/wake를묶으나일반입문·권고중심9유지. |
| B9 | 상태정의→ASPM→substate→wake→전환→Linux완료.41/76/145행wake전송의상태전제불명확을uncertainty로남겨B9유지.B≤13. |
| C5 | 109~115행sysfs·lspci확인은있으나device/전력/latency측정없음.15·36~40·67행무출처mW/시간으로C≤8;5유지. |
| D11 | 36~40·51행Lstate/ASPM↔chapter09-physical-layer.md29~31·122행공통.그글은LTSSM/신호이고이글은device·linkPM선택이라10→11.단순키워드중복을강한중복으로안봄. |
| E7 | 2·5행Dstate/Lstate/ASPM/CLKREQ/PME를각대응절로답해7유지. |
| F5 | 150행next공개order7AER/DPC후행설명맞음.154/156/157행Config3/PHY9/BSP2공개대응.155행Interrupt5의PME흐름은실제해당글에상세없어5상한유지. |
| G1 | 161행공통정책링크외공식PM/벤더원문·판없어1유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~161행. SHA-256: `c0590da933ca46a10d8b96dcac9b3dff4300d99e1e1be16a4310d0fe9d2fb47b`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter07-error-handling.md

source_file: `src/content/blog/embedded/hardware/pcie/chapter07-error-handling.md`
url: `/blog/embedded/hardware/pcie/chapter07-error-handling`

score_status: 잠정 · score: 46 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: pci_error_handlers의link_reset·poisonheader해석·DPC/FLR조건은별도미대조.아래고정판헤더로ReplayRollover/Timer가correctable임만확인,다른주장검증완료아님.

| 항목 | 근거 |
| --- | --- |
| A9 | 79~105행Linuxcallback과153~167행사고대응은있으나잘못된Replay분류를추가가치로세지않아9유지. |
| B9 | 계층별→AER→ERR→DPC→callback→reset→Replay완료.138/165~167행rolloverUE분류가공식headercorrectable과달라9유지. |
| C5 | 55행lspci/95~105행등록코드·129행reset명령있으나실제AERdump/주입실험과결과없음.C≤9,5유지. |
| D10 | 79~105행callback↔chapter14-linux-operations.md67~100행,153~159행대응↔그글178~184행복구설명,131~141행replay↔chapter08-dllp.md57~65행동일문제/결론.에러분류전담D10유지. |
| E7 | 2·5행CE/UE/AER/DPC/Linux복구를각대응절로설명해7유지. |
| F5 | 182행next공개order8DLL/credit/FLIT대응,186~190행TLP2/DLL8/Linux14/troubleshoot16/BSP19공개대상내용맞음.17행아직다음인Ch8을이미읽었다는전제안내가틀려5유지. |
| G1 | 194행공통출처정책만구체callback/errorheader버전링크없어1유지. |

전문 읽기: 1~194행. SHA-256: `c15aa589dd721e917654df877402e9e109171d67651f573aabe1803b05955b99`. 기준 HEAD 원문과 바이트 일치를 확인했다.

## 적용 상한과 검증 한계

정확성 불확실이 열리면 B≤13(AP-C-24), 무출처 수치 C≤8, 절차만 있는 경우 C≤9를 우선 적용했다. F는 실제 slug/order/draft/title과 안내 뒤 설명을 대조하고 틀린 대상/설명이 있으면5 이하, 템플릿 외 글 고유 안내가 있을 때7 이상으로 판단했다. 축약 제목과 실질적인 오안내를 구분했다. 다른 시나리오·산문 개수·완곡한 본문/단정 요약·언어/API 기억만으로 오류를 확정하지 않았다. 실행하지 않은 코드와 관찰되지 않은 로그는 검증 완료로 기록하지 않는다.

## 1차자료 대조 — 2026-10-19

[Linux v6.12 pci_regs.h](https://github.com/torvalds/linux/blob/v6.12/include/uapi/linux/pci_regs.h)에서 PCI_EXT_CAP_ID_DVSEC=0x23, REBAR=0x15, ACS=0x0D, ATS=0x0F, TPH=0x17, PASID=0x1B를직접확인하여Config3표와BAR4의ID를대조했다. MSI는QMASK=0x000e와MASKBIT=0x0100으로구별된다. PCI_ERR_COR_STATUS 아래REP_ROLL=0x100과REP_TIMER=0x1000이있어Error7의UE분류와다름을확인했다.

[Linux v6.12 DAMON usage](https://raw.githubusercontent.com/torvalds/linux/v6.12/Documentation/admin-guide/mm/damon/usage.rst)의FilesHierarchy와quotas설명에서sz_permil은quotas/weights/의우선순위가중치이고quota한도경로가아님을확인했다. 따라서Tiered7 174행quotas/sz_permil에100을써migration0.1%한도를정한다는예는경로/의미가다르다.추가ABI전부를검증한것은아니다.
