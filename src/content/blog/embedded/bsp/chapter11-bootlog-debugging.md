---
title: "부트로그 디버깅 — earlyprintk·loglevel·serial 추적"
slug: "embedded/bsp/chapter11-bootlog-debugging"
date: 2026-05-18T09:11:00
description: "부트 실패 패턴을 카탈로그로 정리합니다. 시리얼 garbage, hang, panic, late hang의 진단과 대응을 살펴봅니다."
series: "BSP Development"
seriesOrder: 11
tags: [embedded, bsp, debugging, bootlog]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**부팅 실패는 마지막 줄로 분류합니다.** 시리얼이 깨지는가, 특정 줄에서 멈추는가, panic 메시지가 나오는가, userspace에서 멈추는가에 따라 볼 곳이 다릅니다.

[Ch 10](/blog/embedded/bsp/chapter10-first-boot)이 정상 부팅을 따라갔다면, 이 장은 실패를 일부러 만들어 봅니다. 같은 QEMU 체인(TF-A v2.15.0 → U-Boot v2024.04 → Linux 6.12 `defconfig` → Debian 13 rootfs)에서 커널 인자와 DT를 하나씩 틀리게 바꿔, 각 실패가 시리얼에 무엇을 남기는지 기록했습니다. 시리얼 깨짐처럼 QEMU에서 재현할 수 없는 경우는 그렇다고 적었습니다.

## 모드 1 — 시리얼 garbage

시리얼에 깨진 문자가 나오는 경우입니다. QEMU의 가상 UART는 baud rate를 흉내 내지 않으므로 이 글에서는 재현하지 않았습니다. 그래서 "어떤 garbage면 어떤 baud"라는 대응표는 싣지 않습니다.

원인 후보는 이 시리즈의 앞 장에서 소스로 확인한 것들입니다.

- **baud rate**: U-Boot 기본값은 `CONFIG_BAUDRATE` 115200(Ch 4)이고, 커널은 `console=ttymxc1,115200`처럼 인자로 받습니다(Ch 6).
- **UART 클록**: i.MX 8M Plus 콘솔은 24 MHz 오실레이터를 직접 받고, U-Boot의 `imx_get_uartclk()`는 `24000000U`를 상수로 돌려줍니다(Ch 4). 보드 crystal이 다르면 모든 baud가 같은 비율로 어긋납니다.
- **pinmux**: UART pad의 mux 레지스터를 U-Boot `md.l`로 읽어 mux mode를 봅니다. i.MX 8M Plus UART2_RXD는 `0x30330228`입니다(Ch 4).

## 모드 2 — hang (정지)

특정 줄까지 나오고 멈추는 경우입니다. 멈춘 *마지막 줄*이 가장 큰 단서입니다.

### 패턴 2a — SPL 다음에 멈춤

i.MX 8M Plus EVK의 SPL은 DDR 초기화 뒤 `Trying to boot from BOOTROM`으로 ROM API를 통해 U-Boot를 받습니다(Ch 6). 여기서 멈추면 `flash.bin` 안의 `u-boot.itb`와 `bl31.bin`이 실제로 들어 있는지(binman의 "non-functional" 경고, Ch 6), BL31 적재 주소 `0x970000`이 TF-A `BL31_BASE`와 같은지(Ch 7)를 봅니다.

### 패턴 2b — `Starting kernel ...` 다음에 침묵

`console=ttyS0`만 주고(이 머신의 UART는 `ttyAMA0`) earlycon 없이 부팅한 결과입니다.

```text
Starting kernel ...


[chain-run] stop-pattern NOT matched after 30.4s wall
```

