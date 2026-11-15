---
title: "CXL 성능 프로파일링 도구 — cxl-cli·DAMON·perf-mem 활용"
slug: "embedded/performance-engineering/part5-11-cxl-profiling-tools"
date: 2026-06-16T09:02:00
description: "cxl-cli 토폴로지·DAMON region 활동·perf memory sample·NUMA 할당 통계의 관찰 범위와 실패 조건을 구분합니다."
series: "Embedded Performance Engineering"
seriesOrder: 55
tags: [cxl, cxl-cli, damon, perf-mem, numastat, profiling]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

> **"CXL 성능 도구는 *서로 다른 층*을 본다."** — cxl-cli는 *토폴로지와 디바이스 상태*, DAMON은 *메모리 region의 표본화된 access 활동*, perf-mem은 *CPU의 메모리 접근 분포*, numastat은 *NUMA 노드별 통계*를 봅니다. 한 가지로 다 해결 안 되며 *조합*이 핵심입니다.

[Ch 54](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)의 지연·대역폭 질문과 별도로, 이 장은 topology·memory activity·CPU sample·NUMA allocation의 서로 다른 증거를 연결합니다. 그 장의 실제 측정에 사용한 도구라는 뜻은 아닙니다. Linux6.12와 ndctl80의 source·문서를 대조했으며 실제 CXL/perf/DAMON workload는 실행하지 않았습니다.

## 어떤 문제를 푸는가

CXL 성능 분석은 *기존 메모리 분석과 다른 층*이 추가됩니다.

| 층 | 도구 | 본질 |
|---|------|------|
| 디바이스·토폴로지 | cxl-cli | 어떤 디바이스가 어디 붙어 있나, region/decoder 구성 |
| Page 활동 | DAMON·DAMOS | region access 표본·선택한 DAMOS action |
| CPU access | perf mem·perf c2c | load/store 분포, cache miss source |
| NUMA 통계 | numastat·numactl | 노드별 사용량·할당 통계 |
| Kernel 트레이싱 | bpftrace·ftrace | CXL 드라이버 내부 호출 |

각 도구가 *서로 다른 질문*에 답합니다. 한 가지로 다 보려고 하면 실패합니다.

## cxl-cli — 토폴로지와 region 관리

cxl-cli는 ndctl 패키지에 들어 있는 *CXL 서브시스템 CLI*입니다.

아래 list는 조회, create-region·daxctl reconfigure는 상태를 변경합니다. 기존 사용 메모리·driver·OS online 조건을 확인해야 하며 이 작업에서는 변경 명령을 실행하지 않았습니다.

```bash
# region과 그 mapping(어느 endpoint decoder가 몇 번째 자리인지)
$ cxl list -RT

# decoder와 target 목록 (interleave_ways·interleave_granularity 포함)
$ cxl list -DT

# 2-way interleave ram region 생성 — memdev는 -m과 함께 위치 인자로
$ cxl create-region -m -d decoder0.0 -t ram -w 2 -g 256 mem0 mem1

# DAX 또는 System RAM 모드 전환
$ daxctl reconfigure-device dax0.0 -m system-ram
```

출력 JSON 형식은 ndctl 문서(`cxl-list`, `cxl-create-region`)에 예시가 있습니다. interleave granularity는 커널 HDM 디코더 코드가 256 B~16 KB의 2의 거듭제곱만 받으므로(`drivers/cxl/cxl.h`의 `granularity_to_eig()`), `-g`도 그 범위 안에서 고릅니다.

이 장에서 쓰는 명령은 *list·create-region·monitor*이고, 그 밖에 *set-partition·enable/disable-region·update-firmware* 등이 있습니다(ndctl `cxl/cxl.c`의 명령 표).

## DAMON — Page 단위 access 추적

Sampling/aggregation 간격의 의미는 선택한 kernel 문서를 확인합니다. 최신 문서의 tuning guide를6.12의 모든 workload에 고정 비율 규칙으로 적용하지 않습니다. 지원되는 sysfs/admin 인터페이스는 커널 버전에 따라 다릅니다.

