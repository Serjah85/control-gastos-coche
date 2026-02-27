# SISTEMA INTELIGENTE DE DESCUENTOS - ESPECIFICACIÓN COMPLETA

## OBJETIVO
Implementar sistema que calcule automáticamente y recomiende la mejor combinación de descuentos para cada repostaje en Galp, BP y Shell.

---

## 1. NUEVOS CAMPOS EN PAYMENT_METHODS (Línea ~630)

```javascript
const PAYMENT_METHODS = {
  ing: { label: "ING", color: "#ff6200", cashbackGalp: 0.03, cashbackShell: 0.03 },
  carrefour: { label: "Carrefour", color: "#0057a0" },
  bp: { label: "BP Plus", color: "#009639" },
  repsol: { label: "Repsol Waylet", color: "#fbba00" },
  moeve: { label: "MOEVE Club", color: "#00aeef" },
  shell: { label: "Shell Smart", color: "#dd1d21" },
  other: { label: "Otro", color: "#95a5a6" }
};
```

---

## 2. NUEVO OBJETO PARA PROGRAMAS FIDELIZACIÓN

Añadir después de PAYMENT_METHODS:

```javascript
const LOYALTY_PROGRAMS = {
  galp: {
    lidlPlus: {
      label: "LIDL Plus (4%)",
      type: "percentage",
      value: 0.04,
      maxAmount: 4,
      maxLiters: 60,
      incompatible: ["mundoGalp"]
    },
    mundoGalp: {
      label: "Mundo Galp Basic (10 cts/L)",
      type: "perLiter",
      value: 0.10,
      maxLiters: 40,
      maxLitersMonth: 200,
      incompatible: ["lidlPlus"]
    }
  },
  bp: {
    bpPlus: {
      label: "BP Plus",
      base: 0.03,
      ultimateBonus30: 0.04,  // 7 cts/L total = 3 base + 4 bonus
      ultimateBonus60: 0.07   // 10 cts/L total = 3 base + 7 bonus
    }
  }
};
```

---

## 3. AÑADIR CAMPOS AL FORMULARIO (Después del selector "Gasolinera", línea ~460)

```html
<!-- Programa fidelización Galp -->
<div class="form-group" id="galpLoyaltyWrap" style="display:none;">
  <label>Programa fidelización Galp</label>
  <select id="galpLoyalty" onchange="updatePreview()">
    <option value="none">Ninguno</option>
    <option value="lidlPlus">LIDL Plus (4%, máx 4€, máx 60L)</option>
    <option value="mundoGalp">Mundo Galp Basic (10 cts/L, máx 40L)</option>
  </select>
  <div class="info-text">LIDL Plus y Mundo Galp NO son compatibles entre sí</div>
</div>

<!-- Tipo carburante BP -->
<div class="form-group" id="bpFuelTypeWrap" style="display:none;">
  <label>Tipo carburante BP</label>
  <select id="bpFuelType" onchange="updatePreview()">
    <option value="normal">BP Normal (3 cts/L)</option>
    <option value="ultimate">BP Ultimate (3 + bonus 30L/60L)</option>
  </select>
  <div class="info-text">
    Ultimate 30-59L: 7 cts/L | Ultimate 60L+: 10 cts/L
  </div>
</div>

<!-- Recomendación inteligente (solo visible si hay opciones) -->
<div id="smartRecommendation" class="preview-box" style="display:none; margin-top:15px; background:#e8f5e9; border-color:#4caf50;">
  <h3 style="color:#2e7d32; margin-bottom:10px;">💡 Recomendación Inteligente</h3>
  <div id="smartRecommendationContent"></div>
</div>
```

---

## 4. FUNCIÓN PRINCIPAL: calcSmartDiscounts()

Añadir después de calcAutoDeferred (línea ~750):

