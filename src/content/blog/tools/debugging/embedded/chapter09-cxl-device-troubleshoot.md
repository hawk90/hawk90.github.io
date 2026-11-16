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

[Ch 8](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)에서 링크와 등록을 봤습니다. 링크가 정상이어도 디바이스 *내부*에서 문제가 생길 수 있습니다. 메모리 매체의 오류나 손상된 주소는 링크 진단으로는 보이지 않고, CXL이 정의한 *Event Log*와 *poison list*를 통해 호스트에 알려집니다.

이 장은 Linux 드라이버가 그 정보를 어떻게 가져오는지 소스로 확인하고, QEMU의 CXL type-3 장치에 오류를 *주입*해 실제로 어떤 출력이 나오는지 봅니다.

## 실험 환경

8장과 같은 QEMU 11.1.3 TCG 게스트(Debian 13.7, 커널 6.12.116+deb13-arm64, cxl-cli 81, bpftrace v0.23.2)입니다. 오류는 QEMU의 QMP 명령(`qapi/cxl.json`의 `cxl-inject-poison`, `cxl-inject-general-media-event`, `cxl-inject-uncorrectable-errors`, `cxl-inject-correctable-error`)과 Linux debugfs로 주입했습니다. 장치 경로는 `/machine/peripheral/cxl-vmem0`입니다.

## Event Log 네 종류

CXL 디바이스는 이벤트를 네 개의 Event Log에 나눠 쌓습니다. Linux 드라이버는 로그마다 interrupt 설정을 따로 두고(`info_settings`·`warn_settings`·`failure_settings`·`fatal_settings`), trace 출력에는 아래 이름을 씁니다(v6.12.116 `drivers/cxl/core/trace.h`의 `cxl_event_log_type_str`).

| 로그 | 커널 enum | trace 문자열 |
|------|-----------|-------------|
| Informational | `CXL_EVENT_TYPE_INFO` | `Informational` |
| Warning | `CXL_EVENT_TYPE_WARN` | `Warning` |
| Failure | `CXL_EVENT_TYPE_FAIL` | `Failure` |
| Fatal | `CXL_EVENT_TYPE_FATAL` | `Fatal` |

드라이버는 이벤트 interrupt를 받으면 `cxl_event_thread()`(`drivers/cxl/pci.c`)에서 Event Status 레지스터를 읽고, `cxl_mem_get_event_records()`(`drivers/cxl/core/mbox.c`)로 로그를 가져옵니다. 쓰는 mailbox 명령은 `drivers/cxl/cxlmem.h`의 `CXL_MBOX_OP_GET_EVENT_RECORD`(0x0100)와 `CXL_MBOX_OP_CLEAR_EVENT_RECORD`(0x0101)입니다.

### 실제로 받은 이벤트

QMP로 Informational 로그에 General Media 이벤트를 넣자, 커널 trace에 interrupt 스레드가 처리한 레코드가 찍혔습니다(줄 끝 일부 생략).

```text
 irq/60-0000:0d:-655     [001] .N...   208.424024: cxl_general_media: memdev=mem0 host=0000:0d:00.0 serial=5 log=Informational : time=1794816409283840244 uuid=fbcd0a77-c260-417f-85a9-088b1621eba6 len=128 flags='0x1' handle=1 related_handle=0 maint_op_class=0 : dpa=1000 dpa_flags='' descriptor='UNCORRECTABLE_EVENT|THRESHOLD_EVENT' type='0x3' transaction_type='0xc0' channel=0 rank=0 device=0 comp_id
```

주입한 값(`dpa` 4096 = 0x1000, `descriptor` 3, `type` 3, `transaction-type` 192 = 0xc0)이 그대로 해석돼 나왔고, 이벤트를 처리한 것이 `irq/60-0000:0d:` 스레드라는 점에서 interrupt 경로로 왔음을 알 수 있습니다.

## 이벤트 처리 주체 — OS냐 펌웨어냐

