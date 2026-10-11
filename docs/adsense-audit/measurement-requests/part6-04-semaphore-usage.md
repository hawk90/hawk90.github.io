# 작성자 측정 요청 — `part6-04-semaphore-usage.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part6-04-semaphore-usage.md`
> - 작성: 2026-10-11, AdSense 개선 루프 묶음 4 (루프 종료 점수 72)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어·도구로 얻은 값과 기록이 있어야 오른다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 작성자가 직접 얻은 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. Measure ISR-to-task wake latency for a binary semaphore vs a task notification on FreeRTOS V11.2.0. The post says the FreeRTOS doc's 45%/35% figures come from V8.x and that the doc gives no V11 figure (L185). A first-hand V11.2.0 number fills that gap.

- **준비:** STM32F407 board (for example STM32F4DISCOVERY; record the exact board), FreeRTOS-Kernel V11.2.0 GCC ARM_CM4F port, arm-none-eabi-gcc (record the exact version), -O2. Record whether configASSERT is defined, configUSE_COUNTING_SEMAPHORES = 1, and the SYSCLK frequency. Use the DWT->CYCCNT cycle counter, plus optionally a GPIO pin on a logic analyzer.
- **절차:** 1) Enable DWT CYCCNT (CoreDebug->DEMCR |= TRCENA; DWT->CTRL |= CYCCNTENA). 2) Trigger EXTI0 or ADC from software with NVIC_SetPendingIRQ, and store CYCCNT in a volatile t0 on ISR entry. 3) In the woken task, read CYCCNT right after xSemaphoreTake / ulTaskNotifyTake returns, and store delta = now - t0. 4) Run 1000 iterations for each variant (binary semaphore with xSemaphoreGiveFromISR + portYIELD_FROM_ISR; notification with vTaskNotifyGiveFromISR), and build both the configASSERT-defined and -undefined configurations. 5) Optionally toggle GPIOs at ISR entry and task wake, and cross-check the interval on a logic analyzer.
- **기록할 것:** Min, median and max cycles (and µs) for each variant and configASSERT setting, the % difference between the variants, the compiler version and flags, SYSCLK, and the arm-none-eabi-size text/data/bss of each build. Include one logic-analyzer screenshot if one was captured.
- **글에 넣을 위치:** ### Task notification — 받는 task가 하나일 때: a new table right after the L185 paragraph (the FreeRTOS doc's 45%/35% figures), labelled as a measured V11.2.0 result on STM32F407, with the conditions listed. Also update the 근거 cell of the 'ISR → task 하나, 횟수는 상관없음' row in the selection table (L218) to cite this table.
- **오르는 항목:** C (real measurement with environment and trade-off: from 8-11 into the 12-15 band) and A (a first-hand V11 number that the official doc does not give).

## 2. Observe the pkt_dropped / errQUEUE_FULL overflow on hardware (event-count recipe, L124-148, and the overflow bullet at L192).

- **준비:** Same board and kernel. RADIO_IRQHandler replaced by a timer ISR (for example TIM2) at a configurable rate, giving N times per interrupt. task_parser's parse_one() simulated with vTaskDelay or a busy loop of known length. xSemaphoreCreateCounting(64, 0). configUSE_COUNTING_SEMAPHORES = 1.
- **절차:** 1) Run with parser throughput above the event rate and check whether pkt_dropped stays 0. 2) Lower the parser throughput (or raise the burst size) until the backlog exceeds 64. 3) Every second, log pkt_dropped, uxSemaphoreGetCount(pkt_count) and the total number of gives attempted, over UART or SWO. 4) Repeat the same load with the vTaskNotifyGiveFromISR variant, and record the notification value (ulTaskNotifyValueClear or a debugger watch) to see whether it keeps growing with no loss signal.
- **기록할 것:** Event rate, parser period, run duration, final pkt_dropped, peak uxSemaphoreGetCount, gives attempted vs parse_one calls (check whether attempted = parsed + dropped + pending holds), and the notification value from the variant run. Paste a short UART log excerpt.
- **글에 넣을 위치:** ### Counting semaphore — event count: after the L148 paragraph (before the binary-semaphore sentence at L150), as an 'observed' table (condition → post's statement → observed). The notification half goes under the **넘침 감지** bullet at L192.
- **오르는 항목:** C (a reader-reproducible procedure with observed results instead of source-derived statements) and A (a failure case demonstrated first-hand).

