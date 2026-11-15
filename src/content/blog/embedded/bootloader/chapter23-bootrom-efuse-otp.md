---
title: "SoC BootROM·eFuse·OTP — 부팅의 0단계 분석"
slug: "embedded/bootloader/chapter23-bootrom-efuse-otp"
date: 2026-05-19T09:23:00
description: "i.MX8M Mini를 예로 BootROM이 읽는 IVT 헤더, HAB secure boot의 SRK 해시 fuse, U-Boot fuse 명령의 read·sense·prog 차이를 U-Boot v2024.04 소스와 실제 빌드 결과로 확인합니다."
series: "Bootloader Internals"
seriesOrder: 23
tags: [embedded, bootloader, bootrom, efuse, otp, secure-boot]
draft: false
topics: ["embedded"]
---

지금까지 이 시리즈는 U-Boot가 이미 실행된 뒤를 다뤘습니다. 그런데 U-Boot의 첫 바이트를 메모리에 올려 주는 코드는 따로 있습니다. 칩 안 mask ROM에 구워진 **BootROM**입니다. BootROM은 고칠 수 없고, 그 동작을 바꾸는 손잡이는 boot 스위치와 **eFuse/OTP** 비트뿐입니다. 그래서 이 단계에서 실수하면 보드가 아예 켜지지 않습니다.

BootROM의 동작은 SoC마다 다르기 때문에 이 장에서는 하나를 골라 끝까지 따라갑니다. 대상은 NXP **i.MX8M Mini**(이하 i.MX8MM)입니다. U-Boot v2024.04 트리에 보드 문서(`doc/board/nxp/imx8mm_evk.rst`)와 HAB secure boot 가이드(`doc/imx/habv4/`), OCOTP fuse 드라이버(`drivers/misc/mxc_ocotp.c`)가 함께 들어 있어서 소스만으로 확인할 수 있는 내용이 많습니다. 다른 SoC로 옮길 때는 숫자가 아니라 *어디를 봐야 하는지*만 가져가세요.

## 한 줄 요약

BootROM은 boot 장치의 **정해진 오프셋에서 IVT 헤더**를 찾아 이미지를 칩 내부 SRAM에 올리고, HAB가 켜져 있으면 **fuse에 구운 SRK 해시**로 서명을 검증한 뒤 entry로 점프합니다. fuse는 한 번 쓰면 되돌릴 수 없으므로 `fuse prog` 전에 `hab_status`로 서명 이미지가 이벤트 없이 부팅되는지부터 확인합니다.

## BootROM이 찾는 것 — 오프셋과 IVT

BootROM은 파일 시스템을 모릅니다. 서점 직원이 "3번 서가 두 번째 칸"처럼 위치만 보고 책을 꺼내듯, ROM도 장치의 고정 위치에서 헤더를 읽습니다. 그래서 이미지 굽는 명령의 오프셋이 틀리면 ROM은 아무것도 찾지 못합니다.

i.MX8MM EVK 문서는 SD 카드에 이미지를 쓰는 명령을 이렇게 적습니다(`doc/board/nxp/imx8mm_evk.rst:51`).

```bash
sudo dd if=flash.bin of=/dev/sd[x] bs=1024 seek=33 conv=notrunc
```

`seek=33`이 핵심입니다. 카드의 33 KiB 지점에 `flash.bin`을 놓아야 ROM이 그 자리에서 헤더를 찾습니다. 이 헤더가 무엇인지 보려고 `imx8mm_evk_defconfig`로 v2024.04를 직접 빌드했습니다. 빌드 환경은 macOS의 `aarch64-elf-gcc` 16.2.0이고, DDR training 펌웨어와 TF-A `bl31.bin` 없이 `BINMAN_ALLOW_MISSING=1`로 만들었습니다. 그래서 이 `flash.bin`은 실제로 부팅되지 않지만 ROM이 읽는 헤더 형식은 그대로입니다. binman은 빠진 blob을 이렇게 알려 줍니다.

```text
Image 'u-boot-spl-ddr' is missing external blobs and is non-functional: ddr-1d-imem-fw ddr-1d-dmem-fw ddr-2d-imem-fw ddr-2d-dmem-fw
Image 'itb' is missing external blobs and is non-functional: atf-blob
```

`flash.bin`의 첫 64바이트입니다.

```text
00000000: d100 2041 0010 7e00 0000 0000 0000 0000  .. A..~.........
00000010: e00f 7e00 c00f 7e00 c065 8000 0000 0000  ..~...~..e......
00000020: c00b 7e00 007a 0200 0000 0000 0000 0000  ..~..z..........
```

