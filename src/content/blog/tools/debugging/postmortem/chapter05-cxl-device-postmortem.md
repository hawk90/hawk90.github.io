---
title: "CXL 디바이스 Core Dump 분석 — Device State·Kernel Log·NUMA 토폴로지"
slug: "tools/debugging/postmortem/chapter05-cxl-device-postmortem"
date: 2026-06-18T09:07:00
description: "CXL 디바이스가 fail한 후 vmcore에서 region·decoder 상태, mailbox 오류 로그, NUMA 토폴로지를 복원하는 분석 흐름."
series: "Postmortem Debugging"
seriesOrder: 5
tags: [cxl, postmortem, core-dump, drgn, vmcore]
draft: false
topics: ["tools", "tools/debugging"]
---

## CXL 관련 postmortem이 왜 다른가

일반 프로세스 core dump는 CPU 레지스터·메모리·스레드 상태가 핵심입니다. CXL 장치가 문제를 일으킨 커널을 분석할 때는 여기에 커널이 들고 있던 CXL 객체 상태가 더 필요합니다.

- **region·decoder 객체 상태** — commit 단계, 매핑된 HPA·DPA 범위
- **NUMA 토폴로지** — 어느 node가 CXL 메모리를 받을 자리였나
- **kernel log의 cxl 메시지** — mailbox timeout, PCI 오류 처리 경고

이 장은 이 셋을 실제 vmcore에서 읽습니다. 실행 환경은 다음과 같습니다.

| 항목 | 값 |
| --- | --- |
| 에뮬레이터 | QEMU 11.1.3 TCG, `-M virt,gic-version=3,cxl=on -cpu max -smp 4 -m 2g` |
| CXL 장치 | `pxb-cxl` → `cxl-rp` → `cxl-type3`(volatile 256 MiB), CFMWS 4 GiB 창 하나 |
| 게스트 | Debian 13.7 arm64, 커널 `6.12.116+deb13-arm64`(`CONFIG_CXL_BUS=y`, `CONFIG_CXL_REGION=y`), ndctl/cxl 81 |
| vmcore | QEMU `-device vmcoreinfo` + QMP `dump-guest-memory`(ELF, paging 없음) |
| 분석 | `linux-image-6.12.116+deb13-arm64-dbg`의 vmlinux, drgn 0.3.0(pip), crash 8.0.6 |

QMP로 만든 vmcore는 2,147,500,207바이트였고, 프로그램 헤더는 둘뿐이었습니다.

```text
$ readelf -lW vmcore.elf
  Type           Offset   VirtAddr           PhysAddr           FileSiz  MemSiz   Flg Align
  NOTE           0x000130 0x0000000000000000 0x0000000000000000 0x003f74 0x003f74     0
  LOAD           0x0040a4 0x0000000040000000 0x0000000040000000 0x80000000 0x80000000     0
```

PT_LOAD 하나가 게스트 RAM 2 GiB(0x40000000부터)이고, NOTE에는 게스트 커널이 fw_cfg로 넘긴 `VMCOREINFO`가 들어 있습니다. CXL 장치의 256 MiB와 CFMWS 창(0x10000000000부터)은 dump에 없습니다. 장치 쪽 이벤트 로그와 poison 목록도 장치 안에 있으므로, 필요하면 dump 전에 살아 있는 시스템에서 따로 모아야 합니다. 이 실험에서는 dump 직전에 아래 두 가지를 모았습니다.

```text
# cxl list -L -m mem0 -u
{
  "memdev":"mem0",
  "ram_size":"256.00 MiB (268.44 MB)",
  ...
  "media_errors":[
    {
      "offset":"0x1000",
      "length":64,
      "source":"Internal"
    }
  ]
}
```

QMP `cxl-inject-poison`(DPA 0x1000, 64바이트)과 `cxl-inject-general-media-event`(failure 로그, DPA 0x2000)로 넣은 기록이 tracefs의 `cxl` 이벤트로 남았습니다.

