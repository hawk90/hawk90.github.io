# 공개 콘텐츠 재검토 체크리스트

> 파일별 확인 목록입니다. 체크 표시는 이번 재검토 완료를 뜻합니다. 기존 수정 기록과 SHA가 다른 것은 변경이 있었다는 뜻이지, 오류 판정은 아닙니다.

갱신 기준: 2026-11-23. Modern Embedded Recipes 이외 시리즈는 기존 수정 기록과 현재 원문 SHA를 비교했습니다.

## 요약

| 범위 | 전체 | 이번에 확인할 글 |
| --- | ---: | ---: |
| 기존 기록 이후 원문이 달라진 25개 시리즈 | 406 | 122 |
| Modern Embedded Recipes | 153 | 141 (Part 8 제외) |

### 진행 순서

1. 글을 열어 기존 수정 보고서와 현재 본문을 비교합니다.
2. 기술 근거와 실행 검증 범위를 확인하고 필요한 수정·기록을 남깁니다.
3. 확인을 마친 항목만 `[x]`로 표시합니다.

## 기존 수정 기록 이후 달라진 글

현재 파일 SHA가 마지막 수정 기록과 다른 공개 글입니다. 기존 보고서는 [수정 진행표](fix-progress.md)와 [수정 큐](fix-queue.md)를 참고하세요.

### Bootloader Internals (37편)

- [ ] [ROM부터 init까지 — 부트로더가 채우는 부팅 단계](../../src/content/blog/embedded/bootloader/chapter01-boot-problem.md) — src/content/blog/embedded/bootloader/chapter01-boot-problem.md
- [ ] [Das U-Boot vs TF-A vs EDK II — 임베디드 부트로더 생태계 비교](../../src/content/blog/embedded/bootloader/chapter02-u-boot-position.md) — src/content/blog/embedded/bootloader/chapter02-u-boot-position.md
- [ ] [U-Boot 빌드 시스템 분석 — Kconfig·Makefile·defconfig 동작 추적](../../src/content/blog/embedded/bootloader/chapter03-build-system.md) — src/content/blog/embedded/bootloader/chapter03-build-system.md
- [ ] [Arm 임베디드 부트 단계 — TF-A BL1·BL2·BL31·BL33과 U-Boot SPL/TPL](../../src/content/blog/embedded/bootloader/chapter04-boot-stages.md) — src/content/blog/embedded/bootloader/chapter04-boot-stages.md
- [ ] [U-Boot Falcon Mode — SPL이 U-Boot Proper 없이 커널 직접 부팅](../../src/content/blog/embedded/bootloader/chapter05-falcon-mode.md) — src/content/blog/embedded/bootloader/chapter05-falcon-mode.md
- [ ] [Device Tree DTB 부트로더 처리 — 로딩 시점과 fixup 메커니즘 추적](../../src/content/blog/embedded/bootloader/chapter06-device-tree.md) — src/content/blog/embedded/bootloader/chapter06-device-tree.md
- [ ] [U-Boot Driver Model 내부 — uclass·driver·device 추상화 구조](../../src/content/blog/embedded/bootloader/chapter07-driver-model.md) — src/content/blog/embedded/bootloader/chapter07-driver-model.md
- [ ] [U-Boot 보드 초기화 시퀀스 — board_init_f와 board_init_r 분리 이유](../../src/content/blog/embedded/bootloader/chapter08-board-init.md) — src/content/blog/embedded/bootloader/chapter08-board-init.md
- [ ] [DDR Controller 프로그래밍과 PHY Training — SPL의 가장 어려운 작업](../../src/content/blog/embedded/bootloader/chapter09-dram-init.md) — src/content/blog/embedded/bootloader/chapter09-dram-init.md
- [ ] [임베디드 스토리지 부팅 분석 — MMC·SCSI·NAND·SPI Flash 비교](../../src/content/blog/embedded/bootloader/chapter10-storage-boot.md) — src/content/blog/embedded/bootloader/chapter10-storage-boot.md
- [ ] [임베디드 네트워크 부팅 — TFTP·PXE·BOOTP 시퀀스 분석](../../src/content/blog/embedded/bootloader/chapter11-network-boot.md) — src/content/blog/embedded/bootloader/chapter11-network-boot.md
- [ ] [U-Boot USB 부팅 — fastboot·UMS·USB host 메커니즘](../../src/content/blog/embedded/bootloader/chapter12-usb-boot.md) — src/content/blog/embedded/bootloader/chapter12-usb-boot.md
- [ ] [U-Boot 환경 변수와 bootcmd — 부팅 시나리오 정의하기](../../src/content/blog/embedded/bootloader/chapter13-env-bootcmd.md) — src/content/blog/embedded/bootloader/chapter13-env-bootcmd.md
- [ ] [Modern U-Boot bootflow / bootmeth — 새 추상화 레이어 분석](../../src/content/blog/embedded/bootloader/chapter14-bootflow-bootmeth.md) — src/content/blog/embedded/bootloader/chapter14-bootflow-bootmeth.md
- [ ] [FIT image 구조 분석 — multi-image·hash·configuration 추적](../../src/content/blog/embedded/bootloader/chapter15-fit-image.md) — src/content/blog/embedded/bootloader/chapter15-fit-image.md
- [ ] [U-Boot Verified Boot — RSA 서명과 public key 임베딩 흐름](../../src/content/blog/embedded/bootloader/chapter16-verified-boot.md) — src/content/blog/embedded/bootloader/chapter16-verified-boot.md
- [ ] [임베디드 A/B 부팅 이중화 — OTA 안전성을 위한 부트 슬롯 설계](../../src/content/blog/embedded/bootloader/chapter17-ab-update.md) — src/content/blog/embedded/bootloader/chapter17-ab-update.md
- [ ] [U-Boot의 EFI 호환 분석 — bootefi 명령과 EFI loader 동작 원리](../../src/content/blog/embedded/bootloader/chapter18-efi-in-uboot.md) — src/content/blog/embedded/bootloader/chapter18-efi-in-uboot.md
- [ ] [Linux Kernel Boot ABI — ARM, RISC-V, x86 진입 규약](../../src/content/blog/embedded/bootloader/chapter19-kernel-handoff.md) — src/content/blog/embedded/bootloader/chapter19-kernel-handoff.md
- [ ] [임베디드 펌웨어 업데이트 — RAUC vs SWUpdate 비교](../../src/content/blog/embedded/bootloader/chapter20-rauc-swupdate.md) — src/content/blog/embedded/bootloader/chapter20-rauc-swupdate.md
- [ ] [새 보드 U-Boot 포팅 실전 — defconfig 작성부터 첫 부팅까지](../../src/content/blog/embedded/bootloader/chapter21-board-porting.md) — src/content/blog/embedded/bootloader/chapter21-board-porting.md
- [ ] [부트로더 디버깅 기법 — DEBUG·JTAG·serial·post-mortem 분석](../../src/content/blog/embedded/bootloader/chapter22-debugging.md) — src/content/blog/embedded/bootloader/chapter22-debugging.md
- [ ] [SoC BootROM·eFuse·OTP — 부팅의 0단계 분석](../../src/content/blog/embedded/bootloader/chapter23-bootrom-efuse-otp.md) — src/content/blog/embedded/bootloader/chapter23-bootrom-efuse-otp.md
- [ ] [SPL·TPL 내부 해부 — 가장 작은 부트 단계의 동작 추적](../../src/content/blog/embedded/bootloader/chapter24-spl-deep.md) — src/content/blog/embedded/bootloader/chapter24-spl-deep.md
- [ ] [ARM Trusted Firmware-A 통합 — BL1·BL2·BL31·BL32·BL33 흐름](../../src/content/blog/embedded/bootloader/chapter25-tfa-optee.md) — src/content/blog/embedded/bootloader/chapter25-tfa-optee.md
- [ ] [DDR training 깊이 — PHY·컨트롤러·보드 파라미터 검증](../../src/content/blog/embedded/bootloader/chapter26-ddr-training.md) — src/content/blog/embedded/bootloader/chapter26-ddr-training.md
- [ ] [임베디드 Chain of Trust — 다단계 서명 검증의 전체 흐름](../../src/content/blog/embedded/bootloader/chapter27-chain-of-trust.md) — src/content/blog/embedded/bootloader/chapter27-chain-of-trust.md
- [ ] [임베디드 Flash Layout 설계 — partition·NAND·eMMC·UBI 비교](../../src/content/blog/embedded/bootloader/chapter28-flash-layout.md) — src/content/blog/embedded/bootloader/chapter28-flash-layout.md
- [ ] [U-Boot Distro Boot — extlinux·boot.scr 표준화 분석](../../src/content/blog/embedded/bootloader/chapter29-distro-boot.md) — src/content/blog/embedded/bootloader/chapter29-distro-boot.md
- [ ] [부트로더 CI 구축 — build matrix와 자동 부팅 테스트](../../src/content/blog/embedded/bootloader/chapter30-bootloader-ci.md) — src/content/blog/embedded/bootloader/chapter30-bootloader-ci.md
- [ ] [TF-A BL31 EL3 Runtime — 서비스 등록과 요청 처리 경계](../../src/content/blog/embedded/bootloader/chapter31-tfa-bl31-runtime.md) — src/content/blog/embedded/bootloader/chapter31-tfa-bl31-runtime.md
- [ ] [PSCI와 SMCCC ABI — ARM 표준 SMC 호출 규약 분석](../../src/content/blog/embedded/bootloader/chapter32-psci-smccc.md) — src/content/blog/embedded/bootloader/chapter32-psci-smccc.md
- [ ] [ARM64 Secondary Core Bring-up — PSCI와 spin-table 시작 계약](../../src/content/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup.md) — src/content/blog/embedded/bootloader/chapter33-smp-secondary-cpu-bringup.md
- [ ] [U-Boot PCIe Enumeration — 장치 발견·BAR 할당과 CXL 메모리의 구분](../../src/content/blog/embedded/bootloader/chapter34-pcie-enumeration.md) — src/content/blog/embedded/bootloader/chapter34-pcie-enumeration.md
- [ ] [EFI·UEFI에서 CXL 초기화 — CEDT 인계와 HDM Decoder 설정의 경계](../../src/content/blog/embedded/bootloader/chapter35-uefi-cxl-init.md) — src/content/blog/embedded/bootloader/chapter35-uefi-cxl-init.md
- [ ] [부트 시 메모리 토폴로지 — Firmware 정보와 Linux NUMA·Tier·Zone의 경계](../../src/content/blog/embedded/bootloader/chapter36-boot-memory-topology.md) — src/content/blog/embedded/bootloader/chapter36-boot-memory-topology.md
- [ ] [UEFI Secure Boot 인증서 만료 — 2011→2023 CA 롤오버와 PQC 대비](../../src/content/blog/embedded/bootloader/chapter37-secureboot-cert-rollover.md) — src/content/blog/embedded/bootloader/chapter37-secureboot-cert-rollover.md

