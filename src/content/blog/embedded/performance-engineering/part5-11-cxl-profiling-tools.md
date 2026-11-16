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

> **"CXL 성능 도구는 *서로 다른 층*을 봅니다."** cxl-cli는 토폴로지와 디바이스 상태, DAMON은 메모리 region의 접근 빈도, perf-mem은 CPU가 샘플링한 메모리 접근, numastat은 NUMA 노드별 할당 통계를 봅니다. 하나로 다 풀리지 않으니 조합해서 씁니다.

[3-12](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)가 지연·대역폭을 *어떻게 재는지* 다뤘다면, 이 장은 각 도구가 *무엇을 보여 주고 어디서 실패하는지*를 실제 출력으로 확인합니다. 환경은 두 가지입니다.

| 환경 | 구성 | 이 장에서 쓴 곳 |
|---|---|---|
| CXL VM | QEMU 11.1.3 TCG, `-M virt,cxl=on` + `cxl-type3` volatile 256 MiB, Debian 13 arm64 커널 6.12.116, ndctl 81 | cxl-cli, CXL tracepoint, numastat |
| 측정 VM | QEMU 11.1.3 HVF, 8 vCPU, 같은 커널, perf 6.12.117, bpftrace 0.23.2, damo 3.4.5 | DAMON, perf-mem |

두 VM 모두 Apple M2 Pro 호스트 위에서 돌렸습니다. 실제 CXL 하드웨어는 쓰지 않았습니다.

## 어떤 문제를 푸는가

CXL 성능 분석에는 기존 메모리 분석에 없던 층이 하나 더 생깁니다. 장치가 제대로 붙었는지부터 확인해야 하고, 그다음에야 메모리가 어디에 할당되고 얼마나 자주 쓰이는지를 볼 수 있습니다. 병원에 비유하면 X-ray(토폴로지), 혈액 검사(할당 통계), 활동량 측정기(접근 빈도)가 각각 다른 질문에 답하는 것과 같습니다.

| 층 | 도구 | 보는 것 |
|---|------|------|
| 디바이스·토폴로지 | cxl-cli | 어떤 장치가 어디 붙었나, decoder·region 구성 |
| 접근 빈도 | DAMON·damo | region별 `nr_accesses`와 age |
| CPU 메모리 샘플 | perf mem·perf c2c | load/store의 data source와 latency |
| NUMA 통계 | numastat·numactl | 노드별 사용량·할당 카운터 |
| 커널 이벤트 | tracefs·bpftrace | CXL 드라이버 tracepoint |

## cxl-cli — 토폴로지와 region 관리

cxl-cli는 ndctl 패키지에 들어 있는 CXL 서브시스템 CLI입니다. ndctl 81의 `cxl --list-cmds`가 보여 준 명령은 `list`, `create-region`, `enable-region`, `disable-region`, `destroy-region`, `set-partition`, `update-firmware`, `monitor` 등 22개입니다.

CXL VM에서 decoder와 target을 보면 다음과 같습니다. `-T`는 decoder 목록에 하위 포트 target을 붙이고, `-u`(`--human`)는 일부 필드를 사람이 읽기 쉬운 문자열로 바꿉니다(ndctl 81 `cxl-list.txt`). 아래 출력은 필드 일부를 생략했습니다.

```text
# cxl list -DT -u -d decoder0.0
{
  "decoder":"decoder0.0",
  "resource":"0x10000000000",
  "size":"4.00 GiB (4.29 GB)",
  "interleave_ways":1,
  "volatile_capable":true,
  "nr_targets":1,
  "targets":[
    { "target":"pci0000:0c", "alias":"ACPI0016:00", "position":0, "id":"0xc" }
  ]
}
# cxl list -E -u
{ "endpoint":"endpoint2", "host":"mem0", "parent_dport":"0000:0c:00.0",
  "depth":2, "decoders_committed":0 }
```

`decoders_committed: 0`이 중요한 신호입니다. 장치는 보이지만 아직 어떤 decoder도 commit되지 않아 메모리로 쓸 수 없는 상태입니다. 여기서 region을 만들면 다음처럼 실패했습니다.

```text
# cxl create-region -m -d decoder0.0 -w 1 -t ram -s 256M mem0
cxl region: create_region: region0: failed to commit decode: No such device or address
cxl region: cmd_create_region: created 0 regions
```

