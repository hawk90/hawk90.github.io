# 공개 글 독립 재검토 — 루프 31

기준 커밋: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 원문 전문을 직접 읽고 근거·중복 비교·링크 의미를 다시 판단했다. 초벌 evidence는 위치 탐색 참고로 사용했으며 점수를 확정 복사하지 않았다. 원문과 기존 보고서 및 사용자 파일 수정·커밋 없음.

공통 검사: [double-check-gates-2026-10-18.md](./double-check-gates-2026-10-18.md). 정적 검사 통과는 사실 검증 완료가 아니다. 앵커는 `10550ca1`의 UART(49)·Build(50) 역사 원문을 기준으로 하고, 현행 Recipes는 D 비교에만 사용한다. 실행/컴파일 검증 없이 예시를 실측으로 인정하지 않는다.

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| `chapter04-ebpf-kernel.md` | 9 | 10 | 7 | 7 | 7 | 5 | 2 | 47 | 미검증 | 병합 검토 |
| `chapter05-kdb-kgdb.md` | 10 | 11 | 7 | 12 | 7 | 5 | 2 | 54 | 오류 확인 | 우선 조치 |
| `chapter06-crash-drgn.md` | 10 | 11 | 6 | 11 | 7 | 5 | 2 | 52 | 오류 확인 | 우선 조치 |
| `chapter07-panic-oops.md` | 12 | 12 | 6 | 11 | 7 | 4 | 2 | 54 | 오류 확인 | 우선 조치 |
| `chapter08-cxl-driver-debug.md` | 14 | 11 | 7 | 10 | 7 | 5 | 2 | 56 | 검증됨 | 병합 검토 |
| `chapter09-drivers-cxl-walkthrough.md` | 13 | 12 | 7 | 1 | 7 | 5 | 3 | 48 | 검증됨 | 병합 검토 |
| `chapter01-memory-accounting.md` | 11 | 11 | 7 | 10 | 7 | 5 | 2 | 53 | 오류 확인 | 우선 조치 |
| `chapter02-heaptrack.md` | 9 | 10 | 7 | 11 | 7 | 5 | 2 | 51 | 미검증 | 병합 검토 |
| `chapter03-jemalloc-tcmalloc.md` | 10 | 11 | 7 | 10 | 7 | 5 | 2 | 52 | 미검증 | 병합 검토 |
| `chapter04-glibc-tools.md` | 10 | 11 | 6 | 10 | 7 | 4 | 2 | 50 | 미검증 | 병합 검토 |

기존 합계 510 → 재검토 517. 신규 오류 확인: crash/drgn 명령 주소 차이가 +0x42와 맞지 않아 미검증→오류 확인. KGDB는 기존 내부모순의 조건혼합을 철회했지만 공식 고정판 문서로 실제 잘못된 일반화와 옵션순서를 확인해 오류 상태 유지. CXL2편 검증됨은 읽은 대조커밋 기록 승계이며 전체 독립 재검증이 아니다.

### chapter04-ebpf-kernel.md

source_file: `src/content/blog/tools/debugging/kernel/chapter04-ebpf-kernel.md`
url: `/blog/tools/debugging/kernel/chapter04-ebpf-kernel`

score_status: 잠정 · score: 47 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 23/379/421행crash불가보장·verifier상한·388행비용·183행vfs_read의diskIO해석·probe심볼은원출처대조미완료.언어/API기억으로오류확정안함.

| 항목 | 근거 |
| --- | --- |
| A9 | 61~121행probe/builtin목록과238~269행BCC카탈로그중심.336~364행관측예는선택기준/실제분석결과가짧아9유지. |
| B10 | 설치→probe→map/hist→BCC→CO-RE→사례→verifier흐름완료.안전보장/부하단정검증없어B≤13,10유지. |
| C7 | 45~57·145~164행원라이너/예상출력과276~330행BCC구현은있으나workload/성공·실패재현전제약함.388행수십ns등무출처수치로C≤8;7유지. |
| D7 | 65~78행probe↔performance-engineering/part5-04-ebpf.md80~101행,145~164행readhist↔그글58~78행,252~263행BCC목록↔110~118행,372~379행verifier↔28~31·195행직접중복.7유지. |
| E7 | 2·5행동적관측/원라이너/BCC약속을45~164·276~330행명령/예상출력으로구체화.분석단어만으로5에묶을이유없어7. |
| F5 | 424행next공개order5kgdb,430~432행kernel3/5/perf43공개대응.432행overhead/latencyspike는대상perf125~153행에실제로있음.433행무링크strace추천은draft라5유지. |
| G2 | 238·325·434~437행bpftrace/BCC/libbpf공식repo와0.20판은있으나verifier/수치주장판·절연결없어2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~437행. SHA-256: `25d2e88f80adf3d40e306bb9e6bcd1c2cf470a459d964c3b7bed07d26f538cbe`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter05-kdb-kgdb.md

