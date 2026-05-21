---
title: "Ch 11: 리눅스 실시간 — PREEMPT_RT·EtherCAT"
date: 2026-05-16T11:00:00
description: "PREEMPT_RT mainline·CPU isolation·NIC tuning·IgH EtherCAT 마스터까지 — Linux 위에서 산업 이더넷을 굴리는 모든 단계."
series: "Industrial Ethernet 심화"
seriesOrder: 11
tags: [linux, preempt-rt, xenomai, ethercat-driver, cyclictest, isolcpus]
draft: false
---

## 한 줄 요약

> **"Linux로 산업 이더넷 마스터를 돌리려면 *커널·CPU·IRQ·NIC* 네 곳 모두에서 결정성을 짜야 합니다."** — PREEMPT_RT 한 줄로 끝나는 일이 아닙니다. isolation·affinity·hw timestamp·드라이버 튜닝까지 *전부 같이* 갖춰야 100µs jitter가 나옵니다.

EtherCAT IgH 마스터, openPOWERLINK MN, OPC UA Pub/Sub publisher 같은 *RT 애플리케이션*을 Linux에서 돌리는 일은 이제 표준이 되었습니다. PLC 벤더가 *softPLC*라는 이름으로 Linux 기반 PLC를 판매하는 시대입니다(B&R APROL, CODESYS Runtime, Bosch ctrlX, Phoenix Contact PLCnext).

이 장은 *어떻게 Linux를 그 수준까지 가져가는가*를 4단계로 풉니다. PREEMPT_RT 활성화, CPU isolation, NIC 튜닝, EtherCAT IgH 설정. 각 단계가 *어디서 결정성을 얼마나 가져오는지* 측정하면서 갑니다.

## 왜 vanilla Linux로는 안 되는가

표준 Linux 커널은 *throughput 최적화*가 목표입니다. *최악 응답 시간*은 다음과 같은 곳에서 망가집니다.

| 원인 | 추가 latency |
|------|-------------|
| 커널 코드 안의 *spinlock* | 수십 µs |
| irq 처리 *non-preemptible* | 수십 µs |
| *RCU* grace period | 수십~수백 ms |
| Workqueue 지연 | 수~수십 ms |
| Page fault (swap, demand-paging) | 수ms~수초 |
| *NMI* (perf 등) | µs~ms |
| *Power management* (cpuidle, cpufreq) | µs~ms |

`cyclictest`로 vanilla Linux를 측정하면 *최대 latency가 수 ms 단위*로 튑니다. EtherCAT 1ms 사이클에서 이건 *연속 사이클 miss*를 만듭니다.

```text
# vanilla 6.6 kernel, idle system
$ cyclictest -p99 -t 4 -i 1000 -n -D 60
T: 0 ( 1234) P:99 I:1000 C:  60000 Min:      4 Act:    8 Avg:    7 Max:    3421
                                                                          ^^^^
                                                                          ms 단위로 튐
```

3.4ms의 *최악 latency*면 1ms 사이클은 불가능합니다.

## PREEMPT_RT — mainline에 통합

PREEMPT_RT는 *모든 kernel critical section을 preemptible로* 만드는 패치셋입니다. 20년에 걸친 외부 패치 끝에 *2024년 Linux 6.12*에서 *mainline에 완전 병합*되었습니다.

2026년 현재의 상황:

- **Linux 6.12 LTS** — PREEMPT_RT가 *config option* (`CONFIG_PREEMPT_RT=y`).
- **Xenomai 3** — co-kernel 방식, *legacy*. Linux 5.x까지 active maintenance.
- **Xenomai 4 / EVL** — *EVL Project*로 이름 바뀜. *user-level RT*를 위한 새 API. 적극 개발 중.
- **RTAI** — 사실상 *unmaintained*.

선택 가이드는 단순합니다.

| 시나리오 | 추천 |
|----------|------|
| 새 프로젝트, 사이클 ≥ 250µs | **PREEMPT_RT** (mainline) |
| 사이클 ≤ 100µs, 극단적 결정성 | **EVL / Xenomai 4** |
| 기존 Xenomai 3 시스템 유지 | **Xenomai 3** (단, EOL 계획 수립) |

PREEMPT_RT 활성화:

```bash
# Debian/Ubuntu (kernel 6.12+)
sudo apt install linux-image-rt-amd64

# 또는 source build
make menuconfig
  General setup
    Preemption Model -> Fully Preemptible Kernel (Real-Time)
make -j && sudo make modules_install install
```

PREEMPT_RT만 활성화한 결과:

```text
$ uname -a
Linux rt 6.12.0-rt amd64
$ cyclictest -p99 -t 4 -i 1000 -n -D 60
T: 0 ( 1234) P:99 I:1000 C:  60000 Min:      4 Act:    9 Avg:    8 Max:      87
                                                                          ^^
                                                                          µs로 떨어짐
```

87µs로 떨어졌습니다. 좋아졌지만 *EtherCAT 250µs 사이클*에는 아직 빠듯합니다. 다음 단계가 *CPU isolation*입니다.

## CPU isolation — RT 코어를 격리

multicore 시스템에서 *몇 개 코어만 RT 작업에 전용*으로 두면 latency가 한 자릿수 µs까지 떨어집니다. 세 가지 옵션을 *함께* 씁니다.

| 부트 파라미터 | 효과 |
|--------------|------|
| `isolcpus=2,3` | 스케줄러가 이 코어에 *일반 태스크를 배치하지 않음* |
| `nohz_full=2,3` | 이 코어의 *timer tick을 끔* (CPU 휴식 시 인터럽트 0) |
| `rcu_nocbs=2,3` | RCU callback을 이 코어에서 *호출하지 않음* |

`/etc/default/grub`:

```text
GRUB_CMDLINE_LINUX_DEFAULT="quiet isolcpus=2,3 nohz_full=2,3 rcu_nocbs=2,3 \
  irqaffinity=0,1 mitigations=off intel_pstate=disable processor.max_cstate=1 \
  idle=poll"
```

옵션 해설:

- `irqaffinity=0,1` — *모든 IRQ를 housekeeping 코어(0,1)에 보냄*. RT 코어로 IRQ가 못 들어오게.
- `mitigations=off` — Spectre/Meltdown 완화 끄기 (보안 vs 결정성 trade-off, *isolated 시스템*에서만).
- `intel_pstate=disable` — Intel P-state governor 비활성. 주파수 변동 방지.
- `processor.max_cstate=1` — C1 이상의 deep sleep 금지. wakeup latency 0.
- `idle=poll` — idle 시 *busy loop*. wakeup latency를 거의 0으로. 전력 비용 큼.

`grub-mkconfig -o /boot/grub/grub.cfg` 후 재부팅합니다.

RT 애플리케이션을 *cpu 2*에 pin:

```bash
sudo taskset -c 2 chrt -f 80 ./ec_master_app
```

또는 코드 안에서:

```c
#include <sched.h>
#include <pthread.h>

void pin_to_cpu(int cpu) {
    cpu_set_t set;
    CPU_ZERO(&set);
    CPU_SET(cpu, &set);
    sched_setaffinity(0, sizeof(set), &set);

    struct sched_param param = { .sched_priority = 80 };
    sched_setscheduler(0, SCHED_FIFO, &param);

    // Lock memory
    mlockall(MCL_CURRENT | MCL_FUTURE);
}
```

`mlockall`이 *page fault*를 막습니다. 산업 RT에서는 *반드시* 호출합니다.

## cyclictest로 측정

isolation 후 측정:

```bash
# RT 코어 (cpu 2)에 200,000 사이클, 250µs 간격으로
sudo taskset -c 2 cyclictest -p99 -t 1 -i 250 -n -D 1h
```

전형적 결과:

```text
T: 0 ( 5678) P:99 I:250 C:14400000 Min:      2 Act:    5 Avg:    4 Max:      18
                                                                          ^^
                                                                          μs
```

18µs max latency까지 떨어집니다. 250µs 사이클에 *충분*하고 100µs 사이클도 *마진 있게* 들어갑니다.

장시간 측정이 중요합니다. *1시간 이상* 돌려야 *real-world worst case*가 보입니다. 짧게 돌리면 page fault·hardware error 같은 *드문 사건*을 놓칩니다.

`hackbench`를 *백그라운드로 돌리며* 측정하면 *부하 중 worst case*를 봅니다.