`Starting kernel ...`(QEMU 시작 후 3.1초) 뒤로 약 27초 동안 한 글자도 없었습니다. 커널은 돌고 있지만 출력할 콘솔이 없는 상태입니다. 첫 의심은 earlycon입니다. 인자 없이 `earlycon`만 주면 DT의 `stdout-path`를 따르고(`kernel-parameters.txt:1256`), Ch 10의 실행에서는 `earlycon: pl11 at MMIO 0x0000000009000000`이 찍혔습니다. 주소를 직접 줄 때의 이름은 UART 드라이버가 정합니다. PL011은 `pl011,<addr>`(1283행), i.MX는 `ec_imx6q,<addr>`(1359행, `drivers/tty/serial/imx_earlycon.c:45`)입니다.

```text
earlycon=ec_imx6q,0x30890000,115200
```

i.MX 8M Plus EVK의 U-Boot 환경에 들어 있는 값이 바로 이것입니다(Ch 6).

### 패턴 2c — PSCI에서 멈춤

DT의 PSCI `method`가 firmware와 다르면 커널은 첫 PSCI 호출에서 죽습니다. 실제 출력은 Ch 9에 있습니다. 마지막 정상 줄은 `psci: probing for conduit method from DT.`입니다.

### 패턴 2d — driver probe에서 멈춤

특정 장치의 probe가 끝나지 않으면 그 다음 줄이 나오지 않습니다. 어느 initcall에서 멈췄는지는 `initcall_debug`로 봅니다. 이 출력은 debug 레벨이라 `ignore_loglevel`도 함께 줘야 콘솔에 나옵니다. 같은 커널을 `initcall_debug`만 주고 부팅했을 때 콘솔의 `calling` 줄은 1개였고, `ignore_loglevel`을 더하니 1,801개가 됐습니다. initcall 로그가 `printk(KERN_DEBUG "calling  %pS @ %i\n", ...)`로 찍히기 때문입니다(`init/main.c:1215`, `:1225`).

```text
[    0.283749] calling  of_platform_default_populate_init+0x0/0x118 @ 1
[    0.329547] initcall of_platform_default_populate_init+0x0/0x118 returned 0 after 36000 usecs
```

멈췄다면 마지막 `calling` 줄 뒤에 짝이 되는 `returned` 줄이 없습니다. 그 함수가 범인입니다.

## 모드 3 — Kernel panic

panic은 메시지가 원인을 직접 말해 주는 편입니다. 실제로 일으킨 두 가지입니다.

### "Unable to mount root fs"

`root=`를 주지 않고 부팅했습니다.

```text
[    0.603386] VFS: Cannot open root device "" or unknown-block(0,0): error -6
[    0.604370] Kernel panic - not syncing: VFS: Unable to mount root fs on unknown-block(0,0)
[    0.604734] CPU: 2 UID: 0 PID: 1 Comm: swapper/0 Not tainted 6.12.0 #1
[    0.604894] Hardware name: linux,dummy-virt (DT)
[    0.605068] Call trace:
...
[    0.606016]  mount_root_generic+0x1f8/0x2b0
[    0.606090]  mount_root+0x208/0x248
[    0.606150]  prepare_namespace+0x1d8/0x240
[    0.606214]  kernel_init_freeable+0x254/0x278
```

두 줄은 `init/do_mounts.c`의 220행(`VFS: Cannot open root device ...`)과 236행(`VFS: Unable to mount root fs on %s`)에서 나옵니다. `""`는 `root=`가 비었다는 뜻이고 `error -6`은 `-ENXIO`입니다. 이 메시지가 보이면 세 가지를 확인합니다.

1. `root=`가 실제 장치를 가리키는가. Ch 10의 성공한 부팅은 `root=PARTUUID=1f342af3-...`였고, 커널은 `vda: vda1 vda15`로 그 디스크를 찾았습니다.
2. 그 장치의 드라이버와 파일시스템이 빌트인인가. Ch 8의 `defconfig`에는 `CONFIG_VIRTIO_BLK=y`, `CONFIG_EXT4_FS=y`, i.MX용 `CONFIG_MMC_SDHCI_ESDHC_IMX=y`가 있습니다.
3. 장치가 늦게 나타나는 경우를 위해 `rootwait`가 있는가.

