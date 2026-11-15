# 공개 글 AdSense 평가 — 루프 02

> 대상: 공개 글 10편 (Bootloader Internals, `seriesOrder` 11~20)
> 기준: `docs/adsense-audit/rubric.md` v1.2, `docs/adsense-audit/anchors.md`, `docs/adsense-audit/antipatterns.md`
> 상태: 점수화·더블 체크 완료 — 원문 수정 없음
> 평가일: 2026-10-11

## 범위

이번 루프는 Modern Embedded Recipes를 뺀 공개 시리즈 전체 계획(`node scripts/adsense-score-loop.mjs plan`, 406편·41루프·루프당 10편)의 두 번째 루프다. 대상은 `src/content/blog/embedded/bootloader/`의 `chapter11-network-boot.md`~`chapter20-rauc-swupdate.md` 10편이고 모두 공개 글이다. 점수만 매기는 루프라 원문, slug, date, seriesOrder는 바꾸지 않았다. 줄 번호는 2026-10-11 기준 원문 파일의 줄이다. 10편 모두 `score_status: 잠정`이다.

## 요약

| 파일 | A | B | C | D | E | F | G | 합계 | factcheck | 판정 | confidence | anchor_ref |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- | --- | --- |
| `chapter11-network-boot.md` | 15 | 13 | 8 | 12 | 7 | 5 | 3 | **63** | 오류 확인 | 우선 조치 | 중간 | `part12-10-on-device-llm.md`, `part1-04-uart-hardware.md` |
| `chapter12-usb-boot.md` | 14 | 13 | 7 | 11 | 7 | 4 | 2 | **58** | 오류 확인 | 우선 조치 | 중간 | `part12-10-on-device-llm.md`, `part7-05-kernel-build.md` |
| `chapter13-env-bootcmd.md` | 10 | 12 | 7 | 8 | 7 | 7 | 2 | **53** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter14-bootflow-bootmeth.md` | 12 | 12 | 7 | 11 | 6 | 5 | 2 | **55** | 미검증 | 병합 검토 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter15-fit-image.md` | 11 | 11 | 7 | 10 | 7 | 5 | 2 | **53** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part1-04-uart-hardware.md` |
| `chapter16-verified-boot.md` | 14 | 13 | 8 | 9 | 8 | 5 | 2 | **59** | 오류 확인 | 우선 조치 | 중간 | `part12-10-on-device-llm.md`, `part1-04-uart-hardware.md` |
| `chapter17-ab-update.md` | 15 | 13 | 7 | 10 | 8 | 5 | 2 | **60** | 오류 확인 | 우선 조치 | 중간 | `part7-05-kernel-build.md`, `part12-10-on-device-llm.md` |
| `chapter18-efi-in-uboot.md` | 11 | 12 | 7 | 10 | 6 | 4 | 2 | **52** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter19-kernel-handoff.md` | 12 | 12 | 6 | 10 | 2 | 6 | 2 | **50** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |
| `chapter20-rauc-swupdate.md` | 11 | 11 | 6 | 6 | 7 | 6 | 2 | **49** | 오류 확인 | 우선 조치 | 중간 | `part1-04-uart-hardware.md`, `part7-05-kernel-build.md` |

평균 55.2점(10편 합 552), 범위 49~63점이다. 판정은 우선 조치 8편, 병합 검토 2편(ch13·ch14)이다. 80점 이상 글과 `factcheck: 검증됨` 글은 없다. 오류 확인은 8편(ch11·12·15·16·17·18·19·20)이고 모두 원문 내부 모순(루브릭 3-1: 두 구체 진술, 코드 대 산문, 출력 속 산술)으로 판정했다. 외부 1차 자료로 확정한 오류는 없다. 점수 구간으로는 ch11·ch17만 보강(60~79)이고 나머지 8편이 병합 검토(40~59)다. P0는 찾지 못했다. 확인 범위는 10편 원문 본문 전체와 다음 장 예고·관련 항목·본문 내부 링크 대상 파일의 존재·제목·seriesOrder·`draft: false`까지이고, 렌더링·광고 배치·외부 링크 응답은 보지 않았다.

## 더블 체크

| 파일 | 1차 | 최종 | 차이 | 부풀림 |
| --- | ---: | ---: | ---: | --- |
| `chapter11-network-boot.md` | 63 | 63 | 0 | 없음 |
| `chapter12-usb-boot.md` | 59 | 58 | -1 | 없음 |
| `chapter13-env-bootcmd.md` | 55 | 53 | -2 | 없음 |
| `chapter14-bootflow-bootmeth.md` | 55 | 55 | 0 | 없음 |
| `chapter15-fit-image.md` | 54 | 53 | -1 | 없음 |
| `chapter16-verified-boot.md` | 60 | 59 | -1 | 없음 |
| `chapter17-ab-update.md` | 60 | 60 | 0 | 없음 |
| `chapter18-efi-in-uboot.md` | 52 | 52 | 0 | 없음 |
| `chapter19-kernel-handoff.md` | 53 | 50 | -3 | 없음 |
| `chapter20-rauc-swupdate.md` | 49 | 49 | 0 | 없음 |

1차 합 560에서 최종 552로 8점 내려갔다. 부풀림(AP-C-24) 판정은 10편 모두 없음이다.

- 기각한 오류 확인: 0건.
- 추가한 오류 확인: 5건, 5편. 이 중 3편은 판정이 미검증 → 오류 확인, 병합 검토 → 우선 조치로 바뀌었다.
  - ch11: 38·113행 출력 'Bytes transferred = 10995712 (a7c000 hex)'. 10995712는 0xa7c800이고 0xa7c000은 10993664다. 기존 두 건(415행 32-bit vs 16비트, 159행 1500-28=1468)에 더한 세 번째 모순이고 판정은 그대로다.
  - ch12: 82~83행 UMS count 0x1d59000(약 14.67 GiB) vs 90~94행 lsblk(sda 14.9G, 파티션 합 약 14.85 GiB). 미검증 → 오류 확인.
  - ch15: 193행 '생략하면 default가 쓰임' vs 278행 'compatible과 일치하는 configuration 자동 선택'(263행 default = "conf-revA"). 미검증 → 오류 확인.
  - ch16: 388행 산문 '-e로 암호화' vs 407행 코드 '-E'. 기존 두 건에 더한 세 번째 모순이다.
  - ch19: 45행 '512MB 영역 안 또는 그 이하' vs 130행 '512MB 영역 또는 그 위쪽'. 평가자가 uncertainties에 둔 것을 올렸다. 미검증 → 오류 확인.
- 점수 변경: ch12 C 8→7(서로 맞지 않는 예시 출력), ch13 A 11→10(고유 부분이 bullet 몇 줄)·D 9→8(ch29 44행과 거의 같은 문장, ch10 boot.cmd 블록 중복), ch15 B 12→11(193·278행 모순), ch16 C 9→8(출처 없는 dm-verity 수치가 산술로도 맞지 않음, 152340×8=1218720), ch19 E 5→2(제목은 ARM/ARM64, 본문은 RISC-V·x86까지 — 루브릭 E 주석 '제목 범위와 본문 범위가 다르면 2점 이하').
- 근거 정정: ch11 A·C의 '148행'을 실제 수치가 있는 144행으로, ch12 D의 bsp/chapter17 범위를 305~333행으로, ch13 F의 링크 대상 행을 ch10 378행·ch11 279행·bsp ch06 368행으로, ch15 C의 출력 범위를 139~158행으로, ch16 D의 ch17 겹침을 389~402행으로, ch18 D의 ch37 표를 29~34행으로, ch19 D의 ch01 범위를 49~54행으로, ch20 D의 BSP Ch18 범위를 101~130·197~239행으로 고쳤다.
- F는 10편 모두 다음 장 예고를 seriesOrder+1 글과, 관련 항목 라벨을 대상 파일 내용과 대조했다. 다음 장 예고는 10편 모두 맞다. 감점 원인은 대상 글에 없는 내용을 약속하는 관련 항목 라벨(ch11·12·14·15·16·17·18)이다. ch18은 평가자가 놓친 436행 Ch19 라벨(대상에 ExitBootServices·EFI stub 0건)을 추가했고 점수는 이미 5 이하라 그대로 뒀다.

## 글별 근거

### `chapter11-network-boot.md` — 63점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 세 건이다.
- 415행 항목 제목 'TFTP 32-bit block counter 회전' vs 같은 줄 본문 'RFC 1350의 block number는 16비트'. counter 폭에 대한 두 진술이 동시에 참일 수 없다.
- 159행 권장값 '1468 (1500 MTU - 28 헤더)'. 1500-28=1472이고, 1468이 되려면 TFTP 헤더 4바이트까지 빼야 한다.
- 38·113행 'Bytes transferred = 10995712 (a7c000 hex)'. 10995712는 0xa7c800이고 0xa7c000은 10993664다.

git log의 bf206362 'Fact-check bootloader network and DDR guidance'는 본문이 없고 대조한 1차 자료를 적지 않았다. diff도 환경 변수 이름(tftp_blocksize→tftpblocksize 등) 6줄 수정뿐이라 검증됨 근거로 쓰지 않았다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 이 글에만 있는 내용은 tftpblocksize·tftpwindowsize 권장값과 MTU black hole 주의(157~163행), NFSv3·v4 비교와 'NFSv3+TCP가 사실상 표준'이라는 판단(268~275행), dnsmasq tag로 라인을 나누는 구성과 6단계 provisioning 흐름(375~403행)이다. 409~417행 실수 목록도 구체적이다. 반면 DORA 표(67~72행)와 tftpd-hpa 설치(119~128행)는 일반 문서 수준이고, 144행 '1~2 MB/s', 163행 '10배 이상', 275행 판단에는 출처가 없다. |
| B | 13 | 흐름은 DHCP → TFTP → blocksize → PXE → iPXE → NFS → distroboot → HTTP → factory → 실수 → 정리(21~427행)로 이어진다. 그러나 NFS가 237~275행과 298~339행에 나뉘어 exports(244·304행)와 cmdline(259~263·307~309행)이 되풀이되고, dhcp 출력도 27~39행과 88~95행에 두 번 나온다. 내부 모순 세 건(38·159·415행)이 있어 AP-C-24에 따라 B ≤ 13. |
| C | 8 | U-Boot 명령(103~114·318~335행), /etc/default/tftpd-hpa(133~138행), dhcpd.conf(45~59행), dnsmasq(375~394행)로 따라 할 수 있다. 그러나 36행 '12.3 MiB/s', 144행 '1~2 MB/s', 163행 '10배 이상'은 보드·NIC·U-Boot 버전 없이 수치만 있어 루브릭 3-1의 C ≤ 8. 38·113행 출력은 10진수와 16진수가 맞지 않아 실제 로그인지도 의심스럽다. |
| D | 12 | 비교한 글: 인접 `chapter10-storage-boot.md`(로컬 미디어)와 `chapter12-usb-boot.md`(fastboot·UMS)는 매체가 달라 겹치지 않는다. `chapter13-env-bootcmd.md` 136~141행 distro_bootcmd·boot_targets가 이 글 277~296행과, 같은 글 225행 random MAC 실수가 296행과 겹친다. `chapter29-distro-boot.md` 53행 boot_targets는 282행과 같은 주제다. 다른 시리즈 `modern-recipes/part7-02-uboot-usage.md` 63~82행 TFTP boot·tftpd-hpa가 103~128행과, `bsp/chapter06-u-boot-porting.md` 409~425행 'TFTP로 빠른 dev cycle'이 15~17·103~114행과 같은 메시지다. blocksize 협상·PXE 탐색·NFS root·factory provisioning은 이 글에만 있다. |
| E | 7 | 제목 'TFTP·PXE·BOOTP 시퀀스 분석'과 description의 DHCP/BOOTP·TFTP·PXE를 TFTP(99~163행)·PXE(165~235행)·DORA(63~97행)로 이행한다. BOOTP 자체는 61행 한 문단뿐이라 6~8 구간 안에서 감점했다. |
| F | 5 | 431행 다음 글 안내(USB 부트, fastboot·UMS)는 seriesOrder 12 `chapter12-usb-boot.md`와 맞다. 그러나 439행 'Ch 30: CI·factory test — factory provisioning 자동화 연계'의 대상 `chapter30-bootloader-ci.md`에 'factory'가 0건이고 405행 본문도 같다. 440행 'Buildroot Ch 8 — NFS root의 target/ 트리'의 대상 `buildroot/chapter08-filesystems.md`에도 NFS·target/ 언급이 없고 339행 본문 링크도 같다. 틀린 라벨이라 F ≤ 5. |
| G | 3 | 주장과 함께 인용한 1차 출처는 RFC 1350(144행), RFC 2348(146·159행), RFC 7440(160행), RFC 5071(83행), RFC 2347(343행)이고 관련 항목에 PXE 2.1 사양·RFC 링크(441~443행)도 있다. 그러나 U-Boot 버전·doc·소스 경로가 없어 tftpblocksize·tftptimeout 같은 변수와 343행 '최신 U-Boot는 wget'이 어느 판 기준인지 알 수 없다. |

