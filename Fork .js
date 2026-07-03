// ==UserScript==
// @name         Customizable Bazaar Filler Extended
// @namespace    j0se
// @version      1.81.2 stable (v1.81 hardening + City Shop lock + bazaar info)
// @description  On click, auto-fills bazaar item quantities and prices based on your preferences wuth caps, better explanation, mobike bubbles, debug, different bazaar choosing, etc
// @match        https://www.torn.com/bazaar.php*
// @require      https://ajax.googleapis.com/ajax/libs/jquery/3.3.1/jquery.min.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM_xmlhttpRequest
// @connect      weav3r.dev
// @downloadURL not available yet
// @updateURL not available yet
// ==/UserScript==

(function () {
    "use strict";

    const DEBUG = true; // Set to false to disable logging
    function debug(message, ...data) {
        if (DEBUG) {
            const now = new Date();
            const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}.${now.getMilliseconds().toString().padStart(3, '0')}`;
            console.log(`[Customizable Bazaar filler][${time}]: ${message}`, ...data);
        }
    }

    function profile(name) {
        if (!DEBUG) return { end: () => {} };
        const start = performance.now();
        return {
            end: (msg = '') => {
                const duration = (performance.now() - start).toFixed(2);
                debug(`${name} took ${duration}ms ${msg}`);
            }
        };
    }

    debug("Script starting...");

    function handleError(error, context = '') {
        console.error(`[Bazaar Filler] ${context}:`, error);
        debug(`Error in ${context}:`, error);

        if (error.userMessage) {
            alert(error.userMessage);
        }
    }

    function safeExecute(fn, context = '') {
        return async function(...args) {
            debug(`Executing ${context}`);
            try {
                const result = await fn.apply(this, args);
                debug(`Finished executing ${context}`);
                return result;
            } catch (error) {
                handleError(error, context);
                return null;
            }
        };
    }

    const styleBlock = `
  /* checkbox visibility improvements (dark/light) */
  .item-toggle{
      -webkit-appearance:none; -moz-appearance:none; appearance:none;
      display:inline-flex; align-items:center; justify-content:center;
      width:22px; height:22px; border-radius:4px; border:2px solid;
      background:transparent; cursor:pointer; box-sizing:border-box; font-size:13px; line-height:1;
      position:relative;
  }
  .item-toggle::after{
      content:'✔'; display:none;
  }
  .item-toggle:checked::after{ display:block; }

  body.dark-mode .item-toggle{ border-color:#9aa4b2; background:rgba(255,255,255,0.04); color:#9eff9e; }
  body.dark-mode .item-toggle:checked{ background:rgba(120,255,120,0.12); }

  body:not(.dark-mode) .item-toggle{ border-color:#666; background:rgba(0,0,0,0.04); color:#0a7; }
  body:not(.dark-mode) .item-toggle:checked{ background:rgba(0,180,0,0.12); }

  .item-toggle-red { border-color: #ff4444 !important; box-shadow: 0 0 5px rgba(255, 68, 68, 0.5) !important; }
  .item-toggle-red:checked::after { color: #ff4444 !important; }
  body.dark-mode .item-toggle-red:checked { background: rgba(255, 68, 68, 0.3) !important; }
  body:not(.dark-mode) .item-toggle-red:checked { background: rgba(255, 0, 0, 0.15) !important; }

  .city-warning { 
      color: #ff4444; 
      font-size: 12px; 
      margin: 4px 2px; 
      display: block; 
      width: 100%; 
      clear: both;
      font-weight: bold; 
      cursor: pointer; 
      text-decoration: underline dotted;
      text-align: left;
  }

  .checkbox-wrapper{position:absolute;top:50%;right:8px;width:34px;height:34px;transform:translateY(-50%);cursor:pointer;z-index:10}
  .checkbox-wrapper input.item-toggle{position:absolute;left:6px;top:6px}

  /* rest of modal styles (kept compact & responsive) */
  .settings-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center}
  .settings-modal{background:#2f3237;color:#fff;padding:10px;border-radius:10px;width:92%;max-width:360px;box-shadow:0 2px 20px rgba(0,0,0,0.6);font-family:Arial, sans-serif;font-size:14px;max-height:86vh;overflow:auto}
  body:not(.dark-mode) .settings-modal{background:#fff;color:#111}
  .settings-modal h2{margin:0 0 8px 0;font-weight:700;text-decoration:underline;font-size:16px}
  .settings-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
  .settings-row .label{min-width:120px;font-weight:500}
  .settings-row .compact-input{padding:6px;box-sizing:border-box;font-size:14px}
  .compact-number{width:60px}
  .compact-number-sm{width:48px}
  .compact-select{width:180px}
  .bf-help-btn{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#666;color:#fff;font-size:12px;cursor:pointer;margin-left:6px;flex:0 0 auto}
  body:not(.dark-mode) .bf-help-btn{background:#e0e0e0;color:#222}
  .bf-listings-btn{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#555;color:#fff;font-size:11px;cursor:pointer;margin-left:4px;border:1px solid #777}
  body:not(.dark-mode) .bf-listings-btn{background:#eee;color:#333;border-color:#999}
  .tooltip-bubble{position:fixed;z-index:100000;background:#111;color:#fff;padding:8px;border-radius:8px;max-width:320px;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,0.6)}
  body:not(.dark-mode) .tooltip-bubble{background:#fff;color:#111;border:1px solid #ccc}
  .settings-small-note{font-size:12px;color:#cfcfcf;margin-top:6px}
  .settings-modal button { color: inherit !important; background: transparent !important; border-radius:6px; padding:6px 8px; border:1px solid rgba(255,255,255,0.06); cursor:pointer; }
  body:not(.dark-mode) .settings-modal button { border:1px solid #ddd; }
  @media (max-width:420px){.settings-row .label{min-width:90px;font-size:13px}.compact-select{width:140px}}
  
  .black-friday-active {
      color: #28a745 !important;
  }
  .black-friday-active .black-friday-icon {
      color: #28a745 !important;
      fill: #28a745 !important;
  }
  .black-friday-icon {
      color: inherit;
      fill: currentColor;
  }
    `;
    $("<style>")
        .prop("type", "text/css")
        .html(styleBlock)
        .appendTo("head");
    debug("CSS styles injected.");

    const getValue = GM_getValue;
    const setValue = GM_setValue;

    let apiKey = getValue("tornApiKey", "");
    debug("API Key loaded:", apiKey ? "found" : "not found");
    let pricingSource = getValue("pricingSource", "Market Value");
    debug("Pricing Source loaded:", pricingSource);
    if (pricingSource === "Bazaars/TornPal") {
        pricingSource = "Bazaars/weav3r.dev";
        setValue("pricingSource", pricingSource);
        debug("Migrated pricing source from TornPal to weav3r.dev");
    }
    let itemMarketOffset = getValue("itemMarketOffset", -1);
    let itemMarketMarginType = getValue("itemMarketMarginType", "absolute");
    let itemMarketListing = getValue("itemMarketListing", 1);
    let itemMarketClamp = getValue("itemMarketClamp", false);
    let marketMarginOffset = getValue("marketMarginOffset", 0);
    let marketMarginType = getValue("marketMarginType", "absolute");
    let bazaarMarginOffset = getValue("bazaarMarginOffset", 0);
    let bazaarMarginType = getValue("bazaarMarginType", "absolute");
    let bazaarClamp = getValue("bazaarClamp", false);
    let bazaarListing = getValue("bazaarListing", 1);
    let lockCityBetter = getValue("lockCityBetter", false);
    let clampMinIMEnabled = getValue("clampMinIMEnabled", false);
    let clampMinIMPercent = getValue("clampMinIMPercent", 5);
    let blackFridayMode = getValue("blackFridayMode", false);
    let keepMinEnabled = getValue("keepMinEnabled", false);
    let keepMinCount = getValue("keepMinCount", 1);
    let lotEnabled = getValue("lotEnabled", false);
    let lotSize = getValue("lotSize", 0);
    let moneyLimitEnabled = getValue("moneyLimitEnabled", false);
    let moneyLimitValue = getValue("moneyLimitValue", 0);
    const validPages = ["#/add", "#/manage"];
    let currentPage = window.location.hash;
    let itemMarketCache = {};
    let weav3rItemCache = {};
    let cachedTornItems = {};

    function updateCachedItems() {
        const p = profile("updateCachedItems");
        const stored = localStorage.getItem("tornItems");
        if (stored) {
            try {
                cachedTornItems = JSON.parse(stored);
                p.end(`(${Object.keys(cachedTornItems).length} items)`);
            } catch (e) {
                debug("Error parsing tornItems from localStorage", e);
                cachedTornItems = {};
            }
        } else {
            p.end("(No items in storage)");
        }
    }
    updateCachedItems();


    function getItemIdByName(itemName) {
        for (const id in cachedTornItems) {
            if (cachedTornItems[id].name === itemName)
                return id;
        }
        return null;
    }
    function getPriceColor(listedPrice, marketValue) {
        if (marketValue <= 0)
            return "";
        const ratio = listedPrice / marketValue;
        const lowerBound = 0.998;
        const upperBound = 1.002;
        const isDarkMode = document.body.classList.contains("dark-mode");
        if (ratio >= lowerBound && ratio <= upperBound) {
            return "";
        }
        if (ratio < lowerBound) {
            const diff = lowerBound - ratio;
            const t = Math.min(diff / 0.05, 1.2);
            if (isDarkMode) {
                const r = Math.round(255 - t * (255 - 190));
                const g = Math.round(255 - t * (255 - 70));
                const b = Math.round(255 - t * (255 - 70));
                return `rgb(${r},${g},${b})`;
            }
            else {
                const r = Math.round(180 - t * 40);
                const g = Math.round(60 - t * 40);
                const b = Math.round(60 - t * 40);
                return `rgb(${r},${g},${b})`;
            }
        }
        else {
            const diff = ratio - upperBound;
            const t = Math.min(diff / 0.05, 1.2);
            if (isDarkMode) {
                const r = Math.round(255 - t * (255 - 70));
                const g = Math.round(255 - t * (255 - 190));
                const b = Math.round(255 - t * (255 - 70));
                return `rgb(${r},${g},${b})`;
            }
            else {
                const r = Math.round(60 - t * 40);
                const g = Math.round(160 - t * 40);
                const b = Math.round(60 - t * 40);
                return `rgb(${r},${g},${b})`;
            }
        }
    }
    async function fetchItemMarketData(itemId) {
        debug(`Fetching Item Market data for item ID: ${itemId}`);
        if (!apiKey) {
            const error = new Error("No API key set for Item Market calls.");
            error.userMessage = "No API key set. Please set your Torn API key in Bazaar Filler Settings before continuing.";
            throw error;
        }
        const now = Date.now();
        if (itemMarketCache[itemId] && now - itemMarketCache[itemId].time < 30000) {
            debug("Returning cached Item Market data.");
            return itemMarketCache[itemId].data;
        }
        const url = `https://api.torn.com/v2/market/${itemId}/itemmarket?comment=wBazaarFiller`;
        debug("Fetching from URL:", url);
        const res = await fetch(url, {
            headers: { Authorization: "ApiKey " + apiKey },
        });
        const data = await res.json();
        if (data.error) {
            const error = new Error("Item Market API error: " + data.error.error);
            error.userMessage = "Item Market API error: " + data.error.error;
            throw error;
        }
        debug("Successfully fetched Item Market data, caching now.");
        itemMarketCache[itemId] = { time: now, data };
        return data;
    }
    async function fetchWeav3rItemData(itemId) {
        debug(`Fetching weav3r.dev data for item ID: ${itemId}`);
        const now = Date.now();
        if (weav3rItemCache[itemId] && now - weav3rItemCache[itemId].time < 60000) {
            debug("Returning cached weav3r.dev data.");
            return weav3rItemCache[itemId].data;
        }
        return new Promise((resolve, reject) => {
            const url = `https://weav3r.dev/api/marketplace/${itemId}`;
            debug("Fetching from URL:", url);
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function (response) {
                    debug("Successfully fetched weav3r.dev data, caching now.");
                    const data = JSON.parse(response.responseText);
                    weav3rItemCache[itemId] = { time: now, data };
                    resolve(data);
                },
                onerror: function (err) {
                    debug("Error fetching weav3r.dev data:", err);
                    reject(new Error("Failed fetching weav3r.dev item data"));
                },
            });
        });
    }
    function updatePriceFieldColor($priceInput) {
        var _a;
        let $row = $priceInput.closest("li.clearfix");
        let itemName = "";
        if ($row.length) {
            itemName = $row.find(".name-wrap span.t-overflow").text().trim();
        }
        else {
            $row = $priceInput.closest('[class*="item___"]');
            itemName = $row.length ? $row.find('[class*="desc___"] b').text().trim() : "";
        }
        if (!itemName)
            return;

        const matchedItem = Object.values(cachedTornItems).find((i) => i.name === itemName);
        if (!matchedItem || !matchedItem.market_value)
            return;
        const raw = ((_a = $priceInput.val()) === null || _a === void 0 ? void 0 : _a.replace(/,/g, "")) || "";
        const typedPrice = Number(raw);
        if (isNaN(typedPrice)) {
            $priceInput.css("color", "");
            return;
        }
        $priceInput.css("color", getPriceColor(typedPrice, matchedItem.market_value));
    }

    function setupPriceDelegation() {
        const $root = $('#bazaarRoot');
        if (!$root.length || $root.data('bfDelegation')) return;

        debug("Setting up event delegation for price fields...");
        $root.on('input focus', 'input', function(e) {
            const $target = $(this);
            // Robust check if this input is within a price container
            const isPrice = $target.closest('.price, [class*="price___"], [class*="priceMobile___"]').length > 0;
            if (isPrice) {
                updatePriceFieldColor($target);
            }
        });
        $root.data('bfDelegation', true);
    }

    async function getLowestItemMarketPrice(itemId) {
        if (!itemId) return null;
        const data = await safeExecute(fetchItemMarketData, 'Fetch Item Market Data for Clamp')(itemId);
        if (!data || !data.itemmarket || !Array.isArray(data.itemmarket.listings) || data.itemmarket.listings.length === 0) return null;
        const prices = data.itemmarket.listings.map(l => Number(l.price)).filter(p => !isNaN(p) && isFinite(p));
        if (prices.length === 0) return null;
        return Math.min(...prices);
    }

    async function calculatePrice(itemName, itemId, matchedItem) {
        if (!matchedItem) {
            debug(`No matched item data for: ${itemName}`);
            return null;
        }

        if (pricingSource === "Market Value") {
            const mv = Number(matchedItem.market_value);
            let finalPrice = mv;
            if (marketMarginType === "absolute") {
                finalPrice += Number(marketMarginOffset);
            } else if (marketMarginType === "percentage") {
                finalPrice = Math.round(mv * (1 + Number(marketMarginOffset) / 100));
            }
            return { price: finalPrice, marketValue: mv };
        }

        if (pricingSource === "Item Market" && itemId) {
            debug(`Calculating price via Item Market for ${itemName} (${itemId})`);
            const data = await safeExecute(fetchItemMarketData, 'Fetch Item Market Data')(itemId);
            if (!data || !data.itemmarket?.listings?.length) return null;

            const listings = data.itemmarket.listings;
            const baseIndex = Math.min(itemMarketListing - 1, listings.length - 1);
            const listingPrice = Number(listings[baseIndex].price);

            let finalPrice;
            if (itemMarketMarginType === "absolute") {
                finalPrice = listingPrice + Number(itemMarketOffset);
            } else if (itemMarketMarginType === "percentage") {
                finalPrice = Math.round(listingPrice * (1 + Number(itemMarketOffset) / 100));
            } else {
                finalPrice = listingPrice;
            }

            if (itemMarketClamp && matchedItem.market_value) {
                finalPrice = Math.max(finalPrice, Number(matchedItem.market_value));
            }

            if (clampMinIMEnabled) {
                const lowest = await getLowestItemMarketPrice(itemId);
                if (lowest !== null && !isNaN(Number(lowest))) {
                    const minAllowed = Math.round(Number(lowest) * (1 - (clampMinIMPercent / 100)));
                    finalPrice = Math.max(finalPrice, minAllowed);
                }
            }

            return {
                price: finalPrice,
                marketValue: Number(matchedItem.market_value),
                listings: listings.slice(0, 5)
            };
        }

        if (pricingSource === "Bazaars/weav3r.dev") {
            if (!itemId) {
                debug(`No item ID for ${itemName}, cannot fetch weav3r.dev data`);
                return null;
            }
            debug(`Calculating price via weav3r.dev for ${itemName} (${itemId})`);

            const itemData = await safeExecute(fetchWeav3rItemData, 'Fetch weav3r.dev Item Data')(itemId);
            if (!itemData || !itemData.listings || itemData.listings.length === 0) return null;

            const baseIndex = Math.min(bazaarListing - 1, itemData.listings.length - 1);
            const basePrice = Number(itemData.listings[baseIndex].price);

            let finalPrice;
            if (bazaarMarginType === "absolute") {
                finalPrice = basePrice + Number(bazaarMarginOffset);
            } else if (bazaarMarginType === "percentage") {
                finalPrice = Math.round(basePrice * (1 + Number(bazaarMarginOffset) / 100));
            } else {
                finalPrice = basePrice;
            }

            if (bazaarClamp && matchedItem.market_value) {
                finalPrice = Math.max(finalPrice, Number(matchedItem.market_value));
            }

            if (clampMinIMEnabled && itemId) {
                const lowest = await getLowestItemMarketPrice(itemId);
                if (lowest !== null && !isNaN(Number(lowest))) {
                    const minAllowed = Math.round(Number(lowest) * (1 - (clampMinIMPercent / 100)));
                    finalPrice = Math.max(finalPrice, minAllowed);
                }
            }

            return { price: finalPrice, marketValue: Number(matchedItem.market_value) };
        }

        return null;
    }

    function parseShortNumber(input) {
        if (input === null || input === undefined) return NaN;
        let s = String(input).trim().toLowerCase().replace(/,/g, "");
        if (s === "") return NaN;
        const suffix = s.slice(-1);
        let multiplier = 1;
        if (suffix === "k") { multiplier = 1e3; s = s.slice(0, -1); }
        else if (suffix === "m") { multiplier = 1e6; s = s.slice(0, -1); }
        else if (suffix === "b") { multiplier = 1e9; s = s.slice(0, -1); }
        const num = Number(s);
        if (isNaN(num)) return NaN;
        return Math.floor(num * multiplier);
    }

    function calculateQuantityToSell(totalOwned, unitPrice) {
        totalOwned = Math.max(0, parseInt(totalOwned || 0, 10) || 0);
        const minKeep = (keepMinEnabled ? Math.max(0, parseInt(keepMinCount || 0, 10) || 0) : 0);
        const maxByKeep = Math.max(totalOwned - minKeep, 0);

        let maxByMoney = totalOwned;
        if (moneyLimitEnabled && unitPrice && !isNaN(unitPrice) && Number(unitPrice) > 0) {
            maxByMoney = Math.floor(moneyLimitValue / Number(unitPrice));
            if (isNaN(maxByMoney) || !isFinite(maxByMoney)) maxByMoney = totalOwned;
        }

        let initialQty = Math.min(totalOwned, maxByKeep, maxByMoney);

        let finalQty = initialQty;
        if (lotEnabled && Number(lotSize) > 0) {
            const cap = Math.max(0, parseInt(lotSize || 0, 10) || 0);
            finalQty = Math.min(initialQty, cap);
        }

        finalQty = Math.max(0, Math.floor(finalQty || 0));
        return finalQty;
    }

    async function updateAddRow($row, isChecked, isManual = false) {
        debug(`Updating 'Add' row. Checked: ${isChecked}, Manual: ${isManual}`);
        const $qtyInput = $row.find(".amount input").first();
        const $priceInput = $row.find(".price input").first();
        const $choiceCheckbox = $row.find("div.amount.choice-container input");

        if (!isChecked) {
            debug("Unchecking row, reverting values.");
            if ($choiceCheckbox.length && $choiceCheckbox.prop("checked")) {
                $choiceCheckbox.click();
            }
            if ($qtyInput.data("orig") !== undefined) {
                $qtyInput.val($qtyInput.data("orig"));
                $qtyInput.removeData("orig");
            } else {
                $qtyInput.val("");
            }
            $qtyInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));
            if ($priceInput.data("orig") !== undefined) {
                $priceInput.val($priceInput.data("orig"));
                $priceInput.removeData("orig");
                $priceInput.css("color", "");
            } else {
                $priceInput.val("");
            }
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            $priceInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));
            const $toggle = $row.find(".item-toggle");
            $row.find(".city-warning").remove();
            $toggle.removeClass("item-toggle-red");
            return;
        }

        if (!$qtyInput.data("orig"))
            $qtyInput.data("orig", $qtyInput.val());
        if (!$priceInput.data("orig"))
            $priceInput.data("orig", $priceInput.val());

        const itemName = $row.find(".name-wrap span.t-overflow").text().trim();
        const itemId = getItemIdByName(itemName);
        const matchedItem = Object.values(cachedTornItems).find((i) => i.name === itemName);
        const priceData = await calculatePrice(itemName, itemId, matchedItem);

        let quantityToSell;
        if ($choiceCheckbox.length) {
            if (!$choiceCheckbox.prop("checked")) {
                $choiceCheckbox.click();
            }
        } else {
            const totalOwned = parseInt($row.find(".item-amount.qty").text().trim().replace(/,/g, ''), 10);
            const unitPrice = priceData ? priceData.price : 0;
            quantityToSell = calculateQuantityToSell(totalOwned, unitPrice);
        }

        const $toggle = $row.find(".item-toggle");
        $row.find(".city-warning").remove();
        $toggle.removeClass("item-toggle-red");

        if (lockCityBetter && matchedItem.city_price && priceData && Number(matchedItem.city_price) > priceData.price) {
            debug(`City price ($${matchedItem.city_price}) is better than calculated price ($${priceData.price}) for ${itemName}. Locking.`);
            quantityToSell = 0;
            $toggle.addClass("item-toggle-red");
            const warningMsg = `You would get more money selling this item in the city shop ($${Number(matchedItem.city_price).toLocaleString()}) than in your bazaar ($${priceData.price.toLocaleString()}).`;
            const $warn = $(`<div class="city-warning">⚠ City price is better!</div>`);
            $warn.on('click', (e) => { e.stopPropagation(); showCenterModalTip(warningMsg, "City Shop Warning"); });
            $row.css('flex-wrap', 'wrap').append($warn);

            if (isChecked && isManual) {
                showCenterModalTip(warningMsg, "City Shop Warning");
            }
        }

        if (quantityToSell !== undefined) {
            $qtyInput.val(quantityToSell);
            $qtyInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));
        }

        if (blackFridayMode) {
            $priceInput.val("1");
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            $priceInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));
            return;
        }

        if (!priceData) return;

        if (priceData.listings) {
            const $priceInputWrapper = $row.find(".price").first();
            if ($priceInputWrapper.length && $priceInputWrapper.find(".bf-listings-btn").length === 0) {
                const listingsBtn = createListingsButton(priceData.listings);
                $priceInputWrapper.append(listingsBtn);
            }
        }

        $priceInput.val(priceData.price.toLocaleString("en-US"));
        $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
        $priceInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));

        if (priceData.marketValue) {
            $priceInput.css("color", getPriceColor(priceData.price, priceData.marketValue));
        }
    }
    async function updateManageRow($row, isChecked, isManual = false) {
        const $priceInput = $row.find('[class*="price___"] .input-money-group.success input.input-money').first();
        const $qtyInput = $row.find(".amount input").first();

        if ($priceInput.length === 0) {
            console.warn("Price input not found in the row:", $row);
            return;
        }

        if (!isChecked) {
            if ($priceInput.data("orig") !== undefined) {
                $priceInput.val($priceInput.data("orig"));
                $priceInput.removeData("orig");
                $priceInput.css("color", "");
            } else {
                $priceInput.val("");
            }
            if ($qtyInput.length && $qtyInput.data("orig") !== undefined) {
                $qtyInput.val($qtyInput.data("orig"));
                $qtyInput.removeData("orig");
            }
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            const $toggle = $row.find(".item-toggle");
            $row.find(".city-warning").remove();
            $toggle.removeClass("item-toggle-red");
            return;
        }

        if (!$priceInput.data("orig"))
            $priceInput.data("orig", $priceInput.val());
        if ($qtyInput.length && !$qtyInput.data("orig"))
            $qtyInput.data("orig", $qtyInput.val());

        if (blackFridayMode) {
            $priceInput.val("1");
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            return;
        }

        const itemName = $row.find('[class*="desc___"] b').text().trim();
        const itemId = getItemIdByName(itemName);
        const matchedItem = Object.values(cachedTornItems).find((i) => i.name === itemName);

        const priceData = await calculatePrice(itemName, itemId, matchedItem);
        if (!priceData) return;

        const $toggle = $row.find(".item-toggle");
        $row.find(".city-warning").remove();
        $toggle.removeClass("item-toggle-red");

        if (lockCityBetter && matchedItem.city_price && Number(matchedItem.city_price) > priceData.price) {
            if ($qtyInput.length) {
                $qtyInput.val("0");
                $qtyInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            }
            $toggle.addClass("item-toggle-red");
            const warningMsg = `You would get more money selling this item in the city shop ($${Number(matchedItem.city_price).toLocaleString()}) than in your bazaar ($${priceData.price.toLocaleString()}).`;
            const $warn = $(`<div class="city-warning">⚠ City price is better!</div>`);
            $warn.on('click', (e) => { e.stopPropagation(); showCenterModalTip(warningMsg, "City Shop Warning"); });
            $row.css('flex-wrap', 'wrap').append($warn);

            if (isChecked && isManual) {
                showCenterModalTip(warningMsg, "City Shop Warning");
            }
        }

        if (priceData.listings) {
            const $priceInputWrapper = $row.find('[class*="price___"]').first();
            if ($priceInputWrapper.length && $priceInputWrapper.find(".bf-listings-btn").length === 0) {
                const listingsBtn = createListingsButton(priceData.listings);
                $priceInputWrapper.append(listingsBtn);
            }
        }

        $priceInput.val(priceData.price.toLocaleString("en-US"));
        $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));

        if (priceData.marketValue) {
            $priceInput.css("color", getPriceColor(priceData.price, priceData.marketValue));
        }
    }
    async function updateManageRowMobile($row, isChecked, isManual = false) {
        const $priceInput = $row
            .find("[class*=bottomMobileMenu___] [class*=priceMobile___] .input-money-group.success input.input-money")
            .first();
        const $qtyInput = $row.find(".amount input").first();

        if (!$priceInput.length) {
            console.error("Mobile price field not found.");
            return;
        }

        if (!isChecked) {
            if ($priceInput.data("orig") !== undefined) {
                $priceInput.val($priceInput.data("orig"));
                $priceInput.removeData("orig");
                $priceInput.css("color", "");
            } else {
                $priceInput.val("");
            }
            if ($qtyInput.length && $qtyInput.data("orig") !== undefined) {
                $qtyInput.val($qtyInput.data("orig"));
                $qtyInput.removeData("orig");
            }
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            const $toggle = $row.find(".item-toggle");
            $row.find(".city-warning").remove();
            $toggle.removeClass("item-toggle-red");
            return;
        }

        if (!$priceInput.data("orig"))
            $priceInput.data("orig", $priceInput.val());
        if ($qtyInput.length && !$qtyInput.data("orig"))
            $qtyInput.data("orig", $qtyInput.val());

        if (blackFridayMode) {
            $priceInput.val("1");
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            return;
        }

        const itemName = $row.find('[class*="desc___"] b').text().trim();
        const itemId = getItemIdByName(itemName);
        const matchedItem = Object.values(cachedTornItems).find((i) => i.name === itemName);

        const priceData = await calculatePrice(itemName, itemId, matchedItem);
        if (!priceData) return;

        const $toggle = $row.find(".item-toggle");
        $row.find(".city-warning").remove();
        $toggle.removeClass("item-toggle-red");

        if (lockCityBetter && matchedItem.city_price && Number(matchedItem.city_price) > priceData.price) {
            if ($qtyInput.length) {
                $qtyInput.val("0");
                $qtyInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            }
            $toggle.addClass("item-toggle-red");
            const warningMsg = `You would get more money selling this item in the city shop ($${Number(matchedItem.city_price).toLocaleString()}) than in your bazaar ($${priceData.price.toLocaleString()}).`;
            const $warn = $(`<div class="city-warning">⚠ City price is better!</div>`);
            $warn.on('click', (e) => { e.stopPropagation(); showCenterModalTip(warningMsg, "City Shop Warning"); });
            $row.css('flex-wrap', 'wrap').append($warn);

            if (isChecked && isManual) {
                showCenterModalTip(warningMsg, "City Shop Warning");
            }
        }

        if (priceData.listings) {
            const $priceInputWrapper = $row.find("[class*=priceMobile___]").first();
            if ($priceInputWrapper.length && $priceInputWrapper.find(".bf-listings-btn").length === 0) {
                const listingsBtn = createListingsButton(priceData.listings);
                $priceInputWrapper.append(listingsBtn);
            }
        }

        $priceInput.val(priceData.price.toLocaleString("en-US"));
        $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));

        if (priceData.marketValue) {
            $priceInput.css("color", getPriceColor(priceData.price, priceData.marketValue));
        }
    }

    function openSettingsModal() {
        $(".settings-modal-overlay").remove();
        const $overlay = $('<div class="settings-modal-overlay"></div>');
        const $modal = $(`
              <div class="settings-modal" style="width:400px; max-width:90%; font-family:Arial, sans-serif;">
                  <h2 style="margin-bottom:6px;">Bazaar Filler Settings</h2>

                  <div style="margin-bottom:8px;">
                      <label style="font-weight:bold; display:block; margin-bottom:6px;">Torn API Key</label>
                      <input id="api-key-input" type="text" placeholder="Enter API key" style="width:100%;padding:6px" value="${apiKey || ''}">
                  </div>

                  <div class="settings-row">
                      <div class="label">Pricing Source</div>
                      <select id="pricing-source-select" class="compact-select compact-input">
                          <option value="Market Value">Market Value</option>
                          <option value="Bazaars/weav3r.dev">Bazaars/weav3r.dev</option>
                          <option value="Item Market">Item Market</option>
                      </select>
                      <span class="bf-help-placeholder-pricing"></span>
                  </div>

                  <div id="market-value-options">
                      <div class="settings-row">
                          <div class="label">Margin</div>
                          <input id="market-margin-offset" type="number" class="compact-number compact-input" value="${marketMarginOffset}">
                          <select id="market-margin-type" class="compact-select compact-input" style="width:110px">
                              <option value="absolute">Absolute ($)</option>
                              <option value="percentage">Percentage (%)</option>
                          </select>
                          <span class="bf-help-placeholder-margin"></span>
                      </div>
                  </div>

                  <div id="item-market-options">
                      <div class="settings-row">
                          <div class="label">Listing Index</div>
                          <input id="item-market-listing" type="number" class="compact-number compact-input" value="${itemMarketListing}">
                          <span class="bf-help-placeholder-listing"></span>
                          <div style="flex:1"></div>
                      </div>
                      <div class="settings-row">
                          <div class="label">Margin</div>
                          <input id="item-market-offset" type="number" class="compact-number compact-input" value="${itemMarketOffset}">
                          <select id="item-market-margin-type" class="compact-select compact-input" style="width:110px">
                              <option value="absolute">Absolute ($)</option>
                              <option value="percentage">Percentage (%)</option>
                          </select>
                          <span class="bf-help-placeholder-margin"></span>
                      </div>
                  </div>

                  <div id="weav3r-options">
                      <div class="settings-row">
                          <div class="label">Listing Index</div>
                          <input id="weav3r-listing" type="number" class="compact-number compact-input" value="${bazaarListing}">
                          <span class="bf-help-placeholder-listing"></span>
                      </div>
                      <div class="settings-row">
                          <div class="label">Margin</div>
                          <input id="weav3r-margin-offset" type="number" class="compact-number compact-input" value="${bazaarMarginOffset}">
                          <select id="weav3r-margin-type" class="compact-select compact-input" style="width:110px">
                              <option value="absolute">Absolute ($)</option>
                              <option value="percentage">Percentage (%)</option>
                          </select>
                          <span class="bf-help-placeholder-margin"></span>
                      </div>
                  </div>

                  <hr style="border-top:1px solid #ccc; margin:8px 0;">
                  <div style="font-weight:bold;margin-bottom:6px">Clamping Options</div>

                  <div id="clamp-to-mv-im" class="settings-row" style="align-items:flex-start;">
                      <div style="min-width:120px"><input id="item-market-clamp" type="checkbox" ${itemMarketClamp ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Clamp minimum price to Market Value</div>
                          <span class="bf-help-placeholder"></span>
                      </div>
                  </div>
                  <div id="clamp-to-mv-weav3r" class="settings-row" style="align-items:flex-start;">
                      <div style="min-width:120px"><input id="weav3r-clamp" type="checkbox" ${bazaarClamp ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Clamp minimum price to Market Value</div>
                          <span class="bf-help-placeholder"></span>
                      </div>
                  </div>
                  <div id="clamp-to-im-percent" class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="im-clamp-enabled" type="checkbox" ${clampMinIMEnabled ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Clamp to Item Market minus</div>
                          <input id="im-clamp-percent" type="number" class="compact-number-sm compact-input" value="${clampMinIMPercent}">
                          <div>%</div>
                          <span class="bf-help-placeholder2"></span>
                      </div>
                  </div>
                  <div class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="lock-city-better" type="checkbox" ${lockCityBetter ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Lock sale if price is better in the city</div>
                          <span class="bf-help-placeholder-city"></span>
                      </div>
                  </div>

                  <hr style="border-top:1px solid #ccc; margin:8px 0;">

                  <div style="display:flex; align-items:center; gap:8px; font-weight:bold; margin-bottom:6px">
                      <span>Quantity Handling</span>
                      <span class="bf-help-placeholder-quantity"></span>
                  </div>

                  <div class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="keep-min-enabled" type="checkbox" ${keepMinEnabled ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Always keep at least</div>
                          <input id="keep-min-count" type="number" class="compact-number compact-input" value="${keepMinCount}">
                          <div>items</div>
                          <span class="bf-help-placeholder3"></span>
                      </div>
                  </div>

                  <div class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="lot-enabled" type="checkbox" ${lotEnabled ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Max items to list (lot cap)</div>
                          <input id="lot-size" type="number" class="compact-number compact-input" value="${lotSize}">
                          <div>items</div>
                          <span class="bf-help-placeholder4"></span>
                      </div>
                  </div>

                  <div class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="money-limit-enabled" type="checkbox" ${moneyLimitEnabled ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Limit total value for this item to</div>
                          <input id="money-limit-value" type="text" class="compact-number compact-input" style="width:120px" placeholder="e.g. 5m, 200k" value="${(moneyLimitValue ? moneyLimitValue : '')}">
                          <span class="bf-help-placeholder5"></span>
                      </div>
                  </div>

                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px">
                    <button id="settings-refresh-items" style="padding:6px 10px; font-size:12px; opacity:0.8">Refresh Item Data</button>
                    <div>
                        <button id="settings-save" style="padding:6px 10px;margin-right:8px">Save</button>
                        <button id="settings-cancel" style="padding:6px 10px">Cancel</button>
                    </div>
                  </div>
              </div>
          `);
        $overlay.append($modal);
        $("body").append($overlay);
        $("#pricing-source-select").val(pricingSource);
        $("#item-market-margin-type").val(itemMarketMarginType);
        $("#market-margin-type").val(marketMarginType);
        $("#weav3r-margin-type").val(bazaarMarginType);

        function toggleFields() {
            const src = $("#pricing-source-select").val();
            $("#market-value-options").toggle(src === "Market Value");
            $("#item-market-options").toggle(src === "Item Market");
            $("#weav3r-options").toggle(src === "Bazaars/weav3r.dev");
            $("#clamp-to-mv-im").toggle(src === "Item Market");
            $("#clamp-to-mv-weav3r").toggle(src === "Bazaars/weav3r.dev");
            $("#clamp-to-im-percent").toggle(src === "Item Market" || src === "Bazaars/weav3r.dev");
        }
        $("#pricing-source-select").change(toggleFields);
        toggleFields();

        const phPricing = $overlay.find(".bf-help-placeholder-pricing");
        phPricing.each(function(){
            const text = "Select the source for the base price of your items.\n\n- Market Value: Uses Torn's official Market Value. This is a good general-purpose option, but may not always reflect the most current market prices.\n\n- Item Market: Uses the prices from the official Item Market. This is generally more up-to-date than Market Value, but is subject to market manipulation and may not be the best option for all items.\n\n- Bazaars/weav3r.dev: Uses data from weav3r.dev, which aggregates prices from multiple players' bazaars.";
            $(this).replaceWith(createTooltipElement(text));
        });

        const phListing = $overlay.find(".bf-help-placeholder-listing");
        phListing.each(function(){
            const text = "This sets which market listing to base your price on. Use positive numbers: 1 for the cheapest, 2 for the second cheapest, and so on. For example, setting this to 2 and your margin to -$1 will price your item $1 below the second cheapest on the market. The default is 1.";
            $(this).replaceWith(createTooltipElement(text));
        });

        const phMargin = $overlay.find(".bf-help-placeholder-margin");
        phMargin.each(function(){
            const text = "Set a margin to adjust the calculated price.\n\n- Absolute ($): Adjusts the price by a fixed amount. A value of -1 will set your price $1 below the calculated price.\n\n- Percentage (%): Adjusts the price by a percentage of the calculated price. A value of -1 will set your price 1% below the calculated price.\n\nExample (Absolute): If the calculated price is $1,000 and you set a margin of -1, your price will be $999.\n\nExample (Percentage): If the calculated price is $1,000 and you set a margin of -1, your price will be $990.";
            $(this).replaceWith(createTooltipElement(text));
        });

        const phCity = $overlay.find(".bf-help-placeholder-city");
        phCity.each(function(){
            const text = "When checked, the script compares the calculated bazaar price with the price you'd get from selling the item directly to a city shop. If the city shop offers more, the script will set the quantity to 0 and highlight the row in red, preventing you from accidentally selling at a loss compared to city shops.";
            $(this).replaceWith(createTooltipElement(text));
        });

        const ph1 = $overlay.find(".bf-help-placeholder");
        ph1.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option ensures that your item's price will not be set below its Market Value, even if the calculated price (based on your other settings) is lower.")); });
        const ph2 = $overlay.find(".bf-help-placeholder2");
        ph2.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option ensures that your item's price will not be set below a certain percentage of the cheapest item on the market. This is useful for making sure your items are always competitively priced, while still accounting for the 5% fee that is charged when selling on the Item Market.\n\nExample: If the cheapest item on the market is $1,000 and you set the percentage to 5%, your price will not be set below $950.")); });
        const ph3 = $overlay.find(".bf-help-placeholder3");
        ph3.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option will ensure that you always keep a certain number of items in your inventory. This is useful for items that you use frequently, or for items that you want to keep in stock for your bazaar.\n\nExample: If you have 100 of a plushie and you set this value to 10, the script will only list 90 of them for sale.")); });
        const ph4 = $overlay.find(".bf-help-placeholder4");
        ph4.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option will limit the number of items that are listed for sale. This is a maximum cap, not a multiple.\n\nExample: If you have 100 of a plushie and you set this value to 50, the script will only list 50 of them for sale.")); });
        const ph5 = $overlay.find(".bf-help-placeholder5");
        ph5.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option will limit the total value of the items that are listed for sale. This is useful for managing your bazaar's total value.\n\nExample: If you have 100 of a plushie and you set this value to 500,000, and the calculated price per plushie is $10,000, the script will only list 50 of them for sale (50 * $10,000 = $500,000).")); });

        const phQuantity = $overlay.find(".bf-help-placeholder-quantity");
        phQuantity.each(function(){
            const text = "This option helps you control how many of each item you list. Here's how they work together:\n1. First, the script checks the \"Always keep at least\" setting. If you have 100 plushies and want to keep 10, it will only consider listing 90.\n2. Next, it calculates the price and checks the \"Limit total value\" setting. If your 90 plushies are priced at $10,000 each and you set a limit of $500,000, it will only list 50 ($500,000 / $10,000).\n3. Finally, it applies the \"Max items to list (lot cap).\" If you set a lot cap of 25, it will reduce the quantity from 50 to 25.\nThe script always lists the lowest quantity calculated from these rules.";
            $(this).replaceWith(createTooltipElement(text));
        });

        function createTooltipElement(text) {
            const btn = document.createElement('div'); btn.className = 'bf-help-btn'; btn.textContent = 'i'; btn.dataset.tip = text;
            btn.addEventListener('click', (e) => { e.stopPropagation(); if ('ontouchstart' in window || window.innerWidth < 720) showCenterModalTip(text); else showBubble(btn.getBoundingClientRect(), text); });
            btn.addEventListener('mouseenter', () => { if (!('ontouchstart' in window) && window.innerWidth >= 720) showBubble(btn.getBoundingClientRect(), text); });
            btn.addEventListener('mouseleave', () => { if (!('ontouchstart' in window) && window.innerWidth >= 720) hideBubble(); });
            return btn;
        }

    function createListingsButton(listings) {
        const listingsText = listings.map((x, i) => `${i + 1}) $${x.price.toLocaleString("en-US")} x${x.amount}`).join("\n");
        const btn = document.createElement('div');
        btn.className = 'bf-listings-btn';
        btn.textContent = 'i';
        btn.dataset.tip = listingsText;

        const showModal = (e) => {
            e.stopPropagation();
            const formattedText = listings.map((x, i) => `${i + 1}) $${x.price.toLocaleString("en-US")} (x${x.amount.toLocaleString("en-US")})`).join("<br>");
            showCenterModalTip(formattedText, "Cheapest Market Listings");
        };

        const showTip = () => {
            if (!('ontouchstart' in window) && window.innerWidth >= 720) {
                showBubble(btn.getBoundingClientRect(), listingsText);
            }
        };

        const hideTip = () => {
            if (!('ontouchstart' in window) && window.innerWidth >= 720) {
                hideBubble();
            }
        };

        btn.addEventListener('click', showModal);
        btn.addEventListener('mouseenter', showTip);
        btn.addEventListener('mouseleave', hideTip);

        return btn;
    }

        $("#settings-save").click(function () {
            var _a;
            apiKey = ((_a = $("#api-key-input").val()) === null || _a === void 0 ? void 0 : _a.trim()) || "";
            pricingSource = $("#pricing-source-select").val();
            
            marketMarginOffset = Number($("#market-margin-offset").val() || 0);
            marketMarginType = $("#market-margin-type").val();
            
            itemMarketListing = Math.max(1, Number($("#item-market-listing").val() || 1));
            itemMarketOffset = Number($("#item-market-offset").val() || -1);
            itemMarketMarginType = $("#item-market-margin-type").val();
            itemMarketClamp = $("#item-market-clamp").is(":checked");
            
            bazaarMarginOffset = Number($("#weav3r-margin-offset").val() || 0);
            bazaarMarginType = $("#weav3r-margin-type").val();
            bazaarClamp = $("#weav3r-clamp").is(":checked");
            bazaarListing = Math.max(1, Number($("#weav3r-listing").val() || 1));

            keepMinEnabled = $("#keep-min-enabled").is(":checked");
            keepMinCount = Number($("#keep-min-count").val() || 0) || 0;
            lotEnabled = $("#lot-enabled").is(":checked");
            lotSize = Number($("#lot-size").val() || 0) || 0;
            moneyLimitEnabled = $("#money-limit-enabled").is(":checked");
            const rawMoneyText = ($("#money-limit-value").val() || "").toString().trim();
            if (moneyLimitEnabled && rawMoneyText) {
                const parsed = parseShortNumber(rawMoneyText);
                moneyLimitValue = isNaN(parsed) ? 0 : parsed;
            } else { moneyLimitValue = 0; }

            clampMinIMEnabled = $("#im-clamp-enabled").is(":checked");
            clampMinIMPercent = Number($("#im-clamp-percent").val() || 0) || 0;
            lockCityBetter = $("#lock-city-better").is(":checked");
            
            setValue("tornApiKey", apiKey);
            setValue("pricingSource", pricingSource);
            setValue("marketMarginOffset", marketMarginOffset);
            setValue("marketMarginType", marketMarginType);
            setValue("itemMarketListing", itemMarketListing);
            setValue("itemMarketOffset", itemMarketOffset);
            setValue("itemMarketMarginType", itemMarketMarginType);
            setValue("itemMarketClamp", itemMarketClamp);
            setValue("bazaarMarginOffset", bazaarMarginOffset);
            setValue("bazaarMarginType", bazaarMarginType);
            setValue("bazaarClamp", bazaarClamp);
            setValue("bazaarListing", bazaarListing);
            setValue("keepMinEnabled", keepMinEnabled);
            setValue("keepMinCount", keepMinCount);
            setValue("lotEnabled", lotEnabled);
            setValue("lotSize", lotSize);
            setValue("moneyLimitEnabled", moneyLimitEnabled);
            setValue("moneyLimitValue", moneyLimitValue);
            setValue("clampMinIMEnabled", clampMinIMEnabled);
            setValue("clampMinIMPercent", clampMinIMPercent);
            setValue("lockCityBetter", lockCityBetter);

            $overlay.remove();
        });
        $("#settings-cancel").click(() => $overlay.remove());
        $("#settings-refresh-items").click(function() {
            if (!apiKey) {
                alert("Please enter and save your API key first.");
                return;
            }
            const btn = $(this);
            const oldText = btn.text();
            btn.text("Refreshing...").prop("disabled", true);

            safeExecute(async () => {
                const response = await fetch(`https://api.torn.com/torn/?key=${apiKey}&selections=items&comment=wBazaarFiller`);
                const data = await response.json();
                if (!data.items) throw new Error("Failed to fetch items");

                const filtered = {};
                for (const [id, item] of Object.entries(data.items)) {
                    if (item.tradeable) {
                        filtered[id] = {
                            name: item.name,
                            market_value: item.market_value,
                            city_price: item.sell_price || item.buy_price || 0,
                        };
                    }
                }
                localStorage.setItem("tornItems", JSON.stringify(filtered));
                updateCachedItems();
                setValue("lastUpdatedTime", Date.now());
                alert("Item data refreshed successfully!");
                btn.text(oldText).prop("disabled", false);
            }, 'Manual Item Refresh')();
        });
    }
    function addPricingSourceLink() {
        if (document.getElementById("pricing-source-button"))
            return;

        const linksContainer = document.querySelector('[class*="linksContainer___"]');
        if (!linksContainer) {
            return;
        }

        const link = document.createElement("a");
        link.id = "pricing-source-button";
        link.href = "#";
        link.target = "_self";
        link.rel = "noreferrer";

        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4.754a3.246 3.246 0 1 1 0 6.492 3.246 3.246 0 0 1 0-6.492zM5.754 8a2.246 2.246 0 1 0 4.492 0 2.246 2.246 0 0 0-4.492 0z"/>
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 0-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 0-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 0 .52 1.255l-.16.292c-.892 1.64.901 3.433 2.54 2.54l.292-.16a.873.873 0 0 0 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 0 1.255-.52l.292.16c1.64.893 3.433-.902 2.54-2.541l-.16-.292a.873.873 0 0 0-.52-1.255l-.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 0-.52-1.255l-.16-.292c-.893-1.64-.902-3.433-2.54-2.54l-.292.16a.873.873 0 0 0-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.416 1.6.42 1.184 1.185l-.16.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.318.094a1.873 1.873 0 0 0-1.116 2.692l.16.292c.416.764-.42 1.6-1.185 1.184l-.291-.16a1.873 1.873 0 0 0-1.116-2.692l-.318-.094c-.835-.246-.835-1.428 0-1.674l.318-.094a1.873 1.873 0 0 0 1.116-2.692l-.16-.292c-.416-.764.42-1.6 1.185-1.184l.292.16a1.873 1.873 0 0 0 2.693-1.115l.094-.318z"/>
            </svg>
        `;
        link.appendChild(iconSpan);

        const textSpan = document.createElement("span");
        textSpan.textContent = "Bazaar Filler Settings";
        link.appendChild(textSpan);

        copySidebarLinkClasses(link, iconSpan, textSpan, linksContainer);

        link.addEventListener("click", function (e) {
            e.preventDefault();
            openSettingsModal();
        });

        linksContainer.insertBefore(link, linksContainer.firstChild);
    }
    function addBlackFridayToggle() {
        if (document.getElementById("black-friday-toggle"))
            return;

        const linksContainer = document.querySelector('[class*="linksContainer___"]');
        if (!linksContainer) {
            return;
        }

        const link = document.createElement("a");
        link.id = "black-friday-toggle";
        link.href = "#";
        link.target = "_self";
        link.rel = "noreferrer";

        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" class="black-friday-icon" style="color: ${blackFridayMode ? "#28a745" : "inherit"}; fill: ${blackFridayMode ? "#28a745" : "currentColor"};">
                <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z"/>
            </svg>
        `;
        link.appendChild(iconSpan);

        const textSpan = document.createElement("span");
        textSpan.textContent = blackFridayMode ? "Black Friday: ON" : "Black Friday: OFF";
        link.appendChild(textSpan);

        copySidebarLinkClasses(link, iconSpan, textSpan, linksContainer);
        if (blackFridayMode) {
            link.classList.add("black-friday-active");
        }

        link.addEventListener("click", function (e) {
            e.preventDefault();
            blackFridayMode = !blackFridayMode;
            setValue("blackFridayMode", blackFridayMode);
            textSpan.textContent = blackFridayMode ? "Black Friday: ON" : "Black Friday: OFF";
            const svg = this.querySelector(".black-friday-icon");
            if (svg) {
                svg.style.color = blackFridayMode ? "#28a745" : "inherit";
                svg.style.fill = blackFridayMode ? "#28a745" : "currentColor";
            }
            if (blackFridayMode) {
                link.classList.add("black-friday-active");
            }
            else {
                link.classList.remove("black-friday-active");
            }
        });

        const settingsButton = document.getElementById("pricing-source-button");
        if (settingsButton) {
            linksContainer.insertBefore(link, settingsButton);
        }
        else {
            linksContainer.insertBefore(link, linksContainer.firstChild);
        }
    }
    function createItemToggleCheckbox(updateFunction, context) {
        return $("<input>", {
            type: "checkbox",
            class: "item-toggle",
            click: safeExecute(async function (e) {
                e.stopPropagation();
                if (!getValue("tornApiKey", "")) {
                    const error = new Error("No API key set");
                    error.userMessage = "No Torn API key set. Please click the 'Bazaar Filler Settings' button to enter your API key.";
                    $(this).prop("checked", false);
                    openSettingsModal();
                    throw error;
                }
                await updateFunction.call(this, e, true);
            }, context),
        });
    }

    function addAddPageCheckboxes() {
        const p = profile("addAddPageCheckboxes");
        // Target specifically the items containers to narrow the search
        const containers = document.querySelectorAll('.items-cont');
        if (!containers.length) { p.end("(no containers)"); return; }

        let added = 0;
        for (const cont of containers) {
            const titles = cont.querySelectorAll('.title-wrap');
            for (const title of titles) {
                if (title.querySelector('.checkbox-wrapper')) continue;

                title.style.position = 'relative';
                const wrapper = document.createElement('div');
                wrapper.className = 'checkbox-wrapper';
                const $checkbox = createItemToggleCheckbox(async function(e, isManual) {
                    await updateAddRow($(this).closest("li.clearfix"), this.checked, isManual);
                }, 'Add Page Checkbox Click');
                $(wrapper).append($checkbox);
                title.appendChild(wrapper);
                added++;
            }
        }
        p.end(`(added ${added} checkboxes)`);
        $(document)
            .off("dblclick", ".amount input")
            .on("dblclick", ".amount input", function () {
            const $row = $(this).closest("li.clearfix");
            const qty = $row.find(".item-amount.qty").text().trim();
            if (qty) {
                $(this).val(qty);
                $(this)[0].dispatchEvent(new Event("input", { bubbles: true }));
                $(this)[0].dispatchEvent(new Event("keyup", { bubbles: true }));
            }
        });

        if ($(".select-all-action").length === 0) {
            const $clearAllBtn = $(".clear-action");
            if ($clearAllBtn.length) {
                const $selectAllBtn = $('<span class="select-all-action t-blue h c-pointer" style="margin-left: 15px;">Select All</span>');
                $clearAllBtn.before($selectAllBtn);

                $selectAllBtn.on("click", safeExecute(async function(e) {
                    e.preventDefault();
                    if (!getValue("tornApiKey", "")) {
                        const error = new Error("No API key set");
                        error.userMessage = "No Torn API key set. Please click the 'Bazaar Filler Settings' button to enter your API key.";
                        openSettingsModal();
                        throw error;
                    }

                    let $activePanel = $(".items-cont.ui-tabs-panel[style*='display: block']");
                    if (!$activePanel.length) {
                        const $activeTab = $(".ui-tabs-active.ui-state-active");
                        if ($activeTab.length) {
                            const tabId = $activeTab.find("a").attr("href").replace("#", "");
                            $activePanel = $(`.items-cont.ui-tabs-panel[data-reactid*='$${tabId}']`);
                        }
                        if (!$activePanel.length) {
                            $activePanel = $(".items-cont.ui-tabs-panel").filter(function() {
                                return $(this).css("display") !== "none";
                            });
                        }
                    }

                    if ($activePanel.length) {
                        const $checkboxes = $activePanel.find("li.clearfix:not(.disabled) .checkbox-wrapper input.item-toggle:not(:checked)");
                        if ($checkboxes.length === 0) return;

                        for (let i = 0; i < $checkboxes.length; i++) {
                            const $checkbox = $($checkboxes[i]);
                            $checkbox.prop("checked", true);
                            const $row = $checkbox.closest("li.clearfix");
                            await updateAddRow($row, true);
                        }
                    }
                }, 'Select All Click'));
            }
        }
    }
    function addManagePageCheckboxes() {
        const p = profile("addManagePageCheckboxes");
        const root = document.querySelector('#bazaarRoot');
        if (!root) { p.end("(no root)"); return; }

        const rows = root.querySelectorAll('[class*="item___"]');
        if (rows.length === 0) { p.end("(no rows)"); return; }

        let added = 0;
        for (const row of rows) {
            const desc = row.querySelector('[class*="desc___"]');
            if (!desc || desc.querySelector('.checkbox-wrapper')) continue;

            desc.style.position = 'relative';
            const wrapper = document.createElement('div');
            wrapper.className = 'checkbox-wrapper';
            const $checkbox = createItemToggleCheckbox(async function(e, isManual) {
                const $row = $(this).closest('[class*="item___"]');
                if (window.innerWidth <= 784) {
                    const $manageBtn = $row.find('button[aria-label="Manage"]').first();
                    if ($manageBtn.length) {
                        const manageOpen = $manageBtn.find("span").get()
                            .some((el) => [...el.classList].some((c) => c.startsWith("active___")));
                        if (!manageOpen) {
                            $manageBtn.trigger("click");
                        }
                        setTimeout(async () => {
                            await updateManageRowMobile($row, this.checked, isManual);
                        }, 200);
                        return;
                    }
                }
                await updateManageRow($row, this.checked, isManual);
            }, 'Manage Page Checkbox Click');
            $(wrapper).append($checkbox);
            desc.appendChild(wrapper);
            added++;
        }
        p.end(`(added ${added} checkboxes)`);
    }

    const storedItems = localStorage.getItem("tornItems");
    const lastUpdatedTime = getValue("lastUpdatedTime", 0);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const lastUpdatedDate = new Date(lastUpdatedTime);
    const todayUTC = new Date().toISOString().split("T")[0];
    const lastUpdatedUTC = lastUpdatedDate.toISOString().split("T")[0];

    // Force refresh if data is old, missing, or missing the 'city_price' field
    const forceRefreshNeeded = storedItems && !storedItems.includes("city_price");

    if (apiKey && (!storedItems || lastUpdatedUTC < todayUTC || now - lastUpdatedTime >= oneDayMs || forceRefreshNeeded)) {
        safeExecute(async () => {
            debug("Fetching fresh item data from Torn API...");
            const response = await fetch(`https://api.torn.com/torn/?key=${apiKey}&selections=items&comment=wBazaarFiller`);
            const data = await response.json();

            if (!data.items) {
                throw new Error("Failed to fetch Torn items or no items found. Possibly invalid API key or rate limit.");
            }

            const filtered = {};
            for (const [id, item] of Object.entries(data.items)) {
                if (item.tradeable) {
                    // In Torn API, sell_price is what you get from selling to a city shop.
                    // We'll store it as city_price.
                    filtered[id] = {
                        name: item.name,
                        market_value: item.market_value,
                        city_price: item.sell_price || item.buy_price || 0,
                    };
                }
            }

            localStorage.setItem("tornItems", JSON.stringify(filtered));
            updateCachedItems();
            setValue("lastUpdatedTime", now);
            debug("Item data refreshed and stored.");
        }, 'Initial Item Fetch')();
    }
    let observerTimeout;
    let isObserverLocked = false;
    const domObserver = new MutationObserver((mutations) => {
        if (isObserverLocked) return;

        const bazaarRoot = document.getElementById('bazaarRoot');
        let relevant = false;
        
        for (let i = 0; i < mutations.length; i++) {
            const m = mutations[i];
            const target = m.target;
            if (target.nodeType !== 1) continue;

            // If change is inside Bazaar or Sidebar, it's relevant
            if (bazaarRoot && (target === bazaarRoot || bazaarRoot.contains(target))) {
                relevant = true;
                break;
            }
            
            if (target.closest('[class*="linksContainer___"]') || target.closest('#pricing-source-button')) {
                relevant = true;
                break;
            }

            // Fallback for when elements are added to body (like bazaarRoot itself)
            if (m.addedNodes.length) {
                for (let j = 0; j < m.addedNodes.length; j++) {
                    const node = m.addedNodes[j];
                    if (node.nodeType === 1) {
                        if (node.id === 'bazaarRoot' || node.querySelector('#bazaarRoot') || 
                            node.closest('[class*="linksContainer___"]') || node.querySelector('[class*="linksContainer___"]')) {
                            relevant = true;
                            break;
                        }
                    }
                }
            }
            if (relevant) break;
        }
        
        if (!relevant) return;

        clearTimeout(observerTimeout);
        observerTimeout = setTimeout(() => {
            if (isObserverLocked) return;
            
            const hash = window.location.hash;
            // Only proceed if on a valid sub-page or if sidebar buttons are missing
            const needsButtons = !document.getElementById("pricing-source-button");
            
            // If we are not on a valid page AND we don't need buttons, skip
            if (!validPages.includes(hash) && !needsButtons) return;

            isObserverLocked = true;
            const p = profile("DOM Observer Update");
            try {
                if (hash === "#/add") {
                    addAddPageCheckboxes();
                }
                else if (hash === "#/manage") {
                    addManagePageCheckboxes();
                }
                // Always try to add buttons if they are missing, as long as we are in bazaar.php
                addPricingSourceLink();
                addBlackFridayToggle();
                setupPriceDelegation();
            } finally {
                isObserverLocked = false;
                p.end();
            }
        }, 150); // Reduced debounce slightly to feel more responsive while still batching
    });

    // Observe body to catch all relevant changes
    domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'] // Added style to catch virtual scrolling updates
    });

    const initializeUI = safeExecute(() => {
        const p = profile("Initialize UI");
        const hash = window.location.hash;
        if (hash === "#/add") {
            addAddPageCheckboxes();
        } else if (hash === "#/manage") {
            addManagePageCheckboxes();
        }
        addPricingSourceLink();
        addBlackFridayToggle();
        setupPriceDelegation();
        p.end();
    }, 'Initialize UI');

    window.addEventListener('load', () => {
        debug("Window loaded, initializing UI.");
        setTimeout(initializeUI, 100);
    });
    window.addEventListener("hashchange", () => {
        debug("Hash changed, re-initializing UI.");
        currentPage = window.location.hash;
        setTimeout(initializeUI, 100);
    });

    $(document).on("click", 'button[class*="undo___"]', function (e) {
        e.preventDefault();
        $('[class*="item___"] .checkbox-wrapper input.item-toggle:checked').each(function () {
            $(this).prop("checked", false);
            const $row = $(this).closest('[class*="item___"]');
            updateManageRow($row, false);
        });
    });
    $(document).on("click", ".clear-action", function (e) {
        e.preventDefault();
        $("li.clearfix .checkbox-wrapper input.item-toggle:checked").each(function () {
            $(this).prop("checked", false);
            const $row = $(this).closest("li.clearfix");
            updateAddRow($row, false);
        });
    });
    $(document).ready(function () {
        itemMarketCache = {};
        weav3rItemCache = {};
    });

    function copySidebarLinkClasses(linkEl, iconSpan, textSpan, linksContainer) {
        const refLink = linksContainer.querySelector("a[href]:not(#pricing-source-button):not(#black-friday-toggle)")
            || linksContainer.querySelector("a[href]");
        if (!refLink)
            return;
        linkEl.className = refLink.className;
        const refIcon = refLink.querySelector('[class*="iconWrapper___"]');
        const refTitle = refLink.querySelector('[class*="linkTitle___"]');
        if (refIcon)
            iconSpan.className = refIcon.className;
        if (refTitle)
            textSpan.className = refTitle.className;
    }

    let bubbleEl = null;
    function showBubble(anchorRect, text) {
        hideBubble();
        bubbleEl = document.createElement('div');
        bubbleEl.className = 'tooltip-bubble';
        bubbleEl.textContent = text;
        document.body.appendChild(bubbleEl);
        const padding = 8;
        const bw = bubbleEl.offsetWidth;
        const bh = bubbleEl.offsetHeight;
        let left = Math.max(padding, anchorRect.left + window.scrollX - Math.floor(bw/4));
        if (left + bw > window.innerWidth - padding) left = window.innerWidth - bw - padding;
        let top = anchorRect.top + window.scrollY - bh - 10;
        if (top < padding) top = anchorRect.bottom + window.scrollY + 10;
        bubbleEl.style.left = left + 'px';
        bubbleEl.style.top = top + 'px';
        setTimeout(()=>{ document.addEventListener('click', onDocClickForBubble); }, 10);
    }
    function hideBubble() {
        if (bubbleEl && bubbleEl.parentNode) { bubbleEl.parentNode.removeChild(bubbleEl); bubbleEl = null; document.removeEventListener('click', onDocClickForBubble); }
    }
    function onDocClickForBubble(e) { if (bubbleEl && !bubbleEl.contains(e.target)) hideBubble(); }
    function showCenterModalTip(text, title = "Info") {
        let modal = document.getElementById('bf-center-tip');
        if (!modal) {
            modal = document.createElement('div'); modal.id = 'bf-center-tip';
            modal.className = 'settings-modal'; modal.style.maxWidth = '420px'; modal.style.width = Math.min(560, window.innerWidth - 40) + 'px';
            modal.style.position = 'fixed'; modal.style.left = '50%'; modal.style.top = '50%'; modal.style.transform = 'translate(-50%,-50%)'; modal.style.zIndex = 200000;
            modal.innerHTML = `<div class="bf-tip-title" style="font-weight:700;margin-bottom:6px"></div><div class="bf-tip-content" style="line-height:1.4"></div><div style="text-align:right;margin-top:10px"><button id="bf-close-tip" style="padding:6px 8px">OK</button></div>`;
            document.body.appendChild(modal);
            document.getElementById('bf-close-tip').addEventListener('click', ()=> { modal.style.display='none'; });
        }
        modal.querySelector('.bf-tip-title').textContent = title;
        modal.querySelector('.bf-tip-content').innerHTML = text.replace(/\n/g, '<br>');
        modal.style.display = 'block';
    }

    document.addEventListener('click', (e) => { if (bubbleEl && !bubbleEl.contains(e.target)) hideBubble(); });
})();
    }

    debug("Script starting...");

    function handleError(error, context = '') {
        console.error(`[Bazaar Filler] ${context}:`, error);
        debug(`Error in ${context}:`, error);

        if (error.userMessage) {
            alert(error.userMessage);
        }
    }

    function safeExecute(fn, context = '') {
        return async function(...args) {
            debug(`Executing ${context}`);
            try {
                const result = await fn.apply(this, args);
                debug(`Finished executing ${context}`);
                return result;
            } catch (error) {
                handleError(error, context);
                return null;
            }
        };
    }

    const styleBlock = `
  /* checkbox visibility improvements (dark/light) */
  .item-toggle{
      -webkit-appearance:none; -moz-appearance:none; appearance:none;
      display:inline-flex; align-items:center; justify-content:center;
      width:22px; height:22px; border-radius:4px; border:2px solid;
      background:transparent; cursor:pointer; box-sizing:border-box; font-size:13px; line-height:1;
      position:relative;
  }
  .item-toggle::after{
      content:'✔'; display:none;
  }
  .item-toggle:checked::after{ display:block; }

  body.dark-mode .item-toggle{ border-color:#9aa4b2; background:rgba(255,255,255,0.04); color:#9eff9e; }
  body.dark-mode .item-toggle:checked{ background:rgba(120,255,120,0.12); }

  body:not(.dark-mode) .item-toggle{ border-color:#666; background:rgba(0,0,0,0.04); color:#0a7; }
  body:not(.dark-mode) .item-toggle:checked{ background:rgba(0,180,0,0.12); }

  .item-toggle-red { border-color: #ff4444 !important; box-shadow: 0 0 5px rgba(255, 68, 68, 0.5) !important; }
  .item-toggle-red:checked::after { color: #ff4444 !important; }
  body.dark-mode .item-toggle-red:checked { background: rgba(255, 68, 68, 0.3) !important; }
  body:not(.dark-mode) .item-toggle-red:checked { background: rgba(255, 0, 0, 0.15) !important; }

  .city-warning {
      color: #ff4444;
      font-size: 12px;
      margin: 4px 2px;
      display: block;
      width: 100%;
      clear: both;
      font-weight: bold;
      cursor: pointer;
      text-decoration: underline dotted;
      text-align: left;
  }

  .checkbox-wrapper{position:absolute;top:50%;right:8px;width:34px;height:34px;transform:translateY(-50%);cursor:pointer;z-index:10}
  .checkbox-wrapper input.item-toggle{position:absolute;left:6px;top:6px}

  /* rest of modal styles (kept compact & responsive) */
  .settings-modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.55);z-index:99999;display:flex;align-items:center;justify-content:center}
  .settings-modal{background:#2f3237;color:#fff;padding:10px;border-radius:10px;width:92%;max-width:360px;box-shadow:0 2px 20px rgba(0,0,0,0.6);font-family:Arial, sans-serif;font-size:14px;max-height:86vh;overflow:auto}
  body:not(.dark-mode) .settings-modal{background:#fff;color:#111}
  .settings-modal h2{margin:0 0 8px 0;font-weight:700;text-decoration:underline;font-size:16px}
  .settings-row{display:flex;gap:8px;align-items:center;margin-bottom:8px;flex-wrap:wrap}
  .settings-row .label{min-width:120px;font-weight:500}
  .settings-row .compact-input{padding:6px;box-sizing:border-box;font-size:14px}
  .compact-number{width:60px}
  .compact-number-sm{width:48px}
  .compact-select{width:180px}
  .bf-help-btn{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border-radius:50%;background:#666;color:#fff;font-size:12px;cursor:pointer;margin-left:6px;flex:0 0 auto}
  body:not(.dark-mode) .bf-help-btn{background:#e0e0e0;color:#222}
  .bf-listings-btn{display:inline-flex;align-items:center;justify-content:center;width:18px;height:18px;border-radius:50%;background:#555;color:#fff;font-size:11px;cursor:pointer;margin-left:4px;border:1px solid #777}
  body:not(.dark-mode) .bf-listings-btn{background:#eee;color:#333;border-color:#999}
  .tooltip-bubble{position:fixed;z-index:100000;background:#111;color:#fff;padding:8px;border-radius:8px;max-width:320px;font-size:13px;box-shadow:0 2px 10px rgba(0,0,0,0.6)}
  body:not(.dark-mode) .tooltip-bubble{background:#fff;color:#111;border:1px solid #ccc}
  .settings-small-note{font-size:12px;color:#cfcfcf;margin-top:6px}
  .settings-modal button { color: inherit !important; background: transparent !important; border-radius:6px; padding:6px 8px; border:1px solid rgba(255,255,255,0.06); cursor:pointer; }
  body:not(.dark-mode) .settings-modal button { border:1px solid #ddd; }
  @media (max-width:420px){.settings-row .label{min-width:90px;font-size:13px}.compact-select{width:140px}}
  
  .black-friday-active {
      color: #28a745 !important;
  }
  .black-friday-active .black-friday-icon {
      color: #28a745 !important;
      fill: #28a745 !important;
  }
  .black-friday-icon {
      color: inherit;
      fill: currentColor;
  }
  .bazaar-table { width: 100%; border-collapse: collapse; margin-top: 10px; font-size: 13px; }
  .bazaar-table th, .bazaar-table td { padding: 6px 4px; border: 1px solid rgba(255,255,255,0.1); text-align: left; }
  body:not(.dark-mode) .bazaar-table th, body:not(.dark-mode) .bazaar-table td { border: 1px solid #ddd; }
  .bazaar-stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin-bottom: 10px; font-size: 13px; }
  .bazaar-stats-grid div { background: rgba(255,255,255,0.05); padding: 4px; border-radius: 4px; text-align: center; }
  body:not(.dark-mode) .bazaar-stats-grid div { background: rgba(0,0,0,0.05); }
  .bazaar-summary-line { margin-top: 8px; font-size: 12px; line-height: 1.4; border-top: 1px solid rgba(255,255,255,0.2); padding-top: 6px; }
  body:not(.dark-mode) .bazaar-summary-line { border-top: 1px solid #ccc; }
  .bazaar-load-more { width: 100%; margin-top: 10px; padding: 8px !important; font-size: 13px !important; }
    `;
    $("<style>")
        .prop("type", "text/css")
        .html(styleBlock)
        .appendTo("head");
    debug("CSS styles injected.");

    const getValue = GM_getValue;
    const setValue = GM_setValue;

    let apiKey = getValue("tornApiKey", "");
    debug("API Key loaded:", apiKey ? "found" : "not found");
    let pricingSource = getValue("pricingSource", "Market Value");
    debug("Pricing Source loaded:", pricingSource);
    if (pricingSource === "Bazaars/TornPal") {
        pricingSource = "Bazaars/weav3r.dev";
        setValue("pricingSource", pricingSource);
        debug("Migrated pricing source from TornPal to weav3r.dev");
    }
    let itemMarketOffset = getValue("itemMarketOffset", -1);
    let itemMarketMarginType = getValue("itemMarketMarginType", "absolute");
    let itemMarketListing = getValue("itemMarketListing", 1);
    let itemMarketClamp = getValue("itemMarketClamp", false);
    let marketMarginOffset = getValue("marketMarginOffset", 0);
    let marketMarginType = getValue("marketMarginType", "absolute");
    let bazaarMarginOffset = getValue("bazaarMarginOffset", 0);
    let bazaarMarginType = getValue("bazaarMarginType", "absolute");
    let bazaarClamp = getValue("bazaarClamp", false);
    let bazaarListing = getValue("bazaarListing", 1);
    let lockCityBetter = getValue("lockCityBetter", false);
    let clampMinIMEnabled = getValue("clampMinIMEnabled", false);
    let clampMinIMPercent = getValue("clampMinIMPercent", 5);
    let blackFridayMode = getValue("blackFridayMode", false);
    let keepMinEnabled = getValue("keepMinEnabled", false);
    let keepMinCount = getValue("keepMinCount", 1);
    let lotEnabled = getValue("lotEnabled", false);
    let lotSize = getValue("lotSize", 0);
    let moneyLimitEnabled = getValue("moneyLimitEnabled", false);
    let moneyLimitValue = getValue("moneyLimitValue", 0);
    let showBazaarOnClick = getValue("showBazaarOnClick", false);
    const validPages = ["#/add", "#/manage"];
    let currentPage = window.location.hash;
    let itemMarketCache = {};
    let weav3rItemCache = {};
    let cachedTornItems = {};

    function updateCachedItems() {
        const p = profile("updateCachedItems");
        const stored = localStorage.getItem("tornItems");
        if (stored) {
            try {
                cachedTornItems = JSON.parse(stored);
                p.end(`(${Object.keys(cachedTornItems).length} items)`);
            } catch (e) {
                debug("Error parsing tornItems from localStorage", e);
                cachedTornItems = {};
            }
        } else {
            p.end("(No items in storage)");
        }
    }
    updateCachedItems();


    function getItemIdByName(itemName) {
        for (const id in cachedTornItems) {
            if (cachedTornItems[id].name === itemName)
                return id;
        }
        return null;
    }

    function calculateBazaarStats(listings) {
        if (!listings || listings.length === 0) return { totalQty: 0, average: 0, median: 0 };

        let totalQty = 0;
        let totalPrice = 0;

        // Sort by price for median calculation
        const sortedListings = [...listings].sort((a, b) => Number(a.price) - Number(b.price));

        for (const l of sortedListings) {
            const qty = Number(l.quantity || l.amount || 0);
            const price = Number(l.price || 0);
            totalQty += qty;
            totalPrice += (price * qty);
        }

        const average = totalQty > 0 ? Math.round(totalPrice / totalQty) : 0;

        // Accurate median from frequency distribution
        let median = 0;
        if (totalQty > 0) {
            const mid1 = Math.floor((totalQty + 1) / 2);
            const mid2 = Math.floor((totalQty + 2) / 2);

            let currentCount = 0;
            let val1 = null;
            let val2 = null;

            for (const l of sortedListings) {
                const qty = Number(l.quantity || l.amount || 0);
                const price = Number(l.price || 0);
                currentCount += qty;

                if (val1 === null && currentCount >= mid1) val1 = price;
                if (val2 === null && currentCount >= mid2) val2 = price;
                if (val1 !== null && val2 !== null) break;
            }
            median = Math.round((val1 + val2) / 2);
        }

        return { totalQty, average, median };
    }

    async function showBazaarDataModal(itemId, itemName) {
        if (!itemId) return;

        // Show loading state using existing modal function
        showCenterModalTip("Fetching bazaar data for " + itemName + "...", "Loading...");

        try {
            const data = await safeExecute(fetchWeav3rItemData, 'Fetch weav3r.dev Data')(itemId);
            if (!data || !data.listings || data.listings.length === 0) {
                showCenterModalTip("No bazaar listings available for this item on weav3r.dev", "No Data");
                return;
            }

            let shownCount = 5;
            const allListings = data.listings;

            const updateModalContent = () => {
                const currentListings = allListings.slice(0, shownCount);
                const stats = calculateBazaarStats(currentListings);

                const statsGrid = `
                    <div class="bazaar-stats-grid">
                        <div><b>Market Price</b><br>$${Number(data.market_price || 0).toLocaleString()}</div>
                        <div><b>Bazaar Avg</b><br>$${Number(data.bazaar_average || 0).toLocaleString()}</div>
                        <div><b>Total Lists</b><br>${Number(data.total_listings || 0).toLocaleString()}</div>
                    </div>
                `;

                let tableRows = "";
                for (const l of currentListings) {
                    tableRows += `
                        <tr>
                            <td>$${Number(l.price).toLocaleString()}</td>
                            <td>${Number(l.quantity || l.amount).toLocaleString()}</td>
                            <td>${l.player_name || 'N/A'}</td>
                        </tr>
                    `;
                }

                const table = `
                    <table class="bazaar-table">
                        <thead>
                            <tr><th>Price</th><th>Qty</th><th>Player</th></tr>
                        </thead>
                        <tbody>${tableRows}</tbody>
                    </table>
                `;

                const summary = `
                    <div class="bazaar-summary-line">
                        <b>Current View Stats:</b><br>
                        Total Qty Shown: ${stats.totalQty.toLocaleString()}<br>
                        Weighted Avg: $${stats.average.toLocaleString()}<br>
                        Median: $${stats.median.toLocaleString()}
                    </div>
                `;

                const loadMoreBtn = shownCount < allListings.length
                    ? `<button class="bazaar-load-more" id="bazaar-btn-load-more">Show 5 More Bazaar Listings</button>`
                    : "";

                const content = `
                    ${statsGrid}
                    <div style="max-height: 250px; overflow-y: auto; margin-top:10px;">
                        ${table}
                    </div>
                    ${summary}
                    ${loadMoreBtn}
                `;

                // Update the existing modal
                let modal = document.getElementById('bf-center-tip');
                if (modal) {
                    modal.querySelector('.bf-tip-title').textContent = "Bazaar Info: " + itemName;
                    modal.querySelector('.bf-tip-content').innerHTML = content;

                    const btn = document.getElementById('bazaar-btn-load-more');
                    if (btn) {
                        btn.onclick = (e) => {
                            e.preventDefault();
                            shownCount = Math.min(shownCount + 5, allListings.length);
                            updateModalContent();
                        };
                    }
                }
            };

            updateModalContent();

        } catch (e) {
            console.error("Error in Bazaar Data Modal:", e);
            showCenterModalTip("Failed to fetch data from weav3r.dev. Check your internet connection or if the item exists.", "Error");
        }
    }
    function getPriceColor(listedPrice, marketValue) {
        if (marketValue <= 0)
            return "";
        const ratio = listedPrice / marketValue;
        const lowerBound = 0.998;
        const upperBound = 1.002;
        const isDarkMode = document.body.classList.contains("dark-mode");
        if (ratio >= lowerBound && ratio <= upperBound) {
            return "";
        }
        if (ratio < lowerBound) {
            const diff = lowerBound - ratio;
            const t = Math.min(diff / 0.05, 1.2);
            if (isDarkMode) {
                const r = Math.round(255 - t * (255 - 190));
                const g = Math.round(255 - t * (255 - 70));
                const b = Math.round(255 - t * (255 - 70));
                return `rgb(${r},${g},${b})`;
            }
            else {
                const r = Math.round(180 - t * 40);
                const g = Math.round(60 - t * 40);
                const b = Math.round(60 - t * 40);
                return `rgb(${r},${g},${b})`;
            }
        }
        else {
            const diff = ratio - upperBound;
            const t = Math.min(diff / 0.05, 1.2);
            if (isDarkMode) {
                const r = Math.round(255 - t * (255 - 70));
                const g = Math.round(255 - t * (255 - 190));
                const b = Math.round(255 - t * (255 - 70));
                return `rgb(${r},${g},${b})`;
            }
            else {
                const r = Math.round(60 - t * 40);
                const g = Math.round(160 - t * 40);
                const b = Math.round(60 - t * 40);
                return `rgb(${r},${g},${b})`;
            }
        }
    }
    async function fetchItemMarketData(itemId) {
        debug(`Fetching Item Market data for item ID: ${itemId}`);
        if (!apiKey) {
            const error = new Error("No API key set for Item Market calls.");
            error.userMessage = "No API key set. Please set your Torn API key in Bazaar Filler Settings before continuing.";
            throw error;
        }
        const now = Date.now();
        if (itemMarketCache[itemId] && now - itemMarketCache[itemId].time < 30000) {
            debug("Returning cached Item Market data.");
            return itemMarketCache[itemId].data;
        }
        const url = `https://api.torn.com/v2/market/${itemId}/itemmarket?comment=wBazaarFiller`;
        debug("Fetching from URL:", url);
        const res = await fetch(url, {
            headers: { Authorization: "ApiKey " + apiKey },
        });
        const data = await res.json();
        if (data.error) {
            const error = new Error("Item Market API error: " + data.error.error);
            error.userMessage = "Item Market API error: " + data.error.error;
            throw error;
        }
        debug("Successfully fetched Item Market data, caching now.");
        itemMarketCache[itemId] = { time: now, data };
        return data;
    }
    async function fetchWeav3rItemData(itemId) {
        debug(`Fetching weav3r.dev data for item ID: ${itemId}`);
        const now = Date.now();
        if (weav3rItemCache[itemId] && now - weav3rItemCache[itemId].time < 60000) {
            debug("Returning cached weav3r.dev data.");
            return weav3rItemCache[itemId].data;
        }
        return new Promise((resolve, reject) => {
            const url = `https://weav3r.dev/api/marketplace/${itemId}`;
            debug("Fetching from URL:", url);
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                onload: function (response) {
                    debug("Successfully fetched weav3r.dev data, caching now.");
                    const data = JSON.parse(response.responseText);
                    weav3rItemCache[itemId] = { time: now, data };
                    resolve(data);
                },
                onerror: function (err) {
                    debug("Error fetching weav3r.dev data:", err);
                    reject(new Error("Failed fetching weav3r.dev item data"));
                },
            });
        });
    }
    function updatePriceFieldColor($priceInput) {
        var _a;
        let $row = $priceInput.closest("li.clearfix");
        let itemName = "";
        if ($row.length) {
            itemName = $row.find(".name-wrap span.t-overflow").text().trim();
        }
        else {
            $row = $priceInput.closest('[class*="item___"]');
            itemName = $row.length ? $row.find('[class*="desc___"] b').text().trim() : "";
        }
        if (!itemName)
            return;

        const matchedItem = Object.values(cachedTornItems).find((i) => i.name === itemName);
        if (!matchedItem || !matchedItem.market_value)
            return;
        const raw = ((_a = $priceInput.val()) === null || _a === void 0 ? void 0 : _a.replace(/,/g, "")) || "";
        const typedPrice = Number(raw);
        if (isNaN(typedPrice)) {
            $priceInput.css("color", "");
            return;
        }
        $priceInput.css("color", getPriceColor(typedPrice, matchedItem.market_value));
    }

    function setupPriceDelegation() {
        const $root = $('#bazaarRoot');
        if (!$root.length || $root.data('bfDelegation')) return;

        debug("Setting up event delegation for price fields...");
        $root.on('input focus', 'input', function(e) {
            const $target = $(this);
            // Robust check if this input is within a price container
            const isPrice = $target.closest('.price, [class*="price___"], [class*="priceMobile___"]').length > 0;
            if (isPrice) {
                updatePriceFieldColor($target);
            }
        });
        $root.data('bfDelegation', true);
    }

    async function getLowestItemMarketPrice(itemId) {
        if (!itemId) return null;
        const data = await safeExecute(fetchItemMarketData, 'Fetch Item Market Data for Clamp')(itemId);
        if (!data || !data.itemmarket || !Array.isArray(data.itemmarket.listings) || data.itemmarket.listings.length === 0) return null;
        const prices = data.itemmarket.listings.map(l => Number(l.price)).filter(p => !isNaN(p) && isFinite(p));
        if (prices.length === 0) return null;
        return Math.min(...prices);
    }

    async function calculatePrice(itemName, itemId, matchedItem) {
        if (!matchedItem) {
            debug(`No matched item data for: ${itemName}`);
            return null;
        }

        if (pricingSource === "Market Value") {
            const mv = Number(matchedItem.market_value);
            let finalPrice = mv;
            if (marketMarginType === "absolute") {
                finalPrice += Number(marketMarginOffset);
            } else if (marketMarginType === "percentage") {
                finalPrice = Math.round(mv * (1 + Number(marketMarginOffset) / 100));
            }
            return { price: finalPrice, marketValue: mv };
        }

        if (pricingSource === "Item Market" && itemId) {
            debug(`Calculating price via Item Market for ${itemName} (${itemId})`);
            const data = await safeExecute(fetchItemMarketData, 'Fetch Item Market Data')(itemId);
            if (!data || !data.itemmarket?.listings?.length) return null;

            const listings = data.itemmarket.listings;
            const baseIndex = Math.min(itemMarketListing - 1, listings.length - 1);
            const listingPrice = Number(listings[baseIndex].price);

            let finalPrice;
            if (itemMarketMarginType === "absolute") {
                finalPrice = listingPrice + Number(itemMarketOffset);
            } else if (itemMarketMarginType === "percentage") {
                finalPrice = Math.round(listingPrice * (1 + Number(itemMarketOffset) / 100));
            } else {
                finalPrice = listingPrice;
            }

            if (itemMarketClamp && matchedItem.market_value) {
                finalPrice = Math.max(finalPrice, Number(matchedItem.market_value));
            }

            if (clampMinIMEnabled) {
                const lowest = await getLowestItemMarketPrice(itemId);
                if (lowest !== null && !isNaN(Number(lowest))) {
                    const minAllowed = Math.round(Number(lowest) * (1 - (clampMinIMPercent / 100)));
                    finalPrice = Math.max(finalPrice, minAllowed);
                }
            }

            return {
                price: finalPrice,
                marketValue: Number(matchedItem.market_value),
                listings: listings.slice(0, 5)
            };
        }

        if (pricingSource === "Bazaars/weav3r.dev") {
            if (!itemId) {
                debug(`No item ID for ${itemName}, cannot fetch weav3r.dev data`);
                return null;
            }
            debug(`Calculating price via weav3r.dev for ${itemName} (${itemId})`);

            const itemData = await safeExecute(fetchWeav3rItemData, 'Fetch weav3r.dev Item Data')(itemId);
            if (!itemData || !itemData.listings || itemData.listings.length === 0) return null;

            const baseIndex = Math.min(bazaarListing - 1, itemData.listings.length - 1);
            const basePrice = Number(itemData.listings[baseIndex].price);

            let finalPrice;
            if (bazaarMarginType === "absolute") {
                finalPrice = basePrice + Number(bazaarMarginOffset);
            } else if (bazaarMarginType === "percentage") {
                finalPrice = Math.round(basePrice * (1 + Number(bazaarMarginOffset) / 100));
            } else {
                finalPrice = basePrice;
            }

            if (bazaarClamp && matchedItem.market_value) {
                finalPrice = Math.max(finalPrice, Number(matchedItem.market_value));
            }

            if (clampMinIMEnabled && itemId) {
                const lowest = await getLowestItemMarketPrice(itemId);
                if (lowest !== null && !isNaN(Number(lowest))) {
                    const minAllowed = Math.round(Number(lowest) * (1 - (clampMinIMPercent / 100)));
                    finalPrice = Math.max(finalPrice, minAllowed);
                }
            }

            return { price: finalPrice, marketValue: Number(matchedItem.market_value) };
        }

        return null;
    }

    function parseShortNumber(input) {
        if (input === null || input === undefined) return NaN;
        let s = String(input).trim().toLowerCase().replace(/,/g, "");
        if (s === "") return NaN;
        const suffix = s.slice(-1);
        let multiplier = 1;
        if (suffix === "k") { multiplier = 1e3; s = s.slice(0, -1); }
        else if (suffix === "m") { multiplier = 1e6; s = s.slice(0, -1); }
        else if (suffix === "b") { multiplier = 1e9; s = s.slice(0, -1); }
        const num = Number(s);
        if (isNaN(num)) return NaN;
        return Math.floor(num * multiplier);
    }

    function calculateQuantityToSell(totalOwned, unitPrice) {
        totalOwned = Math.max(0, parseInt(totalOwned || 0, 10) || 0);
        const minKeep = (keepMinEnabled ? Math.max(0, parseInt(keepMinCount || 0, 10) || 0) : 0);
        const maxByKeep = Math.max(totalOwned - minKeep, 0);

        let maxByMoney = totalOwned;
        if (moneyLimitEnabled && unitPrice && !isNaN(unitPrice) && Number(unitPrice) > 0) {
            maxByMoney = Math.floor(moneyLimitValue / Number(unitPrice));
            if (isNaN(maxByMoney) || !isFinite(maxByMoney)) maxByMoney = totalOwned;
        }

        let initialQty = Math.min(totalOwned, maxByKeep, maxByMoney);

        let finalQty = initialQty;
        if (lotEnabled && Number(lotSize) > 0) {
            const cap = Math.max(0, parseInt(lotSize || 0, 10) || 0);
            finalQty = Math.min(initialQty, cap);
        }

        finalQty = Math.max(0, Math.floor(finalQty || 0));
        return finalQty;
    }

    async function updateAddRow($row, isChecked, isManual = false) {
        debug(`Updating 'Add' row. Checked: ${isChecked}, Manual: ${isManual}`);
        const $qtyInput = $row.find(".amount input").first();
        const $priceInput = $row.find(".price input").first();
        const $choiceCheckbox = $row.find("div.amount.choice-container input");

        if (!isChecked) {
            debug("Unchecking row, reverting values.");
            if ($choiceCheckbox.length && $choiceCheckbox.prop("checked")) {
                $choiceCheckbox.click();
            }
            if ($qtyInput.data("orig") !== undefined) {
                $qtyInput.val($qtyInput.data("orig"));
                $qtyInput.removeData("orig");
            } else {
                $qtyInput.val("");
            }
            $qtyInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));
            if ($priceInput.data("orig") !== undefined) {
                $priceInput.val($priceInput.data("orig"));
                $priceInput.removeData("orig");
                $priceInput.css("color", "");
            } else {
                $priceInput.val("");
            }
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            $priceInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));
            const $toggle = $row.find(".item-toggle");
            $row.find(".city-warning").remove();
            $toggle.removeClass("item-toggle-red");
            return;
        }

        if (!$qtyInput.data("orig"))
            $qtyInput.data("orig", $qtyInput.val());
        if (!$priceInput.data("orig"))
            $priceInput.data("orig", $priceInput.val());

        const itemName = $row.find(".name-wrap span.t-overflow").text().trim();
        const itemId = getItemIdByName(itemName);
        const matchedItem = Object.values(cachedTornItems).find((i) => i.name === itemName);
        const priceData = await calculatePrice(itemName, itemId, matchedItem);

        let quantityToSell;
        if ($choiceCheckbox.length) {
            if (!$choiceCheckbox.prop("checked")) {
                $choiceCheckbox.click();
            }
        } else {
            const totalOwned = parseInt($row.find(".item-amount.qty").text().trim().replace(/,/g, ''), 10);
            const unitPrice = priceData ? priceData.price : 0;
            quantityToSell = calculateQuantityToSell(totalOwned, unitPrice);
        }

        const $toggle = $row.find(".item-toggle");
        $row.find(".city-warning").remove();
        $toggle.removeClass("item-toggle-red");

        if (lockCityBetter && matchedItem.city_price && priceData && Number(matchedItem.city_price) > priceData.price) {
            debug(`City price ($${matchedItem.city_price}) is better than calculated price ($${priceData.price}) for ${itemName}. Locking.`);
            quantityToSell = 0;
            $toggle.addClass("item-toggle-red");
            const warningMsg = `You would get more money selling this item in the city shop ($${Number(matchedItem.city_price).toLocaleString()}) than in your bazaar ($${priceData.price.toLocaleString()}).`;
            const $warn = $(`<div class="city-warning">⚠ City price is better!</div>`);
            $warn.on('click', (e) => { e.stopPropagation(); showCenterModalTip(warningMsg, "City Shop Warning"); });
            $row.css('flex-wrap', 'wrap').append($warn);

            if (isChecked && isManual) {
                showCenterModalTip(warningMsg, "City Shop Warning");
            }
        }

        if (quantityToSell !== undefined) {
            $qtyInput.val(quantityToSell);
            $qtyInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));
        }

        if (blackFridayMode) {
            $priceInput.val("1");
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            $priceInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));
            return;
        }

        if (!priceData) return;

        if (priceData.listings) {
            const $priceInputWrapper = $row.find(".price").first();
            if ($priceInputWrapper.length && $priceInputWrapper.find(".bf-listings-btn").length === 0) {
                const listingsBtn = createListingsButton(priceData.listings);
                $priceInputWrapper.append(listingsBtn);
            }
        }

        $priceInput.val(priceData.price.toLocaleString("en-US"));
        $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
        $priceInput[0].dispatchEvent(new Event("keyup", { bubbles: true }));

        if (priceData.marketValue) {
            $priceInput.css("color", getPriceColor(priceData.price, priceData.marketValue));
        }
    }
    async function updateManageRow($row, isChecked, isManual = false) {
        const $priceInput = $row.find('[class*="price___"] .input-money-group.success input.input-money').first();
        const $qtyInput = $row.find(".amount input").first();

        if ($priceInput.length === 0) {
            console.warn("Price input not found in the row:", $row);
            return;
        }

        if (!isChecked) {
            if ($priceInput.data("orig") !== undefined) {
                $priceInput.val($priceInput.data("orig"));
                $priceInput.removeData("orig");
                $priceInput.css("color", "");
            } else {
                $priceInput.val("");
            }
            if ($qtyInput.length && $qtyInput.data("orig") !== undefined) {
                $qtyInput.val($qtyInput.data("orig"));
                $qtyInput.removeData("orig");
            }
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            const $toggle = $row.find(".item-toggle");
            $row.find(".city-warning").remove();
            $toggle.removeClass("item-toggle-red");
            return;
        }

        if (!$priceInput.data("orig"))
            $priceInput.data("orig", $priceInput.val());
        if ($qtyInput.length && !$qtyInput.data("orig"))
            $qtyInput.data("orig", $qtyInput.val());

        if (blackFridayMode) {
            $priceInput.val("1");
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            return;
        }

        const itemName = $row.find('[class*="desc___"] b').text().trim();
        const itemId = getItemIdByName(itemName);
        const matchedItem = Object.values(cachedTornItems).find((i) => i.name === itemName);

        const priceData = await calculatePrice(itemName, itemId, matchedItem);
        if (!priceData) return;

        const $toggle = $row.find(".item-toggle");
        $row.find(".city-warning").remove();
        $toggle.removeClass("item-toggle-red");

        if (lockCityBetter && matchedItem.city_price && Number(matchedItem.city_price) > priceData.price) {
            if ($qtyInput.length) {
                $qtyInput.val("0");
                $qtyInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            }
            $toggle.addClass("item-toggle-red");
            const warningMsg = `You would get more money selling this item in the city shop ($${Number(matchedItem.city_price).toLocaleString()}) than in your bazaar ($${priceData.price.toLocaleString()}).`;
            const $warn = $(`<div class="city-warning">⚠ City price is better!</div>`);
            $warn.on('click', (e) => { e.stopPropagation(); showCenterModalTip(warningMsg, "City Shop Warning"); });
            $row.css('flex-wrap', 'wrap').append($warn);

            if (isChecked && isManual) {
                showCenterModalTip(warningMsg, "City Shop Warning");
            }
        }

        if (priceData.listings) {
            const $priceInputWrapper = $row.find('[class*="price___"]').first();
            if ($priceInputWrapper.length && $priceInputWrapper.find(".bf-listings-btn").length === 0) {
                const listingsBtn = createListingsButton(priceData.listings);
                $priceInputWrapper.append(listingsBtn);
            }
        }

        $priceInput.val(priceData.price.toLocaleString("en-US"));
        $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));

        if (priceData.marketValue) {
            $priceInput.css("color", getPriceColor(priceData.price, priceData.marketValue));
        }
    }
    async function updateManageRowMobile($row, isChecked, isManual = false) {
        const $priceInput = $row
            .find("[class*=bottomMobileMenu___] [class*=priceMobile___] .input-money-group.success input.input-money")
            .first();
        const $qtyInput = $row.find(".amount input").first();

        if (!$priceInput.length) {
            console.error("Mobile price field not found.");
            return;
        }

        if (!isChecked) {
            if ($priceInput.data("orig") !== undefined) {
                $priceInput.val($priceInput.data("orig"));
                $priceInput.removeData("orig");
                $priceInput.css("color", "");
            } else {
                $priceInput.val("");
            }
            if ($qtyInput.length && $qtyInput.data("orig") !== undefined) {
                $qtyInput.val($qtyInput.data("orig"));
                $qtyInput.removeData("orig");
            }
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            const $toggle = $row.find(".item-toggle");
            $row.find(".city-warning").remove();
            $toggle.removeClass("item-toggle-red");
            return;
        }

        if (!$priceInput.data("orig"))
            $priceInput.data("orig", $priceInput.val());
        if ($qtyInput.length && !$qtyInput.data("orig"))
            $qtyInput.data("orig", $qtyInput.val());

        if (blackFridayMode) {
            $priceInput.val("1");
            $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            return;
        }

        const itemName = $row.find('[class*="desc___"] b').text().trim();
        const itemId = getItemIdByName(itemName);
        const matchedItem = Object.values(cachedTornItems).find((i) => i.name === itemName);

        const priceData = await calculatePrice(itemName, itemId, matchedItem);
        if (!priceData) return;

        const $toggle = $row.find(".item-toggle");
        $row.find(".city-warning").remove();
        $toggle.removeClass("item-toggle-red");

        if (lockCityBetter && matchedItem.city_price && Number(matchedItem.city_price) > priceData.price) {
            if ($qtyInput.length) {
                $qtyInput.val("0");
                $qtyInput[0].dispatchEvent(new Event("input", { bubbles: true }));
            }
            $toggle.addClass("item-toggle-red");
            const warningMsg = `You would get more money selling this item in the city shop ($${Number(matchedItem.city_price).toLocaleString()}) than in your bazaar ($${priceData.price.toLocaleString()}).`;
            const $warn = $(`<div class="city-warning">⚠ City price is better!</div>`);
            $warn.on('click', (e) => { e.stopPropagation(); showCenterModalTip(warningMsg, "City Shop Warning"); });
            $row.css('flex-wrap', 'wrap').append($warn);

            if (isChecked && isManual) {
                showCenterModalTip(warningMsg, "City Shop Warning");
            }
        }

        if (priceData.listings) {
            const $priceInputWrapper = $row.find("[class*=priceMobile___]").first();
            if ($priceInputWrapper.length && $priceInputWrapper.find(".bf-listings-btn").length === 0) {
                const listingsBtn = createListingsButton(priceData.listings);
                $priceInputWrapper.append(listingsBtn);
            }
        }

        $priceInput.val(priceData.price.toLocaleString("en-US"));
        $priceInput[0].dispatchEvent(new Event("input", { bubbles: true }));

        if (priceData.marketValue) {
            $priceInput.css("color", getPriceColor(priceData.price, priceData.marketValue));
        }
    }

    function openSettingsModal() {
        $(".settings-modal-overlay").remove();
        const $overlay = $('<div class="settings-modal-overlay"></div>');
        const $modal = $(`
              <div class="settings-modal" style="width:400px; max-width:90%; font-family:Arial, sans-serif;">
                  <h2 style="margin-bottom:6px;">Bazaar Filler Settings</h2>

                  <div style="margin-bottom:8px;">
                      <label style="font-weight:bold; display:block; margin-bottom:6px;">Torn API Key</label>
                      <input id="api-key-input" type="text" placeholder="Enter API key" style="width:100%;padding:6px" value="${apiKey || ''}">
                  </div>

                  <div class="settings-row">
                      <div class="label">Pricing Source</div>
                      <select id="pricing-source-select" class="compact-select compact-input">
                          <option value="Market Value">Market Value</option>
                          <option value="Bazaars/weav3r.dev">Bazaars/weav3r.dev</option>
                          <option value="Item Market">Item Market</option>
                      </select>
                      <span class="bf-help-placeholder-pricing"></span>
                  </div>

                  <div id="market-value-options">
                      <div class="settings-row">
                          <div class="label">Margin</div>
                          <input id="market-margin-offset" type="number" class="compact-number compact-input" value="${marketMarginOffset}">
                          <select id="market-margin-type" class="compact-select compact-input" style="width:110px">
                              <option value="absolute">Absolute ($)</option>
                              <option value="percentage">Percentage (%)</option>
                          </select>
                          <span class="bf-help-placeholder-margin"></span>
                      </div>
                  </div>

                  <div id="item-market-options">
                      <div class="settings-row">
                          <div class="label">Listing Index</div>
                          <input id="item-market-listing" type="number" class="compact-number compact-input" value="${itemMarketListing}">
                          <span class="bf-help-placeholder-listing"></span>
                          <div style="flex:1"></div>
                      </div>
                      <div class="settings-row">
                          <div class="label">Margin</div>
                          <input id="item-market-offset" type="number" class="compact-number compact-input" value="${itemMarketOffset}">
                          <select id="item-market-margin-type" class="compact-select compact-input" style="width:110px">
                              <option value="absolute">Absolute ($)</option>
                              <option value="percentage">Percentage (%)</option>
                          </select>
                          <span class="bf-help-placeholder-margin"></span>
                      </div>
                  </div>

                  <div id="weav3r-options">
                      <div class="settings-row">
                          <div class="label">Listing Index</div>
                          <input id="weav3r-listing" type="number" class="compact-number compact-input" value="${bazaarListing}">
                          <span class="bf-help-placeholder-listing"></span>
                      </div>
                      <div class="settings-row">
                          <div class="label">Margin</div>
                          <input id="weav3r-margin-offset" type="number" class="compact-number compact-input" value="${bazaarMarginOffset}">
                          <select id="weav3r-margin-type" class="compact-select compact-input" style="width:110px">
                              <option value="absolute">Absolute ($)</option>
                              <option value="percentage">Percentage (%)</option>
                          </select>
                          <span class="bf-help-placeholder-margin"></span>
                      </div>
                  </div>

                  <hr style="border-top:1px solid #ccc; margin:8px 0;">
                  <div style="font-weight:bold;margin-bottom:6px">Clamping Options</div>

                  <div id="clamp-to-mv-im" class="settings-row" style="align-items:flex-start;">
                      <div style="min-width:120px"><input id="item-market-clamp" type="checkbox" ${itemMarketClamp ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Clamp minimum price to Market Value</div>
                          <span class="bf-help-placeholder"></span>
                      </div>
                  </div>
                  <div id="clamp-to-mv-weav3r" class="settings-row" style="align-items:flex-start;">
                      <div style="min-width:120px"><input id="weav3r-clamp" type="checkbox" ${bazaarClamp ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Clamp minimum price to Market Value</div>
                          <span class="bf-help-placeholder"></span>
                      </div>
                  </div>
                  <div id="clamp-to-im-percent" class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="im-clamp-enabled" type="checkbox" ${clampMinIMEnabled ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Clamp to Item Market minus</div>
                          <input id="im-clamp-percent" type="number" class="compact-number-sm compact-input" value="${clampMinIMPercent}">
                          <div>%</div>
                          <span class="bf-help-placeholder2"></span>
                      </div>
                  </div>
                  <div class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="lock-city-better" type="checkbox" ${lockCityBetter ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Lock sale if price is better in the city</div>
                          <span class="bf-help-placeholder-city"></span>
                      </div>
                  </div>

                  <hr style="border-top:1px solid #ccc; margin:8px 0;">

                  <div style="display:flex; align-items:center; gap:8px; font-weight:bold; margin-bottom:6px">
                      <span>Quantity Handling</span>
                      <span class="bf-help-placeholder-quantity"></span>
                  </div>

                  <div class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="keep-min-enabled" type="checkbox" ${keepMinEnabled ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Always keep at least</div>
                          <input id="keep-min-count" type="number" class="compact-number compact-input" value="${keepMinCount}">
                          <div>items</div>
                          <span class="bf-help-placeholder3"></span>
                      </div>
                  </div>

                  <div class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="lot-enabled" type="checkbox" ${lotEnabled ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Max items to list (lot cap)</div>
                          <input id="lot-size" type="number" class="compact-number compact-input" value="${lotSize}">
                          <div>items</div>
                          <span class="bf-help-placeholder4"></span>
                      </div>
                  </div>

                  <div class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="money-limit-enabled" type="checkbox" ${moneyLimitEnabled ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Limit total value for this item to</div>
                          <input id="money-limit-value" type="text" class="compact-number compact-input" style="width:120px" placeholder="e.g. 5m, 200k" value="${(moneyLimitValue ? moneyLimitValue : '')}">
                          <span class="bf-help-placeholder5"></span>
                      </div>
                  </div>

                  <div class="settings-row" style="align-items:center;">
                      <div style="min-width:120px"><input id="show-bazaar-on-click" type="checkbox" ${showBazaarOnClick ? "checked":""}></div>
                      <div style="flex:1;display:flex;align-items:center;gap:8px">
                          <div>Show Bazaar info on checkbox click</div>
                          <span class="bf-help-placeholder-bazaar-info"></span>
                      </div>
                  </div>

                  <div style="display:flex; justify-content:space-between; align-items:center; margin-top:10px">
                    <button id="settings-refresh-items" style="padding:6px 10px; font-size:12px; opacity:0.8">Refresh Item Data</button>
                    <div>
                        <button id="settings-save" style="padding:6px 10px;margin-right:8px">Save</button>
                        <button id="settings-cancel" style="padding:6px 10px">Cancel</button>
                    </div>
                  </div>
              </div>
          `);
        $overlay.append($modal);
        $("body").append($overlay);
        $("#pricing-source-select").val(pricingSource);
        $("#item-market-margin-type").val(itemMarketMarginType);
        $("#market-margin-type").val(marketMarginType);
        $("#weav3r-margin-type").val(bazaarMarginType);

        function toggleFields() {
            const src = $("#pricing-source-select").val();
            $("#market-value-options").toggle(src === "Market Value");
            $("#item-market-options").toggle(src === "Item Market");
            $("#weav3r-options").toggle(src === "Bazaars/weav3r.dev");
            $("#clamp-to-mv-im").toggle(src === "Item Market");
            $("#clamp-to-mv-weav3r").toggle(src === "Bazaars/weav3r.dev");
            $("#clamp-to-im-percent").toggle(src === "Item Market" || src === "Bazaars/weav3r.dev");
        }
        $("#pricing-source-select").change(toggleFields);
        toggleFields();

        const phPricing = $overlay.find(".bf-help-placeholder-pricing");
        phPricing.each(function(){
            const text = "Select the source for the base price of your items.\n\n- Market Value: Uses Torn's official Market Value. This is a good general-purpose option, but may not always reflect the most current market prices.\n\n- Item Market: Uses the prices from the official Item Market. This is generally more up-to-date than Market Value, but is subject to market manipulation and may not be the best option for all items.\n\n- Bazaars/weav3r.dev: Uses data from weav3r.dev, which aggregates prices from multiple players' bazaars.";
            $(this).replaceWith(createTooltipElement(text));
        });

        const phListing = $overlay.find(".bf-help-placeholder-listing");
        phListing.each(function(){
            const text = "This sets which market listing to base your price on. Use positive numbers: 1 for the cheapest, 2 for the second cheapest, and so on. For example, setting this to 2 and your margin to -$1 will price your item $1 below the second cheapest on the market. The default is 1.";
            $(this).replaceWith(createTooltipElement(text));
        });

        const phMargin = $overlay.find(".bf-help-placeholder-margin");
        phMargin.each(function(){
            const text = "Set a margin to adjust the calculated price.\n\n- Absolute ($): Adjusts the price by a fixed amount. A value of -1 will set your price $1 below the calculated price.\n\n- Percentage (%): Adjusts the price by a percentage of the calculated price. A value of -1 will set your price 1% below the calculated price.\n\nExample (Absolute): If the calculated price is $1,000 and you set a margin of -1, your price will be $999.\n\nExample (Percentage): If the calculated price is $1,000 and you set a margin of -1, your price will be $990.";
            $(this).replaceWith(createTooltipElement(text));
        });

        const phCity = $overlay.find(".bf-help-placeholder-city");
        phCity.each(function(){
            const text = "When checked, the script compares the calculated bazaar price with the price you'd get from selling the item directly to a city shop. If the city shop offers more, the script will set the quantity to 0 and highlight the row in red, preventing you from accidentally selling at a loss compared to city shops.";
            $(this).replaceWith(createTooltipElement(text));
        });

        const ph1 = $overlay.find(".bf-help-placeholder");
        ph1.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option ensures that your item's price will not be set below its Market Value, even if the calculated price (based on your other settings) is lower.")); });
        const ph2 = $overlay.find(".bf-help-placeholder2");
        ph2.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option ensures that your item's price will not be set below a certain percentage of the cheapest item on the market. This is useful for making sure your items are always competitively priced, while still accounting for the 5% fee that is charged when selling on the Item Market.\n\nExample: If the cheapest item on the market is $1,000 and you set the percentage to 5%, your price will not be set below $950.")); });
        const ph3 = $overlay.find(".bf-help-placeholder3");
        ph3.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option will ensure that you always keep a certain number of items in your inventory. This is useful for items that you use frequently, or for items that you want to keep in stock for your bazaar.\n\nExample: If you have 100 of a plushie and you set this value to 10, the script will only list 90 of them for sale.")); });
        const ph4 = $overlay.find(".bf-help-placeholder4");
        ph4.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option will limit the number of items that are listed for sale. This is a maximum cap, not a multiple.\n\nExample: If you have 100 of a plushie and you set this value to 50, the script will only list 50 of them for sale.")); });
        const ph5 = $overlay.find(".bf-help-placeholder5");
        ph5.each(function(){ $(this).replaceWith(createTooltipElement("When checked, this option will limit the total value of the items that are listed for sale. This is useful for managing your bazaar's total value.\n\nExample: If you have 100 of a plushie and you set this value to 500,000, and the calculated price per plushie is $10,000, the script will only list 50 of them for sale (50 * $10,000 = $500,000).")); });

        const phQuantity = $overlay.find(".bf-help-placeholder-quantity");
        phQuantity.each(function(){
            const text = "This option helps you control how many of each item you list. Here's how they work together:\n1. First, the script checks the \"Always keep at least\" setting. If you have 100 plushies and want to keep 10, it will only consider listing 90.\n2. Next, it calculates the price and checks the \"Limit total value\" setting. If your 90 plushies are priced at $10,000 each and you set a limit of $500,000, it will only list 50 ($500,000 / $10,000).\n3. Finally, it applies the \"Max items to list (lot cap).\" If you set a lot cap of 25, it will reduce the quantity from 50 to 25.\nThe script always lists the lowest quantity calculated from these rules.";
            $(this).replaceWith(createTooltipElement(text));
        });

        const phBazaarInfo = $overlay.find(".bf-help-placeholder-bazaar-info");
        phBazaarInfo.each(function(){
            const text = "When enabled, clicking an item's checkbox will open a floating window showing the 5 cheapest bazaar listings from weav3r.dev, along with market stats (average, median, etc.).";
            $(this).replaceWith(createTooltipElement(text));
        });

        function createTooltipElement(text) {
            const btn = document.createElement('div'); btn.className = 'bf-help-btn'; btn.textContent = 'i'; btn.dataset.tip = text;
            btn.addEventListener('click', (e) => { e.stopPropagation(); if ('ontouchstart' in window || window.innerWidth < 720) showCenterModalTip(text); else showBubble(btn.getBoundingClientRect(), text); });
            btn.addEventListener('mouseenter', () => { if (!('ontouchstart' in window) && window.innerWidth >= 720) showBubble(btn.getBoundingClientRect(), text); });
            btn.addEventListener('mouseleave', () => { if (!('ontouchstart' in window) && window.innerWidth >= 720) hideBubble(); });
            return btn;
        }

    function createListingsButton(listings) {
        const listingsText = listings.map((x, i) => `${i + 1}) $${x.price.toLocaleString("en-US")} x${x.amount}`).join("\n");
        const btn = document.createElement('div');
        btn.className = 'bf-listings-btn';
        btn.textContent = 'i';
        btn.dataset.tip = listingsText;

        const showModal = (e) => {
            e.stopPropagation();
            const formattedText = listings.map((x, i) => `${i + 1}) $${x.price.toLocaleString("en-US")} (x${x.amount.toLocaleString("en-US")})`).join("<br>");
            showCenterModalTip(formattedText, "Cheapest Market Listings");
        };

        const showTip = () => {
            if (!('ontouchstart' in window) && window.innerWidth >= 720) {
                showBubble(btn.getBoundingClientRect(), listingsText);
            }
        };

        const hideTip = () => {
            if (!('ontouchstart' in window) && window.innerWidth >= 720) {
                hideBubble();
            }
        };

        btn.addEventListener('click', showModal);
        btn.addEventListener('mouseenter', showTip);
        btn.addEventListener('mouseleave', hideTip);

        return btn;
    }

        $("#settings-save").click(function () {
            var _a;
            apiKey = ((_a = $("#api-key-input").val()) === null || _a === void 0 ? void 0 : _a.trim()) || "";
            pricingSource = $("#pricing-source-select").val();
            
            marketMarginOffset = Number($("#market-margin-offset").val() || 0);
            marketMarginType = $("#market-margin-type").val();
            
            itemMarketListing = Math.max(1, Number($("#item-market-listing").val() || 1));
            itemMarketOffset = Number($("#item-market-offset").val() || -1);
            itemMarketMarginType = $("#item-market-margin-type").val();
            itemMarketClamp = $("#item-market-clamp").is(":checked");
            
            bazaarMarginOffset = Number($("#weav3r-margin-offset").val() || 0);
            bazaarMarginType = $("#weav3r-margin-type").val();
            bazaarClamp = $("#weav3r-clamp").is(":checked");
            bazaarListing = Math.max(1, Number($("#weav3r-listing").val() || 1));

            keepMinEnabled = $("#keep-min-enabled").is(":checked");
            keepMinCount = Number($("#keep-min-count").val() || 0) || 0;
            lotEnabled = $("#lot-enabled").is(":checked");
            lotSize = Number($("#lot-size").val() || 0) || 0;
            moneyLimitEnabled = $("#money-limit-enabled").is(":checked");
            const rawMoneyText = ($("#money-limit-value").val() || "").toString().trim();
            if (moneyLimitEnabled && rawMoneyText) {
                const parsed = parseShortNumber(rawMoneyText);
                moneyLimitValue = isNaN(parsed) ? 0 : parsed;
            } else { moneyLimitValue = 0; }

            clampMinIMEnabled = $("#im-clamp-enabled").is(":checked");
            clampMinIMPercent = Number($("#im-clamp-percent").val() || 0) || 0;
            lockCityBetter = $("#lock-city-better").is(":checked");
            showBazaarOnClick = $("#show-bazaar-on-click").is(":checked");
            
            setValue("tornApiKey", apiKey);
            setValue("pricingSource", pricingSource);
            setValue("marketMarginOffset", marketMarginOffset);
            setValue("marketMarginType", marketMarginType);
            setValue("itemMarketListing", itemMarketListing);
            setValue("itemMarketOffset", itemMarketOffset);
            setValue("itemMarketMarginType", itemMarketMarginType);
            setValue("itemMarketClamp", itemMarketClamp);
            setValue("bazaarMarginOffset", bazaarMarginOffset);
            setValue("bazaarMarginType", bazaarMarginType);
            setValue("bazaarClamp", bazaarClamp);
            setValue("bazaarListing", bazaarListing);
            setValue("keepMinEnabled", keepMinEnabled);
            setValue("keepMinCount", keepMinCount);
            setValue("lotEnabled", lotEnabled);
            setValue("lotSize", lotSize);
            setValue("moneyLimitEnabled", moneyLimitEnabled);
            setValue("moneyLimitValue", moneyLimitValue);
            setValue("clampMinIMEnabled", clampMinIMEnabled);
            setValue("clampMinIMPercent", clampMinIMPercent);
            setValue("lockCityBetter", lockCityBetter);
            setValue("showBazaarOnClick", showBazaarOnClick);

            $overlay.remove();
        });
        $("#settings-cancel").click(() => $overlay.remove());
        $("#settings-refresh-items").click(function() {
            if (!apiKey) {
                alert("Please enter and save your API key first.");
                return;
            }
            const btn = $(this);
            const oldText = btn.text();
            btn.text("Refreshing...").prop("disabled", true);

            safeExecute(async () => {
                const response = await fetch(`https://api.torn.com/torn/?key=${apiKey}&selections=items&comment=wBazaarFiller`);
                const data = await response.json();
                if (!data.items) throw new Error("Failed to fetch items");

                const filtered = {};
                for (const [id, item] of Object.entries(data.items)) {
                    if (item.tradeable) {
                        filtered[id] = {
                            name: item.name,
                            market_value: item.market_value,
                            city_price: item.sell_price || item.buy_price || 0,
                        };
                    }
                }
                localStorage.setItem("tornItems", JSON.stringify(filtered));
                updateCachedItems();
                setValue("lastUpdatedTime", Date.now());
                alert("Item data refreshed successfully!");
                btn.text(oldText).prop("disabled", false);
            }, 'Manual Item Refresh')();
        });
    }
    function addPricingSourceLink() {
        if (document.getElementById("pricing-source-button"))
            return;

        const linksContainer = document.querySelector('[class*="linksContainer___"]');
        if (!linksContainer) {
            return;
        }

        const link = document.createElement("a");
        link.id = "pricing-source-button";
        link.href = "#";
        link.target = "_self";
        link.rel = "noreferrer";

        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                <path d="M8 4.754a3.246 3.246 0 1 1 0 6.492 3.246 3.246 0 0 1 0-6.492zM5.754 8a2.246 2.246 0 1 0 4.492 0 2.246 2.246 0 0 0-4.492 0z"/>
                <path d="M9.796 1.343c-.527-1.79-3.065-1.79-3.592 0l-.094.319a.873.873 0 0 0-1.255.52l-.292-.16c-1.64-.892-3.433.902-2.54 2.541l.159.292a.873.873 0 0 0-.52 1.255l-.319.094c-1.79.527-1.79 3.065 0 3.592l.319.094a.873.873 0 0 0 .52 1.255l-.16.292c-.892 1.64.901 3.433 2.54 2.54l.292-.16a.873.873 0 0 0 1.255.52l.094.319c.527 1.79 3.065 1.79 3.592 0l.094-.319a.873.873 0 0 0 1.255-.52l.292.16c1.64.893 3.433-.902 2.54-2.541l-.16-.292a.873.873 0 0 0-.52-1.255l-.319-.094c1.79-.527 1.79-3.065 0-3.592l-.319-.094a.873.873 0 0 0-.52-1.255l-.16-.292c-.893-1.64-.902-3.433-2.54-2.54l-.292.16a.873.873 0 0 0-1.255-.52l-.094-.319zm-2.633.283c.246-.835 1.428-.835 1.674 0l.094.319a1.873 1.873 0 0 0 2.693 1.115l.291-.16c.764-.416 1.6.42 1.184 1.185l-.16.292a1.873 1.873 0 0 0 1.116 2.692l.318.094c.835.246.835 1.428 0 1.674l-.318.094a1.873 1.873 0 0 0-1.116 2.692l.16.292c.416.764-.42 1.6-1.185 1.184l-.291-.16a1.873 1.873 0 0 0-1.116-2.692l-.318-.094c-.835-.246-.835-1.428 0-1.674l.318-.094a1.873 1.873 0 0 0 1.116-2.692l-.16-.292c-.416-.764.42-1.6 1.185-1.184l.292.16a1.873 1.873 0 0 0 2.693-1.115l.094-.318z"/>
            </svg>
        `;
        link.appendChild(iconSpan);

        const textSpan = document.createElement("span");
        textSpan.textContent = "Bazaar Filler Settings";
        link.appendChild(textSpan);

        copySidebarLinkClasses(link, iconSpan, textSpan, linksContainer);

        link.addEventListener("click", function (e) {
            e.preventDefault();
            openSettingsModal();
        });

        linksContainer.insertBefore(link, linksContainer.firstChild);
    }
    function addBlackFridayToggle() {
        if (document.getElementById("black-friday-toggle"))
            return;

        const linksContainer = document.querySelector('[class*="linksContainer___"]');
        if (!linksContainer) {
            return;
        }

        const link = document.createElement("a");
        link.id = "black-friday-toggle";
        link.href = "#";
        link.target = "_self";
        link.rel = "noreferrer";

        const iconSpan = document.createElement("span");
        iconSpan.innerHTML = `
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16" class="black-friday-icon" style="color: ${blackFridayMode ? "#28a745" : "inherit"}; fill: ${blackFridayMode ? "#28a745" : "currentColor"};">
                <path d="M4 10.781c.148 1.667 1.513 2.85 3.591 3.003V15h1.043v-1.216c2.27-.179 3.678-1.438 3.678-3.3 0-1.59-.947-2.51-2.956-3.028l-.722-.187V3.467c1.122.11 1.879.714 2.07 1.616h1.47c-.166-1.6-1.54-2.748-3.54-2.875V1H7.591v1.233c-1.939.23-3.27 1.472-3.27 3.156 0 1.454.966 2.483 2.661 2.917l.61.162v4.031c-1.149-.17-1.94-.8-2.131-1.718H4zm3.391-3.836c-1.043-.263-1.6-.825-1.6-1.616 0-.944.704-1.641 1.8-1.828v3.495l-.2-.05zm1.591 1.872c1.287.323 1.852.859 1.852 1.769 0 1.097-.826 1.828-2.2 1.939V8.73l.348.086z"/>
            </svg>
        `;
        link.appendChild(iconSpan);

        const textSpan = document.createElement("span");
        textSpan.textContent = blackFridayMode ? "Black Friday: ON" : "Black Friday: OFF";
        link.appendChild(textSpan);

        copySidebarLinkClasses(link, iconSpan, textSpan, linksContainer);
        if (blackFridayMode) {
            link.classList.add("black-friday-active");
        }

        link.addEventListener("click", function (e) {
            e.preventDefault();
            blackFridayMode = !blackFridayMode;
            setValue("blackFridayMode", blackFridayMode);
            textSpan.textContent = blackFridayMode ? "Black Friday: ON" : "Black Friday: OFF";
            const svg = this.querySelector(".black-friday-icon");
            if (svg) {
                svg.style.color = blackFridayMode ? "#28a745" : "inherit";
                svg.style.fill = blackFridayMode ? "#28a745" : "currentColor";
            }
            if (blackFridayMode) {
                link.classList.add("black-friday-active");
            }
            else {
                link.classList.remove("black-friday-active");
            }
        });

        const settingsButton = document.getElementById("pricing-source-button");
        if (settingsButton) {
            linksContainer.insertBefore(link, settingsButton);
        }
        else {
            linksContainer.insertBefore(link, linksContainer.firstChild);
        }
    }
    function createItemToggleCheckbox(updateFunction, context) {
        return $("<input>", {
            type: "checkbox",
            class: "item-toggle",
            click: safeExecute(async function (e) {
                e.stopPropagation();
                const isManualSelection = true;
                if (!getValue("tornApiKey", "")) {
                    const error = new Error("No API key set");
                    error.userMessage = "No Torn API key set. Please click the 'Bazaar Filler Settings' button to enter your API key.";
                    $(this).prop("checked", false);
                    openSettingsModal();
                    throw error;
                }

                if (showBazaarOnClick && isManualSelection && this.checked) {
                    const $row = $(this).closest('li.clearfix, [class*="item___"]');
                    let itemName = "";
                    if ($row.is('li.clearfix')) {
                        itemName = $row.find(".name-wrap span.t-overflow").text().trim();
                    } else {
                        itemName = $row.find('[class*="desc___"] b').text().trim();
                    }
                    const itemId = getItemIdByName(itemName);
                    if (itemId) {
                        showBazaarDataModal(itemId, itemName);
                    }
                }

                await updateFunction.call(this, e, isManualSelection);
            }, context),
        });
    }

    function addAddPageCheckboxes() {
        const p = profile("addAddPageCheckboxes");
        // Target specifically the items containers to narrow the search
        const containers = document.querySelectorAll('.items-cont');
        if (!containers.length) { p.end("(no containers)"); return; }

        let added = 0;
        for (const cont of containers) {
            const titles = cont.querySelectorAll('.title-wrap');
            for (const title of titles) {
                if (title.querySelector('.checkbox-wrapper')) continue;

                title.style.position = 'relative';
                const wrapper = document.createElement('div');
                wrapper.className = 'checkbox-wrapper';
                const $checkbox = createItemToggleCheckbox(async function(e, isManual) {
                    await updateAddRow($(this).closest("li.clearfix"), this.checked, isManual);
                }, 'Add Page Checkbox Click');
                $(wrapper).append($checkbox);
                title.appendChild(wrapper);
                added++;
            }
        }
        p.end(`(added ${added} checkboxes)`);
        $(document)
            .off("dblclick", ".amount input")
            .on("dblclick", ".amount input", function () {
            const $row = $(this).closest("li.clearfix");
            const qty = $row.find(".item-amount.qty").text().trim();
            if (qty) {
                $(this).val(qty);
                $(this)[0].dispatchEvent(new Event("input", { bubbles: true }));
                $(this)[0].dispatchEvent(new Event("keyup", { bubbles: true }));
            }
        });

        if ($(".select-all-action").length === 0) {
            const $clearAllBtn = $(".clear-action");
            if ($clearAllBtn.length) {
                const $selectAllBtn = $('<span class="select-all-action t-blue h c-pointer" style="margin-left: 15px;">Select All</span>');
                $clearAllBtn.before($selectAllBtn);

                $selectAllBtn.on("click", safeExecute(async function(e) {
                    e.preventDefault();
                    if (!getValue("tornApiKey", "")) {
                        const error = new Error("No API key set");
                        error.userMessage = "No Torn API key set. Please click the 'Bazaar Filler Settings' button to enter your API key.";
                        openSettingsModal();
                        throw error;
                    }

                    let $activePanel = $(".items-cont.ui-tabs-panel[style*='display: block']");
                    if (!$activePanel.length) {
                        const $activeTab = $(".ui-tabs-active.ui-state-active");
                        if ($activeTab.length) {
                            const tabId = $activeTab.find("a").attr("href").replace("#", "");
                            $activePanel = $(`.items-cont.ui-tabs-panel[data-reactid*='$${tabId}']`);
                        }
                        if (!$activePanel.length) {
                            $activePanel = $(".items-cont.ui-tabs-panel").filter(function() {
                                return $(this).css("display") !== "none";
                            });
                        }
                    }

                    if ($activePanel.length) {
                        const $checkboxes = $activePanel.find("li.clearfix:not(.disabled) .checkbox-wrapper input.item-toggle:not(:checked)");
                        if ($checkboxes.length === 0) return;

                        for (let i = 0; i < $checkboxes.length; i++) {
                            const $checkbox = $($checkboxes[i]);
                            $checkbox.prop("checked", true);
                            const $row = $checkbox.closest("li.clearfix");
                            await updateAddRow($row, true);
                        }
                    }
                }, 'Select All Click'));
            }
        }
    }
    function addManagePageCheckboxes() {
        const p = profile("addManagePageCheckboxes");
        const root = document.querySelector('#bazaarRoot');
        if (!root) { p.end("(no root)"); return; }

        const rows = root.querySelectorAll('[class*="item___"]');
        if (rows.length === 0) { p.end("(no rows)"); return; }

        let added = 0;
        for (const row of rows) {
            const desc = row.querySelector('[class*="desc___"]');
            if (!desc || desc.querySelector('.checkbox-wrapper')) continue;

            desc.style.position = 'relative';
            const wrapper = document.createElement('div');
            wrapper.className = 'checkbox-wrapper';
            const $checkbox = createItemToggleCheckbox(async function(e, isManual) {
                const $row = $(this).closest('[class*="item___"]');
                if (window.innerWidth <= 784) {
                    const $manageBtn = $row.find('button[aria-label="Manage"]').first();
                    if ($manageBtn.length) {
                        const manageOpen = $manageBtn.find("span").get()
                            .some((el) => [...el.classList].some((c) => c.startsWith("active___")));
                        if (!manageOpen) {
                            $manageBtn.trigger("click");
                        }
                        setTimeout(async () => {
                            await updateManageRowMobile($row, this.checked, isManual);
                        }, 200);
                        return;
                    }
                }
                await updateManageRow($row, this.checked, isManual);
            }, 'Manage Page Checkbox Click');
            $(wrapper).append($checkbox);
            desc.appendChild(wrapper);
            added++;
        }
        p.end(`(added ${added} checkboxes)`);
    }

    const storedItems = localStorage.getItem("tornItems");
    const lastUpdatedTime = getValue("lastUpdatedTime", 0);
    const now = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const lastUpdatedDate = new Date(lastUpdatedTime);
    const todayUTC = new Date().toISOString().split("T")[0];
    const lastUpdatedUTC = lastUpdatedDate.toISOString().split("T")[0];

    // Force refresh if data is old, missing, or missing the 'city_price' field
    const forceRefreshNeeded = storedItems && !storedItems.includes("city_price");

    if (apiKey && (!storedItems || lastUpdatedUTC < todayUTC || now - lastUpdatedTime >= oneDayMs || forceRefreshNeeded)) {
        safeExecute(async () => {
            debug("Fetching fresh item data from Torn API...");
            const response = await fetch(`https://api.torn.com/torn/?key=${apiKey}&selections=items&comment=wBazaarFiller`);
            const data = await response.json();

            if (!data.items) {
                throw new Error("Failed to fetch Torn items or no items found. Possibly invalid API key or rate limit.");
            }

            const filtered = {};
            for (const [id, item] of Object.entries(data.items)) {
                if (item.tradeable) {
                    // In Torn API, sell_price is what you get from selling to a city shop.
                    // We'll store it as city_price.
                    filtered[id] = {
                        name: item.name,
                        market_value: item.market_value,
                        city_price: item.sell_price || item.buy_price || 0,
                    };
                }
            }

            localStorage.setItem("tornItems", JSON.stringify(filtered));
            updateCachedItems();
            setValue("lastUpdatedTime", now);
            debug("Item data refreshed and stored.");
        }, 'Initial Item Fetch')();
    }
    let observerTimeout;
    let isObserverLocked = false;
    const domObserver = new MutationObserver((mutations) => {
        if (isObserverLocked) return;

        const bazaarRoot = document.getElementById('bazaarRoot');
        let relevant = false;

        for (let i = 0; i < mutations.length; i++) {
            const m = mutations[i];
            const target = m.target;
            if (target.nodeType !== 1) continue;

            // If change is inside Bazaar or Sidebar, it's relevant
            if (bazaarRoot && (target === bazaarRoot || bazaarRoot.contains(target))) {
                relevant = true;
                break;
            }

            if (target.closest('[class*="linksContainer___"]') || target.closest('#pricing-source-button')) {
                relevant = true;
                break;
            }

            // Fallback for when elements are added to body (like bazaarRoot itself)
            if (m.addedNodes.length) {
                for (let j = 0; j < m.addedNodes.length; j++) {
                    const node = m.addedNodes[j];
                    if (node.nodeType === 1) {
                        if (node.id === 'bazaarRoot' || node.querySelector('#bazaarRoot') ||
                            node.closest('[class*="linksContainer___"]') || node.querySelector('[class*="linksContainer___"]')) {
                            relevant = true;
                            break;
                        }
                    }
                }
            }
            if (relevant) break;
        }

        if (!relevant) return;

        clearTimeout(observerTimeout);
        observerTimeout = setTimeout(() => {
            if (isObserverLocked) return;

            const hash = window.location.hash;
            // Only proceed if on a valid sub-page or if sidebar buttons are missing
            const needsButtons = !document.getElementById("pricing-source-button");

            // If we are not on a valid page AND we don't need buttons, skip
            if (!validPages.includes(hash) && !needsButtons) return;

            isObserverLocked = true;
            const p = profile("DOM Observer Update");
            try {
                if (hash === "#/add") {
                    addAddPageCheckboxes();
                }
                else if (hash === "#/manage") {
                    addManagePageCheckboxes();
                }
                // Always try to add buttons if they are missing, as long as we are in bazaar.php
                addPricingSourceLink();
                addBlackFridayToggle();
                setupPriceDelegation();
            } finally {
                isObserverLocked = false;
                p.end();
            }
        }, 150); // Reduced debounce slightly to feel more responsive while still batching
    });

    // Observe body to catch all relevant changes
    domObserver.observe(document.body, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ['class', 'style'] // Added style to catch virtual scrolling updates
    });

    const initializeUI = safeExecute(() => {
        const p = profile("Initialize UI");
        const hash = window.location.hash;
        if (hash === "#/add") {
            addAddPageCheckboxes();
        } else if (hash === "#/manage") {
            addManagePageCheckboxes();
        }
        addPricingSourceLink();
        addBlackFridayToggle();
        setupPriceDelegation();
        p.end();
    }, 'Initialize UI');

    window.addEventListener('load', () => {
        debug("Window loaded, initializing UI.");
        setTimeout(initializeUI, 100);
    });
    window.addEventListener("hashchange", () => {
        debug("Hash changed, re-initializing UI.");
        currentPage = window.location.hash;
        setTimeout(initializeUI, 100);
    });

    $(document).on("click", 'button[class*="undo___"]', function (e) {
        e.preventDefault();
        $('[class*="item___"] .checkbox-wrapper input.item-toggle:checked').each(function () {
            $(this).prop("checked", false);
            const $row = $(this).closest('[class*="item___"]');
            updateManageRow($row, false);
        });
    });
    $(document).on("click", ".clear-action", function (e) {
        e.preventDefault();
        $("li.clearfix .checkbox-wrapper input.item-toggle:checked").each(function () {
            $(this).prop("checked", false);
            const $row = $(this).closest("li.clearfix");
            updateAddRow($row, false);
        });
    });
    $(document).ready(function () {
        itemMarketCache = {};
        weav3rItemCache = {};
    });

    function copySidebarLinkClasses(linkEl, iconSpan, textSpan, linksContainer) {
        const refLink = linksContainer.querySelector("a[href]:not(#pricing-source-button):not(#black-friday-toggle)")
            || linksContainer.querySelector("a[href]");
        if (!refLink)
            return;
        linkEl.className = refLink.className;
        const refIcon = refLink.querySelector('[class*="iconWrapper___"]');
        const refTitle = refLink.querySelector('[class*="linkTitle___"]');
        if (refIcon)
            iconSpan.className = refIcon.className;
        if (refTitle)
            textSpan.className = refTitle.className;
    }

    let bubbleEl = null;
    function showBubble(anchorRect, text) {
        hideBubble();
        bubbleEl = document.createElement('div');
        bubbleEl.className = 'tooltip-bubble';
        bubbleEl.textContent = text;
        document.body.appendChild(bubbleEl);
        const padding = 8;
        const bw = bubbleEl.offsetWidth;
        const bh = bubbleEl.offsetHeight;
        let left = Math.max(padding, anchorRect.left + window.scrollX - Math.floor(bw/4));
        if (left + bw > window.innerWidth - padding) left = window.innerWidth - bw - padding;
        let top = anchorRect.top + window.scrollY - bh - 10;
        if (top < padding) top = anchorRect.bottom + window.scrollY + 10;
        bubbleEl.style.left = left + 'px';
        bubbleEl.style.top = top + 'px';
        setTimeout(()=>{ document.addEventListener('click', onDocClickForBubble); }, 10);
    }
    function hideBubble() {
        if (bubbleEl && bubbleEl.parentNode) { bubbleEl.parentNode.removeChild(bubbleEl); bubbleEl = null; document.removeEventListener('click', onDocClickForBubble); }
    }
    function onDocClickForBubble(e) { if (bubbleEl && !bubbleEl.contains(e.target)) hideBubble(); }
    function showCenterModalTip(text, title = "Info") {
        let modal = document.getElementById('bf-center-tip');
        if (!modal) {
            modal = document.createElement('div'); modal.id = 'bf-center-tip';
            modal.className = 'settings-modal'; modal.style.maxWidth = '420px'; modal.style.width = Math.min(560, window.innerWidth - 40) + 'px';
            modal.style.position = 'fixed'; modal.style.left = '50%'; modal.style.top = '50%'; modal.style.transform = 'translate(-50%,-50%)'; modal.style.zIndex = 200000;
            modal.innerHTML = `<div class="bf-tip-title" style="font-weight:700;margin-bottom:6px"></div><div class="bf-tip-content" style="line-height:1.4"></div><div style="text-align:right;margin-top:10px"><button id="bf-close-tip" style="padding:6px 8px">OK</button></div>`;
            document.body.appendChild(modal);
            document.getElementById('bf-close-tip').addEventListener('click', ()=> { modal.style.display='none'; });
        }
        modal.querySelector('.bf-tip-title').textContent = title;
        modal.querySelector('.bf-tip-content').innerHTML = text.replace(/\n/g, '<br>');
        modal.style.display = 'block';
    }

    document.addEventListener('click', (e) => { if (bubbleEl && !bubbleEl.contains(e.target)) hideBubble(); });
})();
