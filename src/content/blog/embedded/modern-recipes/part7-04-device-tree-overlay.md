---
title: "Device Tree Overlay 적용 — Runtime fragment·dtoverlay"
slug: "embedded/modern-recipes/part7-04-device-tree-overlay"
date: 2026-04-16T09:03:00
description: "DT overlay의 fragment·target·__symbols__를 dtc·fdtoverlay·U-Boot fdt apply로 실제 적용해 보고, Raspberry Pi dtoverlay와 런타임 overlay의 현황을 1차 자료로 정리합니다."
series: "Modern Embedded Recipes"
seriesOrder: 78
tags: [recipes, linux, device-tree, overlay]
topics: ["embedded"]
---

## 한 줄 요약

> **"DT overlay는 *base DTB에 fragment를 덮어쓰는 패치*입니다."** I²C 센서 하나를 더하려고 base DT 전체를 다시 컴파일할 필요가 없습니다. 이 글은 Linux v6.12의 i.MX8M Mini EVK DTB에 `fdtoverlay`로, QEMU `virt` 보드의 DTB에 U-Boot `fdt apply`로 overlay를 실제로 적용해 봅니다.

## 어떤 상황에서 쓰나

같은 보드에 LCD나 센서를 옵션으로 다는 경우, 사용자가 확장 핀에 외부 모듈을 꽂는 경우, 한 보드가 여러 변형을 가지는 경우에 overlay를 씁니다. 건물 도면 원본은 그대로 두고, 증축한 방만 그린 투명 필름을 위에 겹치는 방식입니다. Base DTB는 보드의 고정 구성만 담고, 옵션은 `.dtbo` 파일로 나눠 부팅 때 고릅니다.

Raspberry Pi는 펌웨어 loader가 `config.txt`의 `dtoverlay=` 줄을 읽어 `overlays/<이름>.dtbo`를 base DTB에 합친 뒤 커널에 넘깁니다(Raspberry Pi documentation `computers/configuration/reference.adoc` 841행, 849-856행, 저장소 `c6a6496`). 다른 보드에서는 U-Boot `fdt apply`나 빌드 시점의 `fdtoverlay`가 같은 일을 합니다.

## 핵심 개념

| 요소 | 역할 |
|------|------|
| `/plugin/;` | 이 파일이 overlay임을 선언 |
| `&label { ... };` | base의 label이 가리키는 노드에 덮어쓸 내용. `dtc`가 `fragment@N`의 `target`과 `__overlay__`로 바꿉니다 |
| `target-path = "/..."` | label 대신 경로로 대상을 가리킴 |
| `__symbols__` (base) | base가 내보낸 label → 경로 표. `dtc -@`로 생성 |
| `__fixups__` (overlay) | overlay가 base에서 찾아야 할 label 목록 |
| `status` | `"okay"`/`"disabled"`로 노드를 켜고 끔 |

BME280 센서를 i.MX8M Mini EVK의 `i2c3`에 더하는 overlay입니다. 이 보드 DT는 `&i2c3`에 `pca6416: gpio@20`을 두고 있고(Linux v6.12 `arch/arm64/boot/dts/freescale/imx8mm-evk.dtsi:441-447`), BME280의 기본 주소는 0x76입니다.

```dts
/dts-v1/;
/plugin/;

&i2c3 {
	#address-cells = <1>;
	#size-cells = <0>;

	bme280: pressure-sensor@76 {
		compatible = "bosch,bme280";
		reg = <0x76>;
	};
};
```

`dtc` 1.7.2로 컴파일한 `.dtbo`를 `fdtdump`로 보면, `&i2c3`이 `fragment@0`의 `target`으로 바뀌고 그 값은 아직 모르는 phandle(`0xffffffff`)입니다. 어떤 label을 찾아야 하는지는 `__fixups__`에 남습니다.

```bash
dtc -@ -I dts -O dtb -o bme280.dtbo bme280.dts
fdtdump bme280.dtbo
```

```text
    fragment@0 {
        target = <0xffffffff>;
        __overlay__ {
            #address-cells = <0x00000001>;
            #size-cells = <0x00000000>;
            pressure-sensor@76 {
                compatible = "bosch,bme280";
                reg = <0x00000076>;
                phandle = <0x00000001>;
            };
        };
    };
    __symbols__ {
        bme280 = "/fragment@0/__overlay__/pressure-sensor@76";
    };
    __fixups__ {
        i2c3 = "/fragment@0:target:0";
    };
};
```

