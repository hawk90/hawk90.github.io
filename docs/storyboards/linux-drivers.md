# 코드로 읽는 리눅스 디바이스 드라이버 — 스토리보드

## 원서 정보

- **원제**: Essential Linux Device Drivers
- **저자**: Sreekrishnan Venkateswaran
- **역자**: 박재호
- **출판**: 에이콘 (2010)
- **원서 기준**: 커널 2.6

## 최신화 전략

원서가 2008년(커널 2.6) 기준이라 다음을 보강한다:

| 원서 내용 | 최신화 (커널 6.x) |
|----------|------------------|
| platform_driver 수동 등록 | Device Tree 기반 매칭 |
| raw I/O 접근 | Regmap API |
| request_irq() | devm_request_irq(), threaded IRQ |
| 수동 리소스 해제 | devres (managed resources) |
| clk_get/clk_enable | CCF (Common Clock Framework) |
| 수동 전원 관리 | Runtime PM |
| GPIO 직접 접근 | GPIO/Pinctrl 서브시스템 |

---

## 시리즈 구조 (24장)

```
코드로 읽는 리눅스 디바이스 드라이버 (24장)
│
├── Part 1: 기초 (4장) ─────────────── 커널 기초와 개발 환경
├── Part 2: 문자 드라이버 (4장) ────── char device 핵심
├── Part 3: 버스와 프로토콜 (4장) ──── I2C, SPI, USB, PCI
├── Part 4: 특수 드라이버 (4장) ────── Input, Serial, Block, Network
├── Part 5: 멀티미디어 (3장) ───────── 비디오, 오디오, 무선
├── Part 6: 실무 (3장) ─────────────── 임베디드, 유저스페이스, 디버깅
└── Part 7: 부록 (2장) ─────────────── 어셈블리, BIOS
```

---

## Part 1: 기초 (ch01-04)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 01 | 커널 둘러보기 | Ch 2: A Peek Inside the Kernel | KASAN, KCSAN, Rust-for-Linux 언급 |
| 02 | 커널 서비스 | Ch 3: Kernel Facilities | kthread API, workqueue 개선, RCU |
| 03 | 개발 환경 구축 | Ch 4: Laying the Groundwork | Buildroot, Yocto, QEMU, Device Tree |
| 04 | 모듈 기초 | - | devres, MODULE_DEVICE_TABLE, SPDX |

---

## Part 2: 문자 드라이버 (ch05-08)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 05 | 문자 드라이버 기초 | Ch 5: Character Drivers | cdev, misc_register, devres |
| 06 | 폴링과 비동기 통지 | Ch 5 일부 | poll_wait, fasync, eventfd |
| 07 | ioctl과 sysfs | Ch 5 일부 | unlocked_ioctl, compat_ioctl |
| 08 | mmap과 DMA | Ch 5 일부 | dma_alloc_coherent, dma-buf |

---

## Part 3: 버스와 프로토콜 (ch09-12)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 09 | I2C 드라이버 | Ch 8: I2C Protocol | Regmap I2C, Device Tree bindings |
| 10 | SPI 드라이버 | - | Regmap SPI, spi_controller |
| 11 | USB 드라이버 | Ch 11: USB | USB gadget, configfs, OTG |
| 12 | PCI/PCIe 드라이버 | Ch 10: PCI | MSI-X, SR-IOV, VFIO |

---

## Part 4: 특수 드라이버 (ch13-16)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 13 | Input 서브시스템 | Ch 7: Input Drivers | input_dev, evdev, multitouch |
| 14 | Serial/TTY 드라이버 | Ch 6: Serial Drivers | serdev, serial_core |
| 15 | 블록 드라이버 | Ch 14: Block Drivers | blk-mq, gendisk, bio |
| 16 | 네트워크 드라이버 | Ch 15: Network Interface Cards | NAPI, XDP, ethtool |

---