dmesg에는 `cxl region0: Failed to synchronize CPU cache state`와 `drivers/cxl/core/region.c:235`의 WARNING이 남았습니다. v6.12에서 이 경로는 CPU가 메모리 범위 캐시 무효화를 지원해야 통과하고, 그 기능(`ARCH_HAS_CPU_CACHE_INVALIDATE_MEMREGION`)을 켜는 아키텍처는 x86뿐입니다. 자세한 추적은 [3-11](/blog/embedded/performance-engineering/part3-11-cxl-interconnect)에 있습니다. 실패한 뒤 `cxl list -R -u`와 `cxl list -i -R -u`는 둘 다 아무것도 출력하지 않았습니다. 실패한 region이 남아 있지 않다는 뜻입니다.

interleave granularity를 주는 `-g`는 커널이 받는 범위 안에서 골라야 합니다. v6.12 `drivers/cxl/cxl.h:108-115`의 `granularity_to_eig()`는 256 B(`CXL_DECODER_MIN_GRANULARITY`, 72행)부터 16 KiB까지의 2의 거듭제곱만 받고, 나머지는 `-EINVAL`로 거부합니다. interleave ways도 `ways_to_eiw()`가 16을 넘으면 거부합니다.

## DAMON — region 단위 접근 추적

DAMON은 모든 page를 보지 않습니다. v6.12 `Documentation/mm/damon/design.rst`의 "Region Based Sampling"에 따르면, 인접 page를 region으로 묶고 `sampling interval`마다 region별로 page 하나를 무작위로 골라 접근 여부를 봅니다. 그 결과를 `aggregation interval` 동안 모은 것이 region의 `nr_accesses`입니다. 그래서 region 수가 overhead와 분해능을 함께 정합니다.

