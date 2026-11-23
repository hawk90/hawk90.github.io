---
title: "Tiered Memory 진단 — DAMON·DAMOS·Promotion/Demotion 디버깅"
slug: "tools/debugging/memory/chapter07-tiered-memory-diagnostics"
date: 2026-06-18T09:06:00
description: "QEMU CXL 노드를 하위 tier로 둔 x86 게스트에서 memory tier 구성, memory.reclaim demotion, NUMA balancing promotion, DAMOS migrate_cold를 직접 돌리고 vmstat·tracepoint·bpftrace로 이동을 추적합니다."
series: "Memory Diagnostics"
seriesOrder: 7
tags: [tiered-memory, damon, damos, cxl, promotion, demotion]
draft: false
topics: ["tools", "tools/debugging"]
---

[Ch 6](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)에서 CXL 메모리를 CPU 없는 NUMA 노드 1로 올렸습니다. 노드가 둘이 되면 질문이 바뀝니다. "얼마나 쓰나"가 아니라 "어떤 페이지가 어느 층에 있어야 하나"입니다. 자주 쓰는 페이지는 빠른 DRAM에, 오래 안 쓴 페이지는 느린 CXL에 두는 것이 계층 메모리(tiered memory)의 목표이고, 커널에는 그 일을 하는 경로가 셋 있습니다. 회수 때 내려보내는 demotion, NUMA balancing의 promotion, 그리고 DAMON 기반 DAMOS입니다.

이 장은 Ch 6과 같은 게스트에서 세 경로를 모두 실제로 움직여 봅니다. **출력은 모두 QEMU 11.1.3 에뮬레이션**(x86_64 q35, TCG, Debian 12.15 + `6.12.95+deb12-amd64`)에서 나왔습니다. QEMU의 노드 1은 DRAM과 속도가 같으므로, 여기서 보는 것은 커널이 페이지를 *옮기는 동작*이지 성능 이득이 아닙니다.

:::tldr
tier는 `/sys/devices/virtual/memory_tiering/memory_tierN/nodelist`로 보고, 이동은 `/proc/vmstat`의 `pgdemote_*`·`pgpromote_*`·`pgmigrate_*`와 `migrate:mm_migrate_pages` tracepoint의 `reason`으로 가립니다. demotion은 `demotion_enabled`가 기본 false라 켜야 하고, DAMOS는 `paddr` 감시 범위와 `access_pattern`의 `max`를 채우지 않으면 아무것도 하지 않습니다.
:::

## memory tier — 커널이 정한 층

엘리베이터 없는 2층 창고를 떠올리면 됩니다. 1층(tier4)에는 자주 꺼내는 물건, 2층(tier22)에는 계절 지난 물건을 둡니다. 물건을 옮기는 일꾼이 셋 있는데, 각자 기준과 출근 조건이 다릅니다.

먼저 커널이 두 노드를 어떻게 나눴는지 봅니다.

```text
$ ls /sys/devices/virtual/memory_tiering/
memory_tier22
memory_tier4
power
uevent
/sys/devices/virtual/memory_tiering/memory_tier22/nodelist: 1
/sys/devices/virtual/memory_tiering/memory_tier4/nodelist: 0
```

v6.12의 ABI 문서(`Documentation/ABI/testing/sysfs-kernel-mm-memory-tiers`)는 디렉터리 이름의 N이 abstract distance에서 나오고, N이 작을수록 빠른 층이라고 적습니다. 숫자 4와 22는 계산으로 나옵니다. `mm/memory-tiers.c`(242행)는 tier 번호를 abstract distance를 `MEMTIER_CHUNK_BITS`(7, `include/linux/memory-tiers.h` 13행)만큼 오른쪽으로 민 값으로 정합니다. DRAM은 `MEMTIER_ADISTANCE_DRAM`(같은 헤더 21행) = 4 × 128 + 64 = 576이라 576 >> 7 = 4이고, dax kmem 메모리의 기본값 `MEMTIER_DEFAULT_DAX_ADISTANCE`(`drivers/dax/kmem.c` 24행)는 그 다섯 배인 2880이라 2880 >> 7 = 22입니다. `drivers/dax/kmem.c`(77행)는 이 기본값에서 출발하고, 성능 정보가 있으면 `mt_calc_adistance()`(92행)로 값을 고칩니다. 이 게스트의 노드 1이 tier22에 들어간 것은 기본값 2880과 일치합니다.