```bash
# Stress in background
hackbench -g 10 -l 10000 &

# Measure on RT core
sudo taskset -c 2 cyclictest -p99 -t 1 -i 250 -n -D 30m
```

이 조건에서 *Max가 50µs 이하*면 production-ready로 간주합니다.

## NIC 튜닝 — Intel I210 / I225 + NXP

NIC 자체의 jitter도 줄여야 합니다. 표준 NIC의 *default 설정*은 throughput 최적화이므로 *latency를 깨트립니다*.

### IRQ affinity

NIC IRQ를 *RT 코어가 아닌 housekeeping 코어*로 보냅니다.

```bash
# Find NIC IRQ
$ cat /proc/interrupts | grep eth0
  29:    1234567   IO-APIC   29-edge      eth0
  30:        890   IO-APIC   30-edge      eth0-rx-0
  31:        912   IO-APIC   31-edge      eth0-tx-0

# Pin to cpu 0
$ echo 1 | sudo tee /proc/irq/29/smp_affinity
$ echo 1 | sudo tee /proc/irq/30/smp_affinity
$ echo 1 | sudo tee /proc/irq/31/smp_affinity
```

또는 `irqbalance`를 *끄고* `tuna`로 영구 설정합니다.

```bash
sudo systemctl disable --now irqbalance
sudo tuna -q eth0 -c 0 -m
```

### Offload 끄기

generic-segmentation-offload, TCP-segmentation-offload 등은 *NIC가 큰 프레임을 쪼개는* 기능입니다. 결정성을 깨므로 끕니다.

```bash
sudo ethtool -K eth0 gso off tso off gro off lro off ufo off
sudo ethtool -K eth0 rx-checksumming off tx-checksumming off
sudo ip link set eth0 txqueuelen 0
```

### Ring size 줄이기

NIC ring buffer가 크면 *프레임이 큐에서 대기*합니다. RT 트래픽은 *큐에 쌓이면 안 됩니다*.

```bash
sudo ethtool -G eth0 rx 64 tx 64
```

기본은 보통 256~512이고 *고처리량* 최적화입니다. RT에서는 *프레임이 즉시 송신*되어야 하므로 64까지 줄입니다.

### Interrupt coalescing 끄기

NIC가 *여러 패킷을 모아* IRQ를 한 번에 거는 *coalescing*은 latency를 만듭니다.

```bash
sudo ethtool -C eth0 rx-usecs 0 tx-usecs 0 rx-frames 1 tx-frames 1 \
                    adaptive-rx off adaptive-tx off
```

`rx-usecs 0 / rx-frames 1`이 *프레임마다 즉시 IRQ*입니다.

### Busy poll (선택)

`SO_BUSY_POLL`이나 `napi_busy_read`로 NIC를 *busy-loop polling*하면 IRQ 자체를 없앨 수 있습니다. CPU 비용이 크지만 *jitter 최소*입니다.

```c
int busy_poll = 50; // µs
setsockopt(fd, SOL_SOCKET, SO_BUSY_POLL, &busy_poll, sizeof(busy_poll));
```

EtherCAT 마스터 같은 *전용 thread*에 적합합니다.

### Intel I210 / I225

I210은 PTP timestamping + Qav AVB까지. *TSN(Qbv/Qbu)는 I225부터*입니다.

I225는 *LaunchTime*이라는 *NIC 내장 송신 스케줄러*를 가집니다. 송신 시각을 *NIC에 미리 알리면* 그 시각에 정확히 송신합니다. tc-taprio의 hw offload가 이걸 활용합니다.

NXP LS1021A·LS1028A는 *Cortex-A + 내장 TSN switch*입니다. *enetc·felix* 드라이버가 PTP·Qbv·Qbu를 노출합니다.

```bash
# LS1028A: 내장 스위치 포트 SWP0~SWP3
$ ls /sys/class/net/
eno0  eno1  enp0s0  swp0  swp1  swp2  swp3

# Bridge로 노출
$ ip link add name br0 type bridge
$ ip link set swp0 master br0
```

`swp0~3`이 *완전한 TSN 포트*로 동작합니다.

## EtherCAT IgH — Linux 마스터의 표준

EtherCAT 마스터를 Linux로 구현하는 *de facto 표준*은 *IgH EtherLab Master*입니다. GPL이고 active maintenance입니다.