uncertainties:
- 415행 rollover를 'RFC 2348 확장'이라고 적었다. RFC 2348에 rollover가 정의돼 있는지 1차 자료로 확인하지 않았다.
- 81행 option 66을 next-server와 같다고 적었다. dhcpd.conf의 next-server(50행)는 siaddr 필드인데, 둘의 구분을 RFC 2132로 확인하지 않았다.
- 365행 U-Boot wget의 HTTPS 미지원 주장과 'mbedTLS를 빌드에 포함해도' 문장이 함께 있다. 최근 U-Boot(lwIP·mbedTLS)의 HTTPS 지원 여부는 upstream으로 확인하지 않았다.
- 161행 tftptimeout의 단위(ms)와 권장값 5000은 U-Boot 소스로 확인하지 않았다.
- 254행 insecure 옵션 설명이 커널 nfsroot의 포트 동작과 맞는지 확인하지 않았다.
- 296행 'networking=true'나 ethaddr가 비어 있을 때 target을 건너뛴다는 조건은 distro_bootcmd 소스로 확인하지 않았다.
- 182~185행 pxe get 탐색 순서에서 IP hex를 줄여 가며 찾는 단계가 빠졌는지 U-Boot doc으로 확인하지 않았다.
- 235행 'iPXE는 x86 중심이라 ARM 포팅이 제한적'에는 출처가 없다.

### `chapter12-usb-boot.md` — 58점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 산술 모순이다.
- 82~83행 `ums 0 mmc 0` 출력: 'count 0x1d59000'(30,773,248 sector × 512 B = 약 14.67 GiB)
- 90~94행 같은 장치의 lsblk: sda '14.9G', sda1 256M + sda2 14.6G(합 약 14.85 GiB)

85행 '[PC 측에서는 /dev/sdX로 디스크가 뜸]'과 97행 dd 대상 /dev/sda2로 같은 장치임이 확인되고, 파티션 합이 노출한 장치 크기를 넘어 두 출력은 동시에 참일 수 없다. git log 12개 커밋(0a9dd7bc, be973200, fa55144d, ac24bb76, ffe6517b, 3a5602d3, 20c1b507, b6dedf23, 33c20b23, 5534938b, 400892d7, e8f4f432)에 1차 자료 대조 기록이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 부분은 손상 깊이별 recovery 채널 표(352~359행), 'BOOT 핀이나 jumper로 USB fallback 진입 수단을 반드시 두어야 한다'는 판단(361행), host/device 모드 비교 표(194~199행), 양산 라인 USB 실패 패턴(433~437행)이다. 나머지는 U-Boot·fastboot 명령 소개 수준이다. fastboot(21~75·245~276행), UMS(77~103·278~311행), 파티션 alias(55~61·170~188·274행), uuu 스크립트(148~166·363~378·401~425행)가 글 안에서 반복된다. 앵커 part12-10(18)보다 낮고 part7-05(9)보다 높다. |
| B | 13 | 한 줄 요약(13~19행)부터 fastboot·UMS·USB host·boot ROM download·DFU·SDP·recovery·양산·디버깅을 거쳐 정리(451~458행)까지 간다. 제목의 '메커니즘' 중 fastboot 프로토콜 내부(63~75행)는 65행 한 문장과 응답 접두사 네 개(70~73행)뿐이고 66~67행은 빈 줄이다. lock/unlock, sparse image, 전송 크기 한계가 없고 반복 절(245·278행) 때문에 길이에 비해 범위가 좁다. |
| C | 7 | 명령과 예상 출력은 많다(28~32·82~99·110~126·230~241·269~271·330~336행). 그러나 보드·U-Boot 버전이 없고(112행 usb@38100000만 있음), 261행 '256MB 미만이면 FAILtoo large'와 269~271행 전송 시간에 출처·환경이 없어 3-1절에 따라 8 이하다. 83행 UMS sector 수와 92~94행 lsblk 크기가 맞지 않아 예시 출력을 실제 캡처로 믿기 어렵다. |
| D | 11 | 비교한 글: 인접 `chapter11-network-boot.md`는 USB가 282행 usb0와 429~431행 예고뿐이고, `chapter13-env-bootcmd.md`는 125~127행 try_usb 한 줄뿐이라 역할이 갈린다. 다른 시리즈 `bsp/chapter17-image-packaging.md` 305~333행(양산 flashing 도구 표 + SDP→SDPU→FB uuu 스크립트)이 136~166행과 같은 구조이고, `bsp/chapter18-ota-recovery.md` 355~366행 SoC별 USB recovery 표가 138~144·352~359행과, `modern-recipes/part7-02-uboot-usage.md` 119~131행 fastboot 명령열이 36~53행과 겹친다. 세 글 모두 이 글보다 얕다. |
| E | 7 | 제목 키워드 fastboot(21~75·245~276행)·UMS(77~103·278~311행)·USB host(105~130행)를 모두 다루고 description의 'USB host 부팅 흐름'도 110~130행에서 이행한다. '메커니즘'에 비해 프로토콜 내부(63~75행)가 얇아 감점했다. DFU·SDP·양산(213~243·313~346·382~427행)은 제목에 없는 범위다. |
| F | 4 | 462행 다음 장 예고('환경 변수와 bootcmd')는 seriesOrder 13 `chapter13-env-bootcmd.md`와 맞다. 그러나 468행 'Ch 13 — fastboot 환경 변수'(chapter13에 fastboot 0회), 469행 'Ch 17 — fastboot 위에서의 OTA'(`chapter17-ab-update.md`에 fastboot 0회), 472행 'Security Ch 6 — fastboot의 보안 측면'(`embedded-security/chapter06-ota-update.md`에 fastboot 0회)이 대상과 다르다. 471행 'Ch 30: CI factory pipeline'은 대상이 LAVA 부트로더 CI이고 uuu는 158~161행 flash 단계뿐이라 427행 '양산 factory pipeline'과 다르다. F ≤ 5에 63~67행 프로토콜 절이 끊긴 점을 더 감점했다. |
| G | 2 | 본문 출처는 473행 Android fastboot overview 링크 하나이고 65·70~73행 주장과 연결되지 않는다. U-Boot doc·NXP uuu 문서 링크가 없다. 버전 표기는 예시 출력 속 'version-bootloader: 2024.04'(43행), 'libuuu_1.5.21-0'(331행)과 스크립트의 'uuu_version 1.5.0'(150·369·402행)뿐이다. |

uncertainties:
- 65행 'fastboot는 USB bulk endpoint에서 4byte 헤더 + payload': fastboot 명세의 명령은 헤더 없는 ASCII이고 4바이트는 응답 접두사 길이로 기억한다. 1차 자료로 확인하지 않았다.
- 55행 산문은 alias 값을 '/dev/mmcblk0p1', 58·177행 코드는 'mmc 0:1'로 적었다. U-Boot의 실제 alias 값 형식을 확인하지 않았다.
- 261행은 'FASTBOOT_BUF_ADDR'을 '충분히 크게 잡아야' 한다고 하는데 크기는 255행 BUF_SIZE(0x10000000 = 256MB)의 몫이다. 주소와 크기를 섞은 서술로 보이고, 'FAILtoo large' 조건은 sparse 분할 전송 여부에 따라 다를 수 있다.
- 75행 NXP 'oem flash_uboot'·Qualcomm 'oem unlock', 276행 'oem format은 GPT 재작성, oem partconf는 boot partition 활성화'의 벤더·U-Boot 명령 귀속을 확인하지 않았다.
- 201행 'host enumerate 실패 시 device로 전환하는 fallback을 자주 쓴다', 211행 '런타임에 한 번에 한 모드만'은 근거가 없다.
- 435행 'eMMC는 user area + boot0 + boot1 + RPMB로 4개 LUN': eMMC는 hardware partition이 표준 용어이고 LUN은 UFS 용어로 기억한다.
- 437행 'uuu_run.exe와 함께 제공되는 imx_usb_loader driver'를 uuu 배포물로 확인하지 않았다.
- 141행 TI uniflash의 USB DFU, 144행 Qualcomm qdl·EDL(Sahara + Firehose)을 벤더 문서로 확인하지 않았다.
- 28~32·110~126·330~336행 예시 출력이 실제 보드 캡처인지 알 수 없다(83·92행 불일치로 의심이 커짐).

병합 대상: 점수 구간은 병합 검토이나 판정이 우선 조치다. 병합 대상 없음 — 이 글이 Bootloader Internals의 USB 다운로드·recovery 전담 글이고 겹치는 `bsp/chapter17-image-packaging.md`·`bsp/chapter18-ota-recovery.md`·`modern-recipes/part7-02-uboot-usage.md`는 더 얕다. 우선 83행 UMS count와 92~94행 lsblk 크기를 실제 캡처나 일치하는 값으로 고치고, 다음 조치는 보강이다: (1) 245~276·278~311행 재설명 절과 세 uuu 스크립트를 합친다, (2) 63~75행 프로토콜 절을 Android fastboot 명세·U-Boot doc/android/fastboot.rst와 대조해 다시 쓴다, (3) 468·469·471·472행 관련 항목 라벨을 대상 글에 맞춘다, (4) 기준 U-Boot·uuu 버전과 보드를 적는다.

