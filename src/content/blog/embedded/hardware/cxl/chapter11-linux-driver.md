---
title: "Ch 11: Linux drivers/cxl/ 분석 — Mainline kernel CXL 구현"
date: 2026-05-16T09:11:00
description: "Linux 6.x의 CXL subsystem 코드 구조와 probe 흐름."
series: "CXL 4.0 Internals"
seriesOrder: 11
tags: [cxl, linux, drivers, sysfs, hdm-decoder]
draft: false
---

## 한 줄 요약

> **"Linux CXL 드라이버는 *cxl_acpi → cxl_pci → cxl_core → cxl_mem*의 *모듈 의존성 체인*으로 동작합니다."** — `drivers/cxl/` 디렉토리는 *50+ 소스 파일*로 구성되며 *cxl_core가 모든 모듈의 공통 베이스*입니다. *Region 생성은 sysfs 10단계*, *Mailbox API는 mutex 직렬화*. mainline 6.0+에서 안정화됐고, 6.x 진행 중.

[Ch 8](/blog/embedded/hardware/cxl/chapter08-cxl-mem)에서 *CXL.mem 프로토콜·HDM Decoder 메커니즘*을 봤습니다. 이 장은 *그게 Linux에서 실제로 어떻게 구현*되는지를 *오픈소스 mainline 코드*로 분해합니다. *drivers/cxl/는 GPL이므로 자유 분석·인용 가능*합니다.

## drivers/cxl/ 디렉토리

mainline kernel 6.x의 *대략 구조*:

```text
drivers/cxl/
├── Kconfig·Makefile
├── acpi.c        — cxl_acpi: ACPI CEDT 파싱, root port 등록
├── pci.c         — cxl_pci: PCI subsystem 통합, MMIO 매핑
├── mem.c         — cxl_mem: memory device driver
├── pmem.c        — cxl_pmem: persistent CXL
├── port.c        — cxl_port: switch·root port driver
└── core/         — cxl_core: 공통 베이스
    ├── port.c    — CXL port·decoder 객체
    ├── region.c  — region 생성·관리
    ├── memdev.c  — memory device 추상화
    ├── hdm.c     — HDM Decoder 프로그래밍
    ├── mbox.c    — Mailbox API
    ├── regs.c    — register access helpers
    └── pmem.c    — persistent memory 통합
```

총 *50개 이상의 .c·.h 파일*. *cxl_core가 다른 모듈의 공통 인프라*.

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
$ modinfo cxl_mem | grep depends
depends: cxl_core

