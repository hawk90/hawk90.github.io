---
title: "drivers/cxl 코드 분석 — 진입점부터 sysfs까지"
slug: "tools/debugging/kernel/chapter09-drivers-cxl-walkthrough"
date: 2026-06-18T09:04:00
description: "Linux kernel drivers/cxl/ 디렉터리 — 모듈별 entry point·핵심 자료구조·sysfs interface 코드 워크스루."
series: "Kernel Debugging"
seriesOrder: 9
tags: [cxl, kernel-source, drivers, sysfs, cxl-core, code-walkthrough]
draft: false
topics: ["tools", "tools/debugging"]
---

## 디렉터리 구조

mainline(v7.3-rc6 기준) `drivers/cxl/` 주요 파일:

| 파일·디렉터리 | 모듈 | 역할 |
|-------------|------|------|
| acpi.c | cxl_acpi | ACPI CEDT 파싱, CXL root·root decoder 등록 |
| pci.c | cxl_pci | PCI 드라이버, 레지스터 매핑·mailbox·memdev 생성 |
| mem.c | cxl_mem | memdev 드라이버, endpoint port 연결 |
| pmem.c·security.c | cxl_pmem | persistent memory·보안 명령 |
| port.c | cxl_port | port 드라이버 |
| core/port.c | cxl_core | port·dport·decoder 객체, CXL bus |
| core/region.c | cxl_core | region 생성·target attach·commit |
| core/memdev.c | cxl_core | memdev 객체·char device |
| core/hdm.c | cxl_core | HDM decoder 레지스터 읽기·프로그래밍 |
| core/mbox.c | cxl_core | mailbox 명령 공통부 |
| core/regs.c | cxl_core | component·device 레지스터 탐색·매핑 |
| core/ras.c | cxl_core | RAS capability, PCI error handler 본체 |
| core/pmem.c | cxl_core | LIBNVDIMM 연결용 nvdimm bridge·nvdimm 객체 |
| core/suspend.c | suspend.o (`CONFIG_CXL_SUSPEND`) | 활성 CXL 메모리 카운터(`cxl_mem_active()`). `cxl_core`와 별도 object |

## 모듈 구성과 순서

`cxl_core`가 공통 기반이고 나머지는 그 위에 올라갑니다. `drivers/cxl/Makefile`은 built-in일 때의 순서를 주석으로 밝혀 둡니다.

| 순서 | 대상 | Makefile 주석이 밝힌 이유 |
|------|------|------|
| 1 | `core/` (cxl_core) | 기본 초기화 |
| 2 | cxl_port | CXL root port를 바로 enable하려고 platform root 드라이버(acpi)보다 먼저 |
| 3 | cxl_acpi | platform root |
| 4 | cxl_pmem, cxl_mem | endpoint 드라이버보다 먼저, memdev를 바로 enable |
| 5 | cxl_pci | 마지막. 하드웨어 열거 계층과 같은 순서 |

모듈로 빌드했다면 `modprobe`가 심볼 의존성(`cxl_core` 등)을 알아서 먼저 올립니다. `cxl_acpi`는 `MODULE_SOFTDEP("pre: cxl_port")`로 `cxl_port`를 먼저 올리게 해 둡니다.

## 진입점 — 모듈별 init

각 모듈의 초기화 함수(발췌):

```c
// drivers/cxl/acpi.c
static int __init cxl_acpi_init(void)
{
	return platform_driver_register(&cxl_acpi_driver);
}
subsys_initcall_sync(cxl_acpi_init);

// drivers/cxl/pci.c
static int __init cxl_pci_driver_init(void)
{
	int rc;

	rc = pci_register_driver(&cxl_pci_driver);
	if (rc)
		return rc;

	rc = cxl_cper_register_work(&cxl_cper_work);
	if (rc)
		pci_unregister_driver(&cxl_pci_driver);

	return rc;
}
module_init(cxl_pci_driver_init);

// drivers/cxl/mem.c
module_cxl_driver(cxl_mem_driver);
```

각 모듈이 *다른 bus*에 드라이버를 등록합니다 — `cxl_acpi`는 platform bus, `cxl_pci`는 PCI bus, `cxl_mem`·`cxl_port`는 CXL bus(`cxl_driver_register()`). `cxl_acpi`는 `module_init()`이 아니라 `subsys_initcall_sync()`를 씁니다. 소스 주석은 dax_hmem이 'Soft Reserved' CXL 범위를 보기 전에 올라와야 하기 때문이라고 설명합니다.

## 핵심 자료 구조

주요 struct와 정의 위치(mainline v7.3-rc6):

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

PCI 오류 처리는 probe에서 등록하지 않고, 드라이버 구조체의 정적 `cxl_error_handlers`가 맡습니다. ftrace function_graph로 이 흐름을 볼 수 있습니다([Ch 8](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)).

## HDM Decoder commit 코드

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

## Region 생성 sysfs path

사용자가 `cxl create-region` 했을 때 cxl-cli가 sysfs에 쓰는 순서와 커널 쪽 경로(`drivers/cxl/core/region.c`):