### CXL 4.0 Internals (8편)

- [ ] [Ch 1: CXL의 자리와 진화 — 1.1에서 4.0까지](../../src/content/blog/embedded/hardware/cxl/chapter01-cxl-position.md) — src/content/blog/embedded/hardware/cxl/chapter01-cxl-position.md
- [ ] [Ch 4: Pooling·GFAM·Fabric — Multi-host 메모리 공유](../../src/content/blog/embedded/hardware/cxl/chapter04-pooling-gfam.md) — src/content/blog/embedded/hardware/cxl/chapter04-pooling-gfam.md
- [ ] [Ch 5: CXL 4.0의 핵심 새 기능 — 128 GT/s·Bundled Port](../../src/content/blog/embedded/hardware/cxl/chapter05-cxl-4-features.md) — src/content/blog/embedded/hardware/cxl/chapter05-cxl-4-features.md
- [ ] [Ch 6: CXL.io — PCIe와의 차이·DOE·DVSEC](../../src/content/blog/embedded/hardware/cxl/chapter06-cxl-io.md) — src/content/blog/embedded/hardware/cxl/chapter06-cxl-io.md
- [ ] [Ch 8: CXL.mem — M2S·S2M·HDM Decoder](../../src/content/blog/embedded/hardware/cxl/chapter08-cxl-mem.md) — src/content/blog/embedded/hardware/cxl/chapter08-cxl-mem.md
- [ ] [Ch 11: Linux drivers/cxl/ 분석 — Mainline kernel CXL 구현](../../src/content/blog/embedded/hardware/cxl/chapter11-linux-driver.md) — src/content/blog/embedded/hardware/cxl/chapter11-linux-driver.md
- [ ] [Ch 12: QEMU CXL 에뮬레이션 — 모델 구성과 게스트 검증](../../src/content/blog/embedded/hardware/cxl/chapter12-qemu-emulation.md) — src/content/blog/embedded/hardware/cxl/chapter12-qemu-emulation.md
- [ ] [Ch 15: RAS·Performance·Compliance — 운용·검증의 마지막 단계](../../src/content/blog/embedded/hardware/cxl/chapter15-ras-performance.md) — src/content/blog/embedded/hardware/cxl/chapter15-ras-performance.md

### Embedded C++ for Real Systems (38편)

- [ ] [임베디드 C++ vs C — 런타임·코드 크기·ABI 관점 비교](../../src/content/blog/embedded/embedded-cpp/part1-01-cpp-vs-c.md) — src/content/blog/embedded/embedded-cpp/part1-01-cpp-vs-c.md
- [ ] [임베디드 C++ 컴파일러 플래그 분석 — -fno-rtti·-fno-exceptions·-Os](../../src/content/blog/embedded/embedded-cpp/part1-02-compiler-flags.md) — src/content/blog/embedded/embedded-cpp/part1-02-compiler-flags.md
- [ ] [임베디드 C++ 런타임 요구사항 — libstdc++·newlib·crt0 분석](../../src/content/blog/embedded/embedded-cpp/part1-03-runtime-requirements.md) — src/content/blog/embedded/embedded-cpp/part1-03-runtime-requirements.md
- [ ] [C++ 코드 크기 분석 — 가상 함수·템플릿·예외 비용 추적](../../src/content/blog/embedded/embedded-cpp/part1-04-code-size-analysis.md) — src/content/blog/embedded/embedded-cpp/part1-04-code-size-analysis.md
- [ ] [C++ ABI 호환성 — Itanium ABI·name mangling·vtable 레이아웃](../../src/content/blog/embedded/embedded-cpp/part1-05-abi-compatibility.md) — src/content/blog/embedded/embedded-cpp/part1-05-abi-compatibility.md
- [ ] [C++ 스타트업 코드 분석 — .init_array·전역 생성자 호출 순서](../../src/content/blog/embedded/embedded-cpp/part1-06-startup-code.md) — src/content/blog/embedded/embedded-cpp/part1-06-startup-code.md
- [ ] [임베디드 C++ 링커 스크립트 — vtable·정적 객체 배치 추적](../../src/content/blog/embedded/embedded-cpp/part1-07-linker-scripts.md) — src/content/blog/embedded/embedded-cpp/part1-07-linker-scripts.md
- [ ] [임베디드 C++ 표준 선택 가이드 — C++11/14/17/20/23 트레이드오프](../../src/content/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice.md) — src/content/blog/embedded/embedded-cpp/part1-08-cpp-standard-choice.md
- [ ] [임베디드 RAII 기초 — 리소스 안전성과 결정적 소멸 보장](../../src/content/blog/embedded/embedded-cpp/part2-01-raii-basics.md) — src/content/blog/embedded/embedded-cpp/part2-01-raii-basics.md
- [ ] [임베디드 RAII 실전 패턴 — Lock·Pin·DMA·Power 관리](../../src/content/blog/embedded/embedded-cpp/part2-02-raii-patterns.md) — src/content/blog/embedded/embedded-cpp/part2-02-raii-patterns.md
- [ ] [constexpr 기초와 임베디드 적용 — 컴파일 타임 계산 활용](../../src/content/blog/embedded/embedded-cpp/part2-03-constexpr-basics.md) — src/content/blog/embedded/embedded-cpp/part2-03-constexpr-basics.md
- [ ] [constexpr 고급 활용 — 정렬 테이블·검색·해시 컴파일 타임 생성](../../src/content/blog/embedded/embedded-cpp/part2-04-constexpr-advanced.md) — src/content/blog/embedded/embedded-cpp/part2-04-constexpr-advanced.md
- [ ] [임베디드 Templates 기초 — 타입 안전과 코드 재사용 분석](../../src/content/blog/embedded/embedded-cpp/part2-06-templates-basics.md) — src/content/blog/embedded/embedded-cpp/part2-06-templates-basics.md
- [ ] [Template 비용 분석 — 코드 폭증·인스턴스화·디버그 정보 측정](../../src/content/blog/embedded/embedded-cpp/part2-07-templates-cost.md) — src/content/blog/embedded/embedded-cpp/part2-07-templates-cost.md
- [ ] [CRTP 패턴 분석 — vtable 없는 정적 다형성](../../src/content/blog/embedded/embedded-cpp/part2-08-static-polymorphism.md) — src/content/blog/embedded/embedded-cpp/part2-08-static-polymorphism.md
- [ ] [Type Traits 임베디드 활용 — SFINAE·is_pod·컴파일 타임 검사](../../src/content/blog/embedded/embedded-cpp/part2-09-type-traits.md) — src/content/blog/embedded/embedded-cpp/part2-09-type-traits.md
- [ ] [C++20 Concepts 활용 — 템플릿 제약과 가독성 개선](../../src/content/blog/embedded/embedded-cpp/part2-10-concepts.md) — src/content/blog/embedded/embedded-cpp/part2-10-concepts.md
- [ ] [동적 할당 없는 임베디드 C++ — placement new·정적 객체·풀](../../src/content/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc.md) — src/content/blog/embedded/embedded-cpp/part3-01-no-dynamic-alloc.md
- [ ] [Custom Allocator 기초 — std::allocator 인터페이스 분석](../../src/content/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics.md) — src/content/blog/embedded/embedded-cpp/part3-02-custom-allocator-basics.md
- [ ] [Pool Allocator 구현 — Fixed-Size Block과 O(1) 보장](../../src/content/blog/embedded/embedded-cpp/part3-03-pool-allocator.md) — src/content/blog/embedded/embedded-cpp/part3-03-pool-allocator.md
- [ ] [std::pmr 임베디드 활용 — Polymorphic Memory Resource 분석](../../src/content/blog/embedded/embedded-cpp/part3-04-pmr.md) — src/content/blog/embedded/embedded-cpp/part3-04-pmr.md
- [ ] [No-Exception C++ 설계 — 코드 크기·결정성 트레이드오프](../../src/content/blog/embedded/embedded-cpp/part3-05-no-exception-design.md) — src/content/blog/embedded/embedded-cpp/part3-05-no-exception-design.md
- [ ] [임베디드 에러 처리 패턴 — Result 전파·재시도·복구 정책](../../src/content/blog/embedded/embedded-cpp/part3-06-error-handling-patterns.md) — src/content/blog/embedded/embedded-cpp/part3-06-error-handling-patterns.md
- [ ] [std::expected 분석 — C++23 결과 타입과 에러 전파](../../src/content/blog/embedded/embedded-cpp/part3-07-expected.md) — src/content/blog/embedded/embedded-cpp/part3-07-expected.md
- [ ] [No-RTTI C++ 설계 — dynamic_cast 제거와 정적 타입 분기](../../src/content/blog/embedded/embedded-cpp/part3-08-no-rtti-design.md) — src/content/blog/embedded/embedded-cpp/part3-08-no-rtti-design.md
- [ ] [임베디드 스마트 포인터 선택 — unique·shared·custom 비교](../../src/content/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice.md) — src/content/blog/embedded/embedded-cpp/part3-09-smart-pointer-choice.md
- [ ] [임베디드 C++ 소유권 모델 — single·shared·borrow 패턴](../../src/content/blog/embedded/embedded-cpp/part3-10-ownership-model.md) — src/content/blog/embedded/embedded-cpp/part3-10-ownership-model.md
- [ ] [Intrusive Containers 분석 — 동적 할당 없는 컨테이너 설계](../../src/content/blog/embedded/embedded-cpp/part4-01-intrusive-containers.md) — src/content/blog/embedded/embedded-cpp/part4-01-intrusive-containers.md
- [ ] [ETL 라이브러리 분석 — Embedded Template Library의 STL 대체](../../src/content/blog/embedded/embedded-cpp/part4-02-etl-library.md) — src/content/blog/embedded/embedded-cpp/part4-02-etl-library.md
- [ ] [임베디드 Lock-free 기초 — atomic·memory ordering·CAS](../../src/content/blog/embedded/embedded-cpp/part4-03-lock-free-basics.md) — src/content/blog/embedded/embedded-cpp/part4-03-lock-free-basics.md
- [ ] [Lock-free Container 구현 — SPSC Queue·Ring Buffer](../../src/content/blog/embedded/embedded-cpp/part4-04-lock-free-container.md) — src/content/blog/embedded/embedded-cpp/part4-04-lock-free-container.md
- [ ] [임베디드 State Machine 패턴 — Variant·Visitor·Table-driven 비교](../../src/content/blog/embedded/embedded-cpp/part4-06-state-machine.md) — src/content/blog/embedded/embedded-cpp/part4-06-state-machine.md
- [ ] [Compile-time FSM 구현 — 템플릿으로 상태 전이 검증](../../src/content/blog/embedded/embedded-cpp/part4-07-compile-time-fsm.md) — src/content/blog/embedded/embedded-cpp/part4-07-compile-time-fsm.md
- [ ] [Singleton 대안 패턴 — Service Locator·Static Init·Phantom](../../src/content/blog/embedded/embedded-cpp/part4-08-singleton-alternatives.md) — src/content/blog/embedded/embedded-cpp/part4-08-singleton-alternatives.md
- [ ] [MMIO Register 추상화 — 타입 안전한 비트 필드 접근](../../src/content/blog/embedded/embedded-cpp/part5-01-register-abstraction.md) — src/content/blog/embedded/embedded-cpp/part5-01-register-abstraction.md
- [ ] [GPIO 추상화 패턴 — Template·Concept으로 보드 독립성](../../src/content/blog/embedded/embedded-cpp/part5-02-gpio-abstraction.md) — src/content/blog/embedded/embedded-cpp/part5-02-gpio-abstraction.md
- [ ] [Peripheral 추상화 — UART·SPI·I2C 공통 인터페이스 설계](../../src/content/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction.md) — src/content/blog/embedded/embedded-cpp/part5-03-peripheral-abstraction.md
- [ ] [임베디드 HAL 설계 패턴 — Static·Dynamic·Hybrid 비교](../../src/content/blog/embedded/embedded-cpp/part5-04-hal-design-patterns.md) — src/content/blog/embedded/embedded-cpp/part5-04-hal-design-patterns.md

