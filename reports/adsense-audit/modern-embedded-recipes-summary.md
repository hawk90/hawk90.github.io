# Modern Embedded Recipes — 전체 AdSense 평가 요약

> 상태: 루프-01~16 평가 통합본
> 대상: 공개 글 152편
> 범위: `seriesOrder 0~151`
> 원칙: 원문 수정·비공개·삭제·URL 변경 없음

## 결론

현재 공개된 Modern Embedded Recipes 152편에 대해 루프별 상세 검토와 잠정 점수 기록을 완료했다. 전체 점수 범위는 59~84점, 평균은 75.1점이다. P0 정책 차단 요소는 확인되지 않았으며, 점수는 Google의 공식 점수나 승인 확률이 아닌 내부 우선순위 지표다.

이 문서는 전체 처리 순서를 결정하기 위한 요약본이다. 글별 상세 근거는 각 루프 보고서에 남겨 두고, 이 문서에서는 작업 순서와 상태를 관리한다.

## 우선순위 기준

| 우선순위 | 점수 | 처리 의미 | 다음 행동 |
| --- | ---: | --- | --- |
| 1차 보강 | 0~69 | 실전성·근거·차별화가 먼저 필요한 글 | 측정 조건, 실패 사례, 공식 출처, 적용 범위 보강 후 재평가 |
| 2차 보강 | 70~79 | 기본 가치는 있으나 검증 증거가 부족한 글 | 버전·보드·실측·출처를 보강하고 유지 여부 재확인 |
| 검증 후 유지 | 80~100 | 현재 구조와 독립 가치가 상대적으로 강한 글 | 원문 대수술 없이 최신성·버전·출처만 확인 |

현재 분포는 1차 보강 15편, 2차 보강 116편, 검증 후 유지 21편이다. 80점 미만이라고 삭제하는 기준은 아니며, 모든 점수는 잠정값이다.

## 처리 순서

1. 1차 보강 15편: 낮은 점수와 정책·신뢰 리스크가 큰 글부터 보강
2. 2차 보강 116편: 시리즈 중복, 버전 범위, 실측·출처를 정리
3. 검증 후 유지 21편: 원문 변경을 최소화하고 최신성·출처만 점검
4. 보강 후 전체 재검토: 내부 링크, 검색 색인, sitemap/RSS, 렌더링 앵커 검사
5. 최종 공개 판단: 수정 결과를 반영한 뒤 유지·병합·비공개를 별도 결정

Abseil과 Folly는 기존 결정대로 이 목록에 포함하지 않았다.

## 루프별 분포

| 루프 | 글 수 | 최저 | 최고 | 평균 | 상세 보고서 |
| ---: | ---: | ---: | ---: | ---: | --- |
| 01 | 10 | 59 | 77 | 63.9 | [loop-01](./modern-embedded-recipes-loop-01.md) |
| 02 | 10 | 67 | 76 | 71.3 | [loop-02](./modern-embedded-recipes-loop-02.md) |
| 03 | 10 | 67 | 77 | 72.2 | [loop-03](./modern-embedded-recipes-loop-03.md) |
| 04 | 10 | 72 | 78 | 75.9 | [loop-04](./modern-embedded-recipes-loop-04.md) |
| 05 | 10 | 74 | 80 | 76.3 | [loop-05](./modern-embedded-recipes-loop-05.md) |
| 06 | 10 | 72 | 79 | 76.2 | [loop-06](./modern-embedded-recipes-loop-06.md) |
| 07 | 10 | 70 | 77 | 73.5 | [loop-07](./modern-embedded-recipes-loop-07.md) |
| 08 | 10 | 64 | 80 | 73.3 | [loop-08](./modern-embedded-recipes-loop-08.md) |
| 09 | 10 | 75 | 79 | 77.1 | [loop-09](./modern-embedded-recipes-loop-09.md) |
| 10 | 10 | 75 | 80 | 77.5 | [loop-10](./modern-embedded-recipes-loop-10.md) |
| 11 | 10 | 67 | 80 | 76.6 | [loop-11](./modern-embedded-recipes-loop-11.md) |
| 12 | 10 | 70 | 80 | 78.2 | [loop-12](./modern-embedded-recipes-loop-12.md) |
| 13 | 10 | 74 | 82 | 78.0 | [loop-13](./modern-embedded-recipes-loop-13.md) |
| 14 | 10 | 70 | 80 | 75.7 | [loop-14](./modern-embedded-recipes-loop-14.md) |
| 15 | 10 | 72 | 82 | 78.6 | [loop-15](./modern-embedded-recipes-loop-15.md) |
| 16 | 2 | 83 | 84 | 83.5 | [loop-16](./modern-embedded-recipes-loop-16.md) |

