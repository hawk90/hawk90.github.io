---
title: "Ch 19: 커널로 인계 — Linux boot ABI"
date: 2026-05-09T19:00:00
description: "부트로더 → 커널 인계 — ARM64·RISC-V·x86 boot ABI, 인자 전달, 레지스터 상태."
series: "Bootloader Internals"
seriesOrder: 19
tags: [embedded, bootloader, u-boot, linux-abi, kernel]
draft: false
---

부트로더는 커널을 *그냥 점프*하지 않습니다. 커널은 점프 시점의 *레지스터 값*과 *CPU 모드*에 강한 요구가 있습니다. 그 약속이 boot ABI입니다. 약속을 어기면 커널이 첫 명령어에서 panic하거나, 더 흔하게는 아무 출력도 없이 멈춥니다.

## 한 줄 요약

**Linux는 부트로더에게 "DTB 주소를 특정 레지스터에 박고, MMU 끄고, 인터럽트 막고, 캐시는 비워서 점프하라"고 명시합니다. ABI 어기면 panic 없이 죽습니다.**

## AArch64 boot ABI

가장 자주 만나는 ABI입니다. Linux `Documentation/arm64/booting.rst`에 명시되어 있습니다.

**점프 시점 요구사항:**

**레지스터:**

- x0 = DTB(또는 ACPI tables) 물리 주소
- x1 = 0  (reserved)
- x2 = 0  (reserved)
- x3 = 0  (reserved)
- PC = Image.start + 0x80

**CPU 상태:**

- EL = EL1 (또는 EL2 — Linux가 자체 처리)
- Endian = little endian
- Interrupts = masked (DAIF.I = DAIF.F = 1)
- MMU = OFF
- D-cache = OFF (단, kernel 이미지·DTB·initramfs 영역은 *flushed*)
- I-cache = invalidated 후 OFF 또는 ON

**DTB:**

- 8-byte aligned
- kernel image와 동일한 512MB 영역 안 또는 그 이하
- 크기 < 2MB

`booti`가 이 모두를 처리합니다. 직접 점프할 일은 없지만, *왜 멈추는지* 알려면 ABI를 알아야 합니다.

```c
// arch/arm/lib/bootm.c (요지)
static void boot_jump_linux(struct bootm_headers *images, int flag)
{
    void (*kernel_entry)(int zero, int arch, uint params);
    unsigned long machid = gd->bd->bi_arch_number;
    void *fdt = images->ft_addr;

    kernel_entry = (void *)images->ep;

    /* clean cache, disable mmu, mask irq */
    cleanup_before_linux();

    /* AArch64는 별도 헬퍼 */
    armv8_switch_to_el1(0, (u64)fdt, 0, 0,
                       (u64)kernel_entry,
                       ES_TO_AARCH64);
}
```

`armv8_switch_to_el1`이 EL2에서 EL1으로 떨어뜨리고, x0에 fdt 주소를 박고, 나머지 x1·x2·x3을 0으로 클리어한 뒤 점프합니다.

## AArch32 boot ABI

ARMv7 시대의 ABI는 형태가 약간 다릅니다.

**레지스터:**

- r0 = 0  (boot 모드 flag, 보통 0)
- r1 = machine type  (machid, DT만 쓰면 ~0)
- r2 = ATAGS 또는 DTB 물리 주소

**CPU 상태:**

- SVC mode
- Interrupts = disabled (CPSR.I = CPSR.F = 1)
- MMU = OFF
- D-cache = OFF
- I-cache = ON 또는 OFF (둘 다 허용)

**ATAGS / DTB:**

- ATAGS: 옛 인터페이스, 메모리 맵·cmdline 등을 구조체 리스트로
- DTB:   현재 표준, r2가 가리키는 주소에 둠

ATAGS는 이제는 거의 안 보이지만, BSP가 오래된 보드면 마주칠 수 있습니다. 둘 중 어느 것인지는 *처음 4바이트*로 구분합니다. DTB는 `0xd00dfeed` magic으로 시작합니다.

## bootm vs booti vs bootefi

이름이 다 비슷해 헷갈리지만 *받는 이미지 포맷*이 다릅니다.

| 명령 | 받는 포맷 | ABI 처리 |
|------|----------|----------|
| `bootm` | uImage 또는 FIT (legacy + 검증) | 헤더에서 entry·load·os 읽고 분기 |
| `booti` | raw Image (ARM64) 또는 zImage (ARM32) | AArch64 native header 읽음 |
| `bootz` | zImage (ARM32) | zImage 압축 풀어 점프 |
| `bootefi` | EFI PE/COFF | EFI Boot Services 띄우고 EFI entry로 점프 |