$ modprobe cxl_acpi
# → cxl_core 먼저 자동 로딩 → cxl_acpi 로딩
```

## 핵심 자료 구조

`drivers/cxl/cxl.h`의 주요 struct:

| Struct | 멤버 (요약) | 의미 |
|--------|------------|------|
| `cxl_port` | `struct device dev`, `nr_dport`, endpoints list | 토폴로지 노드 |
| `cxl_decoder` | hpa_range, interleave_ways, interleave_granularity | HDM Decoder |
| `cxl_region` | decoder*, endpoint_decoder *targets[] | interleave 영역 |
| `cxl_memdev` | cxl_dev_state*, cdev | memory device |
| `cxl_mailbox` | mutex, mbox_send_cmd_fn, completion | mailbox |
| `cxl_dev_state` | mailbox, regs, dev_features | dev base state |
| `cxl_root_decoder` | cxl_decoder, qos_class, restrictions | root decoder (CFMWS) |
| `cxl_endpoint_decoder` | cxl_decoder, region* | endpoint decoder |

## probe 흐름 추적

`cxl_pci_probe`의 *단계별 호출*:

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

각 단계 실패 시 *별도 errno*. ftrace function_graph로 단계 가시화 가능 ([Kernel Debugging Ch 8 CXL 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)).

## HDM Decoder commit

`drivers/cxl/core/hdm.c`의 *Commit 함수* (개념적):

```c
int cxl_decoder_commit(struct cxl_decoder *cxld)
{
    void __iomem *hdm = cxld->hdm_reg_base;

    down_write(&cxl_decoder_rwsem);

    if (cxld->flags & CXL_DECODER_F_ENABLE) {
        rc = -EBUSY;
        goto out;
    }

    // SPA range 쓰기
    writel(lower_32_bits(cxld->hpa_range.start),
           hdm + CXL_HDM_DECODER_BASE_LOW(0));
    writel(upper_32_bits(cxld->hpa_range.start),
           hdm + CXL_HDM_DECODER_BASE_HIGH(0));

    // Interleave 설정
    u32 ctrl = FIELD_PREP(CXL_HDM_DECODER_IW_MASK,
                          cxld->interleave_ways) |
               FIELD_PREP(CXL_HDM_DECODER_IG_MASK,
                          cxld->interleave_granularity);
    writel(ctrl, hdm + CXL_HDM_DECODER_CTRL(0));

    // Commit
    writel(ctrl | CXL_HDM_DECODER_ENABLE,
           hdm + CXL_HDM_DECODER_CTRL(0));

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

## Region 생성 — sysfs path

사용자가 `cxl create-region` 실행 시의 *코드 경로*:

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

## Mailbox API

`drivers/cxl/core/mbox.c`의 *mailbox send* (개념적):

```c
int cxl_internal_send_cmd(struct cxl_mailbox *cxl_mbox,
                          struct cxl_mbox_cmd *cmd)
{
    mutex_lock(&cxl_mbox->mbox_mutex);

    // 명령 검증
    if (cmd->size_in > cxl_mbox->payload_size) {
        rc = -E2BIG;
        goto out;
    }

    // Payload write
    if (cmd->payload_in)
        memcpy_toio(cxl_mbox->payload_in_base,
                    cmd->payload_in, cmd->size_in);

    // Command 실행
    rc = cxl_mbox->mbox_send(cxl_mbox, cmd);
    if (rc) goto out;

    // Completion 대기 (timeout 포함)
    rc = wait_for_completion_timeout(
        &cxl_mbox->mbox_done,
        msecs_to_jiffies(cmd->timeout_ms ?: 2000));
    if (rc == 0) {
        rc = -ETIMEDOUT;
        goto out;
    }

    // Response copy
    if (cmd->payload_out && cmd->size_out)
        memcpy_fromio(cmd->payload_out,
                      cxl_mbox->payload_out_base,
                      cmd->size_out);

    rc = cmd->return_code;
out:
    mutex_unlock(&cxl_mbox->mbox_mutex);
    return rc;
}
```

*timeout이 명령별로 다름*. *Get Health Info는 100 ms*, *firmware update는 30000 ms*.

자주 쓰는 opcode:

| Opcode | 명령 |
|--------|------|
| 0x0001 | Identify |
| 0x4400 | Get Health Info |
| 0x4300 | Get LSA (Label Storage Area) |
| 0x4302 | Set LSA |
| 0x4500 | Get Event Records |
| 0x4800 | Get Poison List |

## NUMA 통합 — region_attach

`cxl_region_attach()`에서 *NUMA node 등록*:

```c
static int cxl_region_attach(struct cxl_region *cxlr,
                              struct cxl_endpoint_decoder *cxled,
                              int pos)
{
    // 매핑 추가
    cxlr->params.targets[pos] = cxled;

    // 모든 target 결정 후
    if (all_targets_set(cxlr)) {
        // NUMA node 할당
        int target_nid = cxl_region_pick_node(cxlr);

        // Memory hot-add
        rc = add_memory_driver_managed(target_nid,
            cxlr->res.start,
            resource_size(&cxlr->res),
            "System RAM (CXL)",
            MHP_MERGE_RESOURCE);
        if (rc) return rc;

        // NUMA node sysfs 노출
        register_one_node(target_nid);

        // HMAT-based tier 분류
        node_to_memory_tier(target_nid);
    }
    return 0;
}
```

*동적 추가*되어 `numactl --hardware`에 새 노드로 등장.

## 에러 처리·RAS

CXL 디바이스의 *RAS 이벤트*는 *pci_error_handlers*를 통해 *호스트 측*에 전달:

```c
static const struct pci_error_handlers cxl_error_handlers = {
    .error_detected = cxl_error_detected,
    .mmio_enabled   = cxl_mmio_enabled,
    .slot_reset     = cxl_slot_reset,
    .resume         = cxl_resume,
};

static pci_ers_result_t cxl_error_detected(
    struct pci_dev *pdev,
    pci_channel_state_t state)
{
    struct cxl_dev_state *cxlds = pci_get_drvdata(pdev);

    if (state == pci_channel_io_perm_failure) {
        // Fatal — device offline
        cxl_memdev_offline(cxlds);
        return PCI_ERS_RESULT_DISCONNECT;
    }
    cxl_mem_get_event_records(cxlds);
    return PCI_ERS_RESULT_NEED_RESET;
}
```

*Fatal 이벤트*는 *디바이스를 offline*시키고 *NUMA 노드를 자동 제거*.

## Lock 사용

`drivers/cxl/`의 *주요 lock*:

| Lock | 보호 대상 |
|------|----------|
| cxl_port_mutex | port list 변경 |
| cxl_decoder_rwsem | decoder commit·release |
| cxl_region_mutex | region 생성·삭제 |
| mbox_mutex | mailbox concurrent access 방지 |
| event_log_lock | event ring buffer |
| cxlds->lock | dev state 일반 |

*Lockdep 활성* 시 순서 검증. 잘못 쓰면 *deadlock warning*.

## 자주 하는 실수

### "modprobe cxl_mem이면 자동 로딩"

*Linux 모듈 의존성*은 *cxl_core가 자동 우선 로딩*되도록 합니다. 그러나 *manual loading*은 *순서 신경* 써야. `cxl_core → cxl_acpi → cxl_pci → cxl_mem`.

### "Region commit 전 access도 가능"

*Region commit이 끝나야* SPA가 *실 DRAM에 매핑*. 그 전에는 *읽기·쓰기 모두 무효*. `cxl_decoder_commit` 후 region commit으로 *NUMA 노드 추가*가 trigger.

### "Mailbox timeout은 일정"

*명령별로 다름*. *firmware update·flash 명령*은 *수십 초*. *기본 2000 ms*는 *Get Health Info급*. 명령마다 *적절한 timeout 사용*.

### "AER 비활성하면 더 빠름"

*조용한 corruption 위험*. `pci=noaer`는 *디버깅 후 반드시 제거*. *RAS 이벤트가 안 보임* = *fault가 누적 후 fatal로 폭발*.

### "Hot-remove 중 region access는 graceful"

*Hot-remove 진행 중 region access*는 *SIGBUS·OOPS 위험*. *graceful unmount* 패턴이 권장. *cleanup이 동시 진행 중인 race*에 주의.

## 정리

- `drivers/cxl/`는 *cxl_core를 base로 cxl_acpi·cxl_pci·cxl_mem 등이 의존*합니다.
- 디바이스 인식은 *cxl_pci_probe*가 *DVSEC 확인 → MMIO 매핑 → mailbox 초기화 → memdev 등록* 순.
- *HDM Decoder*는 *commit 후 되돌릴 수 없음*. region 잘못 만들면 reboot.
- Region 생성은 *sysfs 13단계*. *각 단계에서 errno 가능*.
- *Mailbox API*로 모든 디바이스 명령. *timeout·lock·payload 관리*가 driver의 핵심.
- *NUMA hot-add*가 *region commit과 함께 자동*.
- *RAS 이벤트는 pci_error_handlers*. Fatal 시 *offline*.

## 다음 편

[Ch 12: QEMU CXL 에뮬레이션 — 노트북에서 CXL 개발](/blog/embedded/hardware/cxl/chapter12-qemu-emulation)에서 *QEMU 8.0+의 CXL Type 3 에뮬레이션*과 *드라이버 검증 워크플로*를 본격적으로 분해합니다.

## 관련 항목

- [Ch 8: CXL.mem](/blog/embedded/hardware/cxl/chapter08-cxl-mem)
- [Modern Embedded Recipes Ch 151: Linux CXL 드라이버 분석](/blog/embedded/modern-recipes/part11-17-linux-cxl-driver)
- [Kernel Debugging Ch 8: CXL 커널 드라이버 디버깅](/blog/tools/debugging/kernel/chapter08-cxl-driver-debug)
- [Kernel Debugging Ch 9: drivers/cxl 코드 분석](/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough)

## 시리즈 자료 출처 안내

본 글은 *Linux Kernel `drivers/cxl/` 소스 (GPL)*를 1차 자료로 합니다. 코드 인용은 *오픈소스 GPL 라이선스*에 따른 자유 분석·인용입니다. CXL 4.0 Specification은 *§ navigation aid*로만 인용. 자세한 spec 인용 정책은 [Ch 1 footer](/blog/embedded/hardware/cxl/chapter01-cxl-position#시리즈-자료-출처-안내) 참고.
