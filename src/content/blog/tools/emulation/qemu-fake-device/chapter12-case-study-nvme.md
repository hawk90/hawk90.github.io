---
title: "Ch 12: 사례 연구 — NVMe 가상 디바이스"
date: 2026-05-17T12:00:00
description: "QEMU 내장 NVMe 디바이스 분석으로 실전 패턴을 학습한다."
tags: [QEMU, NVMe, CaseStudy, hw-block, SQ-CQ]
series: "QEMU Fake Device Driver"
seriesOrder: 12
draft: true
---

지금까지 우리가 만든 fake-pci는 *교육용*이었습니다. *production-grade* device의 *실 구조*를 보려면 QEMU에 내장된 **NVMe controller**(`hw/nvme/`)를 분석해야 합니다. NVMe spec의 *복잡한 SQ/CQ + admin command + namespace + namespace*가 *QEMU 안에 그대로* 구현되어 있죠.

## NVMe — 무엇인가

PCIe 기반 storage protocol. SATA·SAS의 후속.

| 측면 | SATA AHCI | NVMe |
|------|-----------|------|
| Queue | 1 | 64K |
| Queue depth | 32 | 64K |
| Latency | ~10µs | <1µs |
| Throughput | ~600MB/s | ~10GB/s |

queue가 *많고 깊은* 게 NVMe의 핵심. CPU 코어별 *전용 queue*로 multi-core scaling.

## QEMU NVMe 구조

`hw/nvme/` 디렉터리.

```text
hw/nvme/
├── ctrl.c       ← controller (메인)
├── ns.c         ← namespace
├── subsys.c     ← subsystem
├── dif.c        ← T10 PI (data integrity)
└── trace-events ← trace
```

총 ~5000줄. *완전한 NVMe controller*.

## CLI 사용

```bash
qemu-system-x86_64 -enable-kvm -m 2G \
    -drive file=disk.img,if=none,id=nvm0,format=raw \
    -device nvme,serial=foo,id=nvme0 \
    -device nvme-ns,drive=nvm0,bus=nvme0
```

`nvme` controller + `nvme-ns` namespace 분리. 한 controller에 *여러 namespace*.

## SQ/CQ — Submission/Completion Queue

NVMe의 *핵심 abstraction*.

```text
host RAM에:
┌─────────────────┐
│  Submission     │  ← driver가 명령 enqueue
│  Queue (SQ)     │
└────────┬────────┘
         │ doorbell
         ▼
NVMe controller가 fetch + 처리
         │
         ▼
┌─────────────────┐
│  Completion     │  ← controller가 결과 push
│  Queue (CQ)     │
└────────┬────────┘
         │ IRQ
         ▼
host driver가 결과 회수
```

각 queue가 *circular buffer*. doorbell이 head/tail 갱신 신호.

## NvmeRequest 구조

```c
typedef struct NvmeRequest {
    struct NvmeSQueue   *sq;
    struct NvmeNamespace *ns;
    BlockAIOCB           *aiocb;
    uint16_t             status;
    void                 *opaque;
    NvmeCqe              cqe;            /* completion entry */
    NvmeCommand          cmd;            /* submitted command */
    BlockAcctCookie      acct;
    QEMUSGList           sg;
    QTAILQ_ENTRY(NvmeRequest) entry;
} NvmeRequest;
```

각 request가 *submission*에서 *completion*까지의 *전체 lifecycle* 추적.

## 명령 처리 흐름

```c
static uint16_t nvme_io_cmd(NvmeCtrl *n, NvmeRequest *req) {
    NvmeNamespace *ns;
    uint32_t nsid = le32_to_cpu(req->cmd.nsid);

    if (nsid == 0 || nsid > n->num_namespaces) {
        return NVME_INVALID_NSID | NVME_DNR;
    }
    ns = &n->namespaces[nsid - 1];

    switch (req->cmd.opcode) {
    case NVME_CMD_READ:
        return nvme_rw(n, ns, req);
    case NVME_CMD_WRITE:
        return nvme_rw(n, ns, req);
    case NVME_CMD_FLUSH:
        return nvme_flush(n, ns, req);
    case NVME_CMD_WRITE_ZEROES:
        return nvme_write_zeroes(n, ns, req);
    /* ... */
    default:
        return NVME_INVALID_OPCODE | NVME_DNR;
    }
}
```