region을 만들 때 커널 로그에 남은 demotion 경로도 같은 구조를 말합니다.

```text
[   35.910047] Demotion targets for Node 0: preferred: 1, fallback: 1
[   35.910366] Demotion targets for Node 1: null
```

## demotion — 회수 때 아래층으로

첫 번째 일꾼은 회수(reclaim)입니다. 메모리가 부족해 페이지를 비워야 할 때, swap으로 내보내는 대신 아래 tier로 옮길 수 있습니다. ABI 문서 `sysfs-kernel-mm-numa`에 따르면 `/sys/kernel/mm/numa/demotion_enabled`는 회수 중 페이지 이동을 켜고 끄며, 이동은 swap보다 먼저 일어납니다. 할당한 프로세스의 cpuset 밖 노드로 옮길 수도 있어서, 문서는 cpuset 보장이 엄격해야 하는 시스템에서는 켜지 말라고 적습니다. 이 게스트의 기본값은 꺼져 있었습니다.

```text
$ cat /sys/kernel/mm/numa/demotion_enabled
false
$ echo 1 > /sys/kernel/mm/numa/demotion_enabled
true
```

메모리 압박을 기다리지 않고 회수를 일으키는 방법이 cgroup v2의 `memory.reclaim`입니다. 600 MiB를 잡고 가만히 있는 `tier` 프로그램을 systemd 유닛(`tierA`)으로 띄우고, 그 cgroup에 300M 회수를 요청했습니다.

```c
/* tier.c: ./tier <MiB> — touch <MiB> of anonymous memory, then keep it.
 * While /tmp/hot exists, re-read every page once per second (makes it hot). */
int main(int argc, char **argv) {
    size_t mib = argc > 1 ? strtoul(argv[1], NULL, 10) : 256;
    size_t len = mib << 20;
    volatile char *buf = malloc(len);
    memset((char *)buf, 1, len);
    ...
    for (;;) {
        if (access("/tmp/hot", F_OK) == 0) {
            unsigned long sum = 0;
            for (size_t i = 0; i < len; i += 4096) sum += buf[i];
            (void)sum;
        }
        sleep(1);
    }
}
```

```text
--- before reclaim
Total                      601.39            0.00          601.39
vmstat: ... pgdemote_kswapd 0 pgdemote_direct 0 pgdemote_khugepaged 0 ... pgmigrate_success 0 pgmigrate_fail 0
$ echo 300M > memory.reclaim
exit=0
--- after reclaim
Total                      301.05          300.34          601.39
vmstat: ... pgdemote_kswapd 0 pgdemote_direct 76888 pgdemote_khugepaged 0 ... pgmigrate_success 76888 pgmigrate_fail 0
```

`numastat -p`의 노드별 합계(MB)가 601 : 0에서 301 : 300으로 바뀌었습니다. swap이 없는 게스트인데도 익명 페이지가 회수됐는데, 실제로는 노드 1로 옮겨진 것입니다. `pgdemote_direct`가 76,888페이지(300.3 MiB) 늘었고 `pgmigrate_success`도 같은 수만큼 늘었습니다. `memory.reclaim`이 일으킨 회수는 kswapd가 아니라 `memory.reclaim`에 쓴 프로세스의 문맥에서 돌기 때문에 `_direct` 쪽에 잡혔습니다.

### tracepoint로 이동 사유 보기

vmstat 카운터는 합계만 줍니다. 개별 이동은 `migrate:mm_migrate_pages` tracepoint가 남깁니다. 이 커널의 format 파일에 있는 필드는 다음과 같습니다.

```text
$ grep field: /sys/kernel/tracing/events/migrate/mm_migrate_pages/format | grep -v common_
	field:unsigned long succeeded;	offset:8;	size:8;	signed:0;
	field:unsigned long failed;	offset:16;	size:8;	signed:0;
	field:unsigned long thp_succeeded;	offset:24;	size:8;	signed:0;
	field:unsigned long thp_failed;	offset:32;	size:8;	signed:0;
	field:unsigned long thp_split;	offset:40;	size:8;	signed:0;
	field:unsigned long large_folio_split;	offset:48;	size:8;	signed:0;
	field:enum migrate_mode mode;	offset:56;	size:4;	signed:0;
	field:int reason;	offset:60;	size:4;	signed:1;
```

