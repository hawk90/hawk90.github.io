---
title: "Ch 7: 비트스트림 로딩"
date: 2025-09-04T07:00:00
description: "Driver의 firmware push — FPGA Manager subsystem."
tags: [QEMU, bitstream, fpga-manager, firmware-load]
series: "FPGA Driver via QEMU+VFIO"
seriesOrder: 7
draft: true
---

## 이 챕터의 의도

FPGA는 bitstream을 받아야 user logic이 살아난다. Linux는 fpga_mgr subsystem 덕분에 어떤 FPGA든 같은 인터페이스로 program할 수 있고, driver는 fpga_mgr_ops만 구현하면 된다. 이 장에서는 fake-fpga에 bitstream load 명령을 추가하고 driver를 fpga_mgr에 등록한다.

## 핵심 항목

- ✦ Linux **FPGA Manager subsystem** — `drivers/fpga/fpga-mgr.c`
- ✦ Driver가 `struct fpga_manager_ops` 등록 — write_init / write / write_complete / state / status
- ✦ Bitstream load path
  1. userspace `cat bitstream.bit > /sys/class/fpga_manager/fpga0/firmware`
  2. fpga_mgr core가 driver write_init → write (chunk loop) → write_complete 호출
  3. driver가 FPGA shell에 byte 전송
- ✦ Programming modes
  - **Full reconfiguration** — 전체 FPGA reprogram
  - **Partial reconfiguration** (Ch 8) — 일부 영역만
- ✦ Encrypted / authenticated bitstream — AES + signature (Xilinx, Intel)
- ✦ `fpga_image_info` — flags (FPGA_MGR_PARTIAL_RECONFIG, ENCRYPTED_KEY), key
- ✦ State machine — UNKNOWN → WRITE_INIT → WRITE → WRITE_COMPLETE → OPERATING
- ✦ Error handling — abort, recovery
- ✦ QEMU 측 simulation — bitstream byte 받으면 simple ACK (실제 program은 안 함, magic header만 검증)
- ✦ Xilinx **XRT** xclbin format vs Intel **OPAE** GBS format 비교
- ✦ DFL (Device Feature List) — bitstream에 metadata 포함, Linux가 parse
- ◦ Bitstream encryption key 관리 — KMS, TPM, secure boot chain

## 다이어그램 (3)

1. fpga_mgr subsystem 구조 (userspace → core → driver ops → FPGA)
2. Load state machine
3. Xilinx xclbin vs Intel GBS layout 비교

## 코드 sketch

```c
/* QEMU 측 — bitstream write register */
#define BITSTREAM_CTRL    0x1000
#define BITSTREAM_STATUS  0x1004
#define BITSTREAM_DATA    0x1010   /* FIFO */
#define BITSTREAM_SIZE    0x1018

static void bitstream_write(FakeFPGA *s, uint64_t off, uint64_t val) {
    if (off == BITSTREAM_CTRL && val == BITSTREAM_GO) {
        /* fake: header 검증 후 ACK */
        if (s->bitstream_recv_bytes >= 4 && memcmp(s->bitstream_buf, "\xaa\x99\x55\x66", 4) == 0) {
            s->bitstream_status = BITSTREAM_OK;
            s->user_logic_loaded = true;
        } else {
            s->bitstream_status = BITSTREAM_BAD_HEADER;
        }
        msix_notify(&s->parent, BITSTREAM_MSIX_VEC);
    } else if (off == BITSTREAM_DATA) {
        /* FIFO write — 누적 */
        if (s->bitstream_recv_bytes < MAX_BITSTREAM)
            s->bitstream_buf[s->bitstream_recv_bytes++] = val & 0xff;
    }
}
```

```c
/* Driver — fpga_mgr ops 등록 */
static int my_fpga_mgr_write_init(struct fpga_manager *mgr,
                                   struct fpga_image_info *info,
                                   const char *buf, size_t count) {
    struct my_fpga *f = mgr->priv;
    writel(0, f->shell_mmio + BITSTREAM_CTRL);   /* reset */
    f->bytes_sent = 0;
    return 0;
}

static int my_fpga_mgr_write(struct fpga_manager *mgr, const char *buf, size_t count) {
    struct my_fpga *f = mgr->priv;
    /* chunk를 BITSTREAM_DATA FIFO에 (실제는 DMA로) */
    for (size_t i = 0; i < count; i++) {
        writel(buf[i], f->shell_mmio + BITSTREAM_DATA);
    }
    f->bytes_sent += count;
    return 0;
}

static int my_fpga_mgr_write_complete(struct fpga_manager *mgr, struct fpga_image_info *info) {
    struct my_fpga *f = mgr->priv;
    writel(BITSTREAM_GO, f->shell_mmio + BITSTREAM_CTRL);
    /* wait for IRQ or polling */
    return wait_for_load_complete(f, 5 * HZ);
}

static const struct fpga_manager_ops my_fpga_mgr_ops = {
    .write_init     = my_fpga_mgr_write_init,
    .write          = my_fpga_mgr_write,
    .write_complete = my_fpga_mgr_write_complete,
    .state          = my_fpga_mgr_state,
    .status         = my_fpga_mgr_status,
};

static int my_fpga_probe(...) {
    struct fpga_manager *mgr = devm_fpga_mgr_register(&pdev->dev, "my-fpga-mgr",
                                                      &my_fpga_mgr_ops, f);
    /* ... */
}
```

```bash
# Userspace로 bitstream load
echo my-fpga.bit > /sys/class/firmware/timeout
echo 0 > /sys/class/fpga_manager/fpga0/state
cat my-fpga.bit > /sys/class/fpga_manager/fpga0/firmware
cat /sys/class/fpga_manager/fpga0/state
# operating
```

## 레퍼런스

- Linux `Documentation/driver-api/fpga/fpga-mgr.rst`
- Linux `drivers/fpga/` — fpga-mgr core + vendor drivers
- Xilinx XRT xclbin format
- Intel PAC GBS (Green Bit Stream) format
- DFL (Device Feature List) — Linux `drivers/fpga/dfl*.c`

## 관련 항목

- [Ch 6: DMA descriptor ring](/blog/tools/emulation/qemu-fpga-driver/chapter06-dma-descriptor-ring)
- [Ch 8: Partial Reconfiguration](/blog/tools/emulation/qemu-fpga-driver/chapter08-partial-reconfig)
- [Ch 12: OPAE/DFL framework](/blog/tools/emulation/qemu-fpga-driver/chapter12-opae-dfl)
