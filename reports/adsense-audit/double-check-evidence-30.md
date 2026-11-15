# 공개 글 루프 30 — 초벌 근거 대조

기준은 AdSense rubric v1.2, anchors, antipatterns다. 원문 10편을 읽고 A~G 근거와 비교문·내비게이션을 대조했다. 이 파일은 최종 채점이 아니며 기존 점수/판정을 새 결과로 복사하지 않는다. 원문 및 기존 평가 파일은 수정하지 않았다.

## 글별 대조

### Industrial Ethernet Ch 6 — PROFINET

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter06-profinet.md`; 읽은 구간: 1~245행 전문.
- A~G: A~E·G의 기존 근거는 대체로 동의한다. CC/RT/IRT 설명(35~79행)과 application/GSDML(81~171행)을 분리해 보았고, 출처가 없는 cycle/jitter/기업 사례(39~43, 61, 79, 184, 190행)는 외부 검증 이슈다. 내부 산술 167행의 32×31.25 μs=1 ms는 맞다. 현재 원문 235행은 “1차 분량이 끝난다”면서 같은 시리즈 공개 Ch 7~12를 후속 시리즈에서 다룬다고 해 실제 roadmap과 불일치한다. F 243행 Recipes IRQ 라벨은 target order 87과 번호가 다르다.
- D: 85~89, 101~171행은 같은 시리즈 Ch 7 21~29, 194~222행과 역할/GSDML이 겹친다. Ch 12 23~32행 및 이 글 175~186행의 선택 결론, Ch 1 155행·Ch 12 305행의 gateway 공존 문장도 비교 근거다. 고유한 CC/RT/IRT 메커니즘 35~79행은 별도 가치다.
- F·불확실: next 링크 없음에도 seriesOrder 7 `chapter07-profinet-io.md` 공개 글이 존재한다. Ch 12가 TSN·POWERLINK 후속편이라고 한 안내는 현 시리즈에 실제 Ch 8/9/10이 있어 stale다. 218행 DCP IPv4 multicast는 Ch 7 39행 L2 EtherType 설명과 충돌하지만 cross-article 차이이므로 오류 확정 대신 IEC/PI 문서 질문으로 둔다. Siemens IRT switch·CC 정의·GSDML version·지역 채택은 1차 자료 필요.
- Sol 질문: PI/IEC conformance class와 GSDML schema, Siemens switch manual로 41~45, 65, 97~171행을 확인할 것. DCP multicast/addressing은 Ch 7과 함께 표준으로 정본을 확인할 것.

### Industrial Ethernet Ch 7 — PROFINET IO

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io.md`; 읽은 구간: 1~264행 전문.
- A~G: A~G의 기존 큰 방향은 동의한다. DCP→AR/CR→IOCR→RecordData/Alarm→MRP 흐름은 35~192행에서 일관되게 전개된다. 원문만으로 확인 가능한 모순은 네 묶음이다: 108행의 두 cycle miss vs 178행 세 missed; 94행 ET 200SP 250 μs 가능 vs 236행 CC-C가 되어야 250 μs 메뉴; 213행 동일 GSDML MinDeviceInterval=32가 1 ms minimum이라 한 것과 94행 250 μs; 134행 vendor range `0xC000~F7FF`가 135~136행 “표준” index `0xE000~E0FF`/`0xE040`를 포함. 42행 “최대 240 CN”도 126행에서 MN NodeID=240으로 두어 실제 CN은 최대 239라는 내부 겹침이다.
- D: 이 글의 21~31행 역할표는 Ch 6 81~91행, 194~222행 GSDML 예는 Ch 6 97~171행과 겹친다. 반면 DCP·AR/CR·IOCR·RecordData·Alarm·MRP 35~178행은 독립 주제다.
- F·불확실: 257행 next Ch 8은 공개 order 8, title/slug 맞음. 261~263행 target/title은 유효하나 Ch 5 링크는 내용상 관련도가 약하다. DCP의 영구 flash 저장(45행), shared device 조건, APDU loss threshold, MRP 200 ms/recovery와 “3 cycle” 규칙(178행), index ranges는 PI/IEC 출처로 확인할 것. 오류 확정에 기술 외부 지식은 쓰지 않았다.
- Sol 질문: IEC 61158-6-10, PROFINET GSDML schema 및 ET 200SP 해당 device profile로 cycle·index 범위(94, 127~136, 205~220행), DCP/IP 동작(39, 218행), alarm/MRP timeout(149, 162~178행)을 대조할 것.