출발 노드와 도착 노드는 없습니다. 대신 `reason`이 어느 일꾼이 옮겼는지 알려 줍니다. v6.12 `include/trace/events/migrate.h`(16~26행)의 `MIGRATE_REASON` 목록은 `compaction`, `memory_failure`, `memory_hotplug`, `syscall_or_cpuset`, `mempolicy_mbind`, `numa_misplaced`, `contig_range`, `longterm_pin`, `demotion`, `damon` 순입니다. 위 회수 동안 trace에는 이런 줄이 151개 남았습니다.

```text
bash-643     [003] .....   384.670744: mm_migrate_pages: nr_succeeded=64 nr_failed=0 nr_thp_succeeded=0 nr_thp_failed=0 nr_thp_split=0 nr_split=0 mode=MIGRATE_ASYNC reason=demotion
bash-643     [003] .....   384.684357: mm_migrate_pages: nr_succeeded=536 nr_failed=0 nr_thp_succeeded=1 nr_thp_failed=0 nr_thp_split=0 nr_split=0 mode=MIGRATE_ASYNC reason=demotion
```

`bash`가 이동한 주체로 찍힌 것은 `echo`가 `memory.reclaim`에 쓴 그 셸의 문맥에서 회수가 돌았기 때문입니다. `nr_thp_succeeded=1`인 줄은 2 MiB THP 하나(512페이지)를 통째로 옮긴 경우입니다.

## promotion — NUMA balancing의 tiering 모드

두 번째 일꾼은 NUMA balancing입니다. v6.12 `Documentation/admin-guide/sysctl/kernel.rst`의 `numa_balancing` 항목은 값 0(끔), 1(`NUMA_BALANCING_NORMAL`), 2(`NUMA_BALANCING_MEMORY_TIERING`)를 정의합니다. 1은 원격 노드 접근을 줄이려고 페이지를 접근하는 CPU 쪽으로 옮기고, 2는 서로 다른 종류의 메모리 사이에서 뜨거운 페이지를 빠른 메모리에 두는 모드입니다. 둘 다 페이지를 주기적으로 unmap해 두고 다시 접근할 때의 fault로 접근을 알아냅니다. 문서는 이 unmap과 fault에 오버헤드가 있고, 워크로드가 이미 노드에 묶여 있으면 꺼야 한다고 적습니다.

위에서 절반이 내려간 `tierA`를 그대로 두고 tiering 모드를 켠 뒤, `/tmp/hot`을 만들어 프로그램이 매초 모든 페이지를 읽게 했습니다. 같은 문서가 정의하는 promotion 처리량 상한 `numa_balancing_promote_rate_limit_MBps`는 이 게스트에서 65536이었습니다.

```text
$ cat /proc/sys/kernel/numa_balancing_promote_rate_limit_MBps
65536
$ echo 2 > /proc/sys/kernel/numa_balancing
before: pgpromote_success 0 pgpromote_candidate 0 numa_hint_faults 0 numa_pages_migrated 0 pgmigrate_success 76888
Total                      301.05          300.34          601.39
t=20s pgpromote_success 42563 pgpromote_candidate 0 numa_hint_faults 264 numa_pages_migrated 42563 pgmigrate_success 119451
Total                      467.31          134.08          601.39
...
t=120s pgpromote_success 42565 pgpromote_candidate 2 numa_hint_faults 288 numa_pages_migrated 42565 pgmigrate_success 119453
Total                      467.32          134.07          601.39
```

첫 20초 안에 42,563페이지(약 166 MiB)가 노드 0으로 올라왔고, trace의 152줄은 모두 `reason=numa_misplaced`였습니다. 그런데 그 뒤 100초 동안은 2페이지만 더 올라왔고, 134 MB는 매초 읽히는데도 노드 1에 남았습니다. 이 실행에서 남은 페이지가 왜 더 올라오지 않았는지는 확인하지 못했습니다. 진단할 때는 "promotion을 켰다"를 "뜨거운 페이지가 모두 올라온다"로 읽으면 안 됩니다. 켠 뒤에는 `pgpromote_success`와 노드별 사용량이 실제로 어떻게 움직이는지 시간 축으로 봐야 합니다.

