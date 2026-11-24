---
title: "Ch 11: Linux drivers/cxl/ 분석 — Mainline kernel CXL 구현"
slug: "embedded/hardware/cxl/chapter11-linux-driver"
date: 2026-05-16T09:11:00
description: "고정한 Linux v6.12에서 CXL PCI probe·decoder commit·mailbox 오류 경로와 DAX 노출 단계를 추적합니다."
series: "CXL 4.0 Internals"
seriesOrder: 11
tags: [cxl, linux, drivers, sysfs, hdm-decoder]
draft: false
topics: ["embedded", "embedded/hardware"]
---

## 한 줄 요약

> **CXL PCI 장치의 발견, memdev 등록, decoder commit과 System RAM 추가는 서로 다른 단계입니다. QEMU arm64 게스트에서는 앞의 두 단계가 성공하고 세 번째 단계에서 `-ENXIO`로 멈췄습니다.**

이 장의 소스 인용 기준은 [Linux v6.12, commit `adc218676eef`](https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/cxl)의 파일:행입니다. 실행은 Debian 커널 `6.12.116+deb13-arm64`에서 했고, 인용한 코드가 6.12.116에서 옮겨졌거나 바뀐 곳은 따로 적습니다. 공장 생산 라인에 비유하면 부품 입고(PCI probe), 품번 등록(memdev), 라인 배치(decoder commit), 출하(System RAM)가 각각 다른 검사대를 지납니다. 어느 검사대에서 멈췄는지를 알아야 원인을 찾을 수 있습니다.

## 소스 지도와 자료 구조

| 소스 | 확인할 책임 |
|---|---|
| `drivers/cxl/acpi.c` | ACPI CEDT로 root와 fixed window 발견 |
| `drivers/cxl/pci.c` | PCI probe, 장치 register·mailbox와 memdev 등록, PCI error handler |
| `drivers/cxl/mem.c`, `port.c` | memdev와 port의 CXL topology 연결 |
| `drivers/cxl/core/hdm.c` | decoder 설정·commit·reset |
| `drivers/cxl/core/region.c` | region 상태와 target·commit·driver binding |
| `drivers/cxl/core/mbox.c` | 공통 mailbox 명령과 출력 검증 |
| `drivers/cxl/core/pci.c` | PCI 오류·RAS 처리 공통부 (6.12.116에서는 `core/ras.c`로 이동) |
| `drivers/dax/cxl.c`, `kmem.c` | Device DAX와 메모리 hot-add 경로 |

`drivers/cxl/Makefile`의 주석은 built-in 구성에서 `core` → `port` → platform root(`acpi`) → `mem`·`pmem` → `pci` 순서를 지키는 이유를 적어 둡니다. Debian 커널은 `CONFIG_CXL_BUS=y`, `CONFIG_CXL_PORT=y`이고 `CXL_PCI`·`CXL_ACPI`·`CXL_MEM`·`CXL_PMEM`은 `m`입니다. 그래서 게스트의 `lsmod`에는 `cxl_pmem`·`cxl_mem`·`cxl_pci`·`cxl_acpi` 네 모듈만 보이고 core와 port는 커널 안에 있습니다. 같은 설정에서 `CONFIG_CXL_REGION_INVALIDATION_TEST`는 꺼져 있습니다.

## PCI probe: 발견과 초기화의 차이

`cxl_pci_probe()`(v6.12 `pci.c:810`, 6.12.116에서는 804행)의 주요 호출을 소스 순서로 읽습니다.