### Industrial Ethernet Ch 8 — TSN overview

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter08-tsn.md`; 읽은 구간: 1~265행 전문.
- A~G: 기존 A~G 근거에 대체로 동의한다. 기능별 toolkit 설명 33~196행은 범위를 잘 나누고, 86~103행 GCL bitmask와 gate 그림이 맞으며 1538 B/1 Gbps≈12.3 μs(107행) 및 64 B fragment≈0.5 μs라서 125행의 “1 μs 이하” 상한과 충돌하지 않는다. 구체 표준/NIC 가격(200~214행), gPTP/FRER 표준 동작은 외부 근거 필요.
- D: 같은 시리즈 Ch 9 163~186행 YANG 예는 이 글 163~185행과 stream-id/MAC/PCP/VLAN/interval/max-frame-size 값까지 같다. Ch 9 101~125행과 이 글 52~67행 gPTP, Ch 9 204~214행과 이 글 231~245행 hardware/FRER 함정은 겹침. Ch 12 183행 이후 OPC UA over TSN과 이 글 216~227행도 결론이 가깝다. Ch 9는 실제 scheduling 상세로 역할도 분명하다.
- F·불확실: 258행 next Ch 9는 공개 order 9이며 대상/부제가 본문에서 예고한 scheduling·gPTP와 맞는다. 262~264행 관련 links target은 기존 메타데이터 대조상 맞다. “다음 장” 안내는 링크 없는 텍스트라 링크 평가와 별도로 둔다. 802.1AS-2020의 hot standby, Qbu fragment/minimum, Qci stream identification, FRER zero recovery, 제품 지원·가격은 IEEE/vendor 자료 확인 필요.
- Sol 질문: IEEE 802.1AS/Qbv/Qbu/Qci/CB/Qcc 및 802.3br 원문, 해당 NIC/switch 데이터시트로 37~48, 67~69, 121~127, 135~157, 200~214행을 확인할 것.

### Industrial Ethernet Ch 9 — TSN scheduling

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling.md`; 읽은 구간: 1~380행 전문.
- A~G: A~E·G의 평가 근거는 대체로 동의한다. 내부 오류 두 건을 재확인했다. 58행 guard band가 다음 cycle CDT 보호용이라지만 GCL 52~60행은 BE Q0~3을 750,000 ns부터 다음 cycle 1,000,000 ns까지 열고, guard band 8,800~10,000 ns 앞쪽에는 BE가 열려 있지 않다. 30행은 PCP4에 gPTP/MRP/LLDP를 두는데 52~60행 GCL은 Q4를 한 번도 열지 않으므로 103행에서 전제한 network control traffic은 이 구성에서 송신할 수 없다. 조건이 같은 예시 안의 충돌이라 factcheck 오류 확정 가능.
- D: Ch 8 163~186행 YANG sample ↔ 이 글 175~198행 동일 값; Ch 8 52~67행 gPTP ↔ 이 글 105~109행; Ch 8 107, 241행 guard band/Qbu ↔ 이 글 58, 63, 329행; Ch 8 212, 233행 I225/Linux ↔ 이 글 69, 351행. Ch 2 ptp4l 135~145행 ↔ 이 글 129행은 명령 주제는 겹치지만 이 글은 gPTP setup을 추가한다.
- F·불확실: 372행 next target Ch 10 order 10은 맞지만 소개 부제 “오픈소스 산업 이더넷의 정수”는 실제 제목 “POWERLINK과 OpenSAFETY 분석 — 산업 안전 통신 프로토콜”과 다르다. 376~378행 links는 label/대상 일치. 1 ms cycle/100 μs streams 가정, Qbv queue mapping, Linux taprio flags, sync interval과 delay 측정(18~24, 30~33, 52~63, 105~153행)은 표준·kernel/driver 문서 필요. 예시 GCL과 설명이 충돌하는 점만 내부 오류로 확정한다.
- Sol 질문: IEEE 802.1Qbv, Qbu, 802.1AS, Linux `tc-taprio` 문서로 GCL 행(52~63), PCP mapping(30, 103), taprio example(69~97), gPTP interval(105~153)을 확인할 것.