### `chapter13-env-bootcmd.md` — 53점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), be973200(topic 메타), ac24bb76(제목 변경), 5534938b(시리즈 집필), 400892d7(linter 일괄), e8f4f432(사이트 nav)뿐이고 U-Boot 소스·문서와 구체 주장을 대조한 커밋이 없다. 글 안에서 동시에 참일 수 없는 두 진술은 찾지 못했다(38~39행 offset 0x400000 + size 0x10000과 199행 REDUND 0x410000은 맞물리고, 106행 '\0 두 개'도 103행 마지막 항목의 \0과 문자열 종단으로 성립한다).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 10 | 이 글만의 것은 erase 정렬을 지키지 않으면 saveenv가 이웃 데이터를 지운다는 경고(44·223행), setenv 시점 변수 확장 함정(224행), redundant env 두 위치에 초기값을 굽으라는 실수(226행), `run try_mmc \|\| run try_usb \|\| run try_dhcp` 수작업 fallback 사슬(120~132행)이다. CONFIG_ENV_IS_IN_* 목록(25~32행), 핵심 변수 표(78~90행), printenv/setenv/saveenv 세션(48~72행), env default(211~217행)는 U-Boot 문서 수준의 정리다. 저장 위치 선택 기준이나 env 크기 결정 근거가 없고, 실패 사례는 '~할 수 있습니다'(193행), '부트가 안 될 수 있기 때문'(205행) 수준이다. |
| B | 12 | 저장 위치(21~44행) → 명령(46~74행) → 변수(76~106행) → bootcmd(108~134행) → distro(136~189행) → redundancy(191~205행) → default(207~219행) → 실수(221~227행) → 정리로 흐름이 닫힌다. 환경 블록 형식(CRC·flag)은 203행 'flag byte' 한 단어로 끝난다. 145~168행 코드는 boot.scr만 찾는데 175행 산문은 extlinux/extlinux.conf도 찾는다고 해 단순화본이라는 표시가 없다. 226행 `u-boot.env`를 만드는 방법이 없다. 74·225·226행 불확실이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | printenv/saveenv 세션과 출력(48~72행), `env default -a` 출력(211~215행), mkimage 명령(188행)이 있다. 보드는 가상의 `myboard`(37·52행)이고 U-Boot 버전·SoC가 없다. 0x400000 offset, 64KiB(38~39행), 0x40400000·0x43000000(56~59·97~98행)은 근거·환경 없는 예시 수치라 C ≤ 8. redundancy가 실제로 복구되는지 확인하는 절차(한쪽 카피 손상 후 부팅)와 기대 관찰이 없어 7. |
| D | 8 | 비교한 글: 같은 시리즈 `chapter29-distro-boot.md` 44행 'include/config_distro_bootcmd.h에 정의되어 있고, CONFIG_DISTRO_DEFAULTS=y로 켭니다'가 이 글 138행과 거의 같은 문장이고, ch29 48~66행 boot_targets·bootcmd_mmc0·scan_dev_for_boot_part가 140~176행과 같은 질문에 더 정확히 답한다. 인접 `chapter10-storage-boot.md` 380~392행 boot.cmd + mkimage 블록이 180~189행과 거의 같다. `chapter11-network-boot.md` 279~296행 distroboot·random MAC이 141·225행과 겹친다. `chapter28-flash-layout.md` 114~115행, `chapter17-ab-update.md` 223·415행, `buildroot/chapter13-uboot-integration.md` 216·252행이 redundancy 설정·경고(191~205·226행)를 반복한다. `bsp/chapter06-u-boot-porting.md` 366~370행 이후 보드 헤더 기본 env가 94~104행과 겹친다. 인접 `chapter14-bootflow-bootmeth.md` 17행은 이 글을 인용할 뿐 겹치지 않는다. |
| E | 7 | 제목 '환경 변수와 bootcmd'와 description(5행)의 saveenv·bootcmd·bootargs·distro_bootcmd가 46~74·108~134·136~189행에 대응한다. bootargs는 표 한 줄(81행), setenv 예(66행), 함정(224행)뿐이라 얕다. 과장은 없고 대상 독자를 밝히지 않아 9 이상은 주지 않는다. |
| F | 7 | 241행 다음 장 예고(bootflow/bootmeth)가 seriesOrder 14 `chapter14-bootflow-bootmeth.md`와 맞는다. 관련 항목 245~248행 링크 4개는 대상이 있고 라벨이 맞는다: ch10 378행 'boot.scr — 스크립트로 묶기', ch11 279행 'distroboot와 네트워크 통합', ch14 17행 distro_bootcmd 대체, bsp ch06 368행 'U-Boot 환경 설정'. 178행 '10장에서 본 boot.scr'도 맞다. 17행 '[10~12장]'이 ch10 하나로만 연결되는 사소한 결함이 있고, 템플릿 안내는 가점 대상이 아니며 렌더 확인을 하지 않아 7. |
| G | 2 | 본문 출처는 249행 U-Boot Distro Bootcmd 문서 링크(docs.u-boot.org/latest, 버전 고정 없음) 하나이고 distro 절에만 이어진다. 환경 저장·redundancy·env default 주장(23~44·191~219행)에는 출처가 없다. 138행 include/config_distro_bootcmd.h, 219행 include/env_default.h 경로에 버전·태그가 없다. |

uncertainties:
- 74행 '`setenv var ""`은 변수를 삭제': 삭제는 값 없이 `setenv var` 형태로 알고 있다. 빈 문자열 인자가 같은 동작인지 cmd/nvedit.c로 확인하지 않았다.
- 225행 'ethaddr이 비어 있으면 U-Boot가 random MAC을 만듭니다': CONFIG_NET_RANDOM_ETHADDR이 켜졌을 때만인지 확인하지 않았다. `chapter11-network-boot.md` 296행은 ethaddr이 비면 dhcp/pxe target을 '건너뜁니다'라고 적는다(다른 글과의 차이라 오류 확인에 넣지 않음).
- 226행 '빌드 산출물의 `u-boot.env`': 기본 빌드가 이 파일을 내는지, mkenvimage(-r)로 만들어야 하는지 확인하지 않았다.
- 28행 'CONFIG_ENV_IS_IN_NAND … UBI 볼륨 또는 raw': UBI는 별도 CONFIG_ENV_IS_IN_UBI일 수 있다.
- 37~41행은 CONFIG_ENV_OFFSET 등을 보드 헤더 #define으로, 198~200행은 Kconfig 형식으로 둔다. 현행 U-Boot 기준과 CONFIG_EXTRA_ENV_SETTINGS(94~104행)의 .env 파일 대체 여부를 확인하지 않았다.
- 145~168행 distro_bootcmd 코드는 실제 config_distro_bootcmd.h와 다르다(ch29 58~66행은 fstype·scan_dev_for_boot를 거침). 175행 산문과 코드의 차이는 단순화로 읽을 수 있어 내부 모순으로 확정하지 않았다.
- 193행 '부트 도중 전원이 꺼지면': env가 깨지는 시점은 saveenv의 erase·write 도중이다. 같은 단락 뒷문장은 'erase 중'이라 적어 표현이 엇갈린다.
- 203행 redundant env의 flag byte 동작을 env/common.c로 확인하지 않았다.

병합 대상: 부분 병합 후보는 distro_bootcmd 절(136~189행) → `chapter29-distro-boot.md` 42~66행 이후, boot.cmd/mkimage 블록(180~189행) → `chapter10-storage-boot.md` 380~392행이다. 환경 저장 위치·정렬·redundancy·env default(21~44·191~219행)는 'U-Boot 환경 변수/saveenv'라는 독립 검색 의도가 있어 글 전체는 병합하지 않는다. 다음 조치는 보강: ① distro 절과 boot.scr 블록을 줄이고 ch29·ch10으로 넘긴다, ② U-Boot 버전과 env 1차 출처(doc/usage/environment, env/ 소스)를 본문에 붙인다, ③ 74·225·226·28행 주장을 fact-check한다, ④ redundancy 동작 확인 절차를 더한다.

### `chapter14-bootflow-bootmeth.md` — 55점, 병합 검토

confidence: 중간

factcheck: 미검증. git log는 0a9dd7bc(slug 고정), be973200(topic 메타데이터), ac24bb76(제목 변경·날짜 정규화), 2003b8a6(text 코드블록 정리), 5534938b(시리즈 22장 일괄 작성), 400892d7(linter 일괄), e8f4f432(초안 시드)뿐이고 U-Boot 소스·doc/develop/bootstd와 대조한 커밋이 없다. 로컬 u-boot clone이 없어 평가 중 대조하지 못했다. 글 안에서 동시에 참일 수 없는 두 진술은 찾지 못했다(75행 0x241=577, 54행 '4 bootflows'와 49~52행 4줄, 80행 '다섯 개'와 다섯 명령 모두 맞음).

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 21~38행 bootdev×bootmeth=bootflow 표와 4단계 흐름, 88~96행 bootmeth 표, 173~184행 defconfig는 U-Boot bootstd 문서 구성을 따른 설명이다. 이 글만의 것은 255~261행 '자주 하는 실수' 다섯 항목(260행 efi_mgr만 켜서 후보 0개, 258행 boot_targets 잔존 충돌 등)과 196행 'distro_bootcmd 변수를 모두 삭제해도 된다'는 migration 판단 정도다. 253행 '환경 변수 100줄 → C 함수 세 개'는 비교 근거 없는 수사다. |
| B | 12 | 문제(17행) → 모델(21~38행) → 명령(40~82행) → bootmeth 표(84~110행) → extlinux·EFI 경로(112~167행) → 보드 활성화(169~196행) → 드라이버 작성(198~253행) → 함정(255~261행) → 정리(263~271행)로 흐름은 완성됐다. 243행 `struct mycustom_priv`가 정의되지 않아 예제가 그대로 컴파일되지 않고, 228~230행 boot 함수는 주석만 있고 return 0이다. API 시그니처·도입 버전 정확성이 열려 있어 AP-C-24에 따라 B ≤ 13. |
| C | 7 | 44~78행 bootflow scan/list/info 출력, 100~110행 bootmeth list, 173~184행 defconfig, 188~194행 bootcmd 전후 비교가 있다. 그러나 U-Boot 버전·보드가 없고(49행 mmc@30b40000 주소만 i.MX 8M 계열을 암시), 148행 efi 행 Name 칸이 49행 형식과 다르고 50행 'efi/boot'와 91행 'EFI/boot' 표기도 달라 예시 출력으로 보인다. 합격·실패를 가르는 검증 절차가 없어 C ≤ 8에서 7. |
| D | 11 | 비교한 글: 인접 `chapter13-env-bootcmd.md`(136~189행 distro_bootcmd, 241행이 이 글을 예고)는 대체 대상이라 역할 겹침이 없다. `chapter15-fit-image.md`는 FIT 구조만 다루고 325행에서만 이 글을 가리킨다. `chapter29-distro-boot.md` 191~201행 bootflow scan -l 출력이 44~54행과 같은 주소·형식이고, 206행 'CONFIG_BOOTSTD=y … bootcmd=bootflow scan -b'가 175·193·269행과 같다(ch29는 188행에서 이 글로 넘기는 요약 절). `chapter18-efi-in-uboot.md` 124~136행 efidebug boot dump·bootefi bootmgr이 154~165행과, 347행 'ARM SystemReady' 절이 141·167행과 겹친다. 다른 시리즈 `modern-recipes/part7-01-linux-boot-flow.md` 44행은 bootflow를 한 문장만 언급한다. |
| E | 6 | 제목 'Modern U-Boot bootflow / bootmeth — 새 추상화 레이어 분석'과 description 'distro_bootcmd 스크립트를 대체'가 19행 약속(모델·명령·드라이버·migration)과 맞는다. '분석'을 내걸었지만 내부 동작(uclass 순회 순서, iterator)은 33~36행 4단계 목록과 249~251행 세 줄뿐이다. |
| F | 5 | 275행 다음 장 예고(FIT image)는 seriesOrder 15 `chapter15-fit-image.md`와 맞다. 279행 ch13은 맞고, 280행 ch15 'bootflow가 다루는 이미지 포맷'은 대상 본문에 bootflow 언급이 없어 느슨하다. 281행 ch18 'efi_mgr bootmeth의 자세한 동작'은 대상에 bootmeth·efi_mgr 문자열이 0건이고, 282행 'BSP Ch 6: U-Boot 포팅 — 보드별 bootflow 활성화'는 `bsp/chapter06-u-boot-porting.md`에 bootflow·bootstd·bootmeth가 0건이다. 틀린 라벨이라 F ≤ 5. |
| G | 2 | 1차 출처는 283행 U-Boot Standard Boot 문서 링크(latest) 하나이고 관련 항목 끝에 있어 개별 주장과 연결되지 않는다. 15행 '2023년 즈음 도입', 42행 '2023.07부터 표준 명령'에 출처가 없다. 202~245행 드라이버 API(bootmeth_alloc_file, bootflow_iter_check_blk)의 기준 버전·소스 경로가 없다. |

