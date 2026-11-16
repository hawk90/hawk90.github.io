---
title: "AMP와 OpenAMP — Heterogeneous SoC·RPMsg·remoteproc"
slug: "embedded/rtos/practical-internals/part4-12-amp-openamp"
date: 2026-05-07T09:44:00
description: "Cortex-A와 Cortex-M이 한 칩 위에서 별도의 OS를 돌리는 AMP 구조를 정리합니다. OpenAMP framework(libmetal/RPMsg/remoteproc), virtio-vring 기반 shared memory IPC, mailbox 인터럽트, RP2350의 Arm/RISC-V core 구성 조건까지 다룹니다."
series: "Practical RTOS Internals"
seriesOrder: 44
tags: [amp, openamp, heterogeneous, rpmsg, remoteproc, imx, stm32mp]
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

> **"AMP는 한 SoC 안에서 *서로 다른 OS*가 *서로 다른 코어*를 돌리는 모델입니다."** — Cortex-A의 Linux와 Cortex-M의 RTOS가 mailbox와 shared memory로 대화합니다.

## 어떤 문제를 푸는가

4-07편의 SMP는 *하나의 OS가 모든 코어를 관리*하는 모델이었습니다. ready list와 lock을 공유하기 때문에 모든 코어가 같은 ABI를 따라야 하고, 실시간 결정성과 throughput을 같은 scheduler 안에서 타협해야 합니다.

그래서 한 칩 안에서 UI·네트워크는 Linux가 도는 core에, sensor·control은 RTOS가 도는 다른 core에 나눠 두는 구성을 씁니다. 같은 건물 안의 두 회사가 각자 사무실을 쓰고, 공용 우편함(shared memory)과 초인종(mailbox interrupt)으로만 연락하는 것과 같습니다. 공용 복도(DDR bus)와 엘리베이터(DMA)는 여전히 함께 쓰므로, core를 나눴다고 서로 간섭이 사라지지는 않습니다.

이 구성이 **AMP**(Asymmetric Multi-Processing)입니다. core마다 Linux, RTOS, bare-metal 중 무엇이든 돌 수 있습니다. 둘 사이 IPC를 표준화한 것이 **OpenAMP**이고, 그 위의 메시지 추상화가 **RPMsg**입니다.

이 글은 open-amp·libmetal v2024.10.0 소스와 Linux v6.12 문서, virtio 1.2 사양, RP2350 datasheet로 내용을 확인했습니다. 실행한 것은 Debian 13 arm64 guest(gcc 14.2.0)에서 libmetal과 open-amp를 cmake로 빌드하고 아래 `rpmsg-echo.c`를 그 헤더로 컴파일한 데까지입니다. 두 core 사이의 실제 RPMsg 전송은 돌리지 않았습니다. 이 Mac에서 띄울 수 있는 heterogeneous SoC 모델이 없기 때문입니다.

## Heterogeneous SoC — 누가 누구를 데리고 있나

Linux의 remoteproc framework는 Linux가 다른 core의 firmware를 load하고 전원을 켜고 끄는 구조입니다(Linux v6.12 `Documentation/staging/remoteproc.rst:18`, `rproc_boot()` `:37-39`). 이렇게 Linux가 host가 되어 Cortex-M 쪽 firmware를 시작하고, 둘이 RPMsg로 대화합니다. 반대로 bootloader가 M core를 먼저 띄우고 Linux가 나중에 붙는(attach) 구성도 있습니다. 어느 쪽인지는 board의 device tree와 remoteproc driver가 정합니다.

core 수를 셀 때는 datasheet를 봅니다. 예를 들어 RP2350은 M33과 RISC-V core가 모두 있지만, 동시에 4개가 도는 칩이 아닙니다. 뒤의 RP2350 절에서 datasheet 문장으로 확인합니다.

## AMP의 기본 구조

메모리는 네 덩어리로 나눕니다. Linux가 쓰는 RAM, remote firmware가 load되는 carveout, vring, 그리고 메시지 payload buffer pool입니다. 같은 물리 메모리라도 Linux에서 본 주소와 M core에서 본 주소(device address)가 다를 수 있습니다. device tree의 reserved-memory는 Linux가 그 영역을 쓰지 않게 할 뿐, M core가 다른 영역에 쓰는 것까지 막지는 않습니다.

Linux remoteproc가 firmware를 시작하는 경우의 흐름은 이렇습니다.

1. Linux의 해당 remoteproc driver와 reserved-memory/firmware resource 요구를 확인합니다.
2. offline 상태에서 firmware 이름을 설정합니다.
3. start 요청이 성공한 뒤 state와 trace·RPMsg channel 생성을 확인합니다.
4. endpoint discovery/주소를 맞춘 뒤 message protocol을 시작합니다.