이벤트를 OS가 처리할지는 플랫폼이 정합니다. `cxl_event_config()`(`drivers/cxl/pci.c`)는 host bridge의 `native_cxl_error`가 꺼져 있으면 바로 돌아갑니다. 코드 주석은 "BIOS가 CXL error reporting 제어권을 가지면 BIOS가 event record를 처리한다. 한 주체만 할 수 있다"고 적습니다. 제어권이 OS에 있으면 드라이버가 Set Event Interrupt Policy(`CXL_MBOX_OP_SET_EVT_INT_POLICY`, 0x0103)로 네 로그 모두 `CXL_INT_MSI_MSIX`를 요청합니다(`cxl_event_config_msgnums()`).

이 실험의 게스트는 부팅 로그에 다음 줄이 있었고, 그래서 위 이벤트가 OS로 왔습니다.

```text
[    1.161007] acpi ACPI0016:00: _OSC: OS now controls [CXLMemErrorReporting]
```

## CXL Mailbox로 상태 확인

디바이스 health는 Get Health Info(`CXL_MBOX_OP_GET_HEALTH_INFO`, 0x4200)로 읽고, `cxl list`의 `-H`(`--health`)가 이를 보여 줍니다. 아래는 [ndctl `cxl-list` 문서](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-list.txt)에 실린 예시입니다(이 장에서 받은 출력이 아닙니다).

```text
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
      ...
      "life_used_percent":15,
      "temperature":25,
      "dirty_shutdowns":10,
      "volatile_errors":20,
      "pmem_errors":30
    }
  }
]
```

같은 명령을 QEMU 장치에 돌렸더니 `health` 블록이 *아예 없었습니다*.

```text
$ cxl list -m mem0 -H -u
{
  "memdev":"mem0",
  "ram_size":"256.00 MiB (268.44 MB)",
  "serial":"0x5",
  "host":"0000:0d:00.0",
  "firmware_version":"BWFW VERSION 00"
}
```

원인은 장치 쪽입니다. QEMU v11.1.3 `hw/cxl/cxl-mailbox-utils.c`의 명령 표에서 0x42 그룹(`HEALTH_INFO_ALERTS`)은 `GET_ALERT_CONFIG`·`SET_ALERT_CONFIG`만 구현돼 있고 Get Health Info(0x4200)가 없습니다. `-vvv`로 보면 alert config(`"life_used_crit_alert_threshold":75` 등)는 나왔습니다. **오류 없이 health 키만 빠진다**는 점이 함정입니다. 스크립트가 `health`를 기대한다면 키가 없을 때를 따로 처리해야 합니다.

### cxl monitor

`cxl monitor`는 커널의 CXL trace event를 JSON으로 바꿔 출력합니다([ndctl `cxl-monitor` 문서](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-monitor.txt)). 데몬 모드로 시작했을 때는 로그에 다음 오류만 남고 이벤트가 기록되지 않았습니다.

```text
[1794816406.155104849] [744] cxl monitor daemon started.
[1794816406.168690740] [744] tracefs_instance_file_open() err: -1
```

원인은 확인하지 못했습니다. 포그라운드로 `cxl monitor`를 돌리자 이벤트가 JSON 한 줄씩 나왔습니다.

```text
{"system":"cxl","event":"cxl_general_media","timestamp":249011110000,"memdev":"mem0","host":"0000:0d:00.0","log":1,"hdr_uuid":"fbcd0a77-c260-417f-85a9-088b1621eba6","serial":5,"hdr_flags":1,...,"dpa":8192,"descriptor":1,"type":0,"transaction_type":1,...}
{"system":"cxl","event":"cxl_poison","timestamp":351928082000,"memdev":"mem0","host":"0000:0d:00.0","serial":5,"trace_type":1,...,"dpa":8192,"dpa_length":64,...,"source":0,"flags":0}
```

(`...`는 생략한 키입니다.) 데몬 모드를 쓴다면, 로그 파일에 `daemon started` 다음 줄이 무엇인지 반드시 확인해야 합니다.

## Poison List 추적

