---
title: "Priority Ceiling Protocol — Immediate vs Original 비교"
slug: "embedded/rtos/practical-internals/part3-06-priority-ceiling"
date: 2026-05-06T09:27:00
description: "Original PCP의 system ceiling과 Immediate ceiling의 획득 시 boost를 구분하고, 분석 가정·admission 예제·Zephyr PI 상한 설정의 의미를 확인합니다."
series: "Practical RTOS Internals"
seriesOrder: 27
tags: [priority-ceiling, pcp, deadlock-free]
draft: false
topics: ["embedded", "embedded/rtos"]
---

## 한 줄 요약

Priority ceiling 계열은 "이 자원을 쓸 task 중 가장 높은 priority"를 미리 계산해 두고 그 값으로 lock을 다룹니다. **Original PCP는 lock을 허락할지 말지를 system ceiling으로 판단하고, Immediate ceiling은 lock을 잡는 순간 ceiling까지 올라갑니다.** 이 글은 1990년 원 논문의 정의, POSIX의 `PTHREAD_PRIO_PROTECT`, Zephyr의 이름이 비슷한 옵션을 원문으로 확인하고, FreeRTOS에서 immediate ceiling을 흉내 내 PI와 나란히 돌려 봅니다.

## 두 규칙의 차이

PI(3-05)는 문제가 생긴 뒤에 대응합니다. 높은 task가 막혀야 비로소 holder를 올립니다. ceiling 방식은 미리 막습니다. 회의실 예약에 비유하면, PI는 사장이 문 앞에 와서야 회의 중인 사람을 재촉하고, immediate ceiling은 그 회의실에 들어가는 사람에게 처음부터 사장급 출입증을 줘서 중간에 아무도 끼어들지 못하게 합니다.

원 논문은 Sha·Rajkumar·Lehoczky, "Priority Inheritance Protocols: An Approach to Real-Time Synchronization", IEEE Transactions on Computers 39(9), 1990년 9월입니다. 논문은 프로토콜을 **uniprocessor 환경과 binary semaphore**로 정의하고, critical section이 **properly nested**라고 가정합니다(I장, II장). 이 가정을 벗어나는 SMP나 중첩되지 않은 lock 사용에는 정리를 그대로 가져올 수 없습니다.

| 항목 | Original PCP (논문 IV장) | Immediate ceiling (POSIX `PTHREAD_PRIO_PROTECT`) |
| --- | --- | --- |
| ceiling 정의 | 그 semaphore를 lock할 수 있는 가장 높은 job의 priority | mutex 속성으로 지정한 `prioceiling` 값 |
| lock 진입 | 다른 job이 잠근 semaphore들의 최고 ceiling(S*)보다 **엄격히 높아야** 통과 | 조건 없이 잡고, 잡은 동안 ceiling 이상으로 실행 |
| priority 상승 시점 | 자기가 더 높은 job을 막을 때만, 막힌 job의 priority를 상속 | lock을 쥐는 순간. 대기자 유무와 무관 |
| 원문의 보장 | deadlock 없음(Theorem 10), 낮은 job의 critical section 하나 이하만큼만 blocking(Theorem 12) | 표준은 스케줄링 규칙만 정하고 deadlock 정리는 말하지 않음 |

POSIX.1-2024의 `pthread_mutexattr_setprotocol()` 페이지는 `PTHREAD_PRIO_PROTECT`를 이렇게 정의합니다. thread가 이 프로토콜의 mutex를 하나 이상 가지고 있으면, 자기 priority와 그 mutex들의 ceiling 중 최댓값으로 실행하며 "regardless of whether other threads are blocked on any of these mutexes or not"이라고 적습니다. 대기자가 없어도 올라간다는 점이 PI(`PTHREAD_PRIO_INHERIT`)와의 차이입니다.

## Original PCP의 Admission 작은 예제