### "Requested init failed"

rootfs는 마운트됐지만 init이 없는 경우입니다. `init=/sbin/nonexistent`를 줬습니다.

```text
[    0.694862] VFS: Mounted root (ext4 filesystem) readonly on device 254:1.
[    0.783406] Run /sbin/nonexistent as init process
[    0.786976] Kernel panic - not syncing: Requested init /sbin/nonexistent failed (error -2).
```

`init=`를 명시하면 `init/main.c:1512`의 이 panic이 나고, 명시하지 않았는데 기본 후보가 모두 없으면 1531행의 `No working init found.  Try passing init= option to kernel.`가 납니다. `error -2`는 `-ENOENT`입니다.

### Oops — PC를 소스 줄로

Oops의 `pc :`와 `lr :` 줄은 `함수+오프셋/크기` 형식입니다. 빌드할 때 남긴 `vmlinux`(Ch 8)와 커널 트리의 `scripts/faddr2line`으로 소스 줄을 찾습니다. Ch 9의 PSCI `method` 오류 Oops로 해 본 결과입니다.

```text
$ ./scripts/faddr2line vmlinux __arm_smccc_hvc+0x4/0x30 __invoke_psci_fn_hvc+0x40/0x70
__arm_smccc_hvc+0x4/0x30:
__arm_smccc_hvc at arch/arm64/kernel/smccc-call.S:43

__invoke_psci_fn_hvc+0x40/0x70:
__invoke_psci_fn_hvc at drivers/firmware/psci/psci.c:120
```

KASLR가 켜져 있어도(Ch 10 로그의 `KASLR enabled`) `함수+오프셋` 형식은 그대로 쓸 수 있습니다. 실행 주소가 아니라 심볼 기준이기 때문입니다.

## 모드 4 — late hang (userspace 단계)

커널은 `Run /sbin/init`까지 왔는데 login이 안 나오는 경우입니다. Ch 10의 정상 로그에서 시리얼 login은 `serial-getty@ttyAMA0.service`가 띄웠습니다. 그 unit이 콘솔 이름(`ttyAMA0`, i.MX라면 `ttymxc1`)과 맞는지가 첫 확인입니다. userspace가 어디서 시간을 쓰는지는 `systemd-analyze blame`과 `critical-chain`으로 봅니다(Ch 10, Ch 15).

## 진단 도구들

### dmesg와 /proc

```bash
dmesg                          # 커널 메시지
dmesg -l err,warn              # 오류·경고만
cat /proc/cmdline              # 실제로 받은 커널 인자
cat /proc/device-tree/...      # 커널이 받은 DT (Ch 3)
```

Ch 10에서 `/proc/cmdline`은 U-Boot `bootargs`와 같은 문자열이었습니다. 다르면 부트로더가 인자를 덮어쓰거나 DT `chosen/bootargs`가 쓰인 것입니다.

### debugfs

이 시리즈에서 실제로 읽은 debugfs 파일은 `clk/clk_summary`(Ch 4), `regulator/regulator_summary`(Ch 12), `devices_deferred`(Ch 12), `wakeup_sources`(Ch 13), `pinctrl/`(Ch 4)입니다. 모두 `CONFIG_DEBUG_FS=y`가 필요하고, Ch 8의 arm64 `defconfig`에는 켜져 있습니다.

### earlyprintk와 earlycon

arm64에서 초기 콘솔은 `earlycon`입니다. 위 패턴 2b의 형식을 씁니다.

### ftrace

`kernel-parameters.txt`에 부팅 시점부터 tracing을 켜는 인자가 있습니다. `ftrace=[tracer]`(1575행), `trace_event=[event-list]`(6811행), `trace_buf_size=nn[KMG]`(6786행)입니다. 이 글에서는 부팅 ftrace를 실행하지 않았습니다.

### kgdb와 JTAG

