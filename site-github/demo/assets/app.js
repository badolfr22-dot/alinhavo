/* ==========================================================================
   Alinhavo Flow — demonstração de automação de aprovações + painel
   100% no navegador, sem dependências. Dados fictícios gerados localmente.
   ========================================================================== */
(function () {
  "use strict";

  const STORE_KEY = "alinhavo-flow-demo-v1";
  const HOUR = 3600e3, DAY = 24 * HOUR;

  /* ---------- Dados de referência (fictícios) ---------- */
  const DEPTOS = ["Comercial", "Financeiro", "Operações", "Marketing", "RH", "TI"];
  const PESSOAS = ["Ana Ribeiro", "Bruno Alves", "Carla Mendes", "Diego Rocha", "Elisa Prado", "Fábio Nunes",
    "Gabriela Lima", "Henrique Costa", "Isabela Teixeira", "João Martins", "Larissa Duarte", "Marcos Vieira"];
  const CATEGORIAS = {
    "Materiais de escritório": { min: 80, max: 1800, itens: ["Reposição de materiais", "Cadeiras ergonômicas", "Suprimentos de impressão", "Organizadores e arquivos"] },
    "Equipamentos de TI": { min: 600, max: 14000, itens: ["Notebook para novo colaborador", "Monitores adicionais", "Headsets para atendimento", "Servidor de arquivos"] },
    "Software e licenças": { min: 200, max: 9000, itens: ["Licenças de software de design", "Renovação de antivírus", "Ferramenta de gestão de projetos", "Assinatura de BI"] },
    "Serviços de terceiros": { min: 1200, max: 32000, itens: ["Consultoria tributária", "Manutenção predial", "Tradução de contratos", "Auditoria externa"] },
    "Viagens": { min: 350, max: 7500, itens: ["Visita a cliente", "Passagens para feira", "Hospedagem para treinamento", "Deslocamento regional"] },
    "Treinamentos": { min: 300, max: 6000, itens: ["Curso de liderança", "Certificação técnica", "Workshop de vendas", "Treinamento de segurança"] },
    "Marketing e eventos": { min: 500, max: 26000, itens: ["Estande em evento", "Material gráfico", "Campanha digital", "Brindes institucionais"] },
  };
  const TI_CATS = ["Equipamentos de TI", "Software e licenças"];

  /* ---------- Regras de automação ---------- */
  const RULES = [
    { id: "urgente", tipo: "acao", nome: "Notificar urgências", cond: "urgência = alta",
      descricao: "Envia notificação imediata ao gestor do departamento quando a solicitação é marcada como urgente." },
    { id: "ti", tipo: "decisao", nome: "Encaminhar compras de tecnologia", cond: "categoria ∈ {Equipamentos de TI, Software e licenças}",
      descricao: "Itens de tecnologia passam por análise técnica da Gestão de TI antes da aprovação." },
    { id: "diretoria", tipo: "decisao", nome: "Exigir aprovação da Diretoria", cond: "valor > R$ 10.000",
      descricao: "Solicitações de alto valor são encaminhadas diretamente para a Diretoria." },
    { id: "auto", tipo: "decisao", nome: "Aprovar automaticamente", cond: "valor ≤ R$ 2.000",
      descricao: "Pedidos de baixo valor são aprovados sem intervenção manual, dentro da política de compras." },
    { id: "erp", tipo: "integracao", nome: "Sincronizar com o ERP", cond: "status = aprovada",
      descricao: "Ao ser aprovada, a solicitação gera um pedido de compra no ERP via API." },
  ];

  /* ---------- Utilidades ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const $$ = (s, el = document) => Array.from(el.querySelectorAll(s));
  const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
  const brlShort = (v) => v >= 1e6 ? "R$ " + (v / 1e6).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mi"
    : v >= 1e3 ? "R$ " + (v / 1e3).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " mil" : brl.format(v);
  const fmtDate = (t) => new Date(t).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
  const fmtDateTime = (t) => new Date(t).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
  const fmtHours = (h) => h < 1 ? Math.round(h * 60) + " min" : h.toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " h";
  function rng(seed) { return function () { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  let rand = Math.random;
  const pick = (a) => a[Math.floor(rand() * a.length)];

  const ICON = {
    painel: '<path d="M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z"/>',
    lista: '<path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/>',
    nova: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
    regra: '<path d="M4 4h6v6H4zM14 14h6v6h-6z"/><path d="M10 7h4a3 3 0 0 1 3 3v4"/>',
    integracao: '<path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/>',
    usuario: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    notificacao: '<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 0 0 3.4 0"/>',
    check: '<path d="M20 6 9 17l-5-5"/>', x: '<path d="M18 6 6 18M6 6l12 12"/>', clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    play: '<path d="m6 4 14 8-14 8z"/>', mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>',
    db: '<ellipse cx="12" cy="5" rx="8" ry="3"/><path d="M4 5v14c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',
    api: '<path d="m16 18 6-6-6-6M8 6l-6 6 6 6"/>',
  };
  const icon = (n) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[n]}</svg>`;
  const STATUS = { aprovada: ["Aprovada", "check"], pendente: ["Aguardando aprovação", "clock"], em_analise: ["Em análise técnica", "eye"], rejeitada: ["Rejeitada", "x"] };
  const badge = (s) => `<span class="badge badge--${s}">${icon(STATUS[s][1])}${STATUS[s][0]}</span>`;

  /* ---------- Estado ---------- */
  let state;
  function save() { try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { /* armazenamento indisponível: segue em memória */ } }
  function load() {
    try { const raw = localStorage.getItem(STORE_KEY); if (raw) { const s = JSON.parse(raw); if (s && s.version === 1) return s; } } catch (e) { /* ignora */ }
    return seed();
  }

  function log(tipo, msg, ts, extra) {
    state.log.unshift(Object.assign({ id: ++state.seq.log, tipo, msg, ts }, extra || {}));
    if (state.log.length > 400) state.log.length = 400;
  }

  function newRequest(at, overrides) {
    const categoria = (overrides && overrides.categoria) || pick(Object.keys(CATEGORIAS));
    const c = CATEGORIAS[categoria];
    // distribuição assimétrica: muitos pedidos pequenos, poucos grandes
    const valor = Math.round((c.min + Math.pow(rand(), 2.2) * (c.max - c.min)) / 10) * 10;
    return Object.assign({
      id: "SOL-" + (++state.seq.req),
      titulo: pick(c.itens), solicitante: pick(PESSOAS), depto: pick(DEPTOS), categoria, valor,
      urgencia: rand() < 0.15 ? "alta" : "normal", justificativa: "",
      criadoEm: at, status: "pendente", responsavel: "", automatica: false, decididoEm: null, erp: null,
    }, overrides || {});
  }

  function ruleOn(id) { return state.rules[id] && state.rules[id].ativa; }
  function hit(id) { state.rules[id].disparos++; }

  /** Executa o motor de regras. Retorna os passos para exibição. */
  function processRequest(r, at) {
    const steps = [{ titulo: "Solicitação registrada", detalhe: `${r.id} · ${r.categoria} · ${brl.format(r.valor)}`, ok: true }];
    log("usuario", `${r.solicitante} (${r.depto}) criou ${r.id}: ${r.titulo} — ${brl.format(r.valor)}`, at, { ref: r.id });

    if (ruleOn("urgente") && r.urgencia === "alta") {
      hit("urgente");
      log("notificacao", `Gestor(a) da área (${r.depto}) notificado: ${r.id} marcada como urgente`, at + 1000, { ref: r.id });
      steps.push({ titulo: "Regra: Notificar urgências", detalhe: `Gestor(a) da área (${r.depto}) notificado por e-mail.`, ok: true });
    }

    let decided = false;
    const decide = (ruleId, status, responsavel, texto) => {
      hit(ruleId); decided = true;
      r.status = status; r.responsavel = responsavel;
      log("regra", `Regra "${state.rules[ruleId].nome}" aplicada em ${r.id}: ${texto}`, at + 2000, { ref: r.id });
      steps.push({ titulo: "Regra: " + state.rules[ruleId].nome, detalhe: texto, ok: true });
    };
    if (!decided && ruleOn("ti") && TI_CATS.includes(r.categoria)) decide("ti", "em_analise", "Gestão de TI", "encaminhada para análise técnica da Gestão de TI.");
    if (!decided && ruleOn("diretoria") && r.valor > 10000) decide("diretoria", "pendente", "Diretoria", "valor acima de R$ 10.000 — encaminhada à Diretoria.");
    if (!decided && ruleOn("auto") && r.valor <= 2000) {
      decide("auto", "aprovada", "Automação", "aprovada automaticamente dentro da política de compras.");
      r.automatica = true; r.decididoEm = at + 2000;
    }
    if (!decided) {
      r.status = "pendente"; r.responsavel = "Gestor(a) · " + r.depto;
      steps.push({ titulo: "Nenhuma regra de decisão aplicável", detalhe: `Encaminhada ao(à) gestor(a) da área (${r.depto}) para aprovação manual.`, ok: false });
    }
    if (r.status === "aprovada") steps.push(syncErp(r, at + 3000));
    return steps;
  }

  function syncErp(r, at) {
    if (!ruleOn("erp")) return { titulo: "Integração com ERP desativada", detalhe: "O pedido não foi enviado ao ERP.", ok: false };
    hit("erp");
    const ref = "PC-" + String(48000 + state.seq.req).padStart(6, "0");
    r.erp = { ref, em: at };
    const payload = { pedido_compra: { origem: r.id, centro_custo: r.depto.toUpperCase().slice(0, 3) + "-01", categoria: r.categoria, descricao: r.titulo, valor_total: r.valor, solicitante: r.solicitante, aprovado_por: r.responsavel } };
    log("integracao", `Pedido ${ref} criado no ERP a partir de ${r.id}`, at, { ref: r.id, erp: ref, payload, latencia: 120 + Math.round(rand() * 380) });
    return { titulo: "Integração: pedido criado no ERP", detalhe: `Pedido de compra ${ref} gerado via API.`, ok: true };
  }

  function manualDecision(r, aprovar, at, quem) {
    r.status = aprovar ? "aprovada" : "rejeitada";
    r.decididoEm = at;
    const por = quem || r.responsavel;
    log("usuario", `${por} ${aprovar ? "aprovou" : "rejeitou"} ${r.id}`, at, { ref: r.id });
    if (aprovar) syncErp(r, at + 2000);
  }

  function seed() {
    rand = rng(20261104);
    state = { version: 1, seq: { req: 1000, log: 0 }, requests: [], log: [], rules: {}, ui: { status: "", depto: "", q: "" } };
    RULES.forEach((r) => (state.rules[r.id] = { ativa: true, disparos: 0, nome: r.nome }));
    const now = Date.now();
    const start = now - 30 * DAY;
    const events = [];
    for (let d = 0; d < 30; d++) {
      const dayStart = new Date(start + d * DAY); dayStart.setHours(0, 0, 0, 0);
      const wd = dayStart.getDay();
      const n = wd === 0 || wd === 6 ? Math.floor(rand() * 2) : 2 + Math.floor(rand() * 5);
      for (let i = 0; i < n; i++) events.push(dayStart.getTime() + (8 + rand() * 10) * HOUR);
    }
    events.sort((a, b) => a - b).forEach((t) => {
      if (t > now) return;
      const r = newRequest(t);
      state.requests.push(r);
      processRequest(r, t);
    });
    // decisões manuais históricas para o que não está recente
    state.requests.forEach((r) => {
      if ((r.status === "pendente" || r.status === "em_analise") && now - r.criadoEm > 2 * DAY) {
        const t = r.criadoEm + (3 + rand() * 40) * HOUR;
        manualDecision(r, rand() < 0.82, Math.min(t, now - HOUR));
      }
    });
    state.log.sort((a, b) => b.ts - a.ts);
    rand = Math.random;
    return state;
  }

  /* ---------- Métricas ---------- */
  function metrics() {
    const since = Date.now() - 30 * DAY;
    const rs = state.requests.filter((r) => r.criadoEm >= since);
    const decididas = rs.filter((r) => r.decididoEm);
    const auto = rs.filter((r) => r.automatica).length;
    const manuais = decididas.filter((r) => !r.automatica);
    const avg = (arr) => arr.length ? arr.reduce((s, r) => s + (r.decididoEm - r.criadoEm), 0) / arr.length / HOUR : 0;
    return {
      total: rs.length,
      autoPct: rs.length ? Math.round((auto / rs.length) * 100) : 0,
      autoN: auto,
      tempo: avg(decididas), tempoManual: avg(manuais),
      valorAprovado: rs.filter((r) => r.status === "aprovada").reduce((s, r) => s + r.valor, 0),
      abertas: state.requests.filter((r) => r.status === "pendente" || r.status === "em_analise").length,
    };
  }

  /* ---------- Gráficos (SVG, sem bibliotecas) ---------- */
  function lineChart(points, opts) {
    const W = 640, H = 230, m = { t: 14, r: 12, b: 26, l: 30 };
    const iw = W - m.l - m.r, ih = H - m.t - m.b;
    const max = Math.max(4, ...points.map((p) => p.value));
    const step = max <= 6 ? 2 : max <= 12 ? 4 : Math.ceil(max / 4);
    const top = Math.ceil(max / step) * step;
    const x = (i) => m.l + (points.length === 1 ? iw / 2 : (i / (points.length - 1)) * iw);
    const y = (v) => m.t + ih - (v / top) * ih;
    let grid = "", axis = "";
    for (let v = 0; v <= top; v += step) { grid += `<line x1="${m.l}" x2="${W - m.r}" y1="${y(v)}" y2="${y(v)}"/>`; axis += `<text x="${m.l - 8}" y="${y(v) + 4}" text-anchor="end">${v}</text>`; }
    points.forEach((p, i) => { if (i % 2 === 0 || i === points.length - 1) axis += `<text x="${x(i)}" y="${H - 6}" text-anchor="middle">${p.label}</text>`; });
    const d = points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join("");
    const area = `${d}L${x(points.length - 1)},${y(0)}L${x(0)},${y(0)}Z`;
    const pts = points.map((p, i) => `<circle class="pt" r="4.5" cx="${x(i)}" cy="${y(p.value)}" data-i="${i}"/>`).join("");
    return `<div class="chart" data-line='${esc(JSON.stringify(points.map((p, i) => ({ x: x(i), y: y(p.value), l: p.full, v: p.value }))))}' data-w="${W}">
      <svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria)}">
        <defs><linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2E6BFF" stop-opacity=".18"/><stop offset="1" stop-color="#2E6BFF" stop-opacity="0"/></linearGradient></defs>
        <g class="grid">${grid}</g><g class="axis">${axis}</g>
        <path class="area" d="${area}"/><path class="line" d="${d}"/>
        <line class="cross" x1="0" x2="0" y1="${m.t}" y2="${m.t + ih}"/>${pts}
        <rect x="${m.l}" y="0" width="${iw}" height="${H}" fill="transparent" class="hit"/>
      </svg><div class="tooltip"></div></div>`;
  }

  function barChart(rows, opts) {
    const W = 460, rowH = 34, lw = 128, vw = 78, H = rows.length * rowH;
    const max = Math.max(1, ...rows.map((r) => r.value));
    const bw = W - lw - vw;
    const bars = rows.map((r, i) => {
      const w = Math.max(r.value ? 4 : 0, (r.value / max) * bw);
      const yy = i * rowH;
      return `<g class="bar-row" tabindex="0" data-tip="${esc(r.label + ": " + r.fmt)}" aria-label="${esc(r.label + ": " + r.fmt)}">
        <rect x="0" y="${yy}" width="${W}" height="${rowH}" fill="transparent"/>
        <text class="bar-label" x="0" y="${yy + 21}">${esc(r.label)}</text>
        <rect class="bar" x="${lw}" y="${yy + 9}" width="${w.toFixed(1)}" height="16" rx="4"/>
        <text class="bar-value" x="${lw + w + 8}" y="${yy + 21}">${esc(r.fmt)}</text></g>`;
    }).join("");
    return `<div class="chart chart--bar"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${esc(opts.aria)}">${bars}</svg><div class="tooltip"></div></div>`;
  }

  function bindCharts(root) {
    $$(".chart[data-line]", root).forEach((el) => {
      const pts = JSON.parse(el.dataset.line), W = +el.dataset.w;
      const svg = $("svg", el), tip = $(".tooltip", el), cross = $(".cross", el), dots = $$(".pt", el);
      const show = (evt) => {
        const rect = svg.getBoundingClientRect(), k = rect.width / W;
        const mx = (evt.clientX - rect.left) / k;
        let best = 0; pts.forEach((p, i) => { if (Math.abs(p.x - mx) < Math.abs(pts[best].x - mx)) best = i; });
        const p = pts[best];
        cross.setAttribute("x1", p.x); cross.setAttribute("x2", p.x); cross.classList.add("on");
        dots.forEach((d, i) => d.classList.toggle("on", i === best));
        tip.innerHTML = `${esc(p.l)}<br><b>${p.v} solicitaç${p.v === 1 ? "ão" : "ões"}</b>`;
        tip.style.left = p.x * k + "px"; tip.style.top = p.y * k + "px"; tip.classList.add("on");
      };
      const hide = () => { tip.classList.remove("on"); cross.classList.remove("on"); dots.forEach((d) => d.classList.remove("on")); };
      svg.addEventListener("pointermove", show); svg.addEventListener("pointerleave", hide);
    });
    $$(".chart--bar", root).forEach((el) => {
      const tip = $(".tooltip", el);
      $$(".bar-row", el).forEach((g) => {
        const on = () => {
          const b = $(".bar", g).getBoundingClientRect(), host = el.getBoundingClientRect();
          tip.textContent = g.dataset.tip; tip.style.left = (b.left - host.left + b.width / 2) + "px"; tip.style.top = (b.top - host.top) + "px"; tip.classList.add("on");
        };
        const off = () => tip.classList.remove("on");
        g.addEventListener("pointerenter", on); g.addEventListener("pointerleave", off); g.addEventListener("focus", on); g.addEventListener("blur", off);
      });
    });
  }

  /* ---------- Views ---------- */
  const PAGES = [
    { id: "painel", label: "Painel", icon: "painel" },
    { id: "solicitacoes", label: "Solicitações", icon: "lista", count: true },
    { id: "nova", label: "Nova solicitação", short: "Nova", icon: "nova" },
    { id: "automacoes", label: "Automações", icon: "regra" },
    { id: "integracoes", label: "Integrações", icon: "integracao" },
  ];

  function topbar(title, sub, extra) {
    return `<div class="topbar"><div><h1>${title}</h1><p>${sub}</p></div><div class="topbar__actions">${extra || ""}
      <button class="btn btn--live" type="button" data-action="live" aria-pressed="${live ? "true" : "false"}"><span class="dot"></span>${live ? "Simulação ativa" : "Simular movimento"}</button></div></div>`;
  }

  function feedItems(items) {
    return items.map((l) => `<li data-log="${l.id}"><span class="ico ico--${l.tipo}">${icon(l.tipo)}</span><div>${esc(l.msg)}<time datetime="${new Date(l.ts).toISOString()}">${fmtDateTime(l.ts)}</time></div></li>`).join("");
  }

  function viewPainel() {
    const k = metrics();
    const days = [];
    const today = new Date(); today.setHours(0, 0, 0, 0);
    for (let i = 13; i >= 0; i--) {
      const d0 = today.getTime() - i * DAY, d1 = d0 + DAY;
      days.push({ label: fmtDate(d0), full: new Date(d0).toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "short" }), value: state.requests.filter((r) => r.criadoEm >= d0 && r.criadoEm < d1).length });
    }
    const since = Date.now() - 30 * DAY;
    const rs = state.requests.filter((r) => r.criadoEm >= since);
    const porDepto = DEPTOS.map((d) => { const v = rs.filter((r) => r.depto === d).reduce((s, r) => s + r.valor, 0); return { label: d, value: v, fmt: brlShort(v) }; }).sort((a, b) => b.value - a.value);
    const porStatus = Object.keys(STATUS).map((s) => { const v = rs.filter((r) => r.status === s).length; return { label: STATUS[s][0].replace("Aguardando aprovação", "Aguardando"), value: v, fmt: String(v) }; });
    return topbar("Painel", "Visão geral dos últimos 30 dias") + `
      <section class="kpis" aria-label="Indicadores">
        <div class="panel kpi"><div class="kpi__label">Solicitações (30 dias)</div><div class="kpi__value">${k.total}</div><div class="kpi__hint">${k.abertas} aguardando decisão</div></div>
        <div class="panel kpi"><div class="kpi__label">Aprovadas automaticamente</div><div class="kpi__value">${k.autoPct}%</div><div class="kpi__hint">${k.autoN} sem intervenção manual</div></div>
        <div class="panel kpi"><div class="kpi__label">Tempo médio até a decisão</div><div class="kpi__value">${fmtHours(k.tempo)}</div><div class="kpi__hint">manuais: ${fmtHours(k.tempoManual)} · automáticas: imediatas</div></div>
        <div class="panel kpi"><div class="kpi__label">Valor aprovado (30 dias)</div><div class="kpi__value">${brlShort(k.valorAprovado)}</div><div class="kpi__hint">enviado ao ERP</div></div>
      </section>
      <div class="grid-2">
        <section class="panel"><div class="panel__head"><h2>Solicitações por dia</h2><span>últimos 14 dias</span></div>
          ${lineChart(days, { aria: "Linha com o número de solicitações por dia nos últimos 14 dias" })}</section>
        <section class="panel"><div class="panel__head"><h2>Atividade recente</h2><span>regras, integrações e usuários</span></div>
          <ul class="feed" id="feed">${feedItems(state.log.slice(0, 25))}</ul></section>
      </div>
      <div class="grid-2b">
        <section class="panel"><div class="panel__head"><h2>Valor solicitado por departamento</h2><span>30 dias</span></div>
          ${barChart(porDepto, { aria: "Barras com o valor solicitado por departamento" })}</section>
        <section class="panel"><div class="panel__head"><h2>Solicitações por situação</h2><span>30 dias</span></div>
          ${barChart(porStatus, { aria: "Barras com o número de solicitações por situação" })}</section>
      </div>`;
  }

  function viewSolicitacoes() {
    const u = state.ui;
    const q = u.q.trim().toLowerCase();
    const rows = state.requests.slice().reverse().filter((r) =>
      (!u.status || r.status === u.status) && (!u.depto || r.depto === u.depto) &&
      (!q || (r.id + " " + r.titulo + " " + r.solicitante + " " + r.categoria).toLowerCase().includes(q)));
    const opt = (v, l, cur) => `<option value="${esc(v)}"${v === cur ? " selected" : ""}>${esc(l)}</option>`;
    const body = rows.slice(0, 120).map((r) => `<tr data-id="${r.id}">
        <td><b>${r.id}</b></td>
        <td>${esc(r.titulo)}${r.urgencia === "alta" ? ' <span class="badge badge--pendente">Urgente</span>' : ""}<span class="sub">${esc(r.solicitante)} · ${esc(r.depto)} · ${esc(r.categoria)}</span></td>
        <td class="num">${brl.format(r.valor)}</td>
        <td>${badge(r.status)}${r.automatica ? '<span class="tag-auto">auto</span>' : ""}</td>
        <td class="hide-sm">${esc(r.responsavel)}${r.erp ? `<span class="sub">ERP ${r.erp.ref}</span>` : ""}</td>
        <td class="hide-sm">${fmtDateTime(r.criadoEm)}</td>
        <td>${r.status === "pendente" || r.status === "em_analise" ? `<div class="actions">
          <button class="btn btn--sm btn--ok" data-decide="1" aria-label="Aprovar ${r.id}">Aprovar</button>
          <button class="btn btn--sm btn--bad" data-decide="0" aria-label="Rejeitar ${r.id}">Rejeitar</button></div>` : ""}</td></tr>`).join("");
    return topbar("Solicitações", `${rows.length} resultado${rows.length === 1 ? "" : "s"}`, `<a class="btn btn--primary" href="#/nova">${icon("nova")}Nova solicitação</a>`) + `
      <section class="panel">
        <div class="filters" role="search">
          <label class="sr-only" for="f-q">Buscar</label><input id="f-q" type="search" placeholder="Buscar por código, item, pessoa ou categoria" value="${esc(u.q)}">
          <label class="sr-only" for="f-status">Situação</label><select id="f-status">${opt("", "Todas as situações", u.status)}${Object.keys(STATUS).map((s) => opt(s, STATUS[s][0], u.status)).join("")}</select>
          <label class="sr-only" for="f-depto">Departamento</label><select id="f-depto">${opt("", "Todos os departamentos", u.depto)}${DEPTOS.map((d) => opt(d, d, u.depto)).join("")}</select>
        </div>
        <div class="table-wrap"><table>
          <thead><tr><th>Código</th><th>Solicitação</th><th class="num">Valor</th><th>Situação</th><th class="hide-sm">Responsável</th><th class="hide-sm">Criada em</th><th><span class="sr-only">Ações</span></th></tr></thead>
          <tbody>${body || '<tr><td colspan="7" class="empty">Nenhuma solicitação encontrada com esses filtros.</td></tr>'}</tbody>
        </table></div>
      </section>`;
  }

  const PRESETS = [
    { label: "Material de R$ 480", data: { titulo: "Reposição de materiais", categoria: "Materiais de escritório", valor: 480, urgencia: "normal", depto: "Financeiro" } },
    { label: "Notebook (TI)", data: { titulo: "Notebook para novo colaborador", categoria: "Equipamentos de TI", valor: 6900, urgencia: "normal", depto: "Comercial" } },
    { label: "Evento de R$ 18 mil", data: { titulo: "Estande em evento", categoria: "Marketing e eventos", valor: 18000, urgencia: "normal", depto: "Marketing" } },
    { label: "Consultoria urgente", data: { titulo: "Consultoria tributária", categoria: "Serviços de terceiros", valor: 7800, urgencia: "alta", depto: "Financeiro" } },
  ];

  function viewNova() {
    const opts = (arr) => arr.map((v) => `<option>${esc(v)}</option>`).join("");
    return topbar("Nova solicitação", "Crie um pedido e veja a automação decidir o caminho em tempo real") + `
      <div class="form-layout">
        <section class="panel">
          <div class="presets"><span>Exemplos rápidos:</span>${PRESETS.map((p, i) => `<button class="btn btn--sm" type="button" data-preset="${i}">${esc(p.label)}</button>`).join("")}</div>
          <form id="form-nova" novalidate>
            <div class="form-grid">
              <div class="field field--full"><label for="n-titulo">O que precisa ser comprado ou contratado?</label><input id="n-titulo" required maxlength="80" placeholder="Ex.: Monitores para a equipe de suporte"></div>
              <div class="field"><label for="n-solicitante">Solicitante</label><select id="n-solicitante">${opts(PESSOAS)}</select></div>
              <div class="field"><label for="n-depto">Departamento</label><select id="n-depto">${opts(DEPTOS)}</select></div>
              <div class="field"><label for="n-categoria">Categoria</label><select id="n-categoria">${opts(Object.keys(CATEGORIAS))}</select></div>
              <div class="field"><label for="n-valor">Valor estimado (R$)</label><input id="n-valor" type="number" min="1" max="10000000" step="0.01" required inputmode="decimal" placeholder="0,00"></div>
              <div class="field"><label for="n-urgencia">Urgência</label><select id="n-urgencia"><option value="normal">Normal</option><option value="alta">Alta</option></select></div>
              <div class="field field--full"><label for="n-just">Justificativa <span style="font-weight:400;color:var(--muted)">(opcional)</span></label><textarea id="n-just" maxlength="400"></textarea></div>
            </div>
            <p id="n-erro" role="alert" style="color:var(--bad);font-size:.85rem;min-height:1.2em;margin:12px 0 0"></p>
            <button class="btn btn--primary" type="submit" style="margin-top:6px">${icon("play")}Enviar e processar</button>
          </form>
        </section>
        <section class="panel" aria-live="polite"><div class="panel__head"><h2>O que a automação fez</h2></div>
          <div id="resultado"><div class="result-empty">Envie uma solicitação para ver, passo a passo,<br>quais regras foram aplicadas e o que foi integrado.</div></div>
        </section>
      </div>`;
  }

  function viewAutomacoes() {
    return topbar("Automações", "Regras avaliadas em ordem a cada nova solicitação") + `
      <p style="margin:-8px 0 16px;color:var(--muted);font-size:.9rem">Desative uma regra e crie uma nova solicitação para ver como o fluxo muda. A primeira regra de <b>decisão</b> aplicável encerra a avaliação.</p>
      <div class="rules">${RULES.map((r, i) => { const s = state.rules[r.id]; return `
        <div class="panel rule"><div><h3>${i + 1}. ${esc(r.nome)}</h3><p>${esc(r.descricao)}</p>
          <p class="rule__meta">Condição: <code>${esc(r.cond)}</code> · Tipo: ${r.tipo === "decisao" ? "decisão" : r.tipo === "acao" ? "ação" : "integração"} · Disparos: <b>${s.disparos}</b></p></div>
          <button class="switch" type="button" role="switch" aria-checked="${s.ativa}" data-rule="${r.id}" aria-label="${s.ativa ? "Desativar" : "Ativar"} regra ${esc(r.nome)}"></button></div>`; }).join("")}</div>`;
  }

  function viewIntegracoes() {
    const ints = state.log.filter((l) => l.tipo === "integracao");
    const notifs = state.log.filter((l) => l.tipo === "notificacao").length;
    const last = ints[0];
    const avgLat = ints.length ? Math.round(ints.reduce((s, l) => s + (l.latencia || 0), 0) / ints.length) : 0;
    const rows = ints.slice(0, 40).map((l) => `<tr><td>${fmtDateTime(l.ts)}</td><td><b>${esc(l.ref)}</b></td><td>${esc(l.erp)}</td><td><span class="badge badge--aprovada">${icon("check")}Sucesso</span></td><td class="num hide-sm">${l.latencia} ms</td>
      <td><details class="log"><summary>Ver dados enviados</summary><pre class="payload">${esc(JSON.stringify(l.payload, null, 2))}</pre></details></td></tr>`).join("");
    return topbar("Integrações", "Comunicação com sistemas externos (simulada)") + `
      <div class="int-cards">
        <div class="panel int-card"><span class="ico">${icon("db")}</span><div><b>ERP · Pedidos de compra</b><span>${ruleOn("erp") ? "Conectado" : "Pausado"} · último envio ${last ? fmtDateTime(last.ts) : "—"}</span></div></div>
        <div class="panel int-card"><span class="ico">${icon("mail")}</span><div><b>E-mail · Notificações</b><span>${notifs} alertas enviados</span></div></div>
        <div class="panel int-card"><span class="ico">${icon("api")}</span><div><b>API REST</b><span>${ints.length} chamadas · latência média ${avgLat} ms</span></div></div>
      </div>
      <section class="panel"><div class="panel__head"><h2>Envios ao ERP</h2><span>últimos 40</span></div>
        <div class="table-wrap"><table><thead><tr><th>Horário</th><th>Solicitação</th><th>Pedido no ERP</th><th>Situação</th><th class="num hide-sm">Latência</th><th>Detalhes</th></tr></thead>
        <tbody>${rows || '<tr><td colspan="6" class="empty">Nenhum envio ainda.</td></tr>'}</tbody></table></div></section>`;
  }

  /* ---------- Roteamento e eventos ---------- */
  const view = $("#view");
  let current = "";
  const VIEWS = { painel: viewPainel, solicitacoes: viewSolicitacoes, nova: viewNova, automacoes: viewAutomacoes, integracoes: viewIntegracoes };

  function renderMenu() {
    const open = state.requests.filter((r) => r.status === "pendente" || r.status === "em_analise").length;
    $("#menu").innerHTML = PAGES.map((p) => `<li><a href="#/${p.id}"${p.id === current ? ' aria-current="page"' : ""}>${icon(p.icon)}<span>${p.short ? `<span class="label-long">${p.label}</span><span class="label-short">${p.short}</span>` : p.label}</span>${p.count && open ? `<span class="count" aria-label="${open} em aberto">${open}</span>` : ""}</a></li>`).join("");
  }

  function render(focus) {
    const id = (location.hash.replace(/^#\/?/, "") || "painel");
    current = VIEWS[id] ? id : "painel";
    view.innerHTML = VIEWS[current]();
    document.title = PAGES.find((p) => p.id === current).label + " · Alinhavo Flow · Demonstração";
    renderMenu();
    bindCharts(view);
    if (focus) view.focus({ preventScroll: true });
  }

  window.addEventListener("hashchange", () => { render(true); window.scrollTo(0, 0); });

  document.addEventListener("click", (e) => {
    const a = e.target.closest("[data-action]");
    if (a && a.dataset.action === "reset") {
      e.preventDefault();
      if (!confirm("Restaurar os dados de demonstração? As alterações feitas serão perdidas.")) return;
      try { localStorage.removeItem(STORE_KEY); } catch (err) { /* ignora */ }
      state = seed(); save(); render(); toast("Dados de demonstração restaurados.");
      return;
    }
    if (a && a.dataset.action === "live") { setLive(!live); return; }

    const dec = e.target.closest("[data-decide]");
    if (dec) {
      const r = state.requests.find((x) => x.id === dec.closest("tr").dataset.id);
      if (!r) return;
      const aprovar = dec.dataset.decide === "1";
      manualDecision(r, aprovar, Date.now());
      save(); render();
      toast(`<b>${r.id}</b> ${aprovar ? "aprovada" + (r.erp ? " e enviada ao ERP (" + r.erp.ref + ")" : "") : "rejeitada"}.`);
      return;
    }
    const sw = e.target.closest("[data-rule]");
    if (sw) {
      const s = state.rules[sw.dataset.rule]; s.ativa = !s.ativa; save(); render();
      const again = $(`[data-rule="${sw.dataset.rule}"]`); again && again.focus();
      toast(`Regra <b>${esc(s.nome)}</b> ${s.ativa ? "ativada" : "desativada"}.`);
      return;
    }
    const pr = e.target.closest("[data-preset]");
    if (pr) {
      const p = PRESETS[+pr.dataset.preset].data;
      $("#n-titulo").value = p.titulo; $("#n-categoria").value = p.categoria; $("#n-valor").value = p.valor;
      $("#n-urgencia").value = p.urgencia; $("#n-depto").value = p.depto;
      $("#n-titulo").focus();
    }
  });

  document.addEventListener("input", (e) => {
    if (current !== "solicitacoes") return;
    const map = { "f-q": "q", "f-status": "status", "f-depto": "depto" };
    const key = map[e.target.id]; if (!key) return;
    state.ui[key] = e.target.value;
    const caret = e.target.selectionStart, id = e.target.id;
    render();
    const el = document.getElementById(id); el.focus();
    if (id === "f-q" && caret != null) el.setSelectionRange(caret, caret);
  });

  document.addEventListener("submit", (e) => {
    if (e.target.id !== "form-nova") return;
    e.preventDefault();
    const titulo = $("#n-titulo").value.trim(), valor = parseFloat($("#n-valor").value);
    const erro = $("#n-erro");
    if (!titulo) { erro.textContent = "Descreva o que precisa ser comprado ou contratado."; $("#n-titulo").focus(); return; }
    if (!(valor > 0)) { erro.textContent = "Informe um valor maior que zero."; $("#n-valor").focus(); return; }
    erro.textContent = "";
    const now = Date.now();
    const r = newRequest(now, { titulo, valor: Math.round(valor * 100) / 100, solicitante: $("#n-solicitante").value, depto: $("#n-depto").value,
      categoria: $("#n-categoria").value, urgencia: $("#n-urgencia").value, justificativa: $("#n-just").value.trim() });
    state.requests.push(r);
    const steps = processRequest(r, now);
    state.log.sort((a, b) => b.ts - a.ts);
    save(); renderMenu();
    $("#resultado").innerHTML = `<p style="margin:0 0 14px">${badge(r.status)} <b style="margin-left:6px">${r.id}</b> · responsável: ${esc(r.responsavel)}</p>
      <ol class="steps">${steps.map((s, i) => `<li class="${s.ok ? "" : "skip"}" style="animation-delay:${i * 0.18}s"><span class="n">${i + 1}</span><div><strong>${esc(s.titulo)}</strong><span>${esc(s.detalhe)}</span></div></li>`).join("")}</ol>
      <p style="margin:16px 0 0"><a href="#/solicitacoes">Ver na lista de solicitações →</a></p>`;
    e.target.reset();
  });

  /* ---------- Simulação ao vivo ---------- */
  let live = false, liveTimer = null;
  function setLive(on) {
    live = on;
    clearInterval(liveTimer);
    if (on) { tick(); liveTimer = setInterval(tick, 4000); toast("Simulação iniciada: novas solicitações chegarão a cada poucos segundos."); }
    $$('[data-action="live"]').forEach((b) => { b.setAttribute("aria-pressed", String(on)); b.innerHTML = `<span class="dot"></span>${on ? "Simulação ativa" : "Simular movimento"}`; });
  }
  function tick() {
    const now = Date.now();
    // de vez em quando, um gestor decide algo pendente
    const open = state.requests.filter((r) => r.status === "pendente" || r.status === "em_analise");
    if (open.length && Math.random() < 0.35) {
      const r = open[Math.floor(Math.random() * open.length)];
      manualDecision(r, Math.random() < 0.8, now);
    } else {
      const r = newRequest(now);
      state.requests.push(r);
      processRequest(r, now);
      toast(`<b>${r.id}</b> · ${esc(r.titulo)} — ${STATUS[r.status][0].toLowerCase()}${r.automatica ? " automaticamente" : ""}.`);
    }
    state.log.sort((a, b) => b.ts - a.ts);
    save();
    if (current === "nova") { renderMenu(); return; }
    const y = window.scrollY;
    const active = document.activeElement && document.activeElement.id;
    if (current === "solicitacoes" && active === "f-q") { renderMenu(); return; } // não interrompe a digitação
    render();
    window.scrollTo(0, y);
    const first = $("#feed li"); first && first.classList.add("new");
    const row = $("tbody tr"); current === "solicitacoes" && row && row.classList.add("new");
  }
  document.addEventListener("visibilitychange", () => { if (document.hidden && live) setLive(false); });

  /* ---------- Toasts ---------- */
  function toast(html) {
    const box = $("#toasts"), t = document.createElement("div");
    t.className = "toast"; t.innerHTML = html; box.appendChild(t);
    setTimeout(() => t.remove(), 4200);
    while (box.children.length > 3) box.firstChild.remove();
  }

  /* ---------- Início ---------- */
  state = load();
  save();
  render();
})();
