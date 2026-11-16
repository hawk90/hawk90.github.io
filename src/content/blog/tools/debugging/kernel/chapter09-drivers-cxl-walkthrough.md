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

이 장의 기준은 Linux **v6.12**(kernel.org `linux-6.12.tar.xz`)입니다. [Ch 8](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)에서 실제로 돌린 Debian 커널(6.12.116)과 같은 계열이라, 여기서 읽은 함수 이름을 Ch 8의 ftrace·bpftrace에 그대로 넣을 수 있습니다. mainline 최신 트리와는 자료구조 이름이 다른 곳이 있어서(예: v6.12의 잠금은 `cxl_region_rwsem`·`cxl_dpa_rwsem` 두 개), 다른 버전을 읽을 때는 그 트리에서 다시 확인해야 합니다.

`drivers/cxl/` 주요 파일:

| 파일·디렉터리 | 모듈 | 역할 |
|-------------|------|------|
| acpi.c | cxl_acpi | ACPI CEDT 파싱, CXL root·root decoder 등록 |
| pci.c | cxl_pci | PCI 드라이버, 레지스터 매핑·mailbox·memdev 생성 |
| mem.c | cxl_mem | memdev 드라이버, endpoint port 연결 |
| pmem.c·security.c | cxl_pmem | persistent memory·보안 명령 |
| port.c | cxl_port | port 드라이버 |
| core/port.c | cxl_core | port·dport·decoder 객체, CXL bus |
| core/region.c | cxl_core (`CONFIG_CXL_REGION`) | region 생성·target attach·commit |
| core/memdev.c | cxl_core | memdev 객체·char device |
| core/hdm.c | cxl_core | HDM decoder 레지스터 읽기·프로그래밍 |
| core/mbox.c | cxl_core | mailbox 명령 공통부 |
| core/regs.c | cxl_core | component·device 레지스터 탐색·매핑 |
| core/pci.c | cxl_core | DVSEC·RAS 처리, PCI error handler 본체 |
| core/pmem.c | cxl_core | LIBNVDIMM 연결용 nvdimm bridge·nvdimm 객체 |
| core/cdat.c, core/pmu.c, core/trace.c | cxl_core | CDAT, PMU, tracepoint (`trace.c`는 `CONFIG_TRACING`) |
| core/suspend.c | suspend.o (`CONFIG_CXL_SUSPEND`) | 활성 CXL 메모리 카운터. `cxl_core`와 별도 object |

모듈 구성은 `drivers/cxl/core/Makefile`의 `cxl_core-y` 목록에서 확인했습니다. v6.12에는 `core/ras.c`가 없고, RAS 처리는 `core/pci.c`에 있습니다.

## 모듈 구성과 순서

`cxl_core`가 공통 기반이고 나머지는 그 위에 올라갑니다. `drivers/cxl/Makefile`(v6.12, 3~9행)은 built-in일 때의 순서를 주석으로 밝혀 둡니다.

| 순서 | 대상 | Makefile 주석이 밝힌 이유 |
|------|------|------|
| 1 | `core/` (cxl_core) | 기본 초기화 |
| 2 | cxl_port | CXL root port를 바로 enable하려고 platform root 드라이버(acpi)보다 먼저 |
| 3 | cxl_acpi | platform root |
| 4 | cxl_pmem, cxl_mem | endpoint 드라이버보다 먼저, memdev를 바로 enable |
| 5 | cxl_pci | 마지막. 하드웨어 열거 계층과 같은 순서 |

모듈로 빌드했다면 `modprobe`가 심볼 의존성(`cxl_core` 등)을 알아서 먼저 올립니다. `cxl_acpi`는 `MODULE_SOFTDEP("pre: cxl_port")`(`acpi.c:932`)로 `cxl_port`를 먼저 올리게 해 둡니다. Debian 6.12 설정은 `CONFIG_CXL_BUS=y`, `CONFIG_CXL_PORT=y`, `CONFIG_CXL_PCI=m`, `CONFIG_CXL_ACPI=m`, `CONFIG_CXL_MEM=m`이라, core와 port는 커널에 들어 있고 나머지 셋만 모듈입니다.