### Industrial Ethernet Ch 10 — POWERLINK/OpenSAFETY

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink.md`; 읽은 구간: 1~353행 전문.
- A~G: 기존 A~G 논거에 대체로 동의한다. 내부 오류는 42행이 MN NodeID를 `0xF0`(240)로 두고, 126행이 CN에 1~240을 배정한다고 해 CN/MN 범위가 겹치는 점이다. 42행 “240 nodes” 역시 MN을 포함한 total인지 CN 수인지 모호하며 126·198행과 같이 보면 CN 최대 239대다. 이를 외부 spec 없이 내부 consistency로 기록한다.
- D: Ch 2 177~183행 POWERLINK SoC/PReq/PRes/Async 개요 ↔ 이 글 48~82행 상세 사이클; Ch 1 85행 isochronous/async 요약 ↔ 같은 절. Ch 12 33·90행 OpenSAFETY SIL3 표 ↔ 이 글 291~303, 340행. 요약 대 상세 역할 구분을 감안한다.
- F·불확실: 345행 next Ch 11은 공개 order 11·slug 맞고 후행 설명은 PREEMPT_RT/EtherCAT master로 맞음. 349~351행 links 대상은 주제와 맞음. NodeID 외부 표준, POWERLINK cycle 200 μs vs Ch 1 100 μs, NMT/SoC timing, OpenSAFETY profiles/SIL mapping, API는 EPSG/PLCopen 1차 자료 확인 전 uncertain. 이전 글의 100 μs와 조건 차이가 있을 수 있어 cross-article 차이를 오류로 확정하지 않는다.
- Sol 질문: EPSG DS 301/POWERLINK spec으로 NodeID/MN reservation(42, 126, 198), cycle times(30~82), NMT fields/API; OpenSAFETY specification/certification source로 291~303, 340행을 확인할 것.

### Industrial Ethernet Ch 11 — Linux real-time

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime.md`; 읽은 구간: 1~426행 전문.
- A~G: A~G 근거에 대체로 동의한다. 내부 수치 모순은 153~154행: 주석은 200,000 cycles를 250 μs 간격이라고 하지만 `cyclictest -i 250 -n -D 1h`의 1시간은 250 μs 주기라면 14,400,000 cycles이고 160행 출력도 14,400,000으로 적혀 있다. 실제 실행 결과인지 예시인지도 밝혀야 한다. 176행·412행 cycle 관련 표현 차이와 함께 해당 benchmark 의미를 재검토한다.
- D: Ch 5 225~245행 IgH API loop ↔ 이 글 317~351행; `rtos/practical-internals/part5-07-preempt-rt-linux.md` 24~31, 122~171, 232~248행 ↔ 이 글 47~64, 96~146행. Current Recipes IRQ article `part7-13-irq-affinity.md` 95~109행은 manual affinity와 GIC SPI 동작, 111~120행은 거부 조건을 설명한다. 기존 비교 95~104행은 현재 재작성되어 줄 번호/상세가 바뀌었다. 겹침은 189~207행 affinity가 핵심이며, 현행 Recipes 글에는 산업 EtherCAT master 절이 없다.
- F·불확실: 417행 next Ch 12 order 12 맞음. 424행 Recipes “Part 4-06: IRQ affinity”는 slug `part7-13-irq-affinity`, order 87, 실제 제목 IRQ Affinity 설정…으로 라벨 오류. 421~423행 labels은 대체로 맞다. cyclictest 예도 내부 모순 두 건이다: 153~154행 “200,000 cycles”인데 command는 `-i 250 -D 1h`, 160행 출력은 14,400,000 cycles; 또한 412행 정리는 “1시간 이상 hackbench 부하 중”이라고 하지만 176행 부하 측정 명령은 `-D 30m`이다. 153행 의도된 반복 횟수와 176행 주장은 원문끼리 확정 모순이다. PREEMPT_RT scheduler/jitter, EtherCAT NIC offload, CPU affinity는 kernel/IgH 공식 docs 확인 대상.
- Sol 질문: cyclictest 공식 README/manpage로 `-i`, `-D`, `-n`과 출력 `C` 필드를 확인해 153~160행 예를 검증할 것. Linux kernel docs와 IgH docs로 47~64, 96~146, 189~247, 317~351행을 확인.