source_file: `src/content/blog/tools/debugging/kernel/chapter05-kdb-kgdb.md`
url: `/blog/tools/debugging/kernel/chapter05-kdb-kgdb`

score_status: 잠정 · score: 54 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 기존102행/298행을일률적동일조건내부모순으로단정한근거는철회.아래고정판공식자료로298행공유포트금지단정과50행부팅옵션순서를별도확인했다.전체예제실행/VM·kgdboe/API는미검증.

| 항목 | 근거 |
| --- | --- |
| A10 | 45~115행QEMU/실하드웨어를나누고238~269행NFS정지예로이용시점을보이나독립분석결과없어10유지. |
| B11 | 구성→접속→진입→kdb→VM→ramoops→NFS→한계완료.50행kgdbwait가kgdboc보다먼저나오고298행동일console포트를충돌원인으로일괄진단해공식문서와어긋남.B11유지. |
| C7 | 50~88·102~115행명령과예상GDB출력이있지만정확kernel판/rootfs/완성시험없음.시리얼성능등정량실측도없어절차C≤9,7유지. |
| D12 | 50·59~62행↔BSP chapter11-bootlog-debugging.md297~304행kgdboc/kgdbwait공통설정이나보드/port는달라동일예제복제아님.202~218행↔bootloader chapter22-debugging.md209~226행ramoops는사후부트문맥차이.인터랙티브정지질문전담12유지. |
| E7 | 2·5행source-step/breakpoint약속을67~90·238~269행break/frame/print로수행.개념소개만인6보다7이맞음. |
| F5 | 315행next공개order6crash/drgn과319~321행kernel4/6/GDB8공개/remoteRSP주제맞음.323행pstore-blk문서뒤ramoops설명은서로다른backend라F≤5유지. |
| G2 | 322행공식kgdb링크와323행pstore문서가있으나판고정/CONFIG별설명과연결없어2유지. |

전문 읽기: 1~323행. SHA-256: `ef275a5a2ff2ade7b4035c088bf181d1cce2353daeb960abde37118a25501ffe`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter06-crash-drgn.md

source_file: `src/content/blog/tools/debugging/kernel/chapter06-crash-drgn.md`
url: `/blog/tools/debugging/kernel/chapter06-crash-drgn`

score_status: 잠정 · score: 52 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: drgnhelper import/CLI·vmcore안전·362~387행제목/API미대조.원문사고예를실제실행한것으로취급하지않음.152~156행주소/offset산술은아래신규오류로확인.

| 항목 | 근거 |
| --- | --- |
| A10 | 19~71행kdump와73~305행crash/drgn대비는교재형이고320~357행사고분류가일반목록이라10유지. |
| B11 | kdump부터분석/스크립트/라이브/사고유형끝까지흐름있음.151행함수시작c0123410과153행명령c0123456은차이0x46인데153행+0x42라동일disassembly가산술상불일치.B11유지. |
| C6 | 강제panic·예상vmcore·bt/dis예는있지만위offset불일치가핵심원인추적을흐림.282~291행자체스크립트helper전제도불명확.기존7→6;절차만인C≤9범위. |
| D11 | 320~352행사고유형↔chapter07-panic-oops.md66~73·230~298행NULL/lockup/hung/KASAN겹침;그글은로그해독이고이글은vmcore명령이라역할구별.185~305행일반drgn↔postmortem chapter05-cxl-device-postmortem.md25~64행은도메인적용차이.11유지. |
| E7 | 2·5행vmcore상태복원에73~305행bt/list/struct/helper가대응하므로7유지. |
| F5 | 413행Ch7마지막안내는동일Kernelseries공개order8/9존재와어긋남.417~419행kgdb5/panic7/postmortem1slug/title는정상이며419행user-spacecore후행설명도맞음.5유지. |
| G2 | 185·420~422행drgn공식repo/docs·crash매뉴얼·kdump문서있지만동일dump/kernelbuild기록없어2유지. |

