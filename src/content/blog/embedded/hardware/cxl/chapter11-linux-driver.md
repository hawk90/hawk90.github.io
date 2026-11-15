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

> **CXL PCI 장치의 발견, memdev 등록, decoder commit과 System RAM 추가는 서로 다른 단계입니다. 어느 단계가 성공했는지와 그 단계에서 반환한 오류를 구분해야 합니다.**

이 장의 소스 기준은 [Linux v6.12, commit `adc218676eef`](https://github.com/torvalds/linux/tree/adc218676eef25575469234709c2d87185ca223a/drivers/cxl)입니다. 확인하지 않은 v7.3-rc 코드나 현재 master를 실행 근거로 삼지 않습니다. Linux CXL software 경로를 읽는 것이며 이 판이 CXL 4.0 전체를 구현한다는 뜻은 아닙니다.

[Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 주소와 프로토콜을 봤다면, 여기서는 구성·명령의 성공과 실제 메모리 사용 가능 상태를 나눠 봅니다. 전체 코드 지도를 반복하기보다 probe, commit과 mailbox의 실패 지점을 따라갑니다. 물리 장치나 해당 커널을 실행한 결과는 아닙니다.

## 소스 지도와 자료 구조

| 소스 | 확인할 책임 |
|---|---|
| `drivers/cxl/acpi.c` | ACPI 기반 root와 fixed window 발견 |
| `drivers/cxl/pci.c` | PCI probe, 장치 register·mailbox와 memdev 등록 |
| `drivers/cxl/mem.c`, `port.c` | memdev와 port의 CXL topology 연결 |
| `drivers/cxl/core/hdm.c` | decoder 설정·commit·reset |
| `drivers/cxl/core/region.c` | region 상태와 target·commit·driver binding |
| `drivers/cxl/core/mbox.c` | 공통 mailbox 명령과 출력 검증 |
| `drivers/cxl/core/pci.c` | 이 판의 PCI 오류·RAS 처리 공통부 |
| `drivers/dax/cxl.c`, `kmem.c` | Device DAX와 메모리 hot-add 경로 |

`drivers/cxl/Makefile`은 built-in 구성에서 core, port, platform root, mem/pmem, PCI 순서의 이유를 주석으로 설명합니다. 모듈의 실제 로딩·binding은 의존성과 device 발견에 따릅니다. 소스 파일 개수를 기능 지원 수치나 실행 순서의 증거로 사용하지 않습니다.

이 판의 `cxl_port`·decoder·region 정의는 `drivers/cxl/cxl.h`, `cxl_memdev`·`cxl_dev_state`는 `drivers/cxl/cxlmem.h`에 있습니다. mailbox 공용 정의는 `include/cxl/mailbox.h`입니다. 다른 판의 `regions_lock`·`cxl_rwsem.region` 같은 멤버·이름을 이 판의 struct에 섞지 않습니다.

## PCI probe: 발견과 초기화의 차이

[`cxl_pci_probe()`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/pci.c)의 주요 호출을 실제 소스 순서로 읽습니다. 아래 표는 중간 세부를 생략한 지도이며 모든 함수 호출 목록은 아닙니다.

| 순서 | 주요 호출 | 읽을 점 |
|---|---|---|
| 1 | `pcim_enable_device()`, `pci_set_master()` | PCI 장치 사용을 준비합니다. |
| 2 | `cxl_memdev_state_create()` | 상태를 만든 뒤 DVSEC를 찾습니다. |
| 3 | `pci_find_dvsec_capability()` | Device DVSEC가 없어도 이 위치에서는 경고 후 진행합니다. |
| 4 | register 탐색·매핑, `cxl_pci_type3_init_mailbox()` | memdev register와 선택적 component/RAS 경로를 구분합니다. |
| 5 | `cxl_await_media_ready()` | media 준비 실패를 기록하는 경로와 즉시 fatal return을 구분합니다. |
| 6 | IRQ·`cxl_pci_setup_mailbox()` | IRQ 가능 여부와 mailbox 설정을 처리합니다. |
| 7 | 명령 열거·timestamp·poison·identify | 실제 장치 명령의 실패가 probe에 전파될 수 있습니다. |
| 8 | `cxl_mem_create_range_info()`, `devm_cxl_add_memdev()` | 용량 정보를 만들고 memdev를 등록합니다. |
| 9 | FW upload·sanitize notifier·PMU·event·RAS | 후속 관리 기능을 설정합니다. |

Device DVSEC가 없다는 경고 뒤에도 management에 유용한 초기화가 진행될 수 있습니다. 반대로 memdev 디렉터리가 있다는 사실만으로 decoder·region과 application mapping이 준비된 것은 아닙니다. capability 발견, driver binding, 메모리 노출을 각각 관측해야 합니다.

## Decoder commit: 순서와 실패 복구

[`cxl_decoder_commit()`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/hdm.c)는 이미 enabled이면 바로 반환하고, port의 다음 commit 순서와 decoder ID가 맞지 않으면 `-EBUSY`를 반환합니다. endpoint에서 sanitize가 진행 중인 경우도 거부합니다. source의 조건을 단순히 “모든 commit 실패는 순서 문제”로 축소하지 않습니다.

이 판은 `cxl_dpa_rwsem`을 사용해 interleave·type·base·size와 target 또는 DPA skip을 설정합니다. 이후 commit 상태를 기다리며 오류 시 decoder reset 경로를 호출합니다. 다른 판의 `setup_hw_decoder()`·scoped guard 발췌를 이 판의 실제 함수인 것처럼 싣지 않습니다.

| 관측 지점 | v6.12 소스의 의미 |
|---|---|
| commit 순서 불일치 | `-EBUSY` |
| Commit Error bit | commit bit를 정리하고 `-EIO` |
| Committed bit | 대기 성공 |
| 제한 안에 미완료 | `-ETIMEDOUT` |

`cxld_await_commit()`은 최대 20번 register를 검사하고 중간에 `fsleep(1000)`을 사용합니다. 이는 소스의 대기 정책이며 실제 wall time이 정확히 20 ms라는 측정·보장이 아닙니다. hardware commit 성공도 OS에서 유효한 data를 읽었다는 증거가 아닙니다.

## Region 상태와 메모리 노출

region은 root window, interleave, endpoint DPA·target 구성과 commit 상태를 함께 가집니다. [`commit_store()`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/region.c)는 `cxl_region_rwsem`으로 상태를 보호하고, 준비되지 않은 commit을 거부합니다. cache 무효화와 driver release가 개입하는 경로도 있습니다.

이 판에는 commit 해제·decode reset 코드가 있지만, 사용 중인 메모리를 임의로 되돌려도 안전하다는 뜻은 아닙니다. 반환을 막는 조건, firmware 구성과 잠금, Device DAX mapping·System RAM 사용과 실제 offline 가능 여부를 함께 확인해야 합니다. 이 장은 sysfs에 값을 쓰거나 사용 중인 region을 해제하지 않습니다.

| 상태 | 구분할 증거 |
|---|---|
| memdev 발견 | PCI·CXL device와 용량·capability |
| region 구성·commit | decoder와 target·주소 범위·상태 |
| Device DAX | dax region·device와 사용할 mapping |
| System RAM | kmem binding·hot-add·online·NUMA 상태 |

volatile `ram` region과 Device DAX/System RAM은 같은 분류 축이 아닙니다. firmware가 이미 구성한 region을 OS가 발견하는 경우도 있습니다. `numactl --hardware`의 특정 node 번호를 모든 CXL region의 고정 결과로 기대하지 않습니다.

## Mailbox: transport 성공과 명령 성공

다음은 [v6.12 `cxl_internal_send_cmd()`](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/drivers/cxl/core/mbox.c)의 실제 함수에서 주석·빈 줄만 줄인 발췌입니다. kernel의 struct·상수·하위 함수 문맥이 필요하며 standalone host 프로그램은 아닙니다. 장치에 명령을 보내는 실습으로 실행하지 않습니다.

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

입출력 요청 크기가 payload보다 크면 transport를 호출하기 전에 `-E2BIG`입니다. transport가 성공해도 장치 return code가 성공·background가 아니면 오류로 변환합니다. 출력이 필요한 명령에서 실제 size가 요구한 최소보다 작으면 `-EIO`입니다. 따라서 host 전송 결과와 장치 명령 결과, 반환 데이터 크기는 다른 조건입니다.

실제 `cxl_pci_mbox_send()`는 mailbox mutex를 잡고 register·doorbell 경로를 처리합니다. 이 판의 `CXL_MAILBOX_TIMEOUT_MS` 이름은 `(2 * HZ)`로 정의되어 jiffies 비교에 사용됩니다. 이름만 보고 숫자 2를 millisecond로 해석하면 안 됩니다. background 명령의 후속 대기·sanitize 처리도 따로 확인해야 합니다.

이 함수의 경계 검사는 host에서 추출한 원문과 명시적 mock transport로 확인할 수 있습니다. 이때 오류 변환 helper·struct의 host shim을 사용한 검사는 실제 kernel ABI·mutex·하드웨어 mailbox 실행과 다릅니다. device return code를 조작하는 fault injection은 실습 장치의 상태 변화와 분리해야 합니다.

## RAS와 재시도: 복구 가능이라는 반환의 한계

v6.12의 `pci.c`는 PCI error handler를 등록하고, 실제 공통 오류 처리 본체는 `core/pci.c`에 있습니다. `cxl_error_detected()`는 memdev driver가 없으면 disconnect로 처리하고, 채널 상태와 RAS 결과에 따라 다른 값을 반환합니다.

| 채널 상태·조건 | 처리 결과의 예 |
|---|---|
| normal, uncorrectable 없음 | `CAN_RECOVER` |
| normal, uncorrectable 있음 | memdev driver release 후 `NEED_RESET` |
| frozen | 경고·driver release 후 `NEED_RESET` |
| permanent failure | `DISCONNECT` |

이 반환값은 애플리케이션 데이터의 보존이나 서비스 복귀 성공을 보장하지 않습니다. 소스 자체도 frozen/reset이 CXL.mem 사용에 치명적일 수 있음을 설명합니다. 사용 중인 System RAM에 영향을 주는 실패는 단순히 driver를 다시 bind하면 원상 복구된다고 가정하지 않습니다.

## 안전하게 관측 범위 정하기

Linux 대상에서 다음 명령은 상태를 읽는 예입니다. 이 글은 해당 kernel·device에서 출력한 로그를 제공하지 않으며, 이름은 실제 topology에 맞춰 확인해야 합니다.

```bash
lspci -n
ls /sys/bus/cxl/devices/
cxl list -M -D -T
cxl list -R
daxctl list
```

ftrace·trace event를 추가하면 호출 경로와 반환을 더 볼 수 있지만 trace 자체의 부하와 접근 권한도 고려합니다. 관련 방법은 [CXL 커널 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)과 [driver 코드 워크스루](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)로 이어집니다. 특정 버전의 소스 검색이 현재 mainline의 모든 기능을 검증하는 것은 아닙니다.

## 정리

- PCI probe·memdev 등록·decoder commit·DAX/System RAM 노출을 나눠 봅니다.
- 실제 고정 버전의 함수·struct·lock 이름을 대조합니다.
- commit은 순서·sanitize·hardware error·timeout 등 서로 다른 실패가 있습니다.
- mailbox는 transport 결과, 장치 return code와 출력 크기를 따로 검사합니다.
- commit 해제나 driver recovery 반환은 사용 중인 메모리의 안전한 반환·복구를 보장하지 않습니다.
- source·host mock·kernel guest·물리 장치 실행은 검증 범위가 다릅니다.

다음 [Ch 12: QEMU CXL 에뮬레이션](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에서 에뮬레이터의 topology와 guest driver 관측을 구분합니다.

## 관련 항목

- [Ch 8: CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)
- [Modern Embedded Recipes: Linux CXL 드라이버](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Linux v6.12 CXL sysfs ABI](https://github.com/torvalds/linux/blob/adc218676eef25575469234709c2d87185ca223a/Documentation/ABI/testing/sysfs-bus-cxl)

## 시리즈 자료 출처 안내

이 글은 위 commit의 `drivers/cxl/`·`include/cxl/`·`drivers/dax/`와 ndctl v80 문서를 기준으로 합니다. 소스 경로의 열람·host 함수 검사는 실제 kernel·CXL 장치의 실행이나 최신 기능 지원을 의미하지 않습니다. 전체 자료 정책은 [Ch 1](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내)에 있습니다.