### Embedded Debugging (1편)

- [ ] [J-Link 도구 체인 분석 — JLinkExe·RTT·GDB Server 활용](../../src/content/blog/tools/debugging/embedded/chapter04-jlink.md) — src/content/blog/tools/debugging/embedded/chapter04-jlink.md

### Embedded Performance Engineering (9편)

- [ ] [Embedded Performance Engineering — 임베디드 성능 엔지니어링 시리즈 소개](../../src/content/blog/embedded/performance-engineering/00-preface.md) — src/content/blog/embedded/performance-engineering/00-preface.md
- [ ] [성능 측정의 기본 — Wall-Clock·CPU Cycle·Instruction Count](../../src/content/blog/embedded/performance-engineering/part1-03-measurement.md) — src/content/blog/embedded/performance-engineering/part1-03-measurement.md
- [ ] [성능 데이터 통계적 분석 — Percentile·Histogram·평균의 함정](../../src/content/blog/embedded/performance-engineering/part1-04-statistics.md) — src/content/blog/embedded/performance-engineering/part1-04-statistics.md
- [ ] [임베디드 벤치마킹 기초 — 재현성·Warmup·노이즈 제거](../../src/content/blog/embedded/performance-engineering/part1-06-benchmark.md) — src/content/blog/embedded/performance-engineering/part1-06-benchmark.md
- [ ] [메모리 대역폭 분석 — STREAM·Roofline·Bus Saturation 측정](../../src/content/blog/embedded/performance-engineering/part2-08-memory-bandwidth.md) — src/content/blog/embedded/performance-engineering/part2-08-memory-bandwidth.md
- [ ] [CXL Interconnect 분석 — AI 시대 메모리 대역폭 확장](../../src/content/blog/embedded/performance-engineering/part3-11-cxl-interconnect.md) — src/content/blog/embedded/performance-engineering/part3-11-cxl-interconnect.md
- [ ] [Linux perf 기초 — stat·record·report 활용](../../src/content/blog/embedded/performance-engineering/part5-01-perf-basics.md) — src/content/blog/embedded/performance-engineering/part5-01-perf-basics.md
- [ ] [사례 분석 — 행렬 곱 성능과 메모리 접근 패턴](../../src/content/blog/embedded/performance-engineering/part6-02-case-cache-thrashing.md) — src/content/blog/embedded/performance-engineering/part6-02-case-cache-thrashing.md
- [ ] [사례 분석 — 카메라 payload와 DMA 전송 경로](../../src/content/blog/embedded/performance-engineering/part6-04-case-dma-tuning.md) — src/content/blog/embedded/performance-engineering/part6-04-case-dma-tuning.md

### GDB and LLDB (1편)

- [ ] [GDB 원격 디버깅 — gdbserver·OpenOCD·J-Link 통합](../../src/content/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging.md) — src/content/blog/tools/debugging/gdb-lldb/chapter08-remote-debugging.md

### Industrial Ethernet 심화 (4편)

- [ ] [EtherCAT 아키텍처 분해 — Processing on the Fly 메커니즘](../../src/content/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture.md) — src/content/blog/embedded/protocols/industrial-ethernet/chapter03-ethercat-architecture.md
- [ ] [PROFINET 개요 분석 — RT·IRT 클래스와 실시간 등급](../../src/content/blog/embedded/protocols/industrial-ethernet/chapter06-profinet.md) — src/content/blog/embedded/protocols/industrial-ethernet/chapter06-profinet.md
- [ ] [TSN 표준 분석 — IEEE 802.1 Time-Sensitive Networking 개요](../../src/content/blog/embedded/protocols/industrial-ethernet/chapter08-tsn.md) — src/content/blog/embedded/protocols/industrial-ethernet/chapter08-tsn.md
- [ ] [산업용 이더넷 프로토콜 비교 — EtherCAT·PROFINET·POWERLINK·TSN 선택](../../src/content/blog/embedded/protocols/industrial-ethernet/chapter12-comparison.md) — src/content/blog/embedded/protocols/industrial-ethernet/chapter12-comparison.md

### PCIe Deep Dive (15편)

