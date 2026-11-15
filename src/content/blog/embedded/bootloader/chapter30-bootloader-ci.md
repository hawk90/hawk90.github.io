---
title: "부트로더 CI 구축 — build matrix와 자동 부팅 테스트"
slug: "embedded/bootloader/chapter30-bootloader-ci"
date: 2026-05-19T09:30:00
description: "U-Boot v2024.04 자체 CI(.gitlab-ci.yml)의 buildman·test/py 구성을 읽고, 이 시리즈에서 찾은 defconfig·SPL 크기·FIT 서명 문제를 QEMU 자동 검사로 바꿔 실제로 돌려 봅니다."
series: "Bootloader Internals"
seriesOrder: 30
tags: [embedded, bootloader, ci-cd, qemu, build-matrix]
draft: false
topics: ["embedded"]
---

이 시리즈를 쓰면서 찾은 문제 몇 가지는 공통점이 있습니다. [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)의 defconfig 옵션 누락은 빌드가 성공했는데 설정이 틀렸고, [Ch 29](/blog/embedded/bootloader/chapter29-distro-boot)의 `verify=n`은 서명 부팅이 켜져 있는데 꺼질 수 있었습니다. 둘 다 사람이 한 번 확인하고 넘어가면 다음 변경에서 다시 생깁니다. CI는 이런 확인을 사람 대신 매번 반복하는 장치입니다.

이 장은 두 부분입니다. 먼저 U-Boot 프로젝트 자신이 v2024.04에서 어떻게 CI를 돌리는지 소스 트리의 `.gitlab-ci.yml`로 봅니다. 그다음 이 시리즈에서 찾은 문제를 검사 스크립트로 바꿔 실제로 돌리고, 그 출력이 무엇을 잡고 무엇을 못 잡는지 봅니다.

## 한 줄 요약

U-Boot v2024.04 CI는 buildman으로 아키텍처별 전체 빌드(`-PEWM`, 빠진 blob은 가짜로 채움)를 하고, 38개 보드 job에서 `test/py`를 QEMU 등으로 실행합니다. 이 시리즈의 문제를 검사로 바꾼 스크립트는 defconfig 경고 5개와 `verify=n` 서명 우회를 FAIL로 잡았습니다. 빌드 성공과 부팅 성공, 그리고 보안 정책 성공은 각각 다른 검사가 필요합니다.

## U-Boot 자신의 CI

남의 CI를 볼 때는 무엇을 하는지보다 무엇을 **하지 않는지**가 더 중요합니다. 건물 소방 점검표에 "소화기 압력"은 있는데 "비상구 잠금"이 없다면, 점검 통과는 비상구에 대해 아무것도 말해 주지 않습니다.

v2024.04 `.gitlab-ci.yml`의 실행 이미지는 `trini/u-boot-gitlab-ci-runner:jammy-20240125-12Feb2024`입니다. job은 크게 두 종류입니다.

**전체 빌드(world build).** 아키텍처마다 모든 보드를 빌드합니다. 64비트 Arm job은 다음 명령을 씁니다.

```bash
./tools/buildman/buildman -o /tmp -PEWM aarch64
```

`tools/buildman/cmdline.py`에서 각 옵션의 뜻을 찾으면 `-P`는 "Use an O= (output) directory per board", `-E`는 "Treat all compiler warnings as errors", `-W`는 "Return success even if there are warnings", `-M`은 "Tell binman to allow missing blobs and generate fake ones as needed"입니다. 마지막 `-M`이 중요합니다. [Ch 26](/blog/embedded/bootloader/chapter26-ddr-training)에서 DDR training firmware 없이 만든 i.MX8MM 이미지는 SPL 안의 firmware 크기가 0이었습니다. CI의 전체 빌드도 같은 조건이므로, 여기서 통과했다는 것은 "그 보드의 이미지가 만들어진다"는 뜻이지 "부팅된다"는 뜻이 아닙니다.

**보드별 test.py.** `.buildman_and_testpy_template`을 쓰는 job이 `TEST_PY_BD` 값만 바꿔 38개 있습니다. 각 job은 그 보드 하나를 빌드한 뒤 `test/py`를 돌립니다.

