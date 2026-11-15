---
title: "AMP와 OpenAMP — Heterogeneous SoC·RPMsg·remoteproc"
slug: "embedded/rtos/practical-internals/part4-12-amp-openamp"
date: 2026-05-07T09:44:00
description: "Cortex-A와 Cortex-M이 한 칩 위에서 별도의 OS를 돌리는 AMP 구조를 정리합니다. OpenAMP framework(libmetal/RPMsg/remoteproc), virtio-vring 기반 shared memory IPC, mailbox 인터럽트, STM32MP157과 RP2350의 서로 다른 구성 조건까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 44
tags: [amp, openamp, heterogeneous, rpmsg, remoteproc, imx, stm32mp]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"AMP는 한 SoC 안에서 *서로 다른 OS*가 *서로 다른 코어*를 돌리는 모델입니다."** — Cortex-A의 Linux와 Cortex-M의 RTOS가 mailbox와 shared memory로 대화합니다.

## 어떤 문제를 푸는가

4-07편의 SMP는 *하나의 OS가 모든 코어를 관리*하는 모델이었습니다. ready list와 lock을 공유하기 때문에 모든 코어가 같은 ABI를 따라야 하고, 실시간 결정성과 throughput을 같은 scheduler 안에서 타협해야 합니다.

한 칩에서 UI/네트워크와 sensor/control을 서로 다른 core·실행 환경으로 분리할 수 있습니다. 어느 core·OS가 deadline을 만족하는지는 IRQ·memory·DMA 등 공유 자원의 간섭과 workload로 검증합니다. Linux는 무조건 불가능하고 별도 M-core면 자동 결정적이라는 구분은 사용하지 않습니다.



해답은 **AMP**(Asymmetric Multi-Processing)입니다. 각 실행 환경을 독립적으로 관리하며 RTOS·Linux뿐 아니라 bare-metal도 포함할 수 있습니다. 공유 자원은 명시적 IPC와 ownership 규칙으로 관리합니다. 이 IPC를 표준화한 것이 **OpenAMP**이고, 그 위에 얹는 통신 추상화가 **RPMsg**입니다.

이번 편은 OpenAMP의 layer 구조, virtio-vring 기반 shared memory, mailbox/IPI를 통한 동기화, 실제 heterogeneous SoC 사례를 정리합니다.

## Heterogeneous SoC — 누가 누구를 데리고 있나

예를 들어 STM32MP157은 두 Cortex-A7과 Cortex-M4를 제공합니다. core 역할·boot 순서·공유 peripheral은 선택한 board와 firmware가 결정합니다.

RP2350의 두 실행 core는 M33/Hazard3 선택지를 제공합니다. M33 2개와 RISC-V 2개가 모두 독립 실행하는 4-core SoC라고 세면 안 됩니다. 이 부분은 뒤에서 별도로 구분합니다. 다른 SoC의 family명만 보고 core 수·접근 가능한 MCU core를 일반화하지 않습니다.

## AMP의 기본 구조

Linux 관리 RAM, remote firmware carveout, vring과 payload pool을 platform memory map에 맞춰 정합니다. 물리 주소·remote device address·가상 주소를 혼동하지 않습니다. reserved-memory 선언만으로 remote core의 전체 접근 권한이 격리되는 것도 아닙니다.

boot에는 Linux remoteproc가 firmware를 시작하는 구성과 bootloader가 먼저 remote core를 시작하고 Linux가 attach하는 구성이 있습니다. 아래 흐름은 전자의 예입니다.

1. Linux의 해당 remoteproc driver와 reserved-memory/firmware resource 요구를 확인합니다.
2. offline 상태에서 firmware 이름을 설정합니다.
3. start 요청이 성공한 뒤 state와 trace·RPMsg channel 생성을 확인합니다.
4. endpoint discovery/주소를 맞춘 뒤 message protocol을 시작합니다.