```text
irq/62-0000:0d:-428 [003] ..... 402.024270: cxl_general_media: memdev=mem0 host=0000:0d:00.0 serial=0 log=Failure : ... dpa=2000 dpa_flags='' descriptor='UNCORRECTABLE_EVENT|THRESHOLD_EVENT' type='0x3' transaction_type='0xc0' ... hpa=ffffffffffffffff region= ...
cxl-2484            [003] ..... 409.076977: cxl_poison: memdev=mem0 host=0000:0d:00.0 serial=0 trace_type=List region= ... hpa=0xffffffffffffffff dpa=0x1000 dpa_length=0x40 source=Internal flags= overflow_time=0
```

`hpa=ffffffffffffffff`와 빈 `region=`은 그 DPA를 HPA로 바꿔 줄 region이 없다는 뜻입니다. 이유는 아래 drgn 출력에서 나옵니다. 같은 세션에서 `cxl-inject-uncorrectable-errors`와 `cxl-inject-correctable-error`도 실행했지만, 게스트의 dmesg와 trace에는 아무것도 남지 않았습니다.

## drgn으로 vmcore 분석

먼저 도구 버전이 맞아야 합니다. Debian 13의 `python3-drgn` 0.0.31로 아래 스크립트를 돌리면 첫 줄에서 멈춥니다.

```text
ImportError: cannot import name 'bus_for_each_dev' from 'drgn.helpers.linux.device' (/usr/lib/python3/dist-packages/drgn/helpers/linux/device.py)
```

`bus_for_each_dev()`는 drgn 태그 v0.0.32의 `drgn/helpers/linux/device.py`에는 없고 v0.0.33(2025-10-29)부터 있습니다. 그래서 VM에 `pip install drgn==0.3.0`으로 새 버전을 빌드했습니다. 이 helper로 CXL bus(`cxl_bus_type`, `drivers/cxl/core/port.c`)의 장치를 모두 돌고 `device_type` 이름을 셉니다.

```python title="drgn-cxl-types.py"
from collections import Counter
from drgn.helpers.linux.device import bus_for_each_dev, dev_name
c = Counter()
for dev in bus_for_each_dev(prog["cxl_bus_type"].address_of_()):
    t = dev.type.name.string_().decode() if dev.type else "-"
    c[t] += 1
    print(f"{dev_name(dev).decode():14} {t}")
print(dict(c))
```

```text
$ drgn -c vmcore.elf drgn-cxl-types.py
root0          cxl_port
decoder0.0     cxl_decoder_root
port1          cxl_port
decoder1.0     cxl_decoder_switch
nvdimm-bridge0 cxl_nvdimm_bridge
mem0           cxl_memdev
endpoint2      cxl_port
decoder2.0     cxl_decoder_endpoint
decoder2.1     cxl_decoder_endpoint
decoder2.2     cxl_decoder_endpoint
decoder2.3     cxl_decoder_endpoint
{'cxl_port': 3, 'cxl_decoder_root': 1, 'cxl_decoder_switch': 1, 'cxl_nvdimm_bridge': 1, 'cxl_memdev': 1, 'cxl_decoder_endpoint': 4}
```

dump 직전의 `/sys/bus/cxl/devices/` 목록과 같은 11개입니다. 같은 방식으로 `cxl_region`을 골라 상태를 찍는 스크립트입니다.

```python title="drgn-cxl-region.py"
# drgn 세션: drgn -c /var/crash/vmcore (또는 라이브 커널)
from drgn import container_of
from drgn.helpers.linux.device import bus_for_each_dev, dev_name

for dev in bus_for_each_dev(prog["cxl_bus_type"].address_of_()):
    if not dev.type or dev.type.name.string_() != b"cxl_region":
        continue
    cxlr = container_of(dev, "struct cxl_region", "dev")
    p = cxlr.params
    print(dev_name(dev).decode(), p.state.format_(type_name=False),
          "ways", p.interleave_ways.value_(), "targets", p.nr_targets.value_(),
          "flags", hex(cxlr.flags.value_()))
```

이 vmcore에서는 아무것도 찍히지 않았습니다. region이 없기 때문입니다. dump 전에 `cxl create-region -m -d decoder0.0 -t ram -w 1 mem0`을 실행했는데, 커밋 단계에서 실패하고 region이 지워졌습니다.

```text
cxl region: create_region: region0: failed to commit decode: No such device or address
cxl region: cmd_create_region: created 0 regions
```

