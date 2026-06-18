#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'content', 'blog', 'embedded', 'riscv', 'esp32-c3-mastering');
const DRY = process.argv.includes('--dry-run');

const PLAN = [
  [ 1, 'chapter01-overview.md',            'ESP32-C3 분석 — Espressif가 Xtensa에서 RISC-V로 갈아탄 이유',                  '2026-05-20T09:01:00'],
  [ 2, 'chapter02-riscv-core.md',          'ESP32-C3 RISC-V 코어 분석 — RV32IMC·PMP·인터럽트 컨트롤러',                    '2026-05-20T09:02:00'],
  [ 3, 'chapter03-memory-flash.md',        'ESP32-C3 메모리 맵과 플래시 — SPIFFS·LittleFS 파일시스템 선택',                 '2026-05-20T09:03:00'],
  [ 4, 'chapter04-gpio-ledc-pwm.md',       'ESP32-C3 디지털 출력 — GPIO·LEDC·MCPWM 세 모드 비교',                           '2026-05-20T09:04:00'],
  [ 5, 'chapter05-uart-spi-i2c-i2s.md',    'ESP32-C3 시리얼 통신 4종 — UART·SPI·I2C·I2S 분석',                              '2026-05-20T09:05:00'],
  [ 6, 'chapter06-adc-touch.md',           'ESP32-C3 ADC와 터치 센서 — 아날로그 입력 처리',                                 '2026-05-20T09:06:00'],
  [ 7, 'chapter07-wifi-stack.md',          'ESP32-C3 WiFi 4 스택 — Station·SoftAP·Mesh 구성',                                '2026-05-20T09:07:00'],
  [ 8, 'chapter08-ble-gap-gatt.md',        'ESP32-C3 BLE 5.0 분석 — GAP·GATT·Coded PHY',                                     '2026-05-20T09:08:00'],
  [ 9, 'chapter09-esp-idf-build.md',       'ESP-IDF 빌드 시스템 분석 — 컴포넌트 구조와 CMake 통합',                          '2026-05-20T09:09:00'],
  [10, 'chapter10-freertos.md',            'ESP32-C3 위 FreeRTOS — 단일 코어 RTOS 활용 전략',                                 '2026-05-20T09:10:00'],
  [11, 'chapter11-security.md',            'ESP32-C3 보안 분석 — Secure Boot·Flash Encryption·eFuse',                         '2026-05-20T09:11:00'],
  [12, 'chapter12-power-management.md',    'ESP32-C3 전력 관리 — Modem·Light·Deep Sleep와 Wake 소스',                         '2026-05-20T09:12:00'],
];

function applyEdit(filePath, newTitle, newDate) {
  const raw = readFileSync(filePath, 'utf8');
  const m = raw.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  const [, fm, body] = m;
  let newFm = fm.replace(/^title:\s*.*$/m, `title: "${newTitle}"`).replace(/^date:\s*.*$/m, `date: ${newDate}`);
  if (!DRY) writeFileSync(filePath, `---\n${newFm}\n---\n${body}`);
}

let count = 0;
for (const [, file, title, date] of PLAN) { applyEdit(join(DIR, file), title, date); count++; }
console.log(`${DRY ? 'DRY RUN' : 'APPLIED'}: ${count} files`);