| 순서 | 주요 호출 | 읽을 점 |
|---|---|---|
| 1 | `pcim_enable_device()`, `pci_set_master()` | PCI 장치 사용을 준비 |
| 2 | `cxl_memdev_state_create()` | 장치 상태를 만들고 `type`을 `CXL_DEVTYPE_CLASSMEM`으로 둠 (`core/mbox.c:1452`) |
| 3 | `pci_find_dvsec_capability()` | Device DVSEC가 없으면 840-844행에서 경고 후 진행 |
| 4 | register 탐색·매핑, `cxl_pci_type3_init_mailbox()` | memdev register와 component register |
| 5 | `cxl_await_media_ready()` | media 준비 확인 |
| 6 | IRQ, `cxl_pci_setup_mailbox()` | mailbox 설정 |
| 7 | `cxl_enumerate_cmds()`, timestamp, poison, identify | 장치가 지원하는 명령 목록(CEL)을 읽어 둠 |
| 8 | `cxl_mem_create_range_info()`, `devm_cxl_add_memdev()` | 용량 정보를 만들고 memdev 등록 |
| 9 | FW upload, sanitize notifier, PMU, event, `cxl_pci_ras_unmask()` | 후속 관리 기능 |

게스트에서 이 단계가 끝나면 dmesg에 다음이 남습니다.

```text
[   24.355091]  pci0000:0c: host supports CXL
[   25.056769] cxl_pci 0000:0f:00.0: enabling device (0000 -> 0002)
[   25.070060] cxl_pci 0000:10:00.0: enabling device (0000 -> 0002)
```

그리고 `/sys/bus/cxl/devices/`에 `mem0`·`mem1`, endpoint, decoder가 생깁니다([Ch 2](/blog/embedded/hardware/cxl/chapter02-system-architecture)). 여기까지가 "발견"입니다. 이 시점에 endpoint decoder 8개는 모두 `"state":"disabled"`였고, CXL 쪽 NUMA node 1의 크기는 0 MB였습니다.

## Decoder commit: 순서와 실패 복구

[`cxl_decoder_commit()`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/hdm.c)(`core/hdm.c:627`, 6.12.116에서는 620행)는 이미 enabled면 바로 반환하고, port의 다음 commit 순서와 decoder ID가 맞지 않으면 `-EBUSY`를 반환합니다. endpoint에서 sanitize가 진행 중이면 거부합니다. 이후 decoder 레지스터에 interleave·type·base·size와 target 또는 DPA skip을 쓰고 commit 완료를 기다립니다.

| 관측 지점 | v6.12 소스의 의미 |
|---|---|
| commit 순서 불일치 | `-EBUSY` |
| Commit Error bit | commit bit를 정리하고 `-EIO` |
| Committed bit | 대기 성공 |
| 제한 안에 미완료 | `-ETIMEDOUT` |

`cxld_await_commit()`(607-625행)은 `COMMIT_TIMEOUT_MS`(20)번 레지스터를 검사하고, 사이마다 `fsleep(1000)`으로 1 ms씩 쉽니다.

## Region 상태와 메모리 노출