전문 읽기: 1~422행. SHA-256: `a116f22633300831dbfd8dc5fba8ad9e2371a0a5f4632c819ecd2bd88825edef`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter07-panic-oops.md

source_file: `src/content/blog/tools/debugging/kernel/chapter07-panic-oops.md`
url: `/blog/tools/debugging/kernel/chapter07-panic-oops`

score_status: 잠정 · score: 54 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: 173행offset0x10두번째64bit필드는정렬/구조체구성전제없어불확실로분리.98~106행은글이정의한bit를대입한산술오류만으로factcheck유지.실제x86표/ABI/decoder명령은미대조.

| 항목 | 근거 |
| --- | --- |
| A12 | 29~62행긴Oops를9요소로분해하고312~334행분석순서를제시하나사례/빌드증거없어12유지. |
| B12 | 원인→PF→taint→RIP/code/register→trace→사고유형완결.98~102행P0/W1/U2/I4정의에서0x11은P+I이며106행user+write+protection이면0x7이라불일치.B12유지. |
| C6 | 131~165·199~210행addr2line/objdump/decoder는있지만vmlinux/module/주소일치기록없음.잘못된PF분석예때문에재현성낮아6유지.C절차상한9이하. |
| D11 | 131~139·199~210행↔chapter01-user-kernel-boundary.md199~214행addr2line/vmlinux공통.230~298행↔chapter06-crash-drgn.md330~352행사고유형반복.이글은로그field해석중심으로11유지. |
| E7 | 2·5행메시지위치찾기를29~228·312~334행로그→주소→소스순서로실제설명.6→7;정확성오류가범위미이행을뜻하진않음. |
| F4 | 13행마지막/340행7장종결은공개order8/9누락.관련367~372행kernel1~6및376~377행postmortem1/sanitizer2는공개주제대응.종결후읽는순서틀려4유지. |
| G2 | 165·380행officialdecoder/kernel문서있으나예제의실제module/ISA판/근거미기록.2유지. |

전문 읽기: 1~382행. SHA-256: `2378ed0461c33e3065bffa4b1638cb87609816935e0bf1cd503abb93d5b2e7bd`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter08-cxl-driver-debug.md

source_file: `src/content/blog/tools/debugging/kernel/chapter08-cxl-driver-debug.md`
url: `/blog/tools/debugging/kernel/chapter08-cxl-driver-debug`

score_status: 잠정 · score: 56 · confidence: 중간 · factcheck: 검증됨
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 18f8b421의linux@master/drgn@main대조기록을직접읽어승계.고정sha누락과57~67행BTF·opcode0필터/실행환경은잔여불확실.전체독립실행검증은아니다.

| 항목 | 근거 |
| --- | --- |
| A14 | 15~23행모듈지도에서31~70행추적도구,76~94행객체관찰로접근법을구체화해14유지. |
| B11 | 모듈→probe→mailbox→drgn→함정→정리가명확.실제trace출력/빌드판과실패별관찰이없고BTF전제가열려11유지.B≤13. |
| C7 | 31~45행rescan/ftrace와57~67행opcode실패추적,76~94행객체순회는재현명령이지만결과/환경없음.C≤9;시간수치의본문공식출처부족도C≤8이하여7유지. |
| D10 | 15~23행↔chapter09-drivers-cxl-walkthrough.md36~44행모듈표;54/102/105행↔그글184~188/207·280/228~245행sendcmd/timeout/error동일.현행Recipes part11-17-linux-cxl-driver.md31~45·56·77~83행은층별진단/명령이라완전복제와구분.9→10. |
| E7 | 2·5행ftrace·bpftrace·drgn세약속이27~94행각각절과실제코드로대응해6→7. |
| F5 | 119행next공개order9codewalkthrough내용맞음.125~127행kernel3/4/6과130행embeddeddebug9공개대응.128행Recipes151라벨은공개order152라5유지. |
| G2 | 본문54·70·96·102행파일/심볼이주장에연결되나공식URL/고정판이본문에없어2유지.검증커밋은G출처로중복가산하지않음. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~125행. SHA-256: `3956376afe9c309823eef650e5d25766c2c64f10bcc36877af356c827c9295e7`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter09-drivers-cxl-walkthrough.md