```javascript
/**
 * Calcula todas las opciones de descuento y recomienda la mejor
 * @returns {bestOption, alternatives, recommendation}
 */
function calcSmartDiscounts(amount, liters, station, paymentMethod, galpLoyalty, bpFuelType) {
  const options = [];
  
  // === GALP ===
  if (station === "galp" && amount > 0 && liters > 0) {
    const ingCashback = paymentMethod === "ing" ? amount * 0.03 : 0;
    
    // Opción 1: LIDL Plus (solo descuento LIDL, incompatible con ING para este cálculo)
    if (galpLoyalty === "lidlPlus") {
      const lidlDiscount = Math.min(amount * 0.04, 4, liters <= 60 ? amount * 0.04 : 0);
      if (lidlDiscount > 0) {
        options.push({
          name: "LIDL Plus",
          total: lidlDiscount,
          breakdown: `4% descuento inmediato = ${lidlDiscount.toFixed(2)}€`,
          warning: "⚠️ LIDL Plus no es compatible con Mundo Galp ni ING 3%"
        });
      }
    }
    
    // Opción 2: Mundo Galp + ING
    if (galpLoyalty === "mundoGalp") {
      const litersApplied = Math.min(liters, 40);
      const mundoDiscount = litersApplied * 0.10;
      const total = mundoDiscount + ingCashback;
      
      options.push({
        name: "Mundo Galp + ING",
        total: total,
        breakdown: `Mundo Galp: ${litersApplied}L × 0.10€ = ${mundoDiscount.toFixed(2)}€\n` +
                   `ING 3%: ${amount.toFixed(2)}€ × 0.03 = ${ingCashback.toFixed(2)}€`,
        compatible: true
      });
    }
    
    // Opción 3: Solo ING (si no hay programa)
    if (galpLoyalty === "none" && ingCashback > 0) {
      options.push({
        name: "Solo ING 3%",
        total: ingCashback,
        breakdown: `${amount.toFixed(2)}€ × 0.03 = ${ingCashback.toFixed(2)}€`
      });
    }
  }
  
  // === BP ===
  if (station === "bp" && liters > 0) {
    let bpDiscount = liters * 0.03; // Base 3 cts/L
    
    if (bpFuelType === "ultimate") {
      if (liters >= 60) {
        bpDiscount = liters * 0.10;
      } else if (liters >= 30) {
        bpDiscount = liters * 0.07;
      }
    }
    
    const total = bpDiscount;
    
    options.push({
      name: "BP Plus",
      total: total,
      breakdown: `${liters.toFixed(2)}L × ${(bpDiscount/liters).toFixed(2)}€/L = ${bpDiscount.toFixed(2)}€`,
      note: bpFuelType === "ultimate" && liters >= 30 
        ? `✅ Bonus Ultimate activado (${liters >= 60 ? '10' : '7'} cts/L)` 
        : ""
    });
  }
  
  // === SHELL ===
  if (station === "shell" && paymentMethod === "ing" && amount > 0) {
    const shellCashback = amount * 0.03;
    options.push({
      name: "Shell + ING 3%",
      total: shellCashback,
      breakdown: `${amount.toFixed(2)}€ × 0.03 = ${shellCashback.toFixed(2)}€`
    });
  }
  
  // Ordenar por total descendente
  options.sort((a, b) => b.total - a.total);
  
  // Determinar mejor opción
  const best = options[0];
  const alternatives = options.slice(1);
  
  let recommendation = "";
  if (options.length > 1) {
    const diff = best.total - alternatives[0].total;
    if (diff > 0.50) {
      recommendation = `🏆 Mejor opción: ${best.name} (ahorras ${diff.toFixed(2)}€ más)`;
    } else {
      recommendation = `Las opciones son similares (diferencia: ${diff.toFixed(2)}€)`;
    }
  }
  
  return { best, alternatives, recommendation, allOptions: options };
}
```

---

## 5. MODIFICAR updatePreview() (línea ~800)

REEMPLAZAR la función completa por:

```javascript
function updatePreview() {
  const amount = parseFloat(document.getElementById("amount").value) || 0;
  const category = document.getElementById("category").value;
  const station = document.getElementById("station").value;
  const paymentMethod = document.getElementById("paymentMethod").value;
  const liters = parseFloat(document.getElementById("liters").value) || 0;
  
  const galpLoyalty = document.getElementById("galpLoyalty") ? document.getElementById("galpLoyalty").value : "none";
  const bpFuelType = document.getElementById("bpFuelType") ? document.getElementById("bpFuelType").value : "normal";
  
  const ticketSavings = parseFloat(document.getElementById("ticketSavings").value) || 0;
  const deferredManual = parseFloat(document.getElementById("deferredCashbackManual").value) || 0;
  
  const clubCarrefour = document.getElementById("clubCarrefour").checked;
  const carrefourBase = parseFloat(document.getElementById("carrefourFuelBase").value) || 0;
  
  if (amount <= 0) {
    document.getElementById("previewBox").classList.add("hidden");
    document.getElementById("smartRecommendation").style.display = "none";
    return;
  }
  
  // Calcular descuentos automáticos
  let autoCashback = 0;
  let autoDeferred = 0;
  
  // Carrefour 8%
  if (category === "fuel" && station === "carrefour" && clubCarrefour) {
    const base = (carrefourBase > 0) ? carrefourBase : amount;
    autoDeferred = base * 0.08;
  }
  
  // Sistema inteligente para Galp, BP, Shell
  const smart = calcSmartDiscounts(amount, liters, station, paymentMethod, galpLoyalty, bpFuelType);
  
  if (smart.best) {
    autoDeferred += smart.best.total;
    
    // Mostrar recomendación
    if (smart.allOptions.length > 1) {
      let recHtml = `<div style="font-weight:600; margin-bottom:10px;">${smart.recommendation}</div>`;
      
      smart.allOptions.forEach((opt, idx) => {
        const badge = idx === 0 ? "🏆" : "💰";
        recHtml += `
          <div style="margin:8px 0; padding:8px; background:white; border-radius:6px; border-left:3px solid ${idx === 0 ? '#4caf50' : '#ff9800'};">
            <div style="font-weight:600;">${badge} ${opt.name}: ${opt.total.toFixed(2)}€</div>
            <div style="font-size:12px; color:#666; white-space:pre-line; margin-top:4px;">${opt.breakdown}</div>
            ${opt.warning ? `<div style="font-size:11px; color:#d32f2f; margin-top:4px;">${opt.warning}</div>` : ''}
            ${opt.note ? `<div style="font-size:11px; color:#2e7d32; margin-top:4px;">${opt.note}</div>` : ''}
          </div>
        `;
      });
      
      document.getElementById("smartRecommendationContent").innerHTML = recHtml;
      document.getElementById("smartRecommendation").style.display = "block";
    } else {
      document.getElementById("smartRecommendation").style.display = "none";
    }
  } else {
    document.getElementById("smartRecommendation").style.display = "none";
  }
  
  const totalCashback = autoCashback + autoDeferred + deferredManual;
  const realCost = amount - totalCashback;
  
  // Construir preview
  let html = `
    <div class="preview-row">
      <span>Importe pagado (ticket):</span>
      <span>${amount.toFixed(2)} €</span>
    </div>
  `;
  
  if (ticketSavings > 0) {
    html += `
      <div class="preview-row">
        <span>Ahorro en ticket (informativo):</span>
        <span>≈ ${ticketSavings.toFixed(2)} €</span>
      </div>
    `;
  }
  
  if (autoDeferred > 0) {
    html += `
      <div class="preview-row">
        <span>- Descuentos/Cashback (diferido):</span>
        <span>-${autoDeferred.toFixed(2)} €</span>
      </div>
    `;
  }
  
  if (deferredManual > 0) {
    html += `
      <div class="preview-row">
        <span>- Cashback manual (diferido):</span>
        <span>-${deferredManual.toFixed(2)} €</span>
      </div>
    `;
  }
  
  html += `
    <div class="preview-row">
      <span><strong>Coste Real (pagado - devoluciones):</strong></span>
      <span><strong>${realCost.toFixed(2)} €</strong></span>
    </div>
  `;
  
  if (category === "fuel" && liters > 0) {
    const realPricePerLiter = realCost / liters;
    html += `
      <div class="preview-row">
        <span>Precio real por litro:</span>
        <span>${realPricePerLiter.toFixed(3)} €/L</span>
      </div>
    `;
  }
  
  document.getElementById("previewContent").innerHTML = html;
  document.getElementById("previewBox").classList.remove("hidden");
}
```

---

## 6. MODIFICAR togglePromoFields() (línea ~750)