uncertainties:
- 15행 '2023년 즈음', 42행 '2023.07부터 표준 명령'과 ch29 38·344행 'U-Boot 2022.10+'가 다르다. 릴리스 이력으로 확인하지 않았다(다른 글과의 차이라 오류 확인에 넣지 않음).
- 207행 `if (!bootflow_iter_check_blk(iter)) return -ENOTSUPP;` — upstream에서 이 함수가 성공 시 0을 돌려준다면 조건이 뒤집힌 것이다. 기억에 의존한 의심이라 upstream 소스로 확인이 필요하다.
- 218~219행 `bootmeth_alloc_file(...)` 인자 구성이 upstream 시그니처와 맞는지 확인하지 않았다.
- 257행 `CONFIG_BOOTSTD_FULL`과 183행 `CONFIG_CMD_BOOTFLOW_FULL`이 다른 심볼이다. 자세한 정보 표시가 어느 옵션에 걸리는지 확인하지 않았다.
- 181행 `CONFIG_DISTRO_DEFAULTS=n` 표기는 defconfig 관례('# ... is not set')와 다르고 176행 BOOTSTD_DEFAULTS와의 의존 관계를 확인하지 않았다.
- 98·109행 bootmeths 환경 변수·/bootstd DT 노드 순서 지정, 261행 '중복 항목이면 같은 파티션을 여러 번 스캔'은 출처가 없다.
- 148~149행 efi 행 Name이 파일 경로로 나오는 형식이 실제 U-Boot 출력과 같은지 확인하지 않았다.
- 141·167행 SystemReady IR 요구사항(이후 명칭 변경 여부 포함)을 Arm 문서로 확인하지 않았다.

병합 대상: 병합 대상 없음. `chapter29-distro-boot.md` 186~206행이 같은 출력과 권고를 반복하지만 ch29는 이 글로 넘기는 비교·요약 절이고, bootstd 전용 검색 의도는 이 글이 가진다. 다음 조치는 보강: (1) 15·42행 도입 버전을 소스·릴리스 노트로 확인하고 ch29 38·344행 '2022.10+'과 맞춘다, (2) 202~245행 드라이버 예를 특정 U-Boot 태그의 boot/bootmeth_*.c 시그니처로 대조하고 mycustom_priv 정의·boot 구현을 채운다, (3) 281·282행 관련 항목 라벨을 고친다, (4) 44~78행 출력에 U-Boot 버전·보드를 적는다. ch29 191~201행 중복 출력은 ch29 쪽에서 줄이는 편이 낫다.

### `chapter15-fit-image.md` — 53점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 193행: '`#conf-revA`를 생략하면 `default`가 쓰입니다'
- 278행: 'U-Boot가 현재 보드의 root compatible과 일치하는 configuration을 자동 선택합니다. `bootm`에 `#`을 명시하지 않아도 됩니다'

263행처럼 default = "conf-revA"가 있는 같은 configurations(262~275행)에서 rev B 보드라면 193행으로는 conf-revA, 278행으로는 conf-revB가 선택되어 둘 다 참일 수 없다. git log(5534938b 시리즈 작성, ffe6517b 코드 태그·주석 복구, ac24bb76 제목 변경, be973200 topic 메타, 0a9dd7bc slug 고정)에 1차 자료 대조 커밋이 없어 모순이 없더라도 검증됨은 아니다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | images/configurations 구조·mkimage -f·bootm·hash/signature 노드(21~34·126·133·219~243행)는 U-Boot FIT 문서와 입문 자료에 공통이다. 이 글만의 것은 같은 kernel에 rev A/B DTB를 묶은 ITS 예제(40~124행), configuration에 bootargs를 넣어 OTA 때 환경 변수 의존을 끊는 관점(197~213행), 자주 하는 실수 5개(303~307행)다. 실수 목록에 출처·재현 근거가 없고 분리 이미지 대비 선택 기준이나 실패 사례 분석이 없다. |
| B | 11 | 왜 FIT인가(21~34행) → ITS(36~126행) → 빌드·fdtdump(128~161행) → bootm(163~195행) → bootargs(197~213행) → 서명(215~247행) → 여러 보드(249~278행) → overlay(280~299행) → 실수(301~307행) → 정리(309~317행)로 흐름은 끝까지 간다. 그러나 193·278행 모순이 있고, 서명 예제(223~230행)는 ramdisk가 없는 conf-revA의 sign-images에 "ramdisk"를 넣었다. overlay 절(284~297행)은 이미지 노드를 /* ... */로 비웠다. B ≤ 13에 모순으로 1점 더 내렸다. |
| C | 7 | mkimage 명령(133·238행), fdtdump 출력(139~158행), bootm 콘솔 로그(168~190행)가 있다. hash 값은 `0xabcd1234 ...`(154행)·`abcd1234...`(181행)인 예시이고 U-Boot·mkimage 버전과 보드가 없어 3-1절 C ≤ 8(142행 totalsize 0x12ab450, 177행 10995712 Bytes. 10.5 MiB 환산은 맞다). 서명 거부를 확인하는 절차가 없고, 254행 주석 '보드 자동 감지' 아래 255행은 setenv로 값을 손으로 넣는다. |
| D | 10 | 비교한 글: 다음 글 `chapter16-verified-boot.md`의 ITS·mkimage 절(약 46~131행)이 이 글 서명 절 219~243행(signature-1·key-name-hint·sign-images, mkimage -k/-K/-r)과 겹치고, ch16 multi-config 서명 절(약 304~346행)이 249~257행과 같은 rev A/B 예·같은 setenv/bootm 명령을 쓴다. ch16 'FIT 구조 깊이' 절(약 203~224행)은 126·313행 설명을 다시 한다. `chapter27-chain-of-trust.md` 174~210행도 FIT 서명을 요약한다. 이전 글 `chapter14-bootflow-bootmeth.md`는 FIT를 96행 표 한 칸과 275·280행 예고에서만 다룬다. buildroot 쪽 글은 FIT 생성 맥락만 공유한다. |
| E | 7 | 제목 'FIT image 구조 분석 — multi-image·hash·configuration 추적'과 description(5행)이 본문 범위와 맞다. multi-image(40~124행), hash(57~59·152~157·180~182행), configuration(100~122·249~278행)을 모두 다룬다. '분석·추적'은 예시 출력(139~190행)으로 일부만 이행하고 configuration 선택 규칙이 193·278행에서 엇갈린다. |
| F | 5 | 다음 장 예고(319~321행)와 247·326행 링크는 seriesOrder 16 `chapter16-verified-boot.md`와 맞는다. 327행 ch17(53~55행 boot_a/boot_b FIT)과 328행 security ch02는 라벨과 맞다. 325행 ch14 'FIT를 적재하는 새 모델'은 대상이 표 한 칸이라 약하고, 329행 'Security Ch 6: OTA Update — FIT와 OTA 결합'은 `embedded-security/chapter06-ota-update.md`에 FIT·itb가 나오지 않는다. F ≤ 5. |
| G | 2 | 본문 주장에 붙은 1차 출처가 없다. 330행 U-Boot FIT 문서 링크(en/latest) 하나뿐이다. CONFIG_FIT_SIGNATURE(245행)·CONFIG_FIT_SIGNATURE_STRICT(305행)·mkimage 옵션(241~243행)에 U-Boot 버전과 소스 위치가 없다. |

uncertainties:
- 245행 'CONFIG_FIT_SIGNATURE=y를 켜면 bootm이 서명 없는 FIT를 거부'와 305행 'CONFIG_FIT_SIGNATURE_STRICT=y에서 서명 없는 default configuration 거부'가 같은 동작을 서로 다른 옵션에 돌린다. `chapter27-chain-of-trust.md` 174~210행은 required = "conf"가 없으면 서명 안 된 FIT도 허용된다고 써서 245행과 다르다. 글 사이 모순이라 오류 확인으로 올리지 않았다. boot/image-fit-sig.c로 확인이 필요하다.
- 245행 '키 자체가 변조되어도 부트가 막힙니다'의 의미와 근거가 불분명하다.
- 226~229행 ramdisk 속성이 없는 conf-revA의 sign-images에 "ramdisk"가 있을 때 mkimage가 오류를 내는지 확인하지 않았다.
- 268·278행 compatible 기반 자동 선택이 default 속성이 있을 때도 동작하는지, CONFIG_FIT_BEST_MATCH가 필요한지 확인하지 않았다.
- 304행 '.cpio.gz에 compression = "none"이면 init 실패'는 커널이 gzip initramfs를 직접 풀 수 있다는 점과 맞지 않을 수 있다(기억에 기댄 의심).
- 303·306행 load 주소 충돌·옛 mkimage 주장은 출처가 없다.
- 139~190행 출력은 hash 값이 abcd1234인 예시다. 구성한 출력이라는 표시가 본문에 없다.

병합 대상: 점수 구간은 병합 검토이나 판정이 우선 조치라 병합 판단은 193·278행 모순을 고친 뒤 다시 본다. 서명 절(215~247행)은 ch16과 반복이 커서 verified boot 정본인 ch16 링크로 줄이는 방향이 유력하다.

### `chapter16-verified-boot.md` — 59점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 세 건이다.
- 146행 'CONFIG_FIT_SIGNATURE=y가 들어가는 순간 U-Boot은 서명되지 않은 FIT을 거부'·453행 'CONFIG_FIT_SIGNATURE=y만 켜면 U-Boot이 부팅 시 자동으로 검증' vs 256행 '-r 플래그가 없으면 required가 빠져 서명이 있어도 강제하지 않는 무용지물'·429행 'U-Boot은 required 키가 없으면 검증을 강제하지 않습니다'.
- 186행 'fit_check_format()이 이 인덱스를 읽어 OTP 값과 비교' vs 262행 'fit_check_format() — magic·구조 검증'·367행 'board hook이 OTP 또는 RPMB의 counter를 읽어 비교'(369~381행 board_fit_image_post_process 코드).
- 388행 산문 'mkimage가 -e로 image별 암호화를 지원' vs 407행 암호화 명령 '-E -k ./keys ...'(-e 없음).

