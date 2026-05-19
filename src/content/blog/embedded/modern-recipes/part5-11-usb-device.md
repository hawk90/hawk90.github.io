---
title: "5-11: USB Device 기초"
date: 2026-05-14T11:00:00
description: "CDC·HID class — STM32 USB stack 활용."
series: "Modern Embedded Recipes"
seriesOrder: 59
tags: [recipes, peripheral, usb]
draft: false
---

## 한 줄 요약

> **"USB stack을 직접 쓰지 마세요."** TinyUSB나 ST USB Device library를 *통합*하고 *descriptor만 작성*하는 것이 표준.

## 어떤 상황에서 쓰나

USB로 PC와 통신해야 할 때 — debug serial output (CDC), 자체 USB-HID device (keyboard, mouse, custom), audio (UAC), MIDI, mass storage. 단일 module이 *USB cable로 PC와 직결*되면 driver 설치 없이 동작 (CDC, HID는 OS 기본 driver).

이 글은 STM32 USB peripheral의 hardware 구조를 짧게 살펴본 뒤 *TinyUSB*로 CDC와 HID device를 만드는 패턴을 다룹니다.

## 핵심 개념

### USB 계층

```text
Application      (CDC, HID, MSC, ...)
   ↓
Class driver     (각 class별 protocol)
   ↓
USB stack        (descriptor 관리, control transfer, transfer queue)
   ↓
USB peripheral   (HAL, endpoint hardware)
   ↓
PHY              (D+/D- driver, OTG)
```

직접 stack을 쓰는 일은 거의 없습니다. TinyUSB (open-source, multi-MCU)나 ST USB Device library를 사용.

### Descriptor

USB device는 *Descriptor*로 자신을 PC에 설명. PC OS가 이를 보고 driver를 매칭합니다.

```text
Device Descriptor:
  Vendor ID (VID)  — 회사 식별
  Product ID (PID) — 제품 식별
  USB version, class, max packet size, ...

Configuration Descriptor:
  Interface count, attributes (power, ...)

Interface Descriptor:
  Class (CDC=0x02, HID=0x03, MSC=0x08, ...)
  Subclass, protocol

Endpoint Descriptor:
  Address (IN/OUT, number)
  Type (control, bulk, interrupt, isochronous)
  Max packet size, interval
```

### Endpoint 종류

| Type | 용도 | 보장 |
|------|------|------|
| Control | 설정·status | 시간 보장 (low priority) |
| Bulk | 큰 데이터 (CDC, MSC) | 시간 보장 없음, error 검출 강함 |
| Interrupt | 작고 빠른 데이터 (HID) | 정해진 주기 보장 |
| Isochronous | 실시간 (audio) | 주기 보장, error 검출 약함 |

### 자주 쓰는 class

| Class | 용도 | OS driver |
|-------|------|-----------|
| CDC ACM | virtual serial (printf, debug) | 내장 |
| HID | keyboard, mouse, custom raw | 내장 |
| MSC | USB drive (mass storage) | 내장 |
| MIDI | MIDI keyboard / synth | 내장 |
| UAC | audio | 내장 |
| Vendor | custom (libusb 필요) | driver 작성 |

## 코드 예제

### 1. TinyUSB CDC (virtual COM port)

`tusb_config.h`:

```c
#define CFG_TUSB_RHPORT0_MODE   OPT_MODE_DEVICE
#define CFG_TUD_CDC             1
#define CFG_TUD_CDC_RX_BUFSIZE  512
#define CFG_TUD_CDC_TX_BUFSIZE  512
#define CFG_TUD_CDC_EP_BUFSIZE  64
```

`usb_descriptors.c`:

```c
#include "tusb.h"

tusb_desc_device_t const desc_device = {
    .bLength            = sizeof(tusb_desc_device_t),
    .bDescriptorType    = TUSB_DESC_DEVICE,
    .bcdUSB             = 0x0200,
    .bDeviceClass       = TUSB_CLASS_MISC,
    .bDeviceSubClass    = MISC_SUBCLASS_COMMON,
    .bDeviceProtocol    = MISC_PROTOCOL_IAD,
    .bMaxPacketSize0    = CFG_TUD_ENDPOINT0_SIZE,
    .idVendor           = 0xCafe,
    .idProduct          = 0x4001,
    .bcdDevice          = 0x0100,
    .iManufacturer      = 0x01,
    .iProduct           = 0x02,
    .iSerialNumber      = 0x03,
    .bNumConfigurations = 0x01
};

uint8_t const desc_configuration[] = {
    TUD_CONFIG_DESCRIPTOR(1, 2, 0, 75, 0x00, 100),

    TUD_CDC_DESCRIPTOR(0, 4, 0x81, 8, 0x02, 0x82, 64),
};

uint8_t const *tud_descriptor_device_cb(void) {
    return (uint8_t const *)&desc_device;
}
uint8_t const *tud_descriptor_configuration_cb(uint8_t idx) {
    (void)idx;
    return desc_configuration;
}
```

main loop:

```c
void usb_init(void) {
    // GPIO PA11/12 (D-/D+), AF10
    gpio_init(GPIOA, 11, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=10});
    gpio_init(GPIOA, 12, &(gpio_config_t){.mode=GPIO_MODE_AF, .speed=GPIO_SPEED_VH, .af=10});

    // OTG_FS clock enable
    RCC->AHB2ENR |= RCC_AHB2ENR_OTGFSEN;

    tusb_init();
}

int main(void) {
    clock_init_168mhz();
    usb_init();

    while (1) {
        tud_task();    // TinyUSB device task

        if (tud_cdc_available()) {
            char buf[64];
            uint32_t n = tud_cdc_read(buf, sizeof(buf));
            tud_cdc_write(buf, n);
            tud_cdc_write_flush();
        }
    }
}
```