source_file: `src/content/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough.md`
url: `/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough`

score_status: 잠정 · score: 48 · confidence: 중간 · factcheck: 검증됨
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: 8e18e425·d921312c의master소스/구조표대조기록을직접읽었다.본문v7.3-rc6과@master의정확sha대응·생략코드실행은미완료.확인기록승계이며전체현재실행검증은아님.

| 항목 | 근거 |
| --- | --- |
| A13 | 87~118·120~180행struct/probe/decoder를실제이름/순서로연결하는추가설명이있지만독립실패관찰없어13유지. |
| B12 | 구조→init→probe→decoder→region→mailbox→RAS→NUMA→lock완료.286~292행정리까지일치하나버전정합이열려12유지.B≤13. |
| C7 | 122~165행decoder발췌·169~180행sysfs단계는구체적이나하네스/예상성공실패결과없음.C≤9,수치본문출처형태부족을함께반영7유지. |
| D1 | 현재hardware/cxl/chapter11-linux-driver.md전문을직접열었다.이글17~31/38~46/87~96/100~118/122~165/169~180/184~221/225~245/249~257/261~269행↔그글23~36/44~52/56~65/69~87/89~134/136~151/153~192/206~228/194~204/230~240행까지표·코드·설명거의동일.D1유지.다른검색의도가입증되지않아병합대상CXL11. |
| E7 | 2·5행entry→sysfs약속은명확한소스워크스루로이행.7유지. |
| F5 | 294행CXL추가편종결은실제공개order9끝과맞음.298~301행kernel8/Recipes152/memory6/postmortem5모두공개target이지만299행Recipes151라벨만틀림.302행kernel.org라는label과Bootlin주소차이는동일소스미러여서그것만으로오류감점하지않음.4→5. |
| G3 | 15·87행mainlinev7.3-rc6판/헤더이름과302행소스뷰어링크있어3유지. |

병합 대상: `src/content/blog/embedded/hardware/cxl/chapter11-linux-driver.md`. 실제로 겹치는 표·코드 범위가 커서 정본을 합치는 방안을 우선 검토한다. 독립적인 kernel walk-through로 남기려면 새 호출 추적과 관찰 결과가 필요하다.

전문 읽기: 1~302행. SHA-256: `fbeadadd4d12c085d4b65d4928f4f6ba3bb65aa573ef7b3322b66395c7cf6347`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter01-memory-accounting.md

source_file: `src/content/blog/tools/debugging/memory/chapter01-memory-accounting.md`
url: `/blog/tools/debugging/memory/chapter01-memory-accounting`

score_status: 잠정 · score: 53 · confidence: 높음 · factcheck: 오류 확인
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 아래 기술/산술 모순 우선 조치.
uncertainties: RSS/PTE포함·PSS합·OOM점수·swappiness·smaps_rollup도입판공식대조미완료.같은PID가다른절에서다른RSS인것은별도예시라오류로세지않음.

| 항목 | 근거 |
| --- | --- |
| A11 | 19~135행개념을procfield/영역으로매핑하고178~248행OOM/시스템회계로확장하나독립진단결과없어11유지. |
| B11 | VSS/RSS/PSS/USS→smaps→OOM→cache→NUMA완결.269~283행동일NUMA블록에서node0물리8000MB인데한프로세스node0가12150MB,전체17650MB로두노드16000MB를넘어예시가양립못함.B11유지. |
| C7 | 39~135·155~176·265~291행명령/예상출력은있지만kernel판/메모리조건없고NUMA불가능출력때문에결과를실측으로인정못함.C≤9,7유지. |
| D10 | 84~91행PSS↔chapter05-prod-leak-diagnosis.md23~30행,155~161행smaps↔그글59~64행PrivateDirty분해,165~176행RSS종류↔50~57행공통.이글은회계의미/필드전담이라10유지. |
| E7 | 2·5행RSS/VSS/PSS와smaps해석을19~176행표/예상출력이직접답해7유지. |
| F5 | 328행next공개order2heaptrack내용맞고332~335행memory2/LSan3/kernel6공개주제맞음.297행ValgrindCh1은실제Memcheckorder2,334행Massif는실제Suppressionsorder5라5상한유지. |
| G2 | 337~340행manproc/cgroup문서있으나각회계주장별kernel판/조항없어2유지. |