### Industrial Ethernet Ch 12 — comparison

- `source_file`: `src/content/blog/embedded/protocols/industrial-ethernet/chapter12-comparison.md`; 읽은 구간: 1~336행 전문.
- A~G: A~G 대체로 동의. 이 글 안에서는 확인된 직접 산술 모순이 없다. 94·306행 “모두 SIL 3”가 어떤 범위를 가리키는지 92행 TSN 행과 문맥이 불명확해 uncertainties로 남기고, 조건·표준 차이를 오류로 올리지 않는다.
- D: Ch 1 103~109행 표 ↔ 이 글 23~36행 비교표; Ch 8 216~227행 OPC UA over TSN ↔ 이 글 183~199행; Ch 10 295~301행 OpenSAFETY ↔ 이 글 85~94행. Ch 11과는 실시간 운영 역할이 달라 직접 중복이 작다. 기존 보고서가 추가한 비교자 Ch 8의 OPC UA 부분을 포함하는 데 동의한다.
- F·불확실: order 12 마지막 글이며 next chapter 없음이 맞다. 323~329행 내부 links는 title 대응이 맞다. 330행 Recipes IRQ label은 target order 87로 번호가 틀림; 332행 DO-178C 관련 대상은 draft, 316행 “Practical RTOS Internals Part 5 Linux RT”라는 시리즈 통칭은 실제 part5-07 한 편만 PREEMPT_RT를 다룸, 317행 Buildroot 시리즈명도 target title과 다름. 319행 12편 DO-178C 추천은 모두 draft. 제품 가격/시장점유·cycle/safety category는 1차 자료 질문.
- Sol 질문: ETG·PI·ODVA·EPSG의 공인 cycle/standard table, IEC/ISO safety source로 23~94행을 확인하고 “SIL 3”의 명시 대상 범위를 확인할 것.

### Kernel Debugging Ch 1 — user/kernel boundary

- `source_file`: `src/content/blog/tools/debugging/kernel/chapter01-user-kernel-boundary.md`; 읽은 구간: 1~272행 전문.
- A~G: A~G 기존 근거에 대체로 동의한다. 150~183행 taint, 185~214행 sysrq/addr2line, 234~249행 debuginfod는 비교 대상이 분명하다. 내부 확정 오류는 기존 보고서에서 찾지 못했으나 82행 kallsyms 주소 `do_fork ... c130`과 204~210행 addr2line 주소 `...c1a0`→`handle_pte_fault`는 동일 시스템 예시라고 명시하지 않아 factcheck 확정 대신 위치 불일치 의심으로 기록한다.
- D: same-series Ch 7 108~119행 Tainted 표 ↔ 이 글 150~183행, Ch 7 131~139/199~210행 addr2line ↔ 이 글 199~214행, Ch 6 56행 sysrq `c` ↔ 이 글 194행, Ch 5 122~125행 sysrq `g` ↔ 185~197행. `dwarf-elf/chapter06-split-dwarf-tools.md` 165~181행 DEBUGINFOD_URLS ↔ 239~249행. Ch 2 263행 printk 예고 ↔ 234행 한 줄은 명확히 분리.
- F·불확실: next Ch 2 order 2·slug/title 맞음. 268행 DWARF/ELF target 맞음. 269행 strace-tracing 관련 항목은 무링크이며 해당 시리즈 draft, 241행 debuginfod “시리즈” target은 별도 시리즈가 아니라 DWARF chapter 6. 76행 `(Ch에서 다룸)`은 chapter 번호가 빠짐. 주소 차이는 KASLR/build artifact/예시가 다른 가능성이 있어 source/ELF context 확인 없이는 오류 확정 불가. Taint bit 해석은 kernel docs 필요.
- Sol 질문: Linux kernel `admin-guide/tainted-kernels`와 `scripts/decode_stacktrace.sh`, `addr2line`/build-id 문서로 150~214행을 확인하고 82·204행의 주소가 같은 build를 뜻하는지 확인할 것.

### Kernel Debugging Ch 2 — printk/dmesg