git log(0a9dd7bc, be973200, fa55144d, ac24bb76, 3a5602d3 등)는 URL 고정·topic 메타·링크 수리·제목 변경뿐이고 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 14 | 고유한 해석은 107행 configuration 단위 서명이 mix-and-match를 막는 이유, 216~223행 hash(조각)와 signature(묶음)의 두 단계 검증, 290행 'Verifying Hash Integrity'가 두 번 나오는 이유를 258~288행 단계와 대응시킨 부분, 384행 OTP 갱신을 bootcount N회 성공 뒤로 미루는 이유, 414~421행 서명 키·KEK·image key 분리 표다. 31~144행 키 생성·ITS·mkimage·defconfig는 U-Boot signature 문서 흐름 그대로이고, 29행 'SoC별로 다릅니다'로 ROM 단계를 넘긴다. |
| B | 13 | 키 생성(31~44행) → ITS(46~107행) → 서명(109~129행) → config(131~156행) → bootm(158~171행) → anti-rollback·dm-verity → 심화 절 → 함정(423~445행) → 정리(447~455행) 흐름은 있다. 그러나 anti-rollback(173~186·348~384행), FIT 구조(46~107·203~223행), mkimage 서명(109~129·225~256행)이 두 번씩 나오고, 옵션 조합(116~118행 -K u-boot.dtb·-G vs 234~238행 -K u-boot-dtb.dtb·-G 없음)도 다르다. 세 모순으로 AP-C-24(B ≤ 13). |
| C | 8 | openssl·mkimage 명령(35~42·113~120·229~238행), defconfig(135~144행), 기대 콘솔 로그(148~154·292~302행), 증상·원인·첫 점검 표(437~445행)가 있다. 171행 거부 확인 절차는 있지만 기대 관찰이 156행 '- Bad'와 171행 'error!'로 어긋난다. 196~198행 dm-verity 표의 1234567·152340과 138행 MAX_SIZE는 출처·환경이 없고, 152340 블록 × 8 sector = 1218720으로 1234567과 맞지 않는다. C ≤ 8. |
| D | 9 | 비교한 글: 인접 `chapter15-fit-image.md` 215~245행 서명 절이 같은 signature-1 노드(228행)·같은 mkimage -k -K -r 명령(238행)·'서명 없는 FIT 거부'(245행)로 97~101·113~120·146행과 겹친다. `chapter27-chain-of-trust.md` 210행이 256행과 같은 내용이다. anti-rollback은 ch27 241행, `chapter23-bootrom-efuse-otp.md` 188행, `embedded-security/chapter02-secure-boot.md` 247~260행, `chapter17-ab-update.md` 389~402행이 173~186·348~384행과 겹친다. `modern-recipes/part3-12-bootloader-chain.md` 81~104행도 같은 signature-1 노드 예다. 이 글만의 부분(258~302행 bootm 단계, 304~346행 multi-config, 386~421행 암호화·키 분리)은 있지만 글 안 반복까지 더해 9. |
| E | 8 | 제목 'RSA 서명과 public key 임베딩 흐름'과 description은 109~129·225~256행이 직접 이행한다. U-Boot 버전·대상 SoC를 밝히지 않았고 본문이 dm-verity(188~201행)·암호화(386~421행)까지 넓어진다. |
| F | 5 | 459행 다음 장 예고(A/B 슬롯·bootcount·altbootcmd)는 seriesOrder 17 `chapter17-ab-update.md`(17행)와 맞지만 링크가 없다. 466행 'Ch 25: TF-A로 BL 단계별 서명'의 대상 `chapter25-tfa-optee.md`에는 BL 서명 절이 없고 서명 언급은 161~164행 OP-TEE TA 서명뿐이다. 463행 'FIT 이미지 — 한 묶음으로 부팅하기'도 대상 현재 제목과 다르다. F ≤ 5. 262~288행은 굵은 글씨 단계와 '├' 불릿이 섞여 읽기 흐름이 끊긴다. |
| G | 2 | 본문 1차 출처는 469행 U-Boot signature 문서 링크 하나이고 라벨(doc/uImage.FIT/signature.txt)과 URL(usage/fit/signature.html)이 다르며 버전이 없다. 260행 boot/image-fit.c·image-fit-sig.c 경로도 버전 없이 주장과 줄 단위로 묶이지 않는다. 59행 'Linux 6.6'은 ITS 예시 문자열이다. |

uncertainties:
- 268행 configuration 서명 검증 함수를 fit_image_verify_required_sigs()로 적었다. conf 단위는 fit_config_verify_required_sigs()일 수 있다(기억). upstream boot/image-fit-sig.c로 확인하지 않았다.
- 181·360행 rollback-index 속성, 372행 fit_get_rollback_index(), 370행 board_fit_image_post_process(void **, size_t *)가 FIT 검증 경로의 rollback 비교에 쓰이는지 확인하지 않았다.
- 388·407행 mkimage 암호화에 실제로 필요한 옵션, 396행 algo "aes256-gcm"을 U-Boot FIT cipher가 지원하는지 확인하지 않았다(-e/-E 불일치 자체는 글 안 모순으로 올렸다).
- 118·127행 '-G keys/dev.key'의 의미와 124행 '-k keys가 dev.crt를 찾는다'는 설명을 mkimage 문서로 확인하지 않았다.
- 196~198행 dm-mod.create 매핑 길이 1234567 sector와 data block 152340개(4096 B) = 1218720 sector가 맞지 않는다. 두 값이 같아야 하는지는 dm-verity 문서로 확인하지 않아 C 근거로만 썼다.
- 201행 '<root-hash>가 서명된 DT에 박혀 있으면 cmdline도 안전'이 bootargs가 환경 변수에서 올 때도 성립하는지 확인하지 않았다.
- 140행 CONFIG_RSA_VERIFY_WITH_PKEY=y가 control DT 키 방식에 필요한지, 431행 FIT_SIGNATURE_MAX_SIZE가 작으면 일부만 검증되고 통과하는지 확인하지 않았다.
- 437~445행 오류 문자열과 156행 '- Bad' vs 171행 'error!' 중 서명 없는 FIT에서 실제로 무엇이 찍히는지 확인하지 않았다.
- 241행 'cat u-boot-nodtb.bin u-boot-dtb.dtb > u-boot.bin'과 428행 'u-boot-dtb.bin' 표기가 OF_SEPARATE 빌드 산출물 이름과 맞는지 확인하지 않았다.

병합 대상: 점수 구간은 병합 검토이나 판정이 우선 조치다. 병합 대상 없음 — ch15 215~245행 서명 절과 겹치지만 이 글이 시리즈의 verified boot 정본 장이라 ch15 쪽을 이 글 링크로 줄이는 편이 맞다. 다음 조치는 보강: 146·453행과 256·429행의 강제 조건을 U-Boot signature 문서로 정하고, 186행 rollback 비교 주체와 388/407행 -e/-E를 고친 뒤, 173~186행·203~256행의 반복 절을 앞 절과 합친다.

### `chapter17-ab-update.md` — 60점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 88행 '`bootcount`가 `bootlimit`을 넘으면 U-Boot이 `bootcmd` 대신 `altbootcmd`를 실행', 227행 '`bootcount > bootlimit`일 때 *대신* 실행', 345행 트리거 'bootcount > bootlimit'
- 179행(174행 `bootlimit=3` 설정 흐름): '`bootcount=2` → 또 실패 → 3 → `altbootcmd`'

'넘으면(>)' 규칙이면 bootlimit=3일 때 bootcount=3에서는 altbootcmd가 돌지 않으므로 두 진술은 동시에 참일 수 없다. 234·272행 스크립트도 `-ge`(이상)로 비교해 227행 `>`와 어긋난다. git log(0a9dd7bc, be973200, fa55144d, ac24bb76, ffe6517b, a671b202, b6dedf23, 2003b8a6, 5534938b, 400892d7, 7824b986)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 15 | 글 고유 내용: 182행 토글 권한을 agent가 아니라 U-Boot에 둔다는 설계 판단, 282~308행 installed→trying→good/bad 상태머신과 선택 규칙, 314~323행 shared/per-slot 배치 표, 327~337행 schema `min_version` 헤더, 343~350행 실패 6유형별 감지 위치·트리거 표, 400~402행 anti-rollback 증가를 mark-good 시점에 두는 패턴. 반면 77~109행 bootcount/bootlimit/altbootcmd는 U-Boot 문서 수준이고, 146행 '시스템마다 다릅니다', 198행 '따라가는 편이 안전합니다', 382행 '일부 U-Boot 보드 코드는'처럼 완곡 표현이 남는다. |
| B | 13 | 왜 A/B(19~42행) → 레이아웃(44~75행) → bootcount/altbootcmd(77~109행) → 백엔드(111~142·200~223행) → 성공 표시(144~166행) → 전체 흐름(168~182행) → Android 비교 → 상태머신 → shared data → 실패 유형 → secure boot → 실수 → 정리로 이어진다. 그러나 179행과 88·227·345행의 트리거 조건이 모순이고, 234·272행 스크립트의 `BOOT_COUNT`/`BOOT_LIMIT`은 73~74·84행 소문자 `bootcount`/`bootlimit`과 달라 83행 altbootcmd, 229~251행 boot.scr, 269~277행 bootcmd 세 fallback 경로가 정리되지 않는다. B ≤ 13. |
| C | 7 | U-Boot env 명령(81~107행), defconfig(134~140·215~221행), systemd unit(150~164·363~378행), watchdog 설정(354~359행)이 있다. 보드·U-Boot 버전·저장 매체가 없고 fallback 발동을 확인하는 절차(전원 차단·panic 주입 후 볼 printenv 값)와 기대 출력이 없다. 53~59행 10 MB/512 MB, 357행 30s는 출처·환경이 없어 C ≤ 8. 139행 `CONFIG_SYS_I2C_RTC_ADDR=0x68`과 218행 `CONFIG_SYS_BOOTCOUNT_ADDR=0x68`이 같은 I2C 백엔드에 다른 옵션을 쓴다. |
| D | 10 | 비교한 글: 같은 시리즈 `chapter16-verified-boot.md`(서명 검증, 역할 구별), `chapter18-efi-in-uboot.md`(무관), `chapter20-rauc-swupdate.md` 133~146행(`BOOT_SLOT=B`·`bootcount=0`·`upgrade_available=1`, mark-good 리셋)이 172~180·257~265행과 겹친다. 다른 시리즈 `bsp/chapter18-ota-recovery.md` 33~95행(bootcount=0·bootlimit=3·altbootcmd=run switch_slot, bootcount-reset unit)이 69~109·144~166행과 거의 같고, `buildroot/chapter16-ota.md` 229~258행이 227~280행과, `modern-recipes/part7-02-uboot-usage.md` 111~117행 altbootcmd 예, `embedded-security/chapter06-ota-update.md` 261~268행 upgrade_available 발췌가 겹친다. 상태머신·shared data·실패 유형·백엔드 표로 역할은 구별된다. |
| E | 8 | 제목 '임베디드 A/B 부팅 이중화 — OTA 안전성을 위한 부트 슬롯 설계'와 description이 17행 한 줄 요약, 168~182행 흐름, 418~426행 정리와 같은 질문을 향한다. 제목은 '임베디드' 일반인데 fallback 구현은 U-Boot 전용이고 MCU 측(MCUboot 등) A/B는 다루지 않아 E ≤ 8. |
| F | 5 | 430행 다음 장 예고(EFI)는 seriesOrder 18 `chapter18-efi-in-uboot.md`와 맞다. 438행 'Ch 27: Signed A/B — secure boot과 슬롯별 anti-rollback'의 대상 `chapter27-chain-of-trust.md`는 전체 체인의 anti-rollback만 다루고(35·241·301행) 슬롯별 서명·counter가 없다. 434행 Ch 13 라벨('env partition과 fw_setenv')도 실제 제목과 다르고, 441행 'doc/README.bootcount' 라벨은 environment.html#bootcount로 간다. F ≤ 5. |
| G | 2 | 소스 경로 `drivers/bootcount/bootcount_env.c`(116행), AOSP `bootloader_message.h`(189행), U-Boot 문서 링크 1개(441행, 라벨 불일치)가 있으나 U-Boot·AOSP·RAUC 버전·태그가 없고 백엔드 표(204~211행)·실패 유형 표(343~350행)에 출처가 연결되지 않는다. |

