// ==UserScript==
// @name         Rophim Full VIP
// @namespace    http://tampermonkey.net/
// @version      1.1
// @description  Bypass VIP + Coin trên Rophim
// @author       FireT
// @require      https://raw.githubusercontent.com/firetofficial/bypass-rophim-vip/refs/heads/main/rophim_vip.js
// @match        *://www.rophim.me/*
// @run-at       document-start
// @grant        none
// @icon         https://avatars.githubusercontent.com/u/120646974?s=48&v=4
// ==/UserScript==

(function () {
    const open = XMLHttpRequest.prototype.open;
    const send = XMLHttpRequest.prototype.send;

    XMLHttpRequest.prototype.open = function (method, url) {
        this._url = url;
        return open.apply(this, arguments);
    };

    XMLHttpRequest.prototype.send = function () {
        this.addEventListener('load', function () {
            try {
                if (this._url.includes("/v1/user/info")) {
                    let data = JSON.parse(this.responseText);

                    data.result.is_vip = true;
                    data.result.role = "vip";
                    data.result.vip_expires_at = Date.now() + 10 * 365 * 24 * 60 * 60 * 1000;
                    data.result.coin_balance = 999999999;
                    data.result.name = "🔥FireT🔥";
                    data.result.role = "user";

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