전문 읽기: 1~337행. SHA-256: `13dbc90ecd91eda60766e7b097346552b2dd5261ffa4fc0a113f4ae42cb4d3ad`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter02-heaptrack.md

source_file: `src/content/blog/tools/debugging/memory/chapter02-heaptrack.md`
url: `/blog/tools/debugging/memory/chapter02-heaptrack`

score_status: 잠정 · score: 51 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: --record-only/attach·flags·정적바이너리·overhead/누수판정의의미는upstream판대조미완료.서로다른표의2~3x등으로내부모순을단정안함.

| 항목 | 근거 |
| --- | --- |
| A9 | 39~120행출력/GUI와139~180행사용절차는도구사용법재구성.독립workload측정/사례원자료없어9유지. |
| B10 | 설치→CLI/GUI→비교→attach→누수예→제약→diff완결.모든Linux/진짜누수단정과도구flag판조건부족으로10유지.B≤13. |
| C7 | 155~164행10분수집/GUI와223~237행diff명령,80~96행Callsite출력은구체적.13·128행속도수치환경없어C≤8,7유지. |
| D11 | 139~147행attach↔chapter05-prod-leak-diagnosis.md133~142행,128행2~3x↔그글158~161행운영영향과반복.출력분류/GUI개별기능전담이남아11유지. |
| E7 | 2·5행heap분석/가벼운profiler약속을39~120·155~180행명령→callsite해석으로이행해6→7.무출처속도는C와불확실로분리. |
| F5 | 253행next공개order3jemalloc/tcmalloc맞음.256~257·259행memory1/3/LSan3도맞으나258행Massif가실제공개Suppressionsorder5로가므로5유지. |
| G2 | 260~261행공식KDErepo·저자intro와34행1.5.0판있지만실행조건과측정원자료없어2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~261행. SHA-256: `321bf3fef078a0b37b0fb5473a15a5b0ba63b7b7dc581af72250b3454632d5f2`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter03-jemalloc-tcmalloc.md

source_file: `src/content/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc.md`
url: `/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc`

score_status: 잠정 · score: 52 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: glibctcache비교·prof.dump자동생성·signalhandler·gperftools패키지/CPUprofiler·Go/tcmalloc추천및overhead공식미대조.99~102행누적89.1%는표시반올림가능해오류로확정안함.

| 항목 | 근거 |
| --- | --- |
| A10 | 73~149행prof환경→jeprof→mallctl과153~224행두allocator선택은있으나통상입문/비교표중심10유지. |
| B11 | 교체/build→profiling→차이→runtime→tcmalloc→Rust/Go→운영흐름완료.각API기본값/프로파일생성조건열려11유지.B≤13. |
| C7 | 122~128행base비교와138~149행dump/통계코드있으나완성실행예/실패관찰없음.13·33행효율수치근거없어C≤8,7유지. |
| D10 | 73~80·138~151행profiling/dump↔chapter05-prod-leak-diagnosis.md82·88~100행,122~128행base↔그글110~111행,246~254행Go↔335~340행동일.allocator선택/구성입문역할로10유지. |
| E7 | 2·5행진단기능과pprof시각화약속을94~149·183~224행명령/표로이행.7유지. |
| F5 | 289행next공개order4glibc도구범위맞음.293~294행heaptrack2/glibc4공개지만295~296행SanitizerCh1/ValgrindCh1은둘다실제order2target이라5유지. |
| G2 | 298~301행jemalloc/gperftools/pprof공식자료와Rustcrate0.5있으나C/C++allocator판/옵션출처조항없어2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~301행. SHA-256: `1e4b6357a8b436df10e047f16b09d2408b91f0b8e572876ea35d1d152faffda2`. 기준 HEAD 원문과 바이트 일치를 확인했다.

