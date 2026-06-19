---
title: "Linux CXL 드라이버 분석 — cxl_pci·cxl_core·region·DAX"
date: 2026-06-18T09:03:00
description: "Linux kernel 6.x의 CXL 서브시스템 — cxl_pci·cxl_core·cxl_mem·region·DAX 모듈의 역할과 probe 흐름."
series: "Modern Embedded Recipes"
seriesOrder: 151
tags: [recipes, linux, cxl, kernel-driver, dax, sysfs]
draft: false
---

## 한 줄 요약

> **"Linux CXL 드라이버는 *cxl_acpi → cxl_pci → cxl_core → cxl_mem*의 의존성 체인으로 동작합니다."** 어느 한 모듈만 로딩 안 돼도 *침묵하며 동작 안* 합니다.

## drivers/cxl/ 디렉터리

mainline kernel 6.x의 `drivers/cxl/` 대략 구조:

```text
drivers/cxl/
├── Kconfig·Makefile
├── acpi.c        — cxl_acpi: ACPI CEDT 파싱, root port 등록
├── pci.c         — cxl_pci: PCI subsystem 통합, MMIO 매핑
├── mem.c         — cxl_mem: memory device driver
├── pmem.c        — cxl_pmem: persistent CXL
├── port.c        — cxl_port: switch·root port driver
└── core/         — cxl_core: 공통 베이스
    ├── port.c    — CXL port·decoder 객체 관리
    ├── region.c  — region 생성·관리
    ├── memdev.c  — memory device 추상화
    ├── hdm.c     — HDM Decoder 프로그래밍
    ├── mbox.c    — Mailbox API
    ├── regs.c    — register access helpers
    └── pmem.c    — persistent memory 통합
```

총 *50개 이상의 .c·.h 파일*. *cxl_core가 모든 모듈의 공통 베이스*입니다.

## 모듈 의존성 체인

CXL 모듈들은 *순서대로 로딩*되어야 합니다.

| 순서 | 모듈 | 역할 |
|------|------|------|
| 1 | cxl_core | 다른 모듈이 사용할 *base infrastructure* |
| 2 | cxl_acpi | ACPI CEDT 파싱, root port·decoder 등록 |
| 3 | cxl_pci | PCI subsystem에서 *CXL DVSEC 발견*, MMIO 매핑 |
| 4 | cxl_mem | memory device 드라이버, `mem0`·`mem1` 등록 |
| 5 | cxl_port | switch·root port 드라이버 |
| 6 | cxl_pmem | persistent memory가 있을 때만 |

```bash
# 의존성 확인
$ modinfo cxl_mem | grep depends
depends: cxl_core

$ modinfo cxl_acpi | grep depends
depends: cxl_core,cxl_acpi_table

# 모듈 자동 로딩 (CEDT가 있으면)
$ modprobe cxl_acpi
# → cxl_core 먼저 로딩 → cxl_acpi 로딩
```

## 핵심 자료 구조

drivers/cxl 코드의 중심 객체:

| 구조체 | 역할 |
|--------|------|
| `struct cxl_port` | CXL 토폴로지 노드 (Root·Switch·Endpoint) |
| `struct cxl_decoder` | HDM Decoder, *SPA → DPA 매핑* |
| `struct cxl_region` | interleave된 *연속 메모리 영역* |
| `struct cxl_memdev` | memory device 추상화, `mem0`·`mem1` |
| `struct cxl_mailbox` | mailbox 명령 큐 |
| `struct cxl_root_decoder` | root port의 decoder (CFMWS) |
| `struct cxl_endpoint_decoder` | endpoint의 decoder (실 DRAM 매핑) |
| `struct cxl_event_state` | RAS 이벤트 추적 |

각 객체는 *device model의 device로 등록*되어 *sysfs에 노출*됩니다.

## cxl_pci_probe 흐름

`cxl_pci`의 *probe 함수*가 *디바이스 등록의 핵심*입니다.

```c
// drivers/cxl/pci.c (개념적, 단순화)
static int cxl_pci_probe(struct pci_dev *pdev, ...)
{
    struct cxl_dev_state *cxlds;

    // 1. CXL DVSEC 확인 (없으면 일반 PCI device로 처리)
    if (!is_cxl_device(pdev))
        return -ENODEV;

    // 2. cxl_dev_state 할당 (모든 CXL 디바이스 공통 base)
    cxlds = cxl_dev_state_create(&pdev->dev);

    // 3. CXL MMIO BAR 매핑
    rc = cxl_pci_setup_regs(pdev, cxlds);

    // 4. Mailbox 초기화
    rc = cxl_pci_setup_mailbox(cxlds);

    // 5. CXL DVSEC capability 읽기
    rc = cxl_dvsec_init(pdev, cxlds);

    // 6. AER·RAS handler 등록
    rc = cxl_pci_setup_aer(pdev);

    // 7. memdev 등록 → cxl_mem 드라이버가 binding
    rc = cxl_memdev_register(cxlds);

    return 0;
}
```

각 단계가 *분리*되어 *디버깅 시 어느 단계까지 진행됐는지* 추적 가능. [Kernel Debugging Ch 8](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)의 ftrace로 봤듯 *probe 함수가 호출 순서*를 명확히 보여 줍니다.

