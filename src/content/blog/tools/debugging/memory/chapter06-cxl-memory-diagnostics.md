---
title: "CXL 메모리 진단 — RAS·Poison List·Media Error 추적"
slug: "tools/debugging/memory/chapter06-cxl-memory-diagnostics"
date: 2026-06-18T09:05:00
description: "QEMU로 에뮬레이션한 CXL Type 3 메모리를 x86_64 Debian 12 게스트에서 region·dax·NUMA 노드로 올리고, cxl list의 health·poison list와 cxl monitor의 event를 실제 출력으로 읽습니다."
series: "Memory Diagnostics"
seriesOrder: 6
tags: [cxl, memory-diagnostics, ras, poison, numa, cxl-cli]
draft: false
topics: ["tools", "tools/debugging"]
---

앞 다섯 장은 프로세스 안쪽을 봤습니다. CXL 메모리는 한 단계 바깥에 있습니다. 운영체제 입장에서는 CPU가 없는 별도 NUMA 노드로 보이는 RAM이고, 동시에 자기 상태와 오류를 보고하는 장치이기도 합니다. 그래서 진단도 두 갈래가 됩니다. 메모리로서는 "어느 노드에 얼마나 올라가 있나"를 보고, 장치로서는 "health·poison·event가 무엇을 말하나"를 봅니다.

실제 CXL 장치가 없어도 QEMU의 CXL Type 3 에뮬레이션으로 이 경로를 끝까지 따라갈 수 있습니다. 이 장의 출력은 **모두 QEMU 에뮬레이션**에서 나왔습니다. 장치가 내는 값(health, 지연, 대역폭)은 실제 제품과 무관하고, 커널과 도구가 장치를 어떻게 다루는지만 실제입니다.

:::tldr
`cxl create-region`으로 region을 만들면 dax 장치가 `system-ram` 모드로 올라와 CPU 없는 NUMA 노드가 생깁니다. `cxl list -L`은 poison 목록을, `cxl monitor`는 event를 JSON으로 보여 줍니다. QEMU 11.1.3은 Get Health Info를 구현하지 않아 `cxl list -H`에 health 필드가 나오지 않습니다.
:::

## 실험 환경 — QEMU x86_64 q35 + CXL Type 3

host는 Apple Silicon Mac의 Homebrew QEMU 11.1.3이고, 게스트는 Debian 12.15 amd64 nocloud 이미지에 bookworm-backports 커널 `6.12.95+deb12-amd64`를 올렸습니다. x86 게스트라 TCG(소프트웨어 에뮬레이션)로 돌렸습니다. Debian 12의 ndctl 패키지는 76.1이라, 블로그의 [CXL 시리즈](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)와 맞추려고 ndctl v81을 소스에서 빌드해 `cxl`·`daxctl` 81을 썼습니다.

```bash
qemu-system-x86_64 -M q35,cxl=on -accel tcg -cpu max,-hypervisor -smp 4 \
  -m 2G,maxmem=8G,slots=8 \
  ... \
  -object memory-backend-ram,id=vmem0,share=on,size=512M \
  -device pxb-cxl,bus_nr=12,bus=pcie.0,id=cxl.1 \
  -device cxl-rp,port=0,bus=cxl.1,id=root_port13,chassis=0,slot=2 \
  -device cxl-type3,bus=root_port13,volatile-memdev=vmem0,id=cxl-vmem0,sn=0x10 \
  -M cxl-fmw.0.targets.0=cxl.1,cxl-fmw.0.size=4G \
  -qmp unix:qmp.sock,server=on,wait=off
```

host bridge 하나, root port 하나, 그 아래 512 MiB volatile Type 3 장치 하나, 4 GiB 고정 메모리 창(CFMWS) 하나인 가장 작은 구성입니다. disk와 network 장치는 `bus=pcie.0`으로 명시했습니다. `pxb-cxl` 뒤에 오는 PCI 장치에서 `bus`를 생략하면 QEMU가 그 장치를 `pxb-cxl` 쪽에 꽂으려다 "PCI: Only PCI/PCIe bridges can be plugged into pxb-cxl"로 시작을 거부했습니다.