Poison list는 *디바이스가 손상됐다고 표시한 주소 범위의 목록*입니다. Get Poison List의 mailbox opcode는 `CXL_MBOX_OP_GET_POISON`(0x4300)이고, inject·clear는 0x4301·0x4302입니다(`cxlmem.h`). `cxl list`의 `-L`(`--media-errors`)이 이 목록을 `media_errors`로 붙입니다.

### 주입과 조회

두 경로로 poison을 넣었습니다. QMP `cxl-inject-poison`으로 DPA 0x1000에 64바이트, Linux debugfs `inject_poison`으로 DPA 0x2000입니다.

```text
$ echo 0x2000 > /sys/kernel/debug/cxl/mem0/inject_poison
$ echo 1 > /sys/bus/cxl/devices/mem0/trigger_poison_list
$ cxl list -m mem0 -L -u
{
  "memdev":"mem0",
  ...
  "media_errors":[
    {
      "offset":"0x2000",
      "length":64,
      "source":"Injected"
    },
    {
      "offset":"0x1000",
      "length":64,
      "source":"Internal"
    }
  ]
}
```

같은 "주입"인데 `source`가 다릅니다. debugfs는 드라이버가 Inject Poison mailbox 명령을 보내는 경로라 `Injected`이고(커널 ABI 문서 `debugfs-cxl`도 "error source is set to Injected"라고 적습니다), QMP는 QEMU가 장치 모델 안에서 직접 레코드를 만들며, v11.1.3 `hw/mem/cxl_type3.c`의 `qmp_cxl_inject_poison()`이 그 레코드의 type을 `CXL_POISON_TYPE_INTERNAL`로 넣기 때문에 `Internal`로 보였습니다. 테스트에서 source로 걸러 낸다면 어떤 경로로 넣었는지에 따라 결과가 달라집니다. `source` 문자열은 커널 `trace.h`의 `__show_poison_source`(Unknown, External, Internal, Injected, Vendor)와 같고, ndctl 문서는 그 정의를 "CXL Specification v3.1 Table 8-140"으로 들고 있습니다. 이 장에서 CXL 명세 원문은 열람하지 못했습니다.

`offset`은 memdev로 조회하면 디바이스 DPA, region으로 조회하면 region 기준입니다(ndctl 문서). `trigger_poison_list`에 1을 쓰면 드라이버가 목록을 가져와, `cxl_poison` 이벤트 tracing이 켜져 있으면 trace event로 남깁니다(ABI 문서).

```text
            bash-757     [000] .....   222.969116: cxl_poison: memdev=mem0 host=0000:0d:00.0 serial=5 trace_type=List region= region_uuid=00000000-0000-0000-0000-000000000000 hpa=0xffffffffffffffff dpa=0x1000 dpa_length=0x40 source=Internal flags= overflow_time=0
```

`hpa`가 전부 1인 것은 이 DPA가 아직 region에 매핑되지 않아 호스트 주소가 없기 때문입니다(8장에서 `decoders_committed`가 0이었습니다).

### 제거

```text
$ echo 0x1000 > /sys/kernel/debug/cxl/mem0/clear_poison
$ echo 1 > /sys/bus/cxl/devices/mem0/trigger_poison_list
$ cxl list -m mem0 -L -u
  ...
  "media_errors":[
    {
      "offset":"0x2000",
      "length":64,
      "source":"Injected"
    }
  ]
```

0x1000 항목이 사라졌습니다. 이 버전의 cxl-cli 81에는 `inject-media-poison`·`clear-media-poison` 하위 명령이 없어(`cxl --list-cmds`에 없음) debugfs를 썼습니다. ndctl 문서 기준으로 두 명령은 v84부터 문서에 나타나며, 문서의 예는 `cxl clear-media-poison mem0 -a 0x1000` → `poison cleared at mem0:0x1000`입니다.