`include/imximage.h`의 `flash_header_v2_t`(entry·reserved1·dcd_ptr·boot_data_ptr·self·csf·reserved2)와 `boot_data_t`(start·size·plugin)에 맞춰 little-endian으로 읽으면 다음과 같습니다.

| 오프셋 | 필드 | 값 | 의미 |
|-------|------|-----|------|
| 0x00 | header | `D1 0020 41` | tag `IVT_HEADER_TAG`(0xD1), 길이 0x20, `IVT_VERSION_V3`(0x41) |
| 0x04 | entry | `0x007E1000` | SPL 첫 명령 주소 |
| 0x0C | dcd_ptr | `0` | DCD 없음 |
| 0x10 | boot_data_ptr | `0x007E0FE0` | IVT 바로 뒤(self + 0x20) |
| 0x14 | self | `0x007E0FC0` | IVT 자신이 놓일 주소 |
| 0x18 | csf | `0x008065C0` | HAB 서명 블록(CSF) 위치 |
| 0x20 | boot_data.start | `0x007E0BC0` | 적재 시작 주소(self − 0x400) |
| 0x24 | boot_data.size | `0x00027A00` | ROM이 읽어 올 크기 |

entry `0x7E1000`은 보드 설정 파일과 정확히 같습니다. `board/freescale/imx8mm_evk/imximage-8mm-lpddr4.cfg`는 두 줄뿐입니다.

```text
BOOT_FROM	sd
LOADER		u-boot-spl-ddr.bin	0x7E1000
```

defconfig에도 `CONFIG_SPL_TEXT_BASE=0x7E1000`이 있습니다. 이 주소는 칩 내부 TCM 영역입니다. U-Boot의 i.MX8M MMU 맵(`arch/arm/mach-imx/imx8m/soc.c:135`)은 `TCM`을 0x7C0000부터 0x80000바이트로 잡고, OCRAM은 0x900000부터 따로 둡니다. 이 시점에는 DDR이 아직 초기화되지 않았으므로, ROM은 SPL을 칩 안 메모리에 올립니다. DDR training은 SPL이 맡고, 그래서 빠진 blob 목록에 `lpddr4_pmu_train_*` 펌웨어가 있습니다.

`boot_data.start`가 self보다 정확히 0x400 앞인 것도 소스와 맞습니다. `tools/imx8mimage.c:84`의 `imx8mimage_ivt_offset` 표는 `sd`의 IVT 오프셋을 `0x400`으로 정합니다. 메모리에서 이미지 시작 뒤 1 KiB 지점에 IVT가 오도록 만든 배치입니다.

### 두 번째 단계도 오프셋으로 찾는다

binman이 남긴 `imx-boot.map`은 `flash.bin` 안의 두 조각을 보여 줍니다.

```text
ImagePos    Offset      Size  Name
00000000  00000000  001090a0  imx-boot
00000000   00000000  00027600  spl
00057c00   00057c00  000b14a0  uboot
```

`u-boot.itb`(TF-A와 U-Boot proper를 담은 FIT)는 `flash.bin`의 0x57C00에 있습니다(`arch/arm/dts/imx8mm-u-boot.dtsi:201`). 카드 기준으로는 33 KiB(0x8400) + 0x57C00 = 0x60000바이트이고, 512바이트 섹터로 0x300입니다. 빌드된 `.config`의 `CONFIG_SYS_MMCSD_RAW_MODE_U_BOOT_SECTOR=0x300`과 같습니다. ROM이 33 KiB에서 SPL을 찾듯, SPL은 섹터 0x300에서 FIT를 찾습니다. 두 숫자 중 하나만 바꾸면 SPL까지는 뜨고 U-Boot proper를 못 찾는 보드가 됩니다.

## ROM이 남기는 흔적 — event log

ROM은 디버거를 붙이기 전에 끝나 버리므로, 무슨 일이 있었는지 알려면 ROM이 남긴 기록을 읽어야 합니다. 비행기 블랙박스처럼 ROM은 자기가 한 일을 메모리에 적어 둡니다.

U-Boot의 `imx8m_detect_secondary_image_boot()`(`arch/arm/mach-imx/imx8m/soc.c:653`)가 그 기록을 읽습니다. 주소 `0x9E0`에 ROM event log 포인터가 있고, 포인터가 `0x900000`~`0xB00000` 범위 밖이거나 4바이트 정렬이 아니면 `-EINVAL`을 돌려줍니다. 로그의 각 엔트리는 상위 8비트가 event ID입니다.