논문 IV장의 정의 1)은 "S*를 job J가 아닌 다른 job들이 현재 잠근 semaphore 가운데 ceiling이 가장 높은 것"으로 두고, J의 priority가 S*의 ceiling보다 높지 않으면 lock을 거부합니다. 그 검사만 떼어 내면 아래 함수가 됩니다. **높은 정수가 높은 priority**인 모델이고, 대상 mutex의 free/owner 검사·대기·상속·release는 들어 있지 않습니다.

```js title="pcp-admission.mjs"
export function canPassSystemCeiling(priority, task, held) {
  if (!Number.isSafeInteger(priority) || priority < 0)
    throw new RangeError('priority');
  let ceiling = -1;
  for (const resource of held) {
    if (!Number.isSafeInteger(resource.ceiling) || resource.ceiling < 0)
      throw new RangeError('ceiling');
    if (resource.owner !== task)
      ceiling = Math.max(ceiling, resource.ceiling);
  }
  return priority > ceiling;
}
```

Node.js v24.21.0에서 네 경우를 돌린 결과입니다.

```text
prio 5, other task holds ceiling 5 -> false
prio 6, other task holds ceiling 5 -> true
prio 3, own resource ceiling 5     -> true
prio 3, nothing held               -> true
```

다른 task가 ceiling 5 자원을 쥐고 있으면 priority 5는 막히고 6은 통과합니다. 자기 자원은 S* 계산에서 빠지므로 L 자신은 priority 3으로도 다음 lock을 시도할 수 있습니다. 첫 줄이 PCP의 핵심입니다. priority 5 job이 원하는 자원이 비어 있어도, 다른 곳에서 ceiling 5 자원이 잠겨 있으면 들어가지 못합니다. 이렇게 미리 거절하기 때문에 순환 대기가 생기지 않습니다.

## Deadlock 방지 성질의 전제

논문은 Theorem 10에서 PCP가 deadlock을 막는다고 증명하고, 이것으로 "programmers can write arbitrary sequences of properly nested semaphore accesses"라고 결론 냅니다. Theorem 12는 job 하나가 낮은 job의 critical section 하나 이하만큼만 막힌다는 상한입니다. 3-05의 기본 PI에 대해서는 같은 논문의 Theorem 3이, 낮은 job n개가 있을 때 각 job의 critical section 하나씩, 합쳐서 최대 n개만큼 막힌다는 상한을 줍니다. 두 방식의 차이가 이 숫자 하나에 담겨 있습니다.

전제는 앞의 표에 적은 것들입니다. uniprocessor, binary semaphore, properly nested critical section, 그리고 자원을 쓰는 모든 job의 priority가 ceiling 계산에 들어가야 합니다. 이 목록에서 하나라도 빠지면 정리가 성립한다는 근거가 없어집니다. 예를 들어 ceiling 계산에서 빠진 task가 그 자원을 쓰거나, 프로토콜 밖의 lock이 섞이면 증명의 가정이 깨집니다.

## FreeRTOS에서 Immediate ceiling 흉내 내기

FreeRTOS V11.2.0 `include/semphr.h`의 mutex 생성 API는 `xSemaphoreCreateMutex()`, `xSemaphoreCreateMutexStatic()`, recursive 변형뿐이고, ceiling 값을 받는 인자가 없습니다(`grep -n ceiling include/semphr.h` 결과 0건). 그래서 immediate ceiling을 쓰려면 lock 앞뒤에서 `vTaskPrioritySet()`으로 직접 올리고 내려야 합니다.

아래 wrapper가 그 방식입니다. lock할 때 ceiling 4로 올린 뒤 mutex를 잡고, unlock할 때 원래 값으로 되돌립니다.

```c
#define CEIL 4
static UBaseType_t lock(void) {
    UBaseType_t old = uxTaskPriorityGet(NULL);
    if (use_ceiling) vTaskPrioritySet(NULL, CEIL);
    xSemaphoreTake(R, portMAX_DELAY);
    return old;
}
static void unlock(UBaseType_t old) {
    xSemaphoreGive(R);
    if (use_ceiling) vTaskPrioritySet(NULL, old);
}
```

