---
title: "BSP Stability Testing — Stress·Soak·Power Cycle 시나리오"
date: 2026-05-18T09:19:00
description: "양산 BSP의 안정성 검증 — stress 도구, 장기간 soak, thermal 사이클, EMC 영향."
series: "BSP Development"
seriesOrder: 19
tags: [embedded, bsp, stability, stress, soak, testing]
draft: false
---

## 한 줄 요약

**24시간 booting 하는 BSP와 1년 booting 하는 BSP는 다릅니다.** 통계적으로 드물게 발생하는 결함은 *시간 × 부하 × 환경*의 곱으로 노출됩니다.

stress test는 1시간만 돌려도 잡히는 결함을 노출합니다. soak test는 168시간 누적해야 보이는 결함을 노출합니다. thermal cycle은 −40°C와 +85°C를 왕복할 때만 나타나는 솔더 균열, DRAM marginality, voltage regulator 안정성 같은 것들을 잡습니다. 양산 BSP라면 이 세 layer를 모두 통과해야 합니다.

이번 글은 stress 도구의 실전 사용법, soak test 설계, thermal cycling, 그리고 회귀 감시 자동화를 다룹니다.

## stress-ng — 범용 스트레스 도구

`stress-ng`는 Linux의 표준 stress 도구입니다. 70여 stressor가 있고 CPU, memory, IO, syscall 거의 모든 영역을 부하시킬 수 있습니다.

```bash
# 4 CPU 모두 100% load, 30분
$ stress-ng --cpu 4 --cpu-method matrixprod --timeout 30m --metrics-brief

# memory bandwidth - 512MB × 8 worker
$ stress-ng --vm 8 --vm-bytes 512M --timeout 1h --metrics-brief

# 종합 - CPU + memory + IO + scheduler 동시
$ stress-ng --cpu 4 --io 2 --vm 2 --vm-bytes 256M \
    --hdd 2 --hdd-bytes 100M \
    --timeout 24h --metrics-brief --log-file stress.log
```

`--metrics-brief`는 stressor별 처리량을 출력합니다. 같은 부하를 두 빌드에서 돌려 비교하면 성능 회귀를 잡습니다.

`stress-ng --class cpu --sequential 0 -t 1h`는 *모든 CPU stressor*를 한 시간씩 차례로 돌립니다. SoC의 특정 instruction에 marginality가 있으면 그 stressor에서 lockup이 발생합니다.

## memtester — DRAM marginality

`memtester`는 *DRAM 그 자체*에 집중합니다. 패턴 기반 read-write로 bit-flip을 잡습니다.

```bash
$ sudo memtester 512M 5
memtester version 4.5.1
pagesize is 4096
pagesizemask is 0xfffffffffffff000
want 512MB (536870912 bytes)
got  512MB (536870912 bytes), trying mlock ...locked.
Loop 1/5:
  Stuck Address       : ok
  Random Value        : ok
  Compare XOR         : ok
  Compare SUB         : ok
  ...
  Bit Flip            : ok
  Walking Ones        : ok
  Walking Zeroes      : ok
  8-bit Writes        : ok
  16-bit Writes       : ok
```

DRAM 결함은 *온도*와 강하게 상관됩니다. memtester는 thermal chamber에서 ambient를 변화시키며 돌리는 것이 의미 있습니다. 같은 BSP가 +25°C에서 ok, +70°C에서 bit-flip이 나면 DRAM controller setting을 다시 봐야 합니다(read leveling, write leveling, on-die termination).

`stressapptest`는 Google이 만든 더 무거운 도구입니다. cache 비활성화, large page 같은 옵션을 제공해 DRAM 자체에 더 가깝게 부하를 줍니다.

```bash
$ stressapptest -s 3600 -M 512 -m 4 -l results.txt
```

## fio — storage 안정성

eMMC와 SD 카드는 셀 마모와 wear-leveling 알고리즘이 *수명*에 결정적입니다. `fio`로 IO 패턴을 시뮬레이션해 throughput과 latency를 측정합니다.