정지·업데이트 전에는 DMA·shared buffer·peer endpoint의 lifetime과 재연결을 처리합니다.

## OpenAMP — 표준화된 IPC Framework

이 글은 open-amp **v2024.10.0**, commit `a2cd944c40d40846ede5dae69de6fda9427254da`(2024-11-04)와 같은 tag의 libmetal을 기준으로 합니다. open-amp의 `LICENSE.md`는 BSD 3-Clause입니다.

OpenAMP 3 layer

1. **libmetal** — HAL: memory map, IRQ register, atomic
2. **open-amp** — RPMsg / remoteproc / virtio-vring 구현
3. **application** — RPMsg endpoint를 통한 통신

전체 topology를 한 장으로 보면 이렇습니다. 두 코어가 각자의 libmetal HAL 위에 RPMsg/virtio를 올리고, 공유 DDR의 vring과 buffer pool을 매개로 메시지를 주고받습니다. mailbox IRQ가 상대 코어를 깨우는 신호입니다.

![OpenAMP heterogeneous SoC topology](/images/blog/rtos/diagrams/part4-12-openamp-topology.svg)

`libmetal`이 *플랫폼 추상화*입니다. 같은 OpenAMP 코드가 Linux 위에서도 FreeRTOS·Zephyr 위에서도 빌드되도록 memory map, interrupt 등록, sleep/wait를 감쌉니다. 실제로 이 guest에서는 libmetal이 Linux용으로 빌드됐고, open-amp는 그 헤더와 라이브러리를 찾아 빌드됐습니다.

다음 callback은 endpoint가 이미 만들어졌다는 전제의 **nonblocking echo**입니다. endpoint를 만드는 platform 초기화 코드(예제들의 `platform_create_rpmsg_vdev()` 같은 함수)는 OpenAMP 공통 API가 아니라 각 예제·port가 제공하므로 여기 싣지 않습니다.

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

이 파일을 앞에서 빌드한 open-amp v2024.10.0 헤더로 `gcc -Wall -Wextra`로 컴파일했고 경고 없이 통과했습니다. `nm`을 보면 `rpmsg_trysendto()`는 inline 함수라 결국 `rpmsg_send_offchannel_raw()` 한 심볼을 부릅니다.

```text
+ gcc -Wall -Wextra -I/root/amp/inst/include -c amp/rpmsg-echo.c -o amp/rpmsg-echo.o
echo_compile=0
+ nm amp/rpmsg-echo.o
0000000000000058 T echo_rx
                 U rpmsg_send_offchannel_raw
0000000000000000 t rpmsg_trysendto
```

수신 buffer(`data`)는 callback이 끝나면 다시 쓰이므로 callback 밖에 보관하지 않습니다. TX buffer가 없으면 이 예는 echo를 버리고 `dropped`만 셉니다. 실제 전송은 돌리지 않았습니다.

## RPMsg — Channel과 Endpoint

RPMsg는 *channel과 endpoint*를 통해 메시지를 주고받는 protocol입니다. 한 channel은 양쪽에 *이름과 주소*를 가지고, 한 메시지는 헤더(src/dst, len, flags) + payload로 전송됩니다.

RPMsg는 TCP의 stream/reconnect/reliable session과 동일한 추상화가 아닙니다. service 이름과 src/dst endpoint 주소로 메시지를 전달합니다.

**`rpmsg_send()`는 TX buffer를 기다리고 `rpmsg_trysend()`는 기다리지 않습니다.** open-amp `lib/include/openamp/rpmsg.h`의 주석이 그 차이를 그대로 적습니다. `rpmsg_send()`(`:198`)는 TX buffer가 없으면 "block until one becomes available, or a timeout of 15 seconds elapses"이고(`:188-190`), `rpmsg_trysend()`(`:275`)는 "immediately return -ENOMEM without waiting"입니다(`:266-267`). 15초는 `lib/rpmsg/rpmsg_virtio.c`의 `RPMSG_TICK_COUNT 15000000`을 `RPMSG_TICKS_PER_INTERVAL 1000`으로 나눈 만큼 `metal_sleep_usec(1000)`을 반복하는 데서 나옵니다(`:23`, `:26`, `:377-395`). Linux v6.12 `Documentation/staging/rpmsg.rst:80-83`도 커널 쪽 `rpmsg_send()`에 같은 15초를 적습니다. 그래서 receive callback 안에서 `rpmsg_send()`를 부르면 TX가 막힌 동안 최대 15초 동안 RX 처리도 멈춥니다. 위 echo가 `trysend`를 쓰는 이유입니다.

