import {chromium} from 'playwright-core';
import assert from 'node:assert/strict';
const browser=await chromium.launch({headless:true});
const out=new URL('./',import.meta.url);
const title=`Demo UX workflow ${Date.now()}`;
async function login(page,role){await page.goto('http://127.0.0.1:18086',{waitUntil:'networkidle'});await page.locator('input[type=email]').fill(`demo.${role}@lab.test`);await page.locator('input[type=password]').fill('Batch7User!Passphrase');await page.getByRole('button',{name:/ĐĂNG NHẬP VÀO HỆ THỐNG/i}).click();await page.locator('.workspace-home').waitFor();}
async function shot(page,name){await page.waitForLoadState('networkidle');await page.waitForTimeout(300);await page.screenshot({path:decodeURIComponent(new URL(name+'.png',out).pathname).replace(/^\/([A-Z]:)/i,'$1'),animations:'disabled'});}
try{
 const student=await browser.newPage({viewport:{width:390,height:844}});await login(student,'student');
 await student.getByRole('button',{name:'Xem lịch và đặt chỗ',exact:true}).click();await student.waitForLoadState('networkidle');
 await student.getByRole('button',{name:'Đặt Khung Giờ Mới'}).click();
 const id=await student.locator('#booking-resource-select option').filter({hasText:'DEMO-ROOM-01'}).getAttribute('value');await student.locator('#booking-resource-select').selectOption(id);
 await student.locator('#booking-title').fill(title);await student.locator('#booking-purpose').fill('Dữ liệu thử nghiệm riêng để kiểm tra giao diện và quy trình.');
 await student.locator('#booking-start-time').fill('14:00');await student.locator('#booking-end-time').fill('15:00');
 await student.getByRole('button',{name:/Xác nhận đặt lịch/i}).click();await student.locator('#created-booking-status').waitFor();
 await shot(student,'booking_success_mobile');
 await student.getByRole('button',{name:'Xem lịch đặt của tôi'}).click();await student.locator('.operation-card').filter({hasText:title}).waitFor();await shot(student,'booking_created_mobile');
 const staff=await browser.newPage({viewport:{width:1440,height:1000}});await login(staff,'staff');await staff.getByRole('button',{name:'Mở hàng đợi xử lý'}).click();
 const card=()=>staff.locator('.operation-card').filter({hasText:title});
 await card().getByRole('button',{name:'Duyệt',exact:true}).click();await shot(staff,'approval_desktop');await staff.getByRole('dialog').getByRole('button',{name:'Duyệt booking',exact:true}).click();await staff.getByRole('dialog').waitFor({state:'hidden'});
 await staff.getByRole('button',{name:/Chờ bàn giao/}).click();await card().getByRole('button',{name:'Bàn giao',exact:true}).click();await staff.locator('#booking-condition-evidence').fill('Tình huống kiểm thử riêng: xác nhận ngoại quan và phụ kiện.');await shot(staff,'handover_desktop');await staff.getByRole('dialog').getByRole('button',{name:'Xác nhận bàn giao'}).click();await staff.getByRole('dialog').waitFor({state:'hidden'});
 await staff.getByRole('button',{name:/Đang sử dụng/}).click();await card().getByRole('button',{name:'Nhận hoàn trả'}).click();await staff.locator('#booking-condition-evidence').fill('Tình huống kiểm thử riêng: xác nhận tài nguyên hoàn trả.');await shot(staff,'return_desktop');await staff.getByRole('dialog').getByRole('button',{name:'Xác nhận hoàn trả'}).click();await staff.getByRole('dialog').waitFor({state:'hidden'});
 await staff.getByRole('button',{name:/Chờ hoàn tất/}).click();await card().getByRole('button',{name:'Hoàn tất',exact:true}).click();await shot(staff,'completion_desktop');await staff.getByRole('dialog').getByRole('button',{name:'Hoàn tất workflow'}).click();await staff.getByRole('dialog').waitFor({state:'hidden'});
 await staff.getByRole('button',{name:/Lịch sử/}).first().click();await card().getByRole('button',{name:'Lịch sử',exact:true}).click();await staff.getByRole('dialog').getByText('Tạo yêu cầu',{exact:true}).waitFor();await shot(staff,'booking_history_desktop');
 const history=await staff.getByRole('dialog').innerText();for(const s of ['Tạo yêu cầu','Duyệt booking','Bàn giao tài nguyên','Tiếp nhận hoàn trả','Hoàn tất workflow'])assert.ok(history.includes(s));
 // Keyboard focus wraps inside a real operational dialog and restores on Escape.
 await staff.getByRole('button',{name:'Đóng hộp thoại',exact:true}).focus();await staff.keyboard.press('Shift+Tab');assert.equal(await staff.getByRole('dialog').evaluate(el=>el.contains(document.activeElement)),true);await staff.keyboard.press('Escape');await staff.getByRole('dialog').waitFor({state:'hidden'});assert.equal(await card().getByRole('button',{name:'Lịch sử',exact:true}).evaluate(el=>el===document.activeElement),true);
 console.log('PASS persisted UI workflow, mobile success navigation, all five history transitions, focus containment/restoration.');
}finally{await browser.close();}