## DAMON — 접근 빈도를 재는 장치

세 번째 일꾼은 DAMON입니다. 앞의 두 경로가 회수나 fault 같은 "사건"을 계기로 움직인다면, DAMON은 계속 표본을 뽑아 영역별 접근 빈도를 잽니다. v6.12 `Documentation/mm/damon/design.rst`에 따르면 DAMON은 대상 주소 공간을 영역(region)으로 나누고, 영역 안에서는 접근 빈도가 비슷하다고 가정해 영역마다 페이지 하나만 표본으로 확인합니다. 그래서 비용은 페이지 수가 아니라 영역 수로 정해지고, 사용자는 최소·최대 영역 수로 비용과 정확도를 맞바꿉니다. 인접 영역의 빈도가 비슷하면 합치고, 다르면 나눕니다.

| 단계 | 하는 일 (design.rst) |
|------|----------------------|
| 표본 확인 | sampling interval마다 영역별 표본 페이지의 접근 여부 확인 |
| 집계 | aggregation interval마다 영역의 `nr_accesses`(그 구간의 접근 횟수)를 결과로 넘기고 0으로 초기화 |
| 영역 조정 | 빈도 차이가 작은 인접 영역은 합치고, 다시 무작위로 나눔 |

기본값은 `mm/damon/core.c`의 `damon_new_ctx()`(497~509행)에 있습니다. sampling interval 5 ms, aggregation interval 100 ms, operations update interval 60 s, 영역 수 최소 10·최대 1000입니다. 게스트의 sysfs에서 읽은 값도 같았습니다.

```text
$ cat .../contexts/0/operations .../intervals/{sample_us,aggr_us,update_us} .../nr_regions/{min,max}
paddr
5000
100000
60000000
10
1000
```

`nr_accesses`는 aggregation interval 하나 안의 횟수입니다. 기본값에서는 100 ms 동안 표본을 20번(100 / 5) 보므로 `nr_accesses`의 최댓값이 20입니다. "10초에 1번" 같은 기간 조건은 `nr_accesses`가 아니라 `age`(그 접근 패턴이 유지된 aggregation interval 수)로 씁니다.

## DAMOS — 측정 결과로 행동하기

DAMOS(DAMON-based Operation Schemes)는 DAMON 결과 중 조건(access pattern)에 맞는 영역에 행동(action)을 적용합니다. design.rst의 목록과 각 행동을 지원하는 operations set은 다음과 같습니다.

| action | 하는 일 | 지원 operations set |
|--------|---------|---------------------|
| `willneed` | `MADV_WILLNEED` | `vaddr`, `fvaddr` |
| `cold` | `MADV_COLD` | `vaddr`, `fvaddr` |
| `pageout` | 영역 회수 | `vaddr`, `fvaddr`, `paddr` |
| `hugepage` / `nohugepage` | `MADV_HUGEPAGE` / `MADV_NOHUGEPAGE` | `vaddr`, `fvaddr` |
| `lru_prio` / `lru_deprio` | LRU 우선순위 올림 / 내림 | `paddr` |
| `migrate_hot` | 따뜻한 영역 우선으로 이동 | `paddr` |
| `migrate_cold` | 차가운 영역 우선으로 이동 | `paddr` |
| `stat` | 통계만 셈 | 전부 |

`migrate_hot`·`migrate_cold`는 `paddr`에서만 동작합니다. 이동할 노드는 scheme 디렉터리의 `target_nid` 파일로 정하는데, `Documentation/admin-guide/mm/damon/usage.rst`는 이 파일이 두 migrate action일 때만 의미가 있다고 적습니다. 커널 소스의 `enum damos_action`(`include/linux/damon.h`, 119~131행)에도 `DAMOS_MIGRATE_HOT`·`DAMOS_MIGRATE_COLD`가 있습니다.

### migrate_cold로 CXL 노드에 내려보내기

