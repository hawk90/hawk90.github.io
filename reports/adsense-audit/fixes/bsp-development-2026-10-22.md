# BSP Development 1–21 수정 및 검증 기록

검토일은 2026-10-22입니다. `chapter01`부터 `chapter21`까지 본문 전체와 평가 근거 `published-loop-04.md`, `published-loop-05.md`, `published-loop-06.md`를 읽었습니다. 원장에 있는 점수는 열람만 했고 수정·재산출하지 않았습니다. JSON 기록에 21개 문서별 `path`, `status`, before/after SHA-256, 8개 증거 필드, 1차 자료 링크를 보관했습니다.

| 장 | 확인·수정한 내용 |
|---|---|
| 1–4 | BSP 범위 안내, i.MX8MP MMIO와 boot switch, Device Tree 규칙, pinfunc/pad 설정의 근거 없는 주소·ALT·ball·비트 필드를 정리했습니다. |
| 5–9 | DDR sample 값 불일치, i.MX8MP U-Boot flash offset, TF-A handoff 단정, kernel image/config 설명, arm64 spin-table release 주소와 조건을 대조했습니다. |
| 10–14 | 부팅 단계 순서와 로그 예시의 범위를 명확히 하고, thermal critical 동작을 kernel 경로에 맞췄습니다. power/runtime PM, driver binding 설명은 플랫폼 의존 범위를 밝혔습니다. |
| 15–18 | 부트 시간의 출처 없는 수치·STM32MP1 표 및 자동 fallback 주장을 제거했습니다. parser의 timestamp 추출을 고쳤고 GPT·RAUC 동작 설명을 1차 자료에 맞췄습니다. |
| 19–21 | raw-device fio 표적을 파일로 바꾸고 시험 시간·qualification의 보편 단정을 제거했습니다. GNU build-id/SOURCE_DATE_EPOCH 설명과 kernel EOL 표를 정정했습니다. |

명확한 제목·설명 정정은 15장 한 건입니다. 기존 제목과 description이 본문에 없는 Parallel Init/deferred init을 약속해, 실제로 다루는 측정과 부트 경로 검증에 맞게 바꿨습니다. 전체 21편의 `slug`, `date`, `series`, `seriesOrder`, `draft`는 HEAD와 대조해 보존했습니다.

출발 SHA는 `d55f8d66ece6acb8ebb274df7c843ce6b4054853`입니다. `beforeSha256`는 점수 원장 source baseline과 일치하는 HEAD 파일의 해시입니다. BSP 1–4에는 인수 전에 이전 에이전트의 작업 트리 수정이 있었으나 그 draft SHA가 별도 보존되지 않았으므로, JSON에 그 사실과 `stageStartSha256: null`을 명시했습니다. BSP 5–21은 이 작업 인수 시 HEAD와 같았습니다. 수정 후 해시는 JSON의 각 `articles[]` 항목에 기록했습니다.

검증 스크립트 [`verify-bsp-development-examples.mjs`](/Users/hawk/Workspaces/hawk90.github.io/scripts/verify-bsp-development-examples.mjs)는 21개 파일의 원문·수정 후 SHA와 frontmatter 불변 필드, 8개 증거 필드, manifest 범위를 확인합니다. 복사 가능한 실행형 Bash 블록 40개를 `bash -n`으로 검사했고 잘못된 구문 fixture가 거부되는 것도 확인했습니다. 15장 parser fixture는 정상 로그에서 `1.234567` timestamp와 journal milestone을 추출하고 kernel milestone 누락 시 nonzero를 반환했습니다. 이는 host fixture 검증이며 보드 로그 검증은 아닙니다.

`bash scripts/audit-publish-gate.sh <21 files>`와 `node scripts/check-inline-math.mjs <21 files>`가 종료 코드 0으로 끝났고 전체 `git diff --check`도 통과했습니다. publish gate의 번역체 검사는 14장 한 곳을 SOFT 후보로 표시했습니다. 해당 장의 짧은 “via PWM” 주석을 `PWM output for fan control`로 바꿨지만 후보가 남아 자동으로 해결됐다고 보지 않습니다. 인용 심볼 검사는 upstream clone 부재로 **SKIPPED**이며 PASS로 취급하지 않았습니다. blocking gate는 통과했지만 경고 후보는 보수적으로 아래 한계에 남깁니다.

이 환경에는 `dtc`가 없어 Device Tree compile/binding 검사를 실행하지 않았습니다. 전체 kernel/U-Boot/Buildroot/Yocto image build, board boot, UART/JTAG, flash, DDR training, secure boot, thermal/power, OTA rollback, storage endurance 시험은 수행하지 않았습니다. GPT를 포함한 저장장치 쓰기 명령은 실행하지 않았고, 수치·출력 예시를 실제 측정 결과라고 주장하지 않습니다. 본문 전체를 읽었지만 21편의 모든 주장을 완전 검증했다고 보지 않습니다. 바뀐 upstream 버전, board revision, BOM, vendor firmware에서 다시 확인할 잔여 위험이 있습니다.

통합 기록은 [`bsp-development-2026-10-22.json`](/Users/hawk/Workspaces/hawk90.github.io/reports/adsense-audit/fixes/bsp-development-2026-10-22.json)이며 마지막 검증 후 `readyForIntegration: true`로 확정했습니다. 이 상태는 문서·metadata·정적 검사 기록이 확정됐다는 뜻이며, hardware/image validation까지 완료했다는 뜻은 아닙니다. 실행 로그는 같은 디렉터리의 `bsp-development-*-2026-10-22.log` 파일에 있습니다.
