# Bootloader Internals chapter01–chapter06 fixed-batch companion

Manifest: [`bootloader-2026-10-22.json`](./bootloader-2026-10-22.json)

Rescore: false. This record reports source remediation and performed validation only; it adds no scores, grades, rubric findings, or evaluation states.

## `chapter01-boot-problem.md`

- Status: `remediated`
- Validation: edited; documentation and static gates pass; hardware/tool execution not run
- Before SHA-256: `0ed529df86edd641ca182947a36d0c59b9159d6c0010292f29925987d3ce7093`
- After SHA-256: `5781cefa12c1abf7e82a22028082fb8137af6c9b6981fd1b4128472b2f0845fa`
- Evidence: the eight required remediation fields are in the manifest.

## `chapter02-u-boot-position.md`

- Status: `remediated`
- Validation: edited; documentation and static gates pass; hardware/tool execution not run
- Before SHA-256: `3226eee6a4a66c463debf2b21214da631fc5e0295e0be9964de295569dd0e0f3`
- After SHA-256: `3108ce0b8f80f8163b4d7a3f95b646c79b8900888ad753943d1fb40815e4d3df`
- Evidence: the eight required remediation fields are in the manifest.

## `chapter03-build-system.md`

- Status: `remediated`
- Validation: edited; documentation and static gates pass; hardware/tool execution not run
- Before SHA-256: `5c0139a9d065dbe76bfeeaa8ab21fe63dc42ce0dfd3d982c67a1e19298a7b3f2`
- After SHA-256: `603fd23b05018c6b318fdcfadae646dea7fc48536420e3e8211fae49344d48c0`
- Evidence: the eight required remediation fields are in the manifest.

## `chapter04-boot-stages.md`

- Status: `remediated`
- Validation: corrected; documentation and static gates pass; target runtime not run
- Before SHA-256: `8ee0eae4e28452021eaaef7ac3747d2a6052697f692f95de4349f2077ce7f303`
- After SHA-256: `a18ad094db64a5685a16db1e2b351d717b94d772cdb75d91483e55675a9dcdd8`
- Evidence: the eight required remediation fields are in the manifest.

## `chapter05-falcon-mode.md`

- Status: `remediated`
- Validation: corrected; documentation and static gates pass; target runtime not run
- Before SHA-256: `1e91cab63c4b3569eeadecbddb8b7cb81759e0bf05dd7e7f955fa3a75c5f9364`
- After SHA-256: `1fdc4f9a6db7f4e0e5df0d5cb51d60eeefcec26b0d88edd0c65b3556d86d381c`
- Evidence: the eight required remediation fields are in the manifest.

## `chapter06-device-tree.md`

- Status: `remediated`
- Validation: corrected; documentation and static gates pass; target runtime not run
- Before SHA-256: `c23fca36cc784ea4d9f54fc5aecc83a552dfac70e7f99ddae41a05dfa4e24709`
- After SHA-256: `5ae01cdb23d4c1be0228601664f93fdd5f9062ae4643a407cf0910f767410f72`
- Evidence: the eight required remediation fields are in the manifest.

This companion is maintained for the batch tracker. Detailed sources, limitations, unassessed follow-up questions and validation commands are recorded in the linked fixed manifest.


## Bootloader Internals chapter16–18 fixed batch

고정 manifest: `bootloader-chapter16-18-2026-10-22.json` 및 같은 이름의 Markdown companion (`readyForIntegration: true`, `rescore: false`). 평가 기록은 read-only 참조만 했고 새 점수나 rubric 상태를 만들지 않았다.

- chapter16: required FIT signature 정책과 실제 `bootm` 경로를 조건부로 설명하고, 잘못된 universal rejection/OTP anti-rollback 주장을 제거했다. FIT artifact, positive/negative crypto test는 실행하지 않았다.
- chapter17: U-Boot bootcount/altbootcmd 조건과 제품 bootchooser의 슬롯 전환을 분리하고 `CONFIG_BOOTCOUNT_FS` 조건과 RAUC U-Boot interface를 반영했다. 설명은 바뀐 description 예외와 SHA/eight-field 근거를 manifest에 기록했다.
- chapter18: documented `bootefi` synopsis, build-specific EFI variable/Secure Boot support, GPT/MBR 및 FAT media requirements를 반영했다. synthetic outputs는 설명 예시로 한정했다.
- 세 편의 blocking publish gate, inline-math, diff check, frontmatter invariants가 통과했다. upstream clone-only 검사들은 SKIPPED (not PASS)이며 U-Boot/board/EFI/RAUC runtime은 실행하지 않았다.
- 각 편의 before/after SHA-256, 8개 증거 필드, 남은 manual-review 질문은 고정 manifest에 보존했다. 실제 target policy, EFI variable persistence, signature enforcement와 A/B power-loss 복구는 unassessed다.

