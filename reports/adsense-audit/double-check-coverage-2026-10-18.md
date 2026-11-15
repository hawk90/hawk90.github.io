# 공개 글 평가 누락·중복·평가 후 변경 전수 대조 (2026-10-18)

기준 HEAD: `d55f8d66ece6acb8ebb274df7c843ce6b4054853`. 루브릭 v1.2. 이번 독립 재검토의 본 대상은 Recipes 이외 공개 406편의 Claude 평가다. Recipes 신규 누락·평가 후 수정 목록은 범위 대조용 부록이며 이번 재채점 대상으로 추가하지 않는다. 이 보고서는 원문 전체를 다시 채점한 결과가 아니라 공개 범위·평가행·파일 변경·형식 규칙을 전수 대조한 결과다.

## 결론

현재 글 3408편 중 공개 559편, draft 2849편이다. 공개 글은 draft YAML 값이 true가 아닌 글로 계산했다. draft 필드 없는 공개 글도 174편 포함하며, series 없는 공개 글은 0편이다.

기존 v1.2 점수는 57개 보고서의 558행이며 현재 파일 558편에 대응한다. 실제 미평가 1편, 현재 파일 중복평가 0편이다. 평가 뒤 파일 변경 59편과 미평가를 구별해야 한다. 현재 파일이 평가 스냅샷과 같은 것은 499편이다.

변경 59편은 Recipes에만 있다: 본문 개정 27편, 허브 목차·설명 변경 1편, 파일명·번호·링크 변경 11편, 링크·다음 편 안내 변경 20편. 본문 개정은 재채점 대상이며, 나머지는 F·B 및 파일/앵커 참조를 먼저 재검토한다. 파일 변경만으로 기존 점수가 틀렸다고 단정하지 않는다.

## 어느 평가에서 무엇이 빠졌나

- 초기 부분 평가 커밋 `9c200026`·`d5775b32`·`04e93c4c`: Modern Embedded Recipes 152편의 v1.1 평가와 Abseil/Folly 기계 triage. 나머지 공개 시리즈는 A~G 평가가 없었다. 초기 커밋은 모델 co-author 표기가 없어 git만으로 Codex 작성이라고 확정할 수 없다.
- Claude 명시 후속 커밋 `10550ca1`: Recipes 152편 v1.2 재평가. `c65b45da`: 독립 검증 후 37편 오류 확인으로 정리. 두 커밋에 Claude co-author가 기록되어 있다.
- Claude 명시 후속 커밋 `ba9f7104`·`d55f8d66`: 그 외 25개 시리즈 406편 전부 평가. 초기의 시리즈 누락은 여기서 해소됐다.
- 그 뒤 Recipes 수정 루프가 기존 152편 중 59편을 바꾸고 신규 1편을 분리했다. 따라서 오늘 남은 누락은 신규 1편이며, 과거 406편을 여전히 미평가라고 부르면 안 된다.
- Abseil/Folly 168편은 `7b868851`에서 draft로 전환되어 현재 공개 범위에 포함하지 않았다. rubric.md 도입의 “공개 약 726편/나머지 미착수”는 10월 11일 당시 기록이며 현재 집계가 아니다.

## 시리즈별 정확한 범위

| 시리즈 | 현재 공개 | 기존 평가 대응 | 미평가 | 평가 후 변경 | 원문 동일 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Bootloader Internals | 37 | 37 | 0 | 0 | 37 |
| BSP Development | 21 | 21 | 0 | 0 | 21 |
| Buildroot Practical | 20 | 20 | 0 | 0 | 20 |
| CMake | 9 | 9 | 0 | 0 | 9 |
| CXL 4.0 Internals | 15 | 15 | 0 | 0 | 15 |
| Driver-RTL Co-simulation | 8 | 8 | 0 | 0 | 8 |
| DWARF and ELF Internals | 6 | 6 | 0 | 0 | 6 |
| Embedded C++ for Real Systems | 41 | 41 | 0 | 0 | 41 |
| Embedded Debugging | 9 | 9 | 0 | 0 | 9 |
| Embedded Performance Engineering | 57 | 57 | 0 | 0 | 57 |
| Embedded Security | 13 | 13 | 0 | 0 | 13 |
| ESP32-C3 Mastering | 12 | 12 | 0 | 0 | 12 |
| GDB and LLDB | 12 | 12 | 0 | 0 | 12 |
| GDB Extension and IDE | 6 | 6 | 0 | 0 | 6 |
| GNU Make | 7 | 7 | 0 | 0 | 7 |
| HBM·GDDR 심화 | 12 | 12 | 0 | 0 | 12 |
| Industrial Ethernet 심화 | 12 | 12 | 0 | 0 | 12 |
| Kernel Debugging | 9 | 9 | 0 | 0 | 9 |
| Memory Diagnostics | 7 | 7 | 0 | 0 | 7 |
| Modern Embedded Recipes | 153 | 152 | 1 | 59 | 93 |
| PCIe Deep Dive | 19 | 19 | 0 | 0 | 19 |
| Postmortem Debugging | 6 | 6 | 0 | 0 | 6 |
| Practical RTOS Internals | 53 | 53 | 0 | 0 | 53 |
| Python Debugging | 5 | 5 | 0 | 0 | 5 |
| Sanitizers | 5 | 5 | 0 | 0 | 5 |
| Valgrind | 5 | 5 | 0 | 0 | 5 |

## 부록: Recipes 실제 누락 파일

- `src/content/blog/embedded/modern-recipes/part12-02-edge-pipeline-measurement.md` (seriesOrder 138)

## 부록: Recipes 평가 후 변경 전체 목록

Recipes 기준은 평가 검증 커밋 `c65b45da`, 기타 시리즈 기준은 평가 완료 커밋 `d55f8d66`이다. 원문 문자열과 git rename(-M)을 대조했다. 작은 링크 변경과 Part 12 번호 변경은 diff를 별도로 읽어 분류했다.