`bosch,bme280`은 v6.12 bmp280 I²C driver의 match table에 있습니다(`drivers/iio/pressure/bmp280-i2c.c:33`).

## 코드 / 실제 사용 예

아래 실행은 모두 Debian 13 arm64 VM(`dtc`·`fdtoverlay` 1.7.2)과, 그 VM에서 빌드한 Linux v6.12 트리, QEMU 11.1.3입니다.

### Base DT의 symbol 활성화

v6.12 `make dtbs`가 만든 `imx8mm-evk.dtb`에는 `__symbols__`가 없습니다. 커널 빌드 시스템이 `-@`를 붙이는 경우는 세 가지입니다. 첫째는 Makefile에 `<이름>-dtbs := base.dtb overlay.dtbo` 형태로 overlay와 합칠 base로 등록된 DTB이고(`scripts/Makefile.dtbs:11`, `:113-114`, 예: `arch/arm64/boot/dts/freescale/Makefile:61`), 둘째는 `DTC_FLAGS_<보드> := -@`를 지정한 DTB이고(`scripts/Makefile.dtbs:111`), 셋째는 디렉터리 Makefile이 `DTC_FLAGS := -@`로 그 디렉터리 전체에 붙이는 경우입니다(예: `arch/arm64/boot/dts/broadcom/Makefile:4`).

보드 하나에만 `-@`를 붙이려면 그 변수를 명령줄로 줍니다. `V=1`로 본 `dtc` 명령에 기존 warning 옵션이 남은 채 `-@`가 더해졌고, DTB는 41,122 B에서 53,965 B로 커졌습니다.

```bash
make V=1 DTC_FLAGS_imx8mm-evk=-@ freescale/imx8mm-evk.dtb
fdtget arch/arm64/boot/dts/freescale/imx8mm-evk.dtb /__symbols__ i2c3
```

```text
/soc@0/bus@30800000/i2c@30a40000
```

`make dtbs DTC_FLAGS=-@`도 `__symbols__`를 만들지만, 명령줄의 `DTC_FLAGS`가 Makefile 안의 `DTC_FLAGS +=` 값을 덮어씁니다. 같은 `V=1`로 보면 커널이 넣던 `-Wno-unique_unit_address` 등의 옵션이 모두 빠지고 `-@`만 남았습니다. 아래는 그 명령줄 중 `dtc` 부분입니다.

```text
./scripts/dtc/dtc -o arch/arm64/boot/dts/freescale/imx8mm-evk.dtb -b 0 -iarch/arm64/boot/dts/freescale/ -i./scripts/dtc/include-prefixes -@ -d arch/arm64/boot/dts/freescale/.imx8mm-evk.dtb.d.dtc.tmp arch/arm64/boot/dts/freescale/.imx8mm-evk.dtb.dts.tmp 
```

### `fdtoverlay`로 빌드 시점에 합치기

`-@`로 만든 base와 기본 base에 같은 overlay를 적용했습니다.

```bash
fdtoverlay -i imx8mm-evk.sym.dtb -o merged.dtb bme280.dtbo
fdtget merged.dtb /soc@0/bus@30800000/i2c@30a40000/pressure-sensor@76 compatible
fdtoverlay -i imx8mm-evk.nosym.dtb -o merged2.dtb bme280.dtbo
```

```text
bosch,bme280

Failed to apply 'bme280.dtbo': FDT_ERR_BADOFFSET
base blob does not have a '/__symbols__' node, make sure you have compiled the base blob with '-@' option
```

`-@` base에는 센서 노드가 `i2c@30a40000` 아래에 생겼고, 기본 base에는 `__symbols__`가 없어 `&i2c3`을 풀지 못했습니다. 커널의 `<이름>-dtbs` 규칙도 이 `fdtoverlay`를 부릅니다(`scripts/Makefile.dtbs:81-82`).

### U-Boot `fdt apply`로 부팅 때 합치기

U-Boot의 `fdt apply`는 `CONFIG_OF_LIBFDT_OVERLAY`가 있어야 합니다. U-Boot v2025.04 `qemu_arm64_defconfig`로 만든 `.config`에는 꺼져 있어서(`# CONFIG_OF_LIBFDT_OVERLAY is not set`), 이 한 줄을 켜고 다시 빌드했습니다. QEMU `virt`가 넘기는 DTB에는 label도 `__symbols__`도 없으므로, label을 쓰는 overlay는 실패합니다.

