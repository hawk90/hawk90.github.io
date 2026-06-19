---
title: "CXL 성능 프로파일링 도구 — cxl-cli·DAMON·perf-mem 활용"
date: 2026-06-16T09:02:00
description: "CXL.mem 환경 성능 도구 — cxl-cli 토폴로지·DAMON page activity·perf-mem로 보는 CXL 트래픽·numastat 통계."
series: "Embedded Performance Engineering"
seriesOrder: 55
tags: [cxl, cxl-cli, damon, perf-mem, numastat, profiling]
draft: false
---

## 한 줄 요약

> **"CXL 성능 도구는 *서로 다른 층*을 본다."** — cxl-cli는 *토폴로지와 디바이스 상태*, DAMON은 *page 단위 access 빈도*, perf-mem은 *CPU의 메모리 접근 분포*, numastat은 *NUMA 노드별 통계*를 봅니다. 한 가지로 다 해결 안 되며 *조합*이 핵심입니다.

[Ch 54](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)에서 *측정 결과*를 봤습니다. 이 장은 *그 측정에 쓴 도구들*을 *Part 5 (프로파일링 도구) 톤*으로 정리합니다.

## 어떤 문제를 푸는가

CXL 성능 분석은 *기존 메모리 분석과 다른 층*이 추가됩니다.

| 층 | 도구 | 본질 |
|---|------|------|
| 디바이스·토폴로지 | cxl-cli | 어떤 디바이스가 어디 붙어 있나, region/decoder 구성 |
| Page 활동 | DAMON·DAMOS | 어느 페이지가 hot/cold, 자동 promotion/demotion |
| CPU access | perf mem·perf c2c | load/store 분포, cache miss source |
| NUMA 통계 | numastat·numactl | 노드별 메모리·트래픽 |
| Kernel 트레이싱 | bpftrace·ftrace | CXL 드라이버 내부 호출 |

각 도구가 *서로 다른 질문*에 답합니다. 한 가지로 다 보려고 하면 실패합니다.

## cxl-cli — 토폴로지와 region 관리

cxl-cli는 *Linux 6.0+에서 CXL 서브시스템 표준 CLI*입니다.

```bash
# 전체 토폴로지
$ cxl list -RT
[
  {
    "host":"acpi0017:00",
    "ports": [
      {
        "port":"port1",
        "host":"0000:00:01.0",
        "decoders": [...],
        "endpoints": [
          {
            "memdev":"mem0",
            "ram_size":274877906944,
            "host":"0000:5e:00.0"
          }
        ]
      }
    ]
  }
]

# Decoder 매핑 확인
$ cxl list -DT
[
  {
    "decoder":"decoder3.0",
    "resource":0x80000000,
    "size":0x80000000,
    "interleave_ways":2,
    "interleave_granularity":64
  }
]

# Region 생성
$ cxl create-region -d decoder0.0 -t ram -s 128G
{
  "region":"region0",
  "resource":0x80000000,
  "size":137438953472,
  "interleave_ways":2,
  "interleave_granularity":64,
  "decoder":"decoder0.0",
  "mappings": [
    {"position":0, "memdev":"mem0"},
    {"position":1, "memdev":"mem1"}
  ]
}

# DAX 또는 System RAM 모드 전환
$ daxctl reconfigure-device dax0.0 -m system-ram
```

핵심 명령은 *list·create-region·set-partition·set-event-irq* 5가지입니다.

## DAMON — Page 단위 access 추적

DAMON은 *kernel 5.15+*에서 *page 활동을 적은 오버헤드로 측정*합니다.

```bash
# 1. DAMON 활성화
$ echo on > /sys/kernel/mm/damon/admin/kdamonds/0/state

# 2. 결과 확인
$ damo report access
target_id  region(KB)  access(%)  node
0          0-32M       82.3       0
0          32M-128M    45.1       0
0          128M-1G     8.2        2  # CXL — cool
0          1G-256G     1.1        2  # CXL — cold

# 3. DAMOS scheme — 자동 promotion/demotion
$ cat /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/schemes/0/access_pattern/min_nr_accesses
1
$ cat /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/schemes/0/action
migrate_hot   # hot page를 빠른 tier로 이동
```

DAMON의 핵심 파라미터:

| 파라미터 | 의미 | 권장 |
|---------|------|------|
| sample_interval | 한 region을 얼마나 자주 sample | 5ms (default) |
| aggr_interval | aggregation 주기 | 100ms |
| min_nr_regions | 최소 region 분할 | 10 |
| max_nr_regions | 최대 region 분할 | 1000 |

*aggr_interval이 크면* DAMON 오버헤드가 작아지지만 *반응이 느림*. *작으면* 정확도 높아지지만 *오버헤드 증가*. tradeoff입니다.

## perf-mem — CPU의 메모리 접근 분포

`perf mem`은 *CPU PMU의 메모리 이벤트*를 캡처합니다.

```bash
# Load latency 분포 측정
$ perf mem record -- ./workload
$ perf mem report

# Sample 출력
        Local Weight   Memory Access     Symbol             DSO
        ── 12.45%      cxl-mem (node 2) workload::process   workload
        ── 35.20%      L3 hit            workload::cache    workload
        ── 8.10%       L1 hit            workload::hot      workload

# CXL 노드 access만 필터
$ perf mem report --sort=mem,symbol | grep "node 2"

# Snoop 트래픽
$ perf c2c record -- ./workload
$ perf c2c report
```

`Local Weight`는 *각 access의 latency 비중*입니다. *cxl-mem (node 2)가 큰 비중*이면 *CXL.mem이 hot path*에 있는 신호.

