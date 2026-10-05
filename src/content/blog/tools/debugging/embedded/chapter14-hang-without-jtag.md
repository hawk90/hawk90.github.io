---
title: "JTAG 없이 Hang 잡기 — postcode·GPIO·watchdog·버스 timeout"
slug: "tools/debugging/embedded/chapter14-hang-without-jtag"
date: 2026-10-05T10:14:00
description: "디버거를 쓸 수 없는 상황에서 postcode·GPIO 토글·scratch 레지스터·watchdog·인터커넥트 timeout으로 hang 위치를 찾는 법."
series: "Embedded Debugging"
seriesOrder: 14
tags: [hang, watchdog, postcode, bus-timeout, debugging]
draft: true
topics: ["tools", "tools/debugging"]
---

디버거가 붙지 않거나, 붙이는 순간 증상이 사라지는 hang이 있습니다. 이럴 때는 칩이 스스로 흔적을 남기게 만들어야 합니다. hang(소프트웨어나 하드웨어가 멈춰서 더 이상 진행하지 않는 상태)은 크래시보다 다루기 어렵습니다. 크래시는 예외 핸들러가 레지스터를 덤프하며 마지막 말을 남기지만, hang은 아무 말 없이 멈추기 때문입니다.

이 장의 기법들은 Driver-RTL Co-simulation [Ch 16](/blog/tools/emulation/driver-cosim/chapter16-pre-to-post-handoff)에서 테이프아웃 전에 심어 두자고 했던 디버그 훅을 실리콘에서 실제로 쓰는 방법입니다. watchdog 드라이버 자체의 설정은 [BSP Development Ch 14](/blog/embedded/bsp/chapter14-thermal-watchdog)에서, 필드에서 크래시 기록을 모으는 방법은 [Modern Embedded Recipes의 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis)에서 다뤘습니다. 여기서는 bring-up 단계에서 *멈춘 위치를 찾는 일*에 집중합니다.

## 디버거를 쓸 수 없는 상황

디버거는 가장 강력한 도구지만, 쓸 수 없는 상황이 생각보다 많습니다. Ch 13에서 본 것처럼 디버그 인증이 잠겨 있거나, 디버그 전원 도메인이 꺼져 있을 수 있습니다. 양산 보드라면 JTAG 커넥터 자체가 없습니다. 그리고 가장 골치 아픈 경우로, 디버거를 붙이면 타이밍이 바뀌어 증상이 사라지는 버그가 있습니다. 관찰하려는 순간 사라지는 이런 버그를 업계에서는 하이젠버그(heisenbug)라고 부릅니다.

이럴 때 쓸 수 있는 도구는 칩이 *스스로* 남기는 흔적뿐입니다. 숲에서 길을 잃을까 봐 빵 부스러기를 떨어뜨리며 걷는 동화처럼, 코드가 지나가는 길마다 표시를 남기게 만듭니다. 표시를 남기는 방법은 크게 네 가지입니다.

| 방법 | 남기는 곳 | 리셋 후에도 남나 | 필요한 장비 |
|---|---|---|---|
| postcode | scratch 레지스터 | 남음 (always-on 영역일 때) | 없음 (재부팅 후 읽기) |
| GPIO 토글 | 핀 전압 | 남지 않음 (실시간 관찰) | 스코프, 로직 분석기 |
| 메모리 로그 | DDR의 예약 영역 | 조건부 (웜 리셋에서 DDR 내용이 유지될 때) | 없음 |
| 버스 timeout 기록 | 인터커넥트 에러 레지스터 | 칩 설계에 따라 다름 | 없음 |

## postcode와 GPIO 토글

**postcode**는 코드의 주요 단계마다 정해진 번호를 레지스터에 써 두는 방식입니다. PC에서는 BIOS가 부팅 단계마다 I/O 포트 0x80에 POST 코드를 쓰고, 이 값을 표시하는 POST 카드로 어느 단계에서 멈췄는지 확인해 왔습니다. SoC에서는 이 역할을 scratch 레지스터(값을 써 두었다가 나중에 읽어 보는 빈 레지스터)가 맡습니다.

