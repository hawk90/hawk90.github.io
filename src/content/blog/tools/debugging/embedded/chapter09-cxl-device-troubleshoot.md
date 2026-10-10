---
title: "CXL 디바이스 트러블슈팅 — RAS 이벤트·Poison List·Media Error 추적"
slug: "tools/debugging/embedded/chapter09-cxl-device-troubleshoot"
date: 2026-06-18T09:02:00
description: "CXL 디바이스의 RAS(Reliability·Availability·Serviceability) 이벤트와 poison list·media error를 추적하는 진단 흐름."
series: "Embedded Debugging"
seriesOrder: 9
tags: [cxl, ras, poison, media-error, debugging, mailbox]
draft: false
topics: ["tools", "tools/debugging"]
---

## 왜 별도 진단이 필요한가

[Ch 8](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)에서 *링크 자체*를 봤습니다. 링크가 정상이어도 *디바이스 측에서 문제*가 발생할 수 있습니다. DRAM ECC error, refresh failure, media wear 같은 *디바이스 내부 이상*은 *링크 진단으로 안 보입니다*.

CXL은 *Event Log*와 *poison list 메커니즘*으로 *디바이스 측 진단 정보*를 호스트에 노출합니다.

## Event Log 네 종류

CXL 디바이스는 이벤트를 *네 개의 Event Log*에 나눠 쌓습니다. Linux 드라이버는 로그마다 interrupt 설정을 따로 두고(`info_settings`·`warn_settings`·`failure_settings`·`fatal_settings`), trace 출력에는 아래 이름을 씁니다(`drivers/cxl/core/trace.h`의 `cxl_event_log_type_str`).

| 로그 | 커널 enum | trace 문자열 |
|------|-----------|-------------|
| Informational | `CXL_EVENT_TYPE_INFO` | `Informational` |
| Warning | `CXL_EVENT_TYPE_WARN` | `Warning` |
| Failure | `CXL_EVENT_TYPE_FAIL` | `Failure` |
| Fatal | `CXL_EVENT_TYPE_FATAL` | `Fatal` |

드라이버는 이벤트 interrupt를 받으면 `cxl_event_thread()`(`drivers/cxl/pci.c`)에서 Event Status 레지스터를 읽고, 해당 로그를 `cxl_mem_get_event_records()`로 가져옵니다. 이때 쓰는 mailbox 명령이 Get Event Records(0x0100)와 Clear Event Records(0x0101)입니다.

## CXL Mailbox로 상태 확인

디바이스 health는 Get Health Info(mailbox opcode 0x4200)로 읽고, `cxl list`의 `-H`(`--health`)가 이를 보여 줍니다. ndctl 문서(`Documentation/cxl/cxl-list.txt`)의 예시:

```bash
# cxl list -m mem0 -H
[
  {
    "memdev":"mem0",
    "pmem_size":268435456,
    "ram_size":268435456,
    "health":{
      "maintenance_needed":true,
      "performance_degraded":true,
      "hw_replacement_needed":true,
      "media_normal":false,
      "media_not_ready":false,
      "media_persistence_lost":false,
      "media_data_lost":true,
      "media_powerloss_persistence_loss":false,
      "media_shutdown_persistence_loss":false,
      "media_persistence_loss_imminent":false,
      "media_powerloss_data_loss":false,
      "media_shutdown_data_loss":false,
      "media_data_loss_imminent":false,
      "ext_life_used":"normal",
      "ext_temperature":"critical",
      "ext_corrected_volatile":"warning",
      "ext_corrected_persistent":"normal",
      "life_used_percent":15,
      "temperature":25,
      "dirty_shutdowns":10,
      "volatile_errors":20,
      "pmem_errors":30
    }
  }
]
```

이벤트는 `cxl monitor`로 봅니다. 커널이 내보내는 CXL trace event를 JSON으로 바꿔 표준 출력이나 로그 파일(`--daemon --log=<file>`)에 씁니다.

```bash
$ cxl monitor
$ cxl monitor --daemon --log=/var/log/cxl-monitor.log
```

## Poison List 추적

*Poison List*는 *디바이스가 poison으로 표시한 주소 범위의 리스트*입니다. Get Poison List의 mailbox opcode는 0x4300입니다. `cxl list`의 `-L`(`--media-errors`)이 이를 읽어 `media_errors`로 붙입니다. `source`는 External, Internal, Injected, Vendor Specific, Unknown 중 하나입니다(CXL 3.1 Table 8-140). ndctl 문서의 예시:

```bash
# cxl list -m mem9 --media-errors -u
{
  "memdev":"mem9",
  "pmem_size":"1024.00 MiB (1073.74 MB)",
  "pmem_qos_class":42,
  "ram_size":"1024.00 MiB (1073.74 MB)",
  "ram_qos_class":42,
  "serial":"0x5",
  "numa_node":1,
  "host":"cxl_mem.5",
  "media_errors":[
    {
      "offset":"0x40000000",
      "length":64,
      "source":"Injected"
    }
  ]
}
```

