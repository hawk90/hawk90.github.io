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

Priority ceiling 계열은 자원을 사용할 task들의 priority를 미리 분석합니다. **Immediate ceiling의 획득 시 boost와 Original PCP의 admission 규칙은 다릅니다.** 이름이 비슷한 RTOS 설정만으로 같은 protocol을 구현했다고 판단하면 안 됩니다.

## 두 규칙의 차이

원래 PCP 논문은 단일 CPU의 priority-driven preemptive 모델과 자원 사용 가정 아래에서 blocking과 deadlock 성질을 분석합니다. 다른 scheduler·SMP·임의의 self-suspension으로 가정을 바꾸면 같은 결론을 그대로 적용할 수 없습니다.

| 항목 | Original PCP | Immediate ceiling 방식 |
| --- | --- | --- |
| lock 진입 | 다른 task가 보유한 자원의 system ceiling보다 높은 priority 등 admission 규칙 확인 | 획득 자원 ceiling까지 effective priority 상승 |
| blocking과 상속 | protocol에 의해 막힌 task의 priority를 owner가 상속 | 획득 시 상승과 scheduler 규칙이 중심 |
| 분석 전제 | 정확한 resource ceiling·protocol·task 모델 | 정확한 ceiling과 해당 방식의 task·선점·중첩 규칙 |

이론상 성질을 코드에서 priority 필드 하나 바꾸는 작업으로 대체하지 않습니다. 높은 수치가 높은 priority인 모델과 Zephyr처럼 낮은 수치가 높은 priority인 API도 구분합니다.

## Original PCP의 Admission 작은 예제

다음은 **높은 정수가 높은 priority**인 수학 모델입니다. 다른 task가 보유한 자원의 최고 ceiling보다 요청 task의 priority가 엄격히 높은지 검사합니다. 대상 mutex의 free/owner 검사·대기·상속·release를 구현한 RTOS lock 함수는 아닙니다.

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

예를 들어 다른 task가 ceiling 5인 자원을 보유하면 priority 5는 통과하지 못하고 6은 통과합니다. 같은 task 자신의 보유 자원은 이 system-ceiling 검사에서 제외합니다. 전체 protocol을 구현하려면 대상 자원의 owner·중첩·차단 원인과 유효 priority를 함께 관리해야 합니다.

## Deadlock 방지 성질의 전제

ceiling을 정확히 계산하고 논문이 요구하는 protocol·스케줄링·자원 사용 조건을 지키면 deadlock 방지와 blocking 상한을 분석할 수 있습니다. 단순한 “priority가 같으면 다른 task가 실행될 수 없다”는 증명은 동일 priority의 time slicing이나 self-suspension을 누락합니다.

잘못된 ceiling·지원되지 않는 API·protocol을 따르지 않는 별도 lock이 있으면 보장이 성립하지 않습니다. 일반적인 lock order와 shutdown·복구 설계도 제품의 다른 자원을 위해 필요합니다.

## 실제 RTOS 옵션 확인

Zephyr **3.7.0**의 CONFIG_PRIORITY_CEILING은 mutex **priority inheritance의 상승 상한을 정하는 정수**입니다. k_mutex에 임의의 ceiling 필드를 쓰거나 CONFIG_PRIORITY_CEILING_PROTOCOL을 PCP 활성화 옵션으로 제시하지 않습니다.

FreeRTOS V11.2.0 기본 mutex에는 application이 지정하는 resource ceiling API가 없습니다. 내부 TCB priority를 직접 변경하거나 vTaskPrioritySet으로 잠깐 올리는 것만으로 Original PCP·Immediate protocol의 전체 계약을 만들 수 없습니다. 다른 RTOS의 semMCreate 인자도 제품 버전의 공식 prototype 없이 만들어 제시하지 않습니다.

## 비용과 적용 조건

ceiling 방식은 실제 경쟁 전에도 일부 중간 priority task를 지연시킬 수 있습니다. 그러나 boost가 곧 항상 starvation이나 throughput 감소를 뜻하지는 않습니다. 각 task의 도착·수행·자원 보유 구간으로 분석하고 평균과 최악 응답을 구분합니다.

새로운 높은 priority task가 자원을 사용하면 ceiling과 분석을 갱신해야 합니다. task 집합이 바뀌는 제품에서는 이 정보의 유지 비용까지 고려합니다. 이 글의 모델 검사는 RTOS의 스케줄러 실행이나 deadlock 정리의 기계적 증명은 아닙니다.

## 정리

- Original PCP와 Immediate ceiling의 동작을 구분합니다.
- ceiling에는 자원을 사용하는 모든 task의 priority가 반영되어야 합니다.
- deadlock·blocking 보장은 명시된 분석 가정과 정확한 구현에 따릅니다.
- Zephyr의 PI 상한 설정은 PCP 활성화가 아닙니다.
- 직접 TCB를 고치는 축약 lock 코드를 제품에 설치하지 않습니다.

다음 [3-07 Queue 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)에서 message 복사와 양쪽 대기 목록을 살펴봅니다.

## 근거 자료

- [Sha·Rajkumar·Lehoczky, Priority Inheritance Protocols, 1990](https://www.math.unipd.it/~tullio/RTS/2009/SRL-1990.pdf): 단일 CPU protocol과 가정.
- [Zephyr 3.7.0 mutex](https://docs.zephyrproject.org/3.7.0/kernel/services/synchronization/mutexes.html): CONFIG_PRIORITY_CEILING의 의미.
- [FreeRTOS V11.2.0 semphr.h](https://github.com/FreeRTOS/FreeRTOS-Kernel/blob/V11.2.0/include/semphr.h): 제공되는 mutex API.

## 관련 항목

- [3-05: Priority Inheritance 구현](/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance)
- [3-07: Queue 내부 구현](/blog/embedded/rtos/practical-internals/part3-07-queue-impl)