JTAG 없이도 시리얼 위에서 kgdb를 쓸 수 있습니다. `kgdboc=`(2589행)로 콘솔을 지정하고 `kgdbwait`(2614행)를 주면 커널이 초기에 멈춰 호스트 gdb를 기다립니다.

```text
kgdboc=ttymxc1,115200 kgdbwait
```

이 글에서는 kgdb 세션과 JTAG을 실행하지 않았습니다.

### console muxing

`console=`를 여러 번 주면 모든 콘솔에 출력하고, `/dev/console`은 마지막 `console=`이 가리키는 장치가 됩니다(`Documentation/admin-guide/serial-console.rst:39`).

```text
console=tty0 console=ttymxc1,115200
```

## 부팅 실패 진단 체크리스트

- [ ] 시리얼 마지막 줄이 무엇인가 (Ch 10의 결정 트리)
- [ ] `earlycon`이 인자에 있고 이름(`pl011`, `ec_imx6q`)과 주소가 맞는가
- [ ] `console=` 장치 이름이 보드의 UART와 맞는가
- [ ] `root=`가 실제 장치를 가리키고, 그 드라이버가 빌트인인가
- [ ] `initcall_debug ignore_loglevel`로 멈춘 initcall을 찾았는가
- [ ] Oops라면 `faddr2line`으로 PC를 소스 줄로 바꿨는가

## 흔한 실수

- **시리얼 케이블의 TX/RX 교차**: 보드 TX → 호스트 RX, 보드 RX → 호스트 TX. BeagleBone Black J1 헤더는 4번 RX, 5번 TX입니다(Ch 1).
- **UART 전압 불일치**: BeagleBone Black J1 신호는 3.3 V입니다(Ch 1). 어댑터 전압을 보드 문서와 맞춥니다.
- **`initcall_debug`만 주기**: 위에서 본 것처럼 `ignore_loglevel` 없이는 1줄만 나왔습니다.
- **`vmlinux`를 버림**: 같은 빌드의 `vmlinux` 없이는 `faddr2line`이 쓸 수 없습니다. 이미지와 함께 보관합니다.
- **earlycon 이름 착오**: i.MX의 이름은 `ec_imx6q`입니다. `drivers/tty/serial/earlycon.c:196-207`은 이름 뒤 글자가 `,`나 문자열 끝이 아니면 그 항목을 건너뛰므로, `ec_imx6q0`처럼 숫자를 붙이면 일치하는 earlycon이 없습니다.

## 정리

- 시리얼 깨짐은 QEMU에서 재현할 수 없어 대응표 대신 Ch 4의 클록·pinmux 확인 절차를 씁니다.
- `Starting kernel ...` 뒤 침묵은 콘솔 문제입니다. `earlycon`(DT `stdout-path`)으로 바로 보였습니다.
- `VFS: Unable to mount root fs`(`do_mounts.c:236`)와 `Requested init ... failed`(`main.c:1512`)를 실제로 일으켜 원인과 메시지를 짝지었습니다.
- `initcall_debug`는 `ignore_loglevel`과 함께 써야 콘솔에 나옵니다.
- Oops의 `pc`는 `scripts/faddr2line vmlinux 함수+오프셋/크기`로 소스 줄이 됩니다.

## 다음 편 예고

[Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add)에서는 보드 specific peripheral을 통합할 때 기존 드라이버 활용과 DT binding 작성을 살펴봅니다.

## 관련 항목

- [Ch 10: 첫 부팅 — 0%부터 login prompt까지](/blog/embedded/bsp/chapter10-first-boot)
- [Ch 12: 드라이버 추가](/blog/embedded/bsp/chapter12-driver-add)
- [Ch 13: Power Management](/blog/embedded/bsp/chapter13-power-management)
- [Embedded Performance Engineering](/blog/embedded/performance-engineering/00-preface) — ftrace 활용
- [Modern Embedded Recipes](/blog/embedded/modern-recipes/00-preface) — 양산 디버깅