시나리오는 이렇습니다. L(1)이 R을 잡고 CPU 시간 약 10 tick 분량의 일을 합니다. t=3에 R을 쓰지 않는 M(3)이 깨어나고, t=5에 H(4)가 R을 원합니다. 같은 프로그램을 plain mutex(FreeRTOS 기본 PI)와 위 wrapper로 한 번씩 돌렸습니다. 환경은 3-05와 같습니다(FreeRTOS V11.2.0, `ARM_CM3` 포트, QEMU 11.1.3 `mps2-an385`, `arm-none-eabi-gcc` 16.2.0, 1 kHz tick).

```text
[plain mutex (PI)] L(1) uses R for 10 ticks; M(3) arrives t=3, no R; H(4) wants R at t=5
  t= 1 L   lock R (prio 1)
  t= 3 M   start (no R) (prio 3)
  t= 5 H   want R (prio 4)
  t=13 L   unlock R (prio 4)
  t=13 H   got R (prio 4)
  t=15 H   done (prio 4)
  t=23 M   done (prio 3)
  t=23 L   done (prio 1)
[immediate ceiling=4] L(1) uses R for 10 ticks; M(3) arrives t=3, no R; H(4) wants R at t=5
  t= 0 L   lock R (prio 4)
  t= 6 H   want R (prio 4)
  t= 9 L   unlock R (prio 4)
  t=10 H   got R (prio 4)
  t=11 H   done (prio 4)
  t=11 M   start (no R) (prio 3)
  t=23 M   done (prio 3)
  t=23 L   done (prio 1)
```

`spin()`은 QEMU 위에서 보정한 반복 횟수라 tick 값은 실행마다 1~3 tick씩 흔들렸습니다. 같은 바이너리를 세 번 더 돌렸을 때 H가 R을 얻은 시점은 PI에서 13·11·13, ceiling에서 10·9·8이었습니다. 순서는 세 번 모두 같았습니다.

결과에서 세 가지가 보입니다.

- **PI에서는 M이 L을 밀어냅니다.** t=3~5 동안 M이 돌고 L의 critical section은 멈춥니다. H가 t=5에 block해 L이 4로 올라간 뒤에야 L이 다시 돕니다. H는 L의 남은 일과 M이 끼어든 만큼 기다립니다.
- **ceiling에서는 M이 경쟁도 없이 늦게 시작합니다.** M은 R을 쓰지도 않는데 L이 priority 4로 R을 쥐고 있어서 t=3이 아니라 t=11쯤 시작합니다. ceiling 방식의 대가입니다.
- **ceiling을 H와 같은 값으로 잡으면 H가 L과 time slice를 나눕니다.** H의 `want R`이 t=5가 아니라 t=6에 찍혔습니다. L과 H가 둘 다 priority 4라 `configUSE_TIME_SLICING 1`에서 다음 tick에야 H 차례가 왔기 때문입니다.

이 wrapper는 PCP 전체가 아닙니다. 중첩해서 두 자원을 잡으면 `old`를 스택처럼 쌓아야 하고, `vTaskPrioritySet()`을 다른 곳에서 부르면 저장해 둔 값이 낡습니다. 그리고 Original PCP의 admission 검사는 아예 없습니다.

## 실제 RTOS 옵션 확인