```c
	rom_log = (u32 *)(uintptr_t)(*rom_log_addr);
	for (i = 0; i < 128; i++) {
		event_id = rom_log[i] >> 24;
		switch (event_id) {
		case 0x00: /* End of list */
			return boot_secondary;
		...
		case 0xa0: /* Image authentication result */
		case 0xc0: /* Jump to the boot image soon */
			i += 2;
			continue;
		/* Boot from the secondary boot image */
		case 0x51:
			boot_secondary = 1;
			continue;
```

소스 주석에 적힌 ID만 모아도 ROM의 단계가 보입니다. 0x80~0x82는 장치 초기화, 0x90/0x91/0x9F는 장치 읽기 시작·완료·실패, 0xA0은 이미지 인증 결과, 0xC0은 점프 직전이고, 0x51은 *secondary 이미지로 부팅했다*는 뜻입니다. U-Boot는 0x51을 보고 primary 이미지가 깨져 ROM이 백업으로 넘어갔다는 사실을 알아냅니다. 이렇게 ROM 단계의 실패도 다음 단계에서 읽어 낼 수 있습니다.

같은 파일 648행의 `g_rom_api`(`0x980`)는 반대 방향의 통로입니다. `struct rom_api`(`arch/arm/include/asm/mach-imx/sys_proto.h:164`)에는 `download_image`와 `query_boot_infor` 함수 포인터가 있어서, SPL이 ROM의 장치 드라이버를 빌려 이미지를 더 읽거나 부팅 장치 종류(`BT_DEV_TYPE_SD`, `BT_DEV_TYPE_MMC`, ...)를 묻습니다. 다만 이 경로를 쓰는 `CONFIG_IMX8_ROMAPI`는 `IMX8MN || IMX8MP || IMX8ULP || IMX9`에만 켜집니다(`arch/arm/mach-imx/Kconfig:179`). i.MX8MM 빌드의 `.config`에는 이 옵션이 없고 `CONFIG_SPL_BOOTROM_SUPPORT`도 꺼져 있어서, i.MX8MM SPL은 자기 MMC 드라이버로 섹터 0x300을 직접 읽습니다. 같은 i.MX8M 제품군 안에서도 ROM과 SPL의 역할 분담이 다릅니다.

## fuse와 shadow register — read와 sense의 차이

fuse는 연필이 아니라 볼펜입니다. 0을 1로 바꿀 수는 있어도 지울 수는 없습니다. 그래서 i.MX의 OCOTP 컨트롤러는 fuse 값을 매번 직접 읽지 않고, 리셋 때 **shadow register**로 복사해 둔 값을 보여 줍니다. U-Boot `fuse` 명령의 서브커맨드도 이 구분을 따릅니다(`cmd/fuse.c`).

| 명령 | 드라이버 함수 | 실제 동작 (`drivers/misc/mxc_ocotp.c`) | 되돌릴 수 있나 |
|------|-------------|------------------------------------|--------------|
| `fuse read` | `fuse_read()` | shadow register를 `readl()` | 읽기 전용 |
| `fuse sense` | `fuse_sense()` | `BM_READ_CTRL_READ_FUSE`로 fuse 배열을 직접 읽음 | 읽기 전용 |
| `fuse override` | `fuse_override()` | shadow register에 `writel()` | 리셋하면 사라짐 |
| `fuse prog` | `fuse_prog()` | fuse를 실제로 태움 | **불가** |

`override`는 다음 리셋까지만 유효한 값으로 shadow를 덮어씁니다. fuse를 태우기 전에 "이 값이면 어떻게 동작하나"를 시험해 볼 때 씁니다. 반대로 `read`와 `sense`가 다르게 나오면 shadow가 fuse 배열과 어긋난 상태입니다. override했거나, fuse를 태운 뒤 아직 리셋하지 않은 경우입니다. v2024.04 드라이버는 `BM_CTRL_RELOAD`를 정의만 하고 쓰지 않으므로, `fuse_prog()` 뒤에 shadow를 다시 읽어 오지 않습니다. `sense`가 막힌 칩도 있습니다. `fuse_sense()`는 i.MX8MQ rev 2.1 이상에서 `fuse sense is disabled`를 찍고 `-EPERM`을 돌려줍니다(`mxc_ocotp.c:338-340`).

