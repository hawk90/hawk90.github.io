# 작성자 측정 요청 — `part7-13-irq-affinity.md`

> - 대상: `src/content/blog/embedded/modern-recipes/part7-13-irq-affinity.md`
> - 작성: 2026-10-11, AdSense 개선 파일럿 루프 2차 (최종 점수 79, 상태 `unresolved`)
> - 목적: 루브릭 C(실전성)·A(독창성)는 작성자가 실제 하드웨어에서 잰 값과 기록이 있어야 오른다. 아래 항목을 측정해 주면 글에 넣는다. 측정하지 않은 항목은 비워 둔다.
> - 원칙: 측정값은 작성자가 직접 잰 값만 쓴다. 에이전트가 개발 머신에서 돌린 결과는 넣지 않는다(운영자 결정 2026-10-11).

## 1. GIC SPI 선택 규칙 실측: 넓은 mask에서 가장 낮은 번호 online CPU 하나로만 간다(L63-65, L101-108, L301)

- **준비:** 작성자가 가진 arm64 보드 1종. 기록 항목: 보드·SoC 이름, GIC 버전(dmesg | grep -i gic), uname -r, 커널이 v7.3-rc6이 아니면 실제 버전, CONFIG_GENERIC_IRQ_EFFECTIVE_AFF_MASK 여부(effective_affinity_list 파일이 있는지). 트래픽을 꾸준히 내는 SPI 장치 하나(on-chip 이더넷·UART·SD 등, PCIe MSI 제외)
- **절차:** systemctl stop irqbalance; IRQ=<SPI 번호>; echo c > /proc/irq/$IRQ/smp_affinity; cat /proc/irq/$IRQ/effective_affinity_list; grep "^ *$IRQ:" /proc/interrupts > a.txt; 부하 30초(iperf3·dd 등); grep "^ *$IRQ:" /proc/interrupts > b.txt. 이어서 echo 0 > /sys/devices/system/cpu/cpu2/online 뒤 effective_affinity_list와 같은 delta 측정, cpu2 다시 online. 마지막으로 SPI 두세 개에 f를 써서 effective_affinity_list가 모두 0인지 확인
- **기록할 것:** 각 단계의 effective_affinity_list 출력 원문, /proc/interrupts 해당 줄 before/after 원문과 CPU 열별 증가량(숫자), 부하 명령과 지속 시간. 예측과 다르면 다른 그대로 기록
- **글에 넣을 위치:** 'smp_affinity와 effective_affinity' 절 L65 뒤에 '보드 X에서 확인' 소단락 + 출력 블록. L28의 '측정 결과는 싣지 않습니다'를 측정 범위와 환경을 적는 문장으로 교체
- **오르는 항목:** C: 절차만 있는 상태(≤9 상한)에서 명령·환경·관찰 결과가 있는 8~11 이상으로, 다른 항목과 합쳐 12+ 근거. A: 소스 해석을 실기로 대조한 이 글만의 결과

## 2. 쓰기 거부(EPERM)와 파일 권한 불일치 실측(L111-125)

- **준비:** 같은 보드. per-CPU IRQ(arch timer 등, /proc/interrupts에서 per-CPU 카운트가 있는 줄), 가능하면 managed IRQ(NVMe 등 PCIe 장치 queue IRQ)와 IRQF_NOBALANCING IRQ 하나씩
- **절차:** 각 IRQ에 대해 ls -l /proc/irq/N/smp_affinity; echo 1 > /proc/irq/N/smp_affinity_list; echo "rc=$?"; 셸이 출력한 오류 메시지 그대로 저장. 쓰기 비트가 있는데 EPERM이 나는 IRQ가 있는지 확인
- **기록할 것:** IRQ 번호·이름(/proc/interrupts 마지막 열), ls -l 권한 문자열, 쓰기 오류 메시지 원문과 종료 코드. 쓰기 비트 있음+EPERM인 사례가 실제로 있었는지 여부(없으면 없다고 기록)
- **글에 넣을 위치:** '쓰기가 거부되는 경우' 표 아래, L125 뒤 출력 블록
- **오르는 항목:** C: 실패 사례의 관찰 결과(12~15 기준의 '실패'). A: 파일 권한으로 판단하면 틀린다는 주장을 실기로 뒷받침

## 3. 10진 mask 실수의 실제 결과(L59, L299)

- **준비:** 같은 보드(CPU 수 기록). 4-CPU면 overflow 경로, 8-CPU 이상이면 오배정 경로
- **절차:** echo $((1<<4)) > /proc/irq/$IRQ/smp_affinity; echo "rc=$?"; cat /proc/irq/$IRQ/smp_affinity_list. 접두사 실험: echo 0x2 > /proc/irq/$IRQ/smp_affinity; echo "rc=$?"
- **기록할 것:** 오류 메시지 원문(예상: 4-CPU는 EOVERFLOW 계열, 0x2는 Invalid argument) 또는 8-CPU에서 smp_affinity_list 결과(예상 1-2,4). 실제 출력이 예상과 다르면 그 출력
- **글에 넣을 위치:** 'bitmask 읽는 법' 절 L59 뒤 짧은 출력 블록
- **오르는 항목:** C: 명령+관찰 결과. 작은 항목이지만 '실패 재현'으로 C 12+ 근거 보강