```bash
tools/buildman/buildman -o ${UBOOT_TRAVIS_BUILD_DIR} -w -E -W -e \
    --board ${TEST_PY_BD} ${OVERRIDE}
./test/py/test.py -ra --bd ${TEST_PY_BD} ${TEST_PY_ID} \
    ${TEST_PY_TEST_SPEC:+"-k ${TEST_PY_TEST_SPEC}"} \
    --build-dir "$UBOOT_TRAVIS_BUILD_DIR"
```

이 시리즈에서 계속 쓴 보드도 목록에 있습니다.

```yaml
qemu_arm64 test.py:
  variables:
    TEST_PY_BD: "qemu_arm64"
    TEST_PY_TEST_SPEC: "not sleep"
  <<: *buildman_and_testpy_dfn
```

`test/py`가 QEMU를 어떻게 띄우는지는 U-Boot 트리 밖, `u-boot-test-hooks` 저장소에 있습니다. CI는 이 저장소를 `git clone --depth=1 https://source.denx.de/u-boot/u-boot-test-hooks`로 받고, v2024.04 출시 직전 커밋(`ed245c7`, 2024-03-07)의 `bin/travis-ci/conf.qemu_arm64_na`는 다음과 같은 QEMU 인자를 씁니다.

```bash
qemu_machine="virt"
qemu_extra_args="-cpu cortex-a57 -nographic -netdev user,id=net0,tftp=${UBOOT_TRAVIS_BUILD_DIR} -device e1000,netdev=net0 -device virtio-rng-pci -semihosting -chardev socket,id=chrtpm,path=/tmp/tpm/swtpm-sock -tpmdev emulator,id=tpm0,chardev=chrtpm -device tpm-tis-device,tpmdev=tpm0"
qemu_kernel_args="-bios ${U_BOOT_BUILD_DIR}/u-boot.bin"
```

이 시리즈의 QEMU 실험과 같은 `virt`·`cortex-a57`·`-bios u-boot.bin`에, 네트워크 시험용 TFTP와 swtpm으로 만든 가상 TPM이 더해져 있습니다. 같은 test.py를 이 Mac에서 돌려 보려고 swtpm 0.10.2까지 준비했지만, 받아 온 hook 스크립트를 실행하는 단계는 실행하지 않았습니다. 그래서 이 장에는 upstream test.py의 결과가 없습니다.

### upstream CI가 잡지 않는 것

이 시리즈에서 찾은 문제를 위 job에 비춰 보면 빈칸이 보입니다.

| 문제 | 찾은 장 | upstream CI가 잡나 |
|------|--------|-------------------|
| 호스트 전처리기 때문에 defconfig의 `# ... is not set`이 무시됨 | [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep) | CI 이미지는 Linux라 이 조건이 생기지 않음 |
| training firmware 없이 이미지가 만들어짐 | [Ch 26](/blog/embedded/bootloader/chapter26-ddr-training) | `-M`으로 일부러 허용 |
| 장치보다 큰 `mtdparts`가 경고 후 잘림 | [Ch 28](/blog/embedded/bootloader/chapter28-flash-layout) | 보드별 런타임 설정이라 범위 밖 |
| `verify=n`으로 FIT 서명 강제가 꺼짐 | [Ch 29](/blog/embedded/bootloader/chapter29-distro-boot) | 제품 보안 정책이라 범위 밖 |

upstream CI는 U-Boot 코드가 깨지지 않았는지를 봅니다. 내 제품의 빌드 환경, firmware 묶음, 플래시 배치, 보안 정책은 제품 쪽 CI가 봐야 합니다.

## 이 시리즈의 문제를 검사로 바꾸기

검사를 만드는 원칙은 하나입니다. 손으로 확인한 장면을 그대로 자동화하되, **기대하는 결과를 먼저 적어 두는 것**입니다. 다음 스크립트는 세 묶음을 검사합니다.