이번에는 400 MiB를 잡고 가만히 있는 `tierB`를 띄우고(NUMA balancing은 다시 0), 노드 0의 System RAM 범위를 `paddr`로 감시하며 2초 넘게 접근이 없는 영역을 노드 1로 옮기는 scheme을 sysfs로 직접 만들었습니다. damo(3.4.6)도 설치돼 있었지만, 커널 인터페이스를 그대로 보이려고 쓰지 않았습니다.

```bash
K=/sys/kernel/mm/damon/admin/kdamonds
echo 1 > $K/nr_kdamonds
C=$K/0/contexts; echo 1 > $C/nr_contexts
echo paddr > $C/0/operations
echo 1 > $C/0/targets/nr_targets
echo 1 > $C/0/targets/0/regions/nr_regions
echo $((0x100000)) > $C/0/targets/0/regions/0/start     # node 0 System RAM
echo $((0x7ffdc000)) > $C/0/targets/0/regions/0/end
echo 1 > $C/0/schemes/nr_schemes
S=$C/0/schemes/0
echo migrate_cold > $S/action
echo 1 > $S/target_nid                                  # CXL node
echo 4096 > $S/access_pattern/sz/min
echo $((2**40)) > $S/access_pattern/sz/max
echo 0 > $S/access_pattern/nr_accesses/min
echo 0 > $S/access_pattern/nr_accesses/max
echo 20 > $S/access_pattern/age/min                     # 20 aggregation intervals = 2 s
echo 4294967295 > $S/access_pattern/age/max
echo $((64 << 20)) > $S/quotas/bytes                    # at most 64 MiB per reset interval
echo 1000 > $S/quotas/reset_interval_ms
echo none > $S/watermarks/metric
echo on > $K/0/state
```

10초마다 `update_schemes_stats`를 써서 통계를 새로 고치며 지켜봤습니다.

```text
t=10s nr_tried=9 sz_tried=536870912 nr_applied=9 sz_applied=286445568 qt_exceeds=7
Total                      315.00           86.49          401.49
t=20s nr_tried=17 sz_tried=939524096 nr_applied=16 sz_applied=494624768 qt_exceeds=13
Total                      128.55          272.93          401.49
t=30s nr_tried=30 sz_tried=1610612736 nr_applied=21 sz_applied=628842496 qt_exceeds=23
Total                       66.55          334.93          401.49
...
t=60s nr_tried=69 sz_tried=3556769792 nr_applied=40 sz_applied=718065664 qt_exceeds=52
Total                       48.00          353.49          401.49
```

1분 동안 `tierB`의 401 MB 중 353 MB가 노드 1로 내려갔습니다. `sz_applied`(718,065,664바이트, 약 685 MiB)가 `tierB`보다 큰 것은 감시 범위가 노드 0 전체라 `tierB` 밖의 페이지도 대상이 되기 때문입니다. `qt_exceeds`가 52번 오른 것은 1초에 64 MiB라는 quota에 자주 걸렸다는 뜻입니다. usage.rst는 quota를 `reset_interval_ms` 안에 action을 적용할 최대 바이트(`bytes`)와 시간(`ms`)으로 정의하고, 시간 quota는 내부에서 크기 quota로 바뀌어 둘 중 작은 쪽이 적용된다고 적습니다. trace에는 `reason=damon` 줄이 41개 남았고, 이동 주체는 `kdamond.0`이었습니다.

```text
kdamond.0-912     [000] .....   707.389666: mm_migrate_pages: nr_succeeded=502 nr_failed=0 ... mode=MIGRATE_ASYNC reason=damon
kdamond.0-912     [000] .....   708.357564: mm_migrate_pages: nr_succeeded=12361 nr_failed=4 ... mode=MIGRATE_ASYNC reason=damon
```

같은 구간에 `reason=compaction`도 47줄 있었습니다. 다른 사유의 이동도 같은 tracepoint에 섞여 나오므로, 사유별로 나눠 세야 합니다.

### 첫 판이 아무것도 하지 않은 이유

위 스크립트의 첫 판에는 감시 영역(`regions/nr_regions`·`start`·`end`)과 `sz/max`·`age/max`, quota 줄이 없었습니다. 그 상태로 1분을 돌렸더니 통계가 전부 0이었습니다.

```text
t=60s stats: nr_tried=0 sz_tried=0 nr_applied=0 sz_applied=0 qt_exceeds=0
```

scheme을 만든 직후의 값을 읽어 보니 원인이 보였습니다.