![postcode가 남기는 발자국 — 단계마다 번호를 남기고, watchdog 리셋 뒤 마지막 번호를 읽어 멈춘 범위를 좁힌다](/images/blog/debugging/embedded/diagrams/ch14-postcode-trail.svg)

postcode의 장점은 비용이 거의 없다는 점입니다. 레지스터 쓰기 한 번이라 타이밍에 주는 영향도 작아서, 하이젠버그에도 비교적 안전합니다. 번호는 큰 단계(0x0100, 0x0200, ...)와 그 안의 작은 단계(0x0310, 0x0320, ...)로 나눠 두면, 처음에는 큰 단계로 범위를 잡고 나중에 작은 단계로 좁힐 수 있습니다.

**GPIO 토글**은 실시간 관찰용입니다. 코드의 특정 지점에서 GPIO 핀을 올렸다 내리면, 스코프나 로직 분석기로 그 지점을 언제 지나갔는지 볼 수 있습니다. 핀이 두세 개만 있어도 여러 지점을 구분할 수 있습니다. 아래 코드는 핀 하나로 단계 번호를 펄스 개수로 내보내는 예시입니다. 스코프에서 펄스를 세면 어느 단계까지 왔는지 알 수 있습니다.

```c
/* GPIO 레지스터 주소와 핀 번호는 예시 */
#define GPIO_SET   (*(volatile uint32_t *)0x40020018u)
#define GPIO_CLR   (*(volatile uint32_t *)0x4002001Cu)
#define DBG_PIN    (1u << 7)

static void short_delay(void) { for (volatile int i = 0; i < 200; i++) { } }

/* 단계 번호 n을 펄스 n개로 내보낸다. 펄스 묶음 사이는 긴 간격 */
void gpio_mark(unsigned n)
{
    for (unsigned i = 0; i < n; i++) {
        GPIO_SET = DBG_PIN; short_delay();
        GPIO_CLR = DBG_PIN; short_delay();
    }
    for (volatile int i = 0; i < 2000; i++) { }
}
```

GPIO 토글은 시간 정보까지 준다는 장점이 있습니다. 두 지점 사이 간격을 재면 어느 구간이 비정상적으로 오래 걸리는지 보입니다. 반대로 리셋되면 기록이 사라지므로, 멈추는 순간에 스코프가 지켜보고 있어야 합니다. 스코프를 single 트리거 모드로 두고 마지막 펄스 묶음을 잡는 방식을 많이 씁니다.

## 리셋을 견디는 scratch 레지스터

postcode가 진가를 발휘하려면 값이 **리셋을 견뎌야** 합니다. hang은 대개 watchdog 리셋으로 끝나는데, 리셋과 함께 postcode가 지워지면 아무것도 남지 않습니다. 그래서 scratch 레지스터는 두 조건을 갖춰야 합니다. 항상 켜진 전원 영역(always-on domain)에 있어야 하고, 웜 리셋(전원은 유지한 채 칩만 다시 시작하는 리셋)에 지워지지 않아야 합니다.

칩 문서에서 이런 레지스터를 찾을 때는 "리셋 값"과 "리셋 도메인" 표기를 봅니다. 콜드 리셋(전원을 완전히 껐다 켜는 리셋)에서만 초기화된다고 적힌 레지스터가 후보입니다. 그런 레지스터가 없다면 RTC 블록의 백업 레지스터나 PMIC의 범용 레지스터가 대안이 되기도 합니다.

리셋 뒤 첫 부트 코드에서는 이전 부팅의 postcode를 읽어 출력하고, 상위 비트에 연속 리셋 횟수를 세어 두면 리셋 루프 여부도 함께 알 수 있습니다. 이 패턴은 Co-simulation Ch 16의 "작은 예시"에서 코드로 보였습니다.