> ⚠️ **Clear Poison은 데이터 복구 명령이 아닙니다.** v6.12.116 `drivers/cxl/core/memdev.c`의 `cxl_clear_poison()` 주석은 Clear Poison mailbox 명령이 64바이트 write-data를 받으며 "이 드라이버는 write-data로 0을 쓴다"고 적고, ABI 문서도 clear가 그 주소부터 64바이트에 0을 쓴다고 설명합니다. 목록에서 항목이 사라져도 원래 데이터가 돌아오거나 매체가 고쳐진 것이 아닙니다. 운영 데이터라면 먼저 영향받은 데이터를 복구하고 오류 출처를 확인해야 합니다.

## Linux 인터페이스 — sysfs·debugfs

v6.12.116의 ABI 문서(`Documentation/ABI/testing/sysfs-bus-cxl`, `debugfs-cxl`)와 이 게스트에서 확인한 파일입니다.

| 경로 | 동작 | ABI 문서의 KernelVersion |
|------|------|----|
| `/sys/bus/cxl/devices/memX/trigger_poison_list` | `true`를 쓰면 poison list를 가져와 `cxl_poison` trace event로 기록 | v6.4 |
| `/sys/kernel/debug/cxl/memX/inject_poison` | DPA에 64바이트 poison 주입(source = Injected) | v6.4 |
| `/sys/kernel/debug/cxl/memX/clear_poison` | DPA의 poison 제거, 64바이트를 0으로 | v6.4 |

ABI 문서의 `clear_poison` 항목은 경로를 `/sys/kernel/debug/memX/clear_poison`으로 적고 있지만, 이 게스트의 실제 파일은 `/sys/kernel/debug/cxl/mem0/clear_poison`(같은 디렉터리에 `inject_poison`, `dpamem`)이었습니다.

## bpftrace로 이벤트 세기

이 커널의 CXL trace event는 `cxl_aer_correctable_error`, `cxl_aer_uncorrectable_error`, `cxl_dram`, `cxl_general_media`, `cxl_generic_event`, `cxl_memory_module`, `cxl_overflow`, `cxl_poison`이었습니다(`/sys/kernel/tracing/events/cxl/`). `bpftrace -lv`로 본 AER tracepoint의 필드입니다.

```text
tracepoint:cxl:cxl_aer_uncorrectable_error
    __data_loc char[] memdev
    __data_loc char[] host
    u64 serial
    u32 status
    u32 first_error
    u32 header_log[128]
```

처음에는 `memdev` 문자열을 키로 세려 했습니다. 그런데 bpftrace v0.23.2에서 `@gm[str(args.memdev)]`의 키는 빈 문자열(`@gm[]: 1`)이었고, `@gm[args.memdev]`는 `@gm[-68170803908192]: 1` 같은 숫자였습니다. 이 버전에서는 `__data_loc` 문자열 필드를 그렇게 꺼내지 못했습니다. 그래서 `u64 serial`을 키로 썼습니다.

```text
// cxl-serial.bt: count CXL trace events per device serial
tracepoint:cxl:cxl_aer_uncorrectable_error { @ue[args.serial] = count(); }
tracepoint:cxl:cxl_aer_correctable_error   { @ce[args.serial] = count(); }
tracepoint:cxl:cxl_general_media           { @gm[args.serial] = count(); }
interval:s:40 { exit(); }
```

실행 중에 QMP로 General Media 이벤트 하나와 correctable error 하나를 넣은 결과입니다.

```text
Attaching 4 probes...

@gm[5]: 1
```

General Media 이벤트는 serial 5로 잡혔고, `@ce`는 비어 있었습니다. 이 실험에서 QMP `cxl-inject-correctable-error`와 `cxl-inject-uncorrectable-errors`는 둘 다 `{"return": {}}`로 성공을 돌려줬지만, 게스트에는 해당 trace event도 dmesg도 남지 않았습니다. 이 구성에서 AER 경로가 왜 동작하지 않는지는 확인하지 못했습니다.

## 자주 만나는 함정

