---
title: "Ch 11: 부트로그 디버깅"
date: 2026-05-09T11:00:00
description: "부트 실패 패턴을 카탈로그로 정리합니다. 시리얼 garbage, hang, panic, late hang의 진단과 대응을 살펴봅니다."
series: "BSP Development"
seriesOrder: 11
tags: [embedded, bsp, debugging, bootlog]
draft: false
---

## 한 줄 요약

**부팅 실패는 4가지 모드로 수렴합니다 — 시리얼 garbage, hang, panic, late hang.** 각 모드의 *원인 집합*은 좁고 명확합니다. 어떤 모드인지 5초 안에 분류하고, 해당 모드의 첫 의심부터 확인하는 것이 BSP 디버깅의 기본기입니다.

[Ch 10](/blog/embedded/bsp/chapter10-first-boot)에서 정상 부팅의 단계를 따라갔다면, 이번 글은 *비정상*의 카탈로그입니다. 각 패턴을 진단 명령과 함께 정리합니다. 보드 50개를 부팅하는 BSP 엔지니어는 결국 이 카탈로그를 머릿속에 갖게 됩니다.

## 모드 1 — 시리얼 garbage

시리얼에 *알 수 없는 깨진 문자*가 나옵니다. `U�4☐2*▒` 같은 형태입니다.

```text
U�4☐2*▒~������
```

원인은 거의 항상 **UART baud rate 불일치**입니다.

```bash
# host side에서 다른 속도로 다시 시도
picocom -b 115200 /dev/ttyUSB0
picocom -b 921600 /dev/ttyUSB0
picocom -b 38400 /dev/ttyUSB0
```

자주 보이는 짝:

| host에서 본 garbage | 실제 보드 baud | 추정 host 설정 |
|---------------------|----------------|----------------|
| `U�4☐2` | 115200 | 38400 또는 9600 |
| `XXXXXX` 반복 | 보통 다른 속도 | 4배 차이 |
| 짧은 글자 + `~` | 115200 | 230400 |

baud rate가 맞는데도 garbage라면 **UART pinmux** 잘못입니다.

```bash
# 부트로더에서 pinmux dump
=> md.l 0x30330014 1   # IOMUXC_SW_PAD_CTL_PAD_<UART_RX>
=> md.l 0x30330018 1   # IOMUXC_SW_PAD_CTL_PAD_<UART_TX>
```

DT의 `pinctrl-0`이 가리키는 핀이 실제 UART 핀이 맞는지, voltage(1.8V vs 3.3V)가 맞는지 확인합니다.

세 번째 가능성은 **클럭 부정확**입니다. 24 MHz 크리스털이 실제로 23.6 MHz라면 baud rate 계산이 어긋납니다. 오실로스코프로 측정합니다.

## 모드 2 — hang (정지)

특정 라인까지 나오고 *영영* 멈춥니다. 가장 빈번한 패턴이며, 멈춘 *마지막 라인*이 진단의 핵심 단서입니다.

### 패턴 2a — SPL 후 hang

```text
U-Boot SPL 2023.04 (Sep 12 2025 - 14:23:01 +0000)
DDR4 dram init done
Trying to boot from MMC1
<침묵>
```

ATF BL31 또는 U-Boot proper가 DRAM의 어떤 주소로 로드되지 못했거나, 그 주소로의 점프가 실패한 경우입니다. 흔한 원인:

- ATF BL31의 entry address가 DRAM 범위 밖.
- FIT image의 hash 불일치 (보안 부팅 활성 시).
- U-Boot proper가 SPL과 *다른 DDR 구역*에 빌드되어 충돌.

부트로더의 `imx_load_image.cfg`(NXP) 또는 `boot.cfg`(Rockchip) 같은 image manifest의 주소가 메모리 맵과 일치하는지 확인합니다.

### 패턴 2b — U-Boot proper 진입 직후 hang

```text
U-Boot 2023.04 (Sep 12 2025 - ...)

CPU:   Freescale i.MX8MMQ rev1.0 1800 MHz (running at 1200 MHz)
<침묵>
```