리눅스까지 올라온 뒤라면 같은 발상을 커널 차원에서 쓸 수 있습니다. 리눅스의 ramoops(pstore의 백엔드로, 예약한 RAM 영역에 커널 로그를 남기는 기능)는 패닉이나 리셋 직전의 커널 로그를 메모리에 남기고, 재부팅 뒤 `/sys/fs/pstore/` 아래 파일로 보여 줍니다. 아래는 Device Tree에서 ramoops 영역을 예약하는 예시입니다. 주소와 크기는 보드의 메모리 배치에 맞게 정해야 합니다.

```text
reserved-memory {
    #address-cells = <2>;
    #size-cells = <2>;
    ranges;

    ramoops@8f000000 {
        compatible = "ramoops";
        reg = <0x0 0x8f000000 0x0 0x100000>;
        record-size = <0x20000>;
        console-size = <0x20000>;
    };
};
```

ramoops는 웜 리셋에서 DDR 내용이 유지된다는 가정 위에서 동작합니다. 리셋 뒤 부트로더가 DDR을 다시 초기화하면서 내용을 지우는 칩이라면 기록이 남지 않으니, bring-up 초기에 실제로 남는지 한 번 확인해 둡니다.

## watchdog으로 hang을 리셋으로 바꾸기

watchdog(정해진 시간 안에 소프트웨어가 신호를 주지 않으면 칩을 리셋하는 타이머)은 hang을 끝내는 장치입니다. 소프트웨어가 주기적으로 watchdog을 "쓰다듬어"(kick) 주지 않으면 시간이 다 됐을 때 리셋이 걸립니다. 경비원이 일정 시간마다 순찰 버튼을 누르지 않으면 경보가 울리는 장치와 같습니다.

bring-up에서 watchdog의 역할은 단순히 칩을 되살리는 것보다 크습니다. hang을 리셋으로 바꾸면 **리셋 원인 레지스터**에 "watchdog"이 기록되고, 앞의 postcode와 합치면 "어디서 멈췄고 watchdog이 리셋했다"는 완전한 기록이 됩니다. 리셋 원인 레지스터는 Ch 11에서 다뤘습니다.

몇몇 watchdog은 리셋 전에 인터럽트를 먼저 보내는 **pre-timeout** 기능을 갖고 있습니다. 이 인터럽트 핸들러에서 레지스터나 스택 일부를 scratch 영역에 남기면, 리셋 직전의 상태를 조금 더 얻을 수 있습니다. 리눅스 커널에도 소프트웨어 차원의 감시 장치가 있습니다. softlockup 감지기(한 CPU가 오랫동안 스케줄링을 양보하지 않으면 경고)와 hardlockup 감지기(인터럽트까지 막힌 채 멈추면 NMI 같은 별도 경로로 감지)가 그것이고, 이 경고 메시지가 ramoops에 남으면 hang의 위치를 알려 주는 단서가 됩니다.

## 버스 hang과 인터커넥트 timeout

가장 까다로운 hang은 **버스 hang**입니다. CPU가 어떤 주소를 읽으려 했는데, 그 주소의 장치가 클럭이 꺼져 있거나 전원이 내려가 있으면 응답이 영영 오지 않습니다. CPU는 응답을 기다리며 그 자리에 멈추고, 인터럽트도 처리하지 못합니다. 이 상태에서는 디버거조차 그 CPU를 멈추지 못하는 경우가 많습니다.

![버스 hang — 클럭이 꺼진 주변 장치는 응답하지 않고 CPU는 계속 기다린다. timeout 모니터가 있으면 에러 응답으로 바뀐다](/images/blog/debugging/embedded/diagrams/ch14-bus-hang.svg)

택배 기사가 빈집 앞에서 문이 열리기를 하염없이 기다리는 상황과 같습니다. 정해진 시간이 지나면 "부재중" 쪽지를 남기고 돌아가는 규칙이 있어야 다음 배달을 할 수 있습니다. 인터커넥트의 **timeout 모니터**가 그 규칙입니다. 일정 시간 안에 응답이 없으면 인터커넥트가 대신 에러 응답을 돌려주고, CPU는 버스 에러 예외를 받아 처리합니다.