`booti`가 가장 단순합니다. ARM64 Image의 첫 64바이트는 *self-describing header*라 entry point와 load offset이 그 안에 있습니다.

```c
// include/linux/arm-image.h (요지)
struct arm64_image_header {
    __le32 code0;          /* Executable code */
    __le32 code1;          /* Executable code */
    __le64 text_offset;    /* Image load offset from start of RAM */
    __le64 image_size;     /* Effective Image size */
    __le64 flags;          /* kernel flags */
    __le64 res2;
    __le64 res3;
    __le64 res4;
    __le32 magic;          /* Magic number ARM\x64 */
    __le32 res5;
};
```

`magic`이 `ARM\x64`(0x644D5241)인지 확인해 ABI 분기합니다.

## DTB의 자리

DTB는 *커널 이미지와 같은 512MB 영역* 또는 *그 위쪽*에 둡니다. 흔한 실수는 DTB를 ramdisk 바로 뒤에 두고 두 영역이 충돌하는 경우입니다. U-Boot 환경에서 정렬을 명시해 두는 편이 안전합니다.

```text
=> printenv
kernel_addr_r=0x40080000
fdt_addr_r=0x44000000
ramdisk_addr_r=0x46000000
fdt_high=0xffffffffffffffff
initrd_high=0xffffffffffffffff
```

`fdt_high`·`initrd_high`를 `0xffffffff...`로 두면 U-Boot이 *그 자리 그대로* 쓰고 재배치하지 않습니다. 보드에 따라 자동 재배치가 다른 영역을 침범할 수 있어 명시하는 편이 안전합니다.

## initramfs 전달

initramfs는 cpio.gz 형태로 메모리에 두고, *그 주소와 크기*를 DTB의 `chosen` 노드에 박습니다.

```text
chosen {
    linux,initrd-start = <0x00000000 0x46000000>;
    linux,initrd-end   = <0x00000000 0x46800000>;
    bootargs = "console=ttyS0,115200 root=/dev/ram0 rdinit=/sbin/init";
};
```

U-Boot의 `bootm`/`booti`는 ramdisk를 인자로 받으면 이 노드를 자동으로 채웁니다.

```text
=> booti ${kernel_addr_r} ${ramdisk_addr_r}:${filesize} ${fdt_addr_r}
```

세 번째 인자가 fdt 주소, 두 번째 인자가 `addr:size` 포맷의 ramdisk입니다.

## bootargs와 cmdline

cmdline은 DTB의 `chosen/bootargs`에 박힙니다. U-Boot env의 `bootargs`가 자동으로 그곳에 복사됩니다.

```text
=> setenv bootargs 'console=ttyS0,115200 root=/dev/mmcblk0p2 ro rootwait \
    ftrace=function ftrace_filter=raw_local_irq*'
=> saveenv
=> bootm ${kernel_addr_r}
```

부팅 디버깅에 자주 쓰는 인자입니다.

| cmdline | 효과 |
|---------|------|
| `earlycon=ns16550a,mmio32,0x9000000,115200` | DTB 보기 전 매우 이른 콘솔 |
| `loglevel=8` | 모든 printk 출력 |
| `initcall_debug` | initcall 단위 로그 |
| `ftrace=function` | function tracer 활성 |
| `nosmp` | SMP 비활성, 첫 부팅 디버깅에 |
| `panic=0` | panic 시 reboot 안 하고 멈춤 |
| `pause_on_oops=300` | oops 후 300초 멈춤 |

## RISC-V boot ABI

RISC-V도 비슷한 구조입니다. `Documentation/riscv/boot.rst`를 따릅니다.

**레지스터:**

- a0 = boot hartid (어느 hart가 첫 부팅을 맡았는지)
- a1 = DTB 물리 주소

**CPU 상태:**

- S-mode (Linux는 S-mode에서 동작; M-mode는 OpenSBI 등 firmware가 차지)
- MMU = OFF
- Interrupts = disabled

**DTB:**

- 8-byte aligned

흥미로운 점은 RISC-V는 *firmware가 항상 있다*는 가정입니다. OpenSBI가 M-mode를 들고 있고, U-Boot은 S-mode에서 동작하다 Linux로 인계합니다. ARM에서는 ATF가 비슷한 역할을 합니다.

## x86 boot protocol

x86은 historical reasons로 더 복잡합니다. *Real Mode* zImage 헤더, *32-bit boot protocol*, *64-bit boot protocol*이 있습니다.

**real-mode boot protocol:**

- zImage 헤더의 boot_params 구조체를 ES:SI에 둠