- [ ] [Ch 1: PCIe Fundamentals — 계층 구조와 토폴로지](../../src/content/blog/embedded/hardware/pcie/chapter01-fundamentals.md) — src/content/blog/embedded/hardware/pcie/chapter01-fundamentals.md
- [ ] [Ch 2: TLP — Transaction Layer Packet](../../src/content/blog/embedded/hardware/pcie/chapter02-tlp.md) — src/content/blog/embedded/hardware/pcie/chapter02-tlp.md
- [ ] [Ch 3: Configuration Space — 4 KB ECAM·Capability Linked List](../../src/content/blog/embedded/hardware/pcie/chapter03-config-space.md) — src/content/blog/embedded/hardware/pcie/chapter03-config-space.md
- [ ] [Ch 4: BAR & MMIO — Device 자원의 호스트 주소 매핑](../../src/content/blog/embedded/hardware/pcie/chapter04-bar-mmio.md) — src/content/blog/embedded/hardware/pcie/chapter04-bar-mmio.md
- [ ] [Ch 5: Interrupts — INTx·MSI·MSI-X·Interrupt Remapping](../../src/content/blog/embedded/hardware/pcie/chapter05-interrupts.md) — src/content/blog/embedded/hardware/pcie/chapter05-interrupts.md
- [ ] [Ch 7: Error Handling — Correctable·Uncorrectable·AER·DPC](../../src/content/blog/embedded/hardware/pcie/chapter07-error-handling.md) — src/content/blog/embedded/hardware/pcie/chapter07-error-handling.md
- [ ] [Ch 8: Data Link Layer — DLLP·ACK/NAK·Flow Control·FLIT Mode](../../src/content/blog/embedded/hardware/pcie/chapter08-dllp.md) — src/content/blog/embedded/hardware/pcie/chapter08-dllp.md
- [ ] [Ch 9: Physical Layer — LTSSM·Equalization·SerDes](../../src/content/blog/embedded/hardware/pcie/chapter09-physical-layer.md) — src/content/blog/embedded/hardware/pcie/chapter09-physical-layer.md
- [ ] [Ch 10: Linux PCI Basics — Enumeration·Driver Model·sysfs](../../src/content/blog/embedded/hardware/pcie/chapter10-linux-basics.md) — src/content/blog/embedded/hardware/pcie/chapter10-linux-basics.md
- [ ] [Ch 11: DMA·IOMMU — Coherent·Streaming·ATS·PRI·PASID·IOMMUFD](../../src/content/blog/embedded/hardware/pcie/chapter11-linux-dma.md) — src/content/blog/embedded/hardware/pcie/chapter11-linux-dma.md
- [ ] [Ch 14: Linux Operations — Hot-plug·AER Recovery·DPC·ARI](../../src/content/blog/embedded/hardware/pcie/chapter14-linux-operations.md) — src/content/blog/embedded/hardware/pcie/chapter14-linux-operations.md
- [ ] [Ch 15: Tools — lspci·setpci·pcimem·protocol analyzer](../../src/content/blog/embedded/hardware/pcie/chapter15-tools.md) — src/content/blog/embedded/hardware/pcie/chapter15-tools.md
- [ ] [Ch 16: Troubleshooting — 실무 시나리오북](../../src/content/blog/embedded/hardware/pcie/chapter16-troubleshooting.md) — src/content/blog/embedded/hardware/pcie/chapter16-troubleshooting.md
- [ ] [Ch 18: Register Maps — Config Space·Capability 비트 reference](../../src/content/blog/embedded/hardware/pcie/chapter18-register-maps.md) — src/content/blog/embedded/hardware/pcie/chapter18-register-maps.md
- [ ] [Ch 19: 고급 기능 — Lane Margining·10-bit Tag·TPH·ACS·L0p](../../src/content/blog/embedded/hardware/pcie/chapter19-advanced-features.md) — src/content/blog/embedded/hardware/pcie/chapter19-advanced-features.md

### Practical RTOS Internals (9편)

- [ ] [Practical RTOS Internals — 실시간 커널 내부 분석 시리즈 소개](../../src/content/blog/embedded/rtos/practical-internals/00-preface.md) — src/content/blog/embedded/rtos/practical-internals/00-preface.md
- [ ] [실시간 스케줄링 알고리즘 비교 — RR·Priority·EDF·RMS](../../src/content/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms.md) — src/content/blog/embedded/rtos/practical-internals/part1-03-scheduling-algorithms.md
- [ ] [Preemption과 Cooperation — 강제 전환 vs 자발 양보](../../src/content/blog/embedded/rtos/practical-internals/part1-04-preemption.md) — src/content/blog/embedded/rtos/practical-internals/part1-04-preemption.md
- [ ] [인터럽트와 RTOS — ISR Context·Deferred Processing·FromISR API](../../src/content/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos.md) — src/content/blog/embedded/rtos/practical-internals/part1-05-interrupts-rtos.md
- [ ] [실시간성 분석 — Latency·Jitter·Deadline·WCET·RMA](../../src/content/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis.md) — src/content/blog/embedded/rtos/practical-internals/part1-10-realtime-analysis.md
- [ ] [Priority Inversion 문제 — Mars Pathfinder 사례·Bounded vs Unbounded](../../src/content/blog/embedded/rtos/practical-internals/part3-04-priority-inversion.md) — src/content/blog/embedded/rtos/practical-internals/part3-04-priority-inversion.md
- [ ] [Queue 내부 구현 추적 — Ring Buffer·2 Wait Lists·Atomic Send/Receive](../../src/content/blog/embedded/rtos/practical-internals/part3-07-queue-impl.md) — src/content/blog/embedded/rtos/practical-internals/part3-07-queue-impl.md
- [ ] [ISR-Safe API 설계 — FromISR 패턴·Higher Priority Wake·Deferred Work](../../src/content/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api.md) — src/content/blog/embedded/rtos/practical-internals/part3-09-isr-safe-api.md
- [ ] [Deadlock 분석 — 4 조건·Wait-for Graph·Lock Ordering·Timeout](../../src/content/blog/embedded/rtos/practical-internals/part3-10-deadlock.md) — src/content/blog/embedded/rtos/practical-internals/part3-10-deadlock.md

## Modern Embedded Recipes: 전체 시리즈 재검토

Part 8의 12편은 이번 작업에서 확인했습니다. 나머지는 점수 평가 대상과 별개로 이번 재검토에서 아직 확인하지 않았습니다.

### Part 1 (12편)

- [ ] [디지털 신호 기초 — Voltage Level·Edge·Setup/Hold 분석](../../src/content/blog/embedded/modern-recipes/part1-01-digital-signal-basics.md) — src/content/blog/embedded/modern-recipes/part1-01-digital-signal-basics.md
- [ ] [임베디드 클럭과 타이밍 — Skew·Jitter·PLL·MMCM 분석](../../src/content/blog/embedded/modern-recipes/part1-02-clock-timing.md) — src/content/blog/embedded/modern-recipes/part1-02-clock-timing.md
- [ ] [GPIO 내부 구조 분해 — Push-Pull·Open-Drain·Schmitt Trigger](../../src/content/blog/embedded/modern-recipes/part1-03-gpio-internals.md) — src/content/blog/embedded/modern-recipes/part1-03-gpio-internals.md
- [ ] [UART 하드웨어 동작 분석 — Baud Rate·Framing·FIFO](../../src/content/blog/embedded/modern-recipes/part1-04-uart-hardware.md) — src/content/blog/embedded/modern-recipes/part1-04-uart-hardware.md
- [ ] [SPI 하드웨어 분석 — Clock Mode·MOSI/MISO·Chip Select](../../src/content/blog/embedded/modern-recipes/part1-05-spi-hardware.md) — src/content/blog/embedded/modern-recipes/part1-05-spi-hardware.md
- [ ] [I2C 하드웨어 분석 — Open-Drain·Clock Stretching·Arbitration](../../src/content/blog/embedded/modern-recipes/part1-06-i2c-hardware.md) — src/content/blog/embedded/modern-recipes/part1-06-i2c-hardware.md
- [ ] [ADC 동작 원리 — SAR·Sigma-Delta 비교](../../src/content/blog/embedded/modern-recipes/part1-07-adc-principles.md) — src/content/blog/embedded/modern-recipes/part1-07-adc-principles.md
- [ ] [DAC 동작 원리 — R-2R Ladder·Sigma-Delta·Settling Time](../../src/content/blog/embedded/modern-recipes/part1-08-dac-principles.md) — src/content/blog/embedded/modern-recipes/part1-08-dac-principles.md
- [ ] [PWM 신호 생성 분석 — Duty·Frequency·Dead Time·Center-Aligned](../../src/content/blog/embedded/modern-recipes/part1-09-pwm-signal.md) — src/content/blog/embedded/modern-recipes/part1-09-pwm-signal.md
- [ ] [CAN 버스 전기적 특성 — 종단·전압 레벨·GND 전위차와 1 Mbit/s 버스 길이 예산](../../src/content/blog/embedded/modern-recipes/part1-10-can-electrical.md) — src/content/blog/embedded/modern-recipes/part1-10-can-electrical.md
- [ ] [RS-485·RS-422 차동 신호 분석 — Termination·Biasing·Topology](../../src/content/blog/embedded/modern-recipes/part1-11-rs485-rs422.md) — src/content/blog/embedded/modern-recipes/part1-11-rs485-rs422.md
- [ ] [LVDS 차동 신호 분석 — Common-Mode·Impedance·Eye Pattern](../../src/content/blog/embedded/modern-recipes/part1-12-lvds-differential.md) — src/content/blog/embedded/modern-recipes/part1-12-lvds-differential.md

### Part 2 (10편)