- `source_file`: `src/content/blog/tools/debugging/kernel/chapter02-printk-dmesg.md`; 읽은 구간: 1~351행 전문.
- A~G: A~G 근거에 대체로 동의한다. factcheck 내부 충돌은 명확하다: 58행은 console이 `console_loglevel 이하`, 96행은 `이 미만`으로 정의한다. 85행 현재 level=4에서 96행을 따르면 warning(level 4)은 출력되지 않아 39행 표와 충돌한다. 89행 `echo 8`과 91~92행 `dmesg -n 7`이 96행 규칙 아래 같은 효과도 아니며, 286행 비교 조건도 58행에 맞고 96행과는 다르다.
- D: Ch 1 234행 `dmesg -n 7`/printk 출력 요약 ↔ 이 글 89~92행; Ch 7 panic/oops 85행 WARN_ON ↔ 이 글 134~147, 292행. 현재 `modern-recipes/part7-06-kernel-module.md` 128~145행에는 pr_* levels, dmesg, `echo 8` 설명이 있어 이 글 33~42, 62~66, 89, 151행과 겹친다. Part7-06는 Recipes 변경분에서 현재 위치를 직접 확인했다.
- F·불확실: 343행 next Ch 3 order 3/title/slug 맞음. 347~348행 internal links target 맞음. 349행 strace-tracing Ch 9는 무링크이며 target draft, 241행 debuginfod는 별도 시리즈가 아니고, 76행 `(Ch에서 다룸)`은 번호 누락. 321~326행 +pfl/`dev_info` 출력 prefix 문제는 printk macro semantics 지식이 필요해 uncertainty다.
- Sol 질문: Linux kernel `printk-basics`, `printk-formats`, `sysctl/kernel` docs 또는 upstream `kernel/printk/printk.c`로 console loglevel threshold와 `dmesg -n`을 확인하고, printk macro prefix rules로 321~326행 출력 예를 확인할 것.

### Kernel Debugging Ch 3 — ftrace/tracepoints

- `source_file`: `src/content/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints.md`; 읽은 구간: 1~426행 전문.
- A~G: A~G 기존 근거에 대체로 동의한다. ftrace 도구 흐름/명령(19~179, 243~332행), TRACE_EVENT 조각(208~241행), 비교/후속(364~389행)이 담겼지만 재현 kernel version·결과는 약하다. 212~232행 TRACE_EVENT 샘플이 그대로 build되는지 여부는 macro/API 의미를 알아야 해 오류 확정하지 않는다. 22~30행 tracefs listing에 `trace` 두 개와 `sysprof`가 있는 모양, 298행 `trace_max_latency`와 listing의 `tracing_max_latency`는 sample/ellipsis 문맥이라 내부 오류로 확정하지 않는다.
- D: `performance-engineering/part5-03-ftrace.md` 24~49행 tracefs, 51~76 function tracer, 77~102 set_graph_function, 103~135 irqsoff, 136~161 event enable, 162~179 trace-cmd, 185행 kprobe 명령이 이 글 각각 19~38, 60~86, 264~283, 292~308, 167~179, 310~332, 253행과 겹친다. Ch 2 234~244행 trace_printk와 Ch 4 19~403행 eBPF/bpftrace는 일부 인접하지만 역할 구별이 있다.
- F·불확실: 416행 next Ch 4 order 4 target 맞음. 420~422행 links와 overhead 설명 target 맞음. 423행 strace-tracing Ch 9는 링크 없이 제시되고 draft target이며 262행에도 링크 없는 언급. 251행 Ch 3 안내는 같은 글의 선행/후속 참조가 혼동될 수 있다. tracefs 파일명·tracepoint registration·ftrace API claims는 공식 kernel docs/source 확인 대상.
- Sol 질문: kernel `Documentation/trace/ftrace.rst`, `tracepoint.rst`, `trace/events.rst`와 해당 커널 버전의 macros로 19~38, 167~241, 243~332행을 확인할 것.

## Recipes 비교 문서 상태와 후속 질문

현재 59개 Recipes 문서가 기준 커밋 이후 바뀐 조건을 반영했다. 이 루프에서 D에 직접 영향이 있는 비교 대상은 `part7-13-irq-affinity.md`와 `part7-06-kernel-module.md`다. 전자는 현재 95~109행에서 affinity 설정 결과를 설명하고, 후자는 현재 128~145행에 printk/dmesg 예가 있다. 이전 보고서 줄 번호는 그대로 인용하지 말고 위 현재 spans를 기준으로 한다.