region을 만드는 과정은 [Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 sysfs로 한 단계씩 따라갔습니다. 요약하면 다음과 같습니다.

| 상태 | 게스트에서 본 증거 |
|---|---|
| memdev 발견 | `cxl list -M`에 `mem0`(ram 256 MiB), `mem1`(pmem 256 MiB) |
| region 구성 | `region0`의 `resource 0x10000000000`, 경로의 decoder 세 개가 같은 HPA 범위로 채워짐 |
| region commit | 실패. `echo 1 > commit`이 `No such device or address` |
| Device DAX·System RAM | `daxctl list` 출력 없음, `numactl -H`의 node 1 `size: 0 MB` |

commit 실패의 원인은 커널 경고에 있습니다(타임스탬프와 레지스터 덤프는 줄였습니다).

```text
cxl region0: Failed to synchronize CPU cache state
WARNING: CPU: 0 PID: 879 at drivers/cxl/core/region.c:235 cxl_region_invalidate_memregion.isra.0+0x3c/0x58
Call trace:
 cxl_region_invalidate_memregion.isra.0+0x3c/0x58
 commit_store+0xc8/0x100
```

[`commit_store()`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/region.c)(353행)는 385행에서 `cxl_region_invalidate_memregion()`을 먼저 부르고, 성공해야 390행에서 `cxl_region_decode_commit()`으로 넘어갑니다. 이 함수(226-243행)는 `cpu_cache_has_invalidate_memregion()`이 거짓이고 `CONFIG_CXL_REGION_INVALIDATION_TEST`가 꺼져 있으면 경고를 찍고 `-ENXIO`를 돌려줍니다. v6.12에서 `ARCH_HAS_CPU_CACHE_INVALIDATE_MEMREGION`을 select하는 곳은 `arch/x86/Kconfig:76` 하나라서 arm64에서는 이 경로를 통과할 수 없습니다. 이 함수와 행 번호는 6.12.116에서도 같습니다.

### 실제로 막힌 지점 — cache 무효화

[Ch 12의 arm64 guest 실험](/blog/embedded/hardware/cxl/chapter12-qemu-emulation#guest-linux에서-확인한-것)에서는 memdev 등록과 region의 target·DPA 설정까지 성공했지만 commit은 실패했습니다. Kernel log는 `Failed to synchronize CPU cache state`, Python의 sysfs write 결과는 `OSError: [Errno 6] No such device or address`였고 `commit`을 다시 읽으면 0이었습니다. 이 결과는 Linux **6.12.116+deb13-arm64**에서 얻은 것이며 위 v6.12 함수 설명과 실행 patch 판을 구분합니다.

고정한 v6.12의 `commit_store()`는 decoder hardware commit 전에 `cxl_region_invalidate_memregion()`을 호출합니다. CPU cache 무효화 기능이 없고 테스트 우회 옵션도 꺼져 있으면 여기서 `-ENXIO`로 반환합니다. 따라서 이 사례는 decoder의 Committed bit를 기다리다 생긴 `-ETIMEDOUT`과 다릅니다. 실제 guest에서 `CONFIG_CXL_REGION_INVALIDATION_TEST`는 꺼져 있었고, 이 안전 검사를 우회해 RAM 노출 성공으로 바꾸지 않았습니다. 같은 경로는 [Linux v6.12.116 region.c](https://github.com/gregkh/linux/blob/v6.12.116/drivers/cxl/core/region.c)에서도 확인할 수 있습니다.

## Mailbox: transport 성공과 명령 성공

mailbox 명령은 세 겹의 검사를 지납니다. 커널이 사용자 요청을 받아들일지, 장치가 명령을 성공시켰는지, 돌아온 데이터 크기가 맞는지입니다. 다음은 v6.12 `core/mbox.c:244-283`의 `cxl_internal_send_cmd()`에서 주석·빈 줄만 줄인 발췌입니다(6.12.116에서도 같은 위치·내용).

```c title="cxl-internal-send-kernel.c"
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
	if (WARN_ONCE(rc == -EIO, "Bad return code: -EIO"))
		return -ENXIO;
	if (rc)
		return rc;
	if (mbox_cmd->return_code != CXL_MBOX_CMD_RC_SUCCESS &&
	    mbox_cmd->return_code != CXL_MBOX_CMD_RC_BACKGROUND)
		return cxl_mbox_cmd_rc2errno(mbox_cmd);
	if (!out_size)
		return 0;
	if (min_out == 0)
		min_out = out_size;
	if (mbox_cmd->size_out < min_out)
		return -EIO;
	return 0;
}
```

입출력 크기가 payload보다 크면 transport를 호출하기 전에 `-E2BIG`, transport가 성공해도 장치 return code가 성공·background가 아니면 오류, 출력이 요구한 최소보다 짧으면 `-EIO`입니다.

`CXL_MBOX_CMD_RC_BACKGROUND`도 이 함수에서 성공 반환으로 처리되지만, 이는 명령이 백그라운드 작업으로 접수됐다는 뜻이지 sanitize나 firmware 작업의 완료가 아닙니다. 명령별 상태·완료 event·오류를 후속 경로에서 확인해야 합니다.

사용자 공간에서 보내는 명령은 그보다 앞에서 걸러질 수 있습니다. 게스트에서 `cxl list -m mem0 -H`는 health 필드 없이 끝났는데, libcxl의 debug 로그(`CXL_LOG=debug`)에 이유가 있었습니다.

```text
libcxl: cxl_cmd_do_query: mem0: supports 25 commands
libcxl: cxl_cmd_validate: mem0: Get Health Info: in: 0, out 18, flags: 00000000
libcxl: cxl_cmd_submit: mem0: submitting SEND cmd: in: 0, out: 18
libcxl: cxl_cmd_submit: mem0: got SEND cmd: in: 0, out: 18, retval: -25, status: 0
```

`-25`는 `-ENOTTY`입니다. v6.12 `core/mbox.c:449-450`은 사용자 명령이 `enabled_cmds`에 없으면 `-ENOTTY`를 돌려줍니다. `enabled_cmds`는 probe 7단계의 `cxl_enumerate_cmds()`가 장치의 Command Effects Log에서 채웁니다. QEMU 11.1.3 `hw/cxl/cxl-mailbox-utils.c`의 명령 표(4491-4496행)에는 Health Info·Alerts 그룹(42h) 가운데 Get/Set Alert Configuration만 있고 Get Health Info가 없습니다. 그래서 요청은 장치에 닿기도 전에 커널에서 거부됐고, `status: 0`은 장치가 답한 값이 아닙니다. 이 판의 `CXL_MAILBOX_TIMEOUT_MS`는 `pci.c:42`에서 `(2 * HZ)`로 정의되어 jiffies 단위로 쓰입니다.

## RAS와 재시도: AER에서 CXL.mem 재시작까지

QEMU의 QMP 명령 `cxl-inject-correctable-error`와 `cxl-inject-uncorrectable-errors`로 `mem1`(`10:00.0`)에 CXL RAS 오류를 넣었습니다. 처음에는 아무 일도 일어나지 않았습니다. 장치의 AER 레지스터를 보면 이유가 보입니다.

```text
UESta:	... UncorrIntErr+ ...
UEMsk:	... UncorrIntErr+ ...
CEMsk:	... AdvNonFatalErr+ CorrIntErr+ HeaderOF+
```

CXL RAS 오류는 PCIe AER의 *internal error*로 올라오는데, 상태 비트는 섰지만 mask가 걸려 있어 root port로 메시지가 가지 않았습니다(`aerdrv` 인터럽트 0). v6.12에서 internal error를 unmask하는 `pci_aer_unmask_internal_errors()`는 `drivers/pci/pcie/aer.c:1066-1073`의 `cxl_rch_enable_rcec()`, 곧 CXL 1.1 방식(RCH) RCEC에서만 호출됩니다. `cxl_pci_ras_unmask()`(`pci.c:525`)는 CXL RAS capability의 mask만 풀고 PCIe AER mask는 건드리지 않습니다. 이 VH 토폴로지에서는 internal error가 기본 mask 상태로 남습니다.

시험을 위해 `setpci`로 `10:00.0`의 AER Uncorrectable Mask bit 22와 Correctable Mask bit 14를 직접 풀고 다시 넣었습니다. 아래 두 로그는 타임스탬프와 일부 줄(`error status/mask`, 오류 유형 줄)을 줄였습니다. correctable 오류는 이렇게 보고됐습니다.

```text
pcieport 0000:0c:00.0: AER: Correctable error message received from 0000:10:00.0
cxl_pci 0000:10:00.0: PCIe Bus Error: severity=Correctable, type=Transaction Layer, (Receiver ID)
cxl_pci 0000:10:00.0:    [14] CorrIntErr
```

uncorrectable 오류는 복구 경로 전체를 탔습니다.

```text
pcieport 0000:0c:00.0: AER: Uncorrectable (Fatal) error message received from 0000:10:00.0
cxl_pci 0000:10:00.0: mem1: frozen state error detected, disable CXL.mem
pcieport 0000:0e:01.0: AER: Downstream Port link has been reset (0)
cxl_pci 0000:10:00.0: mem1: restart CXL.mem after slot reset
cxl_pci 0000:10:00.0: mem1: error resume successful
pcieport 0000:0e:01.0: AER: device recovery successful
```

`cxl monitor`에는 `cxl_aer_uncorrectable_error` event가 `"status":128,"first_error":128`과 QMP로 넣은 header log(3, 4, …, 18)를 담아 기록됐습니다. 128은 bit 7이고, CXL 3.1 §8.2.4.17.1에서 Uncorrectable Error Status의 bit 7은 Mem_Data_ECC입니다. correctable event의 `"status":2`는 §8.2.4.17.4의 bit 1, Mem_Data_ECC입니다.

이 순서는 v6.12 소스와 그대로 맞습니다. `cxl_error_detected()`(`core/pci.c:921`, 6.12.116에서는 `core/ras.c:142`)는 채널 상태별로 다음을 돌려줍니다.

| 채널 상태·조건 | 처리 결과 |
|---|---|
| memdev driver 없음 | `DISCONNECT` |
| normal, uncorrectable 없음 | `CAN_RECOVER` |
| normal, uncorrectable 있음 | memdev driver release 후 `NEED_RESET` |
| frozen | "frozen state error detected, disable CXL.mem" 경고, driver release 후 `NEED_RESET` (956-961행) |
| permanent failure | `DISCONNECT` |

slot reset 뒤에는 `cxl_slot_reset()`(`pci.c:961`, 6.12.116에서는 957행)이 "restart CXL.mem after slot reset"을 찍고(967행) memdev를 다시 붙입니다. 게스트에서 복구 후 `cxl list -M`에 `mem1`이 그대로 있었습니다. 다만 이 장치에는 region이 없어 사용 중인 메모리가 없었으므로, 복구 성공이 데이터 보존을 보여 주지는 않습니다.

## 관측 명령 모음

이 장에서 실제로 쓴 상태 조회 명령입니다.

```bash
lspci -nn
lsmod | grep -E 'cxl|dax|nvdimm'
ls /sys/bus/cxl/devices/
cxl list -vvv
cxl list -R -i -u
CXL_LOG=debug cxl list -m mem0 -H
journalctl -u cxl-monitor -o cat
```

Debian의 `cxl` 81 패키지는 `cxl-monitor.service`를 켜 두므로, trace event JSON은 journal에서 바로 읽을 수 있습니다. 관련 방법은 [CXL 커널 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)과 [driver 코드 워크스루](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)로 이어집니다.

## 정리

- PCI probe·memdev 등록·decoder commit·DAX/System RAM 노출은 서로 다른 단계입니다. arm64 게스트에서는 commit에서 멈췄습니다.
- commit 실패는 `region.c:385`의 CPU cache 무효화 단계에서 났고, v6.12에서 그 기능을 선언하는 아키텍처는 x86뿐입니다.
- decoder commit은 순서·sanitize·hardware error·timeout으로 실패할 수 있고, 대기는 1 ms씩 20번입니다.
- mailbox는 커널의 명령 허용(`enabled_cmds`), 장치 return code, 출력 크기를 따로 검사합니다. QEMU가 CEL에 없는 Get Health Info는 `-ENOTTY`로 거부됐습니다.
- CXL RAS 오류는 AER internal error mask가 풀려야 보고되고, 풀린 뒤에는 frozen → slot reset → resume 경로로 복구됐습니다.

다음 [Ch 12: QEMU CXL 에뮬레이션](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에서 에뮬레이터의 topology와 guest driver 관측을 구분합니다.

## 관련 항목

- [Ch 8: CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)
- [Modern Embedded Recipes: Linux CXL 드라이버](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Linux v6.12 CXL sysfs ABI](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/ABI/testing/sysfs-bus-cxl)

## 시리즈 자료 출처 안내

이 글은 위 commit의 `drivers/cxl/`(6.12.116 stable tree와 대조), `drivers/pci/pcie/aer.c`, ndctl v81, QEMU 11.1.3 소스와 Debian 13 arm64 게스트에서 얻은 dmesg·sysfs·`cxl` 출력을 근거로 합니다. 실제 CXL 하드웨어는 쓰지 않았습니다. 전체 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