## 진입점 — 모듈별 init

각 모듈의 초기화 함수(v6.12 발췌):

```c
// drivers/cxl/acpi.c:914~926
static int __init cxl_acpi_init(void)
{
	return platform_driver_register(&cxl_acpi_driver);
}
...
/* load before dax_hmem sees 'Soft Reserved' CXL ranges */
subsys_initcall(cxl_acpi_init);

// drivers/cxl/pci.c:1070~1083, 1092
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

// drivers/cxl/mem.c:251
module_cxl_driver(cxl_mem_driver);

// drivers/cxl/port.c:211~219
static int __init cxl_port_init(void)
{
	return cxl_driver_register(&cxl_port_driver);
}
subsys_initcall(cxl_port_init);
```

각 모듈이 *다른 bus*에 드라이버를 등록합니다. `cxl_acpi`는 platform bus, `cxl_pci`는 PCI bus, `cxl_mem`·`cxl_port`는 CXL bus(`cxl_driver_register()`)입니다. `cxl_acpi`와 `cxl_port`는 `module_init()`이 아니라 `subsys_initcall()`을 쓰고, `cxl_acpi` 쪽 주석은 그 이유를 "dax_hmem이 'Soft Reserved' CXL 범위를 보기 전에 로드"라고 적어 둡니다.

## 핵심 자료 구조

주요 struct와 정의 위치(v6.12):

| Struct | 위치 | 주요 멤버 |
|--------|------|------------|
| `cxl_decoder` | `drivers/cxl/cxl.h:352` | `hpa_range`, `interleave_ways`, `interleave_granularity`, `region`, `commit()`·`reset()` |
| `cxl_endpoint_decoder` | `drivers/cxl/cxl.h:409` | `cxld`, `dpa_res`, `skip`, `mode`, `state`, `pos` |
| `cxl_root_decoder` | `drivers/cxl/cxl.h:449` | `res`, `region_id`, `hpa_to_spa`, `range_lock`, `qos_class`, `cxlsd` |
| `cxl_region_params` | `drivers/cxl/cxl.h:489` | `state`, `interleave_ways`, `interleave_granularity`, `res`, `targets[]`, `nr_targets` |
| `cxl_region` | `drivers/cxl/cxl.h:528` | `dev`, `id`, `mode`, `type`, `flags`, `params` |
| `cxl_port` | `drivers/cxl/cxl.h:604` | `dev`, `dports`·`endpoints`·`regions` (xarray), `nr_dports`, `commit_end` |
| `cxl_memdev` | `drivers/cxl/cxlmem.h:49` | `dev`, `cdev`, `cxlds`, `endpoint` |
| `cxl_dev_state` | `drivers/cxl/cxlmem.h:432` | `regs`, `dpa_res`, `pmem_res`, `ram_res`, `serial`, `cxl_mbox` |
| `cxl_mailbox` | `include/cxl/mailbox.h:18` | `host`, `payload_size`, `mbox_mutex`, `mbox_wait`, `mbox_send()` |

v6.12의 `cxl_dev_state`는 RAM·PMEM 범위를 `ram_res`·`pmem_res`로 따로 둡니다. Ch 8의 drgn 예제가 읽는 `cxl_port.nr_dports`, `cxl_region.params.interleave_ways`도 이 표의 필드입니다.

## probe 흐름 추적

`cxl_pci_probe()`(`drivers/cxl/pci.c:810`)가 부르는 주요 함수를 소스 순서대로 적었습니다.