- [ ] [ARM Cortex-M 시리즈 비교 — M0·M3·M4·M7·M33·M55 분석](../../src/content/blog/embedded/modern-recipes/part2-01-cortex-m-comparison.md) — src/content/blog/embedded/modern-recipes/part2-01-cortex-m-comparison.md
- [ ] [ARM Cortex-A 시리즈 비교 — A53·A55·A72·A78·X1 분석](../../src/content/blog/embedded/modern-recipes/part2-02-cortex-a-comparison.md) — src/content/blog/embedded/modern-recipes/part2-02-cortex-a-comparison.md
- [ ] [Cortex-M 레지스터 구조 분석 — R0~R15·xPSR·CONTROL·Mask Registers](../../src/content/blog/embedded/modern-recipes/part2-03-arm-registers.md) — src/content/blog/embedded/modern-recipes/part2-03-arm-registers.md
- [ ] [Cortex-M4 예외 처리 — Vector Table·NVIC 우선순위·Tail-Chaining](../../src/content/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions.md) — src/content/blog/embedded/modern-recipes/part2-04-cortex-m-exceptions.md
- [ ] [ARM 메모리 맵 분석 — Normal·Device·Strongly-Ordered Region](../../src/content/blog/embedded/modern-recipes/part2-05-arm-memory-map.md) — src/content/blog/embedded/modern-recipes/part2-05-arm-memory-map.md
- [ ] [Cortex-M7 캐시와 DMA — Cache Line·Write-Back·Clean/Invalidate 순서](../../src/content/blog/embedded/modern-recipes/part2-06-arm-cache.md) — src/content/blog/embedded/modern-recipes/part2-06-arm-cache.md
- [ ] [Cortex-M4 MPU 활용 — Region 배치·Stack Guard·Task 격리](../../src/content/blog/embedded/modern-recipes/part2-07-arm-mpu.md) — src/content/blog/embedded/modern-recipes/part2-07-arm-mpu.md
- [ ] [AArch64 Linux MMU 기초 — Translation Table·TLB·ASID](../../src/content/blog/embedded/modern-recipes/part2-08-arm-mmu.md) — src/content/blog/embedded/modern-recipes/part2-08-arm-mmu.md
- [ ] [ARM TrustZone-M 기초 — Secure/Non-Secure·NSC·MPC](../../src/content/blog/embedded/modern-recipes/part2-09-trustzone-m.md) — src/content/blog/embedded/modern-recipes/part2-09-trustzone-m.md
- [ ] [ARM Memory Barrier 실전 — DMB·DSB·ISB·DMA·MMIO](../../src/content/blog/embedded/modern-recipes/part2-10-memory-barrier.md) — src/content/blog/embedded/modern-recipes/part2-10-memory-barrier.md

### Part 3 (12편)

- [ ] [임베디드 크로스 컴파일러 분석 — GCC·Clang·Sysroot 구성](../../src/content/blog/embedded/modern-recipes/part3-01-cross-compiler.md) — src/content/blog/embedded/modern-recipes/part3-01-cross-compiler.md
- [ ] [C 컴파일 4단계 — Preprocess·Compile·Assemble·Link 추적](../../src/content/blog/embedded/modern-recipes/part3-02-compile-pipeline.md) — src/content/blog/embedded/modern-recipes/part3-02-compile-pipeline.md
- [ ] [ELF 파일 구조 분석 — Section·Segment·Symbol Table·DWARF](../../src/content/blog/embedded/modern-recipes/part3-03-elf-format.md) — src/content/blog/embedded/modern-recipes/part3-03-elf-format.md
- [ ] [링커 스크립트 기초 — SECTIONS·MEMORY·entry point](../../src/content/blog/embedded/modern-recipes/part3-04-linker-script-basics.md) — src/content/blog/embedded/modern-recipes/part3-04-linker-script-basics.md
- [ ] [링커 스크립트 고급 — Overlay·BSS·init_array·LMA/VMA](../../src/content/blog/embedded/modern-recipes/part3-05-linker-script-advanced.md) — src/content/blog/embedded/modern-recipes/part3-05-linker-script-advanced.md
- [ ] [임베디드 스타트업 코드 분석 — Reset_Handler·Vector Table·SystemInit](../../src/content/blog/embedded/modern-recipes/part3-06-startup-code.md) — src/content/blog/embedded/modern-recipes/part3-06-startup-code.md
- [ ] [C 런타임 crt0 분석 — Stack·BSS Zero·Data Copy·atexit](../../src/content/blog/embedded/modern-recipes/part3-07-c-runtime.md) — src/content/blog/embedded/modern-recipes/part3-07-c-runtime.md
- [ ] [임베디드 메모리 레이아웃 — .text·.rodata·.data·.bss·.heap·.stack](../../src/content/blog/embedded/modern-recipes/part3-08-memory-layout.md) — src/content/blog/embedded/modern-recipes/part3-08-memory-layout.md
- [ ] [임베디드 컴파일러 최적화 분석 — -O0~-O3·-Os·-LTO 비교](../../src/content/blog/embedded/modern-recipes/part3-09-compiler-optimization.md) — src/content/blog/embedded/modern-recipes/part3-09-compiler-optimization.md
- [ ] [Map 파일 분석 — 링커가 넣은 것, 끌어온 이유, 버린 것 읽기](../../src/content/blog/embedded/modern-recipes/part3-10-map-file-analysis.md) — src/content/blog/embedded/modern-recipes/part3-10-map-file-analysis.md
- [ ] [Make·CMake 크로스 컴파일 — Toolchain File·Sysroot·Preset](../../src/content/blog/embedded/modern-recipes/part3-11-make-cmake-cross.md) — src/content/blog/embedded/modern-recipes/part3-11-make-cmake-cross.md
- [ ] [임베디드 Bootloader 체인 — BootROM·SPL·U-Boot·Kernel·Secure Boot](../../src/content/blog/embedded/modern-recipes/part3-12-bootloader-chain.md) — src/content/blog/embedded/modern-recipes/part3-12-bootloader-chain.md

### Part 4 (14편)

- [ ] [첫 bare-metal 프로그램 작성 — Linker·Startup·main의 최소 구성](../../src/content/blog/embedded/modern-recipes/part4-01-first-baremetal.md) — src/content/blog/embedded/modern-recipes/part4-01-first-baremetal.md
- [ ] [MMIO 레지스터 직접 접근 — volatile·Memory Map·Aliasing 분석](../../src/content/blog/embedded/modern-recipes/part4-02-mmio-access.md) — src/content/blog/embedded/modern-recipes/part4-02-mmio-access.md
- [ ] [GPIO 드라이버 직접 구현 — STM32F407을 HAL 없이 레지스터로](../../src/content/blog/embedded/modern-recipes/part4-03-gpio-driver.md) — src/content/blog/embedded/modern-recipes/part4-03-gpio-driver.md
- [ ] [임베디드 클럭 설정 분석 — HSE·PLL·SYSCLK·AHB/APB 분주](../../src/content/blog/embedded/modern-recipes/part4-04-clock-setup.md) — src/content/blog/embedded/modern-recipes/part4-04-clock-setup.md
- [ ] [Cortex-M 인터럽트 핸들링 — NVIC·Priority·Vector·EXTI](../../src/content/blog/embedded/modern-recipes/part4-05-interrupt-handling.md) — src/content/blog/embedded/modern-recipes/part4-05-interrupt-handling.md
- [ ] [SysTick 타이머 활용 — 24-bit Counter·1ms Tick·delay 구현](../../src/content/blog/embedded/modern-recipes/part4-06-systick-timer.md) — src/content/blog/embedded/modern-recipes/part4-06-systick-timer.md
- [ ] [UART 드라이버 구현 — polling·interrupt·DMA 3가지 방식 비교](../../src/content/blog/embedded/modern-recipes/part4-07-uart-driver.md) — src/content/blog/embedded/modern-recipes/part4-07-uart-driver.md
- [ ] [SPI 드라이버 구현 — Master·Slave·CRC·DMA](../../src/content/blog/embedded/modern-recipes/part4-08-spi-driver.md) — src/content/blog/embedded/modern-recipes/part4-08-spi-driver.md
- [ ] [I2C 드라이버 구현 — STM32F405/407 Master·Repeated START·Clock Stretching·Bus Recovery](../../src/content/blog/embedded/modern-recipes/part4-09-i2c-driver.md) — src/content/blog/embedded/modern-recipes/part4-09-i2c-driver.md
- [ ] [임베디드 DMA 기초 — Memory-to-Memory·Peripheral·Circular Mode](../../src/content/blog/embedded/modern-recipes/part4-10-dma-basics.md) — src/content/blog/embedded/modern-recipes/part4-10-dma-basics.md
- [ ] [저전력 모드 분석 — Sleep·Stop·Standby·Wake-up Source](../../src/content/blog/embedded/modern-recipes/part4-11-low-power-modes.md) — src/content/blog/embedded/modern-recipes/part4-11-low-power-modes.md
- [ ] [STM32F405/407 IWDG·WWDG 워치독 구현 — Independent vs Window 비교](../../src/content/blog/embedded/modern-recipes/part4-12-watchdog.md) — src/content/blog/embedded/modern-recipes/part4-12-watchdog.md
- [ ] [임베디드 Flash 프로그래밍 — Erase·Program·Read While Write](../../src/content/blog/embedded/modern-recipes/part4-13-flash-programming.md) — src/content/blog/embedded/modern-recipes/part4-13-flash-programming.md
- [ ] [DDR 초기화 실패 진단 — Timing·Calibration·Walking Bit Test](../../src/content/blog/embedded/modern-recipes/part4-14-ddr-init-failure.md) — src/content/blog/embedded/modern-recipes/part4-14-ddr-init-failure.md