```bash
git clone https://gitlab.com/etherlab.org/ethercat.git
cd ethercat
./bootstrap
./configure \
    --prefix=/opt/etherlab \
    --enable-generic \
    --enable-igb \
    --with-linux-dir=/lib/modules/$(uname -r)/build
make -j && sudo make modules_install install
sudo depmod
```

`/etc/ethercat.conf`:

```text
MASTER0_DEVICE="00:1B:21:AA:BB:CC"     # 마스터로 쓸 NIC의 MAC
MASTER0_BACKUP=""                       # redundancy NIC (없으면 빈 문자열)
DEVICE_MODULES="generic"                # 또는 "igb" (Intel I210/I225 전용)
UTIL_DIR="/opt/etherlab"
```

`generic` 모듈은 *어떤 NIC에서도* 동작합니다. *추가 패치된 igb*는 더 빠른 send-receive turnaround를 제공하지만, 커널 버전마다 패치 적용 작업이 필요합니다.

서비스 기동:

```bash
sudo systemctl enable --now ethercat
sudo ethercat slaves
```

연결된 슬레이브 목록이 나옵니다.

```text
$ sudo ethercat slaves
0  0:0  PREOP  +  EK1100 EtherCAT Coupler (2A E-Bus)
1  0:1  PREOP  +  EL2008 8K. Dig. Ausgang 24V, 0.5A
2  0:2  PREOP  +  EL1018 8K. Dig. Eingang 24V, 3ms
```

마스터 application은 *userspace에서* `ec_master_open` API로 cyclic process data를 주고받습니다.

```c
#include <ecrt.h>

ec_master_t *master;
ec_domain_t *domain;
ec_slave_config_t *sc;

int main(void) {
    pin_to_cpu(2);

    master = ecrt_request_master(0);
    domain = ecrt_master_create_domain(master);

    sc = ecrt_master_slave_config(master, 0, 1, 0x00000002, 0x07d83052);
    // ... PDO mapping ...

    ecrt_master_activate(master);

    // Cyclic loop
    struct timespec next;
    clock_gettime(CLOCK_MONOTONIC, &next);
    while (running) {
        ecrt_master_receive(master);
        ecrt_domain_process(domain);

        // application logic, update PDOs

        ecrt_domain_queue(domain);
        ecrt_master_send(master);

        next.tv_nsec += 1000000;  // 1 ms cycle
        if (next.tv_nsec >= 1000000000) { next.tv_sec++; next.tv_nsec -= 1000000000; }
        clock_nanosleep(CLOCK_MONOTONIC, TIMER_ABSTIME, &next, NULL);
    }
}
```

`clock_nanosleep`을 *TIMER_ABSTIME*으로 호출하는 게 핵심입니다. 매 사이클이 *절대 시각*에 깨므로 *drift가 누적되지 않습니다*.

## softPLC 생태계

같은 Linux + PREEMPT_RT 위에 *softPLC*가 올라가는 흐름이 커지고 있습니다.

| 제품 | 마스터 | 비고 |
|------|-------|------|
| **CODESYS Runtime** | EtherCAT, PROFINET, Modbus | IEC 61131-3 라이선스 |
| **Bosch ctrlX AUTOMATION** | EtherCAT, OPC UA | Ubuntu 기반, snap 모듈 |
| **B&R APROL** | POWERLINK | 공정 제어 SCADA + softPLC |
| **Phoenix Contact PLCnext** | PROFINET | Linux ARM, C++/IEC 61131 |
| **Beckhoff TwinCAT/BSD** | EtherCAT | FreeBSD 기반, RT는 자체 커널 |

ctrlX·PLCnext가 *오픈 ecosystem* 측면에서 가장 활발합니다. Docker 컨테이너로 제어 application을 배포하는 *IT-style 운영*이 가능해집니다.

## 자주 하는 실수

### "PREEMPT_RT를 켰는데 latency가 그대로"

`CONFIG_PREEMPT_RT=y`만 켜고 *user-space에서 RT 우선순위를 안 준* 경우입니다. `chrt -f 80` 또는 `sched_setscheduler(SCHED_FIFO)`를 *반드시* 호출합니다. 기본 우선순위는 `SCHED_OTHER`(0)라 다른 일반 태스크와 같이 경쟁합니다.

