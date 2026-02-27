# INSTRUCCIONES PARA CHATGPT - IMPLEMENTAR SISTEMA INTELIGENTE

Eres un desarrollador experto. Tienes que modificar el archivo `index.html` que te voy a pasar para implementar un sistema inteligente de descuentos para gasolineras.

## CAMBIOS A REALIZAR:

### 1. Busca la línea que contiene `const PAYMENT_METHODS` (aproximadamente línea 630)

REEMPLAZA todo el objeto PAYMENT_METHODS por:

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

### 2. Inmediatamente DESPUÉS de PAYMENT_METHODS, AÑADE:

```javascript
const LOYALTY_PROGRAMS = {
  galp: {
    lidlPlus: {
      label: "LIDL Plus (4%)",
      type: "percentage",
      value: 0.04,
      maxAmount: 4,
      maxLiters: 60
    },
    mundoGalp: {
      label: "Mundo Galp Basic (10 cts/L)",
      type: "perLiter",
      value: 0.10,
      maxLiters: 40,
      maxLitersMonth: 200
    }
  }
};

function calcSmartDiscounts(amount, liters, station, paymentMethod, galpLoyalty, bpFuelType) {
  const options = [];
  
  if (station === "galp" && amount > 0 && liters > 0) {
    const ingCashback = paymentMethod === "ing" ? amount * 0.03 : 0;
    
    if (galpLoyalty === "lidlPlus") {
      const lidlDiscount = Math.min(amount * 0.04, 4);
      if (liters <= 60 && lidlDiscount > 0) {
        options.push({
          name: "LIDL Plus",
          total: lidlDiscount,
          breakdown: `4% descuento inmediato = ${lidlDiscount.toFixed(2)}€`,
          warning: "⚠️ No compatible con Mundo Galp ni ING 3%"
        });
      }
    }
    
    if (galpLoyalty === "mundoGalp") {
      const litersApplied = Math.min(liters, 40);
      const mundoDiscount = litersApplied * 0.10;
      const total = mundoDiscount + ingCashback;
      
      options.push({
        name: "Mundo Galp + ING",
        total: total,
        breakdown: `Mundo Galp: ${litersApplied}L × 0.10€ = ${mundoDiscount.toFixed(2)}€\nING 3%: ${amount.toFixed(2)}€ × 0.03 = ${ingCashback.toFixed(2)}€`,
        compatible: true
      });
    }
    
    if (galpLoyalty === "none" && ingCashback > 0) {
      options.push({
        name: "Solo ING 3%",
        total: ingCashback,
        breakdown: `${amount.toFixed(2)}€ × 0.03 = ${ingCashback.toFixed(2)}€`
      });
    }
  }
  
  if (station === "bp" && liters > 0) {
    let bpDiscount = liters * 0.03;
    
    if (bpFuelType === "ultimate") {
      if (liters >= 60) {
        bpDiscount = liters * 0.10;
      } else if (liters >= 30) {
        bpDiscount = liters * 0.07;
      }
    }
    
    options.push({
      name: "BP Plus",
      total: bpDiscount,
      breakdown: `${liters.toFixed(2)}L × ${(bpDiscount/liters).toFixed(3)}€/L = ${bpDiscount.toFixed(2)}€`,
      note: bpFuelType === "ultimate" && liters >= 30 
        ? `✅ Bonus Ultimate activado (${liters >= 60 ? '10' : '7'} cts/L)` 
        : ""
    });
  }
  
  if (station === "shell" && paymentMethod === "ing" && amount > 0) {
    const shellCashback = amount * 0.03;
    options.push({
      name: "Shell + ING 3%",
      total: shellCashback,
      breakdown: `${amount.toFixed(2)}€ × 0.03 = ${shellCashback.toFixed(2)}€`
    });
  }
  
  options.sort((a, b) => b.total - a.total);
  
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

### 3. Busca donde está el campo de gasolinera (aprox línea 460, donde dice `<select id="station"`)

DESPUÉS del cierre de ese `</div>` del form-group de la gasolinera, AÑADE:

```html
<div class="form-group" id="galpLoyaltyWrap" style="display:none;">
  <label>Programa fidelización Galp</label>
  <select id="galpLoyalty" onchange="updatePreview()">
    <option value="none">Ninguno</option>
    <option value="lidlPlus">LIDL Plus (4%, máx 4€, máx 60L)</option>
    <option value="mundoGalp">Mundo Galp Basic (10 cts/L, máx 40L)</option>
  </select>
  <div class="info-text">LIDL Plus y Mundo Galp NO son compatibles entre sí</div>
</div>

<div class="form-group" id="bpFuelTypeWrap" style="display:none;">
  <label>Tipo carburante BP</label>
  <select id="bpFuelType" onchange="updatePreview()">
    <option value="normal">BP Normal (3 cts/L)</option>
    <option value="ultimate">BP Ultimate (3 + bonus)</option>
  </select>
  <div class="info-text">
    Ultimate 30-59L: 7 cts/L | Ultimate 60L+: 10 cts/L
  </div>
</div>
```

### 4. Busca donde está el `<div id="previewBox"` (aprox línea 500)

DESPUÉS de ese div completo (después de su cierre `</div>`), AÑADE:

```html
<div id="smartRecommendation" class="preview-box" style="display:none; margin-top:15px; background:#e8f5e9; border-color:#4caf50;">
  <h3 style="color:#2e7d32; margin-bottom:10px;">💡 Recomendación Inteligente</h3>
  <div id="smartRecommendationContent"></div>