## 전체 처리 순서표

아래 표는 낮은 점수부터 처리하는 순서다. 같은 점수에서는 원래 seriesOrder 흐름을 유지했다.

| 순서 | 점수 | 작업 단계 | 파일 | 루프 |
| ---: | ---: | --- | --- | ---: |
| 1 | 59 | 1차 보강 | `part1-04-uart-hardware.md` | 01 |
| 2 | 59 | 1차 보강 | `part1-05-spi-hardware.md` | 01 |
| 3 | 59 | 1차 보강 | `part1-09-pwm-signal.md` | 01 |
| 4 | 61 | 1차 보강 | `part1-08-dac-principles.md` | 01 |
| 5 | 63 | 1차 보강 | `part1-03-gpio-internals.md` | 01 |
| 6 | 63 | 1차 보강 | `part1-06-i2c-hardware.md` | 01 |
| 7 | 64 | 1차 보강 | `part1-01-digital-signal-basics.md` | 01 |
| 8 | 64 | 1차 보강 | `part6-09-isr-api.md` | 08 |
| 9 | 65 | 1차 보강 | `part7-03-device-tree-basics.md` | 08 |
| 10 | 66 | 1차 보강 | `part1-02-clock-timing.md` | 01 |
| 11 | 67 | 1차 보강 | `part2-05-arm-memory-map.md` | 02 |
| 12 | 67 | 1차 보강 | `part2-10-memory-barrier.md` | 03 |
| 13 | 67 | 1차 보강 | `part3-04-linker-script-basics.md` | 03 |
| 14 | 67 | 1차 보강 | `part9-02-wait-free.md` | 11 |
| 15 | 68 | 1차 보강 | `part1-07-adc-principles.md` | 01 |
| 16 | 70 | 2차 보강 | `part1-10-can-electrical.md` | 02 |
| 17 | 70 | 2차 보강 | `part1-11-rs485-rs422.md` | 02 |
| 18 | 70 | 2차 보강 | `part2-02-cortex-a-comparison.md` | 02 |
| 19 | 70 | 2차 보강 | `part2-09-trustzone-m.md` | 03 |
| 20 | 70 | 2차 보강 | `part3-02-compile-pipeline.md` | 03 |
| 21 | 70 | 2차 보강 | `part5-14-rtc-utilization.md` | 07 |
| 22 | 70 | 2차 보강 | `part6-11-timer-services.md` | 08 |
| 23 | 70 | 2차 보강 | `part9-10-mpmc-queue.md` | 12 |
| 24 | 70 | 2차 보강 | `part11-13-opencl-fpga.md` | 14 |
| 25 | 71 | 2차 보강 | `part1-12-lvds-differential.md` | 02 |
| 26 | 71 | 2차 보강 | `part2-01-cortex-m-comparison.md` | 02 |
| 27 | 71 | 2차 보강 | `part2-07-arm-mpu.md` | 02 |
| 28 | 71 | 2차 보강 | `part5-12-ethernet-mac-phy.md` | 07 |
| 29 | 72 | 2차 보강 | `part2-06-arm-cache.md` | 02 |
| 30 | 72 | 2차 보강 | `part3-09-compiler-optimization.md` | 04 |
| 31 | 72 | 2차 보강 | `part5-04-servo-motor.md` | 06 |
| 32 | 72 | 2차 보강 | `part5-13-sd-card-fatfs.md` | 07 |
| 33 | 72 | 2차 보강 | `part6-07-event-group.md` | 07 |
| 34 | 72 | 2차 보강 | `part11-14-intel-quartus.md` | 14 |
| 35 | 72 | 2차 보강 | `part11-15-pcie-to-cxl.md` | 15 |
| 36 | 73 | 2차 보강 | `part2-08-arm-mmu.md` | 03 |
| 37 | 73 | 2차 보강 | `part3-03-elf-format.md` | 03 |
| 38 | 73 | 2차 보강 | `part11-12-vitis-ai.md` | 14 |
| 39 | 74 | 2차 보강 | `part3-07-c-runtime.md` | 03 |
| 40 | 74 | 2차 보강 | `part3-08-memory-layout.md` | 04 |
| 41 | 74 | 2차 보강 | `part4-06-systick-timer.md` | 05 |
| 42 | 74 | 2차 보강 | `part4-11-low-power-modes.md` | 05 |
| 43 | 74 | 2차 보강 | `part4-12-watchdog.md` | 05 |
| 44 | 74 | 2차 보강 | `part5-05-character-lcd.md` | 06 |
| 45 | 74 | 2차 보강 | `part6-02-task-design.md` | 07 |
| 46 | 74 | 2차 보강 | `part6-04-semaphore-usage.md` | 07 |
| 47 | 74 | 2차 보강 | `part6-06-queue-usage.md` | 07 |
| 48 | 74 | 2차 보강 | `part6-08-software-timer.md` | 08 |
| 49 | 74 | 2차 보강 | `part11-01-fpga-basics.md` | 13 |
| 50 | 74 | 2차 보강 | `part12-02-npu-architecture.md` | 14 |
| 51 | 75 | 2차 보강 | `part2-03-arm-registers.md` | 02 |
| 52 | 75 | 2차 보강 | `part3-06-startup-code.md` | 03 |
| 53 | 75 | 2차 보강 | `part3-10-map-file-analysis.md` | 04 |
| 54 | 75 | 2차 보강 | `part4-02-mmio-access.md` | 04 |
| 55 | 75 | 2차 보강 | `part5-07-tft-display.md` | 06 |
| 56 | 75 | 2차 보강 | `part5-08-environmental-sensors.md` | 06 |
| 57 | 75 | 2차 보강 | `part6-05-mutex-usage.md` | 07 |
| 58 | 75 | 2차 보강 | `part7-02-uboot-usage.md` | 08 |
| 59 | 75 | 2차 보강 | `part7-04-device-tree-overlay.md` | 08 |
| 60 | 75 | 2차 보강 | `part7-06-kernel-module.md` | 09 |
| 61 | 75 | 2차 보강 | `part7-12-sysfs.md` | 09 |
| 62 | 75 | 2차 보강 | `part8-03-cache-alignment.md` | 10 |
| 63 | 75 | 2차 보강 | `part8-08-neon.md` | 10 |
| 64 | 76 | 2차 보강 | `part2-04-cortex-m-exceptions.md` | 02 |
| 65 | 76 | 2차 보강 | `part3-05-linker-script-advanced.md` | 03 |
| 66 | 76 | 2차 보강 | `part3-11-make-cmake-cross.md` | 04 |
| 67 | 76 | 2차 보강 | `part4-04-clock-setup.md` | 04 |
| 68 | 76 | 2차 보강 | `part4-08-spi-driver.md` | 05 |
| 69 | 76 | 2차 보강 | `part4-09-i2c-driver.md` | 05 |
| 70 | 76 | 2차 보강 | `part6-01-rtos-decision.md` | 07 |
| 71 | 76 | 2차 보강 | `part6-10-priority-inversion.md` | 08 |
| 72 | 76 | 2차 보강 | `part7-01-linux-boot-flow.md` | 08 |
| 73 | 76 | 2차 보강 | `part7-11-uio-vfio.md` | 09 |
| 74 | 76 | 2차 보강 | `part8-02-memory-alignment.md` | 10 |
| 75 | 76 | 2차 보강 | `part8-07-simd.md` | 10 |
| 76 | 76 | 2차 보강 | `part9-07-spinlock-vs-mutex.md` | 11 |
| 77 | 76 | 2차 보강 | `part9-08-aba-problem.md` | 11 |
| 78 | 76 | 2차 보강 | `part11-05-ps-pl-communication.md` | 13 |
| 79 | 76 | 2차 보강 | `part12-01-edge-inference.md` | 14 |
| 80 | 76 | 2차 보강 | `part12-05-tflite-micro.md` | 15 |
| 81 | 76 | 2차 보강 | `part12-06-onnx-runtime.md` | 15 |
| 82 | 77 | 2차 보강 | `00-preface.md` | 01 |
| 83 | 77 | 2차 보강 | `part3-01-cross-compiler.md` | 03 |
| 84 | 77 | 2차 보강 | `part4-03-gpio-driver.md` | 04 |
| 85 | 77 | 2차 보강 | `part4-07-uart-driver.md` | 05 |
| 86 | 77 | 2차 보강 | `part4-13-flash-programming.md` | 05 |
| 87 | 77 | 2차 보강 | `part5-01-pwm-output.md` | 05 |
| 88 | 77 | 2차 보강 | `part5-03-stepper-motor.md` | 06 |
| 89 | 77 | 2차 보강 | `part5-06-spi-oled.md` | 06 |
| 90 | 77 | 2차 보강 | `part5-11-usb-device.md` | 06 |
| 91 | 77 | 2차 보강 | `part6-03-scheduler-internals.md` | 07 |
| 92 | 77 | 2차 보강 | `part7-07-char-driver.md` | 09 |
| 93 | 77 | 2차 보강 | `part7-13-irq-affinity.md` | 09 |
| 94 | 77 | 2차 보강 | `part8-06-numa.md` | 10 |
| 95 | 77 | 2차 보강 | `part9-03-rcu-basics.md` | 11 |
| 96 | 77 | 2차 보강 | `part9-05-cas-patterns.md` | 11 |
| 97 | 77 | 2차 보강 | `part10-04-hardfault-analysis.md` | 12 |
| 98 | 77 | 2차 보강 | `part11-03-pcie-bar.md` | 13 |
| 99 | 77 | 2차 보강 | `part11-06-mailbox.md` | 13 |
| 100 | 77 | 2차 보강 | `part11-11-hls-optimization.md` | 14 |
| 101 | 77 | 2차 보강 | `part12-04-tensorrt.md` | 15 |
| 102 | 78 | 2차 보강 | `part3-12-bootloader-chain.md` | 04 |
| 103 | 78 | 2차 보강 | `part4-01-first-baremetal.md` | 04 |
| 104 | 78 | 2차 보강 | `part4-05-interrupt-handling.md` | 04 |
| 105 | 78 | 2차 보강 | `part4-10-dma-basics.md` | 05 |
| 106 | 78 | 2차 보강 | `part5-02-dc-motor.md` | 06 |
| 107 | 78 | 2차 보강 | `part5-10-can-communication.md` | 06 |
| 108 | 78 | 2차 보강 | `part6-12-rtos-debugging.md` | 08 |
| 109 | 78 | 2차 보강 | `part7-08-platform-driver.md` | 09 |
| 110 | 78 | 2차 보강 | `part7-09-mmap.md` | 09 |
| 111 | 78 | 2차 보강 | `part7-10-epoll.md` | 09 |
| 112 | 78 | 2차 보강 | `part8-01-dynamic-memory.md` | 09 |
| 113 | 78 | 2차 보강 | `part8-05-zero-copy.md` | 10 |
| 114 | 78 | 2차 보강 | `part8-10-code-size-optimization.md` | 10 |
| 115 | 78 | 2차 보강 | `part9-04-hazard-pointer.md` | 11 |
| 116 | 78 | 2차 보강 | `part9-06-atomic-cost.md` | 11 |
| 117 | 78 | 2차 보강 | `part9-09-false-sharing.md` | 11 |
| 118 | 78 | 2차 보강 | `part10-02-jtag-swd.md` | 12 |
| 119 | 78 | 2차 보강 | `part10-09-timing-race-diag.md` | 12 |
| 120 | 78 | 2차 보강 | `part10-11-logging-system.md` | 13 |
| 121 | 78 | 2차 보강 | `part11-02-vivado-usage.md` | 13 |
| 122 | 78 | 2차 보강 | `part11-04-axi.md` | 13 |
| 123 | 78 | 2차 보강 | `part11-07-cq-sq.md` | 13 |
| 124 | 78 | 2차 보강 | `part11-09-pcie-streaming.md` | 14 |
| 125 | 78 | 2차 보강 | `part12-03-quantization.md` | 14 |
| 126 | 79 | 2차 보강 | `part5-09-imu-sensor.md` | 06 |
| 127 | 79 | 2차 보강 | `part7-14-rootfs-buildroot.md` | 09 |
| 128 | 79 | 2차 보강 | `part9-01-lock-free-ring.md` | 11 |
| 129 | 79 | 2차 보강 | `part10-07-interrupt-debugging.md` | 12 |
| 130 | 79 | 2차 보강 | `part11-08-dma-completion.md` | 14 |
| 131 | 79 | 2차 보강 | `part12-08-jetson.md` | 15 |
| 132 | 80 | 검증 후 유지 | `part4-14-ddr-init-failure.md` | 05 |
| 133 | 80 | 검증 후 유지 | `part7-05-kernel-build.md` | 08 |
| 134 | 80 | 검증 후 유지 | `part8-04-dma-allocator.md` | 10 |
| 135 | 80 | 검증 후 유지 | `part8-09-stack-analysis.md` | 10 |
| 136 | 80 | 검증 후 유지 | `part8-11-power-optimization.md` | 10 |
| 137 | 80 | 검증 후 유지 | `part8-12-wcet-analysis.md` | 11 |
| 138 | 80 | 검증 후 유지 | `part10-01-debug-mindset.md` | 12 |
| 139 | 80 | 검증 후 유지 | `part10-03-gdb-remote-debug.md` | 12 |
| 140 | 80 | 검증 후 유지 | `part10-05-uart-not-printing.md` | 12 |
| 141 | 80 | 검증 후 유지 | `part10-06-boot-failure.md` | 12 |
| 142 | 80 | 검증 후 유지 | `part10-08-memory-corruption.md` | 12 |
| 143 | 80 | 검증 후 유지 | `part11-10-hls.md` | 14 |
| 144 | 80 | 검증 후 유지 | `part12-07-thermal.md` | 15 |
| 145 | 80 | 검증 후 유지 | `part12-09-zero-copy-camera.md` | 15 |
| 146 | 82 | 검증 후 유지 | `part10-10-protocol-analyzer.md` | 13 |
| 147 | 82 | 검증 후 유지 | `part10-12-postmortem-analysis.md` | 13 |
| 148 | 82 | 검증 후 유지 | `part12-10-on-device-llm.md` | 15 |
| 149 | 82 | 검증 후 유지 | `part12-11-tfm-trustzone.md` | 15 |
| 150 | 82 | 검증 후 유지 | `part12-12-matter-thread.md` | 15 |
| 151 | 83 | 검증 후 유지 | `part11-17-linux-cxl-driver.md` | 16 |
| 152 | 84 | 검증 후 유지 | `part11-16-qemu-cxl-emulation.md` | 16 |

## 운영 규칙

- 이 문서의 점수는 잠정값이며, 실제 수정 후 재평가한다.
- 원문 수정은 한 번에 한 우선순위 묶음만 처리하고 source diff·build·anchor·search parity·distribution feed 검사를 통과시킨다.
- 외부 출처 링크 추가만으로 품질이 올라갔다고 판단하지 않는다. 출처가 어떤 설계 판단·실패 조건·측정 결과를 뒷받침하는지 본문에 남긴다.
- 수치·성능·전력·정확도 주장은 보드, 칩, 런타임, 버전, 측정 조건과 함께 검증한다.
- 병합·비공개·삭제는 이 요약 점수만으로 실행하지 않고 별도 판단 기록을 남긴다.
- 상세 근거는 [rubric.md](../../docs/adsense-audit/rubric.md)와 각 루프 보고서를 기준으로 한다.