| 단계 | 함수 | 실패 시 |
|------|------|---------|
| 1 | `pcim_enable_device()`·`pci_set_master()` | probe 실패 |
| 2 | `cxl_memdev_state_create()`, `pci_set_drvdata()` | probe 실패 |
| 3 | `pci_get_dsn()`으로 serial, `pci_find_dvsec_capability()`로 CXL Device DVSEC | DVSEC 없으면 `Device DVSEC not present, skip CXL.mem init` 경고 후 계속 |
| 4 | `cxl_pci_setup_regs(…MEMDEV…)`·`cxl_map_device_regs()` | probe 실패 |
| 5 | `cxl_pci_setup_regs(…COMPONENT…)`, RAS 레지스터 매핑 | `No component registers` 경고 후 계속 |
| 6 | `cxl_pci_type3_init_mailbox()` | probe 실패 |
| 7 | `cxl_await_media_ready()` | `Media not active` 경고 후 계속 |
| 8 | `cxl_alloc_irq_vectors()`·`cxl_pci_setup_mailbox()` | mailbox 설정 실패면 probe 실패 |
| 9 | `cxl_enumerate_cmds()` | probe 실패 |
| 10 | `cxl_set_timestamp()`·`cxl_poison_state_init()` | probe 실패 |
| 11 | `cxl_dev_state_identify()` | probe 실패 (Identify 명령) |
| 12 | `cxl_mem_create_range_info()` | probe 실패 |
| 13 | `devm_cxl_add_memdev()` | probe 실패 (memdev 등록) |
| 14 | `devm_cxl_setup_fw_upload()`·`devm_cxl_sanitize_setup_notifier()` | probe 실패 |
| 15 | PMU regblock 순회·`devm_cxl_pmu_add()` | `dev_dbg` 후 계속 |
| 16 | `cxl_event_config()`, `cxl_pci_ras_unmask()`, `pci_save_state()` | event 설정 실패면 probe 실패 |

DVSEC·component register·media ready는 경고만 남기고 계속 가지만, mailbox와 Identify는 실패하면 probe 전체가 실패합니다. Ch 8에서 QEMU의 에뮬레이션 장치로 이 흐름을 function_graph로 확인했습니다. PCI 오류 처리는 probe에서 등록하지 않고, 드라이버 구조체의 정적 `cxl_error_handlers`(`pci.c:1006`)가 맡습니다.

## HDM Decoder commit 코드

`drivers/cxl/core/hdm.c:627`의 `cxl_decoder_commit()`(v6.12, 레지스터 쓰기 부분은 줄임):

```c
static int cxl_decoder_commit(struct cxl_decoder *cxld)
{
	struct cxl_port *port = to_cxl_port(cxld->dev.parent);
	struct cxl_hdm *cxlhdm = dev_get_drvdata(&port->dev);
	void __iomem *hdm = cxlhdm->regs.hdm_decoder;
	int id = cxld->id, rc;
	...
	if (cxld->flags & CXL_DECODER_F_ENABLE)
		return 0;

	if (cxl_num_decoders_committed(port) != id) {
		dev_dbg(&port->dev,
			"%s: out of order commit, expected decoder%d.%d\n",
			dev_name(&cxld->dev), port->id,
			cxl_num_decoders_committed(port));
		return -EBUSY;
	}

	/* endpoint decoder이고 sanitize 진행 중이면 -EBUSY (생략) */

	down_read(&cxl_dpa_rwsem);
	/* CTRL·BASE·SIZE 레지스터, switch면 target list, endpoint면 skip 쓰기 (생략) */
	writel(ctrl, hdm + CXL_HDM_DECODER0_CTRL_OFFSET(id));
	up_read(&cxl_dpa_rwsem);

	port->commit_end++;
	rc = cxld_await_commit(hdm, cxld->id);
	if (rc) {
		dev_dbg(&port->dev, "%s: error %d committing decoder\n",
			dev_name(&cxld->dev), rc);
		cxld->reset(cxld);
		return rc;
	}
	cxld->flags |= CXL_DECODER_F_ENABLE;

	return 0;
}
```

읽을 점:

