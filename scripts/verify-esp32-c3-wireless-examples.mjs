#!/usr/bin/env node
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtempSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
const source=process.env.ESP_IDF_ARTICLE_SOURCE||'/private/tmp/esp-idf-article-validation-2026-10-23';
const nimble=join(source,'components/bt/host/nimble/nimble');
const tmp=mkdtempSync(join(tmpdir(),'c3-wireless-'));
const base='src/content/blog/embedded/riscv/esp32-c3-mastering/';
const report={timestamp:new Date().toISOString(),checks:[],limits:['Pure native retry policy and pinned NimBLE API headers with upstream dummy NPL header plus explicit fake advertising/GATT/mbuf backend only. No Wi-Fi/BLE stack initialization, actual controller/host execution, RF/phone/AP/connection/security/pairing/provisioning/throughput/power tests. Dummy NPL is compile-time scaffolding, not a port/runtime test. CSFC size1 matches esp_nimble_cfg.h default; actual esp_err header included; transport implementations are explicit fail-if-called stubs; upstream headers marked system headers to suppress macOS queue macro redefinition warnings.']};
function run(cmd,args){const r=spawnSync(cmd,args,{encoding:'utf8',timeout:30000});if(r.error)throw r.error;assert.equal(r.status,0,r.stderr||r.stdout);return r.stdout;}
function fence(chapter,title){const doc=readFileSync(base+chapter,'utf8');const m=[...doc.matchAll(/^```\w+ title="([^"]+)"\n([\s\S]*?)^```\s*$/gm)].find(m=>m[1]===title);assert.ok(m,title);writeFileSync(join(tmp,title),m[2]);}
try{
 assert.equal(run('git',['-C',source,'rev-parse','HEAD']).trim(),'f5c3654a1c2d2a01f7f67def7a0dc48e691f63c0');
 assert.equal(run('git',['-C',nimble,'rev-parse','HEAD']).trim(),'0225775e49669cd4f070400908f73718bddce83b');
 fence('chapter07-wifi-stack.md','c3-wifi-retry.c');for(const t of ['c3-ble-phy.c','c3-ble-advertise.c','c3-battery-gatt.c'])fence('chapter08-ble-gap-gatt.md',t);
 writeFileSync(join(tmp,'test.c'),String.raw`#include <assert.h>
#include <limits.h>
#include <stdlib.h>
#include <string.h>
#include "c3-wifi-retry.c"
#include "esp_err.h"
#include "c3-ble-phy.c"
#include "c3-ble-advertise.c"
#include "c3-battery-gatt.c"
/* Header monitor wrappers need transport symbols; any invocation is outside this fixture. */
int ble_transport_to_ll_cmd_impl(void *p){(void)p;assert(!"unexpected transport call");return -1;}
int ble_transport_to_hs_evt_impl(void *p){(void)p;assert(!"unexpected transport call");return -1;}
int ble_transport_to_ll_acl_impl(struct os_mbuf *p){(void)p;assert(!"unexpected transport call");return -1;}
int ble_transport_to_ll_iso_impl(struct os_mbuf *p){(void)p;assert(!"unexpected transport call");return -1;}
int ble_transport_to_hs_acl_impl(struct os_mbuf *p){(void)p;assert(!"unexpected transport call");return -1;}
int ble_transport_to_hs_iso_impl(struct os_mbuf *p){(void)p;assert(!"unexpected transport call");return -1;}
static int adv_fields_error,adv_start_error,adv_starts,counts_error,add_error,adds,append_error,oom,notify_error,notifications,consumed;static uint8_t expected_level;
int ble_gap_adv_set_fields(const struct ble_hs_adv_fields*f){assert(f->name_len==9&&!memcmp(f->name,"C3-Sensor",9));assert(f->flags==(BLE_HS_ADV_F_DISC_GEN|BLE_HS_ADV_F_BREDR_UNSUP));return adv_fields_error;}
int ble_gap_adv_start(uint8_t own,const ble_addr_t *direct,int32_t duration,const struct ble_gap_adv_params*p,ble_gap_event_fn*cb,void*ctx){(void)ctx;assert(own==BLE_OWN_ADDR_PUBLIC&&!direct&&duration==BLE_HS_FOREVER&&cb&&p->conn_mode==BLE_GAP_CONN_MODE_UND);adv_starts++;return adv_start_error;}
int ble_gap_set_prefered_le_phy(uint16_t c,uint8_t tx,uint8_t rx,uint16_t opts){assert(c==7&&tx==BLE_GAP_LE_PHY_CODED_MASK&&rx==BLE_GAP_LE_PHY_CODED_MASK&&opts==BLE_GAP_LE_PHY_CODED_S8);return BLE_HS_ENOTSUP;}
int ble_gatts_count_cfg(const struct ble_gatt_svc_def*s){assert(s[0].type==BLE_GATT_SVC_TYPE_PRIMARY&&s[1].type==0);assert(((const ble_uuid16_t*)s[0].uuid)->value==0x180f);assert(((const ble_uuid16_t*)s[0].characteristics[0].uuid)->value==0x2a19);return counts_error;}
int ble_gatts_add_svcs(const struct ble_gatt_svc_def*s){adds++;if(!add_error)*s[0].characteristics[0].val_handle=42;return add_error;}
int os_mbuf_append(struct os_mbuf*m,const void*p,uint16_t n){assert(m&&p&&n==1&&*(const uint8_t*)p==battery_level);return append_error;}
struct os_mbuf *ble_hs_mbuf_from_flat(const void*p,uint16_t n){assert(n==1&&*(const uint8_t*)p==expected_level);return oom?NULL:malloc(sizeof(struct os_mbuf));}
int ble_gatts_notify_custom(uint16_t c,uint16_t h,struct os_mbuf*p){assert(c==7&&h==42&&p);notifications++;free(p);consumed++;return notify_error;}
static int event(struct ble_gap_event*e,void*arg){(void)e;(void)arg;return 0;}
int main(void){uint32_t delay=99;uint32_t expected[]={1000,2000,4000,8000,16000,30000};for(unsigned i=0;i<6;i++)assert(c3_wifi_retry_delay(i,&delay)&&delay==expected[i]);delay=99;assert(!c3_wifi_retry_delay(6,&delay)&&delay==99);assert(!c3_wifi_retry_delay(UINT_MAX,&delay));assert(!c3_wifi_retry_delay(0,0));
assert(c3_request_coded_phy(7)==BLE_HS_ENOTSUP);assert(c3_advertise(BLE_OWN_ADDR_PUBLIC,0,0)==BLE_HS_EINVAL);adv_fields_error=BLE_HS_EINVAL;assert(c3_advertise(BLE_OWN_ADDR_PUBLIC,event,0)==adv_fields_error&&adv_starts==0);adv_fields_error=0;adv_start_error=BLE_HS_EALREADY;assert(c3_advertise(BLE_OWN_ADDR_PUBLIC,event,0)==adv_start_error&&adv_starts==1);adv_start_error=0;assert(c3_advertise(BLE_OWN_ADDR_PUBLIC,event,0)==0);
assert(c3_battery_notify(7,true,50)==BLE_HS_EINVAL);counts_error=BLE_HS_ENOMEM;assert(c3_battery_register()==counts_error&&adds==0);counts_error=0;add_error=BLE_HS_ENOMEM;assert(c3_battery_register()==add_error&&battery_value_handle==0);add_error=0;assert(c3_battery_register()==0&&battery_value_handle==42);assert(c3_battery_notify(BLE_HS_CONN_HANDLE_NONE,true,50)==BLE_HS_EINVAL);assert(c3_battery_notify(7,false,50)==BLE_HS_EINVAL);assert(c3_battery_notify(7,true,101)==BLE_HS_EINVAL&&notifications==0);
expected_level=50;oom=1;assert(c3_battery_notify(7,true,50)==BLE_HS_ENOMEM&&notifications==0);oom=0;notify_error=BLE_HS_ENOTCONN;assert(c3_battery_notify(7,true,50)==notify_error&&consumed==1);expected_level=100;notify_error=0;assert(c3_battery_notify(7,true,100)==0&&consumed==2);
struct os_mbuf packet={0};struct ble_gatt_access_ctxt ctx={.op=BLE_GATT_ACCESS_OP_READ_CHR,.om=&packet};assert(battery_read(7,42,&ctx,0)==0);append_error=1;assert(battery_read(7,42,&ctx,0)==BLE_ATT_ERR_INSUFFICIENT_RES);ctx.op=BLE_GATT_ACCESS_OP_WRITE_CHR;assert(battery_read(7,42,&ctx,0)==BLE_ATT_ERR_UNLIKELY);assert(23-3==20&&247-3==244);}
`);
 writeFileSync(join(tmp,'sdkconfig.h'),'');
 const inc=[tmp,join(source,'components/esp_common/include'),...['porting/nimble/include','porting/npl/dummy/include','nimble/include','nimble/host/include','nimble/transport/include'].map(p=>join(nimble,p))].flatMap(p=>['-isystem',p]);
 run('clang',['-std=c11','-DMYNEWT_VAL_BLE_GATT_CSFC_SIZE=1','-Wall','-Wextra','-Werror','-fsanitize=address,undefined',...inc,join(tmp,'test.c'),'-o',join(tmp,'test')]);run(join(tmp,'test'),[]);
 report.checks.push({name:'retry policy and actual pinned NimBLE API fences with explicit fake backend',status:'PASS',cases:'bounded6delays/null/UINT_MAX, PHYargs+rejection, adverrorpropagation, GATTserviceUUID/val_handle/count+addfailure, invalidhandle/unsubscribed/invalidbattery, allocfailure, mbufconsumed-on-notifyerror/success, readappendfailure and wrongop underASan/UBSan'});report.result='PASS';
}catch(error){report.result='FAIL';report.error=error.stack;process.exitCode=1;}
writeFileSync('reports/adsense-audit/fixes/esp32-c3-wireless-2026-10-23.log',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
