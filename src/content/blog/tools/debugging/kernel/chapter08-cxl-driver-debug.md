---
title: "CXL 커널 드라이버 디버깅 — ftrace·bpftrace·drgn 활용"
slug: "tools/debugging/kernel/chapter08-cxl-driver-debug"
date: 2026-06-18T09:03:00
description: "Linux drivers/cxl/ 서브시스템 디버깅 — ftrace로 probe 흐름 추적, bpftrace로 mailbox 명령 캡처, drgn으로 커널 상태 검사."
series: "Kernel Debugging"
seriesOrder: 8
tags: [cxl, kernel-debugging, ftrace, bpftrace, drgn, cxl-core]
draft: false
topics: ["tools", "tools/debugging"]
---

## drivers/cxl/ 모듈 구성

CXL은 *여러 모듈로 분할*되어 있어 *한 모듈만 추적해서는 안 됩니다*. `cxl_core`가 공통 기반이고 나머지 모듈이 모두 그 위에 올라갑니다. `drivers/cxl/Makefile`은 built-in일 때의 순서를 주석으로 밝혀 둡니다.

| 순서 | 모듈 | 소스 | 역할 |
|------|------|------|------|
| 1 | cxl_core | `core/` | port·decoder·region·memdev 객체, mailbox 공통부, CXL bus |
| 2 | cxl_port | `port.c` | port 드라이버. platform root 드라이버(acpi)보다 먼저 |
| 3 | cxl_acpi | `acpi.c` | ACPI CEDT 파싱, CXL root·root decoder 등록 |
| 4 | cxl_pmem, cxl_mem | `pmem.c`·`security.c`, `mem.c` | persistent memory, memdev 드라이버 |
| 5 | cxl_pci | `pci.c` | PCI 드라이버. 레지스터 매핑·mailbox·memdev 생성 |

문제가 *어느 모듈에서 발생*했는지에 따라 추적 도구가 다릅니다.

## ftrace로 probe 흐름

CXL 디바이스가 등록될 때 *probe 함수 호출 순서*를 보고 싶다면:

```bash
# 1. function_graph tracer 활성화
$ echo function_graph > /sys/kernel/debug/tracing/current_tracer

# 2. CXL 관련 함수만 필터
$ echo 'cxl_*' > /sys/kernel/debug/tracing/set_ftrace_filter

# 3. tracing 시작
$ echo 1 > /sys/kernel/debug/tracing/tracing_on

# 4. 디바이스 rescan
$ echo 1 > /sys/bus/pci/rescan

# 5. trace 확인
$ cat /sys/kernel/debug/tracing/trace
```