## virtio-vring — Shared Memory의 큐 구조

split virtqueue는 descriptor table, available ring, used ring 세 부분입니다. 역할은 virtio 1.2 사양이 못 박아 둡니다. §2.7.6은 available ring을 "only written by the driver and read by the device", §2.7.8은 used ring을 "only written to by the device, and read by the driver"로 정의합니다. 즉 buffer를 내주는 쪽은 언제나 driver, 다 쓰고 돌려주는 쪽은 언제나 device입니다. payload가 어느 방향으로 흐르든 이 역할은 바뀌지 않습니다. Linux RPMsg 문서(`rpmsg.rst:80-83`)가 TX buffer를 기다리는 조건을 "puts it back on virtio's used descriptor ring"으로 설명하는 것도 이 역할 분담 때문입니다.

같은 사양에는 "Used Buffer Notification Suppression"과 "Available Buffer Notification Suppression" 절이 있어서, 상대가 알림을 끄면 메시지 여러 개에 interrupt 하나만 갈 수 있습니다. 메시지 하나에 interrupt 하나라고 가정한 코드는 이때 메시지를 놓칩니다. 두 core 사이에 cache coherency가 없는 SoC라면 vring과 buffer를 noncacheable로 매핑하거나 clean/invalidate를 해야 하는데, 어느 쪽인지는 그 SoC port가 정하고 이 글에서는 확인하지 않았습니다.

## remoteproc — Linux가 Cortex-M을 부팅

Linux v6.12 `Documentation/ABI/testing/sysfs-class-remoteproc`에 따르면 `firmware` 파일은 "the name of the firmware currently loaded"를 보여 주고, firmware를 바꾸려면 `state`로 remote processor를 멈춘 뒤 새 파일 이름을 쓰라고 적습니다(`:1-10`). `state`는 `offline`·`suspended`·`running`·`crashed`·`invalid` 중 하나를 보여 주고(`:12-35`), 이 파일에 쓰면 상태를 바꿉니다. 그러니 `firmware`에 쓰는 것은 이름 지정이고, 실제 load와 시작은 `state`에 `start`를 쓸 때 driver가 합니다.

```bash
# 실제 대상 name/state를 먼저 확인. root와 해당 board/driver가 필요.
cat /sys/class/remoteproc/remoteproc0/name
cat /sys/class/remoteproc/remoteproc0/state
# offline일 때 해당 firmware 이름 지정
# echo m4_firmware.elf > /sys/class/remoteproc/remoteproc0/firmware
# echo start > /sys/class/remoteproc/remoteproc0/state
```

위 명령은 실행하지 않았습니다. 이 Debian guest에는 remoteproc 장치가 없습니다. firmware 파일 이름과 `remoteproc0`의 번호는 board마다 다릅니다.

## Mailbox — 코어 사이 인터럽트

mailbox는 초인종입니다. 우편함(vring)에 편지를 넣은 다음에 눌러야 상대가 열었을 때 편지가 있습니다. 순서를 바꾸면 상대는 빈 우편함을 보고 돌아갑니다. 그래서 vring index를 갱신하고, 그 쓰기가 상대에게 보이도록 barrier를 둔 뒤 mailbox interrupt를 보냅니다. endpoint callback이 그 interrupt handler 안에서 바로 불릴지, worker나 polling loop에서 불릴지는 port가 정합니다. 위 echo callback이 block하지 않게 만든 이유가 이것입니다.

## RPMsg Application — 두 가지 흔한 패턴

### Echo Server

위 callback이 그대로 echo server입니다. `rpmsg_trysendto()`가 길이만큼 돌려줬다는 것은 TX buffer에 넣었다는 뜻이지 상대가 읽었다는 뜻은 아닙니다. 왕복 시간을 재려면 메시지에 sequence 번호를 넣어 양쪽에서 기록합니다.

### Sensor Stream (M → A)

M core의 C struct를 그대로 보내면 A core의 컴파일러가 같은 padding·alignment로 읽는다는 보장이 없습니다. 그래서 byte 배치를 직접 정합니다. 예를 들어 timestamp 8 byte와 signed 16-bit sample 6개를 little-endian으로 이어 붙인 20 byte로 정하고, 수신 쪽은 길이가 정확히 20인지, sequence가 건너뛰었는지 확인합니다.

Linux user space에서는 rpmsg_char driver가 만드는 `/dev/rpmsg_ctrlN`에서 endpoint를 만들고 `/dev/rpmsgN`을 읽고 씁니다. 번호는 장치가 생긴 순서대로 붙으므로 고정 이름으로 열지 않습니다. 이 user space 경로도 실행하지 않았습니다.

## 격리와 AMP의 관계

