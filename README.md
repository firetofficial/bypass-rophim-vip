<p align="center">
  <img src="https://img.shields.io/badge/Status-Archived-lightgrey?style=for-the-badge" alt="Archived" />
  <img src="https://img.shields.io/badge/Rophim-RIP%20🕊️-black?style=for-the-badge" alt="Rophim RIP" />
  <img src="https://img.shields.io/badge/License-MIT-blue?style=for-the-badge" alt="License" />
</p>

<h1 align="center">🔓 Bypass Rophim VIP — Source Code Disclosure</h1>

<p align="center">
  <b>Client-Side Privilege Escalation via XHR Response Tampering</b><br/>
  <sub>Một bài phân tích kỹ thuật về lỗ hổng phân quyền phía client trên hệ thống Rophim.</sub>
</p>

<p align="center">
  <img width="90%" alt="Rophim VIP Bypass Demo" src="https://github.com/user-attachments/assets/41329834-26f8-4c81-bac1-8c7b18e11853" />
</p>

---

## 📖 Bối cảnh

**Rophim** — một trong những nền tảng xem phim "không chính thống" từng vận hành bài bản và chỉnh chu bậc nhất mà mình từng thấy. Từ UI/UX, hệ thống VIP, cho đến cơ chế coin — mọi thứ được xây dựng rất nghiêm túc, gần như cảm giác đang dùng một sản phẩm thương mại thực thụ.

Thế nhưng, trong quá trình vọc vạch lúc rảnh, mình vô tình phát hiện một **lỗ hổng nghiêm trọng** trong cách hệ thống xử lý phân quyền người dùng — và thật sự khá bất ngờ khi một hệ thống chỉnh chu đến vậy lại dính "quả" này :V

> Rophim hiện đã **ngừng hoạt động**, nên mình quyết định public toàn bộ source code gốc (chưa mã hóa) cùng bài phân tích kỹ thuật chi tiết, vì mục đích **nghiên cứu và học tập**.

---

## 🐛 Phân tích lỗ hổng

### Tên gọi kỹ thuật
**Client-Side Privilege Escalation via XHR Response Tampering**
> Dịch nôm na: Leo quyền phía client bằng cách can thiệp vào response (phản hồi) của các request XHR.

### Vấn đề cốt lõi

Hệ thống Rophim **tin tưởng hoàn toàn vào dữ liệu trả về từ API** để quyết định quyền hạn của người dùng trên giao diện. Nói cách khác, việc kiểm tra "anh là VIP hay không?" diễn ra hoàn toàn ở phía trình duyệt (client-side) — thay vì được xác thực lại ở phía server mỗi khi thực hiện hành động cần quyền.

Điều này giống như việc bảo vệ nhà hàng hỏi khách *"Anh có phải VIP không?"* — rồi **tin luôn** câu trả lời mà không cần kiểm tra danh sách. 🤷

### Cơ chế khai thác

Lỗ hổng được khai thác bằng kỹ thuật **XHR Hooking** (hay còn gọi là **Monkey Patching**) — một kỹ thuật can thiệp vào cơ chế gửi/nhận request HTTP của trình duyệt:

1. **Hook (gắn câu)** vào `XMLHttpRequest.prototype.open` và `XMLHttpRequest.prototype.send` — tức là "đứng giữa" mọi request mà trang web gửi đi.
2. **Lắng nghe** (intercept) response từ API endpoint `/v1/user/info` — đây chính là API mà Rophim dùng để lấy thông tin người dùng.
3. **Sửa đổi response** trước khi trang web kịp đọc, thay đổi các trường quan trọng:
   - `is_vip`: `false` → `true` *(kích hoạt VIP)*
   - `role`: `"user"` → `"vip"` *(nâng cấp vai trò)*
   - `vip_expires_at`: set thời hạn + 10 năm *(VIP "vĩnh viễn")*
   - `coin_balance`: → `999,999,999` *(coin vô hạn)*

4. Ghi đè `responseText` và `response` bằng `Object.defineProperty` — để khi trang web đọc response, nó nhận được **dữ liệu đã bị chỉnh sửa**, hoàn toàn "trong suốt" (transparent) và không gây lỗi.

### 🔴 Easter Egg: Quyền Admin

Phần thú vị nhất: nếu thay `data.result.role` thành `"admin"`, giao diện sẽ **mở khóa luôn các chức năng quản trị** — bao gồm khả năng **ghim** và **xoá bình luận** của người khác. Điều này cho thấy toàn bộ hệ thống phân quyền (authorization) được xử lý hoàn toàn ở phía client mà không có cơ chế bảo vệ nào phía server.

> ⚠️ Đây là một bài học kinh điển: **Không bao giờ tin tưởng dữ liệu từ client.** Authorization luôn phải được enforce phía server.

---

## 🔬 Source Code (Chưa mã hóa)

File [`source.js`](./source.js) — source code gốc, sạch sẽ, chưa qua bất kỳ layer obfuscation nào:

```javascript
// ==UserScript==
// @name         Rophim Full VIP
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Bypass VIP + Coin trên Rophim
// @author       FireT
// @match        *://www.rophim.me/*
// @run-at       document-start
// @grant        none
// ==/UserScript==

(function () {
    // Lưu lại reference gốc của XMLHttpRequest
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;

    // Hook vào .open() để "ghi nhớ" URL của mỗi request
    XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    // Hook vào .send() để can thiệp response
    XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
            try {
                // Chỉ target endpoint lấy thông tin user
                if (this._url.includes("/v1/user/info")) {
                    let data = JSON.parse(this.responseText);

                    // 🔑 Sửa đổi các trường phân quyền
                    data.result.is_vip = true;              // Kích hoạt VIP
                    data.result.role = "vip";               // Nâng role thành VIP
                    // data.result.role = "admin";          // 👀 Thử đổi thành admin xem...
                    data.result.vip_expires_at = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;  // +10 năm
                    data.result.coin_balance = 999999999;   // Coin vô hạn
                    data.result.name = "🔥FireT🔥";

                    // Ghi đè response — trang web sẽ đọc được data đã sửa
                    Object.defineProperty(this, 'responseText', { value: JSON.stringify(data) });
                    Object.defineProperty(this, 'response', { value: JSON.stringify(data) });
                }
            } catch (e) {
                console.error("Fake VIP Error:", e);
            }
        });
        return send.apply(this, arguments);
    };
})();
```

> 📌 Toàn bộ chỉ ~30 dòng code thực thi. Đơn giản, nhưng hiệu quả đáng sợ.

### File `rophim_vip.js` — Phiên bản đã mã hóa

File [`rophim_vip.js`](./rophim_vip.js) là phiên bản obfuscated (mã hóa) của source code trên — được dùng trong giai đoạn Rophim còn hoạt động. Kỹ thuật obfuscation ở đây sử dụng **JSFuck-style encoding** — biến toàn bộ code thành tổ hợp các ký tự `[]`, `()`, `+`, `!` rồi eval bằng chính JavaScript engine.

Mục đích của việc mã hóa ban đầu là để **bảo vệ logic script** — vì lúc đó mình chưa có ý định public source. Mình có gắn kèm một URL key bên trong bản mã hóa, phòng trường hợp cần **vô hiệu hóa script từ xa** nếu có vấn đề phát sinh. Nắm đằng chuôi bao giờ cũng tốt hơn, nhỉ? 😏

---

## 🌐 Phạm vi ảnh hưởng

Cơ chế khai thác này **không chỉ giới hạn ở Rophim**. Bất kỳ nền tảng nào dựa vào response API phía client để phân quyền đều có thể bị ảnh hưởng tương tự.

> **Lưu ý**: Cơ chế hoạt động tương tự cũng đã được xác nhận trên nền tảng **Rổ Bóng (robong)** — một hệ thống có kiến trúc phân quyền client-side gần như y hệt.

---

## 🛡️ Bài học bảo mật (Dành cho Developers)

| ❌ Sai | ✅ Đúng |
|--------|---------|
| Kiểm tra quyền ở client | Kiểm tra quyền ở **server** (middleware/guard) |
| Tin tưởng response API không bị sửa | **Validate** quyền ở mọi endpoint cần bảo vệ |
| Chỉ ẩn UI để hạn chế quyền | **Enforce** quyền ở tầng business logic |
| Dùng obfuscation để bảo vệ logic | Obfuscation ≠ Security, chỉ là **delay** |

### Recommendations
1. **Server-Side Authorization**: Mọi action nhạy cảm (xem VIP content, admin actions) phải được validate phía server bằng session/token, không phải bằng field trong response.
2. **Principle of Least Privilege**: Chỉ trả về thông tin cần thiết trong API response. Không expose trường `role` hay `is_vip` nếu client không cần dùng trực tiếp.
3. **Response Integrity**: Cân nhắc sử dụng signed response hoặc checksum nếu dữ liệu response có tính nhạy cảm cao.

---

## ⚙️ Cách sử dụng (Lưu trữ)

> ⚠️ **Rophim đã ngừng hoạt động.** Phần này chỉ để lưu trữ cho mục đích tham khảo.

1. Cài đặt [Tampermonkey](https://www.tampermonkey.net/) trên trình duyệt.
2. Tạo script mới, paste nội dung file `source.js` vào.
3. Truy cập Rophim, đăng nhập, và reload trang.

---

## 💭 Lời kết

Thật sự tiếc khi Rophim đã dừng hoạt động. Nói không ngoa, đây là lần đầu mình thấy một trang phim "không chính thống" mà vận hành **bài bản, chỉnh chu** đến vậy — từ hệ thống thanh toán, VIP, coin, cho đến UI/UX đều ở một level hoàn toàn khác. Mình genuinely respect cái tâm của team phát triển Rophim.

Phát hiện bug này cũng hoàn toàn tình cờ — vọc vạch lúc rảnh, kiểu "ơ, cái gì đây?", rồi thấy bất ngờ vì một hệ thống chỉnh chu đến vậy lại dính lỗ hổng khá cơ bản trong security architecture. Không ai hoàn hảo cả, và đó cũng là lý do ngành security tồn tại, phải không nào? 🙂

Dù sao, cũng coi như một chương đã khép lại. Chúc team Rophim (nếu có đọc được) sẽ mang những bài học này vào những dự án tiếp theo, và chúc anh em dev ngoài kia luôn nhớ: **"Never trust the client."** ✌️

---

## 👨‍💻 Tác giả

**FireT** · [@firetofficial](https://github.com/firetofficial) · [Telegram](https://t.me/firet_official)

## ⭐ Support

Nếu bạn thấy bài phân tích này hữu ích hoặc học được điều gì đó, hãy drop một ⭐ trên repo nhé — mình sẽ tiếp tục chia sẻ thêm nhiều case study thú vị khác!

---

<p align="center">
  <sub>⚠️ <b>Disclaimer</b>: Dự án này được public hoàn toàn vì mục đích <b>nghiên cứu bảo mật và học tập</b>. Tác giả không chịu trách nhiệm cho bất kỳ hành vi sử dụng sai mục đích nào. Nghiêm cấm sử dụng cho mục đích thương mại.</sub>
</p>