```text
# random-rw.fio
[global]
ioengine=libaio
direct=1
runtime=600
group_reporting

[randread]
filename=/dev/mmcblk0
rw=randread
bs=4k
iodepth=16

[randwrite]
filename=/dev/mmcblk0p4
rw=randwrite
bs=4k
iodepth=16
```

```bash
$ fio random-rw.fio
randread: (groupid=0, jobs=1): err= 0: pid=...
   read: IOPS=2856, BW=11.2MiB/s (11.7MB/s)(6705MiB/600003msec)
    clat (usec): min=120, max=12345, avg=2456.78, stdev=1234.56
```

장기 soak에서는 *throughput 저하 패턴*을 본다. 처음 1시간 11MB/s가 24시간 후 5MB/s로 떨어지면 wear가 progressed 한 것입니다. eMMC vendor마다 garbage collection 동작이 다르므로 BSP가 선택한 eMMC가 사용 패턴을 견디는지 확인해야 합니다.

## iperf3 — 네트워크

네트워크가 있는 보드라면 throughput과 packet loss를 stress 합니다.

```bash
# 서버 측 (host PC)
$ iperf3 -s

# target 보드
$ iperf3 -c 10.0.0.1 -t 3600 -b 1G --json > iperf-stress.json
```

`-t 3600`은 1시간. 장기 soak에서는 throughput drop이나 ETIMEDOUT/EHOSTUNREACH를 모니터링합니다. PHY/MAC marginality는 *온도가 올라간 후* 또는 *오래 운영 후*에만 나타나는 경우가 많습니다.

UDP 모드(`-u`)는 packet loss를 직접 측정합니다.

```bash
$ iperf3 -c 10.0.0.1 -u -b 100M -t 600
```

## 종합 부하 (random load mix)

실 사용에 가까운 부하는 *여러 도구가 동시에 무작위 mix*로 돌아갈 때입니다.

```bash
#!/bin/bash
# random-stress.sh
while true; do
    SCENARIO=$((RANDOM % 4))
    case $SCENARIO in
        0) stress-ng --cpu 4 -t 5m ;;
        1) stress-ng --vm 4 --vm-bytes 256M -t 5m ;;
        2) fio --name=load --filename=/data/test --bs=4k --rw=randrw \
              --runtime=300 --size=100M --direct=1 ;;
        3) iperf3 -c 10.0.0.1 -t 300 ;;
    esac
    sleep $((RANDOM % 60))
done
```

168시간(1주일) 이상 돌리며 dmesg의 oops, lockup, soft-reset을 모니터링합니다.

## Soak test 설계

soak는 *오래 돌리면 보이는 결함*을 잡습니다. 자동차 AEC-Q104는 1000시간 soak를 요구합니다. 산업용 보드는 보통 168시간(1주일) 또는 720시간(30일)으로 잡습니다.

soak 구성 요소:

- 부하 generator (`random-stress.sh`)
- dmesg watcher
- thermal monitor
- voltage monitor
- watchdog
- regression detector

dmesg watcher 예입니다.

```bash
#!/bin/bash
# dmesg-watcher.sh - critical 메시지 감지 후 alert
PATTERNS=(
    "Kernel panic"
    "BUG:"
    "WARNING:"
    "soft lockup"
    "rcu_sched detected stalls"
    "MMC error"
    "PCIe error"
    "EDAC.*error"
    "Out of memory"
)

PATTERN=$(printf "|%s" "${PATTERNS[@]}")
PATTERN=${PATTERN:1}

dmesg -w | grep -E "$PATTERN" | while read LINE; do
    echo "$(date -Iseconds) $LINE" >> /var/log/soak-alerts.log
    # alert via MQTT, syslog, ...
done
```

thermal monitor:

```bash
$ while true; do
    cat /sys/class/thermal/thermal_zone*/temp | \
        awk '{print strftime("%Y-%m-%dT%H:%M:%S"), $1/1000}' \
        >> /var/log/thermal.csv
    sleep 10
done
```