원인은 커널 로그에 있습니다. `drivers/cxl/core/region.c`의 `cxl_region_invalidate_memregion()`은 `cpu_cache_has_invalidate_memregion()`이 거짓이면 `CONFIG_CXL_REGION_INVALIDATION_TEST`가 없을 때 경고를 찍고 `-ENXIO`를 돌려줍니다. v6.12에서 `ARCH_HAS_CPU_CACHE_INVALIDATE_MEMREGION`을 select하는 것은 `arch/x86/Kconfig`이고 `arch/arm64/Kconfig`에는 없습니다. Debian 커널 설정에는 `# CONFIG_CXL_REGION_INVALIDATION_TEST is not set`이 있습니다. 결국 이 arm64 커널에서는 사용자 공간에서 만든 region이 커밋되지 않습니다.

region이 없어도 endpoint decoder에는 흔적이 남았습니다. `struct cxl_endpoint_decoder`(`drivers/cxl/cxl.h`)의 `mode`, `dpa_res`, `cxld.flags`를 읽었습니다.

```python title="drgn-cxl-epdec.py"
from drgn import container_of
from drgn.helpers.linux.device import bus_for_each_dev, dev_name

for dev in bus_for_each_dev(prog["cxl_bus_type"].address_of_()):
    if not dev.type or dev.type.name.string_() != b"cxl_decoder_endpoint":
        continue
    cxled = container_of(dev, "struct cxl_endpoint_decoder", "cxld.dev")
    res = cxled.dpa_res
    span = f"{res.start.value_():#x}-{res.end.value_():#x}" if res else "none"
    print(dev_name(dev).decode(), cxled.mode.format_(type_name=False),
          "dpa", span, "hpa", hex(cxled.cxld.hpa_range.start.value_()), hex(cxled.cxld.hpa_range.end.value_()),
          "flags", hex(cxled.cxld.flags.value_()))
```

```text
decoder2.0 CXL_DECODER_RAM dpa 0x0-0xfffffff hpa 0x0 0xffffffffffffffff flags 0x0
decoder2.1 CXL_DECODER_NONE dpa none hpa 0x0 0xffffffffffffffff flags 0x0
decoder2.2 CXL_DECODER_NONE dpa none hpa 0x0 0xffffffffffffffff flags 0x0
decoder2.3 CXL_DECODER_NONE dpa none hpa 0x0 0xffffffffffffffff flags 0x0
```

`decoder2.0`은 `create-region`이 잡아 둔 DPA 256 MiB(0x0–0xfffffff)를 RAM 모드로 들고 있지만, HPA 범위가 채워지지 않았고 `CXL_DECODER_F_ENABLE`(bit 5)도 꺼져 있습니다. "DPA는 할당됐는데 HPA로 디코드되지 않는" 상태가 vmcore에 그대로 남은 것입니다. 앞의 trace에서 `hpa=ffffffffffffffff`가 나온 이유도 이것입니다.

region이 있었다면 볼 값도 정리해 둡니다. `struct cxl_region`의 `params.state`는 `enum cxl_config_state`이고 값은 `CXL_CONFIG_IDLE`, `CXL_CONFIG_INTERLEAVE_ACTIVE`, `CXL_CONFIG_ACTIVE`, `CXL_CONFIG_RESET_PENDING`, `CXL_CONFIG_COMMIT` 다섯 가지입니다(`drivers/cxl/cxl.h`). 별도의 오류 상태 값은 없습니다. `flags`의 `CXL_REGION_F_NEEDS_RESET`(bit 1)은 commit된 region의 decoder 일부가 이미 내려가 teardown이 필요하다는 표시입니다.

## NUMA 토폴로지 복원

crash 시점의 노드별 페이지 수를 `node_data`에서 읽습니다.

```python title="drgn-cxl-nodes.py"
from drgn.helpers.linux.nodemask import for_each_online_node

for nid in for_each_online_node(prog):
    pgdat = prog["node_data"][nid]
    print(nid, pgdat.node_present_pages.value_(),
          pgdat.node_spanned_pages.value_())
```

```text
$ drgn -c vmcore.elf drgn-cxl-nodes.py
0 524288 524288
1 0 0
```