## 4. irqbalance가 수동 값을 덮어쓰는 시점과 --banirq·BANNED_CPULIST 효과(L131-155, L297-298)

- **준비:** 같은 보드, irqbalance 버전(irqbalance --version, 배포판 패키지 버전) 기록, nohz_full=<cpu> 또는 isolcpus=<cpu>로 부팅한 상태
- **절차:** (1) irqbalance 실행 중 echo 3 > /proc/irq/$IRQ/smp_affinity_list 후 while true; do date +%T; cat /proc/irq/$IRQ/smp_affinity_list; sleep 1; done 를 부하 아래 5분 기록. (2) IRQBALANCE_ARGS="--banirq=$IRQ" 넣고 restart 후 같은 기록. (3) IRQBALANCE_BANNED_CPULIST=2-3만 넣고 restart 후 for f in /proc/irq/*/smp_affinity_list 루프로 격리 CPU를 포함한 IRQ가 생기는지, 이어서 2-3,<격리CPU>로 바꿔 재확인
- **기록할 것:** (1) 값이 바뀐 시각과 바뀐 값(없으면 5분 동안 유지됐다고 기록), (2) 유지 여부, (3) 격리 CPU가 들어간 IRQ 목록 before/after. irqbalance 로그(journalctl -u irqbalance) 관련 줄
- **글에 넣을 위치:** 'irqbalance와 공존하기' 절 L133 뒤와 L155 뒤에 각각 결과 블록
- **오르는 항목:** C: 시간축 관찰·설정별 비교(트레이드오프/환경 차이). A: BANNED_CPULIST가 자동 제외를 끈다는 비직관적 결론을 직접 확인한 사례

## 5. irqaffinity= 부팅 파라미터가 boot CPU를 강제로 포함하는지, 이미 시작된 IRQ에 닿지 않는지(L179-181)

- **준비:** 같은 보드, 부팅 명령행 수정 가능 환경(U-Boot bootargs 또는 extlinux). /proc/cmdline 기록
- **절차:** irqaffinity=1-3 으로 부팅 후 cat /proc/cmdline; cat /proc/irq/default_smp_affinity; for f in /proc/irq/[0-9]*/smp_affinity_list; do printf '%s: %s\n' $f $(cat $f); done. 이어서 echo e > /proc/irq/default_smp_affinity 후 같은 목록을 다시 찍어 기존 IRQ가 그대로인지 확인, 모듈 하나를 재적재해 새로 시작된 IRQ의 값 확인
- **기록할 것:** default_smp_affinity 값(예상 f, CPU0 포함), IRQ별 smp_affinity_list 목록 원문, default_smp_affinity 변경 전후 기존 IRQ 값 비교, 재적재 IRQ의 값
- **글에 넣을 위치:** '부팅 시 기본값 — irqaffinity와 isolcpus' 절 L179 뒤 출력 블록
- **오르는 항목:** C: 환경(명령행)+결과. D 보조: industrial-ethernet chapter11 L112 모순을 실기 출력으로도 뒷받침

## 6. CPU hotplug와 suspend-to-RAM 뒤 affinity 변화와 uevent 유무(L305-327)

- **준비:** 같은 보드, suspend-to-RAM(mem_sleep에 deep) 지원 여부 기록(cat /sys/power/mem_sleep). systemd/udev 버전 기록
- **절차:** hotplug: echo 1 > /proc/irq/$IRQ/smp_affinity_list; udevadm monitor --kernel --subsystem-match=cpu & ; echo 0 > /sys/devices/system/cpu/cpu1/online; cat smp_affinity_list; echo 1 > .../cpu1/online; cat smp_affinity_list. suspend: 같은 초기값으로 udevadm monitor 켜 둔 채 echo deep > /sys/power/mem_sleep; rtcwake -m mem -s 10; 깨어난 뒤 smp_affinity_list. 이어 udev 규칙·system-sleep hook 설치 후 두 경우 모두 값이 복원되는지 재확인
- **기록할 것:** 각 단계 smp_affinity_list 원문(예상: offline 뒤 0,2-3, online 뒤에도 유지), udevadm monitor 출력(hotplug에서 online 이벤트 있음, suspend에서 없음이 예상), hook 설치 후 복원 여부. suspend가 s2idle만 되는 보드면 그 사실 기록
- **글에 넣을 위치:** 'CPU hotplug 뒤 affinity가 바뀌어 있음' L309의 '코드대로라면' 문장을 실측 결과로 교체, suspend 절 L318 뒤 udevadm 출력
- **오르는 항목:** C: 실패 재현과 해결책 검증(12~15 핵심 근거). A: 발행 글에서 드문 suspend 경로 실기 확인