연속 168시간 후 thermal.csv를 plot 하면 평균/peak/95p가 나옵니다. 처음 24시간과 마지막 24시간의 분포가 다르면 thermal compound 열화나 fan 마모가 의심됩니다.

## Thermal cycling

stress test가 *시간 축*이라면 thermal cycle은 *온도 축*입니다. 환경 챔버(environmental chamber)에서 −40°C와 +85°C를 cycling 합니다.

표준 cycle (산업용):

- −40°C에서 1시간 유지
- 1시간에 걸쳐 +85°C로 ramp
- +85°C에서 1시간 유지
- 1시간에 걸쳐 −40°C로 ramp
- 한 cycle = 4시간
- 250 cycle = 1000시간 = 약 6주

cycle 중 보드는 powered-on이고 일정 부하가 걸려 있어야 합니다. 각 cycle에서 dmesg, voltage, 부팅 시간을 기록합니다.

검출 가능한 결함:

- 솔더 균열 (특히 BGA edge)
- DRAM marginality (warm side)
- Voltage regulator drift (cold side)
- Crystal oscillator drift
- PCB 휨에 의한 connector 접촉 불량

자동차/항공/방산 BSP라면 thermal cycling은 *필수*입니다. 가전이라면 short cycle (0~50°C × 100 cycle)로 축약하는 것이 보통입니다.

## 랜덤 리부트 테스트

power cycle 자체가 stress입니다. boot 중에 voltage rail이 정착되지 않으면 NAND가 corrupt 되거나 RTC가 reset 됩니다.

```bash
# power-cycle.sh - smart PDU와 연결
while true; do
    pdu_off relay1
    sleep $((RANDOM % 10 + 2))
    pdu_on relay1
    # wait for boot
    until ping -c 1 -W 2 $TARGET_IP; do sleep 1; done
    # validate
    ssh target "cat /proc/uptime; dmesg | grep -E 'BUG|panic|error'"
    sleep $((RANDOM % 60 + 30))
done
```

1000회 power cycle 후에도 한 번도 fail 하지 않으면 ok. 한 번이라도 fail 하면 *모든 1000회 데이터*를 확인해 어떤 패턴인지 찾습니다(상관 시간, 직전 동작, 온도).

## kdump — 커널 패닉 캡처

soak 중 panic이 나면 *왜 났는지* 알아야 합니다. kdump는 panic 시점의 메모리를 capture 합니다.

```text
# kernel config
CONFIG_KEXEC=y
CONFIG_CRASH_DUMP=y
CONFIG_PROC_VMCORE=y
```

```bash
# crashkernel 메모리 예약
# kernel cmdline에 추가
crashkernel=64M

# kexec로 capture kernel 로드
$ kexec -p /boot/vmlinuz-capture \
    --initrd=/boot/initramfs-capture.img \
    --append="root=PARTUUID=... init=/sbin/crash-handler"
```

panic 시 capture kernel이 부팅되어 `/proc/vmcore`를 떠 storage로 dump 합니다. crash-handler 스크립트가 압축 후 USB/network로 회수합니다.

```bash
#!/bin/sh
# /sbin/crash-handler (capture kernel 측)
mount -t tmpfs none /mnt
cp /proc/vmcore /mnt/vmcore-$(date +%s)
gzip /mnt/vmcore-*
# upload
curl -F "file=@/mnt/vmcore-*.gz" http://crash-server/upload
reboot -f
```

이렇게 모인 vmcore를 host에서 `crash` 도구로 분석합니다.

```bash
$ crash vmlinux vmcore-1234567890
crash> bt        # backtrace
crash> log       # 직전 dmesg
crash> ps        # process 목록
```

## 회귀 감시 자동화

stress가 매 release에서 통과해야 한다는 보장은 *자동화*에서 옵니다. CI에 stress matrix를 둡니다.