```dts
/dts-v1/;
/plugin/;

&uart0 {
	status = "disabled";
};
```

```text
=> setenv fdtovaddr 0x48000000
=> fdt addr ${fdtcontroladdr}
Working FDT set to 7e577df0
=> fdt resize 8192
=> tftp ${fdtovaddr} ov-label.dtbo
...
Bytes transferred = 228 (e4 hex)
=> fdt apply ${fdtovaddr}
failed on fdt_overlay_apply(): FDT_ERR_NOTFOUND
base fdt does not have a /__symbols__ node
make sure you've compiled with -@
```

`fdt resize`는 overlay가 들어갈 여유를 base에 만드는 단계로, U-Boot 문서의 절차에도 들어 있습니다(`doc/usage/fdt_overlays.rst`). 실패한 apply 뒤의 DTB는 쓰지 않고, QEMU를 새로 띄워 같은 순서(`dhcp`, `setenv fdtovaddr 0x48000000`, `fdt addr`, `fdt resize 8192`, `tftp`)로 경로로 대상을 가리키는 overlay를 적용했습니다. [7-03](/blog/embedded/modern-recipes/part7-03-device-tree-basics)의 demo 노드를 루트에 더하는 overlay입니다.

```dts
/dts-v1/;
/plugin/;

/ {
	fragment@0 {
		target-path = "/";
		__overlay__ {
			demo@9100000 {
				compatible = "myco,demo-v2", "myco,demo";
				reg = <0x0 0x09100000 0x0 0x1000>;
				clock-frequency = <24000000>;
				label = "status";
				status = "okay";
			};
		};
	};
};
```

```text
=> fdt apply ${fdtovaddr}
=> fdt print /demo@9100000
demo@9100000 {
	status = "okay";
	label = "status";
	clock-frequency = <0x016e3600>;
	reg = <0x00000000 0x09100000 0x00000000 0x00001000>;
	compatible = "myco,demo-v2", "myco,demo";
};
```

이 DTB로 Linux v6.12를 `booti`하고 initramfs의 `/init`에서 확인했더니, 노드가 커널까지 넘어가 platform device가 만들어졌습니다.

```text
status: okay 
/sys/bus/platform/devices/9100000.demo
```

이 overlay를 `dtc`로 컴파일할 때는 경고가 났습니다. Overlay 파일 안에서는 대상 노드의 `#address-cells`·`#size-cells`를 모르므로 `dtc`는 기본값(2·1)을 가정하고, cell 네 개짜리 `reg`를 틀린 길이로 봅니다. 실제 대상인 QEMU `virt` 루트는 2·2라서 적용 결과는 맞았습니다. 아래는 `dtc` 경고 10줄 중 첫 줄이고, 뒤에는 `#address-cells`·`#size-cells` 기본값에 기댄다는 `avoid_default_addr_size` 경고 등이 이어졌습니다.

```text
ov-path.dts:10.5-39: Warning (reg_format): /fragment@0/__overlay__/demo@9100000:reg: property has invalid length (16 bytes) (#address-cells == 2, #size-cells == 1)
```

### Raspberry Pi config.txt

Raspberry Pi에서는 펌웨어가 이 일을 합니다. 아래 설정은 실행하지 않았고, 이름과 의미는 Raspberry Pi 문서와 펌웨어 저장소의 `boot/overlays/README`(master `896fc67`)에서 확인했습니다.

```ini
# /boot/firmware/config.txt
dtparam=i2c_arm=on
dtoverlay=i2c-sensor,bme280
dtoverlay=spi1-3cs
dtoverlay=disable-bt
```

| 줄 | 의미 | 출처 |
| --- | --- | --- |
| `dtparam=i2c_arm=on` | base DTB가 내보낸 `i2c_arm` 파라미터로 ARM 쪽 I²C를 켬(기본 off) | `overlays/README` 306-307행 |
| `dtoverlay=i2c-sensor,bme280` | `i2c-sensor` overlay를 BME280 선택으로 적용. 주소 0x76-0x77, 기본 0x76 | 같은 파일 2602-2605행, 2672-2673행 |
| `dtoverlay=spi1-3cs` | spi1을 chip select 3개로 켬 | 같은 파일 5231-5236행 |
| `dtoverlay=disable-bt` | 온보드 Bluetooth를 끔. Pi 5 이전 모델에서는 UART0/ttyAMA0를 GPIO 14·15로 되돌림 | 같은 파일 1150-1153행 |

