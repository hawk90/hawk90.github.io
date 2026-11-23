---
title: "EtherCAT Master 구현 — SOEM API와 구성·검증의 경계"
slug: "embedded/protocols/industrial-ethernet/chapter05-ethercat-master"
date: 2026-05-13T09:05:00
description: "SOEM v1.4.0을 macOS와 Debian 12 VM에서 빌드하고 adapter 조회·권한·기대 WKC를 실제로 확인한 뒤, IgH 1.6.9의 커널 모듈 구조와 라이선스, 슬레이브의 SII를 소스로 정리합니다."
series: "Industrial Ethernet 심화"
seriesOrder: 5
tags: [ethercat, soem, igh, twincat]
draft: false
topics: ["embedded", "embedded/protocols"]
---

## 한 줄 요약

> **"EtherCAT 마스터는 전용 하드웨어가 아니라 *일반 NIC + 결정적 소프트웨어*로 만든다."** SOEM은 userspace 라이브러리, IgH는 커널 모듈, TwinCAT은 Beckhoff의 상용 환경입니다.

EtherCAT의 비대칭은 슬레이브와 마스터 사이에 있습니다. 슬레이브는 ESC라는 전용 칩이 필요하지만, 마스터는 [Ch 4](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)에서 본 대로 raw socket으로 프레임을 만들어 보내면 됩니다. 식당에 비유하면 슬레이브는 각자 주방 설비를 갖춘 가게이고, 마스터는 주문서 한 장을 들고 가게를 차례로 도는 배달원입니다.

이 장은 마스터 구현 셋을 비교하고, SOEM v1.4.0을 macOS와 Debian 12 VM에서 직접 빌드·실행하면서 만난 일을 기록합니다. 그다음 IgH EtherCAT Master 1.6.9의 소스 구조를 보고, 마지막에 슬레이브 쪽의 SII·ESI를 정리합니다.

## 세 가지 마스터 — 한눈 비교

| 항목 | SOEM v1.4.0 | IgH EtherCAT Master 1.6.9 | TwinCAT |
|------|------|----------------------|---------|
| 라이선스 | GPLv2 + 링크 예외, Beckhoff EtherCAT Master License 조건 (`LICENSE`) | master·드라이버 GPLv2, userspace `lib/`와 `ecrt.h`는 LGPL 2.1 | Beckhoff 상용 |
| 형태 | C 라이브러리, userspace | 커널 모듈 + userspace 라이브러리 | 개발은 Windows의 Visual Studio 기반 XAE, runtime은 Windows 또는 TwinCAT/BSD |
| NIC 경로 | `PF_PACKET` raw socket | 전용 패치 드라이버 또는 generic 드라이버 | 호환 포트에 설치하는 TwinCAT 실시간 이더넷 드라이버 |

SOEM v1.4.0의 `LICENSE`는 GPLv2에 링크 예외를 붙이고, 끝에서 두 번째 문단에서 SOEM으로 EtherCAT 마스터를 만들어 쓰거나 배포하려면 Beckhoff Automation에서 EtherCAT Master License를 받아야 한다고 적습니다. 오픈소스라는 사실과 상용 배포 조건은 따로 읽어야 합니다. IgH 1.6.9의 `README.md`는 GPLv2를, `lib/master.c`와 `include/ecrt.h`의 헤더는 LGPL을 명시하고, 저장소에 `COPYING`과 `COPYING.LESSER`(2.1)가 함께 있습니다.

## SOEM — Simple Open EtherCAT Master

SOEM은 C 라이브러리 하나로 프레임 생성, 슬레이브 탐색, SII 읽기, mailbox, DC 설정까지 담고 있습니다. 이 글은 tag v1.4.0만 다룹니다.

### 빌드 — 두 환경에서 만난 두 가지 문제

v1.4.0의 `CMakeLists.txt` 첫 줄은 `cmake_minimum_required(VERSION 2.8.4)`입니다. macOS(arm64, CMake 4.5.1, Apple clang 21.0.0)에서 그대로 configure하면 실패합니다.