uncertainties:
- 234·272행 스크립트가 검사하는 `BOOT_COUNT`/`BOOT_LIMIT`은 글 어디에서도 설정되지 않는다(73~74·84행은 소문자). 245행은 `BOOT_COUNT`만 0으로 돌려 실제 `bootcount`는 남을 수 있다. hush의 미정의 변수 비교 동작은 확인하지 않았다.
- 253행은 boot.scr를 'altbootcmd로 등록'한다고 하지만 스크립트가 다시 카운트를 검사하고, 83행 altbootcmd와 269~277행 bootcmd까지 세 fallback 경로가 공존해 권장 구성이 불명확하다.
- 209행 RTC SRAM 백엔드 `CONFIG_BOOTCOUNT_RAM`, 211행 `CONFIG_BOOTCOUNT_PMIC`, 218~220행 `CONFIG_SYS_BOOTCOUNT_ADDR`·`CONFIG_BOOTCOUNT_BOOTLIMIT`(139행은 `CONFIG_SYS_I2C_RTC_ADDR`)의 Kconfig 이름을 소스로 확인하지 않았다.
- 190~195행 `slot_metadata`를 uint8_t 네 필드로 적었는데 AOSP 원본이 비트필드인지 확인하지 않았다(기억 기반). 198·425행 '세 필드'와 네 필드의 수 차이는 산문 수 실수라 오류 확인 대상이 아니다.
- 373·380행 `rauc-mark-good` 실행 파일은 같은 시리즈 chapter20 141행의 `rauc status mark-good booted`와 다르다. 280행 RAUC `system.conf` `[handler]` 설명도 RAUC 문서로 확인하지 않았다.
- 389행 'NXP HABv4의 SRK fuse'를 anti-rollback counter 예로 든 것이 맞는지(SRK는 키 해시 fuse) 확인하지 않았다.
- 414행 '일부 백엔드는 단일 바이트만 쓴다', 208행 AT91 GPBR '전원 끊김에 약함'은 출처가 없다.

### `chapter18-efi-in-uboot.md` — 52점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 210행: '그 위는 FAT12/16/32 중 하나이고, 관례상 FAT32를 씁니다'
- 414행: 'FAT32(또는 FAT16)만 허용됩니다'

ESP 허용 파일시스템에 대한 두 구체 진술이 FAT12 허용 여부에서 둘 다 참일 수 없다. 보조 근거로 49행 표는 Secure Boot를 '부분 구현', 245행 표는 'Secure Boot 검증 (PK/KEK/db/dbx) | 구현'으로 적었다. git log(7824b986, 5534938b, 2003b8a6, b6dedf23, 3a5602d3, ffe6517b, ac24bb76, fa55144d, be973200, 0a9dd7bc)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 구현 범위 표(41~49·234~245행), defconfig(57~69행), bootmgr·efidebug(128~137행), 변수 저장(150~162행), EBBR·SystemReady(185~197·347~369행)는 U-Boot doc/uefi와 EBBR 정리 수준이다. 이 글만의 판단은 183행(제1 경로는 FIT 서명, distro ISO용 부가 경로는 EFI Secure Boot)과 309행(env 매핑보다 file backend가 안전한 이유) 정도다. 369행 '보드마다 다릅니다. defconfig를 확인하는 습관이 필요합니다'는 완곡한 일반론이다. 같은 내용이 두 번 나오는 절(37~49/230~247행, 150~162/292~311행)이 있다. |
| B | 12 | 구현 범위, defconfig, bootefi, bootmgr, 변수 저장, Secure Boot, EBBR, GRUB/systemd-boot, efivars, EFI stub, SystemReady, distro 사례, 함정, 정리 순서로 흐름은 갖췄다. 그러나 210·414행 모순과 49·245행 불일치가 있고, 71행(옵션이 없으면 initramfs를 cmdline으로 따로 전달)과 410행(커널이 initramfs를 찾지 못함)도 결과 설명이 맞지 않는다. B ≤ 13에 중복 절로 12. |
| C | 7 | U-Boot 명령(78~89·98~120·129~136·176~181행), efibootmgr·efivars 출력(143~147·314~317행), objdump 출력(325~337행)이 있다. U-Boot·커널 버전과 보드가 없다. 101~104행 파일 크기(12345678, 8765432, 1234567, 456789)는 예시 값으로 보인다. 같은 `efidebug boot dump` 출력도 132~135행(`0000:`, `A--`)과 298~306행(`Boot0000:`, `A-N`)의 형식이 다르다. C ≤ 8, 관찰 절차가 없어 7. |
| D | 10 | 비교한 글: 인접 `chapter17-ab-update.md`(겹침 없음), `chapter19-kernel-handoff.md` 97~106행 bootm/booti/bootefi 표(bootefi 한 줄이라 320~345행과 조금만 겹침). 같은 시리즈 `chapter14-bootflow-bootmeth.md` 139~167행(SystemReady IR, efidebug boot dump, bootefi bootmgr)이 124~137행과 같은 예제이고, `chapter29-distro-boot.md` 248~263행도 같은 블록을 반복한다. `chapter37-secureboot-cert-rollover.md` 29~34행 PK·KEK·db·dbx 표가 166~171행과 겹친다. 다른 시리즈에서 bootefi·EBBR·efidebug를 언급하는 글은 `modern-recipes/part7-02-uboot-usage.md`뿐이고 두 번 언급에 그친다. `embedded-security/chapter02-secure-boot.md`에는 UEFI PK/KEK 계층이 없다. |
| E | 6 | description(5행)의 bootefi(73~122행), EBBR(185~197행), Linux EFI stub(320~345행)은 모두 다룬다. 제목(2행)은 'EFI loader 동작 원리'를 약속하지만 본문은 명령 사용법과 기능 표가 중심이고, LoadImage 안 Secure Boot 검증은 173행 한 문장뿐이다. |
| F | 4 | 431행 다음 장 예고는 seriesOrder 19 `chapter19-kernel-handoff.md`(19·72·186·207행 절)와 맞는다. 그러나 437행 'TF-A BL31 위에서 U-Boot EFI가 도는 구성'의 대상 `chapter25-tfa-optee.md`에는 U-Boot EFI·bootefi 내용이 없고(179~190행 BL33 절은 진입 EL만), 438행 'Distro Boot vs EFI Boot — 비교와 선택 기준'은 실제 제목과 다르며, 436행 'EFI stub이 ExitBootServices 뒤 커널에 인계하는 ABI'의 대상 ch19에는 ExitBootServices·EFI stub이 0건이다. F ≤ 5. 23행 SVG 뒤 25~33행에 같은 흐름을 ASCII로 다시 그렸고 같은 주제 절이 두 번씩 나와 4. |
| G | 2 | 440~442행 U-Boot doc/uefi, EBBR 명세, ARM SystemReady 링크가 본문 주장과 연결되지 않고 U-Boot·EBBR·UEFI 명세 판이 없다. 본문 버전 표기는 71·410·427행 'Linux 5.8', 386행 GRUB 2.06, 399행 Fedora 39 출력뿐이고 출처가 없다. |

uncertainties:
- 92·111·408행 `bootefi setup` 하위 명령이 현재 U-Boot에 있는지, 'EFI System Table 초기화' 설명이 맞는지 doc/uefi로 확인하지 않았다.
- 71·410·427행 'Linux 5.8 이후 EFI stub은 initramfs를 LoadFile2로 로드'의 도입 버전과 아키텍처별 차이를 확인하지 않았다.
- 59·62·63행 CONFIG_CMD_BOOTEFI_BOOTMGR, CONFIG_EFI_VARIABLE_FILE_STORE, CONFIG_EFI_VARIABLES_PRESEED가 실제로 있는지 확인하지 않았다.
- 176~181행 `efidebug pk set`·`efidebug secure-boot` 명령 형태를 확인하지 않았다.
- 322행 'PE/COFF 헤더를 zImage 앞에'가 arm64(Image)에 맞는지, 343행 'GRUB이 linuxefi로 호출'이 arm64 GRUB에도 해당하는지 확인하지 않았다.
- 349~356행 SystemReady 네 등급(SR/ES/IR/LS)이 현재 구성과 같은지, 366행 IR이 BSA ACS 통과를 요구하는지 확인하지 않았다.
- 210·414행 중 UEFI 명세상 ESP 허용 파일시스템에 맞는 쪽은 1차 자료로 정해야 한다.
- 101~104행 `ls mmc 0:1` 출력이 하위 디렉터리 경로를 루트 목록에 보여 주는 형식인지, 실제 실행 결과인지 확인하지 않았다.
- 412행 'PK·KEK 계층을 건너뛰면 검증이 도중에 풀려 거짓 양성이 납니다'는 동작 근거가 없다.
- 152·309행 ubootefi.var 위치(ESP 루트)와 env 백엔드의 `efi_<name>` 저장 형식을 확인하지 않았다.
- 251행 '세 단계로 나뉩니다'인데 253~267행 그림은 다섯 상자다. 산문 개수 표기라 오류 확인에는 넣지 않았다.

병합 대상: 점수 구간은 병합 검토이나 판정이 우선 조치다. 부분 병합 후보는 `chapter14-bootflow-bootmeth.md` 139~167행(EFI bootmgr 절)과 `chapter29-distro-boot.md` 248~265행이지만, 이 글은 EFI loader를 전담하는 유일한 장이고 U-Boot bootefi·EBBR이라는 독립 검색 의도가 있어 다음 조치는 보강이다. 210·414행 모순을 UEFI 명세 ESP 절로 정리하고, 글 안 중복 절(37~49/230~247행, 150~162/292~311행, 185~197/347~369행)을 합치고, Ch14·Ch29의 efidebug 예제는 이 글로 링크하고, 436~438행 관련 항목 라벨을 대상에 맞춘다.

### `chapter19-kernel-handoff.md` — 50점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순이다.
- 45행(요구사항 목록): 'kernel image와 동일한 512MB 영역 안 또는 그 이하'
- 130행: 'DTB는 커널 이미지와 같은 512MB 영역 또는 그 위쪽에 둡니다'