```bash
# 1. defconfig must apply cleanly (ch24)
for log in ci-defcfg-with.log ci-defcfg-without.log; do
  n=$(grep -c 'unexpected data' $log)
  [ "$n" = 0 ] && ok "defconfig $log: 0 'unexpected data'" \
               || ng "defconfig $log: $n 'unexpected data'"
done
# 2. SPL headroom (ch24)
max=$(($(grep '^CONFIG_SPL_MAX_SIZE=' $B/.config | cut -d= -f2)))
pad=$(($(grep '^CONFIG_SPL_PAD_TO=' $B/.config | cut -d= -f2)))
...
[ $((pad-bin)) -ge 4096 ] && ok "SPL binary headroom >= 4096" || ng ...
# 3. FIT signature policy on QEMU (ch29)
t legit.itb a 'source 0x50000000' | grep -q 'legit script ran' && ok ...
t evil.itb  b 'source 0x50000000' | grep -q 'ATTACKER' && ng ... || ok ...
t evil.itb  c 'setenv verify n; source 0x50000000' | grep -q 'ATTACKER' && ng ... || ok ...
```

첫 묶음의 두 로그는 같은 `imx8mm_evk_defconfig`를 `CROSS_COMPILE=aarch64-elf-`를 주고, 그리고 주지 않고 처리한 결과입니다. 둘째 묶음은 [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)의 i.MX8MM 빌드에서 SPL 크기를 읽습니다. 4096 B 기준은 이 실험에서 정한 값입니다. 셋째 묶음은 [Ch 29](/blog/embedded/bootloader/chapter29-distro-boot)의 FIT script 세 개를 QEMU에서 실행합니다(`t`는 QEMU를 띄워 명령을 보내고 콘솔 출력을 돌려주는 함수).

실행 결과입니다.

```text
PASS  defconfig ci-defcfg-with.log: 0 'unexpected data'
FAIL  defconfig ci-defcfg-without.log: 5 'unexpected data'
INFO  SPL code+data 144400 / 159744 (headroom 15344), with DTB 152599 / 159744 (headroom 7145)
PASS  SPL binary headroom >= 4096
PASS  signed FIT script runs
PASS  unsigned FIT script rejected
FAIL  unsigned FIT script rejected with verify=n
exit=1
```

FAIL 두 개는 검사가 일을 한 결과입니다. 첫째 FAIL의 로그에는 [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)에서 말로만 남겼던 경고가 그대로 찍혀 있습니다.

```text
generated_defconfig:40:warning: unexpected data:  # CONFIG_SPL_SHARES_INIT_SP_ADDR is not set
generated_defconfig:51:warning: unexpected data:  # CONFIG_CMD_EXPORTENV is not set
generated_defconfig:52:warning: unexpected data:  # CONFIG_CMD_IMPORTENV is not set
generated_defconfig:53:warning: unexpected data:  # CONFIG_CMD_CRC32 is not set
generated_defconfig:117:warning: unexpected data:  # CONFIG_USB_STORAGE is not set
```

이 상태의 `.config`에는 `CONFIG_SPL_STACK=` 줄이 없었습니다(경고 없는 쪽에는 1줄). 빌드는 두 경우 모두 성공하므로, 빌드 결과만 보는 CI는 이 차이를 놓칩니다.

둘째 FAIL은 [Ch 29](/blog/embedded/bootloader/chapter29-distro-boot)의 서명 우회입니다. 이 검사를 CI에 두면, 누군가 `ENV_WRITEABLE_LIST` 같은 막는 설정을 넣었을 때 FAIL이 PASS로 바뀌는 것으로 효과를 확인할 수 있습니다. 반대로 나중에 누가 설정을 되돌리면 다시 FAIL이 됩니다. 기대 결과를 코드로 적어 두는 것의 가치가 여기 있습니다.

INFO 줄은 [Ch 24](/blog/embedded/bootloader/chapter24-spl-deep)의 두 여유를 한 줄에 보여 줍니다. 링커가 지키는 코드·데이터 여유는 15,344 B이지만, DTB까지 붙은 바이너리의 `SPL_PAD_TO` 대비 여유는 7,145 B입니다. 링커 검사는 앞의 숫자만 보므로, CI가 뒤의 숫자를 따로 지켜야 합니다.

## QEMU 검사가 증명하지 않는 것