정지·업데이트 전에는 DMA·shared buffer·peer endpoint의 lifetime과 재연결을 처리합니다.

## OpenAMP — 표준화된 IPC Framework

이 글은 open-amp **v2024.10.0**, commit a2cd944c40d40846ede5dae69de6fda9427254da와 같은 tag의 libmetal을 기준으로 합니다. open-amp source의 BSD-3-Clause license와 platform port의 계약을 각각 확인합니다.

OpenAMP 3 layer

1. **libmetal** — HAL: memory map, IRQ register, atomic
2. **open-amp** — RPMsg / remoteproc / virtio-vring 구현
3. **application** — RPMsg endpoint를 통한 통신

전체 topology를 한 장으로 보면 이렇습니다. 두 코어가 각자의 libmetal HAL 위에 RPMsg/virtio를 올리고, 공유 DDR의 vring과 buffer pool을 매개로 메시지를 주고받습니다. mailbox IRQ가 상대 코어를 깨우는 신호입니다.

![OpenAMP heterogeneous SoC topology](/images/blog/rtos/diagrams/part4-12-openamp-topology.svg)

`libmetal`이 *플랫폼 추상화*입니다. 같은 OpenAMP 코드가 Linux 위에서도 FreeRTOS/Zephyr 위에서도 빌드되도록 *memory map, interrupt register, polling/blocking wait*를 추상화합니다.

다음 callback은 실제 RPMsg endpoint가 platform에서 준비되었다는 전제의 **nonblocking echo adapter**입니다. platform_create_rpmsg_vdev 같은 함수는 OpenAMP의 공통 public API가 아니므로 완전한 실행 예처럼 제시하지 않습니다.

```c title="rpmsg-echo.c"
#include <openamp/rpmsg.h>
#include <limits.h>

struct echo_state { unsigned accepted, dropped; };
/* endpoint의 priv에 수명이 보장된 echo_state를 연결하고 callback을 직렬화. */
int echo_rx(struct rpmsg_endpoint *ept, void *data, size_t len,
            uint32_t src, void *priv)
{
    struct echo_state *state = priv;
    if (state == NULL) return RPMSG_ERR_PARAM;
    if (ept == NULL || data == NULL || len == 0 || len > INT_MAX) {
        ++state->dropped;
        return RPMSG_SUCCESS;
    }
    int sent = rpmsg_trysendto(ept, data, (int)len, src);
    if (sent < 0 || (size_t)sent != len) ++state->dropped;
    else ++state->accepted;
    return RPMSG_SUCCESS; /* RX 처리 종료; echo drop은 별도 관찰 */
}
```

수신 buffer는 callback이 끝난 뒤 계속 보유하지 않습니다. trysend의 성공 길이·오류를 검사하고 TX 포화 시 이 예는 echo를 drop합니다. endpoint·state는 callback 종료 전 파괴하지 않으며 peer 주소와 허용 service 권한도 실제 protocol에서 검증합니다. host adapter 검사에는 실제 vring/mailbox 전송이 없습니다.

## RPMsg — Channel과 Endpoint

RPMsg는 *channel과 endpoint*를 통해 메시지를 주고받는 protocol입니다. 한 channel은 양쪽에 *이름과 주소*를 가지고, 한 메시지는 헤더(src/dst, len, flags) + payload로 전송됩니다.

RPMsg는 TCP의 stream/reconnect/reliable session과 동일한 추상화가 아닙니다. service 이름과 src/dst endpoint 주소로 메시지를 전달합니다.

**rpmsg_send는 TX buffer를 기다릴 수 있고 rpmsg_trysend는 기다리지 않습니다.** callback/IRQ 처리 경로에서 blocking send로 peer의 진행을 막지 않도록 호출 문맥과 backpressure 정책을 정합니다. API의 wait 지원·timeout은 선택한 backend 구현으로 확인합니다.

