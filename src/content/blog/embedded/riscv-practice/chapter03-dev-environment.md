---
title: "Ch 3: 개발 환경"
date: 2025-05-19T09:00:00
description: "RISC-V 개발 환경 — OpenOCD, probe-rs, 디버거 설정을 다룬다."
series: "RISC-V 임베디드 실습"
seriesOrder: 3
tags: [RISC-V, OpenOCD, Debug, Probe]
draft: true
---

## 개요

RISC-V 개발을 위한 디버거와 환경 설정을 다룬다.

---

## OpenOCD 설치

TODO:

```bash
# Ubuntu
sudo apt install openocd

# 소스 빌드 (최신 RISC-V 지원)
git clone https://github.com/openocd-org/openocd.git
cd openocd
./bootstrap
./configure --enable-ftdi --enable-jlink
make
sudo make install
```

---

## 디버그 프로브

TODO:

| 프로브 | 가격 | 특징 |
|--------|------|------|
| Sipeed RV-Debugger | ~$10 | 저렴, FTDI 기반 |
| SEGGER J-Link | ~$300+ | 고성능, 상용 |
| ESP-Prog | ~$15 | ESP32용 |
| 내장 USB-JTAG | $0 | ESP32-C3 내장 |

---

## OpenOCD 설정 (ESP32-C3)

TODO:

```
# esp32c3.cfg
adapter driver esp_usb_jtag
transport select jtag
set ESP_RTOS none
source [find target/esp32c3.cfg]
```

---

## OpenOCD 실행

TODO:

```bash
openocd -f interface/esp_usb_jtag.cfg -f target/esp32c3.cfg
```

---

## GDB 연결

TODO:

```bash
riscv32-unknown-elf-gdb firmware.elf
(gdb) target remote :3333
(gdb) load
(gdb) break main
(gdb) continue
```

---

## VS Code 설정

TODO:

```json
{
    "configurations": [
        {
            "name": "RISC-V Debug",
            "type": "cortex-debug",
            "servertype": "openocd",
            "configFiles": ["esp32c3.cfg"],
            "gdbPath": "riscv32-unknown-elf-gdb"
        }
    ]
}
```

---

## 정리

- OpenOCD가 표준 도구
- ESP32-C3는 내장 USB-JTAG 지원
- GDB로 소스 레벨 디버깅
- VS Code 통합 가능

---

## 다음 장 예고

Ch 4에서는 ESP32-C3 개요를 다룬다.

---

## 참고 자료

- [OpenOCD RISC-V](https://openocd.org/doc/html/RISC_002dV.html)
- [ESP32-C3 JTAG](https://docs.espressif.com/projects/esp-idf/en/latest/esp32c3/api-guides/jtag-debugging/)