</div>
```

### 5. Busca la función `togglePromoFields()` (aprox línea 750)

AL FINAL de esa función (antes del cierre `}`), AÑADE:

```javascript
const galpWrap = document.getElementById("galpLoyaltyWrap");
const showGalp = (cat === "fuel" && st === "galp");
if (galpWrap) {
  galpWrap.style.display = showGalp ? "block" : "none";
  if (!showGalp && document.getElementById("galpLoyalty")) {
    document.getElementById("galpLoyalty").value = "none";
  }
}

const bpWrap = document.getElementById("bpFuelTypeWrap");
const showBP = (cat === "fuel" && st === "bp");
if (bpWrap) {
  bpWrap.style.display = showBP ? "block" : "none";
  if (!showBP && document.getElementById("bpFuelType")) {
    document.getElementById("bpFuelType").value = "normal";
  }
}
```

### 6. Busca la función `calcAutoDeferred` (aprox línea 700)

REEMPLAZA completamente esa función por:

```javascript
function calcAutoDeferred(amountTicket, category, station, clubCarrefour, carrefourFuelBase, liters, galpLoyalty, bpFuelType, paymentMethod) {
  liters = liters || 0;
  galpLoyalty = galpLoyalty || "none";
  bpFuelType = bpFuelType || "normal";
  paymentMethod = paymentMethod || "other";
  
  let total = 0;
  
  if (category === "fuel" && station === "carrefour" && clubCarrefour) {
    const base = (carrefourFuelBase > 0) ? carrefourFuelBase : amountTicket;
    total += base * 0.08;
  }
  
  const smart = calcSmartDiscounts(amountTicket, liters, station, paymentMethod, galpLoyalty, bpFuelType);
  if (smart.best) {
    total += smart.best.total;
  }
  
  return total;
}
```

### 7. Busca TODAS las llamadas a `calcAutoDeferred` y actualízalas

Busca cada línea que contenga `calcAutoDeferred(` y asegúrate de que pase TODOS estos parámetros en orden:
1. amount
2. category
3. station
4. clubCarrefour
5. carrefourFuelBase
6. liters
7. galpLoyalty
8. bpFuelType
9. paymentMethod

Ejemplo de cómo debe quedar:
```javascript
const autoDeferred = calcAutoDeferred(
  e.amount||0, 
  e.category, 
  e.station||"other", 
  !!e.clubCarrefour, 
  e.carrefourFuelBase||0,
  e.liters||0,
  e.galpLoyalty||"none",
  e.bpFuelType||"normal",
  e.paymentMethod||"other"
);
```

### 8. Busca la función `updatePreview()` (aprox línea 800)

REEMPLAZA la MITAD INICIAL (hasta donde se calcula autoDeferred) por:

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
    if (document.getElementById("smartRecommendation")) {
      document.getElementById("smartRecommendation").style.display = "none";
    }
    return;
  }
  
  let autoDeferred = 0;
  
  if (category === "fuel" && station === "carrefour" && clubCarrefour) {
    const base = (carrefourBase > 0) ? carrefourBase : amount;
    autoDeferred = base * 0.08;
  }
  
  const smart = calcSmartDiscounts(amount, liters, station, paymentMethod, galpLoyalty, bpFuelType);
  
  if (smart.best) {
    autoDeferred += smart.best.total;
    
    if (smart.allOptions.length > 1 && document.getElementById("smartRecommendation")) {
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
    } else if (document.getElementById("smartRecommendation")) {
      document.getElementById("smartRecommendation").style.display = "none";
    }
  } else if (document.getElementById("smartRecommendation")) {
    document.getElementById("smartRecommendation").style.display = "none";
  }
  
  const totalCashback = autoDeferred + deferredManual;
  const realCost = amount - totalCashback;
```

(Deja el resto de updatePreview() como está)

### 9. Busca la función `handleSubmit` donde se guarda `formData` (aprox línea 900)

AÑADE estos campos en el objeto formData:

```javascript
galpLoyalty: category === "fuel" && station === "galp" 
  ? (document.getElementById("galpLoyalty") ? document.getElementById("galpLoyalty").value : "none")
  : "none",
bpFuelType: category === "fuel" && station === "bp"
  ? (document.getElementById("bpFuelType") ? document.getElementById("bpFuelType").value : "normal")
  : "normal",
```

### 10. Busca la función `editExpense` (aprox línea 1060)

AÑADE al final (antes de toggleFuelFields):

```javascript
if (document.getElementById("galpLoyalty")) {
  document.getElementById("galpLoyalty").value = e.galpLoyalty || "none";
}
if (document.getElementById("bpFuelType")) {
  document.getElementById("bpFuelType").value = e.bpFuelType || "normal";
}
```

### 11. Busca la función `resetForm()` (aprox línea 1000)

AÑADE antes del final:

```javascript
if (document.getElementById("galpLoyalty")) {
  document.getElementById("galpLoyalty").value = "none";
}
if (document.getElementById("bpFuelType")) {
  document.getElementById("bpFuelType").value = "normal";
}
if (document.getElementById("smartRecommendation")) {
  document.getElementById("smartRecommendation").style.display = "none";
}
```

## VERIFICACIÓN FINAL

Después de hacer todos los cambios, verifica que:
1. El archivo no tiene errores de sintaxis
2. Todas las funciones tienen sus llaves {} cerradas correctamente
3. No hay console.log() de debug que hayas añadido

Devuélveme el archivo HTML completo modificado.