bank/word 번호를 다른 칩에서 가져오면 안 되는 이유도 이 드라이버에 있습니다. `mxc_ocotp.c:107` 주석은 i.MX6 일부 모델에서 bank 5와 bank 6 사이에 0x100 크기의 shadow 주소 구멍이 있다고 적습니다. 그래서 드라이버는 논리 bank를 `fuse_bank_physical()`로 변환해서 읽습니다. 같은 "bank 6"이라도 칩마다 레지스터 위치가 다릅니다.

`fuse prog`는 쓰기 전에 확인을 받습니다. `confirm_prog()`(`cmd/fuse.c:29`)가 찍는 문구입니다.

```text
Warning: Programming fuses is an irreversible operation!
         This may brick your system.
         Use this command only if you are sure of what you are doing!

Really perform this fuse programming? <y/N>
```

`fuse prog -y`를 쓰면 이 확인을 건너뜁니다(`cmd/fuse.c:48`의 `confirmed`). 생산 스크립트에 `-y`가 들어가 있다면 그 스크립트의 bank·word·값을 리뷰하는 일이 곧 보드를 살리는 일입니다.

## HAB secure boot — SRK 해시를 fuse에 굽는다

ROM이 "이 이미지를 믿어도 되나"를 판단하려면 기준이 칩 안에 있어야 합니다. 문 앞에 열쇠 원본을 두는 대신 열쇠의 지문만 금고에 새겨 두는 방식입니다. NXP HAB에서는 공개키 묶음(SRK Table)은 이미지의 CSF에 함께 싣고, 그 **해시**만 fuse `SRK_HASH[255:0]`에 굽습니다(`doc/imx/habv4/introduction_habv4.txt`). ROM은 CSF의 SRK Table을 해시해 fuse 값과 비교하고, 맞으면 그 키로 이미지 서명을 검증합니다. 앞의 IVT 표에서 `csf` 필드가 가리키던 곳이 바로 이 서명 블록입니다.

HAB를 끈 빌드에서도 `csf`가 0이 아니었습니다. `tools/imx8mimage.c:579`가 `boot_data.size += CSF_SIZE; /* 8K region dummy CSF */`로 8 KiB(0x2000) 자리를 항상 비워 두기 때문입니다. 실측값으로도 확인됩니다. `csf` − `boot_data.start` = 0x8065C0 − 0x7E0BC0 = 0x25A00이고, `boot_data.size` 0x27A00에서 0x2000을 뺀 값과 같습니다. 서명 도구는 이미지를 다시 배치하지 않고 이 빈자리에 CSF만 채워 넣습니다.

### SRK 해시 fuse의 위치

U-Boot 가이드(`doc/imx/habv4/guides/mx6_mx7_secure_boot.txt` 1.5절)는 srktool이 만든 `SRK_1_2_3_4_fuse.bin`을 32비트 워드 여덟 개로 덤프한 뒤 하나씩 굽는 절차를 보여 줍니다. 가이드에 실린 예시입니다. 해시 값은 문서 예시이므로 그대로 쓰면 안 됩니다.

```text
=> fuse prog 3 0 0x20593752
=> fuse prog 3 1 0x6ACE6962
...
=> fuse prog 3 7 0x1190FD4D
```

같은 절의 표는 bank/word가 칩마다 다르다는 것을 보여 줍니다.

| SRK_HASH 비트 | i.MX6 시리즈 | i.MX7D/S | i.MX7ULP |
|--------------|-------------|----------|----------|
| [31:00] | bank 3 word 0 | bank 6 word 0 | bank 5 word 0 |
| [127:96] | bank 3 word 3 | bank 6 word 3 | bank 5 word 3 |
| [159:128] | bank 3 word 4 | bank 7 word 0 | bank 5 word 4 |
| [255:224] | bank 3 word 7 | bank 7 word 3 | bank 5 word 7 |

i.MX7D/S는 해시 절반이 bank 6, 나머지가 bank 7로 갈라집니다. i.MX6 절차를 그대로 i.MX7에 실행하면 엉뚱한 fuse 여덟 개를 태우게 됩니다. i.MX8M용 가이드(`mx8m_spl_secure_boot.txt` 1.4절)는 "절차가 비SPL 타깃과 비슷하다"며 이 문서를 참조할 뿐 i.MX8M의 SRK_HASH bank/word 표는 싣지 않습니다. i.MX8MM의 값은 NXP reference manual의 fuse map에서 확인해야 하고, 이 글에서는 적지 않습니다.