```text
CMake Error at CMakeLists.txt:1 (cmake_minimum_required):
  Compatibility with CMake < 3.5 has been removed from CMake.
```

`-DCMAKE_POLICY_VERSION_MINIMUM=3.5`를 주면 configure가 통과하고 `libsoem.a`가 만들어집니다.

```bash
git clone --branch v1.4.0 --depth 1 https://github.com/OpenEtherCATsociety/SOEM.git
cmake -S SOEM -B soem-build -DCMAKE_POLICY_VERSION_MINIMUM=3.5
cmake --build soem-build --target soem --parallel 4
```

Debian 12 VM(arm64, CMake 3.25.1, GCC 12.2.0)에서는 configure는 되지만 컴파일이 멈춥니다. `CMakeLists.txt`가 Linux·macOS 모두에 `-Wall -Wextra -Werror`를 붙이는데, GCC 12가 `oshw/linux/oshw.c`의 `strncpy`에 경고를 내기 때문입니다.

```text
/root/SOEM/oshw/linux/oshw.c:83:11: error: ‘strncpy’ specified bound depends on the length of the source argument [-Werror=stringop-truncation]
cc1: all warnings being treated as errors
```

해당 코드는 바로 앞에서 길이를 `EC_MAXLEN_ADAPTERNAME - 1`로 자르고 끝에 `'\0'`을 넣으므로 실제 overflow는 아닙니다. 그래서 이 경고만 오류에서 빼고 빌드했습니다.

```bash
cmake -S SOEM -B soem-build -DCMAKE_BUILD_TYPE=Release \
  -DCMAKE_C_FLAGS="-Wno-error=stringop-truncation"
cmake --build soem-build --parallel 4
```

이렇게 하면 `libsoem.a`와 `simple_test`, `slaveinfo`, `eepromtool`이 모두 만들어집니다.

### NIC 목록 조회 예제

다음 프로그램은 SOEM이 찾은 adapter 목록을 출력하고 해제합니다. `ec_init()`이나 슬레이브 설정은 호출하지 않습니다.

```c title="soem-adapter-list.c"
#include <stdio.h>
#include "ethercat.h"
int main(void) {
    ec_adaptert *head = ec_find_adapters();
    if (!head) {
        fputs("No adapter list available\n", stderr);
        return 1;
    }
    for (ec_adaptert *adapter = head; adapter; adapter = adapter->next) {
        printf("%s\t%s\n", adapter->name, adapter->desc);
    }
    ec_free_adapters(head);
    return 0;
}
```

VM에서 SOEM include 경로 네 개를 주고 `libsoem.a`, `-lpthread -lrt`와 링크해 실행한 결과입니다. veth 한 쌍을 미리 만들어 두었습니다.

```text
# gcc -Wall -O2 -I SOEM/soem -I SOEM/osal -I SOEM/osal/linux -I SOEM/oshw/linux \
    soem-adapter-list.c soem-build/libsoem.a -lpthread -lrt -o soem-adapter-list
# ./soem-adapter-list
lo	lo
enp0s1	enp0s1
veth1	veth1
veth0	veth0
```

Linux port의 `ec_find_adapters()`는 인터페이스 이름을 `name`과 `desc`에 똑같이 넣습니다(`oshw/linux/oshw.c` 83·85행의 두 `strncpy`). 목록에 나온다는 것은 커널이 그 인터페이스를 안다는 뜻일 뿐, 슬레이브가 연결되어 있다는 뜻은 아닙니다.

### OP 초기화 흐름 — 공식 simple_test

