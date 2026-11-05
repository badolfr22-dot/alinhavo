/* ==========================================================================
   NEXORA TECHNOLOGIES — Scripts do site
   Sem dependências externas. Carregado com "defer".
   ========================================================================== */

/**
 * CONFIGURAÇÃO DO FORMULÁRIO
 * --------------------------------------------------------------------------
 * FORM_ENDPOINT: URL que recebe o POST do formulário de contato.
 *   - Formspree:  "https://formspree.io/f/SEU_ID"
 *   - Basin, Getform, sua própria API, etc. (qualquer serviço que aceite
 *     FormData via POST e responda 2xx).
 *   - Netlify Forms: deixe vazio e defina USE_NETLIFY_FORMS = true.
 * Se nenhum for configurado, o formulário abre o e-mail do visitante
 * (mailto) já preenchido com os dados, para que nenhum contato se perca.
 */
const NEXORA_CONFIG = {
  FORM_ENDPOINT: "",
  USE_NETLIFY_FORMS: false,
  CONTACT_EMAIL: "badolfr22@gmail.com",
  SUCCESS_URL: "obrigado.html",
};

(function () {
  "use strict";

  const doc = document.documentElement;
  doc.classList.add("js");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Ano no rodapé ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => {
    el.textContent = String(new Date().getFullYear());
  });

  /* ---------- E-mail de contato (fonte única: NEXORA_CONFIG) ---------- */
  document.querySelectorAll("[data-contact-email]").forEach((el) => {
    el.textContent = NEXORA_CONFIG.CONTACT_EMAIL;
    if (el.tagName === "A") el.href = "mailto:" + NEXORA_CONFIG.CONTACT_EMAIL;
  });

  /* ---------- Header: estado ao rolar ---------- */
  const header = document.querySelector(".site-header");
  const onScroll = () => {
    if (header) header.classList.toggle("is-scrolled", window.scrollY > 12);
  };
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  /* ---------- Menu móvel ---------- */
  const toggle = document.querySelector(".nav-toggle");
  const nav = document.getElementById("site-nav");
  if (toggle && nav) {
    const setOpen = (open) => {
      toggle.setAttribute("aria-expanded", String(open));
      toggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
      nav.classList.toggle("is-open", open);
      header && header.classList.toggle("is-open", open);
      document.body.classList.toggle("nav-open", open);
    };
    toggle.addEventListener("click", () => setOpen(toggle.getAttribute("aria-expanded") !== "true"));
    nav.addEventListener("click", (e) => { if (e.target.closest("a")) setOpen(false); });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && nav.classList.contains("is-open")) { setOpen(false); toggle.focus(); }
    });
    window.matchMedia("(min-width: 961px)").addEventListener("change", (e) => { if (e.matches) setOpen(false); });
  }

  /* ---------- Revelação ao rolar ---------- */
  const revealEls = document.querySelectorAll(".reveal");
  if ("IntersectionObserver" in window && !reduceMotion) {
    const io = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) { entry.target.classList.add("is-visible"); io.unobserve(entry.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Rede animada do hero (canvas) ---------- */
  document.querySelectorAll("canvas[data-network]").forEach(initNetwork);

  function initNetwork(canvas) {
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    let w = 0, h = 0, dpr = 1, points = [], raf = 0, running = false;
    const mouse = { x: -9999, y: -9999 };

    function resize() {
      const rect = canvas.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = rect.width; h = rect.height;
      canvas.width = Math.round(w * dpr); canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const count = Math.round(Math.min(90, Math.max(28, (w * h) / 16000)));
      points = Array.from({ length: count }, () => ({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.25,
        vy: (Math.random() - 0.5) * 0.25,
        r: Math.random() * 1.4 + 0.6,
      }));
      if (!running) draw();
    }

    function draw() {
      ctx.clearRect(0, 0, w, h);
      const maxDist = Math.min(150, w / 7);
      for (let i = 0; i < points.length; i++) {
        const p = points[i];
        if (running) {
          p.x += p.vx; p.y += p.vy;
          if (p.x < 0 || p.x > w) p.vx *= -1;
          if (p.y < 0 || p.y > h) p.vy *= -1;
        }
        for (let j = i + 1; j < points.length; j++) {
          const q = points[j];
          const dx = p.x - q.x, dy = p.y - q.y;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < maxDist) {
            ctx.strokeStyle = "rgba(120,160,255," + (0.16 * (1 - d / maxDist)).toFixed(3) + ")";
            ctx.lineWidth = 1;
            ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y); ctx.stroke();
          }
        }
        const md = Math.hypot(p.x - mouse.x, p.y - mouse.y);
        const glow = md < 160 ? 1 - md / 160 : 0;
        ctx.fillStyle = glow > 0 ? "rgba(140,180,255," + (0.5 + glow * 0.5) + ")" : "rgba(195,203,216,0.45)";
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r + glow * 1.6, 0, Math.PI * 2); ctx.fill();
      }
    }

    function loop() { draw(); raf = requestAnimationFrame(loop); }
    function start() { if (reduceMotion || running) return; running = true; loop(); }
    function stop() { running = false; cancelAnimationFrame(raf); }

    resize();
    let rt;
    window.addEventListener("resize", () => { clearTimeout(rt); rt = setTimeout(resize, 150); });

    const host = canvas.parentElement;
    host.addEventListener("pointermove", (e) => {
      const r = canvas.getBoundingClientRect();
      mouse.x = e.clientX - r.left; mouse.y = e.clientY - r.top;
    });
    host.addEventListener("pointerleave", () => { mouse.x = mouse.y = -9999; });

    if ("IntersectionObserver" in window) {
      new IntersectionObserver((entries) => {
        entries.forEach((en) => (en.isIntersecting ? start() : stop()));
      }).observe(canvas);
    } else { start(); }
    document.addEventListener("visibilitychange", () => (document.hidden ? stop() : start()));
  }

  /* ---------- Prévia da demo: escala o iframe para caber na moldura ---------- */
  document.querySelectorAll(".browser__screen").forEach((screen) => {
    const frame = screen.querySelector("iframe");
    if (!frame) return;
    const fit = () => screen.style.setProperty("--s", String(screen.clientWidth / frame.offsetWidth));
    fit();
    if ("ResizeObserver" in window) new ResizeObserver(fit).observe(screen);
    else window.addEventListener("resize", fit);
  });

  /* ---------- Formulário de contato ---------- */
  const form = document.querySelector("form[data-contact-form]");
  if (form) initContactForm(form);

  function initContactForm(form) {
    const status = form.querySelector(".form-status");
    const submit = form.querySelector("[type=submit]");

    // Pré-seleciona o serviço vindo dos botões "Solicitar orçamento" (?servico=slug)
    const params = new URLSearchParams(window.location.search);
    const servico = params.get("servico");
    const select = form.querySelector("#servico");
    if (servico && select && select.querySelector('option[value="' + CSS.escape(servico) + '"]')) {
      select.value = servico;
    }

    const messages = {
      valueMissing: "Este campo é obrigatório.",
      typeMismatch: "Informe um e-mail válido.",
      tooShort: (el) => "Escreva pelo menos " + el.minLength + " caracteres.",
      patternMismatch: "Formato inválido.",
      consent: "É necessário concordar para que possamos responder.",
    };

    function errorFor(el) {
      const v = el.validity;
      if (v.valid) return "";
      if (el.type === "checkbox") return messages.consent;
      if (v.valueMissing) return messages.valueMissing;
      if (v.typeMismatch) return messages.typeMismatch;
      if (v.tooShort) return messages.tooShort(el);
      if (v.patternMismatch) return messages.patternMismatch;
      return "Verifique este campo.";
    }

    function showError(el) {
      const msg = errorFor(el);
      const box = document.getElementById(el.id + "-error");
      el.setAttribute("aria-invalid", msg ? "true" : "false");
      if (box) box.textContent = msg;
      return !msg;
    }

    const fields = Array.from(form.querySelectorAll("input:not([type=hidden]):not([name=_gotcha]), select, textarea"));
    fields.forEach((el) => {
      el.addEventListener("blur", () => { if (el.value || el.type === "checkbox") showError(el); });
      el.addEventListener("input", () => { if (el.getAttribute("aria-invalid") === "true") showError(el); });
      el.addEventListener("change", () => { if (el.getAttribute("aria-invalid") === "true") showError(el); });
    });

    function setStatus(type, text) {
      status.className = "form-status form-status--" + type + " is-visible";
      status.textContent = text;
    }

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      status.className = "form-status";
      status.textContent = "";

      let firstInvalid = null;
      fields.forEach((el) => { if (!showError(el) && !firstInvalid) firstInvalid = el; });
      if (firstInvalid) {
        firstInvalid.focus();
        setStatus("error", "Revise os campos destacados antes de enviar.");
        return;
      }

      // Honeypot anti-spam: bots preenchem campos ocultos
      const hp = form.querySelector("[name=_gotcha]");
      if (hp && hp.value) return;

      const data = new FormData(form);
      const original = submit.innerHTML;
      submit.disabled = true;
      submit.textContent = "Enviando…";

      try {
        if (NEXORA_CONFIG.FORM_ENDPOINT) {
          const res = await fetch(NEXORA_CONFIG.FORM_ENDPOINT, {
            method: "POST", body: data, headers: { Accept: "application/json" },
          });
          if (!res.ok) throw new Error("HTTP " + res.status);
          window.location.href = NEXORA_CONFIG.SUCCESS_URL;
          return;
        }
        if (NEXORA_CONFIG.USE_NETLIFY_FORMS) {
          const res = await fetch("/", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(data).toString(),
          });
          if (!res.ok) throw new Error("HTTP " + res.status);
          window.location.href = NEXORA_CONFIG.SUCCESS_URL;
          return;
        }
        // Fallback: abre o cliente de e-mail com a mensagem montada
        const label = select ? select.options[select.selectedIndex].text : "";
        const body = [
          "Nome: " + data.get("nome"),
          "E-mail: " + data.get("email"),
          "Empresa: " + (data.get("empresa") || "-"),
          "Telefone: " + (data.get("telefone") || "-"),
          "Serviço de interesse: " + label,
          "Prazo desejado: " + (data.get("prazo") || "-"),
          "",
          String(data.get("mensagem") || ""),
        ].join("\n");
        const subject = "Solicitação de orçamento — " + label;
        window.location.href = "mailto:" + NEXORA_CONFIG.CONTACT_EMAIL +
          "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(body);
        setStatus("success", "Abrimos seu aplicativo de e-mail com a mensagem pronta. Basta enviá-la para concluir o contato.");
      } catch (err) {
        setStatus("error", "Não foi possível enviar agora. Tente novamente em instantes ou escreva para " + NEXORA_CONFIG.CONTACT_EMAIL + ".");
      } finally {
        submit.disabled = false;
        submit.innerHTML = original;
      }
    });
  }
})();
