---
title: "drivers/cxl 코드 분석 — 진입점부터 sysfs까지"
date: 2026-06-18T09:04:00
description: "Linux kernel drivers/cxl/ 디렉터리 — 모듈별 entry point·핵심 자료구조·sysfs interface 코드 워크스루."
series: "Kernel Debugging"
seriesOrder: 9
tags: [cxl, kernel-source, drivers, sysfs, cxl-core, code-walkthrough]
draft: false
---

## 디렉터리 구조

mainline kernel 6.x의 `drivers/cxl/` 구조:

| 파일·디렉터리 | 모듈 | 역할 |
|-------------|------|------|
| acpi.c | cxl_acpi | CEDT 파싱, root port 등록 |
| pci.c | cxl_pci | PCI subsystem 통합 |
| mem.c | cxl_mem | memory device driver |
| pmem.c | cxl_pmem | persistent memory |
| port.c | cxl_port | switch·root port driver |
| core/port.c | cxl_core | port·decoder 객체 |
| core/region.c | cxl_core | region 관리 |
| core/memdev.c | cxl_core | memory device 추상화 |
| core/hdm.c | cxl_core | HDM Decoder 프로그래밍 |
| core/mbox.c | cxl_core | Mailbox API |
| core/regs.c | cxl_core | register access |
| core/suspend.c | cxl_core | suspend·resume |
| core/pmem.c | cxl_core | persistent memory 통합 |

## 모듈 의존성

| 모듈 | 의존 |
|------|------|
| cxl_core | (none) |
| cxl_acpi | cxl_core |
| cxl_pci | cxl_core |
| cxl_mem | cxl_core |
| cxl_pmem | cxl_core, cxl_mem |
| cxl_port | cxl_core, cxl_acpi or cxl_pci |

## 진입점 — 모듈별 init

각 모듈의 `module_init()`:

```c
// drivers/cxl/acpi.c
static int __init cxl_acpi_init(void)
{
    return platform_driver_register(&cxl_acpi_driver);
}
module_init(cxl_acpi_init);

// drivers/cxl/pci.c
static int __init cxl_pci_driver_init(void)
{
    return pci_register_driver(&cxl_pci_driver);
}
module_init(cxl_pci_driver_init);

// drivers/cxl/mem.c
static int __init cxl_mem_driver_init(void)
{
    return cxl_driver_register(&cxl_mem_driver);
}
module_init(cxl_mem_driver_init);
```

각 모듈이 *다른 driver model*에 등록합니다 — ACPI bus, PCI bus, CXL bus 각각.

## 핵심 자료 구조

`drivers/cxl/cxl.h`에 정의된 주요 struct:

| Struct | 멤버 (요약) | 의미 |
|--------|------------|------|
| cxl_port | `struct device dev`, `nr_dport`, `struct list_head endpoints` | 토폴로지 노드 |
| cxl_decoder | `range hpa_range`, `interleave_ways`, `interleave_granularity` | HDM Decoder |
| cxl_region | `struct cxl_decoder*`, `struct cxl_endpoint_decoder *targets[]` | interleave 영역 |
| cxl_memdev | `struct cxl_dev_state *cxlds`, `struct cdev cdev` | memory device |
| cxl_mailbox | `struct mutex mutex`, `mbox_send_cmd_fn`, `struct completion done` | mailbox |
| cxl_dev_state | `struct cxl_mailbox mbox`, `struct cxl_regs regs`, `dev_features` | dev base state |
| cxl_root_decoder | `struct cxl_decoder cxld`, `qos_class`, `restrictions` | root decoder (CFMWS) |
| cxl_endpoint_decoder | `struct cxl_decoder cxld`, `struct cxl_region *region` | endpoint decoder |

## probe 흐름 추적

`cxl_pci_probe` 단계별 호출:

| 단계 | 함수 | 동작 |
|------|------|------|
| 1 | `cxl_pci_probe()` | 진입점, DVSEC 확인 |
| 2 | `cxl_dev_state_create()` | base struct 할당 |
| 3 | `cxl_setup_regs()` | MMIO BAR 매핑 |
| 4 | `cxl_pci_setup_mailbox()` | mailbox 초기화 |
| 5 | `cxl_dvsec_init()` | DVSEC capability 읽기 |
| 6 | `cxl_alloc_irq_vectors()` | MSI/MSI-X 할당 |
| 7 | `cxl_pci_setup_aer()` | AER handler 등록 |
| 8 | `cxl_memdev_register()` | memdev 객체 생성, sysfs 등록 |

각 단계 실패 시 *별도 errno*. ftrace function_graph로 단계 가시화 ([Ch 8](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)).

## HDM Decoder commit 코드

`drivers/cxl/core/hdm.c`의 핵심 함수:

```c
int cxl_decoder_commit(struct cxl_decoder *cxld)
{
    struct cxl_port *port = to_cxl_port(cxld->dev.parent);
    void __iomem *hdm = cxld->hdm_reg_base;

    // Lock 획득
    down_write(&cxl_decoder_rwsem);

    // 이미 commit되어 있나
    if (cxld->flags & CXL_DECODER_F_ENABLE) {
        rc = -EBUSY;
        goto out;
    }

    // SPA range 쓰기
    writel(lower_32_bits(cxld->hpa_range.start), hdm + CXL_HDM_DECODER_BASE_LOW(0));
    writel(upper_32_bits(cxld->hpa_range.start), hdm + CXL_HDM_DECODER_BASE_HIGH(0));
    writel(lower_32_bits(cxl_dpa_size(cxld)), hdm + CXL_HDM_DECODER_SIZE_LOW(0));
    writel(upper_32_bits(cxl_dpa_size(cxld)), hdm + CXL_HDM_DECODER_SIZE_HIGH(0));

    // Interleave 설정
    u32 ctrl = FIELD_PREP(CXL_HDM_DECODER_IW_MASK, cxld->interleave_ways) |
               FIELD_PREP(CXL_HDM_DECODER_IG_MASK, cxld->interleave_granularity);
    writel(ctrl, hdm + CXL_HDM_DECODER_CTRL(0));

    // Commit (enable bit)
    writel(ctrl | CXL_HDM_DECODER_ENABLE, hdm + CXL_HDM_DECODER_CTRL(0));

    // Polling for commit completion
    rc = readl_poll_timeout(hdm + CXL_HDM_DECODER_CTRL(0), val,
                            (val & CXL_HDM_DECODER_COMMITTED),
                            10, COMMIT_TIMEOUT_US);

    if (rc == 0)
        cxld->flags |= CXL_DECODER_F_ENABLE;

out:
    up_write(&cxl_decoder_rwsem);
    return rc;
}
```

*`cxl_decoder_rwsem`*이 *전역 read-write semaphore*. 모든 decoder commit이 *순차 진행*.

## Region 생성 sysfs path

사용자가 `cxl create-region` 했을 때의 *코드 경로*:

| 단계 | 위치 |
|------|-----|
| 1 | `/sys/bus/cxl/devices/decoder0.0/create_ram_region` write |
| 2 | `region_create_store()` in `core/region.c` |
| 3 | `devm_cxl_add_region()` |
| 4 | `cxl_region_alloc()` — `struct cxl_region` 할당 |
| 5 | `add_region()` — sysfs entry 생성 |
| 6 | 사용자가 `mappings`·`size`·`interleave_ways` 등 설정 |
| 7 | 사용자가 `commit` write |
| 8 | `commit_store()` |
| 9 | `cxl_region_attach()` — endpoint decoder들과 link |
| 10 | `cxl_decoder_commit()` (위 코드) |
| 11 | `cxl_region_decode_commit()` — region 활성화 |
| 12 | `add_memory_driver_managed()` — kernel memory subsystem에 추가 |
| 13 | NUMA 노드 등록 |

## Mailbox API 구현

`drivers/cxl/core/mbox.c`의 *mailbox send*:

```c
int cxl_internal_send_cmd(struct cxl_mailbox *cxl_mbox,
                          struct cxl_mbox_cmd *cmd)
{
    int rc;

    // Mailbox semaphore
    mutex_lock(&cxl_mbox->mbox_mutex);

    // 명령 검증
    if (cmd->size_in > cxl_mbox->payload_size) {
        rc = -E2BIG;
        goto out;
    }

    // Payload write
    if (cmd->payload_in)
        memcpy_toio(cxl_mbox->payload_in_base, cmd->payload_in, cmd->size_in);

    // Command 실행
    rc = cxl_mbox->mbox_send(cxl_mbox, cmd);
    if (rc)
        goto out;

    // Completion 대기
    rc = wait_for_completion_timeout(&cxl_mbox->mbox_done,
                                      msecs_to_jiffies(cmd->timeout_ms ?: 2000));
    if (rc == 0) {
        rc = -ETIMEDOUT;
        goto out;
    }

    // Response copy
    if (cmd->payload_out && cmd->size_out)
        memcpy_fromio(cmd->payload_out, cxl_mbox->payload_out_base, cmd->size_out);

    rc = cmd->return_code;

out:
    mutex_unlock(&cxl_mbox->mbox_mutex);
    return rc;
}
```

*timeout이 명령별로 다름*. *Get Health Info는 100ms*, *firmware update는 30000ms*.

## 에러 처리 — pci_error_handlers

`drivers/cxl/pci.c`의 *AER handler*:

```c
static const struct pci_error_handlers cxl_error_handlers = {
    .error_detected = cxl_error_detected,
    .mmio_enabled   = cxl_mmio_enabled,
    .slot_reset     = cxl_slot_reset,
    .resume         = cxl_resume,
    .cor_error_reported = cxl_cor_error_reported,
};

static pci_ers_result_t cxl_error_detected(struct pci_dev *pdev,
                                            pci_channel_state_t state)
{
    struct cxl_dev_state *cxlds = pci_get_drvdata(pdev);

    if (state == pci_channel_io_perm_failure) {
        // Fatal — device offline
        cxl_memdev_offline(cxlds);
        return PCI_ERS_RESULT_DISCONNECT;
    }

    // Process queued events
    cxl_mem_get_event_records(cxlds);

    return PCI_ERS_RESULT_NEED_RESET;
}
```

## NUMA 통합 — region_attach

`cxl_region_attach()`에서 *NUMA node 등록*:

```c
static int cxl_region_attach(struct cxl_region *cxlr,
                              struct cxl_endpoint_decoder *cxled,
                              int pos)
{
    // 매핑 추가
    cxlr->params.targets[pos] = cxled;

    // 모든 target 결정되었으면
    if (all_targets_set(cxlr)) {
        // NUMA node 할당
        int target_nid = cxl_region_pick_node(cxlr);

        // Memory hot-add
        rc = add_memory_driver_managed(target_nid,
                                        cxlr->res.start,
                                        resource_size(&cxlr->res),
                                        "System RAM (CXL)",
                                        MHP_MERGE_RESOURCE);
        if (rc)
            return rc;

        // NUMA node sysfs 노출
        register_one_node(target_nid);

        // HMAT-based tier 분류 적용
        node_to_memory_tier(target_nid);
    }

    return 0;
}
```

## 동시성 — Lock 사용

`drivers/cxl/`의 *주요 lock*:

| Lock | 보호 대상 |
|------|----------|
| cxl_port_mutex | port list 변경 |
| cxl_decoder_rwsem | decoder commit·release |
| cxl_region_mutex | region 생성·삭제 |
| mbox_mutex | mailbox concurrent access 방지 |
| event_log_lock | event ring buffer |
| cxlds->lock | dev state 일반 |

*write side는 sleep 가능*, *read side는 빠른 path*. lockdep 활성 시 ordering 검증.

## 자주 만나는 함정

| 증상 | 원인 |
|------|------|
| `cxl_pci_probe`에서 EBUSY | 이미 binding된 driver — `unbind` 후 재시도 |
| `cxl_decoder_commit` 타임아웃 | HDM register 응답 없음. 디바이스 firmware 의심 |
| `cxl_region_attach` ENOMEM | NUMA hot-add 실패. CONFIG_MEMORY_HOTPLUG 확인 |
| Lockdep WARNING | decoder lock 순서 위반. core/hdm.c 추적 |
| Mailbox 응답 corruption | DMA cache coherency 문제 — cxl_dev_state cache settings 확인 |
| `cxl_memdev_register` 실패 | sysfs 충돌 — 이전 instance cleanup 안 됨 |
| AER event 무한 반복 | error storm — `pci=noaer` 임시 옵션으로 우회 |
| `commit_store` -EBUSY | 동시 commit 충돌. 직렬화 누락 |

## 정리

- `drivers/cxl/`는 *cxl_core를 base로 cxl_acpi·cxl_pci·cxl_mem 등이 의존*하는 구조입니다.
- 진입점은 *모듈별 `module_init`*, 각각 *다른 driver model (ACPI·PCI·CXL bus)*에 등록.
- 핵심 자료구조는 *cxl_port·cxl_decoder·cxl_region·cxl_memdev·cxl_mailbox 등 8가지*.
- *HDM Decoder commit*은 `cxl_decoder_rwsem`이 보호하며 *MMIO 4 단계 write + polling*.
- *Region 생성*은 *sysfs 13단계*. *commit이 마지막에 NUMA hot-add* trigger.
- *Mailbox API*는 *mutex로 직렬화*, *timeout이 명령별로 다름*.
- AER handler가 *Fatal에서 device offline*.

## 다음 장 예고

Kernel Debugging 시리즈의 *CXL 관련 추가 챕터는 여기까지*. 다음 깊이는 *Memory Diagnostics*와 *Postmortem Debugging*에 분산된 챕터로 자연 연결.

## 관련 항목

- [Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Memory Diagnostics Ch 6: CXL 메모리 진단](/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics)
- [Postmortem Debugging Ch 5: CXL 디바이스 Core Dump 분석](/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem)
- [Linux drivers/cxl/ source on kernel.org](https://elixir.bootlin.com/linux/latest/source/drivers/cxl)