| 증상 | 원인 (확인한 근거) |
|------|------|
| `cxl list -H`에 `health`가 없음 | 장치가 Get Health Info를 지원하지 않음. 오류 없이 키만 빠짐 (QEMU mailbox 명령 표, 이 장의 실행) |
| `cxl monitor --daemon` 로그에 `tracefs_instance_file_open() err: -1` | 원인 미확인. 포그라운드 실행은 동작 (이 장의 실행) |
| `source`가 `Injected`가 아님 | QEMU QMP `cxl-inject-poison`이 만든 레코드는 `Internal` (`qmp_cxl_inject_poison()`, 이 장의 실행) |
| `cxl monitor`에 이벤트가 안 나옴 | host bridge `native_cxl_error`가 꺼져 펌웨어가 처리 (`cxl_event_config()`) |
| dmesg `No interrupt support, disable event processing.` | MSI/MSI-X 벡터를 못 얻어 이벤트 처리 비활성 (`drivers/cxl/pci.c`) |
| dmesg `FW still in control of Event Logs despite _OSC settings` | _OSC는 OS 제어인데 장치의 interrupt policy가 펌웨어 모드, `-EBUSY` (`drivers/cxl/pci.c`) |
| `trigger_poison_list`가 없음 | 장치가 poison list 기능을 지원하지 않음 (ABI 문서) |
| bpftrace에서 `memdev` 키가 비거나 숫자 | `__data_loc` 문자열 필드. `serial`로 대체 (이 장의 실행, bpftrace v0.23.2) |

## 진단 워크플로

1. `dmesg | grep -i cxl`과 `_OSC` 줄 — 이벤트를 OS가 처리하는가
2. `cxl list -m memX -H` — health. 키가 없으면 장치 지원부터 의심
3. `echo 1 > .../trigger_poison_list` 후 `cxl list -m memX -L` — poison list
4. `cxl monitor` — 이벤트를 JSON으로. 데몬이면 로그의 둘째 줄 확인
5. bpftrace로 serial별 이벤트 수 집계

## 정리

- Event Log는 Informational·Warning·Failure·Fatal 네 종류이고, 드라이버는 interrupt를 받아 Get Event Records(0x0100)로 가져옵니다. QEMU에 넣은 General Media 이벤트가 interrupt 스레드를 거쳐 trace에 찍혔습니다.
- 이벤트를 누가 처리할지는 `native_cxl_error`(_OSC 결과)가 정하며, 이 게스트는 OS가 `CXLMemErrorReporting`을 받았습니다.
- `cxl list -H`는 장치가 Get Health Info를 지원하지 않으면 health를 조용히 생략합니다.
- poison은 debugfs로 넣으면 `Injected`, QEMU QMP로 넣으면 `Internal`로 보였고, clear는 데이터를 복구하지 않고 0을 씁니다.
- bpftrace v0.23.2에서는 CXL tracepoint의 `memdev` 문자열 대신 `serial`로 집계했습니다.

## 다음 장 예고

Embedded Debugging 시리즈에서 CXL을 다루는 장은 여기까지입니다. 드라이버 코드 쪽 디버깅은 [Kernel Debugging Ch 8](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)에서, 메모리 진단 쪽은 [Memory Diagnostics Ch 6](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)에서 이어집니다.

## 관련 항목

- [Ch 8: CXL Link Training 디버깅](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)

## 공식 자료

- [ndctl `cxl list` (v81)](https://github.com/pmem/ndctl/blob/v81/Documentation/cxl/cxl-list.txt)
- [Linux CXL Clear Poison 구현 (`drivers/cxl/core/memdev.c`)](https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/drivers/cxl/core/memdev.c?h=v6.12.116)
- [Linux CXL tracepoint 정의 (`drivers/cxl/core/trace.h`)](https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/drivers/cxl/core/trace.h?h=v6.12.116)
- [Linux CXL event 처리 (`drivers/cxl/pci.c`)](https://git.kernel.org/pub/scm/linux/kernel/git/stable/linux.git/tree/drivers/cxl/pci.c?h=v6.12.116)
- [QEMU CXL QMP 명령 (`qapi/cxl.json`)](https://github.com/qemu/qemu/blob/v11.1.3/qapi/cxl.json)