`-cpu max,-hypervisor`에는 이유가 있습니다. 이 옵션 없이 처음 띄웠을 때는 region commit이 실패했습니다. 아래 "region이 commit되지 않을 때" 절에서 다룹니다.

## 장치와 드라이버 확인

먼저 게스트가 장치를 어떻게 보는지 확인합니다.

```text
$ lspci -nn | grep -E "0502|CXL"
0d:00.0 CXL [0502]: Intel Corporation Device [8086:0d93] (rev 01)
$ lsmod | grep -E "^cxl|dax|kmem"
cxl_pmem               24576  0
cxl_mem                12288  0
cxl_pci                28672  0
cxl_acpi               24576  0
$ ls /sys/bus/cxl/devices/
decoder0.0
decoder1.0
decoder2.0
decoder2.1
decoder2.2
decoder2.3
endpoint2
mem0
nvdimm-bridge0
port1
root0
```

class code `0502`는 CXL 메모리 장치이고, `8086:0d93`은 QEMU 모델이 정한 ID입니다. 이 커널의 config는 `CONFIG_CXL_BUS=y`, `CONFIG_CXL_REGION=y`, `CONFIG_CXL_PCI=m`, `CONFIG_DEV_DAX_CXL=m`, `CONFIG_DEV_DAX_KMEM=m`이었습니다. `cxl list`로 memdev와 root decoder를 봅니다.

```text
$ cxl list -M -u
{
  "memdev":"mem0",
  "ram_size":"512.00 MiB (536.87 MB)",
  "serial":"0x10",
  "host":"0000:0d:00.0",
  "firmware_version":"BWFW VERSION 00"
}
$ cxl list -B -D -u
{
  "bus":"root0",
  "provider":"ACPI.CXL",
  "decoders:root0":[
    {
      "decoder":"decoder0.0",
      "resource":"0x490000000",
      "size":"4.00 GiB (4.29 GB)",
      "interleave_ways":1,
      "max_available_extent":"4.00 GiB (4.29 GB)",
      "pmem_capable":true,
      "volatile_capable":true,
      "accelmem_capable":true,
      "qos_class":0,
      "nr_targets":1
    }
  ]
}
```

`decoder0.0`은 CFMWS 창이 root decoder로 나타난 것이고, 시작 주소 `0x490000000`에 크기 4 GiB입니다.

## 아직은 메모리가 아니다

이 시점의 NUMA 상태를 보면 CXL 메모리는 어디에도 없습니다.

```text
$ numactl --hardware
available: 1 nodes (0)
node 0 cpus: 0 1 2 3
node 0 size: 1906 MB
node 0 free: 1742 MB
...
$ cat /sys/devices/system/node/possible /sys/devices/system/node/online
0-1
0
```

`possible`이 `0-1`인 것은 커널이 CFMWS 창을 위해 노드 1을 미리 잡아 뒀다는 뜻입니다. 그러나 아직 `online`은 0뿐입니다. 장치가 보이는 것과 메모리로 쓸 수 있는 것은 별개입니다. 새 창고를 지었어도 진입로(decoder)를 열고 재고 관리 시스템(page allocator)에 등록해야 물건을 넣을 수 있는 것과 같습니다.

## region → dax → NUMA 노드

region을 만들면 root decoder부터 장치 decoder까지 주소 변환 경로가 열립니다. [ndctl v81 `cxl-create-region`](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-create-region.txt) 문서에 따르면 `-m`은 뒤의 이름을 memdev로 해석하라는 옵션이고 `-t`는 `ram`/`pmem` 종류입니다.

```text
$ cxl create-region -m -d decoder0.0 -w 1 -t ram mem0
cxl region: cmd_create_region: created 1 region
{
  "region":"region0",
  "resource":19595788288,
  "size":536870912,
  "type":"ram",
  "interleave_ways":1,
  "interleave_granularity":256,
  "decode_state":"commit",
  "mappings":[
    {
      "position":0,
      "memdev":"mem0",
      "decoder":"decoder2.0"
    }
  ],
  "qos_class_mismatch":true
}
```

`decode_state`가 `commit`이면 하드웨어 decoder까지 값이 들어갔다는 뜻입니다. 이제 dax 쪽을 봅니다.