대체로 **DRAM training은 통과했지만 동작이 불안정**합니다. CPU 코어가 DRAM에 두 번째 접근에서 실패합니다. SPD/calibration값을 다시 측정해 `lpddr4_timing.c`(또는 `ddr3l_timing.c`)를 조정합니다.

### 패턴 2c — Kernel decompress 후 hang

```text
=> booti ${loadaddr} - ${fdt_addr_r}
## Flattened Device Tree blob at 43000000
   Booting using the fdt blob at 0x43000000
   Loading Device Tree to 00000000bfff7000, end 00000000bffffae8 ... OK

Starting kernel ...

<침묵>
```

**`earlycon`이 설정되지 않음**이 1번 의심입니다. `bootargs`에 다음을 추가합니다.

```text
earlycon=ec_imx6q0,0x30890000,115200n8
```

UART base address는 SoC TRM에 적힌 값을 정확히 써야 합니다. `console=ttymxc0,115200`만 있어서는 `console`이 활성화되는 시점까지 침묵합니다.

두 번째 의심은 **잘못된 DTB**입니다. U-Boot가 다른 보드의 DTB를 로드했거나, 메모리 노드의 base가 잘못되어 커널이 자기 자신을 RAM 밖으로 복사하면 hang합니다.

### 패턴 2d — driver probe에서 hang

```text
[    1.234567] mmc0: registering SD-class host controller
<침묵>
```

특정 디바이스 probe에서 멈춥니다. MMC, I2C, SPI 드라이버가 응답하지 않는 디바이스를 폴링하면 timeout 처리 안 한 코드에서 hang합니다.

```bash
# bootargs에 추가해 어디서 멈췄는지 정확히 본다
initcall_debug printk.time=1 ignore_loglevel
```

이렇게 하면 dmesg에 다음 형태가 나옵니다.

```text
[    1.234567] calling  sdhci_drv_init+0x0/0x40 @ 1
[    1.245678] initcall sdhci_drv_init+0x0/0x40 returned 0 after 11000 usecs
[    1.246789] calling  sdhci_pltfm_init+0x0/0x60 @ 1
<멈춤 — 이 함수가 범인>
```

## 모드 3 — Kernel panic

```text
[    1.234567] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)
[    1.345678] CPU: 0 PID: 1 Comm: swapper/0 Not tainted 6.6.0 #1
[    1.456789] Call trace:
[    1.567890]  dump_backtrace+0xe0/0xf0
[    1.678901]  show_stack+0x18/0x24
[    1.789012]  dump_stack_lvl+0x60/0x84
[    1.890123]  panic+0x148/0x350
[    1.901234]  mount_block_root+0x180/0x270
```

panic은 *원인이 메시지에 적혀 있다*는 점이 그나마 다행입니다. 패턴별로 대응:

### "Unable to mount root fs"

`bootargs`의 `root=`이 가리키는 디바이스가 없거나 인식 안 됨.

```bash
# 진단
# 1) MMC 드라이버가 빌트인인지 확인
zcat /proc/config.gz | grep -E "MMC|MMC_SDHCI"
# CONFIG_MMC=y, CONFIG_MMC_SDHCI=y 여야 함

# 2) 부팅 시 인식된 디바이스 확인
[    1.234567] mmc0: new HS200 MMC card at address 0001
[    1.345678] mmcblk0: mmc0:0001 SDW32G 29.7 GiB
[    1.456789]  mmcblk0: p1 p2 p3

# 3) bootargs와 일치하는지 확인
root=/dev/mmcblk0p2   # mmcblk0의 p2 — 위 로그와 일치
```

`rootwait`도 잊지 말아야 합니다. MMC가 비동기로 인식되는 보드는 `rootwait` 없으면 panic합니다.

### "No init found"

rootfs는 마운트됐지만 `/sbin/init`가 없음.