### Part 5 (14편)

- [ ] [PWM 출력 실전 — LED 밝기·모터 속도 제어](../../src/content/blog/embedded/modern-recipes/part5-01-pwm-output.md) — src/content/blog/embedded/modern-recipes/part5-01-pwm-output.md
- [ ] [DC 모터 제어 — H-Bridge·PWM Duty·Encoder Feedback](../../src/content/blog/embedded/modern-recipes/part5-02-dc-motor.md) — src/content/blog/embedded/modern-recipes/part5-02-dc-motor.md
- [ ] [스테퍼 모터 제어 — Full Step·Half Step·Microstepping](../../src/content/blog/embedded/modern-recipes/part5-03-stepper-motor.md) — src/content/blog/embedded/modern-recipes/part5-03-stepper-motor.md
- [ ] [서보 모터 제어 — PWM 1ms~2ms·Closed Loop·PID](../../src/content/blog/embedded/modern-recipes/part5-04-servo-motor.md) — src/content/blog/embedded/modern-recipes/part5-04-servo-motor.md
- [ ] [Character LCD 제어 — HD44780·4-bit Mode·Custom Char](../../src/content/blog/embedded/modern-recipes/part5-05-character-lcd.md) — src/content/blog/embedded/modern-recipes/part5-05-character-lcd.md
- [ ] [SPI OLED 제어 — SSD1306·Frame Buffer·Page 단위 갱신](../../src/content/blog/embedded/modern-recipes/part5-06-spi-oled.md) — src/content/blog/embedded/modern-recipes/part5-06-spi-oled.md
- [ ] [TFT 디스플레이 구동 — ILI9341 SPI와 STM32F746 LTDC](../../src/content/blog/embedded/modern-recipes/part5-07-tft-display.md) — src/content/blog/embedded/modern-recipes/part5-07-tft-display.md
- [ ] [환경 센서 활용 — BME280 온습압·SHT3x 비교](../../src/content/blog/embedded/modern-recipes/part5-08-environmental-sensors.md) — src/content/blog/embedded/modern-recipes/part5-08-environmental-sensors.md
- [ ] [IMU 센서 활용 — MPU6050·BMI270·Sensor Fusion](../../src/content/blog/embedded/modern-recipes/part5-09-imu-sensor.md) — src/content/blog/embedded/modern-recipes/part5-09-imu-sensor.md
- [ ] [CAN 통신 구현 — bxCAN·Filter·Mailbox·CAN-FD](../../src/content/blog/embedded/modern-recipes/part5-10-can-communication.md) — src/content/blog/embedded/modern-recipes/part5-10-can-communication.md
- [ ] [USB Device 기초 — Descriptor·Enumeration·Endpoint·HID/CDC](../../src/content/blog/embedded/modern-recipes/part5-11-usb-device.md) — src/content/blog/embedded/modern-recipes/part5-11-usb-device.md
- [ ] [Ethernet MAC+PHY 통합 — RMII·lwIP·DMA Descriptor](../../src/content/blog/embedded/modern-recipes/part5-12-ethernet-mac-phy.md) — src/content/blog/embedded/modern-recipes/part5-12-ethernet-mac-phy.md
- [ ] [SD 카드 SPI 모드 + FatFs — 초기화·diskio 포팅·다중 블록 쓰기와 f_sync](../../src/content/blog/embedded/modern-recipes/part5-13-sd-card-fatfs.md) — src/content/blog/embedded/modern-recipes/part5-13-sd-card-fatfs.md
- [ ] [STM32F4 RTC 활용 — Calendar·Alarm·Sub-second·Tamper·Backup Register](../../src/content/blog/embedded/modern-recipes/part5-14-rtc-utilization.md) — src/content/blog/embedded/modern-recipes/part5-14-rtc-utilization.md

### Part 6 (12편)

- [ ] [RTOS 도입 결정 분석 — Super Loop vs RTOS 트레이드오프](../../src/content/blog/embedded/modern-recipes/part6-01-rtos-decision.md) — src/content/blog/embedded/modern-recipes/part6-01-rtos-decision.md
- [ ] [RTOS Task 설계 패턴 — 우선순위·스택·State Machine](../../src/content/blog/embedded/modern-recipes/part6-02-task-design.md) — src/content/blog/embedded/modern-recipes/part6-02-task-design.md
- [ ] [RTOS Scheduler 동작 분석 — Tick·Context Switch·Yield](../../src/content/blog/embedded/modern-recipes/part6-03-scheduler-internals.md) — src/content/blog/embedded/modern-recipes/part6-03-scheduler-internals.md
- [ ] [RTOS Semaphore 활용 — Binary·Counting·ISR Give](../../src/content/blog/embedded/modern-recipes/part6-04-semaphore-usage.md) — src/content/blog/embedded/modern-recipes/part6-04-semaphore-usage.md
- [ ] [RTOS Mutex 활용 — Recursive·Priority Inheritance 적용](../../src/content/blog/embedded/modern-recipes/part6-05-mutex-usage.md) — src/content/blog/embedded/modern-recipes/part6-05-mutex-usage.md
- [ ] [RTOS Queue 활용 — By-Value·By-Reference·Timeout 패턴](../../src/content/blog/embedded/modern-recipes/part6-06-queue-usage.md) — src/content/blog/embedded/modern-recipes/part6-06-queue-usage.md
- [ ] [RTOS Event Group 활용 — Bit Wait·Sync·Notify](../../src/content/blog/embedded/modern-recipes/part6-07-event-group.md) — src/content/blog/embedded/modern-recipes/part6-07-event-group.md
- [ ] [RTOS Software Timer 활용 — One-shot·Auto-reload·Daemon Task](../../src/content/blog/embedded/modern-recipes/part6-08-software-timer.md) — src/content/blog/embedded/modern-recipes/part6-08-software-timer.md
- [ ] [ISR-Safe API 설계 — Reentrant·Atomic·Defer 패턴](../../src/content/blog/embedded/modern-recipes/part6-09-isr-api.md) — src/content/blog/embedded/modern-recipes/part6-09-isr-api.md
- [ ] [Priority Inversion 진단·예방 — Mars Pathfinder Lesson 추적](../../src/content/blog/embedded/modern-recipes/part6-10-priority-inversion.md) — src/content/blog/embedded/modern-recipes/part6-10-priority-inversion.md
- [ ] [Timer Wheel 분석 — Hashed·Hierarchical·O(1) Tick](../../src/content/blog/embedded/modern-recipes/part6-11-timer-services.md) — src/content/blog/embedded/modern-recipes/part6-11-timer-services.md
- [ ] [RTOS 디버깅 기법 — Tracealyzer·SystemView·Stack 추적](../../src/content/blog/embedded/modern-recipes/part6-12-rtos-debugging.md) — src/content/blog/embedded/modern-recipes/part6-12-rtos-debugging.md

### Part 7 (14편)

- [ ] [i.MX8M Mini EVK Linux 부팅 흐름 — BootROM에서 PID 1까지 단계별 인계](../../src/content/blog/embedded/modern-recipes/part7-01-linux-boot-flow.md) — src/content/blog/embedded/modern-recipes/part7-01-linux-boot-flow.md
- [ ] [U-Boot 활용 — bootcmd·env·tftp·boot.scr 분석](../../src/content/blog/embedded/modern-recipes/part7-02-uboot-usage.md) — src/content/blog/embedded/modern-recipes/part7-02-uboot-usage.md
- [ ] [Device Tree 실전 — DTS·DTB·Overlay·Phandle 추적](../../src/content/blog/embedded/modern-recipes/part7-03-device-tree-basics.md) — src/content/blog/embedded/modern-recipes/part7-03-device-tree-basics.md
- [ ] [Device Tree Overlay 적용 — Runtime fragment·dtoverlay](../../src/content/blog/embedded/modern-recipes/part7-04-device-tree-overlay.md) — src/content/blog/embedded/modern-recipes/part7-04-device-tree-overlay.md
- [ ] [임베디드 커널 빌드 — defconfig·menuconfig·Image·zImage](../../src/content/blog/embedded/modern-recipes/part7-05-kernel-build.md) — src/content/blog/embedded/modern-recipes/part7-05-kernel-build.md
- [ ] [커널 모듈 기초 — init/exit·Parameter·KBuild·DKMS](../../src/content/blog/embedded/modern-recipes/part7-06-kernel-module.md) — src/content/blog/embedded/modern-recipes/part7-06-kernel-module.md
- [ ] [캐릭터 드라이버 작성 — file_operations·cdev·register_chrdev](../../src/content/blog/embedded/modern-recipes/part7-07-char-driver.md) — src/content/blog/embedded/modern-recipes/part7-07-char-driver.md
- [ ] [Platform 드라이버 작성 — of_match·devm 해제 순서·probe 실패 판정 (Linux v6.12)](../../src/content/blog/embedded/modern-recipes/part7-08-platform-driver.md) — src/content/blog/embedded/modern-recipes/part7-08-platform-driver.md
- [ ] [mmap 4가지 모드 — Anonymous·File·Shared·Huge Page](../../src/content/blog/embedded/modern-recipes/part7-09-mmap.md) — src/content/blog/embedded/modern-recipes/part7-09-mmap.md
- [ ] [epoll 실전 — LT·ET·ONESHOT·EXCLUSIVE 비교](../../src/content/blog/embedded/modern-recipes/part7-10-epoll.md) — src/content/blog/embedded/modern-recipes/part7-10-epoll.md
- [ ] [UIO·VFIO 분석 — User-Space Driver와 IOMMU 격리](../../src/content/blog/embedded/modern-recipes/part7-11-uio-vfio.md) — src/content/blog/embedded/modern-recipes/part7-11-uio-vfio.md
- [ ] [sysfs·configfs 활용 — kobject 기반 User 인터페이스](../../src/content/blog/embedded/modern-recipes/part7-12-sysfs.md) — src/content/blog/embedded/modern-recipes/part7-12-sysfs.md
- [ ] [IRQ Affinity 설정이 거부되거나 되돌아가는 이유 — smp_affinity·effective_affinity·isolcpus·irqbalance](../../src/content/blog/embedded/modern-recipes/part7-13-irq-affinity.md) — src/content/blog/embedded/modern-recipes/part7-13-irq-affinity.md
- [ ] [루트 파일시스템 구축 — Buildroot 기초·Package·Toolchain](../../src/content/blog/embedded/modern-recipes/part7-14-rootfs-buildroot.md) — src/content/blog/embedded/modern-recipes/part7-14-rootfs-buildroot.md

