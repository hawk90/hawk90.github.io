---
title: "Ch 7: 비트스트림 로딩"
date: 2026-05-17T07:00:00
description: "Driver의 firmware push — FPGA Manager subsystem."
tags: [QEMU, bitstream, fpga-manager, firmware-load]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 7
draft: true
---

FPGA는 *bitstream*을 받아야 user logic이 살아납니다. Linux의 **fpga_mgr** subsystem 덕분에 어느 vendor의 FPGA든 *같은 인터페이스*로 program할 수 있고, driver는 `fpga_manager_ops`만 구현하면 됩니다. 이 장에서는 fake-fpga에 bitstream load 명령을 추가하고 driver를 fpga_mgr에 등록합니다.

## Linux FPGA Manager subsystem

`drivers/fpga/fpga-mgr.c`가 핵심. 표준 인터페이스를 정의:

| 호출 | 시점 |
|------|------|
| `write_init` | bitstream 시작 전 — reset, mode set |
| `write` | chunk 단위 byte 전송 (반복 호출) |
| `write_complete` | 마지막 byte 후 — finalize, verification |
| `state` | 현재 상태 query |
| `status` | error 정보 |

userspace는 sysfs를 통해 *vendor에 무관하게* bitstream을 push.

```bash
echo my-fpga.bit > /sys/class/firmware/timeout
cat my-fpga.bit > /sys/class/fpga_manager/fpga0/firmware
cat /sys/class/fpga_manager/fpga0/state
# operating
```

fpga_mgr core가 *chunk 단위로* driver의 callback을 호출합니다.

## Programming modes

| 모드 | 의미 |
|------|------|
| **Full reconfiguration** | 전체 FPGA reprogram. 보통 power-on / boot 시 |
| **Partial reconfiguration** | 일부 영역만(Ch 8) |
| **Encrypted bitstream** | AES + signature(Xilinx, Intel) |

`fpga_image_info` 구조체로 mode와 옵션을 전달.

```c
struct fpga_image_info {
    u32 flags;          /* PARTIAL_RECONFIG, ENCRYPTED_KEY, ... */
    u32 enable_timeout_us;
    u32 config_complete_timeout_us;
    char *firmware_name;
    /* ... */
};
```

## State machine

bitstream 로드의 표준 state 진행.

```text
UNKNOWN ──▶ WRITE_INIT ──▶ WRITE ──▶ WRITE_COMPLETE ──▶ OPERATING
                                           │
                                           ▼
                                       (error)
                                           │
                                           ▼
                                        UNKNOWN
```

driver의 `state` callback이 이 상태 중 하나를 반환합니다.

## QEMU 측 — Bitstream register

fake-fpga에 bitstream 영역을 더합니다. BAR0의 일부를 사용.

```c
#define BITSTREAM_CTRL    0x1000  /* WO: GO bit */
#define BITSTREAM_STATUS  0x1004  /* RO: 0=OK, others=error code */
#define BITSTREAM_DATA    0x1010  /* WO: FIFO write port */
#define BITSTREAM_SIZE    0x1018  /* RW: 누적 byte 수 */

#define BITSTREAM_GO          0x1
#define BITSTREAM_OK          0
#define BITSTREAM_BAD_HEADER  1
#define MAX_BITSTREAM         (16 * 1024 * 1024)

static void bitstream_write(FakeFPGA *s, uint64_t off, uint64_t val) {
    if (off == BITSTREAM_DATA) {
        /* FIFO write — 누적 */
        if (s->bitstream_recv_bytes < MAX_BITSTREAM) {
            s->bitstream_buf[s->bitstream_recv_bytes++] = val & 0xff;
        }
    } else if (off == BITSTREAM_CTRL && val == BITSTREAM_GO) {
        /* fake: header(0xAA 0x99 0x55 0x66) 검증 */
        if (s->bitstream_recv_bytes >= 4 &&
            memcmp(s->bitstream_buf, "\xaa\x99\x55\x66", 4) == 0) {
            s->bitstream_status = BITSTREAM_OK;
            s->user_logic_loaded = true;
        } else {
            s->bitstream_status = BITSTREAM_BAD_HEADER;
        }
        msix_notify(&s->parent, BITSTREAM_MSIX_VEC);
    }
}
```

실 FPGA에서는 *합성된 회로*가 적용되지만, fake에서는 *magic header만* 검증해 OK/error를 흉내냅니다.

## Driver — fpga_mgr 등록

