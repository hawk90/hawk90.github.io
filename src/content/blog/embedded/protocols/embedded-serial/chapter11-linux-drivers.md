---
title: "Ch 11: Linux Driver — spidev, i2c-dev, ttyS, 그리고 커널 드라이버"
date: 2027-03-01T11:00:00
description: "Userspace에서 직렬 디바이스 다루기. ioctl·termios·sysfs. 그리고 언제 kernel 드라이버를 써야 하나."
series: "Embedded Protocols 심화"
seriesOrder: 11
tags: [linux, spidev, i2c-dev, ttys, termios, ioctl, userspace, kernel-driver]
draft: true
---

## 한 줄 요약

> **"먼저 userspace로 — 안 되면 커널 드라이버"** — spidev·i2c-dev·termios가 90%의 케이스를 처리.

## 어떤 문제를 푸는가

리눅스 임베디드에서 외부 디바이스 (센서·플래시·디스플레이)를 만나면:

1. **이미 드라이버 있나?** — `compatible`만 맞으면 자동 동작 (이상적).
2. **없으면 userspace로** — spidev / i2c-dev / ttyS를 ioctl로.
3. **여전히 안 되면 커널 드라이버** — performance·인터럽트 필요.

대부분은 1번 또는 2번에서 끝납니다.

## spidev — Userspace SPI

DT에 다음 한 줄:

```dts
&spi1 {
    spidev@0 {
        compatible = "rohm,dh2228fv";   // generic spidev compatible
        reg = <0>;
        spi-max-frequency = <1000000>;
    };
};
```

> ⚠️ `"spidev"` 자체는 *deprecated* — 적당한 *가짜 compatible* (`rohm,dh2228fv`) 사용. 또는 vendor의 실제 디바이스 string.

부팅 후 `/dev/spidev1.0` 노드 생성.

### ioctl 한 트랜잭션

```c
#include <linux/spi/spidev.h>
#include <sys/ioctl.h>

int fd = open("/dev/spidev1.0", O_RDWR);

uint8_t mode = SPI_MODE_0;
ioctl(fd, SPI_IOC_WR_MODE, &mode);

uint8_t bits = 8;
ioctl(fd, SPI_IOC_WR_BITS_PER_WORD, &bits);

uint32_t speed = 1000000;
ioctl(fd, SPI_IOC_WR_MAX_SPEED_HZ, &speed);

uint8_t tx[3] = {0x9F, 0x00, 0x00};   // JEDEC ID
uint8_t rx[3];

struct spi_ioc_transfer xfer = {
    .tx_buf = (uintptr_t)tx,
    .rx_buf = (uintptr_t)rx,
    .len = 3,
    .speed_hz = speed,
    .bits_per_word = 8,
};

ioctl(fd, SPI_IOC_MESSAGE(1), &xfer);
// rx[1], rx[2]에 JEDEC manufacturer + memory type
```

여러 트랜잭션을 한 ioctl로 (CS 유지) — `SPI_IOC_MESSAGE(N)`.

## i2c-dev — Userspace I²C

DT에 `i2c-dev` 모듈만 로드되면 됨 (kernel CONFIG_I2C_CHARDEV).

```c
#include <linux/i2c-dev.h>
#include <linux/i2c.h>
#include <sys/ioctl.h>

int fd = open("/dev/i2c-1", O_RDWR);

// 간단한 read/write — I2C_SLAVE
ioctl(fd, I2C_SLAVE, 0x68);
uint8_t reg = 0x75;
write(fd, &reg, 1);
uint8_t val;
read(fd, &val, 1);
// val = 0x68 (MPU6050 WHO_AM_I)

// 또는 한 atomic 트랜잭션 — I2C_RDWR
struct i2c_msg msgs[2] = {
    { .addr = 0x68, .flags = 0,        .len = 1, .buf = &reg },
    { .addr = 0x68, .flags = I2C_M_RD, .len = 1, .buf = &val },
};
struct i2c_rdwr_ioctl_data data = { .msgs = msgs, .nmsgs = 2 };
ioctl(fd, I2C_RDWR, &data);   // Sr 자동 처리
```

라이브러리 — `libi2c` (i2c-tools), `smbus_arch` (Python `smbus2`).

## ttyS / termios — Userspace UART

`/dev/ttyS0`·`/dev/ttyUSB0`·`/dev/ttyAMA0` (라파).

```c
#include <termios.h>
#include <fcntl.h>

int fd = open("/dev/ttyS0", O_RDWR | O_NOCTTY);

struct termios tio;
tcgetattr(fd, &tio);
cfmakeraw(&tio);                       // raw mode (line discipline 끔)
cfsetspeed(&tio, B115200);
tio.c_cflag |= (CREAD | CLOCAL);
tio.c_cflag &= ~CRTSCTS;               // flow control 끔
tio.c_cc[VMIN] = 0;
tio.c_cc[VTIME] = 10;                  // 1 sec 타임아웃
tcsetattr(fd, TCSANOW, &tio);

write(fd, "Hello\r\n", 7);

uint8_t buf[256];
ssize_t n = read(fd, buf, sizeof(buf));
```