같은 DTB 배치 규칙에서 영역 밖 허용 방향이 아래쪽과 위쪽으로 정반대다. 46행이 크기(< 2MB)를 따로 적으므로 45행 '이하'는 주소 방향으로 읽힌다. 259행 정리는 '같은 512MB 영역에 두고'로만 적는다. git log --follow(5534938b 작성, 49f2a443, ac24bb76 제목 변경, be973200 topic, 0a9dd7bc slug 고정)에 1차 자료 대조 기록이 없다. 어느 쪽이 맞는지(현행 booting.rst에 512MB 제한 자체가 있는지)는 1차 자료로 정해야 한다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 12 | 19~46행 AArch64 요구사항, 76~93행 AArch32, 190~203행 RISC-V, 211~229행 x86 목록은 커널 문서를 옮긴 수준이다. 이 글만의 부분은 101~106행 bootm/booti/bootz/bootefi 비교 표, 235~241행 '점프 후 첫 출력이 안 나올 때' 원인 셋, 247~252행 실수 목록이다. 130·141행 '명시해 두는 편이 안전합니다'는 조건 대신 완곡 표현이다. |
| B | 12 | ABI 요구사항(19~46행) → U-Boot 처리(50~70행) → 이미지 포맷(97~126행) → DTB·initramfs·cmdline(128~184행) → RISC-V·x86(186~231행) → 침묵 진단(233~241행) → 실수·정리(243~262행)로 흐름은 완성됐다. x86 절(207~231행)은 레지스터 나열뿐이고 부트로더가 어떻게 채우는지가 없다. 45/130/259행 모순과 31·64·111·215행 불확실이 열려 있어 B ≤ 13. |
| C | 6 | U-Boot env와 명령(133~139·158·168~171행), cmdline 디버깅 표(176~184행)는 있지만 보드·U-Boot·커널 버전이 없고 booti 실행 뒤 출력이나 침묵 시 관찰 결과가 없다. 241행 '90% 이상의 케이스', 251행 '1024바이트 안에서'는 출처·환경 없는 수치라 C ≤ 8. 50~67행은 '요지'로 줄인 조각이고 64행 인자 순서가 70행 설명과 맞는지 확인할 수 없다. |
| D | 10 | 비교한 글: 인접 `chapter18-efi-in-uboot.md`(106행 bootefi 한 줄만 ch18 73~92행과 겹침)·`chapter20-rauc-swupdate.md`(겹침 없음), 같은 시리즈 `chapter01-boot-problem.md` 49~54행(x0=DTB, x1~x3=0)·174행(MMU off, D-cache off)이 27~30·256행을 요약한다. `chapter06-device-tree.md` 288~322행(chosen의 bootargs·initrd-start/end, fdt_chosen)과 426~433행(booti 인자 순서)이 145~165행과 같다. 다른 시리즈 `modern-recipes/part7-01-linux-boot-flow.md` 37·58~61행은 같은 내용을 U-Boot v2025.04·Linux v6.12 줄 링크로 다뤄 근거가 더 강하다. 여러 아키텍처 ABI를 모은 역할은 이 글뿐이다. |
| E | 2 | 제목(2행)은 'ARM/ARM64 커널 진입 규약'으로 아키텍처를 한정하는데 description(5행)은 'ARM64·RISC-V·x86 boot ABI'를 약속하고 본문은 RISC-V(186~205행)·x86(207~231행)까지 다룬다. 루브릭 E 주석 '제목의 범위(특정 아키텍처)와 본문 범위가 다르면 2점 이하'를 적용했다. 제목의 '추적'도 요구사항 목록과 '요지' 코드라 이행하지 않는다. |
| F | 6 | 266행 다음 장 예고(RAUC·SWUpdate)는 seriesOrder 20 `chapter20-rauc-swupdate.md`와 맞다. 270행 Ch 18, 271행 Ch 20 라벨은 대상 제목과 맞는다. 272행은 라벨이 booting.rst인데 URL은 옛 booting.txt다(같은 문서의 옛 판으로 보고 틀린 링크로 치지 않음). 전제 지식(ch06 DTB, ch15 FIT)으로 가는 안내가 없고 렌더 확인을 하지 않아 7 이상은 주지 않았다. |
| G | 2 | 21·188행에 booting.rst·riscv boot.rst 이름, 272~273행에 링크가 있지만 커널·U-Boot 버전이 없다. 51행 'arch/arm/lib/bootm.c (요지)', 111행 'include/linux/arm-image.h (요지)'는 줄 링크 없이 경로만 있다. x86 절(207~229행)은 출처가 없다. |

uncertainties:
- 31행 'PC = Image.start + 0x80': 이미지 첫 명령어로 점프한다는 현행 문서 기억과 다를 수 있다. 1차 자료로 확인하지 않았다.
- 64행 armv8_switch_to_el1(0, (u64)fdt, 0, 0, ...)은 fdt를 둘째 인자로 넘기는데 70행은 x0에 fdt를 박는다고 하고 239행은 x1에 DTB를 넣으면 안 된다고 한다. 인자가 x0~x5에 그대로 들어가는지는 함수 구현을 봐야 해 오류 확인에 넣지 않았다.
- 46행 DTB 크기 < 2MB, 39행 D-cache OFF 요구를 현행 booting.rst로 확인하지 않았다.
- 70행 'EL2에서 EL1으로 떨어뜨린다' vs `modern-recipes/part7-01-linux-boot-flow.md` 61행 'EL을 바꾸지 않고 그대로 점프, EL2 권장'(transition.S 링크). 다른 글과의 모순이라 1차 자료로 정해야 한다.
- 111행 'include/linux/arm-image.h' 경로 실존 여부(arm64는 arch/arm64/include/asm/image.h로 기억)를 확인하지 않았다.
- 215행 'CONFIG_KERNEL_NORELOC', 229행 x86 64-bit 'identity mapped first 4GB'를 확인하지 않았다.
- 251행 bootargs 1024바이트 한도, 241행 '90% 이상'은 출처가 없다.
- 104행 표는 booti가 zImage(ARM32)도 받는다고 하고 258행은 booti를 raw ARM64 Image로만 적는다.
- 171행 'bootm ${kernel_addr_r}'는 158행에서 raw Image를 booti로 부른 같은 주소인데 249행은 bootm에 raw Image를 넘기면 실패한다고 한다. 예의 이미지 형식이 다른지 원문만으로 판단할 수 없다.
- 21·272행 Documentation/arm64/booting.rst 경로는 현행 커널에서 Documentation/arch/arm64/로 옮겨졌다고 기억한다(part7-01 61행 링크 경로). 확인하지 않았다.

병합 대상: 점수 구간은 병합 검토이나 판정이 우선 조치다. 병합 대상 없음 — 여러 아키텍처의 커널 진입 규약을 모은 글은 이 글뿐이라 독립 검색 의도가 있다. 다음 조치는 보강: 45·130·259행 DTB 배치 규칙을 현행 booting.rst(판 명시)로 하나로 고치고, 145~165행 chosen·initrd는 `chapter06-device-tree.md` 288~322행으로, 27~30행 x0~x3는 `modern-recipes/part7-01-linux-boot-flow.md` 58~61행으로 링크하고 줄인다. 제목은 RISC-V·x86 범위와 맞추거나 본문을 ARM으로 좁힌다.

### `chapter20-rauc-swupdate.md` — 49점, 우선 조치

confidence: 중간

factcheck: 오류 확인. 원문 내부 모순 두 건이다.
- 86행 'RAUC는 부팅 성공이 확정되면 이 값(BOOT_SLOT)을 자동으로 토글합니다' vs 133행 설치 5단계 '`fw_setenv`로 `BOOT_SLOT=B` … 설정'(reboot 전, 137행)과 146행 mark-good은 `bootcount=0`·`upgrade_available=0`만 쓴다는 서술. BOOT_SLOT을 쓰는 시점(설치 직후 vs 부팅 성공 확정 후)이 동시에 참일 수 없다.
- 65~83행 system.conf는 rootfs A/B를 p2·p3(ext4), kernel A/B를 p4·p5(type=raw)로 정의하고 170행 SWUpdate도 boot.itb를 p5에 raw로 쓰는데, 258~262행 U-Boot 스크립트는 boot.itb를 파일로 `load mmc 0:1`(A)·`mmc 0:2`(B)에서 읽는다. 0:2는 같은 글의 rootfs A이고 raw 슬롯 p4·p5는 읽지 않아 두 설정이 같은 보드에서 함께 동작할 수 없다(코드 대 코드).

git log(7824b986 stub, 400892d7 linter, 5534938b 시리즈 작성, 2003b8a6 text 블록 정리, ac24bb76 제목 변경, be973200·0a9dd7bc 메타데이터)에 1차 자료 대조 커밋이 없다.

| 항목 | 점수 | 이 글의 근거 |
| --- | ---: | --- |
| A | 11 | 고유한 부분은 35~44행 철학 비교표, 281~290행 선택 기준표, 298~303행 함정(mark-good 호출 시점, compatible에 SoC revision 포함, 키를 bundle 안에 두는 문제, fw_setenv 비원자성, post-install에서 reboot)이다. 비교표 42행 '제한적'·'풍부', 44행 '낮은 편'·'가팔라 보일 수 있음'은 근거 없는 정성 평가이고, 292행 '거의 항상 안전합니다', 298·299행 '~편이 안전합니다'는 기준값 없는 일반론이다. system.conf·manifest·sw-description 예제(52~108·152~193행)는 공식 문서 예제 수준이다. |
| B | 11 | 왜 프레임워크인가(19~31행) → 두 도구 설정·bundle·설치(48~241행) → U-Boot 측(243~275행) → 선택 기준(277~292행) → 함정(294~303행) → 정리(305~313행)로 흐름은 완성됐다. SWUpdate 서명은 210행 한 문장뿐이고 205~207행 cpio 루프에 `sw-description.sig`가 없다. 196행 copy-1/copy-2 자동 선택은 설정 방법이 없다. B ≤ 13. |
| C | 6 | 설정 파일·명령(52~84·111~114·124·143·238행)은 있지만 RAUC·SWUpdate·U-Boot 버전, 보드, 예상 출력(`rauc status` 등)이 없다. 65~83행 vs 258~262행 파티션 불일치 때문에 예제를 그대로 조합하면 B 슬롯 부팅이 동작하지 않는다. 241행 '5분 카운트다운' Lua hook은 코드가 없다. |
| D | 6 | 비교한 글: 같은 시리즈 `chapter17-ab-update.md`, `chapter21-board-porting.md`, 다른 시리즈 `buildroot/chapter16-ota.md`, `bsp/chapter18-ota-recovery.md`, `embedded-security/chapter06-ota-update.md`. 52~84행 system.conf는 Buildroot Ch16 75~106행, BSP Ch18 101~130행과 같은 구조다. 92~114행 manifest(format=verity)·`rauc bundle`은 Buildroot Ch16 108~151행, BSP Ch18 134~159행과, 152~193행 sw-description bootenv는 Buildroot Ch16 166~202행과, 216~239행 swupdate.cfg·`swupdate -i`는 BSP Ch18 197~239행과 겹친다. 35~44행 비교표는 Buildroot Ch16 43~56행, BSP Ch18 252~257행과 같은 질문에 답한다. 243~275행은 275행이 밝히듯 Ch17 77~110·225~254행과 같고, Ch17 255~280·380행이 mark-good 계약을 이미 다룬다. |
| E | 7 | 제목 'RAUC vs SWUpdate 비교'와 description '비교와 적용'은 35~46행 비교표·281~290행 선택표로 이행된다. description의 'U-Boot와 통합'은 243~275행에 있지만 앞 절 슬롯 정의(65~83행)와 맞지 않는다. 범위 불일치는 없다. |
| F | 6 | 317행 다음 장 예고 Ch21·Ch22는 seriesOrder 21 `chapter21-board-porting.md`·22 `chapter22-debugging.md`와 맞다. 321행 라벨 'A/B 업데이트와 boot 이중화'와 322행 Ch21 라벨도 대상 제목과 맞고 둘 다 `draft: false`다. 275·312행이 Ch17을 전제로 언급하지만 본문 링크가 없고, 같은 주제의 Buildroot Ch16·BSP Ch18 링크도 없다. audit:reading은 확인하지 않았다. |
| G | 2 | 323·324행에 RAUC·SWUpdate 공식 문서 최상위 링크가 있지만 주장과 연결되지 않고 버전 표기가 없다. 37행 주도 조직, 40행 Mongoose 웹 UI, 99행 `format=verity` 같은 사실 주장에 개별 출처가 없다. |