## HDM Decoder 프로그래밍

CXL 디바이스가 *실 메모리로 사용*되려면 *HDM Decoder 프로그래밍*이 필요합니다.

```c
// drivers/cxl/core/hdm.c (개념적)
int cxl_decoder_commit(struct cxl_decoder *cxld)
{
    // 1. Decoder가 disable 상태인지 확인
    if (cxld->flags & CXL_DECODER_F_ENABLE)
        return -EBUSY;

    // 2. 매핑할 SPA range 설정
    write_mmio(cxld->base_lo, cxld->hpa_range.start & 0xFFFFFFFF);
    write_mmio(cxld->base_hi, cxld->hpa_range.start >> 32);
    write_mmio(cxld->size_lo, (cxld->size) & 0xFFFFFFFF);
    write_mmio(cxld->size_hi, (cxld->size) >> 32);

    // 3. Interleave 설정
    write_mmio(cxld->control,
        FIELD_PREP(CXL_DECODER_IW, cxld->interleave_ways) |
        FIELD_PREP(CXL_DECODER_IG, cxld->interleave_granularity));

    // 4. Decoder 활성화 (Commit)
    set_bit(CXL_DECODER_F_ENABLE, &cxld->flags);
    write_mmio(cxld->control, control_val | CXL_DECODER_ENABLE);

    return 0;
}
```

*Commit*은 *되돌릴 수 없는 작업*입니다. *region을 잘못 만들면 reset*만이 답.

## sysfs Path — Region 생성

사용자가 region을 만들 때의 *전체 path*:

| 단계 | sysfs path |
|------|-----------|
| 1. 사용자 명령 | `cxl create-region -d decoder0.0 -t ram -s 128G` |
| 2. cxl-cli write | `echo region0 > /sys/bus/cxl/devices/decoder0.0/create_ram_region` |
| 3. 커널 콜백 | `region_create_store()` in `core/region.c` |
| 4. cxl_region 객체 생성 | `devm_cxl_add_region()` |
| 5. 사용자가 mapping 추가 | `echo mem0 > /sys/bus/cxl/devices/region0/target0` |
| 6. 사용자가 size·interleave 설정 | `echo 137438953472 > /sys/bus/cxl/devices/region0/size` |
| 7. Commit | `echo 1 > /sys/bus/cxl/devices/region0/commit` |
| 8. HDM Decoder 활성화 | `cxl_decoder_commit()` (위 코드) |
| 9. System RAM 노출 | `daxctl reconfigure-device dax0.0 -m system-ram` |
| 10. NUMA 노드 등록 | kernel이 *별도 노드* 생성 |

각 단계에서 *오류 시 errno*가 return되어 sysfs write가 실패합니다.

## Mailbox API

CXL 디바이스 명령은 *mailbox를 통해* 보냅니다.

```c
// drivers/cxl/core/mbox.c (개념적)
int cxl_mbox_send_cmd(struct cxl_dev_state *cxlds,
                      u16 opcode,
                      void *in_payload, size_t in_size,
                      void *out_payload, size_t out_size)
{
    struct cxl_mbox_cmd mbox_cmd = {
        .opcode = opcode,
        .payload_in = in_payload,
        .size_in = in_size,
        .payload_out = out_payload,
        .size_out = out_size,
    };

    // 1. Mailbox lock
    mutex_lock(&cxlds->mbox_mutex);

    // 2. Payload 작성
    cxl_setup_mbox_cmd(cxlds, &mbox_cmd);

    // 3. Command 보내기
    write_mmio(cxlds->mbox_regs->command, opcode);

    // 4. Response 기다림 (timeout 포함)
    rc = wait_for_completion_timeout(&cxlds->mbox_done, MBOX_TIMEOUT_MS);

    // 5. Result 읽기
    if (rc > 0)
        rc = cxl_read_mbox_response(cxlds, &mbox_cmd);

    mutex_unlock(&cxlds->mbox_mutex);
    return rc;
}
```

자주 쓰는 opcode:

| Opcode | 명령 |
|--------|------|
| 0x0001 | Identify (디바이스 정보) |
| 0x4400 | Get Health Info |
| 0x4300 | Get LSA (Label Storage Area) |
| 0x4302 | Set LSA |
| 0x4500 | Get Event Records |
| 0x4501 | Clear Event Records |
| 0x4700 | Set Shutdown State |
| 0x4800 | Get Poison List |

## NUMA 노드 등록

CXL region이 commit되면 *별도 NUMA 노드*로 등록:

```c
// drivers/cxl/core/region.c (개념적)
static int cxl_region_attach(struct cxl_region *cxlr)
{
    // 1. SRAT 기반 또는 동적 노드 할당
    int target_nid = cxl_region_pick_node(cxlr);

    // 2. memory hot-add
    rc = add_memory_driver_managed(target_nid, cxlr->res.start,
                                    cxlr->res.end - cxlr->res.start,
                                    "System RAM (CXL)",
                                    MHP_MERGE_RESOURCE);

    // 3. NUMA 노드 sysfs 등록
    register_one_node(target_nid);

    return 0;
}
```