| 단계 | 사용자 동작 | 커널 쪽 |
|------|-----|-----|
| 1 | root decoder의 `create_ram_region`을 읽어 새 region 이름을 얻고, 그 이름을 다시 씀 | `create_ram_region_store()` → `__create_region()` → `devm_cxl_add_region()` → `cxl_region_alloc()` |
| 2 | region의 `interleave_ways`·`interleave_granularity`·`size` 설정 | 각 attribute의 store 함수 |
| 3 | `target0`, `target1`, …에 endpoint decoder 이름 쓰기 | `__attach_target()` → `cxl_region_attach()` |
| 4 | `commit`에 1 쓰기 | `commit_store()` → `__commit()` → `cxl_region_decode_commit()` |
| 5 | (커널) endpoint부터 root 쪽으로 각 port의 decoder commit | `commit_decoder()` → `cxld->commit()` = `cxl_decoder_commit()` |
| 6 | region을 cxl_region 드라이버에 bind | `cxl_region_probe()` → RAM이면 `devm_cxl_add_dax_region()` |

endpoint decoder의 DPA 할당(`dpa_size`·`mode`)은 3단계 전에 해 둬야 하고, cxl-cli가 이를 대신해 줍니다. region을 System RAM으로 올리는 것은 commit이 아니라 6단계 뒤 dax·kmem 드라이버입니다.

## Mailbox API 구현

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

## 에러 처리 — pci_error_handlers

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

## NUMA 통합 — dax와 kmem

region이 바로 System RAM이 되지는 않습니다. RAM region은 `devm_cxl_add_dax_region()`으로 *dax region*이 되고, 메모리로 붙이는 건 `drivers/dax/kmem.c`가 합니다.

| 단계 | 위치 | 동작 |
|------|------|------|
| 1 | `drivers/dax/cxl.c` | `phys_to_target_node()`로 region 시작 주소의 NUMA 노드 결정 |
| 2 | `drivers/dax/kmem.c` | `mt_calc_adistance()`로 abstract distance 계산, memory tier 타입 지정 |
| 3 | `drivers/dax/kmem.c` | `__add_memory_driver_managed()`로 메모리 hot-add |

dax 장치가 `system-ram` 모드면 kmem이 붙어 `numactl --hardware`에 노드가 보입니다. `daxctl reconfigure-device -m system-ram`이 이 전환입니다. `cxl_region_probe()`는 이미 System RAM으로 올라간 범위면 dax region을 만들지 않습니다.

## 동시성 — Lock 사용

| Lock | 위치 | 보호 대상 |
|------|------|----------|
| `cxl_rwsem.region` | `core/core.h` | region 구성·decoder commit (쓰기), 조회 (읽기) |
| `cxl_rwsem.dpa` | `core/core.h` | DPA 할당 |
| `cxlrd->regions_lock` | `cxl_root_decoder` | region 발견·생성·삭제 동기화 |
| `cxl_mbox->mbox_mutex` | `cxl_mailbox` | mailbox 직렬화 |
| `mds->event.log_lock` | `cxlmem.h` | event 버퍼·로그 사용 |

`lockdep_assert_held_write(&cxl_rwsem.region)`이 region.c 곳곳에 있어, lockdep을 켜면 잠금 없이 들어온 경로가 경고로 드러납니다.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `cxl_decoder_commit()` -EBUSY | 같은 port의 decoder를 번호 순서대로 commit하지 않음 ("out of order commit") |
| `cxl_decoder_commit()` -ETIMEDOUT | Committed 비트가 `COMMIT_TIMEOUT_MS`(20)회·1 ms 간격 안에 서지 않음 |
| `cxl_decoder_commit()` -EIO | decoder의 Commit Error 비트가 섬 |
| Lockdep WARNING | `cxl_rwsem.region`을 잡지 않고 region 경로에 들어옴 (`lockdep_assert_held_write`) |
| `commit`에 0 쓰기가 -EPERM | 플랫폼이 잠근 region(`CXL_REGION_F_LOCK`) |
| dmesg "mailbox timeout (opcode: …)" | doorbell이 2초(`CXL_MAILBOX_TIMEOUT_MS`) 안에 내려가지 않음 |

## 정리

- `drivers/cxl/`는 *cxl_core를 기반으로 cxl_port·cxl_acpi·cxl_pmem·cxl_mem·cxl_pci*가 올라가는 구조입니다.
- 진입점은 모듈별 초기화 함수이고, 각각 *다른 bus(platform·PCI·CXL)*에 드라이버를 등록합니다.
- 핵심 자료구조는 *cxl_port·cxl_decoder·cxl_region·cxl_memdev·cxl_mailbox 등 8가지*입니다.
- *HDM Decoder commit*은 port마다 *번호 순서로* 진행하고, `cxld_await_commit()`이 Committed 비트를 기다립니다. `cxl_rwsem.region`은 호출 쪽이 잡습니다.
- *Region 생성*은 `create_ram_region` → 파라미터 → `targetN` attach → `commit` → probe → dax → kmem. System RAM 추가는 commit이 아니라 dax·kmem 단계입니다.
- *Mailbox*는 `mbox_mutex`로 직렬화되고, doorbell 대기는 공통 2초입니다. 명령별로 다른 것은 background 명령의 poll 간격과 횟수입니다.
- PCI error handler는 채널 상태에 따라 `CAN_RECOVER`·`NEED_RESET`·`DISCONNECT`를 돌려줍니다.

## 다음 장 예고

Kernel Debugging 시리즈의 *CXL 관련 추가 챕터는 여기까지*. 다음 깊이는 *Memory Diagnostics*와 *Postmortem Debugging*에 분산된 챕터로 자연 연결.

## 관련 항목

- [Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)
- [Linux drivers/cxl/ source on kernel.org](https://elixir.bootlin.com/linux/latest/source/drivers/cxl)