`dtoverlay=bme280`처럼 센서 이름 그대로의 overlay는 이 README에 없습니다. BME280은 `i2c-sensor`의 파라미터입니다.

### Runtime overlay

부팅이 끝난 뒤 overlay를 적용하는 사용자 공간 인터페이스는 Linux v6.12 mainline에 없습니다. 커널 안에는 `of_overlay_fdt_apply()`(`drivers/of/overlay.c:980`, `EXPORT_SYMBOL_GPL` `:1070`)와 `CONFIG_OF_OVERLAY`(`drivers/of/Kconfig:99`)가 있지만, 이것은 커널 코드가 부르는 API입니다(`Documentation/devicetree/overlay-notes.rst` 111행 이후). v6.12 트리에는 `OF_CONFIGFS`라는 Kconfig가 없습니다.

Raspberry Pi 커널 트리(`rpi-6.12.y`, `ab43720`)는 `CONFIG_OF_CONFIGFS`("Device Tree Overlay ConfigFS interface")와 `drivers/of/configfs.c`를 따로 가지고 있고, 이 파일의 `dtbo` 속성에 쓴 내용을 `of_overlay_fdt_apply()`로 적용합니다(`configfs.c:140-157`). RPi 문서도 런타임 overlay를 "there is no accepted way to do this from userspace"라고 적고, I²C·SPI·sound 장치는 런타임 추가에 반응하지만 그렇지 않은 서브시스템도 있다고 적습니다(`reference.adoc` 984행, 998행). 이 절의 configfs 경로는 RPi 커널이 없어 실행하지 않았습니다.

### GPIO 핀 reassign overlay

RPi(BCM2835 계열) 핀 설정은 `brcm,pins`와 `brcm,function`으로 적습니다. v6.12 바인딩은 `brcm,function`의 값 0을 GPIO in, 1을 GPIO out으로 정의합니다(`Documentation/devicetree/bindings/pinctrl/brcm,bcm2835-gpio.txt:65-77`). 아래는 핀 설정 fragment와 새 노드 fragment 두 개로 된 overlay이고, `dtc -@`로 컴파일만 확인했습니다.

```dts
/dts-v1/;
/plugin/;

/ {
	fragment@0 {
		target = <&gpio>;
		__overlay__ {
			my_pins: my_pins {
				brcm,pins = <17 27>;
				brcm,function = <1 0>;   /* out, in */
			};
		};
	};

	fragment@1 {
		target-path = "/";
		__overlay__ {
			leds {
				compatible = "gpio-leds";
				heartbeat {
					gpios = <&gpio 17 0>;
					linux,default-trigger = "heartbeat";
				};
			};
		};
	};
};
```

### Parameter 노출

RPi overlay는 `__overrides__` 노드로 `dtoverlay=` 줄의 파라미터를 받습니다. 값은 대상 label의 phandle과 속성 이름의 쌍이고, 속성 이름 뒤의 `:`와 숫자는 그 속성 안의 바이트 오프셋에 32비트 정수를 쓴다는 뜻입니다(RPi `reference.adoc` 435행, 452-464행).

```dts
/ {
	__overrides__ {
		addr = <&bme280>, "reg:0";    /* dtoverlay=<name>,addr=0x77 */
	};
};
```

위 BME280 overlay 끝에 이 노드를 붙이면 `dtc -@`가 오류 없이 컴파일하고, `addr` 속성에는 `bme280` 노드의 phandle과 문자열 `reg:0`이 들어갑니다. 이 값을 읽어 `reg`를 고치는 해석은 RPi 펌웨어와 `dtoverlay` 도구가 하는 일입니다. `fdtoverlay`나 U-Boot `fdt apply`는 `__overrides__`를 해석하지 않습니다.

## 측정 / 성능 비교

이 글에서 잰 값은 크기뿐입니다. `imx8mm-evk.dtb`는 `-@` 없이 41,122 B, `-@`로 53,965 B였고, 차이 12,843 B가 `__symbols__`(와 phandle) 몫입니다. BME280 overlay `.dtbo`는 449 B였습니다. Overlay는 base DTB를 다시 빌드하지 않으므로, 옵션 하나를 바꿀 때 바뀌는 파일이 이 449 B짜리 하나라는 점이 배포 단위로서의 장점입니다.