## numastat — NUMA 노드별 통계

CXL은 *별도 NUMA 노드*로 등록되어 numastat이 자연스럽게 통합 분석을 제공합니다.

```bash
# 전체 노드 통계
$ numastat -m
                  Node 0     Node 1     Node 2 (CXL)
MemTotal      262144000  262144000  274877906944
MemFree         5120000     6291000    8589934592
Active(anon)  198976000  201342000  198945792000
Inactive       2048000     1532000     1073741824

# 프로세스별 노드 사용
$ numastat -p <pid>
Per-node process memory usage (in MBs)
                Node 0  Node 1  Node 2  Total
Huge               0      0       0      0
Heap            1234   2345    98765  102344
Stack              0      0       0      0
Private         1098   1872    87654   90624

# Memory miss·hit 통계
$ numastat
                       node0     node1     node2
numa_hit          103294827   85928301  29384720
numa_miss            382910     482910   1834820  # CXL — miss 많음
numa_foreign         482910     382910      0
local_node        102911917   85445391  29384720
other_node           382910     482910   1834820
```

*numa_miss가 CXL 노드에 집중*이면 *application이 자기 노드 외 메모리를 자주 접근*하는 신호.

## bpftrace — CXL 드라이버 동적 트레이싱

CXL 드라이버 내부 호출을 동적으로 캡처:

```bash
# CXL mailbox 명령 추적
$ bpftrace -e '
  kprobe:cxl_mbox_send_cmd {
    @cmds[arg1] = count();
  }
  interval:s:5 {
    print(@cmds);
    clear(@cmds);
  }
'

# 출력 예
@cmds[0x4400]: 1234   # Get Health Info
@cmds[0x4300]: 567    # Get LSA
@cmds[0x4302]: 89     # Set LSA

# Page migration 추적 (DAMON 동작 검증)
$ bpftrace -e '
  tracepoint:migrate:mm_migrate_pages_start {
    @migrations[args->from_node, args->to_node] = sum(args->nr_pages);
  }
'

# CXL 인터럽트 빈도
$ bpftrace -e '
  kprobe:cxl_event_irq_handler {
    @[probe] = count();
  }
'
```

bpftrace는 *문제가 의심되는 좁은 영역*을 *수정 없이 깊이 추적*할 때 강력합니다.

## 도구 조합 — 실전 워크플로

CXL 환경 디버깅의 일반 흐름:

| 단계 | 도구 | 묻는 질문 |
|------|------|----------|
| 1. 토폴로지 확인 | `cxl list -RT` | 어떤 디바이스가 어디 붙어 있나 |
| 2. NUMA 등록 | `numactl --hardware` | 노드 분리 잘 되어 있나 |
| 3. 워크로드 시작 | `perf mem record` | CPU가 어느 노드 자주 접근 |
| 4. Access 분포 | `damo report access` | hot/cold 분류 잘 되어 있나 |
| 5. Tier 동작 | `bpftrace migrate` | promotion/demotion 자동 실행되나 |
| 6. RAS 이벤트 | `cxl monitor` | 디바이스에 이상 신호 없나 |

## 자주 보는 함정과 안티패턴

> ⚠️ `cxl list`만 보고 토폴로지 단정

`cxl list` 출력은 *현재 활성 디바이스만*. *hot-plug 가능 슬롯*은 *별도 옵션* (`-i`)으로 봐야 합니다. *구성 가능한 슬롯과 활성 디바이스를 혼동*하면 *용량 계획이 틀려집니다*.

> ⚠️ DAMON `sample_interval` 너무 작게 설정

*5ms 이하*면 *DAMON 자체 오버헤드*가 *워크로드의 5% 이상*. *측정 결과가 측정 행위로 왜곡*됩니다. *100ms 단위*가 일반 권장.

> ⚠️ `perf mem`로 throughput 측정

`perf mem`은 *sampling*입니다. *실제 throughput*은 못 봅니다. throughput은 *STREAM·mlc*가 맞고, perf mem은 *어디서 latency가 나오는지* 분포 분석에 씁니다.

> ⚠️ numastat의 `numa_foreign` 항목 무시

`numa_foreign`은 *자기 노드 메모리가 다른 노드 프로세스에 할당된 경우*. *큰 값*은 *자원 공유 충돌*. CXL pool 환경에서는 *항상 모니터링*해야 할 지표.

## 정리

- CXL 성능 분석은 *cxl-cli·DAMON·perf-mem·numastat·bpftrace 5개 도구*가 *서로 다른 층*을 봅니다.
- *cxl-cli*는 *토폴로지와 region 관리*, *DAMON*은 *page 활동*, *perf-mem*은 *CPU access 분포*, *numastat*은 *NUMA 통계*, *bpftrace*는 *드라이버 동적 추적*입니다.
- 워크플로 권장: *토폴로지 → NUMA → 워크로드 시작 → access 분포 → tier 동작 → RAS*의 6단계 순.
- DAMON *sample_interval 5ms 이하는 위험*, *100ms*가 일반적입니다.
- `perf mem`은 *분포 분석 전용*, throughput은 *STREAM·mlc*가 정답입니다.

다음 편은 **Ch 56: 실전 사례 — CXL.mem 추가로 LLM inference KV cache 처리량 회복** — Ch 8(HBM)에서 본 LLaMA 70B 메모리 문제의 *해결편 case study*입니다.

## 관련 항목

- [Ch 40: Linux perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [Ch 43: eBPF·bpftrace 동적 트레이싱](/blog/embedded/performance-engineering/part5-04-ebpf)
- [Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