### Part 8 (12편)

- [x] [임베디드 동적 메모리 — malloc 위험·결정성·대안 분석](../../src/content/blog/embedded/modern-recipes/part8-01-dynamic-memory.md) — src/content/blog/embedded/modern-recipes/part8-01-dynamic-memory.md
- [x] [메모리 정렬과 패딩 분석 — Natural·Strict Alignment·Trap](../../src/content/blog/embedded/modern-recipes/part8-02-memory-alignment.md) — src/content/blog/embedded/modern-recipes/part8-02-memory-alignment.md
- [x] [Cache Line Alignment — alignas·Padding·SoA 적용](../../src/content/blog/embedded/modern-recipes/part8-03-cache-alignment.md) — src/content/blog/embedded/modern-recipes/part8-03-cache-alignment.md
- [x] [DMA-Friendly Allocator — dma_alloc_coherent·IOMMU·Pool](../../src/content/blog/embedded/modern-recipes/part8-04-dma-allocator.md) — src/content/blog/embedded/modern-recipes/part8-04-dma-allocator.md
- [x] [Zero-Copy Pipeline — DMA-BUF·sendfile·io_uring·splice](../../src/content/blog/embedded/modern-recipes/part8-05-zero-copy.md) — src/content/blog/embedded/modern-recipes/part8-05-zero-copy.md
- [x] [NUMA Memory Topology — numactl·numa_alloc·HBM 적용](../../src/content/blog/embedded/modern-recipes/part8-06-numa.md) — src/content/blog/embedded/modern-recipes/part8-06-numa.md
- [x] [SIMD 활용 분석 — Intrinsics·Auto-Vectorization·OpenMP SIMD](../../src/content/blog/embedded/modern-recipes/part8-07-simd.md) — src/content/blog/embedded/modern-recipes/part8-07-simd.md
- [x] [ARM NEON 심화 — Matrix Multiply·FFT·Image Filter 적용](../../src/content/blog/embedded/modern-recipes/part8-08-neon.md) — src/content/blog/embedded/modern-recipes/part8-08-neon.md
- [x] [임베디드 스택 분석 — high-water·overflow 탐지](../../src/content/blog/embedded/modern-recipes/part8-09-stack-analysis.md) — src/content/blog/embedded/modern-recipes/part8-09-stack-analysis.md
- [x] [임베디드 코드 크기 최적화 — -Os·LTO·Section Garbage Collection](../../src/content/blog/embedded/modern-recipes/part8-10-code-size-optimization.md) — src/content/blog/embedded/modern-recipes/part8-10-code-size-optimization.md
- [x] [임베디드 전력 최적화 — Sleep Mode·Clock Gating·DVFS](../../src/content/blog/embedded/modern-recipes/part8-11-power-optimization.md) — src/content/blog/embedded/modern-recipes/part8-11-power-optimization.md
- [x] [WCET 분석 기법 — Static·Measurement·Hybrid 방법론](../../src/content/blog/embedded/modern-recipes/part8-12-wcet-analysis.md) — src/content/blog/embedded/modern-recipes/part8-12-wcet-analysis.md

### Part 9 (10편)

- [ ] [Lock-Free Ring Buffer 구현 — SPSC·Power-of-2·Memory Order](../../src/content/blog/embedded/modern-recipes/part9-01-lock-free-ring.md) — src/content/blog/embedded/modern-recipes/part9-01-lock-free-ring.md
- [ ] [Wait-Free Signaling — Atomic Flag·Sequence·Latest-Value](../../src/content/blog/embedded/modern-recipes/part9-02-wait-free.md) — src/content/blog/embedded/modern-recipes/part9-02-wait-free.md
- [ ] [RCU (Read-Copy-Update) 기초 — Quiescent State·Grace Period](../../src/content/blog/embedded/modern-recipes/part9-03-rcu-basics.md) — src/content/blog/embedded/modern-recipes/part9-03-rcu-basics.md
- [ ] [Hazard Pointer 분석 — Lock-Free Memory Reclamation](../../src/content/blog/embedded/modern-recipes/part9-04-hazard-pointer.md) — src/content/blog/embedded/modern-recipes/part9-04-hazard-pointer.md
- [ ] [Compare-And-Swap 패턴 — Stack·Counter·Linked List 적용](../../src/content/blog/embedded/modern-recipes/part9-05-cas-patterns.md) — src/content/blog/embedded/modern-recipes/part9-05-cas-patterns.md
- [ ] [Atomic Operation 비용 분석 — Fence·Cache Line·Contention](../../src/content/blog/embedded/modern-recipes/part9-06-atomic-cost.md) — src/content/blog/embedded/modern-recipes/part9-06-atomic-cost.md
- [ ] [Spinlock vs Mutex 결정 가이드 — Context Switch·Hold Time](../../src/content/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex.md) — src/content/blog/embedded/modern-recipes/part9-07-spinlock-vs-mutex.md
- [ ] [ABA 문제 회피 — Tagged Pointer·Hazard·Generation Counter](../../src/content/blog/embedded/modern-recipes/part9-08-aba-problem.md) — src/content/blog/embedded/modern-recipes/part9-08-aba-problem.md
- [ ] [False Sharing 해결 — Cache Line Padding·SoA 적용](../../src/content/blog/embedded/modern-recipes/part9-09-false-sharing.md) — src/content/blog/embedded/modern-recipes/part9-09-false-sharing.md
- [ ] [MPMC Queue 구현 — Multi-producer Multi-consumer Lock-Free](../../src/content/blog/embedded/modern-recipes/part9-10-mpmc-queue.md) — src/content/blog/embedded/modern-recipes/part9-10-mpmc-queue.md

### Part 10 (12편)

- [ ] [임베디드 디버깅 마인드셋 — 가설·격리·재현·이분탐색](../../src/content/blog/embedded/modern-recipes/part10-01-debug-mindset.md) — src/content/blog/embedded/modern-recipes/part10-01-debug-mindset.md
- [ ] [JTAG·SWD 안 붙을 때 — 핀·전압·속도·세션 진단](../../src/content/blog/embedded/modern-recipes/part10-02-jtag-swd.md) — src/content/blog/embedded/modern-recipes/part10-02-jtag-swd.md
- [ ] [GDB 원격 디버깅 — OpenOCD·J-Link·target remote 구성](../../src/content/blog/embedded/modern-recipes/part10-03-gdb-remote-debug.md) — src/content/blog/embedded/modern-recipes/part10-03-gdb-remote-debug.md
- [ ] [Cortex-M 하드폴트 분석 — Stacked Frame·CFSR 읽기](../../src/content/blog/embedded/modern-recipes/part10-04-hardfault-analysis.md) — src/content/blog/embedded/modern-recipes/part10-04-hardfault-analysis.md
- [ ] [UART 안 찍힐 때 — Bare-metal 체크리스트](../../src/content/blog/embedded/modern-recipes/part10-05-uart-not-printing.md) — src/content/blog/embedded/modern-recipes/part10-05-uart-not-printing.md
- [ ] [임베디드 부팅 실패 진단 — 단계별 Isolation](../../src/content/blog/embedded/modern-recipes/part10-06-boot-failure.md) — src/content/blog/embedded/modern-recipes/part10-06-boot-failure.md
- [ ] [인터럽트 누락·중복 진단 — Priority·Pending·Re-entry 추적](../../src/content/blog/embedded/modern-recipes/part10-07-interrupt-debugging.md) — src/content/blog/embedded/modern-recipes/part10-07-interrupt-debugging.md
- [ ] [메모리 오버플로우·오염 진단 — Canary·MPU·Pattern 분석](../../src/content/blog/embedded/modern-recipes/part10-08-memory-corruption.md) — src/content/blog/embedded/modern-recipes/part10-08-memory-corruption.md
- [ ] [타이밍·Race 진단 — Heisenbug 잡는 법](../../src/content/blog/embedded/modern-recipes/part10-09-timing-race-diag.md) — src/content/blog/embedded/modern-recipes/part10-09-timing-race-diag.md
- [ ] [통신 프로토콜 분석 — Logic Analyzer와 Protocol Decoder](../../src/content/blog/embedded/modern-recipes/part10-10-protocol-analyzer.md) — src/content/blog/embedded/modern-recipes/part10-10-protocol-analyzer.md
- [ ] [임베디드 로깅 시스템 설계 — 레벨·버퍼·SWO·Deferred](../../src/content/blog/embedded/modern-recipes/part10-11-logging-system.md) — src/content/blog/embedded/modern-recipes/part10-11-logging-system.md
- [ ] [임베디드 포스트모템 분석 — Core Dump와 Field Crash](../../src/content/blog/embedded/modern-recipes/part10-12-postmortem-analysis.md) — src/content/blog/embedded/modern-recipes/part10-12-postmortem-analysis.md