core를 나눠도 DDR bus, DMA, 공용 peripheral은 함께 씁니다. Linux 쪽 DMA가 M core의 carveout에 쓰는 것을 막는 것은 RPMsg가 아니라 SoC의 bus firewall이나 IOMMU 설정입니다. AMP 배치를 격리의 증거로 쓰려면 그 설정을 따로 확인해야 합니다.

## RP2350 — Hybrid Heterogeneous

RP2350 datasheet(3.9 "Arm/RISC-V architecture switching")는 칩에 processor socket이 둘(core 0, core 1)이고, 각 socket을 Cortex-M33이나 Hazard3(RV32IMAC) 중 하나가 차지한다고 설명합니다. reset이 풀릴 때 OTP의 `ARCHSEL` register를 보고 어느 쪽을 연결할지 정하며, 쓰지 않는 processor는 "held in reset indefinitely, with its clock inputs gated" 상태입니다. 그러니 동시에 도는 core는 둘입니다. 기본은 Arm이고, secure boot를 켜면 bootrom이 RISC-V용 secure boot를 구현하지 않아 RISC-V core가 비활성화됩니다. 3.9.2 "Mixed architecture combinations"가 두 socket에 서로 다른 architecture를 넣는 경우를 따로 다룹니다.

같은 이유로 RP2040·RP2350의 두 core 사이 통신은 cache coherency 문제가 아니라 동기화 문제입니다(4-07). RP2350에서 OpenAMP를 쓰는 SDK integration은 이 글에서 확인하지 않았습니다.

## Inter-Core Message Latency 측정

이 글에서는 재지 않았습니다. 예전 판의 i.MX/STM32/RP2040 µs·ns 표는 재현 자료가 없어 지웠습니다. 두 core의 timestamp가 같은 clock에서 오지 않으면, 한쪽 시각에서 다른 쪽 시각을 빼도 단방향 지연이 되지 않습니다. 한쪽에서 보내고 같은 쪽에서 echo를 받아 왕복 시간(RTT)을 재는 편이 믿을 만합니다.

## 자주 보는 함정과 안티패턴

- Linux RAM, remote carveout, vring, buffer pool을 주소 map 없이 정해 서로 겹칩니다.
- available/used ring의 주인을 payload 방향으로 정합니다. 사양상 available은 driver만, used는 device만 씁니다.
- receive callback에서 `rpmsg_send()`를 불러 최대 15초 동안 RX를 막습니다.
- vring을 갱신하기 전에 mailbox를 울립니다.
- `firmware`에 이름을 쓴 것을 load 완료로, send 성공을 상대가 처리한 것으로 봅니다.

## 정리

- AMP는 core마다 따로 OS(또는 bare-metal)를 돌리고 shared memory와 mailbox로 통신합니다.
- open-amp v2024.10.0의 `rpmsg_send()`는 TX buffer가 없으면 최대 15초 기다리고, `rpmsg_trysend()`는 바로 `-ENOMEM`을 돌려줍니다.
- virtio 1.2에서 available ring은 driver만, used ring은 device만 씁니다.
- remoteproc의 `firmware`는 이름 지정, 시작은 `state`에 `start`입니다.
- RP2350은 socket 2개에 M33이나 Hazard3를 고르는 칩이라 동시에 도는 core는 둘입니다.

## 근거 자료

- [OpenAMP v2024.10.0](https://github.com/OpenAMP/open-amp/tree/v2024.10.0), [rpmsg.h](https://github.com/OpenAMP/open-amp/blob/v2024.10.0/lib/include/openamp/rpmsg.h), [libmetal v2024.10.0](https://github.com/OpenAMP/libmetal/tree/v2024.10.0).
- [Virtio 1.2 split queue](https://docs.oasis-open.org/virtio/virtio/v1.2/virtio-v1.2.html), [Linux RPMsg](https://docs.kernel.org/staging/rpmsg.html), [remoteproc](https://docs.kernel.org/staging/remoteproc.html), [sysfs ABI](https://www.kernel.org/doc/Documentation/ABI/testing/sysfs-class-remoteproc).
- [RP2350 datasheet](https://datasheets.raspberrypi.com/rp2350/rp2350-datasheet.pdf) 3.9: Arm/RISC-V architecture switching.



다음 편은 [4-13 C++ in RTOS](/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos)에서 RTOS C API를 C++ 객체로 감싸는 패턴을 다룹니다.

## 관련 항목

- [4-07: SMP RTOS](/blog/embedded/rtos/practical-internals/part4-07-smp-rtos)
- [4-11: TrustZone과 TF-M](/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm)
- [5-04: Porting](/blog/embedded/rtos/practical-internals/part5-04-porting)