```yaml
# .gitlab-ci.yml 발췌
stages:
  - build
  - smoke-test
  - stress
  - soak

smoke-test:
  stage: smoke-test
  script:
    - flash_target $BUILD_IMG
    - run_test boot.yaml         # boot 시간 검증
    - run_test smoke.yaml        # 기본 기능

stress-1h:
  stage: stress
  script:
    - flash_target $BUILD_IMG
    - run_test stress-1h.yaml    # stress-ng 1시간
  timeout: 90m

soak-72h:
  stage: soak
  only:
    - tags
  script:
    - flash_target $BUILD_IMG
    - run_test soak-72h.yaml
  timeout: 80h
```

72시간 soak를 매 commit에 돌릴 수는 없습니다. tag(release candidate)에만 돌리는 것이 보통입니다.

## 자주 하는 실수

**hot end만 보고 cold end 무시.** thermal margin은 양쪽 다 봐야 합니다. cold에서 silicon clock이 늦어 부팅이 실패하는 경우가 있습니다.

**stress 중 fan/heatsink만 차이.** stress 결과가 좋은데 양산이 다른 fan을 쓰면 의미 없습니다. 양산 setup 그대로 stress.

**dmesg 모니터링 누락.** stress가 통과해도 dmesg에 ECC error나 PCIe AER가 찍혀 있으면 잠재적 결함. grep -E "error|fault|fail"로 매일 확인.

**ECC enabled but counter not checked.** DDR4/LPDDR4 ECC가 켜져 있어도 EDAC counter를 안 보면 실시간으로 단일 bit error가 흐르는 줄 모릅니다. `/sys/devices/system/edac/mc/mc0/ce_count`.

**memtester만 돌리고 memory ok 판단.** memtester는 user space에서 mlock으로 lock 한 영역만 testing 합니다. kernel allocated 영역과 DMA buffer는 안 봅니다. stressapptest나 stress-ng의 다양한 stressor를 같이.

**Watchdog 없이 soak.** soak 중 lockup 되어 24시간 그대로 죽어 있는 상태로 발견되면 data 손실. hardware watchdog과 software watchdog 모두 운영.

## 정리

- stress test는 *시간 축*, soak는 *누적 축*, thermal cycling은 *환경 축*입니다. 양산 BSP는 세 가지 모두 통과해야 합니다.
- stress-ng는 표준 도구입니다. CPU, memory, IO, scheduler 거의 모든 영역을 부하시킬 수 있습니다.
- memtester와 stressapptest는 DRAM 안정성, fio는 storage, iperf3는 네트워크 stress의 표준입니다.
- soak test에는 부하 generator + dmesg watcher + thermal monitor + voltage monitor가 함께 들어가야 합니다.
- thermal cycling은 솔더, DRAM marginality, voltage regulator drift를 잡는 유일한 방법입니다. 자동차/항공/방산은 필수.
- 1000회 random power cycle은 부팅 robustness의 기본 지표입니다.
- kdump로 panic 시점 메모리를 capture 해 host에서 `crash`로 분석합니다.
- 자동화된 회귀 감시(smoke → stress 1h → soak 72h)를 CI 단계로 분리해 매 release를 통과시킵니다.

## 다음 편 예고

[Ch 20: 양산 환경](/blog/embedded/bsp/chapter20-production)에서는 BSP를 양산 line으로 옮기는 단계를 다룹니다. CI/CD, 재현 가능 빌드, 코드 서명, 키 관리, 양산 line의 flash 도구가 주제입니다.

## 관련 항목

- [Ch 18: OTA와 field recovery](/blog/embedded/bsp/chapter18-ota-recovery) — 안정성 실패 시 복구
- [Ch 20: 양산 환경](/blog/embedded/bsp/chapter20-production) — CI 자동화의 다음 단계
- [Ch 14: 디버깅 도구](/blog/embedded/bsp/chapter14-debugging-tools) — kdump와 crash 분석
- [Modern Embedded Recipes — Stress recipes](/blog/embedded/modern-recipes/) — recipe 묶음