```text
sz/min=4096
sz/max=0
nr_accesses/min=0
nr_accesses/max=0
age/min=20
age/max=0
$ cat .../targets/0/regions/nr_regions
0
```

usage.rst에서 `min`과 `max`는 닫힌 구간입니다. `max`의 초기값이 0이라 `sz`는 [4096, 0], `age`는 [20, 0]이라는 빈 구간이 됐고, 어떤 영역도 조건에 맞을 수 없었습니다. 결함은 하나 더 있었습니다. usage.rst(248~249행)는 `fvaddr`·`paddr`에서는 감시 주소 범위를 사용자가 직접 정해야 한다고 적는데, 같은 시점에 target의 `regions/nr_regions`는 0이었습니다. 두 결함 중 어느 쪽이 통계 0을 만들었는지는 이 실행으로 가릴 수 없습니다. sysfs로 직접 만들 때는 `paddr` 감시 범위와 세 속성의 `min`·`max`를 모두 씁니다.

### watermarks

scheme에는 켜고 끄는 조건(watermarks)도 있습니다. usage.rst에 따르면 `metric`에 쓸 수 있는 값은 `none`(무시)과 `free_mem_rate`(시스템의 여유 메모리 비율, 천분율)이고, `interval_us` 간격으로 이 값을 확인해 `high`·`mid`·`low` 경계에 따라 scheme을 켜고 끕니다. 이 장의 실험은 `none`으로 항상 켜 뒀습니다. 운영에서는 여유 메모리가 넉넉할 때 굳이 페이지를 옮기지 않도록 `free_mem_rate`를 씁니다.

## bpftrace로 사유별 합계 보기

tracepoint 줄을 하나하나 보는 대신 bpftrace로 사유별 합계를 낼 수 있습니다. 위 format 파일의 필드 이름을 그대로 씁니다.

```text
tracepoint:migrate:mm_migrate_pages
{
    @succeeded[args->reason] = sum(args->succeeded);
    @failed[args->reason] = sum(args->failed);
}
```

bpftrace 0.17로 이 스크립트를 띄워 둔 채, 200 MiB를 잡은 `tierC`의 cgroup에 `150M` 회수를 요청했습니다. 이번에는 회수가 실패했습니다.

```text
$ echo 150M > /sys/fs/cgroup/system.slice/tierC.service/memory.reclaim
bash: line 13: echo: write error: Resource temporarily unavailable
reclaim exit=1
$ bpftrace output
Attaching 1 probe...

@failed[0]: 1
@failed[8]: 18118
@succeeded[0]: 2335
@succeeded[8]: 22562
```

bpftrace 0.17은 `reason`을 이름이 아니라 숫자로 찍었습니다. `MIGRATE_REASON` 목록의 순서로 0은 `compaction`, 8은 `demotion`입니다. demotion이 22,562페이지 성공하고 18,118페이지 실패했습니다. 실패 사유를 따로 기록하지는 않았지만, 직전 DAMOS 실험으로 `tierB`의 353 MB가 노드 1에 올라가 있었고, 회수 뒤 `numastat -m`의 노드 1 `MemFree`는 96.20 MB였습니다. v6.12 cgroup-v2.rst에 따르면 `memory.reclaim`은 요청보다 적게 회수하면 `-EAGAIN`을 돌려주고, 셸의 "Resource temporarily unavailable"이 그 `EAGAIN`입니다. 아래층이 차면 demotion은 실패하고, swap도 없는 이 게스트에서는 요청한 양을 채우지 못했습니다.

## 자주 만나는 함정

