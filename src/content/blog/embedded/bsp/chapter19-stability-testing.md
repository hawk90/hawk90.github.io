---
title: "BSP Stability Testing — Stress·Soak·Power Cycle 시나리오"
slug: "embedded/bsp/chapter19-stability-testing"
date: 2026-05-18T09:19:00
description: "양산 BSP의 안정성 검증 — stress 도구, 장기간 soak, thermal 사이클, EMC 영향."
series: "BSP Development"
seriesOrder: 19
tags: [embedded, bsp, stability, stress, soak, testing]
draft: false
topics: ["embedded"]
---

## 한 줄 요약

**짧게 돌려서는 안 보이는 결함이 있습니다.** 드물게 일어나는 결함은 시간, 부하, 온도를 늘려야 드러나므로, 안정성 시험은 이 세 축을 따로 설계합니다.

이 장은 도구 하나하나가 실제로 무엇을 출력하는지를 Debian 13 QEMU guest(4 vCPU, 4 GB, 커널 6.12.116)에서 짧게 돌려 보여 줍니다. guest에서 잰 처리량은 Mac 호스트의 가상 디스크·메모리 값이라 보드의 기준값이 될 수 없습니다. 온도 시험, 전원 차단 반복, 장시간 soak는 실행하지 않았습니다. 시험 시간과 조건은 제품의 신뢰성 계획과 적용 규격에서 정합니다.

## stress-ng — 범용 스트레스 도구

`stress-ng`는 CPU, 메모리, I/O 등 여러 stressor를 가진 부하 도구입니다. 30초짜리 CPU 부하의 결과입니다.

```text
$ stress-ng --cpu 4 --cpu-method matrixprod --timeout 30s --metrics-brief
stress-ng: metrc: [140368] stressor       bogo ops real time  usr time  sys time   bogo ops/s     bogo ops/s
stress-ng: metrc: [140368]                           (secs)    (secs)    (secs)   (real time) (usr+sys time)
stress-ng: metrc: [140368] cpu                8916     30.04     89.91      0.02       296.79          99.14
stress-ng: info:  [140368] passed: 4: cpu (4)
stress-ng: info:  [140368] failed: 0
stress-ng: info:  [140368] successful run completed in 30.06 secs
```

`--metrics-brief`의 `bogo ops/s`는 같은 보드·같은 부하에서 두 빌드를 비교할 때 씁니다. 이 실행의 `usr time`은 89.91초로 4 × 30초보다 적었습니다. 비교용 값은 같은 조건을 맞춰 잽니다.

메모리 부하(`--vm`)는 Ch 5에서 돌렸습니다. `--vm-bytes 50%`가 *가용* 메모리 기준이라 생각보다 작은 영역만 시험한다는 점도 거기서 확인했습니다.

## memtester와 stressapptest — DRAM

`memtester`의 실제 출력은 Ch 5에 있습니다. 출력의 `trying mlock ...locked.`가 보여 주듯 memtester는 자기 프로세스가 할당하고 잠근 영역만 시험합니다. 커널이 쓰는 메모리나 DMA 버퍼 영역은 이 시험 범위 밖입니다.

`stressapptest`는 여러 스레드로 메모리 복사·검증을 돌립니다. 20초 실행의 요약입니다.

```text
$ stressapptest -s 20 -M 256 -m 4
...
Stats: Found 0 hardware incidents
Stats: Completed: 989154.00M in 20.00s 49452.03MB/s, with 0 hardware incidents, 0 errors
Stats: Memory Copy: 989154.00M at 49456.50MB/s
Status: PASS - please verify no corrected errors
```

마지막 줄이 "please verify no corrected errors"라고 말합니다. ECC가 고친 오류는 이 도구의 PASS에 반영되지 않으므로, 아래 EDAC 카운터를 함께 봅니다.

## fio — storage

`fio`로 4 KiB random read와 write를 60초씩 돌렸습니다. job 파일입니다.

```ini
[global]
ioengine=libaio
direct=1
runtime=60
time_based
group_reporting
filename=/root/fio-test.dat
size=100M
bs=4k
iodepth=16

[randread]
rw=randread

[randwrite]
stonewall
rw=randwrite
```

```text
$ fio random-rw.fio
randread: (groupid=0, jobs=1): err= 0: pid=140442: Mon Nov 16 08:35:41 2026
  read: IOPS=86.6k, BW=338MiB/s (355MB/s)(19.8GiB/60001msec)
     lat (usec): min=27, max=14468, avg=184.44, stdev=79.77
randwrite: (groupid=1, jobs=1): err= 0: pid=140444: Mon Nov 16 08:35:41 2026
  write: IOPS=74.8k, BW=292MiB/s (306MB/s)(17.1GiB/60001msec); 0 zone resets
     lat (usec): min=24, max=54228, avg=213.46, stdev=204.53
```

이 값은 Mac 호스트의 SSD 위 qcow2 파일이므로 eMMC나 SD의 값과 관계가 없습니다. 보드에서는 같은 job 파일을 처음과 soak 뒤에 돌려 IOPS와 지연의 최댓값(`max`)이 어떻게 변하는지를 봅니다. `stonewall`이 없으면 두 job이 동시에 돌아 read와 write 수치가 섞입니다.

