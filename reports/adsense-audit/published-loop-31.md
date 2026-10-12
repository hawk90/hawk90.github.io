# 공개 글 AdSense 평가 — 루프 31

> 대상: 공개 글 10편 (Kernel Debugging `seriesOrder` 4~9, Memory Diagnostics `seriesOrder` 1~4)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 서른한 번째 루프다. 대상은 `src/content/blog/tools/debugging/kernel/`의 chapter04~chapter09(eBPF, kdb·kgdb, crash·drgn, panic·oops, CXL 드라이버 디버깅 두 편) 6편과 `src/content/blog/tools/debugging/memory/`의 chapter01~chapter04(메모리 회계, heaptrack, jemalloc·tcmalloc, glibc 도구) 4편이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. `score_status`는 모두 잠정이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `kernel/chapter04-ebpf-kernel.md` | 9 | 10 | 7 | 7 | 5 | 5 | 2 | **45** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `kernel/chapter05-kdb-kgdb.md` | 10 | 11 | 7 | 12 | 6 | 5 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part6-09-isr-api.md`, `part7-05-kernel-build.md` |
| `kernel/chapter06-crash-drgn.md` | 10 | 11 | 7 | 11 | 7 | 5 | 2 | **53** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `kernel/chapter07-panic-oops.md` | 12 | 12 | 6 | 11 | 6 | 4 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `kernel/chapter08-cxl-driver-debug.md` | 14 | 11 | 7 | 9 | 6 | 5 | 2 | **54** | 검증됨 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part6-09-isr-api.md` |
| `kernel/chapter09-drivers-cxl-walkthrough.md` | 13 | 12 | 7 | 1 | 7 | 4 | 3 | **47** | 검증됨 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part12-10-on-device-llm.md` |
| `memory/chapter01-memory-accounting.md` | 11 | 11 | 7 | 10 | 7 | 5 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `memory/chapter02-heaptrack.md` | 9 | 10 | 7 | 11 | 6 | 5 | 2 | **50** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `memory/chapter03-jemalloc-tcmalloc.md` | 10 | 11 | 7 | 10 | 7 | 5 | 2 | **52** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `memory/chapter04-glibc-tools.md` | 10 | 11 | 6 | 10 | 7 | 4 | 2 | **50** | 미검증 | 병합 검토 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 51.0점(10편, 합 510점), 범위 45~54점이다. 판정은 우선 조치 3편, 병합 검토 7편이고 유지·검증 대기·보강·제외 검토는 없다. 10편 모두 점수 구간은 병합 검토(40~59)이며, 오류 확인 3건(kernel ch05·ch07, memory ch01) 때문에 3편이 우선 조치로 올라갔다. 오류 확인 3건은 모두 원문 내부 모순·산술 불일치이고, 1차 자료를 열어 확인한 오류는 없다. '검증됨'은 2편(kernel ch08·ch09)으로, 커밋 18f8b421·8e18e425·d921312c가 torvalds/linux `drivers/cxl/` 소스와 대조한 기록을 남겼다. 다만 둘 다 80점 미만이라 판정은 병합 검토다. 나머지 8편은 2907896a 일괄 작성 뒤 1차 자료 대조 커밋이 없다. P0는 찾지 못했다. 확인 범위는 각 글 본문 전체, 다음 편 안내의 실제 seriesOrder+1 파일, 관련 항목 링크 대상 파일의 제목·seriesOrder·`draft`까지이고, 렌더링·광고 배치·sitemap은 보지 않았다. kernel ch09가 CXL 4.0 Internals Ch 11과 거의 같은 문장인 점은 글 단위 P0가 아니라 사이트 안 중복으로 D와 병합 판단에서 다뤘다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `kernel/chapter04-ebpf-kernel.md` | 45 | 45 | 0 | 없음 |
| `kernel/chapter05-kdb-kgdb.md` | 53 | 53 | 0 | 없음 |
| `kernel/chapter06-crash-drgn.md` | 53 | 53 | 0 | 없음 |
| `kernel/chapter07-panic-oops.md` | 53 | 53 | 0 | 없음 |
| `kernel/chapter08-cxl-driver-debug.md` | 54 | 54 | 0 | 없음 |
| `kernel/chapter09-drivers-cxl-walkthrough.md` | 49 | 47 | -2 | 없음 |
| `memory/chapter01-memory-accounting.md` | 53 | 53 | 0 | 없음 |
| `memory/chapter02-heaptrack.md` | 50 | 50 | 0 | 없음 |
| `memory/chapter03-jemalloc-tcmalloc.md` | 52 | 52 | 0 | 없음 |
| `memory/chapter04-glibc-tools.md` | 50 | 50 | 0 | 없음 |

- 기각하거나 추가한 오류 확인은 없다. 평가자가 올린 오류 확인 3건(kernel ch05 102·298행, kernel ch07 98~106·173행, memory ch01 269·270·281·283행)은 원문에서 다시 확인했고 모두 글 안의 모순으로 성립한다. factcheck 판정은 10편 모두 1차 평가와 같다.
- kernel ch09 B 13→12: 13행이 도입 없이 바로 디렉터리 표로 시작해 이 글이 푸는 질문이 없다. B 10~15 구간의 '문제 정의부터' 조건을 일부 못 채웠다.
- kernel ch09 C 8→7: 평가자 스스로 실행할 명령·관찰 결과가 하나도 없다고 적었다. 발췌 코드는 읽기용 upstream 코드라 8~11 구간 조건(재현 가능한 절차, 명령, 관찰 결과)이 아니라 4~7 구간이다.
- kernel ch04 B: 평가자가 쓴 'uncertainties가 있으면 B≤13 상한'은 rubric v1.2 B 절에 없는 규칙이라 근거에서 뺐다(점수 10 유지).
- kernel ch08 series_issues: CXL 공통 뼈대가 들어온 커밋을 0ec69ea9에서 23ed6256으로 고쳤다. 이 파일 git log에 0ec69ea9는 없다.
- memory ch03 C: jeprof 출력 누적 89.1%와 계산값 89.2%의 차이는 표시값 반올림으로 성립하므로 오류로 보지 않았다.
- 줄 번호 보정(점수 영향 없음): kernel ch04 A(249행), D(chapter08 50~57·122행, part5-04 58~78·101·110~118행), kernel ch06 D(bsp ch19 260~286행, ch07 267행), kernel ch08 D(ch09 36~44행, postmortem ch05 25~42행), kernel ch09 D(Ch11 89~134·136~151·153~192·194~204·206~228·230~240·246행), memory ch01(누수 분류 173~176행, oom_score 192행, ch05 23~30·50~57·59~64행), memory ch03 D(ch05 82·88~100·335~340행).
- factcheck_basis의 git log 목록 보완: memory ch01·ch02·ch04에 빠진 c99833a1(callout 형식)·09a00a29를 추가했다. 결론은 같다.
- 부풀림 판정은 10편 모두 없음이다. 최종 점수는 1차보다 같거나 낮다.

## 글별 근거

### `kernel/chapter04-ebpf-kernel.md` — 45점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(2907896a 신규 작성, c99833a1 callout 변환, 400892d7 linter 일괄, f38a41a0 TikZ 변환, ac24bb76 제목 변경, be973200 topic 메타, 0a9dd7bc slug 고정, 387d7b79 교차 링크 추가)에 verifier 제한, bpftrace builtin, BCC API 같은 구체 주장을 커널 문서·bpftrace 문서·BCC 소스와 대조한 커밋이 없다. 본문 안에서 서로 맞지 않는 두 구체 진술도 찾지 못했다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | probe 종류(61~92행), builtin 변수(96~108행), 출력 함수(112~121행), 한 줄 모음(168~214행), BCC 도구 목록(242~269행)은 bpftrace tutorial·BCC tools README 수준이다. 설명은 57행 '`-e` 뒤가 *프로그램*', 249행 '직접 짤 필요 없음' 같은 짧은 조각이다. 이 글만의 것은 vfs_read latency BCC 도구(276~317행)와 libbpf-tools CO-RE로 넘어가는 이유(323~332행) 정도다. 제목은 '커널 디버깅'인데 커널 버그를 추적하는 사례나 ftrace 대신 eBPF를 쓰는 기준이 없다. |
| B | 10 | 설치(27~41행) → 원-라이너(45~57행) → probe(61~92행) → map·hist(125~164행) → BCC(238~319행) → libbpf-tools(321~332행) → 사례(336~366행) → verifier(368~384행) → 부하(386~401행) → 문제 표(405~412행) → 정리(414~422행)로 끝까지 간다. 그러나 드라이버 오류 반환값을 kretprobe로 잡는 식의 디버깅 절차가 없고, 사례 1~3(336~364행)은 출력도 해석도 없는 관측 한 줄이다. 커널 버전·CONFIG가 없고 verifier 한계(373~376행)에 출처가 없다. |
| C | 7 | 실행 가능한 bpftrace 명령(47~51·127~131·145~153행)과 BCC 스크립트(276~317행)는 있다. 예시 출력(52~53·134~136·156~161·227~233행)에 커널 버전·배포판·하드웨어가 없고 버전은 40행 bpftrace v0.20.0 하나다. 388행 '수십 ns', 376행 '명령 수 ≤ 1M (kernel 5.2+)'는 출처·환경 없는 수치라 C ≤ 8이다. 사례 1~3(338~364행)에 예상 결과가 없다. |
| D | 7 | 같은 시리즈 `chapter03-ftrace-tracepoints.md`(tracefs), `chapter05-kdb-kgdb.md`(인터랙티브)와는 역할이 갈리고, `chapter08-cxl-driver-debug.md`는 bpftrace를 CXL mailbox 캡처(50~57행)에 적용하며 122행에서 이 글을 링크한다. 다른 시리즈 `embedded/performance-engineering/part5-04-ebpf.md`와 크게 겹친다. verifier 목록(이 글 372~377행 ↔ part5-04 28~31·195행), read latency hist(145~164행 ↔ 58~78행), kprobe·uprobe·USDT(65~78행 ↔ 80~101행, mysqld query__start 예 78행 ↔ 101행), BCC 도구(252~263행 ↔ 110~118행). `part5-11-cxl-profiling-tools.md`는 겹치지 않고, strace-tracing ch06~08은 draft다. |
| E | 5 | 제목 'eBPF·bpftrace로 커널 디버깅'(2행)은 디버깅을 약속하지만 본문은 도구 소개와 레퍼런스 목록이다. 디버깅 사례는 336~364행 일반 관측 한 줄 세 개뿐이고 366행 '대부분의 *프로덕션 진단*에 충분'으로 끝난다. rubric E(분석·진단을 약속했는데 도구 소개 수준이면 3~5)를 적용했다. description(5행)은 본문이 이행해 구간 상단이다. |
| F | 5 | 426행 다음 장 'Ch 5 — kdb / kgdb'는 seriesOrder 5 `chapter05-kdb-kgdb.md`와 맞고 430·431행 라벨도 대상 제목과 맞다. 432행 Performance Engineering 링크 설명은 part5-04 128행 overhead 표·141행 시나리오와 맞다(표는 probe 종류별이 아니라 도구별). 433행 'strace-tracing 시리즈'는 링크가 없고 대상 10편이 모두 draft라 독자가 찾을 수 없다. rubric F에 따라 F ≤ 5. 전제 지식 안내가 없다. |
| G | 2 | BCC 저장소(240행), Brendan Gregg eBPF 페이지(272행), bpftrace tutorial·BPF Performance Tools·BCC tools·libbpf-tools 링크(434~437행)가 있다. 272행만 'BCC 사례' 주장과 이어진다. verifier 한계(373~376행), '수십 ns'(388행), '검증 통과 = 커널 crash 불가'(23·379·421행)에는 1차 출처가 없고 커널 버전도 없다. |

uncertainties:
- 23·379·421행 '검증 통과 = 커널 crash 불가'는 verifier 버그 사례를 고려하지 않은 단정일 수 있다. 1차 자료로 확인하지 않았다.
- 373행 'BPF_LOOP'의 실제 helper 이름(bpf_loop)과 도입 커널 버전을 확인하지 않았다.
- 375~376행 스택 512 bytes, 명령 수 1M(kernel 5.2+)을 커널 문서로 확인하지 않았다.
- 382~383행 `while (1) { }`에 bpftrace v0.20.0이 실제로 'Unbounded loop detected'를 내는지 확인하지 않았다.
- 388행 'ftrace보다 살짝 무겁지만'은 part5-04 134~135행 표(ftrace tracepoint 1-5%, bpftrace tracepoint 0.5-2%)와 방향이 반대다. 글 사이 모순이라 오류 확인 근거가 아니다.
- 183~187행 '# disk I/O 크기' 라벨에 kprobe:vfs_read의 arg2(요청 바이트)를 쓴다. VFS read 요청은 페이지 캐시 히트를 포함해 디스크 I/O와 다르다. 1차 자료로 확인하지 않았다.
- 16·66·382행 kprobe:do_sys_open이 최근 커널에서 바뀌었거나 inline됐는지 확인하지 않았다.

병합 대상: 후보는 `src/content/blog/embedded/performance-engineering/part5-04-ebpf.md`(verifier 목록, read latency hist, probe 종류, BCC 도구 목록이 겹침)다. 다만 Kernel Debugging 4편이고 '커널 디버깅용 eBPF'라는 독립 검색 의도가 있으며 chapter08이 이 글을 전제로 링크하므로 다음 조치는 차별화 보강이다. 공통 레퍼런스는 줄여 part5-04로 연결하고, kretprobe 오류 반환값 추적·kstack 호출 경로 사례를 커널 버전·환경과 함께 넣고, verifier 한계와 '수십 ns'는 커널 문서·측정으로 대조하거나 지운다. 보강 뒤에도 차별점이 서지 않으면 제외 검토로 넘긴다.

### `kernel/chapter05-kdb-kgdb.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 모순(루브릭 3-1). 102행은 실 하드웨어 권장 설정으로 `GRUB_CMDLINE_LINUX="kgdboc=ttyS0,115200 console=ttyS0,115200"`를 제시해 kgdb와 콘솔을 같은 포트에 두고, 112~115행도 그 한 포트(/dev/ttyUSB0)로 gdb를 붙인다. 그런데 298행 함정 표는 '부팅 후 응답 없음 | kgdboc=ttyS1인데 console=ttyS1로 충돌'이라고 해서 같은 포트 공유를 장애 원인으로 적는다. 두 진술은 동시에 참일 수 없다. 어느 쪽이 맞는지는 `Documentation/dev-tools/kgdb.rst`로 정해야 한다(열지 않음). git log 7개 커밋(0a9dd7bc slug 고정, 28524a9d 코드 블록 언어 태그, be973200 topic, ac24bb76 제목·날짜 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 빌드 옵션(30~37행), 부팅 인자(57~62행), sysrq g 진입(124~128행), kdb 명령 표(156~174행)는 kgdb 문서 범위를 그대로 따른다. 이 글만의 것은 VMware named pipe를 socat으로 TCP에 잇는 우회(191~198행), NFS hang 콜스택 흐름(238~265행), 함정 표(293~300행)다. 267행 '서버 측 응답 누락 → 네트워크 문제 확인'은 근거 없이 결론으로 넘어가고, 222·234행 '매우 빠름'·'매우 새 기능'처럼 해석이 약하다. |
| B | 11 | 모드(19행) → 빌드(28행) → QEMU(41행) → gdb 연결(66행) → 실 하드웨어(95행) → 진입(118행) → kdb(143행) → VM(178행) → ramoops(202행) → kgdboe(220행) → 실전(236행) → 한계(269행) → 함정(291행)으로 끝까지 간다. 제목이 약속한 step은 85행 한 문장뿐이고 53행 rootfs.img를 만드는 방법이 없다. 102행과 298행의 모순이 남아 있어 B ≤ 13이다. |
| C | 7 | QEMU 명령(48~54행), gdb 세션(70~82행), stty·gdb(112~115행), .vmx(183~189행), ramoops 인자(208행)는 따라 할 수 있다. 커널·QEMU·gdb 버전과 배포판이 없다. 73~81행 주소와 소스 줄 번호(process.c:551, read_write.c:678)는 환경 없는 구체 수치라 C ≤ 8이다. 50행 kgdbwait로 부팅한 직후 73행 default_idle에서 멈춘 출력은 59행 설명과 맞는지 불분명하다. |
| D | 12 | 같은 시리즈 `chapter04-ebpf-kernel.md`(관찰 도구, 426행에서 이 글 예고), `chapter06-crash-drgn.md`(vmcore 사후 분석, 19·73·185행), `chapter01-user-kernel-boundary.md`(29·44행 kgdb 한 줄)와는 역할이 갈린다. 다른 시리즈와는 절 단위로 겹친다. `embedded/bsp/chapter11-bootlog-debugging.md` 297~304행 `kgdboc=ttymxc0,115200 kgdbwait` ↔ 이 글 50·59~60·132행, `embedded/bootloader/chapter22-debugging.md` 209~226행 pstore·ramoops ↔ 202~218행. `gdb-lldb/chapter08-remote-debugging.md`(RSP 27행)는 역할이 다르고 `qemu-fake-device/chapter09-debugging.md` 229~237행은 draft다. |
| E | 6 | 제목의 kdb(143~176행), kgdb(66~93행), breakpoint(80~82·134~141행)는 다룬다. 'Source-level Step'은 85행 한 문장뿐이다. 키워드 하나를 부분만 이행해 6~8 구간에서 감점했다. description의 'kgdb 셋업, gdb 연결, 실전 흐름'은 41~116·236~267행이 이행한다. |
| F | 5 | 315행 다음 장 'Ch 6 — crash + drgn'은 seriesOrder 6 `chapter06-crash-drgn.md`와 맞고 319~321행 관련 링크(chapter04, chapter06, gdb-lldb chapter08)도 대상과 맞다. 323행은 `Documentation/admin-guide/pstore-blk.rst`에 '— ramoops' 라벨을 붙였는데 pstore-blk는 블록 장치 백엔드이고 ramoops 문서는 따로 있다. 틀린 관련 링크 라벨이라 F ≤ 5다. 전제 지식 안내가 없다. |
| G | 2 | 출처는 관련 항목의 322행 kgdb.rst, 323행 pstore-blk.rst 두 개이고 둘 다 latest 링크라 커널 버전 기준이 없다. 30~37행 CONFIG, 156~174행 kdb 명령, 222~234행 kgdboe 같은 주장과 연결되지 않는다. 커널·QEMU·gdb 버전 표기가 본문에 없다. |

uncertainties:
- 102행과 298행 가운데 어느 쪽이 맞는지 kgdb.rst의 kgdboc·콘솔 공유 설명으로 확인하지 않았다.
- 13·309행은 'QEMU + virtio serial'이 표준이라고 하지만 48~52행 예제는 기본 `-serial`(ttyS*)을 쓴다. 엄밀한 내부 모순은 아니어서 오류로 보지 않았다.
- 50행 kgdbwait 부팅 직후 첫 연결이 73행처럼 default_idle에서 멈추는지 확인하지 않았다. 기억으로는 초기 breakpoint에서 멈춘다.
- 222~234행 kgdboe가 mainline에 있는지, `target remote udp:...:6443` 사용법이 맞는지 1차 자료로 확인하지 않았다.
- 288행 'ksm/vsock'의 ksm이 무엇을 뜻하는지 불분명하다.
- 23·145행 'kdb는 kgdb 없이'와 33행 CONFIG_KGDB_KDB가 CONFIG_KGDB에 의존하는 관계가 표현상 맞지 않는다.
- 299행 'Could not find vmlinux' 문구와 300행 CONFIG_DEBUG_INFO_REDUCED의 효과를 확인하지 않았다.
- 323행 라벨 판단은 외부 페이지를 열지 않고 문서 파일명으로만 했다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 점수 구간(병합 검토)으로 보면 병합 대상 없음. kgdb 셋업·QEMU·kdb 명령을 한곳에서 다루는 공개 글은 이 글뿐이고 bsp/chapter11 297~304행은 부트로그 맥락의 짧은 언급이다. 다음 조치는 보강이다. kgdb.rst로 102·298행 모순을 정리하고, step 세션과 커널·QEMU 버전·출력 환경을 넣고, 323행 링크를 ramoops 문서로 바꾼다. ramoops 절(202~218행)은 bootloader/chapter22 209~226행으로 링크해 줄이는 방안을 검토한다.

### `kernel/chapter06-crash-drgn.md` — 53점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), 28524a9d(코드 블록 언어 태그) 등 일괄·메타 커밋뿐이고 crash·drgn·kdump 주장을 drgn 문서, crash 매뉴얼, kdump.rst, 커널 소스와 대조한 커밋이 없다. 원문 안 모순은 찾지 못했다. 36행 crashkernel=512M과 50행 04000000-23ffffff(512 MiB)는 맞고, 152행 `mov 0x10(%rax)`·145행 RAX=0·159행 `*(p + 0x10)`·325행 address 0x10도 서로 맞는다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 104~128행 crash 명령 목록과 224~248행 drgn helper 목록은 매뉴얼에 한 줄 주석을 단 수준이다. 이 글만의 것은 panic 추적 흐름(130~159행: bt → dis → sym으로 NULL 레지스터 찾기), D state task를 뽑는 drgn 스크립트(276~305행), 사고 유형별 첫 명령(320~360행)이다. 사고 유형은 유형마다 한 줄(328·336·344·352·360행)이고 264~272행 표의 '표현력 무제한', '속도 비슷'은 근거 없는 평가다. |
| B | 11 | kdump 셋업(19~71행) → crash(73~183행) → drgn(185~305행) → 라이브(307~318행) → 사고 유형(320~360행) → 함정(389~399행) → 정리(401~409행)로 끝까지 간다. 78행 debuginfo vmlinux 경로를 '...'로 비웠고, 282행은 for_each_task만 import하는데 290~291행에서 for_each_online_cpu·per_cpu를 쓴다. 362~387행 두 절은 제목(kdump-anon, kpoke)과 본문(NFS/SSH 덤프, debugfs 목록)이 맞지 않는다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 7 | 설치·활성화(25~38행), kdumpctl 확인(45~51행), sysrq 강제 패닉(55~69행), crash·drgn 진입(78·198행)으로 절차는 있다. 예시 출력은 주소 'ffff...'(95·134~146행), 릴리스 '6.5.0-...'(88행)로 비워 실제 실행 기록인지 알 수 없고 버전·배포판이 없다. 57~62행은 실제 로그가 아니라 대괄호 설명이다. 271행 '속도 빠름/비슷'은 출처·환경 없는 비교라 C ≤ 8. 합격·실패를 가르는 검증 절차가 없다. |
| D | 11 | 비교한 글: 같은 시리즈 `chapter05-kdb-kgdb.md` 202~218행 ramoops는 pstore 경로라 이 글 kdump(19~71행)와 겹치지 않는다. `chapter07-panic-oops.md` 230~265행 lockup·hung task와 267행 KASAN 절이 이 글 330~352행 사고 유형과 같은 목록이다(ch07은 메시지 해석, 이 글은 vmcore 첫 명령). `postmortem/chapter05-cxl-device-postmortem.md` 23~64행은 drgn·crash의 CXL 응용이고 112행이 이 글을 링크한다. `kernel/chapter08-cxl-driver-debug.md` 74~94행은 라이브 drgn의 CXL 응용이다. `embedded/bsp/chapter19-stability-testing.md` 260~286행 kdump 셋업이 이 글 19~41·78행과 일부 겹친다. `systems/linux-kernel-internals/part5-04-crash-dump-analysis.md`는 draft 스텁이다. |
| E | 7 | 제목과 description(5행)의 kdump, crash 명령, drgn Python API, 실전 흐름을 19~305행이 차례로 다룬다. '실전 흐름'은 130~159행 한 사례뿐이고 362~387행 두 절은 제목 범위 밖이다. 대상 독자(배포판·커널 버전)가 드러나지 않는다. |
| F | 5 | 413행 'Ch 7 (마지막)'은 seriesOrder 7 `chapter07-panic-oops.md`와 맞지만 같은 디렉터리에 seriesOrder 8(`chapter08-cxl-driver-debug.md`)·9(`chapter09-drivers-cxl-walkthrough.md`)가 공개돼 있어 '마지막'이 틀렸다. 다음 편 안내 오류라 F ≤ 5. 417~419행 관련 항목(ch05, ch07, postmortem chapter01 'Core Dump 생성 메커니즘')은 라벨과 맞다. 전제 지식 안내가 없다. |
| G | 2 | 420~422행 drgn 문서, crash 사이트, kdump.rst 링크와 187행 drgn 저장소 링크가 있다. 297행 TASK_UNINTERRUPTIBLE 0x2, 302행 -s 옵션, 399행 makedumpfile -d 31 같은 주장과 연결된 출처가 아니고 crash·drgn·커널 버전 표기가 없다(88행 '6.5.0-...'). |

uncertainties:
- 362행 'kdump-anon — clouddump', 376행 'kpoke — debugfs 디버깅 헬퍼'가 실제로 있는 도구·기능인지 1차 자료로 확인하지 않았다. 본문(364~387행)은 kdump.conf nfs/ssh와 debugfs 일반 설명이라 제목과 맞지 않는다.
- 302행 `drgn -k -c vmcore -s crash-info.py`: postmortem/chapter05 28행은 `-s <vmlinux 경로>`로 -s를 심볼 파일 옵션으로 쓴다. 글 사이 불일치라 오류 확인 근거가 아니며 drgn 문서로 확인해야 한다.
- 282행 import와 290~291행 사용 helper가 다른데, drgn이 스크립트 실행 시 helper를 전역에 넣는지 확인하지 않았다.
- 297·314행 `task.__state`(5.14 이후 이름)와 166행 crash 출력 `state = 0`이 같은 6.5 커널(88행) 세션에서 함께 나올 수 있는지 확인하지 않았다.
- 215~221행 for_each_task 출력에 pid 0 swapper/0이 포함되는지 drgn 소스로 확인하지 않았다.
- 333행 'softlockup: hung tasks', 341행 'hung_task: blocked tasks' panic 문자열을 커널 소스로 확인하지 않았다.
- 83행 'Sun May 11 ... 2026'은 달력상 월요일이고 66행 덤프 디렉터리 날짜(2026-05-15)와도 달라 예시 출력이 실제 세션이 아닐 수 있다.
- 268·271행 비교, 394행 'vmcore 크기 0 ← crashkernel 미설정', 397행 drgn 오류 문자열, 399행 makedumpfile -d 31은 출처가 없다.

병합 대상: 병합 대상 없음. crash·drgn 사후 분석은 독립 검색 의도가 있고 겹치는 것은 chapter07 230~267행과의 사고 유형 목록(이 글 320~360행)뿐이다. 다음 조치는 보강이다. 사고 유형 절은 ch07 링크로 줄이고, 362~387행 'kdump-anon/clouddump'·'kpoke' 절을 1차 자료로 확인해 고치거나 지우고, crash·drgn·커널 버전과 생략 없는 실제 세션 출력을 붙이고, 282·290~291행 import와 302행 `-s`를 drgn 문서와 대조한다. 413행 '(마지막)'은 ch08·ch09 공개에 맞게 고친다.

### `kernel/chapter07-panic-oops.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순 두 건. (1) 98~102행은 error_code 비트를 [0]P·[1]W·[2]U·[3]RSVD·[4]I로 정의하는데 106행은 `0x0011` = user + write + protection이라고 적었다. 같은 글의 비트 정의로 0x11은 bit0(P)+bit4(I), 곧 protection + instruction fetch이고, user+write+protection은 0x7이다. (2) 173행 'offset 0x10 = 두 번째 64-bit 필드': 8바이트 필드는 0x0·0x8·0x10에 놓이므로 0x10은 세 번째 필드다(72~73행 '0x10 보통 struct의 두 번째 필드'도 같은 주장). git log(0a9dd7bc slug 고정, 28524a9d 코드 블록 태그, be973200 topic, ac24bb76 제목 변경 등)에 1차 자료 대조 커밋은 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 29~62행 예시 Oops 덤프를 첫 줄(66~88행)·#PF(90~106행)·Tainted(108~119행)·RIP(121~145행)·Code(147~162행)·레지스터(164~175행)·Call Trace(177~212행)·Modules(214~220행)·CR2(222~228행) 순서로 해독하는 구성이 이 글의 구조다. 그러나 각 절은 bug-hunting.rst 수준의 일반 정의이고, 유일한 사례(312~336행)는 레지스터 네 줄과 가상의 `disk-io.c:1234`(328행), `bio_alloc(...)`(332행)로 끝난다. 36행 'Acme MyServer' 같은 만든 덤프다. |
| B | 12 | Oops/Panic 비교(17~23행) → 줄별 해독 → lockup·hung task(230~265행) → KASAN(267~298행) → decode_stacktrace(300~310행) → 사례(312~336행) → 정리(357~364행)로 흐름은 완성됐다. 202~205행 콜스택 일괄 변환은 `xargs -I{} ... # 위 변환`으로 비어 있고, 153행 'RIP 주변 ~10바이트'는 `<>` 표시 규칙 설명이 없다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 6 | addr2line·objdump·xxd·decode_stacktrace 명령(133~139·155~160·209~212·304~308행)은 있으나 커널 버전·배포판·debuginfo 경로가 모두 `...`이다. 202~205행은 그대로 돌릴 수 없는 조각이다. 예시 출력(29~62·316~321행)은 만든 덤프이고 22초(239행)·120초(265행)는 출처·설정 조건이 없어 C ≤ 8이다. 실행 조건·예상 결과가 부족해 4~7 구간이다. |
| D | 11 | 비교 글: 같은 시리즈 `chapter06-crash-drgn.md` 320~357행이 NULL deref 0x10·lockup·hung task·KASAN을 다뤄 이 글 66~73·230~298행과 주제가 겹치나 ch06은 vmcore·crash 명령, 이 글은 dmesg 해석이라 역할이 갈린다. `chapter01-user-kernel-boundary.md` 199~214행 addr2line은 이 글 131~139행과 겹친다. `embedded/bsp/chapter11-bootlog-debugging.md` 134~190행은 arm64 부팅 panic 분류가 목적이다. `systems/linux-drivers/ldd3-modern/chapter04-debugging.md`는 draft이고 13행 Outline 한 줄뿐이다. `chapter08-cxl-driver-debug.md`는 CXL 관측이다. |
| E | 6 | description의 RIP·Call Trace·BUG·Tainted(5행)는 121~139·177~212·66~88·108~119행에서 다룬다. 제목은 아키텍처 제한이 없는데 본문은 x86-64 전용(97~106행 error_code, 173~175행 SysV ABI, 159행 `-m i386:x86-64`)이라 AP-C-24에 따라 E ≤ 8. 'Decoder Ring 만들기'(2행)라는 약속과 달리 독자가 만드는 도구·표가 없고 'dmesg 한 줄로 정확한 위치'(5행)는 202~205행 미완성 명령 때문에 끝까지 이행되지 않는다. |
| F | 4 | 같은 디렉터리에 seriesOrder 8 `chapter08-cxl-driver-debug.md`, 9 `chapter09-drivers-cxl-walkthrough.md`가 공개돼 있는데 13행 '마지막 장', 340행 '7장으로 … 전체 흐름', 342~348행 Ch1~7 정리가 시리즈를 7편으로 적고 ch08 안내가 없다. 다음 편 안내 오류라 5 이하. 368~373행 Ch1~6 라벨과 377·378행 Postmortem·Sanitizers 라벨은 대상과 맞으나 내부 글을 '외부 자료' 절에 넣었다. |
| G | 2 | 본문 출처는 decode_stacktrace.sh 링크(162행, master)와 bug-hunting.rst 링크(381행, latest)뿐이고 error_code 비트(98~102행)·taint 문자(114~117행)·hung task 120초(265행)와 연결되지 않는다. 버전 표기는 예시 덤프의 6.5.0(35행)뿐이다. 379·380행 dedoimedo·Brendan Gregg 링크는 이 글 주장과 무관한 일반 자료다. |

uncertainties:
- 20행은 Oops·Panic 모두 'Tainted T 비트 set'이라 했으나 114~117행 taint 목록에 T가 없고 35행 덤프도 'G W OE'다. 같은 시리즈 ch01 168행은 oops 후 taint 문자를 D로 적는다. tainted-kernels.rst로 확인해야 한다.
- 22행 Oops를 'NULL deref in process context', Panic을 'NULL deref in IRQ'로 나눈 표가 커널 동작과 맞는지 확인하지 않았다.
- 114행 `G` 의미와 119행 'G W OE' 해석을 확인하지 않았다.
- 153행 'RIP 주변 ~10바이트'와 실제 Code: 줄 바이트 수, `<>` 표시 규칙을 확인하지 않았다.
- 136행 .ko objdump 심볼 주소에 0x42를 더해 addr2line에 넘기는 방식이 relocatable 모듈에서 맞는지 확인하지 않았다.
- 156~158행 awk가 낸 `\x41\x57…` 문자열을 `xxd -r -p`가 의도대로 바꾸는지 확인하지 않았다.
- 197행 'asm_exc_page_fault 전이 진짜 사고 위치'가 193행 '위에서 아래 = 안에서 바깥'과 186~188행 순서에 비추어 어느 줄인지 모호하다.
- 239행 22초, 265행 120초와 watchdog_thresh·hung_task_timeout_secs 기본값의 관계를 출처로 확인하지 않았다.
- 318·328·332~333행 btrfs_submit_bio 위치와 bio_alloc NULL 반환 조건을 확인하지 않았다(가상 사례로 보임).
- 250행 hard lockup에서 'NMI watchdog가 유일하게 진입'이라는 단정과 arm64 적용 여부를 확인하지 않았다.
- E 상한은 rubric 4절 '특정 아키텍처 범위 불일치면 2점 이하'와 AP-C-24 '일반 제목 + 단일 대상 본문이면 E ≤ 8' 가운데 AP-C-24 쪽을 따랐다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 병합 대상 없음. ch06 320~357행과 메시지 유형이 겹치나 ch06은 vmcore·crash 명령, 이 글은 dmesg만으로 해석하는 독립 검색 의도('oops 메시지 해석')가 있다. 다음 조치는 보강이다. 106·173행(72~73행 포함) 산술 오류를 고치고, 13·340~348행 편수와 ch08 다음 편 안내를 고치고, 202~205행 명령을 완성하고, error_code·taint 문자를 arch/x86 traps 정의·tainted-kernels.rst와 버전을 밝혀 대조한다.

### `kernel/chapter08-cxl-driver-debug.md` — 54점, 병합 검토

confidence: 중간

factcheck: 검증됨. 커밋 18f8b421(2026-10-10, 'fix(content): Kernel Debugging Ch 8 — real module order, mailbox kprobe target, drgn walk')이 torvalds/linux `drivers/cxl/Makefile`·`core/Makefile`·`pci.c`·`core/mbox.c`·`core/ras.c`·`core/port.c`·`cxl.h`·`cxlmem.h`·`include/cxl/mailbox.h` @ master와 osandov/drgn `drgn/helpers/linux/device.py` @ main을 출처로 적고 모듈 순서, kprobe 대상, opcode 값(0x4200·0x4102), nr_dports, CXL_MAILBOX_TIMEOUT_MS·mbox_ready_timeout, cxl_error_handlers, PCI class match를 항목별로 고쳤다. 23ed6256은 출처 없는 qualify 커밋이라 근거로 쓰지 않았다. 본문 안 모순은 찾지 못했다(102행 2초·60초 구분은 105행·15~23행과 충돌하지 않는다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 이 글만의 내용은 102행(명령별 doorbell 한도 2초와 초기화용 mbox_ready_timeout 기본 60초를 구분해 흔한 오해를 바로잡음), 56~68행(cxl_internal_send_cmd 두 번째 인자를 struct cxl_mbox_cmd로 캐스팅해 실패한 opcode만 출력하는 bpftrace), 76~92행(CXL 전용 drgn helper가 없어 bus_for_each_dev로 cxl_bus_type을 도는 방법), 98~105행 증상·원인 표다. 나머지는 도구 사용법이고 25행 '추적 도구가 다릅니다'는 모듈별 도구 대응을 주지 않으며 72행 '좁힐 수 있습니다'는 판단 기준 없이 끝난다. 13~19 구간 하단. |
| B | 11 | 모듈 구성(13~23행) → ftrace(27~48행) → bpftrace(50~72행) → drgn(74~94행) → 함정(96~105행) → 정리(107~113행)로 끝까지 간다. ftrace 절은 출력 예시와 읽는 법 없이 함수 순서를 Ch 9로 넘기고, bpftrace 절은 cxl_core 모듈일 때 BTF 전제를 70행 한 문장으로만 다룬다. 112행 정리는 'port·decoder·region' 검사를 말하지만 79~91행 코드는 port·region만 다룬다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 7 | 실행 가능한 명령(33~45행 ftrace, 57~67행 bpftrace, 79~91행 drgn)과 대조할 dmesg 문구(70·101행)가 있다. 수치(2초·60초·-110·opcode)는 본문에 소스 경로가 붙어 C ≤ 8 상한은 걸리지 않는다. 그러나 커널 버전·하드웨어·QEMU 같은 실행 환경과 예상 출력이 세 도구 모두 없다(18f8b421에서 지어낸 출력은 지웠다). 결과 없는 절차라 C ≤ 9이고 합격·실패 관찰이 없어 4~7 구간 상단이다. |
| D | 9 | 비교한 글: (1) 같은 시리즈 다음 글 `chapter09-drivers-cxl-walkthrough.md` — 이 글 15~23행 모듈 순서 표 ↔ ch09 36~44행, 102행 2초 ↔ ch09 207·280행, 54행 cxl_internal_send_cmd ↔ 184~188행, 105행 cxl_error_detected ↔ 228~245행. (2) `postmortem/chapter05-cxl-device-postmortem.md` 25~42행 — 이 글 76~94행 bus_for_each_dev 순회 코드와 device_type 이름 목록이 거의 같다. (3) `modern-recipes/part11-17-linux-cxl-driver.md` 56행 모듈 순서·46행 DVSEC 경고 ↔ 15~23·101행, 77~83행 ftrace ↔ 31~45행. (4) `performance-engineering/part5-11-cxl-profiling-tools.md` 125~151행 bpftrace·opcode ↔ 56~70행. (5) 이전 글 `chapter07-panic-oops.md`와는 겹치지 않는다. |
| E | 6 | 제목(2행)의 ftrace·bpftrace·drgn과 description(5행)의 probe 흐름 추적·mailbox 명령 캡처·커널 상태 검사가 27·50·74행 절에 모두 있다. 다만 '디버깅'에 비해 본문은 도구 사용 예제 수준이고, 실패 하나를 끝까지 좁히는 진단 흐름이 없으며 ftrace 결과 해석은 48행에서 Ch 9로 미룬다. |
| F | 5 | 117행 다음 장(Ch 9 drivers/cxl 코드 분석)은 seriesOrder 9 ch09와 맞고 48행 앵커 #probe-흐름-추적은 ch09 98행에 있다. 121~123행 Ch 3·4·6, 125행 Embedded Debugging Ch 9도 맞다. 그러나 124행 'Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석'의 대상 part11-17은 seriesOrder 152이고 151은 part11-16 QEMU CXL 에뮬레이션 글이다. 틀린 라벨이라 F ≤ 5. 전제 지식 안내가 없다. |
| G | 2 | 주장마다 커널 소스 경로가 붙어 있다(15행 Makefile, 48행 pci.c·mem.c·port.c·acpi.c, 54행 core/mbox.c, 70행 pci.c·cxlmem.h, 94행 core/port.c·region.c·memdev.c). 그러나 커널 버전·대조 시점이 본문에 없고(ch09 85행은 v7.3-rc6을 적음) 링크된 1차 출처도 없다. 대조 기록은 커밋 본문에만 있어 factcheck에만 반영했다. |

uncertainties:
- 57~67행 cxl_core가 모듈일 때 kprobe에서 `(struct cxl_mbox_cmd *)arg1` 캐스트가 module BTF로 풀리는지는 bpftrace 버전에 달렸다. performance-engineering/part5-11 127행은 같은 함수에 fentry:cxl_core:를 쓴다.
- 61행 조건 `/@op[tid]/`는 opcode 0인 명령을 거른다. opcode 0x0000이 쓰이지 않는지 cxlmem.h로 확인하지 않았다.
- 102행 2초·60초는 18f8b421이 master 기준으로 대조했으나 본문에 버전이 없어 독자 커널과 같은지 알 수 없다.
- 104행 '/sys/bus/cxl 비어 있음 → modprobe cxl_acpi 안 함'은 비어 있음과 디렉터리 없음 구분을 확인하지 않았다.
- 112행 정리와 79~91행 코드의 decoder 범위 차이는 오류가 아니라 범위 차이로 보았다.
- 평가 중 upstream 소스를 직접 열지 않았다. factcheck는 커밋 기록에만 근거한다.

병합 대상: 후보는 `src/content/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough.md`(모듈 순서 표, 2초 timeout, cxl_internal_send_cmd, cxl_error_detected가 ch09 36~44·184~188·207·228~245·280행과 겹침)이고, drgn 절은 `src/content/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem.md` 25~42행과 거의 같다. 'CXL 드라이버를 ftrace·bpftrace·drgn으로 디버깅'이라는 도구 중심 검색 의도가 따로 있으므로 다음 조치는 차별화 보강이다. 겹치는 모듈 표와 drgn 설명은 줄여 ch09·postmortem ch05로 링크하고, 실제 환경(커널 버전, QEMU CXL Type 3 등)의 세 도구 출력과 실패 하나를 끝까지 좁히는 사례를 넣는다. 보강 뒤에도 고유 내용이 남지 않으면 ch09에 '디버깅 도구' 절로 합친다.

### `kernel/chapter09-drivers-cxl-walkthrough.md` — 47점, 병합 검토

confidence: 중간

factcheck: 검증됨. 8e18e425가 cxl_decoder_commit·cxl_internal_send_cmd 본문, 메일박스 2초 doorbell 대기, pci_error_handlers 멤버, region→dax→kmem 경로, lock 표, probe 순서, module init·Makefile 순서·MODULE_SOFTDEP, core/suspend.c를 torvalds/linux `drivers/cxl/{Makefile,core/Makefile,acpi.c,pci.c,mem.c,port.c,core/hdm.c,mbox.c,region.c,ras.c,pmem.c,suspend.c,core.h,cxl.h,cxlmem.h}`, `include/cxl/mailbox.h` @ master와 대조했고, d921312c가 struct 표·region sysfs 경로를 `include/cxl/mailbox.h`, `drivers/cxl/cxl.h`, `core/region.c` @ master와 대조했다. 23ed6256의 qualify 처리는 근거로 쓰지 않았다. 원문 안 모순은 찾지 못했다(286행 '8가지'는 87~96행 표 8행과 맞고, 164·276행 COMMIT_TIMEOUT_MS 20회·1 ms, 207·280행 2초, 78·81행 설명이 서로 맞다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 13 | 163~165행은 decoder를 번호 순서로 commit해야 하고 cxl_rwsem.region은 호출 쪽이 잡는다고 구분하고, 180·249·257행은 System RAM 추가가 commit이 아니라 dax·kmem 단계라고 바로잡고, 207~208행은 메일박스 대기가 공통 2초이고 명령별로 다른 것은 background poll뿐이라고 정리한다. 그러나 17~269행 대부분이 CXL 4.0 Internals Ch 11과 같은 문장이고 이 글에만 있는 것은 init 발췌와 subsys_initcall_sync 이유(52~81행), MODULE_SOFTDEP(46행), core/pmem.c·suspend.c 행(31~32행), 함정 표(273~280행)다. |
| B | 12 | 디렉터리(13~32행) → 모듈 순서(34~46행) → init(48~81행) → 자료구조(83~96행) → probe(98~118행) → HDM commit(120~165행) → region sysfs(167~180행) → mailbox(182~221행) → 오류 처리(223~245행) → dax·kmem(247~257행) → lock(259~269행) → 함정·정리(271~290행)로 제목 범위를 끝까지 간다. 13행이 도입 없이 표로 시작해 어떤 디버깅 상황에서 어느 코드를 읽는지 문제 정의가 없고, probe 추적은 cxl_pci만 다룬다(나머지는 81행 한 문장). 버전 표기(v7.3-rc6)와 검증 기준(master) 차이가 열려 있어 B ≤ 13. |
| C | 7 | 파일 경로가 붙은 코드 발췌(52~79·124~158·186~201·227~234행)와 반환 코드·dmesg 문자열을 원인에 대응시킨 함정 표(273~280행)가 있고, 164·207행 수치는 소스 상수로 출처가 붙어 있다. 그러나 독자가 실행할 명령, 실행 조건, 관찰 결과가 하나도 없다. 발췌 코드는 읽기용이고 118행은 ftrace 확인을 Ch 8로 넘긴다. 4~7 구간 상단이다. |
| D | 1 | 비교 글: 같은 시리즈 `chapter08-cxl-driver-debug.md`, 다른 시리즈 `embedded/hardware/cxl/chapter11-linux-driver.md`(CXL 4.0 Internals Ch 11), `embedded/modern-recipes/part11-17-linux-cxl-driver.md`. Ch 11과 거의 문장 단위로 같다: 디렉터리 표 17~31행 ↔ Ch11 23~36행, 모듈 순서 38~46 ↔ 44~52행, struct 87~96 ↔ 56~65행, probe 100~118 ↔ 69~87행, cxl_decoder_commit 122~165 ↔ 89~134행, region sysfs 169~180 ↔ 136~151행, mailbox 184~221 ↔ 153~192행, 오류 처리 225~245 ↔ 206~228행, dax·kmem 249~257 ↔ 194~204행, lock 261~269 ↔ 230~240행, 279행 EPERM ↔ Ch11 151·246행. Ch 8은 도구 절 중심, part11-17은 1층~5층 진단 절(23~145행)이라 역할이 다르다(117행 -EBUSY만 겹침). |
| E | 7 | 제목 '진입점부터 sysfs까지'와 description(5행)의 entry point·자료구조·sysfs가 48~81·83~96·167~180행에서 이행되고 과장은 없다. Kernel Debugging 시리즈 글인데 대상 독자와 풀려는 문제가 드러나는 곳은 함정 표 273~280행뿐이다. |
| F | 4 | 299행 'Modern Embedded Recipes Ch 151'의 대상 part11-17은 seriesOrder 152(7행)라 번호가 틀렸다. 302행 'source on kernel.org'는 실제로 elixir.bootlin.com/linux/latest로 가서 라벨이 틀렸고 본문 버전(15행 v7.3-rc6)과도 맞지 않는다. 298·300·301행과 118행 본문 링크는 맞다. 294행 다음 장 안내는 seriesOrder 10이 없어 '여기까지'는 맞지만 링크 없이 '분산된 챕터로 자연 연결'로 끝나고, 거의 같은 CXL Ch 11로의 링크가 없다. 틀린 라벨이라 F ≤ 5. |
| G | 3 | 15·85행에 'mainline v7.3-rc6 기준'을 적었고 주장마다 소스 경로가 붙어 있다(122행 core/hdm.c, 184행 core/mbox.c, 204행 pci.c, 210행 cxlmem.h, 237행 core/ras.c, 253~255행 drivers/dax/). 그러나 유일한 외부 링크(302행)는 bootlin latest라 본문 버전과 연결되지 않고 대조 기록(@ master)은 본문에 보이지 않는다. |

uncertainties:
- 15·85행은 'v7.3-rc6 기준'인데 8e18e425·d921312c는 '@ master'와 대조했다. 대조 시점의 master가 v7.3-rc6과 같은 코드인지 확인하지 않았다.
- 81행 cxl_acpi가 subsys_initcall_sync()를 쓰는 이유는 소스 주석을 직접 열어 확인하지 않았다.
- 207행 CXL_MAILBOX_TIMEOUT_MS = (2 * HZ), 164·276행 COMMIT_TIMEOUT_MS 20회·1 ms 간격은 커밋 기록만 보고 받아들였다.
- 105행 'DVSEC이 없으면 경고만 하고 CXL.mem 초기화를 건너뜀'은 pci.c를 열어 확인하지 않았다.
- 302행 bootlin latest 링크는 이후 upstream 변경 시 본문 코드와 달라질 수 있다.
- 평가 중 커널 소스를 직접 열지 않았다. factcheck는 git 이력으로만 정했다.

병합 대상: `src/content/blog/embedded/hardware/cxl/chapter11-linux-driver.md`(CXL 4.0 Internals Ch 11). 본문 17~269행이 Ch 11 23~240행과 거의 같고 독립 검색 의도가 약하다. 다음 조치: 이 글에만 있는 init 발췌(52~81행), MODULE_SOFTDEP(46행), core/pmem.c·suspend.c 행(31~32행), 함정 표(273~280행)를 Ch 11로 옮길지 검토한다. 이 글을 남긴다면 '증상 → 읽을 코드 위치' 중심으로 다시 쓰고 공통 코드 해설은 Ch 11 링크로 대체한다(이 경우 다음 조치는 보강). URL 처리 전에 chapter08 48행 #probe-흐름-추적 앵커와 115~117행 다음 장 예고를 함께 고쳐야 한다.

### `memory/chapter01-memory-accounting.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 글 안의 모순(루브릭 3-1, 예시 출력 산술). 한 코드 블록(265~284행)에서 269행 `numactl --hardware`는 'node 0 size: 8000 MB', 270행은 'node 0 free: 1500 MB'라고 하는데, 바로 다음 명령의 출력인 281행은 이 프로세스 하나가 node 0에 Private 12000.00 MB를 갖고 있다고 하고 283행은 node 0 합계를 12150.00 MB로 적는다. 크기 8000 MB(사용 중 6500 MB)인 노드에 한 프로세스가 12150 MB를 둘 수 없다. git log(2907896a 작성, c99833a1 callout, 09a00a29 stub 일괄, 400892d7 linter, ac24bb76 제목 변경, fa55144d 링크 기계 수정, be973200·28524a9d·0a9dd7bc 메타·태그·slug)에 1차 자료 대조 커밋이 없어 모순이 없었어도 미검증이다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | VSS/RSS/PSS/USS 표(26~31행), /proc/[pid]/status(37~54행), smaps_rollup(60~78행), smaps 필드(96~125행)는 `man 5 proc` 필드를 순서대로 옮긴 수준이다. 이 글만의 것은 RssAnon·RssFile·RssShmem 증가로 누수 종류를 가르는 부분(173~176행), Private_Dirty 1 MB 넘는 매핑을 정렬하는 awk(155~161행), 함정 표(304~313행)인데 근거·사례가 없다. 257행 'DB 서버 권장', 261행 'swappiness=10 정도'는 출처 없는 경험칙이다. |
| B | 11 | status → smaps_rollup → smaps → pmap → OOM → meminfo → free → swappiness → NUMA → 함정 → 정리(315~323행)까지 흐름은 간다. 31행에서 정의한 USS를 구하는 방법이 없고, 81행 '모든 프로세스 PSS 합 = 시스템 메모리 사용'은 커널 메모리·page cache를 빼놓은 한계를 말하지 않으며, NUMA 예시 출력(269·270행 vs 281·283행)이 서로 맞지 않는다. B ≤ 13(AP-C-24). |
| C | 7 | 실행 가능한 명령은 있다(38·61·96·140·156·182·207·237·247·253·266·275·289행). 모든 출력이 환경 없는 예시 수치이고 같은 PID 12345가 44행 VmRSS 128000 kB, 197행 anon-rss 7000000 kB, 283행 17650 MB로 나와 한 환경의 관찰로 볼 수 없다. C ≤ 8이고, 검증 절차가 없으며 312행 '(5.0+)'에도 출처가 없어 1점 낮다. |
| D | 10 | 같은 시리즈 `chapter02-heaptrack.md`와는 겹치지 않는다. `chapter05-prod-leak-diagnosis.md`와 상당히 겹친다: smaps_rollup Pss 폴링 84~91행 ↔ ch05 23~30행, Private_Dirty awk 155~161행 ↔ ch05 59~64행(임계값만 1024→10240), Rss 분류 165~176행 ↔ ch05 50~57행. 다른 시리즈 `embedded/performance-engineering/part5-11-cxl-profiling-tools.md` numastat 절(약 104~116행)은 이 글 263~290행과 명령만 겹친다. memory ch06·07은 CXL·tiered memory라 역할이 다르다. |
| E | 7 | 제목 'RSS·VSS·PSS·smaps 해석'과 description(5행)의 VSS/RSS/PSS, /proc/[pid]/{status,smaps}는 19~135행에서 다룬다. 본문이 OOM(178~202행), meminfo·free(204~248행), swappiness(250~261행), NUMA(263~290행)까지 넓어져 '해석'이 얕아졌다. 독자와 문제는 13행 한 문단뿐이다. |
| F | 5 | 327행 다음 장 'Ch 2 — heaptrack'과 331행 링크는 seriesOrder 2 `chapter02-heaptrack.md`와 맞고 298~300행 시리즈 안내도 맞다. 그러나 297행 '[Valgrind Ch 1]'은 valgrind/chapter02-memcheck.md로 가고, 333행 '[Valgrind Ch 5: Massif]'은 valgrind/chapter05-suppressions.md('Valgrind Suppression과 실무 운용')로 간다. Valgrind 시리즈에 Massif 글은 없다. 332·334행은 맞다. 틀린 라벨이라 F ≤ 5. |
| G | 2 | 출처는 관련 항목 끝의 `man 5 proc`(335행, 판 표기 없음), Brendan Gregg SCaLE15x 슬라이드(336행), cgroup-v2 문서(337행)뿐이다. 312행 smaps_rollup 버전, 259행 swappiness 범위, 192행 oom_score 계산, 81행 PSS 합에 연결된 출처가 없고 커널 버전·환경 표기가 없다. |

uncertainties:
- 269·270행 vs 281·283행 모순은 꾸며 낸 예시 출력일 가능성이 높다. 수치를 맞추거나 출력을 줄이면 된다.
- 29행 'RSS … (page table 포함)': RSS에 page table은 들어가지 않는다고 기억한다(VmPTE가 52행에 따로 있음). 커널 문서로 확인하지 않았다.
- 81행 '모든 프로세스 PSS 합 = 시스템 메모리 사용'은 커널 메모리·page cache·slab이 빠져 과장으로 보인다.
- 312행 'smaps_rollup 사용 (5.0+)': 4.14에서 들어왔다고 기억하나 changelog를 열지 않았다.
- 259행 '100: 적극 swap': 최근 커널의 swappiness 범위는 0~200이라고 기억하나 vm.rst로 확인하지 않았다.
- 192·321행 'oom_score는 RSS 기반': oom_badness가 swap·page table도 더하는지 mm/oom_kill.c로 확인하지 않았다.
- 131행 'heap (mmap된 small allocs는 별개)': glibc는 큰 할당을 mmap하므로 'small'이 거꾸로 쓰였을 수 있다.
- 306행 'future swap thrashing', 257행 'DB 서버 권장'은 출처가 없다.
- PID 12345 재사용(44·197·283행), 210행 MemAvailable 약 2.9 GiB와 239행 available 8.5Gi는 별개 예시로 읽을 수 있어 오류 확인 근거로 쓰지 않았다.

병합 대상: 판정은 오류 확인으로 우선 조치다. 병합 대상 없음. ch05와 겹치는 것은 84~91·155~176행의 세 덩어리뿐이고 이 글은 시리즈 1편이자 회계 지표 정의라는 독립 검색 의도가 있다. 다음 조치는 보강이다. NUMA 예시 출력 모순(269·270행 vs 281·283행)과 Valgrind 라벨(297·333행)을 먼저 고치고, USS 계산법을 넣고, ch05와 겹치는 폴링·awk·Rss 분류는 한쪽에만 두고 링크로 대신한다.

### `memory/chapter02-heaptrack.md` — 50점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(2907896a 신규 작성, c99833a1 callout, 09a00a29·400892d7 일괄 정리, ac24bb76 제목 변경, fa55144d 링크 일괄 수정, be973200 topic, 28524a9d 코드 블록 태그, 0a9dd7bc slug 고정)에 heaptrack upstream·문서와 대조한 커밋이 없다. 원문 안 모순도 찾지 못했다(13행 20-100배, 128행 Massif 20-50x·heaptrack 2-3x, 241행 '10-20배 빠른'은 128행에서 나오는 6.7~25배 안).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 9 | 설치(21~30행)·기본 사용(39~61행)·GUI 탭 목록(112~120행)은 heaptrack README 수준이다. 이 글만의 것은 Massif 대비 표(126~135행), 누수 진단 예(151~163행), 도구 결합 흐름(233~237행)인데 표 값은 출처가 없고 진단 예는 163행 '_store[key] = value로 무한 누적' 한 줄로 끝난다. 16행 'Massif의 80% 기능'은 근거 없는 수사다. |
| B | 10 | 설치 → 기록 → print/GUI 분석 → attach → 비교 → 함정 → 정리로 기본 흐름은 간다. --record-only 절(167~173행)은 두 문장이고 167행 '라이브러리만 attach'와 173행 'trace만 빠르게'가 같은 옵션을 다르게 설명한다. 환경 변수 절(177~180행)은 두 줄, 정적 바이너리 해법(201행)은 설명 없는 한 줄이다. B ≤ 13(AP-C-24). |
| C | 7 | 실행 가능한 명령(40·54·60·142·154~158·214행)은 있으나 출력 예(41~48·65~97행)는 꾸민 예시이고 OS·대상 프로그램이 없다. 버전은 34행 1.5.0뿐이다. 13·128행 속도 배수, 135행 CPU 부하, 190행 '수 GB → 수 MB'는 출처·환경 없는 수치라 C ≤ 8. 누수 진단의 기대 관찰이 161행 '우상향' 한 마디다. |
| D | 11 | 비교 글: 같은 시리즈 `chapter01-memory-accounting.md`, `chapter03-jemalloc-tcmalloc.md`, `chapter04-glibc-tools.md`, `chapter05-prod-leak-diagnosis.md`, 다른 시리즈 `valgrind/chapter01-intro.md`·`chapter05-suppressions.md`. ch05 133~142행 '옵션 C — heaptrack attach'(heaptrack -p, heaptrack_gui, Consumed 탭, 부하 2-3x)가 이 글 139~147·158~161·128행과 겹친다. ch01 292~298행은 예고뿐, ch03은 질문이 다르고, valgrind/chapter01-intro 74·77·139행은 Massif 한 줄 언급이다. heaptrack 단독 사용법은 이 글뿐이다. |
| E | 6 | 제목과 description(5행) '운영 환경에도 적용 가능'이 Massif 비교(126~137행)·attach 절(139~147행)과 같은 질문을 향한다. 제목의 '분석'에 비해 실제 분석 사례는 151~163행 한 개이고 결론이 한 줄이다. |
| F | 5 | 252행 다음 장(Ch 3 jemalloc/tcmalloc)은 seriesOrder 3과 맞다. 256·257·259행 관련 항목은 대상과 맞다. 258행 'Valgrind Ch 5: Massif'는 valgrind/chapter05-suppressions.md('Valgrind Suppression과 실무 운용')로 가며 Valgrind 시리즈에 Massif 글이 없다. 틀린 라벨이라 F ≤ 5. 전제 지식 안내가 없다. |
| G | 2 | 34행 heaptrack 1.5.0 출력과 260~261행 GitHub·milian.cc 링크가 있다. 속도 배수(13·128행), LD_PRELOAD 동작(184~190행), attach 방식(145행), 정적 바이너리 제한(194~198행)에 연결된 출처는 없다. |

uncertainties:
- 145행 attach가 'ltrace처럼 ptrace 활용'이라는 설명이 heaptrack의 gdb 주입 방식과 맞는지 upstream으로 확인하지 않았다.
- 167·173행 --record-only의 실제 의미를 확인하지 않았다(내부 모순으로 확정할 만큼 구체적이지 않음).
- 179행 HEAPTRACK_BACKTRACES_THREADS, 226행 `--filter` 옵션 존재 여부를 확인하지 않았다.
- 198행 'ERROR: cannot attach' 메시지와 201행 '-Wl,--export-dynamic + dlopen' 해법 근거를 확인하지 않았다.
- 13·128·135·190행 속도·부하·압축 수치는 출처·환경이 없다.
- 205행 'valgrind 위에서 안 돌아감' 근거를 확인하지 않았다.
- 184행 'malloc/free/realloc/calloc/free'에서 free가 중복됐다(표기 실수).
- 16행 'Massif의 80% 기능'은 근거 없는 수치다.
- 163행은 GUI 흐름(158~161행) 뒤에 heaptrack_print의 LEAKED 섹션을 근거로 들어 절차가 이어지지 않는다.

병합 대상: 병합 대상 없음. chapter05 133~142행이 attach·Consumed 탭 부분과 겹치지만 heaptrack 단독 사용법은 독립 검색 의도가 있고 다른 글이 대신하지 않는다. 다음 조치는 보강이다. heaptrack README·`--help`와 대조해 속도 수치·attach 방식·--record-only·환경 변수·--filter를 확인하고, 실제 실행 출력과 환경을 기록하고, 258행 Massif 라벨을 고치고, ch05 attach 절은 이 글로 링크를 넘긴다.

### `memory/chapter03-jemalloc-tcmalloc.md` — 52점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), be973200(topic), ac24bb76(제목 변경·날짜 정규화), 400892d7(linter 일괄), 09a00a29(stub 일괄), c99833a1(callout 변환), 2907896a(최초 작성)뿐이고 jemalloc 매뉴얼·gperftools 문서·upstream 소스와 대조한 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 설치(37~49행), LD_PRELOAD(55~63행), MALLOC_CONF(67~92행), jeprof(96~128행), HEAPPROFILE·google-pprof(182~209행)는 공식 문서 순서를 따르는 사용법 나열이다. 이 글만의 판단은 선택 표(215~222행)와 운영 흐름(272~277행)인데 근거가 없다. 21~29행 비교 표의 '빠름/매우 빠름', 31행 '메모리 30-50% 감소 사례 많음'은 출처·측정이 없고 224행 '측정해 선택'은 방법 없이 판단을 넘긴다. |
| B | 11 | 설치 → 교체 → 옵션 → 분석(96~118행) → diff(122~128행) → mallctl(134~149행) → tcmalloc(157~209행) → 선택(215~224행) → 함정(260~268행) → 운영 흐름(272~277행)으로 끝까지 간다. 151행 'SIGUSR signal handler' 패턴은 코드가 없고 287행 '상시 활성 가능한 정도의 부하'는 수치·조건이 없다. 164행 libtcmalloc-minimal4 설치와 184행 heap profiler 사용의 관계 설명이 없다. B ≤ 13. |
| C | 7 | 명령(56·69·73·97·123·183·195행)과 mallctl 코드(134~149행)는 따라 칠 수 있다. jemalloc·gperftools 버전, 배포판, 아키텍처가 없다. 99~102행 jeprof 출력은 출처 없는 예시다(표시값 반올림을 감안하면 비율·누적은 성립). 31행 '30-50%'로 C ≤ 8이고, 174행과 56행 경로 규칙이 섞여 있으며 성공·실패 관찰이 없다. |
| D | 10 | 비교 글: 같은 시리즈 `chapter01-memory-accounting.md`(13·300·308행 언급), `chapter02-heaptrack.md`(252·257행 예고), `chapter04-glibc-tools.md`(240~246행 tcache), `chapter05-prod-leak-diagnosis.md`, 다른 시리즈 `embedded/modern-recipes/part8-06-numa.md`(120~123행), `programming/code-review/abseil/part16-03-periodic-sampler.md`(130행). 가장 큰 겹침은 ch05다: MALLOC_CONF prof 73~80행 ↔ ch05 82행, prof.dump·SIGUSR 138·151행 ↔ 88~100행, jeprof --base 122~128행 ↔ 110~111행, Go net/http/pprof 246~254행 ↔ 335~340행(거의 동일). |
| E | 7 | 제목과 description의 'pprof로 시각화'를 jeprof(94~128행), HEAPPROFILE·google-pprof(180~200행), flame graph(115~117행)가 이행한다. Rust(226~240행)·Go(242~256행) 절은 제목 범위 밖이고 '운영'에 해당하는 부하·dump 주기 기준이 없다(287행). |
| F | 5 | 291행 다음 장(Ch 4 glibc 도구)은 seriesOrder 4와 맞고 295·296행도 맞다. 297행 'Sanitizers Ch 1: AddressSanitizer'의 대상은 seriesOrder 2 sanitizers/chapter02-asan-ubsan.md이고, 298행 'Valgrind Ch 1: Memcheck'의 대상도 seriesOrder 2 valgrind/chapter02-memcheck.md다(두 디렉터리 모두 chapter01-intro.md가 따로 있음). 틀린 라벨이라 F ≤ 5. 전제 지식 안내가 없다. |
| G | 2 | jemalloc.net·gperftools·pprof 링크는 끝 관련 항목(299~301행)에만 있다. 88행 lg_prof_sample 기본값, 92행 narenas 기본값, 188행 '1GB마다 dump', 21~29행 비교 표에 문서 위치·버전이 없다. 본문 버전 표기는 233행 tikv-jemallocator "0.5" 하나다. |

uncertainties:
- 23행은 glibc ptmalloc의 thread-local cache를 '없음'으로 적었으나 같은 시리즈 chapter04 240~242행은 glibc 2.26+ tcache를 설명한다. 다른 글과의 모순이라 glibc 문서로 확인해야 한다.
- 31·219행 Cassandra(JVM 기반)가 jemalloc을 쓴다는 주장을 확인하지 않았다.
- 220행 'Go-internal → tcmalloc'과 244행 'Go는 자체 allocator'는 문구가 모호해 오류로 올리지 않았다.
- 88행 lg_prof_sample 기본 19, 92행 narenas 기본 4×CPU, 89행 prof_leak 동작을 jemalloc 매뉴얼로 대조하지 않았다.
- 164·184행 libtcmalloc-minimal과 heap profiler 호환, 174·184행 라이브러리 경로를 확인하지 않았다.
- 188행 HEAPPROFILE 기본 간격 1GB와 189~190행 환경 변수 이름을 gperftools 문서로 확인하지 않았다.
- 204·207행 'tcmalloc은 CPU profiler도'는 실제로 gperftools libprofiler일 수 있다.
- 47행 autogen.sh가 --enable-prof를 configure로 넘기는지 확인하지 않았다.
- 106·200행 pprof 역사, 'google-pprof = jeprof의 원본' 서술과 264행 'go-pprof' 패키지 이름을 확인하지 않았다.

병합 대상: 병합 대상 없음. 가장 많이 겹치는 글은 chapter05-prod-leak-diagnosis.md(82~111·335~340행)지만 'jemalloc·tcmalloc profiler 사용법'이라는 독립 검색 의도가 있다. 다음 조치는 보강이다. 비교 표(21~29행)와 31행 수치를 1차 자료로 확인해 고치거나 지우고, jemalloc·gperftools 버전과 실행 환경을 적고, 151행 SIGUSR 패턴은 ch05 88~100행으로 링크하고 Go 절(242~256행)은 줄이거나 ch05로 보내고, 297·298행 라벨을 고친다.

### `memory/chapter04-glibc-tools.md` — 50점, 병합 검토

confidence: 중간

factcheck: 미검증. git log(2907896a 신규 작성, c99833a1 callout, 09a00a29·400892d7 일괄 linter, ac24bb76 제목 변경, be973200 topic, 28524a9d 코드 블록 태그, 0a9dd7bc slug 고정)에 glibc 매뉴얼·man page·glibc 소스와 대조한 커밋이 없다. 199행과 217행은 '큰 chunk' 범위가 모호해 내부 모순으로 확정하지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | MALLOC_CHECK_ 레벨(29~33행), mtrace 기호(92~96행), mallinfo2 필드(151~159행), mallopt 옵션(215~236행)은 매뉴얼 항목 나열이다. 글 고유 판단은 실전 흐름(279~293행), RSS와 heap_used gap 기준(311행), MALLOC_ARENA_MAX 관행(238행) 정도인데 근거·사례가 없다. 35·205·223행은 일반론이고, 13행 '환경 변수 하나로 켜고 끄는 단순함'은 mtrace(76행)·mcheck(120행)가 소스 수정을 요구하는 것과 맞지 않는다. |
| B | 11 | MALLOC_CHECK_ → PERTURB → mtrace → mcheck → 통계 → trim → mallopt → tcache → hook → 함정 → 실전 흐름 → 정리로 끝까지 간다(19~322행). 절마다 코드 한 조각과 한두 줄이고, mcheck(120행)는 첫 malloc 전에 불러야 한다는 전제가 없으며, 249~265행 '__malloc_hook (deprecated)' 절은 hook API를 설명하지 않고 dlsym override 코드만 둔다. 정확성 불확실이 열려 있어 B ≤ 13. |
| C | 6 | 명령(24·54·83·101·230·245행)과 예시 출력(25~26·85~89·102~107·182~192행)은 있으나 glibc 버전·배포판·아키텍처가 없다. 35행 '10-20%', 125행 '10-20x', 217행 '기본 128KB', 195·227행 '8 × ncpus'는 출처·환경 없는 수치라 C ≤ 8. 86행 '0x556...'과 106행 '0x00005556789'는 주소 형식이 맞지 않아 실제 실행 결과로 보기 어렵다. 검증 절차가 없다. |
| D | 10 | 비교 글: 같은 시리즈 `chapter01-memory-accounting.md`, `chapter02-heaptrack.md`, `chapter03-jemalloc-tcmalloc.md`, `chapter05-prod-leak-diagnosis.md`, 다른 시리즈 `valgrind/chapter02-memcheck.md`·`sanitizers/chapter02-asan-ubsan.md`. grep 결과 MALLOC_CHECK_·mtrace·MALLOC_ARENA_MAX는 다른 글에서 이 장을 가리키는 한 줄(ch01 299행, ch03 291행, ch05 352행)뿐이다. 겹치는 곳은 mallinfo2 주기 출력·Prometheus(161~171·295~311행) ↔ ch05 284~296행, malloc_trim(197~213행) ↔ ch05 238행·ch01 308행, LD_PRELOAD override(249~265행) ↔ ch02 182~194행이다. |
| E | 7 | 제목의 mtrace(70~110행)·mcheck(112~138행)·MALLOC_CHECK_(19~47행)는 모두 절이 있고 description(5행)·도입(13행)·정리(313~322행)가 같은 질문을 향한다. 대상 환경(13행 '오래된 시스템, 임베디드 등')이 막연하고 glibc 버전 범위가 없다. |
| F | 4 | 326행 'Ch 5 (마지막)'은 seriesOrder 5 ch05와 맞지만 같은 디렉터리에 공개 글 `chapter06-cxl-memory-diagnostics.md`(seriesOrder 6)·`chapter07-tiered-memory-diagnostics.md`(seriesOrder 7)가 있어 '마지막'이 틀렸다. 332행 'Sanitizers Ch 1: ASan'은 seriesOrder 2 sanitizers/chapter02-asan-ubsan.md로, 333행 'Valgrind Ch 1: Memcheck'는 seriesOrder 2 valgrind/chapter02-memcheck.md로 간다(Ch 1은 각각 chapter01-intro.md). F ≤ 5이고 279~293행 실전 흐름만 가산했다. |
| G | 2 | 관련 항목에 man page 이름(334~335행)과 glibc tunables 매뉴얼 링크(336행)가 있지만 본문 주장과 연결되지 않는다. 버전 표기는 242행 'glibc 2.26+' 하나이고 기본값(217·227행)·부하 수치(35·125행)·deprecated 상태(249행)의 기준 판이 없다. |

uncertainties:
- 57~58·62·65행은 할당 시 0xAB, free 시 ~0xAB로 채운다고 적었다. glibc 구현은 반대 방향으로 기억하나 소스로 확인하지 않았다.
- glibc 2.34부터 MALLOC_CHECK_·mtrace·mcheck가 libc_malloc_debug.so preload를 요구한다고 기억하나 확인하지 않았다. 사실이면 24·83·283행 명령이 최신 배포판에서 효과가 없다.
- 25행 'malloc(): unaligned tcache chunk detected'가 MALLOC_CHECK_ 출력인지 tcache 자체 검사 메시지인지 확인하지 않았다.
- 245행 tcache_max=0이 tcache 비활성인지(tcache_count=0이 아닌지) 확인하지 않았다.
- 199행 '큰 chunk도 OS에 자동 반환 안 됨'과 217행 '128KB 이상은 mmap → free 시 즉시 OS 반환'은 '큰'의 범위가 모호해 오류 확인으로 올리지 않았다. M_TRIM_THRESHOLD 자동 trim 언급도 없다.
- 251행 'weak symbol override 권장'과 253~262행 dlsym(RTLD_NEXT) 코드는 다른 메커니즘이고 재진입 문제를 다루지 않는다.
- 102~107행 mtrace 출력 형식을 확인하지 않았다.
- 195·227행 '8 × ncpus'는 64-bit 기준으로 기억한다(32-bit는 2 × ncpus).

병합 대상: 병합 대상 없음. glibc 내장 도구(MALLOC_CHECK_·PERTURB·mtrace·mcheck)는 다른 공개 글이 다루지 않는 독립 질문이다. 다음 조치는 보강이다. glibc 매뉴얼(Memory Allocation Tunables, Heap Consistency Checking)과 man 3 mallopt/mtrace/mcheck로 수치·기본값·PERTURB 동작·glibc 2.34 이후 변화를 대조하고, ch05 284~296행과 겹치는 mallinfo2 모니터링(161~171·295~311행)은 ch05로 넘기거나 줄이고, 326·332·333행 내비게이션 라벨을 고친다.

## 시리즈 공통 문제

루브릭 5절 기준(3편 이상)에 닿는 것만 적는다.

- 다음 편·마지막 표기 stale: 시리즈가 늘어나기 전 편수를 그대로 적었다. kernel ch06 413행 'Ch 7 (마지막)', kernel ch07 13행 '마지막 장'·340~348행 '7장으로'(seriesOrder 8·9 공개), memory ch04 326행 'Ch 5 (마지막)'(seriesOrder 6·7 공개), memory ch05 13행 '이 시리즈의 마지막 장'·345행. 4편 이상이다.
- 다른 시리즈 링크 라벨 번호 오류: Valgrind·Sanitizers·Modern Embedded Recipes를 가리키는 'Ch N' 라벨이 실제 seriesOrder와 다르다. memory ch01 297행('Valgrind Ch 1'→chapter02)·333행('Valgrind Ch 5: Massif'→chapter05-suppressions), memory ch02 258행(같은 Massif 라벨), memory ch03 297·298행, memory ch04 332·333행('Ch 1'→chapter02), kernel ch08 124행·kernel ch09 299행('Ch 151'→seriesOrder 152, part11-17 169~170행도 같은 패턴), kernel ch05 323행(pstore-blk에 'ramoops' 라벨), kernel ch09 302행('kernel.org'→bootlin). 8편에서 F ≤ 5가 걸렸다. fa55144d 링크 기계 수정과 23ed6256 당시 번호가 원인 후보다.
- 공통 H2 꼬리 뼈대: '자주 만나는 함정 / 정리 / 다음 장 예고 / 관련 항목'이 kernel ch04(424·431행 부근), ch05(291·302·313·317행), ch06(389·401·411·415행), ch08(96~125행), ch09(271~302행), memory ch02(220·239·250·254행), ch03(258·279·289·293행), ch04(267·313·324·328행)에 같은 순서로 있다. Kernel·Memory 시리즈는 2907896a 한 커밋으로 작성됐고 CXL 글은 23ed6256으로 함께 채워졌다. 9절 scaled content 기록 대상이다.
- 1차 자료 대조 커밋 없음: kernel ch04·ch05·ch06·ch07, memory ch01~ch04 8편이 미검증이다. 2907896a 이후 출처를 남긴 fact-check 커밋은 CXL 두 편(18f8b421·8e18e425·d921312c)뿐이다. 그 사이 오류 확인 3편(kernel ch05·ch07, memory ch01)이 모두 원문 내부 모순으로 나왔다.
- 본문 1차 출처·버전 표기 부재: 10편 모두 G가 2~3이다. 출처가 관련 항목 끝의 latest 링크나 man page 이름에만 있고(kernel ch05 322~323행, ch06 420~422행, ch07 381행, memory ch01 335~337행, ch03 299~301행, ch04 334~336행) 개별 주장과 연결되지 않는다. 커널·도구 버전 표기는 kernel ch04 40행, ch09 15·85행, memory ch02 34행 정도다.
- 환경 없는 예시 출력: 주소·릴리스를 '...'로 비우거나 꾸민 값을 쓴다. kernel ch05 73~81행, ch06 88·95·134행, ch07 29~62·316~321행(36행 'Acme MyServer'), memory ch01 44·197·283행(같은 PID 다른 값), ch02 41~48행, ch03 99~102행, ch04 86·106행. C가 6~7에 묶인 공통 원인이다.
- 시리즈 안팎 주제 중복: kernel ch04 ↔ performance-engineering part5-04(eBPF), kernel ch08·ch09 ↔ CXL 4.0 Internals Ch 11·postmortem ch05·modern-recipes part11-17·perf-eng part5-11(CXL 모듈 표가 kernel ch08 15~23행, ch09 36~44행, part11-17 56행 세 곳), memory ch01·ch02·ch03·ch04 ↔ memory ch05(폴링·awk·attach·prof.dump·Go pprof·mallinfo2). 정본을 정하고 나머지는 링크로 바꿀 후보다.
- 시리즈 사이 서술 불일치(다른 글과의 모순이라 오류 확인은 아님): drgn `-s` 옵션(kernel ch06 302행 ↔ postmortem ch05 28행), glibc tcache 유무(memory ch03 23행 ↔ ch04 240행), eBPF·ftrace 부하 방향(kernel ch04 388행 ↔ part5-04 134~135행), bpftrace kprobe vs fentry(kernel ch08 57~67행 ↔ part5-11 127행). 1차 자료로 정본을 정한다.

## 다음 조치

- 우선 조치(3편, 오류 확인): kernel ch05 102·298행 kgdboc·console 공유 모순을 kgdb.rst로 정리하고, kernel ch07 106행 error_code 0x0011 해석과 173행(72~73행 포함) offset 0x10 필드 순번을 고치고, memory ch01 269·270행과 281·283행 NUMA 예시 출력을 서로 맞춘다.
- 내비게이션 일괄 수정: kernel ch06 413행·ch07 13·340~348행의 편수와 ch08 안내, memory ch04 326행·ch05 13·345행의 편수, 다른 시리즈 'Ch N' 라벨(memory ch01~ch04, kernel ch05·ch08·ch09)을 실제 seriesOrder·제목에 맞춘다.
- 병합 검토(7편): kernel ch09는 CXL 4.0 Internals Ch 11과의 병합 여부를 먼저 정하고(병합하면 ch08 48·115~117행을 함께 고침), kernel ch04는 part5-04와 차별화 보강, kernel ch08은 ch09·postmortem ch05와 겹치는 절을 링크로 바꾼다. kernel ch06, memory ch02~ch04는 병합 대상 없이 보강한다.
- Kernel Debugging ch04~ch07과 Memory Diagnostics ch01~ch04를 `/fact-check-round` 대상으로 올리고, 2907896a 일괄 작성 글의 예시 출력과 수치를 1차 자료로 검산한다. 시리즈 사이 불일치(drgn `-s`, glibc tcache, eBPF 부하)는 정본을 정한 뒤 `data/known-falsehoods.yaml` 등재를 검토한다.
- 이번 루프에서는 원문을 고치지 않았다. 수정은 별도 수정 루프에서 한다.