```bash
# 다른 init 시도
rdinit=/bin/sh           # initramfs 단계
init=/bin/sh             # rootfs 단계

# 마운트 후 콘솔 진입해 검증
mount /dev/mmcblk0p2 /mnt
ls -l /mnt/sbin/init /mnt/lib/systemd/systemd
```

### NULL pointer dereference

드라이버 버그. Call trace의 PC와 LR로 어느 함수인지 식별.

```bash
# 호스트에서 심볼 매칭
aarch64-linux-gnu-addr2line -e vmlinux -f 0xffffffc008abcdef
# 또는
gdb-multiarch vmlinux
(gdb) l *0xffffffc008abcdef
```

`vmlinux`(non-stripped)가 빌드 시 보존되어 있어야 합니다.

## 모드 4 — late hang (init 단계 정지)

커널은 정상이고 init까지 진입했는데 *userspace에서* 멈춥니다.

```text
[    4.890123] systemd[1]: Reached target Multi-User System.
<침묵>
```

원인 후보:

- **getty가 시리얼 콘솔에 못 attach**: `/etc/systemd/system/getty.target.wants/serial-getty@ttymxc0.service` 존재하는지.
- **OOM**: 메모리 부족으로 init/systemd 또는 자식이 죽음. 다음 boot 시 dmesg에 `Out of memory: Killed process ...`.
- **udev rule 무한 대기**: `udevadm settle`이 timeout까지 기다림. `journalctl -b` 에서 확인.

콘솔이 막혀 진단 어려우면 다음 boot에서 `bootargs`에 `systemd.log_level=debug systemd.log_target=console` 추가.

## 진단 도구들

### dmesg와 /proc

```bash
dmesg                          # 모든 커널 메시지
dmesg -T                       # 사람 시간으로
dmesg -l err,warn              # 오류만
cat /proc/cmdline              # 부팅 시 커널 인자
cat /proc/version              # 커널 버전, 빌드 정보
cat /proc/interrupts           # 인터럽트 카운트
cat /proc/iomem                # I/O 메모리 맵
cat /proc/device-tree/...      # DT 라이브 뷰
```

### debugfs

```bash
mount -t debugfs none /sys/kernel/debug

ls /sys/kernel/debug/
# clk/        — clock tree
# regmap/     — register cache 들
# pinctrl/    — pin 설정
# regulator/  — 전원 도메인
# gpio        — gpio 상태
# tracing/    — ftrace

cat /sys/kernel/debug/clk/clk_summary
cat /sys/kernel/debug/pinctrl/<dev>/pinmux-functions
cat /sys/kernel/debug/regulator/regulator_summary
```

`CONFIG_DEBUG_FS=y`가 빌트인이어야 동작합니다.

### earlyprintk vs earlycon

이름이 비슷한 두 메커니즘이 자주 헷갈립니다.

| 옵션 | 의미 | 활성 시기 |
|------|------|-----------|
| `earlyprintk` | 보드별 *fixed* early console. legacy. | 일부 보드만 지원 |
| `earlycon` | DT-based 또는 explicit address. 표준 | arm64 표준 |

arm64는 `earlycon`을 쓰고, 32-bit ARM에서는 `earlyprintk`가 남아 있는 보드가 있습니다. 새 보드라면 `earlycon`이 정답입니다.

```text
# 명시적 주소
earlycon=uart8250,mmio32,0xfe215040,115200n8

# DT의 stdout-path 사용
earlycon
```

### ftrace — 커널 함수 트레이스

```bash
cd /sys/kernel/debug/tracing
echo function > current_tracer
echo 1 > tracing_on
sleep 1
echo 0 > tracing_on
cat trace | head -50
```

probe 단계의 hang을 좁히는 데 효과적입니다. 부팅 단계에서 ftrace를 켜려면 `bootargs`에 `ftrace=function trace_event=irq:* trace_buf_size=4M`.

### kgdb와 JTAG

심각한 hang에서는 동적 추적이 한계입니다. JTAG로 정지된 CPU의 PC, LR, SP를 직접 봅니다.