```text
$ daxctl list -u
{
  "chardev":"dax0.0",
  "size":"512.00 MiB (536.87 MB)",
  "target_node":1,
  "align":2097152,
  "mode":"system-ram",
  "online_memblocks":4,
  "total_memblocks":4,
  "movable":false
}
$ lsmod | grep -E "dax|kmem"
kmem                   12288  0
device_dax             20480  0
dax_cxl                12288  0
```

아무 명령도 하지 않았는데 `dax0.0`이 이미 `system-ram` 모드로 올라왔습니다. v6.12 `drivers/dax/cxl.c`(21행)가 CXL RAM region의 dax 영역을 `IORESOURCE_DAX_KMEM` 플래그로 만들고, `drivers/dax/bus.c`(73행)가 이 플래그를 보고 장치를 `kmem` 드라이버에 붙이기 때문입니다. 이 게스트는 `CONFIG_MEMORY_HOTPLUG_DEFAULT_ONLINE=y`라 memblock 4개가 바로 online됐습니다. devdax로 쓰려면 [`daxctl reconfigure-device`](https://github.com/pmem/ndctl/blob/v81/Documentation/daxctl/daxctl-reconfigure-device.txt)의 `--mode=devdax`로 바꾸는데, 문서에 따르면 이 전환은 커널이 kmem 메모리의 hot-unplug를 지원해야 가능합니다.

```text
$ numactl --hardware
available: 2 nodes (0-1)
node 0 cpus: 0 1 2 3
node 0 size: 1906 MB
node 0 free: 1738 MB
node 1 cpus:
node 1 size: 512 MB
node 1 free: 512 MB
node distances:
node   0   1
  0:  10  20
  1:  20  10
```

노드 1이 CPU 없이 512 MB로 생겼습니다. 커널 로그에는 demotion 경로도 함께 잡혔습니다.

```text
[   35.910047] Demotion targets for Node 0: preferred: 1, fallback: 1
[   35.910366] Demotion targets for Node 1: null
```

노드 0의 페이지가 회수 압력을 받으면 노드 1로 내려갈 수 있다는 뜻입니다. 이 계층 구조는 [Ch 7](/blog/tools/debugging/memory/chapter07-tiered-memory-diagnostics)에서 자세히 봅니다.

## 노드별 사용량 — numastat

CXL 노드가 생기면 [Ch 1](/blog/tools/debugging/memory/chapter01-memory-accounting)의 `numastat`이 그대로 쓰입니다. 시스템 전체는 `-m`입니다.

```text
$ numastat -m 2>/dev/null | grep -E "Node|MemTotal|MemFree|MemUsed"
                          Node 0          Node 1           Total
MemTotal                 1906.36          512.00         2418.36
MemFree                  1718.00          511.79         2229.79
MemUsed                   188.37            0.21          188.58
```

`2>/dev/null`을 붙인 이유가 있습니다. Debian 12의 numactl 2.0.16 `numastat`은 자기 항목 표(`numastat.c` 93~130행)에 없는 노드 `meminfo` 항목(`SwapCached`, `SecPageTables`, `FileHugePages`, `FilePmdMapped`, `Unaccepted`)마다 "Token ... not in hash table" 경고를 냈습니다. 값 자체는 정상으로 나옵니다.

Ch 1의 `acct` 프로그램을 노드 1에 묶어 띄우면 어느 메모리가 CXL로 갔는지 보입니다.

```text
$ numactl --membind=1 ./acct heap &
$ numastat -p 622
...
Private                     49.28           81.51          130.79
----------------  --------------- --------------- ---------------
Total                       49.28           81.53          130.81
```

익명 80 MiB는 노드 1에 갔지만 공유 파일 48 MiB는 노드 0에 남았습니다. 파일을 미리 `dd`로 만들면서 page cache가 노드 0에 생겼기 때문입니다. Ch 1에서 본 것과 같은 이유로, `--membind`는 새 할당만 정합니다. 운영에서 "CXL 노드 사용량이 예상보다 작다"면 이렇게 이미 다른 노드에 있는 page cache를 먼저 의심합니다.

## 장치 상태 — cxl list -H

메모리로서의 확인이 끝났으면 장치로서의 상태를 봅니다. [ndctl v81 `cxl-list`](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-list.txt) 문서의 `-H`(`--health`) 예시에는 `health` 객체 안에 `maintenance_needed`, `media_normal` 같은 상태 비트와 `life_used_percent`, `temperature`, `dirty_shutdowns`, `volatile_errors`, `pmem_errors`, `ext_*` 필드가 들어 있습니다. 이 값은 장치의 Get Health Info 명령(v6.12 `drivers/cxl/cxlmem.h`의 `CXL_MBOX_OP_GET_HEALTH_INFO = 0x4200`, 538행)에서 나옵니다.

QEMU 게스트에서는 이 객체가 아예 없었습니다.

```text
$ cxl list -m mem0 -H -u
{
  "memdev":"mem0",
  "ram_size":"512.00 MiB (536.87 MB)",
  "serial":"0x10",
  "host":"0000:0d:00.0",
  "firmware_version":"BWFW VERSION 00"
}
$ cxl list -m mem0 -H --debug 2>&1 | grep -i -E "health|retval: -25"
libcxl: cxl_cmd_validate: mem0: Get Health Info: in: 0, out 18, flags: 00000000
libcxl: cxl_cmd_submit: mem0: got SEND cmd: in: 0, out: 18, retval: -25, status: 0
```

`retval: -25`는 `-ENOTTY`입니다. [CXL 시리즈 Ch 15](/blog/embedded/hardware/cxl/chapter15-ras-performance)가 arm64 게스트에서 본 것과 같은 결과로, QEMU 11.1.3이 이 명령을 구현하지 않아 커널이 거부했습니다. 진단 스크립트는 필드가 *없는* 것을 오류 0개로 해석하면 안 됩니다. `volatile_errors`가 0인 장치와 그 값을 보고하지 않는 장치는 다릅니다.

## Poison list — cxl list -L

poison은 장치가 "이 주소의 데이터는 믿을 수 없다"고 표시한 구간입니다. 읽으면 오류가 나는 상자에 빨간 딱지를 붙여 둔 것과 같습니다. 장치는 Get Poison List 명령(`CXL_MBOX_OP_GET_POISON = 0x4300`, `cxlmem.h` 543행)으로 목록을 돌려주고, `cxl list -L`(`--media-errors`)이 그것을 보여 줍니다.

QEMU에서는 QMP 명령 `cxl-inject-poison`으로 장치 안에 poison을 만들 수 있습니다. DPA `0x1000`부터 128바이트를 넣었습니다.

```text
-> {"execute":"cxl-inject-poison","arguments":{"path":"/machine/peripheral/cxl-vmem0","start":4096,"length":128}}
<- {"return": {}}
```

게스트에서 memdev와 region 두 관점으로 읽었습니다.

```text
$ cxl list -m mem0 -L -u
{
  "memdev":"mem0",
  ...
  "media_errors":[
    {
      "offset":"0x1000",
      "length":128,
      "source":"Internal"
    }
  ]
}
$ cxl list -r region0 -L -u
{
  "region":"region0",
  "resource":"0x490000000",
  ...
  "media_errors":[
    {
      "offset":"0x1000",
      "length":128,
      "source":"Internal"
    }
  ],
  "qos_class_mismatch":true
}
```

ndctl 문서는 `offset`이 memdev로 볼 때는 장치의 DPA이고 region으로 볼 때는 region 리소스 기준이라고 적습니다. 이 구성은 interleave가 1-way이고 region이 장치 처음부터 시작하므로 두 값이 같습니다. `source`의 `Internal`은 QEMU가 장치 내부 오류를 흉내 낸 결과입니다. `source` 값은 External, Internal, Injected, Vendor Specific, Unknown 중 하나입니다(ndctl 문서). 커널 debugfs의 `inject_poison`으로 넣으면 `Injected`가 됩니다(CXL 시리즈 Ch 15).

목록 조회는 커널 trace event `cxl_poison`도 남깁니다. 이 event에는 DPA뿐 아니라 HPA(host physical address)까지 들어 있습니다.

```text
{"system":"cxl","event":"cxl_poison","timestamp":97641269510,"memdev":"mem0","host":"0000:0d:00.0","serial":16,"trace_type":0,"region":"region0","overflow_ts":0,"hpa":19595792384,"dpa":4096,"dpa_length":128,"uuid":[0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0],"source":2,"flags":0}
```

`hpa` 19595792384는 `0x490001000`, 즉 region 시작 `0x490000000`에 DPA `0x1000`을 더한 값입니다. region이 commit된 x86 게스트라 커널이 DPA를 HPA로 바꿔 줄 수 있었습니다. 이 HPA로 어느 물리 페이지, 나아가 어느 프로세스가 영향을 받는지 따라갈 수 있습니다. 운영에서는 `cxl list -L`의 항목 수와 구간을 주기적으로 기록해, 새로 생긴 poison을 추적합니다.

## Event log — cxl monitor

장치는 상태 변화를 event log에 쌓습니다. v6.12 `drivers/cxl/cxlmem.h`(650~656행)의 `enum cxl_event_log_type`이 log 종류를 정의합니다.

| 로그 | 커널 enum | 값 |
|------|-----------|----|
| Informational | `CXL_EVENT_TYPE_INFO` | 0 |
| Warning | `CXL_EVENT_TYPE_WARN` | 1 |
| Failure | `CXL_EVENT_TYPE_FAIL` | 2 |
| Fatal | `CXL_EVENT_TYPE_FATAL` | 3 |

드라이버는 Get Event Records(`CXL_MBOX_OP_GET_EVENT_RECORD = 0x0100`, 519행)로 레코드를 읽어 trace event로 내보냅니다. 이 커널의 `/sys/kernel/tracing/events/cxl/`에는 `cxl_general_media`, `cxl_dram`, `cxl_memory_module`, `cxl_generic_event`, `cxl_poison`, `cxl_overflow`, `cxl_aer_correctable_error`, `cxl_aer_uncorrectable_error`가 있었습니다. `cxl monitor`는 이 trace event를 한 줄짜리 JSON으로 바꿔 줍니다.

`cxl monitor`를 띄워 둔 채 QMP로 General Media event(Informational log)와 DRAM event(Warning log)를 넣었습니다. QEMU 11.1.3은 두 명령 모두 `sub-type` 인자를 요구했습니다. 빠뜨리면 "Parameter 'sub-type' is missing"으로 거부됩니다.

```text
-> {"execute":"cxl-inject-general-media-event","arguments":{"path":"/machine/peripheral/cxl-vmem0","log":"informational","flags":1,"dpa":4096,"descriptor":3,"type":0,"sub-type":0,"transaction-type":192}}
<- {"return": {}}
-> {"execute":"cxl-inject-dram-event","arguments":{"path":"/machine/peripheral/cxl-vmem0","log":"warning","flags":1,"dpa":8192,"descriptor":1,"type":2,"sub-type":0,"transaction-type":192,"channel":2,"rank":1,"bank-group":1,"bank":2,"row":3,"column":4}}
<- {"return": {}}
```

```text
{"system":"cxl","event":"cxl_general_media","timestamp":131643960510,"memdev":"mem0","host":"0000:0d:00.0","log":0,"hdr_uuid":"fbcd0a77-c260-417f-85a9-088b1621eba6","serial":16,"hdr_flags":1,...,"dpa":4096,"descriptor":3,"type":0,"transaction_type":192,...,"hpa":19595792384,...,"region_name":"region0"}
{"system":"cxl","event":"cxl_dram","timestamp":131645915510,"memdev":"mem0","host":"0000:0d:00.0","log":1,"hdr_uuid":"601dcbb3-9c06-4eab-b8af-4e9bfb5c9624","serial":16,"hdr_flags":1,...,"dpa":8192,"descriptor":1,"type":2,"transaction_type":192,"channel":2,...,"column":4,...,"row":3,...,"hpa":19595796480,...,"rank":1,"bank_group":1,"bank":2,"dpa_flags":0,"region_name":"region0"}
```

`log` 0과 1이 위 표의 Informational·Warning이고, 넣은 DPA·channel·rank·bank가 그대로 돌아왔습니다. 여기서도 region이 있어 `hpa`와 `region_name`이 채워졌습니다.

하나 헤맨 점이 있습니다. `cxl monitor > monitor.json`으로 띄웠는데 파일이 비어 있었습니다. 이 빌드의 `cxl monitor`는 event를 표준 출력이 아니라 표준 오류로 냈습니다. 문서는 기본 'standard'가 표준 출력이라고 적지만, v81 `util/log.c`(18~25행)의 `log_standard()`는 priority 6만 stdout으로 보내고 monitor는 event를 `notice()`(priority 5, `cxl/monitor.c` 122행)로 내기 때문입니다. 파일로 남기려면 `2>`로 받거나, [`cxl-monitor`](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-monitor.txt) 문서의 `--log=<file>`을 씁니다.

## region이 commit되지 않을 때

처음에는 `-cpu max`만 주고 게스트를 띄웠습니다. 그때 같은 `cxl create-region`이 이렇게 실패했습니다.

```text
$ cxl create-region -m -d decoder0.0 -w 1 -t ram mem0
cxl region: create_region: region0: failed to commit decode: No such device or address
cxl region: cmd_create_region: created 0 regions
```

```text
[   54.805618] cxl region0: Failed to synchronize CPU cache state
[   54.806149] WARNING: CPU: 2 PID: 539 at drivers/cxl/core/region.c:235 commit_store+0x141/0x370
```

v6.12 `drivers/cxl/core/region.c`(226~243행)의 `cxl_region_invalidate_memregion()`은 commit 전에 CPU 캐시를 무효화하는데, CPU가 그 기능을 지원하지 않으면 `-ENXIO`를 돌려줍니다(`CONFIG_CXL_REGION_INVALIDATION_TEST`로 우회하는 시험용 경로가 따로 있습니다). x86에서 그 판단을 하는 `cpu_cache_has_invalidate_memregion()`(`arch/x86/mm/pat/set_memory.c`, 353~356행)은 `!cpu_feature_enabled(X86_FEATURE_HYPERVISOR)`를 돌려줍니다. 즉 x86이라도 하이퍼바이저 위의 게스트라고 표시되면 거부합니다. QEMU의 `-cpu max`는 CPUID의 hypervisor 비트를 켜므로 이 조건에 걸렸고, `-cpu max,-hypervisor`로 비트를 끄자(`/proc/cpuinfo`의 `hypervisor` 플래그 0개) commit이 성공했습니다. [CXL 시리즈 Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)이 arm64 게스트에서 본 `-ENXIO`와 같은 함수, 같은 줄입니다. arm64는 이 기능 자체가 없어서 막히고, x86 VM은 hypervisor 비트 때문에 막힙니다.

이 우회는 TCG 에뮬레이션에서 결과를 보려고 쓴 것입니다. 커널이 게스트에서 거부하는 데는 캐시 무효화를 믿을 수 없다는 이유가 있으므로, 실제 가상화 환경의 설정으로 옮기지 않습니다.

## 진단 순서

| 순서 | 명령 | 이 장에서 본 것 |
|------|------|-----------------|
| 1 | `cxl list -M -B -D -u` | memdev 512 MiB, root decoder 4 GiB |
| 2 | `cxl list -R -u` | `decode_state: commit` 여부 |
| 3 | `daxctl list -u` | `mode: system-ram`, `target_node: 1`, online memblock 수 |
| 4 | `numactl --hardware`, `numastat -m` | CPU 없는 노드 1, 노드별 사용량 |
| 5 | `cxl list -m memX -H` | QEMU에서는 health 없음(`-ENOTTY`) |
| 6 | `cxl list -m memX -L` | poison 구간과 `source` |
| 7 | `cxl monitor` | event JSON(표준 오류) |
| 8 | `dmesg \| grep -i cxl` | commit 실패 경고, demotion 대상 |

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `failed to commit decode: No such device or address` | `cxl_region_invalidate_memregion()`이 `-ENXIO`. x86 VM은 hypervisor 비트, arm64는 기능 부재 |
| region은 있는데 NUMA 노드가 없음 | `decode_state`가 commit이 아님, 또는 dax가 `devdax` 모드, memblock offline |
| `numastat -m`이 "Token ... not in hash table" 경고 | numastat 2.0.16의 항목 표에 없는 노드 `meminfo` 항목. 값은 정상 |
| `--membind`했는데 CXL 노드 사용량이 작음 | 이미 다른 노드에 있는 page cache는 옮기지 않음 |
| `cxl list -H`에 `health`가 없음 | 장치가 Get Health Info를 지원하지 않음(QEMU 11.1.3). 0으로 해석하지 않음 |
| `cxl monitor` 출력을 리다이렉트했는데 파일이 빔 | event가 표준 오류로 나옴. `2>` 또는 `--log=` |
| QMP event 주입이 "Parameter 'sub-type' is missing" | QEMU 11.1.3의 두 event 명령은 `sub-type`이 필수 |
| QEMU가 "Only PCI/PCIe bridges can be plugged into pxb-cxl" | `pxb-cxl` 뒤의 일반 PCI 장치를 `bus=pcie.0`으로 명시 |

장치 자체의 이상(link training, AER, 펌웨어)은 [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot#자주-만나는-함정)에서 다룹니다.

## 정리

- 이 장의 모든 출력은 QEMU 11.1.3의 CXL Type 3 에뮬레이션에서 나왔습니다. 커널·도구의 동작은 실제이고, 장치가 보고하는 값은 실제 제품과 무관합니다.
- CXL RAM은 `cxl create-region` → dax `system-ram` → CPU 없는 NUMA 노드 순서로 메모리가 됩니다. v6.12에서 CXL RAM region의 dax는 자동으로 `kmem`에 붙었습니다.
- region commit은 CPU 캐시 무효화가 가능해야 하고, x86에서도 hypervisor 비트가 있으면 `-ENXIO`로 거부됩니다.
- `cxl list -L`은 poison 구간을, `cxl monitor`는 log 종류별 event를 JSON으로 줍니다. region이 있으면 HPA까지 채워집니다.
- `cxl list -H`에 필드가 없으면 "오류 0"이 아니라 "보고하지 않음"으로 기록합니다.

## 다음 장 예고

Ch 7에서는 이렇게 생긴 노드 1을 계층 메모리로 봅니다. `memory_tier4`·`memory_tier22`가 어떻게 정해졌는지, demotion이 실제로 일어나는지, DAMON과 DAMOS `migrate_cold`가 페이지를 노드 1로 옮기는지를 같은 QEMU 게스트에서 확인합니다.

## 관련 항목

- [Ch 1: 리눅스 메모리 회계 — RSS·VSS·PSS·smaps 해석](/blog/tools/debugging/memory/chapter01-memory-accounting)
- [HBM·GDDR 심화 Ch 9: CXL.mem 분석](/blog/embedded/hardware/hbm/chapter09-cxl-mem)
- [Embedded Performance Engineering Ch 54: CXL.mem 지연·대역폭 실측](/blog/embedded/performance-engineering/part3-12-cxl-mem-latency)
- [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
- [CXL 4.0 Internals Ch 12: QEMU CXL 에뮬레이션](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)

## 공식 자료

- [ndctl v81 `cxl-list`](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-list.txt) — `-H`, `-L`, `-R`, `-D`
- [ndctl v81 `cxl-create-region`](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-create-region.txt)
- [ndctl v81 `daxctl-reconfigure-device`](https://github.com/pmem/ndctl/blob/v81/Documentation/daxctl/daxctl-reconfigure-device.txt)
- [Linux v6.12 `Documentation/driver-api/cxl/memory-devices.rst`](https://github.com/torvalds/linux/blob/v6.12/Documentation/driver-api/cxl/memory-devices.rst)
- [Linux v6.12 `drivers/cxl/core/region.c`](https://github.com/torvalds/linux/blob/v6.12/drivers/cxl/core/region.c#L226) — `cxl_region_invalidate_memregion()`
- [Linux v6.12 `drivers/cxl/cxlmem.h`](https://github.com/torvalds/linux/blob/v6.12/drivers/cxl/cxlmem.h#L519) — mailbox opcode, event log type
- [QEMU 11.1.3 CXL 문서](https://gitlab.com/qemu-project/qemu/-/blob/v11.1.3/docs/system/devices/cxl.rst)