## Bootloader Internals chapter19–21 fixed batch

고정 manifest: `bootloader-chapter19-21-2026-10-22.json` 및 같은 이름의 Markdown companion (`readyForIntegration: true`, `rescore: false`). 기존 평가 기록은 read-only로만 참고했다.

- chapter19: ARM32/AArch64/RISC-V/x86을 분리하고 Linux v6.12 요구와 U-Boot v2025.01 command syntax를 대조했다. 현재 ARM64에서 구식 512 MiB DTB 제한, D-cache off 단정, `booti`/x86 mapping/cmdline 주장 및 합성 code/log를 정정·제거했다. 제목/description은 본문 architecture 범위에 맞춰 수동 수정했다.
- chapter20: RAUC의 U-Boot bootchooser 변수/script 계약과 SWUpdate libconfig/cpio/explicit collection-mode 동작을 공식 문서로 대조했다. generic `BOOT_SLOT`, implicit inactive-slot selection 및 bootcount mark-good 단정을 고쳤다.
- chapter21: 보드 없이 복사한 i.MX config/DDR/API, 고정 flash offset와 `/dev/sdb` write, 합성 2026.04 serial transcript를 제거하고 pinned-tree/hardware checklist로 좁혔다. chapter22 다음 링크와 BSP 대상 라벨을 고쳤다.
- 세 편의 blocking publish gate, inline-math, diff check 및 metadata invariants가 통과했다. upstream clone-only checks는 SKIPPED (not PASS); kernel/U-Boot/RAUC/SWUpdate/board runtime은 실행하지 않았다.
- before/after SHA-256, 8개 증거 필드, 미확인 target 질문은 고정 manifest에 기록했다. 점수/등급/rubric/평가 상태는 생성하거나 변경하지 않았다.


## Bootloader Internals chapter22–24 fixed batch

고정 manifest `bootloader-chapter22-24-2026-10-22.json`와 같은 이름의 companion을 추가했다 (`rescore: false`, `readyForIntegration: true`). published-loop-03은 read-only 근거로만 참조했으며 점수·등급·rubric 결과를 만들거나 변경하지 않았다.

- chapter22: 합성 `bdinfo`/UART/JTAG 출력, 서로 맞지 않는 주소, 범위가 정해지지 않은 메모리 쓰기와 일반 RAM의 재부팅 보존 가정을 제거했다. U-Boot debug UART/GDB/mtest와 Linux ramoops 공식 문서 범위에서 정리했다.
- chapter23: SoC별 eFuse 주소·bit map, 보안 lifecycle, anti-rollback 표현 및 fuse write/JTAG 잠금 명령을 제거했다. 정확한 부품/revision용 제조사 manual 없이는 미검증으로 남긴다.
- chapter24: 보편적인 SRAM 크기·TPL 필요 조건·Kconfig/address/API·링커 예제와 합성 로그를 제거하고 U-Boot v2025.01 xPL phase 설명에 맞췄다.
- 3개 본문 blocking publish gate, inline-math, diff, code-fence 및 slug/date/series/order/draft invariants를 통과했다. upstream clone-only checks는 SKIPPED (not PASS); U-Boot build, QEMU, target board/ROM, JTAG, OTP programming과 pstore hardware test는 실행하지 않았다. chapter23–24 description 범위 정정과 각 본문의 SHA/evidence/미확인 질문은 고정 manifest에 기록했다.


## Bootloader Internals chapter25–27 fixed batch

고정 manifest `bootloader-chapter25-27-2026-10-22.json`와 같은 이름의 companion을 작성했다 (`rescore: false`, `readyForIntegration: true`). published-loop-03은 read-only로만 참고했다. 새 점수·등급·rubric 결과는 산출하지 않았다.