[공식 simple_test](https://github.com/OpenEtherCATsociety/SOEM/blob/v1.4.0/test/linux/simple_test/simple_test.c)는 다음 순서로 진행합니다.

1. `ec_init(ifname)`로 소켓을 엽니다.
2. `ec_config_init(FALSE)`가 슬레이브를 찾고 Pre-Op까지 올립니다([Ch 3](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)의 ESM 절).
3. `ec_config_map(&IOmap)`가 process data를 `char IOmap[4096]`에 매핑하고 Safe-Op를 요청합니다.
4. `ec_configdc()`로 DC를 설정합니다.
5. 기대 WKC를 계산하고, process data를 한 번 주고받은 뒤 `ec_writestate(0)`로 Op를 요청합니다.
6. `chk = 200`과 `while (chk-- && ...)`로 최대 201번 `ec_send_processdata()`·`ec_receive_processdata()`·`ec_statecheck(0, EC_STATE_OPERATIONAL, 50000)`를 반복하며 Op 도달을 기다립니다.

두 가지를 짚어 둡니다. 먼저 `ec_config_map(void *pIOmap)`(`ethercatconfig.c` 1643행)은 buffer 크기를 받지 않습니다. 매핑할 process data가 4096 byte를 넘어도 함수는 막지 못하므로, 호출 전에 슬레이브 구성의 총 입출력 크기를 알고 buffer를 잡아야 합니다. 다음으로 6단계의 대기는 `ec_statecheck`의 timeout 50,000 μs를 최대 201번 반복하므로 송수신 시간을 빼고도 약 10초입니다.

### 기대 WKC 계산

v1.4.0의 `ec_groupt`(`ethercatmain.h` 239행부터)에는 `expectedWKC` 필드가 없고 `outputsWKC`와 `inputsWKC`(266·268행)가 있습니다. simple_test 65행은 이 둘로 기대값을 계산합니다.

```c title="test/linux/simple_test/simple_test.c:65"
expectedWKC = (ec_group[0].outputsWKC * 2) + ec_group[0].inputsWKC;
```

출력 쪽에 2를 곱하는 이유는 [Ch 4](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)의 WKC 규칙에 있습니다. LRW에서 write 성공은 +2, read 성공은 +1입니다. 예를 들어 출력과 입력을 하나씩 가진 슬레이브 한 대의 기대값은 3이고, input만 성공하면 1, output만 성공하면 2가 돌아옵니다. 여러 대가 물려 있으면 같은 부족분이 여러 조합에서 나올 수 있어, 몇 대가 실패했는지는 WKC만으로 알 수 없습니다.

### RT cycle thread

주기 루프는 상대 sleep 대신 *절대 시각*으로 깨어나야 오차가 쌓이지 않습니다. `nanosleep(1 ms)`를 반복하면 처리 시간만큼 매 주기 밀리지만, `clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, ...)`은 다음 목표 시각을 고정해 두고 그때까지 잡니다. 다음은 그 골격입니다.

```c
struct timespec next_cycle;
clock_gettime(CLOCK_MONOTONIC, &next_cycle);

while (running) {
    next_cycle.tv_nsec += 1000000;  /* 1 ms */
    if (next_cycle.tv_nsec >= 1000000000) {
        next_cycle.tv_sec++;
        next_cycle.tv_nsec -= 1000000000;
    }
    clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &next_cycle, NULL);

    ec_send_processdata();
    wkc = ec_receive_processdata(EC_TIMEOUTRET);

    /* control logic here */
}
```

`clock_nanosleep()`이 `EINTR`로 돌아오면 같은 목표로 다시 자야 하고, 처리가 늦어 목표가 이미 지났다면 다음 목표를 어떻게 잡을지 정해야 합니다. 그 계산은 [Ch 11](/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime)에서 코드로 다룹니다.

## IgH EtherCAT Master

IgH EtherCAT Master(Ingenieurgemeinschaft IgH)는 *커널 모듈 + userspace 라이브러리* 구조입니다. 마스터 모듈이 커널 안에서 프레임을 주고받고, 애플리케이션은 `ecrt.h` API로 그 모듈에 요청을 보냅니다.

![IgH 구조 — 애플리케이션이 ecrt_*() 함수로 userspace lib를 부르고, lib가 /dev/EtherCAT0에 ioctl을 보내 커널 모듈이 패치 드라이버 또는 generic 드라이버로 NIC를 쓰는 흐름](/images/blog/industrial-ethernet/diagrams/ch05-igh-stack.svg)

1.6.9 소스의 `master/master.c` 369행은 마스터마다 `EtherCAT%u` 이름의 character device를 만듭니다. 그림의 `/dev/EtherCAT0`이 그것입니다.

NIC 경로는 둘입니다. `devices/` 디렉터리에는 커널 버전별로 패치한 네이티브 드라이버가 `*-<버전>-ethercat.c`와 원본 `*-<버전>-orig.c` 쌍으로 들어 있습니다. 이 드라이버를 쓰면 NIC가 일반 네트워크 스택에서 떨어지고, 마스터가 NIC를 직접 polling합니다. 1.6.9에 Linux 6.12용 파일이 있는 드라이버는 다음과 같습니다.

| 드라이버 | 6.12 파일 | 가장 이른 버전 |
|---|---|---|
| e1000, e1000e, e100, 8139too | 있음 | 3.x |
| igb | 있음 | 3.18 |
| igc | 있음 | 5.14 |
| r8169 | 있음 | 5.10 (3.x용은 `devices/` 최상위) |
| genet | 있음 | 5.10 |
| stmmac | 있음 | 6.1 |

다른 하나는 `devices/generic.c`의 generic 드라이버입니다. 커널 안에서 `PF_PACKET`, `SOCK_RAW` 소켓을 열어(219·222행) 아무 NIC나 일반 드라이버 그대로 씁니다. 지원 드라이버가 없는 NIC에서도 동작하지만, 프레임이 일반 네트워크 스택을 거칩니다.

### 애플리케이션 API의 순서

`include/ecrt.h`(1.6.9)의 함수로 애플리케이션 흐름을 나누면 다음과 같습니다.

| 단계 | API (`ecrt.h` 행) |
|---|---|
| 마스터 요청 | `ecrt_request_master()` (655) |
| domain 생성 | `ecrt_master_create_domain()` (762) |
| 슬레이브 설정 | `ecrt_master_slave_config()` (798) |
| PDO entry 등록 | `ecrt_domain_reg_pdo_entry_list()` (2163) |
| 활성화 | `ecrt_master_activate()` (1061) |
| process data 포인터 | `ecrt_domain_data()` (2219) |
| 주기: 수신 | `ecrt_master_receive()` (1131), `ecrt_domain_process()` (2234) |
| 주기: 송신 | `ecrt_domain_queue()` (2247), `ecrt_master_send()` (1113) |
| 해제 | `ecrt_release_master()` (692) |

`ecrt.h` 1053행 주석대로 활성화 뒤에는 애플리케이션이 `ecrt_master_send()`와 `ecrt_master_receive()`를 주기적으로 불러 통신을 유지해야 합니다. SOEM은 같은 일을 `ec_send_processdata()`·`ec_receive_processdata()` 두 함수에 묶어 두었고, IgH는 domain 단위의 처리(`ecrt_domain_process()`·`ecrt_domain_queue()`)를 따로 부르게 합니다. 예제는 저장소의 `examples/user`, `examples/dc_user`에 있습니다.

## TwinCAT (Beckhoff)

TwinCAT은 Beckhoff의 상용 자동화 환경으로, PLC 프로그래밍과 모션 제어, EtherCAT 마스터를 한 제품에 묶습니다. [TwinCAT/BSD 소개](https://www.beckhoff.com/en-en/products/ipc/software-and-tools/twincat-bsd/)는 프로그래밍을 Windows의 Visual Studio 기반 TwinCAT 3 XAE에서 하고, runtime은 FreeBSD 기반 TwinCAT/BSD에서도 돌릴 수 있다고 설명합니다. NIC는 [호환 포트에 TwinCAT 실시간 드라이버를 설치](https://infosys.beckhoff.com/content/1033/el37x2/1036996875.html)해 씁니다. SOEM과 IgH는 EtherCAT 통신만 다루므로 PLC 로직과 HMI는 사용자가 따로 만들어야 합니다. 이 차이가 선택의 첫 번째 기준입니다. TwinCAT의 가격은 이 글에서 다루지 않습니다.

## 슬레이브 쪽 — ESC와 MCU

MCU를 쓰는 슬레이브 보드는 *MCU 한 개 + ESC 한 개* 구조입니다. ESC는 Digital I/O PDI로 MCU 없이 I/O를 직접 낼 수도 있습니다(ESC Section I Table 1). MCU가 있으면 ESC가 EtherCAT 처리를 하드웨어로 하고, MCU는 PDI(SPI 등)로 ESC 메모리를 읽고 써서 애플리케이션을 돌립니다. ESC별 자원 차이는 [Ch 3의 표](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)에 있습니다.

![EtherCAT 슬레이브 보드 — RJ45 IN/OUT, LAN9252 ESC, SPI로 STM32F4 연결](/images/blog/industrial-ethernet/diagrams/ch05-slave-hw.svg)

### SII·ESI·ENI — 슬레이브와 망을 설명하는 자료

슬레이브는 자기 자신을 SII와 ESI 두 곳에서 설명하고, 구성 도구는 이를 모아 망 전체 구성인 ENI를 만듭니다.

| 이름 | 위치 | 누가 읽나 |
|---|---|---|
| SII (Slave Information Interface) | 슬레이브의 EEPROM | 마스터가 런타임에 ESC를 통해 읽음 |
| ESI (EtherCAT Slave Information) | 제조사가 배포하는 XML 파일 | 구성 도구가 오프라인으로 읽음 |
| ENI (EtherCAT Network Information) | 구성 도구가 만든 XML 파일 | 마스터가 망 전체 구성을 불러옴 |

SOEM v1.4.0은 ESI·ENI XML을 읽지 않고 SII로 자동 구성합니다. 저장소에 ENI 파서가 없으며, `ec_config_init()`이 SII에서 mailbox SM 설정을 읽고(Ch 3), `ec_config_map()`이 SII나 CoE로 PDO 크기를 구합니다.

### SII의 identity 주소

SOEM v1.4.0의 `ethercattype.h` 301~303행은 identity 항목을 다음처럼 정의합니다.

```c title="soem/ethercattype.h:301-303"
ECT_SII_MANUF       = 0x0008,
ECT_SII_ID          = 0x000a,
ECT_SII_REV         = 0x000c,
```

이 값은 **16-bit word 주소**입니다. byte 주소로 바꾸면 vendor ID는 0x10, product code는 0x14, revision은 0x18입니다. word 0x0000~0x0007은 ESC Configuration Area로, ESC 데이터시트 Section I Table 40은 word 0x0을 PDI Control, 0x4를 Configured Station Alias, 0x7을 checksum으로 정의합니다. 마스터는 이 identity를 읽어 슬레이브가 기대한 모델·revision인지 확인합니다.

## 자주 하는 실수

### "raw socket 권한이 없어서 안 된다"

맞습니다. VM에서 `nobody` 사용자로 `slaveinfo veth0`을 실행하면 소켓을 열지 못합니다.

```text
$ su nobody -s /bin/sh -c "/root/soem-build/test/linux/slaveinfo/slaveinfo veth0"
SOEM (Simple Open EtherCAT Master)
Slaveinfo
Starting slaveinfo
No socket connection on veth0
Excecute as root
End program
```

root가 아니어도 실행 파일에 `CAP_NET_RAW`만 주면(`setcap cap_net_raw+ep`) `ec_init on veth0 succeeded.`까지 갑니다. 다만 하나가 달라집니다. SOEM의 `nicdrv.c`는 소켓을 연 뒤 `SIOCSIFFLAGS`로 인터페이스에 `IFF_PROMISC`를 켜는데(163~164행), 이 ioctl에는 `CAP_NET_ADMIN`이 필요하고 SOEM은 반환값을 무시합니다. 실제로 VM에서 PROMISC를 끈 뒤 `CAP_NET_RAW`만으로 실행하면 PROMISC가 켜지지 않았고, root로 실행하면 켜졌습니다. SOEM 프레임의 목적지는 broadcast(ff:ff:ff:ff:ff:ff)라 promiscuous가 아니어도 돌아온 프레임을 받습니다.

### "ec_init 성공인데 슬레이브가 0개 발견된다"

위 veth 실험이 정확히 그 상황입니다. `ec_init()`은 소켓을 열었다는 뜻이고, `No slaves found!`는 [Ch 4](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)에서 본 BRD의 WKC가 0이었다는 뜻입니다. 실제 망에서 이렇게 나오면 링크 상태(`ethtool ethX`의 `Link detected`)와 슬레이브 전원을 먼저 보고, 케이블이 첫 슬레이브의 입력 포트(port 0)에 꽂혔는지 확인합니다. ESC는 MAC 주소를 보지 않으므로 MAC 설정은 원인이 아닙니다.

### "WKC가 expected의 절반이다"

출력·입력 가중치가 다르므로 "절반"이라는 비율 자체가 단서가 되지 않습니다. 기대 3에서 output만 빠지면 1, input만 빠지면 2입니다. 슬레이브가 여러 대면 어느 슬레이브가 Op에 있지 않은지를 슬레이브별 AL Status(0x0130)로 확인합니다. SOEM의 `ec_readstate()`는 BRD로 전체를 본 뒤 FPRD로 하나씩 읽습니다.

### "DC 동기 후 시간이 지나면 drift가 보인다"

DC의 drift 보정은 주기 프레임의 FRMW가 reference 시각을 계속 배포해야 유지됩니다(Ch 2). SOEM v1.4.0은 `ec_configdc()` 뒤 `ec_send_processdata()`가 만드는 프레임에 FRMW를 자동으로 붙입니다. process data를 SOEM 함수 없이 직접 LRW로 보낸다면 FRMW도 직접 넣어야 합니다.

### "TwinCAT으로 만든 ENI를 SOEM에 그대로 쓴다"

SOEM v1.4.0 소스에는 ENI를 읽는 코드가 없습니다. SOEM에서 같은 구성을 쓰려면 SII 기반 자동 구성을 쓰거나, PDO 매핑을 코드에서 CoE로 직접 설정합니다.

## 정리

- EtherCAT 마스터는 *전용 하드웨어 없이 일반 NIC + 소프트웨어*로 구현합니다. SOEM은 raw socket, IgH는 패치 드라이버나 generic 드라이버를 씁니다.
- SOEM v1.4.0은 CMake 4에서 `CMAKE_POLICY_VERSION_MINIMUM`이, GCC 12에서 `-Wno-error=stringop-truncation`이 필요했습니다.
- SOEM 배포에는 GPLv2 조건과 별도로 Beckhoff EtherCAT Master License 조건이 붙습니다. IgH는 GPLv2(커널 쪽)와 LGPL 2.1(lib)입니다.
- simple_test의 기대 WKC는 `outputsWKC * 2 + inputsWKC`이고, Op 대기는 최대 201 × 50 ms입니다.
- `ec_config_map()`은 IOmap 크기를 모르므로 buffer는 호출자가 충분히 잡습니다.
- 소켓에는 `CAP_NET_RAW`가 필요하고, `CAP_NET_ADMIN`이 없으면 promiscuous 설정은 조용히 실패합니다.
- SII identity 주소는 word 단위(0x0008·0x000A·0x000C)입니다.

다음 편은 **Ch 6: PROFINET 개요 — RT·IRT 클래스**입니다. PROFINET이 Conformance Class와 RT·IRT로 결정성을 어떻게 나누는지 PI 자료로 봅니다.

## 관련 항목

- [Ch 3: EtherCAT 아키텍처 — Processing on the Fly](/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture)
- [Ch 4: EtherCAT 프레임 — Datagram·WKC](/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame)
- [Ch 6: PROFINET 개요 — RT·IRT 클래스](/blog/embedded/protocols/industrial-ethernet/chapter06-profinet)
- [Practical RTOS Internals Part 1.4: Preemption](/blog/embedded/rtos/practical-internals/part1-04-preemption) — 마스터 cycle thread 설계
- [Modern Embedded Recipes: IRQ affinity](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [SOEM v1.4.0 소스](https://github.com/OpenEtherCATsociety/SOEM/tree/v1.4.0)
- [IgH EtherCAT Master 1.6.9 소스](https://gitlab.com/etherlab.org/ethercat/-/tree/1.6.9)
- [원문 — SOEM GitHub](https://github.com/OpenEtherCATsociety/SOEM)
- [원문 — EtherLab IgH Master](https://etherlab.org/en/ethercat/)