커널 sysfs 인터페이스(`admin-guide/mm/damon/usage.rst`)에서 kdamond의 `state` 파일은 읽으면 `on`/`off`를 돌려주고, `on`·`off` 등을 써서 제어합니다. 다만 대상·operations·interval을 모두 sysfs에 써야 하므로, 같은 문서가 소개하는 사용자 공간 도구 [damo](https://github.com/damonitor/damo)를 쓰는 편이 간단합니다. 측정 VM에서 damo 3.4.5의 기본값은 다음과 같았습니다(`damo args damon --format json`).

| 파라미터 | 의미 (design.rst) | damo 3.4.5 기본값 |
|---------|------|------|
| `sample_us` | 접근 여부를 확인하는 주기 | 5 ms |
| `aggr_us` | 확인 결과를 모아 보고하는 주기 | 100 ms |
| `ops_update_us` | 대상 주소 범위를 갱신하는 주기 | 1 s |
| `nr_regions` min / max | region 수의 하한·상한 | 10 / 1,000 |

`sample 5 ms, aggr 100 ms`이므로 한 aggregation에서 셀 수 있는 최대 빈도는 200 Hz입니다. 실제로 64 MiB hot 영역과 448 MiB cold 영역을 가진 프로그램을 기록하자, hot 영역이 64 MiB짜리 region 하나로 200 Hz에, cold 영역이 450 MiB에 걸친 region 4개로 0 Hz에 잡혔습니다(전체 기록과 명령은 3-12에 있습니다).

```bash
damo record -o damon.data <pid>
damo report access -i damon.data --style temperature-sz-hist
```

DAMOS로 행동을 붙일 수도 있습니다. v6.12 `design.rst`:347-349는 `migrate_hot`을 "Migrate the regions prioritizing warmer regions", `migrate_cold`를 "prioritizing colder regions"로 정의하고, `usage.rst`:301-302는 `target_nid`가 이 두 action에서만 의미가 있다고 적습니다. CXL 노드를 `target_nid`로 주면 cold region을 그쪽으로 내리는 정책이 됩니다.

## perf-mem — CPU의 메모리 접근 분포

`perf mem`은 PMU가 기록한 메모리 샘플(주소, data source, latency)을 모읍니다. 어떤 PMU를 쓰는지는 아키텍처마다 다릅니다. v6.12 `tools/perf/arch/arm64/util/mem-events.c`는 `spe-load`·`spe-store`·`spe-ldst` 이벤트, 곧 Arm SPE(Statistical Profiling Extension)를 씁니다. SPE가 없는 측정 VM에서는 두 명령 모두 바로 실패했습니다.

```text
# perf mem record -o pm.data -- ./hotcold 2
failed: no PMU supports the memory events
# perf c2c record -o c2c.data -- true
failed: no PMU supports the memory events
```

이 메시지는 `builtin-mem.c:87`과 `builtin-c2c.c:3260`에서 나옵니다. SPE가 있는 보드에서 쓰는 명령은 다음과 같습니다.

```bash
perf mem record -- ./workload
perf mem report --sort=mem,symbol
```

CXL에서 읽은 샘플을 따로 표시할 수 있는지도 PMU에 달려 있습니다. uapi에는 `PERF_MEM_LVLNUM_CXL`(0x09, `include/uapi/linux/perf_event.h:1356`)이 있고 perf는 이를 `"CXL"`로 출력합니다(`tools/perf/util/mem-events.c:370`). 그런데 v6.12의 `arch/`와 `drivers/`에서 이 값을 채우는 코드는 AMD Zen4 IBS 하나였습니다(`arch/x86/events/amd/ibs.c:756`, `IBS_DATA_SRC_EXT_EXT_MEM` → `LN(CXL)`). 다른 PMU에서는 CXL 샘플이 일반 RAM이나 원격 메모리로 찍힐 수 있으니, 주소를 region 범위와 대조해야 합니다.

장치 쪽 카운터는 별도 PMU입니다. `Documentation/admin-guide/perf/cxl.rst`의 CPMU 드라이버는 `cxl_pmu_mem<X>.<Y>`로 등록되고 `d2h_req_rdshared`, `h2d_req_snpinv` 같은 프로토콜 메시지를 셉니다. 문서는 "The driver does not support sampling so "perf record" is unsupported"이며 system-wide counting만 된다고 적습니다. 이 글의 Debian 커널은 `CONFIG_CXL_PMU`가 꺼져 있었습니다.

## numastat — NUMA 노드별 통계

CXL 메모리가 System RAM으로 올라와 별도 노드가 되면, numastat으로 노드별 할당을 볼 수 있습니다. 카운터의 뜻은 v6.12 `Documentation/admin-guide/numastat.rst`가 정합니다.

| 카운터 | 정의 (numastat.rst) |
|---|---|
| `numa_hit` | 이 노드에서 할당하려 했고 성공 |
| `numa_miss` | 다른 노드를 원했지만 이 노드에서 받음 |
| `numa_foreign` | 이 노드를 원했지만 다른 노드에서 받음 |
| `local_node` | 이 노드의 CPU에서 돌다가 이 노드에서 받음 |
| `other_node` | 다른 노드의 CPU에서 돌다가 이 노드에서 받음 |

같은 문서는 실패 시 `numa_foreign`은 *선호 노드*에, `numa_miss`는 *실제로 할당된 노드*에 올라간다고 적습니다. CXL VM은 region을 만들지 못해 노드가 하나뿐이었고, 출력도 그대로였습니다.

```text
# numastat
                           node0
numa_hit                  537413
numa_miss                      0
numa_foreign                   0
interleave_hit               981
local_node                537413
other_node                     0
```

카운터는 부팅 이후 누적값이므로, 측정 전후 두 번 찍어 차이를 봐야 그 구간의 할당을 말할 수 있습니다.

## bpftrace — CXL 드라이버 이벤트

CXL 드라이버는 tracepoint를 제공합니다. 측정 VM의 bpftrace 0.23.2로 목록을 보면 8개가 나왔습니다. CXL VM의 `/sys/kernel/tracing/events/cxl/`에도 같은 8개가 있었습니다.

```text
# bpftrace -l 'tracepoint:cxl:*'
tracepoint:cxl:cxl_aer_correctable_error
tracepoint:cxl:cxl_aer_uncorrectable_error
tracepoint:cxl:cxl_dram
tracepoint:cxl:cxl_general_media
tracepoint:cxl:cxl_generic_event
tracepoint:cxl:cxl_memory_module
tracepoint:cxl:cxl_overflow
tracepoint:cxl:cxl_poison
```

이름에서 보이듯 이 tracepoint들은 성능 이벤트가 아니라 오류·이벤트 레코드(AER, media error, poison)용입니다. 필드는 `format` 파일로 확인합니다. CXL VM에서 `cxl_general_media`의 첫 고유 필드는 `memdev`, `host`, `log`, `hdr_uuid`였습니다.

```bash
cat /sys/kernel/tracing/events/cxl/cxl_general_media/format
bpftrace -e 'tracepoint:cxl:cxl_poison { printf("%s\n", str(args->memdev)); }'
```

`cxl_poison`의 `memdev`·`host` 필드는 v6.12 `drivers/cxl/core/trace.h:690-692`의 `__string(memdev, ...)`, `__string(host, ...)`에서 옵니다. 이 글에서는 poison 이벤트를 일으키지 않아 두 번째 줄의 실행 결과는 없습니다.

## 정상·실패·미지원 결과를 구분

도구가 아무것도 출력하지 않을 때, 그것이 "문제없음"인지 "측정 불가"인지 가려야 합니다. 이 장에서 실제로 본 경우를 모으면 다음과 같습니다.

| 관찰 | 이 장에서 본 원인 | 확인 방법 |
|------|------|------|
| `cxl list -R`이 비어 있음 | region commit이 `ENXIO`로 실패해 region이 남지 않음 | `cxl list -E`의 `decoders_committed`, dmesg |
| `numactl -H`에 노드가 하나 | region이 없어 CXL 메모리가 System RAM으로 안 올라옴 | `cxl list -R`, `/sys/devices/system/node/` |
| `perf mem`이 즉시 실패 | SPE 없음 (`no PMU supports the memory events`) | `ls /sys/bus/event_source/devices/` |
| CPMU 이벤트가 `perf list`에 없음 | `CONFIG_CXL_PMU` 꺼짐 | `/boot/config-$(uname -r)` |

## 도구 조합 — 실전 워크플로

위 실패 조건을 순서대로 걸러 내면 다음 흐름이 됩니다. 앞 단계가 실패하면 뒤 단계의 결과는 의미가 없습니다.

| 단계 | 도구 | 묻는 질문 |
|------|------|----------|
| 1. 토폴로지 | `cxl list -M -D -E -u` | 장치와 decoder가 보이고 commit되었나 |
| 2. region | `cxl list -R -u` | region이 있고 메모리로 올라왔나 |
| 3. NUMA 등록 | `numactl -H`, memory tier sysfs | CXL 노드가 별도 노드·tier로 보이나 |
| 4. 접근 빈도 | `damo record` / `damo report access` | cold region이 얼마나 되나 |
| 5. CPU 샘플 | `perf mem record` (SPE·IBS가 있을 때) | 어떤 코드가 느린 메모리를 읽나 |
| 6. 할당·이동 | `numastat` 전후 차이 | 정책대로 할당·이동되었나 |
| 7. 오류 이벤트 | `cxl monitor`, `tracepoint:cxl:*` | 장치에 오류 레코드가 없나 |

## 자주 보는 함정과 안티패턴

> ⚠️ `cxl list`만 보고 토폴로지 단정

ndctl 81 `cxl-list.txt`는 `-i`(`--idle`)를 "Include idle (not enabled / zero-sized) devices in the listing"으로 설명합니다. 기본 출력에는 enable되지 않은 객체가 빠지니, 없는 줄 알았던 장치가 실은 disable 상태일 수 있습니다.

> ⚠️ DAMON `sample_us`만 줄이기

design.rst의 region 기반 샘플링에서는 region마다 page 하나만 봅니다. `sample_us`를 줄이면 확인 횟수가 늘어 overhead가 커지지만, region이 크면 같은 region 안의 hot/cold는 여전히 구분되지 않습니다. 분해능이 부족하면 `nr_regions` 상한도 함께 봅니다.

> ⚠️ `perf mem`으로 throughput 측정

`perf mem`은 샘플링입니다. 일부 접근만 기록하므로 총 전송량을 말해 주지 않습니다. throughput은 STREAM처럼 처리량을 직접 재는 벤치마크로 보고, perf mem은 어떤 코드가 어느 메모리에서 기다리는지를 보는 데 씁니다.

> ⚠️ numastat 카운터로 이동량 추정

numastat.rst의 카운터는 *할당 횟수*입니다. 어느 노드에서 어디로 몇 byte가 옮겨졌는지는 이 값으로 복원할 수 없습니다.

## 정리

- cxl-cli는 장치·decoder·region을 봅니다. `decoders_committed: 0`이면 아직 메모리로 쓸 수 없습니다.
- QEMU CXL + Linux 6.12 arm64에서는 region commit이 `ENXIO`로 실패해, 그 뒤 단계(NUMA 노드, numastat 비교)가 성립하지 않았습니다.
- DAMON은 region 기반 샘플링입니다. damo 3.4.5 기본값은 5 ms / 100 ms / 10~1,000 regions이고, hot·cold 영역을 200 Hz와 0 Hz로 갈랐습니다.
- arm64의 `perf mem`은 SPE가 필요하고, v6.12에서 샘플에 CXL 레벨을 붙이는 PMU 코드는 AMD Zen4 IBS뿐이었습니다. 장치 쪽 CPMU는 counting만 됩니다.
- CXL tracepoint 8개는 오류·이벤트 레코드용입니다.

다음 편은 [6-05: CXL.mem·LLM KV cache 설계 시나리오](/blog/embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache)입니다.

## 관련 항목

- [5-01: Linux perf 기초](/blog/embedded/performance-engineering/part5-01-perf-basics)
- [5-04: eBPF·bpftrace 동적 트레이싱](/blog/embedded/performance-engineering/part5-04-ebpf)
- [3-12: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