- chapter25: TF-A의 reference BL 단계와 선택 기능(TBB/BL32)을 분리하고, SoC별 메모리 주소·EL·PSCI·FIP/package·OP-TEE recipe를 일반 규칙처럼 쓴 부분을 제거했다. TF-A v2.12.12와 해당 프로젝트 공식 문서를 사용했다. description 범위 예외 기록.
- chapter26: 상충하는 DDR DQS 설명, 미출처 timing/electrical 수치·mailbox/register 출력, fake test logs와 eMMC EXT_CSD timing 주장을 제거했다. DRAM 부품·PHY·SoC·board별 검증 경로로 정리했다.
- chapter27: 모든 제품이 eFuse hash에서 동일 체인으로 검증한다는 표현과 Rockchip/TI fuse command, fake logs를 제거했다. TF-A TBB, U-Boot FIT, Linux module signing 및 dm-verity의 별도 enforcement 경계를 정리했다. AN4581을 i.MX family-scoped application note로 바르게 표기하고 description을 조정했다.
- 세 편 모두 blocking publish gate, inline-math, diff, fences와 frontmatter 핵심 invariants 통과. upstream clone-only checks는 SKIPPED (not PASS). 보드/ROM/DDR/서명키/FIT/OTP/hardware runtime은 실행하지 않았다. 세 편의 SHA와 8-field evidence 및 다음 검증 질문은 고정 manifest에 있다.


## Bootloader Internals chapter28–30 fixed batch

고정 manifest `bootloader-chapter28-30-2026-10-22.json` 및 companion을 작성했다 (`rescore: false`, `readyForIntegration: true`). published-loop-03은 read-only로 참고했고 새 점수·등급·rubric 결과는 생성하지 않았다.

- chapter28: 불일치하는 NAND eraseblock 출력, 고정 sizing 배수, UBI overhead, eMMC boot/RPMB 크기와 partconf 예제를 제거했다. MTD/UBI와 block-device partitioning, 저장영역과 update 정책을 분리했다.
- chapter29: U-Boot v2025.01 Distro Configuration/Standard Boot/bootflow/source 문서에 맞춰 기능 조건을 구분했다. `boot.scr` legacy CRC는 서명이 아님을 바로잡고, 합성 scan/EFI/Raspberry Pi logs와 universal fallback/distribution claims를 제거했다.
- chapter30: QEMU `virt`/sandbox와 physical DDR/ROM test를 분리했다. 공식 QEMU와 U-Boot pytest test shape만 남기고 fake output, 산술 오류, 미확인 CI-provider API 및 universal metric thresholds를 제거했다. description 범위 예외 기록.
- 세 편의 gate, inline-math, diff, fence와 URL/date/series/order/draft invariants 통과. upstream clone-only checks는 SKIPPED (not PASS); U-Boot/QEMU/storage/board/CI runtime은 실행하지 않았다. 전체 SHA/evidence/question은 고정 manifest에 있다.


## Bootloader Internals chapter31–33 fixed batch

고정 manifest `bootloader-chapter31-33-2026-10-22.json` 및 companion을 작성했다 (`rescore: false`, `readyForIntegration: true`). published-loop-04는 read-only로만 참고했다. 점수·등급·rubric 결과를 생성하거나 변경하지 않았다.

- chapter31: TF-A 서비스 등록 프레임워크와 플랫폼 구현 경계를 구분했다. 일반화된 OEN·메모리 주소·stack·latency·서비스 동작 주장을 제거하고 TF-A 2.15 공식 runtime-service 및 design 문서에 범위를 맞췄다. title/description 예외 기록.
- chapter32: SMCCC 전달 규약과 PSCI 서비스 의미를 분리하고 충돌하는 function-ID/레지스터/fast-yielding/버전 주장을 제거했다. Arm DEN0022/DEN0028 및 Linux PSCI binding을 확인했다. 합성 latency/log와 SoC 전원 register 주장을 제거하고 description을 좁혔다.
- chapter33: universal boot 및 kernel-internal call trace, malformed `cpu-release-addr`, unsupported GIC/percpu detail, fabricated timing/log를 제거했다. Linux arm64 boot protocol의 PSCI와 spin-table 계약을 바탕으로 비교했다. title/description과 다음 편 연결을 수정했다.
- 세 편의 blocking publish gate, inline-math, diff, fence 및 핵심 metadata invariants가 통과했다. upstream clone-only checks는 SKIPPED (not PASS). TF-A/Linux build, PSCI/SPIN runtime, QEMU, board와 timing은 실행하지 않았다. SHA·8개 evidence fields·미확인 질문은 고정 manifest에 기록했다.