Zephyr v3.7.0의 `CONFIG_PRIORITY_CEILING`은 이름과 달리 PCP가 아닙니다. `kernel/Kconfig:83-89`에서 이 옵션은 int이고, help는 "k_mutex priority inheritance로 thread가 얻을 수 있는 최소 priority 값(논리적으로 가장 높은 priority)"이라고 정의합니다. 즉 **PI 상승의 상한**입니다. `struct k_mutex`(`include/zephyr/kernel.h:2917-2927`)의 필드는 `wait_q`·`owner`·`lock_count`·`owner_orig_prio`뿐이라 ceiling을 담을 곳이 없고, `CONFIG_PRIORITY_CEILING_PROTOCOL`이라는 Kconfig도 v3.7.0 트리에 없습니다(`grep -rn PRIORITY_CEILING_PROTOCOL` 0건). Zephyr는 낮은 숫자가 높은 priority여서, 위 JS 예제의 "높은 정수가 높은 priority" 모델과 방향이 반대입니다.

POSIX 계열에서는 `PTHREAD_PRIO_PROTECT` 자체가 표준 옵션입니다. 앞에서 본 POSIX.1-2024 페이지가 그 정의이고, ceiling 값은 `pthread_mutexattr_setprioceiling()`으로 지정합니다. 이 글에서 POSIX 구현은 실행하지 않았습니다.

## 비용과 적용 조건

위 실행에서 M이 R과 무관한데도 약 8 tick 늦게 시작한 것이 ceiling 방식의 비용입니다. 대신 H가 R을 얻기까지 기다린 시간은 PI보다 짧았습니다. 어느 쪽이 나은지는 평균이 아니라 각 task의 최악 응답으로 따져야 하고, 그 계산이 논문 V장의 schedulability 조건입니다.

ceiling 값은 "자원을 쓰는 모든 task"의 정적 정보에 기대므로, 새로운 높은 priority task가 그 자원을 쓰기 시작하면 ceiling과 분석을 같이 갱신해야 합니다. 도서관 열람실 등급을 정해 두는 것과 같아서, 더 높은 등급의 이용자가 새로 생기면 등급표부터 다시 써야 합니다.

## 정리

- Original PCP는 S*의 ceiling보다 엄격히 높은 job만 lock을 허락하고(논문 IV장), immediate ceiling은 lock을 쥐는 순간 ceiling으로 올라갑니다(POSIX `PTHREAD_PRIO_PROTECT`).
- 논문의 deadlock 방지(Theorem 10)와 critical section 1개 blocking 상한(Theorem 12)은 uniprocessor·binary semaphore·properly nested 가정 위의 결과입니다.
- QEMU 실행에서 ceiling은 H의 대기를 줄였지만, R을 쓰지 않는 M을 약 8 tick 늦췄습니다.
- FreeRTOS V11.2.0 mutex에는 ceiling 인자가 없어서 `vTaskPrioritySet()` wrapper로만 흉내 낼 수 있고, 그 wrapper는 PCP의 admission 검사를 하지 않습니다.
- Zephyr v3.7.0의 `CONFIG_PRIORITY_CEILING`은 PI 상승 상한이지 PCP 스위치가 아닙니다.

다음 [3-07 Queue 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)에서 message 복사와 양쪽 대기 목록을 살펴봅니다.

## 근거 자료

- [Sha·Rajkumar·Lehoczky, Priority Inheritance Protocols, IEEE Trans. Computers 39(9), 1990](https://www.math.unipd.it/~tullio/RTS/2009/SRL-1990.pdf): I·II장 가정, IV장 정의, Theorem 3·10·12.
- [POSIX.1-2024 pthread_mutexattr_setprotocol()](https://pubs.opengroup.org/onlinepubs/9799919799/functions/pthread_mutexattr_setprotocol.html): `PTHREAD_PRIO_PROTECT`·`PTHREAD_PRIO_INHERIT` 정의.
- [Zephyr v3.7.0 kernel/Kconfig](https://github.com/zephyrproject-rtos/zephyr/blob/v3.7.0/kernel/Kconfig), [mutex 문서](https://docs.zephyrproject.org/3.7.0/kernel/services/synchronization/mutexes.html): `CONFIG_PRIORITY_CEILING`의 의미.
- [FreeRTOS V11.2.0 semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): 제공되는 mutex API.

## 관련 항목

- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
- [3-07: Queue 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