- 한 port의 decoder는 *번호 순서대로* commit해야 합니다. 순서가 어긋나면 `-EBUSY`입니다.
- v6.12에서는 레지스터 쓰기가 이 함수 안에 있고, 그동안 `cxl_dpa_rwsem`을 읽기로 잡습니다.
- `cxld_await_commit()`(606~625행)은 `COMMIT_TIMEOUT_MS`(20)번, 매번 `fsleep(1000)`(1 ms)을 쉬며 Committed 비트를 확인합니다. Commit Error 비트가 서면 `-EIO`, 시간이 다 되면 `-ETIMEDOUT`이고, 실패하면 `cxld->reset()`으로 되돌립니다.
- v6.12에서는 `commit_end`를 Committed 비트를 기다리기 *전에* 올립니다.
- `cxl_region_rwsem`은 이 함수가 아니라 호출 쪽(region `commit_store()`)이 쓰기 잠금으로 잡습니다.

## Region 생성 sysfs path

사용자가 `cxl create-region` 했을 때 cxl-cli가 sysfs에 쓰는 순서와 커널 쪽 경로(`drivers/cxl/core/region.c`, v6.12):

| 단계 | 사용자 동작 | 커널 쪽 |
|------|-----|-----|
| 1 | root decoder의 `create_ram_region`에 새 region 이름을 씀 | `create_ram_region_store()`(2560행) → `__create_region()`(2514행) → `devm_cxl_add_region()`(2459행) → `cxl_region_alloc()`(2335행) |
| 2 | region의 `interleave_ways`·`interleave_granularity`·`size` 설정 | 각 attribute의 store 함수 |
| 3 | `target0`, `target1`, …에 endpoint decoder 이름 쓰기 | `attach_target()`(2110행): `cxl_region_rwsem` 쓰기 + `cxl_dpa_rwsem` 읽기 → `cxl_region_attach()`(1873행) |
| 4 | `commit`에 1 쓰기 | `commit_store()`(353행) → `cxl_region_invalidate_memregion()`(226행) → `cxl_region_decode_commit()`(307행) |
| 5 | (커널) endpoint부터 root 쪽으로 각 port의 decoder commit | `commit_decoder()`(291행) → `cxld->commit()` = `cxl_decoder_commit()` |
| 6 | region을 cxl_region 드라이버에 bind | `cxl_region_probe()`(3387행) → RAM이면 `devm_cxl_add_dax_region()`(3156행) |

4단계의 `cxl_region_invalidate_memregion()`은 CPU 캐시를 그 주소 범위에 대해 무효화할 수 없으면(`cpu_cache_has_invalidate_memregion()`이 거짓) `CONFIG_CXL_REGION_INVALIDATION_TEST`가 없는 한 경고와 함께 `-ENXIO`를 돌려줍니다(226~243행). [Postmortem Ch 5](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)에서 본 것처럼 v6.12 arm64에서는 이 기능을 select하는 아키텍처 설정이 없어서, 사용자 공간에서 만든 region이 이 단계에서 커밋되지 않습니다. endpoint decoder의 DPA 할당(`dpa_size`·`mode`)은 3단계 전에 해 둬야 하고, cxl-cli가 이를 대신해 줍니다. region을 System RAM으로 올리는 것은 commit이 아니라 6단계 뒤 dax·kmem 드라이버입니다.

## Mailbox API 구현

공통 진입점은 `drivers/cxl/core/mbox.c:244`의 `cxl_internal_send_cmd()`입니다.

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

실제 하드웨어 접근은 `mbox_send`에 꽂힌 `cxl_pci_mbox_send()`(`pci.c:425`에서 연결)가 합니다.

- `mbox_mutex`를 잡고(`mutex_lock_io`, 382행) `__cxl_pci_mbox_send_cmd()`를 부릅니다. 모든 명령이 이 mutex로 직렬화됩니다.
- payload를 쓰고 doorbell을 울린 뒤, doorbell이 내려가길 `cpu_relax()`로 *polling*합니다(`cxl_pci_mbox_wait_for_doorbell()`, 56~75행). 한도는 `CXL_MAILBOX_TIMEOUT_MS`로, 정의(42행)는 `(2 * HZ)`라 이름과 달리 jiffies 단위 2초입니다. 넘기면 `-ETIMEDOUT`이고 `mailbox timeout` 메시지가 찍힙니다(272행).
- 디바이스가 *background* 명령으로 응답하면 명령별 `poll_interval_ms`·`poll_count`만큼 기다립니다(320~331행). Sanitize는 예외로, 비동기로 돌리고 사용자 공간이 poll(2)로 완료를 기다립니다(298~314행 주석과 코드).
- 초기화 때 mailbox ready를 기다리는 시간은 별도의 모듈 파라미터 `mbox_ready_timeout`(기본 60초, 53~55행)입니다.