기존 factcheck 오류 선언은 Ch 7, Ch 9, Ch 10, Ch 11, kernel Ch 2의 원문 내 충돌로만 유지 가능하다. Ch 6/8/12 및 kernel Ch 1/3은 미검증 또는 불확실로 두고, 시리즈 글끼리의 차이나 example condition 차이로 오류 확정을 추가하지 않는다. 다음 단계는 각 Sol 질문의 1차 자료 확인과 F 대상 공개/order/title 최종 대조다.

## F 다음 글 메타데이터

| 글 | next 문구·target | 공개 상태/order/title 대조 | 후행 설명 |
|---|---|---|---|
| IE Ch 6 | 235행은 다음 글 링크 없이 시리즈가 끝났다고 서술 | 현재 공개 Ch 7 `chapter07-profinet-io`, order 7 존재 | 내용상 아직 공개된 Ch 7~12를 후속 시리즈로 돌려 말해 틀림 |
| IE Ch 7 | 257행 Ch 8 TSN | 공개·8, target title “TSN 표준 분석 — IEEE 802.1 Time-Sensitive Networking 개요” | target 본문이 TSN toolkit을 다뤄 맞음 |
| IE Ch 8 | 258행 Ch 9 scheduling | 공개·9, target title “TSN 스케줄링 메커니즘 — Qbv·Qbu·gPTP 동기화 분석” | 실제 scheduling 설정이 후속 설명과 맞음 |
| IE Ch 9 | 372행 Ch 10 | 공개·10, target title “POWERLINK과 OpenSAFETY 분석 — 산업 안전 통신 프로토콜” | target은 POWERLINK/OpenSAFETY이며 번호는 맞고 부제만 stale |
| IE Ch 10 | 345행 Ch 11 Linux realtime/EtherCAT | 공개·11, target title “리눅스 실시간 산업 통신 — PREEMPT_RT·EtherCAT Master 운영” | 내용 범위 일치 |
| IE Ch 11 | 417행 Ch 12 protocol comparison | 공개·12, target title “산업용 이더넷 프로토콜 비교 분석 — 시나리오별 선택 가이드” | 선택 가이드 예고와 맞음 |
| IE Ch 12 | final chapter | 공개·12 마지막 글, title “산업용 이더넷 프로토콜 비교 — EtherCAT·PROFINET·POWERLINK·TSN 선택”, 후속 글 없음 | 314~319행은 다음 시리즈를 소개하고 draft target들도 있어 별도 표시 필요 |
| Kernel Ch 1 | 263행 Ch 2 | `tools/debugging/kernel/chapter02-printk-dmesg` / 공개·2 / “printk·dmesg·dynamic_debug 분석 — 커널 로그 추적” | printk/dmesg 소개와 일치 |
| Kernel Ch 2 | 343행 Ch 3 | `tools/debugging/kernel/chapter03-ftrace-tracepoints` / 공개·3 / “ftrace와 tracepoints 활용 — 커널 함수 호출 트레이싱” | ftrace/tracepoints와 일치 |
| Kernel Ch 3 | 416행 Ch 4 eBPF | `tools/debugging/kernel/chapter04-ebpf-kernel` / 공개·4 / “eBPF·bpftrace로 커널 디버깅 — 동적 관측의 신세대” | eBPF/bpftrace 후속 범위와 일치 |

관련 항목의 결함: IE Ch 6 IRQ affinity 라벨은 현 order 87, IE Ch 11 “Part 4-06” 역시 order 87의 같은 IRQ 글로 잘못 표기. IE Ch 12는 IRQ affinity 링크가 없으며 order 87 target 라벨은 이전 번호 체계. Kernel Ch 1의 strace 관련 항목은 링크 대상이 draft, debuginfod는 별도 시리즈명이 아니라 DWARF/ELF Ch 6. Kernel Ch 2의 strace-tracing Ch 9·Kernel Ch 3의 strace-tracing Ch 9는 모두 링크 없는 설명이고 target draft. 이 점은 내부 링크 없는 관련 항목 규칙에 따라 평가한다.