`cxl_pci_probe()`(`drivers/cxl/pci.c`), `cxl_mem_probe()`(`drivers/cxl/mem.c`), `cxl_port_probe()`(`drivers/cxl/port.c`), `cxl_acpi_probe()`(`drivers/cxl/acpi.c`)가 각 모듈의 probe 진입점입니다. *probe가 어디서 멈췄는지* 또는 *예상과 다른 순서로 호출되는지*를 이 흐름에서 봅니다. `cxl_pci_probe()`가 부르는 함수 순서는 [Ch 9](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough#probe-흐름-추적)에 정리했습니다.

## bpftrace로 Mailbox 명령 캡처

CXL 디바이스와 호스트는 *mailbox*로 명령·응답을 주고받습니다. mailbox 명령이 *실패*하면 *디바이스 상태가 의심*되는데, 어떤 명령이 *언제 실패*했는지 알아야 합니다.

커널 내부 명령의 공통 진입점은 `cxl_internal_send_cmd(struct cxl_mailbox *cxl_mbox, struct cxl_mbox_cmd *mbox_cmd)`(`drivers/cxl/core/mbox.c`)입니다. opcode는 두 번째 인자의 `opcode` 필드에 있습니다.

```bash
$ bpftrace -e '
  kprobe:cxl_internal_send_cmd {
    @op[tid] = ((struct cxl_mbox_cmd *)arg1)->opcode;
  }
  kretprobe:cxl_internal_send_cmd /@op[tid]/ {
    if (retval != 0) {
      printf("opcode=0x%04x ret=%d\n", @op[tid], retval);
    }
    delete(@op[tid]);
  }
'
```

`struct cxl_mbox_cmd`의 타입 정보는 커널 BTF에서 가져옵니다. doorbell 대기가 시간을 넘기면 `-ETIMEDOUT`(-110)이 돌아오고, dmesg에 `mailbox timeout (opcode: …)`가 찍힙니다(`drivers/cxl/pci.c`). opcode 값은 `drivers/cxl/cxlmem.h`의 `CXL_MBOX_OP_*`로 대조합니다. 예를 들어 Get Health Info는 0x4200, Get LSA는 0x4102입니다.

*Timeout이 나는 opcode*를 식별하면 *디바이스 firmware 문제*인지 *호스트 mailbox 드라이버 문제*인지 좁힐 수 있습니다.

## drgn으로 커널 상태 검사

drgn은 *살아 있는 커널의 데이터 구조를 Python으로 검사*하는 도구입니다. drgn의 `drgn/helpers/linux/`에는 CXL 전용 helper가 없으므로, 범용 `bus_for_each_dev()`로 CXL bus(`cxl_bus_type`)를 순회하고 `device_type` 이름으로 객체를 골라냅니다.

```python
from drgn import container_of
from drgn.helpers.linux.device import bus_for_each_dev, dev_name

for dev in bus_for_each_dev(prog["cxl_bus_type"].address_of_()):
    tname = dev.type.name.string_() if dev.type else b""
    if tname == b"cxl_port":
        port = container_of(dev, "struct cxl_port", "dev")
        print(dev_name(dev).decode(), "nr_dports", port.nr_dports.value_())
    elif tname == b"cxl_region":
        cxlr = container_of(dev, "struct cxl_region", "dev")
        print(dev_name(dev).decode(),
              "interleave_ways", cxlr.params.interleave_ways.value_(),
              "state", cxlr.params.state.format_(type_name=False))
```

`device_type` 이름은 `cxl_port`, `cxl_region`, `cxl_memdev`, `cxl_decoder_root`·`cxl_decoder_switch`·`cxl_decoder_endpoint`입니다(`drivers/cxl/core/port.c`, `region.c`, `memdev.c`). decoder는 `struct cxl_decoder`의 `hpa_range`·`interleave_ways`·`interleave_granularity`를 봅니다. drgn은 *kdump core*나 *살아 있는 커널* 둘 다에서 동작합니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `cxl_pci_probe`가 호출 안 됨 | PCI driver match 실패 — `cxl_pci`는 class code(CXL Memory Device)로 match |
| dmesg "Device DVSEC not present, skip CXL.mem init" | CXL Device DVSEC이 없어 `cxl_pci_probe()`가 CXL.mem 초기화를 건너뜀 |
| Mailbox timeout 빈번 | 명령별 doorbell 대기 한도는 고정 2초(`CXL_MAILBOX_TIMEOUT_MS`). `mbox_ready_timeout` 모듈 파라미터는 초기화 때 mailbox ready를 기다리는 시간(기본 60초)이라 명령 timeout과 무관 |
| ftrace에 함수가 안 보임 | inline된 static 함수는 trace 대상이 아님 |
| `/sys/bus/cxl` 비어 있음 | `modprobe cxl_acpi` 안 함 또는 ACPI table 결함 |
| AER 이벤트 후 memdev 드라이버가 내려감 | `cxl_error_handlers`의 `cxl_error_detected()`가 uncorrectable·frozen이면 memdev 드라이버를 해제하고 reset 요청 |

## 정리

- CXL 드라이버는 *cxl_core*를 기반으로 *cxl_port·cxl_acpi·cxl_pmem·cxl_mem·cxl_pci*가 올라가는 구조라 추적이 까다롭습니다.
- *ftrace function_graph*로 *probe 호출 순서*를 시각화합니다.
- *bpftrace*로 `cxl_internal_send_cmd()`의 *mailbox 명령 호출과 실패*를 캡처합니다.
- *drgn*으로 *살아 있는 커널의 port·decoder·region 객체*를 Python으로 검사합니다.
- 모듈 구성을 *항상 먼저 확인*합니다 — `lsmod | grep cxl`.

## 다음 장 예고

Ch 9 — drivers/cxl 코드 분석. 드라이버 진입점부터 sysfs까지 *코드 경로*를 본격적으로 분해.

## 관련 항목

- [Ch 3: ftrace와 tracepoints 활용](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [Ch 4: eBPF·bpftrace로 커널 디버깅](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