자주 쓰는 opcode (`drivers/cxl/cxlmem.h:519~543`):

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

`drivers/cxl/pci.c:1006`의 PCI error handler:

```c
static const struct pci_error_handlers cxl_error_handlers = {
	.error_detected	= cxl_error_detected,
	.slot_reset	= cxl_slot_reset,
	.resume		= cxl_error_resume,
	.cor_error_detected	= cxl_cor_error_detected,
	.reset_done	= cxl_reset_done,
};
```

`cxl_error_detected()`(`drivers/cxl/core/pci.c:921`)는 RAS capability 레지스터를 읽어 기록한 뒤(`cxl_handle_endpoint_ras()`) 채널 상태로 나눕니다.

| 채널 상태 | 반환 |
|-----------|------|
| `pci_channel_io_normal` | uncorrectable이면 memdev 드라이버 해제 후 `NEED_RESET`, 아니면 `CAN_RECOVER` |
| `pci_channel_io_frozen` | `frozen state error detected, disable CXL.mem` 경고, memdev 드라이버 해제 후 `NEED_RESET` |
| `pci_channel_io_perm_failure` | `failure state error detected, request disconnect` 경고 후 `DISCONNECT` |

memdev에 드라이버가 붙어 있지 않으면 `memdev disabled, abort error handling`을 남기고 `DISCONNECT`를 돌려줍니다.

## NUMA 통합 — dax와 kmem

region이 바로 System RAM이 되지는 않습니다. RAM region은 `devm_cxl_add_dax_region()`으로 *dax region*이 되고, 메모리로 붙이는 건 `drivers/dax/kmem.c`가 합니다.

| 단계 | 위치 (v6.12) | 동작 |
|------|------|------|
| 1 | `drivers/dax/cxl.c:12` | `phys_to_target_node()`로 region 시작 주소의 NUMA 노드 결정 |
| 2 | `drivers/dax/kmem.c:92~93` | `mt_calc_adistance()`로 abstract distance 계산, `kmem_find_alloc_memory_type()`으로 memory tier 타입 지정 |
| 3 | `drivers/dax/kmem.c:170` | `add_memory_driver_managed()`로 메모리 hot-add |

dax 장치가 `system-ram` 모드면 kmem이 붙어 `numactl --hardware`에 노드가 보입니다. `daxctl reconfigure-device -m system-ram`이 이 전환입니다. `cxl_region_probe()`는 이미 System RAM으로 올라간 범위면(`walk_iomem_res_desc()`로 확인) dax region을 만들지 않습니다.

## 동시성 — Lock 사용

| Lock | 위치 (v6.12) | 보호 대상 |
|------|------|----------|
| `cxl_region_rwsem` | `core/core.h:93` | region 구성·decoder commit (쓰기), 조회 (읽기) |
| `cxl_dpa_rwsem` | `core/core.h:92` | DPA 할당. commit 중 읽기로 잡음 |
| `cxlrd->range_lock` | `cxl_root_decoder` | 같은 HPA로 여러 스레드가 `construct_region()`에 들어오는 것을 막음 (`region.c:3327~3339`) |
| `cxl_mbox->mbox_mutex` | `cxl_mailbox` | mailbox 직렬화 |
| `mds->event.log_lock` | `cxlmem.h:239` | event 버퍼·로그 사용 |