## virtio-vring — Shared Memory의 큐 구조

split vring은 descriptor, available, used ring으로 구성됩니다. **driver가 descriptor/available을 제공하고 device가 used를 갱신**합니다. payload가 어느 방향으로 흐르느냐만으로 avail writer가 바뀌는 것은 아닙니다. TX/RX에서 누가 buffer를 제공하고 되돌리는지는 virtio 역할·descriptor 방향으로 따라갑니다.

notification suppression과 batching이 있어 메시지 한 번에 IRQ 한 번이 항상 대응하지는 않습니다. index 공개 전에 descriptor/payload가 보이도록 하는 barrier, cache line·buffer ownership을 맞춥니다.

비일관 cache 환경에서는 platform이 허용하는 noncacheable Normal mapping 또는 적절한 clean/invalidate 경로가 필요합니다. vring을 무조건 Device memory로 바꾸는 것은 alignment·접근·atomic 제약과 충돌할 수 있습니다. 소유권·mapping·barrier·cache 처리를 port의 reference 설정으로 확인합니다.

## remoteproc — Linux가 Cortex-M을 부팅

Linux sysfs ABI에서 firmware 파일에 쓰는 것은 **이름 지정**이며 그 시점에 ELF가 load되었다고 단정하지 않습니다. offline 상태에서 이름을 지정하고 state에 start를 쓰면 driver의 boot/load 경로를 요청합니다.

```bash
# 실제 대상 name/state를 먼저 확인. root와 해당 board/driver가 필요.
cat /sys/class/remoteproc/remoteproc0/name
cat /sys/class/remoteproc/remoteproc0/state
# offline일 때 해당 firmware 이름 지정
# echo m4_firmware.elf > /sys/class/remoteproc/remoteproc0/firmware
# echo start > /sys/class/remoteproc/remoteproc0/state
```

위 명령은 이 검증 host에서 실행하지 않았습니다. 파일명·remoteproc 번호·trace 위치·auto-boot/attach 지원은 board별입니다. resource table은 virtio/vring·carveout 등 resource를 기술할 수 있지만 mailbox hardware 설정이 항상 그 표 안에 있는 것은 아닙니다. DTS·driver·ELF load address와 함께 대조합니다.

## Mailbox — 코어 사이 인터럽트

mailbox/IPI/doorbell은 peer에게 새 상태를 알리는 수단입니다. 실제 endpoint callback은 ISR 안에서 바로 실행하거나 worker/poll loop로 defer하는 등 port에 따라 다릅니다. callback이 항상 hard IRQ 문맥이라는 가정도, 항상 sleep 가능하다는 가정도 하지 않습니다.

notification 전에 공유 상태를 공개하고, IRQ ACK·중복 알림·notification suppression·peer reset을 platform 계약대로 처리합니다.

## RPMsg Application — 두 가지 흔한 패턴

### Echo Server

위 adapter로 정상 echo·TX full drop·invalid length를 나누어 관찰합니다. host stub의 send 성공은 peer가 실제 수신했다는 뜻이 아니므로 실제 RTT는 sequence와 양쪽 trace로 확인합니다.

### Sensor Stream (M → A)

C struct를 그대로 보내면 padding·alignment·endianness·version에 의존합니다. 예를 들어 timestamp 8 byte와 6개의 signed 16-bit sample을 명시한 20-byte wire layout으로 encode/decode할 수 있습니다. length·version·범위·drop/gap을 수신 쪽에서 검증합니다.

Linux user-space 경로는 rpmsg_char/control driver와 endpoint binding에 따라 준비합니다. /dev/rpmsg_ctrl0와 /dev/rpmsg0가 모든 board에서 고정 이름으로 나타나는 것은 아닙니다. ioctl·open·read 반환값과 short/oversize message·peer reset을 처리한 뒤에 sensor 데이터를 사용합니다.

## 격리와 AMP의 관계