timeout이 있는 칩이라면 버스 hang은 "어느 주소 접근이 실패했다"는 예외로 바뀝니다. 예외 핸들러가 실패한 주소를 출력하면, 그 주소가 속한 장치의 클럭과 전원을 확인하면 됩니다. timeout이 없거나 꺼져 있는 칩이라면, postcode와 GPIO로 "마지막으로 성공한 접근"과 "다음 접근" 사이로 범위를 좁힙니다. 많은 경우 원인은 드라이버가 클럭을 켜기 전에 레지스터에 접근한 것이고, 리눅스라면 클럭 프레임워크와 전원 도메인 설정을 함께 봅니다.

## 저전력 진입 후 안 깨어날 때

bring-up 후반에 자주 만나는 hang이 **suspend 후 resume 실패**입니다. 시스템이 저전력 상태로 들어가는 것까지는 되는데, 깨우면 아무 반응이 없습니다. 콘솔도 꺼져 있고, 디버그 전원 도메인도 꺼져 있어 디버거도 붙지 않습니다. 앞의 기법들이 가장 필요한 상황입니다.

원인은 대개 세 갈래입니다.

- **깨우는 신호가 도달하지 않음:** 깨우기 소스(버튼, RTC 알람 등)가 always-on 영역의 깨우기 제어기에 연결·설정돼 있지 않습니다.
- **깨어나는 순서가 틀림:** 전원과 클럭을 다시 켜는 순서가 잘못돼, Ch 11의 전원 시퀀스 문제가 resume 경로에서 다시 나타납니다.
- **상태가 복원되지 않음:** 꺼졌던 영역의 레지스터 값이 사라졌는데 펌웨어가 복원하지 않습니다. Co-simulation Ch 16에서 본 retention(전원을 꺼도 값을 유지하는 장치) 누락이 여기서 드러납니다.

진단은 resume 경로에 postcode를 촘촘히 심는 것으로 시작합니다. 깨어난 직후 가장 먼저 실행되는 코드(대개 보안 펌웨어나 전원 관리 펌웨어의 resume 진입점)에서 postcode와 GPIO 토글을 남기면, "깨어나기는 했는가"부터 확인할 수 있습니다. 리눅스에는 suspend 경로를 단계별로 끊어 시험하는 기능도 있습니다. 아래는 장치 드라이버의 suspend까지만 진행하고 실제 저전력 진입 없이 돌아오게 하는 예시로, 커널이 `CONFIG_PM_DEBUG`로 빌드돼 있어야 합니다.

```bash
# 콘솔을 suspend 중에도 살려 두려면 부팅 인자에 no_console_suspend 추가
cat /sys/power/pm_test            # 시험 가능한 단계 목록
echo devices > /sys/power/pm_test # 드라이버 suspend까지만 시험
echo mem > /sys/power/state       # suspend 시도 후 자동 복귀
dmesg | tail -50
```

`devices` 단계에서 문제가 없으면 `platform`, `processors`, `core`로 한 단계씩 깊이 들어갑니다. 어느 단계에서 처음 실패하는지가 범위를 알려 줍니다. 실제 저전력 진입 이후에서만 실패한다면, 그때부터는 펌웨어 resume 경로의 postcode가 유일한 단서가 됩니다.

## 작은 예시 — 하루 한 번 멈추는 보드

가상의 사례를 따라가 보겠습니다. 리눅스가 도는 보드가 하루에 한 번꼴로 완전히 멈춥니다. 디버거를 붙여 두면 며칠째 재현이 안 됩니다. 전형적인 하이젠버그입니다.

먼저 watchdog을 켜서 hang을 리셋으로 바꿉니다. 다음 날 보드가 재부팅됐고, 부트 코드가 출력한 리셋 원인은 watchdog입니다. ramoops 기록을 보니 마지막 커널 로그에 hardlockup 감지 메시지가 없습니다. 인터럽트까지 막혔지만 감지기조차 돌지 못했다는 뜻이고, 버스 hang을 의심할 근거가 됩니다.

