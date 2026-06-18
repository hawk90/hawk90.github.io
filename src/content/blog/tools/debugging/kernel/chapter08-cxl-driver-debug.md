---
title: "CXL 커널 드라이버 디버깅 — ftrace·bpftrace·drgn 활용"
date: 2026-06-18T09:03:00
description: "Linux drivers/cxl/ 서브시스템 디버깅 — ftrace로 probe 흐름 추적, bpftrace로 mailbox 명령 캡처, drgn으로 커널 상태 검사."
series: "Kernel Debugging"
seriesOrder: 8
tags: [cxl, kernel-debugging, ftrace, bpftrace, drgn, cxl-core]
draft: false
---

## drivers/cxl/ 모듈 의존성

CXL은 *여러 모듈로 분할*되어 있어 *한 모듈만 추적해서는 안 됩니다*. 의존성 체인:

```text
cxl_acpi  ← ACPI CEDT 파싱, root port 생성
   ↓
cxl_pci   ← PCI subsystem 통합, MMIO 매핑
   ↓
cxl_core  ← 공통 베이스 — port, decoder, region, memdev
   ↑           ↑
cxl_mem    cxl_pmem    ← memory device·persistent memory
   ↑           ↑
cxl_port   cxl_acpi    ← switch·root port
```

문제가 *어느 모듈에서 발생*했는지에 따라 추적 도구가 다릅니다.

## ftrace로 probe 흐름

CXL 디바이스가 등록될 때 *probe 함수 호출 순서*를 보고 싶다면:

```bash
# 1. function_graph tracer 활성화
$ echo function_graph > /sys/kernel/debug/tracing/current_tracer

# 2. CXL 관련 함수만 필터
$ echo 'cxl_*' > /sys/kernel/debug/tracing/set_ftrace_filter
$ echo 'cxl_acpi_probe cxl_pci_probe cxl_mem_probe' >> /sys/kernel/debug/tracing/set_ftrace_filter

# 3. tracing 시작
$ echo 1 > /sys/kernel/debug/tracing/tracing_on

# 4. 디바이스 rescan
$ echo 1 > /sys/bus/pci/rescan

# 5. trace 확인
$ cat /sys/kernel/debug/tracing/trace
   0)   3.241 us  |  cxl_acpi_probe();
   0) + 12.45 us  |  cxl_pci_probe() {
   0)   1.832 us  |    cxl_setup_regs();
   0)   8.123 us  |    cxl_dvsec_init();
   0) + 12.45 us  |  }
   0)   5.234 us  |  cxl_mem_probe();
```

*probe가 어디서 멈췄는지* 또는 *예상과 다른 순서로 호출되는지* 한눈에 보입니다.

## bpftrace로 Mailbox 명령 캡처

CXL 디바이스와 호스트는 *mailbox*로 명령·응답을 주고받습니다. mailbox 명령이 *실패*하면 *디바이스 상태가 의심*되는데, 어떤 명령이 *언제 실패*했는지 알아야 합니다.

```bash
# Mailbox 호출 추적
$ bpftrace -e '
  kprobe:cxl_mbox_send_cmd {
    printf("[%llu] opcode=0x%x size=%d\n", nsecs, arg1, arg2);
  }
  kretprobe:cxl_mbox_send_cmd {
    if (retval != 0) {
      printf("  ERROR: ret=%d\n", retval);
    }
  }
'

# 출력 예
[1234567890] opcode=0x4400 size=64  # Get Health Info
[1234567892] opcode=0x4300 size=8   # Get LSA
  ERROR: ret=-110                    # ETIMEDOUT
```

*Timeout이 나는 opcode*를 식별하면 *디바이스 firmware 문제*인지 *호스트 mailbox 드라이버 문제*인지 좁힐 수 있습니다.

## drgn으로 커널 상태 검사

drgn은 *살아 있는 커널의 데이터 구조를 Python으로 검사*하는 도구입니다. CXL의 *port·decoder·region* 객체를 직접 볼 수 있습니다.

```python
# drgn 세션
>>> from drgn import Object
>>> from drgn.helpers.linux.cxl import for_each_cxl_port
>>>
>>> # 모든 CXL port 나열
>>> for port in for_each_cxl_port(prog):
...     print(f"port {port.name}, decoder_count={port.nr_dport}")
port port0, decoder_count=2
port port1, decoder_count=4
>>>
>>> # 특정 region 상태
>>> region = prog["cxl_region_lookup"]("region0")
>>> print(f"size={region.size} interleave={region.interleave_ways}")
size=137438953472 interleave=2
>>>
>>> # HDM Decoder 매핑
>>> for d in port.decoders:
...     print(f"  decoder {d.id}: base={hex(d.hpa_range.start)} size={d.hpa_range.end - d.hpa_range.start}")
```

drgn은 *kdump core*나 *살아 있는 커널* 둘 다에서 동작합니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `cxl_pci_probe`가 호출 안 됨 | `cxl_core` 모듈 미로딩 또는 PCI driver match 실패 |
| `cxl_acpi`만 로딩, `cxl_mem` 없음 | CEDT 항목은 있지만 디바이스 DVSEC 인식 실패 |
| Mailbox timeout 빈번 | 디바이스 busy 또는 firmware bug. `mbox_ready_timeout` 늘림 |
| Region 생성 후 access 시 OOPS | HDM Decoder 미프로그래밍. `cxl create-region` 다시 |
| ftrace에 함수가 안 보임 | inline됨. `noinline` 패치 또는 fprobe 시도 |
| `/sys/bus/cxl` 비어 있음 | `modprobe cxl_acpi` 안 함 또는 ACPI table 결함 |
| drgn `for_each_cxl_port` 빈 리스트 | port가 정말 없음 (드라이버 미로딩) |
| AER 이벤트가 dmesg에 떠도 disconnect | `cxl_pci_err_handler` 활성. driver model 정상 |
| `cxl list -RT` 항목이 lspci보다 적음 | CEDT 부족. kernel parameter `cxl_acpi.debug=1`로 추적 |

## 정리

- CXL 드라이버는 *cxl_acpi·cxl_pci·cxl_core·cxl_mem·cxl_port* 여러 모듈로 분할되어 추적이 까다롭습니다.
- *ftrace function_graph*로 *probe 호출 순서*를 시각화합니다.
- *bpftrace*로 *mailbox 명령 호출과 실패*를 캡처합니다.
- *drgn*으로 *살아 있는 커널의 port·decoder·region 객체*를 Python으로 검사합니다.
- 모듈 의존성을 *항상 먼저 확인* — `cxl_core` 미로딩이 가장 흔한 침묵 실패입니다.

## 다음 장 예고

Ch 9 — drivers/cxl 코드 분석. 드라이버 진입점부터 sysfs까지 *코드 경로*를 본격적으로 분해.

## 관련 항목

- [Ch 3: ftrace와 tracepoints 활용](/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints)
- [Ch 4: eBPF·bpftrace로 커널 디버깅](/blog/tools/debugging/kernel/chapter04-ebpf-kernel)
- [Ch 6: crash와 drgn 분석](/blog/tools/debugging/kernel/chapter06-crash-drgn)
- [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Embedded Debugging Ch 9: CXL 디바이스 트러블슈팅](/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot)