가이드는 이 단계의 위험도 직접 경고합니다. "An error in SRK Hash results in a part that does not boot." 장치를 닫은 뒤에는 SRK 해시가 틀린 칩이 어떤 이미지도 받아들이지 않는다는 뜻입니다.

### 닫기 전에 hab_status

가이드 1.7절은 SEC_CONFIG[1] fuse를 구운 *뒤에야* 칩이 올바른 PKI로 서명되지 않은 이미지를 로드하지 않는다고 적습니다. 닫기 전에는 검증이 실패해도 이미지가 실행되고, 실패는 HAB 이벤트로만 남는다는 뜻입니다. 그래서 순서가 중요합니다. 서명 이미지를 올리고, `hab_status`로 이벤트가 없는지 확인한 뒤에야 닫습니다. 가이드 1.6절에 실린 정상 출력입니다.

```text
=> hab_status

Secure boot disabled

HAB Configuration: 0xf0, HAB State: 0x66
No HAB Events Found!
```

이 문구를 만드는 `get_hab_status()`(`arch/arm/mach-imx/hab.c:458-485`)는 두 갈래로 나뉩니다.

```c
	if (imx_hab_is_enabled())
		puts("\nSecure boot enabled\n");
	else
		puts("\nSecure boot disabled\n");

	/* Check HAB status */
	if (hab_rvt_report_status(&config, &state) != HAB_SUCCESS) {
		printf("\nHAB Configuration: 0x%02x, HAB State: 0x%02x\n",
		       config, state);
		/* Display HAB events */
```

성공이면 `No HAB Events Found!`를 찍고, 실패면 `--------- HAB Event 1 -----------------` 같은 블록으로 이벤트 데이터를 덤프합니다. 이벤트가 하나라도 남아 있는 상태에서 닫으면 그 이미지는 다음 부팅부터 실행되지 않습니다.

`Secure boot enabled` 여부는 `imx_hab_is_enabled()`(`hab.c:872`)가 정합니다. 이 함수는 SoC별 SEC_CONFIG fuse를 `fuse_read()`로 읽어 특정 비트를 봅니다. i.MX8M의 위치는 소스에 있습니다.

```c
/* arch/arm/mach-imx/imx8m/soc.c:39 */
struct imx_sec_config_fuse_t const imx_sec_config_fuse = {
	.bank = 1,
	.word = 3,
};

/* arch/arm/mach-imx/hab.c:27 */
#define IS_HAB_ENABLED_BIT \
	(is_soc_type(MXC_SOC_MX7ULP) ? 0x80000000 :	\
	 ((is_soc_type(MXC_SOC_MX7) || is_soc_type(MXC_SOC_IMX8M)) ? 0x2000000 : 0x2))
```

i.MX8M은 bank 1 word 3의 `0x2000000` 비트로 closed 상태를 판단합니다. 가이드 1.7절 표의 i.MX7D/S 값(bank 1 word 3, `0x02000000`)과 같고, i.MX6은 bank 0 word 6의 `0x00000002`입니다. U-Boot가 *읽는* 위치이므로, 닫은 뒤 이 비트가 실제로 섰는지 `fuse read 1 3`으로 확인할 수 있습니다. 앞에서 본 것처럼 `read`는 shadow 값이므로 fuse를 태운 직후에는 리셋한 다음 다시 읽습니다.

### 완전히 잠그기

닫기 다음 단계도 있습니다. 가이드 1.8절은 i.MX6 기준으로 SRK_LOCK(`fuse prog 0 0 0x4000`), DIR_BT_DIS(`fuse prog 0 6 0x8`), SJC_DISABLE(`fuse prog 0 6 0x100000`) 같은 fuse를 나열하고, 영향은 NXP AN4581을 보라고 합니다. SJC_DISABLE은 JTAG를 끄는 fuse입니다. 굽고 나면 이 시리즈 Ch 22에서 쓴 디버거 경로 중 JTAG 쪽은 그 칩에서 영원히 사라집니다. 개발용 보드에는 굽지 않는 이유입니다.

## 다른 SoC로 옮길 때 가져갈 것

i.MX8MM에서 확인한 숫자는 다른 칩으로 그대로 옮기면 안 됩니다. SRK_HASH 표에서 봤듯이 같은 NXP 안에서도 bank 번호가 다르고, ROM API처럼 같은 i.MX8M 제품군 안에서 갈리는 기능도 있습니다. 대신 *같은 질문*은 어느 SoC에서나 통합니다. 아래 표는 이 장에서 각 질문의 답을 어디서 찾았는지 정리한 것입니다.