이 칩은 인터커넥트 timeout이 기본으로 꺼져 있었습니다. 부트로더에서 timeout을 켜고 다시 기다리자, 이번에는 hang 대신 버스 에러 예외가 발생했고 실패 주소가 로그에 찍혔습니다. 그 주소는 오디오 블록의 레지스터였습니다. 오디오 드라이버가 런타임 전원 관리로 클럭을 끈 직후, 다른 경로에서 상태 레지스터를 읽는 경쟁 조건이 있었습니다. 드라이버를 고치자 멈춤이 사라졌습니다. 디버거 없이 칩이 스스로 남긴 흔적 세 가지(리셋 원인, ramoops, timeout 에러 주소)로 찾은 원인이었습니다.

## 자주 하는 실수

- **postcode 레지스터가 리셋에 지워지는지 확인하지 않습니다.** bring-up 첫날, 값을 쓰고 웜 리셋을 건 뒤 다시 읽어 보는 시험을 한 번 해 둡니다.
- **watchdog을 bring-up 동안 꺼 둡니다.** 끄면 hang이 그냥 멈춤으로 남아 리셋 원인 기록이 생기지 않습니다. 디버거로 한 단계씩 실행할 때만 잠시 끕니다.
- **GPIO 토글을 너무 많이 넣습니다.** 토글이 많으면 타이밍이 바뀌어 하이젠버그가 사라질 수 있습니다. 처음에는 큰 단계에만 넣습니다.
- **버스 timeout이 켜져 있다고 가정합니다.** 기본값이 꺼진 칩이 있습니다. 칩 문서와 부트로더 설정을 확인합니다.
- **suspend 문제를 한 번에 재현하려 합니다.** `pm_test`로 단계를 끊어 어디서 처음 실패하는지 찾는 편이 빠릅니다.

## 정리

- hang은 마지막 말을 남기지 않으므로, 칩이 지나가는 길마다 스스로 흔적을 남기게 만들어야 합니다.
- **postcode**는 비용이 거의 없고 리셋 뒤에도 읽을 수 있습니다. 단, scratch 레지스터가 always-on 영역에서 웜 리셋에 유지돼야 합니다.
- **GPIO 토글**은 시간 정보를 주는 실시간 관찰 도구이고, 스코프가 멈추는 순간을 지켜봐야 합니다.
- **watchdog**은 hang을 리셋으로 바꿔 리셋 원인 기록을 남깁니다. 리눅스에서는 ramoops와 lockup 감지기가 그 기록을 보강합니다.
- **버스 hang**은 인터커넥트 timeout이 있으면 실패 주소가 담긴 예외로 바뀝니다. 원인은 대개 클럭·전원이 꺼진 장치에 대한 접근입니다.
- **resume 실패**는 깨우기 신호, 깨어나는 순서, 상태 복원 세 갈래로 보고, resume 진입점의 postcode와 `pm_test`로 범위를 좁힙니다.

## 다음 장 예고

다음 장에서는 "어디서 멈췄나"를 넘어 **"어떻게 거기까지 갔나"**를 보는 도구를 다룹니다. 온칩 trace 버퍼(ETB/ETR)를 링 버퍼로 돌려 크래시와 hang 직전의 실행 흐름을 복원하는 방법을 정리합니다.

## 관련 항목

- [Ch 13: SoC에 JTAG이 안 붙을 때](/blog/tools/debugging/embedded/chapter13-jtag-wont-attach-soc)
- [Ch 15: 죽기 직전의 실행 흐름](/blog/tools/debugging/embedded/chapter15-trace-before-death)
- [Ch 11: 전원·클럭·리셋 디버깅](/blog/tools/debugging/embedded/chapter11-power-clock-reset) — 리셋 원인 레지스터
- [Driver-RTL Co-simulation Ch 16: 디버그 훅을 테이프아웃 전에 심기](/blog/tools/emulation/driver-cosim/chapter16-pre-to-post-handoff) — 이 장의 훅을 설계하는 쪽
- [BSP Development Ch 14: Thermal·Watchdog](/blog/embedded/bsp/chapter14-thermal-watchdog) — watchdog 드라이버 설정
- [Modern Embedded Recipes: 포스트모템 분석](/blog/embedded/modern-recipes/part10-12-postmortem-analysis) — 필드 크래시 기록