*동적으로 추가*되어 `numactl --hardware`에 새 노드로 등장.

## 에러 처리·RAS

CXL 디바이스의 *RAS 이벤트*는 *pci_error_handlers를 통해 호스트 측*에 전달:

```c
// drivers/cxl/pci.c (개념적)
static const struct pci_error_handlers cxl_pci_err_handlers = {
    .error_detected = cxl_pci_error_detected,
    .mmio_enabled = cxl_pci_mmio_enabled,
    .slot_reset = cxl_pci_slot_reset,
    .resume = cxl_pci_resume,
    .cor_error_reported = cxl_cor_error_reported,
};

static pci_ers_result_t cxl_pci_error_detected(struct pci_dev *pdev, ...)
{
    struct cxl_dev_state *cxlds = pci_get_drvdata(pdev);

    // 1. 에러 등급 분류
    if (state == pci_channel_io_perm_failure) {
        // Fatal — 디바이스 격리, region remove
        cxl_memdev_set_offline(cxlds);
        return PCI_ERS_RESULT_DISCONNECT;
    }

    // 2. AER 이벤트 처리
    cxl_aer_handle(cxlds);

    // 3. 권장 동작 return
    return PCI_ERS_RESULT_NEED_RESET;
}
```

*Fatal 이벤트*는 *디바이스를 offline*시키고 *NUMA 노드를 자동 제거*. *guest 측 워크로드*는 *해당 메모리에 접근 시 SIGBUS*.

## 자주 하는 실수

> ⚠️ cxl_core 미로딩 상태에서 cxl_mem 시도

```bash
$ modprobe cxl_mem
modprobe: FATAL: Module cxl_mem not found in directory ...
# 실은 cxl_core가 먼저 로딩되어야 함
$ modprobe cxl_core
$ modprobe cxl_mem
# OK
```

*Linux 모듈 system이 의존성 해결*해야 정상. *manual modprobe*는 *순서 신경* 써야.

> ⚠️ Region commit 전 access 시도

```bash
$ cat /dev/mem | ...   # CXL region 영역 read
# → 0xFF 또는 fault
```

*region commit이 끝나야* SPA가 *실 DRAM에 매핑*됩니다. 그 전에는 *읽기·쓰기 모두 무효*.

> ⚠️ Mailbox timeout 너무 짧게 설정

```c
#define MBOX_TIMEOUT_MS 100   // 너무 짧음
```

CXL 디바이스의 *firmware update·flash 명령*은 *수십 초*도 걸립니다. *명령별로 다른 timeout*이 권장. 기본은 *2000ms* 이상.

> ⚠️ AER 활성화 안 함

```bash
$ cat /proc/cmdline
... pci=noaer ...   # AER 비활성!
```

AER 없으면 *CXL RAS 이벤트가 안 보임*. *조용한 corruption*. `pci=noaer` 옵션은 *디버깅 후 반드시 제거*.

> ⚠️ Hot-remove 중 region access

CXL 디바이스 hot-remove 시 *region cleanup*에 시간이 걸립니다. *removal 진행 중 region에 접근하는 워크로드*는 *SIGBUS·OOPS* 위험. *graceful unmount*가 권장.

## 정리

- `drivers/cxl/`는 *cxl_core를 베이스로 cxl_acpi·cxl_pci·cxl_mem 등이 의존*하는 구조입니다.
- 디바이스 인식은 *cxl_pci_probe*가 *DVSEC 확인 → MMIO 매핑 → mailbox 초기화 → memdev 등록* 순으로 진행.
- *HDM Decoder는 commit 후 되돌릴 수 없음*. region 잘못 만들면 reboot만이 답.
- Region 생성은 *sysfs에서 10단계*. *각 단계에서 errno 가능*.
- Mailbox API로 *모든 디바이스 명령*을 보냄. *timeout·lock·payload 관리*가 driver의 핵심 로직.
- NUMA 노드 등록·hot-add가 *region commit과 함께* 자동 진행됩니다.
- RAS 이벤트는 *pci_error_handlers를 통해 host*에 전달되어 *Fatal 시 offline*.

다음 편은 Modern Embedded Recipes 시리즈의 *Part 12 (Edge AI·IoT)* 영역으로 자연 이어집니다. CXL 관련 다음 깊이는 [Kernel Debugging Ch 8·9](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)와 [Embedded Debugging Ch 8·9](/blog/tools/debugging/embedded/chapter08-cxl-link-debug)에 *분산 추가*된 챕터들이 받습니다.

## 관련 항목

- [Ch 149: PCIe → CXL 진화](/blog/embedded/modern-recipes/part11-15-pcie-to-cxl)
- [Ch 150: QEMU CXL Type 3 디바이스 에뮬레이션](/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Kernel Debugging Ch 9: drivers/cxl 코드 분석](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)
- [Bootloader Internals Ch 35: EFI·UEFI에서 CXL 초기화](/blog/embedded/bootloader/chapter35-uefi-cxl-init)
- [HBM·GDDR 심화 Ch 10: CXL.mem 프로토콜 분해](/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol)