### 흔한 함정 — Line Discipline

![Linux TTY subsystem layers — termios + Line Discipline](/images/blog/embedded-serial/diagrams/ch11-termios-line-discipline.svg)

Terminal 모드에서 *Linux line discipline*이 `\n` → `\r\n` 변환, *입력 echoing* 등을 자동으로 함. 바이너리 데이터 보낼 때는 **반드시 `cfmakeraw()`** 또는 `tio.c_lflag &= ~(ICANON | ECHO)`.

## sysfs / device-specific

일부 디바이스는 별도 sysfs 인터페이스 노출.

- `/sys/bus/iio/devices/iio:device0/` — IIO 프레임워크 (ADC, IMU, 환경 센서)
- `/sys/class/leds/` — LED
- `/sys/class/pwm/` — PWM
- `/sys/class/hwmon/` — 온도·전압·팬

이런 디바이스는 *전용 커널 드라이버*가 이미 있고, *vendor compatible*만 DT에 적으면 자동 동작.

## libgpiod — GPIO 비트뱅 보완

`gpio` sysfs는 deprecated. 모던 방식은 `libgpiod`.

```c
#include <gpiod.h>

struct gpiod_chip *chip = gpiod_chip_open_by_name("gpiochip0");
struct gpiod_line *line = gpiod_chip_get_line(chip, 17);

gpiod_line_request_output(line, "myapp", 0);
gpiod_line_set_value(line, 1);
// ...
gpiod_chip_close(chip);
```

CLI 도구 — `gpioget`, `gpioset`, `gpioinfo`, `gpiomon`.

## 커널 드라이버를 써야 할 때

| 상황 | 이유 |
| --- | --- |
| **인터럽트 latency 중요** | userspace 깨우는 게 수 µs 늦음 |
| **고속 (>10k IRQ/s)** | userspace overhead 누적 |
| **다른 커널 서브시스템 통합** (input, IIO, sound) | 표준 인터페이스 필요 |
| **DMA 직접 사용** | userspace에서 어려움 |
| **여러 user 공유** | 락·중재 필요 |

### 가장 작은 I²C 드라이버 — 스켈레톤

```c
// my_sensor.c
#include <linux/module.h>
#include <linux/i2c.h>
#include <linux/of.h>

static int my_probe(struct i2c_client *client) {
    s32 val = i2c_smbus_read_byte_data(client, 0x75);
    dev_info(&client->dev, "WHO_AM_I = 0x%02x\n", val);
    return 0;
}

static const struct of_device_id my_of_match[] = {
    { .compatible = "myvendor,mysensor" },
    { }
};
MODULE_DEVICE_TABLE(of, my_of_match);

static const struct i2c_device_id my_i2c_id[] = {
    { "mysensor", 0 },
    { }
};
MODULE_DEVICE_TABLE(i2c, my_i2c_id);

static struct i2c_driver my_driver = {
    .driver = {
        .name = "mysensor",
        .of_match_table = my_of_match,
    },
    .probe = my_probe,
    .id_table = my_i2c_id,
};
module_i2c_driver(my_driver);

MODULE_LICENSE("GPL");
```

DT의 `compatible = "myvendor,mysensor"` 슬레이브에 매칭. `insmod my_sensor.ko` → `dmesg` 확인.

## sysfs vs ioctl vs character device

| 인터페이스 | 적합 |
| --- | --- |
| **sysfs** — `/sys/...` 파일 RW | 단순 값 (LED on/off, threshold) |
| **ioctl** — `ioctl(fd, ...)` | 구조체 명령 (SPI 트랜잭션) |
| **character device** — `read/write` | 스트리밍 데이터 (ttyS, spidev raw) |

표준 라이브러리 (IIO, hwmon, pwm)이 있는 도메인이면 *그 프레임워크 따르기*. 임시 디버그라면 ioctl로 시작.

## serdev — Serial Device Bus

`/dev/ttyXX` 위의 디바이스 (블루투스·GPS·Wi-Fi 모듈)를 *자동 enumeration*. 옛 방식 — userspace daemon이 `/dev/ttyS0` open. 모던 방식 — **serdev**가 *DT에 선언된 디바이스를 커널이 인식*.

```dts
&uart7 {
    status = "okay";

    bluetooth {
        compatible = "brcm,bcm43438-bt";
        max-speed = <3000000>;
        // 다른 속성 — vendor, shutdown-gpios 등
    };
};
```

`hci_serdev` 같은 *serdev 드라이버*가 자동으로 `/dev/ttyXX` 위에 *블루투스 HCI* 인터페이스 생성. 사용자가 *직접 open 안 함*. `hciconfig hci0 up` 등으로 사용.

### serdev 드라이버 작성