[Linux6.12 DAMON 문서](https://www.kernel.org/doc/html/v6.12/mm/damon/design.html)의 region 기반 adaptive sampling과 실제 page access 전수 추적을 구분합니다. Monitoring target·operations·interval·scheme을 준비해야 하며, state=on 하나가 완성된 측정 설정은 아닙니다.

```bash
# 1. DAMON 설정 후 시작 (대상·operations 설정은 커널 admin-guide/mm/damon/usage 참조)
$ echo on > /sys/kernel/mm/damon/admin/kdamonds/0/state

# 2. 기록 자료의 수집·report 입력은 선택한 damo version의 문서로 확인

# 3. DAMOS scheme — access 패턴과 action
$ cat /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/schemes/0/access_pattern/nr_accesses/min
$ cat /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/schemes/0/action
```

action이 `migrate_hot`이면 warm한 region부터, `migrate_cold`이면 cold한 region부터 `target_nid` 노드로 옮깁니다.

DAMON의 핵심 파라미터:

| 파라미터 | 의미 | 실제 환경에서 기록할 것 |
|---------|------|------|
| sample_interval | access 여부 표본화 주기 | operations·clock·overhead |
| aggr_interval | 표본 집계 주기 | workload 변화와 결과 분해능 |
| min_nr_regions | 최소 region 수 | 실제 address range·분할 |
| max_nr_regions | 최대 region 수 | footprint·access 구분·비용 |

Default와 tuning guide는 선택한 kernel/version의 설정을 확인합니다. 특정 기본값 비율을 모든 workload의 최적 비율로 두지 않습니다. DAMON을 켠 것만으로 report 파일이 자동 생성되지는 않으므로 실제 recording 경로·형식·damo release를 함께 기록해야 합니다.

## perf-mem — CPU의 메모리 접근 분포

`perf mem`은 *CPU PMU의 메모리 이벤트*를 캡처합니다.

```bash
# Load latency 분포 측정
$ perf mem record -- ./workload
$ perf mem report

# memory level별로 보기
$ perf mem report --sort=mem,symbol

# Snoop 트래픽
$ perf c2c record -- ./workload
$ perf c2c report
```

`Local Weight`는 기록된 sample의 weight이며 구체적인 의미는 이벤트와 PMU에 따릅니다. `perf mem`이 CXL을 별도 memory level로 표시하는지는 커널·perf 버전과 PMU의 data-source 인코딩에 따라 다르므로, 해당 target의 `perf mem report` 결과와 문서를 확인해야 합니다. 모든 플랫폼에서 CXL 비중을 직접 제공한다고 가정하지 않습니다.

## numastat — NUMA 노드별 통계

CXL capacity가 firmware·kernel·DAX/SystemRAM 구성에 따라 NUMA node의 System RAM으로 노출된 경우 사용량·할당 통계를 볼 수 있습니다. Device DAX만 쓰거나 기존 node에 통합되는 구성을 별도 CXL node가 항상 생기는 것처럼 쓰지 않습니다.

```bash
# 노드별 메모리 사용 (meminfo 형식)
$ numastat -m

# 프로세스별 노드 사용
$ numastat -p 1234

# 노드별 hit/miss 카운터 (/sys/devices/system/node/node*/numastat)
$ numastat
```

커널 문서(`admin-guide/numastat.rst`)의 정의로 읽습니다. *numa_miss*는 다른 노드를 원했지만 *이 노드*에서 메모리를 받은 횟수입니다. 높은 counter 하나만으로 선호 원래 노드·고갈 원인·CXL traffic 양을 확정하지 않습니다. Workload policy·다른 node의 counter·해당 구간의 증분을 함께 확인합니다.

## bpftrace — CXL 드라이버 동적 트레이싱

CXL 드라이버의 내부 함수와 tracepoint는 커널 버전·설정에 따라 달라집니다. 아래 discovery 명령으로 대상 커널에서 실제로 제공하는 항목을 먼저 찾습니다. 결과가 없거나 BTF/symbol이 제공되지 않으면 해당 probe는 사용할 수 없습니다.

```bash
# CXL 관련 tracepoint가 있다면 목록 확인
sudo bpftrace -l 'tracepoint:cxl:*'

# CXL 관련 커널 symbol 후보 확인
sudo grep -E 'cxl.*(event|mbox|cmd)' /proc/kallsyms

# 선택한 tracepoint의 실제 필드 확인 (EVENT_NAME은 발견한 이름으로 바꿉니다)
sudo cat /sys/kernel/tracing/events/cxl/EVENT_NAME/format
```

세 번째 명령의 `EVENT_NAME`은 문서 예시를 실제로 바꿔야 하는 자리표시자입니다. 대상 시스템에서 이름과 필드를 확인하기 전에는 bpftrace program을 작성하지 않습니다. 본 환경에는 CXL 장치와 Linux tracing stack이 없어 명령과 probe를 실행하지 않았습니다.

## 정상·실패·미지원 결과를 구분

| 관찰 | 결론을 보류할 조건 | 추가 증거 |
|------|------|------|
| List에 객체 없음 | idle·disabled·driver·권한 문제 | release별 옵션·sysfs·동일시점 topology |
| DAMON 시작 실패 | target·operations·권한·구성 불일치 | 설정 전체와 실제 error |
| Perf memory sample 없음 | unsupported event·loss·표본 부족 | PMU 지원·enabled/running·lost sample |
| NUMA counter 증가 | allocation 통계·migration·traffic 혼동 | memory policy·주소 mapping·측정 구간 |

아래 workflow는 미실행 계획이며 도구별 성공을 전체 CXL 상태의 성공으로 합치지 않습니다.

## 도구 조합 — 실전 워크플로

CXL 환경 디버깅의 일반 흐름:

| 단계 | 도구 | 묻는 질문 |
|------|------|----------|
| 1. 토폴로지 확인 | `cxl list -RT` | 어떤 디바이스가 어디 붙어 있나 |
| 2. NUMA 등록 | `numactl --hardware` | 노드 분리 잘 되어 있나 |
| 3. 워크로드 시작 | `perf mem record` | 지원 PMU가 기록한 access source·weight는 무엇인가 |
| 4. Access 분포 | version별 DAMON 기록·report 경로 | sample·region·누락을 고려한 hot/cold 가설인가 |
| 5. Tier 동작 | kernel-version-specific bpftrace probe | migration event와 대상 node가 예상대로 보이나 |
| 6. RAS 이벤트 | `cxl monitor` | 디바이스에 이상 신호 없나 |

## 자주 보는 함정과 안티패턴

> ⚠️ `cxl list`만 보고 토폴로지 단정

`cxl list`는 기본으로 *활성 객체만* 보여 줍니다. enable되지 않았거나 크기가 0인 객체는 `-i`(`--idle`)를 붙여야 나옵니다(ndctl `cxl-list`). 이걸 빠뜨리면 disable된 memdev·region을 없는 것으로 착각합니다.

> ⚠️ DAMON `sample_interval`만 줄이기

sample_interval이 지나치게 작으면 access 분류 결과의 분해능은 더 높이지 못하면서 *오버헤드만 늘어날 수 있습니다*. 결과가 coarse하다면 sample/aggregation interval의 조합을 workload와 kernel 문서에 맞춰 조정합니다.

> ⚠️ `perf mem`로 throughput 측정

`perf mem`은 *sampling*입니다. *실제 throughput*은 못 봅니다. throughput은 *STREAM·mlc*가 맞고, perf mem은 *어디서 latency가 나오는지* 분포 분석에 씁니다.

> ⚠️ numastat의 `numa_foreign` 항목 무시

`numa_foreign`은 *이 노드에서 할당받기를 원했지만 다른 노드에서 받은* 횟수로, 선호 노드 쪽에 쌓입니다. 이 counter들은 source/destination별 전송 trace가 아닙니다. 두 값만으로 어느 node에서 어디로 몇byte 이동했는지 복원할 수 없습니다.

## 정리

- CXL 성능 분석은 *cxl-cli·DAMON·perf-mem·numastat·bpftrace 5개 도구*가 *서로 다른 층*을 봅니다.
- *cxl-cli*는 *토폴로지와 region 관리*, *DAMON*은 *page 활동*, *perf-mem*은 *CPU access 분포*, *numastat*은 *NUMA 통계*, *bpftrace*는 *드라이버 동적 추적*입니다.
- 워크플로 권장: *토폴로지 → NUMA → 워크로드 시작 → access 분포 → tier 동작 → RAS*의 6단계 순.
- DAMON interval·region 수·operations·scheme과 실제 recording 경로를 workload로 확인합니다.
- `perf mem`은 *분포 분석 전용*, throughput은 실제 workload의 완료량/시간과 목적에 맞는 benchmark로 별도 측정합니다.

다음 편은 [Ch 56: CXL.mem·LLM KV cache 설계 시나리오](/blog/embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache)입니다. 실제 처리량 회복을 측정한 해결 사례가 아닙니다.

## 관련 항목

- [Ch 40: Linux perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [Ch 43: eBPF·bpftrace 동적 트레이싱](/blog/embedded/performance-engineering/part5-04-ebpf)
- [Ch 54: CXL.mem 지연·대역폭](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