`lockdep_assert_held_write(&cxl_region_rwsem)`이 region.c에 6곳 있어, lockdep을 켜면 잠금 없이 들어온 경로가 경고로 드러납니다. Debian 배포판 커널은 `CONFIG_PROVE_LOCKING`이 꺼져 있으므로([Ch 1](/blog/tools/debugging/kernel/chapter01-user-kernel-boundary)) 이 검사는 디버그 빌드에서만 동작합니다.

## 자주 만나는 함정

| 증상 | 원인 (v6.12 소스) |
|------|------|
| `cxl_decoder_commit()` -EBUSY | 같은 port의 decoder를 번호 순서대로 commit하지 않음 (`out of order commit`), 또는 sanitize 진행 중 |
| `cxl_decoder_commit()` -ETIMEDOUT | Committed 비트가 20번·1 ms 간격 안에 서지 않음 |
| `cxl_decoder_commit()` -EIO | decoder의 Commit Error 비트가 섬 |
| region `commit`이 -ENXIO, `Failed to synchronize CPU cache state` | `cpu_cache_has_invalidate_memregion()`이 거짓 (v6.12 arm64) |
| Lockdep WARNING | `cxl_region_rwsem`을 잡지 않고 region 경로에 들어옴 (`lockdep_assert_held_write`) |
| dmesg `mailbox timeout (opcode: …)` | doorbell이 2초(`CXL_MAILBOX_TIMEOUT_MS`) 안에 내려가지 않음 |

## 정리

- `drivers/cxl/`는 *cxl_core를 기반으로 cxl_port·cxl_acpi·cxl_pmem·cxl_mem·cxl_pci*가 올라가는 구조입니다. Debian 6.12에서는 core·port가 built-in, 나머지가 모듈입니다.
- 진입점은 모듈별 초기화 함수이고, 각각 *다른 bus(platform·PCI·CXL)*에 드라이버를 등록합니다.
- 위 표의 struct 9개가 v6.12 drivers/cxl의 뼈대입니다.
- *HDM Decoder commit*은 port마다 *번호 순서로* 진행하고, `cxld_await_commit()`이 Committed 비트를 최대 20 ms 기다립니다. 잠금은 commit이 `cxl_dpa_rwsem`(읽기), 호출 쪽이 `cxl_region_rwsem`(쓰기)입니다.
- *Region 생성*은 `create_ram_region` → 파라미터 → `targetN` attach → `commit`(캐시 무효화 포함) → probe → dax → kmem입니다. v6.12 arm64는 캐시 무효화 단계에서 막힙니다.
- *Mailbox*는 `mbox_mutex`로 직렬화되고, doorbell 대기는 공통 2초입니다. 명령별로 다른 것은 background 명령의 poll 간격과 횟수입니다.
- PCI error handler는 채널 상태에 따라 `CAN_RECOVER`·`NEED_RESET`·`DISCONNECT`를 돌려줍니다.

## 다음 장 예고

Kernel Debugging 시리즈의 CXL 챕터는 여기까지입니다. 더 깊은 내용은 Memory Diagnostics와 Postmortem Debugging 시리즈의 CXL 챕터로 이어집니다.

## 소스 기준과 실행 범위

모든 파일:줄은 Linux v6.12(`linux-6.12.tar.xz`, kernel.org `sha256sums.asc`로 검증)의 `drivers/cxl/Makefile`, `drivers/cxl/{acpi,pci,mem,port}.c`, `drivers/cxl/cxl.h`, `drivers/cxl/cxlmem.h`, `drivers/cxl/core/{Makefile,core.h,hdm.c,mbox.c,pci.c,region.c}`, `include/cxl/mailbox.h`, `drivers/dax/{cxl,kmem}.c`와 대조했습니다. 발췌 코드를 따로 빌드하지는 않았습니다. 실제 장치 대신 QEMU CXL Type 3 에뮬레이션에서 본 probe·mailbox 동작은 Ch 8에 있고, decoder commit·region 생성의 실패 사례는 Postmortem Ch 5에 있습니다.

## 관련 항목

- [Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)
- [Linux v6.12 drivers/cxl/ (elixir)](https://elixir.bootlin.com/linux/v6.12/source/drivers/cxl)