memdev로 조회하면 `offset`은 디바이스 DPA, region으로 조회하면 region 시작 기준입니다. `--media-errors`는 ndctl을 `-Dlibtracefs=enabled`로 빌드했을 때만 쓸 수 있습니다.

테스트용 poison 주입·제거는 `cxl inject-media-poison`과 `cxl clear-media-poison`입니다. 주소는 DPA로 줍니다.

```bash
# cxl clear-media-poison mem0 -a 0x1000
poison cleared at mem0:0x1000
```

## Linux 통합 — sysfs·debugfs

poison 관련 커널 인터페이스(`Documentation/ABI/testing/sysfs-bus-cxl`, `debugfs-cxl`):

| 경로 | 동작 |
|------|------|
| `/sys/bus/cxl/devices/memX/trigger_poison_list` | `true`를 쓰면 드라이버가 디바이스에서 poison list를 가져와 `cxl_poison` trace event로 기록. 기능을 지원하는 디바이스에만 보임 (v6.4) |
| `/sys/kernel/debug/cxl/memX/inject_poison` | DPA에 64바이트 poison 주입 (테스트 전용 인터페이스) |
| `/sys/kernel/debug/cxl/memX/clear_poison` | DPA의 poison 제거 |

## bpftrace로 이벤트 추적

CXL AER 이벤트 발생 빈도를 memdev별로 셉니다. `cxl_aer_uncorrectable_error`·`cxl_aer_correctable_error` tracepoint의 필드는 `memdev`, `host`, `serial`, `status` 등입니다(`drivers/cxl/core/trace.h`).

```bash
$ bpftrace -e '
  tracepoint:cxl:cxl_aer_uncorrectable_error {
    @ue[str(args->memdev)] = count();
  }
  tracepoint:cxl:cxl_aer_correctable_error {
    @ce[str(args->memdev)] = count();
  }
  interval:s:60 {
    print(@ue);
    print(@ce);
    clear(@ue);
    clear(@ce);
  }
'
```

## 이벤트 처리 주체 — OS냐 펌웨어냐

이벤트 로그를 OS가 처리할지는 플랫폼이 정합니다. `cxl_event_config()`(`drivers/cxl/pci.c`)는 host bridge의 `native_cxl_error`가 꺼져 있으면(BIOS가 CXL error reporting 제어권을 쥔 경우) 이벤트 처리를 하지 않습니다. 주석의 설명대로 *한 주체만* event record를 처리할 수 있기 때문입니다. 제어권이 OS에 있으면 드라이버가 Set Event Interrupt Policy(0x0103)로 네 로그 모두 MSI/MSI-X를 요청하고 interrupt를 등록합니다. 별도 사용자 명령으로 켜는 단계는 없습니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `cxl monitor`에 이벤트가 안 나옴 | host bridge `native_cxl_error`가 꺼져 펌웨어가 이벤트를 처리 — 드라이버가 event 처리를 건너뜀 |
| dmesg "No interrupt support, disable event processing." | MSI/MSI-X 벡터를 못 얻어 이벤트 처리 비활성 |
| dmesg "FW still in control of Event Logs despite _OSC settings" | _OSC는 OS 제어인데 디바이스 interrupt policy가 펌웨어 모드 — `-EBUSY` |
| `cxl list --media-errors` 사용 불가 | ndctl이 libtracefs 없이 빌드됨 |
| `trigger_poison_list`가 없음 | 디바이스가 poison list 기능을 지원하지 않음 |

## 진단 워크플로

1. `cxl list -m memX -H` — 디바이스 health 확인
2. `cxl list -m memX -L` — poison list(media error) 추적
3. `cxl monitor` — CXL trace event 모니터링
4. `dmesg | grep -i cxl` — 드라이버 메시지
5. `bpftrace`로 AER 이벤트 빈도 분석
6. 장기 추적: `life_used_percent`, `dirty_shutdowns`, media error 수

## 정리

- CXL 디바이스 트러블슈팅은 *링크 디버깅과 별개* — *디바이스 측 Event Log와 poison list*를 봐야 합니다.
- Event Log는 *Informational·Warning·Failure·Fatal* 네 종류이고, 드라이버는 interrupt를 받아 Get Event Records(0x0100)로 가져옵니다.
- health는 `cxl list -H`(Get Health Info, 0x4200), poison은 `cxl list -L`(Get Poison List, 0x4300)로 봅니다.
- 이벤트 처리 주체는 플랫폼의 `native_cxl_error` 설정이 정합니다.
- 운영에서는 *media error 수·`life_used_percent`·`dirty_shutdowns`*를 *장기 추적*해 디바이스 교체를 판단합니다.

## 다음 장 예고

Embedded Debugging 시리즈에 *CXL 관련 추가 챕터는 여기까지*. 다음 깊이는 *Kernel Debugging Ch 8~9*의 *드라이버 코드 디버깅*과 *Memory Diagnostics Ch 6~7*의 *메모리 진단·tiered memory*로 자연 분산됩니다.

## 관련 항목

- [Ch 8: CXL Link Training 디버깅](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)
