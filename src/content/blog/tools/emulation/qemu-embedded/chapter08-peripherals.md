---
title: "Ch 8: 페리페럴 추가"
date: 2026-05-17T08:00:00
description: "UART, SPI, I2C 등 페리페럴을 QEMU에 추가한다."
tags: [QEMU, UART, SPI, I2C, GPIO, chardev]
series: "QEMU Embedded Emulation"
seriesOrder: 8
draft: true
---

QEMU virt 머신의 기본 peripheral 외에도 *추가로 attach*할 수 있는 device들이 많습니다. UART 다중·SPI flash·I2C 센서·GPIO 입출력 — driver 개발 시나리오에 맞춰 attach하면 *실 보드*에 가깝게 시뮬레이션할 수 있습니다.

## 멀티 UART

기본 한 개 외에 *추가 UART*를 붙입니다.

```bash
qemu-system-aarch64 -M virt -cpu cortex-a72 -m 512M -nographic \
    -kernel Image \
    -serial mon:stdio \
    -serial tcp::4321,server,nowait \
    -append "console=ttyAMA0"
```

`-serial`을 여러 번 — 첫 번째는 stdio + monitor, 두 번째는 TCP 포트 4321(host에서 `nc localhost 4321`로 접속).

3 이상의 UART는 *vendor machine*(Ch 13)이 더 자연스럽습니다. virt 머신의 `-serial` 슬롯이 2개 한도이기 때문.

## UART backend 종류

| Backend | 명령 | 용도 |
|---------|------|------|
| stdio | `-serial mon:stdio` | 콘솔 |
| tcp | `-serial tcp::4321,server,nowait` | 네트워크 접속 |
| pty | `-serial pty` | host의 `/dev/pts/N`에 연결 |
| file | `-serial file:log.txt` | 콘솔 로그를 파일에 |
| null | `-serial null` | 출력 무시 |
| chardev | `-chardev ... -serial chardev:...` | 복잡한 redirect |

`pty`가 자주 쓰입니다 — `screen /dev/pts/3`이나 `minicom -D /dev/pts/3`으로 *실 시리얼* 같은 인터페이스.

## SPI 디바이스

virt 머신은 SPI controller가 기본 *없습니다*. vendor machine(예: STM32, sifive)이나 *명시적 add*가 필요. 학습용으로 *spike-spi*를 가정한 시뮬레이션:

```text
# QEMU에서 SPI 디바이스를 본격적으로 쓰려면 vendor machine 권장.
# 학습은 vendor machine 챕터(Ch 13) 참조.
```

vendor machine 사용 예:

```bash
qemu-system-arm -M netduinoplus2 -nographic \
    -drive file=spi-flash.bin,if=mtd,format=raw \
    -kernel firmware.elf
```

`netduinoplus2`(STM32F405)는 SPI controller + SPI flash device를 모사합니다.

## I2C 디바이스

virt 머신에 직접 I2C device는 어렵습니다. 다음 옵션:

1. **Vendor machine** — i.MX6/i.MX7·STM32에 기본 I2C bus.
2. **PCA9552 GPIO expander 같은 simple model** — 일부 QEMU 빌드에 포함.
3. **Custom I2C slave QOM** — 직접 작성 (QEMU Internals 시리즈에서).

학습용 예 (i.MX7d sabre):

```bash
qemu-system-arm -M mcimx7d-sabre \
    -kernel zImage -dtb imx7d-sdb.dtb -initrd rootfs.cpio.gz \
    -nographic -append "console=ttymxc0"
```

guest 안:

```bash
guest$ i2cdetect -y 0
     0  1  2  3  4  5  6  7  8  9  a  b  c  d  e  f
00:                         -- -- -- -- -- -- -- --
10: -- -- -- -- -- -- -- -- -- -- -- -- -- -- -- --
...
```

i.MX7d의 i2c1 bus에 *연결된 device*가 있다면 여기에 보입니다(시뮬레이션 한도).

## GPIO

virt 머신은 PL061 GPIO를 *옵션*으로 갖고 있습니다.

```dts
gpio@9030000 {
    compatible = "arm,pl061";
    reg = <0x00 0x9030000 0x00 0x1000>;
};
```

guest 안에서 sysfs로 접근:

```bash
guest$ ls /sys/class/gpio/
gpiochip480  export  unexport

guest$ echo 0 > /sys/class/gpio/export
guest$ echo out > /sys/class/gpio/gpio480/direction
guest$ echo 1 > /sys/class/gpio/gpio480/value
```

