---
title: "Ch 11: Linux drivers/cxl/ 분석 — Mainline kernel CXL 구현"
slug: "embedded/hardware/cxl/chapter11-linux-driver"
date: 2026-05-16T09:11:00
description: "Linux mainline CXL subsystem의 코드 구조, probe·region·mailbox 경로."
series: "CXL 4.0 Internals"
seriesOrder: 11
tags: [cxl, linux, drivers, sysfs, hdm-decoder]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **"Linux CXL 드라이버는 *cxl_core*를 공통 기반으로 *cxl_port·cxl_acpi·cxl_pmem·cxl_mem·cxl_pci*가 올라가는 구조입니다."** — 디바이스 인식은 `cxl_pci_probe()`, HDM decoder 프로그래밍은 `core/hdm.c`, region은 `core/region.c`가 맡습니다. 이 장의 코드 인용은 *mainline v7.3-rc6*(2026-10-08) 기준입니다.

[Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 *CXL.mem 프로토콜·HDM Decoder 메커니즘*을 봤습니다. 이 장은 *그게 Linux에서 실제로 어떻게 구현*되는지를 *mainline 코드*로 따라갑니다.

## drivers/cxl/ 디렉토리

v7.3-rc6 기준 주요 파일:

| 경로 | 내용 |
|------|------|
| `acpi.c` | cxl_acpi — ACPI CEDT 파싱, CXL root·root decoder 등록 |
| `pci.c` | cxl_pci — PCI 드라이버, 레지스터 매핑·mailbox·memdev 생성 |
| `mem.c` | cxl_mem — memdev 드라이버, endpoint port 연결 |
| `port.c` | cxl_port — port 드라이버 |
| `pmem.c`·`security.c` | cxl_pmem — persistent memory·보안 명령 |
| `core/port.c` | port·dport·decoder 객체, CXL bus |
| `core/hdm.c` | HDM decoder 레지스터 읽기·프로그래밍 |
| `core/region.c` | region 생성·target attach·commit |
| `core/memdev.c` | memdev 객체·char device |
| `core/mbox.c` | mailbox 명령 공통부 |
| `core/regs.c` | component·device 레지스터 탐색·매핑 |
| `core/ras.c` | RAS capability, PCI error handler 본체 |

`drivers/cxl/` 아래 `.c`·`.h`는 33개입니다. 공용 헤더 일부는 `include/cxl/`에 있습니다(`cxl.h`, `mailbox.h` 등).

## 모듈 구성과 순서

`drivers/cxl/Makefile`은 built-in일 때의 순서를 주석으로 못박아 둡니다.

| 순서 | 대상 | Makefile 주석이 밝힌 이유 |
|------|------|------|
| 1 | `core/` (cxl_core) | 기본 초기화 |
| 2 | cxl_port | CXL root port를 바로 enable하려고 platform root 드라이버(acpi)보다 먼저 |
| 3 | cxl_acpi | platform root |
| 4 | cxl_pmem, cxl_mem | endpoint 드라이버보다 먼저, memdev를 바로 enable |
| 5 | cxl_pci | 마지막. 하드웨어 열거 계층과 같은 순서 |

모듈로 빌드했다면 `modprobe`가 심볼 의존성(`cxl_core` 등)을 알아서 먼저 올립니다.

## 핵심 자료 구조

| Struct | 위치 | 주요 멤버 |
|--------|------|------------|
| `cxl_port` | `drivers/cxl/cxl.h` | `dev`, `dports`·`endpoints`·`regions` (xarray), `nr_dports`, `commit_end` |
| `cxl_decoder` | `drivers/cxl/cxl.h` | `hpa_range`, `interleave_ways`, `interleave_granularity`, `region`, `commit()`·`reset()` |
| `cxl_root_decoder` | `drivers/cxl/cxl.h` | `res`, `qos_class`, `regions_lock`, `cxlsd` |
| `cxl_endpoint_decoder` | `drivers/cxl/cxl.h` | `cxld`, `dpa_res`, `part`, `pos` |
| `cxl_region` | `drivers/cxl/cxl.h` | `cxlrd`, `mode`, `params`(`targets[]`·`nr_targets`·`state`) |
| `cxl_memdev` | `drivers/cxl/cxlmem.h` | `dev`, `cdev`, `cxlds`, `endpoint` |
| `cxl_dev_state` | `include/cxl/cxl.h` | `regs`, `part[]`, `serial`, `cxl_mbox` |
| `cxl_mailbox` | `include/cxl/mailbox.h` | `payload_size`, `mbox_mutex`, `mbox_wait`, `mbox_send()` |

## probe 흐름 추적

`cxl_pci_probe()`(`drivers/cxl/pci.c`)가 부르는 주요 함수, 소스 순서대로:

| 단계 | 함수 | 동작 |
|------|------|------|
| 1 | `pcim_enable_device()` | PCI 디바이스 enable |
| 2 | `pci_find_dvsec_capability()` | CXL Device DVSEC 찾기. 없으면 경고만 하고 CXL.mem 초기화를 건너뜀 |
| 3 | `cxl_memdev_state_create()` | 상태 구조체 할당 |
| 4 | `cxl_pci_setup_regs()` | 레지스터 블록 찾아 매핑 |
| 5 | `cxl_await_media_ready()` | 미디어 준비 대기 |
| 6 | `cxl_alloc_irq_vectors()` | MSI/MSI-X 할당 |
| 7 | `cxl_pci_setup_mailbox()` | mailbox 초기화 |
| 8 | `cxl_enumerate_cmds()` | 지원 명령 목록 조회 |
| 9 | `cxl_set_timestamp()`·`cxl_poison_state_init()` | 시각 설정, poison 상태 초기화 |
| 10 | `cxl_dev_state_identify()` | Identify Memory Device 명령 |
| 11 | `cxl_mem_dpa_fetch()`·`cxl_dpa_setup()` | DPA 파티션 정보 |
| 12 | `devm_cxl_add_classdev()` | memdev 생성, sysfs 등록 |
| 13 | `cxl_event_config()` | 이벤트 로그·인터럽트 설정 |

PCI 오류 처리는 probe에서 등록하지 않고, 드라이버 구조체의 정적 `cxl_error_handlers`가 맡습니다. ftrace function_graph로 이 흐름을 볼 수 있습니다([Kernel Debugging Ch 8 CXL 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)).

## HDM Decoder commit

`drivers/cxl/core/hdm.c`의 `cxl_decoder_commit()` (발췌):

```c
static int cxl_decoder_commit(struct cxl_decoder *cxld)
{
	struct cxl_port *port = to_cxl_port(cxld->dev.parent);
	struct cxl_hdm *cxlhdm = dev_get_drvdata(&port->dev);
	void __iomem *hdm = cxlhdm->regs.hdm_decoder;
	int id = cxld->id, rc;

	if (cxld->flags & CXL_DECODER_F_ENABLE)
		return 0;

	if (cxl_num_decoders_committed(port) != id) {
		dev_dbg(&port->dev,
			"%s: out of order commit, expected decoder%d.%d\n",
			dev_name(&cxld->dev), port->id,
			cxl_num_decoders_committed(port));
		return -EBUSY;
	}

	/* (sanitize 진행 중인 endpoint decoder 거부 — 생략) */

	scoped_guard(rwsem_read, &cxl_rwsem.dpa)
		setup_hw_decoder(cxld, hdm);

	rc = cxld_await_commit(hdm, cxld->id);
	if (rc) {
		dev_dbg(&port->dev, "%s: error %d committing decoder\n",
			dev_name(&cxld->dev), rc);
		return rc;
	}
	port->commit_end++;
	cxld->flags |= CXL_DECODER_F_ENABLE;

	return 0;
}
```

읽을 점:

- 한 port의 decoder는 *번호 순서대로* commit해야 합니다. 순서가 어긋나면 `-EBUSY`.
- 레지스터 쓰기는 `setup_hw_decoder()`가 하고, `cxld_await_commit()`이 Committed 비트를 기다립니다. 1 ms 간격으로 최대 `COMMIT_TIMEOUT_MS`(20)회 확인하고, Commit Error 비트가 서면 `-EIO`, 시간이 다 되면 `-ETIMEDOUT`.
- `cxl_rwsem.region`은 이 함수가 아니라 호출 쪽(region commit 경로)이 쓰기 잠금으로 잡습니다.

## Region 생성 — sysfs 경로

`cxl create-region`이 하는 일을 sysfs와 커널 함수로 풀면:

| 단계 | 사용자 동작 | 커널 쪽 |
|------|-----|-----|
| 1 | root decoder의 `create_ram_region`을 읽어 새 region 이름을 얻고, 그 이름을 다시 씀 | `create_ram_region_store()` → `__create_region()` → `devm_cxl_add_region()` → `cxl_region_alloc()` |
| 2 | region의 `interleave_ways`·`interleave_granularity`·`size` 설정 | 각 attribute의 store 함수 |
| 3 | `target0`, `target1`, …에 endpoint decoder 이름 쓰기 | `__attach_target()` → `cxl_region_attach()` |
| 4 | `commit`에 1 쓰기 | `commit_store()` → `__commit()` → `cxl_region_decode_commit()` |
| 5 | (커널) endpoint부터 root 쪽으로 각 port의 decoder commit | `commit_decoder()` → `cxld->commit()` = `cxl_decoder_commit()` |
| 6 | region을 cxl_region 드라이버에 bind | `cxl_region_probe()` → RAM이면 `devm_cxl_add_dax_region()` |

endpoint decoder의 DPA 할당(`dpa_size`·`mode`)은 3단계 전에 해 둬야 하고, cxl-cli가 이를 대신해 줍니다.

`commit`에 0을 쓰면 reset을 예약해 decoder를 되돌릴 수 있습니다. 단, 플랫폼이 잠근 region(`CXL_REGION_F_LOCK`)은 `-EPERM`으로 거부됩니다.

## Mailbox API

공통 진입점은 `drivers/cxl/core/mbox.c`의 `cxl_internal_send_cmd()`입니다.

```c
int cxl_internal_send_cmd(struct cxl_mailbox *cxl_mbox,
			  struct cxl_mbox_cmd *mbox_cmd)
{
	size_t out_size, min_out;
	int rc;

	if (mbox_cmd->size_in > cxl_mbox->payload_size ||
	    mbox_cmd->size_out > cxl_mbox->payload_size)
		return -E2BIG;

	out_size = mbox_cmd->size_out;
	min_out = mbox_cmd->min_out;
	rc = cxl_mbox->mbox_send(cxl_mbox, mbox_cmd);
	/* ... return code → errno 변환, 출력 크기 검사 ... */
}
```

실제 하드웨어 접근은 `mbox_send`에 꽂힌 `cxl_pci_mbox_send()`(`drivers/cxl/pci.c`)가 합니다.

- `mbox_mutex`를 잡고 `__cxl_pci_mbox_send_cmd()`를 부릅니다. 모든 명령이 이 mutex로 직렬화됩니다.
- payload를 쓰고 doorbell을 울린 뒤, doorbell이 내려가길 *polling*합니다. 한도는 `CXL_MAILBOX_TIMEOUT_MS`로, 정의는 `(2 * HZ)`라 jiffies 단위 2초입니다.
- 디바이스가 *background* 명령으로 응답하면 명령별 `poll_interval_ms`·`poll_count`만큼 기다립니다. Sanitize는 예외로, 비동기로 돌리고 사용자 공간이 poll(2)로 완료를 기다립니다.

자주 쓰는 opcode (`drivers/cxl/cxlmem.h`):

| Opcode | 명령 |
|--------|------|
| 0x0100 | Get Event Records |
| 0x0200 | Get FW Info |
| 0x0201 | Transfer FW |
| 0x4000 | Identify (Memory Device) |
| 0x4102 | Get LSA (Label Storage Area) |
| 0x4103 | Set LSA |
| 0x4200 | Get Health Info |
| 0x4300 | Get Poison List |

## NUMA 통합 — dax와 kmem

region이 바로 System RAM이 되지는 않습니다. RAM region은 `devm_cxl_add_dax_region()`으로 *dax region*이 되고, 메모리로 붙이는 건 `drivers/dax/kmem.c`가 합니다.

| 단계 | 위치 | 동작 |
|------|------|------|
| 1 | `drivers/dax/cxl.c` | `phys_to_target_node()`로 region 시작 주소의 NUMA 노드 결정 |
| 2 | `drivers/dax/kmem.c` | `mt_calc_adistance()`로 abstract distance 계산, memory tier 타입 지정 |
| 3 | `drivers/dax/kmem.c` | `__add_memory_driver_managed()`로 메모리 hot-add |

dax 장치가 `system-ram` 모드면 kmem이 붙어 `numactl --hardware`에 노드가 보입니다. `daxctl reconfigure-device -m system-ram`이 이 전환입니다. `cxl_region_probe()`는 이미 System RAM으로 올라간 범위면 dax region을 만들지 않습니다.

## 에러 처리·RAS

`drivers/cxl/pci.c`의 PCI error handler:

```c
static const struct pci_error_handlers cxl_error_handlers = {
	.error_detected	= cxl_error_detected,
	.slot_reset	= cxl_slot_reset,
	.resume		= cxl_error_resume,
	.cor_error_detected	= cxl_cor_error_detected,
	.reset_done	= cxl_reset_done,
};
```

`cxl_error_detected()`(`drivers/cxl/core/ras.c`)는 RAS capability 레지스터를 읽어 기록한 뒤 채널 상태로 나눕니다.

| 채널 상태 | 반환 |
|-----------|------|
| `pci_channel_io_normal` | uncorrectable이면 memdev 드라이버 해제 후 `NEED_RESET`, 아니면 `CAN_RECOVER` |
| `pci_channel_io_frozen` | "disable CXL.mem" 경고, memdev 드라이버 해제 후 `NEED_RESET` |
| `pci_channel_io_perm_failure` | `DISCONNECT` |

memdev에 드라이버가 붙어 있지 않으면 처리를 포기하고 `DISCONNECT`를 돌려줍니다.

## Lock 사용

| Lock | 위치 | 보호 대상 |
|------|------|----------|
| `cxl_rwsem.region` | `core/core.h` | region 구성·decoder commit (쓰기), 조회 (읽기) |
| `cxl_rwsem.dpa` | `core/core.h` | DPA 할당 |
| `cxlrd->regions_lock` | `cxl_root_decoder` | region 발견·생성·삭제 동기화 |
| `cxl_mbox->mbox_mutex` | `cxl_mailbox` | mailbox 직렬화 |
| `mds->event.log_lock` | `cxlmem.h` | event 버퍼·로그 사용 |

`lockdep_assert_held_write(&cxl_rwsem.region)`이 region.c 곳곳에 있어, lockdep을 켜면 잠금 없이 들어온 경로가 경고로 드러납니다.

## 자주 하는 실수

### "commit하면 region을 되돌릴 수 없다"

*아닙니다*. `commit`에 0을 쓰면 reset을 예약하고 decoder를 되돌립니다. 플랫폼이 잠근 region만 `-EPERM`입니다.

### "region commit이 곧 System RAM 추가"

commit은 decoder 프로그래밍까지입니다. 메모리 hot-add는 region probe → dax region → kmem 단계에서 일어납니다.

### "mailbox timeout은 명령마다 지정한다"

doorbell 대기는 공통 2초 한도입니다. 명령별로 다른 건 background 명령의 poll 간격과 횟수입니다.

### "DVSEC가 없으면 probe가 실패한다"

`cxl_pci_probe()`는 경고만 남기고 계속 진행합니다. 다만 CXL.mem 초기화는 건너뜁니다.

## 최근 mainline에서 볼 것

v7.3-rc6 소스에 들어 있는 것 중 이 시리즈와 관련된 항목:

| 영역 | 내용 |
|------|----------|
| **Type 2 region attach** | `devm_cxl_probe_mem()`·`cxl_memdev_attach_region()` (`drivers/cxl/mem.c`) — Type 2(accelerator + memory) 디바이스가 memdev 생성과 함께 region에 attach하는 경로 |
| **memdev 타입** | `cxl_class_memdev_type` (`core/memdev.c`) |
| **RAS header log** | `CXL_HEADERLOG_SIZE`는 `SZ_64`(RAS capability 크기), trace 이벤트용 `CXL_HEADERLOG_TRACE_SIZE`는 `SZ_512` — rasdaemon이 쓰는 기존 레이아웃을 유지하려고 따로 둠 (`drivers/cxl/cxl.h` 주석) |

> 이 시리즈는 *upstream tracking*(`data/upstream-tracking.yaml` + `audit-upstream-freshness.py`)으로 `drivers/cxl/` 변경을 추적합니다.

## 정리

- `drivers/cxl/`는 *cxl_core*를 기반으로 cxl_port·cxl_acpi·cxl_pmem·cxl_mem·cxl_pci가 올라갑니다.
- `cxl_pci_probe()`: enable → DVSEC → 레지스터 매핑 → media ready → IRQ → mailbox → identify → memdev 생성 → 이벤트 설정.
- HDM decoder는 port마다 *번호 순서로* commit. `commit`에 0을 쓰면 되돌릴 수 있습니다(잠긴 region 제외).
- region: `create_ram_region` → 파라미터 → `targetN` attach → `commit` → probe → dax → kmem.
- mailbox는 `mbox_mutex`로 직렬화, doorbell 대기 2초, background 명령은 명령별 polling.
- PCI error handler는 채널 상태에 따라 `CAN_RECOVER`·`NEED_RESET`·`DISCONNECT`.

## 다음 편

[Ch 12: QEMU CXL 에뮬레이션 — 노트북에서 CXL 개발](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에서 *QEMU 8.0+의 CXL Type 3 에뮬레이션*과 *드라이버 검증 워크플로*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 8: CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)
- [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Kernel Debugging Ch 9: drivers/cxl 코드 분석](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)

## 시리즈 자료 출처 안내

본 글은 *Linux Kernel `drivers/cxl/` 소스 (GPL)*를 1차 자료로 합니다. 코드 인용은 *오픈소스 GPL 라이선스*에 따른 자유 분석·인용입니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