| 질문 | i.MX8MM에서 답을 찾은 곳 |
|------|------------------------|
| ROM이 이미지를 어디서 찾나 | 보드 문서의 `dd seek=33`, `imx8mimage_ivt_offset` |
| 헤더 형식은 | `include/imximage.h`의 `flash_header_v2_t`, 실제 빌드한 `flash.bin` 덤프 |
| 다음 단계는 어디서 찾나 | `imx-boot.map`, `CONFIG_SYS_MMCSD_RAW_MODE_U_BOOT_SECTOR` |
| ROM이 무엇을 기록하나 | `imx8m_detect_secondary_image_boot()`의 event ID |
| fuse 읽기가 shadow인가 직접인가 | `mxc_ocotp.c`의 `fuse_read`/`fuse_sense` |
| 신뢰 기준은 어느 fuse에 있나 | HAB 가이드 SRK_HASH 표, NXP reference manual |
| 닫힘 여부는 어디서 판단하나 | `imx_sec_config_fuse`, `IS_HAB_ENABLED_BIT` |

이 장에서 하지 않은 것도 적어 둡니다. 실제 i.MX8MM 보드는 쓰지 않았고 fuse를 읽거나 태우지 않았습니다. QEMU `virt` 머신에는 BootROM도 OCOTP도 없어서 이전 장들처럼 실행 결과를 보여 줄 수 없습니다. 위의 IVT 값은 부팅되지 않는(blob이 빠진) 빌드 결과물에서 읽은 것이고, ROM event log와 `hab_status` 출력은 소스에서 읽은 형식입니다.

## 정리

- i.MX8MM ROM은 SD 카드 33 KiB 지점의 `flash.bin`에서 IVT(`0xD1`, v`0x41`)를 읽고, entry `0x7E1000`(칩 내부 TCM)에서 SPL을 실행합니다.
- SPL은 다시 섹터 0x300(카드 0x60000바이트)에서 `u-boot.itb`를 찾습니다. ROM 오프셋과 SPL 오프셋은 따로 맞춰야 합니다.
- ROM은 주소 `0x9E0`이 가리키는 event log를 남기고, U-Boot는 event `0x51`로 secondary 이미지 부팅을 알아냅니다.
- `fuse read`는 shadow, `fuse sense`는 fuse 배열을 읽습니다. `override`는 리셋까지만, `prog`는 영구입니다.
- HAB는 SRK Table의 해시를 `SRK_HASH[255:0]` fuse에 굽고, 그 bank/word는 i.MX6·7·7ULP마다 다릅니다.
- `hab_status`가 `No HAB Events Found!`를 보여 준 뒤에 SEC_CONFIG를 구워 닫습니다. i.MX8M에서 U-Boot는 bank 1 word 3의 `0x2000000` 비트로 닫힘을 판단합니다.
- `imx8mimage`는 HAB를 꺼도 8 KiB CSF 자리를 남겨 두어, 서명 뒤에도 이미지 배치가 바뀌지 않습니다.

## 다음 장 예고

다음 편은 **Ch 24: SPL·TPL 내부 해부**입니다. 이 장에서 ROM이 TCM `0x7E1000`에 올린 SPL이 그다음에 무엇을 하는지, 즉 DDR을 초기화하고 섹터 0x300의 FIT를 읽어 TF-A와 U-Boot proper로 넘기는 과정을 따라갑니다.

## 관련 항목

- [Ch 4: 부트 단계](/blog/embedded/bootloader/chapter04-boot-stages) — ROM·SPL·U-Boot proper의 역할 분담
- [Ch 16: Verified Boot](/blog/embedded/bootloader/chapter16-verified-boot) — HAB 다음 단계인 U-Boot FIT 서명 검증
- [Ch 22: 디버깅](/blog/embedded/bootloader/chapter22-debugging) — JTAG를 쓰는 디버그 경로(SJC_DISABLE을 구우면 사라짐)
- [Ch 24: SPL·TPL 내부 해부](/blog/embedded/bootloader/chapter24-spl-deep) — ROM 다음 단계
- [Ch 27: Chain of Trust](/blog/embedded/bootloader/chapter27-chain-of-trust) — ROM에서 커널까지의 신뢰 연결
- [U-Boot v2024.04 — doc/imx/habv4](https://github.com/u-boot/u-boot/tree/v2024.04/doc/imx/habv4) — HAB 가이드 원문
