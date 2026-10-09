'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {evalPcieRiserSlots}=require('../../scripts/lib/aspects/pcie_riser.js');
for(const[sku,description,expected]of[
 ['P74700-B21','GPU power cable kit',8],
 ['P83526-B21','GPU power cable kit',8],
 ['UNKNOWN-SINGLE-GPU','GPU power cable kit',4],
 ['UNKNOWN-DUAL-GPU','Dual GPU power cable kit',8],
 ['UNKNOWN-2-GPU','2-GPU power cable kit',8],
 ['UNKNOWN-16PIN','GPU 16-pin power cable kit',4],
 ['UNKNOWN-12VHPWR','12VHPWR Dual GPU power cable kit',8]
])test(sku+' retains evidenced connection capacity',()=>{
 const result=evalPcieRiserSlots([
  {sku:'P76706-B21',description:'HPE DL380a Gen12 CTO',quantity:1},
  {sku:'TEST-GPU',description:'NVIDIA GPU accelerator',quantity:8},
  {sku,description,quantity:4}
 ]);
 assert.equal(result.hasGpuPowerCableKit,true);
 assert.equal(result.gpuPowerCableKitCount,expected);
 assert.equal(result.needsGpuPowerCableKit,expected<8);
});

test('non-GPU storage cable does not receive GPU power cable capacity', () => {
 const result = evalPcieRiserSlots([
  {sku:'P76706-B21',description:'HPE DL380a Gen12 CTO',quantity:1},
  {sku:'TEST-GPU',description:'NVIDIA GPU accelerator',quantity:8},
  {sku:'P76700-B21',description:'HPE ProLiant Compute DL380a Gen12 NVMe to Tri-Mode PCIe FIO Cable Kit',quantity:4}
 ]);
 assert.equal(result.hasGpuPowerCableKit, false);
 assert.equal(result.gpuPowerCableKitCount, 0);
 assert.equal(result.needsGpuPowerCableKit, true);
});

test('generic AC power cord does not receive GPU power cable capacity', () => {
 const result = evalPcieRiserSlots([
  {sku:'P76706-B21',description:'HPE DL380a Gen12 CTO',quantity:1},
  {sku:'TEST-GPU',description:'NVIDIA GPU accelerator',quantity:8},
  {sku:'AF556A',description:'HPE 1.83m 10A C13-C14 Power Cord',quantity:4}
 ]);
 assert.equal(result.hasGpuPowerCableKit, false);
 assert.equal(result.gpuPowerCableKitCount, 0);
 assert.equal(result.needsGpuPowerCableKit, true);
});