**32-bit boot protocol (CONFIG_KERNEL_NORELOC=n 이전):**

- EBX = 0
- EBP = 0
- EDI = 0
- ESI = boot_params 물리 주소
- EFLAGS.IF = 0

**64-bit boot protocol:**

- RSI = boot_params
- CR0.PE = 1 (protected)
- CR4.PAE = 1 (Physical Address Extension)
- EFER.LMA = 1 (long mode active)
- paging = on (identity mapped first 4GB)

임베디드에서 x86은 드물지만, intel atom 보드를 만지면 다시 볼 일이 있습니다.

## 점프 후 첫 출력이 안 나올 때

ABI 위반은 콘솔이 *완전히 침묵*하는 형태로 나옵니다. 가장 자주 만나는 원인 셋입니다.

1. **DTB가 cache에 있고 메모리에는 안 박혔다.** `cleanup_before_linux()`가 D-cache flush를 빠뜨렸거나, FIT의 load address가 cacheable·writeback 영역인데 flush 누락.
2. **cmdline에 `earlycon`이 없어서**, 커널이 *DT의 chosen/stdout-path*를 보기 전까지는 콘솔이 묵묵부답.
3. **DTB 주소를 x1·x2·x3에도 박았다.** AArch64 ABI는 x0만 사용하고 x1~x3은 *반드시 0*이어야 합니다. 0이 아니면 미래 확장에서 다른 의미로 해석될 수 있습니다.

`earlycon`을 박고 다시 부팅하면 90% 이상의 케이스에서 *어디서 죽는지*가 보입니다.

## 자주 하는 실수

ABI 관련 흔한 실수입니다.

- **DTB를 ramdisk 뒤에 두고** 두 영역이 겹친다. `fdt_high`·`initrd_high`로 자리를 명시해야 안전합니다.
- **cleanup_before_linux 호출 전에 점프**한다. D-cache·MMU가 켜진 채로 들어가 커널이 첫 페이지 테이블 설정에서 멈춥니다.
- **`bootm`에 raw Image를 넘긴다.** uImage 헤더가 없어 magic 검사에서 실패합니다. raw Image는 `booti`로.
- **AArch64 커널을 EL3에서 진입시킨다.** U-Boot이 EL1까지 내려놓아야 합니다. ATF가 있는 시스템은 ATF가 처리.
- **bootargs가 너무 길어** DTB의 chosen 노드 자리를 넘긴다. 1024바이트 안에서 정리.
- **ATAGS와 DTB를 동시에 박는다.** ARMv7에서 둘 다 r2로 전달할 수는 없습니다. 커널이 magic으로 자동 판별하지만, 보드 코드가 ATAGS 가정으로 짜여 있으면 충돌합니다.

## 정리

- AArch64 ABI는 `x0=DTB, x1=x2=x3=0, EL1, MMU/cache off, IRQ masked` 다섯이 핵심입니다.
- AArch32는 `r0=0, r1=machid, r2=DTB(또는 ATAGS), SVC mode` 형태입니다.
- `bootm`은 uImage·FIT, `booti`는 raw ARM64 Image, `bootz`는 zImage, `bootefi`는 EFI PE를 받습니다.
- DTB는 커널 이미지와 같은 512MB 영역에 두고, `fdt_high=0xff...`로 재배치를 막는 편이 안전합니다.
- initramfs 주소·크기는 `chosen/linux,initrd-start`·`linux,initrd-end`에 박힙니다.
- cmdline은 `chosen/bootargs`로 전달되며, `earlycon`이 부팅 무중계 콘솔의 핵심입니다.
- ABI 위반은 panic 없이 침묵으로 나타나니, *콘솔이 안 나올 때 ABI를 먼저* 의심해야 합니다.

## 다음 장 예고

다음 장은 *부트로더의 한 단계 위*에 있는 펌웨어 업데이트 프레임워크를 봅니다. RAUC와 SWUpdate가 A/B 슬롯·서명·다운로드·진행 보고를 한 묶음으로 처리하는 방식입니다.

## 관련 항목

- [Ch 18: EFI in U-Boot — bootefi와 EFI loader](/blog/embedded/bootloader/chapter18-efi-in-uboot)
- [Ch 20: RAUC / SWUpdate — 펌웨어 업데이트 프레임워크](/blog/embedded/bootloader/chapter20-rauc-swupdate)
- [원문 — Documentation/arm64/booting.rst](https://www.kernel.org/doc/Documentation/arm64/booting.txt)
- [원문 — Documentation/riscv/boot.rst](https://docs.kernel.org/riscv/boot.html)