`node_present_pages`는 실제로 있는 페이지 수, `node_spanned_pages`는 노드가 걸친 범위 크기(구멍 포함)입니다(`include/linux/mmzone.h`). node 0은 4 KiB 페이지 524,288개, 즉 2 GiB 게스트 RAM입니다. node 1은 online이지만 페이지가 0입니다. dump 직전 `numactl -H`도 `node 1 cpus:`가 비어 있고 `node 1 size: 0 MB`였습니다. SRAT에 없는 CFMWS 창마다 커널이 가짜 proximity domain으로 node를 하나씩 만들므로(`drivers/acpi/numa/srat.c`의 `acpi_parse_cfmws()`), node 1이 그 CXL 창의 자리입니다. region이 커밋되지 않아 이 node에는 메모리가 올라오지 않았습니다. present가 0인 node만으로 "CXL 메모리가 내려갔다"고 결론 내리지 않고, 위의 decoder·region 상태와 함께 읽어야 하는 이유입니다.

## Kernel log에서 단서

vmcore의 printk 버퍼는 `crash`의 `log` 명령으로 볼 수 있습니다. 그런데 이 QEMU ELF dump에서 crash 8.0.6은 세션을 열지 못했습니다.

```text
WARNING: cannot access vmalloc'd module memory

crash: invalid kernel virtual address: ffff800080a20000  type: "64-bit KVADDR"
```

같은 vmcore를 drgn은 읽었으므로, printk 레코드도 drgn의 `get_printk_records()`로 뽑았습니다.

```python title="drgn-dmesg-cxl.py"
from drgn.helpers.linux.printk import get_printk_records
for r in get_printk_records(prog):
    t = r.text.decode(errors="replace")
    if "cxl" in t.lower() or "CPU cache" in t:
        print(f"[{r.timestamp / 1e9:12.6f}] {t}")
```

```text
[    0.832788] acpi ACPI0016:00: _OSC: OS supports [CXL11PortRegAccess CXL20PortDevRegAccess CXLProtocolErrorReporting CXLNativeHot]
[    0.839021] acpi ACPI0016:00: _OSC: OS now controls [CXLMemErrorReporting]
[   23.655602]  pci0000:0c: host supports CXL
[   24.227956] cxl_pci 0000:0d:00.0: enabling device (0000 -> 0002)
[   70.080737] cxl region0: Failed to synchronize CPU cache state
[   70.081024] WARNING: CPU: 1 PID: 641 at drivers/cxl/core/region.c:235 cxl_region_invalidate_memregion.isra.0+0x3c/0x58
...
```

region 실패가 70초에 `cxl` 프로세스(PID 641)에서 일어났다는 사실이 dump만으로 복원됩니다. `_OSC` 줄은 펌웨어가 OS에 넘긴 CXL 제어권을 보여 줍니다. 여기서는 `CXLMemErrorReporting`만 OS가 받았습니다.

장치가 실제로 고장 났을 때 `drivers/cxl/`가 남기는 메시지 중 찾을 것은 다음과 같습니다. v6.12 소스의 format 문자열입니다.

| 메시지 (소스의 format 문자열) | 출처 | 의미 |
|-------------------------------|------|------|
| `mailbox timeout (opcode: %#x), device state %s%s` | `pci.c`의 `cxl_cmd_err()` | doorbell 대기 timeout. device state에 ` fatal`(`CXLMDEV_DEV_FATAL`)·` firmware-halt`(`CXLMDEV_FW_HALT`)가 붙음 |
| `timeout waiting for background (%d ms)` | `pci.c` | background 명령이 poll 한도 안에 끝나지 않음 |
| `%s: frozen state error detected, disable CXL.mem` | `core/pci.c` | PCI 채널 frozen, memdev 드라이버 해제 후 reset 요청 |
| `failure state error detected, request disconnect` | `core/pci.c` | PCI 채널 perm failure, disconnect |
| `%s: memdev disabled, abort error handling` | `core/pci.c` | memdev에 드라이버가 없어 오류 처리 포기 |

`cxl_cmd_err()`는 `dev_err_ratelimited()`로 찍으므로, 짧은 시간에 timeout이 반복되면 일부는 로그에 없습니다. 같은 opcode의 timeout이 한 줄뿐이라고 해서 한 번만 일어났다는 뜻은 아닙니다.

