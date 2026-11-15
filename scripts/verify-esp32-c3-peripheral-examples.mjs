#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
const source=process.env.ESP_IDF_ARTICLE_SOURCE||'/private/tmp/esp-idf-article-validation-2026-10-23';
const pin='f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0';
let doc=readFileSync('src/content/blog/embedded/riscv/esp32-c3-mastering/chapter04-gpio-ledc-pwm.md','utf8');
const tmp=mkdtempSync(join(tmpdir(),'c3-peripheral-'));
const report={timestamp:new Date().toISOString(),pin,checks:[],limits:['Actual pinned driver headers with explicit fake LEDC/I2C/ADC backends and pure arithmetic/format helpers on host only. No full ESP-IDF build, GPIO ISR/FreeRTOS scheduling, peripheral hardware, audio/DMA scheduling, ADC readings/calibration accuracy, waveforms, motor/servo, current/voltage or electrical validation.']};
function run(cmd,args,options={}){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:30000,...options});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
function fence(title){const m=[...doc.matchAll(/^```\w+ title="([^"]+)"\n([\s\S]*?)^```\s*$/gm)].find(m=>m[1]===title);assert.ok(m,title);writeFileSync(join(tmp,title),m[2]);}
try{
 assert.equal(run('git',['-C',source,'rev-parse','HEAD']).trim(),pin);fence('c3-ledc.c');fence('c3-pulse-duty.c');
 writeFileSync(join(tmp,'sdkconfig.h'),'#define CONFIG_IDF_TARGET_ESP32C3 1\n');
 writeFileSync(join(tmp,'test.c'),String.raw`#include <assert.h>
#include "c3-ledc.c"
#include "c3-pulse-duty.c"
static int timer_calls,channel_calls,set_calls,update_calls;static esp_err_t timer_error,channel_error,set_error,update_error;
esp_err_t ledc_timer_config(const ledc_timer_config_t *c){timer_calls++;assert(c->speed_mode==LEDC_LOW_SPEED_MODE&&c->duty_resolution==LEDC_TIMER_13_BIT&&c->freq_hz==5000);return timer_error;}
esp_err_t ledc_channel_config(const ledc_channel_config_t *c){channel_calls++;assert(c->gpio_num==5&&c->duty==0);return channel_error;}
esp_err_t ledc_set_duty(ledc_mode_t m,ledc_channel_t c,uint32_t d){assert(m==LEDC_LOW_SPEED_MODE&&c==LEDC_CHANNEL_0&&d<=8191);set_calls++;return set_error;}
esp_err_t ledc_update_duty(ledc_mode_t m,ledc_channel_t c){assert(m==LEDC_LOW_SPEED_MODE&&c==LEDC_CHANNEL_0);update_calls++;return update_error;}
int main(void){uint32_t d=0;assert(SOC_LEDC_TIMER_BIT_WIDTH==14&&SOC_LEDC_CHANNEL_NUM==6&&SOC_LEDC_TIMER_NUM==4);
#ifdef SOC_MCPWM_SUPPORTED
#error unexpected C3 MCPWM support
#endif
assert(setup_ledc()==ESP_OK&&channel_calls==1);timer_error=ESP_FAIL;assert(setup_ledc()==ESP_FAIL&&channel_calls==1);timer_error=0;channel_error=ESP_ERR_INVALID_ARG;assert(setup_ledc()==channel_error);assert(set_brightness(8192)==ESP_ERR_INVALID_ARG&&set_calls==0);assert(set_brightness(0)==ESP_OK&&update_calls==1);assert(set_brightness(8191)==ESP_OK&&update_calls==2);set_error=ESP_FAIL;assert(set_brightness(1)==ESP_FAIL&&update_calls==2);set_error=0;update_error=ESP_FAIL;assert(set_brightness(1)==ESP_FAIL);
assert(c3_pulse_duty(1000,20000,14,&d)&&d==819);assert(c3_pulse_duty(2000,20000,14,&d)&&d==1638);assert(c3_pulse_duty(0,20000,14,&d)&&d==0);assert(c3_pulse_duty(0xfffffffeu,0xffffffffu,14,&d)&&d==16383);assert(!c3_pulse_duty(1,0,14,&d));assert(!c3_pulse_duty(20000,20000,14,&d));assert(!c3_pulse_duty(1,20000,0,&d));assert(!c3_pulse_duty(1,20000,15,&d));assert(!c3_pulse_duty(1,20000,14,0));}
`);
 const includes=[tmp,...['esp_common/include','esp_hw_support/include','hal/include','hal/esp32c3/include','soc/esp32c3/include','esp_rom/include','esp_rom/esp32c3/include','esp_driver_gpio/include','esp_driver_ledc/include'].map(p=>join(source,'components',p))].flatMap(p=>['-I',p]);
 run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',...includes,join(tmp,'test.c'),'-o',join(tmp,'test')]);run(join(tmp,'test'),[]);
 report.checks.push({name:'actual C3 driver headers + fake LEDC backend and pulse arithmetic',status:'PASS',cases:'capabilities14bit/6channel/4timer/noMCPWM, timer/channel/set/update failures, invalid duty no backend call,0/8191, pulse0/1ms/2ms/large/scope/null cases underASan/UBSan'});
 doc=readFileSync('src/content/blog/embedded/riscv/esp32-c3-mastering/chapter05-uart-spi-i2c-i2s.md','utf8');
 for(const name of ['c3-i2c-read.c','c3-oled-write.c','c3-stereo.c'])fence(name);
 writeFileSync(join(tmp,'serial-test.c'),String.raw`#include <assert.h>
#include <string.h>
#include "c3-i2c-read.c"
static void *oled_alloc(size_t n);
static void oled_free(void *p);
#define malloc oled_alloc
#define free oled_free
#include "c3-oled-write.c"
#undef malloc
#undef free
#include "c3-stereo.c"
static int calls,oom,free_calls;
static void *oled_alloc(size_t n){return oom?NULL:malloc(n);}
static void oled_free(void *p){free_calls++;free(p);}
static esp_err_t io_error;static size_t expected_size;static uint8_t expected[1024];
esp_err_t i2c_master_transmit_receive(i2c_master_dev_handle_t d,const uint8_t *w,size_t wn,uint8_t *r,size_t rn,int timeout){assert(d&&wn==1&&*w==0x12&&rn==4&&timeout==100);calls++;if(!io_error)memset(r,7,rn);return io_error;}
esp_err_t i2c_master_transmit(i2c_master_dev_handle_t d,const uint8_t *w,size_t n,int timeout){assert(d&&timeout==200&&n==expected_size+1&&w[0]==0x40&&!memcmp(w+1,expected,expected_size));calls++;return io_error;}
int main(void){i2c_master_dev_handle_t d=(i2c_master_dev_handle_t)(uintptr_t)1;uint8_t data[4];assert(c3_read_register(d,0x12,data,4)==ESP_OK&&data[0]==7);io_error=ESP_ERR_TIMEOUT;assert(c3_read_register(d,0x12,data,4)==io_error);int previous=calls;assert(c3_read_register(d,0,0,4)==ESP_ERR_INVALID_ARG);assert(c3_read_register(d,0,data,257)==ESP_ERR_INVALID_ARG);assert(c3_read_register(0,0,data,1)==ESP_ERR_INVALID_ARG);assert(calls==previous);io_error=0;for(size_t i=0;i<sizeof expected;i++)expected[i]=(uint8_t)i;expected_size=1024;assert(c3_oled_write(d,expected,1024)==ESP_OK);io_error=ESP_FAIL;assert(c3_oled_write(d,expected,1024)==ESP_FAIL);previous=calls;assert(c3_oled_write(d,expected,1025)==ESP_ERR_INVALID_ARG);assert(c3_oled_write(d,expected,0)==ESP_ERR_INVALID_ARG);assert(c3_oled_write(d,0,1)==ESP_ERR_INVALID_ARG);assert(c3_oled_write(0,expected,1)==ESP_ERR_INVALID_ARG);assert(calls==previous);assert(free_calls==2);oom=1;assert(c3_oled_write(d,expected,1024)==ESP_ERR_NO_MEM&&calls==previous&&free_calls==2);
int16_t pcm[512];double phase=0;assert(c3_stereo_sine(pcm,512,256,44100,440,&phase));for(int i=0;i<256;i++){assert(pcm[2*i]==pcm[2*i+1]);assert(pcm[2*i]>=-8000&&pcm[2*i]<=8000);}assert(pcm[0]==0&&phase>=0&&phase<6.284);double saved=phase;assert(!c3_stereo_sine(pcm,1,1,44100,440,&phase)&&phase==saved);assert(!c3_stereo_sine(pcm,512,257,44100,440,&phase));assert(!c3_stereo_sine(pcm,512,1,0,440,&phase));assert(!c3_stereo_sine(pcm,512,1,44100,22050,&phase));assert(!c3_stereo_sine(pcm,512,1,44100,NAN,&phase));phase=INFINITY;assert(!c3_stereo_sine(pcm,512,1,44100,440,&phase));}
`);
 const serialIncludes=[...includes,'-I',join(source,'components/esp_driver_i2c/include')];
 run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',...serialIncludes,join(tmp,'serial-test.c'),'-o',join(tmp,'serial-test')]);run(join(tmp,'serial-test'),[]);
 report.checks.push({name:'actual I2C headers + explicit fake blocking IO backend; stereo frame helper',status:'PASS',cases:'read/write bytes and ms timeouts, oversized/null/zero rejected before IO, propagated timeouts/errors, exact1025-byte OLED packet/free and allocation-failure no IO, bounded stereo L/R samples and capacity/frequency/rate/phase negatives ASan/UBSan'});
 doc=readFileSync('src/content/blog/embedded/riscv/esp32-c3-mastering/chapter06-adc-touch.md','utf8');fence('c3-adc.c');fence('c3-adc-decode.c');
 writeFileSync(join(tmp,'adc-test.c'),String.raw`#include <assert.h>
#include <string.h>
#include "c3-adc.c"
#include "c3-adc-decode.c"
static esp_err_t new_error,config_error,calibration_error,read_error,convert_error,delete_cali_error,delete_unit_error;static int reads,converts,deletes,raw_value=100;
static const adc_oneshot_unit_handle_t unit_handle=(adc_oneshot_unit_handle_t)(uintptr_t)1;static const adc_cali_handle_t cali_handle=(adc_cali_handle_t)(uintptr_t)2;
esp_err_t adc_oneshot_new_unit(const adc_oneshot_unit_init_cfg_t*c,adc_oneshot_unit_handle_t*h){assert(c->unit_id==ADC_UNIT_1);if(!new_error)*h=unit_handle;return new_error;}
esp_err_t adc_oneshot_config_channel(adc_oneshot_unit_handle_t h,adc_channel_t ch,const adc_oneshot_chan_cfg_t*c){assert(h==unit_handle&&ch==ADC_CHANNEL_0&&c->atten==ADC_ATTEN_DB_12&&c->bitwidth==ADC_BITWIDTH_12);return config_error;}
esp_err_t adc_cali_create_scheme_curve_fitting(const adc_cali_curve_fitting_config_t*c,adc_cali_handle_t*h){assert(c->chan==ADC_CHANNEL_0&&c->unit_id==ADC_UNIT_1);if(!calibration_error)*h=cali_handle;return calibration_error;}
esp_err_t adc_cali_delete_scheme_curve_fitting(adc_cali_handle_t h){assert(h==cali_handle);return delete_cali_error;}
esp_err_t adc_oneshot_del_unit(adc_oneshot_unit_handle_t h){assert(h==unit_handle);deletes++;return delete_unit_error;}
esp_err_t adc_oneshot_read(adc_oneshot_unit_handle_t h,adc_channel_t ch,int*out){assert(h==unit_handle&&ch==ADC_CHANNEL_0);reads++;if(!read_error)*out=raw_value;return read_error;}
esp_err_t adc_cali_raw_to_voltage(adc_cali_handle_t h,int raw,int*out){assert(h==cali_handle&&raw==raw_value);converts++;if(!convert_error)*out=raw*2;return convert_error;}
int main(void){c3_adc_t ctx={0};int mv=-1;assert(c3_adc_open(&ctx)==ESP_OK);assert(c3_adc_open(&ctx)==ESP_ERR_INVALID_STATE);assert(c3_adc_read_mean_mv(&ctx,64,&mv)==ESP_OK&&mv==200&&reads==64&&converts==64);mv=-1;read_error=ESP_ERR_TIMEOUT;assert(c3_adc_read_mean_mv(&ctx,2,&mv)==read_error&&mv==-1);read_error=0;convert_error=ESP_FAIL;assert(c3_adc_read_mean_mv(&ctx,2,&mv)==convert_error&&mv==-1);convert_error=0;raw_value=4096;assert(c3_adc_read_mean_mv(&ctx,1,&mv)==ESP_ERR_INVALID_RESPONSE&&mv==-1);raw_value=100;assert(c3_adc_read_mean_mv(&ctx,0,&mv)==ESP_ERR_INVALID_ARG);assert(c3_adc_read_mean_mv(&ctx,65,&mv)==ESP_ERR_INVALID_ARG);assert(c3_adc_close(&ctx)==ESP_OK&&!ctx.unit&&!ctx.calibration);assert(c3_adc_close(&ctx)==ESP_OK);assert(c3_adc_read_mean_mv(&ctx,1,&mv)==ESP_ERR_INVALID_STATE);
new_error=ESP_ERR_NO_MEM;assert(c3_adc_open(&ctx)==new_error&&!ctx.unit);new_error=0;config_error=ESP_FAIL;assert(c3_adc_open(&ctx)==ESP_FAIL&&!ctx.unit);config_error=0;calibration_error=ESP_ERR_NOT_SUPPORTED;assert(c3_adc_open(&ctx)==calibration_error&&!ctx.unit&&!ctx.calibration);calibration_error=0;assert(c3_adc_open(&ctx)==ESP_OK);delete_cali_error=ESP_FAIL;assert(c3_adc_close(&ctx)==ESP_FAIL&&ctx.unit&&ctx.calibration);delete_cali_error=0;delete_unit_error=ESP_FAIL;assert(c3_adc_close(&ctx)==ESP_FAIL&&ctx.unit&&!ctx.calibration);delete_unit_error=0;assert(c3_adc_close(&ctx)==ESP_OK&&!ctx.unit);assert(c3_adc_open(0)==ESP_ERR_INVALID_ARG&&c3_adc_close(0)==ESP_ERR_INVALID_ARG);
uint8_t bytes[]={0,0,0,0,0xff,0x0f,0,0};uint16_t out[2]={99,99};size_t count=99;assert(c3_adc_decode(bytes,8,out,2,&count)&&count==2&&out[0]==0&&out[1]==4095);out[0]=99;count=99;bytes[6]=1;assert(!c3_adc_decode(bytes,8,out,2,&count)&&count==99&&out[0]==99);bytes[6]=0;bytes[5]=0x2f;assert(!c3_adc_decode(bytes,8,out,2,&count));bytes[5]=0x0f;assert(!c3_adc_decode(bytes,7,out,2,&count));assert(!c3_adc_decode(bytes,8,out,1,&count));assert(!c3_adc_decode(0,8,out,2,&count));assert(!c3_adc_decode(bytes,0,out,2,&count));uint8_t unaligned[9];memcpy(unaligned+1,bytes,8);assert(c3_adc_decode(unaligned+1,8,out,2,&count));}
`);
 const adcIncludes=[...includes,'-I',join(source,'components/esp_adc/include'),'-I',join(source,'components/esp_adc/include/esp_adc'),'-I',join(source,'components/esp_adc/esp32c3/include')];
 run('clang',['-std=c11','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',...adcIncludes,join(tmp,'adc-test.c'),'-o',join(tmp,'adc-test')]);run(join(tmp,'adc-test'),[]);
 report.checks.push({name:'actual ADC headers + explicit fake calibration/oneshot backend; golden TYPE2 byte decoder',status:'PASS',cases:'open/config/calibration/read/conversion/delete failures, retained handles and retry,0/65count, invalid raw4096, output unchanged on failure, 0/4095golden bytes, wrongunit/channel,short/capacity/null/unaligned ASan/UBSan'});
 report.result='PASS';

}catch(error){report.result='FAIL';report.error=error.stack;process.exitCode=1;}
writeFileSync('reports/adsense-audit/fixes/esp32-c3-peripheral-2026-10-23.log',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