각 opcode가 *별도 handler*. 명확한 분기 + early return.

## DMA via PRP/SGL

NVMe는 *Physical Region Page*(PRP) 또는 *Scatter-Gather List*(SGL) 사용.

```c
static uint16_t nvme_map_prp(NvmeCtrl *n, QEMUSGList *qsg,
                              uint64_t prp1, uint64_t prp2,
                              uint32_t len, NvmeRequest *req) {
    if (len <= n->page_size) {
        /* 첫 page만 — PRP1만 */
        qemu_sglist_add(qsg, prp1, len);
    } else {
        /* 다음 page — PRP2 (single page or list) */
        /* ... */
    }
    return NVME_SUCCESS;
}
```

PRP는 *page table-like*. SGL은 *descriptor chain*.

## block layer 통합

NVMe의 disk I/O는 QEMU의 *block layer*를 위임.

```c
static void nvme_rw_cb(void *opaque, int ret) {
    NvmeRequest *req = opaque;
    NvmeCtrl *n = nvme_ctrl(req);

    if (ret < 0) {
        req->status = NVME_INTERNAL_DEV_ERROR;
    }
    nvme_enqueue_req_completion(nvme_cq(req), req);
}

static uint16_t nvme_rw(NvmeCtrl *n, NvmeNamespace *ns, NvmeRequest *req) {
    /* ... command parsing ... */

    if (req->cmd.opcode == NVME_CMD_READ) {
        req->aiocb = blk_aio_preadv(ns->blkconf.blk, offset, &req->iov, 0,
                                     nvme_rw_cb, req);
    } else {
        req->aiocb = blk_aio_pwritev(ns->blkconf.blk, offset, &req->iov, 0,
                                      nvme_rw_cb, req);
    }
    return NVME_NO_COMPLETE;   /* async — completion은 callback에서 */
}
```

block layer의 `blk_aio_pread/write`가 *coroutine 기반 async*. callback이 *나중에* CQ에 push.

## CQ completion

```c
static void nvme_post_cqe(NvmeCQueue *cq, NvmeRequest *req) {
    /* CQ에 entry 작성 */
    NvmeCqe *cqe = (void *)&cq->ring[cq->head];
    cqe->cmd_id = req->cqe.cmd_id;
    cqe->status = cpu_to_le16((req->status << 1) | cq->phase);

    pci_dma_write(&n->parent_obj, cq->dma_addr + cq->head * sizeof(*cqe),
                  cqe, sizeof(*cqe));

    cq->head = (cq->head + 1) % cq->size;
    if (cq->head == 0) {
        cq->phase ^= 1;
    }

    /* IRQ */
    nvme_irq_assert(n, cq);
}
```

phase bit toggle로 *driver가 새 entry 인식*. NVMe spec의 흥미로운 design.

## Admin commands

I/O 외의 *관리 명령*.

| Opcode | 의미 |
|--------|------|
| `IDENTIFY` | controller·namespace 정보 |
| `CREATE_SQ`·`CREATE_CQ` | queue 생성 |
| `DELETE_SQ`·`DELETE_CQ` | 제거 |
| `GET_LOG_PAGE` | error log, SMART |
| `ABORT` | 진행 중 command 취소 |
| `SET_FEATURES`·`GET_FEATURES` | 설정 |
| `FIRMWARE_DOWNLOAD` | 펌웨어 업데이트 |

```c
static uint16_t nvme_admin_cmd(NvmeCtrl *n, NvmeRequest *req) {
    switch (req->cmd.opcode) {
    case NVME_ADM_CMD_IDENTIFY:
        return nvme_identify(n, req);
    case NVME_ADM_CMD_CREATE_SQ:
        return nvme_create_sq(n, req);
    /* ... */
    }
}
```

## Namespace

한 NVMe controller가 *여러 logical disk*(namespace) 제공.

```c
typedef struct NvmeNamespace {
    DeviceState     parent_obj;
    BlockConf       blkconf;
    uint32_t        nsid;
    NvmeIdNs        id_ns;
    /* ... */
} NvmeNamespace;
```

CLI에서:

```bash
-drive file=disk1.img,if=none,id=nvm1 \
-drive file=disk2.img,if=none,id=nvm2 \
-device nvme,id=nvme0 \
-device nvme-ns,drive=nvm1,bus=nvme0,nsid=1 \
-device nvme-ns,drive=nvm2,bus=nvme0,nsid=2
```

guest는 `/dev/nvme0n1`·`/dev/nvme0n2` 두 disk를 봄.

## QEMU NVMe의 advanced feature

- **Multipath**: 같은 namespace를 *여러 controller*가 공유
- **Namespace management**: runtime create/delete
- **Endurance group**: SSD wear leveling 모델
- **Zoned namespace (ZNS)**: SSD의 sequential-write zone
- **CMB (Controller Memory Buffer)**: PCIe BAR을 *RAM처럼* 노출
- **PMR (Persistent Memory Region)**: persistent BAR

real NVMe spec의 *수백 페이지*를 *5000줄에 정리*.

## Linux nvme driver 호환

`drivers/nvme/host/`의 mainline driver가 *QEMU NVMe에 그대로* 동작.

```bash
guest$ lspci | grep -i nvme
00:05.0 Non-Volatile memory controller: ...

guest$ ls /dev/nvme*
/dev/nvme0  /dev/nvme0n1  /dev/nvme0n2

guest$ nvme list
guest$ nvme id-ctrl /dev/nvme0
guest$ nvme smart-log /dev/nvme0
```

real disk와 *완전 동일* command·sysfs·`/proc`.

## 학습할 만한 패턴

| 패턴 | 어디서 |
|------|--------|
| Queue ring management | `ctrl.c:nvme_post_cqe` |
| PRP/SGL traversal | `ctrl.c:nvme_map_prp/sgl` |
| Admin command dispatch | `ctrl.c:nvme_admin_cmd` |
| Async block I/O | `nvme_rw` + `nvme_rw_cb` |
| Error reporting | `NvmeRequest.status` + log page |
| Namespace lifecycle | `ns.c:nvme_ns_realize` |

새 storage device 만들 때 *모두 적용 가능*.

## QEMU NVMe로 NVMe driver 개발

real NVMe SSD 없이도 *Linux NVMe driver 학습/패치 검증* 가능.

```bash
# 매 PR마다
git checkout -b my-nvme-fix
# patch nvme driver
make -C linux modules SUBDIRS=drivers/nvme
qemu-system-x86_64 -device nvme ... -kernel my-vmlinux
# test
```

cloud storage company의 *internal CI*가 정확히 이 패턴.

## 흔한 함정

- **PRP misalignment** — page boundary 가정. 4KB align 강제.
- **CQ phase bit** — toggle 누락 시 driver가 *영원히* 같은 entry 봄.
- **Async lifetime** — request가 *블록 I/O 진행 중*에 free되면 *use-after-free*.
- **IRQ coalescing** — 너무 자주 IRQ. coalescing 적용.

## 정리

- QEMU의 NVMe(`hw/nvme/`)는 *실 production NVMe controller*의 complete emulation.
- **SQ/CQ**가 핵심 — circular buffer + doorbell + IRQ.
- **PRP/SGL**로 DMA 주소 지정. multi-page 지원.
- **Admin commands**(IDENTIFY·CREATE_SQ·...)와 **I/O commands**(READ·WRITE·FLUSH) 분리.
- block layer의 `blk_aio_pread/write`로 *async I/O*. coroutine 기반.
- Linux nvme driver가 *QEMU NVMe와 완전 호환*. test/development의 표준 환경.
- Multipath·namespace mgmt·ZNS·CMB·PMR 등 advanced spec 지원.
- 새 storage device의 *reference implementation*.

## 다음 장 예고

다음 장은 *복잡한 register set*을 *체계적으로* 관리하는 **register bank**.

## 관련 항목

- [Ch 11: Advanced Scenarios](/blog/tools/emulation/qemu-fake-device/chapter11-advanced-scenarios)
- [Ch 13: Register Bank](/blog/tools/emulation/qemu-fake-device/chapter13-register-bank)
- [Ch 14: Scatter-Gather DMA](/blog/tools/emulation/qemu-fake-device/chapter14-scatter-gather-dma)
- [FPGA Driver — DMA Descriptor Ring](/blog/tools/emulation/qemu-fpga-driver/chapter06-dma-descriptor-ring)