## 7. PREEMPT_RT IRQ thread: taskset 실패, 기본 priority 50/49, smp_affinity 변경 시 thread CPU 이동(L231-259, L334)

- **준비:** 같은 보드에 CONFIG_PREEMPT_RT 커널(uname -v에 PREEMPT_RT 확인), util-linux 버전 기록
- **절차:** ps -eLo pid,cls,rtprio,psr,comm | grep 'irq/'; taskset -p 0x2 <irq thread pid>; echo $?; chrt -p <pid>; echo 1 > /proc/irq/$IRQ/smp_affinity_list; 인터럽트를 몇 번 발생시킨 뒤 taskset -p <pid>와 ps의 psr 다시 확인. secondary thread(irq/N-s-*)가 있으면 같은 확인
- **기록할 것:** taskset 오류 메시지 원문(예상 Invalid argument), chrt 출력의 정책·priority 값, smp_affinity 변경 전후 thread의 affinity mask와 psr
- **글에 넣을 위치:** 'PREEMPT_RT — threaded IRQ' 절 L243 뒤 출력 블록
- **오르는 항목:** C: 명령+결과. D 보조: rtos part5-07 L57 taskset 주장 반박을 실기로 뒷받침

## 8. 격리 효과 정량: /proc/interrupts delta와 cyclictest histogram, irqaffinity/isolcpus=managed_irq 유무 비교(L278-291) — 남은 C 차단 요인 자체

- **준비:** 같은 보드(PREEMPT_RT 커널 권장), rt-tests 버전, 부하 도구(iperf3 NIC 트래픽 + fio 또는 dd 저장장치 I/O) 버전·명령, CPU 주파수 governor 고정 여부, 온도 기록. 격리 대상 CPU 번호 명시
- **절차:** 구성 A: 격리 파라미터 없음. 구성 B: nohz_full=<c> irqaffinity=<나머지> isolcpus=managed_irq,<c>(+irqbalance 정지 또는 BANNED_CPULIST에 c 포함). 각 구성에서 같은 부하를 걸고 본문 명령 그대로 cat /proc/interrupts > before; cyclictest -m -p 80 -t 1 -a <c> -i 1000 -D 10m -h 400 -q > hist.txt; cat /proc/interrupts > after. 각 구성 최소 2회
- **기록할 것:** 각 실행의 cyclictest Min/Avg/Max(us)와 overflow 수, histogram 파일 원본(또는 그래프), 격리 CPU 열의 IRQ별 증가량 표(diff 스크립트 결과), 격리 CPU에 남은 IRQ 이름(timer·IPI 등 per-CPU는 남는 것이 정상인지 포함). 회차 간 편차도 그대로
- **글에 넣을 위치:** '효과 확인 절차' 절에 '측정 결과 (보드 X, 날짜)' 하위 절 신설: 환경 표, 구성 A/B 비교 표, histogram 그림, 한계(1개 보드·10분·부하 종류). L28·L280의 '측정 결과는 싣지 않습니다'는 이 범위를 설명하는 문장으로 교체
- **오르는 항목:** C: 3-1의 '절차만 있으면 ≤9' 상한 해제, 실제 측정·환경·트레이드오프가 있어 12~15 구간 진입 가능. A: 작성자 고유 측정 결과로 20~25 구간 근거(분석·선택 기준)

## 9. (보드가 해당할 때만) PCIe MSI 경로별 CPU 선택: ITS least-loaded 또는 DWC MSI redirect(L67-79, L331)

- **준비:** PCIe 장치가 달린 보드. MSI 경로 기록: /proc/interrupts의 chip 이름 열(ITS-MSI, GICv2m, PCI-MSI + dw 등), dmesg의 its/v2m/dwc 관련 줄
- **절차:** queue IRQ 하나에 echo 2-3 > smp_affinity_list; effective_affinity_list 확인; 부하 아래 /proc/interrupts delta. DWC라면 parent IRQ(controller의 msi IRQ)의 smp_affinity_list를 mask 안 CPU와 mask 밖 CPU로 각각 바꿔, 개별 MSI 줄의 증가가 어느 CPU 열에 찍히는지 비교
- **기록할 것:** chip 이름 원문, effective_affinity_list(DWC면 여러 CPU가 나오는지), parent 위치별 MSI 증가 CPU 열. DWC 결과는 L77·L331 수정 문구(mask 안이면 parent CPU, 밖이면 mask 첫 CPU)와 대조한 결과로 기록
- **글에 넣을 위치:** 'PCIe MSI' 절 해당 controller 단락 뒤
- **오르는 항목:** C: 환경 차이(controller별 결과 차이) 기록. A: factcheck 오류로 지적된 DWC 서술을 실기로 확인한 고유 근거(단 factcheck 해소는 소스 기반 수정이 먼저)