## 3. Capture the failure modes behind the pitfalls: missing NVIC_SetPriority (L75), xSemaphoreGive from an ISR (L198-204), btn_task NULL before EXTI enable (L183), and initial = max phantom events (L208-212).

- **준비:** Same board and kernel, configASSERT defined as a breakpoint or loop that records __FILE__/__LINE__, GDB via OpenOCD or ST-LINK GDB server (record which, and its version).
- **절차:** Build 4 deliberately broken variants: (a) remove the NVIC_SetPriority(ADC_IRQn, ...) line; (b) call xSemaphoreGive(sem) in EXTI1_IRQHandler; (c) enable EXTI0 and pend it before xTaskCreate fills btn_task; (d) xSemaphoreCreateCounting(64, 64) with no packets and a counter in parse_one(). For each, run and capture where it stops (GDB 'bt', file and line of the assert) or, for (d), the parse_one call count after startup with no IRQs. Also run (a) with configASSERT undefined.
- **기록할 것:** For (a)-(c), the assert file:line actually hit, next to the location the post cites for it (port.c L864-888 at L75, port.c L480-488 at L204, tasks.c in vTaskNotifyGiveFromISR at L183), plus a GDB backtrace excerpt. For (d), the observed parse_one count. For (a) with configASSERT undefined, what happens (works, hangs or corrupts) and after how long.
- **글에 넣을 위치:** Under each pitfall in ## 자주 보는 함정 (L194-212) and in the L75 and L183 paragraphs, as a short 'observed on STM32F407' line with the backtrace in a ```text block.
- **오르는 항목:** C (actual failure records, plus the configASSERT on/off environment difference, which is the 12-15 band) and A (failure cases).

## 4. Check the build-config prerequisite: what happens with the default configUSE_COUNTING_SEMAPHORES = 0.

- **준비:** Same toolchain and kernel V11.2.0, a FreeRTOSConfig.h that does not define configUSE_COUNTING_SEMAPHORES.
- **절차:** Build the resource-pool and event-count code unmodified, capture the exact compiler or linker error, then set configUSE_COUNTING_SEMAPHORES to 1 and rebuild.
- **기록할 것:** The verbatim error text (compile or link stage), the toolchain version, and the minimal FreeRTOSConfig.h lines needed (configUSE_COUNTING_SEMAPHORES, configASSERT, the configMAX_SYSCALL_INTERRUPT_PRIORITY value, configTICK_RATE_HZ).
- **글에 넣을 위치:** A short 'FreeRTOSConfig 전제' block after the L20 paragraph (which names the kernel version and port), or right before ### Counting semaphore — resource pool (L77), with the captured error in a ```text block.
- **오르는 항목:** C (stated execution conditions plus an observed result) and B (prerequisites).

## 5. Measure the RAM cost of a semaphore vs a notification (the RAM sentences at L185).

- **준비:** Same build. Record the heap scheme (for example heap_4).
- **절차:** Print sizeof(StaticSemaphore_t) and sizeof(StaticTask_t). Read xPortGetFreeHeapSize() immediately before and after xSemaphoreCreateBinary() and xSemaphoreCreateCounting(64, 0). Compare with a build where configUSE_TASK_NOTIFICATIONS is 0 to see the TCB size difference.
- **기록할 것:** Exact byte counts: the sizeof values, the heap delta per semaphore (including heap block overhead), and the TCB size difference with notifications on and off.
- **글에 넣을 위치:** The RAM sentences in the L185 paragraph ('RAM은 따로 만드는 객체가 없어서 줄어듭니다 …'), or one more row in the latency table from item 1.
- **오르는 항목:** C (measured trade-off numbers) and A (concrete selection-criterion data).