## 자주 만나는 함정

이 장의 실험에서 실제로 부딪힌 것들입니다.

| 관찰 | 원인 | 확인한 방법 |
|------|------|------|
| `ImportError: cannot import name 'bus_for_each_dev'` | Debian 13의 drgn 0.0.31에는 helper가 없음(v0.0.33부터) | `pip install drgn==0.3.0` 후 동작 |
| `crash: invalid kernel virtual address` | crash 8.0.6이 이 QEMU ELF dump를 열지 못함 | 같은 파일을 drgn으로 읽음 |
| `cxl_region` 객체가 하나도 없음 | arm64 6.12에서 region 커밋이 `-ENXIO`로 실패하고 정리됨 | printk의 "Failed to synchronize CPU cache state" |
| trace의 `hpa=ffffffffffffffff`, 빈 `region=` | 그 DPA를 디코드하는 커밋된 region이 없음 | endpoint decoder의 HPA 범위와 `flags 0x0` |
| node가 online인데 present 0 | CFMWS 자리 node에 메모리가 올라오지 않음 | decoder·region 상태와 함께 읽음 |
| CXL 메모리 내용이 dump에 없음 | `dump-guest-memory`가 게스트 RAM 2 GiB만 담음 | `readelf -lW`의 PT_LOAD 하나 |

## 분석 체크리스트

1. vmcore를 연 도구 버전과 vmlinux debuginfo의 build ID를 먼저 기록합니다. drgn helper 하나가 버전에 따라 없습니다.
2. printk 레코드에서 *마지막 cxl·AER 메시지*와 시각을 확인합니다.
3. `cxl_bus_type`을 돌아 region·decoder·memdev 객체 목록을 dump 전 `/sys/bus/cxl/devices/`와 맞춰 봅니다.
4. endpoint decoder의 `mode`·`dpa_res`·HPA 범위·`flags`로 디코드가 실제로 켜졌는지 확인합니다.
5. *mailbox timeout 메시지*가 있으면 opcode와 device state(` fatal`, ` firmware-halt`)를 확인합니다.
6. *NUMA 노드 페이지 수*를 decoder 상태와 함께 읽어 CXL 메모리가 올라와 있었는지 판단합니다.
7. 장치 쪽 poison·이벤트 기록은 dump 전에 `cxl list -L`과 tracefs로 따로 모아 둡니다.

## 정리

- CXL 장치 분석에는 프로세스 core에 없는 커널 객체 상태가 필요하고, drgn으로 `cxl_bus_type`을 돌아 읽을 수 있습니다. 이 helper는 drgn v0.0.33부터 있고, Debian 13의 0.0.31에는 없습니다.
- QEMU `dump-guest-memory` vmcore는 게스트 RAM만 담습니다. 장치 메모리, poison 목록, 장치 이벤트 로그는 별도로 모아야 합니다.
- 이 arm64 6.12 커널에서는 region 커밋이 "Failed to synchronize CPU cache state"로 실패했고, vmcore에는 DPA만 잡고 HPA가 비어 있는 endpoint decoder가 남았습니다.
- NUMA node의 present 페이지 0은 그 자체로 장애를 뜻하지 않습니다. decoder와 region 상태가 함께 근거가 됩니다.
- 커널 로그의 `mailbox timeout`은 rate limit을 거치므로, 줄 수가 사건 수가 아닙니다.

## 다음 장 예고

Ch 6 — CXL Fabric Postmortem. 여러 host와 Fabric Manager에 흩어진 기록을 사양의 식별자와 시간 구간으로 잇는 방법을 다룹니다.

## 관련 항목

- [Ch 1: Core Dump 생성 메커니즘](/blog/tools/debugging/postmortem/chapter01-core-generation)
- [Ch 3: GDB로 Core 분석](/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis)
- [Kernel Debugging Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Linux v6.12 `drivers/cxl/cxl.h`](https://github.com/torvalds/linux/blob/v6.12/drivers/cxl/cxl.h), [`drivers/cxl/core/region.c`](https://github.com/torvalds/linux/blob/v6.12/drivers/cxl/core/region.c), [drgn helpers](https://drgn.readthedocs.io/en/latest/helpers.html)