```c
#include <linux/serdev.h>

static int my_probe(struct serdev_device *serdev) {
    serdev_device_set_baudrate(serdev, 115200);
    serdev_device_set_flow_control(serdev, false);
    serdev_device_open(serdev);
    // 데이터 수신 콜백 설정
    serdev_device_set_client_ops(serdev, &my_ops);
    return 0;
}

static const struct of_device_id my_of_match[] = {
    { .compatible = "myvendor,mymodule" },
    { }
};

static struct serdev_device_driver my_driver = {
    .driver = { .name = "mymod", .of_match_table = my_of_match },
    .probe = my_probe,
};
module_serdev_device_driver(my_driver);
```

블루투스·GNSS·Wi-Fi 모듈이 *serdev로 통합*되어 *플랫폼 ↔ 모듈 통신*이 표준화.

## SPI Slave Mode

대부분의 Linux SPI는 *마스터*만 다루지만, *슬레이브 mode* 드라이버도 있음 — Linux 시스템이 *외부 마스터의 SPI 슬레이브*가 됨.

### 표준 슬레이브 드라이버

`drivers/spi/slave/`:
- `spi-slave-time.c` — 마스터 read 시 *현재 시간* 응답
- `spi-slave-system-control.c` — 시스템 reboot/halt 명령 받기

```dts
&spi1 {
    slave;                              // 슬레이브 모드 마크
    status = "okay";

    slave@0 {
        compatible = "linux,spi-slave-time";
    };
};
```

응용 — 대형 MCU 시스템에서 *Cortex-M이 마스터*, *Cortex-A Linux가 슬레이브* (IO 확장).

## I²C Slave Mode

`drivers/i2c/i2c-core-slave.c` — Linux i2c controller가 *슬레이브로 동작*. 콜백 기반 — 데이터 받음·송신 시 호출.

```c
static int my_slave_cb(struct i2c_client *client,
                       enum i2c_slave_event event, u8 *val) {
    switch (event) {
    case I2C_SLAVE_WRITE_RECEIVED:
        /* 마스터가 우리에게 *val 보냄 */
        break;
    case I2C_SLAVE_READ_REQUESTED:
        *val = my_response_byte();
        break;
    case I2C_SLAVE_STOP:
        break;
    }
    return 0;
}

// 등록
i2c_slave_register(client, my_slave_cb);
```

응용 — Linux 시스템을 *I²C EEPROM 또는 센서로 위장*. 자동차 ECU emulator, 보드 자가진단.

## PREEMPT_RT — Realtime Linux

표준 Linux에서 SPI/I²C 트랜잭션의 *지연 jitter*는 *수 ms*. 모터 제어 등은 *수 µs*가 필요. **PREEMPT_RT** 커널 패치가 해결.

### 영향

| 항목 | Vanilla Linux | PREEMPT_RT |
| --- | --- | --- |
| 인터럽트 latency | 수 ms (worst) | < 100 µs |
| spinlock 대기 | indeterministic | priority-inherited mutex |
| SPI 트랜잭션 지연 | 변동 큼 | 작음 |
| 시스템콜 overhead | 작음 | 약간 증가 |

### 사용처

- 산업용 모션 제어 PLC
- 발사체 GSE (Ground Support Equipment)
- 의료 영상
- 일부 자동차 인포테인먼트 백업 인스트루먼트

### 임베디드 통합

Yocto의 `meta-realtime`, Buildroot의 `BR2_PACKAGE_LINUX_RT_PATCH` 옵션. Kernel `CONFIG_PREEMPT_RT=y` 활성.

## 자주 하는 실수

> ⚠️ spidev 트랜잭션마다 CS 토글

`SPI_IOC_MESSAGE(N)`으로 *여러 트랜잭션*을 한 ioctl로 묶지 않고 각각 호출 → CS가 매번 토글. 슬레이브가 *원자성 깨짐* 인식.

> ⚠️ termios `O_NONBLOCK` 없이 read

`read(fd, ...)`가 *영원히 블록*. `O_NONBLOCK` 또는 `VTIME` 설정.

> ⚠️ i2c_smbus_* vs i2c_master_*

`smbus` 함수는 SMBus 규약 — 일부 슬레이브는 *full I²C* 트랜잭션 필요 → `i2c_master_send/recv` 또는 `I2C_RDWR`.

> ⚠️ Kernel module GPL 라이선스 누락

`MODULE_LICENSE("GPL")` 안 적으면 *대부분 커널 API 호출 거부*. *taint flag* 발생.

## 정리

- **spidev / i2c-dev / ttyS**가 userspace 표준.
- ioctl로 SPI Mode·I²C atomic·UART termios 설정.
- **libgpiod**가 모던 GPIO API (sysfs deprecated).
- 인터럽트·DMA·고속 시에만 **커널 드라이버**로.
- 표준 프레임워크 (IIO, hwmon)가 있는 도메인은 그 인터페이스 따르기.

다음 편(마지막)은 **디버깅** — 로직 분석기·oscilloscope·protocol decoder 종합.

## 관련 항목

- [Ch 10: Device Tree](/blog/embedded/protocols/embedded-serial/chapter10-linux-device-tree)
- [Ch 12: 디버깅](/blog/embedded/protocols/embedded-serial/chapter12-debugging)