AÑADIR al final de la función:

```javascript
// Mostrar programa Galp si estación = galp
const galpWrap = document.getElementById("galpLoyaltyWrap");
const showGalp = (cat === "fuel" && st === "galp");
if (galpWrap) {
  galpWrap.style.display = showGalp ? "block" : "none";
  if (!showGalp) document.getElementById("galpLoyalty").value = "none";
}

// Mostrar tipo carburante BP si estación = bp
const bpWrap = document.getElementById("bpFuelTypeWrap");
const showBP = (cat === "fuel" && st === "bp");
if (bpWrap) {
  bpWrap.style.display = showBP ? "block" : "none";
  if (!showBP) document.getElementById("bpFuelType").value = "normal";
}
```

---

## 7. GUARDAR CAMPOS EN handleSubmit() (línea ~900)

AÑADIR en formData:

```javascript
galpLoyalty: category === "fuel" && station === "galp" 
  ? (document.getElementById("galpLoyalty") ? document.getElementById("galpLoyalty").value : "none")
  : "none",
bpFuelType: category === "fuel" && station === "bp"
  ? (document.getElementById("bpFuelType") ? document.getElementById("bpFuelType").value : "normal")
  : "normal",
```

---

## 8. CARGAR CAMPOS EN editExpense() (línea ~1070)

AÑADIR:

```javascript
if (document.getElementById("galpLoyalty")) {
  document.getElementById("galpLoyalty").value = e.galpLoyalty || "none";
}
if (document.getElementById("bpFuelType")) {
  document.getElementById("bpFuelType").value = e.bpFuelType || "normal";
}
```

---

## 9. RESETEAR EN resetForm()

AÑADIR:

```javascript
if (document.getElementById("galpLoyalty")) {
  document.getElementById("galpLoyalty").value = "none";
}
if (document.getElementById("bpFuelType")) {
  document.getElementById("bpFuelType").value = "normal";
}
document.getElementById("smartRecommendation").style.display = "none";
```

---

## 10. ACTUALIZAR calcAutoDeferred() PARA USAR SISTEMA INTELIGENTE

La función calcAutoDeferred() debe ahora usar calcSmartDiscounts() internamente:

```javascript
function calcAutoDeferred(amountTicket, category, station, clubCarrefour, carrefourFuelBase, liters, galpLoyalty, bpFuelType, paymentMethod) {
  let total = 0;
  
  // Carrefour Club
  if (category === "fuel" && station === "carrefour" && clubCarrefour) {
    const base = (carrefourFuelBase > 0) ? carrefourFuelBase : amountTicket;
    total += base * 0.08;
  }
  
  // Sistema inteligente
  const smart = calcSmartDiscounts(amountTicket, liters, station, paymentMethod, galpLoyalty, bpFuelType);
  if (smart.best) {
    total += smart.best.total;
  }
  
  return total;
}
```

---

## 11. ACTUALIZAR TODAS LAS LLAMADAS A calcAutoDeferred

Buscar todas las llamadas y añadir los nuevos parámetros:
- liters
- galpLoyalty
- bpFuelType
- paymentMethod

En: updateDashboard(), renderExpensesList(), renderStats()

---

## RESUMEN DE FUNCIONALIDAD

✅ Sistema detecta automáticamente estación (Galp/BP/Shell)
✅ Muestra solo campos relevantes según estación
✅ Calcula TODAS las opciones posibles
✅ Compara y recomienda la mejor
✅ Muestra diferencia de ahorro entre opciones
✅ Avisos de incompatibilidad (LIDL vs Mundo Galp)
✅ Cálculo automático sin intervención manual
✅ Visual con badges 🏆 para mejor opción

## TESTING

Casos de prueba:
1. Galp 40L 60€ + ING + Mundo Galp → Debe mostrar: 4€ (Mundo) + 1.80€ (ING) = 5.80€
2. Galp 45L 70€ + ING + LIDL → Debe mostrar: 2.80€ (LIDL 4%) vs 5.10€ (Mundo+ING)
3. BP 35L Ultimate → Debe mostrar: 2.45€ (7 cts/L)
4. BP 65L Ultimate → Debe mostrar: 6.50€ (10 cts/L)