### Part 11 (17편)

- [ ] [FPGA 기초 분석 — LUT·FF·BRAM·DSP 자원 구조](../../src/content/blog/embedded/modern-recipes/part11-01-fpga-basics.md) — src/content/blog/embedded/modern-recipes/part11-01-fpga-basics.md
- [ ] [Vivado 사용법 — Project·Constraint·Synth·Impl·Bitstream](../../src/content/blog/embedded/modern-recipes/part11-02-vivado-usage.md) — src/content/blog/embedded/modern-recipes/part11-02-vivado-usage.md
- [ ] [PCIe BAR 매핑 분석 — Config Space·Enumeration·MMIO 접근](../../src/content/blog/embedded/modern-recipes/part11-03-pcie-bar.md) — src/content/blog/embedded/modern-recipes/part11-03-pcie-bar.md
- [ ] [AXI 인터페이스 — AXI4·AXI4-Lite·AXI-Stream 비교](../../src/content/blog/embedded/modern-recipes/part11-04-axi.md) — src/content/blog/embedded/modern-recipes/part11-04-axi.md
- [ ] [Zynq PS-PL 통신 — GP·HP·ACP 인터페이스 선택](../../src/content/blog/embedded/modern-recipes/part11-05-ps-pl-communication.md) — src/content/blog/embedded/modern-recipes/part11-05-ps-pl-communication.md
- [ ] [Mailbox Protocol 분석 — Host와 Accelerator를 잇는 Doorbell](../../src/content/blog/embedded/modern-recipes/part11-06-mailbox.md) — src/content/blog/embedded/modern-recipes/part11-06-mailbox.md
- [ ] [Command Queue·Submission Queue — NVMe·XDMA 공통 패턴](../../src/content/blog/embedded/modern-recipes/part11-07-cq-sq.md) — src/content/blog/embedded/modern-recipes/part11-07-cq-sq.md
- [ ] [DMA Completion 메커니즘 — Interrupt·Polling·Completion Ring](../../src/content/blog/embedded/modern-recipes/part11-08-dma-completion.md) — src/content/blog/embedded/modern-recipes/part11-08-dma-completion.md
- [ ] [PCIe Streaming 분석 — BAR Type·MSI-X·Kernel Bypass](../../src/content/blog/embedded/modern-recipes/part11-09-pcie-streaming.md) — src/content/blog/embedded/modern-recipes/part11-09-pcie-streaming.md
- [ ] [Vitis HLS 분석 — Pragma·Pipeline II·Dataflow 실전 감각](../../src/content/blog/embedded/modern-recipes/part11-10-hls.md) — src/content/blog/embedded/modern-recipes/part11-10-hls.md
- [ ] [HLS 최적화 기법 — Pipeline·Unroll·Partition·Dataflow](../../src/content/blog/embedded/modern-recipes/part11-11-hls-optimization.md) — src/content/blog/embedded/modern-recipes/part11-11-hls-optimization.md
- [ ] [Vitis AI 분석 — DPU·xmodel·VART](../../src/content/blog/embedded/modern-recipes/part11-12-vitis-ai.md) — src/content/blog/embedded/modern-recipes/part11-12-vitis-ai.md
- [ ] [OpenCL on FPGA — Kernel·Channel·Burst Memory 분석](../../src/content/blog/embedded/modern-recipes/part11-13-opencl-fpga.md) — src/content/blog/embedded/modern-recipes/part11-13-opencl-fpga.md
- [ ] [Intel Quartus 사용법 — Platform Designer·Nios II·HLS](../../src/content/blog/embedded/modern-recipes/part11-14-intel-quartus.md) — src/content/blog/embedded/modern-recipes/part11-14-intel-quartus.md
- [ ] [PCIe → CXL 진화 — 같은 PHY 위 cache-coherent 프로토콜 추가](../../src/content/blog/embedded/modern-recipes/part11-15-pcie-to-cxl.md) — src/content/blog/embedded/modern-recipes/part11-15-pcie-to-cxl.md
- [ ] [QEMU CXL Type 3 디바이스 에뮬레이션 — 노트북에서 CXL 개발 환경 구축](../../src/content/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation.md) — src/content/blog/embedded/modern-recipes/part11-16-qemu-cxl-emulation.md
- [ ] [Linux CXL 드라이버 분석 — cxl_pci·cxl_core·region·DAX](../../src/content/blog/embedded/modern-recipes/part11-17-linux-cxl-driver.md) — src/content/blog/embedded/modern-recipes/part11-17-linux-cxl-driver.md

### Part 12 (13편)

- [ ] [Edge Inference 분석 — Cloud vs Edge·Latency·Privacy](../../src/content/blog/embedded/modern-recipes/part12-01-edge-inference.md) — src/content/blog/embedded/modern-recipes/part12-01-edge-inference.md
- [ ] [Edge 추론 Pipeline 측정 — Stage Latency·Mailbox 정책·Buffer 수](../../src/content/blog/embedded/modern-recipes/part12-02-edge-pipeline-measurement.md) — src/content/blog/embedded/modern-recipes/part12-02-edge-pipeline-measurement.md
- [ ] [NPU 아키텍처 분석 — Ethos·Hexagon·Systolic Array 비교](../../src/content/blog/embedded/modern-recipes/part12-03-npu-architecture.md) — src/content/blog/embedded/modern-recipes/part12-03-npu-architecture.md
- [ ] [딥러닝 Quantization 분석 — PTQ·QAT·INT8·INT4·Calibration](../../src/content/blog/embedded/modern-recipes/part12-04-quantization.md) — src/content/blog/embedded/modern-recipes/part12-04-quantization.md
- [ ] [TensorRT 분석 — ONNX→Engine·FP16·INT8·DLA·Multi-Stream](../../src/content/blog/embedded/modern-recipes/part12-05-tensorrt.md) — src/content/blog/embedded/modern-recipes/part12-05-tensorrt.md
- [ ] [TFLite Micro 분석 — Op Resolver·Tensor Arena·Cortex-M](../../src/content/blog/embedded/modern-recipes/part12-06-tflite-micro.md) — src/content/blog/embedded/modern-recipes/part12-06-tflite-micro.md
- [ ] [ONNX Runtime 분석 — Execution Provider와 Cross-Platform 배포](../../src/content/blog/embedded/modern-recipes/part12-07-onnx-runtime.md) — src/content/blog/embedded/modern-recipes/part12-07-onnx-runtime.md
- [ ] [Edge Thermal Management — Throttling·DVFS·Fan Curve·Sustained](../../src/content/blog/embedded/modern-recipes/part12-08-thermal.md) — src/content/blog/embedded/modern-recipes/part12-08-thermal.md
- [ ] [NVIDIA Jetson 분석 — Nano·Xavier·Orin·Thor·JetPack·DLA·VPI](../../src/content/blog/embedded/modern-recipes/part12-09-jetson.md) — src/content/blog/embedded/modern-recipes/part12-09-jetson.md
- [ ] [Zero-Copy Camera Pipeline — V4L2·DMA-BUF·GPU Import·NPU 직결](../../src/content/blog/embedded/modern-recipes/part12-10-zero-copy-camera.md) — src/content/blog/embedded/modern-recipes/part12-10-zero-copy-camera.md
- [ ] [온디바이스 LLM 추론 — llama.cpp·GGUF·MLX·KV Cache·NPU Backend](../../src/content/blog/embedded/modern-recipes/part12-11-on-device-llm.md) — src/content/blog/embedded/modern-recipes/part12-11-on-device-llm.md
- [ ] [Cortex-M33 TF-M·TrustZone — Secure Firmware·PSA·MCUboot](../../src/content/blog/embedded/modern-recipes/part12-12-tfm-trustzone.md) — src/content/blog/embedded/modern-recipes/part12-12-tfm-trustzone.md
- [ ] [Matter·Thread 분석 — IoT 통합 표준·Commissioning·Multi-Fabric](../../src/content/blog/embedded/modern-recipes/part12-13-matter-thread.md) — src/content/blog/embedded/modern-recipes/part12-13-matter-thread.md

## 참고

- 기존 점수는 재검토 진행률과 별개이며, 전체 재검토가 끝나기 전에는 재채점하지 않습니다.
- SHA 일치도 기술 검증 완료를 뜻하지 않습니다. 장비·외부 도구 검증 여부는 각 수정 보고서에서 확인하세요.
- 이번 Part 8 작업 커밋: `43f6d45d`, 브랜치 `content/hedge-cleanup-bootloader`.