OS를 다른 core로 옮겼다는 사실만으로 DMA·shared DDR·interrupt·peripheral 간섭이 차단되지는 않습니다. hypervisor, MPU/IOMMU/bus firewall, reset/clock와 resource ownership을 실제 SoC의 요구에 맞춰 검증합니다. 특정 자동차 모델이 RPMsg만으로 모든 안전 격리를 보장한다는 일반 사례는 사용하지 않습니다.

## RP2350 — Hybrid Heterogeneous

RP2350은 **두 core의 dual-architecture 선택**을 제공하며 software 또는 OTP 설정으로 ISA를 선택할 수 있습니다. 같은 binary를 두 ISA에서 그대로 실행하지 않으며 네 CPU가 모두 동시에 실행하는 구성으로 설명하지 않습니다. mixed-ISA와 boot/SDK 제약은 사용하는 공식 문서를 따릅니다.

RP2040의 M0+ SRAM 공유를 data cache coherency 부재 때문에 반드시 FIFO로 전달해야 한다고 설명하지 않습니다. SIO FIFO·hardware lock·shared SRAM과 ordering은 서로 다른 통신/동기화 수단입니다. RP2350의 SMP/AMP/OpenAMP 사용 역시 SDK integration이 별도 필요합니다.

## Inter-Core Message Latency 측정

환경·source·clock·timestamp 위치·payload·warmup·sample 분포와 drop을 기록해야 단방향 latency와 RTT를 비교할 수 있습니다. 재현 자료 없는 i.MX/STM32/RP2040 µs/ns 표는 측정값으로 제시하지 않습니다. 서로 다른 clock의 timestamp를 단순히 빼면 단방향 지연이 되지 않습니다.

## 자주 보는 함정과 안티패턴

- Linux RAM, remote carveout, vring/pool을 실제 주소 map 없이 중첩 사용.
- driver/device의 avail/used ownership을 payload 방향만으로 해석.
- callback에서 blocking send 또는 RX buffer를 수명 이후 보관.
- cache maintenance·barrier·notification을 서로 대체 가능한 것으로 취급.
- firmware 이름 설정을 load 완료로, send 성공을 peer 처리 완료로 취급.
- AMP 배치를 hardware 격리·deadline 달성의 증거로 사용.

## 정리

- AMP에는 독립된 OS instance와 bare-metal도 포함됩니다.
- pinned OpenAMP API와 platform 초기화·callback 문맥을 구분합니다.
- send/trysend의 대기·실패, endpoint/payload 수명과 peer reset을 처리합니다.
- virtio 역할, mapping·cache·barrier·notification 계약을 함께 확인합니다.
- remoteproc sysfs state·실제 driver/firmware resource를 대조합니다.

## 근거 자료

- [OpenAMP v2024.10.0](https://github.com/OpenAMP/open-amp/tree/v2024.10.0), [rpmsg.h](https://github.com/OpenAMP/open-amp/blob/v2024.10.0/lib/include/openamp/rpmsg.h), [libmetal v2024.10.0](https://github.com/OpenAMP/libmetal/tree/v2024.10.0).
- [Virtio 1.2 split queue](https://docs.oasis-open.org/virtio/virtio/v1.2/virtio-v1.2.html), [Linux RPMsg](https://docs.kernel.org/staging/rpmsg.html), [remoteproc](https://docs.kernel.org/staging/remoteproc.html), [sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-class-remoteproc).
- [STM32MP157](https://www.st.com/en/microcontrollers-microprocessors/stm32mp157.html), [RP2350 product](https://www.raspberrypi.com/products/rp2350/).



다음 편은 [4-13 C++ in RTOS](/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos)에서 RTOS C API를 C++ 객체로 감싸는 패턴을 다룹니다.

## 관련 항목

- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-11: TrustZone과 TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [5-04: Porting](/blog/embedded/rtos/practical-internals/part5-04-porting)