PC에서 `/dev/ttyACM0` (Linux) 또는 `COM` 포트 (Windows)로 보임. terminal로 송수신 echo.

### 2. CDC retarget printf

```c
int _write(int file, char *data, int len) {
    (void)file;
    tud_cdc_write(data, len);
    tud_cdc_write_flush();
    return len;
}

// main
printf("Hello USB\n");
```

newlib의 `_write` syscall을 retarget. 일반 `printf`가 USB CDC로 출력.

### 3. HID custom report (raw)

```c
#define CFG_TUD_HID  1

// 8-byte report (custom application data)
uint8_t const desc_hid_report[] = {
    HID_USAGE_PAGE_N (0xFFAB, 2),
    HID_USAGE (0x0001),
    HID_COLLECTION (HID_COLLECTION_APPLICATION),
        HID_REPORT_ID (1)
        HID_USAGE (0x0002),
        HID_LOGICAL_MIN (0x00),
        HID_LOGICAL_MAX_N (0xFF, 2),
        HID_REPORT_SIZE (8),
        HID_REPORT_COUNT (8),
        HID_INPUT (HID_DATA | HID_VARIABLE | HID_ABSOLUTE),
        HID_USAGE (0x0003),
        HID_REPORT_COUNT (8),
        HID_OUTPUT (HID_DATA | HID_VARIABLE | HID_ABSOLUTE),
    HID_COLLECTION_END
};

// Send 8-byte report
void send_hid(uint8_t *data) {
    if (tud_hid_ready()) {
        tud_hid_report(1, data, 8);
    }
}

// Receive 8-byte
void tud_hid_set_report_cb(uint8_t instance, uint8_t report_id,
                           hid_report_type_t report_type,
                           uint8_t const *buffer, uint16_t bufsize) {
    process_hid_command(buffer, bufsize);
}
```

PC side는 *hidapi* library로 raw read/write.

### 4. HID keyboard

```c
uint8_t const keyboard_desc[] = {
    HID_USAGE_PAGE ( HID_USAGE_PAGE_DESKTOP     ),
    HID_USAGE      ( HID_USAGE_DESKTOP_KEYBOARD ),
    HID_COLLECTION ( HID_COLLECTION_APPLICATION ),
        // ...
    HID_COLLECTION_END
};

void send_key(uint8_t keycode) {
    uint8_t report[8] = {0};
    report[2] = keycode;   // single key press
    tud_hid_keyboard_report(0, 0, report + 2);
    delay_ms(10);
    tud_hid_keyboard_report(0, 0, NULL);   // release
}
```

button을 누르면 PC에 *A 키를 보내는* 등의 macro keyboard가 100줄 안에.

## 측정 / 동작 확인

```bash
# Linux
$ lsusb
Bus 003 Device 005: ID cafe:4001 

$ dmesg | tail
cdc_acm 3-2:1.0: ttyACM0: USB ACM device

$ minicom -D /dev/ttyACM0
Hello USB
echo back...
```

device가 enumerate 안 되면 *D+ pull-up* (1.5 kΩ to 3.3V) 확인. STM32F4 OTG는 internal pull-up — 코드에서 enable.

`lsusb -v -d cafe:4001`로 descriptor dump.

## 자주 보는 함정

> ⚠️ Crystal frequency 잘못

USB는 *48 MHz가 정확히* 필요. HSE crystal과 PLL_Q 계산이 *정확히 48 MHz*가 안 되면 enumeration 실패.

> ⚠️ D+/D- 핀 잘못

USB OTG FS는 PA11=D-, PA12=D+. HS는 다른 핀. silkscreen·schematic 확인.

> ⚠️ Series resistor 누락

D+/D-에 *직렬 22 Ω*가 표준. impedance matching.

> ⚠️ ESD protection 없음

USB cable plug/unplug에 ESD가 들어옴. *USBLC6-2 같은 TVS array* 권장.

> ⚠️ VID:PID 임의 선택

USB-IF에 등록된 VID 없이 임의 값을 쓰면 *상용 출시 시 문제*. test에는 `cafe:xxxx` 같은 임의 값 OK, 상용은 VID 구매.

> ⚠️ Vendor class에 OS driver 없음

Vendor class는 libusb·WinUSB driver가 별도 필요. 가능하면 *CDC, HID*로 우회.

## 정리

- USB는 **TinyUSB 같은 stack**을 통합. 직접 작성 안 함.
- 가장 자주 쓰는 class: **CDC (virtual COM)**, **HID (custom report 또는 keyboard/mouse)**.
- Descriptor에 **VID/PID + class + endpoint** 정의.
- **D+/D- = PA11/PA12 + 22Ω**, **48 MHz USB clock 정확히**.
- HID raw + hidapi가 *PC connectivity의 가장 빠른 길*.

다음 편은 **Ethernet MAC + PHY (lwIP)**입니다. RMII, MDIO, lwIP raw API, DHCP를 다룹니다.

## 관련 항목

- [4-04: 클럭 설정](/blog/embedded/modern-recipes/part4-04-clock-setup)
- [4-07: UART 드라이버](/blog/embedded/modern-recipes/part4-07-uart-driver)
- [5-12: Ethernet MAC + PHY](/blog/embedded/modern-recipes/part5-12-ethernet-mac-phy)
- [12-12: Matter·Thread](/blog/embedded/modern-recipes/part12-12-matter-thread)