실 신호로 *외부에 영향을 주지는 않습니다* — QEMU는 *모델*. driver와 *어플리케이션 로직*만 검증합니다.

## chardev로 복합 redirect

```bash
qemu-system-aarch64 -M virt -m 512M -nographic \
    -chardev pty,id=ch1 \
    -device pl011,chardev=ch1 \
    -kernel Image -append "console=ttyAMA0"
```

`-chardev`는 *backend 정의*, `-device pl011,chardev=...`이 *frontend*에 연결. 분리 덕에 *N개 device + N개 backend*의 조합이 자유로움.

## host file 접근

guest와 host 사이 파일 공유 패턴.

### VirtIO-9p

```bash
qemu-system-aarch64 -M virt -m 512M -nographic \
    -kernel Image \
    -fsdev local,id=fs0,path=/home/user/share,security_model=mapped-xattr \
    -device virtio-9p-device,fsdev=fs0,mount_tag=shared
```

guest에서 mount:

```bash
guest$ mount -t 9p -o trans=virtio shared /mnt
guest$ ls /mnt
```

host의 `/home/user/share`가 guest의 `/mnt`. 개발 iteration에 매우 유용.

### VirtIO-fs (더 빠름)

```bash
# host
virtiofsd --socket-path=/tmp/vhost.sock --shared-dir=/home/user/share &

# QEMU
qemu-system-aarch64 -M virt -m 512M -nographic \
    -kernel Image \
    -chardev socket,id=char0,path=/tmp/vhost.sock \
    -device vhost-user-fs-device,queue-size=1024,chardev=char0,tag=myfs \
    -object memory-backend-memfd,id=mem,size=2G,share=on \
    -numa node,memdev=mem
```

VirtIO-9p보다 *수 배 빠름*. 큰 파일 작업에 적합.

## Virtio devices 모두

이미 사용한 것 외에도:

| device | 용도 |
|--------|------|
| `virtio-blk-device` | 블록 |
| `virtio-net-device` | 네트워크 |
| `virtio-rng-device` | 난수 생성 |
| `virtio-balloon-device` | 메모리 풍선 |
| `virtio-gpu-device` | GPU |
| `virtio-keyboard-device` | 키보드 |
| `virtio-mouse-device` | 마우스 |
| `virtio-serial-device` | 시리얼 (multi-port) |
| `virtio-input-device` | 입력 |
| `virtio-pmem-device` | persistent memory |

각 device가 *paravirt*로 설계되어 native에 가까운 성능.

## 흔한 함정

- **virt 머신에 SPI/I2C 부족** — vendor machine으로 옮기는 게 빠름.
- **`-serial` 슬롯 부족** — virt는 2개 한도. 더 필요하면 vendor machine 또는 chardev.
- **9p path 권한** — host 디렉터리의 owner와 guest 사용자가 다르면 access 거부.
- **GPIO 신호 부재** — QEMU GPIO는 *모델*. 실 외부 신호 없음. 학습 외에는 vendor machine + 실 device 필요.

## 정리

- virt 머신은 *최소한*의 peripheral. 추가는 `-serial`·`-device virtio-*`·`-chardev`·`-fsdev`로.
- 멀티 UART는 `-serial` 다중. backend는 stdio·tcp·pty·file·null·chardev.
- SPI·I2C·GPIO는 virt에 제한적 — vendor machine(Ch 13)이 더 자연스러움.
- VirtIO 다양: blk·net·rng·balloon·gpu·input·9p·fs·pmem. paravirt 표준.
- **VirtIO-9p**/**VirtIO-fs**로 host-guest 파일 공유. 개발 iteration 가속.
- guest GPIO는 sysfs로 접근 가능하지만 *실 외부 신호*는 없음 — 학습용.

## 다음 장 예고

다음 장은 *네트워킹*의 깊이. user-mode SLIRP·TAP·socket back-end를 비교하고 host와 guest를 잇는 다양한 방법을 정리합니다.

## 관련 항목

- [Ch 7: 디바이스 트리](/blog/tools/emulation/qemu-embedded/chapter07-device-tree)
- [Ch 9: 네트워킹](/blog/tools/emulation/qemu-embedded/chapter09-networking)
- [Ch 13: 벤더 머신](/blog/tools/emulation/qemu-embedded/chapter13-vendor-machines)
- [Modern Embedded Recipes — SPI Driver](/blog/embedded/modern-recipes/part4-08-spi-driver)