## iperf3 — 네트워크

네트워크가 있는 보드라면 호스트에 서버(`iperf3 -s`)를 띄우고 보드에서 클라이언트를 돌립니다. 옵션은 Debian 13의 `iperf3(1)`에 있습니다(`-c` client, `-t` 시간, `-b` bitrate, `-u` UDP).

```bash
iperf3 -c 10.0.0.1 -t 3600 -b 1G --json > iperf-stress.json
iperf3 -c 10.0.0.1 -u -b 100M -t 600
```

UDP 모드는 손실률을 직접 보고합니다. 이 글은 보드 네트워크가 없어 iperf3를 실행하지 않았습니다.

## 종합 부하 (random load mix)

여러 도구를 무작위로 섞어 돌리는 스크립트의 예입니다(실행하지 않았습니다).

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

## Soak test 설계

soak는 오래 돌려야 보이는 결함을 잡습니다. 시험 시간은 제품 위험 분석과 적용 규격으로 정하고, 이 글은 특정 시간을 권하지 않습니다. 구성 요소는 부하 생성기, dmesg 감시, 온도 기록, watchdog(Ch 14)입니다.

dmesg 감시 스크립트를 guest에서 돌리고 `/dev/kmsg`로 가짜 경고 한 줄과 무해한 줄 한 줄을 넣어 봤습니다.

```bash
#!/bin/bash
# dmesg-watcher.sh
PATTERNS=(
    "Kernel panic"
    "BUG:"
    "WARNING:"
    "soft lockup"
    "detected stalls"
    "Out of memory"
)
PATTERN=$(printf "|%s" "${PATTERNS[@]}")
PATTERN=${PATTERN:1}
dmesg -w | grep --line-buffered -E "$PATTERN" | while read LINE; do
    echo "$(date -Iseconds) $LINE" >> /var/log/soak-alerts.log
done
```

```text
$ echo "<4>WARNING: injected by soak test" > /dev/kmsg
$ echo "<6>harmless line" > /dev/kmsg
$ cat /var/log/soak-alerts.log
2026-11-16T08:38:16+00:00 [ 4138.860354] WARNING: injected by soak test
```

경고 줄만 기록됐습니다. RCU stall 패턴을 `rcu_sched detected stalls`가 아니라 `detected stalls`로 둔 것은, 커널이 `INFO: %s detected stalls on CPUs/tasks:`(`kernel/rcu/tree_stall.h:620`)의 `%s`에 RCU flavor 이름을 넣기 때문입니다. `CONFIG_PREEMPT_RCU`면 `rcu_preempt`, 아니면 `rcu_sched`입니다(`kernel/rcu/tree.h:453-458`). Ch 8의 `defconfig`는 `CONFIG_PREEMPT=y`라 `rcu_preempt`가 찍힙니다. 같은 스크립트에서 `--line-buffered`만 빼고 다시 해 보면, 경고를 넣고 3초 뒤에도, 스크립트가 8초 timeout으로 끝난 뒤에도 로그 파일이 생기지 않았습니다. grep의 출력이 파이프 뒤 `while read`에 바로 전달되지 않은 것입니다. 감시 스크립트에는 이 옵션이 필요합니다. PCIe 오류를 감시하려면 커널이 찍는 `PCIe Bus Error: severity=...` 문자열(`drivers/pci/pcie/aer.c:717`)을 패턴에 더합니다.

온도 기록은 `/sys/class/thermal/thermal_zone*/temp`(밀리도)를 주기적으로 파일에 남기는 방식입니다(Ch 14). 이 guest에는 thermal zone이 없어 실행하지 않았습니다.

## Thermal cycling과 전원 차단 반복

온도를 오가며 시험하는 thermal cycling과, 전원을 반복해서 끊는 시험은 보드와 장비(온도 챔버, 원격 전원 스위치)가 있어야 해서 이 글에서는 하지 않았습니다. 시험 조건(온도 범위, 유지 시간, 반복 수)은 적용하는 규격에서 가져옵니다. 이 글은 그런 규격 문서를 인용하지 않았으므로 숫자를 제시하지 않습니다.

전원 차단 반복 스크립트의 뼈대는 다음과 같습니다. `pdu_off`/`pdu_on`은 쓰는 전원 스위치의 명령으로 바꿉니다.

```bash
while true; do
    pdu_off relay1
    sleep $((RANDOM % 10 + 2))
    pdu_on relay1
    until ping -c 1 -W 2 $TARGET_IP; do sleep 1; done
    ssh target "cat /proc/uptime; dmesg | grep -E 'BUG|panic|error'"
    sleep $((RANDOM % 60 + 30))
done
```

Ch 10에서 watchdog으로 강제 종료된 디스크를 다시 부팅하자 `EXT4-fs (vda1): INFO: recovery required on readonly filesystem`이 찍혔습니다. 전원 차단 시험에서는 이런 줄을 모두 기록해 둡니다.

## kdump — 커널 패닉 캡처