| 증상 | 원인과 확인 |
|------|-------------|
| 회수해도 `pgdemote_*`가 0 | `/sys/kernel/mm/numa/demotion_enabled`가 기본 false |
| `memory.reclaim`이 `EAGAIN` | 요청보다 적게 회수됨. 아래 tier가 찼는지 노드별 `MemFree` 확인 |
| DAMOS 통계가 전부 0 | `access_pattern`의 `max` 초기값 0, `paddr` 감시 범위 미설정. `regions/start`·`end`와 세 속성의 `min`·`max`를 모두 설정 |
| `migrate_cold`가 효과 없음 | `paddr`에서만 지원. `target_nid` 확인 |
| `qt_exceeds`가 계속 오름 | quota에 걸림. 의도한 이동 속도인지 `bytes`·`reset_interval_ms` 확인 |
| `nr_accesses` 조건이 기대와 다름 | `nr_accesses`는 aggregation interval 하나 안의 횟수. 기간 조건은 `age` |
| promotion을 켰는데 일부만 올라옴 | 이 게스트에서도 관찰됨. `pgpromote_success`와 노드별 사용량을 시간 축으로 기록 |
| tracepoint로 방향을 알 수 없음 | `mm_migrate_pages`에는 노드 정보가 없음. `reason`과 `numastat`을 함께 봄 |
| bpftrace가 사유를 숫자로 찍음 | `migrate.h`의 `MIGRATE_REASON` 순서로 해석 |

## 정리

- 이 장의 출력은 모두 QEMU 11.1.3 에뮬레이션에서 나왔고, 페이지 이동 동작을 보여 줄 뿐 성능 이득은 보여 주지 않습니다.
- tier 번호는 abstract distance >> 7입니다. DRAM은 576 → tier4, dax kmem 기본값은 2880 → tier22였습니다.
- demotion은 `demotion_enabled`를 켜야 하고, `memory.reclaim`으로 300 MiB가 노드 1로 내려갔습니다(`pgdemote_direct`, `reason=demotion`).
- `numa_balancing=2`는 첫 20초에 166 MiB를 올렸지만 남은 134 MB는 이후 100초 동안 그대로였습니다.
- DAMOS `migrate_cold`(`paddr` 전용)는 1분에 `tierB`의 353 MB를 노드 1로 옮겼습니다. sysfs로 만들 때는 `paddr` 감시 범위와 `access_pattern`의 `max`를 반드시 채웁니다.
- 이동은 vmstat의 `pgdemote_*`·`pgpromote_*`·`pgmigrate_*`와 tracepoint `reason`으로 경로별로 나눠 봅니다. 아래 tier가 차면 demotion이 실패합니다.

## 다음 장 예고

Memory Diagnostics 시리즈의 CXL 쪽은 여기서 마무리합니다. 장치가 죽은 뒤의 분석은 [Postmortem Debugging Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)의 CXL 디바이스 core dump와 Ch 6의 fabric 장애 분석으로 이어집니다.

## 관련 항목

- [Ch 1: 리눅스 메모리 회계 — RSS·VSS·PSS·smaps 해석](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Embedded Performance Engineering Ch 55: CXL 성능 프로파일링 도구](/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)

## 공식 자료

- [Linux v6.12 `Documentation/mm/damon/design.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/mm/damon/design.rst) — 영역 기반 표본, DAMOS action
- [Linux v6.12 `Documentation/admin-guide/mm/damon/usage.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/mm/damon/usage.rst) — sysfs, `target_nid`, quotas, watermarks
- [Linux v6.12 `Documentation/admin-guide/sysctl/kernel.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/admin-guide/sysctl/kernel.rst) — `numa_balancing`, promote rate limit
- [Linux v6.12 `Documentation/ABI/testing/sysfs-kernel-mm-memory-tiers`](https://github.com/torvalds/linux/blob/v6.12/Documentation/ABI/testing/sysfs-kernel-mm-memory-tiers)
- [Linux v6.12 `Documentation/ABI/testing/sysfs-kernel-mm-numa`](https://github.com/torvalds/linux/blob/v6.12/Documentation/ABI/testing/sysfs-kernel-mm-numa) — `demotion_enabled`
- [Linux v6.12 `include/linux/memory-tiers.h`](https://github.com/torvalds/linux/blob/v6.12/include/linux/memory-tiers.h) — `MEMTIER_CHUNK_BITS`, `MEMTIER_ADISTANCE_DRAM`
- [Linux v6.12 `drivers/dax/kmem.c`](https://github.com/torvalds/linux/blob/v6.12/drivers/dax/kmem.c) — `MEMTIER_DEFAULT_DAX_ADISTANCE`, `mt_calc_adistance()` 호출
- [Linux v6.12 `include/trace/events/migrate.h`](https://github.com/torvalds/linux/blob/v6.12/include/trace/events/migrate.h) — `mm_migrate_pages`, `MIGRATE_REASON`