| 현재 파일 | 평가 당시 파일 | 기존 보고서 | 기존 점수 | 변경 종류 |
| --- | --- | --- | ---: | --- |
| `src/content/blog/embedded/modern-recipes/00-preface.md` | 동일 | modern-embedded-recipes-loop-01.md | 51 | hub-structure |
| `src/content/blog/embedded/modern-recipes/part1-04-uart-hardware.md` | 동일 | modern-embedded-recipes-loop-01.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part1-05-spi-hardware.md` | 동일 | modern-embedded-recipes-loop-01.md | 46 | content |
| `src/content/blog/embedded/modern-recipes/part1-06-i2c-hardware.md` | 동일 | modern-embedded-recipes-loop-01.md | 54 | content |
| `src/content/blog/embedded/modern-recipes/part1-07-adc-principles.md` | 동일 | modern-embedded-recipes-loop-01.md | 54 | content |
| `src/content/blog/embedded/modern-recipes/part1-09-pwm-signal.md` | 동일 | modern-embedded-recipes-loop-01.md | 46 | content |
| `src/content/blog/embedded/modern-recipes/part1-10-can-electrical.md` | 동일 | modern-embedded-recipes-loop-02.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part1-12-lvds-differential.md` | 동일 | modern-embedded-recipes-loop-02.md | 45 | content |
| `src/content/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions.md` | 동일 | modern-embedded-recipes-loop-02.md | 41 | content |
| `src/content/blog/embedded/modern-recipes/part2-06-arm-cache.md` | 동일 | modern-embedded-recipes-loop-02.md | 45 | content |
| `src/content/blog/embedded/modern-recipes/part2-07-arm-mpu.md` | 동일 | modern-embedded-recipes-loop-02.md | 51 | content |
| `src/content/blog/embedded/modern-recipes/part2-08-arm-mmu.md` | 동일 | modern-embedded-recipes-loop-03.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part3-10-map-file-analysis.md` | 동일 | modern-embedded-recipes-loop-04.md | 57 | content |
| `src/content/blog/embedded/modern-recipes/part3-11-make-cmake-cross.md` | 동일 | modern-embedded-recipes-loop-04.md | 56 | content |
| `src/content/blog/embedded/modern-recipes/part4-03-gpio-driver.md` | 동일 | modern-embedded-recipes-loop-04.md | 61 | content |
| `src/content/blog/embedded/modern-recipes/part4-06-systick-timer.md` | 동일 | modern-embedded-recipes-loop-05.md | 61 | content |
| `src/content/blog/embedded/modern-recipes/part4-08-spi-driver.md` | 동일 | modern-embedded-recipes-loop-05.md | 50 | navigation |
| `src/content/blog/embedded/modern-recipes/part4-09-i2c-driver.md` | 동일 | modern-embedded-recipes-loop-05.md | 53 | content |
| `src/content/blog/embedded/modern-recipes/part4-10-dma-basics.md` | 동일 | modern-embedded-recipes-loop-05.md | 60 | navigation |
| `src/content/blog/embedded/modern-recipes/part4-11-low-power-modes.md` | 동일 | modern-embedded-recipes-loop-05.md | 48 | content |
| `src/content/blog/embedded/modern-recipes/part4-12-watchdog.md` | 동일 | modern-embedded-recipes-loop-05.md | 63 | content |
| `src/content/blog/embedded/modern-recipes/part5-07-tft-display.md` | 동일 | modern-embedded-recipes-loop-06.md | 53 | content |
| `src/content/blog/embedded/modern-recipes/part5-10-can-communication.md` | 동일 | modern-embedded-recipes-loop-06.md | 58 | navigation |
| `src/content/blog/embedded/modern-recipes/part5-11-usb-device.md` | 동일 | modern-embedded-recipes-loop-06.md | 61 | navigation |
| `src/content/blog/embedded/modern-recipes/part5-12-ethernet-mac-phy.md` | 동일 | modern-embedded-recipes-loop-07.md | 54 | navigation |
| `src/content/blog/embedded/modern-recipes/part5-13-sd-card-fatfs.md` | 동일 | modern-embedded-recipes-loop-07.md | 57 | content |
| `src/content/blog/embedded/modern-recipes/part5-14-rtc-utilization.md` | 동일 | modern-embedded-recipes-loop-07.md | 56 | content |
| `src/content/blog/embedded/modern-recipes/part6-04-semaphore-usage.md` | 동일 | modern-embedded-recipes-loop-07.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part6-11-timer-services.md` | 동일 | modern-embedded-recipes-loop-08.md | 47 | content |
| `src/content/blog/embedded/modern-recipes/part7-01-linux-boot-flow.md` | 동일 | modern-embedded-recipes-loop-08.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part7-02-uboot-usage.md` | 동일 | modern-embedded-recipes-loop-08.md | 55 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-04-device-tree-overlay.md` | 동일 | modern-embedded-recipes-loop-08.md | 56 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-05-kernel-build.md` | 동일 | modern-embedded-recipes-loop-08.md | 50 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-08-platform-driver.md` | 동일 | modern-embedded-recipes-loop-09.md | 51 | content |
| `src/content/blog/embedded/modern-recipes/part7-09-mmap.md` | 동일 | modern-embedded-recipes-loop-09.md | 49 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-10-epoll.md` | 동일 | modern-embedded-recipes-loop-09.md | 53 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-13-irq-affinity.md` | 동일 | modern-embedded-recipes-loop-09.md | 53 | content |
| `src/content/blog/embedded/modern-recipes/part7-14-rootfs-buildroot.md` | 동일 | modern-embedded-recipes-loop-09.md | 56 | navigation |
| `src/content/blog/embedded/modern-recipes/part8-04-dma-allocator.md` | 동일 | modern-embedded-recipes-loop-10.md | 53 | navigation |
| `src/content/blog/embedded/modern-recipes/part8-06-numa.md` | 동일 | modern-embedded-recipes-loop-10.md | 50 | navigation |
| `src/content/blog/embedded/modern-recipes/part10-05-uart-not-printing.md` | 동일 | modern-embedded-recipes-loop-12.md | 58 | navigation |
| `src/content/blog/embedded/modern-recipes/part11-11-hls-optimization.md` | 동일 | modern-embedded-recipes-loop-14.md | 44 | navigation |
| `src/content/blog/embedded/modern-recipes/part11-12-vitis-ai.md` | 동일 | modern-embedded-recipes-loop-14.md | 53 | navigation |
| `src/content/blog/embedded/modern-recipes/part11-14-intel-quartus.md` | 동일 | modern-embedded-recipes-loop-14.md | 51 | navigation |
| `src/content/blog/embedded/modern-recipes/part12-01-edge-inference.md` | 동일 | modern-embedded-recipes-loop-14.md | 48 | content |
| `src/content/blog/embedded/modern-recipes/part12-03-npu-architecture.md` | `src/content/blog/embedded/modern-recipes/part12-02-npu-architecture.md` | modern-embedded-recipes-loop-14.md | 43 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-04-quantization.md` | `src/content/blog/embedded/modern-recipes/part12-03-quantization.md` | modern-embedded-recipes-loop-14.md | 57 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-05-tensorrt.md` | `src/content/blog/embedded/modern-recipes/part12-04-tensorrt.md` | modern-embedded-recipes-loop-15.md | 52 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-06-tflite-micro.md` | `src/content/blog/embedded/modern-recipes/part12-05-tflite-micro.md` | modern-embedded-recipes-loop-15.md | 51 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-07-onnx-runtime.md` | `src/content/blog/embedded/modern-recipes/part12-06-onnx-runtime.md` | modern-embedded-recipes-loop-15.md | 46 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-08-thermal.md` | `src/content/blog/embedded/modern-recipes/part12-07-thermal.md` | modern-embedded-recipes-loop-15.md | 57 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-09-jetson.md` | `src/content/blog/embedded/modern-recipes/part12-08-jetson.md` | modern-embedded-recipes-loop-15.md | 53 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-10-zero-copy-camera.md` | `src/content/blog/embedded/modern-recipes/part12-09-zero-copy-camera.md` | modern-embedded-recipes-loop-15.md | 64 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-11-on-device-llm.md` | `src/content/blog/embedded/modern-recipes/part12-10-on-device-llm.md` | modern-embedded-recipes-loop-15.md | 74 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-12-tfm-trustzone.md` | `src/content/blog/embedded/modern-recipes/part12-11-tfm-trustzone.md` | modern-embedded-recipes-loop-15.md | 69 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-13-matter-thread.md` | `src/content/blog/embedded/modern-recipes/part12-12-matter-thread.md` | modern-embedded-recipes-loop-15.md | 68 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part11-15-pcie-to-cxl.md` | 동일 | modern-embedded-recipes-loop-15.md | 52 | navigation |
| `src/content/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation.md` | 동일 | modern-embedded-recipes-loop-16.md | 66 | navigation |
| `src/content/blog/embedded/modern-recipes/part11-17-linux-cxl-driver.md` | 동일 | modern-embedded-recipes-loop-16.md | 60 | navigation |

## 기계 전수검사

57개 보고서의 유효한 v1.2 표만 읽었다. Recipes에 참고용으로 남은 v1.1 표와 published의 1차/최종 대조 표는 중복 평가행으로 세지 않았다. A~G 상한·합계, factcheck/confidence 값, 오류 확인 우선, 유지·검증 대기 게이트, 판정 구간·허브/강한 중복 예외, score_status 공통선언, 글별 uncertainties와 A~G 근거 표식의 존재를 검사했다. 기계 문제 표시 행: 0편.

기계검사는 근거 문장이 실제 원문과 맞는지, D 비교가 타당한지, C 상한의 실질 조건이 성립하는지 증명하지 않는다. 본문 재채점·1차 자료 대조는 별도다. `source_file` 등 YAML 예시의 모든 키를 Markdown에 문자 그대로 요구하지 않고 표·공통선언·글별 블록으로 기록된 동등 정보를 검사했다.


### 점수 구간의 명시 예외

- `src/content/blog/embedded/modern-recipes/00-preface.md`: 51점 보강 — 허브 예외
- `src/content/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation.md`: 66점 병합 검토 — 강한 중복 예외 — 수동 근거 확인 대상
- `src/content/blog/embedded/bootloader/chapter01-boot-problem.md`: 52점 보강 — 허브 예외
- `src/content/blog/embedded/bsp/chapter01-what-is-bsp.md`: 55점 보강 — 허브 예외
- `src/content/blog/embedded/hardware/cxl/chapter01-cxl-position.md`: 54점 보강 — 허브 예외
- `src/content/blog/tools/emulation/driver-cosim/chapter01-why-cosim.md`: 51점 보강 — 허브 예외
- `src/content/blog/embedded/embedded-cpp/00-preface.md`: 45점 보강 — 허브 예외
- `src/content/blog/embedded/performance-engineering/00-preface.md`: 42점 보강 — 허브 예외
- `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview.md`: 52점 보강 — 허브 예외
- `src/content/blog/embedded/hardware/hbm/chapter01-overview.md`: 50점 보강 — 허브 예외
- `src/content/blog/embedded/rtos/practical-internals/00-preface.md`: 55점 보강 — 허브 예외
- `src/content/blog/tools/debugging/sanitizers/chapter01-intro.md`: 53점 보강 — 허브 예외

## 부록: Recipes 후속 작업 후보 (이번에는 실행하지 않음)

1. `src/content/blog/embedded/modern-recipes/part12-02-edge-pipeline-measurement.md`
2. `src/content/blog/embedded/modern-recipes/part1-04-uart-hardware.md`
3. `src/content/blog/embedded/modern-recipes/part1-05-spi-hardware.md`
4. `src/content/blog/embedded/modern-recipes/part1-06-i2c-hardware.md`
5. `src/content/blog/embedded/modern-recipes/part1-07-adc-principles.md`
6. `src/content/blog/embedded/modern-recipes/part1-09-pwm-signal.md`
7. `src/content/blog/embedded/modern-recipes/part1-10-can-electrical.md`
8. `src/content/blog/embedded/modern-recipes/part1-12-lvds-differential.md`
9. `src/content/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions.md`
10. `src/content/blog/embedded/modern-recipes/part2-06-arm-cache.md`

## 현재 공개 전체 파일 목록

모든 파일의 점수·구버전 경로·보고서·검사 결과는 동명 JSON의 articles 배열에 있다. 변경 표시는 기존 점수의 검토 필요성을 뜻한다.

| 현재 파일 | 시리즈 순서 | 기존 보고서 | 점수 | 상태 |
| --- | ---: | --- | ---: | --- |
| `src/content/blog/embedded/bootloader/chapter01-boot-problem.md` | 1 | published-loop-01.md | 52 | unchanged |
| `src/content/blog/embedded/bootloader/chapter02-u-boot-position.md` | 2 | published-loop-01.md | 52 | unchanged |
| `src/content/blog/embedded/bootloader/chapter03-build-system.md` | 3 | published-loop-01.md | 49 | unchanged |
| `src/content/blog/embedded/bootloader/chapter04-boot-stages.md` | 4 | published-loop-01.md | 52 | unchanged |
| `src/content/blog/embedded/bootloader/chapter05-falcon-mode.md` | 5 | published-loop-01.md | 58 | unchanged |
| `src/content/blog/embedded/bootloader/chapter06-device-tree.md` | 6 | published-loop-01.md | 61 | unchanged |
| `src/content/blog/embedded/bootloader/chapter07-driver-model.md` | 7 | published-loop-01.md | 63 | unchanged |
| `src/content/blog/embedded/bootloader/chapter08-board-init.md` | 8 | published-loop-01.md | 57 | unchanged |
| `src/content/blog/embedded/bootloader/chapter09-dram-init.md` | 9 | published-loop-01.md | 48 | unchanged |
| `src/content/blog/embedded/bootloader/chapter10-storage-boot.md` | 10 | published-loop-01.md | 58 | unchanged |
| `src/content/blog/embedded/bootloader/chapter11-network-boot.md` | 11 | published-loop-02.md | 63 | unchanged |
| `src/content/blog/embedded/bootloader/chapter12-usb-boot.md` | 12 | published-loop-02.md | 58 | unchanged |
| `src/content/blog/embedded/bootloader/chapter13-env-bootcmd.md` | 13 | published-loop-02.md | 53 | unchanged |
| `src/content/blog/embedded/bootloader/chapter14-bootflow-bootmeth.md` | 14 | published-loop-02.md | 55 | unchanged |
| `src/content/blog/embedded/bootloader/chapter15-fit-image.md` | 15 | published-loop-02.md | 53 | unchanged |
| `src/content/blog/embedded/bootloader/chapter16-verified-boot.md` | 16 | published-loop-02.md | 59 | unchanged |
| `src/content/blog/embedded/bootloader/chapter17-ab-update.md` | 17 | published-loop-02.md | 60 | unchanged |
| `src/content/blog/embedded/bootloader/chapter18-efi-in-uboot.md` | 18 | published-loop-02.md | 52 | unchanged |
| `src/content/blog/embedded/bootloader/chapter19-kernel-handoff.md` | 19 | published-loop-02.md | 50 | unchanged |
| `src/content/blog/embedded/bootloader/chapter20-rauc-swupdate.md` | 20 | published-loop-02.md | 49 | unchanged |
| `src/content/blog/embedded/bootloader/chapter21-board-porting.md` | 21 | published-loop-03.md | 46 | unchanged |
| `src/content/blog/embedded/bootloader/chapter22-debugging.md` | 22 | published-loop-03.md | 50 | unchanged |
| `src/content/blog/embedded/bootloader/chapter23-bootrom-efuse-otp.md` | 23 | published-loop-03.md | 58 | unchanged |
| `src/content/blog/embedded/bootloader/chapter24-spl-deep.md` | 24 | published-loop-03.md | 48 | unchanged |
| `src/content/blog/embedded/bootloader/chapter25-tfa-optee.md` | 25 | published-loop-03.md | 56 | unchanged |
| `src/content/blog/embedded/bootloader/chapter26-ddr-training.md` | 26 | published-loop-03.md | 54 | unchanged |
| `src/content/blog/embedded/bootloader/chapter27-chain-of-trust.md` | 27 | published-loop-03.md | 58 | unchanged |
| `src/content/blog/embedded/bootloader/chapter28-flash-layout.md` | 28 | published-loop-03.md | 56 | unchanged |
| `src/content/blog/embedded/bootloader/chapter29-distro-boot.md` | 29 | published-loop-03.md | 54 | unchanged |
| `src/content/blog/embedded/bootloader/chapter30-bootloader-ci.md` | 30 | published-loop-03.md | 58 | unchanged |
| `src/content/blog/embedded/bootloader/chapter31-tfa-bl31-runtime.md` | 31 | published-loop-04.md | 56 | unchanged |
| `src/content/blog/embedded/bootloader/chapter32-psci-smccc.md` | 32 | published-loop-04.md | 59 | unchanged |
| `src/content/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup.md` | 33 | published-loop-04.md | 58 | unchanged |
| `src/content/blog/embedded/bootloader/chapter34-pcie-enumeration.md` | 34 | published-loop-04.md | 45 | unchanged |
| `src/content/blog/embedded/bootloader/chapter35-uefi-cxl-init.md` | 35 | published-loop-04.md | 46 | unchanged |
| `src/content/blog/embedded/bootloader/chapter36-boot-memory-topology.md` | 36 | published-loop-04.md | 48 | unchanged |
| `src/content/blog/embedded/bootloader/chapter37-secureboot-cert-rollover.md` | 37 | published-loop-04.md | 66 | unchanged |
| `src/content/blog/embedded/bsp/chapter01-what-is-bsp.md` | 1 | published-loop-04.md | 55 | unchanged |
| `src/content/blog/embedded/bsp/chapter02-datasheet.md` | 2 | published-loop-04.md | 57 | unchanged |
| `src/content/blog/embedded/bsp/chapter03-device-tree-design.md` | 3 | published-loop-04.md | 51 | unchanged |
| `src/content/blog/embedded/bsp/chapter04-pinmux-clock.md` | 4 | published-loop-05.md | 57 | unchanged |
| `src/content/blog/embedded/bsp/chapter05-ddr-params.md` | 5 | published-loop-05.md | 52 | unchanged |
| `src/content/blog/embedded/bsp/chapter06-u-boot-porting.md` | 6 | published-loop-05.md | 54 | unchanged |
| `src/content/blog/embedded/bsp/chapter07-tfa-trustzone.md` | 7 | published-loop-05.md | 60 | unchanged |
| `src/content/blog/embedded/bsp/chapter08-kernel-config.md` | 8 | published-loop-05.md | 49 | unchanged |
| `src/content/blog/embedded/bsp/chapter09-smp-bringup.md` | 9 | published-loop-05.md | 41 | unchanged |
| `src/content/blog/embedded/bsp/chapter10-first-boot.md` | 10 | published-loop-05.md | 50 | unchanged |
| `src/content/blog/embedded/bsp/chapter11-bootlog-debugging.md` | 11 | published-loop-05.md | 56 | unchanged |
| `src/content/blog/embedded/bsp/chapter12-driver-add.md` | 12 | published-loop-05.md | 51 | unchanged |
| `src/content/blog/embedded/bsp/chapter13-power-management.md` | 13 | published-loop-05.md | 52 | unchanged |
| `src/content/blog/embedded/bsp/chapter14-thermal-watchdog.md` | 14 | published-loop-06.md | 51 | unchanged |
| `src/content/blog/embedded/bsp/chapter15-boot-time-optimization.md` | 15 | published-loop-06.md | 57 | unchanged |
| `src/content/blog/embedded/bsp/chapter16-rootfs.md` | 16 | published-loop-06.md | 52 | unchanged |
| `src/content/blog/embedded/bsp/chapter17-image-packaging.md` | 17 | published-loop-06.md | 52 | unchanged |
| `src/content/blog/embedded/bsp/chapter18-ota-recovery.md` | 18 | published-loop-06.md | 46 | unchanged |
| `src/content/blog/embedded/bsp/chapter19-stability-testing.md` | 19 | published-loop-06.md | 55 | unchanged |
| `src/content/blog/embedded/bsp/chapter20-production.md` | 20 | published-loop-06.md | 50 | unchanged |
| `src/content/blog/embedded/bsp/chapter21-maintenance.md` | 21 | published-loop-06.md | 53 | unchanged |
| `src/content/blog/embedded/buildroot/chapter01-problem.md` | 1 | published-loop-06.md | 60 | unchanged |
| `src/content/blog/embedded/buildroot/chapter02-directory-structure.md` | 2 | published-loop-06.md | 51 | unchanged |
| `src/content/blog/embedded/buildroot/chapter03-kconfig.md` | 3 | published-loop-07.md | 51 | unchanged |
| `src/content/blog/embedded/buildroot/chapter04-first-build.md` | 4 | published-loop-07.md | 57 | unchanged |
| `src/content/blog/embedded/buildroot/chapter05-package-system.md` | 5 | published-loop-07.md | 49 | unchanged |
| `src/content/blog/embedded/buildroot/chapter06-br2-external.md` | 6 | published-loop-07.md | 53 | unchanged |
| `src/content/blog/embedded/buildroot/chapter07-board-customize.md` | 7 | published-loop-07.md | 60 | unchanged |
| `src/content/blog/embedded/buildroot/chapter08-filesystems.md` | 8 | published-loop-07.md | 64 | unchanged |
| `src/content/blog/embedded/buildroot/chapter09-new-package.md` | 9 | published-loop-07.md | 55 | unchanged |
| `src/content/blog/embedded/buildroot/chapter10-real-board.md` | 10 | published-loop-07.md | 58 | unchanged |
| `src/content/blog/embedded/buildroot/chapter11-toolchain.md` | 11 | published-loop-07.md | 63 | unchanged |
| `src/content/blog/embedded/buildroot/chapter12-kernel-customize.md` | 12 | published-loop-07.md | 61 | unchanged |
| `src/content/blog/embedded/buildroot/chapter13-uboot-integration.md` | 13 | published-loop-08.md | 55 | unchanged |
| `src/content/blog/embedded/buildroot/chapter14-build-caching.md` | 14 | published-loop-08.md | 55 | unchanged |
| `src/content/blog/embedded/buildroot/chapter15-post-build-deep.md` | 15 | published-loop-08.md | 52 | unchanged |
| `src/content/blog/embedded/buildroot/chapter16-ota.md` | 16 | published-loop-08.md | 55 | unchanged |
| `src/content/blog/embedded/buildroot/chapter17-sdk.md` | 17 | published-loop-08.md | 60 | unchanged |
| `src/content/blog/embedded/buildroot/chapter18-security-cve.md` | 18 | published-loop-08.md | 59 | unchanged |
| `src/content/blog/embedded/buildroot/chapter19-cicd.md` | 19 | published-loop-08.md | 58 | unchanged |
| `src/content/blog/embedded/buildroot/chapter20-yocto-migration.md` | 20 | published-loop-08.md | 56 | unchanged |
| `src/content/blog/tools/build/cmake/chapter01-intro.md` | 1 | published-loop-08.md | 57 | unchanged |
| `src/content/blog/tools/build/cmake/chapter02-language.md` | 2 | published-loop-08.md | 59 | unchanged |
| `src/content/blog/tools/build/cmake/chapter03-targets.md` | 3 | published-loop-09.md | 60 | unchanged |
| `src/content/blog/tools/build/cmake/chapter04-options.md` | 4 | published-loop-09.md | 53 | unchanged |
| `src/content/blog/tools/build/cmake/chapter05-find-package.md` | 5 | published-loop-09.md | 54 | unchanged |
| `src/content/blog/tools/build/cmake/chapter06-testing.md` | 6 | published-loop-09.md | 58 | unchanged |
| `src/content/blog/tools/build/cmake/chapter07-install.md` | 7 | published-loop-09.md | 61 | unchanged |
| `src/content/blog/tools/build/cmake/chapter08-best-practices.md` | 8 | published-loop-09.md | 52 | unchanged |
| `src/content/blog/tools/build/cmake/chapter09-modern-advanced.md` | 9 | published-loop-09.md | 53 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter01-cxl-position.md` | 1 | published-loop-09.md | 54 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter02-system-architecture.md` | 2 | published-loop-09.md | 57 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter03-coherency-model.md` | 3 | published-loop-09.md | 60 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter04-pooling-gfam.md` | 4 | published-loop-10.md | 54 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter05-cxl-4-features.md` | 5 | published-loop-10.md | 52 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter06-cxl-io.md` | 6 | published-loop-10.md | 62 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter07-cxl-cache.md` | 7 | published-loop-10.md | 59 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter08-cxl-mem.md` | 8 | published-loop-10.md | 61 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter09-flit-format.md` | 9 | published-loop-10.md | 66 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter10-arb-mux.md` | 10 | published-loop-10.md | 63 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter11-linux-driver.md` | 11 | published-loop-10.md | 55 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter12-qemu-emulation.md` | 12 | published-loop-10.md | 61 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter13-switching-fabric.md` | 13 | published-loop-10.md | 61 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter14-security.md` | 14 | published-loop-11.md | 51 | unchanged |
| `src/content/blog/embedded/hardware/cxl/chapter15-ras-performance.md` | 15 | published-loop-11.md | 59 | unchanged |
| `src/content/blog/tools/emulation/driver-cosim/chapter01-why-cosim.md` | 1 | published-loop-11.md | 51 | unchanged |
| `src/content/blog/tools/emulation/driver-cosim/chapter02-dpi-c-basics.md` | 2 | published-loop-11.md | 48 | unchanged |
| `src/content/blog/tools/emulation/driver-cosim/chapter03-verilator.md` | 3 | published-loop-11.md | 50 | unchanged |
| `src/content/blog/tools/emulation/driver-cosim/chapter04-cocotb.md` | 4 | published-loop-11.md | 47 | unchanged |
| `src/content/blog/tools/emulation/driver-cosim/chapter05-systemc-tlm.md` | 5 | published-loop-11.md | 47 | unchanged |
| `src/content/blog/tools/emulation/driver-cosim/chapter06-bfm.md` | 6 | published-loop-11.md | 47 | unchanged |
| `src/content/blog/tools/emulation/driver-cosim/chapter07-uvm-c-model.md` | 7 | published-loop-11.md | 53 | unchanged |
| `src/content/blog/tools/emulation/driver-cosim/chapter08-end-to-end.md` | 8 | published-loop-11.md | 52 | unchanged |
| `src/content/blog/tools/debugging/dwarf-elf/chapter01-elf-overview.md` | 1 | published-loop-12.md | 51 | unchanged |
| `src/content/blog/tools/debugging/dwarf-elf/chapter02-dwarf-overview.md` | 2 | published-loop-12.md | 53 | unchanged |
| `src/content/blog/tools/debugging/dwarf-elf/chapter03-debug-line.md` | 3 | published-loop-12.md | 58 | unchanged |
| `src/content/blog/tools/debugging/dwarf-elf/chapter04-debug-loc.md` | 4 | published-loop-12.md | 60 | unchanged |
| `src/content/blog/tools/debugging/dwarf-elf/chapter05-cfi-eh-frame.md` | 5 | published-loop-12.md | 60 | unchanged |
| `src/content/blog/tools/debugging/dwarf-elf/chapter06-split-dwarf-tools.md` | 6 | published-loop-12.md | 50 | unchanged |
| `src/content/blog/embedded/embedded-cpp/00-preface.md` | 0 | published-loop-12.md | 45 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part1-01-cpp-vs-c.md` | 1 | published-loop-12.md | 53 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part1-02-compiler-flags.md` | 2 | published-loop-12.md | 54 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part1-03-runtime-requirements.md` | 3 | published-loop-12.md | 49 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part1-04-code-size-analysis.md` | 4 | published-loop-13.md | 52 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part1-05-abi-compatibility.md` | 5 | published-loop-13.md | 49 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part1-06-startup-code.md` | 6 | published-loop-13.md | 47 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part1-07-linker-scripts.md` | 7 | published-loop-13.md | 46 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice.md` | 8 | published-loop-13.md | 56 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-01-raii-basics.md` | 9 | published-loop-13.md | 49 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-02-raii-patterns.md` | 10 | published-loop-13.md | 46 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-03-constexpr-basics.md` | 11 | published-loop-13.md | 52 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-04-constexpr-advanced.md` | 12 | published-loop-13.md | 48 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-05-consteval-constinit.md` | 13 | published-loop-13.md | 52 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-06-templates-basics.md` | 14 | published-loop-14.md | 53 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-07-templates-cost.md` | 15 | published-loop-14.md | 53 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-08-static-polymorphism.md` | 16 | published-loop-14.md | 52 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-09-type-traits.md` | 17 | published-loop-14.md | 59 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part2-10-concepts.md` | 18 | published-loop-14.md | 54 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc.md` | 19 | published-loop-14.md | 52 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics.md` | 20 | published-loop-14.md | 46 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-03-pool-allocator.md` | 21 | published-loop-14.md | 50 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-04-pmr.md` | 22 | published-loop-14.md | 50 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-05-no-exception-design.md` | 23 | published-loop-14.md | 48 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-06-error-handling-patterns.md` | 24 | published-loop-15.md | 46 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-07-expected.md` | 25 | published-loop-15.md | 51 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-08-no-rtti-design.md` | 26 | published-loop-15.md | 55 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice.md` | 27 | published-loop-15.md | 52 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part3-10-ownership-model.md` | 28 | published-loop-15.md | 48 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part4-01-intrusive-containers.md` | 29 | published-loop-15.md | 53 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part4-02-etl-library.md` | 30 | published-loop-15.md | 47 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part4-03-lock-free-basics.md` | 31 | published-loop-15.md | 48 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part4-04-lock-free-container.md` | 32 | published-loop-15.md | 48 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part4-05-type-safe-flags.md` | 33 | published-loop-15.md | 47 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part4-06-state-machine.md` | 34 | published-loop-16.md | 46 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part4-07-compile-time-fsm.md` | 35 | published-loop-16.md | 50 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part4-08-singleton-alternatives.md` | 36 | published-loop-16.md | 47 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part5-01-register-abstraction.md` | 37 | published-loop-16.md | 47 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part5-02-gpio-abstraction.md` | 38 | published-loop-16.md | 44 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction.md` | 39 | published-loop-16.md | 43 | unchanged |
| `src/content/blog/embedded/embedded-cpp/part5-04-hal-design-patterns.md` | 40 | published-loop-16.md | 46 | unchanged |
| `src/content/blog/tools/debugging/embedded/chapter01-rsp-protocol.md` | 1 | published-loop-16.md | 55 | unchanged |
| `src/content/blog/tools/debugging/embedded/chapter02-jtag-swd-coresight.md` | 2 | published-loop-16.md | 59 | unchanged |
| `src/content/blog/tools/debugging/embedded/chapter03-openocd.md` | 3 | published-loop-16.md | 58 | unchanged |
| `src/content/blog/tools/debugging/embedded/chapter04-jlink.md` | 4 | published-loop-17.md | 52 | unchanged |
| `src/content/blog/tools/debugging/embedded/chapter05-elf-map.md` | 5 | published-loop-17.md | 50 | unchanged |
| `src/content/blog/tools/debugging/embedded/chapter06-trace.md` | 6 | published-loop-17.md | 53 | unchanged |
| `src/content/blog/tools/debugging/embedded/chapter07-rtos-troubleshooting.md` | 7 | published-loop-17.md | 44 | unchanged |
| `src/content/blog/tools/debugging/embedded/chapter08-cxl-link-debug.md` | 8 | published-loop-17.md | 53 | unchanged |
| `src/content/blog/tools/debugging/embedded/chapter09-cxl-device-troubleshoot.md` | 9 | published-loop-17.md | 60 | unchanged |
| `src/content/blog/embedded/performance-engineering/00-preface.md` | 0 | published-loop-17.md | 42 | unchanged |
| `src/content/blog/embedded/performance-engineering/part1-01-methodology.md` | 1 | published-loop-17.md | 48 | unchanged |
| `src/content/blog/embedded/performance-engineering/part1-02-metrics.md` | 2 | published-loop-17.md | 40 | unchanged |
| `src/content/blog/embedded/performance-engineering/part1-03-measurement.md` | 3 | published-loop-17.md | 44 | unchanged |
| `src/content/blog/embedded/performance-engineering/part1-04-statistics.md` | 4 | published-loop-18.md | 52 | unchanged |
| `src/content/blog/embedded/performance-engineering/part1-05-realtime.md` | 5 | published-loop-18.md | 42 | unchanged |
| `src/content/blog/embedded/performance-engineering/part1-06-benchmark.md` | 6 | published-loop-18.md | 45 | unchanged |
| `src/content/blog/embedded/performance-engineering/part1-07-modeling.md` | 7 | published-loop-18.md | 44 | unchanged |
| `src/content/blog/embedded/performance-engineering/part1-08-profiling-overview.md` | 8 | published-loop-18.md | 43 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-01-pipeline.md` | 9 | published-loop-18.md | 42 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-02-pipeline-stall.md` | 10 | published-loop-18.md | 44 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-03-branch-prediction.md` | 11 | published-loop-18.md | 46 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-04-speculative-execution.md` | 12 | published-loop-18.md | 46 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-05-cache-basics.md` | 13 | published-loop-18.md | 47 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-06-cache-miss.md` | 14 | published-loop-19.md | 47 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-07-cache-line.md` | 15 | published-loop-19.md | 41 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-08-memory-bandwidth.md` | 16 | published-loop-19.md | 43 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-09-simd-neon.md` | 17 | published-loop-19.md | 38 | unchanged |
| `src/content/blog/embedded/performance-engineering/part2-10-pmu.md` | 18 | published-loop-19.md | 45 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-01-bus-architecture.md` | 19 | published-loop-19.md | 44 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-02-bus-contention.md` | 20 | published-loop-19.md | 48 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-03-dma-performance.md` | 21 | published-loop-19.md | 41 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-04-dma-vs-cpu.md` | 22 | published-loop-19.md | 47 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-05-interrupt-latency.md` | 23 | published-loop-19.md | 42 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-06-interrupt-storm.md` | 24 | published-loop-20.md | 46 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-07-mmio.md` | 25 | published-loop-20.md | 40 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-08-peripheral-clock.md` | 26 | published-loop-20.md | 40 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-09-power-vs-performance.md` | 27 | published-loop-20.md | 44 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-10-thermal.md` | 28 | published-loop-20.md | 37 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-11-cxl-interconnect.md` | 29 | published-loop-20.md | 48 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-01-concurrency-basics.md` | 30 | published-loop-20.md | 40 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-02-false-sharing.md` | 31 | published-loop-20.md | 46 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-03-lock-contention.md` | 32 | published-loop-20.md | 51 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-04-spinlock.md` | 33 | published-loop-20.md | 43 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-05-mutex.md` | 34 | published-loop-21.md | 49 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-06-rw-lock.md` | 35 | published-loop-21.md | 49 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-07-lock-free.md` | 36 | published-loop-21.md | 51 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-08-memory-ordering.md` | 37 | published-loop-21.md | 43 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-09-cache-coherency.md` | 38 | published-loop-21.md | 47 | unchanged |
| `src/content/blog/embedded/performance-engineering/part4-10-smp-analysis.md` | 39 | published-loop-21.md | 43 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-01-perf-basics.md` | 40 | published-loop-21.md | 52 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-02-perf-advanced.md` | 41 | published-loop-21.md | 43 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-03-ftrace.md` | 42 | published-loop-21.md | 46 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-04-ebpf.md` | 43 | published-loop-21.md | 51 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-05-flamegraph.md` | 44 | published-loop-22.md | 58 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-06-arm-ds-lauterbach.md` | 45 | published-loop-22.md | 54 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-07-baremetal-profiling.md` | 46 | published-loop-22.md | 46 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-08-nsight.md` | 47 | published-loop-22.md | 54 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-09-tracy-hotspot.md` | 48 | published-loop-22.md | 53 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-10-ebpf-continuous.md` | 49 | published-loop-22.md | 49 | unchanged |
| `src/content/blog/embedded/performance-engineering/part6-01-case-isr-latency.md` | 50 | published-loop-22.md | 61 | unchanged |
| `src/content/blog/embedded/performance-engineering/part6-02-case-cache-thrashing.md` | 51 | published-loop-22.md | 57 | unchanged |
| `src/content/blog/embedded/performance-engineering/part6-03-case-lock-contention.md` | 52 | published-loop-22.md | 63 | unchanged |
| `src/content/blog/embedded/performance-engineering/part6-04-case-dma-tuning.md` | 53 | published-loop-22.md | 53 | unchanged |
| `src/content/blog/embedded/performance-engineering/part3-12-cxl-mem-latency.md` | 54 | published-loop-23.md | 37 | unchanged |
| `src/content/blog/embedded/performance-engineering/part5-11-cxl-profiling-tools.md` | 55 | published-loop-23.md | 58 | unchanged |
| `src/content/blog/embedded/performance-engineering/part6-05-case-cxl-llm-kv-cache.md` | 56 | published-loop-23.md | 49 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter01-threat-model.md` | 1 | published-loop-23.md | 53 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter02-secure-boot.md` | 2 | published-loop-23.md | 51 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter03-mcu-crypto.md` | 3 | published-loop-23.md | 48 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter04-trustzone.md` | 4 | published-loop-23.md | 45 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter05-tee.md` | 5 | published-loop-23.md | 60 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter06-ota-update.md` | 6 | published-loop-23.md | 54 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter07-side-channel.md` | 7 | published-loop-23.md | 56 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter08-iot-standards.md` | 8 | published-loop-24.md | 52 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter09-firmware-analysis.md` | 9 | published-loop-24.md | 65 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter10-sdlc.md` | 10 | published-loop-24.md | 57 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter11-pcie-cxl-ide.md` | 11 | published-loop-24.md | 51 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter12-spdm-cma.md` | 12 | published-loop-24.md | 61 | unchanged |
| `src/content/blog/embedded/embedded-security/chapter13-cxl-tee.md` | 13 | published-loop-24.md | 56 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter01-overview.md` | 1 | published-loop-24.md | 52 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter02-riscv-core.md` | 2 | published-loop-24.md | 54 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter03-memory-flash.md` | 3 | published-loop-24.md | 49 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm.md` | 4 | published-loop-24.md | 44 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s.md` | 5 | published-loop-25.md | 52 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch.md` | 6 | published-loop-25.md | 48 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter07-wifi-stack.md` | 7 | published-loop-25.md | 57 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter08-ble-gap-gatt.md` | 8 | published-loop-25.md | 54 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter09-esp-idf-build.md` | 9 | published-loop-25.md | 50 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter10-freertos.md` | 10 | published-loop-25.md | 51 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter11-security.md` | 11 | published-loop-25.md | 58 | unchanged |
| `src/content/blog/embedded/riscv/esp32-c3-mastering/chapter12-power-management.md` | 12 | published-loop-25.md | 53 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter01-intro-and-install.md` | 1 | published-loop-25.md | 50 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter02-basic-commands.md` | 2 | published-loop-25.md | 52 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter03-inspecting-state.md` | 3 | published-loop-26.md | 52 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter04-backtrace-frames.md` | 4 | published-loop-26.md | 52 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter05-breakpoints-watchpoints.md` | 5 | published-loop-26.md | 50 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter06-multithread-multiprocess.md` | 6 | published-loop-26.md | 56 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter07-core-dump.md` | 7 | published-loop-26.md | 45 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging.md` | 8 | published-loop-26.md | 55 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter09-python-scripting.md` | 9 | published-loop-26.md | 47 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter10-tui-frontends.md` | 10 | published-loop-26.md | 38 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter11-practical-tips.md` | 11 | published-loop-26.md | 48 | unchanged |
| `src/content/blog/tools/debugging/gdb-lldb/chapter12-dwarf.md` | 12 | published-loop-26.md | 44 | unchanged |
| `src/content/blog/tools/debugging/gdb-extension/chapter01-python-api-basics.md` | 1 | published-loop-27.md | 50 | unchanged |
| `src/content/blog/tools/debugging/gdb-extension/chapter02-commands-events.md` | 2 | published-loop-27.md | 46 | unchanged |
| `src/content/blog/tools/debugging/gdb-extension/chapter03-pretty-printers.md` | 3 | published-loop-27.md | 54 | unchanged |
| `src/content/blog/tools/debugging/gdb-extension/chapter04-frame-unwinder.md` | 4 | published-loop-27.md | 49 | unchanged |
| `src/content/blog/tools/debugging/gdb-extension/chapter05-mi-dap-protocol.md` | 5 | published-loop-27.md | 58 | unchanged |
| `src/content/blog/tools/debugging/gdb-extension/chapter06-frontends.md` | 6 | published-loop-27.md | 42 | unchanged |
| `src/content/blog/tools/build/gnu-make/chapter01-intro.md` | 1 | published-loop-27.md | 59 | unchanged |
| `src/content/blog/tools/build/gnu-make/chapter02-rules.md` | 2 | published-loop-27.md | 60 | unchanged |
| `src/content/blog/tools/build/gnu-make/chapter03-variables.md` | 3 | published-loop-27.md | 60 | unchanged |
| `src/content/blog/tools/build/gnu-make/chapter04-pattern-rules.md` | 4 | published-loop-27.md | 63 | unchanged |
| `src/content/blog/tools/build/gnu-make/chapter05-functions.md` | 5 | published-loop-28.md | 62 | unchanged |
| `src/content/blog/tools/build/gnu-make/chapter06-conditionals.md` | 6 | published-loop-28.md | 60 | unchanged |
| `src/content/blog/tools/build/gnu-make/chapter07-practical.md` | 7 | published-loop-28.md | 54 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter01-overview.md` | 1 | published-loop-28.md | 50 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter02-hbm-stack.md` | 2 | published-loop-28.md | 54 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter03-hbm-generations.md` | 3 | published-loop-28.md | 58 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter04-gddr.md` | 4 | published-loop-28.md | 50 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter05-bandwidth-bottleneck.md` | 5 | published-loop-28.md | 56 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter06-thermal-power.md` | 6 | published-loop-28.md | 52 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter07-memory-controller.md` | 7 | published-loop-28.md | 48 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter08-npu-gpu-usage.md` | 8 | published-loop-29.md | 60 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter09-cxl-mem.md` | 9 | published-loop-29.md | 45 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter10-cxl-mem-protocol.md` | 10 | published-loop-29.md | 61 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter11-cxl-device-types.md` | 11 | published-loop-29.md | 62 | unchanged |
| `src/content/blog/embedded/hardware/hbm/chapter12-cxl-pooling-fabric.md` | 12 | published-loop-29.md | 56 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter01-overview.md` | 1 | published-loop-29.md | 49 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter02-realtime-requirements.md` | 2 | published-loop-29.md | 54 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture.md` | 3 | published-loop-29.md | 54 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter04-ethercat-frame.md` | 4 | published-loop-29.md | 55 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter05-ethercat-master.md` | 5 | published-loop-29.md | 54 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter06-profinet.md` | 6 | published-loop-30.md | 49 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter07-profinet-io.md` | 7 | published-loop-30.md | 51 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter08-tsn.md` | 8 | published-loop-30.md | 49 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter09-tsn-scheduling.md` | 9 | published-loop-30.md | 59 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter10-powerlink.md` | 10 | published-loop-30.md | 58 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter11-linux-realtime.md` | 11 | published-loop-30.md | 57 | unchanged |
| `src/content/blog/embedded/protocols/industrial-ethernet/chapter12-comparison.md` | 12 | published-loop-30.md | 51 | unchanged |
| `src/content/blog/tools/debugging/kernel/chapter01-user-kernel-boundary.md` | 1 | published-loop-30.md | 44 | unchanged |
| `src/content/blog/tools/debugging/kernel/chapter02-printk-dmesg.md` | 2 | published-loop-30.md | 51 | unchanged |
| `src/content/blog/tools/debugging/kernel/chapter03-ftrace-tracepoints.md` | 3 | published-loop-30.md | 48 | unchanged |
| `src/content/blog/tools/debugging/kernel/chapter04-ebpf-kernel.md` | 4 | published-loop-31.md | 45 | unchanged |
| `src/content/blog/tools/debugging/kernel/chapter05-kdb-kgdb.md` | 5 | published-loop-31.md | 53 | unchanged |
| `src/content/blog/tools/debugging/kernel/chapter06-crash-drgn.md` | 6 | published-loop-31.md | 53 | unchanged |
| `src/content/blog/tools/debugging/kernel/chapter07-panic-oops.md` | 7 | published-loop-31.md | 53 | unchanged |
| `src/content/blog/tools/debugging/kernel/chapter08-cxl-driver-debug.md` | 8 | published-loop-31.md | 54 | unchanged |
| `src/content/blog/tools/debugging/kernel/chapter09-drivers-cxl-walkthrough.md` | 9 | published-loop-31.md | 47 | unchanged |
| `src/content/blog/tools/debugging/memory/chapter01-memory-accounting.md` | 1 | published-loop-31.md | 53 | unchanged |
| `src/content/blog/tools/debugging/memory/chapter02-heaptrack.md` | 2 | published-loop-31.md | 50 | unchanged |
| `src/content/blog/tools/debugging/memory/chapter03-jemalloc-tcmalloc.md` | 3 | published-loop-31.md | 52 | unchanged |
| `src/content/blog/tools/debugging/memory/chapter04-glibc-tools.md` | 4 | published-loop-31.md | 50 | unchanged |
| `src/content/blog/tools/debugging/memory/chapter05-prod-leak-diagnosis.md` | 5 | published-loop-32.md | 55 | unchanged |
| `src/content/blog/tools/debugging/memory/chapter06-cxl-memory-diagnostics.md` | 6 | published-loop-32.md | 41 | unchanged |
| `src/content/blog/tools/debugging/memory/chapter07-tiered-memory-diagnostics.md` | 7 | published-loop-32.md | 57 | unchanged |
| `src/content/blog/embedded/modern-recipes/00-preface.md` | 0 | modern-embedded-recipes-loop-01.md | 51 | hub-structure |
| `src/content/blog/embedded/modern-recipes/part1-01-digital-signal-basics.md` | 1 | modern-embedded-recipes-loop-01.md | 40 | unchanged |
| `src/content/blog/embedded/modern-recipes/part1-02-clock-timing.md` | 2 | modern-embedded-recipes-loop-01.md | 48 | unchanged |
| `src/content/blog/embedded/modern-recipes/part1-03-gpio-internals.md` | 3 | modern-embedded-recipes-loop-01.md | 48 | unchanged |
| `src/content/blog/embedded/modern-recipes/part1-04-uart-hardware.md` | 4 | modern-embedded-recipes-loop-01.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part1-05-spi-hardware.md` | 5 | modern-embedded-recipes-loop-01.md | 46 | content |
| `src/content/blog/embedded/modern-recipes/part1-06-i2c-hardware.md` | 6 | modern-embedded-recipes-loop-01.md | 54 | content |
| `src/content/blog/embedded/modern-recipes/part1-07-adc-principles.md` | 7 | modern-embedded-recipes-loop-01.md | 54 | content |
| `src/content/blog/embedded/modern-recipes/part1-08-dac-principles.md` | 8 | modern-embedded-recipes-loop-01.md | 49 | unchanged |
| `src/content/blog/embedded/modern-recipes/part1-09-pwm-signal.md` | 9 | modern-embedded-recipes-loop-01.md | 46 | content |
| `src/content/blog/embedded/modern-recipes/part1-10-can-electrical.md` | 10 | modern-embedded-recipes-loop-02.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part1-11-rs485-rs422.md` | 11 | modern-embedded-recipes-loop-02.md | 50 | unchanged |
| `src/content/blog/embedded/modern-recipes/part1-12-lvds-differential.md` | 12 | modern-embedded-recipes-loop-02.md | 45 | content |
| `src/content/blog/embedded/modern-recipes/part2-01-cortex-m-comparison.md` | 13 | modern-embedded-recipes-loop-02.md | 51 | unchanged |
| `src/content/blog/embedded/modern-recipes/part2-02-cortex-a-comparison.md` | 14 | modern-embedded-recipes-loop-02.md | 49 | unchanged |
| `src/content/blog/embedded/modern-recipes/part2-03-arm-registers.md` | 15 | modern-embedded-recipes-loop-02.md | 65 | unchanged |
| `src/content/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions.md` | 16 | modern-embedded-recipes-loop-02.md | 41 | content |
| `src/content/blog/embedded/modern-recipes/part2-05-arm-memory-map.md` | 17 | modern-embedded-recipes-loop-02.md | 52 | unchanged |
| `src/content/blog/embedded/modern-recipes/part2-06-arm-cache.md` | 18 | modern-embedded-recipes-loop-02.md | 45 | content |
| `src/content/blog/embedded/modern-recipes/part2-07-arm-mpu.md` | 19 | modern-embedded-recipes-loop-02.md | 51 | content |
| `src/content/blog/embedded/modern-recipes/part2-08-arm-mmu.md` | 20 | modern-embedded-recipes-loop-03.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part2-09-trustzone-m.md` | 21 | modern-embedded-recipes-loop-03.md | 40 | unchanged |
| `src/content/blog/embedded/modern-recipes/part2-10-memory-barrier.md` | 22 | modern-embedded-recipes-loop-03.md | 49 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-01-cross-compiler.md` | 23 | modern-embedded-recipes-loop-03.md | 54 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-02-compile-pipeline.md` | 24 | modern-embedded-recipes-loop-03.md | 53 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-03-elf-format.md` | 25 | modern-embedded-recipes-loop-03.md | 52 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-04-linker-script-basics.md` | 26 | modern-embedded-recipes-loop-03.md | 55 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-05-linker-script-advanced.md` | 27 | modern-embedded-recipes-loop-03.md | 55 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-06-startup-code.md` | 28 | modern-embedded-recipes-loop-03.md | 53 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-07-c-runtime.md` | 29 | modern-embedded-recipes-loop-03.md | 51 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-08-memory-layout.md` | 30 | modern-embedded-recipes-loop-04.md | 51 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-09-compiler-optimization.md` | 31 | modern-embedded-recipes-loop-04.md | 41 | unchanged |
| `src/content/blog/embedded/modern-recipes/part3-10-map-file-analysis.md` | 32 | modern-embedded-recipes-loop-04.md | 57 | content |
| `src/content/blog/embedded/modern-recipes/part3-11-make-cmake-cross.md` | 33 | modern-embedded-recipes-loop-04.md | 56 | content |
| `src/content/blog/embedded/modern-recipes/part3-12-bootloader-chain.md` | 34 | modern-embedded-recipes-loop-04.md | 50 | unchanged |
| `src/content/blog/embedded/modern-recipes/part4-01-first-baremetal.md` | 35 | modern-embedded-recipes-loop-04.md | 60 | unchanged |
| `src/content/blog/embedded/modern-recipes/part4-02-mmio-access.md` | 36 | modern-embedded-recipes-loop-04.md | 55 | unchanged |
| `src/content/blog/embedded/modern-recipes/part4-03-gpio-driver.md` | 37 | modern-embedded-recipes-loop-04.md | 61 | content |
| `src/content/blog/embedded/modern-recipes/part4-04-clock-setup.md` | 38 | modern-embedded-recipes-loop-04.md | 67 | unchanged |
| `src/content/blog/embedded/modern-recipes/part4-05-interrupt-handling.md` | 39 | modern-embedded-recipes-loop-04.md | 62 | unchanged |
| `src/content/blog/embedded/modern-recipes/part4-06-systick-timer.md` | 40 | modern-embedded-recipes-loop-05.md | 61 | content |
| `src/content/blog/embedded/modern-recipes/part4-07-uart-driver.md` | 41 | modern-embedded-recipes-loop-05.md | 60 | unchanged |
| `src/content/blog/embedded/modern-recipes/part4-08-spi-driver.md` | 42 | modern-embedded-recipes-loop-05.md | 50 | navigation |
| `src/content/blog/embedded/modern-recipes/part4-09-i2c-driver.md` | 43 | modern-embedded-recipes-loop-05.md | 53 | content |
| `src/content/blog/embedded/modern-recipes/part4-10-dma-basics.md` | 44 | modern-embedded-recipes-loop-05.md | 60 | navigation |
| `src/content/blog/embedded/modern-recipes/part4-11-low-power-modes.md` | 45 | modern-embedded-recipes-loop-05.md | 48 | content |
| `src/content/blog/embedded/modern-recipes/part4-12-watchdog.md` | 46 | modern-embedded-recipes-loop-05.md | 63 | content |
| `src/content/blog/embedded/modern-recipes/part4-13-flash-programming.md` | 47 | modern-embedded-recipes-loop-05.md | 52 | unchanged |
| `src/content/blog/embedded/modern-recipes/part4-14-ddr-init-failure.md` | 48 | modern-embedded-recipes-loop-05.md | 67 | unchanged |
| `src/content/blog/embedded/modern-recipes/part5-01-pwm-output.md` | 49 | modern-embedded-recipes-loop-05.md | 54 | unchanged |
| `src/content/blog/embedded/modern-recipes/part5-02-dc-motor.md` | 50 | modern-embedded-recipes-loop-06.md | 56 | unchanged |
| `src/content/blog/embedded/modern-recipes/part5-03-stepper-motor.md` | 51 | modern-embedded-recipes-loop-06.md | 57 | unchanged |
| `src/content/blog/embedded/modern-recipes/part5-04-servo-motor.md` | 52 | modern-embedded-recipes-loop-06.md | 49 | unchanged |
| `src/content/blog/embedded/modern-recipes/part5-05-character-lcd.md` | 53 | modern-embedded-recipes-loop-06.md | 61 | unchanged |
| `src/content/blog/embedded/modern-recipes/part5-06-spi-oled.md` | 54 | modern-embedded-recipes-loop-06.md | 59 | unchanged |
| `src/content/blog/embedded/modern-recipes/part5-07-tft-display.md` | 55 | modern-embedded-recipes-loop-06.md | 53 | content |
| `src/content/blog/embedded/modern-recipes/part5-08-environmental-sensors.md` | 56 | modern-embedded-recipes-loop-06.md | 57 | unchanged |
| `src/content/blog/embedded/modern-recipes/part5-09-imu-sensor.md` | 57 | modern-embedded-recipes-loop-06.md | 59 | unchanged |
| `src/content/blog/embedded/modern-recipes/part5-10-can-communication.md` | 58 | modern-embedded-recipes-loop-06.md | 58 | navigation |
| `src/content/blog/embedded/modern-recipes/part5-11-usb-device.md` | 59 | modern-embedded-recipes-loop-06.md | 61 | navigation |
| `src/content/blog/embedded/modern-recipes/part5-12-ethernet-mac-phy.md` | 60 | modern-embedded-recipes-loop-07.md | 54 | navigation |
| `src/content/blog/embedded/modern-recipes/part5-13-sd-card-fatfs.md` | 61 | modern-embedded-recipes-loop-07.md | 57 | content |
| `src/content/blog/embedded/modern-recipes/part5-14-rtc-utilization.md` | 62 | modern-embedded-recipes-loop-07.md | 56 | content |
| `src/content/blog/embedded/modern-recipes/part6-01-rtos-decision.md` | 63 | modern-embedded-recipes-loop-07.md | 48 | unchanged |
| `src/content/blog/embedded/modern-recipes/part6-02-task-design.md` | 64 | modern-embedded-recipes-loop-07.md | 49 | unchanged |
| `src/content/blog/embedded/modern-recipes/part6-03-scheduler-internals.md` | 65 | modern-embedded-recipes-loop-07.md | 47 | unchanged |
| `src/content/blog/embedded/modern-recipes/part6-04-semaphore-usage.md` | 66 | modern-embedded-recipes-loop-07.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part6-05-mutex-usage.md` | 67 | modern-embedded-recipes-loop-07.md | 46 | unchanged |
| `src/content/blog/embedded/modern-recipes/part6-06-queue-usage.md` | 68 | modern-embedded-recipes-loop-07.md | 51 | unchanged |
| `src/content/blog/embedded/modern-recipes/part6-07-event-group.md` | 69 | modern-embedded-recipes-loop-07.md | 45 | unchanged |
| `src/content/blog/embedded/modern-recipes/part6-08-software-timer.md` | 70 | modern-embedded-recipes-loop-08.md | 47 | unchanged |
| `src/content/blog/embedded/modern-recipes/part6-09-isr-api.md` | 71 | modern-embedded-recipes-loop-08.md | 40 | unchanged |
| `src/content/blog/embedded/modern-recipes/part6-10-priority-inversion.md` | 72 | modern-embedded-recipes-loop-08.md | 40 | unchanged |
| `src/content/blog/embedded/modern-recipes/part6-11-timer-services.md` | 73 | modern-embedded-recipes-loop-08.md | 47 | content |
| `src/content/blog/embedded/modern-recipes/part6-12-rtos-debugging.md` | 74 | modern-embedded-recipes-loop-08.md | 53 | unchanged |
| `src/content/blog/embedded/modern-recipes/part7-01-linux-boot-flow.md` | 75 | modern-embedded-recipes-loop-08.md | 49 | content |
| `src/content/blog/embedded/modern-recipes/part7-02-uboot-usage.md` | 76 | modern-embedded-recipes-loop-08.md | 55 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-03-device-tree-basics.md` | 77 | modern-embedded-recipes-loop-08.md | 40 | unchanged |
| `src/content/blog/embedded/modern-recipes/part7-04-device-tree-overlay.md` | 78 | modern-embedded-recipes-loop-08.md | 56 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-05-kernel-build.md` | 79 | modern-embedded-recipes-loop-08.md | 50 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-06-kernel-module.md` | 80 | modern-embedded-recipes-loop-09.md | 44 | unchanged |
| `src/content/blog/embedded/modern-recipes/part7-07-char-driver.md` | 81 | modern-embedded-recipes-loop-09.md | 51 | unchanged |
| `src/content/blog/embedded/modern-recipes/part7-08-platform-driver.md` | 82 | modern-embedded-recipes-loop-09.md | 51 | content |
| `src/content/blog/embedded/modern-recipes/part7-09-mmap.md` | 83 | modern-embedded-recipes-loop-09.md | 49 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-10-epoll.md` | 84 | modern-embedded-recipes-loop-09.md | 53 | navigation |
| `src/content/blog/embedded/modern-recipes/part7-11-uio-vfio.md` | 85 | modern-embedded-recipes-loop-09.md | 57 | unchanged |
| `src/content/blog/embedded/modern-recipes/part7-12-sysfs.md` | 86 | modern-embedded-recipes-loop-09.md | 53 | unchanged |
| `src/content/blog/embedded/modern-recipes/part7-13-irq-affinity.md` | 87 | modern-embedded-recipes-loop-09.md | 53 | content |
| `src/content/blog/embedded/modern-recipes/part7-14-rootfs-buildroot.md` | 88 | modern-embedded-recipes-loop-09.md | 56 | navigation |
| `src/content/blog/embedded/modern-recipes/part8-01-dynamic-memory.md` | 89 | modern-embedded-recipes-loop-09.md | 48 | unchanged |
| `src/content/blog/embedded/modern-recipes/part8-02-memory-alignment.md` | 90 | modern-embedded-recipes-loop-10.md | 54 | unchanged |
| `src/content/blog/embedded/modern-recipes/part8-03-cache-alignment.md` | 91 | modern-embedded-recipes-loop-10.md | 42 | unchanged |
| `src/content/blog/embedded/modern-recipes/part8-04-dma-allocator.md` | 92 | modern-embedded-recipes-loop-10.md | 53 | navigation |
| `src/content/blog/embedded/modern-recipes/part8-05-zero-copy.md` | 93 | modern-embedded-recipes-loop-10.md | 43 | unchanged |
| `src/content/blog/embedded/modern-recipes/part8-06-numa.md` | 94 | modern-embedded-recipes-loop-10.md | 50 | navigation |
| `src/content/blog/embedded/modern-recipes/part8-07-simd.md` | 95 | modern-embedded-recipes-loop-10.md | 50 | unchanged |
| `src/content/blog/embedded/modern-recipes/part8-08-neon.md` | 96 | modern-embedded-recipes-loop-10.md | 41 | unchanged |
| `src/content/blog/embedded/modern-recipes/part8-09-stack-analysis.md` | 97 | modern-embedded-recipes-loop-10.md | 51 | unchanged |
| `src/content/blog/embedded/modern-recipes/part8-10-code-size-optimization.md` | 98 | modern-embedded-recipes-loop-10.md | 54 | unchanged |
| `src/content/blog/embedded/modern-recipes/part8-11-power-optimization.md` | 99 | modern-embedded-recipes-loop-10.md | 54 | unchanged |
| `src/content/blog/embedded/modern-recipes/part8-12-wcet-analysis.md` | 100 | modern-embedded-recipes-loop-11.md | 53 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-01-lock-free-ring.md` | 101 | modern-embedded-recipes-loop-11.md | 52 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-02-wait-free.md` | 102 | modern-embedded-recipes-loop-11.md | 42 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-03-rcu-basics.md` | 103 | modern-embedded-recipes-loop-11.md | 55 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-04-hazard-pointer.md` | 104 | modern-embedded-recipes-loop-11.md | 59 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-05-cas-patterns.md` | 105 | modern-embedded-recipes-loop-11.md | 53 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-06-atomic-cost.md` | 106 | modern-embedded-recipes-loop-11.md | 49 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex.md` | 107 | modern-embedded-recipes-loop-11.md | 54 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-08-aba-problem.md` | 108 | modern-embedded-recipes-loop-11.md | 56 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-09-false-sharing.md` | 109 | modern-embedded-recipes-loop-11.md | 56 | unchanged |
| `src/content/blog/embedded/modern-recipes/part9-10-mpmc-queue.md` | 110 | modern-embedded-recipes-loop-12.md | 45 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-01-debug-mindset.md` | 111 | modern-embedded-recipes-loop-12.md | 62 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-02-jtag-swd.md` | 112 | modern-embedded-recipes-loop-12.md | 56 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-03-gdb-remote-debug.md` | 113 | modern-embedded-recipes-loop-12.md | 62 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-04-hardfault-analysis.md` | 114 | modern-embedded-recipes-loop-12.md | 68 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-05-uart-not-printing.md` | 115 | modern-embedded-recipes-loop-12.md | 58 | navigation |
| `src/content/blog/embedded/modern-recipes/part10-06-boot-failure.md` | 116 | modern-embedded-recipes-loop-12.md | 69 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-07-interrupt-debugging.md` | 117 | modern-embedded-recipes-loop-12.md | 68 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-08-memory-corruption.md` | 118 | modern-embedded-recipes-loop-12.md | 67 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-09-timing-race-diag.md` | 119 | modern-embedded-recipes-loop-12.md | 63 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-10-protocol-analyzer.md` | 120 | modern-embedded-recipes-loop-13.md | 61 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-11-logging-system.md` | 121 | modern-embedded-recipes-loop-13.md | 60 | unchanged |
| `src/content/blog/embedded/modern-recipes/part10-12-postmortem-analysis.md` | 122 | modern-embedded-recipes-loop-13.md | 62 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-01-fpga-basics.md` | 123 | modern-embedded-recipes-loop-13.md | 47 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-02-vivado-usage.md` | 124 | modern-embedded-recipes-loop-13.md | 60 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-03-pcie-bar.md` | 125 | modern-embedded-recipes-loop-13.md | 41 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-04-axi.md` | 126 | modern-embedded-recipes-loop-13.md | 49 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-05-ps-pl-communication.md` | 127 | modern-embedded-recipes-loop-13.md | 53 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-06-mailbox.md` | 128 | modern-embedded-recipes-loop-13.md | 53 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-07-cq-sq.md` | 129 | modern-embedded-recipes-loop-13.md | 54 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-08-dma-completion.md` | 130 | modern-embedded-recipes-loop-14.md | 55 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-09-pcie-streaming.md` | 131 | modern-embedded-recipes-loop-14.md | 47 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-10-hls.md` | 132 | modern-embedded-recipes-loop-14.md | 51 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-11-hls-optimization.md` | 133 | modern-embedded-recipes-loop-14.md | 44 | navigation |
| `src/content/blog/embedded/modern-recipes/part11-12-vitis-ai.md` | 134 | modern-embedded-recipes-loop-14.md | 53 | navigation |
| `src/content/blog/embedded/modern-recipes/part11-13-opencl-fpga.md` | 135 | modern-embedded-recipes-loop-14.md | 52 | unchanged |
| `src/content/blog/embedded/modern-recipes/part11-14-intel-quartus.md` | 136 | modern-embedded-recipes-loop-14.md | 51 | navigation |
| `src/content/blog/embedded/modern-recipes/part12-01-edge-inference.md` | 137 | modern-embedded-recipes-loop-14.md | 48 | content |
| `src/content/blog/embedded/modern-recipes/part12-02-edge-pipeline-measurement.md` | 138 | 없음 | 미산정 | missing |
| `src/content/blog/embedded/modern-recipes/part12-03-npu-architecture.md` | 139 | modern-embedded-recipes-loop-14.md | 43 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-04-quantization.md` | 140 | modern-embedded-recipes-loop-14.md | 57 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-05-tensorrt.md` | 141 | modern-embedded-recipes-loop-15.md | 52 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-06-tflite-micro.md` | 142 | modern-embedded-recipes-loop-15.md | 51 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-07-onnx-runtime.md` | 143 | modern-embedded-recipes-loop-15.md | 46 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-08-thermal.md` | 144 | modern-embedded-recipes-loop-15.md | 57 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-09-jetson.md` | 145 | modern-embedded-recipes-loop-15.md | 53 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-10-zero-copy-camera.md` | 146 | modern-embedded-recipes-loop-15.md | 64 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-11-on-device-llm.md` | 147 | modern-embedded-recipes-loop-15.md | 74 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-12-tfm-trustzone.md` | 148 | modern-embedded-recipes-loop-15.md | 69 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part12-13-matter-thread.md` | 149 | modern-embedded-recipes-loop-15.md | 68 | rename-navigation |
| `src/content/blog/embedded/modern-recipes/part11-15-pcie-to-cxl.md` | 150 | modern-embedded-recipes-loop-15.md | 52 | navigation |
| `src/content/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation.md` | 151 | modern-embedded-recipes-loop-16.md | 66 | navigation |
| `src/content/blog/embedded/modern-recipes/part11-17-linux-cxl-driver.md` | 152 | modern-embedded-recipes-loop-16.md | 60 | navigation |
| `src/content/blog/embedded/hardware/pcie/chapter01-fundamentals.md` | 1 | published-loop-32.md | 47 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter02-tlp.md` | 2 | published-loop-32.md | 53 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter03-config-space.md` | 3 | published-loop-32.md | 42 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter04-bar-mmio.md` | 4 | published-loop-32.md | 48 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter05-interrupts.md` | 5 | published-loop-32.md | 42 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter06-power-management.md` | 6 | published-loop-32.md | 46 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter07-error-handling.md` | 7 | published-loop-32.md | 46 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter08-dllp.md` | 8 | published-loop-33.md | 43 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter09-physical-layer.md` | 9 | published-loop-33.md | 45 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter10-linux-basics.md` | 10 | published-loop-33.md | 52 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter11-linux-dma.md` | 11 | published-loop-33.md | 48 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter12-virtualization-1.md` | 12 | published-loop-33.md | 45 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter13-virtualization-2.md` | 13 | published-loop-33.md | 46 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter14-linux-operations.md` | 14 | published-loop-33.md | 42 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter15-tools.md` | 15 | published-loop-33.md | 45 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter16-troubleshooting.md` | 16 | published-loop-33.md | 41 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter17-performance.md` | 17 | published-loop-33.md | 45 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter18-register-maps.md` | 18 | published-loop-34.md | 45 | unchanged |
| `src/content/blog/embedded/hardware/pcie/chapter19-advanced-features.md` | 19 | published-loop-34.md | 50 | unchanged |
| `src/content/blog/tools/debugging/postmortem/chapter01-core-generation.md` | 1 | published-loop-34.md | 47 | unchanged |
| `src/content/blog/tools/debugging/postmortem/chapter02-elf-core-format.md` | 2 | published-loop-34.md | 51 | unchanged |
| `src/content/blog/tools/debugging/postmortem/chapter03-gdb-core-analysis.md` | 3 | published-loop-34.md | 55 | unchanged |
| `src/content/blog/tools/debugging/postmortem/chapter04-debuginfod-minidump-automation.md` | 4 | published-loop-34.md | 42 | unchanged |
| `src/content/blog/tools/debugging/postmortem/chapter05-cxl-device-postmortem.md` | 5 | published-loop-34.md | 63 | unchanged |
| `src/content/blog/tools/debugging/postmortem/chapter06-cxl-fabric-postmortem.md` | 6 | published-loop-34.md | 47 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/00-preface.md` | 0 | published-loop-34.md | 55 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-01-why-rtos.md` | 1 | published-loop-34.md | 46 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-02-task-thread.md` | 2 | published-loop-35.md | 46 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms.md` | 3 | published-loop-35.md | 51 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-04-preemption.md` | 4 | published-loop-35.md | 43 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos.md` | 5 | published-loop-35.md | 46 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-06-sync-basics.md` | 6 | published-loop-35.md | 44 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-07-semaphore.md` | 7 | published-loop-35.md | 43 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-08-mutex.md` | 8 | published-loop-35.md | 46 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-09-queues.md` | 9 | published-loop-35.md | 44 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis.md` | 10 | published-loop-35.md | 43 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-01-ready-list.md` | 11 | published-loop-35.md | 49 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-02-blocked-list.md` | 12 | published-loop-36.md | 46 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-03-scheduler-algorithm.md` | 13 | published-loop-36.md | 38 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-04-context-switch.md` | 14 | published-loop-36.md | 53 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-05-cortex-m-context.md` | 15 | published-loop-36.md | 53 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-06-cortex-a-context.md` | 16 | published-loop-36.md | 44 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-07-riscv-context.md` | 17 | published-loop-36.md | 48 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-08-tick-timer.md` | 18 | published-loop-36.md | 48 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-09-tickless.md` | 19 | published-loop-36.md | 41 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-10-scheduler-latency.md` | 20 | published-loop-36.md | 42 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part2-11-tracing-observability.md` | 21 | published-loop-36.md | 53 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-01-critical-section.md` | 22 | published-loop-37.md | 45 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-02-semaphore-impl.md` | 23 | published-loop-37.md | 48 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-03-mutex-impl.md` | 24 | published-loop-37.md | 40 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-04-priority-inversion.md` | 25 | published-loop-37.md | 38 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-05-priority-inheritance.md` | 26 | published-loop-37.md | 46 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-06-priority-ceiling.md` | 27 | published-loop-37.md | 42 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-07-queue-impl.md` | 28 | published-loop-37.md | 43 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-08-event-group.md` | 29 | published-loop-37.md | 51 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api.md` | 30 | published-loop-37.md | 44 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-10-deadlock.md` | 31 | published-loop-37.md | 47 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part3-11-stream-message-buffer.md` | 32 | published-loop-38.md | 54 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-01-realtime-memory.md` | 33 | published-loop-38.md | 41 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-02-freertos-heap.md` | 34 | published-loop-38.md | 57 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-03-tlsf.md` | 35 | published-loop-38.md | 61 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-04-static-allocation.md` | 36 | published-loop-38.md | 59 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-05-memory-pool.md` | 37 | published-loop-38.md | 55 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-06-stack-overflow.md` | 38 | published-loop-38.md | 55 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-07-smp-rtos.md` | 39 | published-loop-38.md | 60 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-08-spinlock-smp.md` | 40 | published-loop-38.md | 53 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-09-software-timer.md` | 41 | published-loop-38.md | 51 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-10-syscall.md` | 42 | published-loop-39.md | 55 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-11-trustzone-tfm.md` | 43 | published-loop-39.md | 49 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-12-amp-openamp.md` | 44 | published-loop-39.md | 59 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part4-13-cpp-in-rtos.md` | 45 | published-loop-39.md | 50 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part5-01-freertos-source.md` | 46 | published-loop-39.md | 49 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part5-02-zephyr-source.md` | 47 | published-loop-39.md | 54 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part5-03-rt-thread.md` | 48 | published-loop-39.md | 52 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part5-04-porting.md` | 49 | published-loop-39.md | 48 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part5-05-selection-guide.md` | 50 | published-loop-39.md | 57 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part5-06-nuttx.md` | 51 | published-loop-39.md | 53 | unchanged |
| `src/content/blog/embedded/rtos/practical-internals/part5-07-preempt-rt-linux.md` | 52 | published-loop-40.md | 54 | unchanged |
| `src/content/blog/tools/debugging/python/chapter01-pdb-basics.md` | 1 | published-loop-40.md | 57 | unchanged |
| `src/content/blog/tools/debugging/python/chapter02-debugpy-ide.md` | 2 | published-loop-40.md | 56 | unchanged |
| `src/content/blog/tools/debugging/python/chapter03-asyncio.md` | 3 | published-loop-40.md | 52 | unchanged |
| `src/content/blog/tools/debugging/python/chapter04-py-spy.md` | 4 | published-loop-40.md | 58 | unchanged |
| `src/content/blog/tools/debugging/python/chapter05-faulthandler-tracemalloc.md` | 5 | published-loop-40.md | 54 | unchanged |
| `src/content/blog/tools/debugging/sanitizers/chapter01-intro.md` | 1 | published-loop-40.md | 53 | unchanged |
| `src/content/blog/tools/debugging/sanitizers/chapter02-asan-ubsan.md` | 2 | published-loop-40.md | 60 | unchanged |
| `src/content/blog/tools/debugging/sanitizers/chapter03-lsan-leaks.md` | 3 | published-loop-40.md | 55 | unchanged |
| `src/content/blog/tools/debugging/sanitizers/chapter04-tsan.md` | 4 | published-loop-40.md | 58 | unchanged |
| `src/content/blog/tools/debugging/sanitizers/chapter05-cmake-ci.md` | 5 | published-loop-41.md | 61 | unchanged |
| `src/content/blog/tools/debugging/valgrind/chapter01-intro.md` | 1 | published-loop-41.md | 54 | unchanged |
| `src/content/blog/tools/debugging/valgrind/chapter02-memcheck.md` | 2 | published-loop-41.md | 54 | unchanged |
| `src/content/blog/tools/debugging/valgrind/chapter03-leak-report.md` | 3 | published-loop-41.md | 57 | unchanged |
| `src/content/blog/tools/debugging/valgrind/chapter04-helgrind-drd.md` | 4 | published-loop-41.md | 55 | unchanged |
| `src/content/blog/tools/debugging/valgrind/chapter05-suppressions.md` | 5 | published-loop-41.md | 65 | unchanged |

## 재현

`node scripts/audit-adsense-score-coverage.mjs`

이 스크립트는 콘텐츠·기존 점수 보고서·사용자의 미커밋 파일을 바꾸지 않는다. 새 Markdown/JSON 대조 산출물만 갱신한다. 이미 있던 미커밋 performance-engineering-loop-01 보고서는 확정된 기존 평가 범위에 포함하지 않았다.
