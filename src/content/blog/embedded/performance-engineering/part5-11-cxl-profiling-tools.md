---
title: "CXL 성능 프로파일링 도구 — cxl-cli·DAMON·perf-mem 활용"
slug: "embedded/performance-engineering/part5-11-cxl-profiling-tools"
date: 2026-06-16T09:02:00
description: "CXL.mem 환경 성능 도구 — cxl-cli 토폴로지·DAMON page activity·perf-mem로 보는 CXL 트래픽·numastat 통계."
series: "Embedded Performance Engineering"
seriesOrder: 55
tags: [cxl, cxl-cli, damon, perf-mem, numastat, profiling]
draft: false
topics: ["embedded"]
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

cxl-cli는 ndctl 패키지에 들어 있는 *CXL 서브시스템 CLI*입니다.

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

DAMON은 *메모리 region의 access 빈도를 적은 오버헤드로 측정*합니다.

```bash
# 1. DAMON 설정 후 시작 (대상·operations 설정은 커널 admin-guide/mm/damon/usage 참조)
$ echo on > /sys/kernel/mm/damon/admin/kdamonds/0/state

# 2. 결과 확인
$ damo report access

# 3. DAMOS scheme — access 패턴과 action
$ cat /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/schemes/0/access_pattern/nr_accesses/min
$ cat /sys/kernel/mm/damon/admin/kdamonds/0/contexts/0/schemes/0/action
```

action이 `migrate_hot`이면 warm한 region부터, `migrate_cold`이면 cold한 region부터 `target_nid` 노드로 옮깁니다.

DAMON의 핵심 파라미터:

| 파라미터 | 의미 | 기본값 (`mm/damon/core.c`) |
|---------|------|------|
| sample_interval | access 여부를 sample하는 주기 | 5 ms |
| aggr_interval | sample을 모아 집계하는 주기 | 100 ms |
| min_nr_regions | 최소 region 분할 | 10 |
| max_nr_regions | 최대 region 분할 | 1000 |

커널 설계 문서의 튜닝 가이드는 *aggr_interval*을 워크로드가 의미 있는 양의 access를 하는 시간으로 잡으라고 합니다. 기본값 100 ms는 많은 경우, 특히 큰 시스템에서 너무 짧습니다. *sample_interval*은 aggr_interval에 비례해 잡고 기본 권장 비율은 1/20입니다. sample_interval을 줄이면 해상도는 그대로인데 *모니터링 오버헤드만 늘어납니다*.

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

`Local Weight`는 sample의 weight(load latency)입니다. perf는 data source의 memory level로 `CXL`을 따로 표시할 수 있으므로(`PERF_MEM_LVLNUM_CXL`), PMU가 그 level을 보고하는 플랫폼에서는 `Memory access` 열에서 CXL 비중을 볼 수 있습니다.

## numastat — NUMA 노드별 통계

CXL은 *별도 NUMA 노드*로 등록되어 numastat이 자연스럽게 통합 분석을 제공합니다.

```bash
# 노드별 메모리 사용 (meminfo 형식)
$ numastat -m

# 프로세스별 노드 사용
$ numastat -p <pid>

# 노드별 hit/miss 카운터 (/sys/devices/system/node/node*/numastat)
$ numastat
```

커널 문서(`admin-guide/numastat.rst`)의 정의로 읽습니다. *numa_miss*는 다른 노드를 원했지만 *이 노드*에서 메모리를 받은 횟수입니다. CXL 노드의 numa_miss가 크면 local 노드가 모자라 CXL 노드로 넘친 할당이 많다는 뜻입니다.

## bpftrace — CXL 드라이버 동적 트레이싱

CXL 드라이버 내부 호출을 동적으로 캡처:

```bash
# CXL mailbox 명령 추적 — opcode별 횟수 (cxl_core의 cxl_internal_send_cmd)
$ bpftrace -e '
  fentry:cxl_core:cxl_internal_send_cmd {
    @cmds[args->mbox_cmd->opcode] = count();
  }
  interval:s:5 {
    print(@cmds);
    clear(@cmds);
  }
'

# Page migration 추적 (DAMON 동작 검증) — reason별 성공 페이지 수
$ bpftrace -e '
  tracepoint:migrate:mm_migrate_pages {
    @migrated[args->reason] = sum(args->succeeded);
  }
'

# CXL event 인터럽트 빈도 (cxl_pci의 event IRQ thread)
$ bpftrace -e '
  kprobe:cxl_event_thread {
    @[probe] = count();
  }
'
```

opcode는 `drivers/cxl/cxlmem.h`의 값으로 읽습니다. 예를 들어 Get Event Records 0100h, Identify 4000h, Get LSA 4102h, Set LSA 4103h, Get Health Info 4200h, Get Poison List 4300h입니다. `cxl_internal_send_cmd`는 커널 내부 경로만 거치고, `cxl_pci`의 `cxl_pci_mbox_send`가 실제 doorbell을 울립니다.

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

`cxl list`는 기본으로 *활성 객체만* 보여 줍니다. enable되지 않았거나 크기가 0인 객체는 `-i`(`--idle`)를 붙여야 나옵니다(ndctl `cxl-list`). 이걸 빠뜨리면 disable된 memdev·region을 없는 것으로 착각합니다.

> ⚠️ DAMON `sample_interval`만 줄이기

sample_interval을 줄여도 해상도는 그대로이고 *오버헤드만 늘어납니다*. 해상도가 모자라면 aggr_interval을 워크로드에 맞게 늘리고 sample_interval을 그 1/20로 맞춥니다(커널 DAMON 설계 문서).

> ⚠️ `perf mem`로 throughput 측정

`perf mem`은 *sampling*입니다. *실제 throughput*은 못 봅니다. throughput은 *STREAM·mlc*가 맞고, perf mem은 *어디서 latency가 나오는지* 분포 분석에 씁니다.

> ⚠️ numastat의 `numa_foreign` 항목 무시

`numa_foreign`은 *이 노드에서 할당받기를 원했지만 다른 노드에서 받은* 횟수로, 선호 노드 쪽에 쌓입니다. local 노드의 numa_foreign과 CXL 노드의 numa_miss를 함께 보면 어느 노드에서 어디로 넘쳤는지 알 수 있습니다.

## 정리

- CXL 성능 분석은 *cxl-cli·DAMON·perf-mem·numastat·bpftrace 5개 도구*가 *서로 다른 층*을 봅니다.
- *cxl-cli*는 *토폴로지와 region 관리*, *DAMON*은 *page 활동*, *perf-mem*은 *CPU access 분포*, *numastat*은 *NUMA 통계*, *bpftrace*는 *드라이버 동적 추적*입니다.
- 워크플로 권장: *토폴로지 → NUMA → 워크로드 시작 → access 분포 → tier 동작 → RAS*의 6단계 순.
- DAMON은 *aggr_interval*을 워크로드에 맞춰 잡고 *sample_interval*을 그 1/20로 둡니다. 기본값은 5 ms / 100 ms입니다.
- `perf mem`은 *분포 분석 전용*, throughput은 *STREAM·mlc*가 정답입니다.

다음 편은 **Ch 56: 실전 사례 — CXL.mem 추가로 LLM inference KV cache 처리량 회복**입니다. Ch 8(HBM)에서 본 LLaMA 70B 메모리 문제의 *해결편 case study*입니다.

## 관련 항목

- [Ch 40: Linux perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [Ch 43: eBPF·bpftrace 동적 트레이싱](/blog/embedded/performance-engineering/part5-04-ebpf)
- [Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