soak 중 panic이 나면 원인을 남겨야 합니다. kdump는 panic 시점의 메모리를 두 번째 커널이 `/proc/vmcore`로 읽어 저장하는 방식입니다. 필요한 커널 설정은 Debian 13 커널에 모두 켜져 있었습니다.

```text
$ grep -E "^CONFIG_(KEXEC|CRASH_DUMP|PROC_VMCORE)=" /boot/config-6.12.116+deb13-arm64
CONFIG_KEXEC=y
CONFIG_CRASH_DUMP=y
CONFIG_PROC_VMCORE=y
```

예약 메모리는 커널 인자 `crashkernel=`로 잡고, capture 커널은 `kexec -p`로 미리 올립니다. 전체 절차는 `Documentation/admin-guide/kdump/kdump.rst`에 있고, 이 글에서는 kdump를 실행하지 않았습니다. 수집한 vmcore는 같은 빌드의 `vmlinux`와 함께 `crash` 도구로 엽니다. Ch 8의 빌드에서 남긴 `vmlinux`가 이때 필요합니다.

## ECC와 EDAC

ECC가 고친 오류는 시스템이 계속 돌아가므로 눈에 띄지 않습니다. 커널 EDAC은 이것을 `/sys/devices/system/edac/mc/mc0/ce_count` 같은 카운터로 남깁니다(`Documentation/admin-guide/RAS/main.rst:446-454`). guest에도 `/sys/devices/system/edac/mc` 디렉터리는 있었지만 메모리 컨트롤러가 등록되어 있지 않았습니다. soak 동안 이 카운터를 주기적으로 기록합니다.

## 회귀 감시 자동화

같은 시험을 release마다 돌리려면 CI에 단계를 나눠 둡니다. 아래는 GitLab CI 형식의 뼈대이고, `flash_target`·`run_test`는 쓰는 보드 farm의 명령으로 바꿉니다.

```yaml
stages:
  - build
  - smoke-test
  - stress
  - soak

smoke-test:
  stage: smoke-test
  script:
    - flash_target $BUILD_IMG
    - run_test boot.yaml
    - run_test smoke.yaml

stress-1h:
  stage: stress
  script:
    - flash_target $BUILD_IMG
    - run_test stress-1h.yaml
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

긴 soak는 매 commit이 아니라 release 후보(tag)에만 돌리도록 나눴습니다.

## 자주 하는 실수

**비교 기준 없이 수치만 기록.** `bogo ops/s`나 fio IOPS는 같은 보드·같은 조건의 이전 값과 비교할 때만 의미가 있습니다. 이 장의 guest 수치는 기준값으로 쓸 수 없습니다.

**dmesg 감시 패턴 누락.** AER 오류는 `PCIe Bus Error`로 찍힙니다. 대소문자를 구분하는 `grep`에 `error`만 넣으면 잡히지 않습니다.

**EDAC 카운터 미확인.** stressapptest가 PASS여도 "please verify no corrected errors"라는 경고 그대로, corrected error는 따로 봐야 합니다.

**memtester만으로 메모리 OK 판정.** memtester는 자기 버퍼만 시험합니다.

**watchdog 없이 soak.** 멈춘 채로 발견되면 그 사이 기록이 없습니다. Ch 14의 watchdog을 켜 둡니다.

## 정리

- 안정성 시험은 시간·부하·온도 세 축이고, 시험 시간과 조건은 제품 규격에서 정합니다.
- stress-ng, stressapptest, fio의 출력 형식과 읽는 법을 guest에서 확인했고, 수치 자체는 보드 기준이 아닙니다.
- stressapptest의 PASS는 ECC가 고친 오류를 포함하지 않으므로 EDAC `ce_count`를 함께 봅니다.
- dmesg 감시는 `grep --line-buffered`로 실시간 기록되고, AER는 `PCIe Bus Error` 문자열로 잡습니다.
- kdump에 필요한 `CONFIG_KEXEC`, `CONFIG_CRASH_DUMP`, `CONFIG_PROC_VMCORE`는 Debian 13 커널에 켜져 있었습니다.

## 다음 편 예고

[Ch 20: 양산 환경](/blog/embedded/bsp/chapter20-production)에서는 BSP를 양산 line으로 옮기는 단계를 다룹니다. CI/CD, 재현 가능 빌드, 코드 서명, 키 관리, 양산 line의 flash 도구가 주제입니다.

## 관련 항목

- [Ch 18: OTA와 field recovery](/blog/embedded/bsp/chapter18-ota-recovery) — 안정성 실패 시 복구
- [Ch 20: 양산 환경](/blog/embedded/bsp/chapter20-production) — CI 자동화의 다음 단계
- [Ch 14: Thermal과 watchdog](/blog/embedded/bsp/chapter14-thermal-watchdog) — soak 중 멈춤을 끊는 watchdog
- [Modern Embedded Recipes — Stress recipes](/blog/embedded/modern-recipes/00-preface) — recipe 묶음
- [PCIe Ch 16: Troubleshooting](/blog/embedded/hardware/pcie/chapter16-troubleshooting) — soak 중 dmesg에 쌓이는 AER CE 폭주를 증상부터 추적하는 시나리오
