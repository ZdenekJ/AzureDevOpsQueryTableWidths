// ==UserScript==
// @name         Azure Devops - Obsluha šířky sloupců výsledků query - LocalStorage Test s URL klíči - Krok 9
// @namespace    http://tampermonkey.net/
// @version      0.9.0
// @description  Test LocalStorage s URL-based klíči a nastavování šířek sloupců
// @author       You
// @match        https://sportisimo.visualstudio.com/*
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  console.log("🚀 LocalStorage URL Test Script načten pro Azure DevOps");

  const ROOT_URL = "https://sportisimo.visualstudio.com/";
  const KEY_PREFIX = "SmDevOps-";

  // Proměnné pro správu MutationObserver
  let mutationObserver = null; // Instance MutationObserver pro sledování změn DOM
  let isObserverActive = false; // Příznak, zda je observer aktuálně aktivní

  // Proměnné pro správu MutationObserver
  let pageObserver = null; // Observer pro sledování přidávání tabulek do DOM
  let tableObserver = null; // Observer pro sledování změn šířek sloupců
  let isPageObserverActive = false; // Příznak, zda je page observer aktivní
  let isTableObserverActive = false; // Příznak, zda je table observer aktivní

  /**
   * Uloží data do LocalStorage
   * @param {string} key - Klíč pro uložení
   * @param {any} data - Data k uložení (budou serializována do JSON)
   * @returns {boolean} - true pokud se uložení podařilo, false pokud ne
   */
  function saveToStorage(key, data) {
    try {
      const jsonData = JSON.stringify(data);
      localStorage.setItem(key, jsonData);
      console.log(`✅ Data uložena pod klíčem: "${key}"`, data);
      return true;
    } catch (error) {
      console.error(`❌ Chyba při ukládání dat pod klíčem "${key}":`, error);
      return false;
    }
  }

  /**
   * Načte data z LocalStorage
   * @param {string} key - Klíč pro načtení
   * @returns {any|null} - Načtená data nebo null pokud nenalezena/chyba
   */
  function loadFromStorage(key) {
    try {
      const jsonData = localStorage.getItem(key);
      if (jsonData === null) {
        console.log(`⚠️ Žádná data nebyla nalezena pod klíčem: "${key}"`);
        return null;
      }
      const data = JSON.parse(jsonData);
      console.log(`✅ Data načtena pod klíčem: "${key}"`, data);
      return data;
    } catch (error) {
      console.error(`❌ Chyba při načítání dat pod klíčem "${key}":`, error);
      return null;
    }
  }

  /**
   * Vytvoří klíč pro LocalStorage na základě aktuální URL
   * @returns {string} - Vygenerovaný klíč
   */
  function generateStorageKey() {
    const currentUrl = window.location.href;
    const urlPart = currentUrl.replace(ROOT_URL, "");
    const key = KEY_PREFIX + urlPart;
    return key;
  }

  /**
   * Vytvoří nový objekt pro uložení šířek sloupců tabulky
   * @param {string[]} widths - Pole šířek sloupců (např. ["100px", "150px", "auto"])
   * @returns {object} - Připravený objekt pro uložení
   */
  function createTableData(widths) {
    return {
      timestamp: new Date().toISOString(),
      columns_width: widths || [],
    };
  }

  /**
   * Najde první colgroup element na stránce
   * @returns {object|null} - Objekt s informacemi o colgroup nebo null pokud nenalezen
   */
  function findColgroup() {
    const queryResultsCard = document.querySelector(".query-results-card");

    if (!queryResultsCard) {
      console.log("⚠️ .query-results-card element nebyl nalezen");
      return null;
    }

    const table = queryResultsCard.querySelector("table");
    if (!table) {
      console.log("⚠️ Tabulka v .query-results-card nebyla nalezena");
      return null;
    }

    const colgroup = table.querySelector("colgroup");
    if (!colgroup) {
      console.log("⚠️ Colgroup v tabulce nebyl nalezen");
      return null;
    }

    console.log("✅ Colgroup nalezen");
    return {
      card: queryResultsCard,
      table: table,
      colgroup: colgroup,
    };
  }

  /**
   * Získá šířky sloupců z colgroup elementu
   * @param {HTMLElement} colgroup - Colgroup element
   * @returns {string[]} - Pole šířek sloupců
   */
  function getColumnWidths(colgroup) {
    const cols = colgroup.querySelectorAll("col");
    const widths = [];

    cols.forEach((col, index) => {
      // Zkusíme získat šířku z různých zdrojů
      let width = null;

      // 1. Z style atributu (např. style="width: 8px")
      if (col.style.width) {
        width = col.style.width;
      }
      // 2. Z width atributu
      else if (col.getAttribute("width")) {
        width = col.getAttribute("width");
      }
      // 3. Z computed style
      else {
        const computedStyle = window.getComputedStyle(col);
        if (computedStyle.width && computedStyle.width !== "auto") {
          width = computedStyle.width;
        }
      }

      // Fallback na 'auto' pokud není šířka definována
      if (!width || width === "0px") {
        width = "auto";
      }

      widths.push(width);
      console.log(`📏 Sloupec ${index + 1}: ${width}`);
    });

    return widths;
  }

  /**
   * Nastaví šířky sloupců v colgroup elementu
   * @param {HTMLElement} colgroup - Colgroup element
   * @param {string[]} widths - Pole šířek sloupců (např. ["100px", "150px", "auto"])
   * @returns {boolean} - true pokud se nastavení podařilo, false pokud ne
   */
  function setColumnWidths(colgroup, widths) {
    if (!colgroup) {
      console.error("❌ Colgroup element není definován");
      return false;
    }

    if (!Array.isArray(widths)) {
      console.error("❌ Widths musí být pole");
      return false;
    }

    const cols = colgroup.querySelectorAll("col");

    if (cols.length === 0) {
      console.log("⚠️ V colgroup nebyly nalezeny žádné col elementy");
      return false;
    }

    console.log(
      `🎯 Nastavuji šířky ${widths.length} sloupců na ${cols.length} col elementech`
    );

    // Projdeme všechny col elementy
    cols.forEach((col, index) => {
      if (index < widths.length) {
        const width = widths[index];

        // Nastavíme šířku přes style.width (nejvyšší priorita)
        col.style.width = width;

        console.log(`✏️ Sloupec ${index + 1}: nastaveno na "${width}"`);
      } else {
        // Pokud máme více col elementů než šířek, nastavíme 'auto'
        col.style.width = "auto";
        console.log(
          `✏️ Sloupec ${index + 1}: nastaveno na "auto" (žádná šířka zadána)`
        );
      }
    });

    console.log("✅ Šířky sloupců byly nastaveny");
    return true;
  }

  /**
   * Najde tabulku a získá šířky jejích sloupců
   * @returns {object|null} - Objekt s informacemi o tabulce a jejích sloupcích nebo null
   */
  function getTableWidths() {
    console.log("\n🔍 Hledám tabulku s colgroup...");

    const colgroupData = findColgroup();
    if (!colgroupData) {
      console.log("❌ Colgroup element nebyl nalezen");
      return null;
    }

    console.log("\n--- Analýza tabulky ---");
    const widths = getColumnWidths(colgroupData.colgroup);

    const result = {
      colgroup: colgroupData.colgroup,
      widths: widths,
      columnCount: widths.length,
    };

    console.log(`📊 Celkem ${widths.length} sloupců:`, widths);
    return result;
  }

  /**
   * Najde tabulku a nastaví šířky jejích sloupců
   * @param {string[]} widths - Pole šířek sloupců
   * @returns {boolean} - true pokud se nastavení podařilo, false pokud ne
   */
  function setTableWidths(widths) {
    console.log("\n🎯 Nastavuji šířky sloupců tabulky...");
    console.log("📝 Požadované šířky:", widths);

    const colgroupData = findColgroup();
    if (!colgroupData) {
      console.log("❌ Colgroup element nebyl nalezen");
      return false;
    }

    return setColumnWidths(colgroupData.colgroup, widths);
  }

  /**
   * Uloží testovací data pro aktuální URL
   */
  function saveCurrentPageData() {
    const key = generateStorageKey();

    // Testovací data v novém formátu
    const testWidths = ["120px", "180px", "250px", "auto"];
    const tableData = createTableData(testWidths);

    // Přidáme extra info pro debugování
    const data = {
      ...tableData,
      url: window.location.href,
      pathname: window.location.pathname,
      search: window.location.search,
      hash: window.location.hash,
      savedAt: new Date().toLocaleString("cs-CZ"),
    };

    console.log(`🔑 Generovaný klíč: "${key}"`);
    console.log(`📍 Aktuální URL: "${window.location.href}"`);
    console.log(`📊 Testovací šířky sloupců:`, testWidths);

    saveToStorage(key, data);
  }

  /**
   * Načte data pro aktuální URL
   */
  function loadCurrentPageData() {
    const key = generateStorageKey();
    console.log(`🔍 Hledám data pro klíč: "${key}"`);
    return loadFromStorage(key);
  }

  /**
   * Zpracuje změnu URL
   */
  function handleUrlChange() {
    console.log("\n🔄 Detekována změna URL");
    manageObserver();

    //saveCurrentPageData();

    // Zkusíme také načíst existující data
    const existingData = loadCurrentPageData();
    if (existingData) {
      console.log(
        "📜 Nalezena historická data pro tuto stránku:",
        existingData
      );
    }
  }

  /**
   * Nastaví sledování změn URL v SPA
   */
  function setupUrlWatching() {
    // Uložit původní funkce
    const originalPushState = history.pushState;
    const originalReplaceState = history.replaceState;

    // Monkey patch pro pushState
    history.pushState = function (...args) {
      originalPushState.apply(this, args);
      console.log("🐒 Detekován history.pushState");
      setTimeout(handleUrlChange, 100); // Malé zpoždění pro aktualizaci DOM
    };

    // Monkey patch pro replaceState
    history.replaceState = function (...args) {
      originalReplaceState.apply(this, args);
      console.log("🐒 Detekován history.replaceState");
      setTimeout(handleUrlChange, 100);
    };

    // Posluchač pro popstate (browser back/forward)
    window.addEventListener("popstate", function (event) {
      console.log("⬅️ Detekován popstate event");
      setTimeout(handleUrlChange, 100);
    });

    console.log("👀 URL watching nastaven (History API + PopState)");
  }

  /**
   * Kontroluje, jestli aktuální URL odpovídá stránce s queries
   * @returns {boolean} true pokud jsme na stránce s queries
   */
  function isQueryPage() {
    const currentUrl = window.location.href;
    const isQuery = currentUrl.includes("/_queries/query/");

    console.log(`🔍 Kontrola URL: ${isQuery ? "✅" : "❌"}`);
    console.log(`   URL: ${currentUrl}`);
    console.log(`   Je query stránka: ${isQuery}`);

    return isQuery;
  }

  /**
   * Aktivuje Page Observer pro sledování přidávání tabulek do DOM
   * Čeká na objevení colgroup elementů v query-results-card
   */
  function activatePageObserver() {
    console.log("🚀 Aktivace Page Observer...");

    pageObserver = new MutationObserver(handlePageMutations);

    // Sledujeme přidávání child elementů do celého document
    pageObserver.observe(document.body, {
      childList: true,
      subtree: true,
    });

    isPageObserverActive = true;
    console.log("✅ Page Observer aktivován - čeká na tabulky");

    // Zkontroluj, jestli tabulka už náhodou neexistuje
    checkForExistingTable();
  }

  /**
   * Deaktivuje Page Observer a uklidí prostředky
   */
  function deactivatePageObserver() {
    console.log("🛑 Deaktivace Page Observer...");

    if (pageObserver) {
      pageObserver.disconnect();
      pageObserver = null;
      console.log("   Page Observer byl odstraněn");
    }

    isPageObserverActive = false;
    console.log("✅ Page Observer deaktivován");
  }

  /**
   * Aktivuje Table Observer pro sledování změn šířek sloupců
   * Sleduje konkrétní colgroup element
   * @param {HTMLElement} colgroup - Colgroup element ke sledování
   */
  function activateTableObserver(colgroup) {
    console.log("🚀 Aktivace Table Observer...");

    if (!colgroup) {
      console.error(
        "❌ Nelze aktivovat Table Observer - chybí colgroup element"
      );
      return false;
    }

    // Vytvoříme nový Table Observer
    tableObserver = new MutationObserver(handleTableMutations);

    // Sledujeme změny atributů (hlavně style) u všech col elementů v colgroup
    tableObserver.observe(colgroup, {
      childList: false, // Nesledujeme přidávání/odebírání col elementů
      subtree: true, // Sledujeme i vnořené elementy (col elementy)
      attributes: true, // Sledujeme změny atributů
      attributeFilter: ["style", "width"], // Pouze style a width atributy
      attributeOldValue: true, // Chceme i staré hodnoty pro porovnání
    });

    isTableObserverActive = true;
    console.log("✅ Table Observer aktivován pro colgroup:", colgroup);
    return true;
  }

  /**
   * Deaktivuje Table Observer a uklidí prostředky
   */
  function deactivateTableObserver() {
    console.log("🛑 Deaktivace Table Observer...");

    if (tableObserver) {
      tableObserver.disconnect();
      tableObserver = null;
      console.log("   Table Observer byl odstraněn");
    }

    isTableObserverActive = false;
    console.log("✅ Table Observer deaktivován");
  }

  /**
   * Callback funkce volaná při detekci změn v DOM (přidávání elementů)
   * @param {MutationRecord[]} mutations - Seznam detekovaných změn
   */
  function handlePageMutations(mutations) {
    console.log(
      "🔄 Page Observer - detekována změna v DOM:",
      mutations.length,
      "mutací"
    );

    // Kontroluj každou mutaci na přidání colgroup
    mutations.forEach((mutation) => {
      if (mutation.type === "childList") {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            // Zkontroluj jestli přidaný element obsahuje colgroup
            const colgroup =
              node.querySelector &&
              node.querySelector(".query-results-card table colgroup");
            if (colgroup) {
              handleTableDiscovered(colgroup);
            }
            // Nebo jestli sám není colgroup v správném kontextu
            if (
              node.matches &&
              node.matches(".query-results-card table colgroup")
            ) {
              handleTableDiscovered(node);
            }
          }
        });
      }
    });
  }

  /**
   * Zkontroluje, jestli tabulka už náhodou neexistuje na stránce
   */
  function checkForExistingTable() {
    const colgroup = document.querySelector(
      ".query-results-card table colgroup"
    );
    if (colgroup) {
      console.log("🎯 Tabulka už existuje při inicializaci");
      handleTableDiscovered(colgroup);
    }
  }

  /**
   * Zpracuje objevení tabulky s colgroup
   * @param {Element} colgroup - Nalezený colgroup element
   */
  function handleTableDiscovered(colgroup) {
    console.log("🎉 Objevena tabulka s colgroup!");
    console.log("📊 Colgroup element:", colgroup);

    // Načteme a aplikujeme uložené šířky sloupců
    loadAndApplyStoredWidths(colgroup);

    // Aktivujeme Table Observer na tento colgroup
    activateTableObserver(colgroup);
  }

  /**
   * Načte uložené šířky sloupců a aplikuje je na tabulku
   * @param {Element} colgroup - Colgroup element
   */
  function loadAndApplyStoredWidths(colgroup) {
    console.log("🔍 Načítám uložené šířky sloupců...");

    const existingData = loadCurrentPageData();
    if (
      existingData &&
      existingData.columns_width &&
      existingData.columns_width.length > 0
    ) {
      console.log("� Nalezena uložená data:", existingData);
      console.log("🎯 Aplikuji uložené šířky:", existingData.columns_width);

      const success = setColumnWidths(colgroup, existingData.columns_width);
      if (success) {
        console.log("✅ Uložené šířky sloupců byly úspěšně aplikovány");
      } else {
        console.error("❌ Nepodařilo se aplikovat uložené šířky sloupců");
      }
    } else {
      console.log("⚠️ Žádná uložená data pro tuto stránku nebyla nalezena");
    }
  }

  // Proměnné pro debouncing ukládání
  let saveTimeoutId = null;
  const SAVE_DELAY = 500; // ms - čekání před uložením po poslední změně

  /**
   * Callback funkce volaná při detekci změn šířek sloupců
   * @param {MutationRecord[]} mutations - Seznam detekovaných změn
   */
  function handleTableMutations(mutations) {
    console.log(
      "🔄 Table Observer - detekována změna šířek:",
      mutations.length,
      "mutací"
    );

    // Filtrujeme pouze změny, které se týkají šířek sloupců
    let hasWidthChange = false;

    mutations.forEach((mutation) => {
      if (mutation.type === "attributes") {
        const target = mutation.target;

        // Kontrolujeme pouze col elementy
        if (target.tagName.toLowerCase() === "col") {
          const attributeName = mutation.attributeName;

          if (attributeName === "style" || attributeName === "width") {
            console.log(`📏 Změna ${attributeName} u col elementu:`, target);

            // Zkontrolujeme, jestli se opravdu změnila šířka
            const oldValue = mutation.oldValue || "";
            const newValue =
              attributeName === "style"
                ? target.getAttribute("style") || ""
                : target.getAttribute("width") || "";

            if (oldValue !== newValue) {
              console.log(`   Stará hodnota: "${oldValue}"`);
              console.log(`   Nová hodnota: "${newValue}"`);
              hasWidthChange = true;
            }
          }
        }
      }
    });

    // Pokud byla detekována změna šířky, naplánujeme uložení s debouncingem
    if (hasWidthChange) {
      console.log("💾 Naplánováno uložení změn šířek sloupců...");
      debouncedSaveColumnWidths();
    }
  }

  /**
   * Uloží aktuální šířky sloupců s debouncingem
   * Zabrání příliš častému ukládání při rychlých změnách
   */
  function debouncedSaveColumnWidths() {
    // Zrušíme předchozí timeout, pokud existuje
    if (saveTimeoutId) {
      clearTimeout(saveTimeoutId);
    }

    // Nastavíme nový timeout pro uložení
    saveTimeoutId = setTimeout(() => {
      saveCurrentTableWidths();
      saveTimeoutId = null;
    }, SAVE_DELAY);
  }

  /**
   * Uloží aktuální šířky sloupců tabulky do LocalStorage
   */
  function saveCurrentTableWidths() {
    console.log("💾 Ukládání aktuálních šířek sloupců...");

    const tableData = getTableWidths();
    if (!tableData) {
      console.error("❌ Nepodařilo se získat data tabulky pro uložení");
      return false;
    }

    const key = generateStorageKey();
    const dataToSave = createTableData(tableData.widths);

    // Přidáme extra info pro debugování
    const enrichedData = {
      ...dataToSave,
      url: window.location.href,
      pathname: window.location.pathname,
      columnCount: tableData.columnCount,
      savedAt: new Date().toLocaleString("cs-CZ"),
    };

    const success = saveToStorage(key, enrichedData);

    if (success) {
      console.log("✅ Šířky sloupců byly úspěšně uloženy");
      console.log("📊 Uložené šířky:", tableData.widths);
    } else {
      console.error("❌ Nepodařilo se uložit šířky sloupců");
    }

    return success;
  }

  /**
   * Řídí aktivaci/deaktivaci observerů na základě aktuální URL
   * Volá se při inicializaci a při každé změně URL
   */
  function manageObserver() {
    console.log("⚙️ Správa Mutation Observers...");

    // Vždy nejdřív uklidit všechny observery
    if (isTableObserverActive) {
      deactivateTableObserver();
    }
    if (isPageObserverActive) {
      deactivatePageObserver();
    }

    // Rozhodnout podle aktuální URL
    if (isQueryPage()) {
      console.log("   → Jsme na query stránce, aktivuji Page Observer");
      activatePageObserver();
    } else {
      console.log(
        "   → Nejsme na query stránce, observery zůstávají neaktivní"
      );
    }
  }

  /**
   * Aktivuje MutationObserver pro sledování změn šířek sloupců
   * Vytvoří nový observer a nastaví ho na sledování colgroup elementů
   */
  function activateObserver() {
    console.log("🚀 Aktivace MutationObserver...");

    // TODO: Implementovat vytvoření MutationObserver
    // TODO: Nastavit sledování změn width atributů u col elementů
    // TODO: Nastavit callback pro handling změn

    isObserverActive = true;
    console.log("✅ MutationObserver aktivován");
  }

  /**
   * Deaktivuje MutationObserver a uklidí prostředky
   * Bezpečně odstraní observer a resetuje stav
   */
  function deactivateObserver() {
    console.log("🛑 Deaktivace MutationObserver...");

    if (mutationObserver) {
      // TODO: Implementovat disconnect() na observer
      // mutationObserver.disconnect();
      mutationObserver = null;
      console.log("   Observer byl odstraněn");
    }

    isObserverActive = false;
    console.log("✅ MutationObserver deaktivován");
  }

  /**
   * Callback funkce volaná při detekci změn v DOM
   * @param {MutationRecord[]} mutations - Seznam detekovaných změn
   */
  function handleMutations(mutations) {
    console.log("🔄 Detekována změna v DOM:", mutations.length, "mutací");

    // TODO: Implementovat zpracování změn
    // TODO: Filtrovat pouze změny width atributů u col elementů
    // TODO: Implementovat debouncing pro zabránění příliš častému ukládání
    // TODO: Zavolat funkci pro uložení aktuálních šířek

    console.log("💾 Ukládání změn šířek sloupců...");
  }

  /**
   * Spustí počáteční testy
   */
  function runInitialTests() {
    console.log(
      "💡 Nyní zkuste navigovat v Azure DevOps a sledujte konzoli..."
    );
  }

  // Inicializace po načtení stránky
  function initialize() {
    setupUrlWatching();

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", runInitialTests);
    } else {
      runInitialTests();
      manageObserver();
    }
  }

  // Exportovat funkce do globálního scope pro ruční testování
  window.saveToStorage = saveToStorage;
  window.loadFromStorage = loadFromStorage;
  window.generateStorageKey = generateStorageKey;
  window.createTableData = createTableData;
  window.saveCurrentPageData = saveCurrentPageData;
  window.loadCurrentPageData = loadCurrentPageData;
  window.findColgroup = findColgroup;
  window.getColumnWidths = getColumnWidths;
  window.setColumnWidths = setColumnWidths;
  window.getTableWidths = getTableWidths;
  window.setTableWidths = setTableWidths;
  window.saveCurrentTableWidths = saveCurrentTableWidths;
  window.loadAndApplyStoredWidths = loadAndApplyStoredWidths;

  // Spustit inicializaci
  initialize();
})();