```c
static int my_fpga_mgr_write_init(struct fpga_manager *mgr,
                                   struct fpga_image_info *info,
                                   const char *buf, size_t count) {
    struct my_fpga *f = mgr->priv;
    writel(0, f->shell_mmio + BITSTREAM_CTRL);   /* reset state */
    f->bytes_sent = 0;
    return 0;
}

static int my_fpga_mgr_write(struct fpga_manager *mgr,
                              const char *buf, size_t count) {
    struct my_fpga *f = mgr->priv;
    for (size_t i = 0; i < count; i++) {
        writel(buf[i], f->shell_mmio + BITSTREAM_DATA);
    }
    f->bytes_sent += count;
    return 0;
}

static int my_fpga_mgr_write_complete(struct fpga_manager *mgr,
                                       struct fpga_image_info *info) {
    struct my_fpga *f = mgr->priv;
    writel(BITSTREAM_GO, f->shell_mmio + BITSTREAM_CTRL);
    return wait_for_load_complete(f, 5 * HZ);   /* IRQ 또는 timeout */
}

static enum fpga_mgr_states my_fpga_mgr_state(struct fpga_manager *mgr) {
    struct my_fpga *f = mgr->priv;
    if (f->state == STATE_LOADING) return FPGA_MGR_STATE_WRITE;
    if (f->state == STATE_OK)      return FPGA_MGR_STATE_OPERATING;
    return FPGA_MGR_STATE_UNKNOWN;
}

static const struct fpga_manager_ops my_fpga_mgr_ops = {
    .write_init     = my_fpga_mgr_write_init,
    .write          = my_fpga_mgr_write,
    .write_complete = my_fpga_mgr_write_complete,
    .state          = my_fpga_mgr_state,
};

static int my_fpga_probe(struct pci_dev *pdev, ...) {
    /* ... pci_enable_device 등 ... */
    struct fpga_manager *mgr = devm_fpga_mgr_register(&pdev->dev,
                                                       "my-fpga-mgr",
                                                       &my_fpga_mgr_ops, f);
    if (IS_ERR(mgr)) return PTR_ERR(mgr);
    return 0;
}
```

## 실제 byte 전송은 보통 DMA

위 코드는 *register 1 byte씩* 전송이라 느립니다. 실 driver는 `BITSTREAM_DATA`를 *FIFO source*로 두고 *DMA*로 chunk push합니다 — Ch 6의 descriptor ring을 그대로 활용.

## Bitstream format

vendor별로 다릅니다.

| Vendor | Format | 특징 |
|--------|--------|------|
| Xilinx | `.bit`, `.bin` | sync word 0xAA995566, configuration packet |
| Xilinx XRT | `.xclbin` | AXI map + metadata + bitstream sections |
| Intel | `.rbf`, `.gbs` | PR-bitstream, AFU UUID 포함 |
| AWS F1 | AFI (Amazon FPGA Image) | S3 hosted, custom format |

driver는 보통 *공통 헤더*만 확인하고 bit-level은 FPGA HW에 위임합니다.

## Encrypted bitstream

production에서는 IP 보호를 위해 *암호화된* bitstream을 씁니다.

- **AES-256** — bitstream payload 암호화
- **RSA-3072 / ECDSA** — signature 검증
- Key는 *eFUSE*에 burn — runtime에 노출 안 됨
- Linux는 *key 정보 전달*만 — 실 복호화는 FPGA HW

```c
struct fpga_image_info info = {
    .flags = FPGA_MGR_ENCRYPTED_BITSTREAM,
    /* key는 device 자체에 fuse-locked */
};
fpga_mgr_load(mgr, &info);
```

## DFL — bitstream에 metadata 포함

**DFL**(Device Feature List)은 *bitstream 자체*에 device feature 정보가 들어 있는 패턴(Ch 12). Intel PAC의 표준 — Linux가 parse해서 sub-device를 *자동 discovery*합니다.

## 흔한 함정

- **partial bitstream을 full mode로 load** — 실 FPGA는 fabric corruption. 반드시 mode flag 정확히.
- **bitstream 중간에 power loss** — *brick* 가능성. management subsystem이 fallback partition 가지고 있어야.
- **encryption key 부재** — encrypted bitstream을 *key 없는* device에 load하면 BAD_KEY error.
- **chunk size 너무 작음** — chunk 1KB로 도는 driver는 register write가 GB 단위 bitstream에서 분 단위 소요. DMA로 옮겨야.

## 정리

- Linux **fpga_mgr subsystem**이 vendor에 무관하게 bitstream load를 표준화.
- driver는 `fpga_manager_ops`(write_init·write·write_complete·state·status) 구현.
- State machine: UNKNOWN → WRITE_INIT → WRITE → WRITE_COMPLETE → OPERATING.
- Full vs partial(Ch 8) 두 모드. Encrypted bitstream은 AES + RSA, key는 eFUSE.
- userspace는 `cat bitstream > /sys/class/fpga_manager/.../firmware`로 push.
- 실 driver는 byte FIFO 대신 *DMA*로 chunk 전송 — Ch 6 descriptor ring 재사용.
- DFL은 bitstream에 *metadata*를 포함하는 형식 — Ch 12에서.

## 다음 장 예고

다음 장은 *동적 부분 교체* — **Partial Reconfiguration**입니다. FPGA의 일부 영역만 *runtime에* 새 bitstream으로 교체하는 메커니즘과 driver 측 quiesce/isolate/program/resume 흐름.

## 관련 항목

- [Ch 6: DMA Descriptor Ring](/blog/tools/emulation/qemu-fpga-driver/chapter06-dma-descriptor-ring)
- [Ch 8: Partial Reconfiguration](/blog/tools/emulation/qemu-fpga-driver/chapter08-partial-reconfig)
- [Ch 12: OPAE·DFL Framework](/blog/tools/emulation/qemu-fpga-driver/chapter12-opae-dfl)
- [Bootloader Internals](/blog/embedded/bootloader/chapter01-boot-problem) — firmware load 일반