## 자주 보는 함정

> ⚠️ `__symbols__` 없는 base

위 `fdtoverlay`와 U-Boot 실행에서 본 대로, `&label`을 쓰는 overlay는 base에 `__symbols__`가 없으면 적용되지 않습니다. Base를 `-@`로 빌드하거나, 대상이 고정된 경우에만 `target-path`를 씁니다.

> ⚠️ 두 overlay가 같은 노드를 씀

같은 `pressure-sensor@76`을 `bosch,bme280`과 `bosch,bmp280`으로 각각 쓰는 overlay 두 개를 차례로 `fdtoverlay`에 넣었더니 오류 없이 끝났고, 결과 노드는 하나, `compatible`은 나중 것(`bosch,bmp280`)이었습니다.

```text
rc=0
pressure-sensor@76
gpio@20
camera@3c
bosch,bmp280
```

경로가 같으면 나중 overlay가 속성을 덮어씁니다. 어떤 overlay가 무엇을 바꿨는지는 합친 결과를 `fdtget`이나 `/proc/device-tree`로 확인해야 보입니다.

> ⚠️ 센서와 다른 `compatible`

BME280 칩에 `compatible = "bosch,bmp280"`을 적으면 probe가 조용히 실패하는 것이 아닙니다. v6.12 bmp280 core는 칩 ID 레지스터를 읽어 그 `compatible`의 ID 목록에 없으면 `bad chip id: 0x%x is not a known chip id` 경고만 남기고 계속 진행합니다(`drivers/iio/pressure/bmp280-core.c:2738-2752`). 그래서 driver는 BMP280용 설정으로 BME280을 다루게 되고, 이 경고가 단서입니다. 실제 센서가 없어 이 경로는 실행하지 않았습니다.

> ⚠️ base 노드와 같은 이름의 노드를 fragment로 새로 만듦

RPi 문서는 fragment 안에서 base에 이미 있는 노드를 새로 만들면 커널이 새 노드의 이름을 바꿔 둘 다 남긴다고 적고, 기존 노드의 속성을 바꾸려면 그 노드를 target으로 삼으라고 권합니다(`reference.adoc` 991행). 이것은 런타임 overlay의 동작이고, 위 `fdtoverlay` 실험처럼 빌드 시점에 합치면 같은 경로는 덮어쓰기가 됩니다.

## 정리

- DT overlay는 base DTB에 fragment 단위로 덮어쓰는 패치입니다. `&label`은 `dtc`가 `target`과 `__fixups__`로 바꿉니다.
- `&label` overlay를 받을 base는 `-@`로 빌드해 `__symbols__`를 가져야 합니다. 커널에서는 `DTC_FLAGS_<보드>=-@`가 기존 warning 옵션을 유지하고, `DTC_FLAGS=-@`는 그것을 덮어씁니다.
- 빌드 시점에는 `fdtoverlay`, 부팅 때는 U-Boot `fdt apply`(`CONFIG_OF_LIBFDT_OVERLAY`), RPi는 펌웨어의 `dtoverlay=`가 overlay를 합칩니다.
- `target-path`는 `__symbols__` 없이도 적용되지만, overlay 파일 안에서는 대상의 cell 수를 모르므로 `dtc`가 `reg` 경고를 낼 수 있습니다.
- Linux v6.12 mainline에는 사용자 공간 런타임 overlay 인터페이스가 없고, RPi 커널의 configfs는 downstream 패치입니다.
- 같은 경로를 쓰는 overlay 두 개는 오류 없이 나중 것이 이깁니다.

다음 편은 **커널 빌드**입니다. defconfig, menuconfig, out-of-tree, packaging까지 다룹니다.

## 관련 항목

- [7-01: i.MX8M Mini EVK Linux 부팅 흐름](/blog/embedded/modern-recipes/part7-01-linux-boot-flow)
- [7-02: U-Boot 활용](/blog/embedded/modern-recipes/part7-02-uboot-usage)
- [7-03: Device Tree 실전](/blog/embedded/modern-recipes/part7-03-device-tree-basics)
- [7-05: 커널 빌드](/blog/embedded/modern-recipes/part7-05-kernel-build)
- [7-06: Kernel Module](/blog/embedded/modern-recipes/part7-06-kernel-module)
- [7-08: Platform 드라이버](/blog/embedded/modern-recipes/part7-08-platform-driver)