위 검사 중 QEMU에서 돈 셋째 묶음은 U-Boot의 서명 검증 로직과 환경 처리만 확인합니다. [Ch 23](/blog/embedded/bootloader/chapter23-bootrom-efuse-otp)의 BootROM과 fuse, [Ch 26](/blog/embedded/bootloader/chapter26-ddr-training)의 DDR training, [Ch 28](/blog/embedded/bootloader/chapter28-flash-layout)의 실제 SD 카드 배치는 QEMU `virt`에 없습니다. 그 부분은 실제 보드를 전원 제어기와 시리얼 콘솔에 연결한 장비(board farm)에서 시험해야 하고, 결과에는 보드 revision과 부트 매체를 함께 남겨야 합니다. `u-boot-test-hooks`의 `bin/` 디렉터리에 `poweron.ykush`, `reset.usbrelay`, `writer.imx_raw`, `writer.sunxi_raw` 같은 스크립트가 있는 것이 그 흔적입니다. upstream도 실제 보드 시험은 hook으로 연결하는 구조입니다.

## 서명 키와 CI

[Ch 16](/blog/embedded/bootloader/chapter16-verified-boot)과 [Ch 27](/blog/embedded/bootloader/chapter27-chain-of-trust)에서 쓴 키는 모두 시험용이었습니다. 위 검사도 시험용 키(`vboot/keys`)로 서명한 FIT를 씁니다. 제품 서명 키는 이 검사 job에 들어가면 안 됩니다. 검사 job은 누구나 바꿀 수 있는 스크립트를 실행하므로, 그 job이 키에 닿으면 어떤 이미지에도 서명할 수 있게 됩니다. 시험은 시험 키로, 출시 서명은 접근이 통제된 별도 단계에서 하는 구조가 이 장의 검사와 같은 원칙입니다.

## 정리

- U-Boot v2024.04 CI는 `buildman -PEWM`으로 아키텍처별 전체 빌드를 하고, 38개 보드 job에서 `test/py`를 돌립니다. `qemu_arm64`는 `-k "not sleep"`입니다.
- 전체 빌드의 `-M`은 빠진 blob을 가짜로 채우므로, 통과는 이미지 생성을 뜻할 뿐 부팅을 뜻하지 않습니다.
- `test/py`의 QEMU 실행 방법은 `u-boot-test-hooks`에 있고, `qemu_arm64`는 `virt`·`cortex-a57`·TFTP·swtpm TPM을 씁니다. 이 장에서는 그 hook을 실행하지 않았습니다.
- 이 시리즈의 문제를 검사로 바꾸자 defconfig 경고 5개와 `verify=n` 서명 우회가 FAIL로 잡혔습니다. 두 경우 모두 빌드는 성공합니다.
- SPL은 링커가 보는 여유(15,344 B)와 DTB를 포함한 여유(7,145 B)를 따로 검사합니다.
- QEMU 검사는 U-Boot 로직만 확인합니다. ROM·fuse·DDR·실제 저장 매체는 board farm에서 따로 시험합니다.

## 다음 장

다음 장은 **Ch 31: TF-A BL31 EL3 Runtime**입니다. [Ch 25](/blog/embedded/bootloader/chapter25-tfa-optee)에서 U-Boot의 `reset`이 SMC로 들어간 BL31 안에서 런타임 서비스가 어떻게 등록되고 요청이 어떻게 나뉘는지 봅니다.

## 관련 항목

- [Ch 21: 새 보드 포팅](/blog/embedded/bootloader/chapter21-board-porting) — defconfig를 `savedefconfig`로 관리하기
- [Ch 24: SPL·TPL 내부 해부](/blog/embedded/bootloader/chapter24-spl-deep) — defconfig 함정과 SPL 크기
- [Ch 29: Distro Boot](/blog/embedded/bootloader/chapter29-distro-boot) — `verify=n` 서명 우회
- [U-Boot v2024.04 — .gitlab-ci.yml](https://github.com/u-boot/u-boot/blob/v2024.04/.gitlab-ci.yml)
- [U-Boot: pytest suite](https://docs.u-boot.org/en/latest/develop/py_testing.html)
- [u-boot-test-hooks](https://source.denx.de/u-boot/u-boot-test-hooks)