### "isolcpus를 했는데 RT 코어에 다른 프로세스가 보인다"

`isolcpus`는 *스케줄러 default placement*만 막습니다. *명시적으로 affinity를 그 코어로 지정한* 프로세스는 들어옵니다. `systemd-cgroup`이나 `cgroupv2 cpuset`으로 *system slice 전체*를 housekeeping 코어로 묶는 게 더 확실합니다.

### "EtherCAT 마스터가 cyclic 안에서 sleep 누락"

`clock_nanosleep`이 `EINTR`로 깨면 signal로 인터럽트된 것입니다. `while (ret == EINTR)` 루프로 재시도하거나, RT 스레드에서 *signal mask*를 전부 막아 둡니다.

```c
sigset_t set;
sigfillset(&set);
pthread_sigmask(SIG_BLOCK, &set, NULL);
```

### "I225에 LaunchTime을 쓰는데 가끔 미스"

`SO_TXTIME` socket option의 시계를 *CLOCK_TAI*로 잡았는지 확인합니다. CLOCK_REALTIME / CLOCK_MONOTONIC과 섞이면 *수십 µs 어긋남*이 누적됩니다. `ptp4l` + `phc2sys`가 *TAI*로 system 시계를 맞춰야 합니다.

### "cyclictest는 좋은데 실제 app은 jitter가 크다"

cyclictest가 안 측정하는 *application-specific* 원인이 있습니다.

- *Memory allocation* 중에 page fault — `mlockall` 후 *부팅 시 메모리를 미리 touch*합니다.
- *I/O syscall* (`printf`, `fprintf`) 안에 sleep — RT thread에서 *printf 금지*. 별도 thread로 logging.
- *Mutex contention* with non-RT thread — priority inheritance mutex만 사용.

### "softPLC가 잘 돌다가 한 시간에 한 번 spike"

거의 항상 *firmware/microcode update*나 *power management 이벤트*입니다. `dmesg`에서 그 시점을 확인합니다. *SMI(System Management Interrupt)*가 의심되면 BIOS에서 *SMI 출처들*(USB legacy emulation, power button polling 등)을 끕니다.

## 정리

- vanilla Linux의 worst-case latency는 *수 ms*입니다. *모든 단계*에서 결정성을 짜야 µs 단위로 들어옵니다.
- *PREEMPT_RT*는 *Linux 6.12부터 mainline 통합*입니다. *Xenomai 4 / EVL*은 더 극단적 결정성용입니다.
- *isolcpus + nohz_full + rcu_nocbs*가 함께 적용되어야 RT 코어가 *완전 격리*됩니다.
- *IRQ affinity*를 housekeeping 코어로 보내고, *cpuidle·cpufreq*를 끄고, *mlockall*로 page fault를 막습니다.
- *cyclictest*는 *1시간 이상 hackbench 부하 중*에 측정해야 의미가 있습니다. 50µs 이하면 production-ready입니다.
- NIC 튜닝 — *gso/tso off, ring 64, coalescing 0, txqueuelen 0*. Intel I225는 *LaunchTime*으로 TSN 지원.
- *IgH EtherCAT*이 Linux 마스터의 표준입니다. userspace에서 `clock_nanosleep(TIMER_ABSTIME)`이 cyclic의 핵심.
- *softPLC* 생태계 — CODESYS·ctrlX·B&R APROL·Phoenix PLCnext가 모두 PREEMPT_RT 기반.

다음 편이자 시리즈 마지막은 **Ch 12: 비교 분석 — 프로토콜 선택 가이드**입니다.

## 관련 항목

- [Ch 5: EtherCAT Master 구현](/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master)
- [Ch 12: 비교 분석 — 프로토콜 선택 가이드](/blog/embedded/protocols/industrial-ethernet/chapter12-comparison)
- [Practical RTOS Internals Part 5-07: PREEMPT_RT Linux](/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux)
- [Modern Embedded Recipes Part 4-06: IRQ affinity tuning](/blog/embedded/modern-recipes/part7-13-irq-affinity)
- [원문 — IgH EtherLab Master](https://gitlab.com/etherlab.org/ethercat)
- [원문 — Linux PREEMPT_RT wiki](https://wiki.linuxfoundation.org/realtime/)