## Part 5: 멀티미디어 (ch17-19)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 17 | 비디오 드라이버 | Ch 12-13 | V4L2, DRM/KMS, Media Controller |
| 18 | 오디오 드라이버 | Ch 13 일부 | ALSA SoC (ASoC), DAPM |
| 19 | 무선 드라이버 | Ch 16: Linux Without Wires | mac80211, cfg80211, Bluetooth HCI |

---

## Part 6: 실무 (ch20-22)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 20 | 임베디드 리눅스 | Ch 18: Embedding Linux | Yocto, Buildroot, systemd |
| 21 | 유저스페이스 드라이버 | Ch 19: Drivers in User Space | UIO, VFIO, libgpiod |
| 22 | 디버깅과 프로파일링 | Ch 21: Debugging | ftrace, perf, BPF, KGDB |

---

## Part 7: 부록 (ch23-24)

| Ch | 제목 | 원서 | 최신화 |
|----|------|------|--------|
| 23 | ARM64 어셈블리 | Appendix A | ARM64 calling convention |
| 24 | ACPI와 UEFI | Appendix B | Device Tree vs ACPI |

---

## 난이도별 분류

### 필수 (Core) — 12장
| Ch | 제목 |
|----|------|
| 01 | 커널 둘러보기 |
| 02 | 커널 서비스 |
| 03 | 개발 환경 구축 |
| 04 | 모듈 기초 |
| 05 | 문자 드라이버 기초 |
| 09 | I2C 드라이버 |
| 12 | PCI/PCIe 드라이버 |
| 13 | Input 서브시스템 |
| 15 | 블록 드라이버 |
| 16 | 네트워크 드라이버 |
| 21 | 유저스페이스 드라이버 |
| 22 | 디버깅과 프로파일링 |

### 중급 (Intermediate) — 8장
| Ch | 제목 |
|----|------|
| 06 | 폴링과 비동기 통지 |
| 07 | ioctl과 sysfs |
| 08 | mmap과 DMA |
| 10 | SPI 드라이버 |
| 11 | USB 드라이버 |
| 14 | Serial/TTY 드라이버 |
| 17 | 비디오 드라이버 |
| 20 | 임베디드 리눅스 |

### 고급 (Advanced) — 4장
| Ch | 제목 |
|----|------|
| 18 | 오디오 드라이버 |
| 19 | 무선 드라이버 |
| 23 | ARM64 어셈블리 |
| 24 | ACPI와 UEFI |

---

## 학습 경로

### 경로 A: 문자 드라이버 입문 (8장)
```
Ch 01 → 02 → 03 → 04 → 05 → 06 → 07 → 22
```

### 경로 B: 임베디드 실무 (12장)
```
Ch 01 → 03 → 04 → 05 → 09 → 10 → 13 → 14 → 20 → 21 → 22
```

### 경로 C: 고성능 드라이버 (14장)
```
Ch 01 → 02 → 04 → 05 → 08 → 12 → 15 → 16 → 17 → 22
```

---

## 실무 도구

| 도구 | 용도 |
|------|------|
| `QEMU` | 커널 테스트 가상화 |
| `Buildroot` | 미니멀 루트 파일시스템 |
| `ftrace` | 커널 함수 추적 |
| `perf` | 성능 프로파일링 |
| `BPF/bpftrace` | 동적 트레이싱 |
| `KGDB` | 커널 GDB 디버깅 |
| `/sys/kernel/debug` | debugfs 인터페이스 |

---

## 참고 자료

- [kernel.org Documentation](https://www.kernel.org/doc/html/latest/)
- [Bootlin Training Materials](https://bootlin.com/docs/)
- [LWN.net Device Driver Articles](https://lwn.net/Kernel/LDD3/)
- [Essential Linux Device Drivers (원서)](https://www.pearson.com/en-us/subject-catalog/p/essential-linux-device-drivers/P200000003508)

---

## 다음 단계

1. 00-overview.md 작성
2. 스텁 파일 생성 (24개)
3. Part 1부터 순차 작성