### chapter04-glibc-tools.md

source_file: `src/content/blog/tools/debugging/memory/chapter04-glibc-tools.md`
url: `/blog/tools/debugging/memory/chapter04-glibc-tools`

score_status: 잠정 · score: 50 · confidence: 중간 · factcheck: 미검증
anchor_ref: `10550ca1:part1-04-uart-hardware.md`, `10550ca1:part7-05-kernel-build.md`
blockers: P0 미발견. 주장별 원출처 대조와 재현 조건 보강 필요.
uncertainties: MALLOC_CHECK_/mcheck/mtrace활성조건·PERTURB패턴·malloc_hook현황·mallinfo필드/threshold공식판미대조.199행큰chunk대217행mmap반환은allocationclass가달라내부모순으로추가안함.

| 항목 | 근거 |
| --- | --- |
| A10 | 19~173행디버그기능과197~247행return/arena/tcache를묶지만일반기능카탈로그.10유지. |
| B11 | 검사→pattern→trace→통계→반환/튜닝→override→운영완료.현glibc버전/활성조건과그실패확인이부족해11유지.B≤13. |
| C6 | 23~27·47~66·78~109·161~171행명령/로그/관측field는있으나실제glibc판없고33·124행overhead출처없어C≤8.6유지. |
| D10 | 161~171·295~311행mallinfo2↔chapter05-prod-leak-diagnosis.md284~296행Prometheus동일field.197~213행trim↔그글238행캐시해제후trim.249~265행override↔heaptrack182~194행preload기본원리.전용glibc검사목적남아10유지. |
| E7 | 2·5행세glibc도구약속이19~138행코드/로그로직접이행.최신판정확성은미검증이지만범위맞아7유지. |
| F4 | 324행Ch5마지막은실제동일Memoryseries공개6/7추가편누락.328~329행memory3/5공개대응.330~331행Sanitizer/ValgrindCh1은실제order2이므로4유지. |
| G2 | 334~336행man/glibctunables공식주소있으나적용glibc판/주장연결부족해2유지. |

병합 대상 없음. 독립적인 검색 질문이 남아 다음 조치는 차별화 보강이다.

전문 읽기: 1~336행. SHA-256: `5785439582486e33aa0d71fd7aa06c0de1e77cad65933142bed37fd9bbed883b`. 기준 HEAD 원문과 바이트 일치를 확인했다.

## 적용 상한과 검증 한계

정확성 불확실이 열리면 B≤13(AP-C-24), 무출처 수치 C≤8, 절차만 있는 경우 C≤9를 우선 적용했다. F는 실제 slug/order/draft/title과 안내 뒤 설명을 대조하고 틀린 대상/설명이 있으면5 이하, 템플릿 외 글 고유 안내가 있을 때7 이상으로 판단했다. 축약 제목과 실질적인 오안내를 구분했다. 다른 시나리오·산문 개수·완곡한 본문/단정 요약·언어/API 기억만으로 오류를 확정하지 않았다. 실행하지 않은 코드와 관찰되지 않은 로그는 검증 완료로 기록하지 않는다.

## KGDB 1차자료 대조

[Linux v6.12 kgdb 문서](https://raw.githubusercontent.com/torvalds/linux/v6.12/Documentation/dev-tools/kgdb.rst)의 Kernel parameter: kgdboc 절 123~130행은 기본 console과 같은 serial을 쓰는 설계임을 설명한다. 따라서 원문298행의 동일포트 자체가 충돌이라는 일반화는 근거가 없고, kgdbcon을 함께 쓰는 제한과도 구분해야 한다. 같은 문서273~284행은 kgdbwait가 I/O설정 뒤에 와야 한다고 하므로 원문50행의 순서와 다르다. 이 두 주장만 대조했으며 코드 전체의 정확성을 보증하지 않는다. latest dev-tools URL은404였고 고정 v6.12 원문과 현행 process/debugging 문서를 열어 확인했다.