uncertainties:
- 86행 RAUC의 U-Boot 백엔드가 쓰는 env 변수가 `BOOT_SLOT`/`bootcount`/`upgrade_available`인지 확인하지 않았다. `buildroot/chapter16-ota.md` 106·247행은 `BOOT_ORDER` 토큰이라고 적는다. RAUC integration 문서의 U-Boot 절로 확인이 필요하다.
- 133행 RAUC가 설치 중 `fw_setenv`로 bootcount·upgrade_available까지 쓰는지 확인하지 않았다. Ch17 182행은 '업데이트 에이전트가 직접 BOOT_SLOT을 토글하지 않는다'고 한다.
- 17행 'YAML/Lua 스크립트' vs 38·152~193행 libconfig 형식: sw-description의 YAML 지원 여부와 기본 형식을 확인하지 않았다.
- 196행 copy-1/copy-2를 정의하면 SWUpdate가 비활성 슬롯을 '알아서' 고르는지, `-e` selection 지정이 필요한지 확인하지 않았다.
- 205~210행 서명 시 `sw-description.sig`가 cpio에서 sw-description 바로 뒤에 와야 하는지, `-H crc`와 Buildroot Ch16 363행의 `newc` 중 어느 쪽이 요구 사항인지 확인하지 않았다.
- 247~273행 U-Boot 스크립트가 `bootlimit`을 설정하지 않고 `upgrade_available`도 읽지 않는데 146행은 `upgrade_available=0`이 fallback을 막는다고 한다. CONFIG_BOOTCOUNT_ENV가 upgrade_available을 조건으로 쓰는지는 U-Boot 소스로 확인해야 한다.
- 37행 SWUpdate 주도 'sbabic·DENX', 40행 '내장 Mongoose 웹 UI', 99행 `format=verity`의 최소 RAUC 버전을 확인하지 않았다.
- 249~252행 CONFIG_BOOTCOUNT_ENV 등 Kconfig 심볼 이름을 U-Boot 소스로 확인하지 않았다.

병합 대상: 점수 구간 기준 병합 후보는 `src/content/blog/embedded/buildroot/chapter16-ota.md`(같은 비교·RAUC·swupdate 통합 흐름)와 `src/content/blog/embedded/bsp/chapter18-ota-recovery.md`다. 판정은 오류 확인 때문에 우선 조치이고 다음 조치는 보강이다. 먼저 86·133·146행의 BOOT_SLOT 쓰기 시점과 65~83행 vs 258~262행 파티션 배치를 RAUC 문서의 U-Boot 연동 절과 맞춘다. 그 뒤 이 글은 'U-Boot 관점의 연동 계약'(env 변수, mark-good, bootcount)으로 역할을 좁혀 Buildroot Ch16의 패키징 중심 서술과 구별한다.

## 시리즈 공통 문제

루브릭 5절에 따라 이 루프에서 3편 이상에 나온 문제만 적는다.

- **1차 자료 대조 커밋 없음 (10편 전부).** 집필 커밋 5534938b·확장 커밋 b6dedf23 이후 slug·메타데이터·제목·text 블록·링크 일괄 커밋뿐이다. ch11의 bf206362 'Fact-check bootloader network and DDR guidance'는 출처가 없고 diff가 변수 이름 6줄이라 검증됨 근거가 아니다(같은 커밋으로 수정된 `chapter26-ddr-training.md`도 같은 이유). `factcheck: 검증됨`은 0편이고 8편은 원문 내부 모순으로 오류 확인이다. 루프 01과 합치면 Bootloader Internals 20편 중 14편이 오류 확인이다.
- **관련 항목 라벨이 대상 글 내용과 다름 (7편).** ch11 439행(ch30에 factory 0건)·440행(buildroot ch08에 NFS 0건), ch12 468·469·472행(대상에 fastboot 0건)·471행, ch14 281행(ch18에 bootmeth 0건)·282행(bsp ch06에 bootflow 0건), ch15 329행(security ch06에 FIT 0건)·325행, ch16 466행(ch25에 BL 서명 절 없음)·463행(옛 제목), ch17 438행(ch27에 슬롯별 anti-rollback 없음)·434행(옛 제목)·441행, ch18 436행(ch19에 ExitBootServices 0건)·437행(ch25에 U-Boot EFI 없음)·438행. 현재 글 주제에 맞춰 라벨을 지어낸 패턴이라 시리즈 전체 라벨 대조가 필요하다.
- **본문 출처가 관련 항목 끝 '원문 —' 링크뿐이고 U-Boot 버전·태그 없음 (9편).** ch12 473행, ch13 249행, ch14 283행, ch15 330행, ch16 469행, ch17 441행, ch18 440~442행, ch19 272~273행, ch20 323~324행. G가 ch11(RFC 인용으로 3)을 빼고 모두 2점인 공통 원인이다. 소스 경로도 버전 없이 적었다(ch13 138·219행, ch16 260행, ch17 116행, ch19 51·111행).
- **출처·측정 환경 없는 구체 수치·예시 출력 (10편 전부, C ≤ 8 상한 반복).** ch11 36·144·163행, ch12 261·269~271행, ch13 38~39·56~59행, ch14 44~78행, ch15 142·154·181행, ch16 138·196~198행, ch17 53~59·357행, ch18 101~104행, ch19 241·251행, ch20 설정 예 전반(버전·출력 없음).
- **예시 출력의 산술·형식이 맞지 않음 (5편).** ch11 38·113행(10995712 ≠ 0xa7c000), ch12 83행 vs 92~94행(UMS count vs lsblk), ch16 196~198행(152340×8 ≠ 1234567), ch14 49·148행 형식 차이와 50·91행 표기 차이, ch18 132~135행 vs 298~306행 efidebug 출력 형식. 손으로 만든 출력일 가능성이 있어 시리즈의 다른 출력 예시도 산술 대조가 필요하다.
- **같은 글 안에서 절이 반복 (5편, 확장 커밋 b6dedf23 흔적).** ch11 NFS 237행·298행, ch12 fastboot 21~75·245~276행과 UMS 77~103·278~311행, ch16 anti-rollback 173~186·348~384행과 FIT 구조 46~107·203~223행과 mkimage 109~129·225~256행, ch17 백엔드 111~142·200~223행, ch18 37~49·230~247행과 150~162·292~311행과 185~197·347~369행. 같은 커밋으로 보강한 다른 장(ch09·10)도 점검 대상이다.
- **같은 주제가 시리즈 안팎에서 반복 (D 감점, 6편 이상).** distro_bootcmd(ch11 279~296행, ch13 136~189행, ch29 42~66행), bootflow scan 출력(ch14 44~54행 ↔ ch29 191~201행), efidebug/bootefi bootmgr(ch14 139~167행, ch18 124~137행, ch29 248~265행), FIT 서명(ch15 215~247행, ch16, ch27 174~210행), anti-rollback(ch16, ch17 389~402행, ch23 188행, ch27 241행, security ch02 247행), bootcount/altbootcmd(ch17, ch20 133~146행, bsp ch18 33~95행, buildroot ch16 229~258행, part7-02 111~117행, security ch06 261~268행), RAUC vs SWUpdate(ch20, buildroot ch16, bsp ch18). 정본 한 곳을 두고 나머지를 링크로 줄이는 시리즈 간 역할 분담이 필요하다.
- **같은 시리즈 글 사이 사실 충돌 (다른 글과의 모순이라 오류 확인에는 넣지 않음).** bootflow 도입 버전(ch14 15·42행 '2023/2023.07' vs ch29 38·344행 '2022.10+'), 서명 강제 조건(ch15 245행, ch16 146·256·429·453행, ch27 210행), 트리거 비교 연산자(ch17 227행 '>' vs 234·272행 '-ge', buildroot ch16 '>', security ch06 '-gt 3'), BOOT_SLOT 토글 주체(ch17 182행 vs 266~269행 vs ch20 86·133행), RAUC env 변수 이름(ch20 `BOOT_SLOT` vs buildroot ch16 `BOOT_ORDER`), ethaddr 공백 동작(ch11 296행 vs ch13 225행), boot_targets 예(ch11 282행, ch13 141행, ch29 53행). fact-check 라운드에서 1차 자료로 한 번에 정한다.
- **공통 H2 뼈대 (10편 전부).** '한 줄 요약 → 본문 → 자주 하는 실수 → 정리 → 다음 장 예고 → 관련 항목'이 같은 순서로 있다(예: ch13 13·221·229·239·243행, ch16 15·423·447·457·461행, ch18 15·404·419·429·433행). 루브릭 9절 scaled content 수치 기록 대상이다. ch17 23~40·293~306·391~398행과 ch18 25~33행은 흐름도를 ```text ASCII로 두어 §6 TikZ 규칙 위반 후보다(점수와 별개).

## 다음 조치

이번 루프는 점수만 기록했고 원문은 바꾸지 않았다. 아래는 후속 루프·작업의 순서 제안이다.

- 우선 조치 8편은 건수 순으로 본다. ch11(3건: 415행 counter 폭, 159행 MTU 산술, 38·113행 출력 산술), ch16(3건: 서명 강제 조건, rollback 비교 주체, -e/-E), ch20(2건: BOOT_SLOT 쓰기 시점, 파티션 배치), ch18(210·414행 ESP 파일시스템, 49·245행 보조), ch17(bootlimit 트리거), ch15(configuration 선택 규칙), ch19(DTB 배치 방향), ch12(UMS count vs lsblk). 각 글의 1차 자료(RFC, U-Boot 태그 고정 doc·소스, UEFI 명세, booting.rst, RAUC 문서)를 열고 고친 뒤 출처를 적은 커밋을 남긴다.
- 같은 작업에서 관련 항목 라벨(ch11 439·440행, ch12 468·469·471·472행, ch14 281·282행, ch15 325·329행, ch16 463·466행, ch17 434·438·441행, ch18 436~438행)을 대상 글에 맞춘다. F 감점 원인이라 다시 채점할 때 바로 반영된다.
- ch19 E 2점은 제목·본문 범위 불일치가 원인이다. 제목을 RISC-V·x86까지 넓힐지 본문을 ARM으로 좁힐지는 사용자가 정한다.
- 병합 검토 2편: ch13은 distro 절·boot.scr 블록을 ch29·ch10 링크로 줄이는 부분 병합 뒤 보강, ch14는 병합 대상 없음으로 도입 버전·드라이버 API 대조와 라벨 수정을 먼저 한다.
- '같은 시리즈 글 사이 사실 충돌'과 서명·anti-rollback·bootcount 반복은 Bootloader Internals `/fact-check-round`에서 정본 장을 정하면서 한 번에 다룬다.
- 예시 출력 산술 불일치와 b6dedf23 반복 절은 다음 루프(bootloader chapter21~) 채점 때 같은 기준으로 grep·대조한다.