```bash
# OpenOCD
openocd -f interface/jlink.cfg -f target/imx8mm.cfg

# 다른 터미널에서 gdb
gdb-multiarch vmlinux
(gdb) target remote :3333
(gdb) info registers
(gdb) bt
```

JTAG가 없어도 `kgdb`를 시리얼 위에서 쓸 수 있습니다.

```text
# bootargs
kgdboc=ttymxc0,115200 kgdbwait
```

부팅 중 `kgdbwait`에서 멈추고 호스트의 gdb가 attach될 때까지 기다립니다.

### console muxing

여러 콘솔을 동시에 쓸 수 있습니다.

```text
console=ttymxc0,115200 console=tty0
```

마지막에 적은 console이 *primary*(`/dev/console`)가 됩니다. 시리얼과 HDMI 모두에 보내고 싶으면 둘 다 적습니다.

## 부팅 실패 진단 체크리스트

- [ ] 시리얼 어디까지 나왔나? (마지막 5줄 캡처)
- [ ] baud rate가 맞나? (다른 속도 2~3개 시도)
- [ ] BootROM / SPL / ATF / U-Boot / kernel 중 어디서 멈췄나?
- [ ] `earlycon`이 인자에 있나?
- [ ] `bootargs`의 `root=`, `console=`가 보드와 일치하나?
- [ ] `dmesg -l err`에 의심 라인 있나?
- [ ] `/proc/cmdline`이 부팅 인자와 일치하나?
- [ ] driver probe가 실패한 디바이스 있나?
- [ ] OOM 또는 watchdog reboot loop인가?

## 흔한 실수

- **시리얼 케이블의 TX/RX 교차**: 보드 TX → host RX, 보드 RX → host TX. 한쪽만 들려도 디버그는 가능합니다.
- **UART voltage 불일치**: 보드 1.8 V UART에 3.3 V USB-Serial을 연결하면 입력은 보이지만 host → 보드 키 입력이 안 됩니다. level shifter 필요.
- **`bootargs`를 SPL에서 설정한 줄로 착각**: SPL은 보통 bootargs를 안 만집니다. U-Boot proper의 `bootcmd`에서 `setenv bootargs ...`로 설정합니다.
- **`CONFIG_PRINTK_TIME` 비활성**: dmesg에 timestamp가 없어 *어느 함수가 느린지* 분석 불가.
- **양산 펌웨어에서 `quiet`**: 필드에서 부팅 문제가 생기면 정보가 거의 없습니다. 양산이라도 시리얼 콘솔에는 verbose를 유지하는 편이 안전.

## 정리

- 부팅 실패는 garbage, hang, panic, late hang의 4가지 모드로 분류됩니다.
- 시리얼 garbage는 baud rate, pinmux, 클럭 중 하나입니다.
- Hang은 *마지막 라인*이 핵심 단서이며, SPL·U-Boot proper·kernel decompress·driver probe 단계에 따라 의심 영역이 다릅니다.
- Kernel panic은 메시지에 원인이 적혀 있으므로 `Unable to mount root fs`, `No init found`, NULL deref 패턴을 익혀 둡니다.
- Late hang은 systemd unit 실패, OOM, getty miss-attach가 흔합니다.
- `earlycon`은 BSP 초기에 절대 빠뜨리지 말아야 할 인자입니다.
- ftrace, kgdb, JTAG로 깊은 진단이 가능하지만 먼저 `dmesg`와 `/proc/cmdline`을 확인합니다.
- `CONFIG_DEBUG_FS`, `CONFIG_PRINTK_TIME`, `CONFIG_MAGIC_SYSRQ`는 디버깅 친화 옵션입니다.

## 다음 편 예고

[Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add)에서는 보드 specific peripheral을 통합할 때 기존 드라이버 활용과 DT binding 작성을 살펴봅니다.

## 관련 항목

- [Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)
- [Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add)
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management)
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/) — ftrace 활용
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/) — 양산 디버깅
